---
entity_id: vllm
type: project
bucket: agent-architecture
abstract: >-
  vLLM is an open-source LLM inference engine using PagedAttention to manage KV
  cache memory like virtual memory pages, achieving high throughput for serving
  LLMs at scale with OpenAI-compatible APIs.
sources:
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/mem0ai-mem0.md
  - repos/agent-on-the-fly-memento.md
  - repos/bytedtsinghua-sia-memagent.md
  - repos/greyhaven-ai-autocontext.md
  - repos/jackchen-me-open-multi-agent.md
  - repos/orchestra-research-ai-research-skills.md
  - tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md
related:
  - openai
  - anthropic
  - ollama
  - reinforcement-learning
last_compiled: '2026-04-08T23:00:11.408Z'
---
# vLLM

## What It Does

vLLM is an open-source inference serving engine for large language models. Its primary purpose is maximizing throughput when serving LLMs: more requests per second, less GPU memory wasted. The project ships an OpenAI-compatible HTTP server, a Python API for offline batch inference, and integrations with most major model hubs.

For agent infrastructure, vLLM matters because it is the de facto standard for self-hosted model serving. When agent systems need a local or private LLM backend, they are almost always pointing at vLLM. [Mem0](../projects/mem0.md) lists vLLM as one of its 16 supported LLM providers. The [Memento](../projects/memento.md) project added dedicated vLLM support for local executor deployments. Autocontext routes inference across providers including vLLM via its `providers/` abstraction layer.

## Core Mechanism: PagedAttention

The architectural differentiator is **PagedAttention**, introduced in the 2023 paper "Efficient Memory Management for Large Language Model Serving with PagedAttention."

In standard LLM serving, the KV (key-value) cache for each request is allocated as a contiguous block of GPU memory sized for the maximum sequence length. This wastes memory in two ways: padding for requests shorter than the maximum, and internal fragmentation from variable-length sequences sharing fixed-size allocations. Across a batch of requests, the effective GPU memory utilization can fall below 30%.

PagedAttention borrows from OS virtual memory. The KV cache is divided into fixed-size **blocks** (analogous to memory pages), and each request's KV cache is stored in non-contiguous blocks mapped through a block table. The attention kernel reads from these non-contiguous blocks using the block table as an indirection layer. This achieves two things:

1. **Elimination of fragmentation.** Only blocks actually used by a request are allocated. No padding, no reservation for tokens not yet generated.
2. **Efficient sharing.** Requests that share a common prefix (e.g., a system prompt) can share the same physical KV blocks, reducing total memory by the size of the shared prefix times the number of concurrent requests.

The block size is a tunable parameter. Smaller blocks reduce fragmentation but increase block table overhead; larger blocks reduce overhead but increase fragmentation. vLLM's default block size is 16 tokens.

The **continuous batching** scheduler builds on PagedAttention. Rather than waiting for all requests in a batch to finish before accepting new ones, vLLM's scheduler inserts new requests mid-batch as GPU capacity frees up. This dramatically improves GPU utilization compared to static batching strategies used by naive serving setups.

The vLLM codebase organizes this into:
- `vllm/core/scheduler.py`: the continuous batching scheduler
- `vllm/attention/backends/`: attention kernel backends (FlashAttention, FlashInfer, ROCm variants)
- `vllm/worker/`: per-GPU worker processes handling model execution
- `vllm/engine/llm_engine.py`: the main engine coordinating scheduler and workers

Tensor parallelism (splitting a single model across multiple GPUs within a node) and pipeline parallelism (splitting across nodes) are both supported via `vllm/distributed/`.

The Memento project's vLLM patch adds **physical KV cache compaction**: when a reasoning block completes, its KV entries are physically evicted and freed slots returned to the pool. This allows standard FlashAttention kernels to operate without modification since they never see evicted tokens. The patch operates at the Python level and installs on top of an existing vLLM installation. Memento's benchmarks on a single B200 GPU with 240 concurrent requests (Qwen3-8B, 32K max tokens) show 4,290 tok/s vs 2,447 tok/s for vanilla vLLM, a 1.75× throughput gain. These numbers are self-reported by the Memento team, not independently validated.

## Key Numbers

- **GitHub stars**: ~50,000+ (one of the fastest-growing ML infrastructure projects)
- **Throughput claims**: The original paper reported 2–24× higher throughput than HuggingFace Transformers and 2.7× vs Orca (a prior continuous batching system). These are self-reported from the paper authors (who are also the vLLM authors), not independently reproduced.
- **Memory efficiency**: PagedAttention achieves near-zero KV cache waste (less than 4% fragmentation in their reported experiments, vs 60–80% for static allocation). Self-reported.
- **Model support**: 50+ model architectures including Llama, Mistral, Qwen, Gemma, Falcon, MPT, and multimodal variants.

The throughput benchmarks are credible in direction (PagedAttention's mechanism genuinely reduces fragmentation) but the exact multipliers depend heavily on workload characteristics: request length distribution, batch size, hardware, and whether prefix sharing is active.

## Strengths

**High throughput for concurrent requests.** When you need to serve many requests at once, continuous batching and PagedAttention together keep GPU utilization high. This is the core use case where vLLM outperforms naive serving.

**Prefix caching.** Requests sharing a common system prompt (the common case in agent systems where every call carries the same instructions) share KV blocks, reducing both memory and computation.

**OpenAI-compatible API.** Drop-in replacement for many OpenAI client libraries. Agent frameworks that target the OpenAI API format can point at vLLM with a URL change.

**Broad model support.** Covers most popular open-weight model families including recent MoE models (Mixtral, DeepSeek-V3) and multimodal models.

**Speculative decoding.** Draft model + verification approach can reduce latency for generation-heavy workloads.

## Critical Limitations

**Concrete failure mode: memory pressure under long-context agent workloads.** Agent systems generate long sequences: multi-turn conversations, tool call results, chain-of-thought reasoning. When requests generate sequences longer than anticipated, PagedAttention allocates more blocks mid-generation. Under high concurrency, this can exhaust the KV cache pool, forcing the scheduler to preempt (pause and recompute) in-flight requests. Preemption recomputes the KV cache from scratch for preempted requests, which destroys the throughput advantage you were getting. In workloads where sequence lengths are unpredictable and routinely long, preemption rates can climb high enough that throughput regresses toward naive batching. The block size tuning that minimizes fragmentation for short sequences often makes this worse for long sequences.

**Unspoken infrastructure assumption: single-tenant or co-located deployment.** vLLM's continuous batching scheduler assumes you control all requests going into the engine. In multi-tenant environments where different agents or users share a vLLM instance, the scheduler has no concept of per-tenant fairness or priority. A flood of long requests from one agent can starve short requests from another. Production multi-tenant deployments require an external load balancer or request queue with priority logic, which vLLM does not provide.

## When NOT to Use It

**Low-concurrency or single-request scenarios.** If you are running one request at a time (a single developer, a cron job, a sequential pipeline), vLLM's batching machinery adds overhead without benefit. [Ollama](../projects/ollama.md) serves this case better: simpler setup, lower resource requirements, friendlier for development machines.

**Latency-sensitive streaming with short sequences.** PagedAttention and continuous batching optimize for throughput, not time-to-first-token. For interactive applications where the user watches tokens stream in, and where requests are short, the overhead of the scheduler can increase first-token latency compared to simpler engines.

**Quantization-heavy deployments on edge hardware.** vLLM's quantization support (GPTQ, AWQ, GGUF partial support) is functional but not as mature as llama.cpp's. If you need highly optimized 4-bit inference on consumer GPUs or CPU-only hardware, llama.cpp or Ollama (which wraps llama.cpp) beats vLLM.

**When you need fine-grained request routing across models.** vLLM runs one model per instance (with some multi-LoRA support). If you need to route requests across multiple models dynamically, you need an external routing layer. [LiteLLM](../projects/litellm.md) handles this better as an abstraction above serving engines.

## Unresolved Questions

**Cost at scale.** vLLM's documentation does not address the operational cost structure of running a production serving cluster: how many instances per GPU budget, how to handle model updates without downtime, how to size block tables for mixed-length workloads. These are solvable engineering problems but require institutional knowledge not documented in the project.

**Conflict resolution in multi-LoRA setups.** vLLM supports serving multiple LoRA adapters on a single base model, swapping adapters per request. The documentation does not clearly explain what happens when an adapter is being used by in-flight requests and a request arrives for the same adapter but the swap buffer is full. The scheduler behavior here is underdocumented.

**Long-term memory management for very long contexts.** The Memento project's KV compaction patch addresses one instance of this problem, but it is not upstream in vLLM. For agent workflows that generate very long sequences (tool use, multi-step reasoning), there is no supported first-class mechanism for mid-generation KV eviction. Workarounds require either truncation or external context management.

**Governance and release cadence.** vLLM is developed primarily by the UC Berkeley SkyLab group with major contributions from cloud provider teams (AWS, Google, Microsoft). There is no formal governance structure documenting how conflicts between contributor interests are resolved, or how breaking changes are managed for dependent downstream projects.

## Relationship to Agent Infrastructure

vLLM sits at the infrastructure layer below most agent frameworks. It is not itself an agent system; it provides the model serving substrate.

[Mem0](../projects/mem0.md) lists vLLM as one of its supported LLM providers via its `LlmFactory`. The integration is straightforward: point `LlmConfig(provider="vllm")` at a running vLLM server.

Autocontext's `providers/` layer includes vLLM as a routing target alongside Anthropic, OpenAI-compatible backends, Ollama, and MLX.

The Memento project's September 2025 update added `client/agent_local_server.py` for deploying a local LLM as the executor using vLLM, and later contributed the KV compaction patch to enable block masking for training RL on long rollouts. The patch is not yet upstream.

For [Context Compression](../concepts/context-compression.md) and [Context Management](../concepts/context-management.md) workflows, the Memento vLLM patch is the most technically interesting development: physical KV eviction rather than logical masking means the freed GPU memory is genuinely available for new requests, which is what enables the 1.75× throughput gain.

## Alternatives

**Use [Ollama](../projects/ollama.md) when** you need local inference on a developer machine, consumer GPU, or CPU. Ollama trades throughput for simplicity and broad hardware support.

**Use LiteLLM when** you need to route across multiple model providers (OpenAI, Anthropic, vLLM, Ollama) with a unified API and fallback logic. LiteLLM is a routing and abstraction layer, not a serving engine.

**Use TGI (Hugging Face Text Generation Inference) when** you are already invested in the Hugging Face ecosystem and need tight integration with the Hub. TGI has comparable PagedAttention-style features and better first-party support from Hugging Face.

**Use TensorRT-LLM when** you control the hardware (NVIDIA GPUs) and need maximum throughput for a fixed model. TensorRT-LLM compiles models into optimized CUDA kernels, beating vLLM on throughput at the cost of much harder deployment and model update workflows.

**Use vLLM when** you need high-concurrency serving of open-weight models with an OpenAI-compatible API, moderate operational complexity is acceptable, and you want the broadest model support with an active open-source community.


## Related

- [OpenAI](../projects/openai.md) — alternative_to (0.6)
- [Anthropic](../projects/anthropic.md) — alternative_to (0.5)
- [Ollama](../projects/ollama.md) — competes_with (0.7)
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — implements (0.4)

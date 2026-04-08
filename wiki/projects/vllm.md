---
entity_id: vllm
type: project
bucket: agent-architecture
abstract: >-
  vLLM is a high-throughput LLM inference server using PagedAttention for GPU
  memory management, achieving 2-24x higher throughput than HuggingFace
  Transformers for batch serving workloads.
sources:
  - repos/bytedtsinghua-sia-memagent.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/greyhaven-ai-autocontext.md
  - repos/agent-on-the-fly-memento.md
  - repos/jackchen-me-open-multi-agent.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
  - anthropic
  - ollama
  - claude
  - reinforcement-learning
  - model-context-protocol
  - reinforcement-learning
last_compiled: '2026-04-08T02:43:07.570Z'
---
# vLLM

## What It Is

vLLM is an open-source inference engine for serving large language models at scale. The project's core purpose: maximize throughput when serving LLMs to many concurrent users, primarily by solving the GPU memory fragmentation problem that made batch serving inefficient in earlier inference stacks.

Released by researchers at UC Berkeley in 2023, vLLM has become the dominant self-hosted inference backend for production LLM deployments, appearing as a dependency or supported backend in mem0, Memento, MemAgent, and most serious agent infrastructure projects.

GitHub: ~45,000 stars (as of mid-2025). This popularity reflects both genuine technical quality and the lack of strong alternatives at the time of release.

## Core Mechanism: PagedAttention

The central innovation is **PagedAttention**, described in the 2023 paper "Efficient Memory Management for Large Language Model Serving with PagedAttention."

The problem it solves: KV cache memory for each request during generation is allocated contiguously. Because sequence lengths vary and are unknown in advance, inference servers either over-allocate (wasting GPU VRAM) or fragment memory so badly that batch sizes stay small. At batch sizes of 1-2, GPU compute utilization collapses.

PagedAttention borrows the virtual memory / paging concept from operating systems. Instead of one contiguous block per sequence, the KV cache is divided into fixed-size **blocks** (pages) that can be allocated non-contiguously. The attention computation is rewritten to work across these non-contiguous blocks via a block table lookup. This eliminates fragmentation and allows dynamic allocation as sequences grow.

The result: much higher batch sizes become feasible, and throughput scales accordingly. Memory waste drops from ~60-80% (pre-PagedAttention) to under 4% in the original paper.

Implementation lives in `vllm/core/block_manager.py` (block allocation) and `vllm/attention/backends/` (the attention kernels that operate on paged KV caches). The `BlockSpaceManager` maintains block tables per sequence and handles copy-on-write for beam search and prefix sharing.

**Continuous batching** (also called iteration-level scheduling) is the second major mechanism. Rather than waiting for all sequences in a batch to finish before starting new ones, vLLM's scheduler (`vllm/core/scheduler.py`) adds new requests at each decoding step. This keeps GPU utilization high even with heterogeneous sequence lengths.

**Prefix caching** (introduced later) allows KV blocks computed for a shared prompt prefix to be reused across requests. For agent workloads with long system prompts or tool definitions, this can eliminate a large fraction of prefill compute.

## Key Numbers

**Throughput benchmarks** from the original paper (self-reported by UC Berkeley authors):
- 2-4x higher throughput than HuggingFace TGI on synthetic workloads
- Up to 24x higher throughput than HuggingFace Transformers (naive inference)

These numbers are from 2023 and used controlled synthetic workloads. Real-world gains depend heavily on request mix, model size, batch diversity, and hardware. Later independent benchmarks (e.g., from Anyscale, Modal, and various MLOps teams) generally confirm 2-8x improvement over naive inference in production settings, though the gap versus other optimized inference servers (TGI, TensorRT-LLM) is smaller.

The 45k+ stars figure is accurate as of mid-2025 per GitHub, not self-reported.

## Strengths

**OpenAI-compatible API surface.** vLLM's server exposes `/v1/completions` and `/v1/chat/completions` endpoints that match the OpenAI API spec. Any client built for OpenAI can point at a vLLM server with a URL change. This is the primary reason it appears as a supported backend in mem0, MemAgent, and most agent frameworks.

**Model coverage.** vLLM supports most major open-weight model architectures: LLaMA, Mistral, Mixtral, Qwen, Phi, Gemma, DeepSeek, Falcon, and many others. New architectures are typically added within days of release.

**Sampling flexibility.** Structured output generation (via `guided_json`, `guided_regex`, `guided_grammar` parameters using outlines or xgrammar backends) lets agent frameworks constrain model output to valid JSON schemas. This is critical for tool-call parsing reliability.

**Multi-GPU support.** Tensor parallelism via Megatron-style sharding (`--tensor-parallel-size`) and pipeline parallelism allow models too large for a single GPU. MemAgent's quickstart uses `vllm serve --tensor_parallel_size 2` as a standard deployment pattern.

**Speculative decoding.** Draft model-based speculative decoding reduces latency for memory-bandwidth-bound workloads (common with small batch sizes).

## Critical Limitations

**Concrete failure mode: memory OOM under bursty load.** PagedAttention eliminates internal fragmentation but does not eliminate the underlying constraint that each active sequence requires KV cache blocks proportional to its current length. Under bursty load with long sequences (common in agent workloads where context accumulates), vLLM's block manager can exhaust VRAM. When this happens, vLLM preempts sequences by swapping blocks to CPU RAM or re-computing them. The preemption logic (`vllm/core/scheduler.py`'s `_preempt()` method) works, but CPU swap adds significant latency spikes. In practice, production deployments targeting agent workloads often need to tune `--max-model-len` and `--gpu-memory-utilization` conservatively to avoid these latency cliffs.

**Unspoken infrastructure assumption: NVIDIA GPU required for full feature set.** vLLM's high-performance paths (PagedAttention kernels, Flash Attention integration, speculative decoding) are CUDA-specific. AMD ROCm support exists but lags. CPU inference exists but defeats the throughput purpose. Deployments on non-NVIDIA hardware or cloud instances without GPU access cannot use vLLM as documented. The alternatives ([Ollama](../projects/ollama.md) for CPU/Mac, llama.cpp) serve those environments.

## When NOT to Use vLLM

**Single-user, low-latency interactive use.** vLLM optimizes throughput via batching. With one concurrent user, batch sizes stay at 1, and PagedAttention's benefits mostly disappear. For a developer running a local coding assistant or a single-user application, [Ollama](../projects/ollama.md) has a simpler deployment model and comparable single-request latency. vLLM's overhead (separate server process, HTTP overhead, CUDA initialization time) adds friction for small deployments.

**Mac/Apple Silicon deployment.** vLLM does not support Metal/MPS as a first-class backend. Ollama or llama.cpp with Metal acceleration outperform vLLM on Apple Silicon by a wide margin.

**Models requiring quantization-first deployment.** vLLM supports GPTQ and AWQ quantization, but less mature than llama.cpp's support for GGUF-format models. Teams running aggressive 3-bit or 4-bit quantization on consumer hardware often get better results from llama.cpp.

**Proprietary model access.** vLLM only serves models you host. For [OpenAI](../projects/openai.md), [Anthropic](../projects/anthropic.md), or [Gemini](../projects/gemini.md) APIs, vLLM is irrelevant.

## Integration in Agent Infrastructure

vLLM appears as a supported LLM backend in:

- **mem0**: Listed as one of 16 LLM providers in `mem0/llms/`, implementing the unified `LlmBase.generate_response()` interface. Any mem0 deployment can swap its extraction and reconciliation LLM calls to a local vLLM server.
- **MemAgent**: The recommended deployment path for the RL-MemoryAgent-14B model is `vllm serve BytedTsinghua-SIA/RL-MemoryAgent-14B --tensor_parallel_size 2`, per the project's quickstart documentation.
- **Autocontext**: Listed in `providers/` as one of the routing targets alongside Anthropic, OpenAI-compatible backends, Ollama, and MLX runtimes.
- **LiteLLM**: [LiteLLM](../projects/litellm.md) proxies vLLM as an OpenAI-compatible backend, allowing unified billing and routing across providers.

The OpenAI-compatible API is the integration layer. Any agent framework that can target OpenAI's API can target vLLM with a single environment variable change (`OPENAI_BASE_URL=http://localhost:8000/v1`).

**[Model Context Protocol](../concepts/model-context-protocol.md) interaction:** vLLM is an inference server, not an MCP server. It does not expose MCP tools or consume MCP context. Agent frameworks sit above vLLM in the stack and handle MCP separately.

## Unresolved Questions

**Cost modeling at scale.** vLLM is free software, but running it in production requires GPU instances. The actual cost per million tokens depends on model size, GPU type, batch efficiency, and whether speculative decoding is active. No official cost modeling tools exist. Teams typically benchmark their specific workload rather than relying on published numbers.

**Governance and long-term maintenance.** vLLM started as a UC Berkeley research project and is now backed by commercial interest (Anyscale, the company founded by some Berkeley researchers). The governance model for accepting contributions, deprecating features, and maintaining backward compatibility is not formally documented. Breaking API changes have occurred between minor versions.

**Conflict resolution between features.** Some features interact in underdocumented ways: prefix caching + speculative decoding, chunked prefill + multi-LoRA serving, and PagedAttention + CPU offload have known interaction constraints that require reading GitHub issues rather than documentation to understand.

**LoRA serving at scale.** vLLM supports serving multiple LoRA adapters simultaneously (`--enable-lora`, `--max-loras`), but the memory overhead and scheduling behavior under many-adapter workloads is not well-documented. Teams building agent systems with per-user fine-tuned adapters hit underdocumented limits.

## Alternatives

**Use [Ollama](../projects/ollama.md) when:** deploying on developer machines, Mac/Apple Silicon, or single-user setups. Ollama prioritizes ease of setup and CPU/Metal support over throughput.

**Use TensorRT-LLM when:** running NVIDIA hardware in production and willing to invest in model compilation for maximum performance. TensorRT-LLM consistently outperforms vLLM on pure throughput benchmarks but requires model-specific compilation and a more complex deployment pipeline.

**Use HuggingFace TGI when:** you want tighter HuggingFace Hub integration and are comfortable with its feature set. TGI is closer to feature parity with vLLM than it was in 2023, though still generally slower on throughput-focused benchmarks.

**Use the native APIs of [OpenAI](../projects/openai.md), [Anthropic](../projects/anthropic.md), or [Claude](../projects/claude.md) when:** you need frontier model capability and are not building a self-hosted deployment. vLLM only serves open-weight models.

**Use [LiteLLM](../projects/litellm.md) as a proxy in front of vLLM when:** you want a unified API across both self-hosted vLLM deployments and commercial APIs, with centralized logging and routing.


## Related

- [OpenAI](../projects/openai.md) — alternative_to (0.6)
- [Anthropic](../projects/anthropic.md) — alternative_to (0.5)
- [Ollama](../projects/ollama.md) — alternative_to (0.7)
- [Claude](../projects/claude.md) — alternative_to (0.5)
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — part_of (0.4)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.5)
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — part_of (0.4)

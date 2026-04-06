---
entity_id: vllm
type: project
bucket: agent-systems
abstract: >-
  vLLM is an open-source LLM inference engine whose PagedAttention algorithm
  manages KV cache memory like an OS paging system, enabling 24x higher
  throughput than HuggingFace Transformers with near-zero memory waste.
sources:
  - repos/orchestra-research-ai-research-skills.md
  - repos/bytedtsinghua-sia-memagent.md
  - repos/greyhaven-ai-autocontext.md
  - repos/agent-on-the-fly-memento.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
  - anthropic
  - ollama
  - claude-code
  - rag
last_compiled: '2026-04-06T02:04:00.860Z'
---
# vLLM

## What It Does

vLLM serves large language models for inference at high throughput. Its defining contribution is PagedAttention: a KV cache memory manager that borrows virtual memory paging from operating systems to eliminate the fragmentation and over-reservation that makes naive LLM serving inefficient. Beyond that core mechanism, vLLM has grown into a full-featured inference stack with an OpenAI-compatible API server, continuous batching, tensor parallelism across multiple GPUs, and support for most major model architectures.

Teams use vLLM when they need to run models locally or self-hosted in production, either because they cannot use hosted APIs (cost, data privacy, latency) or because they need fine-tuned models that hosted providers do not serve.

## Core Mechanism: PagedAttention

Standard LLM inference pre-allocates a contiguous KV cache block for the maximum sequence length of each request. Most tokens in that block go unused — a request generating 200 tokens out of a 2048-token maximum wastes 90% of its allocation. When sequences end at different times, the freed blocks are non-contiguous and cannot be reused without expensive compaction. Memory fragmentation caps batch sizes and reduces GPU utilization.

PagedAttention solves this by splitting the KV cache into fixed-size pages (blocks), similar to how an OS manages virtual memory. Each sequence gets a logical block table mapping its positions to physical blocks. Physical blocks are allocated only when needed and returned to a free pool when the sequence ends. Non-contiguous physical blocks are fine — the block table handles the indirection.

The implementation lives in `vllm/attention/backends/` with the block manager in `vllm/core/block_manager.py`. The `BlockSpaceManager` class maintains the free block pool and per-sequence block tables. The attention kernels in `vllm/attention/ops/` are custom CUDA kernels that accept non-contiguous block tables rather than assuming a dense KV cache tensor.

Two direct consequences:

**Copy-on-write for parallel sampling**: When generating multiple outputs from one prompt (beam search, sampling with `n>1`), all sequences share the prompt's KV cache pages. Pages are only copied when a sequence diverges and tries to write — identical to OS fork semantics. This makes parallel decoding memory-efficient rather than requiring N copies of the prompt KV cache.

**Prefix caching**: Requests sharing a common prefix (same system prompt, few-shot examples) can share their KV cache pages across requests, not just within one request. The `PrefixCachingBlockAllocator` hashes block contents and returns existing blocks for matching prefixes. This is especially effective for RAG pipelines where many requests share a large context.

**Continuous batching** (also called iteration-level scheduling) runs alongside PagedAttention. Rather than waiting for the longest sequence in a batch to finish before starting new requests, vLLM's scheduler operates at each generation step. Completed sequences are immediately replaced by new requests from the queue. The scheduler lives in `vllm/core/scheduler.py`.

## Architecture

The main serving path:

1. `AsyncLLMEngine` (`vllm/engine/async_llm_engine.py`) receives requests and manages the event loop
2. `Scheduler` selects which requests to run in the next step, respecting KV cache budget
3. `Worker` processes run on each GPU (one per tensor-parallel rank); `vllm/worker/worker.py`
4. Model execution happens inside `ModelRunner` (`vllm/worker/model_runner.py`), which builds the attention metadata from block tables and dispatches CUDA kernels
5. Sampler (`vllm/model_executor/layers/sampler.py`) applies temperature, top-p, top-k, and returns tokens

The OpenAI-compatible API server (`vllm/entrypoints/openai/api_server.py`) wraps `AsyncLLMEngine` with FastAPI routes that match the `/v1/completions` and `/v1/chat/completions` spec.

Tensor parallelism splits attention heads and MLP columns across GPUs using NCCL all-reduce for synchronization. Pipeline parallelism layers the model across GPUs for very large models that don't fit in a single node's memory.

## Key Numbers

- **GitHub stars**: ~50,000+ (as of early 2026; growth has been steep)
- **Throughput vs HuggingFace Transformers**: vLLM claims 24x higher throughput in their original paper (Kwon et al., SOSP 2023). This is self-reported from the Berkeley team's benchmarks on specific workloads (Llama models, specific request patterns). Independent reproductions generally confirm large throughput advantages, though the multiplier varies significantly with workload — short sequences with no prefix sharing show smaller gains than long-context, high-concurrency workloads where memory fragmentation hurts competitors more.
- **TensorRT-LLM comparison**: NVIDIA's TensorRT-LLM reports higher raw throughput on NVIDIA hardware with compiled engines (~30% faster than vLLM on A100 in some benchmarks). This tradeoff is real: TensorRT-LLM is faster but requires model compilation per hardware target and is harder to operate.
- **Community-verified**: The continuous batching and PagedAttention benefits are well-understood and reproduced across many deployments. The specific 24x number is benchmark-dependent and should not be taken as a universal multiplier.

## Strengths

**Broad model support**: Most Hugging Face model architectures work out of the box. Adding a new model requires implementing a vLLM model class in `vllm/model_executor/models/`, but the community has done this for virtually every popular architecture.

**Drop-in OpenAI API replacement**: The server speaks the OpenAI API protocol. Switching an application from OpenAI to vLLM (for a locally-served model) requires changing the base URL and API key. This matters for teams running fine-tuned models.

**Speculative decoding**: vLLM supports draft-then-verify speculative decoding, where a small draft model proposes tokens and the large model verifies them in parallel. For short generations, this can reduce latency significantly without changing output distribution.

**Active development**: Weekly releases, large contributor base, responds quickly to new model architectures (e.g., Deepseek support was added within days of model releases).

**LoRA serving**: Multiple LoRA adapters can be loaded and swapped per-request without reloading the base model, which matters for fine-tuned model serving at scale.

## Critical Limitations

**Concrete failure mode — long-context memory exhaustion under variable load**: PagedAttention removes pre-allocation waste but does not eliminate OOM conditions. Under high concurrency with variable sequence lengths, the block pool can exhaust mid-generation. When this happens, vLLM must either abort requests or swap KV cache blocks to CPU memory (slow). The scheduler's `max_num_seqs` and `gpu_memory_utilization` parameters require careful tuning per workload. A production deployment that works at p50 load can OOM at p95 load if these parameters are set without load testing at the high end. The block manager will preempt lower-priority sequences to free memory, but preemption adds latency and the behavior is not always predictable from static configuration.

**Unspoken infrastructure assumption — CUDA-first**: vLLM is written for NVIDIA GPUs. AMD ROCm support exists but lags — not all kernels have ROCm equivalents, some features are unavailable, and community testing is thinner. Running vLLM on CPU (for testing or small models) works but performance is poor. Teams on AMD hardware or needing CPU-only deployment should treat vLLM as a second-tier option and evaluate alternatives.

## When NOT to Use vLLM

**Small models on a single machine for development**: [Ollama](../projects/ollama.md) is easier to install, has a cleaner CLI, and handles quantized GGUF models natively. vLLM's operational overhead (Python dependencies, GPU driver requirements, API server setup) is not worth it for local development with 7B-13B models.

**Maximum raw throughput on NVIDIA hardware**: TensorRT-LLM compiles model-specific CUDA kernels and outperforms vLLM on throughput-per-GPU for fixed workloads. If you run one model continuously on NVIDIA hardware and can afford the compilation and deployment complexity, TensorRT-LLM is faster.

**Routing across multiple model providers**: [LiteLLM](../projects/litellm.md) provides a unified interface across OpenAI, Anthropic, and locally-served models. vLLM is an inference backend, not a routing layer — combining them is common, but vLLM alone does not solve the multi-provider problem.

**Edge or resource-constrained environments**: llama.cpp with GGUF quantization runs on CPU, Apple Silicon, and consumer hardware. vLLM requires CUDA and significant VRAM.

**Teams without GPU infrastructure**: The hosted API providers ([OpenAI](../projects/openai.md), [Anthropic](../projects/anthropic.md)) have no operational overhead. Self-hosting vLLM requires GPU instances, monitoring, scaling logic, and model management. This is not free work.

## Unresolved Questions

**Cost at scale**: vLLM's documentation does not address cluster economics. Running multi-GPU tensor-parallel deployments at high concurrency involves non-obvious cost tradeoffs (more smaller GPUs vs fewer larger GPUs, reserved vs spot instances, queue depth vs latency SLOs). There is no official guidance on sizing.

**Governance and versioning**: vLLM releases frequently and sometimes introduces breaking changes to configuration parameters, model class APIs, or quantization formats. The project has no stated LTS policy. Production deployments need to pin versions and test upgrades carefully, but the project does not document which interfaces are stable.

**Conflict resolution between parallel features**: Combining speculative decoding, prefix caching, LoRA serving, and chunked prefill simultaneously creates interactions that are not fully documented. Some combinations are unsupported; others are supported but may have unexpected performance characteristics. The safest approach is to test each feature combination explicitly rather than relying on documentation.

**Quantization consistency**: vLLM supports GPTQ, AWQ, FP8, and INT4 quantization, but accuracy degradation varies by method, model, and task. The project does not maintain systematic accuracy benchmarks across quantization methods — users need to evaluate this themselves per model.

## Alternatives and Selection Guidance

| Alternative | Use when |
|---|---|
| [Ollama](../projects/ollama.md) | Local development, Mac/CPU deployment, or you want a simple CLI |
| TensorRT-LLM | Maximum throughput on NVIDIA hardware, fixed workload, can afford compilation |
| SGLang | Multi-step agentic workflows needing structured generation; RadixAttention for tree-structured programs |
| [LiteLLM](../projects/litellm.md) | You need to route across multiple providers and want vLLM as one backend |
| llama.cpp | Edge deployment, GGUF quantized models, non-NVIDIA hardware |

vLLM is the right choice when you need a production-grade, OpenAI-compatible inference server for Hugging Face models on NVIDIA GPUs, with an active community, broad model support, and acceptable operational complexity.

## Relationships

vLLM is listed as a supported LLM provider in [Mem0](../projects/mem0.md) (`mem0/llms/` has a vLLM adapter) and in projects like autocontext (`providers/` supports vLLM alongside Anthropic and Ollama). The AI Research Skills library ([source](../raw/repos/orchestra-research-ai-research-skills.md)) includes a dedicated vLLM skill in its inference-serving category (356 lines, marked production-ready). Memento's agent executor supports vLLM for local LLM deployment (`client/agent_local_server.py`).

For [Retrieval-Augmented Generation](../concepts/rag.md) deployments, vLLM commonly serves the generation model while a separate vector database handles retrieval. For [agent orchestration](../concepts/agent-orchestration.md) systems, vLLM provides the model backend that frameworks like [LangChain](../projects/langchain.md) or [LangGraph](../projects/langgraph.md) call through the OpenAI-compatible API.

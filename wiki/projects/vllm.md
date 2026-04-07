---
entity_id: vllm
type: project
bucket: agent-systems
abstract: >-
  vLLM is an open-source LLM inference server using PagedAttention to manage KV
  cache memory, enabling high-throughput batching with near-zero memory waste
  compared to static allocation.
sources:
  - repos/bytedtsinghua-sia-memagent.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/greyhaven-ai-autocontext.md
  - repos/agent-on-the-fly-memento.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/mem0ai-mem0.md
related:
  - rag
  - openai
  - anthropic
  - ollama
  - mcp
last_compiled: '2026-04-07T11:43:13.633Z'
---
# vLLM

## What It Does

vLLM is a high-throughput inference engine for large language models. Its primary job: serve LLM requests faster and with better GPU memory utilization than naive implementations allow.

The core problem it solves is KV cache fragmentation. During autoregressive generation, each token in a sequence requires a key-value cache entry. Naive implementations pre-allocate contiguous memory blocks per sequence, wasting 60-80% of GPU memory due to internal and external fragmentation. vLLM's PagedAttention borrows the operating system's virtual memory paging concept and applies it to KV cache management, achieving near-zero waste.

This matters for agent systems because agents often run many concurrent requests: parallel tool calls, multi-agent coordination, batch inference for RAG pipelines. Memory efficiency directly translates to how many concurrent requests a single GPU can serve.

## Architectural Mechanism

**PagedAttention** is the central innovation. Rather than allocating a contiguous memory block for each sequence's KV cache, PagedAttention stores KV entries in fixed-size blocks (pages) that need not be contiguous. A block table maps logical KV positions to physical memory locations, similar to a CPU's page table. Physical blocks are only allocated as generation proceeds, not pre-allocated for the maximum sequence length.

This enables two specific capabilities that naive serving cannot achieve:

1. **Copy-on-write sharing**: When serving multiple outputs from the same prompt (beam search, sampling N completions, or prefill-sharing across requests with identical system prompts), physical blocks are shared until a sequence diverges. This reduces memory usage proportional to the shared prefix length.

2. **No internal fragmentation**: The last block of a sequence may be partially filled, but only one block's worth of waste exists per sequence rather than the entire pre-allocated reservation.

The implementation spans several subsystems: a block manager in `vllm/core/block_manager.py` handles physical block allocation and the block table; the scheduler in `vllm/core/scheduler.py` decides which sequences to preempt when memory pressure occurs (swapping to CPU or recomputing); the attention kernels in `vllm/attention/` implement the actual paged attention computation, with CUDA kernels for GPU execution.

**Continuous batching** (also called iteration-level scheduling) means vLLM does not wait for all requests in a batch to finish before accepting new ones. The scheduler runs per forward pass, inserting new requests as slots open. This keeps GPU utilization high even with variable-length outputs.

**Tensor parallelism and pipeline parallelism** are supported via distributed execution across multiple GPUs, coordinated through `vllm/distributed/`. For very large models, this is required rather than optional.

**Speculative decoding** support allows a small draft model to propose multiple tokens that the larger model verifies in a single forward pass, reducing latency for latency-sensitive workloads at the cost of some complexity.

## Integration in the Agent Ecosystem

Several projects in this space use vLLM as their local inference backend. Mem0 lists vLLM as one of its 16 supported LLM providers via `mem0/llms/`. MemAgent's quickstart documentation shows `vllm serve BytedTsinghua-SIA/RL-MemoryAgent-14B --tensor_parallel_size 2` as the deployment command for running their 14B model locally. Autocontext's provider routing layer (`providers/`) includes vLLM alongside Anthropic, OpenAI-compatible backends, [Ollama](../projects/ollama.md), and MLX runtimes.

vLLM exposes an OpenAI-compatible API, which means any code written against the OpenAI Python SDK can point at a vLLM server with a URL change. This compatibility is the primary reason it appears as a drop-in in so many agent frameworks.

## Key Numbers

- **Throughput**: vLLM's original paper (Kwon et al., 2023) reported 2-4x higher throughput than HuggingFace Transformers and 1.8-3.8x higher than ORCA (an earlier continuous batching system) on LLaMA workloads. These figures are from the vLLM team's own evaluation — self-reported but with methodology published and reproducible.
- **Memory waste**: The paper reported ~96% average KV cache memory utilization vs. ~20-40% for static allocation baselines.
- **GitHub stars**: ~50,000+ (as of mid-2025), making it one of the most-starred LLM inference projects.
- **Supported models**: Hundreds of architectures via HuggingFace integration: LLaMA, Mistral, Gemma, Qwen, DeepSeek, Phi, and more.

The throughput numbers should be read carefully: gains are workload-dependent. High-concurrency, long-output workloads show the largest improvements. Single-request interactive latency is less differentiated from simpler approaches.

## Strengths

**Throughput at scale**: For workloads with many concurrent requests or long output sequences, PagedAttention's memory efficiency translates directly into batching more requests per GPU, which translates into higher token throughput.

**Ecosystem compatibility**: The OpenAI-compatible REST API means minimal integration work. Frameworks like [LangChain](../projects/langchain.md), [LlamaIndex](../projects/llamaindex.md), and [LiteLLM](../projects/litellm.md) all treat vLLM as a standard backend.

**Prefix caching**: vLLM supports KV cache reuse for shared prefixes (same system prompt across requests), a major win for agent applications where hundreds of requests share the same base context. This is sometimes called "automatic prefix caching" or "radix attention" in vLLM's implementation.

**Active development**: The project moves fast, with regular additions: multimodal support, LoRA serving, structured output (constrained decoding), and chunked prefill for better latency-throughput tradeoffs.

## Critical Limitations

**Concrete failure mode — memory pressure under mixed workloads**: When vLLM's scheduler exhausts physical KV cache blocks, it preempts sequences by either swapping their KV cache to CPU memory or recomputing it from scratch. Under sustained high load with long sequences, this preemption can cascade: sequences are swapped, CPU-GPU transfer becomes a bottleneck, and throughput degrades sharply. The scheduler's preemption policy (`vllm/core/scheduler.py`) uses a last-in-first-out eviction order, which may not match actual request priority in production workloads. Operators often discover this failure mode during load tests when they observe sudden throughput cliffs rather than graceful degradation.

**Unspoken infrastructure assumption — CUDA-first**: vLLM's performance characteristics assume NVIDIA GPUs with CUDA. AMD ROCm support exists but lags behind. CPU-only inference is supported but loses the core throughput advantages entirely. Teams deploying on non-NVIDIA hardware (Google Cloud TPUs, Apple Silicon in production) should test carefully — vLLM's benchmarks are essentially all CUDA numbers.

## When NOT to Use vLLM

**Low-concurrency interactive use**: For a single developer running a local assistant or a small team with infrequent requests, [Ollama](../projects/ollama.md) is simpler to operate and comparable in single-request latency. vLLM's operational complexity (memory tuning, tensor parallelism configuration, CUDA version management) is not justified when you are not batching many concurrent requests.

**Mac/Apple Silicon development**: vLLM does not support Metal. Autocontext's documentation explicitly routes Apple Silicon to MLX as the local inference backend. Ollama handles this natively.

**Latency-critical single-request paths**: Continuous batching helps throughput but can add latency to individual requests if the scheduler holds a request waiting to form a larger batch. For hard latency SLAs on single requests, dedicated per-request serving or speculative decoding tuning is needed.

**Edge/embedded deployment**: vLLM has no path to mobile or microcontroller targets. For constrained hardware, llama.cpp and its wrappers are more appropriate.

**Fine-tuning workflows**: vLLM is an inference server, not a training framework. It can serve LoRA adapters but does not handle gradient computation. Use it downstream of your training pipeline, not as part of it.

## Unresolved Questions

**Cost at scale vs. managed APIs**: For teams already paying for [OpenAI](../projects/openai.md) or [Anthropic](../projects/anthropic.md) API access, the break-even point for running vLLM on owned/rented GPU infrastructure is non-obvious. GPU instance costs, engineering time for operation, and model quality differences all factor in. The vLLM project does not address this tradeoff in its documentation.

**Governance of the routing layer**: vLLM serves whatever model you load. It has no built-in access controls, rate limiting per user, or audit logging. Production deployments need to add these layers separately (often via [LiteLLM](../projects/litellm.md) as a gateway).

**Structured output reliability**: Constrained decoding (guided generation via outlines or similar) can conflict with prefix caching and batching optimizations. The interaction between these features is not well-documented, and correctness under all combinations is not verified in the test suite.

**Model quantization quality tradeoffs**: vLLM supports various quantization schemes (AWQ, GPTQ, fp8). The throughput/quality tradeoffs for each are model-specific and sparsely documented. Teams often discover quality regressions only in production.

## Alternatives

**[Ollama](../projects/ollama.md)**: Use when you want zero-configuration local inference on a single machine, especially on Mac. Handles model downloading, quantization selection, and serving in one command. Lower throughput ceiling than vLLM but far easier to operate.

**[LiteLLM](../projects/litellm.md)**: Use when you want a unified gateway that routes to multiple backends (OpenAI, Anthropic, vLLM, Ollama, etc.) with consistent logging and rate limiting. LiteLLM proxies to vLLM rather than replacing it.

**TGI (HuggingFace Text Generation Inference)**: Use when your stack is already HuggingFace-centric and you need production-grade serving with HuggingFace-maintained model support. TGI and vLLM have comparable throughput; the choice often comes down to which team's operational playbook and model support you trust more.

**TensorRT-LLM (NVIDIA)**: Use when you are running on NVIDIA hardware and want maximum raw throughput at the cost of compilation time and operational complexity. TensorRT-LLM compiles models to highly optimized CUDA kernels, often outperforming vLLM by 20-40% on throughput, but requires significant setup per model.

**llama.cpp + server**: Use for CPU inference, quantized models on consumer hardware, or when binary portability matters. Far lower throughput on GPU than vLLM, but the only viable path for hardware without CUDA support.

## Relationship to Agent Memory Systems

Within [RAG](../concepts/rag.md) and agent memory pipelines, vLLM occupies the inference layer below the memory retrieval logic. A typical stack: [Vector Database](../concepts/vector-database.md) retrieves relevant chunks, [LangChain](../projects/langchain.md) or [LlamaIndex](../projects/llamaindex.md) assembles the prompt, vLLM generates the response. The [Model Context Protocol](../concepts/mcp.md) operates above this layer, defining how tools and context are passed to models regardless of which inference backend serves them.

For agent systems doing [Agentic RAG](../concepts/agentic-rag.md) with many parallel tool calls or multi-agent workflows requiring concurrent LLM inference, vLLM's throughput advantage compounds: more parallel requests fit in memory simultaneously, reducing wall-clock time for the overall agent execution.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.3)
- [OpenAI](../projects/openai.md) — alternative_to (0.5)
- [Anthropic](../projects/anthropic.md) — part_of (0.3)
- [Ollama](../projects/ollama.md) — competes_with (0.6)
- [Model Context Protocol](../concepts/mcp.md) — part_of (0.3)

---
entity_id: vllm
type: project
bucket: agent-systems
sources:
  - repos/bytedtsinghua-sia-memagent.md
  - repos/greyhaven-ai-autocontext.md
  - repos/agent-on-the-fly-memento.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/osu-nlp-group-hipporag.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/mem0ai-mem0.md
related: []
last_compiled: '2026-04-05T05:26:41.031Z'
---
# vLLM

## What It Does

vLLM is an inference engine for large language models focused on throughput and memory efficiency during serving. You run it as a server, point clients at it via an OpenAI-compatible API, and it handles batching, KV cache management, and model execution. The primary use case is serving open-weight models (Llama, Mistral, Qwen, Gemma, etc.) at production scale without building custom serving infrastructure.

The project originated from UC Berkeley's Sky Computing Lab. The foundational paper — Kwon et al., "Efficient Memory Management for Large Language Model Serving with PagedAttention," SOSP 2023 — established the core memory management idea that differentiates vLLM from naive inference implementations.

## Core Mechanism: PagedAttention

Standard transformer serving pre-allocates a contiguous KV cache block per sequence at max sequence length. This wastes memory on short sequences, prevents sharing across parallel decode paths (beam search, sampling), and causes fragmentation that limits concurrent batch size.

PagedAttention treats the KV cache like virtual memory with fixed-size pages. The `BlockSpaceManager` maintains a mapping from logical KV positions to physical GPU memory blocks, analogous to a page table. Blocks are allocated on demand and freed when sequences finish. Crucially, blocks can be **copy-on-write shared** across beam search branches and across prefix cache hits — the physical block is referenced by multiple logical sequences until a write forces a copy.

The scheduler in `vllm/core/scheduler.py` drives this: it runs a continuous batching loop that intermixes prefill (prompt processing) and decode (token generation) steps. When GPU memory pressure rises, it preempts sequences by swapping their KV blocks to CPU memory or recomputing them, then resumes them when space frees. This preemption is handled transparently to the caller.

The attention kernels in `vllm/attention/` implement the scatter/gather over non-contiguous physical blocks. The original CUDA kernels (`csrc/attention/attention_kernels.cu`) operate on block tables rather than assuming contiguous memory layout.

## Key Numbers

**Throughput**: The original paper reports 2-4x higher throughput vs. HuggingFace Transformers and 1.6-2.2x vs. TGI on A100s with OPT-13B and LLaMA variants. These are self-reported benchmarks from the authors. Independent evaluations generally confirm the throughput advantage though exact multipliers vary by model, hardware, and request distribution.

**GitHub stars**: ~50k+ (self-reported project signals; independently observable via GitHub). One of the most-starred ML serving projects.

**Latency**: PagedAttention optimizes throughput, not necessarily single-request latency. Under light load, a simpler implementation may match or beat it on time-to-first-token.

## Architectural Differentiators

**Continuous batching**: vLLM doesn't wait for all sequences in a batch to finish before starting new ones. The scheduler adds new requests mid-batch as decode slots free up, maximizing GPU utilization. This is now common in serving systems but vLLM popularized it in the open-source space.

**Prefix caching**: The `PrefixCachingBlockAllocator` hashes KV blocks by their token content. Repeated system prompts or shared prefixes across requests reuse cached physical blocks without recomputation. Effective for chat systems with long fixed system prompts.

**Tensor parallelism**: The engine distributes attention heads and MLP weight matrices across GPUs using Ray or multiprocessing. Pipeline parallelism (layer-wise distribution) is also supported. Configuration via `tensor_parallel_size` and `pipeline_parallel_size` arguments.

**Speculative decoding**: vLLM includes a speculative decoding implementation where a small draft model proposes token continuations that the large model verifies in parallel. When acceptance rates are high, this reduces the number of large-model forward passes per output token.

**Backend flexibility**: The attention backend is pluggable. Flash Attention, FlashInfer, and xFormers are supported depending on hardware and quantization configuration. The `vllm/attention/backends/` directory contains the implementations.

## Quantization Support

vLLM supports GPTQ, AWQ, SqueezeLLM, and bitsandbytes quantization. INT4 and INT8 weight quantization reduce memory footprint, enabling larger models on a given GPU budget. FP8 KV cache quantization is also supported on Hopper-generation hardware (H100). Quantization accuracy is model and method dependent — no universal benchmark here.

## Strengths

**Throughput at scale**: Under sustained load with many concurrent requests, vLLM's memory management and continuous batching genuinely outperform naive batch-and-wait implementations. The gains are most visible when request lengths vary significantly.

**OpenAI-compatible API**: Drop-in replacement for OpenAI clients. Reduces integration work for teams already using the OpenAI SDK.

**Broad model support**: Handles most popular open-weight model architectures. The model registry in `vllm/model_executor/models/` covers Llama, Mistral, Qwen, Gemma, Falcon, Mixtral (MoE), and others.

**Active development**: The project moves quickly. New hardware backends, model architectures, and optimization techniques ship regularly.

## Critical Limitations

**Concrete failure mode — OOV token generation with some models**: The mem-agent paper documents a recurring crash where Qwen2.5 and Qwen3 models generate token IDs outside the model's vocabulary when served via vLLM. The error surfaces as "Token id is out of vocabulary" and causes training crashes in RL frameworks using vLLM for rollout generation. The root cause involves a tokenizer vocabulary size mismatch between the HuggingFace Transformers and vLLM representations of the same model. Workarounds exist (the `simplescaling/s1` repository documents one) but the issue recurs across model series and framework updates.

**Unspoken infrastructure assumption**: vLLM assumes you have high-bandwidth GPU interconnects for tensor parallelism. Multi-node or multi-GPU setups with PCIe (rather than NVLink) suffer disproportionate communication overhead. The documentation presents tensor parallelism as a straightforward scaling knob, but the throughput benefits assume NVLink-class bandwidth. On commodity multi-GPU machines, single-GPU serving with quantization often beats naive tensor-parallel setups.

## When NOT to Use It

**Low-traffic or development deployments**: vLLM's complexity and resource requirements add overhead that doesn't pay off at low request rates. For local development or single-user serving, `llama.cpp` or a simple HuggingFace Transformers inference loop will start faster, use less memory overhead, and be easier to debug.

**CPU-only or edge inference**: vLLM is GPU-first. It runs on CPU but performance is poor and the library wasn't designed for that use case.

**RL training rollout generation with small or unstable model checkpoints**: Multiple RL training frameworks (the mem-agent paper, others) report instability when using vLLM for on-policy rollout generation. Mid-training checkpoints may trigger the OOV bug or produce degenerate outputs. The Qwen3 series in particular requires careful configuration for stable RL training use.

**Latency-sensitive single-request paths**: If your application issues one request at a time and needs minimum time-to-first-token, you're not benefiting from the batching machinery. A leaner runtime will serve you better.

## Unresolved Questions

**Governance and versioning stability**: vLLM's API surface changes frequently. Internal module paths (useful for extending or patching the scheduler, attention backends, etc.) shift between minor versions. There's no published stability policy for internal interfaces.

**Cost at scale**: The project doesn't publish guidance on GPU-hours per million tokens for standard model configurations. Operators need to benchmark their own workloads. Published numbers are from the original SOSP paper setup, which may not reflect current hardware or current vLLM versions.

**Conflict resolution between backends**: When Flash Attention, FlashInfer, and the custom PagedAttention kernels are all available, the selection logic isn't fully documented. Unexpected backend selection has caused silent performance regressions that are difficult to diagnose without reading the source.

## Alternatives

**llama.cpp**: Use when you need CPU inference, quantized models on consumer hardware, or minimal dependencies. Worse throughput than vLLM on GPU at scale, better for single-user or offline use cases.

**TGI (Text Generation Inference)**: HuggingFace's serving framework. Closer feature parity with vLLM than it was at vLLM's launch. Use TGI when you're already embedded in the HuggingFace ecosystem and want tighter integration with HuggingFace Hub model loading and tooling.

**TensorRT-LLM**: NVIDIA's serving stack. Better peak throughput on NVIDIA hardware than vLLM in many benchmarks, but requires a more involved model compilation step and is NVIDIA-only. Use when you're optimizing for maximum throughput on a fixed model/hardware configuration and can absorb the deployment complexity.

**SGLang**: A newer serving framework with a focus on structured generation and multi-call programs. Use when you need RadixAttention for prefix reuse across complex multi-turn or multi-call programs, or when structured output generation is central to your workload.

**Ollama**: Use for local developer use. Wraps llama.cpp with a simple API. Not suitable for production multi-user serving.

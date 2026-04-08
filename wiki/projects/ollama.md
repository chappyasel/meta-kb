---
entity_id: ollama
type: project
bucket: agent-architecture
abstract: >-
  Ollama runs LLMs locally via a Docker-like CLI and REST API, enabling offline
  and privacy-preserving deployments with OpenAI-compatible endpoints but no
  multi-GPU tensor parallelism.
sources:
  - repos/greyhaven-ai-autocontext.md
  - repos/caviraoss-openmemory.md
  - repos/infiniflow-ragflow.md
  - repos/jackchen-me-open-multi-agent.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/tirth8205-code-review-graph.md
related:
  - openai
  - anthropic
  - model-context-protocol
  - vllm
  - claude
  - gemini
  - openclaw
  - retrieval-augmented-generation
  - langchain
last_compiled: '2026-04-08T02:43:47.199Z'
---
# Ollama

## What It Does

Ollama lets you download, run, and serve LLMs on local hardware with a single command. Think `docker pull` for models: `ollama pull llama3` downloads a quantized model, `ollama run llama3` starts an interactive session, and `ollama serve` exposes an OpenAI-compatible REST API on `localhost:11434`. The workflow is deliberately minimal — no CUDA configuration, no Python environment, no infrastructure.

The key differentiator is integration depth. Ollama ships as a self-contained binary (Go, cross-compiled for macOS/Windows/Linux) with native Metal support on Apple Silicon, CUDA and ROCm support on Linux/Windows GPUs, and CPU fallback everywhere else. It handles model quantization storage, GPU layer scheduling, and context management internally. The user never touches a GGUF file or configures a tensor backend.

Ollama appears in [Autocontext](../projects/openclaw.md)'s `providers/` layer as a first-class LLM backend, in [OpenMemory](../projects/openmemory.md) as an embedding provider, and as a local inference target for [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), and [LlamaIndex](../projects/llamaindex.md). Its OpenAI-compatible `/v1/chat/completions` endpoint means any system built against OpenAI's API can switch to local inference by changing a base URL and an API key.

**GitHub stars:** ~100k+ (self-reported via shields; independently confirmed as one of the fastest-growing Go repos of 2024). The star count reflects adoption breadth more than engineering depth — Ollama's actual codebase is modest compared to [vLLM](../projects/vllm.md)'s.

## Architecture

Ollama's Go binary wraps `llama.cpp` via cgo bindings. The core loop:

1. `ollama pull <model>` fetches a GGUF-quantized model from the Ollama registry (hosted on Docker Hub infrastructure), stored in `~/.ollama/models/` as content-addressed blobs with a manifest JSON.

2. `ollama serve` starts an HTTP server. The `/api/generate` and `/api/chat` endpoints (plus `/v1/` OpenAI-compatible aliases) accept JSON requests.

3. The runner loads the model into GPU memory (Metal on macOS, CUDA/ROCm on Linux) based on available VRAM, with automatic CPU offload for layers that don't fit. This is llama.cpp's `n_gpu_layers` logic, surfaced through Ollama's layer allocation algorithm.

4. Responses stream via server-sent events. The `done: true` final chunk includes token counts, eval duration, and throughput stats.

The `Modelfile` format (analogous to Dockerfile) lets users customize base models with system prompts, temperature, context length, and stop sequences. `ollama create mymodel -f Modelfile` bakes these into a new model entry in the local registry.

The model library at `ollama.com/library` ships pre-quantized versions of Llama, Mistral, Gemma, Phi, Qwen, DeepSeek, and others. Quantization levels (Q4_K_M, Q8_0, FP16, etc.) are selectable via tags: `ollama pull llama3:8b-instruct-q8_0`.

## [Model Context Protocol](../concepts/model-context-protocol.md) Integration

Ollama serves as the local inference backend for MCP-aware systems. Because its `/v1/` endpoint is OpenAI-compatible, any MCP server or client that accepts an OpenAI client can point at `http://localhost:11434/v1` with `api_key="ollama"`. [Autocontext](../projects/openclaw.md) uses this directly in `providers/ollama.py`. [Mem0](../projects/mem0.md)'s `LlmFactory` includes Ollama as one of 16 supported providers, and its embedding layer can use Ollama for local embedding generation via models like `nomic-embed-text`.

## Strengths

**Zero-infrastructure local inference.** A developer on an M2 MacBook Pro can run Llama-3 8B at ~40 tokens/second with no cloud account, no GPU configuration, and no Python dependency management. This matters for [RAG](../concepts/retrieval-augmented-generation.md) pipelines that process sensitive documents, agent systems that need offline capability, and development workflows where API latency or cost is prohibitive.

**OpenAI API compatibility.** The `/v1/chat/completions`, `/v1/embeddings`, and `/v1/models` endpoints mean existing code requires only a base URL change. LangChain's `ChatOllama`, LlamaIndex's `Ollama`, and OpenAI's Python SDK all work without modification.

**Broad model support.** The library covers most popular open-weight models. GGUF quantization means a 70B parameter model fits on a 48GB GPU (Q4 quantization) or even a high-RAM Mac (Q4, CPU-only, slow but functional).

**Apple Silicon optimization.** Metal acceleration on M1/M2/M3/M4 Macs provides strong inference performance without NVIDIA hardware. A MacBook Pro M3 Max runs 8B models comfortably and 70B models slowly but usably.

## Critical Limitations

**No tensor parallelism.** Ollama cannot split a single model across multiple GPUs. If a model doesn't fit in one GPU's VRAM, layers spill to CPU, which dramatically reduces throughput. A 70B model that needs 40GB of VRAM will run at CPU speeds on a system with two 24GB GPUs, because Ollama treats them as one 24GB device.

[vLLM](../projects/vllm.md) handles this via tensor parallelism — it splits weight matrices across GPUs. For multi-GPU inference on large models, vLLM is the correct tool. Ollama is the correct tool for single-GPU or Apple Silicon workloads.

**Unspoken infrastructure assumption: sufficient RAM bandwidth.** CPU-offloaded inference performance depends heavily on memory bandwidth, not just RAM capacity. A Mac Studio M2 Ultra (800 GB/s bandwidth) runs 70B models at ~10 tokens/second. A consumer laptop with 32GB DDR5 (100 GB/s) runs the same model at ~2 tokens/second — technically functional, practically unusable for interactive use.

## When Not to Use It

**High-throughput serving.** Ollama processes requests sequentially per model instance. Concurrent users see queued latency. Production serving for multiple simultaneous users needs [vLLM](../projects/vllm.md)'s continuous batching, which serves multiple requests simultaneously by packing them into a single forward pass.

**Multi-GPU clusters.** Ollama has no distributed inference support. Multi-node tensor parallelism doesn't exist. Use vLLM or TGI.

**Fine-tuned model serving with custom quantization.** If your workflow requires specific quantization formats (AWQ, GPTQ, bitsandbytes NF4) rather than GGUF, Ollama won't serve them directly. vLLM supports AWQ and GPTQ natively.

**Production RAG with SLAs.** Because throughput doesn't scale with load, Ollama can't maintain consistent latency under concurrent request pressure. Use it for development and single-user deployments; use a batching server for production [RAG](../concepts/retrieval-augmented-generation.md) pipelines.

## Unresolved Questions

**Governance and model provenance.** The Ollama library hosts third-party quantizations of open-weight models. There is no auditable chain of custody for quantization quality or security. A `ollama pull` fetches a binary blob; Ollama verifies the SHA256 manifest but does not attest to quantization fidelity or the absence of modified weights.

**Cost at scale in cloud.** Ollama can run on a cloud VM, but there's no official guidance on cost-efficient cloud deployment. The Modelfile format has no native support for autoscaling, load balancing, or health checks. Teams deploying Ollama in cloud environments typically wrap it in a sidecar pattern or use their own orchestration.

**Context window management under load.** Ollama loads model context per-request and caches KV context between requests from the same session. The caching behavior and eviction policy are underdocumented. Under concurrent load, context cache thrashing can cause unexpected throughput degradation.

**Roadmap for multi-GPU support.** The GitHub issue tracker has long-standing requests for tensor parallelism. The maintainers have not publicly committed to a timeline or architecture for multi-GPU support.

## Alternatives

| Scenario | Use instead |
|---|---|
| Multi-GPU inference or high-throughput serving | [vLLM](../projects/vllm.md) — tensor parallelism, continuous batching, AWQ/GPTQ support |
| OpenAI-compatible proxy routing across multiple backends | [LiteLLM](../projects/litellm.md) — unified API over 100+ providers including Ollama |
| Production RAG with concurrency requirements | vLLM or TGI behind a load balancer |
| Framework-agnostic agent memory with local inference | [Mem0](../projects/mem0.md) configured with Ollama as LLM provider |

Ollama's selection criterion is simple: use it when you need local inference on a single machine, want zero infrastructure overhead, and your throughput requirements fit within sequential request processing. Everything else points elsewhere.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — Ollama commonly serves as the inference backend for local RAG pipelines
- [Model Context Protocol](../concepts/model-context-protocol.md) — Ollama's OpenAI-compatible API integrates with MCP clients without modification
- [Context Management](../concepts/context-management.md) — Ollama's KV cache behavior affects context window strategy in long-running agent sessions
- [Agent Memory](../concepts/agent-memory.md) — Ollama enables offline memory systems when used with local embedding models like `nomic-embed-text`

---
entity_id: ollama
type: project
bucket: agent-systems
abstract: >-
  Ollama: local LLM inference runtime with Docker-style CLI and
  OpenAI-compatible REST API, enabling consumer hardware to run models like
  Llama, Mistral, and DeepSeek without cloud dependencies.
sources:
  - repos/greyhaven-ai-autocontext.md
  - repos/caviraoss-openmemory.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
  - anthropic
  - mcp
  - vllm
  - claude-code
last_compiled: '2026-04-06T02:06:28.469Z'
---
# Ollama

## What It Does

Ollama runs open-source large language models on local hardware. It wraps model weights, inference configuration, and a REST server into a single process — similar to how Docker packages application runtimes, but for LLMs. A user runs `ollama run llama3.2` and gets an interactive chat prompt within seconds; applications call `http://localhost:11434/api/generate` or the OpenAI-compatible `/v1/chat/completions` endpoint.

The key differentiator: Ollama treats models as first-class artifacts. It manages model downloads, versioning, and storage through a `Modelfile` system (analogous to Dockerfiles) that encodes quantization format, system prompts, and parameter settings. This makes model configuration reproducible and shareable.

## Core Mechanism

Ollama is written in Go, with inference delegated to [llama.cpp](https://github.com/ggerganov/llama.cpp) under the hood. The Go layer handles:

- **REST API server** — OpenAI-compatible `/v1/` routes plus Ollama-native `/api/` routes. The `/v1/chat/completions` compatibility layer means any OpenAI SDK can point at `http://localhost:11434` with no code changes.
- **Model registry** — Models are pulled from `ollama.com/library` or custom registries. Weights are stored as GGUF files (llama.cpp's quantized format) in `~/.ollama/models/`.
- **Modelfile system** — A `Modelfile` specifies the base model, system prompt, parameter overrides (temperature, context length, stop tokens), and adapter layers. `ollama create my-model -f Modelfile` bakes these into a named local model.
- **Hardware abstraction** — Ollama auto-detects CUDA (NVIDIA), Metal (Apple Silicon), ROCm (AMD), and Vulkan (cross-platform GPU). CPU fallback via AVX2/AVX512 SIMD. The Go layer routes inference to the appropriate llama.cpp backend.
- **Concurrent request handling** — The server queues requests and manages GPU memory allocation. Multiple models can be loaded simultaneously up to VRAM limits; LRU eviction handles overflow.

The `Modelfile` system deserves attention as an architectural choice. Rather than storing raw weights and handling configuration at runtime, Ollama embeds system prompts and defaults into the model artifact. This means `ollama run codellama` always starts with code-optimized defaults — the configuration travels with the model.

## Key Numbers

- **GitHub stars**: ~120,000 (as of mid-2025) — one of the most-starred LLM tooling repositories. Independently verifiable on GitHub.
- **Models supported**: 100+ models in the official library including Llama 3.x, Mistral, Gemma, Phi, DeepSeek, Qwen, and others. Community-contributed models extend this further.
- **API compatibility**: Full OpenAI `/v1/chat/completions` and `/v1/embeddings` compatibility, enabling drop-in replacement in most OpenAI SDK integrations.
- **Hardware floor**: 8GB RAM for 7B models; 16GB for 13B; 64GB+ for 70B+. Apple M-series chips handle 7B models well on 8GB unified memory. Performance benchmarks are hardware-dependent and self-reported by community members — treat token/second claims with caution unless your hardware matches.

## Strengths

**Zero-infrastructure local inference.** No cloud accounts, no API keys, no rate limits, no data leaving the machine. For privacy-sensitive applications (legal, medical, personal knowledge bases), this matters.

**OpenAI API drop-in.** The `/v1/` compatibility layer means LangChain, LiteLLM, and most agent frameworks switch to local inference by changing one URL. [LiteLLM](../projects/litellm.md) and [LangChain](../projects/langchain.md) both list Ollama as a supported provider.

**[Model Context Protocol](../concepts/mcp.md) integration.** Ollama implements MCP, enabling it to serve as the inference backend for MCP-compatible agents and tools.

**Developer experience.** The CLI handles the painful parts of local LLM setup — quantization selection, VRAM management, model downloading — with single commands. `ollama pull mistral` downloads and caches; `ollama serve` starts the server.

**Scripting and automation.** The REST API is stateless and simple enough to curl directly. The Go binary has no Python dependency, making it embeddable in CI pipelines and scripts that prefer avoiding Python environments.

## Critical Limitations

**Concrete failure mode — context length vs. VRAM:** Ollama defaults to a 2048-token context window for many models to stay within consumer VRAM. Increasing context length (via `OLLAMA_NUM_CTX`) multiplies KV-cache memory consumption quadratically. A 7B model that runs at 4096 context on 8GB VRAM will OOM at 8192. The error messages are opaque — the server returns a generic error or hangs rather than clearly reporting the resource constraint. Users building [RAG](../concepts/rag.md) pipelines with large retrieved chunks hit this silently.

**Unspoken infrastructure assumption:** Ollama assumes persistent local storage with fast read access to multi-gigabyte model files. In containerized environments (Docker, Kubernetes), this means either volume mounting the model cache or re-downloading multi-GB weights on each container start. Production deployments require explicit volume management that the documentation does not address clearly. If you are running Ollama as part of a CI pipeline or ephemeral container, cold start time dominates.

## When NOT to Use It

**High-concurrency production APIs.** Ollama is single-node by default. It handles concurrent requests via queuing, not parallel GPU workers. For serving 50+ concurrent requests, [vLLM](../projects/vllm.md) with PagedAttention and continuous batching is a substantially better choice — vLLM was designed for throughput maximization, Ollama for developer convenience.

**Frontier model tasks.** If the task requires GPT-4-class reasoning, Ollama's locally-runnable models (typically 7B–70B parameter range) will underperform. The hardware constraints that make Ollama practical on consumer machines are the same constraints that limit model size. For agentic tasks requiring strong reasoning ([ReAct](../concepts/react.md), complex [task decomposition](../concepts/task-decomposition.md)), a hosted frontier model will outperform local 7B-13B models significantly.

**Teams requiring SLAs.** Ollama has no built-in load balancing, failover, or health monitoring beyond basic server liveness. Production reliability requires wrapping it in additional infrastructure that you build yourself.

**Multi-modal workloads at scale.** Vision model support exists (LLaVA, etc.) but is less optimized than the text-only path. For production multi-modal inference, dedicated solutions are more appropriate.

## Unresolved Questions

**Governance and roadmap transparency.** Ollama is developed by a small company (acquired by Nvidia in 2024 per public reporting). Long-term product direction, open-source commitment, and how commercial interests affect the library's priorities are not publicly documented.

**Cost at scale for the registry.** Model weights are hosted on `ollama.com`. Bandwidth costs for pulling 70B+ models (40GB+ downloads) at scale are absorbed by Ollama's infrastructure. The sustainability model for this hosting is not publicly explained — there is no pricing tier for high-volume pulls.

**Conflict resolution for Modelfile inheritance.** When a custom Modelfile extends a base model that later updates (breaking changes to system prompt format, tokenizer changes), there is no documented migration path. The behavior of existing Modelfile derivatives after a base model update is not specified.

**Multi-GPU scheduling.** Ollama can use multiple GPUs but the scheduling strategy (how it splits layers across devices) is not publicly documented. For users with heterogeneous GPU setups, predicting performance requires empirical testing.

## Alternatives and Selection Guidance

**Use [vLLM](../projects/vllm.md)** when you need production-grade throughput, multi-GPU scaling, or are deploying to a GPU cluster. vLLM's PagedAttention handles concurrent requests efficiently; Ollama does not.

**Use LM Studio** when you want a GUI for model management and testing. LM Studio provides a graphical interface on top of similar llama.cpp-based inference — better for non-developers exploring models.

**Use [LiteLLM](../projects/litellm.md)** when you need a unified API gateway across multiple local and cloud providers simultaneously. LiteLLM can route to Ollama as one backend among many, adding load balancing and fallback logic that Ollama lacks natively.

**Use [OpenAI](../projects/openai.md) or [Anthropic](../projects/anthropic.md) APIs** when task quality matters more than data privacy or cost. For complex reasoning, instruction following, or agentic tasks where model capability is the bottleneck, hosted frontier models outperform locally-runnable open models on most benchmarks.

**Use Ollama** when: you need air-gapped operation, privacy requirements prohibit cloud APIs, you are prototyping locally before deploying with a heavier stack, or you are building developer tooling that should work without external dependencies.

## Relationship to Broader Agent Ecosystem

Ollama serves as an inference backend for several agent memory and knowledge systems. The [Mem0](../projects/mem0.md) source material lists Ollama as one of 16 supported LLM providers. The autocontext system lists Ollama in its `providers/` abstraction layer alongside Anthropic and OpenAI-compatible backends. The OpenMemory project lists Ollama as a supported embedding provider.

For [RAG](../concepts/rag.md) pipelines, Ollama handles both the generative and embedding components — `ollama pull nomic-embed-text` provides embeddings; `ollama pull llama3.2` handles generation. This self-contained stack lets developers build complete retrieval pipelines without any external API dependencies, which matters for organizations with strict data governance requirements.

The [Model Context Protocol](../concepts/mcp.md) implementation means Ollama can serve as the backing LLM for MCP-compatible agent frameworks, though the protocol's tool-use capabilities depend on the underlying model's ability to follow tool-call formats, which varies significantly across open-source models.

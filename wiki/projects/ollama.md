---
entity_id: ollama
type: project
bucket: agent-systems
abstract: >-
  Ollama runs open-source LLMs locally via a single binary with a Docker-like
  CLI and an OpenAI-compatible REST API, removing cloud dependency for inference
  while staying drop-in compatible with existing tooling.
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
  - claude
  - mem0
last_compiled: '2026-04-07T11:44:49.341Z'
---
# Ollama

## What It Does

Ollama packages the mechanics of running local LLMs behind a minimal interface. Install the binary, pull a model by name (`ollama pull llama3.2`), and query it via a REST API that mirrors OpenAI's `/v1/chat/completions` endpoint. The gap it fills: teams that want to use open-source models without standing up their own inference infrastructure or sending data to external APIs.

The core differentiator versus raw llama.cpp or Hugging Face Transformers is packaging. Ollama handles model downloading, GPU/CPU layer allocation, quantization format detection, and process lifecycle in one tool. Users do not configure CUDA libraries, write loading code, or manage model weights manually.

## Architecture

Ollama is written in Go. The server binary embeds llama.cpp for inference and exposes two surfaces: a CLI (`ollama run`, `ollama pull`, `ollama list`) and an HTTP API.

**Model format**: Ollama uses GGUF files, the quantization format from llama.cpp. A `Modelfile` (Ollama's equivalent of a Dockerfile) defines which GGUF base to use, system prompts, temperature, and other parameters. Models live in `~/.ollama/models/`.

**Layer handling**: GPU layers are allocated automatically based on available VRAM. If a model exceeds VRAM, Ollama offloads remaining layers to CPU, trading throughput for the ability to run models that don't fit entirely on the GPU. The split is configurable via `OLLAMA_NUM_GPU` but defaults to automatic.

**API surface**: Two endpoints matter for integration work. `/api/generate` handles single-prompt completion with optional streaming. `/api/chat` handles multi-turn conversation with a messages array. Both stream tokens by default as newline-delimited JSON. The `/v1/chat/completions` endpoint provides OpenAI-compatible formatting for drop-in library compatibility.

**Model library**: Ollama maintains a registry at ollama.com with curated model cards for Llama, Mistral, Gemma, Qwen, DeepSeek, Phi, and others. Each model card specifies available quantization levels (Q4_K_M, Q8_0, FP16, etc.) and parameter counts. Users can also import custom GGUF files via Modelfile.

## Key Numbers

GitHub stars: ~100,000+ (as of mid-2025). Independently observed via GitHub; widely cited in the community.

Inference throughput depends entirely on hardware. On Apple Silicon M-series chips, smaller models (7B Q4) typically achieve 30-60 tokens/second. On a consumer GPU (RTX 3090), similar models run 50-100 tokens/second. These figures vary significantly by quantization level, context length, and batch size. No official Ollama benchmarks exist; community benchmarks are hardware-specific and self-reported.

## Strengths

**Drop-in API compatibility**: The `/v1/` prefix makes Ollama compatible with the OpenAI Python client, LangChain, LiteLLM, and other libraries that accept a `base_url` parameter. Migration from OpenAI to local inference requires changing one URL.

**Cross-platform packaging**: Single binary installs on macOS, Linux, and Windows. macOS builds use Metal for GPU acceleration on Apple Silicon. Linux builds support CUDA and ROCm. This breadth covers most developer hardware without per-platform configuration.

**Model management**: The `ollama pull/push/list/rm` workflow mirrors Docker and requires no understanding of GGUF internals, model sharding, or weight formats.

**Low operational overhead**: No database, no separate model server process, no orchestration layer for single-node use. Start the server, pull a model, call the API.

**Privacy boundary**: All inference runs locally. Data does not leave the machine. For organizations with data residency requirements or regulated data, this is a hard requirement that cloud APIs cannot satisfy.

## Limitations

**Single-node, single-model constraint**: Ollama is designed for one model active at a time on one machine. Running multiple models concurrently requires separate Ollama instances or a tool like LiteLLM to multiplex. It has no built-in load balancing, replication, or request queuing beyond basic concurrency handling.

Concrete failure mode: a team builds a prototype on Ollama and expects to move to production by running the same binary on a larger machine. At production request volumes (hundreds of concurrent users), Ollama's single-process architecture creates a bottleneck. [vLLM](../projects/vllm.md) or a proper inference serving stack handles this case; Ollama does not.

**GGUF quantization tradeoff**: Ollama runs quantized models by default. Quantization reduces VRAM requirements and increases speed but degrades output quality, particularly on reasoning-heavy tasks. The Q4 quantization of a 70B model does not produce the same outputs as the FP16 version. Users who need full-precision inference must either use larger quantizations (which require more VRAM) or switch to a different serving setup.

**Unspoken infrastructure assumption**: Ollama assumes a single developer or small team on shared hardware. The model file stored in `~/.ollama/` is not designed for multi-user environments, network file systems, or containerized deployments where model weights need to be managed separately from the inference process. Production setups typically need to pre-download models into Docker images or shared volumes, adding complexity the tool was not designed for.

## When NOT to Use Ollama

**High-throughput production serving**: If you need to handle more than a handful of concurrent users or require SLA-bound latency, use [vLLM](../projects/vllm.md) (continuous batching, PagedAttention, production metrics) or a managed inference endpoint. Ollama has no batching optimization.

**Multi-model routing**: If your application routes requests across multiple models based on task type or cost, [LiteLLM](../projects/litellm.md) with a vLLM or CUDA-enabled backend handles this. Ollama can sit behind LiteLLM as one provider, but Ollama itself has no routing logic.

**Frontier model performance**: Ollama only runs open-source models available in GGUF format. If your task requires GPT-4, Claude, or Gemini-class capabilities, local inference at reasonable hardware costs is not competitive. Use [OpenAI](../projects/openai.md) or [Anthropic](../projects/anthropic.md) APIs directly.

**Regulated enterprise environments**: Ollama has no built-in authentication, rate limiting, audit logging, or access controls on its HTTP API. Any process on localhost can query it. For multi-user deployments or environments requiring access controls, additional proxying is required.

## Integration Patterns

**With MCP**: Ollama functions as an LLM provider within [Model Context Protocol](../concepts/mcp.md) setups. Tools that accept an OpenAI-compatible base URL can point at `http://localhost:11434/v1` and treat local models as an MCP-compatible inference backend.

**With LiteLLM**: `LiteLLM` supports Ollama as a provider via `ollama/llama3.2` model naming. This lets organizations use Ollama models in multi-provider routing setups without changing application code.

**With Mem0**: [Mem0](../projects/mem0.md) lists Ollama as one of its 16 supported LLM providers. Mem0's `LlmFactory` routes to Ollama via the OpenAI-compatible API. The same applies to the embedding layer: Ollama can serve embedding models locally, removing the last external dependency from a Mem0 deployment.

**With agent frameworks**: [LangChain](../projects/langchain.md), [LlamaIndex](../projects/llamaindex.md), and [LangGraph](../projects/langgraph.md) all support Ollama via `base_url` configuration on their OpenAI provider wrappers. Autocontext lists Ollama as one of its supported providers in `providers/` alongside Anthropic, OpenAI-compatible endpoints, and vLLM.

**Modelfile customization**: System prompts, temperature, and context window size are baked into a model variant via Modelfile. This lets teams distribute pre-configured model variants internally without requiring users to set parameters on every request.

## Unresolved Questions

**Governance at the model registry**: Ollama's model library at ollama.com is a centrally maintained registry. There is no public documentation on the curation process, who vets models for safety or accuracy claims, or how model cards are reviewed. A model pulled via `ollama pull` could contain quantization errors or incorrect system prompts; there is no verification mechanism.

**Cost at scale**: The hardware cost of running Ollama at scale is non-trivial but entirely the user's problem. Ollama itself has no cost visibility tooling, no per-request tracking, and no guidance on hardware provisioning for production workloads.

**Context window handling under memory pressure**: When a model's context fills and Ollama is already splitting layers between GPU and CPU, there is limited public documentation on how it handles degradation gracefully versus silently dropping tokens or erroring.

**Windows support maturity**: Ollama added native Windows support relatively recently. Community reports indicate GPU acceleration on Windows has more edge cases than macOS or Linux builds, but there are no systematic failure analyses from the Ollama team.

## Alternatives

**Use [vLLM](../projects/vllm.md) when** you need production throughput, continuous batching, or PagedAttention for long contexts at scale. vLLM's serving stack handles hundreds of concurrent requests; Ollama does not.

**Use [LiteLLM](../projects/litellm.md) when** you need to route across multiple models or providers. LiteLLM can use Ollama as one of its backends while providing rate limiting, logging, and model fallback logic Ollama lacks.

**Use cloud APIs ([OpenAI](../projects/openai.md), [Anthropic](../projects/anthropic.md))** when task quality requires frontier models and data residency is not a constraint. Ollama's quantized open-source models do not match GPT-4 or Claude on most benchmarks.

**Use Ollama when** you're building a prototype or tool that requires local inference for privacy, offline capability, or cost reasons, and you expect single-user or small-team usage. It is the lowest-friction path from "zero" to "local model running."

## Related Concepts

- [Model Context Protocol](../concepts/mcp.md): Ollama functions as an LLM backend within MCP-based agent architectures.
- [Context Window](../concepts/context-window.md): Ollama exposes context length as a Modelfile parameter; quantization affects effective context capacity.
- [Retrieval-Augmented Generation](../concepts/rag.md): Ollama is a common local inference backend for RAG pipelines that need to avoid cloud API dependencies.
- [Embedding Model](../concepts/embedding-model.md): Ollama can serve embedding models locally via `/api/embeddings`, making it a single tool for both generation and retrieval in local stacks.

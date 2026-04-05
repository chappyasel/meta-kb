---
entity_id: ollama
type: project
bucket: agent-systems
sources:
  - repos/getzep-graphiti.md
  - repos/greyhaven-ai-autocontext.md
  - repos/caviraoss-openmemory.md
  - repos/infiniflow-ragflow.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/memento-teams-memento-skills.md
related: []
last_compiled: '2026-04-05T05:25:46.697Z'
---
# Ollama

## What It Does

Ollama lets you download and run open-source language models locally with a single command. You pull a model by name (`ollama pull llama3.2`), and it starts a local HTTP server at `localhost:11434` that speaks an OpenAI-compatible API. The project packages model weights, runtime configuration, and a Go-based server into one binary that handles quantization, GPU detection, and context management without requiring users to configure any of that manually.

The core value proposition: swap `api.openai.com` for `localhost:11434` in existing code and get local inference.

## Architecture

Ollama is written in Go with a client-server split. The server process manages model lifecycle: loading models into memory, handling concurrent requests, and unloading models after an idle timeout. The CLI is a thin client that talks to this server over HTTP.

Model files use the Modelfile format, which borrows vocabulary from Docker. A Modelfile specifies a base model, system prompt, parameters (temperature, context length, stop tokens), and template format. This lets teams share model configurations the way they share Dockerfiles.

Under the hood, Ollama shells out to `llama.cpp` for inference. The Go layer handles:
- The REST API surface (`/api/generate`, `/api/chat`, `/api/embeddings`)
- GPU detection and layer offloading decisions
- Model download and caching in `~/.ollama/models`
- The OpenAI-compatible endpoint at `/v1/chat/completions`

Model weights ship as `.gguf` files, which `llama.cpp` loads directly. Quantization level is baked into the model file you pull — `llama3.2:3b-instruct-q4_K_M` is a 4-bit quantized 3B parameter model, roughly 2GB on disk.

The OpenAI compatibility layer is the architectural decision with the most practical weight. Tools like Graphiti use `OpenAIGenericClient` pointed at `http://localhost:11434/v1` to run local embeddings and inference with no code changes beyond the base URL.

## Key Numbers

~100k+ GitHub stars (self-reported by the project's community position). Inference speed benchmarks are entirely hardware-dependent and self-reported by users — a 7B parameter model on an M2 MacBook Pro typically runs 30-60 tokens/second, while GPU-accelerated setups on an RTX 4090 can exceed 100 tokens/second for the same model. No independently validated cross-platform benchmarks exist.

The Ollama model library lists 100+ models including Llama 3, Mistral, Gemma, Phi, Qwen, and DeepSeek variants. Most practical use involves models between 1B and 70B parameters.

## Strengths

**Zero-configuration GPU utilization.** Ollama detects available VRAM and automatically decides how many transformer layers to offload to GPU versus run on CPU. Users don't tune this manually.

**OpenAI API compatibility.** The `/v1/` endpoint means any tool written for OpenAI works against Ollama with a URL change. This includes LangChain, LlamaIndex, Graphiti, and most agent frameworks.

**Model management UX.** `ollama pull`, `ollama list`, `ollama rm` give models the same CLI ergonomics as Docker images. The Modelfile system lets you build custom model variants with baked-in system prompts.

**Cross-platform single binary.** Runs on macOS (including Apple Silicon with Metal acceleration), Linux (CUDA and ROCm), and Windows. No Python dependency conflicts.

## Limitations

**Concrete failure mode: structured output reliability degrades on smaller models.** Tools that depend on JSON-mode or structured outputs (Graphiti explicitly warns about this) get malformed responses from sub-7B models. The `OpenAIGenericClient` workaround in Graphiti exists precisely because smaller local models frequently violate output schemas that cloud APIs handle reliably. You discover this at runtime when your agent framework crashes on a JSON parse error.

**Unspoken infrastructure assumption: adequate VRAM or RAM for the model you're running.** The documentation shows `ollama pull llama3.2` as if hardware is free. A 70B model at 4-bit quantization requires ~40GB of memory. On machines without that, Ollama silently falls back to CPU-only inference, which runs 5-10x slower. Nothing in the CLI warns you this happened until you notice tokens arriving at 2/second.

## When NOT to Use It

Don't use Ollama when:

- **You need reliable structured outputs from small models.** Frontier API models (GPT-4o, Claude) handle JSON schemas consistently. Local 3B-7B models do not. If your pipeline fails on malformed JSON, you want a cloud API.
- **You're deploying multi-user production inference.** Ollama's server is single-process and loads one model at a time by default. High-concurrency production workloads need vLLM, TGI, or a managed inference service.
- **Your hardware is CPU-only and latency matters.** CPU inference on a 7B model is workable for background tasks. It's frustrating for interactive use.
- **You need fine-tuned or custom-quantized models not in the Ollama registry.** You can import GGUF files manually, but the workflow is fiddly compared to just running llama.cpp or vLLM directly.

## Unresolved Questions

**Multi-model concurrency behavior.** The documentation doesn't clearly specify what happens when two clients request different models simultaneously — whether requests queue, whether the second model loads while the first is active, or how memory is reclaimed. Empirically, Ollama unloads an idle model after 5 minutes and loads the new one, which means cold-start latency on model switches.

**Long-term model API compatibility.** Modelfile syntax and the `/api/` endpoints have changed between versions. There's no published stability or versioning guarantee for the API surface, which matters for teams building tools on top of it.

**Resource governance for shared machines.** No built-in VRAM limits, request queuing configuration, or multi-user isolation. Two users running concurrent inference against the same Ollama instance on a shared GPU server will interfere with each other silently.

## Alternatives

- **vLLM** — Use when you need high-throughput production inference with proper batching, multiple concurrent requests, and quantization control. More setup, significantly better performance at scale.
- **LM Studio** — Use when you want Ollama's ease-of-use with a GUI model browser and more granular parameter controls. Not scriptable as a CLI tool.
- **llama.cpp directly** — Use when you need maximum control over quantization, context length, and inference parameters, or when you're embedding inference in a custom application.
- **llamafile** — Use when you want a single executable that bundles both the runtime and weights. No server process, no installation, runs anywhere.
- **Groq API** — Use when you want low-latency inference on open models without managing hardware. Cloud-hosted but substantially faster than local CPU inference for many model sizes.

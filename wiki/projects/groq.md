---
entity_id: groq
type: project
bucket: agent-systems
abstract: >-
  Groq provides LLM inference via proprietary Language Processing Units (LPUs)
  designed for deterministic, memory-bandwidth-optimized sequential token
  generation, delivering 10-18x throughput vs GPU-based providers at
  significantly lower latency.
sources:
  - repos/natebjones-projects-ob1.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
  - anthropic
  - gemini
  - cursor
  - claude
  - mem0
last_compiled: '2026-04-07T01:04:33.414Z'
---
# Groq

## What It Does

Groq builds and operates Language Processing Units (LPUs), custom silicon designed specifically for the sequential, memory-bound workload of autoregressive token generation. The company offers an inference API where developers can access open-weight models (Llama 3, Mixtral, Gemma, Whisper) at speeds that make real-time streaming feel instant by comparison to GPU-based providers.

Unlike GPU-based inference providers ([OpenAI](../projects/openai.md), [Anthropic](../projects/anthropic.md), [Gemini](../projects/gemini.md)), Groq does not train foundation models. The LPU architecture is purpose-built for inference-only workloads, trading GPU flexibility for a single performance dimension: tokens per second.

## Architecture: How the LPU Works

Standard GPUs were designed for parallel floating-point operations across large matrix multiplications, which is why they excel at training. During inference, the bottleneck shifts: generating each token is sequential (each new token depends on the previous one), and the critical bottleneck becomes memory bandwidth, not compute throughput. A transformer with 70B parameters must load billions of weights from HBM memory on every forward pass.

Groq's LPU is a dataflow architecture built around on-chip SRAM rather than off-chip HBM. Key design choices:

- **On-chip weight storage**: Model weights live in SRAM directly on the chip, eliminating the memory bandwidth wall that throttles GPU inference
- **Deterministic execution**: No dynamic scheduling, no cache misses, no branch misprediction. Every operation follows a fixed, compiler-determined schedule
- **Synchronous dataflow**: Computation is pipelined across processing elements in lockstep, enabling predictable latency that GPU inference cannot match
- **SIMD-style parallelism**: The chip executes the same operation across many data elements simultaneously, suited to the uniform structure of transformer layers

The tradeoff is real: you cannot run arbitrary neural architectures on an LPU the way you can on a GPU. The Groq compiler must map the model's compute graph to the chip's fixed dataflow topology, which works well for transformer attention and feed-forward layers but limits flexibility for novel architectures.

## Performance Numbers

Groq consistently benchmarks at 500-800 tokens/second for Llama 3 70B (versus ~30-80 tokens/second on comparable GPU providers). For Llama 3 8B, throughput reaches 1200-1800 tokens/second.

Independent third-party benchmarks from [ArtificialAnalysis.ai](https://artificialanalysis.ai) place Groq as the fastest available inference provider across open-weight models, typically 3-5x faster than the next fastest option for time-to-first-token and output token throughput. These numbers are from external testing, not Groq's own claims.

**Caveats on benchmarks**: Raw tokens/second only matters for streaming use cases where a user is waiting. For batch processing, throughput is more relevant than latency. Groq's advantage compresses at the batch level because GPUs amortize memory bandwidth across multiple requests. Groq's LPU architecture is optimized for low-batch, low-latency inference.

## Relevance to Agent Systems

For agent pipelines, Groq changes the performance envelope on several patterns:

**Tool-call loops ([ReAct](../concepts/react.md), [Agentic RAG](../concepts/agentic-rag.md))**: Multi-step loops that make 5-15 LLM calls per user request become practical at interactive latency. At 30 tokens/second, a 10-step ReAct loop producing 100 tokens per step costs 30+ seconds. At 800 tokens/second, the same loop completes in under 2 seconds.

**[Chain-of-Thought](../concepts/chain-of-thought.md) at scale**: Extended reasoning traces (500-2000 tokens) run in under one second rather than 15-30 seconds, making CoT economically practical for high-volume applications.

**Memory systems**: Groq appears as a supported LLM provider in both [Mem0](../projects/mem0.md) and [Graphiti](../projects/graphiti.md). In Graphiti's `graphiti_core/llm_client/` directory, `GroqClient` is one of 7 provider implementations. In Mem0, Groq is listed among 16 supported LLM providers via `mem0/llms/`. For agent-memory pipelines running 4-8 LLM calls per memory operation, Groq's speed directly reduces end-to-end latency.

**Streaming UX**: For [Cursor](../projects/cursor.md) and coding tools, fast token streaming creates the subjective sense of a capable assistant. Groq's latency is the reason code completions feel instantaneous rather than delayed.

## Model Availability

Groq hosts open-weight models only. As of mid-2025:

- Llama 3.1 8B, 70B (Meta)
- Llama 3.3 70B
- Llama 3 Groq 8B/70B Tool Use (fine-tuned for function calling)
- Mixtral 8x7B
- Gemma 2 9B
- Whisper Large v3 (speech-to-text)
- Llama Guard 3 (content moderation)

Notably absent: GPT-4, Claude, Gemini. Any application requiring frontier model quality must accept GPU-based latency or use Groq for smaller models with lower quality requirements.

## Strengths

**Raw speed**: Nothing else matches Groq's tokens-per-second on the models it supports. For latency-sensitive agentic pipelines, this is a genuine capability difference, not a marketing claim.

**Cost**: Groq's pricing sits below GPU providers at comparable model sizes. Llama 3 70B inference costs roughly $0.59-0.89/million tokens versus $1-3/million for comparable GPU-hosted alternatives.

**Predictable latency**: The deterministic execution model means P99 latency doesn't spike the way it does on GPU clusters under load. This matters for SLA-sensitive applications.

**Tool use support**: The Groq Tool Use models are fine-tuned specifically for JSON function calling, addressing a common failure mode of smaller open-weight models on structured output tasks.

## Critical Limitations

**Model ceiling**: The fastest inference in the world on Llama 3 70B still underperforms GPT-4o, Claude Sonnet, or Gemini 1.5 Pro on complex reasoning tasks. For [SWE-Bench](../projects/swe-bench.md)-style coding problems or multi-hop reasoning, no Groq-hosted model competes with frontier models. Speed does not compensate for capability gaps when the task requires it.

**Context window constraints**: Groq's on-chip SRAM architecture means context window support is a function of physical chip capacity. Llama 3 70B on Groq supports 8k-32k tokens depending on model variant, while GPU providers can run the same models at 128k context. Applications requiring long-context retrieval or dense document processing cannot use Groq's fastest configurations.

**Infrastructure assumption**: Groq's pricing and availability assumes you're running inference in their managed cloud. There is no self-hosted LPU option for most customers. If your data governance requirements prevent sending inference traffic to third-party APIs, Groq is not available as a deployment option.

## When NOT to Use Groq

- Your task requires frontier model quality (complex reasoning, code generation at SWE-Bench level, multi-step planning)
- You need context windows above 32k tokens
- You need models not in Groq's hosted catalog (proprietary models, custom fine-tunes)
- Your compliance requirements prevent third-party API inference
- You're running batch processing where latency is irrelevant and cost-per-token at scale matters more than time-to-first-token

## Unresolved Questions

**Scaling economics**: Groq's on-chip SRAM advantage holds for low-batch inference. At high request volume, the economics of SRAM versus HBM become less clear. Groq has not published detailed throughput curves showing where the cost-efficiency crossover occurs with GPU providers at high batch sizes.

**Fine-tuning**: No public fine-tuning API exists for Groq. Customers cannot run custom-tuned weights on LPU hardware. Whether this will be offered and at what price point is undisclosed.

**Hardware availability**: Groq has experienced rate limiting and waitlists during high-demand periods. The physical chip manufacturing pipeline constrains capacity in ways that GPU cloud providers (who can spin up additional GPU instances) do not face. No public capacity roadmap exists.

**Long-term model access**: Open-weight model licensing can change. If Meta or Mistral restricts model licensing, Groq's hosted model catalog narrows. Groq does not train models itself, creating a structural dependency.

## Alternatives

**Use [OpenAI](../projects/openai.md) when** you need GPT-4o quality and latency is acceptable or your application requires the full OpenAI ecosystem (Assistants API, DALL-E, fine-tuning).

**Use [Anthropic](../projects/anthropic.md)/[Claude](../projects/claude.md) when** your task requires long context (200k tokens), complex reasoning, or strong instruction following and you can accept 3-5x higher latency.

**Use [vLLM](../projects/vllm.md) when** you need self-hosted inference with custom models, fine-tunes, or enterprise data isolation requirements. vLLM achieves 2-4x GPU throughput improvements over naive serving, not LPU speeds, but removes the third-party API dependency.

**Use [Ollama](../projects/ollama.md) when** you need local inference on developer hardware with no API dependency, and you can accept local hardware performance (typically 10-50 tokens/second on M-series Macs).

**Use [LiteLLM](../projects/litellm.md) with Groq** when you want Groq's speed but with a provider-abstraction layer that lets you fallback to GPU providers when Groq is unavailable or when the task requires a model Groq doesn't host.

**Use [OpenRouter](../projects/openrouter.md) when** you need access to multiple providers with unified billing and want to route high-speed requests to Groq and frontier-quality requests to other providers through a single API.

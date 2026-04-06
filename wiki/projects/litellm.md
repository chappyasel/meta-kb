---
entity_id: litellm
type: project
bucket: agent-systems
abstract: >-
  LiteLLM provides a unified Python interface to 100+ LLM APIs with
  OpenAI-compatible call signatures, plus a proxy server for load balancing,
  cost tracking, and rate limiting across providers.
sources:
  - repos/volcengine-openviking.md
  - repos/evoagentx-evoagentx.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/volcengine-openviking.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - openai
last_compiled: '2026-04-06T02:04:28.330Z'
---
# LiteLLM

## What It Does

LiteLLM lets you call GPT-4, Claude, Gemini, Llama, Mistral, and 100+ other models through a single Python interface or HTTP proxy, without rewriting your code when you switch providers. The library translates your call into whatever format the target provider expects, handles retries, and returns a standardized response object.

The proxy component extends this into production infrastructure: it sits between your application and LLM providers, handling authentication, routing, cost tracking, rate limiting, and fallbacks across a fleet of models.

## Architecture

LiteLLM has two deployment modes that share the same translation layer:

**Library mode** (`pip install litellm`): Drop-in replacement for the OpenAI Python client. `litellm.completion(model="claude-3-5-sonnet", messages=[...])` routes through Anthropic's API and returns a response object identical in structure to what OpenAI would return. Model selection is a string prefix: `"anthropic/claude-3-5-sonnet"`, `"ollama/llama3"`, `"vertex_ai/gemini-pro"`.

**Proxy mode** (`litellm --model gpt-4`): Runs an OpenAI-compatible HTTP server. Applications point their OpenAI client at `http://localhost:4000` and gain access to all providers. The proxy adds budget management, virtual keys, team-level spending controls, a Redis-backed rate limiter, and a LangFuse/Helicone-compatible logging interface.

The core translation layer maps between provider-specific API formats. Key files in the codebase handle: request parameter mapping (temperature, max_tokens, stop sequences have different names and valid ranges across providers), streaming response normalization (each provider emits SSE events differently), and error code translation (provider-specific HTTP errors map to OpenAI error classes for consistent handling).

LiteLLM appears as a dependency in multiple projects covered in this knowledge base. OpenViking uses it as the VLM provider abstraction layer, supporting Volcengine, OpenAI, and "litellm" as a catch-all for everything else. Cognee routes all LLM calls through LiteLLM via the `STRUCTURED_OUTPUT_FRAMEWORK=instructor` path. Memento-Skills uses it as the multi-provider client in its middleware layer (`middleware/llm/`). PageIndex wraps it in `utils.py` with retry logic (`llm_completion`, `llm_acompletion`) and uses `litellm.token_counter()` for model-accurate token counting.

## Key Numbers

- **100+ providers** supported (self-reported, covers all major commercial and open-source hosting services)
- **20,000+ GitHub stars** (as of mid-2025, verified via public repository)
- Production deployments at scale companies (reported by maintainers, independently verified by user case studies in the community)

## Strengths

**Provider abstraction that actually works**: The translation layer handles genuinely tricky differences between providers — Anthropic's `system` prompt handling differs from OpenAI's, Gemini's token limits differ by model variant, local Ollama models have no streaming timeout by default. LiteLLM has accumulated fixes for these edge cases over years of production use.

**Async support**: `litellm.acompletion()` is a proper async coroutine, not a thread-wrapped sync call. For agent systems running many concurrent LLM calls (common in multi-step RAG pipelines or agent orchestration), this matters.

**Token counting without calling the API**: `litellm.token_counter(model, messages)` counts tokens locally using the provider's tokenizer. This is how PageIndex's markdown tree builder measures node sizes accurately without burning API credits.

**Structured output / instructor integration**: Works as the backend for instructor, enabling Pydantic-validated structured outputs across providers that don't natively support JSON mode.

**Cost tracking**: Built-in cost lookup table per model per token. The proxy surfaces this via dashboard; the library exposes it on response objects.

## Critical Limitations

**Failure mode — provider parity gaps**: LiteLLM promises a uniform interface, but providers update their APIs constantly. When Anthropic adds a new parameter (say, extended thinking or tool_choice constraints), LiteLLM may lag weeks or months before supporting it. Code that depends on new provider-specific features often has to bypass LiteLLM temporarily. The translation layer cannot abstract features that only one provider has.

**Infrastructure assumption — proxy requires Redis for rate limiting**: The proxy's virtual key system and team-level rate limiting depend on Redis for shared state. A single-instance deployment without Redis will appear to work but won't enforce limits correctly across restarts or horizontal scaling. The documentation mentions this but understates how quickly you hit the limitation in production.

## When NOT to Use It

**Provider-specific feature requirements**: If your application relies on Anthropic's extended thinking, OpenAI's o1/o3 reasoning traces, or Gemini's grounding with Google Search, LiteLLM's abstraction layer may be in your way rather than helping. You'll spend time working around the normalization rather than benefiting from it.

**Maximum performance for a single provider**: LiteLLM adds a translation layer with real overhead (serialization, validation, format conversion). For latency-critical applications on a single provider, the native client library is faster.

**Simple single-provider scripts**: The library adds complexity and a dependency for no benefit if you're only ever calling one provider. Use the OpenAI client directly for OpenAI, the Anthropic client for Claude.

**Embedding pipelines at scale with custom providers**: The embedding interface has more gaps across providers than the completion interface. Some providers require provider-specific parameters that fall through the abstraction. Verify your specific embedding provider works before committing to LiteLLM for vector ingestion pipelines.

## Unresolved Questions

**Conflict resolution between providers**: When the same capability exists in multiple providers with different semantics (e.g., `top_p` vs `top_k`), LiteLLM's translation choices are not always documented. It's unclear whether a parameter present in your call but unsupported by the target model is silently dropped or raises an error.

**Cost table maintenance**: The built-in cost table goes stale as providers change pricing. There's no documented mechanism for users to override or supplement the built-in table with current prices, and it's unclear how frequently the table is updated.

**Proxy observability at scale**: The proxy's LangFuse integration and dashboard are well-documented for small deployments. How logging holds up at 10M+ calls/day with dozens of models is not covered in official documentation.

**Long-term governance**: LiteLLM is a startup (BerriAI) offering both open-source and enterprise tiers. The boundary between what stays open and what moves to enterprise is not clearly documented, which matters for teams building infrastructure on the open-source proxy.

## Alternatives

| Tool | Use when |
|------|----------|
| **Direct provider SDKs** (openai, anthropic) | Single-provider applications or when you need cutting-edge provider features immediately |
| **[vLLM](../projects/vllm.md)** | High-throughput serving of open-source models; need batching and continuous inference optimization |
| **[Ollama](../projects/ollama.md)** | Local model inference only; simpler setup, no multi-provider routing needed |
| **OpenRouter** (managed API service) | Want multi-provider routing without managing proxy infrastructure yourself |
| **PortKey.ai** | Enterprise proxy with more advanced guardrails and observability than LiteLLM's open-source proxy |

## Ecosystem Role

LiteLLM has become infrastructure for the LLM tooling ecosystem rather than an end-user product. Its position is closest to what JDBC was for databases — an abstraction layer that other frameworks depend on. [LangChain](../projects/langchain.md), [LlamaIndex](../projects/llamaindex.md), Cognee, OpenViking, and Memento-Skills all use it internally. This network effect works both ways: broad adoption means faster bug fixes and wider provider coverage, but also means breaking changes propagate widely when they occur.

For agent systems specifically — the context of this knowledge base — LiteLLM solves a real problem: [agent orchestration](../concepts/agent-orchestration.md) frameworks need to swap models for different tasks (cheap model for retrieval ranking, expensive model for synthesis), and LiteLLM makes that swap a one-line change rather than a refactor.

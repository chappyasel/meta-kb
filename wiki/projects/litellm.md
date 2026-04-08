---
entity_id: litellm
type: project
bucket: agent-architecture
abstract: >-
  LiteLLM is a Python library providing a unified OpenAI-compatible API for 100+
  LLM providers, enabling model-agnostic development through a single interface
  with built-in load balancing and cost tracking.
sources:
  - repos/evoagentx-evoagentx.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/memento-teams-memento-skills.md
related: []
last_compiled: '2026-04-08T02:53:58.950Z'
---
# LiteLLM

## What It Does

LiteLLM wraps 100+ LLM provider APIs (OpenAI, Anthropic, Google, Cohere, Azure, Ollama, Bedrock, and many others) behind a single OpenAI-compatible interface. A call to `litellm.completion("claude-3-5-sonnet", messages=[...])` looks identical to a call to `litellm.completion("gpt-4o", messages=[...])` — the library handles authentication, request translation, and response normalization behind the scenes.

The library ships in two forms: a Python SDK for direct embedding, and LiteLLM Proxy, a self-hosted OpenAI-compatible server that any application can call over HTTP. The proxy adds budget management, rate limiting, multi-model routing, per-key cost tracking, and a management dashboard.

Agent infrastructure teams rely on LiteLLM to avoid vendor lock-in, implement fallback chains between models, and track API costs across multi-provider deployments. Projects like EvoAgentX ([EvoAgentX](../projects/evoagentx.md)), Cognee, and Memento-Skills all use LiteLLM as their LLM abstraction layer rather than calling provider SDKs directly.

## Architecture

LiteLLM's core is a translation pipeline that sits between calling code and provider APIs.

**Request normalization:** `litellm/main.py` is the entry point. The `completion()` function accepts an OpenAI-style request (model name, messages list, parameters) and routes to a provider-specific handler. Model names use a `provider/model` convention: `anthropic/claude-3-5-sonnet-20241022`, `ollama/llama3`, `bedrock/anthropic.claude-3-sonnet-20240229-v1:0`. The provider prefix determines which handler runs.

**Provider handlers:** Each provider lives in `litellm/llms/`. Anthropic's handler at `litellm/llms/anthropic/chat/transformation.py` translates the OpenAI messages format to Anthropic's API format, manages `system` prompt extraction (Anthropic separates system prompts from the messages array), and maps response fields back to OpenAI format. The same translation pattern repeats for each provider.

**Response normalization:** All provider responses get wrapped into a `ModelResponse` object that matches OpenAI's response schema. Code consuming LiteLLM always sees the same structure regardless of which model ran.

**Token counting and cost calculation:** `litellm/utils.py` exposes `token_counter()` and `completion_cost()`. Token counting uses provider-specific tokenizers where available and tiktoken as a fallback. Cost calculation references a `model_prices_and_context_window.json` file that maps model names to per-token pricing. This file requires manual updates when providers change pricing.

**Async support:** `litellm.acompletion()` provides an async interface using the same translation pipeline. The Cognee codebase uses `asyncio.gather()` over `litellm.acompletion()` calls to parallelize entity extraction across document chunks.

**Streaming:** The library handles SSE (server-sent events) streaming from providers and exposes a unified streaming interface. Streaming responses wrap into `ModelResponseStream` chunks that match OpenAI's streaming format.

**Router:** `litellm/router.py` implements load balancing, fallback chains, and retry logic across multiple deployments of the same or different models. A router configuration specifies a list of model deployments with weights or strategies (least-latency, round-robin, lowest-cost). When a request fails or a model is rate-limited, the router tries the next deployment. EvoAgentX uses this through its LiteLLM model wrapper in `evoagentx/models/litellm_model.py`.

**Proxy server:** `litellm/proxy/` contains a FastAPI application that runs as a standalone service. The proxy uses the same router internally but exposes `/v1/chat/completions`, `/v1/embeddings`, and other OpenAI-compatible endpoints over HTTP. Virtual API keys map to budget limits and allowed model lists, enabling per-team or per-application cost isolation.

## Key Numbers

- **GitHub stars:** ~20,000+ (as of mid-2025) — one of the most starred LLM abstraction libraries
- **Provider count:** 100+ providers, 100+ model families
- **Context window support:** Maintains per-model context window sizes in `model_prices_and_context_window.json`
- **Test coverage:** Extensive provider-specific test files in `tests/llm_translation/`

Star counts are observable facts. Benchmark performance is not an applicable metric for an API abstraction library.

## Strengths

**Drop-in OpenAI replacement.** Any code using `openai.chat.completions.create()` works with LiteLLM after changing the client. No message format translation needed by the caller.

**Provider breadth.** Covering 100+ providers means agent systems can target local models (Ollama, LlamaCpp), cloud APIs (OpenAI, Anthropic, Gemini), and self-hosted inference ([vLLM](../projects/vllm.md), TGI) through one interface. This matters for systems that need to route between cheap models for high-volume tasks and expensive models for high-stakes tasks.

**Router for resilience.** The fallback and retry logic in `litellm/router.py` addresses the most common production failure mode: provider outages and rate limits. A router with `fallbacks=[{"model": "gpt-4o"}, {"model": "claude-3-5-sonnet"}]` handles this transparently.

**Cost tracking.** Per-request cost calculation is baked in via `completion_cost()`. The proxy's per-key budget enforcement builds on this to prevent runaway spend.

**Structured output via Instructor.** LiteLLM works as a backend for the Instructor library, which adds Pydantic-based structured output to any LLM. Cognee's entity extraction pipeline uses `instructor + litellm` to extract typed `KnowledgeGraph` objects from document text.

## Limitations

**Translation fidelity.** Not every provider feature maps cleanly to OpenAI's schema. Provider-specific capabilities — Anthropic's extended thinking, Google's grounding, tool use variants — either get dropped or require provider-specific parameters passed through. The unified interface trades capability access for portability.

**Concrete failure mode — prompt caching inconsistency:** Anthropic's prompt caching uses `cache_control` fields in message content blocks. LiteLLM passes these through but the behavior differs by provider. Code that relies on cache hits for cost reduction may see unexpected behavior when switching between providers that handle caching differently, with no error or warning from LiteLLM.

**Infrastructure assumption — model pricing file staleness:** `model_prices_and_context_window.json` is a static file committed to the repo. Providers change pricing and context windows without notice. Cost calculations for recently updated models may be wrong until a LiteLLM release updates the file. Production cost tracking requires periodic LiteLLM version bumps or manual file overrides.

**Proxy operational complexity.** The proxy adds a network hop, a database (Postgres or SQLite for audit logs), and a Redis dependency (for rate limiting and caching). For teams wanting simple provider switching, the proxy's operational overhead can exceed its benefits.

**Async behavior under load.** The async interface is a thin wrapper over synchronous HTTP calls using `asyncio.to_thread()` in some paths. Under high concurrency, this can exhaust thread pools. True async providers (using `httpx` async clients) perform better, but not all provider handlers are equally async-native.

## When NOT to Use It

**When you need provider-specific features.** If your agent architecture depends on Anthropic's extended thinking, Google's native grounding with citations, or OpenAI's Realtime API, LiteLLM's abstraction layer either drops these features or requires workaround hacks. Call provider SDKs directly.

**When you need deterministic cost accounting.** The pricing file updates lag provider changes. For financial billing or strict budget enforcement, build cost tracking from provider-native usage objects returned in responses.

**When you're deploying a single provider at scale.** The abstraction adds latency (typically 1-5ms) and a translation layer with its own failure modes. An application committed to one provider extracts no portability benefit and adds unnecessary complexity.

**When you need fine-grained request inspection.** The proxy provides logging, but debugging translation errors (wrong parameter passed through, incorrect token count, malformed tool call) requires understanding both the LiteLLM internals and the provider's API. The abstraction layer makes debugging harder, not easier.

## Unresolved Questions

**Proxy governance at scale.** The virtual key system supports per-key budgets, but the documentation does not clearly specify what happens when a budget is exceeded mid-request — whether the request completes and the overage is logged, or the request is rejected. For multi-tenant deployments, this ambiguity matters.

**Conflict resolution for model parameters.** When a parameter is valid for some providers and invalid for others (e.g., `top_k` is supported by Anthropic but not OpenAI), LiteLLM's behavior is to silently drop unsupported parameters. There is no standardized way to detect that a parameter was dropped and the request ran with different settings than intended.

**Long-term provider SDK version pinning.** LiteLLM wraps provider SDKs (openai, anthropic, google-generativeai). When provider SDKs release breaking changes, LiteLLM may lag. The dependency chain creates a coordination problem with no clear resolution timeline published.

**Self-hosted vs. managed proxy tradeoffs.** LiteLLM offers a managed cloud proxy (LiteLLM Enterprise). The division of features between open-source and enterprise is not clearly documented, creating uncertainty about which capabilities require a commercial license.

## Alternatives

**Direct provider SDKs** — Use when you need full access to provider-specific features or are building against a single provider. The `openai` and `anthropic` Python libraries are well-maintained and expose complete API surfaces.

**[LangChain](../projects/langchain.md)** — Use when you need LLM abstraction plus chains, tools, and memory primitives in one package. LangChain's LLM wrappers cover similar provider breadth but are tightly coupled to its ecosystem. LiteLLM is narrower in scope and easier to integrate into existing codebases without framework lock-in.

**[DSPy](../projects/dspy.md)** — Use when you need optimization-aware prompt programming rather than just provider switching. DSPy uses LiteLLM internally for some configurations. The two are complementary, not competing.

**[Ollama](../projects/ollama.md)** — Use for local model serving specifically. Ollama provides better local model management (download, version tracking, hardware optimization). LiteLLM can call Ollama as one of its providers, making them complementary.

**[vLLM](../projects/vllm.md)** — Use for high-throughput self-hosted inference. vLLM exposes an OpenAI-compatible API natively, so LiteLLM's abstraction adds a redundant layer when vLLM is the only backend.

**OpenAI-compatible gateway (custom)** — For teams with strict latency and reliability requirements, building a thin provider gateway using `httpx` directly gives more control over retry logic, connection pooling, and error handling than LiteLLM's general-purpose implementation.

## Ecosystem Role

LiteLLM occupies a foundational position in the agent infrastructure stack. Its ubiquity means that agent frameworks adopting it inherit both its provider coverage and its limitations. When LiteLLM lags on a new provider feature, every framework using it lags simultaneously. This creates a de facto dependency on LiteLLM's release cadence for any team building on top of frameworks that use it as their LLM abstraction layer.

The [Context Engineering](../concepts/context-engineering.md) and [Multi-Agent Systems](../concepts/multi-agent-systems.md) patterns that drive modern agent design both benefit from model-agnostic development — the ability to route different tasks to models with different cost/capability tradeoffs. LiteLLM is currently the most practical tool for implementing this routing without maintaining multiple provider integrations.

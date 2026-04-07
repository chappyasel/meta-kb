---
entity_id: openrouter
type: project
bucket: agent-systems
abstract: >-
  OpenRouter is an API gateway that routes requests to 300+ LLMs from a single
  OpenAI-compatible endpoint, with automatic fallback, cost routing, and unified
  billing across providers.
sources:
  - repos/snarktank-compound-product.md
  - repos/nemori-ai-nemori.md
  - repos/evoagentx-evoagentx.md
related: []
last_compiled: '2026-04-07T11:59:43.820Z'
---
# OpenRouter

## What It Does

OpenRouter provides a single API endpoint (`https://openrouter.ai/api/v1`) that accepts OpenAI-formatted requests and routes them to models from Anthropic, Google, Meta, Mistral, DeepSeek, and dozens of other providers. Developers configure one API key and one base URL; OpenRouter handles authentication, rate limiting, and billing with each upstream provider.

The differentiating features beyond simple proxying: provider fallback (if Anthropic is down, route to a backup), cost-based routing (pick the cheapest provider for a given model), load balancing across providers, and a credits-based billing system that charges per token across all providers from a single account.

## Core Mechanism

OpenRouter exposes an OpenAI-compatible REST API. Clients set `base_url=https://openrouter.ai/api/v1` and pass a model string like `anthropic/claude-3-5-sonnet` or `openai/gpt-4o`. The gateway translates the request format, authenticates with the upstream provider using its own credentials, streams the response back, and records usage for billing.

**Model strings** follow `provider/model-name` convention. The same model often has multiple provider options (e.g., `meta-llama/llama-3.1-70b-instruct` served by multiple hosts), and OpenRouter can load balance or fall back across them.

**Routing parameters** are passed in the request body under `route` or provider-specific headers:
- `route: "fallback"` tries providers in sequence on failure
- `route: "cheapest"` selects the lowest per-token cost provider

The `X-Title` and `HTTP-Referer` headers identify the calling application for usage analytics, which also affects OpenRouter's own rate limiting tiers.

Credentials configuration from downstream projects (seen in the Nemori and EvoAgentX source material) is as simple as:
```bash
LLM_API_KEY=sk-or-...
LLM_BASE_URL=https://openrouter.ai/api/v1
```

EvoAgentX ships an explicit `openrouter_model.py` wrapper that wraps the LiteLLM client with OpenRouter-specific config. Nemori recommends OpenRouter as the default provider precisely because it handles both LLM calls and embedding model calls through one key.

## Key Numbers

- **300+ models** available (self-reported on the OpenRouter website)
- **Stars/forks**: OpenRouter itself is a commercial SaaS product, not an open-source repo; no public GitHub star count applies
- **Pricing**: passes through provider pricing with a small markup; exact markup percentages are not publicly disclosed
- **Uptime SLA**: not published; no formal SLA documentation available

These figures come from OpenRouter's own marketing. No independent benchmark of routing latency overhead or fallback reliability has been published.

## Strengths

**Model switching without code changes.** Swapping from `openai/gpt-4o` to `anthropic/claude-3-5-sonnet` requires changing one string. No new SDK, no new authentication flow.

**Unified billing.** Teams that experiment across providers consolidate invoices. The credits system means you pre-fund an account rather than managing per-provider billing relationships.

**Access to models without direct agreements.** Smaller teams can access Anthropic, Google, and others without setting up separate enterprise accounts. OpenRouter handles the provider relationships.

**Broad ecosystem adoption.** Multiple agent frameworks explicitly support it: EvoAgentX has `openrouter_model.py`, Nemori documents it as the recommended provider, compound-product lists it as an LLM provider option alongside direct Anthropic access. This means copy-paste integration patterns exist for most major frameworks.

**Free tier for exploration.** Some models are available at no cost, which lowers the barrier for prototyping.

## Critical Limitations

**Concrete failure mode: latency overhead.** Every request passes through OpenRouter's infrastructure before reaching the actual model provider. In latency-sensitive agentic loops with many sequential LLM calls, this extra hop adds measurable overhead. A multi-step [ReAct](../concepts/react.md) agent making 20 sequential calls will accumulate this overhead across every step. There is no published data on median added latency.

**Unspoken infrastructure assumption: OpenRouter is the single point of failure.** Applications configured to use only OpenRouter lose all LLM access if OpenRouter's infrastructure goes down, even if Anthropic and OpenAI are both healthy. The fallback routing that OpenRouter provides between providers does not protect against OpenRouter itself being unavailable. Production systems with strict availability requirements need OpenRouter either in an active-active configuration with direct provider fallback, or not at all.

## When NOT to Use It

**High-volume production workloads with cost scrutiny.** OpenRouter's markup on top of provider pricing compounds at scale. A team sending millions of tokens per day will pay noticeably more than with direct provider contracts. At that volume, direct API agreements with preferred providers also unlock rate limit negotiation that OpenRouter cannot offer.

**Regulated or data-sensitive environments.** Requests pass through OpenRouter's servers before reaching the model provider. For healthcare (HIPAA), finance, or government workloads, this additional data processor requires its own compliance review. OpenRouter's data handling agreements and retention policies should be verified before use in these contexts.

**When you need provider-specific features.** Extended thinking mode, Anthropic's prompt caching configuration, or Google's Gemini-specific grounding features may not be fully supported or may behave differently through the proxy layer. Check OpenRouter's documentation for specific feature support before relying on provider-specific capabilities.

**When you need deterministic routing for reproducibility.** Research workflows that require logging exactly which provider and model version handled a request may find OpenRouter's routing behavior harder to pin down, especially when using load-balancing modes.

## Unresolved Questions

**Markup structure.** OpenRouter's pricing page shows per-token rates but does not clearly disclose the size of its markup over provider wholesale rates. This makes cost modeling opaque.

**Data retention and logging.** OpenRouter's terms mention they may log requests for abuse detection. The retention period, the scope of what is logged, and whether logs are accessible to OpenRouter staff is not clearly documented in the main product pages.

**Rate limit inheritance.** When a downstream app hits OpenRouter's rate limits versus hitting an upstream provider's limits, the error handling differs. The documentation does not clearly specify how OpenRouter's own rate limits relate to the underlying provider limits.

**Conflict resolution on provider disagreement.** If two providers return different responses for the same request (during failover), OpenRouter returns the first successful response. There is no documented mechanism for detecting or flagging inconsistencies.

**Governance for enterprise.** No published information on SLAs, uptime guarantees, support tiers, or enterprise contracts.

## Alternatives

**[LiteLLM](../projects/litellm.md)** — open-source proxy with similar multi-provider support, deployable in your own infrastructure. Use LiteLLM when you need self-hosted routing, want to avoid a third-party in the request path, or need to customize routing logic beyond what OpenRouter exposes.

**Direct provider SDKs** — Anthropic, OpenAI, and Google each publish official Python SDKs. Use these when you've committed to a primary model provider, when you need the full feature surface of one provider, or when cost at scale makes the markup unacceptable.

**[vLLM](../projects/vllm.md)** — for self-hosted open-weight model serving. Use when latency, data privacy, or cost per token for open models matters more than access to frontier proprietary models.

**[Ollama](../projects/ollama.md)** — local model serving for development and offline use cases. Use when you need to work without internet access or want zero-cost iteration during prototyping.

The practical selection rule: OpenRouter is the right choice for small teams prototyping across models or building tools that need to support multiple models as user choices. It is the wrong choice for production systems with strict latency, cost, data residency, or availability requirements.

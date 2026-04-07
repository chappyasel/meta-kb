---
entity_id: litellm
type: project
bucket: agent-systems
abstract: >-
  LiteLLM provides a single OpenAI-compatible Python SDK for 100+ LLM providers,
  routing requests uniformly while handling provider-specific auth, rate limits,
  and response normalization.
sources:
  - repos/kayba-ai-agentic-context-engine.md
  - repos/evoagentx-evoagentx.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/repos/topoteretes-cognee.md
related:
  - claude
last_compiled: '2026-04-07T11:45:48.840Z'
---
# LiteLLM

## What It Does

LiteLLM translates calls from OpenAI's API format to 100+ other providers, returning standardized responses regardless of the underlying model. You write code once against the OpenAI SDK interface, and LiteLLM handles the routing, credential management, response normalization, and error translation for Anthropic, Google Gemini, AWS Bedrock, Azure, Ollama, and many others.

The two primary surfaces are a Python SDK (`litellm.completion()`) and a proxy server that turns any OpenAI-compatible client into a multi-provider gateway. Teams use the proxy to centralize LLM access, add spend tracking, enforce routing rules, and apply rate limiting across all their applications without touching application code.

LiteLLM appears throughout the agent framework ecosystem as the standard LLM abstraction layer. Multiple projects in this space — EvoAgentX, Cognee, Memento-Skills, ACE Framework, and PageIndex — route their LLM calls through LiteLLM rather than managing provider-specific SDKs directly.

## Architecture

### Core Routing Engine

The library's central abstraction is `litellm.completion()`, which accepts an OpenAI-formatted request and dispatches it to the target provider after transforming the request payload, headers, and authentication to match that provider's API contract. The response comes back normalized to OpenAI's `ChatCompletion` format.

Provider support works through a registry of provider-specific handler modules. Each handler knows how to construct the correct HTTP request, authenticate, stream responses, and map errors. Adding a new provider means writing a handler that satisfies the interface contract; the core routing logic stays unchanged.

Key internal utilities exposed as public API:

- `litellm.token_counter()` — model-accurate token counting used by frameworks like PageIndex for chunk size calculations
- `litellm.cost_per_token()` and `litellm.completion_cost()` — per-call cost tracking against provider pricing tables
- `litellm.get_model_info()` — context window sizes, capabilities, and pricing metadata for model selection logic

### The Proxy Server

The proxy (`litellm-proxy` or `litellm proxy`) is a FastAPI application that exposes OpenAI-compatible endpoints. Any application hitting `http://localhost:4000/v1/chat/completions` can route through it without code changes.

The proxy adds:
- **Load balancing**: round-robin, least-busy, or latency-based routing across multiple model deployments
- **Fallbacks**: automatic failover when a provider returns errors or rate limit responses
- **Spend tracking**: per-key, per-user, per-team budget enforcement with configurable hard limits
- **Caching**: exact-match and semantic caching to reduce redundant API calls
- **Logging**: structured output to Langfuse, Helicone, S3, and other observability backends
- **Virtual keys**: API keys that map to specific models, budgets, and routing rules without exposing provider credentials

Configuration lives in a YAML file that defines model groups, routing strategies, and guard rails.

### Integration Pattern in Agent Frameworks

The pattern appearing across multiple frameworks: frameworks call `litellm.completion()` or `litellm.acompletion()` (async) with a model string like `"anthropic/claude-3-5-sonnet-20241022"` or `"openai/gpt-4o"`. The prefix determines the provider; the suffix is the model name in that provider's namespace.

Memento-Skills implements a `middleware/llm/` layer wrapping LiteLLM with retry logic (10 retries, 1-second backoff) and JSON extraction utilities, exposing synchronous `llm_completion` and async `llm_acompletion` wrappers. PageIndex does the same in `utils.py`, using the `retrieve_model` parameter to route expensive reasoning calls to a different (more capable) model than the cheaper model used for bulk indexing operations. This split-model pattern — cheap model for high-volume preprocessing, capable model for low-volume reasoning — is a recurring LiteLLM use case.

ACE Framework uses LiteLLM through PydanticAI's LiteLLM integration, supporting OpenAI, Anthropic, Google, Bedrock, Groq, and others through a single runner class (`ACELiteLLM`).

## Key Numbers

- **Provider coverage**: 100+ providers and 100+ models (self-reported by project documentation)
- **GitHub stars**: ~18,000+ (as of mid-2025; widely cited across ecosystem documentation)
- **Adoption signal**: appears as a dependency in EvoAgentX, Cognee, Memento-Skills, ACE Framework, PageIndex, LangChain, and DSPy, among others

The coverage and star counts are self-reported or come from dependent projects' documentation. Independent benchmarks of routing latency or provider compatibility completeness are not available in public literature.

## Strengths

**Drop-in OpenAI compatibility.** Any code already written against the OpenAI SDK can route through LiteLLM with minimal changes. This reduces migration risk when switching providers or running A/B tests across models.

**Split-model workflows.** The ability to specify different models for different subtasks within one application — cheap model for chunking, capable model for synthesis — is straightforward to implement. This pattern pays off in cost-sensitive pipelines that process large volumes of documents.

**Proxy as organizational primitive.** Teams managing LLM access across multiple services benefit from a single proxy that enforces budgets, logs usage, and handles failover without distributing credentials. The virtual key system lets teams grant scoped access to specific models and spending limits.

**Ubiquity as integration surface.** Because so many frameworks depend on LiteLLM, integrating into an existing stack typically means LiteLLM is already present. Token counting, cost calculation, and model metadata APIs are available without adding another dependency.

## Critical Limitations

**Lowest common denominator API.** Normalizing to OpenAI's format means provider-specific capabilities get dropped or approximated. Anthropic's extended thinking, Google's grounding features, and other provider-differentiated capabilities either require workaround parameters or are unavailable through the standard interface. If your application depends on specific model capabilities, you may need to call the provider SDK directly.

**Unspoken infrastructure assumption: the proxy requires state.** The proxy's budget enforcement, virtual keys, and spend tracking store state in a database (SQLite by default, PostgreSQL for production). Running multiple proxy instances requires shared database access. Teams expecting stateless horizontal scaling face additional infrastructure work.

## When NOT to Use It

**When you need provider-specific features at the core of your application.** If your product relies on Anthropic's extended thinking, Claude's specific tool use format, or Gemini's multimodal streaming behavior, LiteLLM's normalization layer becomes friction rather than convenience.

**When you have a single-provider deployment with no anticipated switching.** The abstraction adds a dependency and a maintenance surface. If you are certain you will use one provider and have no need for fallback routing or cost tracking, calling the provider SDK directly is simpler.

**When latency is extremely tight.** Each LiteLLM call adds a small overhead for request transformation and response normalization. For interactive applications with strict p99 latency requirements, this overhead may matter, though it is typically small relative to model inference time.

**When the proxy's data model creates compliance problems.** The proxy logs request metadata, tracks spend, and caches responses. For regulated industries where all LLM call metadata must be handled with specific data residency or retention policies, the default proxy configuration may not satisfy requirements out of the box.

## Unresolved Questions

**Provider parity over time.** As providers evolve their APIs and add capabilities, LiteLLM's provider handlers must keep pace. There is no published compatibility matrix showing which features are supported for each provider, or what the lag typically is when a provider releases a new capability.

**Proxy performance at scale.** The proxy documentation describes budget enforcement and semantic caching, but there are no published benchmarks showing proxy overhead at high request volumes (thousands of requests per second) or showing how database contention affects budget enforcement latency.

**Governance of the open-source project.** LiteLLM is maintained primarily by BerriAI, the company behind the commercial hosted proxy. The relationship between the open-source library and the commercial product is not fully documented. Breaking changes to the open-source version, support responsiveness, and long-term maintenance commitments depend on BerriAI's commercial trajectory.

**Error handling consistency.** LiteLLM maps provider-specific errors to a common error taxonomy, but the completeness of this mapping across all 100+ providers is not documented. Edge cases in provider error responses may surface as unexpected exceptions in downstream code.

## Alternatives

**Direct provider SDKs** (`anthropic`, `openai`, `google-generativeai`): Use when you need full access to provider-specific features, have a single-provider deployment, or need to minimize dependencies. The tradeoff is code changes when switching providers.

**[OpenRouter](../projects/openrouter.md)**: A hosted routing service with similar multi-provider goals. Use when you want the provider abstraction without running your own proxy, and are comfortable with an external service handling routing and billing. OpenRouter charges a markup on top of provider pricing.

**[LangChain](../projects/langchain.md)**: Provides LLM abstraction as part of a broader orchestration framework. Use when you need chain composition, memory management, or retrieval integration alongside provider routing. More opinionated about application structure than LiteLLM.

**[vLLM](../projects/vllm.md)**: For self-hosted inference with OpenAI-compatible endpoints. Use when you need to run open-weight models at scale and want an OpenAI-compatible interface without depending on external providers.

**[Ollama](../projects/ollama.md)**: For local model inference with a simple API. Use for development environments or privacy-sensitive applications where all inference must remain on-device.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — LiteLLM's token counting and cost APIs inform context management decisions in complex pipelines
- [Agent Memory](../concepts/agent-memory.md) — frameworks using LiteLLM for memory operations often depend on its model metadata for choosing appropriate models at each memory tier
- [Prompt Engineering](../concepts/prompt-engineering.md) — provider normalization affects how prompts translate across models with different instruction-following behaviors

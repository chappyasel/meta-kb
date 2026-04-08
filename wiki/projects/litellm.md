---
entity_id: litellm
type: project
bucket: agent-architecture
abstract: >-
  LiteLLM provides a unified Python SDK that translates 100+ LLM provider APIs
  into the OpenAI format, handling auth, retries, and streaming — letting agents
  swap models without changing calling code.
sources:
  - deep/repos/memento-teams-memento-skills.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/vectifyai-pageindex.md
  - repos/evoagentx-evoagentx.md
related: []
last_compiled: '2026-04-08T23:10:47.516Z'
---
# LiteLLM

## What It Does

LiteLLM lets you call any major LLM provider (OpenAI, Anthropic, Google, Cohere, Mistral, Ollama, AWS Bedrock, Azure, and 100+ others) through a single interface that mirrors the OpenAI `chat/completions` format. You write your agent against `litellm.completion()` once; swapping from `gpt-4o` to `claude-opus-4-5` to a locally-hosted Ollama model requires changing one string.

The project has two distinct modes:

- **SDK**: Direct Python library import — `import litellm; litellm.completion(model="...", messages=[...])`
- **Proxy Server**: A local or hosted HTTP proxy that accepts OpenAI-format requests and routes them to any backend. Any tool that already speaks OpenAI can point at the proxy and gain multi-provider routing, load balancing, rate limit handling, and spend tracking without code changes.

Within agent infrastructure, LiteLLM appears as foundational plumbing in dozens of frameworks. Cognee uses it for all LLM and structured output calls (via Instructor). [EvoAgentX](../projects/evoagentx.md) exposes it as `litellm_model.py` for users who need providers beyond native OpenAI and Qwen integrations. The Memento-Skills framework routes all multi-provider LLM calls through it in `middleware/llm/`. PageIndex wraps it in `utils.py` with retry logic for all indexing and retrieval calls.

## Architecture

### Core Translation Layer

The SDK's central mechanism is a provider adapter pattern. Each provider maps to a handler that translates the standard request format to the provider's native API, handles streaming differences, and normalizes responses back into `ChatCompletion` objects. Model routing uses string prefixes: `"anthropic/claude-opus-4-5"`, `"ollama/llama3"`, `"bedrock/amazon.nova-pro"` — the prefix determines which adapter fires.

Key behaviors baked into the translation layer:

- **Streaming normalization**: Providers differ wildly in how they stream tokens. LiteLLM normalizes all providers to the same `stream=True` response format
- **Async support**: `litellm.acompletion()` for async agents, matching the sync API exactly
- **Structured output**: Works with Instructor for Pydantic-validated responses across providers that support it
- **Token counting**: `litellm.token_counter()` provides model-accurate token counts for context management decisions (used directly in PageIndex's tree thinning algorithm)

### Proxy Server

The proxy mode adds a layer of operational infrastructure on top of the translation layer:

- **Load balancing**: Route across multiple API keys or provider instances, useful for high-throughput agent pipelines that hit rate limits
- **Spend tracking**: Per-key, per-user, per-model cost tracking with configurable budget limits
- **Rate limiting**: Configurable limits that prevent any single model or key from being overwhelmed
- **Fallback routing**: If the primary model fails or rate-limits, automatically retry with a fallback model
- **Caching**: Response caching to reduce costs during development or for repeated queries

The proxy exposes an OpenAI-compatible REST API, meaning any tool that integrates with OpenAI (LangChain, LlamaIndex, any custom agent) can route through it without modification.

### Callback and Observability Hooks

LiteLLM supports callbacks on completion calls — success and failure hooks that fire with the full request and response. This enables logging integrations (Langfuse, Helicone, LangSmith, Weights & Biases) without modifying calling code. [Observability](../concepts/observability.md) becomes a configuration-time concern rather than an instrumentation task.

## Key Numbers

- **15,000+ GitHub stars** (self-reported in documentation; widely cited across the ecosystem)
- **100+ providers** supported (self-reported)
- **Adoption signal**: Appears as a dependency in Cognee, EvoAgentX, Memento-Skills, PageIndex, and numerous other agent frameworks reviewed in this knowledge base — this cross-project adoption provides independent validation that it works as advertised

Benchmark performance numbers are not a meaningful metric for a routing/translation library. The relevant metrics are latency overhead and API compatibility fidelity, neither of which LiteLLM publishes with independent validation.

## Strengths

**Provider normalization actually works.** The cross-framework adoption (Cognee, EvoAgentX, PageIndex all use it in production) provides real-world validation that the translation layer handles the meaningful edge cases: streaming, tool calling, async, structured output across different providers.

**Low integration overhead.** Frameworks adopt it as middleware, not as a core dependency that shapes architecture. Cognee wraps it with Instructor for structured extraction; PageIndex wraps it with retry logic in a few dozen lines. It stays out of the way.

**Proxy mode enables organizational-level model governance.** A team can run a single LiteLLM proxy and control which models agents can access, track spend by team or project, and rotate API keys — without touching agent code.

**The `acompletion()` async API matches the sync API exactly.** For agent frameworks built on asyncio (Cognee uses `asyncio.gather()` throughout), this matters: no separate async client to manage.

## Critical Limitations

**Failure mode — provider-specific features get lost in translation.** The normalization layer is a lowest-common-denominator abstraction. When a provider ships a capability that has no equivalent in the OpenAI format (Anthropic's extended thinking, Google's grounding feature, certain vision modalities), LiteLLM either drops it, exposes it through non-standard kwargs, or lags behind the provider's native SDK by weeks to months. Agents that need cutting-edge provider features pay a capability tax for the abstraction.

**Unspoken infrastructure assumption — you trust the proxy's security model.** The proxy mode, when deployed as a shared service, routes credentials for multiple providers through a single process. The proxy's authentication model (API keys, user-level access control) must be correctly configured or it becomes a credential exposure point. Documentation covers configuration options but does not address threat modeling for multi-tenant deployments.

## When NOT to Use It

**Don't use LiteLLM when you need maximum performance from a single provider.** If your agent is locked to one model family permanently, the provider's native SDK will have lower latency (one less translation layer), better access to provider-specific features at launch, and a simpler dependency tree. The abstraction value is provider flexibility; if you have none, the abstraction costs without benefit.

**Don't use it when provider-specific structured output matters.** Anthropic's tool use format and OpenAI's function calling format have meaningful differences in how they handle edge cases. If your agent's reliability depends on precise control over the structured output schema, the translation layer introduces a variable you cannot fully control.

**Avoid the proxy mode for latency-sensitive workloads** without profiling. The proxy adds a network hop. For streaming token-by-token display in a UI, this overhead may be acceptable. For tight agentic loops where the agent makes dozens of sequential LLM calls, the latency compounds.

## Unresolved Questions

**Cost at scale for proxy deployments.** The proxy server's spend tracking and budget enforcement are documented features, but there is no public data on proxy throughput limits, memory consumption per concurrent connection, or failure behavior when the proxy itself becomes a bottleneck. An agent system routing 10,000 concurrent requests through a single proxy has an undocumented ceiling.

**Version compatibility guarantees.** Provider APIs change. When OpenAI ships a new model with different default behavior, or Anthropic changes a parameter name, how quickly does LiteLLM update? The documentation does not specify SLAs or compatibility policy. For production agent systems, a provider API change that breaks the LiteLLM translation layer can silently degrade agent behavior without obvious error signals.

**Provider authentication in the proxy.** The proxy's per-user, per-key spend tracking requires a user management model. The documentation shows configuration but does not address the operational question of how to integrate proxy auth with existing identity systems (SSO, service accounts, CI/CD credentials).

## Alternatives

**Use the provider's native SDK** when you're committed to one provider, need features at launch, or want the simplest possible dependency graph. `anthropic` and `openai` Python SDKs are well-maintained with tight feature parity.

**Use [LangChain](../projects/langchain.md)'s LLM abstractions** when you're already in the LangChain ecosystem and need model switching alongside chain and agent orchestration. LangChain has its own provider normalization layer that integrates with its other abstractions.

**Use [DSPy](../projects/dspy.md)** when your agent architecture centers on declarative program optimization and [Prompt Optimization](../concepts/prompt-optimization.md) — DSPy has its own model abstraction that works alongside its compilation model.

**Use [vLLM](../projects/vllm.md)** when your constraint is throughput on self-hosted models, not provider diversity. vLLM solves a different problem (serving infrastructure) but appears in similar contexts.

**Use LiteLLM** when you're building a [Multi-Agent System](../concepts/multi-agent-systems.md) that needs to route different agents to different models, when you want provider flexibility without rewriting calling code, or when you're operating an agent platform where multiple teams need centralized spend controls. It is the default choice for new agent frameworks that want to avoid vendor lock-in from day one.

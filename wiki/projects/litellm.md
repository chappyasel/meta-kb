---
entity_id: litellm
type: project
bucket: agent-systems
sources:
  - repos/vectifyai-pageindex.md
  - repos/kayba-ai-agentic-context-engine.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/memento-teams-memento-skills.md
related: []
last_compiled: '2026-04-05T05:28:05.207Z'
---
# LiteLLM

## What It Does

LiteLLM is a Python SDK and proxy server that translates calls to 100+ LLM providers through a single OpenAI-compatible interface. You write code once against the OpenAI API shape, and LiteLLM routes it to Anthropic, Cohere, Bedrock, Gemini, Mistral, Ollama, or dozens of others without changing your application code.

The project has two distinct components that are often conflated:

- **The SDK**: A `litellm.completion()` function that mirrors `openai.ChatCompletion.create()` but accepts a provider-prefixed model string like `"anthropic/claude-3-5-sonnet-20241022"` or `"bedrock/amazon.titan-text-express-v1"`.
- **The Proxy**: A self-hosted OpenAI-compatible HTTP server that sits in front of multiple providers, adding rate limiting, spend tracking, key management, and fallback routing.

PageIndex, ACE, and many other LLM frameworks treat LiteLLM as their multi-provider abstraction layer, passing arbitrary model strings directly to LiteLLM rather than maintaining their own provider logic.

## How It Works

The core routing logic lives in `litellm/main.py`. When you call `litellm.completion(model="anthropic/claude-opus-4", messages=[...])`, the library:

1. Parses the provider prefix from the model string via `get_llm_provider()` in `litellm/utils.py`
2. Maps the OpenAI-shaped request to the target provider's format (Anthropic has different field names, streaming behavior, and tool call schemas than OpenAI)
3. Handles the response and normalizes it back to the `ModelResponse` dataclass that mirrors OpenAI's response shape
4. Returns a unified object regardless of which provider served the request

Provider-specific transformation logic lives in per-provider files under `litellm/llms/` (e.g., `anthropic/`, `bedrock/`, `cohere/`). Each implements the same interface: transform request in, normalize response out.

The proxy server (`litellm/proxy/`) adds a FastAPI layer on top, exposing `/v1/chat/completions` and related endpoints. It reads a `config.yaml` that defines model aliases, provider credentials, rate limits per API key, and fallback chains. A request to the proxy at `model="my-sonnet-alias"` gets resolved to the real model and provider before hitting the SDK routing layer.

**Fallback routing** is the feature most teams enable in production. You configure ordered fallback lists in config or code; if the primary provider returns an error or hits a rate limit, LiteLLM retries against the next provider automatically.

**Token counting** uses `token_counter()` in `litellm/utils.py`, which delegates to `tiktoken` for OpenAI models and provider-specific tokenizers or approximations for others. This powers per-request cost tracking.

## Key Numbers

LiteLLM sits around 20,000+ GitHub stars as of mid-2025. Usage numbers come from BerriAI's own reporting. The "100+ providers" claim is accurate in the sense that the routing table includes that many entries, though many are obscure or defunct providers. The ~20 providers you're likely to actually use (OpenAI, Anthropic, Bedrock, Gemini, Azure, Mistral, Groq, Ollama, Together, Replicate, Cohere, Fireworks, Perplexity, Anyscale, Deepinfra, Vertex, Cloudflare, Hugging Face, Databricks, Voyage) are well-maintained. Latency overhead from the SDK layer is minimal, typically under 5ms. Proxy overhead depends on your deployment.

## Strengths

**Provider normalization that actually works.** The OpenAI-to-Anthropic translation covers tool use, streaming, system prompts, and vision inputs. Most teams don't write this themselves because it's tedious and breaks across provider API versions. LiteLLM maintains it across all supported providers.

**Drop-in replacement for OpenAI SDK.** Set `litellm.api_base` and `litellm.api_key` and existing OpenAI SDK code routes through the proxy with zero application changes. This matters when migrating workloads or adding fallback capacity.

**Async-native.** `await litellm.acompletion()` works throughout. Frameworks like PageIndex use `llm_acompletion` wrappers over LiteLLM for concurrent indexing calls.

**Instrumentation.** The SDK emits to LangSmith, Langfuse, Helicone, Weights & Biases, and others through a callback system. Observability comes nearly for free.

## Limitations

**Concrete failure mode: provider API drift.** When Anthropic or Google ships a new API version, there's typically a lag before LiteLLM's translation layer catches up. During that window, new features (new tool call formats, new content types, extended thinking tokens) either silently get dropped or raise cryptic errors. Teams relying on cutting-edge provider features discover this the hard way. The issue tracker has recurring reports of this pattern.

**Unspoken infrastructure assumption: the proxy needs real operational care.** The proxy config approach (YAML-driven model aliases, key management, spend limits) works well for individual teams but does not come with production-grade tooling out of the box. High-traffic deployments need connection pooling, horizontal scaling strategy, and a database backend for spend tracking (the proxy writes to SQLite by default). Organizations running the proxy at serious scale need to invest in operational infrastructure that the documentation undersells.

## When Not to Use It

**Skip LiteLLM if you only use one provider.** The abstraction costs you a dependency and a thin performance tax. Use the provider's SDK directly.

**Skip the proxy if you want simplicity.** The proxy introduces a network hop, a new service to operate, a YAML config to maintain, and a potential single point of failure. For small teams calling a single provider, this is overhead with no benefit.

**Skip LiteLLM if you need guaranteed compatibility with bleeding-edge features.** Providers release new capabilities faster than LiteLLM's translation layer catches up. If you're building on extended thinking, new multimodal inputs, or provider-specific response formats, you will hit gaps.

**Skip it for high-frequency, latency-sensitive workloads.** The proxy adds a network hop. For applications where p99 latency under 100ms matters, the proxy route introduces variance you cannot control.

## Unresolved Questions

**Governance and maintenance velocity.** LiteLLM is backed by BerriAI, a startup. The project's maintenance cadence depends on that company's funding and priorities. There is no clear succession plan or independent governance body. What happens to downstream projects (PageIndex, ACE, and dozens of others) that treat LiteLLM as a dependency if BerriAI's priorities shift?

**Cost at scale with the proxy.** The proxy's spend tracking and key management add database writes per request. At high volume, the SQLite default becomes a bottleneck, and the PostgreSQL migration path is not well-documented for production deployments.

**Translation layer correctness.** There is no public test suite that independently validates provider translation accuracy across all supported providers. The translation logic for less-common providers may have silent bugs that only surface in specific prompt shapes or tool-use patterns.

## Alternatives

**Use the provider SDK directly** when you're committed to a single provider and want maximum compatibility with new features.

**Use OpenAI's Python SDK with a compatible proxy** (OpenRouter, Portkey, Helicone) when you want provider switching at the infrastructure level rather than the application level. These services handle translation server-side.

**Use LangChain's model abstraction** when you're already in the LangChain ecosystem and need the same provider normalization integrated with chains, agents, and retrievers.

**Use Instructor** when your primary need is structured output rather than provider routing. Instructor handles response parsing and validation across providers and composes with LiteLLM for the routing layer.

LiteLLM is the right choice when you're building a framework or application that needs to support multiple providers without forcing users to maintain their own translation code, and you're willing to accept the dependency risk and occasional provider drift lag.

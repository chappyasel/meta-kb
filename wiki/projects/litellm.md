---
entity_id: litellm
type: project
bucket: agent-systems
abstract: >-
  LiteLLM is a Python library providing a unified OpenAI-compatible interface
  across 100+ LLM providers, enabling model portability through a single API
  call signature.
sources:
  - repos/kayba-ai-agentic-context-engine.md
  - repos/evoagentx-evoagentx.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - OpenRouter
  - vLLM
last_compiled: '2026-04-05T20:31:40.638Z'
---
# LiteLLM

## What It Does

LiteLLM lets you call OpenAI, Anthropic, Google Gemini, AWS Bedrock, Azure, Cohere, Mistral, Ollama, and 100+ other providers through a single function: `litellm.completion()`. The call signature mirrors OpenAI's API, so switching models requires changing one string.

It appears throughout the agent systems ecosystem as infrastructure glue. PageIndex uses it for all LLM calls in both indexing and retrieval. Cognee routes every provider through it. EvoAgentX wraps it as `litellm_model.py`. Memento-Skills uses it as the multi-provider backbone. ACE routes to providers through PydanticAI's LiteLLM integration. This recurrence in unrelated codebases reflects how deeply it has become assumed infrastructure.

## Core Mechanism

The central abstraction is provider translation. LiteLLM maps the OpenAI message format (`[{"role": "user", "content": "..."}]`) to each provider's native format, handles auth headers, normalizes responses back to OpenAI's schema, and exposes token counts uniformly.

Key functions:

- `litellm.completion(model, messages, ...)` — synchronous completion
- `litellm.acompletion(...)` — async variant
- `litellm.token_counter(model, messages)` — model-accurate token counts (used by PageIndex for tree thinning decisions)
- Structured output via Instructor integration — Cognee uses this for entity extraction with Pydantic models

Model strings follow the pattern `provider/model-name`: `anthropic/claude-3-5-sonnet-20241022`, `bedrock/anthropic.claude-v2`, `ollama/llama3`. OpenAI models use bare names by convention.

The proxy server feature runs LiteLLM as a local OpenAI-compatible API endpoint, allowing tools that only speak OpenAI to route through it to any provider. This is the deployment pattern for vLLM and local model integration.

## Role in Agent Systems

Several patterns appear repeatedly in production codebases:

**Separate indexing and retrieval models**: PageIndex uses `model` for index construction (many cheap calls) and `retrieve_model` for agent reasoning (fewer expensive calls). The config defaults show `gpt-4o-2024-11-20` for indexing and `gpt-5.4` for retrieval. LiteLLM makes this trivial since both use identical call signatures.

**Multi-provider fallback**: Cognee's `LLM_PROVIDER` environment variable switches providers without code changes. ACE documents support for "100+ supported providers" through this interface.

**Structured output routing**: Instructor wraps LiteLLM to coerce LLM outputs into Pydantic models. Cognee's `extract_content_graph()` calls `extract_content_graph()` via Instructor to get typed `KnowledgeGraph` objects. The `STRUCTURED_OUTPUT_FRAMEWORK` config defaults to `instructor`.

**Async batching**: Cognee's entity extraction runs `asyncio.gather(*[extract_content_graph(chunk) for chunk in chunks])` — parallel LLM calls across all chunks in a batch, all routed through LiteLLM's async interface.

## Key Numbers

- ~100+ LLM providers supported (self-reported)
- Used in production by Cognee (70+ companies), PageIndex (Mafin 2.5 financial system), EvoAgentX, Memento-Skills, ACE, and many others
- PyPI downloads consistently among the top Python AI libraries (independently verifiable via PyPI stats)
- GitHub stars: ~15k+ (self-reported at time of writing)

## Strengths

**Zero-migration provider switching**: The main genuine value. Swapping `openai/gpt-4o` for `anthropic/claude-opus-4` requires changing one string. No API client rewrite.

**Token counting accuracy**: `litellm.token_counter()` uses model-specific tokenizers rather than approximations. PageIndex relies on this for tree node size calculations.

**Proxy server for legacy tools**: Tools hardcoded to `https://api.openai.com` can point to a LiteLLM proxy that transparently routes to any backend. This covers vLLM, self-hosted models, and enterprise deployments with custom endpoints.

**Async-first**: `acompletion` works natively, enabling the parallel extraction patterns that agent frameworks depend on for throughput.

## Critical Limitations

**Concrete failure mode — provider capability mismatch**: LiteLLM normalizes interfaces but cannot normalize capabilities. Structured output (Instructor / `response_format=`) works on GPT-4o but fails silently or raises errors on models that don't support function calling or JSON mode. Cognee's `STRUCTURED_OUTPUT_FRAMEWORK=instructor` assumes the configured model supports structured output. Switching to an Ollama model that lacks tool support breaks entity extraction without obvious error messages.

**Unspoken infrastructure assumption**: LiteLLM assumes network access to provider APIs at call time. It has no built-in circuit breaker for provider outages. The retry logic in PageIndex (`10 retries with 1-second backoff`) is implemented by the application, not by LiteLLM. Agent systems that assume LiteLLM handles resilience will fail under provider degradation.

**Abstraction lag**: New model features (extended thinking, prompt caching, multimodal inputs with provider-specific formats) take time to appear in LiteLLM's translation layer. Cutting-edge Anthropic features may require using the Anthropic SDK directly while waiting for LiteLLM support.

## When NOT to Use It

**When you need provider-specific features immediately**: If your system depends on Anthropic's extended thinking, AWS Bedrock's specific VPC routing, or Google's grounding API, LiteLLM may not expose these at all or may expose them with a lag. Use the native SDK.

**When you're deploying a single-provider, latency-critical service**: LiteLLM adds a translation layer. Negligible in most cases, but at sub-50ms SLA requirements, the overhead is measurable.

**When the model matrix is fixed at deployment**: For a production system with one model and no plans to change it, LiteLLM adds dependency weight without practical benefit. The native SDK is simpler to debug and update.

**When you need fine-grained streaming control**: LiteLLM normalizes streaming, but provider-specific streaming behaviors (partial tool calls, mid-stream token counts) can behave inconsistently across providers.

## Unresolved Questions

**Governance and maintenance pace**: LiteLLM is maintained by BerriAI as both open-source and a commercial proxy product. The relationship between the open-source library and the paid proxy tier creates potential for feature prioritization toward the commercial offering. There is no published roadmap for the open-source library separately.

**Cost at scale**: The LiteLLM proxy server is documented for production deployment, but there is no published benchmarks on throughput, latency overhead, or memory footprint under concurrent load. Systems like Cognee that process 1GB in 40 minutes across 100+ containers have no published data on whether LiteLLM was the bottleneck.

**Structured output reliability across providers**: The documentation claims structured output support across providers, but there is no published compatibility matrix showing which models support which output formats reliably. Teams building on this assumption discover gaps when switching providers.

**Version stability**: LiteLLM releases frequently. Application code pinned to specific versions (as PageIndex's `config.yaml` pins model names) can break when provider API versions change and LiteLLM updates its translation mappings.

## Alternatives

**[OpenRouter](../projects/openrouter.md)**: An API aggregator that exposes a single OpenAI-compatible endpoint for all providers as a hosted service. Use OpenRouter when you want provider routing handled externally (no library to update) and are comfortable with API costs going through a third party. LiteLLM is better when you need local control, proxy deployment, or the token counting utilities.

**Provider-native SDKs** (`openai`, `anthropic`, `google-generativeai`): Use these when you need immediate access to new features, better error messages, or when you're locked to one provider. The cost is migration work if you switch providers later.

**[vLLM](../projects/vllm.md)**: For self-hosted open models, vLLM provides an OpenAI-compatible server directly. LiteLLM can proxy to vLLM, making them complementary: vLLM handles inference, LiteLLM handles routing from application code to vLLM's endpoint alongside cloud providers.

**Instructor**: Not a full alternative but commonly paired with LiteLLM specifically for structured output. Cognee and others use them together because LiteLLM handles routing while Instructor handles output coercion. Using Instructor with provider-native SDKs is also valid.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [RAG Pipelines](../concepts/rag.md)

## Sources

- [VectifyAI PageIndex](../raw/deep/repos/vectifyai-pageindex.md)
- [Topoteretes Cognee](../raw/deep/repos/topoteretes-cognee.md)
- [Memento-Skills](../raw/deep/repos/memento-teams-memento-skills.md)
- [Agentic Context Engine](../raw/repos/kayba-ai-agentic-context-engine.md)
- [EvoAgentX](../raw/repos/evoagentx-evoagentx.md)

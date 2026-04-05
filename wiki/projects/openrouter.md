---
entity_id: openrouter
type: project
bucket: agent-systems
abstract: >-
  OpenRouter is an API gateway that provides a single endpoint for 300+ LLMs
  across providers like Anthropic, OpenAI, and Google, with built-in fallback,
  cost tracking, and model routing.
sources:
  - repos/snarktank-compound-product.md
  - repos/nemori-ai-nemori.md
  - repos/evoagentx-evoagentx.md
  - deep/repos/snarktank-compound-product.md
related:
  - OpenAI
  - LiteLLM
last_compiled: '2026-04-05T20:38:03.581Z'
---
# OpenRouter

## What It Does

OpenRouter exposes a single OpenAI-compatible API endpoint (`https://openrouter.ai/api/v1`) that routes requests to 300+ models across providers including Anthropic, OpenAI, Google, Meta, Mistral, and dozens of smaller inference providers. You send one request format; OpenRouter handles provider negotiation, authentication, rate limit management, and billing aggregation. The key differentiator from raw provider APIs is unified cost tracking, automatic fallback across providers, and the ability to switch models by changing one string.

Projects like [Nemori](../raw/repos/nemori-ai-nemori.md) and [EvoAgentX](../raw/repos/evoagentx-evoagentx.md) use OpenRouter as a default credential configuration precisely because it reduces the "which provider should I configure?" decision to a single API key. Compound Product's `analyze-report.sh` lists OpenRouter as one of four supported LLM backends.

## Core Mechanism

OpenRouter implements the OpenAI Chat Completions API contract. A client sets `base_url="https://openrouter.ai/api/v1"` and `api_key="sk-or-..."` — no other code changes required for basic usage. The model string selects both provider and model: `"anthropic/claude-3-5-sonnet"`, `"openai/gpt-4o"`, `"google/gemini-2.0-flash"`.

**Routing logic:** OpenRouter maintains a registry of models, their provider mappings, current pricing, and availability status. When a request arrives, it selects the provider endpoint, forwards the request with the appropriate provider credentials (which you never see), and streams the response back. Pricing is charged in credits at the rate published for that model at request time.

**Fallback:** You can specify `"models": ["anthropic/claude-opus-4", "openai/gpt-4o"]` as a fallback list rather than a single model string. If the first model is unavailable or rate-limited, OpenRouter tries the next. This is the primary reliability mechanism for production agent systems.

**Provider routing:** For models available from multiple inference providers (e.g., Llama 3.1 from Together, Fireworks, or Groq), OpenRouter can route based on latency, cost, or throughput. The `provider` field in the request body lets you pin to a specific backend.

The embedding endpoint also follows OpenAI format, which is why Nemori's config works identically for both completions and embeddings with one key.

## Key Numbers

- **Model count:** 300+ models as of mid-2025 (self-reported, not independently audited, but broadly consistent with community observation)
- **Pricing:** Passes through provider pricing with a small markup; exact markup is not publicly documented
- **GitHub stars:** Not an open-source project; no public repository
- **Company:** Founded 2023, San Francisco; privately held with undisclosed funding

These figures come from OpenRouter's own documentation and marketing. Independent benchmarking of latency overhead introduced by the proxy layer is not publicly available.

## Strengths

**Model switching without credential management.** Agent systems that need to experiment across providers — or hedge against provider outages — pay one bill and manage one key. This matters most during development, when you're benchmarking models for a specific task.

**OpenAI SDK compatibility.** Any codebase already using the OpenAI Python SDK works with OpenRouter by changing two parameters. No new dependency, no new abstraction layer.

**Transparent per-request cost attribution.** Response headers include token counts and cost, enabling per-run cost tracking without building your own token accounting.

**Long-tail model access.** Models from smaller providers (Cohere, AI21, Nous Research fine-tunes) are accessible without individual provider accounts.

## Critical Limitations

**Concrete failure mode — latency amplification under load:** OpenRouter adds a proxy hop. For workloads making hundreds of concurrent requests (e.g., batch evaluation runs or parallel agent loops), this extra hop compounds. Users report 50–200ms added latency per request. For streaming-heavy use cases this is usually unnoticeable, but for high-frequency tool-call loops — where an agent calls a fast model 20+ times per task — the overhead accumulates. There is no published SLA on proxy latency.

**Unspoken infrastructure assumption:** OpenRouter assumes you trust a third party with your prompts. Every message passes through OpenRouter's infrastructure before reaching the model provider. Their privacy policy covers data handling, but regulated industries (healthcare, finance, legal) may have data residency or confidentiality requirements that make a proxy architecture non-compliant regardless of the terms of service.

## When NOT to Use It

**High-volume production inference** at scale favors direct provider APIs. Provider-direct connections eliminate the proxy hop, allow provider-native batching APIs, and avoid single-point-of-failure risk from the OpenRouter gateway itself.

**Cost-sensitive workloads** should price carefully. OpenRouter's markup on top of provider prices can matter at millions of tokens per day. The markup is not uniform across models and is not disclosed as a fixed percentage.

**Air-gapped or private cloud deployments.** If your agent infrastructure can't make outbound HTTPS calls to `openrouter.ai`, the gateway doesn't help. LiteLLM's self-hosted option handles this case.

**Single-provider commitments with volume discounts.** If you've negotiated enterprise pricing directly with Anthropic or OpenAI, routing through OpenRouter forfeits those rates.

## Unresolved Questions

**Markup structure:** OpenRouter does not publish its margin per model or per provider. You can compute it by comparing displayed prices against provider list prices, but this requires manual checking and changes as providers reprice.

**Data retention and logging policy details:** The privacy policy describes what OpenRouter collects, but doesn't specify retention periods for prompt/completion content or whether content is used for any purpose beyond routing. This is an open question for enterprise buyers.

**Reliability guarantees:** No public uptime SLA. When OpenRouter has had outages, all routed traffic fails simultaneously — a risk that doesn't exist when calling providers directly.

**Governance for provider disputes:** If a provider changes their API and OpenRouter's mapping breaks, the failure surface is your application. The resolution timeline is opaque.

## Alternatives

**[LiteLLM](../projects/litellm.md)** — Use when you need self-hosted routing, want to run the proxy inside your own infrastructure, or need provider-native batching. LiteLLM is open source and can be deployed on your stack; OpenRouter is a managed service. LiteLLM handles more edge cases in provider API differences but requires you to operate the proxy.

**Direct provider SDKs** — Use when you've committed to one provider, need maximum performance, or have enterprise pricing. Anthropic's Python SDK and OpenAI's SDK are both well-maintained. Switching cost is writing provider-specific client code, but you eliminate the proxy dependency.

**AWS Bedrock / Azure OpenAI** — Use when your organization requires cloud-provider data agreements, existing enterprise relationships, or VPC-private endpoints. These add operational complexity but satisfy compliance requirements OpenRouter can't.

**Portkey** — Similar managed gateway with stronger observability features (request tracing, guardrails, semantic caching). Use when observability and cost attribution across a team matter more than raw model breadth.

For most agent system prototypes and small production workloads, OpenRouter's convenience outweighs its costs. The decision point is roughly: once you're spending more than ~$500/month on inference, the math on provider-direct access starts to favor the added operational complexity.

## Related Concepts

- [LLM API Standardization](../concepts/llm-api-standardization.md)
- [Agent Tool Calling](../concepts/agent-tool-calling.md)
- [LiteLLM](../projects/litellm.md)

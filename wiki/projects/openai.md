---
entity_id: openai
type: project
bucket: agent-systems
abstract: >-
  OpenAI: AI research company and API provider. Builds GPT-4/o1/o3, DALL-E,
  Whisper, and the Agents SDK. Primary differentiator: dominant API market
  share, function-calling tooling, and first-mover position in agentic
  infrastructure.
sources:
  - repos/memodb-io-acontext.md
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/memorilabs-memori.md
  - repos/greyhaven-ai-autocontext.md
  - repos/caviraoss-openmemory.md
  - repos/topoteretes-cognee.md
  - repos/wangziqi06-724-office.md
  - repos/nemori-ai-nemori.md
  - repos/evoagentx-evoagentx.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/mem0ai-mem0.md
  - repos/agent-on-the-fly-memento.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
related:
  - Claude Code
  - Anthropic
  - Claude
  - Model Context Protocol
  - OpenAI Codex
  - Cursor
  - Google Gemini
  - Mem0
  - LangChain
  - LangGraph
  - Windsurf
  - Self-Improving Agents
  - CrewAI
  - vLLM
  - Ollama
  - Neo4j
  - Qdrant
  - pgvector
  - A-MEM
  - OpenRouter
  - Episodic Memory
  - LoCoMo
  - OpenClaw
  - Retrieval-Augmented Generation
  - Model Context Protocol
  - DeepSeek
  - Lilian Weng
last_compiled: '2026-04-05T20:20:54.047Z'
---
# OpenAI

## What It Is

OpenAI is an AI research company and API provider that builds large language models (GPT series, o1/o3 reasoning models), image generation (DALL-E), speech recognition (Whisper), code models (Codex/GPT-4o), and agentic infrastructure (Assistants API, Agents SDK). Founded in 2015 as a nonprofit, restructured into a capped-profit entity in 2019, and again into a conventional for-profit structure in 2025.

For the agent and LLM ecosystem, OpenAI occupies three distinct roles simultaneously: model provider (GPT-4o, o3-mini, etc.), platform (function calling, structured outputs, thread/run management), and infrastructure standard-setter (the Agents SDK, tool-call protocol, and response format that most frameworks assume by default).

## Architecture and Products

### Model Families

**GPT-4o and variants**: OpenAI's general-purpose multimodal models (text, vision, audio). GPT-4o-mini serves as the cost-optimized tier used by most memory and agent libraries as their default model. GPT-4.1 (released 2025) improved instruction-following and long-context performance. The [Graphiti deep analysis](../raw/deep/repos/getzep-graphiti.md) shows `gpt-4.1-mini` as the default extraction model and `gpt-4.1-nano` for simpler pipeline stages, illustrating how downstream libraries tier model usage by task complexity.

**o1/o3 reasoning models**: Chain-of-thought models with extended internal "thinking" time before response. Targeted at complex reasoning, math, and code generation. Higher latency and cost than GPT-4o; not typically used as default models in agent memory pipelines.

**Codex**: Code generation models. Now largely superseded by GPT-4o's code capabilities, but the brand continues through [OpenAI Codex](../projects/openai-codex.md) as a cloud-based coding agent product.

**Whisper**: Open-source speech-to-text. Widely used outside the OpenAI API.

**Embeddings**: `text-embedding-3-small` and `text-embedding-3-large`. The default embedding provider in Graphiti, Memori, and most agent frameworks. 1536-dimensional output for the large model.

### Agents SDK

Released in early 2025, the Agents SDK provides Python primitives for building agentic workflows: `Agent`, `Runner`, `Tool`, `Handoff`, `Guardrail`. The SDK implements an orchestration loop where agents can invoke tools (including other agents via handoffs), with streaming support and built-in tracing.

Architecturally, the Agents SDK competes directly with [LangGraph](../projects/langgraph.md) and [CrewAI](../projects/crewai.md) while also providing the model backend those frameworks call. The Agents SDK uses OpenAI models by default but the runner interface is extensible.

### Assistants API (Threads/Runs)

A stateful API that manages conversation threads, file attachments, and tool call cycles server-side. Less commonly used in newer agent frameworks, which typically manage state themselves (LangGraph's StateGraph, Graphiti's episode model). The Assistants API remains useful for applications wanting OpenAI to handle persistence rather than building their own.

### Function Calling and Structured Outputs

OpenAI's function calling (now called "tool use") was the first widely adopted protocol for LLMs to invoke external tools with JSON schemas. Most agent frameworks, including [LangChain](../projects/langchain.md) and the Agents SDK, build their tool abstractions on top of OpenAI's tool-call format.

Structured outputs (schema-constrained JSON generation) are required by Graphiti's entire pipeline, which uses Pydantic response models for entity extraction, deduplication, and edge resolution. The [Graphiti analysis](../raw/deep/repos/getzep-graphiti.md) notes that "Graphiti requires LLM services supporting Structured Output for correct schema validation," which effectively restricts provider choice to OpenAI and the handful of providers that implement the same protocol.

### Rerankers

OpenAI provides a reranking API used in Graphiti's `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` search configuration. This is one of three supported rerankers alongside BGE (Hugging Face) and Gemini.

## Market Position

OpenAI holds dominant API market share in the LLM space, though the margin has compressed with competition from Anthropic (Claude), Google (Gemini), and open-source/open-weight providers via [Ollama](../projects/ollama.md) and [vLLM](../projects/vllm.md).

The company's structural advantage is not primarily technical: it is that the OpenAI API format became the default interface that libraries implement against. [OpenRouter](../projects/openrouter.md), vLLM, Ollama, and LiteLLM all expose OpenAI-compatible endpoints, meaning the `openai` Python package serves as the universal LLM client across much of the ecosystem.

GitHub stars, model benchmark positions, and developer survey rankings consistently show OpenAI leading — but these are largely self-reported or sourced from company-adjacent publications. Independent comparisons on Chatbot Arena (LMSYS) provide more credible ranking, where GPT-4o and o3 models have held top positions alongside Claude 3.5 Sonnet and Gemini 1.5 Pro.

## Key Numbers

- **Valuation**: ~$300B (2025, per news reporting — not independently audited)
- **API users**: Millions of developers; exact count not disclosed
- **Context window**: 128k tokens for GPT-4o; 200k for competing Claude 3.5 models
- **GPT-4o pricing**: $2.50/1M input tokens, $10/1M output tokens (as of mid-2025; subject to change)
- **o3-mini pricing**: Higher than GPT-4o; exact tiers vary by usage

All pricing figures are self-reported and subject to change without notice.

## Strengths

**API reliability at scale**: OpenAI's API infrastructure handles production traffic volumes that self-hosted alternatives cannot match without significant ops investment. For teams without ML infrastructure expertise, the managed service removes a hard problem.

**Ecosystem default**: When a library's README says "requires an LLM," it almost always means "works out of the box with OpenAI." Structured outputs, function calling, embeddings, and reranking all have first-class support. Switching to another provider requires finding and fixing every assumption baked into the library.

**Structured output quality**: GPT-4o's structured output implementation (JSON schema enforcement) is reliable enough that Graphiti's 4-5 LLM-call pipeline per episode functions stably in production. Weaker implementations from competing providers can fail schema validation at rates that break pipelines.

**Reasoning models**: o1 and o3 provide qualitatively different performance on multi-step reasoning tasks that GPT-4o handles poorly. For tasks where chain-of-thought reasoning matters (complex code, proofs, adversarial prompting), the reasoning models have no equivalent in the open-source space.

## Critical Limitations

**Vendor lock-in through protocol dominance**: The OpenAI API format being the ecosystem default is a strategic risk for every library that builds against it. Protocol assumptions (tool call format, message structure, structured output schema syntax) create switching costs. When OpenAI changed function calling to "tools" in late 2023, frameworks required updates across their codebase. Every new API version potentially breaks downstream dependencies.

**Infrastructure assumption**: Almost all agent frameworks assume network connectivity to api.openai.com or a compatible endpoint. This rules out air-gapped environments, strict data-residency requirements (where data cannot leave specific geographic regions), and latency-sensitive edge deployments. The Azure OpenAI endpoint partially addresses region requirements but adds Azure dependency.

## When Not to Use OpenAI

**Cost at volume**: For high-throughput applications (millions of calls per day), the per-token cost of GPT-4o-mini ($0.15/1M input tokens) compounds. Open-weight models via Ollama or vLLM reduce this to infrastructure costs. The [Supermemory analysis](../raw/deep/repos/supermemoryai-supermemory.md) estimates $0.10-0.30 per Graphiti session learning cycle using GPT-4.1 — manageable for low volume, significant at scale.

**Data privacy hard requirements**: OpenAI's API sends data to OpenAI's infrastructure. For healthcare, legal, and financial use cases with strict data handling requirements, even enterprise agreements may not satisfy compliance requirements. Self-hosted open-weight models (Llama, Mistral) are the alternative.

**Proprietary research**: OpenAI's most capable models are closed-weight. Researchers needing to inspect model internals, fine-tune at the pretraining level, or publish reproducible benchmarks against a fixed model version cannot use GPT-4o for that purpose.

**Latency-critical inference at the edge**: API roundtrip latency (typically 500ms-3s depending on model and load) is incompatible with real-time applications. Local inference via Ollama or vLLM serves these use cases.

## Unresolved Questions

**Governance after restructuring**: OpenAI's 2025 conversion to a for-profit public benefit corporation removed the nonprofit board's oversight mechanism that originally governed the company's safety commitments. What constraints remain on deployment decisions, and who enforces them, is not publicly documented.

**Cost at scale**: The Graphiti pipeline makes 4-5+ GPT-4.1 calls per `add_episode()`. For a customer service application processing 100,000 conversations per day, the math produces costs in the tens of thousands of dollars monthly. OpenAI does not publish volume discount schedules; enterprise pricing is negotiated privately.

**Model deprecation timeline**: GPT-4, GPT-3.5-turbo, and text-davinci models have been deprecated or had pricing increased with limited notice. Libraries that hardcode model names (Graphiti defaults `gpt-4.1-mini`) face silent quality degradation when OpenAI retires models without breaking API compatibility.

**Structured output spec stability**: The JSON schema syntax for structured outputs differs from the JSON Schema standard in subtle ways. Libraries using Pydantic-generated schemas depend on these quirks remaining stable.

## Relationship to Agent Ecosystem

OpenAI's position in the agent memory and tooling ecosystem is foundational infrastructure:

- [Graphiti](../projects/graphiti.md) defaults to OpenAI for LLM, embeddings, and reranking across all pipeline stages
- [Memori](../projects/memori.md)'s monkey-patching approach targets the OpenAI SDK first, with other providers as adapters
- [Supermemory](../projects/supermemory.md) uses OpenAI through framework wrappers
- [LangChain](../projects/langchain.md) and [LangGraph](../projects/langgraph.md) were built with OpenAI as the primary backend
- [CrewAI](../projects/crewai.md) and [Agno](../projects/agno.md) follow the same pattern

The [Model Context Protocol](../concepts/model-context-protocol.md) represents an interesting dynamic: Anthropic created MCP as a standard for tool connectivity, and Graphiti, Supermemory, and others have added MCP servers. OpenAI has its own tool-call format that predates MCP. Whether MCP displaces OpenAI's tool format as the ecosystem standard is an open question.

[OpenAI Codex](../projects/openai-codex.md) competes directly with [Claude Code](../projects/claude-code.md) (Anthropic), [Cursor](../projects/cursor.md), and [Windsurf](../projects/windsurf.md) as a coding agent product. This positions OpenAI as competing against tools that are also built on top of OpenAI's own API — a structural tension in the platform strategy.

## Alternatives

**Use [Anthropic](../projects/anthropic.md) / Claude** when long context reliability matters (200k tokens vs 128k), when structured output compliance is critical (Claude 3.5 Sonnet has competitive structured output performance), or when Anthropic's safety constraints better match deployment requirements.

**Use [Google Gemini](../projects/google-gemini.md)** when multimodal processing at scale is the primary use case, or for Google Cloud infrastructure integration.

**Use [DeepSeek](../projects/deepseek.md)** for cost reduction (significantly cheaper per token for comparable tasks on many benchmarks) or for deployments where the OpenAI-compatible API format matters but model provenance does not.

**Use [Ollama](../projects/ollama.md) or [vLLM](../projects/vllm.md)** for local inference, data privacy, or cost reduction at volume.

**Use [OpenRouter](../projects/openrouter.md)** when routing between multiple providers dynamically or testing model switching without committing to a single provider's SDK.


## Related

- [Claude Code](../projects/claude-code.md) — competes_with (0.5)
- [Anthropic](../projects/anthropic.md) — competes_with (0.9)
- [Claude](../projects/claude.md) — competes_with (0.9)
- [Model Context Protocol](../concepts/mcp.md) — implements (0.5)
- [OpenAI Codex](../projects/codex.md) — created_by (1.0)
- [Cursor](../projects/cursor.md) — alternative_to (0.5)
- [Google Gemini](../projects/gemini.md) — competes_with (0.8)
- [Mem0](../projects/mem0.md) — alternative_to (0.4)
- [LangChain](../projects/langchain.md) — alternative_to (0.4)
- [LangGraph](../projects/langgraph.md) — alternative_to (0.4)
- [Windsurf](../projects/windsurf.md) — alternative_to (0.4)
- [Self-Improving Agents](../concepts/self-improving-agents.md) — implements (0.4)
- [CrewAI](../projects/crewai.md) — alternative_to (0.3)
- [vLLM](../projects/vllm.md) — alternative_to (0.3)
- [Ollama](../projects/ollama.md) — alternative_to (0.3)
- [Neo4j](../projects/neo4j.md) — implements (0.3)
- [Qdrant](../projects/qdrant.md) — implements (0.3)
- [pgvector](../projects/pgvector.md) — implements (0.3)
- [A-MEM](../projects/a-mem.md) — alternative_to (0.3)
- [OpenRouter](../projects/openrouter.md) — alternative_to (0.3)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.3)
- [LoCoMo](../projects/locomo.md) — implements (0.3)
- [OpenClaw](../projects/openclaw.md) — alternative_to (0.3)
- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.4)
- [Model Context Protocol](../concepts/mcp.md) — alternative_to (0.4)
- [DeepSeek](../projects/deepseek.md) — competes_with (0.7)
- [Lilian Weng](../concepts/lilian-weng.md) — part_of (0.7)

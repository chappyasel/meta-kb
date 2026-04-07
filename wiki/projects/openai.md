---
entity_id: openai
type: project
bucket: agent-systems
abstract: >-
  OpenAI builds large language models (GPT-4, o-series), developer APIs, and
  agent infrastructure (Agents SDK, Codex, GitHub Copilot) that form the
  dominant foundation for production LLM applications.
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/memodb-io-acontext.md
  - repos/memorilabs-memori.md
  - repos/greyhaven-ai-autocontext.md
  - repos/topoteretes-cognee.md
  - repos/caviraoss-openmemory.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/memvid-memvid.md
  - repos/evoagentx-evoagentx.md
  - repos/mem0ai-mem0.md
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/getzep-graphiti.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/mem0ai-mem0.md
related:
  - anthropic
  - mcp
  - claude
  - mem0
  - openclaw
  - locomo
  - ollama
  - gemini
  - cursor
  - langchain
  - knowledge-graph
  - langgraph
  - vllm
  - neo4j
  - faiss
  - pinecone
  - entity-extraction
  - github-copilot
  - claude-code
  - episodic-memory
  - agent-skills
  - semantic-memory
  - codex
  - graphrag
  - context-engineering
  - progressive-disclosure
  - vector-database
  - zep
  - gepa
  - postgresql
  - pydantic
  - crewai
  - qdrant
  - redis
  - skill-md
  - deepseek
  - synthetic-data-generation
  - memory-evolution
  - memorybank
last_compiled: '2026-04-07T11:35:31.772Z'
---
# OpenAI

## What It Is

OpenAI is an AI research company and API provider whose models, tooling, and infrastructure underpin a substantial portion of the agent and knowledge-base ecosystem described in this wiki. Its core offerings split into three buckets: frontier models (GPT-4, GPT-4o, o1, o3, o4-mini), developer APIs (Chat Completions, Responses API, Embeddings, Structured Outputs), and agent-layer products (Agents SDK, [OpenAI Codex](../projects/codex.md), [GitHub Copilot](../projects/github-copilot.md)).

Nearly every project in this wiki either depends on OpenAI APIs, benchmarks against them, or explicitly positions itself as an alternative. [Graphiti](../projects/graphiti.md) defaults to `gpt-4.1-mini` for graph construction and `gpt-4.1-nano` for lighter prompts. [Mem0](../projects/mem0.md), [Memori](../projects/mem0.md), [Supermemory](../projects/supermemory.md), [Acontext](../projects/openclaw.md), and [Autocontext](../projects/autoresearch.md) all use OpenAI as their default LLM and embedding provider. [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), [CrewAI](../projects/crewai.md), and [DSPy](../projects/dspy.md) treat OpenAI models as their primary integration target.

## Core Products Relevant to This Space

### GPT-4 / GPT-4o / o-series

The model family that most benchmarks in this wiki assume. When a system reports accuracy on [LongMemEval](../projects/longmemeval.md), [LoCoMo](../projects/locomo.md), or [SWE-bench](../projects/swe-bench.md), GPT-4 or GPT-4o is almost always the evaluation model. Supermemory's #1 ranking on LongMemEval and LoCoMo, Graphiti's 98.2% on Deep Memory Retrieval, and Memori's 81.95% on LoCoMo all used GPT-4o or GPT-4o-mini as the backbone. These are self-reported results on their respective evaluations, not independent third-party audits.

The o-series (o1, o3, o4-mini) added extended chain-of-thought reasoning, which made them relevant for [agentic RAG](../concepts/agentic-rag.md) and multi-step [task decomposition](../concepts/task-decomposition.md) scenarios where intermediate reasoning steps matter.

### Structured Outputs / Pydantic Integration

OpenAI's Structured Outputs API enforces JSON schema compliance on model responses. This became load-bearing infrastructure for the agent memory space. Graphiti's entire pipeline (entity extraction, edge extraction, deduplication, contradiction detection) relies on Pydantic response models validated through OpenAI's structured output layer. [LangChain](../projects/langchain.md) and [CrewAI](../projects/crewai.md) both use it for typed tool-call returns. Projects that require this feature cannot straightforwardly swap to providers that do not support it.

### Embeddings API (`text-embedding-3-small`, `text-embedding-3-large`)

The default embedding provider for most vector-based retrieval in this ecosystem. [FAISS](../projects/faiss.md), [Pinecone](../projects/pinecone.md), [Qdrant](../projects/qdrant.md), and [ChromaDB](../projects/chromadb.md) integrations typically default to OpenAI embeddings. Graphiti uses 1024-dimensional embeddings for entity nodes. Acontext's pgvector extension stores OpenAI embeddings for skill retrieval. The Embeddings API is the infrastructure assumption that few projects document explicitly — it runs under the hood of most semantic search in this space.

### OpenAI Agents SDK

Released in 2025, the Agents SDK provides a Python framework for building multi-agent workflows with tool use, handoffs between agents, and built-in tracing. It competes directly with [LangGraph](../projects/langgraph.md), [CrewAI](../projects/crewai.md), and [AutoResearch](../projects/autoresearch.md) at the orchestration layer. Autocontext's ecosystem mode includes `--provider-b agent_sdk` for A/B comparison against Anthropic.

The SDK includes:
- `Agent` class with system prompt, tools, and handoff definitions
- `Runner.run()` for executing agent loops
- Built-in tracing to the OpenAI dashboard
- `Guardrails` for input/output validation

It does not include persistent memory by default — that gap is what [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), [Graphiti](../projects/graphiti.md), and others fill.

### Responses API

A newer API surface alongside Chat Completions that enables stateful multi-turn interactions and built-in tool use (web search, code interpreter, file search). The Responses API is what several agent frameworks use as their execution backend. Memori's recall injection handles the Responses API's `instructions` field separately from the Chat Completions `messages` array.

### OpenAI Codex

[OpenAI Codex](../projects/codex.md) is OpenAI's code-generation model and CLI agent, operating autonomously on software engineering tasks in a sandboxed environment. It competes with [Claude Code](../projects/claude-code.md) and [GitHub Copilot](../projects/github-copilot.md) at the code-agent layer. Codex is distinct from the original Codex model (which powered early Copilot) — the 2025 version is a full agentic system with filesystem access, test execution, and multi-step planning.

### GitHub Copilot

[GitHub Copilot](../projects/github-copilot.md), built on OpenAI models, is OpenAI's primary deployed product for developer tooling. It operates inside VS Code, JetBrains IDEs, and GitHub's web interface. Copilot's [Skill Files](../concepts/skill-md.md) and workspace context features are architectural cousins to the agent memory patterns described throughout this wiki.

## Key Numbers

**Valuation**: ~$300B (as of early 2025, self-reported in funding rounds — not independently audited).

**API usage**: OpenAI does not publish MAU or API call volume publicly. Adoption claims come from partnership announcements and customer case studies.

**Model benchmarks**: GPT-4o scores 57.1% on [SWE-bench](../projects/swe-bench.md) Verified (as of mid-2025, self-reported on the SWE-bench leaderboard). o3 scores higher on reasoning benchmarks (AIME, MMMU) — self-reported.

**Ecosystem reach**: The number of projects in this wiki that default to OpenAI APIs without configuration change: approximately 80%. That's not a published figure — it's an observation from the source material in this analysis.

## Architectural Role in the Agent Memory Ecosystem

OpenAI occupies three distinct roles:

**1. Foundation model provider**: The LLM that memory systems extract facts from, inject context into, and use as judge. When Graphiti's bi-temporal edge invalidation says "contradicted facts have `expired_at` set," the LLM making that contradiction judgment is almost always GPT-4o or gpt-4.1-mini.

**2. Embedding infrastructure**: The vector representations that power semantic search in [FAISS](../projects/faiss.md), [Qdrant](../projects/qdrant.md), and [Pinecone](../projects/pinecone.md) typically come from OpenAI's embedding models. Systems like Memori achieve 81.95% accuracy on LoCoMo partly because OpenAI embeddings are high quality for English conversational text.

**3. Agent orchestration layer**: With the Agents SDK, OpenAI now competes with the frameworks that were built on top of its APIs. [LangGraph](../projects/langgraph.md) and [CrewAI](../projects/crewai.md) provide richer graph-based orchestration; the Agents SDK provides simpler, tighter integration with OpenAI's own tracing and tooling.

## Strengths

**Structured Outputs reliability**: The Pydantic/JSON schema enforcement is more reliable across edge cases than most alternatives. Agent memory pipelines that require typed extraction (entity types, temporal bounds, relation types) depend on this working consistently.

**API stability and documentation**: The Chat Completions and Embeddings APIs have maintained backward compatibility long enough that most of the ecosystem builds against them as a stable interface. The `openai` Python SDK is the de facto standard that other providers clone (`OpenAI-compatible` base URL is a common configuration option across vLLM, Ollama, and OpenRouter).

**Ecosystem lock-in as a feature**: The breadth of integrations means OpenAI-compatible infrastructure (LangChain wrappers, Pydantic validators, tracing integrations) works out of the box. For teams building quickly, this reduces integration time.

**Model capability at the frontier**: As of mid-2025, o3 and GPT-4o lead or near-lead most multi-step reasoning benchmarks (self-reported and partially validated on public leaderboards like MMLU, GPQA, SWE-bench).

## Critical Limitations

**Concrete failure mode — rate limits compound in agent pipelines**: Graphiti's `SEMAPHORE_LIMIT = 10` default and Autocontext's 5-agent-per-generation architecture both exist specifically because OpenAI's rate limits create bottlenecks. A Graphiti `add_episode()` call makes 4-5 LLM calls; community updates add more. At scale, 429 errors are not edge cases — they are a primary operational concern. The Graphiti documentation explicitly warns to adjust `max_coroutines` based on provider throughput capacity.

**Unspoken infrastructure assumption — embedding model lock-in**: Projects that store OpenAI embeddings in vector databases cannot switch embedding providers without re-embedding their entire corpus. This dependency is rarely stated explicitly. When Acontext stores pgvector embeddings or Memori stores fact embeddings, those vectors are tied to a specific OpenAI embedding model. Changing models (e.g., from `text-embedding-ada-002` to `text-embedding-3-large`) invalidates all existing vectors. No project in this wiki documents a migration path for this.

## When NOT to Use OpenAI APIs

**Air-gapped or data-residency-constrained environments**: OpenAI has no on-premise deployment option. For healthcare, finance, or government workloads that cannot send data to external APIs, [Ollama](../projects/ollama.md) with local models or [vLLM](../projects/vllm.md) for self-hosted inference are the alternatives.

**Cost-sensitive high-volume memory pipelines**: Graphiti estimates 30-55 LLM calls per session learning cycle for Acontext. At GPT-4.1 pricing, that costs $0.10-0.30 per session. For applications with millions of sessions, this becomes prohibitive. Autocontext's frontier-to-local distillation exists specifically to address this — learn with GPT-4 models, run production on cheaper local models.

**When you need truly open weights for fine-tuning control**: OpenAI's fine-tuning API allows some customization, but access to weights is not available. [DeepSeek](../projects/deepseek.md) and open-weight models on [Ollama](../projects/ollama.md) give full control over the training process. [Synthetic Data Generation](../concepts/synthetic-data-generation.md) pipelines that need to train specialized models for memory extraction or entity resolution benefit from open weights.

**When latency below ~200ms matters**: OpenAI's API latency for GPT-4o averages 500ms-2s depending on load. Graphiti reports 3.2s total with Zep memory retrieval vs 31.3s full-context baseline — but that 3.2s includes the OpenAI call. For real-time applications (voice agents, latency-sensitive UX), this may be unacceptable. Local inference with quantized models trades quality for speed.

## Unresolved Questions

**Governance and safety vs capability tradeoff**: OpenAI has repeatedly modified model behavior through RLHF and policy changes post-deployment. Projects that hardcode prompts against GPT-4 behavior may break when models are updated. Neither OpenAI's API versioning policy nor the specific details of mid-generation model updates are documented clearly enough for production reliability planning.

**Cost at scale for agentic workflows**: OpenAI publishes per-token pricing but not volume discounts below enterprise agreements. The true cost of running a Graphiti-style pipeline at 10M episodes/month or an Autocontext harness across thousands of concurrent runs is not publicly calculable without enterprise negotiation.

**Structured Outputs schema conflict resolution**: When a Pydantic schema and an OpenAI model disagree — the model wants to return a value that does not fit the schema — the behavior is to refuse or hallucinate a valid-but-wrong value. The failure mode is subtle: the JSON validates but carries incorrect content. No official documentation explains how often this occurs or how to detect it in production.

**Long-term API compatibility**: OpenAI has deprecated models (davinci, code-davinci-002, the original Codex) with varying notice periods. Projects built on specific model behaviors (e.g., Graphiti's entity extraction prompts tuned for gpt-4.1-mini) may degrade silently when models are updated in place without version changes.

## Alternatives and Selection Guidance

**Use [Anthropic](../projects/anthropic.md)/[Claude](../projects/claude.md)** when you need longer reliable context windows, more consistent instruction-following on complex structured prompts, or when Claude's specific refusal behaviors are less problematic for your use case. Claude 3.5 Sonnet is the default for Acontext's dual-backend support and [Claude Code](../projects/claude-code.md).

**Use [DeepSeek](../projects/deepseek.md)** when cost is the primary constraint and your workload is primarily text (not multimodal). DeepSeek V3 offers GPT-4-class performance at a fraction of the cost for many reasoning benchmarks.

**Use [Ollama](../projects/ollama.md) or [vLLM](../projects/vllm.md)** when data privacy, air-gapped deployment, or weight-level control is required. Both provide OpenAI-compatible APIs that let you swap the base URL without code changes in most frameworks.

**Use [Gemini](../projects/gemini.md)** when you need Google ecosystem integration (Workspace, Drive, Docs) or when the 2M-token context window of Gemini 1.5 Pro is relevant for long-document processing.

**Use [LiteLLM](../projects/litellm.md)** as a routing layer when you want to use multiple providers behind a single OpenAI-compatible interface — load balancing, fallbacks, and cost routing without changing application code.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — most context engineering practice assumes OpenAI model behavior
- [Prompt Engineering](../concepts/prompt-engineering.md) — OpenAI's prompt guides shaped the field's defaults
- Structured Outputs / Pydantic — the typed extraction layer that OpenAI's API enables
- [Vector Database](../concepts/vector-database.md) — the storage layer for OpenAI embeddings
- [Agent Skills](../concepts/agent-skills.md) — the knowledge artifacts that OpenAI-backed agents learn and execute
- [Chain-of-Thought](../concepts/chain-of-thought.md) — popularized through GPT-3/4 research
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — RLHF is the training technique behind GPT-4's alignment
- [Model Context Protocol](../concepts/mcp.md) — OpenAI's Agents SDK supports MCP for tool integration alongside Anthropic's standard

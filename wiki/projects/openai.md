---
entity_id: openai
type: project
bucket: agent-systems
abstract: >-
  OpenAI builds frontier AI models (GPT-4o, o3, Codex) and developer tooling
  (Assistants API, Responses API, Realtime API) that function as the primary
  infrastructure layer for most commercial LLM applications and agent systems.
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/memodb-io-acontext.md
  - repos/greyhaven-ai-autocontext.md
  - repos/letta-ai-letta-code.md
  - repos/evoagentx-evoagentx.md
  - repos/caviraoss-openmemory.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/agent-on-the-fly-memento.md
  - repos/mem0ai-mem0.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/volcengine-openviking.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/mem0ai-mem0.md
related:
  - anthropic
  - gemini
  - claude
  - rag
  - mcp
  - vllm
  - mem0
  - ollama
  - cursor
  - episodic-memory
  - openclaw
  - langchain
  - litellm
  - qdrant
  - neo4j
  - pgvector
  - pinecone
  - locomo-bench
  - claude-code
last_compiled: '2026-04-06T01:57:01.224Z'
---
# OpenAI

## What It Is

OpenAI is an AI research company and API provider that trains large language models and ships developer infrastructure for building AI-powered applications and agents. Founded in 2015 as a nonprofit, it restructured as a "capped-profit" company in 2019 and completed a full conversion to a public benefit corporation in 2025.

Its product line spans three tiers: frontier models (GPT-4o, o1, o3, o4-mini), specialized models ([OpenAI Codex](../projects/openai-codex.md), Whisper, DALL-E, Sora), and developer APIs (Responses API, Assistants API, Realtime API, Batch API). For the LLM knowledge base and agent space, the Responses API and its native tool support are the primary interfaces.

## Architecture of the Developer Platform

### Responses API (2025)

The Responses API replaced the Assistants API as OpenAI's primary agentic interface. It natively supports:

- **Web search tool**: Real-time web retrieval via Bing, returning citations and ranked results
- **File search tool**: [RAG](../concepts/rag.md) over uploaded files using a managed vector store (chunking, embedding, retrieval handled server-side)
- **Computer use tool**: Browser and desktop automation via screenshot observation and action sequences
- **Function calling / custom tools**: Structured JSON schema-based tool calls with parallel execution support
- **Code interpreter**: Sandboxed Python execution with file I/O

The API maintains conversation state server-side via `previous_response_id`, eliminating the need to resend full message history on each turn. This is architecturally significant for long-running agent loops where context would otherwise grow to fill the window.

### Realtime API

WebSocket-based streaming for voice and text with sub-second latency. Supports function calling mid-stream and audio input/output. The primary use case is voice agents where round-trip latency through a REST API would be perceptible.

### File Search (Managed RAG)

OpenAI's file search tool runs server-side [hybrid retrieval](../concepts/hybrid-retrieval.md): vector similarity plus keyword matching, with automatic re-ranking. Developers upload files to a Vector Store object, attach it to a model or assistant, and the model queries it via tool call. This abstracts away embedding model choice, chunking strategy, and index management. The tradeoff: no control over the retrieval pipeline, no visibility into chunk boundaries, no ability to plug in custom re-rankers.

### Model Context Protocol Support

OpenAI's Responses API accepts [Model Context Protocol](../concepts/mcp.md) server configurations, allowing remote tool discovery. This positions OpenAI as a consumer of the MCP ecosystem rather than a standalone tool provider.

## Models Relevant to Agent Systems

| Model | Context Window | Key Use |
|-------|---------------|---------|
| GPT-4.1 | 1M tokens | Long-context agent loops, large codebase analysis |
| GPT-4.1-mini | 1M tokens | Cost-optimized agentic tasks |
| GPT-4.1-nano | 1M tokens | High-volume preprocessing, classification |
| o3 | 200K tokens | Multi-step reasoning, planning |
| o4-mini | 200K tokens | Reasoning at lower cost |
| GPT-4o | 128K tokens | General purpose, vision |

The o-series models run extended internal [chain-of-thought](../concepts/chain-of-thought.md) before responding. They consume significantly more tokens and take longer per call than the GPT-4.x series, but outperform on tasks requiring multi-step planning, mathematical reasoning, and code verification. o3 and o4-mini support tool use and vision.

GPT-4.1 (1M token context) shifts cost calculations for agent memory. With a 1M token window, many applications that previously needed a vector database can simply load documents directly. The tradeoff is per-token cost: at high request volume, managed retrieval is cheaper than stuffing full context.

## Key Numbers

- **Valuation**: ~$300B (2025, self-reported from funding rounds)
- **GPT-4o SWE-bench score**: ~38% on [SWE-Bench](../projects/swe-bench.md) verified (independently reported by third parties, consistent with OpenAI's claims)
- **o3 AIME 2024**: 96.7% (self-reported)
- **API revenue**: ~$4B annualized run rate (reported by Bloomberg, 2024)
- **Assistants API deprecation**: announced March 2025, sunset January 2026

The benchmark numbers on reasoning tasks (AIME, GPQA, SWE-bench) are largely self-reported but reproducible by third parties. The SWE-bench numbers in particular have been independently validated by the benchmark maintainers.

## Strengths

**Ecosystem depth**: More third-party tooling, tutorials, and production deployments integrate with OpenAI APIs than any other provider. [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), [LiteLLM](../projects/litellm.md), [LlamaIndex](../projects/llamaindex.md), and most agent frameworks treat OpenAI as the primary target and test against it first.

**Function calling reliability**: The structured output mode (JSON schema enforcement via constrained decoding) is among the most reliable implementations available. Pydantic-based parsing with schema validation works with minimal workarounds.

**Managed agentic primitives**: The Responses API's built-in tools (file search, web search, computer use) remove infrastructure burden for common agent patterns. Teams without dedicated ML engineering can ship [RAG](../concepts/rag.md) applications without managing embedding pipelines.

**Realtime voice**: The Realtime API remains the easiest path to production voice agents. Competitors have comparable models but less mature streaming infrastructure.

## Critical Limitations

**Concrete failure mode**: The Assistants API had persistent reliability issues with run state management (stuck `in_progress` runs, lost tool call results) that were never fully resolved before deprecation. The Responses API server-side state management via `previous_response_id` inherits similar opacity: if a request fails mid-conversation, reconstructing state requires re-sending history, defeating the purpose of server-side state. There is no API for inspecting or repairing orphaned conversation state.

**Unspoken infrastructure assumption**: The file search vector store assumes you want OpenAI to manage your retrieval infrastructure. Organizations with compliance requirements (data residency, audit logging of what data was retrieved and when) cannot use managed file search because OpenAI provides no retrieval audit log. You get a tool call result, not a trace of which chunks matched which query.

## When NOT to Use It

**Regulated data environments**: HIPAA, GDPR-strict, or FedRAMP contexts where data cannot leave a controlled perimeter. OpenAI offers a limited enterprise agreement with data retention controls, but the audit capabilities are insufficient for many regulated workloads. [Ollama](../projects/ollama.md) with local models or [vLLM](../projects/vllm.md) with self-hosted inference are the correct choices here.

**Cost-sensitive high-volume retrieval**: If your use case sends millions of short queries per day, GPT-4.1-mini or o4-mini costs will dominate. Consider [LiteLLM](../projects/litellm.md) as a routing layer to cheaper providers for high-volume, lower-complexity subtasks.

**Graph-structured memory**: OpenAI's file search is vector-only with no graph traversal. Applications requiring temporal fact tracking, entity relationship queries, or knowledge that updates frequently need [Graphiti](../projects/graphiti.md), [Zep](../projects/zep.md), or [Neo4j](../concepts/knowledge-graph.md)-backed systems. File search will not tell you "what did we believe about Alice's employer in January vs now."

**Custom retrieval pipelines**: If you need control over chunking strategy, re-ranking algorithms, or retrieval scoring, managed file search is the wrong abstraction. [Qdrant](../projects/qdrant.md) or [Pinecone](../projects/pinecone.md) with a custom embedding pipeline give you that control.

**Long-horizon autonomous agents**: OpenAI's tooling optimizes for single-session agentic tasks. Agents that need to learn across sessions, update procedural knowledge, or maintain [episodic memory](../concepts/episodic-memory.md) across runs require external memory systems. The Responses API has no built-in memory persistence beyond the current conversation thread.

## Unresolved Questions

**Governance post-restructuring**: The 2025 conversion to public benefit corporation removed the nonprofit's oversight role. The board composition and decision-making process for safety-vs-capability tradeoffs are not publicly documented. It is unclear what governance mechanism prevents future capability releases that the prior board might have delayed.

**Cost at scale for o-series**: o3's reasoning token consumption is not predictable per query. A query that triggers long internal chain-of-thought can cost 10-50x more than a simple query. There is no API parameter to cap reasoning token spend, making cost estimation for production deployments of o-series models unreliable.

**File search index freshness**: The documentation does not specify how quickly file updates propagate to the search index, or whether there is eventual consistency lag between uploading a file and that file becoming searchable. For applications with frequent document updates, this latency is undocumented.

**Rate limit negotiation**: Enterprise rate limits are negotiated individually with OpenAI's sales team. Published tier limits are low enough that most serious production deployments require custom agreements. The process and timeline for this negotiation are opaque.

## Alternatives with Selection Guidance

| Use Case | Alternative | Reason |
|----------|-------------|--------|
| Cost-competitive reasoning | [Claude](../projects/claude.md) (Anthropic) | Claude 3.5 Sonnet and Claude 3.7 Sonnet are price-competitive with GPT-4o and outperform on long-context tasks and instruction following |
| Self-hosted inference | [vLLM](../projects/vllm.md) + open weights | Full control, no data egress, cost scales with compute not per-token pricing |
| Local development | [Ollama](../projects/ollama.md) | Run Llama 3, Mistral, or Qwen locally without API calls |
| Structured agent memory | [Mem0](../projects/mem0.md) | Managed memory layer with user-scoped fact extraction across sessions |
| Graph-structured memory | [Graphiti](../projects/graphiti.md) | Bi-temporal knowledge graph with entity tracking and contradiction handling |
| Multi-provider routing | [LiteLLM](../projects/litellm.md) | Route to cheapest available provider per task type, fallback handling, unified logging |
| Agent orchestration | [LangGraph](../projects/langgraph.md) | Stateful multi-agent workflows with checkpointing, not tied to OpenAI |
| Multimodal + competitive pricing | [Gemini](../projects/gemini.md) | Gemini 1.5 Pro has a 2M token context and competitive pricing for vision tasks |

## Position in the Agent Stack

OpenAI functions as the **inference layer** in most agent architectures, not the memory or orchestration layer. The typical production stack pairs OpenAI APIs with external memory ([Mem0](../projects/mem0.md), [Graphiti](../projects/graphiti.md), [Zep](../projects/zep.md)), external orchestration ([LangGraph](../projects/langgraph.md), [CrewAI](../projects/crewai.md)), and retrieval infrastructure ([Qdrant](../projects/qdrant.md), [Pinecone](../projects/pinecone.md)).

The Responses API's managed tools (file search, web search) are appropriate for teams that want to ship quickly and do not need retrieval customization. Teams with production-grade requirements on retrieval quality, cost, or compliance should treat OpenAI as the LLM provider and own the surrounding infrastructure.

[Claude Code](../projects/claude-code.md) and [Cursor](../projects/cursor.md) (which uses OpenAI models among others) represent the competitive frontier on AI-assisted development, where [OpenAI Codex](../projects/openai-codex.md) pioneered the category but lost ground to [Anthropic](../projects/anthropic.md)'s coding-focused model releases.

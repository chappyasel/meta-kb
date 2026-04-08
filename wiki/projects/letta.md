---
entity_id: letta
type: project
bucket: agent-memory
abstract: >-
  Letta (formerly MemGPT) is a stateful agent platform where memory blocks live
  directly in the LLM prompt and agents self-modify them via tool calls — the
  only major framework treating memory as an explicit agent capability rather
  than an external system.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - repos/mirix-ai-mirix.md
  - repos/letta-ai-letta-code.md
  - repos/letta-ai-letta.md
  - repos/letta-ai-lettabot.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - retrieval-augmented-generation
  - episodic-memory
  - memgpt
  - semantic-memory
  - agent-skills
  - graphiti
  - multi-agent-systems
  - letta-api
  - agent-skills
  - graphiti
  - letta-api
last_compiled: '2026-04-08T02:46:02.080Z'
---
# Letta

**Type:** Project — Agent Memory / Agent Framework
**Repository:** [letta-ai/letta](https://github.com/letta-ai/letta)
**Also known as:** MemGPT (prior name)
**License:** Apache-2.0

## What It Does

Letta is a stateful agent platform built around a single architectural bet: memory should be part of the LLM prompt that the agent can explicitly read and rewrite, not an external system the framework manages behind the scenes. Every Letta agent maintains named text blocks (e.g., `human`, `persona`) that are compiled into the system prompt before each LLM call. The agent receives tools — `core_memory_replace`, `rethink_memory`, `archival_memory_insert` — to modify those blocks mid-conversation. This makes memory management a first-class agent capability.

Letta is not just a memory library. It ships a FastAPI REST server, multi-agent orchestration patterns, tool execution infrastructure, MCP integration, and deployment tooling. The [MemGPT](../projects/memgpt.md) paper (arXiv:2310.08560) established the original framing: LLMs as operating systems, context windows as RAM, external storage as disk. Letta is the production evolution of that idea.

## Core Architecture

### Memory Blocks

The `Memory` class (`letta/schemas/memory.py`) holds a list of `Block` objects (`letta/schemas/block.py`). Each block carries a label, a text value, a character limit, and a read-only flag. The `Memory.compile()` method renders these into XML-structured text injected into the system prompt:

```xml
<memory_blocks>
  <human>
    <metadata>chars_current=142, chars_limit=5000</metadata>
    <value>The user's name is Alice. She prefers dark mode.</value>
  </human>
  <persona>
    <metadata>chars_current=89, chars_limit=5000</metadata>
    <value>I am a helpful assistant that remembers user preferences.</value>
  </persona>
</memory_blocks>
```

Blocks persist in PostgreSQL (via SQLAlchemy in `letta/orm/`). Multiple agents can reference the same block by ID, enabling shared memory across agent teams. Developers can inspect and overwrite block values directly via the API, making the agent's entire learned state visible and editable.

### Three-Tier Memory Model

**[Core Memory](../concepts/core-memory.md)** — editable blocks in the active system prompt. The agent's working memory, bounded by character limits per block.

**Recall Memory** — complete conversation history persisted to the database, searchable via `conversation_search(query, roles, start_date, end_date)`. Letta maintains one continuous message thread per agent, growing monotonically with summarization as the only compaction mechanism.

**[Archival Memory](../concepts/long-term-memory.md)** — passage-based vector storage. The agent writes to it with `archival_memory_insert` and retrieves with `archival_memory_search(query, tags, top_k)`. Retrieval is not automatic; the agent must decide to search.

### Self-Modifying Memory Tools

Defined in `letta/functions/function_sets/base.py`:

- `core_memory_replace(label, old_content, new_content)` — exact string replacement. Raises `ValueError` if `old_content` is absent, forcing precision.
- `core_memory_append(label, content)` — appends with a newline separator.
- `rethink_memory(new_memory, target_block_label)` — wholesale block rewrite. The nuclear option for reorganizing fragmented blocks.
- `memory(command, path, ...)` — multi-command tool for git-backed memory: create, str_replace, insert at line number, delete, rename. Provides versioning and rollback for memory state.
- `archival_memory_insert(content, tags)` — stores to long-term vector storage.
- `archival_memory_search(query, tags, top_k)` — semantic search over archival memory.
- `conversation_search(query, roles, limit, start_date, end_date)` — hybrid search over conversation history.

### Agent Loop

A call to `LettaAgent.step()` follows this path:

1. Load recent messages from the database
2. Call `_rebuild_memory_async` — refresh blocks from DB, compile into system prompt
3. LLM call with tool schemas in context
4. If tool call returned: execute tool, update block or archival storage, loop back to step 3
5. If `send_message` returned: write response to user, persist messages
6. Check context window usage; trigger summarization if above 90% (`SUMMARIZATION_TRIGGER_MULTIPLIER = 0.9`)

Maximum steps per request defaults to `DEFAULT_MAX_STEPS = 50`. Every memory modification requires a full LLM call because the agent reasons about what to change. A single user message commonly triggers 3–5 LLM calls.

### Summarization

Two modes controlled by `Summarizer` (`letta/services/summarizer/`):

- `STATIC_MESSAGE_BUFFER` — maintains a fixed buffer of recent messages. Older messages are evicted; a background `EphemeralSummaryAgent` summarizes them and writes the summary to a `conversation_summary` block.
- `PARTIAL_EVICT_MESSAGE_BUFFER` — evicts 30% of messages synchronously and inserts a compressed summary at index 1 of the message list. Blocks the current response but preserves more context.

### Sleeptime Agents

`SleeptimeMultiAgent` (`letta/groups/sleeptime_multi_agent.py`) runs a background agent that consolidates the primary agent's memory during idle periods. The primary agent handles real-time conversation and lacks tools to modify core memory directly. After every N messages (`sleeptime_agent_frequency`), a background task spawns the sleep-time agent with a recent transcript. That agent has exclusive write access to both its own and the primary agent's memory blocks. It reorganizes, consolidates, and extracts facts without blocking user interaction.

Sleep-time compute is the mechanism Letta uses to avoid the cost of memory management during active conversation. Stronger models are recommended for the sleep-time agent since it runs without latency constraints.

### Multi-Agent Coordination

Five built-in orchestration patterns in `letta/groups/`:

- `RoundRobinMultiAgent` — sequential task distribution
- `SupervisorMultiAgent` — tag-based routing under centralized control
- `SleeptimeMultiAgent` — background consolidation (described above)
- `DynamicMultiAgent` — supervisor-selected routing
- Producer-reviewer — iterative refinement cycles

Communication tools: `send_message_to_agent_async` (fire-and-forget), `send_message_to_agent_and_wait_for_reply` (blocking), `send_message_to_agents_matching_all_tags` (broadcast). Shared memory blocks are the primary mechanism for persistent cross-agent state — multiple agents read and write the same block by ID.

## Key Numbers

- GitHub stars: not specified in sources; codebase is described as 200+ source files
- DMR benchmark (MemGPT baseline): 93.4% accuracy — cited in the Zep paper [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md), independently reported (not self-reported by Letta)
- Context window: default 128K tokens; summarization triggers at 90% of limit
- LLM providers: 17+ (OpenAI, Anthropic, Ollama, Google AI, Azure, Groq, Together, vLLM, AWS Bedrock, DeepSeek, xAI, and others)
- Archival memory: default chunk size 300 chars, embedding dim 1024

The DMR accuracy figure (93.4%) comes from an independent benchmark run by the Zep team, not from Letta's own documentation, making it more credible than self-reported metrics.

## Strengths

**Memory as an explicit agent capability.** Unlike [mem0](../projects/mem0.md) (automatic extraction) or [Graphiti](../projects/graphiti.md) (automatic graph construction), Letta delegates all memory decisions to the agent. The agent sees its own memory, reasons about it, and edits it. This makes the memory system transparent and gives the agent real ownership of what it knows.

**Full platform, not a library.** REST API, MCP integration, multi-agent orchestration, tool execution, deployment tooling, and SDKs for Python and TypeScript ship together. Teams building production agents get infrastructure rather than components to assemble.

**Inspectable and externally editable state.** Because all memory is text blocks in a database, developers can read and overwrite any agent's memory via the API. The Agent Development Environment (ADE) provides visual inspection. There are no hidden embeddings or opaque graph state.

**Sleeptime compute for quality without latency.** Background memory consolidation separates the fast path (real-time conversation) from the expensive path (memory reorganization). The primary agent never waits for memory operations.

**Model-agnostic by design.** The tool interface works across all major providers. Provider adapters in the codebase handle streaming, tool calling, and structured output differences.

## Critical Limitations

**Concrete failure mode — block fragmentation.** Repeated `core_memory_append` calls accumulate stale information in blocks without automatic cleanup. The agent must proactively call `rethink_memory` to reorganize. Weak models fail to maintain block hygiene, resulting in blocks that grow to their character limit with redundant or contradictory entries. The system has no deduplication, no automatic pruning, and no information-density enforcement.

**Unspoken infrastructure assumption — Postgres and LLM call volume.** Letta assumes Postgres as its storage backend and generates 3–5 LLM calls per user message under normal operation (more with active memory management). At scale, LLM API costs scale directly with agent activity. A high-throughput deployment with many active agents can generate substantial LLM expenditure even for simple exchanges, because the agent loop requires an LLM call for each tool use.

**No structured knowledge representation.** All memory is unstructured text. There are no entities, relationships, or facts — just strings in blocks. Queries like "What is Alice's relationship to Bob?" require the agent to parse its own block text at inference time. This does not scale well as the knowledge base grows, and it means the agent cannot answer relational queries it has not explicitly written out in prose form.

**Character limits are not information limits.** Blocks enforce character budgets, not information budgets. A block can fill its 5000-character limit with low-value content while discarding high-value information that the agent decided was less important. There is no mechanism to prioritize what stays in a full block beyond the agent's own judgment.

**Archival memory is pull-only.** Relevant archival memories never automatically surface into the context window. If the agent does not search, the information stays on "disk." For agents operating in broad domains, systematically checking archival memory before every response is not guaranteed by the architecture.

## When NOT to Use Letta

**When you need structured knowledge queries.** If your application requires relational reasoning across many entities ("list all the projects Alice is connected to"), Letta's text-block architecture will become a bottleneck. Use [Graphiti](../projects/graphiti.md) or [Zep](../projects/zep.md) instead, both of which maintain entity-relationship graphs with proper query interfaces.

**When per-message LLM cost is tightly constrained.** The agent loop runs multiple LLM calls per user message by design. If you need deterministic, single-call memory retrieval at high throughput, [mem0](../projects/mem0.md) or [OpenMemory](../projects/openmemory.md) impose less overhead.

**When you only need memory, not a full agent platform.** Letta ships an entire agent runtime. If you want to add memory to an existing agent framework ([LangGraph](../projects/langgraph.md), [AutoGen](../projects/autogen.md), [CrewAI](../projects/crewai.md)), integrating Letta means adopting its agent model alongside its memory system. Memory-only libraries have lower adoption cost.

**When temporal reasoning over evolving facts is the primary challenge.** Letta stores memories as text blocks and always writes new information without structured contradiction resolution. For domains where facts change frequently and historical states matter (e.g., "what did we believe about X last month?"), Zep's bi-temporal knowledge graph architecture is better suited.

**When agent output quality strongly depends on assistant-generated content.** The DMR comparison data shows MemGPT at 93.4% accuracy on a conversational fact-retrieval benchmark. Separately, the Zep paper found that its own graph-based approach lost 17.7% accuracy on questions about assistant-generated content — a failure mode that likely applies to Letta as well, since both systems bias toward extracting user-stated facts. Applications where the agent's own prior outputs are critical context (e.g., code generation history, research summaries) face this risk.

## Unresolved Questions

**What does memory management cost in production?** The documentation describes the architecture but provides no per-message token budgets, cost estimates at scale, or empirical data on how many LLM calls typical agents actually make. The 3–5 call estimate appears in the deep analysis but is not documented by Letta.

**How often should sleeptime agents run?** The `sleeptime_agent_frequency` parameter controls how often background consolidation fires, but there is no guidance on the tradeoff between consolidation quality and token cost at different frequencies.

**What is the community refresh schedule for block organization?** The git-backed memory mode tracks changes, but there is no specification for how often the context repository should be reorganized or what triggers a full restructuring versus incremental updates.

**How does performance degrade as archival memory grows?** Archival search is embedding-based. At millions of passages, retrieval latency and quality characteristics are not documented.

**Conflict resolution across shared blocks.** Multiple agents writing to the same shared block simultaneously have no documented locking or merge strategy. The behavior under concurrent writes is not specified in the public documentation.

## Alternatives

| Alternative | Choose when |
|---|---|
| [mem0](../projects/mem0.md) | You want automatic fact extraction and lower per-message LLM cost, and do not need the agent to reason about its own memory |
| [Graphiti](../projects/graphiti.md) / [Zep](../projects/zep.md) | You need structured knowledge with entity-relationship queries, temporal reasoning over contradictory facts, or bi-temporal indexing |
| [LangGraph](../projects/langgraph.md) | You want a full agent framework with explicit state machines and prefer to wire in your own memory backend |
| [AutoGen](../projects/autogen.md) | You are building multi-agent systems and want more flexible orchestration without committing to Letta's memory model |
| [OpenMemory](../projects/openmemory.md) | You need memory as a standalone service that plugs into any agent framework |

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader category
- [Core Memory](../concepts/core-memory.md) — Letta's primary in-context memory abstraction
- [Episodic Memory](../concepts/episodic-memory.md) — Letta's recall/conversation history tier corresponds to episodic memory
- [Semantic Memory](../concepts/semantic-memory.md) — archival memory serves this function
- [Context Engineering](../concepts/context-engineering.md) — Letta's block compilation is a form of structured context assembly
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — Letta's group orchestration patterns
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — archival search is a RAG mechanism embedded within the agent
- [MemGPT](../projects/memgpt.md) — Letta's predecessor and the origin of the OS-memory analogy
- [Letta API](../projects/letta-api.md) — the REST interface for managing agents and memory programmatically
- [Graphiti](../projects/graphiti.md) — Zep/Graphiti's knowledge graph approach contrasts directly with Letta's text-block approach

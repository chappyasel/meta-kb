---
entity_id: letta
type: project
bucket: agent-memory
abstract: >-
  Letta (formerly MemGPT) is a stateful agent platform where memory blocks are
  editable text injected directly into the LLM system prompt, making memory
  management a first-class agent capability rather than an external retrieval
  system.
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
  - Retrieval-Augmented Generation
  - Episodic Memory
  - Reflexion
  - Graphiti
  - Letta Code
  - Core Memory
last_compiled: '2026-04-05T20:29:26.676Z'
---
# Letta

## What It Does

Letta is a full agent platform built around one core premise: memory should live inside the prompt where the agent can see and edit it, not in a separate system the agent queries blindly. Every agent maintains persistent `Block` objects compiled into the system prompt at each LLM call. The agent uses tool calls to rewrite those blocks across conversations, accumulating knowledge without any external memory store.

The project originated as MemGPT (arXiv:2310.08560), which framed LLMs as operating systems managing context windows the way an OS manages RAM -- paging information between an active context window and external storage. Letta is the productized evolution: a REST API server, multi-agent orchestration, Python and TypeScript SDKs, and a CLI tool called Letta Code.

[Source](../raw/deep/repos/letta-ai-letta.md) | [Source](../raw/repos/letta-ai-letta.md)

## Core Mechanism

### Memory Blocks as Editable Context

The `Memory` class in `letta/schemas/memory.py` holds a list of `Block` objects. Each block has a `label` (e.g., "human", "persona"), a `value` (plain text), and a `limit` (character count, not tokens). The `Memory.compile()` method renders all blocks into XML-structured text injected into the system prompt, including metadata showing the agent its own character counts and limits.

```xml
<memory_blocks>
<human>
<metadata>chars_current=142, chars_limit=5000</metadata>
<value>The user's name is Alice. She prefers dark mode.</value>
</human>
</memory_blocks>
```

The agent knows its own memory constraints and can act on them.

### Self-Modifying Memory Tools

Defined in `letta/functions/function_sets/base.py`, these tools let the agent rewrite its own context:

- **`core_memory_replace(label, old_content, new_content)`** -- Exact string replacement. Fails with `ValueError` if `old_content` is not found, forcing the agent to be precise.
- **`core_memory_append(label, content)`** -- Appends content. Prone to block fragmentation over time.
- **`rethink_memory(new_memory, target_block_label)`** -- Wholesale rewrite of a block. Creates the block if it doesn't exist. This is the reorganization tool that addresses fragmentation.
- **`archival_memory_insert(content, tags)`** -- Pushes content to long-term vector-searchable storage.
- **`archival_memory_search(query, tags, top_k)`** -- Semantic search over archival memory. The agent must call this explicitly -- there is no automatic retrieval.
- **`conversation_search(query, roles, limit, start_date, end_date)`** -- Hybrid search over conversation history.

### The Agent Loop

`LettaAgent.step()` follows this sequence for each user message:

1. Load message history and system prompt
2. Refresh blocks from the database (`agent_manager.refresh_memory_async`)
3. Compile blocks into the system prompt via `_rebuild_memory_async`
4. Call the LLM with tools available
5. If the LLM calls a tool: execute it, update blocks or archival storage, loop back to step 4
6. If the LLM calls `send_message`: return response to user
7. Check context window usage -- if above 90% (`SUMMARIZATION_TRIGGER_MULTIPLIER = 0.9`), trigger summarization
8. Maximum 50 steps per request (`DEFAULT_MAX_STEPS = 50`)

A single user message routinely triggers 3-5 LLM calls as the agent reads context, updates memory, searches archival storage, and formulates a response.

### Summarization

Two modes handle context window overflow. `STATIC_MESSAGE_BUFFER` evicts oldest messages and runs a background `EphemeralSummaryAgent` that writes a summary to a dedicated `conversation_summary` block. `PARTIAL_EVICT_MESSAGE_BUFFER` evicts 30% of messages synchronously and creates a recursive summary inserted as a user message. The static mode is non-blocking but the summary arrives after the current turn.

### Sleeptime Agents

`SleeptimeMultiAgent` in `letta/groups/sleeptime_multi_agent.py` runs a second agent in background threads (using `asyncio.new_event_loop()`) to consolidate memory between conversations. The primary agent handles real-time interactions without memory-editing tools. After every N messages (configurable via `sleeptime_agent_frequency`), a background task spawns the sleep-time agent with a transcript of recent messages. It reorganizes the primary agent's memory blocks and writes to shared state through the block system. This decouples memory quality from response latency.

### Multi-Agent Coordination

Agents communicate via `send_message_to_agent_async` (fire-and-forget), `send_message_to_agent_and_wait_for_reply` (blocking), and `send_message_to_agents_matching_all_tags` (broadcast). Multiple agents can reference identical `Block` objects by `block_id`, enabling collaborative knowledge building where one agent's memory edits are visible to another on its next call. Built-in orchestration patterns: round-robin, supervisor-worker, dynamic routing, sleeptime, and producer-reviewer.

## Key Numbers

- **21,873 GitHub stars, 2,312 forks** (self-reported via repository metadata)
- **DMR benchmark**: MemGPT scored 93.4% accuracy vs. Zep's 94.8% -- independently benchmarked in the Zep paper (arXiv:2501.13956). The comparison used different base models, limiting direct apples-to-apples interpretation.
- **17+ LLM providers** supported via adapter pattern
- **128K token** default context window with summarization at 90% usage
- **Default archival chunk size**: 300 characters, 1024-dimensional embeddings

[Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Strengths

**Memory is inspectable and externally editable.** Every block is individually persisted with a `block_id`. Developers can read and modify agent memory via the REST API or the Agent Development Environment (ADE) visual interface. No opaque vector stores or graph databases to debug.

**Reversible learning.** Unlike fine-tuning or RLHF, memory modifications are text edits. Bad memories can be overwritten. The agent's full "learned state" is readable as text.

**Sleeptime decouples quality from latency.** The primary agent never blocks on memory operations. The sleeptime agent can use stronger models and spend more compute on consolidation, improving memory quality without slowing conversations.

**Full platform.** REST API, SDKs, MCP integration, multi-agent orchestration, and deployment infrastructure are included. You do not need to assemble these from separate libraries.

**Model-agnostic.** Adapters cover 17+ providers. Tool interfaces are constrained to the lowest common denominator of supported models, but portability is genuine.

## Critical Limitations

**One concrete failure mode -- archival memory requires explicit retrieval.** Unlike [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) systems that automatically surface relevant context, `archival_memory_search` must be called by the agent. If the agent fails to search, relevant information stays in external storage regardless of relevance. Weaker models miss this consistently, creating a false sense of persistent memory that silently degrades on facts the agent doesn't think to look up.

**One unspoken infrastructure assumption -- PostgreSQL is mandatory.** The ORM layer in `letta/orm/` requires PostgreSQL for production deployments. SQLite works for local development but is not supported at scale. Teams expecting to drop a memory library into an existing architecture will instead be adopting a full service with a database dependency, API server, and embedding infrastructure.

**Character limits are per-block, not global.** Each block has its own limit, but no global budget exists across blocks. An agent with many blocks can overflow the context window even with every individual block under its limit.

**Memory quality degrades with model quality.** Since the agent manages its own blocks through tool calls, memory quality is directly proportional to the LLM's reasoning. Weaker models create redundant entries, fail to recognize when information should be updated, and produce fragmented blocks that grow until `rethink_memory` is called.

**No structured knowledge representation.** All memory is unstructured text strings. Relational queries ("what is Alice's relationship to Bob?") require the agent to parse its own block text. For applications requiring entity-relationship reasoning across many facts, this approach becomes unwieldy as knowledge grows. [Graphiti](../projects/graphiti.md) stores explicit entity nodes and edges; Letta stores paragraphs.

**Background sleeptime has no graceful shutdown.** Tasks run in daemon threads with independent event loops. If the main process exits mid-consolidation, work is lost silently.

## When NOT to Use Letta

**Skip Letta when you need structured relational memory.** If your application needs to answer questions like "list all users who mentioned X in the past week" or "what entities does Alice relate to?", Letta's text-block architecture forces parsing unstructured strings for every query. Use [Graphiti](../projects/graphiti.md) instead.

**Skip Letta when memory is not the central concern.** Letta is a full platform with a PostgreSQL-backed server, embedding infrastructure, and REST API. If you need lightweight memory augmentation for an existing agent system, the operational overhead is disproportionate. [mem0](../projects/mem0.md) provides automatic fact extraction with far lower infrastructure requirements.

**Skip Letta for stateless or ephemeral use cases.** Every agent maintains a perpetual message thread. For one-shot tasks or applications where conversation isolation is required, the statefulness is overhead without benefit.

**Skip Letta when per-message cost is tightly constrained.** The agent loop generates 3-5 LLM calls per user message for memory-active sessions. At high volume, this cost multiplier is significant.

## Unresolved Questions

**Memory consolidation quality is unvalidated.** The documentation claims sleeptime agents produce "clean, concise, and detailed memories," but no benchmark measures consolidation quality over long time horizons. How well the system maintains coherent memory after hundreds of sessions is unknown.

**Block budget management at scale.** There is no documented guidance on how many blocks an agent should have, what happens to context window efficiency as block count grows, or when to split versus merge blocks.

**Governance of shared blocks in multi-agent systems.** When two agents write to the same block concurrently, the documentation does not specify conflict resolution. The last write wins, but there is no locking mechanism described in the available source material.

**Hosted service cost model.** The Letta API (app.letta.com) is the recommended deployment path, but pricing at scale is not documented in available sources. The per-agent overhead (persistent threads, block storage, embedding infrastructure) for large agent fleets is unclear.

**Context constitution formalization.** The blog describes "context constitutions" as structured policies governing context composition, but this feature's implementation status and relationship to the current block architecture is not fully documented.

## Alternatives

- **Use [Graphiti](../projects/graphiti.md) / Zep when** you need temporal knowledge graphs with entity-relationship tracking. On the LongMemEval benchmark, Zep achieves 18.5% accuracy improvement and 90% latency reduction over baselines on complex temporal reasoning tasks -- meaningfully stronger than MemGPT on tasks requiring cross-session synthesis of evolving facts. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

- **Use mem0 when** you want automatic memory extraction without managing a full platform. mem0 extracts facts from conversations automatically; Letta delegates all extraction decisions to the agent itself.

- **Use plain [RAG](../concepts/retrieval-augmented-generation.md) when** your use case is document retrieval rather than agent learning. Letta's documentation explicitly distinguishes its approach from RAG: "RAG merely connects systems to data without enabling learning or adaptation." If adaptation is not required, the full Letta stack is unnecessary overhead.

- **Use Letta when** memory management is the central product requirement, you need inspectable and externally editable agent state, multi-agent memory sharing is required, or you want a complete platform rather than assembling components.

## Related Concepts

- [Core Memory](../concepts/core-memory.md) -- The in-context editable block system Letta implements
- [Episodic Memory](../concepts/episodic-memory.md) -- Recall memory (conversation history) tier
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) -- Archival memory tier uses embedding-based retrieval
- [Reflexion](../concepts/reflexion.md) -- Self-improvement via memory editing is conceptually related
- [Graphiti](../projects/graphiti.md) -- Alternative memory architecture using temporal knowledge graphs

---
entity_id: letta
type: project
bucket: agent-memory
abstract: >-
  Letta (formerly MemGPT) is a stateful agent platform where agents self-edit
  their own system prompt context via tool calls — memory is editable text
  blocks, not an external store.
sources:
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/letta-ai-letta.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - repos/letta-ai-letta-code.md
  - repos/letta-ai-letta.md
  - repos/letta-ai-lettabot.md
  - repos/mirix-ai-mirix.md
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
related:
  - retrieval-augmented-generation
  - episodic-memory
  - memgpt
  - semantic-memory
  - agent-skills
  - graphiti
  - multi-agent-systems
  - letta-api
last_compiled: '2026-04-08T23:03:01.818Z'
---
# Letta

## What It Does

Letta is a production agent framework built around one architectural bet: memory should live inside the prompt, where the agent can read and rewrite it. An agent's persistent knowledge sits in editable text `Block` objects that get compiled directly into the system prompt at every turn. The agent uses dedicated tools (`core_memory_replace`, `rethink_memory`, `archival_memory_insert`) to modify those blocks mid-conversation.

This is what distinguishes Letta from [Mem0](../projects/mem0.md) and [Graphiti](../projects/graphiti.md). Those systems extract facts and store them externally, then retrieve relevant ones on demand. Letta agents carry their knowledge directly in their visible context and actively reorganize it. The agent decides what to remember, what to discard, and how to structure its blocks — with no automated extraction pipeline making those choices for it.

The project began as [MemGPT](../projects/memgpt.md) (arXiv:2310.08560), framing LLMs as operating systems that page between limited context (RAM) and external storage (disk). Letta expands that into a full platform: REST API, multi-agent orchestration, deployment infrastructure, Python and TypeScript SDKs, and a managed cloud offering.

GitHub stars: ~14K+ (self-reported via repo metadata). No independent benchmark validation of the broader platform; the MemGPT paper demonstrated effectiveness on document analysis and multi-session chat tasks.

## Core Mechanism

### Memory as Editable Blocks

The `Memory` class (`letta/schemas/memory.py`) holds a list of `Block` objects. Each block has a `label` (e.g., "human", "persona"), a `value` (free text), a character `limit`, and a `read_only` flag. The `Memory.compile()` method renders all blocks into XML-structured text injected into the system prompt:

```xml
<memory_blocks>
<human>
<metadata>chars_current=142 chars_limit=5000</metadata>
<value>The user's name is Alice. She prefers dark mode.</value>
</human>
</memory_blocks>
```

The agent sees its own memory constraints — current character count, limit — as part of the context it reasons over. Before each LLM call, `_rebuild_memory_async` refreshes blocks from the database and recompiles the system prompt only if blocks changed, avoiding unnecessary recompilation.

The full system prompt assembles from: read-only base instructions + compiled memory blocks + metadata (message count, archival memory size, timestamps) + recent messages + historical summaries.

### Self-Modifying Tools

Five built-in tools handle memory operations (`letta/functions/function_sets/base.py`):

- **`core_memory_replace(label, old_content, new_content)`** — exact string replacement. Fails with `ValueError` if `old_content` is not found, forcing the agent to be precise rather than approximate.
- **`core_memory_append(label, content)`** — appends with newline separator. Simple but creates fragmentation over time.
- **`rethink_memory(new_memory, target_block_label)`** — wholesale block rewrite. The agent regenerates all content from scratch, allowing reorganization without matching old text.
- **`archival_memory_insert(content, tags)`** — writes to long-term vector storage, the equivalent of paging to disk.
- **`archival_memory_search(query, tags, top_k)`** — semantic search over archival memory. The agent must call this explicitly; there is no automatic promotion of relevant stored facts into context.

Additionally, `conversation_search(query, roles, limit, start_date, end_date)` enables hybrid search over the full conversation history (recall memory).

For git-backed "context repositories" (a newer feature), the `memory()` multi-command tool supports `create`, `str_replace`, `insert` (at line number), `delete`, and `rename`, treating memory blocks as versioned files.

### The Agent Loop

A call to `LettaAgent.step()` proceeds:

1. Load history, compile system prompt with current block values
2. Send to LLM with tool definitions
3. If the model calls a tool: execute it, update block or archival DB, loop back to step 2
4. If the model calls `send_message`: return response to caller
5. If context window exceeds 90% (`SUMMARIZATION_TRIGGER_MULTIPLIER = 0.9`): trigger summarization

The loop continues up to `DEFAULT_MAX_STEPS = 50`. A simple user message might trigger 3–5 LLM calls as the agent reads context, updates memory, searches archival storage, and formulates a response. Every memory modification costs a full LLM call.

### Context Window Management

Two summarization strategies handle overflow:

**`STATIC_MESSAGE_BUFFER`**: Evicts oldest messages. An `EphemeralSummaryAgent` summarizes evicted messages in a background task, writing the summary to a dedicated `conversation_summary` block.

**`PARTIAL_EVICT_MESSAGE_BUFFER`**: Evicts 30% of messages synchronously and inserts a recursive summary as a user message at index 1. Preserves more context but blocks the response.

Neither strategy can guarantee what information survives. Summary quality depends entirely on the LLM.

### Sleeptime Agents

The `SleeptimeMultiAgent` pattern (`letta/groups/sleeptime_multi_agent.py`) runs a secondary agent in the background while the primary agent handles user conversations.

The primary agent handles real-time conversation and lacks tools to edit core memory blocks. The sleeptime agent has exclusive write access to both its own and the primary agent's blocks. After every N messages (configurable via `sleeptime_agent_frequency`), a background daemon thread spawns, sends recent message transcripts to the sleeptime agent, and lets it consolidate, reorganize, and refine memory independently.

The sleeptime agent can use stronger, slower models since latency doesn't affect the user-facing response. This is the closest Letta comes to addressing the quality-versus-speed tradeoff: expensive reasoning about memory structure happens asynchronously, not on the critical path.

The thread model uses `asyncio.new_event_loop()` in daemon threads — if the main process exits while background tasks run, work is silently lost.

### Multi-Agent Coordination

Agents communicate via three mechanisms: fire-and-forget (`send_message_to_agent_async`), blocking request/response (`send_message_to_agent_and_wait_for_reply`), and tag-based broadcast (`send_message_to_agents_matching_all_tags`). Built-in orchestration patterns: round-robin, supervisor-worker, producer-reviewer, parallel execution, and hierarchical teams.

Shared memory blocks are the state-sharing primitive. Multiple agents can reference identical `Block` objects by `block_id`. When one agent modifies a shared block, the change is immediately visible to others on their next rebuild.

## Key Numbers

- **DMR benchmark**: MemGPT scored 93.4% accuracy, vs. Zep/Graphiti at 94.8% and full-context baseline at 94.4% (from Zep paper, independently reported — not self-reported by Letta). On [LongMemEval](../projects/longmemeval.md), Zep outperforms the MemGPT baseline by 18.5% on accuracy and 90% on latency, suggesting Graphiti-based approaches have advantages on complex temporal reasoning.
- **Context limit**: 128K token default; summarization triggers at 90% usage.
- **Max steps per request**: 50 by default.
- **LLM calls per user message**: typically 2–5 due to tool-call looping.
- **17+ LLM providers** supported.

Benchmark numbers for Letta (as opposed to MemGPT) are self-reported or absent. No independent validation of the platform's multi-agent or sleeptime-agent capabilities exists in published literature.

## Strengths

**Inspectable memory state.** Because all knowledge lives as readable text blocks, developers and users can directly view, edit, or export an agent's full "learned state" via the API or the Agent Development Environment. Nothing is hidden in a vector embedding.

**Genuine multi-session continuity.** Every agent maintains one perpetual conversation thread with automatic persistence. Frameworks that require explicit save/load calls produce agents that forget by default; Letta agents remember by default.

**Agent-controlled memory quality.** The agent reorganizes its blocks proactively — through `rethink_memory` or via the sleeptime agent — rather than accumulating stale facts. Well-prompted agents with capable models maintain cleaner memory than any automatic extraction pipeline.

**Complete platform.** REST API, Python/TypeScript SDKs, Docker deployment, OpenTelemetry tracing, Redis connectors, MCP integration, and multi-agent orchestration come out of the box. Teams building production agents don't need to assemble these components from separate libraries.

**Multi-agent shared state.** Shared memory blocks provide a clean primitive for collaborative agent architectures — no custom message passing needed for shared knowledge.

## Critical Limitations

**Concrete failure mode — block fragmentation with `core_memory_append`.** Repeated appends to the same block create increasingly long, redundant, unstructured text. Over a long conversation, the "human" block might contain five conflicting notes about the user's preferences with no reconciliation. The agent must call `rethink_memory` to clean this up, but weaker models often don't recognize when reorganization is necessary. There is no automatic deduplication, no staleness detection, no structural enforcement. The documentation calls proactive block maintenance a "capability," but in practice it's a maintenance burden that compounds with model quality.

**Unspoken infrastructure assumption — PostgreSQL dependency for anything real.** The platform requires PostgreSQL for production deployments. The documentation does not foreground this. Teams expecting a lightweight memory layer will encounter a full database dependency with schema migrations (`letta/orm/`), connection pooling requirements, and operational overhead. SQLite works for development but not for multi-agent or multi-user production deployments.

## When NOT to Use Letta

**When you need structured relational queries over memory.** All Letta memory is unstructured text strings. Asking "what is Alice's relationship to Bob?" requires the agent to parse its own block content. For applications requiring entity-relationship reasoning, [Graphiti](../projects/graphiti.md) (knowledge graph) or [Zep](../projects/zep.md) provide structured retrieval. The LongMemEval results show Graphiti-based approaches outperform MemGPT-style architectures on complex temporal reasoning tasks.

**When memory extraction should be automatic.** Letta delegates all memory management decisions to the agent. If the agent fails to call `core_memory_replace` after learning a key fact, that fact exists only in conversation history, not in searchable core memory. [Mem0](../projects/mem0.md) automatically extracts and stores facts without relying on agent initiative.

**When you want a memory library, not a framework.** Letta is an agent platform. If you have an existing agent architecture and want to add memory, the full Letta platform (FastAPI server, database, multi-agent orchestration) is heavyweight. Mem0 or Graphiti integrate as libraries into existing systems.

**When LLM call budget is tight.** The agent loop multiplies LLM calls: a single user message can trigger 3–5 calls as the agent manages memory and formulates a response. Applications with strict per-interaction cost limits face compounding costs at scale.

**When assistant-generated content needs to be remembered.** The Zep paper benchmarks show MemGPT-style approaches drop 17.7% on tasks requiring retrieval of what the assistant previously said (vs. what the user said). If your application depends on the agent remembering its own prior outputs — recommendations, calculations, prior decisions — the extraction pipeline is structurally biased against this.

## Unresolved Questions

**Sleeptime agent consistency guarantees.** What happens when the sleeptime agent rewrites a block while the primary agent is mid-conversation? The daemon thread model and shared block state create a potential race condition. The documentation doesn't address locking semantics for shared blocks.

**Cost at scale.** Every memory modification costs an LLM call. For high-volume deployments (many agents, many users), the cumulative LLM API costs for background memory consolidation are not documented. The model leaderboard recommends expensive frontier models; the cost profile for running sleeptime agents with GPT-4-class models at scale is unclear.

**Community refresh for archival memory.** The platform supports archival memory as a flat passage store with embedding search. For agents that accumulate thousands of archival passages, there's no documented mechanism for deduplification, consolidation, or quality improvement of the archival store over time — only insertion and retrieval.

**Character limits vs. token budgets.** Blocks use character limits, not token limits. The relationship between character count and token consumption varies by content. An agent with ten blocks, each at 5000 characters, might consume wildly different token counts depending on content. The system uses a 90% threshold as a safety margin but doesn't expose fine-grained token budget management.

**Block governance in multi-agent systems.** When multiple agents share a block and two agents attempt simultaneous writes, who wins? The documentation presents shared blocks as the coordination primitive but doesn't specify conflict resolution semantics.

## Alternatives

**Use [Mem0](../projects/mem0.md)** when you want automatic memory extraction with minimal friction. Mem0 extracts and stores facts without requiring agent initiative. Better for retrofitting memory onto existing agent architectures.

**Use [Graphiti](../projects/graphiti.md) or [Zep](../projects/zep.md)** when your application requires temporal tracking of evolving facts, entity-relationship queries, or complex multi-hop reasoning. The LongMemEval results favor graph-based approaches for these tasks. Both support structured queries that Letta's text-block model cannot.

**Use [LangGraph](../projects/langgraph.md)** when you need complex stateful workflow graphs without committing to Letta's agent platform. LangGraph handles multi-agent coordination and persistence without prescribing a memory architecture.

**Use [AutoGen](../projects/autogen.md)** when multi-agent conversation patterns are the primary concern and memory is secondary.

**Use Letta** when persistent, inspectable, agent-controlled memory across sessions is the core requirement — particularly for long-running personal assistants, customer-facing agents that must remember user history, or multi-agent systems where shared block state simplifies coordination. The sleeptime pattern is genuinely differentiated: no other major framework provides built-in background memory consolidation as a first-class architectural primitive.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Core Memory](../concepts/core-memory.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Semantic Memory](../concepts/semantic-memory.md)
- [Long-Term Memory](../concepts/long-term-memory.md)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Context Management](../concepts/context-management.md)
- [Self-Improving Agents](../concepts/self-improving-agents.md)

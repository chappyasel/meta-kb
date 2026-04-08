---
entity_id: memgpt
type: project
bucket: agent-memory
abstract: >-
  MemGPT introduced virtual context management for LLMs via hierarchical memory
  tiers (core/recall/archival) with agent-controlled self-editing; now evolved
  into the Letta platform.
sources:
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/letta-ai-letta.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - letta
  - graphiti
last_compiled: '2026-04-08T23:11:32.756Z'
---
# MemGPT

**Type:** Research System (evolved into [Letta](../projects/letta.md))
**Bucket:** Agent Memory
**Status:** Superseded — the codebase and team have rebranded as Letta. The MemGPT paper (arXiv:2310.08560) remains the foundational reference.

## What It Is

MemGPT is the research system that first demonstrated virtual context management for LLMs: treating the context window as RAM and external storage as disk, then teaching an agent to explicitly page data between them via tool calls. The paper framed LLMs as operating systems, a framing that shaped an entire generation of agent memory architectures.

The core insight: instead of building external memory infrastructure and injecting retrieved content into a passive LLM, give the LLM tools to manage its own context window. The agent reads, writes, and reorganizes its own memory blocks. Memory management becomes a first-class agent capability.

The system has since evolved into [Letta](../projects/letta.md), a full agent platform. This card covers both the original MemGPT research contribution and the Letta implementation that carries it forward, since most production users interact with Letta rather than the original codebase.

## Architectural Innovation

### The OS Analogy

The MemGPT paper describes "virtual context management" that creates "an illusion of extended virtual memory" through hierarchical memory management. The context window is RAM — fast, limited, expensive. External storage is disk — slow, unlimited, cheap. The agent acts as the OS scheduler, deciding what lives in RAM and what gets paged to disk.

This is not just metaphor. It directly shaped the data structures:

**[Core Memory](../concepts/core-memory.md)** — Editable text blocks compiled directly into the LLM system prompt. The agent sees these on every turn and can modify them via tool calls. Implemented in `letta/schemas/memory.py` as `Memory` containing a list of `Block` objects, each with a label (`human`, `persona`, `knowledge`), a text `value`, and a character limit.

**Recall Memory** — The complete message history, persisted to disk, searchable via `conversation_search`. The agent has access to everything ever said but must query it explicitly.

**[Archival Memory](../concepts/long-term-memory.md)** — Vector-searchable long-term storage. The agent writes to it with `archival_memory_insert` and retrieves with `archival_memory_search`. No automatic promotion — if the agent doesn't search, information stays on disk.

### Memory Blocks as Editable Prompt Text

The memory block is MemGPT's most distinctive artifact. When the `Memory.compile()` method runs before each LLM call, it renders all blocks into XML-structured text injected into the system prompt:

```xml
<memory_blocks>
<human>
<metadata>chars_current=142, chars_limit=5000</metadata>
<value>The user's name is Alice. She prefers dark mode.</value>
</human>
</memory_blocks>
```

The agent is aware of its own memory constraints. It can see how full each block is. The metadata is part of the prompt.

Three tools drive self-modification (defined in `letta/functions/function_sets/base.py`):

- **`core_memory_replace(label, old_content, new_content)`** — Exact string replacement. Fails if `old_content` is not found, forcing the agent to be precise.
- **`core_memory_append(label, content)`** — Appends content with a newline. Simple, but causes fragmentation over time.
- **`rethink_memory(new_memory, target_block_label)`** — Rewrites the entire block wholesale. The agent regenerates all existing content, avoiding fragmentation but requiring full recall of prior block state.

A newer `memory()` multi-command tool (for git-backed memory mode) adds line-level operations: create, str_replace, insert at line number, delete, rename.

### The Agent Loop

Data flow for a single user message to `LettaAgent.step()`:

1. `rebuild_memory` — Refresh block values from the database, recompile system prompt
2. Load recent messages + any conversation summaries
3. LLM call with the full tool schema available
4. If tool call returned: execute tool, update block or archival storage, loop back to step 3
5. If `send_message` called: return response to user
6. Check context window usage; trigger summarization if above 90% threshold

Maximum steps per request defaults to 50. A single user message might generate 3–5 LLM calls as the agent reads context, updates memory, and formulates a response.

### Context Window Management

Summarization triggers at 90% of the context window (`SUMMARIZATION_TRIGGER_MULTIPLIER = 0.9`). Two modes:

**STATIC_MESSAGE_BUFFER** — Evicts oldest messages. A background `EphemeralSummaryAgent` summarizes the evicted batch and writes the summary to a `conversation_summary` block. Non-blocking, but the summary is not available until the next turn.

**PARTIAL_EVICT_MESSAGE_BUFFER** — Evicts ~30% of messages, generates a synchronous summary inserted as a user message at index 1. Preserves more information but adds latency.

### Sleeptime Agents

The Letta implementation extends MemGPT with asynchronous memory consolidation. After every N messages (configurable), a background `SleeptimeMultiAgent` receives a transcript of recent exchanges and processes them independently.

The primary agent handles real-time conversation and lacks tools to edit core memory. The sleeptime agent has exclusive write access to both its own and the primary agent's memory blocks. This separation means memory consolidation never blocks a user-facing response, and the sleeptime agent can use a stronger (slower) model for higher-quality reorganization.

Memory updates flow through the shared block system: the sleeptime agent calls `rethink_memory` on the primary agent's blocks, which persist to the database and are picked up by the primary agent's next `rebuild_memory` call.

## How It Differs from Alternatives

MemGPT/Letta stores all memory as unstructured text. [Mem0](../projects/mem0.md) automatically extracts structured facts. [Graphiti](../projects/graphiti.md) builds a temporal knowledge graph with typed entity nodes and relationship edges. [Zep](../projects/zep.md) wraps Graphiti in a three-tier architecture (episodes → semantic entities → communities).

The tradeoff is explicit: MemGPT/Letta agents manage their own memory through reasoning and tool calls, which means memory quality scales with model capability. Mem0 and Graphiti automate extraction, which means they work with weaker models but lose the agent's ability to decide what matters.

For relational queries ("what is Alice's relationship to Bob?"), text blocks require the agent to parse its own memory every time. A knowledge graph answers this structurally. For applications where the agent's judgment about what to remember is itself valuable, text blocks are preferable.

## Key Numbers

**DMR benchmark:** MemGPT achieves 93.4% accuracy on Deep Memory Retrieval, compared to Zep's 94.8% and a full-conversation baseline of 94.4%. [Source: Zep paper, self-reported by Zep team.] The DMR benchmark covers ~60-message conversations — short enough that context-stuffing nearly suffices, which limits the comparison's practical significance.

**GitHub stars:** The letta-ai/letta repository has substantial stars (exact count varies), reflecting the project's influence on the field. The original MemGPT paper (arXiv:2310.08560) is widely cited in agent memory literature.

**Context window:** Default 128K tokens. Summarization triggers at 90% usage.

**Archival memory:** Passage-based storage with 300-character default chunk size and 1024-dimension embeddings.

## Strengths

**Agent-visible memory** — Because memory blocks are literally part of the system prompt, the agent always knows what it knows. There is no retrieval step where relevant memories might be missed. The agent can reason about its own knowledge state.

**Self-directed memory curation** — The agent decides what to remember, what to overwrite, and how to organize information. Over long interactions, a capable agent builds increasingly refined, relevant memory blocks. The sleeptime pattern amplifies this by allowing offline consolidation.

**Full auditability** — Every block is a text string that developers can read, inspect, and edit via the API. The agent's entire learned state is visible. This matters for debugging and for enterprise compliance use cases.

**Platform completeness** — Letta ships with a REST API, PostgreSQL storage, 17+ LLM provider adapters, multi-agent orchestration patterns, MCP tool support, and SDKs in Python and TypeScript. For teams that want a complete stateful agent platform rather than a memory library, there is nothing equivalent to assemble from scratch.

**Model agnostic** — The memory mechanism works across any model that supports tool calling. The recommended model leaderboard updates as new models become available.

## Critical Limitations

**Memory quality depends entirely on model quality.** Weak models create fragmented, redundant, or incomplete blocks. There is no automatic extraction pipeline as a fallback. A GPT-4o-class model managing memory well will outperform a weaker model managing memory poorly by a large margin — but the system provides no guardrails.

**Concrete failure mode:** An agent accumulates 15 sessions of conversation. The `human` block grows via repeated `core_memory_append` calls until it becomes a dense, poorly organized paragraph. The agent uses `rethink_memory` to reorganize, but the LLM's working memory during reorganization is limited to the block content plus recent messages — it may silently drop facts that were buried in earlier block text. There is no diff, no checksum, no verification that the reorganized block preserved all information. Information loss is undetected.

**Unspoken infrastructure assumption:** Every agent maintains a single perpetual message thread that grows monotonically. PostgreSQL is the storage backend. At scale — thousands of agents, each with millions of messages — the per-agent thread model becomes expensive. The system does not document sharding strategy, archival of cold threads, or cost at scale. Teams discovering this assumption at production volume will need to solve storage scaling themselves.

## When NOT to Use It

**Don't use MemGPT/Letta when:**

- You need structured relational queries over your memory (use [Graphiti](../projects/graphiti.md) or [Zep](../projects/zep.md))
- Your base model is weaker than GPT-4o-class — self-managed memory will degrade rather than improve over time
- You need memory-only infrastructure without a full agent platform — [Mem0](../projects/mem0.md) is lighter
- Your application requires branching conversations or parallel contexts — the single-thread assumption rules this out
- You need to track how facts change over time with full historical tracing — the text-block model overwrites rather than versioning; [Zep](../projects/zep.md)'s bi-temporal indexing is the better fit
- Response latency is critical and you cannot afford 3–5 LLM calls per user turn — even with the sleeptime pattern, the primary agent still loops for tool execution

## Unresolved Questions

**Extraction cost at scale.** The paper does not report per-message ingestion cost or the aggregate cost of maintaining a sleeptime agent across thousands of users. Each memory modification requires a full LLM call. Production cost modeling is absent from the documentation.

**Community governance post-commercialization.** Letta has raised venture funding and operates a hosted platform. The open-source repository (`letta-ai/letta`) is Apache 2.0 licensed, but it is unclear what features will remain open-source versus become hosted-only over time. The original MemGPT research was published as a paper; Letta's ongoing research is increasingly tied to commercial development.

**Block conflict resolution in multi-agent settings.** When multiple agents share a memory block and write to it concurrently, the system uses database-level locking. What happens when two sleeptime agents write conflicting information to a shared block is not documented. The block-as-string model has no merge semantics.

**Sleeptime agent scheduling.** Background tasks run in daemon threads with their own event loops. Graceful shutdown coordination between the main process and in-flight background memory tasks is not described. Work in progress during process termination may be lost.

**Long-term block drift.** Over hundreds of sessions, even well-managed blocks may diverge from the ground truth of the conversation history. There is no periodic consistency check, no mechanism for the agent to verify its block content against recall memory. The git-backed memory mode offers versioning but not automatic consistency validation.

## Alternatives

| Use case | Recommendation |
|---|---|
| Need full temporal history of how facts changed | [Zep](../projects/zep.md) — bi-temporal indexing, invalidation without deletion |
| Need structured entity-relationship memory | [Graphiti](../projects/graphiti.md) — typed nodes and edges, graph traversal |
| Need lightweight automatic fact extraction | [Mem0](../projects/mem0.md) — extraction pipeline, no agent-loop cost |
| Need memory + retrieval only, not a full platform | [LlamaIndex](../projects/llamaindex.md) memory modules or [LangChain](../projects/langchain.md) memory |
| Need the full MemGPT vision with active development | [Letta](../projects/letta.md) — direct successor, same core architecture |

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader landscape this system addresses
- [Core Memory](../concepts/core-memory.md) — the specific memory tier MemGPT introduced
- [Context Engineering](../concepts/context-engineering.md) — the formal discipline that MemGPT's virtual context management instantiates
- [Long-Term Memory](../concepts/long-term-memory.md) — archival memory tier
- [Context Management](../concepts/context-management.md) — the summarization and eviction mechanisms

## Sources

- [Letta Repository Deep Analysis](../raw/deep/repos/letta-ai-letta.md)
- [Zep Paper (with MemGPT DMR comparison)](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- [Context Engineering Survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

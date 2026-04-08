---
entity_id: core-memory
type: concept
bucket: agent-memory
abstract: >-
  Core Memory is the always-present, editable in-context memory block that gives
  agents persistent identity and user knowledge across sessions, implemented as
  character-limited text blocks compiled directly into the system prompt.
sources:
  - deep/repos/jackchen-me-open-multi-agent.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - repos/jackchen-me-open-multi-agent.md
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
related:
  - retrieval-augmented-generation
  - episodic-memory
  - semantic-memory
last_compiled: '2026-04-08T23:09:59.016Z'
---
# Core Memory

## What It Is

Core memory is a small, persistent text block that lives inside an agent's system prompt on every single inference call. While [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pulls information from external stores on demand, core memory never leaves context. It is the agent's working identity: what it knows about itself, the user, and the current task.

The concept originated in the [MemGPT](../projects/memgpt.md) paper (arXiv:2310.08560) and became the architectural centerpiece of [Letta](../projects/letta.md). The analogy is RAM versus disk. Core memory is RAM — small, fast, always accessible. Archival and episodic stores are disk — large, searchable, but requiring an explicit read operation to load.

## Why It Matters

Most LLM sessions are stateless. Every new conversation starts from scratch, requiring the user to re-establish context. This is tolerable for one-off tasks but breaks down for personal assistants, long-running research agents, and multi-session workflows where continuity matters.

Core memory solves the statelessness problem by giving the agent a small, persistent scratch pad that survives across sessions. Crucially, agents can modify this scratch pad themselves through tool calls, so the memory reflects what the agent has learned, not just what a developer pre-loaded.

This makes it distinct from a static system prompt. A static system prompt is read-only. Core memory is read-write. The agent can add, replace, or reorganize content as it learns more about the user or task context.

## How It Works

### The Block Data Structure

In Letta's implementation (`letta/schemas/block.py`), a core memory block is:

```python
class Block(BaseBase):
    value: str        # The actual text content
    limit: int        # Character cap (not token cap)
    label: str        # e.g. "human", "persona", "knowledge"
    description: str  # Shown in context so the agent understands the block's purpose
    read_only: bool   # Whether the agent can modify it
```

A `Memory` object holds a list of these blocks. Before each LLM call, `Memory.compile()` renders all blocks into XML-structured text that gets injected into the system prompt:

```xml
<memory_blocks>
<human>
<description>Notes about the user</description>
<metadata>
- chars_current=142
- chars_limit=5000
</metadata>
<value>
The user's name is Alice. She prefers dark mode.
</value>
</human>
</memory_blocks>
```

The metadata section (character count, limit) appears in every call. The agent sees not just the content but also how much space remains, enabling it to decide when to consolidate versus append.

### Self-Modification via Tool Calls

The agent modifies its own core memory through tool functions defined in `letta/functions/function_sets/base.py`:

**`core_memory_replace(label, old_content, new_content)`** — Exact string replacement. If `old_content` is not found, the call fails. This forces the agent to be precise about what it is changing, preventing accidental overwrites of adjacent content.

**`core_memory_append(label, content)`** — Appends text with a newline. Simple but prone to block fragmentation over many sessions.

**`rethink_memory(new_memory, target_block_label)`** — Replaces the entire block. The agent must regenerate all existing content along with any additions. This addresses fragmentation by allowing complete reorganization, at the cost of requiring the agent to hold the full block in its reasoning.

Each tool call triggers a new LLM turn. A user message like "I prefer dark mode" may cause the agent to call `core_memory_append("human", "Prefers dark mode interfaces.")` in a non-visible reasoning step before responding to the user. The updated block is then persisted to the database and reflected in every subsequent system prompt.

### Compilation into the System Prompt

The `_rebuild_memory_async` method in `BaseAgent` runs before each LLM call:

1. Refresh block values from the database
2. Compile all blocks into a string via `Memory.compile()`
3. Compare with the current system message
4. If changed, update the stored system message

The full system prompt assembly order is: base instructions (read-only) → compiled memory blocks (editable) → metadata about external stores → recent messages → historical summaries. Core memory sits near the top, before retrieved content, making it the highest-priority context the model sees.

### Character Limits, Not Token Limits

Blocks enforce character limits (default `CORE_MEMORY_BLOCK_CHAR_LIMIT`), not token limits. This is simpler to implement but less precise — 5,000 characters of dense code consumes far more tokens than 5,000 characters of English prose. The context overflow check uses a 90% multiplier as a safety margin, but a block at its character limit could still push total context well above comfortable levels depending on content type.

### Persistence and Cross-Agent Sharing

Each block has a unique `block_id` and is stored in the database independently. This enables two important capabilities:

**Cross-session persistence**: Block values survive conversation resets. The agent picks up exactly where it left off on the next session.

**Cross-agent sharing**: Multiple agents can hold references to the same block. If a research agent and a writing agent both reference a shared `project_context` block, updates from either agent are visible to the other on their next call. This is the foundation of Letta's multi-agent coordination patterns — shared blocks function as a typed communication channel between agents operating on the same task.

## Who Implements It

**[Letta](../projects/letta.md)** (formerly MemGPT) is the canonical implementation, with core memory as the central abstraction around which the entire platform is organized. Letta exposes full CRUD access to blocks via REST API, enabling developers to read and modify agent memory externally.

**[Mirix](../projects/mem0.md)** treats its "Core Memory Agent" as one of six specialized memory agents (alongside Episodic, Semantic, Procedural, Resource, and Knowledge Vault). Its core memory holds "human" and "persona" blocks, initialized via config and updated during screen capture processing.

**[Mem-alpha](../projects/memgpt.md)** (arXiv:2509.25911) makes core memory one of three tiers (alongside semantic and episodic) in a system where the memory agent itself is trained via [GRPO](../concepts/grpo.md) reinforcement learning to decide when to write to core versus other stores. Core memory is capped at 512 tokens and reserved for the most critical persistent context.

**[CLAUDE.md](../concepts/claude-md.md)** files serve a functionally equivalent role for coding agents like [Claude Code](../projects/claude-code.md): persistent, always-in-context text about the project and user preferences that the agent reads on every call. The key difference is that CLAUDE.md files are version-controlled and developer-authored rather than agent-edited.

## Relationship to Other Memory Types

Core memory sits at the top of a [Long-Term Memory](../concepts/long-term-memory.md) hierarchy:

| Memory Type | Location | Access Method | Agent Can Write? |
|---|---|---|---|
| Core Memory | System prompt | Always available | Yes, via tools |
| [Episodic Memory](../concepts/episodic-memory.md) | External store | Explicit retrieval | Yes, via tools |
| [Semantic Memory](../concepts/semantic-memory.md) | External store | Semantic search | Yes, via tools |
| [Working/Short-Term Memory](../concepts/short-term-memory.md) | Context window | Implicit | Not persisted |

[RAG](../concepts/retrieval-augmented-generation.md) retrieves from episodic and semantic stores. Core memory is not retrieved — it is compiled. This distinction matters: retrieval can fail to surface relevant content, retrieval costs tokens on every query, and retrieval introduces latency. Core memory has none of these failure modes within its character limit, but it does not scale beyond a few thousand tokens.

In practice, well-designed agents use core memory for facts that are almost always relevant (user name, preferences, current project goal) and episodic/semantic stores for facts that are only sometimes relevant (past conversations, reference documents). The agent's memory tools let it promote information from retrieval stores into core memory when something becomes repeatedly relevant.

## Strengths

**Zero retrieval latency**: Core memory is always in context. There is no vector search, no BM25 pass, no additional LLM call. The agent sees core memory on every inference call with no extra work.

**Agent-visible memory state**: Unlike external databases, the agent can read its own core memory directly. It knows what it knows. This enables the agent to reason about gaps in its knowledge ("I don't have the user's timezone yet") and act to fill them.

**Inspectable by developers**: Because core memory is text in a database, developers can read and modify it via API without any special tooling. This makes debugging straightforward: you can see exactly what the agent currently believes about a user and correct errors directly.

**Cross-session continuity**: An agent with well-maintained core memory provides a qualitatively different experience than a stateless one. Users do not repeat themselves. The agent builds on prior context rather than starting fresh.

## Critical Limitations

**Bounded by character limits, not relevance**: Core memory does not grow gracefully. Once blocks approach their character limits, the agent must actively consolidate, delete, or reorganize content. This consolidation is itself an LLM call, and lower-capability models may handle it poorly — overwriting important content, creating redundancy, or refusing to delete anything.

The specific failure mode: an agent serving a user for months will accumulate outdated preferences, superseded project goals, and stale context in its blocks. Without active maintenance (either by the agent itself or a background [sleeptime agent](../projects/letta.md)), block content drifts toward representing the past rather than the present.

**Infrastructure assumption — database persistence**: Core memory only works if blocks are durably stored between sessions. This requires a database (Letta uses PostgreSQL via SQLAlchemy). Any deployment pattern that recreates agent objects without restoring database state silently discards all learned memory. The abstraction looks simple (text blocks), but it depends on a stateful persistence layer that many serverless and ephemeral deployment patterns do not provide.

## When NOT to Use It

**Short-lived or single-session agents**: If the agent will never see the same user twice, the overhead of maintaining and updating core memory blocks adds LLM calls without any benefit. A static system prompt suffices.

**High-throughput pipelines**: Core memory blocks are per-agent. In pipelines processing thousands of independent documents or queries, maintaining separate core memory for each run consumes database resources and adds update latency for zero benefit.

**When retrieval precision matters more than latency**: For tasks where the relevant context changes dramatically between turns (e.g., a customer support agent handling different users back-to-back), core memory's always-in-context nature becomes a liability — it injects user-specific content that may be irrelevant or misleading for the current context. Retrieval-on-demand is more precise here.

**When the agent lacks good judgment**: Core memory self-modification works well only when the agent has the reasoning capability to decide what deserves permanent storage. Models below ~7B parameters tend to write redundant entries, fail to consolidate, or use `rethink_memory` to wholesale replace blocks with summaries that omit critical detail. In these cases, developer-managed blocks (read-only from the agent's perspective) are safer.

## Unresolved Questions

**Conflict resolution across agents**: When multiple agents share a block, there is no locking or merge protocol. If Agent A and Agent B both write to a shared block in rapid succession, the last write wins. Letta's documentation describes shared blocks as a coordination mechanism but does not specify how write conflicts are detected or resolved.

**Memory quality measurement**: There is no built-in metric for block health. An agent might maintain syntactically valid blocks that are semantically stale, contradictory, or bloated. The mem-alpha research (arXiv:2509.25911) shows that RL-trained agents learn better memory construction strategies, but production deployments have no equivalent feedback loop.

**Cost at scale**: Each core memory update is a full LLM call. For a personal assistant that learns something new on every turn, this could add 10-30% to inference costs. Letta's documentation does not provide per-agent memory maintenance cost estimates.

**Optimal block structure**: Whether to use one large block or many small labeled blocks affects retrieval quality, consolidation behavior, and context overhead. There is no published guidance on optimal block cardinality or character limits for different use cases.

## Alternatives and Selection Guidance

**Use static system prompts** when memory never needs to change after deployment. Simpler, cheaper, and impossible to corrupt through bad writes.

**Use [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)** when the relevant context varies significantly across turns and cannot be predicted in advance. RAG can surface relevant content from millions of documents; core memory cannot.

**Use [Mem0](../projects/mem0.md)** when you want automatic fact extraction without building memory management tools into your agent. Mem0 extracts and structures facts from conversation automatically; core memory requires the agent itself to decide what to write.

**Use [Episodic Memory](../concepts/episodic-memory.md) plus RAG** when conversation history matters but the agent does not need persistent identity across sessions. Episodic stores are queryable and unbounded; core memory is bounded and always-present.

**Use core memory** when the agent needs persistent, always-available identity — user name, long-running project goals, persistent preferences, agent persona — and you can afford the database infrastructure to back it.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Long-Term Memory](../concepts/long-term-memory.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Semantic Memory](../concepts/semantic-memory.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Context Management](../concepts/context-management.md)
- [CLAUDE.md](../concepts/claude-md.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Letta](../projects/letta.md)
- [MemGPT](../projects/memgpt.md)

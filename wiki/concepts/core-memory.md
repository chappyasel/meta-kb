---
entity_id: core-memory
type: concept
bucket: agent-memory
abstract: >-
  Core Memory: always-present text blocks injected into an LLM agent's context
  window, giving agents persistent working memory that survives across
  conversations without retrieval.
sources:
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/letta-ai-letta.md
related:
  - Episodic Memory
  - Semantic Memory
  - Cognitive Architecture
  - Agent Memory
  - Letta
last_compiled: '2026-04-05T20:33:24.672Z'
---
# Core Memory

## What It Is

Core memory is the portion of an agent's context window reserved for persistent, immediately accessible information. Unlike retrieval-augmented approaches where relevant facts must be fetched on demand, core memory sits in the system prompt on every LLM call. The agent sees it without searching for it.

The concept originates from the MemGPT paper (arXiv:2310.08560), which framed LLMs as operating systems: the context window is RAM, external storage is disk, and core memory is the always-resident process state. Letta (formerly MemGPT) gave this the most developed implementation, but the pattern appears across multiple agent frameworks.

## How It Works

In Letta's implementation (`letta/schemas/memory.py`), core memory consists of labeled `Block` objects:

```python
class Block(BaseBase):
    value: str        # Text content
    limit: int        # Character cap (e.g., 5000)
    label: str        # e.g., "human", "persona"
    read_only: bool   # Whether the agent can modify it
```

The `Memory.compile()` method renders all blocks into XML that gets injected into the system prompt before each LLM call. The agent sees something like:

```xml
<memory_blocks>
<human>
<metadata>chars_current=142, chars_limit=5000</metadata>
<value>User's name is Alice. Prefers dark mode. Works in Pacific timezone.</value>
</human>
<persona>
<metadata>chars_current=89, chars_limit=5000</metadata>
<value>I am a helpful assistant that tracks user preferences across sessions.</value>
</persona>
</memory_blocks>
```

The agent can then modify these blocks through tool calls:

- `core_memory_replace(label, old_content, new_content)` — exact string replacement, fails if `old_content` not found
- `core_memory_append(label, content)` — appends with a newline
- `rethink_memory(new_memory, target_block_label)` — rewrites the entire block

Exact-string matching in `core_memory_replace` is a deliberate design choice. The agent must be precise about what it's changing, preventing accidental overwrites of other block content.

In Mem-alpha's implementation (`memory.py`), core memory is a single string capped at 512 tokens rather than multiple labeled blocks. It holds "the most important persistent context," always present in the system prompt. This simpler structure forces more aggressive compression — the agent must decide what matters enough to occupy this small fixed slot.

## Relationship to Other Memory Types

Core memory is one tier in a three-tier hierarchy, described consistently across Letta, Mem-alpha, and MIRIX:

- **Core memory**: In-context, always present, editable, bounded by character/token limit. Zero retrieval cost.
- **[Episodic Memory](../concepts/episodic-memory.md)**: Past events and interactions, searchable but not always in context. Must be explicitly retrieved.
- **[Semantic Memory](../concepts/semantic-memory.md)**: General knowledge and facts, searchable. Must be explicitly retrieved.

The key distinction is retrieval cost. Core memory is always there. Everything else requires a tool call that consumes a full LLM round-trip.

## Who Implements It

**Letta** ([letta](../projects/letta.md)): The most complete implementation. Multiple labeled blocks per agent, character limits per block, developer API access, shared blocks across agents, git-backed versioning via the `memory()` multi-command tool. The `rethink_memory` tool addresses the fragmentation that accumulates from repeated `core_memory_append` calls.

**Mem-alpha** ([mem-alpha](../projects/mem-alpha.md)): A single 512-token string. The agent learns through reinforcement learning (GRPO on Qwen3-4B) when to write to core memory versus episodic or semantic stores. Rather than hand-coding rules like "store user preferences in core memory," the agent learns this from QA accuracy feedback over 30K-token training contexts, then generalizes to 400K+ tokens.

**MIRIX**: One of six specialized memory agents manages core memory, handling blocks for "human" (notes about the user) and "persona" (agent identity). Built on Letta's foundation.

## Design Tradeoffs

**Character limits vs. information content.** Core memory blocks use character limits, not token limits or information-theoretic measures of importance. A block at 5,000 characters might contain five crucial facts or fifty trivial ones. The limit forces compression but provides no signal about what to compress. The agent decides — and weaker models make poor decisions.

**Always-in-context costs tokens.** Every LLM call includes the full core memory content. For agents with multiple large blocks, this is hundreds of tokens consumed before the conversation even begins. The benefit (zero retrieval latency) comes at a constant per-call token cost.

**Exact-string replacement is brittle.** `core_memory_replace` requires the agent to recall the exact current text of a block before modifying it. If the agent's internal representation diverges from the actual block content, the replacement silently fails with a ValueError. `rethink_memory` sidesteps this by rewriting the whole block, but then the agent must regenerate all existing content from scratch.

**No automatic promotion from retrieval.** If something in archival memory becomes highly relevant, the agent must explicitly move it to core memory via a tool call. There's no automatic surfacing based on relevance — the agent must manage its own memory topology.

**No global budget across blocks.** In Letta, each block has its own character limit, but there's no enforcement of a total budget across all blocks. An agent with ten blocks each at 5,000 characters consumes 50,000 characters of system prompt before any conversation content.

## Memory Quality Depends on the Agent

This is the central limitation that documentation understates. Since the agent manages its own core memory through tool calls, memory quality is a direct function of the agent's reasoning ability. A capable model will:

- Recognize when new information supersedes old
- Consolidate fragmented facts into coherent summaries
- Decide correctly between core (critical invariants) and episodic (specific events) storage
- Proactively reorganize blocks that have grown incoherent

A weaker model will do the opposite. Unlike external memory systems that extract facts through deterministic algorithms, core memory in the agent-managed pattern has no floor on quality below which the system guarantees correctness.

Letta's sleeptime agent pattern addresses this by dedicating a separate, potentially stronger model to background memory consolidation. The primary agent handles conversation; the sleep-time agent handles memory hygiene. This separates the latency-sensitive path from the quality-sensitive one.

## Failure Modes

**Fragmentation.** Repeated `core_memory_append` calls accumulate disconnected facts across dozens of lines. Without periodic `rethink_memory` reorganization, the block becomes a log rather than a structured summary. Retrieval still works (it's always in context) but the agent's reasoning over a fragmented block degrades.

**Information loss without decay.** Core memory blocks don't expire. A block can contain facts from two years ago alongside facts from today, with no signal about which is current. The agent must track staleness through explicit updates — there is no automatic versioning or timestamp enforcement on individual facts within a block.

**Context window overflow.** Summarization in Letta triggers at 90% of context window capacity. If a single large tool result pushes beyond 100% before summarization runs, the system catches `ContextWindowExceededError` reactively. Core memory's constant presence reduces the headroom available for conversation history and tool outputs.

**Silent gaps in archival retrieval.** If the agent stores a fact in archival memory but never searches for it, the fact stays on "disk" indefinitely. Unlike core memory, archival content requires the agent to remember to look. For long-running agents, important facts can become permanently inaccessible not because they were deleted but because the agent stopped searching for them.

## When NOT to Use Core Memory

Core memory is the wrong choice when:

- **Information volume exceeds block limits.** A 5,000-character block cannot hold 50 user preferences, a full project spec, and a relationship history. Use archival memory with structured search instead.
- **Information requires relational queries.** Core memory is unstructured text. "What is Alice's relationship to the project?" requires the agent to parse its own block. A knowledge graph approach (like [Graphiti](../projects/graphiti.md)) handles relational structure better.
- **The deployment model is weak.** Models below GPT-4 class tend to make poor autonomous memory management decisions, accumulating redundant entries and missing updates. For weaker models, prefer external systems that extract and deduplicate facts deterministically.
- **Token budget is tight.** Core memory is paid on every call. If the average conversation is two turns and the agent rarely needs persistent context, the constant token overhead isn't justified.
- **Auditability is required.** Core memory blocks are mutable text. Without git-backed versioning (Letta's optional mode), there's no history of what the agent wrote and when. For compliance use cases, external structured storage with write logs is more appropriate.

## Unresolved Questions

How should block limits be set? Neither Letta nor Mem-alpha provides guidance on choosing block sizes relative to context window capacity or information density. The 512-token cap in Mem-alpha and 5,000-character default in Letta appear to be heuristics without published ablation data.

How does core memory interact with model fine-tuning? An agent that has been running for months may have core memory that reflects domain-specific knowledge. If the underlying model is updated, does the existing core memory remain coherent with the new model's understanding? No documentation addresses this.

What happens to shared blocks when agents disagree? In Letta's multi-agent setup, multiple agents can write to the same block. If agent A writes "User prefers formal communication" and agent B writes "User prefers casual communication" in the same turn, the last write wins with no conflict detection.

## Alternatives

**RAG / vector retrieval**: Scales to large knowledge bases without token overhead. Use when the agent needs access to large document collections and can tolerate retrieval latency. Core memory outperforms RAG for facts that must be present on every call.

**Knowledge graphs** ([Graphiti](../projects/graphiti.md)): Better for relational reasoning and temporal fact tracking. Use when the application requires queries like "what changed about this entity over time?" Core memory handles simpler "what do I know about this user?" cases more directly.

**Fine-tuning**: Bakes knowledge into model weights rather than context. Use when facts are stable and universal across all users. Core memory handles per-user, per-session facts that vary and evolve.

**External key-value stores**: Deterministic, auditable, no agent reasoning required. Use when the facts to store are well-structured and can be extracted programmatically. Core memory is appropriate when the agent must decide what matters and how to organize it.

## Related Concepts

- [Episodic Memory](../concepts/episodic-memory.md)
- [Semantic Memory](../concepts/semantic-memory.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Cognitive Architecture](../concepts/cognitive-architecture.md)

## Sources

- [Letta Deep Dive](../raw/deep/repos/letta-ai-letta.md)
- [Mem-alpha Deep Dive](../raw/deep/repos/wangyu-ustc-mem-alpha.md)
- [MIRIX Repository](../raw/repos/mirix-ai-mirix.md)

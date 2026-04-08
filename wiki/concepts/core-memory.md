---
entity_id: core-memory
type: concept
bucket: agent-memory
abstract: >-
  Core memory is a fixed-size, always-in-context text block giving agents
  persistent knowledge of user identity and persona — differentiating it from
  retrieved memory by guaranteeing presence in every prompt.
sources:
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/jackchen-me-open-multi-agent.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/jackchen-me-open-multi-agent.md
  - deep/repos/letta-ai-letta.md
related:
  - episodic-memory
  - semantic-memory
  - retrieval-augmented-generation
last_compiled: '2026-04-08T02:52:56.029Z'
---
# Core Memory

## What It Is

Core memory is a reserved section of an LLM agent's context window containing information that must be present on every turn: who the user is, who the agent is, and any facts too critical to risk missing through retrieval failure. Unlike [Episodic Memory](../concepts/episodic-memory.md) or [Semantic Memory](../concepts/semantic-memory.md), core memory is not retrieved — it is always there.

The concept originated in [MemGPT](../projects/memgpt.md) (arXiv:2310.08560), where the authors framed context windows as RAM and external storage as disk. Core memory maps to the always-resident portion of RAM: the data you cannot afford to page out. [Letta](../projects/letta.md) productionized this into an explicit API, and several downstream systems (MIRIX, Mem-alpha) adopted or extended the abstraction.

## How It Works

### The Block Model (Letta)

In Letta's implementation, core memory consists of named `Block` objects compiled directly into the system prompt before every LLM call. Each block has:

- **label** — a human-readable name (`human`, `persona`, `knowledge`)
- **value** — the actual text content the agent reads and modifies
- **limit** — a character cap (default `CORE_MEMORY_BLOCK_CHAR_LIMIT`, typically 5,000 characters per block)
- **read_only** — whether the agent can modify it via tool calls

`Memory.compile()` renders these blocks into XML-structured text injected into the system prompt:

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

The agent sees this metadata and knows its own memory constraints — how full each block is, how much space remains.

[Source](../raw/deep/repos/letta-ai-letta.md)

### Self-Modification via Tools

Agents update core memory through tool calls, not through fine-tuning or gradient updates. Letta provides three mechanisms:

**`core_memory_replace(label, old_content, new_content)`** — exact string replacement. Fails if `old_content` is not found verbatim. Forces precision; prevents accidental overwrites.

**`core_memory_append(label, content)`** — appends with a newline. Simple but produces fragmented blocks over time.

**`rethink_memory(new_memory, target_block_label)`** — wholesale rewrite of the entire block. The agent regenerates all content from scratch. Addresses fragmentation but requires the agent to reconstruct everything it wants to keep.

A newer `memory()` multi-command tool treats blocks like versioned files, supporting create, str_replace, insert at line number, delete, and rename — backed optionally by git for rollback.

This architecture means an agent's "learning" happens entirely in token space. When the agent decides Alice prefers dark mode, it calls `core_memory_replace` on the `human` block. That change persists to the database and appears in every subsequent system prompt. No weight update, no retraining — just an LLM editing a string in its own prompt.

[Source](../raw/deep/repos/letta-ai-letta.md)

### Relationship to Other Memory Tiers

Core memory sits at the top of a three-tier hierarchy:

| Tier | Location | Access | Bounded by |
|------|----------|--------|------------|
| Core memory | System prompt (in-context) | Always present | Character limit per block |
| Recall memory | Database | Explicit search via `conversation_search` | Storage capacity |
| Archival memory | Vector database | Explicit search via `archival_memory_search` | Storage capacity |

The critical distinction: recall and archival memory require the agent to search. Core memory requires nothing — it shows up whether the agent asks for it or not. This is both the strength and the design constraint.

[Source](../raw/deep/repos/letta-ai-letta.md)

### The Mem-alpha Variant

Mem-alpha (UCSD, arXiv:2509.25911) uses a structurally similar but operationally different core memory. Its implementation in `memory.py` defines core as a single string capped at 512 tokens — stricter than Letta's per-block limit. The key difference is *how* an agent decides what goes there: Mem-alpha trains a 4B-parameter model via GRPO (reinforcement learning) to autonomously decide when information deserves core placement versus semantic or episodic storage.

The RL reward function:
```
reward = QA_accuracy + beta * compression_reward + gamma * content_type_reward
```

The `content_type_reward` (gamma=0.1) penalizes misclassification — putting episodic facts in semantic memory, or transient details in core. This teaches the model that core memory is for essential invariants, not everything important.

Trained on 30K-token contexts, Mem-alpha's core memory management generalizes to 400K+ tokens (self-reported; the 13x length generalization claim has not been independently validated).

[Source](../raw/deep/repos/wangyu-ustc-mem-alpha.md)

### MIRIX's Six-Tier Extension

MIRIX extends the core memory concept into a six-agent architecture: Core, Episodic, Semantic, Procedural, Resource, and Knowledge Vault — each managed by a dedicated subagent. Core memory in MIRIX retains the MemGPT/Letta semantics (user identity, persona), but specialized stores handle different information types. The design argument is that routing queries to domain-specific stores outperforms a flat vector index for retrieval relevance.

[Source](../raw/repos/mirix-ai-mirix.md)

## Who Implements It

- **[Letta](../projects/letta.md)** — the canonical production implementation; core memory is a first-class API concept with block CRUD operations, shared blocks across agents, and visual inspection in the Agent Development Environment
- **[MemGPT](../projects/memgpt.md)** — the research origin; the MemGPT paper introduced the concept in the context of document QA and multi-session chat
- **Mem-alpha** — research extension that trains core memory management as a learnable RL policy
- **MIRIX** — production personal assistant that forks Letta's framework and extends core memory with five additional specialized memory types

## Strengths

**Guaranteed availability.** Core memory does not fail retrieval. A vector search can return nothing relevant; a keyword search can miss the right document. Core memory shows up on every turn, regardless of query quality. For baseline facts that must never be missing (the user's name, the agent's role, critical constraints), this reliability is worth the context cost.

**Agent self-awareness.** Because core memory appears in the system prompt with explicit character counts and limits, the agent knows how full its own memory is. This enables proactive management — the agent can reorganize blocks when approaching capacity, rather than silently truncating.

**Inspectable and overridable.** Unlike fine-tuned weights or opaque vector stores, core memory is readable text. Developers can inspect exactly what the agent "knows," modify it through the API, and override incorrect information without retraining.

**Cross-agent sharing.** In Letta, multiple agents can reference the same block. A researcher agent and a reviewer agent can share a `project_context` block, reading and writing to shared state without message passing.

## Critical Limitations

**Character limits are a blunt instrument.** Letta enforces per-block character limits, not token limits or information-theoretic relevance. A block at 5,000 characters might consume wildly different token counts depending on content density. More importantly, the limit forces the agent to decide what to drop based on length rather than importance. When a block fills up, the agent must either truncate, reorganize, or lose something — and there is no algorithm ensuring the right thing gets dropped.

**Concrete failure mode:** An agent managing a long user relationship accumulates preferences, constraints, and history in the `human` block. As the block approaches its limit, `core_memory_append` calls fail silently or require the agent to call `rethink_memory`, regenerating the entire block. A model with weak instruction-following may omit important facts during regeneration. Information loss is undetectable — the agent does not know what it forgot, and neither does the developer without comparing block snapshots.

**Unspoken infrastructure assumption:** Core memory in Letta requires PostgreSQL for persistence. The blocks are fetched from the database before every LLM call via `_rebuild_memory_async`. In high-frequency agent deployments, this is a per-turn database read. The documentation does not address connection pooling, read latency under load, or what happens if the database is briefly unavailable mid-conversation. Any infrastructure running Letta at scale inherits this dependency without explicit guidance on managing it.

## When NOT to Use It

**Don't use core memory for information that changes frequently.** If a fact updates every few turns (current task status, recent search results, running totals), storing it in core memory means the agent repeatedly pays tool-call overhead to update blocks. Use in-context variables or passing data through message content instead.

**Don't use core memory as a substitute for structured storage.** Core memory stores unstructured text. "What is Alice's relationship to Bob?" requires the agent to parse its own block text on every turn. For applications with many entities and relationships, a knowledge graph (see [Graphiti](../projects/graphiti.md) or [Knowledge Graph](../concepts/knowledge-graph.md)) handles relational queries far more efficiently.

**Don't rely on core memory for information that requires temporal reasoning.** Core memory is a static snapshot; it does not inherently track when facts changed or sequence events. If the application needs to reason about "what did the user say last Tuesday versus today," recall memory with timestamp filtering is the right tool.

**Don't use it when context is already scarce.** Each block plus its metadata header consumes tokens on every turn. An agent with five blocks might spend 300+ tokens just on memory scaffolding before any task content. For models with small context windows or tasks with long tool outputs, core memory competes for space that productive reasoning needs.

## Unresolved Questions

**How should blocks be sized across different model context windows?** The 5,000-character default per block and 512-token limit in Mem-alpha were chosen for specific models. There is no published guidance on how to calibrate block sizes when switching models with different context windows, or how to detect when block sizes are causing degraded performance.

**What prevents core memory from becoming a dumping ground?** Without a compression reward (like Mem-alpha's beta parameter), agents trained to be "helpful" may fill core memory with everything they encounter rather than curating for importance. Letta's documentation describes reorganization as a capability, but there is no mechanism that enforces it. Memory hygiene depends entirely on prompt engineering and model quality.

**Governance at scale:** In multi-agent deployments with shared blocks, there is no documented conflict resolution when two agents attempt to update the same block simultaneously. The block system uses database persistence, but the documentation does not address concurrent write behavior, optimistic locking, or what happens when agents diverge in their view of shared state.

**Cost at scale:** Every Letta agent turn includes a database read (fetch blocks) and potentially a database write (update blocks). For a deployment with thousands of concurrent agents, the per-turn cost of the block persistence layer is undocumented.

## Alternatives and Selection Guidance

**Use [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)** when the information volume exceeds what fits in a fixed context block, retrieval accuracy is acceptable, and you can tolerate occasional misses. RAG scales where core memory cannot.

**Use [Episodic Memory](../concepts/episodic-memory.md)** for time-stamped event storage where recency and sequence matter more than guaranteed presence in every prompt.

**Use [Semantic Memory](../concepts/semantic-memory.md)** for large factual knowledge bases where search over many documents is more useful than guaranteed availability of a few facts.

**Use [Long-Term Memory](../concepts/long-term-memory.md) systems like [Mem0](../projects/mem0.md) or [Zep](../projects/zep.md)** when you want automatic extraction without requiring the agent to explicitly manage what gets stored. These trade the agent's fine-grained control for operational simplicity.

**Use [Graphiti](../projects/graphiti.md)** when the knowledge base contains many entities with relationships and you need structured queries across them. The knowledge graph handles relational reasoning that core memory's unstructured text cannot.

**Use core memory** when a small set of facts must be present on every turn without fail — the user's identity, the agent's persona, critical constraints that should never be absent. Keep it small, keep it stable, and use other memory tiers for everything that retrieval can handle.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader taxonomy of memory in agent systems
- [Context Engineering](../concepts/context-engineering.md) — managing what goes into the context window and when
- [Context Management](../concepts/context-management.md) — strategies for fitting relevant information into fixed context windows
- [Short-Term Memory](../concepts/short-term-memory.md) — the in-context counterpart; messages and immediate state rather than persistent facts
- [Procedural Memory](../concepts/procedural-memory.md) — agent skills and behaviors, often stored separately from factual core memory
- [Memory Evolution](../concepts/memory-evolution.md) — how agent memory changes over time, including core memory updates

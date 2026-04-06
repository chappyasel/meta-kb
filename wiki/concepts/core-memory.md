---
entity_id: core-memory
type: concept
bucket: agent-memory
abstract: >-
  Core Memory: always-in-context text blocks an agent can read and self-modify
  via tool calls, giving it persistent working memory without
  retrieval—pioneered by MemGPT/Letta.
sources:
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/letta-ai-letta.md
related:
  - rag
  - episodic-memory
  - semantic-memory
last_compiled: '2026-04-06T02:08:19.528Z'
---
# Core Memory

## What It Is

Core memory is a named text block, or set of blocks, that occupies a permanent slot in an LLM agent's system prompt. Unlike retrieval systems that pull facts into context on demand, core memory is always there. The agent can read it implicitly (it is part of every prompt) and write to it explicitly through tool calls.

The pattern originated with MemGPT (now [Letta](../projects/letta.md)) and has since been adopted by multi-agent frameworks including MIRIX. The canonical implementation in Letta exposes blocks labeled `human` and `persona`, each with a character limit and a description the model can see. The mem-alpha research system (arXiv:2509.25911) formalizes a third tier: a 512-token core block trained via reinforcement learning to hold only the most important invariants from a long document.

## Why It Matters

Every LLM has a fixed context window. RAG-based approaches ([Retrieval-Augmented Generation](../concepts/rag.md)) solve the window problem by retrieving facts on demand, but retrieval can miss things, inject irrelevant passages, and forces the agent to wait for a query before it can access basic facts about itself or the user. Core memory sidesteps all three problems: the most essential facts are guaranteed to appear in every call, with zero retrieval latency and zero recall failure.

The cost is constant token consumption. Whatever is in core memory is always paying rent. This makes the boundary decision non-trivial: what belongs in core memory versus [episodic memory](../concepts/episodic-memory.md) or [semantic memory](../concepts/semantic-memory.md)?

## How It Works

### The Letta Implementation

In Letta's codebase (`letta/schemas/memory.py`, `letta/schemas/block.py`), core memory is a `Memory` object containing a list of `Block` instances:

```python
class Block(BaseBase):
    value: str        # The actual text content
    limit: int        # Character limit
    label: str        # e.g., "human", "persona"
    description: str  # Shown in context so the agent knows what the block is for
    read_only: bool   # Whether the agent can modify it
```

`Memory.compile()` renders all blocks into XML-structured text injected directly into the system prompt:

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

The agent sees the character count and limit explicitly, so it knows how much budget remains.

Three tools let the agent modify its own core memory:

- **`core_memory_replace(label, old_content, new_content)`** — Exact string replacement. If `old_content` is not found, it raises `ValueError`. This forces precision and prevents accidental overwrites.
- **`core_memory_append(label, content)`** — Appends with a newline. Simple, but causes fragmentation over time.
- **`rethink_memory(new_memory, target_block_label)`** — Wholesale rewrite of a block. The agent regenerates the entire block content. This is the only way to reorganize a fragmented block.

A newer multi-command tool (`memory()`) treats blocks as files with git-backed versioning, supporting line-level insertions, deletions, and renames.

Before each LLM call, `BaseAgent._rebuild_memory_async()` refreshes blocks from the database and recompiles the system prompt. If blocks have changed (by another agent or by the API), the agent sees the updated state.

### The Mem-alpha Implementation

The mem-alpha research system (`memory.py`) defines core memory as a single string capped at 512 tokens:

```python
class Memory:
    core: str = ""   # Max 512 tokens, always in system prompt
    semantic: List[Dict[str, str]]
    episodic: List[Dict[str, str]]
```

Rather than hand-writing rules about what goes in core memory, mem-alpha trains a 4B-parameter model (Qwen3-4B via GRPO) to make that decision from experience. The training signal is QA accuracy: if the constructed memory helps a separate 32B model answer questions correctly, the 4B model gets positive reward. A compression penalty (beta=0.05) discourages bloat. A content-type reward (gamma=0.1) encourages correct routing between core, semantic, and episodic stores.

The result is a model that generalizes: trained on 30K-token contexts, it constructs useful core memories for 400K+ token inputs. The 13x length generalization suggests the model learned principled selection criteria, not length-specific heuristics.

### The MIRIX Implementation

MIRIX extends the pattern to six specialized memory agents: Core, Episodic, Semantic, Procedural, Resource, and Knowledge Vault. Core memory in MIRIX stores user identity and persona information (the `human` and `persona` blocks from Letta's design), while the other five agents handle domain-specific storage. A meta-agent routes incoming information to the appropriate specialized store rather than treating all memory as equivalent. This improves retrieval relevance by avoiding a flat vector index where semantically distinct memory types compete for the same search results.

## The Three-Tier Memory Model

Core memory is one tier in a hierarchy:

| Tier | Location | Access | Purpose |
|------|----------|--------|---------|
| **Core** | System prompt | Always present | Essential persistent facts |
| **[Episodic](../concepts/episodic-memory.md)** | External store | Retrieve on demand | Past events, conversation history |
| **[Semantic](../concepts/semantic-memory.md)** | External store | Retrieve on demand | General facts, domain knowledge |

The MemGPT paper frames this as a virtual memory model: core memory is RAM (always accessible), archival stores are disk (must be paged in). The agent manages its own paging via tool calls. When a fact in episodic or semantic memory becomes critical enough to need guaranteed access, the agent can promote it to core memory. When core memory fills up, the agent must decide what to demote or compress.

## Failure Modes

**Fragmentation.** Repeated `core_memory_append` calls turn blocks into an unordered list of facts. The agent accumulates stale or redundant entries because appending is cheaper than reorganizing. Without explicit invocation of `rethink_memory`, block hygiene degrades over long sessions.

**Block limit as a proxy for importance.** Letta's character limits are per-block and per-label, not a global information budget. An agent with five 5,000-character blocks can consume 25,000 characters of context even if only 200 characters of that is load-bearing. There is no mechanism to enforce that core memory contains only high-value information; the agent must learn this on its own, and weaker models fail at it.

**Exact-match replacement brittleness.** `core_memory_replace` requires the agent to reproduce the exact existing text before it can replace it. If the agent paraphrases or misremembers a fact it wants to update, the replacement fails. This is a deliberate design choice to prevent sloppy overwrites, but it creates friction for models that don't maintain precise internal representations of their own memory state.

**No automatic promotion.** Nothing promotes relevant archival facts into core memory automatically. If the agent forgets to check archival storage and a fact there is relevant, it stays on disk. The agent must manage this proactively, which requires a level of self-awareness about what it knows and doesn't know.

**Compression without semantics.** In mem-alpha, the 512-token core limit forces aggressive compression. High-frequency, low-information text (proper names, dates) competes directly with nuanced relational facts. The RL training signal (QA accuracy) rewards whatever produces correct answers, not whatever is epistemically important, so the selected content reflects the bias of the training QA pairs.

**Quality depends on model quality.** Since the agent writes its own core memory, memory quality is bounded by the model's reasoning capability. A weak model may overwrite important facts, fail to notice that two entries are redundant, or store trivia and omit crucial context. Letta's sleeptime agent pattern addresses this by dedicating a separate (potentially stronger) model to memory consolidation, but this adds infrastructure complexity.

## When NOT to Use Core Memory

**When you have many distinct entities.** Core memory is unstructured text. If your agent needs to track 50 users, each with multiple attributes and relationships, stuffing all of that into blocks scales poorly. Use a [knowledge graph](../concepts/knowledge-graph.md) or structured store ([Graphiti](../projects/graphiti.md), [Zep](../projects/zep.md)) instead.

**When facts change frequently.** Every update to core memory requires an LLM tool call. If facts change on every turn, the agent spends significant compute on self-editing rather than task completion. A dynamic key-value store with automatic retrieval ([Mem0](../projects/mem0.md)) handles high-churn facts more efficiently.

**When context window cost matters most.** Core memory pays constant token rent. If your agent handles many short, stateless queries where persistent context adds no value, the overhead is pure cost. Use stateless prompts and on-demand retrieval instead.

**When you need structured queries.** Core memory cannot answer "what is Alice's relationship to Bob?" without the agent parsing its own block text at inference time. For relational reasoning over many entities, use a structured store.

## Relationship to Related Concepts

Core memory is one component of the broader [agent memory](../concepts/agent-memory.md) taxonomy. It operates alongside [episodic memory](../concepts/episodic-memory.md) (event logs, retrievable by query) and [semantic memory](../concepts/semantic-memory.md) (general facts, retrievable by query). Together these three form the storage hierarchy that lets agents operate across sessions without losing context.

The tension between core memory and [retrieval-augmented generation](../concepts/rag.md) is architectural: RAG pulls facts into context when needed; core memory keeps facts in context always. Neither approach is universally better. Core memory wins on reliability and latency; RAG wins on breadth and token efficiency. Production systems typically use both: core memory for identity and session-critical facts, RAG for the long tail of domain knowledge.

[Memory consolidation](../concepts/memory-consolidation.md) describes the process of moving facts between tiers. In Letta, the sleeptime agent performs consolidation asynchronously. In mem-alpha, the "rethink" mode lets the memory agent reorganize entries between core, semantic, and episodic stores during processing. Both approaches recognize that the initial routing decision made when a fact is first observed may not be optimal as context accumulates.

[Context engineering](../concepts/context-engineering.md) provides the broader frame: core memory is one technique for managing what appears in the context window and when. The character limits, block labels, and compilation templates are all levers for controlling context composition.

## Unresolved Questions

**Optimal block granularity.** Should core memory be one block or many? Letta defaults to `human` and `persona` but allows arbitrary labels. MIRIX uses six specialized stores. Mem-alpha uses one 512-token string. There is no empirical guidance on how granularity affects agent performance across task types.

**Cross-agent consistency.** Letta supports shared memory blocks that multiple agents read and write concurrently. The documentation does not specify a concurrency model for concurrent writes. If two agents update the same block in the same time window, what happens? This is not addressed in publicly available documentation.

**Optimal compression point.** Mem-alpha's ablation studies show that beta=0.05 (compression penalty) and gamma=0.1 (content-type reward) outperform alternatives, but these hyperparameters were tuned on a specific dataset mix (SQuAD, HotpotQA, BookSum, PubMed-RCT, PerlTQA, TTL, LME). Whether they transfer to production agent workloads is an open question. The paper's benchmark results are self-reported on MemoryAgentBench; no independent replication exists at time of writing.

**Learning vs. engineering.** Mem-alpha demonstrates that memory routing can be learned via RL rather than hand-designed. Letta's approach hand-designs the routing (the agent decides via in-context reasoning). Neither approach has been systematically compared across domains with controlled experiments.

## Alternatives

- **[Retrieval-Augmented Generation](../concepts/rag.md)**: Use when facts are too numerous for a fixed budget, or when you need breadth over guaranteed recall.
- **[Mem0](../projects/mem0.md)**: Use when you want automatic fact extraction and don't want to manage block content manually.
- **[Graphiti](../projects/graphiti.md) / [Zep](../projects/zep.md)**: Use when your domain involves many named entities with relationships that need structured queries.
- **[Letta](../projects/letta.md)**: Use when you want the full self-editing memory platform that core memory originated in, with multi-agent support and sleeptime consolidation.

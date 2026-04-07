---
entity_id: memory-decay
type: concept
bucket: agent-memory
abstract: >-
  Memory decay models the fading of stored memories over time via
  salience/recency functions, letting agent memory systems prioritize fresh and
  reinforced knowledge over stale data without unbounded storage growth.
sources:
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - repos/gustycube-membrane.md
  - repos/caviraoss-openmemory.md
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
related:
  - rag
  - semantic-memory
  - episodic-memory
last_compiled: '2026-04-07T01:01:25.038Z'
---
# Memory Decay

## What It Is

Memory decay is the deliberate reduction of a stored memory's retrieval priority (or its outright removal) as time passes or as contradicting evidence accumulates. In human cognition, Hermann Ebbinghaus described the forgetting curve in 1885: retention drops rapidly after first encoding, then levels off. Agent memory systems borrow this model not because LLMs literally "forget" but because it solves a real engineering problem. Without decay, every memory is equally retrievable forever. The agent buries useful recent context under an ever-growing pile of stale facts.

Decay is a function applied to a memory's **salience** or **confidence** score. It does not delete the raw content immediately; it lowers the score until retrieval stops surfacing the record, and optionally triggers pruning when the score reaches zero.

## Why It Matters

The naive alternative to decay is append-only storage with flat retrieval. A vector search returns semantically similar content regardless of age. A user preference recorded eighteen months ago ranks identically to one recorded yesterday. For short-horizon tasks this is fine. For long-running agents, persistent companions, or coding assistants that accumulate sessions over months, it becomes a liability: outdated preferences, superseded facts, and obsolete procedures compete with current context.

Decay addresses three distinct failure modes:

1. **Staleness**: A fact was true once and is now wrong. Decay + supersession removes it from retrieval without requiring a delete.
2. **Context flooding**: A productive session six months ago generated fifty episodic memories that now crowd out this week's work. Decay demotes them.
3. **Storage cost**: Unbounded growth in a vector database raises both storage and retrieval latency. Decay-triggered pruning provides a principled cleanup policy.

## How It Works

### The Ebbinghaus Curve in Practice

The canonical formula is:

```
R(t) = e^(-t/S)
```

where `R` is retention, `t` is elapsed time since last access, and `S` is the stability constant — a memory-specific parameter that determines how fast the record fades. Memories with higher initial importance get larger `S`; trivial observations get smaller `S`.

[MemoryBank](../repos/zhongwanjun-memorybank-siliconfriend.md) implements this directly. Its memory updating mechanism assigns a stability value when each memory is created, then runs background jobs that multiply current salience by `e^(-Δt/S)`. Each successful retrieval resets `t`, implementing what Ebbinghaus called "spaced repetition": memories that get used stay sharp.

Membrane's decay job (runs every hour by default) applies an exponential curve across all records. Records with the `auto_prune` policy are deleted when salience hits zero. The configuration exposes `decay_interval` and per-record stability, letting operators tune how aggressively the system forgets.

OpenMemory's decay engine operates per memory sector (episodic, semantic, procedural, emotional, reflective), with different decay rates per sector. Episodic memories — specific events — decay faster than semantic memories — stable facts. A conversation snippet from three weeks ago decays faster than "user prefers dark mode."

### Salience as a Composite Score

Modern systems decouple decay from the raw timestamp by routing it through a salience score. Salience typically combines:

- **Recency**: time since creation or last access
- **Frequency**: how often this memory has been retrieved
- **Reinforcement**: explicit signals that the memory was useful (Membrane's `Reinforce` operation; OpenMemory's `openmemory_reinforce` tool)
- **Penalization**: explicit signals that the memory was wrong or irrelevant (Membrane's `Penalize` operation)

Retrieval then uses a hybrid score: vector similarity × salience. A highly similar but stale record can be outranked by a less similar but fresh one. Membrane's lifecycle eval demonstrates this concretely: with pure vector search (RAG), a stale deployment target (Heroku, replaced by Kubernetes) ranks first because cosine similarity is high. With decay-weighted retrieval, the fresh record wins. [Source](../raw/repos/gustycube-membrane.md)

### Reinforcement as the Complement

Decay without reinforcement is one-sided forgetting. The full model requires both directions. When retrieval produces a record that proves useful, the agent (or the user) reinforces it. This resets the decay clock and may increase the stability constant. Memories that get used regularly asymptotically resist decay; memories that are never retrieved fade out. This creates a natural selection pressure toward useful knowledge.

### Pruning

Pruning is the physical deletion step that decay enables. Records with salience above zero remain in storage; they just rank lower. Records that hit zero are candidates for pruning if they carry an `auto_prune` flag. This keeps storage bounded without requiring manual garbage collection.

Membrane surfaces `active_records` vs total records in its metrics endpoint, making the prune rate observable. OpenMemory's decay engine handles pruning per sector.

## Who Implements It

Three architectures appear across current agent memory systems:

**Background job decay**: A scheduled process (hourly, daily) scans all records and applies the decay formula. Membrane and MemoryBank use this pattern. It is simple and auditable but creates a step function: a record's salience is stale between jobs.

**Query-time decay**: Salience is computed fresh during retrieval using the current timestamp. This is more accurate but adds compute to every query. OpenMemory's composite scoring runs at query time.

**Event-driven decay**: Decay is triggered by specific events (new contradicting information, explicit user correction) rather than the clock. Membrane's `Penalize` operation and `Contest` operation implement this alongside time-based decay.

## Failure Modes

**Decay erases context that returns**: A user stops using an agent for four months, then returns. Memories of their preferences have decayed. The agent behaves as if meeting them for the first time. MemoryBank addresses this by tying stability to "significance," but significance is hard to assess at ingestion time.

**Uniform decay ignores memory type**: A system that applies the same decay rate to a user's birthday and to a one-off scheduling request will either forget the birthday too fast or hold the scheduling request too long. Per-sector decay rates (as in OpenMemory) mitigate this, but require correct sector classification upstream.

**Memory evolution without version history**: When a new memory triggers updates to existing memories (as in A-MEM's memory evolution mechanism), and decay then reduces those updated records, there is no way to reconstruct what was believed at an earlier point in time. Zep's bi-temporal indexing addresses this by separating "valid time" (when something was true) from "system time" (when it was recorded), but most systems lack this distinction. [Source](../raw/deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md)

**Adversarial manipulation via reinforcement**: If an agent can be prompted to reinforce incorrect memories, decay becomes a mechanism for entrenching misinformation. A wrong fact that gets reinforced repeatedly will survive indefinitely.

**Calibration opacity**: Decay rates and stability constants are typically set as engineering defaults, not derived from observed retrieval utility. Membrane exposes `retrieval_usefulness` as a metric (ratio of reinforce actions to total audit entries), but few systems use this feedback to auto-calibrate decay parameters.

## Implementation Patterns

**Exponential decay with spaced repetition**: Standard for personal assistant and companion applications. MemoryBank's SiliconFriend uses this. Effective when user interaction is the primary signal.

**Salience-weighted hybrid retrieval**: Multiply cosine similarity by current salience. Used in Membrane and OpenMemory. Requires a vector backend that supports score manipulation at query time (pgvector with custom scoring; Qdrant with payload filtering).

**Typed decay rates**: Assign different stability constants to different memory types. Episodic memories get short half-lives; semantic facts get long ones. OpenMemory's sector-based model and Membrane's typed memory records both support this.

**Decay + supersession**: For facts that become false (not just less relevant), pair decay with an explicit supersession operation. Membrane's `Supersede` sets old record salience to zero immediately rather than waiting for gradual decay. This is the correct pattern for factual updates.

## Practical Implications

Decay is not always appropriate. Append-only memory with no decay is correct for audit trails, debugging logs, and compliance contexts where the historical record must be preserved exactly. Decay is appropriate when retrieval quality over time matters more than completeness.

For most long-lived agent deployments, the minimum viable implementation is: store a `created_at` timestamp and a `last_accessed_at` timestamp, compute a simple recency score at query time, and multiply it into the retrieval ranking. This beats flat retrieval without requiring a background job infrastructure.

The more sophisticated patterns (reinforcement, per-sector rates, supersession, pruning) become necessary at scale or when the agent needs to handle factual updates gracefully.

## Related Concepts

- [Episodic Memory](../concepts/episodic-memory.md): The memory type most subject to decay; short-lived events fade faster than stable facts.
- [Semantic Memory](../concepts/semantic-memory.md): Stable facts typically warrant slower decay rates than episodic records.
- [Retrieval-Augmented Generation](../concepts/rag.md): Decay modifies the retrieval step; flat RAG pipelines ignore time entirely.
- [Agent Memory](../concepts/agent-memory.md): The broader architecture within which decay operates.
- Long-Term Memory: Decay determines what survives into genuine long-term storage vs. what fades.
- [Core Memory](../concepts/core-memory.md): Often implemented as decay-exempt; pinned records that persist regardless of age.
- [Continual Learning](../concepts/continual-learning.md): Decay and forgetting connect to catastrophic forgetting and knowledge update problems in learned models.

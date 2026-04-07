---
entity_id: memory-evolution
type: concept
bucket: agent-memory
abstract: >-
  Memory Evolution: the process by which agent memory improves over time through
  summarization, merging, decay, and reorganization — distinct from static
  storage or one-shot RAG retrieval.
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/caviraoss-openmemory.md
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/caviraoss-openmemory.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
related:
  - rag
  - semantic-memory
  - openai
  - episodic-memory
  - mcp
  - mem0
  - vector-database
last_compiled: '2026-04-07T11:57:20.208Z'
---
# Memory Evolution

## What It Is

Memory evolution describes how an agent's stored knowledge changes over time, not just accumulates. Where static memory systems append new information and retrieve it via similarity search, evolving memory systems transform, consolidate, decay, and reorganize existing memories in response to new experience.

The distinction matters because accumulation without evolution degrades. A memory store that only appends becomes noisy as outdated facts persist alongside current ones, common patterns stay buried in individual records, and retrieval quality drops as the store grows. Evolution adds the mechanisms that keep memory useful at scale: decay removes stale or redundant content, consolidation synthesizes patterns from raw observations, and reorganization updates semantic relationships when new information changes the meaning of what was already stored.

This concept spans several related ideas. [Continual Learning](../concepts/continual-learning.md) addresses the model-weight version of the same problem. Memory evolution addresses the external memory store that agents read and write at runtime, without requiring gradient updates.

## Why It Matters

LLM agents are stateless by default. Each conversation starts from zero unless the system explicitly provides context. Early solutions for this were either crude (dump everything into the context window) or shallow (retrieve similar chunks via embedding search). Both break for long-horizon tasks: context windows fill up, and similarity search degrades when thousands of documents have similar embeddings.

Memory evolution addresses this by treating memory as a living structure. Instead of asking "what is most similar to this query?", an evolved memory system can ask "what is most relevant, given what this agent has learned, how recently it was reinforced, and how it connects to related knowledge?" These are different questions, and the second produces better answers for agents operating over days or weeks.

The practical pressure here comes from two directions. Coding assistants like [Cursor](../projects/cursor.md) and [Claude Code](../projects/claude-code.md) need persistent context about codebases, not just per-session retrieval. Personal assistants and research agents need memory that reflects changing circumstances, where what was true six months ago may conflict with what is true now.

## Core Mechanisms

### Decay

Decay removes or attenuates memories over time. The simplest form is TTL expiration: delete records older than N days. More sophisticated systems implement continuous decay that reduces a memory's retrieval weight as a function of time since last access, modulated by salience.

The psychologically-grounded version uses a dual-phase decay curve, modeling the Ebbinghaus forgetting curve. OpenMemory implements this directly in `src/ops/dynamics.ts`:

```typescript
const f = Math.exp(-LAMBDA_ONE_FAST_DECAY_RATE * t);      // 0.015
const s = THETA_CONSOLIDATION * Math.exp(-LAMBDA_TWO * t); // 0.4 * exp(-0.002t)
return Math.max(0, Math.min(1, f + s));
```

The fast component (λ=0.015) models initial rapid forgetting. The slow component (THETA=0.4, λ=0.002) represents consolidated residual — knowledge that survived the initial forgetting curve and now persists as long-term memory. The sum gives a retention value between 0 and 1 that affects both retrieval scoring and storage decisions.

Different memory types decay at different rates. In OpenMemory's sector model (`src/memory/hsg.ts`), emotional memories decay fastest (λ=0.02), episodic memories moderately (λ=0.015), procedural knowledge more slowly (λ=0.008), and reflective insights slowest of all (λ=0.001). This mirrors what cognitive science observes: specific event memories fade faster than abstract procedural knowledge.

Decay also drives storage optimization. As memories cool, OpenMemory compresses their vector representations via mean pooling, reducing from 1536 dimensions to as few as 64. Cold memories occupy less storage while remaining retrievable. Regeneration restores full fidelity when a cold memory is accessed again.

### Consolidation and Summarization

Raw memories accumulate as individual observations. Consolidation synthesizes patterns from these observations into higher-order knowledge.

The A-MEM paper demonstrates this through memory evolution triggered by new information. When a new memory arrives, the system does not just store it — it retrieves related existing memories and updates their contextual descriptions to reflect the new information. A note about a project deadline gets updated when a new memory records that project's cancellation. This is the crucial step: new information reshapes the semantic landscape of historical context, not just adds to it.

A-MEM's ablation study quantifies consolidation's contribution directly. On multi-hop reasoning (LoCoMo benchmark), the full system scores 45.85 F1. Remove memory evolution but keep link generation: 31.24. Remove both: 24.55. Memory evolution alone contributes +14.61 F1 on multi-hop tasks — the task type that most requires synthesizing across multiple observations. (These results are self-reported in the A-MEM paper, not independently validated.)

OpenMemory's reflection system (`src/memory/reflect.ts`) runs a periodic background job that clusters memories by Jaccard similarity, scores them by frequency and recency, and creates new "reflective" memories summarizing the patterns. The implementation is extractive rather than abstractive — it produces `"N sector pattern: content1; content2; ..."` rather than synthesized insights. Reflective memories receive the slowest decay rate (λ=0.001), encoding the system's belief that synthesized patterns should persist longer than raw observations.

[RAPTOR](../projects/raptor.md) applies similar logic to documents: build a tree of progressively higher-level summaries, then search at the appropriate level of abstraction. This is consolidation applied to retrieval indexing rather than agent memory specifically.

General Agentic Memory (GAM) handles consolidation for long agent trajectories by chunking the trajectory at semantic boundaries, generating structured summaries (Memory + TLDR) for each chunk, and organizing these into a hierarchical taxonomy. The trajectory is compressed into a navigable structure without discarding the original operations.

### Merging and Reorganization

Merging combines related memories into unified representations. When an agent has accumulated ten observations about a user's coding preferences, merging produces one consolidated preference profile. This reduces retrieval noise and context window consumption.

[Mem0](../projects/mem0.md) treats this as a core operation: when new information conflicts with or extends existing memories, the system produces an UPDATE operation rather than an INSERT, maintaining a coherent single representation. The implementation uses an LLM to determine whether new content should create a new memory, update an existing one, or delete a contradiction.

Reorganization updates the relationship structure between memories. A-MEM implements this through bidirectional link generation: when a new memory is integrated, it identifies related existing memories via cosine similarity, then uses an LLM to determine which connections are semantically meaningful and establishes bidirectional links. The links are schema-free — the LLM decides what constitutes a meaningful connection, so the relationship types emerge from content rather than a predefined ontology.

OpenMemory encodes cross-sector relationships in an explicit adjacency matrix:

```typescript
export const sector_relationships: Record<string, Record<string, number>> = {
    episodic: { reflective: 0.8, semantic: 0.6, procedural: 0.6, emotional: 0.7 },
    semantic: { procedural: 0.8, episodic: 0.6, reflective: 0.7, emotional: 0.4 },
    ...
};
```

These weights affect retrieval: a query against episodic memories also surfaces reflective memories with a 0.8 cross-sector boost. The asymmetry is deliberate — the relationship strengths encode assumptions about how memory types relate.

### Temporal Fact Management

Temporal evolution tracks how facts change over time, not just that they changed. A standard key-value memory store would overwrite "CompanyX CEO is Alice" with "CompanyX CEO is Bob" and lose the history. A temporally-aware system records that Alice was CEO from 2021 to 2024 and Bob has been CEO since 2024, enabling point-in-time queries.

OpenMemory's temporal graph (`src/temporal_graph/`) implements bitemporal fact management. When a new contradicting fact arrives for the same subject+predicate pair, the previous fact's `valid_to` is set to just before the new fact's `valid_from`. Historical queries return different answers than present-tense queries, and the full timeline is queryable.

Confidence decay applies to open-ended facts: each day a fact remains unverified, its confidence decays by a small amount, with a floor of 0.1. Facts never disappear from the temporal graph — they just become less certain — which preserves auditability while surfacing uncertainty about stale knowledge.

[Zep](../projects/zep.md) and [Graphiti](../projects/graphiti.md) implement similar temporal graph approaches. Graphiti maintains episode-based temporal edges in a knowledge graph, recording when edges were established and invalidated.

### Reinforcement

Evolution moves in both directions: memories decay when not accessed and strengthen when accessed or explicitly reinforced. Reinforcement increments coactivation counts and boosts salience scores. In OpenMemory's scoring model, memories with coactivations > 5 or salience > 0.7 are classified as "hot" and receive the slowest decay rate (λ=0.005). Frequently accessed memories are implicitly preserved without manual curation.

A-MEM's reflection system also reinforces source memories when it creates a synthesis — the sources receive a 1.1x salience boost — encoding the intuition that memories which generate insights are more valuable than those that do not.

## Implementations

Several projects implement different subsets of memory evolution:

**[Mem0](../projects/mem0.md)** focuses on semantic memory merging. Its core operation set (ADD, UPDATE, DELETE, NOOP) produces coherent single-memory representations from a stream of interactions. The LLM determines when new information should update versus extend existing memories.

**[Letta](../projects/letta.md)** implements [Core Memory](../concepts/core-memory.md) with explicit editing tools that agents use to maintain their own working knowledge. The agent can call `core_memory_append`, `core_memory_replace` as tools — evolution driven by the agent's own judgment rather than automated background processes.

**[Zep](../projects/zep.md)** and **[Graphiti](../projects/graphiti.md)** handle temporal evolution through knowledge graphs with bi-temporal indexing. Zep reports +48.2% improvement on temporal reasoning tasks on the [LongMemEval](../projects/longmemeval.md) benchmark (self-reported).

**OpenMemory** (caviraoss) implements the most complete evolution model: dual-phase decay, sector-specific decay rates, automatic reflection, vector compression for cold memories, temporal fact management, and reinforcement. The implementation is locally-hosted TypeScript/Python with SQLite storage.

**A-MEM** demonstrates that memory evolution at ingestion time — updating existing memories when new information arrives — produces 149% improvement on multi-hop reasoning (GPT-4o-mini, LoCoMo benchmark) while using 85% fewer tokens than full-context retrieval. These figures are self-reported.

**[Voyager](../projects/voyager.md)** and **[Agent Workflow Memory](../projects/agent-workflow-memory.md)** implement procedural memory evolution: skills that get refined or expanded as the agent succeeds or fails at tasks.

## Failure Modes

**Cascading evolution errors.** When new information triggers updates to existing memories, incorrect updates propagate. A-MEM's memory evolution has no undo mechanism — if the LLM misinterprets a relationship between new and existing content, the existing memory is corrupted without a revert path. Production systems need version history on evolved memories.

**Decay parameter sensitivity.** The lambda values that govern decay rates are typically hand-tuned rather than learned. OpenMemory's parameters (λ_emotional=0.02, λ_reflective=0.001, etc.) appear to be educated guesses informed by cognitive science rather than empirically derived for LLM memory use cases. Small changes to these values can dramatically alter which memories survive long enough to be useful.

**Embedding staleness.** When memory evolution updates contextual descriptions, the embedding should be recomputed to reflect the new content. Systems that skip this step will retrieve memories using stale vector representations that no longer match the updated text. A-MEM does not clearly address this.

**Reflection quality ceiling.** Extractive consolidation (concatenating similar content) produces pattern descriptions, not insights. OpenMemory's reflection produces `"N sector pattern: content1; content2"` rather than synthesized understanding. LLM-based abstractive summarization produces better consolidations but costs more per cycle.

**Scale limits on reflection and decay.** Background jobs that iterate all memories are O(n) and become expensive at scale. OpenMemory's reflection fetches up to 100 memories per run; its decay job iterates all memories with a 60-second cooldown. Neither has the indexing infrastructure for stores with millions of records.

**[Catastrophic Forgetting](../concepts/catastrophic-forgetting.md) analog.** Aggressive decay can remove memories that seem cold but are actually important for rare edge cases. A memory about an unusual security exception that was established a year ago and never accessed since would decay toward zero, potentially removing critical context before it is needed.

## When Not to Use Memory Evolution

Memory evolution adds meaningful complexity. For agents with short interaction horizons (single-session chatbots, bounded task agents), static [Retrieval-Augmented Generation](../concepts/rag.md) with a well-maintained document store performs comparably at lower cost. The overhead of decay calculation, consolidation jobs, and temporal fact management is not justified when the memory store resets between sessions anyway.

For primarily retrieval-heavy workloads where the underlying documents do not change — legal reference, technical documentation, knowledge bases with infrequent updates — evolution mechanisms add churn without benefit. Standard RAG handles these well.

Evolution also requires more infrastructure than simple vector stores. If your deployment environment does not support background jobs, persistent storage, or the LLM call overhead for ingestion-time processing, simpler memory approaches will be more reliable.

## Relationship to Adjacent Concepts

Memory evolution is a mechanism within [Agent Memory](../concepts/agent-memory.md) broadly. It connects specifically to:

- [Episodic Memory](../concepts/episodic-memory.md) — the type most subject to time-based decay
- [Semantic Memory](../concepts/semantic-memory.md) — the type most subject to merging and consolidation
- [Procedural Memory](../concepts/procedural-memory.md) — evolved through task success/failure feedback
- [Core Memory](../concepts/core-memory.md) — the structured working memory that agents actively maintain
- [Context Compression](../concepts/context-compression.md) — related mechanism that reduces token consumption without evolution
- [Self-Improving Agent](../concepts/self-improving-agent.md) — evolution applied to agent behavior, not just memory content
- [Continual Learning](../concepts/continual-learning.md) — the model-weight analog of the same problem

## Unresolved Questions

The field has not settled on how to evaluate memory evolution quality. Benchmarks like [LongMemEval](../projects/longmemeval.md) and [LoCoMo](../projects/locomo.md) measure retrieval accuracy after memory operations, but they do not measure whether evolution-specific operations (consolidation quality, decay calibration, temporal accuracy) are contributing to observed improvements or just adding noise. Most published results are self-reported.

The cost/benefit calculation for ingestion-time evolution (A-MEM's approach: multiple LLM calls per new memory) versus background evolution (OpenMemory's reflection jobs) has not been rigorously compared. A-MEM reports 85-93% token reduction at retrieval time but does not report total cost including ingestion-time LLM calls.

There is no established approach for governing decay parameters. Most implementations hard-code values derived from cognitive science analogies. Whether these values transfer well to LLM agent contexts, or whether domain-specific tuning is necessary, remains an open question.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.4)
- [Semantic Memory](../concepts/semantic-memory.md) — part_of (0.6)
- [OpenAI](../projects/openai.md) — part_of (0.3)
- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.6)
- [Model Context Protocol](../concepts/mcp.md) — part_of (0.4)
- [Mem0](../projects/mem0.md) — implements (0.6)
- [Vector Database](../concepts/vector-database.md) — part_of (0.4)

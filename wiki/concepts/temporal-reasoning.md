---
entity_id: temporal-reasoning
type: concept
bucket: agent-memory
abstract: >-
  Temporal reasoning enables AI agents to understand when facts were true, how
  knowledge changes over time, and in what order events occurred — distinct from
  pure semantic similarity retrieval.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/caviraoss-openmemory.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - retrieval-augmented-generation
  - claude
  - model-context-protocol
last_compiled: '2026-04-08T02:57:36.141Z'
---
# Temporal Reasoning

## What It Is

Temporal reasoning is the capacity to represent, retrieve, and draw conclusions from time-ordered information. For AI agents, this means more than knowing that event A happened before event B. It requires tracking when facts were established, when they stopped being true, how relationships between entities evolved, and how to answer questions that are only meaningful at a specific point in time.

This problem is distinct from general knowledge retrieval. A semantic search for "CEO of CompanyX" returns whatever is most similar in embedding space. Temporal reasoning asks: who was CEO on March 15, 2022? Those two operations can return different answers, and conflating them produces silent errors that are hard to detect.

In the context of [Agent Memory](../concepts/agent-memory.md), temporal reasoning sits at the intersection of [Episodic Memory](../concepts/episodic-memory.md) (what happened, in order) and [Semantic Memory](../concepts/semantic-memory.md) (what is currently true). Most production memory systems treat both as the same retrieval problem and get neither right.

## Why It Matters

Language models have a training cutoff. Beyond that hard boundary, every fact they learned is frozen at the moment of data collection. For a deployed agent operating across months or years, this creates a class of failure that doesn't look like hallucination — it looks like confident use of outdated information.

But training cutoff is only the most visible form of the problem. Even within a single session or across a user's interaction history, facts change. A user who said "I'm looking for a job" three months ago may be employed today. A system that retrieves that old memory and treats it as current produces contextually wrong outputs.

The deeper issue is that most [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) architectures treat memory as an append-only log. Retrieval returns whatever scores highest against a query vector, with no mechanism to determine whether a retrieved fact is current, superseded, or historically accurate but no longer applicable. This is adequate for document retrieval where documents don't contradict each other. It breaks down for factual knowledge that evolves.

## Core Mechanisms

### Validity Windows

The foundational primitive for temporal reasoning is the validity window: a `valid_from` and `valid_to` timestamp pair attached to each fact. This converts a static fact into a temporally bounded truth claim.

```
{ subject: "CompanyX", predicate: "has_CEO", object: "Alice", valid_from: "2021-01-01", valid_to: "2024-04-09" }
{ subject: "CompanyX", predicate: "has_CEO", object: "Bob",   valid_from: "2024-04-10", valid_to: null }
```

A `valid_to: null` indicates the fact is currently asserted. Point-in-time queries filter on this window rather than treating all records as equivalent candidates.

[Zep](../projects/zep.md) implements this through its Graphiti engine. [OpenMemory](../projects/openmemory.md) exposes a `/api/temporal/fact` endpoint that handles automatic closure of prior fact windows when a new assertion about the same subject-predicate pair arrives. [Source](../raw/repos/caviraoss-openmemory.md)

### Temporal Knowledge Graphs

A temporal knowledge graph extends a standard knowledge graph by attaching validity metadata to edges rather than just nodes. This allows the graph structure itself to change over time while retaining historical states.

[Graphiti](../projects/graphiti.md) (the core engine in [Zep](../projects/zep.md)) represents the current state-of-the-art implementation. Its key architectural choice is to synthesize both unstructured conversational data and structured business data into the same temporal graph, maintaining historical relationships as first-class objects rather than archiving or deleting them. [Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

The graph enables queries that pure vector retrieval cannot answer:
- What was the relationship between X and Y at a specific date?
- How has entity X changed over time?
- Which facts about X changed most recently?

### Conflict Detection and Resolution

When a new fact contradicts an existing one, a temporal reasoning system must decide what to do. The naive approach is last-write-wins. More sophisticated systems:

1. Close the existing fact's `valid_to` to the new fact's `valid_from`
2. Retain both records for historical queries
3. Flag the transition for higher-level reasoning if the change is semantically significant

[OpenMemory](../projects/openmemory.md) describes this as "auto-evolution" — new facts close previous ones, so timeline queries remain consistent. [Supermemory](../projects/supermemory.md) handles this at the semantic layer: "I just moved to SF" supersedes "I live in NYC" rather than coexisting with it. [Source](../raw/repos/supermemoryai-supermemory.md)

### Decay and Salience

Separate from hard validity windows, some systems apply decay functions to memory salience. This models the intuition that older, less-reinforced memories should score lower in retrieval even when they remain technically valid.

[OpenMemory](../projects/openmemory.md) implements a decay engine that operates per memory sector (episodic, semantic, procedural, emotional, reflective) rather than applying a single global TTL. Composite scoring combines salience, recency, and co-activation rather than relying on cosine distance alone. [Source](../raw/repos/caviraoss-openmemory.md)

This matters for agents that need to distinguish between "user mentioned this once in passing" and "user has mentioned this consistently across ten sessions."

### Temporal Query Reformulation

An agent that knows about temporal reasoning needs to do more than store facts with timestamps. It needs to formulate retrieval queries that specify time constraints. This requires:

1. Recognizing when a user's question is temporally scoped ("what was X before the merger?")
2. Extracting the temporal constraint
3. Issuing a retrieval query that filters on validity windows rather than returning all semantically similar results

This is a parsing and reasoning problem that sits on top of the storage layer. Most current implementations handle it partially — the storage layer supports temporal queries, but the agent's query formulation is not consistently temporally aware.

## Benchmarks and Evidence

The [LongMemEval](../projects/longmemeval.md) benchmark specifically tests temporal reasoning tasks in the context of long-term agent memory. It includes cross-session information synthesis and long-term context maintenance, both of which require accurate temporal handling.

[Zep](../projects/zep.md) reports 18.5% accuracy improvement and 90% latency reduction on LongMemEval compared to baseline implementations. This is self-reported by the Zep team. [Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

[Supermemory](../projects/supermemory.md) claims #1 on LongMemEval (81.6%), [LoCoMo](../projects/locomo.md), and ConvoMem. LoCoMo explicitly includes a temporal reasoning subcategory alongside single-hop, multi-hop, and adversarial questions. These benchmarks are self-reported on the project's README, and independent reproduction is not confirmed. [Source](../raw/repos/supermemoryai-supermemory.md)

## Implementation Patterns

### Store: Append With Timestamps

Every write to a memory store should include a creation timestamp and, where applicable, a validity window. Avoid overwriting existing records; close them and create new ones. This enables historical reconstruction.

### Retrieve: Filter Before Rank

Retrieval pipelines that first filter by temporal validity and then rank by semantic similarity outperform pipelines that rank all records and try to infer recency from scores. The filter step is cheap; it prevents the ranking step from returning confidently irrelevant results.

### Query: Surface Temporal Constraints

When an agent reformulates a user query into a retrieval query, it should extract temporal markers ("before," "after," "when I was," "last time") and convert them into explicit time bounds. This is an underimplemented part of most agent toolchains.

### Prompt: Anchor the Model's Time Sense

Including the current date in the system prompt is a minimal but necessary step. Without it, models apply their training-data temporal distribution to date estimates, which skews toward earlier periods where training data is denser. [Context Engineering](../concepts/context-engineering.md) approaches that include session timestamps and recent memory timestamps further reduce temporal confusion.

## Failure Modes

**Silent staleness.** The most common failure: a system retrieves a fact that was true when stored but is no longer true, presents it as current, and the agent acts on it. The user sees contextually wrong behavior without any error signal. This is more damaging than retrieval failure because it produces confident wrong answers.

**Temporal anchor confusion in long contexts.** Models processing long context windows containing facts from multiple time periods can merge or confuse their temporal anchors. A fact described in past tense and a fact described in present tense may receive identical treatment if the model doesn't reliably track their provenance. This is related to but distinct from [Lost in the Middle](../concepts/lost-in-the-middle.md).

**Training cutoff leakage.** Even when a system stores current facts with timestamps, a model may blend retrieved facts with its training-time knowledge about the same entities. If the training-time knowledge is outdated, the blend produces errors. The model's internal knowledge doesn't have a validity window.

**Query-time under-specification.** Most retrieval queries are temporally under-specified. "What does the user know about X?" doesn't specify when. Systems that default to "most recent" handle this correctly for most cases but fail for historical queries.

**Contradictory context.** If a context window contains both an old fact and its superseding update without clear temporal markers, models frequently weight both, producing hedged or averaged outputs rather than using the correct current fact.

## When Temporal Reasoning Is Inadequate

Standard similarity-based retrieval is fine when:
- Facts don't change over the period of interest
- Questions are not time-scoped
- The agent operates within a single session and no historical comparison is needed

Temporal reasoning becomes necessary when:
- The agent maintains memory across sessions spanning weeks or months
- Facts about users, entities, or the world evolve during the deployment period
- Users ask questions that require knowing what was true at a specific past time
- Contradictory information accumulates in memory and needs resolution

## Relationship to Adjacent Concepts

[Episodic Memory](../concepts/episodic-memory.md) is the primary store for time-ordered events. Temporal reasoning is the set of operations over that store.

[Semantic Memory](../concepts/semantic-memory.md) stores general facts. Without temporal reasoning, semantic memory accumulates contradictions silently as facts change.

[Knowledge Graph](../concepts/knowledge-graph.md) structures naturally support temporal reasoning when edges carry validity metadata. Flat vector stores require separate metadata filtering infrastructure to achieve the same result.

[Context Management](../concepts/context-management.md) intersects when the agent must decide which temporal slice of memory is relevant to include in the current context window.

[Continual Learning](../concepts/continual-learning.md) addresses the complementary problem of updating the model's weights in response to new information, rather than externalizing temporal state into a retrieval system.

## Unresolved Questions

**Granularity tradeoffs.** How finely should validity windows be specified? Second-level granularity enables precise historical queries but adds storage overhead and increases the complexity of conflict detection. Most systems default to day-level granularity without explaining the tradeoff.

**User-facing transparency.** When an agent retrieves a fact and presents it as current, should it surface the fact's timestamp to the user? Current implementations don't expose this, which makes it impossible for users to verify or correct temporal assumptions.

**Cross-source temporal coherence.** If an agent ingests facts from multiple sources (a user conversation, a connected calendar, a business database), facts about the same entity from different sources may have conflicting timestamps or validity windows. No current system specifies a resolution policy for this case.

**Training cutoff interaction.** Even with a perfect external temporal knowledge store, the model's internal knowledge can conflict with retrieved facts. The resolution strategy (retrieved facts override training knowledge? or blend?) is typically left to the model's general instruction following, which is inconsistent.


## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.6)
- [Claude](../projects/claude.md) — part_of (0.5)
- [Model Context Protocol](../concepts/model-context-protocol.md) — part_of (0.5)

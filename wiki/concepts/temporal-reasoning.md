---
entity_id: temporal-reasoning
type: concept
bucket: agent-memory
sources:
  - repos/supermemoryai-supermemory.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/michaelliv-napkin.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related: []
last_compiled: '2026-04-05T05:30:07.962Z'
---
# Temporal Reasoning

**Bucket:** Agent Memory | **Type:** Concept

---

## What It Is

Temporal reasoning is the capacity of an AI system to understand and query relationships involving time: when events happened, in what order, how facts change over time, and which facts are no longer current. For knowledge bases and agent memory systems, this translates to four concrete problems:

1. **Ordering** — ranking events chronologically ("what happened before the refactor?")
2. **Currency** — knowing when a fact is superseded ("I live in SF" replaces "I live in NYC")
3. **Temporal querying** — answering questions anchored to time ("what did we discuss last Tuesday?")
4. **Expiration** — dropping facts that are no longer relevant ("I have an exam tomorrow" is useless after the date passes)

Without temporal reasoning, an agent memory system accumulates contradictions and stale data, both silently. The user gets confident wrong answers.

---

## Why It Matters for Agent Memory

Most retrieval systems are stateless by design: a query goes in, the most semantically similar chunks come back, and the system has no concept of whether those chunks describe the world as it was or as it is. This works for static document corpora (a legal archive, a product manual) but fails for evolving knowledge bases.

Consider what happens without temporal reasoning:

- A user tells their assistant "I'm moving to Berlin next month." Six months later, the assistant still surfaces "lives in London" because that chunk has higher embedding similarity to location-related queries than the more recent but shorter Berlin update.
- A codebase knowledge graph contains both the old authentication architecture and the new one. Queries return both, and the agent averages across them, producing advice that matches neither.
- An agent records "meeting with Jordan at 3pm Thursday." After Thursday, this fact clutters retrieval results for queries about Jordan's schedule indefinitely.

The 2025 RAG vs. GraphRAG evaluation paper ([Source](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)) quantifies this directly: on temporal queries, GraphRAG outperforms RAG by 23.33 F1 points (49.06 vs 25.73). This is the largest performance gap across all query types tested — larger than the gap on comparison queries (3.85), larger than on multi-hop reasoning (0.72). Standard embedding-based RAG, the default architecture for most memory systems, is particularly bad at temporal reasoning.

---

## How It Works: Implementation Approaches

### 1. Temporal Metadata on Storage

The most basic form: attach timestamps to every stored memory or document. Retrieval can then weight or filter by recency.

Napkin's BM25 search includes recency as one of three composite ranking signals:

```
composite = BM25_score + backlink_count * 0.5 + recency_normalized * 1.0
```

`recency_normalized` is derived from file `mtime`, normalized to [0,1] range. This gives newer notes a tiebreaker advantage without overriding semantic relevance. The weight (1.0) matches the backlink weight, meaning recency is treated as roughly as important as structural centrality in the graph. ([Source](../../raw/repos/michaelliv-napkin.md))

Supermemory applies a similar principle to expiration: facts with implicit deadlines ("exam tomorrow") are automatically forgotten after the relevant date. This requires the memory engine to parse temporal expressions from fact text, convert them to absolute timestamps, and run a periodic sweep to expire them. ([Source](../../raw/repos/supermemoryai-supermemory.md))

### 2. Structural Organization by Time

Napkin's benchmark design reveals a more interesting insight: organizing notes into **day directories** rather than a flat namespace transforms temporal reasoning from a hard query problem into a keyword matching problem.

```
memories/
  2025-01-14/
    round-001.md
    round-002.md
  2025-01-15/
    round-001.md
```

The TF-IDF overview then extracts keywords per directory, so an agent asking about "last Tuesday's discussion" gets folder-level topic signals for that specific date. Temporal navigation uses the same BM25 mechanism as topical navigation — no special handling required. This produced 90.3% accuracy on temporal reasoning tasks in the LongMemEval benchmark. ([Source](../../raw/repos/michaelliv-napkin.md))

The tradeoff: this approach requires the agent to know the relevant date range before searching. Open-ended temporal queries ("when did we first discuss authentication?") require the agent to search multiple date folders iteratively, which burns context.

### 3. Knowledge Graph Structure for Temporal Relationships

Graph-based memory systems represent temporal relationships as typed edges between entities: `(authentication_system) -[REPLACED_BY, date=2024-11]-> (OAuth_system)`. This gives the retrieval system explicit, queryable temporal structure rather than relying on recency heuristics.

The RAG vs. GraphRAG paper explains the mechanism: where RAG stores text chunks without explicit relationship encoding, a knowledge graph stores entity-relationship-entity triples. A temporal relationship like "moved from NYC to SF in March 2025" becomes a graph edge with a date attribute. Querying "where does the user live?" can then traverse the graph, find competing facts, and select the one with the most recent timestamp — rather than averaging across chunks that mention both cities.

This is why GraphRAG's 23.33 F1 advantage on temporal queries is structural, not incidental. The graph representation makes temporal priority computable. ([Source](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md))

### 4. Contradiction Detection and Fact Supersession

Temporal reasoning requires knowing not just when facts were recorded, but when they should be retired. Supermemory's memory engine handles this by treating knowledge updates as a first-class operation: when a new fact contradicts an existing one, the system detects the conflict and resolves it rather than storing both.

The described behavior: "I just moved to SF" is understood to supersede "I live in NYC." This requires the system to:

1. Extract the semantic content of the new memory
2. Query existing memories for similar claims about the same entity (user location)
3. Compare timestamps and mark the earlier fact as superseded
4. Return only the current fact during retrieval

Without this step, memory systems exhibit a specific failure mode: the user's location becomes a probability distribution across all stated locations, weighted by how often each was mentioned. Frequent past references to NYC outweigh a single recent mention of SF. ([Source](../../raw/repos/supermemoryai-supermemory.md))

### 5. Temporal Expression Parsing

A prerequisite for any of the above: the system must convert natural language temporal expressions into structured timestamps. "Tomorrow," "last Tuesday," "three weeks ago," and "Q3 2024" all need to resolve to calendar dates for storage, expiration, and query filtering.

This is harder than it looks. Relative expressions ("last Tuesday") require a reference date at parse time. Vague expressions ("recently," "a while back") have no precise resolution. Recurring events ("every Monday") require storing a pattern, not a date. Systems that handle only absolute timestamps ("2025-01-14") lose the majority of how humans actually express time.

The napkin benchmark implementation addresses one part of this: it injects the **scenario date** into the agent's system prompt, preventing the model from using the real current date for relative time calculations. This is necessary because LongMemEval tests conversations from past dates — without the scenario date anchor, "last Tuesday" would be computed relative to the actual day the benchmark runs. ([Source](../../raw/repos/michaelliv-napkin.md))

---

## Failure Modes

**Silent staleness.** The most common failure: outdated facts remain in the memory store with no indication they are stale. A user who mentioned a project in January that was cancelled in February will still get that project surfaced in March. Systems without expiration or supersession logic have no mechanism to detect this.

**Anchoring to frequent past mentions.** Without explicit temporal weighting, frequency beats recency. A fact mentioned ten times in January outweighs a correction mentioned once in February. BM25 and TF-IDF both exhibit this — they reward term frequency, not temporal priority.

**Abstention failure.** When a system cannot determine whether a fact is current, it should say so. In practice, most retrieval systems return their best match regardless of confidence. Napkin's benchmark shows 50% accuracy on abstention tasks (knowing when not to answer) — the weakest score across all tested abilities. This is a temporal reasoning problem: the system cannot distinguish "I have no record of this" from "the record I have may be outdated." ([Source](../../raw/repos/michaelliv-napkin.md))

**Entity extraction gaps.** GraphRAG's temporal advantage depends on the knowledge graph containing the right entities with the right temporal edges. The RAG vs. GraphRAG paper found that ~34% of answer-relevant entities are missing from constructed knowledge graphs. A temporal relationship the extraction pipeline missed cannot be traversed at query time. ([Source](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md))

**Relative time resolution drift.** If memories storing relative expressions ("the meeting next week") are not resolved to absolute timestamps at write time, they become uninterpretable later. "Next week" stored on January 14th means nothing when retrieved on March 5th without the original reference date.

---

## Who Implements It and How

| System | Approach | Temporal Mechanism |
|---|---|---|
| **Supermemory** | Managed memory API | Automatic expiration, contradiction detection, supersession at write time |
| **Napkin** | Local BM25 + markdown | Recency signal in composite ranking, day-directory organization, date in system prompt |
| **GraphRAG (Microsoft)** | Knowledge graph | Typed temporal edges in entity graph, queryable at retrieval time |
| **Standard RAG** | Embedding similarity | None by default; recency requires metadata filtering added by the implementer |

The practical division: managed services like Supermemory handle temporal reasoning as part of their memory engine so the developer does not have to; local/self-hosted systems like Napkin expose the structure for temporal reasoning (timestamps, directory organization) but leave query-time reasoning to the agent; graph systems make temporal relationships explicit but depend on extraction pipeline quality.

---

## Practical Implications for System Design

**Write time is cheaper than query time.** Resolving temporal expressions, detecting contradictions, and marking expiration dates when a fact is stored costs one LLM call per write. Doing the same at query time (deciding which of five conflicting facts is current) costs reasoning tokens on every retrieval, under latency pressure, and is more likely to fail. Build temporal logic into the write path.

**Structure aids retrieval more than metadata filtering.** Day directories in Napkin let BM25 find temporally-relevant notes through the same keyword mechanism it uses for topical relevance — no special query path required. Metadata filtering (timestamp >= X) requires the query to know what time range to filter, which requires a prior step to identify the relevant period. Structural organization sidesteps this by making temporal position a property of the document's location in the namespace.

**Graph structure is a prerequisite for complex temporal queries.** Flat retrieval systems (RAG, BM25) can surface recent facts over older ones but cannot answer queries like "what changed between the Q2 and Q3 architecture reviews?" without returning all matching documents and asking the LLM to sort it out. A knowledge graph can traverse the timeline of an entity's state. The 23.33 F1 gap on temporal queries is the cost of not having this structure.

**Every memory system needs an expiration policy.** Without one, the knowledge store grows monotonically and degrades. The specific policy depends on use case: personal assistant memory might expire location facts after 6 months; project documentation might never expire architecture decisions but expire meeting notes after 90 days. The policy can be simple (TTL per memory type) or sophisticated (LLM-evaluated relevance at query time), but the absence of any policy is a known failure mode.

**Test temporal reasoning explicitly.** Standard QA benchmarks do not surface temporal reasoning weaknesses because they use static corpora. LongMemEval's temporal reasoning category and LoCoMo's temporal query subset exist specifically because general benchmarks missed this failure mode. A memory system that scores well on factual recall may score 25 F1 on temporal queries (the RAG baseline) without anyone noticing until production.

---

## Open Problems

**Vague temporal expressions.** "Recently," "a while ago," "the last time we talked about this" have no reliable mapping to timestamps. Current systems either ignore these or require the agent to reason about them at query time with no grounding information.

**Temporal reasoning across knowledge sources.** Most systems handle temporal reasoning within a single memory store. Cross-source temporal reasoning ("my calendar says the meeting was moved, but my notes still reference the old time") requires reconciling temporal claims across systems with different update frequencies and reliability.

**Confidence calibration for temporal currency.** The abstention failure mode above reflects a deeper problem: systems do not produce calibrated estimates of how likely a retrieved fact is to still be current. A fact stored yesterday is almost certainly current; a fact stored two years ago about a person's job title probably needs verification. No current system exposes this signal usably.

**Incremental graph updates.** Knowledge graphs provide the best temporal querying but require batch reconstruction when facts change. Real-time fact supersession in a graph database (updating edges, not just adding nodes) at scale is an unsolved engineering problem for most deployment contexts.

---

## Related Reading

- [Napkin](../projects/napkin.md) — BM25 + day-directory approach, benchmark results on temporal reasoning
- [Supermemory](../projects/supermemory.md) — Managed memory with automatic expiration and contradiction handling

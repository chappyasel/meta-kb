---
entity_id: bi-temporal-indexing
type: concept
bucket: knowledge-bases
abstract: >-
  Bi-temporal indexing tracks two separate timelines for stored facts — when
  something was true in the world vs. when it was recorded — enabling queries
  that distinguish outdated beliefs from historical facts.
sources:
  - repos/supermemoryai-supermemory.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - Hybrid Retrieval
last_compiled: '2026-04-05T23:16:21.180Z'
---
# Bi-Temporal Indexing

## What It Is

Bi-temporal indexing stores every fact with four timestamps instead of one. Two timelines run in parallel:

- **Valid time (T_valid / T_invalid):** When the fact was true in reality
- **Transaction time (T'_created / T'_expired):** When the fact entered and exited the system

A single-timestamp system can tell you what the database contains right now. A bi-temporal system can answer two distinct historical questions: "What was actually true on date X?" and "What did we *believe* was true on date X?" These questions have different answers whenever data arrives late, gets corrected retroactively, or reflects events that occurred before they were recorded.

The concept originates in relational database theory from the 1980s (Snodgrass, Jensen), but it has become operationally relevant for LLM knowledge bases because agents accumulate facts across many conversations, those facts change, and the system needs to reason accurately about both the current state and the history of changes.

## Why It Matters for LLM Systems

Standard RAG systems and even most knowledge graphs treat storage as append-only or last-write-wins. Neither approach handles the failure mode that actually appears in production agent memory: a fact that was true last week is no longer true today, but the system still retrieves the old version and presents it as current.

Consider a user who says "I live in New York" in session 3, then "I just moved to San Francisco" in session 47. A last-write-wins system stores both, overwrites the first, or creates a conflict. Bi-temporal indexing handles this cleanly: the New York fact gets a T_invalid timestamp (the date of session 47), the San Francisco fact gets a T_valid timestamp (the same date), and both records persist in the graph. A query asking "where does this user live?" retrieves San Francisco. A query asking "what was this user's location in session 3?" correctly returns New York. An audit query asking "what did we believe about this user's location during session 3?" also returns New York, but for a different reason — it queries transaction time.

The distinction between valid time and transaction time becomes especially sharp when data arrives late. If a user mentions in session 50 that they "moved to SF three months ago," the valid time is three months prior but the transaction time is session 50. A system without bi-temporal tracking either backdates the entry (losing the transaction record) or records it as current (losing the valid time). Bi-temporal indexing preserves both.

## How It Works

### The Four-Timestamp Model

Each edge (fact) in a bi-temporal knowledge graph carries:

```
(entity_A) --[relationship]--> (entity_B)
  t_valid:     2024-03-01        ← when the fact became true
  t_invalid:   2024-09-15        ← when the fact stopped being true (NULL = still true)
  t'_created:  2024-04-10        ← when this record entered the system
  t'_expired:  NULL              ← when this record was superseded (NULL = current)
```

Valid-time queries filter on `t_valid <= query_date < t_invalid`. Transaction-time queries filter on `t'_created <= query_date < t'_expired`. Combining both gives bitemporal queries: "What did we know, as of our system state on date X, about facts that were true on date Y?"

### Contradiction Resolution via Invalidation

When new information contradicts an existing fact, bi-temporal systems do not delete the old record. Instead, they close it:

1. The new message "I moved to SF" triggers extraction of the relationship `user → lives_in → San_Francisco`
2. The system retrieves existing edges matching the entity pair `user → lives_in → *`
3. An LLM compares the new edge against the existing `user → lives_in → New_York` edge and detects temporal conflict
4. The system sets `t_invalid = now()` on the New York edge
5. The San Francisco edge is inserted with `t_valid = now()`, `t_invalid = NULL`

Both records remain queryable. History is preserved. The current query returns San Francisco.

Zep's Graphiti implementation ([Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)) applies exactly this pattern, using Neo4j to store edges with bi-temporal timestamps and Cypher queries to enforce temporal consistency. The implementation uses predefined Cypher queries rather than LLM-generated ones, which prevents schema hallucinations while maintaining temporal correctness.

### Relative Date Resolution

A practical complication: users rarely state dates explicitly. "Next Thursday," "last month," "a few years ago" are relative expressions that must be anchored to a reference point. Bi-temporal systems use the episode's ingestion timestamp as the reference for resolving relative dates into absolute valid-time values. This anchoring happens at ingestion, not at query time, so the resolution is deterministic and auditable.

### Temporal Query Patterns

Bi-temporal indexing enables three classes of queries that flat retrieval cannot handle:

**Current state:** Return the latest valid, non-expired fact. Standard retrieval approximates this but conflates "most recently stored" with "currently true."

**Point-in-time:** Return what was true at time T. Requires filtering on `t_valid <= T < t_invalid`. Flat retrieval has no mechanism for this.

**Audit trail:** Return what the system believed at transaction time T'. Requires filtering on `t'_created <= T' < t'_expired`. This is useful for debugging agent behavior: "Why did the agent say X in session 20?"

## Empirical Evidence

The strongest evidence for bi-temporal indexing's value comes from temporal query performance. The RAG vs. GraphRAG comparison ([Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)) found that flat RAG achieves 25.73 F1 on temporal queries while graph-based retrieval achieves 49.06 — a 23-point gap. This comparison uses graph structure generally, not bi-temporal indexing specifically, but it establishes that temporal reasoning requires structural support that vector similarity cannot provide.

Zep's LongMemEval results ([Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)) show +48.2% improvement on temporal reasoning questions specifically, compared to +15.2% overall improvement. Bi-temporal indexing is a contributing factor, alongside hybrid retrieval and the three-tier graph architecture. These results are self-reported by the Zep team.

## Who Implements It

**Zep / Graphiti** implements bi-temporal indexing as described above, using Neo4j with the four-timestamp edge model. The implementation is open source and is the most complete production-grade example in the LLM memory space.

**Supermemory** ([Source](../raw/repos/supermemoryai-supermemory.md)) handles "temporal changes, contradictions, and automatic forgetting" and claims #1 on LongMemEval (81.6%), which includes temporal reasoning questions. The technical mechanism is not publicly documented; the README describes behavior ("knows when memories become irrelevant") without specifying whether it uses bi-temporal timestamps or a different invalidation approach.

**A-MEM** ([Source](../raw/deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md)) stores timestamps per note but does not implement bi-temporal logic. Its temporal reasoning performance is essentially flat — +1% F1 on temporal queries with GPT-4o-mini — confirming that timestamps alone do not produce temporal reasoning capability. The mechanism that matters is the query-time filtering logic, not timestamp storage.

## Failure Modes

**Incorrect valid-time assignment from relative dates.** When the system resolves "a few years ago" to an absolute date, it depends on the ingestion timestamp as anchor. If the user is recounting events from memory inaccurately, the assigned valid time is wrong, and there is no mechanism to correct it after the fact.

**Contradiction detection misses.** Bi-temporal invalidation requires identifying that two edges conflict. This comparison is LLM-driven in systems like Zep. The LLM may miss contradictions between semantically related but syntactically dissimilar facts (e.g., "I work at Google" vs. "I quit my job at the search company"). Missed contradictions mean both facts remain active, and query results depend on which one ranks higher in retrieval.

**Priority assumption breaks for authoritative historical data.** All current implementations prioritize newer information. For domains where older records are more authoritative — medical history, legal documents, financial records — the newer-wins assumption produces wrong answers. No current system supports source-authority weighting in contradiction resolution.

**Valid time and transaction time conflation at query time.** Systems that expose bi-temporal queries to LLMs via tool calls risk the LLM conflating the two timelines. Prompts must explicitly distinguish "when was this true?" from "when did we record this?" or the agent will misuse the temporal filtering.

## Relationship to Adjacent Concepts

Bi-temporal indexing is a component of broader [hybrid retrieval](../concepts/hybrid-retrieval.md) architectures. It addresses the temporal dimension of a query, while semantic similarity (cosine/BM25) handles topical relevance. The two mechanisms are complementary: retrieval finds the right entities, bi-temporal filtering ensures the retrieved facts are temporally appropriate.

The distinction from standard knowledge graph versioning is subtle but important: versioning tracks the sequence of changes (v1, v2, v3), while bi-temporal indexing tracks two independent timelines. Versioning cannot answer "what was true in the world on date X" — it can only answer "what was stored in version N."

## When Not to Use It

Bi-temporal indexing adds architectural complexity that is not justified when:

- The knowledge base is static (documents, not conversations)
- Facts do not change or contradict — product catalogs, reference documentation, code
- Temporal queries are not part of the query distribution
- The ingestion pipeline cannot reliably extract valid-time information from source text

For static knowledge bases or single-session retrieval, standard vector search with periodic reindexing is simpler and sufficient. The overhead of maintaining dual timelines, running LLM-based contradiction detection, and managing invalidation logic is only worthwhile when the agent genuinely needs to reason about how knowledge has evolved over time.


## Related

- [Hybrid Retrieval](../concepts/hybrid-retrieval.md) — part_of (0.6)

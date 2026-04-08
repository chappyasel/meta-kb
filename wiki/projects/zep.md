---
entity_id: zep
type: project
bucket: agent-memory
abstract: >-
  Zep is a managed memory platform for AI agents using Graphiti, a temporal
  knowledge graph engine that tracks fact validity over time, achieving 18.5%
  accuracy gains and 90% latency reduction vs. full-context baselines on
  LongMemEval.
sources:
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/getzep-graphiti.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - repos/getzep-graphiti.md
  - repos/memorilabs-memori.md
related:
  - graphiti
  - retrieval-augmented-generation
  - episodic-memory
last_compiled: '2026-04-08T23:01:45.300Z'
---
# Zep

## What It Does

Zep provides long-term memory for production AI agents and assistants. Where most memory systems store and retrieve flat text or vector embeddings, Zep structures knowledge as a temporal graph where every fact carries explicit validity timestamps, traces back to source conversations, and gets automatically invalidated when newer information contradicts it.

The core engine is [Graphiti](../projects/graphiti.md), an open-source library Zep built and maintains. Zep itself is the managed platform layer: user management, governed multi-tenant graph storage, sub-200ms retrieval SLAs, and a dashboard. Graphiti is what you deploy yourself.

The relationship between the two is documented explicitly in their own comparison table: Graphiti is the engine; Zep is the managed infrastructure wrapping it.

## Architecture: Three-Tier Temporal Knowledge Graph

Graphiti formalizes memory as a hierarchical graph **G = (N, E, φ)** with three tiers:

**Tier 1 — Episodes (G_e).** Raw input stored without loss: conversation messages, JSON payloads, text documents. Every derived fact traces back to its source episode. This non-lossy ground truth is what enables citations and debugging when the graph makes wrong inferences.

**Tier 2 — Semantic Entities (G_s).** Entities extracted from episodes (people, companies, concepts) with 1024-dimensional embeddings. Relationships between entities are stored as typed fact triples: `Entity → WORKS_AT → Company`, each carrying temporal validity windows (`valid_at`, `invalid_at`).

**Tier 3 — Communities (G_c).** Clusters of related entities produced by label propagation, with LLM-generated summaries. Communities are themselves embedded and searchable, providing high-level context retrieval without requiring precise entity matching.

This structure mirrors the episodic/semantic memory distinction from cognitive science, though Zep uses it for practical reasons: episodes provide provenance, entities enable structured queries, communities enable broad thematic retrieval.

## Core Mechanism: Bi-Temporal Indexing

The most architecturally distinctive feature is the bi-temporal data model on `EntityEdge` objects in `graphiti_core/edges.py`:

```python
class EntityEdge(Edge):
    expired_at: datetime | None   # Transaction time: when the system invalidated this record
    valid_at: datetime | None     # Event time: when the fact became true in the world
    invalid_at: datetime | None   # Event time: when the fact stopped being true
    reference_time: datetime | None  # Source episode timestamp for resolving relative dates
```

Two parallel timelines run simultaneously:
- **Timeline T (event time):** When facts were true in reality. Enables "what was true on January 1st?" queries.
- **Timeline T' (transaction time):** When facts entered or were invalidated in the system. Enables audit-style "what did the system believe on January 1st?" queries.

When Alice's employer changes from Acme to Google, the old edge gets `expired_at` set to now and `invalid_at` set to the date the change occurred. Neither edge is deleted. Both remain queryable.

## Ingestion Pipeline

Each call to `add_episode()` (in `graphiti_core/graphiti.py`, lines 916–1163) runs a sequential multi-stage LLM pipeline:

1. **Extract entities** from the message plus 4 preceding messages for context. The extraction prompt in `prompts/extract_nodes.py` is unusually detailed: it enumerates categories of things NOT to extract (pronouns, bare kinship terms, abstract concepts, generic nouns) and requires entity names to be specific and qualified.

2. **Resolve nodes** against the existing graph. New entities get 1024-dim embeddings, which are compared via cosine similarity + BM25 against existing entities. An LLM cross-encoder makes the final deduplication call. "NYC" and "New York City" merge; "Java programming language" and "Java island" don't.

3. **Extract edges** as typed triples with temporal bounds. The LLM produces `valid_at` and `invalid_at` timestamps, resolving relative expressions ("last Thursday") against the episode's `reference_time`.

4. **Resolve edges** against existing edges between the same entity pairs. The LLM identifies contradictions and sets `expired_at` on invalidated edges.

5. **Update entity summaries** for newly referenced entities.

6. **Persist** via predefined Cypher queries — not LLM-generated queries. The paper is explicit about this choice: LLM-generated graph queries produce schema inconsistencies in production.

The pipeline makes 4–5+ LLM calls per episode minimum. With community updates enabled, each affected community node triggers additional LLM summarization calls. The `SEMAPHORE_LIMIT` environment variable (default: 10) controls concurrency to prevent provider rate-limit errors. The documentation explicitly recommends running `add_episode` as a background task, not in the request path.

## Retrieval: Three-Method Hybrid Search

The retrieval function in `graphiti_core/search/search.py` runs three complementary methods in parallel:

- **Cosine similarity (φ_cos):** Semantic similarity via vector search on fact fields, entity names, community names. Captures semantic relationships even when the query uses different words.
- **BM25 (φ_bm25):** Fulltext search via Neo4j's Lucene integration. Captures word-level matches that vector search misses.
- **BFS graph traversal (φ_bfs):** Breadth-first search within n-hop neighborhoods, seeded from recently mentioned entities. The paper's rationale: nodes closer in the graph appear in more similar conversational contexts, capturing a "contextual similarity" dimension that neither cosine nor BM25 address.

Results feed into a configurable reranker. Available strategies: RRF (default), MMR (diversity), node distance (distance from anchor entity), episode mention frequency, and cross-encoder neural reranking. The `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` preset combines all three search methods with neural reranking and consistently produces the best results in benchmarks.

## Community Detection

Graphiti uses label propagation rather than the Leiden algorithm (used by [GraphRAG](../projects/graphrag.md)). The reason is incremental extensibility: when a new entity arrives, it gets assigned to the community held by the plurality of its neighbors, and only that community's summary gets updated. Leiden requires full graph recomputation. For a system ingesting continuous data streams, the per-episode cost difference is significant.

The acknowledged cost: incrementally updated communities gradually drift from the optimal partition. Periodic full refreshes are needed. The documentation does not specify how to detect drift or how often to refresh.

## Benchmarks

Benchmarks from [arXiv:2501.13956](https://arxiv.org/abs/2501.13956) — self-reported by the Zep team, not independently validated.

**Deep Memory Retrieval (DMR) — 500 conversations, ~60 messages each:**

| System | Model | Accuracy |
|--------|-------|----------|
| MemGPT | gpt-4-turbo | 93.4% |
| Zep | gpt-4-turbo | 94.8% |
| Full-context baseline | gpt-4o-mini | 98.0% |
| Zep | gpt-4o-mini | 98.2% |

The paper itself criticizes DMR: conversations fit in modern context windows, questions are single-turn fact retrieval, and the benchmark "poorly represents real-world enterprise use cases." The 98.2% vs 98.0% comparison uses gpt-4o-mini for both but different conditions; the apples-to-apples comparison against MemGPT is the 94.8% vs 93.4% figure.

**LongMemEval (LME) — ~115,000-token conversations:**

| Model | Full-context | Zep | Improvement |
|-------|-------------|-----|-------------|
| gpt-4o-mini | 55.4% | 63.8% | +15.2% |
| gpt-4o | 60.2% | 71.2% | +18.5% |

**Latency (consumer laptop → AWS us-west-2):**
- gpt-4o-mini: 31.3s baseline → 3.2s with Zep (89.8% reduction)
- gpt-4o: 28.9s baseline → 2.6s with Zep (91.0% reduction)
- Token reduction: 115K → ~1.6K tokens per query

**Performance by question type (gpt-4o-mini):**
- Single-session-preference: +77.7%
- Temporal-reasoning: +48.2%
- Multi-session: moderate gains
- Single-session-assistant: **−17.7%**

The −17.7% on single-session-assistant questions is a meaningful regression. The entity extraction pipeline systematically underindexes content the assistant itself generated — recommendations, calculations, reasoning chains. For agents where prior outputs are important context, this is a real gap.

Repository stats: Graphiti has 24,473 GitHub stars and 2,433 forks (as of April 2025). These are self-reported from the repository metadata, not independently audited.

## Strengths

**Temporal reasoning.** The bi-temporal model is the most complete implementation of temporal fact tracking in any open-source agent memory system. The +48.2% improvement on temporal-reasoning questions vs. full-context baselines validates this. No competing system (Mem0, Letta, A-MEM) has an equivalent mechanism.

**Production latency.** The 90% latency reduction by compressing 115K tokens to 1.6K is the clearest argument for structured memory over context stuffing. Sub-second query latency makes real-time agent responses viable.

**Provenance.** Every derived fact traces back to its source episode. You can answer "where did you learn that?" for any fact in the graph.

**Conflict resolution.** Automatic edge invalidation handles the common case of evolving information (updated addresses, changed job titles, corrected facts) without manual intervention.

**Infrastructure flexibility.** Four graph backends (Neo4j, FalkorDB, Kuzu, Amazon Neptune), seven LLM providers, four embedding providers, three rerankers. Kuzu runs embedded for local development.

## Limitations

**Concrete failure mode — assistant-content blindspot.** The −17.7% regression on single-session-assistant tasks is reproducible in the paper's own benchmarks. When an agent needs to recall its own prior reasoning, recommendations, or calculations, Zep's entity extraction pipeline misses this content at a meaningful rate. Workaround: ingest assistant turns with explicit entity annotations, but this requires custom tooling.

**Infrastructure assumption.** Zep assumes Neo4j (or another supported graph database) is available and properly sized. The default setup requires Neo4j 5.26+ with APOC plugin, which is non-trivial to operate at scale. FalkorDB via Docker is simpler but less proven in production. There is no SQLite-backed path for simple deployments.

**Ingestion cost at scale.** 4–5+ LLM calls per episode, uncapped. For a high-volume production system (thousands of messages per hour), this creates substantial API cost that the paper does not address. The `add_episode_bulk` method exists but explicitly skips edge invalidation — the core feature that makes temporal tracking work.

**Community drift.** Incremental label propagation diverges from optimal community structure over time. The paper acknowledges periodic full refreshes are necessary but does not specify detection criteria or refresh cost at graph sizes of 100K+ entities.

**Contradiction resolution is binary.** Newer information always wins. There is no confidence scoring, source-authority weighting, or domain-specific override logic. For medical records, legal documents, or any domain where older information might be more authoritative, this assumption fails silently.

## When Not to Use Zep

**If you need simple per-session memory without cross-session synthesis.** A vector store with conversation summaries ([Mem0](../projects/mem0.md) or basic [RAG](../concepts/retrieval-augmented-generation.md)) is cheaper to operate and easier to debug.

**If your conversations are short and fit in context.** DMR results show a full-context baseline achieves 98.0% accuracy — nearly identical to Zep — on short conversations. The latency and cost overhead of graph construction only pays off when conversation history exceeds what the model can process in-context.

**If your agent primarily needs to recall its own outputs.** The −17.7% regression on assistant-generated content makes Zep a poor fit for agents where prior reasoning chains, tool outputs, or assistant-authored documents are the primary memory target.

**If you cannot operate a graph database.** Neo4j in production requires meaningful ops investment. If your team does not have graph database expertise, the operational complexity may outweigh the memory quality benefits.

**If you need multi-modal memory.** Zep handles text only: messages, JSON, and text documents. Images, code execution traces, and other artifact types require preprocessing into text before ingestion.

## Unresolved Questions

**Per-episode ingestion cost at scale.** The paper benchmarks retrieval quality but never reports the cost (LLM API spend, latency) of the ingestion pipeline at production volumes. For a system processing 10,000 messages per day, what does graph construction cost?

**Community refresh scheduling.** How do you detect when communities have drifted enough to require a full recomputation? What is the cost of that recomputation at 1M entities? The documentation is silent.

**Extraction pipeline with weaker models.** The paper uses gpt-4o-mini for graph construction. How much does entity extraction quality degrade with smaller local models? The Ollama integration is documented, but extraction quality for models below GPT-4 class is not characterized.

**Long-running graph maintenance.** Invalidated edges accumulate indefinitely. There is no documented garbage collection or compaction strategy. At what scale does edge accumulation affect query performance?

**The structured business data claim.** The paper's headline use case is synthesizing conversational and structured business data. No benchmark in the paper actually tests this — all evaluations use conversational memory only. The integration patterns for JSON episode types exist in the code, but production validation is absent.

## Alternatives

**[Mem0](../projects/mem0.md):** Simpler architecture (vector store + optional lightweight graph), lower ingestion cost, easier to self-host. Use Mem0 when you need basic per-user memory without temporal reasoning requirements and want minimal infrastructure.

**[Letta](../projects/letta.md) / [MemGPT](../projects/memgpt.md):** In-context memory management where the agent explicitly controls what to remember and forget. Use Letta when you want the agent to have direct memory agency rather than automatic background extraction.

**[GraphRAG](../projects/graphrag.md):** Batch-oriented graph construction over static document corpora. Use GraphRAG for document-centric knowledge bases that change infrequently. GraphRAG produces higher-quality community structure (Leiden algorithm) but cannot update incrementally — the wrong choice for conversational memory.

**Full-context baselines:** For conversations under ~50K tokens with modern long-context models, stuffing the full conversation into context achieves comparable accuracy (98.0% on DMR) without any infrastructure. Only adopt Zep when conversation length, latency requirements, or multi-session synthesis make full-context approaches impractical.

**[HippoRAG](../projects/hipporag.md):** Graph-based RAG for document retrieval rather than conversational memory. Use HippoRAG for static knowledge base retrieval; use Zep for evolving agent memory.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — architectural context for why memory systems matter
- [Long-Term Memory](../concepts/long-term-memory.md) — the cognitive framing Zep draws on
- [Episodic Memory](../concepts/episodic-memory.md) — maps to Zep's episode subgraph tier
- [Semantic Memory](../concepts/semantic-memory.md) — maps to Zep's entity subgraph tier
- [Knowledge Graph](../concepts/knowledge-graph.md) — the graph database concepts Zep implements
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the paradigm Zep extends with temporal awareness
- [Temporal Reasoning](../concepts/temporal-reasoning.md) — the reasoning capability Zep specifically targets
- [Hybrid Search](../concepts/hybrid-search.md) — Zep's three-method retrieval strategy

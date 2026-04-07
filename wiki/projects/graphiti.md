---
entity_id: graphiti
type: project
bucket: knowledge-bases
abstract: >-
  Graphiti is an open-source Python library that builds temporal knowledge
  graphs for AI agents, differentiating itself by bi-temporally indexing facts
  so agents can query what was true at any point in time, not just what is
  currently true.
sources:
  - repos/getzep-graphiti.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - zep
  - knowledge-graph
  - letta
  - hybrid-search
  - bm25
  - mem0
last_compiled: '2026-04-07T11:42:23.793Z'
---
# Graphiti

## What It Does

Graphiti builds and queries a temporal knowledge graph that an AI agent can use as long-term memory. It ingests conversational messages, JSON documents, or raw text, extracts entities and relationships via an LLM pipeline, stores them as typed fact triples, and exposes a hybrid search layer combining semantic embeddings, BM25, and graph traversal.

The core differentiator from vector-store-based memory systems like [Mem0](../projects/mem0.md) is bi-temporal indexing: every relationship edge carries four timestamps (when the fact became true, when it stopped being true, when the system learned it, when the system stopped believing it). This lets an agent answer "what was Alice's employer as of Q1 2023?" independently of when that information entered the database. Stale facts are not deleted but expired, so the full history of what was believed when remains queryable.

Graphiti is the core engine behind [Zep](../projects/zep.md)'s commercial memory product. The arXiv paper (arXiv:2501.13956) accompanying the library provides one of the few independently structured (if author-reported) benchmarks in this space.

## Architecture

### Graph Structure

The formal model is a three-tier hierarchical graph G = (N, E, phi):

**Episode subgraph:** Raw input nodes storing messages, JSON, or text. Every derived entity and relationship traces provenance back to the episode that produced it.

**Semantic entity subgraph:** Extracted entities (1024-dimensional embeddings, LLM-generated summaries) connected by typed fact edges. Entity types can be user-defined via Pydantic models or left to the LLM's discretion.

**Community subgraph:** Clusters of strongly connected entities with LLM-generated summaries, embedded and searchable like individual entities.

This maps deliberately onto the episodic/semantic memory distinction from cognitive science: episodes store *what happened*, entities and edges store *what is known*, communities store *thematic groupings*.

### Bi-Temporal Data Model

The `EntityEdge` class carries four temporal fields:

```python
class EntityEdge(Edge):
    valid_at: datetime | None      # When the fact became true (event time)
    invalid_at: datetime | None    # When the fact stopped being true (event time)
    expired_at: datetime | None    # When the system stopped believing it (transaction time)
    reference_time: datetime | None  # Reference timestamp for resolving relative expressions
```

The system resolves relative temporal expressions ("last week") against the episode's `reference_time` parameter at ingestion. This is a genuine bitemporal design from database theory, standard in financial audit systems, rarely seen in LLM memory applications.

### Storage Layer

Four graph database backends via a `GraphDriver` abstraction: Neo4j 5.26+ (default, requires APOC), FalkorDB 1.1.2+, Kuzu 0.11.2+ (embedded, useful for development), Amazon Neptune with OpenSearch Serverless. All graph mutations use predefined Cypher queries, never LLM-generated ones -- a deliberate choice to prevent schema hallucinations and ensure consistency.

The `group_id` parameter scopes all queries to isolated namespaces, enabling multi-tenant deployments within a single database instance.

### Ingestion Pipeline

A single `add_episode()` call (in `graphiti_core/graphiti.py`) runs 4-5 sequential LLM calls:

1. **Entity extraction** (`extract_nodes` in `utils/maintenance/node_operations.py`): The LLM receives the current message plus the four preceding messages for context, returns typed `ExtractedEntity` objects. The extraction prompt is extensively negative-specified -- it lists what *not* to extract (pronouns, bare kinship terms, abstract nouns, generic nouns) to reduce noise.

2. **Node deduplication** (`resolve_extracted_nodes`): Each extracted entity is embedded and compared against existing entities via cosine similarity + BM25 full-text search + LLM cross-encoder evaluation. Handles semantic equivalence ("NYC" = "New York City") and disambiguation ("Java programming language" vs "Java island").

3. **Edge extraction** (`extract_edges` in `utils/maintenance/edge_operations.py`): The LLM extracts fact triples as `Edge` objects with source, target, relation type in SCREAMING_SNAKE_CASE, a natural language description, and temporal validity bounds.

4. **Edge resolution** (`resolve_extracted_edges`): New edges are compared against existing edges between the same entity pairs. The LLM identifies duplicates and contradictions. Contradicted edges get `expired_at` set to the current time. Newer facts consistently supersede older ones.

5. **Attribute extraction**: Entity summaries are updated to incorporate information from newly added edges. Only triggered for non-duplicate edges.

Optional sixth stage: `update_communities()` runs label propagation and updates community summaries for affected entities.

### Hybrid Search

The `SearchConfig` in `graphiti_core/search/search.py` combines three retrieval methods run in parallel:

- **Cosine similarity** (`phi_cos`): Vector search on 1024-dimensional fact embeddings via Neo4j/Lucene vector indices
- **BM25** (`phi_bm25`): Full-text search using the graph database's native BM25 across fact fields, entity names, and community names
- **Breadth-first search** (`phi_bfs`): Graph traversal from specified origin nodes up to N hops

The three methods target complementary similarity types: BFS captures contextual similarity (nodes closer in the graph appear in more similar conversational contexts), cosine captures semantic similarity, BM25 captures lexical similarity. No single method covers all three.

Reranking options: Reciprocal Rank Fusion (default), maximal marginal relevance, episode-mention frequency, graph distance from a center node, and neural cross-encoder (OpenAI, BGE, or Gemini rerankers). `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` is the pre-built configuration for best quality.

### Community Detection

Graphiti uses label propagation rather than the Leiden algorithm ([GraphRAG](../concepts/graphrag.md) uses Leiden). Each entity starts as its own community; iteratively, each node adopts the community held by the plurality of its neighbors. The key reason for this choice: incremental extension. When a new entity arrives, it is assigned to its neighbors' plurality community without full graph recomputation. Leiden would require recomputing from scratch. The tradeoff: incrementally updated communities drift from optimal clustering over time and require periodic full refreshes.

After clustering, each community receives an LLM-generated summary via map-reduce-style iteration over member entity summaries. Community names contain key terms embedded for hybrid search.

## Key Numbers

The arXiv paper (arXiv:2501.13956) provides the primary benchmark data. These are author-reported from the paper's authors, who also built Zep commercially.

**Deep Memory Retrieval (DMR), 500 conversations:**

| System | Accuracy |
|--------|----------|
| MemGPT/[Letta](../projects/letta.md) | 93.4% |
| Zep/Graphiti (gpt-4-turbo) | 94.8% |
| Zep/Graphiti (gpt-4o-mini) | 98.2% |
| Full-conversation baseline | 98.0% |

The authors themselves criticize DMR as inadequate: conversations fit in modern context windows, questions are single-turn fact retrieval, and it "poorly represents real-world enterprise use cases." The 98.2% vs 98.0% comparison uses a better base model than the baseline, making it not directly comparable.

**LongMemEval (LME), ~115K token conversations:**

| Model | Baseline | Zep | Improvement |
|-------|----------|-----|-------------|
| gpt-4o-mini | 55.4% | 63.8% | +15.2% |
| gpt-4o | 60.2% | 71.2% | +18.5% |

Response latency: 31.3s (baseline, full context) → 3.2s (Zep) for gpt-4o-mini, a 90% reduction. Context reduction: 115K tokens → ~1.6K tokens.

Per-question-type breakdown (gpt-4o-mini):

| Task type | Change |
|-----------|--------|
| Single-session-preference | +184% |
| Temporal-reasoning | +48.2% |
| Multi-session | +30.7% |
| Knowledge-update | +6.5% |
| Single-session-assistant | **-17.7%** |

The +48.2% on temporal reasoning directly validates the bi-temporal model. The -17.7% on single-session-assistant questions is a meaningful regression -- the extraction pipeline is better at indexing what users say than what the assistant says.

All benchmarks are self-reported by the Zep team.

## Strengths

**Temporal reasoning over evolving knowledge.** The bi-temporal model handles facts that change over time -- "Alice works at Acme" becomes "Alice worked at Acme 2020-2023" when new information arrives, not a deleted edge. This is the right architecture for domains where information ages (contact details, employment, prices, preferences).

**Structured fact representation.** Edges are typed triples (Entity → RELATION_TYPE → Entity) with natural language descriptions. This enables queries vector stores cannot answer: "what relationships involving Alice changed this quarter?" or "find entities connected to Alice within 2 hops."

**Provenance tracing.** Every entity and edge traces back to the specific episode that produced it, enabling source citation and debugging of incorrect beliefs.

**Hybrid retrieval breadth.** The BFS + cosine + BM25 combination covers retrieval scenarios that any single method misses. The graph traversal component is particularly useful when the relevant fact doesn't share vocabulary with the query.

**Multi-backend support.** Kuzu (embedded) works with no external infrastructure during development; Neo4j handles production scale.

## Critical Limitations

**LLM call volume per episode.** A single `add_episode()` makes 4-5+ LLM calls minimum. With community updates enabled, add per-node summarization calls. For real-time conversational applications, this creates unacceptable latency unless episode ingestion runs asynchronously. The README explicitly recommends running `add_episode` as a background task via FastAPI background tasks or Celery -- treating it as an online operation is an architecture mistake.

**Infrastructure assumption: graph database required.** Unlike [Mem0](../projects/mem0.md) (which defaults to an in-memory vector store) or [Letta](../projects/letta.md) (which uses PostgreSQL), Graphiti requires a dedicated graph database. The lowest-friction option (Kuzu) is embedded and file-backed, but Neo4j for production means an additional service with its own operational overhead, backup strategy, and schema management. This is a non-trivial infrastructure requirement that isn't prominent in the getting-started documentation.

## When NOT to Use It

**High-throughput real-time ingestion.** If your agent processes hundreds of messages per minute and needs each one indexed before the next query, Graphiti's multi-LLM-call pipeline won't keep up without a very large background worker pool. Flat memory systems ([Mem0](../projects/mem0.md)) or append-log approaches handle this better.

**Simple single-session assistants.** For chatbots where context doesn't persist beyond one conversation, the infrastructure overhead (graph database, LLM extraction pipeline, community detection) provides no benefit over a sliding context window.

**Adversarial or high-stakes fact verification.** Contradiction resolution is entirely LLM-dependent -- no deterministic checking. If the LLM fails to detect a contradiction, a stale edge persists as valid. There's no confidence scoring or source-authority weighting. If a newer (but incorrect) fact arrives, it will expire the correct fact. "Newer wins" is a hard assumption, not a configurable policy.

**Domains requiring assistant-side recall.** The -17.7% regression on single-session-assistant tasks means Graphiti systematically indexes user-stated information better than assistant-generated information. If your agent needs to recall its own prior outputs (recommendations it made, calculations it performed, commitments it made), the extraction pipeline will miss a meaningful fraction of this content.

## Unresolved Questions

**Community refresh scheduling.** The paper acknowledges incremental label propagation diverges from optimal clustering over time and requires periodic full refreshes. No guidance exists on how to detect drift, trigger refreshes, or size the refresh operation for graphs with millions of entities.

**Ingestion cost at scale.** The paper reports retrieval latency and benchmark accuracy but publishes no per-episode ingestion cost or throughput numbers. For an enterprise system processing 10,000 messages per day, the total LLM cost of 4-5 calls per episode is substantial and unpublished.

**Cross-driver bug parity.** The four graph backends each have their own operations directories with 10+ files each. There's no documented process for ensuring a bug fix in Neo4j operations propagates to FalkorDB, Kuzu, and Neptune operations. Production deployments on non-Neo4j backends carry an unknown risk of driver-specific issues.

**Bulk ingestion and temporal consistency.** `add_episode_bulk` explicitly skips edge invalidation and date extraction for speed. There's no guidance on when bulk ingestion is safe vs. when it silently corrupts temporal consistency.

**Contradiction resolution policy.** "Newer wins" is hard-coded. Medical records, legal documents, and audit trails are domains where this assumption fails. There's no architecture for authority-weighted or confidence-weighted contradiction resolution.

## Alternatives

**[Mem0](../projects/mem0.md):** Use when you need fast setup, minimal infrastructure (works with in-memory vector stores), and your application doesn't require temporal reasoning or structured relational queries. Mem0's extraction pipeline makes 2 LLM calls per memory vs. Graphiti's 4-5, and it doesn't require a graph database.

**[Letta](../projects/letta.md):** Use when you want the agent itself to manage its memory via explicit tool calls, need full agent lifecycle management (not just a memory layer), or want the agent to reorganize and consolidate its own knowledge. Letta's memory is unstructured text in blocks, which is simpler but doesn't support relational queries.

**[GraphRAG](../concepts/graphrag.md):** Use when you have a static document corpus that changes infrequently and can afford batch reprocessing on updates. GraphRAG uses the Leiden algorithm for higher-quality community detection but requires full recomputation when the corpus changes. Graphiti is the correct choice when data arrives continuously.

**Full-context approaches ([RAG](../concepts/rag.md) with large context windows):** Use when your total knowledge base fits within a modern context window (128K-200K tokens), query complexity is low, and you want zero infrastructure overhead. The LME benchmark shows full-context approaches at 55-60% accuracy -- effective for simple tasks, inadequate for complex temporal reasoning across many sessions.

**[Neo4j](../projects/neo4j.md) directly:** Use when your team has graph database expertise, wants full control over the schema, and is willing to build the extraction and retrieval pipeline from scratch. Graphiti is essentially a pre-built layer on top of Neo4j (and alternatives) -- adopting it trades flexibility for faster time to a working system.

## Related Concepts

- [Knowledge Graph](../concepts/knowledge-graph.md): The underlying data structure
- [Hybrid Search](../concepts/hybrid-search.md): The retrieval mechanism combining BM25, cosine similarity, and graph traversal
- [BM25](../concepts/bm25.md): Lexical component of the search pipeline
- [Episodic Memory](../concepts/episodic-memory.md): The episode subgraph mirrors this cognitive memory type
- [Semantic Memory](../concepts/semantic-memory.md): The entity subgraph mirrors this cognitive memory type
- [Entity Extraction](../concepts/entity-extraction.md): Stage 1 of the ingestion pipeline
- [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md): Default reranking strategy
- [GraphRAG](../concepts/graphrag.md): Alternative graph-based RAG using Leiden community detection and batch processing
- [Agent Memory](../concepts/agent-memory.md): The broader concept this system implements
- [Continual Learning](../concepts/continual-learning.md): Graphiti handles the non-forgetting problem by expiring rather than deleting edges

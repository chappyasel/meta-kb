---
entity_id: zep
type: project
bucket: agent-memory
abstract: >-
  Zep is a managed memory layer for AI agents that uses Graphiti, a temporal
  knowledge graph engine, to store conversation history and business data as
  evolving fact triples with bi-temporal validity tracking — enabling agents to
  reason about how information changes over time.
sources:
  - repos/getzep-graphiti.md
  - repos/memorilabs-memori.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - graphiti
  - retrieval-augmented-generation
  - episodic-memory
  - semantic-memory
last_compiled: '2026-04-08T02:44:32.150Z'
---
# Zep

## What It Does

Zep provides persistent, queryable memory for AI agents by organizing knowledge into a three-tier graph structure: raw episode storage, semantic entity relationships, and community clusters. Its core engine, [Graphiti](../projects/graphiti.md), represents facts as typed triples (Entity → Relationship → Entity) with explicit timestamps marking when each fact was true and when it was superseded — rather than storing raw conversation text or flat memory strings.

The architectural claim: agents operating on evolving information need to know not just what is true now, but what changed and when. A standard [vector database](../concepts/vector-database.md) returns a snapshot; Zep's graph returns a timeline.

Zep exists in two forms. Graphiti is the open-source engine (Apache-2.0, 24,473 stars on GitHub as of the repo snapshot). Zep is the managed cloud service wrapping Graphiti with multi-tenant isolation, sub-200ms retrieval SLAs, user/thread management, and a dashboard. The research paper (arXiv:2501.13956) and benchmarks evaluate the managed Zep service but the Graphiti engine is what developers self-host.

[Source](../raw/deep/repos/getzep-graphiti.md) | [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Core Mechanism

### Three-Tier Graph Structure

The graph **G = (N, E, phi)** organizes knowledge into three subgraphs:

**Episode Subgraph (G_e):** Raw input stored as non-lossy nodes. Every derived fact traces back to the specific episode (conversation turn, JSON document, or text passage) that produced it. This provenance chain is load-bearing — you can always audit where a belief came from.

**Semantic Entity Subgraph (G_s):** Extracted entities with typed relationships between them. This is where the usable knowledge lives. Entities carry 1024-dimensional embeddings and summaries that update as new information arrives.

**Community Subgraph (G_c):** Auto-detected clusters of strongly connected entities, each with an LLM-generated summary. Community names embed key terms, making clusters searchable through the same hybrid pipeline as individual entities.

This mirrors the [episodic memory](../concepts/episodic-memory.md) / [semantic memory](../concepts/semantic-memory.md) distinction from cognitive science — specific events stored separately from generalized conceptual associations.

### Bi-Temporal Indexing

Each `EntityEdge` carries four timestamps:

- **t_valid / t_invalid**: When the fact was actually true in the world (event time)
- **t'_created / t'_expired**: When the system learned and forgot it (transaction time)

This is a genuine bi-temporal model from database theory, rarely applied to LLM memory systems. It enables two distinct queries: "What was Alice's employer in 2023?" (event time) and "What did the system believe about Alice's employer when it processed this conversation?" (transaction time).

When new information contradicts an existing edge, Zep sets the old edge's `t_invalid` rather than deleting it. The history is preserved; the edge is just marked as no longer current.

### Ingestion Pipeline

A single `add_episode()` call runs through at least four sequential LLM stages, implemented in `graphiti_core/graphiti.py` (lines 916–1163):

1. **Entity extraction** (`utils/maintenance/node_operations.py`): LLM receives the current message plus the four preceding messages for context. Returns `ExtractedEntity` objects. The prompt explicitly lists what NOT to extract — pronouns, bare kinship terms, abstract concepts — to reduce noise.

2. **Node deduplication**: Each extracted entity gets embedded, then compared against existing entities using cosine similarity plus BM25 full-text search on names and summaries. An LLM cross-encoder makes the final deduplication decision, handling cases like "NYC" matching "New York City."

3. **Edge extraction** (`utils/maintenance/edge_operations.py`): LLM produces structured fact triples — source entity, target entity, SCREAMING_SNAKE_CASE relation type, natural language description, and temporal bounds. The `reference_time` parameter lets the LLM resolve relative expressions like "last week" to absolute dates.

4. **Edge resolution**: New edges are compared against existing edges between the same entity pairs. The LLM identifies duplicates and contradictions. Contradicted edges get their `expired_at` set to the current time.

All graph writes use predefined Cypher queries, not LLM-generated ones. The paper is explicit about this choice: LLM-generated graph queries produce schema inconsistencies and hallucinated node references in production.

### Hybrid Retrieval

Three search methods run in parallel and merge results:

- **Cosine similarity**: Vector search over fact field embeddings
- **BM25**: Full-text search via Neo4j's Lucene integration for word-level matching
- **BFS**: Breadth-first graph traversal within n hops of recently mentioned entities

The BFS component captures something neither vector nor keyword search can: entities that appear in similar conversational contexts cluster together in the graph, so traversal surfaces contextually relevant facts even when they share no semantic or lexical overlap with the query.

Reranking options include Reciprocal Rank Fusion (RRF), episode-mention frequency, graph distance from a centroid node, MMR for diversification, and cross-encoder neural reranking.

### Community Detection

Graphiti uses label propagation rather than the Leiden algorithm (used by [GraphRAG](../projects/graphrag.md)). The reason is incremental updateability: when a new entity arrives, it adopts the community label of its plurality neighbor and the community summary updates. Leiden produces higher-quality community partitions but requires full recomputation. For a system where data arrives continuously, incremental updates matter more than optimal partitioning.

Acknowledged tradeoff: incremental label propagation gradually diverges from what a full recomputation would produce, requiring periodic refreshes at unspecified intervals.

## Key Numbers

**Benchmark results from the Zep paper (arXiv:2501.13956) — self-reported, not independently validated:**

**LongMemEval (~115K token conversations):**
| Model | Baseline | Zep | Improvement |
|-------|----------|-----|-------------|
| gpt-4o-mini | 55.4% | 63.8% | +15.2% |
| gpt-4o | 60.2% | 71.2% | +18.5% |

Response latency: 31.3s (full-context, gpt-4o-mini) → 3.20s (Zep + gpt-4o-mini), a 90% reduction. Context token reduction: ~115K → ~1.6K tokens.

**Per question type (gpt-4o):**
- Single-session-preference: +184%
- Temporal reasoning: +38.4%
- Multi-session: +30.7%
- Single-session-assistant: **−17.7%** (regression)

**Deep Memory Retrieval (DMR) — self-reported, authors themselves criticize this benchmark:**
- MemGPT (prior SOTA): 93.4%
- Zep (gpt-4-turbo): 94.8%
- Zep (gpt-4o-mini): 98.2%

The authors criticize DMR as inadequate: 115K-token conversations fit in modern context windows, and questions are single-turn fact retrieval. The LongMemEval numbers are the more meaningful comparison.

The 38.4% improvement on temporal reasoning directly validates the bi-temporal model. The −17.7% regression on assistant-generated content is a real weakness — see Limitations below.

**Repo stats (as of snapshot):** 24,473 stars, 2,433 forks.

## Strengths

**Temporal reasoning over evolving facts.** The bi-temporal model is the strongest demonstrated architecture for questions like "What was true before X changed it?" or "When did the system learn about Y?" No other open-source agent memory system implements this properly.

**90% latency reduction on long conversations.** Retrieving 1.6K tokens of relevant graph context instead of processing 115K tokens in-context is a genuine production benefit. The accuracy improvement accompanies, not trades off against, the latency gain.

**Multi-hop cross-session synthesis.** The BFS retrieval component follows relationship edges across sessions, surfacing facts that are contextually related but not semantically similar to the query. This is structurally impossible for flat vector memory systems.

**Predefined graph schema.** Using predefined Cypher queries rather than LLM-generated ones is a sound engineering choice for production. It makes the system more predictable and auditable.

**Provenance tracing.** Every fact links back to the episode that produced it. This matters for debugging, auditing, and the -17.7% regression issue — you can inspect exactly what the system extracted.

## Critical Limitations

**Concrete failure mode — assistant-generated content retrieval:** The −17.7% regression on single-session-assistant questions is a structural problem. The entity extraction pipeline is better at extracting user-stated facts than agent-generated content (recommendations, calculations, prior responses). In agentic workflows where an agent's previous outputs are critical context for its next step, this gap matters directly. The paper identifies it as "an area of current research" without offering a fix.

**Unspoken infrastructure assumption:** Graphiti requires a running graph database — Neo4j, FalkorDB, Kuzu, or Amazon Neptune. Neo4j 5.26+ with APOC is the primary supported target. This is not a minor dependency: Neo4j has its own operational complexity, licensing considerations, and memory requirements at scale. Teams without graph database expertise will underestimate this cost. The "simple" development path uses Kuzu (embedded), but the production path assumes Neo4j operational capacity.

**LLM call volume per ingestion.** Four to five LLM calls per episode minimum, more with community updates enabled. For high-volume ingestion — a busy customer support system processing hundreds of conversations per minute — this creates both cost and latency pressure. The README explicitly recommends running `add_episode` as a background task rather than in the request path.

**Bulk ingestion skips edge invalidation.** The `add_episode_bulk` method trades temporal consistency for speed — it does not run the contradiction detection and edge invalidation pipeline. Historical imports via bulk ingestion will not maintain the bi-temporal model's integrity.

## When NOT to Use It

**Static document retrieval.** If your agent retrieves from a fixed corpus (PDFs, documentation, code) that does not change, standard [RAG](../concepts/retrieval-augmented-generation.md) with a vector store is simpler and sufficient. Graphiti's temporal machinery adds cost and complexity with no benefit when facts do not evolve.

**Single-session agents without memory requirements.** If each conversation is stateless and agents do not need to remember previous interactions, Zep's entire value proposition disappears. Use a context window.

**Teams without graph database operational capacity.** Neo4j in production requires maintenance, monitoring, and backup procedures. If your infrastructure team has no graph database experience, the operational burden will likely outweigh the accuracy gains.

**Low-latency ingestion paths.** If every user message must be fully processed before the agent responds, the 4-5 LLM calls per episode will add seconds to response time. Zep works best when ingestion runs asynchronously after the response is returned.

**Adversarial or high-trust domains.** The memory system consistently prioritizes newer facts over older ones when resolving contradictions. In domains where older authoritative records should override new claims (legal documents, medical records, compliance data), this design assumption is wrong. There is no confidence scoring or source-authority weighting.

## Unresolved Questions

**Ingestion cost at scale.** The paper reports accuracy and latency benchmarks but not per-episode ingestion cost. For enterprise deployments processing millions of conversations, the cumulative LLM call cost across entity extraction, deduplication, edge resolution, and community updates is unknown. No published cost model exists.

**Community refresh scheduling.** The paper acknowledges that incremental label propagation diverges from optimal clustering over time and requires periodic full refreshes. It does not specify how to detect when a refresh is needed, how long a full refresh takes on a large graph, or what the LLM cost is for regenerating community summaries across thousands of entities.

**Structured business data integration.** The paper's headline use case is synthesizing conversational data with structured business data (CRM records, transaction logs). All benchmarks test only conversational memory. The claim that Graphiti handles structured JSON data is plausible from the code (EpisodeType.json exists), but no benchmark validates this use case.

**Governance for the managed Zep service.** The open-source Graphiti has clear Apache-2.0 licensing. The managed Zep service's pricing at scale, data residency guarantees, and SLA terms are not documented in public sources reviewed here.

**Entity extraction quality across domains.** The extraction prompts are tuned for conversational English. Performance on technical domains (medical notes, legal text, code), non-English languages, or highly specialized ontologies is untested.

## Alternatives

**[Mem0](../projects/mem0.md)** — Simpler architecture: flat fact strings stored in a vector database with optional graph layer. Fewer LLM calls per ingestion, lower infrastructure requirements. Use Mem0 when you need quick integration, don't have graph database infrastructure, and your use case doesn't require temporal reasoning over contradictory facts.

**[Letta](../projects/letta.md) / [MemGPT](../projects/memgpt.md)** — Stateful agent architecture where memory management is part of the agent's own reasoning loop rather than an external service. Use Letta when you want the agent itself to decide what to store and retrieve, rather than delegating memory management to a separate system.

**[GraphRAG](../projects/graphrag.md)** — Batch-oriented community detection over static document corpora. Use GraphRAG when your data is a fixed document collection, you need high-quality community summaries over the full corpus, and you can tolerate seconds-to-tens-of-seconds query latency. GraphRAG's Leiden-based communities are higher quality than Graphiti's incremental label propagation, but require full recomputation when data changes.

**[HippoRAG](../projects/hipporag.md)** — Knowledge graph approach for document retrieval. Use HippoRAG for static document retrieval with graph-based multi-hop reasoning, not for conversational memory with evolving facts.

**Full-context baseline** — For conversations under ~100K tokens with modern long-context models, stuffing the full conversation into the context window may match or exceed Zep's accuracy on many tasks (the DMR benchmark showed 98.0% full-context vs 98.2% Zep). Use a full-context approach when conversations are short enough, you want zero infrastructure complexity, and latency cost of processing large contexts is acceptable.

## Related Concepts

[Agent Memory](../concepts/agent-memory.md) | [Knowledge Graph](../concepts/knowledge-graph.md) | [Episodic Memory](../concepts/episodic-memory.md) | [Semantic Memory](../concepts/semantic-memory.md) | [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) | [Temporal Reasoning](../concepts/temporal-reasoning.md) | [Hybrid Search](../concepts/hybrid-search.md) | [Long-Term Memory](../concepts/long-term-memory.md)

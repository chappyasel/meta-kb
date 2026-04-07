---
entity_id: personalized-pagerank
type: approach
bucket: knowledge-bases
abstract: >-
  Personalized PageRank (PPR) is a graph-traversal ranking algorithm that seeds
  random walks from query-relevant nodes rather than uniformly, enabling
  multi-hop knowledge retrieval that standard embedding similarity cannot
  replicate.
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/repos/memvid-memvid.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - bm25
  - graphiti
  - zep
  - graphrag
  - knowledge-graph
last_compiled: '2026-04-07T01:03:36.040Z'
---
# Personalized PageRank

## What It Is

Personalized PageRank is a variant of Google's original PageRank algorithm adapted for query-specific relevance scoring in graphs. Standard PageRank assigns global importance scores to nodes by simulating a random walker who follows edges but occasionally teleports to a random node anywhere in the graph. PPR modifies this by making the teleportation non-uniform: the walker preferentially returns to a specific set of "seed" nodes associated with the current query or context.

The result is a relevance distribution over all nodes in the graph, where nodes are ranked by how often the random walker visits them when constrained to start from (and return to) query-relevant positions. Nodes close to the seeds in graph structure score highest, but the algorithm naturally propagates relevance through multi-hop paths, surfacing nodes that are indirectly connected to the query through chains of relationships.

In knowledge retrieval systems, PPR translates a set of matched seed entities into a ranked list of documents, facts, or nodes without requiring explicit multi-hop query planning. The graph structure itself encodes the reasoning paths.

## Why It Matters for Knowledge Retrieval

Standard dense retrieval (embedding similarity) answers "what content is semantically similar to this query?" PPR answers "what content is structurally connected to the entities this query mentions?" These are complementary failure modes:

- Dense retrieval fails on **multi-hop questions** where the answer document shares little semantic overlap with the query but is reachable through two or three entity relationships.
- Keyword/BM25 search fails on **indirect references** where the relevant document uses different terminology than the query.
- PPR fails on **semantically similar but structurally distant** content, and on **isolated nodes** not connected to the seed entities.

[HippoRAG](../projects/hipporag.md) demonstrates the gap concretely. On MuSiQue, 2WikiMultiHopQA, and HotpotQA, standard RAG retrieves single-hop relevant passages while missing the bridging documents that connect them. PPR over a knowledge graph of extracted triples traverses these bridges automatically.

## How It Works

### The Algorithm

For a graph G with adjacency matrix A and a seed set S of query-relevant nodes, PPR computes a stationary distribution p over all nodes satisfying:

```
p = alpha * e_S + (1 - alpha) * A' * p
```

Where:
- `alpha` is the teleportation probability (typically 0.15–0.3)
- `e_S` is a probability distribution concentrated on seed nodes (uniform over seeds, or weighted by query-entity match scores)
- `A'` is the column-normalized adjacency matrix

Higher `alpha` keeps the distribution close to the seeds (good for precision). Lower `alpha` allows the walk to explore the graph more widely (good for recall on multi-hop queries). In practice, retrieval systems tune alpha based on expected query complexity.

The power iteration method solves this: initialize p = e_S, then repeatedly apply `p = alpha * e_S + (1 - alpha) * A' * p` until convergence (typically 20–50 iterations for sparse graphs).

### Seed Node Selection

The quality of seed selection determines PPR's retrieval quality. Common strategies:

1. **Entity matching**: Extract entities from the query via NER, embed them, retrieve the K most similar entities from the knowledge graph, use those as seeds. This is [HippoRAG](../projects/hipporag.md)'s approach.

2. **Fact matching**: Embed the query, retrieve the top-K matching facts (subject-predicate-object triples), extract entities from those facts as seeds. This is more robust than direct entity matching because fact retrieval provides broader coverage.

3. **Document node seeds**: For graphs where documents are nodes, use embedding similarity to select seed documents directly, then let PPR propagate relevance to connected documents.

4. **Hybrid seeds**: Combine entity seeds and fact seeds, weighting each by their query relevance score.

### Edge Types and Weights

Edge weights control how relevance propagates. Different edge types can carry different weights:

- **Co-occurrence edges** (entity X and entity Y appear in the same passage): weight proportional to co-occurrence frequency
- **Relation edges** (subject-predicate-object triple): weight 1.0 or by extraction confidence
- **Synonymy edges** (semantically similar entities): weight by embedding cosine similarity, thresholded to prevent noise

[HippoRAG](../projects/hipporag.md) specifically adds **synonymy edges** between semantically similar entity nodes (via KNN on entity embeddings), which is the key mechanism enabling cross-document reasoning when the same entity appears under different surface forms ("Barack Obama" vs "Obama" vs "the President").

### Scoring and Combination

After PPR, each node has a relevance score. For document retrieval, passage nodes receive scores by summing PPR scores of their constituent entity nodes. The final ranking typically combines:

```
score(doc) = w_ppr * ppr_score(doc) + (1 - w_ppr) * dense_score(doc)
```

[HippoRAG](../projects/hipporag.md) controls this balance via `passage_node_weight`. [Graphiti](../projects/graphiti.md)/[Zep](../projects/zep.md) achieves similar hybrid scoring by running PPR alongside cosine similarity and BM25 in parallel, then fusing results via RRF or cross-encoder reranking.

## Implementation Details

### HippoRAG Implementation

HippoRAG (`src/hipporag/HippoRAG.py`) runs PPR via the igraph library on a knowledge graph built from OpenIE-extracted triples. The implementation:

1. Calls `get_fact_scores()` to compute query-fact similarities
2. Passes top facts through a DSPy-optimized recognition memory filter (LLM reranker)
3. Extracts entity nodes from surviving facts as seeds
4. Calls `graph_search_with_fact_entities()` which runs igraph's built-in PPR with the seed node distribution
5. Propagates entity node PPR scores to passage nodes by summing entity scores per passage

The graph is stored as a Python Pickle file. For production deployments, this limits portability and increases deserialization attack surface, but keeps the system zero-infrastructure.

The `synonymy_edge_topk` and `synonymy_edge_sim_threshold` parameters control the density of cross-entity connections. Typical values: top 100 nearest neighbors, similarity threshold 0.7–0.85. Too dense and false connections corrupt retrieval; too sparse and multi-hop reasoning degrades.

### Graphiti/Zep Implementation

[Graphiti](../projects/graphiti.md) (`graphiti_core/search/search.py`) incorporates graph traversal as BFS rather than full PPR, using `phi_bfs` seeded from recent episode nodes. This is computationally cheaper than power-iteration PPR but less principled: BFS doesn't assign graded relevance scores to multi-hop neighbors, it just includes or excludes them based on distance cutoff. The upside is sub-second latency on large graphs.

The three-method search (`phi_cos` + `phi_bm25` + `phi_bfs`) maps to the three similarity types the Zep paper identifies: semantic, lexical, and contextual. PPR-style graph traversal fills the "contextual" slot.

### GraphRAG Connection

[GraphRAG](../projects/graphrag.md) uses community detection (Leiden algorithm) as its primary graph-based mechanism rather than PPR. Community-level summaries let it answer global questions ("what are the main themes in this corpus?") that PPR cannot, because PPR requires query-specific seeds and cannot aggregate across the entire graph without degenerating to standard PageRank.

PPR and community detection are complementary: use community summaries for broad thematic queries, PPR for entity-anchored multi-hop queries.

## Concrete Failure Modes

**Seed quality bottleneck**: If the NER or entity matching step fails to identify the right seed nodes, PPR propagates from wrong starting positions. Since HippoRAG uses LLM-based NER, entity extraction quality varies by domain. Medical, legal, and scientific text often produce poor entities unless the extraction prompt is domain-tuned.

**Graph sparsity**: PPR requires connected paths between relevant nodes. For sparse knowledge graphs (few triples per entity, weak synonymy edges), PPR degenerates toward the seed distribution and provides minimal multi-hop benefit. The system silently falls back to single-hop retrieval rather than erroring, making this failure mode invisible.

**Isolated document nodes**: Documents with no entity overlap with other documents receive no PPR score beyond their direct seed contribution. This affects technical documentation, code examples, and specialized terminology where entity extraction is limited.

**Scale cost**: Power-iteration PPR on a graph with millions of nodes and edges becomes expensive per query. HippoRAG's implementation is synchronous and in-memory, unsuitable for concurrent serving. Production deployments at scale require either approximate PPR (using sparse random projections or offline-computed PPR vectors per entity) or BFS approximations as Graphiti uses.

**PPR time is tracked but not bounded**: HippoRAG accumulates `self.ppr_time` across queries but has no timeout or circuit breaker. Large graphs can stall queries without graceful degradation.

## When to Use PPR vs. Alternatives

**Use PPR when:**
- Queries require connecting information across multiple documents through entity chains (multi-hop reasoning)
- The knowledge base is structured as a knowledge graph with explicit entity-relationship triples
- Entities in the corpus appear under multiple surface forms that need to be unified (synonymy edges do this work)
- You need to explain *why* a document was retrieved (the path through the graph is interpretable)

**Use dense retrieval ([Embedding Model](../concepts/embedding-model.md) + [Vector Database](../concepts/vector-database.md)) when:**
- Queries are self-contained and the relevant documents share semantic overlap with the query
- You lack structured entity-relationship data (building a knowledge graph from scratch is expensive)
- Latency is critical and graph construction overhead is not amortized

**Use [BM25](../concepts/bm25.md) when:**
- Queries use domain-specific terminology that embedding models may not represent well
- The corpus uses consistent terminology (no entity surface form variation problem)
- Infrastructure simplicity matters more than multi-hop recall

**Use [Hybrid Retrieval](../concepts/hybrid-retrieval.md) (PPR + BM25 + dense) when:**
- Query types are mixed and unpredictable
- Maximum recall is required (at the cost of reranking complexity)
- A [Knowledge Graph](../concepts/knowledge-graph.md) already exists or can be maintained

**Don't use PPR when:**
- The corpus is large, the knowledge graph is dense, and query latency must be under 100ms without precomputation
- Queries are primarily global/thematic rather than entity-anchored
- Knowledge base lacks structured relationship data and building a graph is not viable

## Infrastructure Assumptions

PPR for knowledge retrieval carries several unstated infrastructure requirements:

1. **A knowledge graph must exist**: PPR operates on an existing graph. Building the graph requires entity extraction, relationship extraction, and entity resolution -- typically multiple LLM calls per document. For a 10,000-document corpus, this is hundreds of dollars of LLM inference before retrieval is functional.

2. **Graph must stay current**: As documents change, the knowledge graph must be updated. This is harder than re-embedding documents: adding a new entity may require recomputing synonymy edges against all existing entities (HippoRAG's all-pairs KNN is O(N²) in entity count), and removing an entity requires checking referential integrity.

3. **Memory for in-process graphs**: HippoRAG holds the entire igraph in RAM. A corpus of 100K documents with rich entity extraction can produce millions of nodes and edges, consuming tens of gigabytes. Neither HippoRAG nor Graphiti provides lazy loading or graph sharding.

4. **Graph database for production**: Pure in-memory graphs (igraph Pickle, NetworkX) are appropriate for development but not concurrent multi-user serving. Production deployments need [Neo4j](../projects/neo4j.md), FalkorDB, or similar, with all their operational overhead.

## Relationship to Other Retrieval Concepts

PPR is one component of a [Knowledge Graph](../concepts/knowledge-graph.md)-based retrieval system. It sits between the seed selection phase (entity/fact matching) and the final context assembly phase. In systems that implement [Hybrid Retrieval](../concepts/hybrid-retrieval.md), PPR provides the "structural" signal that complements semantic (embedding) and lexical ([BM25](../concepts/bm25.md)) signals.

[Agentic RAG](../concepts/agentic-rag.md) systems can use PPR as one tool in a multi-step retrieval loop: an initial retrieval step identifies seed entities, PPR expands to related documents, and a second retrieval step fetches the most relevant passages from those documents.

In Long-Term Memory architectures like [Graphiti](../projects/graphiti.md) and [Zep](../projects/zep.md), PPR-style graph traversal enables the system to surface memories that are contextually related to current conversation topics without requiring the user to explicitly ask about them -- the graph structure encodes prior context automatically.

## Unresolved Questions

- **Optimal alpha per query type**: The teleportation probability has a strong effect on precision/recall tradeoff but there is no principled method for tuning it per query. Published systems use fixed alpha (HippoRAG) or abandon full PPR for BFS (Graphiti).
- **Synonymy edge quality at scale**: HippoRAG's all-pairs KNN for synonymy edges degrades for large entity sets. No published work has validated synonymy edge quality beyond the benchmarks in the HippoRAG paper.
- **Incremental graph updates with PPR**: Adding new documents should update PPR scores for affected nodes, but neither HippoRAG nor publicly documented systems provide incremental PPR update strategies. Current practice is full recomputation.
- **Benchmarks beyond multi-hop QA**: PPR's value for single-hop retrieval relative to dense retrieval is not well-characterized. Existing benchmarks (MuSiQue, HotpotQA, 2WikiMultiHopQA) are specifically designed to favor graph traversal approaches.

## Related Concepts and Projects

- [Knowledge Graph](../concepts/knowledge-graph.md) — The data structure PPR operates on
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md) — Common integration pattern combining PPR with BM25 and dense retrieval
- [BM25](../concepts/bm25.md) — Complementary lexical retrieval method
- [HippoRAG](../projects/hipporag.md) — Primary open-source implementation with full PPR pipeline
- [GraphRAG](../projects/graphrag.md) — Alternative graph-based retrieval using community detection rather than PPR
- [Graphiti](../projects/graphiti.md) — Production agent memory system using BFS traversal (PPR approximation)
- [Zep](../projects/zep.md) — Managed service built on Graphiti with temporal knowledge graph

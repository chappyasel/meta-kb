---
entity_id: hybrid-search
type: approach
bucket: knowledge-substrate
abstract: >-
  Hybrid Search combines BM25 sparse retrieval with dense vector search, fusing
  results via reciprocal rank fusion to capture both exact keyword matches and
  semantic similarity that neither method alone handles well.
sources:
  - repos/getzep-graphiti.md
  - repos/supermemoryai-supermemory.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/memvid-memvid.md
  - deep/repos/tirth8205-code-review-graph.md
related:
  - knowledge-graph
  - retrieval-augmented-generation
  - cursor
  - episodic-memory
  - model-context-protocol
  - semantic-memory
last_compiled: '2026-04-08T02:57:37.967Z'
---
# Hybrid Search

## What It Is

Hybrid search combines two retrieval methods that fail in complementary ways: BM25 sparse retrieval (which matches exact tokens) and dense vector search (which matches semantic meaning). A user searching for "CUDA out of memory error" wants exact token matching for the technical string and semantic matching for related concepts like "GPU memory allocation failure." BM25 handles the first; vectors handle the second; hybrid search handles both.

The core mechanism is simple. Run both retrieval methods independently, then merge their ranked result lists into a single ordering. The merged ranking is the output. The sophistication is in how you merge, what you retrieve, and how you handle mismatches between sparse and dense representations.

## Why It Matters for Agent Knowledge Systems

Single-method retrieval has predictable blind spots. BM25 fails on paraphrase: "automobile" and "car" are unrelated tokens. Vector search fails on rare tokens: technical identifiers, proper nouns, version strings, and entity names that appear rarely in training data get poor embeddings and vanish from results. Code symbol names, chemical formulas, and product SKUs are systematically underweighted by embedding models.

For [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md), these blind spots translate directly into agent failures. An agent searching for a specific API function by name gets poor recall from vector search. An agent searching for "how to handle authentication" gets poor precision from BM25 (every document mentioning "authentication" ranks equally). Hybrid search narrows both failure modes without requiring separate retrieval strategies per query type.

Agent memory systems face an additional constraint: the same retrieval layer must handle structured facts ("Alice works at Google"), free-form observations ("the user seems frustrated with the onboarding flow"), and episodic records ("Tuesday's planning session covered Q3 goals"). No single retrieval method performs consistently across all three types.

## How It Works

### BM25 (Sparse Retrieval)

[BM25](../concepts/bm25.md) represents documents as token frequency vectors with two saturation parameters: k1 controls term frequency saturation (default 1.2) and b controls document length normalization (default 0.75). A document scores higher when it contains query terms frequently, adjusted for document length relative to the corpus average. Scores are sparse: only tokens present in both query and document contribute.

The implementation typically uses an inverted index. For each token in the query, the index returns the list of documents containing that token with their frequencies. BM25 computes the score as:

```
score(D, Q) = Σ IDF(qi) · (f(qi, D) · (k1 + 1)) / (f(qi, D) + k1 · (1 - b + b · |D|/avgdl))
```

where f(qi, D) is the term frequency of query term qi in document D, and IDF is the inverse document frequency. Document databases expose BM25 natively: SQLite's FTS5, PostgreSQL's `tsvector`, Elasticsearch, OpenSearch, Tantivy, and Neo4j all implement it. In [Graphiti](../projects/graphiti.md)'s search layer (`graphiti_core/search/search.py`), BM25 runs as phi_bm25 via the graph database's native fulltext index, searching across fact fields, entity names, and community names.

### Dense Vector Search

Vector search embeds query and documents into a shared semantic space, then retrieves documents by nearest-neighbor distance (typically cosine similarity). Documents semantically similar to the query rank highly even with zero token overlap. The embedding model determines what "similar" means: embeddings trained on conversation data weight different semantic relationships than embeddings trained on code.

The infrastructure requirement is a [Vector Database](../concepts/vector-database.md) or an approximate nearest neighbor index. HNSW (Hierarchical Navigable Small World graphs) is the dominant ANN algorithm in production systems: M=16 and ef_construction=100 are common parameters, trading recall against index size and build time. Memvid's `src/vec.rs` uses HNSW (via the Rust `hnsw` crate) for collections exceeding 1000 vectors, switching to brute-force L2 for smaller sets. Graphiti uses cosine similarity search via Neo4j's vector indices.

The embedding dimension determines storage and search cost. BGE-small produces 384-dimensional vectors; BGE-m3 produces 1024-dimensional. Memvid offers four local ONNX models: BGE-small (384-dim, default), BGE-base (768), nomic-embed-text (768), and GTE-large (1024). Graphiti's paper uses BGE-m3 for benchmarks. Product quantization compresses vectors at the cost of recall: Memvid's `src/vec_pq.rs` achieves 16x compression (384-dim to 96 bytes) using 96 subspaces with 256 centroids.

### Fusion: Reciprocal Rank Fusion

Reciprocal Rank Fusion (RRF) is the standard merge algorithm. For each document retrieved by any method, compute its RRF score as the sum of 1/(k + rank) across all retrieval lists that returned it, where k is a smoothing constant (typically 60) and rank is the document's position in each list. Documents appearing in multiple lists get additive score boosts:

```
RRF_score(d) = Σ 1/(k + rank_l(d))  for each list l containing d
```

RRF has three practical advantages over weighted linear combination: it requires no weight tuning, it handles incommensurable scales (BM25 scores and cosine similarities use different ranges), and it is robust to outliers in either ranking. A document ranked first by BM25 and tenth by vectors scores better than a document ranked third by both, which captures the intuition that strong signal from any single method outweighs mediocre signal from all methods.

Code-review-graph's `search.py` implements RRF with k=60 for merging FTS5 and embedding results. Graphiti's `search/search.py` uses RRF (`rrf` reranking strategy) to merge cosine similarity, BM25, and BFS traversal results.

Alternative fusion methods exist but see less use. Linear combination (alpha · vector_score + (1-alpha) · bm25_score) requires score normalization and alpha tuning. CombSUM and CombMNZ aggregate scores directly but inherit scale incompatibility. RRF dominates in practice because it works without configuration.

### Query-Time Decisions

Which documents go to which retrieval method is a design choice. Some systems run both methods over the entire corpus. Others route by query type: BM25 for short exact-match queries, vectors for longer semantic queries. Code-review-graph applies query-aware boosting: PascalCase tokens boost Class/Type results by 1.5x (recognized as code identifiers), snake_case boosts Function results by 1.5x, and dotted paths boost qualified name matches by 2.0x. This is a lightweight classifier that improves precision without complex routing logic.

Query expansion is a related technique: expand BM25 queries with semantic neighbors before retrieval to improve recall on paraphrases. This can be done offline (via a synonym table) or with a small language model. The tradeoff is query latency and the risk of topic drift from poor expansion.

## Who Implements It

Hybrid search appears in every significant retrieval system in this space:

**[Graphiti](../projects/graphiti.md)** implements three-way hybrid search: cosine similarity (phi_cos), BM25 (phi_bm25), and breadth-first graph traversal (phi_bfs). The BFS component is unique: it retrieves facts and entities close in the knowledge graph to specified anchor nodes, capturing contextual relevance that semantic and lexical methods miss. Configured via `SearchConfig` with RRF, node_distance, episode_mentions, MMR, or cross-encoder reranking. The paper (arXiv:2501.13956) reports this combination achieves 71.2% accuracy on LongMemEval with gpt-4o, compared to 60.2% for full-context baseline.

**[SuperMemory](../projects/supermemory.md)** combines RAG and memory retrieval in its default "hybrid" search mode, returning both document chunks and user-specific memories in one query. Their `searchMode: "hybrid"` parameter makes this the default behavior. They claim #1 on LongMemEval (81.6%) though this is self-reported.

**[HippoRAG](../projects/hipporag.md)** extends hybrid search with hippocampal-inspired retrieval: dense vectors find seed nodes in a knowledge graph, then personalized PageRank expands to neighboring nodes via graph traversal. This combines semantic search with structural graph traversal.

**[LlamaIndex](../projects/llamaindex.md)** exposes `QueryFusionRetriever` that runs multiple retrievers and merges results. The default fusion mode is RRF.

**[LangChain](../projects/langchain.md)** provides `EnsembleRetriever` with configurable weights for combining retriever scores. Unlike LlamaIndex's RRF default, LangChain uses weighted linear combination, requiring manual weight tuning.

**Code-review-graph** (`search.py`) implements hybrid search across FTS5 (BM25 via SQLite) and optional vector embeddings with RRF at k=60, plus query-aware kind boosting for code entity types.

## Practical Implications

### Chunking Affects Both Methods Differently

BM25 is sensitive to chunk size: very small chunks (single sentences) miss co-occurrence signals between related terms; very large chunks dilute term frequencies. Vector search is sensitive to semantic coherence: chunks spanning multiple topics produce embeddings that represent no topic well. Optimal chunking for hybrid search is typically document-structure-aware: split at natural semantic boundaries (section headers, paragraph breaks) rather than fixed character counts.

Code-review-graph uses structure-aware chunking in `src/memvid/chunks.rs` with a 1200-character default and special handling for tables and code blocks. Memvid uses 1200-character chunks with a 2400-character minimum document size before chunking activates.

### Reranking Adds a Third Stage

Two-stage retrieval (coarse retrieval + reranking) is now standard. Hybrid search handles the coarse stage: retrieve the top 50-100 candidates. A cross-encoder reranker then scores each candidate against the query jointly (not independently), producing a final top-k. Cross-encoders are slower than bi-encoders but significantly more accurate because they see query and document together. Graphiti's `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` config applies this pattern. Memvid's `ask()` endpoint implements similar multi-stage retrieval with RRF at k=60 and optional cross-encoder reranking.

The latency tradeoff: adding cross-encoder reranking over 50 candidates adds 100-500ms depending on model and hardware. For agent workloads where retrieval is on the critical path, this matters.

### Index Synchronization

Maintaining a BM25 inverted index and a vector index from the same document corpus creates a synchronization problem. When a document updates, both indices must update atomically or queries during the update window return inconsistent results. Systems that use a single database for both indices (PostgreSQL with pgvector + `tsvector`, or Elasticsearch with dense_vector fields) handle this with transaction semantics. Systems with separate BM25 and vector stores must implement their own coordination.

[Graphiti](../projects/graphiti.md) stores both indices in Neo4j: the graph database maintains its own fulltext index (BM25) and vector index for entity embeddings, so updates to a node update both indices in the same transaction. Memvid stores the Tantivy (BM25) index and HNSW (vector) index both inside the `.mv2` file, serializing both on `commit()`.

## Limitations and Failure Modes

**Vocabulary mismatch in both directions**: If a query uses terminology that neither appears in documents (BM25 miss) nor appears in embedding training data (vector miss), hybrid search fails entirely. Technical jargon from emerging domains, proprietary terminology, and multilingual content spanning languages the embedding model handles poorly all exhibit this failure. No fusion strategy recovers from poor base retrieval.

**Embedding model dependency**: Vector search quality is bounded by embedding model quality for the specific domain. An embedding model trained on web text handles code entity names poorly; one trained on code handles conversational language poorly. Most deployed systems use a single embedding model for all content types, accepting degraded performance on out-of-domain content. [Semantic Search](../concepts/semantic-search.md) quality varies significantly by domain.

**Infrastructure overhead**: Hybrid search requires two indices (sparse and dense), two retrieval paths, a fusion step, and optionally a reranking step. This doubles the indexing pipeline complexity and adds query-time latency. For simple corpora or latency-sensitive applications, the overhead may not be justified.

**RRF ties**: RRF breaks ties by returning the document from the first list in case of equal rank sum. For equally-ranked results, ordering is arbitrary. Downstream agents consuming top-1 results are sensitive to this tie-breaking behavior.

**Score normalization traps**: When developers use weighted linear combination instead of RRF, they must normalize BM25 and vector scores to a common range. BM25 scores are corpus-dependent (a score of 5.0 means different things in different corpora), so min-max normalization over retrieved results produces inconsistent weights across queries. RRF avoids this by using only rank positions.

## When NOT to Use It

**Small corpora (<1000 documents)**: BM25 requires sufficient corpus statistics (IDF values) to produce meaningful rankings. On small corpora, IDF underweights common terms incorrectly and the marginal benefit over simple keyword search is small. Build cost and query latency are harder to justify.

**Hard exact-match requirements**: If users need exact string matching (searching for a specific error code, a UUID, a version string), BM25 with standard tokenization may tokenize or normalize the string in ways that prevent exact matching. Use a dedicated exact-match index instead.

**Real-time streaming data**: Maintaining synchronized BM25 and vector indices over a high-velocity event stream is operationally complex. Systems processing thousands of documents per second face write amplification from dual indexing. Consider approximate single-method retrieval until data velocity drops.

**Homogeneous content with clear lexical structure**: Code search within a single language using a language-aware parser (like code-review-graph's Tree-sitter approach) can outperform hybrid search on BM25 alone because the structural index (qualified names, AST relationships) handles semantic proximity better than general embeddings. Code-review-graph's FTS5 MRR of 0.35 on its benchmark is achieved without vectors.

## Unresolved Questions

**Optimal k for RRF by domain**: The k=60 default comes from original RRF paper evaluation on TREC benchmarks. Whether k=60 is optimal for conversational memory, code retrieval, or knowledge graph fact retrieval is unverified. Most systems use the default without tuning.

**BFS as a hybrid search component**: Graphiti's three-way hybrid (cosine + BM25 + BFS) is unusual. The paper attributes temporal reasoning improvements (+38.4% on LongMemEval temporal questions) partly to this combination, but does not isolate the BFS contribution from the temporal edge model. Whether BFS over arbitrary knowledge graphs improves retrieval generally is an open question.

**Embedding model selection at scale**: No standard guidance exists on which embedding model performs best for which types of agent memory content. Practitioners make ad hoc choices (BGE-small for speed, text-embedding-3-large for quality) without systematic benchmarking on their specific content types.

**Continual index updating**: [Continual RAG](../concepts/continual-rag.md) requires hybrid search indices that update without degrading existing retrieval quality. How embedding index updates (adding new vectors, removing old ones) interact with BM25 IDF updates is not addressed in most hybrid search implementations.

## Alternatives

**BM25 only**: Use when queries are keyword-intensive, corpus vocabulary is stable, and infrastructure simplicity matters. Effective for technical documentation search and log retrieval.

**Vector search only**: Use when queries are semantic and conversational, exact token matching is rare, and infrastructure for a vector database is acceptable. [Semantic Memory](../concepts/semantic-memory.md) systems often default to this.

**[Knowledge Graph](../concepts/knowledge-graph.md) traversal only**: Use when entities and relationships are the primary retrieval target and queries are structured ("who works at Google?"). [GraphRAG](../projects/graphrag.md) and Graphiti's BFS component use this approach. Handles multi-hop reasoning that neither BM25 nor vectors support natively.

**Full-context retrieval**: For short contexts (<32k tokens), send the entire document corpus to the LLM and skip retrieval entirely. LongMemEval results show this underperforms structured retrieval on complex temporal and multi-session questions, but it eliminates retrieval infrastructure entirely. Use when context window size is sufficient and retrieval engineering cost is not justified.

**[RAPTOR](../projects/raptor.md)**: Hierarchical summarization creates document trees where higher levels summarize lower levels. Retrieval searches multiple granularity levels simultaneously. Better for hierarchical content (books, technical reports) than for conversational memory.

---

*Related concepts: [BM25](../concepts/bm25.md), [Semantic Search](../concepts/semantic-search.md), [Vector Database](../concepts/vector-database.md), [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md), [Knowledge Graph](../concepts/knowledge-graph.md), [Episodic Memory](../concepts/episodic-memory.md), [Semantic Memory](../concepts/semantic-memory.md), [Context Engineering](../concepts/context-engineering.md), [Continual RAG](../concepts/continual-rag.md)*

*Projects implementing this: [Graphiti](../projects/graphiti.md), [SuperMemory](../projects/supermemory.md), [HippoRAG](../projects/hipporag.md), [LlamaIndex](../projects/llamaindex.md), [LangChain](../projects/langchain.md), [Cursor](../projects/cursor.md), [Model Context Protocol](../concepts/model-context-protocol.md)*


## Related

- [Knowledge Graph](../concepts/knowledge-graph.md) — part_of (0.6)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — implements (0.7)
- [Cursor](../projects/cursor.md) — implements (0.5)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.5)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.5)
- [Semantic Memory](../concepts/semantic-memory.md) — implements (0.6)

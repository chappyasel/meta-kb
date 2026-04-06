---
entity_id: hybrid-retrieval
type: approach
bucket: knowledge-bases
abstract: >-
  Hybrid retrieval combines BM25 sparse keyword search with dense vector
  similarity search to improve RAG recall and precision, covering complementary
  failure modes that neither method handles alone.
sources:
  - repos/getzep-graphiti.md
  - repos/supermemoryai-supermemory.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - rag
  - episodic-memory
  - semantic-memory
  - bm25
  - graphiti
  - zep
last_compiled: '2026-04-06T02:07:14.325Z'
---
# Hybrid Retrieval

## What It Is

Hybrid retrieval runs two search methods against the same corpus and merges their results: dense vector search (embedding similarity) and sparse keyword search (typically [BM25](../concepts/bm25.md)). The core premise is that each method fails in different ways, so combining them raises the floor on recall.

Dense search finds semantically similar content even when exact terms differ. Ask about "automobile fuel efficiency" and it retrieves documents about "car mileage" because their embeddings are close. Sparse search finds exact and near-exact term matches regardless of surrounding context. Search for "JWT HS256" and BM25 finds it; an embedding model may bury it under generic authentication content.

These failure modes don't overlap much. The systematic analysis in [Han et al.'s RAG vs GraphRAG evaluation](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) found that 13.6% of questions were answered correctly only by graph-augmented retrieval while 11.6% were answered only by standard RAG, with non-overlapping error patterns between the two approaches. The same complementarity dynamic applies within flat retrieval: when you look at queries that one method gets right and the other gets wrong, they cluster by query type rather than distributing randomly.

## How It Works

### Score Fusion

Running two searches produces two ranked lists. Merging them requires a common score scale, since BM25 relevance scores and cosine similarities are not directly comparable. Three fusion strategies see practical use:

**Reciprocal Rank Fusion (RRF)** converts ranks to scores using 1/(k + rank), where k is typically 60. A document ranked 3rd by BM25 and 7th by vector search gets combined score 1/63 + 1/67. RRF is rank-based, so it's immune to score magnitude differences between methods and requires no calibration. [Graphiti's search layer](../raw/deep/repos/getzep-graphiti.md) uses RRF as one of its reranking strategies in `search/search.py`.

**Linear combination** weights normalized scores directly: combined = α * sparse_score + (1 - α) * dense_score. This preserves magnitude information but requires normalizing each score distribution and tuning α. Common defaults are α = 0.5 (equal weight) or α = 0.3 (favor dense). [Qdrant](../projects/qdrant.md) exposes this as its default hybrid search mode.

**Learned fusion** trains a small model on query-document pairs to predict relevance from both scores plus optional query features. Higher quality but requires labeled data.

### Sparse Retrieval: BM25

BM25 scores a document d for query q by summing per-term scores: each term contributes log((N - df + 0.5) / (df + 0.5)) * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * dl / avgdl)). Here N is corpus size, df is document frequency for the term, tf is term frequency in d, dl is document length, avgdl is average document length, and k1 (typically 1.2–2.0) and b (typically 0.75) are tuning parameters.

The key properties for retrieval: rare terms score higher than common terms (IDF component), additional occurrences of the same term have diminishing returns (TF saturation), and longer documents are penalized relative to shorter ones (length normalization). BM25 operates on an inverted index and runs fast even against millions of documents.

### Dense Retrieval

Dense search embeds the query and all documents into a shared vector space, then retrieves by maximum inner product or cosine similarity. Document embeddings are precomputed and indexed in a [vector database](../concepts/vector-database.md); query embedding happens at inference time. Approximate nearest-neighbor algorithms (HNSW, IVF) make search sublinear in corpus size at the cost of small recall losses.

The embedding model determines what "similar" means. General-purpose models (OpenAI text-embedding-3, BGE-m3) work across domains. Domain-specific fine-tuned models improve performance for specialized corpora at the cost of flexibility.

### Optional Reranking

A cross-encoder reranker takes (query, document) pairs and produces relevance scores using full attention between query and document tokens. Cross-encoders are too slow to run against the full corpus but can rerank the top 50–200 candidates from hybrid retrieval. This adds 100–500ms latency but consistently improves precision. [Graphiti](../projects/graphiti.md) supports OpenAI, BGE, and Gemini cross-encoders in its `cross_encoder/` directory.

## Query-Type Sensitivity

Not all queries benefit equally from each method. The [Han et al. benchmark](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) shows clear patterns on MultiHop-RAG with Llama 70B:

- Temporal reasoning: GraphRAG (graph-augmented retrieval) outperforms flat RAG by +23.3 F1 points, suggesting temporal structure requires more than lexical or semantic matching
- Comparison queries: graph-aware retrieval +3.85 F1 over standard RAG
- Inference queries: standard RAG +2.82 F1
- Null queries (no answer in corpus): standard RAG +2.66 F1

For flat hybrid retrieval (BM25 + dense, no graph), keyword queries favor BM25 (technical identifiers, proper nouns, exact phrases), paraphrase queries favor dense, and multi-hop queries often require graph-level structure that neither flat method provides.

## Where It's Implemented

**[Graphiti](../projects/graphiti.md)** runs three search methods in parallel (`search/search.py`): cosine similarity (phi_cos), BM25 fulltext via Neo4j Lucene (phi_bm25), and breadth-first graph traversal from anchor nodes (phi_bfs). The paper explicitly frames these as targeting "word similarities, semantic similarities, and contextual similarities" respectively. Results merge via RRF, node distance, episode mentions, MMR, or cross-encoder reranking depending on the configured `SearchConfig`.

**[Zep](../projects/zep.md)** uses the same Graphiti hybrid pipeline and the [arXiv paper](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) reports 18.5% accuracy improvement and 90% latency reduction on LongMemEval over full-conversation baselines. BM25 handles word-level matches that embedding similarity misses; graph traversal from recent episode nodes adds a third signal unavailable in flat retrieval.

**[Supermemory](../projects/supermemory.md)** runs hybrid search as its default mode, combining RAG document retrieval with personalized memory extraction in a single query. Their documentation distinguishes "memories" mode (facts about users over time) from "hybrid" mode (memories + document chunks merged). They claim #1 on LongMemEval at 81.6% accuracy, though this is self-reported and not independently validated.

**[Qdrant](../projects/qdrant.md)** exposes native hybrid search through its Query API: dense search uses HNSW vector index, sparse search uses a separate sparse vector index, and fusion via RRF is configured per request. **[ChromaDB](../projects/chromadb.md)** supports hybrid queries through its metadata filtering plus embedding search, though its BM25 support is more limited. **[LlamaIndex](../projects/llamaindex.md)** provides a `QueryFusionRetriever` that wraps multiple retrievers and applies RRF.

## Strengths

Hybrid retrieval handles vocabulary mismatch failures. A user asking about "myocardial infarction" and a document describing "heart attack" present a challenge for BM25 but not for a well-trained embedding model. Conversely, a query for a specific API endpoint name ("POST /api/v2/users/batch") lands exactly in BM25's strength zone.

For knowledge bases with mixed content, rare technical terms, product names, and code identifiers, hybrid retrieval consistently outperforms either method alone with minimal implementation complexity. The [Han et al. integration strategy](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) (concatenating both retrieval results) yields +6.4% improvement on multi-hop tasks over RAG baseline, with the cost being doubled retrieval compute.

## Limitations

**The entity extraction ceiling.** For graph-augmented hybrid retrieval (like Graphiti), the [Han et al. analysis](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) found only 65.8% of answer-relevant entities exist in constructed knowledge graphs on HotPotQA. This ~34% miss rate creates a hard recall ceiling that no fusion strategy can overcome. If the entity was never extracted, neither BM25 nor cosine similarity nor graph traversal will find it.

**Flat hybrid doesn't solve multi-hop reasoning.** For queries requiring two or more inference steps across documents, merging BM25 and dense results still produces a list of independently retrieved chunks. The chunks may all be correct in isolation but miss the connecting inference. Graph traversal (as in Graphiti's phi_bfs) partially addresses this, but it requires a graph database with pre-populated edges, not just a vector index.

**Calibration and weight tuning.** Linear combination fusion requires choosing α and normalizing score distributions. The right balance shifts by query type, corpus domain, and embedding model. RRF sidesteps this by working on ranks, but rank-based fusion discards score magnitude information that sometimes matters.

**Infrastructure cost.** Full hybrid retrieval requires maintaining both a vector index and either an inverted index (Elasticsearch, Lucene, PostgreSQL full-text) or BM25 implementation, plus a graph database if using structural retrieval. This is three separate systems to operate, monitor, and keep synchronized. For small teams, this operational overhead may exceed the recall improvement benefit.

## When Not to Use It

If your corpus is entirely technical documentation with consistent terminology, BM25 alone may match dense search quality at lower latency and infrastructure cost. The benefit of hybrid retrieval scales with vocabulary diversity in the corpus.

If latency is the primary constraint (sub-50ms retrieval), running two search methods plus optional reranking adds overhead. BM25 alone is faster than dense retrieval for exact-match queries; dense alone is faster than hybrid. Hybrid retrieval is the right choice when recall matters more than raw speed.

If you're building on top of a platform like [Zep](../projects/zep.md) or [Supermemory](../projects/supermemory.md) that already implements hybrid retrieval, you don't need to build it yourself. The decision becomes which platform's fusion strategy and reranking fits your query distribution.

## Alternatives and Selection Guidance

- Use **BM25 alone** when exact-match keyword precision matters more than recall and your corpus has consistent terminology
- Use **dense search alone** when paraphrase handling is critical and you can tolerate occasional misses on rare technical terms
- Use **hybrid retrieval** when your corpus mixes natural language and technical identifiers, or when your users phrase queries differently from how documents are written
- Use **graph-augmented hybrid retrieval** ([Graphiti](../projects/graphiti.md), [GraphRAG](../projects/graphrag.md)) when temporal reasoning or multi-hop inference is part of your query distribution, with the caveat that graph construction requires significantly more infrastructure and the ~34% entity extraction miss rate is a hard ceiling

## Unresolved Questions

The [Han et al. paper](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) identifies position bias in LLM-as-judge evaluations of hybrid vs. non-hybrid retrieval: reversing the presentation order of results can invert preference judgments. This means most reported benchmark improvements from hybrid retrieval may be partially artifacts of evaluation methodology. Independent evaluation with ground-truth metrics (F1, exact match) is more reliable than LLM judge comparisons.

Optimal fusion weights vary by domain and query type, but there is no standard methodology for calibrating them on new corpora. Most implementations use RRF defaults or equal-weight linear combination without ablation. The question of when to tune fusion weights versus accepting defaults remains practically unanswered.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md) — the broader retrieval architecture within which hybrid retrieval operates
- [BM25](../concepts/bm25.md) — the sparse retrieval algorithm used in most hybrid implementations
- [Vector Database](../concepts/vector-database.md) — infrastructure for dense retrieval
- [Semantic Memory](../concepts/semantic-memory.md) — memory architecture that implements hybrid search for structured knowledge
- [Episodic Memory](../concepts/episodic-memory.md) — memory type that benefits from hybrid retrieval for temporal fact lookup
- [Agentic RAG](../concepts/agentic-rag.md) — retrieval patterns for multi-step agent reasoning
- [Graphiti](../projects/graphiti.md) — implements three-way hybrid search (BM25 + cosine + BFS)
- [Zep](../projects/zep.md) — production memory layer built on Graphiti's hybrid search

---
entity_id: hybrid-search
type: approach
bucket: knowledge-bases
abstract: >-
  Hybrid search combines dense vector search with sparse keyword search (BM25)
  to retrieve documents that are both semantically similar and lexically
  matched, outperforming either method alone on queries with specific
  terminology or named entities.
sources:
  - repos/getzep-graphiti.md
  - repos/supermemoryai-supermemory.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - semantic-memory
  - graphiti
  - zep
  - entity-extraction
  - rag
  - episodic-memory
  - mcp
  - bm25
  - knowledge-graph
  - vector-database
last_compiled: '2026-04-07T11:50:17.569Z'
---
# Hybrid Search

## What It Is

Hybrid search runs two retrieval methods in parallel and merges their results: a dense retrieval pass using vector embeddings to find semantically similar documents, and a sparse retrieval pass using BM25 to find lexically matched documents. The merged list gets reranked before being returned to the caller.

The core insight is that each method fails where the other succeeds. A vector search for "acetylsalicylic acid" may return documents about pain relief without mentioning aspirin by name. A BM25 search for "aspirin" will miss documents that describe the compound by its chemical name. Running both and merging the results recovers what either alone would drop.

This matters for [Retrieval-Augmented Generation](../concepts/rag.md) systems because the quality of retrieved context determines the quality of generated answers. A retrieval step that drops relevant documents produces hallucinated or incomplete responses regardless of how capable the language model is.

## How It Works

### Dense Retrieval

An [Embedding Model](../concepts/embedding-model.md) encodes both the query and each document into fixed-dimensional vectors (commonly 768 or 1024 dimensions). Retrieval then finds the documents whose vectors are closest to the query vector using cosine similarity or dot product, typically via approximate nearest-neighbor search through a [Vector Database](../concepts/vector-database.md).

Dense retrieval captures semantic intent. "How do I fix a null pointer?" and "dereferencing uninitialized memory causes segfaults" may share zero vocabulary but sit close in embedding space.

### Sparse Retrieval

[BM25](../concepts/bm25.md) scores documents by term frequency and inverse document frequency with length normalization. It rewards documents containing rare query terms that appear multiple times without penalizing shorter documents unfairly. Most implementations run through inverted indices — Elasticsearch's Lucene backend, PostgreSQL's tsvector, or Neo4j's fulltext index.

Sparse retrieval excels at exact match. Product codes, personal names, technical jargon, and acronyms all match precisely through BM25 while often being poorly served by vector similarity if they're underrepresented in the embedding model's training data.

### Score Fusion

Raw scores from dense and sparse passes are not comparable — cosine similarity returns values between -1 and 1, BM25 scores are unbounded. Merging requires normalization or a rank-based approach.

**Reciprocal Rank Fusion (RRF)** is the most common choice. For each document, it computes `1 / (k + rank)` for each ranked list it appears in and sums these values. A common default is k=60. The formula's key property: documents ranked highly in both lists score substantially higher than documents ranked highly in only one. Documents absent from a list contribute zero.

RRF requires no score normalization, handles lists of different lengths, and is robust to score distribution differences between retrieval methods. [Graphiti's](../projects/graphiti.md) search layer exposes RRF as one of several reranking strategies alongside maximal marginal relevance and cross-encoder reranking.

Linear combination (weighted sum of normalized scores) is an alternative that lets developers tune the relative weight of each signal. This requires more configuration and often underperforms RRF without careful calibration. Elasticsearch's hybrid search uses RRF as the default fusion strategy.

### Optional Reranking

After fusion, an optional cross-encoder pass reranks the top-k candidates. Cross-encoders process the query and each candidate document together, enabling the model to assess relevance holistically rather than comparing independent embeddings. This substantially improves result quality at the cost of additional latency and compute.

Graphiti implements cross-encoder reranking through OpenAI's reranker, BGE Reranker (Hugging Face), and Gemini Reranker — the `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` config applies this as a final stage.

## Implementations

### Graphiti

Graphiti's search layer (`search/search.py`) runs three complementary retrieval methods in parallel: cosine similarity on fact embeddings, BM25 full-text search via the underlying graph database's Lucene integration, and breadth-first graph traversal within n-hop neighborhoods of recent episodes. The paper formalizes this as targeting "word similarities, semantic similarities, and contextual similarities" through separate channels. The BFS component is unique to graph-based memory systems — it surfaces facts that are contextually adjacent even when they share no semantic or lexical similarity with the query.

### Zep

The [Zep](../projects/zep.md) architecture (arXiv:2501.13956) applies hybrid search across four scopes simultaneously: semantic edges (fact fields), entity node names, community node names, and raw episode content. On the LongMemEval benchmark, Zep's hybrid retrieval reduced context from 115,000 tokens to approximately 1,600 tokens while improving accuracy from 60.2% to 71.2% with gpt-4o — an 18.5% accuracy gain and 91% latency reduction. These results are self-reported from the Zep paper.

### Elasticsearch

Elasticsearch implements hybrid search by combining a `knn` query (approximate nearest-neighbor via HNSW) with a `match` or `multi_match` query for BM25. The `hybrid` query type, introduced in 8.8, handles score normalization and RRF fusion natively. The Elasticsearch Labs article on agent memory uses this setup with ELSER (Elastic Learned Sparse Encoder) for semantic representation alongside standard BM25, applying document-level security filters before retrieval to scope results by user identity.

### Supermemory

[Supermemory](../projects/supermemory.md) exposes hybrid search as the default search mode (`searchMode: "hybrid"`), combining RAG over stored documents with personalized memory retrieval in a single query. The system claims the #1 position on LongMemEval (81.6%) though this is self-reported and the methodology details are limited in public documentation.

### LlamaIndex and LangChain

[LlamaIndex](../projects/llamaindex.md) and [LangChain](../projects/langchain.md) both provide hybrid retriever abstractions that wrap any vector store and keyword search backend. LlamaIndex's `QueryFusionRetriever` merges results from configurable sub-retrievers. LangChain's `EnsembleRetriever` applies RRF across arbitrary retriever combinations.

## When Hybrid Beats Single-Method Retrieval

Dense-only retrieval underperforms on:
- Exact matches for proper nouns, product identifiers, version numbers
- Technical acronyms not well-represented in training data
- Queries where the user's phrasing closely matches document vocabulary

Sparse-only retrieval underperforms on:
- Paraphrase and synonym matching
- Cross-lingual queries
- Conceptual queries where intent diverges from surface form

Hybrid retrieval is the practical default for production RAG systems because the failure modes are complementary — what one misses, the other usually catches.

## Failure Modes

**Score gaming**: BM25 rewards term frequency, so documents that repeat query terms many times score highly regardless of information quality. Dense retrieval can favor documents whose embedding happens to be close to the query embedding without the document being genuinely relevant. Reranking mitigates both but adds latency.

**Fusion tuning**: RRF's k parameter and linear combination weights both require tuning for the specific corpus and query distribution. The commonly cited k=60 default often underweights sparse results for technical domains where exact term matches are critical. Systems deployed without domain-specific calibration may see sparse retrieval contribute less than it should.

**Infrastructure assumption**: Hybrid search requires maintaining two separate indices — a vector index and a keyword index — in sync. Systems that update documents asynchronously (batch indexing, delayed embedding) can produce stale results where the two indices reflect different document states. This is a silent failure: the system returns results without signaling that they're inconsistent.

**Cross-encoder bottleneck**: Adding cross-encoder reranking improves quality significantly but adds 100-500ms of latency per query depending on the number of candidates and model size. Production systems must cap the candidate set passed to the reranker or accept the latency cost.

## When NOT to Use Hybrid Search

For corpora where exact term matching dominates — legal document retrieval, medical code lookup, API reference search — BM25 alone often outperforms hybrid search. The dense retrieval pass adds latency and infrastructure complexity without improving recall when documents are structured around controlled vocabularies.

For very small corpora (under a few hundred documents), BM25 over the full corpus is fast enough that the vector index provides no retrieval speed benefit, and both methods will return the same small set of candidates anyway.

## Unresolved Questions

Hybrid search literature rarely addresses how fusion weights should adapt as the corpus changes. A k=60 RRF configuration tuned on a corpus at initial deployment may perform differently as the corpus grows and document score distributions shift. Most systems use static configurations without monitoring.

The relative contribution of sparse vs. dense retrieval varies by domain, query type, and embedding model quality. Systems that use weak embedding models in specialized domains may see dense retrieval hurt more than it helps, but this is difficult to detect without systematic evaluation.

## Related Concepts

- [BM25](../concepts/bm25.md) — the sparse retrieval component
- [Vector Database](../concepts/vector-database.md) — infrastructure for dense retrieval
- [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md) — the dominant fusion algorithm
- [Retrieval-Augmented Generation](../concepts/rag.md) — the primary application context
- [Semantic Memory](../concepts/semantic-memory.md) — agent memory systems that rely on hybrid retrieval
- [Agentic RAG](../concepts/agentic-rag.md) — retrieval architectures that compose hybrid search with agent decision-making
- [Entity Extraction](../concepts/entity-extraction.md) — improves sparse retrieval precision by indexing named entities alongside full documents
- [Knowledge Graph](../concepts/knowledge-graph.md) — graph traversal extends hybrid search with structural retrieval
- [Graphiti](../projects/graphiti.md) — implements hybrid search across semantic, lexical, and graph-traversal dimensions
- [Zep](../projects/zep.md) — production memory system built on Graphiti's hybrid retrieval

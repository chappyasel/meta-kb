---
entity_id: hybrid-search
type: approach
bucket: knowledge-substrate
abstract: >-
  Hybrid Search combines BM25 sparse keyword matching with dense vector
  similarity, merging results via reciprocal rank fusion to recover what either
  method misses alone.
sources:
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/memvid-memvid.md
  - deep/repos/tirth8205-code-review-graph.md
  - repos/getzep-graphiti.md
  - repos/supermemoryai-supermemory.md
related:
  - knowledge-graph
  - cursor
  - episodic-memory
last_compiled: '2026-04-08T23:14:37.024Z'
---
# Hybrid Search

## What It Is

Hybrid search runs two retrieval passes over the same corpus — one sparse, one dense — then merges their result lists before returning candidates to the caller.

The **sparse pass** scores documents by exact and near-exact token overlap. [BM25](../concepts/bm25.md), the standard algorithm, weighs term frequency against inverse document frequency: rare terms that appear in a document score higher than common ones. BM25 handles acronyms, code symbols, proper nouns, and technical identifiers cleanly because it operates on literal token strings.

The **dense pass** scores documents by cosine similarity between query and document embedding vectors stored in a [vector database](../concepts/vector-database.md). Embedding models compress meaning into high-dimensional vectors, so semantically equivalent phrases ("heart attack" and "myocardial infarction") land near each other even with zero lexical overlap.

Neither pass dominates. Sparse retrieval fails when the user paraphrases or queries conceptually without using source vocabulary. Dense retrieval fails on rare proper nouns, code identifiers, and out-of-distribution tokens that the embedding model never saw during training. Hybrid search runs both and merges.

## Why It Matters for Agents

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines fail silently: the LLM never learns that its context is missing a critical document, it just generates from whatever was retrieved. Hybrid search lowers the miss rate compared to either method alone, which matters more as the corpus grows and query diversity increases.

For [agent memory](../concepts/agent-memory.md) specifically, the case is stronger. Agents store heterogeneous content: structured entity facts ("Alice's employer: Google"), natural language summaries, raw conversation turns, code snippets. A single retrieval strategy cannot handle all of these well. Structured entity names and code identifiers call for BM25; conceptual questions about preferences or relationships call for dense search. Hybrid retrieval handles both in one query.

## How It Works

### Reciprocal Rank Fusion

The standard merging algorithm is Reciprocal Rank Fusion (RRF). Given result lists from $k$ retrieval methods, each document's score is:

$$\text{RRF}(d) = \sum_{i=1}^{k} \frac{1}{K + \text{rank}_i(d)}$$

where $K$ is a constant (typically 60) that dampens the advantage of top-ranked items and provides a floor for documents that don't appear in every list. Documents that rank well in multiple lists accumulate higher scores. Documents absent from a list contribute nothing for that list.

RRF has two practical advantages over weighted score combination: it requires no tuning of fusion weights, and it is robust to score distribution differences between sparse and dense methods (BM25 scores are unbounded; cosine similarities are bounded to [-1, 1]).

### Three-Way Hybrid in Practice

Several production implementations extend beyond two passes. [Graphiti](../projects/graphiti.md) runs three parallel methods in `search/search.py`:

1. **Cosine similarity** (`phi_cos`) — vector embedding search targeting semantic similarity
2. **BM25** (`phi_bm25`) — database-native fulltext search targeting word-level similarity
3. **BFS** (`phi_bfs`) — breadth-first graph traversal from anchor nodes targeting contextual proximity

The paper formalizes this as covering "word similarities, semantic similarities, and contextual similarities" — three dimensions that no single method addresses. After retrieval, the system applies one of several reranking strategies: RRF for standard multi-signal fusion, `node_distance` for graph-anchor queries, `mmr` for result diversification, or a cross-encoder neural reranker for maximum precision at higher compute cost.

Code-review-graph implements a similar pattern in `search.py`: FTS5 BM25 against a SQLite fulltext index, optional sentence-transformer embeddings, and RRF fusion with $k=60$. It adds query-aware boosting heuristics on top: PascalCase query tokens boost Class and Type results by 1.5×; snake_case tokens boost Function results by 1.5×; dotted-path queries boost qualified-name matches by 2.0×.

### Dense Retrieval Side

[Semantic search](../concepts/semantic-search.md) via embedding vectors requires a vector index. [FAISS](../projects/faiss.md) (Facebook AI Similarity Search) provides HNSW and IVF indices for approximate nearest neighbor lookup. [Qdrant](../projects/qdrant.md), [ChromaDB](../projects/chromadb.md), and [Pinecone](../projects/pinatone-project.md) expose managed vector indices with metadata filtering. The specific algorithm matters: HNSW trades index size for sub-linear query time; brute-force L2 is exact but $O(n)$. For large corpora (>100K vectors), approximate methods dominate.

Embedding model choice sets the ceiling on dense retrieval quality. Domain mismatch degrades performance: a model trained on general web text will produce poor embeddings for medical terminology or code. Graphiti uses BGE-m3 (BAAI) for benchmarks; code-review-graph defaults to all-MiniLM-L6-v2 (384 dimensions) with ONNX for local inference.

### Sparse Retrieval Side

BM25 requires an inverted index. Most implementations build on established engines: Elasticsearch, Tantivy (Rust), or SQLite's FTS5 virtual table. Graphiti uses the graph database's native fulltext implementation. Code-review-graph uses SQLite FTS5 with Porter stemming and Unicode tokenization. Memvid embeds Tantivy segments directly inside its `.mv2` file format.

For code specifically, standard tokenizers are counterproductive — they split `UserAuthService` into `user`, `auth`, `service`, losing the original identifier. Code-aware chunking preserves identifiers. The code-review-graph parser uses Tree-sitter ASTs to extract qualified names (`auth.py::UserService.login`) as discrete tokens, making BM25 precise on code entity lookup.

### Optional Reranking

After fusion, a cross-encoder reranker can reorder the top-$k$ candidates. Cross-encoders jointly encode query and document, producing a relevance score that is more accurate than independent embeddings but $O(k)$ in compute. In Graphiti's `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` config, RRF produces a candidate pool and the cross-encoder rescores the top results. The paper describes this as "the most sophisticated" reranking approach — it improves precision at the cost of latency.

## Who Implements It

**[Graphiti](../projects/graphiti.md)** (`search/search.py`) — three-way hybrid (cosine, BM25, BFS) with configurable reranking strategies. The BFS component is unique to graph-based memory: it surfaces contextually related facts that share no semantic or lexical similarity with the query but are graph-adjacent to known anchor entities.

**[LlamaIndex](../projects/llamaindex.md)** — ships a `QueryFusionRetriever` that accepts a list of base retrievers and a fusion algorithm. Supports RRF and simple score addition. Commonly used to combine a `VectorStoreIndex` with a `BM25Retriever` backed by the same document corpus.

**[LangChain](../projects/langchain.md)** — provides `EnsembleRetriever` for multi-retriever fusion and a BM25 retriever via `langchain_community`. The ensemble retriever applies RRF internally.

**Code-review-graph** (`search.py`) — FTS5 + optional sentence-transformer embeddings + RRF. Query-type heuristics boost results by code entity kind (class vs. function vs. file).

**[Supermemory](../projects/supermemory-project.md)** — combines RAG document retrieval with extracted fact retrieval in a single hybrid query. Their `searchMode: "hybrid"` returns deployment documentation alongside user preferences in the same result list.

**[HippoRAG](../projects/hipporag.md)** — uses a knowledge graph as the structural backbone, combining embedding-based retrieval with graph path traversal, analogous to Graphiti's BFS component.

**[AutoResearch](../projects/autoresearch.md)** — runs sequential hybrid search cycles, routing between sparse and dense methods based on query type.

## Strengths

**Robustness across query types.** A corpus containing both entity names and conceptual descriptions will be retrieved accurately without tuning the retrieval strategy per query. Hybrid handles both.

**No weight tuning required.** RRF sidesteps the need to calibrate score scales between BM25 (unbounded integer) and cosine similarity ([-1, 1]). The rank-based formula normalizes both into a common range.

**Graceful degradation.** When dense retrieval returns poor results for an out-of-vocabulary query, BM25 compensates. When BM25 fails for a synonym or paraphrase, dense retrieval compensates. Neither failure mode cascades.

**Additive to existing retrieval.** Hybrid search layers on top of existing vector indices and inverted indices. Most production RAG systems already have both; hybrid fusion is an orchestration change, not an infrastructure change.

## Limitations

### Concrete Failure Mode: Embedding Vocabulary Mismatch

Dense retrieval degrades silently when queries contain tokens outside the embedding model's training distribution. A biomedical corpus queried with clinical abbreviations, a codebase queried with internal library names, or a multilingual corpus queried in a low-resource language will all produce poor embedding matches. BM25 compensates partially, but if the BM25 component is also configured poorly (e.g., aggressive stemming that conflates distinct identifiers), the hybrid output degrades worse than pure keyword search would.

The failure is silent: retrieval returns results, just not the right ones. The LLM generates from whatever was retrieved.

### Infrastructure Assumption

Hybrid search assumes both indices exist, are synchronized, and cover the same document corpus. Maintaining dual indices — inverted and vector — doubles the ingestion pipeline complexity. New documents must be indexed in both; deletions must be propagated to both; schema changes must be applied to both. In practice, index drift causes recall degradation that is difficult to diagnose.

Most documentation treats index synchronization as trivial. It is not when documents are updated frequently or when the embedding model is upgraded.

## When NOT to Use It

**Very small corpora.** Below a few hundred documents, BM25 and dense retrieval both approach exhaustive search. The complexity of maintaining dual indices and running fusion logic outweighs any precision gain. A single BM25 pass is simpler and often sufficient.

**Strict latency requirements with no reranking budget.** Running two retrieval passes in parallel doubles retrieval latency compared to a single pass. Adding a cross-encoder reranker multiplies latency further. If P99 latency is a hard constraint, profiling the hybrid pipeline against the baseline before committing matters.

**Homogeneous query types.** A corpus queried exclusively with exact identifier lookups (log retrieval by request ID, documentation by function name) has no semantic ambiguity to resolve. Dense retrieval adds compute and complexity without improving recall. Pure BM25 is the right choice.

**Embedding model unavailability.** Some deployment environments cannot load embedding models (edge devices, air-gapped systems, constrained containers). Memvid disables vector features by default for this reason — the `vec` feature flag must be explicitly enabled, pulling in ONNX Runtime. In these environments, BM25-only retrieval is the practical choice.

## Unresolved Questions

**Optimal $K$ in RRF.** The constant $K=60$ is a convention from the original 2009 RRF paper. It was validated on web retrieval, not agent memory corpora with short dense documents. Whether $K=60$ is appropriate for 200-token memory fragments versus 2,000-token document chunks is not established by published benchmarks in this space.

**BFS weight in three-way hybrid.** Graphiti runs cosine, BM25, and BFS in parallel and fuses via RRF. The relative contribution of graph traversal versus the two standard methods is not characterized empirically in the Zep paper (arXiv:2501.13956). The paper reports aggregate improvements on LongMemEval but does not ablate the BFS component independently.

**Cross-encoder cost at scale.** Cross-encoder reranking scales linearly with the number of candidates being rescored. For high-throughput systems processing many queries per second against large candidate pools, the compute cost is substantial. None of the implementations examined provide cost characterization for the cross-encoder step at production query volumes.

**Benchmark representativeness.** Supermemory claims #1 on LongMemEval, LoCoMo, and ConvoMem. Graphiti (Zep) reports +18.5% on LongMemEval with gpt-4o. Both are self-reported. The benchmarks measure conversational memory retrieval — a specific task. Performance on heterogeneous agent memory (code context, structured data, tool outputs) is not independently characterized.

## Alternatives and Selection Guidance

**Use pure [BM25](../concepts/bm25.md)** when: queries are exact identifier lookups, the corpus is small (<500 documents), or vector infrastructure is unavailable.

**Use pure [semantic search](../concepts/semantic-search.md)** when: queries are conceptual, vocabulary mismatch between users and documents is high, and corpus identifiers are not diagnostic.

**Use hybrid search** when: the corpus is large and heterogeneous, query types vary (some exact, some conceptual), or retrieval precision is critical enough to justify dual infrastructure.

**Use graph-augmented hybrid (Graphiti-style)** when: documents have explicit relationships, queries benefit from multi-hop inference ("what companies does Alice's manager work with?"), or temporal validity of facts matters.

**[Agentic RAG](../concepts/agentic-rag.md)** — for cases where a single retrieval pass is insufficient and the agent must iteratively retrieve based on intermediate reasoning. Hybrid search improves the quality of each retrieval step but does not replace the multi-step structure.

## Related Concepts

- [BM25](../concepts/bm25.md) — the sparse retrieval algorithm underlying most hybrid implementations
- [Semantic Search](../concepts/semantic-search.md) — the dense retrieval component
- [Vector Database](../concepts/vector-database.md) — infrastructure for the dense pass
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the downstream consumer of hybrid search results
- [Context Engineering](../concepts/context-engineering.md) — the broader practice of assembling precise LLM context, of which retrieval is one component
- [Knowledge Graph](../concepts/knowledge-graph.md) — adds a third traversal-based retrieval dimension on top of sparse and dense
- [Episodic Memory](../concepts/episodic-memory.md) — agent memory pattern that benefits from hybrid search across raw conversational episodes
- [Continual RAG](../concepts/continual-rag.md) — extends retrieval to dynamically updating corpora where index freshness interacts with hybrid search design

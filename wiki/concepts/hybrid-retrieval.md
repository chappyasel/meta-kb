---
entity_id: hybrid-retrieval
type: approach
bucket: knowledge-bases
sources:
  - repos/getzep-graphiti.md
  - repos/supermemoryai-supermemory.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/repos/michaelliv-napkin.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:28:59.023Z'
---
# Hybrid Retrieval

Hybrid retrieval combines sparse and dense search methods to find relevant documents. BM25 handles exact keyword matching; vector search handles semantic similarity. Neither alone covers the full recall-precision space, so production Retrieval-Augmented Generation systems increasingly run both and merge their results.

## Why Neither Method Alone Suffices

BM25 scores documents by term frequency and inverse document frequency. Ask it for "cardiac arrest treatment" and it finds documents containing those exact tokens. Ask for "heart attack management" and it misses the relevant cardiology literature entirely. The algorithm has no concept of meaning.

Dense retrieval fixes that by embedding queries and documents into the same vector space, where "heart attack" and "cardiac arrest" land near each other. But vector search struggles with precise identifiers: product codes, proper nouns, rare technical terms. If a user queries "RFC 7231 status codes," the embedding model may drift toward broadly related HTTP content rather than surfacing the exact specification.

The failure modes are complementary, which is what makes combining them worthwhile.

## How It Works

### The Two Retrieval Legs

**Sparse retrieval (BM25)** represents documents as term-weighted vectors over a vocabulary. At query time, it computes a score based on how often query terms appear in each document, adjusted for document length and corpus-wide term rarity. Implementations like Elasticsearch and OpenSearch expose BM25 natively; Python libraries like `rank_bm25` run it locally. The index is an inverted index mapping terms to document lists with precomputed weights.

**Dense retrieval** encodes text with a transformer embedding model (common choices: `text-embedding-3-small`, `all-MiniLM-L6-v2`, `e5-large`) into fixed-dimension vectors, typically 384-1536 dimensions. A vector database (FAISS, Qdrant, Pinecone, Chroma) stores these and answers approximate nearest-neighbor queries using algorithms like HNSW or IVF. The index trades some recall for query speed, usually retrieving in under 10ms for collections up to tens of millions of documents.

### Score Fusion

Both legs return ranked lists with their own scoring scales. Merging them requires normalization. Two approaches dominate:

**Reciprocal Rank Fusion (RRF)** ignores raw scores entirely. Each document gets a score of `1 / (rank + k)` from each retriever (k=60 is the standard constant), and the scores sum. A document ranked 3rd by BM25 and 5th by vector search outranks one ranked 1st by only one retriever. RRF is robust, requires no tuning, and handles score scale mismatches automatically.

**Linear combination** normalizes scores (min-max or softmax) then computes `α * sparse_score + (1-α) * dense_score`. The weight α requires tuning per domain. It gives more control but more fragility.

Graphiti's hybrid retrieval explicitly combines semantic embeddings, BM25, and graph traversal, then reranks results by graph distance from relevant nodes. [Source](../../raw/repos/getzep-graphiti.md)

Supermemory describes its search mode as "RAG + Memory in a single query," merging knowledge base documents and personalized memory context. Their `searchMode: "hybrid"` parameter routes through both pipelines simultaneously. [Source](../../raw/repos/supermemoryai-supermemory.md)

### Reranking

After fusion produces a candidate list (typically top 20-50), a cross-encoder reranker scores each query-document pair jointly. Cross-encoders are slower (they process pairs, not individual embeddings) but more accurate because they see both query and document simultaneously rather than comparing independent embeddings. Common cross-encoders: `cross-encoder/ms-marco-MiniLM-L-6-v2`, `mixedbread-ai/mxbai-rerank-base-v1`. Graphiti uses a cross-encoder reranking step as the final stage.

The full pipeline: sparse retrieval → dense retrieval → RRF fusion → cross-encoder rerank → top-k to LLM context.

## Implementation Tradeoffs

**Index duplication.** You maintain two separate indexes over the same corpus: an inverted index for BM25 and a vector index. Storage costs roughly double. Updates must propagate to both.

**Query latency.** Running two retrieval legs increases latency, partially offset by parallelizing them. The cross-encoder reranker adds further latency, especially for large candidate sets. Production systems typically run BM25 and vector search in parallel, then rerank sequentially.

**Embedding model choice.** The dense leg is only as good as the embedding model. Domain mismatch (general model on specialized medical/legal text) degrades recall. Fine-tuning embeddings on domain data or using models with domain-specific pretraining (BioBERT, LegalBERT) closes this gap at the cost of hosting additional models.

**RRF constant k.** The k=60 default is widely used but not universally optimal. Lower k rewards top-ranked results more aggressively; higher k smooths rank differences. Most teams accept k=60 and tune α instead if using linear combination.

## Failure Mode

Hybrid retrieval fails when both legs agree on the wrong documents. If your corpus lacks coverage on a topic, BM25 and vector search both return low-relevance results and fusion amplifies their shared mistake. Hybrid retrieval improves recall across the corpus; it cannot compensate for missing content. Systems that report high retrieval precision on internal benchmarks sometimes discover this failure mode in production when users query edge cases not represented in the corpus.

## Infrastructure Assumption

Most hybrid retrieval setups assume a static or slowly-changing corpus. BM25 indexes tolerate incremental updates reasonably well. Dense indexes (especially HNSW graphs) require periodic rebuilding or incremental insertion depending on the vector database. Pinecone and Qdrant handle live upserts; FAISS IndexFlatL2 requires a full rebuild. Teams that don't account for index drift find retrieval quality degrading quietly as the corpus evolves without the vector index keeping pace.

## When Not to Use It

Skip hybrid retrieval when:

- Your queries are pure keyword lookups with no semantic variation (SQL query builders, exact product catalog search). BM25 alone suffices and is simpler.
- Your corpus is tiny (under ~1000 documents). Brute-force vector similarity with no index is fast enough, and BM25 over a small corpus adds noise rather than signal.
- Latency budget is under ~20ms end-to-end. Two retrieval legs plus reranking rarely fit, even with parallelism.
- Your embedding model is poorly matched to the domain and you can't fine-tune it. Dense retrieval may actively harm recall by surfacing semantically plausible but factually unrelated content.

## Unresolved Questions

**Optimal candidate set size.** How many candidates should each leg return before fusion? Common practice is top-100 from each, but this isn't well-studied across domains. Too few and fusion has insufficient material; too many and reranker latency climbs.

**Multilingual corpora.** Hybrid retrieval in multilingual settings compounds the alignment problem: BM25 is language-agnostic at the character level but misses cross-language synonyms; multilingual embedding models vary widely in quality across languages. No standard practice exists for non-English or code-switched corpora.

**Cost at scale.** Running two retrieval legs with a cross-encoder reranker across millions of documents on every query adds up. Teams running this at high query volume rarely publish cost breakdowns.

## Alternatives

- **BM25 alone**: Use when queries are exact-match or keyword-dominated. Elasticsearch default. Zero semantic understanding.
- **Dense retrieval alone**: Use when queries are semantically rich and vocabulary varies. Simpler to operate; weaker on rare terms.
- **ColBERT**: Late-interaction dense retrieval that keeps per-token embeddings rather than one pooled vector. Better recall than single-vector dense retrieval, cheaper than hybrid. Requires specialized infrastructure (PLAID engine). Use when you want semantic richness without maintaining two separate indexes.
- **[Graphiti](../projects/graphiti.md)**: Adds graph traversal as a third retrieval leg over a temporal knowledge graph. Use when facts change over time and you need provenance tracking, not just document retrieval.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — extends (0.7)

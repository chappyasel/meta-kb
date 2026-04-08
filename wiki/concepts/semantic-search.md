---
entity_id: semantic-search
type: concept
bucket: knowledge-substrate
abstract: >-
  Semantic search retrieves content by meaning rather than keywords, using dense
  vector embeddings to match queries with semantically similar documents
  regardless of exact wording — distinguished from keyword search by handling
  synonym matching, paraphrase recognition, and conceptual similarity.
sources:
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/topoteretes-cognee.md
  - repos/aiming-lab-simplemem.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/matrixorigin-memoria.md
  - repos/memvid-memvid.md
  - repos/natebjones-projects-ob1.md
  - repos/topoteretes-cognee.md
related:
  - retrieval-augmented-generation
  - claude-code
  - openclaw
  - model-context-protocol
  - knowledge-graph
  - vector-database
last_compiled: '2026-04-08T23:04:38.298Z'
---
# Semantic Search

## What It Is

Semantic search retrieves documents by meaning rather than by lexical match. Given a query like "how do I fix memory leaks in Node.js," a keyword system finds documents containing those words; a semantic system finds documents about heap profiling, garbage collection, or JavaScript memory management even if they share no terms with the query.

The mechanism rests on embedding models that map text to high-dimensional dense vectors (typically 768 to 3072 dimensions) such that semantically similar texts cluster in the same region of vector space. Retrieval becomes a nearest-neighbor search: embed the query, find vectors close to it, return the corresponding documents.

This matters for [Agent Memory](../concepts/agent-memory.md) systems because agents encounter the "unknown unknowns" problem — they cannot keyword-search for context they don't know exists. Semantic search partially addresses this, though as the hipocampus benchmark shows, even high-quality semantic retrieval scores only 17% on implicit context questions where the query contains no keywords related to the answer.

## How It Works

### Embedding Models

An embedding model encodes text into a fixed-length float vector. The training objective encourages semantically related sentences to have high cosine similarity. Common training approaches:

- **Contrastive learning (SimCSE, SBERT)**: Positive pairs (same sentence with dropout, paraphrase pairs, question-answer pairs) are pulled together; negative pairs are pushed apart.
- **Dense passage retrieval (DPR)**: Separate query and document encoders fine-tuned on retrieval tasks.
- **Instruction-tuned embeddings (E5, GTE, text-embedding-3)**: The model receives an instruction prefix (e.g., "Represent this query for searching documents:") allowing task-specific optimization.

Embedding dimensions reflect a tradeoff: OpenAI's `text-embedding-3-large` produces 3072-dimensional vectors by default but supports dimension reduction to 256 with modest quality loss. The cognee codebase configures `EMBEDDING_DIMENSIONS` at 3072 by default, compressible for constrained deployments.

The choice of embedding model substantially affects retrieval quality. A model trained on code-related text will outperform a general-purpose model on code retrieval. Domain mismatch is a common failure mode: general-purpose embeddings struggle with specialized terminology in fields like medicine, law, or mathematics.

### Vector Stores

After embedding, vectors are stored in structures that support efficient approximate nearest neighbor (ANN) search. Exact nearest neighbor search is O(n·d) per query; ANN trades small recall losses for sub-linear query time.

Common indexing algorithms:

- **HNSW (Hierarchical Navigable Small World)**: Layered proximity graph. Fast queries, high memory use, supports dynamic insertion without full rebuild. Used by [ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [Pinecone](../projects/pinatone.md).
- **IVF (Inverted File Index)**: Clusters vectors into Voronoi cells; queries probe nearby cells. Lower memory than HNSW, batch-friendly. Used by [FAISS](../projects/faiss.md).
- **PQ (Product Quantization)**: Compresses vectors by encoding subspaces separately, enabling in-memory indexes at fraction of full-precision cost. Used in combination with IVF.
- **Flat (brute force)**: Exact search, no approximation. Only viable for small corpora. GraphRAG's `brute_force_triplet_search` retrieves all triplets and filters in memory — explicitly named as such in the code.

[Vector Database](../concepts/vector-database.md) implementations expose these algorithms with tunable parameters: `ef_construction` and `m` for HNSW control index quality vs. build time; `nlist` and `nprobe` for IVF control recall vs. query speed.

### Chunking

Embedding models accept fixed-length inputs (typically 512-8192 tokens). Long documents must be split before embedding. Chunk boundaries create a fundamental tension: too-small chunks lose context needed for embedding meaning; too-large chunks dilute specific information.

The GraphRAG paper measured this directly: 600-token chunks extract approximately 2x more entity references per source token than 2400-token chunks. Smaller chunks allow the embedding model to attend to details without dilution, but they multiply LLM extraction costs by ~4x. The optimal chunk size depends on document type — dense technical text benefits from smaller chunks; narrative text tolerates larger ones.

Overlap between adjacent chunks (typically 10-20%) reduces the chance that a relevant passage falls at a boundary and gets split across two under-informative chunks.

Cognee uses a configurable chunker with auto-calculation: `min(embedding_max_completion_tokens, llm_max_completion_tokens // 2)`.

### Query-Time Retrieval

At query time, the user's query is embedded using the same model that created the corpus embeddings. The embedding is compared against stored vectors using a distance metric:

- **Cosine similarity**: Angle between vectors. Standard for text; length-invariant.
- **Dot product**: Cosine weighted by magnitude. Requires normalized vectors for cosine equivalence.
- **Euclidean distance**: L2 distance. Less common for text; sensitive to vector magnitude.

The top-k most similar documents are returned as candidates. What happens next distinguishes simple semantic search from more sophisticated retrieval:

**Pure semantic search**: Return the top-k documents directly.

**Semantic search + reranking**: Pass top-k to a cross-encoder reranker that scores query-document relevance more accurately. Rerankers are slower but more precise because they can attend to interactions between query and document tokens.

**[Hybrid Search](../concepts/hybrid-search.md)**: Combine semantic scores with [BM25](../concepts/bm25.md) keyword scores using reciprocal rank fusion or weighted interpolation. Critical for queries with rare technical terms or proper nouns that embeddings may not encode well.

## Composite Scoring

Pure cosine similarity is often insufficient for retrieval in agent memory systems. Production systems layer additional signals:

The hipocampus benchmark illustrates this: vector search alone scores 3.4% on implicit context questions. Adding the ROOT.md topic index raises that to 17-21%. The topic index provides a zero-search-cost overview that enables the agent to recognize relevant context before retrieving it.

OpenMemory's composite scoring formula in `src/memory/hsg.ts` uses five weighted factors:

```typescript
export const scoring_weights = {
    similarity: 0.35,   // cosine similarity
    overlap: 0.20,      // token overlap with query
    waypoint: 0.15,     // graph connectivity
    recency: 0.10,      // time decay
    tag_match: 0.20,    // explicit tag matching
};
```

This reflects a design choice: semantic similarity is the primary signal but not the only one. Recency matters for agent memory (yesterday's decisions outweigh last year's); tag matching provides a precision boost for structured metadata; graph connectivity captures relational context that embeddings don't encode.

## Semantic Search in Agent Infrastructure

### Retrieval-Augmented Generation

The primary deployment context for semantic search in LLM systems is [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md). The agent embeds a query, retrieves relevant documents, and injects them into the prompt. The LLM generates a response grounded in retrieved content rather than relying solely on parametric knowledge.

Quality depends heavily on retrieval precision: irrelevant retrieved chunks consume context window budget and can mislead generation. The "lost in the middle" phenomenon compounds this — LLMs attend less reliably to content placed in the middle of long contexts, making chunk ordering in the prompt a non-trivial engineering decision.

### Memory Systems

Projects like [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), [Letta](../projects/letta.md), and OpenMemory use semantic search as their primary retrieval mechanism for stored memories. When an agent needs past context, it embeds the current query and retrieves semantically similar past memories.

The hipocampus MemAware benchmark (900 questions across 3 months of conversation history) provides the most direct evidence of semantic search's limitations in memory retrieval:

| Method | Overall Accuracy |
|--------|-----------------|
| No memory | 0.8% |
| BM25 search | 2.8% |
| BM25 + Vector Search | 3.4% |
| Hipocampus + Vector | 17.3% |
| Hipocampus + Vector (10K ROOT) | 21.0% |

The key insight: search-based retrieval (whether BM25 or vector) scores poorly on "unknown unknowns" — context that's relevant but for which the agent has no reason to search. The 21x improvement from hipocampus comes primarily from the ROOT.md topic index providing a holistic view of available knowledge, not from better search algorithms.

### Knowledge Graph Integration

[GraphRAG](../projects/graphrag.md) combines semantic search with graph community summaries for corpus-wide sensemaking. The system does not rely on semantic search alone for retrieval; instead, LLM-extracted entities form a graph, Leiden community detection partitions it hierarchically, and community summaries enable map-reduce query answering.

The GraphRAG paper's key finding: semantic search (naive RAG) loses to GraphRAG by 72-83% comprehensiveness win rate on global sensemaking queries. But graph-free text summarization (map-reduce over chunks without any graph) performs nearly as well as GraphRAG at lower community levels. The graph's primary value is hierarchical exploration, not raw retrieval quality.

Cognee uses semantic search as one layer in a three-store architecture (relational + vector + graph), with LanceDB as the default vector store. Search types include `CHUNKS` (pure semantic retrieval) and `TRIPLET_COMPLETION` (semantic search over embedded subject-predicate-object triplets).

### Code Intelligence

[Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and [GitHub Copilot](../projects/github-copilot.md) use semantic search for codebase context retrieval. Code embeddings must handle the structural properties of code — variable names, function signatures, call graphs — that prose embeddings may not encode well. Purpose-built code embedding models (Voyage Code, CodeBERT) outperform general-purpose models on code retrieval tasks.

[Tree-sitter](../projects/tree-sitter.md) parses code into syntax trees that enable structure-aware chunking: functions, classes, and methods become natural chunk boundaries rather than arbitrary token windows.

### MCP Integration

The [Model Context Protocol](../concepts/model-context-protocol.md) enables semantic search as a tool available to agents. The claude-mem MCP server enforces a 3-layer progressive disclosure pattern specifically to manage token cost:

1. **search** — returns index with IDs (~50-100 tokens/result)
2. **timeline** — shows chronological context around specific results
3. **get_observations** — fetches full details for filtered IDs

The documentation claims "10x token savings" from this progressive approach versus returning full results immediately. This is an important design pattern: in token-constrained contexts, semantic search should return identifiers first, with content on demand.

## Failure Modes

### Unknown Unknowns

Search requires a query. A query requires the searcher to suspect that relevant context exists. When an agent has no reason to search — because it doesn't know that three weeks ago a critical architectural decision was made — semantic search provides no benefit. This is the structural limitation the hipocampus benchmark quantifies: even high-quality vector search scores 3.4% on implicit context questions because the question contains no keywords or concepts that would lead to a search query connecting them to the answer.

### Embedding Model Mismatch

Embeddings trained on general-purpose text encode semantic similarity for that distribution. Specialized domains (medical literature, legal contracts, financial reports, code in domain-specific frameworks) may not be encoded accurately. A query about "myocardial infarction" may not retrieve documents about "heart attack" if the embedding model wasn't trained on medical text.

Mitigation: Use domain-specific embedding models, or use instruction-tuned models with task-specific prefixes. Fine-tuning on in-domain contrastive pairs improves retrieval quality significantly for specialized corpora.

### Chunking Artifacts

Relevant information split across chunk boundaries becomes unfindable. A document explaining concept A on page 1 and concept B on page 2, with the crucial connection between them spanning both pages, may not surface for either query. Overlap mitigates this partially but doesn't eliminate it.

Sentence-window retrieval is one approach: embed at the sentence level but return surrounding sentences as context. This preserves fine-grained precision while providing adequate context to the LLM.

### Top-K Threshold Sensitivity

The choice of k (how many results to retrieve) affects both recall and precision. Too small: relevant documents not retrieved. Too large: irrelevant documents dilute the context window. The right k depends on corpus size, document length, and query specificity — and it varies per query. Threshold-based retrieval (return all documents above similarity score s) avoids the fixed-k problem but introduces a different tuning challenge.

### Approximate Search Precision

ANN algorithms return approximate results. For HNSW, the recall@k — the fraction of true top-k results returned — is typically 95-99% with standard parameters. The 1-5% miss rate is usually acceptable, but for high-stakes retrieval (medical, legal) exact search may be necessary, at the cost of O(n·d) query time.

### Vector Space Stability

Changing the embedding model invalidates all existing embeddings. Re-embedding a large corpus is expensive and requires downtime or a migration period where two embedding models run in parallel. OpenMemory notes this explicitly: "Switching providers mid-deployment changes the vector space. Existing embeddings generated by one provider are not compatible with embeddings from another."

### Staleness

Semantic similarity is computed at indexing time against a static corpus. As the corpus evolves, stale embeddings represent outdated content. Real-time corpora need incremental re-indexing infrastructure, which most vector databases support but requires operational management.

## When Not to Use Semantic Search

**Exact lookup**: If the query is for a specific identifier (UUID, file path, error code), BM25 or keyword search finds it more reliably. Embeddings may collapse distinct identifiers into similar representations.

**Boolean retrieval**: "Documents published in 2024 about neural networks in the US" requires structured filtering, not similarity scoring. Vector search alone cannot handle AND/OR/NOT logic; it needs metadata filtering at the vector database layer.

**Very small corpora**: If the corpus has fewer than ~100 documents, full-context injection (read everything) may outperform retrieval. The overhead of embedding, indexing, and ANN search is not justified, and full context avoids retrieval errors.

**Streaming/real-time data without re-indexing infrastructure**: Semantic search requires embeddings to be pre-computed. For rapidly changing data where latency from query to fresh index update must be sub-second, the embedding pipeline becomes a bottleneck.

**When precision matters more than recall**: Semantic search finds approximately relevant documents. For legal or medical applications where false positives carry serious consequences, exact keyword search with structured filters may be safer despite lower recall.

## Practical Parameters

**Embedding model selection**: OpenAI `text-embedding-3-large` (3072d, strong general-purpose), Voyage `voyage-3-large` (strong code and long-context), `BAAI/bge-m3` (multilingual, local). For local deployment without API costs, `nomic-embed-text` (768d) provides competitive quality.

**Chunk size**: 512-1024 tokens for precise technical content, 1024-2048 for narrative text. The GraphRAG paper finds 600 tokens extracts 2x more entity information than 2400 tokens. Always benchmark on your corpus.

**k for retrieval**: 5-20 for direct LLM injection, 50-100 for reranking pipelines. Cognee uses `top_k=10` default and `wide_search_top_k=100` for broad pre-filtering.

**Distance metric**: Cosine similarity for normalized embeddings (default in most frameworks). Dot product for unnormalized high-dimensional vectors.

**Context window budget**: Target <25% of the model's context window for retrieved content to leave room for reasoning. The 8K-token finding from the GraphRAG paper (larger context windows don't improve synthesis quality) is a useful heuristic.

## Alternatives and Complements

**[BM25](../concepts/bm25.md)**: Sparse retrieval based on term frequency and inverse document frequency. Faster, no embedding infrastructure, reliable for exact keyword matches and rare technical terms. Best combined with semantic search as [Hybrid Search](../concepts/hybrid-search.md).

**[Hybrid Search](../concepts/hybrid-search.md)**: Reciprocal rank fusion or weighted interpolation of BM25 and semantic scores. Standard practice in production retrieval systems. Handles both "meaning" queries and "find this exact term" queries.

**[Knowledge Graph](../concepts/knowledge-graph.md)**: Encodes explicit relationships between entities. Outperforms semantic search for multi-hop reasoning ("Who co-authored with Alice and also worked at Berkeley?") but requires more expensive construction. GraphRAG, Cognee, and [HippoRAG](../projects/hipporag.md) combine both.

**Full-context injection**: For small corpora or high-value documents, inject everything into context rather than retrieving. Eliminates retrieval errors at the cost of token budget. Hipocampus's ROOT.md (3K tokens) demonstrates that a carefully curated overview can substitute for retrieval in many cases.

**[RAPTOR](../projects/raptor.md)**: Recursive abstractive summarization for tree-organized retrieval. Builds a summary hierarchy similar to GraphRAG's community summaries, enabling both local (leaf-level) and global (root-level) queries.

**Selection guidance**: Use semantic search when queries are conceptual and the corpus is too large for full injection. Add BM25 via hybrid search for any corpus with proper nouns, technical identifiers, or rare terms. Add a knowledge graph layer when multi-hop relational reasoning is needed. Use the ROOT.md pattern (or similar topic index) when implicit context discovery matters more than precision retrieval.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — primary deployment pattern for semantic search in LLM systems
- [Hybrid Search](../concepts/hybrid-search.md) — combines semantic and keyword retrieval
- [BM25](../concepts/bm25.md) — sparse retrieval complement
- [Vector Database](../concepts/vector-database.md) — storage infrastructure for dense embeddings
- [Knowledge Graph](../concepts/knowledge-graph.md) — relational complement to semantic search
- [Context Engineering](../concepts/context-engineering.md) — broader discipline of which retrieval is one component
- [Agent Memory](../concepts/agent-memory.md) — deployment context where semantic search limitations are most visible
- [Context Compression](../concepts/context-compression.md) — reduces token cost of retrieved content
- [Agentic RAG](../concepts/agentic-rag.md) — agents that iterate retrieval rather than single-shot retrieve

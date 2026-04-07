---
entity_id: embedding-model
type: concept
bucket: knowledge-bases
abstract: >-
  A neural network that converts text into dense numeric vectors for semantic
  similarity search; the primary mechanism enabling meaning-based retrieval in
  RAG systems, distinct from keyword matching.
sources:
  - repos/aiming-lab-simplemem.md
  - repos/thedotmack-claude-mem.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/michaelliv-napkin.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
related:
  - rag
  - semantic-memory
  - claude
  - episodic-memory
  - bm25
  - knowledge-graph
  - progressive-disclosure
  - mem0
  - vector-database
last_compiled: '2026-04-07T11:53:41.501Z'
---
# Embedding Model

## What It Is

An embedding model maps discrete text (or other data) into continuous vector space, where geometric proximity encodes semantic similarity. Feed it "automobile" and "car" and you get vectors close together. Feed it "automobile" and "democracy" and you get vectors far apart. The model compresses meaning into a fixed-length numeric array, typically 384 to 4096 dimensions depending on the model family.

This transformation is what makes semantic search possible. Without it, retrieval falls back to lexical matching: BM25, keyword overlap, regex. Embedding models let a query like "how do I fix login failures?" match documents that say "authentication error troubleshooting" even though no words overlap.

## Why It Matters for Agent Memory Systems

Agent memory systems face a core tension: agents accumulate far more information than fits in a context window, so retrieval must select the relevant subset. Three main strategies exist: keyword search ([BM25](../concepts/bm25.md)), embedding-based semantic search, and graph traversal. Embedding models power the semantic search path.

In [Retrieval-Augmented Generation](../concepts/rag.md), the typical pipeline encodes a corpus of documents at index time, stores the vectors in a [Vector Database](../concepts/vector-database.md), then at query time encodes the user query and retrieves documents by cosine similarity or approximate nearest neighbor search. The embedding model runs twice: once per document during indexing, once per query during retrieval.

In agent [Semantic Memory](../concepts/semantic-memory.md) systems like [Mem0](../projects/mem0.md) and [Zep/Graphiti](../projects/graphiti.md), embeddings serve a different role: they encode extracted facts, entity summaries, or memory notes so the agent can retrieve relevant memories given a new query. Graphiti generates 1024-dimensional embeddings for each `EntityEdge` fact, then searches them via cosine similarity as one component of its hybrid search pipeline alongside BM25 and graph traversal.

## How It Works

### Architecture

Most production embedding models derive from the transformer architecture (BERT, RoBERTa, or decoder-only variants). The key modification for embedding is pooling: rather than predicting the next token, the model pools the final layer's hidden states into a single vector. Common pooling strategies include mean pooling (average all token vectors), CLS token pooling (use the first token's representation), and max pooling.

Training embeds pairs of texts with contrastive objectives. Positive pairs (semantically similar texts) should produce close vectors; negative pairs (semantically dissimilar) should produce distant vectors. Techniques include:

- **Contrastive learning** (SimCSE): uses dropout to create augmented positives from the same sentence
- **Bi-encoder training**: encodes query and document separately, optimizes dot product similarity
- **Hard negative mining**: deliberately constructs challenging negatives (near-misses) to sharpen the representation

The result is a model that, when applied to text, produces vectors where cosine similarity or dot product approximates semantic relatedness.

### Dimensionality and Tradeoffs

Higher dimensions capture more nuance but cost more to store and search. A 768-dimensional vector needs 3KB at float32 precision. At 10 million documents, that's 30GB just for the vectors. Quantization (int8, binary) reduces storage 4-8x at modest quality cost. Models like Matryoshka Representation Learning (used in OpenAI's `text-embedding-3-*` series) allow truncating to shorter vectors with graceful quality degradation, letting operators trade off quality against storage.

### Asymmetric vs. Symmetric Encoding

Many retrieval scenarios benefit from asymmetric encoding: queries and documents use different encoding strategies because they have different linguistic properties. A query might be "who founded this company?" while the relevant document passage says "John Smith established the firm in 1987." Bi-encoder models trained with asymmetric objectives handle this better than symmetric models that assume query and document come from the same distribution.

### Chunking Dependency

Embedding models have a fixed token limit, typically 512 tokens for BERT-based models, up to 8192 for newer models like E5-large. Documents exceeding this limit must be chunked before encoding. Chunking strategy substantially affects retrieval quality:

- Fixed-size chunks (e.g., 512 tokens with 50-token overlap) are simple but can split coherent passages
- Semantic chunking (split at paragraph or sentence boundaries) preserves coherence
- Hierarchical chunking encodes both small chunks (for precision) and larger parent contexts (for completeness), used by systems like [RAPTOR](../projects/raptor.md)

The embedding model never sees beyond its context window, so a 5000-token document gets encoded as multiple separate vectors, each representing a fragment rather than the whole.

## Who Uses What

Different systems make different embedding choices reflecting their architectural priorities:

**Graphiti** ([Zep](../projects/zep.md)) uses 1024-dimensional embeddings on extracted entity summaries and fact triples. The embedding covers the full textual content of the fact, not just entity names. It runs as one of three parallel search signals alongside BM25 fulltext and BFS graph traversal, with results merged via [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md) or cross-encoder reranking. The Zep paper uses BGE-m3 (BAAI/BGE-m3) for benchmarks.

**[Mem0](../projects/mem0.md)** uses embedding similarity as its primary deduplication and retrieval mechanism, comparing new extracted facts against stored memories to detect near-duplicates before storage.

**A-MEM** (Zettelkasten-inspired memory, from the source material) embeds each memory note over the concatenation of content + keywords + tags + contextual description, creating richer representations than content-only embeddings. When memory evolution updates a note's contextual description, the embedding should be recomputed to stay fresh.

**[SimpleMem](../projects/supermemory.md)** takes a multimodal extension, applying embedding-like representations across text, images, audio, and video for cross-modal similarity search.

**claude-mem** (the Claude Code plugin) uses [ChromaDB](../projects/chromadb.md) for hybrid semantic + keyword search over captured session observations.

**[Napkin](../concepts/progressive-disclosure.md)** deliberately excludes embedding models. It uses BM25 + backlink counts + recency signals, arguing that giving the retrieval decision to a smaller embedding model is architecturally backwards. On LongMemEval-S, napkin's BM25-only approach achieves 91% accuracy versus 86% for the best embedding-based prior system. This is the strongest empirical case in this corpus that embeddings are not always the right choice for structured knowledge retrieval.

## Strengths

**Vocabulary-independent matching.** Embedding similarity captures synonyms, paraphrases, and cross-lingual equivalents that keyword search misses. "Fix authentication errors" matches "resolve login failures" without shared terms.

**Single-model generalization.** A general-purpose embedding model (e.g., `text-embedding-3-large`) works reasonably well across domains without domain-specific tuning. This reduces deployment complexity compared to building domain-specific retrievers.

**Composability.** Embedding similarity can combine with other signals via [Hybrid Search](../concepts/hybrid-search.md). [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md) merges BM25 and embedding rankings without requiring the signals to share a scale.

**Scalability.** Approximate nearest neighbor indexes ([FAISS](../projects/faiss.md), [Qdrant](../projects/qdrant.md), [Pinecone](../projects/pinecone.md)) make billion-scale embedding search practical. At smaller scales, exact cosine similarity with in-memory vectors is millisecond-fast.

## Critical Limitations

**Vocabulary gap works both ways.** Exact technical terms, IDs, product names, and code symbols are poorly represented in embedding space. "Fix bug in PR #4821" should retrieve the exact PR, but embedding similarity on "4821" is meaningless. BM25 handles this correctly; embedding search does not. Systems that use embeddings alone fail predictably on queries requiring exact term matching.

**Staleness on mutable content.** Embedding vectors are computed at index time. When the underlying document changes, the stored vector becomes stale. Systems with frequently mutating content (like A-MEM's memory evolution, where notes are updated when new information arrives) must recompute embeddings after each update or accept increasingly inaccurate retrieval. This is non-trivial at scale.

**Infrastructure assumption: you need a vector store.** Embedding-based retrieval requires persistent storage for vectors and a way to query them by similarity. At small scale (thousands of documents) this can be in-memory numpy operations. At production scale it requires a dedicated vector database. This is a real operational cost: ChromaDB or Qdrant need to be deployed, backed up, and kept synchronized with the source documents. Napkin's 91% LongMemEval result without any of this infrastructure is a useful calibration point.

## When NOT to Use It

**Exact match queries dominate.** If users primarily search by product code, document ID, username, or other discrete identifiers, BM25 outperforms embedding search. Hybrid search mitigates this, but adding embeddings to a BM25 pipeline that already handles the query distribution adds complexity without benefit.

**Very small corpora with low latency requirements.** For corpora under a few thousand documents, full-text search with BM25 runs in milliseconds and needs no GPU, no vector store, and no embedding computation pipeline. The engineering overhead of embeddings is not worth it.

**High-churn content.** If documents update frequently (e.g., live session notes, evolving agent memory), the cost of recomputing embeddings on every change may exceed the retrieval quality benefit. Napkin's fingerprint-based BM25 cache invalidates and rebuilds instantly when any file changes.

**Adversarial inputs.** A-MEM's experiments show a 28% regression on adversarial questions when using enriched embeddings versus baseline retrieval. The semantic generalization that makes embeddings powerful also makes them susceptible to leading questions that are semantically adjacent to false answers.

## Implementation: Core Decisions

### Bi-encoder vs. Cross-encoder

Bi-encoders (embedding models proper) encode query and document independently, enabling precomputed document representations and fast approximate search. Cross-encoders encode the query-document pair jointly, capturing interaction effects, but cannot precompute representations and require running the model on every candidate pair at query time.

Production systems typically use bi-encoders for first-stage recall (retrieve 100 candidates from millions) and cross-encoders for second-stage reranking (rerank the 100 candidates). Graphiti implements this pattern with `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` as a pre-built config, supporting OpenAI Reranker, BGE Reranker, and Gemini Reranker as cross-encoder options.

### Embedding What Gets Stored

The choice of what text to embed matters as much as which model to use. Options:

- Raw document chunks (most common, easiest)
- Generated hypothetical answers (HyDE: generate an answer to the expected query, embed that)
- Extracted facts or triples (Graphiti's approach: embed the fact description, not the raw episode)
- Enriched notes with LLM-generated metadata (A-MEM: embed content + keywords + tags + description)

Embedding enriched content consistently outperforms embedding raw text when the enrichment is accurate, because it aligns the stored representation with the expected query distribution.

### Provider Landscape

Major providers with production usage in agent memory systems:

| Provider | Models | Dimensions | Context |
|----------|--------|-----------|---------|
| OpenAI | text-embedding-3-small/large | 1536/3072 (truncatable) | 8191 tokens |
| Anthropic | via Voyage AI partnership | varies | varies |
| Voyage AI | voyage-3, voyage-code-3 | 1024 | 32000 tokens |
| Cohere | embed-v3 | 1024 | 512 tokens |
| BAAI | BGE-m3 (open source) | 1024 | 8192 tokens |
| Google | text-embedding-005 | 768 | 2048 tokens |

Graphiti supports OpenAI, Azure OpenAI, Gemini, and Voyage as embedding providers, with OpenAI as default and BGE-m3 used in its research paper benchmarks.

## Benchmarks

Embedding model quality is measured on MTEB (Massive Text Embedding Benchmark), a suite covering retrieval, clustering, classification, and semantic similarity across 56+ datasets. MTEB scores are independently verified by the benchmark maintainers. Top performers as of mid-2025 are typically 70-72% average MTEB score for leading general-purpose models.

The more relevant benchmark for agent systems is downstream retrieval quality on task-specific datasets. Graphiti's LongMemEval results (+18.5% over full-context GPT-4o) include embeddings as one component of a hybrid pipeline, so the isolated contribution of the embedding model is not separable from BM25 and graph search contributions.

Napkin's result (91% LongMemEval-S without embeddings, beating 86% best embedding-based prior) is the clearest comparison in this corpus. It is self-reported by the napkin project but measured on a published external benchmark (LongMemEval, ICLR 2025), which provides reasonable credibility.

## Unresolved Questions

**Optimal enrichment strategy.** A-MEM enriches embeddings with LLM-generated keywords and contextual descriptions and reports multi-hop reasoning improvements of 149-440%. How much of this comes from the richer embedding versus the link generation mechanism is not isolated in the ablation. The embedding staleness problem after memory evolution is not addressed.

**Cross-encoder cost at scale.** Graphiti's cross-encoder reranking adds latency and per-token cost. The paper does not report retrieval latency for the cross-encoder configuration specifically, and the tradeoff between accuracy gain and cost is not quantified.

**When hybrid beats either alone.** The theoretical case for hybrid search is clear, but the empirical magnitude of improvement over the better single-signal retriever varies substantially by dataset. The practical decision of whether to add embeddings to a working BM25 system requires dataset-specific evaluation that most teams do not run.

## Related Concepts

- [Vector Database](../concepts/vector-database.md): where embedding vectors are stored and queried
- [Hybrid Search](../concepts/hybrid-search.md): combining embedding similarity with BM25
- [Retrieval-Augmented Generation](../concepts/rag.md): the primary application context
- [Semantic Memory](../concepts/semantic-memory.md): agent memory systems that use embeddings for retrieval
- [BM25](../concepts/bm25.md): the primary alternative for lexical retrieval
- [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md): standard method for merging embedding and BM25 rankings
- [Progressive Disclosure](../concepts/progressive-disclosure.md): retrieval architecture that reduces dependency on embedding quality by giving agents navigational agency
- [Knowledge Graph](../concepts/knowledge-graph.md): alternative/complementary structure for semantic retrieval

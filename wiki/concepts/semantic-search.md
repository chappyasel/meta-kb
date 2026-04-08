---
entity_id: semantic-search
type: concept
bucket: knowledge-substrate
abstract: >-
  Semantic search finds documents by meaning via vector embeddings, not keyword
  overlap — enabling "show me authentication errors" to match "login failures"
  without shared terms.
sources:
  - repos/aiming-lab-simplemem.md
  - repos/natebjones-projects-ob1.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/topoteretes-cognee.md
  - repos/memvid-memvid.md
  - repos/matrixorigin-memoria.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/topoteretes-cognee.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
related:
  - retrieval-augmented-generation
  - claude-code
  - openclaw
  - model-context-protocol
  - knowledge-graph
  - vector-database
last_compiled: '2026-04-08T02:47:24.732Z'
---
# Semantic Search

## What It Is

Semantic search retrieves documents by meaning rather than lexical overlap. A keyword search for "heart attack" returns documents containing those exact words. A semantic search for the same query also returns documents about "myocardial infarction," "cardiac arrest," and "coronary events" — because these map to nearby positions in a shared vector space.

The mechanism: a trained model encodes both query and candidate documents into fixed-dimensional numeric vectors. Retrieval finds the candidates closest to the query vector by some distance metric, typically cosine similarity. Documents that appear near each other in this space share semantic content, regardless of surface form.

This is the substrate beneath [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md), most agent long-term memory systems, and code search in tools like [Claude Code](../projects/claude-code.md). It's also one of the most commonly misapplied tools in the agent infrastructure stack — deployed where [BM25](../concepts/bm25.md) or [Hybrid Search](../concepts/hybrid-search.md) would serve better.

## Why It Exists

Natural language is compositional and paraphrastic. The same concept surfaces as dozens of different word choices depending on author, domain, and register. Any retrieval system that requires exact term matches fails proportionally to how much paraphrase exists in the corpus.

Traditional information retrieval (TF-IDF, BM25) works by counting term occurrences and inverse document frequencies. It handles synonyms only if you explicitly provide them, and it has no mechanism for analogical reasoning. Asking for "code that handles edge cases" against a codebase that uses "boundary conditions" throughout returns nothing.

The distributional hypothesis provides the theoretical foundation: words appearing in similar contexts have similar meanings. Neural language models trained on large corpora internalize this at scale, producing vector representations where geometric distance approximates semantic distance.

## How It Works

### Embedding Models

An embedding model takes text and produces a vector. The most common architectures are:

**Bi-encoders** encode query and document independently, then compare vectors. Fast at retrieval time because document vectors can be precomputed and stored. The query vector is compared against all stored document vectors using approximate nearest-neighbor (ANN) search. Models like OpenAI's `text-embedding-3-large` (3072 dimensions), Google's Gecko, and Cohere's `embed-v3` follow this pattern.

**Cross-encoders** process query and document together as a pair, producing a relevance score. Much higher quality but cannot be cached — every query-document pair requires a forward pass. Used for re-ranking a candidate set retrieved by a bi-encoder, not for initial retrieval.

Embedding dimension matters for both quality and cost. OpenAI offers 256, 1024, and 3072 dimension variants of `text-embedding-3-large`. Higher dimensions preserve more information but increase storage and computation. [OpenMemory](../projects/openmemory.md) compresses cold memories from 1536 down to 64 dimensions using mean pooling — a deliberate lossy trade of retrieval precision for storage efficiency.

### Similarity Metrics

**Cosine similarity** measures the angle between vectors, ignoring magnitude. Standard for most text embeddings because document length shouldn't dominate relevance. Cosine similarity of 1.0 means identical direction; 0.0 means orthogonal (no relationship); -1.0 means opposite (rare in practice for text).

**Dot product** is equivalent to cosine similarity when vectors are unit-normalized. Faster to compute. Many embedding models produce normalized vectors to make dot product and cosine interchangeable.

**L2 (Euclidean) distance** measures absolute geometric distance. Less common for text but used in some specialized domains. More sensitive to vector magnitude than cosine.

### Approximate Nearest Neighbor Search

Comparing a query vector to millions of stored vectors exactly is O(n × d) where d is dimension. At production scale this is too slow. Approximate nearest neighbor (ANN) algorithms trade a small accuracy loss for orders-of-magnitude speedups.

**HNSW (Hierarchical Navigable Small World)** builds a layered graph where each node connects to neighbors at multiple granularity levels. Search starts at the coarsest layer, finds the local neighborhood, then descends to finer layers. Achieves sub-millisecond retrieval at 99%+ recall against brute-force. Used by [Pinecone](../projects/pinatone.md), [ChromaDB](../projects/chromadb.md), and most production vector stores.

**IVF (Inverted File Index)** partitions vectors into clusters (Voronoi cells) using k-means. At query time, searches only the nearest clusters rather than the full dataset. More memory-efficient than HNSW but requires choosing the number of clusters correctly.

**Product Quantization (PQ)** compresses vectors by encoding sub-vectors with codebooks. Reduces storage by 4-16x at the cost of some accuracy. Often combined with IVF (IVF-PQ) for large-scale deployments.

### Chunking

A document must be split into chunks before embedding because embedding models have context length limits (typically 512-8192 tokens). The chunking strategy substantially affects retrieval quality.

Chunk size trades recall against precision. Larger chunks (1024+ tokens) capture more context but may embed multiple distinct topics, diluting the signal for any one query. Smaller chunks (128-256 tokens) are more focused but lose surrounding context. [GraphRAG](../projects/graphrag.md)'s paper found 600-token chunks extract approximately 2x more entity references than 2400-token chunks — the LLM attends to more detail in shorter passages, though at higher processing cost.

Overlap between adjacent chunks prevents information loss at chunk boundaries. A 20% overlap on a 512-token chunk means 100 tokens repeat in adjacent chunks. This helps queries that land on a semantic boundary retrieve coherent passages.

Semantic chunking uses a model to find natural topic boundaries rather than splitting at fixed token counts. Splits occur where the embedding similarity between adjacent sentences drops below a threshold. Produces more coherent chunks but requires an additional model pass over the document.

### Vector Databases

[Vector databases](../concepts/vector-database.md) persist embeddings and expose ANN search as a primary operation. They handle indexing (building the HNSW or IVF structure), metadata filtering (e.g., "find the nearest vectors where `author == 'alice'`"), and scaling (sharding and replication). [ChromaDB](../projects/chromadb.md) is common for local development. [Pinecone](../projects/pinatone.md) for managed cloud. pgvector for teams already on PostgreSQL who want to avoid a separate vector service.

The distinction between embedded vector stores (LanceDB, ChromaDB in-process) and server-based vector stores (Qdrant, Pinecone, Weaviate) matters for agent infrastructure. Embedded stores work with no network overhead but don't support concurrent writers. Server-based stores support multi-agent and multi-user scenarios at the cost of network latency.

## Who Implements It

Every major agent memory system uses semantic search as a retrieval layer:

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is built entirely on semantic search: embed documents offline, embed queries at runtime, retrieve top-k by cosine similarity, inject into context.

Cognee uses vector stores (LanceDB by default) for semantic retrieval alongside a knowledge graph for structural queries. The `GRAPH_COMPLETION` search type uses triplet embeddings — vectors over subject-predicate-object triples rather than raw text chunks — to enable relational queries that pure chunk-level semantics would miss.

[OpenMemory](../projects/openmemory.md) embeds memories and retrieves by composite score: 35% vector cosine similarity, 20% token overlap, 15% graph connectivity (waypoint score), 10% recency, 20% tag match. The explicit weighting acknowledges that cosine similarity alone is insufficient — recency and structural connectivity matter for memory retrieval in ways that pure semantics doesn't capture.

[GraphRAG](../projects/graphrag.md) builds community summaries of an entity graph and uses semantic search to retrieve relevant community contexts for global sensemaking queries. The semantic search here operates over LLM-generated summaries rather than raw document chunks, reducing noise.

[Claude Code](../projects/claude-code.md) uses semantic search for codebase navigation and file retrieval. [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), and [GitHub Copilot](../projects/github-copilot.md) all embed codebases for semantic code search.

[LlamaIndex](../projects/llamaindex.md) and [LangChain](../projects/langchain.md) provide semantic search as a first-class retrieval primitive with adapters to dozens of vector backends.

Hipocampus shows semantic search's limits: its MemAware benchmark found BM25 + vector search scores 3.4% on implicit context recall (questions about knowledge the agent has but wasn't asked to retrieve), while Hipocampus's topic-index approach scores 17.3-21.0%. Search requires knowing what to search for; semantic search doesn't solve "unknown unknowns."

## Practical Strengths

**Paraphrase tolerance**: Finds documents with different vocabulary expressing the same concept. Critical for agent memory where the same event may be recorded with varying terminology.

**Multilingual retrieval**: Cross-lingual embedding models (e.g., multilingual-e5-large, LaBSE) map semantically equivalent text in different languages to nearby vectors. A query in English retrieves relevant documents in French without translation.

**Generalization beyond training vocabulary**: Unlike keyword search, semantic search handles novel terminology and domain jargon that appears infrequently in the index, as long as the embedding model has seen related concepts during training.

**Zero-configuration query expansion**: Users don't need to know the exact terminology used in the knowledge base. "Show me authentication bugs" finds "login failures," "credential errors," and "OAuth token issues" without manual synonym lists.

## Failure Modes

### Exact Match Retrieval

Semantic search underperforms keyword search for queries requiring exact matches: IDs, error codes, version numbers, function names. Searching for `ERR_CONNECTION_REFUSED` or `getUserById` in a codebase retrieves semantically similar text rather than the exact occurrence. [Hybrid Search](../concepts/hybrid-search.md) — combining BM25 and vector retrieval — handles this correctly; pure semantic search does not.

### Corpus Specificity

Embedding models are trained on general corpora. Highly specialized domains — medical imaging, semiconductor design, proprietary code conventions — may produce poor embeddings for domain-specific terminology. Fine-tuned domain-specific models or keyword augmentation are required. Using a general-purpose model on specialized text produces vectors where semantically distinct concepts cluster near each other because the model lacks the domain knowledge to separate them.

### Long-Document Retrieval

Semantic search operates on chunks, not documents. A query about a specific technical detail in a 50-page specification retrieves the chunk containing that detail — but only if the chunk boundaries align with the query's semantic scope. Long-range dependencies across chunks (e.g., "what is the exception to the rule defined in section 2 that applies to the case described in section 8?") require multi-hop retrieval or knowledge graph structures.

### Semantic Similarity ≠ Relevance

Cosine similarity measures embedding proximity, not answer quality. Two documents can be semantically similar without either being a useful answer. A query about "database transaction failures" returns documents about database transactions broadly — not necessarily the document explaining the specific failure pattern the user encountered. Relevance feedback, re-ranking, or query-specific metadata filtering often needs to be layered on top.

### Global Queries

Hipocampus's benchmark and GraphRAG's paper make the same point from different angles: semantic search requires a query to specify what's being sought. Questions that require synthesizing patterns across an entire corpus ("what architectural decisions did we make this month?") or surfacing relevant context the user didn't know to ask about ("this task relates to a rate-limiting decision from three weeks ago") cannot be answered by similarity search alone. Hierarchical indices (GraphRAG's community structure, Hipocampus's ROOT.md topic index) address this where pure semantic retrieval cannot.

### Stale Embeddings

Embeddings computed from documents reflect those documents at index time. If documents change, embeddings become stale. Incremental updates are possible but require identifying changed documents and re-indexing them — a non-trivial operational concern for large, frequently updated corpora. Systems like [Continual RAG](../concepts/continual-rag.md) address this explicitly.

### Infrastructure Assumption

Semantic search assumes consistent embedding model availability throughout a system's lifecycle. If the embedding model changes (version upgrade, provider switch, fine-tuning), existing embeddings become incompatible with newly embedded queries and documents. A complete re-index is required. This is an unspoken operational dependency that most semantic search documentation glosses over — OpenMemory's documentation acknowledges this as a concrete limitation.

## When NOT to Use It

**Exact-match queries dominate**: If users primarily search for specific identifiers, function names, version numbers, or error codes, BM25 or a full-text index will outperform semantic search with lower latency and cost.

**The corpus is small**: For fewer than ~1,000 documents, brute-force full-text search is fast enough and avoids embedding infrastructure entirely. The operational overhead of a vector database isn't justified.

**Corpus changes frequently**: Re-indexing on every document change is expensive. For high-velocity knowledge bases (log stores, streaming data), semantic search needs an incremental update strategy or a hybrid approach that limits which documents need re-embedding.

**Budget is constrained at query time**: Embedding a query on every user request adds latency and cost. At very high query volumes, cached BM25 indices have near-zero marginal cost per query; semantic search requires an embedding model call each time unless queries can be cached.

**The retrieval need is structural**: Questions like "what documents did Alice modify last week?" or "find all items tagged 'security' that are linked to 'authentication'" are answered more reliably by metadata filters and [Knowledge Graph](../concepts/knowledge-graph.md) traversal than by semantic similarity.

## Unresolved Questions

**Optimal chunk granularity for agent memory**: The right chunk size is domain-dependent, but there's no principled method to determine it without empirical testing. GraphRAG's 600 vs. 2400 token finding applies to entity extraction, not necessarily to retrieval quality. Most systems pick a default (512 or 1024 tokens) and move on.

**Embedding model selection for specialized domains**: No standardized benchmark exists for comparing embedding models on agent-specific retrieval tasks (cross-session memory, code navigation, multi-hop reasoning). Published benchmarks like MTEB measure general retrieval quality; performance on production agent workloads is largely self-reported.

**Composite scoring weights**: OpenMemory uses explicitly weighted combination of semantic similarity (35%), token overlap (20%), graph connectivity (15%), recency (10%), and tags (20%). Cognee uses `triplet_distance_penalty` of 3.5 as a default. These parameters are hand-tuned rather than empirically optimized. How sensitive retrieval quality is to these weights, and how to tune them for a specific corpus, is undocumented.

**Semantic drift over time**: As agents accumulate memories and corpora evolve, the semantic distribution of the index shifts. Whether and how embedding-based retrieval degrades over months of agent operation is not well-studied.

## Alternatives

**[BM25](../concepts/bm25.md)**: Use when exact term matching matters (code identifiers, error codes, named entities), when the corpus is small, or when embedding infrastructure is impractical. Faster and cheaper per query, no embedding model dependency.

**[Hybrid Search](../concepts/hybrid-search.md)**: Use when you need both semantic recall and exact-match precision. Combines BM25 and vector scores via reciprocal rank fusion or learned linear combination. The standard production choice for most RAG systems; pure semantic search is usually a stepping stone to hybrid.

**[Knowledge Graph](../concepts/knowledge-graph.md)**: Use when retrieval requires multi-hop reasoning across explicit relationships — "find the entities connected to X through Y" — or when structural queries dominate over semantic similarity. GraphRAG and Cognee layer knowledge graphs on top of semantic search rather than replacing it.

**Full corpus summarization**: For global sensemaking queries, GraphRAG shows that map-reduce over source text chunks (without a vector index) performs nearly as well as hierarchical community summaries at lower community levels. If the corpus rarely changes and global queries dominate, text summarization pipelines may be simpler than maintaining a vector index.

**Hierarchical topic indices**: For agent memory where unknown unknowns matter, Hipocampus's ROOT.md approach achieves 21x better implicit recall than no memory and 5x better than hybrid search. Topic indices and semantic search are complementary: the topic index handles discovery, semantic search handles retrieval once the relevant domain is identified.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — primary consumer of semantic search in LLM systems
- [Vector Database](../concepts/vector-database.md) — infrastructure layer for storing and querying embeddings
- [Hybrid Search](../concepts/hybrid-search.md) — production combination of semantic and keyword retrieval
- [BM25](../concepts/bm25.md) — keyword retrieval alternative and hybrid component
- [Knowledge Graph](../concepts/knowledge-graph.md) — structural retrieval complement to semantic similarity
- [Context Engineering](../concepts/context-engineering.md) — broader discipline of which retrieval is one component
- [Agent Memory](../concepts/agent-memory.md) — semantic search is the retrieval mechanism for most memory systems
- [Long-Term Memory](../concepts/long-term-memory.md) — semantic search enables retrieval from large accumulated memory stores

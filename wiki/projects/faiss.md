---
entity_id: faiss
type: project
bucket: knowledge-substrate
abstract: >-
  FAISS (Facebook AI Similarity Search) is a C++ library with Python bindings
  for fast approximate nearest-neighbor search over dense vectors; its
  differentiator is production-grade GPU acceleration and a comprehensive index
  hierarchy that lets you trade recall for speed at scale.
sources:
  - deep/repos/mem0ai-mem0.md
  - repos/memvid-memvid.md
  - repos/yusufkaraaslan-skill-seekers.md
related:
  - openai
  - vector-database
last_compiled: '2026-04-08T23:26:21.182Z'
---
# FAISS

## What It Does

FAISS is a library for searching large collections of dense vectors by similarity. Given a query vector, it returns the k most similar vectors from a corpus of millions to billions. [Meta AI Research](../projects/openai.md) built it to power production recommendation and retrieval systems where exact search is too slow.

Within the [Agent Memory](../concepts/agent-memory.md) and [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) ecosystems, FAISS is the default local vector search layer. Systems like [Mem0](../projects/mem0.md), [LangChain](../projects/langchain.md), [LlamaIndex](../projects/llamaindex.md), and [ChromaDB](../projects/chromadb.md) all support FAISS as a backend. When those systems say "local vector store," FAISS is usually what they mean.

## Architecture: How It Works

### Index Hierarchy

FAISS exposes a composable index system. Each index type is a C++ class that inherits from `faiss::Index`. The main variants:

**Flat indexes** (`IndexFlatL2`, `IndexFlatIP`) do exact brute-force search. No compression, no approximation. Scales to millions of vectors on GPU, tens of thousands on CPU before latency becomes a problem.

**IVF (Inverted File) indexes** (`IndexIVFFlat`, `IndexIVFPQ`) partition the vector space into Voronoi cells using k-means clustering. At query time, only `nprobe` cells are searched instead of all of them. Training is required before adding vectors — the k-means step runs on a representative sample of your data.

**HNSW** (`IndexHNSW`) builds a hierarchical navigable small-world graph. No training required. Fast queries, high recall, but non-trivial memory overhead and no GPU support in the core library.

**Product Quantization (PQ)** (`IndexPQ`, combined with IVF in `IndexIVFPQ`) compresses vectors by splitting each into subvectors and encoding each subvector with a codebook. A 768-dimensional float32 vector (~3KB) can compress to 96 bytes with an IVF-PQ index, enabling billion-scale search on a single server.

**Scalar Quantization (SQ)** (`IndexScalarQuantizer`) rounds float32 values to int8 or int4. Less compression than PQ but faster decompression and better recall.

The `faiss/index_factory.py` factory function (and its C++ equivalent `index_factory()`) lets you construct indexes by descriptor string: `"IVF4096,PQ32"`, `"HNSW32"`, `"Flat"`. This is the interface most high-level libraries use.

### GPU Acceleration

FAISS ships CUDA kernels for flat and IVF search. `faiss.index_cpu_to_gpu()` copies a CPU index to a GPU resource. On a V100, flat L2 search over 1M 128-dim vectors runs in under 1ms for batch queries. The GPU path is the primary reason FAISS outperforms pure-Python alternatives at scale.

### The `IndexIDMap` Wrapper

By default, FAISS assigns sequential internal IDs starting at 0. To map vectors to external IDs (UUIDs, database keys), you wrap any index in `IndexIDMap`:

```python
index = faiss.IndexFlatL2(dim)
index = faiss.IndexIDMap(index)
index.add_with_ids(vectors, ids)  # ids is int64 array
```

Mem0's codebase wraps UUIDs in integer ID mappings before passing them to FAISS for exactly this reason — FAISS's internal IDs are int64, and UUID strings require an external mapping layer.

### Search Operation

```python
distances, indices = index.search(query_vectors, k)
```

Returns distances (L2 squared, or inner product for IP indexes) and internal IDs. If using `IndexIDMap`, indices are your external IDs. `-1` in the indices array means fewer than k results were found.

## Key Numbers

**GitHub stars**: ~32K (as of 2025). Credible — FAISS predates the LLM wave and has been used in production at Meta for years.

**Performance benchmarks** (from the FAISS wiki, self-reported but widely reproduced):
- 1 billion 128-dim vectors, IVF-PQ index: sub-millisecond query latency at ~95% recall
- Flat L2 search, 1M vectors, GPU: ~0.5ms per query at batch size 1

The ANN-benchmarks project (independent) consistently ranks FAISS competitive with HNSW-based systems on recall-per-query-time curves, with FAISS GPU variants showing the best throughput at high batch sizes.

## Strengths

**Scale with hardware**: The GPU acceleration is the clearest differentiator. For high-throughput batch retrieval (reranking, embedding pipelines), FAISS on GPU has no comparable open-source alternative.

**Index variety**: The range from exact flat search to heavily compressed IVF-PQ means you can tune the recall/speed/memory tradeoff continuously rather than picking between two options.

**Battle-tested internals**: The C++ core has run at Meta production scale since 2017. The memory layout, SIMD optimizations, and k-means implementation are not academic exercises.

**Ecosystem adoption**: Because FAISS is the de facto standard, every major retrieval library integrates it. Switching costs are low when using it through [LangChain](../projects/langchain.md), [LlamaIndex](../projects/llamaindex.md), or [ChromaDB](../projects/chromadb.md) abstractions.

## Critical Limitations

**No built-in persistence or metadata filtering**: FAISS stores vectors and IDs. It does not store payloads, support filtered search ("return only vectors where `user_id == 'alice'`"), or handle serialization beyond `faiss.write_index()` / `faiss.read_index()` which write raw binary files. Any system building filtered retrieval on top of FAISS — which is nearly all of them — must implement the filter logic externally, typically by over-fetching results then post-filtering in Python. This blows up latency and recall when selectivity is high (a filter that passes 0.1% of vectors means you need to over-fetch 1000x to get 10 results).

**Concrete failure mode**: An agent memory system stores 10M vectors across 50,000 users. A query for user "alice" with k=10 requires returning results filtered to alice's 200 vectors. Naive FAISS implementation retrieves the top-N globally, then filters — requiring N to be astronomically large to guarantee 10 alice-matches. The correct solution partitions by user (separate indexes) or uses a database with native vector+filter support. Systems that don't account for this ship with silent recall degradation.

**Infrastructure assumption**: FAISS assumes the index fits in memory. A 768-dim float32 vector takes 3KB. 10M vectors = 30GB RAM, minimum. The compression options (SQ8: ~768 bytes, PQ: ~96-384 bytes) help, but billion-scale uncompressed search requires distributed infrastructure FAISS doesn't provide. The library has no sharding or replication concept.

## When NOT to Use It

**Filtered metadata search at scale**: If your retrieval involves metadata predicates on more than 20% of queries, use [Qdrant](../projects/qdrant.md) or [ChromaDB](../projects/chromadb.md), which maintain separate payload indexes and support filtered HNSW traversal natively.

**Persistence-first systems**: If your primary constraint is durability, concurrent writes, or multi-process access, FAISS's file-based serialization is fragile. [PostgreSQL](../projects/postgresql.md) with pgvector or [Redis](../projects/redis.md) with vector modules handle concurrent writes correctly.

**Sub-10K vector collections**: Flat exact search in NumPy is faster to implement and fast enough. The IVF training overhead, ID mapping complexity, and serialization fragility are unnecessary at small scale.

**Production services with dynamic updates**: FAISS IVF indexes must be rebuilt or periodically rebalanced as data distribution shifts. Adding millions of vectors after training without retraining degrades recall because the cluster centroids no longer match the data. [Qdrant](../projects/qdrant.md) and Weaviate handle dynamic updates with online index maintenance.

## Unresolved Questions

**Governance and versioning**: FAISS is a Meta research project. There's no public roadmap, no SLA, and no documented deprecation policy. The last major architectural change (adding HNSW) happened in 2019. GPU support for HNSW is conspicuously absent and there's no indication when or if it will appear.

**Distributed search**: The faiss-gpu documentation mentions multi-GPU support, but sharded search across machines requires external orchestration. There's no official guidance on how to handle index sharding consistently, or how to merge results across shards with correct distance semantics.

**Thread safety**: FAISS search is thread-safe for read-only operations. Add operations are not. The documentation acknowledges this but doesn't provide primitives (locks, write queues) for concurrent ingestion. Systems implementing concurrent writes must build their own synchronization.

**Cost at scale**: Memory bandwidth is the bottleneck for flat search. Running FAISS at billion scale on CPU requires dozens of high-memory servers. The documentation doesn't address operational cost or compare it against managed vector database services.

## Alternatives with Selection Guidance

**Use [ChromaDB](../projects/chromadb.md)** when you need payload storage, metadata filtering, and simple Python-native persistence alongside vector search. It uses FAISS internally but wraps it with a proper document store.

**Use [Qdrant](../projects/qdrant.md)** when you need filtered vector search in production, dynamic index updates without retraining, or a gRPC API for high-throughput services. Qdrant's HNSW implementation supports filtered search at native speed.

**Use [Pinecone](../projects/pinatone.md)** when you need a managed service with no operational overhead and can accept vendor lock-in and per-query pricing.

**Use pgvector ([PostgreSQL](../projects/postgresql.md))** when your data already lives in Postgres, your vectors are under 100M, and you want ACID guarantees on combined relational and vector queries.

**Use FAISS directly** when you're building a research prototype with large batches of vectors, need GPU acceleration for throughput, have homogeneous data with no metadata filtering requirement, and can manage serialization and ID mapping yourself.

## Relationship to Agent Memory Infrastructure

Within [Semantic Memory](../concepts/semantic-memory.md) and [Long-Term Memory](../concepts/long-term-memory.md) architectures, FAISS provides the retrieval primitive but nothing above it. [Mem0](../projects/mem0.md) uses FAISS as one of 23 supported vector backends, wrapping it with LLM-based memory management. [LangChain](../projects/langchain.md) exposes `FAISS.from_documents()` as a convenient entry point that handles chunking, embedding, and FAISS index construction in one call. [HippoRAG](../projects/hipporag.md) and [RAPTOR](../projects/raptor.md) use FAISS for their base retrieval layers before applying graph or tree-based reranking.

The [Hybrid Search](../concepts/hybrid-search.md) pattern — combining FAISS dense retrieval with [BM25](../concepts/bm25.md) sparse retrieval — is common in production RAG systems. FAISS handles the semantic similarity leg; a separate BM25 index handles keyword matching; scores merge via reciprocal rank fusion or learned weights.

FAISS doesn't handle [Context Engineering](../concepts/context-engineering.md) decisions, memory consolidation, or any of the higher-level concerns in [Agent Memory](../concepts/agent-memory.md) architectures. It answers one question: given a query vector, which stored vectors are closest? Everything else is the application's responsibility.


## Related

- [OpenAI](../projects/openai.md) — implements (0.4)
- [Vector Database](../concepts/vector-database.md) — part_of (0.8)

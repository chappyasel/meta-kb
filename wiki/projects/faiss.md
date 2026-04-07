---
entity_id: faiss
type: project
bucket: knowledge-bases
abstract: >-
  FAISS (Facebook AI Similarity Search) is a C++/Python library for fast
  nearest-neighbor search over dense vectors, offering exact and approximate
  algorithms tuned for billion-scale datasets; its core differentiator is the
  widest index type coverage of any open-source ANN library.
sources:
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/memvid-memvid.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
last_compiled: '2026-04-07T11:54:50.820Z'
---
# FAISS

## What It Does

FAISS is a C++ library with Python bindings for searching dense vector spaces. You give it a corpus of float32 vectors and a query vector, and it returns the k nearest neighbors by L2 distance, inner product, or cosine similarity. The library ships with dozens of index types covering the full accuracy-vs-speed tradeoff spectrum, from exact brute-force (`IndexFlatL2`) through inverted file systems (IVF) to graph-based HNSW and product quantization (PQ) variants that compress vectors to a fraction of their original size.

In the [Retrieval-Augmented Generation](../concepts/rag.md) and [Agent Memory](../concepts/agent-memory.md) space, FAISS appears primarily as the local/embedded choice when teams want similarity search without operating a server. [Mem0](../projects/mem0.md) lists it as one of 23 vector store backends. Memvid packages an HNSW index inside its `.mv2` file format. Skill Seekers exposes an `export_to_faiss` MCP tool. These integrations use FAISS as infrastructure, not as the primary API surface.

## Architecture and Core Mechanism

FAISS is organized around a single abstract base class, `Index`, with each concrete implementation in its own `.h`/`.cpp` file under `faiss/`. The primary index types:

**Flat indexes** (`IndexFlatL2`, `IndexFlatIP`) store raw vectors and perform exhaustive search. No approximation, no training, O(nd) query time. This is the only option that guarantees exact results.

**IVF (Inverted File) indexes** (`IndexIVFFlat`, `IndexIVFPQ`) partition the space into Voronoi cells via k-means clustering, then at query time search only the nearest `nprobe` cells. You call `index.train(vectors)` before `index.add(vectors)`. The trade-off: more `nprobe` → higher recall, higher latency.

**HNSW** (`IndexHNSWFlat`) builds a hierarchical navigable small-world graph. No training required. Queries traverse the graph from a random entry point, descending layers. High recall at low latency, but the index is fully in RAM and cannot be quantized as aggressively as IVF+PQ.

**Product Quantization** (`IndexPQ`, `IndexIVFPQ`) compresses vectors by splitting each d-dimensional vector into M sub-vectors and quantizing each independently. A 768-dimensional float32 vector (3072 bytes) can compress to ~96 bytes at M=48, byte_per_idx=2. Compression ratio is the main advantage; recall degrades predictably with more compression.

**Composite indexes** are built using the `index_factory` string API: `"IVF4096,PQ48"` creates an IVF index with 4096 Voronoi cells and PQ-48 quantized storage. This factory system is FAISS's primary ergonomic API for practitioners who don't want to compose C++ objects manually.

GPU support lives in `faiss/gpu/` and wraps cuBLAS for flat search and custom CUDA kernels for IVF. A single `GpuIndexFlatL2` can search tens of millions of vectors in milliseconds. The GPU code requires CUDA and compiles separately; the CPU build has no GPU dependency.

The Python bindings in `faiss/python/` wrap the C++ classes with SWIG and add numpy array interop. The primary data path: pass a `(n, d)` float32 numpy array to `index.add(xb)`, pass a `(nq, d)` float32 query array to `index.search(xq, k)`, receive `(nq, k)` distance and label arrays.

## Key Numbers

**GitHub**: ~36,000 stars (as of mid-2025). Maintained by Meta AI Research.

**Benchmark context** (self-reported by Meta, validated by ann-benchmarks.com):
- `IndexFlatL2` at 1M vectors, 128 dimensions (SIFT1M): ~2ms per query single-threaded CPU. Exact.
- `IndexIVFFlat` with nprobe=64, 1024 cells: ~0.2ms per query, ~97% recall@10. ann-benchmarks shows this roughly matches published figures.
- HNSW at M=16, efSearch=64: ~0.1ms per query, ~99% recall@10 on SIFT1M. ann-benchmarks independently validates this tier.
- Billion-scale benchmarks (BIGANN 1B): IVF+PQ configurations achieve ~50ms queries with ~60% recall. These figures appear in Meta's original 2017 paper and have been reproduced by third parties.

The ann-benchmarks.com project provides independent validation for many of these numbers on standardized datasets, though exact figures depend heavily on hardware, thread count, and parameter settings.

## Strengths

**Index type breadth**: No other single open-source library covers as many ANN algorithm families. HNSW, IVF, PQ, LSH, and graph-based variants are all first-class.

**GPU scaling**: The CUDA backend is battle-tested for flat and IVF search at scales that exhaust CPU RAM. Relevant for offline batch embedding pipelines, less relevant for online per-query retrieval.

**Composability via index_factory**: The string API lets practitioners experiment with index combinations without writing C++ or Python boilerplate.

**Embeddability**: No server process, no network stack. Import the library, build an index, serialize to disk with `faiss.write_index()`. This makes it practical for edge deployments, CI pipelines, and file-based memory systems like Memvid.

**Mature codebase**: The 2017 paper has thousands of citations. Edge cases in IVF clustering, GPU memory management, and quantization codebook training have been worked out over years of production use.

## Critical Limitations

**Concrete failure mode**: IVF index quality degrades silently when the training set is unrepresentative of the query distribution. If you train an `IndexIVFFlat` on 10,000 randomly sampled vectors but later add 10 million vectors from a different distributional region (e.g., a new product category in a catalog), Voronoi cell assignments will be skewed and recall at fixed `nprobe` will drop significantly. The index will continue returning results; it will not raise an error. The only detection mechanism is periodic recall benchmarking against a ground-truth subset.

**Infrastructure assumption**: FAISS assumes all vectors fit in RAM. There is no disk-backed paging or streaming search. At 768 dimensions / float32, 100 million vectors consume ~300 GB. The GPU variants assume VRAM fits the index. Teams discovering this at production scale typically migrate to [Qdrant](../projects/qdrant.md), [Pinecone](../projects/pinecone.md), or [Elasticsearch](../projects/elasticsearch.md) with vector support.

## When NOT to Use It

**Multi-tenant SaaS or agent memory with per-user isolation**: FAISS has no concept of namespaces, access control, or metadata filtering. Filtering by `user_id` requires either maintaining separate indexes per user (scaling nightmare) or post-query filtering (wastes the ANN speedup). [Qdrant](../projects/qdrant.md) and [ChromaDB](../projects/chromadb.md) handle filtered search natively.

**Mutable corpora with frequent updates**: FAISS does not support deleting individual vectors from most index types. `IndexFlat` supports `remove_ids()`, but IVF and HNSW indexes require full rebuild after significant deletions. If your agent memory system needs to expire or update individual memories (as [Mem0](../projects/mem0.md) does via ADD/UPDATE/DELETE operations), FAISS's immutability is a serious operational constraint.

**Production systems that need persistence guarantees**: `faiss.write_index()` writes a binary file. There is no WAL, no atomic writes, no crash recovery. A process kill mid-write corrupts the index file. Memvid solves this with its embedded WAL structure, but a raw FAISS integration requires the application layer to implement its own durability.

**Semantic or keyword hybrid search**: FAISS does pure vector similarity. No BM25, no full-text index, no hybrid reranking. For [Hybrid Search](../concepts/hybrid-search.md) workflows combining dense and sparse retrieval, you need a separate keyword index and a fusion layer like [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md).

## Unresolved Questions

**GPU multi-node**: The GPU backend scales within a single machine with multiple GPUs. Distributed FAISS across nodes is not a first-class feature. Meta's internal sharding approaches are not open-sourced; teams doing billion-scale distributed search typically implement their own shard routing.

**Quantization-aware training**: FAISS trains PQ codebooks independently of the embedding model. There is no joint optimization between the codebook and the embedder. Research on learned quantization (e.g., ScaNN, DiskANN) suggests this matters at high compression ratios, but FAISS does not incorporate it.

**Long-term maintenance posture**: Meta's AI research priorities have shifted significantly since 2017. The commit cadence has slowed compared to dedicated vector database projects. Whether FAISS will incorporate newer algorithmic advances (e.g., HNSW variants with better delete support) is not documented in any roadmap.

**Index format versioning**: `faiss.write_index()` produces a binary format that is not guaranteed stable across major versions. The documentation does not specify a compatibility matrix. Teams upgrading FAISS versions in production have encountered silent format mismatches.

## Alternatives with Selection Guidance

**[ChromaDB](../projects/chromadb.md)**: Use when you want a FAISS-like embedded database with metadata filtering, a Python-native API, and no server process. ChromaDB wraps HNSW (via hnswlib) and adds collection management and filtering. Slower than raw FAISS for pure ANN, but much easier to operate for typical RAG use cases.

**[Qdrant](../projects/qdrant.md)**: Use when you need filtered vector search, payload indexing, named vectors, or a persistent server with REST/gRPC APIs. Qdrant is the default backend in Mem0 for good reason: it handles per-user scoping cleanly. More operational complexity than FAISS, more capability.

**[Pinecone](../projects/pinecone.md)**: Use when your team cannot operate any infrastructure and your vectors number in the hundreds of millions. Fully managed, supports metadata filtering and namespaces. Ongoing API cost; vendor lock-in.

**[Elasticsearch](../projects/elasticsearch.md)**: Use when you already run Elasticsearch and want vector search alongside keyword search and structured queries. Native hybrid search with BM25 + ANN. Higher operational overhead than all the above.

**Raw FAISS**: Use when you need maximum throughput on a fixed, rarely-updated corpus in a single-machine context, or when building a file-based portable memory artifact (as Memvid does). The embedded, no-server model is genuinely useful for offline batch search, edge inference, and research experiments.

## Related Concepts

- [Vector Database](../concepts/vector-database.md): The broader category FAISS indexes fall under
- [Embedding Model](../concepts/embedding-model.md): Produces the float32 vectors FAISS searches
- [Retrieval-Augmented Generation](../concepts/rag.md): Primary use case driving FAISS adoption
- [Hybrid Search](../concepts/hybrid-search.md): What FAISS cannot do alone
- [Semantic Memory](../concepts/semantic-memory.md): The agent memory type FAISS most directly supports

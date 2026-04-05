---
entity_id: chromadb
type: project
bucket: knowledge-bases
sources:
  - repos/gepa-ai-gepa.md
  - repos/thedotmack-claude-mem.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
related: []
last_compiled: '2026-04-05T05:32:27.664Z'
---
# ChromaDB

## What It Does

ChromaDB is an open-source vector database built for embedding-based search. You store text (or other data) alongside its embedding vectors, then query by semantic similarity rather than exact keyword match. The pitch is simple: call `.add()` with documents and embeddings, call `.query()` with a query embedding, get back ranked results. No separate server required for local use.

It shows up across the knowledge-base ecosystem as a default choice. The GEPA framework lists a `Generic RAG Adapter` that supports ChromaDB, Weaviate, Qdrant, and Pinecone. Skill Seekers includes `export_to_chroma` as one of its four vector DB export tools. The claude-mem project uses Chroma as its hybrid semantic search backend alongside SQLite. These aren't endorsements so much as evidence that ChromaDB became a low-friction default for Python developers who need "something that works locally."

## Core Mechanism

ChromaDB's architecture separates concerns cleanly:

**Storage layer:** Documents, embeddings, and metadata go into a persistent store (SQLite + Parquet files by default in embedded mode, or a separate Chroma server process for client-server mode). The local embedded mode writes to a directory on disk.

**Collection abstraction:** Everything lives in named collections. A collection holds documents (strings), their embeddings (float arrays), metadata (arbitrary key-value dicts), and IDs. You can add embeddings yourself or let Chroma generate them using a configured embedding function.

**Query path:** `.query()` takes a query embedding (or raw text if you configured an embedding function), computes approximate nearest neighbors against stored vectors, and returns ranked results with distances. The default ANN algorithm is HNSW (Hierarchical Navigable Small World graphs), which trades some accuracy for fast retrieval on large datasets.

**Embedding functions:** Chroma ships built-in connectors for OpenAI, Cohere, HuggingFace, and several others. You can also pass pre-computed embeddings directly, which is what most production users do.

The client-server mode runs `chroma run` to start an HTTP server; your Python client connects via `HttpClient`. This is the path to sharing a Chroma instance across processes or deploying it persistently.

```python
import chromadb

client = chromadb.PersistentClient(path="./my_db")
collection = client.get_or_create_collection("docs")

collection.add(
    documents=["ChromaDB stores vectors", "HNSW enables fast ANN search"],
    ids=["doc1", "doc2"]
)

results = collection.query(query_texts=["vector database"], n_results=2)
```

Metadata filtering happens at query time using `where` clauses: `where={"source": "internal"}`. This is useful for multi-tenant setups or filtering by document type before doing similarity search.

## Key Numbers

**GitHub stars:** ~20,000+ (self-reported via badge on their README; independently visible on GitHub). The project gained momentum quickly in 2023 alongside the RAG explosion.

**Benchmark performance:** Chroma's own benchmarks are not independently validated. Real-world performance depends heavily on collection size, embedding dimensions, and hardware. For collections under 100k documents, query latency in embedded mode is typically under 50ms. Beyond that, the in-process HNSW index consumes significant RAM (a million 1536-dimensional embeddings takes roughly 6GB).

## Strengths

**Zero-config local development:** `pip install chromadb`, three lines of Python, you have a working vector store. No Docker, no cloud account, no API keys required if you bring your own embeddings. This is the actual differentiator versus Pinecone or Weaviate.

**Python-native feel:** The API matches how Python developers think. Collections work like dictionaries. Adding documents feels like appending to a list. The query interface returns plain Python dicts, not SDK objects you have to unwrap.

**Hybrid metadata filtering:** The combination of vector similarity search with structured metadata filters covers most RAG retrieval patterns without needing a separate filter layer.

**Persistence without ceremony:** `PersistentClient` writes to disk automatically. You don't manage checkpoints or call explicit save methods.

## Critical Limitations

**Concrete failure mode — scale cliff:** ChromaDB's embedded mode loads the entire HNSW index into RAM. A production knowledge base with 500k+ documents will exhaust memory on typical application servers. There's no streaming or on-disk index. Teams that prototype with Chroma on a laptop and deploy to a 2GB container hit this wall at launch. The client-server mode shifts this problem but doesn't eliminate it; the server process still holds everything in memory.

**Unspoken infrastructure assumption:** The embedded mode assumes single-process, single-writer access. If you run multiple application workers (common in any production web framework), concurrent writes to the same Chroma directory will corrupt the database. The client-server mode solves this, but then you've added a stateful service to your deployment that needs its own persistence, backup strategy, and uptime monitoring. The "lightweight" framing disappears.

## When NOT to Use It

**Skip Chroma when:**
- Your collection exceeds 200k documents and you care about RAM costs
- You need multi-writer access from parallel processes in embedded mode
- Your team needs managed infrastructure with SLAs (uptime, backup, disaster recovery)
- You're building something that needs hybrid BM25 + vector search with serious keyword recall (Chroma's keyword search is basic)
- You need multi-tenancy with true data isolation between customers

## Unresolved Questions

**Governance and roadmap:** Chroma is venture-backed (raised a Series A). The open-source embedded version and the cloud offering (Chroma Cloud) have unclear long-term alignment. Whether the embedded version stays fully featured or becomes a funnel toward the cloud product isn't documented.

**Cost at scale:** Chroma Cloud pricing isn't prominently listed. For teams evaluating Chroma as a long-term dependency, the economics of the managed offering versus self-hosting at scale are opaque.

**Conflict resolution in multi-source updates:** When you add documents with IDs that already exist, Chroma silently upserts. There's no versioning, no conflict detection, no audit log. For knowledge bases where source-of-truth matters (legal, compliance, medical), this is a gap the documentation doesn't address.

**Index tuning exposure:** HNSW has parameters (ef_construction, M) that dramatically affect recall/speed tradeoffs. Chroma exposes some of these but the documentation on when to tune them is thin.

## Alternatives

| Tool | Choose when |
|------|-------------|
| **Qdrant** | You need production-grade performance, on-disk indexing, and a mature REST/gRPC API without RAM constraints |
| **Weaviate** | You want built-in hybrid BM25+vector search, multi-tenancy, and a GraphQL query interface |
| **Pinecone** | You want a fully managed service and can absorb per-query costs; no infrastructure to run |
| **pgvector** | Your data already lives in PostgreSQL and you want one less moving part |
| **FAISS** | You need raw ANN performance in-process and will manage persistence yourself |
| **LanceDB** | You want embedded, disk-based storage that doesn't blow up RAM at scale |

Use Chroma for local prototyping, notebooks, and single-process applications where the collection fits in memory and you need to get something working in under an hour. Switch to Qdrant or pgvector when you're deploying to production with real load.

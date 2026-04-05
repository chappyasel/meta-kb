---
entity_id: sqlite
type: project
bucket: knowledge-bases
sources:
  - repos/thedotmack-claude-mem.md
  - repos/caviraoss-openmemory.md
  - repos/tirth8205-code-review-graph.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/repos/topoteretes-cognee.md
related: []
last_compiled: '2026-04-05T05:26:51.929Z'
---
# SQLite

## What It Is

SQLite is a serverless, embedded relational database engine. The entire database lives in a single file on disk. No separate process, no network socket, no configuration. The library links directly into the host process and exposes a standard SQL interface.

In the LLM tooling space, SQLite has become the default persistence layer for local agent memory, session logs, skill repositories, and codebase knowledge graphs. It shows up in claude-mem's session/observation store, code-review-graph's AST node and edge store, and OpenMemory's local-first memory backend — all independently choosing SQLite for the same reason: zero infrastructure overhead with full SQL expressiveness.

## Core Mechanism

SQLite's design centers on a single B-tree file format. Each table is a B-tree; each index is a separate B-tree in the same file. Reads and writes go through a page cache (default 2MB, configurable). The file locking model uses OS-level locks: reads share, writes get exclusive access to the whole file.

**FTS5** (Full-Text Search version 5) is a virtual table extension that inverted-indexes text columns. Code-review-graph uses FTS5 for its hybrid keyword + vector search across function names and code entities. Claude-mem's architecture documentation explicitly names "SQLite FTS5 search" as a core component of its search layer. FTS5 supports BM25 ranking, prefix queries, and phrase matching out of the box — no external search server required.

The **WAL (Write-Ahead Log) mode** is the other frequently relevant feature. Default journal mode serializes readers and writers. WAL allows concurrent reads during a write, which matters for agent systems where a background worker writes observations while a foreground process queries context. Enabled with one pragma: `PRAGMA journal_mode=WAL`.

Vector similarity search is not native to SQLite but the ecosystem fills the gap with extensions: `sqlite-vec` and the older `sqlite-vss` (backed by FAISS). OpenMemory stores vectors in SQLite alongside its relational memory tables; code-review-graph uses SQLite for structural graph data and an optional separate Chroma instance for embeddings.

## Numbers

SQLite claims to be the most widely deployed database in the world — embedded in every Android device, iOS device, and Firefox installation. That claim is plausible and widely accepted. The specific performance figures most relevant here: code-review-graph reports search latencies of 0.4–1.5ms against graphs with up to 27,000+ edges, and incremental re-indexing of a 2,900-file codebase in under 2 seconds — both using SQLite as the backing store. These are self-reported by the project authors, not independently benchmarked.

## Strengths

**Zero-dependency deployment.** No server to start, no port to configure, no daemon to monitor. For local agent tools this is decisive — developers install a Python package or npm module and memory works on the first run.

**SQL expressiveness on local data.** Joins, aggregations, window functions, and FTS5 full-text search work without leaving the process. A query joining session metadata, observation content, and a full-text index is a single SQL statement, not three service calls.

**Transactional integrity.** ACID semantics on a local file. Agent systems that interleave reads and writes during long sessions don't corrupt their own stores.

**Portable data.** One file, copyable, inspectable with any SQLite client. No export step to examine what an agent stored.

## Critical Limitations

**Concrete failure mode — write contention under concurrent agents.** When multiple agent processes write simultaneously (e.g., parallel tool calls or a multi-agent orchestration), SQLite's file-level write lock serializes them. With WAL mode, readers don't block writers, but writers still block each other. A system spinning up ten parallel agent workers that all log observations will hit lock timeouts and `SQLITE_BUSY` errors. The default busy timeout is 0ms — the call fails immediately. This is solvable (set a busy timeout, redesign writes to batch), but it surprises teams that migrate a working single-agent setup to parallel execution without changing anything.

**Unspoken infrastructure assumption — local filesystem availability.** SQLite requires a POSIX filesystem with proper locking semantics. Network filesystems (NFS, CIFS, many container volume mounts) have broken or unreliable lock implementations. Deploying an SQLite-backed agent to a Kubernetes pod with an NFS-backed PersistentVolume is a common path to silent database corruption. The database silently succeeds writes that are actually lost or interleaved incorrectly. Teams running local dev on SQLite and deploying to containers with shared storage hit this the hard way.

## When NOT to Use It

**Multi-user or multi-process write workloads.** If more than one process writes to the same database concurrently at meaningful throughput, use PostgreSQL. OpenMemory explicitly acknowledges this: their architecture offers SQLite for local single-user use and PostgreSQL for "multi-user org-wide memory."

**Datasets that need horizontal scaling.** SQLite has no replication, no sharding, no distributed query. A team knowledge base that needs to span multiple machines requires a different foundation.

**Environments where you can't guarantee filesystem integrity.** Serverless functions with ephemeral storage, containers on shared network volumes, and read-only filesystems all break SQLite in different ways.

**High-throughput write pipelines.** Ingesting thousands of embeddings or observations per second will serialize badly. Batch inserts mitigate this but only to a point.

## Unresolved Questions

**Vector extension stability.** `sqlite-vec` and `sqlite-vss` are third-party extensions, not part of SQLite proper. Their ABI stability across SQLite versions, behavior under concurrent access, and behavior during crash recovery are not documented to the same standard as core SQLite. Projects using them (OpenMemory, code-review-graph's optional embedding path) are implicitly depending on extension authors for correctness guarantees.

**FTS5 and transactional consistency.** FTS5 virtual tables participate in SQLite transactions, but the interaction between FTS5 index updates and WAL mode has subtle edge cases. Documentation on crash recovery behavior for FTS5 indexes is sparse. In practice this is rarely a problem, but for a memory system where losing observations means broken agent continuity, the gap in documentation is worth noting.

**Schema migration story at scale.** SQLite has limited ALTER TABLE support (no dropping columns before version 3.35.0, no changing column types). Agent tools that evolve their schema across versions need explicit migration code. None of the projects surveyed document their migration strategy.

## Alternatives

**PostgreSQL** — Use when you need concurrent writes from multiple processes, replication, or a production deployment that will serve multiple users. Adds operational overhead (server process, connection pooling) but removes the write-contention ceiling. OpenMemory supports it as a drop-in target.

**DuckDB** — Use when your workload is analytical: aggregations over large observation histories, complex joins across many tables, columnar compression. DuckDB is also embeddable and file-based, but optimized for read-heavy analytical queries rather than OLTP. Poor fit for high-frequency small writes.

**ChromaDB / Qdrant / Weaviate** — Use when vector similarity is the primary query type and you need approximate nearest-neighbor search at scale. These are purpose-built vector databases. Code-review-graph uses Chroma alongside SQLite: SQLite for graph structure, Chroma for embedding search. The two complement each other rather than compete.

**Redis** — Use when you need sub-millisecond latency on a shared in-memory store across multiple processes or machines. Appropriate for ephemeral session state, not durable memory.

For single-developer local tooling, SQLite is the right default. The question of when to graduate to PostgreSQL is essentially: when do you need more than one writer?

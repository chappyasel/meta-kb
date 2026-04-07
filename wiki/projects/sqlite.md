---
entity_id: sqlite
type: project
bucket: knowledge-bases
abstract: >-
  SQLite is a serverless, file-based relational database embedded directly in
  application processes — the dominant local storage layer for agent memory,
  session state, and knowledge base indexing due to zero infrastructure overhead
  and ubiquitous language support.
sources:
  - repos/thedotmack-claude-mem.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/volcengine-openviking.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/repos/topoteretes-cognee.md
related:
  - claude-code
  - openclaw
  - chromadb
  - anthropic
last_compiled: '2026-04-07T12:00:08.794Z'
---
# SQLite

## What It Is

SQLite is a C library that implements a complete SQL database engine within the calling process. No separate server, no network socket, no daemon. The database lives in a single file on disk. The library links directly into applications at build or runtime. This design makes it the default persistence layer for local agent memory systems, knowledge base pipelines, and session state stores across virtually every AI tooling project in this space.

Richard Hipp created SQLite in 2000 for the United States Navy. The source code (~160,000 lines of C) ships as a single-file amalgamation (`sqlite3.c`), compiles in under a minute, and requires no configuration. The SQLite team estimates over one trillion deployed instances — more than any other database engine by a wide margin. This figure is self-reported but consistent with its presence in every iOS/Android device, Firefox profile, Python stdlib, and major browser.

## Core Architecture

SQLite operates as a library, not a service. Each process that opens a database file owns its own copy of the engine. The file format (`*.db`) is stable across versions and documented publicly. Reads scale with concurrent readers (shared lock). Writes serialize: one writer at a time. This is the key constraint that shapes its use in agent systems.

The engine supports standard SQL with a few notable gaps: no `RIGHT JOIN` before version 3.39, no `FULL OUTER JOIN` before 3.39, no native JSON aggregation before 3.38. Extensions matter here. Two are heavily used in the AI tooling space:

**FTS5** (Full-Text Search 5): A virtual table extension enabling BM25-ranked full-text search. Projects like code-review-graph and claude-mem use it extensively — storing observation narratives, user prompts, and code entity signatures in FTS5 virtual tables for keyword retrieval. FTS5 supports Porter stemming, Unicode tokenization, and phrase queries. It ships bundled with SQLite but must be compiled in (most distributions include it). [Source](../raw/deep/repos/tirth8205-code-review-graph.md)

**sqlite-vec** (formerly sqlite-vss): A loadable extension adding vector similarity search. Memento-Skills uses sqlite-vec for semantic skill retrieval. [Source](../raw/deep/repos/memento-teams-memento-skills.md) It stores float32 vectors in virtual tables and supports L2/cosine distance. This matters because it turns SQLite into a lightweight [vector database](../concepts/vector-database.md) without introducing ChromaDB, Qdrant, or Pinecone as dependencies.

**WAL mode** (Write-Ahead Logging): Not an extension but a journal mode that significantly changes concurrency characteristics. In WAL mode, readers do not block writers and writers do not block readers. Reads scale to concurrent processes. WAL is mandatory for any production agent system using SQLite — code-review-graph explicitly enables it for its graph store. [Source](../raw/deep/repos/tirth8205-code-review-graph.md)

## How Agent Systems Use SQLite

Across the projects in this knowledge base, SQLite appears in three recurring roles:

**1. Structured state store.** Session records, conversation turns, entity metadata, skill registry entries, graph nodes and edges. The data is relational, queried by ID or foreign key, and benefits from ACID transactions. Memento-Skills stores sessions, tool call transcripts, and conversation blocks in SQLite via SQLAlchemy. [Source](../raw/deep/repos/memento-teams-memento-skills.md) claude-mem stores observations with type/concept metadata in SQLite with JSON columns for array fields. [Source](../raw/deep/repos/thedotmack-claude-mem.md)

**2. Hybrid retrieval layer.** FTS5 + sqlite-vec together provide BM25 keyword search and approximate nearest-neighbor vector search in a single file. code-review-graph uses FTS5 across node names, qualified names, file paths, and signatures, then fuses results with vector embeddings via [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md). Search latency for 27,000+ node graphs is under 1.5ms. [Source](../raw/deep/repos/tirth8205-code-review-graph.md)

**3. Knowledge graph persistence.** code-review-graph's `GraphStore` (`graph.py`) stores AST-extracted nodes and edges as relational rows. Nodes carry kind, qualified name, file path, line ranges, language, and community ID. Edges carry kind, source/target qualified names. Graph algorithms (BFS, Leiden community detection) run in NetworkX after loading from SQLite into memory — SQLite holds the persistent state, NetworkX handles the traversal. [Source](../raw/deep/repos/tirth8205-code-review-graph.md)

Memori's BYODB option supports SQLite alongside PostgreSQL, MySQL, MongoDB, and others. For local deployments, SQLite is the zero-configuration default. [Source](../raw/deep/repos/memorilabs-memori.md)

## Key Numbers

- **File size**: The SQLite amalgamation is ~8MB compiled. The `sqlite3` CLI binary is ~1.5MB.
- **Throughput**: Single-writer bottleneck. In WAL mode, reads are concurrent. On modern NVMe, sequential writes can exceed 500K INSERTs/second on simple workloads.
- **Maximum database size**: 281TB (2^47 bytes).
- **Maximum row size**: 1GB.
- **Stars**: Not a GitHub project in the traditional sense — SQLite uses Fossil for version control. The 5.0+ language binding wrappers (e.g., `better-sqlite3` for Node.js) have 5K+ stars individually.

All performance figures above are drawn from SQLite's published documentation and are largely consistent with independent benchmarks, though exact numbers depend heavily on hardware, write patterns, and whether WAL mode is enabled.

## Strengths

**Zero infrastructure.** No server process, no port, no configuration file, no service to restart. An agent can open a database, write memory, and close it. This is why every project that needs local persistence defaults to SQLite.

**FTS5 hybrid search quality.** For code and structured text, BM25 over entity names and signatures performs comparably to embedding-based retrieval for exact match and prefix queries. code-review-graph reports sub-millisecond FTS5 search on 27K+ node graphs. [Source](../raw/deep/repos/tirth8205-code-review-graph.md)

**Portability.** The database is a single file. Copying, backing up, or shipping a knowledge base is `cp`.

**Python stdlib integration.** `import sqlite3` works without pip. Every Python agent can use SQLite without adding dependencies.

**Atomic transactions.** ACID compliance means partial writes don't corrupt state. For agent systems that write memory across multiple tables in one logical operation, this is not optional.

## Limitations

**Single writer.** SQLite serializes all writes. For multi-agent architectures where several agent processes write memory simultaneously, this becomes a throughput ceiling. WAL mode moves the limit but does not eliminate it — concurrent write-heavy workloads will queue. [PostgreSQL](../projects/postgresql.md) is the correct choice when you need true concurrent writes from multiple processes.

**No native graph query.** SQLite has no Cypher, no SPARQL, no path query syntax. Graph traversal requires loading into NetworkX or equivalent, which means full graph in memory. code-review-graph notes a soft limit of ~50K files before memory pressure becomes a concern and graph database migration becomes attractive. [Source](../raw/deep/repos/tirth8205-code-review-graph.md)

**Vector search is an extension, not a core feature.** sqlite-vec requires a loadable extension. Packaging it into production environments — especially containerized or serverless deployments — adds friction. ChromaDB, Qdrant, and FAISS handle larger vector collections with better indexing algorithms (HNSW vs sqlite-vec's flat scan up to a threshold).

**Concrete failure mode: WAL file accumulation.** If a process opens a WAL-mode database and crashes without checkpointing, the WAL file grows indefinitely until the next successful `PRAGMA wal_checkpoint`. Long-running agent processes that write frequently but checkpoint rarely can produce WAL files larger than the database itself. Recovery requires a live connection to checkpoint or manual file manipulation.

**Unspoken infrastructure assumption: single-machine deployment.** SQLite has no replication, no network protocol, no multi-node clustering. The entire agent memory system must reside on one machine. Cloud-native architectures that horizontally scale agent workers cannot share a SQLite database file through a network filesystem (NFS locking is unreliable for SQLite). This is rarely documented but is a hard constraint.

## When NOT to Use SQLite

- Multi-process agent architectures with concurrent write-heavy workloads (use PostgreSQL)
- Agent memory systems that need to persist across multiple machines or be accessed over a network (use PostgreSQL, Qdrant, or a hosted vector DB)
- Vector collections exceeding ~1M embeddings at full-recall quality (use FAISS, Qdrant, or Pinecone)
- Deployments requiring replication, failover, or point-in-time recovery (use PostgreSQL with logical replication)
- Any environment where you cannot ship a native extension (sqlite-vec breaks in restricted sandboxes — use FTS5 alone or switch to an embedding-native store)

## Unresolved Questions

**sqlite-vec production maturity.** sqlite-vec (formerly sqlite-vss) has changed names, APIs, and storage formats across versions. Projects depending on it face migration risk. The extension is actively developed by Alex Garcia but has not reached a stability milestone that would make it a safe long-term dependency for production agent memory.

**WAL checkpoint governance.** None of the projects using SQLite in this space explicitly document their WAL checkpointing strategy. Long-running agent daemons (like claude-mem's worker service on port 37777) accumulate WAL writes. Without a checkpoint schedule, recovery from crashes can be slow and file sizes unpredictable. [Source](../raw/deep/repos/thedotmack-claude-mem.md)

**Concurrent access from hooks and workers.** claude-mem's architecture has multiple processes writing to the same SQLite database: the hook processes (spawned per Claude Code event) and the persistent worker service. WAL mode handles reads concurrently but writes still serialize. Under high tool-use rates ("100+ tool executions per session"), the write queue could introduce latency. The documentation does not address this. [Source](../raw/deep/repos/thedotmack-claude-mem.md)

## Alternatives

- **[PostgreSQL](../projects/postgresql.md)**: Use when you need concurrent writes from multiple processes, replication, or richer query capabilities. PostgreSQL also supports FTS (tsvector/tsquery) and vector search via pgvector. The tradeoff is infrastructure — you need a running server.
- **[ChromaDB](../projects/chromadb.md)**: Use when vector search is the primary operation and you want a purpose-built embedding store with metadata filtering. ChromaDB can use SQLite as its own backing store, making the two complementary rather than competing.
- **[Neo4j](../projects/neo4j.md)** / **[Graphiti](../projects/graphiti.md)**: Use when your knowledge structure is genuinely graph-shaped with many-to-many relationships and you need Cypher queries. SQLite + NetworkX works for tree-like hierarchies (code-review-graph) but struggles with dense graph traversal at scale.
- **DuckDB**: Use when your workload is analytical (aggregations, window functions, columnar scans) rather than transactional. DuckDB has better performance for read-heavy analytics over large datasets; SQLite has better performance for mixed read/write transactional workloads.

## Related Concepts and Projects

- [Agent Memory](../concepts/agent-memory.md) — SQLite is the dominant persistence layer for agent memory implementations
- [Hybrid Search](../concepts/hybrid-search.md) — FTS5 + sqlite-vec enables BM25 + vector hybrid search in a single file
- [BM25](../concepts/bm25.md) — The ranking algorithm underlying FTS5
- [Vector Database](../concepts/vector-database.md) — sqlite-vec adds vector capabilities; for large-scale needs, dedicated vector DBs are preferable
- [Knowledge Graph](../concepts/knowledge-graph.md) — SQLite stores graph structure; in-memory libraries handle traversal
- [ChromaDB](../projects/chromadb.md) — Uses SQLite as its own backing store in local mode
- [OpenClaw](../projects/openclaw.md) — OpenViking (OpenClaw's memory layer) supports SQLite as a BYODB option

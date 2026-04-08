---
entity_id: sqlite
type: project
bucket: agent-architecture
abstract: >-
  SQLite is a serverless, file-based relational database engine widely embedded
  in agent systems for local structured storage; its key differentiator is
  zero-configuration deployment with full SQL support in a single file.
sources:
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/tirth8205-code-review-graph.md
  - repos/caviraoss-openmemory.md
  - repos/thedotmack-claude-mem.md
related:
  - claude-code
  - vector-database
last_compiled: '2026-04-08T23:26:03.818Z'
---
# SQLite

## What It Is

SQLite is a C library implementing a self-contained, serverless SQL database engine. Unlike client-server databases (PostgreSQL, MySQL), it reads and writes directly to an ordinary disk file. The entire database lives in one file. No separate process, no network socket, no configuration. An application links the library and gets a full relational database.

In agent infrastructure, SQLite appears everywhere structured local storage is needed: session logs, observation histories, tool call records, conversation memory, graph node/edge stores, FTS5 indexes, and metadata caches. The [claude-mem](../raw/repos/thedotmack-claude-mem.md) project stores all session observations, summaries, and FTS5 search tables in SQLite. The [code-review-graph](../raw/deep/repos/tirth8205-code-review-graph.md) project builds its entire structural knowledge graph in SQLite with WAL mode. [OpenMemory](../raw/repos/caviraoss-openmemory.md) uses SQLite as its default local backend before users scale to PostgreSQL.

This pattern is not coincidental. Agent systems running locally need structured query capability, ACID guarantees, and zero infrastructure overhead. SQLite delivers all three.

## Core Mechanism

### Storage Model

SQLite stores data in a B-tree file format. Tables are B-trees of rows; indexes are B-trees of index entries. The file is portable across machines and architectures (with minor byte-order caveats on older formats). WAL (Write-Ahead Logging) mode separates reads from writes, allowing concurrent readers while a writer is active — critical for agent systems where a background worker writes observations while the main process queries context.

WAL mode activation:
```sql
PRAGMA journal_mode=WAL;
```

In code-review-graph, WAL mode is set on every database open, enabling the incremental update engine to write new nodes/edges while the MCP server simultaneously serves read queries.

### FTS5 Virtual Tables

SQLite's FTS5 extension provides full-text search with BM25 ranking. Agent memory systems use this extensively because keyword search over stored observations, summaries, and user prompts is often faster and more predictable than vector similarity for exact matches.

Claude-mem creates FTS5 virtual tables to make user prompts and observation content searchable:
```sql
-- FTS5 table for full-text search
CREATE VIRTUAL TABLE observations_fts USING fts5(
    content,
    title,
    narrative,
    tokenize='porter unicode61'
);
```

Code-review-graph uses a `nodes_fts` FTS5 table with Porter stemming and Unicode tokenization, searched via BM25 and fused with vector embeddings via Reciprocal Rank Fusion (RRF).

### JSON Columns

SQLite 3.38+ supports `json_each()`, `json_extract()`, and related functions for querying JSON stored in TEXT columns. Claude-mem stores concepts, files_read, and files_modified as JSON arrays within SQLite rows, then filters them in SQL:

```sql
SELECT id, type, title, narrative, concepts
FROM observations
WHERE project = ?
  AND EXISTS (
    SELECT 1 FROM json_each(concepts) WHERE value IN (?, ?, ?)
  )
ORDER BY created_at_epoch DESC
LIMIT 50;
```

This pattern lets schema-flexible data (arrays of strings, metadata maps) coexist with relational structure without a separate document store.

### In-Memory Caching with NetworkX

For graph algorithm workloads, SQLite's SQL engine cannot efficiently execute BFS traversals, community detection, or flow analysis. Code-review-graph solves this by loading the full graph from SQLite into a NetworkX in-memory representation (`_nxg_cache`), running graph algorithms in NetworkX, and invalidating the cache on every write. The result: sub-millisecond search queries (0.4–1.5ms across benchmarked repos) at the cost of linear memory scaling with graph size.

This pattern — SQLite as durable store, in-memory library for computation — is the standard approach for agent systems that need both persistence and algorithmic graph operations.

## Key Numbers

SQLite is the most deployed database engine in existence, present in every iOS and Android device, every browser, and most operating systems. The engine processes billions of reads per day across all deployments. This is not a benchmark claim — it is a deployment fact.

For agent-specific performance:
- Code-review-graph reports sub-millisecond search latency (0.4–1.5ms) and incremental re-indexing under 2 seconds for 2,900-file projects — self-reported, not independently verified
- Claude-mem claims context injection from last 10 sessions fits within token budgets with compression — the compression ratios are self-reported

SQLite's throughput ceiling on a modern SSD is roughly 50,000 writes/second for small transactions without WAL, and higher with WAL. For agent systems handling 100+ tool calls per session, this is not a bottleneck. The bottleneck is almost always the LLM API call, not the database write.

## Strengths

**Zero infrastructure.** No daemon to start, no port to open, no config file to write. For agent systems running on developer laptops or CI servers, this matters. Claude-mem stores everything in `~/.claude-mem/claude-mem.db`. Setup is one line of code.

**ACID guarantees.** Each write is atomic. Crashes mid-write leave the database in a valid prior state. For agent systems logging observations from background workers, this prevents partial state corruption.

**Full SQL.** JOINs, subqueries, window functions, CTEs, aggregates — all available. An agent system can compute session statistics, filter observations by multiple criteria, rank results by composite scores, and paginate results, all in a single SQL statement.

**FTS5 for keyword search.** BM25-ranked full-text search without an external search service. For agent memory systems, this covers the most common query pattern: "what did I observe about authentication last week?"

**Portable single file.** The database file is a self-contained artifact. It can be copied, backed up, version-controlled (with care), and shared. For local-first agent tools, this aligns with the design philosophy.

**Mature ecosystem.** Every language has a SQLite binding. Python's `sqlite3` is in the standard library. JavaScript has `better-sqlite3` (synchronous, high performance) and `bun:sqlite` (Bun's native driver, faster still). Go has `modernc.org/sqlite` (pure Go, no CGo). Rust has `rusqlite`.

## Critical Limitations

**Concurrency ceiling.** SQLite supports multiple concurrent readers or one writer at a time. WAL mode relaxes this to concurrent readers + one writer, but multi-writer workloads serialize at the database level. An agent system with multiple parallel workers writing observations will see write contention. For single-agent local systems this is irrelevant; for multi-agent systems with shared state, it becomes a bottleneck.

**Infrastructure assumption (unspoken).** SQLite assumes local disk access. Every agent system using SQLite implicitly assumes single-machine deployment. Cloud deployments, containerized agents with ephemeral filesystems, or distributed agent architectures where multiple machines need shared state all break this assumption silently — the database simply isn't visible to other nodes. Teams scaling from local agent tools to distributed deployments discover this late, after significant schema and query investment.

## When NOT to Use It

**Multi-agent systems with shared mutable state.** If more than one agent process needs to write to the same data store simultaneously from different machines, SQLite is the wrong choice. Use [PostgreSQL](../projects/postgresql.md) or [Redis](../projects/redis.md).

**Vector similarity search at scale.** SQLite has no native vector index. You can store vectors as BLOBs and compute cosine similarity in SQL, but it's a full table scan — O(n) per query. Beyond a few thousand vectors, this becomes unusably slow. Use [ChromaDB](../projects/chromadb.md), [FAISS](../projects/faiss.md), or [Qdrant](../projects/qdrant.md) for semantic retrieval. (Claude-mem uses SQLite for structured observation storage and ChromaDB as an optional semantic layer — the correct split.)

**High-write throughput multi-tenant systems.** If you're building an agent platform serving many users concurrently, each with active sessions writing observations, SQLite's write serialization will become a bottleneck before you expect. OpenMemory uses SQLite as the local single-user default but offers PostgreSQL for server deployments — the right migration path.

**Datasets exceeding available RAM (for graph workloads).** Code-review-graph loads the full graph into NetworkX for algorithm execution. This works for codebases under ~50K nodes. Beyond that, the memory requirement makes SQLite + NetworkX impractical and a dedicated graph database becomes necessary.

## Unresolved Questions

**Schema migration in production.** SQLite supports `ALTER TABLE ADD COLUMN` but not `DROP COLUMN` (before 3.35), `RENAME COLUMN` across all versions, or complex constraint changes. Agent systems that evolve their observation schemas over time face awkward migration paths. The documentation for projects like claude-mem doesn't address how schema changes propagate to existing user databases.

**WAL file management at scale.** WAL mode accumulates a `.wal` file that is checkpointed back to the main database file. On busy systems with infrequent checkpoints, the WAL file can grow large. None of the agent projects using SQLite document their checkpoint strategy.

**Cross-session search quality vs. FTS5 limitations.** BM25 in FTS5 handles keyword matching but misses semantic similarity. Claude-mem's mem-search skill reportedly achieved 67% effectiveness before a rename and prompt change brought it to 100% — suggesting the quality gap was in agent behavior, not the underlying search technology. Whether FTS5 alone is sufficient for production agent memory retrieval at scale remains an open question.

**Backup and recovery.** SQLite offers the `.backup` API and the `sqlite3_backup_*` functions for hot backups, but none of the agent projects document their backup strategy. For an agent system where `~/.claude-mem/claude-mem.db` is the only store of project memory, disk failure means total memory loss.

## Alternatives

**[PostgreSQL](../projects/postgresql.md)** — Use when you need multi-writer concurrency, network-accessible shared state, or are deploying to a server environment. PostgreSQL supports full-text search via `pg_trgm` and `tsvector`, JSON via `jsonb`, and has a more robust migration toolchain. OpenMemory offers PostgreSQL as its server-side backend for multi-user deployments.

**[Redis](../projects/redis.md)** — Use when you need fast key-value access, pub/sub messaging between agent workers, or TTL-based expiry for short-term memory. Redis is not relational; it doesn't replace SQLite for structured queries, but it complements it for caching and inter-process communication.

**[ChromaDB](../projects/chromadb.md), [FAISS](../projects/faiss.md), [Qdrant](../projects/qdrant.md)** — Use for [semantic search](../concepts/semantic-search.md) and [vector database](../concepts/vector-database.md) operations. SQLite stores the structured record; a vector database stores the embedding. Claude-mem and OpenMemory both use this split architecture.

**[Neo4j](../projects/neo4j.md)** — Use when your data is fundamentally graph-shaped and you need native graph traversal at scale (>50K nodes) or graph query language (Cypher). For smaller graphs where BFS via NetworkX suffices, SQLite + NetworkX is simpler.

**DuckDB** — Use for analytical queries over large datasets. DuckDB is column-oriented and optimized for aggregation over millions of rows, where SQLite's row-oriented B-tree struggles. If your agent system logs millions of observations and needs complex analytics, DuckDB fits better.

## Role in Agent Architecture

SQLite sits at the persistence layer of [agent memory](../concepts/agent-memory.md) systems. It stores the structured records that [long-term memory](../concepts/long-term-memory.md) systems retrieve, the session logs that support [episodic memory](../concepts/episodic-memory.md), and the tool call histories that enable [context engineering](../concepts/context-engineering.md). It is not a [vector database](../concepts/vector-database.md) and should not be used as one, but as the relational complement to semantic retrieval systems.

The pattern that appears repeatedly across serious local agent tools: SQLite for structured relational data + FTS5 for keyword search + a vector store for semantic retrieval. This three-layer approach lets each component do what it does well.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.4)
- [Vector Database](../concepts/vector-database.md) — alternative_to (0.5)

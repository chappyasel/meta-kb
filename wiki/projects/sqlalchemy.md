---
entity_id: sqlalchemy
type: project
bucket: agent-architecture
abstract: >-
  SQLAlchemy is a Python SQL toolkit and ORM providing database-agnostic query
  construction and schema management, distinguished by its two-layer API (Core
  for SQL expression language, ORM for object mapping) that lets agent
  infrastructure code trade between raw performance and abstraction.
sources:
  - deep/repos/memento-teams-memento-skills.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/topoteretes-cognee.md
  - tweets/ashpreetbedi-dash-v2-the-multi-agent-data-system-every-company.md
related:
  - openai
  - anthropic
  - vector-database
last_compiled: '2026-04-08T23:24:03.792Z'
---
# SQLAlchemy

## What It Does

SQLAlchemy is the dominant Python database abstraction layer, providing two distinct APIs over a common engine: the **Core** (SQL expression language, schema definition, direct query building) and the **ORM** (object-relational mapper, unit-of-work pattern, declarative models). Agent infrastructure uses it as the standard interface for structured persistent storage — conversation history, session metadata, task state, skill files, knowledge graph node metadata, user preferences, and audit logs.

Within the agent memory space, SQLAlchemy appears in virtually every system that needs relational structure. [Mem0](../projects/mem0.md), [Memori](../projects/mem0.md), [Cognee](../projects/graphrag.md), and the Acontext learning pipeline all use SQLAlchemy on their Python backends. The Dash multi-agent data system uses a SQLAlchemy event listener as a security boundary (more on this below). It is infrastructure, not a differentiator — present but rarely the subject of architectural discussion.

## Core Mechanism

### Two-Layer API

**Core** exposes a SQL expression language as Python objects. You construct queries by composing `select()`, `join()`, `where()` calls rather than writing raw SQL strings. The engine layer translates these to dialect-specific SQL for [PostgreSQL](../projects/postgresql.md), [SQLite](../projects/sqlite.md), MySQL, Oracle, and others. Schema objects (`Table`, `Column`, `MetaData`) describe the database structure independently of any ORM.

**ORM** sits on top of Core and adds the unit-of-work pattern: a `Session` tracks Python object state, accumulates changes, and flushes them to the database in a single transaction. Declarative models (inheriting from `DeclarativeBase` or `Base`) map classes to tables and attributes to columns.

The critical design decision for agent infrastructure: Core queries execute immediately and return `Row` objects (cheap, no object graph). ORM queries load mapped objects with lazy-loaded relationships (convenient, but N+1 query risk is real). High-throughput paths — bulk inserts of conversation turns, embedding upserts — should use Core or `session.bulk_insert_mappings()`, not ORM `session.add()` loops.

### Session and Transaction Model

The `Session` object is the ORM's primary interface. It is **not thread-safe** and should be scoped per-request or per-task. The standard pattern in agent backends uses `sessionmaker` to create a factory, then a context manager:

```python
Session = sessionmaker(bind=engine)
with Session() as session:
    session.add(obj)
    session.commit()
```

For async agent code (FastAPI, async LLM pipelines), `AsyncSession` from `sqlalchemy.ext.asyncio` provides the same interface over an async engine (`create_async_engine`). The Acontext Core service uses `AsyncSession` throughout its Python/FastAPI backend.

### Event System

SQLAlchemy's event system (`@event.listens_for`) hooks into the query execution lifecycle. The Dash multi-agent system exploits this directly for schema isolation:

> "A SQLAlchemy event listener intercepts every SQL statement before execution and blocks anything targeting the `public` schema."

This pattern — using `before_execute` events to inspect and reject SQL — is a legitimate security boundary. It does not rely on prompt instructions or model behavior. The database rejects writes to protected schemas before they reach the wire.

### Alembic Integration

SQLAlchemy pairs with Alembic for schema migrations. Alembic reads `MetaData` from your models, diffs against the current database state, and generates versioned migration scripts. Cognee uses SQLAlchemy + Alembic for its relational store migrations. This matters for agent systems with evolving memory schemas — adding a column to a conversation table or a new index on embeddings requires Alembic, not ad hoc `ALTER TABLE`.

### pgvector and Hybrid Storage

`pgvector` (the PostgreSQL vector extension) integrates with SQLAlchemy via `pgvector-python`, which adds a `Vector` column type. This lets agent systems store embeddings in the same PostgreSQL database as their relational data, queried via `<->` (L2 distance) or `<=>` (cosine distance) operators in SQLAlchemy Core expressions. Acontext's Core service uses pgvector alongside SQLAlchemy for embedding storage.

The Memento-Skills framework stores skill metadata in SQLite via SQLAlchemy, using `sqlite-vec` for vector search in the same database file.

## Key Numbers

- **GitHub stars**: ~10,000+ on the main repo (independently verifiable, widely cited)
- **PyPI downloads**: Consistently in the top 10 Python packages by monthly download volume — 50M+ downloads/month as of 2024 (independently tracked via pypistats.org)
- **Version**: 2.x (released 2023) introduced `DeclarativeBase`, improved type annotation support, and the 2.0-style `select()` API as default; 1.4 is still in wide use

Performance benchmarks against raw psycopg2/asyncpg exist but vary by workload. SQLAlchemy Core adds ~5-15% overhead versus raw DBAPI calls for simple queries; ORM adds more depending on relationship loading. These are rough community numbers, not formally published benchmarks.

## Strengths

**Database portability without rewriting queries.** Agent infrastructure that starts on SQLite (zero-config development) and migrates to PostgreSQL (production) changes one `create_engine()` call. The Cognee architecture explicitly uses this — SQLite default, PostgreSQL for production, same ORM models.

**Event system for policy enforcement.** The `before_execute`, `after_execute`, `before_cursor_execute` hooks let you enforce security boundaries, log queries, inject tenant filters, or abort statements without modifying application code. This is the mechanism Dash uses to make schema isolation a hard constraint rather than a convention.

**Mature async support.** `AsyncSession` and `create_async_engine` work cleanly with `asyncio.gather()` patterns common in LLM pipelines. Agent systems running concurrent LLM calls (Cognee's `asyncio.gather(*[extract_content_graph(...) for chunk in chunks])`) need async-safe database sessions.

**Alembic migration tooling.** Schema evolution is a real operational burden for agent systems — memory schemas change as features are added. Alembic's autogenerate (`alembic revision --autogenerate`) handles most routine migrations correctly.

**Ecosystem compatibility.** Every major Python web framework (FastAPI, Flask, Django via SQLAlchemy adapter), every agent framework that needs SQL (LangChain, LlamaIndex, custom), and every cloud PostgreSQL provider (RDS, Cloud SQL, Neon, Supabase) supports SQLAlchemy.

## Critical Limitations

**Concrete failure mode — N+1 queries from lazy loading.** The ORM's default lazy loading causes one query per related object when iterating a result set. An agent session loading 100 conversation turns, each with associated tags, fires 101 queries by default. In production, this shows up as slow session hydration and database connection pool exhaustion under concurrent load. The fix is explicit `selectinload()` or `joinedload()` options — but they are opt-in and require knowing which relationships will be traversed. Agent developers new to SQLAlchemy routinely miss this until they hit production load.

**Unspoken infrastructure assumption — connection pool sizing.** SQLAlchemy defaults to a pool of 5 connections (`pool_size=5`) plus 10 overflow connections. Agent systems with many concurrent async tasks can exhaust this silently — tasks queue waiting for a connection rather than failing immediately. The correct setting depends on the number of concurrent agent workers, which is often unknown at development time. Systems using `asyncio.gather()` with unbounded parallelism need `NullPool` or explicit pool size tuning.

## When NOT to Use It

**Pure vector workloads.** If your agent's primary storage need is vector similarity search — embedding lookup, nearest-neighbor retrieval — use a purpose-built [vector database](../concepts/vector-database.md) ([ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [Pinecone](../projects/pinatone.md), [FAISS](../projects/faiss.md)). SQLAlchemy with pgvector works for hybrid workloads (relational + vector), not for systems where vector search is the only operation.

**Graph-first memory systems.** Systems where the core data model is a property graph — entities, relationships, traversals — belong in a graph database ([Neo4j](../projects/neo4j.md)) with a dedicated driver. SQLAlchemy can model graph-like structures in relational tables, but self-referential joins and recursive CTEs for graph traversal are slower and more complex than native graph queries.

**Prototyping without schema discipline.** If your schema will change every day and you do not want to write migrations, a document store ([Redis](../projects/redis.md) JSON, MongoDB) or even flat JSON files will move faster. SQLAlchemy's value is highest when you have a schema worth maintaining.

**Systems where every millisecond matters.** High-frequency operations (token-level streaming state, real-time latency tracking) may need raw psycopg2/asyncpg or a faster in-memory store. SQLAlchemy Core is fast, but it is not zero-overhead.

## Unresolved Questions

**ORM sync state in multi-process deployments.** When multiple worker processes share a PostgreSQL database (common in production agent deployments), SQLAlchemy's session-level identity map does not synchronize across processes. One worker's cached object state can be stale relative to another worker's writes. The standard answer is "expire objects on commit" (`expire_on_commit=True`, the default), but this means every attribute access after a commit fires a fresh SELECT. Agent systems with frequent cross-process writes face this tradeoff without a clean resolution.

**Alembic autogenerate reliability for complex schemas.** Alembic's `--autogenerate` misses certain schema constructs: partial indexes, check constraints defined at the database level (not in the model), some PostgreSQL-specific types. Agent systems using pgvector column types or custom PostgreSQL extensions need manual migration review. The documentation does not fully enumerate what autogenerate will miss.

**Cost at scale for audit logging.** Several agent frameworks use SQLAlchemy to persist full conversation histories, tool call transcripts, and session traces. At production volume (millions of sessions), the relational store becomes a significant storage and query cost. There is no built-in archival, partitioning, or TTL mechanism — these must be implemented via Alembic migrations and application logic.

## Alternatives

| Need | Use instead |
|------|-------------|
| Lightweight Python ORM, fewer abstractions | [Peewee](https://docs.peewee-orm.com/) or raw psycopg2/asyncpg |
| Vector-first storage | [ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [FAISS](../projects/faiss.md) |
| Graph-first storage | [Neo4j](../projects/neo4j.md) with py2neo or official driver |
| Key-value / session cache | [Redis](../projects/redis.md) |
| Schema-flexible document storage | MongoDB with Motor (async) |
| Structured data validation only | [Pydantic](../projects/pydantic.md) (not a database layer, but often confused with one) |

Use SQLAlchemy when you need relational structure, schema migrations, and database portability in a Python agent backend. Use raw DBAPI drivers when the ORM abstraction costs more than it saves. Use dedicated stores when your primary access pattern is something a relational database handles poorly (vectors, graphs, time series).

## Relationship to Agent Infrastructure Concepts

SQLAlchemy stores the relational metadata layer for several memory types:

- **[Episodic Memory](../concepts/episodic-memory.md)**: Conversation turns, session records, timestamps, user IDs
- **[Procedural Memory](../concepts/procedural-memory.md)**: Task records, skill metadata, workflow state
- **[Long-Term Memory](../concepts/long-term-memory.md)**: Persistent fact tables, entity registries, correction logs

It does not implement retrieval logic — that lives in application code, vector stores, or graph databases. SQLAlchemy's role is persistence and schema management, not cognition. Agent frameworks use it as infrastructure the same way they use S3 for file storage: present everywhere, the subject of architecture decisions only when something goes wrong.


## Related

- [OpenAI](../projects/openai.md) — implements (0.3)
- [Anthropic](../projects/anthropic.md) — implements (0.3)
- [Vector Database](../concepts/vector-database.md) — implements (0.4)

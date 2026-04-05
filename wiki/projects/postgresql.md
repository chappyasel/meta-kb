---
entity_id: postgresql
type: project
bucket: knowledge-bases
sources:
  - repos/natebjones-projects-ob1.md
  - repos/supermemoryai-supermemory.md
  - repos/caviraoss-openmemory.md
  - repos/nemori-ai-nemori.md
  - repos/affaan-m-everything-claude-code.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
related: []
last_compiled: '2026-04-05T05:25:04.081Z'
---
# PostgreSQL

## What It Is

PostgreSQL is an open-source relational database with 35+ years of active development. In the AI/knowledge-base context, it functions as a persistent state store for conversations, documents, agent memory, and structured metadata. The extension ecosystem, particularly `pgvector`, made it a common substrate for systems that need both relational queries and semantic search without running a separate vector database.

Projects like [Nemori](../../raw/repos/nemori-ai-nemori.md) use PostgreSQL for metadata, text search via `tsvector`/GIN indexes, and message buffering alongside Qdrant for vectors. [Open Brain (OB1)](../../raw/repos/natebjones-projects-ob1.md) uses Supabase (PostgreSQL-hosted) as its sole storage layer for thoughts, with pgvector handling embeddings. [Supermemory](../../raw/repos/supermemoryai-supermemory.md) lists `postgres` as a dependency alongside Cloudflare Workers, suggesting a PostgreSQL-backed persistence tier.

## Architecture: What Makes It Unusual for This Use Case

PostgreSQL's relevance to LLM systems comes from three mechanisms working together:

**`pgvector` extension**: Adds vector column types (`vector(1536)` for OpenAI embeddings) and operators for cosine similarity (`<=>`) and L2 distance (`<->`). Supports IVFFlat and HNSW indexing. HNSW (Hierarchical Navigable Small World) gives approximate nearest-neighbor search at query time, trading index build cost for faster retrieval. The index lives inside PostgreSQL's buffer pool, so it competes for memory with regular table data.

**Full-text search**: Native `tsvector` columns with GIN indexes support keyword search without Elasticsearch. Nemori's `docker/init-extensions.sql` sets up these indexes explicitly. For hybrid retrieval (BM25 + vector), you can combine a `ts_rank` score with a cosine similarity score in a single SQL query, returning ranked results across both signals in one round trip.

**ACID transactions across memory types**: Agent state updates, conversation writes, and index updates happen atomically. This matters when you need "store this message AND update the user's memory summary" as a single operation that either fully commits or rolls back.

**Row Level Security (RLS)**: PostgreSQL's RLS policies attach access control to the data itself rather than the application layer. OB1's primitives documentation calls this out as a prerequisite for multi-user memory isolation (Extensions 4, 5, 6). A policy like `USING (user_id = auth.uid())` enforces per-user data boundaries at the database level, regardless of which application code runs queries.

## Key Numbers

- **Active since**: 1996 (Berkeley POSTGRES lineage dates to 1986)
- **pgvector max dimensions**: 16,000 (practical limit for HNSW indexing is lower; 2,000 is the HNSW ceiling per the pgvector docs)
- **Supabase free tier**: 500MB database, 50MB vector storage — relevant since OB1 and other projects default to Supabase as the PostgreSQL host
- **IVFFlat vs HNSW**: IVFFlat requires a training pass over existing data (doesn't index new vectors until rebuild); HNSW indexes incrementally but uses more memory

These numbers come from upstream PostgreSQL and pgvector documentation, not self-reported benchmarks.

## Strengths

**Single-system simplicity**: For projects at moderate scale (under ~1M vectors, under ~10k queries per day), PostgreSQL with pgvector eliminates the operational complexity of running a separate vector database. OB1's Kubernetes integration recipe even replaces Supabase with self-hosted PostgreSQL + pgvector directly, keeping the entire stack in one system.

**SQL composability**: You can filter semantically similar memories by metadata (`WHERE user_id = $1 AND created_at > $2`) before or after the vector comparison. Dedicated vector databases handle this poorly or require proprietary filter syntax.

**Ecosystem maturity**: `asyncpg` (used by Nemori), `drizzle-orm` (used by Supermemory), Supabase client libraries — mature async drivers exist for every language. Migration tooling, backup infrastructure, monitoring, and hosting options are solved problems.

**RLS for multi-tenant memory**: Attaching access policies to tables means application bugs that skip authorization checks don't automatically leak cross-user memory. This is harder to implement correctly in application code.

## Critical Limitations

**Concrete failure mode — HNSW memory pressure at scale**: HNSW indexes load into shared memory buffers. A 1M-vector index at 1536 dimensions (float32) occupies roughly 6GB before PostgreSQL overhead. On a shared Supabase instance or a small self-hosted machine, this competes directly with the working set for relational queries. The result: vector searches stay fast while everything else slows down as PostgreSQL thrashes the buffer pool. Teams hit this at surprisingly low vector counts because they don't provision for index memory separately from table memory.

**Unspoken infrastructure assumption**: Every project using PostgreSQL as a memory store assumes synchronous write durability is acceptable at ingestion time. `asyncpg` and similar drivers await each write; there's no built-in write buffering or async ingestion queue unless you add one. When agents generate high-frequency memory writes (every turn in a conversation), PostgreSQL becomes a synchronous bottleneck in the agent loop unless you explicitly batch writes or use a queue.

## When NOT to Use PostgreSQL

**Multi-billion-vector workloads**: At that scale, purpose-built vector databases (Qdrant, Weaviate, Pinecone) offer better ANN performance, quantization, and sharding. PostgreSQL's pgvector does not shard automatically.

**Write-heavy streaming memory**: If your agent writes memory on every token or every turn without batching, the synchronous commit overhead accumulates. Nemori explicitly buffers messages before flushing to PostgreSQL; systems that skip this pattern hit latency problems.

**Teams without PostgreSQL operational knowledge**: PostgreSQL requires tuning (`shared_buffers`, `work_mem`, `effective_cache_size`, `maintenance_work_mem` for HNSW builds). The defaults are conservative and will underperform on memory-intensive workloads. Supabase abstracts some of this, but not for workloads that exceed the managed tier.

## Unresolved Questions

**Cost at scale on managed tiers**: Supabase pricing scales with compute and storage, but the pgvector memory requirements mean teams often need compute tiers higher than their row count suggests. The documentation for these projects doesn't model cost as vector counts grow.

**Index rebuild governance**: IVFFlat requires `VACUUM` and index rebuilds when data distribution changes significantly. For continuously updated memory systems, no project in this corpus documents when or how to trigger rebuilds. HNSW avoids this but shifts cost to insert time.

**Conflict resolution for multi-agent writes**: When multiple agents write to the same user's memory simultaneously (a real scenario in multi-agent systems), PostgreSQL serialization prevents corruption but doesn't resolve semantic conflicts. Which fact wins if two agents write contradictory beliefs about a user? The database enforces transactional integrity but the application must handle the semantic merge problem.

## Alternatives

**Qdrant**: Purpose-built vector search with gRPC API, payload filtering, and quantization. Nemori uses Qdrant for vectors and PostgreSQL for metadata. Use Qdrant when vector search latency is the primary constraint and you're willing to run two systems.

**SQLite + sqlite-vss**: For single-user, local deployments. Lighter operational overhead than PostgreSQL, but no RLS, no concurrent writes, and limited to local access. OB1's self-hosted Kubernetes path suggests PostgreSQL is the floor for multi-user deployments.

**Weaviate / Pinecone**: Managed vector databases with built-in chunking and hybrid search APIs. Use these when you want to outsource the embedding pipeline and don't need full SQL over the stored data.

**DuckDB**: For analytical queries over stored memories (batch evaluation, benchmark runs). Not appropriate for transactional agent state.

For most agent memory systems at startup scale: PostgreSQL with pgvector is the right default. The operational complexity is manageable, the SQL interface handles both structured metadata and vector similarity, and mature hosting options (Supabase, Neon, self-hosted) cover most deployment patterns. Switch to a dedicated vector database when you've measured that pgvector is the bottleneck, not before.

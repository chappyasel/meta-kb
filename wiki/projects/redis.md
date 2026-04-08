---
entity_id: redis
type: project
bucket: agent-architecture
abstract: >-
  Redis is an in-memory data store providing sub-millisecond key-value
  operations, pub/sub messaging, and atomic data structures — distinguishing
  itself from general-purpose databases by keeping all data in RAM with optional
  disk persistence.
sources:
  - deep/repos/infiniflow-ragflow.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/memodb-io-acontext.md
related:
  - openai
  - anthropic
  - postgresql
last_compiled: '2026-04-08T23:26:23.779Z'
---
# Redis

## What It Is

Redis (Remote Dictionary Server) is an open-source, in-memory data structure store that functions as a database, cache, message broker, and streaming engine. In agent systems specifically, it shows up in three recurring roles: fast key-value caching (storing LLM responses, session state, user preferences), pub/sub and stream-based messaging between agent components, and distributed coordination primitives (locks, queues, rate limiting).

Both [Anthropic](../projects/anthropic.md) and [OpenAI](../projects/openai.md) use Redis in their infrastructure stacks. Systems like [Mem0](../projects/mem0.md), RAGFlow, and Acontext use Redis for distributed locks, queuing distilled contexts between services, and caching embedding calls.

Redis is not a vector database and is not designed for semantic search. It is infrastructure — the connective tissue between components that need to share state faster than a relational database allows.

## Core Mechanism

### Data Structures

Redis exposes typed data structures, not just raw key-value pairs. Each type has atomic operations:

- **Strings**: Byte arrays up to 512MB. Support `INCR`/`DECR` for atomic counters, `SETNX` for conditional set (the basis of distributed locks), and `SET key value EX seconds` for TTL-based expiry.
- **Hashes**: Field-value maps within a key. Efficient for storing structured objects (session data, user state) without serializing to JSON.
- **Lists**: Ordered sequences with `LPUSH`/`RPUSH`/`LPOP`/`RPOP`. Powers simple task queues. `BRPOP` blocks until an item appears — no polling needed.
- **Sets / Sorted Sets**: Unordered unique members (Sets) or members with float scores (Sorted Sets). Sorted Sets enable priority queues and leaderboards via `ZADD`/`ZRANGE`.
- **Streams**: Append-only log structures (`XADD`/`XREAD`/`XREADGROUP`) with consumer group semantics. RAGFlow uses Redis Streams to distribute parse tasks to async worker processes.
- **Pub/Sub**: Fire-and-forget broadcast channels. Publishers push messages; all current subscribers receive them. No persistence — messages sent when no subscriber is listening are lost.

### Persistence

Redis operates primarily in memory and offers two persistence options:

- **RDB (Redis Database)**: Periodic snapshots to disk. Fast restarts, but data between snapshots is lost on crash.
- **AOF (Append-Only File)**: Logs every write operation. Slower but more durable. `appendfsync everysec` is the common tradeoff — at most one second of data loss.
- **No persistence**: Pure cache mode. Fastest; data survives only while the process runs.

### Distributed Locking

`SETNX key value` (or `SET key value NX EX seconds`) sets a key only if it does not exist. This is the atomic primitive behind distributed locks. Acontext's `renew_redis_lock` function uses this pattern to ensure only one Skill Learner Agent runs per learning space at a time, preventing concurrent writes to the same skill files.

The standard pattern (Redlock) for high-stakes distributed locking acquires the lock on a majority of Redis nodes to tolerate single-node failure. For many agent use cases — preventing two workers from processing the same task — a single-node lock with an expiry TTL is sufficient.

### Pub/Sub vs. Streams vs. Lists for Queuing

Three Redis primitives can serve as message queues, with different guarantees:

| Mechanism | Persistence | Consumer Groups | Replay | At-Least-Once |
|-----------|-------------|-----------------|--------|---------------|
| Pub/Sub | No | No | No | No |
| Lists (BRPOP) | Yes (RDB/AOF) | No | No | Partial |
| Streams (XREADGROUP) | Yes (RDB/AOF) | Yes | Yes | Yes |

Agent systems that need reliable task dispatch — where losing a message means losing work — should use Streams or hand the queue to a dedicated broker (RabbitMQ, Kafka). RAGFlow's parse task distribution uses Redis Streams specifically for this reason. Acontext uses both Redis (for the Skill Learner queue) and RabbitMQ (for API-to-Core task dispatch), suggesting the team found Redis Streams insufficient for cross-service reliability.

## Key Numbers

- **GitHub Stars**: ~68,000 (verified, as of mid-2025)
- **Latency**: Sub-millisecond for in-memory operations on local network; 1-5ms typical for networked deployments
- **Throughput**: Single-threaded core processes ~100,000 operations/second; Redis 6+ added I/O threading for higher throughput on modern hardware
- **Memory overhead**: ~50-70 bytes per key overhead beyond the value itself
- **Max key/value size**: 512MB per string value; practical limits are much lower for performance

Latency and throughput figures are from Redis's own benchmarks (`redis-benchmark` tool). Independent benchmarks (e.g., the DB-Engines rankings, Percona testing) broadly confirm the order-of-magnitude claims, though production numbers depend heavily on network topology, value sizes, and connection pooling.

## Strengths

**Sub-millisecond reads and writes** at scale. For agent systems where context retrieval latency matters — loading user preferences before generating a response, for instance — Redis avoids the overhead of a database query.

**Atomic operations** across complex data structures. A sorted set priority queue, an atomic counter for rate limiting, and a distributed lock all work correctly under concurrent access without application-level locking.

**TTL-based expiry** built into every key. Session state, LLM response caches, and rate limit windows all naturally expire without a background cleanup job.

**Broad ecosystem compatibility**. Every major language has a battle-tested Redis client. [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), and most agent frameworks include Redis adapters for caching, checkpointing, and message passing.

**Operational simplicity at small scale**. A single Redis instance requires almost no configuration. It starts in seconds and works.

## Critical Limitations

**Concrete failure mode — memory exhaustion under unbounded growth**: Redis holds its entire dataset in RAM. Agent systems that accumulate session state, conversation histories, or cached embeddings without explicit TTLs or eviction policies will fill available memory. When `maxmemory` is hit, Redis either rejects writes (`noeviction`) or silently deletes keys (`allkeys-lru`, `volatile-lru`, etc.) depending on the eviction policy. If the eviction policy is not set deliberately, agents will encounter either write errors or unexplained cache misses. Systems like Acontext's unbounded skill accumulation pattern (noted in its own failure modes) apply equally to any Redis-backed queue — without clearing processed items, memory climbs.

**Unspoken infrastructure assumption — single-threaded command processing**: Redis processes commands on a single thread (with I/O threading added in v6 for network handling, not command execution). Under high concurrency with expensive operations (large `LRANGE`, blocking `BRPOP` under load, `KEYS *` scans), the single event loop becomes a bottleneck. Agent architectures that route all inter-component communication through one Redis instance and then scale to dozens of concurrent agents may find a single Redis node is the bottleneck — not the LLM API, not the vector database.

## When NOT to Use It

**Persistent relational data**: Agent systems that store conversation metadata, user profiles, or audit logs requiring complex queries belong in [PostgreSQL](../projects/postgresql.md) or [SQLite](../projects/sqlite.md). Redis has no JOIN operations and no query planner. Using it as a primary persistent store creates operational risk: a misconfigured persistence setting can lose data.

**Vector similarity search as the primary use case**: Redis does offer a vector index module (RediSearch + RedisVL), but it is not the right tool when semantic search is the primary workload. [ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [FAISS](../projects/faiss.md), or [Pinecone](../projects/pinatone.md) are purpose-built for this. The Redis vector module was added to an existing architecture; the others were designed around it.

**High-durability financial or audit data**: Even with AOF persistence at `everysec`, Redis can lose up to one second of writes. For agent systems where every tool call, payment event, or compliance-relevant action must be reliably recorded, use a durable store first and Redis as a cache on top.

**Budget-constrained deployments where RAM is the bottleneck**: If the agent's working set (cached responses, session state, queued tasks) exceeds available RAM, Redis either requires expensive infrastructure scaling or starts evicting data. [SQLite](../projects/sqlite.md) or [PostgreSQL](../projects/postgresql.md) can serve many of the same caching patterns from disk without the memory constraint.

## Unresolved Questions

**Cluster consistency semantics in practice**: Redis Cluster uses asynchronous replication. During a network partition, writes acknowledged by a primary may not have propagated to replicas before a failover. For distributed lock use cases (preventing duplicate agent task execution), this means Redlock's majority-quorum protocol is necessary — but most agent frameworks using Redis for locks use single-instance patterns without documenting this assumption.

**Cost at scale for hosted Redis**: Managed Redis services (Elasticache, Upstash, Redis Cloud) bill on memory, not operations. A system caching large embedding vectors or conversation histories can accumulate significant memory costs that are non-obvious during development. Upstash's per-request pricing solves part of this but introduces latency variability.

**Governance for shared Redis instances**: In multi-tenant agent deployments, key namespacing (prefixing keys with `user_id:` or `tenant_id:`) is convention, not enforcement. Redis has no native schema or access control at the key prefix level (ACLs exist but are coarse-grained). One agent process with a bug can overwrite another tenant's state.

**Pub/Sub reliability for agent coordination**: Pub/Sub message delivery to offline subscribers is simply dropped. Agent systems using Pub/Sub for event-driven coordination (agent B starts when agent A publishes a completion event) have a silent failure mode: if B is restarting when A publishes, the event is lost. Streams with consumer groups solve this, but documentation for agent frameworks rarely specifies which mechanism underlies their "event bus" abstractions.

## Alternatives

**[PostgreSQL](../projects/postgresql.md)** — Use when data persistence and relational queries matter more than latency. PostgreSQL with `pgvector` can serve as a combined relational store and vector index, reducing infrastructure components. Acontext uses both: PostgreSQL for persistent metadata and Redis for ephemeral distributed locks and queuing.

**[SQLite](../projects/sqlite.md)** — Use for single-process agents or local development where a networked cache is unnecessary overhead. Zero deployment cost; reads from SSD are fast enough for most non-latency-critical caching.

**RabbitMQ** — Use when reliable message delivery with routing, dead-letter queues, and consumer acknowledgment semantics are required. RAGFlow uses both Redis Streams (internal worker dispatch) and RabbitMQ (cross-service API-to-Core), suggesting RabbitMQ for higher-stakes inter-service messaging.

**Kafka / Redpanda** — Use when event log replay, high-throughput stream processing, or durable audit trails of agent actions are needed. Heavier to operate than Redis but provides replay semantics that Redis Streams can approximate only with explicit consumer group management.

**In-process caches (functools.lru_cache, cachetools)** — Use for single-process agents with no distributed coordination needs. Zero infrastructure, zero latency overhead, works until you need to share state across processes.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — Redis stores working memory (session state, short-term context) but not the long-term semantic memory layers
- [Short-Term Memory](../concepts/short-term-memory.md) — Redis is the common implementation substrate for session-scoped agent state
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — Distributed locks and queues in Redis coordinate concurrent agents without a central orchestrator
- [Context Management](../concepts/context-management.md) — Caching retrieved context chunks in Redis reduces repeated retrieval latency

---
entity_id: neo4j
type: project
bucket: knowledge-bases
sources:
  - repos/getzep-graphiti.md
  - repos/topoteretes-cognee.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related: []
last_compiled: '2026-04-05T05:27:36.795Z'
---
# Neo4j

## What It Is

Neo4j is a native graph database built on a property graph model: nodes carry labels and key-value properties, edges are typed, directed, and also carry properties. The query language is Cypher, a declarative pattern-matching syntax where you write the shape of relationships you want to find rather than composing joins.

In the LLM and agent context, Neo4j serves as the persistence and traversal layer for knowledge graphs, agent memory stores, and retrieval pipelines. Systems like Graphiti use it as the default backend for temporal context graphs. Cognee lists it among supported graph backends. HippoRAG notes it as appropriate for production but uses Pickle-serialized igraph locally to avoid external dependencies.

## Key Numbers

Neo4j claims billions of nodes in production deployments (self-reported). The managed cloud offering is Neo4j Aura. The open-source Community Edition exists but lacks multi-database support and some enterprise clustering features. Graphiti specifies Neo4j 5.26 as the minimum version for its integration, which uses vector index support added in the 5.x series. No independent benchmark for knowledge graph RAG workloads appears in the source material.

## Core Mechanism

**Storage layer**: Neo4j stores nodes and relationships in separate fixed-size record stores. Relationships are doubly linked from each end node, so traversing relationships from a node is O(degree) rather than O(log N) as in relational indexes. This "index-free adjacency" is the architectural reason graph traversal is fast for connected queries.

**Cypher**: Pattern matching like `(a:Person)-[:KNOWS]->(b:Person)` compiles to a query plan. The planner decides whether to start from an index on `a` or `b`, expand edges, or scan. Performance depends heavily on labeling and index coverage.

**Vector indexes**: Neo4j 5.x added native vector index support, enabling hybrid queries that combine semantic similarity search with graph traversal in the same Cypher query. This is the feature that makes it practical as a RAG backend: you can retrieve nodes by embedding similarity and immediately traverse their relationships to gather context.

**Bolt protocol**: Client connections use a binary protocol (Bolt) over port 7687. The official Python driver (`neo4j` package) handles connection pooling and transaction management. Graphiti's `Neo4jDriver` wraps this driver and passes it to the `Graphiti` constructor via the `graph_driver` parameter.

**ACID transactions**: Neo4j is transactional with write-ahead logging. For knowledge graph ingestion pipelines that extract and insert entities concurrently, this means concurrent writes to shared entity nodes require either locking or merge semantics (`MERGE` in Cypher, which creates a node only if it doesn't exist).

## Strengths

**Multi-hop traversal at query time**: When an agent needs to follow chains of relationships (e.g., "what documents mention entities related to this concept through two or more hops"), Neo4j handles this without joins. Graphiti's hybrid retrieval combines Personalized PageRank-style traversal with semantic search; Neo4j is the backend that makes in-database traversal possible rather than loading the full graph into memory for graph algorithms.

**Schema flexibility with optional constraints**: Labels and relationship types are optional schemas. You can add new node types mid-deployment without migrations. When you do want constraints (unique entity IDs, property existence), you declare them explicitly.

**Ecosystem and tooling**: Neo4j Desktop, Browser (web UI), Bloom (visual exploration), and AuraDB (managed) are mature. For debugging knowledge graph construction during development, the visual query interface saves significant time compared to inspecting raw records.

**Temporal and provenance patterns**: The property graph model maps cleanly to how temporal context graphs are modeled in systems like Graphiti: validity windows become edge properties (`valid_from`, `valid_until`), episodes become source nodes linked to derived facts. You express this in Cypher rather than needing a specialized time-series database.

## Critical Limitations

**Concrete failure mode — concurrent MERGE contention**: When multiple threads ingest entities simultaneously and use `MERGE` to avoid duplicates, Neo4j serializes those merges under lock. Graphiti's ingestion pipeline runs high concurrency by default (controlled by `SEMAPHORE_LIMIT`, default 10). If entity names collide across concurrent ingestion threads, merges queue up. At scale, this produces deadlock-style timeouts that surface as ingestion failures, not as obvious contention errors. The workaround is to reduce `SEMAPHORE_LIMIT` or batch entity deduplication before writing.

**Infrastructure assumption — persistent TCP connectivity to port 7687**: Neo4j requires a stable Bolt connection. Serverless and short-lived compute environments (AWS Lambda, Modal functions with cold starts) that disconnect between invocations pay reconnection overhead and cannot hold open connection pools across invocations. Graphiti's Docker Compose setup assumes Neo4j is a long-running sidecar. Deploying in genuinely serverless architectures requires an external connection broker or a different backend.

## When NOT to Use It

**Simple document retrieval without relationship traversal**: If your RAG pipeline retrieves document chunks by embedding similarity and has no need to traverse entity relationships, Neo4j adds operational overhead (running a separate service, managing Bolt connections, writing Cypher) with no retrieval benefit over a pure vector store.

**Ephemeral or prototype workloads**: For rapid experimentation where persistence across sessions isn't required, in-process alternatives like igraph (used by HippoRAG) or embedded DuckDB with vector extensions remove the external-service dependency entirely.

**High-frequency, low-latency write workloads**: Ingestion pipelines that write thousands of entities per second with complex merge semantics will hit locking limits. If your knowledge graph updates at stream-processing rates, a purpose-built streaming graph system fits better than Neo4j's transactional model.

**Teams without graph database expertise**: Cypher query optimization is non-obvious. Slow queries on connected graphs often indicate missing indexes or query plan choices that require database-level inspection. If no one on the team can read a query plan, troubleshooting production latency problems becomes expensive.

## Unresolved Questions

**Cost at scale on AuraDB**: Neo4j Aura pricing is instance-based with memory limits. For large knowledge graphs with millions of nodes and vector indexes, the memory ceiling on lower-tier instances is unclear from public documentation. Projects that start on Aura Free and hit limits face a migration path that isn't documented in the tools that use Neo4j as a backend (Graphiti, Cognee).

**Governance for shared knowledge graphs**: Graphiti documents per-user and per-entity graph isolation as a Zep-managed-service feature, not a Graphiti/Neo4j feature. The open-source Neo4j Community Edition supports a single database per instance; multi-database requires Enterprise. Multi-tenant knowledge graph deployments with row-level isolation require application-level namespace prefixing of node IDs and labels, which no major open-source integration documents explicitly.

**Conflict resolution during concurrent graph construction**: When two ingestion processes extract overlapping entities with different properties, Neo4j's `MERGE` creates the node once but leaves property conflicts unresolved unless the Cypher query explicitly handles precedence. Graphiti documents temporal fact invalidation (old facts get `valid_until` timestamps) but this logic lives in application code, not Neo4j constraints.

## Alternatives and Selection Guidance

**FalkorDB**: Redis-compatible protocol, lower memory overhead, Docker-simple setup. Graphiti supports it with `pip install graphiti-core[falkordb]`. Use FalkorDB when you want the graph model without the operational weight of a full Neo4j instance, especially in containerized or resource-constrained environments.

**Kuzu**: Embedded graph database, no server process. Use Kuzu for single-process workloads where external service dependencies are unacceptable (research experiments, CLI tools, local agent memory). Graphiti supports it via `KuzuDriver`.

**Amazon Neptune**: Managed, scales without operator intervention, integrates with AWS IAM and OpenSearch for full-text. Use Neptune when your infrastructure is AWS-native and you need managed scaling without running Neo4j yourself. Graphiti supports it with an OpenSearch Serverless collection for full-text search.

**igraph (in-memory)**: Used directly by HippoRAG. No persistence, no query language, no external service. Use it when your graph fits in RAM, you need algorithmic graph operations (PPR, community detection) rather than query-based retrieval, and you're willing to manage serialization yourself via Pickle or similar.

**Pure vector store (Pinecone, Weaviate, pgvector)**: Use when your retrieval is purely semantic similarity with no relationship traversal. Adding Neo4j to a pipeline that never queries relationships is complexity with no payoff.

---

*Sources: [Graphiti README](../../raw/repos/getzep-graphiti.md), [Cognee README](../../raw/repos/topoteretes-cognee.md), [HippoRAG deep analysis](../../raw/repos/osu-nlp-group-hipporag.md)*

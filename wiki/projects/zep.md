---
entity_id: zep
type: project
bucket: agent-memory
sources:
  - repos/getzep-graphiti.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - Graphiti
  - Knowledge Graphs
  - Agent Memory
last_compiled: '2026-04-04T21:18:23.550Z'
---
# Zep

## What It Is

Zep is a memory layer service for AI agents and assistants that provides persistent, searchable conversation history and user context. Its core technical contribution is **Graphiti**, a temporal knowledge graph engine that ingests conversational data and business data, models entities and relationships with explicit time-validity windows, and serves that memory back to agents at query time.

Rather than treating memory as a flat vector store of past messages, Zep builds a dynamic graph where facts can be updated, contradicted, and versioned—preserving the history of what was true when.

[Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

---

## What's Unique

Most [Agent Memory](../concepts/agent-memory.md) implementations are RAG over conversation logs: embed chunks, retrieve by cosine similarity, inject into context. This works for static documents but breaks down when:

- Facts change over time ("User's preferred model was GPT-4, now Claude")
- Context needs to span many sessions
- Business data (CRMs, support tickets) must integrate with conversation history

Zep's Graphiti engine addresses this by:

1. **Temporal entity tracking** — every fact node has validity windows, so "what did we know about this user on date X" is answerable
2. **Episode provenance** — each fact traces back to source conversations or documents
3. **Multi-source ingestion** — conversations *and* structured business data feed the same graph
4. **Dynamic updates** — new information can contradict old facts without destroying history

[Source](../../raw/repos/getzep-graphiti.md)

---

## Key Numbers

| Metric | Value |
|--------|-------|
| Graphiti GitHub Stars | 24,473 |
| Graphiti Forks | 2,433 |
| DMR Benchmark | Outperforms MemGPT (per Zep paper) |
| Paper published | January 2025 |

The DMR (Deep Memory Retrieval) benchmark claim should be taken with some caution—it is self-reported in Zep's own paper.

---

## Architecture Summary

```
Ingestion
  Conversations / Business Data
        ↓
  Graphiti Engine
  ├── Entity extraction (LLM)
  ├── Relationship modeling
  ├── Temporal validity assignment
  └── Contradiction/update resolution
        ↓
  Graph Store (Neo4j or compatible)
        ↓
Retrieval
  Hybrid search (semantic + graph traversal)
        ↓
  Context assembly for agent prompt
```

The Graphiti component is open-sourced under Apache-2.0. The broader Zep service wraps this with APIs, user/session management, and enterprise features.

---

## Strengths

- Handles **fact evolution over time** — a genuine gap in standard vector-only memory
- **Multi-source** — not limited to chat history; can ingest business context
- Graphiti is independently usable as a library (24k+ stars suggests real adoption)
- Solves **cross-session context inheritance**, which flat RAG handles poorly

---

## Limitations

- **LLM-dependent ingestion** — entity extraction and relationship modeling require LLM calls per ingested episode, adding latency and cost
- **Graph complexity** — temporal KGs are harder to debug and maintain than vector stores
- **Benchmark self-reporting** — performance claims come from the authors' own paper; independent replication is limited
- **Operational overhead** — requires a graph database (Neo4j) in addition to whatever vector store is used
- **Overkill for simple use cases** — if you just need "remember this conversation," the complexity is not justified

---

## Alternatives

| System | Approach | Notable Difference |
|--------|----------|--------------------|
| [Graphiti](../projects/graphiti.md) | Temporal KG (same codebase) | Graphiti *is* Zep's core engine, open-sourced separately |
| MemGPT / MemoryOS | Tiered memory buffers | Simpler model, no temporal graph |
| Mem0 | Hybrid vector + graph | Similar goals, different implementation |
| LangMem | LangChain-native memory | Tighter framework coupling |
| Raw vector store (pgvector, Chroma) | Semantic search over chunks | Much simpler, no temporal reasoning |

---

## Honest Assessment

Zep's temporal knowledge graph approach is technically well-motivated for enterprise agents where context genuinely evolves. The Graphiti open-source project has meaningful traction. However, the added complexity is real—most applications don't need temporal fact versioning, and the LLM-call overhead during ingestion is a practical cost. Evaluate against your actual memory requirements before committing to the operational overhead.


## Related

- [Graphiti](../projects/graphiti.md) — alternative_to (0.7)
- [Knowledge Graphs](../concepts/knowledge-graphs.md) — implements (0.7)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.8)

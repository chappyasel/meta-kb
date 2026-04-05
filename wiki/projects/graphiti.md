---
entity_id: graphiti
type: project
bucket: agent-memory
sources:
  - repos/getzep-graphiti.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - Zep
  - Knowledge Graphs
  - Agent Memory
last_compiled: '2026-04-04T21:18:17.677Z'
---
# Graphiti

## What It Is

Graphiti is an open-source Python library for building **temporal knowledge graphs** designed specifically for AI agent memory. Developed by [Zep](https://www.getzep.com/), it provides a structured alternative to standard RAG by storing facts as graph nodes and edges with explicit time validity windows—tracking not just *what* is known but *when* it was true and *how* it changed.

The core problem it solves: standard vector RAG returns static snapshots of documents. Real agent memory needs to track evolving facts across sessions—a user's preferences change, business data updates, contradictions emerge. Graphiti models this explicitly.

[Source](../../raw/repos/getzep-graphiti.md)

---

## Key Numbers

| Metric | Value |
|--------|-------|
| GitHub Stars | 24,473 |
| Forks | 2,433 |
| Language | Python |
| License | Apache-2.0 |
| Benchmark | Outperforms MemGPT on Deep Memory Retrieval (DMR) |

[Source](../../raw/repos/getzep-graphiti.md) | [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

---

## Architecture

Graphiti organizes memory into three layers:

- **Episodes**: Raw ingestion units (conversations, documents, structured data) with provenance tracking
- **Entities/Nodes**: Extracted facts and entities, deduplicated across episodes
- **Edges with validity windows**: Relationships carry explicit `valid_from` / `valid_to` timestamps, so contradictory or updated facts don't silently overwrite history

At ingestion, an LLM extracts entities and relationships from episodes. At retrieval, the graph supports hybrid queries—combining semantic similarity, graph traversal, and temporal filtering to assemble context relevant to a specific moment in time.

The underlying store is Neo4j (or compatible graph databases). LLM calls are required for extraction, meaning ingestion cost scales with data volume.

[Source](../../raw/repos/getzep-graphiti.md)

---

## What's Unique

- **Temporal versioning of facts**: Unlike a vector store where new embeddings silently replace old ones, Graphiti preserves the history of what was believed when. Critical for auditable enterprise agents.
- **Multi-source integration**: Ingests conversational turns *and* structured business data into the same graph, enabling cross-source reasoning.
- **Episode provenance**: Every fact can be traced back to its source episode, supporting explainability.

[Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

---

## Strengths

- Strong benchmark results vs. MemGPT on DMR
- Handles long-horizon, multi-session agent memory naturally
- Explicit conflict resolution when facts change over time
- Apache-2.0 license—fully self-hostable
- Active development (last updated April 2026)

---

## Limitations

- **LLM-dependent ingestion**: Entity extraction requires LLM calls per episode, which adds latency and cost—not suitable for very high-frequency, low-latency pipelines
- **Neo4j dependency**: Requires graph database infrastructure, higher operational complexity than a vector store
- **Extraction quality ceiling**: The quality of the knowledge graph depends directly on LLM extraction accuracy; hallucinated or missed entities degrade retrieval
- **Relatively young**: Production enterprise patterns are still emerging

---

## Alternatives

| System | Approach | Trade-off |
|--------|----------|-----------|
| **Zep (managed)** | Hosted version of the same architecture | Less control, easier ops |
| **Mem0** | Hybrid vector + graph memory | Lighter weight, less temporal rigor |
| **MemGPT / Letta** | OS-style paging memory | Different model; weaker on DMR benchmark |
| **Plain vector RAG** | Embedding-based retrieval | Simpler, but no temporal tracking or relational structure |

---

## Related

- [Agent Memory](../concepts/agent-memory.md)
- [Knowledge Graphs](../concepts/knowledge-graphs.md)

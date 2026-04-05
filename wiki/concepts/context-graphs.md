# Context Graphs

> Context graphs represent knowledge and state as entities, relationships, and often time-aware edges so agents can reason across structure instead of only over retrieved text chunks. [Graphiti source](../../raw/repos/getzep-graphiti.md) [RAG vs. GraphRAG](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

## Why It Matters

Flat retrieval is good at finding nearby evidence. It is much worse at answering relationship-heavy questions such as dependency tracing, historical truth, or multi-hop synthesis. Context graphs make those relations explicit and queryable. [Graphiti source](../../raw/repos/getzep-graphiti.md) [RAG vs. GraphRAG](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

## How It Works

Systems build nodes for entities or notes, edges for relationships, and often attach provenance or time. Retrieval can then mix graph traversal with semantic and keyword search, giving the agent both relevance and structure. [Graphiti source](../../raw/repos/getzep-graphiti.md) [Cognee source](../../raw/repos/topoteretes-cognee.md)

## Who Implements It

- [Graphiti](../projects/graphiti.md) — temporal context graphs with provenance and validity windows. [Graphiti source](../../raw/repos/getzep-graphiti.md)
- [Cognee](../projects/cognee.md) — hybrid graph plus vector knowledge engine. [Cognee source](../../raw/repos/topoteretes-cognee.md)
- [OpenViking](../projects/openviking.md) — not a graph-first system, but it approaches structured navigation through hierarchy and recursive retrieval. [OpenViking source](../../raw/repos/volcengine-openviking.md)

## Emerging Direction: Shared Context Graphs

Individual context graphs store what one agent knows. [Shared context graphs](shared-context-graphs.md) extend the pattern to multi-agent systems that need to coordinate decisions, capture organizational precedent, and verify trust across agents. See the dedicated concept card for the decision-trace and provenance framing.

## Open Questions

- When does graph structure pay for its complexity versus staying with flat retrieval? [RAG vs. GraphRAG](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)
- How much graph logic should be materialized ahead of time versus learned at runtime? [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Sources

- [Graphiti source](../../raw/repos/getzep-graphiti.md)
- [Cognee source](../../raw/repos/topoteretes-cognee.md)
- [OpenViking source](../../raw/repos/volcengine-openviking.md)
- [RAG vs. GraphRAG](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)
- [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

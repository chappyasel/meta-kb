# Temporal Context Graphs

> Temporal context graphs represent memory as entities and relationships that change over time, usually with provenance about which episode or observation introduced each fact and when that fact was valid.

## Why It Matters

Standard retrieval systems are good at fetching text that looks similar to a question. They are much worse at answering “what changed,” “what used to be true,” or “which observations support this conclusion.” Temporal graphs matter because many real agent tasks are exactly those questions. [Rasmussen et al.](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

This is why graph-based memory keeps showing up in the corpus. The problem is not just long context. It is stale context. An agent that remembers an old fact without its validity window is often worse than an agent that forgot. Temporal context graphs are an attempt to keep the shape of change, not just the text of change. [Graphiti](../../raw/repos/getzep-graphiti.md) [A-MEM](../../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)

## How It Works

The graph is usually built from episodes or observations. The system extracts entities, relations, and facts, then stores:

- what the item is,
- how it connects to other items,
- where it came from,
- and when it was valid.

Queries can then retrieve not only matching facts but also neighboring context and temporal constraints. A user preference from last week, a meeting outcome from yesterday, and a corrected status from today can coexist without collapsing into one flat summary. [Rasmussen et al.](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

Graph systems also help with multi-hop synthesis because the path itself becomes a reasoning aid. Rather than retrieving isolated chunks, the system can traverse relationships between people, events, tools, or concepts. That is the connection between temporal memory projects like Graphiti and retrieval projects like HippoRAG. [Graphiti](../../raw/repos/getzep-graphiti.md) [HippoRAG](../../raw/repos/osu-nlp-group-hipporag.md)

## Who Implements It

- [Graphiti](../projects/graphiti.md) is the clearest implementation in the corpus, pairing temporal knowledge graphs with episode provenance and validity windows. [Graphiti](../../raw/repos/getzep-graphiti.md) [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- [HippoRAG](../projects/hipporag.md) applies graph structure for associative, multi-hop retrieval over corpora. [HippoRAG](../../raw/repos/osu-nlp-group-hipporag.md)
- [Cognee](../projects/cognee.md) combines vector retrieval with graph structure and continuous knowledge maintenance. [Cognee](../../raw/repos/topoteretes-cognee.md)
- [A-MEM](../../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md) extends the idea with evolving memory notes that revise older context, not just append to it.

## Open Questions

- When is the operational cost of graph construction justified over file-first or SQL-first memory? [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) [Claude-Mem](../../raw/repos/thedotmack-claude-mem.md)
- How much of graph maintenance should be automatic versus supervised? [A-MEM](../../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)
- Can graph memory stay interpretable once the number of entities and edges becomes large? [Akoratana](../../raw/tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md)

## Sources

- [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- [Graphiti repo](../../raw/repos/getzep-graphiti.md)
- [A-MEM paper](../../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)
- [HippoRAG repo](../../raw/repos/osu-nlp-group-hipporag.md)
- [Cognee repo](../../raw/repos/topoteretes-cognee.md)
- [Akoratana context graphs tweet](../../raw/tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md)
- [Claude-Mem repo](../../raw/repos/thedotmack-claude-mem.md)

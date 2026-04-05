# Graphiti

> A temporal context-graph system for agent memory that emphasizes relationships, provenance, and time. [Source](../../raw/repos/getzep-graphiti.md)

## What It Does

Graphiti stores memory as a temporally aware context graph so agents can retrieve not just relevant facts, but relationships, episodes, and validity over time. [Source](../../raw/repos/getzep-graphiti.md) [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Architecture

The system builds a context graph rather than a flat store, positioning itself as the graph engine under Zep’s memory layer. The public materials frame it as the answer to dynamic knowledge and cross-session synthesis rather than static document retrieval. [Source](../../raw/repos/getzep-graphiti.md) [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Key Numbers

- 24,473 GitHub stars. [Source](../../raw/repos/getzep-graphiti.md)
- Zep reports 94.8% on DMR versus 93.4% for MemGPT and up to 18.5% gains on stronger temporal reasoning evaluations, with 90% lower latency in one comparison. [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Strengths

- Best-in-corpus articulation of temporal, relational memory. [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- Strong fit for enterprise contexts where “what was true when” matters. [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Limitations

- More operationally complex than file-first or simpler vector-backed memory layers. [Source](../../raw/repos/getzep-graphiti.md)

## Alternatives

- [Mem0](./mem0.md) when multi-level memory APIs matter more than graph semantics.
- [Claude-Mem](./claude-mem.md) when file-first session continuity is enough.

## Sources

- [Graphiti repo](../../raw/repos/getzep-graphiti.md)
- [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

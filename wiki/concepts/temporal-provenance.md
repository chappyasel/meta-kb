# Temporal Provenance

> Temporal provenance means memory or knowledge entries carry both source lineage and time semantics, so the system can answer not just what is true, but what was true when and why it changed. [Graphiti source](../../raw/repos/getzep-graphiti.md) [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Why It Matters

Without temporal provenance, persistent memory turns stale. A fact about a user, codebase, or business process can be correct in one month and wrong in the next. Systems that ignore that distinction tend to accumulate contradictions and confuse the agent. [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) [Supermemory source](../../raw/repos/supermemoryai-supermemory.md)

## How It Works

Temporal provenance can be modeled through validity windows, historical edges, timestamps, supersession rules, or explicit contradiction handling. The common goal is to let later queries reason over state transitions instead of flattening them into one current snapshot. [Graphiti source](../../raw/repos/getzep-graphiti.md) [Supermemory source](../../raw/repos/supermemoryai-supermemory.md)

## Who Implements It

- [Graphiti](../projects/graphiti.md) — the strongest explicit provenance and validity-window implementation here. [Graphiti source](../../raw/repos/getzep-graphiti.md)
- [Supermemory](../projects/supermemory.md) — contradiction handling and automatic forgetting as part of the memory ontology. [Supermemory source](../../raw/repos/supermemoryai-supermemory.md)
- [Memori](../projects/memori.md) — structured memory from actions is easier to track over time than unstructured recall alone. [Memori source](../../raw/repos/memorilabs-memori.md)

## Open Questions

- How much temporal logic belongs in storage versus in the retrieval or reasoning layer? [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- When should older facts be archived, superseded, or actively forgotten? [Supermemory source](../../raw/repos/supermemoryai-supermemory.md)

## Sources

- [Graphiti source](../../raw/repos/getzep-graphiti.md)
- [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- [Supermemory source](../../raw/repos/supermemoryai-supermemory.md)
- [Memori source](../../raw/repos/memorilabs-memori.md)

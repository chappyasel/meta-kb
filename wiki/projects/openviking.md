# OpenViking

> A context database for agents built around a filesystem paradigm: memories, resources, and skills live in one visible hierarchy with tiered loading and automatic session compression. [OpenViking source](../../raw/repos/volcengine-openviking.md)

Relevant buckets: [Knowledge Bases](../knowledge-bases.md) · [Agent Memory](../agent-memory.md) · [Context Engineering](../context-engineering.md)

## What It Does

OpenViking positions itself as a unified context database for agents. Instead of splitting memory into one store, skills into another, and resources into a third, it manages them through a single filesystem-like interface with recursive retrieval and tiered delivery. [OpenViking source](../../raw/repos/volcengine-openviking.md)

## Architecture

The defining move is the filesystem paradigm plus L0/L1/L2 context loading. That lets the agent load lightweight structure first and pull deeper detail only when needed. The system also emphasizes visible retrieval trajectories and automatic session management, which makes context engineering observable instead of black-box. [OpenViking source](../../raw/repos/volcengine-openviking.md)

## Key Numbers

The repo snapshot shows 20,813 stars and 1,465 forks. Its metadata in this repo makes it one of the strongest cross-bucket projects because it touches knowledge bases, memory, skills, and self-improving session management at once. [OpenViking source](../../raw/repos/volcengine-openviking.md)

## Strengths

- Best single project in the set for understanding how files, skills, and memory can share one substrate. [OpenViking source](../../raw/repos/volcengine-openviking.md)
- Strong observability story through tiered loading and visible retrieval trajectories. [OpenViking source](../../raw/repos/volcengine-openviking.md)

## Limitations

- More opinionated than lightweight note or skill systems; you are adopting a context database worldview, not just a small utility. [OpenViking source](../../raw/repos/volcengine-openviking.md)
- Less explicit than Graphiti on temporal provenance and historical truth management. [OpenViking source](../../raw/repos/volcengine-openviking.md) [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Alternatives

- [Napkin](napkin.md) — use when you want a simpler local-first markdown system without a fuller context database. [Napkin source](../../raw/repos/michaelliv-napkin.md)
- [Graphiti](graphiti.md) — use when the key requirement is time-aware graph reasoning, not unified filesystem-style context management. [Graphiti source](../../raw/repos/getzep-graphiti.md)

## Sources

- [OpenViking source](../../raw/repos/volcengine-openviking.md)
- [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

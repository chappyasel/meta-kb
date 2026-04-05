# Claude-Mem

> A pragmatic memory system for Claude Code that captures sessions, compresses them with AI, and reinjects relevant context later. It is memory by compaction rather than memory by graph. [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)

Relevant buckets: [Agent Memory](../agent-memory.md) · [Context Engineering](../context-engineering.md)

## What It Does

Claude-Mem records coding sessions, summarizes them, stores them, and injects relevant context into later sessions. The goal is continuity across `/clear`, restarts, and long-running projects without asking the user to manually maintain the memory layer. [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)

## Architecture

The design centers on automatic capture, semantic compression, and retrieval-backed reinjection. That makes it fundamentally different from graph-native memory systems: the key unit is the compressed session artifact, not an evolving relational graph. [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)

## Key Numbers

The raw snapshot lists 44,950 stars and 3,401 forks. That is one of the strongest adoption signals for memory as a coding workflow feature rather than a separate platform category. [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)

## Strengths

- Very direct answer to the most common coding-agent memory pain: lost session continuity. [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)
- Easier to adopt than graph-heavy memory systems when the main requirement is project continuity. [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)

## Limitations

- Compression-first memory can lose detail that matters later if the summary policy is wrong. [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)
- Weaker than temporal graph systems when the job is provenance-rich reasoning across many entities and updates. [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## Alternatives

- [OpenViking](openviking.md) — use when you want a fuller context database with tiered loading and observable retrieval. [OpenViking source](../../raw/repos/volcengine-openviking.md)
- [Graphiti](graphiti.md) — use when temporal truth and relationship structure matter more than session continuity. [Graphiti source](../../raw/repos/getzep-graphiti.md)

## Sources

- [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)
- [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)
- [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

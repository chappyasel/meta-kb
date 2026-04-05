---
entity_id: gam
type: project
bucket: agent-memory
sources:
  - repos/vectorspacelab-general-agentic-memory.md
related:
  - Agent Memory
last_compiled: '2026-04-04T21:21:22.180Z'
---
# GAM (General Agentic Memory)

## What It Does

GAM provides a structured memory architecture for LLM agents, framing knowledge storage as a file system abstraction. Rather than dumping everything into a flat context window or vector store, it organizes agent memories hierarchically—mimicking how a filesystem organizes files into directories—and uses LLMs to generate structured summaries as memories are created.

It supports both text and video modalities and exposes four access interfaces: Python SDK, CLI, REST API, and Web Platform.

## What's Unique

The core insight is treating agent memory as an **incrementally built filesystem** rather than a retrieval database or growing context. Key distinguishing features:

- **LLM-based semantic chunking**: Instead of splitting text by token count or character boundaries, GAM uses an LLM to identify meaningful semantic boundaries before creating memory entries
- **Dual-layer summaries**: Each chunk produces both a full Memory summary and a TLDR, enabling fast triage before deep retrieval
- **Hierarchical taxonomy**: Memories are organized into an automatically generated directory structure, making memory browsable and queryable at multiple granularities
- **Incremental generation**: New knowledge is added without rebuilding existing memory—important for long-running agents

## Key Numbers

| Metric | Value |
|--------|-------|
| GitHub Stars | 838 |
| Forks | 85 |
| Language | Python |
| Last Updated | April 2026 |

## Architecture Summary

```
Input (text/video)
    → Semantic Chunker (LLM-based boundary detection)
    → Memory Generator (Memory + TLDR per chunk)
    → Hierarchical Organizer (Taxonomy/directory structure)
    → Agent File System (queryable, browsable memory store)
        ↕
    SDK / CLI / REST API / Web Platform
```

The "deep research" framing refers to the system's ability to traverse and synthesize across this hierarchical memory during agent operation, rather than simple nearest-neighbor retrieval.

## Strengths

- **Context window management**: Structured hierarchy lets agents retrieve relevant memory without loading everything
- **Modular**: Each component (chunking, summarization, organization) is independently configurable
- **Multi-modal**: Video support is uncommon in agent memory systems
- **Multiple access layers**: Practical for both development (SDK/CLI) and deployment (REST/Web)

## Limitations

- **LLM-in-the-loop chunking is expensive**: Using an LLM to find semantic boundaries adds latency and cost at write time—not suitable for high-frequency memory writes
- **838 stars is modest**: Early-stage project; production maturity is unclear
- **Filesystem metaphor has limits**: Hierarchical organization works well for structured knowledge but may struggle with memories that span multiple categories
- **Taxonomy quality depends on LLM**: The directory structure is auto-generated, meaning poor taxonomy choices propagate through the whole memory store
- **No published benchmarks**: No evidence of evaluation against MemGPT, Zep, or similar systems

## Alternatives

| System | Approach | Difference |
|--------|----------|------------|
| MemGPT | Virtual context with paging | OS-inspired, more focused on context window paging than hierarchical organization |
| Zep | Graph + vector hybrid | Production-focused, less filesystem metaphor |
| Letta | MemGPT successor | Broader agent framework, not memory-specific |
| Simple RAG | Vector retrieval | No structure, but simpler and faster |

## Practical Implications

GAM is best suited for agents that **accumulate knowledge over extended trajectories**—research assistants, long-running task agents, or agents that build domain expertise over sessions. The filesystem abstraction is intuitive for developers and makes memory inspectable (a real advantage for debugging). The cost of LLM-based chunking means it's better matched to write-sparse, read-heavy workloads.

See also: [Agent Memory](../concepts/agent-memory.md)

[Source](../../raw/repos/vectorspacelab-general-agentic-memory.md)


## Related

- [Agent Memory](../concepts/agent-memory.md) — implements (0.7)

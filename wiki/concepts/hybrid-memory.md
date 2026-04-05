# Hybrid Memory

> Hybrid memory is the converging design pattern where agents combine multiple memory types or stores, typically episodic history, distilled semantic memory, and some structured or graph-backed state. [Mem0 source](../../raw/repos/mem0ai-mem0.md) [A-MEM](../../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)

## Why It Matters

One flat memory store cannot serve every need. Raw experience helps replay detail, distilled memory keeps long-term signal compact, and structured memory handles entities, relations, or time. Hybrid memory exists because each mode covers a different failure case. [Mem0 source](../../raw/repos/mem0ai-mem0.md) [Letta source](../../raw/repos/letta-ai-letta.md) [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## How It Works

Systems either separate memory by scope, by semantic role, or by storage substrate. A hot/warm/cold stack, user/session/agent stack, or episodic/semantic/procedural split are all versions of the same idea: active context should only expose the right slice of a richer durable state. [Mem0 source](../../raw/repos/mem0ai-mem0.md) [OpenViking source](../../raw/repos/volcengine-openviking.md)

## Who Implements It

- [Mem0](../projects/mem0.md) — user, session, and agent scopes. [Mem0 source](../../raw/repos/mem0ai-mem0.md)
- [Letta](../projects/letta.md) — explicit memory blocks for stateful agents. [Letta source](../../raw/repos/letta-ai-letta.md)
- [OpenViking](../projects/openviking.md) — tiered filesystem-style context and memory. [OpenViking source](../../raw/repos/volcengine-openviking.md)
- [Graphiti](../projects/graphiti.md) — structured temporal graph memory layered over ordinary interactions. [Graphiti source](../../raw/repos/getzep-graphiti.md)

## Open Questions

- How should systems split responsibilities between episodic logs, summaries, and structured state? [A-MEM](../../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)
- Which memory layer should own contradiction handling and forgetting? [Supermemory source](../../raw/repos/supermemoryai-supermemory.md)

## Sources

- [Mem0 source](../../raw/repos/mem0ai-mem0.md)
- [Letta source](../../raw/repos/letta-ai-letta.md)
- [OpenViking source](../../raw/repos/volcengine-openviking.md)
- [Graphiti source](../../raw/repos/getzep-graphiti.md)
- [Supermemory source](../../raw/repos/supermemoryai-supermemory.md)
- [A-MEM](../../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)
- [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

# Context Compaction

> Context compaction is the practice of summarizing or clearing parts of a near-full context window so the agent can continue with a smaller but still useful working set. [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)

## Why It Matters

Long-horizon tasks hit two limits at once: window size and quality degradation from too much noisy context. Compaction lets an agent keep architectural decisions, open threads, and task state while dropping verbose tool output and redundant history. [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)

## How It Works

Common forms include summarizing message history, clearing stale tool results, writing notes outside the window, or promoting compressed session memory into durable files. The key challenge is recall: compaction only works when it preserves the details that future steps actually need. [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md) [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)

## Who Implements It

- [Claude-Mem](../projects/claude-mem.md) — compresses sessions and reinjects relevant context later. [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)
- [OpenViking](../projects/openviking.md) — automatic session management plus tiered context loading. [OpenViking source](../../raw/repos/volcengine-openviking.md)
- [LLMLingua](../projects/llmlingua.md) — prompt compression as a more generic context-shaping layer. [LLMLingua source](../../raw/repos/microsoft-llmlingua.md)

## Open Questions

- How do you maximize recall without keeping too much low-value context? [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)
- What should be compacted into notes versus stored as retrievable raw history? [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)

## Sources

- [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)
- [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)
- [OpenViking source](../../raw/repos/volcengine-openviking.md)
- [LLMLingua source](../../raw/repos/microsoft-llmlingua.md)

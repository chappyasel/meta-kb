# Context Rot

> Context rot is the degradation in model performance that happens as more and more tokens accumulate in the window, even when some of those tokens remain potentially relevant. [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)

## Why It Matters

Context rot is the reason larger windows do not eliminate context engineering. As windows fill with stale tool results, weakly relevant history, and overgrown rules, recall and reasoning quality degrade. This is a central constraint for long-horizon agents. [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)

## How It Works

The failure mode comes from attention dilution. Too many tokens compete for the model's finite attention budget, so important information becomes harder to use effectively. Systems respond with compaction, progressive disclosure, compression, and note-taking outside the window. [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md) [LLMLingua source](../../raw/repos/microsoft-llmlingua.md)

## Who Implements It

- [LLMLingua](../projects/llmlingua.md) — token-level prompt compression. [LLMLingua source](../../raw/repos/microsoft-llmlingua.md)
- [Claude-Mem](../projects/claude-mem.md) — compress session history for later reuse. [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)
- [OpenViking](../projects/openviking.md) — tiered loading so the whole corpus never lands in the active window at once. [OpenViking source](../../raw/repos/volcengine-openviking.md)

## Open Questions

- Can agents learn to detect rot before performance visibly collapses? [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)
- Which anti-rot technique preserves the most high-value detail in practice: compression, file notes, or hierarchical loading? [LLMLingua source](../../raw/repos/microsoft-llmlingua.md) [OpenViking source](../../raw/repos/volcengine-openviking.md)

## Sources

- [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)
- [LLMLingua source](../../raw/repos/microsoft-llmlingua.md)
- [Claude-Mem source](../../raw/repos/thedotmack-claude-mem.md)
- [OpenViking source](../../raw/repos/volcengine-openviking.md)

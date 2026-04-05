# Context Compaction

> Context compaction is the practice of shrinking the amount of prompt space an agent needs while preserving the state, instructions, and evidence required to continue making good decisions.

## Why It Matters

Compaction matters because context windows are still scarce even when they are large. Tool descriptions, working notes, retrieved files, previous reasoning, and memory candidates all compete for the same budget. Without compaction, capable agents degrade into bloated agents. [Anthropic](../../raw/articles/effective-context-engineering-for-ai-agents.md) [Martin Fowler](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

The idea also matters because long-horizon work is where agent systems now live. Coding agents, research loops, and browser workflows span many steps. If the system cannot compress state as it goes, it either forgets or becomes too expensive. Compaction is therefore not a polish pass. It is a core scaling mechanism for agent runtimes. [ACE repo](../../raw/repos/kayba-ai-agentic-context-engine.md) [OpenViking](../../raw/repos/volcengine-openviking.md)

## How It Works

Compaction happens in several ways:

- summarize long histories into structured state,
- compress retrieved text before final assembly,
- keep durable notes outside the active window,
- prune tool descriptions and skills until needed,
- or maintain multi-level memory where only the highest-signal layer enters the prompt.

The important detail is that compaction is selective, not just shorter. A good compaction policy preserves the facts and decisions most likely to matter in the next step. A bad one creates pretty summaries that drop the one detail the agent needed. [LLMLingua](../../raw/repos/microsoft-llmlingua.md) [LangSmith trace article](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

There are also two broad compaction styles. One style uses explicit summarization and external files, as in planning-with-files or Claude-Mem. The other uses learned or model-assisted prompt compression, as in LLMLingua. The strongest systems increasingly combine them. [planning-with-files](../../raw/repos/othmanadi-planning-with-files.md) [Claude-Mem](../../raw/repos/thedotmack-claude-mem.md) [LLMLingua](../../raw/repos/microsoft-llmlingua.md)

## Who Implements It

- [LLMLingua](../projects/llmlingua.md) is the clearest compression-native project in the corpus, with strong token reduction claims and RAG-oriented variants. [LLMLingua](../../raw/repos/microsoft-llmlingua.md)
- [Claude-Mem](../projects/claude-mem.md) compacts by filtering through search and timeline layers before revealing full observations. [Claude-Mem](../../raw/repos/thedotmack-claude-mem.md)
- [planning-with-files](../projects/planning-with-files.md) compacts through external markdown state so the full run history does not need to stay in the live prompt. [planning-with-files](../../raw/repos/othmanadi-planning-with-files.md)
- [OpenViking](../projects/openviking.md) uses hierarchical memory layers to keep only compressed summaries in the high-priority path. [OpenViking](../../raw/repos/volcengine-openviking.md)
- [ACE](../projects/ace.md) turns successful context patterns into durable playbooks so future runs start from a tighter prior. [ACE repo](../../raw/repos/kayba-ai-agentic-context-engine.md)

## Open Questions

- How should systems measure semantic loss introduced by compaction? [LangSmith trace article](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)
- When should compaction be rule-based versus learned? [LLMLingua](../../raw/repos/microsoft-llmlingua.md) [ACE paper](../../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)
- Can compressed state remain auditable enough for high-trust workflows? [Anthropic](../../raw/articles/effective-context-engineering-for-ai-agents.md)

## Sources

- [Effective context engineering for AI agents](../../raw/articles/effective-context-engineering-for-ai-agents.md)
- [Context engineering for coding agents](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)
- [LLMLingua repo](../../raw/repos/microsoft-llmlingua.md)
- [Claude-Mem repo](../../raw/repos/thedotmack-claude-mem.md)
- [planning-with-files repo](../../raw/repos/othmanadi-planning-with-files.md)
- [OpenViking repo](../../raw/repos/volcengine-openviking.md)
- [ACE repo](../../raw/repos/kayba-ai-agentic-context-engine.md)
- [ACE paper](../../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)
- [LangSmith trace article](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

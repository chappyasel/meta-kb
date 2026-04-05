# Progressive Disclosure

> Progressive disclosure is the practice of giving an agent the smallest useful context first, then expanding to deeper detail only when the task actually requires it.

## Why It Matters

This is one of the central ideas running through the entire corpus because large windows did not solve attention scarcity. Models still waste budget on low-signal files, redundant instructions, and prematurely expanded memory. Progressive disclosure is the operational answer: stop treating “available context” as “deserved context.” [Anthropic](../../raw/articles/effective-context-engineering-for-ai-agents.md) [Martin Fowler](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

The idea matters for quality as much as cost. Smaller, staged context reduces retrieval thrash, keeps the active prompt more coherent, and makes it easier to understand why a model used a given piece of information. It is one of the few concepts that clearly helps both performance and legibility at the same time. [Anthropic](../../raw/articles/effective-context-engineering-for-ai-agents.md) [Towards Data Science](../../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

## How It Works

A progressive-disclosure system usually starts with a cheap, high-level artifact:

- an index page,
- a list of candidate files,
- a short summary,
- a search result set,
- or a lightweight skill manifest.

Only after the model narrows the problem does the system expand to timelines, full observations, raw documents, or heavier tool descriptions. That staged reveal can be driven by software rules, model choice, or both. [Anthropic](../../raw/articles/effective-context-engineering-for-ai-agents.md)

The pattern appears in several concrete forms:

- search, then timeline, then full event expansion,
- L0/L1/L2 directory hierarchies,
- lazy-loaded skill folders,
- hierarchical document trees,
- and compression-first pipelines that expose a compact version before the original.

All of them are solving the same problem: context should behave like a funnel, not like a dump truck. [Claude-Mem](../../raw/repos/thedotmack-claude-mem.md) [OpenViking](../../raw/repos/volcengine-openviking.md) [PageIndex](../../raw/repos/vectifyai-pageindex.md) [LLMLingua](../../raw/repos/microsoft-llmlingua.md)

## Who Implements It

- [Claude-Mem](../projects/claude-mem.md) uses a three-stage flow of search, timeline filtering, and only then full-observation retrieval. [Claude-Mem](../../raw/repos/thedotmack-claude-mem.md)
- [OpenViking](../projects/openviking.md) organizes memory into L0, L1, and L2 files so cheap summaries precede expensive detail. [OpenViking](../../raw/repos/volcengine-openviking.md)
- [Napkin](../projects/napkin.md) uses markdown plus BM25 with staged reveal instead of surfacing the whole vault at once. [Napkin](../../raw/repos/michaelliv-napkin.md)
- [Anthropic Skills](../projects/anthropic-skills.md) load capability folders on demand rather than front-loading every instruction into the base prompt. [Anthropic Skills](../../raw/repos/anthropics-skills.md)
- [everything-claude-code](../projects/everything-claude-code.md) treats MCPs, skills, and rules as separate context surfaces that should not all be active at once. [everything-claude-code](../../raw/repos/affaan-m-everything-claude-code.md)

## Open Questions

- Which disclosure decisions should be deterministic and which should be delegated to the model? [Martin Fowler](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)
- How should teams measure the quality of a disclosure policy beyond token count? [LangSmith trace article](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)
- At what point does staged reveal slow the agent down more than it helps? [Anthropic](../../raw/articles/effective-context-engineering-for-ai-agents.md)

## Sources

- [Effective context engineering for AI agents](../../raw/articles/effective-context-engineering-for-ai-agents.md)
- [Context engineering for coding agents](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)
- [Agentic RAG failure modes](../../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)
- [Claude-Mem repo](../../raw/repos/thedotmack-claude-mem.md)
- [OpenViking repo](../../raw/repos/volcengine-openviking.md)
- [Napkin repo](../../raw/repos/michaelliv-napkin.md)
- [PageIndex repo](../../raw/repos/vectifyai-pageindex.md)
- [Anthropic Skills repo](../../raw/repos/anthropics-skills.md)
- [everything-claude-code repo](../../raw/repos/affaan-m-everything-claude-code.md)
- [LLMLingua repo](../../raw/repos/microsoft-llmlingua.md)
- [LangSmith trace article](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

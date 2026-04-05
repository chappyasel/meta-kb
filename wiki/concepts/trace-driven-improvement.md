# Trace-Driven Improvement

> Trace-driven improvement treats traces as the raw record of what the agent actually did, then layers evals and review on top to decide what to change next. [LangChain traces](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

## Why It Matters

Without traces, teams end up optimizing stories about failures instead of the failures themselves. Traces make the improvement loop concrete by capturing trajectory, tool use, intermediate decisions, latency, and outputs under real conditions. [LangChain traces](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md) [OpenAI self-evolving agents cookbook](../../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

## How It Works

The basic loop is collect traces, enrich them with evaluators or human labels, identify recurring failure modes, implement targeted changes, and validate against the same or expanded datasets. Each cycle produces better data for the next cycle. [LangChain traces](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

## Who Implements It

- [Autoresearch](../projects/autoresearch.md) — keeps a highly bounded version of trace-driven optimization around one metric. [Autoresearch source](../../raw/repos/karpathy-autoresearch.md)
- [goal-md](../projects/goal-md.md) — turns the evaluator itself into part of the project artifact. [goal-md source](../../raw/repos/jmilinovich-goal-md.md)
- [Acontext](../projects/acontext.md) — distills traces into reusable skill memory. [Acontext source](../../raw/repos/memodb-io-acontext.md)

## Open Questions

- How much of evaluation should be automated versus reviewed by domain experts? [LangChain traces](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)
- When do traces become compact enough to distill without losing the behavior that made them interesting? [Acontext source](../../raw/repos/memodb-io-acontext.md)

## Sources

- [LangChain traces](../../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)
- [OpenAI self-evolving agents cookbook](../../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)
- [Autoresearch source](../../raw/repos/karpathy-autoresearch.md)
- [goal-md source](../../raw/repos/jmilinovich-goal-md.md)
- [Acontext source](../../raw/repos/memodb-io-acontext.md)

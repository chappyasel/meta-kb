# Constructed Fitness Functions

> A constructed fitness function is a score humans design because the domain has no natural scalar metric. It gives autonomous loops a ruler, but also creates a new surface for reward hacking. [goal-md source](../../raw/repos/jmilinovich-goal-md.md) [OpenAI self-evolving agents cookbook](../../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

## Why It Matters

Most software, documentation, and workflow tasks do not have a built-in equivalent of validation loss. Without a computed definition of "better," the agent has nothing stable to optimize. Constructed fitness functions make autonomous improvement possible outside classic ML training loops. [goal-md source](../../raw/repos/jmilinovich-goal-md.md)

## How It Works

Teams define component scores, weights, measurement scripts, or evaluator ensembles, then ask the agent to improve against that rubric. More mature versions also score the instrument itself, because a broken evaluator can produce fake gains. [goal-md source](../../raw/repos/jmilinovich-goal-md.md)

## Who Implements It

- [goal-md](../projects/goal-md.md) — the clearest general pattern for the concept. [goal-md source](../../raw/repos/jmilinovich-goal-md.md)
- [Autoresearch](../projects/autoresearch.md) — shows the simpler case where the metric is not constructed but the loop mechanics are the same. [Autoresearch source](../../raw/repos/karpathy-autoresearch.md)

## Open Questions

- How many scores can a system optimize before the objective becomes too easy to game or too hard to trust? [OpenAI self-evolving agents cookbook](../../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)
- When should humans freeze the metric versus let the agent improve the evaluator too? [goal-md source](../../raw/repos/jmilinovich-goal-md.md)

## Sources

- [goal-md source](../../raw/repos/jmilinovich-goal-md.md)
- [Autoresearch source](../../raw/repos/karpathy-autoresearch.md)
- [OpenAI self-evolving agents cookbook](../../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

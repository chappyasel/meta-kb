# Autoresearch Loop

> The autoresearch loop is a bounded improvement cycle where a human defines the strategy, an agent proposes and tests changes, and only metric-improving results are kept. [Autoresearch source](../../raw/repos/karpathy-autoresearch.md) [Karpathy autoresearch tweet](../../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)

## Why It Matters

This pattern is the cleanest public answer to "what does self-improvement look like when it is done responsibly?" It has explicit time budgets, clear experimental boundaries, and a keep-or-revert rule. That makes it transferable beyond model research. [Autoresearch source](../../raw/repos/karpathy-autoresearch.md)

## How It Works

The essential ingredients are a durable strategy artifact, an editable action surface, a fixed evaluation routine, and a promotion rule. [goal-md](../projects/goal-md.md) extends the same logic to domains without a natural metric by constructing the score first. [Autoresearch source](../../raw/repos/karpathy-autoresearch.md) [goal-md source](../../raw/repos/jmilinovich-goal-md.md)

## Who Implements It

- [Autoresearch](../projects/autoresearch.md) — the canonical minimal loop. [Autoresearch source](../../raw/repos/karpathy-autoresearch.md)
- [goal-md](../projects/goal-md.md) — generalizes the loop to constructed metrics. [goal-md source](../../raw/repos/jmilinovich-goal-md.md)

## Open Questions

- How do you expand the loop from one scalar to many without making it easy to game? [goal-md source](../../raw/repos/jmilinovich-goal-md.md)
- Which parts of the loop should remain human-authored even when the agent gets stronger? [Karpathy autoresearch tweet](../../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)

## Sources

- [Autoresearch source](../../raw/repos/karpathy-autoresearch.md)
- [Karpathy autoresearch tweet](../../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)
- [goal-md source](../../raw/repos/jmilinovich-goal-md.md)

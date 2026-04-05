---
entity_id: karpathy-loop
type: approach
bucket: agent-systems
sources:
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
related:
  - Andrej Karpathy
  - Tobi Lütke
  - ReAct
last_compiled: '2026-04-04T21:17:40.643Z'
---
# Karpathy Loop

## What It Is

The Karpathy Loop is an iterative self-improvement pattern for any artifact that can be evaluated with a score. Popularized by Andrej Karpathy through his open-sourced "autoresearch" project, it applies the core ML training loop — hypothesize, run, measure, keep or discard — to arbitrary optimizable artifacts: code, prompts, agent workflows, content templates, or language model weights.

The framing is simple: if you can define "better" numerically, you can automate the search for it.

## How It Works

The loop relies on three files with clearly separated roles:

1. **The mutable artifact** — the thing being improved (a prompt, a script, a config). The agent edits this.
2. **The locked evaluation function** — test cases or a scoring function the agent cannot touch.
3. **An instruction file** — human-authored goals and constraints.

Each cycle (~5 minutes):
- The agent proposes a change to the mutable artifact
- The evaluator scores the result
- If score improves: `git commit`
- If score regresses: `git reset`
- Repeat. ~12 cycles/hour, ~100 overnight.

The version control integration is load-bearing — it makes the loop safe by guaranteeing reversibility without human supervision.

## Why It Matters

The key insight is that the pattern generalizes far beyond ML. The "Karpathy Loop" label emerged from the ML community, but the mechanism is domain-agnostic:

- Karpathy ran it on code he'd already hand-optimized for months; the agent found 20 additional improvements — 11% performance gain.
- Tobi Lütke applied it to Shopify's Liquid templating engine: 53% faster rendering from 93 automated commits.
- Non-ML builders have applied it to Claude skill files, cold email copy, and system prompts.

The overnight framing matters: 50–100 automated refinement cycles while you sleep compounds quickly. [Source](../../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md)

## Strengths

- **No ML expertise required.** The loop is a software pattern, not a training infrastructure problem.
- **Cheap.** Reported at ~$25/run for 100 experiments on a single GPU. [Source](../../raw/tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md)
- **Safe by default.** Git-based rollback means bad iterations don't accumulate.
- **Generalizable.** Any artifact with a measurable evaluation function qualifies.

## Limitations

- **Requires a well-defined evaluation function.** This is the hard part. Binary test cases or proxy metrics that don't capture real quality lead the loop to optimize for the wrong thing. Garbage in, garbage out — faster.
- **Local optima risk.** Greedy commit/reset cycles can converge on local improvements and miss structural redesigns.
- **Evaluation function integrity.** The locked evaluator must stay locked. If the agent can rewrite what "better" means, the loop collapses.
- **Novelty ceiling.** The agent proposes edits within the space it can explore from a starting artifact. It won't invent radically different approaches unprompted.

## Relationship to Other Approaches

The Karpathy Loop is sometimes positioned as an alternative to ReAct-style agent patterns. Where ReAct emphasizes explicit reasoning traces and tool use within a single task, the Karpathy Loop operates across time — it's a meta-level optimization process, not a within-task reasoning pattern. They operate at different layers and aren't strictly competing.

## Key Numbers

- **42,000 GitHub stars** in the first week after Karpathy open-sourced autoresearch
- **630 lines of Python** in the original implementation
- **11% performance improvement** on already-optimized code
- **53% rendering speedup** on Shopify's Liquid engine
- **~$25 / 100 experiments** at reported compute costs

## Related

- Andrej Karpathy
- ReAct

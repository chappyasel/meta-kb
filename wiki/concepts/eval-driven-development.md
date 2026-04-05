---
entity_id: eval-driven-development
type: approach
bucket: self-improving
sources:
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - repos/jmilinovich-goal-md.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - deep/repos/anthropics-skills.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
related: []
last_compiled: '2026-04-05T05:41:54.262Z'
---
# Eval-Driven Development

## What It Is

Eval-Driven Development (EDD) is a methodology for improving AI agents and systems through systematic, metric-guided iteration cycles. The analogy to test-driven development is structural: where TDD requires you to write a failing test before writing code, EDD requires you to define a measurable fitness function before running an improvement loop. The agent (or human developer) then iterates until the metric improves.

The core insight is that autonomous agent improvement only works when "better" is computable. Without a number to chase, an agent has no gradient signal. With one, it can loop overnight.

## Why It Matters

Most agentic systems plateau after proof-of-concept. The failure mode is consistent: a demo works, the system gets deployed, edge cases accumulate, and improvement depends on humans noticing failures and manually patching prompts. EDD breaks this cycle by instrumenting the feedback signal and automating the fix-and-verify loop.

For regulated or high-stakes domains, this matters doubly. The evaluation artifacts serve as audit trails: you can show exactly which prompt version ran, what score it achieved, and why it was promoted over its predecessor.

## How It Works

### The Core Loop

The loop is borrowed from reinforcement learning but applied to software and prompt engineering:

1. Run a fitness function against current system behavior
2. Identify which component fails worst
3. Make a targeted change (edit prompt, fix code, add test)
4. Re-run the fitness function
5. If score improved, keep the change and commit. If not, revert.

Each iteration is atomic. Nothing regresses without an explicit decision to allow it.

### The Hardest Problem: Constructing the Metric

For ML training, the metric already exists — validation loss, BPC, accuracy on a held-out set. For most software and agent tasks, it doesn't. You have to build the ruler before you can measure.

The GOAL.md project [illustrates this concretely](../../raw/repos/jmilinovich-goal-md.md): a routing confidence score assembled from four weighted components (health, accuracy, coverage, consistency) where none of those components existed before the project started. The developer had to construct the measurement apparatus before the agent could optimize anything. The score went from 47 to 83 overnight once the metric existed.

This construction phase is where most EDD attempts fail. Teams try to optimize vague criteria like "quality" or "accuracy" without defining what either means computationally.

### Dual Scoring for Self-Referential Domains

A specific failure mode: when an agent can modify the thing being measured, naive single-metric EDD produces Goodhart's Law violations. The agent optimizes the metric rather than the underlying quality.

The GOAL.md `docs-quality` example demonstrates the solution: a dual-score system where one score measures documentation quality and a separate score measures instrument quality (how trustworthy the measurement tools are). The agent fixed its own linter — Vale was flagging `onChange` as a spelling error — before using that linter to improve the docs. The dual score prevented the agent from gaming broken evaluation tools.

### Grader Composition

Production EDD systems typically combine multiple grader types, each catching different failure modes:

- **Deterministic/rule-based graders**: exact string matching, length bounds, code execution results. Fast and unambiguous. Run these first.
- **Structural graders**: cosine similarity, embedding distance. Guard against semantic drift without requiring LLM calls.
- **LLM-as-judge**: rubric-scored model evaluation for qualitative properties that rule-based checks can't capture. Slower and more expensive, but catches what the others miss.

The OpenAI Self-Evolving Agents cookbook [implements exactly this stack](../../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md) for pharmaceutical document summarization: a chemical-name preservation checker (deterministic), a word-count deviation grader (deterministic), cosine similarity (structural), and an LLM-as-judge for holistic quality. Each layer compensates for gaps in the others.

### The Action Catalog

Beyond the loop itself, EDD benefits from an explicit catalog of possible improvement actions ranked by expected impact. This prevents the optimizer (human or agent) from burning cycles on 1-point changes when 5-point improvements are available. The GOAL.md template formalizes this as a table: action, estimated impact, implementation method.

### Operating Modes

EDD cycles run at different autonomy levels depending on context:

- **Converge**: run until a target score is reached, then stop and report
- **Continuous**: run indefinitely, committing improvements as they appear
- **Supervised**: pause at human checkpoints before promoting changes

High-stakes domains (regulatory, financial, medical) typically start supervised and move toward automated as trust in the measurement apparatus accumulates.

## Who Implements It

The pattern has converged from multiple directions simultaneously:

**Andrej Karpathy's autoresearch** established the foundational formula for ML: fitness function + loop = autonomous improvement, with the eval file locked read-only to prevent gaming.

**GOAL.md** (jmilinovich) extended this to arbitrary software domains by formalizing constructed metrics, dual scoring, action catalogs, and operating modes in a single file format that any agent can consume.

**OpenAI's Evals platform** provides hosted infrastructure for the grader-composition layer, with UI for human feedback collection and API for automated grader execution. Their self-evolving agents cookbook provides a production implementation pattern.

**GEPA** (Agrawal et al., 2025) applies genetic-algorithm-style prompt evolution with Pareto selection, using training/validation splits to avoid overfitting to grader feedback. The reflective update mechanism — generating new prompt candidates by reasoning about failure trajectories — is the most sophisticated variant of the automated improvement step.

**Philipp Schmid's skill evaluation framework** applies the same pattern narrowly to individual agent skills: 10-12 test prompts, deterministic checks for binary pass/fail criteria, LLM-as-judge for qualitative checks, iterate on failures.

## Practical Implications

### You Must Build the Ruler

If you cannot write a script that outputs a number from 0 to 100 representing quality, you cannot do EDD. This forces useful precision: teams that claim to care about "response quality" must decide whether that means factual accuracy, length appropriateness, chemical name preservation, or something else. The measurement design is half the work.

### Grader Calibration Matters

A broken grader produces broken optimization. The GOAL.md docs-quality example shows what happens when you ignore this: an agent will "fix" documents to satisfy a miscalibrated linter, making them worse while the score goes up. Grader calibration — verifying that grader scores correlate with actual quality — is a prerequisite, not an afterthought.

### Prompt Versioning Is Not Optional

When the optimization target is a prompt, you need version control for prompts. The OpenAI cookbook's `VersionedPrompt` class tracks prompt text, model version, timestamp, eval run ID, and metadata for each version. Without this, a regressing update cannot be cleanly reverted, and the improvement history is opaque.

### The Metaprompt Agent

In automated EDD, a second agent generates improved prompts based on grader feedback. The quality of this metaprompt agent determines the quality of improvement proposals. Static metaprompt templates (like the one in the OpenAI cookbook) are easier to debug but have limited exploration range. GEPA's reflective update mechanism explores more but requires more compute.

## Failure Modes

**Metric gaming**: the optimizer finds ways to raise the score that don't correspond to genuine improvement. Dual scoring and held-out validation sets (as in GEPA) are the primary defenses.

**Grader overfit**: the system optimizes for the specific grader configuration rather than the underlying quality property. The OpenAI cookbook's 75% pass ratio and 85% average threshold are pragmatic hedges — requiring most graders to agree reduces the chance any single broken grader drives the system astray.

**No natural metric**: some quality properties resist quantification. Team "vibes" about code readability, stakeholder satisfaction with tone, regulatory judgment calls. EDD requires accepting that proxy metrics are proxies and that some domains will need persistent human checkpoints.

**Runaway improvement loops**: in continuous mode with no circuit breaker, a miscalibrated grader can trigger thousands of iterations of changes before anyone notices. The GOAL.md constraint to always measure before and after, with automatic revert on regression, is a basic safeguard. Production systems need rate limits and alerting on top of this.

## When Not to Use It

EDD is the wrong choice when:

- **The task is one-shot with obvious completion criteria.** Adding a dark mode toggle doesn't need a fitness function and an overnight loop. A good CLAUDE.md with clear instructions is enough.
- **You cannot construct a valid metric.** Fake precision is worse than acknowledged uncertainty. If your graders don't correlate with real quality, the optimization loop makes the system worse while appearing to improve it.
- **The improvement surface is too narrow.** If there are only 2-3 possible improvements, a human reviewing them is faster and more reliable than building evaluation infrastructure.
- **Latency matters more than quality.** EDD loops take time. For real-time systems where speed is the primary constraint, the infrastructure overhead isn't justified.

## Unresolved Questions

How do you validate that a constructed metric actually measures what you care about before running a long optimization loop? The field has no standard answer. Most implementations rely on spot-checking: manually verify that a few high-scoring outputs are actually good and a few low-scoring outputs are actually bad. This is necessary but not sufficient.

What happens when grader preferences conflict? The OpenAI cookbook's pharmaceutical example shows cosine similarity favoring verbatim reproduction while the LLM judge favors conciseness. The cookbook uses simple averaging, but there's no principled basis for the weights. In practice, grader conflict is a signal that the quality definition is underspecified.

For automated prompt optimization specifically: how do you prevent the metaprompt agent from producing prompts that are locally optimal for the training distribution but fail on deployment? GEPA's train/val split is the most rigorous approach demonstrated so far, but the gap between eval distribution and production distribution remains a known open problem.

## Related

- [GOAL.md](../projects/goal-md.md)
- [Self-Improving Agents](../self-improving.md)

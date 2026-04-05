---
entity_id: eval-driven-development
type: approach
bucket: self-improving
sources:
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
related:
  - LLM-as-Judge
  - Self-Improving Agent
last_compiled: '2026-04-04T21:23:15.501Z'
---
# Eval-Driven Development

**Type:** Development Methodology | **Bucket:** Self-Improving Systems

## What It Is

Eval-Driven Development (EDD) is a methodology for building and improving AI agent systems by treating automated evaluations as the primary feedback mechanism for iteration. Analogous to test-driven development (TDD) in traditional software engineering, EDD makes evals the first-class artifact—you define success criteria before building, then iterate until evals pass, then improve until metrics plateau.

The key distinction from traditional LLM benchmarking: evals aren't just a measurement tool run at the end, they're the engine driving continuous improvement loops within the development cycle itself.

## Why It Matters

AI-generated agent skills—prompts, tool configurations, sub-agents—often lack the rigor of hand-crafted implementations. Without systematic evaluation, capability drift goes undetected, regressions are invisible, and "it seems to work" becomes the quality bar. As agent systems grow in complexity, informal testing becomes untenable.

EDD also addresses a concrete bottleneck: traditional improvement paths require fine-tuning or retraining, which is expensive and slow. Closed-loop eval-driven iteration can achieve comparable gains—one documented case moved a Claude Code skill from **56% → 92% reliability in 4 rounds**—without touching model weights. [Source](../../raw/tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md)

## How It Works

A typical EDD cycle for an agent skill:

1. **Define success criteria** across three dimensions:
   - *Outcome* — did the skill produce the correct result?
   - *Style* — does output format/tone meet requirements?
   - *Efficiency* — token usage, latency, tool call count

2. **Create a test suite** (10-12 representative prompts is a practical starting point) with **deterministic checks** where possible—regex matches, JSON schema validation, exact string comparisons

3. **Add [LLM-as-Judge](../concepts/llm-as-judge.md)** for qualitative dimensions that resist deterministic testing—coherence, helpfulness, instruction-following nuance

4. **Iterate on failures** — modify the skill (prompt, tool config, few-shot examples) and re-run evals; keep changes that improve pass rate, discard those that don't

5. **Automate the loop** — the most advanced implementations use a *meta-skill* that reads eval failures and proposes skill modifications autonomously, inspired by approaches like Karpathy's AutoResearch

[Source](../../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md)

## Deterministic vs. Qualitative Testing

| Test Type | Best For | Example |
|---|---|---|
| Deterministic | Format, correctness, constraints | Output is valid JSON, contains required fields |
| LLM-as-Judge | Style, tone, reasoning quality | "Is this response helpful and accurate?" |

Both are necessary. Deterministic tests are fast and reliable but can't capture everything that matters. LLM-as-judge covers the gap but adds cost and non-determinism. [See LLM-as-Judge](../concepts/llm-as-judge.md)

## Strengths

- **No retraining required** — gains come from prompt/config iteration, not model updates
- **Objectively measurable progress** — you know exactly when and how much you improved
- **Catches regressions** — eval suite acts as a safety net during future changes
- **Scales to self-improvement** — the methodology extends naturally to [Self-Improving Agents](../concepts/self-improving-agent.md) that run their own evals

## Limitations

- **Eval quality is everything** — a weak or misaligned test suite produces a skill optimized for the wrong thing (Goodhart's Law applies hard here)
- **Distribution gap** — 10-12 prompts may not cover real-world input diversity; skills can overfit to the eval set
- **LLM-as-judge costs and variance** — qualitative evals add latency, cost, and reproducibility challenges
- **Setup overhead** — writing good evals upfront requires discipline and domain knowledge most teams underinvest in

## Practical Starting Point

For a new agent skill:
1. Write 10 test cases before touching the skill implementation
2. Split them: ~7 deterministic, ~3 LLM-judged
3. Establish a baseline pass rate
4. Make one focused change, re-run, compare
5. After 3-4 rounds, reassess whether the eval suite itself needs expansion

## Alternatives / Related Approaches

- **Human review loops** — slower, not scalable, but higher signal for novel tasks
- **A/B testing in production** — real distribution, but requires traffic and delayed feedback
- **Fine-tuning** — more durable gains but requires data, compute, and redeployment

## Related

- [LLM-as-Judge](../concepts/llm-as-judge.md) — the standard pattern for qualitative evaluation in EDD
- [Self-Improving Agent](../concepts/self-improving-agent.md) — the natural endpoint of fully automating the EDD loop

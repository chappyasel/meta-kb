---
entity_id: gepa
type: project
bucket: self-improving
sources:
  - repos/gepa-ai-gepa.md
  - repos/greyhaven-ai-autocontext.md
  - repos/laurian-context-compression-experiments-2508.md
related:
  - Self-Improving Agent
last_compiled: '2026-04-04T21:17:20.778Z'
---
# GEPA

## What It Does

GEPA (Generative Evolutionary Prompt Adaptation) optimizes any textual parameter—prompts, code, agent architectures, configurations—using LLM-based reflection combined with Pareto-efficient evolutionary search. Instead of treating optimization as a black-box scalar problem, it reads full execution traces to diagnose *why* something failed, then mutates the offending parameter in a targeted way.

The core loop: run a candidate → collect execution traces → use an LLM to reflect on failures → generate mutated candidates → evaluate on a Pareto frontier → repeat.

## Key Numbers

| Metric | Value |
|--------|-------|
| GitHub Stars | 3,157 |
| Forks | 269 |
| License | MIT |
| Language | Jupyter Notebook / Python |

Claimed efficiency: **35× fewer evaluations** than RL-based prompt optimization methods to reach comparable quality.

Real-world result from third-party testing: **30%+ recovery of failed context compressions** on gpt-4o-mini without switching to a stronger model. [Source](../../raw/repos/laurian-context-compression-experiments-2508.md)

## Architecture Summary

- **Reflective Mutation**: An LLM reads full execution traces rather than a collapsed scalar reward. It diagnoses the failure mode, then proposes a targeted textual edit. This is the key differentiator from gradient-free black-box approaches.
- **Pareto-Efficient Search**: Maintains a frontier across multiple objectives (e.g., accuracy vs. token cost). Avoids collapsing to a single metric that can be gamed.
- **Target-Agnostic**: The parameter being optimized is just text—prompts, code strings, config files, system instructions. The framework doesn't care what it mutates.
- **Evolutionary Population**: Keeps a population of candidates across generations rather than hill-climbing, which helps escape local optima.

[Source](../../raw/repos/gepa-ai-gepa.md)

## What's Unique

Most prompt optimization methods either (a) require differentiable models (DSPy's gradient methods, TextGrad), or (b) treat the LLM as a black box and optimize a scalar score (many RL-based approaches). GEPA occupies a middle ground: it uses the LLM's own reasoning ability to interpret *structured failure traces*, making mutations semantically informed rather than random or gradient-estimated. This is closer to how a human engineer debugs a prompt.

## Practical Use Cases

- Optimizing RAG compression prompts for cheaper models
- Tuning agent reasoning chains without manual prompt iteration
- Evolving tool-use schemas or function-calling templates
- Reducing LLM costs by making smaller models viable through better prompts

## Strengths

- Sample efficiency is the main practical advantage—each mutation is informed, not random
- Works on any text parameter, not just system prompts
- Multi-objective Pareto front prevents naive accuracy/cost tradeoffs
- Open source, MIT licensed

## Limitations

- Still requires multiple LLM calls per optimization cycle; the 35× efficiency claim is relative to RL baselines, not cheap in absolute terms
- Primary artifacts are Jupyter Notebooks, suggesting research-stage polish rather than production library
- Evaluation quality depends heavily on trace quality—if your traces don't capture *why* something failed, reflection is shallow
- No clear evidence of scaling behavior on very long optimization runs

## Alternatives

| Tool | Approach | Differentiator |
|------|----------|----------------|
| DSPy | Gradient-based or compiled | More mature library, tighter framework coupling |
| TextGrad | Gradient-like text optimization | Better for differentiable pipelines |
| PromptBreeder | Evolutionary, no reflection | Less sample-efficient |
| APE/OPRO | LLM-proposed edits | No population/Pareto management |

## Related

- [Self-Improving Agent](../concepts/self-improving-agent.md)
- autocontext — complementary approach that improves agents by persisting execution knowledge rather than mutating parameters

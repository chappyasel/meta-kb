# GEPA

> A reflective optimization framework for prompts, programs, and agent structures that competes directly with heavier RL-style tuning loops. [Source](../../raw/repos/gepa-ai-gepa.md)

## What It Does

GEPA mutates textual or programmatic configurations, evaluates them, reflects on failures, and keeps promising candidates on a Pareto front. It is designed to optimize “anything textual,” from prompts to agent architectures. [Source](../../raw/repos/gepa-ai-gepa.md)

## Architecture

The system uses reflective mutation instead of gradient updates or purely random search, and ships adapters for different optimization targets including terminal agents and DSPy programs. [Source](../../raw/repos/gepa-ai-gepa.md)

## Key Numbers

- 3,157 GitHub stars. [Source](../../raw/repos/gepa-ai-gepa.md)
- 35x fewer evaluations than RL methods is the headline repo claim. [Source](../../raw/repos/gepa-ai-gepa.md)
- The repo highlights 32% to 89% ARC-AGI agent accuracy in one architecture-discovery example. [Source](../../raw/repos/gepa-ai-gepa.md)

## Strengths

- Broadly reusable optimization engine rather than a single domain loop. [Source](../../raw/repos/gepa-ai-gepa.md)
- Good fit when you need better-than-random mutation without full RL infrastructure. [Source](../../raw/repos/gepa-ai-gepa.md)

## Limitations

- Still depends on good evaluation signals; it does not remove the reward-design problem. [Source](../../raw/repos/gepa-ai-gepa.md)

## Alternatives

- [Autoresearch](./autoresearch.md) for a simpler fixed-loop pattern.
- [ACE](./ace.md) when the improvement artifact should be a persistent strategy playbook.

## Sources

- [GEPA repo](../../raw/repos/gepa-ai-gepa.md)

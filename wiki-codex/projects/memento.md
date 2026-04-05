# Memento

> A memory-augmented continual-learning framework that improves agents by retrieving prior successful and failed trajectories instead of updating weights. [Source](../../raw/repos/agent-on-the-fly-memento.md)

## What It Does

Memento logs trajectories into a case bank and retrieves them during future tasks so the agent can learn from experience online without model retraining. [Source](../../raw/repos/agent-on-the-fly-memento.md)

## Architecture

The repo frames the system as case-based reasoning over successful and failed past runs, backed by a memory-augmented MDP perspective and supporting MCP-based tooling. [Source](../../raw/repos/agent-on-the-fly-memento.md)

## Key Numbers

- 2,375 GitHub stars. [Source](../../raw/repos/agent-on-the-fly-memento.md)
- The repo highlights strong results across GAIA, DeepResearcher, SimpleQA, and HLE-style benchmarks. [Source](../../raw/repos/agent-on-the-fly-memento.md)

## Strengths

- Strong example of self-improvement through memory, not fine-tuning. [Source](../../raw/repos/agent-on-the-fly-memento.md)
- Useful bridge between memory architecture and continual-learning behavior. [Source](../../raw/repos/agent-on-the-fly-memento.md)

## Limitations

- More involved than lightweight reflection buffers or markdown learnings files. [Source](../../raw/repos/agent-on-the-fly-memento.md)

## Alternatives

- [ACE](./ace.md) for strategy-learning via persistent playbooks.
- [Autoresearch](./autoresearch.md) for benchmark-driven code or prompt mutation loops.

## Sources

- [Memento repo](../../raw/repos/agent-on-the-fly-memento.md)

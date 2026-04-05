# ACE

> A persistent learning loop for agents that stores reusable strategies in a Skillbook and feeds them back into future runs. [Source](../../raw/repos/kayba-ai-agentic-context-engine.md)

## What It Does

ACE analyzes runs, distills learned strategies, stores them in a Skillbook, and reuses those strategies to improve future tasks without weight updates. [Source](../../raw/repos/kayba-ai-agentic-context-engine.md)

## Architecture

The system uses specialized roles around an evolving Skillbook and a framework-agnostic pipeline engine. It is equally a context system and an improvement system because the learned artifact is a better context playbook. [Source](../../raw/repos/kayba-ai-agentic-context-engine.md) [Source](../../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

## Key Numbers

- 2,112 GitHub stars. [Source](../../raw/repos/kayba-ai-agentic-context-engine.md)
- 2x consistency on Tau2, 49% token reduction on browser automation, and roughly $1.50 learning cost in one translation case. [Source](../../raw/repos/kayba-ai-agentic-context-engine.md)

## Strengths

- Strongest practical example of evolving contexts as reusable playbooks. [Source](../../raw/repos/kayba-ai-agentic-context-engine.md) [Source](../../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

## Limitations

- Requires trace collection and learning-loop discipline to pay off. [Source](../../raw/repos/kayba-ai-agentic-context-engine.md)

## Alternatives

- [Memento](./memento.md) for case-based memory improvement.
- [Autoresearch](./autoresearch.md) for benchmark-driven mutation loops over code or prompts.

## Sources

- [ACE repo](../../raw/repos/kayba-ai-agentic-context-engine.md)
- [ACE paper](../../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

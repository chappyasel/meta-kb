# SWE-Pruner

> A self-adaptive context pruning framework for coding agents that mimics how human programmers selectively skim source code -- using a lightweight neural skimmer guided by agent-formulated goals to achieve 23-54% token reduction with minimal performance impact.

## What It Does

SWE-Pruner addresses the tension between long interaction contexts (which incur high API costs and latency) and the need for comprehensive code understanding. Unlike generic compression approaches that use fixed metrics like perplexity, SWE-Pruner performs task-aware adaptive pruning: given the current task, the agent formulates an explicit goal (e.g., "focus on error handling") that guides a neural skimmer to dynamically select relevant lines from surrounding context.

## Architecture

Two-component design:

- **Goal Formulation**: The coding agent articulates what matters for its current objective in natural language. This goal acts as a focusing lens for the pruning process, ensuring that task-relevant code is preserved while boilerplate is compressed
- **Neural Skimmer**: A lightweight 0.6B parameter model trained to dynamically select relevant lines from context given the goal. This is much smaller than the primary LLM, adding minimal latency while providing context-aware compression

The framework integrates with existing coding agents (Claude Code, OpenHands) without requiring changes to the agent's core architecture. Evaluation spans four benchmarks across both multi-turn agent tasks (SWE-Bench Verified) and single-turn tasks (LongCodeQA).

## Key Numbers

- **252 GitHub stars**, 20 forks
- **23-54% token reduction** on agent tasks like SWE-Bench Verified
- **Up to 14.84x compression** on single-turn tasks like LongCodeQA
- 0.6B parameter skimmer model
- Written in Python, uses `uv` for dependency management

## Strengths

- The key innovation is making the agent articulate what context matters -- this pattern is transferable to any system that needs selective context loading, not just coding agents
- The lightweight skimmer avoids the cost of running the full LLM for compression decisions

## Limitations

- Requires training the 0.6B skimmer model on task-specific data, which limits out-of-the-box applicability to new domains
- Goal formulation quality depends on the coding agent's ability to articulate its current objective -- vague goals produce poor pruning

## Alternatives

- [agentic-context-engine.md](agentic-context-engine.md) -- learns strategies for reducing token usage through experience rather than neural pruning
- [724-office.md](724-office.md) -- handles context growth through LLM compression in a three-layer memory system

## Sources

- [ayanami1314-swe-pruner.md](../../raw/repos/ayanami1314-swe-pruner.md) -- "SWE-Pruner performs task-aware adaptive pruning for long contexts. Given the current task, the agent formulates an explicit goal as a hint to guide the pruning targets."

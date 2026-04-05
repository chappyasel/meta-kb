---
url: 'https://github.com/Ayanami1314/swe-pruner'
type: repo
author: Ayanami1314
date: '2026-04-02'
tags:
  - context-engineering
  - agentic-skills
  - self-improving
  - agent-memory
  - context-window-management
  - task-aware-pruning
  - coding-agents
  - adaptive-compression
key_insight: >-
  Self-adaptive context pruning for coding agents addresses a critical gap in
  LLM knowledge bases: fixed compression metrics (like perplexity) destroy
  syntactic structures essential for code understanding, whereas task-aware
  pruning that formulates explicit goals (e.g., 'focus on error handling')
  preserves implementation details while achieving 23-54% token reduction. This
  pattern—where the agent itself articulates what context matters for its
  current objective—is a template for building self-improving knowledge base
  selection mechanisms rather than static retrieval.
stars: 252
forks: 20
relevance_scores:
  topic_relevance: 7
  practitioner_value: 7
  novelty: 8
  signal_quality: 7
  composite: 7.2
  reason: >-
    SWE-Pruner introduces a task-aware, self-adaptive context pruning framework
    for coding agents with a transferable pattern (agent articulates explicit
    goals to guide compression) directly relevant to context engineering and
    agent memory, backed by benchmarks and integration examples for real agents
    like Claude Code and OpenHands.
language: Python
---
## swe-pruner

### Stats

| Metric | Value |
|--------|-------|
| Stars | 252 |
| Forks | 20 |
| Language | Python |
| Last Updated | 2026-04-02 |

### README (excerpt)

# SWE-Pruner: Self-Adaptive Context Pruning for Coding Agents
![overview](./images/overview.jpg)
LLM agents have demonstrated remarkable capabilities in software development, but their performance is hampered by long interaction contexts, which incur high API costs and latency. While various context compression approaches have emerged to tackle this challenge, they typically rely on fixed metrics such as perplexity (PPL), ignoring the task-specific nature of code understanding. As a result, they frequently disrupt syntactic and logical structures and fail to retain critical implementation details. In this paper, we propose SWE-Pruner, a self-adaptive context pruning framework tailored for coding agents. Drawing inspiration from how human programmers "selectively skim" source code during development and debugging, SWE-Pruner performs task-aware adaptive pruning for long contexts. Given the current task, the agent formulates an explicit goal (e.g., "focus on error handling") as a hint to guide the pruning targets. A lightweight neural skimmer (0.6B parameters) is trained to dynamically select relevant lines from the surrounding context given the goal. Evaluations across four benchmarks and multiple models validate SWE-Pruner's effectiveness in various scenarios, achieving 23-54% token reduction on agent tasks like SWE-Bench Verified and up to 14.84x compression on single-turn tasks like LongCodeQA with minimal performance impact.

## Project Structure
```text
.
├── data/                      # Experiment trace archives and hyperparameter configurations
├── downstream_eval/           # Downstream evaluation benchmarks
│   ├── multi_turn/            # Includes: SWE-bench, SWEQA (coming soon)
│   └── single_turn/           # Includes: LongCodeQA, LCC (LongCodeCompletion)
├── swe-pruner/                # Inference code and model utilities
│   └── model/                 # Model files for SWE-Pruner
├── examples                   # Examples for integrating with other agents like claude code and openhands
```

## Quick Start

### Prerequisites

This project uses `uv` for fast and efficient dependency management.

### Installation

Since different modules have different dependencies, please refer to the specific `README` file inside each subfolder for detailed installation instructions.

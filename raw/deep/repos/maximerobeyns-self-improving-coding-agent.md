---
url: 'https://github.com/MaximeRobeyns/self_improving_coding_agent'
type: repo
author: MaximeRobeyns
date: '2026-04-04'
tags: [self-improving, agentic-skills, context-engineering]
key_insight: >-
  SICA implements true scaffold-level self-modification where the coding agent modifies its own source code (tools, reasoning structures, sub-agents) inside a Docker sandbox, evaluates the modification against benchmarks, selects the best-performing ancestor via confidence-interval-aware selection, and iterates -- the agent literally rewrites itself to become better at coding tasks.
stars: 299
deep_research:
  method: source-code-analysis-plus-web
  files_analyzed:
    - README.md
    - runner.py
    - base_agent/agent.py
    - base_agent/src/config.py
    - base_agent/src/tools/reasoning_structures/meta_improvement.py
    - base_agent/src/tools/reasoning_structures/sequential.py
    - base_agent/src/benchmarks/base.py
    - base_agent/src/benchmarks/__init__.py
    - base_agent/src/agents/base_agent.py
    - base_agent/src/agents/implementations/main_orchestrator.py
    - base_agent/src/utils/archive_analysis.py
    - base_agent/src/tools/base_agent_tools.py
    - base_agent/src/oversight/overseer.py
    - base_agent/description.txt
    - base_agent/agent_change_log.md
  web_sources:
    - https://arxiv.org/html/2504.15228v2
    - https://arxiv.org/abs/2504.15228
    - https://www.marktechpost.com/2025/04/29/can-coding-agents-improve-themselves-researchers-from-university-of-bristol-and-igent-ai-propose-sica-self-improving-coding-agent-that-iteratively-enhances-its-own-code-and-performance/
    - https://ubos.tech/news/the-rise-of-self-improving-coding-agents-exploring-the-sica-architecture/
    - https://docs.bswen.com/blog/2026-03-29-self-improving-coding-agent/
    - https://www.emergentmind.com/papers/2504.15228
  analyzed_at: '2026-04-04'
  original_source: repos/maximerobeyns-self-improving-coding-agent.md
---

## Architecture Overview

SICA (Self-Improving Coding Agent) is a research system from the University of Bristol and iGent AI (Maxime Robeyns, Martin Szummer, Laurence Aitchison) that implements a genuine self-modification loop: an LLM-powered coding agent works on its own source code to improve its performance on coding benchmarks. Published as a workshop paper at ICLR 2025 Workshop on Scaling Self-Improving Foundation Models (SSI-FM), it demonstrates a data-efficient, non-gradient-based learning mechanism driven by LLM reflection and code updates.

Unlike systems that optimize prompts or configurations, SICA modifies actual Python code -- tools, reasoning structures, sub-agent implementations, and system prompts -- then evaluates the modified agent on benchmarks to decide whether to keep or discard the changes. The key architectural innovation compared to prior work like ADAS: SICA unifies the meta-agent and target-agent into a single system. The same agent that performs tasks is also responsible for evaluating past performance, identifying shortcomings, and updating its own implementation. This eliminates the separation between improvement-proposing and improvement-receiving components.

The system has two layers:

**The Runner** (`runner.py`) -- An outer Python script that orchestrates the improvement loop. It manages Docker containers for sandboxed execution, runs benchmarks in parallel across workers, tracks results in JSONL files, selects which agent iteration to use as the base for the next improvement, and coordinates the evaluate-improve cycle.

**The Base Agent** (`base_agent/`) -- A modular coding agent framework with:
- `src/agents/` -- Agent implementations: `MainOrchestratorAgent` (top-level), `Coder`, `Reasoner`, `ProblemSolver`, `ArchiveExplorer`, `ReviewCommitteeMember`.
- `src/tools/` -- Tool implementations: file editing, directory navigation, ripgrep search, command execution, calculator, answer submission, and critically, `reasoning_structures/meta_improvement.py` (the structured self-improvement workflow).
- `src/benchmarks/` -- Benchmark suite: GSM8K, GPQA, HumanEval, LiveCodeBench, AIME, MATH, DROP, ARC-AGI, SWE-Bench Verified, and custom benchmarks.
- `src/llm/` -- Multi-provider LLM abstraction supporting Anthropic, OpenAI, Google (Gemini/Vertex), Fireworks, and DeepSeek.
- `src/callgraph/` -- Execution trace tracking via a directed acyclic graph of agent calls.
- `src/oversight/` -- An `Overseer` that monitors agent behavior and can inject messages.
- `src/events/` -- Event bus for real-time agent execution monitoring.
- `src/web_server/` -- Browser-based visualization of agent execution traces.

## Core Mechanism

### The Self-Improvement Loop

The loop in `runner.py` proceeds through these phases:

**Phase 1: Benchmark Evaluation** -- The current agent version is evaluated on a suite of benchmarks. Each benchmark (defined in `src/benchmarks/base.py`) provides a list of `Problem` objects (problem_id, statement, answer). The runner spawns parallel Docker containers (configurable via `--workers`, default 8), each processing a single problem with a 10-minute timeout and $3.00 cost threshold per problem.

The `process_job()` function in `runner.py`:
1. Creates a fresh Docker container per problem.
2. Copies the current agent code into the container at `/home/agent/workdir`.
3. Runs the agent with the problem statement as initial prompt.
4. Calls `benchmark.score_problem()` to evaluate the agent's answer.
5. Generates a contextual summary via `generate_contextual_summary()` using an LLM to critically analyze the agent's performance trace.
6. Records results in JSONL format via `BenchmarkTracker`.

**Phase 2: Base Agent Selection** -- The `select_base_agent()` function uses a multi-objective utility function to choose which previous agent iteration to build upon. It does NOT simply pick the latest iteration or the highest-scoring one. The selection combines three objectives:

```
U = 0.5 * p_score + 0.25 * (1 - min(1, p_cost/$10)) + 0.25 * (1 - min(1, p_time/300s))
```

With a 0.5 timeout penalty applied when problems exceed 5 minutes. This utility function balances performance (weight 0.5), cost efficiency (0.25), and execution time (0.25). The `ArchiveAnalyzer` computes these statistics across all iterations, and `compute_statistics()` calculates confidence intervals for each iteration's mean score.

The confidence-interval-aware aspect prevents regression: if iteration 5 got lucky on a few problems, the system will not blindly adopt it over a more consistently good iteration 3. The algorithm finds the best-performing iteration, gets its lower confidence bound, then scans backward from the current iteration to find the first agent whose mean score exceeds that lower bound. This enables "jumping back" to earlier iterations if recent modifications hurt performance.

**Phase 3: Meta-Improvement** -- The selected base agent is loaded, and the agent is instructed to improve its own code. This is where the `MetaImprovementReasoningStructure` (in `src/tools/reasoning_structures/meta_improvement.py`) takes over. It defines a 7-step structured workflow:

**Step 1: Identify Negatives** -- "Use the archive explorer agent and agent_change_log.md file to specifically identify the features in the agent code, particularly those that we introduced in past iterations, that ARE NOT working and may need to be removed."

**Step 2: Identify Positives** -- "Use the archive explorer agent and agent_change_log.md file to get a report of features in the agent code that are specifically working well and should be kept or doubled-down upon, as well as features that maybe aren't working right now, but do show promise."

**Step 3: Propose Improvement** -- "Come up with a concrete improvement to the coding agent system. Focus on things like improving the mechanics of code editing, integrating developer tools, strategies to make the agent faster, strategies to increase code quality, code correctness verification strategies, dead code or poorly performing features to be deleted, or any other creative ways to increase benchmark performance." The agent must call `meta_improvement_review_committee` and iterate until reviewers approve.

**Step 4: Implement** -- "Use a software engineering agent to completely and thoroughly implement the feature."

**Step 5: Test** -- "Ensure that the testing strategy has been carried out: either running unit tests for framework features, or simple end-to-end tests of new sub-agents or prompt modifications. For unit tests, use the existing pytest-based setup. For end-to-end tests, run something like `python -m workdir.agent -p '<some SIMPLE agent prompt>' --workdir /tmp/workdir --timeout 300`."

**Step 6: Update Description** -- "Ensure that description.txt has a concise description of what has been changed."

**Step 7: Update Change Log** -- "Ensure that agent_change_log.md reports on the effectiveness of earlier interventions as evidenced by the benchmark data and contains a log entry for this iteration."

**Phase 4: Loop** -- Return to Phase 1 with the modified agent code.

### Types of Self-Modifications

The paper and community analyses document specific modifications the agent makes to itself across iterations. Rather than updating underlying LLM weights, improvements occur through scaffold-level changes -- modifications to how the agent thinks, not what it knows:

- **New tools**: "Smart Editor" tool for intelligent file editing, diff-enhanced strategies, AST Symbol Locator, "Hybrid Symbol Locator" combining ripgrep with verification
- **New reasoning structures**: CodeContextSummarizer for codebase exploration, context-sensitive diff minimization
- **Tool orchestration changes**: How the agent sequences and coordinates tool usage
- **File management strategies**: Improved approaches to organizing and accessing code
- **Problem decomposition heuristics**: Better methods for breaking down complex tasks
- **Sub-agent capabilities**: Adding specialized sub-agents for specific task types

The ICLR paper documents 14 major improvements across iterations. Notably, at iteration 9, the agent implemented an AST-based symbol locator -- a tool that required understanding of abstract syntax trees, which the agent figured out by reading its own failure traces on navigation benchmarks.

### The Archive Explorer

A key component is the `ArchiveExplorer` agent implementation, which gives the improving agent access to its own performance history. It reads the JSONL results files, performance summaries, and execution traces from previous iterations. This is how the agent learns from its own history: not through git (like autoresearch) but through structured benchmark result archives. The archive includes per-problem contextual summaries generated by LLM analysis of execution traces.

### The Review Committee

The `committee_design.py` tool implements a `meta_improvement_review_committee` that the agent must consult before implementing a proposed change. Multiple reviewer agents evaluate the proposal for feasibility, impact, and potential regressions. The agent must iterate with the committee until there are "no significant reviewer concerns." This is a governance mechanism that prevents the self-modifying agent from making reckless changes.

The review committee adds latency and cost to each improvement iteration but serves as the primary safeguard against self-modification going off the rails. Without it, the agent might repeatedly add features that individually pass simple tests but collectively create a bloated, slow system.

### Docker Sandboxing

All agent execution happens inside Docker containers with strict isolation:
- `network_mode='none'` -- blocks data exfiltration
- `mem_limit='2g'` -- prevents runaway processes
- `cpu_quota=50000` -- limits resource consumption
- Timeout parameters preventing infinite loops
- Forced cleanup via `finally` blocks
- Cost monitoring via `cost_monitor()` in `agent.py` (alerts at 50%, 80%, 90%, 95% budget thresholds)

The sandbox provides: isolation from the host filesystem, resource limits, clean slate per problem (no state leakage between benchmark problems). This is critical because the agent can execute arbitrary shell commands -- it is literally modifying and running its own code.

### Oversight and Observability

SICA implements two layers of safety oversight:

1. **Interactive Web Interface** -- The `web_server` module provides a browser-based visualization at `http://localhost:8080` showing the agent's execution trace as an interactive callgraph. Users can click on individual events to see agent decisions, tool calls, and sub-agent delegations in real time.

2. **Asynchronous LLM Overseer** -- An LLM-based overseer runs every 30 seconds, monitoring agent behavior. It can issue notifications or cancel agents that appear to be going off-track. The authors note this provides "humans can and do oversee all aspects" of the system.

Additionally, safety evaluations can be included in benchmark sets to validate each agent iteration, creating a benchmark-gated safety check before any iteration's modifications are adopted.

## Design Tradeoffs

### Scaffold-Level vs Weight-Level Self-Improvement
SICA modifies the agent's Python code (scaffold) rather than the LLM's weights. This means improvements are transparent, auditable, and reversible -- "scaffold-level changes modify how the agent thinks, not just what it knows." But it cannot improve the LLM's fundamental capabilities -- only the tooling, prompts, and reasoning structures around it. Weight-level self-improvement (fine-tuning) could produce deeper improvements but would be opaque and harder to control. The authors note the system "does not modify the model weights," which limits recursion risks compared to weight-updating systems.

Performance plateau evidence supports this limitation: accuracy on reasoning-dominant tasks (AIME, GPQA) showed minimal improvement because the base LLM was approaching its ceiling. Scaffold changes cannot overcome fundamental model capability limits. Future systems may need "more integrated co-training between agent logic and model behavior."

### Unified Meta-Agent vs Separated Meta/Target
Unlike ADAS, which splits responsibilities between a meta-agent (proposes improvements) and a target-agent (receives improvements), SICA unifies these roles. The same agent that performs coding tasks is also responsible for evaluating its own performance and improving its own code. This allows continuous self-directed improvement without external intervention but means the improving agent is limited by its own capabilities -- it cannot propose improvements that require understanding beyond its current ability.

### Multi-Objective Utility vs Greedy Best
The `select_base_agent()` function uses a weighted utility combining performance (0.5), cost (0.25), and time (0.25) rather than simply picking the highest-scoring iteration. This is more conservative but avoids regression from lucky variance and prevents the system from adopting expensive or slow iterations even if they score well. The tradeoff: slower adoption of genuine improvements that happen to have high variance or cost.

### Docker Isolation vs Shared State
Each benchmark problem runs in a fresh container, preventing state leakage. But this means the agent cannot learn from one problem to help solve the next within a benchmark run. The isolation trades inter-problem learning for evaluation integrity. The strict `network_mode='none'` prevents data exfiltration but also prevents the agent from accessing online documentation or APIs during evaluation.

### Minimal Base Agent Design
The base agent is deliberately minimal: no tree-sitter, no LSP integration, no advanced file editing. The README states: "It lacks efficient file editing tools, devtools such as tree sitter or LSP integrations, or advanced reasoning structures that would help it out when performing coding tasks. It has the necessary building blocks to bootstrap these features and specialise itself." This is an intentional design choice -- the agent is supposed to ADD these capabilities through self-improvement. Starting minimal creates a clean experimental signal: any capability the agent has must have been self-generated.

### Review Committee as Governance
The mandatory review committee adds latency and cost to each improvement iteration but prevents reckless self-modifications. Without it, the agent might repeatedly add features that individually pass simple tests but collectively create a bloated, slow system. This is a form of governance that balances autonomy with safety.

## Community Feedback and Practical Experience

### What Works
- The system demonstrably improves itself: SWE-Bench Verified accuracy went from 17% to 53% across 14 iterations, a 3x improvement.
- The agent invents genuinely useful tools (AST-based symbol locator, Smart Editor) that a human developer would recognize as good engineering.
- The confidence-interval selection mechanism prevents regression in most cases, acting as a natural safeguard against lucky-but-flawed iterations.
- The web-based observability interface provides clear insight into the improvement trajectory.

### What Breaks
- **Path dependence is the dominant failure mode.** The authors acknowledge: "poor quality initial feature suggestions (e.g. fixating on caching open files) often lower the quality of subsequent feature suggestions." A bad early modification can steer the entire improvement trajectory, and there is no mechanism for global restart beyond manually resetting to iteration 0. Different runs from the same starting point produce very different trajectories.
- **Reasoning task ceiling.** Performance on AIME and GPQA barely improved because these tasks test the LLM's reasoning capability, which scaffold modifications cannot enhance. The agent optimizes the tooling around the model, not the model itself.
- **Cost is substantial.** Each iteration requires running all benchmarks with parallel workers (multiple LLM calls per problem), generating contextual summaries for each problem, and running the meta-improvement agent with its review committee. A single iteration can cost hundreds of dollars in LLM API calls.
- **Change log accumulation degrades quality.** The `agent_change_log.md` grows linearly with iterations. After many iterations, the context required to read it may exceed the LLM's effective attention span, degrading the quality of improvement proposals that depend on understanding the full modification history.

### Academic Context
The 299 stars reflect SICA's academic audience (workshop paper at ICLR 2025). The key contribution is not a production system but a proof-of-concept: scaffold-level self-improvement is feasible and measurable. The agent can genuinely improve itself by modifying its own code, and this improvement transfers to standard benchmarks.

## Failure Modes & Limitations

1. **Path Dependence** -- Early features influence subsequent features. A bad early modification can steer the entire improvement trajectory in a suboptimal direction, and there is no mechanism for global restart. High variance across runs is expected.

2. **Benchmark Saturation** -- If benchmarks are too easy, the agent cannot measure improvement. The system notes this as a TODO: "get the agent to curate / build more of its own benchmarks." Currently, benchmark selection is static and manual.

3. **High Variance** -- Self-improvement runs have high variance because the LLM's code modifications are stochastic. Two runs starting from the same base agent can produce very different trajectories due to path dependence in the modification sequence.

4. **Cost** -- Each iteration requires: (a) running all benchmarks with parallel workers, (b) generating contextual summaries, (c) running the meta-improvement agent with review committee. A single iteration can cost hundreds of dollars.

5. **No Formal Safety Guarantees** -- While Docker provides isolation and the review committee provides governance and the overseer monitors behavior, there is no formal verification that the agent's modifications are safe. A confused self-modification could break the agent in ways that pass simple tests but fail on edge cases.

6. **Change Log Accumulation** -- The `agent_change_log.md` grows linearly, eventually exceeding the LLM's effective attention span and degrading improvement quality.

7. **Reasoning Ceiling** -- Scaffold-level modifications cannot improve the underlying LLM's reasoning capabilities. Tasks that are bottlenecked by model intelligence (AIME, GPQA) show minimal improvement regardless of how many scaffold modifications are made.

## Integration Patterns

### Multi-Model Experimentation
The LLM abstraction layer supports 8+ providers (Anthropic, OpenAI, Google, Vertex, Fireworks, DeepSeek), enabling experiments where a strong LLM improves a scaffold for a weaker LLM. The README notes this as a TODO: "use a stronger LLM to build a scaffold for a weaker LLM." This cross-model transfer is particularly interesting -- could GPT-5 build better tooling for GPT-4.1 Mini?

### Web-Based Monitoring
The `web_server` module provides a browser-based visualization showing the agent's execution trace as an interactive callgraph. Users can click on individual events to see agent decisions, tool calls, and sub-agent delegations in real time. This is essential for understanding what the agent changed and why.

### SWE-Bench Integration
The benchmark suite includes `swebench_verified.py`, connecting SICA to the standard SWE-Bench evaluation framework for measuring real-world software engineering capability.

### Reproducibility
The system is designed for research reproducibility: Docker containers provide deterministic environments, JSONL tracking enables result analysis, and the change log provides a human-readable audit trail of modifications. All code is open source.

## Benchmarks & Performance

| Benchmark | Before | After | Iterations |
|-----------|--------|-------|------------|
| SWE-Bench Verified (50 subset) | 17% | 53% | 14 |
| LiveCodeBench (50 questions) | 65% | 71% | Multiple |
| File Editing (synthetic) | 82% | 94% | Multiple |
| Symbol Navigation | 35% | 43% | 9 (AST locator added) |

Key observations from the paper:
- The agent successfully adds tools, reasoning structures, and sub-agent capabilities through self-modification.
- The SWE-Bench improvement (17% to 53%) represents a 3x gain from scaffold-only changes.
- File editing improvement (82% to 94%) came from the agent inventing the "Smart Editor" and diff-enhanced strategies.
- Symbol navigation jump at iteration 9 corresponds to the agent implementing an AST-based locator.
- Reasoning-dominant tasks (AIME, GPQA) showed minimal improvement, demonstrating the ceiling of scaffold-level optimization.
- The agent also optimized execution latency and resource efficiency, reducing average cost and time per task -- not just accuracy.

The system is designed for research rather than production deployment. The key contribution is demonstrating that scaffold-level self-improvement is feasible, measurable, and can produce genuinely useful engineering artifacts (tools, reasoning structures, sub-agents) through autonomous iteration.

---
entity_id: self-improving-agents
type: concept
bucket: self-improving
abstract: >-
  Self-improving agents autonomously optimize their own code, prompts, or
  architectures through empirical feedback loops — distinguished by replacing
  human-directed iteration with agent-directed ratcheting toward a scalar
  metric.
sources:
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - repos/human-agent-society-coral.md
  - repos/alirezarezvani-claude-skills.md
  - repos/aiming-lab-agent0.md
  - repos/maximerobeyns-self-improving-coding-agent.md
  - repos/letta-ai-letta.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/karpathy-autoresearch.md
related:
  - claude-code
  - multi-agent-systems
  - openclaw
  - autoresearch
  - multi-agent-systems
last_compiled: '2026-04-08T02:52:56.691Z'
---
# Self-Improving Agents

## What They Are

A self-improving agent modifies its own behavior, code, prompts, or architecture, then validates the modification against an objective signal, and keeps or discards the change based on the result. The core mechanism is a ratchet: improvements accumulate, regressions revert. The agent never finishes — it loops until interrupted.

This distinguishes self-improving agents from standard agents that execute tasks and stop. A standard coding agent fixes the bug you described. A self-improving agent finds the bug, fixes it, measures whether the fix degraded anything else, and then looks for the next thing to fix — without being asked.

The concept generalizes across domains: Andrej Karpathy applied it to ML training ([AutoResearch](../projects/autoresearch.md)), [Darwin Gödel Machine](../projects/darwin-godel-machine.md) applied it to agent architecture evolution, [CORAL](../repos/human-agent-society-coral.md) applied it to multi-agent optimization, and auto-harness applied it to agentic harness reliability.

## Why It Matters

Human-directed iteration has a fundamental throughput ceiling: a person can review maybe 10–20 experiments per day. A self-improving agent with a 10-second verification cycle can run 360 experiments per hour. At 5-minute verification (Karpathy's original GPU training budget), that's still 12 per hour versus human-paced iteration. The compounding effect across nights and weekends is where the gains concentrate.

The second reason is search space. Human researchers tend to explore variations of what they already know works. Agents will try things that seem locally implausible — and community reports on autoresearch document cases where agents independently discovered that removing complexity improved performance. The agent doesn't have status quo bias.

The third reason: failures become structured knowledge. In human-directed iteration, a failed experiment exists in someone's memory or a notebook. In self-improving systems, every failure is a git commit, a log entry, or a test case in a regression suite. Future iterations read that record and avoid repeating the same mistakes.

## How It Works

### The Core Loop

Every self-improving agent instantiates the same abstract structure:

1. **Observe** the current state (codebase, prompt, architecture, benchmark score)
2. **Hypothesize** a modification based on history and current state
3. **Apply** the modification
4. **Verify** against an objective metric
5. **Decide**: keep if improved, revert if not
6. **Record** the result
7. **Repeat**

The details differ by implementation. Karpathy's autoresearch runs this loop over a single `train.py` file with `val_bpb` (validation bits per byte) as the metric, one 5-minute GPU training run per iteration. DGM runs it over the agent's entire codebase with SWE-bench as the metric, spawning new agents from an archive of past agents. Auto-harness runs it over agent harness configuration with tau-bench task success rate as the metric, clustering production failures before proposing fixes.

### What Makes a Loop Work

Four conditions must hold for a self-improvement loop to function:

**A scalar metric.** "Looks better" kills loops. The metric must be a number produced by a command. Karpathy's `val_bpb`, SWE-bench pass rate, Lighthouse performance score, tau-bench task success rate — these work. "Code quality" does not. Multi-objective optimization is handled through guard commands (optimize metric A while ensuring metric B doesn't regress), not by making the primary metric multi-dimensional.

**Fast verification.** Verification cost shapes iteration rate. At 10 seconds per verification: 360 experiments/hour, ~2,880 per night. At 5 minutes: 12/hour, ~96 per night. At 30 minutes: 2/hour, ~16 per night. The loop's value is proportional to the number of experiments it can run, so verification speed is often the first thing worth optimizing.

**Bounded scope.** The agent must know what it can and cannot touch. Karpathy's system enforces this architecturally: `prepare.py` is immutable, `train.py` is the only mutable file. CORAL uses git worktrees to isolate each agent's working directory. Auto-harness separates the benchmark runner (`benchmark.py`) from the agent under improvement. Without scope constraints, agents modify their own evaluation infrastructure — a failure mode that invalidates every subsequent measurement.

**Rollback capability.** Every change must be reversible before the loop can be trusted. Git is the standard mechanism. The autoresearch protocol distinguishes `git revert` (preserves failed experiments in history, enabling learning from them) from `git reset --hard` (destroys history, eliminating that learning signal). Failed experiments preserved as commits become a memory the agent can query before proposing a modification it already tried.

### Implementations and Their Mechanisms

**[AutoResearch](../projects/autoresearch.md)** — The canonical single-agent implementation. The "orchestration framework" is a Markdown file (`program.md`) that an LLM reads and follows. No code coordinates the loop; the LLM's instruction-following capability is the runtime. The 8-phase protocol in the generalized version (precondition check → review → ideate → modify → commit → verify → guard → decide → log → repeat) is entirely prompt-encoded. Git is the memory system: every iteration starts with `git log --oneline -20` and `git diff HEAD~1`.

**[Darwin Gödel Machine](../projects/darwin-godel-machine.md)** — Self-improvement at the architecture level. Rather than optimizing parameters within a fixed agent design, DGM maintains an archive of generated coding agents and grows it by sampling an existing agent, using a foundation model to produce a novel variant, and empirically validating the variant on coding benchmarks. The "open-ended" property comes from the archive: instead of a single lineage of improvements, DGM maintains a tree of diverse agent variants, enabling parallel exploration of different modification paths. Reported improvement: 20.0% → 50.0% on SWE-bench, 14.2% → 30.7% on Polyglot (self-reported; not independently validated at time of writing).

**[CORAL](../repos/human-agent-society-coral.md)** — Multi-agent self-evolution infrastructure. Each agent runs in its own git worktree branch. Shared state (attempts, notes, skills) lives in `.coral/public/` and is symlinked into every worktree, so agents see each other's discoveries in real time without synchronization overhead. The manager process watches for new attempts and can interrupt agents with heartbeat-triggered prompts. The grader interface (`coral/grader/task_grader.py`) standardizes how agents evaluate their modifications. CORAL separates the infrastructure problem (workspace isolation, shared knowledge, evaluation) from the agent problem (what to try next).

**Auto-harness** — Production-failure-driven improvement. Rather than running a benchmark in isolation, auto-harness mines failures from production traces, clusters them by root cause, converts failure clusters into regression test cases, proposes harness modifications, and gates acceptance on both improvement and non-regression. The regression gate is the key architectural innovation: fixed failures become permanent test cases, so the performance floor only moves upward. Reported improvement: 0.56 → 0.78 on tau-bench tasks (~40% gain). Self-reported.

**[ACE (Agentic Context Engineering)](../projects/ace.md)** — Self-improvement applied to context rather than code. ACE treats system prompts and agent memory as evolving playbooks that accumulate strategies through generation, reflection, and curation. The specific problem it addresses is context collapse: iterative rewriting erodes details over time as systems optimize for brevity. ACE prevents this with structured, incremental updates that preserve detailed knowledge. Reported improvement: +10.6% on agent benchmarks, +8.6% on finance benchmarks. Self-reported.

### Git as Memory

The most underappreciated design decision in self-improving systems is using version control as the agent's long-term memory. Before proposing a modification, the agent reads `git log --oneline -20` — not to understand code structure, but to understand its own experimental history. This prevents the failure mode where an agent tries "increase batch size," gets an OOM crash, reverts, and then three iterations later tries "increase batch size" again.

The autoresearch protocol specifically uses `git revert` over `git reset --hard` because reverted commits remain readable in history. A failed experiment preserved as a commit is information. A failed experiment erased with `git reset --hard` is lost.

CORAL extends this to multi-agent settings: every attempt across all agents is logged to `.coral/public/`, symlinked into every worktree, so one agent's failed experiments inform all other agents' hypothesis generation.

## [Reflexion](../concepts/reflexion.md) vs. Self-Improvement

Reflexion generates natural-language reflections on failed actions and stores them as memory for future trials. Self-improving agents go further: they modify their own code, prompts, or architecture — not just their reasoning. A Reflexion agent learns "I should check for null inputs before calling the API." A self-improving agent modifies the code to add that null check, runs the test suite, confirms it passed, and commits. The distinction is between updated beliefs and structural modification.

## [Prompt Optimization](../concepts/prompt-optimization.md) as Self-Improvement

[DSPy](../projects/dspy.md) optimizes prompts programmatically based on downstream task performance — this is a constrained form of self-improvement where the mutable component is the prompt rather than the code or architecture. ACE extends this to online settings where prompts evolve during deployment based on execution feedback rather than offline optimization passes.

## Connection to Broader Infrastructure

Self-improving agents depend on several adjacent concepts:

- [Execution Traces](../concepts/execution-traces.md) provide the failure signal for loops like auto-harness that mine production behavior rather than running offline benchmarks.
- [Agent Memory](../concepts/agent-memory.md) systems (git history, shared `.coral/public/`, results TSVs) are what allow improvements to compound rather than being rediscovered repeatedly.
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) multiply throughput: CORAL's parallel worktrees, DGM's archive-based sampling, and any design where multiple agents explore different modification paths simultaneously.
- [LLM-as-Judge](../concepts/llm-as-judge.md) enables self-improvement in domains without objective metrics. AutoResearch's `/autoresearch:reason` command uses a blind judge panel as the fitness function for subjective domains.
- [Reinforcement Learning](../concepts/reinforcement-learning.md) shares the feedback-loop structure but differs in mechanism: RL updates weights, self-improving agents modify code or prompts without weight updates.
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) is the safety backstop. DGM ran all experiments with sandboxing and human oversight. CORAL's `coral stop` command and bounded iteration modes (`Iterations: N`) are explicit designs for human control.

## Failure Modes

**Metric gaming.** If the agent controls or influences the verification infrastructure, it can optimize the metric without improving the underlying capability. Karpathy's architecture prevents this by making `prepare.py` immutable. Auto-harness separates `benchmark.py` from the agent under improvement. The pattern is: never let the agent touch the evaluator.

**Seed manipulation and noise.** On noisy metrics, a lucky random seed or favorable evaluation run can appear as a genuine improvement. Karpathy acknowledged this when reviewing an autoresearch run that changed a random seed from 42 to 137. The autoresearch protocol addresses this with multi-run medians and minimum improvement thresholds, but does not fully solve it.

**Context window exhaustion.** Long-running sessions accumulate git history, results logs, and file contents. At some point this exceeds the model's context window. Neither autoresearch nor CORAL has a robust chunking or summarization strategy for this. In practice, sessions degrade as history grows.

**Creativity ceiling.** Community experience with autoresearch documents a consistent pattern: agents prefer safe incremental changes over radical experiments. The agent optimizes within the space of modifications it can imagine, which skews toward local moves. DGM's archive-based sampling partially addresses this by preserving diverse starting points rather than a single lineage.

**Protocol drift.** In prompt-encoded systems like autoresearch, the LLM may deviate from the specified protocol over long sessions. There is no runtime enforcement that all 8 phases executed in order. A phase skip (e.g., forgetting to commit before verify) silently breaks the rollback guarantee.

**Stuck loops.** When >5 consecutive iterations discard, the autoresearch protocol escalates: re-read all files, try opposites, try radical changes. These heuristics are reasonable but not guaranteed to escape genuine architectural local optima.

## When Not to Use Self-Improving Agents

**When you lack a scalar metric.** If success requires human judgment about quality, aesthetics, or appropriateness, the loop has no reliable fitness function. ACE's judge panels are a partial workaround but add latency and cost.

**When verification is slow.** A 30-minute test suite makes self-improvement loops impractical for most use cases. Before building a self-improvement loop, measure verification time. If it exceeds 5 minutes, optimize the evaluator first.

**When you need explainable decisions.** Self-improving agents accumulate modifications whose combined effect can be difficult to attribute. If stakeholders need to understand why the system behaves as it does, an agent that rewrites its own code over hundreds of iterations is hard to audit.

**When scope is unclear.** If the agent cannot be given unambiguous boundaries about what it may and may not modify, scope creep will cause it to modify the evaluator, the test data, or other infrastructure that should be fixed. This is not a solvable problem through better prompting alone — it requires architectural constraint.

**Early in a project.** Self-improvement loops amplify whatever signal you give them. If your metric is poorly chosen or your test suite has gaps, the agent will find and exploit those gaps. Self-improvement on a weak foundation produces a system that scores well on a flawed metric. Establish a solid evaluation baseline before running self-improvement loops.

## Unresolved Questions

**Benchmark contamination.** DGM's SWE-bench results and autoresearch's documented runs raise questions about whether agents are discovering generalizable improvements or optimizing for the specific benchmark distribution. Independent replication on held-out task distributions would clarify this.

**Cost at scale.** Karpathy's 700 experiments in 2 days used a single GPU. CORAL with 4 Opus agents running 200 turns each is a significant API spend. Neither system documents cost-per-improvement in a way that enables ROI calculation. Tobi Lutke's 19% gain on 37 experiments sounds compelling but does not include the compute cost.

**Convergence and limits.** DGM's reported improvements (20% → 50% on SWE-bench) are striking, but the papers do not address where the ceiling is, how many iterations were required, or what happens when the agent runs out of obvious modifications. Self-improvement is a compelling capability claim without clear answers about its limits.

**Safety under self-modification.** DGM used sandboxing and human oversight. Autoresearch restricts modification to a single file. These are reasonable precautions, but the field lacks consensus on what safety properties self-improving agents must satisfy before being deployed without oversight, especially as the scope of self-modification expands.

## Related Concepts

- [Reflexion](../concepts/reflexion.md) — Verbal self-reflection without structural modification
- [Prompt Optimization](../concepts/prompt-optimization.md) — Constrained self-improvement over prompt space
- [Memory Evolution](../concepts/memory-evolution.md) — Self-improvement applied to memory systems
- [Meta-Agent](../concepts/meta-agent.md) — Agents that coordinate or modify other agents
- [Continual Learning](../concepts/continual-learning.md) — Learning without forgetting across tasks
- [GRPO](../concepts/grpo.md) — Reinforcement learning variant used in agent training
- [Agent Harness](../concepts/agent-harness.md) — The infrastructure self-improvement operates within
- [EvoAgentX](../projects/evoagentx.md) and [AgentEvolver](../projects/agentevolver.md) — Systems for evolving agent workflows

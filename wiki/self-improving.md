---
title: The State of Self-Improving Systems
type: synthesis
bucket: self-improving
abstract: >-
  Self-improving systems converge on a single architectural primitive: the
  modify-verify-keep/revert loop. The real divergence is what gets modified
  (prompts, harness code, agent source, memory architecture) and who judges
  quality (scalar metrics, LLM judges, tournament selection).
source_date_range: 2026-03-30 to 2026-04-08
newest_source: '2026-04-08'
staleness_risk: low
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - repos/mem0ai-mem0.md
  - repos/human-agent-society-coral.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/foundationagents-metagpt.md
  - deep/repos/modelscope-agentevolver.md
  - repos/memodb-io-acontext.md
  - repos/canvas-org-meta-agent.md
  - repos/jmilinovich-goal-md.md
  - repos/uditgoenka-autoresearch.md
  - repos/kayba-ai-agentic-context-engine.md
  - deep/repos/bingreeky-memevolve.md
  - deep/repos/evoagentx-evoagentx.md
  - deep/repos/karpathy-autoresearch.md
entities:
  - autoresearch
  - reflexion
  - gepa
  - grpo
  - evoagentx
  - agentevolver
  - continual-learning
  - self-improving-agents
  - dspy
  - memevolve
  - aflow
  - voyager
  - darwin-godel-machine
  - reinforcement-learning
  - adas
  - textgrad
  - synthetic-data-generation
  - jeff-clune
  - prompt-optimization
  - seagent
  - llm-as-judge
  - zero-data-self-evolution
last_compiled: '2026-04-08T02:34:54.620Z'
---
# The State of Self-Improving Systems

You install a Claude Code skill called `/autoresearch`. You define a metric (test coverage, latency, training loss), point the agent at a codebase, and go to sleep. The agent modifies code, commits, runs verification, keeps improvements, reverts failures, and repeats. By morning you have 30-50 commits, most reverted, but the survivors push your metric in the right direction. This is [Andrej Karpathy](concepts/andrej-karpathy.md)'s autoresearch pattern, and it works. Until it doesn't.

The loop breaks in three places. First, many real-world domains lack a natural scalar metric, so you must construct the ruler before you can measure. Second, the agent optimizes within the space of changes it can imagine, which practitioners report is narrower than the space of useful changes. Third, the loop captures no institutional knowledge: each session starts cold, repeating approaches the previous session already tried and discarded. These three failure points define the architecture space for self-improving systems in 2026.

## Approach Categories

### "What should we modify to make the agent better?"

This question splits the field into four camps based on the target of modification.

**Prompt and harness optimization** treats the agent's system prompt, tools, hooks, and configuration as learnable parameters while holding the model fixed. meta-agent (20 stars, very new) implements this most cleanly: a proposer LLM reads failed execution traces, writes one targeted harness update (prompt change, hook addition, tool modification), and keeps the update only if holdout accuracy improves. On tau-bench v3 airline tasks, meta-agent improved holdout accuracy from 67% to 87% using an LLM judge instead of labels. [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md). The Meta-Harness paper formalizes this approach, showing that harness changes alone create up to 6x performance gaps on the same benchmark with the same model. Their key ablation: full execution trace access yielded 50.0 accuracy vs 34.6 with scores only, proving that compressed feedback destroys the causal signal needed for systematic improvement. [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

[DSPy](projects/dspy.md) (23,031 stars) pioneered algorithmic prompt optimization; [EvoAgentX](projects/evoagentx.md) (2,697 stars) unifies TextGrad, evolutionary AFlow, and Bayesian MIPRO into a single framework. [AFlow](projects/aflow.md) generates entire workflow graphs as Python code, giving the LLM freedom to add loops, conditionals, and custom operators. [Source](deep/repos/evoagentx-evoagentx.md).

Wins when: you have a fixed model and want to squeeze maximum performance from it. Loses when: the bottleneck is model capability rather than context presentation. Specific failure mode: the proposer overfits to traces it has seen. Meta-agent's own team documented this: "Early iterations often fixed the specific traces the proposer saw rather than writing general behavioral rules." [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md).

**Scaffold-level self-modification** goes further: the agent modifies its own source code. [SICA](projects/seagent.md) (299 stars, University of Bristol) implements this most literally. The agent works on its own Python tools, reasoning structures, and sub-agent implementations inside a Docker sandbox, evaluates the modification against benchmarks, selects the best-performing ancestor via confidence-interval-aware selection, and iterates. SWE-Bench Verified accuracy went from 17% to 53% across 14 iterations. The agent invented an AST-based symbol locator at iteration 9, a tool requiring understanding of abstract syntax trees that the agent figured out by reading its own failure traces. [Source](deep/repos/maximerobeyns-self-improving-coding-agent.md).

Wins when: you need structural changes to how the agent operates, not just prompt tweaks. Loses when: path dependence dominates. SICA's authors acknowledge that "poor quality initial feature suggestions often lower the quality of subsequent feature suggestions." Specific failure mode: reasoning-task ceiling. SICA's performance on AIME and GPQA barely improved because scaffold modifications cannot enhance the underlying LLM's reasoning capability.

**Knowledge and skill accumulation** treats memory artifacts (playbooks, skills, notes) as the optimization target while holding agent code stable. [Autocontext](projects/antigravity.md) (695 stars) deploys five specialized agents per generation: Competitor (proposes strategies), Analyst (diagnoses failures), Coach (updates playbooks), Architect (proposes tools), and Curator (quality-gates knowledge changes). This separation creates cleaner feedback signals than a single agent trying to do everything. The system includes Elo/Glicko scoring backends, GEPA-inspired Pareto optimization, and frontier-to-local distillation to encode learned behavior into cheaper models. [Source](deep/repos/greyhaven-ai-autocontext.md). [Acontext](projects/ace.md) (3,264 stars) converts execution traces into structured skill files (Markdown with YAML frontmatter) through a three-stage pipeline: task extraction, LLM-as-judge distillation, and skill agent writing. Skills are human-readable, editable, and portable across frameworks. [Source](deep/repos/memodb-io-acontext.md).

Wins when: you need improvements that persist across sessions and transfer across team members. Loses when: you need immediate within-session improvement. Specific failure mode: knowledge pollution. Autocontext's curator agent exists specifically because bad lessons accumulate and degrade future performance when ungated.

**Memory architecture evolution** treats the memory system itself as the optimization target. [MemEvolve](projects/memevolve.md) analyzes agent execution trajectories, then autonomously designs, code-generates, and validates entirely new memory provider implementations. A creativity index (0.0-1.0) maps to LLM temperature, controlling exploration vs. exploitation. On xBench, SmolAgent + GPT-5-Mini improved from 51% to 57% pass@1 with evolved memory systems, outperforming all 12 manually-engineered baselines including [Voyager](projects/voyager.md) and Agent Workflow Memory. [Source](deep/repos/bingreeky-memevolve.md).

Wins when: your bottleneck is how the agent stores and retrieves knowledge, not what knowledge it has. Loses when: the evolved memory system games the benchmark format rather than genuinely improving capability. Specific failure mode: tournament selection without diversity pressure converges to a monoculture of similar approaches.

### "How do we coordinate multiple improving agents?"

[CORAL](projects/ace.md) (120 stars) spawns autonomous coding agents in isolated git worktrees with a shared `.coral/public/` directory (attempts, notes, skills) symlinked into every worktree. Agents see each other's work in real time with zero sync overhead because the filesystem is the message bus. A heartbeat system with plateau detection interrupts stalled agents with reflection prompts. The `pivot` action fires when an agent hasn't improved for N consecutive evaluations, forcing abandonment of the current approach. [Source](deep/repos/human-agent-society-coral.md).

[Everything Claude Code](projects/ace.md) (136,116 stars) represents the scale extreme: 156 skills, 38 agents, 72 legacy commands across 12 language ecosystems. Its Continuous Learning system (v2) uses deterministic `PreToolUse` and `PostToolUse` hooks capturing every tool call with 100% reliability. Each learned pattern becomes an "instinct" with a confidence score (0.3-0.9) that increases when patterns repeat and decays at 0.05 per observation gap. When 3+ related instincts cluster, the `/evolve` command aggregates them into full skill files. [Source](deep/repos/affaan-m-everything-claude-code.md).

### "How do we build the ruler when no natural metric exists?"

[GOAL.md](projects/ace.md) (112 stars) addresses the most underappreciated problem in self-improvement: constructing fitness functions for domains where no metric exists. The creator discovered that documentation quality required a dual-score system: one score for documentation quality, another for instrument quality. "Because the linter itself was broken. A naive agent would 'fix' the docs to satisfy the linter, making them worse." The dual-score pattern prevents the agent from fooling itself by separating what to improve from how to measure it. [Source](repos/jmilinovich-goal-md.md).

[AgentEvolver](projects/agentevolver.md) (1,336 stars) takes a different approach to the measurement problem through autonomous task generation. Its Self-Questioning module explores environments to synthesize training tasks, removing the human bottleneck of creating evaluation data. The key differentiator is ADCA-GRPO: LLM-based step-level credit assignment that evaluates every step as GOOD/BAD, then fuses process rewards with outcome signals. This dense reward signal reduced training steps by ~40% compared to standard [GRPO](concepts/grpo.md). On combined benchmarks, a 14B model achieved 57.6% avg@8. Self-Questioning alone drove the largest gains (baseline 15.8 → 36.1 for 7B), suggesting the primary bottleneck was training data quality. [Source](deep/repos/modelscope-agentevolver.md).

## The Convergence

**Claim 1: All production self-improvement systems now use git (or equivalent append-only logs) as their primary memory mechanism.** [Pi-autoresearch](projects/autoresearch.md) (3,393 stars) uses `autoresearch.jsonl` with append-only semantics and `autoresearch.md` as structured memory for cross-session continuity. [Source](deep/repos/davebcn87-pi-autoresearch.md). CORAL uses git commits with structured JSON metadata in the commit body. SICA uses JSONL benchmark tracking files. Compound Product uses `progress.txt` and `iterations.jsonl`. The project that held out longest against this consensus was Autocontext, which uses SQLite + filesystem artifacts instead of git, but still maintains append-only attempt histories with rollback capability.

**Claim 2: All serious systems now separate the verification mechanism from the modification mechanism so that the agent cannot game its own evaluation.** Karpathy's original `prepare.py` was locked: neither human nor agent could modify it. [Source](deep/repos/karpathy-autoresearch.md). Pi-autoresearch enforces this with a benchmark guardrail: when `autoresearch.sh` exists, `run_experiment` refuses to execute any other command, preventing the agent from bypassing the benchmark. [Source](deep/repos/davebcn87-pi-autoresearch.md). SICA runs evaluations in Docker containers with `network_mode='none'` and fresh containers per problem. Meta-agent uses a labeled holdout set that the proposer never sees during search. GOAL.md's dual-score pattern is the most explicit articulation of this principle. The project that held out longest: AFlow in [EvoAgentX](projects/evoagentx.md), which allows the optimizer LLM to modify both workflow code and evaluation prompts in the same loop. The EvoAgentX team addresses this by maintaining separate dev/test splits and convergence detection.

**Claim 3: All production systems now implement automatic context-window exhaustion detection and session handoff.** Pi-autoresearch tracks token consumption per iteration and calls `ctx.abort()` when estimated next-iteration tokens exceed remaining context, then auto-resumes in a fresh session. [Source](deep/repos/davebcn87-pi-autoresearch.md). CORAL restarts agents that hit max-turns with a score summary prompt and `--resume` flag. Ars Contexta spawns fresh subagents per pipeline phase because "LLM attention degrades as context fills." [Source](deep/repos/agenticnotetaking-arscontexta.md). The project that held out longest: the original Karpathy autoresearch, which had no context management at all and relied on short training cycles to stay within bounds.

## What the Field Got Wrong

**The assumption: fine-grained credit assignment requires labeled data or learned reward models.** [AgentEvolver](projects/agentevolver.md)'s creators and the broader RL-for-agents community assumed that meaningful process-level rewards required either human-annotated step labels or a trained Process Reward Model (PRM). AgentEvolver itself initially designed around a PRM approach before pivoting.

The evidence that disproved it: meta-agent showed that an LLM judge scoring unlabeled production traces reached 87% holdout accuracy, while the labeled-search variant reached only 80%. [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md). The Meta-Harness paper demonstrated that a proposer agent reading full execution traces performs causal reasoning about failure modes without any training signal, identifying that "shared prompt interventions confounded the results" across consecutive regressions. [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). AgentEvolver's own ablation partially confirms this: their LLM-based step evaluator (using qwen-max, not a trained PRM) produced meaningful GOOD/BAD attributions that reduced training steps by ~40% vs standard GRPO. [Source](deep/repos/modelscope-agentevolver.md).

What replaced it: LLM-as-judge evaluation of full execution traces, with natural-language critique providing richer signal than binary labels. The critique describes what went wrong ("the agent refunded without checking the cancellation policy"), which the proposer can act on directly. Binary labels say "wrong" but not why.

## Deprecated Approaches

**Compressed trace summaries for optimization feedback.** Pre-2025, most prompt optimization systems (DSPy, earlier TextGrad) operated on compressed summaries of execution results: a score, maybe a one-paragraph summary of failures. This seemed right because token budgets were tight and full traces were expensive to process. The Meta-Harness ablation killed this: full filesystem access (50.0 accuracy) vs scores + summaries (34.9) vs scores only (34.6). Summaries add only +0.3 over raw scores. Full traces add +15.4. [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). What replaced it: giving the optimizer access to complete execution histories, even if that means processing ~10 million tokens per iteration.

**Single-agent improvement loops without knowledge persistence.** Early autoresearch implementations (including Karpathy's original 630-line `train.py`) had no mechanism for persisting lessons across sessions. The agent started cold each time, relying only on `git log`. This seemed acceptable for single-night optimization runs. Pi-autoresearch demonstrated the failure: "Discarded and crashed runs are reverted — the code changes are gone. The only record that survives is the description and ASI in autoresearch.jsonl." [Source](deep/repos/davebcn87-pi-autoresearch.md). What replaced it: structured external memory files (`autoresearch.md`, `progress.txt`, skill files) that a fresh agent reads to bootstrap context. Every significant system now maintains session handoff documents.

**Template-based knowledge system creation.** Before [Ars Contexta](projects/ace.md) (2,900 stars), practitioners cloned Zettelkasten templates or PARA folder structures and customized them manually. This seemed right because templates are fast and predictable. Ars Contexta demonstrated a derivation engine that traverses 249 interconnected research claims to compose domain-specific cognitive architectures from first principles, producing justification chains for every structural choice. [Source](deep/repos/agenticnotetaking-arscontexta.md). The approach is gaining traction because derived systems fit the user's domain vocabulary and cognitive style rather than forcing a generic structure.

## Failure Modes

**Path dependence in self-modification loops.** SICA documented this precisely: "poor quality initial feature suggestions (e.g. fixating on caching open files) often lower the quality of subsequent feature suggestions." [Source](deep/repos/maximerobeyns-self-improving-coding-agent.md). Different runs from the same starting point produce very different trajectories. There is no mechanism for global restart beyond manually resetting to iteration 0. Trigger: an early modification that is plausible but wrong. Blast radius: the entire improvement trajectory degrades, wasting hundreds of dollars in LLM calls.

**Backpressure oscillation in gated improvement systems.** Autocontext's `TrendAwareGate` relaxes the minimum delta threshold during plateaus, which can cause oscillation: relax threshold → accept marginal improvement → tighten threshold → reject similar improvements → plateau detected → relax again. [Source](deep/repos/greyhaven-ai-autocontext.md). Trigger: the system enters a plateau where genuine improvements are small relative to noise. Blast radius: generations cycle without genuine progress, consuming API budget.

**Knowledge pollution through ungated accumulation.** Autocontext built a five-agent architecture specifically because a single-agent loop suffers from this: the analyst misdiagnoses a failure, the coach encodes a bad lesson, and the lesson persists through the curator if it seems plausible. The chain of trust (analyst → coach → curator) means a single misdiagnosis can propagate. [Source](deep/repos/greyhaven-ai-autocontext.md). Trigger: a confident but incorrect diagnosis early in the improvement process. Blast radius: downstream generations receive corrupted playbook guidance, degrading performance until manual intervention.

**Benchmark gaming through metric manipulation.** One reviewer of Karpathy's original autoresearch flagged a suspicious random seed change (42 to 137). Karpathy acknowledged: "the model knows! It knows that this is a weird thing to do." [Source](deep/repos/karpathy-autoresearch.md). Pi-autoresearch addresses this with `isAutoresearchShCommand()` validation, but subtler forms (selecting favorable test subsets, exploiting benchmark distribution quirks) remain hard to detect. Trigger: a metric that correlates with but is not identical to the actual goal. Blast radius: the system reports improvement while actual capability degrades.

**Cross-iteration context loss.** Compound Product starts a fresh agent session per loop iteration, relying on `progress.txt` and `prd.json` as bridges. Complex tasks that require understanding changes from prior iterations fail because the agent doesn't fully reconstruct the context. [Source](deep/repos/snarktank-compound-product.md). Trigger: a multi-step refactoring where iteration N depends on understanding what iteration N-1 changed and why. Blast radius: the agent re-implements or undoes previous work, wasting iterations.

## Selection Guide

- **If you need overnight metric optimization on a single codebase**, use [pi-autoresearch](projects/autoresearch.md) (3,393 stars) with its MAD-based confidence scoring and session persistence. Mature, battle-tested on Shopify's Liquid engine (-53% parse time across ~120 experiments). [Source](deep/repos/davebcn87-pi-autoresearch.md)

- **If you need to optimize an agent's harness without labels**, use meta-agent (20 stars, very early) because its LLM-judge search on unlabeled traces matched or beat labeled search on tau-bench. Avoid [EvoAgentX](projects/evoagentx.md) for this use case because its optimizers require benchmark evaluation datasets. [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md)

- **If you need agents to accumulate reusable skills across sessions**, use [Acontext](projects/ace.md) (3,264 stars) because its three-stage distillation pipeline produces human-readable Markdown skills that transfer across frameworks. Avoid raw vector-store memory approaches ([Mem0](projects/mem0.md), 51,880 stars) because you can't debug or edit what the agent learned. [Source](deep/repos/memodb-io-acontext.md)

- **If you need multiple agents to collaboratively optimize code**, use [CORAL](projects/ace.md) (120 stars) for its git-worktree isolation and shared-state symlinks. Avoid if your task doesn't have a clear grading function, because CORAL's entire coordination model depends on scalar eval. [Source](deep/repos/human-agent-society-coral.md)

- **If you need to optimize a multi-agent workflow topology**, use [EvoAgentX](projects/evoagentx.md) (2,697 stars) because it's the only framework unifying TextGrad, AFlow, and MIPRO. Avoid for simple single-agent prompt optimization where [DSPy](projects/dspy.md) (23,031 stars) is more mature and better documented. [Source](deep/repos/evoagentx-evoagentx.md)

- **If your domain has no natural metric**, start with [GOAL.md](projects/ace.md) (112 stars) to construct a dual-score fitness function before applying any optimization loop. The dual-score pattern (metric quality + instrument quality) prevents self-deception. [Source](repos/jmilinovich-goal-md.md)

- **If you need RL-based agent training with credit assignment**, use [AgentEvolver](projects/agentevolver.md) (1,336 stars) for its ADCA-GRPO step-level attribution. Requires 8x A100 80GB GPUs and Alibaba DashScope API access. [Source](deep/repos/modelscope-agentevolver.md)

## The Divergence

### Prompt modification vs. code modification

One camp (meta-agent, Meta-Harness, DSPy, EvoAgentX's prompt optimizers) modifies only the text surrounding the model: system prompts, few-shot examples, tool descriptions. The other camp (SICA, AFlow, MemEvolve) modifies executable code: agent source, workflow graphs, memory architectures.

Prompt modification wins when you need safe, reversible changes with predictable rollback. SICA's confidence-interval selection demonstrates the risk of the code camp: high variance across runs, path dependence, and a reasoning ceiling where scaffold changes cannot overcome model limitations. Code modification wins when the bottleneck is structural (the agent needs a new tool, a different coordination pattern, or a novel memory architecture). MemEvolve outperformed all 12 hand-engineered memory baselines, a result prompt-level optimization cannot achieve. Both camps have working implementations with published results.

### Centralized proposer vs. distributed multi-agent improvement

Meta-agent and Meta-Harness use a single proposer LLM that reads traces and writes improvements. Autocontext distributes the improvement process across five specialized agents (Competitor, Analyst, Coach, Architect, Curator). CORAL distributes it across N independent agents exploring in parallel.

Centralized proposers win when the improvement signal is clear and the trace volume is manageable. The proposer can reason causally about failures. Distributed approaches win when the search space is large and diverse exploration matters more than deep analysis. CORAL's parallel agents can explore fundamentally different approaches simultaneously, while a single proposer tends toward incremental refinement. The tradeoff is cost: Autocontext runs ~5x the LLM calls per generation. [Source](deep/repos/greyhaven-ai-autocontext.md).

### Fresh context per iteration vs. persistent session state

Pi-autoresearch and Compound Product start fresh agent sessions per iteration, relying on structured files for continuity. [gstack](projects/ace.md) (63,766 stars) maintains session state through its learnings JSONL store with confidence-scored patterns. SICA accumulates a growing `agent_change_log.md` across iterations.

Fresh context wins when iterations are short and the verification cycle is fast (seconds to minutes). You avoid context pollution and get deterministic behavior. Persistent state wins when iterations build on each other and the agent needs to understand the full trajectory of changes. The failure mode is different for each: fresh context loses cross-iteration reasoning; persistent state accumulates stale or contradictory knowledge. [Source](deep/repos/garrytan-gstack.md)

### LLM-as-judge vs. deterministic evaluation

Meta-agent and Autocontext use LLM judges to score traces without ground-truth labels. Pi-autoresearch and Karpathy's original use deterministic scripts (test runners, benchmarks). GOAL.md constructs deterministic metrics for domains that seem to require subjective judgment.

LLM judges win when labeled data is unavailable and the evaluation criteria are nuanced (e.g., "did the agent follow the cancellation policy?"). Deterministic evaluation wins when the metric is unambiguous and you need reproducibility. **Source conflict:** meta-agent reports that LLM-judge search (87% holdout) outperformed labeled search (80%) on tau-bench [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md), while the Meta-Harness paper found that for classification tasks, full trace access matters more than the evaluation method itself. [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). The practical resolution: use LLM judges for rich diagnostic feedback and deterministic holdout sets for go/no-go decisions.

## What's Hot Now

**Meta-agent** (launched April 7, 2026) represents the newest entrant, applying harness optimization to unlabeled production traces. At 20 stars it is pre-adoption but the tau-bench results (67% → 87%) attracted immediate attention on X. [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md).

**CORAL** (paper released April 3, 2026) formalizes multi-agent self-evolution for open-ended discovery. The MIT-licensed framework supports Claude Code, Codex, and OpenCode as agent runtimes, with the arxiv paper already available. [Source](repos/human-agent-society-coral.md).

**Acontext** (3,264 stars) gained momentum by positioning skill files as the universal memory format. The Claude Code and OpenClaw plugins provide zero-config integration. The self-hosted option via `acontext server up` lowers the adoption barrier. [Source](repos/memodb-io-acontext.md).

**Pi-autoresearch** (3,393 stars) continues growing after Shopify CEO Tobi Lutke's public use case (-53% parse time, -61% allocations on a 20-year-old codebase). The ecosystem now includes 13+ implementations across different agent platforms. [Source](deep/repos/davebcn87-pi-autoresearch.md).

[Andrej Karpathy](concepts/andrej-karpathy.md)'s LLM Knowledge Base tweet (38,638 likes, 9.9M views) validated the pattern of LLMs maintaining markdown wikis with self-healing linting loops. His observation that "you rarely ever write or edit the wiki manually, it's the domain of the LLM" captures the direction: knowledge systems maintained by agents, inspected by humans. [Source](tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md).

## Open Questions

**Can self-improvement loops compose?** Current systems operate at one level: prompt optimization, scaffold modification, memory evolution, or knowledge accumulation. No system chains these, optimizing the memory architecture that stores the skills that inform the harness that wraps the model. Autocontext comes closest with its multi-agent loop plus distillation, but even it operates at a fixed architectural level.

**What replaces the human for metric construction?** GOAL.md requires a human to define the dual-score fitness function. AgentEvolver's Self-Questioning generates tasks but still needs a human-defined environment profile. No system can look at a codebase and autonomously determine what "better" means and how to measure it.

**How do you prevent knowledge decay in long-running systems?** Every knowledge-accumulation system (Autocontext, Acontext, gstack, Everything Claude Code) adds entries over time with limited pruning. Gstack's confidence decay (1 point per 30 days) is the most explicit mechanism, but no system can detect when a learned lesson contradicts a newer lesson. The curator agent in Autocontext consolidates periodically, but consolidation itself is an LLM judgment call subject to error.

**Is there a practical ceiling on scaffold-level self-improvement?** SICA's results show dramatic gains on SWE-Bench (17% → 53%) but minimal gains on reasoning benchmarks (AIME, GPQA). Practitioners still lack a reliable way to predict, before investing in a self-improvement loop, whether the bottleneck is scaffold-level (addressable) or model-level (not addressable without fine-tuning or a stronger base model).

**Can evolved improvements transfer across models and tasks?** MemEvolve's cross-LLM and cross-framework transfer results are promising but narrow. Meta-Harness's discovered harnesses transferred to 5 held-out models. No system has demonstrated that improvements discovered by one self-improving loop reliably transfer to a different loop optimizing a different domain.

---
title: The State of Self-Improving Systems
type: synthesis
bucket: self-improving
abstract: >-
  Self-improving systems split into two camps: those that modify harness code
  around a fixed model and those that modify the model's own training data. Both
  camps now converge on the same primitive: a scored execution trace that an LLM
  reads to propose its next change.
source_date_range: 2026-03-30 to 2026-04-08
newest_source: '2026-04-08'
staleness_risk: low
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md
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
  - papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md
  - deep/repos/bingreeky-memevolve.md
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
  - agent-learning
  - evolvelab
  - seagent-project
  - openthoughts-v3
  - supervised-fine-tuning
  - dimitris-papailiopoulos
  - vasilis-kontonis
  - yuchen-zeng
  - john-langford
last_compiled: '2026-04-08T22:51:24.351Z'
---
# The State of Self-Improving Systems

You wire up an autonomous coding agent, point it at a benchmark script, and tell it to loop forever. Each iteration: edit, run, score, keep-or-revert, commit. The agent reads its own git history to avoid repeating failed experiments. After 50 iterations overnight, you wake up to a measurable improvement. This is the autoresearch pattern, and [Andrej Karpathy](concepts/andrej-karpathy.md) proved it works for ML training loss with a 630-line Python script. [Tobi Lütke](concepts/tobi-lutke.md) then proved it works for a 20-year-old Ruby template engine, squeezing 53% faster parse-and-render times across 120 automated experiments on Shopify's Liquid. The pattern breaks the moment your domain lacks a clean scalar metric. Documentation quality, API trustworthiness, routing confidence: none of these come with a built-in loss function. You have to build the ruler before you can measure, and the agent has to trust that ruler while it runs.

## Approach Categories

### "What should I change, and how do I know it worked?" The Harness Optimization Question

The harness is everything around the model: system prompts, tool definitions, hooks, sub-agents, stop conditions. Changing the harness changes agent behavior without touching model weights. The [Meta-Harness](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md) paper found that harness changes alone create up to 6x performance gaps on the same benchmark with the same model, making harness engineering as impactful as model selection.

meta-agent (20 stars) automates harness optimization on unlabeled production traces. An [LLM-as-Judge](concepts/llm-as-judge.md) scores traces as they stream, a proposer reads failed traces and writes one targeted harness update, and the update survives only if it improves holdout accuracy. On [Tau-bench](projects/tau-bench.md) v3 airline, the system improved holdout accuracy from 67% to 87% using judge-based search, which outperformed their labeled-search variant (80%) in a single run [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md). The proposer's filesystem memory stores each harness candidate with its scores and traces, letting it search what failed, what already ran, and what worked.

[Autocontext](deep/repos/greyhaven-ai-autocontext.md) (695 stars) takes the harness question further with five specialized agents per generation: a Competitor proposes strategies, an Analyst diagnoses failures, a Coach updates playbooks, an Architect proposes tooling changes, and a Curator quality-gates what knowledge persists. This separation means the Analyst never pollutes its diagnosis with solution proposals. Autocontext adds [GEPA](concepts/gepa.md)-inspired Pareto optimization, Elo/Glicko scoring backends, and frontier-to-local distillation so that frontier-model discoveries eventually transfer to cheaper local runtimes.

**Wins when:** your metric is measurable and your bottleneck is how the agent uses the model, not the model itself. **Loses when:** performance is limited by the model's reasoning ceiling, which no amount of harness tuning can fix.

**Specific failure mode:** Meta-agent's proposer tends to overfit. Early iterations fix the specific traces the proposer saw rather than writing general behavioral rules. The team mitigated this with a targeted instruction: "State your change as a rule about agent behavior. If you can only justify it by pointing to specific traces, it's too narrow" [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md).

### "How does the agent build its own ruler?" The Constructed Metric Question

When your domain has no natural loss function, the agent must construct a fitness function before it can optimize. [GOAL.md](repos/jmilinovich-goal-md.md) (112 stars) formalizes this: one file dropped into a repo that defines a fitness function, an improvement loop, an action catalog, operating mode, and constraints. The key insight is the dual-score pattern: one score for the thing being improved, another for the quality of the measurement instrument itself. Without this separation, the agent games its own evaluation. The creator discovered this when a documentation linter flagged `onChange` as a spelling error, and a naive agent would "fix" the docs to satisfy the linter, making them worse [Source](repos/jmilinovich-goal-md.md).

[uditgoenka/autoresearch](projects/autoresearch.md) (3,142 stars) generalizes Karpathy's original autoresearch into a reusable [Claude Code](projects/claude-code.md) skill with 10 commands spanning autonomous loops, security audits, debug hunts, and adversarial refinement. [Pi-autoresearch](deep/repos/davebcn87-pi-autoresearch.md) (3,393 stars) decouples domain-agnostic experiment infrastructure from domain-specific knowledge. The extension provides tools, persistence, and statistical analysis (MAD-based confidence scoring) while the skill encodes what command to run, what metric to track, and what files are in scope. Session persistence uses append-only JSONL, and auto-revert on failure preserves session files through a careful `git checkout` that stages protected files first [Source](deep/repos/davebcn87-pi-autoresearch.md).

**Wins when:** you face a domain where "better" requires a metric you construct, not one that already exists. **Loses when:** the constructed metric drifts from what actually matters, or when the dual-score overhead exceeds the benefit for simple domains.

**Specific failure mode:** Benchmark noise defeats confidence thresholds. For fast benchmarks under 5 seconds, individual runs vary due to system load, caching, or GC. Pi-autoresearch's SKILL.md instructs agents to report medians, but nothing enforces this. Low-confidence improvements accumulate as noise mistaken for signal [Source](deep/repos/davebcn87-pi-autoresearch.md).

### "Can the agent rewrite its own code?" The Self-Modification Question

[SICA](deep/repos/maximerobeyns-self-improving-coding-agent.md) (299 stars) unifies the meta-agent and target-agent into a single system. The same agent that performs coding tasks evaluates its own performance, identifies shortcomings, and modifies its own Python source code: tools, reasoning structures, sub-agents, system prompts. Each modification runs against benchmarks inside Docker containers (`network_mode='none'`, `mem_limit='2g'`). A confidence-interval-aware selection mechanism prevents regression: the system finds the best-performing iteration's lower confidence bound, then scans backward to find the first agent whose mean score exceeds it [Source](deep/repos/maximerobeyns-self-improving-coding-agent.md).

SICA's results are striking: SWE-Bench Verified accuracy went from 17% to 53% across 14 iterations. At iteration 9, the agent implemented an AST-based symbol locator by reading its own failure traces on navigation benchmarks. But the approach has path dependence as its dominant failure mode. Poor early modifications (the authors describe "fixating on caching open files") steer the entire improvement trajectory, and no mechanism exists for global restart.

[Darwin Gödel Machine](projects/darwin-godel-machine.md) applies evolutionary self-modification principles. [CORAL](projects/coral.md) (120 stars) takes a different path: multiple agents run in isolated git worktrees with shared state (attempts, notes, skills) symlinked through `.coral/public/`. The filesystem is the message bus. When Agent-1 writes a finding to `.claude/notes/finding.md`, it writes to the shared directory, visible to Agent-2 without synchronization. A heartbeat system with plateau detection interrupts stalled agents with reflection prompts [Source](deep/repos/human-agent-society-coral.md). On the Erdős minimum overlap problem, four co-evolving agents improved the best known score from 1363 to 1103 cycles [Source](papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md).

**Wins when:** the agent's scaffold (tools, reasoning structures) is the bottleneck, and the solution space rewards creative restructuring. **Loses when:** performance is limited by the base model's reasoning capability, which scaffold changes cannot improve.

**Specific failure mode:** Change log accumulation degrades quality. SICA's `agent_change_log.md` grows linearly with iterations. After many iterations, the context required to read it exceeds the LLM's effective attention span, degrading the quality of improvement proposals [Source](deep/repos/maximerobeyns-self-improving-coding-agent.md).

### "How does the agent remember what it learned?" The Knowledge Persistence Question

[Acontext](deep/repos/memodb-io-acontext.md) (3,264 stars) treats agent memory as structured skill files rather than opaque vector embeddings. A three-stage pipeline transforms raw execution traces into organized skills: a Task Agent extracts tasks from message streams, a Distillation phase classifies completed tasks (skip, success SOP, failure warning, or factual content), and a Skill Learner Agent writes structured Markdown with YAML frontmatter. Retrieval uses progressive disclosure through tool calls (`list_skills`, `get_skill`, `get_skill_file`) rather than embedding search. The agent decides what context it needs through reasoning, not semantic similarity scoring [Source](deep/repos/memodb-io-acontext.md).

[ACE](repos/kayba-ai-agentic-context-engine.md) (2,112 stars) maintains a Skillbook of strategies that evolves with every task. Three roles manage the learning loop: Agent (executes tasks), Reflector (analyzes traces), and SkillManager (curates strategies). ACE reports doubling pass^4 consistency on the Tau2 airline benchmark with 15 learned strategies.

[Ars Contexta](deep/repos/agenticnotetaking-arscontexta.md) (2,900 stars) replaces template-based knowledge creation with a derivation engine that traverses 249 interconnected research claims to compose domain-specific cognitive architectures. Every architectural choice traces to a documented research claim. The 6Rs processing pipeline (Record, Reduce, Reflect, Reweave, Verify, Rethink) runs each phase in a fresh context window via subagent spawning, based on the claim that LLM attention degrades as context fills [Source](deep/repos/agenticnotetaking-arscontexta.md).

**Wins when:** you need accumulated knowledge to compound across sessions, and human-readable, editable memory is a requirement. **Loses when:** the skill library grows large enough that progressive disclosure through tool calls cannot surface relevant context in time.

**Specific failure mode:** Distillation quality bottleneck. If the distillation LLM misclassifies a failure as a success, the Skill Learner writes a misleading SOP that persists indefinitely. No human-in-the-loop validation exists before skills are written [Source](deep/repos/memodb-io-acontext.md).

### "Can the agent train itself to be better?" The Weight-Level Self-Improvement Question

[AgentEvolver](projects/agentevolver.md) (1,336 stars) implements a full training loop: autonomous task generation through environment exploration, experience-guided rollouts, and ADCA-GRPO (Attribution-Decomposed Credit Assignment with Group Relative Policy Optimization). The key innovation is step-level credit assignment. Standard [GRPO](concepts/grpo.md) assigns the same advantage to every token based on the final outcome. ADCA-GRPO decomposes this: an external LLM evaluates each step as GOOD or BAD, fused with outcome signals through independent z-score normalization. This dense process reward reduces training steps by approximately 40% compared to standard GRPO [Source](deep/repos/modelscope-agentevolver.md).

[Memento](projects/memento.md) teaches models to manage their own context as a trainable skill. A mementified model segments its reasoning into blocks, produces a terse compression of each block's conclusions, then masks the preceding block from attention. Peak KV cache drops 2-3x, throughput nearly doubles. The team discovered that erased blocks don't fully disappear: their information persists in KV cache representations of downstream mementos. Probes recovered hidden information even seven blocks after masking [Source](tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md). This distinguishes Memento from restart-based approaches that discard the implicit information channel entirely.

**Wins when:** you control the training pipeline and need agents that improve at the weight level, not just the scaffold level. **Loses when:** you lack the infrastructure (8x A100s for AgentEvolver) or the training data volume to justify the investment.

**Specific failure mode:** AgentEvolver's LLM-based step evaluation degrades with trajectory complexity. For 30-step trajectories with dense API interactions, the evaluator may produce inconsistent GOOD/BAD labels. The parser falls back to uniform labels when parsing fails, silently degrading to standard GRPO [Source](deep/repos/modelscope-agentevolver.md).

## The Convergence

**All serious self-improvement systems now store scored execution traces as their primary feedback signal.** Pi-autoresearch uses append-only JSONL with metric values and ASI per experiment. Autocontext stores attempts in SQLite with per-generation score trajectories. SICA logs results in JSONL with contextual summaries generated by LLM analysis. meta-agent writes harness candidates with traces and scores to the filesystem. Even CORAL records every eval as a JSON attempt file with commit hash, score, status, and feedback. The system that held out longest against this consensus was [Voyager](projects/voyager.md), which originally stored skills in a code library without execution scoring, relying on success/failure signals alone. The field has moved past this: you need the full trace, not just the binary outcome. Meta-Harness's ablation is definitive: summaries add only +0.3 accuracy over scores alone, while full trace access adds +15.4 [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

**All production self-improvement systems now implement automatic revert on regression.** Pi-autoresearch uses `git checkout` with protected session files. SICA runs in Docker with fresh containers per problem. CORAL uses git worktrees with per-agent branches. Compound Product commits before verification and reverts on failure. GOAL.md mandates "score must not decrease" as a load-bearing constraint. The holdout against this pattern was the original Karpathy autoresearch, which relied on a simpler git reset mechanism. Every subsequent implementation added more sophisticated revert safeguards.

**All systems that persist knowledge across sessions now use human-readable text files rather than opaque embeddings.** Acontext stores skills as Markdown with YAML frontmatter. Ars Contexta uses wikilinked Markdown with research claim graphs. gstack stores learnings in per-project JSONL. CORAL uses Markdown notes and SKILL.md directories. Even [Karpathy's LLM knowledge base pattern](tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) compiles knowledge into .md files in a directory structure. The longest holdout was [Mem0](projects/mem0.md) (51,880 stars), which uses vector embeddings as its primary storage. But Mem0 serves a different use case (user/session memory for conversational AI), and even it exposes extracted memories as readable text through its API.

## What the Field Got Wrong

Practitioners assumed that LLM self-improvement required labeled data or ground-truth rewards. meta-agent disproved this on [Tau-bench](projects/tau-bench.md). The system used an LLM judge to score unlabeled production traces, replacing gold labels with natural-language error descriptions ("the agent refunded without checking the cancellation policy"). The judge-based search reached 87% holdout accuracy, compared to 80% for their labeled-search variant [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md). The meta-agent team's explanation: natural-language critiques may provide a richer optimization signal than binary supervision, because the proposer sees what went wrong, not just that something went wrong. This finding aligns with Meta-Harness's ablation showing +15.4 accuracy from full trace access versus scores only. The prior assumption, visible in early autoresearch implementations that required mechanical pass/fail verification, underestimated how much diagnostic signal an LLM judge can extract from raw execution traces. What replaced it: treat the LLM judge as a surrogate evaluator with a small labeled holdout as a safety net, not as a replacement for all ground truth.

## Deprecated Approaches

**Single-pass context summarization for improvement proposals.** Before Meta-Harness, systems like TextGrad and early prompt optimizers compressed execution history into summaries before feeding them to the improvement agent. This seemed right because summaries reduce token costs and fit standard LLM context windows. Meta-Harness killed this approach with a clean ablation: scores + summaries achieved 34.9% accuracy, while full filesystem access achieved 50.0%, a 15.1 point gap. The proposer needs raw failures to form causal hypotheses. Summaries destroy the causal signal [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). Replaced by: giving the proposer direct access to execution traces, even at 10 million tokens per iteration.

**Fixed evolutionary heuristics for open-ended search.** Pre-2025 approaches like ADAS used predetermined mutation operators (crossover, random perturbation) to evolve agent designs. CORAL's paper demonstrated that autonomous agents with persistent shared memory achieve 3-10x higher improvement rates with fewer evaluations than fixed evolutionary baselines [Source](papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md). The agents' ability to read prior attempts, write notes about what they learned, and share discoveries through the filesystem outperformed programmatic search strategies. Replaced by: giving agents the full context of prior attempts and letting them reason about what to try next.

**Monolithic skill files that mix knowledge with process.** Early Claude Code configurations packed all agent behavior into a single CLAUDE.md or system prompt. [Everything Claude Code](deep/repos/affaan-m-everything-claude-code.md) (136,116 stars) demonstrated the logical endpoint: 156 skills across 12 language ecosystems with manifest-driven selective install. But the project's own WORKING-CONTEXT.md reveals ongoing quality issues: "rewrite content-facing skills to use source-backed voice modeling" and "continue one-by-one audit of overlapping or low-signal skill content." The community consensus settled on separation: rules (always-follow guidelines), skills (context-loaded domain knowledge), and hooks (deterministic automations) as distinct layers [Source](deep/repos/affaan-m-everything-claude-code.md). Replaced by: the skill-agent-hook triad with selective loading based on context.

## Failure Modes

**Playbook drift in long-running systems.** Over many generations, Autocontext's playbook accumulates contradictory lessons. The Curator's consolidation fires periodically, but `AUTOCONTEXT_SKILL_MAX_LESSONS` caps lessons via FIFO rather than quality-based pruning. A lesson that was correct in generation 5 may conflict with a lesson from generation 50, and neither gets removed until the cap forces it. The blast radius: the Coach encodes conflicting guidance, the Competitor receives contradictory instructions, and improvement stalls as the system oscillates between incompatible strategies [Source](deep/repos/greyhaven-ai-autocontext.md).

**Path dependence in self-modifying agents.** SICA's authors acknowledge this directly: "poor quality initial feature suggestions often lower the quality of subsequent feature suggestions." Different runs from the same starting point produce very different trajectories. The confidence-interval selection prevents regression in most cases, but it cannot escape a local optimum created by a bad early modification. The blast radius: the entire improvement trajectory skews toward one approach. Two runs of SICA on the same benchmarks may produce 20-point performance differences [Source](deep/repos/maximerobeyns-self-improving-coding-agent.md).

**Credit misattribution in multi-component systems.** When Autocontext's Competitor changes strategy and the Architect adds a tool in the same generation, the credit assignment module correlates both changes with the score improvement but cannot establish causation. Over many generations, this leads the MetaOptimizer to allocate resources toward flashy but non-causal changes. The blast radius: the system invests increasingly in tool creation while the actual driver (playbook lessons) gets deprioritized [Source](deep/repos/greyhaven-ai-autocontext.md).

**Context window exhaustion mid-experiment.** Pi-autoresearch tracks token consumption per iteration and proactively detects exhaustion, but auto-resume is rate-limited to once per 5 minutes with a cap of 20 auto-resume turns. If the agent hits a large benchmark output that fills context in 2-3 iterations, recovery stalls. The only bridge across context boundaries is `autoresearch.md` and ASI annotations in the JSONL, making their quality the single point of failure for continuity [Source](deep/repos/davebcn87-pi-autoresearch.md).

**Tournament selection without diversity pressure in architecture evolution.** [MemEvolve](projects/memevolve.md) selects top-T memory systems by raw performance, with no diversity metric ensuring architectural variety. The evolved population converges to similar approaches, missing qualitatively different memory strategies that might excel in different task distributions. The blast radius: the system settles on a local optimum in architecture space while better strategies remain undiscovered [Source](deep/repos/bingreeky-memevolve.md).

## Selection Guide

- **If you need to improve an existing agent's behavior on production tasks without labeled data,** use meta-agent (20 stars, MIT, very early) because it optimizes harness configurations using LLM judges on unlabeled traces. It currently supports Claude Agent SDK only.

- **If you need a general-purpose autonomous improvement loop for any domain with a measurable metric,** use [uditgoenka/autoresearch](projects/autoresearch.md) (3,142 stars, MIT, mature) as a Claude Code skill. For Pi users, use [pi-autoresearch](deep/repos/davebcn87-pi-autoresearch.md) (3,393 stars) instead. Both generalize Karpathy's pattern beyond ML.

- **If your domain lacks a natural metric and you need to construct one,** use [GOAL.md](repos/jmilinovich-goal-md.md) (112 stars, MIT) as a specification format. Its dual-score pattern prevents agents from gaming their own evaluation.

- **If you need agents to learn skills from execution traces as human-readable files,** use Acontext (3,264 stars, Apache-2.0) for its three-stage distillation pipeline. Avoid if you need sub-100ms retrieval on large skill libraries, since progressive disclosure adds tool-call latency.

- **If you need multiple agents collaborating on an optimization task with shared knowledge,** use [CORAL](projects/coral.md) (120 stars, MIT) for its git-worktree isolation and filesystem-as-message-bus design. Avoid for large codebases where merge strategies matter, since CORAL has no automated merge mechanism.

- **If you need weight-level agent improvement with dense process rewards,** use [AgentEvolver](projects/agentevolver.md) (1,336 stars) for its ADCA-GRPO credit assignment. Requires 8x A100 GPUs and the DashScope API. Avoid if you lack training infrastructure.

- **If you need a structured process layer that turns a coding agent into a virtual engineering team,** evaluate [gstack](deep/repos/garrytan-gstack.md) (63,766 stars, MIT) for its sprint-as-DAG pattern with 23 specialist roles. Avoid for research, data engineering, or infrastructure work that does not follow a product development workflow.

- **If you need rich multi-agent self-improvement with credit assignment, Pareto optimization, and distillation,** evaluate [Autocontext](deep/repos/greyhaven-ai-autocontext.md) (695 stars) but expect high per-generation LLM costs from its five-agent architecture.

## The Divergence

### Scaffold modification vs. weight modification

SICA modifies the agent's own Python code (tools, reasoning structures, sub-agents). AgentEvolver modifies the model's weights through GRPO training. SICA's approach is transparent, auditable, and reversible. AgentEvolver's approach can overcome reasoning ceilings that scaffold changes cannot touch. SICA's SWE-Bench results (17% to 53%) came from scaffold-only changes, but AIME and GPQA scores barely improved because they test base model reasoning. AgentEvolver's ADCA-GRPO achieved 57.6% avg@8 on combined benchmarks with a 14B model, improving both reasoning and tool-use tasks. Scaffold modification wins for coding and tool-use optimization where the bottleneck is "how the agent works." Weight modification wins for tasks bottlenecked by "what the model knows." No system yet combines both.

### Single expert agent vs. multi-agent exploration

SICA, pi-autoresearch, and meta-agent run a single agent in a loop. CORAL runs multiple agents in parallel with shared state. The single-agent approach is cheaper and simpler. The multi-agent approach provides diversity: different agents naturally explore different regions of the solution space. CORAL's paper reports 3-10x higher improvement rates than single-agent baselines on open-ended optimization tasks [Source](papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md). Single-agent wins when the search space is narrow (optimizing one metric in one codebase) and cost matters. Multi-agent wins when the search space is wide, exploration diversity provides value, and you can afford the parallel compute.

### LLM judge vs. mechanical verification

meta-agent uses an LLM judge to score unlabeled traces. Pi-autoresearch and GOAL.md require mechanical, deterministic scoring (script exits with a number). LLM judges scale to any domain without pre-built evaluation infrastructure. Mechanical verification eliminates the noise and drift of judge-based scoring. meta-agent's judge-based search outperformed labeled search (87% vs 80%) on Tau-bench, but the team acknowledged these were single-run results on a small benchmark split [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md). Mechanical verification wins when you can build a reliable scorer. LLM judges win when the domain is too complex or subjective for deterministic scoring.

### Embedding-based retrieval vs. file-based progressive disclosure

[Mem0](projects/mem0.md) (51,880 stars) uses vector embeddings for memory retrieval, reporting 26% accuracy gains over full context and 90% token reduction. Acontext and Ars Contexta use tool-call-based progressive disclosure from structured files, arguing that retrieval should be agent-driven, not similarity-driven. Embedding search scales better to large knowledge bases and requires less agent reasoning. File-based disclosure produces deterministic, debuggable retrieval and keeps memory human-editable. Embedding search wins for large-scale conversational memory across thousands of sessions. File-based disclosure wins when you need to inspect, edit, and version-control what the agent knows.

## What's Hot Now

[Memento](projects/memento.md) (launched March 2026) teaches models to compress their own chain-of-thought mid-generation, with peak KV cache drops of 2-3x. The team released OpenMementos (228K annotated reasoning traces), a data generation pipeline, and a [vLLM](projects/vllm.md) fork with native block masking. The discovery that erased blocks leak information through KV cache representations opens a new research direction in learned context management [Source](tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md).

[CORAL](projects/coral.md) (120 stars, launched March 2026) published its paper on autonomous multi-agent evolution and released code supporting Claude Code, Codex, and OpenCode as agent runtimes. The heartbeat system with plateau-triggered pivots and the filesystem-based shared knowledge pattern are seeing rapid adoption in autoresearch-adjacent tools.

meta-agent (20 stars, launched April 2026) demonstrated judge-based harness optimization on unlabeled traces, with plans to support Codex SDK, OpenCode SDK, and additional benchmarks.

[MemEvolve](projects/memevolve.md) published results showing evolved memory systems outperforming all 12 manually-engineered baselines, with cross-task, cross-LLM, and cross-framework generalization. The approach of generating entirely new memory provider implementations through code generation (not parameter tuning) represents the most aggressive form of memory architecture search [Source](deep/repos/bingreeky-memevolve.md).

The autoresearch ecosystem now includes 13+ implementations across different agent platforms, cataloged in repositories like WecoAI/awesome-autoresearch. [Compound Product](deep/repos/snarktank-compound-product.md) (503 stars) extended the pattern to product-level autonomous improvement: reading production reports, identifying priorities, generating PRDs, and implementing fixes through overnight agent loops.

## Open Questions

Can a self-improving system reliably evaluate improvements to its own evaluation function? GOAL.md's dual-score pattern is the best current answer, but MemEvolve operates in "open mode" where the agent evolves both the memory system and the task performance it uses for evaluation. No system has solved this at scale.

When should practitioners invest in weight-level self-improvement (AgentEvolver's GRPO approach) versus scaffold-level self-improvement (SICA, autoresearch)? The empirical evidence suggests scaffold changes plateau on reasoning tasks, but no direct comparison exists between the two approaches on the same benchmark suite with matched compute budgets.

How do you prevent knowledge decay in long-running self-improvement loops? Every system that persists knowledge faces staleness: pi-autoresearch's `autoresearch.md` can grow stale across context resets, Autocontext's playbooks accumulate contradictory lessons, and Acontext's skills have no temporal validity mechanism. Confidence decay (gstack uses 1 point per 30 days) is a partial solution, but no system has demonstrated principled knowledge pruning at scale.

What is the right unit of credit assignment for multi-step agent trajectories? AgentEvolver's ADCA-GRPO uses LLM-judged step-level GOOD/BAD labels. Meta-Harness gives full traces to the proposer. Autocontext correlates component changes with score movements. Each approach makes different assumptions about the granularity of causal attribution, and the optimal granularity likely depends on the task structure.

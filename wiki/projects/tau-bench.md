---
entity_id: tau-bench
type: project
bucket: agent-architecture
abstract: >-
  Tau-bench is a benchmark for evaluating LLM agents on realistic, multi-step
  tool-augmented tasks in customer service domains; its key differentiator is
  grounding evaluation in policy-following and state consistency rather than
  task completion alone.
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - repos/canvas-org-meta-agent.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
related:
  - claude
last_compiled: '2026-04-08T23:15:57.376Z'
---
# Tau-bench

## What It Is

Tau-bench (from Sierra Research, also referenced as tau2/tau3 in newer iterations) benchmarks LLM agents on conversational customer service tasks that require multi-step reasoning, tool use, and policy compliance. The core scenario: an agent handles customer requests in domains like airline reservations and retail, with access to a suite of domain-specific tools (booking lookups, refunds, cancellations) and a policy document the agent must follow.

What separates tau-bench from simpler tool-use benchmarks is the evaluation criteria. Success requires not just task completion but state consistency (database updates match intent) and policy adherence (the agent didn't violate business rules). An agent that refunds a customer correctly but bypasses the cancellation policy fails. This creates a harder signal than binary pass/fail on outcome alone.

The benchmark has iterated: the original tau-bench covers airline and retail domains. Tau2 and the tau3 variant referenced in recent optimization research use similar domain structure with 50+ tasks per domain, split between search/train and holdout sets.

## Core Mechanism

Tasks are structured as multi-turn conversations between a simulated customer and the agent. Each task includes:

- A customer instruction describing the request
- A workspace with domain state (flight records, customer accounts)
- A tool registry the agent can call
- A policy document with business rules (e.g., "no refunds within 24 hours of departure")
- A verification step that checks both the final database state and a graded assessment of policy compliance

The official evaluator reads the final state and conversation trace, then scores whether the agent resolved the request correctly while respecting policy constraints. This makes tau-bench a two-dimensional evaluation: outcome accuracy and behavioral compliance. Most benchmarks only measure the first.

The benchmark repository lives at `sierra-research/tau2-bench` on GitHub. Tasks are defined in YAML with fields for instruction, workspace directory, verify command, and timeout. The `tau2` package exposes an evaluation interface used by downstream optimization frameworks.

## Key Numbers

Reported scores vary by model and harness configuration:

- A vanilla [Claude](../projects/claude.md) Haiku 4.5 baseline on 50 airline tasks scores around 67% (reported by canvas-org/meta-agent, single run, self-reported)
- The same model with an optimized harness reaches 87% after iterative prompt and skill refinement (meta-agent experiment, single run, not independently validated)
- A separate auto-harness experiment on Tau3 tasks reports improvement from 0.56 to 0.78 (~40% gain) via failure clustering and eval-driven optimization (NeoSigma, self-reported)

Neither result comes from independent third-party validation. Both are single-run results on small splits (35/15 or similar train/holdout breakdowns), which means variance estimates don't exist. Take the absolute numbers as directional, not definitive.

No public leaderboard with standardized model submissions exists at the time of writing. Scores across papers are not directly comparable because task splits, model versions, and harness configurations differ.

## Strengths

**Policy compliance as a first-class signal.** Most agent benchmarks reward task completion. Tau-bench penalizes agents that complete tasks by violating constraints. This surfaces a failure mode that matters in production: agents that are effective but ungoverned.

**Multi-step state tracking.** Tasks require the agent to sequence tool calls correctly, handle intermediate state, and recover from tool errors. This stress-tests [ReAct](../concepts/react.md)-style agents more than single-call benchmarks.

**Practical domain grounding.** Customer service is a common deployment target for LLM agents. The airline and retail domains reflect realistic tool suites and policy complexity, making benchmark performance somewhat predictive of deployment behavior in similar settings.

**Useful for harness optimization research.** Because the evaluation is deterministic (a verify script with exit codes), tau-bench integrates cleanly into automated optimization loops. It has become a standard target for [self-improving agent](../concepts/self-improving-agents.md) research, including [AutoResearch](../projects/autoresearch.md), meta-agent, and auto-harness experiments.

## Critical Limitations

**Small task sets inflate variance.** The standard airline split is 50 tasks. A harness change that fixes 3 tasks moves the score by 6 percentage points. Published results at this scale carry wide confidence intervals that researchers rarely report.

**Unspoken infrastructure assumption: deterministic tool simulation.** Tau-bench works because the domain tools are simulated, not live. Agents call a mock database that resets between tasks. This eliminates the confounds that appear in real deployments: rate limits, partial failures, inconsistent API responses, and state that persists across sessions. An agent that scores 87% on tau-bench may behave differently against a real airline reservation system.

**Policy documents are static and complete.** In tau-bench, the agent receives the full policy at task start. Real customer service agents encounter incomplete, contradictory, or evolving policies. The benchmark doesn't test how agents handle policy ambiguity.

## When NOT to Use It

Skip tau-bench if you need to compare models on code generation, mathematical reasoning, or open-ended information retrieval. It measures a narrow slice of agent capability: structured tool use within a constrained policy domain.

Avoid citing tau-bench results as evidence of general agent capability. A model can score well by learning domain-specific heuristics (always check the cancellation policy before refunding) without developing transferable reasoning.

Don't use tau-bench as the sole evaluation when deploying into domains with complex or ambiguous policies. The benchmark's clean policy documents don't stress-test policy reasoning under uncertainty.

If you need a coding agent benchmark, [SWE-bench](../projects/swe-bench.md) is the standard. If you need broader multi-domain tool use, [GAIA](../projects/gaia.md) or [AppWorld](../projects/appworld.md) cover more ground. If you need evaluation of memory and long-horizon consistency, [LongMemEval](../projects/longmemeval.md) is more relevant.

## Unresolved Questions

**No public leaderboard.** There's no centralized place to compare model scores under standardized conditions. Published results use different splits, different system prompts, and different tool configurations. Comparisons across papers require careful reading.

**Evaluation cost at scale.** The official evaluator appears to use an LLM judge for policy compliance scoring. The cost of running this judge across hundreds of tasks, across many model candidates, in an optimization loop is not documented. The meta-agent experiments used Claude Opus 4.6 as the proposer, which is not cheap.

**Task diversity ceiling.** 50 tasks per domain may not cover the tail of realistic customer service requests. It's unclear how often new tasks are added or whether the benchmark evolves to prevent overfitting to known task patterns.

**Tau2 vs tau3 versioning.** References in the literature use "tau-bench," "tau2," and "tau3" inconsistently. The relationship between versions, which tasks changed, and whether scores are comparable across versions is not clearly documented.

## Alternatives

- **[SWE-bench](../projects/swe-bench.md)**: Use when evaluating coding agents on real GitHub issues. Better coverage of software engineering tasks.
- **[AppWorld](../projects/appworld.md)**: Use when you need multi-app, multi-step tool use beyond a single domain. More complex environment but harder to run.
- **[GAIA](../projects/gaia.md)**: Use when you need broad general-purpose agent evaluation across diverse real-world tasks.
- **[HotpotQA](../projects/hotpotqa.md)**: Use when the primary concern is multi-hop retrieval and reasoning rather than tool-augmented task execution.
- **[HumanEval](../projects/humaneval.md)**: Use for code generation capability specifically.

Tau-bench occupies a specific niche: policy-constrained tool use in conversational customer service. Within that niche, nothing else evaluates both outcome and compliance with equal weight. Outside that niche, other benchmarks are more appropriate.

## Related Concepts

- [Agent Harness](../concepts/agent-harness.md): The configuration layer that optimization research targets when improving tau-bench scores
- [ReAct](../concepts/react.md): The reasoning pattern most agents use when sequencing tool calls on tau-bench tasks
- [Human-in-the-Loop](../concepts/human-in-the-loop.md): What tau-bench simulates on the customer side
- [Self-Improving Agents](../concepts/self-improving-agents.md): The research direction that uses tau-bench most heavily as a target benchmark
- [LLM-as-Judge](../concepts/llm-as-judge.md): Used in the policy compliance evaluation component

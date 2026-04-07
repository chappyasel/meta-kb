---
entity_id: tau-bench
type: project
bucket: agent-systems
abstract: >-
  TAU-bench evaluates AI agents on realistic, multi-step customer service tasks
  requiring policy-grounded tool use; its key differentiator is strict pass/fail
  scoring based on database state verification, not just conversational quality.
sources:
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/repos/gepa-ai-gepa.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - repos/canvas-org-meta-agent.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
related:
  - meta-agent
  - rag
  - claude
last_compiled: '2026-04-07T11:58:10.753Z'
---
# TAU-bench

## What It Does

TAU-bench (Tool-Augmented Understanding benchmark) tests AI agents on simulated customer service scenarios where the agent must use tools, follow domain policies, and resolve user requests across multi-turn conversations. The benchmark currently ships two domains: airline (50 tasks) and retail. Success requires both following the right procedure and producing the correct database state at conversation end.

The benchmark is maintained by Sierra Research and has become a standard harness for measuring agent reliability in realistic enterprise settings. It appears in published results from Anthropic, OpenAI, and third-party researchers, and serves as the primary evaluation target in multiple harness optimization systems including [meta-agent](../projects/tau-bench.md) and auto-harness.

## Architecture and Core Mechanism

TAU-bench simulates a three-party interaction: a user (simulated by an LLM playing a persona with a specific goal), an agent under evaluation, and a tool environment backed by a structured database. The agent has access to tools for querying and mutating database records. Tasks are grounded in explicit policy documents the agent must consult and apply correctly.

**Scoring** uses database state verification rather than LLM-as-judge conversation scoring. After a task completes, a verifier checks whether the database reflects the correct end state given the policy and the user's request. This is binary pass/fail per task. Aggregate score is the fraction of tasks passed, typically reported on a holdout split.

TAU-bench v3 (the version used in recent harness optimization work) uses a 50-task airline domain split into search (35 tasks) and holdout (15 tasks) in the meta-agent experiments, or evaluated on the full 50 tasks as a benchmark split.

The repository lives at `github.com/sierra-research/tau-bench`, with v3 installable via `pip install "tau2 @ git+https://github.com/sierra-research/tau2-bench.git"`.

## Key Numbers

Published pass rates on the airline domain (Haiku 4.5 baseline, meta-agent experiments, single runs):

- Vanilla harness baseline: 67%
- After harness optimization (LLM-judge search): 87%
- After harness optimization (labeled search): 80%

Auto-harness (NeoSigma) reports 0.56 → 0.78 (~40% improvement) on TAU-bench v3 tasks with a similar optimization loop.

**Credibility note:** All published numbers are self-reported by teams running their own optimization systems. No independent third-party audit of these figures exists in the sources reviewed. Both the 67%→87% claim and the 0.56→0.78 claim come from single experimental runs with small holdout splits (15 tasks in the meta-agent case). Variance estimates are absent. Treat these as directional, not definitive.

## Strengths

**Realistic failure modes.** Policy compliance requires the agent to handle edge cases that trip up real systems: cancellation window rules, refund eligibility conditions, conflicting user requests. The policy document is part of the task context, not baked into the prompt, so the agent must actively retrieve and apply it.

**Verifiable ground truth.** Database state verification removes [LLM-as-judge](../concepts/llm-as-judge.md) noise from scoring. Pass/fail on state is deterministic given a correct policy interpretation, making results comparable across runs and systems.

**Multi-step tool use pressure.** Tasks require sequences of tool calls in the right order. An agent that calls tools randomly or skips verification steps fails even if its conversational output sounds plausible.

**Adoption as an optimization target.** TAU-bench has become the standard harness for agent self-improvement research. Meta-agent, auto-harness, and related systems all use it, which means published baselines and improvement trajectories are accumulating.

## Critical Limitations

**Concrete failure mode: small holdout collapse.** The meta-agent experiments split 50 airline tasks into 35 search + 15 holdout. A 15-task holdout means each task is worth 6.7 percentage points. An agent that passes one additional holdout task gains 6.7 points. The 67%→87% improvement (a 20-point gain) represents approximately 3 additional tasks passing on a 15-task holdout. This is within the noise band for a single run.

**Unspoken infrastructure assumption: LLM user simulator quality.** TAU-bench's user is an LLM playing a persona. The fidelity of this simulation determines whether the benchmark reflects real user behavior. Users who stay on-script, never backtrack, and phrase requests clearly are easier to serve than real customers. The benchmark does not expose how much variance comes from user simulation quality versus agent policy compliance.

## When NOT to Use TAU-bench

- When you need variance estimates: 50 tasks is too few for statistically reliable conclusions. Run multiple seeds or use a larger benchmark split before drawing conclusions about model improvements.
- When your agent's task domain differs from customer service: TAU-bench is policy-grounded and tool-centric. Agents doing code generation, research synthesis, or open-ended reasoning face different failure modes that TAU-bench does not measure.
- When you need cross-benchmark generalization evidence: Improvements on TAU-bench airline do not automatically transfer. Auto-harness and meta-agent both acknowledge they are measuring domain-specific harness tuning, not general agent capability.
- As a final evaluation for production deployment decisions: The benchmark's small size and single-domain scope make it a development signal, not a deployment gate.

## Unresolved Questions

**Leakage risk from optimization targets.** Both meta-agent and auto-harness use TAU-bench tasks as their search split during harness optimization, then report holdout numbers. The degree to which harness changes learned on the search split encode task-specific knowledge (rather than general behavioral rules) is not well characterized. The meta-agent writeup acknowledges the proposer tends to overfit to specific traces and requires explicit instructions to write general behavioral rules.

**User simulator variance.** The LLM user simulator introduces stochasticity that the benchmark does not report. Published results do not specify how many times each task was run or how user simulation variance was controlled.

**Policy document evolution.** It is unclear whether Sierra Research updates the policy documents across benchmark versions (v1 → v2 → v3), which would make cross-version comparisons invalid. The sources reference v3 without documenting what changed.

**Cost to run.** A full 50-task evaluation requires 50 multi-turn agent conversations plus tool calls plus verification. At frontier model prices (Haiku 4.5 for the agent, Opus 4.6 for the proposer in optimization loops), a single optimization run costs non-trivially. No cost estimates appear in the sources.

## Related Systems and Context

TAU-bench occupies a niche between simple tool-calling benchmarks (one-shot, single tool) and full web agent benchmarks like [WebArena](../projects/webarena.md) (browser-based, open-ended). [SWE-bench](../projects/swe-bench.md) tests code agents against verifiable test suites; TAU-bench tests service agents against policy compliance. The two are complementary.

The harness optimization literature (meta-agent, auto-harness, GEPA) treats TAU-bench as the primary evaluation surface for agent improvement loops. This creates a feedback dynamic where the benchmark increasingly reflects what harness optimizers are good at finding, rather than the full distribution of customer service failures.

[ReAct](../concepts/react.md) and [Chain-of-Thought](../concepts/chain-of-thought.md) are common underlying reasoning patterns for agents evaluated on TAU-bench. [Context Engineering](../concepts/context-engineering.md) of the policy document retrieval step appears to be a significant leverage point based on harness evolution results.

## Alternatives

- **[WebArena](../projects/webarena.md):** Use when you need browser-based task completion with open-ended web navigation. More realistic environment fidelity, harder to instrument for rapid iteration.
- **[SWE-bench](../projects/swe-bench.md):** Use when your agent targets software engineering tasks with test-verified correctness. Larger task set, better statistical power.
- **[AppWorld](../projects/appworld.md):** Use when you need multi-app interaction and richer tool ecosystems beyond a single service domain.
- **TAU-bench:** Use when you need a fast, instrumentable benchmark for conversational service agents with policy compliance requirements and want to run harness optimization loops.

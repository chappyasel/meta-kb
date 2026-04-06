---
entity_id: trace-derived-feedback
type: concept
bucket: self-improving
abstract: >-
  Trace-derived feedback converts agent execution records into improvement
  signals — the only mechanism that grounds optimization in what agents actually
  did, not what they were designed to do.
sources:
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related:
  - Context Graphs
last_compiled: '2026-04-05T23:17:39.114Z'
---
# Trace-Derived Feedback

## What It Is

Trace-derived feedback is a class of self-improvement mechanisms where the execution record of an agent run — every LLM call, tool invocation, retrieval step, intermediate output, and decision — gets analyzed to produce signals that update the agent's future behavior. The key word is "derived": the feedback is not manually written or synthetically constructed, but extracted from what the agent actually did.

The distinction matters because agent code describes what an agent is allowed to do. Traces record what it did in a specific run, with a specific input, under real conditions. Those two things often diverge in ways that no amount of code review or synthetic testing will surface.

## Why This Category Exists

Traditional ML training separates data collection from model improvement. You gather a dataset, you train, you evaluate, you ship. Agent systems break this model in two ways.

First, the "model" in question may not be the weights at all. An agent has at least three improvable layers: the underlying model weights, the harness code and instructions that orchestrate the model, and the context or memory that configures individual runs. [Harrison Chase's framework](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) formalizes this layering. Trace-derived feedback can target any of the three.

Second, agent behavior is path-dependent. The same agent with the same system prompt will follow different reasoning chains, call different tools in different orders, and make different recovery decisions depending on what it encounters mid-run. A static test suite cannot anticipate this space. Only traces from real or realistic runs capture it.

## How It Works

The core pipeline has four stages:

**1. Trace collection.** Every agent run produces a structured log: tool calls with parameters and return values, LLM calls with inputs and outputs, timing, token counts, and the sequence connecting them. Platforms like LangSmith capture this automatically; the raw output is a directed execution graph, not a flat log.

**2. Enrichment.** Raw traces are incomplete as feedback signals — they record what happened but not whether it was good. Enrichment adds quality signals: automated evaluators (LLM-as-a-judge for open-ended quality, deterministic code checks for correctness), human annotations on selected traces, and clustering algorithms that group traces by failure pattern rather than treating each as isolated. The auto-harness system [described by NeoSigma](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md) showed that clustering failures by proposed fix prevents overfitting to individual cases and drives fixes that generalize across a failure class.

**3. Signal extraction.** The survey taxonomy [from Yue et al.](../raw/deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md) identifies four feedback signal types that trace analysis can produce: metric-driven scalars (success rate, F1), verifier-driven binary signals (schema valid/invalid, tests pass/fail), preference-based pairwise rankings between trajectory executions, and trace-derived textual analysis where an LLM reasons about a trace to name failure modes and suggest structural changes. The fourth is most semantically rich and most noise-prone.

**4. Targeted update.** The signal gets routed to whichever layer it implicates. Textual trace analysis identifying a structural planning failure suggests harness changes. Low scores on a class of tool calls suggest prompt or tool description updates. Pattern extraction across many traces suggesting a persistent knowledge gap can drive context or memory updates. A coding agent with trace access can propose specific code or prompt diffs; the [LangSmith CLI Skills approach](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md) reportedly improved Claude Code performance from 17% to 92% on an internal eval set (self-reported).

## The Three-Level Distinction

The Yue et al. survey draws a conceptual distinction that practitioners routinely conflate and that trace-derived feedback makes sharp: **workflow templates** (the reusable design), **realized graphs** (the run-specific instance), and **execution traces** (what actually happened). These can differ from each other. A template specifies that tool X gets called; a realized graph might have pruned that call; the trace might show that the call happened anyway due to a runtime decision.

Trace-derived feedback operates at the trace level — the actual execution — and works backward to implicate the template or realized graph. Without this three-level model, practitioners cannot specify which layer a trace analysis is targeting, which leads to misrouted changes.

## What It Can Update

**Harness / orchestration code.** Trace analysis by a coding agent can propose changes to the agent's driving code: different retry logic, altered tool selection routing, added validation steps. The auto-harness system demonstrated ~40% performance gain (0.56 to 0.78 on Tau3 benchmark tasks) using this approach with a regression gate preventing backsliding (self-reported by NeoSigma, not independently validated).

**Prompts and instructions.** Patterns across enriched traces showing consistent reasoning failures or tool misuse translate into system prompt revisions, tool description rewrites, or added few-shot examples in the harness.

**Context and memory.** At the tenant or agent level, traces inform memory updates: persistent context files like `CLAUDE.md` or `SOUL.md`, skill libraries, or organization-level instruction stores. This is the fastest update loop because it requires no retraining and minimal validation infrastructure.

**Model weights.** Traces become supervised fine-tuning data or preference pairs for RLHF/DPO. This is the slowest and most expensive update path, with the additional risk of catastrophic forgetting degrading previously learned behavior.

## The Regression Gate

The mechanism that makes gains compound rather than oscillate is a gating step that converts resolved failures into permanent test cases. Every failure cluster that gets fixed adds cases to the regression suite. Future improvements must pass all previously fixed cases before shipping. Without this gate, the optimizer can trade one failure class for another while appearing to improve on aggregate metrics.

The auto-harness library implements this in `gating.py` as a two-step gate: eval suite pass rate plus full validation score. The `workspace/suite.json` file is maintained by the coding agent across iterations; it grows monotonically with each resolved cluster.

## Failure Modes

**Structural credit assignment.** When an agent run fails, the trace does not automatically reveal whether the failure came from a structural workflow choice, a prompt, a specific tool call, or an underlying model capability gap. LLM analysis of traces is plausible-sounding but frequently misattributes cause. This is the hardest open problem in trace-derived feedback.

**Context bloat.** Long agent runs produce verbose traces that overwhelm the context of whatever agent analyzes them. The auto-harness team found sub-agents with recursive summarization necessary — the improvement agent only sees parent-level summaries of child agent outputs. Without this, improvement agents operating on complex traces produce degraded analysis.

**Noisy signals in open-ended domains.** Trace-derived textual feedback is the most informative signal type and the least reliable. An LLM analyzing a trace will identify plausible failure modes that do not correspond to the actual cause, particularly in multi-step reasoning failures where intermediate outputs look locally reasonable.

**Evaluation set drift.** As the agent improves, the distribution of failures shifts. An eval suite built from early failure clusters may not exercise the failure modes that emerge at higher performance levels. Static regression suites need active curation alongside the improvement loop.

## Infrastructure Assumptions

Trace-derived feedback assumes a continuous observation layer on real or realistic runs. This requires instrumentation that captures structured execution graphs (not just final outputs), storage and retrieval infrastructure for traces at production volume, and an enrichment pipeline that can score and cluster traces faster than they accumulate.

The LangSmith-centric documentation on this topic presents tracing infrastructure as a prerequisite, not a nice-to-have. Teams running agents without structured trace capture cannot implement most of what this concept describes.

## When Not to Use This

For short-horizon, single-step tasks where the agent is essentially a prompted LLM with one tool call, trace analysis adds overhead without surfacing multi-step failure modes. The feedback loop pays off on tasks with 5+ reasoning steps, tool chains, or significant input variability.

If your primary bottleneck is model capability rather than orchestration or prompting, trace-derived harness and context updates will plateau quickly. The traces will accurately diagnose failures that require better underlying reasoning, but no harness change fixes a fundamental capability gap.

Teams without reliable automated evaluators should not use LLM-as-a-judge trace analysis as a primary signal for automated improvement. The noise amplifies through the loop and produces confident-sounding updates that move metrics in the wrong direction.

## Unresolved Questions

**Who controls the improvement loop?** Automated systems that modify their own harness code raise governance questions. The auto-harness approach runs coding agents that propose and accept changes autonomously. There is no established norm for human oversight frequency, change scope limits, or rollback protocols.

**How does this compose across tenants?** At scale, tenant-level context learning produces divergent agent behavior across users. Patterns that are failures for one tenant may be correct behavior for another. The frameworks described do not specify how to handle this conflict during trace clustering.

**Convergence.** There is no theoretical analysis of whether trace-driven improvement loops converge, plateau, or oscillate. The empirical results are all short-horizon experiments (one to a few dozen iterations). Long-run behavior is unknown.

**Cost accounting.** Running improvement loops costs tokens and LLM calls. None of the frameworks surveyed report the cost of the improvement process itself relative to the performance gains achieved.

## Related Concepts and Projects

- [Context Graphs](../concepts/context-graphs.md) — trace-derived feedback is a feedback mechanism within the broader context graph framework
- The Yue et al. survey taxonomy places trace-derived textual feedback as one of four signal types in workflow optimization: [From Static Templates to Dynamic Runtime Graphs](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)
- Auto-harness open source implementation: `neosigmaai/auto-harness` on GitHub, key files `gating.py`, `workspace/suite.json`, `PROGRAM.md`
- LangSmith's Insights Agent implements automated trace clustering for pattern discovery without predefined metric categories

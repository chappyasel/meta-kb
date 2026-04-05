---
entity_id: execution-traces
type: concept
bucket: agent-memory
abstract: >-
  Execution traces record the actual sequence of LLM calls, tool invocations,
  and data flows during an agent run — the raw material for memory, skill
  extraction, workflow optimization, and self-improvement.
sources:
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/memodb-io-acontext.md
  - papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related:
  - Context Graph
last_compiled: '2026-04-05T20:36:53.561Z'
---
# Execution Traces

## What They Are

An execution trace is the record of what an agent actually did during a task: which tools it called, in what order, what inputs and outputs each step produced, where it failed or retried, and what decisions it made along the way. The trace is distinct from the agent's intended plan (the workflow template) and from its run-specific configuration (the realized graph). It captures behavior, not design.

This three-way distinction — template, realized graph, trace — comes from the agentic computation graphs survey by Yue et al. and is worth taking seriously. A template specifies which components exist and how they depend on each other; it's designed offline. A realized graph is the per-query instantiation, potentially modified for the specific input. The trace is what happened during execution, which may differ from both due to runtime failures, retries, and branching decisions the agent made on the fly. Conflating these three objects causes real confusion when diagnosing why a system behaved a certain way or trying to improve it.

[From Static Templates to Dynamic Runtime Graphs](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md) identifies traces as one of four primary feedback signals for workflow optimization — specifically "trace-derived textual feedback," where an LLM analyzes the execution record to identify failure modes and suggest structural changes. This is the most informative signal available, though also the noisiest.

## Why They Matter

Traces are the substrate for everything a self-improving agent system needs to do.

**Memory.** An agent that can't record what it did can't reuse what worked. Traces provide the raw material for extracting durable knowledge — whether stored as vector embeddings, structured skill files, or context injected into future runs.

**Skill extraction.** [Acontext](../raw/repos/memodb-io-acontext.md) builds its entire memory architecture on this idea. When a task completes (or fails), the system runs a distillation pass over the session messages and execution trace. An LLM infers what worked, what failed, and what preferences the user expressed, then writes the result to Markdown skill files. The trace is the input; the skill file is the output. Without the trace, distillation has nothing to work with.

**Harness optimization.** Harrison Chase's [post on continual learning](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) describes a pattern where a coding agent reads accumulated traces from a filesystem and suggests changes to the harness code itself. The Meta-Harness paper formalizes this: run the agent over many tasks, evaluate outcomes, store the logs, then use a coding agent to analyze traces and propose structural changes. This is learning at the harness layer, not the model layer — faster feedback, lower stability risk.

**Organizational memory.** The [context graphs framing](../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md) argues that decision traces — the exceptions, approvals, precedents, and cross-system reasoning that currently disappear into Slack threads and Zoom calls — are what enterprise agent systems need to capture. A "context graph" formed by accumulated decision traces becomes searchable precedent. The trace here is broader than just LLM calls: it includes who approved what, under which policy version, citing which prior case.

## How They Work

A trace typically contains:

- The sequence of LLM calls (prompts, completions, model used)
- Tool invocations with inputs and outputs
- Timestamps and latency per step
- Branching decisions and which branch was taken
- Failures, retries, and fallbacks
- Final outcome (success, failure, partial)

The level of detail varies by system. Some traces capture only top-level tool calls; others record every token, intermediate chain-of-thought, and memory read/write. Richer traces support more analysis but cost more to store and process.

**Collection** happens either in the execution path (the orchestration layer emits trace events as the agent runs) or after the fact (logs are assembled from system outputs). In-path collection is more complete and captures timing; post-hoc assembly is easier to bolt onto existing systems.

**Storage** ranges from flat log files to structured databases. Acontext uses PostgreSQL + S3 with RabbitMQ for async processing. LangSmith is purpose-built for trace storage and querying across runs.

**Analysis** takes three forms:
1. Scalar evaluation — run a metric against the trace outcome (pass/fail, F1, task success rate)
2. Verifier-driven — check the trace against hard constraints (schema validation, unit tests)
3. LLM-driven distillation — pass the trace to an LLM and ask it to extract what worked, what failed, and what should change

The Yue et al. survey notes that the choice of analysis method constrains how aggressively you can mutate the system: strong verifiers support large structural changes because invalid candidates get caught fast; scalar-only feedback requires conservative changes because the signal is too weak to distinguish between good and bad mutations.

## The Learning Loop

Traces feed learning at three independent layers, as Chase's framework describes:

**Model layer.** Collect traces, filter for useful examples, use them for SFT or RL fine-tuning. This is the most impactful but slowest and most dangerous path — catastrophic forgetting is a real risk, and the feedback cycle is long.

**Harness layer.** Accumulate traces, run a coding agent over them to propose changes to the agent's code and instructions. Changes apply to all future runs. Faster than model retraining, but changes are global and can have unexpected downstream effects.

**Context layer.** Extract knowledge from traces into per-user, per-org, or per-agent memory files. Acontext's flow: session messages + trace → distillation LLM → skill agent → updated Markdown files. These files appear in future runs via tool calls (`get_skill`, `get_skill_file`). Changes are local and reversible. This is the fastest feedback loop and the lowest risk, which is why Chase recommends it as the practical starting point.

These layers compose. A system can do context-layer learning (fast, safe) while periodically doing harness-layer updates (slower, global) and model-layer fine-tuning (slowest, highest impact).

## Implementation Specifics

**Acontext's distillation pipeline** (`acontext` SDK, Python and TypeScript): The `sessions.store_message` call accumulates messages during a run. When a task completes — detected automatically or reported explicitly — the system triggers an async distillation job. A `SKILL.md` file defines the schema for skill storage (naming conventions, file layout, what goes where). The skill agent writes or updates files according to that schema. The agent retrieves skills on future runs by calling `list_skills` and `get_skill`, not by semantic search — "progressive disclosure" rather than top-k retrieval.

**AFlow's MCTS approach** uses traces as execution evidence during template search. Each candidate workflow is evaluated through actual runs; the resulting traces feed the Monte Carlo Tree Search, with explicit dollar costs tracked alongside task metrics. The trace here is evaluation evidence, not a learning target.

**MetaGen and ProAgent** use traces during execution: MetaGen detects contradictions in the current run's trace and edits the workflow topology in response; ProAgent tests components during construction and repairs the workflow specification when tests fail. In-execution trace analysis enables dynamic adaptation but adds overhead that isn't justified for short tasks.

## Failure Modes

**Credit assignment is hard.** When a workflow succeeds or fails, the trace records what happened but not why the outcome occurred. Attributing success or failure to specific structural choices (this tool call sequence worked) versus local parameters (this prompt was good) requires additional analysis that most systems skip.

**Trace quality degrades with system complexity.** A trace from a 3-step agent is easy to analyze. A trace from a 50-step multi-agent workflow with retries, parallel branches, and cross-system calls is difficult to read and expensive to distill. Most current distillation approaches are evaluated on short tasks; scaling behavior is unknown.

**Noisy distillation.** LLM-driven extraction from traces is the most informative analysis path but also the noisiest. The distillation LLM may extract spurious patterns, miss real ones, or write skills that contradict each other. Without validation, skill files accumulate noise over time.

**Missing context at collection time.** Enterprise decision traces often include approvals that happen in Slack, exceptions made on Zoom calls, and reasoning that lives in people's heads. Operational systems capture the outcome (final price, closed ticket) but not the decision context. The [context graph argument](../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md) is that this gap is the key unsolved problem — and that only systems sitting in the execution path can close it.

## When Traces Are the Wrong Tool

**Privacy-sensitive workflows.** Traces contain LLM inputs and outputs, which may include PII, proprietary data, or privileged communications. Storing full traces requires the same controls as the underlying data.

**High-frequency, low-value tasks.** If the task is simple and repeated millions of times, trace storage and distillation costs can exceed the benefit. Sampling strategies help but add complexity.

**One-shot tasks with no repetition.** Traces are most valuable when patterns recur across runs. A single, novel task produces a trace with limited reuse value.

**When harness or model changes are the right lever.** Context-layer learning from traces handles task-specific knowledge well. It does not fix fundamental reasoning failures, broken tool integrations, or wrong architectural choices — those require harness or model changes.

## Unresolved Questions

The survey by Yue et al. identifies a structural gap: most papers report downstream task metrics without workflow-level analysis (graph size, depth, communication volume, cost-per-success). Traces contain enough information to compute these metrics, but no standard tooling exists to do it consistently across systems. Cross-method comparison is therefore unreliable.

How much trace data is needed before distillation produces reliable skills? Acontext doesn't specify a minimum. The relationship between trace volume and skill quality is empirically underexplored.

For enterprise decision traces, the key open question is whether capturing approval chains and exception reasoning requires redesigning workflows from scratch or whether it can be bolted onto existing orchestration. The [context graph framing](../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md) argues the former: incumbents can't capture traces they were never in the path to see.

## Related Concepts and Projects

- [Context Graph](../concepts/context-graph.md): accumulated structure formed by decision traces across entities and time; implements execution traces as the raw input
- [Acontext](../projects/acontext.md): skill memory layer that distills execution traces into Markdown skill files

## Alternatives

| Approach | When to use it |
|---|---|
| Vector memory (raw embeddings) | Retrieval over large unstructured history; poor interpretability |
| Fine-tuning on trace data | Patterns are stable and high-volume; acceptable retraining cost and risk |
| Harness-level trace analysis | Systematic failures that indicate structural problems, not just missing knowledge |
| Human-curated skill files | Bootstrapping before trace volume is sufficient; high-trust, low-noise baseline |

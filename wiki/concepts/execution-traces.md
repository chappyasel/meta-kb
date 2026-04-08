---
entity_id: execution-traces
type: concept
bucket: agent-architecture
abstract: >-
  Execution traces record the actual sequence of an LLM agent's actions, tool
  calls, observations, and decisions during a run — distinct from workflow
  templates and realized graphs, they serve as the primary artifact for
  debugging, evaluation, and automated harness improvement.
sources:
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - tweets/jayagup10-google-s-20-year-secret-is-now-available-to-every.md
  - tweets/jayagup10-the-trillion-dollar-loop-b2b-never-had.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - repos/canvas-org-meta-agent.md
  - papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related:
  - context-graphs
last_compiled: '2026-04-08T02:51:46.585Z'
---
# Execution Traces

## What They Are

An execution trace is the full record of what an agent actually did during a run: every LLM call, tool invocation, retrieved document, intermediate reasoning step, error, retry, and output, in the order they occurred. This is not the same as the workflow template that planned the run, nor the realized graph that instantiated it. The trace captures runtime behavior — including deviations from the plan.

The distinction matters more than it first appears. A workflow template defines which components exist and how information should flow. A realized graph is the per-run instantiation of that template, potentially pruned or modified before execution starts. The execution trace is what the agent actually did, which may differ from both due to tool failures, unexpected outputs, branching decisions, or mid-run edits. [A survey on agentic computation graphs](../raw/deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md) identifies conflating these three objects as one of the most common sources of confusion in multi-agent system design.

## Why They Matter

Execution traces are the primary artifact that makes agent behavior legible after the fact. Without them, debugging a failed agent run means reasoning from outputs alone. With them, you can reconstruct exactly which tool call returned bad data, which reasoning step went wrong, or where a loop started.

But their value extends beyond post-mortem debugging. Three uses have become architecturally significant:

**Evaluation.** Task-level metrics (did the agent succeed?) tell you whether something worked. Traces tell you how it worked and how efficiently. Graph-level properties — number of steps, tool calls per task, retry rate, cost per success — are only accessible through traces. Without them, two agents achieving the same score are indistinguishable even if one uses 4x more tokens.

**Feedback signal for workflow optimization.** The most informative feedback signal in workflow optimization is trace-derived: an LLM reads the execution trace, identifies specific failure modes, and suggests structural changes to the workflow. This is noisier than verifier signals (unit tests, schema validation) but more informative than scalar metrics, because it points at the part of the workflow that failed rather than just whether it failed. [The ACG survey](../raw/deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md) identifies four feedback signal types — metric-driven, verifier-driven, preference-based, and trace-derived textual — and notes that the signal type determines how aggressively you can mutate workflow structure. Strong verifiers support aggressive structural changes; trace-derived analysis supports targeted edits at identified failure points.

**Automated harness optimization.** The Meta-Harness system gives a coding agent filesystem access to the source code, scores, and execution traces of all prior harness candidates, then asks it to propose improvements. On tau-bench, this loop improved task success from 67% to 87% with no labeled training data. [The meta-agent framework](../raw/repos/canvas-org-meta-agent.md) implements the same loop: traces from failed runs are the primary input to the proposer model that rewrites system prompts and agent configurations. The key mechanism is that traces expose not just whether the harness failed but where and why — the proposer can read that a tool was called with the wrong arguments, or that the agent looped on a particular subtask, and adjust the harness accordingly.

## How They Work

### Structure of a Trace

A trace is a time-ordered sequence of events. Common event types:

- **LLM call**: prompt sent, response received, model used, token count, latency
- **Tool invocation**: tool name, arguments, response, success/failure
- **Memory read/write**: what was retrieved or stored, from which memory system
- **Branching decision**: which path was taken and why
- **Error/retry**: what failed, how many retries, final outcome
- **Human interrupt**: if a [human-in-the-loop](../concepts/human-in-the-loop.md) step occurred

Most frameworks store traces as JSON sequences. LangSmith (LangChain's observability layer), [LangGraph](../projects/langgraph.md)'s trace format, and [OpenAI Agents SDK](../projects/openai-agents-sdk.md) all produce structured traces in similar schemas, though no standard format exists.

### Trace Granularity Tradeoffs

Finer-grained traces are more useful for debugging but more expensive to store and process. Coarse traces (step-level summaries) are sufficient for aggregate evaluation metrics. Token-level traces support fine-grained analysis of where context was used but add significant storage overhead.

The meta-agent pattern suggests a practical heuristic: store full traces for failed runs (where you need to understand what went wrong) and summary traces for successes (where the main signal is aggregate cost and step count). This cuts storage costs while preserving debugging value.

### Trace-Derived Feedback in Practice

The meta-harness pattern works roughly as follows:

1. Run the agent on a benchmark task set with the current harness configuration
2. Collect full execution traces for failed and borderline cases
3. Pass traces (plus harness source code and scores) to a proposer model
4. The proposer reads traces, identifies patterns in failure modes, and proposes harness changes
5. Evaluate the new harness; repeat

The proposer model reads things like: "the agent called `get_customer_record` with a numeric ID but the tool expects a string; this caused a parsing error on 7 of 12 failed tasks." It then rewrites the system prompt or tool schema to prevent that error. [Meta-Harness](../raw/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md) reports +7.7 points over ACE on online text classification with 4x fewer context tokens, by giving the proposer richer trace access rather than compressing feedback to scalar signals.

## Decision Traces as Organizational Memory

[Context graphs](../concepts/context-graphs.md) extend the execution trace concept from individual agent runs to organizational memory. The argument: enterprise decisions involve cross-system reasoning — support escalations that depend on CRM data, incident history, billing status, and prior approval chains — and none of that context gets recorded as durable artifacts. It lives in Slack threads, Zoom calls, and people's heads.

When agents sit in the execution path, they observe this full context at decision time. If they emit a structured trace capturing what inputs were gathered, which policy applied, what exception was granted, who approved, and what precedent was cited, those traces accumulate into a queryable record of organizational decision-making. Precedent becomes searchable. Exceptions become data rather than tribal knowledge.

This is architecturally distinct from what existing systems of record capture. A CRM records current state — what the opportunity looks like now, the final discount, the outcome. It does not record why a VP approved a 20% discount on a 10%-capped renewal, or that the justification was three SEV-1 incidents and a "cancel unless fixed" escalation. That reasoning only exists as a trace if the agent layer persists it. [The context graph framing](../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md) argues that startups building in the agent execution path have a structural advantage here: incumbents receive data via ETL after decisions are made, while orchestration-layer systems see the full decision context in real time.

## Failure Modes

**Structural credit assignment.** When a run fails, the trace shows what happened but not necessarily why it happened. Distinguishing a prompt wording problem from a workflow structure problem from a model capability limitation requires inference beyond the trace itself. The proposer model in meta-harness can make this inference incorrectly, proposing structural changes for what is actually a model capability ceiling.

**Trace completeness assumptions.** Most trace analysis assumes the trace captured everything relevant. But tool calls that fail silently, memory reads that return stale data, or background processes that modify shared state leave no trace. Analysis of an "incomplete" trace yields confident but wrong diagnoses.

**Noise accumulates with run length.** In long-horizon tasks (10+ steps), traces contain many decisions, and distinguishing which decisions caused eventual failure is hard. Trace-derived feedback for long-horizon failures is noisier than for short-horizon ones, which partly explains why [Reflexion](../concepts/reflexion.md)-style methods work better on shorter tasks.

**Storage and processing costs at scale.** Full token-level traces for high-throughput production agents are expensive to store and slow to process. Most production deployments sample or summarize, which means the traces available for analysis are not representative of all runs.

**Privacy and compliance.** Execution traces may contain sensitive data — customer records, financial information, internal approvals — that cannot be stored indefinitely or fed to external models. The meta-harness pattern of passing traces to a proposer model breaks down if the traces contain data that cannot leave the environment.

## When Traces Are the Wrong Tool

Execution traces are useful for debugging, evaluation, and optimization. They are not useful for:

- **Real-time agent guidance.** A trace is a post-run artifact. It cannot guide an agent during execution. For in-execution adaptation, you need a different mechanism: memory systems, [loop detection](../concepts/loop-detection.md), or explicit in-execution editing.
- **Causal attribution without additional analysis.** A trace shows correlation (the agent failed after this tool call) not causation (that tool call caused the failure). Confusing the two leads to bad harness changes.
- **Tasks where success is binary and fast.** If tasks complete in 2-3 steps with obvious success/failure signals, full trace instrumentation is overhead without proportional benefit. Simpler evaluation loops suffice.

## Unresolved Questions

**No standard trace format.** LangSmith, OpenTelemetry, and framework-specific formats are not interoperable. Trace analysis tools built for one framework don't work on another.

**Trace compression without information loss.** For the proposer model to read traces efficiently, they need to be summarized. But existing compression methods lose the specific failure details that make traces useful. The right granularity for trace compression in meta-harness loops is not established.

**How many traces are enough?** Meta-harness uses traces from failed runs, but the right number of traces per optimization iteration — and whether failure traces alone are sufficient without success traces for contrast — is unclear from current results.

**Long-term trace governance.** If decision traces become organizational memory (the context graph vision), questions of ownership, retention, auditability, and who controls access become significant. No framework for this exists.

## Relationships to Related Concepts

Execution traces are the raw material for several connected systems:

- [Episodic Memory](../concepts/episodic-memory.md) often stores compressed or summarized execution traces as the primary source of agent experience
- [Reflexion](../concepts/reflexion.md) uses traces as input to a self-critique loop that modifies agent behavior on subsequent attempts
- [Context Graphs](../concepts/context-graphs.md) aggregate decision traces across runs into a queryable organizational memory structure
- [Observability](../concepts/observability.md) is the engineering practice of instrumenting systems to produce useful traces
- [Self-Improving Agents](../concepts/self-improving-agents.md) depend on traces as the feedback signal for iterative capability improvement
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) workflows generate traces that include both agent decisions and human overrides, which are particularly valuable for training
- [LLM-as-Judge](../concepts/llm-as-judge.md) evaluation often operates on traces rather than final outputs, assessing reasoning quality rather than just task completion

## Alternatives and Selection Guidance

Use **scalar task metrics** when you need fast, cheap evaluation and care only about end-to-end success rate. Traces add instrumentation overhead that is not justified if you have no downstream use for them.

Use **verifier signals** (unit tests, schema validation) when the task has clear correctness criteria. They provide stronger signal than traces for structural optimization because they definitively reject invalid candidates rather than requiring inference about what went wrong.

Use **execution traces** when you need to debug agent failures, analyze efficiency (cost-per-success, step counts), or feed a meta-optimization loop. They are the right tool when failure diagnosis requires knowing specifically where in a run things went wrong.

Use **preference-based comparisons** between traces when you have multiple candidate harnesses and want to rank them on subtle quality dimensions that scalar metrics miss — particularly for tasks where partial success is common and the quality of the trace matters beyond binary success.


## Related

- [Context Graphs](../concepts/context-graphs.md) — implements (0.8)

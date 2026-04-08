---
entity_id: execution-traces
type: concept
bucket: agent-architecture
abstract: >-
  Execution traces are timestamped records of every action, decision, and
  intermediate state an agent produces during task execution — distinguished
  from both reusable workflow templates and run-specific realized graphs, they
  serve as the raw material for debugging, evaluation, and automated
  self-improvement.
sources:
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - repos/canvas-org-meta-agent.md
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/jayagup10-google-s-20-year-secret-is-now-available-to-every.md
  - tweets/jayagup10-the-trillion-dollar-loop-b2b-never-had.md
related:
  - context-graphs
  - jaya-gupta
last_compiled: '2026-04-08T23:08:53.424Z'
---
# Execution Traces

## What They Are

An execution trace is the concrete, timestamped record of what an agent actually did during a run: every LLM call made, every tool invoked, every intermediate state written, every decision branched, every failure retried. Traces are not plans. They are not the reusable workflow template designed before deployment, nor the run-specific realized graph constructed for a particular input. They are the ground truth of runtime behavior — what happened, in sequence, with full fidelity.

The distinction matters because templates and realized graphs represent intent; traces represent fact. A workflow can specify that an agent should retrieve context before generating an answer, but the trace records which retrieval call was made, what it returned, how long it took, whether it was retried, and what the model received as a result. That gap between intent and execution is exactly where most agent failures hide.

The survey [From Static Templates to Dynamic Runtime Graphs](../raw/deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md) formalizes this three-level separation — templates, realized graphs, and execution traces — as one of its core conceptual contributions, noting that conflating these objects is responsible for significant confusion in multi-agent system design and evaluation.

## Why They Matter

Traces are load-bearing infrastructure for three distinct use cases that are often conflated but have different requirements:

**Debugging.** When an agent fails, the trace is the only artifact that shows causality. Did the retrieval return irrelevant context? Did the model hallucinate a tool call parameter? Did a retry loop exhaust the budget? Without the trace, post-hoc analysis is guesswork. With it, you can replay the exact sequence of states that led to failure and identify the specific step where behavior diverged from expectation.

**Evaluation.** Downstream task metrics — did the agent succeed or fail? — are necessary but insufficient. Two agents can achieve identical success rates through radically different execution patterns: one efficient, one wasteful; one robust, one brittle. Trace-level analysis reveals graph properties that task metrics miss: step count, token consumption per step, tool call frequency, retry rates, error recovery patterns, and structural variation across inputs. The survey explicitly calls this out as a gap in current practice, proposing "structure-aware evaluation" that complements accuracy metrics with graph-level properties derived from traces.

**Automated improvement.** This is where traces become most powerful. Trace-derived feedback — the fourth category of optimization signal identified in the survey, alongside task metrics, verifier signals, and preference rankings — uses LLM-generated analysis of execution traces to identify specific failure modes and propose structural changes to workflows. Unlike scalar reward signals, trace analysis can answer *why* a run failed and *where* the workflow structure contributed to that failure. This is the signal that enables the most informative but also noisiest form of workflow optimization.

## How Traces Are Generated

Generating useful traces requires instrumentation at multiple levels of the agent stack.

At minimum, a trace captures: the sequence of actions taken (LLM calls, tool invocations, memory reads/writes), the inputs and outputs at each step, timestamps, and success/failure status per step. This minimal trace supports basic debugging and aggregate evaluation.

Richer traces add: the full prompt sent to each LLM call (not just the user message, but the complete context window), intermediate reasoning states (chain-of-thought outputs if visible), tool call parameters and raw return values, retry attempts and their triggers, branching decisions and the reasoning behind them, and cost accounting (token counts per call, estimated dollar cost).

The [Meta-Harness paper](../raw/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md) demonstrates what rich traces enable in practice. Its outer optimization loop gives a "proposer" agent filesystem access to the source code, scores, and execution traces of all prior harness candidates. The proposer reads traces to understand why previous harness configurations failed — not just that they failed — and proposes targeted modifications. This trace-informed search achieves +7.7 over a state-of-the-art baseline while using 4x fewer context tokens, directly attributable to the richer feedback signal that traces provide compared to scalar success rates alone.

The [meta-agent repository](../raw/repos/canvas-org-meta-agent.md) (canvas-org/meta-agent) implements a concrete version of this loop. The outer loop runs agents against a benchmark, captures execution traces per task, feeds those traces to a "proposer" model (typically a larger, more capable model than the task agent), and generates updated harness configurations. Running this loop for 10 iterations improved tau-bench performance from 67% to 87% with no human-labeled training data. The traces are the mechanism: without them, the proposer has only a success/failure bit per task. With them, it can diagnose specific failure patterns and generate targeted fixes.

## Trace Structure and Key Fields

A typical trace entry for a single step contains:

```
{
  "step_id": "int",
  "timestamp": "ISO8601",
  "action_type": "llm_call | tool_invoke | memory_read | memory_write | branch",
  "inputs": { ... },           // full inputs including context window
  "outputs": { ... },          // full outputs including raw model response
  "duration_ms": "int",
  "token_counts": { "prompt": int, "completion": int },
  "cost_usd": "float",
  "status": "success | failure | retry",
  "retry_count": "int",
  "parent_step_id": "int | null"  // for tree-structured traces
}
```

The `parent_step_id` field becomes important for agents that branch or run sub-agents in parallel. Traces for multi-agent systems are not linear sequences but directed acyclic graphs themselves — and reconstructing the causal structure from flat log output is a non-trivial problem that most implementations get wrong.

## Trace-Derived Feedback in Practice

The survey identifies four feedback signals for workflow optimization, ordered by information density:

1. **Task metrics (scalar):** Did the agent succeed? Useful for search but provides no structural signal.
2. **Verifier signals (binary):** Did the output pass a schema check, unit test, or constraint? Stronger signal, supports aggressive mutation.
3. **Preference rankings (comparative):** Which of two trace-producing runs was better? More informative than scalars for differentiating successful workflows.
4. **Trace-derived textual feedback:** LLM analysis of execution traces identifying specific failure modes and suggesting structural changes. Most informative, noisiest.

The key tradeoff: signal informativeness and noise both increase together. Scalar metrics are clean but shallow. Trace-derived textual feedback is rich but requires a capable proposer model to interpret correctly, and the proposer can hallucinate plausible-sounding but incorrect diagnoses. Practitioners using trace-derived feedback should validate proposed changes against held-out benchmarks rather than trusting the proposer's reasoning directly.

## Traces as Organizational Memory

[Jaya Gupta's](../concepts/jaya-gupta.md) framing in [Context Graphs](../concepts/context-graphs.md) extends the trace concept beyond individual agent runs to organizational decision history. Her argument: what enterprises currently lack is not better access to structured data, but a queryable record of *why decisions were made* — the exceptions granted, the precedents set, the cross-system context that resolved ambiguity. Agent execution traces, if persisted and linked across runs, constitute exactly this record.

In her framing, a renewal agent that pulls data from a CRM, checks SLA violations in a ticketing system, and routes an exception to finance — then records the full trace of that decision — creates an artifact that no existing enterprise system captures. The CRM records the final discount. The trace records why the discount was approved, what inputs justified it, who approved it, and what precedent it sets for future similar cases. Accumulated traces form a context graph: a living, queryable record of decision-making that compounds over time and enables genuine organizational learning.

This is a different use case than debugging or automated improvement, but it relies on the same underlying infrastructure: traces that are rich, structured, and persistently stored rather than ephemeral logs.

## Failure Modes

**Structural credit assignment.** When a multi-step agent fails, attributing the failure to a specific step or structural choice is hard. The trace shows what happened; it doesn't cleanly show which step caused the failure. A retrieval call that returned marginally irrelevant context may have contributed to a generation failure three steps later — but the connection is non-obvious, and both human analysts and LLM proposers can misdiagnose causality.

**Trace size and cost.** Rich traces for long-horizon agent runs (50+ steps, complex tool interactions) become large. Feeding full traces to a proposer model is expensive. The Meta-Harness approach of giving filesystem access to all prior traces is elegant, but at scale — thousands of runs, each with hundreds of steps — the proposer must be selective about what it reads. No standard solution exists for trace summarization that preserves the diagnostic signal.

**Instrumentation completeness.** Traces are only as complete as their instrumentation. An agent that calls a tool through an uninstrumented SDK produces a trace with a gap. In multi-agent systems, sub-agents running in separate processes or containers may not propagate trace context correctly, producing disconnected trace fragments that cannot be causally linked. Distributed tracing standards (OpenTelemetry) exist for conventional software but adoption in LLM agent frameworks is inconsistent.

**Proposer hallucination.** Trace-derived textual feedback requires a proposer model that can correctly diagnose failure causes from execution logs. Capable models (Claude Opus, GPT-4o) do this reasonably well on clear-cut failures. On subtle failures — where the agent produced plausible intermediate outputs but made a wrong assumption early — proposers frequently misdiagnose the cause and suggest changes that address symptoms rather than root causes.

**Privacy and retention.** Execution traces capture the full context window sent to each LLM call, which may include sensitive user data, proprietary business information, or PII. Storing traces for optimization purposes requires careful data governance — retention policies, access controls, and potentially anonymization pipelines — that most agent frameworks do not provide out of the box.

## Implementation Considerations

**Trace storage.** For small-scale use (< 10k runs), flat JSON files per run are workable. For optimization loops that need to query across runs (find all runs where tool X was called more than 5 times), a structured database is required. [SQLite](../projects/sqlite.md) handles moderate scale; [PostgreSQL](../projects/postgresql.md) with JSONB columns supports complex queries at larger scale.

**Context propagation.** In multi-agent systems, trace context (a run ID, parent step ID, and timestamp) must be propagated through every function call and API boundary. The standard mechanism is a context object passed through call chains or stored in thread-local/async-local storage. Missing propagation at any boundary breaks the causal chain.

**Sampling.** At production scale, tracing every step of every run is expensive. Standard practice from distributed systems — sample 100% of error cases, 1-10% of success cases — applies. But optimization loops that use traces for improvement need representative samples of failure cases, which requires error-biased sampling strategies.

**Integration with observability.** [Observability](../concepts/observability.md) platforms like Arize, LangSmith, and Weights & Biases have built trace collection and visualization tooling for LLM applications. These provide useful starting points but vary significantly in what they capture (some focus on LLM call latency and token counts; others capture full prompt/response pairs and tool call details).

## Relationship to Adjacent Concepts

Traces are the raw material that several higher-level concepts consume:

- [Reflexion](../concepts/reflexion.md) uses traces to generate verbal self-feedback that modifies future behavior.
- [Self-Improving Agents](../concepts/self-improving-agents.md) use traces as training signal or prompt optimization input.
- [Episodic Memory](../concepts/episodic-memory.md) stores compressed trace summaries for retrieval in future runs.
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) systems use traces to surface the right decision points for human review rather than requiring humans to monitor full execution.
- [LLM-as-Judge](../concepts/llm-as-judge.md) evaluations frequently operate on traces rather than final outputs, scoring intermediate reasoning and tool use quality.
- [Context Engineering](../concepts/context-engineering.md) depends on trace analysis to understand what information agents actually use versus what is present but ignored.
- [Agent Workflow Memory](../projects/agent-workflow-memory.md) and [AFlow](../projects/aflow.md) explicitly use traces as optimization feedback for workflow structure search.

## When Not to Use Detailed Traces

Full execution traces with complete prompt capture are not always worth the cost. For short, deterministic agents with fixed tool sets and cheap failure modes, a lightweight event log (step name, duration, success/failure) plus final output is sufficient. Adding full trace instrumentation to every agent unconditionally creates storage, cost, and privacy overhead that only pays off when you have a systematic program for using that data — an optimization loop, a debugging workflow, or a compliance requirement.

## Unresolved Questions

**Trace standardization.** No community-standard schema exists for agent execution traces. Every framework (LangChain, LangGraph, AutoGen, the OpenAI Agents SDK) emits different fields with different names. Cross-framework trace analysis requires custom parsers.

**Optimal trace granularity for proposers.** The Meta-Harness result suggests that richer traces produce better optimization, but it does not characterize how much richness is enough. Does the proposer need full prompt/response pairs, or does a structured summary suffice? At what step count does trace length become counterproductive?

**Long-horizon trace analysis.** Most trace-derived feedback research involves runs of 10-30 steps. Traces for long-horizon agents (100+ steps, hours of runtime) require different analysis approaches — the proposer cannot process the full trace in context. Hierarchical summarization and selective attention strategies remain research problems.

**Causal attribution.** Linking a final failure to a specific intermediate step is an open problem. Statistical approaches (which steps correlate with failure across many runs?) require large trace datasets. Causal approaches (which step, if changed, would have altered the outcome?) require counterfactual reasoning that current models do not do reliably.


## Related

- [Context Graphs](../concepts/context-graphs.md) — implements (0.8)
- [Jaya Gupta](../concepts/jaya-gupta.md) — created_by (0.4)

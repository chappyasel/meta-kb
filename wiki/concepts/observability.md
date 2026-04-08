---
entity_id: observability
type: concept
bucket: agent-architecture
abstract: >-
  Observability for LLM agents captures structured execution records (traces) of
  every model call, tool use, and decision, enabling systematic debugging and
  improvement — unlike traditional logging, it makes the runtime behavior of
  agents inspectable and iterable.
sources:
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - repos/jackchen-me-open-multi-agent.md
  - repos/orchestra-research-ai-research-skills.md
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
related:
  - claude
  - openclaw
  - claude-code
last_compiled: '2026-04-08T23:19:45.597Z'
---
# Observability

## What It Is

In traditional software, code is the authoritative record of system behavior. You read the source, reason about it, and test against it. In agentic systems, the code describes what an agent is allowed to do. Traces describe what it actually did — with this input, in this run, under these conditions.

Observability for LLM agents is the practice of capturing, structuring, and reasoning over those traces. A trace records the full execution path of an agent: every model call, every tool invocation, every retrieval step, intermediate outputs, token usage, latency, and the sequence of decisions connecting them. Traces become the raw material for debugging, evaluation, and systematic improvement.

This is architecturally different from traditional application monitoring. APM tools track throughput, error rates, and latency at the service level. LLM observability tracks *what the model chose to do and why* — reasoning chains, tool selection decisions, context window contents, and multi-step trajectories. The failure mode for an agent is rarely a 500 error; it's subtler: the wrong tool called with the right syntax, a correct answer that missed user intent, a reasoning chain that drifted three steps in.

## Why It Matters for Agent Infrastructure

Agents fail in ways that logs alone cannot explain. A coding agent that produces syntactically valid but logically wrong code left no error trace — it completed successfully. A research agent that cited plausible-sounding but fabricated sources returned a 200. Without execution traces, diagnosing these failures requires reproducing the exact run, which is often impossible.

Traces make three things possible:

**Debugging with evidence.** When an agent fails, you can inspect the full trajectory: what was in the context at each step, which tool was called, what it returned, and how the model used that information. You work backward from observed behavior rather than forward from hypotheses.

**Evaluation at scale.** Individual trace inspection doesn't scale to production volumes. Structured traces feed automated evaluators — LLM-as-judge for qualitative dimensions, code-based checks for deterministic properties — that score every run without human review. [LLM-as-Judge](../concepts/llm-as-judge.md) patterns only work when you have structured execution records to evaluate.

**Systematic improvement.** [Harrison Chase's framing](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md): "In software, the code documents the app; in AI, the traces do." The improvement loop — collect traces, enrich with evals, identify patterns, make targeted changes, validate before shipping — depends entirely on traces as its input. Without them, prompt and code changes are hypotheses without evidence.

## How It Works

### Trace Structure

A trace is a hierarchical record of an agent run. At the top level: a run with inputs, outputs, start/end time, and token usage. Nested within: spans for each LLM call (with prompt, completion, model, temperature, token counts), tool calls (with name, arguments, and return values), retrieval steps (with query, results, and scores), and child agent invocations in multi-agent systems.

The critical property is that spans share a `runId` for correlation. In a multi-agent pipeline, you can trace a user request from the orchestrator through each subagent to every model call, connected by a shared identifier. This is what distinguishes observability from logging: structured, correlated, queryable records rather than flat text.

### Instrumentation

Instrumentation happens at the framework layer. [LangChain](../projects/langchain.md) and [LangGraph](../projects/langgraph.md) emit traces automatically to LangSmith. The [OpenAI Agents SDK](../projects/openai-agents-sdk.md) supports OpenTelemetry spans. [Claude](../projects/claude.md) API calls can be traced by wrapping the client. The common pattern: a tracing client intercepts every LLM call and tool execution, records inputs/outputs with timing, and ships structured spans to a collection backend.

Phoenix uses OpenTelemetry as its wire format — the same standard used for distributed tracing in microservice architectures, adapted for LLM-specific span types. This means Phoenix traces can coexist with existing APM infrastructure rather than requiring a parallel observability stack.

LangSmith operates as a managed platform: traces are sent to Langchain's hosted backend, stored, and made queryable through a UI and API. The [LangSmith skill](../raw/repos/orchestra-research-ai-research-skills.md) covers 422 lines of production patterns including trace filtering, online evaluator configuration, and dataset construction from production runs.

### The Improvement Loop

The full loop as described in [LangChain's documentation](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md):

1. **Collect traces** — from production, staging, or benchmark runs
2. **Enrich with evals** — automated evaluators score every trace; human reviewers annotate selected ones via annotation queues
3. **Surface patterns** — clustering over scored traces reveals failure modes that individual inspection misses (e.g., "the agent consistently selects the wrong tool for queries of type X")
4. **Make targeted changes** — informed by specific observed failures rather than hypothetical ones
5. **Validate offline** — run changed agent against a dataset built from real production traces; compare scores before and after
6. **Ship with a gate** — CI/CD checks that evals pass before deployment; failure modes encoded as permanent regression tests

This loop connects directly to [Continual Learning](../concepts/continual-learning.md) at the context and harness layers. Traces feed harness optimization (a coding agent reads traces and proposes changes to orchestration code), context learning (distilling trace patterns into updated instructions or skills), and model fine-tuning (traces become SFT or RL training data).

### Online vs. Offline Evaluation

**Online evaluators** run continuously on production traces. They score outputs against configured criteria — helpfulness, format compliance, tool correctness — using LLM-as-judge or deterministic code checks. They catch quality drift and flag traces for human review, but they don't validate changes before they ship.

**Offline evaluations** run in development against curated datasets. The dataset is built from production traces: real queries, real failures, labeled with correct outputs or evaluation criteria by human reviewers. Every change runs against this dataset before deployment. Passing evaluations stay in the test suite permanently as regression guards.

The two work together: online evals tell you what's going wrong; offline evals confirm your fix addresses it.

## Tooling

**LangSmith** — Langchain's managed observability platform. Tight integration with LangChain/LangGraph; automatic tracing for any chain or agent. Key features: trace storage and querying, online evaluators, annotation queues, dataset construction from traces, offline eval runner, CI/CD integration. The LangSmith CLI + Skills pattern (described in source material) gives coding agents direct terminal access to trace data — on one eval set, Claude Code's performance on trace-analysis tasks jumped from 17% to 92% when equipped with LangSmith Skills (self-reported by Langchain).

**Phoenix (Arize)** — Open-source alternative using OpenTelemetry as the wire format. Supports LLM evaluation alongside tracing. Lower vendor lock-in than LangSmith; requires self-hosting. The [AI Research Skills library](../raw/repos/orchestra-research-ai-research-skills.md) covers both LangSmith and Phoenix as its two observability skills.

**Weights & Biases** — MLOps-oriented. Better at experiment tracking and training run comparison than production agent tracing, but useful when observability and training are tightly coupled.

**Custom logging + structured spans** — Teams building on raw APIs often implement lightweight tracing by wrapping model clients to log structured JSON. Cheaper, more flexible, but requires building querying and evaluation infrastructure separately.

## Concrete Failure Mode

**The quiet hallucination problem.** An LLM-judge evaluator scores a customer-facing agent's responses highly on "helpfulness" and "tone" — both reasonable dimensions. The agent is also fabricating supporting details in 8% of responses. The evaluator never checks for factual accuracy because no one built that evaluator. Traces exist, but no one built a quality dimension that catches this failure mode. The fix requires domain expertise to define "correct" for this specific use case, then building an evaluator around it. Observability infrastructure makes the fix possible; it doesn't automatically surface the problem.

## Infrastructure Assumption

Production trace volumes grow fast. A single agent handling 10,000 requests per day generates tens of thousands of spans — model calls, tool invocations, retrieval steps. LangSmith's pricing and retention policies at this scale are not publicly documented in detail. Teams assume trace storage is cheap; at production volumes with long retention, it may not be. Sampling strategies (trace 10% of runs, score 100% of sampled traces) are standard practice but require deliberate configuration and introduce selection bias in the evaluation data.

## When NOT to Use Full Observability Infrastructure

**Prototypes and early development.** Before you have production traffic, the improvement loop has no input. Investing in LangSmith integration, annotation queues, and offline eval infrastructure before you have real users generating real failures is premature. Console logging and manual inspection is sufficient until you have patterns worth measuring.

**Highly sensitive domains without data governance.** Traces contain the full context window — user inputs, retrieved documents, intermediate reasoning. If user data cannot leave your infrastructure, managed platforms like LangSmith require careful data processing agreements or local alternatives. Phoenix's self-hosted option exists for this reason.

**Simple, stateless agents with deterministic outputs.** If your agent always takes the same three steps and produces outputs you can validate with a regex, traditional testing is cheaper and more reliable than trace-based evaluation infrastructure.

## Unresolved Questions

**Trace sampling at scale.** No established guidance on which traces to sample for human review. Random sampling is cheap but misses rare failure modes. Failure-targeted sampling (sample traces with low automated scores) biases the annotation dataset. The tradeoff between coverage and annotation cost is poorly documented.

**Multi-agent trace attribution.** When a multi-agent pipeline fails, which agent's decision caused the failure? Traces provide a full record, but attributing blame in a coordinator-subagent architecture is still manual work. Tools for automated attribution don't exist.

**Eval suite maintenance.** Regression tests accumulate. An eval suite built from 18 months of production failures becomes expensive to run and may contain evaluators that test for failure modes no longer relevant to the current agent version. No established practice for pruning or versioning eval suites.

**Governance of annotated data.** Human reviewers label production traces. Those labels become training data for evaluators and eventually for models. The provenance chain — who labeled what, under what criteria, with what inter-annotator agreement — is rarely tracked in practice.

## Related Concepts and Projects

- [Execution Traces](../concepts/execution-traces.md) — the underlying data structure observability tools capture
- [LLM-as-Judge](../concepts/llm-as-judge.md) — evaluation pattern that runs on top of trace data
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — annotation queues are a structured form of HITL
- [Continual Learning](../concepts/continual-learning.md) — traces feed all three layers of the improvement loop (model, harness, context)
- [Self-Improving Agents](../concepts/self-improving-agents.md) — observability is the prerequisite; without traces, self-improvement has no input signal
- [LangChain](../projects/langchain.md) — primary framework with native LangSmith integration
- [LangGraph](../projects/langgraph.md) — graph-based orchestration with built-in tracing hooks
- [Claude](../projects/claude.md), [Claude Code](../projects/claude-code.md), [OpenClaw](../projects/openclaw.md) — agent implementations where observability enables the `.learnings/` error-logging pattern described in source material
- [Agent Harness](../concepts/agent-harness.md) — the harness layer that observability data can be used to optimize

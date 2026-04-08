---
entity_id: observability
type: concept
bucket: agent-architecture
abstract: >-
  Observability for LLM agents is the practice of capturing full execution
  traces, metrics, and structured feedback to make agent behavior inspectable,
  debuggable, and improvable in production—differentiated from traditional
  monitoring by the need to record multi-step reasoning trajectories, not just
  request/response pairs.
sources:
  - tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/jackchen-me-open-multi-agent.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
related:
  - claude-code
  - openclaw
  - claude
  - context-engineering
last_compiled: '2026-04-08T03:02:46.136Z'
---
# Observability for LLM Agents

## What It Is

Observability in LLM agent systems means capturing enough information about an agent's runtime behavior that you can reconstruct *why* it did what it did, not just *what* it did. For traditional software, logs and metrics suffice because the code is the authoritative record of behavior. For agents, the code describes what's *permitted*—the trace records what *happened* with a specific input, in a specific state, under specific conditions.

The gap is significant. An agent might select the wrong tool, hallucinate a fact, or abandon a subtask without any error being thrown. A log line saying "task completed" is useless without the reasoning trajectory, intermediate tool calls, and token-level context that produced that outcome.

Agent observability therefore centers on **execution traces**: structured records of every LLM call, tool invocation, retrieval step, intermediate output, and the causal chain linking them. Everything else—metrics, dashboards, annotations, automated evaluations—derives from that trace substrate.

## Why It Matters

Three problems make observability non-optional for production agents:

**Debugging is trace-dependent.** When an agent fails at step 7 of a 12-step task, you need to see what the model received at each prior step, what it returned, and how those outputs shaped subsequent inputs. Without traces, you're guessing. With traces, you can pinpoint whether the failure was a bad tool description, a context window overflow, a retrieval miss, or a model reasoning error.

**Improvement is trace-driven.** Continual learning at the context, harness, or model layer—all three rely on traces as the raw input. The [LangChain article on agent improvement loops](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md) states this directly: "In software, the code documents the app; in AI, the traces do." A coding agent given access to LangSmith traces improved from 17% to 92% on an eval set; the same agent without trace access proposed fixes that looked reasonable but missed the actual failure mode.

**Regression detection requires baselines.** When you update a prompt, swap a model, or modify orchestration logic, you need to know whether the change improved or degraded behavior. Offline evaluations run against trace-derived datasets provide that measurement.

## How It Works

### The Trace

A trace captures the full execution path of one agent run:

- **Span tree**: each LLM call, tool invocation, retrieval, and sub-agent call as a node with start/end timestamps
- **Inputs and outputs**: the actual content passed to and returned from each step
- **Token usage and latency**: per-call and aggregate
- **Metadata**: model version, agent ID, user/session ID, run ID for correlation

Modern implementations use [OpenTelemetry](https://opentelemetry.io/) as the underlying protocol. Tools like LangSmith and Arize Phoenix emit spans conforming to OpenTelemetry semantics, which means traces can be routed to any compatible backend. Phoenix's skill in the AI Research Skills Library is described as "Open-source AI observability with OpenTelemetry tracing and LLM evaluation"—the OpenTelemetry foundation makes traces portable across observability stacks. [Source](../raw/repos/orchestra-research-ai-research-skills.md)

### Online vs. Offline Evaluation

**Online evaluators** run automatically on production traces. They score outputs against configurable criteria without human intervention. Two patterns:

- *LLM-as-judge*: pass the full trajectory to a scoring model that assesses qualitative dimensions—helpfulness, policy adherence, reasoning quality—and returns a score. Useful for anything without a deterministic ground truth.
- *Code-based checks*: schema validation, format conformity, exact-match conditions, business rule compliance. Faster, cheaper, and more reliable for behaviors with clear right answers.

**Offline evaluations** run controlled experiments on curated datasets before any change ships. The workflow: collect traces from production, annotate ground truth or scoring criteria, build a test dataset, run updated agent versions against it, compare scores. This is the gate before deployment.

Together, online evals surface what's going wrong; offline evals confirm that a proposed fix addresses it. [Source](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md)

### Annotation and Human Feedback

Some failures escape automated scoring. A legal agent citing plausible but incorrect precedents, a medical agent giving clinically inappropriate advice, a customer service agent that's technically correct but contextually wrong—these require domain expertise to evaluate.

Annotation queues route selected traces to human reviewers. Traces get filtered in by automated score thresholds, user feedback signals (thumbs down), or feature-area tags. Reviewers attach ratings, corrections, and freeform comments. These annotations serve four distinct purposes:

1. Calibrating LLM-as-judge evaluators (label traces where the automated score disagrees with human judgment)
2. Creating ground truth for offline datasets (reviewers label the correct output for real production inputs)
3. Scoring open-ended outputs where no single correct answer exists
4. Generating natural language feedback that flows into clustering and pattern analysis

### Self-Logging Patterns

Some agent implementations treat observability as a first-class agent behavior rather than external infrastructure. The OpenClaw self-improving agent pattern logs errors to `.learnings/ERRORS.md`, captures corrections to `.learnings/LEARNINGS.md`, and promotes recurring lessons to `AGENTS.md` as permanent memory. The agent reviews these files before major tasks. [Source](../raw/tweets/coreyganim-how-to-make-your-openclaw-agent-learn-from-its-mis.md) This is observability embedded in the agent's own context layer—simpler to deploy than a full tracing stack, but also less structured and harder to query at scale.

### The Improvement Loop

Traces power all three layers of agent improvement identified by Harrison Chase: [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)

- **Context layer**: run offline jobs over recent traces to extract insights and update instructions, skills, or memory files. OpenClaw calls this "dreaming."
- **Harness layer**: give a coding agent access to traces, run it over logged task executions, have it suggest changes to orchestration code. The Meta-Harness pattern does this by storing logs in a filesystem and running a coding agent over them.
- **Model layer**: collect traces as training data for fine-tuning or RL. Requires the most infrastructure and carries catastrophic forgetting risk.

The context layer offers the fastest feedback cycle and lowest risk. Model-layer changes are the most expensive and hardest to validate.

### Infrastructure Pattern: onTrace Callback

The open-multi-agent framework's approach is representative of how traces get wired into frameworks. An optional `onTrace` callback receives structured spans for every LLM call, tool execution, task, and agent run, carrying timing, token usage, and a shared `runId` for correlation. Zero overhead when not subscribed, zero extra dependencies. [Source](../raw/repos/jackchen-me-open-multi-agent.md) This pattern—opt-in, structured, correlation-ID-based—is now standard across agent frameworks.

## Key Tools

**LangSmith** (LangChain): Trace collection, online evaluators, annotation queues, Insights Agent for automated clustering over production traces, CI/CD integration. Tightly coupled to LangChain/LangGraph but works with other frameworks via SDK. Self-reported benchmark improvement from 17% to 92% on coding tasks when traces were made available to Claude Code. [Source](../raw/articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md) Not independently validated.

**Phoenix** (Arize): Open-source alternative. OpenTelemetry-native, includes LLM evaluation tooling. Works across frameworks. [Source](../raw/repos/orchestra-research-ai-research-skills.md)

**Weights & Biases / MLflow / TensorBoard**: Traditional MLOps platforms with LLM-specific extensions. Better for training-time observability than production agent traces.

## Who Implements This

- [Claude Code](../projects/claude-code.md) produces traces that LangSmith ingests; the CLI integration lets coding agents query those traces directly
- [OpenClaw](../projects/openclaw.md) implements agent-side self-logging via structured markdown files, with a "dreaming" background process that synthesizes learnings
- [LangChain](../projects/langchain.md) / [LangGraph](../projects/langgraph.md) provide the primary tracing infrastructure via LangSmith
- [Claude](../projects/claude.md) is the model most commonly used as the LLM-as-judge in trace scoring pipelines

## Failure Modes

**Concrete failure mode**: An agent produces subtly wrong outputs at high frequency—plausible-sounding but factually incorrect. Online evaluators score it as passing because the format is correct and the LLM judge rates the tone as appropriate. Without domain-expert annotation or ground-truth datasets built from verified production examples, this failure mode is invisible until users report it. Automated scoring catches egregious failures; systematic subtle degradation requires human annotation at scale.

**Unspoken infrastructure assumption**: Tracing assumes you control the execution environment enough to instrument it. Agents running inside third-party platforms, browser extensions, or sandboxed environments may not permit the network calls or file writes that tracing requires. The entire improvement loop breaks if traces don't land.

**The cost problem at scale**: Token usage and latency data accumulates fast. LLM-as-judge evaluation runs additional inference on every production trace (or a sample of them). At high traffic, this becomes a non-trivial line item. Documentation for most tools doesn't address trace storage costs, retention policies, or the economics of 100% vs. sampled online evaluation.

## When Not to Use Full Trace Infrastructure

- **Early prototyping**: Adding tracing before you have production traffic creates infrastructure overhead before you have anything to improve. Start with logging and move to structured traces when you hit a failure you can't diagnose.
- **Single-step agents**: If your "agent" is a single LLM call with a fixed prompt, standard request logging is sufficient. Full span-tree tracing adds complexity without insight.
- **High-security environments**: Traces contain model inputs and outputs verbatim. If inputs include PII, PHI, or confidential content, you need trace redaction pipelines before you can route to a SaaS tracing platform. This is frequently underestimated.
- **Cost-sensitive production**: If you're paying per-token for LLM-as-judge scoring on every production trace, verify the economics before committing to that architecture.

## Unresolved Questions

**Trace standardization**: OpenTelemetry provides the transport layer, but there's no agreed schema for agent-specific spans (tool call inputs/outputs, reasoning steps, memory reads). Different frameworks emit traces in incompatible formats, which makes cross-framework analysis hard.

**Causal attribution**: A trace shows that step 3 produced a bad output, but determining whether the cause was the prompt at step 3, the output from step 2, or a retrieval miss at step 1 requires manual inspection or sophisticated causal analysis. Current tooling surfaces the trajectory but doesn't automate root cause attribution.

**Multi-agent trace correlation**: When one agent calls another (as in [Multi-Agent Systems](../concepts/multi-agent-systems.md)), traces from subagents need to be linked to the parent run. Most frameworks handle this with a shared `runId`, but correlation across different tracing backends (e.g., one agent using LangSmith, another using Phoenix) is not solved.

**Governance of annotation data**: Annotated traces containing user inputs and model outputs are valuable training data. Who owns them? What are the retention and deletion obligations? These questions are rarely answered in documentation.

## Relationship to Adjacent Concepts

Observability is the data layer that makes most other agent infrastructure concepts measurable:

- [Context Engineering](../concepts/context-engineering.md) decisions (what goes into the prompt) are validated by trace analysis showing where context deficits caused failures
- [Execution Traces](../concepts/execution-traces.md) are the primary artifact produced
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) annotation processes are how traces get enriched with ground truth
- [Self-Improving Agents](../concepts/self-improving-agents.md) consume traces as the input to their improvement cycles
- [LLM-as-Judge](../concepts/llm-as-judge.md) is the primary automated evaluation mechanism applied to traces
- [Agent Harness](../concepts/agent-harness.md) optimization (harness-level continual learning) is driven by trace analysis over task runs


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.6)
- [OpenClaw](../projects/openclaw.md) — implements (0.5)
- [Claude](../projects/claude.md) — implements (0.5)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.6)

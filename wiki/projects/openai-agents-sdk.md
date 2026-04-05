---
entity_id: openai-agents-sdk
type: project
bucket: agent-systems
sources:
  - repos/vectifyai-pageindex.md
  - repos/supermemoryai-supermemory.md
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/topoteretes-cognee.md
related:
  - OpenAI
last_compiled: '2026-04-05T05:29:41.101Z'
---
# OpenAI Agents SDK

## What It Does

The OpenAI Agents SDK is the official Python library for building multi-agent systems on top of OpenAI's models. It provides primitives for defining agents with tool use, handing off control between agents, and orchestrating multi-step workflows. The SDK targets engineers who want structured agent behavior rather than raw API calls, handling the run loop, tool dispatch, and tracing infrastructure.

The SDK sits at the orchestration layer: you define agents with instructions and tools, then `Runner.run()` drives the execution loop until a terminal state. It is model-native to OpenAI but not exclusively locked to it.

## Core Mechanism

The central execution path runs through `agents.Runner`, which manages the agent loop. Each iteration calls the model, dispatches tool calls, and checks whether to hand off to another agent or terminate. The loop continues until the model produces a final output without pending tool calls.

Key components:

- **`Agent`** class: holds `name`, `instructions`, `model`, and optional `tools` and `handoffs`. Instructions accept a callable for dynamic prompts.
- **`Runner.run()`**: async entry point. Accepts an agent and an input string or message list. Returns a `RunResult` with `final_output` and the full message history.
- **`ModelSettings`**: exposes model parameters like temperature, reasoning effort, and output format. The self-evolving agents cookbook references `ModelSettings` directly for candidate model comparison in optimization loops.
- **`trace()` context manager**: wraps execution in a named trace, visible in the OpenAI dashboard under logs. Used in the cookbook's `self_evolving_loop` to group all agent calls under a single trace ID.
- **Handoffs**: one agent transfers control to another by name. The receiving agent gets the conversation history and continues from there.

Tool calls are dispatched synchronously within the run loop. The SDK handles serialization and deserialization of tool inputs and outputs automatically.

For multi-agent orchestration, agents call other agents by registering them as handoff targets. The runner resolves the target agent, switches context, and continues the loop. This is how the self-evolving cookbook coordinates a `SummarizationAgent` and a `MetapromptAgent`: the outer orchestration loop calls `Runner.run()` on each independently rather than via handoff, but the tracing ties them together.

Install: `pip install openai-agents`

## Key Numbers

- GitHub stars: not separately tracked from the `openai` Python package; the SDK ships as `openai-agents` on PyPI
- The self-evolving agents cookbook targets a pass threshold of 0.8 average grader score and a lenient pass at 75% of graders passing or 0.85 average
- The cookbook's `MAX_OPTIMIZATION_RETRIES = 3` before alerting for manual intervention

Benchmark claims associated with downstream systems using the SDK (e.g., PageIndex's 98.7% on FinanceBench) are self-reported by third parties and independently unverified.

## Strengths

**Native tracing and observability.** The `trace()` context manager integrates with the OpenAI dashboard out of the box. You get per-call logs, agent switching visibility, and token usage without additional instrumentation. This matters for regulated or audited workflows where showing what happened matters as much as what was produced.

**Evals integration.** The SDK pairs cleanly with `client.evals` for grader-based feedback loops. The self-evolving agents pattern, creating evals with `client.evals.create()`, running them with `client.evals.runs.create()`, and parsing scores with custom functions, is a documented and repeatable pattern rather than a hack.

**Minimal surface area for orchestration.** `Agent` + `Runner.run()` + `handoffs` covers most multi-agent patterns without requiring a separate framework. The interface is thin enough to wrap without fighting abstractions.

**Multi-framework compatibility.** Third parties have built drop-in adapters: Supermemory's `withSupermemory` wrapper for the SDK, PageIndex's `agentic_vectorless_rag_demo.py`, and the GEPA optimization framework all integrate against it. This suggests the interface is stable enough to build on.

## Critical Limitations

**Concrete failure mode: prompt version drift in self-healing loops.** The self-evolving cookbook demonstrates a real production hazard. When the optimization loop fails all retries for a section, it keeps the most recently generated prompt even if that prompt performed worse than an earlier version. The `best_candidate` tracker only saves lenient-passing candidates. If no attempt passes the lenient threshold, no rollback occurs. The `VersionedPrompt.revert_to_version()` method exists but the orchestration loop never calls it automatically on exhausted retries. Operators have to notice this manually.

**Unspoken infrastructure assumption: synchronous polling within async loops.** `poll_eval_run()` uses `time.sleep(5)` in a blocking loop. When called inside `async def self_evolving_loop()` via `await get_eval_grader_score()`, the `time.sleep()` blocks the event loop rather than yielding. This works in a notebook but breaks under real async concurrency. The correct form is `await asyncio.sleep(5)`. The cookbook uses `asyncio.create_task()` for model candidate comparison, which makes this a genuine issue when running multiple eval calls concurrently.

## When NOT to Use It

**You need model-provider flexibility at the core.** The SDK defaults to OpenAI models and the tracing infrastructure is OpenAI-dashboard-specific. If your organization requires switching between Anthropic, Gemini, and OpenAI models at runtime, or needs vendor-neutral observability, you will spend effort working around the defaults. LangGraph or LiteLLM-backed frameworks handle provider heterogeneity more cleanly.

**Your team does not already pay for OpenAI API access.** The evals API, dashboard tracing, and AgentBuilder UI are all OpenAI-hosted services. Self-reporting cookbook patterns as production-ready assumes you have access to `client.evals.create()`, which requires an OpenAI API key. None of the observability or eval grader functionality works without it.

**You need guaranteed rollback on agent failure.** The SDK has no built-in transaction semantics. If an agent partially completes a multi-step workflow and fails, recovering state requires you to implement checkpointing yourself. For workflows where partial execution has side effects, such as writing to databases or calling external APIs mid-run, the SDK provides no compensating transaction support.

**You want to avoid OpenAI's Evals pricing at scale.** Each `client.evals.runs.create()` call runs graders against your data. With four graders per section and multiple optimization retries per section across a large document corpus, eval runs accumulate quickly. The cookbook's caching in `eval_cache` is a dict keyed by `(section, summary)` tuples, which means repeated sections with identical summaries hit cache but any variation causes a fresh eval run. At production scale on large datasets, this cost is not documented or estimated anywhere in the official materials.

## Unresolved Questions

**Governance of prompt versions in production.** The `VersionedPrompt` class in the cookbook is a runtime object with no persistence. After a process restarts, all prompt history is lost. There is no documented pattern for storing, auditing, or rolling back prompt versions across deployments. This matters for regulated domains like the healthcare use case the cookbook describes.

**Conflict resolution in multi-agent handoffs.** When agent A hands off to agent B, and agent B's output contradicts agent A's earlier output in the conversation history, the SDK has no documented resolution mechanism. The model sees the full history and may or may not reconcile conflicts depending on instruction design.

**Cost attribution per agent in multi-agent traces.** The dashboard shows traces grouped by the `trace()` context manager, but there is no documented API to query per-agent token consumption within a trace programmatically. Billing analysis requires parsing raw usage data separately.

**Thread safety of `VersionedPrompt` and `best_candidate`.** The cookbook uses module-level mutable state (`best_candidate`, `aggregate_prompt_stats`, `eval_cache`) across async calls. Under concurrent execution, these writes are not protected. The documentation does not address this.

## Alternatives

- **LangGraph**: use when your workflow needs explicit state machines with branching, cycle detection, and persistent checkpoints. Better for workflows with visible state that outlives a single process.
- **LlamaIndex Workflows**: use when your primary data flow involves document retrieval and you want tighter coupling between indexing and agent execution.
- **CrewAI**: use when you want role-based agent definitions with built-in task sequencing and a higher-level API, at the cost of less control over the run loop.
- **Direct API with custom orchestration**: use when you need full control over message construction, tool dispatch timing, or model provider switching without fighting framework conventions.

## Related Concepts and Projects

- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- Tool Use / Function Calling
- LLM Evaluation
- [PageIndex](../projects/pageindex.md) — uses the Agents SDK for agentic vectorless RAG demos
- [Supermemory](../projects/supermemory.md) — provides a memory wrapper compatible with the Agents SDK

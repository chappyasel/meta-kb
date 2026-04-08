---
entity_id: openai-agents-sdk
type: project
bucket: agent-architecture
abstract: >-
  OpenAI's Python/JS SDK for building agentic applications: structured tool
  calling, agent handoffs, and multi-agent coordination, with built-in tracing
  and guardrails around the model inference loop.
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/thedotmack-claude-mem.md
  - repos/thedotmack-claude-mem.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
related:
  - claude-code
  - anthropic
  - vector-database
  - chromadb
  - agent-harness
last_compiled: '2026-04-08T23:17:40.916Z'
---
# OpenAI Agents SDK

## What It Does

The OpenAI Agents SDK is a production-oriented framework for building agents around OpenAI models. It wraps the core inference loop with abstractions for tools, handoffs between specialized agents, input/output guardrails, and session state management. The SDK treats agents as configurable harnesses around a model: you define instructions, available tools, and handoff targets, then the `Runner` class manages the agentic loop until termination.

The architectural bet is "code-first over graph-first." Where [LangGraph](../projects/langgraph.md) expresses workflow logic as an explicit state graph with nodes and edges, the Agents SDK expresses it in native Python or TypeScript. No DSL, no graph definition, no compiled DAG. The loop is a while loop. Routing logic is a conditional. This makes the SDK easier to read and debug but harder to visualize and formally analyze.

The SDK was previously called "Swarm" (an experimental multi-agent project). The production release consolidated those ideas with the OpenAI platform's hosted tools and a formal tracing layer.

## Core Mechanism

### The Runner and the Loop

The `Runner` class (`agents/runner.py`) implements the agentic loop in three modes: `Runner.run()` (async), `Runner.run_sync()` (sync wrapper), and `Runner.run_streamed()` (streaming via async iterator).

Each turn: assemble the prompt (system instructions + tool schemas + conversation history), call the model, parse output. If `tool_calls` are present, execute them and append results as `ToolMessage` objects, then loop. If no tool calls and no handoff, return the final response. If a handoff is requested, swap the active agent and restart.

The loop itself is deliberately thin. Anthropic's documentation describes their equivalent as "a dumb loop where all intelligence lives in the model" — the OpenAI SDK takes the same position explicitly.

### Agents as Configuration

An `Agent` object holds: `name`, `instructions` (system prompt), `tools` (list of callable functions or hosted tools), `handoffs` (list of other agents this agent can delegate to), and optionally `output_type` (a Pydantic model for structured output).

```python
from agents import Agent, Runner

triage = Agent(
    name="Triage",
    instructions="Route the user to the right specialist.",
    handoffs=[billing_agent, support_agent],
)
```

Tools are registered via `@function_tool` decorator or explicit `FunctionTool` instances. The SDK generates JSON schemas from Python type annotations and docstrings, injects them into the model context, and handles argument extraction and result formatting automatically.

### Tool Types

Three categories of tools:

1. **Function tools**: Python or TypeScript functions decorated with `@function_tool`. Executed locally in the harness.
2. **Hosted tools**: `WebSearchTool`, `CodeInterpreterTool`, `FileSearchTool` — run on OpenAI's infrastructure, not the caller's.
3. **MCP tools**: Tools from [Model Context Protocol](../concepts/model-context-protocol.md) servers, surfaced through `MCPServerStdio` or `MCPServerSse` connectors.

This means the same agent definition can mix local business logic, cloud-hosted capabilities, and external MCP servers.

### Handoffs

A handoff is a structured transfer of control from one agent to another. The active agent calls a handoff tool, the `Runner` swaps the current agent, and the loop continues under the new agent's instructions and tool set. The handoff carries conversation history forward.

Handoffs are either direct (agents-as-tools, where the specialist handles a bounded subtask and returns) or full (the specialist takes over completely). The choice determines whether the original agent resumes after the subtask completes.

### Guardrails

Input guardrails run against the first user message before the loop starts. Output guardrails run against the agent's final response. Tool guardrails can run on every tool invocation. A "tripwire" mechanism halts the loop immediately if a guardrail fires.

```python
@input_guardrail
async def block_pii(ctx, agent, input) -> GuardrailFunctionOutput:
    has_pii = await check_for_pii(input)
    return GuardrailFunctionOutput(tripwire_triggered=has_pii)
```

The SDK separates permission enforcement from model reasoning at the architecture level: the model decides what to attempt, the guardrail layer decides what's allowed.

### State and Sessions

Four session strategies, mutually exclusive:

1. **Application memory**: caller manages conversation history, passes it on each `Runner.run()` call
2. **SDK sessions**: `Session` object backed by SQLite or Redis, handles history automatically
3. **Conversations API** (server-side): OpenAI hosts the conversation state
4. **`previous_response_id` chaining**: lightweight stateless chaining via response IDs

### Tracing

Every SDK run generates a trace: the full sequence of LLM calls, tool executions, handoffs, and guardrail evaluations. Traces are viewable in the OpenAI dashboard. The tracing layer is not optional and not free — every production run produces telemetry that goes to OpenAI's platform.

### Structured Outputs

When `output_type` is set to a Pydantic model, the SDK enforces schema-constrained generation. The model must return JSON conforming to the schema. This eliminates output parsing fragility for structured workflows.

## Key Numbers

- **GitHub stars**: Not available from sources; the SDK is OpenAI's official offering, widely adopted by virtue of platform position rather than community star count.
- **Tau-bench v3 airline** (from meta-agent source): A baseline agent built on the Agents SDK scored 67% holdout accuracy before harness optimization. After automated harness improvement via meta-agent, it reached 87%. This is self-reported by canvas-org/meta-agent, not independently validated.
- **TerminalBench 2.0**: LangChain changed only the infrastructure wrapping their LLM (same model, same weights) and moved from outside top 30 to rank 5. This is cited in practitioner analysis but not independently verified.

The harness-matters thesis is real and has supporting evidence, but the specific numbers above come from projects using the SDK, not from OpenAI's own benchmarking of the SDK itself.

## Strengths

**Native OpenAI integration.** The SDK has direct access to hosted tools (WebSearch, CodeInterpreter, FileSearch) that run on OpenAI's infrastructure. External frameworks must call these through APIs; the SDK surfaces them as first-class tool types.

**Code-first readability.** Workflow logic lives in Python or TypeScript. Debugging a multi-agent handoff chain means reading function calls, not interpreting a graph visualization. For teams that know Python, the SDK requires no new abstractions beyond the core three: `Agent`, `Runner`, `function_tool`.

**Structured output via Pydantic.** Schema-constrained generation without post-hoc parsing. The model either returns valid JSON or the SDK handles retry. This eliminates an entire category of fragile string parsing.

**MCP support.** First-party [Model Context Protocol](../concepts/model-context-protocol.md) integration means the SDK can connect to any MCP server as a tool source, enabling interoperability with the growing MCP ecosystem.

**Self-improvement compatibility.** The auto-harness pattern (demonstrated by meta-agent and auto-harness projects) works on Agents SDK because the harness components are modifiable at runtime: system prompt, tools, stop conditions, error handling. This is prerequisite infrastructure for [self-improving agents](../concepts/self-improving-agents.md).

## Critical Limitations

**Concrete failure mode — context rot under load.** The SDK's default conversation history management appends every tool call and result to the context window. For tasks with many tool invocations (common in coding or research agents), context fills with low-signal intermediate observations. Model performance degrades as key information drifts toward mid-window positions, a problem documented independently as [Lost in the Middle](../concepts/lost-in-the-middle.md). The SDK does not automatically compact or summarize history. Callers must implement compaction themselves or use a hosted session strategy that doesn't expose this control.

**Unspoken infrastructure assumption — OpenAI lock-in.** The SDK is built around OpenAI's API, response format, and tool-calling protocol. Switching to a different model provider requires either a compatibility layer (like [LiteLLM](../projects/litellm.md)) or framework replacement. The hosted tools (WebSearch, CodeInterpreter) have no alternative — they only work on OpenAI's infrastructure. The tracing layer sends all telemetry to OpenAI's platform. An agent built on this SDK cannot be fully migrated without significant rework.

## When NOT to Use It

**Multi-provider or model-agnostic deployments.** If your infrastructure routes requests across OpenAI, Anthropic, and open-source models, the Agents SDK is the wrong foundation. [LangGraph](../projects/langgraph.md), [LiteLLM](../projects/litellm.md), or provider-agnostic frameworks handle this better.

**Complex stateful workflows requiring explicit control flow.** The code-first approach means workflow routing logic is implicit in Python conditionals and handoff configurations. For workflows requiring auditable state machines, rollback to specific checkpoints, or visual workflow design, LangGraph's explicit graph model is better suited.

**Teams avoiding OpenAI telemetry.** The SDK's tracing is not opt-out in standard usage. Every run produces traces that go to OpenAI's platform. For enterprises with data residency requirements or competitive sensitivity about agent behavior, this is a hard constraint.

**Cost-sensitive high-volume deployments using smaller models.** The SDK is optimized for GPT-4-class models. Operators running high-volume workflows on smaller open-source models via [Ollama](../projects/ollama.md) or [vLLM](../projects/vllm.md) gain nothing from the SDK's hosted tool integrations and pay the overhead of the framework for no benefit.

## Unresolved Questions

**Cost at scale.** The SDK does not expose token budgeting or automatic compaction. There's no built-in mechanism to cap spend per run or alert on runaway loops. The `max_turns` parameter provides a hard turn limit, but token consumption per turn is unconstrained. Large-scale production deployments need to build cost controls externally.

**Proposer/optimizer governance.** Projects like meta-agent and auto-harness demonstrate that the Agents SDK harness can be modified autonomously by an optimizer. The SDK has no built-in mechanism to constrain what an optimizer can change or require human approval before harness modifications take effect. The guardrail system enforces constraints on inputs and outputs, not on harness self-modification.

**Handoff conflict resolution.** When an agent has multiple valid handoff targets and the model's routing choice is ambiguous, there's no documented fallback. The model selects a handoff tool based on its instructions; if those instructions are underspecified, the routing is arbitrary. How to detect and recover from misrouted handoffs is not addressed in the SDK documentation.

**Multi-tenant session isolation.** The `Session` object backed by SQLite or Redis stores conversation history, but the SDK documentation does not specify isolation guarantees between sessions in shared infrastructure. For SaaS applications serving multiple users, this requires validation.

## Alternatives

**[LangGraph](../projects/langgraph.md)**: Use when you need explicit, auditable state machines, time-travel debugging, or visual workflow design. Better for complex multi-step workflows where routing logic must be formally specified and testable.

**[LangChain](../projects/langchain.md)**: Use for broad ecosystem access and provider flexibility. More abstraction layers, more complexity, but not locked to OpenAI.

**[CrewAI](../projects/crewai.md)**: Use for role-based multi-agent systems where agents have defined personas and collaborate on tasks. Higher-level abstraction than the Agents SDK, with less control over execution details.

**[AutoGen](../projects/autogen.md)**: Use for conversation-driven orchestration with complex group dynamics. Better for research and experimental multi-agent setups than production deployments.

**[DSPy](../projects/dspy.md)**: Use when the primary goal is prompt optimization rather than workflow orchestration. DSPy compiles prompts; the Agents SDK orchestrates execution.

**Claude Agent SDK ([Anthropic](../projects/anthropic.md))**: Use when deploying [Claude](../projects/claude.md) models. The meta-agent and auto-harness projects demonstrate that harness self-improvement currently targets the Claude Agent SDK as their primary framework, suggesting a more active self-improvement ecosystem around it at the time of writing.

## Relationship to Agent Harness Concept

The Agents SDK is a concrete implementation of what the practitioner community now calls an [Agent Harness](../concepts/agent-harness.md): the complete software infrastructure wrapping an LLM. Akshay Pachaar's analysis identifies twelve harness components (orchestration loop, tool layer, memory, context management, prompt assembly, output parsing, state persistence, error handling, guardrails, verification, subagent spawning, and lifecycle management). The Agents SDK covers most of these, leaving context compaction, cost management, and verification loop design to the caller.

The harness-matters thesis is directly relevant here. LangChain demonstrated that changing only the harness around an identical model can move benchmark rankings by 25+ positions. The OpenAI Agents SDK provides the scaffolding; how much performance you extract depends on how well you engineer the parts the SDK leaves to you.

## Related Concepts and Projects

- [Agent Harness](../concepts/agent-harness.md) — the broader concept this SDK instantiates
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — handoffs implement multi-agent coordination
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — guardrail tripwires are one implementation pattern
- [Context Management](../concepts/context-management.md) — the SDK's weakest area, left largely to callers
- [Model Context Protocol](../concepts/model-context-protocol.md) — first-party MCP integration
- [Self-Improving Agents](../concepts/self-improving-agents.md) — meta-agent and auto-harness demonstrate harness self-improvement on top of this SDK
- [ReAct](../concepts/react.md) — the underlying loop pattern the Runner implements
- [Observability](../concepts/observability.md) — built-in tracing to OpenAI's platform
- [Claude Code](../projects/claude-code.md) — primary competitor; Anthropic's equivalent harness
- [LangGraph](../projects/langgraph.md) — graph-based alternative with explicit state management
- [Tau-bench](../projects/tau-bench.md) — benchmark used to evaluate harness quality on customer service tasks

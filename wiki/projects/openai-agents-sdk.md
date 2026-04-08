---
entity_id: openai-agents-sdk
type: project
bucket: agent-architecture
abstract: >-
  OpenAI's Python/JS SDK for building production agents: tool use, multi-agent
  handoffs, built-in tracing, and guardrails around any OpenAI model or MCP
  server.
sources:
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - repos/thedotmack-claude-mem.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/thedotmack-claude-mem.md
related:
  - claude-code
  - vector-database
  - chromadb
  - agent-harness
  - anthropic
  - react
  - vector-database
  - agent-harness
last_compiled: '2026-04-08T03:00:11.676Z'
---
# OpenAI Agents SDK

## What It Is

The OpenAI Agents SDK is the official Python and TypeScript library for building agentic applications on top of OpenAI models. It provides a structured harness around the ReAct loop: agents defined by instructions and tool sets, a `Runner` class that drives the orchestration cycle, handoff primitives for transferring control between agents, and built-in tracing for observability.

OpenAI positions it as the successor to the earlier Swarm experiment, now with production capabilities including guardrails, streaming, lifecycle hooks, and first-class support for the [Model Context Protocol](../concepts/model-context-protocol.md).

## Architectural Design

The SDK expresses agent workflow as Python/TypeScript code rather than a graph DSL or configuration file. The key design bet: developers already know how to write functions and conditionals; forcing them to learn a declarative graph syntax adds friction without adding power. This is explicitly contrasted with [LangGraph](../projects/langgraph.md)'s graph-based approach.

**Core abstractions:**

- `Agent`: a model binding plus instructions, tools, and handoff targets
- `Runner`: the orchestration loop, available in sync, async, and streamed variants
- `Tool`: function tools (Python callables decorated with `@function_tool`), hosted tools (WebSearch, CodeInterpreter, FileSearch), and MCP server connections
- `Guardrail`: input and output validation that runs as a parallel LLM call; a "tripwire" halts the agent immediately on trigger
- `Handoff`: transfers control from one agent to another, optionally with context

The Runner executes a while loop: assemble context, call model, parse output, execute tool calls, feed results back, check termination. The SDK calls this a "dumb loop" — all intelligence lives in the model. The harness manages turns.

**Memory options** are explicit configuration choices rather than automatic behavior: application-managed state (developer owns the dict), SDK sessions (in-process), server-side Conversations API, or lightweight `previous_response_id` chaining. There is no built-in long-term memory; you integrate [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), or a [Vector Database](../concepts/vector-database.md) yourself.

**Multi-agent coordination** takes two forms:
- *Agents-as-tools*: a specialist agent handles a bounded subtask and returns its result to the caller
- *Handoffs*: a specialist takes full control of the conversation thread

Both patterns are expressed as regular Python/TypeScript function calls, not graph edges.

## How the Orchestration Loop Works

```python
from openai.agents import Agent, Runner, function_tool

@function_tool
def search_web(query: str) -> str:
    ...

agent = Agent(
    name="researcher",
    instructions="You are a research assistant.",
    tools=[search_web],
)

result = Runner.run_sync(agent, "Summarize recent AI papers on memory")
```

`Runner.run_sync` drives the loop synchronously. `Runner.run` returns an async iterator. `Runner.run_streamed` yields events as tokens and tool results arrive.

Each iteration:
1. Context assembly: system prompt + tool schemas + conversation history + current message
2. Model call via the Responses API
3. Output classification: text only (terminate), tool calls (execute and loop), handoff (swap active agent)
4. Tool execution: argument validation, permission check, sandboxed call, result formatting
5. Guardrail evaluation if configured
6. Append to history, check token budget, loop

The SDK handles tool call parallelism for read-only tools automatically. Mutating operations serialize.

**Guardrails** run as parallel model calls against the same input/output. They check conditions like "does this response contain PII" or "is this request within scope" and fire a tripwire that stops the loop before the result reaches the user. Three levels: input (fires on first agent), output (fires on final answer), tool (fires before each tool execution).

## Tool System

Three categories of tools ship with the SDK:

**Function tools**: any Python/TypeScript callable decorated with `@function_tool`. The decorator extracts the docstring and type annotations to build the JSON schema automatically.

**Hosted tools**: managed by OpenAI's servers, not the developer's infrastructure. WebSearch (Bing-backed retrieval), CodeInterpreter (sandboxed Python execution), FileSearch (vector search over uploaded files). These bypass the developer's server entirely.

**MCP tools**: the SDK connects to any [Model Context Protocol](../concepts/model-context-protocol.md) server and exposes its tools to the agent. This is the extensibility mechanism for integrating third-party services without writing custom tool wrappers.

Tool schema injection into context is automatic. The agent sees all available tools at every turn unless you scope dynamically with `tool_choice` or filter the tool list per step.

## Multi-Agent Coordination

Handoffs are the SDK's answer to [Multi-Agent Systems](../concepts/multi-agent-systems.md). A handoff is a special tool call that transfers control:

```python
triage_agent = Agent(
    name="triage",
    instructions="Route requests to the appropriate specialist.",
    handoffs=[billing_agent, technical_agent],
)
```

When the triage agent calls `transfer_to_billing_agent`, the Runner swaps the active agent and continues the loop with the new agent's instructions and tools. Context from previous turns is preserved in the conversation history.

The SDK does not implement a supervisor pattern with a manager agent coordinating workers — that's [AutoGen](../projects/autogen.md)'s territory. Handoffs are linear transfers, not fan-out coordination. For parallel task execution, you run multiple `Runner` instances and aggregate results yourself.

## Tracing and Observability

Every SDK run generates a trace: a structured record of each agent turn, tool call, guardrail evaluation, and handoff. Traces export to OpenAI's platform dashboard by default, with hooks to send them elsewhere.

This connects to the broader [Observability](../concepts/observability.md) question in agent systems. The SDK makes tracing opt-out rather than opt-in — a reasonable default for production systems where silent failures compound quickly.

Lifecycle hooks (`on_tool_call`, `on_handoff`, `on_guardrail_tripwire`) allow custom instrumentation without modifying agent logic.

## Key Numbers

- **GitHub stars**: ~12,000 (Python repo), as of mid-2025. Self-reported adoption metrics from OpenAI aren't available.
- **Tau-bench performance**: the auto-harness paper using the SDK as its agent template reports improvement from 67% to 87% on tau-bench v3 airline tasks after automated harness optimization — but this measures the optimization system, not the SDK baseline. The 67% starting point with Haiku 4.5 is the SDK's vanilla performance on that benchmark. (Self-reported by NeoSigma; single-run results, no variance estimates.)
- **TerminalBench**: the agent-harness analysis cites LangChain jumping from outside top 30 to rank 5 by changing only infrastructure around the same model. This isn't an SDK-specific number but illustrates the category claim that harness design drives performance more than model choice.

No independently verified benchmark suite exists specifically for the OpenAI Agents SDK's default configuration.

## Strengths

**First-party integration**: native support for OpenAI's Responses API, structured outputs via Pydantic, and hosted tools like CodeInterpreter. The SDK is co-designed with the models, which matters — [Claude Code](../projects/claude-code.md)'s model was post-trained with its specific harness in the loop, and OpenAI does the same.

**Code-first, no DSL**: workflow logic is plain Python/TypeScript. Debugging is straightforward. Adding a new routing condition is an if statement, not a graph edge.

**Guardrails as first-class**: the tripwire mechanism for safety enforcement is built in, not bolted on. For production customer-facing agents, this matters.

**MCP integration**: connecting to external services via MCP servers reduces the volume of custom tool code. A marketplace of compatible servers exists and grows independently of the SDK.

**Auto-harness compatibility**: the SDK's structure (harness = agent instructions + tools + hooks) is explicitly what systems like meta-agent and auto-harness target for automated optimization. The SDK is the template used in published self-improvement experiments.

## Limitations

**Concrete failure mode — context rot at scale**: the SDK does not automatically manage context window pressure. As conversations grow, performance degrades by 30%+ when key content lands in mid-window positions ("Lost in the Middle" effect). You must implement compaction, summarization, or observation masking yourself. There is no built-in equivalent to Claude Code's three-tier memory hierarchy or LangGraph's state reducers. Long-running agentic tasks will silently degrade without explicit context management code.

**Unspoken infrastructure assumption**: hosted tools (WebSearch, CodeInterpreter, FileSearch) require sending data to OpenAI's servers. For enterprise workloads with data residency requirements or air-gapped deployments, these tools are unavailable and the alternatives require building equivalent infrastructure yourself. The SDK documentation doesn't flag this prominently.

## When NOT to Use It

**Model-agnostic deployments**: the SDK is built around OpenAI's API. Using it with non-OpenAI models requires [LiteLLM](../projects/litellm.md) or similar shims, and you lose native support for structured outputs, hosted tools, and the tracing dashboard. [LangGraph](../projects/langgraph.md) or [CrewAI](../projects/crewai.md) are better choices when the model provider is variable.

**Complex parallel orchestration**: fan-out/fan-in patterns where multiple agents work simultaneously and a supervisor aggregates results aren't a natural fit. [AutoGen](../projects/autogen.md)'s group chat and magentic patterns handle this better.

**Non-OpenAI fine-tuned models**: if your production model is a fine-tuned Llama or Mistral variant hosted on [vLLM](../projects/vllm.md) or [Ollama](../projects/ollama.md), the SDK's first-party integrations don't apply. The overhead of adaptation likely exceeds the value of using the official SDK.

**Graph-auditable workflows**: regulated industries sometimes require explainable, auditable decision paths. LangGraph's explicit state graph with checkpointing at super-step boundaries is easier to audit than the SDK's imperative Python loop.

## Unresolved Questions

**Cost at scale**: hosted tools (WebSearch, CodeInterpreter) run on OpenAI's infrastructure and are billed separately from model tokens. The SDK doesn't expose cost tracking per tool call or per run. Long agentic tasks with frequent web searches can accumulate costs invisibly. No public pricing calculator exists for estimating hosted tool costs at volume.

**Conflict resolution in multi-agent handoffs**: when a specialist agent returns control to a triage agent, the conversation history includes both agents' outputs. The documentation doesn't specify how the triage agent disambiguates conflicting tool results or partial completions from the handoff chain. In practice, this depends on prompt engineering in the triage agent's instructions.

**Governance for guardrails**: the guardrail system uses an LLM-as-judge pattern — a separate model call evaluates each input/output. Which model runs the guardrail, what its error rate is, and how false positives compound across a multi-turn conversation are not documented. For safety-critical applications, the answer "we run another LLM call" requires more specification.

**Harness-model coupling**: published research on agent harness optimization ([Agent Harness](../concepts/agent-harness.md)) shows that models are now post-trained with specific harnesses in the loop. The SDK's default prompt structures and tool schemas may perform better on OpenAI models than on alternatives precisely because the model was trained on this scaffolding. The magnitude of this coupling effect is not disclosed.

## Alternatives

**[LangGraph](../projects/langgraph.md)**: use when you need explicit state management with checkpointing and time-travel debugging, multi-provider model support, or complex graph-based routing. LangGraph's steeper learning curve pays off for workflows where the execution path needs to be auditable or replayed.

**[CrewAI](../projects/crewai.md)**: use for role-based multi-agent collaboration where the team metaphor maps naturally to your problem. CrewAI's Flows layer adds deterministic routing around autonomous crews.

**[AutoGen](../projects/autogen.md)**: use for parallel fan-out coordination, group chat patterns, or research prototyping where conversation-driven orchestration is natural.

**[LangChain](../projects/langchain.md)**: use when you need the broadest ecosystem of integrations and are comfortable with LCEL's composition model. LangChain's AgentExecutor is deprecated in favor of LangGraph, but the integrations library remains the most extensive.

**[DSPy](../projects/dspy.md)**: use when your priority is prompt optimization and systematic evaluation rather than production orchestration. DSPy compiles agent behavior from declarative specifications; the OpenAI Agents SDK assumes you write your own instructions.

## Related Concepts

- [ReAct](../concepts/react.md): the Thought-Action-Observation loop the SDK's Runner implements
- [Agent Harness](../concepts/agent-harness.md): the broader concept this SDK instantiates
- [Multi-Agent Systems](../concepts/multi-agent-systems.md): the coordination patterns handoffs enable
- [Human-in-the-Loop](../concepts/human-in-the-loop.md): interrupt patterns for human approval before tool execution
- [Context Management](../concepts/context-management.md): the problem the SDK leaves mostly to the developer
- [Tool Registry](../concepts/tool-registry.md): how tool schemas are managed and injected

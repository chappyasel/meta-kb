---
entity_id: google-adk
type: project
bucket: agent-systems
sources:
  - repos/gepa-ai-gepa.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/topoteretes-cognee.md
related: []
last_compiled: '2026-04-05T05:37:05.062Z'
---
# Google Agent Development Kit (ADK)

Google's open-source Python framework for building, composing, and deploying AI agents. ADK provides a runtime for single and multi-agent systems with built-in tool integration, memory management, session state, and evaluation tooling. It is Google's infrastructure play in the agent framework space, positioning Gemini models as the default execution environment while maintaining compatibility with other LLM backends.

## What ADK Does and What's Architecturally Unique

ADK centers on a composable agent graph model. Individual agents become nodes; you wire them together into pipelines or hierarchies, and ADK handles the orchestration. The framework ships with three execution modes: sequential (agents run in order, passing outputs forward), parallel (agents run concurrently), and loop (an agent runs repeatedly until a termination condition fires).

The architectural bet is on agents-as-tools. Any agent in a graph can be invoked as a tool by another agent, collapsing the distinction between "orchestrator" and "subagent" into a single abstraction. This lets you build deeply nested systems without a separate orchestration layer.

ADK also has first-party integrations with Google Cloud infrastructure: Vertex AI for model serving, Cloud Run and Agent Engine for deployment, and Google's ecosystem of tools (Search, Code Execution, Maps). The framework ships with a local web UI for interactive development and debugging, which distinguishes it from frameworks that are purely code-first.

Built-in GEPA integration at `adk.dev/optimize/` adds automated prompt and agent optimization using reflective evolutionary search, which is unusual for a framework to include natively rather than as a third-party plugin.

## Core Mechanism

**Agent class** (`google/adk/agents/`): The base `Agent` class wraps an LLM call with a system prompt, tool list, and references to sub-agents. The `LlmAgent` subclass handles most production use cases. Agents receive an `InvocationContext` containing session history, state, and metadata.

**Tool protocol**: Tools implement a standard interface with a description string and an `execute()` method. ADK provides built-in tool types: `FunctionTool` (wraps any Python callable), `AgentTool` (wraps another agent), and pre-built tools for Google Search, code execution, and API calls. The framework auto-generates tool schemas from Python type hints and docstrings.

**Session and memory management**: ADK separates session state (within a conversation) from memory (across conversations). `SessionService` persists conversation history; `MemoryService` handles retrieval of past interactions. Both have in-memory and persistent backends. The `State` dictionary within a session is mutable and shared across all agents in a graph, acting as a scratchpad for inter-agent communication.

**Runner classes**: `Runner` and `StreamingRunner` manage the execution loop. The runner receives user input, routes it to the root agent, handles tool calls, manages the back-and-forth with the LLM until a final response or termination, and returns events. Events are the primary output primitive: structured objects representing model responses, tool calls, tool results, and state mutations.

**Multi-agent coordination**: When one agent invokes a sub-agent as a tool, ADK spawns a child invocation context. The parent agent sees the sub-agent's output as a tool response. This recursive structure means debugging a 5-level deep agent hierarchy requires tracing through nested invocation contexts.

**Evaluation framework** (`google/adk/evaluation/`): ADK ships with an `EvaluationOrchestrator` that runs agents against test cases defined in JSON, scores responses on criteria you define, and reports metrics. This is baked into the CLI (`adk eval`), not a separate package.

## Key Numbers

ADK launched publicly in April 2025. GitHub star counts and adoption metrics are not independently verified here; the GEPA README (self-reported) lists Google ADK as an official integration with GEPA-powered optimization at `adk.dev/optimize/`. Databricks reported 90x cost reductions using GEPA with other frameworks; no equivalent ADK-specific production benchmark is publicly available. The framework targets Python 3.9+.

## Strengths

**Google ecosystem integration is genuine.** If you're building on Vertex AI, using Gemini models, or deploying to Cloud Run, ADK reduces the integration surface substantially. Authentication, model routing, and deployment configuration are pre-wired in ways that matter at production scale.

**The local web UI accelerates development.** `adk web` spins up an interactive chat interface with full trace inspection, tool call visualization, and session state inspection. For teams iterating on agent behavior, this shortens the debug loop compared to frameworks where you instrument logging yourself.

**Built-in evaluation tooling.** Most frameworks treat evaluation as an afterthought or delegate to external tools. ADK ships with an eval runner, test case format, and CLI integration. This matters for teams that need to gate deployments on benchmark thresholds.

**GEPA integration for automated optimization.** Having reflective evolutionary prompt optimization built in means teams can run optimization loops against their agents without standing up separate infrastructure. [GEPA](../projects/gepa.md) achieves 35x fewer evaluations than RL-based optimization methods.

## Critical Limitations

**Concrete failure mode: nested agent debugging is opaque.** When a five-level deep agent hierarchy fails, ADK surfaces an error at the top level. Tracing which sub-agent produced a bad tool call or hallucinated a state mutation requires manually walking nested invocation context logs. The web UI helps for development, but in production you're relying on Cloud Trace or custom logging middleware. Teams building deeply hierarchical systems consistently report this as the primary pain point.

**Unspoken infrastructure assumption: Gemini as the default.** ADK supports other LLM backends, but the default initialization, example code, documentation, and tool integrations all assume Gemini. Teams running Anthropic or OpenAI models in production need to explicitly configure `LiteLlm` wrappers and will find some tool integrations don't translate cleanly. The framework is not model-agnostic in practice even if it is in architecture.

## When NOT to Use ADK

**Don't use ADK when you're not in the Google Cloud ecosystem.** If your team deploys to AWS, uses OpenAI models in production, and has no Vertex AI footprint, ADK's integrations are overhead rather than value. LangGraph or CrewAI provide similar orchestration capabilities without Google-specific dependencies.

**Don't use ADK for lightweight single-agent tasks.** The framework carries enough abstraction overhead that a simple "agent with three tools" is overengineered in ADK. For single-agent use cases, calling the LLM API directly or using a minimal wrapper is faster to build and easier to maintain.

**Don't use ADK if your team needs fine-grained control over the execution loop.** ADK's runner abstracts the LLM-tool-LLM loop. Teams that need custom retry logic, streaming partial responses mid-tool-call, or non-standard tool approval flows will fight the framework's assumptions rather than extending them cleanly.

**Don't use ADK when your agents need to interoperate with non-Google platforms at runtime.** ADK's Agent-to-Agent (A2A) protocol is Google's proposed standard for cross-platform agent communication, but adoption outside Google's own tools is limited as of mid-2025. If your system needs to call agents built on CrewAI or AutoGen at runtime, the A2A integration is immature.

## Unresolved Questions

**Long-term governance.** ADK is open-source but maintained by Google. Google has a track record of deprecating developer tools when strategic priorities shift (Cloud Functions v1, Apigee pricing changes, Firebase restructuring). There is no independent foundation or governance structure documented. For teams building 3-5 year infrastructure on ADK, this is a real risk that the documentation does not address.

**Cost model at scale.** ADK handles orchestration; you pay for LLM calls separately. But the framework's auto-retry logic, sub-agent invocations, and evaluation loops all generate LLM calls that compound in non-obvious ways. For complex multi-agent systems, the relationship between agent graph depth and per-request LLM call count is not documented with concrete formulas or cost guidance.

**State conflict resolution in parallel agents.** When parallel agents write to shared `State` simultaneously, ADK's documentation does not specify the conflict resolution semantics. Whether last-write-wins, whether writes are queued, or whether the user is responsible for avoiding conflicts is not clearly documented. This matters for any parallel graph where sub-agents share state keys.

**Operator model and trust boundaries.** ADK includes an "operator" concept for configuring agent behavior in deployment, but the trust model between operators, users, and agents (who can override what, and when) is not fully specified in public documentation. For enterprise deployments where different organizational roles need different agent permissions, this gap requires custom implementation.

## Alternatives

**Use LangGraph** when you need fine-grained control over the agent execution loop, are building on AWS or Azure, or need the mature ecosystem of LangSmith observability tooling. LangGraph's explicit state machine model makes complex conditional routing more debuggable than ADK's event-based execution.

**Use CrewAI** when your primary mental model is "team of specialized agents with defined roles" and you want role-based coordination with minimal boilerplate. CrewAI is more opinionated about agent structure, which speeds initial development for teams new to multi-agent systems.

**Use AutoGen** (Microsoft) when you're building research-oriented multi-agent systems, need strong human-in-the-loop patterns, or are already in the Azure ecosystem. AutoGen's conversational multi-agent model handles semi-structured collaboration between agents better than ADK's tool-invocation model.

**Use the LLM API directly** when you have one or two agents with a fixed set of tools and don't need session management or evaluation infrastructure. The overhead ADK adds is not justified for systems that won't grow in complexity.

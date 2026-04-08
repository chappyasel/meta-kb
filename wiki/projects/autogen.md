---
entity_id: autogen
type: project
bucket: multi-agent-systems
abstract: >-
  AutoGen is Microsoft's open-source multi-agent framework enabling
  conversational AI workflows between autonomous and human-in-the-loop agents;
  distinguishes itself through flexible conversation patterns and a layered API
  for composing agent teams.
sources:
  - tweets/godofprompt-breaking-mipt-just-ran-the-largest-ai-agent-co.md
  - repos/caviraoss-openmemory.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - retrieval-augmented-generation
  - claude
  - model-context-protocol
last_compiled: '2026-04-08T02:54:55.381Z'
---
# AutoGen

## What It Does

AutoGen is Microsoft's open-source framework for building applications where multiple LLM-powered agents converse with each other, with humans, and with tools to complete tasks. Released in 2023, it lets developers define agents with different capabilities and then wire them into conversation topologies: two-agent back-and-forth, group chats, nested hierarchies, or custom orchestration logic.

The core insight is that complex tasks decompose better when different agents specialize and critique each other's outputs than when a single agent tries to do everything. A coding agent writes Python, an executor runs it, a critic reviews the result, and they iterate until the task is done or a human intervenes.

As of AutoGen v0.4 (a near-complete rewrite), the framework splits into two layers: a low-level `Core` API built on async message passing, and `AgentChat`, a higher-level API for common multi-agent patterns. The rewrite was motivated by production feedback showing that v0.2's tight coupling made custom orchestration difficult.

## Core Mechanism

**Agent model:** Each agent in AutoGen is a `ConversableAgent` (v0.2) or a `BaseChatAgent` subclass (v0.4). Agents maintain their own message history and respond to messages via a `generate_reply` method. The `AssistantAgent` wraps an LLM call; the `UserProxyAgent` wraps human input or code execution.

**Conversation patterns:** AutoGen implements several built-in topologies in `autogen/agentchat/`:
- `TwoAgentChat`: the simplest loop, two agents alternating messages until a termination condition
- `GroupChat` / `GroupChatManager`: a mediator agent routes messages to the appropriate participant based on a speaker selection policy (round-robin, LLM-based, or custom)
- `Swarm`: agents hand off control explicitly via tool calls that transfer the active speaker role

**Message routing in v0.4:** The `Core` layer uses a publish-subscribe model over typed messages. Agents subscribe to message topics, and the runtime delivers messages asynchronously. This decouples agents from needing to know about each other directly, enabling distributed deployment. The relevant code lives in `python/packages/autogen-core/src/autogen_core/`.

**Tool use:** Tools are Python functions decorated with type annotations. AutoGen generates JSON schemas from the function signatures and passes them to the LLM. When the LLM calls a tool, the framework executes it (in a `UserProxyAgent` or a `ToolAgent`) and feeds results back as a message.

**Human-in-the-loop:** The `UserProxyAgent` can be configured with `human_input_mode` set to `ALWAYS`, `NEVER`, or `TERMINATE`. In `ALWAYS` mode, a human must approve or override every agent action. The framework supports asynchronous handoffs, so the human doesn't block the entire agent loop.

**Code execution:** AutoGen includes Docker-based and local sandboxed code execution environments. The `DockerCommandLineCodeExecutor` runs generated code in an isolated container, capturing stdout/stderr and returning it as an agent message. This is the mechanism behind its software engineering benchmarks.

**[Model Context Protocol](../concepts/model-context-protocol.md) support:** v0.4 adds MCP server integration, allowing agents to consume tools defined in external MCP servers without AutoGen-specific wrappers.

## Key Numbers

- **GitHub stars:** ~43,000 (as of mid-2025, self-reported by repo; independently observable on GitHub)
- **SWE-bench performance:** AutoGen-based agents have been reported in the 30-40% range on SWE-bench Lite depending on configuration (self-reported in blog posts; independently validated benchmarks from the [SWE-bench](../projects/swe-bench.md) leaderboard partially confirm this range for tool-augmented agents)
- **Languages supported:** Python primarily; .NET SDK exists but lags behind Python
- **Supported LLM backends:** OpenAI, Azure OpenAI, Anthropic ([Claude](../projects/claude.md)), Gemini, and any OpenAI-compatible endpoint via [LiteLLM](../projects/litellm.md)

A large-scale coordination study (MIPT, 25,000 tasks) found that protocol choice explains ~44% of quality variation in multi-agent systems while model choice explains ~14%. AutoGen's group chat and swarm patterns correspond to different points in this protocol space. [Source](../raw/tweets/godofprompt-breaking-mipt-just-ran-the-largest-ai-agent-co.md)

## Strengths

**Flexible conversation topology.** AutoGen doesn't assume a fixed pipeline. Developers can compose round-robin group chats, LLM-driven speaker selection, hierarchical nested chats, or fully custom routing. This covers more task structures than frameworks that only support linear chains.

**Human-in-the-loop is a first-class citizen.** The `UserProxyAgent` abstraction makes it straightforward to insert human review at configurable granularity, from approving every LLM output to only intervening on termination. Most competing frameworks treat human input as an edge case.

**Code execution built in.** The sandboxed executor removes a common integration headache. Agents that generate and run code get a complete feedback loop without additional plumbing.

**Active ecosystem and Microsoft backing.** AutoGen Studio provides a no-code UI for building agent workflows. The v0.4 rewrite shows sustained investment. Community extensions cover memory, RAG integration, and domain-specific agents.

## Critical Limitations

**Failure mode: non-terminating group chats.** AutoGen's group chat relies on a termination condition, usually a string match (e.g., "TERMINATE" in the agent's reply) or a max-turn count. When an LLM agent generates subtly incorrect outputs that don't trigger the termination string but also don't make progress, the group chat loops until it hits the turn limit. There is no built-in progress detection. In production this manifests as expensive, silent failures that exhaust token budgets without completing tasks.

**Unspoken infrastructure assumption:** AutoGen assumes low-latency access to LLM APIs with generous rate limits. Its conversation loops can trigger dozens of sequential API calls for a single task. Teams running on restricted API tiers or self-hosted inference will hit rate limits or latency budgets that make multi-agent workflows impractical. The framework has no built-in request throttling or cost budget enforcement.

## When NOT to Use AutoGen

**Simple single-agent tasks.** If your use case is one agent calling a few tools and returning a result, AutoGen's overhead adds complexity without benefit. [LangChain](../projects/langchain.md) or [OpenAI Agents SDK](../projects/openai-agents-sdk.md) are lighter.

**Latency-critical production paths.** Multi-agent conversation loops are inherently sequential (each agent waits for the prior message). A task requiring five agent turns at 2-3 seconds per call takes 10-15 seconds minimum. Real-time user-facing applications won't tolerate this.

**Teams without Python expertise.** The .NET SDK lags significantly. Non-Python shops will fight the framework rather than use it.

**Workflows requiring strict state machines.** AutoGen's conversation model is flexible but not formally verifiable. If you need guaranteed execution order, rollback on failure, or audit trails, [LangGraph](../projects/langgraph.md)'s graph-based execution model with explicit state gives you more control.

**Weaker models as orchestrators.** Research shows that self-organization in multi-agent systems degrades with less capable models. The MIPT study found that models below a capability threshold (insufficient self-reflection and instruction following) performed worse with autonomous coordination than with rigid role assignment. AutoGen's LLM-driven speaker selection and role negotiation assume model capability that smaller or older models lack. [Source](../raw/tweets/godofprompt-breaking-mipt-just-ran-the-largest-ai-agent-co.md)

## Unresolved Questions

**Cost at scale:** AutoGen has no native token budget enforcement. Large group chats with many agents can generate enormous context windows as message history accumulates. The documentation doesn't explain how to cap costs without custom termination logic.

**Conflict resolution in group chat:** When the LLM-based speaker selector disagrees with the agents' own tool call outputs about who should speak next, the framework's behavior is undefined. The `GroupChatManager` implementation handles some edge cases but the resolution policy is not documented.

**Memory across sessions:** AutoGen agents maintain in-context message history only. There is no built-in persistent memory. Community integrations with [Mem0](../projects/mem0.md) and similar tools exist but are not officially maintained. For production systems needing cross-session memory, teams must build their own persistence layer.

**v0.2 to v0.4 migration:** The v0.4 rewrite broke API compatibility with v0.2. A large ecosystem of community extensions and tutorials targets v0.2. Microsoft has not committed to a deprecation timeline, leaving teams uncertain about which version to invest in.

## Alternatives

- **[LangGraph](../projects/langgraph.md):** Use when you need deterministic execution order, explicit state management, or graph-based workflow visualization. Better for production pipelines where you need to reason about control flow formally.
- **[CrewAI](../projects/crewai.md):** Use when you want a simpler, role-first abstraction with less configuration overhead. Less flexible than AutoGen but faster to get working for standard hierarchical agent patterns.
- **[MetaGPT](../projects/metagpt.md):** Use for software engineering workflows specifically, with structured role assignments (PM, architect, engineer). More opinionated than AutoGen.
- **[OpenAI Agents SDK](../projects/openai-agents-sdk.md):** Use when your stack is OpenAI-only and you want a lightweight, officially supported alternative without the multi-provider complexity.
- **[DSPy](../projects/dspy.md):** Use when your goal is optimizing prompts and agent behavior through compilation rather than manually engineering conversation patterns.

## Related Concepts

- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- [Human-in-the-Loop](../concepts/human-in-the-loop.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Agent Skills](../concepts/agent-skills.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Model Context Protocol](../concepts/model-context-protocol.md)

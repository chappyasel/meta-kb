---
entity_id: autogen
type: project
bucket: agent-systems
sources:
  - repos/caviraoss-openmemory.md
  - deep/repos/caviraoss-openmemory.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - OpenAI
last_compiled: '2026-04-05T05:34:38.101Z'
---
# AutoGen

Microsoft Research's framework for building multi-agent systems where autonomous agents coordinate through structured conversation. Agents can assume different roles, critique each other's outputs, and iterate toward solutions without human intervention at each step.

## What It Does

AutoGen lets you define agents with distinct capabilities and personas, then orchestrate them into conversational pipelines. A typical setup might include a coding agent, an execution agent that runs code in a sandbox, and a critic agent that reviews results. They message each other until a termination condition is met. The framework handles the conversation loop, message routing, and human-in-the-loop checkpoints.

The architecture has gone through a significant revision. AutoGen v0.4 (released late 2024) introduced **AgentChat** as the primary API layer, a redesigned actor-based runtime, and cleaner separation between agents, teams, and message protocols. Code in the v0.2 style (`ConversableAgent`, `GroupChat`) still works but is maintained on the `0.2` branch.

## Core Mechanism

**Message passing as the coordination primitive.** Every interaction is a typed message (defined in `autogen_core/messages.py`) passed through an `AgentRuntime`. The runtime (`autogen_core/application/single_threaded_agent_runtime.py`) maintains an agent registry and a message queue. Agents subscribe to message types; the runtime delivers messages to matching subscribers. This pub/sub model means you can add agents to a running system without rewiring existing connections.

**Conversation termination.** `ConversationTermination` objects define when a multi-turn conversation stops. Built-in conditions include `MaxMessageTermination`, `TextMentionTermination` (stops when an agent says "TERMINATE"), and `StopMessageTermination`. You can compose these with `AndTerminationCondition` and `OrTerminationCondition` in `autogen_agentchat/conditions.py`. Without a sensible termination condition, conversations loop until they hit token budget limits or timeout.

**Team patterns.** The `agentchat` layer provides four coordination topologies:
- `RoundRobinGroupChat` — agents speak in fixed rotation
- `SelectorGroupChat` — an LLM selector picks the next speaker given conversation history
- `Swarm` — agents hand off control explicitly via `HandoffMessage`
- `MagenticOneGroupChat` — orchestrator + progress checker loop, from Microsoft's MagenticOne benchmark system

Each team is in `autogen_agentchat/teams/`. The orchestrator in `MagenticOneGroupChat` maintains a ledger of completed sub-tasks and replans when progress stalls, which is the closest AutoGen gets to genuine task decomposition.

**Tool use.** Agents register tools as Python callables decorated with `@autogen_core.tools.tool`. The framework converts these to the JSON schema format expected by OpenAI and Anthropic APIs. Tool execution happens inside the agent's `on_messages` handler, not in a separate executor process, which matters for sandboxing decisions.

**Code execution.** `CodeExecutorAgent` wraps execution backends: `LocalCommandLineCodeExecutor` (runs code in a subprocess on the host), `DockerCommandLineCodeExecutor` (runs in a container), and `JupyterCodeExecutor`. The executor is pluggable, and the sandboxing guarantees depend entirely on which backend you choose. The local executor runs arbitrary code with your process's permissions.

## Key Numbers

AutoGen sits around **40k GitHub stars** (self-reported by Microsoft). The number is credible given the project's age (2023) and institutional backing. Microsoft published the original AutoGen paper on arXiv in September 2023: "AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation."

MagenticOne, AutoGen's highest-profile benchmark contribution, reported state-of-the-art results on GAIA (general AI assistants benchmark) and WebArena at release. These results are self-reported by Microsoft Research and should be treated as upper bounds under controlled conditions.

## Strengths

**Flexibility in conversation topology.** The team abstractions cover most real-world coordination patterns without requiring custom routing logic. Swarm's explicit handoff model is particularly useful for pipeline-style workflows where you want deterministic transitions.

**Ecosystem breadth.** First-party extensions cover Azure AI, Anthropic, Ollama, and several vector stores. The AutoGen Studio UI (a web interface for building agents without code) lowers the barrier for non-developer stakeholders to prototype workflows.

**Human-in-the-loop support.** `UserProxyAgent` can interrupt a conversation at configurable points, prompt a human for input, and resume. This is built into the message flow rather than bolted on, so it composes cleanly with other termination conditions.

**Production orientation in v0.4.** The actor runtime supports distributed deployment via gRPC (`autogen_ext/runtimes/grpc/`). This is meaningful for systems where agents need to run on separate machines or scale independently.

## Critical Limitations

**Concrete failure mode: non-deterministic multi-agent loops.** With `SelectorGroupChat`, the LLM selects the next speaker based on conversation history. In practice, agents can get into repetitive critique loops where the selector keeps routing between two agents exchanging minor variations of the same feedback. There is no built-in loop detection; the only safety net is your termination condition. If your termination condition is `TextMentionTermination("DONE")` and two agents disagree about whether the task is done, the conversation runs until it hits `MaxMessageTermination` or your token budget.

**Unspoken infrastructure assumption: stateless agents.** AutoGen agents are designed as stateless message processors. Long-running tasks requiring memory across conversation turns require you to wire in an external memory backend (the framework has no built-in persistence). For multi-session agents, you are responsible for serializing and restoring agent state. This is fine if you plan for it and problematic if you assume AutoGen handles it.

## When NOT to Use It

**Single-agent tasks with tool use.** If your workflow is one LLM calling tools and returning results, AutoGen adds coordination overhead with no benefit. Use the OpenAI Assistants API, LangChain agents, or direct API calls instead.

**Latency-sensitive applications.** Multi-agent conversation means multiple LLM calls per user request. Even a simple two-agent review loop doubles your p50 latency. For anything with a sub-second response requirement, AutoGen is the wrong default.

**Teams without Python infrastructure.** AutoGen's ecosystem assumes Python throughout. Tool execution, custom agents, and extensions are all Python. If your stack is primarily TypeScript or Go, the maintenance overhead of maintaining a Python service boundary is likely not worth it.

**Production deployments without human oversight.** The code execution backends, particularly `LocalCommandLineCodeExecutor`, run arbitrary code on the host machine. Deploying a system where an external user's input reaches a code-executing agent without careful sandboxing is a serious security risk. Docker sandboxing mitigates this but requires explicit configuration.

## Unresolved Questions

**Model cost at scale.** AutoGen documentation shows per-workflow examples but no analysis of token consumption at production volume. A `SelectorGroupChat` with five agents and a complex selector prompt can consume significant tokens per routing decision. There are no built-in token budget guardrails short of counting messages.

**Conflict resolution in group chat.** When two agents produce contradictory outputs in `RoundRobinGroupChat`, the framework has no mechanism to detect or adjudicate the conflict. Downstream agents receive both contradictory messages in their context. How the final agent resolves this depends entirely on the LLM's in-context reasoning.

**Long-term governance.** AutoGen is a Microsoft Research project. The v0.4 rewrite was a significant breaking change that required existing users to migrate. The project does not publish a roadmap with stability commitments, so major architectural changes may recur. The 0.2 compatibility branch exists but is explicitly in maintenance mode.

**Cost of MagenticOne's orchestrator.** The orchestrator in `MagenticOneGroupChat` runs an LLM call per planning cycle plus a progress-checking call. For complex tasks requiring many planning cycles, this overhead compounds. There are no published numbers on how many LLM calls a typical MagenticOne run requires compared to simpler team topologies.

## Alternatives

| When | Use Instead |
|------|-------------|
| You want a lighter multi-agent abstraction with more explicit state management | [LangGraph](../projects/langgraph.md) — graph-based state machines give you full control over agent transitions |
| Your team is TypeScript-native | OpenAI Swarm (experimental) or custom tool-use loops |
| You need role-based crews for document/research tasks | [CrewAI](../projects/crewai.md) — opinionated defaults for crew-style collaboration |
| You need persistent agent memory across sessions | Combine AutoGen with an external memory layer like [Mem0](../projects/mem0.md) or OpenMemory |
| You want minimal abstraction over the LLM API | Direct API calls with tool definitions — no framework needed |

## Related Concepts

- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- Tool Use
- [Context Engineering](../concepts/context-engineering.md)

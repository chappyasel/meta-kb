---
entity_id: autogen
type: project
bucket: multi-agent-systems
abstract: >-
  AutoGen is Microsoft's multi-agent conversation framework where autonomous
  agents collaborate via structured message passing; its key differentiator is a
  flexible two-agent and group-chat model that supports human-in-the-loop at any
  point.
sources:
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - repos/caviraoss-openmemory.md
  - tweets/godofprompt-breaking-mipt-just-ran-the-largest-ai-agent-co.md
related:
  - retrieval-augmented-generation
  - claude
last_compiled: '2026-04-08T23:12:06.128Z'
---
# AutoGen

## What It Does

AutoGen is Microsoft's open-source framework for building systems where multiple LLM-backed agents converse with each other to solve tasks. Rather than a single agent calling tools in a loop, AutoGen orchestrates dialogue between agents, each of which can generate responses, execute code, call functions, or route to a human. The core bet is that agent conversation, critique, and iteration produces better results than single-agent prompting.

The framework has gone through significant architectural revision. AutoGen 0.2 (the widely-cited version) was a monolithic library centered on `ConversableAgent`. AutoGen 0.4 introduced a complete rewrite around an asynchronous, actor-based model with `autogen-agentchat`, `autogen-core`, and `autogen-ext` as separate packages. The two versions are not compatible and have different APIs, which causes significant friction for users migrating or following tutorials.

GitHub stars: ~43,000 (as of mid-2025, self-reported in repository metrics). This figure reflects cumulative interest, not active deployments.

## Core Mechanism

**Agent Abstraction**

The base unit is `ConversableAgent` (0.2) or `BaseChatAgent` (0.4). Each agent holds a system prompt, an LLM configuration, and a set of registered functions or tools. Agents communicate by passing `Message` objects containing role/content pairs that mirror the OpenAI chat format.

**Two-Agent Conversation**

The simplest pattern: `UserProxyAgent` initiates, `AssistantAgent` responds. The `UserProxyAgent` can execute code automatically (in a Docker sandbox or local process) and feed stdout back into the conversation. This loop continues until a termination condition fires, typically a string sentinel like `"TERMINATE"` appearing in a message. The termination mechanism is a known fragility point: it relies on LLMs reliably emitting a specific string, which they frequently fail to do under paraphrasing pressure.

**GroupChat**

`GroupChatManager` brokers conversations among three or more agents. The manager selects the next speaker via one of several strategies: `auto` (an LLM selects based on conversation history), `round_robin`, `random`, or a custom callable. The `auto` strategy calls an LLM on every turn to decide speaker selection, adding latency and cost that scales with group size and conversation length.

**Human-in-the-Loop Integration**

`UserProxyAgent` has a `human_input_mode` parameter: `ALWAYS` (block on every message), `NEVER` (fully autonomous), or `TERMINATE` (only ask when the conversation would end). This is one of AutoGen's genuine strengths, allowing human oversight to be dialed in at a workflow level rather than baked into individual agents. See [Human-in-the-Loop](../concepts/human-in-the-loop.md).

**Code Execution**

The `execute_code_blocks` function in `autogen/code_utils.py` handles extraction and execution. It parses code blocks from markdown responses, runs them in the configured executor (local shell, Docker container, or Jupyter kernel), and returns stdout/stderr. The Docker executor is the safer path for production, but requires a running Docker daemon, which most cloud deployment environments complicate.

**0.4 Actor Model**

The 0.4 rewrite introduces `autogen-core` with an event-driven runtime. Agents become actors that communicate via typed messages over a message bus. `SingleThreadedAgentRuntime` runs locally; a distributed runtime is under development. The motivation is supporting truly concurrent, distributed agent systems rather than the sequential turn-taking of 0.2. However, 0.4 adds substantial boilerplate (explicit message type registration, async throughout) and the ecosystem of examples and integrations is thinner than 0.2's.

## Key Numbers

| Metric | Value | Note |
|--------|-------|-------|
| GitHub Stars | ~43,000 | Self-reported; accumulated since 2023 |
| HumanEval (with GPT-4, code execution loop) | ~90%+ | Self-reported in early papers; independently reproduced on HumanEval specifically |
| MATH benchmark improvement vs. single agent | +15–20% | From original AutoGen paper; GPT-4 base |
| Overhead per GroupChat turn (speaker selection) | +1 LLM call | Structural, not optimized away |

The MIPT coordination study (25,000 tasks, 8 models) found that protocol choice accounts for 44% of quality variation versus 14% for model choice, and that sequential coordination without pre-assigned roles outperformed role-based systems like AutoGen's GroupChat by ~14% ([Source](../raw/tweets/godofprompt-breaking-mipt-just-ran-the-largest-ai-agent-co.md)). This finding is directionally credible though not yet replicated independently.

## Strengths

**Flexible human oversight placement.** The `human_input_mode` API makes it easy to prototype fully autonomous pipelines and then add human checkpoints without restructuring agent code. Most frameworks force an either/or choice.

**Code execution loop is mature.** The 0.2 `UserProxyAgent` + `AssistantAgent` pattern for code generation, execution, and feedback is well-tested with extensive community examples. For tasks that decompose into write-code, run-code, fix-code cycles, this loop works reliably.

**Broad LLM compatibility.** AutoGen wraps the OpenAI client interface and supports local models via LiteLLM or direct Ollama endpoints. Swapping models requires changing a config dict, not restructuring agent logic. See [LiteLLM](../projects/litellm.md) and [Ollama](../projects/ollama.md).

**Integration ecosystem.** Third-party integrations exist for memory (OpenMemory supports AutoGen directly, as noted in its AutoGen integration pattern), vector stores, and tools. The 0.2 API's stability made this ecosystem buildable.

## Critical Limitations

**Concrete failure mode: runaway conversations with no termination.** When the `"TERMINATE"` sentinel approach fails, conversations loop until token limits or API cost caps interrupt them. There is no built-in maximum turn count enforced at the framework level by default, and no automatic detection of circular reasoning. Production deployments consistently report needing to wrap GroupChat in external watchdog logic. See [Loop Detection](../concepts/loop-detection.md).

**Unspoken infrastructure assumption: synchronous, single-process execution.** The 0.2 GroupChat is fundamentally sequential. Each agent takes a turn; the next agent waits. For tasks that could parallelize naturally (running tests while another agent analyzes requirements), the architecture provides no native parallelism. The 0.4 rewrite addresses this, but with a different API surface that breaks 0.2 compatibility. Mixing versions in a production system is unsupported.

**Coordination overhead at scale.** The GroupChat `auto` speaker selection adds one LLM call per turn. At 8 agents with complex tasks running 20+ turns, this means 20+ extra LLM calls purely for orchestration, none of which produce task-relevant output.

## When NOT to Use It

**Latency-sensitive pipelines.** GroupChat's per-turn LLM overhead makes it inappropriate for real-time applications. A 6-agent group solving a task over 30 turns may generate 30+ speaker-selection LLM calls before producing output.

**Workflows that need deterministic routing.** If you know at design time which agent should handle which message type, AutoGen's LLM-based speaker selection adds cost and nondeterminism for no benefit. [LangGraph](../projects/langgraph.md) or a simple state machine is more appropriate.

**Teams preferring a role-based, process-oriented framework.** If your domain maps cleanly to organizational roles (product manager, engineer, QA), [MetaGPT](../projects/metagpt.md) encodes that structure explicitly and provides document-passing conventions. [CrewAI](../projects/crewai.md) similarly provides role-first abstractions. AutoGen's more general conversation model means you must build that structure yourself.

**Production deployments requiring version stability.** The 0.2-to-0.4 migration broke API compatibility entirely. If you built on 0.2 following documentation from 2023 or early 2024, upgrading requires rewriting agent definitions. The 0.4 ecosystem is less mature, with fewer tested examples.

## Unresolved Questions

**Conflict resolution in GroupChat.** When multiple agents produce contradictory outputs, there is no built-in mechanism to detect or adjudicate the contradiction. The LLM speaker selector picks who speaks next, but does not arbitrate correctness. The framework documentation does not address this.

**Cost at scale.** GroupChat with LLM-based speaker selection has unbounded cost for long-running tasks. Microsoft's documentation does not provide guidance on estimating or capping API spend for production deployments. Users report discovering cost problems after deployment.

**Governance of the 0.4 migration.** The decision to break API compatibility between 0.2 and 0.4 is not explained in terms of migration support, timeline for deprecating 0.2, or which features will backport. Significant community usage remains on 0.2 with no clear sunset path published.

**Memory architecture.** AutoGen has no native cross-session memory. Agent state resets on each run. Integrating persistent memory (via [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), or [OpenMemory](../projects/openmemory.md)) requires custom wiring. The framework provides no opinionated pattern for this. See [Agent Memory](../concepts/agent-memory.md).

## Alternatives

**Use [LangGraph](../projects/langgraph.md) when** you need deterministic, stateful workflows with explicit graph-defined routing. LangGraph gives you control over every state transition; AutoGen gives you flexibility at the cost of predictability.

**Use [CrewAI](../projects/crewai.md) when** your problem maps to human-style team roles and you want a framework that encodes role-based task delegation as a first-class concept, with simpler setup than AutoGen's GroupChat.

**Use [MetaGPT](../projects/metagpt.md) when** your workflow is software development specifically, and you want structured document passing (PRDs, design docs, code reviews) between role-specialized agents.

**Use [OpenAI Agents SDK](../projects/openai-agents-sdk.md) when** you're OpenAI-native and want a leaner abstraction without GroupChat overhead. Handoffs between agents are explicit rather than LLM-selected.

**Use raw [ReAct](../concepts/react.md) loops when** your task is single-agent and tool-calling. AutoGen's conversation overhead is unnecessary if one agent can solve the task.

## Related Concepts

- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- [Multi-Agent Collaboration](../concepts/multi-agent-collaboration.md)
- [Human-in-the-Loop](../concepts/human-in-the-loop.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Loop Detection](../concepts/loop-detection.md)

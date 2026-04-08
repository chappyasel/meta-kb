---
entity_id: react
type: approach
bucket: agent-architecture
abstract: >-
  ReAct is a prompting paradigm that interleaves chain-of-thought reasoning
  traces with executable tool-use actions in a single LLM context, enabling
  agents to plan, act, and course-correct in one loop without a separate
  orchestration layer.
sources:
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/foundationagents-metagpt.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - reflexion
  - retrieval-augmented-generation
  - model-context-protocol
  - gpt-4
  - claude-code
  - episodic-memory
  - context-engineering
  - agent-memory
  - agent-skills
  - graphrag
  - context-management
  - vector-database
  - metagpt
  - langgraph
  - lost-in-the-middle
  - chromadb
  - raptor
  - chain-of-thought
  - openai-agents-sdk
  - autogpt
  - memento
  - meta-agent
last_compiled: '2026-04-08T02:40:13.146Z'
---
# ReAct: Reasoning + Acting

## What It Is

ReAct (Reasoning + Acting) is a prompting and agent architecture paradigm introduced by Yao et al. (2022) that combines [Chain-of-Thought](../concepts/chain-of-thought.md) reasoning with tool-use actions in an interleaved loop. The agent alternates between generating a `Thought` (natural language reasoning), selecting an `Action` (tool call or API invocation), and observing an `Observation` (the tool's return value), repeating until it reaches an answer or terminal condition.

The core structure looks like:

```
Thought: I need to find the current population of Lagos.
Action: search["Lagos population 2024"]
Observation: Lagos has an estimated population of 15.9 million (2024).
Thought: Now I can answer the question.
Action: finish["15.9 million"]
```

This differs from pure chain-of-thought (which reasons but does not act) and from pure tool-use agents (which act but do not expose reasoning). The interleaving is the mechanism: each thought can reference prior observations, and each action is motivated by an explicit reasoning step.

The paradigm's key differentiator is that reasoning and acting share the same context window and the same forward pass. No separate orchestration model directs tool calls. The LLM itself decides when to think, when to call a tool, and when to stop, based on the accumulated trace.

## Why It Matters

Before ReAct, agent architectures typically separated reasoning (a planning model) from acting (an executor), or relied on pure chain-of-thought that hallucinated facts rather than retrieving them. ReAct showed that a single prompted LLM could do both in one unified trace, grounding reasoning in real retrieved information and enabling dynamic error recovery.

The practical consequence: agents built with ReAct can update their reasoning mid-task based on tool outputs, catch their own mistakes, and abandon dead ends. A chain-of-thought agent that reasons about a web search it never performed will hallucinate confidently. A ReAct agent sees the actual search result and adjusts.

ReAct also made agent behavior interpretable. Because the `Thought` steps are written in natural language and stored in context, a developer reading the trace can see exactly why the agent took each action. This is non-trivial for debugging multi-step agents.

## How It Works

### The Observe-Think-Act Loop

The loop runs within a single growing context:

1. **Thought**: The LLM generates a reasoning step. This is a natural language sentence or paragraph explaining what the agent knows, what it needs, and what action it plans to take next.
2. **Action**: The LLM generates a structured action (tool name + arguments). The host system parses this, executes the tool call, and appends the result.
3. **Observation**: The tool's return value is appended to the context, verbatim or post-processed.
4. **Repeat** until the agent generates a terminal action (e.g., `finish[answer]`) or a step budget is exhausted.

The prompt includes few-shot examples of completed Thought/Action/Observation traces, teaching the model the format and the reasoning style expected.

### What Goes in the Prompt

A minimal ReAct prompt contains:
- Task description and tool definitions (names, arguments, expected output format)
- Few-shot examples of complete traces demonstrating how the agent should reason and when to use each tool
- The current task

The context grows with each turn. A 10-step ReAct trace on a complex research question can consume 4,000–10,000 tokens before the agent finishes. This context growth is the core engineering constraint.

### Tool Integration

Tools are functions the host system can call: web search, code execution, a database query, a calculator, a file reader. The LLM generates structured action strings that the host parses. Common formats:

- `tool_name[argument]` (original ReAct paper style)
- JSON: `{"tool": "search", "query": "Lagos population"}`
- Structured XML or YAML (used by some frameworks)

The format is arbitrary. The model learns it from few-shot examples. JSON is more robust to parsing but more verbose; bracket notation is compact but fragile with complex arguments.

### Error Recovery

When a tool returns an error or an unexpected result, the agent observes this in the next step and can reason about it:

```
Observation: Error: page not found.
Thought: The URL failed. I should try searching for the document title instead.
Action: search["Annual Report 2023 Acme Corp"]
```

This self-correction capability is absent from single-shot tool calls and is why ReAct outperformed baseline tool-use approaches on multi-hop reasoning tasks.

## Implementation in Frameworks

ReAct is not a library — it is a pattern. Multiple frameworks implement it:

**[LangChain](../projects/langchain.md)**: The `AgentExecutor` with `ReActAgent` is the canonical LangChain implementation. Tools are defined as Python functions with docstrings. The executor runs the observe-think-act loop and handles parsing, tool dispatch, and error propagation. LangChain popularized ReAct for practitioners.

**[LangGraph](../projects/langgraph.md)**: A graph-based successor that represents the ReAct loop as nodes and edges, enabling branching, parallelism, and human interruption points that the linear `AgentExecutor` cannot support. Better for production agents; more configuration required.

**[OpenAI Agents SDK](../projects/openai-agents-sdk.md)**: Uses model-native function calling rather than text-parsed actions. The Thought step is internal model reasoning (exposed via chain-of-thought tokens in o-series models). Tool calls come from the model's structured output rather than text parsing, making the action format robust.

**[MetaGPT](../projects/metagpt.md)**: Each Role's `_observe → _think → _act` loop is a ReAct instantiation at the agent level. The `REACT` mode in `RoleReactMode` uses an LLM to dynamically select the next action from available options, with `max_react_loop` iterations. [Source](../raw/deep/repos/foundationagents-metagpt.md)

**[Claude Code](../projects/claude-code.md)** and **[GPT-4](../projects/gpt-4.md)**: Modern frontier models implement ReAct-style reasoning natively. The model's extended thinking (for Claude) or chain-of-thought (for o-series) functions as the Thought step; tool calls function as the Action step. The framework is now baked into the model's training, not just the prompt.

## Connection to Related Concepts

ReAct extends [Chain-of-Thought](../concepts/chain-of-thought.md): CoT generates reasoning but takes no actions; ReAct adds the act-observe cycle that grounds reasoning in external information.

ReAct implements [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) dynamically: rather than retrieving once before generation, a ReAct agent retrieves multiple times, with each retrieval informed by prior reasoning steps.

ReAct is the execution model for [Agent Memory](../concepts/agent-memory.md) systems. [Episodic Memory](../concepts/episodic-memory.md) can be populated by ReAct traces; [Semantic Memory](../concepts/semantic-memory.md) is the knowledge base a ReAct agent queries.

[Reflexion](../concepts/reflexion.md) adds an outer loop around ReAct: after a full ReAct episode, a separate reflection model evaluates what went wrong and generates a verbal critique stored in the next episode's context. Reflexion addresses ReAct's lack of cross-episode learning.

[Context Engineering](../concepts/context-engineering.md) is the practice of optimizing what goes into the context that ReAct agents operate over: how to format tools, how to write few-shot examples, how to manage growing traces. The formal framing C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query) from the context engineering survey applies directly: a ReAct prompt assembles all six component types in every turn. [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

[Context Management](../concepts/context-management.md) is where ReAct fails at scale: a 50-step agent trace can exhaust the context window. Techniques like trace summarization, selective observation retention, and [Context Compression](../concepts/context-compression.md) address this.

[Lost in the Middle](../concepts/lost-in-the-middle.md) degrades ReAct performance when observations are long: if a retrieved document is many pages, the model may fail to use information that appears in the middle of its context.

[Multi-Agent Systems](../concepts/multi-agent-systems.md) like MetaGPT and AutoGen compose multiple ReAct agents: each agent runs its own loop, and the outputs of one agent's actions become observations for another.

## Benchmarks and Evidence

The original ReAct paper (Yao et al., 2022) reported on HotpotQA, Fever, ALFWorld, and WebShop. On [HotpotQA](../projects/hotpotqa.md), ReAct outperformed chain-of-thought by reducing hallucination rates on multi-hop questions where intermediate facts needed to be retrieved. On ALFWorld, ReAct + few-shot examples achieved 34% on a task where pure chain-of-thought achieved 0%. These benchmarks used PaLM (540B) and GPT-3.

These numbers are from the original paper (self-reported, not independently replicated on the same infrastructure). Performance on contemporary models is substantially higher because frontier models like GPT-4 and Claude 3+ are far better at following the Thought/Action/Observation format and at reasoning over tool outputs.

Subsequent work has validated the core mechanism: interleaving reasoning with tool use outperforms either alone for multi-step information retrieval tasks. The magnitude varies by task and model, but the direction is consistent across papers. The absolute benchmark numbers from 2022 should not be used as performance expectations with current models.

## Strengths

**Interpretable traces.** The Thought steps are human-readable. Developers can inspect why an agent took each action, which makes debugging and trust-building with end users tractable.

**Dynamic error recovery.** The agent observes tool failures directly and can reason about alternatives. This is the mechanism that makes multi-hop research agents work in practice.

**No orchestration overhead.** A single model handles planning, tool selection, and response generation. No separate planner or critic model needed for basic deployments.

**Composability.** ReAct agents can call other ReAct agents as tools, enabling hierarchical agent architectures without a fundamentally different architecture.

**Model-agnostic.** Works with any model capable of following the format, from small instruction-tuned models to frontier models.

## Critical Limitations

**Context window growth is unbounded.** Each observe-think-act step appends to the context. A 50-step agent on a complex task may consume the model's full context window before finishing. Once the context is full, the agent either truncates early observations (losing relevant information) or fails. This is not a fixable edge case — it is structural. Any task requiring more steps than the context budget allows will degrade or fail.

Concrete failure mode: a ReAct agent debugging a complex software issue retrieves a large stack trace in step 3. By step 35, the full stack trace has scrolled out of the effective attention window due to [Lost in the Middle](../concepts/lost-in-the-middle.md) effects. The agent starts repeating actions it already tried.

**Depends on reliable tool output parsing.** The host system must parse the model's action strings correctly. Text-based action formats (bracket notation, natural language) are fragile: the model may generate `search[Lagos, Nigeria]` instead of `search["Lagos, Nigeria"]`. Modern implementations use structured function calling to eliminate this problem, but text-parsed ReAct remains in many deployed systems.

Unspoken infrastructure assumption: **Tool latency compounds.** A 20-step ReAct agent calling a web search tool with 500ms latency runs for at least 10 seconds on tool calls alone, before counting LLM inference time. Production systems need to budget for this. Multi-agent ReAct architectures where agents call other agents compound latency further.

## When Not to Use ReAct

**Single-step tasks with known retrieval patterns.** If the task is always "retrieve one document, answer from it," vanilla RAG without a ReAct loop is faster, cheaper, and equally accurate. ReAct's overhead (generating Thought steps, parsing actions, managing growing context) is pure cost on tasks where multi-step reasoning is not required.

**Tasks requiring more steps than the context budget.** Tasks that need 50+ tool calls will saturate the context window with most current models. Use a framework with explicit state management and context compression ([Letta](../projects/letta.md), [LangGraph](../projects/langgraph.md) with checkpointing) instead of a naive growing-trace ReAct agent.

**High-throughput production workloads where reasoning traces are not needed.** If you need 1,000 agent calls per minute and do not need the Thought steps for debugging or compliance, the token overhead of generating reasoning is waste. Fine-tuned models or structured multi-tool calls without reasoning traces are more efficient.

**Tasks requiring cross-episode learning.** ReAct has no memory across separate invocations. Each run starts from a blank context (plus whatever is in the system prompt). Use [Reflexion](../concepts/reflexion.md), [Mem0](../projects/mem0.md), or explicit memory systems if the agent needs to improve from past failures. Voyager's skill library pattern — storing successful action sequences for retrieval in future episodes — directly addresses this gap. [Source](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

## Unresolved Questions

**Step budget selection.** There is no principled way to set the maximum number of ReAct steps. Too few and the agent gives up prematurely; too many and costs escalate. Most implementations use arbitrary limits (10, 20, 50 steps). The right limit is task-dependent and model-dependent, but frameworks rarely expose this as a dynamic parameter.

**Observation length management.** When a tool returns a long document, should the agent receive the full text, a summary, or a structured extraction? The original paper provides no guidance. Different implementations make different choices, and the tradeoff (fidelity vs. context cost) is not well-characterized for different task types.

**Thought quality as a signal.** Are more detailed Thought steps better? Should agents be prompted to reason more or less verbosely? The relationship between reasoning trace quality and final answer quality is not well-studied, though longer chains-of-thought generally help for math and logic tasks.

**Multi-agent coordination overhead.** When ReAct agents call other ReAct agents as tools, the observation for the outer agent is the inner agent's final output — the full inner trace is discarded. Information in the inner agent's reasoning that might be relevant to the outer agent is lost. No standard approach addresses this.

## Alternatives

**[Chain-of-Thought](../concepts/chain-of-thought.md)** without tool use: Use when the model's parametric knowledge is sufficient and tool latency is unacceptable. CoT has no tool-call overhead.

**[Reflexion](../concepts/reflexion.md)**: Use when the task benefits from learning across episodes. Reflexion wraps ReAct with a reflection layer that generates verbal critiques stored in future context.

**Plan-then-execute**: Use when the task structure is known upfront and parallel tool calls can reduce latency. Generate a full plan, execute all tool calls (potentially in parallel), then generate the final answer. More efficient than sequential ReAct for well-structured tasks; less adaptive to unexpected tool outputs.

**[LangGraph](../projects/langgraph.md) with explicit state**: Use when you need branching logic, human interruption points, or guaranteed termination conditions. The graph structure makes control flow explicit rather than implicit in the LLM's output.

**Function calling with no reasoning trace**: Use for high-throughput production where interpretability is not required and task structure is simple enough that the model does not need to reason about which tool to call next.

**[Voyager](../projects/voyager.md)-style skill libraries**: Use when you need accumulation of learned capabilities across many episodes. Store successful ReAct traces as reusable skills indexed by embedding similarity, retrieving relevant skills into the context for new related tasks. [Source](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

## Practical Summary

ReAct is the default starting point for any agent that needs to use tools across multiple steps. Its interpretability, model-agnosticism, and error recovery capability make it a sensible default. The context window growth problem is the constraint that forces practitioners to reach for more sophisticated alternatives. Start with ReAct, measure actual step counts and context usage in production, then upgrade to frameworks with explicit state management when the simple loop hits its limits.


## Related

- [Reflexion](../concepts/reflexion.md) — alternative_to (0.7)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — implements (0.5)
- [Model Context Protocol](../concepts/model-context-protocol.md) — part_of (0.5)
- [GPT-4](../projects/gpt-4.md) — implements (0.6)
- [Claude Code](../projects/claude-code.md) — implements (0.6)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.5)
- [Context Engineering](../concepts/context-engineering.md) — implements (0.6)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.6)
- [Agent Skills](../concepts/agent-skills.md) — implements (0.6)
- [GraphRAG](../projects/graphrag.md) — part_of (0.5)
- [Context Management](../concepts/context-management.md) — implements (0.6)
- [Vector Database](../concepts/vector-database.md) — part_of (0.5)
- [MetaGPT](../projects/metagpt.md) — part_of (0.5)
- [LangGraph](../projects/langgraph.md) — implements (0.6)
- [Lost in the Middle](../concepts/lost-in-the-middle.md) — part_of (0.5)
- [ChromaDB](../projects/chromadb.md) — part_of (0.4)
- [RAPTOR](../projects/raptor.md) — part_of (0.4)
- [Chain-of-Thought](../concepts/chain-of-thought.md) — extends (0.7)
- [OpenAI Agents SDK](../projects/openai-agents-sdk.md) — implements (0.6)
- AutoGPT — implements (0.6)
- [Memento](../projects/memento.md) — implements (0.6)
- [Meta-Agent](../concepts/meta-agent.md) — part_of (0.5)

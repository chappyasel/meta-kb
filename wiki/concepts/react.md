---
entity_id: react
type: approach
bucket: agent-systems
abstract: >-
  ReAct is a prompting framework that interleaves chain-of-thought reasoning
  traces with executable actions, letting LLM agents think before acting and
  update their reasoning after observing results.
sources:
  - articles/lil-log-llm-powered-autonomous-agents.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - reflexion
  - gpt-4
  - chain-of-thought
  - anthropic
  - mcp
  - graphrag
  - continual-learning
  - agentic-rag
  - agent-memory
  - raptor
  - autogpt
  - task-decomposition
last_compiled: '2026-04-07T11:39:49.437Z'
---
# ReAct

## What It Is

ReAct (Reasoning + Acting) is a prompting framework, introduced by Yao et al. (2022), that structures LLM agent behavior as alternating traces of thought and action. Before each action, the agent writes a reasoning step in natural language. After each action, it receives an observation from the environment. That observation feeds back into the next reasoning step. The loop continues until the agent judges the task complete.

The three-element cycle:

```
Thought: I need to find the population of Tokyo.
Action: Search[Tokyo population 2024]
Observation: Tokyo's population is approximately 13.96 million (city) or 37.4 million (metro).
Thought: The user likely wants the metro population. I can now answer.
```

This stands in contrast to two simpler baselines the original paper uses as comparisons: pure chain-of-thought (reasoning without environment access) and pure action sequences (tool use without explicit reasoning). ReAct combines both. By externalizing its reasoning, the agent can catch its own errors mid-trajectory and adjust.

## Why It Matters

Before ReAct, LLM agents either reasoned over a fixed context ([Chain-of-Thought](../concepts/chain-of-thought.md)) or executed tool calls in a loop with no visible reasoning. Neither approach handled multi-step tasks requiring evidence accumulation well. ReAct's interleaving achieves two things simultaneously: the agent gathers external information (via actions) and maintains a coherent reasoning thread (via thoughts) that governs how it interprets that information.

The visible thought trace also makes agents debuggable. When a ReAct agent fails, you can read its thoughts and see where the reasoning went wrong. With pure action sequences, failure inspection is guesswork.

## How It Works

### The Prompt Structure

ReAct is implemented entirely in the prompt. No special training is required. A few-shot prompt provides examples of the Thought/Action/Observation format. The model continues that format during inference.

At each step:
1. The model generates a `Thought:` explaining its current reasoning
2. The model generates an `Action:` specifying a tool call and its arguments
3. The runtime executes the action and appends an `Observation:` to the context
4. The model sees the updated context and generates the next `Thought:`

The action space is defined by whatever tools you connect to the runtime. Original ReAct experiments used Wikipedia search and item lookup. Production implementations use web search, code execution, database queries, file I/O, API calls, or any other callable.

### Thought as Planning and Error Correction

The Thought step is not decorative. It serves three functional roles:

**Task decomposition**: "I need to find the founder's birth year, then calculate their age at company founding."

**Evidence integration**: "The search returned three conflicting dates. The most recent source says 1984, which aligns with the other corroborating claims."

**Error recognition**: "My previous search returned irrelevant results because I used too generic a query. I should search for the specific document title."

This error recognition is what distinguishes ReAct from [Chain-of-Thought](../concepts/chain-of-thought.md). CoT reasons over fixed context. ReAct reasons over a growing context that includes real-world observations, letting the agent detect and correct mistakes before committing to a final answer.

### Stopping Conditions

The loop terminates when the agent generates a `Finish[answer]` action, or when a maximum step count is reached. Step limits are critical in practice: without them, hallucinating agents can generate fabricated observations, loop on errors, or otherwise fail to terminate.

## Relationship to Other Frameworks

**Chain-of-Thought** ([Chain-of-Thought](../concepts/chain-of-thought.md)): ReAct extends CoT by adding environment interaction. Pure CoT cannot gather new information mid-reasoning; ReAct can. The Thought steps in ReAct are CoT reasoning applied to an expanding, partially observed context.

**Reflexion** ([Reflexion](../concepts/reflexion.md)): Reflexion wraps ReAct with an outer self-reflection loop. A ReAct agent completes a task (or fails), then a reflection model analyzes the trajectory and writes verbal feedback into episodic memory. On the next attempt, the actor reads those reflections before beginning its ReAct loop. Reflexion achieves 91% pass@1 on HumanEval by iterating this way; ReAct alone provides the inner action loop.

**Agentic RAG** ([Agentic RAG](../concepts/agentic-rag.md)): Most agentic RAG systems use ReAct as their underlying agent loop. The retrieval step is just one action in the action space. The agent reasons about what to retrieve, retrieves it, reads the observation, and reasons about whether to retrieve again or synthesize an answer.

**Task Decomposition** ([Task Decomposition](../concepts/task-decomposition.md)): ReAct handles implicit single-session decomposition through its Thought steps. For complex tasks, explicit decomposition frameworks (like the PlanStep DAG in systems such as Memento-Skills) pre-structure the task before the ReAct loop begins. Combining both gives the agent a plan to follow and the ability to adapt that plan as it gathers information.

**AutoGPT**: AutoGPT uses a similar loop but adds explicit goal-setting and long-term memory management. ReAct is the underlying action loop; AutoGPT builds more infrastructure around persistence and self-directed tasking.

**[Model Context Protocol](../concepts/mcp.md)**: MCP standardizes how tools expose themselves to agents. A ReAct agent calling MCP-compatible tools sends its `Action:` calls through the MCP protocol layer, which routes them to the appropriate server. MCP handles the plumbing; ReAct handles the reasoning structure.

## What Makes a Good ReAct Implementation

### Tool Design

The action space definition matters more than the prompting. Good ReAct implementations:
- Give each tool a clear, narrow contract
- Return observations in consistent, parseable formats
- Include error messages that help the agent diagnose what went wrong

An observation like `Error: rate limit exceeded, retry after 30s` lets the agent reason about waiting or switching tools. An observation like `ERROR 429` does not.

### Step Budget Management

Production systems need hard step limits. Without them:
- Hallucinating models can fabricate observations and loop indefinitely
- Ambiguous tasks with no clear stopping condition run until token limits are hit
- Adversarial inputs can cause the agent to take thousands of actions

Memento-Skills sets max ReAct turns per skill at 30, with hard overrides forcing termination after budgets are exhausted. This prevents infinite loops while allowing complex tasks to run long enough to complete.

### Loop Detection

Agents running long ReAct loops frequently get stuck in patterns: querying the same resource repeatedly, alternating between two failed approaches, or issuing semantically identical actions with slightly different phrasing. Loop detection checks for:
- Repeated identical action signatures
- Alternating A-B-A-B action patterns
- Low ratio of state-changing actions to observation-gathering actions
- Diminishing returns in information gained per observation

Memento-Skills implements four distinct loop detection patterns in its `LoopDetector` class, watching for observation chain length, effect ratio, diminishing entity discovery, and exact sequence repetition.

### Prompt Engineering

The few-shot examples in the prompt establish what quality thoughts look like. Examples with shallow thoughts ("I should search for this") produce agents with shallow reasoning. Examples with rich thoughts ("My previous query was too broad; I need to constrain by date range to filter noise") produce agents that genuinely use reasoning to improve their actions.

## Benchmarks and Adoption

The original ReAct paper tested on:
- **HotPotQA** ([HotPotQA](../projects/hotpotqa.md)): Multi-hop question answering requiring multiple Wikipedia lookups. ReAct outperformed pure CoT by 5-7% absolute accuracy.
- **FEVER**: Fact verification. ReAct showed significant hallucination reduction compared to CoT-only.
- **ALFWorld** (decision-making): ReAct achieved 71% success vs CoT's 45%.
- **WebShop**: ReAct achieved 45.6% success, though this benchmark exposes a known limitation (more on this below).

These results are from the original 2022 paper using GPT-3-class models. Results are self-reported by the original authors. With 2024-2026 models, ReAct baselines substantially outperform original paper numbers.

ReAct has since become the default inner loop for most agent frameworks. [LangChain](../projects/langchain.md) ships a `create_react_agent` function. [LangGraph](../projects/langgraph.md) models ReAct as a graph with Thought and Action nodes. Virtually every agent benchmark ([SWE-bench](../projects/swe-bench.md), [GAIA](../projects/gaia.md), [WebArena](../projects/webarena.md), [TAU-bench](../projects/tau-bench.md)) uses ReAct-style agents as baselines.

## Strengths

**Transparent reasoning**: The thought trace is a debugging artifact. When an agent fails, you read its thoughts to understand why. This is operationally important when deploying agents in production.

**Works with any capable LLM**: ReAct requires no fine-tuning. Swapping the underlying model is a one-line change. Systems using ReAct can migrate to better models as they become available.

**Naturally handles multi-hop tasks**: The thought-observe loop is purpose-built for tasks requiring sequential evidence gathering. Each observation informs the next action, letting agents build up evidence that no single search could provide.

**Error recovery through reasoning**: Agents can recognize when a tool call failed, returned irrelevant results, or provided conflicting information, and adjust their strategy. Pure action-sequence agents have no mechanism for this.

## Critical Limitations

### Concrete Failure Mode: Hallucinated Observations

When a ReAct agent cannot find the information it expects, it may fabricate an observation rather than acknowledging uncertainty. The model generates what a plausible observation would look like, then reasons from that fabrication. The agent's confidence in its (wrong) conclusion increases with each fabricated step, because its thoughts are internally consistent even though they are built on invented evidence.

This failure mode is most common on:
- Tasks where the ground truth is obscure or counterintuitive
- Long trajectories where early mistakes compound
- Models with strong priors about expected answers

No amount of prompt engineering fully eliminates this. Step limits and self-verification (checking final answers against source observations) reduce but do not eliminate it.

### Unspoken Infrastructure Assumption: Reliable Tool Execution

ReAct assumes tools return useful observations on each call. In practice:
- APIs return rate limit errors, timeouts, or malformed responses
- Search engines return irrelevant results that look plausible
- Code execution produces runtime errors that do not clearly diagnose the bug

The basic ReAct loop has no built-in error recovery protocol. An agent that receives `ConnectionTimeout` as an observation must reason about retrying, which requires the thought step to contain retry logic. This works, but it requires the action space to include retry mechanisms and the prompt to demonstrate how to handle errors.

Systems like Memento-Skills address this with a `StatefulErrorPatternDetector` that recognizes 8 distinct error patterns and injects recovery hints. Vanilla ReAct implementations leave error handling entirely to the model's reasoning ability.

## When NOT to Use ReAct

**Latency-sensitive applications**: Each ReAct step involves at least one LLM inference call. Multi-step tasks may require 5-30 steps. At 500ms-2s per step, a 15-step task takes 7-30 seconds. For real-time applications requiring sub-second responses, ReAct's multi-turn structure is wrong.

**Tasks with unreliable feedback signals**: ReAct learns from observations. If your action space produces noisy, ambiguous, or misleading observations, the agent's reasoning will compound those errors. Reflexion research shows explicitly: "self-reflection without reliable feedback is harmful" (HumanEval Rust ablation: 60% -> 52% with reflection but no test feedback). Before using ReAct, evaluate whether your tool observations are reliable enough to reason from.

**Simple single-step tasks**: If a task requires one tool call and the result is the answer, ReAct's scaffolding adds cost and latency with no benefit. A direct tool call is faster and cheaper. ReAct's value scales with task complexity and the number of sequential decisions required.

**Exploration-heavy tasks**: ReAct refines its approach based on feedback. It does not naturally explore diverse strategies. On WebShop, where success requires trying different search phrasings to find the right product, ReAct shows minimal improvement across trials because it lacks a mechanism to force exploration. [Reflexion](../concepts/reflexion.md) specifically identifies this as a failure mode where task structure requires creative exploration rather than corrective refinement.

## Unresolved Questions

**Optimal thought verbosity**: How much detail should a Thought step contain? Short thoughts ("I'll search for this") keep context lean but provide weak reasoning. Long thoughts (multi-paragraph analysis) consume context budget fast. No principled answer exists for this tradeoff, and optimal verbosity appears model- and domain-specific.

**Step budget setting**: What is the right maximum step count for a given task class? Too low and complex tasks abort prematurely. Too high and hallucinating agents waste compute. Current practice is empirical tuning. Adaptive budgets based on task complexity detection remain an open research question.

**Thought generation as a cost center**: In production systems, the Thought step is a full LLM inference call that produces output that never leaves the system. For high-volume applications, the cost of reasoning is substantial. Approaches that distill reasoning patterns into cheaper models or skip explicit thoughts for well-learned action patterns are active research areas.

**Conflict between current observation and prior knowledge**: When an observation contradicts the model's parametric knowledge, agents sometimes ignore the observation in favor of their training. The degree to which newer models respect observations over priors is not formally characterized.

## Alternatives

**[Chain-of-Thought](../concepts/chain-of-thought.md)**: Use when the task can be solved from context alone without external tool access. Faster, cheaper, no tool infrastructure required. Fails on tasks requiring current information or multi-hop evidence from external sources.

**[Reflexion](../concepts/reflexion.md)**: Use when you need iterative improvement across multiple attempts. Reflexion wraps ReAct with an outer self-reflection loop. Use ReAct when a single trajectory suffices; use Reflexion when you have trial budgets and want the agent to learn from failures. Best for programming tasks with automated test evaluation.

**Explicit plan-then-execute**: Use when task structure is known in advance and parallelism matters. Pre-generate a full PlanStep DAG (as in Memento-Skills or similar systems), then execute steps in parallel where dependencies allow. Faster than ReAct for structured tasks but less adaptive when plans encounter unexpected tool failures.

**Direct function calling without thought traces**: Use when the action space is small and well-defined, the model is reliable, and you need minimum latency. Skip the thought steps entirely and route directly to tools based on intent classification. Faster and cheaper; loses debuggability and error-recovery capability.

**[Agentic RAG](../concepts/agentic-rag.md)**: Use when the primary action is retrieval and the task is question answering over a document corpus. Agentic RAG specializes the ReAct pattern for retrieval: the agent's key decisions are what to retrieve, when to retrieve again, and when to synthesize. ReAct is the general framework; Agentic RAG is the domain-specific instantiation.


## Related

- [Reflexion](../concepts/reflexion.md) — alternative_to (0.6)
- [GPT-4](../projects/gpt-4.md) — part_of (0.5)
- [Chain-of-Thought](../concepts/chain-of-thought.md) — extends (0.7)
- [Anthropic](../projects/anthropic.md) — part_of (0.4)
- [Model Context Protocol](../concepts/mcp.md) — part_of (0.4)
- [GraphRAG](../concepts/graphrag.md) — part_of (0.4)
- [Continual Learning](../concepts/continual-learning.md) — part_of (0.4)
- [Agentic RAG](../concepts/agentic-rag.md) — implements (0.6)
- [Agent Memory](../concepts/agent-memory.md) — part_of (0.6)
- [RAPTOR](../projects/raptor.md) — part_of (0.3)
- [AutoGPT](../projects/autogpt.md) — alternative_to (0.5)
- [Task Decomposition](../concepts/task-decomposition.md) — implements (0.7)

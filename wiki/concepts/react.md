---
entity_id: react
type: approach
bucket: agent-architecture
abstract: >-
  ReAct interleaves chain-of-thought reasoning traces with grounded actions
  (search, code execution, API calls), letting agents observe real feedback
  before each next reasoning step rather than reasoning in isolation.
sources:
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/repos/foundationagents-metagpt.md
  - deep/repos/infiniflow-ragflow.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/repos/thedotmack-claude-mem.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
related:
  - reflexion
  - context-engineering
  - model-context-protocol
  - gpt-4
  - agentic-rag
  - claude-code
  - episodic-memory
last_compiled: '2026-04-08T22:57:35.652Z'
---
# ReAct: Reasoning and Acting in Language Models

## What It Is

ReAct (Reasoning + Acting) is a prompting framework introduced in a 2023 paper by Shunyu Yao et al. at Princeton and Google Brain. The core idea: an LLM generates alternating **Thought** and **Action** steps, each followed by an **Observation** from the environment. The model reasons about what to do, does it, sees the result, and reasons again. This loop continues until the task is complete or a budget is exhausted.

The pattern looks like this:

```
Thought: I need to find the population of Tokyo.
Action: Search[Tokyo population]
Observation: Tokyo has a population of approximately 13.96 million in the city proper.
Thought: I have the number. Now I need the area.
Action: Search[Tokyo area km2]
Observation: Tokyo covers 2,194 km².
Thought: I can now calculate density.
Action: Calculate[13960000 / 2194]
Observation: 6363.7
Thought: Population density is approximately 6,364 people per km².
Action: Finish[6,364 people per km²]
```

Before ReAct, the two dominant approaches were [Chain-of-Thought](../concepts/chain-of-thought.md) (pure reasoning, no external actions) and action-only agents (no reasoning traces). Chain-of-thought hallucinated facts because it had no grounding mechanism. Action-only agents had no interpretable reasoning and struggled to recover from mistakes. ReAct combines both: reasoning provides a plan and diagnostic trail; actions provide grounding and fresh information.

## Why It Matters

ReAct sits at the foundation of nearly every production agent system built since 2023. [LangChain](../projects/langchain.md)'s `AgentExecutor`, [LangGraph](../projects/langgraph.md)'s `create_react_agent`, [AutoGen](../projects/autogen.md)'s conversable agents, [Claude Code](../projects/claude-code.md)'s tool loop, [Cursor](../projects/cursor.md)'s edit cycle, and [Agentic RAG](../concepts/agentic-rag.md) pipelines all implement recognizable variations of the Thought/Action/Observation loop.

The reason for this dominance is practical: the pattern is simple enough to implement with few-shot prompting, imposes no architecture constraints on the underlying model, and provides interpretability that pure action chains lack. When an agent fails, the thought trace tells you exactly where reasoning went wrong.

## How It Works

### The Core Loop

At each step, the model receives the full conversation history (all prior thoughts, actions, and observations) and generates a continuation. The continuation is parsed to extract either a thought (unparsed natural language) or an action (structured, environment-executable). If an action is detected, the environment executes it and appends an observation. The loop runs until a `Finish` action is produced or a step limit is hit.

The model is not retrained for this. ReAct works via few-shot prompting: 3–6 demonstrations of the Thought/Action/Observation pattern establish the format. The original paper used 6 task-specific demonstrations for HotpotQA and Fever, hand-written to show the interleaving pattern.

### Action Space

The action space is domain-specific and defined by the implementer. The original paper used three actions for question-answering:
- `Search[entity]` — Wikipedia paragraph retrieval
- `Lookup[string]` — ctrl+F within current page
- `Finish[answer]` — terminal action

Modern implementations extend this to arbitrary tool registries: web search, code execution, file read/write, API calls, database queries, shell commands. The model does not need to enumerate possible actions upfront; it generates action names as text that the framework interprets.

### Parsing and Dispatch

Action parsing is typically regex or string matching: the framework looks for `Action:` prefixed lines, extracts the action name and arguments, dispatches to the corresponding tool, and appends `Observation: [result]` to the context. This simplicity is a double-edged sword — it works with any LLM that can follow the format, but it fails when the model generates malformed action strings.

### Thought Traces as Reasoning Scaffolds

The thought steps serve multiple functions beyond just planning:
1. **Decomposition**: Breaking multi-hop questions into sub-questions
2. **Error diagnosis**: Noticing when an observation contradicts expectations
3. **State tracking**: Keeping a mental model of what has been established
4. **Backtracking signals**: Recognizing when a search returned irrelevant results and deciding to rephrase

This is why ReAct outperforms action-only agents on tasks requiring multi-step reasoning: the model can articulate "the search returned information about the wrong Tokyo — I need to add 'Japan' to disambiguate" before the next action, rather than blindly following the action-only policy.

## Original Benchmarks

The 2023 paper reported the following (self-reported by the authors; independently reproduced by subsequent work):

| Task | Metric | ReAct | Chain-of-Thought | Action-Only |
|------|--------|-------|------------------|-------------|
| HotpotQA | Exact match | 35.1 | 29.4 | 28.7 |
| Fever | Accuracy | 64.0 | 56.3 | 58.9 |
| ALFWorld (success) | Success rate | 71% | N/A | 45% |
| WebShop | Score | 40.0 | N/A | 35.1 |

The HotpotQA and Fever numbers use PaLM-540B via few-shot prompting. The ALFWorld and WebShop numbers use text-davinci-002 (GPT-3.5 class). Subsequent work with GPT-4 and later models shows substantially higher absolute numbers but the relative ordering holds: ReAct beats both pure reasoning and pure action approaches on multi-step grounded tasks.

These benchmarks are self-reported in the original paper. The comparisons against Chain-of-Thought and action-only are fair head-to-head comparisons using identical models, though the demonstrations are hand-crafted which introduces selection bias.

[Reflexion](../concepts/reflexion.md) (Shinn et al., 2023) later showed that adding a reflection step after each ReAct episode — where the model criticizes its own reasoning trace and stores verbal feedback — significantly improved performance on the same benchmarks (HotpotQA: 35.1 → 39.3, AlfWorld: 71% → 97% with 6 trials). [Voyager](../projects/voyager.md) applied the same Thought/Action/Observation structure in Minecraft, achieving 3.3x more unique items than baseline agents by combining it with an automatic curriculum and skill library.

## Implementations

### In Frameworks

**LangChain** (`langchain/agents/react/agent.py`): The `create_react_agent` function constructs a prompt using a hub template that includes the tool descriptions, format instructions (`Action:` / `Action Input:` / `Observation:`), and few-shot examples. The `AgentExecutor` wraps this in a run loop that dispatches tool calls and appends observations. LangChain's variant uses a slightly different format from the original paper — splitting `Action` and `Action Input` onto separate lines.

**LangGraph** (`langgraph/prebuilt/chat_agent_executor.py`): Implements ReAct as a graph with two nodes: `call_model` and `call_tools`. The graph routes from `call_model` to `call_tools` if the model output contains tool calls, otherwise terminates. This is a structural ReAct loop expressed as a state machine.

**AutoGen**: Wraps ReAct into conversable agent patterns where each agent maintains its own reasoning trace and coordinates with other agents through message passing.

**OpenAI Agents SDK**: The tool-calling API (function calling + assistant threads) implements the mechanical equivalent of ReAct — the model generates function call requests, the framework executes them, results are appended, and the model continues. The Thought step is implicit in the model's chain-of-thought reasoning before function selection.

### In Production Systems

[Claude Code](../projects/claude-code.md) runs an explicit Thought/Action/Observation loop: the model reasons about what file to edit or command to run, executes the action, receives the terminal output or file diff as an observation, and continues. The thought traces are surfaced to users as the model's running commentary.

[Context Engineering](../concepts/context-engineering.md) treats ReAct as a context assembly strategy: each observation is an external information signal that gets added to the context window, making subsequent reasoning steps better grounded. The survey paper formalizes this as c_know (knowledge component) being dynamically populated by action observations.

[Agentic RAG](../concepts/agentic-rag.md) extends the pattern by making retrieval itself a ReAct action: the agent decides when to search, what to search for, and how to incorporate results — rather than executing a single retrieval at the start.

[MetaGPT](../projects/metagpt.md) uses ReAct as one of three `RoleReactMode` options for individual agents. In REACT mode, `_think()` asks the LLM to select the next action from the role's action list and `_act()` executes it, with the role looping up to `max_react_loop` iterations. This embeds ReAct inside a multi-agent coordination framework where the outer loop is SOP-driven.

[Model Context Protocol](../concepts/model-context-protocol.md) standardizes the tool dispatch layer that ReAct depends on — MCP defines how actions are described, invoked, and how observations are returned, abstracting away the per-tool wiring.

## Strengths

**Grounding prevents hallucination cascades.** Without observations, errors compound: a hallucinated fact in step 2 propagates through steps 3–7. Observations provide correction points. When a search returns unexpected information, the thought trace can acknowledge the discrepancy and adjust.

**Interpretability is a deployment property, not a research nicety.** Production systems with ReAct traces are debuggable: when something fails, the thought-action-observation transcript shows exactly which search returned bad data, which reasoning step misinterpreted it, and which action was taken as a result. Pure action chains offer no equivalent.

**Works across model sizes and families.** The paper demonstrated ReAct with PaLM-540B; subsequent work shows it works with GPT-4, Claude, Gemini, and open-source models above ~7B parameters. [GPT-4](../projects/gpt-4.md) in particular benefits significantly because it produces more coherent thought traces and better calibrated action selection.

**No architectural requirements.** ReAct runs on any model that can follow few-shot demonstrations. No fine-tuning, no special training, no model modifications. This is why it spread so rapidly — any team with API access could implement it in an afternoon.

## Critical Limitations

### Concrete Failure Mode: Context Window Accumulation

Every observation appends to the context. In a 30-step task where each observation averages 500 tokens, the context grows by 15,000+ tokens before the task completes. For tasks requiring 50+ steps (complex coding, multi-document research, long-horizon planning), the context window fills before completion. The model begins losing track of early observations. Later reasoning steps are made with incomplete information.

This is not a theoretical concern. Production deployments of ReAct-based coding agents regularly hit context limits on non-trivial tasks. [Context Compression](../concepts/context-compression.md) and observation summarization partially address this, but introduce their own accuracy tradeoffs. The [Lost in the Middle](../concepts/lost-in-the-middle.md) phenomenon compounds this: even when early observations fit in the window, models attend poorly to information in the middle of long contexts.

### Unspoken Infrastructure Assumption: Reliable Action Execution

ReAct assumes that actions execute reliably and return meaningful observations. In controlled benchmarks (Wikipedia lookup, toy environments), this holds. In production:

- APIs rate-limit and return 429s
- Search results are noisy, SEO-poisoned, or paywalled
- Code execution can hang, loop, or produce multi-megabyte outputs
- External services go down

The original ReAct paper did not address error handling. When an observation is an error message, the model can sometimes recover (retry with modified action, try a different tool), but this behavior is not guaranteed and degrades on weaker models. Production implementations need explicit error handling policies: retry budgets, fallback actions, observation truncation limits. Most framework implementations leave this to the user.

## When Not to Use ReAct

**Single-step tasks with clear parametric knowledge.** If the answer is in the model's training data and one inference step is sufficient, ReAct adds latency and cost with no benefit. "Translate this sentence to French" does not need a Thought/Action/Observation loop.

**High-latency-sensitive applications.** Each action-observation round trip adds at least one tool call latency plus one LLM inference call. For interactive applications where users expect sub-second responses, multi-step ReAct loops are often too slow. Consider pre-computing or caching common action paths instead.

**Tasks requiring long-horizon planning with many interdependencies.** ReAct is greedy: each thought step plans only one action ahead. For tasks requiring 20+ interdependent steps, [multi-agent coordination](../concepts/multi-agent-systems.md) with explicit planning (like MetaGPT's `PLAN_AND_ACT` mode or Voyager's automatic curriculum) typically outperforms pure ReAct because the planner can reason about the full dependency structure before executing.

**Environments where observations are unboundedly large.** If actions return gigabyte files, entire codebases, or unfiltered database dumps, the observation appended to context overwhelms the reasoning capability. ReAct requires observations to be concise or pre-filtered.

**High-stakes irreversible actions without human oversight.** ReAct is an automated loop. When actions are irreversible (production database writes, financial transactions, deployment commands), running ReAct without [Human-in-the-Loop](../concepts/human-in-the-loop.md) checkpoints creates risk that the thought trace, however coherent, does not eliminate.

## Extensions and Variants

**Reflexion** ([concepts/reflexion.md](../concepts/reflexion.md)): Adds a reflection step after each complete episode. The model evaluates the full thought-action-observation trace, identifies what went wrong, and writes a verbal self-critique to memory. Subsequent episodes start with this critique in context. On AlfWorld, this takes ReAct from 71% to 97% success across 6 trials. The self-verification loop is the key addition.

**ReWOO (Reasoning WithOut Observation)**: Separates the planning phase from execution — the model generates all actions upfront as a sequential plan, executes them in batch, then synthesizes results. Reduces LLM calls significantly (one planning call + one synthesis call vs N calls for N-step ReAct) at the cost of flexibility: the plan cannot adapt to unexpected observations.

**Tree-of-Thought + ReAct**: The thought step generates multiple candidate continuations (tree branches) rather than a single chain, evaluated and pruned before action selection. Higher performance on tasks with many plausible next steps, but multiplies LLM calls.

**[Agentic RAG](../concepts/agentic-rag.md)**: Treats document retrieval as a ReAct action. The agent dynamically decides when to retrieve, reformulates queries based on intermediate results, and composes answers from multiple retrieval rounds. This addresses RAG's static limitation: the retrieval strategy can adapt to what the model has already learned from earlier observations.

**ACE ([projects/ace.md](../projects/ace.md))**: Extends ReAct with evolving playbooks — the Thought/Action/Observation loop accumulates learned strategies as incremental delta bullets that improve future runs. Achieves +10.6% on AppWorld benchmarks by treating ReAct traces as training signal for context improvement.

**Voyager**: Embeds ReAct in a self-improving system where successful Thought/Action/Observation sequences get distilled into a reusable skill library. New tasks retrieve relevant prior skills as context, providing compositional capability growth across episodes.

## Unresolved Questions

**Optimal thought granularity.** How long should thought steps be? The original paper used 1–3 sentence thoughts. Some production implementations use paragraph-length thoughts with explicit sub-goal tracking. No clear guidance exists on the granularity that maximizes task performance across domains.

**Action format standardization.** The paper used `Action: Search[entity]` syntax. LangChain uses `Action:` / `Action Input:` on separate lines. Function-calling APIs use JSON. There is no canonical format, and switching formats between implementations requires re-writing demonstrations.

**Budget allocation.** How many steps should a ReAct agent be allowed before terminating? The original paper used 7 steps for HotpotQA. Production systems use 10–50. No principled method exists for setting step budgets as a function of task complexity. Agents regularly both under-run (giving up too early) and over-run (looping on failed searches without progress).

**Thought authenticity.** Do models actually use thought steps for reasoning, or are thoughts post-hoc rationalizations of action selections made through other mechanisms? There is some evidence from mechanistic interpretability research that the thought trace does causally influence action selection, but this remains incompletely understood and may vary by model.

**Multi-agent ReAct coordination.** When multiple ReAct agents share an environment (as in MetaGPT or AutoGen), their individual Thought/Action/Observation loops can produce conflicting actions. No consensus exists on how to handle this: [Multi-Agent Systems](../concepts/multi-agent-systems.md) frameworks address it through various coordination mechanisms, but none is standard.

## Alternatives

**Chain-of-Thought** ([concepts/chain-of-thought.md](../concepts/chain-of-thought.md)): Use when the task requires only parametric knowledge and reasoning, no external information retrieval. Faster and cheaper than ReAct. Fails when the model needs current or specialized information not in training data.

**Pure tool-calling without thought traces**: Use when interpretability is not required and latency matters. OpenAI function calling without explicit thought prompting is this pattern. Faster but harder to debug.

**Plan-and-Execute** (e.g., MetaGPT's `PLAN_AND_ACT`, Voyager's curriculum): Use when tasks have complex interdependencies and you need global optimization of the action sequence. Slower planning step, but better performance on long-horizon tasks. ReAct's greedy one-step-at-a-time approach underperforms here.

**[Reflexion](../concepts/reflexion.md)**: Use ReAct as a subroutine, but add the reflection loop when you have multiple attempts at the same task and need learning across attempts. Reflexion is ReAct's best upgrade for iterative improvement scenarios.

**Retrieval-Augmented Generation** ([concepts/retrieval-augmented-generation.md](../concepts/retrieval-augmented-generation.md)) without the action loop: Use when the task requires factual grounding but the retrieval query can be determined upfront from the user request. Simpler, faster, and sufficient for most question-answering tasks. [Agentic RAG](../concepts/agentic-rag.md) is the upgrade when multi-hop retrieval is needed.

## Related Concepts

- [Chain-of-Thought](../concepts/chain-of-thought.md) — the reasoning-only predecessor ReAct extends
- [Reflexion](../concepts/reflexion.md) — the self-improvement layer built on top of ReAct
- [Context Engineering](../concepts/context-engineering.md) — ReAct as a dynamic context assembly strategy
- [Episodic Memory](../concepts/episodic-memory.md) — the action-observation trace is an episodic memory record
- [Agent Skills](../concepts/agent-skills.md) — skill libraries (Voyager, Memento-Skills) compress successful ReAct traces into reusable capabilities
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — how individual ReAct loops coordinate in multi-agent settings
- [Agentic RAG](../concepts/agentic-rag.md) — retrieval as a ReAct action
- [Model Context Protocol](../concepts/model-context-protocol.md) — standardizes the tool dispatch layer ReAct depends on
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — intervention points in long-running ReAct loops
- [Loop Detection](../concepts/loop-detection.md) — detecting when ReAct agents cycle without progress

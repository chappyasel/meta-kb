---
entity_id: react
type: approach
bucket: agent-systems
abstract: >-
  ReAct interleaves reasoning traces and tool-action steps in a single LLM
  prompt, letting agents think through problems while executing tools — the
  foundational loop pattern underlying most production agentic systems.
sources:
  - articles/lil-log-llm-powered-autonomous-agents.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/infiniflow-ragflow.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - reflexion
  - rag
  - locomo-bench
last_compiled: '2026-04-06T01:59:58.275Z'
---
# ReAct: Reasoning and Acting in Language Models

## What It Is

ReAct (Reasoning + Acting) is a prompting framework introduced by Yao et al. (2022) that structures LLM agent behavior as an alternating sequence of **Thought** and **Action** steps. Rather than treating reasoning and tool use as separate pipelines, ReAct interleaves them: the model writes a reasoning trace, takes an action (calls a tool, searches a database, runs code), observes the result, writes another reasoning trace, and continues until the task is complete.

The canonical step format looks like:

```
Thought: I need to find the current population of Tokyo to answer this.
Action: search["Tokyo population 2024"]
Observation: Tokyo metropolitan area population is approximately 37.4 million.
Thought: Now I have the data. I should also check if this refers to the city proper or greater metro area.
Action: search["Tokyo city proper vs metropolitan population difference"]
Observation: City proper is ~13.9 million; metro area 37.4 million includes surrounding prefectures.
Thought: The question likely means metro area. I can now answer.
Action: finish["Tokyo's population is approximately 37.4 million in the metro area"]
```

This single text-format loop — Thought, Action, Observation, repeat — is the architectural ancestor of nearly every production agent system built since 2023.

## Why It Matters

Before ReAct, LLM agents faced a bifurcation: chain-of-thought reasoning worked well for static reasoning tasks but could not interact with external information; tool-using agents could take actions but lacked the ability to reason about what those actions revealed. ReAct dissolved this bifurcation by treating the entire thought-action-observation sequence as a single generation task.

The key insight is that **reasoning and acting are not separate modules — they are the same token stream**. This means the model can:

- Identify when its current knowledge is insufficient and decide to look something up
- Interpret tool outputs in light of the original question
- Recover from incorrect actions by reasoning about what went wrong
- Decompose multi-step problems without a separate planning phase

The framework proved transferable across radically different task types: interactive QA (HotpotQA, FEVER), web browsing (WebShop), code execution, and API orchestration.

## How It Works

### The Loop Mechanics

ReAct operates as a context-extended completion task. The prompt contains:

1. **Task description** — what the agent should accomplish
2. **Available tools** — names, descriptions, and argument formats
3. **Few-shot examples** — 2–6 worked examples showing the Thought/Action/Observation pattern
4. **Current trajectory** — the running history of the current task's thoughts, actions, and observations

The model completes this prompt by generating the next Thought, predicts an Action, which a harness executes, and the harness appends the Observation to the context. This repeats until the model generates a terminal action (finish, answer, etc.) or a step limit is hit.

The harness is minimal: a parser to extract action names and arguments from model output, a dispatcher to route actions to tool implementations, and a formatter to convert tool returns into Observation strings.

### Tool Integration

Tools are the only external interface. A tool is anything that takes string input and returns string output: search engines, calculators, databases, code interpreters, web browsers, REST APIs, file systems. The model does not call these directly — it writes structured text that the harness parses and dispatches.

Tool design matters enormously. Tools with clear, narrow semantics (search["query"], lookup["entity", "attribute"]) produce more reliable action predictions than tools with broad or ambiguous interfaces.

### Thought Generation

The Thought step is unconstrained natural language. This is intentional — the model can express uncertainty, backtrack, state sub-goals, or note inconsistencies between observations. Unlike structured planning formats (JSON plans, XML task trees), the free-form thought step lets the model adapt its reasoning strategy within a single trajectory.

In practice, thought quality varies widely with model capability. Weaker models produce rote thoughts ("I should search for this") that add tokens without aiding reasoning. Stronger models produce substantive inference ("The first observation contradicts the second — I should verify which source is more recent").

### Context Growth

Every thought-action-observation triplet extends the context. For long tasks, the context grows until it hits the model's context window limit. This is ReAct's primary practical constraint: tasks requiring many steps may exceed available context before completion.

Production implementations address this through:
- **Step budgets** — hard limits on maximum iterations
- **Observation truncation** — summarizing long tool outputs before appending
- **Context compression** — replacing early trajectory segments with summaries

## Experimental Results

The original paper (Yao et al., ICLR 2023) tested on:

**HotpotQA** (multi-hop question answering): ReAct achieved 35.1% exact match, substantially above chain-of-thought at 29.4% and standard prompting. The combination of ReAct+CoT reached 38.4%. *Results are self-reported by the paper authors; the HotpotQA benchmark is public and results have been independently reproduced by later work.*

**FEVER** (fact verification): ReAct achieved 64.0% accuracy vs CoT at 56.3%. *Self-reported.*

**WebShop** (web shopping agent): ReAct scored 34.4% task success vs imitation learning baseline at 29.1%. *Self-reported; the WebShop environment is public.*

**ALFWorld** (text-based game agent): ReAct with two examples achieved 71% success across six task types. *Self-reported.*

The paper also documented ReAct's ability to recover from errors mid-trajectory — a capability chain-of-thought cannot match because it generates a single pass without observing intermediate results.

Later benchmarks using ReAct as a backbone (GAIA, SWE-Bench, AppWorld) have been independently validated by the research community, with scores tracking model capability rather than the framework itself.

## Strengths

**Interpretability.** The thought trace is human-readable. When an agent fails, you can read its trajectory and identify exactly where the reasoning broke down or which tool call produced bad output. This is genuinely useful during development and debugging.

**Minimal infrastructure.** ReAct requires only a capable LLM and a tool harness. No vector databases, no external memory systems, no fine-tuning. The entire framework is a prompt template and a dispatch loop.

**Model-agnostic.** The thought-action-observation format works with any model capable of following instructions and generating structured text. The framework transfers across model families.

**Error recovery.** The agent can observe that an action produced unexpected results and change strategy in the next thought step. This distinguishes ReAct from one-shot tool use approaches.

**Extensibility.** Adding a new tool requires only updating the tool list in the prompt. The agent learns to use new tools from their description alone (with few-shot reinforcement for complex interfaces).

## Critical Limitations

**Context collapse under long trajectories.** As the Thought/Action/Observation sequence grows, older context gets pushed toward the edge of the model's attention window. Models hallucinate or repeat earlier actions when trajectory length exceeds roughly 30–40 steps, depending on the model and context window size. The ACE framework paper documents the more general phenomenon: when agents iteratively summarize their own context, information degrades over rounds. ReAct compounds this problem because every observation extends the context. Production systems (LangChain, LangGraph, Memento-Skills) all implement step budgets or context compression as workarounds — not as enhancements, but as requirements.

**Unspoken infrastructure assumption: reliable tool execution.** ReAct assumes tools return string outputs that are accurate and relevant. In practice, search APIs return noisy results, code execution environments have sandboxing edge cases, and web scraping produces malformed HTML. The model's ability to reason about tool failures is limited — it can notice that an observation seems wrong, but it cannot independently verify tool outputs or retry with different error handling. Production deployments require robust tool implementations that sanitize outputs before they enter the context.

## When NOT to Use ReAct

**Simple single-step tasks.** If the task requires one tool call and direct synthesis (e.g., "What is the weather in Berlin?"), ReAct's overhead adds latency and cost without benefit. A direct function call with a single completion is faster and cheaper.

**Tasks requiring parallel execution.** ReAct is sequential by design — each action waits for the previous observation. Tasks that benefit from concurrent tool calls (running multiple searches simultaneously, parallel API queries) need multi-agent or parallel execution frameworks rather than a single ReAct loop. [Agent Orchestration](../concepts/agent-orchestration.md) addresses this.

**Extremely long tasks.** If a task requires 50+ tool interactions (complex software engineering tasks on SWE-Bench, multi-day research workflows), the context window becomes a hard constraint. Architectures with persistent external memory ([Agent Memory](../concepts/agent-memory.md), [Episodic Memory](../concepts/episodic-memory.md)) or hierarchical decomposition ([Task Decomposition](../concepts/task-decomposition.md)) handle these better.

**High-frequency, low-latency production services.** Each ReAct step adds a full LLM round-trip. A 10-step trajectory means 10 sequential LLM calls. For latency-sensitive applications, this is often unacceptable.

**When reasoning traces are structurally misleading.** Research on LLM faithfulness shows that thought traces sometimes do not reflect actual model computation — the model can generate a plausible-sounding thought while the actual prediction is driven by different factors. When you need auditable reasoning (high-stakes decisions, regulated domains), treat thought traces as hypotheses about model reasoning, not ground truth.

## Relationship to Neighbors

### Chain-of-Thought

[Chain-of-Thought](../concepts/chain-of-thought.md) (Wei et al., 2022) is the immediate predecessor. CoT elicits multi-step reasoning within a single completion, but generates the full reasoning chain without observing external information. ReAct extends CoT by interleaving external observations into the reasoning trace. The difference: CoT reasons from fixed context; ReAct reasons from accumulating evidence.

### Reflexion

[Reflexion](../concepts/reflexion.md) (Shinn et al., 2023) extends ReAct by adding a self-evaluation layer after task completion or failure. Where ReAct recovers from errors within a single trajectory, Reflexion stores verbal reflections across trajectories in an external memory and uses them to improve future attempts. Reflexion requires multiple attempts at the same task; ReAct operates in a single trajectory.

### RAG

[Retrieval-Augmented Generation](../concepts/rag.md) and ReAct overlap when retrieval is one of the agent's available actions. In Agentic RAG ([Agentic RAG](../concepts/agentic-rag.md)), the agent decides when to retrieve and what to retrieve based on ReAct-style reasoning traces. RAGFlow's multi-recall retrieval pipeline (running dense, sparse, GraphRAG, and TreeRAG retrieval in parallel) represents a more sophisticated version of the retrieval action available within a ReAct loop.

### Voyager and Skill Libraries

[Voyager](../projects/voyager.md)'s iterative self-verification mechanism is a domain-specific ReAct instantiation: Thought (curriculum proposal) → Action (code execution) → Observation (game state change) → Thought (self-verification). The skill library stores successful ReAct trajectories as reusable code. Memento-Skills implements the same pattern with its Read-Execute-Reflect-Write loop.

### Production Frameworks

[LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), and [CrewAI](../projects/crewai.md) all implement ReAct as a built-in agent type. LangChain's `create_react_agent` function and LangGraph's prebuilt agent graph both follow the Thought/Action/Observation loop with configurable tool sets and step limits. [Claude Code](../projects/claude-code.md) runs a ReAct-style loop where tools (Bash, Read, Edit, Write, Glob, Grep) are the available actions — claude-mem captures these as PostToolUse hook events.

## Unresolved Questions

**Thought trace faithfulness.** The extent to which generated thought traces reflect actual model computation versus post-hoc rationalization remains an open research question. This matters for debugging — if the thought trace does not explain the action prediction, reading the trace misleads rather than informs.

**Optimal step budget.** No published research establishes principled guidance for setting step budgets across task types and models. Practitioners use heuristics (10 steps for simple tasks, 50 for complex) without systematic justification.

**Multi-agent coordination.** ReAct is single-agent. When multiple ReAct agents must coordinate (one agent's action produces an observation another agent needs), the interaction protocol is not defined by the framework. [Agent Orchestration](../concepts/agent-orchestration.md) frameworks address this at the infrastructure level, but ReAct itself provides no coordination primitives.

**Thought verbosity tradeoff.** Longer, more detailed thoughts improve reasoning quality but consume tokens and increase latency. The optimal thought length for different task types and models has not been characterized.

**Context management at scale.** ACE's research on context collapse and the incremental delta pattern suggest that ReAct's naive context-append approach is fundamentally flawed for long tasks. How to integrate evolving context management (ACE's delta updates, Voyager's skill library growth) with ReAct's trajectory format is an active research area rather than a solved problem.

## Alternatives

| Framework | Choose When |
|-----------|-------------|
| **[Chain-of-Thought](../concepts/chain-of-thought.md)** | Task requires multi-step reasoning but no external information. Cheaper and faster than ReAct when tools are unnecessary. |
| **[Reflexion](../concepts/reflexion.md)** | You can afford multiple attempts at the same task and want the agent to learn from failure across attempts, not just within a single trajectory. |
| **[Agentic RAG](../concepts/agentic-rag.md)** | Task is primarily information retrieval with dynamic query reformulation. The agent needs to decide what to retrieve, not what to do. |
| **Direct function calling** | Single tool call, no reasoning required. GPT-4/Claude function calling with no ReAct wrapper is faster for simple lookup tasks. |
| **[Task Decomposition](../concepts/task-decomposition.md) + parallel agents** | Task has independent sub-tasks that benefit from concurrent execution. ReAct's sequential constraint becomes a bottleneck. |
| **[Voyager](../projects/voyager.md)-style skill library** | Agent will encounter the same task types repeatedly and should accumulate reusable capabilities. ReAct alone does not persist learned behaviors across sessions. |
| **[ACE](../concepts/ace.md) evolving playbooks** | Agent needs to improve over time through task experience without model fine-tuning. ACE's delta update pattern prevents the context collapse that plagues long-running ReAct agents. |

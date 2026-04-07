---
entity_id: task-decomposition
type: concept
bucket: agent-systems
abstract: >-
  Task decomposition breaks complex goals into verifiable subtasks for
  sequential or parallel agent execution; its key differentiator is enabling
  reliable multi-step automation by converting unbounded problems into bounded,
  checkable units of work.
sources:
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/letta-ai-letta.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/snarktank-compound-product.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - agent-memory
  - chain-of-thought
  - andrej-karpathy
  - reflexion
  - react
  - context-engineering
last_compiled: '2026-04-07T11:53:42.394Z'
---
# Task Decomposition

## What It Is

Task decomposition is the process of converting a complex, multi-step goal into a set of smaller subtasks that an agent or pipeline can execute and verify independently. In multi-agent systems, it functions as the planning layer that sits between receiving an objective and executing work. Without decomposition, LLM-based agents face a class of problems they handle poorly: long-horizon tasks where a single mistake early compounds into failure downstream, and where no single forward pass contains enough reasoning to span the full solution.

The concept is not new. Classical AI planning (STRIPS, HTN planning) relied on hierarchical task decomposition. What distinguishes the modern LLM-era formulation is that the decomposer itself is a language model, the subtasks are expressed in natural language rather than formal predicates, and verifiability is a design choice rather than a structural guarantee.

## Why It Matters

An LLM's context window is finite. Its attention over long reasoning chains degrades. Its error rate compounds when a single pass must track many interdependent constraints simultaneously. Task decomposition addresses all three problems by narrowing scope: each subtask fits comfortably within context, the model only needs to track one constraint set at a time, and errors are contained to a single subtask rather than corrupting the full solution.

The practical consequence shows up in benchmarks. [SWE-bench](../projects/swe-bench.md) performance correlates strongly with how well systems decompose repository-level bugs into investigation steps followed by targeted fixes. Systems that attempt to patch code in a single pass fail at substantially higher rates than systems that first localize the bug, then understand the relevant code, then implement the fix as separate steps. The [Compound Product](../raw/deep/repos/snarktank-compound-product.md) architecture makes this explicit: their task decomposition skill targets 8-15 granular tasks per feature rather than 3-5 large ones, with the explicit rationale that "large tasks fail because the agent loses context or makes compounding errors."

## How It Works

### Decomposition Strategies

**Sequential decomposition** produces an ordered list of steps where each step depends on the output of the previous one. This is the most common form, used in [Chain-of-Thought](../concepts/chain-of-thought.md) prompting and pipeline-style agents. The subtasks form a DAG with no branches.

**Hierarchical decomposition** produces a tree: a high-level plan broken into sub-plans, each broken further into atomic actions. [ReAct](../concepts/react.md)-style agents often operate hierarchically without making it explicit, alternating between planning at the goal level and acting at the step level.

**Parallel decomposition** identifies subtasks with no dependency relationship and dispatches them simultaneously to different agents or threads. This requires reasoning about which tasks are independent, a harder planning problem than sequential ordering. Multi-agent systems like CrewAI and AutoGen implement parallel execution but leave the independence reasoning largely to the decomposing model or to human-authored workflow definitions.

**Recursive decomposition** allows any subtask to itself be decomposed further if it proves too complex for direct execution. This is the cleanest theoretical model but creates practical problems: without explicit stopping conditions, recursion depth is unbounded, and cycles are possible if the decomposer is inconsistent.

### Verifiability as a Design Axis

The most important design decision in task decomposition is not how to split the task but how to specify completion criteria for each subtask. Verifiable criteria turn the execution loop into a mechanical process; unverifiable criteria create judgment calls that require human oversight or an LLM-as-judge layer.

The [Compound Product](../raw/deep/repos/snarktank-compound-product.md) system makes this distinction concrete. Their task schema enforces criteria with explicit patterns:

- **Command checks**: "Run `npm run typecheck` — exits with code 0"
- **File checks**: "File `src/auth/config.ts` contains `redirectUrl: '/onboarding'`"
- **Browser checks**: "Open /login — SignIn component renders"
- **API checks**: "POST /api/signup returns 200"

Criteria like "works correctly" or "review the configuration" are explicitly prohibited. The system's reliability depends on this constraint. When every subtask has a binary pass/fail test, the execution loop can run autonomously. When subtasks require judgment, human oversight becomes mandatory at each checkpoint.

### Implementation Patterns

**Skill-based decomposition** uses a prompted agent to convert a goal into a structured task list. Compound Product's `tasks` skill instructs the agent to generate a `prd.json` file with fields for id, title, description, acceptance criteria, priority, and completion status. The skill prompt includes anti-patterns to avoid and target granularity (8-15 tasks). This is a document-as-interface pattern: the planner writes a plan file, and the executor reads it.

**LLM-as-planner with tool-as-executor** separates reasoning from action. The planning model decomposes the goal and produces a task list; a separate execution layer picks up tasks and runs tools. [LangGraph](../projects/langgraph.md) and [CrewAI](../projects/crewai.md) formalize this separation into node graphs and agent role assignments respectively.

**Self-clarification before decomposition** forces the decomposer to answer a set of internal questions before generating subtasks. Compound Product's PRD generation skill requires the agent to answer five questions (problem/goal, core functionality, scope, success criteria, constraints) without asking the user. This reduces the rate of misaligned plans by grounding decomposition in explicit assumptions rather than implicit ones.

**Separation of investigation and implementation** is a decomposition pattern that shows up repeatedly in software engineering agents. Rather than a single "fix the bug" task, the pattern produces two tasks: "Understand how X works and identify where Y fails" followed by "Implement fix Z." This separation matters because the implementation strategy often depends on what investigation reveals, and conflating them produces plans based on incorrect assumptions about the codebase.

### Relationship to Context Engineering

The [survey on context engineering](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) frames this formally. The context C that an agent receives is a composition of instructions, knowledge, tools, memory, state, and the current query. Task decomposition operates on c_state (the dynamic task state) and c_instr (what the agent is supposed to do at each step). Good decomposition allocates finite context budget efficiently: each subtask receives only the context it needs rather than the full problem history.

The survey's key asymmetry finding applies directly here. LLMs understand complex contexts better than they generate equally sophisticated outputs. A decomposer receiving a rich, well-structured problem description will produce better subtasks than a model asked to both understand the problem and plan it in the same pass. This validates the pattern of having a dedicated planning agent or pass that focuses solely on decomposition before any execution begins.

## Failure Modes

### Premature Decomposition

Decomposing before the problem is understood produces subtasks that solve the wrong thing. An agent instructed to "fix the login bug" might decompose into tasks around the authentication module before discovering the bug is in session handling. The self-clarification protocols and investigation-first decomposition patterns exist precisely to catch this.

### Granularity Mismatch

Too-large subtasks fail because the executor loses context mid-execution or makes compounding errors. Too-small subtasks create overhead without adding reliability. Compound Product's research suggests 8-15 tasks per feature as a practical target, but this is highly domain-dependent. A three-step recipe substitution requires fewer tasks than a multi-file refactor.

### Dependency Misspecification

A decomposer might order tasks incorrectly, creating a situation where a later task requires the output of an earlier task that hasn't run yet, or where two tasks are marked independent but share a resource. Parallel execution makes this failure mode more severe because independent errors cannot be caught by sequential verification.

### Context Loss Between Subtasks

When each subtask runs in a fresh context (as in Compound Product's fresh-agent-per-iteration design), cross-task state must be maintained explicitly in files or structured memory. If the memory mechanism is lossy, later subtasks operate on incomplete understanding of earlier results. The system in [Compound Product](../raw/deep/repos/snarktank-compound-product.md) addresses this through `progress.txt` (a structured log with explicit "Learnings for future iterations" sections) and `AGENTS.md` (codebase knowledge that persists across features), but these are lossy compressions of full in-context state.

### Hallucinated Dependency Chains

In multi-agent systems, one agent's subtask output becomes another agent's input. A hallucinated fact in early output propagates downstream and compounds. The [jumperz tweet](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) describes exactly this problem: "raw data is dangerous when it compounds cause one hallucinated connection enters the brain and every agent downstream builds on it." The proposed solution is a validation gate (a separate supervisor agent with no context about how work was produced) that scores each output before it enters permanent storage.

### Decomposition That Exceeds Execution Budget

A plan with 25 subtasks is useless if the execution loop has a 15-iteration limit, or if the cost of running 25 agent sessions exceeds the budget. Compound Product's 25-iteration maximum can be insufficient for complex features; there is no dynamic adjustment based on remaining complexity. Plans and execution constraints must be co-designed.

## Who Implements This

Task decomposition appears across multiple system types:

**Autonomous coding agents**: [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and [GitHub Copilot](../projects/github-copilot.md) decompose engineering tasks implicitly through their planning prompts. Compound Product makes decomposition explicit with a dedicated `tasks` skill that outputs structured JSON. [SWE-bench](../projects/swe-bench.md)-oriented systems typically decompose into: reproduce the bug, localize the relevant code, understand the context, implement the fix, verify the fix.

**Multi-agent orchestration frameworks**: [LangGraph](../projects/langgraph.md) lets developers define decomposition as a node graph where each node is a subtask. [CrewAI](../projects/crewai.md) assigns decomposed subtasks to specialized agents with defined roles. Both treat decomposition as a developer responsibility rather than an emergent model behavior.

**Research agent systems**: [AutoResearch](../projects/autoresearch.md) and similar systems decompose research goals into literature search, synthesis, and writing phases. The subtask structure is often baked into the system architecture rather than generated dynamically.

**Knowledge base construction**: The [jumperz architecture](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) decomposes knowledge production into: agents produce raw material → compiler organizes into structured articles → supervisor validates → briefings feed context back to agents. Each phase is a verified handoff point.

## Relationship to Adjacent Concepts

**[Chain-of-Thought](../concepts/chain-of-thought.md)** is the within-single-pass version of task decomposition. CoT asks a model to reason step by step before answering; decomposition externalizes those steps into separately executed subtasks. The distinction matters for long-horizon tasks where CoT's reasoning chain exceeds the model's reliable attention span.

**[ReAct](../concepts/react.md)** interleaves reasoning and action, with each action-observation cycle functioning as an implicit subtask. ReAct does not produce an explicit task list upfront; it decomposes on-the-fly. This makes it more adaptive but harder to audit or budget.

**[Reflexion](../concepts/reflexion.md)** adds a self-evaluation loop to execution, where agents reflect on failed subtasks and revise their approach. This is decomposition with error recovery: failed subtasks generate diagnostic subtasks that inform revised execution.

**[Context Engineering](../concepts/context-engineering.md)** is the broader discipline. Task decomposition determines what information each subtask needs in its context. Good decomposition produces subtasks with narrow, well-defined context requirements; poor decomposition produces subtasks that need the full problem history to execute correctly.

**[Agent Memory](../concepts/agent-memory.md)** solves the cross-subtask state problem. Without persistent memory, each subtask must receive its full context from scratch. Memory systems like [Letta](../projects/letta.md) maintain state across subtask boundaries through `memory_blocks` that persist between agent invocations.

**[Meta-Agent](../concepts/meta-agent.md)** patterns often designate one agent as the decomposer and others as executors. The supervisor-swarm architecture in the [jumperz tweet](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) separates a validation agent (Hermes) from the executing swarm, with the key design principle that the validator has no context about how work was produced and thus no bias toward approving it.

## When Not to Use It

Task decomposition adds latency and complexity. For single-step tasks (answer a factual question, summarize a document, classify an input), decomposition creates overhead with no reliability benefit. The pattern is wrong when:

- The task fits comfortably in a single model pass with high reliability
- Latency constraints prohibit multiple sequential LLM calls
- Subtask outputs cannot be verified without human judgment and human oversight is unavailable at the frequency required
- The execution environment does not support persistent state between subtasks and the task requires state continuity

The pattern is also poorly suited to tasks with high ambiguity about what "done" means. Decomposition works when success criteria can be specified in advance. Creative tasks, strategic planning, and open-ended research do not have binary completion states, making the core verification mechanism inapplicable without additional judgment layers.

## Unresolved Questions

**Dynamic vs. static decomposition**: The field has not settled on when to decompose upfront versus decompose adaptively as execution proceeds. Upfront decomposition enables budgeting and parallelism but is brittle to surprises. Adaptive decomposition handles unexpected states but is harder to audit and control.

**Optimal granularity calibration**: The 8-15 task target in Compound Product is empirically derived from one team's experience with software engineering tasks. No principled framework exists for determining appropriate granularity given task type, model capability, and execution constraints.

**Cross-agent context fidelity**: In multi-agent systems, how much context should flow between subtasks and across agents? Too little context and agents operate on incomplete understanding. Too much context and agents are slow, expensive, and potentially distracted by irrelevant history.

**Verification without ground truth**: Machine-verifiable criteria (tests, type checks, file contents) work for software engineering tasks. For tasks without objective ground truth, the verification problem is unsolved. LLM-as-judge approaches introduce their own failure modes.

## Alternatives and Selection Guidance

Use **single-pass prompting with Chain-of-Thought** when the task fits in context and latency matters more than reliability on edge cases.

Use **ReAct** when the task requires dynamic information gathering and the optimal decomposition cannot be known upfront.

Use **explicit task decomposition with verification** (the Compound Product pattern) when you need autonomous execution with human review only at the end, and when subtask completion can be mechanically verified.

Use **hierarchical multi-agent decomposition** ([LangGraph](../projects/langgraph.md), [CrewAI](../projects/crewai.md)) when subtasks are heterogeneous enough to warrant specialized agent configurations, or when you need parallel execution across independent workstreams.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.4)
- [Agent Memory](../concepts/agent-memory.md) — part_of (0.5)
- [Chain-of-Thought](../concepts/chain-of-thought.md) — part_of (0.7)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.4)
- [Reflexion](../concepts/reflexion.md) — part_of (0.5)
- [ReAct](../concepts/react.md) — implements (0.7)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.6)

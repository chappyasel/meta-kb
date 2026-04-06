---
entity_id: task-decomposition
type: approach
bucket: agent-systems
abstract: >-
  Task Decomposition breaks complex goals into smaller, independently executable
  subtasks — its key differentiator is enabling parallelism, specialization, and
  verifiability that single-agent sequential execution cannot achieve.
sources:
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - repos/letta-ai-letta.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/snarktank-compound-product.md
related:
  - self-improving-agents
  - claude-code
last_compiled: '2026-04-06T02:13:29.327Z'
---
# Task Decomposition

## What It Is

Task decomposition is the process of taking a complex goal and breaking it into smaller subtasks that can be handled sequentially, in parallel, or delegated to specialized agents. In LLM agent systems, it serves two roles simultaneously: a planning mechanism (deciding what to do) and a coordination mechanism (deciding who or what does each piece).

The concept predates LLMs — classical AI planning used PDDL to decompose goals into operator sequences. What changed with LLMs is that decomposition now happens in natural language, requires no formal domain specification, and can be applied to tasks that resist formal description. This flexibility comes with tradeoffs: the decomposition quality depends on the model's understanding of the domain, not on a verified formal model.

## Why It Matters

A single LLM call has a finite context window and a single reasoning pass. Decomposition bypasses both constraints. Breaking a task into subtasks allows:

- **Parallelism**: Independent subtasks run concurrently across multiple agents
- **Specialization**: Each subtask routes to an agent or tool suited for it
- **Verifiability**: Small tasks have binary pass/fail acceptance criteria; large tasks don't
- **Error containment**: A failure in subtask 4 doesn't corrupt the reasoning for subtasks 1-3
- **Context management**: Each subtask fits within one context window; the full task may not

Systems like [Claude Code](../projects/claude-code.md) and frameworks built around [Self-Improving Agents](../concepts/self-improving-agents.md) depend on decomposition as a foundational pattern. Without it, agents either time out on complex tasks or produce low-confidence monolithic outputs.

## How It Works

### Decomposition Strategies

**Chain-of-Thought (CoT)** decomposition [Wei et al. 2022] instructs the model to "think step by step," producing an implicit sequential task list as reasoning traces. The model generates subtask descriptions inline with its reasoning. This is the simplest form: the decomposition and execution happen in the same pass.

**Tree of Thoughts (ToT)** [Yao et al. 2023] extends CoT by generating multiple decomposition candidates per step, creating a branching tree. Search strategies (BFS or DFS) with per-node scoring select the best path through the tree. This is useful when the optimal decomposition is non-obvious and exploring alternatives has value.

**Explicit task graphs** represent subtasks as nodes with dependency edges. Systems like [LangGraph](../projects/langgraph.md) and [CrewAI](../projects/crewai.md) implement this as directed acyclic graphs (DAGs) where edges encode execution ordering constraints. The agent orchestrator traverses the graph, dispatching ready nodes (those with all dependencies met) to available agents.

**LLM+P** [Liu et al. 2023] outsources decomposition to a classical planner entirely. The LLM translates a natural language goal into PDDL format, a classical planner generates the optimal plan, and the LLM translates the plan back to natural language. This produces formally optimal decompositions in domains where a PDDL model exists, but requires that model to exist — limiting applicability outside robotics and constrained planning domains.

**Skill-based decomposition** breaks tasks into units matching pre-defined agent capabilities. The Compound Product system [Source](../raw/deep/repos/snarktank-compound-product.md) targets 8-15 granular tasks per feature, each with machine-verifiable acceptance criteria. The design explicitly rejects 3-5 large tasks because large units lose context and compound errors. The task schema enforces structure: `id`, `title`, `description`, `acceptanceCriteria` (array of boolean conditions), `priority`, and `passes` (boolean). Prohibited criteria patterns include "works correctly" — anything requiring human judgment rather than mechanical verification.

### Acceptance Criteria Design

The quality of decomposition correlates with acceptance criteria specificity. Patterns that work:

```
Command checks:  "Run `npm run typecheck` — exits with code 0"
File checks:     "File src/auth/config.ts contains redirectUrl: '/onboarding'"
Browser checks:  "agent-browser: open /login — SignIn component renders"
API checks:      "POST /api/signup returns 200"
```

Patterns that fail: "works correctly," "review the configuration," "looks good." These require human judgment and break automated verification loops. The distinction matters because decomposition in self-improving agent systems feeds directly into execution loops — each subtask is picked, implemented, verified against its criteria, and committed or reverted. Vague criteria produce false positives.

### Orchestration Patterns

Once decomposed, tasks coordinate through one of three patterns:

**Sequential execution**: Tasks run in dependency order. Simple, predictable, but leaves parallelism on the table. Appropriate when subtask N genuinely requires output from subtask N-1.

**Parallel dispatch**: Independent tasks run concurrently across multiple agents or threads. [CrewAI](../projects/crewai.md) and [LangGraph](../projects/langgraph.md) both support this. Coordination overhead increases with parallelism — the orchestrator must track completion, handle failures, and merge results.

**Hierarchical decomposition**: A top-level orchestrator decomposes the goal into subtasks, each of which may itself decompose further. [LangChain](../projects/langchain.md) supports this through agent executor chaining. The risk is depth explosion: each level of hierarchy multiplies token costs and latency.

See [Agent Orchestration](../concepts/agent-orchestration.md) for coordination mechanisms in detail.

## Implementations in Practice

### HuggingGPT Pattern

HuggingGPT [Shen et al. 2023] demonstrates decomposition across four explicit stages [Source](../raw/articles/lil-log-llm-powered-autonomous-agents.md):

1. **Task planning**: LLM parses user requests into typed task objects: `{task, id, dep, args}`. The `dep` field encodes dependencies between tasks.
2. **Model selection**: Each task routes to the best available model based on task type descriptions.
3. **Task execution**: Selected models execute tasks and log results.
4. **Response generation**: LLM aggregates execution results into a final response.

The task planning prompt enforces a strict JSON schema, making decomposition output parseable. This trades flexibility for reliability — the LLM can't produce decompositions the downstream system can't parse.

### Compound Product

The Compound Product system [Source](../raw/deep/repos/snarktank-compound-product.md) implements decomposition as a two-step pipeline: PRD generation followed by task decomposition. The PRD (Product Requirements Document) skill forces a self-clarification step — the agent answers five internal questions about problem, scope, constraints, and success criteria before generating subtasks. This grounds decomposition in codebase reality rather than abstract planning.

The tasks skill converts the PRD into `prd.json` with the 8-15 task target. The execution loop then iterates: pick the highest-priority `passes: false` task, implement it, run quality checks, update the JSON, commit. Each iteration starts with a fresh agent context — the decomposition in `prd.json` serves as persistent state that survives context resets.

This architecture reveals a key property: decomposition into machine-verifiable subtasks enables autonomous execution loops. Without verifiable criteria, each subtask requires human review. With them, the loop runs unattended.

### auto-harness

The auto-harness system [Source](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md) demonstrates decomposition applied to agent improvement itself. Failures from production traces cluster by root cause, each cluster becoming a subtask (an eval case). The system decomposes "improve agent performance" into: mine failures, cluster by fix type, generate eval cases, propose harness changes, validate against regression suite. The key insight is that clustering forces decomposition at the right granularity — a fix that resolves a cluster generalizes better than a fix targeting an individual failure.

### Letta / MemGPT

[Letta](../projects/letta.md) decomposes agent work via subagents with specialized memory access. The `memory_blocks` abstraction separates persona, human context, and task state — each block is a subtask scope. Letta Code bundles pre-built skills and subagents that represent domain-specific decompositions (memory management, web search, code execution) as reusable units [Source](../raw/repos/letta-ai-letta.md).

## Connection to Self-Reflection

Decomposition without feedback loops degrades over time. [ReAct](../concepts/react.md) pairs decomposition with reflection: each step produces a `Thought / Action / Observation` trace that feeds back into subsequent steps. [Reflexion](../concepts/reflexion.md) adds persistent self-reflection: after each failed trajectory, the agent generates a verbal analysis stored in working memory, informing the next decomposition attempt.

The Karpathy autoresearch loop [Source](../raw/articles/ai-by-aakash-the-ultimate-autoresearch-guide.md) applies this to iterative improvement: decompose the optimization problem into discrete changes, score each, keep improvements and revert regressions via `git reset`. The three-file structure (editable target, locked eval, human instructions) is a decomposition that separates concerns to prevent the agent from gaming its own scoring.

## Failure Modes

**Decomposition granularity mismatch**: Tasks decomposed too coarsely exceed single context windows, causing the agent to lose reasoning threads. Tasks decomposed too finely produce overhead (token costs, coordination latency) exceeding the value of parallelism. The 8-15 task target in Compound Product is empirically derived for software feature tasks; other domains need different targets.

**Dependency hallucination**: LLMs sometimes generate task graphs with incorrect dependency edges — marking tasks as sequential that could run in parallel, or as parallel when one requires the other's output. This produces either unnecessary serialization or broken execution where a task runs before its prerequisites complete.

**Context loss between subtasks**: Each subtask typically runs in a fresh or limited context. Knowledge acquired in subtask 3 may not propagate to subtask 7. Systems address this through explicit state passing (`prd.json`, `progress.txt`, `AGENTS.md`) or [Agent Memory](../concepts/agent-memory.md) mechanisms. Without explicit propagation, agents re-discover the same constraints repeatedly.

**Acceptance criteria gaming**: When subtask success is measured by automated checks, agents optimize for the checks rather than the underlying goal. An agent can produce code that passes `npm run typecheck` while introducing logic errors that tests don't cover. This is a form of Goodhart's Law applied to task decomposition — the measure becomes the target. The lock on eval criteria in autoresearch prevents this; Compound Product's quality checks (typecheck, lint, unit tests) partially mitigate it.

**Decomposition instability**: For novel tasks, LLMs produce different decompositions on repeated attempts. Without a fixed decomposition schema, the same goal decomposes differently across runs, making results non-reproducible. Systems that enforce JSON schemas with required fields (task type, dependencies, acceptance criteria) reduce variance at the cost of flexibility.

**Over-decomposition of simple tasks**: Forcing every goal through a decomposition pipeline adds latency and cost. A task answerable in a single LLM call doesn't benefit from being split into three tasks with dependency tracking. The overhead of orchestration, state management, and inter-task communication is real.

## When Not to Use It

Task decomposition adds overhead. Skip it when:

- The task fits comfortably in one context window with margin to spare
- Acceptance criteria can't be specified without human judgment (creative tasks, strategic decisions)
- Subtask outputs depend heavily on each other in ways that are hard to formalize as dependencies
- Latency is the primary constraint — sequential decomposition with orchestration overhead is slower than a single well-prompted call
- The task is exploratory and the right decomposition isn't knowable in advance

[Chain-of-Thought](../concepts/chain-of-thought.md) prompting is often sufficient for reasoning tasks that don't require parallel execution or specialized routing. Use explicit decomposition when you need verifiability, parallelism, or subtask specialization.

## Relationship to Adjacent Concepts

**[Context Engineering](../concepts/context-engineering.md)**: Decomposition controls what context each subtask receives. Tight decomposition reduces per-subtask context requirements, enabling larger task graphs without hitting context limits.

**[Agent Memory](../concepts/agent-memory.md)**: [Episodic Memory](../concepts/episodic-memory.md) stores decomposition histories that inform future decompositions. [Procedural Memory](../concepts/procedural-memory.md) encodes successful decomposition patterns as reusable strategies.

**[Agentic RAG](../concepts/agentic-rag.md)**: Complex multi-hop queries decompose naturally into retrieval subtasks — retrieve supporting fact A, retrieve supporting fact B, synthesize. Each retrieval step is a subtask with its own context.

**[Agent Orchestration](../concepts/agent-orchestration.md)**: Decomposition determines the task graph; orchestration executes it. The two are conceptually distinct but practically intertwined — orchestration systems like [LangGraph](../projects/langgraph.md) encode decomposition structure directly in their graph definitions.

**[ReAct](../concepts/react.md)** and **[Reflexion](../concepts/reflexion.md)**: Both treat each reasoning step as a subtask with an observation step. They implement decomposition implicitly through the Thought/Action/Observation loop rather than explicitly through task graphs.

## Unresolved Questions

**Optimal granularity is domain-specific and poorly understood.** The 8-15 task heuristic in Compound Product is empirically derived for software feature tasks. No general theory predicts optimal decomposition depth for arbitrary domains.

**Decomposition quality evaluation** remains manual in most systems. Automated tools for checking whether a decomposition is complete, non-redundant, and correctly ordered don't exist at a production level.

**Cost attribution** across parallel subtasks is unclear. When three parallel agents each spend tokens on overlapping context, the effective cost of decomposition often exceeds naive estimates.

**Failure recovery** at the subtask level is underspecified. Most systems either retry the failed subtask or abort the full task. Partial completion handling — where 7 of 10 subtasks succeeded and the remaining 3 failed — lacks standard patterns.

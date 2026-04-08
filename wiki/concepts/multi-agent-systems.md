---
entity_id: multi-agent-systems
type: concept
bucket: multi-agent-systems
abstract: >-
  Multi-agent systems coordinate multiple LLM agents through communication
  protocols, shared memory, and task decomposition to tackle problems that
  exceed single-agent capabilities in scope, parallelism, or specialization.
sources:
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/transformeroptimus-superagi.md
  - repos/safishamsi-graphify.md
  - repos/alirezarezvani-claude-skills.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/evoagentx-evoagentx.md
  - repos/letta-ai-letta.md
  - repos/letta-ai-lettabot.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - repos/jackchen-me-open-multi-agent.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/jackchen-me-open-multi-agent.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - context-engineering
  - claude-code
  - andrej-karpathy
  - retrieval-augmented-generation
  - openai
  - claude
  - agent-memory
  - agent-skills
  - cursor
  - codex
  - gemini
  - letta
  - human-in-the-loop
  - self-improving-agents
  - autoresearch
  - model-context-protocol
  - knowledge-graph
  - codex
  - human-in-the-loop
  - self-improving-agents
last_compiled: '2026-04-08T02:47:58.054Z'
---
# Multi-Agent Systems

## What They Are

A multi-agent system coordinates two or more LLM-powered agents to accomplish tasks through delegation, parallelism, and specialization. Each agent maintains its own context window, tool set, and (optionally) memory, while coordination infrastructure routes tasks, shares state, and synthesizes results.

The core motivation is simple: some problems are too large, too diverse, or too parallel for a single agent. A research task requiring simultaneous literature search, data analysis, and report writing benefits from three specialized agents more than one generalist cycling through each subtask sequentially. A software engineering task spanning multiple files benefits from an orchestrator that delegates to specialists and integrates their outputs.

Multi-agent systems sit at the intersection of [Context Engineering](../concepts/context-engineering.md), [Agent Memory](../concepts/agent-memory.md), and [Agent Skills](../concepts/agent-skills.md). The defining challenge is that adding agents multiplies capability but also multiplies coordination overhead, context fragmentation, and failure surfaces.

## Core Architectural Patterns

### Orchestrator-Worker

The most common pattern: one coordinator agent decomposes a goal into tasks, assigns them to worker agents, and synthesizes results. The coordinator may use LLM-based decomposition (generating a task DAG from natural language) or deterministic routing (rules-based assignment).

The Open Multi-Agent framework demonstrates the LLM-based variant concretely. Its `runTeam()` method sends a goal to a temporary coordinator agent whose system prompt includes the full agent roster. The coordinator outputs a JSON task array with `title`, `description`, `assignee`, and `dependsOn` fields. A two-pass resolver converts title-based dependency references to stable UUIDs before loading into a topological task queue. Independent tasks execute in parallel via `Promise.all()`; results accumulate in SharedMemory for subsequent agents to read.

This pattern requires every worker to start each task with a clean conversation. Prior task outputs reach subsequent agents only through SharedMemory injection into their prompts, not through conversational continuity. That design simplifies state management but means a worker agent cannot ask a follow-up question about a predecessor's output.

### Peer-to-Peer / Debate

Agents exchange messages directly or through a message bus. Common for adversarial evaluation (one agent proposes, another critiques), ensemble reasoning (multiple independent paths later merged), or iterative refinement. [AutoGen](../projects/autogen.md) supports this pattern through its conversation graph model. [MetaGPT](../projects/metagpt.md) implements it with role-based agents (product manager, architect, engineer) that pass structured artifacts through a shared workspace.

### Fan-Out / Aggregate (MapReduce)

One orchestrator sends the same prompt to N agents with different system prompts (e.g., optimist, skeptic, pragmatist), collects results via `Promise.allSettled()` so individual failures don't cascade, then feeds all outputs to a synthesizer. Useful for perspective gathering, ensemble evaluation, and risk assessment. One agent's failure returns an error result rather than propagating an exception.

### Pipeline

Tasks flow sequentially through a fixed agent chain: Agent A's output becomes Agent B's input. Simple to reason about, but brittle when an early agent fails and offers no parallelism. [LangGraph](../projects/langgraph.md) formalizes this as a compiled state graph with explicit nodes, edges, and conditional transitions.

## Coordination Infrastructure

### Communication Channels

Agents coordinate through three mechanisms, roughly ordered by persistence:

**Shared memory / blackboard**: A key-value store all agents can read and write. Open Multi-Agent's `SharedMemory` class stores results under `agentName/taskId:result`. Downstream agents receive a markdown-formatted summary of all prior results injected into their task prompts. This avoids direct agent-to-agent coupling but introduces a new problem: summaries truncate at 200 characters, so verbose outputs (code, API designs) lose context by the time the next agent sees them.

**Message bus**: Point-to-point or broadcast pub/sub for transient signals. Supports agent-to-agent notifications during execution without the persistence overhead of shared memory. Messages carry unstructured string content in most implementations, meaning coordination quality depends on LLM natural language parsing.

**Conversation handoff**: Agent A transfers a live conversation state to Agent B. This enables iterative refinement on a single artifact across multiple agents but requires careful serialization of conversation state. The [OpenAI Agents SDK](../projects/openai-agents-sdk.md) implements this via its handoff mechanism. Most frameworks avoid it because of state-transfer complexity.

### Task Queue and Dependency Management

A production task queue needs topological ordering, cascade failure handling, and dynamic task addition. The key operations:

- On task completion: scan blocked tasks, unblock any whose dependencies are now satisfied
- On task failure: recursively mark transitive dependents as failed with informative messages
- Cycle detection: DFS with three-color marking (white/grey/black) before execution starts

Open Multi-Agent's `TaskQueue` implements all three. Its `validateTaskDependencies()` function catches self-dependencies, unknown dependency references, and cycles before the first task executes.

### Scheduling Strategies

How work gets assigned to agents matters for both performance and result quality:

- **Dependency-first**: Assigns tasks with more blocked dependents first (BFS over reverse dependency graph), maximizing parallelism for the critical path
- **Capability matching**: Scores task text against agent system prompts via keyword overlap; assigns to best match
- **Least busy**: Routes to the agent with fewest in-progress tasks at assignment time
- **Round-robin**: Simple cursor rotation; fair but ignores capability differences

Dependency-first is the default in most orchestrators because it minimizes total wall time. Capability matching makes sense when agent specialization is real (a "code reviewer" agent genuinely performs better on review tasks than a "data analyst" agent).

### Concurrency Control

Multi-agent systems need bounds at multiple levels simultaneously:

1. **Pool-level**: Maximum total concurrent agent runs across the system
2. **Per-agent**: Serialization on a single agent instance to prevent state races
3. **Tool-level**: Maximum concurrent tool calls within one agent's turn

The correct acquisition order is per-agent lock first, then pool semaphore. Acquiring in the opposite order allows a queued call to consume a pool slot while waiting for the per-agent lock, potentially starving other agents of slots.

## Context Engineering in Multi-Agent Settings

Each agent in a multi-agent system faces the same context window constraints as a standalone agent, but now must also receive coordination information: what have other agents produced, what is the current task, what tools are available. [Context Engineering](../concepts/context-engineering.md) formalized this as:

**C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)**

In a multi-agent setting, `c_state` expands to include the outputs of peer agents and the current position in the task DAG. This creates a fundamental budget tension: every token spent on coordination context (SharedMemory summaries, task descriptions, agent roster) is a token unavailable for task-relevant knowledge.

Survey research on context engineering identifies a critical asymmetry: LLMs understand complex input contexts more reliably than they generate equally complex outputs. For multi-agent systems, this means investing in rich context injection (carefully formatted SharedMemory summaries, structured task prompts) yields higher returns than relying on the model to reconstruct context from sparse inputs.

Practical implications:

- **Truncation is dangerous at coordination boundaries.** A 200-character truncation of an architect's API design, injected into a developer's prompt, may omit precisely the constraints the developer needs. Design SharedMemory summaries with task-appropriate fidelity, not uniform truncation.
- **Context grows with task count.** An orchestrator injecting full SharedMemory into every task prompt will give the 20th task 19 prior results as context overhead. Consider selective injection (only inject results from direct dependencies) or compression.
- **Structured context outperforms prose.** Agents receiving structured task assignments (explicit fields for goal, constraints, dependencies, available tools) make fewer coordination errors than agents receiving natural language task descriptions.

## Human-in-the-Loop Integration

[Human-in-the-Loop](../concepts/human-in-the-loop.md) integration in multi-agent systems typically operates at task boundaries rather than within individual agent turns. An approval gate fires between execution rounds: after a batch of tasks completes, a human can review results and block or approve progression to the next round.

The timing constraint matters: if 5 tasks execute in parallel within a round, all 5 complete before the gate fires. Human reviewers cannot intervene on individual task results within a batch. For workflows requiring fine-grained control over specific tasks, this is insufficient. You need either: approval gates per task (which eliminates parallelism benefits) or a riskier architecture where certain task types require pre-approval rather than post-approval.

## Self-Improvement via Multi-Agent Loops

Multi-agent systems unlock self-improvement patterns not available to single agents. Two concrete demonstrations:

**AutoResearch (hyperparameter tuning)**: Karpathy's report describes agents running ~700 autonomous experiments on a neural network training codebase over two days. The agents analyzed experiment sequences, identified compounding improvements, and found issues (misconfigured QK-norm, missing value embedding regularization, poorly tuned AdamW betas) that had persisted through extensive manual tuning. Validated improvements transferred to larger models and produced an 11% speedup. The key pattern: cascading validation from small proxy models to larger models filters noise before committing expensive compute. The agents demonstrated that any metric efficiently evaluable via proxy can be autoresearched by a swarm. See [AutoResearch](../projects/autoresearch.md) and [Self-Improving Agents](../concepts/self-improving-agents.md).

**Auto-harness (eval maintenance)**: A self-improvement loop mines production trace failures, clusters them by root cause (not individual incidents), converts clusters into regression test cases, proposes harness changes, and gates acceptance on passing both the new eval suite and all prior fixed failures. This "regression gate" is the architectural key: fixed failures become permanent constraints, so gains compound rather than cycling. Tau-bench scores improved from 0.56 to 0.78 (~40%) in an unattended run. The accumulating regression suite means each improvement is harder to achieve but more durable. See [Tau-bench](../projects/tau-bench.md).

Both patterns share a structure: smaller/faster evaluation proxies enable fast iteration, clustering prevents overfitting to individual cases, and a gating mechanism ensures prior gains are not undone.

## Current Implementations

| Framework | Coordination Model | Persistence | Key Differentiator |
|-----------|-------------------|-------------|-------------------|
| [LangGraph](../projects/langgraph.md) | Compiled state graph | SQLite checkpoints | Deterministic execution graphs, crash recovery |
| [OpenAI Agents SDK](../projects/openai-agents-sdk.md) | Handoff-based | None built-in | Live conversation transfer between agents |
| [AutoGen](../projects/autogen.md) | Conversation graph | None built-in | Flexible agent dialogue patterns |
| [MetaGPT](../projects/metagpt.md) | Role-based pipeline | Shared workspace | Software engineering roles, structured artifacts |
| [CrewAI](../projects/crewai.md) | Sequential/hierarchical | None built-in | Simple role-based crews, minimal setup |
| [Letta](../projects/letta.md) | Memory-centric | Persistent memory | Long-term cross-session memory as first-class primitive |

Framework selection guidance:

- Use **LangGraph** when execution graph structure is known in advance and crash recovery matters
- Use **OpenAI Agents SDK** when agents need to iteratively refine a shared artifact through handoffs
- Use **AutoGen** when agent dialogue patterns are complex or adversarial (debate, critique)
- Use **MetaGPT** for software engineering workflows with structured role-based artifacts
- Use **CrewAI** for simple crews where setup speed matters more than flexibility
- Use **Letta** when agents need persistent memory across sessions

## Failure Modes

**Coordinator decomposition fragility**: LLM-based task decomposition degrades silently. If the coordinator hallucinates an agent name not in the roster, the task gets auto-assigned to whoever the scheduler picks. If a `dependsOn` reference misspells a task title, the dependency silently drops and tasks that should be sequential run in parallel. The fix is validation: check all assignee names and dependency references against the actual roster and task list before execution begins.

**Context accumulation**: As tasks complete and SharedMemory grows, later agents receive larger context injections that may exceed budget or bury relevant information in noise. No major framework automatically prunes SharedMemory based on relevance to the current task. This degrades slowly and is hard to detect without token counting.

**Cascade failure amplification**: A single upstream failure can propagate through a dependency graph and mark most of a workflow as failed. Whether cascade failure is correct behavior depends on the domain. For some workflows, downstream tasks should proceed with partial inputs; for others, they should block. Most frameworks implement one fixed policy.

**Concurrency-induced state corruption**: Without per-agent serialization, concurrent calls to the same agent instance corrupt conversation history. The symptom is interleaved message sequences producing incoherent responses. The fix (a per-agent mutex acquired before the pool semaphore) is non-obvious.

**No live DAG modification**: Workflows that evolve during execution (a task discovers it needs a new subtask) cannot modify the running DAG in most frameworks. Tasks must be specified upfront. This forces either over-specification (predict all needed tasks in advance) or re-running the entire orchestrator with updated goals.

**Approval gate granularity**: Batch-level approval gates cannot stop individual tasks within a batch. This is a known limitation in most frameworks, not a bug, but it surprises teams that expect fine-grained human oversight.

## What's Not Resolved

**Optimal context sharing policy**: No framework has solved selective context injection. Should an agent receive all prior results or only results from its direct task dependencies? The tradeoff between completeness and context budget efficiency is unresolved, and different tasks likely need different policies.

**Benchmark validity**: Multi-agent benchmarks ([SWE-bench](../projects/swe-bench.md), [GAIA](../projects/gaia.md), [Tau-bench](../projects/tau-bench.md)) measure end-task performance but not coordination efficiency. A system that achieves high task scores through massive token waste (every agent gets full context, most of it irrelevant) looks identical to an efficient system on these benchmarks.

**Coordination overhead vs. parallelism tradeoff**: When does adding an agent help? The overhead of decomposition, context injection, and result synthesis has a fixed cost. For tasks completable in 2-3 LLM calls, a single agent is faster. The breakeven point depends on task structure, model speed, and coordination implementation quality, and no general guidance exists.

**Inter-agent trust and conflict**: When two agents produce contradictory results, who wins? Most frameworks pass both results to a synthesizer and let the LLM sort it out. That works for factual disagreements but fails for decisions that require authoritative resolution (which API design gets implemented).

**Governance at scale**: Multi-agent self-improvement loops (AutoResearch, auto-harness) demonstrate autonomous improvement but raise unresolved questions about oversight. At what point does autonomous harness modification require human review? How do you audit 700 autonomous changes for unintended side effects? No framework addresses this.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): The discipline of optimizing what goes into each agent's context window
- [Agent Memory](../concepts/agent-memory.md): How agents persist and retrieve information across tasks and sessions
- [Human-in-the-Loop](../concepts/human-in-the-loop.md): Patterns for integrating human oversight at task boundaries
- [Self-Improving Agents](../concepts/self-improving-agents.md): Autonomous improvement loops that multi-agent architectures enable
- [Model Context Protocol](../concepts/model-context-protocol.md): Standardized tool and context injection used by agents in multi-agent systems
- [Context Management](../concepts/context-management.md): Techniques for managing context budget across agent turns
- [Meta-Agent](../concepts/meta-agent.md): The coordinator agent pattern abstracted as a first-class component

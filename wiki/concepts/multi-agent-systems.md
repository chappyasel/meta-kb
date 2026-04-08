---
entity_id: multi-agent-systems
type: concept
bucket: multi-agent-systems
abstract: >-
  Multi-agent systems coordinate multiple AI agents through shared memory,
  message passing, and task orchestration to complete work no single agent can
  do alone; key differentiator is that coordination topology (orchestrator,
  peer, hierarchical) determines capability more than individual model quality.
sources:
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/notion-notion-site-notion-notion-site.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/jackchen-me-open-multi-agent.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md
  - papers/song-paperorchestra-a-multi-agent-framework-for-automa.md
  - repos/alirezarezvani-claude-skills.md
  - repos/evoagentx-evoagentx.md
  - repos/jackchen-me-open-multi-agent.md
  - repos/letta-ai-letta.md
  - repos/letta-ai-lettabot.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/safishamsi-graphify.md
  - repos/transformeroptimus-superagi.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
related:
  - context-engineering
  - claude-code
  - andrej-karpathy
  - retrieval-augmented-generation
  - openai
  - claude
  - agent-memory
  - agent-skills
  - self-improving-agents
  - autoresearch
  - model-context-protocol
  - codex
  - gemini
  - letta
  - human-in-the-loop
  - multi-agent-collaboration
  - cursor
last_compiled: '2026-04-08T23:04:39.615Z'
---
# Multi-Agent Systems

## What They Are

A multi-agent system runs multiple AI agents that divide work, share state, and combine outputs. The agents may specialize (one searches, one writes, one reviews), parallelize identical work across independent inputs, or coordinate sequentially where each agent's output feeds the next.

The core premise: some tasks exceed what a single agent can do in one context window, require diverse capabilities, or benefit from independent verification. A single agent writing and reviewing its own code is less reliable than two agents where one writes and another critiques. A research task requiring simultaneous literature search, data analysis, and synthesis completes faster with three specialized agents than one generalist working serially.

[Context Engineering](../concepts/context-engineering.md) treats multi-agent systems as a composition of six information types: instructions, knowledge, tools, memory, state, and query. Each agent receives a context assembled from these components, and the system's coordination challenge is keeping those contexts coherent and non-redundant across agents.

## Why They Matter

Three forces drive the architecture:

**Context window limits.** Even 200K-token windows cannot hold entire codebases, full research corpora, or month-long conversation histories. Distributing work across agents distributes the context load.

**Parallelism.** Independent subtasks can run simultaneously. Andrej Karpathy's [AutoResearch](../projects/autoresearch.md) experiment — running ~700 autonomous hyperparameter changes over two days — demonstrated that agent swarms find non-obvious compounding improvements (11% training speedup) that manual tuning missed after years of work. The key pattern: agents examine the sequence of prior experiment results to plan next steps, which requires shared memory of what has already been tried.

**Specialization.** Different agents with different system prompts, tool access, and model sizes handle different subtasks more reliably than one agent context-switching between roles.

## How Coordination Works

Four mechanisms appear across most frameworks:

### Task Decomposition

An orchestrator agent (or deterministic planner) breaks a goal into subtasks with dependency relationships, producing a DAG. Open Multi-Agent's coordinator pattern does this via a single LLM call: a coordinator receives the agent roster and goal, outputs a JSON task array with `title`, `description`, `assignee`, and `dependsOn` fields, and the framework resolves title-based references to stable IDs via a two-pass algorithm. The LLM outputs human-readable task titles; the framework converts them to UUIDs.

The alternative — letting users define the DAG explicitly — trades flexibility for predictability. [LangGraph](../projects/langgraph.md) compiles a `StateGraph` in code; the developer defines nodes and edges. LLM-generated task graphs are more flexible but introduce decomposition quality as a runtime variable.

### Shared Memory

Agents need access to what teammates have produced without receiving each other's full conversation histories. The standard pattern is a key-value store keyed by `agentName/key`, injected as a formatted summary into each agent's task prompt. In Open Multi-Agent, `SharedMemory.getSummary()` produces a markdown digest grouped by agent, truncated to 200 characters per entry, injected by `buildTaskPrompt()`. Every agent sees the entire team's history at prompt-construction time — selective injection is not implemented.

CORAL's approach for open-ended discovery extends this: agents maintain persistent shared memory across asynchronous runs, enabling knowledge reuse across evolutionary iterations. This is what allows 3-10x faster improvement rates versus fixed evolutionary search — agents can read prior agents' findings rather than re-exploring already-covered territory.

[Agent Memory](../concepts/agent-memory.md) architectures classify this differently: shared working memory is closer to what multi-agent systems call "team state," distinct from individual agent long-term memory.

### Message Passing

Point-to-point and broadcast messaging handles transient coordination signals that don't belong in persistent memory. Messages carry `from`, `to` (agent name or `'*'` for broadcast), and string `content`. The critical design choice in most frameworks: agents don't communicate directly during execution. Messages are read at prompt-construction time, injected alongside the shared memory summary. This keeps agents stateless between tasks and avoids the complexity of live agent-to-agent conversation.

[Model Context Protocol](../concepts/model-context-protocol.md) standardizes how agents expose capabilities to orchestrators, solving a different problem: not how agents talk to each other, but how an orchestrator discovers what a given agent can do.

### Concurrency Control

Most frameworks layer concurrency at multiple granularities. Open Multi-Agent uses three nested semaphores: pool-level (caps total concurrent agent runs, default 5), per-agent mutex (serializes concurrent runs on the same agent instance, default 1), and tool-executor (caps concurrent tool calls within one turn, default 4). Acquisition order matters: per-agent lock first, then pool semaphore, so a second queued call to the same agent waits without consuming a pool slot.

## Topology Patterns

### Orchestrator-Worker

One agent decomposes and assigns; worker agents execute. The orchestrator synthesizes results. Dominant in [AutoGen](../projects/autogen.md), [CrewAI](../projects/crewai.md), [MetaGPT](../projects/metagpt.md). Good for well-defined goals where decomposition is tractable.

### Peer / Swarm

Agents run independently with shared memory; no central coordinator. CORAL uses this for open-ended discovery where the exploration landscape is unknown — autonomous agents discover what to try next by reading the shared record of prior attempts. Karpathy's autoresearch uses this pattern: multiple agents collaborate on hyperparameter search with smaller models, and promising ideas promote to larger scale.

### Pipeline / Chain

Each agent's output feeds the next agent's input. Simple to reason about, easy to debug. Fails when an early agent produces poor output that downstream agents cannot detect or correct.

### Fan-Out / Aggregate (MapReduce)

One prompt dispatches to N agents with different system prompts (optimist, skeptic, pragmatist), results aggregate to a synthesizer. Good for tasks requiring multiple independent perspectives before a decision. `Promise.allSettled` semantics ensure one agent's failure doesn't propagate.

### Hierarchical

Nested orchestrators manage sub-teams. An outer orchestrator decomposes into major phases; inner orchestrators manage specialist teams per phase. [Claude Code](../projects/claude-code.md) uses this pattern for large software engineering tasks on [SWE-bench](../projects/swe-bench.md).

## Human-in-the-Loop Integration

[Human-in-the-Loop](../concepts/human-in-the-loop.md) integration in multi-agent systems typically fires between execution rounds rather than between individual tasks. After a batch of parallel tasks completes, a callback receives completed tasks and the pending next batch; returning `false` cascades skips to all remaining tasks.

This granularity matters: the human cannot intervene on individual task results within a parallel batch, only on the batch boundary. Fine-grained control (approving individual task outputs before downstream agents consume them) requires explicit sequential dependencies, which eliminates the parallelism benefit.

## What Frameworks Implement

| Framework | Coordination Model | Persistence | Key Differentiator |
|---|---|---|---|
| [AutoGen](../projects/autogen.md) | Conversation / handoff | None | Multi-agent chat, flexible topology |
| [CrewAI](../projects/crewai.md) | Orchestrator-worker | None | Role-based agents, simple API |
| [MetaGPT](../projects/metagpt.md) | Structured roles (PM, engineer) | None | Software engineering workflow |
| [LangGraph](../projects/langgraph.md) | Compiled StateGraph | SQLite checkpointing | Deterministic execution graph, crash recovery |
| [Letta](../projects/letta.md) | MemGPT-style with persistent memory | Database-backed | Long-running stateful agents |
| [OpenAI Agents SDK](../projects/openai-agents-sdk.md) | Handoffs | None | Agent-to-agent conversation transfer |

[Gemini](../projects/gemini.md) and [Claude](../projects/claude.md) both expose APIs used by these frameworks. [Cursor](../projects/cursor.md) and [Claude Code](../projects/claude-code.md) implement multi-agent patterns for coding tasks without exposing the coordination layer to users.

## Failure Modes

**Decomposition fragility.** If the coordinator LLM misspells a dependency title, the dependency silently drops and tasks that should be sequential run in parallel. If the coordinator hallucinates an agent name not in the roster, the task loses its assignment and gets auto-assigned by a fallback heuristic. These failures are silent — the system continues running, producing wrong results without errors.

**SharedMemory truncation.** Summarizing agent outputs to 200 characters for context injection means a code architect producing a detailed API spec loses most of it by the time a developer agent sees it. The developer reconstructs from the truncated summary, not the original. This is a systematic information loss built into the coordination mechanism.

**No live DAG modification.** Most frameworks cannot add, modify, or cancel tasks mid-execution. Goals that evolve during execution — "build X, and if that works, extend it with Y" — require either pre-specifying the contingent branch or restarting. The exception is frameworks built on compiled state graphs (LangGraph) where the graph is defined to handle conditional branching explicitly.

**Coordination overhead exceeds parallelism benefit.** For simple tasks, decomposition LLM calls, prompt-injection overhead, and result-synthesis calls cost more than just running the task with one agent. The `isSimpleGoal()` pattern (length check + complexity keyword regex) is one pragmatic solution — skip the coordinator for short, structurally simple requests.

**Context accumulation.** As team memory grows across tasks, every subsequent agent receives a longer injected summary. Without selective injection or compression, later agents in a long pipeline carry context from early tasks that may be irrelevant. Token costs compound.

**Loop detection gaps.** Sliding-window loop detection (checking for repeated tool-call signatures within a window of N turns) misses patterns longer than the window. An ABAB repetition with 5 turns between each A is invisible to a window-4 detector.

## Infrastructure Assumptions

Most multi-agent frameworks assume single-process execution. Shared memory, semaphores, and message buses use in-memory data structures with no synchronization for multi-process access. Distributing agents across machines requires replacing these components entirely — typically with Redis for shared state and a message broker for coordination. Frameworks that document this explicitly (like Open Multi-Agent's DECISIONS.md) are rare.

The second hidden assumption: ephemeral agent state. Frameworks that build a fresh agent pool per orchestrator call pay repeated initialization overhead. For high-frequency orchestration — many small team runs in sequence — this adds up. [Letta](../projects/letta.md) is notable for building against this assumption, maintaining long-running stateful agents with database-backed memory.

## Unresolved Questions

**Conflict resolution.** When two agents write contradictory conclusions to shared memory, most frameworks have no reconciliation mechanism. The synthesizer receives both and must resolve via LLM reasoning alone — which may or may not work depending on how clearly the contradiction is surfaced in the prompt.

**Cost at scale.** Running 5 agents × 10 tasks × 5 turns each means 250 LLM calls, each with growing context payloads as team memory accumulates. Published frameworks provide no tools for estimating or bounding cost before execution.

**Evaluation.** How do you know a multi-agent system is doing better than a single well-prompted agent? [SWE-bench](../projects/swe-bench.md), [GAIA](../projects/gaia.md), and [Tau-bench](../projects/tau-bench.md) benchmark agents on tasks, but don't isolate the contribution of multi-agent coordination versus better models, longer context, or more tool calls. CORAL's mechanistic analyses showing knowledge reuse as the source of improvement are unusually rigorous — most published results conflate these factors.

**Agent handoff vs. task boundary.** The architectural disagreement between handoff-style frameworks (OpenAI Agents SDK, AutoGen) and task-boundary frameworks (CrewAI, Open Multi-Agent) is unresolved. Handoffs allow richer iterative refinement but are harder to debug and checkpoint. Task boundaries are predictable but cannot support collaborative artifact refinement. No benchmark clearly favors one over the other.

## When Not to Use Multi-Agent Systems

Single-agent solutions handle more than practitioners expect. Use a multi-agent system only when at least one of these holds:

- The task genuinely exceeds a single context window, not just comfortably fits in one
- Subtasks are provably independent and benefit from parallelism
- Different subtasks require capabilities that cannot be combined in one system prompt (e.g., one agent needs web access, another needs code execution, access to both in one agent creates security problems)
- You need independent verification — a separate reviewing agent catching errors the writing agent missed

Avoid multi-agent systems when the task is well-defined and fits in context (coordination overhead dominates), when subtasks have tight dependencies that eliminate parallelism, when debugging matters (multi-agent traces are significantly harder to follow than single-agent traces), or when cost is constrained (each agent adds at minimum one LLM call plus context assembly overhead).

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — the discipline of assembling agent contexts; multi-agent systems are its most complex instantiation
- [Agent Memory](../concepts/agent-memory.md) — how individual agents and teams store state
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — approval gates in automated pipelines
- [Self-Improving Agents](../concepts/self-improving-agents.md) — agent swarms optimizing themselves, the endpoint of the CORAL / AutoResearch pattern
- [Multi-Agent Collaboration](../concepts/multi-agent-collaboration.md) — the coordination protocols specifically
- [Agent Skills](../concepts/agent-skills.md) — what individual agents can do within team contexts
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — used in some multi-agent systems for agent policy optimization

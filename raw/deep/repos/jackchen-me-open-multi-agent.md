---
url: 'https://github.com/JackChen-me/open-multi-agent'
type: repo
author: JackChen-me
date: '2026-04-08'
tags:
  - multi-agent-systems
  - agent-architecture
  - task-decomposition
  - parallel-execution
  - context-engineering
key_insight: >-
  Open Multi-Agent's coordinator pattern uses a single LLM call to decompose a
  natural-language goal into a dependency-aware task DAG with agent assignments,
  then executes independent tasks in parallel via a counting semaphore and
  topological queue -- creating a complete goal-to-result pipeline where
  inter-agent coordination happens through shared memory injection and a
  point-to-point message bus rather than direct agent-to-agent handoffs.
stars: 5336
forks: 2177
language: TypeScript
license: MIT
deep_research:
  method: source-code-analysis
  files_analyzed:
    - src/orchestrator/orchestrator.ts
    - src/orchestrator/scheduler.ts
    - src/team/team.ts
    - src/team/messaging.ts
    - src/agent/agent.ts
    - src/agent/runner.ts
    - src/agent/pool.ts
    - src/agent/loop-detector.ts
    - src/agent/structured-output.ts
    - src/task/queue.ts
    - src/task/task.ts
    - src/tool/framework.ts
    - src/tool/executor.ts
    - src/tool/text-tool-extractor.ts
    - src/memory/shared.ts
    - src/memory/store.ts
    - src/llm/adapter.ts
    - src/utils/semaphore.ts
    - src/utils/trace.ts
    - src/types.ts
    - src/index.ts
    - examples/02-team-collaboration.ts
    - examples/07-fan-out-aggregate.ts
    - DECISIONS.md
  analyzed_at: '2026-04-07'
  original_source: repos/jackchen-me-open-multi-agent.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 7
  signal_quality: 9
  composite: 8.5
  reason: >-
    Production-ready TypeScript multi-agent orchestration framework with a
    well-documented coordinator decomposition pattern, dependency-aware task
    queue, four scheduling strategies, three-tier semaphore concurrency,
    shared memory with namespace-based provenance, and a point-to-point
    message bus. Directly implements the core multi-agent coordination
    primitives (shared state, task delegation, parallel execution, conflict
    resolution) that define the multi-agent-systems bucket.
---

## Architecture Overview

Open Multi-Agent is a TypeScript framework (33 source files, 3 runtime dependencies) that provides three execution modes for LLM agents: single-agent one-shot (`runAgent`), auto-orchestrated team with coordinator decomposition (`runTeam`), and explicit task pipeline with user-defined dependencies (`runTasks`). The entire codebase is organized into six cleanly separated layers.

**Layer map:**

| Layer | Key files | Responsibility |
|-------|-----------|----------------|
| Orchestrator | `orchestrator.ts`, `scheduler.ts` | Top-level API, coordinator pattern, task decomposition, scheduling |
| Team | `team.ts`, `messaging.ts` | Agent roster, MessageBus (point-to-point + broadcast), SharedMemory binding, event bus |
| Agent | `agent.ts`, `runner.ts`, `pool.ts`, `structured-output.ts` | Agent lifecycle (idle→running→completed/error), conversation loop, concurrency pool, structured output |
| Task | `queue.ts`, `task.ts` | Dependency-aware queue with topological resolution, cascade failure, auto-unblock |
| Tool | `framework.ts`, `executor.ts`, `built-in/` | `defineTool()` with Zod schemas, ToolRegistry, parallel batch execution with semaphore |
| LLM | `adapter.ts`, `anthropic.ts`, `openai.ts`, `gemini.ts`, `grok.ts`, `copilot.ts` | Provider-agnostic `LLMAdapter` interface (`chat` + `stream`), lazy-loaded factory |

The data flow for a `runTeam` call follows a five-phase pipeline:

```
Goal string
  → isSimpleGoal() check (short-circuit for trivial goals)
  → Coordinator agent: LLM decomposes goal into JSON task array
  → parseTaskSpecs(): extract title, description, assignee, dependsOn from JSON
  → loadSpecsIntoQueue(): resolve title-based deps to UUIDs, add to TaskQueue
  → Scheduler.autoAssign(): assign unassigned tasks via dependency-first strategy
  → executeQueue(): dispatch parallel batches, write results to SharedMemory
  → Coordinator agent: synthesize final answer from all task outputs + SharedMemory
  → TeamRunResult
```

All types live in a single `types.ts` file (555 lines) to avoid circular dependencies. The public API re-exports everything from `index.ts`, which means consumers can import any component independently -- `Agent`, `Team`, `TaskQueue`, `MessageBus`, `AgentPool`, `defineTool`, `Scheduler` -- not just the top-level `OpenMultiAgent` orchestrator.

## Core Mechanism

### The Coordinator Pattern (runTeam)

The framework's central innovation is the coordinator pattern in `OpenMultiAgent.runTeam()` (starting at line 828 of `orchestrator.ts`). When a goal arrives:

1. **Triage**: `isSimpleGoal()` checks if the goal is under 200 characters and contains no complexity signals (sequencing keywords like "first...then", coordination language like "collaborate with", parallel execution markers like "in parallel", or multi-deliverable patterns). Simple goals skip the coordinator entirely and dispatch to the best-matching agent via `selectBestAgent()`, which uses bidirectional keyword affinity scoring.

2. **Decomposition**: A temporary coordinator agent receives a system prompt containing the full agent roster (name, model, system prompt preview) and is instructed to output a JSON array of task objects. The `buildCoordinatorSystemPrompt()` method (line 1123) constructs this prompt. The coordinator's output is parsed by `parseTaskSpecs()` which handles both fenced JSON blocks (```json ... ```) and bare JSON arrays, extracting `title`, `description`, `assignee`, and `dependsOn` fields.

3. **Dependency resolution**: `loadSpecsIntoQueue()` (line 1220) performs a two-pass resolution. First pass creates all tasks to get stable UUIDs and builds a `title→id` map. Second pass resolves title-based `dependsOn` references (the coordinator outputs task titles, not UUIDs) to real IDs. Tasks with unresolvable dependencies fall back to having no dependencies rather than failing.

4. **Scheduling**: The `Scheduler` class implements four strategies:
   - `dependency-first` (default): sorts tasks by descending count of transitively blocked dependents using BFS over the reverse dependency graph, then assigns via round-robin
   - `capability-match`: bidirectional keyword overlap scoring between task text and agent systemPrompt/name/model
   - `least-busy`: assigns to the agent with fewest `in_progress` tasks, simulating load during assignment
   - `round-robin`: simple cursor-based rotation

5. **Execution**: `executeQueue()` runs in rounds. Each round dispatches all pending tasks as a parallel batch via `Promise.all()`. For each task, the function builds a prompt that includes the task description, a SharedMemory summary (markdown-formatted digest of all prior task results), and any messages from the team's MessageBus. Results are written to SharedMemory under `agentName/task:taskId:result` for subsequent agents.

6. **Synthesis**: After all tasks complete, the coordinator runs again with a synthesis prompt containing all completed/failed/skipped task results and the SharedMemory summary.

### Three-Tier Concurrency Control

The framework implements concurrency at three independent levels, all using the same `Semaphore` class (a classic counting semaphore built on Promise resolution queues):

1. **AgentPool pool-level** (default max: 5): caps the total number of agent runs across the entire pool
2. **AgentPool per-agent mutex** (max: 1): serializes concurrent runs on the same `Agent` instance to prevent races on mutable state (`status`, `messages`, `tokenUsage`)
3. **ToolExecutor** (default max: 4): caps concurrent tool calls within a single agent turn

The acquisition order in `AgentPool.run()` is: per-agent lock first (so a second call for the same agent waits without consuming a pool slot), then pool semaphore. This prevents deadlocks where all pool slots are held by queued calls to the same agent.

### The Conversation Loop (AgentRunner)

`AgentRunner.stream()` in `runner.ts` implements the core agentic loop:

```
while (turns < maxTurns && !aborted) {
  response = await adapter.chat(conversation, options)
  accumulate token usage
  check token budget → break if exceeded
  check loop detection → warn/terminate if stuck
  if no tool_use blocks → break (terminal turn)
  execute all tool calls in parallel via Promise.all()
  append tool results as user message
  inject loop warning if detected (inside tool result message to maintain alternating roles)
}
```

The loop detector (`LoopDetector` in `loop-detector.ts`) maintains a sliding window of tool-call signatures (deterministic JSON with sorted keys) and text outputs. When consecutive identical entries exceed `maxRepetitions` (default 3), it returns a `LoopDetectionInfo` describing the repetition. The runner's response to detection depends on configuration: `warn` injects a warning message and gives the LLM one more chance (terminates on second detection), `terminate` stops immediately, or a custom callback can return `'continue'`, `'inject'`, or `'terminate'`.

Tool calls within a single turn execute in parallel via `Promise.all()` on the `ToolUseBlock` array. Each tool receives a `ToolUseContext` with agent identity, optional team info, and an abort signal. The `ToolExecutor` validates input against Zod schemas before execution and catches all errors as `ToolResult(isError: true)`, ensuring tool failures never crash the conversation loop.

### Inter-Agent Communication

Agents communicate through two mechanisms:

**SharedMemory** (`shared.ts`): A namespaced key-value store where writes go under `<agentName>/<key>` (e.g., `researcher/findings`). The `getSummary()` method produces a markdown digest grouped by agent, truncating values over 200 characters. This summary is injected into task prompts by `buildTaskPrompt()` so each agent sees what its teammates have produced. The store is backed by `InMemoryStore` with an async interface (for future swap to Redis/SQLite).

**MessageBus** (`messaging.ts`): A point-to-point + broadcast pub/sub system. Messages have `from`, `to` (agent name or `'*'` for broadcast), and `content` fields. Subscribers are notified synchronously. The bus maintains per-agent read state tracking (`readState` map of agent→Set<messageId>), enabling `getUnread()` queries. Messages from the bus are also injected into task prompts.

The critical design choice: agents never communicate directly. All coordination flows through the SharedMemory (persistent results) and MessageBus (transient signals), mediated by the orchestrator's prompt construction in `buildTaskPrompt()`. This keeps agents stateless between tasks and avoids the state-transfer complexity of handoff patterns.

### Task Queue and Dependency Resolution

`TaskQueue` in `queue.ts` implements a dependency-aware queue with five task states: `pending`, `in_progress`, `completed`, `failed`, `blocked`, `skipped`. When a task is added, `resolveInitialStatus()` checks if all dependencies are satisfied; unresolved dependencies promote the task to `blocked`. When a task completes, `unblockDependents()` scans all blocked tasks and promotes any whose dependencies are now fully satisfied to `pending`, firing `task:ready` events.

Failure cascading is explicit: `cascadeFailure()` recursively marks all transitive dependents as `failed`. Similarly, `cascadeSkip()` handles the approval-rejected case. The queue exposes a rich event system (`task:ready`, `task:complete`, `task:failed`, `task:skipped`, `all:complete`) that the Team class bridges onto its own EventBus.

The `validateTaskDependencies()` function in `task.ts` implements DFS cycle detection with three-color marking (white→grey→black) and also checks for self-dependencies and references to unknown task IDs. The topological sort uses Kahn's algorithm.

### Agent Lifecycle and State Machine

Each `Agent` instance tracks a four-state lifecycle: `idle → running → completed | error`. The transitions are managed by `transitionTo()` and `transitionToError()` in `agent.ts`. The key nuance is that `Agent.run()` creates a fresh conversation (no history), while `Agent.prompt()` appends to persistent history. In the orchestrator's task execution path, `pool.run()` always calls `agent.run()` -- meaning agents start each task with a clean slate. Prior task results are available only through the SharedMemory injection, not through conversational continuity.

The `Agent.executeRun()` method (line 290 of `agent.ts`) handles the full lifecycle:

1. `beforeRun` hook fires (can modify the prompt)
2. `AgentRunner.run()` executes the conversation loop
3. If `outputSchema` is set, `validateStructuredOutput()` attempts JSON parsing + Zod validation, with one automatic retry on failure
4. `afterRun` hook fires (can modify the result)
5. State transitions to `completed` or `error`

The hooks (`beforeRun`/`afterRun`) are the framework's extensibility mechanism. `beforeRun` receives the prompt and agent config, returning a (possibly modified) context. `afterRun` receives and can modify the result. Throwing from either hook aborts the run. This enables prompt manipulation (adding context), output filtering (redacting sensitive data), and validation (rejecting malformed results) without modifying the core loop.

### The Fan-Out / Aggregate Pattern

Beyond the coordinator pattern, the framework supports a manual MapReduce pattern through `AgentPool.runParallel()` (demonstrated in `examples/07-fan-out-aggregate.ts`). The pattern is:

1. Create N analyst agents with different system prompts (e.g., optimist, skeptic, pragmatist)
2. Use `pool.runParallel()` to send the same prompt to all analysts simultaneously
3. Collect results via `Promise.allSettled()` (failed agents return error results, not exceptions)
4. Feed aggregated results to a synthesizer agent

This pattern gives users explicit control over fan-out topology without the coordinator's decomposition overhead. The pool's `Promise.allSettled` approach ensures one analyst's failure doesn't cascade to others -- each gets its own error result in the map. This is a common multi-agent pattern for situations where multiple independent perspectives should be collected before synthesis.

### Structured Output Validation

The `outputSchema` feature on `AgentConfig` enables typed agent responses. When set, `buildStructuredOutputInstruction()` in `structured-output.ts` appends JSON formatting instructions to the system prompt. After the agent completes, `extractJSON()` attempts to parse the output (handling markdown code fences), and `validateOutput()` runs the Zod schema. On first validation failure, the framework retries once with error feedback: it sends the full conversation history plus a user message containing the validation error, asking the model to try again with "ONLY valid JSON." Token usage from both attempts is accumulated. The validated result is available via `result.structured`.

This is relevant to multi-agent coordination because it enables typed contracts between the coordinator and worker agents. The coordinator's task decomposition already uses implicit structured output (JSON parsing via `parseTaskSpecs()`), but the `outputSchema` feature could be used for worker agents to return structured artifacts that downstream agents can parse programmatically rather than relying on natural-language interpretation.

## Design Tradeoffs

### Coordinator-as-LLM vs. Deterministic Planning

The framework delegates task decomposition to an LLM (the coordinator) rather than using a deterministic planner. This means decomposition quality depends entirely on the coordinator model's reasoning ability. The `parseTaskSpecs()` fallback reveals the cost: if the coordinator fails to produce valid JSON, the framework falls back to creating one task per agent with the original goal as the description -- effectively abandoning decomposition.

The benefit is flexibility: the coordinator can handle arbitrary natural-language goals without the framework needing domain-specific planning logic. The cost is unpredictability -- the same goal may decompose differently across runs, and complex goals may be under-decomposed (too few tasks) or over-decomposed (unnecessary granularity). The framework provides no mechanism for the user to constrain or guide decomposition beyond the agent roster and their system prompts.

### In-Memory Everything

SharedMemory, MessageBus, TaskQueue, and agent state all live in-memory with no persistence. The DECISIONS.md file explicitly documents this as a deliberate "won't do" decision: "State persistence / checkpointing requires a storage backend, schema migrations, and serialization logic. This is enterprise infrastructure -- it triples the complexity surface." The target use case is workflows completing in seconds to minutes, not hours.

The SharedMemory values are truncated to 200 characters in summaries, which means long agent outputs (common with code-generation tasks) lose context when injected into subsequent agents' prompts. The full output is stored in the underlying `InMemoryStore` under `agentName/task:taskId:result`, but subsequent agents only see the truncated summary -- they'd need to explicitly read the key to get the full value, and the framework doesn't expose that path in task prompts.

### No Agent Handoffs

DECISIONS.md explicitly rejects the agent-handoff pattern (where Agent A transfers an in-progress conversation to Agent B). The framework uses task boundaries as the coordination primitive: one agent, one task, one result. All context sharing happens through SharedMemory and MessageBus, never through conversation-state transfer. This simplifies the model but means agents cannot collaboratively refine a single artifact across multiple rounds without the orchestrator creating explicit review tasks.

### No MCP Integration

The framework deliberately avoids MCP (Model Context Protocol) to maintain its 3-dependency principle. Users wrap external services via `defineTool()`, which requires ~10 lines of code per tool. The DECISIONS.md acknowledges this may be revisited as the MCP ecosystem grows, but currently prioritizes minimal dependencies over ecosystem integration.

### Tool Filtering: Preset → Allowlist → Denylist

The `AgentRunner.resolveTools()` method applies a three-layer filter to determine which tools an agent can use: first the preset (`readonly`, `readwrite`, `full`), then the allowlist (`tools` array intersected with preset), then the denylist (`disallowedTools` subtracted), then framework safety rails. Runtime-added tools via `agent.addTool()` bypass all filtering. This is well-designed for capability-based security (reviewer agents get read-only access, developer agents get write access), but there's no enforcement at the orchestrator level -- a misconfigured agent roster can grant tools the framework intends to restrict.

### Adaptive Triage for Simple Goals

The `isSimpleGoal()` function checks both length (<=200 chars) and absence of complexity patterns. The patterns are conservative -- they only fire on imperative coordination directives ("collaborate with the team"), not descriptive uses ("how does X coordinate with Y"). When a goal is classified as simple, the framework skips the coordinator entirely and dispatches to the best-matching agent via `selectBestAgent()` using bidirectional keyword affinity. This saves a round-trip LLM call but means the simple/complex classification boundary is hardcoded rather than learned.

## Failure Modes & Limitations

### Coordinator Decomposition Fragility

The entire multi-agent pipeline depends on the coordinator producing valid JSON with correct agent names and reasonable task dependencies. If the coordinator hallucinates agent names not in the roster, `loadSpecsIntoQueue()` silently drops the assignee (the task becomes unassigned and gets auto-assigned by the scheduler). If `dependsOn` references a title that doesn't match any task exactly (case-insensitive trim), the dependency is silently dropped. This means a coordinator that slightly misspells a dependency title produces tasks that run in parallel when they should be sequential.

### SharedMemory Truncation

The 200-character truncation in `getSummary()` means code-generation results, API designs, and other verbose outputs are severely truncated in the context injected into subsequent agent prompts. An architect agent that produces a detailed API spec will have that spec truncated to 200 characters when the developer agent sees it. The developer would need to reconstruct context from its own reasoning or the task description alone.

### No Live DAG Modification

Once the coordinator decomposes a goal into tasks and execution begins, there's no mechanism to add, modify, or cancel tasks mid-execution. The TaskQueue supports `add()`, `update()`, and `skip()`, but `executeQueue()` only checks for new pending tasks between rounds -- it doesn't support task injection from external sources. This means the framework cannot handle goals that evolve during execution (e.g., "build X, and if that works, extend it with Y").

### Single-Process Only

The framework is designed for single-process execution. The `Semaphore` class explicitly notes "Node.js is single-threaded, so this is safe without atomics." The `InMemoryStore` backing SharedMemory and MessageBus has no synchronization for multi-process access. Distributed multi-agent scenarios (agents on different machines) would require replacing multiple core components.

### Token Budget Enforcement is Post-Hoc

Token budgets (`maxTokenBudget` on AgentConfig and OrchestratorConfig) are checked after each LLM response, not before. This means a single response can significantly exceed the budget before detection triggers. The framework marks the run as `budgetExceeded` and stops further execution, but the tokens are already consumed. There's no pre-flight estimation of likely token consumption.

### Loop Detection Window Constraint

The `LoopDetector` uses a fixed sliding window (default 4 turns). This means it cannot detect patterns that span more turns than the window size (e.g., ABAB repetitions with 3 turns between each A). The window must be >= the repetition threshold, enforced by `Math.max(requestedWindow, this.maxRepeats)`.

### No Structured Communication Between Agents

The MessageBus supports only string content. There's no typed message protocol, no schema validation on messages, and no mechanism for agents to negotiate or resolve conflicts through structured dialogue. All inter-agent communication is unstructured text, which means the quality of coordination depends entirely on the LLM's ability to parse natural language messages from teammates.

### Ephemeral Agent Pool

The `buildPool()` method in `orchestrator.ts` creates a fresh `AgentPool` for every `runTeam()`/`runTasks()` call. This means agent state (including the LLM adapter connection, tool registry, and any runtime-added tools) is reconstructed from scratch each run. There's no warm-starting or connection reuse across team runs. For high-frequency orchestration (many small team runs in sequence), this adds overhead from repeated adapter initialization and built-in tool registration.

### Approval Gate Timing

The `onApproval` callback fires only between task execution rounds, not between individual tasks within a round. If a batch dispatches 5 tasks in parallel, all 5 complete before the approval gate fires. This means the human-in-the-loop cannot intervene on individual task results -- they can only approve or reject the entire batch's progression to the next round. For workflows requiring fine-grained control over individual task outcomes, this is insufficient.

## Integration Patterns

### LLM Provider Architecture

The `LLMAdapter` interface requires just two methods: `chat(messages, options)` and `stream(messages, options)`. The `createAdapter()` factory in `adapter.ts` lazy-imports provider SDKs so projects only load the SDKs they use. Five providers are built-in: Anthropic, OpenAI, Gemini, Grok, and GitHub Copilot. Any OpenAI-compatible API (Ollama, vLLM, LM Studio, llama.cpp) works via `provider: 'openai'` + `baseURL`.

The `TextToolExtractor` in `text-tool-extractor.ts` provides a critical fallback for local models that return tool calls as text rather than structured `tool_calls`. It handles three formats: Hermes `<tool_call>` tags, bare JSON objects, and JSON inside markdown code fences. A whitelist of known tool names prevents false positives (random JSON objects in model output being misinterpreted as tool calls).

### Custom Tool Definition

Tools are defined via `defineTool()` which takes a name, description, Zod input schema, and async execute function. The Zod schema serves double duty: it's converted to JSON Schema via `zodToJsonSchema()` for the LLM (supporting 20+ Zod types including unions, intersections, tuples, and effects), and it validates input at runtime before execution. The `ToolRegistry` prevents duplicate registration (throws on name collision).

### Observability

The `onTrace` callback emits structured spans with four types: `llm_call` (per turn, with model/tokens/timing), `tool_call` (per execution, with tool name/error status/timing), `task` (wraps full retry sequence), and `agent` (wraps full conversation loop). All spans share a `runId` for correlation. The `emitTrace()` utility swallows callback errors so broken subscribers never crash agent execution.

### Human-in-the-Loop

The `onApproval` callback on `runTasks()` is called between task execution rounds. After a batch completes, the callback receives the completed tasks and the list of tasks about to start. Returning `false` triggers `queue.skipRemaining()`, which marks all non-terminal tasks as skipped with cascade propagation. The approval gate only fires when at least one task succeeded and pending tasks remain.

## Comparison to Other Multi-Agent Frameworks

### vs. LangGraph

LangGraph uses a compiled StateGraph with explicit node functions and conditional edges -- the developer defines the execution graph in code. Open Multi-Agent's coordinator pattern inverts this: the LLM defines the execution graph at runtime via JSON task decomposition. LangGraph provides SQLite checkpointing for crash recovery; Open Multi-Agent explicitly rejects persistence as scope creep (documented in DECISIONS.md). LangGraph's approach gives deterministic execution graphs but requires developer effort to define them; Open Multi-Agent's approach requires zero graph wiring but introduces LLM-dependent decomposition quality.

### vs. OpenAI Agents SDK

OpenAI's framework centers on agent handoffs -- Agent A can transfer a live conversation to Agent B. Open Multi-Agent's DECISIONS.md explicitly rejects handoffs: "Handoffs are a different paradigm from our task-based model. Our tasks have clear boundaries -- one agent, one task, one result." This means Open Multi-Agent cannot support iterative refinement workflows where agents pass work products back and forth; all coordination must be mediated through the SharedMemory/MessageBus layer.

### vs. CrewAI / AutoGen

CrewAI and AutoGen support both sequential and chat-based agent collaboration. Open Multi-Agent is strictly task-based: agents never directly communicate during execution. The `MessageBus` exists but is only read at prompt-construction time, not during the agent's conversation loop. This makes the framework simpler but less flexible for debate-style or negotiation-style multi-agent patterns.

### Transferable Coordination Patterns

Several patterns in Open Multi-Agent are directly transferable to other multi-agent systems:

1. **Title-based dependency resolution**: The two-pass approach (create tasks → build title→id map → resolve `dependsOn` references) is a clean pattern for LLM-generated task graphs where the LLM outputs human-readable references rather than IDs.

2. **Prompt-injected shared state**: Rather than giving agents API access to shared state, the framework injects a formatted summary into each prompt. This is a context-engineering pattern that works with any LLM and avoids tool-call overhead for state reads.

3. **Adaptive triage via regex**: The `isSimpleGoal()` complexity-pattern approach (length check + regex array) is a cheap pre-LLM-call filter that eliminates unnecessary coordination overhead for trivial requests. The patterns are conservative by design -- they only match imperative directives, not descriptive uses.

4. **Three-tier semaphore nesting**: The pool → per-agent → per-tool concurrency layering with correct acquisition ordering (inner lock first to prevent slot starvation) is a reusable pattern for any system that needs to bound concurrency at multiple granularity levels.

5. **Cascade failure propagation**: The recursive `cascadeFailure()` and `cascadeSkip()` pattern in TaskQueue -- where a failed upstream task marks all transitive dependents with informative messages -- prevents silent hangs in dependency graphs and provides clear failure attribution.

## Benchmarks & Performance

The README claims 88% test coverage. The test suite includes 30+ test files covering unit tests for every major component (semaphore, scheduler, task queue, shared memory, message bus, loop detection, structured output, tool filtering, token budget) plus end-to-end tests for Anthropic, OpenAI, and Gemini adapters.

The framework's three runtime dependencies (`@anthropic-ai/sdk`, `openai`, `zod`) are verified by inspection of `package.json`. Gemini support (`@google/genai`) is an optional peer dependency. No benchmarks for task decomposition latency, parallel execution throughput, or token efficiency are published. The claim "33 source files" is accurate based on the repository's `src/` directory listing.

The coordinator pattern adds two LLM calls of overhead to every `runTeam` invocation: one for decomposition and one for synthesis. For simple goals that trigger `isSimpleGoal()` short-circuit, this overhead is eliminated. The `executeQueue()` loop has O(n) complexity per round (scanning all tasks for pending status), with `unblockDependents()` doing O(n) scans per completion. The `dependency-first` scheduler calls `countBlockedDependents()` which does BFS per task, making scheduling O(n * m) where m is the number of edges.

The `Semaphore` implementation is allocation-efficient: `acquire()` returns `Promise.resolve()` when a slot is free (no allocation), and only creates a new Promise when queuing. The FIFO queue is implemented as a plain Array with `shift()`, which is O(n) for dequeues but acceptable at the expected scale (pool sizes of 1-10).

Regarding token efficiency: the `buildTaskPrompt()` function injects the full SharedMemory summary into every task prompt. For teams with many completed tasks, this means later agents receive progressively larger prompts as the memory accumulates. There's no token budgeting or selective memory injection -- every agent gets the entire team's history (truncated to 200 chars per entry). A team of 5 agents with 20 tasks would inject 20 memory entries into the 20th task's prompt, regardless of whether those entries are relevant to the task.

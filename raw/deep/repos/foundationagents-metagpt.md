---
url: 'https://github.com/FoundationAgents/MetaGPT'
type: repo
author: FoundationAgents
date: '2026-04-08'
tags:
  - multi-agent-systems
  - agent-architecture
  - workflow-orchestration
  - role-based-coordination
  - SOP-materialization
  - agent-memory
  - self-improving
key_insight: >-
  MetaGPT's core innovation is encoding organizational SOPs as message-routing
  topology: each agent role subscribes to specific upstream action types via a
  _watch() mechanism, creating an implicit DAG of dependencies without explicit
  orchestration. The Environment acts as a pub-sub bus where messages carry
  cause_by metadata, letting agents self-select relevant work. This design
  means adding a new role to a pipeline requires only defining which action
  outputs it watches — zero changes to existing roles or coordination logic.
stars: 66769
forks: 8453
language: Python
license: MIT
deep_research:
  method: source-code-analysis
  files_analyzed:
    - metagpt/roles/role.py
    - metagpt/team.py
    - metagpt/schema.py
    - metagpt/environment/base_env.py
    - metagpt/environment/mgx/mgx_env.py
    - metagpt/roles/product_manager.py
    - metagpt/roles/architect.py
    - metagpt/roles/engineer.py
    - metagpt/roles/project_manager.py
    - metagpt/roles/qa_engineer.py
    - metagpt/roles/di/role_zero.py
    - metagpt/roles/di/team_leader.py
    - metagpt/roles/di/engineer2.py
    - metagpt/roles/di/data_interpreter.py
    - metagpt/memory/memory.py
    - metagpt/memory/longterm_memory.py
    - metagpt/memory/role_zero_memory.py
    - metagpt/actions/action_node.py
    - metagpt/actions/action_graph.py
    - metagpt/actions/write_prd.py
    - metagpt/actions/design_api.py
    - metagpt/actions/project_management.py
    - metagpt/strategy/planner.py
    - metagpt/exp_pool/manager.py
    - metagpt/exp_pool/decorator.py
    - metagpt/ext/aflow/scripts/optimizer.py
    - metagpt/ext/spo/components/optimizer.py
    - metagpt/software_company.py
    - metagpt/context.py
    - examples/debate.py
    - examples/build_customized_multi_agents.py
  external_docs:
    - https://docs.deepwisdom.ai/main/en/guide/get_started/introduction.html
    - https://docs.deepwisdom.ai/main/en/guide/tutorials/multi_agent_101.html
    - https://docs.deepwisdom.ai/main/en/guide/tutorials/agent_101.html
  analyzed_at: '2026-04-07'
  original_source: repos/foundationagents-metagpt.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 8
  signal_quality: 9
  composite: 8.9
  reason: >-
    Flagship multi-agent framework with 66K+ stars. Provides concrete,
    production-tested patterns for role-based coordination, SOP-driven message
    routing, shared environment memory, and experience pooling. The _watch()
    pub-sub topology, MGX team leader delegation, and AFlow/SPO self-improvement
    loops are directly transferable coordination primitives for any multi-agent
    system builder.
---

## Architecture Overview

MetaGPT is organized around four core abstractions: **Role**, **Action**, **Environment**, and **Team**. The philosophy is `Code = SOP(Team)` — standard operating procedures are encoded structurally through message routing rather than through explicit orchestration code.

**Role** (`metagpt/roles/role.py`) is the base agent class. Every role has a `RoleContext` containing:
- `memory: Memory` — stores all messages the role has processed
- `working_memory: Memory` — scratch space cleared per task
- `msg_buffer: MessageQueue` — async receive buffer for incoming messages
- `watch: set[str]` — the action types this role subscribes to
- `todo: Action` — the currently selected action
- `react_mode: RoleReactMode` — one of REACT, BY_ORDER, or PLAN_AND_ACT
- `state: int` — index into the role's action list

**Action** (`metagpt/actions/action.py`) represents an executable operation. Actions are LLM-powered by default but can be purely computational. `ActionNode` (`metagpt/actions/action_node.py`) provides a structured output mechanism with Pydantic schemas, review/revise cycles, and Zod-like format enforcement. `ActionGraph` (`metagpt/actions/action_graph.py`) allows defining dependency DAGs between ActionNodes for complex multi-step reasoning within a single role.

**Environment** (`metagpt/environment/base_env.py`) is the pub-sub bus. It holds a registry of all roles (`self.roles: dict[str, Role]`), a mapping of roles to their subscription addresses (`self.member_addrs`), and a shared history `Memory` for debugging. The environment's `run()` method fires `asyncio.gather` on all non-idle roles, enabling parallel execution within a single coordination round.

**Team** (`metagpt/team.py`) is the top-level container. It owns an Environment, manages budget (investment/cost tracking), and runs the main loop: repeatedly call `self.env.run()` until all roles are idle or the budget is exhausted. The default `n_round=3` bounds total coordination rounds.

### The MGX Evolution

The codebase contains two distinct coordination modes. The original "fixed SOP" mode uses hardcoded role pipelines (ProductManager -> Architect -> ProjectManager -> Engineer -> QaEngineer). The newer "MGX" mode (`metagpt/environment/mgx/mgx_env.py`) introduces a **TeamLeader** agent that dynamically routes messages and decomposes tasks. In `software_company.py`, the default team now hires `[TeamLeader, ProductManager, Architect, Engineer2, DataAnalyst]` — the TeamLeader replaces the implicit SOP pipeline with explicit delegation decisions.

### Concrete SOP: The Software Company Pipeline

The default software generation pipeline in fixed-SOP mode works as follows:

1. **ProductManager** (Alice) receives `UserRequirement`, runs `PrepareDocuments` (initializes git repo, saves requirement file) then `WritePRD` (generates PRD via ActionNode with competitive analysis, user stories, requirement analysis). Output is a structured JSON PRD saved to `docs/prd/`.

2. **Architect** (Bob) watches for `WritePRD` output, runs `WriteDesign` which generates system design including data structures, API interfaces, and program call flow as Mermaid sequence diagrams. Output saved to `docs/system_design/`.

3. **ProjectManager** (Eve) watches for `WriteDesign` output, runs `WriteTasks` which decomposes the system design into an ordered task list of files to implement, with dependency tracking. Output saved to `docs/task/`.

4. **Engineer** (Alex) watches for `WriteTasks` output, iterates through the task list creating `WriteCode` actions per file. Each code action receives the design doc, task doc, and existing code as context. After writing all files, `SummarizeCode` reviews the codebase for consistency. If issues are found, another WriteCode round is triggered (self-loop via `MESSAGE_ROUTE_TO_SELF`).

5. **QaEngineer** (Edward) watches for `SummarizeCode`, writes test files via `WriteTest`, runs them via `RunCode`, and debugs failures via `DebugError`. Results route back to Engineer or trigger another test cycle.

Each role disables memory (`enable_memory = False`) to avoid accumulating stale context from prior projects, relying instead on the `ProjectRepo` filesystem as persistent shared state.

### Multi-Environment Support

Beyond the software company, MetaGPT provides specialized environments:
- `StanfordTownEnv` — generative agents simulation with spatial memory, daily schedules, and conversation planning
- `WerewolfEnv` — social deduction game with role-specific action spaces (Seer, Guard, Witch)
- `AndroidEnv` — mobile app interaction with screenshot parsing and touch actions
- `MinecraftEnv` — Minecraft agent coordination with process monitoring

Each environment subclasses `ExtEnv`, which provides a gymnasium-compatible interface (`reset`, `observe`, `step`) along with the pub-sub message routing from `Environment`. The `@mark_as_readable` and `@mark_as_writeable` decorators expose environment APIs that agents can discover and invoke.

## Core Mechanism

### Message-Driven Coordination via _watch()

The central coordination primitive is the `_watch()` method on Role. When a role calls `self._watch([WritePRD])`, it registers the string representation of `WritePRD` in `self.rc.watch`. During `_observe()`, the role pops all messages from its `msg_buffer` and filters for messages where `message.cause_by in self.rc.watch` or `self.name in message.send_to`.

This creates an implicit dependency graph:
```
ProductManager._watch([UserRequirement])
Architect._watch([WritePRD])
ProjectManager._watch([WriteDesign])
Engineer._watch([WriteTasks, SummarizeCode, WriteCode, WriteCodeReview, FixBug])
QaEngineer._watch([SummarizeCode, WriteTest, RunCode, DebugError])
```

Each role subscribes to the *output type* of its upstream role. When the ProductManager finishes `WritePRD`, the resulting message carries `cause_by="WritePRD"`. The Architect, watching for `WritePRD`, picks it up. No orchestrator directs traffic — the SOP is encoded in subscription topology.

### Message Routing Through the Environment

The `Environment.publish_message()` method implements the actual routing. For each registered role, it checks `is_send_to(message, addrs)` where `addrs` are the role's subscription addresses (set at registration time via `set_addresses`). Messages matching the addresses get pushed into the role's private `msg_buffer` via `role.put_message(message)`.

The `Message` class (`metagpt/schema.py`) carries rich routing metadata:
- `cause_by: str` — the Action class that produced this message
- `sent_from: str` — the producing role
- `send_to: set[str]` — explicit recipients (defaults to `{MESSAGE_ROUTE_TO_ALL}`)
- `instruct_content: BaseModel` — structured Pydantic payload for type-safe inter-role communication
- `metadata: Dict[str, Any]` — extensible key-value store (used for agent attribution, images, etc.)

### Role Execution: The _observe → _think → _act Loop

Each role's `run()` method follows a three-phase cycle:

1. **_observe()**: Pop messages from `msg_buffer`, filter by `cause_by in self.rc.watch`, add to `self.rc.memory`. Returns the count of new relevant messages. If zero, the role remains idle.

2. **_think()**: Select the next action. Behavior depends on `react_mode`:
   - `BY_ORDER`: Advances `self.rc.state` sequentially through the action list. Used by ProductManager (PrepareDocuments → WritePRD).
   - `REACT`: Uses LLM to dynamically choose which action to execute from the `states` list, up to `max_react_loop` iterations. The LLM sees conversation history and available states, returning just a number.
   - `PLAN_AND_ACT`: Creates a `Plan` (sequence of `Task` objects with dependencies) via the `Planner`, then executes tasks one at a time with review/confirmation cycles.

3. **_act()**: Runs `self.rc.todo.run(self.rc.history)`, wraps the result in a `Message`, adds it to memory, and returns it. The caller (`run()`) then calls `publish_message()` to broadcast.

### ActionNode: Structured LLM Output

`ActionNode` (`metagpt/actions/action_node.py`) is the structured output layer that bridges LLM text generation with typed Pydantic models. Each ActionNode defines:
- A `key` (field name), `expected_type` (Python type), and `instruction` (what to generate)
- A `schema` property that generates format constraints and examples
- `fill()` and `simple_fill()` methods that prompt the LLM and parse the response into the expected type

Multiple ActionNodes compose into trees via `add_child()`. The parent node's `fill()` recursively fills all children, building a complete structured output (e.g., a PRD with user stories, competitive analysis, and requirements as separate typed fields).

The `WRITE_PRD_NODE` in `metagpt/actions/write_prd_an.py` demonstrates this: it defines 15+ child nodes for language, programming language, original requirements, product goals, user stories, competitive analysis, requirements, UI design, data structures, API endpoints, Mermaid diagrams, and more. Each node has its own type constraint and instruction. The LLM fills the entire tree in one call, and the output is validated against the Pydantic schema.

ActionNodes also support:
- `ReviewMode.HUMAN` and `ReviewMode.AUTO` for post-generation review
- `ReviseMode.HUMAN_REVIEW` for human-reviewed auto-revision
- `FillMode.CODE_FILL`, `XML_FILL`, and `SINGLE_FILL` for different output parsing strategies
- Retry with exponential backoff via tenacity decorators

### The Plan and Planner System

The `Plan` class (`metagpt/schema.py`) is a task DAG used by both the Planner and TeamLeader. A Plan contains:
- `tasks: list[Task]` — each with `task_id`, `dependent_task_ids`, `instruction`, `assignee`, and execution state
- `task_map: dict[str, Task]` — O(1) lookup by ID
- `current_task_id` — the first unfinished task after topological sort

The `Planner` (`metagpt/strategy/planner.py`) wraps Plan with LLM-driven plan generation and task management. Its `update_plan()` method:
1. Sends goal + context to `WritePlan` action
2. Pre-checks the plan structure (valid JSON, valid dependencies)
3. Optionally asks for human review via `AskReview`
4. Calls `update_plan_from_rsp()` to integrate new tasks, preserving the common prefix of existing completed tasks

The Planner's `process_task_result()` handles three outcomes: confirmation (mark complete and advance), redo (leave current for retry with feedback), or plan update (re-plan remaining tasks). This creates a plan-execute-review loop that adapts to failures.

Task assignment is explicit — each Task has an `assignee` field (role name). The TeamLeader uses `Plan.append_task(task_id, dependent_task_ids, instruction, assignee)` to create team-level plans where different tasks target different roles.

### RoleZero: Dynamic Agent Runtime

`RoleZero` (`metagpt/roles/di/role_zero.py`) is a newer, more capable base class that extends `Role` with dynamic tool use. Rather than choosing from a fixed action list, RoleZero:

1. **Recommends tools** via `BM25ToolRecommender` based on the current context
2. **Generates JSON commands** — the LLM outputs structured command arrays like `[{"command_name": "Editor.open_file", "args": {"path": "..."}}]`
3. **Executes commands** via `tool_execution_map`, a dictionary mapping command names to Python callables (Editor methods, Browser actions, Plan manipulation, Terminal commands)
4. **Loops** with `max_react_loop=50` by default, continuously observing new messages between iterations

RoleZero also introduces:
- **Quick think**: A fast-path classifier that detects simple questions (QUICK), search queries (SEARCH), or complex tasks (TASK), routing accordingly
- **Experience caching**: The `@exp_cache` decorator on `llm_cached_aask` stores successful (req, response) pairs in a vector store, enabling retrieval of prior solutions for similar problems
- **Long-term memory**: Optional Chroma-backed RAG engine (`RoleZeroLongTermMemory`) that transfers old short-term memories to vector storage and retrieves relevant past experiences during action selection

### TeamLeader: Dynamic Task Delegation

The `TeamLeader` (`metagpt/roles/di/team_leader.py`) is the central coordinator in MGX mode. Its key behaviors:

- **Intercepts all messages**: In `MGXEnv.publish_message()`, every non-direct-chat message gets routed through the TeamLeader first (`message.send_to.add(tl.name)`)
- **Delegates via `publish_team_message(content, send_to)`**: Creates `UserMessage` objects directed to specific team members by name
- **Manages plans**: Uses `Plan` objects with tasks assigned to team members, tracking completion via `Plan.finish_current_task()`
- **Complexity-based routing**: The TeamLeader's instruction prompt includes detailed t-shirt sizing logic (XS/S skip PRD/design, M+ get the full pipeline)
- **Pauses on delegation**: `_set_state(-1)` after each `publish_team_message`, halting until the assignee responds

The TeamLeader prompt (`metagpt/prompts/di/team_leader.py`) contains extensive routing rules: data tasks go to DataAnalyst, software tasks get decomposed across PM/Architect/PM/Engineer, ambiguous requirements trigger clarification, and simple questions get direct answers.

## Design Tradeoffs

### Implicit vs. Explicit Orchestration

The _watch() mechanism trades away centralized visibility for composability. Adding a new role requires only defining what it watches — no changes to a coordinator. The downside: debugging coordination failures requires tracing message `cause_by` chains across multiple roles. There is no single place that shows the full SOP graph. The MGX TeamLeader partially addresses this by centralizing routing decisions, but introduces a single point of failure.

### Sequential Writer Constraint

In the original pipeline, roles run in parallel via `asyncio.gather` in `Environment.run()`. But the SOP creates natural serialization: Architect cannot act until ProductManager produces a PRD. The codebase does not enforce ordering beyond message dependencies — if two roles watch the same action type, both receive the message and may act concurrently. This is by design for roles like QaEngineer (runs in parallel with subsequent code changes) but can cause race conditions if not carefully managed.

### Memory Architecture: Simple but Leaky

The `Memory` class is an append-only list with a cause_by index. There is no eviction, summarization, or compression built into the core memory. `RoleZeroLongTermMemory` adds RAG-based retrieval when short-term capacity (`memory_k=200` messages) is reached, transferring old messages to Chroma. But for the original fixed-SOP roles, memory grows unboundedly during a session.

The `instruct_content` field on `Message` enables structured inter-role communication (e.g., `WritePRDOutput` Pydantic model passed from PM to Architect), avoiding the lossy natural-language-only message passing of simpler frameworks. However, many actions still rely on string content rather than structured payloads, creating fragile parsing dependencies.

### RoleZero vs. Fixed-SOP: Flexibility-Reliability Tradeoff

The codebase maintains both approaches in parallel. Fixed-SOP roles (`use_fixed_sop=True`) like the original Engineer follow deterministic action sequences — more predictable but inflexible. RoleZero-based roles dynamically choose tools and strategies — more capable but prone to looping, tool misuse, or exceeding the 50-step react limit. The `ask_human` escape valve (triggered at `max_react_loop` boundary) is a pragmatic acknowledgment that dynamic agents can get stuck.

### Cost as Coordination Signal

The `CostManager` tracks API spending per context, and `Team.invest()` sets a budget cap. When costs exceed the budget, execution halts with `NoMoneyException`. This is an elegant backpressure mechanism for multi-agent systems — preventing runaway LLM calls across an entire team. But the granularity is team-level, not per-role.

## Failure Modes & Limitations

**Message Loss**: If no role's `member_addrs` matches a message's routing, `Environment.publish_message` logs a warning but the message is silently dropped. In complex pipelines with dynamic role addition, this can cause tasks to vanish.

**Unbounded Memory in Fixed-SOP Mode**: The core `Memory` class has no eviction policy. For long-running projects with many code files, the Engineer role accumulates massive context. The `memory_k=200` cap only applies to RoleZero-derived roles.

**TeamLeader Bottleneck**: In MGX mode, every message passes through the TeamLeader. If the TeamLeader misroutes a task, misunderstands requirements, or fails to mark tasks complete, the entire pipeline stalls. The `max_react_loop=3` limit means the TeamLeader gets only 3 chances to route correctly per round.

**No Conflict Resolution for Shared State**: When Engineer and QaEngineer both modify the project repository, there is no locking mechanism. The `ProjectRepo` provides file-level operations but no concurrency control. The Engineer's `code_todos` list serializes writes within a single role, but cross-role file conflicts are unhandled.

**Cyclic Task Dependencies**: The `Plan._topological_sort()` method does not detect cycles. If the LLM generates tasks with circular dependencies, the sort will infinite-loop (noted in the code: `"FIXME: if LLM generates cyclic tasks, this will result in infinite recursion"`).

**Serialization/Deserialization Fragility**: The `Message.instruct_content` field uses dynamic class loading (`import_class`) for deserialization, requiring the exact class to be importable. Renaming or moving an Action class breaks recovery of serialized teams.

**Round-Limited Coordination**: The `n_round` parameter on `Team.run()` caps the number of environment cycles. Complex software projects may require more than the default 3 rounds to complete the full PM → Architect → PM → Engineer → QA pipeline. If rounds run out mid-pipeline, work is abandoned. The user must manually increase `n_round` or the system falls back to whatever partial artifacts were produced.

**LLM State Selection Brittleness**: In REACT mode, `_think()` asks the LLM to output "just a number" selecting the next action. The `extract_state_value_from_output()` parser attempts to extract an integer from free-form text. Invalid outputs (e.g., the LLM writing "I should do action 2" instead of just "2") default to state -1 (termination). This means noisy LLM outputs can prematurely end a role's execution cycle.

**No Backpressure on Message Buffer**: The `MessageQueue` is an unbounded `asyncio.Queue`. In scenarios where one role produces messages faster than downstream roles consume them (e.g., a TeamLeader rapidly delegating tasks), the buffer grows without limit. There is no flow control or message prioritization.

**Environment Parallel Execution Semantics**: `Environment.run()` calls `asyncio.gather` on all non-idle roles simultaneously. If two roles produce messages that should be sequenced (e.g., Architect and ProjectManager both become active in the same round), their execution order is non-deterministic. The message dependencies usually prevent this, but novel role compositions without careful _watch() design can trigger ordering bugs.

## Integration Patterns

### LLM Provider Abstraction

MetaGPT supports 15+ LLM providers through `metagpt/provider/`. Each role can have its own `LLMConfig`, and the `llm_provider_registry` dispatches to the correct backend (OpenAI, Anthropic, Azure, Bedrock, Ollama, Google Gemini, ZhipuAI, DashScope, etc.). Provider configuration is YAML-based (`config2.yaml`), and per-action LLM overrides are supported via `action.private_config`.

### Tool Registry

The `@register_tool` decorator (`metagpt/tools/tool_registry.py`) registers Python functions and classes as callable tools. RoleZero's `BM25ToolRecommender` selects relevant tools per-step using BM25 keyword matching against the current context. Tool schemas are auto-generated from function signatures and docstrings, then serialized as JSON for the LLM.

Built-in tool libraries include: `Editor` (file CRUD with auto-lint), `Browser` (Playwright-based web interaction), `Terminal` (shell command execution), `CodeReview`, `Deployer`, `ImageGetter`, `SearchEnhancedQA`, and `git_create_pull`.

### Repository as Shared State

The `ProjectRepo` (`metagpt/utils/project_repo.py`) provides a structured filesystem interface that all roles share. It manages separate directories for PRDs, system designs, task documents, source code, tests, and code summaries. File dependencies are tracked via a git-based dependency graph. This is the primary shared state mechanism — roles coordinate by reading/writing to known file paths within the project repository rather than passing large payloads through messages.

### Serialization and Recovery

Teams can be serialized to JSON via `Team.serialize()` and recovered via `Team.deserialize()`. This enables checkpointing long-running multi-agent sessions. The `@serialize_decorator` on `Team.run()` auto-saves state after each round. Role state, memory, and the project repository are all persisted, allowing recovery after crashes.

Recovery works through the `latest_observed_msg` field on Role. When a role is deserialized, it sets `self.recovered = True` and uses the last observed message to find unprocessed messages in memory. The role resumes from its saved `rc.state`, picking up the exact action it was about to execute. This is more sophisticated than simple restart — it provides mid-pipeline recovery with correct state restoration.

### Context and Cost Management

The `Context` class (`metagpt/context.py`) is MetaGPT's dependency injection container, shared across all roles in a Team via the Environment. It provides:
- `config: Config` — global configuration including LLM settings, workspace paths, and feature flags
- `kwargs: AttrDict` — dynamic key-value store for passing data between phases (project path, source filenames)
- `cost_manager: CostManager` — tracks API token usage and dollar costs across all LLM calls
- `llm()` factory method — creates LLM instances with cost tracking attached

The CostManager implements per-model cost tracking (`prompt_tokens`, `completion_tokens`, `total_cost`) and supports different pricing models (standard token pricing via `CostManager`, raw token counting via `TokenCostManager`, and Fireworks-specific pricing via `FireworksCostManager`). The `max_budget` field enables hard cost limits — when `total_cost >= max_budget`, `NoMoneyException` propagates up through the Team's `_check_balance()`, halting all agent execution.

### Customization Patterns

MetaGPT provides clean extension points. Building a custom multi-agent system involves:

1. **Define Actions**: Subclass `Action`, implement `async def run(self, *args)` with LLM calls or computation
2. **Define Roles**: Subclass `Role`, call `self.set_actions([...])` and `self._watch([...])` in `__init__`
3. **Override behavior**: Implement `_observe()` for custom message filtering, `_think()` for custom action selection, `_act()` for custom execution logic
4. **Assemble Team**: Create `Team()`, call `team.hire([role1, role2, ...])`, set investment, run

The `examples/build_customized_multi_agents.py` demonstrates a SimpleCoder → SimpleTester → SimpleReviewer pipeline in under 100 lines. The `examples/debate.py` shows peer-to-peer communication where two Debators watch each other's `SpeakAloud` action and exchange messages directly via `send_to` targeting.

For RoleZero-based customization, subclasses override `_update_tool_execution()` to register custom tools, set `tools: list[str]` for tool recommendations, and provide `instruction: str` for task-specific prompting. The Engineer2 class demonstrates this with 11 tool categories including deployment, code review, and git operations.

## Benchmarks & Performance

The README claims approximately **$0.2** in GPT-4 API costs per example for analysis and design, and **~$2.0** for a complete project generation. These numbers are not verified in the source code — there is no benchmark suite that measures end-to-end cost. The `CostManager` class tracks token usage and dollar costs per `LLMType`, but no automated cost benchmarks exist in the test suite.

The AFlow paper (accepted at ICLR 2025 as oral, top 1.8%) demonstrates workflow optimization results, but the benchmark code lives in `metagpt/ext/aflow/benchmark/` and evaluates on academic datasets (GSM8K, HotPotQA, HumanEval, MBPP, MATH, DROP) rather than on MetaGPT's own software generation quality.

The SPO (Sequential Prompt Optimization) system (`metagpt/ext/spo/`) provides a self-improvement loop: evaluate prompt performance on QA pairs, generate modified prompts, compare old vs. new via pairwise LLM evaluation, keep the winner. But this optimizes individual prompts, not the multi-agent coordination itself.

No public benchmarks compare MetaGPT's multi-agent output quality against alternatives like ChatDev, AutoGen, or CrewAI on standardized software generation tasks. The SWE-Bench integration exists (`metagpt/roles/di/swe_agent.py`) but is configured for single-agent evaluation, not multi-agent pipeline evaluation.

## Self-Improvement and Experience Systems

### Experience Pool

The `exp_cache` decorator (`metagpt/exp_pool/decorator.py`) implements automatic experience management. When an `@exp_cache`-decorated function runs, it:
1. Queries the `ExperienceManager` for similar past (request, response) pairs
2. If a "perfect" experience exists (scored by `SimplePerfectJudge`), returns the cached response without an LLM call
3. Otherwise, executes the function, scores the result, and stores the new experience

The `ExperienceManager` (`metagpt/exp_pool/manager.py`) uses a `SimpleEngine` (LlamaIndex-based RAG) backed by ChromaDB for vector similarity search. Experiences are tagged by function name and filtered by similarity.

This creates a learning loop: as agents solve more problems, they accumulate reusable solutions. The `RoleZeroContextBuilder` injects retrieved experiences directly into the LLM context, providing few-shot examples from past successful runs.

### AFlow: Automated Workflow Optimization

The AFlow extension (`metagpt/ext/aflow/`) automates the optimization of agentic workflows. The `Optimizer` class iteratively:
1. Generates modified workflow graphs (new operator combinations, prompt changes)
2. Evaluates on sample datasets
3. Tracks convergence via `ConvergenceUtils`
4. Stores experience summaries for future optimization rounds

This is a meta-level self-improvement: rather than improving individual agent responses, AFlow optimizes the *structure* of multi-agent workflows — which operators to compose, in what order, with what prompts.

### SPO: Sequential Prompt Optimization

The SPO extension (`metagpt/ext/spo/`) optimizes prompts through iterative tournament-style evaluation:
1. Execute a prompt on test questions
2. Generate an optimized variant via LLM
3. Run both variants, compare outputs pairwise (with randomized ordering to prevent position bias)
4. Keep the winner, repeat

This closes the self-improvement loop at the prompt level — individual agent instructions evolve through automated evaluation.

### SELA: Tree-Search for ML Experimentation

The SELA extension (`metagpt/ext/sela/`) applies Monte Carlo Tree Search (MCTS) to machine learning experimentation. The `ExperimentRunner` generates solution designs, the MCTS explores the space of feature engineering and model selection choices, and an evaluator scores results. This demonstrates MetaGPT's extensibility beyond software generation — the same role/action/environment primitives can encode completely different multi-agent workflows (here, an AI researcher exploring experiment trees).

### Patterns That Transfer

Several MetaGPT patterns are directly applicable to other multi-agent systems:

1. **Subscription-based coordination**: The _watch() mechanism is a minimal, composable alternative to explicit DAG definitions. Any system where agents produce typed outputs can use this pattern.

2. **Environment as shared bus with private buffers**: The split between `Environment.publish_message()` (broadcast) and `Role.msg_buffer` (private queue) cleanly separates routing from processing. Each agent consumes at its own pace.

3. **Structured message payloads via `instruct_content`**: Passing Pydantic models through messages enables type-safe inter-agent communication without shared databases. The dynamic class creation (`create_model`) allows runtime schema evolution.

4. **Cost-bounded execution**: `NoMoneyException` is a transferable pattern for any multi-agent system running against paid APIs. Budget as a first-class coordination constraint prevents runaway costs.

5. **Experience-driven caching**: The `@exp_cache` decorator pattern — vector-search past (input, output) pairs, return cached results for similar inputs — works for any repeated LLM call pattern, not just multi-agent coordination.

6. **Dual-mode operation**: Maintaining both deterministic (fixed SOP) and dynamic (RoleZero) execution paths within the same framework allows practitioners to choose reliability vs. flexibility per role. This is more practical than forcing all agents into one paradigm.

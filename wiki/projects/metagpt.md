---
entity_id: metagpt
type: project
bucket: multi-agent-systems
abstract: >-
  MetaGPT is a multi-agent framework encoding software engineering SOPs as
  message-routing topology, where roles self-coordinate by subscribing to
  upstream action output types rather than receiving explicit orchestration
  commands.
sources:
  - tweets/godofprompt-breaking-mipt-just-ran-the-largest-ai-agent-co.md
  - repos/foundationagents-metagpt.md
  - deep/repos/foundationagents-metagpt.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - react
last_compiled: '2026-04-08T02:51:22.766Z'
---
# MetaGPT

## What It Does

MetaGPT turns a single natural-language requirement into a full software project by running a team of specialized LLM agents through a structured pipeline: Product Manager writes a PRD, Architect produces system design, Project Manager decomposes tasks, Engineers write code, and QA validates and debugs. The headline claim is `Code = SOP(Team)` — the coordination logic lives in the subscription topology, not in an orchestrator.

At 66,769 GitHub stars, MetaGPT is one of the most-forked multi-agent frameworks. The popularity reflects timing (early entrant in the software-agent space) as much as technical superiority. [Source](../raw/repos/foundationagents-metagpt.md)

## Architecturally Unique: SOP as Message Routing

Most multi-agent frameworks use an explicit orchestrator — one agent directs others. MetaGPT's central insight: encode the standard operating procedure implicitly through subscription topology. Each role registers which upstream action types it cares about via `_watch()`. No coordinator dispatches tasks. [Source](../raw/deep/repos/foundationagents-metagpt.md)

When ProductManager finishes `WritePRD`, the resulting `Message` carries `cause_by="WritePRD"`. The Environment's `publish_message()` checks every registered role's subscription addresses. Architect, watching for `WritePRD`, finds the message in its `msg_buffer`. Nothing more is needed.

This means adding a new role to a pipeline requires defining only what it watches — zero changes to existing roles or any central coordinator.

The framework has since evolved. The original "fixed SOP" mode uses hardcoded pipelines. The newer "MGX" mode introduces a `TeamLeader` agent that dynamically routes messages and decomposes tasks, partially re-centralizing coordination in exchange for flexibility.

## Core Mechanism

### Four Abstractions

**Role** (`metagpt/roles/role.py`): Base agent class. Key state in `RoleContext`: `memory` (message history), `working_memory` (per-task scratch), `msg_buffer` (async receive queue), `watch` (subscription set), `react_mode` (BY_ORDER, REACT, or PLAN_AND_ACT).

**Action** (`metagpt/actions/action.py`): An executable LLM-powered operation. `ActionNode` (`metagpt/actions/action_node.py`) adds structured output via Pydantic schemas — the `WRITE_PRD_NODE` in `metagpt/actions/write_prd_an.py` defines 15+ typed child nodes (user stories, competitive analysis, API endpoints, Mermaid diagrams) filled in a single LLM call with schema validation.

**Environment** (`metagpt/environment/base_env.py`): The pub-sub bus. Holds all roles, their subscription addresses, and a shared history for debugging. `env.run()` fires `asyncio.gather` on all non-idle roles, enabling parallel execution within a coordination round.

**Team** (`metagpt/team.py`): Top-level container. Manages budget via `CostManager`, runs the main loop until all roles are idle or budget is exhausted. Default `n_round=3` bounds total rounds.

### The Software Company Pipeline

The default fixed-SOP pipeline in concrete terms:

1. **ProductManager** (watches `UserRequirement`) → runs `PrepareDocuments` then `WritePRD` → saves structured JSON PRD to `docs/prd/`
2. **Architect** (watches `WritePRD`) → runs `WriteDesign` with data structures, API interfaces, Mermaid sequence diagrams → saves to `docs/system_design/`
3. **ProjectManager** (watches `WriteDesign`) → runs `WriteTasks`, decomposes to ordered file list with dependencies → saves to `docs/task/`
4. **Engineer** (watches `WriteTasks`, `SummarizeCode`) → iterates through task list running `WriteCode` per file, then `SummarizeCode` for consistency review; loops back via `MESSAGE_ROUTE_TO_SELF` if issues found
5. **QaEngineer** (watches `SummarizeCode`) → `WriteTest` → `RunCode` → `DebugError` → routes failures back to Engineer

All roles disable memory (`enable_memory = False`) and use the `ProjectRepo` filesystem as shared persistent state.

### Message Routing

`Message` (`metagpt/schema.py`) carries: `cause_by` (producing action class), `sent_from` (producing role), `send_to` (recipients, defaults to `MESSAGE_ROUTE_TO_ALL`), `instruct_content` (typed Pydantic payload for structured inter-role communication), and `metadata` (extensible key-value store).

### Three Execution Modes

**BY_ORDER**: Sequential through action list. Used by ProductManager (PrepareDocuments → WritePRD).

**REACT**: LLM picks the next action by outputting a number selecting from the `states` list. Up to `max_react_loop` iterations. The LLM must output just an integer — noisy outputs default to state -1, terminating the role prematurely.

**PLAN_AND_ACT**: Creates a `Plan` (DAG of `Task` objects) via `Planner`, executes tasks with review/confirmation cycles, adapts to failures by re-planning remaining tasks.

### RoleZero: Dynamic Tool Use

`RoleZero` (`metagpt/roles/di/role_zero.py`) extends `Role` with dynamic tool selection. Rather than choosing from a fixed action list, it uses `BM25ToolRecommender` to select tools from a registry based on current context, generates JSON command arrays (e.g., `[{"command_name": "Editor.open_file", "args": {...}}]`), and executes them via `tool_execution_map`. Default `max_react_loop=50`. Built-in tools: `Editor`, `Browser` (Playwright), `Terminal`, `git_create_pull`, and more.

### Self-Improvement Extensions

**AFlow** (`metagpt/ext/aflow/`) automatically optimizes agentic workflows through iterative graph modification and evaluation. Accepted as an oral at ICLR 2025 (top 1.8%), ranked #2 in the LLM-based Agent category. Evaluates on GSM8K, HotPotQA, HumanEval, MBPP, MATH, DROP.

**SPO** (`metagpt/ext/spo/`) runs tournament-style prompt optimization: execute both old and new prompts on test questions, compare pairwise via LLM judge with randomized ordering, keep the winner.

**Experience caching**: `@exp_cache` decorator on `llm_cached_aask` stores (request, response) pairs in a ChromaDB-backed vector store. `RoleZero` retrieves similar past solutions as few-shot context. A `SimplePerfectJudge` decides if a cached response qualifies as "perfect" and can be returned without an LLM call.

## Key Numbers

- **66,769 stars, 8,453 forks** as of April 2025 — community size is real; quality is harder to assess
- **~$0.2** GPT-4 cost per analysis/design example, **~$2.0** per complete project — self-reported in README, no automated benchmark suite in the codebase validates these numbers
- **AFlow ICLR 2025 oral acceptance** — independently validated academic result, though it benchmarks workflow optimization on academic datasets, not MetaGPT's software generation quality specifically
- No public comparison of MetaGPT's multi-agent pipeline output against ChatDev, [AutoGen](../projects/autogen.md), or [CrewAI](../projects/crewai.md) on standardized software generation tasks

## Strengths

**Composable SOP encoding**: The `_watch()` mechanism is a minimal, clean alternative to explicit DAG definitions. Adding roles without touching existing code is architecturally elegant and practically useful.

**Structured inter-role communication**: `instruct_content` with Pydantic models avoids the lossy natural-language-only message passing of simpler frameworks. Type-safe payloads between roles reduce parsing failures.

**Filesystem as shared state**: `ProjectRepo` provides a natural coordination primitive — roles read/write to known paths rather than passing large payloads through messages. Enables recovery and checkpointing.

**Serialization and recovery**: `Team.serialize()`/`Team.deserialize()` with `@serialize_decorator` auto-saves state after each round. `recovered = True` with `latest_observed_msg` enables mid-pipeline recovery after crashes, not just restart from scratch.

**Cost as coordination signal**: `NoMoneyException` from `CostManager` provides hard budget enforcement across an entire team. Prevents runaway API costs in multi-agent runs.

**Broad LLM provider support**: 15+ providers through `metagpt/provider/`, per-role `LLMConfig`, YAML-based configuration.

## Critical Limitations

**Message loss with no notification**: If no role's `member_addrs` matches a message's routing, `Environment.publish_message()` logs a warning but silently drops the message. In dynamic pipelines or with novel role compositions, tasks vanish without error.

**Round-bounded execution**: The default `n_round=3` caps coordination cycles. Complex software generation may require more than three passes through the PM → Architect → Engineer → QA loop. If rounds expire mid-pipeline, partial artifacts are produced without any signal to the user that work is incomplete.

**Infrastructure assumption — synchronous filesystem access**: `ProjectRepo` assumes all roles share a local filesystem. Deploying MetaGPT across distributed machines or containerized roles requires implementing a shared filesystem or replacing `ProjectRepo` entirely. The documentation does not mention this.

## Concrete Failure Mode

The `Plan._topological_sort()` method contains a documented bug: "FIXME: if LLM generates cyclic tasks, this will result in infinite recursion." When the TeamLeader or Planner asks an LLM to generate a task dependency graph and the LLM produces a cycle, the system hangs. No cycle detection exists in the current codebase. [Source](../raw/deep/repos/foundationagents-metagpt.md)

## When NOT to Use MetaGPT

**Single-agent tasks with clear scope**: MetaGPT's coordination overhead — multiple LLM calls for PRD, design, task decomposition, and code review before a line of code is written — adds significant latency and cost for simple scripts or well-defined functions. A single-role `DataInterpreter` or a tool-augmented agent like [Claude Code](../projects/claude-code.md) will be faster and cheaper.

**Tasks requiring dynamic agent count**: MetaGPT's Team is assembled before the run. You cannot spawn additional agents mid-execution based on task complexity. Systems like [AutoGen](../projects/autogen.md) or [LangGraph](../projects/langgraph.md) handle dynamic team composition better.

**When sequential coordination is suboptimal**: A large-scale coordination study found that protocol choice drives 3x more quality variation than model selection, and that rigid pre-assigned role hierarchies underperform emergent specialization in capable models. MetaGPT's fixed SOP mode is exactly the pre-assigned hierarchy that study found suboptimal for complex tasks. [Source](../raw/tweets/godofprompt-breaking-mipt-just-ran-the-largest-ai-agent-co.md)

**Production environments requiring audit trails**: MetaGPT provides no structured logging of inter-agent message flows beyond the shared `Memory` list. Tracing why a specific design decision was made requires manually reconstructing the `cause_by` chain across multiple roles' memories. [Observability](../concepts/observability.md) is an afterthought.

## Unresolved Questions

**MGX commercial relationship**: MGX (mgx.dev) is a commercial product built on MetaGPT. The README promotes it. The relationship between the open-source framework and the commercial product — data sharing, prompt differences, which capabilities are gated — is not documented.

**TeamLeader prompt versioning**: The TeamLeader prompt (`metagpt/prompts/di/team_leader.py`) contains extensive hardcoded routing rules and t-shirt sizing logic. How these rules are maintained, tested, or versioned as the framework evolves is unclear. A prompt change can silently break routing for entire task categories.

**Conflict resolution for concurrent file writes**: Engineer and QaEngineer can both be active and writing to the project repository in the same coordination round. `ProjectRepo` provides file-level operations but no locking or conflict detection. The documentation does not address this.

**Scale cost model**: The README claims ~$2.00 per project at GPT-4 pricing. This was written before GPT-4 Turbo and o-series models changed pricing significantly. No updated cost analysis exists for current model pricing or for using local models via Ollama.

## Alternatives

**[AutoGen](../projects/autogen.md)**: Use when you need dynamic conversation patterns between agents, flexible group chat orchestration, or integration with existing agent runtimes. MetaGPT's fixed pipelines are more predictable; AutoGen is more flexible.

**[CrewAI](../projects/crewai.md)**: Use when you want role-based multi-agent coordination with a simpler API and tighter integration with tool use. CrewAI lacks MetaGPT's structured output layer and experience caching but has cleaner onboarding.

**[LangGraph](../projects/langgraph.md)**: Use when you need explicit state machines with human-in-the-loop checkpoints, custom branching logic, or fine-grained control over agent coordination. MetaGPT's pub-sub topology is less inspectable than LangGraph's explicit graph.

**[Claude Code](../projects/claude-code.md)**: Use for software generation tasks where a single capable agent with filesystem access and tool use outperforms multi-agent coordination overhead. For well-scoped coding tasks, the coordination cost of MetaGPT's SOP pipeline rarely pays off.

**[DSPy](../projects/dspy.md)**: Use when the goal is prompt optimization and structured LLM pipelines rather than multi-agent coordination. DSPy's compiled prompts are more reproducible than MetaGPT's SOP-encoded workflows.

## Related Concepts

- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — the broader coordination paradigm MetaGPT instantiates
- [ReAct](../concepts/react.md) — the observe-think-act loop that MetaGPT's `_observe → _think → _act` implements
- [Agent Memory](../concepts/agent-memory.md) — MetaGPT's append-only `Memory` class with no eviction is a minimal implementation
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — MetaGPT supports `AskReview` in PLAN_AND_ACT mode and `ask_human` fallback in RoleZero
- [Self-Improving Agents](../concepts/self-improving-agents.md) — AFlow and SPO extensions implement meta-level self-improvement
- [Context Engineering](../concepts/context-engineering.md) — each ActionNode's `instruction` field, experience retrieval injection, and `ProjectRepo` context assembly are all forms of context engineering for structured LLM outputs

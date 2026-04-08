---
entity_id: metagpt
type: project
bucket: multi-agent-systems
abstract: >-
  MetaGPT encodes software engineering SOPs as pub-sub message routing between
  LLM agents (PM, Architect, Engineer, QA), generating full codebases from a
  single natural language prompt.
sources:
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/foundationagents-metagpt.md
  - repos/foundationagents-metagpt.md
  - tweets/godofprompt-breaking-mipt-just-ran-the-largest-ai-agent-co.md
related: []
last_compiled: '2026-04-08T23:08:42.429Z'
---
# MetaGPT

## What It Does

MetaGPT converts a one-line requirement into a working software project by routing tasks through a team of specialized LLM agents: ProductManager, Architect, ProjectManager, Engineer, and QaEngineer. The central philosophy is `Code = SOP(Team)` — standard operating procedures are encoded directly into the coordination structure rather than written as explicit orchestration code.

The architectural differentiator is that no orchestrator directs traffic. Instead, each role subscribes to the output types of upstream roles via `_watch()`. When ProductManager finishes `WritePRD`, the resulting message carries `cause_by="WritePRD"`, and Architect picks it up because it registered `self._watch([WritePRD])`. Adding a new role to a pipeline requires only declaring what it watches — zero changes to existing code.

This competes directly with [AutoGen](../projects/autogen.md), [CrewAI](../projects/crewai.md), and [LangGraph](../projects/langgraph.md), each taking a different stance on how much coordination logic lives in the framework versus the agents.

**67K GitHub stars, MIT licensed, Python 3.9–3.11.**

---

## Core Architecture

Four abstractions compose the entire system:

**Role** (`metagpt/roles/role.py`): Base agent class with a `RoleContext` containing `memory` (all processed messages), `working_memory` (per-task scratch space), `msg_buffer` (async receive queue), `watch` (subscribed action types), and `react_mode` (BY_ORDER, REACT, or PLAN_AND_ACT). Fixed-SOP roles set `enable_memory = False` to avoid stale cross-project context, using the filesystem as shared state instead.

**Action** (`metagpt/actions/action.py`): An executable unit, LLM-powered by default. `ActionNode` (`metagpt/actions/action_node.py`) provides structured output via Pydantic schemas — `WRITE_PRD_NODE` defines 15+ typed child nodes (user stories, competitive analysis, Mermaid diagrams, API endpoints) filled in a single LLM call with format enforcement and retry logic. `ActionGraph` allows dependency DAGs between ActionNodes within a single role.

**Environment** (`metagpt/environment/base_env.py`): A pub-sub bus holding all roles, routing messages via `publish_message()`. For each registered role, it checks `is_send_to(message, addrs)` and pushes matching messages into the role's private `msg_buffer`. `Environment.run()` fires `asyncio.gather` across all non-idle roles, enabling parallel execution within a coordination round.

**Team** (`metagpt/team.py`): The top-level container. Owns the environment, tracks API budget via `CostManager`, and runs the main loop: call `env.run()` until all roles are idle or `NoMoneyException` fires. Default `n_round=3` bounds total rounds.

### The Role Execution Loop

Each role's `run()` follows three phases:

1. **`_observe()`**: Pops messages from `msg_buffer`, filters by `cause_by in self.rc.watch`, adds to `self.rc.memory`. Returns zero if nothing relevant arrived — role stays idle.

2. **`_think()`**: Selects the next action. BY_ORDER advances `self.rc.state` sequentially. REACT asks the LLM to output a number selecting from `states` list, parsed by `extract_state_value_from_output()`. PLAN_AND_ACT runs the Planner to generate a task DAG, then executes tasks with review cycles.

3. **`_act()`**: Runs `self.rc.todo.run(self.rc.history)`, wraps output in a `Message`, returns it. The caller broadcasts via `publish_message()`.

### The Default Software Pipeline

In fixed-SOP mode:

1. **ProductManager** watches `UserRequirement` → runs `PrepareDocuments` (initializes git repo) then `WritePRD` → structured JSON saved to `docs/prd/`
2. **Architect** watches `WritePRD` → runs `WriteDesign` → system design with Mermaid sequence diagrams saved to `docs/system_design/`
3. **ProjectManager** watches `WriteDesign` → runs `WriteTasks` → ordered file implementation list saved to `docs/task/`
4. **Engineer** watches `WriteTasks` → creates `WriteCode` actions per file, then `SummarizeCode` for consistency review; loops via `MESSAGE_ROUTE_TO_SELF` if issues found
5. **QaEngineer** watches `SummarizeCode` → writes tests via `WriteTest`, executes via `RunCode`, debugs via `DebugError`

### The MGX Evolution

The codebase maintains two coordination modes. The original fixed-SOP mode uses the hardcoded pipeline above. The newer MGX mode (`metagpt/environment/mgx/mgx_env.py`) introduces a **TeamLeader** agent that dynamically routes tasks. In MGX, every message passes through the TeamLeader first — it reads complexity (XS/S/M/L), decomposes work, and delegates via `publish_team_message(content, send_to)`. This trades the zero-central-coordinator elegance for explicit routing control, and introduces a single point of failure: if the TeamLeader misroutes, the pipeline stalls.

### RoleZero: Dynamic Tool Use

`RoleZero` (`metagpt/roles/di/role_zero.py`) extends `Role` with dynamic tool selection. Rather than choosing from a fixed action list, RoleZero generates JSON command arrays the LLM outputs like `[{"command_name": "Editor.open_file", "args": {"path": "..."}}]` executed via `tool_execution_map`. The `BM25ToolRecommender` selects relevant tools per step. `max_react_loop=50` bounds iterations. Optional Chroma-backed `RoleZeroLongTermMemory` transfers old messages to vector storage when short-term capacity (`memory_k=200`) is exceeded.

---

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| GitHub stars | ~67K | Verified |
| API cost per project | ~$2.00 (GPT-4) | Self-reported in README |
| AFlow ICLR 2025 ranking | Top 1.8%, oral, #2 in LLM Agent category | Paper acceptance verified |
| Supported LLM providers | 15+ | Verified from `metagpt/provider/` |

The $2.00 cost figure is not reproduced by any benchmark in the test suite — `CostManager` tracks tokens per run, but no automated cost benchmark exists. Treat it as a rough order of magnitude.

---

## Strengths

**Composable coordination without an orchestrator.** The `_watch()` subscription model means the SOP is structural, not procedural. You can audit the full pipeline by reading which action types each role watches — no hidden routing logic in a central dispatcher.

**Typed inter-role communication.** `Message.instruct_content` carries Pydantic models between roles (`WritePRDOutput`, `WriteDesignOutput`), avoiding lossy string passing. `ActionNode` enforces schema at generation time with retry logic via tenacity.

**Shared filesystem as durable state.** `ProjectRepo` gives all roles a structured, recoverable artifact store. Roles coordinate by reading known file paths rather than passing large payloads through messages. Combined with `Team.serialize()` checkpointing, this enables mid-pipeline crash recovery.

**Budget as coordination primitive.** `CostManager` with `max_budget` and `NoMoneyException` provides hard cost limits across the entire agent team — transferable to any multi-agent system running against paid APIs.

**Multi-environment support.** Beyond software generation, MetaGPT ships Stanford-Town, Werewolf, Android, and Minecraft environments, each using the same Role/Action/Environment primitives with gymnasium-compatible interfaces.

---

## Critical Limitations

**Silent message loss.** If no role's `member_addrs` matches a message's routing target, `Environment.publish_message` logs a warning and drops the message. In novel role compositions or MGX with TeamLeader routing errors, tasks vanish with no exception or retry.

**Round-bounded execution.** The default `n_round=3` means complex projects that need more than three coordination rounds — a common case when QA finds bugs requiring re-implementation — simply stop. Partial artifacts remain in `ProjectRepo` without indication that work is incomplete. Users must manually tune `n_round` per project, and there is no adaptive bound.

**Unspoken infrastructure assumption.** MetaGPT assumes a writable local filesystem for `ProjectRepo`. Cloud deployments, containerized environments with read-only filesystems, or any setup where the working directory is not writable will fail silently or raise unhandled IO errors. The framework has no abstraction layer for remote or object-store-backed repositories.

---

## When NOT to Use It

**Short-lived or simple tasks.** The five-role pipeline adds 3–5 LLM calls before the first line of code is generated. For tasks solvable in a single well-prompted call, MetaGPT's SOP overhead produces worse latency and higher cost with no quality benefit.

**Weak model backends.** The MIPT coordination study cited in source material shows that self-organizing agent systems require models with strong self-reflection, multi-step reasoning, and instruction following. MetaGPT's dynamic modes (RoleZero, PLAN_AND_ACT) will degrade with models below Claude/GPT-4 tier — and REACT mode's LLM-driven state selection becomes unreliable. Fixed-SOP mode is more robust to weaker models but inflexible.

**Concurrent multi-project workloads.** The `Context` object and `CostManager` are team-scoped singletons. Running multiple projects in the same process requires separate `Team` instances, and there is no built-in isolation of `ProjectRepo` paths. Cross-contamination of artifacts is possible if paths are not carefully managed.

**Production services requiring auditability.** The implicit SOP graph encoded in `_watch()` subscriptions is hard to inspect programmatically. There is no graph export, no structured trace of which role produced which artifact, and no built-in observability hooks. Debugging a failed pipeline requires manually tracing `cause_by` chains across role memories.

---

## Unresolved Questions

**Conflict resolution for shared state.** When Engineer and QaEngineer both write to `ProjectRepo` during the same round, there is no file locking. Engineer serializes writes internally via `code_todos`, but cross-role conflicts are silently overwritten.

**Cyclic task dependency detection.** `Plan._topological_sort()` contains a documented `FIXME`: if the LLM generates circular task dependencies, the sort infinite-loops. No cycle detection exists.

**Experience pool governance.** `RoleZeroLongTermMemory` accumulates (request, response) pairs in ChromaDB indefinitely. There is no eviction policy, TTL, or quality threshold for stored experiences beyond `SimplePerfectJudge`. At scale, retrieval quality degrades as the pool fills with stale or low-quality examples.

**Scaling beyond the default team.** The MGX TeamLeader prompt contains hardcoded t-shirt sizing logic and role routing rules. How this prompt evolves as teams grow — and who maintains it — is not documented. The `max_react_loop=3` on the TeamLeader is a tight bound for complex delegation decisions.

**Cost at scale.** The README's $2.00 estimate has no variance information, no breakdown by role, and no comparison across model providers. There is no tooling to predict cost before running a project.

---

## Alternatives

| Project | Choose when |
|---------|-------------|
| [AutoGen](../projects/autogen.md) | You need flexible conversation patterns between agents, not a fixed engineering pipeline, and want Microsoft ecosystem integration |
| [CrewAI](../projects/crewai.md) | You want explicit role assignment with simpler configuration and don't need MetaGPT's SOP formalism |
| [LangGraph](../projects/langgraph.md) | You need explicit graph-based workflow control with fine-grained state management and human-in-the-loop checkpoints |
| [Claude Code](../projects/claude-code.md) / [Cursor](../projects/cursor.md) | Your task is code editing within an existing codebase rather than greenfield generation |
| Single-agent with [ReAct](../concepts/react.md) | Your task is simple enough for one model; skip the coordination overhead entirely |

MetaGPT fits best when the output is a new software project from scratch, the task complexity justifies PM/Architect/Engineer specialization, and you're willing to accept higher latency and cost for structured artifact generation.

---

## Related Concepts

- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — the broader coordination paradigm MetaGPT implements
- [Agent Memory](../concepts/agent-memory.md) — MetaGPT's append-only `Memory` class and `RoleZeroLongTermMemory`
- [Context Engineering](../concepts/context-engineering.md) — how MetaGPT assembles role-specific context from project artifacts
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — ActionNode's `ReviewMode.HUMAN` and Planner's `AskReview`
- [Cognitive Architecture](../concepts/cognitive-architecture.md) — Role/Action/Environment as a cognitive architecture instantiation

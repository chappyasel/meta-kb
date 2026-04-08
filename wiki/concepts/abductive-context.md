---
entity_id: abductive-context
type: concept
bucket: context-engineering
abstract: >-
  Context generation dynamically constructs agent-readable context from
  execution traces and domain knowledge, distinct from static retrieval by
  producing structured, task-relevant information through multi-stage pipelines
  rather than similarity-scored document chunks.
sources:
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/thedotmack-claude-mem.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - repos/greyhaven-ai-autocontext.md
  - repos/memodb-io-acontext.md
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
related:
  - openai
  - openclaw
  - anthropic
  - claude
  - claude-code
last_compiled: '2026-04-08T23:23:53.380Z'
---
# Context Generation

## What It Is

Context generation is the process by which an agent system dynamically constructs the information it needs to act, rather than starting from a blank slate or relying on static prompts. The distinction from [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is architectural: RAG retrieves documents scored by semantic similarity; context generation produces structured artifacts by running inference pipelines over execution history, task state, and domain knowledge.

Two implementation families exist. Autocontext systems build context from within the agent loop during execution, inferring what the agent needs as tasks unfold. Acontext systems run as post-execution pipelines, consuming completed execution traces and distilling them into reusable skill files that inform future runs.

The shared goal is the same: fill the context window with information that was earned through prior work rather than manually authored or blindly retrieved.

## Why It Matters

Agents that start cold on every run cannot compound their experience. Each execution is independent: same mistakes, same retrieval latency, same frontier-model costs. Context generation closes this loop.

[Claude Code](../projects/claude-code.md) sessions that use tools like claude-mem accumulate structured observations across sessions. [OpenClaw](../projects/openclaw.md) sessions that integrate Acontext build skill files from completed tasks. [Autocontext](../projects/openclaw.md) harnesses encode validated lessons in playbooks that persist across generations. In each case, the agent begins subsequent work with a richer starting position than it had before.

The practical consequence: agents make fewer repeated errors, require fewer correction cycles, and over time can shift work from expensive frontier models to cheaper local ones trained on distilled patterns.

## How It Works

### Stage 1: Capturing Raw Material

Every context generation system begins with observation capture. The raw material varies:

- **Tool invocations** (claude-mem): Every PostToolUse hook fires when Claude Code uses Read, Edit, Bash, or any other tool. The hook POSTs the raw tool name, input, and response to a background worker service on port 37777. At high activity rates, sessions accumulate 100+ observations.

- **Session messages** (Acontext): Conversation turns, tool calls, and task outcomes flow into the session store. The Task Agent analyzes the message stream to identify task boundaries and link message ranges to tasks.

- **Scenario execution results** (Autocontext): Each generation produces tournament match results or LLM judge scores. The `GenerationRunner` in `loop/generation_runner.py` captures the full score trajectory alongside raw outputs.

The capture layer must be low-latency and non-blocking. Claude-mem's save-hook catches errors silently and returns success codes to avoid interrupting tool use. Autocontext's execution supervisors operate independently of the agent's primary task loop.

### Stage 2: Distillation

Raw observations are not useful as context directly. A Bash command that returns 400 lines of build output needs to become "the webpack build fails when NODE_ENV is missing from the Docker environment." This compression step is where the different systems diverge most.

**Claude-mem** routes each tool invocation through a secondary Claude SDK agent that produces structured XML:

```xml
<observation>
  <type>discovery</type>
  <title>webpack build fails without NODE_ENV</title>
  <facts>
    <fact>docker-compose.yml missing NODE_ENV in env section</fact>
  </facts>
  <narrative>Build failed because webpack expects NODE_ENV at compile time</narrative>
  <concepts><concept>build-configuration</concept></concepts>
  <files_modified><file>docker-compose.yml</file></files_modified>
</observation>
```

The `parseObservations()` function in `src/sdk/parser.ts` extracts these blocks. The system's explicit design principle: always save observations, even with partial fields. Missing data is better than lost data.

**Acontext** runs a structured LLM-as-judge classification through `llm/prompt/skill_distillation.py`. Completed tasks route to one of four outcomes:

- `skip_learning` — trivial, not worth recording
- `report_success_analysis` — extracts approach, key decisions, generalizable pattern, and an `applies_when` scope
- `report_failure_analysis` — extracts failure point, flawed reasoning, and prevention principle
- `report_factual_content` — extracts third-person factual statements

The `applies_when` field does critical work: it scopes a lesson to specific conditions (this API, this environment, this tool version) rather than letting it over-generalize. A lesson learned about a specific payment provider's retry behavior should not contaminate knowledge about database retry patterns.

**Autocontext** runs five specialized agents in sequence after each generation. The Analyst diagnoses what happened and why. The Coach synthesizes lessons into playbook updates delimited by `<!-- PLAYBOOK_START/END -->` and `<!-- LESSONS_START/END -->` markers. The Curator quality-gates the proposed changes before they persist. This multi-agent structure keeps each distillation task narrow: the Analyst does not propose fixes; the Coach does not diagnose root causes.

### Stage 3: Structuring for Reuse

Distilled observations must be organized for future retrieval. The approaches are architecturally distinct:

**Claude-mem** writes to SQLite with FTS5 virtual tables. Observations carry typed concepts and file paths. The Session Summary at Stop time adds a higher-level narrative (what was requested, learned, completed, what remains). The database at `~/.claude-mem/claude-mem.db` accumulates across all sessions.

**Acontext** writes Markdown files organized by skill domain. Each skill has a `SKILL.md` manifest (YAML frontmatter plus guidelines) and data files for SOPs, failure warnings, and facts. The `create_skill` tool creates broad domain skills (`api-error-handling`, not `fix-401-bug`), preventing skill proliferation while keeping structure within skills. Encryption support allows client-side KEK to protect skill content at rest in S3.

**Autocontext** persists to both SQLite (`storage/` with 15 migration files for schema evolution) and the filesystem (playbooks, tools, snapshots). Playbooks are versioned with rollback capability controlled by `AUTOCONTEXT_PLAYBOOK_MAX_VERSIONS`. The Architect generates executable tool code that persists to `knowledge/<scenario>/tools/`, allowing the system to not just learn lessons but build new capabilities.

### Stage 4: Injection at Context Time

Stored knowledge must re-enter the context window when relevant.

**Claude-mem** injects at SessionStart via the context hook. `ContextBuilder.ts` queries the last 10 sessions from SQLite, computes token economics (compression ratio, savings vs. raw), and renders a timeline. The output can be terminal-formatted or written to a `CLAUDE.md` file that Claude Code reads natively. The `TokenCalculator` uses a 4-character-per-token estimate and respects configurable observation count budgets.

**Acontext** uses progressive disclosure: agents call `list_skills` to see what exists, `get_skill` to list files within a skill, and `get_skill_file` to read specific content. No embedding search, no semantic similarity scoring. The agent reasons about what it needs and fetches it explicitly. This approach is deterministic and debuggable but depends on the agent's reasoning quality to discover relevant skills.

**Autocontext** injects the full score trajectory and accumulated playbook into every agent prompt at the start of each generation. The `ScoreTrajectoryBuilder` assembles quantified history that agents can reason about directly. The context is not retrieved from a store — it is assembled from structured knowledge files and injected wholesale.

## Architectural Variants

### Hook-Based Live Capture (claude-mem)

The deepest integration model. Every tool invocation triggers a background LLM compression call through a persistent worker. The agent generates context for itself in real-time without any explicit memory management step.

Strengths: seamless, no agent behavior changes required, captures granular tool-level observations.
Limitations: adds LLM API cost per tool invocation, requires a persistent background process, fails silently when the worker is unavailable.

### Post-Execution Skill Learning (Acontext)

A pipeline that runs after task completion rather than during execution. Sessions complete, tasks reach terminal states, and then the learning pipeline triggers asynchronously.

Strengths: clean separation between execution and learning, structured skill files are human-inspectable and editable, portable across frameworks.
Limitations: no real-time context, requires infrastructure (PostgreSQL, Redis, RabbitMQ, S3), skills require explicit agent tool calls to retrieve.

### Multi-Agent Improvement Harness (Autocontext)

The most architecturally ambitious approach. Multiple specialized agents evaluate each generation's outputs and update structured knowledge artifacts that feed subsequent generations.

Strengths: sophisticated credit assignment, playbook versioning with rollback, supports frontier-to-local distillation.
Limitations: 5x LLM calls per generation, complex configuration surface, expensive at scale.

## Relationship to Adjacent Concepts

Context generation sits at the intersection of several related ideas:

[Context Management](../concepts/context-management.md) governs what fits in the window and what gets pruned. Context generation is upstream: it determines what earned a place in the window in the first place.

[Context Compression](../concepts/context-compression.md) reduces token count for existing content. Context generation produces that content through structured distillation from raw observations.

[Episodic Memory](../concepts/episodic-memory.md) stores specific past events. Context generation transforms episodic records into semantic lessons (SOPs, warnings, facts) that generalize beyond the specific event.

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) retrieves documents from a knowledge base. Context generation produces structured knowledge from execution traces rather than pre-existing documents. The two are complementary: Acontext's skill files could be fed into a RAG system; Autocontext's playbooks are human-readable documents that could also be retrieved.

[Procedural Memory](../concepts/procedural-memory.md) encodes how to do things. The SOP format in Acontext and the playbook format in Autocontext are procedural memory implementations.

[Progressive Disclosure](../concepts/progressive-disclosure.md) is the retrieval model Acontext uses: agents fetch skill content on demand rather than receiving it all upfront. Claude-mem's MCP server uses the same pattern (index → timeline → details) to achieve claimed 10x token savings vs. returning full observation details immediately.

## Concrete Failure Modes

**Distillation misclassification.** When Acontext's LLM judge misclassifies a failure as a success, the Skill Learner writes a misleading SOP. There is no human review gate before skills are written. A deployment failure that happens to complete successfully at the last step might be recorded as a best practice rather than a warning.

**Knowledge accumulation without pruning.** Claude-mem has no mechanism for marking old observations as stale. A project from six months ago accumulates observations about a deprecated API. Those observations appear in future session context because the query is chronological, not relevance-filtered. Acontext's skill files also lack staleness detection beyond manual edits.

**Background worker dependency.** Claude-mem's observation capture fails silently when the worker at port 37777 is unavailable. Sessions continue normally; observations are simply not stored. Users have no indication that memory gaps are accumulating until they notice the context injection is missing historical sessions.

**Agent reasoning required for retrieval.** Acontext's progressive disclosure model requires the agent to know to call `list_skills` and navigate to relevant skill files. A poorly reasoning agent may not discover skills that would have been useful, or may load irrelevant ones. Unlike semantic search, there is no fallback for agents that fail to reason about what skills exist.

**Credit misattribution in multi-component changes.** Autocontext's component sensitivity profiling correlates changes with score improvements but cannot establish causation. When a generation changes both the playbook and adds a new tool, the system may attribute the improvement to whichever component changed more visibly rather than the one that actually drove the result.

**Curator conservatism.** Autocontext's Curator agent can reject valid lessons if they seem contradictory or low-confidence. Over many generations with an overly conservative curator, the playbook fails to accumulate the lessons that would reduce repeated errors. The consolidation cap at `AUTOCONTEXT_SKILL_MAX_LESSONS` may discard useful older lessons via recency rather than quality.

## When NOT to Use Context Generation

**Single-run or low-frequency workloads.** The value of context generation is compound: each run improves future runs. For one-off tasks or workloads that run infrequently on different problems, the infrastructure cost and LLM overhead of observation capture and distillation produces no return.

**Latency-sensitive pipelines.** Hook-based capture (claude-mem) adds background LLM calls per tool invocation. Multi-agent distillation (Autocontext) adds five-agent coordination per generation. For pipelines where response latency matters more than cross-session learning, this overhead is the wrong tradeoff.

**Teams without infrastructure capacity.** Acontext's self-hosted deployment requires PostgreSQL, Redis, RabbitMQ, and S3-compatible storage. Autocontext requires SQLite plus filesystem management plus optional CUDA/MLX training infrastructure. Simple [Agent Memory](../concepts/agent-memory.md) approaches using a single vector store or even flat files may be more appropriate for teams without operational capacity to run distributed infrastructure.

**Tasks where generated context may mislead.** Domains with rapidly changing ground truth (security vulnerabilities, API behaviors, regulatory requirements) can accumulate context that was accurate when generated but is now wrong. Without active staleness detection, agents may confidently act on outdated lessons.

## Unresolved Questions

**Cost attribution at production scale.** Neither Autocontext nor Acontext publish cost-per-run figures at production scale. Autocontext's five agents per generation plus judge evaluation creates compounding LLM costs. The "cost-aware loop control" and long-run presets in Autocontext acknowledge the problem but do not document actual per-generation costs at different provider tiers.

**Conflict resolution between contradictory lessons.** When two sessions learn contradictory lessons about the same domain — one records "always add retry logic to Stripe calls" and another records "retry logic caused duplicate charges with Stripe" — Acontext processes them sequentially without explicit conflict detection. The second lesson may override or coexist with the first depending on the Skill Learner's reasoning at the time. No documentation addresses how to detect or resolve this systematically.

**Governance for shared learning spaces.** Acontext's learning spaces can be shared across team members. When multiple agents or users contribute to the same skill library, there is no documented access control model for who can write to or delete skills. In Autocontext, the Curator gates knowledge quality but operates as an automated agent, not a human governance step.

**Distillation fidelity for complex multi-step reasoning.** Both systems compress multi-turn agent execution into structured lessons. For tasks that require understanding subtle reasoning chains — why a particular ordering of operations matters, why a seemingly reasonable approach failed due to timing — the distillation step may lose critical nuance. The structured entry formats (SOP, warning, fact) impose a schema on experiences that may not fit cleanly.

## Implementations

**[Autocontext](../projects/openclaw.md)** (greyhaven-ai, 695 stars): Multi-agent harness with five-agent improvement loop, playbook versioning, credit assignment, Pareto optimization, and frontier-to-local distillation. Python control plane (`autocontext/`) with TypeScript operator surface (`ts/`). Best suited for teams running repeated scenarios that need compound improvement.

**[Acontext](../projects/openclaw.md)** (memodb-io, 3,264 stars): Three-stage learning pipeline producing portable Markdown skill files. Go API server plus Python AI core, full-stack infrastructure. Best suited for teams that want human-inspectable memory that is portable across frameworks and LLMs.

**Claude-mem** (thedotmack, 44,950 stars): Hook-based observation capture for Claude Code sessions specifically. Background worker with SQLite storage and optional ChromaDB vectors. Best suited for individual developers using Claude Code who want seamless cross-session memory without infrastructure.

**[Claude Code](../projects/claude-code.md)** natively reads `CLAUDE.md` files, which both claude-mem and Acontext can write to — creating a context generation pathway that uses the agent platform's own context ingestion rather than requiring a custom injection mechanism.

## Selection Guidance

Use claude-mem when you work primarily in Claude Code and want zero-configuration memory that captures tool-level observations automatically. The 44,950-star count reflects genuine product-market fit.

Use Acontext when your team builds agents across multiple frameworks (LangGraph, Claude SDK, Vercel AI SDK) and needs shared, portable skill libraries that non-technical stakeholders can inspect and edit.

Use Autocontext when you have specific scenarios that run repeatedly and you need systematic improvement with credit assignment, rollback capability, and eventual cost reduction through distillation.

For simpler requirements, a [Vector Database](../concepts/vector-database.md) with explicit [Semantic Search](../concepts/semantic-search.md) over session summaries, or a flat-file approach like [CLAUDE.md](../concepts/claude-md.md) with manually maintained knowledge, may deliver more value with less infrastructure complexity than any of these systems.


## Related

- [OpenAI](../projects/openai.md) — implements (0.4)
- [OpenClaw](../projects/openclaw.md) — implements (0.4)
- [Anthropic](../projects/anthropic.md) — implements (0.4)
- [Claude](../projects/claude.md) — implements (0.4)
- [Claude Code](../projects/claude-code.md) — implements (0.4)

---
url: 'https://github.com/memodb-io/Acontext'
type: repo
author: memodb-io
date: '2026-04-04'
tags:
  - agent-memory
  - agentic-skills
  - self-improving
  - context-engineering
  - skill-files
  - markdown-memory
  - progressive-disclosure
  - distillation-pipeline
  - learning-spaces
key_insight: >-
  Acontext implements a three-stage learning pipeline (Task Extraction -> Distillation
  -> Skill Agent) that transforms raw agent execution traces into structured,
  human-readable markdown skill files, with an LLM-as-judge distillation phase that
  classifies learnings into SOPs, failure warnings, or factual content -- making agent
  memory debuggable, editable, and portable rather than opaque vector embeddings.
stars: 3300
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - CLAUDE.md
    - src/server/core/acontext_core/llm/agent/skill_learner.py
    - src/server/core/acontext_core/llm/agent/task.py
    - src/server/core/acontext_core/llm/prompt/skill_learner.py
    - src/server/core/acontext_core/llm/prompt/skill_distillation.py
    - src/server/core/acontext_core/llm/prompt/task.py
    - src/server/core/acontext_core/llm/prompt/base.py
    - src/server/core/acontext_core/llm/tool/skill_learner_lib/ctx.py
    - src/server/core/acontext_core/llm/tool/skill_learner_lib/create_skill.py
    - src/server/core/acontext_core/llm/tool/skill_learner_lib/create_skill_file.py
    - src/server/core/acontext_core/llm/tool/skill_learner_lib/get_skill.py
    - src/server/core/acontext_core/llm/tool/skill_learner_lib/get_skill_file.py
    - src/server/core/acontext_core/llm/tool/skill_learner_lib/str_replace_skill_file.py
    - src/server/core/acontext_core/llm/tool/skill_learner_lib/mv_skill_file.py
    - src/server/core/acontext_core/llm/tool/skill_learner_lib/distill.py
    - src/server/core/acontext_core/llm/tool/task_lib/ctx.py
    - src/server/core/acontext_core/llm/tool/task_lib/insert.py
    - src/server/core/acontext_core/llm/tool/task_lib/update.py
    - src/server/core/acontext_core/llm/tool/task_lib/append.py
    - src/server/core/acontext_core/llm/tool/task_lib/progress.py
    - src/server/core/acontext_core/llm/tool/task_lib/submit_preference.py
    - src/server/core/acontext_core/llm/tool/task_lib/finish.py
    - src/server/core/acontext_core/llm/complete/openai_sdk.py
    - src/server/core/acontext_core/llm/complete/anthropic_sdk.py
    - src/server/core/acontext_core/infra/db.py
    - src/server/core/acontext_core/infra/async_mq.py
    - onboard/onboarding.py
    - onboard/onboarding_artifacts.py
    - docs/content/docs/(guides)/learn/quick.mdx
    - docs/content/docs/(guides)/engineering/agent_skills.mdx
  analyzed_at: '2026-04-04'
  original_source: repos/memodb-io-acontext.md
---

## Architecture Overview

Acontext is a skill-based memory layer for AI agents, implemented as a full-stack system with a Go API server, Python AI core, Next.js dashboards, and Python/TypeScript SDKs. The core innovation is treating agent memory as structured skill files (Markdown with YAML frontmatter) rather than opaque vector embeddings, enabling memory that is human-readable, editable, versionable, and portable across frameworks.

The system architecture is split across two main services connected by a message queue (RabbitMQ):

**API Layer (Go + Gin + GORM):** Handles HTTP requests, session management, project/organization CRUD, learning space management, and artifact (file) storage. Uses PostgreSQL for relational data, Redis for caching and locks, S3-compatible storage for artifacts, and OpenTelemetry for observability. Exposed via REST with Swagger documentation.

**Core Layer (Python + FastAPI + SQLAlchemy):** Contains all AI/LLM/agent logic. Implements the three-agent pipeline: Task Agent (extracts tasks from message streams), Distillation (classifies and structures learnings), and Skill Learner Agent (writes structured skill files). Uses pgvector for embeddings, and supports both OpenAI and Anthropic LLM backends.

**Infrastructure:** PostgreSQL (shared between API and Core via SQLAlchemy + GORM ORMs that must be kept in sync), Redis (distributed locks, queuing), RabbitMQ (async task dispatch between API and Core), S3 (artifact storage), and optional sandbox backends (Cloudflare Workers, E2B, Novita, AWS AgentCore).

The system supports both cloud-hosted (acontext.io) and self-hosted deployment (via Docker Compose with `acontext server up`). Helm charts are provided for Kubernetes deployment.

## Core Mechanism

### The Three-Stage Learning Pipeline

Acontext's central innovation is a structured pipeline that converts raw agent conversation into organized skill files:

**Stage 1: Task Extraction (Task Agent)**

The Task Agent (`llm/agent/task.py`) analyzes incoming session messages and manages task lifecycle. It is an autonomous LLM agent with tools for task CRUD:

- `insert_task`: Create new tasks from user requests. Tasks are defined as user requests, NOT agent execution steps -- a critical distinction enforced by the system prompt.
- `update_task`: Modify task descriptions when requirements change.
- `append_messages_to_task`: Link message ranges to tasks, auto-setting status to `running`.
- `append_task_progress`: Record milestone-level progress (1-3 entries per task, not per-step logs).
- `submit_user_preference`: Capture task-independent user preferences (always written in third-person).
- `report_thinking`: Required before any actions -- the agent must reason about task structure.

The task statuses are: `pending` -> `running` -> `success` | `failed`. When a task reaches a terminal state, it triggers Stage 2.

**Stage 2: Distillation**

The Distillation phase (`llm/prompt/skill_distillation.py` + `llm/tool/skill_learner_lib/distill.py`) is an LLM-as-judge step that classifies completed tasks into one of four categories:

1. **`skip_learning`**: Trivial tasks not worth recording (simple lookups, small talk, calculations). Requires a `reason` argument.
2. **`report_success_analysis`**: Multi-step procedures, debugging, or meaningful decisions. Extracts: `task_goal`, `approach`, `key_decisions`, `generalizable_pattern`, `applies_when`.
3. **`report_failure_analysis`**: Failed tasks. Extracts: `task_goal`, `failure_point`, `flawed_reasoning`, `what_should_have_been_done`, `prevention_principle`, `applies_when`.
4. **`report_factual_content`**: Information recording (people, preferences, entities). Extracts: `task_goal`, `facts` (list of third-person factual statements).

The `applies_when` field is critical -- it scopes the learning to specific conditions (website, tool, API, environment) to prevent over-generalization. The distillation output is structured text that feeds into Stage 3.

**Stage 3: Skill Learner Agent**

The Skill Learner Agent (`llm/agent/skill_learner.py`) receives pre-distilled context and decides how to organize it into skill files. It runs as an autonomous multi-turn LLM agent with tools for skill management:

- `get_skill`: List files in a skill
- `get_skill_file`: Read file content (always reads SKILL.md first)
- `create_skill`: Create a new skill with SKILL.md (YAML frontmatter + guidelines)
- `create_skill_file`: Add data files to a skill
- `str_replace_skill_file`: Edit files using exact string replacement (Claude Code Edit tool pattern)
- `mv_skill_file`: Rename or move files within a skill
- `report_thinking`: Required before any modifications (enforced -- handler returns error if not called)

The agent follows a strict decision tree: (1) Does an existing skill cover this domain? Update it. (2) Partial overlap? Broaden the existing skill. (3) Zero coverage? Create a new skill at the category level (e.g., `api-error-handling`, not `fix-401-bug`). (4) User preferences? Store in a dedicated user-facts skill.

### Skill File Structure

Skills are organized as collections of Markdown files with a mandatory `SKILL.md` that defines the skill's purpose, file structure, and guidelines:

```markdown
---
name: "api-error-handling"
description: "Patterns and SOPs for handling API errors"
---
# API Error Handling

[Purpose and scope]

## File Structure
[How files are organized]

## Guidelines
[Rules for recording entries]
```

Data files within skills use structured entry formats:

**Success (SOP):**
```
## [Title] (date: YYYY-MM-DD)
- Principle: [1-2 sentence strategy]
- When to Apply: [conditions/triggers]
- Steps: [numbered procedure]
```

**Failure (Warning):**
```
## [Title] (date: YYYY-MM-DD)
- Symptom: [what the failure looks like]
- Root Cause: [flawed assumption]
- Correct Approach: [what to do instead]
- Prevention: [general rule]
```

**User Preference (Fact):**
```
- [third-person factual statement] (date: YYYY-MM-DD)
```

### Learning Spaces

Learning spaces are containers that group skills together. Sessions are attached to learning spaces, and when tasks in those sessions complete, the learning pipeline triggers automatically. A learning space can contain multiple skills, and skills can be shared across learning spaces.

The `learn()` method on a learning space attaches a session and starts the learning pipeline. `wait_for_learning()` blocks until the pipeline completes. Skills can be listed, downloaded as ZIP, and mounted to sandboxes.

### Progressive Disclosure (Not Embedding Search)

Acontext explicitly rejects embedding-based retrieval. Instead, agents use tool calls to navigate skills:

1. `list_skills` -- see what skills exist in the learning space
2. `get_skill` -- list files within a skill
3. `get_skill_file` -- read specific file content

This progressive disclosure model means the agent decides what context it needs through reasoning, not through semantic similarity scoring. The SKILL.md file acts as a manifest that guides the agent to the right data files. This approach is deterministic, debuggable, and does not require embedding infrastructure.

### Multi-Turn Context Batching

The Skill Learner Agent handles multiple distilled contexts arriving during a single run. The `drain_skill_learn_pending()` function reads pending contexts from a Redis queue, and if new contexts arrive while the agent is working, they are injected as follow-up user messages. The agent completes its current work before processing new contexts. The `max_iterations` budget is dynamically extended when new contexts arrive (by `skill_learn_extra_iterations_per_context_batch`).

Redis distributed locks (`renew_redis_lock`) ensure only one Skill Learner Agent runs per learning space at a time, preventing concurrent writes to the same skill files.

### Encryption Support

Acontext supports client-side encryption for skill file content. The `user_kek` (Key Encryption Key) is passed through the pipeline to the `decode_content()` and `upload_and_build_artifact_meta()` functions. When encryption is enabled, file content is encrypted at rest in S3 and decrypted on read -- the LLM agents work with plaintext, but storage is encrypted.

## Design Tradeoffs

### Skill files over vector stores
The most fundamental design choice. Skills are human-readable Markdown, not vector embeddings. This means anyone can inspect what the agent has learned, edit incorrect learnings, and transfer skills across agents/frameworks by copying files. The tradeoff is that retrieval is not automatic -- agents must explicitly request skills via tool calls, which requires the agent to know (or discover) what skills exist. For large skill libraries, this could become cumbersome.

### LLM-heavy pipeline
Every stage uses LLM calls: Task Agent (1-3 calls per message batch), Distillation (1 call per completed task), Skill Learner (5+ calls per distilled context). For high-volume applications, this LLM cost compounds. The `skip_learning` classification helps by filtering trivial tasks, but the pipeline is inherently expensive compared to embedding-only approaches.

### Distillation as quality gate
The distillation phase acts as a quality gate -- it filters trivial tasks and structures valuable learnings before they reach the Skill Learner. This prevents noise accumulation in skill files. However, the quality depends on the distillation LLM's judgment. A poor distillation could either skip important learnings or let trivial content through.

### Third-person memory convention
All user facts are stored in third-person ("The user prefers X" not "I prefer X"). This is enforced in both the Task Agent and Skill Learner prompts. The reason: memories are read by different agents who would confuse "I" with themselves. This is a practical convention that other memory systems (Memori, Supermemory) do not enforce.

### Category-level skills over specific skills
The Skill Learner is instructed to create broad domain skills (`api-error-handling`) rather than narrow task-specific skills (`fix-401-bug`). This prevents skill proliferation but can lead to large, monolithic skill files that mix unrelated learnings. The system relies on SKILL.md guidelines and file organization to maintain structure within skills.

### Two-service architecture
Splitting API (Go) and Core (Python) creates deployment complexity (PostgreSQL must be shared, ORMs must be kept in sync, RabbitMQ connects them). But it separates concerns well: Go handles high-throughput HTTP/auth/CRUD while Python handles the LLM-heavy AI processing with its richer ML ecosystem.

## Failure Modes & Limitations

### Distillation quality bottleneck
If the distillation LLM misclassifies a failure as a success (or vice versa), the Skill Learner receives incorrect structured context and may write a misleading SOP or warning. There is no human-in-the-loop validation before skills are written.

### Skill file conflicts from concurrent sessions
Although Redis locks prevent concurrent Skill Learner runs per learning space, multiple sessions can generate distilled contexts simultaneously. If two sessions learn contradictory lessons about the same domain, the Skill Learner processes them sequentially, and the second context may override the first without explicit conflict resolution.

### No automatic skill pruning
Skills accumulate entries over time with no mechanism for removing outdated or superseded learnings. A skill about "deployment-operations" might contain entries from six months ago that reference deprecated tools. The `mv_skill_file` tool can reorganize but not prune.

### Progressive disclosure requires agent reasoning quality
Since retrieval is agent-driven (tool calls, not semantic search), the quality of context retrieval depends entirely on the agent's ability to identify which skills are relevant. A poorly reasoning agent might not discover relevant skills, or might load too many irrelevant skill files.

### Heavy infrastructure for self-hosting
Self-hosting requires PostgreSQL, Redis, RabbitMQ, S3-compatible storage, and an LLM API key. The Docker Compose setup simplifies this, but it is significantly heavier than file-based systems (Hipocampus) or thin SDK approaches (Memori, Supermemory).

### No temporal reasoning on skill entries
Skill entries carry dates (`date: YYYY-MM-DD`) but there is no mechanism for temporal reasoning -- no way to mark entries as superseded, no staleness detection, no automatic archival of old entries. The `applies_when` field provides contextual scoping but not temporal validity.

## Integration Patterns

### Claude Code Plugin
Acontext provides a Claude Code plugin (`src/packages/claude-code/`) that installs via the Claude plugin marketplace. It reads the SKILL.md from `acontext.io/SKILL.md` for setup instructions. The plugin provides skill tools to the agent, enabling learning from Claude Code sessions.

### OpenClaw Plugin
The `@acontext/openclaw` npm package (`src/packages/openclaw/`) integrates with OpenClaw's lifecycle. It hooks into session events to capture messages and trigger the learning pipeline automatically.

### Python SDK
```python
from acontext import AcontextClient
client = AcontextClient(api_key="sk-ac-...")
space = client.learning_spaces.create()
session = client.sessions.create()
client.learning_spaces.learn(space.id, session_id=session.id)
# ... store messages ...
client.learning_spaces.wait_for_learning(space.id, session_id=session.id)
skills = client.learning_spaces.list_skills(space.id)
client.learning_spaces.download_skills_zip(space.id, "./skills")
```

### TypeScript SDK
Similar API surface as Python, published as `@acontext/acontext` on npm. Both sync and async patterns are supported.

### Sandbox Integration
Skills can be mounted into sandboxes (Cloudflare Workers, E2B, Novita, AWS AgentCore) via the sandbox backends in `src/server/core/acontext_core/infra/sandbox/`. This enables agents running in isolated environments to access learned skills.

### Framework-Agnostic Design
Since skills are Markdown files accessed via tool calls, Acontext works with any framework that supports function calling: LangGraph, Claude Agent SDK, OpenAI Agents, Vercel AI SDK, Agno, or raw API calls. No framework-specific adapter is needed -- just give the agent the skill tools.

## Benchmarks & Performance

Acontext does not publish standardized benchmark results (like LoCoMo or MemAware) since its approach fundamentally differs from retrieval-based memory systems. The value proposition is qualitative rather than quantitative:

**Learning effectiveness:** The three-stage pipeline (task extraction -> distillation -> skill writing) ensures only meaningful learnings are captured. The `skip_learning` filter prevents noise accumulation. The structured entry format (SOP/Warning/Fact) ensures learnings are actionable rather than vague.

**Pipeline cost:** Each completed task requires: 1 distillation LLM call + 5-10 Skill Learner LLM calls (reading existing skills, thinking, creating/editing). For a session with 5 meaningful tasks, this is approximately 30-55 LLM calls for the learning pipeline. With GPT-4.1 (the default model), this is roughly $0.10-0.30 per session learning cycle.

**Skill retrieval latency:** Progressive disclosure via tool calls adds latency proportional to the number of tool calls (typically 2-3: list_skills -> get_skill -> get_skill_file). Each tool call is a database query + optional S3 read, typically <100ms per call. Total retrieval latency is typically 200-500ms for loading relevant skill context.

**Concurrency:** Redis-based locking ensures one Skill Learner per learning space. For applications with many concurrent sessions, distilled contexts queue in Redis and are processed sequentially. The `max_contexts_per_agent_run` config limits batch size to prevent unbounded processing.

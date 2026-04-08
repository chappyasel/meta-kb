---
url: 'https://github.com/thedotmack/claude-mem'
type: repo
author: thedotmack
date: '2026-04-04'
tags:
  - agent-memory
  - context-engineering
  - claude-code
  - session-persistence
  - memory-compression
  - self-improving
key_insight: >-
  Claude-mem implements a 5-hook lifecycle (SessionStart, UserPromptSubmit,
  PostToolUse, Stop, SessionEnd) that captures every tool invocation, compresses
  observations into structured XML using a secondary Claude SDK agent, and
  reinjects them as timeline-formatted context at session start -- achieving
  persistent project memory through a background worker architecture that
  decouples observation capture from AI-powered summarization.
stars: 44950
deep_research:
  method: source-code-analysis
  files_analyzed:
    - src/services/context/ContextBuilder.ts
    - src/services/context/ObservationCompiler.ts
    - src/services/context/types.ts
    - src/cli/handlers/observation.ts
    - src/hooks/hook-response.ts
    - src/servers/mcp-server.ts
    - src/sdk/parser.ts
    - src/sdk/prompts.ts
    - plugin/hooks/hooks.json
    - package.json
    - CLAUDE.md
  analyzed_at: '2026-04-04'
  original_source: repos/thedotmack-claude-mem.md
relevance_scores:
  topic_relevance: 8
  practitioner_value: 8
  novelty: 7
  signal_quality: 8
  composite: 7.9
  reason: >-
    Claude-mem is a directly relevant implementation of agent memory and context
    engineering patterns—specifically cross-session memory retention,
    observation compression, and context injection—with a well-documented
    architecture covering worker services, lifecycle hooks, token budgeting, and
    semantic search that practitioners building persistent LLM agent systems can
    study and adapt.
---

## Architecture Overview

Claude-mem is a persistent memory compression system for Claude Code that preserves context across sessions by capturing tool observations and generating semantic summaries automatically. The official documentation describes it as providing "persistent memory compression" that works by "capturing tool observations and generating semantic summaries automatically." It runs as version 10.7.1 and is distributed via npm as a Claude Code plugin.

The architecture consists of five major subsystems, documented across the official docs site:

**1. Plugin Hook System** -- Six lifecycle hooks that Claude Code invokes at specific points in a session's lifecycle. The documentation describes the complete 6-stage session lifecycle:

- **Smart Install Pre-Hook** (`smart-install.js`) -- A cached dependency checker that runs before the context hook, validating dependencies only on version changes. This is architecturally separate from the lifecycle hooks.
- **Context Hook** (`context-hook.js`, SessionStart event) -- Launches the Bun worker, injects previous session context from the last 10 sessions.
- **User Message Hook** (`user-message-hook.js`) -- Debugging hook for user prompt inspection.
- **New Hook** (`new-hook.js`, UserPromptSubmit event) -- Creates a database session, saves the raw prompt for FTS5 indexing.
- **Save Hook** (`save-hook.js`, PostToolUse event) -- Captures 100+ tool executions per session, sends to worker for AI-powered compression.
- **Summary Hook** (`summary-hook.js`, Stop event) -- Generates final session summary with learnings and next steps.
- **Cleanup Hook** (`cleanup-hook.js`, SessionEnd event) -- Marks session complete (graceful, not DELETE), preparing data for next session context injection.

Each hook is a shell command that invokes `bun-runner.js` -> `worker-service.cjs` with a specific subcommand. The SessionEnd hook uses an inline Node.js one-liner with fire-and-forget HTTP to avoid blocking shutdown.

**2. Worker Service** (`src/services/worker-service.ts`) -- An Express.js 4.18 HTTP server on port 37777, managed by Bun as a persistent background process. The documentation describes it as the core processing engine featuring "10 search HTTP API endpoints (v5.4.0+)" plus "8 viewer UI HTTP/SSE endpoints." It handles:

- Observation storage (SQLite with FTS5 virtual tables)
- AI-powered compression (Claude Agent SDK for structured XML extraction)
- Semantic search (ChromaDB vectors as optional enhancement)
- MCP protocol serving
- Real-time updates via Server-Sent Events
- Health monitoring with readiness endpoint (returns 503 during initialization)
- Graceful shutdown and PID management

**3. Context Generation** (`src/services/context/`) -- A multi-stage pipeline that builds the memory context injected at session start:
- `ContextBuilder.ts` -- orchestrator that loads config, queries data, calculates token economics, renders timeline
- `ObservationCompiler.ts` -- database queries with type and concept filtering
- `TokenCalculator.ts` -- token economics tracking (compression ratios, savings metrics)
- Section renderers (Header, Timeline, Summary, Footer)
- Supports both color (terminal) and markdown (CLAUDE.md) output formats

**4. SDK Agent** (`src/sdk/`) -- A secondary Claude Agent SDK instance that observes the primary session's tool usage and compresses it into structured XML observations and summaries. This is the core intelligence layer -- raw tool invocations go in, compressed semantic observations come out.

**5. Viewer UI** -- A React + TypeScript web interface accessible at localhost:37777 with real-time memory stream visualization via Server-Sent Events, infinite scroll pagination with deduplication, project filtering, and GPU-accelerated animations. Deployed as a self-contained HTML bundle built with esbuild.

The technology stack runs on TypeScript (ES2022) with Node.js 18+ runtime. Storage uses SQLite 3 with bun:sqlite driver, paired with optional ChromaDB for semantic capabilities. The build tooling employs esbuild with Bun as the process manager.

## Core Mechanism

### Observation Capture and Compression

The central mechanism is the PostToolUse hook (save-hook.js). Every time Claude Code uses a tool (Read, Edit, Bash, etc.), the hook fires and sends the raw invocation to the worker:

```typescript
// src/cli/handlers/observation.ts
const response = await workerHttpRequest('/api/sessions/observations', {
    method: 'POST',
    body: JSON.stringify({
        contentSessionId: sessionId,
        tool_name: toolName,
        tool_input: toolInput,
        tool_response: toolResponse,
        cwd
    })
});
```

The worker receives raw tool invocations and processes them through the SDK agent, which uses Claude's own API to compress observations into structured XML:

```xml
<observation>
  <type>[ discovery | investigation | completion | decision | ... ]</type>
  <title>What happened (40 chars)</title>
  <subtitle>Additional context</subtitle>
  <facts>
    <fact>Specific finding</fact>
  </facts>
  <narrative>Natural language summary of significance</narrative>
  <concepts>
    <concept>domain-relevant-tag</concept>
  </concepts>
  <files_read><file>path/to/file</file></files_read>
  <files_modified><file>path/to/file</file></files_modified>
</observation>
```

The `parseObservations()` function in `src/sdk/parser.ts` extracts these XML blocks from the SDK agent's response. It validates observation types against the active mode's valid types (configurable per-mode, with fallback to first type). The documentation confirms the design philosophy found in the code:

```typescript
// NOTE FROM THEDOTMACK: ALWAYS save observations - never skip. 10/24/2025
// All fields except type are nullable in schema
```

This "always save" philosophy means no observation is lost even with partial extraction. The documentation emphasizes that the system captures "100+ tool executions" per session, all compressed through the SDK agent.

### Session Summarization

At session end (Stop hook / summary-hook.js), the SDK agent generates a structured summary:

```xml
<summary>
  <request>What the user asked for</request>
  <investigated>What was researched/explored</investigated>
  <learned>Key discoveries and insights</learned>
  <completed>What was accomplished</completed>
  <next_steps>Remaining work</next_steps>
</summary>
```

The `parseSummary()` function enforces an emphatic persistence rule:

```typescript
// NOTE FROM THEDOTMACK: 100% of the time we must SAVE the summary, even if fields are missing. 10/24/2025
// NEVER DO THIS NONSENSE AGAIN.
```

The cleanup hook then marks the session complete (gracefully, not via DELETE), making it ready for next session context injection.

### Context Injection at Session Start

When a new session starts, the context-hook.js triggers `ContextBuilder.ts` to generate the memory context. The documentation describes this as "automatic context injection from the last 10 sessions." The pipeline:

1. **Config loading** (`loadContextConfig()`) -- reads display settings, observation type filters, concept filters. The documentation notes "11 configurable settings for fine-grained context control."
2. **Data querying** (`ObservationCompiler.ts`) -- SQL queries against SQLite with type and concept filtering:

```sql
SELECT id, memory_session_id, type, title, subtitle, narrative,
       facts, concepts, files_read, files_modified, discovery_tokens,
       created_at, created_at_epoch
FROM observations
WHERE project = ?
  AND type IN (...)
  AND EXISTS (SELECT 1 FROM json_each(concepts) WHERE value IN (...))
ORDER BY created_at_epoch DESC
LIMIT ?
```

3. **Token economics** -- calculates savings from compression vs. raw tool output, displaying compression ratios in the context header
4. **Timeline rendering** -- builds a chronological view interleaving observations and session summaries
5. **Output formatting** -- supports both color (terminal) and markdown (CLAUDE.md) formats

The system also supports worktree-aware queries, combining observations from parent repos and worktrees for monorepo workflows. The documentation specifically calls out "git worktree support for unified context across parent repos."

### Auto-Generated CLAUDE.md Files

A key feature documented on the official site is automatic generation of `CLAUDE.md` files in project folders with activity timelines. This integrates directly with Claude Code's native context system -- the memory context is written as a CLAUDE.md file that Claude Code automatically reads at session start, creating a seamless persistence loop without requiring explicit context injection commands.

### mem-search Skill (Progressive Disclosure Search)

The documentation describes the mem-search skill (v5.4.0+, renamed from "search" in v5.5.0) as a progressive disclosure search system with 10 operations:

1. **Observation search** -- find specific observations by content
2. **Session search** -- find sessions by activity
3. **Prompt search** -- search saved user prompts via FTS5
4. **Type filtering** -- filter by observation type (discovery, investigation, completion, etc.)
5. **Concept filtering** -- filter by domain concepts
6. **File filtering** -- find observations related to specific files
7. **Recent context** -- retrieve recent activity
8. **Timeline generation** -- detailed timeline reports
9. **Statistics** -- memory system stats
10. **Help** -- usage guidance

The skill frontmatter is approximately 250 tokens (loaded at session start), with full instructions loaded on-demand. The documentation reports that the v5.5.0 rename increased effectiveness "from 67% to 100% with enhanced triggers."

### MCP Search Server

The MCP server (`src/servers/mcp-server.ts`) provides memory search capabilities as MCP tools. It enforces a 3-layer progressive disclosure pattern designed for token efficiency:

1. **search** -- returns an index with IDs (~50-100 tokens/result)
2. **timeline** -- shows chronological context around specific results
3. **get_observations** -- fetches full details for filtered IDs

This is explicitly designed for "10x token savings. Never fetch full details without filtering first." The MCP server uses stdio transport with JSON-RPC, explicitly redirecting console.log to stderr to protect the protocol:

```typescript
// CRITICAL: Redirect console to stderr BEFORE other imports
// MCP uses stdio transport where stdout is reserved for JSON-RPC protocol messages.
console['log'] = (...args) => { logger.error('CONSOLE', 'Intercepted console output', ...); };
```

Additional MCP tools include `smart_file_read` and `help`.

### Mode System

Claude-mem supports configurable modes (`plugin/modes/`) that define observation types, prompt templates, and concept taxonomies. The documentation highlights:

- **Code mode** (default) -- software development workflow with technical observation types
- **Email Investigation mode** -- email analysis workflow
- **Chill mode** -- casual interaction mode
- **28 language localizations** -- Spanish, Chinese, French, Japanese, and 24+ others

Each mode provides `observation_types` (valid type IDs with descriptions), `prompts` (system identity, observer role, spatial awareness, recording focus, skip guidance, output format), and `observation_concepts` (valid concept categories). The `ModeManager` singleton resolves the active mode and exposes it to the SDK agent and parser.

### Privacy Protection

The documentation and code both emphasize privacy through `<private>content</private>` tags that are stripped at the hook layer before data reaches the worker/database. This is architecturally sound -- privacy enforcement at the boundary rather than deep in the stack. The documentation lists this as a first-class feature. Sensitive content wrapped in `<private>` tags is guaranteed to never reach the SQLite database or ChromaDB vectors, regardless of the SDK agent's processing.

### Citation System

The documentation describes a citation system for referencing past observations via IDs. This allows Claude to reference specific historical observations in its responses, creating verifiable links between current work and past context. When Claude needs to reference something it learned in a previous session, it can cite the observation ID, and the user can trace that reference back to the specific tool invocation that produced it.

### Database Architecture and FTS5

The database layer is more sophisticated than a simple key-value store. The documentation describes SQLite with FTS5 virtual tables as the foundation:

- **SessionStore** handles CRUD operations for sessions, observations, and summaries
- **SessionSearch** provides FTS5-powered full-text search across all stored content
- **FTS5 virtual tables** enable keyword search across observation narratives, facts, titles, and concepts
- **JSON columns** store structured arrays (concepts, files_read, files_modified) within SQLite rows
- **Epoch-indexed sorting** enables efficient chronological ordering via `created_at_epoch`

The database resides at `~/.claude-mem/claude-mem.db`, keeping all data local. Sessions are marked complete on cleanup rather than deleted, preserving the full observation history for future context injection.

### Data Flow: End-to-End Session Lifecycle

The documentation's 6-stage lifecycle reveals the complete data flow from session start to finish:

1. **Smart Install** (pre-hook): Validates Bun runtime and npm dependencies against a version-locked cache. Only runs the full check when the plugin version changes, otherwise skips in milliseconds. This prevents the cold-start penalty on every session.

2. **Context Injection** (SessionStart): The Bun worker launches (or confirms it's already running), then `ContextBuilder.ts` queries the last 10 sessions from SQLite, computes token economics (compression ratio, savings vs. raw), and renders a timeline-formatted context block. This block is either injected into the terminal context or written to a project-level `CLAUDE.md` file.

3. **Session Creation** (UserPromptSubmit): A new session record is created in SQLite with the raw user prompt saved for FTS5 indexing. This means user prompts themselves are searchable via the mem-search skill.

4. **Observation Capture** (PostToolUse, repeated 100+ times): Each tool invocation (Read, Edit, Bash, Write, Glob, Grep, etc.) triggers the save-hook, which POSTs the raw tool name, input, and response to the worker's HTTP API. The worker queues this for SDK agent processing, which compresses it into structured XML and stores the parsed observation in SQLite.

5. **Session Summary** (Stop): The SDK agent generates a structured summary covering what was requested, investigated, learned, completed, and what remains. This summary is stored alongside the observations and becomes part of the next session's context injection.

6. **Session Completion** (SessionEnd): The session is marked complete via a fire-and-forget HTTP call (2-second timeout). No data is deleted -- the session transitions from "active" to "completed" state, making it available for future context queries.

### Comparison to Alternative Approaches

Claude-mem occupies a unique position in the memory tool landscape. Unlike Cognee or OpenMemory, which provide general-purpose memory for any LLM application, claude-mem is purpose-built for a single use case: persistent memory for Claude Code sessions. This specialization enables several design choices that would not work for a general memory system:

- **Hook-based capture** only works because Claude Code exposes lifecycle hooks. A general memory system cannot depend on this.
- **XML observation format** is optimized for Claude's output style. Other LLMs might produce less reliable XML.
- **CLAUDE.md injection** leverages Claude Code's native context system. Other tools would need different injection mechanisms.
- **Tool-invocation-level granularity** captures the specific operations an agent performed, not just the information it processed. This is more detailed than document-level memory but more expensive to compute.

The tradeoff is clear: claude-mem sacrifices generality for deep integration with one platform, achieving a level of seamless memory persistence that general-purpose tools cannot match within the Claude Code environment.

The 44,950-star count (highest of any project in this analysis) reflects this product-market fit: claude-mem solves a real and immediate pain point for Claude Code users who lose context between sessions. The plugin marketplace distribution, one-command installation, and automatic context injection mean the barrier to adoption is near zero -- install it and the next session automatically has memory of past sessions. This is a fundamentally different adoption model than general-purpose memory systems that require explicit API integration and storage configuration.

## Design Tradeoffs

**Hook-based architecture vs. direct integration.** By using Claude Code's hook system, claude-mem captures tool usage without modifying Claude Code itself. The tradeoff is indirect communication -- each hook spawns a process that communicates with the worker via HTTP. The documentation's 6-stage lifecycle (smart-install, context, new, save, summary, cleanup) shows this is more complex than the 5-hook model visible in the code alone. The SessionEnd hook uses fire-and-forget to avoid blocking shutdown.

**Background worker vs. inline processing.** The worker service runs persistently on port 37777, decoupling observation capture from AI processing. This means tool usage hooks return quickly (maintaining Claude Code responsiveness) while compression happens asynchronously. The tradeoff is operational complexity -- the worker needs health monitoring, graceful shutdown, zombie process prevention, and PID management. The documentation notes a readiness endpoint that returns 503 during initialization, preventing premature hook calls.

**XML parsing vs. JSON structured output.** The SDK agent outputs observations in XML format, parsed with regex in `parser.ts`. This is an unusual choice over JSON/Pydantic structured output. The XML format allows nested arrays (facts, concepts, files) in a human-readable way that's robust to Claude's output variations. The regex parser uses non-greedy matching to handle nested tags and code snippets correctly.

**SQLite + FTS5 for both state and search.** The documentation confirms SQLite with FTS5 virtual tables as the primary storage and search engine. Observations are stored with JSON columns (concepts, files_read, files_modified). ChromaDB provides semantic vector search as an optional enhancement. The SQLite-first approach keeps dependencies minimal -- the documentation lists SQLite 3 as "bundled" -- but limits search to exact concept matching, FTS5 full-text search, and chronological ordering without vector semantics unless ChromaDB is enabled.

**Always-save philosophy.** The explicit decision to never skip observations or summaries, even with missing fields, prioritizes completeness over precision. This means the context may include partial observations, but no information is lost. Both the code comments and documentation reinforce this as a deliberate, non-negotiable design choice.

**Progressive disclosure for token efficiency.** The 3-layer MCP search pattern (index -> timeline -> details) and the mem-search skill's 250-token frontmatter are explicitly designed to minimize token consumption. The documentation claims "10x token savings" from this approach. This is a genuine innovation for MCP tool design -- most MCP servers return full results immediately.

**Smart install caching.** The dependency checker runs before the context hook but only validates on version changes, avoiding the overhead of checking dependencies on every session start. This is a practical optimization for a plugin that runs on every Claude Code session.

## Failure Modes & Limitations

**Worker availability.** If the worker service is down or unreachable, observation storage silently fails. The hook handlers catch errors and return success to avoid blocking tool usage:

```typescript
// Worker unreachable - skip observation gracefully
logger.warn('HOOK', 'Observation fetch error, skipping', { error: ... });
return { continue: true, suppressOutput: true, exitCode: HOOK_EXIT_CODES.SUCCESS };
```

This "graceful degradation" means memory gaps are invisible to the user. The documentation's worker readiness endpoint (503 during initialization) mitigates startup race conditions but doesn't address mid-session worker crashes.

**LLM-in-the-loop compression.** Every tool invocation triggers an LLM call through the SDK agent for compression. At high tool-use rates (the documentation notes "100+ tool executions" per session), this creates significant API cost and latency. The batching strategy (processing observations in sequence through a persistent SDK agent conversation) helps amortize setup cost, but each observation still requires a round-trip.

**Regex XML parsing fragility.** The XML parser uses non-greedy regex patterns like `/<observation>([\s\S]*?)<\/observation>/g`. While this handles nested content better than greedy matching, it can still break on pathological inputs (e.g., observation content containing literal `</observation>` strings). The code has a comment referencing "Issue #798" for nested tag handling fixes.

**Context window budget.** The `TokenCalculator` estimates tokens using `CHARS_PER_TOKEN_ESTIMATE = 4`. Context injection is bounded by `totalObservationCount` and `sessionCount` config values (default: last 10 sessions). For long-running projects with thousands of observations, the budget becomes a hard constraint, and the chronological recency bias (ORDER BY created_at_epoch DESC) means older but important observations may be dropped.

**Single-machine architecture.** The worker, SQLite database, and ChromaDB all run on the local machine at `~/.claude-mem/`. There is no multi-machine sync, cloud backup, or remote access story. The documentation mentions the system is fully local-first, though the architecture docs reference a "Pro tunnel feature" for potential future remote access.

**Mode-specific observation types.** The parser validates observation types against the active mode's type list. If the SDK agent generates a type not in the current mode, it falls back to the first type. This silently recategorizes observations, which could confuse downstream search and filtering. With 28 language localizations plus specialized modes, the type mismatch surface area is significant.

**FTS5 limitations.** While the documentation highlights full-text search across stored observations, FTS5 is a keyword-based search engine, not a semantic one. Queries for conceptually similar content that uses different terminology will miss results unless ChromaDB vector search is also enabled.

## Integration Patterns

**Claude Code Plugin System.** Claude-mem is a Claude Code plugin distributed via the marketplace at `~/.claude/plugins/marketplaces/thedotmack/plugin`. It uses Claude Code's hook contract (exit codes 0/1/2), settings.json configuration, and CLAUDE.md context injection. Installation is available via npm command or the plugin marketplace.

**MCP (Model Context Protocol).** The MCP server at `src/servers/mcp-server.ts` exposes search, timeline, get_observations, smart_file_read, and help tools via stdio transport with JSON-RPC. The progressive disclosure pattern is a model for token-efficient MCP tool design.

**Cursor IDE.** The `cursor-hooks/` directory provides Cursor IDE integration with its own hook system, context injection, and MCP configuration.

**Windsurf IDE.** The `.windsurf/rules/` directory provides Windsurf-specific rules.

**OpenCode Plugin.** The `src/integrations/opencode-plugin/` directory provides integration with the OpenCode project.

**ChromaDB Vectors.** The `src/services/sync/ChromaSync.ts` manages vector embedding synchronization for semantic search capabilities beyond SQLite's text matching.

**Skills System.** Plugin skills (`plugin/skills/`) provide specialized capabilities documented in the official docs:
- `mem-search` -- HTTP API for searching past work (10 operations, progressive disclosure)
- `make-plan` -- orchestrator for phased implementation plans
- `do` -- plan execution using subagents
- `timeline-report` -- detailed timeline reports
- `smart-explore` -- intelligent codebase exploration
- `version-bump` -- changelog generation and version management
- `troubleshoot` -- diagnostic skill for system issues

**Web Viewer UI.** Real-time memory stream visualization at localhost:37777, with Server-Sent Events for live updates, infinite scroll, project filtering, and GPU-accelerated animations. This provides a visual interface for inspecting the memory system's state beyond what the CLI and MCP tools offer.

**Multi-Language Support.** 28 language localizations including Spanish, Chinese, French, Japanese, and others -- enabling claude-mem to generate observations and summaries in the user's preferred language.

## Benchmarks & Performance

No formal benchmarks are published in the source code or documentation. Performance-relevant observations from both:

- **Token economics tracking**: The `TokenCalculator` computes compression ratios in real-time, reporting `totalReadTokens` (what would have been consumed reading raw tool output) vs. `totalDiscoveryTokens` (compressed observation size). The savings metric is displayed in the context header.

- **3-layer search optimization**: The MCP search tools explicitly enforce progressive disclosure (~50-100 tokens per search result vs. ~500-1000 tokens per full observation), claiming "10x token savings."

- **Hook timeouts**: Configuration in `hooks.json` shows timeout budgets: Setup 300s, SessionStart 60s, PostToolUse 120s, Stop 120s, SessionEnd 2s. The SessionEnd is notably short -- fire-and-forget.

- **Worker readiness**: The worker service has a readiness endpoint that returns 503 during initialization, preventing premature hook calls.

- **Database performance**: SQLite with better-sqlite3/bun:sqlite for synchronous reads, avoiding the async overhead for simple queries. FTS5 virtual tables for full-text search. Observation queries use `created_at_epoch` indexes for chronological ordering.

- **Search effectiveness**: The documentation reports that the v5.5.0 rename of the search skill (from "search" to "mem-search") increased effectiveness "from 67% to 100% with enhanced triggers," suggesting active measurement and optimization of the skill invocation rate.

- **Skill frontmatter efficiency**: The mem-search skill frontmatter is approximately 250 tokens (loaded at session start), with full instructions loaded on-demand only when the skill is invoked. This minimizes the per-session token overhead of having memory search capabilities available.

- **Session context window**: Default injection of the last 10 sessions, configurable to balance comprehensiveness against token budget. The compression pipeline ensures each session's observations are significantly smaller than the raw tool output they represent.

## Documentation Coverage Assessment

The official documentation at docs.claude-mem.ai provides a well-structured overview of the system's architecture, features, and integration points. The main landing page covers the core value proposition (persistent memory compression), key features (28 languages, mode system, 11 configurable settings, privacy tags), and the 5-stage workflow overview. The architecture page provides the most technical depth, documenting the 6-stage session lifecycle, 6 plugin hooks, worker service architecture, database design with FTS5, mem-search skill operations, and Viewer UI layer.

Key documentation strengths: the architecture documentation precisely identifies each hook file and its corresponding lifecycle event; the mem-search skill documentation includes specific token budgets and effectiveness metrics; the worker service section lists exact endpoint counts (10 search API + 8 viewer UI); and the technology stack is clearly enumerated (TypeScript ES2022, Express.js 4.18, esbuild, Bun).

The documentation site structure suggests additional pages (folder context, search tools, getting started) that were not accessible during this analysis. The main docs page references "Architecture Overview," "Installation guide," "Getting Started guide," "Folder Context documentation," and "Search Tools documentation" as linked resources, indicating a broader documentation surface than what was directly retrievable.

Notable from the documentation: the mem-search skill's evolution from "search" to "mem-search" (v5.5.0) with effectiveness tracking is a rare example of a plugin developer measuring and reporting tool invocation success rates. The claim of going "from 67% to 100% with enhanced triggers" suggests systematic A/B testing of how Claude Code invokes the search skill -- a level of empirical optimization unusual for open-source memory tools.

The project's documentation also reveals the breadth of IDE support beyond Claude Code: Cursor IDE hooks, Windsurf IDE rules, and OpenCode plugin integration are all mentioned, suggesting a strategy to become the universal memory layer for AI-assisted coding tools, not just a Claude Code extension.

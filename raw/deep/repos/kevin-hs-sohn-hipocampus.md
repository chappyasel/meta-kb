---
url: 'https://github.com/kevin-hs-sohn/hipocampus'
type: repo
author: kevin-hs-sohn
date: '2026-04-04'
tags:
  - agent-memory
  - context-engineering
  - compaction-tree
  - implicit-context-discovery
  - bio-inspired-indexing
  - proactive-retrieval
  - memory-hierarchy
key_insight: >-
  Hipocampus solves the 'unknown unknowns' problem by maintaining a 3K-token
  compressed topic index (ROOT.md) that acts as a biological hippocampus for AI
  agents -- always-loaded, zero-search-cost awareness of everything the agent
  has ever discussed, enabling proactive context surfacing that is 21x better
  than no memory and 5x better than search alone on implicit recall benchmarks.
stars: 145
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - spec/layers.md
    - spec/compaction.md
    - spec/file-formats.md
    - spec/checkpoint.md
    - skills/core/SKILL.md
    - skills/compaction/SKILL.md
    - skills/recall/SKILL.md
    - skills/search/SKILL.md
    - skills/flush/SKILL.md
    - cli/compact.mjs
    - cli/init.mjs
    - hooks/session-start.sh
    - templates/MEMORY.md
    - templates/ROOT.md
  analyzed_at: '2026-04-04'
  original_source: repos/kevin-hs-sohn-hipocampus.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 8
  signal_quality: 9
  composite: 8.9
  reason: >-
    This is a directly relevant implementation of agent memory architecture with
    a novel compaction-tree approach for proactive context surfacing, ships as a
    working Claude Code plugin with detailed architecture documentation covering
    ROOT.md as always-loaded topic index, hierarchical summarization, and
    zero-infrastructure design patterns immediately applicable to LLM agent
    builders.
---

## Architecture Overview

Hipocampus is a zero-infrastructure, file-based proactive memory system for AI coding agents. It ships as a Claude Code plugin, npm package, and OpenCode/OpenClaw integration. The entire system operates through markdown files and a single JavaScript CLI script -- no database, no server, no embedding API required (though optional vector search is supported via the `qmd` tool).

The architecture mirrors a CPU cache hierarchy with three tiers:

**Layer 1 (Hot / System Prompt, ~500 lines total):** Always loaded into every API call. Contains `memory/ROOT.md` (the compressed topic index, ~3K tokens), `SCRATCHPAD.md` (active working state), `WORKING.md` (in-progress tasks), and `TASK-QUEUE.md` (task backlog). On Claude Code these are auto-loaded via `@import` in CLAUDE.md. On OpenClaw, `MEMORY.md` and `USER.md` are also in this tier.

**Layer 2 (Warm / On-Demand):** Read by the agent when needed. Contains raw daily logs (`memory/YYYY-MM-DD.md`), curated knowledge files (`knowledge/*.md`), and task plans (`plans/*.md`). Raw daily logs are permanent -- never deleted or modified after the session ends. Write operations are dispatched to subagents to protect the main session context.

**Layer 3 (Cold / Search + Compaction Tree):** Accessed via `qmd` hybrid search (BM25 + vector) or tree traversal. Contains the 4-level compaction hierarchy: `memory/daily/`, `memory/weekly/`, `memory/monthly/` nodes, each with YAML frontmatter containing `status: tentative|fixed`, `period`, `topics`, and `source-files` fields.

The key architectural decision is that ROOT.md sits at the apex of a 5-level compaction tree (Raw -> Daily -> Weekly -> Monthly -> Root), providing an always-loaded "table of contents" of everything the agent knows. This inverts the traditional retrieval problem: instead of needing a query to find relevant context, the agent sees all topics at zero cost and decides whether to drill deeper.

## Core Mechanism

### The Compaction Tree

The compaction tree is the central innovation. It is a hierarchical summarization pipeline that compresses months of conversation history into a ~100-line topic index.

**Chain order:** Raw daily logs -> Daily compaction nodes -> Weekly summary nodes -> Monthly summary nodes -> ROOT.md. Each level reads ONLY from its immediate predecessor (enforced by skill instructions that explicitly forbid skipping levels). This strict chain order prevents data corruption and ensures every piece of information flows through the full pipeline.

**Smart thresholds:** Below a size threshold, source files are copied/concatenated verbatim (zero information loss). Above threshold, LLM generates keyword-dense summaries. The thresholds are: Raw->Daily ~200 lines, Daily->Weekly ~300 lines combined, Weekly->Monthly ~500 lines combined. Monthly->Root always uses LLM recompaction.

**Fixed vs tentative lifecycle:** Every compaction node carries a `status` field. Tentative nodes are regenerated when new data arrives. Fixed nodes are immutable. Daily nodes become fixed when the date changes. Weekly nodes become fixed when the ISO week ends + 7 days elapse. Monthly nodes become fixed when the month ends + 7 days. ROOT.md is always tentative -- it accumulates forever and self-compresses when exceeding the token budget.

The mechanical compaction is handled by `cli/compact.mjs` -- a ~440-line Node.js script that runs as a pre-compaction hook. It handles transcript extraction from JSONL session files, secret scanning (regex-based redaction of API keys, tokens, private keys), ISO week calculation, file grouping, below-threshold copy/concat, and above-threshold placeholder marking. Above-threshold cases are marked `status: needs-summarization` for the LLM agent to process.

### ROOT.md: The Topic Index

ROOT.md has four functional sections, each optimized for different retrieval patterns:

1. **Active Context** (recent ~7 days): What is happening now. Immediate priorities and in-progress work.
2. **Recent Patterns**: Cross-cutting insights not tied to a specific time period. Emergent patterns from recent work.
3. **Historical Summary**: High-level chronology compressed into period ranges (e.g., "2026-01~02: initial 3-tier design, K8s launch").
4. **Topics Index**: Keyword-dense O(1) lookup table. Each entry carries a type tag (`project`, `feedback`, `user`, `reference`), age in days, and optional reference pointer. Format: `- topic-keyword [type, Nd]: sub-keywords -> knowledge/file.md`

The Topics Index is the primary retrieval mechanism. When a query arrives, the agent scans it for keyword matches within "1 semantic hop" -- so "deployment" matches topics tagged with deployment-related keywords even across languages (the spec explicitly mentions Korean/English cross-language matching: "baebpo" matching "deployment").

### Memory Types and Type-Aware Compaction

Every memory entry is classified into one of four types, each with distinct compaction behavior:

- **`user`**: Identity, preferences, expertise. Always preserved, never compressed to Historical Summary.
- **`feedback`**: User corrections on approach. Always preserved with rule/why/how-to-apply structure.
- **`project`**: Work, decisions, technical findings. Compressed to Historical Summary when completed. Active projects stay in Active Context.
- **`reference`**: External pointers (URLs, tools). Preserved with staleness markers -- `[?]` after 30 days without verification.

This type system ensures that user identity and behavioral corrections survive indefinitely (they are the most valuable long-term memories), while project details naturally compress as they age and lose relevance.

### Selective Recall Protocol

The recall system uses a 3-step fallback strategy:

1. **ROOT.md triage (O(1))**: Scan Topics Index for keyword match. Resolves most queries instantly. If a match is found, read the referenced file directly.
2. **Manifest-based LLM selection**: For cross-domain queries where keywords do not match. Read frontmatter-only (<500 tokens) from weekly/monthly nodes, then use LLM to select top 5 relevant files. This solves the keyword mismatch problem using semantic understanding.
3. **qmd search (fallback)**: Hybrid BM25 + vector search for specific keyword retrieval.

Step 2 is novel -- it uses frontmatter manifests (type, period, topics fields) as a lightweight index that the LLM can reason over semantically, without loading full file contents. This enables cross-language and cross-domain matching at minimal token cost.

## Design Tradeoffs

### Files over databases
The entire system uses markdown files as its storage layer. No database, no migrations, no configuration beyond a single JSON config. This trades query performance for portability, inspectability, and zero-infrastructure setup. The tradeoff is deliberate: agent memory access patterns are read-heavy, low-frequency (once per session start, occasionally during session), and the compaction tree keeps file counts manageable.

### LLM cost vs completeness
Below-threshold compaction is verbatim (zero LLM cost, zero information loss). Above-threshold requires LLM calls for keyword-dense summarization. The thresholds (200/300/500 lines) are tuned so that typical daily usage stays below threshold -- LLM compaction only kicks in for heavy usage days. The per-cycle limit (max 1 node per level per compaction cycle) further controls cost.

### Always-loaded index vs search-only
Loading ROOT.md (~3K tokens) into every API call has a fixed cost. On models with prompt caching (like Claude), this stable content maximizes cache hit rates (up to 90% token savings). The cost is negligible compared to the alternative of loading full history or performing multiple search queries.

### Subagent delegation vs inline writes
All memory writes except hot files (SCRATCHPAD, WORKING, TASK-QUEUE) are dispatched to subagents. This protects the main session's context window from memory operation noise. The tradeoff is latency -- subagent dispatch is fire-and-forget, so there is a brief window where a crash could lose the last checkpoint. The proactive flush mechanism (every ~20 messages) mitigates this.

### Keyword-dense format vs narrative prose
All compaction nodes use keyword-dense, structured format rather than narrative prose. This is optimized for BM25 recall -- important keywords are intentionally repeated across sections to increase search hit rates. The spec explicitly forbids prose in compaction nodes.

## Failure Modes & Limitations

### Single-agent scope
ROOT.md represents one agent's memory. There is no mechanism for sharing or merging memory across multiple agents or users. In a multi-agent system, each agent would maintain its own compaction tree, potentially with duplicated or conflicting knowledge.

### LLM quality dependency for summarization
Above-threshold compaction quality depends entirely on the LLM's summarization ability. Poor summarization could lose critical details. The system mitigates this by keeping raw logs permanently (they are never deleted), so the original data is always recoverable via tree traversal.

### ROOT.md size pressure
The ~3K token budget for ROOT.md creates constant pressure to compress. For agents working on many projects simultaneously, the Topics Index could become cramped. The configurable `rootMaxTokens` allows increasing the budget (the benchmark showed 10K tokens improved easy questions from 26% to 34%), but this increases per-call cost.

### Cold start problem
On the first day, ROOT.md has minimal content. The full tentative tree is created immediately (daily->weekly->monthly->root), but the index is sparse. The system is designed to improve over time as more data accumulates.

### No contradiction detection
The compaction pipeline does not detect contradictory information across time periods. If the user changes their mind about a technical decision, both the old and new decision could coexist in different compaction nodes. The type system partially addresses this (feedback entries override project entries), but there is no explicit contradiction resolution.

### Cross-domain reasoning ceiling
The MemAware benchmark shows the Hard tier (cross-domain, zero keyword overlap) plateaus at 8.0% regardless of ROOT.md size. The bottleneck shifts from the index to the answer model's ability to make cross-domain connections. This suggests that structured indexing alone cannot solve the hardest implicit recall problems.

## Integration Patterns

### Claude Code
Plugin installed via marketplace. SCRATCHPAD.md, WORKING.md, TASK-QUEUE.md, and memory/ROOT.md are auto-loaded via `@import` in CLAUDE.md. Compaction is triggered at session start via the hipocampus-core skill's mandatory protocol. Memory writes are dispatched to subagents. The compact.mjs script runs as a pre-compaction hook and syncs ROOT.md content into Claude's auto-memory MEMORY.md file.

### OpenClaw
MEMORY.md and USER.md are created at project root. ROOT.md content is embedded as a "Compaction Root" section within MEMORY.md (since OpenClaw cannot auto-load separate files). Session lifecycle follows explicit Task Start/End protocol with hot file updates. Compaction is triggered by scheduled heartbeat.

### OpenCode
Plugin via opencode-specific skill files. Similar to Claude Code pattern but with platform-specific plugin configuration.

### Search integration (qmd)
Optional BM25 + vector hybrid search via the `qmd` tool. Vector embeddings use embeddinggemma-300M (auto-downloaded, ~2GB disk). The `qmd update` and `qmd embed` commands are called after compaction to re-index. Search failure is treated as a warning, not fatal -- the compaction tree provides an alternative retrieval path.

## Benchmarks & Performance

Evaluated on MemAware -- 900 implicit context questions across 3 months of conversation history. The agent must proactively surface relevant past context that the user never explicitly asks about.

**Key results:**
- No Memory: 0.8% overall
- BM25 Search: 2.8% (3.5x no memory)
- BM25 + Vector Search: 3.4% (4.3x no memory)
- Hipocampus (tree only): 9.2% (11.5x no memory)
- Hipocampus + BM25: 11.4% (14.3x no memory)
- Hipocampus + Vector: 17.3% (21.6x no memory, 5.1x search alone)
- Hipocampus + Vector (10K ROOT): 21.0% (26.3x no memory)

The most striking finding is on Hard questions (cross-domain, zero keyword overlap): Hipocampus scores 8.0% vs 0.7% for vector search -- 11.4x better. This validates the core thesis that search structurally cannot find connections that require knowing what you know, while the compaction tree can.

**Token economics:** ROOT.md costs ~3K tokens per API call. With prompt caching, effective cost is ~300 tokens (90% cache hit rate on stable content). Compare this to full context dumping (500K+ tokens) or multiple search queries (variable, often 5-10K tokens for adequate coverage).

**Compaction cost:** Below-threshold compaction is zero LLM cost. Above-threshold compaction uses one LLM call per node per cycle (max 4 calls per cycle). For typical daily usage (~100-150 lines), most compaction is below-threshold.

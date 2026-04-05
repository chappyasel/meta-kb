---
url: 'https://github.com/martian-engineering/lossless-claw'
type: repo
author: martian-engineering
date: '2026-04-04'
tags: [knowledge-bases, agent-memory, context-engineering]
key_insight: >-
  Lossless-claw replaces sliding-window context truncation with a DAG-based
  hierarchical summarization system that preserves every message in SQLite while
  building progressively more abstract summary layers — leaf summaries (depth 0)
  compress raw messages, condensed summaries (depth 1+) compress summaries —
  with three-level escalation (normal, aggressive, deterministic fallback)
  guaranteeing compaction always makes progress even when the LLM fails.
stars: 4000
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - AGENTS.md
    - docs/architecture.md
    - src/engine.ts
    - src/compaction.ts
    - src/assembler.ts
    - src/summarize.ts
    - src/types.ts
    - src/store/summary-store.ts
    - src/store/conversation-store.ts
    - src/retrieval.ts
    - src/tools/lcm-expand-tool.ts
  analyzed_at: '2026-04-04'
  original_source: repos/martian-engineering-lossless-claw.md
---

## Architecture Overview

Lossless-claw is a plugin for OpenClaw (an open-source agent framework) that replaces the built-in sliding-window compaction with a DAG-based summarization system. The name captures its core promise: context management that loses nothing. Every message is persisted in SQLite, organized into a directed acyclic graph of summaries at increasing abstraction levels, with tools that let agents drill back into any summary to recover original detail.

The project emerged from **Martian Engineering**, a consultancy founded by **Ted Blackman** (former CTO of Urbit Foundation, MIT physics, YC 2011) and **Josh Lehman** (former Executive Director of Urbit Foundation, CTO/cofounder of Starcity YC S16). Lehman is also a core maintainer of OpenClaw itself, and authored the PR (openclaw/openclaw#22201) that introduced the ContextEngine plugin system in OpenClaw v2026.3.7 — the very system that makes lossless-claw possible. This dual authorship (plugin system architect + first plugin developer) explains the tight integration.

The theoretical foundation is described in the LCM (Lossless Context Management) paper from Voltropy, which positions LCM as optimizing for **guarantees rather than autonomy**. Unlike Recursive Language Models (RLMs) that rely on model-generated orchestration code for memory management, LCM "moves control of memory operations into a deterministic engine." The paper's key claim: Volt (Martian Engineering's standalone coding agent using LCM) outperforms Claude Code on the OOLONG long-context benchmark across 32K to 1M context lengths, all using the same base model (Opus 4.6).

The system is implemented in TypeScript and consists of several major subsystems:

1. **Engine** (`src/engine.ts`) — The central coordinator implementing the OpenClaw `ContextEngine` interface. Handles the full lifecycle: bootstrap (session reconciliation), ingest (message persistence), afterTurn (compaction evaluation), assemble (context building), and maintenance (garbage collection).

2. **Compaction** (`src/compaction.ts`) — The compaction engine that converts raw messages into leaf summaries and merges summaries into condensed higher-level nodes. Implements the three-level escalation strategy.

3. **Assembler** (`src/assembler.ts`) — Builds the message array for each model turn by combining summaries and recent raw messages within a token budget.

4. **Summarizer** (`src/summarize.ts`) — LLM interface for summary generation. Handles model resolution, authentication, circuit breaking, timeout management, and provider-specific response normalization.

5. **Stores** — Two SQLite-backed stores:
   - `ConversationStore` — Messages with parts (preserving rich content structure)
   - `SummaryStore` — Summary DAG nodes, context items, parent/child linkages

6. **Tools** — Three MCP tools for agents:
   - `lcm_grep` — Full-text search across summaries and messages
   - `lcm_describe` — Retrieve metadata about summaries or stored files
   - `lcm_expand` / `lcm_expand_query` — Drill into summaries to recover detail

7. **TUI** (`tui/`) — A Go-based terminal UI for browsing conversation history, summaries, and the DAG structure. Includes a "doctor" mode for repairing corrupted summaries.

The plugin uses dependency injection: the `LcmDependencies` interface abstracts all OpenClaw core interactions (LLM completion, gateway RPC, model resolution, API key lookup, session key parsing). This makes the plugin testable and decoupled from the host agent framework.

### The OpenClaw ContextEngine Plugin System

Lossless-claw was the first and remains the most mature ContextEngine plugin. The system it plugs into uses a **slot-based registry with config-driven resolution**. The ContextEngine interface provides seven lifecycle hooks:

1. **bootstrap** — Engine initialization (load persisted state, establish DB connections)
2. **ingest** — New message arrival (preprocess, classify, flag importance)
3. **assemble** — Before prompt assembly (decide what goes into the final prompt)
4. **compact** — Token limit approaching (compress or summarize conversations)
5. **afterTurn** — After each conversation turn (post-processing, update stats)
6. **prepareSubagentSpawn** — Before subagent launch (prepare isolated context scope)
7. **onSubagentEnded** — After subagent completes (collect output, merge back)

The `ownsCompaction` flag is critical: when set to `true`, the engine fully manages compaction and OpenClaw's built-in auto-compaction is disabled. Lossless-claw sets this flag, taking complete ownership of context management. Without any plugin enabled, the system loads `LegacyContextEngine`, preserving backward compatibility.

The `systemPromptAddition` feature in the assembly response enables dynamic prompt injection — lossless-claw uses this to calibrate agent confidence based on compression depth, without requiring static configuration files.

## Core Mechanism

### Dual-State Memory Architecture

The LCM paper describes a dual-state architecture:

1. **Immutable Store** — The source of truth. "Every message and tool result is appended verbatim and never mutated." Messages are persisted to SQLite the moment they arrive via `ingest`. This is the "notebook" in the paper's analogy: "writing in a notebook with a table of contents" versus "erasing a whiteboard."

2. **Active Context** — The working set displayed to the model, containing recent raw turns plus summary nodes for older spans. These summaries are *derived views*, not authoritative records — original data remains accessible via `lcm_expand`. The active context is rebuilt from scratch each turn by the assembler.

### The Summary DAG

The DAG has two node types:

**Leaf summaries (depth 0, kind "leaf"):**
- Created from a contiguous chunk of raw messages
- Linked to source messages via `summary_messages` join table
- Contain narrative summaries with timestamps
- Typically 800-1200 tokens (configurable via `leafTargetTokens`)
- Include an "Expand for details about:" footer listing specific topics that can be drilled into

**Condensed summaries (depth 1+, kind "condensed"):**
- Created from a chunk of summaries at the same depth
- Linked to parent summaries via `summary_parents` join table
- Each depth tier uses a progressively more abstract prompt template:
  - d1: Focuses on key technical decisions and outcomes
  - d2: Strategic themes and recurring patterns
  - d3+: High-level narrative arc
- Typically 1500-2000 tokens (configurable via `condensedTargetTokens`)

Every summary carries: `summaryId` (SHA-256 based), `conversationId`, `depth`, `earliestAt`/`latestAt` (time range), `descendantCount` (transitive), `fileIds` (large file references), `tokenCount`.

The DAG structure means context maintains information at multiple zoom levels simultaneously. A depth-3 summary might cover an entire day's work in 2,000 tokens. Expanding one of its children reveals an hour's worth of decisions. Expanding further reaches individual messages. This is the "lossless" in lossless-claw — not lossless compression, but lossless *accessibility*.

### Compaction Lifecycle

**Ingestion path:**
1. `bootstrap` — On session start, reconciles JSONL session file with LCM database (crash recovery). Finds the "anchor" (most recent message in both), imports anything after it.
2. `ingest` / `ingestBatch` — Persists new messages to database, appends to `context_items`.
3. `afterTurn` — After model responds, evaluates whether compaction should run.

**Leaf compaction:**
1. Identify oldest contiguous chunk of raw messages outside the **fresh tail** (protected recent messages, default 64).
2. Cap chunk at `leafChunkTokens` (default 20K tokens).
3. Concatenate message content with timestamps.
4. Resolve most recent prior summary for continuity (`previous_context` prevents the LLM from repeating known information).
5. Send to LLM with leaf prompt.
6. Normalize provider response (handles Anthropic text blocks, OpenAI output_text, nested content/summary shapes).
7. If normalization is empty, fall back to deterministic truncation.
8. If summary is larger than input (LLM failure), retry with aggressive prompt. If still too large, fall back to truncation.
9. Persist summary, link to source messages, replace message range in `context_items`.

**Condensation:**
1. Find shallowest depth with enough contiguous same-depth summaries (>= `leafMinFanout` for d0, >= `condensedMinFanout` for d1+).
2. Concatenate content with time range headers.
3. Send to LLM with depth-appropriate prompt.
4. Apply same escalation strategy.
5. Persist with depth = targetDepth + 1, link to parent summaries, replace range in `context_items`.

### Three-Level Escalation

Every summarization attempt follows this cascade:

1. **Normal** — Standard prompt, temperature 0.2, full target tokens
2. **Aggressive** — Tighter prompt requesting only durable facts, temperature 0.1, lower target tokens (half the normal target)
3. **Fallback** — Deterministic truncation to ~512 tokens with `[Truncated for context management]` marker

This is a critical reliability mechanism. The system guarantees compaction always makes progress, even if the LLM produces poor output, is rate-limited, or returns errors. The fallback is lossy but bounded — it always reduces token count. The LCM paper frames this as "guaranteed termination": unlike model-directed memory strategies that can enter infinite loops or stall, LCM's deterministic fallback ensures the system never gets stuck.

A practical lesson from community deployment: the `incrementalMaxDepth` default of 0 prevents re-summarization, causing rapid context overflow for long sessions. Setting it to -1 enables automatic compression of older summaries, making the system "scale to thousands of messages." This was a common gotcha identified in blog posts and setup guides.

### Context Assembly

The assembler runs before each model turn:

```
[summary_1, summary_2, ..., summary_n, message_1, message_2, ..., message_m]
 |--- budget-constrained evictable ----|  |--- fresh tail (always included) ---|
```

Steps:
1. Fetch all `context_items` ordered by ordinal
2. Resolve each — summaries become user messages with XML wrappers; messages reconstructed from parts
3. Split into evictable prefix and protected fresh tail (last `freshTailCount` raw messages)
4. Fresh tail is always included, even if over budget
5. Fill remaining budget from evictable set, keeping newest, dropping oldest
6. Normalize assistant content to array blocks (Anthropic API compatibility)
7. Sanitize tool-use/result pairing (every tool_result must have matching tool_use)

The key insight: "most turns stay inside native context and pay zero orchestration tax." Compaction happens asynchronously between turns. The system maintains context stability within the 30K-100K token range, allowing indefinite session length without degradation.

### XML Summary Format

Summaries are presented to the model as user messages in structured XML:

```xml
<summary id="sum_abc123" kind="leaf" depth="0" descendant_count="0"
         earliest_at="2026-02-17T07:37:00" latest_at="2026-02-17T08:23:00">
  <content>
    ...summary text with timestamps...
    Expand for details about: exact error messages, full config diff
  </content>
</summary>
```

Condensed summaries include parent references (`<summary_ref id="..."/>`), enabling the model to reason about which parent to expand for specific details. The XML attributes (kind, depth, descendant_count, time range) give the model metadata for reasoning about summary scope and age.

### Dynamic System Prompt

When summaries are present in assembled context, the assembler injects a dynamic system prompt addition:

- When lightly compacted: Gentle guidance to expand before asserting specifics
- When heavily compacted (depth >= 2 or condensed count >= 2): Stronger "uncertainty checklist" — "Am I making an exact factual claim from a compressed summary? Could compaction have omitted a crucial detail?" with explicit instructions to expand or state uncertainty

This is a sophisticated calibration mechanism: the system knows when it's operating from compressed context and adjusts its own confidence accordingly. The `systemPromptAddition` API in the ContextEngine interface enables this without modifying any static configuration.

### Expansion System

When summaries are too compressed, agents use `lcm_expand_query`:

1. Agent calls with a prompt and either `summaryIds` or a `query`
2. If query provided, `lcm_grep` finds matching summaries first
3. A **delegation grant** is created, scoping a sub-agent to relevant conversations with token caps
4. Sub-agent session spawned with the expansion task
5. Sub-agent walks the DAG: reads summary content, follows parent links, accesses source messages, inspects stored files
6. Returns focused answer (default <= 2000 tokens) with cited summary IDs
7. Grant revoked, sub-agent cleaned up

Security model: grants have TTLs (`delegationTimeoutMs`, default 120s), token caps (`maxExpandTokens`, default 4000 — community recommendation: increase to 12000 for real documents), and conversation scoping. Sub-agents get `lcm_expand` (low-level) but not `lcm_expand_query` (prevents recursive sub-agent spawning).

The `statelessSessionPatterns` configuration allows temporary sub-agent sessions to read from existing LCM context without creating or mutating LCM state — useful for delegated tasks that should benefit from retained context without polluting the database.

A discovered production bug revealed that perfect storage means nothing without functional retrieval — three formatting layers progressively stripped content, creating "a system where the AI had perfect memory storage and zero memory retrieval." This highlights the importance of end-to-end testing of the full store-summarize-retrieve pipeline.

### Large File Handling

Files embedded in messages exceeding `largeFileTokenThreshold` (default 25K tokens) are:
1. Extracted and stored to `~/.openclaw/lcm-files/<conversation_id>/<file_id>.<ext>`
2. Replaced with a compact reference in the message
3. Given a ~200 token exploration summary
4. Accessible via `lcm_describe` tool

This prevents a single large file paste from consuming the entire context window.

### Operator-Level Recursion

The LCM paper introduces constrained operator patterns that prevent unbounded recursion:

- **LLM-Map**: Stateless calls per JSONL item with concurrency (default 16 workers), JSON Schema validation, and automatic retries. No tool use, no state mutation.
- **Agentic-Map**: Sub-agent per item when tool use is needed, with declared scope and retained work requirements.
- **Scope-Reduction Invariant**: Non-root agents must declare both delegated scope and retained work when spawning children, preventing infinite delegation loops and ensuring structural termination.

## Design Tradeoffs

### Lossless vs. Lossy Compaction

The system's core promise is "nothing is lost" — raw messages stay in the database forever. But summaries are inherently lossy. The DAG creates an *access path* back to original content, not a *lossless encoding*. The expansion system bridges this gap, but it requires an LLM call and sub-agent spawn to recover detail.

The deterministic fallback truncation (level 3 escalation) is explicitly lossy — it just keeps the first 512 tokens. The system guarantees token reduction, not information preservation, at the fallback level. The paper's analogy is apt: it's a notebook with a table of contents, not a compression algorithm. The "lossless" claim refers to the immutable store, not to the summaries.

### Fresh Tail Size

The `freshTailCount` (default 64) determines how many recent messages are always included without compression. Higher values give more immediate context but leave less budget for summaries. Lower values compress more aggressively. 64 is generous — it protects the last ~32 conversation turns from compaction. Community guides recommend this as a reasonable default for most use cases.

### Incremental vs. Full Sweep

Incremental compaction (one leaf pass per turn, optional condensation) is efficient but can leave the DAG shallow. Full sweep (repeated passes until no progress) is thorough but can be slow and token-expensive. The `incrementalMaxDepth` parameter balances this: -1 enables unlimited cascading (recommended for long sessions), 0 is leaf-only (the overly conservative default), and 1 gives one condensed pass after each leaf compaction.

### Single Model vs. Dedicated Summary Model

The `summaryModel` and `summaryProvider` config allows using a cheaper model (e.g., Haiku, Qwen3-8B, Mistral-7B) for compaction while the main session uses an expensive model (e.g., Opus). Similarly, `expansionModel` pins a fast model for `lcm_expand_query` sub-agents. Community recommendations for local deployment: Qwen3-8B or Llama 3.3-8B for summarization (16GB+ RAM), Llama 3.2-3B or Phi-4-mini for expansion (speed over reasoning quality).

This is an important cost optimization — summarization is high-volume, low-complexity work that doesn't need the most capable model. The expansion model should prioritize speed since sub-agents have timeout constraints; oversized reasoning models fail silently.

### Operation Serialization

All mutating operations are serialized per-session via a promise queue. This prevents races between concurrent afterTurn/compact calls for the same conversation. The tradeoff: no parallel compaction within a single conversation, but conversations don't block each other.

## Failure Modes & Limitations

1. **Summary quality degradation at depth** — Each condensation layer loses information. At depth 3+, summaries are highly abstract and may lose specific details that the agent needs. The expansion system mitigates this but adds latency (5-15 seconds for sub-agent spawn + LLM call).

2. **Provider auth failures** — If the summary model's credentials expire or are rate-limited, compaction stalls. The circuit breaker pattern (track failures, back off) prevents infinite retries, but context continues growing until auth is resolved.

3. **Oversized summaries** — If the LLM ignores target token instructions and produces summaries larger than the input, the system escalates to aggressive, then to truncation. But truncation at 512 tokens can lose significant context from a 20K token input chunk.

4. **Session reconciliation edge cases** — The bootstrap reconciliation relies on finding an "anchor" message. If the JSONL session file is severely corrupted or messages were reordered, the anchor search may fail or import duplicate content.

5. **Token estimation inaccuracy** — The system uses `chars/4` as a token estimate throughout. This is rough — actual tokenization varies by model, language, and content type. For code-heavy conversations, the estimate can be significantly off. The CJK-aware fork (`win4r/lossless-claw-enhanced`) addresses this for Chinese/Japanese/Korean text.

6. **No cross-conversation retrieval** — Each conversation has its own DAG. There's no mechanism to search across conversations or share summaries between sessions. The `lcm_grep` tool searches within a conversation's scope.

7. **Condensation minimum fanout** — The system requires at least `leafMinFanout` (default 8) leaf summaries before condensation triggers. For short conversations, this means no condensation occurs, and the DAG stays flat.

8. **Prompt template rigidity** — The depth-specific prompts (d1, d2, d3+) are hard-coded templates. Different domains (code review vs. creative writing vs. research) might benefit from different summarization strategies, but there's no customization mechanism.

9. **Retrieval formatting bug class** — Community experience revealed that content can survive storage perfectly but become inaccessible due to formatting normalization layers stripping content between storage and retrieval. End-to-end retrieval testing is essential, not just storage verification.

## Integration Patterns

### As an OpenClaw Plugin

Installed via `openclaw plugins install @martian-engineering/lossless-claw`. Registers as a `contextEngine` slot, replacing OpenClaw's built-in sliding-window compaction. Configuration: `plugins.slots.contextEngine: "lossless-claw"`. The plugin manifest (`openclaw.plugin.json`) declares the slot type and entry point.

For hosted environments, OpenClaw Setup provides a toggle in Instance Settings that handles installation, configuration, and restart automatically.

### Volt: The Standalone Agent

Martian Engineering also ships **Volt**, a terminal-based AI coding agent that uses LCM natively rather than as a plugin. Volt is described as "a coding agent with lossless context management" and serves as the reference implementation for the LCM architecture. On the OOLONG benchmark (`trec_coarse`), Volt achieves 74.8 average vs. Claude Code's 70.3 (+4.5 delta), with the performance gap widening at higher context lengths (+10.0 at 256K, +12.6 at 512K tokens).

### Tool-Augmented Recall

Three tools give agents explicit control over memory:
- `lcm_grep` — FTS5-powered full-text search with BM25 ranking
- `lcm_describe` — Summary metadata and large file content retrieval
- `lcm_expand_query` — Sub-agent-based detail recovery from compressed summaries

The dynamic system prompt teaches the agent when to use these tools: "Before answering with exact commands, SHAs, paths, timestamps, config values, or causal chains, expand for the missing detail."

### Session Lifecycle Integration

The plugin hooks into OpenClaw's session lifecycle:
- `/new` keeps the conversation but prunes context items, retaining summaries at configurable depth
- `/reset` archives the conversation and creates a new one
- `newSessionRetainDepth` controls how much summary structure survives `/new`

### Bundled Skill

The `skills/lossless-claw/` directory contains a SKILL.md with reference documents (architecture, session lifecycle, recall tools, config, diagnostics). This teaches Claude Code about the plugin's capabilities without reading source code.

### Ecosystem Forks

Community extensions include:
- **lossless-claw-enhanced** (`win4r/lossless-claw-enhanced`) — Fork with CJK-aware token estimation for Chinese/Japanese/Korean text
- **MYaelMendez/lossless** — Community fork with additional features

## Benchmarks & Performance

### OOLONG Benchmark (Published)

Volt (using LCM) vs. Claude Code on the OOLONG `trec_coarse` benchmark, both using Opus 4.6:

| Context Length | Volt | Claude Code | Delta |
|---------------|------|-------------|-------|
| Average | 74.8 | 70.3 | +4.5 |
| 256K | - | - | +10.0 |
| 512K | - | - | +12.6 |

Relative gains over raw Opus 4.6: Volt +29.2, Claude Code +24.7. The performance gap widens at longer context lengths, validating the DAG approach for extended sessions.

### Operational Characteristics

- **Compaction latency** — One LLM call per leaf pass (~1-3 seconds depending on model and chunk size)
- **Assembly latency** — Pure in-memory operation reading from SQLite (~milliseconds)
- **Expansion latency** — Sub-agent spawn + LLM call (~5-15 seconds)
- **Storage** — SQLite with WAL mode. All messages stored indefinitely.
- **Context stability** — Maintains 30K-100K token range regardless of conversation length
- **Zero-cost turns** — Most turns stay inside native context, paying no orchestration overhead
- **Token overhead** — Summary model cost scales with conversation length. Using Haiku/local models for summaries significantly reduces cost vs. using the primary model.

### Configuration Tuning

| Parameter | Default | Effect |
|-----------|---------|--------|
| `freshTailCount` | 64 | Higher = more raw context, less room for summaries |
| `leafChunkTokens` | 20000 | Higher = fewer, larger summaries; lower = more, smaller |
| `contextThreshold` | 0.75 | Triggers compaction at 75% of context window |
| `incrementalMaxDepth` | 0 (set to -1) | 0 = leaf-only, -1 = unlimited cascading (recommended) |
| `maxExpandTokens` | 4000 (set to 12000) | Budget for expansion retrieval (community: triple default) |
| `delegationTimeoutMs` | 120000 | Timeout for expansion sub-agents |

## Implications for Meta-KB

Lossless-claw's DAG summarization is the most sophisticated approach to progressive context compression in this research set. The key insight for meta-kb: **summaries should form a hierarchy, not a flat list**. A flat list of summaries from all sources would overwhelm the context window just like raw content does. A DAG allows different zoom levels — high-level themes (depth 2+), topic-specific summaries (depth 1), and source-level detail (depth 0).

The three-level escalation pattern (normal -> aggressive -> deterministic fallback) is worth adopting for any LLM-powered compilation pipeline. LLM calls are unreliable — having a guaranteed-progress fallback prevents the pipeline from stalling.

The "Expand for details about:" footer on summaries is a clever retrieval cue. It tells the agent what's behind the summary without including the detail. Meta-kb's wiki pages could include similar expansion hints pointing to source material.

The dynamic system prompt that adjusts confidence calibration based on compression depth is a novel pattern. When operating from highly compressed context, the system explicitly tells itself to be uncertain. This could apply to meta-kb's compiled wiki: pages compiled from many sources could include confidence signals about claim support density.

The dual-state architecture (immutable store + derived active context) maps directly to meta-kb's own design: raw sources are the immutable store, wiki pages are the derived active context. The lesson is that derived views should always maintain traceable links back to source material, and that retrieval from the source must be tested end-to-end, not just assumed to work because storage succeeded.

The OOLONG benchmark results validate that deterministic, engine-managed context compression outperforms model-directed memory strategies at scale. For meta-kb, this suggests that compilation should be orchestrated by deterministic pipeline logic rather than relying on the LLM to manage its own context during generation.

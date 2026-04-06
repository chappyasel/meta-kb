---
entity_id: compaction-tree
type: concept
bucket: context-engineering
abstract: >-
  A compaction tree is a hierarchical summarization pipeline that compresses
  conversation history through successive abstraction levels (raw → daily →
  weekly → monthly → root index), enabling agents to maintain awareness of all
  past context at fixed token cost rather than growing linearly with history
  length.
sources:
  - repos/helloruru-claude-memory-engine.md
  - repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
related: []
last_compiled: '2026-04-05T23:15:34.018Z'
---
# Compaction Tree

## What It Is

A compaction tree is a hierarchical summarization structure that organizes conversation or session history into progressively more compressed representations. Instead of storing raw logs indefinitely (unbounded token growth) or discarding them (information loss), a compaction tree maintains a chain of abstraction levels where each level summarizes its predecessor. The apex of the tree is a small, always-loaded index that gives an agent zero-search-cost awareness of everything below it.

The structure solves a specific problem: an agent cannot search for context it does not know exists. RAG and BM25 search require a query, and a query requires suspecting that relevant information exists. A compaction tree inverts this by keeping a compressed map of all known topics in the active context window at all times.

## The Core Mechanism

### Chain Structure

The canonical implementation has five levels:

```
Raw daily logs → Daily compaction nodes → Weekly nodes → Monthly nodes → Root index
```

Each level reads only from its immediate predecessor. Skipping levels is explicitly forbidden in well-designed implementations because it allows corrupted or inconsistent summaries to propagate upward without passing through intermediate validation.

In the Hipocampus system ([Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md)), this chain lives at:

```
memory/YYYY-MM-DD.md     → raw (permanent, never modified)
memory/daily/            → daily compaction nodes
memory/weekly/           → weekly index nodes  
memory/monthly/          → monthly index nodes
memory/ROOT.md           → always-loaded topic index (~3K tokens)
```

### Smart Thresholds

Below a line-count threshold, a compaction node is created by copying or concatenating source files verbatim. Zero LLM cost, zero information loss. Above threshold, an LLM generates a keyword-dense summary.

From the Hipocampus implementation (`cli/compact.mjs`):

| Level | Threshold | Below threshold | Above threshold |
|-------|-----------|-----------------|-----------------|
| Raw → Daily | ~200 lines | Copy verbatim | LLM summary |
| Daily → Weekly | ~300 lines combined | Concatenate | LLM summary |
| Weekly → Monthly | ~500 lines combined | Concatenate | LLM summary |
| Monthly → Root | Always | Recursive recompaction | — |

Typical daily usage stays below threshold, so most compaction runs cost zero LLM calls. Above-threshold nodes are marked `status: needs-summarization` by the mechanical script and then processed by the agent.

### Fixed vs. Tentative Lifecycle

Every compaction node carries a `status` field in its YAML frontmatter:

- **Tentative**: regenerated when new data arrives
- **Fixed**: immutable

Daily nodes become fixed when the calendar date changes. Weekly nodes fix when the ISO week ends plus seven days. Monthly nodes fix when the month ends plus seven days. The root index is always tentative because it accumulates continuously and self-compresses when it exceeds its token budget.

This lifecycle prevents unnecessary recompaction while ensuring that nodes covering active time periods remain updatable.

### The Root Index

ROOT.md sits at the apex with four functional sections:

```markdown
## Active Context (~7 days)
Current priorities and in-progress work.

## Recent Patterns
Cross-cutting insights not tied to a specific time.

## Historical Summary
- 2026-01~02: initial design, K8s launch
- 2026-03: open-source release, search integration

## Topics Index
- hipocampus [project, 2d]: compaction tree, ROOT.md → spec/
- legal [reference, 14d]: Civil Act §750, tort → knowledge/legal.md
- payment-api [project, 8d]: rate limiting, token bucket
```

Each Topics Index entry carries a type tag and age in days. The agent scans this at O(1) cost before deciding whether to drill into the tree for more detail. Type tags control compaction behavior: `user` and `feedback` entries never compress away; `project` entries compress into Historical Summary after completion; `reference` entries accumulate staleness markers (`[?]`) after 30 days without verification.

## Why This Matters for Context Engineering

The compaction tree addresses a structural gap that search cannot fill. Vector search and BM25 both require a query. A query requires the agent to suspect that relevant context exists. If an agent worked on API rate limiting three weeks ago and now receives a task about a payment endpoint, no automatic query connects these unless the agent already knows to look.

The MemAware benchmark (900 implicit context questions across three months of conversation history, evaluated on the Hipocampus system) quantifies this gap:

| Method | Overall | Hard (cross-domain) |
|--------|---------|---------------------|
| No memory | 0.8% | 0.7% |
| BM25 search | 2.8% | 2.0% |
| BM25 + vector | 3.4% | 0.7% |
| Compaction tree only | 9.2% | 7.3% |
| Tree + vector | 17.3% | 8.0% |
| Tree + vector (10K root) | 21.0% | 8.0% |

These benchmarks are self-reported by the Hipocampus project against its own MemAware benchmark suite; independent validation does not exist at time of writing. The Hard tier (zero keyword overlap between query and context) is where the gap is most pronounced: vector search scores 0.7% while the compaction tree alone scores 7.3%. Search cannot make cross-domain connections because it has no mechanism to surface relevant context that shares no vocabulary with the query.

The Hard tier also reveals a ceiling: increasing ROOT.md from 3K to 10K tokens improves Easy questions (26% → 34%) but leaves Hard questions flat at 8.0%. The bottleneck shifts from index coverage to the answer model's ability to reason across domains. Structured indexing alone cannot solve the hardest implicit recall problems.

## Token Economics

Loading ROOT.md at ~3K tokens into every API call has a fixed per-call cost. On models with prompt caching (Claude's cache breakpoint system), this stable content achieves approximately 90% cache hit rates, reducing effective cost to roughly 300 tokens per call. Compare this to alternatives:

- Full context dump: 500K+ tokens per call
- Multiple search queries: 5–10K tokens for adequate coverage, plus no guarantee of surfacing unknown unknowns

The compaction tree's cost is predictable and bounded regardless of how many months of history accumulate below it.

## Memory Type System

Well-implemented compaction trees classify entries by type to apply different preservation rules:

- **`user`**: Identity, preferences, expertise. Always preserved. Never compresses to Historical Summary.
- **`feedback`**: User corrections on approach. Preserved with rule/why/how-to-apply structure. Never compressed.
- **`project`**: Technical decisions, work history. Compresses to Historical Summary when the project completes. Active projects stay in Active Context.
- **`reference`**: External pointers (URLs, tools). Preserved with staleness markers.

This type system ensures the most valuable long-term information (who the user is, what corrections they have made) survives indefinitely, while project details age out naturally.

## Retrieval Protocol

A compaction tree enables a tiered retrieval strategy:

1. **Root index scan (O(1))**: Agent checks Topics Index for keyword match. Resolves most queries without reading any additional files.
2. **Manifest-based LLM selection**: For cross-domain queries where keywords do not match, read only the YAML frontmatter from weekly/monthly nodes (under 500 tokens), then use the LLM to select the top relevant files. This enables semantic matching without loading full file contents.
3. **Search fallback**: BM25 or vector search for specific keyword retrieval when the tree does not surface a match.

Step 2 is notable because it uses the LLM's semantic understanding to bridge vocabulary gaps (e.g., Korean "배포" matching English "deployment") at minimal token cost by exposing only frontmatter rather than full node contents.

## Failure Modes

**No contradiction detection.** If a decision changes over time, both the old and new version can coexist in different compaction nodes. The type system partially addresses this (feedback entries can override project entries), but there is no explicit resolution mechanism. An agent might retrieve outdated context alongside current context and combine them incorrectly.

**LLM summarization quality.** Above-threshold compaction depends on the LLM generating accurate, keyword-dense summaries. Poor summaries silently lose information. Raw logs are kept permanently as a recovery mechanism, but the agent must know to traverse down to them, and degraded summaries may not signal that detail was lost.

**ROOT.md size pressure.** A 3K token budget covering all past topics creates crowding for agents working on many simultaneous projects. Configuring a larger budget (10K tokens) helps with Easy recall but costs more per call and does not resolve Hard cross-domain reasoning.

**Cold start sparseness.** On the first day, ROOT.md has minimal content. The tree structure exists immediately, but the index is sparse. The system improves only as history accumulates.

**Single-agent scope.** A compaction tree represents one agent's memory. No mechanism exists for sharing or merging trees across multiple agents, which limits applicability to multi-agent pipelines.

## Infrastructure Assumption

Compaction trees as implemented in file-based systems (Hipocampus, Claude Memory Engine) assume the agent has persistent access to a local filesystem or repository between sessions. In ephemeral serverless deployments where each invocation starts fresh, the tree either must be stored externally (blob storage, database) and loaded at session start, or the architecture requires redesign. The file-based approach that makes the system zero-infrastructure for local development becomes an integration problem for cloud deployment.

## When Not to Use a Compaction Tree

**Single-session tools.** If an agent completes its work within one context window and never needs cross-session memory, the overhead of maintaining and traversing a compaction tree adds complexity without benefit.

**Structured data with known schemas.** If the information being stored has a predictable structure (code, logs, configuration), a purpose-built index or database will outperform a hierarchical text summarization chain. Compaction trees excel at unstructured conversation history where the relevant dimensions are not known in advance.

**Hard cross-domain reasoning at scale.** The benchmark data shows a ceiling at 8% on Hard questions regardless of root index size. If the primary use case involves connecting semantically distant concepts across long time horizons, a compaction tree buys roughly 10x improvement over search but does not solve the problem. The bottleneck becomes the answer model's reasoning ability, not the index.

**High-frequency write workloads.** Compaction is triggered periodically, not on every write. Systems that need immediate consistency between writes and reads (real-time collaborative agents, systems where two agents must share the same memory) face synchronization challenges.

## Unresolved Questions

The concept as documented in available implementations leaves several questions open:

- **Conflict resolution across agents.** No specification exists for merging two independent compaction trees that may have divergent summaries of the same events.
- **Summarization verification.** No mechanism checks whether an above-threshold LLM summary accurately represents its source. Information loss is silent.
- **Optimal threshold calibration.** The 200/300/500 line thresholds in Hipocampus are empirically tuned to typical usage but have no theoretical basis. Heavy usage days that exceed thresholds incur LLM costs that are difficult to predict in advance.
- **Cross-language consistency.** The system claims cross-language keyword matching (Korean/English), but no benchmark isolates this capability or measures its reliability.

## Implementations

**Hipocampus** ([Source](../raw/repos/kevin-hs-sohn-hipocampus.md)): The most complete public implementation. File-based, zero infrastructure, Claude Code and OpenClaw integration. The `cli/compact.mjs` script handles mechanical compaction (JSONL extraction, secret scanning, threshold checking); LLM handles above-threshold summarization. 145 stars, MIT license, self-reported benchmarks.

**Claude Memory Engine** ([Source](../raw/repos/helloruru-claude-memory-engine.md)): An overlapping approach using hooks and markdown files for a learning-focused memory system. Uses session checkpoints and reflection cycles rather than a strict compaction hierarchy, but addresses the same core problem of cross-session context persistence.

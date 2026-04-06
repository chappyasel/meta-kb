---
entity_id: recursive-summarization
type: approach
bucket: context-engineering
abstract: >-
  Recursive summarization compresses long text into progressively shorter
  representations by summarizing summaries, enabling LLM-based systems to handle
  histories that exceed context windows. Key differentiator: it preserves
  coverage over time-ordered content where retrieval-based approaches would miss
  unknown-unknown connections.
sources:
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
related: []
last_compiled: '2026-04-05T23:18:32.589Z'
---
# Recursive Summarization

## What It Is

Recursive summarization compresses content by applying summarization repeatedly across levels of abstraction. A session transcript becomes a daily summary. Multiple daily summaries become a weekly node. Weeks become months. Months collapse into a root index. Each level reads only from the level below it, producing progressively shorter representations of progressively longer time spans.

The technique addresses a structural problem with LLM-based systems: context windows are finite, but useful history is not. A single conversation session might run 5,000 tokens. A year of sessions runs tens of millions. No model reads tens of millions of tokens per query. Recursive summarization lets systems maintain awareness of old content without loading it.

## Why It Matters

The alternative approaches each fail at different points. Dumping full history into context is expensive and attention degrades over long sequences. RAG retrieval requires a query, which requires the system to already suspect that relevant information exists. Static memory files overflow after a few weeks.

Recursive summarization handles a case the others cannot: **unknown unknowns**. When a user asks about a payment flow refactor, nothing in that query suggests searching for rate limiting decisions made three weeks ago. A retrieval system never issues that search. A compaction tree surfaced those decisions in the always-loaded root index, so the agent sees the connection without needing to look for it.

The [hipocampus](https://github.com/kevin-hs-sohn/hipocampus) project quantifies this on the MemAware benchmark (900 implicit recall questions across 3 months of history): BM25 search scores 2.8% overall, while a compaction tree with vector search scores 17.3% — 5.1x better. On hard questions with zero keyword overlap between query and relevant content, vector search scores 0.7%; the compaction tree scores 8.0%. That gap is structural. Search cannot find connections it was never asked to find. The compaction tree can surface them because the root index is always present. (Benchmarks are self-reported by the hipocampus authors via their own MemAware benchmark.)

## How It Works

### The Compression Chain

A typical implementation runs five levels:

```
Raw logs → Daily nodes → Weekly nodes → Monthly nodes → Root index
```

Each level compresses its source into a shorter representation. The key constraint: each level reads **only** from the level directly below it, never from raw data two levels down. This prevents inconsistency that would arise from mixing compression granularities and keeps the pipeline deterministic.

Below a size threshold, the operation is verbatim concatenation — no information loss, no LLM call. Above the threshold, an LLM generates a keyword-dense summary. Hipocampus uses thresholds of roughly 200 lines (raw to daily), 300 lines (daily to weekly), and 500 lines (weekly to monthly). Monthly-to-root always uses LLM compression.

This threshold design matters for cost. Most daily sessions stay under 200 lines, so most compaction runs zero LLM calls. The expensive path only triggers for heavy days.

### The Root Index

The top of the tree is a small always-loaded document — around 3,000 tokens — that gives the system O(1) awareness of everything it has ever discussed. In hipocampus this is `memory/ROOT.md`, structured as:

- **Active Context**: work from the last 7 days
- **Recent Patterns**: cross-cutting observations not tied to specific dates
- **Historical Summary**: timeline compressed into date ranges ("2026-01 to 02: initial design, K8s launch")
- **Topics Index**: each entry carries a type tag, age in days, and optional pointer to a deeper file

The Topics Index is the core retrieval surface. An entry might read: `hipocampus [project, 2d]: compaction tree, ROOT.md, skills → spec/`. When a query arrives, the system scans this index for matches within roughly one semantic hop and fetches deeper files only when a match is found.

### Fixed vs. Tentative Nodes

Every compaction node carries a `status` field: `tentative` or `fixed`. Tentative nodes regenerate when new data arrives. Fixed nodes are immutable.

Daily nodes become fixed when the date changes. Weekly nodes fix when the ISO week ends plus 7 days. Monthly nodes fix when the month ends plus 7 days. The root is always tentative — it accumulates indefinitely and self-compresses when it exceeds its token budget.

This lifecycle prevents unnecessary recomputation. A compaction run only touches nodes that are still tentative, which for a mature history means almost nothing except the current day's node and the root.

### Type-Aware Compression

Not all content deserves equal treatment. Hipocampus classifies memory entries into four types with different compaction rules:

| Type | Behavior |
|------|----------|
| `user` | Never compressed. Identity and preferences survive indefinitely. |
| `feedback` | Never compressed. User corrections on agent behavior are always preserved verbatim. |
| `project` | Compressed into Historical Summary when a project closes. Active projects stay in Active Context. |
| `reference` | Preserved with staleness markers — `[?]` after 30 days without verification. |

This means a user's preference for Python over Go survives five years of compression. A completed project's technical decisions compress into a single dated line in the historical summary. The system retains what matters long-term and lets transient details fade.

### Recall as a Fallback Chain

Summarization handles compression. Retrieval works as a three-step chain:

1. **Root index scan (O(1))**: Check the Topics Index for keyword matches. Resolves most queries without reading any other file.
2. **Manifest-based LLM selection**: For cross-domain queries where keywords don't match, read only the YAML frontmatter of weekly and monthly nodes (under 500 tokens total), then use an LLM to select the 5 most relevant files. This handles cases like "배포" matching "deployment" or "CI/CD" matching "github-actions" without loading full file contents.
3. **Hybrid search**: BM25 plus vector search as a fallback for specific keyword retrieval.

The auto-harness project (NeoSigma) uses recursive summarization in the same pattern for a different problem: sub-agents handling verbose production traces, returning only summaries to a parent agent. Their framing is direct — "Sub-agents own their own output and the parent only sees the summary. This helps manage bloated context across long-running tasks." This prevents the parent agent's context from filling with trace noise across long-running improvement loops.

## Concrete Failure Modes

**Information loss is cumulative and silent.** Each LLM summarization step discards details. A nuanced technical caveat mentioned on day 3 may survive as a week-level bullet, disappear at monthly compression, and leave no trace in the root. The original raw log still exists (never deleted), but the system never surfaces it unless something queries that specific day. No mechanism detects what was lost.

**No contradiction resolution.** If a user reverses a technical decision, both the old and new decision can coexist in different compaction nodes. The type system partially addresses this for `feedback` entries (corrections override project decisions), but two `project` nodes from different months can hold incompatible facts without any flag.

**Cross-domain reasoning plateaus.** MemAware hard-tier questions (zero keyword overlap, cross-domain) cap at 8% regardless of root index size. Expanding ROOT.md from 3K to 10K tokens improves easy questions (26% to 34%) but does not move the hard tier. The bottleneck shifts from the index to the answer model's ability to make cross-domain inferences. Recursive summarization solves the coverage problem, not the reasoning problem.

**Summarization quality depends on the model.** Above-threshold compression quality is entirely a function of what the LLM produces. A bad summary at the daily level propagates upward. The system has no verification layer.

## When Not to Use It

Recursive summarization is the wrong tool when:

- **Content requires exact recall.** Legal documents, contracts, code diffs — anything where a lossy summary creates liability or bugs. The technique trades precision for coverage.
- **History is short.** For sessions under a few weeks, a flat memory file or full-context loading costs less and loses nothing. The compaction tree adds overhead that only pays off at scale.
- **Queries are known in advance.** If the retrieval pattern is always explicit search ("find the rate limiting discussion"), RAG retrieval is cheaper and more targeted. Recursive summarization's advantage is specifically for implicit, unknown connections.
- **Multi-agent shared memory is required.** Compaction trees are per-agent. There is no merge or sync mechanism. A team of agents each builds its own tree with potentially conflicting summaries.

## Implementation Assumptions

The technique assumes a few things its documentation does not always make explicit:

**Stable document order.** The compression chain assumes logs arrive in time order and that the compaction pipeline runs reliably between sessions. Out-of-order writes or skipped compaction runs produce corrupt nodes.

**Persistent raw storage.** The architecture only works if raw logs are never deleted. Compression can be lossy upward, but recovery requires the originals. This is a storage cost that grows indefinitely.

**Model consistency.** If the underlying model changes between compaction runs, summaries from different periods may use incompatible formats, keyword densities, or semantic conventions. The Topics Index becomes harder to scan coherently over time.

**Token budget tuning per use case.** A 3K-token root index holds roughly 39 topics (hipocampus default). A team working across 10 active projects plus infrastructure concerns fills this in under a month. The `rootMaxTokens` config must be tuned explicitly, and the right value depends on work volume, not on a general recommendation.

## Alternatives

| Approach | Use when |
|----------|----------|
| **Full context loading** | History fits in the context window and cost is acceptable. No compression needed. |
| **RAG / vector retrieval** | Queries are explicit and known. Fast, cheap, precise for known unknowns. |
| **Flat memory files** | Early sessions (under 2-3 weeks), simple use cases, or when no compaction infrastructure exists. |
| **Recursive summarization** | Long multi-session history, implicit cross-domain recall, agent systems where the agent must notice connections without being asked. |

## Related Concepts

Context graphs extend this idea from temporal compression to decision-trace graphs — preserving not just what happened but the reasoning connecting observations to actions. Where recursive summarization compresses by time, context graphs index by causal relationship. They address a different failure mode: not "I forgot this happened" but "I don't know why this decision was made."

The auto-harness pattern shows recursive summarization applied to a continuous improvement loop: failures cluster into patterns, sub-agents summarize traces, parent agents see only the summary, and regression gates prevent backsliding. The technique there is less about memory across time and more about managing context within a single long-running operation.

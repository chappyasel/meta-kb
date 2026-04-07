---
entity_id: progressive-disclosure
type: approach
bucket: context-engineering
abstract: >-
  Progressive disclosure is a context management technique that feeds an agent
  information in ordered tiers — summary first, full content on demand — so that
  context window space is spent only on what the current task requires, rather
  than preloading everything upfront.
sources:
  - repos/memodb-io-acontext.md
  - repos/thedotmack-claude-mem.md
  - repos/michaelliv-napkin.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
related:
  - agent-skills
  - obsidian
  - claude-code
  - openclaw
  - openai
  - anthropic
  - claude
  - bm25
  - embedding-model
  - gemini
  - synthetic-data-generation
last_compiled: '2026-04-07T11:41:07.957Z'
---
# Progressive Disclosure

## What It Is

Progressive disclosure is a context management strategy where information is revealed to an agent in ordered tiers based on demonstrated need, rather than loaded entirely at session start. The agent receives a compressed summary first (a map), calls tools to retrieve more detail when relevant (navigation), and loads full content only for the specific items it needs (read). Each tier costs more tokens than the previous, so the agent pays only for the depth it actually uses.

The term originates in user interface design, where complex controls are hidden behind simpler ones until a user explicitly requests them. In agent systems, the same principle applies to context: expose structure first, details second, raw content last.

## Why It Matters

Context windows are finite and expensive. The naive approach — concatenating all available documents into a system prompt — fails in three ways: it fills the window before the agent starts working, it dilutes signal with irrelevant content, and it provides no mechanism for the agent to navigate to new information during a task.

The alternative, semantic search via embedding models, introduces its own problems: a smaller, less capable model makes retrieval decisions (what to show the main model) before the main model has any visibility into what exists. The main model then reasons over whatever the retrieval step returned, with no ability to correct a bad retrieval decision.

Progressive disclosure avoids both failure modes. The agent sees a cheap summary of what exists, uses its full reasoning capability to decide what to fetch, and retrieves only relevant content. Retrieval becomes a reasoning task, not a preprocessing step.

## How It Works

### The Four-Level Pattern

[Napkin](../projects/napkin.md) formalizes this as four discrete levels, each with a characteristic token budget:

| Level | Mechanism | Tokens | Purpose |
|-------|-----------|--------|---------|
| 0 | Pinned note (NAPKIN.md / CLAUDE.md) | ~200 | Project conventions, always loaded |
| 1 | Overview (TF-IDF keyword map) | ~1–2K | Directory-level topic summary, navigation |
| 2 | Search results with snippets | ~2–5K | Ranked matches for a specific query |
| 3 | Full file content | ~5–20K | Complete document when needed |

Level 0 loads automatically. The agent invokes Levels 1–3 through explicit tool calls, paying incrementally as it needs more depth.

### The Overview as a Map

Level 1 is the most important layer. Rather than requiring the agent to guess what files exist, the overview provides a topical fingerprint of the entire knowledge base without exposing full content.

Napkin's `getOverview()` (in `src/core/overview.ts`) computes this using weighted TF-IDF across directories: headings get 3x weight, filenames and frontmatter titles 2x, body text 1x. Unigrams and bigrams are extracted with bigram suppression (if a bigram is selected, its constituent unigrams are suppressed to avoid redundancy). The output looks like:

```
architecture/
  keywords: overview, dependencies, design
  notes: 9
```

This costs roughly 1–2K tokens regardless of vault size. An agent reading this output knows whether `architecture/` is worth searching before spending tokens on a search call.

### BM25 Search as Level 2

When the overview suggests a directory is relevant, the agent calls a search function. Napkin's `searchVault()` (in `src/core/search.ts`) uses MiniSearch, a JavaScript BM25 implementation, with a composite three-signal ranking:

```
composite = BM25_score + backlink_count × 0.5 + recency_normalized × 1.0
```

BM25 handles term frequency matching. The backlink count adds a graph signal — files that many other files link to are likely central concepts. Recency (normalized mtime) acts as a tiebreaker for equally relevant documents.

Search results include contextual snippets around matching lines rather than the full document. Scores are hidden from output intentionally: if an agent sees numerical confidence values, it anchors on the numbers rather than evaluating snippet content. The ordering expresses the score; the agent makes relevance judgments from text.

### Tool-Driven Disclosure in Acontext

[Acontext](../projects/openclaw.md) implements progressive disclosure differently. Rather than keyword search, it gives agents three explicit tool calls:

1. `list_skills` — what skill categories exist
2. `get_skill` — list files within a skill
3. `get_skill_file` — read specific file content

The design philosophy is explicit: "The agent decides what context it needs through reasoning, not through semantic similarity scoring." The `SKILL.md` file at the root of each skill directory acts as a manifest that guides the agent to relevant data files. This is deterministic and requires no embedding infrastructure, but it requires the agent to reason well about which skills might be relevant to a given task.

### The Agent Skills Specification

[Anthropic](../projects/anthropic.md)'s Agent Skills specification (agentskills.io, adopted by [Claude Code](../projects/claude-code.md), [OpenClaw](../projects/openclaw.md), Codex, Copilot, and Gemini CLI) formalizes progressive disclosure as a three-layer standard:

1. **Metadata** (~100 tokens): `name` and `description` fields from YAML frontmatter, loaded at startup for all skills
2. **Instructions** (&lt;5000 tokens recommended): Full SKILL.md body, loaded when a skill activates
3. **Resources** (as needed): Files in `scripts/`, `references/`, `assets/`, loaded only when the agent requests them

The description field serves as the activation trigger — the agent runtime matches user intent against descriptions to decide which skills to load. [Obsidian](../projects/obsidian.md)'s official skills package demonstrates this: the obsidian-bases skill's SKILL.md (~6K tokens) is only loaded when the agent is working with `.base` files, and the `FUNCTIONS_REFERENCE.md` (~3K additional tokens) is only loaded when formula detail is needed.

### Caching and Latency

Napkin's `src/utils/search-cache.ts` maintains a fingerprint-based cache: it computes an MD5 hash of all file paths concatenated with their modification timestamps. If the fingerprint matches the cached version, the serialized MiniSearch index loads from disk. The first search in a session pays the full indexing cost (O(N) in file count); subsequent searches in the same session are near-instant.

Acontext's tool-call approach has different latency characteristics: 2–3 tool calls per retrieval sequence, each involving a database query plus optional S3 read, typically under 100ms per call. Total retrieval latency runs 200–500ms to load a relevant skill.

## Where It's Implemented

**Napkin** uses the four-level model directly, with BM25 + backlinks + recency for Level 2 retrieval. No vector database required. Benchmark results on LongMemEval-S: 91% accuracy vs 86% for the best prior embedding-based system (self-reported by the napkin project, not independently validated).

**Acontext** uses tool-call-based disclosure with the skill directory hierarchy as the navigation structure. Three tool calls replace search entirely. The LLM-as-judge distillation pipeline writes structured markdown skills that the agent later navigates using `list_skills` → `get_skill` → `get_skill_file`.

**Obsidian skills** (via the Agent Skills spec) implement the metadata → instructions → resources progression. The obsidian-bases skill demonstrates the tradeoff: basic Bases operations need only the SKILL.md; complex formula work additionally loads FUNCTIONS_REFERENCE.md. Total cost for all five Obsidian skills loaded simultaneously: ~20K tokens.

**[Claude Code](../projects/claude-code.md)** uses [CLAUDE.md](../concepts/claude-md.md) as its Level 0 pinned context and tool calls for deeper retrieval. The [Model Context Protocol](../concepts/mcp.md) provides a standardized interface for Level 2–3 tool calls across different data sources.

## Practical Implications

**Token budget allocation**: For a 200K context window, Level 0 + 1 costs ~2–3K tokens, leaving 197K for actual work. Loading all content from a medium knowledge base (500 files, 1K tokens average) would cost 500K tokens — impossible in a single context. Progressive disclosure makes large knowledge bases tractable.

**Note granularity matters**: Napkin's benchmark analysis shows that per-round notes (~2.5K chars each) outperform session-level notes (~15K chars) for BM25 retrieval. Smaller, more focused documents give the ranking function better signal. This has direct implications for memory system design: write many small files rather than appending to large session logs.

**The vocabulary gap problem**: BM25 cannot match across vocabulary gaps. "Authentication" won't retrieve a document that only contains "login." Embeddings handle synonymy naturally; BM25 requires term overlap. The backlink signal partially compensates — if both terms appear in linked notes, graph connectivity can surface them — but this is weaker than cosine similarity over dense representations.

**Agent reasoning quality is the bottleneck**: When disclosure is agent-driven (the agent decides what to fetch), retrieval quality depends on the agent's ability to formulate good queries and select relevant results. A poorly reasoning agent might fail to discover relevant skills, or load too many irrelevant files. This is a different failure mode than embedding-based RAG, which can miss relevant content due to vocabulary mismatch regardless of agent reasoning quality.

## Failure Modes

**Abstention calibration**: BM25 always returns ranked results; there is no calibrated confidence threshold for "I don't have relevant information." Napkin reports 50% accuracy on abstention tasks in LongMemEval, vs 90%+ on information extraction. An agent that cannot determine when to say "I don't know" will confidently produce wrong answers.

**Large skill libraries**: As a skill library grows, `list_skills` becomes less useful — the agent must scan many options to determine relevance. This does not affect embedding-based systems (which rank by cosine similarity), but it creates cognitive load for tool-call-based progressive disclosure. Acontext mitigates this with the SKILL.md manifest pattern, but there is no automatic pruning of stale skills.

**Version drift in skill documentation**: Skills encode syntax details that can become outdated as tools evolve. The Obsidian skills package encodes specific function APIs and callout types that Obsidian can change. Unlike code, there is no test suite to detect when documentation becomes incorrect.

**Trigger mismatch**: The Agent Skills spec uses natural-language description matching to activate skills. A skill described as "working with .md files in Obsidian" might activate unnecessarily for generic markdown tasks, consuming tokens. More precise triggering would require file extension detection plus content analysis, which the current spec does not support.

## When Not to Use It

Progressive disclosure is the wrong choice when:

- The agent needs cross-document synthesis on first contact (e.g., comparative analysis across many sources) and cannot afford multiple retrieval rounds
- Latency matters more than token efficiency — each disclosure tier adds round-trip time for tool calls
- The knowledge base is small enough to fit entirely in context (under ~50K tokens), in which case loading everything upfront is simpler and avoids retrieval errors
- The task requires semantic matching across vocabulary gaps and the infrastructure cost of embeddings is acceptable

For synonym-heavy retrieval, [Hybrid Search](../concepts/hybrid-search.md) combining BM25 with [Embedding Model](../concepts/embedding-model.md) similarity and [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md) reranking outperforms BM25 alone.

## Unresolved Questions

**Optimal tier boundaries**: Neither napkin nor Acontext provides principled guidance on where to cut between tiers. The napkin 5000-token SKILL.md recommendation is a rule of thumb, not derived from experiments on how context size affects downstream task performance.

**Conflict resolution across sources**: When two skill files or two retrieved documents contradict each other, progressive disclosure provides no mechanism to detect or resolve the conflict. The agent sees whichever content it retrieved and has no way to know whether contradicting content exists elsewhere.

**Cost at scale for distillation-based systems**: Acontext's pipeline requires 30–55 LLM calls per session learning cycle for GPT-4.1. At high session volumes, this cost compounds significantly. No public analysis of the economics at scale exists.

**Interaction with [Context Compression](../concepts/context-compression.md)**: Progressive disclosure and context compression are complementary techniques, but the interaction between them is underspecified. If Level 3 content (full files) is compressed before loading, does the compressed representation preserve enough signal for the agent to reason effectively?

## Alternatives

**[Retrieval-Augmented Generation](../concepts/rag.md)**: Use when vocabulary gaps would cause BM25 to miss relevant content, when the knowledge base is large and static, and when infrastructure cost is acceptable. RAG delegates retrieval decisions to an embedding model before the main model sees anything.

**[Agentic RAG](../concepts/agentic-rag.md)**: Use when the agent should iteratively query the knowledge base across multiple reasoning steps. Combines progressive disclosure (iterative retrieval) with embedding-based search (semantic matching).

**Full-context loading**: Use when the entire knowledge base fits in the context window and synthesis across all documents is required on first contact. The right choice for small, dense knowledge bases where completeness matters more than efficiency.

**[Hybrid Search](../concepts/hybrid-search.md)**: Use when semantic recall matters but you still want progressive disclosure mechanics. Run BM25 and vector search in parallel, fuse with RRF, then apply the same tier structure for depth. This is what napkin's benchmark successor (agentmemory at 96.2% on LongMemEval) uses.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): The broader discipline of which progressive disclosure is one technique
- [Context Window](../concepts/context-window.md): The finite resource that progressive disclosure manages
- [Context Management](../concepts/context-management.md): The operational layer that progressive disclosure implements
- [Agent Memory](../concepts/agent-memory.md): Progressive disclosure is a retrieval strategy for memory systems
- [Agent Skills](../concepts/agent-skills.md): The primary carrier format for progressively disclosed knowledge
- [BM25](../concepts/bm25.md): The retrieval algorithm underlying napkin's Level 2 search
- [CLAUDE.md](../concepts/claude-md.md): The standard Level 0 pinned context file in Claude-based agents

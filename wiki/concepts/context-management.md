---
entity_id: context-management
type: concept
bucket: context-engineering
abstract: >-
  Context management controls what information occupies an LLM's context window
  across multi-turn interactions, balancing relevance against token cost through
  retrieval, compression, summarization, and hierarchical memory structures.
sources:
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/memento-teams-memento-skills.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - rag
  - bm25
  - vector-database
  - claude-code
  - openclaw
  - opencode
last_compiled: '2026-04-07T11:58:35.169Z'
---
# Context Management

## What It Is

Context management is the set of decisions, algorithms, and data structures that govern what information an LLM sees at any given moment. Every token in a context window competes for attention and costs money. Context management is the discipline of winning that competition deliberately rather than by default.

The problem has two faces. The first is capacity: most models top out at 128K–200K tokens, and a long-running agent accumulates far more state than that. The second is relevance: stuffing a context window with everything available degrades output quality as the model's attention dilutes across noise. Context management solves both.

It sits within the broader discipline of [Context Engineering](../concepts/context-engineering.md), which covers the full pipeline from retrieval through generation. Context management specifically handles the *window management* layer: what gets loaded, what gets compressed, what gets evicted, and when.

## Why It Matters

A coding agent running for three hours across a large codebase will encounter a hard wall: the context window fills, the session crashes or degrades, and the agent loses coherent state. Without deliberate management, the options are unacceptable: truncate early (losing critical decisions), dump everything (paying for 500K tokens per call), or rely on the model's retrieval from long context (which degrades for information buried 100K tokens back).

The same problem appears in chatbots with conversation history, research agents tracking multi-document sources, and any system where state accumulates faster than context capacity grows.

## The Four Core Mechanisms

### 1. Selective Loading

Load only what the current task requires. This requires knowing what exists before loading it, which is the [Progressive Disclosure](../concepts/progressive-disclosure.md) problem: you need a lightweight index to decide what heavyweight content to fetch.

[Claude Code](../projects/claude-code.md)'s [CLAUDE.md](../concepts/claude-md.md) file is a canonical example. It sits at 1–5K tokens and tells the agent about project structure, conventions, and important decisions, without loading every source file. The agent reads it first, then fetches specific files as needed.

[Hipocampus](https://github.com/kevin-hs-sohn/hipocampus) formalizes this into a three-tier cache hierarchy. Layer 1 (always loaded, ~3K tokens) contains `ROOT.md`, a keyword-dense topic index covering everything the agent has discussed across months. Layer 2 (on-demand) contains raw daily logs and curated knowledge files. Layer 3 (cold, via search or tree traversal) contains the full compaction history. The agent always knows what it knows, but only pays for what it needs.

### 2. Compression and Summarization

When content exceeds what can be loaded verbatim, summarize it. The tradeoff is fidelity against cost.

Two compression strategies exist:

**Lossless below threshold**: For small content, copy verbatim. Hipocampus uses this below ~200 lines for raw-to-daily compaction: concatenate the source files exactly, zero LLM cost, zero information loss.

**Lossy above threshold**: For large content, use an LLM to generate keyword-dense summaries. The Memento-Skills framework (`compaction.py`) compresses message history by serializing all messages into structured text, asking an LLM to summarize, and replacing the full history with the summary prefixed `[compressed from {role}]`. This trades completeness for context headroom.

The [Context Compression](../concepts/context-compression.md) literature includes more targeted techniques: token pruning (remove low-attention tokens), span extraction (keep only high-information spans), and hierarchical summarization (compress old content more aggressively than recent content).

### 3. Hierarchical Memory Structures

Organize information by recency and expected access frequency, matching storage cost to retrieval probability.

The CPU cache analogy is accurate: L1 (hot, always present), L2 (warm, loaded on demand), L3 (cold, searched on explicit query). Hipocampus implements exactly this three-tier structure. The Memento-Skills framework uses a similar pattern with scratchpad (active session state), skill files (task-specific context), and archived conversation summaries.

Temporal decay is a common organizing principle. Recent information is more likely to be relevant and deserves more detailed representation. Older information compresses more aggressively. Hipocampus's compaction chain formalizes this: raw logs compress to daily nodes, daily to weekly, weekly to monthly, monthly to ROOT.md. Each level loses detail but remains discoverable.

[Episodic Memory](../concepts/episodic-memory.md) and [Semantic Memory](../concepts/semantic-memory.md) represent the cognitive science framing of this pattern: episodic memory stores specific events with temporal context, semantic memory stores generalized knowledge extracted from episodes.

### 4. Retrieval-on-Demand

Instead of pre-loading context, retrieve it when needed. [Retrieval-Augmented Generation](../concepts/rag.md) is the dominant implementation: embed queries, search a vector store, inject top-k results.

[BM25](../concepts/bm25.md) handles keyword-dense retrieval. [Vector databases](../concepts/vector-database.md) handle semantic similarity. [Hybrid search](../concepts/hybrid-search.md) combines both, typically via [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md). [Agentic RAG](../concepts/agentic-rag.md) extends this to multi-step retrieval where the agent decides what to search and when.

The fundamental limitation of retrieval-only approaches is that they require knowing what to search for. Implicit context, which is information relevant to the current task but not obviously related by keyword or semantic similarity, does not surface through search. Hipocampus's MemAware benchmark quantifies this: BM25 search scores 2.8% on implicit recall questions (across 900 questions requiring the agent to proactively surface relevant past context). Hipocampus with its topic index scores 17.3% using the same underlying search. The topic index makes unknown unknowns findable. (These numbers are self-reported by the Hipocampus project.)

## Concrete Implementations

### Claude Code

Loads `CLAUDE.md` at session start, providing project-level context. Agents write new findings back to `CLAUDE.md` or create [Skill Files](../concepts/skill-md.md) for reusable procedures. This is minimal, single-file context management: no compression, no tiering, but effective for coding tasks with bounded context requirements. See [Claude Code](../projects/claude-code.md).

### Hipocampus (via OpenClaw and OpenCode)

Five-level compaction tree: raw daily logs → daily compaction nodes → weekly summaries → monthly summaries → ROOT.md topic index. ROOT.md stays at ~3K tokens regardless of history length. Each compaction node carries YAML frontmatter with `status: tentative|fixed`, `period`, `topics`, and `source-files` fields. Fixed nodes are immutable once their time period ends; tentative nodes regenerate as new data arrives.

Memory type classification controls compaction behavior: `user` and `feedback` entries survive indefinitely without compression; `project` entries compress to Historical Summary when completed; `reference` entries gain staleness markers after 30 days. The `compact.mjs` CLI script handles the mechanical compaction layer (transcript extraction, secret scanning, ISO week calculation, below-threshold concatenation) before the LLM runs above-threshold summarization. See [OpenClaw](../projects/openclaw.md) and [OpenCode](../projects/opencode.md).

### Memento-Skills

The `ContextManager` class in `core/context/` implements bounded context assembly with four behaviors: progressive summarization when token count exceeds thresholds, a persistent scratchpad for inter-step state, block-based message organization (each user turn opens a new block), and embedding-based retrieval for historical conversations. The `compact_messages()` function serializes all non-system messages into structured text with role tags and tool call details, then passes them to an LLM with explicit instructions to preserve plan execution status and tool results.

The key difference from Hipocampus: Memento-Skills uses LLM-based summarization as its primary compaction mechanism. Hipocampus uses verbatim copy below threshold (zero LLM cost, zero information loss). Hipocampus's approach is cheaper and lossless for typical daily usage; Memento-Skills's approach is more uniform but always incurs LLM cost and risks information loss.

## The "Unknown Unknowns" Problem

Standard retrieval assumes the agent knows it needs something. The agent poses a query, retrieves matches, uses the results. This works for known unknowns.

Unknown unknowns, situations where relevant past context exists but the agent has no reason to search for it, require a different architecture. A topic index (ROOT.md) loaded into every session is one solution: the agent sees all topics at zero search cost and recognizes when the current task intersects with past decisions.

The Hipocampus MemAware results show the gap starkly (self-reported): on "hard" questions requiring cross-domain implicit recall, vector search scores 0.7%. Hipocampus with its compaction tree scores 8.0%. The tree does not use semantic similarity; it uses structural coverage. The agent knows what it knows.

This is the core tension in context management design: loading more costs more, but loading less misses unknown relevance. A well-structured index is the resolution: small enough to always load, complete enough to trigger retrieval when relevant.

## Failure Modes

**Compression quality degrades with model quality.** LLM-based summarization produces summaries only as good as the model's comprehension. A poor summary loses information that cannot be recovered from the compressed output (though raw sources often remain available via tree traversal in well-designed systems).

**Keyword mismatch breaks retrieval.** BM25 misses "배포" when the query says "deployment." Vector search helps but does not fully close the gap. Hipocampus's manifest-based LLM selection (step 2 in its 3-step recall protocol) addresses this: load frontmatter-only from compaction nodes, ask an LLM to identify relevant files semantically, then read only those files.

**Fixed token budgets create pressure.** A 3K-token ROOT.md budget limits topic coverage. Hipocampus's benchmarks show that increasing to 10K tokens improves easy questions from 26% to 34% overall but leaves hard questions unchanged (cross-domain reasoning is bottlenecked by the answer model, not the index size). Choosing a budget requires estimating the tradeoff between per-call cost and coverage.

**Contradiction accumulation.** As a history grows, earlier decisions may conflict with later ones. Most context management systems have no contradiction detection. The topic index shows that a decision exists; it does not flag that a newer decision supersedes it. An agent reading ROOT.md might retrieve both the old and new decisions without knowing which to follow.

**The cold start problem.** On day one, any index is sparse. A compaction tree populated over three months provides qualitatively better coverage than one populated over one day. Systems that depend on accumulated context provide weaker guarantees early in their lifecycle.

## When Not to Use It

Context management overhead is unjustified for short-lived interactions. A single-turn question-answering system, a chatbot with a few-message conversation window, or a task that completes in under 10 minutes does not need a compaction tree. The setup cost (initializing memory structures, running first-session compaction) exceeds the benefit.

Avoid complex context management when conversation history is naturally bounded. A coding assistant that only sees the current file never accumulates enough state to need compression. CLAUDE.md-style selective loading is sufficient.

Also avoid layered compression when retrieval precision matters more than recall. A summarization step that compresses technical decisions into keywords may lose the specific numbers, edge cases, or caveats that make those decisions actionable. For high-stakes knowledge (security policies, compliance requirements, API contracts), store verbatim references and retrieve them exactly.

## Unresolved Questions

**Optimal compression granularity.** Hipocampus's thresholds (200/300/500 lines before switching from verbatim to LLM compression) are empirically chosen but not formally justified. No published research compares granularity choices against downstream task performance.

**Multi-agent context sharing.** Current implementations assume one agent's memory. When multiple agents work on related tasks, their context management systems are independent. Shared context pools, conflict resolution between agents' summaries, and selective synchronization remain open engineering problems.

**Cost attribution at scale.** ROOT.md loaded into every API call at 3K tokens (or 300 tokens with prompt caching) accumulates cost. For systems making thousands of calls per day, the per-call overhead multiplied across a fleet of agents becomes significant. No published analysis covers the cost model at deployment scale for these approaches.

**Evaluation methodology.** The MemAware benchmark evaluates one specific retrieval pattern (proactive implicit recall) on one agent's conversation history. General benchmarks for context management quality across diverse task types, multi-agent systems, and varied memory depths do not exist.

## Alternatives and Selection Guidance

**Use plain RAG** ([Retrieval-Augmented Generation](../concepts/rag.md)) when the agent only needs to answer questions about external knowledge, not remember its own past decisions.

**Use CLAUDE.md / SKILL.md files** when the project has stable conventions and bounded scope. Manual curation beats automated compression for high-precision requirements.

**Use a compaction tree** (Hipocampus-style) when the agent operates continuously across weeks and needs to proactively connect past decisions to new tasks.

**Use LLM-based summarization** (Memento-Skills-style) when you need uniform context compression and can accept some information loss in exchange for simpler implementation.

**Use [Agent Memory](../concepts/agent-memory.md) infrastructure** ([Letta](../projects/letta.md), [Mem0](../projects/mem0.md), [Zep](../projects/zep.md)) when you need managed memory with multi-user support, persistence guarantees, and production SLAs rather than building your own compression pipeline.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): The broader discipline this falls within
- [Context Window](../concepts/context-window.md): The physical constraint being managed
- [Context Compression](../concepts/context-compression.md): Compression-specific techniques
- [Retrieval-Augmented Generation](../concepts/rag.md): Retrieval-based context loading
- [Agent Memory](../concepts/agent-memory.md): Long-term persistence layer
- [Progressive Disclosure](../concepts/progressive-disclosure.md): Index-first loading strategy
- [Episodic Memory](../concepts/episodic-memory.md) / [Semantic Memory](../concepts/semantic-memory.md): Cognitive science framing
- [Hybrid Search](../concepts/hybrid-search.md): Combined BM25 + vector retrieval
- [CLAUDE.md](../concepts/claude-md.md): File-based selective loading pattern

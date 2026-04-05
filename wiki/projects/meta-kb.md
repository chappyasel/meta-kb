---
entity_id: meta-kb
type: project
bucket: knowledge-bases
sources:
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/repos/michaelliv-napkin.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:31:26.111Z'
---
# Meta-KB

**Type:** Project | **Domain:** Knowledge Bases / AI Agent Infrastructure

---

## What It Is

Meta-KB is a meta-knowledge base system for AI agents: a knowledge base about knowledge bases, enabling agents to reason about what they know, how knowledge is structured, and how to retrieve it. The core bet is that agents equipped with structured knowledge *about* retrieval strategies will outperform agents that blindly execute a single retrieval pattern.

The system compiles raw source material (deep repository analyses, concept definitions, project references) into a structured wiki, then serves that wiki to agents as a navigable knowledge graph rather than a flat chunk store.

---

## Architecturally Unique Properties

Three design choices distinguish Meta-KB from standard RAG pipelines:

**Retrieval as reasoning, not similarity.** Drawing on PageIndex's core finding, Meta-KB treats document navigation as a multi-step reasoning problem. Rather than embedding chunks and ranking by cosine distance, the agent browses a tree structure first, then fetches targeted sections. PageIndex achieved 98.7% on FinanceBench with this approach versus ~31% for vanilla GPT-4o RAG on the same benchmark (self-reported by VectifyAI; not independently validated).

**Structure preservation over chunking.** Raw source files arrive with natural structure: YAML frontmatter, markdown headings, wikilinks. Meta-KB preserves this structure rather than destroying it during ingestion. The PageIndex analysis [Source](../../raw/repos/vectifyai-pageindex.md) documents why structure destruction is the root failure mode of most RAG systems: "A 300-page financial report becomes 600 orphaned chunks with no sense of how they relate."

**Declarative skills as knowledge encoding.** Following the pattern demonstrated by Obsidian-skills [Source](../../raw/repos/kepano-obsidian-skills.md), Meta-KB encodes domain knowledge as structured markdown skill files with YAML frontmatter triggers and progressive disclosure. The `description` field in each skill acts as an activation condition; agents load only what they need for a given query.

---

## Core Mechanism

### Index Construction

Meta-KB's compilation pipeline runs offline, per source document. The process mirrors PageIndex's two-phase architecture:

1. Parse raw source files from `raw/` directories, preserving heading hierarchy
2. Detect and extract structure (YAML frontmatter, `##` headings, wikilinks)
3. Build a tree index where each node carries: title, page range (or line range for markdown), summary, and child nodes
4. Generate per-node summaries via LLM
5. Persist the tree as JSON alongside the original content

For markdown sources, this is deterministic: regex `^(#{1,6})\s+(.+)$` extracts headers while tracking code block state to avoid false matches inside fenced blocks. A stack-based algorithm converts the flat heading list into a nested tree using heading levels.

### Retrieval Loop

Following the `retrieve.py` pattern from PageIndex [Source](../../raw/repos/vectifyai-pageindex.md), retrieval exposes three tool functions to agents:

- `get_document()` — metadata only (title, page count, status)
- `get_document_structure()` — tree with `text` fields stripped (titles and summaries only)
- `get_page_content(pages="5-7")` — raw content for specific ranges

The critical design: `get_document_structure()` forces the agent to reason about which sections to fetch rather than receiving all content immediately. Typical token budget: ~1K metadata + ~3K tree structure + ~2K targeted content = ~6K total, versus 20K+ for naive chunk retrieval.

### Progressive Disclosure

Ars Contexta's three-tier loading pattern [Source](../../raw/repos/agenticnotetaking-arscontexta.md) informs how skills load:

- **Tier 1**: All skill descriptions loaded at startup (~100 tokens each, ~500 total)
- **Tier 2**: Full `SKILL.md` loaded when a skill activates (~2-6K tokens)
- **Tier 3**: `references/` files loaded only when deep detail is needed (~1-3K per file)

The agent never pays full token cost unless all skills and all references are simultaneously active.

---

## Key Numbers

| Metric | Value | Source |
|---|---|---|
| PageIndex FinanceBench accuracy | 98.7% | Self-reported (VectifyAI/Mafin 2.5) |
| GPT-4o vanilla on FinanceBench | ~31% | Self-reported baseline |
| Ars Contexta GitHub stars | ~2,900 | GitHub (as of source analysis) |
| Obsidian-skills GitHub stars | ~19.3K | GitHub (as of source analysis) |
| Ars Contexta research claims | 249 | Counted from methodology/ directory |
| Obsidian-skills skills | 5 | Repo structure |

The 98.7% FinanceBench figure is the most cited benchmark in the source material. It is self-reported by VectifyAI for their Mafin 2.5 product. No independent replication exists in the sources.

---

## Strengths

**Structured navigation over brute-force similarity.** The browse-then-read pattern consistently outperforms similarity search for structured documents with clear hierarchies. Financial filings, technical documentation, and research papers all have this property.

**Format-agnostic knowledge encoding.** Skill files work across Claude Code, Codex CLI, Cursor, GitHub Copilot, and Gemini CLI. The Agent Skills spec (agentskills.io) has converged across Anthropic, OpenAI, Microsoft, and Google, making structured markdown knowledge bases the de facto standard interface.

**Anti-pattern documentation.** The Obsidian-skills pattern of explicitly documenting common LLM mistakes (e.g., the Duration `.round()` gotcha documented three times) is directly applicable to knowledge base design. Meta-KB can document misconceptions about its own domain, not just correct information.

**Hook-driven quality enforcement.** Ars Contexta's finding that "hook enforcement guarantees quality while instruction enforcement merely suggests it" [Source](../../raw/repos/agenticnotetaking-arscontexta.md) suggests that Meta-KB's compilation pipeline should include automated quality gates: schema validation, link integrity checks, consistency verification.

**No chunking hyperparameters.** PageIndex eliminates chunk-size tuning entirely by working with natural document sections. Meta-KB inherits this advantage by preserving source structure.

---

## Critical Limitations

**Concrete failure mode: reasoning can miss relevant content completely.** Vector search surfaces all partially-matching chunks, giving the agent multiple bites at relevance. Tree-based reasoning that goes down the wrong branch misses relevant content entirely, with no fallback. If the agent reasons that "retrieval costs" live under "infrastructure" when the relevant content is actually under "performance benchmarks," it returns nothing. This is PageIndex's acknowledged failure mode: "The agent may reason incorrectly about which sections to navigate, especially for ambiguous queries or documents where relevant information is scattered across non-obvious sections."

**Unspoken infrastructure assumption: LLM API access is cheap and reliable.** The entire architecture, from PageIndex's tree index construction (dozens of LLM calls per document) to Ars Contexta's fresh-context-per-phase pipeline spawning 5+ subagents per source document, assumes low-cost, high-reliability LLM API access. A 50-page source document may require 80+ LLM calls to index at $0.10-0.30 per document. This scales linearly with corpus size. A 10,000-document corpus costs $1,000-3,000 just to index, before any query costs.

---

## When NOT to Use Meta-KB

**High query volume, low query complexity.** For workloads where queries are simple keyword lookups ("what is BM25?") at scale, BM25 or a small embedding model is faster and cheaper. The reasoning overhead is unjustified when similarity search would answer correctly.

**Frequently updated source material.** PageIndex has no incremental indexing: every `index()` call reprocesses the entire document from scratch. If source documents change daily, re-indexing costs accumulate quickly. The system is designed for stable corpora (financial filings, academic papers, technical specifications).

**Cross-document synthesis at scale.** Tree-based navigation is per-document. Cross-document reasoning requires the agent to iterate over multiple indexes serially. For "compare these 50 reports on the same topic" queries, GraphRAG's entity-relationship approach or a vector store with broad retrieval is more appropriate.

**Environments without reliable LLM access.** The system requires LLM API calls both during index construction and retrieval. Air-gapped environments, cost-constrained deployments, or systems requiring sub-100ms retrieval latency should use BM25 or pre-built embeddings instead.

---

## Unresolved Questions

**Governance of the claim graph.** Ars Contexta's 249-claim methodology graph is the intellectual foundation of its derivation engine, but the sources do not address how the graph is maintained, who can add claims, or how conflicts between claims are resolved. The bootstrapping problem is noted but not solved: "you need a good claim graph to derive good systems, but need operational feedback from derived systems to improve the graph." [Source](../../raw/repos/agenticnotetaking-arscontexta.md)

**Cost at corpus scale.** Sources discuss per-document indexing costs but not what happens at 10K or 100K documents. No profiling data exists for tree traversal performance at large corpus sizes, or for how the agent's tree-browsing behavior degrades when it must consider many documents rather than one.

**Skill version management.** The Obsidian-skills repo acknowledges version drift (features evolve, skills become stale) but provides no automated detection or update mechanism. The version field in `plugin.json` must be manually bumped. For a meta-knowledge base that tracks a fast-moving field, this is a real operational risk.

**Multi-agent conflict resolution.** Ars Contexta's fresh-context-per-phase design assumes a single agent linearly processing a pipeline. The sources do not address what happens when multiple agents write to the same knowledge base concurrently, or how the system handles conflicting claims from different sources.

---

## Alternatives

| System | Use When |
|---|---|
| Retrieval-Augmented Generation (traditional, vector-based) | Query volume is high, queries are short, source documents lack clear hierarchy |
| PageIndex / vectorless RAG | Source documents are structured (financial filings, legal docs) and precision matters more than recall |
| GraphRAG (Microsoft) | Cross-document entity reasoning is the primary workload; "themes across 100 reports" beats "specific figure in this report" |
| Ars Contexta | You need a *generated* knowledge system tailored to a specific domain, not a static knowledge base |
| napkin | Agent working memory for long-running conversations; BM25 on structured markdown with zero infrastructure |
| BM25 / Elasticsearch | Keyword search at scale, predictable latency requirements, no LLM API dependency |

---

## Related Concepts

- Retrieval-Augmented Generation — the retrieval paradigm Meta-KB partially replaces with reasoning-based navigation

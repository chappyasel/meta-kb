---
entity_id: markdown-wiki
type: concept
bucket: knowledge-substrate
abstract: >-
  A knowledge base built from LLM-maintained interlinked markdown files; cheaper
  than RAG at small-to-medium scale, fully inspectable, and self-improving
  through agent-driven linting and compilation.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/memvid-memvid.md
  - repos/origintrail-dkg-v9.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/origintrail-dkg-v9.md
related:
  - andrej-karpathy
  - retrieval-augmented-generation
  - obsidian
  - synthetic-data-generation
  - zettelkasten
  - marp
  - openclaw
  - knowledge-graph
last_compiled: '2026-04-08T03:03:11.702Z'
---
# Markdown Wiki

## What It Is

A markdown wiki is a directory of `.md` files that an LLM writes, maintains, and queries as a knowledge substrate. The human rarely touches the files directly. The LLM ingests raw source material, compiles it into structured articles, maintains cross-links between them, and runs periodic health checks to find inconsistencies or gaps.

[Andrej Karpathy](../concepts/andrej-karpathy.md) described the pattern publicly after running it on a ~100-article, ~400K-word research knowledge base. The core claim: at that scale, careful LLM-maintained index files and summaries work well enough that you don't need vector databases or embedding pipelines. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

The structure is simple:

```
raw/          ← source documents: articles, papers, repos, images
wiki/         ← LLM-compiled .md files organized by concept
  concepts/
  summaries/
  indexes/
outputs/      ← rendered slides, plots, analysis files
```

Every file in `wiki/` is LLM-generated. Outputs get filed back into the wiki after a query, so each question compounds into the knowledge base rather than disappearing into a chat log.

## How It Works

**Ingest.** Raw material lands in `raw/` — web articles clipped as markdown (Karpathy uses the [Obsidian](../projects/obsidian.md) Web Clipper extension), papers, repo READMEs, images. The LLM processes this incrementally, not as a batch dump.

**Compilation.** The LLM reads raw sources and writes wiki articles: concept summaries, backlinks between related articles, category indexes. The LLM decides the structure. The human decides what source material to ingest.

**Indexing.** The critical piece that makes query-without-RAG work: the LLM maintains brief summary files and index documents across all articles. When asked a complex question, it reads the index first, identifies which full articles to load, then answers from those. This is manual retrieval at the file level rather than vector similarity at the chunk level.

**Query.** The LLM agent runs against the wiki directory, reads relevant files, produces answers as rendered markdown, [MARP](../projects/marp.md) slides, or matplotlib images. Those outputs get filed back into the wiki.

**Linting.** Periodic LLM passes run "health checks": find inconsistent data across articles, identify missing information that web search could fill, surface connections between articles that warrant new synthesis pieces. [Source](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)

The loop is: ingest → compile → query → file output back → lint → repeat. Queries accumulate rather than evaporate.

## Why This Works at Small Scale

At ~100 articles and ~400K words, an LLM with a large context window can load enough index material to route correctly to relevant files. The index-then-read pattern avoids loading the full corpus per query. Self-maintained summaries give the agent an overview layer to navigate from.

This breaks down as the corpus grows. At 500 articles, index files get long. At 1,000+ articles, the index itself requires retrieval. The pattern is explicitly bounded by what LLM context windows can navigate with flat file reads.

The inspectability advantage is real and underrated: every piece of knowledge sits in a readable file. You can grep it, diff it, version it with git, and audit what the LLM added during a linting pass. [Vector databases](../concepts/vector-database.md) give you none of that transparency.

## Connection to Self-Improvement

Karpathy noted that the natural extension of a growing wiki is [synthetic data generation](../concepts/synthetic-data-generation.md) and fine-tuning: encode the wiki's knowledge into model weights rather than relying on context windows at query time. The markdown wiki becomes the training corpus for a domain-specialized model. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

The autoresearch pattern extends this further. Given binary eval criteria and a lockable target file (a prompt, a skill instruction, a wiki article template), an agent can run 50-100 improvement cycles overnight — read current version, change one thing, test against rubric, keep if score improves. The wiki provides the knowledge substrate; autoresearch provides the self-improvement loop. [Source](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md)

This connects to [agent memory](../concepts/agent-memory.md) architecture more broadly. A markdown wiki is a form of [semantic memory](../concepts/semantic-memory.md): declarative facts about a domain, organized for retrieval. The linting loop makes it a form of [memory evolution](../concepts/memory-evolution.md): the knowledge base improves through use rather than remaining static.

## Relationship to Zettelkasten

The [Zettelkasten](../concepts/zettelkasten.md) method (Niklas Luhmann's card-index system) shares the core organizing principle: atomic notes with explicit links between them, building a network that generates emergent connections. The markdown wiki is a computational Zettelkasten where the LLM plays the role of the researcher making connections and writing synthesis notes.

The difference is agency. In traditional Zettelkasten, the human writes every note and places every link. In the LLM markdown wiki, the human ingests source material and the LLM does the synthesis work. The human reads and queries; the LLM curates.

[OpenClaw](../projects/openclaw.md) implements a version of this for agent systems: the `DkgMemoryPlugin` and `write-capture.ts` module can watch file writes and auto-import them into a knowledge graph, treating the wiki as an agent memory layer rather than a personal research tool.

## Strengths

**Zero infrastructure.** No vector database, no embedding API, no retrieval pipeline. A directory of text files and an LLM with file access.

**Full inspectability.** Every fact is readable. You can audit what the LLM added, revert changes with git, and trace how conclusions were reached.

**Compounding queries.** Each question's output files back into the wiki. Knowledge accumulates. A query about Topic A that surfaces an unexpected connection to Topic B produces a new wiki article linking them, making future queries on either topic richer.

**Self-healing.** Linting passes catch inconsistencies, find missing data, and surface new synthesis opportunities. The system nudges toward coherence over time.

**Cheap at small scale.** No embedding costs, no database hosting. Token cost scales with query complexity, not corpus size.

## Critical Limitations

**Concrete failure mode: index drift.** The LLM-maintained index files and summaries can fall out of sync with actual article content as the wiki grows. A linting pass that updates an article without updating its index entry leaves stale navigation pointers. The next query that routes through the stale index misses the updated information. There is no ground truth to catch this — only another linting pass, which may itself create new drift. Manual review periodically becomes unavoidable.

**Unspoken infrastructure assumption: large context windows.** The query-without-RAG claim rests on the LLM being able to load index files plus several full articles in one context. At 400K words of wiki content, this works with current frontier models (128K-200K context). At 2M words, it requires chunk-and-synthesize strategies that add latency and retrieval complexity back into the picture. The pattern implicitly assumes corpus size stays within what context windows can navigate from index files alone.

**Scale ceiling is real.** Karpathy explicitly bounded the claim: "at this ~small scale." The architecture doesn't generalize to enterprise knowledge bases or multi-year research corpora without adding the retrieval infrastructure it was designed to avoid.

**No multi-agent concurrency.** A single-person wiki works because one agent writes at a time. Multiple agents writing concurrently produce merge conflicts, overlapping articles, and inconsistent terminology — problems that structured systems like [Knowledge Graphs](../concepts/knowledge-graph.md) with CAS concurrency control exist to solve.

## When NOT to Use This

**Multi-agent systems writing shared knowledge.** When multiple agents need concurrent write access to a shared knowledge base, markdown files create merge conflicts and consistency problems. Use a structured store with concurrency control instead.

**Corpora over ~500K words.** The index-routing approach degrades as index files themselves become too long to load efficiently. Past this threshold, you need actual retrieval infrastructure.

**High-stakes factual accuracy.** LLM-written wiki articles can hallucinate or misrepresent source material. If the downstream use is consequential (medical, legal, financial), every article needs human verification. The self-healing linting loop catches inconsistencies between articles but cannot catch inaccuracies in the source material processing.

**Real-time or frequently updated domains.** Compiling a wiki from raw sources takes time and tokens. For domains where facts change daily, the compilation latency means the wiki lags reality. A live retrieval system over indexed primary sources works better.

## Alternatives

**[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md):** Use when corpus exceeds context-navigable scale, when fuzzy semantic similarity matters more than structured article retrieval, or when you need sub-second query latency over large corpora. Higher infrastructure cost, lower inspectability.

**[Knowledge Graph](../concepts/knowledge-graph.md):** Use when relationships between entities matter as much as entity content, when you need structured queries (SPARQL, Cypher) rather than natural language, or when multiple agents write shared knowledge concurrently. Higher setup cost, better concurrency and query precision.

**[Obsidian](../projects/obsidian.md):** The standard frontend for markdown wikis, with graph view, backlink navigation, plugin ecosystem ([MARP](../projects/marp.md) for slides), and the Web Clipper extension for ingesting web articles. Obsidian provides the human-facing IDE layer; the LLM provides the curation layer.

**[CLAUDE.md](../concepts/claude-md.md):** A single-file variant of the pattern — a markdown file that encodes procedural knowledge about how to work in a specific codebase or context. Simpler than a full wiki, focused on procedural rather than semantic knowledge, designed for per-session context injection rather than persistent accumulation.

**[MemGPT](../projects/memgpt.md) / [Letta](../projects/letta.md):** Use when you need programmatic memory management with explicit read/write operations, memory tiering, and multi-session persistence for agent workflows. More infrastructure than a markdown wiki; designed for agent memory rather than research knowledge bases.

## Unresolved Questions

**Conflict resolution between LLM passes.** When a linting pass updates an article and a subsequent compilation pass re-derives the same article from source material, which version wins? The documentation doesn't specify a resolution strategy.

**Cost at scale.** Karpathy's 400K-word wiki with periodic linting passes runs at unknown token cost. As the wiki grows and linting touches more articles per pass, costs compound. There's no published cost model for maintaining a 1M-word wiki through six months of active research.

**Provenance tracking.** There's no standard mechanism in the pattern for tracking which source documents informed which wiki claims. An article asserting a fact may have synthesized it from three conflicting sources. The linting loop finds inconsistencies between articles but can't trace a specific claim back to its source.

**LLM-to-LLM handoff.** When you switch base models (GPT-4 to Claude, or across versions), the new model inherits a wiki written with a different model's synthesis style and categorization choices. There's no guidance on re-compilation or quality assessment after a model switch.

## Related Concepts

- [Zettelkasten](../concepts/zettelkasten.md) — the manual precursor to LLM-maintained wikis
- [Semantic Memory](../concepts/semantic-memory.md) — the memory type a wiki implements
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the alternative retrieval architecture
- [Knowledge Graph](../concepts/knowledge-graph.md) — structured alternative for relationship-heavy domains
- [Context Engineering](../concepts/context-engineering.md) — managing what gets loaded into context per query
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — the natural next step after a wiki reaches sufficient coverage
- [Agent Memory](../concepts/agent-memory.md) — the broader category this pattern serves
- [Obsidian](../projects/obsidian.md) — standard frontend for the pattern
- [OpenClaw](../projects/openclaw.md) — agent framework that implements wiki-to-knowledge-graph integration

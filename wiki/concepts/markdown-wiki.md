---
entity_id: markdown-wiki
type: concept
bucket: knowledge-substrate
abstract: >-
  A Markdown Wiki is a knowledge base of interconnected .md files where an LLM
  compiles, maintains, and queries structured knowledge—replacing RAG pipelines
  at small-to-medium scale by keeping humans out of the editing loop.
sources:
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/origintrail-dkg-v9.md
  - repos/agno-agi-dash.md
  - repos/memvid-memvid.md
  - repos/origintrail-dkg-v9.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
related:
  - andrej-karpathy
  - retrieval-augmented-generation
  - obsidian
  - synthetic-data-generation
  - zettelkasten
  - marp
  - openclaw
last_compiled: '2026-04-08T23:20:33.544Z'
---
# Markdown Wiki

## What It Is

A Markdown Wiki is a directory of `.md` files that an LLM writes, maintains, and queries on behalf of a human or agent. The human supplies raw sources; the LLM compiles them into structured articles with backlinks, summaries, and cross-references. The human rarely edits files directly.

[Andrej Karpathy](../concepts/andrej-karpathy.md) popularized this pattern in early 2025, describing a personal research setup that reached ~100 articles and ~400K words before he concluded he didn't need a [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipeline. The tweet drew 9.9M views and 38K likes. The core claim — that LLM-maintained indexes and brief summaries make fancy retrieval unnecessary at this scale — is self-reported from one practitioner, not an independently validated benchmark.

The pattern differs from conventional wikis (where humans write pages) and from RAG (where a retrieval system mediates between a static corpus and a model). The LLM is the primary author and the primary reader. Humans set direction through queries and review outputs.

## Core Mechanism

The system has five interlocking loops running against the same directory tree.

**Ingest**: Raw sources — articles, papers, repos, datasets, images — land in a `raw/` directory. Tools like the [Obsidian](../projects/obsidian.md) Web Clipper convert web content to `.md`. Images are downloaded locally so the LLM can reference them alongside text.

**Compilation**: An LLM reads `raw/` incrementally and writes a `wiki/` directory. Each compilation pass produces or updates concept articles, adds backlinks between them, writes summaries, and maintains index files. The LLM decides the directory structure, not the human. This is the inversion that matters: the knowledge architecture emerges from the model's categorization, not from a predetermined taxonomy.

**Q&A**: Once the wiki is large enough, a user or agent poses complex questions. The LLM reads index files and summaries first, then pulls the relevant full articles. At ~100 articles and ~400K words, this fits within large context windows without embedding lookups. The LLM auto-maintains the indexes that make this traversal efficient.

**Output filing**: Query answers are rendered as markdown files, [MARP](../projects/marp.md) slides, or matplotlib images — all viewable in [Obsidian](../projects/obsidian.md). Those outputs get filed back into the wiki, so each query run leaves a permanent trace. Every exploration compounds.

**Linting**: Periodic LLM "health check" passes scan the wiki for inconsistent data, missing information (imputed via web search), and candidate connections that warrant new articles. The model suggests further questions. This self-healing loop is what keeps the wiki coherent as it grows without human editorial intervention.

The full cycle: `raw/` → LLM compilation → `wiki/` → LLM Q&A → filed outputs → LLM linting → back to `wiki/`. The human's role is to add raw sources and read outputs.

## Why Markdown

Markdown is the enabling constraint. `.md` files are:

- **LLM-native**: Models read and write markdown fluently, with no serialization layer between the knowledge representation and the model's token stream.
- **Human-inspectable**: Any practitioner can open a file and verify what the LLM wrote. This matters for trust and debugging.
- **Tool-agnostic**: Git, grep, and any text editor work without setup. [Obsidian](../projects/obsidian.md) adds graph visualization and plugin rendering. [MARP](../projects/marp.md) converts markdown to slides.
- **Diff-friendly**: Git history shows exactly what the LLM changed and when. This creates an audit trail for knowledge evolution that vector databases don't provide.
- **Cheap to index**: A custom search engine over markdown files is a small CLI script, not a hosted infrastructure component.

The format also aligns naturally with [Zettelkasten](../concepts/zettelkasten.md) practices: short, atomic articles with explicit links between them. The LLM enforces this structure through compilation, not through human discipline.

## Relation to RAG

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) solves a specific problem: how to get relevant chunks of a large corpus into a model's context window when the corpus is too large to fit whole. It does this through embedding, vector similarity search, and chunk retrieval.

A Markdown Wiki sidesteps this by keeping the corpus small enough that indexes and summaries fit in context directly. At ~400K words with good index files, the model can navigate to relevant articles without vector lookup. The retrieval mechanism is the model's own reading of a structured directory.

This works until it doesn't. As the wiki grows past what indexes can summarize, or as query complexity demands cross-article synthesis at scale, the no-RAG assumption breaks. The [Synthetic Data Generation](../concepts/synthetic-data-generation.md) path — finetuning a model on the wiki contents so the knowledge lives in weights — is the natural next step, but it reintroduces significant infrastructure.

## Relation to Agent Memory

A Markdown Wiki functions as [Semantic Memory](../concepts/semantic-memory.md) for an agent: long-term, structured, factual knowledge that persists across sessions. It differs from other memory approaches:

- [Core Memory](../concepts/core-memory.md) (MemGPT-style) is small and always in context. A wiki is large and selectively loaded.
- [Episodic Memory](../concepts/episodic-memory.md) records what happened. A wiki records what is known — synthesized from episodes but abstracted from them.
- [Vector Database](../concepts/vector-database.md)-backed memory retrieves by semantic similarity. A wiki retrieves by the model's navigation of article structure.
- [Knowledge Graph](../concepts/knowledge-graph.md) systems like [Graphiti](../projects/graphiti.md) or DKG v9 store RDF triples queryable via SPARQL, with cryptographic provenance and multi-agent write coordination. A wiki is a text file per concept, with no formal schema.

The wiki's advantage is simplicity and inspectability. Its disadvantage is that it has no formal relationship model — connections between concepts are prose text and wikilinks, not typed predicates. Complex relational queries ("all entities that acquired company X between 2020 and 2024") require the model to read and synthesize, not execute a structured query.

[CLAUDE.md](../concepts/claude-md.md) is a degenerate case of this pattern: a single markdown file that an agent reads at session start to understand its context and operating instructions. A full wiki extends this to hundreds of files with navigational structure.

## Implementation Details

Karpathy's setup uses no specialized infrastructure:

- `raw/` directory for source documents
- `wiki/` directory for compiled articles
- [Obsidian](../projects/obsidian.md) as the viewing interface (graph view, plugin rendering)
- A custom CLI search tool for programmatic access
- An LLM with file read/write tool access as the sole writer

The linting loop runs LLM passes over the wiki that specifically check for: contradictions between articles, claims that should cite sources but don't, concept articles that reference other concepts without linking them, and questions the corpus raises but doesn't answer.

[OpenClaw](../projects/openclaw.md)'s `write-capture.ts` module demonstrates one automation path: it watches for file writes and auto-imports them into a knowledge structure with LLM entity extraction. This is the compilation step made continuous rather than batch.

The self-improving variant described in the Karpathy Loop applies to wiki components themselves: prompts that control compilation can be optimized by running them against test cases, scoring outputs on binary criteria, and keeping changes that improve the score. A 50-100 round overnight loop can measurably improve the compilation prompt without human involvement.

## Strengths

**Zero retrieval infrastructure**: No vector database, no embedding model, no similarity search service. The corpus is files on disk. This is deployable anywhere a model can read and write files.

**Full inspectability**: Every article is a text file. Diffs are readable. There's no black box between the knowledge and the human. If the LLM writes something wrong, you can find it, delete it, and lint the wiki to propagate the correction.

**Compounding**: Filing query outputs back into the wiki means the knowledge base grows more useful with use. This doesn't happen with RAG, where the corpus is static unless explicitly updated.

**Format portability**: The same markdown files serve as the agent's knowledge base, as human documentation, as slide source (via [MARP](../projects/marp.md)), and as input to finetuning pipelines. One format, multiple consumers.

**LLM-native editing**: Models write markdown well. The gap between what the model produces and what needs to be stored is minimal — no ORM, no schema migration, no serialization.

## Critical Limitations

**Concrete failure mode — scale cliff**: The no-RAG assumption holds at ~100 articles and ~400K words. It breaks when the wiki grows to thousands of articles. Index files that summarize the whole wiki become too large for context themselves, or too abstract to navigate precisely. At this point, the system needs either a retrieval layer (negating the simplicity advantage) or a finetuned model (requiring ML infrastructure). There's no gradual degradation — the system works until it doesn't, and the failure mode is the LLM confidently navigating to wrong articles because the indexes can no longer be precise.

**Unspoken infrastructure assumption**: The pattern assumes a model with large context (128K+ tokens) and reliable file tool access. At smaller context windows, even moderate wikis require retrieval. At slower inference speeds or per-token pricing, reading multiple full articles per query becomes expensive. The "no RAG needed" claim is model-generation-specific — it worked for Karpathy with frontier models in early 2025. Earlier models would have required RAG at the same corpus size.

## When NOT to Use It

**Multi-agent shared knowledge**: If multiple agents need to write to the same knowledge base concurrently, markdown files have no concurrency control. Two agents writing the same article simultaneously produce file conflicts. Systems like DKG v9 (workspace graphs with CAS conditions) or [Graphiti](../projects/graphiti.md) handle this. A wiki is single-writer by design.

**Formal relational queries**: If the primary access pattern is structured queries ("find all contradictions," "list all entities with property X and Y"), a knowledge graph with SPARQL or a database is more appropriate. Markdown encodes relationships as prose, which requires model reading to resolve.

**Frequently updated external sources**: A wiki compiles knowledge at ingest time. If the underlying sources update daily, the wiki requires daily recompilation. RAG over a live index handles freshness more naturally.

**Compliance or audit contexts**: Markdown wikis have no access control, versioning beyond git, or provenance beyond "the LLM wrote this." If knowledge provenance needs cryptographic attestation or role-based access, the format is wrong.

**Corpora over ~1M words with complex queries**: At this scale, even with good indexes, the model needs to read too many files per query to be economical. This is the scale where RAG, or a finetuned model, becomes the right architecture.

## Unresolved Questions

Karpathy describes a personal research setup, not a production system. Several questions are open:

- How does linting performance degrade as the wiki grows? At what article count do health checks start missing inconsistencies?
- What's the right strategy when the LLM writes confidently wrong information into the wiki and the lint loop fails to catch it?
- How do you handle articles that should be updated when source material is revised? The compilation loop adds but doesn't clearly specify how to deprecate or update.
- The finetuning path (incorporating wiki knowledge into weights) requires training infrastructure, evaluation, and deployment that the rest of the setup deliberately avoids. What's the right threshold for making that jump?

## Alternatives and Selection Guidance

**Use [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)** when your corpus exceeds ~1M words, updates frequently, or requires sub-second retrieval at scale. RAG adds infrastructure complexity but scales beyond what indexes-in-context can handle.

**Use [Obsidian](../projects/obsidian.md) with manual curation** when you want human editorial control over the knowledge structure. The wiki pattern works when you trust the LLM to organize knowledge correctly; Obsidian's manual mode keeps humans in the authoring loop.

**Use [Graphiti](../projects/graphiti.md) or [Zep](../projects/zep.md)** when you need temporal knowledge graphs — entities that change over time, with valid-from and valid-to semantics, and structured relationship types.

**Use [Knowledge Graph](../concepts/knowledge-graph.md) systems (DKG, Neo4j)** when multiple agents need concurrent write access with conflict resolution, or when relational queries must be precise and structured.

**Use [Zettelkasten](../concepts/zettelkasten.md)** as the organizational philosophy within a Markdown Wiki. The two are compatible: Zettelkasten provides the atomic-note discipline; the wiki pattern provides the LLM compilation and linting layer on top.

**Use [Synthetic Data Generation](../concepts/synthetic-data-generation.md) + finetuning** when the wiki has reached the scale where context-window navigation is too slow or expensive, and you want the knowledge in model weights rather than files. This is the natural successor to the wiki approach, not a replacement from the start.

[Sources: @karpathy tweet](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) | [@DataChaz thread](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md) | [@himanshustwts architecture breakdown](../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md) | [Builder's Playbook](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md)


## Related

- [Andrej Karpathy](../concepts/andrej-karpathy.md) — created_by (0.6)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — alternative_to (0.6)
- [Obsidian](../projects/obsidian.md) — implements (0.8)
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — implements (0.4)
- [Zettelkasten](../concepts/zettelkasten.md) — implements (0.8)
- [MARP](../projects/marp.md) — implements (0.5)
- [OpenClaw](../projects/openclaw.md) — implements (0.4)

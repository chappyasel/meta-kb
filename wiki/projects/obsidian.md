---
entity_id: obsidian
type: project
bucket: knowledge-substrate
abstract: >-
  Obsidian is a local-first markdown editor with wikilinks, graph views, and a
  plugin ecosystem; its file-based vault format has become the de facto
  substrate for LLM-maintained personal knowledge bases.
sources:
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
  - repos/kepano-obsidian-skills.md
  - repos/michaelliv-napkin.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
related:
  - retrieval-augmented-generation
  - zettelkasten
  - andrej-karpathy
  - synthetic-data-generation
  - markdown-wiki
  - marp
  - claude-code
last_compiled: '2026-04-08T22:59:59.172Z'
---
# Obsidian

## What It Does

Obsidian is a desktop markdown editor that stores all notes as plain `.md` files in a local directory called a vault. Its defining feature is bidirectional linking: `[[Note Name]]` syntax creates wikilinks that Obsidian tracks in both directions, enabling a graph view of relationships across the knowledge base. The editor ships with a plugin API that has spawned over a thousand community plugins, turning the application into an extensible IDE for personal knowledge.

In the LLM agent context, Obsidian matters less as an editor and more as a vault format and frontend. Andrej Karpathy's widely-circulated workflow ([source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)) treats Obsidian as the human-readable frontend for an LLM-maintained markdown wiki: raw sources go into `raw/`, an LLM compiles them into wiki articles, and Obsidian renders the result. The LLM writes and maintains the wiki; the human rarely edits directly. With ~400K words across ~100 articles, Karpathy found that LLMs with auto-maintained index files handled Q&A adequately without RAG infrastructure — the index files substitute for a retrieval layer.

The vault format itself is what makes this possible. Because Obsidian stores everything as plain markdown files in a directory tree, any tool that can read and write files can interoperate with it: CLI tools, agent SDKs, CI pipelines, and text editors. There is no proprietary database to access, no API to authenticate against.

## Architecture

### Vault Structure

A vault is a directory. Obsidian adds two hidden subdirectories:

- `.obsidian/` — editor configuration (themes, plugin settings, hotkeys, workspace state). JSON files that agents can read and modify.
- `.trash/` — soft-deleted files

Everything else is user content: `.md` files for notes, `.canvas` files for infinite canvas boards, `.base` files for database-like views (the Bases plugin), and whatever other assets (images, PDFs) the user drops in.

The wikilink `[[Note Name]]` resolves by searching all `.md` files in the vault for a matching basename. Obsidian tracks these relationships in an internal index that powers the graph view and backlink panel — but this index is ephemeral, rebuilt from the file system on startup. The ground truth is always the files.

### File Formats

Obsidian Flavored Markdown composes several layers: CommonMark base, GitHub Flavored Markdown (tables, task lists), LaTeX math (`$...$`), and Obsidian extensions. The extensions that matter for agent workflows:

- **YAML frontmatter** — structured metadata at the top of each file, between `---` delimiters. The Bases plugin reads these properties to build filtered views.
- **Wikilinks** — `[[Note]]`, `[[Note#Heading]]`, `[[Note^blockid]]`. Transcluding content uses `![[Note]]`.
- **Callouts** — `> [!note]`, `> [!warning]`, etc. Obsidian renders these with icons and color.
- **Tags** — `#tag` inline or as frontmatter property.

The `.canvas` format is JSON Canvas 1.0 (jsoncanvas.org), an open spec with node types (text, file, link, group) and edges. The `.base` format is YAML defining views with filter expressions and a formula language. Both are human-readable and writable by any tool that follows the spec.

### Plugin System

The plugin API exposes the full Obsidian application object (`app`): vault file operations, workspace layout, editor state, settings. Community plugins run as untrusted JavaScript in a Chromium renderer process (Obsidian is an Electron app). Relevant plugins for agent workflows:

- **Obsidian Web Clipper** — browser extension that saves web pages as markdown to a vault. Karpathy uses this to populate `raw/` directories.
- **MARP** — renders markdown as presentation slides using the MARP slide format. Karpathy uses this to have agents generate slide decks viewable in Obsidian. See [MARP](../projects/marp.md).
- **Dataview** — query language for frontmatter properties, predates the native Bases plugin.
- **Templater** — scripted note templates with JavaScript execution.

Plugins store their settings in `.obsidian/plugins/<plugin-id>/data.json`. An agent can read and write these files to configure Obsidian programmatically.

## Core Mechanism for Agent Use

Three patterns appear repeatedly in agent-facing Obsidian deployments:

**LLM-compiled wiki.** Raw sources in `raw/`, LLM-maintained wiki in `wiki/` or alongside the raw directory. The LLM reads source documents, writes summary articles, creates cross-links, and maintains index files. Queries go to the LLM with wiki content as context. No vector database. This works at small-to-medium scale (~100 articles, ~400K words) because modern context windows can hold enough index content for the LLM to navigate without semantic search. See [Andrej Karpathy](../concepts/andrej-karpathy.md) for the specific workflow.

**Agent memory vault.** Tools like napkin use Obsidian-compatible vaults as persistent agent memory. Napkin's architecture runs BM25 search (MiniSearch) over markdown files with a composite ranking signal (BM25 score + backlink count × 0.5 + recency × 1.0). Backlink counts come from crawling all `[[wikilink]]` references — the graph structure Obsidian maintains visually becomes a retrieval signal. Progressive disclosure (L0: pinned NAPKIN.md, L1: TF-IDF overview, L2: BM25 search results, L3: full file) keeps token costs bounded. On LongMemEval-S, this approach hit 91% vs. 86% for the best prior embedding-based system — self-reported, not independently validated.

**Skill-encoded format knowledge.** Steph Ango (Obsidian's CEO) published `kepano/obsidian-skills`, a repository of SKILL.md files that teach LLM agents correct Obsidian syntax. Five skills cover Obsidian Markdown, Bases, JSON Canvas, CLI interaction, and web content extraction. These load progressively: skill descriptions (~100 tokens) at startup, full SKILL.md (~2-6K tokens) on activation, reference files on demand. The pattern — packaging domain knowledge as structured markdown for agent consumption rather than building custom API integrations — is the main contribution. See [Agent Skills](../concepts/agent-skills.md) pattern and [Claude Code](../projects/claude-code.md) for the runtime that consumes these skills.

## Relationship to Adjacent Concepts

Obsidian is often described as implementing [Zettelkasten](../concepts/zettelkasten.md), the note-linking methodology where atomic notes connect to each other rather than sitting in hierarchical folders. The bidirectional link graph is the technical substrate for this. In practice, most Obsidian users mix folder hierarchy with wikilinks rather than going purely link-based.

Obsidian vaults function as a form of [Semantic Memory](../concepts/semantic-memory.md) when maintained by agents: structured, queryable representations of factual knowledge, distinct from [Episodic Memory](../concepts/episodic-memory.md) (specific past events) or [Procedural Memory](../concepts/procedural-memory.md) (how to perform tasks). The vault accumulates through distillation — napkin's auto-distillation spawns a sub-agent after each session to extract new knowledge from the conversation and write it back as linked notes.

For retrieval, Obsidian vaults can substitute for or complement [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md). At small scale, an LLM navigating index files beats RAG because it uses full reasoning capability rather than delegating to an embedding model. At large scale (10K+ files), the absence of semantic search becomes a liability — BM25 fails on vocabulary mismatches ("authn" vs "authentication") that embedding similarity handles.

The [Markdown Wiki](../concepts/markdown-wiki.md) concept generalizes Obsidian's approach: markdown files as knowledge substrate, LLM as maintainer, human as oversight. Obsidian is the most mature tooling for this pattern, but the vault format is not Obsidian-dependent — any text editor, CLI, or agent SDK can read and write the files.

## Key Numbers

- **Stars (obsidian-skills repo):** 19.3K — high, reflects official Obsidian CEO authorship
- **Stars (napkin):** 264 — small project, early stage
- **Karpathy tweet engagement:** 9.95M views, 38.6K likes — significant signal for practitioner mindshare
- **LongMemEval-S score (napkin on Obsidian vaults):** 91% — self-reported, not independently validated by third party

## Strengths

**Format longevity.** Plain markdown files outlast any application. Switching editors, migrating to a new agent framework, or bulk-processing with scripts requires no export step. The files are already the canonical representation.

**Zero-infrastructure retrieval.** BM25 over markdown files with a fingerprint cache requires no vector database, no embedding model, no graph database. For personal knowledge bases under a few thousand files, this matches or beats RAG systems at a fraction of the operational cost.

**Human-agent co-editing.** An agent can write to vault files while a human views them in Obsidian simultaneously. File-system watchers in Obsidian detect changes and update the UI in real time. No synchronization protocol required.

**Plugin ecosystem as capability multiplier.** Plugins like Web Clipper (content ingestion), MARP (slide generation), and Dataview/Bases (structured querying) give agents a richer set of output formats without custom development.

## Critical Limitations

**Concrete failure mode — vocabulary mismatch at retrieval:** BM25 search requires term overlap between query and document. A vault full of notes using "authn/authz" fails to surface them for a query about "authentication." Embedding-based search handles this; BM25 does not. There is no fallback semantic layer in the native Obsidian tooling or in napkin's core architecture. This is manageable when the LLM maintains consistent terminology across the vault, but degrades with abbreviations, domain jargon, or multilingual content.

**Unspoken infrastructure assumption — single-user, single-machine:** Obsidian's local-first design assumes one vault, one user, one machine (or cloud sync via Obsidian Sync or Git). Multi-agent workflows writing to the same vault concurrently have no conflict resolution mechanism. Two agents appending to the same file simultaneously produce race conditions. The file system provides no transaction semantics. Teams building shared knowledge bases on Obsidian vaults need external Git workflows or strict write serialization.

## When NOT to Use It

**Multi-agent concurrent writes.** If multiple agents need to write to the same knowledge base simultaneously — parallel research pipelines, multi-agent coordination systems — Obsidian's file-based architecture has no locking or merge semantics. Use a database with proper transaction support instead.

**Large-scale semantic retrieval (10K+ files).** BM25 over markdown files works well under ~5K notes. Beyond that, vocabulary mismatches accumulate, BM25 index rebuild times grow, and the absence of semantic search becomes a real bottleneck. A system with [Hybrid Search](../concepts/hybrid-search.md) over a [Vector Database](../concepts/vector-database.md) scales better.

**Structured relational queries.** Obsidian Bases provides basic filter-and-sort over frontmatter properties, but joins across multiple property types, aggregations, and complex relational queries require a proper database. The Bases formula language (with `filter()`, `map()`, `reduce()` on lists) is surprisingly capable but not a SQL replacement.

**Production multi-tenant deployments.** Obsidian is a personal tool. There is no access control, no audit log, no API server, no authentication layer. Building a shared organizational knowledge base on raw Obsidian vaults requires wrapping all of this externally. Consider [Notion](../projects/notion.md) or purpose-built knowledge management platforms for organizational use.

## Unresolved Questions

**Distillation quality control.** When agents auto-distill conversations into vault notes (napkin's write-back loop), there is no validation that distilled notes are accurate, well-linked, or consistent with existing content. Over time, a vault receiving low-quality distillation degrades. No published tooling addresses quality scoring for distilled notes.

**Abstention calibration.** BM25 always returns ranked results — there is no confidence threshold to signal "this vault does not contain relevant information." Napkin's LongMemEval results show 50% accuracy on abstention tasks (knowing when not to answer), far below its 91% overall. For production memory systems where false confidence matters, this gap is significant and unaddressed.

**Scale ceiling for the LLM-wiki pattern.** Karpathy's workflow functions at ~100 articles and ~400K words without RAG. The transition point where this breaks down — where LLM navigation of index files fails and proper retrieval becomes necessary — is empirically unknown. No published benchmarks characterize this threshold.

**Governance for shared vaults.** If multiple humans and agents contribute to a vault, who resolves contradictions? The linting loop (LLM health checks for inconsistent data) addresses data integrity but not authority: when two notes conflict on a factual claim, there is no mechanism to determine which is correct beyond asking an LLM.

## Alternatives

**[Notion](../projects/notion.md)** — Use when you need multi-user collaboration, access control, and relational databases. Loses the plain-file advantage; API access for agents is available but rate-limited.

**[RAGFlow](../concepts/retrieval-augmented-generation.md)** — Use when retrieval quality at large scale matters more than infrastructure simplicity. Docker-based, requires MySQL, Elasticsearch, Redis, MinIO. Provides hybrid BM25 + vector + graph retrieval. Wrong choice for personal or small-team knowledge bases.

**[Graphiti](../projects/graphiti.md) / [Zep](../projects/zep.md)** — Use when you need temporal knowledge graphs with entity extraction and relationship tracking. Heavier infrastructure, but provides semantic retrieval and proper graph traversal that wikilink-based BM25 cannot match.

**[Mem0](../projects/mem0.md)** — Use when you need managed, API-accessible memory for agent deployments. Trades local-first file portability for operational simplicity and cross-session persistence across multiple agents.

**Raw Git repository with markdown.** Use when Obsidian's plugin ecosystem and GUI are unnecessary overhead. All the file-based benefits without the Electron app. Agents interact via file I/O; humans use any text editor. Lower capability ceiling (no graph view, no Bases), higher portability.

## Related Concepts

- [Zettelkasten](../concepts/zettelkasten.md) — methodology Obsidian is commonly used to implement
- [Markdown Wiki](../concepts/markdown-wiki.md) — the broader pattern Obsidian vaults instantiate
- [Agent Memory](../concepts/agent-memory.md) — Obsidian vaults as persistent memory substrate
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — the retrieval strategy napkin applies to vault content
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — what BM25-on-vault substitutes for at small scale
- [Semantic Memory](../concepts/semantic-memory.md) — the memory type agent-maintained vaults implement
- [Context Engineering](../concepts/context-engineering.md) — how vault content gets loaded into agent context
- [CLAUDE.md](../concepts/claude-md.md) — the analogous pattern for coding agent orientation; napkin's NAPKIN.md plays the same role for knowledge vaults
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — Karpathy's proposed next step: fine-tuning on vault content to encode knowledge into model weights

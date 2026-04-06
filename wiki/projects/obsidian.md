---
entity_id: obsidian
type: project
bucket: knowledge-bases
abstract: >-
  Obsidian is a local-first Markdown editor that stores notes as plain files and
  links them bidirectionally — its key differentiator is zero lock-in: all data
  stays on disk as `.md`, `.canvas`, and `.base` files that LLM agents can read
  and write directly without any API.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/kepano-obsidian-skills.md
  - repos/michaelliv-napkin.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
related:
  - rag
  - andrej-karpathy
  - progressive-disclosure
  - knowledge-base
  - claude-code
last_compiled: '2026-04-06T02:01:14.634Z'
---
# Obsidian

## What It Does

Obsidian is a personal knowledge management (PKM) application that stores everything as local Markdown files. You write notes; Obsidian renders them, tracks `[[wikilinks]]` between them, and builds a navigable link graph. No database, no cloud sync requirement, no proprietary format. The application wraps files; the files are the data.

This architecture has made Obsidian the default "frontend" for LLM-maintained knowledge bases. [Andrej Karpathy](../concepts/andrej-karpathy.md) described his setup publicly: raw source documents land in `raw/`, an LLM compiles them into a `wiki/` directory of `.md` files, and Obsidian serves as the viewer. The LLM writes; the human reads. Obsidian never needs to know an LLM touched the files.

The plugin ecosystem extends this into agent territory. The Obsidian Web Clipper extension converts web pages to `.md` files. The CLI plugin exposes a WebSocket interface so agents can issue commands (`read`, `append`, `search`) against a running Obsidian instance. The Bases plugin adds `.base` files that create database-like views over frontmatter properties. The JSON Canvas format (`.canvas`) stores infinite-canvas diagrams as plain JSON.

## Core File Formats

Obsidian's "proprietary" formats are all human-readable text or JSON, which makes them agent-friendly.

**Obsidian Flavored Markdown (`.md`)** layers several specifications:
- CommonMark as the base
- GitHub Flavored Markdown (tables, task lists, strikethrough)
- LaTeX via `$...$` and `$$...$$`
- Obsidian extensions: wikilinks (`[[Note]]`), transclusion (`![[Note]]`), callouts (`> [!type]`), block references (`[[Note#^block-id]]`), YAML frontmatter properties, comments (`%%`), highlights (`==text==`), Mermaid diagrams

Every `[[link]]` creates a bidirectional relationship stored in Obsidian's in-memory index but derivable from the files themselves by scanning for the pattern.

**Obsidian Bases (`.base`)** is a YAML file format for database views over notes. Views (table, list, cards) filter and sort files by frontmatter properties. The formula language is substantial: `filter()`, `map()`, `reduce()` on lists; date arithmetic; `hasLink()`, `hasTag()`, `inFolder()` for graph-aware queries. One documented failure point: `Duration` does not support `.round()` directly. `(now() - file.ctime).round(0)` fails silently; `(now() - file.ctime).days.round(0)` works.

**JSON Canvas (`.canvas`)** is the JSON Canvas Spec 1.0, open-sourced under MIT at jsoncanvas.org. Nodes are text, file, link, or group types. Edges connect nodes with optional directional arrows and labels. IDs are 16-character lowercase hex strings. Array order determines z-index. The format is designed for interoperability — other canvas applications can implement it without Obsidian involvement.

## The Agent Skills Layer

In December 2025, Anthropic published the Agent Skills specification (agentskills.io), a standard for packaging domain knowledge as `SKILL.md` files that coding agents load on demand. Obsidian's CEO Steph Ango published an official `kepano/obsidian-skills` repository implementing this spec for all major Obsidian formats.

The repository contains no executable code — five `SKILL.md` files plus reference directories. Each skill teaches an LLM how to produce correct files in a format it may not have seen in training data. The mechanism: YAML frontmatter with a `description` field tells the agent runtime when to activate the skill; the body is structured documentation the agent loads into context; `references/` subdirectories hold detailed API docs loaded only when needed.

This implements [Progressive Disclosure](../concepts/progressive-disclosure.md) at three levels:
1. All skill `description` fields load at startup (~500 tokens total for five skills)
2. A relevant `SKILL.md` activates when the agent works with that file type (~2-6K tokens)
3. Reference files in `references/` load on demand for deep detail (~1-3K per file)

The skills install with one command across six agent runtimes: Claude Code, Codex CLI, OpenCode, Cursor, Gemini CLI, and GitHub Copilot. This cross-platform adoption signals genuine convergence toward `SKILL.md` as a standard for teaching agents proprietary formats.

The five skills cover: Obsidian Flavored Markdown, Obsidian Bases (with full `FUNCTIONS_REFERENCE.md`), JSON Canvas (with complete JSON examples for validation), the Obsidian CLI (including a 4-step plugin development cycle), and Defuddle (a web content extractor for token-efficient web clipping).

## Role in LLM Knowledge Bases

The [Karpathy workflow](../concepts/andrej-karpathy.md) made Obsidian the reference implementation for LLM-maintained knowledge bases:

1. `raw/` — source documents (articles, papers, repos) converted to `.md` via Web Clipper
2. `wiki/` — LLM-compiled directory of concept articles with backlinks, summaries, cross-references
3. Obsidian — viewer for both layers, renders wikilinks, shows the graph, displays Marp slides and matplotlib images

The LLM writes all wiki content. The human rarely edits directly. Queries get "filed back" into the wiki, so every Q&A session enhances future retrieval. An LLM health-check pass finds inconsistencies, imputes missing data via web search, and proposes new article candidates. The knowledge base compounds.

At ~100 articles and ~400K words, Karpathy found LLM-maintained index files and brief summaries sufficient for retrieval without embedding-based [RAG](../concepts/rag.md). The LLM navigates the wiki using its own reasoning against the index, not cosine similarity from a smaller embedding model.

The [napkin](https://github.com/michaelliv/napkin) library (264 stars) formalized this pattern as an SDK. It runs BM25 search on an Obsidian-compatible vault with a backlink-weighted ranking signal, implementing the same progressive disclosure levels Karpathy described informally. On LongMemEval-S (500 questions across ~40 sessions), BM25 on structured Markdown achieved 91% accuracy against 86% for the best prior embedding-based system and 64% for GPT-4o with full context stuffing. These results are self-reported by the napkin project, not independently validated, but the benchmark is a published ICLR 2025 dataset with a defined protocol.

## Strengths

**Zero infrastructure.** The vault is a directory. No database to provision, no embedding pipeline to maintain, no vector store to pay for. An agent writes files; Obsidian reads them. File watchers pick up changes in real-time.

**Agent-native file formats.** Every Obsidian format is either plain Markdown or JSON. An LLM can produce correct `.md`, `.base`, and `.canvas` files by following the skill documentation, with no API calls and no server running.

**Interoperability.** Because files are the canonical store, any tool that reads Markdown works alongside Obsidian. Git for version control. BM25 or vector search for retrieval. Pandoc for export. The obsidian-skills repo itself has zero code — only Markdown documentation about file formats, which works because the formats are simple enough to teach in ~20K tokens.

**Plugin extensibility.** The plugin ecosystem is large (community plugins number in the thousands). For agent workflows specifically: the CLI plugin provides WebSocket-based programmatic access; the JSON Canvas MCP server exposes canvas operations to [Model Context Protocol](../concepts/mcp.md) clients; Bases adds database query capability to a file-based system.

## Critical Limitations

**No runtime validation.** When an agent writes a `.canvas` file with duplicate node IDs or a `.base` file with a formula that references a nonexistent property, Obsidian renders nothing (or errors silently). The skill documentation includes an 8-point validation checklist for canvas files, but enforcement is prose-based — the agent must remember to self-check. There is no schema enforcement at write time.

**Unspoken infrastructure assumption.** Obsidian itself is a desktop application. The file-based approach works without Obsidian running, and agent tools can read/write the vault directory directly. But the CLI plugin (which enables `read`, `append`, and `eval` commands against a live instance) requires a running Obsidian with the plugin installed and a WebSocket port open. Workflows that depend on real-time Obsidian features — plugin development cycles, live rendering verification, task queries via the Bases plugin — assume someone has Obsidian open.

## When NOT to Use It

**Multi-user or multi-agent vaults.** Obsidian has no concurrency model. Two agents writing to the same vault simultaneously will produce undefined behavior — last write wins, with no merge or conflict detection. If your architecture involves parallel agents updating a shared knowledge base, you need a system with transactional writes.

**Retrieval at scale requiring semantic recall.** BM25 on Markdown fails when queries use vocabulary that differs from note content ("authentication" won't match a note that only uses "OAuth"). At small-to-medium scale (~100-500 articles), LLM-maintained index files compensate. At tens of thousands of documents with heterogeneous terminology, you need embedding-based retrieval or a hybrid system like [HippoRAG](../projects/hipporag.md) or [GraphRAG](../projects/graphrag.md).

**Production multi-tenant deployment.** Obsidian is personal software. There is no API server, no authentication layer, no audit log, no role-based access. Teams with compliance requirements or shared knowledge bases with access controls need a different foundation.

**Workflows requiring structured query semantics.** The Bases formula language is capable but not SQL. Complex joins across multiple property types, aggregations over large note sets, or queries requiring relational integrity guarantees belong in an actual database.

## Unresolved Questions

**Skill versioning and drift.** The `kepano/obsidian-skills` repository is at version 1.0.1, manually bumped. Obsidian ships updates frequently. There is no automated mechanism to detect when the Bases formula API changes or a new callout type ships. Skills will drift from reality; the documentation gives no guidance on maintenance cadence.

**Distillation quality in the napkin pattern.** The read/write loop (inject vault context at session start, distill new knowledge at session end) assumes the LLM makes good decisions about what to extract and how to link it. Poor distillation compounds over time — bad connections pollute the backlink signal, orphaned notes get indexed but never surfaced. No quality validation exists for distilled content.

**Cost at scale.** The Karpathy workflow works at "~100 articles and ~400K words." The napkin benchmark uses per-round notes averaging ~2.5K characters. Neither source addresses what happens at 10K articles or sustained daily distillation over years. BM25 index rebuild time grows with vault size; the napkin fingerprint-based cache helps within a session but not across the first search of each new session.

**Governance of the Agent Skills spec.** The agentskills.io specification is described as an open standard published by Anthropic. Governance structure, versioning policy, and how incompatible changes propagate across the six adopting runtimes are undocumented.

## Alternatives

- **[LlamaIndex](../projects/llamaindex.md)** — Use when you need embedding-based semantic retrieval, chunking pipelines, or structured RAG with reranking. More infrastructure, better vocabulary-gap handling.
- **[ChromaDB](../projects/chromadb.md) / [Qdrant](../projects/qdrant.md)** — Use when you need a vector store as primary storage with Markdown as export format, rather than files as primary storage.
- **[Mem0](../projects/mem0.md) / [Zep](../projects/zep.md)** — Use when you need managed memory for multi-session agents with APIs for read/write rather than direct file access.
- **[Graphiti](../projects/graphiti.md)** — Use when the knowledge base needs explicit graph semantics, entity extraction, and traversal queries rather than wikilink-based graph navigation.
- **[Notion](https://notion.so)** — Use when you need multi-user collaboration, commenting, and web-based access at the cost of vendor lock-in and no local files.
- **Plain Markdown + Git** — Use when you want the same file-first properties without the Obsidian UI dependency. Loses the graph visualization and Bases plugin but gains full portability.

## Related Concepts

[Knowledge Base](../concepts/knowledge-base.md) · [Progressive Disclosure](../concepts/progressive-disclosure.md) · [Retrieval-Augmented Generation](../concepts/rag.md) · [Agent Skills](../concepts/agent-skills.md) · [skill.md](../concepts/skill-md.md) · [BM25](../concepts/bm25.md) · [Model Context Protocol](../concepts/mcp.md) · [Semantic Memory](../concepts/semantic-memory.md)

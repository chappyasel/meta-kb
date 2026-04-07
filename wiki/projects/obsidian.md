---
entity_id: obsidian
type: project
bucket: knowledge-bases
abstract: >-
  Obsidian is a local-first Markdown note-taking app with bidirectional
  wikilinks; it differentiates by storing all data as plain files you own, with
  no proprietary database lock-in.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/natebjones-projects-ob1.md
  - repos/kepano-obsidian-skills.md
  - repos/michaelliv-napkin.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
related:
  - rag
  - claude-code
  - andrej-karpathy
  - cursor
  - progressive-disclosure
  - anthropic
  - mcp
  - opencode
last_compiled: '2026-04-07T11:38:31.619Z'
---
# Obsidian

## What It Is

Obsidian is a personal knowledge management application that operates on a local folder of Markdown files. You open a directory (called a vault) and Obsidian renders the files, resolves `[[wikilinks]]` into clickable connections, and maintains a bidirectional link index so every note knows what links to it. No proprietary database. The files are yours, readable by any text editor.

[Andrej Karpathy](../concepts/andrej-karpathy.md) publicly described using Obsidian as the frontend for LLM-maintained research wikis: raw source documents go into `raw/`, an LLM compiles them into a `wiki/` directory of `.md` files, and Obsidian serves as the IDE for viewing both the source and the compiled output. He uses the [Obsidian Web Clipper](https://obsidian.md/clipper) to convert web articles into local Markdown files for LLM ingestion. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

The CEO of Obsidian, Steph Ango, released an official [Agent Skills](../concepts/skill-md.md) package (`kepano/obsidian-skills`) that teaches LLM coding agents how to correctly produce `.md`, `.base`, and `.canvas` files. This confirms the project's trajectory: Obsidian is positioning its file formats as an agent-native knowledge layer, not just a human note-taking tool. [Source](../raw/deep/repos/kepano-obsidian-skills.md)

## Architecture

Obsidian runs as an Electron desktop app (with mobile companions). Its key architectural properties:

**File-first storage.** Every note is a `.md` file on disk. Vault metadata lives in `.obsidian/` (config, themes, plugin data). The application reads this directory; it writes nothing proprietary. This is the core contract.

**Bidirectional link index.** Obsidian resolves `[[Note Name]]` wikilinks to files using shortest-path matching (no extension required). It maintains an in-memory backlink index updated via file watchers. Every note accumulates an incoming-links count that plugins and external tools can query.

**Three file formats beyond Markdown.** The skills package reveals the full surface area agents interact with:
- `.md` files use Obsidian Flavored Markdown: standard CommonMark plus wikilinks, embeds (`![[Note]]`), callouts (`> [!type]`), block references (`^blockid`), YAML frontmatter properties, LaTeX, Mermaid, and inline comments (`%% ... %%`).
- `.base` files are database-like views over YAML frontmatter. They support Table/List/Cards views, filter/sort logic, and a formula language with higher-order list functions (`filter()`, `map()`, `reduce()`), date/duration arithmetic, and 15 built-in summary functions. All data stays in the `.md` source files; `.base` is a query layer.
- `.canvas` files follow the JSON Canvas Spec 1.0 (jsoncanvas.org, MIT-licensed), an open infinite-canvas format. Nodes can be text, file references, URLs, or groups. Edges connect nodes with optional labels and arrowheads. IDs are 16-character lowercase hex strings.

**Plugin ecosystem.** A community plugin system extends Obsidian through a JavaScript API (`app.vault`, `app.workspace`, etc.). Plugins run in the Electron context with full Node.js access.

**File watcher loop.** External tools can write valid `.md`, `.base`, or `.canvas` files to the vault directory, and Obsidian updates the UI in real time without any API calls. This is what makes agent integration via file manipulation reliable, including when Obsidian is not running.

## How It Fits Into Agent Workflows

Two patterns appear in the sources:

**Karpathy's LLM wiki loop.** Raw source files (articles, papers, repos) go into `raw/`. An LLM incrementally compiles them into a `wiki/` directory, writing article files, backlinks, concept categorizations, and index files. Obsidian renders the wiki. The agent handles all writes; the human reads the output and queries it. At ~100 articles and ~400K words, index-file-based navigation works without embedding-based [RAG](../concepts/rag.md). [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

**Agent Skills integration.** The `kepano/obsidian-skills` package installs five skills into the agent's skill directory. The skills use [Progressive Disclosure](../concepts/progressive-disclosure.md): a short description triggers skill loading, the SKILL.md body provides procedural instructions, and `references/` subdirectory files load on demand for deep detail. The obsidian-cli skill bridges documentation to tool execution via WebSocket commands (`obsidian read file="My Note"`, `obsidian eval code="app.vault.getFiles().length"`). Compatible runtimes: [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), [OpenCode](../projects/opencode.md), GitHub Copilot, Codex CLI, Gemini CLI. [Source](../raw/deep/repos/kepano-obsidian-skills.md)

The napkin project uses Obsidian as its vault format. Napkin operates on `.md` files, auto-generates `.obsidian/` config, and maintains full Obsidian compatibility so a human can open the same vault in Obsidian while an agent works with it via CLI. On LongMemEval-S (40 sessions per question), BM25 search over an Obsidian-format vault achieved 91.0% accuracy vs. 86% for the prior best embedding-based system. [Source](../raw/deep/repos/michaelliv-napkin.md)

## Key Numbers

Obsidian has ~57,000 GitHub stars for the community plugins repository (the core app is closed-source). The Karpathy tweet describing the LLM wiki workflow received ~38,600 likes and ~9.9M views (self-reported engagement, Twitter/X). These numbers reflect community adoption, not performance benchmarks.

The napkin benchmark numbers (91% on LongMemEval-S, 83% on LongMemEval-M) are self-reported by the napkin project and have not been independently replicated. The methodology is documented in `bench/README.md`. [Source](../raw/repos/michaelliv-napkin.md)

## Strengths

**Zero infrastructure.** No database to deploy, no sync server to maintain, no vendor to pay for storage access. The vault is a directory of text files that works with Git, rsync, or any backup tool.

**Agent-native file formats.** The JSON Canvas spec is MIT-licensed and open. The `.base` format is documented in the skills package. Both formats are writable by agents without any SDK, just correct file syntax.

**Human-readable at every layer.** Unlike systems that store knowledge in vector databases or proprietary formats, Obsidian vaults remain inspectable. A human can read, edit, or grep any file an agent created.

**Obsidian Web Clipper.** Converts web pages to local Markdown for direct LLM ingestion, which is the primary data collection step in the Karpathy wiki loop.

**Skills ecosystem convergence.** The official `kepano/obsidian-skills` package means major AI coding tools can correctly produce Obsidian-format files out of the box. This removes the skill gap that previously caused agents to produce subtly invalid Obsidian syntax.

## Critical Limitations

**No runtime validation for agent output.** The skills are documentation. An agent writing a `.base` file with a broken formula or a `.canvas` file with duplicate node IDs gets no error until Obsidian fails to render the file. The Duration type gotcha in Obsidian Bases (`.round()` only works on numeric fields, not Duration objects directly) is documented three times in the skills package because it is the most common LLM-generated error. There is no schema enforcement at write time.

**BM25 vocabulary mismatch at scale.** When Obsidian vaults grow past ~400K words, the agent's ability to navigate using index files and keyword search depends on consistent terminology. A vault where some notes use "authn/authz" and others use "authentication/authorization" breaks keyword navigation without semantic bridging. Karpathy himself noted the potential need for RAG at larger scales. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

## Infrastructure Assumption

The entire workflow assumes local disk access and a persistent vault directory. Cloud-only agents (sandboxed, no persistent filesystem) cannot participate in the file-watcher loop. The obsidian-cli WebSocket bridge requires a running Obsidian instance on the same machine as the agent. Multi-agent or distributed scenarios where several agents write to the same vault concurrently have no conflict resolution mechanism.

## When Not to Use It

**Multi-tenant or team knowledge bases.** Obsidian has no access controls, no concurrent edit resolution, and no audit trail beyond what Git provides manually. For team wikis where multiple people or agents write simultaneously, Notion, Confluence, or a database-backed system handles concurrent access correctly.

**Semantic search requirements at scale.** For vaults above ~500K words with heterogeneous terminology, BM25 navigation degrades. If the primary use case is semantic Q&A over large corpora rather than structured knowledge compilation, a purpose-built [RAG](../concepts/rag.md) pipeline with an [Embedding Model](../concepts/embedding-model.md) and [Vector Database](../concepts/vector-database.md) handles vocabulary mismatch better.

**Structured data extraction pipelines.** Obsidian's `.base` files provide database-like views, but they query YAML frontmatter in `.md` files, not a real database. If you need joins across entities, aggregation beyond the built-in summary functions, or integration with external data sources, PostgreSQL or another [Knowledge Graph](../concepts/knowledge-graph.md) solution is more appropriate.

**Headless server environments.** Obsidian is an Electron desktop app. Running it in CI, Docker, or a server context requires workarounds. The file format works headlessly (napkin does exactly this), but the Obsidian application itself is a desktop GUI requirement.

## Unresolved Questions

**`.base` file format stability.** The Bases feature is a core plugin, but the `.base` YAML schema is not versioned with a public spec the way JSON Canvas is. If the schema changes, agent-generated `.base` files may break silently. The skills package version (1.0.1) must be manually bumped when Obsidian's format evolves.

**Agent skill trigger precision.** The Agent Skills spec matches skills by natural-language description. The obsidian-markdown skill triggers on "working with .md files in Obsidian," but many `.md` files are not Obsidian-flavored. There is no mechanism for precise triggering based on file content or vault detection, so the skill may load when irrelevant, consuming context tokens.

**Long-term distillation quality.** In the napkin/Karpathy workflow, every query session potentially writes new notes back to the vault. Over hundreds of sessions, vault quality depends entirely on the LLM's ability to identify relevant knowledge, avoid duplication, and maintain consistent terminology. There is no quality gate or human-in-the-loop review step documented in either source.

**Sync and mobile.** Obsidian Sync (paid) or third-party sync (iCloud, Dropbox, Git) is required for multi-device use. The interaction between sync conflicts and agent writes is undocumented. An agent writing files while a mobile sync is in progress could produce duplicate or corrupted notes.

## Alternatives

**[Retrieval-Augmented Generation](../concepts/rag.md) pipelines.** Use when the corpus exceeds ~500K words, requires semantic similarity matching across heterogeneous terminology, or needs sub-second query latency over millions of documents. RAG adds infrastructure complexity but handles vocabulary mismatch that BM25 cannot.

**Napkin.** Use Obsidian-format vaults but with programmatic agent access (TypeScript SDK, BM25 search, progressive disclosure, auto-distillation) rather than the Obsidian GUI. Best when the vault is entirely agent-managed and human viewing is secondary. [Napkin project](../projects/napkin.md) achieved 91% on LongMemEval-S with zero embedding infrastructure.

**Notion or Confluence.** Use for team knowledge bases where concurrent editing, access controls, and audit history matter. Both sacrifice local-first ownership and agent-native file formats for collaboration features.

**[Zettelkasten](../concepts/zettelkasten.md) without tooling.** Plain Markdown files in a directory work for purely agent-managed wikis where the human never opens a GUI. Obsidian adds value primarily for human inspection and navigation of agent output.

**[Model Context Protocol](../concepts/mcp.md) tools.** JSON Canvas has an MCP server for typed programmatic canvas operations. Use the MCP server when canvas correctness must be schema-enforced rather than documentation-guided.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md): The SKILL.md specification that makes Obsidian formats portable across agent runtimes
- [Progressive Disclosure](../concepts/progressive-disclosure.md): The L0-L3 context loading pattern napkin implements over Obsidian vaults
- [Knowledge Base](../concepts/knowledge-base.md): The broader concept Obsidian vaults instantiate
- [Zettelkasten](../concepts/zettelkasten.md): The note-linking methodology Obsidian's wikilink system was designed to support
- [CLAUDE.md](../concepts/claude-md.md): Analogous "always-loaded context" file pattern; NAPKIN.md is the Obsidian vault equivalent

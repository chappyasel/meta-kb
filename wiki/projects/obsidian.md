---
entity_id: obsidian
type: project
bucket: knowledge-bases
abstract: >-
  Obsidian is a local-first markdown note-taking app that stores all data as
  plain files; its key differentiator is bidirectional wikilinks plus a thriving
  plugin ecosystem, making it the dominant "IDE for thought" in the PKM space.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/natebjones-projects-ob1.md
  - repos/kepano-obsidian-skills.md
  - repos/michaelliv-napkin.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
related:
  - Andrej Karpathy
  - Retrieval-Augmented Generation
  - Progressive Disclosure
  - Zettelkasten
  - Markdown Wiki
  - Markdown Wiki
last_compiled: '2026-04-05T20:24:09.063Z'
---
# Obsidian

## What It Is

Obsidian is a desktop (and mobile) knowledge management app built on top of a local folder of markdown files. You point it at a directory, and it becomes your editor, graph browser, and link navigator for everything in that folder. There is no database, no proprietary format for notes themselves, and no sync requirement. The vault is just files.

The differentiator from other markdown editors is the link graph: every `[[wikilink]]` creates a bidirectional relationship tracked in memory at launch. The result is a navigable knowledge graph where you can jump from a note to every note that links to it, or explore a force-directed visualization of the whole vault. The underlying format stays plain markdown, which means you can use grep, git, or any text editor on the same files.

Obsidian has roughly 1.5 million users (self-reported, 2024). The plugin ecosystem has over 1,700 community plugins. Both figures are unverified externally.

## Architecture

### File-First Design

All note content lives in `.md` files with optional YAML frontmatter for structured properties. Obsidian reads these at startup, builds an in-memory index of links, tags, and properties, and watches for file changes via OS file watchers. The vault format is not proprietary: notes round-trip perfectly through any markdown editor.

Three Obsidian-specific file types extend the base:

- **`.canvas`** — JSON Canvas Spec 1.0 (MIT licensed, open format at jsoncanvas.org). Stores nodes (text, file, link, group) and edges as a JSON document. Positions use a coordinate system where x increases right, y increases down, and the canvas extends infinitely.
- **`.base`** — Database-like views over notes and their frontmatter properties, supporting table, list, and card layouts with a formula language. Data lives in the markdown frontmatter; `.base` files are query definitions only.
- **`.obsidian/`** — Per-vault config directory (themes, plugin settings, hotkeys). Never contains note content.

### Obsidian Flavored Markdown

Obsidian extends CommonMark with:
- **Wikilinks**: `[[Note Name]]` and `[[Note Name|Display Text]]`
- **Embeds**: `![[Note]]` transcluding entire notes, headings, blocks, images, PDFs, and search results
- **Block references**: `[[Note^blockid]]` linking to specific paragraphs
- **Callouts**: `> [!type]` blocks (note, warning, tip, etc.) rendered with distinct styling
- **Comments**: `%%hidden text%%` not rendered in preview
- **Highlighting**: `==text==`
- LaTeX via `$...$` and `$$...$$`, Mermaid diagrams, GFM tables and task lists

These extensions mean `.md` files from Obsidian render correctly in GitHub/VS Code for CommonMark content, but wikilinks and callouts show as raw syntax outside Obsidian. This is the core portability tradeoff.

### Plugin System

Plugins run as JavaScript in an Electron renderer process with direct filesystem access. The `app.vault` API lets plugins read, write, and watch files; `app.metadataCache` exposes the parsed link graph. Community plugins are installed from a registry and execute with no sandboxing — full system access, same as the main app.

Core plugins (bundled) include: Bases, Canvas, Daily Notes, Templates, Backlinks, Graph View, Command Palette, and the Sync/Publish services.

### The Bases Formula Language

The `.base` file format is worth understanding in detail because agents generating Bases content frequently get it wrong. The formula language includes:

- Global functions: `date()`, `duration()`, `now()`, `today()`, `if()`, `min()`, `max()`, `link()`, `list()`, `file()`, `image()`
- List higher-order functions: `filter()`, `map()`, `reduce()` with `value`, `index`, `acc` variables
- File graph functions: `hasLink()`, `hasTag()`, `hasProperty()`, `inFolder()`
- 15 built-in summary formulas (Average, Min, Max, Sum, Median, etc.)

The most common source of agent errors in Bases: `Duration` does not support `.round()` directly. `(now() - file.ctime).round(0)` fails; `(now() - file.ctime).days.round(0)` works. You must access a numeric field on the Duration first.

## Obsidian as LLM Infrastructure

Andrej Karpathy described using Obsidian as the "IDE frontend" for LLM-maintained knowledge bases: raw source documents go into `raw/`, an LLM compiles them into a `wiki/` directory of interlinked `.md` files, and Obsidian renders the result with its graph view, backlinks panel, and plugin ecosystem. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

This workflow treats Obsidian as a read-only viewer and linting interface for content the LLM writes. Karpathy notes that at ~100 articles / ~400K words, the LLM can navigate the wiki well enough that RAG infrastructure is unnecessary — the model maintains index files and brief summaries that let it locate relevant content.

### Agent Skills Integration

Steph Ango (Obsidian CEO) published `kepano/obsidian-skills`, a collection of SKILL.md files following the Agent Skills specification (agentskills.io), enabling LLM coding agents to correctly generate Obsidian-format files. [Source](../raw/deep/repos/kepano-obsidian-skills.md)

The repo covers five skill areas:
- **obsidian-markdown**: Wikilinks, embeds, callouts, properties, block references
- **obsidian-bases**: `.base` file format and formula language (497-line SKILL.md + 174-line FUNCTIONS_REFERENCE.md)
- **json-canvas**: Full JSON Canvas Spec 1.0 with complete JSON examples
- **obsidian-cli**: WebSocket-based CLI commands for reading, writing, and querying a running Obsidian instance
- **defuddle**: Web content extraction for cleaner markdown ingest

Installation across runtimes:
```bash
# Claude Code
/plugin marketplace add kepano/obsidian-skills

# Generic
npx skills add kepano/obsidian-skills
```

This is architecturally notable: instead of embedding an "Ask AI" button in the UI, Obsidian released structured documentation making the entire platform accessible to any Agent Skills-compatible runtime (Claude Code, Codex CLI, Cursor, VS Code Copilot, Gemini CLI).

### Napkin Integration

Napkin, a local-first agent memory system benchmarked at 91% on LongMemEval-S (vs. 86% for the prior best system), uses an Obsidian-compatible vault as its underlying storage format. [Source](../raw/deep/repos/michaelliv-napkin.md) Napkin creates `.obsidian/` config automatically, supports wikilinks and frontmatter, and stays fully openable in Obsidian while the agent works with it via CLI or SDK. This demonstrates that Obsidian's file format is usable as a knowledge base substrate independent of the Obsidian application itself.

### Web Clipping

The Obsidian Web Clipper browser extension converts web pages to markdown and saves them directly into a vault. Karpathy uses it as the primary ingest mechanism for research articles. The Defuddle library (also by Steph Ango, used in the Web Clipper) handles extraction and runs standalone for programmatic use: `defuddle parse <url> --md`.

## Strengths

**File format longevity.** Notes are plain markdown. You can stop using Obsidian tomorrow and your files remain readable, searchable, and editable with any tool. No export step, no format migration.

**Plugin ecosystem breadth.** 1,700+ community plugins cover graph analysis (Juggl), spaced repetition (Obsidian SR), slide rendering (Marp), dataview queries (Dataview plugin predates Bases), canvas tools, and dozens of LLM integration plugins.

**Agent-ready format.** The combination of plain files, frontmatter properties, wikilinks, and the official Agent Skills package makes Obsidian vaults straightforwardly consumable by LLM agents without special adapters.

**Zero infrastructure.** No server, no database, no account required for core functionality. Sync is optional (via Obsidian Sync, paid, or self-managed via git/iCloud/etc.).

**Performance at scale.** Vaults with 50,000+ notes remain performant because the link index is built in memory and file I/O is lazy.

## Critical Limitations

**Concrete failure mode: plugin unsandboxed execution.** Community plugins run with full filesystem and network access inside the Electron process. A malicious or buggy plugin can read your entire vault, exfiltrate files, or corrupt data silently. There is no permission model. Users who install community plugins from the registry accept this risk with no systematic mitigation.

**Unspoken infrastructure assumption: local storage is permanent.** Obsidian's local-first design assumes your files persist reliably. Users who rely solely on Obsidian Sync without a secondary backup (git, iCloud, external drive) have a single point of failure. Obsidian Sync version history goes back 12 months on the highest tier; older data is gone if you don't maintain independent backups. The app never reminds you of this.

## When Not to Use It

**Multi-author collaborative wikis.** Obsidian has no real-time collaboration, no merge conflict resolution, and no access controls. Teams editing the same vault via git will encounter merge conflicts on note edits. Use Notion, Confluence, or a hosted wiki for any genuinely shared, concurrent editing scenario.

**Structured data-first workflows.** If your primary need is a relational database of records (CRM, project tracker, inventory), Bases and Dataview are workarounds over a file system, not replacements for actual databases. The frontmatter property approach breaks down when you need multi-table joins, referential integrity, or transactional writes.

**Mobile-primary usage.** The mobile apps (iOS, Android) are functional but substantially behind the desktop experience in plugin support and performance on large vaults. If your workflow centers on mobile capture, Obsidian is a poor fit.

**Regulated or audited environments.** There is no audit log, no role-based access control, and no SOC 2 or HIPAA certification for the core app. Sync and Publish are hosted services without published compliance documentation.

## Unresolved Questions

**Plugin governance.** The community plugin registry has a review process, but it does not enforce security standards or audit plugin behavior post-publication. There is no documented process for revoking a plugin that later turns malicious. How Obsidian handles supply-chain risk in the plugin ecosystem is not publicly explained.

**Bases at scale.** Bases queries run against frontmatter properties across potentially thousands of files. There is no documentation on query performance ceilings, indexing strategy, or behavior when formula evaluation touches hundreds of files with complex filters. Whether Bases is usable as a primary project management tool at 10K+ notes is an open empirical question.

**Agent Skills specification stability.** The agentskills.io spec was published December 2025. The `kepano/obsidian-skills` repo is at version 1.0.1 with no automated mechanism to detect when Obsidian feature updates break skill accuracy. There is no changelog policy or versioning commitment for how skill documentation stays current with Obsidian releases.

**Sync conflict resolution.** When the same note is edited on two devices before sync, Obsidian Sync creates a conflict copy. The resolution is manual. For users running LLM agents that write to the vault on a desktop while editing on mobile, the conflict rate could be high. The sync architecture's behavior under concurrent agent + human writes is not documented.

## Alternatives

- **[Zettelkasten](../concepts/zettelkasten.md) via plain files + git** — Use when you want maximum portability and no application dependency, accepting manual link management.
- **Notion** — Use when you need multi-author collaboration, structured databases, or team access controls, accepting vendor lock-in.
- **[Napkin](../projects/napkin.md)** — Use when your primary consumer is an LLM agent and you want benchmark-validated retrieval without the Obsidian UI layer.
- **[Markdown Wiki](../concepts/markdown-wiki.md)** — Use when you want the format without the app; Obsidian is one possible renderer for any markdown wiki structure.
- **Logseq** — Use when you prefer an outliner (block-first) mental model over a document-first one; also local-first with a similar file format.
- **Roam Research** — Use when you want the original bidirectional linking app with a hosted cloud model, accepting higher cost and no local files.

## Related Concepts

- [Zettelkasten](../concepts/zettelkasten.md) — The note-linking methodology Obsidian most commonly implements
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — The L0-L3 loading pattern used by Napkin on Obsidian vaults
- [Markdown Wiki](../concepts/markdown-wiki.md) — The broader category Obsidian vaults belong to
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — What Karpathy found he could avoid by maintaining a well-structured Obsidian wiki

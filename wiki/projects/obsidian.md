---
entity_id: obsidian
type: project
bucket: knowledge-bases
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/kepano-obsidian-skills.md
  - repos/michaelliv-napkin.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
related: []
last_compiled: '2026-04-05T05:25:03.270Z'
---
# Obsidian

## What It Is

Obsidian is a desktop application for personal knowledge management built on a simple premise: your notes are plain markdown files stored locally, and the app adds a graph of bidirectional links on top. You own the files. Open them in any editor. No lock-in.

The core loop: write in markdown, link notes with `[[wikilinks]]`, navigate the resulting graph, extend behavior through plugins. That's most of what most users do with it.

## Architectural Decisions

**Local-first, file-based.** The vault is a directory of `.md` files. Obsidian reads and writes them directly. No proprietary database, no cloud sync required. This is the design choice that shapes everything else.

**Plugin ecosystem.** A JavaScript plugin API lets community developers extend almost everything. The community plugin library has thousands of plugins. This is both the main strength and the main maintenance surface area.

**`.obsidian/` config directory.** All vault-specific settings, plugin configs, and hotkeys live in `.obsidian/` alongside your notes. This means vault config travels with the vault when you move it or share it.

**Separate sync layer.** Obsidian Sync is a paid add-on. Without it, you sync through whatever filesystem sync you already use (iCloud, Dropbox, git). The app doesn't care.

## How It Works

The bidirectional link index is built at vault open time by scanning all `.md` files for `[[wikilink]]` patterns and building a backlink map. The graph view renders this as a force-directed node graph. Search is local full-text across all files.

The canvas feature (`.canvas` files) stores a JSON representation of a spatial layout of notes and embedded content. The Bases feature (`.base` files) adds structured querying over note properties, similar to a lightweight local database view.

The Obsidian Web Clipper browser extension saves web pages as markdown directly into a vault, stripping HTML and preserving structure.

## The LLM Workflow Context

[Andrej Karpathy's workflow](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) made explicit what Obsidian's architecture affords for LLM-driven knowledge bases: because everything is markdown files in a directory, an LLM can read, write, and reorganize the vault through normal filesystem operations. Karpathy uses Obsidian as the viewing frontend while the LLM maintains the wiki, rarely editing files manually. The LLM writes summaries, articles, and backlinks into `.md` files; Obsidian renders them.

This works because the file format is completely open. An LLM agent writing to `architecture/decision-001.md` sees its output rendered with backlinks and graph connections immediately when you open Obsidian. No API, no special integration needed.

The [napkin project](../../raw/repos/michaelliv-napkin.md) formalizes this pattern: it runs a BM25 search index over Obsidian-compatible markdown vaults and exposes a CLI for agents to query, read, and write notes. Its vault structure (`.napkin/` config alongside `.obsidian/`) sits inside a standard Obsidian vault, meaning you get both human-friendly browsing and agent-friendly tooling from the same files. Napkin's LongMemEval benchmarks (83-92% accuracy depending on session length) are self-reported and specific to their BM25 retrieval setup, not a general claim about Obsidian.

## Strengths

**No retrieval infrastructure required at small-to-medium scale.** A vault of 100-400 articles (~400K words) fits in a long-context LLM window with selective loading. You don't need embeddings, vector databases, or RAG pipelines to do useful Q&A over a knowledge base at this size.

**Format durability.** Markdown files from 2019 open fine today. When Obsidian changes or disappears, your notes remain readable.

**Plugin surface area.** Marp for slide rendering, Dataview for structured queries over frontmatter, Excalidraw for diagrams, community sync plugins. The ecosystem covers unusual workflows.

**Human-readable structure.** Unlike Notion or Roam, you can grep, diff, and version-control the vault in git. This matters when LLMs generate content you want to audit.

## Limitations

**Concrete failure mode: sync conflicts.** If two devices edit the same file before sync completes, you get conflicted copies with names like `Note (conflicted copy 2024-01-15).md`. Obsidian has no built-in conflict resolution. You resolve this manually or with git. With LLM agents writing files and humans editing simultaneously, conflict frequency increases.

**Unspoken infrastructure assumption: single-user, single-vault.** Obsidian has no real-time collaboration. The commercial Obsidian Publish product shares vaults as static sites, not as collaborative editors. Teams using a shared vault over a network drive hit file-locking and sync issues quickly.

**Plugin stability.** Community plugins are maintained by individuals. Plugins break on Obsidian updates. A workflow built on three plugins has three independent maintenance dependencies. Some widely-used plugins have gone unmaintained for months.

**Graph view doesn't scale.** With thousands of notes, the force-directed graph renders slowly and provides little navigational value. It's useful for smaller vaults or as a visual artifact.

## When NOT to Use It

If your team needs to co-edit notes in real time, Obsidian is the wrong tool. Use Notion, Confluence, or a wiki.

If your knowledge base will exceed 10,000 notes with complex relational queries, the Dataview plugin and manual linking become load-bearing infrastructure that requires ongoing maintenance. A purpose-built tool handles this better.

If you need guaranteed mobile-first workflows, the Obsidian mobile apps work but feel secondary to the desktop experience, and sync setup adds friction.

## Unresolved Questions

**Governance and longevity.** Obsidian is a private company (Dynalist Inc.) with no public funding information. The free tier is generous but the company's revenue model depends on Obsidian Sync and Publish subscriptions. No clarity on what happens to the app if the company folds, though the local-first design means your notes survive either way.

**Plugin API stability.** The plugin API is not formally versioned. Breaking changes happen. There's no documented deprecation policy.

**LLM write conflicts at scale.** As more workflows involve LLM agents writing to vaults in parallel with human editing, the lack of any locking or transaction model becomes a real operational question. Karpathy's workflow handles this by having the LLM own writes almost entirely. Mixed workflows have no documented best practice.

## Alternatives

Use **Notion** when you need structured databases, team collaboration, or prefer a hosted product with a support contract.

Use **git + raw markdown** (no Obsidian) when your primary interface is an LLM agent and human browsing is rare. The extra tooling Obsidian provides is unnecessary overhead.

Use **Logseq** when you prefer an outline-first, block-based structure over document-first notes. Also local-first and open-source.

Use **Roam Research** when you want a hosted bidirectional-linking tool with an active research community and don't care about local file access.

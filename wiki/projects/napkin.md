# Napkin

> Local-first, file-based knowledge system for agents using BM25 search and progressive disclosure instead of embeddings or vector databases. Key differentiator: outperforms prior systems on LongMemEval with zero preprocessing -- just BM25 on markdown files.

## What It Does

Napkin provides a knowledge vault for agents built on plain markdown files with Obsidian compatibility. Instead of dumping the full vault into context, it reveals information through four progressive disclosure levels: Level 0 is a NAPKIN.md context note (~200 tokens), Level 1 is a vault overview with TF-IDF keywords (~1-2k tokens), Level 2 is ranked BM25 search results with snippets (~2-5k tokens), and Level 3 is full file content (~5-20k tokens). Available as both a CLI (`npm install -g napkin-ai`) and a TypeScript SDK. The CLI supports CRUD operations, daily notes, tags, properties, tasks, backlinks, templates, bookmarks, canvas, and an interactive force-directed graph visualization. A distill extension spawns a sub-agent to extract knowledge from the current session into the vault.

## Architecture

TypeScript with Bun runtime. Core modules are pure logic that return typed data and throw errors -- no stdout, no process.exit. CLI commands are thin wrappers (Commander) that parse args, call SDK methods, and format output. Vault structure: `.napkin/` for config, `.obsidian/` for Obsidian compatibility (auto-generated), content in project root. Templates scaffold domain-specific structures (coding, company, product, personal, research). Search uses BM25 ranking without embeddings. Two Pi extensions: `napkin-context` injects vault overview into system prompt at session start, `napkin-distill` forks the session and spawns a sub-agent to distill knowledge in the background.

## Key Numbers

- 264 GitHub stars, 11 forks
- LongMemEval benchmark: 91.0% on S set (vs 86% best prior), 83.0% on M set (vs 72% best prior)
- Zero preprocessing: no embeddings, no graphs, no summaries
- 5 vault templates (coding, company, product, personal, research)
- MIT license

## Strengths

- BM25 matching or exceeding RAG systems on LongMemEval proves that heavyweight vector infrastructure is not necessary for effective retrieval
- Progressive disclosure gives agents natural token budget control without explicit context window management
- Full Obsidian compatibility means humans can browse and edit the same vault with existing tools

## Limitations

- BM25 has no semantic understanding; queries using different vocabulary than stored content will miss relevant results
- Small star count (264) and low fork count (11) indicate early adoption; the ecosystem is thin
- Distill extension depends on the Pi agent specifically; not portable to other agent frameworks without adaptation

## Alternatives

- [simplemem.md](simplemem.md) — use when you need multimodal memory (images, audio, video) or semantic compression
- [acontext.md](acontext.md) — use when you want skill-based memory that learns from agent execution traces
- [arscontexta.md](arscontexta.md) — use when you want a research-backed knowledge system generated from conversation rather than manually structured

## Sources

- [../../raw/repos/michaelliv-napkin.md](../../raw/repos/michaelliv-napkin.md) — "zero preprocessing. No embeddings, no graphs, no summaries. Just BM25 search on markdown files"

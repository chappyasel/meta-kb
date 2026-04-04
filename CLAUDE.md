# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is meta-kb?

A living, LLM-compiled knowledge base about building LLM knowledge bases. Sources (tweets, repos, papers, articles) are ingested into `raw/` as markdown with YAML frontmatter, scored for relevance by LLM, then compiled into a structured wiki in `wiki/`.

## Commands

```bash
# Install dependencies
bun install

# Ingest sources (auto-detects platform from URL)
bun run ingest <url1> [url2] ...

# Platform-specific ingestion (reads from config/sources.json if no args)
bun run ingest:twitter [urls...]
bun run ingest:github [urls...]    # supports --min-stars N --min-relevance N
bun run ingest:arxiv [urls...]
bun run ingest:article [urls...]

# Score all unscored raw sources for relevance
bun run rescore                    # unscored only
bun run rescore --force            # re-score everything
bun run rescore --dry-run          # preview what would be scored

# Compile wiki from raw sources (not yet implemented)
bun run compile

# Tests
bun test
```

## Architecture

### Data Pipeline

```
config/sources.json    Source URLs to ingest (tweets, repos, papers, articles)
        │
        ▼
scripts/ingest*.ts     Platform-specific scrapers that fetch, classify, and write
        │
        ▼
raw/{tweets,repos,     Markdown files with YAML frontmatter (RawSourceFrontmatter)
 articles,papers}/     Each file has: url, type, author, date, tags, key_insight,
        │              engagement metrics, and relevance_scores (4-dimension + composite)
        ▼
build/                 Intermediate artifacts:
  seen-urls.json         Dedup set (seeded from raw/ frontmatter URLs)
  discovered-urls.jsonl  URLs found during ingestion for later review
  research/              Discovery pipeline candidates
        │
        ▼
wiki/                  Compiled output (concepts/, projects/, comparisons/, approaches/, indexes/)
```

### Ingestion Chain Behavior

Scrapers auto-chain to related content:

- **Twitter** scraper extracts expanded URLs from tweet entities, auto-ingests linked GitHub repos and articles
- **GitHub** scraper detects awesome-lists (by name, heading, or link density >50) and recursively ingests linked repos
- **Article** scraper extracts GitHub URLs from content and auto-ingests those repos

All scrapers share a `seen` set (`build/seen-urls.json`) for cross-scraper dedup. The `markSeen()` function returns `true` if already seen (skip it).

### LLM Calls (scripts/utils/llm.ts)

Two LLM functions, both using Vercel AI SDK (`generateObject` with Zod schemas):

- **`generateInsightAndTags`** — Haiku 4.5. Produces `key_insight` + taxonomy tags for every source.
- **`scoreRelevance`** — Sonnet 4.6. 4-dimension scoring (topic_relevance, practitioner_value, novelty, signal_quality) with weighted composite (0.4/0.3/0.15/0.15). Called at write time by `writeRawSource()`.

### Taxonomy Buckets

All tags and scoring reference these 5 topic areas:

1. **knowledge-bases** — Karpathy pattern, markdown wikis, compiled vs curated
2. **agent-memory** — Mem0, Letta, Graphiti, episodic/semantic/working memory
3. **context-engineering** — CLAUDE.md standards, context graphs, compression
4. **agentic-skills** — Skill composition, registries, modular capabilities
5. **self-improving** — Autoresearch, observe/correct/improve loops, health checks

### Research Pipeline (scripts/research/)

Two-phase discovery system (gitignored, not committed):

1. `discover.ts` — Finds candidates via conversation graph mining, topic search, and GitHub search. Outputs scored candidates to `build/research/`.
2. `ingest-approved.ts` — Reads `build/research/approved.txt` (one URL per line) and ingests approved candidates into `raw/`.

## Key Design Decisions

- **Never overwrite existing raw files.** `writeRawSource()` skips if file exists. To re-ingest, delete the file first.

Runtime: **Bun** (uses `Bun.write`, `Bun.file`, `import.meta.main`). TypeScript with ESNext modules.

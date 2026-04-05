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

# Compile wiki from raw sources
bun run compile                    # full 8-pass compilation
bun run compile --from-pass=3a     # resume from synthesis articles
bun run compile --from-pass=3c     # just claims + indexes + eval
bun run compile --from-pass=7      # just self-eval

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
  source-index.json      Source metadata index
  raw-entities.json      Pre-resolution entity mentions
  entities.json          Canonical entities with article levels
  graph.json             Knowledge graph (nodes, edges, clusters)
  claims.json            Atomic claims extracted from synthesis articles
  eval-report.json       Self-eval verification results
  research/              Discovery pipeline candidates
        │
        ▼
wiki/                  Compiled output:
  ROOT.md                Agent-optimized topic index (<2K tokens)
  field-map.md           Flagship overview connecting all 5 areas
  {bucket}.md            5 synthesis articles with abstracts + staleness markers
  projects/              Project reference cards with abstracts
  concepts/              Concept explainers with abstracts
  indexes/               Project, topic, missing coverage indexes
  comparisons/           Landscape comparison table
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

### Compilation Pipeline (scripts/compile.ts)

8-pass pipeline, resumable via `--from-pass`:

| Pass | Model | What |
|------|-------|------|
| 0 | — | Load & index all raw sources |
| 1a | Haiku (×170, parallel) | Entity extraction per source |
| 1b | Sonnet (×1) | Entity resolution & dedup |
| 2 | Sonnet (×1) | Graph construction from co-occurrences |
| 3a | Sonnet (×5, sequential) | Synthesis articles with abstracts + staleness markers |
| 3b | Sonnet (×67, parallel) | Reference cards with abstracts |
| 3c | Sonnet (×5, sequential) | Claim extraction from synthesis articles |
| 4 | — | Field map, ROOT.md (template), indexes |
| 5 | — | Mermaid diagrams + backlinks |
| 6 | — | Changelog |
| 7 | Haiku (×30, parallel) | Self-eval: verify claims against sources |

Full article threshold: 3+ source refs AND 7.0+ relevance (both required).

## Key Design Decisions

- **Never overwrite existing raw files.** `writeRawSource()` skips if file exists. To re-ingest, delete the file first.
- **Claims are atomic.** Each claim in `build/claims.json` is one verifiable statement with source provenance, enabling automated quality verification.
- **Progressive disclosure.** ROOT.md (<2K tokens) → abstracts in frontmatter → full articles → raw sources. Agents load minimum context needed.
- **Self-eval as fitness function.** Pass 7 samples 30 claims and verifies against sources. Accuracy metric enables Karpathy-loop style prompt improvement across compilations.

Runtime: **Bun** (uses `Bun.write`, `Bun.file`, `import.meta.main`). TypeScript with ESNext modules.

# Architecture

## Data Pipeline

```
config/sources.json    Source URLs to ingest (tweets, repos, papers, articles)
        │
        ▼
scripts/ingest*.ts     Platform-specific scrapers that fetch, classify, and write
scripts/curate-*.ts    Feed-based discovery (bird CLI for Twitter, GitHub search API)
        │
        ▼
raw/{tweets,repos,     Markdown files with YAML frontmatter (RawSourceFrontmatter)
 articles,papers}/     Each file has: url, type, author, date, tags, key_insight,
        │              engagement metrics, and relevance_scores (4-dimension + composite)
        ▼
build/                 Intermediate artifacts:
  curate.db              SQLite: seen_urls, evaluated_items, curate_runs
  seen-urls.json         Legacy dedup set (migrated to curate.db on first curate run)
  discovered-urls.jsonl  URLs found during ingestion for later review
  source-index.json      Source metadata index
  entities.json          Canonical entities with article levels
  graph.json             Knowledge graph (nodes, edges, clusters)
  claims.json            Atomic claims extracted from synthesis articles
  eval-report.json       Self-eval verification results
        │
        ▼
wiki/                  Compiled output:
  ROOT.md                Agent-optimized topic index (<2K tokens)
  field-map.md           Flagship overview connecting all 6 areas
  {bucket}.md            6 synthesis articles with abstracts + staleness markers
  projects/              Project reference cards with abstracts
  concepts/              Concept explainers with abstracts
  indexes/               Project, topic, missing coverage indexes
  comparisons/           Landscape comparison table
```

## Ingestion Chain Behavior

Scrapers auto-chain to related content:

- **Twitter** scraper extracts expanded URLs from tweet entities, auto-ingests linked GitHub repos and articles
- **GitHub** scraper detects awesome-lists (by name, heading, or link density >50) and recursively ingests linked repos
- **Article** scraper extracts GitHub URLs from content and auto-ingests those repos

All scrapers share a `seen` set (`build/seen-urls.json` + `build/curate.db`) for cross-scraper dedup.

## Curation Pipeline

Feed-based discovery via `curate:twitter` and `curate:github`:

- **Twitter**: Uses `bird` CLI to fetch home feed (no keyword search — your follow list IS the curation). Auth via Chrome cookie extraction. Resolves t.co URLs, extracts X articles (bird `article` field + Xquik full text), and quoted tweet content. Min 200 words (enriched).
- **GitHub**: Uses GitHub search API with domain-derived queries across 3 time tiers (new this week / recent breakouts / active established repos).
- **Three-layer quality gate**:
  1. Haiku smoke test >= 5.0 (cheap pre-filter, ~$0.001/item)
  2. `ingestGithubRepo` relevance gate >= 6.0 (curation) / >= 5.0 (auto-chain)
  3. `writeRawSource` Sonnet composite >= 6.0 — auto-rejects for curation/auto-chain, prompts user for manual ingestion
- **State**: SQLite database (`build/curate.db`) tracks seen URLs, evaluated items with scores, and run metadata. Auto-migrates from legacy `build/seen-urls.json`.
- **Provenance**: Curated sources get `discovered_via` in frontmatter (e.g. `curate:twitter/home`, `curate:github/new`).

## LLM Calls (scripts/utils/llm.ts)

Three functions, all using Vercel AI SDK (`generateObject` with Zod schemas):

- **`generateInsightAndTags`** — Haiku 4.5. Produces `key_insight` + taxonomy tags for every source.
- **`smokeTest`** — Haiku 4.5. Lightweight 4-dimension scoring for curation pre-filtering.
- **`scoreRelevance`** — Sonnet 4.6. 4-dimension scoring (topic_relevance, practitioner_value, novelty, signal_quality) with weighted composite (0.4/0.3/0.15/0.15). Called at write time by `writeRawSource()`.

## Compilation Pipeline (scripts/compile.ts)

9-pass pipeline, resumable via `--from-pass` and `--to-pass`:

| Pass | Model | What |
|------|-------|------|
| 0 | — | Load & index all raw sources |
| 1a | Haiku (parallel) | Entity extraction per source |
| 1b | Sonnet (x1) | Entity resolution & dedup |
| 2 | Sonnet (x1) | Graph construction from co-occurrences |
| 3a | Opus (per bucket) | Synthesis articles with abstracts + staleness markers |
| 3b | Sonnet (per entity) | Reference cards with abstracts |
| 3c | Sonnet (per bucket) | Claim extraction from synthesis articles |
| 4 | — | Field map, ROOT.md, indexes, README |
| 5 | — | Mermaid diagrams + backlinks |
| 6 | — | Changelog |
| 7 | Sonnet (x30) | Self-eval: verify claims against sources |
| 8 | Sonnet (~15) | Auto-fix: find better sources for failed claims |

Full article threshold: 3+ source refs AND 7.0+ relevance (both required).

## Research Pipeline (scripts/research/)

Two-phase discovery system (gitignored, not committed):

1. `discover.ts` — Finds candidates via conversation graph mining, topic search, and GitHub search. Outputs scored candidates to `build/research/`.
2. `ingest-approved.ts` — Reads `build/research/approved.txt` (one URL per line) and ingests approved candidates into `raw/`.

## Agent Skills

The skill graph in `.claude/skills/` provides agent-native compilation:

| Skill | Purpose |
|-------|---------|
| `compile-wiki` | Full compilation orchestrator (6 phases, spawns subagents) |
| `incremental-compile` | Incremental recompilation (detects changes, selective synthesis) |
| `compile-synthesis` | Writes one synthesis article per bucket |
| `compile-cards` | Writes reference cards for entities |
| `compile-field-map` | Writes the field-map.md overview |
| `compile-index` | Generates ROOT.md, indexes, comparison table |
| `compile-claims` | Extracts claims + runs self-eval |
| `deep-research` | Deep-dives into a project/paper's source code |

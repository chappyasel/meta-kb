# CLAUDE.md

## What is meta-kb?

A self-improving knowledge base about LLM agent infrastructure. Sources (tweets, repos, papers, articles) are ingested into `raw/` as markdown with YAML frontmatter, scored for relevance by LLM, then compiled into a structured wiki in `wiki/`.

## Commands

```bash
bun install                        # install dependencies

# Ingestion (manual — prompts user if relevance < 6.0)
bun run ingest <url1> [url2] ...   # ingest sources (auto-detects platform)
bun run ingest:twitter [urls...]   # platform-specific ingestion
bun run ingest:github [urls...]    # supports --min-stars N --min-relevance N
bun run ingest:arxiv [urls...]
bun run ingest:article [urls...]

# Curation (automated — auto-rejects relevance < 6.0)
bun run curate:twitter             # discover from home feed (100 tweets, bird CLI)
bun run curate:twitter --count 200 # more tweets per run
bun run curate:github              # discover repos via GitHub search API (all tiers)
bun run curate:github --tier new   # only repos created this week

# Compilation
bun run compile                    # full 9-pass compilation → wiki/, build/
bun run compile --incremental      # only recompile what changed since last run
bun run compile --status           # show pending changes without compiling

bun run rescore                    # score unscored sources for relevance
bun test                           # run incremental compilation tests
```

## Architecture

See @docs/ARCHITECTURE.md for detailed pipeline docs, LLM calls, and compilation passes.

**Data flow:** `config/sources.json` or `curate:*` → `scripts/ingest*.ts` / `scripts/curate-*.ts` → `raw/` → `scripts/compile.ts` → `wiki/`

**State:** `build/curate.db` (SQLite: seen URLs, evaluated items, run history). Legacy `build/seen-urls.json` auto-migrates on first curate run.

**Quality gate:** Every source is scored by Sonnet at write time. Below 6.0 composite: auto-rejected for curation/auto-chain, user-prompted for manual ingestion.

**Domain config:** All topic-specific content (taxonomy buckets, scoring calibration, audience) lives in `config/domain.ts` — the single file to edit when forking for a new topic.

## Key Design Decisions

- **Never overwrite existing raw files.** `writeRawSource()` skips if file exists. Delete the file first to re-ingest.
- **Three-layer curation gate.** Haiku smoke ≥ 5.0 → ingestion relevance gate ≥ 6.0 → Sonnet write gate ≥ 6.0.
- **Claims are atomic.** Each claim in `build/claims.json` is one verifiable statement with source provenance.
- **Progressive disclosure.** ROOT.md (<2K tokens) → abstracts → full articles → raw sources.

Runtime: **Bun** (uses `Bun.write`, `Bun.file`, `import.meta.main`). TypeScript with ESNext modules.

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health

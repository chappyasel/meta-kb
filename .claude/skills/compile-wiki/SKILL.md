---
name: compile-wiki
description: >
  Compiles the wiki from raw markdown sources. Read `config/domain.ts` for the
  domain topic and taxonomy. Orchestrates a multi-phase pipeline using subagents:
  read sources, write synthesis articles, write reference cards, generate field
  map and indexes, extract claims, and run self-eval. Use when asked to compile,
  build, or generate the wiki from raw sources.
---

# Compile Wiki

Read `config/domain.ts` for the domain topic, audience, and taxonomy bucket definitions.

Compile the wiki from raw sources in `raw/` and `raw/deep/`. Output goes to
`wiki/` by default, or `wiki-{agent}/` when running as a comparison alongside
the script pipeline (`bun run compile`).

## Pipeline Overview

```
Phase 1: Scan sources     (you do this — build source manifest)
Phase 2: Synthesis         (5 parallel subagents — one per bucket)
Phase 3: Field map         (sequential — needs all 5 synthesis articles)
Phase 4: Reference cards   (parallel subagents — batched by entity)
Phase 5: Indexes           (sequential — needs all articles)
Phase 6: Claims + eval     (sequential — needs synthesis articles)
```

## Phase 1: Scan Sources

Read every `.md` file in `raw/{tweets,repos,papers,articles}/` and
`raw/deep/{repos,papers}/`.

For each source, extract from YAML frontmatter: `url`, `type`, `author`,
`date`, `tags`, `key_insight`, `stars` (if present), and
`relevance_scores.composite`.

Group sources by the 5 taxonomy buckets (see [references/taxonomy.md](references/taxonomy.md)).
A source can belong to multiple buckets based on its tags.

Write `build/bucket-sources.json` with this structure:
```json
{
  "knowledge-bases": [{ "path": "repos/foo.md", "relevance": 8.1, "key_insight": "..." }],
  "agent-memory": [...],
  ...
}
```

## Phase 2: Synthesis Articles (Parallel)

Launch **one subagent per bucket** (as defined in `config/domain.ts`) **in parallel**. Each subagent's task:

> "Use the compile-synthesis skill to write a synthesis article for the
> {bucket} bucket. Sources for this bucket: {list paths + key_insights from
> bucket-sources.json}. Write output to wiki/{bucket}.md."

Each subagent reads the raw sources it needs and writes one article.

**After all complete:** Verify `wiki/{bucket-id}.md` exists for all buckets.
If any are missing, retry that subagent.

## Phase 3: Field Map (Sequential)

Launch **1 subagent**:

> "Use the compile-field-map skill to write wiki/field-map.md. Read config/domain.ts
> for bucket definitions. The synthesis articles are at wiki/{bucket-id}.md for each bucket."

## Phase 4: Reference Cards (Parallel)

Determine which entities deserve full articles: entities mentioned in 3+
sources with max relevance >= 7.0 across those sources.

Launch **subagents in batches** (5-10 at a time):

> "Use the compile-cards skill to write reference cards for these entities:
> {entity name, type, bucket, top 5 source paths}. Write to
> wiki/projects/{slug}.md or wiki/concepts/{slug}.md."

**After all complete:** Verify expected output files exist.

## Phase 5: Indexes (Sequential)

Launch **1 subagent**:

> "Use the compile-index skill to generate wiki/ROOT.md, wiki/indexes/
> (projects.md, topics.md, missing.md), wiki/comparisons/landscape.md, and
> wiki/README.md from the compiled articles in wiki/."

## Phase 6: Claims + Self-Eval (Sequential)

Launch **1 subagent**:

> "Use the compile-claims skill to extract claims from the synthesis articles
> in wiki/ (one per bucket from config/domain.ts) and run self-eval against
> raw sources. Write build/claims.json and build/eval-report.json."

## Quality Rules

See [references/quality.md](references/quality.md) for citation rules,
benchmark credibility, failure mode naming, and neutrality requirements.

Read and follow the writing rules in `.claude/skills/stop-slop/SKILL.md`.

## Output Structure

```
wiki/
  ROOT.md              # Agent-optimized topic index (<2K tokens)
  field-map.md         # Systems overview (3000-5000 words)
  {bucket}.md          # 5 synthesis articles with abstracts
  projects/*.md        # Project reference cards with abstracts
  concepts/*.md        # Concept explainers with abstracts
  indexes/*.md         # Project, topic, missing indexes
  comparisons/*.md     # Landscape comparison table
  README.md            # Human entry point

build/
  bucket-sources.json  # Source manifest by bucket
  claims.json          # Atomic claims with provenance
  eval-report.json     # Self-eval verification results
```

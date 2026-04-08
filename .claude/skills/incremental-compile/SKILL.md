---
name: incremental-compile
description: >
  Incrementally recompiles changed parts of the wiki after new sources are
  ingested. Detects source changes via content hashing, identifies dirty
  buckets and entities, regenerates only affected synthesis articles and
  reference cards, and updates indexes. Use when sources were recently
  ingested and the wiki needs updating without a full recompilation.
---

# Incremental Compile

Recompile only what changed. Read `config/domain.ts` for the domain topic
and taxonomy. Read `build/incremental-state.json` for the previous
compilation state. Output goes to `wiki/`.

If no `build/incremental-state.json` exists, fall back to the full
`compile-wiki` skill instead.

## Pipeline Overview

```
Phase 0: Change detection   (you do this — diff source hashes)
Phase 1: Impact analysis     (you do this — reason about what changed)
Phase 2: Selective synthesis  (subagents for dirty buckets only)
Phase 3: Selective cards      (subagents for dirty entities only)
Phase 4: Indexes + field map  (always indexes, conditionally field-map)
Phase 5: Claims + state save  (claims for dirty buckets, save state)
```

## Phase 0: Change Detection

1. Read `build/incremental-state.json`. If missing, stop and use `compile-wiki` instead.

2. Read `config/domain.ts`. Compute whether the domain config changed since
   last compilation (compare bucket definitions, topic, audience). If the
   domain config changed materially, stop and use `compile-wiki` for a full run.

3. Scan all `.md` files in `raw/{tweets,repos,papers,articles}/` and
   `raw/deep/{repos,papers}/`. For each, compute a SHA-256 of the file contents.

4. Diff current hashes against `incremental-state.json.source_hashes`:
   - **Added**: path exists on disk but not in state
   - **Modified**: path exists in both but hash differs
   - **Deleted**: path exists in state but not on disk

5. If nothing changed, report "Wiki is current" and stop.

6. Report the change summary:
   ```
   Incremental compilation:
     Added:    articles/gustycube-...md (relevance 7.5)
     Added:    repos/gustycube-membrane.md (relevance 8.0)
     Deleted:  (none)
     Modified: (none)
   ```

## Phase 1: Impact Analysis

This is where the skill adds value over the script — you can reason about
the changes, not just hash-diff.

1. **Read each new/modified source** (frontmatter + first 2K chars of body).

2. **Compute dirty buckets**: For each changed source, map its `tags` to
   taxonomy buckets (a source can match multiple buckets). A bucket is dirty
   if any of its sources changed.

3. **Assess impact per dirty bucket**: Read the existing `wiki/{bucket}.md`
   synthesis article abstract. Consider:
   - Does the new source add a genuinely new perspective?
   - Does it contradict existing claims? (Check key_insight against article)
   - Is it high enough relevance to enter the top 25 for this bucket?

4. **Report findings to the user** before proceeding:
   ```
   Impact analysis:
     agent-memory: DIRTY — new contrarian source challenges flat-file memory
     knowledge-substrate: DIRTY — new project (Membrane) with novel architecture
     context-engineering: DIRTY — tagged but low impact (no contradiction)
     agent-architecture: CLEAN
     multi-agent-systems: DIRTY — new coordination patterns from CORAL
     self-improving: DIRTY — tagged but marginal relevance
   
   Contradictions detected:
     - Existing: "BM25 on markdown achieves 91% accuracy"
     - New source: "flat-file markdown creates ~48% poisoned retrieval"
     → These describe different evaluation contexts but should both appear
   
   Proceed with recompilation? (Y to continue, N to abort)
   ```

5. **Identify dirty entities**: Compare current entity state against
   `incremental-state.json.entity_input_hashes`. An entity is dirty if its
   description, bucket, aliases, source_refs, or graph neighbors changed.
   New entities (not in previous state) are always dirty.

6. **Handle deletions**: If sources were deleted, check if any entities lose
   enough source_refs to drop below the full-article threshold (3+ refs,
   7.0+ max relevance). List entities that would be demoted and ask the user
   before deleting their wiki pages.

## Phase 2: Selective Synthesis (Parallel)

For each **dirty bucket only**, launch a subagent:

> "Use the compile-synthesis skill to write a synthesis article for the
> {bucket} bucket. Sources for this bucket: {list paths + key_insights}.
> **Important**: These new/changed sources were just added and should be
> prominently featured: {list changed source paths + key_insights}.
> Write output to wiki/{bucket}.md."

For **clean buckets**, do nothing — their existing synthesis articles are current.

After all dirty-bucket subagents complete, verify `wiki/{bucket}.md` exists
for each dirty bucket.

## Phase 3: Selective Cards (Parallel)

For each **dirty entity only**, launch subagents in batches (5-10 at a time):

> "Use the compile-cards skill to write a reference card for {entity name}
> ({type}, {bucket}). Top sources: {paths}. Write to
> wiki/projects/{slug}.md or wiki/concepts/{slug}.md."

For **new entities** that cross the full-article threshold (3+ source refs,
7.0+ max relevance), generate new cards.

For entities that **lost full-article status** due to source deletion
(confirmed by user in Phase 1), delete their wiki page.

## Phase 4: Indexes + Field Map

**Always run indexes** (cheap, no LLM):

> "Use the compile-index skill to generate wiki/ROOT.md, wiki/indexes/,
> wiki/comparisons/landscape.md, and wiki/README.md from the compiled
> articles in wiki/."

**Conditionally run field-map**: Only if any synthesis article changed in
Phase 2. If no synthesis articles were regenerated, the field map is current.

> "Use the compile-field-map skill to write wiki/field-map.md. Read
> config/domain.ts for bucket definitions."

## Phase 5: Claims + State Save

**Extract claims from dirty buckets only**:

> "Use the compile-claims skill to extract claims from these synthesis
> articles: {list dirty bucket .md paths}. Merge with existing claims from
> build/claims.json for clean buckets. Write updated build/claims.json and
> build/eval-report.json."

**Save incremental state**: After all phases complete, run the script pipeline
to update the state file:

```bash
bun run scripts/save-incremental-state.ts
```

If this script doesn't exist, manually construct and write
`build/incremental-state.json` with the schema from
[references/state-schema.md](references/state-schema.md).

## Fallback: When to Use Full Compilation

Use `compile-wiki` instead of this skill when:
- `build/incremental-state.json` doesn't exist (first compilation)
- Domain config (`config/domain.ts`) changed materially
- More than 50% of sources changed (incremental overhead exceeds savings)
- The user explicitly requests a full recompilation
- You detect systemic issues (many stale claims, low eval accuracy)

## Quality Rules

All the same quality rules from `compile-wiki` apply:
- See `.claude/skills/compile-wiki/references/quality.md` for citation rules
- Read and follow `.claude/skills/stop-slop/SKILL.md`
- If `build/lessons.md` exists, read it and pass lessons to subagents

## Regression Prevention

Never silently delete an entity's wiki page. If an entity would be demoted
from full to stub, warn the user and ask for confirmation before deleting.

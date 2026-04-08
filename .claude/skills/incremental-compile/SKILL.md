---
name: incremental-compile
description: >
  Incrementally recompiles changed parts of the wiki after new sources are
  ingested. The skill handles change detection, LLM-powered impact analysis,
  and user confirmation. All compilation is delegated to the script pipeline
  (bun run compile --incremental), which handles entity extraction, resolution
  with anchoring, synthesis with evidence registry, reference cards, claims,
  self-eval, and state saving.
---

# Incremental Compile

Recompile only what changed. The skill's job is judgment and presentation.
The script's job is compilation.

If no `build/incremental-state.json` exists, fall back to the full
`compile-wiki` skill instead.

## Pipeline Overview

```
Phase 0: Change detection      (run bun run compile --status)
Phase 1: Impact analysis       (you reason about changes, ask user to confirm)
Phase 2: Script compilation    (run bun run compile --incremental)
Phase 3: Present results       (read compilation-diff.json, eval-report.json)
```

## Phase 0: Change Detection

Run the script's status command:

```bash
bun run compile --status
```

Read the output to understand:
- How many sources were added/modified/deleted
- Which buckets are dirty (relevance-gated: low-relevance sources don't dirty buckets)
- Whether the config changed (requires full recompilation)

Also read each new/modified source's frontmatter (`key_insight`, `tags`,
`relevance_scores.composite`) for impact reasoning in Phase 1.

If the status says "Wiki is current", report that and stop.

## Phase 1: Impact Analysis

This is the skill's primary value-add over the script.

1. **Read each new/modified source** (frontmatter + first 2K chars of body).

2. **Assess impact per dirty bucket**: Read the existing `wiki/{bucket}.md`
   synthesis article abstract. Consider:
   - Does the new source add a genuinely new perspective?
   - Does it contradict existing claims? (Check key_insight against article)
   - Is it high enough relevance to matter?

3. **Report findings to the user** before proceeding:
   ```
   Impact analysis:
     knowledge-substrate: DIRTY — new project (Dash) with 6-layer context system
     self-improving: DIRTY — SEAL paper introduces in-weight self-adaptation
     agent-memory: CLEAN (new sources below top-25 cutoff)
     ...
   
   Contradictions detected: (none / list specifics)
   Estimated dirty entities: ~15
   
   Proceed with recompilation? (Y to continue, N to abort)
   ```

4. **Handle edge cases**:
   - If >50% of sources changed, suggest full recompilation instead
   - If sources were deleted, note which entities might lose full-article status
   - If config changed, explain that full recompilation is required

## Phase 2: Script Compilation

After user confirmation, run a single script call:

```bash
bun run compile --incremental
```

This handles everything:
- **Pass 0:** Load and index all raw sources
- **Pass 1a:** Incremental entity extraction (only changed sources)
- **Pass 1b:** Entity resolution with ID anchoring (prevents slug churn)
- **Pass 2:** Graph construction
- **Pass 3a:** Synthesis articles for dirty buckets (with evidence registry + source boosting)
- **Pass 3a.5:** Blind review of synthesis articles
- **Pass 3b:** Reference cards for dirty entities only
- **Pass 3c:** Claims extraction (dirty buckets only, merges with clean)
- **Pass 4:** Field map + indexes
- **Pass 5:** Mermaid diagrams + backlinks
- **Pass 6:** Changelog (appends, includes compilation diff)
- **Pass 7:** Self-eval with incremental eval cache
- **Pass 8:** Auto-fix failed claims
- **State save:** Updates `build/incremental-state.json`

Dirty detection is relevance-gated: sources must beat the per-bucket
top-25 cutoff (with +1.5 boost for changed sources) to dirty a bucket.
Entity dirtiness is based on changed source_refs, not cosmetic re-resolution.

## Phase 3: Present Results

After compilation completes, read and present:

1. **`build/compilation-diff.json`** — Which synthesis articles changed,
   word count deltas, sections added/removed, new citations.

2. **`build/eval-report.json`** — Self-eval accuracy. How many claims were
   verified vs carried forward from cache. Any failures.

3. **`build/lessons.md`** — Unfixable patterns flagged for human review.

Present a concise summary:
```
Compilation complete:
  - 2 synthesis articles updated (knowledge-substrate, self-improving)
  - 12 reference cards regenerated, 3 new cards added
  - Self-eval: 28/30 passed (93.3%), 2 carried forward from cache
  - 1 unfixable claim flagged in build/lessons.md
```

Suggest follow-ups if relevant:
- "Consider deep-researching {project} for stronger source coverage"
- "The self-improving article has {N} unsupported claims — review build/eval-report.json"

## Fallback: When to Use Full Compilation

Use `compile-wiki` instead of this skill when:
- `build/incremental-state.json` doesn't exist (first compilation)
- Domain config (`config/domain.ts`) changed materially
- More than 50% of sources changed
- The user explicitly requests a full recompilation
- You detect systemic issues (many stale claims, low eval accuracy)

## Quality Rules

The script handles all quality enforcement:
- Evidence registry prevents cross-article duplication
- Source boosting (+1.5) ensures new sources enter synthesis articles
- Blind review (Pass 3a.5) catches unsupported claims
- Self-eval (Pass 7) verifies claims against sources
- Auto-fix (Pass 8) repairs citation errors

If `build/lessons.md` exists, the script reads it automatically.

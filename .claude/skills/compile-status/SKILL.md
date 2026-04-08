---
name: compile-status
description: >
  Show pending changes and LLM-powered impact analysis without compiling.
  Detects new/modified/deleted sources via content hashing, maps them to
  dirty buckets, reads changed sources to assess impact and detect
  contradictions with existing claims. Use to preview what incremental
  compilation would do before running it.
---

# Compile Status

Show what changed since the last compilation and assess impact, without
actually compiling anything.

This is the skill equivalent of `bun run compile --status`, but adds
LLM-powered impact analysis (contradiction detection, new entity assessment).

## Steps

### 1. Load Previous State

Read `build/incremental-state.json`. If missing, report:

```
No previous compilation state found.
Run `bun run compile` or use the compile-wiki skill for an initial compilation.
```

And stop.

### 2. Check Config

Read `config/domain.ts`. Compare the domain topic, bucket definitions, and
audience against the state's `config_hash`. If changed materially, report:

```
Domain config changed since last compilation.
A full recompilation is required — run /compile-wiki or `bun run compile`.
```

### 3. Detect Source Changes

Scan all `.md` files in `raw/{tweets,repos,papers,articles}/` and
`raw/deep/{repos,papers}/`. For each, compute a SHA-256 of the file contents.

Diff current hashes against `incremental-state.json.source_hashes`:
- **Added**: path exists on disk but not in state
- **Modified**: path exists in both but hash differs
- **Deleted**: path exists in state but not on disk

### 4. Report Change Summary

If nothing changed:

```
Wiki is current. No sources changed since last compilation
(compiled: {last_compiled}).
```

And stop.

Otherwise, report:

```
Changes since last compilation ({last_compiled}):

  Added ({count}):
    + {path} [relevance: {composite}] [{tags}]

  Modified ({count}):
    ~ {path}

  Deleted ({count}):
    - {path}
```

### 5. Map to Dirty Buckets

For each changed source, map its `tags` to taxonomy buckets. For deleted
sources, look up tags from `build/source-index.json` (previous compilation's
source metadata). Report:

```
Dirty buckets: {list}
Clean buckets: {list}
```

### 6. Impact Analysis (LLM-Powered)

This is the value-add over `bun run compile --status`.

For each changed/added source:

1. Read the source frontmatter + first 2K chars of body.
2. Read the existing synthesis article abstract for its dirty bucket(s).
3. Assess:
   - Does it add a genuinely new perspective to the bucket?
   - Does its `key_insight` contradict any existing claims?
   - Would it likely enter the top-25 sources for this bucket by relevance?
   - Does it introduce a new entity not currently tracked?

If `build/claims.json` exists, check each changed source's `key_insight`
against claims from its dirty buckets. Flag specific contradictions.

Report:

```
Impact analysis:
  {bucket}: {assessment} — {reason}

Contradictions detected:
  - Existing claim: "{claim.content}" (from {claim.article_ref})
  - New source: "{key_insight}" (from {source_path})
  - Assessment: {whether these truly conflict or describe different contexts}

Estimated dirty entities: {count based on source_refs overlap}
```

### 7. Recommendation

Based on the analysis, suggest next steps:

- If few changes and no contradictions:
  "Run /incremental-compile to update affected articles."
- If many changes (>50% of sources) or config changed:
  "Run /compile-wiki for a full recompilation."
- If contradictions detected:
  "Run /incremental-compile — contradictions will be resolved in synthesis."

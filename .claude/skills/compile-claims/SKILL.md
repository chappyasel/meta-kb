---
name: compile-claims
description: >
  Extracts atomic verifiable claims from synthesis articles and runs
  self-evaluation by verifying a sample against raw sources. Outputs
  build/claims.json and build/eval-report.json. Use when extracting claims,
  running self-eval, or verifying wiki accuracy.
---

# Compile Claims + Self-Eval

Two phases: extract claims from synthesis articles, then verify a sample
against raw sources.

## Phase 1: Extract Claims

Read `config/domain.ts` for the taxonomy bucket definitions. Read the synthesis article for each bucket from `wiki/{bucket-id}.md`.

For each article, extract 25-40 atomic claims. Each claim is ONE verifiable
statement. Not a summary, not a paragraph. One fact.

### Claim Types

- **empirical** — numbers, benchmarks, measurements: "Mem0 selective retrieval
  beats full-context by 26% on LOCOMO"
- **architectural** — how things are built: "Graphiti stores temporal validity
  as edge properties in Neo4j"
- **comparative** — X vs Y: "Graph-based retrieval outperforms vector-only on
  multi-hop questions"
- **directional** — field-level trends/consensus: "The field shifted from
  monolithic context to progressive disclosure in 2025"

Target mix: ~40% empirical, ~30% architectural, ~15% directional, ~15%
comparative.

### Confidence Levels

- **verified** — evidence visible in source (benchmark code, architecture
  diagram, specific file reference)
- **reported** — cited in source but not independently validated (README
  claims, self-reported benchmarks). This is the default.
- **inferred** — synthesized across multiple sources, not stated directly in
  any single one. Target 10-20% of claims.

### Source Attribution

Extract actual `raw/` paths from `[Source](../raw/...)` links near each claim.

CRITICAL: match each claim to the source that ACTUALLY contains its evidence,
not just the nearest citation in the article. If a paragraph cites source A
but the specific number comes from source B cited two paragraphs earlier,
attribute to source B.

Leave `source_refs` empty rather than guessing. Wrong attribution is worse
than missing attribution.

### Temporal Scope

For time-sensitive data (star counts, benchmark results, adoption numbers),
set `temporal_scope` to `"as of YYYY-MM"`. For timeless architectural facts,
set to `null`.

### Output

Write `build/claims.json`. See [references/schema.md](references/schema.md)
for the exact schema.

## Phase 2: Self-Eval

Sample 30 claims that have source refs, stratified proportionally by claim
type (e.g., if 40% of claims are empirical, sample ~12 empirical).

For each sampled claim:

1. Read the cited raw source file
2. Check whether the source EXPLICITLY supports the claim
3. Verdict: **PASS** if the source contains specific evidence. **FAIL** if not.
4. Semantic equivalence counts: "four-level" = "Levels 0-3", "51.8K stars" =
   "51,880 stars". Only FAIL when evidence is genuinely missing or contradicted.

### Output

Write `build/eval-report.json` with:
- Overall accuracy rate
- Breakdowns by claim type and by bucket
- Details for every sampled claim (verdict + reason)
- Full details for every failure

See [references/schema.md](references/schema.md) for the exact schema.

### Changelog Entry

Append a summary line to `wiki/CHANGELOG.md`:
```
## YYYY-MM-DD
- Claims extraction: {total} claims ({empirical}E/{architectural}A/{comparative}C/{directional}D)
- Self-eval: {accuracy}% accuracy on {sample_size} sampled claims
- Failures: {count} ({brief list of failure reasons})
```

## Quality Rules

- Never fabricate a source path. If you cannot find the source for a claim,
  leave source_refs empty.
- Every claim must be independently verifiable by reading the cited source.
- Prefer specific numbers over vague statements. "26% improvement" not
  "significant improvement".
- Flag conflicting claims between articles rather than silently picking one.

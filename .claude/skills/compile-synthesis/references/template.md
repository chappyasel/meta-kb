# Synthesis Article Template

## Frontmatter

```yaml
---
title: "The State of [Bucket Name]"
type: synthesis
bucket: <bucket-id>
abstract: "<1-2 sentence abstract, max 300 chars>"
source_date_range: "YYYY-MM-DD to YYYY-MM-DD"
newest_source: "YYYY-MM-DD"
staleness_risk: low | medium | high
sources:
  - raw/type/file.md
  - raw/deep/type/file.md
entities:
  - entity-slug
last_compiled: "YYYY-MM-DD"
---
```

## Article Body

```markdown
<abstract>
[1-2 sentence abstract. State the key insight directly. Max 300 chars.
Not "this article covers X" -- instead state what changed and why it matters.]
</abstract>

# The State of [Bucket Name]

[2-3 sentence opening insight. What fundamentally changed about how
practitioners think about this problem? Be specific about the shift.]

## Approach Categories

### [Category 1: framed as an architectural question]

[Frame as answering a question, e.g., "How do you decide what deserves
long-term memory?" not "Memory storage options."

For each category:
- Name 2-3 flagship projects with star counts: "Mem0 (51,880 stars)"
- Include implementation details from deep sources (cite files, algorithms)
- Give the concrete tradeoff: "wins when X, loses when Y"
- Name one specific failure mode (what actually BREAKS in production)
Cite sources with actual paths: [Source](../raw/deep/repos/file.md)]

### [Category 2]

...

### [Category 3]

...

[3-5 categories total.]

## The Convergence

[THREE specific technical decisions all serious systems now share.
Each stated as a falsifiable claim: "All production systems now do X."
For each: name the project that held out longest against this consensus.
If you cannot find three, state two. Do not pad.]

## What the Field Got Wrong

[One assumption practitioners held that the evidence now contradicts.
Name the assumption. Name who held it (project/paper/practitioner).
Cite the evidence that disproved it. State what replaced it.
Do NOT hedge with "while X had merits." Pick a side.]

## Deprecated Approaches

[2-3 approaches practitioners adopted pre-2025 and have since abandoned.
For each: name the approach, why it seemed right at the time, what
specific evidence killed it, and what replaced it.]

## Failure Modes

[3-5 concrete failure modes practitioners will hit. Specific mechanisms,
not generic limitations. How does it break? What triggers it?]

## Selection Guide

- If you need X, use [Y](projects/y.md) (N stars) because Z
- If you need A, avoid [B](projects/b.md) because C -- use [D](projects/d.md) instead
- ...

[Scannable. A practitioner should scan this in 30 seconds and know
which tool to evaluate. Include star counts and maturity signals.]

## The Divergence

[3-4 competing architectural camps where the field has NOT converged.
For each: name both sides, what each optimizes for, which wins under
what conditions. These are active disagreements with implementations
on both sides.]

## What's Hot Now

[Momentum signals: recent launches, star velocity, viral discussions.
Cite specific numbers and dates.]

## Open Questions

- [Genuinely unsolved problems practitioners disagree about]
- ...

## Sources

[All sources are cited inline throughout the article. Optionally
collect them here grouped by type for reference.]
```

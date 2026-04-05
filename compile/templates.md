# Article Templates

## Synthesis article (Tier 1, 3000-5000 words)

```markdown
# The State of [Bucket Name]

[2-3 sentence opening insight. What fundamentally changed about how
practitioners think about this problem? Example: "Memory is no longer a
storage decision. It is a policy decision."]

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

## The Convergence
[THREE things all serious systems agree on that would have been
controversial 6 months ago.]

## What the Field Got Wrong
[One major assumption that turned out to be false. Provide evidence.
Explain what replaced it.]

## Failure Modes
[3-5 concrete failure modes practitioners will hit. Specific mechanisms,
not generic limitations. How does it break? What triggers it?]

## Selection Guide
[Scannable decision framework:]
- If you need X, use Y because Z
- If you need A, avoid B because C — use D instead
[Include star counts and maturity signals. A practitioner should scan
this in 30 seconds and know which tool to evaluate.]

## The Divergence
[3-4 competing architectural camps where the field has NOT converged.
For each: name both sides, what each optimizes for, which wins under
what conditions. These are active disagreements with implementations
on both sides — not "open questions" but "active splits."]

## What's Hot Now
[Momentum signals: recent launches, star velocity, viral discussions.
Cite specific numbers.]

## Open Questions
- [Genuinely unsolved problems practitioners disagree about]

## Sources
[All sources are cited inline throughout the article. Optionally
collect them here grouped by type for reference.]
```

## Project reference card (Tier 3, 800-1500 words)

```markdown
# [Project Name]

> [1-2 sentence summary + key differentiator]

| Metric | Value |
|--------|-------|
| Stars | [count] |
| Language | [lang] |
| License | [license] |

## What It Does
[Concrete description. Not marketing copy.]

## Architecture
[How it's built. Name specific files, modules, algorithms from deep
sources. Enough detail that a reader understands HOW, not just WHAT.]

## Core Mechanism
[The key algorithm or pattern with implementation detail.]

## Key Numbers
[Benchmarks with credibility assessment: self-reported, peer-reviewed,
or verified in code. If README claims can't be verified, say so.]

## Strengths
- [Strength with evidence from deep source]

## Critical Limitations
- [A concrete failure mode — what breaks, not just "has limitations"]
- [An unspoken infrastructure assumption]
- [A gap in documentation/validation]

## When NOT to Use It
[Operational conditions where this is the wrong choice.]

## Unresolved Questions
- [What the documentation doesn't explain: governance, cost at scale,
  conflict resolution, architectural growth limits. 3-5 specific unknowns.]

## Alternatives
- [Alternative](../projects/alt.md) — use when [specific scenario]

## Sources
- [Source](../raw/type/file.md)
- [Deep Source](../raw/deep/type/file.md)
```

## Concept explainer (Tier 3, 1500-2500 words)

```markdown
# [Concept Name]

> [1-2 sentence definition]

## Why It Matters
[Why practitioners should care. Specific problem it solves.]

## How It Works
[The mechanism with implementation details from deep sources.
Name projects that implement it and HOW they differ.]

## Failure Modes
[When does this concept break down?]

## Who Implements It
- [Project](../projects/slug.md) — their specific approach

## Open Questions
- [What's unresolved]

## Sources
- [Source](../raw/type/file.md)
```

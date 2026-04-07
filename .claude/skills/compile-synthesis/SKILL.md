---
name: compile-synthesis
description: >
  Writes a single synthesis article (3000-5000 words) for one taxonomy bucket.
  Produces landscape analysis with approach categories, convergence, failure
  modes, and selection guide. Use when writing a synthesis article for a bucket.
---

# Compile Synthesis Article

Write a single synthesis article (3000-5000 words) for one taxonomy bucket.

## Taxonomy Buckets

Read `config/domain.ts` for the taxonomy bucket definitions (IDs, names, descriptions, and examples).

## Source Tiers

Two tiers of source material:

- **Shallow sources** in `raw/{tweets,repos,articles,papers}/` -- engagement metrics, key insights, tags
- **Deep sources** in `raw/deep/{repos,papers}/` -- architecture analysis, design tradeoffs, verified benchmarks

Prefer deep sources for implementation details, architecture descriptions, and benchmark claims. Use shallow sources for engagement signals (star counts, virality) and breadth coverage.

## Article Structure

### Abstract

Every article starts with `<abstract></abstract>` tags before any headings. 1-2 sentences, max 300 chars. State the key insight directly. Not "this article covers X" -- instead "Memory shifted from a storage decision to a policy decision when [specific event]."

### Banned Words

Never use (this is a compilation failure): ecosystem, robust, not just, game-changer, fundamentally, inherently, at its core, holistic, comprehensive, cutting-edge, it's worth noting, notably, importantly, rapidly evolving, crucial, pivotal. No em dashes. No passive voice. No three-item list closers.

### Required Sections (in order)

1. **Opening insight** -- 2-3 sentences. Do NOT use the formula "X shifted from A to B" or "The question changed from A to B." Instead, vary the opening per article:
   - Option A: Lead with the single most surprising finding from the sources.
   - Option B: Lead with a concrete failure (name the system, the failure mode, the consequence).
   - Option C: Lead with the strongest disagreement (two projects, opposite bets).

2. **Approach Categories** -- 3-5 categories. Each framed as an architectural question ("How do you decide what deserves long-term memory?"), not a noun phrase ("Memory storage options"). Each category includes:
   - 2-3 flagship projects with star counts on first mention: "Mem0 (51,880 stars)"
   - Implementation details sourced from deep sources (cite specific files, algorithms)
   - One concrete tradeoff: "wins when X, loses when Y"
   - One specific failure mode: what actually breaks in production

3. **The Convergence** -- THREE specific technical decisions all serious systems now share. Each MUST be stated as a falsifiable claim ("All production systems now do X") -- not "there is a trend toward X." For each: name the specific project that held out longest against this consensus. If you cannot find three, state two.

4. **What the Field Got Wrong** -- One assumption practitioners held that the evidence now contradicts. Name the assumption. Name who held it (project, paper, or practitioner). Cite the evidence that disproved it. State what replaced it. Do NOT hedge.

5. **Deprecated Approaches** -- 2-3 approaches practitioners adopted pre-2025 and have since abandoned. For each: name the approach, why it seemed right, what evidence killed it, and what replaced it.

6. **Failure Modes** -- 3-5 concrete failure modes. Specific mechanisms, not generic limitations. What triggers it? How does it break?

7. **Selection Guide** -- Scannable format:
   - If you need X, use Y because Z
   - If you need A, avoid B because C -- use D instead
   - Include star counts and maturity signals. A practitioner scans this in 30 seconds.

8. **The Divergence** -- 3-4 active architectural splits where the field has NOT converged. Name both sides, what each optimizes for, which wins under what conditions. Active disagreements with implementations on both sides.

9. **What's Hot Now** -- Momentum signals: recent launches, star velocity, viral discussions. Cite numbers.

10. **Open Questions** -- Genuinely unsolved problems practitioners disagree about.

## Citation Rules

- Cite actual source paths: `[Source](../raw/type/file.md)` or `[Source](../raw/deep/type/file.md)`
- **Prefer deep/ sources for implementation claims.** If you cite an architectural detail, algorithm, or benchmark number, check whether `raw/deep/repos/` or `raw/deep/papers/` has a deeper analysis for that project. Cite the deep source, not the shallow README.
- Every project links to its reference card using the **entity ID slug**: `[Mem0](projects/mem0.md)`. Do NOT use the display name as the filename (e.g., `retrieval-augmented-generation.md` is wrong, `rag.md` is right). Check that the linked file exists before writing.
- Star counts on first mention only
- Assess benchmark credibility: self-reported, peer-reviewed, or verified in code
- When sources disagree, flag explicitly: "**Source conflict:** [Source A] claims X, while [Source B] claims Y."
- If `build/lessons.md` exists, read it for known source attribution patterns from previous compilations.

## Source Fidelity (Critical)

- NEVER invent component names, directory paths, algorithm names, or mechanism details not in the source material. If a source says "the system uses a feedback loop" do NOT call it "the Recursive Reflector feedback loop" unless that exact name appears in the source.
- NEVER cite specific benchmark numbers unless the EXACT number appears in the source text. Say "the project reports improved accuracy" instead of inventing a percentage.
- When a detail is specific enough to verify (a number, a component name, a file path), confirm it appears in the source before writing it. If not, generalize.
- Prefer "the project claims X" over stating X as fact when evidence is from a README rather than deep source-code analysis.

## Frontmatter

```yaml
---
title: "The State of [Bucket Name]"
type: synthesis
bucket: <bucket-id>
abstract: "<abstract text, max 300 chars>"
source_date_range: "YYYY-MM-DD to YYYY-MM-DD"
newest_source: "YYYY-MM-DD"
staleness_risk: low | medium | high  # <30d=low, 30-90d=medium, >90d=high
sources:
  - raw/type/file.md
  - raw/deep/type/file.md
entities:
  - entity-slug
last_compiled: "YYYY-MM-DD"
---
```

## Staleness

Note the date range of sources in frontmatter. Calculate `staleness_risk` from days since `newest_source`: under 30 days = low, 30-90 = medium, over 90 = high.

## Writing Quality

Read and follow all rules in [stop-slop/SKILL.md](../stop-slop/SKILL.md). No filler, no passive voice, no em dashes, no AI tells.

## Template

See [references/template.md](references/template.md) for the full structural template.

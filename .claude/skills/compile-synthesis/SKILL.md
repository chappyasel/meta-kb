---
name: compile-synthesis
description: >
  Writes a single synthesis article (3000-5000 words) for one of the five
  meta-kb taxonomy buckets. Produces landscape analysis with approach categories,
  convergence, failure modes, and selection guide. Use when writing a
  knowledge-bases, agent-memory, context-engineering, agent-systems, or
  self-improving synthesis article for meta-kb.
---

# Compile Synthesis Article

Write a single synthesis article (3000-5000 words) for one taxonomy bucket.

## Taxonomy Buckets

1. **knowledge-bases** -- Karpathy pattern, markdown wikis, compiled vs curated
2. **agent-memory** -- Mem0, Letta, Graphiti, episodic/semantic/working memory
3. **context-engineering** -- CLAUDE.md standards, context graphs, compression
4. **agent-systems** -- Skill composition, registries, modular capabilities
5. **self-improving** -- Autoresearch, observe/correct/improve loops, health checks

## Source Tiers

Two tiers of source material:

- **Shallow sources** in `raw/{tweets,repos,articles,papers}/` -- engagement metrics, key insights, tags
- **Deep sources** in `raw/deep/{repos,papers}/` -- architecture analysis, design tradeoffs, verified benchmarks

Prefer deep sources for implementation details, architecture descriptions, and benchmark claims. Use shallow sources for engagement signals (star counts, virality) and breadth coverage.

## Article Structure

### Abstract

Every article starts with `<abstract></abstract>` tags before any headings. 1-2 sentences, max 300 chars. State the key insight directly. Not "this article covers X" -- instead "Memory shifted from a storage decision to a policy decision when [specific event]."

### Required Sections (in order)

1. **Opening insight** -- 2-3 sentences on what fundamentally changed about how practitioners think about this problem. No throat-clearing.

2. **Approach Categories** -- 3-5 categories. Each framed as an architectural question ("How do you decide what deserves long-term memory?"), not a noun phrase ("Memory storage options"). Each category includes:
   - 2-3 flagship projects with star counts on first mention: "Mem0 (51,880 stars)"
   - Implementation details sourced from deep sources (cite specific files, algorithms)
   - One concrete tradeoff: "wins when X, loses when Y"
   - One specific failure mode: what actually breaks in production

3. **The Convergence** -- Exactly 3 things all serious systems agree on that would have been controversial 6 months ago.

4. **What the Field Got Wrong** -- One major false assumption. Provide evidence. Explain what replaced it.

5. **Failure Modes** -- 3-5 concrete failure modes. Specific mechanisms, not generic limitations. What triggers it? How does it break?

6. **Selection Guide** -- Scannable format:
   - If you need X, use Y because Z
   - If you need A, avoid B because C -- use D instead
   - Include star counts and maturity signals. A practitioner scans this in 30 seconds.

7. **The Divergence** -- 3-4 active architectural splits where the field has NOT converged. Name both sides, what each optimizes for, which wins under what conditions. Active disagreements with implementations on both sides.

8. **What's Hot Now** -- Momentum signals: recent launches, star velocity, viral discussions. Cite numbers.

9. **Open Questions** -- Genuinely unsolved problems practitioners disagree about.

## Citation Rules

- Cite actual source paths: `[Source](../raw/type/file.md)` or `[Source](../raw/deep/type/file.md)`
- Every project links to its reference card: `[Mem0](projects/mem0.md)`
- Star counts on first mention only
- Assess benchmark credibility: self-reported, peer-reviewed, or verified in code
- When sources disagree, flag explicitly: "**Source conflict:** [Source A] claims X, while [Source B] claims Y."

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

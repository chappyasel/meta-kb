---
name: compile-cards
description: >
  Writes reference cards for projects, concepts, or people in the meta-kb wiki.
  Projects get 800-1500 words with architecture, benchmarks, limitations, and
  alternatives. Concepts get 1500-2500 words. People get 150-250 words. Use when
  writing wiki reference cards for specific entities in meta-kb.
---

# Compile Reference Cards

Write reference cards for projects, concepts, or people.

## Card Types

| Type | Words | Output path |
|------|-------|-------------|
| Project | 800-1500 | `wiki/projects/<slug>.md` |
| Concept | 1500-2500 | `wiki/concepts/<slug>.md` |
| Person | 150-250 | `wiki/people/<slug>.md` |

## Source Prioritization

1. Deep sources first: `raw/deep/repos/` and `raw/deep/papers/`
2. Then shallow sources by relevance score
3. Use top 5 sources per card

## Abstract

Every card starts with `<abstract></abstract>` tags before any headings. One sentence, under 200 chars. State what it does plus the key differentiator. Not a generic description.

## Project Card (800-1500 words)

### Required Sections

1. **What It Does** -- Concrete description. Not marketing copy. What problem it solves and the architectural approach that makes it different.

2. **Architecture** -- How it works. Name specific files, modules, algorithms from deep sources. Enough detail that a reader understands HOW, not just WHAT.

3. **Core Mechanism** -- The key algorithm or pattern with implementation detail from deep sources.

4. **Key Numbers** -- Benchmarks with credibility assessment: self-reported, peer-reviewed, or verified in code. If README claims cannot be verified, say so.

5. **Strengths** -- Each backed by evidence from a deep source.

6. **Critical Limitations** -- At minimum:
   - One concrete failure mode (what breaks, not just "has limitations")
   - One unspoken infrastructure assumption
   - One gap in documentation or validation

7. **When NOT to Use It** -- Operational conditions where this is the wrong choice.

8. **Unresolved Questions** -- 3-5 specific unknowns: governance, cost at scale, conflict resolution, architectural growth limits. What the documentation does not explain.

9. **Alternatives** -- Link to other project cards with guidance on when to pick each.

## Concept Card (1500-2500 words)

### Required Sections

1. **Definition** -- What it is. Precise, no jargon layering.

2. **Why It Matters** -- The specific problem it solves for practitioners.

3. **How It Works** -- Implementation details from deep sources. Name projects that implement it and how their approaches differ.

4. **Who Implements It** -- Link to project cards with each project's specific approach noted.

5. **Failure Modes** -- When does this concept break down? Concrete scenarios.

6. **Open Questions** -- What remains unresolved.

## Person Card (150-250 words)

Brief profile: who they are, key contributions to the field, notable work. Link to their projects and publications in the wiki.

## Citation Rules

- Cite actual source paths: `[Source](../raw/type/file.md)` or `[Source](../raw/deep/type/file.md)`
- Link to related wiki pages: `[Mem0](../projects/mem0.md)`, `[context graphs](../concepts/context-graphs.md)`
- Star counts on first mention for projects
- Assess benchmark credibility when citing numbers
- When sources disagree: "**Source conflict:** [Source A] claims X, while [Source B] claims Y."

## Frontmatter

```yaml
---
entity_id: <slug>
type: project | concept | person
bucket: <bucket-id>
abstract: "<1 sentence, under 200 chars>"
sources:
  - raw/type/file.md
  - raw/deep/type/file.md
related:
  - projects/slug.md
  - concepts/slug.md
last_compiled: "YYYY-MM-DD"
---
```

## Writing Quality

Read and follow all rules in [stop-slop/SKILL.md](../stop-slop/SKILL.md). No filler, no passive voice, no em dashes, no AI tells.

## Templates

See [references/template.md](references/template.md) for the full structural templates for each card type.

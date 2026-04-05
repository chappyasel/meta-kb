# Reference Card Templates

## Project Reference Card (800-1500 words)

### Frontmatter

```yaml
---
entity_id: <slug>
type: project
bucket: <bucket-id>
abstract: "<1 sentence, under 200 chars>"
sources:
  - raw/repos/slug.md
  - raw/deep/repos/slug.md
related:
  - projects/alternative.md
  - concepts/related-concept.md
last_compiled: "YYYY-MM-DD"
---
```

### Body

```markdown
<abstract>
[1 sentence. What it does + key differentiator. Under 200 chars.]
</abstract>

# [Project Name]

| Metric | Value |
|--------|-------|
| Stars | [count] |
| Language | [lang] |
| License | [license] |

## What It Does

[Concrete description. Not marketing copy. What problem it solves
and the architectural approach that makes it different.]

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
- ...

## Critical Limitations

- [A concrete failure mode -- what breaks, not just "has limitations"]
- [An unspoken infrastructure assumption]
- [A gap in documentation/validation]

## When NOT to Use It

[Operational conditions where this is the wrong choice.]

## Unresolved Questions

- [What the documentation doesn't explain: governance, cost at scale,
  conflict resolution, architectural growth limits. 3-5 specific unknowns.]

## Alternatives

- [Alternative](../projects/alt.md) -- use when [specific scenario]
- ...

## Sources

- [Source](../raw/repos/file.md)
- [Deep Source](../raw/deep/repos/file.md)
```

---

## Concept Explainer Card (1500-2500 words)

### Frontmatter

```yaml
---
entity_id: <slug>
type: concept
bucket: <bucket-id>
abstract: "<1 sentence, under 200 chars>"
sources:
  - raw/type/file.md
  - raw/deep/type/file.md
related:
  - projects/implementor.md
  - concepts/related.md
last_compiled: "YYYY-MM-DD"
---
```

### Body

```markdown
<abstract>
[1 sentence. What this concept is + why it matters. Under 200 chars.]
</abstract>

# [Concept Name]

## Definition

[Precise definition. No jargon layering.]

## Why It Matters

[Why practitioners should care. Specific problem it solves.]

## How It Works

[The mechanism with implementation details from deep sources.
Name projects that implement it and HOW they differ.]

## Who Implements It

- [Project](../projects/slug.md) -- their specific approach
- ...

## Failure Modes

[When does this concept break down? Concrete scenarios.]

## Open Questions

- [What's unresolved]
- ...

## Sources

- [Source](../raw/type/file.md)
- [Deep Source](../raw/deep/type/file.md)
```

---

## Person Card (150-250 words)

### Frontmatter

```yaml
---
entity_id: <slug>
type: person
bucket: <bucket-id>
abstract: "<1 sentence, under 200 chars>"
sources:
  - raw/type/file.md
related:
  - projects/their-project.md
last_compiled: "YYYY-MM-DD"
---
```

### Body

```markdown
<abstract>
[1 sentence. Who they are + key contribution. Under 200 chars.]
</abstract>

# [Person Name]

[Who they are and their role in the field. Key contributions.
Notable projects and publications. Link to their work in the wiki.
150-250 words total.]

## Sources

- [Source](../raw/type/file.md)
```

# ROOT.md Format Example

This shows the exact compressed notation for the agent-optimized topic index.
Each entry occupies ONE LINE. No prose paragraphs. The entire file must stay
under 2K tokens.

```markdown
---
type: root
version: 1
compiled_at: "<ISO timestamp>"
token_estimate: <N>
entities_total: <N>
sources_total: <N>
---
# <domain.name> ROOT

## Topics
<bucket-id> [synthesis, <N> sources]: <bucket description> -> <bucket-id>.md
<bucket-id> [synthesis, <N> sources]: <bucket description> -> <bucket-id>.md
...

## Top Projects
<entity-id> [<bucket>, <stars>★, <N> refs]: <description> -> projects/<entity-id>.md
<entity-id> [<bucket>, <stars>★, <N> refs]: <description> -> projects/<entity-id>.md
...

## Key Concepts
<entity-id> [<bucket>]: <description> -> concepts/<entity-id>.md
<entity-id> [<bucket>]: <description> -> concepts/<entity-id>.md
...

## Meta
Field map: field-map.md | Graph: graph.html | Landscape: comparisons/landscape.md
Last compiled: <date> | Sources: <N> | Entities: <N> | Edges: <N>
```

## Key Formatting Rules

- One line per entry, no wrapping
- Stars use Unicode: `51880★`
- Arrows for paths: `-> projects/mem0.md`
- Brackets for metadata: `[bucket, stars, refs]` or `[bucket]`
- Source counts are actual counts from the source manifest
- Token estimate is self-reported, measured before writing frontmatter
- Meta section uses pipes as separators on a single line

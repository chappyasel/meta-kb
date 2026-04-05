---
name: compile-index
description: >
  Generates the agent-optimized ROOT.md topic index, project/topic indexes,
  missing coverage list, landscape comparison table, and wiki README for meta-kb.
  Use when generating meta-kb indexes, the ROOT.md entry point, or the
  comparison table.
---

# Compile Indexes

Read all compiled articles from `wiki/` to understand what exists, then
generate the 6 files below.

## Prerequisites

All synthesis articles, reference cards, and field-map.md must exist in `wiki/`
before running this skill.

## Output Files

### 1. wiki/ROOT.md

Agent-optimized topic index. MUST be under 2K tokens. Format:

- Frontmatter: type: "root", version: 1, compiled_at, token_estimate,
  entities_total, sources_total
- **Topics** section: one line per bucket with source count + brief
  description + path
- **Top Projects** section: 10-12 highest-relevance projects with
  `[bucket, stars, refs]: description -> path`
- **Key Concepts** section: 8-10 highest-relevance concepts with
  `[bucket]: description -> path`
- **Meta** footer: compilation date, source/entity/edge counts, links to
  field-map and graph
- Each entry is ONE LINE using compressed notation, not prose

See [references/root-template.md](references/root-template.md) for the exact
format example.

### 2. wiki/indexes/projects.md

Markdown table with columns: Project | Bucket | Sources. Link each project
name to its reference card (`projects/{slug}.md`).

### 3. wiki/indexes/topics.md

Bulleted list: concept name linked to its card (`concepts/{slug}.md`), followed
by a one-line description.

### 4. wiki/indexes/missing.md

Entities mentioned in sources but lacking full articles. Columns: Name | Type
(project/concept) | Bucket | Source Count. Sorted by source count descending.

### 5. wiki/comparisons/landscape.md

All-projects comparison table. Columns: Project | Bucket | Description (80
char max). Sorted by bucket, then alphabetically.

### 6. wiki/README.md

Human entry point for the wiki. Include:
- What meta-kb is (1-2 sentences)
- Link to field-map.md
- Table of 5 synthesis articles (bucket name, title, word count)
- Links to indexes (projects, topics, missing) and graph
- Stats: source count, entity count, total word count

## Frontmatter

Each file gets appropriate frontmatter:
```yaml
# ROOT.md
---
type: root
version: 1
compiled_at: "YYYY-MM-DDTHH:MM:SS.000Z"
token_estimate: <actual count>
entities_total: <count>
sources_total: <count>
---

# Other index files
---
type: index
last_compiled: "YYYY-MM-DD"
---
```

## Rules

- ROOT.md is for agents. README.md is for humans. Keep them separate.
- ROOT.md must stay under 2K tokens. Count before writing.
- Every project/concept name links to its article if one exists.
- Sort by relevance (source count, star count) not alphabetically, except
  where noted.
- Missing.md excludes entities that already have reference cards.

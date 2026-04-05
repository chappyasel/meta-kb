---
name: compiling-meta-kb
description: >
  Compiles a structured wiki from curated raw markdown sources about LLM
  knowledge bases, agent memory, context engineering, agent systems, and
  self-improving systems. Produces synthesis articles, reference cards, a
  landscape comparison table, and knowledge graph. Use when asked to compile,
  build, or generate the wiki from raw sources.
---

# Compiling meta-kb

Compile the wiki from raw sources in `raw/`. Output goes to `wiki/` (or
`wiki-{agent}/` when running as a comparison alongside the API pipeline).

## Quick start

```
1. Read all 100+ sources in raw/
2. Write 5 synthesis articles (Tier 1 — the value)
3. Write field-map.md overview (Tier 2)
4. Write reference cards (Tier 3)
5. Generate indexes + comparison table (Tier 4)
6. Add Mermaid diagram to field-map
7. Self-check: verify all links resolve, all claims cite sources
```

## Compilation workflow

Copy this checklist and track progress:

```
- [ ] Step 1: Read ALL sources in raw/ and understand the landscape
- [ ] Step 2: Write 5 synthesis articles (2000-4000 words each)
- [ ] Step 3: Write field-map.md (3000-5000 words, weaves all 5 together)
- [ ] Step 4: Write reference cards for projects + concepts
- [ ] Step 5: Generate comparison table + indexes
- [ ] Step 6: Add Mermaid knowledge graph to field-map
- [ ] Step 7: Self-review — links work, claims cite sources
```

### Step 1: Read all sources

Read every file in `raw/**/*.md`. Each has YAML frontmatter:

```yaml
url: source URL
type: tweet | repo | paper | article
author: name or @handle
date: YYYY-MM-DD
tags: [knowledge-bases, agent-memory, ...]
key_insight: "Why this source matters"
stars: 51880  # optional
```

Group sources by the 5 taxonomy buckets. See [compile/taxonomy.md](compile/taxonomy.md).

### Step 2: Synthesis articles (Tier 1 — where the value is)

Write one landscape analysis per bucket. See [compile/templates.md](compile/templates.md)
for the article structure and [compile/quality.md](compile/quality.md) for citation rules.

Output files:
- `wiki/knowledge-bases.md` — "The State of LLM Knowledge Bases"
- `wiki/agent-memory.md` — "The State of Agent Memory"
- `wiki/context-engineering.md` — "The State of Context Engineering"
- `wiki/agent-systems.md` — "The State of Agent Systems"
- `wiki/self-improving.md` — "The State of Self-Improving Systems"

### Step 3: Field map (Tier 2)

Write `wiki/field-map.md` — the overview article (3000-5000 words). Read your
5 synthesis articles and weave them into one bird's-eye narrative. How the
buckets connect, the big threads, where everything is going.

### Step 4: Reference cards (Tier 3)

For each significant project: `wiki/projects/{slug}.md` (300-500 words).
For key concepts: `wiki/concepts/{slug}.md` (500-1000 words).
See [compile/templates.md](compile/templates.md) for card structure.

### Step 5: Indexes + comparison table (Tier 4)

- `wiki/comparisons/landscape.md` — all projects in one table
- `wiki/indexes/projects.md` — project list with links
- `wiki/indexes/topics.md` — concept list with links
- `wiki/indexes/timeline.md` — chronological development
- `wiki/indexes/missing.md` — what the KB doesn't cover yet

### Step 6: Mermaid diagram

Add a Mermaid knowledge graph to `wiki/field-map.md` showing the top 3
projects per bucket (~15 nodes total) with cross-bucket relationships.
Keep it clean and readable — this is the screenshot for social media.

### Step 7: Self-review

Verify: every relative link resolves to a real file, every factual claim
cites a source in `raw/`, no orphan pages exist without inbound links.

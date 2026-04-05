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

Compile the wiki from raw sources. Output goes to `wiki/` (or
`wiki-{agent}/` when running as a comparison alongside the API pipeline).

## Quick start

```
1. Read all sources in raw/ AND raw/deep/
2. Write 5 synthesis articles (Tier 1 — the value)
3. Write field-map.md systems overview (Tier 2)
4. Write reference cards (Tier 3)
5. Generate indexes + comparison table (Tier 4)
6. Add Mermaid diagram to field-map
7. Apply stop-slop to all prose
8. Self-check: verify all links resolve, all claims cite sources
```

## Sources

Two tiers of sources exist:

- **Shallow sources** (`raw/{tweets,repos,papers,articles}/*.md`): README scrapes,
  paper abstracts, tweet captures. Good for engagement metrics (stars, likes)
  and broad coverage.
- **Deep sources** (`raw/deep/{repos,papers}/*.md`): Source-code analysis,
  full paper text, external documentation, web research. Contains architecture
  details, design tradeoffs, failure modes, verified benchmarks. **These are
  your primary material for synthesis.** When both exist for a project, prefer
  the deep source for implementation details and the shallow source for
  engagement metrics.

Each source has YAML frontmatter:

```yaml
url: source URL
type: tweet | repo | paper | article
author: name or @handle
date: YYYY-MM-DD
tags: [knowledge-bases, agent-memory, ...]
key_insight: "Why this source matters"
stars: 51880  # optional
deep_research:  # present in deep sources only
  method: source-code-analysis
  files_analyzed: [...]
```

Group sources by the 5 taxonomy buckets. See [compile/taxonomy.md](compile/taxonomy.md).

## Compilation workflow

```
- [ ] Step 1: Read ALL sources in raw/ and raw/deep/
- [ ] Step 2: Write 5 synthesis articles (3000-5000 words each)
- [ ] Step 3: Write field-map.md (3000-5000 words, systems map)
- [ ] Step 4: Write reference cards for projects + concepts
- [ ] Step 5: Generate comparison table + indexes
- [ ] Step 6: Generate README.md entry point
- [ ] Step 7: Apply stop-slop to all prose
- [ ] Step 8: Self-review — links work, claims cite sources
```

### Step 1: Read all sources

Read every file in `raw/**/*.md` and `raw/deep/**/*.md`. There are ~155
sources total, including ~51 deep research files with ~140K words of
source-code-level analysis.

### Step 2: Synthesis articles (Tier 1 — where the value is)

Write one landscape analysis per bucket. See [compile/templates.md](compile/templates.md)
for the article structure and [compile/quality.md](compile/quality.md) for
citation and quality rules.

Output files:
- `wiki/knowledge-bases.md`
- `wiki/agent-memory.md`
- `wiki/context-engineering.md`
- `wiki/agent-systems.md`
- `wiki/self-improving.md`

Each article should be **3000-5000 words**. These are NOT project catalogs.
They are syntheses that change how practitioners think about the space.

### Step 3: Field map (Tier 2)

Write `wiki/field-map.md` — the flagship overview (3000-5000 words).

This is a **systems map**, not a taxonomy. The 5 buckets are layers of one
stack, not separate markets. Show:
- A **Five Layers** overview: one paragraph per bucket naming the central problem
- Integration points between adjacent buckets (with failure-when-missing)
- Where paradigms are fragmenting (and the routing logic for choosing)
- A concrete end-to-end practitioner flow naming specific tools
- What the field got wrong (one major corrected assumption)
- **Cross-cutting themes**: 4-6 patterns spanning all buckets (e.g., markdown as universal format, git as infrastructure, emergence of forgetting, binary evaluation)
- Reading guide based on what you're building

### Step 4: Reference cards (Tier 3)

For each significant project: `wiki/projects/{slug}.md`.
For key concepts: `wiki/concepts/{slug}.md`.
See [compile/templates.md](compile/templates.md) for card structure.

### Step 5: Indexes + comparison table (Tier 4)

- `wiki/comparisons/landscape.md` — all projects in one table
- `wiki/indexes/projects.md` — project list with links
- `wiki/indexes/topics.md` — concept list with links
- `wiki/indexes/timeline.md` — chronological development
- `wiki/indexes/missing.md` — what the KB doesn't cover yet

### Step 6: README + diagrams

Write `wiki/README.md` as the entry point — explain what meta-kb is, link to
field-map.md, the 5 synthesis articles, the indexes, and the knowledge graph.

For diagrams: if D2 is available (`d2` CLI), generate `images/field-map.d2`
→ `images/field-map.svg` showing top 3 projects per bucket with cross-bucket
edges. Also generate `graph.html` as an interactive knowledge graph. Otherwise
fall back to a Mermaid diagram in field-map.md.

### Step 7: Apply stop-slop

Run every article through the [stop-slop](.claude/skills/stop-slop/SKILL.md)
skill. Check all prose for AI writing patterns. Score each article against
the rubric (target 35+/50). Revise any that fail.

### Step 8: Self-review

Verify: every relative link resolves to a real file, every factual claim
cites a source in `raw/` or `raw/deep/`, no orphan pages exist without
inbound links.

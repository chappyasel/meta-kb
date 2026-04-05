---
name: compile-field-map
description: >
  Writes field-map.md, the flagship overview article for meta-kb that connects
  all five taxonomy areas into one system. A 3000-5000 word systems map showing
  integration points, paradigm routing logic, and a concrete practitioner flow.
  Use when writing the meta-kb field map or systems overview.
---

# Compile Field Map

Write `wiki/field-map.md`, a systems map that treats the 5 taxonomy buckets as
layers of one stack, not a taxonomy. Start with `# The Landscape of LLM Knowledge Systems`.

## Prerequisites

Read all 5 synthesis articles before writing:
- `wiki/knowledge-bases.md`
- `wiki/agent-memory.md`
- `wiki/context-engineering.md`
- `wiki/agent-systems.md`
- `wiki/self-improving.md`

## Structure

### 1. Five Layers (one paragraph per bucket)

Name the central engineering problem each bucket solves. Link to the synthesis
article. Frame them as layers of a single stack, bottom to top:
knowledge-bases -> agent-memory -> context-engineering -> agent-systems -> self-improving.

### 2. Integration Points

For each pair of adjacent layers: how does layer N feed layer N+1? What breaks
when the integration is missing? Name specific projects that bridge each gap.

### 3. Paradigm Fragmentation

Routing logic for retrieval approaches: when to use vector, graph, or
file-based retrieval. Name the tradeoff each optimizes for (latency, temporal
validity, simplicity). Include decision criteria a practitioner can apply in
under 60 seconds.

### 4. Implementation Maturity

Two columns: production-ready and research-grade. Name specific projects in
each column. What distinguishes them (docs, adoption, API stability)?

### 5. What the Field Got Wrong

One major assumption that practitioners held 12 months ago and have since
corrected. Provide evidence from sources. Name what replaced it.

### 6. The Practitioner's Flow

Concrete end-to-end trace: a developer building X uses tool A for step 1,
tool B for step 2, etc. Name specific tools at each step. Walk through one
realistic workflow that touches all 5 layers.

### 7. Cross-Cutting Themes

4-6 patterns that span multiple layers:
- Markdown as universal interchange format
- Git as infrastructure (versioning, diff, collaboration)
- Finite attention budget (context window as scarce resource)
- Agent as author (LLMs writing for LLMs)
- Emergence of forgetting (decay, pruning, garbage collection)
- Binary evaluation (pass/fail over Likert scales)

One paragraph per theme. Cite specific examples.

### 8. Reading Guide

What to read next based on what the reader is building. 4-5 personas with
a recommended path through the wiki articles.

## Mermaid Diagram

Include a Mermaid `graph LR` diagram showing the top 3 projects per bucket
with cross-bucket edges where projects bridge layers. Keep it readable (15-20
nodes max).

## Frontmatter

```yaml
---
title: "The Landscape of LLM Knowledge Systems"
type: field-map
last_compiled: "YYYY-MM-DD"
---
```

## Writing Quality

Read and follow all rules in [../stop-slop/SKILL.md](../stop-slop/SKILL.md).
No filler, no passive voice, no em dashes, no AI tells.

Every claim cites a source: `[Source](../raw/type/file.md)`. Every project
links to its reference card on first mention: `[Mem0](projects/mem0.md)`.

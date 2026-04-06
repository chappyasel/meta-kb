---
name: compile-field-map
description: >
  Writes field-map.md, the flagship overview article that connects all taxonomy
  areas into one system. A 3000-5000 word systems map showing integration points,
  paradigm routing logic, and a concrete practitioner flow. Use when writing the
  field map or systems overview.
---

# Compile Field Map

Read `config/domain.ts` for bucket definitions, the `fieldMapTitle`, stack order, and `crossCuttingThemes`.

Write `wiki/field-map.md`, a systems map that treats the taxonomy buckets as
layers of one stack, not a taxonomy. Use the `fieldMapTitle` from `config/domain.ts` as the H1.

## Prerequisites

Read the synthesis article for each bucket defined in `config/domain.ts` (one file per bucket at `wiki/{bucket-id}.md`).

## Structure

### 1. Layers (one paragraph per bucket)

Name the central engineering problem each bucket solves. Link to the synthesis
article. Frame them as layers of a single stack in the order defined in `config/domain.ts` (first bucket is bottom, last is top).

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

Use the `crossCuttingThemes` from `config/domain.ts`. One paragraph per theme. Cite specific examples.

### 8. Reading Guide

What to read next based on what the reader is building. 4-5 personas with
a recommended path through the wiki articles.

## Mermaid Diagram

Include a Mermaid `graph LR` diagram showing the **5-layer stack**, not individual projects. Each node is a bucket labeled with its central engineering problem. Edges show integration points between adjacent layers. Include a dotted feedback loop from the top layer back to the bottom.

Do NOT generate a project-level graph (random projects with sparse edges are meaningless). The diagram represents the article's thesis: these areas form one stack.

## Frontmatter

```yaml
---
title: "<fieldMapTitle from config/domain.ts>"
type: field-map
last_compiled: "YYYY-MM-DD"
---
```

## Writing Quality

Read and follow all rules in [../stop-slop/SKILL.md](../stop-slop/SKILL.md).
No filler, no passive voice, no em dashes, no AI tells.

Every claim cites a source: `[Source](../raw/type/file.md)`. Every project
links to its reference card on first mention: `[Mem0](projects/mem0.md)`.

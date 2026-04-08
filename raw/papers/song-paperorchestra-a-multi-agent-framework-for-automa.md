---
url: 'https://arxiv.org/abs/2604.05018'
type: paper
author: 'Yiwen Song, Yale Song, Tomas Pfister, Jinsung Yoon'
date: '2026-04-06'
tags:
  - multi-agent-systems
  - agent-architecture
  - context-engineering
  - task-delegation
  - agent-coordination
  - scientific-workflow
  - structured-output-generation
key_insight: >-
  Multi-agent orchestration for complex document synthesis reveals that
  specialized agent teams with shared state (research materials, manuscript
  drafts, citations) can outperform monolithic writers—this pattern of
  delegating sub-tasks (literature review, figure generation, structure
  planning) to coordinated agents applies broadly to any LLM system producing
  structured, multi-component outputs.
relevance_scores:
  topic_relevance: 7
  practitioner_value: 6
  novelty: 7
  signal_quality: 7
  composite: 6.7
  reason: >-
    Multi-agent orchestration with shared state management for complex
    structured document synthesis is a directly transferable coordination
    pattern for multi-agent systems, with a novel benchmark and measurable
    performance improvements over monolithic baselines.
---
## PaperOrchestra: A Multi-Agent Framework for Automated AI Research Paper Writing

**Authors:** Yiwen Song, Yale Song, Tomas Pfister, Jinsung Yoon

**Published:** 2026-04-06 | **Updated:** 2026-04-06

**Categories:** cs.AI, cs.LG, cs.MA

**PDF:** [https://arxiv.org/pdf/2604.05018](https://arxiv.org/pdf/2604.05018)

### Abstract

Synthesizing unstructured research materials into manuscripts is an essential yet under-explored challenge in AI-driven scientific discovery. Existing autonomous writers are rigidly coupled to specific experimental pipelines, and produce superficial literature reviews. We introduce PaperOrchestra, a multi-agent framework for automated AI research paper writing. It flexibly transforms unconstrained pre-writing materials into submission-ready LaTeX manuscripts, including comprehensive literature synthesis and generated visuals, such as plots and conceptual diagrams. To evaluate performance, we present PaperWritingBench, the first standardized benchmark of reverse-engineered raw materials from 200 top-tier AI conference papers, alongside a comprehensive suite of automated evaluators. In side-by-side human evaluations, PaperOrchestra significantly outperforms autonomous baselines, achieving an absolute win rate margin of 50%-68% in literature review quality, and 14%-38% in overall manuscript quality.

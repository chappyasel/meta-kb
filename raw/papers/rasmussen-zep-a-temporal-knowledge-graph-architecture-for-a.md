---
url: 'https://arxiv.org/abs/2501.13956'
type: paper
author: 'Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais, Jack Ryan, Daniel Chalef'
date: '2025-01-20'
tags:
  - agent-memory
  - knowledge-graphs
  - temporal-reasoning
  - enterprise-agents
  - graphiti
  - context-synthesis
  - long-term-memory
key_insight: >-
  Temporal knowledge graphs that integrate conversational and business data
  while maintaining historical relationships enable agents to perform
  enterprise-critical reasoning tasks at scale—moving beyond static RAG to
  dynamic, multi-source memory that tracks how information changes over time,
  which is essential for production systems where context inheritance across
  sessions and long-term reasoning determine agent reliability.
relevance_scores:
  topic_relevance: 10
  practitioner_value: 9
  novelty: 8
  signal_quality: 8
  composite: 9.1
  reason: >-
    Zep/Graphiti is a core named technology in the Agent Memory topic area, and
    this paper provides detailed benchmarks (DMR, LongMemEval), architectural
    description of a temporal knowledge graph engine, and quantified
    improvements over MemGPT—directly actionable for practitioners building
    production agent memory systems.
---
## Zep: A Temporal Knowledge Graph Architecture for Agent Memory

**Authors:** Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais, Jack Ryan, Daniel Chalef

**Published:** 2025-01-20 | **Updated:** 2025-01-20

**Categories:** cs.CL, cs.AI, cs.IR

**PDF:** [https://arxiv.org/pdf/2501.13956](https://arxiv.org/pdf/2501.13956)

### Abstract

We introduce Zep, a novel memory layer service for AI agents that outperforms the current state-of-the-art system, MemGPT, in the Deep Memory Retrieval (DMR) benchmark. Additionally, Zep excels in more comprehensive and challenging evaluations than DMR that better reflect real-world enterprise use cases. While existing retrieval-augmented generation (RAG) frameworks for large language model (LLM)-based agents are limited to static document retrieval, enterprise applications demand dynamic knowledge integration from diverse sources including ongoing conversations and business data. Zep addresses this fundamental limitation through its core component Graphiti -- a temporally-aware knowledge graph engine that dynamically synthesizes both unstructured conversational data and structured business data while maintaining historical relationships. In the DMR benchmark, which the MemGPT team established as their primary evaluation metric, Zep demonstrates superior performance (94.8% vs 93.4%). Beyond DMR, Zep's capabilities are further validated through the more challenging LongMemEval benchmark, which better reflects enterprise use cases through complex temporal reasoning tasks. In this evaluation, Zep achieves substantial results with accuracy improvements of up to 18.5% while simultaneously reducing response latency by 90% compared to baseline implementations. These results are particularly pronounced in enterprise-critical tasks such as cross-session information synthesis and long-term context maintenance, demonstrating Zep's effectiveness for deployment in real-world applications.

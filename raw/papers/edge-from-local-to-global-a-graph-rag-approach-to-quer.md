---
url: 'https://arxiv.org/abs/2404.16130'
type: paper
author: >-
  Darren Edge, Ha Trinh, Newman Cheng, Joshua Bradley, Alex Chao, Apurva Mody,
  Steven Truitt, Dasha Metropolitansky, Robert Osazuwa Ness, Jonathan Larson
date: '2024-04-24'
tags:
  - knowledge-bases
  - rag
  - graph-indexing
  - context-engineering
  - query-focused-summarization
  - entity-extraction
  - hierarchical-aggregation
key_insight: >-
  Graph-based knowledge indexing with precomputed community summaries enables
  RAG systems to answer global, corpus-level questions by hierarchically
  aggregating local entity relationships—solving the fundamental mismatch
  between RAG's local retrieval bias and the holistic understanding required for
  sensemaking queries.
relevance_scores:
  topic_relevance: 8
  practitioner_value: 8
  novelty: 8
  signal_quality: 9
  composite: 8.2
  reason: >-
    GraphRAG is a directly relevant RAG alternative for knowledge bases that
    introduces a genuinely novel hierarchical graph-indexing approach to solve
    corpus-level sensemaking queries, with a detailed published paper and
    Microsoft open-source implementation.
---
## From Local to Global: A Graph RAG Approach to Query-Focused Summarization

**Authors:** Darren Edge, Ha Trinh, Newman Cheng, Joshua Bradley, Alex Chao, Apurva Mody, Steven Truitt, Dasha Metropolitansky, Robert Osazuwa Ness, Jonathan Larson

**Published:** 2024-04-24 | **Updated:** 2025-02-19

**Categories:** cs.CL, cs.AI, cs.IR

**PDF:** [https://arxiv.org/pdf/2404.16130](https://arxiv.org/pdf/2404.16130)

### Abstract

The use of retrieval-augmented generation (RAG) to retrieve relevant information from an external knowledge source enables large language models (LLMs) to answer questions over private and/or previously unseen document collections. However, RAG fails on global questions directed at an entire text corpus, such as "What are the main themes in the dataset?", since this is inherently a query-focused summarization (QFS) task, rather than an explicit retrieval task. Prior QFS methods, meanwhile, do not scale to the quantities of text indexed by typical RAG systems. To combine the strengths of these contrasting methods, we propose GraphRAG, a graph-based approach to question answering over private text corpora that scales with both the generality of user questions and the quantity of source text. Our approach uses an LLM to build a graph index in two stages: first, to derive an entity knowledge graph from the source documents, then to pregenerate community summaries for all groups of closely related entities. Given a question, each community summary is used to generate a partial response, before all partial responses are again summarized in a final response to the user. For a class of global sensemaking questions over datasets in the 1 million token range, we show that GraphRAG leads to substantial improvements over a conventional RAG baseline for both the comprehensiveness and diversity of generated answers.

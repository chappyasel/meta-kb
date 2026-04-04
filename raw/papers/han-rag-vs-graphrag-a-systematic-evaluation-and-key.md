---
url: 'https://arxiv.org/abs/2502.11371'
type: paper
author: >-
  Haoyu Han, Li Ma, Yu Wang, Harry Shomer, Yongjia Lei, Zhisheng Qi, Kai Guo,
  Zhigang Hua, Bo Long, Hui Liu, Charu C. Aggarwal, Jiliang Tang
date: '2025-02-17'
tags:
  - knowledge-bases
  - rag
  - graph-retrieval
  - context-engineering
  - evaluation-benchmarking
  - reasoning
  - retrieval-architectures
key_insight: >-
  GraphRAG's superiority over traditional RAG depends critically on task
  structure—flat retrieval excels for direct lookup queries while
  graph-organized contexts win for multi-hop reasoning, meaning knowledge base
  builders must match their retrieval architecture to query complexity rather
  than assuming one paradigm universally outperforms.
relevance_scores:
  topic_relevance: 7
  practitioner_value: 7
  novelty: 6
  signal_quality: 7
  composite: 6.9
  reason: >-
    Systematic benchmark comparing RAG vs GraphRAG with unified evaluation
    protocol directly informs knowledge base architecture decisions, offering
    actionable guidance on matching retrieval paradigm to query complexity,
    though it's primarily evaluative rather than introducing a new architecture.
---
## RAG vs. GraphRAG: A Systematic Evaluation and Key Insights

**Authors:** Haoyu Han, Li Ma, Yu Wang, Harry Shomer, Yongjia Lei, Zhisheng Qi, Kai Guo, Zhigang Hua, Bo Long, Hui Liu, Charu C. Aggarwal, Jiliang Tang

**Published:** 2025-02-17 | **Updated:** 2026-03-04

**Categories:** cs.IR

**PDF:** [https://arxiv.org/pdf/2502.11371](https://arxiv.org/pdf/2502.11371)

### Abstract

Retrieval-Augmented Generation (RAG) improves large language models (LLMs) by retrieving relevant information from external sources and has been widely adopted for text-based tasks. For structured data, such as knowledge graphs, Graph Retrieval-Augmented Generation (GraphRAG) retrieves and aggregates information along graph structures. More recently, GraphRAG has been extended to general text settings by organizing unstructured text into graph representations, showing promise for reasoning and grounding. Despite these advances, existing GraphRAG systems for text data are often tailored to specific tasks, datasets, and system designs, resulting in heterogeneous evaluation protocols. Consequently, a systematic understanding of the relative strengths, limitations, and trade-offs between RAG and GraphRAG on widely used text benchmarks remains limited. In this paper, we present a comprehensive benchmark study comparing RAG and GraphRAG on established text-based tasks, including question answering and query-based summarization. We introduce a unified evaluation protocol that standardizes data preprocessing, retrieval configurations, and generation settings, enabling fair and reproducible comparisons. Our results highlight the distinct strengths of RAG and GraphRAG across different tasks and evaluation perspectives. Building on these findings, we explore selection and integration strategies that combine the strengths of both paradigms, leading to consistent performance improvements. We further analyze failure modes, efficiency trade-offs, and evaluation biases, and highlight key considerations for designing and evaluating retrieval-augmented generation systems.

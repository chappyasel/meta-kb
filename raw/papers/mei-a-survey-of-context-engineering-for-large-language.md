---
url: 'https://arxiv.org/abs/2507.13334'
type: paper
author: >-
  Lingrui Mei, Jiayu Yao, Yuyao Ge, Yiwei Wang, Baolong Bi, Yujun Cai, Jiazhi
  Liu, Mingyu Li, Zhong-Zhi Li, Duzhen Zhang, Chenlin Zhou, Jiayi Mao, Tianze
  Xia, Jiafeng Guo, Shenghua Liu
date: '2025-07-17'
tags:
  - context-engineering
  - rag
  - knowledge-bases
  - agent-memory
  - multi-agent-systems
  - context-optimization
  - prompt-engineering
key_insight: >-
  Context engineering is not just prompt optimization but a systematic
  discipline encompassing retrieval, processing, and management—understanding
  this taxonomy is critical for builders because the fundamental asymmetry
  between LLM comprehension and generation capabilities means knowledge bases
  must be architected to work around limited output sophistication, not just
  input capacity.
relevance_scores:
  topic_relevance: 9
  practitioner_value: 7
  novelty: 6
  signal_quality: 7
  composite: 7.7
  reason: >-
    This survey directly formalizes context engineering as a discipline covering
    RAG, memory systems, tool-integrated reasoning, and multi-agent systems—core
    topics of the knowledge base—and the asymmetry insight between comprehension
    and generation has direct architectural implications for KB builders, though
    as a survey paper it lacks implementation artifacts.
---
## A Survey of Context Engineering for Large Language Models

**Authors:** Lingrui Mei, Jiayu Yao, Yuyao Ge, Yiwei Wang, Baolong Bi, Yujun Cai, Jiazhi Liu, Mingyu Li, Zhong-Zhi Li, Duzhen Zhang, Chenlin Zhou, Jiayi Mao, Tianze Xia, Jiafeng Guo, Shenghua Liu

**Published:** 2025-07-17 | **Updated:** 2025-07-21

**Categories:** cs.CL

**PDF:** [https://arxiv.org/pdf/2507.13334](https://arxiv.org/pdf/2507.13334)

### Abstract

The performance of Large Language Models (LLMs) is fundamentally determined by the contextual information provided during inference. This survey introduces Context Engineering, a formal discipline that transcends simple prompt design to encompass the systematic optimization of information payloads for LLMs. We present a comprehensive taxonomy decomposing Context Engineering into its foundational components and the sophisticated implementations that integrate them into intelligent systems. We first examine the foundational components: context retrieval and generation, context processing and context management. We then explore how these components are architecturally integrated to create sophisticated system implementations: retrieval-augmented generation (RAG), memory systems and tool-integrated reasoning, and multi-agent systems. Through this systematic analysis of over 1400 research papers, our survey not only establishes a technical roadmap for the field but also reveals a critical research gap: a fundamental asymmetry exists between model capabilities. While current models, augmented by advanced context engineering, demonstrate remarkable proficiency in understanding complex contexts, they exhibit pronounced limitations in generating equally sophisticated, long-form outputs. Addressing this gap is a defining priority for future research. Ultimately, this survey provides a unified framework for both researchers and engineers advancing context-aware AI.

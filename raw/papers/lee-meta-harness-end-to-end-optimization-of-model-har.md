---
url: 'https://arxiv.org/abs/2603.28052'
type: paper
author: >-
  Yoonho Lee, Roshen Nair, Qizheng Zhang, Kangwook Lee, Omar Khattab, Chelsea
  Finn
date: '2026-03-30'
tags:
  - rag
  - context-engineering
  - self-improving
  - harness-optimization
  - automated-engineering
  - execution-traces
deep_researched: 'deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md'
key_insight: >-
  Model harnesses (the code controlling what information LLMs receive) create
  up to 6x performance gaps. Meta-Harness automates harness optimization by
  giving a coding agent filesystem access to all prior candidates' source code,
  execution traces, and scores, achieving +7.7 over ACE with 4x fewer tokens.
---
## Meta-Harness: End-to-End Optimization of Model Harnesses

**Authors:** Yoonho Lee, Roshen Nair, Qizheng Zhang, Kangwook Lee, Omar Khattab, Chelsea Finn

**Published:** 2026-03-30 | **Updated:** 2026-03-30

**Categories:** cs.AI

**PDF:** [https://arxiv.org/pdf/2603.28052](https://arxiv.org/pdf/2603.28052)

### Abstract

The performance of large language model (LLM) systems depends not only on model weights, but also on their harness: the code that determines what information to store, retrieve, and present to the model. Yet harnesses are still designed largely by hand, and existing text optimizers are poorly matched to this setting because they compress feedback too aggressively. We introduce Meta-Harness, an outer-loop system that searches over harness code for LLM applications. It uses an agentic proposer that accesses the source code, scores, and execution traces of all prior candidates through a filesystem. On online text classification, Meta-Harness improves over a state-of-the-art context management system by 7.7 points while using 4x fewer context tokens. On retrieval-augmented math reasoning, a single discovered harness improves accuracy on 200 IMO-level problems by 4.7 points on average across five held-out models. On agentic coding, discovered harnesses surpass the best hand-engineered baselines on TerminalBench-2. Together, these results show that richer access to prior experience can enable automated harness engineering.

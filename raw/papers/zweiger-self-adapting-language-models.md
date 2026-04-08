---
url: 'https://arxiv.org/abs/2506.10943'
type: paper
author: 'Adam Zweiger, Jyothish Pari, Han Guo, Ekin Akyürek, Yoon Kim, Pulkit Agrawal'
date: '2025-06-12'
tags:
  - self-improving
  - agent-architecture
  - weight-adaptation
  - in-context-to-weights
  - few-shot-generalization
  - reinforcement-learning-optimization
key_insight: >-
  SEAL demonstrates that LLMs can generate their own finetuning directives and
  synthetic adaptation data, enabling persistent weight updates without external
  adaptation modules—this shifts self-improvement from post-hoc correction loops
  to in-weight learning that compounds across sessions and reduces reliance on
  fixed prompting strategies.
relevance_scores:
  topic_relevance: 9
  practitioner_value: 7
  novelty: 9
  signal_quality: 8
  composite: 8.3
  reason: >-
    SEAL directly addresses self-improving systems via RL-driven in-weight
    learning loops where the model generates its own finetuning data and
    directives—a genuinely novel architecture for persistent, compounding
    self-adaptation with code and detailed write-up available.
---
## Self-Adapting Language Models

**Authors:** Adam Zweiger, Jyothish Pari, Han Guo, Ekin Akyürek, Yoon Kim, Pulkit Agrawal

**Published:** 2025-06-12 | **Updated:** 2025-09-18

**Categories:** cs.LG

**PDF:** [https://arxiv.org/pdf/2506.10943](https://arxiv.org/pdf/2506.10943)

### Abstract

Large language models (LLMs) are powerful but static; they lack mechanisms to adapt their weights in response to new tasks, knowledge, or examples. We introduce Self-Adapting LLMs (SEAL), a framework that enables LLMs to self-adapt by generating their own finetuning data and update directives. Given a new input, the model produces a self-edit-a generation that may restructure the information in different ways, specify optimization hyperparameters, or invoke tools for data augmentation and gradient-based updates. Through supervised finetuning (SFT), these self-edits result in persistent weight updates, enabling lasting adaptation. To train the model to produce effective self-edits, we use a reinforcement learning loop with the downstream performance of the updated model as the reward signal. Unlike prior approaches that rely on separate adaptation modules or auxiliary networks, SEAL directly uses the model's own generation to control its adaptation process. Experiments on knowledge incorporation and few-shot generalization show that SEAL is a promising step toward language models capable of self-directed adaptation. Our website and code is available at https://jyopari.github.io/posts/seal.

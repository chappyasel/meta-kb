---
url: 'https://arxiv.org/abs/2303.11366'
type: paper
author: >-
  Noah Shinn, Federico Cassano, Edward Berman, Ashwin Gopinath, Karthik
  Narasimhan, Shunyu Yao
date: '2023-03-20'
tags:
  - agent-memory
  - self-improving
  - episodic-memory
  - verbal-reinforcement-learning
  - agentic-skills
  - feedback-loops
  - language-reasoning
key_insight: >-
  Reflexion demonstrates that LLM agents can improve through lightweight
  linguistic feedback loops stored in episodic memory rather than weight
  updates, enabling sub-linear sample efficiency for trial-and-error
  learning—critical for knowledge bases that must support self-improving agents
  without costly retraining cycles.
relevance_scores:
  topic_relevance: 8
  practitioner_value: 7
  novelty: 8
  signal_quality: 8
  composite: 7.7
  deep_researched: 'deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md'
  reason: >-
    Reflexion directly implements a self-improving agent loop using episodic
    memory buffers and verbal reinforcement—a transferable pattern for both
    agent memory architectures and self-improving KB systems without weight
    updates.
---
## Reflexion: Language Agents with Verbal Reinforcement Learning

**Authors:** Noah Shinn, Federico Cassano, Edward Berman, Ashwin Gopinath, Karthik Narasimhan, Shunyu Yao

**Published:** 2023-03-20 | **Updated:** 2023-10-10

**Categories:** cs.AI, cs.CL, cs.LG

**PDF:** [https://arxiv.org/pdf/2303.11366](https://arxiv.org/pdf/2303.11366)

### Abstract

Large language models (LLMs) have been increasingly used to interact with external environments (e.g., games, compilers, APIs) as goal-driven agents. However, it remains challenging for these language agents to quickly and efficiently learn from trial-and-error as traditional reinforcement learning methods require extensive training samples and expensive model fine-tuning. We propose Reflexion, a novel framework to reinforce language agents not by updating weights, but instead through linguistic feedback. Concretely, Reflexion agents verbally reflect on task feedback signals, then maintain their own reflective text in an episodic memory buffer to induce better decision-making in subsequent trials. Reflexion is flexible enough to incorporate various types (scalar values or free-form language) and sources (external or internally simulated) of feedback signals, and obtains significant improvements over a baseline agent across diverse tasks (sequential decision-making, coding, language reasoning). For example, Reflexion achieves a 91% pass@1 accuracy on the HumanEval coding benchmark, surpassing the previous state-of-the-art GPT-4 that achieves 80%. We also conduct ablation and analysis studies using different feedback signals, feedback incorporation methods, and agent types, and provide insights into how they affect performance.

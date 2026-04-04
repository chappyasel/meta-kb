---
url: 'https://arxiv.org/abs/2305.16291'
type: paper
author: >-
  Guanzhi Wang, Yuqi Xie, Yunfan Jiang, Ajay Mandlekar, Chaowei Xiao, Yuke Zhu,
  Linxi Fan, Anima Anandkumar
date: '2023-05-25'
tags:
  - self-improving
  - agentic-skills
  - agent-memory
  - skill-composition
  - embodied-learning
  - lifelong-learning
  - prompt-engineering
key_insight: >-
  Voyager's skill library approach with iterative self-verification creates a
  compounding mechanism for lifelong learning—each new skill builds on prior
  discoveries without fine-tuning, allowing LLM-based agents to accumulate
  capabilities that generalize to novel tasks, which is critical for knowledge
  bases that need to grow and adapt without catastrophic forgetting.
relevance_scores:
  topic_relevance: 7
  practitioner_value: 7
  novelty: 8
  signal_quality: 8
  composite: 7.3
  reason: >-
    Voyager's skill library with iterative self-verification and compositional
    skill accumulation is a highly transferable self-improving pattern directly
    applicable to agentic skill registries and knowledge base growth without
    catastrophic forgetting, even though the domain is Minecraft.
---
## Voyager: An Open-Ended Embodied Agent with Large Language Models

**Authors:** Guanzhi Wang, Yuqi Xie, Yunfan Jiang, Ajay Mandlekar, Chaowei Xiao, Yuke Zhu, Linxi Fan, Anima Anandkumar

**Published:** 2023-05-25 | **Updated:** 2023-10-19

**Categories:** cs.AI, cs.LG

**PDF:** [https://arxiv.org/pdf/2305.16291](https://arxiv.org/pdf/2305.16291)

### Abstract

We introduce Voyager, the first LLM-powered embodied lifelong learning agent in Minecraft that continuously explores the world, acquires diverse skills, and makes novel discoveries without human intervention. Voyager consists of three key components: 1) an automatic curriculum that maximizes exploration, 2) an ever-growing skill library of executable code for storing and retrieving complex behaviors, and 3) a new iterative prompting mechanism that incorporates environment feedback, execution errors, and self-verification for program improvement. Voyager interacts with GPT-4 via blackbox queries, which bypasses the need for model parameter fine-tuning. The skills developed by Voyager are temporally extended, interpretable, and compositional, which compounds the agent's abilities rapidly and alleviates catastrophic forgetting. Empirically, Voyager shows strong in-context lifelong learning capability and exhibits exceptional proficiency in playing Minecraft. It obtains 3.3x more unique items, travels 2.3x longer distances, and unlocks key tech tree milestones up to 15.3x faster than prior SOTA. Voyager is able to utilize the learned skill library in a new Minecraft world to solve novel tasks from scratch, while other techniques struggle to generalize. We open-source our full codebase and prompts at https://voyager.minedojo.org/.

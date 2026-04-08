---
url: 'https://arxiv.org/abs/2510.04618'
type: paper
author: >-
  Qizheng Zhang, Changran Hu, Shubhangi Upasani, Boyuan Ma, Fenglu Hong,
  Vamsidhar Kamanuru, Jay Rainton, Chen Wu, Mengmeng Ji, Hanchen Li, Urmish
  Thakker, James Zou, Kunle Olukotun
date: '2025-10-06'
tags:
  - context-engineering
  - agent-memory
  - self-improving
  - context-collapse
  - playbook-evolution
  - long-context-optimization
  - execution-feedback
key_insight: >-
  ACE demonstrates that treating contexts as evolving playbooks with structured,
  incremental updates prevents context collapse and enables self-improving
  agents without weight updates—critical for builders scaling knowledge across
  long-context windows while maintaining detailed domain insights that
  brevity-optimized RAG systems discard.
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 8
  signal_quality: 8
  composite: 8.4
  reason: >-
    ACE directly addresses context engineering, self-improving agent loops, and
    memory/context collapse—core topics—with measurable benchmarks,
    offline/online optimization, and no-label adaptation patterns immediately
    transferable to agent builders.
---
## Agentic Context Engineering: Evolving Contexts for Self-Improving Language Models

**Authors:** Qizheng Zhang, Changran Hu, Shubhangi Upasani, Boyuan Ma, Fenglu Hong, Vamsidhar Kamanuru, Jay Rainton, Chen Wu, Mengmeng Ji, Hanchen Li, Urmish Thakker, James Zou, Kunle Olukotun

**Published:** 2025-10-06 | **Updated:** 2026-03-29

**Categories:** cs.LG, cs.AI, cs.CL

**PDF:** [https://arxiv.org/pdf/2510.04618](https://arxiv.org/pdf/2510.04618)

### Abstract

Large language model (LLM) applications such as agents and domain-specific reasoning increasingly rely on context adaptation: modifying inputs with instructions, strategies, or evidence, rather than weight updates. Prior approaches improve usability but often suffer from brevity bias, which drops domain insights for concise summaries, and from context collapse, where iterative rewriting erodes details over time. We introduce ACE (Agentic Context Engineering), a framework that treats contexts as evolving playbooks that accumulate, refine, and organize strategies through a modular process of generation, reflection, and curation. ACE prevents collapse with structured, incremental updates that preserve detailed knowledge and scale with long-context models. Across agent and domain-specific benchmarks, ACE optimizes contexts both offline (e.g., system prompts) and online (e.g., agent memory), consistently outperforming strong baselines: +10.6% on agents and +8.6% on finance, while significantly reducing adaptation latency and rollout cost. Notably, ACE could adapt effectively without labeled supervision and instead by leveraging natural execution feedback. On the AppWorld leaderboard, ACE matches the top-ranked production-level agent on the overall average and surpasses it on the harder test-challenge split, despite using a smaller open-source model. These results show that comprehensive, evolving contexts enable scalable, efficient, and self-improving LLM systems with low overhead.

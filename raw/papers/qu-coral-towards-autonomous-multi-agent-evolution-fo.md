---
url: 'https://arxiv.org/abs/2604.01658'
type: paper
author: >-
  Ao Qu, Han Zheng, Zijian Zhou, Yihao Yan, Yihong Tang, Shao Yong Ong, Fenglu
  Hong, Kaichen Zhou, Chonghe Jiang, Minwei Kong, Jiacheng Zhu, Xuan Jiang,
  Sirui Li, Cathy Wu, Bryan Kian Hsiang Low, Jinhua Zhao, Paul Pu Liang
date: '2026-04-02'
tags:
  - multi-agent-systems
  - self-improving
  - agent-memory
  - agent-architecture
  - autonomous-evolution
  - open-ended-discovery
  - knowledge-reuse
key_insight: >-
  CORAL demonstrates that replacing fixed evolutionary heuristics with
  autonomous agents that maintain persistent shared memory and asynchronously
  collaborate can achieve 3-10x faster improvement rates—the key insight is that
  agent autonomy enables knowledge reuse across iterations, which outperforms
  pre-programmed search strategies in open-ended domains where the exploration
  landscape itself is initially unknown.
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 9
  signal_quality: 9
  composite: 8.7
  reason: >-
    CORAL is a directly relevant multi-agent self-improving system with
    persistent shared memory, asynchronous coordination, and autonomous
    evolution loops—core to topics 5 and 6—with open-source code and strong
    benchmarks.
---
## CORAL: Towards Autonomous Multi-Agent Evolution for Open-Ended Discovery

**Authors:** Ao Qu, Han Zheng, Zijian Zhou, Yihao Yan, Yihong Tang, Shao Yong Ong, Fenglu Hong, Kaichen Zhou, Chonghe Jiang, Minwei Kong, Jiacheng Zhu, Xuan Jiang, Sirui Li, Cathy Wu, Bryan Kian Hsiang Low, Jinhua Zhao, Paul Pu Liang

**Published:** 2026-04-02 | **Updated:** 2026-04-02

**Categories:** cs.AI

**PDF:** [https://arxiv.org/pdf/2604.01658](https://arxiv.org/pdf/2604.01658)

### Abstract

Large language model (LLM)-based evolution is a promising approach for open-ended discovery, where progress requires sustained search and knowledge accumulation. Existing methods still rely heavily on fixed heuristics and hard-coded exploration rules, which limit the autonomy of LLM agents. We present CORAL, the first framework for autonomous multi-agent evolution on open-ended problems. CORAL replaces rigid control with long-running agents that explore, reflect, and collaborate through shared persistent memory, asynchronous multi-agent execution, and heartbeat-based interventions. It also provides practical safeguards, including isolated workspaces, evaluator separation, resource management, and agent session and health management. Evaluated on diverse mathematical, algorithmic, and systems optimization tasks, CORAL sets new state-of-the-art results on 10 tasks, achieving 3-10 times higher improvement rates with far fewer evaluations than fixed evolutionary search baselines across tasks. On Anthropic's kernel engineering task, four co-evolving agents improve the best known score from 1363 to 1103 cycles. Mechanistic analyses further show how these gains arise from knowledge reuse and multi-agent exploration and communication. Together, these results suggest that greater agent autonomy and multi-agent evolution can substantially improve open-ended discovery. Code is available at https://github.com/Human-Agent-Society/CORAL.

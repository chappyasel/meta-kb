---
url: 'https://arxiv.org/abs/2502.12110'
type: paper
author: 'Wujiang Xu, Zujie Liang, Kai Mei, Hang Gao, Juntao Tan, Yongfeng Zhang'
date: '2025-02-17'
tags:
  - agent-memory
  - zettelkasten
  - knowledge-graph
  - dynamic-indexing
  - memory-evolution
  - self-improving
key_insight: >-
  A-MEM's agentic approach to dynamic memory organization—where memories
  actively trigger updates to existing knowledge and form evolving
  interconnected networks—offers knowledge base builders a pattern for moving
  beyond static retrieval toward systems where new information reshapes the
  semantic landscape of historical context, critical for maintaining coherence
  in long-horizon agent reasoning.
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 8
  signal_quality: 8
  composite: 8.4
  deep_researched: 'deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md'
  reason: >-
    A-MEM directly addresses agent memory (Topic 2) with a novel
    Zettelkasten-inspired dynamic organization system that enables memory
    evolution and interconnected networks, with open-source code available for
    practitioners to use.
---
## A-MEM: Agentic Memory for LLM Agents

**Authors:** Wujiang Xu, Zujie Liang, Kai Mei, Hang Gao, Juntao Tan, Yongfeng Zhang

**Published:** 2025-02-17 | **Updated:** 2025-10-08

**Categories:** cs.CL, cs.HC

**PDF:** [https://arxiv.org/pdf/2502.12110](https://arxiv.org/pdf/2502.12110)

### Abstract

While large language model (LLM) agents can effectively use external tools for complex real-world tasks, they require memory systems to leverage historical experiences. Current memory systems enable basic storage and retrieval but lack sophisticated memory organization, despite recent attempts to incorporate graph databases. Moreover, these systems' fixed operations and structures limit their adaptability across diverse tasks. To address this limitation, this paper proposes a novel agentic memory system for LLM agents that can dynamically organize memories in an agentic way. Following the basic principles of the Zettelkasten method, we designed our memory system to create interconnected knowledge networks through dynamic indexing and linking. When a new memory is added, we generate a comprehensive note containing multiple structured attributes, including contextual descriptions, keywords, and tags. The system then analyzes historical memories to identify relevant connections, establishing links where meaningful similarities exist. Additionally, this process enables memory evolution - as new memories are integrated, they can trigger updates to the contextual representations and attributes of existing historical memories, allowing the memory network to continuously refine its understanding. Our approach combines the structured organization principles of Zettelkasten with the flexibility of agent-driven decision making, allowing for more adaptive and context-aware memory management. Empirical experiments on six foundation models show superior improvement against existing SOTA baselines. The source code for evaluating performance is available at https://github.com/WujiangXu/A-mem, while the source code of the agentic memory system is available at https://github.com/WujiangXu/A-mem-sys.

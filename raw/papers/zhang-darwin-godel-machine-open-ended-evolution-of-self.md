---
url: 'https://arxiv.org/abs/2505.22954'
type: paper
author: 'Jenny Zhang, Shengran Hu, Cong Lu, Robert Lange, Jeff Clune'
date: '2025-05-29'
tags:
  - self-improving
  - agentic-skills
  - agent-memory
  - open-ended-evolution
  - code-generation
  - meta-learning
  - skill-registry
key_insight: >-
  Self-improving agents that evolve their own code architecture through
  empirical validation offer a practical path beyond fixed agent
  designs—enabling continuous capability expansion (50% improvement on
  SWE-bench) without requiring provable correctness guarantees, which matters
  for builders needing agents that adapt their internal memory management,
  context handling, and skill composition autonomously.
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 9
  signal_quality: 8
  composite: 8.5
  reason: >-
    Darwin Gödel Machine directly implements self-improving agent loops that
    autonomously evolve code editing tools, context window management, and
    peer-review mechanisms—core self-improvement patterns highly transferable to
    agent memory, skill composition, and context engineering domains.
---
## Darwin Godel Machine: Open-Ended Evolution of Self-Improving Agents

**Authors:** Jenny Zhang, Shengran Hu, Cong Lu, Robert Lange, Jeff Clune

**Published:** 2025-05-29 | **Updated:** 2026-03-12

**Categories:** cs.AI

**PDF:** [https://arxiv.org/pdf/2505.22954](https://arxiv.org/pdf/2505.22954)

### Abstract

Today's AI systems have human-designed, fixed architectures and cannot autonomously and continuously improve themselves. The advance of AI could itself be automated. If done safely, that would accelerate AI development and allow us to reap its benefits much sooner. Meta-learning can automate the discovery of novel algorithms, but is limited by first-order improvements and the human design of a suitable search space. The Gödel machine proposed a theoretical alternative: a self-improving AI that repeatedly modifies itself in a provably beneficial manner. Unfortunately, proving that most changes are net beneficial is impossible in practice. We introduce the Darwin Gödel Machine (DGM), a self-improving system that iteratively modifies its own code (thereby also improving its ability to modify its own codebase) and empirically validates each change using coding benchmarks. Inspired by Darwinian evolution and open-endedness research, the DGM maintains an archive of generated coding agents. It grows the archive by sampling an agent from it and using a foundation model to create a new, interesting, version of the sampled agent. This open-ended exploration forms a growing tree of diverse, high-quality agents and allows the parallel exploration of many different paths through the search space. Empirically, the DGM automatically improves its coding capabilities (e.g., better code editing tools, long-context window management, peer-review mechanisms), increasing performance on SWE-bench from 20.0% to 50.0%, and on Polyglot from 14.2% to 30.7%. Furthermore, the DGM significantly outperforms baselines without self-improvement or open-ended exploration. All experiments were done with safety precautions (e.g., sandboxing, human oversight). The DGM is a significant step toward self-improving AI, capable of gathering its own stepping stones along paths that unfold into endless innovation.

---
url: 'https://arxiv.org/abs/2603.15914'
type: paper
author: 'Max Zimmer, Nico Pelleriti, Christophe Roux, Sebastian Pokutta'
date: '2026-03-16'
tags:
  - agentic-skills
  - agent-memory
  - self-improving
  - context-engineering
  - autonomous-agents
  - research-automation
  - prompt-engineering
key_insight: >-
  A practical taxonomy and framework for turning CLI coding agents into
  autonomous research assistants through methodological prompt rules reveals
  that knowledge bases for researchers must encode not just domain facts but
  executable workflows, verification procedures, and autonomy
  guardrails—shifting from passive retrieval to active scaffolding of multi-hour
  experimental sessions.
relevance_scores:
  topic_relevance: 7
  practitioner_value: 7
  novelty: 6
  signal_quality: 7
  composite: 6.9
  reason: >-
    This paper presents a transferable framework for autonomous multi-hour agent
    sessions with methodological prompt rules, verification procedures, and
    autonomy guardrails—directly applicable to agent architecture, context
    engineering (AGENTS.md-style rules), and self-improving research loops,
    though the domain focus is ML/math research rather than KB infrastructure
    specifically.
---
## The Agentic Researcher: A Practical Guide to AI-Assisted Research in Mathematics and Machine Learning

**Authors:** Max Zimmer, Nico Pelleriti, Christophe Roux, Sebastian Pokutta

**Published:** 2026-03-16 | **Updated:** 2026-03-16

**Categories:** cs.LG, cs.AI

**PDF:** [https://arxiv.org/pdf/2603.15914](https://arxiv.org/pdf/2603.15914)

### Abstract

AI tools and agents are reshaping how researchers work, from proving theorems to training neural networks. Yet for many, it remains unclear how these tools fit into everyday research practice. This paper is a practical guide to AI-assisted research in mathematics and machine learning: We discuss how researchers can use modern AI systems productively, where these systems help most, and what kinds of guardrails are needed to use them responsibly. It is organized into three parts: (I) a five-level taxonomy of AI integration, (II) an open-source framework that, through a set of methodological rules formulated as agent prompts, turns CLI coding agents (e.g., Claude Code, Codex CLI, OpenCode) into autonomous research assistants, and (III) case studies from deep learning and mathematics. The framework runs inside a sandboxed container, works with any frontier LLM through existing CLI agents, is simple enough to install and use within minutes, and scales from personal-laptop prototyping to multi-node, multi-GPU experimentation across compute clusters. In practice, our longest autonomous session ran for over 20 hours, dispatching independent experiments across multiple nodes without human intervention. We stress that our framework is not intended to replace the researcher in the loop, but to augment them. Our code is publicly available at https://github.com/ZIB-IOL/The-Agentic-Researcher.

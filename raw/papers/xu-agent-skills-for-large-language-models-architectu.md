---
url: 'https://arxiv.org/abs/2602.12430'
type: paper
author: 'Renjun Xu, Yang Yan'
date: '2026-02-12'
tags:
  - agentic-skills
  - agent-memory
  - context-engineering
  - skill-composition
  - model-context-protocol
  - security-governance
  - skill-registry
  - autonomous-skill-discovery
  - progressive-disclosure
key_insight: >-
  The SKILL.md specification and progressive context loading enable agents to
  dynamically compose capabilities without retraining, but the 26.1%
  vulnerability rate in community skills reveals that skill ecosystems require
  formal governance frameworks—making security-first skill registries and trust
  models as critical as acquisition mechanisms for production deployments.
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 8
  signal_quality: 9
  composite: 8.6
  reason: >-
    Directly addresses SKILL.md specification, progressive context loading,
    skill registries, and self-improving skill ecosystems—core topics 3, 4, and
    5—with a governance framework and security analysis that are immediately
    applicable to production agent deployments.
---
## Agent Skills for Large Language Models: Architecture, Acquisition, Security, and the Path Forward

**Authors:** Renjun Xu, Yang Yan

**Published:** 2026-02-12 | **Updated:** 2026-02-17

**Categories:** cs.MA, cs.AI

**PDF:** [https://arxiv.org/pdf/2602.12430](https://arxiv.org/pdf/2602.12430)

### Abstract

The transition from monolithic language models to modular, skill-equipped agents marks a defining shift in how large language models (LLMs) are deployed in practice. Rather than encoding all procedural knowledge within model weights, agent skills -- composable packages of instructions, code, and resources that agents load on demand -- enable dynamic capability extension without retraining. It is formalized in a paradigm of progressive disclosure, portable skill definitions, and integration with the Model Context Protocol (MCP). This survey provides a comprehensive treatment of the agent skills landscape, as it has rapidly evolved during the last few months. We organize the field along four axes: (i) architectural foundations, examining the SKILL$.$md specification, progressive context loading, and the complementary roles of skills and MCP; (ii) skill acquisition, covering reinforcement learning with skill libraries, autonomous skill discovery (SEAgent), and compositional skill synthesis; (iii) deployment at scale, including the computer-use agent (CUA) stack, GUI grounding advances, and benchmark progress on OSWorld and SWE-bench; and (iv) security, where recent empirical analyses reveal that 26.1% of community-contributed skills contain vulnerabilities, motivating our proposed Skill Trust and Lifecycle Governance Framework -- a four-tier, gate-based permission model that maps skill provenance to graduated deployment capabilities. We identify seven open challenges -- from cross-platform skill portability to capability-based permission models -- and propose a research agenda for realizing trustworthy, self-improving skill ecosystems. Unlike prior surveys that broadly cover LLM agents or tool use, this work focuses specifically on the emerging skill abstraction layer and its implications for the next generation of agentic systems. Project repo: https://github.com/scienceaix/agentskills

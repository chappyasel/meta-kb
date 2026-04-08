---
url: 'https://github.com/Memento-Teams/Memento-Skills'
type: repo
author: Memento-Teams
date: '2026-04-03'
tags:
  - agentic-skills
  - self-improving
  - agent-memory
  - skill-composition
  - skill-registry
  - deployment-time-learning
  - reflection-loops
  - skill-evolution
key_insight: >-
  Memento-Skills demonstrates that agents can autonomously design, refine, and
  evolve their own capabilities through a read-write reflection loop at
  deployment time, eliminating the need for expensive retraining while building
  cumulative skill memory from live interactions—this shifts the bottleneck from
  model parameters to external skill registries that agents can introspect and
  modify.
stars: 916
forks: 84
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 8
  signal_quality: 8
  composite: 8.4
  reason: >-
    Directly implements self-improving agent loops via read-write skill
    registries at deployment time—core to topics 4 (SKILL.md/agent
    capabilities), 6 (self-improvement/reflection loops), and 3 (context
    engineering)—with production-ready Python code, 916 stars, and clear
    architectural documentation.
language: Python
deep_researched: deep/repos/memento-teams-memento-skills.md
---
## Memento-Skills

> Memento-Skills: Let Agents Design Agents

### Stats

| Metric | Value |
|--------|-------|
| Stars | 916 |
| Forks | 84 |
| Language | Python |
| Last Updated | 2026-04-03 |

### README (excerpt)

<h1 align="center">Memento-Skills: Let Agents Design Agents</h1>

<h3 align="center"><b>Deploy an agent. Let it learn, rewrite, and evolve its own skills.</b></h3>

<p align="center">
  <img src="https://img.shields.io/badge/Version-0.2.0-blue?style=for-the-badge" alt="Version 0.2.0">
  <img src="https://img.shields.io/badge/Python-3.12%2B-3776AB?logo=python&logoColor=white" alt="Python 3.12+">
  <img src="https://img.shields.io/badge/Skills-10%20built--in-0f766e" alt="10 built-in skills">
  <img src="https://img.shields.io/badge/Framework-Fully%20Self--Developed-b91c1c" alt="Fully self-developed framework">
  <img src="https://img.shields.io/badge/Self--Evolution-Reflection%20Loop-0284c7" alt="Reflection loop">
  <img src="https://img.shields.io/badge/Open--Source%20LLMs-Kimi%20%7C%20MiniMax%20%7C%20GLM-ca8a04" alt="Open-source LLM ecosystems">
  <img src="https://img.shields.io/badge/Interface-CLI%20%2B%20GUI-111827" alt="CLI and GUI">
  <img src="https://img.shields.io/badge/Execution-Local%20Sandbox-16a34a" alt="Local sandbox">
  <img src="https://img.shields.io/badge/IM-Feishu%20%7C%20DingTalk%20%7C%20WeCom%20%7C%20WeChat-2563eb" alt="IM platforms">
</p>

<p align="center">
  <a href="https://memento.run/"><img src="https://img.shields.io/badge/Memento-Homepage-ff6f00" alt="Memento Homepage"></a>
  <a href="https://skills.memento.run/"><img src="https://img.shields.io/badge/Memento--Skills-Project%20Site-0284c7" alt="Memento-Skills Project Site"></a>
  <a href="https://discord.com/invite/ztFS5YmB"><img src="https://img.shields.io/badge/Discord-Community-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center">
  <a href="#-whats-new-in-v020">What's New</a> ·
  <a href="#-learning-results">Learning Results</a> ·
  <a href="#-one-click-gui-install">Install</a> ·
  <a href="#-quick-start-developer">Quick Start</a> ·
  <a href="#what-is-memento-skills">What Is This</a> ·
  <a href="#what-makes-it-different">Why It Matters</a> ·
  <a href="#-memento-ecosystem">Ecosystem</a> ·
  <a href="#citation">Citation</a>
</p>

<p align="center">
  <a href="#what-is-memento-skills"><b>English</b></a> ·
  <a href="#chinese-summary"><b>中文摘要</b></a>
</p>

<table>
<tr><td>
<p align="center">
  <img src="Figures/figure4.png" width="100%" alt="Three paradigms of LLM adaptation">
</p>
<p align="center"><sub>The three paradigms of LLM adaptation. <b>Pre-training</b> and <b>fine-tuning</b> update the model parameters <i>θ</i> and require large data and compute budgets. <b>Deployment-time learning</b> (this work) keeps <i>θ</i> frozen and instead accumulates experience in an external skill memory <i>M</i>, enabling continual adaptation from live interactions at zero retraining cost.</sub></p>
</td></tr>
</table>

<table>
<tr><td>
<p align="center">
  <img src="Figures/figure2.jpg" width="100%" alt="Memento-Skills framework">
</p>
<p align="center"><sub>The architecture of the Self-Evolving Agent based on Read-Write Reflective Learning. When a user submits a task, the agent uses a skill router to either retrieve an executable skill from its skill library or generate a new one from scratch, which it then executes to solve the problem. Following execution, the system reflects on the outcome to write back to the library, either by increasing the skill's utility score if the action was successful, or by optimising its underlying skill folders if it failed. This continuous read-write loop enables the agent to progressively expand and refine its capabilities through continual learning, entirely without updating the underlying LLM parameters.</sub></p>
</td></tr>
</table>

---

## What's New in v0.2.0

> **v0.2.0** is a major architectural upgrade. The core agent, skill system, configuration layer, and deployment surfaces have all been redesigned or significantly extended compared to v0.1.0.

### Core Architecture

| Change | Description |
| --- | --- |
| **Bounded Context redesign** | The agent and skill modules have been restructured using a Bounded Context architecture, improving modularity and long-term maintainability. |
| **Execution phase refactoring** | The monolithic execution phase has been split into dedicated sub-modules (`runner`, `tool_handler`, `step_boundary`, `helpers`), enabling finer-grained control over multi-step reasoning. |
| **New Finalize phase** | A dedicated `finalize` phase has been added to the 4-stage pipeline for structured result summarisation. |
| **Protocol layer** | A new `core/protocol/` module defines communication protocols between system components. |
| **Tool Bridge system** | A new `tool_bridge/` layer (`runner`, `bridge`, `context`, `args_processor`, `result_processor`) provides cleaner tool invocation and result handling. |
| **Execution policies** | New policy modules (`tool_gate`, `path_validator`, `pre_execute`, `recovery`) add fine-grained safety and execution control. |
| **Error recovery and loop detection** | New `error_recovery.py` and `loop_detector.py` modules h

...(truncated)

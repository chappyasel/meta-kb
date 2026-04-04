---
url: 'https://github.com/Agent-on-the-Fly/Memento'
type: repo
author: Agent-on-the-Fly
date: '2026-03-31'
tags:
  - agent-memory
  - self-improving
  - agentic-skills
  - case-based-reasoning
  - memory-augmented-learning
  - continual-learning
  - trajectory-replay
  - MCP-tooling
key_insight: >-
  Memento decouples agent improvement from model weights by storing
  successful/failed trajectories as retrievable cases in a memory-augmented MDP,
  enabling continual learning and OOD generalization without fine-tuning. This
  inverts the typical RAG paradigm—instead of augmenting retrieval for
  inference, it augments the agent's decision-making loop itself with case-based
  reasoning as a learned policy.
stars: 2375
forks: 276
relevance_scores:
  topic_relevance: 8
  practitioner_value: 8
  novelty: 9
  signal_quality: 8
  composite: 8.1
  reason: >-
    Memento implements a genuinely novel self-improving agent loop—using
    case-based reasoning over stored trajectories as a learned policy to enable
    continual improvement without weight updates—which is highly transferable to
    agent memory and self-improving KB systems, with production-ready
    open-source code, benchmarks, and clear architecture.
---
## Memento

> Official Code of Memento: Fine-tuning LLM Agents without Fine-tuning LLMs

### Stats

| Metric | Value |
|--------|-------|
| Stars | 2,375 |
| Forks | 276 |
| Language | Python |
| License | MIT |
| Last Updated | 2026-03-31 |

### README (excerpt)

# Memento: Fine-tuning LLM Agents **without** Fine-tuning LLMs

> A memory-based, continual-learning framework that helps LLM agents improve from experience **without** updating model weights.

<p align="center">
  <b>Planner–Executor Architecture</b> • <b>Case-Based Reasoning</b> • <b>MCP Tooling</b> • <b>Memory-Augmented Learning</b>
</p>

---

<table>
  <tr>
    <td align="center" width="50%">
      <img src="Figure/f1_val_test.jpg" width="90%"/>
      <br/>
      <sub><b>Memento vs. Baselines on GAIA validation and test sets.</b></sub>
    </td>
    <td align="center" width="50%">
      <img src="Figure/f1_tasks.jpg" width="90%"/>
      <br/>
      <sub><b>Ablation study of Memento across benchmarks.</b></sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="Figure/f1_iteration.jpg" width="90%"/>
      <br/>
      <sub><b>Continual learning curves across memory designs.</b></sub>
    </td>
    <td align="center" width="50%">
      <img src="Figure/f1_ood.jpg" width="90%"/>
      <br/>
      <sub><b>Memento’s accuracy improvement on OOD datasets.</b></sub>
    </td>
  </tr>
</table>

## 📰 News
- [2025.10.05] We’re excited to announce that our parametric Case-Based Reasoning inference code is now officially open-sourced! 🎉
- [2025.09.05] We’ve added support to deploy a local LLM as the executor using vLLM, please see client/agent_local_server.py. 🎉
- [2025.09.03] We’ve set up a WeChat group to make it easier to collaborate and exchange ideas on this project. Welcome to join the Group to share your thoughts, ask questions, or contribute your ideas! 🔥 🔥 🔥 [Join our WeChat Group Now!](Figure/wechat.jpg)
- [2025.08.30] We’re excited to announce that our no-parametric Case-Based Reasoning inference code is now officially open-sourced! 🎉
- [2025.08.28] We’ve created a Discord server to make discussions and collaboration around this project easier. Feel free to join and share your thoughts, ask questions, or contribute ideas! 🔥 🔥 🔥 [Join our Discord!](https://discord.gg/y4FP2EDXyX)
- [2025.08.27] Thanks for your interest in our work! We’ll release our CBR code next week and our Parametric Memory code next month. We’ll keep updating on our further development.
- [2025.08.27] We add a new Crawler MCP in ```server/ai_crawler.py``` for web crawling and query-aware content compression to reduce token cost.
- [2025.08.26] We add the SerpAPI (https://serpapi.com/search-api) MCP tool to help you avoid using the search Docker and speed up development.

## 🔥 Key Features

- **No LLM weight updates.** Memento reframes continual learning as **memory-based online reinforcement learning** over a **memory-augmented MDP**. A neural **case-selection policy** guides actions; experiences are stored and reused via efficient Read/Write operations.
- **Two-stage planner–executor loop.** A CBR-driven **Planner** decomposes tasks and retrieves relevant cases; an **Executor** runs each subtask as an MCP client, orchestrating tools and writing back outcomes.
- **Comprehensive tool ecosystem.** Built-in support for web search, document processing, code execution, image/video analysis, and more through a unified MCP interface.
- **Strong benchmark performance.** Achieves competitive results across GAIA, DeepResearcher, SimpleQA, and HLE benchmarks.

---

## 🧠 Core Concept

**Learn from experiences, not gradients.** Memento logs successful & failed trajectories into a **Case Bank** and **retrieves by value** to steer planning and execution—enabling low-cost, transferable, and online continual learning.

---

## 🏗️ Architecture

### Core Components

- **Meta-Planner**: Breaks down high-level queries into executable subtasks using GPT-4.1
- **Executor**: Executes individual subtasks using o3 or other models via MCP tools
- **Case Memory**: Stores final-step tuples **(s_T, a_T, r_T)** for experience replay
- **MCP Tool Layer**: Unified interface for external tools and services

### Tool Ecosystem

- **Web Research**: Live search and controlled crawling via SearxNG
- **Document Processing**: Multi-format support (PDF, Office, images, audio, video)
- **Code Execution**: Sandboxed Python workspace with security controls
- **Data Analysis**: Excel processing, mathematical computations
- **Media Analysis**: Image captioning, video narration, audio transcription

---

## 🚀 Quick Start

### Prerequisites

- Python 3.11+
- OpenAI API key (or compatible API endpoint)
- SearxNG instance for web search
- FFmpeg (system-level binary required for video processing)
- PyTorch 2.0+ with CUDA support (for Parametric Memory)

📖 **For detailed installation instructions, see [INSTALL.md](INSTALL.md)**

### Installation

#### Method 1: Using uv (Recommended - Fast & Modern)

```bash
# Clone repository
git clone https://github.com/Agent-on-the-Fly/Memento
cd Memento

# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Sync dependencies and create virtual environment automatically
uv syn

...(truncated)

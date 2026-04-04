---
url: 'https://github.com/aiming-lab/SimpleMem'
type: repo
author: aiming-lab
date: '2026-04-03'
tags:
  - agent-memory
  - context-engineering
  - semantic-compression
  - multimodal-memory
  - mcp-integration
  - lifelong-learning
  - lossless-compression
  - context-window-optimization
key_insight: >-
  SimpleMem's semantic lossless compression approach to lifelong memory enables
  agents to maintain long-term context without exponential token bloat—critical
  for multi-session agent continuity where naive memory append strategies
  quickly exhaust context windows. The multimodal support bridges a gap in
  existing memory systems by treating text, images, audio, and video as
  semantically comparable entities within a unified compression framework.
stars: 3156
forks: 303
relevance_scores:
  topic_relevance: 8
  practitioner_value: 8
  novelty: 7
  signal_quality: 7
  composite: 7.7
  reason: >-
    SimpleMem is a production-ready Python library for lifelong agent memory
    with semantic lossless compression and MCP integration, directly addressing
    topics 2 (agent memory) and 3 (context engineering/compression), with
    meaningful novelty in its unified multimodal compression approach and strong
    practitioner value given PyPI availability and multi-platform support.
---
## SimpleMem

> SimpleMem: Efficient Lifelong Memory for LLM Agents — Text & Multimodal

### Stats

| Metric | Value |
|--------|-------|
| Stars | 3,156 |
| Forks | 303 |
| Language | Python |
| License | MIT |
| Last Updated | 2026-04-03 |

**Topics:** agent, audio, compression, knowledge-graph, lifelong-memory, llm, mcp, memory, multimodal, python, rag, retrieval, semantic-search, simplemem, video, vision

### README (excerpt)

<div align="center">

<img alt="simplemem_logo" src="https://github.com/user-attachments/assets/6ea54ad1-e007-442c-99d7-1174b10d1fec" width="450">

<div align="center">

## Efficient Lifelong Memory for LLM Agents — Text & Multimodal

<small>Store, compress, and retrieve long-term memories with semantic lossless compression. Now with multimodal support for text, image, audio & video. Works across Claude, Cursor, LM Studio, and more.</small>

</div>

<p><b>Works with any AI platform that supports MCP or Python integration</b></p>

<table>
<tr>

<td align="center" width="100">
  <a href="https://www.anthropic.com/claude">
    <img src="https://cdn.simpleicons.org/claude/D97757" width="48" height="48" alt="Claude Desktop" />
  </a><br/>
  <sub>
    <a href="https://www.anthropic.com/claude"><b>Claude Desktop</b></a>
  </sub>
</td>

<td align="center" width="100">
  <a href="https://cursor.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://cdn.simpleicons.org/cursor/FFFFFF">
      <img src="https://cdn.simpleicons.org/cursor/000000" width="48" height="48" alt="Cursor" />
    </picture>
  </a><br/>
  <sub>
    <a href="https://cursor.com"><b>Cursor</b></a>
  </sub>
</td>

<td align="center" width="100">
  <a href="https://lmstudio.ai">
    <img src="https://github.com/lmstudio-ai.png?size=200" width="48" height="48" alt="LM Studio" />
  </a><br/>
  <sub>
    <a href="https://lmstudio.ai"><b>LM Studio</b></a>
  </sub>
</td>

<td align="center" width="100">
  <a href="https://cherry-ai.com">
    <img src="https://github.com/CherryHQ.png?size=200" width="48" height="48" alt="Cherry Studio" />
  </a><br/>
  <sub>
    <a href="https://cherry-ai.com"><b>Cherry Studio</b></a>
  </sub>
</td>

<td align="center" width="100">
  <a href="https://pypi.org/project/simplemem/">
    <img src="https://cdn.simpleicons.org/pypi/3775A9" width="48" height="48" alt="PyPI" />
  </a><br/>
  <sub>
    <a href="https://pypi.org/project/simplemem/"><b>PyPI Package</b></a>
  </sub>
</td>

<td align="center" width="100">
  <sub><b>+ Any MCP<br/>Client</b></sub>
</td>

</tr>
</table>

<div align="center">

<br/>

[🇨🇳 中文](./docs/i18n/README.zh-CN.md) •
[🇯🇵 日本語](./docs/i18n/README.ja.md) •
[🇰🇷 한국어](./docs/i18n/README.ko.md) •
[🇪🇸 Español](./docs/i18n/README.es.md) •
[🇫🇷 Français](./docs/i18n/README.fr.md) •
[🇩🇪 Deutsch](./docs/i18n/README.de.md) •
[🇧🇷 Português](./docs/i18n/README.pt-br.md)<br/>
[🇷🇺 Русский](./docs/i18n/README.ru.md) •
[🇸🇦 العربية](./docs/i18n/README.ar.md) •
[🇮🇹 Italiano](./docs/i18n/README.it.md) •
[🇻🇳 Tiếng Việt](./docs/i18n/README.vi.md) •
[🇹🇷 Türkçe](./docs/i18n/README.tr.md)

<br/>

[![Project Page](https://img.shields.io/badge/🎬_INTERACTIVE_DEMO-Visit_Our_Website-FF6B6B?style=for-the-badge&labelColor=FF6B6B&color=4ECDC4&logoColor=white)](https://aiming-lab.github.io/SimpleMem-Page)

<p align="center">
  <a href="https://arxiv.org/abs/2601.02553"><img src="https://img.shields.io/badge/arXiv-2601.02553-b31b1b?style=flat&labelColor=555" alt="arXiv"></a>
  <a href="https://github.com/aiming-lab/SimpleMem"><img src="https://img.shields.io/badge/github-SimpleMem-181717?style=flat&labelColor=555&logo=github&logoColor=white" alt="GitHub"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/aiming-lab/SimpleMem?style=flat&label=license&labelColor=555&color=2EA44F" alt="License"></a>
  <a href="https://github.com/aiming-lab/SimpleMem/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat&labelColor=555" alt="PRs Welcome"></a>
  <br/>
  <a href="https://pypi.org/project/simplemem/"><img src="https://img.shields.io/pypi/v/simplemem?style=flat&label=pypi&labelColor=555&color=3775A9&logo=pypi&logoColor=white" alt="PyPI"></a>
  <a href="https://pypi.org/project/simplemem/"><img src="https://img.shields.io/pypi/pyversions/simplemem?style=flat&label=python&labelColor=555&color=3775A9&logo=python&logoColor=white" alt="Python"></a>
  <a href="https://mcp.simplemem.cloud"><img src="https://img.shields.io/badge/MCP-mcp.simplemem.cloud-14B8A6?style=flat&labelColor=555" alt="MCP Server"></a>
  <a href="https://github.com/aiming-lab/SimpleMem"><img src="https://img.shields.io/badge/Claude_Skills-supported-FFB000?style=flat&labelColor=555" alt="Claude Skills"></a>
  <br/>
  <a href="https://discord.gg/KA2zC32M"><img src="https://img.shields.io/badge/Discord-Join_Chat-5865F2?style=flat&labelColor=555&logo=discord&logoColor=white" alt="Discord"></a>
  <a href="fig/wechat_logo3.JPG"><img src="https://img.shields.io/badge/WeChat-Group-07C160?style=flat&labelColor=555&logo=wechat&logoColor=white" alt="WeChat"></a>
</p>

<br/>

[Overview](#-overview) • [Quick Start](#-quick-start) • [Docker](#-run-with-docker) • [Omni-SimpleMem](#-omni-simplemem-multimodal-memory) • [Cross-Session Memory](#-cross-session-memory) • [MCP Server](#-mcp-server) • [Evaluation](#-evaluation) • [Citation](#-citation)

</div>

</div>

<br/>

## 🔥 News

- **[04/02/2026

...(truncated)

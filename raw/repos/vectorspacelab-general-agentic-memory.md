---
url: 'https://github.com/VectorSpaceLab/general-agentic-memory'
type: repo
author: VectorSpaceLab
date: '2026-04-03'
tags:
  - agent-memory
  - agentic-skills
  - context-engineering
  - hierarchical-memory
  - semantic-chunking
  - long-horizon-trajectories
  - multi-modal-memory
  - episodic-memory
  - memory-compression
  - agent-file-system
key_insight: >-
  GAM addresses the critical challenge of managing long-context agent operations
  by combining intelligent semantic chunking with hierarchical memory
  organization, enabling agents to maintain structured, queryable context across
  extended trajectories without rebuilding entire memory systems. This modular
  approach to incremental memory generation is particularly valuable for agents
  that accumulate knowledge over time while staying within practical context
  windows.
stars: 838
forks: 85
relevance_scores:
  topic_relevance: 8
  practitioner_value: 8
  novelty: 7
  signal_quality: 8
  composite: 7.9
  reason: >-
    GAM is a directly relevant agent memory system with hierarchical
    organization, semantic chunking, and incremental memory generation for
    long-context agents, featuring a production-ready Python SDK, CLI, and REST
    API with clear documentation—though the video memory component is out of
    scope, the core agentic memory architecture is highly applicable.
---
## general-agentic-memory

> A general memory system for agents, powered by deep-research

### Stats

| Metric | Value |
|--------|-------|
| Stars | 838 |
| Forks | 85 |
| Language | Python |
| Last Updated | 2026-04-03 |

### README (excerpt)

# GAM (General Agentic Memory via Deep Research in An Agent File System)

English | [中文版](README_zh.md)

A highly modular agentic file system framework that provides structured memory and operating environments for Large Language Models (LLMs). GAM supports both **text** and **video** modalities, offering four access levels: **Python SDK**, **CLI**, **REST API**, and **Web Platform**.

## Features

### 1. Core Features
* 📝 **Intelligent Chunking**: LLM-based text segmentation that automatically identifies semantic boundaries.
* 🧠 **Memory Generation**: Generates structured memory summaries (Memory + TLDR) for each text chunk.
* 📂 **Hierarchical Organization**: Automatically organizes memories into a hierarchical directory structure (Taxonomy).
* ➕ **Incremental Addition**: Append new content to existing GAMs without rebuilding.
* 🐳 **Multi-environment Support**: Supports both local file systems and Docker container workspaces.
* 🔌 **Flexible LLM Backends**: Compatible with OpenAI, SGLang, and other inference engines.

### 2. Supported Tasks
* 📄 **Long Text**: Hierarchical memory organization and exploratory QA for long documents.
* 🎥 **Long Video**: Automated detection, segmentation, and description for building long video memory.
* 🎞️ **Long-horizon (Agent Trajectory)**: Efficient compression and organization of long-sequence agent trajectories (e.g., complex reasoning steps, tool invocation logs), enabling agents to manage context across extensive operations.

### 3. Implementation Methods
* 🐍 **Python SDK**: High-level Python SDK for easy integration into agentic workflows.
* 💻 **CLI Tools**: Unified `gam-add` and `gam-request` commands for command-line interaction.
* 🚀 **REST API**: High-performance RESTful API (FastAPI + Uvicorn) with auto-generated OpenAPI docs, request validation, and CORS support.
* 🌐 **Web Platform**: Flask-based visualization and management interface.

## Quick Start

### Installation

```bash
# Full installation with all features
pip install -e ".[all]"
```

### Usage Overview

GAM can be used through the Python SDK, CLI, REST API, or Web interface.

#### 1. Python SDK (Workflow API)
```python
from gam import Workflow
wf = Workflow("text", gam_dir="./my_gam", model="gpt-4o-mini", api_key="sk-xxx")
wf.add(input_file="paper.pdf")
result = wf.request("What is the main conclusion?")
print(result.answer)
```

#### 2. CLI Tools
```bash
# Add content
gam-add --type text --gam-dir ./my_gam --input paper.pdf
# Query content
gam-request --type text --gam-dir ./my_gam --question "What is the main conclusion?"
```

#### 3. REST API
```bash
# Start REST API server (FastAPI + Uvicorn)
python examples/run_api.py --port 5001
# Interactive docs available at http://localhost:5001/docs
# See usage example
python examples/rest_api_client.py
```

#### 4. Web Interface
```bash
python examples/run_web.py --model gpt-4o-mini --api-key sk-xxx
```

### Configuration

Set up environment variables to avoid repeated parameter input. GAM Agent (memory building) and Chat Agent (Q&A) can be configured independently:

```bash
# GAM Agent (memory building)
export GAM_API_KEY="sk-your-api-key"
export GAM_MODEL="gpt-4o-mini"
export GAM_API_BASE="https://api.openai.com/v1"

# Chat Agent (Q&A) — falls back to GAM Agent config when not set
export GAM_CHAT_API_KEY="sk-your-chat-api-key"
export GAM_CHAT_MODEL="gpt-4o"
export GAM_CHAT_API_BASE="https://api.openai.com/v1"
```

## Documentation

Detailed usage instructions for each component can be found in the following guides:

* 🐍 **[Python SDK Usage](./examples/docs/sdk_usage.md)**: `Workflow` API and advanced component usage.
* 💻 **[CLI Usage Guide](./examples/docs/cli_usage.md)**: Detailed `gam-add` and `gam-request` commands.
* 🚀 **[REST API Usage](./examples/docs/rest_api_usage.md)**: RESTful API access and programmatic integration.
* 🌐 **[Web Usage Guide](./examples/docs/web_usage.md)**: Setting up and running the visual management platform.

## Examples

Check the [`examples/`](./examples/) directory for sample projects and usage guides:

| Example | Description |
|---|---|
| [`long_text/`](./examples/long_text/) | Text GAM building and QA. |
| [`long_video/`](./examples/long_video/) | Video GAM building and QA. |
| [`long_horizon/`](./examples/long_horizon/) | Long-horizon agent trajectory compression with search/memorize/recall. |

## Research

The [`research/`](./research/) directory contains the original research codebase for the [GAM paper](https://arxiv.org/abs/2511.18423), including benchmark evaluation scripts (LoCoMo, HotpotQA, RULER, NarrativeQA) and the dual-agent (Memorizer + Researcher) implementation:

```bash
cd research
pip install -e .
```

```python
from gam_research import MemoryAgent, ResearchAgent
```

For more details, see the [Research README](./research/README.md).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

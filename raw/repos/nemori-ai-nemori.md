---
url: 'https://github.com/nemori-ai/nemori'
type: repo
author: nemori-ai
date: '2026-04-03'
tags:
  - agent-memory
  - episodic-memory
  - event-segmentation
  - self-improving
  - rag-alternative
  - predict-calibrate-loops
  - semantic-knowledge-distillation
  - conversational-agents
key_insight: >-
  By aligning AI memory segmentation with human episodic memory boundaries
  (through LLM-powered event detection rather than arbitrary time windows),
  Nemori achieves competitive performance with simpler methods—the architectural
  insight that memory granularity matters more than complexity for agentic
  systems.
stars: 187
forks: 16
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 8
  signal_quality: 8
  composite: 8.4
  reason: >-
    Nemori directly addresses agent episodic memory with a novel LLM-powered
    boundary detection approach grounded in Event Segmentation Theory, backed by
    a paper, production-ready implementation with PostgreSQL+Qdrant, and clear
    architectural insight about memory granularity over complexity.
language: Python
license: MIT
---
## nemori

> A minimalist MVP demonstrating a simple yet profound insight: aligning AI memory with human episodic memory granularity. Shows how this single principle enables simple methods to rival complex memory frameworks for conversational tasks.

### Stats

| Metric | Value |
|--------|-------|
| Stars | 187 |
| Forks | 16 |
| Language | Python |
| License | MIT |
| Last Updated | 2026-04-03 |

**Topics:** ai-agents, ai-memory, context-engineering, episodic-memory, locomo, memory-system

### README (excerpt)

# Nemori Memory System

**📄 [Paper](https://arxiv.org/abs/2508.03341)**

> Important: This release is a complete rewrite aligned with the paper and is not compatible with the previous MVP. The legacy MVP is available here: [legacy-mvp branch](https://github.com/nemori-ai/nemori/tree/legacy-mvp)

<img src="assets/nemori.png" alt="Nemori logo" width="84" margin="8px" align="left">

Nemori is a self-organising long-term memory substrate for agentic LLM workflows. It ingests multi-turn conversations, segments them into topic-consistent episodes, distils durable semantic knowledge, and exposes a unified search surface for downstream reasoning. The implementation combines insights from Event Segmentation Theory and Predictive Processing with production-ready concurrency, caching, and pluggable storage.

<br clear="left">

- **🐍 Language:** Python 3.10+
- **📜 License:** MIT
- **📦 Key dependencies:** asyncpg, Qdrant, OpenAI SDK, Pillow

---

## 1. ❓ Why Nemori

Large language models rapidly forget long-horizon context. Nemori counters this with two coupled control loops:

1. **🔄 Two-Step Alignment**
   - *🎯 Boundary Alignment* – LLM-powered boundary detection with transitional masking heuristics keeps episodes semantically coherent.
   - *📝 Representation Alignment* – the episode generator converts each segment into rich narratives with precise temporal anchors and provenance.
2. **🔮 Predict–Calibrate Learning**
   - *💭 Predict* – hypothesise new episodes from existing semantic knowledge to surface gaps early.
   - *🎯 Calibrate* – extract high-value facts from discrepancies and fold them into the semantic knowledge base.

The result is a compact, queryable memory fabric that stays faithful to the source dialogue while remaining efficient to traverse.

---

## 2. 🚀 Quick Start

### 2.1 🐳 Infrastructure (Docker Compose)

Nemori uses PostgreSQL for metadata and text search, and Qdrant for vector storage. Start both with a single command:

```bash
docker compose up -d
```

This launches PostgreSQL 16 (port 5432) and Qdrant (ports 6333/6334) with persistent volumes.

### 2.2 📥 Install Nemori

Using [uv](https://github.com/astral-sh/uv) is the easiest way to manage the environment:

```bash
brew install uv                # or curl -LsSf https://astral.sh/uv/install.sh | sh

git clone https://github.com/nemori-ai/nemori.git
cd nemori

uv venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

uv sync
```

Alternatively, install in editable mode:

```bash
pip install -e .
```

### 2.3 🔑 Credentials

Create a `.env` file in the repo root:

```bash
# OpenRouter (recommended — single key for both LLM and embeddings)
LLM_API_KEY=sk-or-...
LLM_BASE_URL=https://openrouter.ai/api/v1
EMBEDDING_API_KEY=sk-or-...
EMBEDDING_BASE_URL=https://openrouter.ai/api/v1

# Or use direct OpenAI
# LLM_API_KEY=sk-...
# EMBEDDING_API_KEY=sk-...
```

Nemori only reads these variables; it never writes secrets to disk. 🔒

### 2.4 💡 Minimal usage

```python
import asyncio
from nemori import NemoriMemory, MemoryConfig

async def main():
    # DSN, API keys, and base URLs are resolved from environment variables.
    # Only model names need to be specified explicitly.
    config = MemoryConfig(
        llm_model="openai/gpt-4.1-mini",
        embedding_model="google/gemini-embedding-001",
    )
    async with NemoriMemory(config) as memory:
        await memory.add_messages("user123", [
            {"role": "user", "content": "I started training for a marathon in Seattle."},
            {"role": "assistant", "content": "Great! When is the race?"},
            {"role": "user", "content": "It is in October."},
        ])
        await memory.flush("user123")
        results = await memory.search("user123", "marathon training")
        print(results)

asyncio.run(main())
```

---

## 3. 🏗️ System Architecture

![Nemori system architecture](assets/nemori_system.png)

Nemori uses a **dual-backend** storage architecture:
- **PostgreSQL** – metadata, text search (tsvector/GIN indexes), and message buffering.
- **Qdrant** – all vector storage and similarity search with automatic embedding dimension adaptation.

Both backends are fully async via `asyncpg` and the Qdrant gRPC client.

---

## 4. 📂 Repository Layout

```
nemori/
├── api/            # Async facade (NemoriMemory)
├── core/           # MemorySystem orchestrator
├── db/             # PostgreSQL stores + Qdrant vector store
├── domain/         # Models, interfaces, exceptions
├── llm/            # LLM client, orchestrator, generators
├── search/         # Unified search (vector + text + hybrid)
├── services/       # Embedding client, event bus
└── utils/          # Image compression utilities

evaluation/
├── locomo/         # LoCoMo benchmark scripts
├── longmemeval/    # Long-context evaluation suite
└── readme.md       # Dataset instructions

docker/
└── init-extensions.sql   # PostgreSQL extension setup
```

---

## 5. 📊 Running Evaluations

### 5.1 🔧 LoCoMo pipel

...(truncated)

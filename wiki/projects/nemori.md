# Nemori

> A self-organizing long-term memory substrate for agentic LLM workflows that aligns AI memory segmentation with human episodic memory boundaries using LLM-powered event detection, achieving competitive performance with simpler methods than complex memory frameworks.

## What It Does

Nemori ingests multi-turn conversations, segments them into topic-consistent episodes using Event Segmentation Theory, distils durable semantic knowledge from those episodes, and exposes a unified search surface for downstream reasoning. It operates through two coupled control loops: (1) a two-step alignment process that uses LLM-powered boundary detection with transitional masking heuristics to keep episodes semantically coherent, then converts segments into rich narratives with temporal anchors; and (2) a predict-calibrate learning cycle that hypothesises new episodes from existing semantic knowledge to surface gaps, then extracts high-value facts from discrepancies and folds them back in.

## Architecture

Nemori uses a dual-backend storage architecture:

- **PostgreSQL** for metadata, text search (tsvector/GIN indexes), and message buffering
- **Qdrant** for all vector storage and similarity search with automatic embedding dimension adaptation

Both backends are fully async via `asyncpg` and the Qdrant gRPC client. The system provides an async facade (`NemoriMemory`) that wraps a `MemorySystem` orchestrator, LLM client/generators, embedding services, and unified search (vector + text + hybrid).

```
nemori/
  api/       # Async facade (NemoriMemory)
  core/      # MemorySystem orchestrator
  db/        # PostgreSQL stores + Qdrant vector store
  domain/    # Models, interfaces, exceptions
  llm/       # LLM client, orchestrator, generators
  search/    # Unified search (vector + text + hybrid)
  services/  # Embedding client, event bus
```

## Key Numbers

- 187 GitHub stars, 16 forks
- Python 3.10+, MIT license
- Benchmarked against LoCoMo dataset
- Backed by an arxiv paper (2508.03341)
- Supports OpenRouter and direct OpenAI inference

## Strengths

- The insight that memory granularity matters more than complexity is well-supported by cognitive science (Event Segmentation Theory), and the predict-calibrate loop actively surfaces knowledge gaps rather than passively waiting for retrieval failures
- Production-ready with Docker Compose infrastructure, pluggable storage, and a clean async Python API

## Limitations

- Requires running PostgreSQL and Qdrant infrastructure, making it heavier to deploy than file-based memory systems
- The complete rewrite from the legacy MVP means the ecosystem is still maturing, and community adoption is early-stage

## Alternatives

- [hipocampus.md](hipocampus.md) -- use when you want zero-infrastructure file-based memory with a compaction tree and topic index
- [mem0.md](mem0.md) -- use when you want a managed memory service with explicit add/search control
- [memorilabs-memori.md](memorilabs-memori.md) -- use when you need transparent LLM client wrapping with SQL-native storage

## Sources

- [nemori-ai-nemori.md](../../raw/repos/nemori-ai-nemori.md) -- "A self-organising long-term memory substrate for agentic LLM workflows... combines insights from Event Segmentation Theory and Predictive Processing with production-ready concurrency, caching, and pluggable storage"

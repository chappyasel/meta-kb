# Graphiti

> Temporal context graph engine by Zep that tracks how facts change over time with explicit validity windows and episode provenance, purpose-built for agents operating on evolving real-world data rather than static document chunks.

## What It Does

Graphiti builds and queries knowledge graphs where every fact (edge) has a temporal validity window: when it became true and when it was superseded. Entities (nodes) carry evolving summaries. Everything traces back to episodes -- the raw data that produced the derived facts. This means you can query what is true now, what was true at any point in the past, and why a fact changed. Supports both prescribed ontology (define entity/edge types via Pydantic models) and learned ontology (let structure emerge from data). Retrieval combines semantic embeddings, BM25 keyword search, and graph traversal for sub-second queries.

## Architecture

Python library (`graphiti-core`) with pluggable graph database backends: Neo4j, FalkorDB, Kuzu, and Amazon Neptune. LLM inference defaults to OpenAI but supports Anthropic, Google Gemini, Groq, Azure OpenAI, and local models via Ollama. Incremental graph construction -- new episodes integrate immediately without batch recomputation. Includes an MCP server for integration with Claude, Cursor, and other MCP clients. Also ships a FastAPI REST server. Concurrency controlled via `SEMAPHORE_LIMIT` to manage LLM rate limits. The commercial version (Zep) adds managed infrastructure, per-user context graphs at scale, and sub-200ms retrieval.

## Key Numbers

- 24,473 GitHub stars, 2,433 forks
- 94.8% accuracy on Deep Memory Retrieval benchmark (vs 93.4% for MemGPT)
- Up to 18.5% accuracy improvement on LongMemEval benchmark
- 90% latency reduction vs baseline implementations
- arXiv paper: 2501.13956
- Apache-2.0 license

## Strengths

- Temporal fact management with validity windows solves the critical problem that standard RAG returns stale information without tracking when facts changed
- Episode provenance provides full lineage from derived facts back to source data, enabling auditability
- Hybrid retrieval (semantic + keyword + graph traversal) outperforms single-mode retrieval on precision
- Multiple graph database backends give deployment flexibility from embedded (Kuzu) to enterprise (Neptune)

## Limitations

- Requires a graph database dependency (Neo4j, FalkorDB, Kuzu, or Neptune) -- heavier infrastructure than vector-only approaches
- Ingestion is LLM-intensive; entity extraction and fact resolution consume significant tokens per episode
- Works best with LLM services supporting Structured Output (OpenAI, Gemini); other providers may produce schema errors during ingestion

## Alternatives

- [Mem0](mem0.md) -- use when you want a simpler vector-based memory layer without graph infrastructure
- [Letta](letta.md) -- use when you want agent-managed memory blocks rather than an external knowledge graph
- [Cognee](cognee.md) -- use when you want combined vector + graph search with multimodal ingestion and a simpler setup

## Sources

- [getzep/graphiti](../../raw/repos/getzep-graphiti.md) -- "Graphiti's context graphs track how facts change over time, maintain provenance to source data, and support both prescribed and learned ontology"
- [Rasmussen et al., Zep: A Temporal Knowledge Graph Architecture for Agent Memory](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) -- "Zep demonstrates superior performance (94.8% vs 93.4%) ... accuracy improvements of up to 18.5% while simultaneously reducing response latency by 90%"

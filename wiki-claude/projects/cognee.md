# Cognee

> Open-source knowledge engine that combines vector search with graph databases and continuous learning to build dynamically evolving AI agent memory, set up in 6 lines of Python code.

## What It Does

Cognee ingests data in any format (text, documents, multimodal), builds a knowledge graph with vector embeddings, and provides combined vector + graph retrieval. The system continuously learns: as new data is ingested, relationships evolve and the graph updates. Three core API calls: `cognee.add()` to ingest data, `cognee.cognify()` to process it into the knowledge engine, and `cognee.search()` to query. Supports use cases from customer support agents (tracking interaction history and resolution patterns) to expert knowledge distillation (reusing senior engineers' SQL patterns for junior analysts). Available as a Python SDK, CLI, and managed cloud service.

## Architecture

Python SDK with pluggable backends for both vector storage and graph databases. Combines vector search (semantic similarity) with graph-based retrieval (relationship traversal) so queries are grounded in both meaning and structure. Supports multiple graph databases including Neo4j. Multimodal ingestion handles text, documents, and other formats through a unified pipeline. Deployable via multiple platforms: Modal (serverless), Railway (PaaS), Fly.io (edge), Render (managed Postgres), Daytona (cloud sandboxes), or self-hosted. Also available as an OpenClaw plugin (`@cognee/cognee-openclaw`). The architecture emphasizes ontology grounding and cross-agent knowledge sharing with user/tenant isolation for multi-tenant deployments.

## Key Numbers

- 14,899 GitHub stars, 1,507 forks
- 6 lines of code for basic setup
- Python 3.10 to 3.13 support
- Multiple deployment targets (Modal, Railway, Fly.io, Render, Daytona)
- arXiv paper on optimizing knowledge graph interfaces for LLM reasoning (2505.24478)
- Apache-2.0 license

## Strengths

- Combined vector + graph retrieval surfaces results by both semantic similarity and relationship structure, outperforming either approach alone
- Continuous learning means the knowledge graph evolves as new data arrives rather than requiring batch recomputation
- Minimal API surface (3 calls) with 6-line quickstart dramatically lowers adoption friction
- Multi-tenant isolation with OTEL collector and audit traits addresses enterprise requirements that most open-source memory systems ignore

## Limitations

- Younger ecosystem than Mem0 or Graphiti; fewer integrations and less battle-tested in large-scale production deployments
- No explicit temporal fact management (validity windows, fact invalidation) like Graphiti provides
- Graph relationship quality depends on the underlying LLM's extraction capabilities

## Alternatives

- [Graphiti](graphiti.md) -- use when you need explicit temporal reasoning with validity windows and episode provenance
- [Mem0](mem0.md) -- use when you want a simpler vector-only memory layer with multi-level abstraction (user/session/agent)
- [Letta](letta.md) -- use when you want agents to directly manage their own memory blocks

## Sources

- [topoteretes/cognee](../../raw/repos/topoteretes-cognee.md) -- "Cognee is an open-source knowledge engine that lets you ingest data in any format or structure and continuously learns to provide the right context for AI agents"

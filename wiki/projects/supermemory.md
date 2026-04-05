---
entity_id: supermemory
type: project
bucket: agent-memory
sources:
  - repos/supermemoryai-supermemory.md
  - repos/thedotmack-claude-mem.md
related:
  - Retrieval-Augmented Generation
  - Agent Memory
last_compiled: '2026-04-04T21:18:45.992Z'
---
# Supermemory

> A personal memory layer service and API that aggregates, extracts, and makes searchable information from various sources for AI assistants.

[Source](../../raw/repos/supermemoryai-supermemory.md)

---

## What It Does

Supermemory positions itself as a "Memory API for the AI era" — a hosted or self-hosted service that ingests content from disparate sources, extracts structured facts, and exposes a unified search/retrieval interface for AI assistants and agents. The goal is to give LLM-powered tools a persistent, evolving knowledge base rather than stateless per-session context.

Core capabilities include automatic fact extraction from ingested content, semantic search over stored memories, contradiction detection, and temporal reasoning over facts (tracking when things change or become stale).

---

## Key Numbers

| Metric | Value |
|--------|-------|
| GitHub Stars | ~21,000 |
| Forks | ~1,900 |
| Language | TypeScript |
| License | MIT |

---

## Architecture

Built on a Cloudflare-native stack: Workers for compute, KV for fast reads, Pages for the web frontend. Persistence uses Postgres via Drizzle ORM. The frontend is Remix + Tailwind + Vite. This architecture prioritizes low-latency retrieval at the edge, though it also means Cloudflare vendor coupling for self-hosted deployments.

The memory model emphasizes a **unified memory ontology** — memories aren't just raw text chunks but structured facts with metadata, timestamps, and conflict tracking. This is the key architectural differentiator from naive RAG pipelines.

---

## What's Unique

Most RAG systems treat memory as a static document store: embed text, index it, retrieve by similarity. Supermemory attempts to address three gaps that basic RAG ignores:

1. **Temporal reasoning** — facts have timestamps; stale data can be flagged or evicted
2. **Contradiction handling** — when new information conflicts with stored facts, the system can surface or resolve conflicts rather than silently returning outdated data
3. **Automatic forgetting** — active curation rather than unbounded accumulation

This positions it closer to an [agent memory](../concepts/agent-memory.md) substrate than a simple vector store wrapper.

---

## Strengths

- High community traction (~21K stars) suggests real adoption beyond toy demos
- MIT license enables commercial self-hosting
- Edge-native architecture should deliver genuinely low retrieval latency
- Addresses the temporal/contradiction gaps that most RAG stacks ignore entirely
- Usable as both an API service and a self-hosted deployment

---

## Limitations

- **Cloudflare lock-in** for self-hosted deployments; the KV/Workers architecture isn't easily portable to other clouds
- Fact extraction quality is unproven at scale — automatic structured extraction from arbitrary user content is a hard problem
- Temporal and contradiction handling are architectural claims; real-world robustness in production depends on implementation quality that's hard to assess from the outside
- As a relatively young project, the ontology and API surface may be unstable

---

## Alternatives

| Project | Approach |
|---------|----------|
| [Mem0](../projects/mem0.md) | Python-first memory layer with graph + vector hybrid |
| Letta (MemGPT) | Full agent framework with explicit memory management |
| Raw vector DBs (Pinecone, Weaviate) | DIY retrieval without the memory-management layer |
| claude-mem | Session-scoped compression/reinject, not persistent structured memory |

---

## Practical Implications

Supermemory makes most sense for builders who want a **persistent, queryable memory layer across sessions** without building their own fact-extraction and conflict-resolution logic. The alternative is either a naive RAG setup (fast but stateless and stale-prone) or a full agent framework (more overhead). The hosted API lowers the integration bar significantly, but production users should evaluate whether the Cloudflare stack fits their infrastructure and whether the fact extraction quality meets their accuracy requirements before committing.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.4)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.8)

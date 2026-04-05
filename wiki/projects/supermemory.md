---
entity_id: supermemory
type: project
bucket: agent-memory
sources:
  - repos/supermemoryai-supermemory.md
  - repos/thedotmack-claude-mem.md
  - repos/caviraoss-openmemory.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/caviraoss-openmemory.md
related: []
last_compiled: '2026-04-05T05:28:23.368Z'
---
# Supermemory

**Type:** Project | **Category:** Agent Memory | **Language:** TypeScript | **License:** MIT

[Source](../../raw/repos/supermemoryai-supermemory.md)

---

## What It Does

Supermemory provides a managed memory and context layer for AI agents. Where a standard RAG system retrieves document chunks, Supermemory tracks *facts about users* over time, handling temporal changes ("I moved from NYC to SF"), contradiction resolution, and automatic expiration of time-bound information ("I have an exam tomorrow"). The unified API covers memory extraction, user profile maintenance, hybrid search, file ingestion, and external data connectors in one service.

The target audience splits into two groups: developers building agents or apps who want memory without configuring vector databases or embedding pipelines, and end users who want persistent memory across Claude, Cursor, Windsurf, or other MCP-compatible tools.

---

## Core Mechanism

Supermemory's central design choice is a **unified memory ontology** that sits above both RAG retrieval and episodic memory. When content arrives via `client.add()`, the engine extracts discrete facts rather than storing raw text chunks. Each fact carries temporal metadata, allowing the system to close out superseded facts when contradictions appear.

**User profiles** split into two layers: `profile.static` (stable long-term facts like "senior engineer at Acme") and `profile.dynamic` (recent activity, active problems). The `client.profile()` call returns both plus optional search results in a single round trip, targeting ~50ms response time. This lets you inject full user context into a system prompt without a separate retrieval step.

**Hybrid search** (`searchMode: "hybrid"`) runs RAG document retrieval and memory search in parallel, merging results ranked by relevance. The alternative `"memories"` mode returns only fact-level personalized context.

**Automatic forgetting** removes the need for manual TTL management. The system treats time-bound facts differently from stable facts and expires them after the relevant date passes.

The infrastructure runs on Cloudflare Workers, Cloudflare KV, Cloudflare Pages, and Postgres via Drizzle ORM. This is a fully managed, cloud-hosted service — not self-hosted by default.

**Connectors** (Google Drive, Gmail, Notion, OneDrive, GitHub) sync external data with real-time webhooks. File processing handles PDFs (extraction), images (OCR), videos (transcription), and code (AST-aware chunking).

The MCP server exposes three tools: `memory` (save/forget), `recall` (search with profile), and `context` (inject full profile at session start).

---

## Key Numbers

| Metric | Value | Notes |
|---|---|---|
| GitHub Stars | ~21,000 | Self-reported |
| LongMemEval | 81.6% (#1) | Self-reported; benchmark is open-source and reproducible |
| LoCoMo | #1 | Self-reported |
| ConvoMem | #1 | Self-reported |
| Profile API latency | ~50ms | Self-reported |

The benchmark claims are notable because Supermemory also publishes **MemoryBench**, an open-source framework that runs the same evaluations against Mem0, Zep, and others. This makes the #1 claims more credible than typical self-reported numbers, but independent third-party validation of the 81.6% LongMemEval figure is not publicly available.

---

## Strengths

**Temporal reasoning at the data model level.** Most memory systems store chunks and let retrieval handle staleness implicitly. Supermemory models fact lifecycle explicitly — when a fact is superseded, the old version is closed, not overwritten or duplicated. This matters for agents tracking changing user state.

**Zero infrastructure setup for developers.** No vector database configuration, no embedding pipeline, no chunking decisions. The API abstracts all of it. For teams that want memory without becoming experts in retrieval infrastructure, this is the primary advantage.

**Broad MCP ecosystem.** The MCP server works across Claude Desktop, Cursor, Windsurf, VS Code, and OpenCode with OAuth support. For personal AI tool users, single-command install covers most clients.

**MemoryBench.** Publishing the benchmarking framework as open source lets users reproduce the evaluation claims and test their own systems. This is a meaningful commitment to transparency.

---

## Critical Limitations

**Concrete failure mode — contradiction resolution is opaque.** When the engine detects a contradiction between two facts, it resolves it automatically. The documentation does not expose how this decision is made, what happens to the losing fact, or how users and developers can audit or override the resolution. If an agent feeds in inconsistent data (a common condition in multi-turn conversations), you have no visibility into which version survived and no hook to inspect the conflict.

**Unspoken infrastructure assumption — Cloudflare dependency.** The repo topics explicitly list `cloudflare-workers`, `cloudflare-kv`, and `cloudflare-pages`. This means your memory data lives on Cloudflare's infrastructure in Supermemory's managed service. For applications with data residency requirements, regulated data, or organizations that prohibit third-party data processors, this is a blocking constraint that the README does not surface prominently.

---

## When NOT to Use It

- **Self-hosted or air-gapped deployments.** The managed service requires Cloudflare and Supermemory's infrastructure. No documented self-hosting path exists in the repository.
- **Regulated data (HIPAA, GDPR with strict processor requirements).** User facts, conversation content, and file contents are processed by a third-party service. Data governance documentation is absent from the repository.
- **Teams needing full control over retrieval logic.** The hybrid search ranking, fact extraction heuristics, and contradiction resolution are black boxes. If your application requires custom relevance tuning or explainable recall traces, you will hit walls.
- **High-volume, cost-sensitive applications.** Pricing at scale is not documented in the repository. API costs for agents making frequent `client.add()` and `client.profile()` calls across many users are unquantified.

---

## Unresolved Questions

**Governance and long-term access.** Supermemory is described as a research lab. There is no SLA, no uptime commitment, and no documentation about what happens to stored memories if the service is discontinued or pivots. Agent memory is typically long-lived data; the durability guarantees are unstated.

**Cost at scale.** The free tier exists (the app is available at no charge for personal use), but API pricing for production workloads is not in the repository. A team building a multi-tenant agent application cannot estimate costs without contacting the company.

**Fact extraction quality.** The engine decides what constitutes a "fact" worth storing versus noise. The criteria are undocumented. Edge cases — ambiguous statements, sarcasm, multi-referent pronouns — have no documented handling, and there is no feedback mechanism for users to correct bad extractions.

**Contradiction resolution mechanism.** As noted above: what algorithm resolves conflicts, and is the loser deleted or archived?

---

## Alternatives

| Tool | When to Use It |
|---|---|
| **Mem0** | When you want a similar managed API with more transparent pricing documentation and broader framework integrations out of the box |
| **Zep** | When you need structured session-level memory with temporal reasoning and a self-hosted option; better for regulated environments |
| **OpenMemory** | When you need self-hosted, local-first memory with SQLite/Postgres and multi-sector episodic/semantic modeling; Apache 2.0 licensed |
| **Raw vector DB (Pinecone, Qdrant, pgvector)** | When you need full control over chunking, embedding models, retrieval ranking, and data residency; higher setup cost, lower abstraction cost |
| **In-context summarization** | When conversation history is short enough to fit in context and cross-session persistence is not required |

Use Supermemory when you want the fastest path to temporal, personalized agent memory in a managed service and your use case is not blocked by data residency, self-hosting, or cost transparency requirements.

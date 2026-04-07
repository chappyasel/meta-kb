---
entity_id: supermemory
type: project
bucket: agent-memory
abstract: >-
  Supermemory is a cloud-hosted memory API for AI agents that separates user
  profiles (static + dynamic) from query retrieval, and treats forgetting as a
  deliberate mechanism rather than an edge case.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/thedotmack-claude-mem.md
  - deep/repos/supermemoryai-supermemory.md
related:
  - rag
  - mcp
last_compiled: '2026-04-07T11:52:13.306Z'
---
# Supermemory

**Type:** Project
**Bucket:** Agent Memory
**Language:** TypeScript
**License:** MIT
**Stars:** ~21,000 (as of April 2026)
**Repository:** [supermemoryai/supermemory](https://github.com/supermemoryai/supermemory)

---

## What It Does

Supermemory provides persistent, searchable memory storage for AI agents across sessions and applications. Rather than bolting memory onto an existing [RAG](../concepts/rag.md) pipeline, it maintains a structured user profile per `containerTag` (a namespace string) and handles the lifecycle of facts: extraction, contradiction resolution, temporal expiry, and soft-delete forgetting.

The core claim is that [RAG](../concepts/rag.md) retrieves document chunks while memory tracks *facts about users over time*. Supermemory runs both in a single query, returning knowledge-base results alongside personalized user context.

---

## Architecture

Supermemory ships as a Turbo monorepo. The packages that matter for integrators:

- `packages/tools/` — the primary SDK, with adapters for Vercel AI SDK, Mastra, OpenAI, and a Python agent framework
- `packages/tools/src/shared/` — shared core: API communication, memory deduplication, prompt building, caching
- `packages/memory-graph/` — WebGL-based graph visualization (force-directed, pan/zoom, node detail panels)
- `packages/ai-sdk/` — Vercel AI SDK integration
- `packages/agent-framework-python/` — Python SDK
- `apps/` — web dashboard, [MCP](../concepts/mcp.md) server, Raycast extension

The memory engine itself runs server-side on Cloudflare Workers with Hyperdrive (database proxy), Cloudflare AI (embeddings), KV storage, and Cloudflare Workflows. The open-source repository contains SDK wrappers and UI; the core extraction and temporal reasoning logic runs on Supermemory's infrastructure.

---

## Core Mechanism

### Three-Tier Profile Structure

The central design decision is a fixed memory ontology with three tiers, returned by `POST /v4/profile`:

```typescript
interface ProfileStructure {
  profile: {
    static?: Array<{ memory: string; metadata?: Record<string, unknown> }>
    dynamic?: Array<{ memory: string; metadata?: Record<string, unknown> }>
  }
  searchResults: {
    results: Array<{ memory: string; metadata?: Record<string, unknown> }>
  }
}
```

- **Static profile**: stable identity facts (name, profession, persistent preferences). Updated rarely.
- **Dynamic profile**: current projects, recent interests, active context. Updated frequently.
- **Search results**: query-relevant memories fetched on-demand via semantic search.

This separation drives different update frequencies and injection strategies per tier. A single call with both `containerTag` and `q` returns all three.

### Retrieval Modes

`MemoryMode` defines three strategies in `tools-shared.ts`:

- `"profile"` — returns static + dynamic profile, no query filtering. Used at conversation start.
- `"query"` — semantic search only, no profile injection. Used mid-conversation.
- `"full"` — both combined. The default for most integrations.

`extractQueryText()` pulls the last user message from the message array, handling string content, multi-part arrays, and nested content objects across provider formats.

### Memory Deduplication

`deduplicateMemories()` in `tools-shared.ts` resolves overlaps across tiers using a priority system: Static > Dynamic > Search Results. It maintains a `seenMemories` Set and processes tiers in order, dropping duplicates at lower priority levels. The matching is string-exact, not semantic.

### Forgetting as First-Class Feature

The `memoryForget` tool soft-deletes memories by ID or content match. The `reason` parameter creates an audit trail. Forgotten memories stop appearing in recall but remain recoverable. This is not cleanup: it is the primary mechanism for handling temporal supersession ("I switched from Python to Rust") and expiring time-bound facts ("I have an exam tomorrow").

Soft-delete means storage grows monotonically. Forgotten entries accumulate but do not surface in results unless explicitly recovered.

### Prompt Injection

`prompt-builder.ts` formats memories into two sections injected into the system prompt:

1. `## Static Profile` and `## Dynamic Profile` as bulleted lists under "User Supermemories"
2. `Search results for user's recent message: \n- memory1\n...`

The `PromptTemplate` function is customizable per integration.

### Container Scoping

`containerTag` namespaces all memory operations. A `sm_project_` prefix signals project-based scoping. Multiple agents sharing a tag share memory.

---

## Key Numbers

| Metric | Value | Credibility |
|---|---|---|
| GitHub stars | ~21,000 | Verified (GitHub) |
| Profile API latency | ~50ms | Self-reported |
| LongMemEval | 81.6%, #1 | Self-reported; benchmark is public but results not independently replicated |
| LoCoMo | #1 | Self-reported |
| ConvoMem | #1 | Self-reported |

The benchmark claims cover the three major AI memory evaluation frameworks. Supermemory also ships MemoryBench, an open-source tool for comparing memory providers. The #1 rankings are self-reported; independent reproduction has not been confirmed by third parties.

---

## Strengths

**Active memory curation.** Contradiction handling, temporal expiry, and soft-delete forgetting prevent the fact-store from degrading into noise over time. Most competing approaches accumulate everything.

**Single-call profile injection.** `client.profile({ containerTag, q })` returns static identity, dynamic context, and query-relevant memories in one ~50ms round-trip. The three-tier separation means the caller does not need to decide what to retrieve.

**Framework middleware breadth.** Drop-in wrappers for Vercel AI SDK, Mastra, LangChain, LangGraph, OpenAI Agents SDK, Mastra, and n8n. The Vercel wrapper intercepts `wrapLanguageModel`; the OpenAI wrapper intercepts at the fetch level. Integration is one import in most cases.

**MCP integration.** Three tools (`memory`, `recall`, `context`) over OAuth, compatible with Claude Desktop, Cursor, Windsurf, Claude Code, OpenCode, and OpenClaw. The `/context` command in Cursor and Claude Code injects the full profile on demand.

**Multi-modal ingestion.** `IngestContentWorkflow` handles PDFs, images (OCR), video (transcription), and code (AST-aware chunking). Connectors sync Google Drive, Gmail, Notion, OneDrive, and GitHub on 4-hour cron cycles with real-time webhooks.

---

## Critical Limitations

**Cloud dependency as single point of failure.** The memory engine, embedding pipeline, and temporal reasoning all run on Supermemory's Cloudflare infrastructure. The SDK is a thin client. If the API is unavailable, memory operations fail with no local fallback. The `cache.ts` module handles session-level request caching, not durability.

**Unspoken infrastructure assumption: you trust a third-party service with all user context.** Every fact extracted from every conversation leaves your infrastructure. For applications with data residency requirements, regulated industries, or sensitivity around user data, this is not a minor caveat — it is a blocker. There is no documented self-hosting path for the core engine.

---

## When NOT to Use It

- **Data residency or compliance requirements.** All memory processing happens on Supermemory's infrastructure. HIPAA, GDPR data-sovereignty clauses, or internal policies requiring on-premise processing rule this out.
- **You need transparent, auditable memory logic.** The extraction, contradiction resolution, and forgetting algorithms are proprietary. You cannot inspect or modify them.
- **You need custom memory schemas.** The three-tier structure is fixed. If your application requires entity-attribution models, hierarchical memory, or domain-specific ontologies, the rigid structure fights you.
- **High-frequency memory updates at scale.** Soft-deletes accumulate without documented purge mechanisms. Costs at scale are undocumented.

---

## Unresolved Questions

**Cost at scale.** Pricing documentation is not surfaced in the repository. For applications with many users or high conversation volume, total API cost is opaque until you hit the dashboard.

**Conflict resolution algorithm.** The documentation states that contradictions are "resolved automatically," but the mechanism is not specified. When two facts contradict, which wins? Recency? Confidence score? LLM judgment? Unknown.

**Soft-delete accumulation.** No documented mechanism for purging soft-deleted memories. For long-running applications, the effect on search latency over time is unclear.

**Governance and data deletion.** What happens to stored memories if you cancel an account? What is the data retention policy? Not documented in the open-source repository.

**Deduplication quality.** String-exact deduplication means "User likes TypeScript" and "User prefers TypeScript for all projects" both persist. Semantic deduplication is not implemented in the SDK layer.

---

## Alternatives

| Project | When to prefer it |
|---|---|
| [Mem0](../projects/mem0.md) | Comparable feature set; evaluate on benchmark reproducibility and pricing for your volume |
| [Zep](../projects/zep.md) | Temporal knowledge graph with self-hostable option; better for compliance-sensitive applications |
| [Graphiti](../projects/graphiti.md) | Open-source temporal knowledge graph; full control over data and logic |
| [Letta](../projects/letta.md) | Stateful agents with explicit memory types and open-source server; more transparency into memory operations |
| [LangChain](../projects/langchain.md) + [ChromaDB](../projects/chromadb.md) | You need self-hosted vector search with no third-party dependency and are willing to manage chunking and embedding yourself |

Use Supermemory when you need a managed, zero-config memory layer with fast time-to-integration and you can accept cloud data residency. Use Zep, Graphiti, or Letta when you need self-hostability or transparent memory logic.

---

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md) — Supermemory combines document RAG with profile memory in a single query
- [Model Context Protocol](../concepts/mcp.md) — Supermemory ships an MCP server for tool-based memory access
- [Agent Memory](../concepts/agent-memory.md) — The broader category this project addresses
- [Hybrid Search](../concepts/hybrid-search.md) — Used internally for the `searchMode: "hybrid"` retrieval path
- [Semantic Memory](../concepts/semantic-memory.md) — The static and dynamic profile tiers implement semantic memory concepts
- [Episodic Memory](../concepts/episodic-memory.md) — Search results and session context correspond to episodic recall
- [Context Engineering](../concepts/context-engineering.md) — Supermemory's prompt injection is a form of automated context engineering
- [Vector Database](../concepts/vector-database.md) — The underlying retrieval mechanism for semantic search

---

[Source: deep/repos/supermemoryai-supermemory.md](../raw/deep/repos/supermemoryai-supermemory.md)
[Source: repos/supermemoryai-supermemory.md](../raw/repos/supermemoryai-supermemory.md)

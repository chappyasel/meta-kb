---
entity_id: supermemory
type: project
bucket: agent-memory
abstract: >-
  Supermemory is a cloud-hosted memory and context engine for AI agents that
  ranks #1 on LongMemEval, LoCoMo, and ConvoMem benchmarks by treating
  forgetting as a first-class feature alongside storage.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/thedotmack-claude-mem.md
  - repos/caviraoss-openmemory.md
  - deep/repos/supermemoryai-supermemory.md
related:
  - rag
  - mcp
last_compiled: '2026-04-06T02:11:28.805Z'
---
# Supermemory

**Type:** Project | **Bucket:** Agent Memory | **Language:** TypeScript | **License:** MIT
**Stars:** ~21K | **GitHub:** supermemoryai/supermemory

Supermemory is a hosted memory and context engine for AI agents and applications. Its core claim: most agent memory systems are passive accumulators, but Supermemory actively curates what is retained, updated, and forgotten. The architecture separates stable identity (static profile), evolving context (dynamic profile), and query-time retrieval (search results) into three distinct tiers, then combines them in a single API call. The engine handles contradiction resolution, temporal validity, and automatic forgetting server-side; client-side SDKs are thin wrappers.

## What It Does

Supermemory sits between your AI application and its conversations. When a user says something worth remembering, the engine extracts facts, classifies them into the three-tier ontology, resolves contradictions against existing memories, and persists the result. On the next conversation, a single `/v4/profile` call returns the user's static facts, dynamic context, and semantically relevant memories for the current query — all formatted for injection into a system prompt. The engine also processes documents (PDFs, images, videos, code) and syncs from external connectors (Google Drive, Gmail, Notion, GitHub) on 4-hour cron cycles.

## Core Mechanism

### Three-Tier Memory Ontology

The `ProfileStructure` returned by `/v4/profile`:

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

**Static profile** holds core identity facts (name, profession, long-term preferences) that rarely change. **Dynamic profile** holds recently updated context (current projects, active interests). **Search results** are fetched on-demand via semantic similarity to the current query. This separation enables different update frequencies and retention policies per tier — a design choice that most flat-store memory systems skip.

### Retrieval Modes

The `MemoryMode` type in `packages/tools/src/shared/` defines three strategies:

- **`"profile"`** — returns static + dynamic profile without semantic search. Used to inject user context at session start.
- **`"query"`** — semantic search only, no profile. Used for mid-conversation recall when identity context is already loaded.
- **`"full"`** — profile plus query-relevant search results. The default.

The `extractQueryText()` function pulls the last user message from the conversation array, handling string content, multi-part arrays, and nested content objects across provider formats.

### Forgetting as a Feature

The `memoryForget` tool soft-deletes memories by ID or content match:

```typescript
TOOL_DESCRIPTIONS.memoryForget = "Forget (soft delete) a specific memory by ID or content match. The memory is marked as forgotten but not permanently deleted."
```

When a user updates a fact ("I switched from Python to Rust"), the old preference is marked forgotten rather than left to compete in retrieval. The `reason` parameter creates an audit trail. Soft-delete means forgotten memories are recoverable but stop appearing in recall. Temporary facts ("I have a deadline tomorrow") expire automatically after their validity window passes.

### Deduplication

The `deduplicateMemories()` function in `tools-shared.ts` resolves overlap across the three tiers with a priority order: Static > Dynamic > Search Results. It maintains a `seenMemories` Set and processes tiers in sequence, skipping duplicates. Deduplication is string-based exact matching, not semantic.

### Prompt Injection

The `prompt-builder.ts` module formats memories into two sections injected into the system prompt: a markdown-formatted profile block with `## Static Profile` and `## Dynamic Profile` subsections, and a search results block. The default `PromptTemplate` is: `User Supermemories: \n{userMemories}\n{generalSearchMemories}`.

### Container Tags

Memories are namespaced by `containerTag`. The `sm_project_` prefix enables per-project scoping. Multiple agents sharing a `containerTag` share memory state.

### Persistence Modes

`AddMemoryMode` controls whether conversations are stored:
- **`"always"`** — auto-save conversations as memories (default).
- **`"never"`** — retrieval only, no new storage.

## Architecture

Supermemory ships as a Turbo monorepo. Key packages:

- `packages/tools/` — primary SDK with framework integrations (Vercel AI SDK, Mastra, OpenAI, Python)
- `packages/memory-graph/` — WebGL force-directed visualization of the memory graph (pan/zoom, node detail panels)
- `packages/ai-sdk/` — Vercel AI SDK wrapper
- `packages/agent-framework-python/` — Python agent SDK
- `apps/web/` — dashboard (Remix, Cloudflare Pages)
- `apps/mcp/` — MCP server

The memory engine runs on Cloudflare Workers with Hyperdrive (database proxy), Cloudflare AI (embeddings), and KV storage. The `IngestContentWorkflow` handles multi-modal ingestion: PDFs, OCR for images, transcription for video, AST-aware chunking for code.

### Framework Integrations

```typescript
// Vercel AI SDK — wraps wrapLanguageModel
import { withSupermemory } from "supermemory/vercel"
const model = withSupermemory(openai("gpt-4o"), { apiKey: "sm_...", containerTag: "user_123" })

// Mastra — beforeGenerate / afterGenerate hooks
import { withSupermemory } from "supermemory/mastra"
const agent = withSupermemory(agentConfig, { apiKey: "sm_...", userId: "user_123" })

// OpenAI — fetch-level interception
import { createSupermemoryMiddleware } from "supermemory/openai"
```

### MCP Server

```bash
npx -y install-mcp@latest https://mcp.supermemory.ai/mcp --client claude --oauth=yes
```

Exposes three tools: `memory` (save/forget), `recall` (search), `context` (full profile injection). Works with Claude Desktop, Cursor, Windsurf, VS Code, Claude Code, OpenClaw.

## Benchmarks

| Benchmark | What It Measures | Result |
|---|---|---|
| LongMemEval | Long-term recall with knowledge updates | **81.6% — #1** |
| LoCoMo | Fact recall across extended conversations | **#1** |
| ConvoMem (Salesforce) | Personalization and preference learning | **#1** |

**Credibility note:** These are self-reported. Independent verification is not documented in the repository. The project also ships MemoryBench (`bun run src/index.ts run -p supermemory -b longmemeval`), an open-source benchmarking framework that lets you run these evaluations yourself and compare against Mem0, Zep, and others — which partially addresses the reproducibility concern.

Profile API latency is reported as ~50ms, enabled by Cloudflare edge deployment and Hyperdrive. Not independently verified.

[Source](../raw/deep/repos/supermemoryai-supermemory.md)

## Strengths

**Temporal memory management.** The combination of soft-delete forgetting, contradiction resolution, and temporal validity windows means the memory graph degrades gracefully rather than accumulating noise. Most alternatives treat accumulation as the only direction.

**Single-call context injection.** The `/v4/profile` endpoint returns profile plus query-relevant search in one request at ~50ms. No multi-step retrieval pipeline to orchestrate.

**Benchmark performance.** #1 across the three major memory benchmarks suggests the three-tier approach with active forgetting produces better recall than passive accumulation.

**Broad framework support.** Drop-in integrations for Vercel AI SDK, Mastra, OpenAI, LangChain, LangGraph, n8n, plus MCP for tool-using agents and Python for non-JS stacks.

**Memory graph visualization.** The WebGL graph in `packages/memory-graph/` makes the otherwise-opaque memory state inspectable. Users can see what exists, how memories connect, and when they were created.

## Limitations

**Cloud-only core engine.** The memory engine — fact extraction, contradiction handling, temporal reasoning, forgetting logic — runs entirely on Supermemory's infrastructure. The open-source repository contains SDK wrappers and UI components, not the memory processing logic. If the API goes down, all memory operations fail. The SDK includes session-level caching but no durable local fallback.

**No local or self-hosted option.** Unlike [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), or [Letta](../projects/letta.md), there is no documented path to running the full engine locally. The Cloudflare Workers + Hyperdrive infrastructure is tightly coupled to the hosted service.

**String-based deduplication.** The `deduplicateMemories()` function matches exact strings. "User likes TypeScript" and "User prefers TypeScript for all projects" are not deduplicated, leading to redundant profile entries over time.

**Storage growth.** Soft-deleted memories accumulate. There is no documented automatic purge mechanism for the soft-delete backlog, which could affect search performance at scale.

**Metadata opacity.** Memory items carry `metadata?: Record<string, unknown>` but the SDK provides no filtering or querying by metadata fields. Metadata passes through but does not improve retrieval precision.

**Fact-level storage loses conversational context.** The engine stores extracted facts, not conversations. You can recall "user prefers functional programming" but not the exchange where that preference was discussed or why. For use cases requiring conversation replay or audit, this is a gap.

## When NOT to Use It

**Air-gapped or regulated environments.** All data transits to Cloudflare infrastructure. If your compliance requirements prohibit external data processing or require data residency controls, Supermemory has no self-hosted path.

**High-volume, cost-sensitive pipelines.** Pricing at scale is not documented in the repository. For batch processing or high-frequency agent loops where every memory operation adds latency and cost, evaluate whether the managed service pricing fits your model.

**When you need full control over the memory algorithm.** The forgetting logic, contradiction resolution, and temporal reasoning are black boxes. If your application requires auditable, deterministic memory behavior (e.g., compliance, legal, clinical contexts), you cannot inspect or override the core engine.

**When conversation replay matters.** If agents need to reconstruct "what happened in session 47," fact-level storage loses that context. Consider [Zep](../projects/zep.md) or [Letta](../projects/letta.md) for session-aware memory.

## Unresolved Questions

**Contradiction resolution mechanics.** The documentation states that contradictions are "resolved automatically," but the repository does not expose the algorithm. When two facts conflict (e.g., user says they work at Company A, then Company B), which wins? Is recency the only signal? Can users inspect or override resolution decisions?

**Cost at scale.** No public pricing documentation in the repository. The cost per memory operation, per profile fetch, and per connector sync is unspecified. For applications with thousands of users or high message frequency, this is a planning risk.

**Soft-delete accumulation.** Forgotten memories are soft-deleted, not purged. The repository does not document any TTL or cleanup policy for the soft-delete backlog. At what volume does this affect retrieval latency?

**Profile size management.** For long-running users, the static and dynamic profile arrays could grow large enough to consume significant context window space. There is no documented profile pruning or summarization mechanism.

**Benchmark methodology.** The self-reported LongMemEval score (81.6%) and LoCoMo rankings are not accompanied by evaluation code or reproducibility instructions in the main repository. The MemoryBench tool helps but requires running evaluations yourself.

## Alternatives

| Alternative | When to Choose It |
|---|---|
| [Mem0](../projects/mem0.md) | Need self-hosted option or lower operational dependency on a third-party service |
| [Zep](../projects/zep.md) | Need session-aware memory with conversation replay, or temporal knowledge graph with fact versioning |
| [Letta](../projects/letta.md) | Building agents that need in-context memory management with full visibility into the memory state |
| [Graphiti](../projects/graphiti.md) | Need a graph-structured memory with explicit entity and relationship extraction |
| Direct [RAG](../concepts/rag.md) with [Vector Database](../concepts/vector-database.md) | Need full control over chunking, embedding, and retrieval; acceptable to manage the pipeline yourself |
| [HippoRAG](../projects/hipporag.md) | Research context requiring graph-based retrieval with multi-hop reasoning over stored knowledge |

Choose Supermemory when you want the fastest path to production-quality agent memory, benchmark-leading recall, and are comfortable with a managed service dependency.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader category this project implements
- [Retrieval-Augmented Generation](../concepts/rag.md) — what Supermemory combines with profile-based memory
- [Model Context Protocol](../concepts/mcp.md) — the integration protocol Supermemory exposes for tool-using agents
- [Semantic Memory](../concepts/semantic-memory.md) — the memory type most analogous to Supermemory's static profile
- [Episodic Memory](../concepts/episodic-memory.md) — the memory type most analogous to the dynamic profile
- [Memory Consolidation](../concepts/memory-consolidation.md) — the process Supermemory automates for fact extraction and contradiction resolution
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md) — the search strategy combining RAG and profile-based recall
- [LongMemEval](../projects/longmemeval.md) — the benchmark where Supermemory claims #1 ranking
- [LoCoMo](../projects/locomo.md) — the long-conversation memory benchmark

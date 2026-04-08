---
entity_id: supermemory
type: project
bucket: agent-memory
abstract: >-
  Supermemory is a cloud-hosted memory engine for AI agents that separates
  memories into static/dynamic profile tiers and treats forgetting as an active
  mechanism, claiming #1 on LongMemEval, LoCoMo, and ConvoMem benchmarks.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/thedotmack-claude-mem.md
  - deep/repos/supermemoryai-supermemory.md
related:
  - model-context-protocol
last_compiled: '2026-04-08T02:57:03.834Z'
---
# SuperMemory

## What It Does

Supermemory provides a memory and context layer for AI agents: persistent storage of extracted facts, user profile maintenance, hybrid RAG+memory search, and connectors to external data sources. Its architectural differentiator is treating memory as a curated, temporally-aware graph rather than an append-only store. When a user says "I switched from Python to Rust," the system doesn't just add the new fact, it soft-deletes the old one.

The project ships as a Turbo monorepo with packages for TypeScript SDK (`packages/tools/`), a Python agent framework (`packages/agent-framework-python/`), Vercel AI SDK integration (`packages/ai-sdk/`), a WebGL memory graph visualizer (`packages/memory-graph/`), and an [MCP](../concepts/model-context-protocol.md) server (`apps/mcp/`). The memory engine itself runs server-side on Cloudflare Workers with Hyperdrive database proxy and Cloudflare AI for embeddings.

**Stats:** 20,994 GitHub stars, 1,914 forks, MIT licensed, last updated April 2026. [Source](../raw/repos/supermemoryai-supermemory.md)

## Core Mechanism

### Three-Tier Memory Ontology

The central design decision: memories split into three categories with different update frequencies and injection strategies.

**Static Profile** — stable identity facts: name, profession, long-term preferences. These change rarely and get injected at conversation start.

**Dynamic Profile** — recently updated context: current projects, active topics, ongoing threads. This tier refreshes frequently.

**Search Results** — query-relevant memories fetched on demand via semantic similarity.

The `POST /v4/profile` endpoint returns all three:

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

Pass only `containerTag` to get the profile. Add `q` to also run semantic search. One HTTP call returns everything needed for context injection.

### Forgetting as First-Class Feature

The `memoryForget` tool soft-deletes memories by ID or content match. Forgotten memories stop appearing in recall results but remain recoverable. Temporary facts ("I have an exam tomorrow") expire automatically after their date passes. Contradictions trigger automatic supersession. The `reason` parameter records why a memory was removed, enabling audit trails.

This distinguishes Supermemory from passive accumulation approaches where memory quality degrades over time as stale facts accumulate alongside fresh ones.

### Retrieval Modes

`MemoryMode` defines three strategies, controlled in `packages/tools/src/shared/`:

- **`"profile"`**: Static + dynamic profile without query filtering. Used at conversation start.
- **`"query"`**: Semantic search only, no profile. Used for mid-conversation recall.
- **`"full"`**: Both combined. The default.

The `extractQueryText()` function pulls the last user message from the message array, handling string content, multi-part content arrays, and nested content objects across provider formats.

### Deduplication

`deduplicateMemories()` in `tools-shared.ts` resolves overlap across the three tiers with priority: Static > Dynamic > Search Results. It maintains a `seenMemories` Set, processing items in order and skipping any already seen. String-based exact matching only — semantically equivalent memories with different wording both survive.

### Prompt Injection

`prompt-builder.ts` formats memories into two sections:

1. **User Memories**: Markdown with `## Static Profile` and `## Dynamic Profile` as bulleted lists.
2. **Search Results**: Formatted as `Search results for user's recent message: \n- memory1\n- memory2`.

The default `PromptTemplate`: `User Supermemories: \n{userMemories}\n{generalSearchMemories}`.

### Container Tags

Memories scope to a `containerTag` string. The `sm_project_` prefix enables project-based namespacing. Multiple agents sharing a tag share memory state.

## Framework Integrations

Drop-in wrappers for major frameworks via `packages/tools/`:

```typescript
// Vercel AI SDK — wraps doGenerate and doStream
import { withSupermemory } from "supermemory/vercel"
const model = withSupermemory(openai("gpt-4o"), { apiKey: "sm_...", containerTag: "user_123" })

// Mastra — beforeGenerate/afterGenerate hooks
import { withSupermemory } from "supermemory/mastra"
const agent = new Agent(withSupermemory(config, "user-123", { mode: "full" }))
```

The MCP server exposes three tools (`memory`, `recall`, `context`) with OAuth authentication:

```bash
npx -y install-mcp@latest https://mcp.supermemory.ai/mcp --client claude --oauth=yes
```

Supported clients: Claude Desktop, [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), VS Code, [Claude Code](../projects/claude-code.md), OpenCode, [OpenClaw](../projects/openclaw.md).

Connectors auto-sync Google Drive, Gmail, Notion, OneDrive, GitHub via real-time webhooks. The `IngestContentWorkflow` handles PDFs, images (OCR), videos (transcription), and code (AST-aware chunking) on a 4-hour cron cycle.

## Benchmarks

| Benchmark | Result |
|-----------|--------|
| [LongMemEval](../projects/longmemeval.md) | 81.6% — #1 |
| [LoCoMo](../projects/locomo.md) | #1 |
| ConvoMem (Salesforce) | #1 |
| Profile API latency | ~50ms |

**Credibility note:** These benchmark results are self-reported in the Supermemory README and documentation. No independent third-party replication is cited. The project also ships MemoryBench, an open-source framework for comparing memory providers, which at least provides reproducible tooling for others to verify claims.

## Strengths

**Active memory curation.** Soft-delete forgetting and contradiction resolution keep the memory graph relevant over time rather than accumulating noise. This directly addresses the primary failure mode of passive [RAG](../concepts/retrieval-augmented-generation.md) systems.

**Single-call profile retrieval.** The three-tier profile returns in ~50ms from a single API call, making real-time conversation injection practical without added latency.

**Broad integration surface.** Framework middleware for Vercel AI SDK, Mastra, [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), [OpenAI Agents SDK](../projects/openai-agents-sdk.md), plus MCP and direct Python/TypeScript SDKs.

**Hybrid search.** RAG document retrieval and personalized memory recall run together in one query, combining [semantic search](../concepts/semantic-search.md) over knowledge bases with user-specific context.

## Critical Limitations

**Cloud-only core.** The memory engine (fact extraction, contradiction handling, temporal reasoning, automatic forgetting) runs entirely on Supermemory's infrastructure. The open-source repository contains SDK wrappers and UI components, not the processing logic. You cannot inspect how forgetting actually works, audit contradiction resolution decisions, or run the full system on-premises. If the API goes down, all memory operations fail — the SDK has no local fallback cache beyond session-level request caching in `cache.ts`.

**String-only deduplication.** The `seenMemories` Set in `deduplicateMemories()` does exact string matching. "User likes TypeScript" and "User prefers TypeScript for all projects" both survive deduplication and both land in the system prompt. For users with long histories, this creates redundant context accumulation that wastes context window tokens.

## When NOT to Use It

**Regulatory or data residency constraints.** All memory processing happens on Cloudflare infrastructure. Healthcare, finance, or government deployments with strict data locality requirements cannot use this as-is.

**Latency-sensitive edge deployments.** The profile API call adds ~50ms per conversation start. For applications where every millisecond matters or with unreliable network conditions to Cloudflare edge, this overhead is non-trivial.

**When you need full memory transparency.** The forgetting, contradiction resolution, and temporal reasoning logic is a black box. If your application requires auditable, explainable memory decisions — knowing exactly why a fact was superseded — Supermemory's closed-core architecture won't support that requirement.

**Simple, bounded memory needs.** If you only need to persist a few hundred facts about users and don't require temporal reasoning or automatic forgetting, [Mem0](../projects/mem0.md) or [OpenMemory](../projects/openmemory.md) offer simpler, more self-hostable alternatives.

## Unresolved Questions

**Cost at scale.** Pricing for the API is not documented in the repository or README. For applications with thousands of users generating continuous memory updates, the cost model is opaque.

**Soft-delete accumulation.** Forgotten memories are soft-deleted, not permanently removed. Storage grows monotonically. There is no documented purge mechanism, retention policy, or guidance on what happens to search performance as soft-deleted entries accumulate over years.

**Profile size management.** No documented limit on profile size, and no automatic pruning mechanism. A user with years of interactions could generate a static + dynamic profile large enough to consume a significant fraction of a 128K context window.

**Contradiction resolution logic.** The documentation states contradictions are "automatically resolved," but the mechanism is undisclosed. What happens when two contradictory facts are equally recent? Who wins when the system can't determine recency?

**Benchmark methodology.** The README claims #1 on three benchmarks but provides no links to the actual evaluation runs, model configurations, or comparison baselines used. MemoryBench is open-source, but the specific evaluation details for the reported results are not published.

## Alternatives

| Tool | Use When |
|------|----------|
| [Mem0](../projects/mem0.md) | You need a self-hostable option with a simpler memory model and don't require temporal reasoning |
| [Zep](../projects/zep.md) | You need session-level memory with graph-based entity tracking and open-source core |
| [Letta](../projects/letta.md) / [MemGPT](../projects/memgpt.md) | You need fine-grained programmatic control over memory tiers and a fully local deployment |
| [OpenMemory](../projects/openmemory.md) | You want a local, privacy-first memory store without cloud dependencies |
| [Graphiti](../projects/graphiti.md) | You need a knowledge graph with explicit temporal edges and relationship modeling |

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader problem this addresses
- [Long-Term Memory](../concepts/long-term-memory.md) — the memory tier Supermemory primarily manages
- [Context Engineering](../concepts/context-engineering.md) — the discipline of deciding what to inject and when
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the hybrid search half of Supermemory's retrieval
- [Model Context Protocol](../concepts/model-context-protocol.md) — the protocol Supermemory implements for MCP clients
- [Semantic Memory](../concepts/semantic-memory.md) — the cognitive architecture analog for fact storage
- [Hybrid Search](../concepts/hybrid-search.md) — the search strategy combining vector and keyword retrieval
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — referenced in claude-mem's integration with Supermemory for layered context injection

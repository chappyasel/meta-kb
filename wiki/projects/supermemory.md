---
entity_id: supermemory
type: project
bucket: agent-memory
abstract: >-
  SuperMemory is a hosted memory API for AI agents with a three-tier profile
  structure (static/dynamic/search) and explicit forgetting, ranking #1 on
  LongMemEval, LoCoMo, and ConvoMem benchmarks.
sources:
  - deep/repos/supermemoryai-supermemory.md
  - repos/supermemoryai-supermemory.md
  - repos/thedotmack-claude-mem.md
related:
  - supermemory-project
last_compiled: '2026-04-08T23:14:01.400Z'
---
# SuperMemory

## What It Does

SuperMemory is a hosted memory and context engine for AI agents. Developers call a single API endpoint; the system handles fact extraction from conversations, user profile maintenance, hybrid semantic search, contradiction resolution, and automatic forgetting. The result lands in your system prompt in roughly 50ms.

The project ships as a Turbo monorepo. The `packages/tools/` directory contains SDK wrappers for Vercel AI SDK, Mastra, OpenAI, and a Python agent framework. `packages/memory-graph/` provides a WebGL graph visualization. `apps/` holds the web dashboard, MCP server, and a Raycast extension. The memory engine itself runs server-side on Cloudflare Workers with Hyperdrive (database proxy), Cloudflare AI (embeddings), and KV storage.

## Architecturally Unique Feature: Three-Tier Memory Ontology

Most agent memory systems store everything in a flat vector collection and retrieve by similarity. SuperMemory partitions memory into three tiers with different update frequencies, retention policies, and injection strategies:

- **Static Profile**: Stable facts that rarely change (name, profession, long-term preferences)
- **Dynamic Profile**: Recently learned or frequently updated context (current projects, recent interests)
- **Search Results**: Memories retrieved on-demand by semantic similarity to the current query

The primary API endpoint, `POST /v4/profile`, returns a `ProfileStructure` object containing all three. When called with just `containerTag`, it returns static and dynamic profile only. When called with `containerTag` and `q`, it also executes semantic search and populates `searchResults`. One call, three retrieval modes.

The second differentiator is treating forgetting as a feature rather than an edge case. The `memoryForget` tool soft-deletes memories by ID or content match with an optional `reason` parameter for audit trails. When a user says "I switched from Python to Rust," the old preference is marked forgotten, not just deprioritized. Temporary facts ("I have an exam tomorrow") expire after the relevant date passes. This prevents the noise accumulation that degrades flat-collection memory systems over time.

## Core Mechanism

`packages/tools/src/shared/` contains the core client logic: API communication, memory deduplication, prompt building, and request caching.

The `deduplicateMemories()` function resolves overlaps across tiers with a priority ordering: Static > Dynamic > Search Results. It maintains a `seenMemories` Set and processes items in tier order, skipping duplicates. String-based exact matching — semantically equivalent memories with different wording survive deduplication intact.

The `MemoryMode` type defines three retrieval strategies: `"profile"` (static + dynamic only, used at conversation start), `"query"` (semantic search only, used mid-conversation), and `"full"` (both, the default). The `extractQueryText()` function pulls the last user message from the messages array, handling string content, multi-part content arrays, and nested content objects across different provider formats.

The prompt builder in `prompt-builder.ts` formats memories into two sections for system prompt injection:
- `## Static Profile` and `## Dynamic Profile` as bulleted lists under "User Supermemories"
- "Search results for user's recent message:" as a separate block

Memory scope is controlled by `containerTag` — a namespace string. The `sm_project_` prefix enables project-level scoping, letting multiple agents share a memory space or a single user maintain separate work and personal contexts.

## Key Numbers

| Metric | Value | Source |
|---|---|---|
| GitHub stars | ~21,000 | GitHub (self-reported activity) |
| LongMemEval | 81.6%, #1 | Self-reported; benchmark is public |
| LoCoMo | #1 | Self-reported |
| ConvoMem (Salesforce) | #1 | Self-reported |
| Profile API latency | ~50ms | Self-reported |

The benchmark rankings are self-reported, but LongMemEval, LoCoMo, and ConvoMem are publicly available benchmarks with reproducible evaluation scripts. SuperMemory also publishes MemoryBench (`bun run src/index.ts run -p supermemory -b longmemeval`), an open-source framework for running these evaluations against competing providers. Independent validation is feasible but not yet widely published by third parties.

## Framework Integrations

The SDK wraps into four major integration patterns:

```typescript
// Vercel AI SDK
import { withSupermemory } from "supermemory/vercel"
const model = withSupermemory(openai("gpt-4o"), { apiKey: "sm_...", containerTag: "user_123" })

// Mastra
import { withSupermemory } from "supermemory/mastra"
const agent = new Agent(withSupermemory(config, "user-123", { mode: "full" }))
```

The Vercel middleware intercepts `doGenerate` and `doStream` methods. The Mastra wrapper uses `beforeGenerate` and `afterGenerate` hooks. The OpenAI integration intercepts at the fetch level. Plugins also exist for [Claude Code](../projects/claude-code.md), [OpenCode](../projects/opencode.md), and [OpenClaw](../projects/openclaw.md).

The MCP server exposes three tools: `memory` (save/forget), `recall` (search), and `context` (full profile injection). Install via:

```bash
npx -y install-mcp@latest https://mcp.supermemory.ai/mcp --client claude --oauth=yes
```

Replace `claude` with `cursor`, `windsurf`, `vscode`, etc. [Model Context Protocol](../concepts/model-context-protocol.md) compatibility means SuperMemory works as a drop-in memory layer for any MCP-compatible client.

## Strengths

**Active memory management at the API level.** Contradiction handling, temporal reasoning, and forgetting happen server-side before results reach the SDK. Developers get a curated profile rather than raw retrieval output.

**Single endpoint for full context.** `client.profile({ containerTag, q })` returns stable identity, recent context, and query-relevant memories in one call. No separate vector query + profile assembly required.

**Multi-modal ingestion.** The `IngestContentWorkflow` handles PDFs, images (OCR), video (transcription), and code (AST-aware chunking) out of the box. Connectors for Google Drive, Gmail, Notion, OneDrive, and GitHub sync on cron triggers (every 4 hours) with real-time webhooks.

**Hybrid search.** `searchMode: "hybrid"` combines [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) document retrieval with personalized memory recall in a single query.

## Critical Limitations

**Concrete failure mode — deduplication gaps.** The `deduplicateMemories()` function uses exact string matching. "User likes TypeScript" and "User prefers TypeScript for all projects" both survive as separate memories. Over time, semantically redundant memories accumulate in the profile and consume context window space. The three-tier structure mitigates this somewhat but does not eliminate it.

**Unspoken infrastructure assumption — cloud dependency.** The core memory engine (fact extraction, temporal reasoning, contradiction handling, forgetting) runs exclusively on SuperMemory's Cloudflare infrastructure. The open-source repository contains SDK wrappers, UI components, and the web dashboard — not the memory processing logic. If the API is unavailable, all memory operations fail. The `cache.ts` module in `packages/tools/src/shared/` provides session-level request caching, not durable offline fallback. Self-hosting the full system is not practical without reimplementing the engine.

## When NOT to Use It

**Offline or air-gapped environments.** No API, no memory.

**Applications requiring memory processing transparency.** The forgetting, contradiction resolution, and temporal reasoning algorithms run as proprietary cloud logic. You cannot inspect, audit, or modify how the engine decides what to forget or how it resolves contradictions.

**High-frequency, high-volume memory updates.** Soft-deleted memories accumulate in storage. For systems that update memory continuously at scale, storage costs grow unbounded without a documented purge mechanism. Profile size management for users with extensive history is not addressed in the SDK.

**Applications where memory content triggers compliance requirements.** All conversation data passes through SuperMemory's cloud. GDPR, HIPAA, or other data residency requirements may conflict with this architecture.

## Unresolved Questions

**Forgetting algorithm details.** The documentation states that "temporary facts expire after the date passes" and "contradictions are resolved automatically," but the actual algorithm is not described. How does the engine determine temporal relevance? What triggers contradiction detection? What is the false positive rate?

**Profile size bounds.** No documented limit on static/dynamic profile size. For users with years of conversation history, what prevents the profile from growing large enough to saturate the context window?

**Pricing at scale.** The developer quickstart describes a hosted API with no per-call pricing visible in the README. Cost per memory operation, per stored memory, and per connector sync is not documented publicly.

**Multi-tenancy isolation.** `containerTag` scopes memories, but the isolation guarantees between tenants on shared Cloudflare infrastructure are not documented.

## Alternatives

| Alternative | Choose When |
|---|---|
| [Mem0](../projects/mem0.md) | You want open-source memory with self-hosting and explicit graph + vector hybrid storage. Mem0's architecture is inspectable; SuperMemory's engine is not. |
| [Zep](../projects/zep.md) | You need knowledge graph-based memory with temporal reasoning and want to run the full stack on your own infrastructure. |
| [Letta](../projects/letta.md) / [MemGPT](../projects/memgpt.md) | You need hierarchical in-context memory management tightly coupled to a specific agent runtime, not a standalone API. |
| [Graphiti](../projects/graphiti.md) | Your use case requires temporal knowledge graph queries with explicit relationship tracking between entities. |
| Raw [Vector Database](../concepts/vector-database.md) + [BM25](../concepts/bm25.md) | You want full control over chunking, embedding, and retrieval without a cloud dependency, and can implement forgetting logic yourself. |

Use SuperMemory when you want the fastest path to production-quality memory with profile management and you can accept a cloud dependency. Use Mem0 or Zep when you need to self-host or inspect the memory processing logic.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader problem this addresses
- [Long-Term Memory](../concepts/long-term-memory.md) — the storage tier SuperMemory primarily targets
- [Semantic Memory](../concepts/semantic-memory.md) — the memory type most of the profile corresponds to
- [Hybrid Search](../concepts/hybrid-search.md) — the retrieval mechanism for `searchMode: "hybrid"`
- [Context Engineering](../concepts/context-engineering.md) — how injected memories fit into the prompt
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the document retrieval component

---

*Sources: [Deep analysis](../raw/deep/repos/supermemoryai-supermemory.md), [Repository README](../raw/repos/supermemoryai-supermemory.md)*

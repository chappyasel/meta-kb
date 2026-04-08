---
entity_id: supermemory-project
type: project
bucket: agent-memory
abstract: >-
  SuperMemory is a cloud-hosted memory layer for AI agents that separates memory
  into static profile, dynamic context, and query-specific retrieval tiers, with
  automatic contradiction resolution and temporal forgetting. Claims #1 on
  LongMemEval, LoCoMo, and ConvoMem (self-reported).
sources:
  - deep/repos/supermemoryai-supermemory.md
  - repos/supermemoryai-supermemory.md
  - repos/thedotmack-claude-mem.md
related:
  - supermemory
last_compiled: '2026-04-08T23:28:19.164Z'
---
# SuperMemory

## What It Does

SuperMemory is a hosted memory and context engine for AI agents. Where most memory systems treat recall as a static lookup problem, SuperMemory treats memory as something that ages. Contradictions get resolved automatically. Temporary facts expire. Forgotten information gets soft-deleted rather than buried under newer entries.

The system ships as a Turbo monorepo with packages for the TypeScript SDK (`packages/tools/`), a WebGL memory graph visualization (`packages/memory-graph/`), Vercel AI SDK integration (`packages/ai-sdk/`), and a Python agent framework (`packages/agent-framework-python/`). The core memory engine runs server-side on Cloudflare Workers with Hyperdrive for database proxying, Cloudflare AI for embeddings, and KV storage.

For end users, Supermemory provides an MCP server, a browser extension, and plugins for [Claude Code](../projects/claude-code.md), [OpenCode](../projects/opencode.md), and [OpenClaw](../projects/openclaw.md). For developers, it exposes a REST API with TypeScript and Python clients.

GitHub: 20,994 stars, 1,914 forks (as of April 2026).

## Core Mechanism

### The Three-Tier Memory Ontology

The central design decision is a fixed memory structure with three distinct tiers, returned by the `POST /v4/profile` endpoint:

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

**Static Profile**: Stable identity facts that rarely change (name, profession, long-term preferences). These form the foundational layer.

**Dynamic Profile**: Recently learned or frequently updated information (current projects, recent interests). This layer evolves actively.

**Search Results**: Memories retrieved by semantic similarity to the current query. Fetched on demand.

Each tier gets different update frequencies, retention policies, and injection priorities. A single API call at conversation start returns a complete user context in approximately 50ms.

### Memory Deduplication

Memories can appear in multiple tiers simultaneously. The `deduplicateMemories()` function in `tools-shared.ts` applies a priority hierarchy: Static beats Dynamic beats Search Results. It processes tiers in order, adding each memory string to a `seenMemories` Set and skipping any entry already encountered. This means the most authoritative version of a fact wins at injection time.

The deduplication is string-exact, not semantic. "User likes TypeScript" and "User prefers TypeScript for all projects" both survive as separate entries.

### Three Retrieval Modes

The `MemoryMode` type defines how context gets assembled:

- **`"profile"`**: Injects static + dynamic profile without semantic filtering. Used at session start.
- **`"query"`**: Retrieves memories by semantic similarity to the current message only. Used for mid-conversation recall.
- **`"full"`**: Combines both. The default for most integrations.

The `extractQueryText()` function pulls the last user message from the conversation array, handling string content, multi-part content arrays, and nested content objects across different provider formats.

### Forgetting as a First-Class Feature

The `memoryForget` tool soft-deletes memories by ID or content match:

```typescript
TOOL_DESCRIPTIONS.memoryForget = "Forget (soft delete) a specific memory by ID or content match. The memory is marked as forgotten but not permanently deleted."
```

This is a deliberate architectural choice. When a user says "I switched from Python to Rust," the old preference does not just get superseded by a newer entry — it gets marked forgotten. Soft deletion means recovery remains possible, but forgotten memories stop appearing in recall results. A `reason` parameter enables audit trails for debugging memory quality.

### Prompt Injection

The `prompt-builder.ts` module formats memories into two injected sections: a `## Static Profile` and `## Dynamic Profile` block for user context, and a `Search results for user's recent message:` block for query-specific recall. These combine via a `PromptTemplate` that defaults to `User Supermemories: \n{userMemories}\n{generalSearchMemories}`.

### Scoping with Container Tags

Memories are namespaced by `containerTag` strings. The `sm_project_` prefix enables project-level scoping. Multiple agents using the same tag share a memory pool; different tags maintain isolated contexts.

### Document Processing

The `IngestContentWorkflow` handles multi-modal inputs: PDFs, images (OCR), videos (transcription), code (AST-aware chunking). Connectors for Google Drive, Gmail, Notion, OneDrive, and GitHub sync on 4-hour cron intervals with real-time webhooks available.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| GitHub Stars | 20,994 | Repository |
| LongMemEval | 81.6%, #1 | Self-reported |
| LoCoMo | #1 | Self-reported |
| ConvoMem | #1 | Self-reported |
| Profile API latency | ~50ms | Self-reported |

All benchmarks are self-reported. Supermemory published MemoryBench, an open-source benchmarking framework, which allows independent reproduction — but the headline numbers come from Supermemory's own evaluations against its own infrastructure. The framework's existence is a partial credibility signal; the specific numbers should be treated as unverified until run independently.

## Framework Integrations

```typescript
// Vercel AI SDK
import { withSupermemory } from "supermemory/vercel"
const model = withSupermemory(openai("gpt-4o"), {
  apiKey: "sm_...",
  containerTag: "user_123",
})

// Mastra
import { withSupermemory } from "supermemory/mastra"
const agent = withSupermemory(config, "user-123", { mode: "full" })
```

The Vercel middleware intercepts `doGenerate` and `doStream`. The Mastra wrapper adds `beforeGenerate` and `afterGenerate` hooks. The OpenAI integration wraps at the fetch level. A Python agent framework provides equivalent tooling for non-TypeScript stacks.

The MCP server installs with:
```bash
npx -y install-mcp@latest https://mcp.supermemory.ai/mcp --client claude --oauth=yes
```

This exposes three tools: `memory` (save/forget), `recall` (semantic search), and `context` (full profile injection).

## Strengths

**Active memory management**: The temporal forgetting mechanism addresses the core failure mode of passive memory accumulation — stale or contradictory facts degrading recall quality over time. Most competitors accumulate; Supermemory curates.

**Single-call context assembly**: The profile API returns all three memory tiers in one request at ~50ms. Applications do not need to orchestrate separate retrieval steps for user context versus query-relevant recall.

**Multi-modal ingestion**: PDF, image, video, and code processing with AST-aware chunking is available without custom pipeline configuration.

**Broad framework support**: Vercel AI SDK, [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), [OpenAI Agents SDK](../projects/openai-agents-sdk.md), and Python agent frameworks all have dedicated integrations.

**Memory graph visualization**: The WebGL-based graph in `packages/memory-graph/` makes the otherwise-opaque memory structure inspectable. Users can see what the system remembers, when memories were created, and how they connect.

## Critical Limitations

**Cloud dependency without offline fallback**: The core memory engine — fact extraction, temporal reasoning, contradiction resolution — runs on Supermemory's Cloudflare infrastructure. The SDK packages are thin API clients. If the API is unavailable, all memory operations fail. The `cache.ts` module handles session-level request caching, not durability.

**Self-hosting is not practical**: The open-source repository contains SDK wrappers, UI components, and the MCP server. The memory processing logic itself is proprietary. Developers cannot inspect how contradiction resolution or forgetting actually work, only the API surface they produce.

**String-exact deduplication**: Semantically equivalent memories with different wording both survive into the injected prompt. At scale, this creates redundancy the system cannot resolve internally.

**Soft-delete storage growth**: Forgotten memories accumulate as soft-deleted entries. Storage grows monotonically. The documentation does not address periodic purging or storage cost at scale.

**Fixed ontology**: The static/dynamic/search structure is mandatory. Applications requiring custom memory types, hierarchical schemas, or entity-level attribution cannot express those shapes through the current API.

## When Not to Use It

**Regulated environments with data residency requirements**: All memories transit and persist on Supermemory's cloud infrastructure. Healthcare, finance, or government contexts requiring on-premises processing cannot use the hosted service.

**Applications needing deep memory inspection or auditing**: The contradiction resolution and temporal reasoning happen server-side in closed code. If an agent's behavior depends on understanding exactly why a memory was forgotten or how a contradiction was resolved, the opacity makes debugging difficult.

**Workloads requiring custom memory structure**: The three-tier ontology is not extensible. If the application needs memories organized by entity type, by relationship graph, or by confidence score, this structure will constrain rather than enable.

**High-frequency write workloads**: The API model implies a round-trip to Cloudflare for each memory operation. Applications generating thousands of memory writes per second will hit latency and cost ceilings that a locally-embedded vector store would avoid.

## Unresolved Questions

**Conflict resolution transparency**: How exactly does contradiction detection work? Is it semantic similarity against existing memories, keyword matching, or something else? The documentation describes the outcome (contradictions get resolved) but not the mechanism.

**Storage cost at scale**: The pricing model is not detailed in the repository. For applications with millions of users each accumulating hundreds of memories, what does storage cost? What are the API call limits and pricing tiers?

**Benchmark methodology**: LongMemEval at 81.6% is a specific number, but the evaluation setup matters. What model did the memory extraction use? What was the conversation length distribution? Running MemoryBench against a different LLM for extraction could produce different results.

**Soft-delete purging**: How do forgotten memories get permanently removed? Is there an administrative API? A retention policy? The documentation describes soft-deletion but not its lifecycle.

## Alternatives

**[Mem0](../projects/mem0.md)**: A closer functional analog, also providing a hosted memory API with automatic fact extraction. Mem0 is open-core and supports self-hosting of the core engine, which Supermemory does not. Use Mem0 when self-hosting or code-level inspection of memory logic is required.

**[Zep](../projects/zep.md)**: Focuses on long-term memory for conversational agents with a graph-based backend. More suitable for applications requiring structured entity and relationship tracking rather than user profile management.

**[Letta](../projects/letta.md)** (formerly [MemGPT](../projects/memgpt.md)): Provides in-context memory management with an open architecture. Better for research use cases requiring full control over the memory management loop.

**[Graphiti](../projects/graphiti.md)**: A temporal knowledge graph that tracks how facts change over time with explicit temporal edges. More expressive for applications where understanding the history of a belief matters, not just its current state.

**[OpenMemory](../projects/openmemory.md)**: Local-first memory MCP server. Appropriate when data must not leave the user's machine.

**Direct [Vector Database](../concepts/vector-database.md) + [RAG](../concepts/retrieval-augmented-generation.md)**: Use [ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), or [FAISS](../projects/faiss.md) directly when the application requires custom chunking strategies, metadata filtering beyond Supermemory's API surface, or needs to avoid per-call API costs at high query volume.

## Related Concepts

[Agent Memory](../concepts/agent-memory.md) · [Long-Term Memory](../concepts/long-term-memory.md) · [Semantic Memory](../concepts/semantic-memory.md) · [Episodic Memory](../concepts/episodic-memory.md) · [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) · [Hybrid Search](../concepts/hybrid-search.md) · [Context Engineering](../concepts/context-engineering.md) · [Model Context Protocol](../concepts/model-context-protocol.md) · [Progressive Disclosure](../concepts/progressive-disclosure.md)

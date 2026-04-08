---
url: 'https://github.com/supermemoryai/supermemory'
type: repo
author: supermemoryai
date: '2026-04-04'
tags:
  - agent-memory
  - context-engineering
  - forgetting-mechanisms
  - temporal-reasoning
  - user-profiles
  - memory-graph
  - contradiction-handling
  - multi-modal-ingestion
key_insight: >-
  Supermemory's core differentiator is treating forgetting as a first-class
  feature rather than a bug -- memories have temporal validity, contradictions
  trigger automatic supersession, and expired information is soft-deleted rather
  than accumulated, enabling an actively curated memory graph that stays
  relevant over time rather than degrading into a noisy fact store.
stars: 21000
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - CLAUDE.md
    - packages/tools/src/shared/types.ts
    - packages/tools/src/shared/memory-client.ts
    - packages/tools/src/shared/prompt-builder.ts
    - packages/tools/src/shared/context.ts
    - packages/tools/src/shared/cache.ts
    - packages/tools/src/tools-shared.ts
    - packages/tools/src/vercel/middleware.ts
    - packages/tools/src/vercel/index.ts
    - packages/tools/src/openai/middleware.ts
    - packages/tools/src/mastra/wrapper.ts
    - packages/tools/src/mastra/processor.ts
    - packages/tools/src/ai-sdk.ts
    - packages/tools/src/claude-memory.ts
    - packages/memory-graph/src/types.ts
    - packages/memory-graph/src/canvas/simulation.ts
    - packages/agent-framework-python/src/supermemory_agent_framework/tools.py
    - >-
      packages/agent-framework-python/src/supermemory_agent_framework/middleware.py
  analyzed_at: '2026-04-04'
  original_source: repos/supermemoryai-supermemory.md
relevance_scores:
  topic_relevance: 8
  practitioner_value: 8
  novelty: 7
  signal_quality: 8
  composite: 7.9
  reason: >-
    Supermemory's three-tier memory ontology (static/dynamic/search), temporal
    validity with supersession, and deduplication priority system are directly
    applicable and novel patterns for agent memory systems, with a
    well-documented architecture and SDK.
---

## Architecture Overview

Supermemory is a cloud-hosted memory and context engine that ships as a Turbo monorepo with multiple packages: `tools` (the primary SDK), `memory-graph` (visualization component), `ai-sdk` (Vercel AI SDK integration), `agent-framework-python` (Python agent SDK), and `apps/` (web dashboard, MCP server, Raycast extension). The core memory engine runs server-side on Cloudflare Workers with Hyperdrive (database), Cloudflare AI (embeddings), KV storage, and Workflows.

The architecture centers on a unified memory ontology with three distinct memory categories:

**Static Profile:** Core, stable facts about the user that rarely change -- name, profession, long-term preferences, goals. These are the foundational identity layer.

**Dynamic Profile:** Recently learned or frequently updated information -- current projects, recent interests, ongoing topics. This is the actively evolving context layer.

**Search Results:** Memories retrieved based on semantic similarity to the current query. These are the conversation-relevant layer, fetched on-demand.

This three-tier profile structure is the key design decision. Rather than treating all memories as a flat collection to search over, Supermemory separates stable identity from dynamic context from query-relevant retrieval. This enables different update frequencies, retention policies, and injection strategies for each tier.

The client-side SDK (`packages/tools/`) provides middleware and wrapper patterns for multiple frameworks: Vercel AI SDK, Mastra, OpenAI (direct), and a Python agent framework. All share a common core in `packages/tools/src/shared/` that handles API communication, memory deduplication, prompt building, and caching.

## Core Mechanism

### The Profile API (v4)

The central API endpoint is `POST /v4/profile`, which returns a `ProfileStructure`:

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

When called with just a `containerTag`, it returns the user's static and dynamic profile. When called with both `containerTag` and `q` (query), it also performs semantic search and returns matching memories in `searchResults`. This single endpoint powers all three retrieval modes: profile-only, query-only, and full (combined).

### Memory Deduplication

A critical engineering detail: memories can overlap across static, dynamic, and search results. The `deduplicateMemories()` function in `tools-shared.ts` resolves this with a priority system: Static > Dynamic > Search Results. It maintains a `seenMemories` Set, processing static items first, then dynamic (skipping duplicates), then search results (skipping duplicates). This ensures the most authoritative version of each memory wins.

### Three Retrieval Modes

The `MemoryMode` type defines three strategies:

- **`"profile"`**: Retrieves static + dynamic profile without any query filtering. Used at conversation start to inject user context. Returns `userMemories` markdown only.
- **`"query"`**: Searches memories based on semantic similarity to the user's message. Returns `generalSearchMemories` only. Used for mid-conversation recall.
- **`"full"`**: Combines both -- profile context plus query-relevant memories. The default mode for most integrations.

The `extractQueryText()` function pulls the last user message from the message array, handling string content, multi-part content arrays, and nested content objects (for different provider formats).

### Memory Persistence Modes

The `AddMemoryMode` type controls whether conversations are saved:
- **`"always"`**: Automatically save conversations as memories. The default for most use cases.
- **`"never"`**: Only retrieve memories, never store new ones. Useful for read-only contexts or when memory updates should be explicit.

### Forgetting as a Feature

Supermemory's most distinctive mechanism is explicit forgetting. The `memoryForget` tool soft-deletes memories by ID or content match:

```typescript
TOOL_DESCRIPTIONS.memoryForget = "Forget (soft delete) a specific memory by ID or content match. The memory is marked as forgotten but not permanently deleted."
```

This is not just cleanup -- it is a deliberate design choice. Memories have temporal validity. When a user says "I no longer use Python, I switched to Rust," the old preference should not just be superseded but actively forgotten. The soft-delete approach means forgotten memories can be recovered if needed, but they stop appearing in recall results.

The `reason` parameter for forgetting enables audit trails -- why was this memory removed? This is valuable for debugging memory quality and understanding what the system learned to forget.

### Prompt Injection Strategy

The prompt builder (`prompt-builder.ts`) formats memories into two sections injected into the system prompt:

1. **User Memories**: Markdown-formatted static + dynamic profile with `## Static Profile` and `## Dynamic Profile` sections, each as bulleted lists.
2. **Search Results**: Query-relevant memories formatted as `Search results for user's recent message: \n- memory1\n- memory2`.

These are combined via a `PromptTemplate` function that can be customized per integration. The default template is simply: `User Supermemories: \n{userMemories}\n{generalSearchMemories}`.

### Container Tags (Scoping)

Memories are scoped by `containerTag` -- a string that acts as a namespace. The system supports project-based scoping via a `sm_project_` prefix. This enables:
- Per-user memory: `containerTag: "user_123"`
- Per-project memory: `containerTag: "sm_project_myapp"`
- Shared memory: Multiple agents using the same containerTag

### Memory Graph Visualization

The `packages/memory-graph/` module provides a WebGL-based graph visualization of the memory ontology. It renders nodes (memories) and edges (relationships) with force-directed simulation, supporting pan/zoom, node selection, and detail panels. The graph makes the otherwise-opaque memory structure inspectable -- users can see what the system remembers, how memories are connected, and when they were created or updated.

## Design Tradeoffs

### Cloud-first architecture
Supermemory is primarily a hosted service. The SDK packages are thin clients that call the Supermemory API. The memory engine, embedding pipeline, and storage all run server-side. This enables powerful features (automatic fact extraction, contradiction handling, temporal reasoning) at the cost of a cloud dependency. Self-hosting is not straightforward -- the web app uses Cloudflare Workers, Hyperdrive, and proprietary AI infrastructure.

### Unified ontology vs flexible schema
The three-tier profile structure (static/dynamic/search) is fixed. Unlike Memori's entity-attribution model or Acontext's freeform skill files, Supermemory imposes a specific memory structure. This simplifies the developer experience (one API call returns everything) but limits expressiveness. Custom memory types or hierarchies are not supported.

### Soft-delete forgetting vs hard-delete
Forgotten memories are soft-deleted, not permanently removed. This is safer (recoverable) but means storage grows monotonically. For long-running applications with frequent memory updates, the accumulation of soft-deleted entries could impact search performance if not periodically purged.

### Framework middleware vs SDK wrapping
Supermemory uses middleware patterns for Vercel AI SDK and OpenAI, rather than monkey-patching like Memori. The Vercel middleware intercepts the `wrapLanguageModel` call, while the OpenAI middleware wraps the completion handler. This is cleaner than monkey-patching but requires explicit integration points in the application code.

### Memory-per-message vs memory-per-conversation
Supermemory stores memories at the fact level, not the conversation level. Each fact extracted from a conversation becomes a separate memory entry. This enables fine-grained recall and forgetting but loses conversational context -- you can recall "user prefers TypeScript" but not the full conversation where that preference was discussed.

## Failure Modes & Limitations

### Cloud dependency as single point of failure
If the Supermemory API is down, all memory operations fail. The SDK does not cache memories locally for offline fallback. The `cache.ts` module in the shared package appears to handle some request caching, but it is a session-level optimization, not a durability mechanism.

### No local/self-hosted option for the core engine
While the SDK and visualization packages are open-source, the core memory engine (fact extraction, temporal reasoning, contradiction handling) runs on Supermemory's infrastructure. The open-source repository primarily contains SDK wrappers and UI components, not the memory processing logic itself. This limits deep inspection of how forgetting, contradictions, and temporal reasoning actually work.

### Profile size limits
The static/dynamic profile is returned as arrays of memory strings. For users with extensive history, the profile could grow large enough to consume significant context window space. The deduplication and three-tier separation help, but there is no documented mechanism for profile size management or automatic pruning.

### Deduplication limitations
The deduplication is string-based exact matching. Semantically equivalent memories with different wording (e.g., "User likes TypeScript" vs "User prefers TypeScript for all projects") will not be deduplicated. This could lead to redundant information in the prompt.

### Metadata opacity
Memory items carry an optional `metadata?: Record<string, unknown>` field, but the SDK does not provide tools for querying or filtering by metadata. The metadata is passed through but not leveraged for recall quality.

## Integration Patterns

### Vercel AI SDK (primary TS integration)
```typescript
import { withSupermemory } from "supermemory/vercel"
const model = withSupermemory(openai("gpt-4o"), {
  apiKey: "sm_...",
  containerTag: "user_123",
})
```
The middleware wraps the language model and intercepts the `doGenerate` and `doStream` methods. It builds memories text from the profile API, injects it into the system prompt, and optionally saves the conversation response as new memories.

### Mastra framework
```typescript
import { withSupermemory } from "supermemory/mastra"
const wrappedAgent = withSupermemory(agent, { apiKey: "sm_...", userId: "user_123" })
```
The Mastra wrapper provides a `beforeGenerate` hook that fetches and injects memories, and an `afterGenerate` hook that persists new memories. The processor handles Mastra-specific message formats and tool call extraction.

### OpenAI direct
```typescript
import { createSupermemoryMiddleware } from "supermemory/openai"
const middleware = createSupermemoryMiddleware({ apiKey: "sm_..." })
// Wraps fetch to intercept OpenAI API calls
```
Uses fetch-level interception to add memory context to OpenAI API requests.

### Python agent framework
```python
from supermemory_agent_framework import SupermemoryTools, SupermemoryMiddleware
tools = SupermemoryTools(api_key="sm_...")
middleware = SupermemoryMiddleware(api_key="sm_...", container_tag="user_123")
```
Provides tool definitions for agent frameworks and middleware for automatic memory injection.

### MCP server
```bash
npx -y install-mcp@latest https://mcp.supermemory.ai/mcp --client claude --oauth=yes
```
The MCP server exposes three tools: `memory` (save/forget), `recall` (search), and `context` (full profile injection). OAuth-based authentication for Claude Desktop, Cursor, etc.

## Benchmarks & Performance

**Benchmark rankings:**
- #1 on LongMemEval (long-term memory evaluation)
- #1 on LoCoMo (long-conversation memory)
- #1 on ConvoMem (conversational memory from Salesforce)

These are the three major benchmarks for AI memory systems. Supermemory's dominance across all three suggests its unified ontology and active memory management (including forgetting) produce superior recall quality compared to passive accumulation approaches.

**User profiles in ~50ms:** The profile API returns static + dynamic profile in approximately 50ms, making it fast enough for real-time conversation injection without noticeable latency. This is enabled by the cloud infrastructure (Cloudflare edge, Hyperdrive database proxy) and pre-computed profile structures.

**Document processing pipeline:** The `IngestContentWorkflow` handles multi-modal content: PDFs, images (OCR), videos (transcription), and code (AST-aware chunking). Content is automatically summarized, tagged, vector-embedded, and chunked for semantic search. Cron triggers run every 4 hours for connector imports (Google Drive, Gmail, Notion, OneDrive, GitHub).

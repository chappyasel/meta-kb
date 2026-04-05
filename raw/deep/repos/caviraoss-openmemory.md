---
url: 'https://github.com/CaviraOSS/OpenMemory'
type: repo
author: CaviraOSS
date: '2026-04-04'
tags:
  - agent-memory
  - knowledge-bases
  - context-engineering
  - self-improving
  - agentic-skills
key_insight: >-
  OpenMemory implements a Hierarchical Sector Graph (HSG) that automatically
  classifies memories into cognitive sectors (episodic, semantic, procedural,
  emotional, reflective) using regex-based routing, applies biologically-inspired
  dual-phase exponential decay with configurable lambda rates per sector, and
  performs automatic reflection by clustering similar memories and consolidating
  patterns -- achieving a cognitively-grounded memory system that self-organizes
  without requiring explicit user curation.
stars: 3860
deep_research:
  method: source-code-analysis
  files_analyzed:
    - packages/openmemory-js/src/core/memory.ts
    - packages/openmemory-js/src/core/types.ts
    - packages/openmemory-js/src/memory/decay.ts
    - packages/openmemory-js/src/memory/hsg.ts
    - packages/openmemory-js/src/memory/reflect.ts
    - packages/openmemory-js/src/ops/compress.ts
    - packages/openmemory-js/src/ops/dynamics.ts
    - packages/openmemory-js/src/temporal_graph/store.ts
    - packages/openmemory-js/src/core/cfg.ts
    - packages/openmemory-js/src/index.ts
    - packages/openmemory-js/src/server/routes/memory.ts
  analyzed_at: '2026-04-04'
  original_source: repos/caviraoss-openmemory.md
---

## Architecture Overview

OpenMemory is a cognitive memory engine for LLMs and agents that provides what the README explicitly positions as "real long-term memory for AI agents. Not RAG. Not a vector DB." The project is currently undergoing a full rewrite with breaking changes expected. It is self-hosted, dual-SDK (Python + Node.js), and designed to replace simpler memory solutions like vector databases or basic RAG patterns.

The positioning against RAG and vector databases is deliberate -- OpenMemory adds cognitive-science-inspired mechanisms (sector classification, decay, reflection, temporal reasoning) on top of vector embeddings rather than treating embeddings as the end product. The README emphasizes composite scoring (salience, recency, coactivation) over simple cosine similarity, adaptive forgetting per sector over fixed TTLs, and explainable recall with waypoint traces over opaque retrieval.

The project supports three deployment modes:

1. **Python SDK** (`packages/openmemory-py/`) -- local SQLite, pip-installable as `openmemory-py`
2. **Node.js SDK** (`packages/openmemory-js/`) -- embedded or server-connected, npm-installable as `openmemory-js`
3. **Backend server** (`backend/`) -- HTTP API + MCP + dashboard + multi-user support

The TypeScript package is the primary implementation, with this architecture:

```
packages/openmemory-js/src/
  core/        -- Memory class, DB layer, config, types, vector store
  memory/      -- HSG (sector graph), decay, reflection, embedding, user summary
  ops/         -- compression, dynamics, extraction, ingestion
  temporal_graph/ -- temporal fact store, queries, timeline
  server/      -- Express API with route handlers
  ai/          -- MCP tools, graph operations
  sources/     -- GitHub, Notion, Google Drive/Sheets/Slides, OneDrive, web crawler
  utils/       -- text processing, keyword extraction, chunking
```

The core `Memory` class (`src/core/memory.ts`) is the primary API surface:

```typescript
const mem = new Memory(user_id);
await mem.add(content, { tags, ...metadata });
const results = await mem.search(query, { limit: 10, sectors: ['episodic'] });
const github = mem.source("github");
```

Storage uses SQLite via better-sqlite3 for metadata and relational data, with pluggable vector stores (PostgreSQL/pgvector, Valkey) for embeddings. The server exposes an Express API with routes for memory CRUD, dashboard data, temporal graph operations, IDE events, LangGraph integration, compression, sources, user management, and system health.

The project also includes a Next.js dashboard (`dashboard/`), VSCode extension (`apps/vscode-extension/`), migration tools (`tools/migrate/`), CLI tool (`opm`), and configuration for one-click deployment to Render, Vercel, DigitalOcean, and Heroku.

## Core Mechanism

### Hierarchical Sector Graph (HSG)

The most distinctive mechanism is the Hierarchical Sector Graph in `src/memory/hsg.ts`. This is what separates OpenMemory from simpler vector-based memory systems. It classifies every memory into one of five cognitive sectors using regex-based pattern matching:

```typescript
export const sector_configs: Record<string, sector_cfg> = {
    episodic: {
        model: "episodic-optimized",
        decay_lambda: 0.015,
        weight: 1.2,
        patterns: [
            /\b(today|yesterday|tomorrow|last\s+(week|month|year))\b/i,
            /\b(remember\s+when|recall|that\s+time|when\s+I)\b/i,
            /\b(went|saw|met|felt|heard|visited|attended)\b/i,
            ...
        ],
    },
    semantic: { decay_lambda: 0.005, weight: 1.0, patterns: [...] },
    procedural: { decay_lambda: 0.008, weight: 1.1, patterns: [...] },
    emotional: { decay_lambda: 0.02, weight: 1.3, patterns: [...] },
    reflective: { decay_lambda: 0.001, weight: 0.8, patterns: [...] },
};
```

The five sectors map to established cognitive science categories:

- **Episodic** (decay_lambda=0.015, weight=1.2) -- Event-based memories with temporal markers ("yesterday", "when I"). Decays relatively fast, reflecting how specific event details fade. Higher weight means episodic matches score higher in retrieval.
- **Semantic** (decay_lambda=0.005, weight=1.0) -- Factual knowledge and definitions. Slowest base decay rate, reflecting how factual knowledge persists. Baseline weight.
- **Procedural** (decay_lambda=0.008, weight=1.1) -- How-to knowledge and processes. Medium decay, slightly elevated weight for actionable information.
- **Emotional** (decay_lambda=0.02, weight=1.3) -- Affect-laden memories. Fastest decay but highest weight, reflecting how emotional memories are vivid but time-limited. The README lists "emotional" as a distinct memory type.
- **Reflective** (decay_lambda=0.001, weight=0.8) -- Meta-cognitive insights and patterns. Slowest decay of all (knowledge about knowledge persists longest), but lowest weight (reflections are supplementary, not primary recall).

Cross-sector relationships are encoded in an explicit adjacency matrix that captures how different memory types relate to each other:

```typescript
export const sector_relationships: Record<string, Record<string, number>> = {
    semantic: { procedural: 0.8, episodic: 0.6, reflective: 0.7, emotional: 0.4 },
    procedural: { semantic: 0.8, episodic: 0.6, reflective: 0.6, emotional: 0.3 },
    episodic: { reflective: 0.8, semantic: 0.6, procedural: 0.6, emotional: 0.7 },
    ...
};
```

These weights affect cross-sector retrieval -- when searching episodic memories, reflective memories get an 0.8 boost while emotional memories get 0.7. The asymmetry is deliberate (e.g., episodic->emotional is 0.7 but emotional->episodic is also high, reflecting how emotional events are episodically memorable).

Search scoring combines five weighted factors for a composite relevance score:

```typescript
export const scoring_weights = {
    similarity: 0.35,   // vector cosine similarity
    overlap: 0.20,      // token overlap with query
    waypoint: 0.15,     // graph connectivity
    recency: 0.10,      // time decay
    tag_match: 0.20,    // explicit tag matching
};
```

This composite scoring is a key differentiator from pure vector-similarity systems. The README specifically highlights "composite scoring: salience, recency, and coactivation rather than simple similarity." The waypoint factor (0.15 weight) implements explainable recall by tracking which graph nodes were traversed during retrieval.

### Dual-Phase Exponential Decay

The decay system (`src/memory/decay.ts`) implements biologically-inspired memory attenuation that the README describes as "adaptive forgetting per sector instead of fixed TTLs." Memories are classified into three temperature tiers:

```typescript
const pick_tier = (m, now_ts) => {
    const dt = Math.max(0, now_ts - (m.last_seen_at || m.updated_at || now_ts));
    const recent = dt < 6 * 86_400_000;     // 6 days
    const high = (m.coactivations || 0) > 5 || (m.salience || 0) > 0.7;
    if (recent && high) return "hot";
    if (recent || (m.salience || 0) > 0.4) return "warm";
    return "cold";
};
```

Each tier has different decay rates: hot (lambda=0.005, near-permanent while active), warm (lambda=0.02, moderate fading), cold (lambda=0.05, rapid attenuation). The tier classification depends on both recency (accessed within 6 days) and importance (coactivation count > 5 or salience > 0.7).

The dynamics module (`src/ops/dynamics.ts`) implements the signature dual-phase decay formula that models the distinction between short-term and long-term memory:

```typescript
// Fast decay + slow consolidation
export async function calculateDualPhaseDecayMemoryRetention(t) {
    const f = Math.exp(-LAMBDA_ONE_FAST_DECAY_RATE * t);      // 0.015
    const s = THETA_CONSOLIDATION * Math.exp(-LAMBDA_TWO * t); // 0.4 * exp(-0.002t)
    return Math.max(0, Math.min(1, f + s));
}
```

The two phases model a well-established cognitive science finding: initial rapid forgetting (the Ebbinghaus curve, lambda_1=0.015) followed by a consolidated residual that decays much more slowly (lambda_2=0.002, with a consolidation coefficient THETA=0.4). Memories that survive the fast decay phase are treated as consolidated knowledge. The retention value is clamped to [0, 1] and affects both retrieval scoring and storage decisions.

The decay also implements vector compression for cold memories -- as memories cool, their vector representations are compressed through mean pooling:

```typescript
const compress_vector = (vec, f, min_dim = 64, max_dim = 1536) => {
    const tgt_dim = Math.max(min_dim, Math.min(max_dim, Math.floor(src.length * f)));
    // Mean pooling: bucket adjacent dimensions
    for (let i = 0; i < src.length; i += bucket)
        pooled.push(mean(src.slice(i, i + bucket)));
    normalize(pooled);
    return pooled;
};
```

Cold memories get their vectors compressed to as few as 64 dimensions (from 1536), reducing storage while maintaining approximate semantic content. When a cold memory is accessed, it can be regenerated (reinforce_on_query=true). This implements a form of memory consolidation where less-accessed memories occupy progressively less storage space -- analogous to how the brain compresses rarely-accessed memories into more abstract representations.

### Automatic Reflection

The reflection system (`src/memory/reflect.ts`) runs as a periodic background job that creates higher-order knowledge from accumulated memories. This implements the self-improving aspect highlighted in the README's "composite scoring" claim:

1. **Clustering**: Groups memories by primary sector using Jaccard similarity > 0.8 threshold
2. **Salience scoring**: Calculates importance based on frequency (0.6 weight), recency (0.3), and emotional content (0.1)
3. **Summarization**: Creates reflective memories that consolidate patterns
4. **Source marking**: Marks source memories as consolidated to prevent re-processing
5. **Reinforcement**: Boosts salience of source memories by 1.1x

```typescript
export const run_reflection = async () => {
    const mems = await q.all_mem.all(100, 0);
    if (mems.length < min) return { created: 0, reason: "low" };
    const cls = cluster(mems);
    for (const c of cls) {
        const txt = summ(c);   // "N sector pattern: content1; content2; ..."
        const s = sal(c);       // weighted frequency + recency + emotion
        await add_hsg_memory(txt, j(["reflect:auto"]), meta);
        await mark(src);        // mark as consolidated
        await boost(src);       // 1.1x salience boost
    }
};
```

Reflection runs on a configurable interval (default 10 minutes) and requires a minimum memory count (default 20) before activating. The created reflections are classified as "reflective" sector memories, which have the slowest decay rate (lambda=0.001) -- meaning automatically generated insights persist longest in the system.

### Temporal Graph

The temporal graph system (`src/temporal_graph/`) adds time-bounded fact management -- what the README describes as "point-in-time reasoning with valid_from/valid_to windows":

```typescript
export const insert_fact = async (subject, predicate, object, valid_from, confidence, ...) => {
    // Close any existing open facts for the same subject+predicate
    for (const old of existing) {
        if (old.valid_from < valid_from_ts) {
            await run_async(`UPDATE temporal_facts SET valid_to = ? WHERE id = ?`,
                [valid_from_ts - 1, old.id]);
        }
    }
    // Insert new fact with open-ended validity
    await run_async(`INSERT INTO temporal_facts (..., valid_to) VALUES (..., NULL)`, [...]);
};
```

This implements bitemporal fact management where facts have explicit valid_from/valid_to ranges. When a new contradicting fact is inserted for the same subject+predicate pair, the previous fact is automatically closed (its valid_to set to just before the new fact's valid_from). This enables point-in-time queries: "Where did John work in 2023?" can return a different answer than "Where does John work now?"

Confidence decay is applied periodically to open-ended facts, modeling the uncertainty that grows with time:

```sql
UPDATE temporal_facts
SET confidence = MAX(0.1, confidence * (1 - decay_rate * ((now - valid_from) / one_day)))
WHERE valid_to IS NULL AND confidence > 0.1
```

Facts never decay below 0.1 confidence, ensuring they remain available for retrieval even when highly uncertain. The temporal API is exposed via REST endpoints: `POST /api/temporal/fact` for storage and query endpoints for point-in-time retrieval.

### Memory Compression Engine

The compression engine (`src/ops/compress.ts`) provides three levels of text compression, designed to reduce token consumption when memories are retrieved:

- **Semantic**: Removes duplicate sentences, filler words ("just", "really", "basically"), verbose phrases ("at this point in time" -> "now")
- **Syntactic**: Applies contractions ("do not" -> "don't"), removes redundant articles, collapses whitespace
- **Aggressive**: All of the above plus abbreviations ("JavaScript" -> "JS", "database" -> "db", "configuration" -> "config"), URL stripping, markdown removal

Results are cached by content hash with a 500-entry LRU. The engine tracks compression metrics (original tokens, compressed tokens, ratio, savings percentage) for observability. This is a purely algorithmic compression -- no LLM is involved, unlike claude-mem's approach.

### Embedding Providers and Synthetic Fallback

OpenMemory supports multiple embedding providers to generate the vector representations that underlie semantic search: OpenAI, Google Gemini, Ollama (for local/private models), AWS (Bedrock), and a synthetic fallback. The synthetic fallback is particularly notable -- it means the system can operate without any external API, generating approximate embeddings through algorithmic means. This enables fully offline operation, though with reduced semantic quality compared to model-based embeddings.

The embedding dimension is configurable from 64 to 1536, allowing memory-constrained deployments to trade precision for storage. This configuration interacts with the vector compression system: cold memories are compressed from their original embedding dimension down to as few as 64 dimensions, and the minimum dimension floor ensures even heavily compressed vectors retain enough information for approximate matching.

### User Summary System

The user summary module (`src/memory/user_summary.ts`) generates and maintains per-user summaries that consolidate a user's memory patterns into a high-level profile. This is a form of meta-memory -- rather than searching individual memories, consuming applications can query the user summary for a compressed representation of what the system knows about a user. The summary updates as new memories are added and old ones decay, providing a living portrait that evolves over time.

### Core API Operations

The README documents five core operations for the Memory API:

- **add()** -- Store memories with content, tags, and metadata. The HSG automatically classifies the sector.
- **search()** -- Query by semantic similarity with composite scoring (similarity + overlap + waypoint + recency + tag_match). Supports sector-specific filtering.
- **get()** -- Retrieve specific memory by ID.
- **delete()** -- Remove memories.
- **reinforce()** -- Explicitly strengthen memory retention, boosting salience and coactivation count. This is the manual counterpart to the automatic reflection system.

The CLI tool (`opm`) provides direct engine/server access:
```bash
opm add "memory text" --user u1 --tags preference
opm query "search term" --user u1 --limit 5
opm list --user u1
opm reinforce <id>
opm stats
```

## Design Tradeoffs

**Regex-based sector classification vs. LLM classification.** Using regex patterns for memory sector classification is fast and deterministic but limited. The patterns are hardcoded and English-centric (e.g., "remember when", "how to"). This trades accuracy for speed and zero-LLM-cost classification. A semantic memory about protein folding might not match any semantic patterns and default to the wrong sector. The cognitive science framing is compelling, but the implementation is crude compared to what an LLM classifier could achieve.

**Local-first SQLite vs. distributed storage.** All data lives in a local SQLite database. This is ideal for privacy and single-machine use (the README emphasizes "self-hosted"), but prevents multi-device access, team sharing, or cloud backup. The vector store abstraction (pgvector, Valkey) provides some flexibility, but the core metadata store is always SQLite. The one-click deployment options (Render, Vercel, DigitalOcean, Heroku) suggest the project is working toward server-hosted multi-user scenarios.

**Cognitive-science-inspired decay vs. simpler TTL.** The dual-phase decay with sector-specific lambda rates is more sophisticated than simple TTL-based expiration. However, the numerical parameters (lambda_hot=0.005, lambda_warm=0.02, etc.) appear to be hand-tuned rather than empirically derived. The consolidation coefficient (THETA=0.4) particularly affects how much long-term knowledge is retained. The README positions this as "adaptive forgetting per sector instead of fixed TTLs," which accurately describes the mechanism.

**Vector compression for cold memories.** Compressing vectors from 1536 to 64 dimensions via mean pooling significantly reduces storage but loses fine-grained semantic distinctions. This is a deliberate trade of retrieval precision for storage efficiency on rarely-accessed memories. The regeneration capability (re-embedding on query hit) partially compensates but requires the original content to be preserved.

**No LLM for core operations.** Unlike Cognee (which uses LLMs for entity extraction) or claude-mem (which uses LLMs for observation compression), OpenMemory's core add/search/reflect operations are purely algorithmic. This means no API costs for memory management but also no semantic understanding beyond embeddings. The sector classification, compression, and reflection all use heuristic methods. This is a principled tradeoff -- the README positions the system as infrastructure that sits below the LLM layer rather than depending on it.

**Composite scoring complexity.** The 5-factor scoring formula (similarity 0.35, overlap 0.20, waypoint 0.15, recency 0.10, tag_match 0.20) with sector-specific weights and cross-sector relationship matrices creates a complex retrieval model. While more expressive than pure cosine similarity, the interaction between all these factors makes it difficult to predict or debug retrieval behavior.

**Terse variable names.** The codebase uses extremely abbreviated variable names throughout (e.g., `q` for queries, `j` for JSON.stringify, `sal` for salience, `f` for factor). This reduces readability significantly. Functions like `calculateDynamicSalienceWithTimeDecay(i, lambda, r, e, t)` have single-letter parameters despite implementing complex formulas.

**Dual SDK maintenance.** Maintaining both TypeScript and Python SDKs doubles the implementation surface. The README lists both as first-class installation options. The two implementations may diverge in behavior, especially for complex mechanisms like the HSG scoring or decay formulas.

## Failure Modes & Limitations

**Sector misclassification.** The regex-based sector classification can easily misclassify memories. A procedural memory about emotional regulation ("how to manage stress") would match both procedural ("how to") and emotional ("stress") patterns. The classification logic determines which sector's decay rate and search weight apply, so misclassification affects both retention and retrieval. The English-centric patterns also mean non-English content will likely default to incorrect sectors.

**Reflection quality.** The reflection system uses Jaccard similarity > 0.8 for clustering and a simple sentence concatenation for summarization (`N sector pattern: content1; content2; ...`). This is extractive rather than abstractive -- it does not synthesize insights, just groups similar content. The resulting "reflections" are pattern descriptions rather than genuine meta-cognitive insights. The minimum threshold of 20 memories and 10-minute interval may also miss important patterns that form quickly.

**Hardcoded cognitive parameters.** The decay rates, scoring weights, sector relationships, and reinforcement constants are all hardcoded. There is no mechanism to tune these based on actual retrieval performance. The values reference cognitive science concepts but appear to be educated guesses rather than empirically validated for LLM memory use cases. The dynamics module defines named constants (ALPHA=0.15, BETA=0.2, GAMMA=0.35, THETA=0.4, ETA=0.18, LAMBDA_1=0.015, LAMBDA_2=0.002, TAU=0.4) that form the cognitive architecture, but none are configurable at runtime.

**Scale limitations.** The reflection job fetches up to 100 memories and processes them sequentially. The decay job iterates all memories in the database. Neither has efficient indexing or batch processing for large memory stores. The `applyDualPhaseDecayToAllMemories()` function runs individual UPDATE statements per memory via `Promise.all()`, which could overwhelm SQLite's write path. The 60-second decay cooldown helps but doesn't address the O(n) per-run cost.

**Temporal graph is append-mostly.** The temporal fact store closes old facts when contradicting facts are inserted, but only matches on subject+predicate pairs. This means nuanced temporal reasoning (e.g., "John lived in NYC from 2020-2023 and in SF from 2023-present") requires precise predicate matching. Paraphrased predicates ("lives in" vs. "resides in" vs. "is based in") create duplicate fact timelines. Without LLM-based predicate normalization, the temporal graph accumulates redundant fact chains.

**Compression abbreviations are lossy.** The aggressive compression mode replaces "JavaScript" with "JS", "database" with "db", etc. These substitutions are applied via regex and are irreversible (original content is preserved separately). If downstream consumers need full-form terms for search or display, they must use the uncompressed version. The abbreviation mappings are also English-centric and domain-specific.

**Migration path uncertainty.** The README notes the project is "currently undergoing a full rewrite with breaking changes expected." Migration tools exist for importing from Mem0, Zep, and SuperMemory, but the rewrite may invalidate existing data formats. The migration support signals ambition to replace incumbent memory solutions, but the breaking-changes warning is a risk for production adopters.

**User summary staleness.** The user summary system generates per-user profiles from accumulated memories, but the summary update mechanism is tied to memory additions and periodic reflection. If a user's patterns change significantly (new role, new project, new preferences), the summary may lag behind the actual memory state, particularly if old memories decay slowly in the semantic or reflective sectors.

**Embedding provider switching.** While multiple embedding providers are supported, switching providers mid-deployment changes the vector space. Existing embeddings generated by one provider are not compatible with embeddings from another. The synthetic fallback embeddings are particularly incompatible with model-based embeddings, meaning a deployment that starts with synthetic fallback and later switches to OpenAI will have inconsistent vector representations until all memories are re-embedded.

## Integration Patterns

**Source Connectors.** Seven pluggable source connectors for data ingestion, each following a base class pattern with `connect()` and `ingest_all()` methods:
- GitHub (repositories)
- Notion (pages/databases)
- Google Drive, Sheets, Slides
- OneDrive
- Web Crawler

These allow OpenMemory to ingest external knowledge sources, not just user-provided text.

**IDE Integration.** The VSCode extension (`apps/vscode-extension/`, published on VS Code Marketplace) captures IDE events (edit, open, close, save, refactor, pattern_detected) and writes them to the memory server. It includes writers for multiple AI assistants: Claude, Copilot, Cursor, Windsurf, and Codex. This makes IDE activity a first-class input to the memory system.

**MCP Server.** `src/ai/mcp.ts` and `src/ai/mcp_tools.ts` provide Model Context Protocol integration with five tools documented in the README:
- `openmemory_query` -- search memories
- `openmemory_store` -- add memories
- `openmemory_list` -- list memories
- `openmemory_get` -- retrieve specific memory
- `openmemory_reinforce` -- strengthen memory retention

This enables Claude, Cursor, and other MCP-compatible AI tools to use OpenMemory as a persistent memory backend.

**LangGraph Integration.** `src/server/routes/langgraph.ts` provides LangGraph-compatible endpoints for store/retrieve/context/reflection operations, enabling OpenMemory as a memory backend for LangGraph agent workflows. This is a key integration for multi-agent systems.

**Agent Framework Support.** The README lists integrations with LangChain, CrewAI, AutoGen, and Streamlit, positioning OpenMemory as a universal memory layer for agent frameworks.

**REST API.** The Express server provides comprehensive HTTP routes for all operations: memory CRUD, search, compression, temporal graph, source connectors, IDE events, dashboard data, user management, and system health.

**Migration Tools.** `tools/migrate/` supports importing from Mem0, Zep, and SuperMemory -- indicating positioning as a replacement for existing memory solutions. The existence of these migration tools suggests the project targets users who have already invested in other memory systems.

**CLI Tool.** The `opm` command-line tool provides direct engine/server access for all memory operations: add, query, list, reinforce, stats. This enables scripting and automation of memory management.

**One-Click Deployment.** Configuration files for Render (`render.yaml`), Vercel (`vercel.json`), DigitalOcean (`.do/spec.yaml`), Heroku (`app.json`), and Docker Compose enable rapid deployment. The Docker Compose configuration includes an optional UI profile for the dashboard.

**Dashboard.** The Next.js dashboard (`dashboard/`) provides a web interface for memory exploration, visualization, and management beyond the CLI and API. The dashboard surfaces memory statistics, temporal graph visualizations, sector distributions, and system health metrics.

**Multi-User Support.** The backend server mode supports multiple users with user-scoped memory isolation. Each user has their own memory space, temporal graph, and user summary. The user management endpoints handle creation, authentication, and per-user configuration.

### Positioning in the Memory Tool Landscape

OpenMemory's README explicitly positions it against two alternatives: RAG and vector databases. The claim "Not RAG. Not a vector DB" reflects a deliberate architectural philosophy. Traditional RAG systems treat retrieval as a one-shot similarity search -- find the most similar chunks and inject them as context. Vector databases provide the similarity search primitive but add nothing on top. OpenMemory argues that real memory requires:

1. **Differentiated storage** -- not all memories are equal; episodic events should decay faster than semantic facts
2. **Active forgetting** -- memory systems that only accumulate become noisy; decay is a feature, not a bug
3. **Self-organization** -- the reflection system creates higher-order knowledge without human curation
4. **Temporal reasoning** -- facts change over time; a memory system must track when facts were true
5. **Composite relevance** -- similarity alone is insufficient; recency, salience, connectivity, and explicit tags all contribute to relevance

This positions OpenMemory as a cognitive layer that sits between the LLM and raw storage, providing memory management primitives that neither RAG nor vector databases offer. The migration tools from Mem0, Zep, and SuperMemory suggest the project targets users who have tried simpler approaches and found them insufficient.

The project also positions itself specifically for AI agents (LangChain, CrewAI, AutoGen integrations) and IDE-based AI assistants (VSCode extension with Claude, Copilot, Cursor, Windsurf, and Codex writers). This dual focus on agent frameworks and developer tools reflects the two primary markets for LLM memory: autonomous agents that need long-term context, and coding assistants that need project-level persistence.

## Benchmarks & Performance

The repository includes a benchmarking tool (`tools/ops/benchmark.py`) but no published results. Performance-relevant observations from the code and README:

- **Decay threading**: Configurable `OM_DECAY_THREADS` (default 3) for parallel decay processing, with chunk-based workload distribution:
  ```typescript
  const chunkz = <t>(arr: t[], k: number) => {
      const out: t[][] = Array.from({ length: n }, () => []);
      for (let i = 0; i < arr.length; i++) out[i % n].push(arr[i]);
      return out;
  };
  ```

- **Compression caching**: LRU cache with 500-entry max, keyed by algorithm + content hash. Avoids re-compressing identical content.

- **Decay cooldown**: 60-second minimum interval between decay runs, preventing excessive database churn from rapid query sequences:
  ```typescript
  let last_decay = 0;
  const cooldown = 60000;
  ```

- **Vector dimension flexibility**: Configurable from 64 to 1536 dimensions, allowing memory-constrained deployments to trade precision for storage. Cold memories are automatically compressed to lower dimensions.

- **Salience thresholds**: Hot (salience > 0.7 or coactivations > 5), warm (salience > 0.4), cold (below). These thresholds determine which decay rate applies and whether vector compression occurs.

- **Reflection minimum**: Requires 20+ memories before reflection activates, preventing noisy patterns from small datasets.

- **Multiple embedding providers**: OpenAI, Gemini, Ollama, AWS, and a synthetic fallback. The synthetic fallback means the system can operate without any external API, though with reduced semantic quality.

- **Explainable recall**: The waypoint scoring factor (0.15 weight) tracks which graph nodes are traversed during retrieval, providing an explanation trace for why specific memories were returned.

The dynamics module defines several named constants for the cognitive architecture that affect performance characteristics:
- ALPHA (recall reinforcement): 0.15
- BETA (emotional frequency): 0.2
- GAMMA (graph distance attenuation): 0.35
- THETA (consolidation coefficient): 0.4
- ETA (trace learning reinforcement): 0.18
- LAMBDA_1 (fast decay): 0.015
- LAMBDA_2 (slow decay): 0.002
- TAU (energy threshold): 0.4

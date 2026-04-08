---
entity_id: openmemory
type: project
bucket: agent-memory
abstract: >-
  OpenMemory is a self-hosted cognitive memory engine for LLM agents
  implementing sector-based storage
  (episodic/semantic/procedural/emotional/reflective) with biologically-inspired
  decay, composite scoring, and temporal fact tracking — differentiating from
  RAG by treating memory type and time as first-class concerns.
sources:
  - repos/thedotmack-claude-mem.md
  - repos/caviraoss-openmemory.md
  - deep/repos/caviraoss-openmemory.md
related:
  - retrieval-augmented-generation
  - episodic-memory
  - semantic-memory
last_compiled: '2026-04-08T02:56:45.635Z'
---
# OpenMemory

**Type:** Project — Agent Memory Infrastructure  
**License:** Apache-2.0  
**Language:** TypeScript (primary), Python (SDK)  
**Stars:** ~3,860 (self-reported)  
**Status:** Active rewrite — breaking changes expected

OpenMemory is a self-hosted memory engine for LLM agents. It stores, classifies, decays, and retrieves memories using cognitive-science-inspired mechanisms. The project positions itself against both RAG pipelines and vector databases, arguing that neither handles memory *type*, *temporal validity*, or *adaptive forgetting* — and then implements all three.

[Source](../raw/deep/repos/caviraoss-openmemory.md)

---

## What It Does and What's Architecturally Unique

Most memory systems for agents treat retrieval as a similarity search: embed text, store vectors, return top-k by cosine distance. OpenMemory adds five layers on top of that:

1. **Sector classification** — every memory is assigned to one of five cognitive categories (episodic, semantic, procedural, emotional, reflective), each with its own decay rate and retrieval weight
2. **Dual-phase exponential decay** — retention follows `R(t) = exp(-λ₁t) + θ·exp(-λ₂t)`, modeling the Ebbinghaus forgetting curve with a consolidated residual
3. **Composite scoring** — retrieval combines vector similarity (0.35), token overlap (0.20), graph waypoints (0.15), recency (0.10), and tag matching (0.20)
4. **Temporal knowledge graph** — facts carry `valid_from`/`valid_to` ranges; inserting a contradicting fact automatically closes the previous one
5. **Automatic reflection** — a background job clusters similar memories and generates higher-order "reflective" memories without user input

The result is a system that self-organizes over time rather than accumulating noise.

---

## Core Mechanism

### Hierarchical Sector Graph (HSG)

Defined in `packages/openmemory-js/src/memory/hsg.ts`. Every memory ingested runs through regex-based pattern matching that assigns a sector:

```typescript
export const sector_configs: Record<string, sector_cfg> = {
    episodic: { decay_lambda: 0.015, weight: 1.2, patterns: [/\b(today|yesterday)\b/i, ...] },
    semantic:  { decay_lambda: 0.005, weight: 1.0, patterns: [...] },
    procedural:{ decay_lambda: 0.008, weight: 1.1, patterns: [...] },
    emotional: { decay_lambda: 0.02,  weight: 1.3, patterns: [...] },
    reflective:{ decay_lambda: 0.001, weight: 0.8, patterns: [...] },
};
```

Sector assignment determines which decay rate applies and how much weight the memory carries in retrieval. Cross-sector retrieval uses an adjacency matrix — searching episodic memories gives reflective memories a 0.8 boost and emotional a 0.7 boost, reflecting how autobiographical and affective memory interact.

### Dual-Phase Decay

In `src/ops/dynamics.ts`:

```typescript
export async function calculateDualPhaseDecayMemoryRetention(t) {
    const f = Math.exp(-LAMBDA_ONE_FAST_DECAY_RATE * t);       // 0.015
    const s = THETA_CONSOLIDATION * Math.exp(-LAMBDA_TWO * t); // 0.4 * exp(-0.002t)
    return Math.max(0, Math.min(1, f + s));
}
```

Two phases: rapid initial forgetting (λ₁=0.015) followed by slow decay of consolidated knowledge (λ₂=0.002, θ=0.4). Memories below the warm threshold (salience < 0.4, not accessed in 6+ days) get their vectors compressed via mean pooling from up to 1536 dimensions down to 64, reducing storage while preserving approximate semantics.

### Automatic Reflection

`src/memory/reflect.ts` runs every 10 minutes (configurable) when ≥20 memories exist. It clusters memories by Jaccard similarity > 0.8, scores clusters by frequency (0.6), recency (0.3), and emotional content (0.1), then writes extractive summaries as new reflective-sector memories. Source memories get a 1.1× salience boost. Reflective memories have the slowest decay rate (λ=0.001), so these auto-generated insights outlast the raw events that produced them.

### Temporal Fact Store

`src/temporal_graph/` manages bitemporal facts. Inserting `{subject: "CompanyX", predicate: "has_CEO", object: "Bob", valid_from: "2024-04-10"}` automatically sets `valid_to` on Alice's prior fact. Confidence decays over time via periodic SQL updates, flooring at 0.1 so old facts remain retrievable but signal their uncertainty.

### Storage

Metadata and relational data go to SQLite via `better-sqlite3`. Vectors go to pluggable stores: pgvector, Valkey, or an in-process option. Five embedding providers are supported: OpenAI, Gemini, Ollama, AWS Bedrock, and a synthetic fallback that requires no external API.

---

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| GitHub stars | ~3,860 | Self-reported |
| GitHub forks | 439 | Self-reported |
| Embedding dimensions | 64–1536 (configurable) | Code |
| Decay cooldown | 60 seconds between runs | Code |
| Reflection minimum | 20 memories, 10-minute interval | Code |
| Compression cache | 500-entry LRU | Code |

No independent benchmarks exist. Performance numbers from the codebase (decay threading via `OM_DECAY_THREADS`, compression ratios) are implementation details, not validated results.

---

## Strengths

**Cognitive-type differentiation.** Separating episodic events from semantic facts matters for long-running agents. A conversation about what happened yesterday should decay faster than a user's stated preference. Most memory systems don't make this distinction.

**No LLM dependency for core operations.** Classification, compression, decay, and reflection are all algorithmic. No API calls required for memory management — only for embedding generation (and even that has a synthetic fallback). This keeps per-operation costs near zero and enables fully offline use.

**Temporal validity.** The bitemporal fact store handles a class of errors that pure vector memory cannot: outdated information. If an agent remembers "Alice is CEO" and the temporal graph has already closed that fact, the retrieval layer can surface the correct current state.

**MCP integration.** Five MCP tools (`openmemory_query`, `openmemory_store`, `openmemory_list`, `openmemory_get`, `openmemory_reinforce`) let Claude, Cursor, and Windsurf treat OpenMemory as a native tool without manual wiring.

**Source connectors.** GitHub, Notion, Google Drive, Google Sheets/Slides, OneDrive, and a web crawler feed external knowledge directly into the memory store. An IDE's coding history and a user's Notion workspace can coexist in the same cognitive model.

---

## Critical Limitations

**Concrete failure mode — sector misclassification cascades.** The regex-based classifier is English-centric and brittle. A procedural memory like "how to manage stress" matches both procedural patterns ("how to") and emotional patterns ("stress"). The winning sector determines decay rate and retrieval weight for the lifetime of that memory. Misclassification is silent — there is no feedback mechanism, no logging of classification confidence, and no way to audit sector assignments at scale. In a multi-language deployment, nearly all content will fall through to incorrect sectors.

**Unspoken infrastructure assumption — single-machine SQLite.** The architecture assumes one SQLite database per deployment. The one-click deploy options (Render, Vercel, DigitalOcean) work for single-instance server deployments, but horizontal scaling is not supported. The decay job runs `Promise.all()` over individual UPDATE statements for every memory in the database — on large stores this will saturate SQLite's write path. The 60-second cooldown helps but does not address the O(n) cost per run.

---

## When NOT to Use It

**Multi-tenant SaaS with high write volume.** The SQLite backend and single-process decay job cannot handle concurrent writes from many users. Each decay run touches all memories. Use Zep or Mem0's managed offering instead.

**Non-English content at scale.** The regex sector classifier is hardcoded for English idioms. All non-English memories will misclassify, getting wrong decay rates and weights. The planned "learned sector classifier" (on the roadmap) would fix this, but it does not exist yet.

**Production systems requiring stability.** The README states the project is "currently being fully rewritten" with "breaking changes and potential bugs expected." Migration tools exist for Mem0, Zep, and SuperMemory, but they only help after the rewrite stabilizes.

**Teams needing validated retrieval quality.** No benchmarks exist. The composite scoring weights (0.35/0.20/0.15/0.10/0.20) and cognitive parameters (THETA=0.4, λ₁=0.015, λ₂=0.002) are hand-tuned, not empirically derived. There is no way to measure whether the scoring function actually improves retrieval vs. cosine similarity alone.

---

## Unresolved Questions

**Parameter tuning.** The 18+ hardcoded constants in `dynamics.ts` (ALPHA=0.15, BETA=0.2, GAMMA=0.35, THETA=0.4, ETA=0.18, etc.) are fixed at compile time. There is no runtime configuration, no adaptive tuning, and no documentation explaining how these values were chosen. For a system that claims to model human memory, there is no reference to which cognitive science studies informed these specific numbers.

**Reflection quality.** Auto-generated reflections are extractive concatenations: `"N sector pattern: content1; content2; ..."`. They document co-occurrence, not insight. Whether these summaries improve downstream retrieval or just add noise is not evaluated.

**Embedding provider switching.** Switching from synthetic fallback to OpenAI mid-deployment produces incompatible vector spaces. The system provides no re-embedding tooling and no documentation on migration between providers.

**Governance of the rewrite.** The full rewrite is underway with no stated timeline or compatibility guarantees. The migration tools assume a stable source format. If the rewrite changes the SQLite schema, existing data may require manual migration.

**Multi-device sync.** Local-first SQLite means memory does not follow a user across devices. The server mode enables centralized access, but the relationship between local SDK instances and a central server is not documented for teams with mixed deployment modes.

---

## Alternatives

| Alternative | When to prefer it |
|-------------|-------------------|
| [Mem0](../projects/mem0.md) | Managed service, no ops overhead, simpler API surface, production-stable |
| [Zep](../projects/zep.md) | Graph-based fact extraction using LLMs, better at semantic deduplication, multi-tenant |
| [Letta](../projects/letta.md) / [MemGPT](../projects/memgpt.md) | Full agent framework with memory built in, not just a memory layer |
| [Graphiti](../projects/graphiti.md) | Temporal knowledge graphs with LLM-based entity extraction, stronger semantic understanding |
| Vector DB + [RAG](../concepts/retrieval-augmented-generation.md) | When retrieval quality is well-understood and cognitive-science abstractions add unnecessary complexity |

Use OpenMemory when: you want self-hosted, no-LLM-cost memory management with cognitive-type differentiation, you control the deployment environment, and you can tolerate a project in active rewrite.

---

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader problem this addresses
- [Episodic Memory](../concepts/episodic-memory.md) — one of the five sectors OpenMemory implements
- [Semantic Memory](../concepts/semantic-memory.md) — another sector, with the slowest base decay rate
- [Long-Term Memory](../concepts/long-term-memory.md) — the persistence layer OpenMemory provides to otherwise stateless LLMs
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — what OpenMemory explicitly positions itself against
- [Vector Database](../concepts/vector-database.md) — the storage primitive OpenMemory wraps with cognitive mechanisms
- [Hybrid Search](../concepts/hybrid-search.md) — composite scoring combines semantic and lexical signals
- [Model Context Protocol](../concepts/model-context-protocol.md) — OpenMemory exposes five MCP tools for IDE and agent integration
- [Temporal Reasoning](../concepts/temporal-reasoning.md) — the bitemporal fact store's core capability
- [Context Engineering](../concepts/context-engineering.md) — the discipline OpenMemory's retrieval and injection pipeline serves

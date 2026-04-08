---
entity_id: openmemory
type: project
bucket: agent-memory
abstract: >-
  OpenMemory: self-hosted cognitive memory engine for LLM agents with
  sector-based classification
  (episodic/semantic/procedural/emotional/reflective), dual-phase exponential
  decay, and composite retrieval scoring — not a vector DB wrapper.
sources:
  - deep/repos/caviraoss-openmemory.md
  - repos/caviraoss-openmemory.md
  - repos/thedotmack-claude-mem.md
related:
  - retrieval-augmented-generation
  - episodic-memory
last_compiled: '2026-04-08T23:14:11.574Z'
---
# OpenMemory

## What It Is

OpenMemory is a self-hosted memory engine for LLM agents that adds cognitive-science-inspired mechanisms on top of vector embeddings: automatic memory classification into five sector types, biologically-modeled decay, temporal fact management, and composite retrieval scoring. It exposes a Python SDK, Node.js SDK, REST API, MCP server, and VS Code extension.

The project explicitly positions itself against RAG and vector databases. Raw similarity search treats all stored text identically. OpenMemory argues that a working memory system needs differentiated storage (episodic events should decay faster than semantic facts), active forgetting, and temporal awareness. Whether the implementation delivers on that claim is a separate question from the architecture.

~3,860 GitHub stars (self-reported). Apache-2.0 license. Currently undergoing a full rewrite with breaking changes expected.

Related: [Agent Memory](../concepts/agent-memory.md), [Episodic Memory](../concepts/episodic-memory.md), [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md), [Long-Term Memory](../concepts/long-term-memory.md), [Model Context Protocol](../concepts/model-context-protocol.md)

---

## Core Architecture

The TypeScript package (`packages/openmemory-js/src/`) is the primary implementation. Storage splits between SQLite (metadata, relational data, via `better-sqlite3`) and pluggable vector stores (PostgreSQL/pgvector, Valkey) for embeddings. The three deployment modes are:

1. **Python SDK** (`packages/openmemory-py/`) — local SQLite, pip-installable as `openmemory-py`
2. **Node.js SDK** (`packages/openmemory-js/`) — embedded or server-connected, npm-installable as `openmemory-js`
3. **Backend server** (`backend/`) — HTTP API + MCP + dashboard + multi-user support

The `Memory` class (`src/core/memory.ts`) is the main API surface with five operations: `add`, `search`, `get`, `delete`, `reinforce`.

---

## Hierarchical Sector Graph (HSG)

The most architecturally distinctive component lives in `src/memory/hsg.ts`. Every memory gets classified into one of five cognitive sectors using regex pattern matching:

```typescript
export const sector_configs: Record<string, sector_cfg> = {
    episodic: {
        decay_lambda: 0.015,
        weight: 1.2,
        patterns: [/\b(today|yesterday|tomorrow|last\s+(week|month|year))\b/i, ...]
    },
    semantic:   { decay_lambda: 0.005, weight: 1.0, patterns: [...] },
    procedural: { decay_lambda: 0.008, weight: 1.1, patterns: [...] },
    emotional:  { decay_lambda: 0.02,  weight: 1.3, patterns: [...] },
    reflective: { decay_lambda: 0.001, weight: 0.8, patterns: [...] },
};
```

The sector assignments matter because they control two things: how fast a memory decays and how much weight it gets at retrieval. Emotional memories decay fastest (0.02) but carry highest retrieval weight (1.3). Reflective memories decay slowest (0.001) and carry the lowest weight (0.8). Cross-sector relationships are encoded in an explicit adjacency matrix — when retrieving episodic memories, reflective ones get a 0.8 boost while emotional ones get 0.7.

**Retrieval scoring** combines five weighted factors:
- Cosine similarity: 0.35
- Token overlap with query: 0.20
- Tag matching: 0.20
- Waypoint graph connectivity: 0.15
- Recency: 0.10

This composite formula differs from pure vector search. The waypoint factor (0.15) also generates an explanation trace showing which graph nodes contributed to a result.

---

## Dual-Phase Exponential Decay

`src/memory/decay.ts` classifies memories into three temperature tiers based on recency and importance:

```typescript
const pick_tier = (m, now_ts) => {
    const dt = Math.max(0, now_ts - (m.last_seen_at || m.updated_at || now_ts));
    const recent = dt < 6 * 86_400_000;  // 6 days
    const high = (m.coactivations || 0) > 5 || (m.salience || 0) > 0.7;
    if (recent && high) return "hot";
    if (recent || (m.salience || 0) > 0.4) return "warm";
    return "cold";
};
```

Tier-specific lambda rates: hot (0.005, near-permanent while active), warm (0.02), cold (0.05, rapid attenuation).

`src/ops/dynamics.ts` implements a dual-phase retention formula:

```typescript
const f = Math.exp(-LAMBDA_ONE_FAST_DECAY_RATE * t);       // 0.015
const s = THETA_CONSOLIDATION * Math.exp(-LAMBDA_TWO * t); // 0.4 * exp(-0.002t)
return Math.max(0, Math.min(1, f + s));
```

Two phases: fast initial forgetting (Ebbinghaus curve, λ=0.015) followed by a slow-decaying consolidated residual (λ=0.002, coefficient θ=0.4). Memories surviving the fast phase are treated as consolidated.

Cold memories also get their vectors compressed via mean pooling down to as few as 64 dimensions from 1536, reducing storage while preserving approximate semantic content. Re-embedding on access (when `reinforce_on_query=true`) regenerates full precision.

---

## Automatic Reflection

`src/memory/reflect.ts` runs as a periodic background job (default interval: 10 minutes, minimum 20 memories required):

1. Fetches up to 100 memories
2. Groups them by sector using Jaccard similarity > 0.8
3. Calculates salience from frequency (0.6 weight), recency (0.3), emotional content (0.1)
4. Creates a new reflective-sector memory summarizing each cluster
5. Marks source memories as consolidated and boosts their salience by 1.1x

The created reflections go into the reflective sector (slowest decay, λ=0.001), meaning auto-generated insights outlast the source memories. This implements a form of memory consolidation without requiring any LLM calls — all operations are algorithmic.

---

## Temporal Knowledge Graph

`src/temporal_graph/` manages time-bounded facts with explicit `valid_from`/`valid_to` windows. When a contradicting fact is inserted for the same subject+predicate pair, the previous fact closes automatically:

```typescript
await run_async(`UPDATE temporal_facts SET valid_to = ? WHERE id = ?`,
    [valid_from_ts - 1, old.id]);
```

Confidence decays on open-ended facts over time, clamped to a floor of 0.1. Point-in-time queries let you ask "what was true on date X" and get a different answer than "what is true now."

---

## Integrations

**MCP server** (`src/ai/mcp.ts`) exposes five tools: `openmemory_query`, `openmemory_store`, `openmemory_list`, `openmemory_get`, `openmemory_reinforce`. Compatible with [Claude](../projects/claude.md), [Cursor](../projects/cursor.md), Windsurf.

**VS Code extension** captures IDE events (edit, open, close, save, refactor) and writes them to the memory server. Ships writers for [Claude Code](../projects/claude-code.md), [GitHub Copilot](../projects/github-copilot.md), [Cursor](../projects/cursor.md), Windsurf, and [OpenAI Codex](../projects/codex.md).

**Agent frameworks**: [LangChain](../projects/langchain.md), [CrewAI](../projects/crewai.md), [AutoGen](../projects/autogen.md), LangGraph.

**Source connectors**: GitHub, Notion, Google Drive/Sheets/Slides, OneDrive, web crawler.

**Migration tools** (`tools/migrate/`) import from [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), and [SuperMemory](../projects/supermemory.md).

**Embedding providers**: OpenAI, Google Gemini, [Ollama](../projects/ollama.md), AWS Bedrock, and a synthetic fallback for fully offline operation.

**One-click deploy**: Render, Vercel, DigitalOcean, Heroku, Docker Compose.

---

## Strengths

**Differentiated memory types without LLM overhead.** The sector classification, decay, and reflection all run without calling an LLM. No API costs for memory management, no added latency, no external dependencies for core operations.

**Self-hosted with genuine data ownership.** SQLite default means no cloud configuration, no vendor lock-in. The offline-capable synthetic embedding fallback extends this to fully air-gapped environments.

**Explainable retrieval.** The waypoint scoring factor generates traces showing which graph nodes contributed to a result. Most vector search systems return results without any explanation of why.

**Temporal fact management.** Auto-closing contradicting facts and point-in-time queries are rare in memory systems at this level. Most competitors treat all stored text as eternally valid.

**Broad integration surface.** MCP, VS Code extension, Python + Node SDKs, REST API, and one-click deployment options cover most agent deployment scenarios.

---

## Critical Limitations

**Sector classification is crude.** The regex patterns in `hsg.ts` are hardcoded English phrases. A procedural memory about emotional regulation ("how to manage stress") matches both procedural and emotional patterns. The classification determines which decay rate and retrieval weight apply, so misclassification has downstream consequences throughout a memory's lifecycle. Non-English content will likely misclassify systematically.

**Hardcoded cognitive parameters.** Every numerical constant in the system — LAMBDA_1=0.015, LAMBDA_2=0.002, THETA=0.4, all five scoring weights, all cross-sector relationship values — appears hand-tuned. None are configurable at runtime. The README references cognitive science concepts but no empirical validation of these specific values for LLM memory use cases is cited. There is no mechanism to tune parameters based on observed retrieval performance.

**Concrete failure mode**: a user who primarily communicates in non-English or uses technical jargon not covered by the regex patterns will see most memories classified into the wrong sector. Their preferences land in `episodic` (fastest decay) instead of `semantic` (slowest decay), so the system progressively forgets preferences it should retain while retaining transient events it should forget.

**Unspoken infrastructure assumption**: the system assumes single-machine deployment with local SQLite. The reflection job fetches up to 100 memories and processes them sequentially. The decay job iterates the entire database. Neither uses efficient indexing for large stores. `applyDualPhaseDecayToAllMemories()` issues individual UPDATE statements via `Promise.all()`, which becomes a write bottleneck on large databases. The 60-second decay cooldown helps but does not change the O(n) cost per run.

---

## When Not to Use It

**Production systems that need stability.** The README's own warning: "currently undergoing a full rewrite with breaking changes expected." Adopting this in production means accepting migration risk.

**Large-scale multi-user deployments.** The O(n) decay and reflection jobs, single-file SQLite storage, and absence of horizontal scaling documentation make this unsuitable for thousands of concurrent users without significant architectural work.

**Teams that need tunable retrieval.** The hardcoded scoring weights and sector parameters cannot be adjusted without modifying source code. If retrieval quality is wrong for a specific use case, there is no knob to turn.

**Non-English or multilingual agents.** The regex-based sector classification is English-centric. Performance degrades predictably for other languages.

**Situations where embedding provider consistency matters.** Switching embedding providers mid-deployment (or upgrading from synthetic fallback to a real model) makes existing vectors incompatible with new ones. There is no re-embedding migration path documented.

---

## Unresolved Questions

**Parameter validation.** The cognitive constants (decay lambdas, scoring weights, cross-sector relationship values) are presented as grounded in cognitive science, but no source citations or empirical validation are provided. How were these values derived, and how much does retrieval quality degrade with different values?

**Rewrite scope and timeline.** The README warns of breaking changes but does not specify what changes, which APIs are stable, or when the rewrite will complete. Downstream integrations built now may need significant rework.

**Reflection quality ceiling.** The reflection system produces extractive summaries ("N sector pattern: content1; content2; ...") rather than synthesized insights. Is this by design for the stable release, or a placeholder pending the roadmap's "learned sector classifier"?

**Team/org memory semantics.** The server mode supports multi-user with per-user memory isolation. There is no documented mechanism for shared organizational memory — facts that should be true for all users on a team. The [Organizational Memory](../concepts/organizational-memory.md) use case is implied by the "org-wide memory" positioning but not architecturally addressed.

**Cost at scale.** Running the system at organizational scale with many users, each accumulating thousands of memories, has no published cost or performance analysis.

---

## Alternatives

**[Mem0](../projects/mem0.md)**: Use when you need a maintained, production-stable memory layer with a managed cloud option and validated retrieval quality. OpenMemory provides migration tools from Mem0, which signals it targets Mem0's users but does not match its operational maturity.

**[Zep](../projects/zep.md)**: Use when you need enterprise features (auth, multi-tenancy, SLA) or LangChain-native integration. Zep is more operationally mature.

**[Letta](../projects/letta.md) / [MemGPT](../projects/memgpt.md)**: Use when you need LLM-driven memory management decisions rather than heuristic classification. Letta uses the model itself to decide what to store and retrieve.

**[Graphiti](../projects/graphiti.md)**: Use when temporal knowledge graphs are the primary requirement. Graphiti is purpose-built for temporal fact tracking with more sophisticated conflict resolution than OpenMemory's predicate-matching approach.

**Raw [Vector Database](../concepts/vector-database.md) + [RAG](../concepts/retrieval-augmented-generation.md)**: Use when retrieval simplicity and operational predictability matter more than cognitive modeling. Cosine similarity retrieval is easier to debug and tune than OpenMemory's five-factor composite scoring.

**OpenMemory**: Use when you want a self-hosted, offline-capable memory system with sector-differentiated decay and temporal reasoning, you are comfortable with a project in active rewrite, and your workload fits on a single machine.


## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — implements (0.5)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.4)

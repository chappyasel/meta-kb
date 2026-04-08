---
entity_id: long-term-memory
type: concept
bucket: agent-memory
abstract: >-
  Long-term memory gives AI agents persistent knowledge across sessions via
  external storage and retrieval, enabling continuity and personalization that
  context windows alone cannot provide.
sources:
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - repos/caviraoss-openmemory.md
  - repos/helloruru-claude-memory-engine.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/letta-ai-lettabot.md
  - repos/mem0ai-mem0.md
  - repos/osu-nlp-group-hipporag.md
  - repos/thedotmack-claude-mem.md
related:
  - retrieval-augmented-generation
  - context-management
  - episodic-memory
  - anthropic
  - claude
  - semantic-memory
  - vector-database
  - claude-code
last_compiled: '2026-04-08T23:00:20.503Z'
---
# Long-Term Memory

## What It Is

Long-term memory in AI agents means storing and retrieving information that persists beyond a single conversation or context window. A model's weights encode general knowledge from training, but they cannot update from user interactions at inference time. Long-term memory solves this by externalizing dynamic knowledge to storage systems the agent can read and write during operation.

The problem is not simply "the context window is too small." It is that relevant context must be identified, retrieved selectively, and injected at the right moment, without flooding the prompt with noise. A naive approach — dump all history into every request — fails on three dimensions simultaneously: cost scales with history length, attention degrades over long contexts, and irrelevant material crowds out relevant signals.

Long-term memory systems address this by treating storage and retrieval as distinct engineering problems, each with its own design tradeoffs.

## Why It Matters

Without persistent memory, every conversation starts from zero. The agent cannot:

- Remember that a user is allergic to shellfish three months after they mentioned it
- Connect a current refactoring request to a rate-limiting decision made two weeks ago
- Accumulate expertise on a codebase across hundreds of sessions
- Adapt its behavior based on feedback patterns over time

This matters more as agents handle longer-horizon tasks. A coding assistant used daily for a year should behave differently than one used for the first time — not because its weights changed, but because its operational knowledge grew. The distinction between [Episodic Memory](../concepts/episodic-memory.md) (what happened) and [Semantic Memory](../concepts/semantic-memory.md) (what is generally true) maps onto this: episodic memories capture specific past events, semantic memories capture distilled facts and preferences.

## How It Works

### Storage Substrates

Long-term memory requires a storage layer that outlives any single process. Three main approaches exist, each with distinct retrieval characteristics:

**Vector databases** store embeddings of memory entries alongside the original text. Retrieval works by embedding the current query and finding nearest neighbors by cosine similarity. [Vector Database](../concepts/vector-database.md) systems like [ChromaDB](../projects/chromadb.md), [Pinecone](../projects/pinatone.md), [Qdrant](../projects/qdrant.md), and [FAISS](../projects/faiss.md) implement this. Semantic search finds thematically related memories even when exact keywords differ. The failure mode: similarity search requires a query, so it cannot surface context the agent does not know to look for.

**Relational and key-value databases** — [SQLite](../projects/sqlite.md), [PostgreSQL](../projects/postgresql.md), [Redis](../projects/redis.md) — store structured memory records with explicit schemas. Full-text search (BM25) provides keyword retrieval. These work well for structured facts, preferences, and records with known schemas. The failure mode: keyword mismatch between how something was stored and how it is later queried.

**Knowledge graphs** represent memory as nodes and typed edges, enabling traversal along semantic relationships. Systems like [Graphiti](../projects/graphiti.md), [GraphRAG](../projects/graphrag.md), and [HippoRAG](../projects/hipporag.md) use graph structures for associative retrieval. HippoRAG's key mechanism is personalized PageRank over a knowledge graph: entities extracted from text become nodes, and retrieval follows relationship edges rather than pure vector similarity. This enables multi-hop reasoning — finding that "Erik Hort's birthplace" connects to "Rockland County" through intermediate entities. The failure mode: graph construction quality depends on entity extraction accuracy, and schema design requires upfront domain knowledge.

**File-based systems** store memories as markdown or structured files organized hierarchically. [CLAUDE.md](../concepts/claude-md.md) uses this pattern, as does Hipocampus, which maintains a `ROOT.md` topic index auto-loaded into every session. The advantage is transparency and zero infrastructure. The failure mode: unstructured files require disciplined organization to remain navigable.

### Retrieval Mechanisms

Retrieval is where most long-term memory systems diverge in design philosophy.

**Pure vector search** works when the user's query contains enough semantic signal to surface relevant memories. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) in its standard form operates this way. The hipocampus benchmark puts the ceiling here starkly: BM25 search alone achieves 2.8% on implicit context recall; vector search alone achieves 3.4%. Search cannot find what the agent does not know to search for. [Source](../raw/repos/kevin-hs-sohn-hipocampus.md)

**Hybrid search** combines vector similarity with keyword matching (BM25), improving recall across different query types. [Hybrid Search](../concepts/hybrid-search.md) addresses the complementary failure modes of each approach — vector search misses keyword-specific matches, BM25 misses semantic matches.

**Topic indexing** maintains a small, always-loaded index of what memories exist, enabling O(1) triage before any retrieval. Hipocampus's `ROOT.md` approach — a ~3K token file listing topics with types and ages — allows the agent to notice connections before issuing any search query. With a 10K token ROOT budget (120 topics), the hipocampus benchmark shows 21x improvement over no memory on implicit context recall. [Source](../raw/repos/kevin-hs-sohn-hipocampus.md)

**Knowledge graph traversal** follows relationship edges from seed nodes. HippoRAG uses personalized PageRank seeded by query-relevant nodes, propagating importance through the graph to surface connected entities. This handles multi-hop questions that require connecting information across multiple documents.

**LLM-mediated selection** uses a model to select relevant memory files from metadata before reading full content. Hipocampus implements this as a fallback: when keyword lookup fails, an LLM reads compaction node frontmatter (~500 tokens) and selects the top 5 relevant files. This handles cross-lingual and cross-domain keyword mismatches.

### Memory Classification

Not all memories should be stored and retrieved the same way. Several systems classify memories by type before storing them, which affects compression, retention, and retrieval priority:

**Episodic**: specific past events with temporal context ("the user mentioned shellfish allergy on March 12")  
**Semantic**: distilled facts and general truths ("user is allergic to shellfish")  
**Procedural**: skills and process knowledge ("user prefers async/await over Promise chains")  
**Reflective/Preference**: meta-level insights about user behavior and preferences

Hipocampus classifies each entry as `project`, `feedback`, `user`, or `reference`. `user` and `feedback` memories survive compaction indefinitely; `project` memories compress into historical summaries; `reference` entries receive staleness markers after 30 days. [Source](../raw/repos/kevin-hs-sohn-hipocampus.md)

OpenMemory implements five sectors (episodic, semantic, procedural, emotional, reflective) with a sector classifier routing each incoming memory. Each sector has its own decay parameters rather than uniform TTLs. [Source](../raw/repos/caviraoss-openmemory.md)

### Memory Consolidation and Compression

Raw session logs accumulate faster than they can be injected into context. Compression is necessary but lossy — the design question is what to preserve.

Hierarchical compaction trees process raw logs through multiple aggregation levels: raw → daily → weekly → monthly → root index. Below a threshold (e.g., 200 lines), files are copied verbatim with no information loss. Above the threshold, an LLM generates keyword-dense summaries. The summaries trade completeness for navigability. [Source](../raw/repos/kevin-hs-sohn-hipocampus.md)

[Mem0](../projects/mem0.md) uses an LLM to extract discrete memory facts from conversations rather than summarizing full transcripts. The extraction step transforms conversational text into structured, retrievable facts at multiple scopes: user-level, session-level, agent-level. This enables targeted retrieval by scope without loading irrelevant session data. Their benchmark reports 26% accuracy improvement over OpenAI Memory, 91% faster responses than full-context, and 90% fewer tokens than full-context on the LoCoMo benchmark — though these figures are self-reported in their own paper. [Source](../raw/repos/mem0ai-mem0.md)

### Temporal Reasoning

A fact's truth value changes over time. "The CEO of CompanyX is Alice" becomes false when Bob takes over. Naive memory systems store the latest value and discard history; this breaks point-in-time queries.

Temporal knowledge graphs address this with `valid_from` / `valid_to` intervals on each fact. When a new fact contradicts an existing one, the old fact's `valid_to` is set rather than deleted. Point-in-time queries specify a timestamp and retrieve facts valid at that moment. OpenMemory implements this pattern with automatic timeline reconstruction and change detection. [Source](../raw/repos/caviraoss-openmemory.md)

[Temporal Reasoning](../concepts/temporal-reasoning.md) also matters for retrieval priority: memories from last week are typically more relevant than memories from six months ago, unless the older memory established a stable preference. Age-weighted scoring and decay functions encode this intuition.

## Who Implements It

Several systems approach long-term memory differently:

[Mem0](../projects/mem0.md) provides a managed memory layer with multi-level scoping (user/session/agent), LLM-mediated fact extraction, and a platform API. The abstraction decouples memory management from LLM choice. 51K GitHub stars. [Source](../raw/repos/mem0ai-mem0.md)

[Letta](../projects/letta.md) (formerly MemGPT) builds long-term memory into the agent architecture itself, with [Core Memory](../concepts/core-memory.md) (always in context) and archival memory (retrieved on demand). The agent manages its own memory through explicit tool calls.

[HippoRAG](../projects/hipporag.md) uses knowledge graphs with personalized PageRank for associative, multi-hop retrieval. Published at NeurIPS 2024, ICML 2025. [Source](../raw/repos/osu-nlp-group-hipporag.md)

[Zep](../projects/zep.md) and [Graphiti](../projects/graphiti.md) provide graph-based memory with temporal reasoning for production agent deployments.

[Claude Code](../projects/claude-code.md) uses [CLAUDE.md](../concepts/claude-md.md) files as file-based persistent memory — project-specific instructions and context that persist across sessions without any retrieval infrastructure.

[Anthropic](../projects/anthropic.md)'s [Claude](../projects/claude.md) natively supports Projects with persistent memory attached to conversation threads, though the implementation details are not public.

## Practical Implications

**The unknown unknowns problem**: vector search requires knowing what to search for. The hardest memory retrieval problems involve connections the agent cannot anticipate from the current query alone. Topic indexes and knowledge graphs address this; pure RAG does not.

**Cost at scale**: every retrieved memory consumes input tokens. A system that retrieves 20 memory chunks per request, each 500 tokens, adds 10K tokens to every API call. At volume, this dominates cost. Hierarchical retrieval (index first, full content on demand) and compression are not optional optimizations — they are necessary for production economics.

**Memory staleness**: preferences and facts change. A memory system without expiry or temporal reasoning will eventually serve outdated information confidently. Decay functions, `valid_to` intervals, and staleness markers on references are necessary for accuracy over long time horizons.

**Privacy**: long-term memory stores sensitive user data persistently. Self-hosted systems (OpenMemory, Hipocampus) keep data local. Cloud platforms introduce retention, access, and breach risks that operational security policies must address. Hipocampus's secret scanning during compaction — automatic redaction of API keys and tokens from memory files — addresses one specific case. [Source](../raw/repos/kevin-hs-sohn-hipocampus.md)

## Failure Modes

**Retrieval misses**: the agent acts on outdated or absent context because retrieval failed to surface the relevant memory. The benchmark numbers are sobering — even well-designed systems achieve low accuracy on implicit cross-domain recall.

**Retrieval hallucination**: the agent confabulates false memories by treating high-similarity but irrelevant retrievals as correct. Composite scoring (recency + salience + relevance) rather than pure similarity reduces this.

**Memory poisoning**: incorrect or adversarially injected memories persist and influence future behavior. Long-term memory systems lack the equivalent of parameter verification that model weights have.

**Compaction loss**: aggressive summarization discards details that later turn out to be important. Verbatim preservation below compaction thresholds, and separate storage of certain memory types (feedback, user preferences), mitigate this but do not eliminate it.

**Context flooding**: retrieving too much memory fills the context window with noise, degrading the model's ability to attend to the current task. [Context Management](../concepts/context-management.md) and [Progressive Disclosure](../concepts/progressive-disclosure.md) — retrieving compact indexes first, full content only when needed — address this.

## When Not to Use It

**Short-lived tasks**: if each interaction is independent and users do not return, the overhead of maintaining persistent memory adds cost and complexity with no benefit.

**Regulated data environments**: persistent storage of conversation content may conflict with data retention requirements. Understand your legal context before storing user interactions.

**High-velocity fact domains**: if the underlying facts change faster than memory validation can run, a live lookup (API call, database query) is more reliable than cached memory.

**Low-volume use**: for a prototype or internal tool with a handful of users, the engineering cost of a production memory system exceeds the benefit. File-based approaches (CLAUDE.md, a simple markdown wiki) cover most small-scale needs.

## Unresolved Questions

**Evaluation**: there is no widely accepted benchmark for long-term memory quality across diverse agent applications. [LongMemEval](../projects/longmemeval.md) and LoCoMo cover specific scenarios; the hipocampus MemAware benchmark focuses on implicit context recall. Numbers across systems are not directly comparable because they measure different things. Self-reported benchmarks (Mem0's 26% improvement) should be treated as indicative rather than definitive until independently replicated.

**Conflict resolution**: when two memories contradict each other, which wins? Most systems apply recency bias, but the right answer depends on the semantic content (stable preferences vs. changing facts) and the source reliability. No system has a robust solution.

**Memory for multi-agent systems**: in [Multi-Agent Systems](../concepts/multi-agent-systems.md), which agent owns which memories? How do agents share memory without interference? Organizational Memory patterns address this conceptually but production implementations are sparse.

**Long-term drift**: a memory system that never forgets will accumulate outdated preferences and obsolete facts over years. Decay functions help but require tuning per memory type and domain. The right forgetting rate for "user prefers dark mode" differs from the right rate for "user is working on a payment API."

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader taxonomy of memory types in agent systems
- [Short-Term Memory](../concepts/short-term-memory.md) — in-context working memory, the complement to long-term persistence
- [Episodic Memory](../concepts/episodic-memory.md) — event-based memory subsystem
- [Semantic Memory](../concepts/semantic-memory.md) — fact and concept memory subsystem
- [Core Memory](../concepts/core-memory.md) — always-in-context persistent memory (Letta's approach)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the retrieval pattern that underlies most LTM implementations
- [Context Management](../concepts/context-management.md) — how retrieved memories get incorporated into prompts
- [Vector Database](../concepts/vector-database.md) — primary storage substrate for embedding-based retrieval
- [Temporal Reasoning](../concepts/temporal-reasoning.md) — handling time-varying facts in memory
- [Memory Evolution](../concepts/memory-evolution.md) — how memory systems change over time
- [CLAUDE.md](../concepts/claude-md.md) — file-based persistent memory for Claude agents
- [Continual Learning](../concepts/continual-learning.md) — the broader ML problem of learning without forgetting

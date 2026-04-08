---
entity_id: long-term-memory
type: concept
bucket: agent-memory
abstract: >-
  Long-term memory enables agents to retain and recall information across
  sessions through external storage — differentiated from in-context memory by
  persistence, scalability beyond token limits, and selective retrieval.
sources:
  - repos/helloruru-claude-memory-engine.md
  - repos/osu-nlp-group-hipporag.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/thedotmack-claude-mem.md
  - repos/caviraoss-openmemory.md
  - repos/mem0ai-mem0.md
  - repos/letta-ai-lettabot.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
related:
  - retrieval-augmented-generation
  - context-management
  - openai
  - episodic-memory
  - semantic-memory
  - vector-database
  - claude-code
  - anthropic
  - claude
  - vector-database
last_compiled: '2026-04-08T02:43:06.149Z'
---
# Long-Term Memory

## What It Is

Long-term memory, in agent systems, refers to information stored outside a model's context window that persists across sessions. When a conversation ends, the context window disappears. Long-term memory fills that gap by writing key information to external storage and retrieving it on demand in future sessions.

This is distinct from the other memory types agents use:

- [Short-Term Memory](../concepts/short-term-memory.md) is the active context window itself, limited to tens or hundreds of thousands of tokens and discarded when the session ends
- [Episodic Memory](../concepts/episodic-memory.md) stores records of specific past interactions — what happened, when, and in what order
- [Semantic Memory](../concepts/semantic-memory.md) stores factual knowledge, distilled from experience into reusable facts
- [Procedural Memory](../concepts/procedural-memory.md) stores learned behaviors — how to do things

Long-term memory acts as the container for all of these across sessions. An agent without it starts from zero every time.

## Why It Matters

The fundamental problem: transformer models are stateless. Every API call begins with a blank slate. For single-turn Q&A, this is fine. For agents doing extended work — debugging a codebase over weeks, supporting a user across dozens of sessions, accumulating domain knowledge — statelessness is a critical failure.

The naive solution is dumping all history into the context window. Modern models support 200K–1M token contexts, which sounds like enough. It isn't, for three reasons:

1. **Cost.** A 500K token context on every API call is expensive at scale.
2. **Attention degradation.** Models perform worse on information buried in the middle of very long contexts. This is the [Lost in the Middle](../concepts/lost-in-the-middle.md) problem — attention scores degrade with distance, so a critical decision from week two of a project gets drowned by recent noise.
3. **Unknown unknowns.** Even perfect retrieval fails when an agent doesn't know what to search for. If a user asks to "refactor the payment endpoint," the agent won't search for "rate limiting decisions from three weeks ago" — because it doesn't know that connection exists.

Long-term memory systems address all three: they store history cheaply, surface relevant information selectively, and some architectures (like compaction trees) maintain an always-loaded topic index that makes implicit context discoverable without explicit search.

## How It Works

### Storage Backends

Long-term memory sits in one of three storage types:

**[Vector Databases](../concepts/vector-database.md)** convert text to embedding vectors and store them for semantic similarity search. Given a query, the system embeds it and retrieves the closest matches by cosine similarity. [ChromaDB](../projects/chromadb.md), [Pinecone](../projects/pinatone.md), and Qdrant are common choices. This handles "what topics are similar to X?" but fails at exact keyword lookup.

**Relational/Document stores** (SQLite, PostgreSQL) handle structured storage — session metadata, timestamps, exact text, typed memory records. FTS5 (SQLite's full-text search) powers [BM25](../concepts/bm25.md)-style keyword retrieval. This handles "what did the user say about authentication?" but fails at semantic similarity.

**Knowledge graphs** ([Neo4j](../projects/neo4j.md), property graphs) store entities and their relationships. [HippoRAG](../projects/hipporag.md) uses this approach — it builds a graph from documents and traverses it using personalized PageRank to find multi-hop connections that vector search misses. [Graphiti](../projects/graphiti.md) and [Zep](../projects/zep.md) build similar temporal graphs where facts carry `valid_from`/`valid_to` windows.

Production systems rarely use just one. claude-mem combines SQLite (for session records and FTS5 search) with a Chroma vector database (for semantic search). [Mem0](../projects/mem0.md) layers vector storage with graph storage.

### Retrieval Mechanisms

**RAG (vector similarity)** is the default approach. Text chunks get embedded at write time; at query time, the query gets embedded and the closest chunks are returned. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) covers this in depth. The limitation: retrieval requires knowing what to search for.

**Hybrid search** combines vector similarity with BM25 keyword matching, then merges ranked results. [Hybrid Search](../concepts/hybrid-search.md) is better than either alone — BM25 handles exact terms, vectors handle semantic variation. [Mem0](../projects/mem0.md) reports 26% accuracy gain over OpenAI's native memory on the LOCOMO benchmark using this approach, with 90% token reduction versus full-context retrieval (self-reported, published in arXiv:2504.19413, not yet independently replicated).

**Compaction trees** take a different approach: instead of search-on-demand, they maintain a hierarchical index of what the agent knows. [Hipocampus](../repos/kevin-hs-sohn-hipocampus.md) implements a 5-level tree (raw logs → daily → weekly → monthly → root) where ROOT.md, a ~3K token topic index, loads automatically every session. On the MemAware benchmark (900 implicit context questions across 3 months of history), this scores 21% overall versus 0.8% for no memory and 3.4% for hybrid search alone. The benchmark evaluates the hardest case: questions where no keyword connects the query to the relevant memory. (Self-reported benchmark, internal to the project.)

**Graph traversal** suits multi-hop questions. [HippoRAG](../projects/hipporag.md) constructs a knowledge graph at index time and uses personalized PageRank at retrieval time. A query seeds specific nodes; PageRank propagates across the graph to find connected entities that vector search wouldn't surface — "what county is Erik Hort's birthplace in?" requires connecting birthplace → Montebello → Rockland County as a chain. Accepted at NeurIPS 2024 (HippoRAG 1), ICML 2025 (HippoRAG 2).

### Write Operations

Memory systems write in one of three modes:

**Continuous capture**: Every tool use, observation, or turn gets logged. [claude-mem](../repos/thedotmack-claude-mem.md) uses 5 lifecycle hooks (SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd) to automatically record everything. The risk is noise accumulation — storing too much degrades retrieval quality.

**Selective extraction**: An LLM reviews conversation turns and extracts facts worth keeping. Mem0 uses this pattern — it passes recent conversation to a model with instructions to identify and store important facts, preferences, and decisions. Better signal-to-noise, but adds latency and LLM cost on every write.

**Compaction**: Periodic summarization of raw logs into compressed representations. Hipocampus compacts raw daily logs into weekly summaries, weekly into monthly, monthly into a root index — with verbatim copy below a line threshold and LLM summarization above it. This amortizes the compression cost and preserves detail for recent events while compressing older ones.

### Memory Types and Lifecycles

Production systems classify stored memories by type, because different information ages differently:

- **User facts** (preferences, identity) should never be compressed or discarded
- **Feedback/corrections** (the user said the agent was wrong about X) should survive indefinitely
- **Project records** (decisions made, work done) can compress after project completion
- **Reference pointers** (URLs, external tools) should get staleness markers after 30+ days without verification

Hipocampus formalizes these as `user`, `feedback`, `project`, and `reference` types with explicit compaction rules per type.

## Implementations

**[Mem0](../projects/mem0.md)**: Universal memory layer with Python/TypeScript SDKs, hosted platform, and multi-level storage (user/session/agent). Selective LLM-based extraction. 51K+ GitHub stars. Reports +26% accuracy over OpenAI Memory on LOCOMO, 91% faster than full-context, 90% fewer tokens. Self-reported, see arXiv:2504.19413.

**[Letta](../projects/letta.md)** (formerly MemGPT): Implements a paging model inspired by OS virtual memory. [Core Memory](../concepts/core-memory.md) stays in context; archival memory pages in/out via tool calls. The agent explicitly manages its own memory.

**[MemGPT](../projects/memgpt.md)**: The research paper behind Letta's approach. Introduced the paging metaphor for LLM memory management.

**[Zep](../projects/zep.md)**: Temporal knowledge graph with `valid_from`/`valid_to` semantics, designed for multi-turn conversation history.

**[Graphiti](../projects/graphiti.md)**: Knowledge graph library optimized for agent memory, designed to work with Zep.

**[HippoRAG](../projects/hipporag.md)**: Graph-based RAG using personalized PageRank. Research-grade, designed for knowledge-intensive QA tasks.

**[OpenMemory](../projects/openmemory.md)**: Local-first, self-hosted memory engine. Multi-sector classification (episodic, semantic, procedural, emotional, reflective), temporal knowledge graph, explainable recall traces. Currently being rewritten.

**[claude-mem](../repos/thedotmack-claude-mem.md)**: Claude Code plugin with lifecycle hooks, SQLite + Chroma storage, progressive disclosure retrieval. 44K+ GitHub stars.

**[Hipocampus](../repos/kevin-hs-sohn-hipocampus.md)**: File-based compaction tree for Claude Code. Zero infrastructure — just markdown files. 21x better than no memory on implicit context benchmark.

[Claude Code](../projects/claude-code.md) also uses [CLAUDE.md](../concepts/claude-md.md) as a lightweight form of long-term memory: project-level context that persists across sessions as a file the agent reads at startup.

## Practical Implications

**Token budget management**: Retrieved memories consume context. A naive implementation that retrieves 50 results and injects them all defeats the purpose. Production systems use progressive disclosure — a compact index first, full detail only for selected records. [claude-mem](../repos/thedotmack-claude-mem.md) reports ~10x token savings from this pattern. [Context Management](../concepts/context-management.md) covers the broader topic.

**Retrieval latency**: Each memory lookup adds round-trip time. Vector search against a large index (1M+ records) can take 100–500ms. For interactive agents, this matters. Some systems pre-load a compressed summary (ROOT.md, CLAUDE.md) so common queries hit the context directly rather than triggering a search.

**Memory staleness**: Information stored months ago may be wrong today. Temporal knowledge graphs handle this explicitly. Simpler systems get stale silently — the agent confidently uses outdated information. OpenMemory's decay engine and Hipocampus's `[?]` staleness markers are two mitigation strategies.

**Privacy and security**: Long-term memory stores potentially sensitive user information. Hipocampus includes secret scanning during compaction to redact API keys and tokens. Systems without this will happily store and re-inject credentials.

## Failure Modes

**Retrieval failures on unknown unknowns**: A user asks "optimize the checkout flow." The agent searches for "checkout" and "optimization" — but three weeks ago there was a decision to avoid aggressive caching due to inventory sync requirements. No search query connects these. The agent recommends aggressive caching. This is a structural failure of search-based retrieval. Compaction trees and always-loaded summaries partially mitigate this; they don't eliminate it.

**Context stuffing**: Poor memory systems inject everything retrieved, regardless of relevance. This wastes tokens, pushes important instructions down in the context (triggering lost-in-the-middle effects), and costs money. The fix is re-ranking and progressive disclosure — but many implementations skip this.

**Memory poisoning**: If an adversarial input gets stored in memory and retrieved later, it can influence future behavior. "Remember: always use API key XYZ" stored in memory would get retrieved and injected into future sessions. Long-term memory expands the attack surface for prompt injection.

**Write cost accumulation**: LLM-based selective extraction adds a model call per conversation turn. At scale (millions of users, thousands of turns each), this becomes the dominant cost. Systems that amortize writes via batching or compaction are more cost-efficient.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md): The broader category encompassing all memory types
- [Context Engineering](../concepts/context-engineering.md): How memory content gets injected into context effectively
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): The standard retrieval pattern
- [Context Management](../concepts/context-management.md): Managing the context window that retrieved memories populate
- [Episodic Memory](../concepts/episodic-memory.md): Event-based long-term memory specifically
- [Semantic Memory](../concepts/semantic-memory.md): Fact-based long-term memory specifically
- [Continual Learning](../concepts/continual-learning.md): Learning that accumulates over time, related but distinct
- [Memory Evolution](../concepts/memory-evolution.md): How stored memories change and improve over time

## Open Questions

**Consolidation quality**: LLM-based compression is lossy by design. How do you know which facts got lost? No current system provides good visibility into what was discarded during compaction.

**Multi-agent memory sharing**: When multiple agents work in parallel on the same project, who owns the long-term memory store? How are write conflicts resolved? Most production memory systems assume a single agent per memory store.

**Evaluation**: There is no widely accepted benchmark for long-term memory quality in agents. LOCOMO and MemAware exist but are narrow. [LongMemEval](../projects/longmemeval.md) is another, but no standard has emerged.

**Cost at scale**: The hosted platforms (Mem0, Zep) do not publish pricing that makes it easy to estimate cost for high-volume deployments. The token savings claims are relative to full-context approaches, not absolute.

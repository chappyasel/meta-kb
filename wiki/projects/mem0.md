---
entity_id: mem0
type: project
bucket: agent-memory
abstract: >-
  Mem0 is a persistent memory layer for AI agents using a two-pass LLM pipeline
  (extract facts, then reconcile against stored memories) over pluggable vector
  stores, with optional graph memory via Neo4j.
sources:
  - repos/memorilabs-memori.md
  - repos/thedotmack-claude-mem.md
  - repos/caviraoss-openmemory.md
  - repos/mem0ai-mem0.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/mem0ai-mem0.md
related:
  - Anthropic
  - OpenAI
  - Retrieval-Augmented Generation
  - Model Context Protocol
  - Episodic Memory
  - Semantic Memory
  - Agent Memory
  - LangGraph
  - Vector Database
  - Agent Memory
last_compiled: '2026-04-05T20:28:56.783Z'
---
# Mem0

## What It Does

Mem0 ("mem-zero") adds persistent, personalized memory to AI agents and assistants. When an agent converses with a user, Mem0 extracts atomic facts from that conversation and stores them in a vector database. On subsequent conversations, relevant facts are retrieved and injected into the prompt, giving the agent continuity across sessions without stuffing full conversation history into context.

The core claim: +26% accuracy over OpenAI Memory on LOCOMO, 91% faster responses, and 90% fewer tokens compared to full-context approaches (arXiv:2504.19413, self-reported, not independently replicated).

51,880 GitHub stars, Y Combinator S24, Apache-2.0.

## Architecture: What Makes It Distinctive

Mem0 is a **plugin-orchestration layer**, not a novel algorithm. The `Memory` class in `mem0/memory/main.py` wires together four swappable subsystems:

- **LLM layer** (`mem0/llms/`) — 16 providers via `LlmFactory`; default `gpt-4.1-nano-2025-04-14`
- **Embedding layer** (`mem0/embeddings/`) — 11 providers via `EmbedderFactory`; default OpenAI embeddings
- **Vector store layer** (`mem0/vector_stores/`) — 23 backends via `VectorStoreFactory`; default Qdrant at `~/.mem0/`
- **Graph store layer** (`mem0/memory/graph_memory.py`) — optional Neo4j knowledge graph; off by default

A `SQLiteManager` (`mem0/memory/storage.py`) logs all ADD/UPDATE/DELETE events for audit history. Memory is scoped by `user_id`, `agent_id`, `session_id`, and `run_id` metadata filters on the same flat vector collection — not separate storage tiers despite how the documentation describes "multi-level memory."

## Core Mechanism: The Two-Pass Pipeline

`Memory._add_to_vector_store()` runs two sequential LLM calls per ingestion:

**Pass 1 — Fact extraction.** The LLM receives the conversation and `USER_MEMORY_EXTRACTION_PROMPT` (from `mem0/configs/prompts.py`), returning:

```json
{"facts": ["Name is John", "Is a Software engineer", "Likes cheese pizza"]}
```

Two prompt variants exist: user extraction (penalizes including assistant content) and agent extraction (assistant messages only, activated when `agent_id` is present).

**Pass 2 — Reconciliation.** For each extracted fact, Mem0 embeds it, searches the vector store for the top 5 similar existing memories, then sends all retrieved memories plus new facts to a second LLM call with `DEFAULT_UPDATE_MEMORY_PROMPT`. The LLM returns one of four operations per memory: ADD, UPDATE, DELETE, or NONE.

A critical implementation detail: real UUIDs are swapped for sequential integer IDs (0, 1, 2...) before the LLM call, then mapped back afterward. The comment in `main.py` says explicitly: "mapping UUIDs with integers for handling UUID hallucinations." This prevents the LLM from inventing non-existent IDs.

Each decision is then executed: ADD creates a new vector; UPDATE overwrites the payload and re-embeds; DELETE removes the vector and writes to SQLite history.

**Retrieval** (`memory.search()`) is a single embedding call plus vector similarity search, with optional reranking via Cohere, HuggingFace, SentenceTransformer, ZeroEntropy, or an LLM-based reranker added in v1.0.0.

## Optional Graph Memory

When Neo4j is configured, `MemoryGraph` runs in parallel via `concurrent.futures.ThreadPoolExecutor`:

1. LLM + `EXTRACT_ENTITIES_TOOL` extracts entity-type pairs
2. Second LLM call via `RELATIONS_TOOL` establishes source-relationship-destination triples
3. Third LLM call checks which existing relationships are contradicted
4. Merge nodes with Cypher `MERGE` queries; soft-delete contradicted relationships (`r.valid = false`, `r.invalidated_at = datetime()`)

Graph mode costs 3+ additional LLM calls per `add()`. The graph search results appear in a separate `relations` array alongside the vector results. Soft-deleted relationships accumulate indefinitely with no garbage collection.

## Comparison to Related Systems

Mem0 occupies the simplest position in the agent memory space. [Graphiti](../projects/getzep-graphiti.md) builds a full bi-temporal knowledge graph with entity resolution, 4–5 LLM calls per episode, and temporal edge invalidation — reaching +38% improvement on temporal reasoning tasks. [Letta](../projects/letta-ai-letta.md) gives agents explicit tools to read and rewrite their own context window blocks, making memory management a first-class agent capability. Mem0 requires no changes to the agent: wrap any conversation in `memory.add()` and `memory.search()`, and the system handles extraction, dedup, and retrieval automatically.

The tradeoff: no [temporal reasoning](../concepts/episodic-memory.md), no [agent-driven memory management](../concepts/agent-memory.md), no structured entity relationships by default. For preference tracking and personalization, this is sufficient. For multi-session reasoning across changing facts, the more sophisticated systems pull ahead.

## Strengths

**Drop-in integration.** The canonical usage pattern takes fewer than 10 lines of code. No schema design, no graph database, no agent prompt rewrites.

**23 vector backends.** Qdrant, pgvector, Pinecone, Chroma, FAISS, Milvus, Redis, Weaviate, MongoDB, Elasticsearch, and more. Production deployments can use whatever vector store is already in the stack.

**Semantic deduplication.** The reconciliation pass handles equivalences like "likes cheese pizza" vs "loves cheese pizza" that hash-based or exact-match dedup would miss.

**Hosted managed service.** The platform at app.mem0.ai handles the vector database, graph services, and rerankers as a service, including SOC 2 Type II, GDPR compliance, and audit logging.

## Critical Limitations

**Silent data loss on LLM parse failure.** The reconciliation step requires the LLM to return valid JSON. The code strips markdown fences and attempts regex extraction, but if the LLM produces malformed output, `new_memories_with_actions` becomes `{}` and the entire `add()` call produces no memory updates. There is no retry and no error surfaced to the caller.

**No concurrency control.** Multiple concurrent `add()` calls for the same `user_id` race on the vector store: both read existing memories, both may decide to ADD the same fact, creating duplicates. There is no locking beyond SQLite's thread lock for history writes.

**Unspoken infrastructure assumption: a running LLM API.** Every `add()` call makes 2+ synchronous LLM calls before returning. In high-throughput applications — real-time chat, batch processing, event-driven pipelines — this creates a latency bottleneck that cannot be eliminated by parallelism alone. The managed platform mitigates this by handling memory operations asynchronously server-side, but the self-hosted `Memory` class blocks.

## When NOT to Use Mem0

**When facts change frequently.** Mem0 has no true temporal model. Contradicted facts are deleted from the vector store rather than invalidated with a timestamp. "Alice works at Google" gets deleted when she changes jobs, with no record of the history. If your application needs "what did we know about Alice in January?" use [Graphiti](../projects/getzep-graphiti.md) instead.

**When relationships between entities matter.** The default mode stores flat fact strings. "Alice is Bob's manager" becomes a text chunk, not a typed edge between two entity nodes. Queries like "who reports to Bob?" require the agent to parse text blobs. Enable graph memory for relational data — but budget for the extra LLM calls and the Neo4j dependency.

**When the agent must reason about its own memory.** Mem0's extraction is invisible to the agent. The agent cannot decide what is worth remembering, reorganize its knowledge, or reflect on what it knows. For agents that need explicit memory management, [Letta](../projects/letta-ai-letta.md)'s editable context blocks are the right model.

**When operating at high write volume without the managed platform.** The self-hosted library makes synchronous LLM calls per `add()`. At >10 concurrent users writing messages, the LLM API becomes a bottleneck and UUID-hallucination errors begin accumulating silently in logs.

## Unresolved Questions

**Benchmark provenance.** The +26% accuracy over OpenAI Memory on LOCOMO is self-reported (arXiv:2504.19413). No independent replication exists in the repository or as a separate evaluation suite. The benchmark scripts are absent from the codebase.

**Soft-delete accumulation in graph mode.** Invalidated relationships (`r.valid = false`) are never garbage collected. For long-running deployments with frequent fact updates, the graph accumulates stale edges that slow queries without any documented compaction strategy.

**Organizational memory governance.** The documentation describes an "organizational memory" tier for shared team context, noting it "depends on owner maintenance for governance." There is no access control, audit trail for shared memories, or mechanism to prevent a single agent from polluting shared state at scale.

**v1.0.0 breaking changes.** The migration guide exists but the scope of backward incompatibility is not quantified. Deployments using older vector store schemas or custom prompts may require manual data migration.

## Alternatives

| Need | Use instead |
|------|-------------|
| Temporal fact tracking, point-in-time queries | [Graphiti](../projects/getzep-graphiti.md) — bi-temporal edges, entity resolution, proven LongMemEval results |
| Agent-controlled memory, multi-agent coordination | [Letta](../projects/letta-ai-letta.md) — editable context blocks, sleeptime consolidation agents |
| Cognitive-science-inspired decay, self-hosted only | OpenMemory — sector-based decay, reflection, no managed service |
| Simple RAG without memory management overhead | Any [vector database](../concepts/vector-database.md) with direct retrieval |

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Semantic Memory](../concepts/semantic-memory.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Model Context Protocol](../concepts/model-context-protocol.md)

## Sources

- [Deep repo analysis: mem0ai/mem0](../raw/deep/repos/mem0ai-mem0.md)
- [Repo summary: mem0ai/mem0](../raw/repos/mem0ai-mem0.md)
- [Deep repo analysis: getzep/graphiti](../raw/deep/repos/getzep-graphiti.md) — comparative context
- [Deep repo analysis: letta-ai/letta](../raw/deep/repos/letta-ai-letta.md) — comparative context

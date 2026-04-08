---
entity_id: mem0
type: project
bucket: agent-memory
abstract: >-
  Mem0 is a drop-in persistent memory layer for AI agents that extracts atomic
  facts from conversations via a two-LLM-call pipeline and stores them in a
  vector database, differentiating itself from RAG by managing memory as live
  user/session/agent state rather than static document retrieval.
sources:
  - repos/memorilabs-memori.md
  - repos/thedotmack-claude-mem.md
  - repos/mem0ai-mem0.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
  - anthropic
  - claude-code
  - retrieval-augmented-generation
last_compiled: '2026-04-08T02:44:21.748Z'
---
# Mem0

**Type:** Project | **Bucket:** Agent Memory | **License:** Apache 2.0

Mem0 adds persistent, adaptive memory to AI agents through automatic fact extraction and reconciliation. Where [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) retrieves from static document corpora, Mem0 maintains a live, evolving knowledge store per user or agent that grows and self-corrects across conversations.

51,880 GitHub stars, Y Combinator S24. Python and TypeScript SDKs. Managed platform at app.mem0.ai with SOC 2 Type II certification.

---

## What It Does

An agent wrapped with Mem0 gains three capabilities: it remembers facts across sessions without any explicit "save" action, it surfaces relevant past facts before generating responses, and it automatically resolves contradictions in stored facts (e.g., a user changes jobs, and the old employer record gets replaced).

The core promise is eliminating the "please remind me who you are" friction from every new conversation, while keeping token usage low by injecting only relevant facts rather than full history.

---

## Architecture

Mem0 is a Python package (`mem0/`) built on four subsystems wired together via factory patterns:

- **LLM Layer** (`mem0/llms/`) — 16 provider implementations behind `LlmFactory`. Default: `gpt-4.1-nano-2025-04-14`.
- **Embedding Layer** (`mem0/embeddings/`) — 11 providers behind `EmbedderFactory`. Default: OpenAI embeddings.
- **Vector Store Layer** (`mem0/vector_stores/`) — 23 backends (Qdrant default at `~/.mem0/`, plus Pinecone, pgvector, Chroma, FAISS, Milvus, Redis, Weaviate, MongoDB, etc.) behind `VectorStoreFactory`.
- **Graph Store Layer** (`mem0/memory/graph_memory.py`) — Optional Neo4j knowledge graph via `langchain_neo4j`, off by default.

A `SQLiteManager` (`mem0/memory/storage.py`) tracks change history (ADD/UPDATE/DELETE events) for audit, but does not store memories themselves.

The `MemoryConfig` Pydantic model (`mem0/configs/base.py`) configures all subsystems and accepts custom extraction and update prompts.

---

## Core Mechanism: Two-Pass LLM Pipeline

Every `memory.add(messages, user_id=...)` call runs through `Memory._add_to_vector_store()` in two sequential LLM passes.

**Pass 1: Fact Extraction**

The LLM receives the conversation and a system prompt from `configs/prompts.py` (`USER_MEMORY_EXTRACTION_PROMPT` or `AGENT_MEMORY_EXTRACTION_PROMPT` depending on whether `agent_id` is present). It returns:

```json
{"facts": ["Name is John", "Is a software engineer", "Likes cheese pizza"]}
```

User extraction penalizes including assistant-turn content. Agent extraction does the reverse. The selection logic lives in `_should_use_agent_memory_extraction()`.

**Pass 2: Memory Reconciliation**

Each extracted fact is embedded and used to query the vector store for the top 5 similar existing memories. All retrieved memories are collected, deduplicated by ID, then passed to a second LLM call with `DEFAULT_UPDATE_MEMORY_PROMPT`.

A critical implementation detail: real UUIDs are mapped to sequential integers before the LLM sees them, then mapped back afterward. This prevents UUID hallucination:

```python
temp_uuid_mapping = {}
for idx, item in enumerate(retrieved_old_memory):
    temp_uuid_mapping[str(idx)] = item["id"]
    retrieved_old_memory[idx]["id"] = str(idx)
```

The LLM returns one of four operations per memory: **ADD** (new fact), **UPDATE** (modify existing, referenced by integer ID), **DELETE** (contradiction detected), or **NONE** (no change). Each is then executed against the vector store, with changes logged to SQLite.

These two prompts are the entire intelligence of the system. Everything else is infrastructure serving them.

**Optional: Graph Memory**

When Neo4j is configured, `MemoryGraph` runs in parallel via `concurrent.futures.ThreadPoolExecutor`. It adds three more LLM calls per `add()`: entity extraction (`EXTRACT_ENTITIES_TOOL`), relation establishment (`RELATIONS_TOOL`), and deletion checking. Relationships use soft deletion (`r.valid = false`, `r.invalidated_at = datetime()`) rather than hard deletes. BM25 reranking (`rank_bm25.BM25Okapi`) is applied to graph search results using simple whitespace tokenization.

**Procedural Memory**

A third memory type (`MemoryType.PROCEDURAL`) creates summarized execution histories from agent conversations. Activated with `memory_type="procedural_memory"` and requires `agent_id`.

---

## Memory Scoping Model

Mem0 implements four conceptual memory tiers, all stored in the same flat vector collection differentiated by metadata filters:

| Tier | Scope Key | Lifespan |
|------|-----------|----------|
| Conversation | ephemeral (in messages) | Current turn only |
| Session | `session_id` | Duration of workflow |
| User | `user_id` | Indefinite |
| Organizational | `agent_id` (shared) | Indefinite, shared |

The hierarchy is conceptual, not structural. "Promotion" from session to user memory requires the application to manage scope keys appropriately.

---

## Key Numbers

**51,880 stars** — high but consistent with the project's focus on ease of integration and broad framework support.

**From the README (self-reported, arXiv:2504.19413):**
- +26% accuracy over OpenAI Memory on LOCOMO benchmark
- 91% faster responses vs. full-context
- 90% fewer tokens vs. full-context

These claims have not been independently replicated in the repository. The codebase contains unit tests for components but no benchmark scripts or LOCOMO evaluation code. The Zep/Graphiti paper (arXiv:2501.13956) provides independent validation that selective memory retrieval reduces latency by ~90% and tokens by ~98% on 115k-token conversations — supporting the directional claim, though from a different system. Treat the specific 26% figure as self-reported until independently verified.

**Minimum LLM calls per `add()`:** 2 (extraction + reconciliation), plus N embedding calls where N = extracted facts.

**With graph enabled:** 5+ LLM calls per `add()`.

---

## Strengths

**Lowest integration friction in the memory space.** Wrapping any conversation with `memory.add()` and `memory.search()` requires no changes to the agent itself. No graph database, no background workers, no agent tooling changes.

**Broad provider support.** 16 LLM providers, 23 vector store backends, 11 embedding providers. Teams rarely need to change their existing infrastructure to adopt it.

**Flat architecture is fast to understand and debug.** The two-prompt pipeline is the whole system. When memory quality degrades, there are exactly two places to look: the extraction prompt and the reconciliation prompt.

**Framework integrations.** First-class support for [LangChain](../projects/langchain.md), [CrewAI](../projects/crewai.md), [LangGraph](../projects/langgraph.md), and MCP. The MCP integration allows LLMs to call memory operations as tools directly, without application-level wiring.

---

## Critical Limitations

**Failure mode — silent data loss on LLM JSON errors.** The reconciliation step requires valid JSON from the LLM. The code tries `remove_code_blocks()`, then `extract_json()` regex, then gives up. If the LLM returns malformed output, `new_memories_with_actions` silently becomes `{}` and no memories are written. No exception is raised to the caller. Similarly, when the LLM hallucinates an integer ID that doesn't exist in `temp_uuid_mapping`, a `KeyError` is caught per-memory and logged but not surfaced. Callers have no reliable signal that a memory write partially or fully failed.

**Unspoken infrastructure assumption: memory is unbounded.** There is no compaction, summarization, or pruning. The vector store grows monotonically. The `limit=100` default on `search()` and `get_all()` caps retrieval but not storage. Organizational memory shared across multiple agents accumulates without governance. Over months of production use, retrieval quality may degrade as the signal-to-noise ratio in the vector store drops.

---

## When NOT to Use It

**Multi-session temporal reasoning.** Mem0 stores facts as flat strings with timestamps but does not model fact validity windows. "Alice used to work at Acme, now works at Google" gets handled by the reconciliation LLM updating or deleting the old fact, but the system cannot answer "what did we know about Alice's employer in January?" [Graphiti](../projects/graphiti.md) implements bi-temporal edges (`valid_at`, `invalid_at`) precisely for this use case.

**Agent-controlled memory.** If you want the agent itself to decide what to remember, when to forget, and how to organize its knowledge, Mem0's automatic extraction is the wrong model. [Letta](../projects/letta.md) gives agents explicit tools (`core_memory_replace`, `rethink_memory`) to self-manage their own context blocks.

**Structured entity-relationship queries.** "What is Alice's relationship to Bob?" requires parsing flat text strings. Mem0's optional graph layer addresses this, but adds 3 LLM calls per `add()` and requires Neo4j. [Graphiti](../projects/graphiti.md) makes the graph the primary storage with predefined Cypher queries for reliability.

**High-throughput concurrent writes.** Multiple concurrent `add()` calls for the same `user_id` can race: both read existing memories, both decide to ADD the same fact, producing duplicates. There is no per-user locking beyond SQLite's history writes.

---

## Unresolved Questions

**Organizational memory governance.** The documentation acknowledges that organizational memory "depends on owner maintenance," but does not specify what governance looks like in practice. Who removes outdated organizational facts? How does a team discover what's in shared memory? At scale, this becomes a data quality problem with no built-in tooling.

**Extraction quality across LLM providers.** The default model is `gpt-4.1-nano`. The extraction and reconciliation prompts were presumably tuned against this model. How much does quality degrade with Ollama local models, weaker providers, or non-English conversations? The codebase has no cross-provider extraction quality tests.

**Cost at scale.** With 2+ LLM calls per conversation turn for every active user, costs compound. A product with 10,000 daily active users having 10 exchanges each requires 200,000+ LLM calls per day just for memory operations, plus the primary inference calls. The managed platform pricing is not published in the repository.

**The +26% accuracy figure.** The LOCOMO benchmark evaluation is cited in the paper (arXiv:2504.19413) but no evaluation script exists in the repository. The conditions (which LLM, which vector store, what chunk sizes, what retrieval limit) are not reproducible from the public codebase.

---

## Alternatives

| System | Use When |
|--------|----------|
| [Graphiti](../projects/graphiti.md) | You need temporal reasoning ("what did we know when?"), entity-relationship queries, or multi-session cross-reference. Accepts higher infrastructure cost (Neo4j required) and 4-5 LLM calls per episode. |
| [Letta](../projects/letta.md) | You want the agent to manage its own memory via tool calls, or need background memory consolidation via sleeptime agents. Full agent platform, not a memory library. |
| [Zep](../projects/zep.md) | Enterprise deployments requiring the Graphiti temporal graph model with a hosted service layer. |
| [LangChain](../projects/langchain.md) `ConversationBufferMemory` | Simple single-session context window filling with no cross-session persistence needed. |
| [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) | Your memory problem is document retrieval against a static corpus, not user state accumulation. |

---

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — The broader concept Mem0 instantiates.
- [Long-Term Memory](../concepts/long-term-memory.md) — What the user and organizational tiers implement.
- [Episodic Memory](../concepts/episodic-memory.md) — What session-scoped storage approximates.
- [Semantic Memory](../concepts/semantic-memory.md) — What the graph layer provides when enabled.
- [Vector Database](../concepts/vector-database.md) — The primary storage substrate.
- [Hybrid Search](../concepts/hybrid-search.md) — Graph search uses BM25 alongside vector similarity.
- [Context Engineering](../concepts/context-engineering.md) — Mem0 is one implementation of selective context population.
- [OpenMemory](../projects/openmemory.md) — Mem0's self-hosted MCP server variant for personal use.

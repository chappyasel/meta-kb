---
entity_id: mem0
type: project
bucket: agent-memory
abstract: >-
  Mem0 is a persistent memory layer for AI agents that auto-extracts facts from
  conversations via a two-pass LLM pipeline, storing them in a vector database
  for retrieval across sessions.
sources:
  - repos/memorilabs-memori.md
  - repos/caviraoss-openmemory.md
  - repos/thedotmack-claude-mem.md
  - repos/mem0ai-mem0.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/letta-ai-letta.md
related:
  - rag
  - openai
  - claude-code
  - openclaw
  - anthropic
  - episodic-memory
  - mcp
  - langgraph
  - cursor
  - claude
  - vector-database
  - graphiti
  - zep
  - locomo
  - postgresql
  - procedural-memory
  - ollama
  - neo4j
  - crewai
  - agent-memory
  - embedding-model
  - pinecone
  - gemini
  - memory-evolution
  - entity-extraction
  - emotional-memory
last_compiled: '2026-04-07T11:40:53.488Z'
---
# Mem0

## What It Does

Mem0 adds persistent, user-scoped memory to LLM applications and agents. Instead of passing full conversation histories into context windows, it extracts atomic facts from conversations, stores them in a vector database, and retrieves relevant facts on demand. The result is a memory system that survives across sessions and users without requiring the application to manage context manually.

The key differentiator from [Retrieval-Augmented Generation](../concepts/rag.md) over raw documents is that Mem0 continuously updates its memory store: new facts can overwrite, supplement, or delete existing ones. It is not a document retrieval system; it is a living fact store that evolves with each conversation.

## Architecture

Mem0 is organized as a Python package with four pluggable subsystems wired together by the `Memory` class in `mem0/memory/main.py`:

**LLM Layer** (`mem0/llms/`) — 16 provider implementations behind `LlmFactory`. Default model is `gpt-4.1-nano-2025-04-14`. All fact extraction and reconciliation runs through this layer.

**Embedding Layer** (`mem0/embeddings/`) — 11 providers behind `EmbedderFactory`. Default is OpenAI embeddings. Every fact gets embedded before storage and every search query gets embedded before retrieval.

**Vector Store Layer** (`mem0/vector_stores/`) — 23 backends (Qdrant, Pinecone, Chroma, pgvector, FAISS, Milvus, Redis, Weaviate, MongoDB, and more) behind `VectorStoreFactory`. Default is Qdrant with local file storage at `~/.mem0/`. This is the primary storage for all memories.

**Graph Store Layer** (`mem0/memory/graph_memory.py`) — Optional Neo4j-based knowledge graph via `langchain_neo4j`. Disabled by default; activated when `graph_store.config` is provided. Runs in parallel with vector store operations via `concurrent.futures.ThreadPoolExecutor`.

A `SQLiteManager` in `mem0/memory/storage.py` tracks change history (ADD/UPDATE/DELETE events) as an audit trail. It stores no memories itself — only the log of mutations.

### Memory Scoping

Mem0's four "memory tiers" (conversation, session, user, organizational) are not separate storage systems. They are metadata filters on the same flat vector collection. The fields `user_id`, `agent_id`, `session_id`, and `run_id` scope queries; there is no hierarchical storage underneath.

## Core Mechanism: Two-Pass LLM Pipeline

The heart of Mem0 is the extraction-then-reconciliation pipeline in `Memory._add_to_vector_store()` (main.py, lines 475–706).

**Pass 1 — Fact Extraction.** The LLM receives the conversation with a system prompt (`USER_MEMORY_EXTRACTION_PROMPT` or `AGENT_MEMORY_EXTRACTION_PROMPT` from `configs/prompts.py`) and returns JSON:

```json
{"facts": ["Name is John", "Is a Software engineer", "Likes cheese pizza"]}
```

The two variants differ in what they extract: user extraction ignores assistant messages; agent extraction (used when `agent_id` is present) ignores user messages. Selection happens in `_should_use_agent_memory_extraction()`.

**Pass 2 — Memory Reconciliation.** For each extracted fact, Mem0 embeds it, searches the vector store for the top 5 similar existing memories, then passes all retrieved memories to a second LLM call with `DEFAULT_UPDATE_MEMORY_PROMPT`. A critical detail: real UUIDs are mapped to sequential integers (0, 1, 2, ...) before the LLM sees them, then mapped back afterward. This prevents UUID hallucination in the LLM's JSON output.

The LLM returns one of four operations per memory: ADD, UPDATE, DELETE, or NONE. Each operation executes against the vector store. ADD creates a new vector entry; UPDATE overwrites payload and re-embeds; DELETE removes the entry and logs to SQLite history.

Two LLM calls per `add()` is the minimum. With graph enabled: five or more (entity extraction, relation establishment, deletion checking, plus the two base calls). With multiple extracted facts, there are also N embedding calls where N is the number of new facts.

### Optional Graph Memory

When Neo4j is configured, `MemoryGraph` runs in parallel with vector store operations. The pipeline: LLM extracts entity-type pairs → second LLM call establishes source-relationship-destination triples → graph search finds existing relevant nodes → third LLM call identifies contradictions → contradicted relationships get `valid = false` and `invalidated_at = datetime()` (soft delete, never garbage-collected).

Search results with graph enabled return a `relations` array alongside vector results. The graph handles structural queries that pure similarity search misses, like "What is Alice's relationship to Bob?" BM25 reranking (`rank_bm25.BM25Okapi`) is applied over graph results, using simple whitespace tokenization — no stemming, no stopwords.

## Key Numbers

**51,880 GitHub stars**, 5,805 forks, Apache-2.0 license, Y Combinator S24. (Stars are self-evident community signal; independently verifiable.)

Performance claims from their arXiv paper (2504.19413): +26% accuracy over OpenAI Memory on the LOCOMO benchmark, 91% faster responses, 90% fewer tokens versus full-context approaches. These are **self-reported** in the paper by the Mem0 team. The Zep/Graphiti paper (arXiv:2501.13956) provides independent validation that selective memory retrieval reduces context from 115k to ~1.6k tokens with 90% latency reduction — consistent with Mem0's claims, though measured on a different system. The 26% LOCOMO accuracy improvement has not been independently replicated in the visible literature.

## Strengths

**Drop-in integration.** Wrapping `memory.add()` around existing conversations and `memory.search()` before LLM calls requires no changes to the agent itself. Extraction is automatic.

**Backend flexibility.** 23 vector store backends and 16 LLM providers means Mem0 fits whatever infrastructure a team already runs. Swapping from Qdrant to pgvector or from OpenAI to Anthropic requires only config changes.

**Semantic deduplication.** The two-pass LLM approach handles semantic equivalence ("Likes cheese pizza" vs. "Loves cheese pizza") that embedding cosine thresholds miss. No manual deduplication logic required.

**Low operational overhead.** Self-hosted mode needs only a Python environment and a vector store. Default Qdrant uses local file storage, so there is no external service dependency to start.

## Critical Limitations

**Failure mode — silent data loss.** When the reconciliation LLM call produces malformed JSON, the code in `main.py` (around line 696) catches `KeyError` per-memory and logs it, but does not surface it to the caller. The `add()` call returns success with no memories stored. There is no retry mechanism. Operators have no visibility into these failures unless they examine logs.

**Unspoken infrastructure assumption — concurrent write safety.** Multiple simultaneous `add()` calls for the same `user_id` can race: both read the same existing memories, both extract overlapping facts, both decide to ADD, and duplicates accumulate. There is no locking on the vector store. The SQLite history lock covers audit writes only. High-concurrency deployments (multi-threaded chatbots, multi-agent systems) require external serialization that the documentation does not mention.

## When Not to Use It

**Temporal reasoning requirements.** Mem0's vector store has no temporal model. Facts are stored with creation/update timestamps, but the system cannot answer "What did Alice say about her employer in January 2023?" vs. "What does she say now?" The soft-delete on graph edges helps, but vector memories are overwritten, not timestamped for validity windows. Use [Graphiti](../projects/graphiti.md) instead, which implements a genuine bi-temporal edge model with `valid_at`/`invalid_at` timestamps.

**Complex entity relationship queries.** The flat fact store cannot express or query relationships between entities. "What entities are connected to Alice?" requires parsing stored text strings, not a graph traversal. Graphiti's knowledge graph with BFS search handles this directly.

**High-volume ingestion pipelines.** At minimum two LLM calls per `add()` plus N embeddings, with five or more calls when graph is enabled, the per-message cost is substantial. Ingesting thousands of historical conversations is expensive and slow. [Letta](../projects/letta.md)'s block-based memory modifies context directly without per-message LLM extraction overhead for existing content.

**Applications requiring strict consistency.** The LLM decides what to remember, how to update it, and whether to delete contradictions. This introduces non-determinism that cannot be eliminated without changing the architecture. Deterministic memory management requires a different system.

## Unresolved Questions

**Organizational memory governance.** The documentation mentions organizational-scoped memory for "collective knowledge" but is silent on who can delete or update organizational memories, how conflicts between user-level and org-level facts are resolved, and what prevents memory sprawl in shared namespaces.

**Cost at scale.** There is no published data on per-user memory costs at 10,000+ users with active conversation histories. The 90% token reduction relative to full-context is compelling, but the two-pass extraction cost on every message is not quantified against alternatives.

**Graph soft-delete accumulation.** Invalidated relationships (`valid = false`) are never garbage-collected. No documentation addresses when or how to compact the graph, or what query performance looks like after millions of invalidations.

**Custom prompt injection risk.** The `custom_fact_extraction_prompt` and `custom_update_memory_prompt` config options are interpolated directly into LLM calls. The documentation says nothing about input sanitization.

**Version compatibility.** The v1.0.0 release notes breaking changes requiring a migration guide. The stability guarantee for future versions is not specified.

## Alternatives and Selection Guidance

**Use [Graphiti](../projects/graphiti.md)** when you need temporal reasoning across sessions (bi-temporal edges), entity relationship traversal, or structured knowledge graph queries. Graphiti makes 4–5 LLM calls per episode and requires Neo4j or FalkorDB, but produces structured fact triples with provenance and temporal validity. Its LongMemEval benchmark shows +18.5% accuracy over full-context for complex multi-session tasks (independently validated in the Zep paper).

**Use [Letta](../projects/letta.md)** when the agent itself should manage its own memory. Letta's memory blocks sit directly in the LLM system prompt; the agent decides what to remember via tool calls like `core_memory_replace` and `rethink_memory`. This requires no external vector store for core memory and supports self-organizing knowledge, but memory quality depends entirely on model capability.

**Use [Zep](../projects/zep.md)** when you need enterprise SLAs, managed infrastructure, or the LongMemEval-validated accuracy gains with SOC 2 compliance. Zep is the hosted version of the Graphiti architecture with managed Neo4j.

**Use Mem0** when you want the simplest possible persistent memory with broad backend compatibility, automatic extraction requiring no agent modifications, and a managed hosted option with SOC 2 certification. It works well for personalization, preference tracking, and cross-session context. It is the wrong choice for temporal reasoning, relational queries, or deterministic memory management.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader concept Mem0 implements
- [Vector Database](../concepts/vector-database.md) — the primary storage layer
- [Embedding Model](../concepts/embedding-model.md) — powers similarity search
- [Entity Extraction](../concepts/entity-extraction.md) — what Pass 1 accomplishes
- [Memory Evolution](../concepts/memory-evolution.md) — the UPDATE/DELETE loop
- [Episodic Memory](../concepts/episodic-memory.md) — one cognitive tier the docs reference
- [Procedural Memory](../concepts/procedural-memory.md) — the `MemoryType.PROCEDURAL` mode
- [Retrieval-Augmented Generation](../concepts/rag.md) — what Mem0 augments or replaces

## Sources

- [Deep repository analysis](../raw/deep/repos/mem0ai-mem0.md)
- [Graphiti architecture comparison](../raw/deep/repos/getzep-graphiti.md)
- [Letta architecture comparison](../raw/deep/repos/letta-ai-letta.md)
- [OpenMemory comparison](../raw/deep/repos/caviraoss-openmemory.md)
- [GitHub repository summary](../raw/repos/mem0ai-mem0.md)

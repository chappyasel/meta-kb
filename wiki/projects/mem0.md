---
entity_id: mem0
type: project
bucket: agent-memory
abstract: >-
  Mem0 is a persistent memory layer for AI apps that extracts atomic facts from
  conversations and reconciles them against a vector store using a two-pass LLM
  pipeline; differentiator is broad backend support (23 vector stores, 16 LLMs)
  with minimal integration overhead.
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
  - rag
  - openai
  - episodic-memory
  - mcp
  - anthropic
  - semantic-memory
last_compiled: '2026-04-06T02:04:30.781Z'
---
# Mem0

## What It Does

Mem0 adds persistent, personalized memory to LLM applications and agents. Where most AI interactions are stateless, Mem0 intercepts conversations, extracts atomic facts ("prefers dark mode," "works at Google"), and stores them in a vector database. On subsequent interactions, relevant memories are retrieved and injected into the prompt. The result is an AI that remembers users across sessions without developers manually managing storage or retrieval.

The project targets three tiers: self-hosted open source (`pip install mem0ai`), a managed cloud platform (app.mem0.ai, SOC 2 Type II), and a CLI (`mem0` command). Python and Node.js SDKs are maintained.

**Key metrics:** 51,880 GitHub stars, Y Combinator S24, Apache-2.0 license. The claimed benchmarks (+26% accuracy vs. OpenAI Memory on LOCOMO, 91% faster, 90% fewer tokens) are self-reported in their own paper (arXiv:2504.19413) — not independently validated. No benchmark scripts exist in the repository.

---

## Core Mechanism: Two-Pass LLM Pipeline

The entire intelligence of Mem0 lives in two prompts. Everything else (vector stores, embeddings, graph) is infrastructure serving those two LLM calls.

### Pass 1 — Fact Extraction

When `memory.add(messages, user_id="alice")` is called, the conversation hits `USER_MEMORY_EXTRACTION_PROMPT` or `AGENT_MEMORY_EXTRACTION_PROMPT` (from `mem0/configs/prompts.py`). The LLM returns:

```json
{"facts": ["Name is Alice", "Prefers dark mode", "Works at Google"]}
```

The prompt distinguishes user vs. agent memory: user extraction ignores assistant messages, agent extraction (activated when `agent_id` is present) ignores user messages. This is the only structural intelligence at the extraction stage — otherwise it is pure prompt engineering.

### Pass 2 — Memory Reconciliation

Each extracted fact is embedded, then used to search the vector store for the top 5 semantically similar existing memories. All retrieved memories are collected, deduplicated by ID, and passed to `DEFAULT_UPDATE_MEMORY_PROMPT`.

A critical implementation detail: Mem0 maps real UUIDs to sequential integers (0, 1, 2, ...) before sending them to the LLM, then maps back afterward. This exists specifically to prevent UUID hallucination:

```python
temp_uuid_mapping = {}
for idx, item in enumerate(retrieved_old_memory):
    temp_uuid_mapping[str(idx)] = item["id"]
    retrieved_old_memory[idx]["id"] = str(idx)
```

The LLM returns one of four operations per memory: **ADD**, **UPDATE**, **DELETE**, or **NONE**. These are executed against the vector store, with each change logged to a SQLite audit trail (`mem0/memory/storage.py`).

Minimum cost per `add()`: 2 LLM calls + N embedding calls (N = extracted facts) + N vector searches.

### Optional Graph Memory

When Neo4j is configured, `MemoryGraph` (`mem0/memory/graph_memory.py`) runs in parallel via `concurrent.futures.ThreadPoolExecutor`. The graph pipeline adds 3 more LLM calls: entity extraction, relation establishment, and deletion checking. Relations use soft deletion (`r.valid = false`) rather than hard deletes, enabling temporal queries.

Graph search uses BM25 reranking (`rank_bm25.BM25Okapi`) over entity-relationship-entity triples — simple word tokenization with no stemming or stopword removal. Off by default; requires Neo4j.

---

## Architecture

**Factory pattern throughout.** Four subsystems, each behind a factory:

- `LlmFactory` — 16 providers (OpenAI default: `gpt-4.1-nano-2025-04-14`, Anthropic, Groq, Ollama, vLLM, etc.)
- `EmbedderFactory` — 11 providers (OpenAI default)
- `VectorStoreFactory` — 23 backends (Qdrant local default at `~/.mem0/`, Pinecone, pgvector, Chroma, FAISS, Milvus, Redis, Weaviate, MongoDB, Elasticsearch, and 13 more)
- Optional `GraphStore` — Neo4j, Apache AGE, Memgraph, Kuzu, Neptune

**Memory scoping** is flat metadata filtering, not separate storage systems. `user_id`, `agent_id`, `session_id`, and `run_id` are filter keys on the same vector collection. The documentation describes four conceptual tiers (conversation, session, user, organizational), but the underlying store is a single flat collection.

**Storage:** SQLite (`mem0/memory/storage.py`) tracks change history only — not memories themselves. The vector store holds all memory payloads.

---

## Strengths

**Minimal integration overhead.** Wrapping existing conversations in `memory.add()` and `memory.search()` requires no changes to the agent itself. No agent self-management (as in [Letta](../projects/letta.md)), no graph database setup (as in [Graphiti](../projects/graphiti.md)).

**Broadest backend compatibility.** 23 vector store backends means Mem0 fits into almost any existing infrastructure. Teams running Pinecone, Elasticsearch, or MongoDB can use their current stack.

**Automatic extraction is invisible to users.** There is no explicit "save" action. Facts accumulate from natural conversation flow, which simplifies the developer integration pattern substantially.

**Manages token costs.** Retrieving 5-20 word atomic facts instead of full conversation history is why the claimed 90% token reduction is plausible — this is a general property of selective memory retrieval, not unique to Mem0's algorithm, but Mem0 makes it easy to implement.

---

## Critical Limitations

**Concrete failure mode — silent data loss from JSON parsing errors.** The reconciliation step requires the LLM to return valid JSON. The code in `main.py` has fallback layers (`remove_code_blocks()`, `extract_json()`) but if these fail, `new_memories_with_actions` defaults to an empty dict and the operation silently produces no updates. Additionally, the LLM can hallucinate integer IDs that don't exist in `temp_uuid_mapping` — each `KeyError` is caught and logged but not surfaced to the caller. Neither failure throws an exception.

**Unspoken infrastructure assumption — unbounded vector store growth.** There is no compaction, summarization, or pruning of old memories. The vector store grows monotonically with every conversation. For applications with millions of users or long-running agents, this becomes a storage cost and query latency problem that the documentation does not address. The `limit=100` default on search caps retrieval, not storage.

---

## When NOT to Use Mem0

**Temporal reasoning across sessions.** If your application needs to answer "where did Alice work in 2023?" or track how facts changed over time, Mem0 lacks the bi-temporal data model to answer this correctly. The graph memory layer uses soft deletion but does not record valid_at/invalid_at ranges on relationships. Use [Graphiti](../projects/graphiti.md) instead.

**Agent self-reflection and memory reorganization.** If you want the agent itself to decide what to remember, consolidate its own knowledge, or actively manage its context window, Mem0's fully automatic extraction removes that agency. Use [Letta](../projects/letta.md) instead.

**High-throughput pipelines where latency is critical.** The minimum 2 LLM calls per `add()` (5+ with graph) runs synchronously. For ingestion pipelines processing thousands of conversations per minute, this is a bottleneck. There is no async `add()` in the open-source library; concurrent calls for the same `user_id` can race, producing duplicate memories.

**Strict PII or security requirements without additional controls.** The documentation explicitly warns: "avoid storing secrets or unredacted PII in user or org memories." The system is designed for retrieval, not secure storage. Without encryption or hashing before storage, anything said in a conversation may be persisted.

---

## Unresolved Questions

**LOCOMO benchmark validity.** The +26% accuracy claim references their own paper (arXiv:2504.19413). The repository contains no evaluation scripts. Independent reproduction of this benchmark has not been published.

**Organizational memory governance.** The documentation lists "organizational memory" as a tier for shared context across agents or teams, but notes it "depends on owner maintenance." There is no access control model, no memory lifecycle policy, and no mechanism to detect or resolve conflicts when multiple agents write to the same organizational memory. Who owns shared organizational memories in a multi-tenant deployment is unanswered.

**LLM extraction quality variance.** The entire system depends on two prompts. The documentation does not report how extraction quality degrades across different LLM providers or model sizes. Switching from `gpt-4o` to a smaller model may silently degrade memory quality without any observable error signal.

**Cost at scale for the hosted platform.** The managed platform pricing is not publicly documented in the repository. For high-volume production deployments, the per-add cost (2+ LLM calls) across millions of users is non-trivial and depends on whatever LLM the deployment uses.

---

## Alternatives and Selection Guidance

| System | Choose When |
|--------|-------------|
| [Graphiti](../projects/graphiti.md) | You need temporal reasoning, entity relationships, or bi-temporal fact tracking. More LLM calls per operation (4-5+) but structurally richer results. |
| [Letta](../projects/letta.md) | You want the agent to manage its own memory via tool calls, with explicit self-editing and inspection of memory state. Full agent platform, not just a memory layer. |
| [Zep](../projects/zep.md) | Enterprise-grade managed memory with stronger SLAs; Zep's backend is built on Graphiti. |
| [OpenAI Memory](../projects/openai.md) | Simplest path if already using the OpenAI ecosystem; Mem0 claims +26% accuracy over this (self-reported). |
| [RAG](../concepts/rag.md) | Static document retrieval where the knowledge base does not change based on user interactions. Mem0 is not the right tool for document Q&A. |

Mem0 fits best when: you have existing conversations to retrofit with memory, you want broad vector store compatibility, and you do not need temporal fact tracking or agent-managed memory reorganization. It is the lowest-friction entry point in the agent memory space — which is also why its ceiling is lower than more architecturally sophisticated alternatives.

---

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader category this implements
- [Episodic Memory](../concepts/episodic-memory.md) — the cognitive model Mem0 partially implements
- [Semantic Memory](../concepts/semantic-memory.md) — what the fact extraction targets
- [Vector Database](../concepts/vector-database.md) — the primary storage backend
- [Retrieval-Augmented Generation](../concepts/rag.md) — adjacent pattern Mem0 partially replaces
- [Knowledge Graph](../concepts/knowledge-graph.md) — what the optional graph layer implements
- [Memory Consolidation](../concepts/memory-consolidation.md) — absent from Mem0's default mode; Letta's sleeptime pattern addresses this

---
entity_id: mem0
type: project
bucket: agent-memory
abstract: >-
  Mem0 is a persistent memory layer for AI agents that extracts atomic facts
  from conversations via two LLM passes, stores them in a vector database, and
  retrieves relevant context at query time — differentiating itself through
  multi-backend support and a managed hosted service.
sources:
  - deep/repos/getzep-graphiti.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/mem0ai-mem0.md
  - repos/mem0ai-mem0.md
  - repos/memorilabs-memori.md
  - repos/thedotmack-claude-mem.md
related:
  - retrieval-augmented-generation
  - openai
  - anthropic
  - claude-code
last_compiled: '2026-04-08T23:01:33.904Z'
---
# Mem0

**Type:** Project — Agent Memory Layer  
**Repository:** [mem0ai/mem0](https://github.com/mem0ai/mem0)  
**License:** Apache 2.0  
**Stars:** ~51,880 (as of early 2026)  
**Language:** Python + TypeScript SDK

---

## What It Does

Mem0 adds persistent, personalized memory to AI agents and assistants. Instead of appending full conversation history to every prompt, it extracts atomic facts from exchanges and stores them in a vector database. Subsequent queries retrieve only the relevant subset of stored facts, injecting them as a compact memory block.

The core pitch: agents remember that Alice prefers dark mode without Alice having to say so again. The system handles extraction, deduplication, and retrieval automatically, requiring no changes to the underlying LLM or agent logic.

What makes it architecturally distinct from alternatives is the combination of **breadth** (23 vector store backends, 16 LLM providers) and **simplicity** (the entire memory pipeline fits in two LLM calls). It occupies the pragmatic middle ground between Letta's agent-self-editing approach and Graphiti's full knowledge graph system.

---

## Core Mechanism

The memory pipeline lives in `mem0/memory/main.py` inside `Memory._add_to_vector_store()`.

### Pass 1: Fact Extraction

The LLM receives the conversation and a system prompt (`USER_MEMORY_EXTRACTION_PROMPT` or `AGENT_MEMORY_EXTRACTION_PROMPT` from `configs/prompts.py`) and returns structured JSON:

```json
{"facts": ["Name is Alice", "Prefers dark mode", "Works at Google"]}
```

Two prompt variants exist: one extracts only from user messages (when `agent_id` is absent), the other from assistant messages (when `agent_id` is present and assistant content exists). The selection logic in `_should_use_agent_memory_extraction()` is a simple conditional, not a learned classifier.

### Pass 2: Memory Reconciliation

Each extracted fact is embedded, then used to search the vector store for the top 5 semantically similar existing memories. All retrieved memories are deduplicated by ID and sent to a second LLM call with `DEFAULT_UPDATE_MEMORY_PROMPT`.

A notable implementation detail: real UUIDs get mapped to sequential integers (0, 1, 2...) before the LLM sees them, then mapped back afterward. The code comment is explicit — this prevents UUID hallucination:

```python
temp_uuid_mapping = {}
for idx, item in enumerate(retrieved_old_memory):
    temp_uuid_mapping[str(idx)] = item["id"]
    retrieved_old_memory[idx]["id"] = str(idx)
```

The LLM returns one of four decisions per memory: **ADD**, **UPDATE**, **DELETE**, or **NONE**. Each decision executes against the vector store. Deletions also write to a `SQLiteManager` audit trail (`mem0/memory/storage.py`), though the SQLite database stores only the history of changes, not the memories themselves.

### Optional Graph Layer

When Neo4j is configured, `MemoryGraph` (`mem0/memory/graph_memory.py`) runs in parallel via `concurrent.futures.ThreadPoolExecutor`. It adds three more LLM calls: entity extraction, relation establishment, and deletion checking. Soft deletion sets `r.valid = false` with `r.invalidated_at = datetime()`. The graph uses BM25 reranking (`rank_bm25.BM25Okapi`) over results, with simple whitespace tokenization. Graph memory is off by default and opt-in per operation or per project.

### Memory Scoping

The four-tier hierarchy in the documentation (conversation, session, user, organization) describes conceptual groupings, not separate storage systems. Underneath, everything lands in the same flat vector collection. The `user_id`, `agent_id`, `session_id`, and `run_id` fields are metadata filter keys, not architectural partitions.

---

## Architecture

```
Memory (main.py)
├── LlmFactory → 16 providers (OpenAI default: gpt-4.1-nano-2025-04-14)
├── EmbedderFactory → 11 providers
├── VectorStoreFactory → 23 backends (Qdrant default, local ~/.mem0/)
├── MemoryGraph (optional) → Neo4j via langchain_neo4j
└── SQLiteManager → change history / audit trail
```

Configuration via `MemoryConfig` (Pydantic) in `mem0/configs/base.py`. Each subsystem implements a base interface (`LLMBase.generate_response()`, `VectorStoreBase` with `insert/search/get/list/update/delete`).

---

## Key Numbers

**Repository:** ~51,880 stars, 5,805 forks (self-reported via README badge).

**Benchmarks from the Mem0 paper (arXiv:2504.19413) — self-reported:**
- +26% accuracy over OpenAI Memory on LOCOMO benchmark
- 91% faster responses vs. full-context
- 90% fewer tokens vs. full-context

The paper is not independently replicated in the repository — there are no benchmark scripts in `tests/`. The token reduction claim is structurally plausible (retrieving 3–5 short facts instead of full conversation history), but the 26% accuracy figure should be treated as self-reported until external validation appears.

**Independent cross-reference:** The Zep/Graphiti paper (arXiv:2501.13956) shows context reduction from 115k to ~1.6k tokens yields ~90% latency reduction in their system. This corroborates the general mechanism but not Mem0's specific accuracy claims.

**LoCoMo benchmark comparison (from Memori Labs, a competitor — treat with caution):** Memori reports outperforming Mem0 on LoCoMo at 81.95% accuracy vs. Mem0's implied lower score, while using ~1,294 tokens per query. This is a competitor benchmark, not independent validation.

---

## Strengths

**Backend breadth.** 23 vector stores, 16 LLM providers, Python and TypeScript SDKs. Most agent infrastructure projects commit to one or two backends; Mem0 covers essentially every combination a production team might already use.

**Drop-in integration.** Wrap existing conversations in `memory.add()` and `memory.search()`. No agent code changes required. The LLM never needs to know memory exists.

**Managed hosted option.** `app.mem0.ai` handles the vector database, graph services, and reranking as a hosted service, with SOC 2 Type II and GDPR compliance. For teams that don't want to operate databases, this lowers operational burden substantially.

**MCP integration.** Mem0 exposes as a Model Context Protocol server, letting LLMs call memory operations as tools without application-level wiring.

**Semantic deduplication.** Because reconciliation is LLM-driven, the system handles equivalences like "Likes cheese pizza" vs. "Loves cheese pizza" that embedding cosine distance alone would miss.

---

## Critical Limitations

**Failure mode — silent data loss from malformed LLM output.** The reconciliation step requires valid JSON with specific structure. The code tries `remove_code_blocks()`, then `extract_json()` regex extraction, but if the LLM produces malformed output the entire operation produces `new_memories_with_actions = {}` and silently stores nothing. No retry, no exception surfaced to the caller. UUID hallucination in the integer remapping has a per-memory `KeyError` catch at line 696, but the error is only logged — not raised.

**Unspoken infrastructure assumption — no concurrency control.** Multiple concurrent `add()` calls for the same `user_id` can race: both read existing memories, both decide to ADD the same fact, and duplicates accumulate. There is no locking beyond SQLite's thread lock for the history log. This is a real production issue for any system with concurrent users or parallel agent runs.

---

## When NOT to Use It

**Temporal reasoning requirements.** Mem0's vector store has no native temporal model. It cannot answer "what did Alice's employer change from and to, and when?" Graphiti's bi-temporal edges (`valid_at`, `invalid_at`, `expired_at`) handle this. On Graphiti's LongMemEval benchmark, temporal reasoning tasks improved 38.4% — Mem0 has no equivalent architecture for this.

**Relational queries across entities.** Mem0 stores flat fact strings. "What is Alice's relationship to Bob, and what companies do they share?" requires graph traversal. The optional Neo4j integration adds some of this, but the graph layer is a bolt-on that adds three more LLM calls and requires a running Neo4j instance — not the default experience.

**Agent-driven memory management.** If your agents need to decide what to remember, what to forget, and how to organize knowledge, [Letta](../projects/letta.md) gives agents explicit tools (`core_memory_replace`, `rethink_memory`) to self-manage their context window. Mem0's extraction is automatic and invisible — the agent has no say.

**High-throughput write paths.** Each `add()` call makes at minimum 2 LLM calls + N embedding calls where N equals the number of extracted facts. With graph enabled: 5+ LLM calls. At high volume, this creates significant latency and cost. The system provides no batching for the reconciliation step.

**Auditable fact provenance.** Mem0 stores no source linkage. If a stored fact is wrong, you cannot trace it back to the conversation that produced it. Graphiti's episode-to-entity provenance chain enables this; Mem0 does not.

---

## Unresolved Questions

**Governance at organizational memory scale.** The documentation notes that organizational memory "depends on owner maintenance," but does not specify what happens when owners leave, how permissions work across tenants, or how stale organizational facts get cleaned up. The vector store grows monotonically with no compaction.

**Custom prompt injection risk.** `custom_fact_extraction_prompt` and `custom_update_memory_prompt` config options are directly interpolated into LLM calls. The documentation does not address prompt injection risks from user-controlled content being processed with custom prompts.

**Graph memory consistency under failure.** If the vector store write succeeds but the parallel Neo4j write fails (or vice versa), the two stores diverge. There is no transaction boundary spanning both backends, and no documentation on how to detect or repair this inconsistency.

**Soft-delete accumulation in graph.** Soft-deleted graph relationships (`valid = false`) are never garbage collected. For long-running deployments, this grows unbounded and every query must filter the invalid set.

**Benchmark reproducibility.** The paper's LOCOMO benchmark scripts are not in the repository. The +26% accuracy claim cannot be reproduced from the public codebase.

---

## Alternatives

| When to choose | System |
|---|---|
| Need temporal reasoning, entity resolution, and knowledge graph structure | [Graphiti](../projects/graphiti.md) — bi-temporal edges, 5-stage LLM pipeline, requires Neo4j |
| Agents should manage their own memory via tool calls | [Letta](../projects/letta.md) — memory as editable prompt blocks, agent decides what to remember |
| Already running Zep's managed platform | [Zep](../projects/zep.md) — production-managed version of Graphiti's architecture |
| Need multi-agent coordination with shared memory | [Letta](../projects/letta.md) — shared memory blocks enable cross-agent state |
| Minimal infrastructure, embed-only use case | [ChromaDB](../projects/chromadb.md) directly, skip the extraction layer |

**Use Mem0 when:** You want persistent memory with minimal integration friction, you already use one of the 23 supported vector backends, you don't need temporal reasoning or complex entity relationships, and the automatic extraction model (rather than agent-controlled memory) fits your architecture.

---

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader concept Mem0 implements
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the retrieval pattern Mem0 uses
- [Long-Term Memory](../concepts/long-term-memory.md) — what the persistent storage layer provides
- [Semantic Memory](../concepts/semantic-memory.md) — the cognitive analogue for stored facts
- [Vector Database](../concepts/vector-database.md) — the primary storage layer
- [Hybrid Search](../concepts/hybrid-search.md) — optional with graph layer enabled
- [Knowledge Graph](../concepts/knowledge-graph.md) — optional Neo4j layer
- [Context Engineering](../concepts/context-engineering.md) — what Mem0 reduces by compressing history into facts

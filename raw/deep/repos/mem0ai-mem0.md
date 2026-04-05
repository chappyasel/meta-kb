---
url: 'https://github.com/mem0ai/mem0'
type: repo
author: mem0ai
date: '2026-04-04'
tags:
  - agent-memory
  - multi-level-memory
  - vector-store
  - context-engineering
  - personalization
  - fact-extraction
key_insight: >-
  Mem0's core mechanism is a two-pass LLM pipeline: first extracting atomic facts from
  conversations, then running a second LLM call to diff those facts against existing
  vector-stored memories to decide ADD/UPDATE/DELETE/NONE operations. This is simpler
  than it appears from the README -- there is no learned retrieval or sophisticated
  deduplication, just prompt engineering over JSON with integer-ID mapping to prevent
  UUID hallucination.
stars: 51800
deep_research:
  method: source-code-analysis
  files_analyzed:
    - mem0/memory/main.py
    - mem0/memory/base.py
    - mem0/memory/graph_memory.py
    - mem0/memory/storage.py
    - mem0/memory/utils.py
    - mem0/configs/base.py
    - mem0/configs/prompts.py
    - mem0/utils/factory.py
    - mem0/vector_stores/qdrant.py
    - mem0/graphs/tools.py
    - mem0/graphs/utils.py
    - mem0/llms/openai.py
  analyzed_at: '2026-04-04'
  original_source: repos/mem0ai-mem0.md
---

## Architecture Overview

Mem0 is organized as a Python package (`mem0/`) with a clean plugin architecture built around factory patterns. The central class is `Memory` in `mem0/memory/main.py`, which orchestrates four subsystems:

1. **LLM Layer** (`mem0/llms/`) -- 16 provider implementations (OpenAI, Anthropic, Groq, Ollama, vLLM, etc.) behind a `LlmFactory`. Default model is `gpt-4.1-nano-2025-04-14`.
2. **Embedding Layer** (`mem0/embeddings/`) -- 11 providers behind an `EmbedderFactory`. Default is OpenAI embeddings.
3. **Vector Store Layer** (`mem0/vector_stores/`) -- 23 backends (Qdrant, Pinecone, Chroma, pgvector, FAISS, Milvus, Redis, Weaviate, MongoDB, etc.) behind a `VectorStoreFactory`. Default is Qdrant with local file storage at `~/.mem0/`.
4. **Graph Store Layer** (`mem0/memory/graph_memory.py`) -- Optional Neo4j-based knowledge graph via `langchain_neo4j`. Only activated when `graph_store.config` is provided.

Additionally, a `SQLiteManager` (`mem0/memory/storage.py`) tracks memory change history (ADD/UPDATE/DELETE events) for auditability.

The `MemoryConfig` Pydantic model in `mem0/configs/base.py` ties everything together -- it holds configs for vector_store, llm, embedder, graph_store, and reranker, plus custom prompt overrides.

### Conceptual Memory Hierarchy

The official documentation describes a four-tier memory hierarchy that maps onto cognitive memory models:

1. **Conversation Memory** -- In-flight messages inside a single turn (what was just said). Ephemeral; expires after the current response.
2. **Session Memory** -- Short-lived context spanning minutes to hours, ideal for multi-step workflows. Resets when the session is complete.
3. **User Memory** -- Long-term persistent knowledge tied to individual accounts, lasting weeks to indefinitely. This is the primary tier that mem0's vector store powers.
4. **Organizational Memory** -- Shared context configured globally for multiple agents or teams, acting as collective knowledge.

The documentation further maps these to cognitive memory types: **short-term** memory includes conversation history (sequential turn tracking), working memory (tool outputs, calculations), and attention context (immediate focus). **Long-term** memory preserves factual memory (preferences, account details), episodic memory (interaction summaries), and semantic memory (concept relationships).

In practice, these tiers are implemented as metadata scoping on the same flat vector collection. The `user_id`, `agent_id`, `session_id`, and `run_id` fields serve as filter keys, not separate storage systems.

### Data Flow

Data flow for `memory.add(messages, user_id="alice")`:
```
messages -> parse_messages() -> LLM fact extraction -> [fact1, fact2, ...]
  -> for each fact: embed -> vector_store.search(top 5 existing) -> collect old memories
  -> LLM memory update prompt (old memories + new facts) -> ADD/UPDATE/DELETE/NONE decisions
  -> execute each decision against vector store + SQLite history
  -> (in parallel) graph_memory.add() if graph enabled
```

The documentation describes this pipeline abstractly as three sequential phases: **Capture** (messages populate the conversation layer during active turns), **Promote** (relevant details ascend to session or user memory based on scoping metadata), and **Retrieve** (the search function queries all layers, ranking user memories highest, followed by session notes, then raw history).

## Core Mechanism

The heart of mem0 is a **two-pass LLM extraction-then-reconciliation pipeline** in `Memory._add_to_vector_store()` (main.py lines 475-706):

### Pass 1: Fact Extraction

The LLM receives the conversation with a system prompt (`USER_MEMORY_EXTRACTION_PROMPT` or `AGENT_MEMORY_EXTRACTION_PROMPT` from `configs/prompts.py`) and must return JSON:

```json
{"facts": ["Name is John", "Is a Software engineer", "Likes cheese pizza"]}
```

There are two extraction prompt variants:
- **User memory extraction**: Extracts facts only from user messages (explicitly penalizes including assistant content)
- **Agent memory extraction**: Extracts facts only from assistant messages (used when `agent_id` is present and assistant messages exist)

The selection logic in `_should_use_agent_memory_extraction()` is simple: if `agent_id` is in metadata AND messages contain assistant role, use agent extraction.

The documentation frames this as the "Capture" phase: every interaction is analyzed for promotable facts. The system is designed to be invisible to the end user -- there is no explicit "save" action. Facts are extracted automatically from natural conversation flow, which is why the extraction prompt is so critical to quality.

### Pass 2: Memory Reconciliation

For each extracted fact, mem0 embeds it and searches the vector store for the top 5 similar existing memories. All retrieved memories are collected, deduplicated by ID, then passed to a second LLM call with `DEFAULT_UPDATE_MEMORY_PROMPT`.

A critical implementation detail: mem0 maps real UUIDs to sequential integer IDs (0, 1, 2, ...) before sending to the LLM, then maps back afterward. This is explicitly to prevent UUID hallucination:

```python
# mapping UUIDs with integers for handling UUID hallucinations
temp_uuid_mapping = {}
for idx, item in enumerate(retrieved_old_memory):
    temp_uuid_mapping[str(idx)] = item["id"]
    retrieved_old_memory[idx]["id"] = str(idx)
```

The LLM must return JSON with one of four operations per memory:
- **ADD**: New fact not in memory. LLM generates a new sequential ID.
- **UPDATE**: Existing memory needs modification. Must use the integer ID from input.
- **DELETE**: Existing memory contradicted by new facts. Must use existing ID.
- **NONE**: No change needed.

Each action is then executed: ADD creates a new vector with UUID + embedding + metadata; UPDATE overwrites the vector payload and re-embeds; DELETE removes the vector and logs to SQLite history.

The documentation emphasizes that this design means "memories persist across users and agents, cutting prompt bloat and repeat questions." The key insight is that rather than stuffing full conversation histories into prompts, mem0 distills conversations into atomic facts (typically 5-20 words each), dramatically reducing token usage while preserving the information the LLM actually needs.

This extraction-then-reconciliation pattern is mem0's defining architectural choice and explains both its strengths and limitations. The extraction prompt is the single most critical component -- it determines what gets remembered. The reconciliation prompt is the second most critical -- it determines whether new information overwrites, supplements, or ignores existing memories. Together, these two prompts constitute the entire "intelligence" of the memory system. Everything else (vector stores, embeddings, graph) is infrastructure serving these two LLM calls.

The documentation's notion of a "Promote" phase (where details ascend from conversation to persistent memory) is essentially describing Pass 1 from the application's perspective: the LLM decides which facts from the current conversation are worth promoting to long-term storage. The "Retrieve" phase maps to `memory.search()`, where the application queries the accumulated fact store to inject relevant memories into future conversations.

### Memory Retrieval Pipeline

When `memory.search(query, user_id)` is called, the pipeline is simpler than ingestion:

1. The query is embedded using the configured embedder
2. The vector store performs similarity search with metadata filtering (user_id, agent_id, etc.)
3. Results are optionally reranked (Cohere, HuggingFace, SentenceTransformer, ZeroEntropy, or LLM-based reranker)
4. If graph memory is enabled, the `relations` array is populated separately with structured entity relationships

The documentation notes that search queries all memory layers and ranks user memories highest, followed by session notes, then raw history. In practice, this ranking is handled by the vector store's similarity scoring plus optional reranker weighting.

### Graph Memory (Optional)

When Neo4j is configured, `MemoryGraph` (`mem0/memory/graph_memory.py`) runs in parallel with vector store operations via `concurrent.futures.ThreadPoolExecutor`. The graph pipeline:

1. **Entity extraction**: LLM + function calling (`EXTRACT_ENTITIES_TOOL`) extracts entity-type pairs
2. **Relation establishment**: Second LLM call (`RELATIONS_TOOL`) establishes source-relationship-destination triples
3. **Graph search**: Cosine similarity on node embeddings stored in Neo4j, filtered by user_id
4. **Deletion check**: Third LLM call determines which existing relationships are contradicted
5. **Execution**: Merge nodes with `MERGE` Cypher queries, soft-delete relationships (set `r.valid = false`)

The graph uses **soft deletion** with `r.valid = false` and `r.invalidated_at = datetime()`, enabling temporal reasoning. Queries filter with `WHERE r.valid IS NULL OR r.valid = true`.

The documentation describes graph memory as providing "contextually important" entities that may not be direct semantic matches to the query. When enabled via `enable_graph=True`, search results include a separate `relations` array containing structured data with source/target entities, relationship types, and connection scores. This supplements rather than replaces vector search results -- the graph provides relational context that pure embedding similarity misses.

Graph memory can be enabled per-operation (`client.add(messages, user_id="x", enable_graph=True)`) or globally at the project level (`client.project.update(enable_graph=True)`). The documentation notes that "adding graph memories is an asynchronous operation due to heavy processing," recommending `get_all()` calls to verify stored graph metadata after ingestion.

Search uses BM25 reranking (`rank_bm25.BM25Okapi`) over the graph search results, tokenizing the query and scoring source-relationship-destination triples.

### Procedural Memory

A third memory type (`MemoryType.PROCEDURAL`) creates summarized execution histories from agent conversations. It uses a dedicated `PROCEDURAL_MEMORY_SYSTEM_PROMPT` that instructs the LLM to produce structured summaries with verbatim action results, key findings, and progress status. Activated with `memory_type="procedural_memory"` and requires `agent_id`.

### Memory Categories and Classification

The documentation maps mem0's storage model to traditional cognitive science memory categories:

**Short-term memory** encompasses three sub-types: conversation history (sequential turn tracking within the current session), working memory (tool outputs, intermediate calculations, and active reasoning state), and attention context (the immediate focus of the current interaction). In mem0's implementation, short-term memory lives entirely in the conversation messages passed to `memory.add()` -- it is not stored in the vector store but exists transiently in the LLM's context window.

**Long-term memory** encompasses three sub-types: factual memory (user preferences, account details, stated facts -- this is what the vector store primarily captures), episodic memory (interaction summaries and notable events -- supported via the session and run scoping), and semantic memory (concept relationships -- primarily served by the graph memory layer when enabled).

The documentation prescribes specific **scoping strategies** for each tier:
- **Conversation layer**: Use for ephemeral computations and tool execution results that should not persist
- **Session layer**: Use for bounded workflows like multi-step form filling, shopping carts, or troubleshooting sequences
- **User layer**: Use for cross-session personalization -- preferences, biography facts, relationship details
- **Organizational layer**: Use for collective knowledge like company policies, shared procedures, or team context

### Metadata Filtering and Per-Request Configuration

The documentation highlights that mem0 supports per-request configuration toggles, allowing different behavior for different operations. The `add()` and `search()` methods accept metadata filters that go beyond simple user/session scoping:

- **Custom categories**: Memories can be tagged with hierarchical categories for fine-grained filtering
- **Metadata filtering**: Arbitrary key-value metadata can be attached to memories and used as search filters
- **Per-request toggles**: Graph memory, reranking, and other features can be enabled/disabled on individual operations

The memory object structure stored in the vector database includes: a UUID identifier, the content text, user association, categories (hierarchical tagging), creation and update timestamps, and relevance scores from the most recent search that retrieved it.

## Design Tradeoffs

**LLM-as-the-database-engine vs. deterministic dedup**: Mem0 delegates ALL memory management decisions (add, update, delete, no-op) to the LLM via prompting. There is no deterministic deduplication, no embedding similarity threshold for deciding updates. This means memory quality is entirely dependent on the LLM's ability to follow the `DEFAULT_UPDATE_MEMORY_PROMPT` instructions. They did not choose embedding cosine thresholds or hash-based dedup because the LLM can handle semantic equivalence ("Likes cheese pizza" vs "Loves cheese pizza"), but this introduces non-determinism. The documentation acknowledges this design explicitly: the system is "retrievable by design," advising users to "avoid storing secrets or unredacted PII in user or org memories."

**Vector store as primary, graph as optional**: The vector store is required and always active; the knowledge graph requires Neo4j and is off by default. This is pragmatic -- most users want simple memory without running a graph database -- but it means the default mode cannot represent relationships between entities. The documentation describes graph memory as providing "minimal performance impact" for typical use cases, though "very large memory stores" may experience increased response times. The design assumes most practitioners want the simplicity of a vector store with the option to upgrade to graph when needed.

**Flat fact storage vs. hierarchical memory**: Each memory is a single string fact stored as a vector. There is no hierarchy, no episodic vs semantic distinction in the data model (despite the documentation describing multi-level memory). The "levels" are actually just metadata scoping: `user_id`, `agent_id`, `run_id` are filter keys on the same flat vector collection, not separate memory systems. The documentation's four-tier model (conversation, session, user, organizational) describes a conceptual hierarchy that is useful for understanding scoping, but the underlying storage is a single flat collection with metadata filters.

**Synchronous two-pass LLM vs. streaming**: Each `memory.add()` call makes at minimum 2 LLM calls (fact extraction + reconciliation), plus 1 embedding call per new fact, plus 1 vector search per fact. With graph enabled, add 3 more LLM calls. This is all synchronous within the add operation, though vector and graph paths run in parallel via ThreadPoolExecutor. The documentation recommends the hosted platform for production use, where these operations are handled server-side with automatic optimization.

**No embedding caching across calls**: Embeddings are cached within a single `add()` call via `new_message_embeddings` dict, but not across calls. Repeated queries for the same content will re-embed every time.

**SQLite for history, not for memory**: The SQLite database only stores change history (audit trail), not the memories themselves. This means memory search performance is entirely dependent on the vector store.

**Automatic vs. explicit memory management**: Unlike Letta where agents explicitly manage their own memory via tool calls, mem0's extraction is fully automatic and invisible to both the user and the AI assistant. This makes integration trivial (just wrap `memory.add()` around conversations) but means there is no feedback loop -- the system cannot ask "is this worth remembering?" or allow the AI to decide what matters. Quality depends entirely on the extraction prompt.

**Security model -- retrievable by design**: The documentation explicitly warns that mem0 is designed for retrieval, not secure storage. Sensitive data requires encryption or hashing before storage. The organizational memory tier, while useful for shared context, depends on "owner maintenance" for governance, creating a potential data sprawl risk in enterprise deployments.

## Failure Modes & Limitations

**LLM JSON parsing fragility**: The reconciliation step requires the LLM to return valid JSON with specific structure. The code has multiple fallback layers: `remove_code_blocks()` strips markdown fences and `<think>` tags, `extract_json()` tries regex extraction, but if the LLM produces malformed output, the entire add operation silently produces no memory updates (`new_memories_with_actions = {}`). There is no retry mechanism.

**UUID hallucination despite integer mapping**: While the integer ID mapping helps, the LLM can still hallucinate IDs that don't exist in `temp_uuid_mapping`. When this happens, a `KeyError` is caught per-memory (line 696) but the error is only logged, not surfaced to the caller. Silent data loss.

**Graph memory requires 3+ LLM calls**: Adding to the graph requires entity extraction, relation establishment, and deletion checking -- each a separate LLM call with function calling. This triples latency and cost when graph is enabled, and any single call failure silently degrades the graph. The documentation acknowledges that graph operations are asynchronous "due to heavy processing."

**No concurrency control on vector store**: Multiple concurrent `add()` calls for the same user_id can race: both read existing memories, both decide to ADD, resulting in duplicates. There is no locking mechanism beyond SQLite's thread lock for history writes.

**Memory growth is unbounded**: There is no compaction, summarization, or pruning of old memories. The vector store grows monotonically. The `limit=100` default on search and get_all provides a ceiling on retrieval but not on storage. The documentation's organizational memory tier particularly suffers here -- shared memories accumulate without governance unless an owner actively maintains them.

**Session memory requires manual clearing**: The documentation notes that session-scoped memories persist until explicitly cleared. For multi-step workflows, this means stale session context can bleed into subsequent tasks if the application does not manage session lifecycle properly.

**BM25 reranking for graph is naive**: Graph search results are reranked using BM25 on `query.split(" ")` -- simple word tokenization with no stemming, no stopword removal, no subword handling. For non-English text or complex queries, this will perform poorly.

**Soft delete leaks in graph**: Soft-deleted relationships (`valid = false`) are never garbage collected. Over time, the graph accumulates invalidated relationships that consume storage and slow queries (the `WHERE r.valid IS NULL OR r.valid = true` filter must scan them).

**Custom prompt injection risk**: The `custom_fact_extraction_prompt` and `custom_update_memory_prompt` config options are directly interpolated into LLM calls. A malicious prompt could extract data from the conversation that the user didn't intend to store.

**Multimodal memory is under-specified**: The documentation mentions multimodal input processing as a feature, but the codebase shows this is handled at the extraction prompt level -- the LLM must interpret multimodal inputs and produce text facts. There is no native image or audio embedding in the vector store, meaning multimodal "memory" is really just text descriptions of non-text content.

**Version migration complexity**: The v1.0.0 release introduced "API modernization, improved vector store support, and enhanced GCP integration" with a migration guide, suggesting breaking changes. The documentation warns about backward compatibility but the migration path requires manual intervention for existing deployments.

## Integration Patterns

**LLM Providers** (16 supported): OpenAI, Azure OpenAI, Anthropic, AWS Bedrock, Groq, Together, Ollama, LiteLLM, Gemini, DeepSeek, MiniMax, xAI, Sarvam, LM Studio, vLLM, LangChain. All implement `LLMBase.generate_response()` with unified `messages + tools + response_format` interface. The documentation notes that the default model (`gpt-4.1-nano`) is intentionally lightweight to minimize per-memory cost, with users expected to configure stronger models for complex extraction scenarios.

**Vector Store Backends** (23 supported): Qdrant (default), Chroma, pgvector, Pinecone, Milvus, FAISS, Redis, Weaviate, MongoDB, Elasticsearch, OpenSearch, Supabase, Azure AI Search, Azure MySQL, S3 Vectors, Cassandra, Databricks, Turbopuffer, Upstash, Valkey, Neptune Analytics, Baidu, LangChain. All implement `VectorStoreBase` with `insert()`, `search()`, `get()`, `list()`, `update()`, `delete()`.

**Graph Backends**: Neo4j (via langchain_neo4j), with additional implementations for Apache AGE, Memgraph, Kuzu, and Neptune.

**Rerankers** (5 supported): Cohere, HuggingFace, SentenceTransformer, ZeroEntropy, LLM-based reranker. Introduced in v1.0.0 and integrated into the retrieval pipeline after vector search.

**Framework Integrations**: The documentation highlights first-class integrations with LangChain (memory provider), CrewAI (multi-agent memory), Vercel AI SDK (provider middleware), and MCP (Model Context Protocol for universal AI client connectivity). There is also a ChatGPT integration for persistent cross-session memory and a browser extension for cross-platform memory across ChatGPT, Perplexity, and Claude.

**Typical integration**:
```python
from openai import OpenAI
from mem0 import Memory

openai_client = OpenAI()
memory = Memory()

def chat_with_memories(message: str, user_id: str = "default_user") -> str:
    # Retrieve relevant memories
    relevant_memories = memory.search(query=message, user_id=user_id, limit=3)
    memories_str = "\n".join(f"- {entry['memory']}" for entry in relevant_memories["results"])

    # Build context-aware prompt
    system_prompt = f"You are a helpful AI. Answer based on query and memories.\nUser Memories:\n{memories_str}"
    messages = [{"role": "system", "content": system_prompt},
                {"role": "user", "content": message}]
    response = openai_client.chat.completions.create(model="gpt-4.1-nano", messages=messages)
    assistant_response = response.choices[0].message.content

    # Store new memories from the conversation
    messages.append({"role": "assistant", "content": assistant_response})
    memory.add(messages, user_id=user_id)
    return assistant_response
```

**With graph memory and custom config**:
```python
config = MemoryConfig(
    vector_store=VectorStoreConfig(provider="pgvector", config={...}),
    llm=LlmConfig(provider="anthropic", config={"model": "claude-sonnet-4-20250514"}),
    graph_store=GraphStoreConfig(config={"url": "bolt://localhost:7687", ...}),
)
m = Memory(config)
m.add("I work at Google in NYC", user_id="alice", enable_graph=True)
results = m.search("Where does alice work?", user_id="alice", enable_graph=True)
# results includes both vector matches and relations array with entity connections
```

The Vercel AI SDK integration (`vercel-ai-sdk/`) wraps mem0 as a provider middleware, and there is also an OpenClaw plugin (`openclaw/`) for MCP-style tool integration. The MCP integration enables LLMs to "autonomously manage memory operations without explicit instructions," turning mem0 into a tool the LLM can call rather than requiring application-level wiring.

**Structured vs. unstructured output**: The documentation mentions two output modes for LLM interactions: structured outputs (optimized for JSON responses and data extraction, used in the fact extraction and reconciliation pipeline) and unstructured outputs (free-form text with customizable `response_format` parameter). The default pipeline uses structured output to ensure reliable JSON parsing, but the `custom_fact_extraction_prompt` mechanism allows switching to unstructured mode for specialized extraction needs.

**Webhook support**: The platform supports webhooks for memory lifecycle events, enabling external systems to react to memory additions, updates, and deletions in real-time. This is particularly useful for audit logging, synchronization with external knowledge bases, and triggering downstream workflows when user profiles change.

**Async-by-default client behavior**: The hosted platform's client SDK operates asynchronously by default, with the `MemoryClient` class providing async methods for all memory operations. The open-source `Memory` class is synchronous by default but supports async execution via ThreadPoolExecutor for the graph memory pipeline.

**Deployment models**: Mem0 offers both self-hosted (pip install mem0ai / npm install mem0ai) and a managed platform (app.mem0.ai) with SOC 2 Type II certification, GDPR compliance, audit logging, and workspace governance. The managed platform handles vector database, graph services, and rerankers as a hosted service. The hosted platform provides automatic updates, analytics dashboards, and workspace-level governance controls for enterprise deployments.

**Comparison with Graphiti and Letta**: Mem0 occupies the simplest position in the agent memory landscape. Where Graphiti builds a full temporal knowledge graph with entity resolution and bi-temporal edges (4-5 LLM calls per episode), and Letta gives agents explicit tools to self-manage their context window (requiring the agent to reason about memory), mem0 offers a drop-in memory layer that works with 2 LLM calls per add operation and requires zero changes to the agent itself. This simplicity is its strongest feature: wrap any conversation in `memory.add()` and `memory.search()`, and the system handles extraction, dedup, and retrieval automatically. The tradeoff is less sophistication -- no temporal reasoning (Graphiti), no agent-driven memory management (Letta), no structured entity relationships by default. For most personalization and preference-tracking use cases, this is sufficient. For complex multi-session reasoning or enterprise knowledge management, the more sophisticated systems pull ahead.

## Benchmarks & Performance

The README claims **+26% accuracy over OpenAI Memory** on LOCOMO benchmark, **91% faster responses**, and **90% fewer tokens**. These claims reference their paper (arXiv:2504.19413) rather than benchmarks in the codebase.

**From source code analysis, there are no benchmark scripts or performance tests in the repository.** The `tests/` directory contains unit tests for individual components (vector stores, embeddings, LLMs, graph operations) but no end-to-end performance benchmarks or LOCOMO evaluation scripts.

The performance characteristics observable from code:

- **Minimum LLM calls per `add()`**: 2 (fact extraction + reconciliation), plus N embedding calls where N = number of extracted facts
- **With graph enabled**: 5+ LLM calls per `add()` (2 for vector + 3 for graph entity/relation/deletion)
- **Search latency**: 1 embedding call + 1 vector search + optional reranking (BM25 for graph, configurable reranker for vector)
- **Memory overhead**: Each memory stores full payload in vector DB (data, hash, timestamps, user_id, agent_id, etc.) plus a separate SQLite history entry per change
- **Memory object structure**: Each stored memory includes a UUID, content text, user association, hierarchical categories (tags), timestamps, and relevance scores

The "90% fewer tokens" claim is plausible -- instead of stuffing the full conversation history into context, mem0 retrieves only relevant fact strings (typically 5-20 words each). But this is a property of any selective memory retrieval system, not unique to mem0's architecture.

The "91% faster" claim likely compares against full-context approaches where the entire conversation history is loaded. Since mem0 only retrieves small fact strings instead of full conversations, response generation is naturally faster due to shorter context. The Zep/Graphiti paper's LongMemEval benchmark provides independent validation: context reduction from 115k to ~1.6k tokens yielded 90% latency reduction in their system, supporting the general claim that selective memory retrieval dramatically reduces latency.

The "26% accuracy" improvement would need the LOCOMO benchmark to verify. The code does not contain this benchmark. For reference, the Zep paper showed their system achieving 94.8% on the simpler DMR benchmark (vs MemGPT's 93.4%), suggesting that vector-based memory systems are competitive but not dramatically superior to other approaches on simple fact retrieval tasks. The differentiation likely shows on multi-session and temporal reasoning tasks.

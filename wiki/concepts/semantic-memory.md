---
entity_id: semantic-memory
type: concept
bucket: agent-memory
abstract: >-
  Semantic memory in agents stores general facts and world knowledge in
  searchable external storage, enabling recall beyond the context window via
  vector similarity, keyword search, or graph traversal.
sources:
  - repos/wangyu-ustc-mem-alpha.md
  - repos/gustycube-membrane.md
  - repos/mirix-ai-mirix.md
  - repos/caviraoss-openmemory.md
  - repos/letta-ai-lettabot.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/caviraoss-openmemory.md
related:
  - episodic-memory
  - rag
  - vector-database
  - procedural-memory
  - bm25
  - letta
  - langgraph
  - agent-memory
  - hybrid-search
  - context-window
  - embedding-model
  - gemini
  - catastrophic-forgetting
  - memory-evolution
  - emotional-memory
  - openai
  - mcp
last_compiled: '2026-04-07T11:38:31.755Z'
---
# Semantic Memory

## What It Is

Semantic memory is the component of an agent's memory architecture that stores general facts, concepts, and world knowledge — things the agent "knows" rather than specific events it "experienced." The term comes from cognitive neuroscience, where it denotes long-term declarative knowledge (knowing that Paris is in France) as opposed to episodic memory (remembering a specific trip to Paris).

In agent systems, semantic memory is external storage that persists beyond the [context window](../concepts/context-window.md). An agent cannot hold thousands of facts in its prompt on every turn. Semantic memory solves this by indexing knowledge outside the model and retrieving only what is relevant to the current query.

The concept sits at the intersection of [Retrieval-Augmented Generation](../concepts/rag.md), [Knowledge Graph](../concepts/knowledge-graph.md) architectures, and [Agent Memory](../concepts/agent-memory.md) theory. It is one of four memory types that most agent memory frameworks implement: semantic, [episodic](../concepts/episodic-memory.md), [procedural](../concepts/procedural-memory.md), and core/working memory.

## Why It Matters

The context window bottleneck is the primary motivation. GPT-4 at 128K tokens costs roughly $3.84 per million input tokens; Gemini's 1M token window costs less per token but still charges for every token read on every turn. More fundamentally, stuffing large knowledge bases into context degrades reasoning quality — models attend poorly to facts buried in long prompts. The Graphiti/Zep benchmark (arXiv:2501.13956) quantified this directly: replacing 115K token full-context with 1.6K tokens of retrieved memory reduced latency by 90% while improving accuracy from 60.2% to 71.2% on LongMemEval using GPT-4o. [Source](../raw/deep/repos/getzep-graphiti.md)

Semantic memory also enables knowledge that outlasts any individual conversation. A customer support agent that learns a user's technical environment should retain that fact across sessions, not re-elicit it every time.

## How It Works

### Storage Formats

Semantic memory can be stored in three formats, each with different tradeoffs:

**Flat key-value / vector store.** Each fact is a string (e.g., "Alice works at Google as a software engineer") embedded into a dense vector. Retrieval is approximate nearest-neighbor search by cosine similarity. Fast, simple, scales well. Loses relational structure — you cannot query "who works at Google?" efficiently without scanning everything.

**Knowledge graph.** Facts are stored as typed triples: (Alice, WORKS_AT, Google) with temporal validity windows and provenance pointers back to source episodes. Graphiti implements this with Neo4j as the backend. Retrieval uses hybrid search: vector similarity on fact embeddings, BM25 on text fields, and breadth-first graph traversal for contextually adjacent facts. The traversal step is what flat stores cannot replicate — it surfaces facts that are graph-adjacent but semantically distant from the query. [Source](../raw/deep/repos/getzep-graphiti.md)

**Tiered / hierarchical.** Systems like Mirix implement six specialized stores (Core, Episodic, Semantic, Procedural, Resource, Knowledge Vault), each managed by a dedicated agent. Queries route to the relevant store rather than searching everything. The OpenMemory HSG (Hierarchical Sector Graph) classifies memories into five cognitive sectors via regex pattern matching, applying different decay rates per sector. [Source](../raw/deep/repos/caviraoss-openmemory.md) [Source](../raw/repos/mirix-ai-mirix.md)

### Retrieval Methods

Three methods dominate in production systems:

**Dense retrieval.** Query is embedded; storage is searched by cosine similarity. Fast at scale with approximate nearest-neighbor indices (HNSW in [Qdrant](../projects/qdrant.md), IVF in [FAISS](../projects/faiss.md)). Catches semantic paraphrases but misses exact-match queries. Requires an [embedding model](../concepts/embedding-model.md).

**Sparse retrieval.** [BM25](../concepts/bm25.md) scores documents by term frequency and inverse document frequency. Catches exact keywords; misses paraphrases. Cheap to compute, no embeddings needed.

**Hybrid search.** Combines dense and sparse signals, usually via [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md). Standard in systems that need both semantic flexibility and keyword precision. Graphiti adds a third signal: graph traversal from known anchor entities. [Source](../raw/deep/repos/getzep-graphiti.md)

### Encoding: What Gets Stored and How

Encoding is as consequential as retrieval. Three approaches exist:

**Heuristic extraction.** Systems like mem0 run the raw conversation through an LLM with a structured prompt asking it to extract atomic facts. Each fact becomes a separate memory entry. Simple, but no temporal modeling and no relationship structure.

**Triple extraction.** Graphiti's pipeline runs 4-5 separate LLM calls per episode: extract entities, deduplicate nodes against existing graph entries, extract typed relation triples with valid_at/invalid_at timestamps, resolve contradictions with existing edges, and update entity summaries. More expensive, but produces queryable relational structure and handles fact updates correctly (expired edges get invalid_at set rather than deleted). [Source](../raw/deep/repos/getzep-graphiti.md)

**Learned encoding.** Mem-alpha (arXiv:2509.25911) trains a 4B-parameter model via GRPO to decide what to encode, where (semantic vs. episodic vs. core), and in what form. The model receives text chunks sequentially and uses tool calls to operate the memory system. Reward signal is QA accuracy on held-out questions plus a compression penalty and a content-type correctness term. Trained on 30K token contexts, the model generalizes to 400K+ tokens. [Source](../raw/deep/repos/wangyu-ustc-mem-alpha.md)

## Who Implements It

**[Letta](../projects/letta.md)** (formerly MemGPT) distinguishes core memory (always in context), archival storage (searchable external database), and recall storage (conversation history). Archival storage functions as semantic memory. Letta pioneered the paging metaphor for agent memory management.

**[Graphiti](../projects/graphiti.md)** / [Zep](../projects/zep.md) implements the most structurally sophisticated approach: a proper bi-temporal knowledge graph where facts carry both event timestamps (when a fact was true in the world) and transaction timestamps (when the system learned it). This enables time-travel queries. [Source](../raw/deep/repos/getzep-graphiti.md)

**[Mem0](../projects/mem0.md)** stores extracted facts in a vector database with optional graph layer. The encoding pipeline uses two LLM calls (extract facts, deduplicate against existing memories) with an integer-keyed candidate mapping for the deduplication step.

**[LangGraph](../projects/langgraph.md)** exposes memory as a first-class abstraction via its `Store` interface, with implementations backed by [PostgreSQL](../projects/postgresql.md), [Redis](../projects/postgresql.md), or in-memory storage.

**Mirix** (3,508 stars, Apache-2.0) uses six specialized memory agents, with semantic memory handling general world knowledge separately from episodic memory for events and procedural memory for how-to knowledge. Backed by PostgreSQL with BM25 full-text search and vector similarity. [Source](../raw/repos/mirix-ai-mirix.md)

**[HippoRAG](../projects/hipporag.md)** models semantic memory after hippocampal indexing theory, building a knowledge graph from documents and using Personalized PageRank for retrieval.

## Distinguishing Semantic from Episodic Memory

The distinction matters for system design because the two types warrant different retrieval strategies and decay policies.

**Episodic memory** stores specific events anchored in time and context: "On March 15, the user mentioned they prefer dark mode." The relevant query is "what happened?" or "when did X occur?"

**Semantic memory** stores decontextualized general knowledge: "The user prefers dark mode." The relevant query is "what is true about X?"

In practice, episodic memories consolidate into semantic memories over time — a fact mentioned repeatedly across sessions stops being "something the user said on date X" and becomes "something the user prefers." Systems like Graphiti handle this via entity summary updates: each time a new episode mentions an entity, the entity's semantic summary is updated to incorporate the new information, gradually abstracting away the episodic specifics.

OpenMemory applies different exponential decay rates per type: episodic (lambda=0.015), semantic (lambda=0.005), emotional (lambda=0.02), reflective (lambda=0.001). Semantic knowledge decays slowest of the primary types because factual knowledge persists. [Source](../raw/deep/repos/caviraoss-openmemory.md)

Mem-alpha makes the distinction operational through memory type classification as a learnable objective: the GRPO training reward includes a content-type correctness term (gamma=0.1) that penalizes placing episodic content in semantic slots and vice versa. [Source](../raw/deep/repos/wangyu-ustc-mem-alpha.md)

## Practical Implications

**Retrieval quality determines usefulness.** A semantic memory that stores everything but retrieves poorly is worse than a small, well-searched store. Hybrid search consistently outperforms pure vector similarity for fact-heavy knowledge bases. Cross-encoder reranking improves precision further at the cost of latency.

**Encoding quality is upstream of retrieval quality.** If the extraction pipeline creates duplicate facts, conflated entities, or missing temporal bounds, no retrieval method recovers the lost information. Graphiti's 5-stage pipeline and node deduplication step exist specifically to address encoding quality. [Source](../raw/deep/repos/getzep-graphiti.md)

**Temporal modeling matters for changing facts.** "Alice works at Google" may have been true in 2023 but false in 2024. Systems that overwrite facts lose history; systems that expire facts with valid_at/invalid_at can answer temporally scoped queries. Graphiti's bi-temporal model showed a +38.4% improvement on temporal reasoning tasks compared to full-context baselines. [Source](../raw/deep/repos/getzep-graphiti.md) (self-reported benchmark from Zep's own paper)

**Scale assumptions vary widely.** A personal assistant accumulating one user's knowledge over months operates very differently from a customer service platform with millions of user profiles. SQLite-backed systems (OpenMemory, some Mem0 configurations) hit write bottlenecks at scale. PostgreSQL with pgvector or dedicated vector databases (Qdrant, Pinecone) handle higher write volumes but add infrastructure.

**Context compression enables scale.** OpenMemory applies vector compression to cold memories — reducing 1536-dimensional embeddings to as few as 64 dimensions via mean pooling. This reduces storage at the cost of retrieval precision for rarely-accessed facts. [Source](../raw/deep/repos/caviraoss-openmemory.md)

## Failure Modes

**Entity resolution failures.** If the extraction pipeline creates duplicate entity nodes (e.g., "NYC" and "New York City" as separate entities), facts about the same entity split across two nodes. Retrieval misses one half. Graphiti addresses this with a dedicated LLM deduplication stage; simpler systems rely on string normalization, which misses semantic equivalences.

**Fact staleness.** Systems without temporal invalidation accumulate stale facts silently. An agent that learned a user's employer in 2023 and never invalidated that fact will confidently assert outdated information. This failure is invisible without explicit temporal queries.

**Retrieval-context mismatch.** Retrieved facts are returned as text strings injected into context. If the facts are verbose or numerous, the injection itself consumes significant context budget. Graphiti's 115K → 1.6K token reduction is extreme; real deployments typically see 10-50x compression, which still matters at scale.

**[Catastrophic Forgetting](../concepts/catastrophic-forgetting.md) via accumulation.** Systems without decay policies accumulate everything. Over long deployment periods, the memory grows large enough that relevant facts rank below noise. Decay mechanisms (TTL, exponential decay, importance-weighted pruning) exist specifically for this reason, but most production systems do not implement them. [Continual Learning](../concepts/continual-learning.md) research addresses this in model weights; external memory systems need analogous policies.

**Sector misclassification (in typed systems).** Regex-based sector routing (as in OpenMemory) misclassifies facts that do not match the expected linguistic patterns. A technical fact phrased colloquially might land in episodic memory with fast decay rather than semantic memory with slow decay. [Source](../raw/deep/repos/caviraoss-openmemory.md)

## When Not to Use External Semantic Memory

External semantic memory adds latency, infrastructure, and encoding cost. Skip it when:

- The knowledge base is small enough to fit in context (< 50K tokens) and does not change often. Prefilling context is simpler and has perfect recall.
- The task is single-turn with no cross-session continuity requirements.
- Retrieval latency is unacceptable (real-time voice, sub-100ms response requirements).
- The facts are highly structured and better served by a SQL database with deterministic lookups.

Use it when:

- Knowledge accumulates over many sessions and grows beyond context capacity.
- Facts change over time and staleness matters.
- Multiple agents or users need to share a knowledge base.
- The system needs to answer questions about relationships between entities, not just individual facts.

## Alternatives and Selection Guidance

**Use [RAG](../concepts/rag.md) over a static document corpus** when the knowledge base changes infrequently and the unit of retrieval is a document chunk rather than an extracted fact. RAG is cheaper to build and maintain.

**Use [Episodic Memory](../concepts/episodic-memory.md) exclusively** when the relevant question is always "what happened in conversation X?" rather than "what do we know about entity Y?"

**Use a [Knowledge Graph](../concepts/knowledge-graph.md) (Graphiti, HippoRAG)** when relational queries matter — multi-hop entity traversal, temporal scoping, or provenance tracking. Adds infrastructure and encoding cost.

**Use [Hybrid Search](../concepts/hybrid-search.md)** as a default retrieval strategy. Pure vector search misses exact-match queries; pure BM25 misses semantic paraphrases. The fusion cost is negligible.

**Use learned memory encoding (Mem-alpha approach)** when you have the infrastructure to fine-tune a small model and want the encoding strategy optimized for your specific retrieval task rather than tuned by hand. Currently research-stage with a 4B model available on Hugging Face. [Source](../raw/deep/repos/wangyu-ustc-mem-alpha.md)

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader framework of which semantic memory is one component
- [Episodic Memory](../concepts/episodic-memory.md) — event-specific counterpart; facts consolidate from episodic to semantic over time
- [Retrieval-Augmented Generation](../concepts/rag.md) — semantic memory retrieval is a form of RAG
- [Vector Database](../concepts/vector-database.md) — primary storage backend for flat semantic memory
- [Hybrid Search](../concepts/hybrid-search.md) — standard retrieval strategy combining dense and sparse signals
- [Embedding Model](../concepts/embedding-model.md) — required for dense retrieval
- [BM25](../concepts/bm25.md) — sparse retrieval counterpart
- [Catastrophic Forgetting](../concepts/catastrophic-forgetting.md) — what accumulation without decay eventually causes
- [Memory Evolution](../concepts/memory-evolution.md) — how semantic memories update as new information arrives
- [Context Window](../concepts/context-window.md) — the constraint that makes external semantic memory necessary

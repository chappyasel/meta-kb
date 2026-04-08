---
entity_id: semantic-memory
type: concept
bucket: agent-memory
abstract: >-
  Semantic memory stores general world knowledge and facts in AI agents,
  distinct from episode-specific or procedural knowledge, implemented via vector
  databases and knowledge graphs for persistent retrieval across sessions.
sources:
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - repos/caviraoss-openmemory.md
  - repos/gustycube-membrane.md
  - repos/letta-ai-lettabot.md
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
related:
  - episodic-memory
  - retrieval-augmented-generation
  - procedural-memory
  - long-term-memory
  - letta
  - vector-database
  - core-memory
last_compiled: '2026-04-08T22:57:15.242Z'
---
# Semantic Memory

## What It Is

Semantic memory is the component of an agent's memory system that holds general facts, concepts, and world knowledge -- information that is true independent of when or where it was acquired. The name comes from cognitive psychology, where Endel Tulving's 1972 distinction between episodic memory (specific autobiographical events) and semantic memory (general conceptual knowledge) has directly shaped how AI agent architects partition long-term memory.

In practice, semantic memory for agents stores facts like "the user prefers TypeScript over Python," "the capital of France is Paris," or "this codebase uses PostgreSQL as its primary database." These are declarative facts without strong temporal anchoring. Contrast this with [Episodic Memory](../concepts/episodic-memory.md), which stores "on Tuesday the user asked about Python packaging and seemed frustrated," or [Procedural Memory](../concepts/procedural-memory.md), which stores how to perform a task rather than what is true about the world.

Semantic memory sits within [Long-Term Memory](../concepts/long-term-memory.md) alongside episodic and procedural memory, collectively persisting information across conversation sessions. [Core Memory](../concepts/core-memory.md) is a distinct but related concept -- it is a small, always-present buffer of the most critical facts, often populated from semantic memory based on salience.

## Why the Distinction Matters

Treating all memory as a single flat collection creates retrieval and maintenance problems at scale. When a knowledge base accumulates thousands of entries, queries that should surface general world knowledge compete with entries that capture specific past events. The episodic entry "user said X last Tuesday" and the semantic fact "user prefers X" require different retrieval strategies, retention policies, and update logic.

Separating these categories allows different decay rates. In OpenMemory's implementation, semantic memories decay at lambda=0.005 (the slowest non-reflective decay rate in the system), while episodic memories decay at lambda=0.015 and emotional memories at lambda=0.02. This mirrors the cognitive science finding that general factual knowledge (semantic) is among the most durable memory types, whereas specific event details (episodic) fade faster. A memory system that does not distinguish them either retains event noise too long or forgets general knowledge too quickly.

Semantic memory also requires different update logic. When a user corrects a fact -- "actually I use Rust now, not Python" -- the old fact should be explicitly invalidated, not just supplemented. [Episodic Memory](../concepts/episodic-memory.md) handles contradictions differently: the old episode is not invalid, just superseded; both the old event and the new event occurred.

## How It Works

### Storage Layer

Semantic memory is most commonly implemented via [Vector Database](../concepts/vector-database.md) storage -- each fact is embedded into a high-dimensional vector space and stored alongside its text and metadata. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is the standard mechanism for bringing relevant semantic facts into context at inference time: a query is embedded, nearest neighbors are retrieved by cosine similarity, and the retrieved facts are injected into the prompt.

More sophisticated implementations add graph structure on top of embeddings. In [Graphiti](../projects/graphiti.md) (the underlying engine for [Zep](../projects/zep.md)), semantic memory lives in the "Semantic Entity Subgraph" (G_s), a layer of entity nodes connected by typed relationship edges. Each entity carries a 1024-dimensional embedding for similarity search, plus a natural language summary that evolves as new information arrives. The graph structure enables queries that pure vector stores cannot answer: "what entities are connected to Alice through at most 2 hops?" or "which relationships changed between January and March?"

[FAISS](../projects/faiss.md), [ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [Pinecone](../projects/pinatone.md), and [PostgreSQL](../projects/postgresql.md) with pgvector are common storage backends for semantic memory embeddings. [Neo4j](../projects/neo4j.md) and [SQLite](../projects/sqlite.md) serve as backends when graph or relational structure is needed alongside embeddings.

### Extraction Pipeline

Getting information into semantic memory requires extraction from unstructured input. Most production systems use an LLM to parse conversation turns or documents and identify facts worth storing. The extraction pipeline in Graphiti, for example, runs in multiple stages: entity extraction from the current message, deduplication against existing entities using hybrid search (cosine similarity + BM25), relationship extraction as typed triples (Entity -> RELATION_TYPE -> Entity), and contradiction resolution that invalidates outdated edges.

[Mem0](../projects/mem0.md) and [Letta](../projects/letta.md) implement similar extraction pipelines with varying levels of graph structure. Mem0 stores semantic memories as flat text facts with embedding indices. Letta (the production version of [MemGPT](../projects/memgpt.md)) maintains an archival storage layer for semantic memory with a distinct in-context core memory buffer.

Research from [Mem-alpha](../projects/memevolve.md) takes a different approach: rather than hand-engineering extraction rules, it trains a 4B-parameter model via reinforcement learning ([GRPO](../concepts/grpo.md)) to autonomously decide what to store in semantic versus episodic memory and how to organize it. The model learns memory construction as a skill. Its training reward penalizes misclassification (wrong memory type) alongside QA accuracy, producing a model that generalizes from 30K-token training contexts to 400K+ token inference contexts.

### Temporal Handling

A naive semantic memory system accumulates facts indefinitely. This fails when facts become outdated. Zep's bi-temporal model addresses this directly: each semantic edge carries both `valid_at` and `invalid_at` timestamps (when the fact was true in the world) plus `t_created` and `t_expired` (when the system recorded and invalidated the fact). When a new fact contradicts an existing one, the old edge is expired (not deleted), preserving the historical record while marking the fact as no longer current. This enables point-in-time queries: "what did the system believe about Alice's employer in January 2023?"

[Temporal Reasoning](../concepts/temporal-reasoning.md) over semantic memory is an active area. Zep's LongMemEval benchmarks show +38.4% improvement on temporal reasoning tasks (gpt-4o-mini) compared to full-context baselines, directly attributable to the bi-temporal edge model.

### Retrieval

[Hybrid Search](../concepts/hybrid-search.md) combining dense vector retrieval with sparse BM25 consistently outperforms either method alone for semantic memory recall. Graphiti and Zep both run cosine similarity, BM25 full-text search, and breadth-first graph traversal in parallel, then rerank results. The three methods target complementary similarity types: BM25 captures keyword matches, cosine similarity captures semantic paraphrase, and graph traversal captures contextual proximity (nodes that appear in similar conversational contexts cluster together in the graph).

[Semantic Search](../concepts/semantic-search.md) alone -- pure embedding nearest-neighbor -- misses facts described with different vocabulary. A query for "where Alice works" may not retrieve a fact stored as "Alice is employed at Acme Corp" via cosine similarity if the embedding models represent "works at" and "is employed at" differently. BM25 fills this gap.

Cross-encoder reranking (supported by Graphiti, Zep, and others) adds a neural relevance pass after initial retrieval. It improves precision at the cost of additional latency and API calls. For real-time applications where sub-second retrieval matters, reciprocal rank fusion (RRF) of the parallel search results is a cheaper alternative.

## Who Implements It

**[Letta](../projects/letta.md) / MemGPT**: Pioneered explicit multi-tier memory for LLM agents, separating in-context core memory from external archival storage. Archival storage functions as semantic memory, accessed via tool calls the agent issues explicitly. This architecture makes memory access visible and auditable.

**[Zep](../projects/zep.md) / [Graphiti](../projects/graphiti.md)**: The most complete production architecture for semantic memory with temporal tracking. Three-tier structure (episodes -> entities -> communities) with bi-temporal indexing. 18.5% accuracy improvement over full-context baselines on LongMemEval (gpt-4o, self-reported by Zep). 90% latency reduction by replacing 115K-token context stuffing with ~1.6K-token retrieved context.

**[Mem0](../projects/mem0.md)**: Simpler flat-fact approach. Extraction uses LLM to identify discrete facts; storage is a vector index of fact strings. Fast and easy to integrate, but lacks graph structure and temporal invalidation.

**[HippoRAG](../projects/hipporag.md)** and **[GraphRAG](../projects/graphrag.md)**: Knowledge graph approaches to semantic memory over document corpora. Both build entity-relationship graphs for structured retrieval, but focus on static document collections rather than dynamic conversational memory.

**[LlamaIndex](../projects/llamaindex.md)** and **[LangChain](../projects/langchain.md)**: Framework-level support for semantic memory via pluggable vector store backends and retrieval chains. Neither imposes a specific memory architecture -- developers assemble components.

## Practical Implications

**Injection into context**: Retrieved semantic facts are injected into the system prompt or as user-turn context before the LLM generates a response. [Context Engineering](../concepts/context-engineering.md) decisions -- where in the prompt to place semantic memory, how much to include, and how to format it -- significantly affect how much the model uses the retrieved knowledge. [Lost in the Middle](../concepts/lost-in-the-middle.md) effects mean facts buried in long prompts are used less reliably than facts at the beginning or end.

**Storage growth**: Without active forgetting, semantic memory grows monotonically. Every fact ever extracted accumulates. [Supermemory](../projects/supermemory-project.md) treats forgetting as a first-class feature, with explicit soft-delete tools that the agent or the system can invoke when facts become outdated. Graphiti expires contradicted edges rather than accumulating stale ones. Systems that skip active memory management degrade into noisy fact stores as sessions accumulate.

**Cost at scale**: LLM-based fact extraction runs on every ingested episode. Graphiti makes 4-5 LLM calls per episode for extraction, deduplication, and relationship resolution. For high-volume applications ingesting thousands of messages per day, this creates non-trivial API costs and ingestion latency. Mem0 uses a 2-call approach (cheaper but less structured). Mem-alpha trains a 4B model to perform extraction locally, eliminating per-episode API costs after training.

**The assistant-content gap**: Zep's benchmark analysis reveals a systematic failure mode: systems optimized for user-stated facts underperform on retrieval of assistant-generated content. On LongMemEval's single-session-assistant questions, Zep shows -17.7% compared to full-context. For agentic use cases where the agent's own prior reasoning, recommendations, or calculations are important context, semantic memory architectures biased toward user utterances will miss critical information. No widely deployed system has fully addressed this.

## Failure Modes

**Extraction hallucinations**: LLM-based fact extraction can produce facts not present in the source text, particularly when extraction prompts are underspecified. Graphiti partially addresses this with a "reflection" step where the LLM reviews its own extractions before committing them. Production systems should log extracted facts for spot-checking.

**Deduplication failures**: Semantically equivalent facts stored with different surface forms ("User likes TypeScript" and "User prefers TypeScript for all projects") will not deduplicate via exact-string matching. Vector-similarity deduplication catches paraphrases but requires calibrating similarity thresholds -- too tight misses duplicates, too loose merges distinct facts.

**Contradiction priority assumptions**: Systems that invalidate old facts when new ones contradict them assume newer information is more authoritative. This is correct for most cases (a user's current employer supersedes their past employer) but wrong for others (a fact stated earlier in a conversation may be the ground truth; the later statement may be a correction of the agent's misunderstanding, not a real-world change). No widely deployed system supports confidence scoring or source-authority weighting to handle this.

**Scale limits**: Graph-based semantic memory with thousands of entities exhibits different performance characteristics than small-scale deployments. Community detection algorithms that work well with hundreds of nodes may require full recomputation as graphs grow, creating periodic maintenance windows. Neither Graphiti nor Zep publishes benchmarks at enterprise scale (millions of entities, billions of episodes).

## When Not to Use Semantic Memory

Pure semantic memory architectures are wrong choices when:

- **The application needs verbatim recall**: Semantic memory stores extracted and paraphrased facts, not raw text. If users need exact quote retrieval or the system needs to cite precise source text, episodic storage or raw document retrieval is more appropriate.
- **Facts are inherently temporal and context-dependent**: If most knowledge is "true in this conversation but not generally" (e.g., negotiation context, roleplay state), semantic memory's bias toward stable general facts is a poor fit.
- **The domain requires authority weighting**: Legal, medical, and financial domains where source credibility matters cannot use a simple "newer wins" contradiction resolution strategy. A patient's chart note from a specialist may supersede a general practitioner's note regardless of timestamp.
- **Ingestion cost is prohibitive**: If the application generates hundreds of messages per minute, LLM-based extraction on every message is economically unviable without a purpose-trained extraction model.

## Unresolved Questions

**Optimal granularity**: Should "the user works at Google" and "the user's manager is Alice" be one fact or two? Coarser facts are easier to update but harder to partially invalidate. Finer facts are more precise but create retrieval noise. No widely adopted standard exists.

**Cross-agent semantic memory sharing**: In [Multi-Agent Systems](../concepts/multi-agent-systems.md), how semantic memory is shared, merged, and conflict-resolved across agents that may have gathered different facts is an open architectural question. [Graphiti's](../projects/graphiti.md) group_id namespace scoping enables isolation but not collaboration.

**Evaluation metrics**: LongMemEval and LoCoMo benchmark conversational memory broadly, not semantic memory specifically. No benchmark isolates semantic memory retrieval quality from episodic and procedural components, making it difficult to compare semantic memory implementations in isolation.

## Alternatives and Selection Guidance

- Use **[Episodic Memory](../concepts/episodic-memory.md)** when you need to recall specific past events with temporal context, not general facts.
- Use **[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)** over document corpora when the source material is static and externally authored, not dynamically extracted from conversations.
- Use **[Knowledge Graph](../concepts/knowledge-graph.md)** approaches ([GraphRAG](../projects/graphrag.md), [HippoRAG](../projects/hipporag.md)) when entity relationships and graph traversal matter more than temporal tracking of evolving facts.
- Use **[Core Memory](../concepts/core-memory.md)** for the small set of facts that must always be in context regardless of the current query -- semantic memory requires retrieval, core memory does not.
- Use **[Agent Workflow Memory](../projects/agent-workflow-memory.md)** when the memory target is task procedures and successful action sequences rather than world-state facts.


## Related

- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.8)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — implements (0.7)
- [Procedural Memory](../concepts/procedural-memory.md) — part_of (0.7)
- [Long-Term Memory](../concepts/long-term-memory.md) — part_of (0.8)
- [Letta](../projects/letta.md) — implements (0.7)
- [Vector Database](../concepts/vector-database.md) — implements (0.7)
- [Core Memory](../concepts/core-memory.md) — part_of (0.6)

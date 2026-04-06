---
entity_id: zep
type: project
bucket: agent-memory
abstract: >-
  Zep is a managed agent memory service built on Graphiti, a temporal knowledge
  graph engine that tracks how facts change over time with bi-temporal indexing
  — achieving 18.5% accuracy gains and 90% latency reduction vs. full-context
  baselines on LongMemEval.
sources:
  - repos/getzep-graphiti.md
  - repos/memorilabs-memori.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - graphiti
  - rag
  - episodic-memory
  - hybrid-retrieval
last_compiled: '2026-04-06T02:03:42.680Z'
---
# Zep

**Type:** Project — Agent Memory  
**Repository:** [getzep/graphiti](https://github.com/getzep/graphiti) (24,473 stars)  
**Paper:** [arXiv:2501.13956](https://arxiv.org/abs/2501.13956) — Rasmussen et al., January 2025  
**License:** Apache-2.0

## What It Does

Zep is a memory layer service for AI agents. Its open-source core, [Graphiti](../projects/graphiti.md), is a temporal knowledge graph engine that converts conversational and structured data into a queryable graph of entities, relationships, and communities. The commercial Zep product wraps Graphiti with multi-tenant management, sub-200ms retrieval SLAs, dashboards, and SDKs.

The core differentiator: facts carry explicit validity windows. When Alice switches jobs, the old employment edge is invalidated with a timestamp rather than deleted. Agents can query what is true now, what was true last year, or what the system believed at any given point. This bi-temporal design is standard in financial audit systems but rare in LLM memory stacks.

## Architecture

Graphiti organizes memory as a three-tier hierarchical graph G = (N, E, phi):

**Episodes (Tier 1):** Raw input stored verbatim — messages, JSON, text documents. Every derived fact traces back to the episode that produced it. Non-lossy by design.

**Semantic entities and edges (Tier 2):** Extracted entities (people, products, concepts) with typed relationships between them. Each `EntityEdge` carries four timestamps: `valid_at`, `invalid_at`, `created_at`, and `expired_at`, implementing a genuine bi-temporal model across two parallel timelines — event time (when facts were true in reality) and transaction time (when the system learned them).

**Communities (Tier 3):** Clusters of strongly connected entities detected via label propagation, with LLM-generated summaries. Community names embed key terms for search. Mirrors the cognitive distinction between episodic memory (discrete events) and [semantic memory](../concepts/semantic-memory.md) — the current tier 3 parallels the latter.

The central class is `Graphiti` in `graphiti_core/graphiti.py`. Storage uses one of four pluggable graph backends: Neo4j (default, requires APOC), FalkorDB, Kuzu (embedded, good for development), or Amazon Neptune. All graph mutations use predefined Cypher queries — never LLM-generated ones — to prevent schema hallucinations.

## Core Mechanism: Episode Ingestion Pipeline

Each call to `add_episode()` runs 4–5 sequential LLM calls:

1. **Entity extraction** — LLM receives the current message plus 4 preceding messages for context, returns structured `ExtractedEntity` objects. The extraction prompt in `prompts/extract_nodes.py` is unusually strict: it explicitly forbids extracting pronouns, bare kinship terms ("dad" vs. "Nisha's dad"), and abstract nouns. A reflection step reviews extractions before committing.

2. **Node deduplication** — Extracted entities are embedded (1024-dim vectors) and matched against existing entities via cosine similarity + BM25 full-text search. An LLM cross-encoder makes final merge decisions, handling cases like "NYC" = "New York City."

3. **Edge extraction** — LLM extracts fact triples: (source entity, SCREAMING_SNAKE_CASE relation, target entity, natural language description, valid_at, invalid_at). Temporal expressions like "last week" are resolved against the episode's `reference_time`.

4. **Edge resolution** — New edges are compared against existing edges between the same entity pairs. The LLM identifies duplicates and contradictions. Contradicted edges receive an `expired_at` timestamp; they are never deleted. Newer information consistently takes precedence.

5. **Attribute extraction** — Entity summaries are updated to incorporate new information from non-duplicate edges.

`add_episode_bulk` processes multiple episodes with shared node deduplication but skips edge invalidation — useful for historical imports where temporal consistency is not required.

## Retrieval

The hybrid search pipeline runs three methods in parallel:

- **Cosine similarity** — 1024-dim vector search over fact fields, entity names, and community names
- **BM25** — Full-text search via Neo4j's Lucene integration for lexical matches
- **BFS** — Breadth-first graph traversal from recent episode nodes up to n hops; captures contextually related facts that share no semantic similarity with the query

Results merge via configurable reranking: Reciprocal Rank Fusion (RRF), Maximal Marginal Relevance (MMR), episode mention frequency, graph distance from a centroid node, or neural cross-encoder reranking. `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` is the prebuilt high-quality config; it costs more but retrieval quality reflects it.

This relates to [Hybrid Retrieval](../concepts/hybrid-retrieval.md) and extends [Retrieval-Augmented Generation](../concepts/rag.md) with temporal and graph-structural dimensions.

## Numbers

**Benchmarks (self-reported, from the Zep paper):**

On **LongMemEval** (115K-token conversations, more realistic than DMR):

| Model | Full-context baseline | Zep | Delta |
|---|---|---|---|
| gpt-4o-mini | 55.4% | 63.8% | +15.2% |
| gpt-4o | 60.2% | 71.2% | +18.5% |

Latency: 31.3s (full-context, gpt-4o-mini) → 3.20s with Zep — 90% reduction, driven by compressing 115K tokens to ~1.6K for the response model.

Per question type (gpt-4o-mini):
- Single-session-preference: +77.7%
- Temporal-reasoning: +48.2%
- Multi-session synthesis: moderate gains
- **Single-session-assistant: -17.7%** (notable regression)

On **Deep Memory Retrieval** (DMR, the benchmark Zep uses most prominently in marketing):
- Zep (gpt-4o-mini): 98.2% vs. MemGPT: 93.4%

The DMR comparison is suspect: conversations in DMR fit comfortably in modern context windows, and the full-conversation baseline achieves 98.0% — nearly identical to Zep. The LongMemEval numbers are more meaningful. All benchmarks are self-reported by Zep's authors.

## Strengths

**Temporal reasoning at the data layer.** The +48.2% improvement on temporal reasoning tasks on LongMemEval reflects genuine architectural advantage, not retrieval tuning. Few agent memory systems model temporal validity as first-class data.

**Full provenance.** Every entity and edge traces back to the episode that produced it. This matters in production debugging and in domains (legal, medical, compliance) where "what was the basis for this conclusion?" has a real answer.

**Handles evolving facts without hallucination risk.** By invalidating rather than deleting contradicted edges, Zep avoids the failure mode where a memory system silently loses historical context when a user updates their preferences.

**Multi-tenant namespace isolation.** The `group_id` parameter isolates graph instances within a single database, enabling clean multi-user deployments without schema separation.

## Critical Limitations

**Concrete failure mode — assistant-generated content:** The -17.7% regression on single-session-assistant tasks reveals that the entity extraction pipeline is biased toward user-stated facts. The assistant's own outputs (recommendations, calculations, prior reasoning) are poorly indexed. For agentic workflows where the agent needs to recall what it previously decided or said, Zep underperforms a naive full-context approach. The paper flags this as "an area of current research."

**Unspoken infrastructure assumption:** Zep requires a running Neo4j (or alternative graph database) instance with APOC installed. The hosted Zep service hides this dependency; self-hosting Graphiti means operating a non-trivial graph database alongside your application. Teams without graph database operational experience will hit problems: index configuration, APOC plugin management, Cypher query tuning as graphs grow. The quickstart Docker Compose masks this complexity.

**LLM call volume.** Every ingested message triggers 4–5 LLM calls. At high ingestion volume, this creates latency and cost accumulation. The paper recommends running `add_episode` as a background task (FastAPI background tasks, Celery) rather than in the request path — which means accepting eventual consistency between conversation and memory state.

## When NOT to Use Zep

**Static document corpora.** If your knowledge base is a fixed set of documents that rarely changes, the per-episode LLM pipeline overhead is waste. Use standard [RAG](../concepts/rag.md) with a [vector database](../concepts/vector-database.md) like [Qdrant](../projects/qdrant.md) or [Pinecone](../projects/pinecone.md) instead.

**Single-session agents.** If your agent starts fresh each session with no cross-session context requirement, Zep's graph infrastructure adds cost and complexity with no benefit. The full-conversation baseline matches Zep on DMR precisely because short conversations fit in context.

**Adversarial or open-domain QA.** A-MEM's results on LoCoMo show that memory systems with enriched semantic representations (like Zep's) perform worse on adversarial questions. If your agent handles queries designed to probe for inconsistencies, graph-based memory may amplify rather than reduce susceptibility.

**Teams without graph DB expertise who need production SLAs.** The open-source Graphiti path requires operating Neo4j or FalkorDB at scale. If you cannot staff that, either use the managed Zep service or choose a simpler memory architecture like [Mem0](../projects/mem0.md).

## Unresolved Questions

**Community refresh scheduling.** The paper acknowledges that incrementally updated communities diverge from optimal clustering over time and require periodic full recomputation. It does not specify when to trigger a refresh or how to detect that community quality has degraded enough to matter.

**Cost at scale.** The paper reports per-query latency and token counts for retrieval but not per-episode ingestion cost at volume. For a system ingesting thousands of messages per day, the 4–5 LLM calls per episode add up. No public data on cost profiles at enterprise ingestion rates.

**Contradiction resolution with authority weighting.** Zep always prioritizes newer information when facts conflict. For domains where a 2019 document may be more authoritative than a 2024 conversation — legal precedents, medical baselines, historical records — this heuristic fails. There is no source-authority weighting or confidence scoring on edges.

**Entity extraction quality across model tiers.** The paper uses gpt-4o-mini for graph construction. The documentation warns that "using other services may result in incorrect output schemas and ingestion failures. This is particularly problematic when using smaller models." No published data on extraction quality degradation as model size decreases, which matters for cost optimization decisions.

## Alternatives

**Use [Mem0](../projects/mem0.md) when** you want simpler infrastructure (no graph DB required), accept flat fact strings over typed edges, and your use case does not require temporal reasoning or cross-session entity tracking. Mem0 uses 2 LLM calls per ingestion vs. Zep's 4–5.

**Use [Graphiti](../projects/graphiti.md) directly when** you want the open-source temporal graph engine without the managed Zep service — same architecture, self-hosted, more configuration required.

**Use [Letta](../projects/letta.md) when** your agent needs in-context memory management (core memory that the agent can read and edit directly) rather than external retrieval. Different memory model: Letta keeps a persistent in-context state block; Zep retrieves from an external graph.

**Use [LlamaIndex](../projects/llamaindex.md) or [LangChain](../projects/langchain.md) with a vector store when** your retrieval needs are over documents (not conversations) and the temporal dimension is irrelevant.

**Use [HippoRAG](../projects/hipporag.md) when** you want graph-augmented retrieval over static document corpora with no ingestion-time LLM cost beyond indexing.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Knowledge Graph](../concepts/knowledge-graph.md)
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md)
- [Memory Consolidation](../concepts/memory-consolidation.md)
- [Context Engineering](../concepts/context-engineering.md)

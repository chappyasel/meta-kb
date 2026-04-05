---
entity_id: graphiti
type: project
bucket: knowledge-bases
sources:
  - repos/getzep-graphiti.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/volcengine-openviking.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related: []
last_compiled: '2026-04-05T05:25:46.889Z'
---
# Graphiti

[Source: repos/getzep-graphiti.md](../../raw/repos/getzep-graphiti.md) | [Source: deep/repos/getzep-graphiti.md](../../raw/repos/getzep-graphiti.md) | [Source: papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## What It Does

Graphiti builds temporal knowledge graphs for AI agents. Instead of storing conversation history as flat text or retrieving document chunks via vector search, it extracts entities and relationships from each interaction, stores them as typed graph triples with validity windows, and retrieves them via hybrid search at query time.

The core problem it addresses: standard RAG returns a static snapshot of what documents say. Agent memory requires tracking what *was* true versus what *is* true now, across sessions, as facts change. A user who changes jobs, moves cities, or updates their preferences should not have the agent operating on stale context indefinitely.

Graphiti is the open-source engine underneath [Zep](https://www.getzep.com), Zep's managed memory infrastructure product. The library and the paper both come from the same team (Rasmussen et al., arXiv:2501.13956).

**24,473 GitHub stars**, Apache-2.0 license, Python, active development as of early 2026.

## Architecture

The central class is `Graphiti` in `graphiti_core/graphiti.py`, which orchestrates four subsystems:

**Graph driver layer** (`graphiti_core/driver/`): Abstracted via `GraphDriver` base class with four implementations — Neo4j (default, requires 5.26+), FalkorDB, Kuzu, and Amazon Neptune with OpenSearch Serverless for full-text. Each has its own `operations/` directory with predefined Cypher queries. These queries are never LLM-generated; the paper explicitly names this as a design choice to "ensure consistent schema and reduce hallucinations."

**LLM client layer** (`graphiti_core/llm_client/`): Seven implementations. Default is OpenAI `gpt-4.1-mini` for main prompts, `gpt-4.1-nano` for simpler stages. All use Pydantic structured output — if your LLM provider does not support structured output reliably, ingestion fails. The structured output requirement is a hard constraint, not a preference.

**Embedding layer** (`graphiti_core/embedder/`): OpenAI default (1024-dimensional), Azure OpenAI, Gemini, Voyage AI.

**Search layer** (`graphiti_core/search/`): Hybrid search combining cosine similarity, BM25 fulltext, and breadth-first graph traversal, with four reranking strategies including cross-encoder neural reranking.

The graph itself uses three node tiers: `EpisodicNode` (raw input), `EntityNode` (extracted entities with summaries), and `CommunityNode` (auto-detected clusters). The paper formalizes this as **G = (N, E, phi)** with three subgraphs: episode subgraph G_e, semantic entity subgraph G_s, and community subgraph G_c. The community structure mirrors the distinction between episodic memory (specific events) and semantic memory (associations between concepts).

## Core Mechanism: Episode Ingestion Pipeline

`add_episode()` in `graphiti.py` (lines 916-1163) runs a sequential multi-stage LLM pipeline per input:

1. **Entity extraction** (`utils/maintenance/node_operations.py`): The LLM receives the current message plus the four previous messages. It returns typed `ExtractedEntity` objects. The extraction prompt in `prompts/extract_nodes.py` is unusually prescriptive — it lists extensive negative examples (do not extract pronouns, bare kinship terms like "dad," abstract concepts). The requirement for qualified names ("Nisha's dad" not "dad") reduces noise but can miss relevant entities in abstract domains.

2. **Node deduplication** (`resolve_extracted_nodes`): Each extracted entity is embedded, matched against existing entities via cosine similarity and BM25, and then an LLM cross-encoder makes the final dedup decision. Handles cases like "NYC" = "New York City." When duplicates merge, the system generates updated summaries incorporating both knowledge sources.

3. **Edge extraction** (`utils/maintenance/edge_operations.py`): The LLM extracts fact triples as `Edge` objects: source entity, target entity, SCREAMING_SNAKE_CASE relation type, natural language fact description, and — critically — `valid_at` and `invalid_at` timestamps. Relative temporal expressions ("last week") are resolved against the episode's `reference_time` parameter.

4. **Edge resolution** (`resolve_extracted_edges`): New edges are compared against existing edges between the same entity pairs. The LLM identifies `duplicate_facts` (identical information) and `contradicted_facts` (conflicting information). Contradicted edges get `expired_at` set to the current time rather than being deleted.

5. **Attribute extraction**: Only newly created (non-duplicate) entities receive updated summaries, avoiding redundant LLM calls.

6. **Graph persistence**: Predefined Cypher queries write all nodes and edges. No dynamic query generation.

The pipeline makes 4-5 LLM calls minimum per episode. With community updates enabled, add more per affected community node. This is expensive. The README recommends running `add_episode` as a background task (FastAPI background tasks or Celery) rather than in the request path.

## Bi-Temporal Data Model

`EntityEdge` carries four timestamp fields:

```python
expired_at: datetime | None   # When this edge record was invalidated (transaction time)
valid_at: datetime | None     # When this fact became true (event time)
invalid_at: datetime | None   # When this fact stopped being true (event time)
reference_time: datetime | None  # Reference from source episode
```

The paper formalizes two timelines: T (chronological — when facts held true in the real world) and T' (transactional — when data entered the system). Each edge has timestamps on both timelines. This enables time-travel queries: "what did the system believe about Alice's employer in January 2023?" requires filtering on both timelines separately.

This is a genuine bi-temporal design from database theory, standard in financial audit systems, rarely seen in LLM applications. Contradicted edges are never deleted — they accumulate with `expired_at` timestamps. The graph grows monotonically. There is no garbage collection or compaction.

## Hybrid Search

Three retrieval methods run in parallel:

- **Cosine similarity** (phi_cos): Vector search on 1024-dimensional fact embeddings. Targets semantic similarity.
- **BM25** (phi_bm25): Native fulltext search across fact fields, entity names, community names. Targets lexical similarity.
- **BFS** (phi_bfs): Breadth-first graph traversal from specified origin nodes. Targets contextual similarity — facts closer in the graph appeared in related conversational contexts.

Results are fused via Reciprocal Rank Fusion (RRF) by default, then optionally reranked by node graph distance, episode mention frequency, Maximal Marginal Relevance, or cross-encoder neural scoring. Pre-built config `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` provides the most accurate configuration.

## Community Detection

Label propagation (`community_operations.py`) rather than Leiden (used by GraphRAG). The choice trades community quality for incrementality: each node starts as its own community, then iteratively adopts the plurality label of its neighbors. When a new entity arrives, it gets assigned to the plurality community among its neighbors without running the full algorithm. The paper is explicit about the cost: "incrementally updated communities gradually diverge from full label propagation results, requiring periodic refreshes." There is no documented mechanism for detecting when to trigger a full refresh.

## Benchmarks

From arXiv:2501.13956 — self-reported by the Zep team, not independently validated.

**LongMemEval** (~115k token conversations):

| Model | Full-context baseline | Zep/Graphiti | Improvement |
|---|---|---|---|
| gpt-4o-mini | 55.4% | 63.8% | +15.2% |
| gpt-4o | 60.2% | 71.2% | +18.5% |

**Latency** (consumer laptop to AWS us-west-2):

| Model | Baseline | Zep | Reduction |
|---|---|---|---|
| gpt-4o-mini | 31.3s | 3.20s | 89.8% |
| gpt-4o | 28.9s | 2.58s | 91.0% |

Context reduction: 115k tokens to ~1.6k tokens per query.

**Notable breakdown** (gpt-4o on LongMemEval question types):
- Temporal reasoning: +38.4% (validates the bi-temporal model)
- Multi-session synthesis: +30.7%
- Single-session-assistant recall: **-17.7%** (regression — the extraction pipeline loses assistant-side reasoning chains)

The DMR benchmark (MemGPT's primary metric) shows Zep at 94.8% vs MemGPT's 93.4%, but the paper itself dismisses DMR as inadequate: 115k-token conversations now fit in standard context windows, and the questions are single-turn fact retrieval with no temporal complexity.

## Strengths

**Temporal reasoning**: The bi-temporal model is the most rigorous implementation of time-aware knowledge in any open-source agent memory library. The +38.4% improvement on temporal reasoning tasks in LongMemEval reflects this directly.

**Provenance**: Every entity and edge traces back to the episodes that produced it. You can audit why the system believes something and when it started believing it.

**Hybrid retrieval**: The combination of semantic, lexical, and graph-traversal search is more comprehensive than vector-only approaches. BFS in particular surfaces contextually related facts that share no semantic similarity with the query.

**Structured fact representation**: Typed triples with Pydantic-validated schemas give downstream agents structured, queryable data rather than raw text chunks.

**Custom ontology**: Pydantic `BaseModel` subclasses define domain-specific entity and edge types. Medical, legal, and enterprise domains can enforce schemas at ingestion time.

## Critical Limitations

**Concrete failure mode — single-session-assistant regression**: On LongMemEval's single-session-assistant tasks, Graphiti scores 17.7% *worse* than full-context baseline. The extraction pipeline converts conversation into entity-relationship triples, which discards assistant-side reasoning, meta-commentary, and any content that does not map cleanly to named entities or relationships. For tasks where the agent needs to recall its own prior reasoning or conversation structure, structured extraction works against you.

**Unspoken infrastructure assumption**: Graphiti requires a running graph database and assumes it will be the persistent store for your agent. If you already have a production database stack (PostgreSQL, Redis, etc.), adding Neo4j or FalkorDB means a new stateful service with its own operational overhead, backup requirements, schema migrations, and failure modes. The library does not offer any path to operate without a dedicated graph database. Kuzu is embedded and works for development, but its column-oriented storage requires modeling edges as intermediate nodes, which is a non-trivial schema difference from Neo4j.

## When Not to Use It

**High-frequency ingestion with strict latency requirements**: 4-5 LLM calls per episode is a floor, not a ceiling. At even modest volume (hundreds of episodes per hour), this creates significant LLM API costs and latency. The recommendation to run ingestion as a background task means your agent's knowledge is always somewhat stale relative to the conversation.

**Single-session tasks without temporal complexity**: If your agent handles stateless Q&A, document retrieval, or short single-session workflows with no cross-session memory requirements, Graphiti's infrastructure overhead (graph database, LLM extraction pipeline, community detection) provides no benefit over a well-tuned vector store.

**Teams without graph database operational experience**: Neo4j requires index management, APOC plugin installation, query optimization, and ongoing maintenance. FalkorDB and Kuzu reduce this burden but have smaller communities and less documentation. If no one on your team has operated a graph database in production, the failure modes will be unfamiliar.

**Domains where abstract concepts are the primary entities**: The entity extraction prompt explicitly excludes abstract concepts, bare nouns, and generic terms. For medical notes, legal text, academic papers, or other domains where the most meaningful entities are concepts rather than named persons, places, or organizations, extraction recall will be lower than expected.

**LLM providers without structured output support**: Smaller or self-hosted models often lack reliable Pydantic schema validation. The README warns that "using other services may result in incorrect output schemas and ingestion failures." If your deployment requires a specific model without structured output, the pipeline breaks.

## Unresolved Questions

**Edge expiry and graph growth**: The graph accumulates expired edges indefinitely. For long-running production deployments with high conversation volume, storage growth is unbounded. There is no documented compaction strategy, no guidance on when expired edges are safe to archive, and no utility for doing so.

**Community refresh triggers**: The paper acknowledges that incremental community updates drift from optimal over time. There is no documented heuristic for when to run a full refresh, no monitoring metric to detect drift, and no tooling for partial refreshes on subgraphs.

**Multi-tenant cost isolation**: `group_id` provides logical namespace isolation but all groups share the same graph database instance and LLM quota. At scale, a single high-volume group can affect latency for all others. The documentation does not address capacity planning for multi-tenant deployments.

**Contradiction resolution reliability**: Edge invalidation depends entirely on the LLM recognizing semantic contradiction. There are no documented test suites for contradiction detection accuracy across domains, and no fallback when the LLM misses a contradiction. Stale facts persist silently.

**The Zep/Graphiti governance boundary**: Graphiti is Apache-2.0, but it is maintained by the team building Zep, a commercial product. There is no documented policy on how Graphiti's roadmap relates to Zep's commercial interests, or what happens to Graphiti if Zep pivots or shuts down.

## Alternatives

**Use mem0** when you want agent memory without graph database infrastructure. mem0 uses a vector store as primary storage with an optional graph layer. Lower operational overhead, fewer LLM calls per ingestion, works with more LLM providers. Weaker on temporal reasoning and cross-session entity tracking.

**Use GraphRAG** when you have a static document corpus and need community-level summarization for complex multi-hop questions. GraphRAG's batch processing and Leiden clustering produce higher-quality community structure than Graphiti's incremental label propagation. Wrong choice for conversational or frequently-updated data.

**Use a vector store with metadata filtering** (Pinecone, Weaviate, pgvector) when your retrieval requirements are primarily semantic similarity and your facts do not change frequently. No LLM extraction overhead, no graph database required, well-understood operational model. Cannot answer temporal or relational queries.

**Use Letta (MemGPT)** when you need in-context memory management within a single agent session with explicit memory editing tools. Different architecture — the agent itself manages memory rather than an external pipeline.

**Use Zep (managed)** instead of Graphiti when you need production SLAs, sub-200ms retrieval, and do not want to operate graph database infrastructure yourself. Zep runs Graphiti at scale with pre-configured retrieval, dashboard tooling, and enterprise support.

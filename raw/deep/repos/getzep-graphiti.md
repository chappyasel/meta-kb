---
url: 'https://github.com/getzep/graphiti'
type: repo
author: getzep
date: '2026-04-04'
tags:
  - agent-memory
  - knowledge-bases
  - temporal-graphs
  - entity-relationships
  - context-engineering
  - community-detection
key_insight: >-
  Graphiti is architecturally the most sophisticated of the major agent-memory
  libraries: it implements a proper bi-temporal data model where edges carry
  both valid_at and invalid_at timestamps, uses a multi-stage LLM pipeline
  (extract entities, extract edges, deduplicate nodes, resolve edge
  contradictions) with Pydantic structured output, and implements
  label-propagation community detection for automatic graph summarization. This
  is a genuine knowledge graph system, not a vector store with graph features
  bolted on.
stars: 24500
deep_research:
  method: source-code-analysis
  files_analyzed:
    - graphiti_core/graphiti.py
    - graphiti_core/nodes.py
    - graphiti_core/edges.py
    - graphiti_core/search/search.py
    - graphiti_core/search/search_config.py
    - graphiti_core/prompts/extract_nodes.py
    - graphiti_core/prompts/extract_edges.py
    - graphiti_core/prompts/dedupe_nodes.py
    - graphiti_core/prompts/dedupe_edges.py
    - graphiti_core/utils/maintenance/community_operations.py
    - graphiti_core/llm_client/config.py
    - graphiti_core/driver/driver.py
    - CLAUDE.md
  analyzed_at: '2026-04-04'
  original_source: repos/getzep-graphiti.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 8
  signal_quality: 9
  composite: 8.9
  reason: >-
    Graphiti/Zep is a production-grade agent memory library with a formal
    bi-temporal knowledge graph architecture directly relevant to agent memory
    and knowledge substrate pillars, with deep architectural detail provided.
---

## Architecture Overview

Graphiti is organized as a Python async-first library in `graphiti_core/` with a clean separation between graph operations, LLM clients, search, and storage drivers. The central class is `Graphiti` in `graphiti_core/graphiti.py`, which orchestrates four subsystems:

1. **Graph Driver Layer** (`graphiti_core/driver/`) -- Abstracted via `GraphDriver` base class with 4 implementations: Neo4jDriver, FalkorDBDriver, KuzuDriver, NeptuneDriver. Each has its own `operations/` directory with specialized Cypher or query implementations for different node/edge types.

2. **LLM Client Layer** (`graphiti_core/llm_client/`) -- 7 client implementations: OpenAI (default, model `gpt-4.1-mini`), Anthropic, Azure OpenAI, Gemini, Groq, OpenAI Generic, GLiNER2 (local NER). All use structured output via Pydantic response models.

3. **Embedding Layer** (`graphiti_core/embedder/`) -- 4 providers: OpenAI (default), Azure OpenAI, Gemini, Voyage.

4. **Search Layer** (`graphiti_core/search/`) -- Configurable hybrid search combining cosine similarity, BM25 fulltext, and breadth-first graph traversal with multiple reranking strategies.

### Formal Graph Structure

The Zep research paper (arXiv:2501.13956) formalizes the architecture as a three-tier hierarchical knowledge graph **G = (N, E, phi)** comprising nodes, edges, and an incidence function:

- **Episode Subgraph (G_e)**: Raw data nodes storing messages, text, or JSON as non-lossy data sources. Every derived entity and relationship traces back to the episodes that produced it, enabling full lineage tracking from fact to source.
- **Semantic Entity Subgraph (G_s)**: Entities extracted from episodes with relationships between them. This is where the knowledge graph's actual semantic content lives.
- **Community Subgraph (G_c)**: High-level clusters of strongly connected entities with LLM-generated summarizations. Mirrors the psychological distinction between episodic memory (distinct events) and semantic memory (associations between concepts).

### Data Model

The data model centers on five node types and five edge types:

**Node types:**
- `EpisodicNode` -- Raw input episodes (messages, JSON, text) with temporal metadata (`valid_at`, `created_at`). These are the ground truth -- every other node and edge traces provenance back to episodes.
- `EntityNode` -- Extracted entities with summaries, labels, and 1024-dimensional embeddings. Summaries evolve over time as new information arrives.
- `CommunityNode` -- Auto-detected communities via label propagation, with LLM-generated summary names containing key terms for search.
- `SagaNode` -- Named episode sequences with incremental summarization for long-running narrative tracking.

**Edge types:**
- `EpisodicEdge` (MENTIONS) -- Links episodes to entities they mention
- `EntityEdge` (RELATES_TO) -- Factual relationships between entities with bi-temporal validity. This is the core edge type carrying the knowledge graph's semantic content.
- `CommunityEdge` (HAS_MEMBER) -- Links communities to their member entities
- `HasEpisodeEdge` -- Links sagas to episodes
- `NextEpisodeEdge` -- Links consecutive episodes within a saga

### Graph Namespacing

Graphiti uses `group_id` to implement isolated graph namespaces within a single database instance. This enables multi-tenant deployments where different users, projects, or contexts maintain completely separate graph instances. All queries are scoped by group_id, preventing cross-contamination.

Data flow for `graphiti.add_episode()`:
```
episode_body -> EpisodicNode creation
  -> retrieve previous episodes for context (last 4 messages)
  -> extract_nodes() [LLM: entity extraction with type classification]
  -> resolve_extracted_nodes() [LLM: deduplication against existing graph entities]
  -> extract_edges() [LLM: fact triple extraction with temporal bounds]
  -> resolve_extracted_edges() [LLM: contradiction detection + edge invalidation]
  -> extract_attributes_from_nodes() [LLM: summary + attribute hydration]
  -> save all to graph via bulk operations (predefined Cypher, not LLM-generated)
  -> optionally update_communities() [label propagation + LLM summarization]
```

## Core Mechanism

### Episode Ingestion Pipeline

The `add_episode()` method (graphiti.py lines 916-1163) is Graphiti's core operation. It processes a single episode through a multi-stage LLM pipeline. The Zep paper describes this pipeline in formal detail:

**Stage 1: Entity Extraction** (`extract_nodes` in `utils/maintenance/node_operations.py`)
The LLM receives the current message, previous 4 messages for context, and entity type definitions. It returns structured `ExtractedEntity` objects with names and type classifications. The speaker is automatically extracted as an entity. The extraction prompt (`prompts/extract_nodes.py`) is remarkably detailed -- it includes extensive negative examples telling the LLM what NOT to extract (pronouns, abstract concepts, generic nouns, bare kinship terms) and requires entity names to be specific and qualified ("Nisha's dad" not "dad"). The paper notes that a "reflection technique" is used to minimize hallucinations and extract accurate entity summaries.

**Stage 2: Node Deduplication** (`resolve_extracted_nodes`)
Each extracted entity is embedded into a 1024-dimensional vector, then compared against existing entities using a hybrid matching strategy: cosine similarity search identifies semantically similar entities, full-text search on names and summaries provides lexical matching, and finally an LLM cross-encoder evaluation determines the final dedup decision. The prompt uses the integer candidate_id mapping pattern (similar to mem0's approach but for entities rather than memories). The dedupe prompt handles semantic equivalence ("NYC" = "New York City") and disambiguation ("Java programming language" vs "Java island"). When duplicates are detected, the system generates updated, complete names and summaries incorporating the new information.

**Stage 3: Edge Extraction** (`extract_edges` in `utils/maintenance/edge_operations.py`)
The LLM extracts fact triples as structured `Edge` objects with source_entity_name, target_entity_name, relation_type (SCREAMING_SNAKE_CASE), a natural language fact description, and critically, `valid_at` and `invalid_at` temporal bounds. The reference_time parameter allows the LLM to resolve relative temporal expressions ("last week"). The paper describes edge extraction as producing structured triples that carry both the relationship and its temporal validity window.

**Stage 4: Edge Resolution** (`resolve_extracted_edges`)
Each new edge is compared against existing edges between the same entity pairs -- importantly, the search is constrained to edges "existing between the same entity pairs," reducing computational complexity while preventing erroneous combinations. The LLM produces `EdgeDuplicate` objects identifying:
- `duplicate_facts`: Existing edges that represent identical information
- `contradicted_facts`: Existing edges OR invalidation candidates that the new fact contradicts

Contradicted edges get their `expired_at` set to the current time, implementing temporal invalidation. The paper states that "Graphiti consistently prioritizes new information when determining edge invalidation" -- newer facts supersede older ones. This is Graphiti's key differentiator -- edges are not deleted but expired, preserving the temporal history of what was believed when.

**Stage 5: Attribute Extraction**
Entity nodes receive updated summaries incorporating information from new edges. This is only applied to new (non-duplicate) edges to avoid redundant summary updates.

**Stage 6: Graph Persistence**
All nodes and edges are saved to the graph database via predefined Cypher queries -- importantly, NOT LLM-generated queries. The paper emphasizes this design choice: using predefined queries "ensures consistent schema and reduces hallucinations" compared to systems that generate ad-hoc graph queries.

### Bi-Temporal Data Model

The `EntityEdge` class (edges.py) implements a genuine bi-temporal model with four temporal fields:

```python
class EntityEdge(Edge):
    expired_at: datetime | None   # When the edge record was invalidated (transaction time T')
    valid_at: datetime | None     # When the fact became true (event time T)
    invalid_at: datetime | None   # When the fact stopped being true (event time T)
    reference_time: datetime | None  # Reference timestamp from source episode
```

The Zep paper formalizes this as a dual-timeline approach:
- **Timeline T**: Chronological event ordering -- when facts actually held true in the real world
- **Timeline T'**: Transactional ordering -- when data entered the system

This gives each edge four timestamps: `t'_created` and `t'_expired` from T' (system audit/transaction tracking), and `t_valid` and `t_invalid` from T (temporal validity range for facts).

This distinction enables time-travel queries: "what did the system believe about Alice's employer as of January 2023?" can be answered by filtering on both the event timeline (what was true at that date) and the transaction timeline (what the system knew at that point). This is a true bitemporal design rarely seen in LLM applications -- it originates from database theory and is standard in financial systems for audit trails.

The paper provides a concrete example: if Alice worked at Acme from 2020 to 2023, the edge carries `valid_at=2020, invalid_at=2023`. If the system learned about this in 2024, `t'_created=2024`. If later information contradicts this, `t'_expired` gets set to the contradiction time, but the historical record remains intact.

### Hybrid Search System

The search layer (`search/search.py`) is the most configurable of the three repos analyzed. A `SearchConfig` can combine three complementary search functions that target different similarity types:

**Search methods** (run in parallel):
- `cosine_similarity` (phi_cos) -- Vector embedding search on fact embeddings. Targets semantic similarity. Implemented via Neo4j/Lucene vector indices.
- `bm25` (phi_bm25) -- Fulltext search using graph database native BM25. Targets word-level similarity across fact fields, entity names, and community names.
- `bfs` (phi_bfs) -- Breadth-first graph traversal from specified origin nodes up to n-hops. Targets contextual similarity -- nodes and edges closer in the graph appear in more similar conversational contexts.

The paper explains the rationale: these three methods target "word similarities, semantic similarities, and contextual similarities" respectively, covering complementary retrieval dimensions that no single method addresses alone.

**Search targets** span four scopes simultaneously:
- Semantic edges: search the fact field
- Entity nodes: search entity names
- Community nodes: search community names (containing keywords from summaries)
- Episodes: search raw episode content

**Reranking strategies** (applied after search):
- `rrf` -- Reciprocal Rank Fusion (merges multiple search result lists). Standard multi-signal fusion.
- `node_distance` -- Reranks by graph distance from a center node. Useful when the query has a known anchor entity.
- `episode_mentions` -- Reranks by number of episode mentions, surfacing frequently-discussed facts.
- `mmr` -- Maximal Marginal Relevance (diversification). Reduces redundancy in results.
- `cross_encoder` -- Neural reranking via cross-encoder model. Most accurate, highest computational cost. The paper identifies this as the "most sophisticated" approach.

Results include reranker scores for transparency. Pre-built config recipes like `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` provide optimized defaults.

### Community Detection

Graphiti implements a label propagation algorithm (`community_operations.py`) for automatic community detection. The paper explains the algorithm choice: label propagation was selected over the Leiden algorithm (used by GraphRAG) for its "straightforward dynamic extension" enabling incremental updates without full recomputation:

1. Each entity node starts as its own community
2. Iteratively, each node adopts the community label held by the plurality of its neighbors (weighted by edge count)
3. Ties are broken by largest community
4. Converges when no community assignments change

**Dynamic extension**: When a new entity is added, it is assigned to the community held by the plurality of its neighbors, then the community summary and graph are updated incrementally. This avoids the expensive full-graph recomputation that Leiden requires.

After clustering, each community gets an LLM-generated summary using a map-reduce-style iterative summarization of member entity summaries. Community names contain "key terms and relevant subjects" that are embedded for similarity search, making communities searchable via the same hybrid search pipeline as individual entities.

The paper acknowledges a limitation: "incrementally updated communities gradually diverge from full label propagation results, requiring periodic refreshes."

### Saga System

Sagas provide episode sequencing and incremental summarization. A `SagaNode` links to its episodes via `HAS_EPISODE` edges, and consecutive episodes within a saga are linked by `NEXT_EPISODE` edges. The `summarize_saga()` method implements incremental summarization -- it only fetches episodes added since `last_summarized_at`, passes them to the LLM along with the existing summary, and produces an updated summary.

### Custom Entity Types and Ontology

Graphiti supports both **prescribed ontology** (developer-defined) and **learned structure** (emerging patterns). Developers can define custom entity and edge types using Pydantic models:

```python
from pydantic import BaseModel

class PersonModel(BaseModel):
    name: str
    role: str | None = None

class CompanyModel(BaseModel):
    name: str
    industry: str | None = None

result = await graphiti.add_episode(
    name="conversation-1",
    episode_body="Alice: I just started a new job at Google.",
    source_description="User conversation",
    reference_time=datetime.now(UTC),
    source=EpisodeType.message,
    group_id="user-123",
    entity_types={"Person": PersonModel, "Company": CompanyModel},
)
```

Custom types enforce schema validation through Pydantic, ensuring domain-specific entities carry the attributes the application needs. Without custom types, entities use the default schema with name, summary, and type fields.

### Fact Triples as First-Class Citizens

Unlike mem0's flat fact strings or Letta's unstructured text blocks, Graphiti represents knowledge as structured triples: Entity -> Relationship -> Entity. Each fact triple carries:

- **Source and target entity references**: Linked to EntityNode objects with their own embeddings, summaries, and types
- **Relation type**: In SCREAMING_SNAKE_CASE format (e.g., WORKS_AT, LIVES_IN, MARRIED_TO)
- **Natural language fact description**: A human-readable description of the relationship
- **Temporal validity window**: When the fact became true and when it stopped being true
- **Provenance**: Traceable back to the specific episode(s) that established the fact

This triple structure enables queries that flat memory systems cannot express: "What relationships changed between January and March?" or "What entities are connected to Alice through at most 2 hops?" The graph traversal search method (BFS) directly exploits this structure to find contextually relevant facts that may not share any semantic similarity with the query.

### Structured vs. Unstructured Data Ingestion

The paper emphasizes that Graphiti handles both unstructured conversational data and structured business data. Episodes can contain:

- **Messages** (`EpisodeType.message`): Natural language conversation turns
- **JSON** (`EpisodeType.json`): Structured data that gets parsed into entity-relationship triples
- **Text** (`EpisodeType.text`): Longer-form unstructured text like documents or transcripts

For JSON episodes, the entity and relationship extraction is more reliable because the structure provides clear field-to-entity mappings. For message episodes, the LLM must infer entities and relationships from natural language, which is where the detailed extraction prompts become critical.

### Concurrency and Rate Limiting

All Graphiti operations use `semaphore_gather` for concurrent execution with a configurable concurrency limit (default `SEMAPHORE_LIMIT = 10`). This is specifically tuned to prevent 429 rate-limit errors from LLM providers. The README recommends adjusting this based on provider throughput capacity -- higher limits for providers with generous rate limits, lower for providers with strict quotas. All operations are async, using Python's asyncio throughout.

## Design Tradeoffs

**Graph-first vs. vector-first**: Unlike mem0 (vector store primary, graph optional), Graphiti requires a graph database (Neo4j, FalkorDB, Kuzu, or Neptune) and makes it the primary storage. This gives richer queries and relationship traversal but imposes higher infrastructure requirements. The paper argues this is the right tradeoff for enterprise applications: "enterprise-critical tasks such as cross-session information synthesis and long-term context maintenance" require the relational structure that graphs provide.

**Bi-temporal edges vs. simple overwrite**: Graphiti chose to expire contradicted edges rather than delete or overwrite them. This preserves full history but means the graph grows monotonically with invalidated edges. There is no garbage collection or compaction of expired edges. The paper frames this as non-lossy: "maintaining non-lossy history by preserving invalidated edges with temporal boundaries." The tradeoff is storage growth vs. the ability to answer temporal queries -- if you need to know what was true at a specific point in time, you need the historical record.

**LLM-per-stage vs. single LLM call**: Graphiti uses 4-5 separate LLM calls per episode (extract nodes, dedupe nodes, extract edges, resolve edges, summarize). Each uses Pydantic structured output for reliable parsing. This is more expensive per operation than mem0's 2-call approach but produces more structured, typed output. The paper notes that a `small_model` option (default `gpt-4.1-nano`) is available for simpler prompts, allowing cost optimization across pipeline stages.

**Predefined Cypher vs. LLM-generated queries**: A key design decision documented in the paper: Graphiti uses predefined Cypher queries for all graph mutations, never LLM-generated ones. This "ensures consistent schema and reduces hallucinations." The tradeoff is less flexibility for novel query patterns, but dramatically better reliability and predictability.

**Label propagation vs. Leiden for community detection**: Graphiti chose label propagation for incrementality -- new entities can be assigned to communities without rerunning the full algorithm. Leiden (used by GraphRAG) produces higher-quality communities but requires full recomputation. The acknowledged cost is that incremental updates gradually diverge from optimal clustering.

**Multiple graph backends vs. single**: Supporting Neo4j, FalkorDB, Kuzu, and Neptune required a `GraphDriver` abstraction with per-driver operation implementations. The codebase has significant duplication across driver-specific operation directories (each has 10+ operation files). FalkorDB and Kuzu require different Cypher dialects, and Kuzu notably requires modeling edges as intermediate nodes due to its column-oriented storage. The paper focuses on Neo4j; the other drivers are community additions.

**Cross-encoder reranking vs. simple BM25**: Graphiti supports neural reranking via OpenAI's reranker, BGE reranker, and Gemini reranker. This adds latency and cost but significantly improves retrieval quality over pure embedding similarity. The paper's benchmark results suggest the cross-encoder is worth the cost for complex queries.

**Async-first architecture**: All Graphiti operations are async (`add_episode`, `search`, etc.), using `semaphore_gather` for concurrent execution with configurable concurrency limits (default `SEMAPHORE_LIMIT = 10` to prevent 429 rate-limit errors from LLM providers). This is cleaner than mem0's ThreadPoolExecutor approach but requires async context throughout.

**Incremental vs. batch processing**: The paper explicitly positions Graphiti against GraphRAG's batch processing approach. Graphiti processes episodes incrementally as they arrive, with sub-second query latency. GraphRAG requires full corpus reprocessing when data changes, with seconds-to-tens-of-seconds query latency. The tradeoff is that incremental processing may produce lower-quality entity resolution than a batch pass over the entire corpus.

## Failure Modes & Limitations

**High LLM call volume per episode**: A single `add_episode` call makes 4-5+ LLM calls (entity extraction, node dedup, edge extraction, edge resolution, attribute extraction). With community updates enabled, add more per-node community summarization calls. For high-volume ingestion, this creates significant latency and cost. The README recommends running `add_episode` as a background task ("FastAPI background tasks or Celery") rather than in the request path.

**Entity extraction specificity vs recall**: The entity extraction prompt is extremely strict about what NOT to extract (bare nouns, abstract concepts, pronouns). While this reduces noise, it may miss relevant entities in domains where abstract concepts or generic nouns carry important meaning (medical notes, legal text).

**Edge invalidation is LLM-dependent**: Whether a new fact contradicts an existing edge is decided entirely by the LLM in the `resolve_edge` prompt. If the LLM fails to identify a contradiction, stale edges persist as valid. There is no deterministic contradiction checking. The paper acknowledges this is an area where fine-tuned models could improve accuracy and reduce costs.

**Community detection is O(N^2) in the naive case**: The `get_community_clusters` function queries edge counts for every entity node individually (one Cypher query per node), then runs label propagation. For graphs with thousands of entities, this becomes a bottleneck. The incremental update path helps but eventually requires periodic full refreshes.

**No streaming or incremental node extraction**: Entity extraction processes the entire episode at once. For very long episodes (transcripts, documents), the content is passed whole to the LLM without chunking. The `content_chunking.py` utility exists but is not integrated into the main `add_episode` pipeline.

**Bulk ingestion skips edge invalidation**: The `add_episode_bulk` method explicitly notes it does NOT perform edge invalidation or date extraction steps. For large historical imports, this means temporal consistency is not maintained. Users must use individual `add_episode` calls for temporal accuracy.

**Graph driver duplication**: Each of the 4 graph backends (Neo4j, FalkorDB, Kuzu, Neptune) has its own operations directory with 10+ files, leading to significant code duplication. Bugs fixed in one driver's operations may not be propagated to others.

**Single-session-assistant regression**: The paper's LongMemEval benchmark revealed a notable 17.7% performance decrease on single-session-assistant tasks. The authors identify this as an "area of current research" -- the graph-based retrieval can miss context that was present in the full conversation for tasks requiring assistant-side recall. This is a fundamental limitation of the knowledge graph approach: by extracting entities and relationships from conversations, assistant-side reasoning chains and meta-commentary about the conversation itself may be lost.

**No evaluation against standard RAG benchmarks**: The paper acknowledges it has not evaluated against standard RAG benchmarks like BEIR or FinanceBench. The temporal knowledge graph approach is optimized for conversational memory, not document retrieval, and its performance on static corpus retrieval is unknown.

**Entity extraction is model-dependent**: The quality of extracted entities and relationships varies significantly across LLM providers. The paper uses gpt-4o-mini for graph construction, and switching to weaker models may produce substantially worse entity resolution and contradiction detection. The structured output requirement further limits provider choice -- not all LLMs support Pydantic schema validation.

**Community summary drift**: Incrementally updated community summaries gradually diverge from what a full recomputation would produce. The paper acknowledges this requires periodic full refreshes, but does not specify when or how to detect divergence. For long-running graphs with thousands of episodes, summary quality may degrade silently.

## Integration Patterns

**Graph Databases** (4 supported): Neo4j 5.26+ (default, requires APOC), FalkorDB 1.1.2+, Kuzu 0.11.2+ (embedded, good for development), Amazon Neptune with OpenSearch Serverless for full-text search. Custom database names are configurable via driver instantiation:

```python
from graphiti_core import Graphiti
from graphiti_core.driver.neo4j_driver import Neo4jDriver

driver = Neo4jDriver(
    uri="bolt://localhost:7687",
    user="neo4j",
    password="password",
    database="my_custom_database"
)
graphiti = Graphiti(graph_driver=driver)
await graphiti.build_indices_and_constraints()
```

**LLM Providers** (7 supported): OpenAI (default, `gpt-4.1-mini`), Anthropic, Azure OpenAI, Gemini, Groq, OpenAI-generic (custom base URL), GLiNER2 (local NER model). A `small_model` option (default `gpt-4.1-nano`) is available for simpler prompts, enabling cost optimization. The documentation notes that Graphiti requires LLM services supporting Structured Output for correct schema validation.

**Embedding Providers** (4 supported): OpenAI (default), Azure OpenAI, Gemini, Voyage AI. The paper uses BGE-m3 (BAAI) for benchmarks, suggesting it works well as a non-default option.

**Cross-Encoder Rerankers** (3 supported): OpenAI Reranker (default), BGE Reranker (Hugging Face), Gemini Reranker.

**Deployment options**:
- **Docker Compose**: Neo4j and FalkorDB support included with pre-configured compose files
- **MCP Server** (`mcp_server/`): Model Context Protocol implementation for Claude, Cursor, and other AI assistant integration
- **FastAPI REST Server** (`server/`): Deployable as a microservice for programmatic access

**Typical integration**:
```python
from graphiti_core import Graphiti
from graphiti_core.nodes import EpisodeType

graphiti = Graphiti("bolt://localhost:7687", "neo4j", "password")
await graphiti.build_indices_and_constraints()

result = await graphiti.add_episode(
    name="conversation-1",
    episode_body="Alice: I just started a new job at Google.",
    source_description="User conversation",
    reference_time=datetime.now(UTC),
    source=EpisodeType.message,
    group_id="user-123",
    entity_types={"Person": PersonModel, "Company": CompanyModel},
)

# Hybrid search with cross-encoder reranking
results = await graphiti.search(
    query="Where does Alice work?",
    group_ids=["user-123"],
    config=COMBINED_HYBRID_SEARCH_CROSS_ENCODER,
)
```

**LangGraph integration**: Graphiti provides a LangGraph integration for agentic workflows, allowing agents to read from and write to the knowledge graph as part of their tool set.

**OpenTelemetry tracing** is built in -- the `Tracer` abstraction wraps all major operations with spans, enabling distributed tracing in production. A built-in `TokenUsageTracker` on the LLM client tracks usage by prompt type, enabling cost monitoring per pipeline stage.

## Benchmarks & Performance

The Zep paper (arXiv:2501.13956) provides the most rigorous benchmarks of any agent memory system:

### Deep Memory Retrieval (DMR) -- 500 conversations, 60 messages each

| System | Model | Accuracy |
|--------|-------|----------|
| Recursive Summarization | gpt-4-turbo | 35.3% |
| Conversation Summaries | gpt-4-turbo | 78.6% |
| MemGPT | gpt-4-turbo | 93.4% |
| Full-conversation baseline | gpt-4-turbo | 94.4% |
| **Zep (Graphiti)** | gpt-4-turbo | **94.8%** |
| Full-conversation baseline | gpt-4o-mini | 98.0% |
| **Zep (Graphiti)** | gpt-4o-mini | **98.2%** |

The paper criticizes DMR as inadequate: 115k-token conversations fit in modern context windows, questions are "single-turn, fact-retrieval" lacking complex understanding assessment, and the benchmark "poorly represents real-world enterprise use cases."

### LongMemEval (LME) -- ~115k token conversations

| Model | Full-context | Zep | Improvement |
|-------|--------------|-----|-------------|
| gpt-4o-mini | 55.4% | 63.8% | **+15.2%** |
| gpt-4o | 60.2% | 71.2% | **+18.5%** |

**Latency performance** (tested from consumer laptop in Boston to AWS us-west-2):
- gpt-4o-mini: 31.3s baseline -> 3.20s with Zep (**89.8% reduction**)
- gpt-4o: 28.9s baseline -> 2.58s with Zep (**91.0% reduction**)
- Context reduction: 115k -> ~1.6k tokens (less than 2% of baseline)

**Question type breakdown (gpt-4o)**:
- Single-session-preference: **+184%** improvement
- Temporal-reasoning: **+38.4%** -- validates the bi-temporal model
- Multi-session: **+30.7%** -- validates cross-session entity tracking
- Knowledge-update: **+6.52%**
- Single-session-assistant: **-17.7%** (notable regression, identified as area for improvement)

### Performance Characteristics from Code

- **LLM calls per `add_episode`**: Minimum 4-5 (extract nodes, dedupe nodes, extract edges, resolve edges, extract attributes). With communities: add N more for N affected community nodes.
- **Concurrency**: Controlled via `SEMAPHORE_LIMIT` environment variable (default 10) and `max_coroutines` parameter. Parallel LLM calls are made via `semaphore_gather()`.
- **Search latency**: 1 embedding call + parallel execution of configured search methods (cosine similarity, BM25, BFS) + optional cross-encoder reranking. Sub-second for typical queries.
- **Token tracking**: Built-in `TokenUsageTracker` on the LLM client (`llm_client/token_tracker.py`) tracks usage by prompt type, enabling cost monitoring.
- **Bulk ingestion**: The `add_episode_bulk` method processes multiple episodes with shared node deduplication but skips edge invalidation for speed.
- **Models used in paper**: BGE-m3 for embeddings, gpt-4o-mini for graph construction, gpt-4o for response generation.

The temporal edge invalidation (+38.4% on temporal reasoning) and community detection are unique features that differentiate Graphiti from mem0's flat-memory approach. The 90% latency reduction from 115k to 1.6k tokens validates the core thesis that structured memory retrieval outperforms full-context approaches on both speed and accuracy for complex multi-session tasks.

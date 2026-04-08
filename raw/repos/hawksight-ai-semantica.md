---
url: 'https://github.com/Hawksight-AI/semantica'
type: repo
author: Hawksight-AI
date: '2026-04-08'
tags:
  - context-engineering
  - knowledge-substrate
  - agent-memory
  - decision-intelligence
  - provenance-tracking
  - reasoning-engines
  - semantic-layer
  - multi-agent-systems
key_insight: >-
  Semantica addresses a critical gap in LLM agent deployments: agents today lack
  structured decision trails and provenance, making them undeployable in
  regulated domains—this framework layers explainable context graphs and causal
  decision tracking on top of existing LLM stacks to enable audit trails and
  reasoning transparency without replacing your agent architecture.
stars: 962
forks: 155
relevance_scores:
  topic_relevance: 8
  practitioner_value: 7
  novelty: 7
  signal_quality: 7
  composite: 7.4
  reason: >-
    Semantica directly targets context graphs, causal decision tracking, and
    knowledge provenance for LLM agents — core to Knowledge Substrate and
    Context Engineering pillars — with a production PyPI package, CI, and decent
    adoption (962 stars), though the README is cut off limiting full assessment
    of architecture depth.
---
## semantica

> Semantica 🧠 — A framework for building semantic layers, context graphs, and decision intelligence systems with explainability and provenance.

### Stats

| Metric | Value |
|--------|-------|
| Stars | 962 |
| Forks | 155 |
| Language | Python |
| License | MIT |
| Last Updated | 2026-04-08 |

**Topics:** agent-memory, agentic-ai, ai-agents, ai-infrastructure, context-graph, context-management, data-infrastructure, developer-tools, graph-analytics, graph-modeling, graphrag, knowledge-engineering, knowledge-graphs, llmops, ontology-engineering, python-library, rag, schema-design, semantic-layer, semantic-web

### Relevance Score

| Dimension | Score |
|-----------|-------|
| Topic Relevance | 8/10 |
| Practitioner Value | 7/10 |
| Novelty | 7/10 |
| Signal Quality | 7/10 |
| **Composite** | **7.4/10** |

> Directly addresses context graphs, knowledge provenance, decision tracking, and reasoning engines for AI agents — core to the knowledge substrate and context engineering pillars — with a production-ready PyPI package and clear architecture description.

### README

<div align="center">

<img src="Semantica Logo.png" alt="Semantica Logo" width="420"/>

# 🧠 Semantica

**A Framework for Building Context Graphs and Decision Intelligence Layers for AI**

[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PyPI](https://img.shields.io/pypi/v/semantica.svg)](https://pypi.org/project/semantica/)
[![Version](https://img.shields.io/badge/version-0.4.0-brightgreen.svg)](https://github.com/Hawksight-AI/semantica/releases/tag/v0.4.0)
[![Total Downloads](https://static.pepy.tech/badge/semantica)](https://pepy.tech/project/semantica)
[![CI](https://github.com/Hawksight-AI/semantica/workflows/CI/badge.svg)](https://github.com/Hawksight-AI/semantica/actions)
[![Discord](https://img.shields.io/badge/Discord-Join%20Community-5865F2?logo=discord&logoColor=white)](https://discord.gg/sV34vps5hH)
[![X](https://img.shields.io/badge/X-Follow%20Semantica-black?logo=x&logoColor=white)](https://x.com/BuildSemantica)

### ⭐ Give us a Star · 🍴 Fork us · 💬 Join our Discord · 🐦 Follow on X

> **Transform Chaos into Intelligence. Build AI systems with context graphs, decision tracking, and advanced knowledge engineering that are explainable, traceable, and trustworthy — not black boxes.**

</div>

---

## The Problem

AI agents today are powerful but not trustworthy:

- ❌ **No memory structure** — agents store embeddings, not meaning. There's no way to ask *why* something was recalled.
- ❌ **No decision trail** — agents make decisions continuously but record nothing. When something breaks, there's no history to audit.
- ❌ **No provenance** — outputs can't be traced back to source facts. In regulated industries, this is a hard compliance blocker.
- ❌ **No reasoning transparency** — black-box answers with zero explanation of how a conclusion was reached.
- ❌ **No conflict detection** — contradictory facts silently coexist in vector stores, producing unpredictable outputs.

These aren't edge cases. They're the reason AI can't be deployed in healthcare, finance, legal, and government without custom guardrails built from scratch every time.

## The Solution

Semantica is the **context and intelligence layer** you add on top of your existing AI stack:

- ✅ **Context Graphs** — a structured, queryable graph of everything your agent knows, decides, and reasons about.
- ✅ **Decision Intelligence** — every decision is tracked as a first-class object with causal links, precedent search, and impact analysis.
- ✅ **Full Provenance** — every fact links back to its source. W3C PROV-O compliant. No more mystery answers.
- ✅ **Reasoning Engines** — forward chaining, Rete networks, deductive, abductive, and SPARQL. Explainable paths, not black boxes.
- ✅ **Quality & Deduplication** — conflict detection, entity resolution, and pipeline validation built in.

> Works alongside LangChain, LlamaIndex, AutoGen, CrewAI, and any LLM — Semantica is the **accountability layer** on top, not a replacement.

```bash
pip install semantica
```

---


## Features

### Context & Decision Intelligence
- **Context Graphs** — structured graph of entities, relationships, and decisions; queryable, causal, persistent
- **Decision tracking** — record, link, and analyze every agent decision with `add_decision()`, `record_decision()`
- **Causal chains** — link decisions with `add_causal_relationship()`, trace lineage with `trace_decision_chain()`
- **Precedent search** — hybrid similarity search over past decisions with `find_similar_decisions()`
- **Influence analysis** — `analyze_decision_impact()`, `analyze_decision_influence()` — understand downstream effects
- **Policy engine** — enforce business rules with `check_decision_rules()`; automated compliance validation
- **Agent memory** — `AgentMemory` with short/long-term storage, conversation history, and statistics
- **Cross-system context capture** — `capture_cross_system_inputs()` for multi-agent pipelines

### Knowledge Graphs
- **Knowledge graph construction** — entities, relationships, properties, typed edges
- **Graph algorithms** — PageRank, betweenness centrality, clustering coefficient, community detection
- **Node embeddings** — Node2Vec embeddings via `NodeEmbedder`
- **Similarity** — cosine similarity via `SimilarityCalculator`
- **Link prediction** — score potential new edges via `LinkPredictor`
- **Temporal graphs** — time-aware nodes and edges
- **Incremental / delta processing** — update graphs without full recompute

### Semantic Extraction
- **Entity extraction** — named entity recognition, normalization, classification
- **Relation extraction** — triplet generation from raw text using LLMs or rule-based methods
- **LLM-typed extraction** — extraction with typed relation metadata
- **Deduplication v1** — Jaro-Winkler similarity, basic blocking
- **Deduplication v2** — `blocking_v2`, `hybrid_v2`, `semantic_v2` strategies with `max_candidates_per_entity`
- **Triplet deduplication** — `dedup_triplets()` for removing duplicate (subject, predicate, object) triples

### Reasoning Engines
- **Forward chaining** — `Reasoner` with IF/THEN string rules and dict facts
- **Rete network** — `ReteEngine` for high-throughput production rule matching
- **Deductive reasoning** — `DeductiveReasoner` for classical inference
- **Abductive reasoning** — `AbductiveReasoner` for hypothesis generation from observations
- **SPARQL reasoning** — `SPARQLReasoner` for query-based inference over RDF graphs

### Provenance & Auditability
- **Entity provenance** — `ProvenanceTracker.track_entity(entity_id, source, metadata)`
- **Algorithm provenance** — `AlgorithmTrackerWithProvenance` tracks computation lineage
- **Graph builder provenance** — `GraphBuilderWithProvenance` records entity source lineage from URLs
- **W3C PROV-O compliant** — lineage tracking across all modules
- **Change management** — version control with checksums, audit trails, compliance support

### Vector Store
- **Backends** — FAISS, Pinecone, Weaviate, Qdrant, Milvus, PgVector, in-memory
- **Semantic search** — top-k retrieval by embedding similarity
- **Hybrid search** — vector + keyword with configurable weights
- **Filtered search** — metadata-based filtering on any field
- **Custom similarity weights** — tune retrieval per use case

### 🌐 Graph Database Support
- **AWS Neptune** — Amazon Neptune graph database with IAM authentication
- **Apache AGE** — PostgreSQL graph extension with openCypher via SQL
- **FalkorDB** — native support; `DecisionQuery` and `CausalChainAnalyzer` work directly with FalkorDB row/header shapes

### Data Ingestion
- **File formats** — PDF, DOCX, HTML, JSON, CSV, Excel, PPTX, archives
- **Web crawl** — `WebIngestor` with configurable depth
- **Databases** — `DBIngestor` with SQL query support
- **Snowflake** — `SnowflakeIngestor` with table/query ingestion, pagination, and key-pair/OAuth auth
- **Docling** — advanced document parsing with table and layout extraction (PDF, DOCX, PPTX, XLSX)
- **Media** — image OCR, audio/video metadata extraction

### Export Formats
- **RDF** — Turtle (`.ttl`), JSON-LD, N-Triples (`.nt`), XML via `RDFExporter`
- **Parquet** — `ParquetExporter` for entities, relationships, and full KG export
- **ArangoDB AQL** — ready-to-run INSERT statements via `ArangoAQLExporter`
- **OWL ontologies** — export generated ontologies in Turtle or RDF/XML
- **SHACL shapes** — export auto-derived constraint shapes via `RDFExporter.export_shacl()` (`.ttl`, `.jsonld`, `.nt`, `.shacl`)

### Pipeline & Production
- **Pipeline builder** — `PipelineBuilder` with stage chaining and parallel workers
- **Validation** — `PipelineValidator` returns `ValidationResult(valid, errors, warnings)` before execution
- **Failure handling** — `FailureHandler` with `RetryPolicy` and `RetryStrategy` (exponential backoff, fixed, etc.)
- **Parallel processing** — configurable worker count per pipeline stage
- **LLM providers** — 100+ models via LiteLLM (OpenAI, Anthropic, Cohere, Mistral, Ollama, and more)

### Ontology
- **Auto-generation** — derive OWL ontologies from knowledge graphs via `OntologyGenerator`
- **Import** — load existing OWL, RDF, Turtle, JSON-LD ontologies via `OntologyImporter`
- **Validation** — HermiT/Pellet compatible consistency checking
- **SHACL shape generation** — `OntologyEngine.to_shacl()` auto-derives SHACL node and property shapes from any Semantica ontology dict; zero hand-authoring; deterministic (same ontology → same shapes)
- **SHACL validation** — `OntologyEngine.validate_graph()` runs shapes against a data graph and returns a `SHACLValidationReport` with machine-readable violations and plain-English explanations
- **Quality tiers** — `"basic"` (structure + cardinality), `"standard"` (+ enumerations, inheritance), `"strict"` (+ `sh:closed` rejects undeclared properties)
- **Inheritance propagation** — child shapes automatically include all ancestor property shapes (up to 3+ levels), cycle-safe
- **Three output formats** — Turtle (`.ttl`), JSON-LD, N-Triples; file export via `export_shacl()`

## 🚀 What's New in v0.4.0

### 🕐 Temporal Intelligence Stack

Everything you need to reason about *when* — not just *what*.

- **Temporal GraphRAG** — retrieve knowledge as it existed at any point in the past. Natural-language queries like *"what did we know before the 2024 merger?"* are automatically parsed for temporal intent, with zero LLM calls.
- **Allen Interval Algebra** — 13 deterministic interval relations (before, meets, overlaps, during, starts, finishes, equals, and their converses). Find gaps, measure coverage, detect cycles — all without touching an LLM.
- **Point-in-time Query Engine** — reconstruct a self-consistent graph snapshot at any timestamp. Comes with a consistency validator that catches 5 classes of temporal errors: inverted intervals, dangling edges, overlapping relations, temporal gaps, and missing entities.
- **Temporal Metadata Extraction** — ask the LLM to annotate each extracted relation with `valid_from`, `valid_until`, and a calibrated confidence score (0–1 scale with baked-in anchors, so the model doesn't cluster near 1.0).
- **TemporalNormalizer** — converts ISO 8601, partial dates, relative phrases ("last year", "Q1 2024"), and 13 domain-specific phrase maps (Healthcare, Finance, Cybersecurity, Supply Chain, Energy…) into UTC datetime pairs. Zero LLM calls.
- **Bi-temporal Provenance** — every provenance record is automatically stamped with transaction time. Full revision history and audit log export in JSON or CSV. Temporal relationships export as OWL-Time RDF triples.
- **Decision validity windows** — decisions now carry `valid_from` / `valid_until`. Superseded decisions stay in the graph — history is immutable. Point-in-time causal chain reconstruction included.
- **Named checkpoints** — snapshot the full agent context at any moment and diff two snapshots to see exactly what changed.

→ [Temporal docs](docs/reference/) · [Temporal examples](cookbook/)

### 📚 SKOS Vocabulary Management

Build and query controlled vocabularies inside your knowledge graph

- Add SKOS concepts with labels, alt-labels, broader/narrower hierarchy, and definitions — all required triples assembled automatically.
- Query and search vocabularies with SPARQL-backed APIs (injection-sanitized).
- REST API for the Explorer: list schemes, fetch full hierarchy trees (cycle-safe), and import `.ttl` / `.rdf` / `.owl` files.

→ [SKOS docs](docs/reference/ontology.md)

### 🔷 SHACL Constraints

Turn ontologies into executable data contracts — no hand-authoring.

- Auto-derive SHACL node and property shapes from any Semantica ontology. Deterministic: same ontology always produces the same shapes.
- Three strictness tiers: `"basic"` (structure + cardinality), `"standard"` (+ enumerations and inheritance), `"strict"` (closes shapes — rejects undeclared properties).
- Validate any RDF graph and get back a report with plain-English violation explanations ready to feed into an LLM or pipeline.
- Use in CI to catch breaking ontology changes before they reach production.

→ SHACL shape generation and validation are available via the `OntologyEngine` — see [ontology docs](docs/reference/ontology.md)

### 🔧 Infrastructure & Fixes

- **ContextGraph pagination** — memory complexity dropped from O(N) to O(limit). A 50k-node graph no longer allocates 2.5M dicts per paginated request.
- **Named graph support** — full config-flag enforcement, duplicate clause prevention, backward-compat URI alias, and safe URI encoding in SPARQL pruning.
- **Ollama remote support** — `OllamaProvider` now correctly connects to remote Ollama servers instead of silently falling back to `localhost`.
- **Security** — API key logging removed from extractors; CI workflows locked to least-privilege `contents: read`.

→ [Full changelog](CHANGELOG.md) · [Release notes](RELEASE_NOTES.md)

---

## 📦 What Was in v0.3.0

First stable `Production/Stable` release on PyPI.

- **Context Graphs** — temporal validity windows, weighted BFS, cross-graph navigation with full save/load persistence.
- **Decision Intelligence** — complete lifecycle from recording to impact analysis; `PolicyEngine` with versioned rules.
- **KG Algorithms** — PageRank, betweenness centrality, Louvain community detection, Node2Vec embeddings, link prediction.
- **Deduplication v2** — blocking/hybrid candidate generation **63.6% faster**; semantic dedup **6.98x faster**.
- **Delta Processing** — SPARQL-based incremental diff, `delta_mode` pipelines, snapshot versioning.
- **Export** — Parquet (Spark/BigQuery/Databricks ready), ArangoDB AQL, RDF format aliases.
- **Pipeline** — exponential/fixed/linear backoff, `PipelineValidator`, fixed retry loop.
- **Graph Backends** — Apache AGE (SQL injection fixed), AWS Neptune, FalkorDB, PgVector.

---

## ✨ What Semantica Does

### 🧩 Context & Decision Intelligence

Track every decision your agent makes as a structured, queryable graph node — with causal links, precedent search, impact analysis, and policy enforcement.

- Every decision records who made it, why, what outcome was chosen, and how confident.
- Decisions are linked causally so you can trace the full chain of reasoning that led to any outcome.
- Hybrid similarity search finds past decisions that match the current scenario.
- Policy rules validate decisions against business constraints before or after they're made.
- `AgentMemory` handles short/long-term storage and conversation history across sessions.

→ [Decision tracking docs](docs/reference/) · [Decision tracking example](cookbook/)

### 🕐 Temporal Reasoning

Ask not just *what* your agent knows, but *when it was true*.

- Reconstruct your knowledge graph at any point in the past without modifying the current graph.
- Parse natural-language temporal queries and rewrite them into structured datetime constraints.
- Reason over time intervals using a full deterministic Allen algebra implementation.
- Normalize any date expression — ISO 8601, relative phrases, domain-specific vocabulary — into UTC.
- Extract temporal validity from text using the LLM, with calibrated confidence scores.

→ [Temporal docs](docs/reference/) · [Temporal cookbook](cookbook/)

### 🗺️ Knowledge Graphs

Build, enrich, and analyze knowledge graphs with production-grade algorithms.

- Add entities, relationships, and typed properties with full metadata support.
- Run PageRank, betweenness centrality, and Louvain community detection out of the box.
- Generate Node2Vec embeddings and score potential new links.
- Delta processing keeps large graphs fresh without full recomputes.

→ [KG docs](docs/reference/)

### 🔍 Semantic Extraction

Pull structured knowledge out of raw text.

- Extract entities and relationships from text using LLMs or rule-based methods.
- Generate (subject, predicate, object) triplets ready to load into any KG.
- Deduplicate entities intelligently — Jaro-Winkler, semantic, and hybrid strategies. v2 is up to **6.98x faster**.
- Optionally have the LLM annotate each relation with temporal validity and confidence.

→ [Extraction docs](docs/reference/)

### 🧠 Reasoning Engines

Go beyond retrieval — derive new facts from what you know.

- **Forward chaining** — IF/THEN rules over facts.
- **Rete network** — high-throughput production rule matching for real-time event streams.
- **Deductive** — classical inference from axioms.
- **Abductive** — generate plausible hypotheses from observations.
- **SPARQL** — query-based inference over RDF graphs.
- **Temporal** — deterministic Allen algebra, no LLM required.

→ [Reasoning docs](docs/reference/)

### 📋 Provenance & Auditability

Every fact, decision, and computation links back to where it came from.

- Auto-stamp transaction time on every provenance record.
- Query full revision history for any fact — version, author, validity window, supersession chain.
- Export audit logs in JSON or CSV.
- Export temporal relationships as OWL-Time RDF triples.
- W3C PROV-O compliant across all modules.

→ [Provenance docs](docs/reference/)

### 🔷 Ontology & SHACL

Build, import, and enforce data contracts for your knowledge graphs.

- Auto-generate OWL ontologies from any KG — no hand-authoring.
- Import existing ontologies in OWL, RDF, Turtle, or JSON-LD.
- Derive SHACL shapes from any ontology and validate graphs against them.
- Manage SKOS controlled vocabularies with hierarchy, search, and REST APIs.

→ [Ontology docs](docs/reference/ontology.md)

### 🏭 Pipeline & Production

Orchestrate multi-stage KG pipelines with reliability built in.

- Chain ingest → extract → deduplicate → build → export stages with a fluent builder API.
- Validate the pipeline config before running it.
- Retry failed stages with exponential backoff, fixed delay, or linear backoff.
- 100+ LLM providers via LiteLLM — OpenAI, Anthropic, Mistral, Ollama, Azure, Bedrock, and more.

→ [Pipeline docs](docs/reference/)

### 🔎 Vector Store

Semantic memory with hybrid search and metadata filtering.

- FAISS, Pinecone, Weaviate, Qdrant, Milvus, PgVector, and in-memory — one API for all.
- Hybrid search mixes vector similarity and keyword matching with configurable weights.
- Filter by any metadata field, or tune similarity weights per use case.

---

## Modules

| Module | What it provides |
|---|---|
| `semantica.context` | Context graphs, agent memory, decision tracking, causal analysis, precedent search, policy engine |
| `semantica.kg` | Knowledge graph construction, graph algorithms, centrality, community detection, embeddings, link prediction, provenance |
| `semantica.semantic_extract` | NER, relation extraction, event extraction, coreference, triplet generation, LLM-enhanced extraction |
| `semantica.reasoning` | Forward chaining, Rete network, deductive, abductive, SPARQL reasoning, explanation generation |
| `semantica.vector_store` | FAISS, Pinecone, Weaviate, Qdrant, Milvus, PgVector, in-memory; hybrid & filtered search |
| `semantica.export` | RDF (Turtle/JSON-LD/N-Triples/XML), Parquet, ArangoDB AQL, CSV, YAML, OWL, graph formats |
| `semantica.ingest` | Files (PDF, DOCX, CSV, HTML), web crawl, feeds, databases, Snowflake, MCP, email, repositories |
| `semantica.ontology` | Auto-generation (6-stage pipeline), OWL/RDF export, import (OWL/RDF/Turtle/JSON-LD), validation, versioning, **SHACL shape generation & validation** |
| `semantica.pipeline` | Pipeline DSL, parallel workers, validation, retry policies, failure handling, resource scheduling |
| `semantica.graph_store` | Graph database backends — Neo4j, FalkorDB, Apache AGE, Amazon Neptune; Cypher queries |
| `semantica.embeddings` | Text embedding generation — Sentence-Transformers, FastEmbed, OpenAI, BGE; similarity calculation |
| `semantica.deduplication` | Entity deduplication, similarity scoring, merging, clustering; blocking and semantic strategies |
| `semantica.provenance` | W3C PROV-O compliant end-to-end lineage tracking, source attribution, audit trails |
| `semantica.parse` | Document parsing — PDF, DOCX, PPTX, HTML, code, email, structured data, media with OCR |
| `semantica.split` | Document chunking — recursive, semantic, entity-aware, relation-aware, graph-based, ontology-aware |
| `semantica.normalize` | Data normalization for text, entities, dates, numbers, quantities, languages, encodings |
| `semantica.conflicts` | Multi-source conflict detection (value, type, relationship, temporal, logical) with resolution strategies |
| `semantica.change_management` | Version storage, change tracking, checksums, audit trails, compliance support for KGs and ontologies |
| `semantica.triplet_store` | RDF triplet store integration — Blazegraph, Jena, RDF4J; SPARQL queries and bulk loading |
| `semantica.visualization` | Interactive and static visualization of KGs, ontologies, embeddings, analytics, and temporal graphs |
| `semantica.seed` | Seed data management for initial KG construction from CSV, JSON, databases, and APIs |
| `semantica.core` | Framework orchestration, configuration management, knowledge base construction, plugin system |
| `semantica.llms` | LLM provider integrations — Groq, OpenAI, Novita AI, HuggingFace, LiteLLM |
| `semantica.utils` | Shared utilities — logging, validation, exception handling, constants, types, progress tracking |

## 💻 Code Examples

### Decision Tracking

```python
from semantica.context import ContextGraph

graph = ContextGraph(advanced_analytics=True)

# Record decisions with full reasoning context
# record_decision() accepts keyword args and returns the decision ID
loan_id = graph.record_decision(
    category="loan_approval",
    scenario="Mortgage — 780 credit score, 28% DTI",
    reasoning="Strong credit history, stable 8-year income, low DTI",
    outcome="approved",
    confidence=0.95,
)
rate_id = graph.record_decision(
    category="interest_rate",
    scenario="Set rate for approved mortgage",
    reasoning="Prime applicant qualifies for lowest tier",
    outcome="rate_set_6.2pct",
    confidence=0.98,
)

# Link decisions causally — builds an auditable chain
graph.add_causal_relationship(loan_id, rate_id, relationship_type="enables")

# Query the graph
similar    = graph.find_similar_decisions("mortgage approval", max_results=5)
chain      = graph.trace_decision_chain(loan_id)
impact     = graph.analyze_decision_impact(loan_id)
compliance = graph.check_decision_rules({"category": "loan_approval", "confidence": 0.95})
```

→ [Full decision tracking guide](docs/reference/) · [Cookbook examples](cookbook/)

### Temporal GraphRAG

```python
from semantica.kg import TemporalQueryRewriter, TemporalNormalizer
from semantica.context import TemporalGraphRetriever
from datetime import datetime, timezone

# Parse temporal intent from natural language — zero LLM calls
rewriter = TemporalQueryRewriter()
result   = rewriter.rewrite("What decisions were made before the 2024 merger?")
# result.temporal_intent → "before"
# result.at_time         → datetime(2024, ..., tzinfo=UTC)
# result.rewritten_query → "What decisions were made"

# Filter any retriever to a point in time — drop-in wrapper
retriever = TemporalGraphRetriever(
    base_retriever=your_retriever,
    at_time=datetime(2024, 3, 1, tzinfo=timezone.utc),
)
ctx = retriever.retrieve("supplier approval decisions")

# Normalize any date expression to UTC — zero LLM calls
normalizer = TemporalNormalizer()
start, end = normalizer.normalize("Q1 2024")
# → (datetime(2024, 1, 1, UTC), datetime(2024, 3, 31, UTC))

start, end = normalizer.normalize("effective from 2023-09-01")
# → (datetime(2023, 9, 1, UTC), None)
```

→ [Temporal GraphRAG docs](docs/reference/) · [Temporal cookbook](cookbook/)

### Point-in-Time Graph Snapshots

```python
from semantica.context import ContextGraph, AgentContext
from semantica.vector_store import VectorStore
from datetime import datetime, timezone

graph = ContextGraph()

# record_decision() accepts keyword args and supports validity windows
graph.record_decision(
    category="policy",
    scenario="Approve supplier A",
    outcome="approved",
    confidence=0.9,
    valid_from=datetime(2024, 1, 1, tzinfo=timezone.utc),
    valid_until=datetime(2024, 6, 30, tzinfo=timezone.utc),
)

# Reconstruct the graph exactly as it was on any date
# The source graph is never mutated
snapshot = graph.state_at(datetime(2024, 3, 15, tzinfo=timezone.utc))

# Named checkpoints — checkpoint() and diff_checkpoints() live on AgentContext
context = AgentContext(
    vector_store=VectorStore(backend="inmemory"),
    knowledge_graph=graph,
    decision_tracking=True,
)
context.checkpoint("before_merge")
# ... make changes ...
diff = context.diff_checkpoints("before_merge", "after_merge")
# → {"decisions_added": [...], "relationships_added": [...], ...}
```

### Semantic Extraction

```python
from semantica.semantic_extract import NERExtractor, RelationExtractor, TripletExtractor

text = """
OpenAI released GPT-4 in March 2023. Microsoft integrated GPT-4 into Azure.
Anthropic, founded by former OpenAI researchers, released Claude as a competing model.
"""

# Step 1 — extract entities
entities = NERExtractor().extract_entities(text)
# → [Entity(label="OpenAI", ...), Entity(label="GPT-4", ...), ...]

# Step 2 — extract relations (requires entities)
relations = RelationExtractor().extract_relations(text, entities=entities)
# → [Relation(source="OpenAI", type="released", target="GPT-4"), ...]

# Step 3 — extract full (subject, predicate, object) triplets
triplets = TripletExtractor().extract_triplets(text)
```

### Semantic Extraction with Temporal Bounds

```python
from semantica.semantic_extract import NERExtractor
from semantica.semantic_extract.methods import extract_relations_llm

text = "The partnership was effective from January 2022 until the merger in Q3 2024."

# extract_relations_llm requires pre-extracted entities as second arg
entities  = NERExtractor().extract_entities(text)
relations = extract_relations_llm(
    text,
    entities,
    provider="openai",
    extract_temporal_bounds=True,   # LLM annotates each relation with validity window
)

for rel in relations:
    print(f"{rel.source} → {rel.target}")
    print(f"  valid: {rel.metadata['valid_from']} → {rel.metadata['valid_until']}")
    print(f"  confidence: {rel.metadata['temporal_confidence']}")
```

→ [Extraction docs](docs/reference/)

### Knowledge Graphs & Algorithms

```python
from semantica.kg import GraphBuilder, CentralityCalculator, NodeEmbedder, LinkPredictor

# Build a KG from entity/relationship dicts
builder = GraphBuilder()
graph   = builder.build({
    "entities": [
        {"id": "bert",        "label": "BERT",        "type": "Model"},
        {"id": "transformer", "label": "Transformer", "type": "Architecture"},
        {"id": "gpt4",        "label": "GPT-4",       "type": "Model"},
    ],
    "relationships": [
        {"source": "bert", "target": "transformer", "type": "based_on"},
        {"source": "gpt4", "target": "transformer", "type": "based_on"},
    ],
})

# Graph algorithms
centrality = CentralityCalculator().calculate_pagerank(graph)
embeddings = NodeEmbedder().compute_embeddings(
    graph, node_labels=["Model"], relationship_types=["based_on"]
)
link_score = LinkPredictor().score_link(graph, "gpt4", "bert", method="common_neighbors")
```

→ [KG algorithm docs](docs/reference/) · [KG cookbook](cookbook/)

### Reasoning

```python
from semantica.reasoning import Reasoner, ReteEngine

# Forward chaining — derive new facts from rules
reasoner = Reasoner()
reasoner.add_rule("IF Person(?x) THEN Mortal(?x)")
results = reasoner.infer_facts(["Person(Socrates)"])
# → ["Mortal(Socrates)"]

# Rete network — build a rule network, add facts, then run pattern matching
from semantica.reasoning import Rule, Fact, RuleType

rete = ReteEngine()
rule = Rule(
    rule_id="r1",
    name="flag_high_risk",
    conditions=[
        {"field": "amount",  "operator": ">",  "value": 10000},
        {"field": "country", "operator": "in", "value": ["IR", "KP", "SY"]},
    ],
    conclusion="flag_for_compliance_review",
    rule_type=RuleType.IMPLICATION,
)
rete.build_network([rule])

fact = Fact(fact_id="f1", predicate="transaction", arguments=[{"amount": 15000, "country": "IR"}])
rete.add_fact(fact)
matches = rete.match_patterns()   # returns List[Match]
```

→ [Reasoning docs](docs/reference/)

### Ontology Generation & Validation

```python
from semantica.ontology import OntologyEngine

engine   = OntologyEngine()

# Derive an OWL ontology from any data dict
ontology = engine.from_data(your_data_dict)

# Export as OWL (Turtle or RDF/XML)
engine.export_owl(ontology, path="domain_ontology.owl", format="turtle")

# Validate ontology consistency
result = engine.validate(ontology)

# Generate ontology from raw text using an LLM
ontology = engine.from_text("Employees work at companies. Companies have departments.")

# Convert ontology to OWL string
owl_str = engine.to_owl(ontology, format="turtle")
```

→ [Ontology docs](docs/reference/ontology.md)

### Pipeline Orchestration

```python
from semantica.pipeline import PipelineBuilder, PipelineValidator
from semantica.pipeline import RetryPolicy, RetryStrategy

# Build a multi-stage pipeline using add_step(name, type, **config)
builder = (
    PipelineBuilder()
    .add_step("ingest",      "file_ingest",   source="./documents/", recursive=True)
    .add_step("extract",     "triplet_extract")
    .add_step("deduplicate", "entity_dedup",  threshold=0.85)
    .add_step("build_kg",    "kg_build")
    .add_step("export",      "rdf_export",    format="turtle", output="output/kg.ttl")
    .set_parallelism(4)              # set_parallelism(), not with_parallel_workers()
)

pipeline = builder.build(name="kg_pipeline")

# Validate before running — catches config errors early
result = PipelineValidator().validate(pipeline)
if result.valid:
    pipeline.run()
```

→ [Pipeline docs](docs/reference/)

---

## 📦 Modules

- **`semantica.context`** — context graphs, decisions, causal chains, precedent search, policy engine, checkpoints
- **`semantica.kg`** — KG construction, graph algorithms, embeddings, link prediction, temporal query engine, Allen algebra, `TemporalNormalizer`, provenance
- **`semantica.semantic_extract`** — NER, relation extraction, triplet generation, LLM extraction with temporal bounds, deduplication
- **`semantica.reasoning`** — forward chaining, Rete, deductive, abductive, SPARQL, temporal algebra
- **`semantica.vector_store`** — FAISS, Pinecone, Weaviate, Qdrant, Milvus, PgVector, in-memory; hybrid & filtered search
- **`semantica.export`** — RDF (Turtle/JSON-LD/N-Triples/XML), OWL-Time, Parquet, ArangoDB AQL, OWL, SHACL
- **`semantica.ingest`** — files, web crawl, databases, Snowflake, email, repositories
- **`semantica.ontology`** — OWL generation & import, SHACL generation & validation, SKOS vocabulary management
- **`semantica.pipeline`** — stage chaining, parallel workers, validation, retry policies, failure handling
- **`semantica.graph_store`** — Neo4j, FalkorDB, Apache AGE, Amazon Neptune; Cypher queries
- **`semantica.embeddings`** — Sentence-Transformers, FastEmbed, OpenAI, BGE; similarity
- **`semantica.deduplication`** — entity dedup, similarity scoring, blocking and semantic strategies
- **`semantica.provenance`** — W3C PROV-O lineage, revision history, audit log export
- **`semantica.parse`** — PDF, DOCX, PPTX, HTML, code, email, media with OCR
- **`semantica.split`** — recursive, semantic, entity-aware, graph-based, ontology-aware chunking
- **`semantica.conflicts`** — multi-source conflict detection with resolution strategies
- **`semantica.change_management`** — version storage, checksums, audit trails, compliance support
- **`semantica.triplet_store`** — Blazegraph, Jena, RDF4J; SPARQL, bulk loading, SKOS helpers
- **`semantica.visualization`** — KG, ontology, embedding, and temporal graph visualization
- **`semantica.llms`** — Groq, OpenAI, Novita AI, HuggingFace, LiteLLM


---

## 🔌 Integrations

### Graph Databases
- **AWS Neptune** — Amazon Neptune with IAM authentication
- **Apache AGE** — PostgreSQL + openCypher via SQL
- **FalkorDB** — native support for decision queries and causal analysis

### Vector Databases
- **FAISS** — built-in, zero extra dependencies
- **Pinecone** — `pip install semantica[vectorstore-pinecone]`
- **Weaviate** — `pip install semantica[vectorstore-weaviate]`
- **Qdrant** — `pip install semantica[vectorstore-qdrant]`
- **Milvus** — `pip install semantica[vectorstore-milvus]`
- **PgVector** — `pip install semantica[vectorstore-pgvector]`

### Data Sources
- **Files** — PDF, DOCX, HTML, JSON, CSV, Excel, PPTX, archives
- **Web** — configurable-depth crawler
- **Databases** — SQL via `DBIngestor`
- **Snowflake** — table/query ingestion, pagination, password/key-pair/OAuth/SSO auth · `pip install semantica[db-snowflake]`
- **Docling** — advanced table and layout extraction (PDF, DOCX, PPTX, XLSX)

### LLM Providers
- **LiteLLM** — 100+ models: OpenAI, Anthropic, Cohere, Mistral, Ollama, Azure, AWS Bedrock, and more
- **Novita AI** — OpenAI-compatible (`deepseek/deepseek-v3.2` and more) · set `NOVITA_API_KEY`

### Agentic Frameworks
Semantica complements — not replaces — LangChain, LlamaIndex, AutoGen, CrewAI, Google ADK, and more.

> **Agno — First-Class Integration** · `pip install semantica[agno]`
>
> Five ready-to-use Agno components:
> - `AgnoContextStore` — graph-backed agent memory
> - `AgnoKnowledgeGraph` — multi-hop GraphRAG knowledge base
> - `AgnoDecisionKit` — 6 decision-intelligence tools
> - `AgnoKGToolkit` — 7 KG pipeline tools
> - `AgnoSharedContext` — shared context graph for multi-agent teams

---

## 🛠️ Installation

```bash
# Core
pip install semantica

# All optional dependencies
pip install semantica[all]

# Pick only what you need
pip install semantica[vectorstore-pinecone]
pip install semantica[vectorstore-weaviate]
pip install semantica[vectorstore-qdrant]
pip install semantica[vectorstore-milvus]
pip install semantica[vectorstore-pgvector]
pip install semantica[db-snowflake]   # Snowflake ingestion
pip install semantica[agno]           # Agno integration

# From source
git clone https://github.com/Hawksight-AI/semantica.git
cd semantica
pip install -e ".[dev]"
pytest tests/
```

---

## 🏆 Built for High-Stakes Domains

> Every answer explainable. Every decision auditable. Every fact traceable.

- 🏥 **Healthcare** — clinical decision support, drug interaction graphs, patient safety audit trails
- 💰 **Finance** — fraud detection, regulatory compliance, risk knowledge graphs
- ⚖️ **Legal** — evidence-backed research, contract analysis, case law reasoning
- 🔒 **Cybersecurity** — threat attribution, incident response timelines, provenance tracking
- 🏛️ **Government** — policy decision records, classified information governance
- 🏭 **Infrastructure** — power grids, transportation networks, operational decision logs
- 🤖 **Autonomous Systems** — decision logs, safety validation, explainable AI

---

## 🤝 Community & Support

- 💬 **[Discord](https://discord.gg/sV34vps5hH)** — real-time help and showcases
- 💡 **[GitHub Discussions](https://github.com/Hawksight-AI/semantica/discussions)** — Q&A and feature requests
- 🐛 **[GitHub Issues](https://github.com/Hawksight-AI/semantica/issues)** — bug reports
- 📄 **[Documentation](https://github.com/Hawksight-AI/semantica/tree/main/docs)** — full reference docs
- 🍳 **[Cookbook](https://github.com/Hawksight-AI/semantica/tree/main/cookbook)** — runnable notebooks and recipes
- 📋 **[Changelog](CHANGELOG.md)** — what changed and why
- 📝 **[Release Notes](RELEASE_NOTES.md)** — per-contributor breakdown

---

## 🤝 Contributing

All contributions welcome — bug fixes, features, tests, and docs.

1. Fork the repo and create a branch
2. `pip install -e ".[dev]"`
3. Write tests alongside your changes
4. Open a PR and tag `@KaifAhmad1` for review

See [CONTRIBUTING.md](CONTRIBUTING.md) for full guidelines.

---

<div align="center">

MIT License · Built by [Hawksight AI](https://github.com/Hawksight-AI) · [⭐ Star on GitHub](https://github.com/Hawksight-AI/semantica)

[GitHub](https://github.com/Hawksight-AI/semantica) · [Discord](https://discord.gg/sV34vps5hH) · [X / Twitter](https://x.com/BuildSemantica)

</div>

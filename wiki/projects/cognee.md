---
entity_id: cognee
type: project
bucket: knowledge-bases
sources:
  - repos/topoteretes-cognee.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/volcengine-openviking.md
  - deep/repos/topoteretes-cognee.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:33:18.934Z'
---
# Cognee

**Open-source knowledge graph and memory system for AI agents**
Apache-2.0 · Python · 14,899 stars (GitHub-reported, not independently verified)

---

## What It Does

Cognee ingests documents, code, or raw text, extracts entities and relationships with an LLM, and stores them in a combined vector + graph database. Queries run against both stores simultaneously: vector search surfaces semantically similar content, graph traversal surfaces related entities. The pitch is that this relational structure lets agents answer multi-hop questions that flat RAG misses ("Which projects use the same auth library as the billing service?").

The three-line mental model: `cognee.add()` ingests, `cognee.cognify()` builds the knowledge graph, `cognee.search()` queries it.

---

## Architecturally Unique Aspects

Standard RAG treats documents as bags of text chunks. Cognee adds a graph layer where entities (people, concepts, code modules) become nodes and their relationships become edges. This means retrieval can traverse relationships rather than just rank by cosine similarity.

The pipeline is modular and pipeline-oriented. `cognee.cognify()` runs a sequence of tasks: document parsing, entity extraction (via LLM), graph construction, and vectorization. Users can swap individual pipeline stages.

Backend flexibility is a deliberate design choice. Cognee abstracts over multiple storage backends:
- **Vector stores**: Qdrant, Weaviate, Milvus, PGVector, LanceDB, ChromaDB
- **Graph databases**: Neo4j, NetworkX (in-memory), Memgraph, FalkorDB, Kuzu
- **Relational**: SQLite (default), PostgreSQL

This means it runs locally with SQLite + NetworkX on a laptop, or connects to production Neo4j and Qdrant clusters without code changes.

The entity extraction step distinguishes Cognee from simpler graph-RAG approaches. Rather than building a graph from document structure (section headings, links), it uses an LLM to identify entities and relationships from free text. This produces semantically richer graphs but adds LLM cost to the ingestion phase.

---

## Core Mechanism

The `cognify()` pipeline executes these stages:

1. **Document parsing**: Splits input into chunks based on document type (text, PDF, code). Chunk boundaries are structure-aware for code.

2. **Entity extraction**: An LLM call extracts named entities and typed relationships from each chunk. The output schema defines entity types and relationship predicates.

3. **Graph construction**: Entities become nodes; relationships become edges. The graph accumulates across `cognify()` calls, so adding new documents extends the existing graph rather than rebuilding it.

4. **Vectorization**: Both raw chunks and entity descriptions are embedded and stored in the vector backend. This dual representation enables both semantic chunk retrieval and entity-level search.

`cognee.search()` runs a hybrid query: vector similarity for chunk retrieval, graph traversal for entity expansion. The traversal can follow relationship edges to pull in connected entities that aren't semantically close to the query but are structurally related.

The `cognee.add()` function accepts strings, files, and URLs. Multiple datasets can be namespaced under different dataset names, enabling per-agent or per-user memory isolation.

---

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| GitHub stars | 14,899 | GitHub (self-reported) |
| Forks | 1,507 | GitHub (self-reported) |
| Language | Python 3.10–3.13 | Repo |
| License | Apache-2.0 | Repo |

No independently verified benchmarks appear in the repository. The paper cited in the README (arXiv:2505.24478, "Optimizing the Interface Between Knowledge Graphs and LLMs for Complex Reasoning") covers graph-LLM interface design but does not report head-to-head RAG comparison numbers with external validation.

---

## Strengths

**Multi-hop queries over structured knowledge.** When relationships between entities matter ("Find all engineers who worked on projects that used deprecated libraries"), graph traversal outperforms flat vector search. This is the use case where Cognee has a genuine advantage.

**Incremental graph updates.** Adding new documents extends the graph without full recomputation. This suits agents that accumulate knowledge over time rather than indexing a fixed corpus once.

**Backend portability.** The abstraction layer means local development (SQLite + NetworkX) uses the same API as production deployment (PostgreSQL + Neo4j). Teams can prototype cheaply and scale later.

**Cross-agent knowledge sharing.** The dataset namespacing system allows multiple agents to read from shared knowledge graphs while writing to isolated namespaces.

**Managed cloud option.** Cognee Cloud (cognee.ai) handles infrastructure for teams that don't want to operate vector and graph databases.

---

## Critical Limitations

**Concrete failure mode: entity extraction quality degrades on domain-specific text.** The LLM-based entity extractor is tuned for general language. Technical documentation, medical records, or legal text with domain-specific terminology produces incomplete or incorrectly typed entities. A chunk about Kubernetes admission webhooks may produce generic "component" entities rather than meaningful typed nodes. The graph built from domain text is only as good as the extraction prompt, and the default prompts aren't tuned per domain. There's no documented mechanism for users to validate or correct extracted entities before they enter the graph.

**Unspoken infrastructure assumption: LLMs are cheap and fast.** Both `cognify()` (entity extraction) and `search()` (query understanding) make LLM calls. For large document sets, ingestion cost scales with document count, not just corpus size. A team ingesting thousands of support tickets or code files will pay significant API costs before the system is useful. The README's "6 lines of code" framing obscures this: those 6 lines assume an `LLM_API_KEY` and don't surface the per-document cost structure.

---

## When NOT to Use Cognee

**Fixed corpus, single-hop queries.** If the retrieval task is "find the most relevant chunks to this question" over a stable document set, standard RAG with a well-configured vector store is cheaper, simpler, and equally accurate. Graph construction adds ingestion cost without benefit when queries don't require traversal.

**Cost-sensitive pipelines at scale.** Every `cognify()` call makes LLM requests for entity extraction. At thousands of documents per day, this becomes expensive. Systems with strict per-query budget constraints should benchmark total cost (ingestion + retrieval) against simpler alternatives before committing.

**Real-time streaming data.** Cognee is designed around batch ingestion. Streaming updates that require immediate graph consistency aren't well-supported. The graph-building step has latency unsuitable for real-time memory.

**Teams without graph database expertise.** Production deployment against Neo4j or Memgraph requires operational knowledge of graph databases. The in-memory NetworkX backend doesn't persist across restarts, so local development habits won't transfer to production without infrastructure work.

---

## Unresolved Questions

**Graph conflict resolution.** When two documents assert contradictory facts about the same entity, how does Cognee resolve the conflict? The documentation doesn't describe a conflict detection or entity deduplication mechanism. If document A says "Alice reports to Bob" and document B says "Alice reports to Carol," both relationships enter the graph. Queries will return both without any signal about which is current.

**Extraction quality at scale.** There are no documented metrics for entity extraction precision/recall against real-world corpora. It's unclear what happens to retrieval quality as graph size grows and entity counts reach millions.

**Governance of the managed cloud.** Cognee Cloud handles infrastructure but the pricing, data residency guarantees, and SLAs are not documented in the public repository. Teams with compliance requirements have no public basis for evaluating the managed option.

**Graph maintenance over time.** The README emphasizes "continuous learning" and "dynamically evolving contextual knowledge," but the mechanics of updating or retracting relationships when source documents change aren't documented. Does re-ingesting a modified document overwrite, merge, or duplicate its entities?

---

## Alternatives and Selection Guidance

| Alternative | Choose when |
|-------------|-------------|
| **LlamaIndex** with vector store | Single-hop retrieval over a fixed corpus; lower operational complexity; no graph traversal needed |
| **LangChain** + vector store | Familiar ecosystem; large plugin library; graph structure isn't required |
| **Graphiti** | Temporal knowledge graphs with explicit time-bounded facts; episodic memory where "when" matters as much as "what" |
| **OpenViking** | Hierarchical document structures (codebases, nested wikis); token efficiency is the primary constraint; L0/L1/L2 tiered retrieval |
| **Mem0** | Session-level user memory with simpler operational requirements; no graph traversal needed |
| **Neo4j + custom pipeline** | Full control over entity schemas, extraction prompts, and graph schema; production requirements that exceed Cognee's current maturity |

Cognee sits in the middle of the complexity spectrum: more capable than flat vector RAG for relational queries, less flexible than a hand-built graph pipeline. It's the right choice when multi-hop entity relationships are a real requirement and the team wants a working system faster than building from scratch.

[Source](../../raw/repos/topoteretes-cognee.md)


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.5)

---
entity_id: lightrag
type: project
bucket: knowledge-bases
sources:
  - repos/osu-nlp-group-hipporag.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-04T21:20:19.878Z'
---
# LightRAG

## What It Is

LightRAG is a graph-based Retrieval-Augmented Generation system that combines knowledge graph construction with a dual-level retrieval mechanism. It extracts entities and relationships from documents, builds a persistent graph structure, and supports both local (entity-focused) and global (thematic) queries against that graph.

## What Makes It Different

Most RAG systems operate over flat vector indexes — chunks are retrieved by embedding similarity and passed to the LLM. LightRAG adds a graph layer: during indexing, an LLM extracts entities and relationships, stores them in a knowledge graph, and indexes both raw text chunks and graph nodes/edges. At query time, retrieval can operate at two levels:

- **Local retrieval**: finds specific entities and their immediate neighbors — good for precise factual queries
- **Global retrieval**: aggregates thematic patterns across the graph — better for broad, conceptual questions
- **Hybrid mode**: combines both

This dual-level design addresses a known weakness of flat RAG: inability to answer queries requiring multi-hop reasoning or synthesis across many documents.

## Architecture Summary

1. **Ingestion**: Documents are chunked and passed to an LLM for entity and relationship extraction
2. **Graph construction**: Extracted triples are stored in a graph database (supports NetworkX locally, or Neo4j/other backends)
3. **Dual indexing**: Vector embeddings are maintained for both text chunks and graph nodes
4. **Retrieval**: At query time, the system routes through local, global, or hybrid retrieval depending on query type
5. **Generation**: Retrieved context (graph subgraph + text chunks) is passed to the LLM for final answer generation

The system is designed to be lightweight — hence the name — with minimal infrastructure dependencies by default.

## Key Numbers

- Positions itself as simpler to set up than comparable graph-RAG systems
- Compares favorably to GraphRAG (Microsoft) and naive RAG on multi-hop and synthesis benchmarks in its own evaluations
- Exact benchmark figures vary by dataset and configuration; independent reproductions show mixed results depending on document domain

## Strengths

- **Low setup friction**: runs locally with NetworkX; no mandatory graph database
- **Persistent graph**: the knowledge graph survives across sessions, enabling incremental updates as new documents are added
- **Dual retrieval**: handles both narrow factual and broad thematic queries better than single-mode retrieval
- **Pluggable LLM backends**: works with OpenAI, Ollama, and other providers

## Limitations

- **Extraction quality ceiling**: graph quality is entirely dependent on the LLM used for entity/relationship extraction — smaller or weaker models produce noisy graphs
- **Indexing cost**: every document ingestion triggers LLM calls for extraction, making bulk indexing expensive compared to pure embedding-based RAG
- **Scalability**: the default NetworkX backend doesn't scale to very large corpora without switching to a proper graph database
- **Benchmark honesty**: most published comparisons come from the authors' own paper; third-party evaluations are limited
- **Relationship to GraphRAG**: Microsoft's GraphRAG covers similar ground with more engineering investment; LightRAG's "lighter" framing is relative

## Alternatives

| System | Approach | Notes |
|---|---|---|
| [HippoRAG](../projects/hipporag.md) | KG + Personalized PageRank | Stronger multi-hop reasoning, NeurIPS'24 |
| Microsoft GraphRAG | Community summaries + graph | More infrastructure, better-documented benchmarks |
| Naive RAG | Flat vector retrieval | Simpler, cheaper, often sufficient for single-hop queries |
| Neo4j GraphRAG | Graph-native retrieval | Production-grade but heavier setup |

## Practical Implications

LightRAG is a reasonable starting point for teams that need graph-augmented retrieval without standing up a full graph database infrastructure. It works best on document sets with dense relational structure (e.g., legal corpora, technical documentation, research papers) where entity relationships matter. For simple Q&A over homogeneous documents, flat RAG is likely cheaper and comparably accurate.

---

*Related: Retrieval-Augmented Generation*


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — extends (0.8)

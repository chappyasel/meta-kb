---
entity_id: llamaindex
type: project
bucket: knowledge-bases
abstract: >-
  LlamaIndex is a Python/TypeScript data framework for connecting LLMs to custom
  data sources via ingestion, indexing, and querying pipelines, distinguished by
  its modular architecture and 150+ integrations rather than opinionated
  defaults.
sources:
  - repos/microsoft-llmlingua.md
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/infiniflow-ragflow.md
related:
  - langchain
last_compiled: '2026-04-07T11:51:28.352Z'
---
# LlamaIndex

## What It Does

LlamaIndex (formerly GPT Index) is a data framework for building [Retrieval-Augmented Generation](../concepts/rag.md) applications. Where [LangChain](../projects/langchain.md) handles general LLM orchestration, LlamaIndex focuses specifically on the data layer: getting information into a form that LLMs can query effectively.

The core workflow is ingest → index → query. You load documents from 150+ data connectors (files, databases, APIs, SaaS tools), chunk and embed them into one or more index types, then query via a range of retrieval strategies. The framework handles the plumbing between these stages while remaining modular enough to swap individual components.

LlamaIndex ships in Python (primary) and TypeScript (`LlamaIndex.TS`). As of 2025, the Python package reports over 35,000 GitHub stars.

## Architecture

### Core Abstractions

**Documents and Nodes** — `Document` objects wrap raw text plus metadata. The parsing pipeline converts these into `Node` objects (specifically `TextNode` in most cases), which are the unit of indexing and retrieval. Nodes carry source relationships, metadata, and embeddings.

**Index Types** — LlamaIndex ships several index structures, each suited to different retrieval patterns:

- `VectorStoreIndex` — the workhorse. Embeds nodes and stores them in a [vector database](../concepts/vector-database.md). Supports 20+ backends (Pinecone, Chroma, Qdrant, Weaviate, FAISS, pgvector, etc.) via the `VectorStore` abstraction in `llama_index/core/vector_stores/types.py`.
- `SummaryIndex` (formerly `ListIndex`) — sequential access, useful when you want to synthesize across all documents rather than retrieve a subset.
- `KnowledgeGraphIndex` — extracts and stores entity-relation triples, enabling graph traversal queries. Connects to [Neo4j](../projects/neo4j.md) and other graph backends.
- `DocumentSummaryIndex` — maintains per-document summaries alongside chunk-level nodes, routing queries to documents before retrieving chunks.
- `PropertyGraphIndex` — added in v0.10, more flexible than `KnowledgeGraphIndex`. Allows custom node and edge types.

**Retrievers** — Each index has a corresponding retriever, but LlamaIndex also ships standalone retrievers: `BM25Retriever` for keyword search, `RecursiveRetriever` for hierarchical documents, `AutoMergingRetriever` for parent-child node merging, and `RouterRetriever` for dispatching queries across multiple indices.

**Query Engines and Chat Engines** — `QueryEngine` wraps a retriever plus a response synthesizer. `ChatEngine` adds conversation history management. The `RetrieverQueryEngine` is the standard composition.

**Node Parsers (Chunking)** — `llama_index/core/node_parser/` contains the chunking implementations:
- `SentenceSplitter` — splits on sentence boundaries with configurable chunk size and overlap
- `CodeSplitter` — uses [Tree-sitter](../projects/tree-sitter.md) for language-aware code chunking
- `SemanticSplitter` — uses embedding similarity to find natural break points
- `HierarchicalNodeParser` — creates parent and child nodes at multiple granularities, enabling the `AutoMergingRetriever` to fetch broader context when multiple child chunks from the same parent are retrieved
- `MarkdownNodeParser`, `JSONNodeParser`, `HTMLNodeParser` — format-aware parsers

**Response Synthesizers** — After retrieval, a synthesizer assembles the answer. Options include `compact` (stuffs all context into one prompt), `refine` (iterates over chunks sequentially, refining the answer), `tree_summarize` (builds a summary tree for large context), and `accumulate` (generates a response per chunk, then combines).

### Pipeline Composition

The `IngestionPipeline` class (introduced ~v0.9) formalizes the data transformation sequence as a list of `Transformation` objects. Each transformation implements `__call__(nodes, **kwargs)`, enabling cache-aware execution via `SimpleDocumentStore` or a persistent docstore. This is LlamaIndex's answer to reproducible, incremental ingestion.

For more complex workflows, `QueryPipelineComponent` and the query pipeline DSL allow chaining arbitrary components — retrievers, LLMs, postprocessors — into DAGs. The `llama_index/core/query_pipeline/` module implements this.

### Agentic RAG

LlamaIndex ships `ReActAgent` and `FunctionCallingAgent`, both wrapping the standard tool-calling loop. `QueryEngineTool` wraps any query engine as an agent tool, enabling agents to dynamically select which index to query. For [Agentic RAG](../concepts/agentic-rag.md) patterns, this is the primary mechanism.

The `SubQuestionQueryEngine` implements a simpler version: it decomposes a complex query into sub-questions, routes each to a designated tool, then synthesizes a final answer.

### LlamaHub

LlamaHub (https://llamahub.ai) is the integration registry — data loaders, vector store integrations, and LLM connectors maintained as separate packages under the `llama-index-*` namespace. This means the core package stays lean, and you install only what you need (`llama-index-vector-stores-chroma`, `llama-index-embeddings-openai`, etc.).

## Key Numbers

- GitHub stars: ~35,000+ (self-reported via README badges; not independently audited)
- LlamaHub integrations: 150+ data loaders claimed on the project site
- TypeScript port: maintained as a separate repo (`run-llama/LlamaIndexTS`)

Benchmark performance varies substantially by retrieval strategy, embedding model, and dataset. LlamaIndex does not publish a canonical benchmark suite. Third-party evaluations exist (RAGAS framework is commonly used with LlamaIndex pipelines) but results are workload-specific and difficult to generalize.

## Strengths

**Modular composability** — swapping an embedding model, vector store, or LLM requires changing one constructor argument. The abstraction layers hold reasonably well across backends.

**Hierarchical retrieval** — `HierarchicalNodeParser` + `AutoMergingRetriever` is a practical implementation of the "small-to-big" retrieval pattern. When semantic search finds a small chunk, the retriever automatically fetches the surrounding parent context before passing it to the LLM.

**Multi-index querying** — `RouterQueryEngine` can select among multiple indices at query time based on descriptions. For heterogeneous data sources (structured + unstructured, or multiple domains), this reduces the need to maintain a single monolithic index.

**Evaluation tooling** — `llama_index/core/evaluation/` includes `FaithfulnessEvaluator`, `RelevancyEvaluator`, and `CorrectnessEvaluator`, each using an [LLM-as-Judge](../concepts/llm-as-judge.md) approach. `RetrieverEvaluator` measures hit rate and MRR against a labeled dataset.

**LlamaCloud** — the managed ingestion and retrieval service, useful when you want LlamaIndex semantics without running your own vector database infrastructure.

## Critical Limitations

**Concrete failure mode**: The `SemanticSplitter` produces highly variable chunk sizes depending on the embedding model's similarity thresholds. In practice, document corpora with dense, topic-rich text (legal documents, academic papers) often produce extremely small chunks (under 100 tokens) that lack sufficient context for retrieval. Switching to `SentenceSplitter` with explicit chunk sizes typically produces better retrieval results for these document types — but there is no automatic detection or warning. You discover the problem when retrieval quality is poor.

**Unspoken infrastructure assumption**: `VectorStoreIndex` in its default in-memory configuration (`SimpleVectorStore`) loads all vectors into RAM. For document collections above a few thousand nodes, this becomes a memory problem with no warning. Production use requires an external vector store, which means managing that infrastructure separately. The framework does not make this tradeoff explicit in its quick-start documentation.

## When NOT to Use It

**When document parsing quality is paramount** — LlamaIndex delegates complex PDF parsing to libraries like `pypdf`, `pdfminer`, or via LlamaHub loaders. It does not do layout recognition, OCR, or table structure recovery at the level that purpose-built document intelligence systems do. For corpora heavy with scanned PDFs, multi-column layouts, or complex tables, RAGFlow's DeepDoc pipeline or dedicated document processing tools are better foundations.

**When you need a no-code or low-code UI** — LlamaIndex is a developer framework. There is no built-in visual workflow builder for non-technical users. RAGFlow, Flowise, or similar tools serve that need.

**When you need multi-tenant, production-ready infrastructure out of the box** — LlamaIndex provides the abstractions; you bring the infrastructure. A production deployment requires separately managed vector stores, embedding model serving, LLM endpoints, and monitoring. If you want a batteries-included RAG system, the operational overhead of assembling these is real.

**When your primary concern is agent orchestration over complex multi-step tasks** — [LangGraph](../projects/langgraph.md) or [CrewAI](../projects/crewai.md) provide more expressive control flow for complex agent workflows. LlamaIndex agents are capable but secondary to its data indexing strengths.

## Unresolved Questions

**LlamaCloud pricing and lock-in** — LlamaCloud (the managed service) has commercial pricing that is not fully transparent in the documentation. If you build on LlamaCloud's managed parsing and retrieval, migration costs are unclear.

**Conflict between abstraction layers and performance** — The universal `VectorStore` interface works well for simple queries, but metadata filtering capabilities differ significantly across backends. Pinecone's filter syntax, Qdrant's payload filtering, and pgvector's SQL predicates are all exposed differently. Whether a given filter expression will work against your backend requires reading backend-specific documentation, not just the LlamaIndex interface.

**Version stability** — LlamaIndex underwent a major refactor from v0.8 to v0.10 that renamed most core classes and reorganized the package structure. The migration burden was substantial for existing codebases. There is no public API stability commitment, so the risk of another breaking reorganization is real.

**Evaluation benchmark coverage** — The built-in evaluation tools measure faithfulness and relevancy via LLM-as-judge, which introduces the judge model's biases. There is no built-in ground-truth dataset or standardized benchmark, making it hard to compare retrieval configurations objectively without building your own evaluation harness.

## Relationship to Other Concepts

- **Chunking strategy** ties directly to retrieval quality. See [Context Compression](../concepts/context-compression.md) and [Context Window](../concepts/context-window.md) for the tradeoffs involved.
- **Hybrid search** combining BM25 and dense retrieval is supported via `QueryFusionRetriever`. See [Hybrid Search](../concepts/hybrid-search.md) and [BM25](../concepts/bm25.md).
- **Knowledge graphs** via `KnowledgeGraphIndex` and `PropertyGraphIndex` relate to [GraphRAG](../concepts/graphrag.md) and [Knowledge Graph](../concepts/knowledge-graph.md) concepts.
- **Embedding models** are a first-class configuration concern. See [Embedding Model](../concepts/embedding-model.md).
- The `SubQuestionQueryEngine` implements a form of [Task Decomposition](../concepts/task-decomposition.md).

## Alternatives with Selection Guidance

**Use [LangChain](../projects/langchain.md)** when you need broader LLM workflow orchestration beyond data retrieval — chains, diverse tool integrations, and prompt management are LangChain's strengths. The two frameworks are often used together (LangChain for orchestration, LlamaIndex for data).

**Use [LangGraph](../projects/langgraph.md)** when your retrieval pipeline requires complex conditional logic, loops, or multi-agent coordination that exceeds what LlamaIndex's query pipeline DSL handles cleanly.

**Use RAGFlow** when document parsing quality is the primary constraint — its DeepDoc vision pipeline handles scanned PDFs, complex tables, and multi-column layouts that LlamaIndex's parsing layer cannot.

**Use [DSPy](../projects/dspy.md)** when you want to optimize prompt and retrieval configurations programmatically rather than tuning them manually.

**Use [ChromaDB](../projects/chromadb.md) or [Qdrant](../projects/qdrant.md) directly** (with thin custom wrappers) when your retrieval needs are straightforward and you want less framework overhead.


## Related

- [LangChain](../projects/langchain.md) — competes_with (0.6)

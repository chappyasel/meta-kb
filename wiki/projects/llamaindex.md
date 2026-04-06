---
entity_id: llamaindex
type: project
bucket: knowledge-bases
abstract: >-
  LlamaIndex is a Python framework for building RAG pipelines over heterogeneous
  data, providing 150+ data connectors, a query abstraction layer, and
  composable index types; its main differentiator is flexible, code-first
  pipeline control vs. turnkey RAG tools.
sources:
  - repos/microsoft-llmlingua.md
  - repos/yusufkaraaslan-skill-seekers.md
  - deep/repos/infiniflow-ragflow.md
related: []
last_compiled: '2026-04-06T02:10:36.409Z'
---
# LlamaIndex

**Type:** Project — Knowledge Bases / RAG Frameworks
**Repository:** [run-llama/llama_index](https://github.com/run-llama/llama_index)
**License:** MIT

## What It Does

LlamaIndex is a Python data framework for connecting LLMs to external data. You point it at documents, databases, APIs, or other sources; it handles ingestion, chunking, indexing, and retrieval so an LLM can answer questions grounded in that data. The central use case is [Retrieval-Augmented Generation](../concepts/rag.md), though it extends into agent orchestration, structured data extraction, and workflow composition.

Its architectural premise differs from turnkey RAG engines: LlamaIndex exposes the entire pipeline as composable Python objects rather than hiding decisions behind configuration screens. A developer controls chunking strategy, embedding model, retrieval logic, re-ranking, and response synthesis through code, not a UI.

## Architecture and Core Mechanisms

### Data Layer: Nodes and Connectors

LlamaIndex's internal unit of content is a `Node` (specifically `TextNode`), which carries the text chunk, a unique ID, metadata, and embedding vector. Documents are loaded via `BaseReader` subclasses — there are 150+ connectors spanning local files, web crawlers, Notion, Google Drive, databases, and data platforms. Each reader produces `Document` objects that a `NodeParser` transforms into `Node` objects.

The `NodeParser` interface is where chunking happens. Built-in parsers include:
- `SentenceSplitter` — splits on sentence boundaries with configurable overlap
- `SemanticSplitterNodeParser` — uses embedding similarity to find natural chunk boundaries
- `MarkdownNodeParser` / `CodeSplitter` — structure-aware parsers for specific formats
- `HierarchicalNodeParser` — produces nodes at multiple granularities (useful for [RAPTOR](../projects/raptor.md)-style hierarchical retrieval)

Metadata is preserved from the source document into each node, enabling metadata filtering at retrieval time.

### Index Types

After parsing, nodes go into an index. The primary types:

**VectorStoreIndex** — the default. Embeds each node, stores embeddings in a [vector database](../concepts/vector-database.md) (Chroma, Pinecone, Qdrant, Weaviate, pgvector, and others via the `VectorStore` abstraction), and retrieves by cosine similarity. The index itself is thin; the heavy lifting happens inside whatever vector store you plug in.

**SummaryIndex** — stores nodes in a list, retrieves by iterating through all of them. Useful when you want an LLM to synthesize across an entire document rather than retrieve specific chunks.

**KnowledgeGraphIndex** — extracts entity-relationship triples from text and stores them in a graph. Supports integration with [Knowledge Graphs](../concepts/knowledge-graph.md) and graph databases like Neo4j.

**KeywordTableIndex** — extracts keywords and inverts them into a table. Retrieval matches query keywords to index entries. Largely superseded by hybrid retrieval approaches.

### Query Pipeline

The `RetrieverQueryEngine` orchestrates retrieval and synthesis. Retrieval is pluggable: you can swap in a vector retriever, a [BM25](../concepts/bm25.md) retriever, or a custom class. The `QueryFusionRetriever` implements [Hybrid Retrieval](../concepts/hybrid-retrieval.md) by running multiple retrievers and fusing results. A `NodePostprocessor` chain can then re-rank, filter, or truncate before context assembly.

Response synthesis modes include:
- `compact` — fits as many chunks as possible into the context window
- `refine` — iteratively refines an answer by passing each chunk to the LLM in sequence
- `tree_summarize` — builds a summary tree bottom-up for large result sets
- `no_text` — returns only source nodes without synthesis

The `QueryPipeline` class (introduced in later versions) lets you compose retrieval, synthesis, and arbitrary transformation steps into a directed graph with explicit edges — closer to a dataflow model than a fixed pipeline.

### Agent and Workflow Layer

LlamaIndex includes a `ReActAgent` and `FunctionCallingAgent` that wrap tools (including query engines as tools) into agent loops. This enables [Agentic RAG](../concepts/agentic-rag.md): the agent decides which index to query, how to decompose the question, and when retrieval is sufficient.

The `Workflow` abstraction (v0.10+) provides an event-driven workflow system with typed inputs and outputs per step, explicit state management, and support for human-in-the-loop and streaming. Steps are async Python functions decorated with `@step`, connected by event types rather than explicit wiring.

### LLM and Embedding Abstraction

All LLM calls go through a `BaseLLM` interface; embedding calls go through `BaseEmbedding`. Both support sync and async. Providers include [OpenAI](../projects/openai.md), Anthropic, Cohere, HuggingFace local models (via Ollama), and any [LiteLLM](../projects/litellm.md)-compatible endpoint. The `Settings` object (replacing the older `ServiceContext`) configures global defaults for LLM, embedding model, chunk size, and chunk overlap.

## Key Numbers

- **GitHub stars:** ~40,000+ (as of mid-2025, self-reported from README badges; independently visible on GitHub)
- **Data connectors:** 150+ via the `llama-hub` ecosystem
- **Benchmarks:** LlamaIndex publishes results on [HotpotQA](../projects/hotpotqa.md) and similar multi-hop QA datasets but these are self-reported; no independent third-party benchmark audit exists for the framework itself

## Strengths

**Pipeline transparency.** Every component is inspectable Python. You can log retrieved nodes, modify the prompt template, swap the re-ranker, or instrument embedding calls without fighting the framework's abstractions.

**Connector breadth.** 150+ readers means most data sources have a working integration. The `LlamaParse` service adds cloud-based PDF parsing (table extraction, layout parsing) for documents that simple text extraction fails on.

**Research integration.** The team ships implementations of recent retrieval papers relatively quickly — RAPTOR hierarchical retrieval, HyDE (hypothetical document embeddings), query decomposition, and multi-step retrieval are all available as built-in modules or examples.

**Vector store flexibility.** The `VectorStore` abstraction works with [ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [Pinecone](../projects/pinecone.md), and a dozen others. Switching stores requires changing one class instantiation.

**Async support.** Retrieval and synthesis both have `aquery()` async counterparts, making LlamaIndex usable in FastAPI or other async servers without threading workarounds.

## Critical Limitations

**Concrete failure mode — chunk boundary artifacts at table boundaries.** `SentenceSplitter` operates on sentence-level text and has no awareness of table structure. A table split across two chunks loses context: the header row lands in chunk N, the data rows land in chunk N+1. Retrieval returns one chunk, the LLM sees data without headers, and answers are wrong. LlamaParse (the cloud service) addresses this for PDFs, but local parsing does not. For documents with significant tabular content, you either need LlamaParse (paid, external dependency) or a custom `NodeParser` that detects and preserves table boundaries.

**Unspoken infrastructure assumption: you own your vector store.** VectorStoreIndex delegates persistence, approximate nearest-neighbor search, metadata filtering, and hybrid retrieval to an external service. LlamaIndex provides no opinionated guidance on operational concerns — index size limits, memory footprint, latency at scale, backup strategies, or cost. Teams that hit production scale discover these problems independently. A SimpleVectorStore (in-memory default) silently drops to O(N) linear scan and becomes unusable past ~50,000 nodes.

## When NOT to Use It

**When document parsing quality is the bottleneck.** If your documents are scanned PDFs, complex multi-column layouts, or tables-heavy reports, LlamaIndex's local parsing (pdfminer, pypdf) will extract poor-quality text. A system like RAGFlow with its DeepDoc vision pipeline — OCR, layout recognition, table structure recognition — will produce materially better chunks from the same documents. Better to parse outside LlamaIndex and import the pre-parsed nodes.

**When you need a no-code or low-code interface.** LlamaIndex requires Python. Non-technical stakeholders who need to configure pipelines, add data sources, or manage knowledge bases cannot use it directly. Tools with visual workflow builders suit this case better.

**When you need strict multi-tenancy with access control.** LlamaIndex has no built-in RBAC, tenant isolation, or authentication layer. You can filter nodes by metadata, but enforcing that user A cannot retrieve user B's documents requires infrastructure you build yourself. A production multi-tenant knowledge base needs this handled at the vector store level or above, and LlamaIndex provides no guidance.

**When you need zero infrastructure.** If your constraint is running locally with no external services, LlamaIndex's default in-memory store works for small corpora but degrades fast. The framework assumes you have or will provision a vector database.

## Unresolved Questions

**Governance and maintenance pace.** The llama_index repository has split across multiple packages (llama-index-core, llama-index-readers-*, llama-index-vector-stores-*, etc.), each versioned independently. Integration breakage between packages on minor version bumps is common; there is no documented compatibility matrix. It's unclear how long community-contributed integrations (many in llama-hub) stay maintained.

**Cost at scale.** LlamaIndex makes it easy to call embedding APIs and LLMs on every query. Nothing in the default path caches embedding calls, rate-limits LLM synthesis, or estimates token costs before executing. A `tree_summarize` response over 200 retrieved nodes can make dozens of LLM calls invisibly. Production operators discover this through billing alerts.

**Conflict resolution in multi-index queries.** `QueryFusionRetriever` and `RouterQueryEngine` retrieve from multiple indexes and return a merged result, but the framework does not document how to handle contradictory information retrieved from two sources. The LLM receives both chunks and resolves the contradiction — or doesn't. There is no built-in mechanism for source credibility scoring or contradiction detection.

**LlamaParse dependency creep.** LlamaParse is a hosted, paid service operated by LlamaIndex's company. Several official tutorials and example notebooks use it as the default PDF parser, creating an implicit dependency on a non-open-source commercial service. The boundary between the open-source framework and the commercial service is not clearly communicated in documentation.

## Comparison to Alternatives

**Use [LangChain](../projects/langchain.md) when** you need broader LLM orchestration beyond retrieval — chains, tool use, memory, and agent patterns across many provider integrations. LangChain's LCEL (LangChain Expression Language) is more flexible for arbitrary composition; LlamaIndex's abstractions optimize specifically for retrieval and querying structured knowledge.

**Use RAGFlow when** document parsing quality matters more than pipeline flexibility. RAGFlow's DeepDoc subsystem (OCR, layout recognition, table structure recognition) handles complex PDFs that LlamaIndex's local parsers mangle. RAGFlow is heavier infrastructure (Docker, MySQL, Elasticsearch, Redis, MinIO) but produces better chunks from difficult documents.

**Use [LangGraph](../projects/langgraph.md) when** your primary need is stateful, cyclic agent workflows with human-in-the-loop steps. LangGraph's graph-based execution model handles complex agent state more explicitly than LlamaIndex's `Workflow` system.

**Use [DSPy](../projects/dspy.md) when** you want to optimize prompt pipelines automatically rather than handcraft retrieval strategies. DSPy treats prompt optimization as a compilation problem; LlamaIndex treats it as a configuration problem.

**Use LlamaIndex when** you want code-level control over a well-structured RAG pipeline, need broad connector coverage, and have engineering capacity to provision and operate a vector store. It suits teams that want to compose retrieval logic in Python without building everything from scratch.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md)
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md)
- [Agentic RAG](../concepts/agentic-rag.md)
- [Vector Database](../concepts/vector-database.md)
- [Knowledge Graph](../concepts/knowledge-graph.md)
- [BM25](../concepts/bm25.md)
- [RAPTOR](../projects/raptor.md)
- [Prompt Compression](../concepts/prompt-compression.md)

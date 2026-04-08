---
url: 'https://github.com/infiniflow/ragflow'
type: repo
author: infiniflow
date: '2026-04-04'
tags:
  - knowledge-bases
  - context-engineering
  - agent-memory
key_insight: >-
  RAGFlow is a production-grade RAG engine that invests deeply in document
  understanding before retrieval — its DeepDoc subsystem uses OCR, layout
  recognition, and table structure recognition to accurately parse complex
  documents, then applies template-based chunking strategies (naive, book,
  paper, resume, QA, etc.) combined with RAPTOR hierarchical summarization and
  GraphRAG knowledge graphs to build multi-layered retrieval that finds needles
  in unlimited-token haystacks.
stars: 14900
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - CLAUDE.md
    - deepdoc/README.md
    - deepdoc/parser/pdf_parser.py
    - deepdoc/parser/markdown_parser.py
    - deepdoc/vision/layout_recognizer.py
    - deepdoc/vision/ocr.py
    - rag/app/naive.py
    - rag/raptor.py
    - rag/graphrag/general/index.py
    - rag/graphrag/general/graph_extractor.py
    - rag/graphrag/entity_resolution.py
    - rag/nlp/__init__.py
    - rag/flow/__init__.py
    - api/apps/kb_app.py
    - memory/services/query.py
  analyzed_at: '2026-04-04'
  original_source: repos/infiniflow-ragflow.md
relevance_scores:
  topic_relevance: 7
  practitioner_value: 8
  novelty: 6
  signal_quality: 8
  composite: 7.3
  reason: >-
    RAGFlow is a production-grade RAG engine with deep document understanding
    (DeepDoc, GraphRAG, RAPTOR) that is directly relevant to the Knowledge
    Substrate pillar and partially to context engineering, with a detailed
    architecture description making it highly actionable for practitioners
    building knowledge systems.
---

## Architecture Overview

RAGFlow is a full-stack, production-grade Retrieval-Augmented Generation engine with an async Python backend (Quart, Flask-compatible), React/TypeScript frontend (Vite, Ant Design, Tailwind), and a three-tier microservices architecture deployed via Docker. It is the most infrastructure-heavy system in this research set, requiring MySQL/PostgreSQL, Elasticsearch (or Infinity/OpenSearch/OceanBase as alternatives), Redis, MinIO, and multiple application servers including Go-based performance services and C++ tokenizers.

The three tiers divide the system cleanly:

**Frontend/API Tier**: Quart (async Flask-compatible) handles user interactions, chat orchestration, and streaming responses. REST APIs cover user/tenant management (with OAuth2, OIDC authentication), dataset operations, document management, chat interfaces, and agent workflows. A Go backend on port 9384 handles performance-sensitive operations like search optimization and NLP tasks.

**Asynchronous Task Tier**: Background workers decouple document ingestion from the API layer. Parse tasks register in MySQL with messages sent to Redis Streams. Workers handle parsing, OCR, embedding generation, and knowledge graph construction asynchronously, enabling the system to process large document volumes without blocking the API.

**Persistence Tier**: Polyglot storage with clear separation of concerns:
- Relational (MySQL/PostgreSQL) for metadata, user configurations, and task state
- Document/Vector engines (Elasticsearch, Infinity, OpenSearch, OceanBase) for hybrid search with pluggable backend via factory pattern
- Object storage (MinIO/S3/OSS) for raw file persistence
- Cache/Queue (Redis) for task distribution and session caching

The architecture divides into four major subsystems:

### 1. DeepDoc -- Document Understanding

The `deepdoc/` module is RAGFlow's primary differentiator. It handles document parsing through two complementary systems:

**Vision pipeline** (`deepdoc/vision/`):
- **OCR** (`ocr.py`) -- Text extraction from images and scanned PDFs. Uses HuggingFace-hosted models with ONNX runtime. Supports multiple languages.
- **Layout Recognition** (`layout_recognizer.py`) -- 10 layout component types: Text, Title, Figure, Figure caption, Table, Table caption, Header, Footer, Reference, Equation. Uses XGBoost models for classification.
- **Table Structure Recognition** (`table_structure_recognizer.py`) -- 5 labels: Column, Row, Column header, Projected row header, Spanning cell. Reassembles table content into natural language sentences comprehensible by LLMs.
- **Table Auto-Rotation** -- For scanned PDFs with rotated tables, evaluates 4 rotation angles (0, 90, 180, 270 degrees), selects highest OCR confidence, then re-performs OCR on correctly oriented image.

**Parser pipeline** (`deepdoc/parser/`):
- **PDF Parser** (`pdf_parser.py`) -- The most complex parser. `RAGFlowPdfParser` class uses pdfplumber for extraction, OCR for scanned content, layout recognition for structure detection, and XGBoost/KMeans clustering for layout classification. Outputs: text chunks with page/position metadata, tables as both cropped images and natural language, figures with captions.
- **Alternative PDF parsers**: MinerU (`mineru_parser.py`), Docling (`docling_parser.py`), PaddleOCR, TCADP
- **Format-specific parsers**: DOCX, EPUB, Excel, PPT, HTML, Markdown, JSON, TXT
- **Vision figure parser**: Multi-modal LLM-based figure description (`figure_parser.py`)
- **Resume parser**: Structured extraction of ~100 fields from resumes (partially proprietary)

### 2. RAG Pipeline -- Chunking, Retrieval, Ranking

The `rag/` module implements the retrieval pipeline:

**Chunking strategies** (`rag/app/`):
RAGFlow's chunking is template-based -- different document types get different strategies. This is a core differentiator from frameworks like LlamaIndex, which provide generic chunking utilities. The template approach produces better chunks for structured documents but requires document type classification:
- **Naive** (`naive.py`) -- Default chunking. Uses DeepDoc output, applies section-based splitting, handles images, tables, and text segments with configurable token limits. Supports multiple PDF parsing backends (deepdoc, MinerU, Docling, PaddleOCR).
- **Book** (`book.py`) -- Chapter/section-aware splitting that respects document hierarchy and section boundaries
- **Paper** (`paper.py`) -- Academic paper structure (abstract, sections, references)
- **Resume** (`resume.py`) -- Field extraction to structured data
- **QA** (`qa.py`) -- Question-answer pair extraction
- **Table** (`table.py`) -- Tabular data handling
- **Laws** (`laws.py`) -- Legal document structure preservation
- **Manual** (`manual.py`) -- Technical manual structure
- **Presentation** (`presentation.py`) -- Slide deck parsing
- **Picture** (`picture.py`) -- Image description via multi-modal LLM
- **Audio** (`audio.py`) -- Speech-to-text transcription
- **Email** (`email.py`) -- Email thread parsing
- **One** -- Single-chunk mode for short documents
- **Tag** -- Tag-based organization
- **Knowledge Graph** -- GraphRAG-specific entity extraction mode

Each chunking strategy inherits from the common tokenization utilities in `rag/nlp/__init__.py` which provides:
- Custom tokenizer (`rag_tokenizer`) with CJK character handling, number normalization (Chinese/Arabic/Roman), and multi-codec detection (60+ character encodings)
- `naive_merge()` -- Merges text sections respecting token limits
- `tokenize_chunks()` -- Splits chunks at sentence boundaries
- `tokenize_table()` -- Table-specific tokenization
- Question bullet detection recognizing numbered/lettered patterns in Chinese and English

**RAPTOR** (`rag/raptor.py`):
`RecursiveAbstractiveProcessing4TreeOrganizedRetrieval` -- A hierarchical summarization system that RAGFlow integrates from the 2024 RAPTOR paper. The implementation:
1. Embed all chunks using the configured embedding model
2. Apply UMAP dimensionality reduction
3. Cluster with Gaussian Mixture Models (GMM), finding optimal cluster count via BIC
4. For each cluster, summarize the contained chunks using an LLM
5. Recursively apply the same process to summaries, building a tree of progressively more abstract representations
6. Flatten the tree structure for retrieval -- both original chunks and generated summaries are sent to the database to establish full-text and vector indexes

RAGFlow chose the flattened tree structure approach (vs. hierarchical traversal) because it integrates naturally with the existing multi-recall retrieval pipeline. RAPTOR is disabled by default because it consumes significant additional token quotas during ingestion. The implementation includes LLM response caching (`get_llm_cache`/`set_llm_cache`), embedding caching, async execution with semaphores (`chat_limiter`), retry logic (3 attempts with backoff), and task cancellation checking.

**TreeRAG** (2025 evolution):
RAGFlow's TreeRAG technology extends RAPTOR by decoupling retrieval into two distinct stages with different text granularities:
- **Search phase**: Uses fine-grained text units for precise identification of relevant content from large datasets
- **Retrieve phase**: Dynamically aggregates and expands into larger, coherent context fragments based on search results

The implementation uses an offline LLM analysis to construct hierarchical tree-structured document summaries (Chapter > Section > Subsection > Paragraph). During online retrieval, the system performs similarity search on finest-grained fragments, then navigates the tree structure to automatically combine semantically related content into logically complete materials. This solves the fundamental RAG tension between semantic matching (requiring smaller chunks) and context completeness (requiring larger chunks).

**GraphRAG** (`rag/graphrag/`):
Knowledge graph construction and querying, enhanced from Microsoft's original GraphRAG with key improvements:
1. **Entity extraction** -- LLM-based extraction of entities and relationships from chunks. Two extractors: `GeneralKGExt` (full entity/relationship extraction) and `LightKGExt` (lighter weight). Users can designate entity types for extraction (organization, person, location, etc.).
2. **Entity resolution** (`entity_resolution.py`) -- Merge duplicate entities using embedding similarity. This addresses a critical limitation of Microsoft's original GraphRAG, which treated synonyms as distinct entities (e.g., "2024" vs "Year 2024"). RAGFlow leverages LLMs as implicit knowledge graphs for deduplication.
3. **Token optimization** -- The original GraphRAG sent all documents to the LLM multiple times. RAGFlow ensures documents are submitted to the LLM only once, significantly reducing costs. Planned support for smaller models like Triplex (fine-tuned Phi-3, 3B parameters).
4. **Community detection** -- Leiden algorithm via NetworkX for graph clustering
5. **Community reports** -- LLM-generated summaries of each community
6. **Mind maps** -- Visual graph representations for debugging and analysis
7. **Graph storage** -- Persisted in Elasticsearch alongside chunk data

The GraphRAG pipeline runs per-document with distributed locking (`RedisDistributedLock`) to handle concurrent graph modifications. Current limitation: knowledge graph generation operates at the document level only -- the system cannot yet link graphs across multiple documents within a knowledge base due to memory and computational constraints.

**Advanced RAG** (`rag/advanced_rag/`):
- Tree-structured query decomposition retrieval -- Breaks complex queries into sub-queries, retrieves for each, then synthesizes

### 3. Agent System -- Agentic RAG

The `agent/` module provides a visual workflow orchestration system (Canvas) that represents RAGFlow's evolution from pure RAG engine to agentic platform (introduced v0.8.0, major upgrade v0.20.0):

**Canvas Engine**: A drag-and-drop workflow builder using a DSL (Domain-Specific Language) for component definitions. Supports graph-based task orchestration with nodes and edges defining application workflow and logic. Key architectural decision: RAGFlow 0.20 enables simultaneous orchestration of both Workflow (deterministic, human-defined tasks) and Agentic Workflow (LLM-driven automation) on a single canvas.

**Components**: Built-in components include LLM nodes for inference, retrieval nodes connecting to knowledge bases, categorize, generate, rewrite, keyword extract, scoring operators (assess retrieval relevance), query analysis components (classify intent), tool/function calling nodes for external integration, conditional routing for logic branching, and memory nodes for context persistence.

**Multi-Agent Support**: Multiple agents can coexist on a single canvas. v0.20.0 introduced task-based Agent mode (does not require a conversation trigger), enabling both conversational and task-based agents on the same canvas. Deep Research workflows follow: Decomposition & Planning > Multi-Source Retrieval > Reflection & Refinement > Iteration & Output.

**Memory System** (`memory/`): Three persistent memory types:
- Raw Memory: Direct conversation history storage
- Semantic Memory: Vector-embedded key facts and insights
- Episodic Memory: Contextual event sequences
Memory integrates with the retrieval system, enabling agents to reference past interactions.

**External Tools**: Tavily search, Wikipedia, SQL execution, code executor (sandboxed via gVisor), web search, and collaboration with third-party tools.

### 4. Ingestion Pipeline (PTI Pattern)

RAGFlow v0.21.0 formalized the Parse-Transform-Index pipeline (equivalent to ETL for unstructured data), making it orchestratable:
- **Parse**: Format-specific extraction via DeepDoc from PDFs, documents, and images
- **Transform**: LLM-driven semantic enhancement -- summaries, entity extraction, relationship mapping, keyword generation, potential question generation
- **Index**: Building efficient hybrid indices supporting vector, keyword, and metadata-based retrieval

Users can create varied data ingestion pipelines with each pipeline applying different strategies to connect a data source to the final index. Supported data source connectors: Confluence, S3, Notion, Discord, Google Drive.

### 5. API and Frontend

- Quart async REST API (`api/apps/`) with modular blueprints for knowledge bases, documents, dialogs, files, canvas, and system health
- React/TypeScript frontend with Vite bundling, Ant Design + Tailwind CSS, Zustand state management
- Python SDK (`sdk/python/`) for programmatic access to all API endpoints
- Multi-language build: Python 3.12 core, Go performance services, C++ tokenizers, UV package manager for dependency resolution

## Core Mechanism

### Document Understanding Pipeline

RAGFlow's core thesis is "quality in, quality out" -- the quality of RAG depends fundamentally on how well documents are parsed and chunked. The pipeline:

1. **Upload** -- Document uploaded via API, stored in MinIO object storage
2. **Queueing** -- Parse tasks register in MySQL with messages sent to Redis Streams
3. **Parsing** -- DeepDoc processes the document asynchronously:
   - For PDFs: Layout recognition identifies regions (text, table, figure, etc.)
   - OCR extracts text from images and scanned content
   - Tables get structure recognition and are converted to natural language
   - Figures get captions extracted or multi-modal LLM descriptions
4. **Chunking** -- Template-based strategy applied based on document type
5. **Embedding** -- Chunks embedded using configured embedding model (provider-agnostic via LLMBundle)
6. **Indexing** -- Chunks and embeddings stored in document engine (Elasticsearch, Infinity, OpenSearch, or OceanBase)
7. **Optional post-processing**:
   - RAPTOR hierarchical summarization (disabled by default due to token cost)
   - TreeRAG hierarchical tree construction
   - GraphRAG entity/relationship extraction with deduplication
   - Cross-language embedding for multilingual queries
   - Semantic enrichment: summaries, keywords, entities, potential questions

### Retrieval Pipeline

At query time:
1. **Query rewriting** -- Optional query expansion/rewriting via LLM
2. **Multi-recall** -- Multiple retrieval strategies run in parallel:
   - Dense retrieval (embedding similarity via document engine)
   - Sparse retrieval (BM25 keyword matching via document engine)
   - GraphRAG (knowledge graph traversal for multi-hop questions)
   - RAPTOR/TreeRAG (hierarchical tree search at multiple granularities)
3. **Fused re-ranking** -- Results from all retrieval methods merged and re-ranked using cross-encoders or LLM-based reranking
4. **Context assembly** -- Top chunks assembled with traceable citations to source documents and page locations
5. **Generation** -- LLM generates answer with grounded citations. Supports streaming responses.

### Document Engine Abstraction

RAGFlow supports multiple search backends via factory pattern, each implementing the same interface:
- **Elasticsearch** (default): Distributed architecture with ARM64 support. Combines `MatchTextExpr` (BM25) with `MatchDenseExpr` (vector) queries.
- **Infinity**: Purpose-built RAG engine optimized for low-latency retrieval. Maps RAG-specific fields to specialized full-text indices.
- **OceanBase**: Distributed relational database with vector capabilities. SQLAlchemy + PyObVector. Supports both original and tokenized content full-text search.
- **OpenSearch**: AWS-compatible alternative to Elasticsearch.

## Competitive Positioning

RAGFlow occupies a distinct niche in the RAG framework landscape:

**vs. LlamaIndex**: LlamaIndex is a developer framework providing maximum flexibility with 150+ data connectors and granular control over every pipeline component. RAGFlow is a turnkey engine with a visual workflow builder and no-code RAG pipelines. LlamaIndex excels at custom retrieval strategies; RAGFlow excels when document parsing quality is paramount -- its layout-aware parsing handles complex PDFs with tables, figures, and multi-column layouts that simpler parsers struggle with.

**vs. LangChain**: LangChain is an orchestration framework for building LLM applications with chains and agents. RAGFlow is a specialized RAG engine with deep document understanding built in. LangChain provides flexibility to compose arbitrary LLM workflows; RAGFlow provides a production-ready system optimized specifically for document retrieval.

**vs. Haystack**: Both are production-focused, but RAGFlow's DeepDoc vision pipeline gives it an edge on complex document types. Haystack's strength is its modular pipeline abstraction.

**vs. Lighter alternatives (napkin, code-review-graph)**: RAGFlow is the opposite extreme -- heavy infrastructure (Docker, MySQL, ES, Redis, MinIO, 16GB+ RAM) vs. zero-dependency local-first approaches. The tradeoff is production scalability and multi-tenant support vs. simplicity and portability.

## Design Tradeoffs

### Heavy Infrastructure vs. Zero-Dependency

RAGFlow requires Docker with MySQL, Elasticsearch, Redis, and MinIO. The tradeoff:
- **Pros**: Production scalability, multi-tenant support, persistent storage, distributed processing, authentication (OAuth2/OIDC), RBAC
- **Cons**: 16GB+ RAM, 50GB+ disk, Docker Compose required, complex deployment, cannot run locally without containers

### Template-Based Chunking vs. Universal Chunking

Instead of one chunking strategy for all documents, RAGFlow has 15+ specialized chunking templates. A February 2026 benchmark across 50 academic papers found that recursive 512-token splitting achieved 69% accuracy, 15 points above semantic chunking on the same corpus, because semantic chunking's small average fragment size (43 tokens) destroyed context. RAGFlow's template approach avoids this by using document-type-specific boundaries (chapters, sections, legal articles, slide boundaries) rather than fixed token counts. The tradeoff: accuracy at the cost of requiring document type classification and maintaining multiple parsing strategies.

### DeepDoc Investment vs. Simple Text Extraction

The DeepDoc vision pipeline (OCR + layout recognition + table structure recognition) is a major engineering investment. It handles complex cases (scanned PDFs, rotated tables, multi-column layouts, figures with captions) that simple text extraction misses. Multi-modal document processing includes tensor quantization and token pruning strategies for multimodal retrieval. The tradeoff: accuracy at the cost of complexity and GPU-dependent model inference.

### RAPTOR + GraphRAG + Dense/Sparse as Complementary

RAGFlow runs multiple retrieval strategies in parallel and fuses results. This maximizes recall but at the cost of:
- Ingestion latency (RAPTOR clustering + GraphRAG extraction are expensive)
- Storage overhead (embeddings + graph + hierarchical summaries)
- Query latency (multiple retrieval calls + re-ranking)

The philosophy is: for production systems serving many users, ingestion cost is amortized while retrieval quality directly impacts user experience.

### From RAG to Context Engine

RAGFlow's roadmap reveals a shift from isolated retrieval toward a unified "Context Engine" paradigm integrating three subsystems:
1. **Domain Knowledge Retrieval**: Traditional RAG over enterprise documents
2. **Memory Systems**: Retrieving dynamic interaction logs and conversation history
3. **Tool Retrieval**: Semantic search over tool descriptions and usage guides for Agent tool selection

This positions RAGFlow as infrastructure for context assembly, not just document Q&A.

## Failure Modes & Limitations

1. **OCR quality dependence** -- For scanned PDFs, the entire pipeline depends on OCR accuracy. Poor scans, unusual fonts, or complex layouts can produce garbled text that propagates through chunking and embedding.

2. **Table parsing complexity** -- Table structure recognition handles simple tables well but struggles with heavily nested tables, spanning cells across many rows/columns, and tables with visual formatting that doesn't translate to structure.

3. **RAPTOR clustering instability** -- GMM clustering with UMAP dimensionality reduction is sensitive to hyperparameters. Small changes in embedding quality or cluster count can significantly alter the summary tree structure.

4. **GraphRAG scope limitation** -- Knowledge graph generation operates per-document only. The system cannot yet link graphs across multiple documents in a knowledge base due to memory and computational constraints. This limits multi-hop reasoning across documents.

5. **LLM extraction reliability** -- Both RAPTOR summaries and GraphRAG entity extraction depend on LLM quality. The system includes retry logic and caching, but fundamentally unreliable LLM outputs propagate into the knowledge structure.

6. **CJK-specific complexity** -- Significant code handles Chinese/Japanese/Korean text (character segmentation, number normalization, encoding detection). Non-CJK deployments carry this complexity without benefit.

7. **Resource consumption** -- The full stack (4 CPU, 16GB RAM, 50GB disk minimum) makes it impractical for individual developers or small projects. The multi-container Docker deployment creates operational overhead.

8. **Chunking strategy selection** -- The user must choose the correct chunking template for each document type. Misclassification (using "naive" for a paper, or "paper" for a manual) degrades chunk quality. The orchestratable ingestion pipeline (v0.21.0) helps by allowing different strategies per pipeline.

9. **Overlap effectiveness uncertainty** -- A January 2026 analysis found that chunk overlap provided no measurable benefit on recall when using SPLADE retrieval; it only increased storage and embedding costs. Overlap matters most with dense retrieval on long-context queries. RAGFlow's naive chunking uses configurable overlap, but optimal settings are workload-dependent.

## Integration Patterns

### REST API

Quart-based async API with modular blueprints. Knowledge base management (`kb_app.py`), document upload/processing (`document_app.py`), chat/conversation (`dialog_app.py`), and agent workflows (`canvas_app.py`). Supports streaming responses for real-time generation.

### Agent Workflows (Canvas)

The canvas system allows visual workflow construction with drag-and-drop components. Supports both deterministic Workflow and LLM-driven Agentic Workflow on the same canvas, with multi-agent co-orchestration. Deep Research agent capability follows decomposition > multi-source retrieval > reflection > iteration patterns.

### Data Source Connectors

Supports data synchronization from Confluence, S3, Notion, Discord, Google Drive. The orchestratable ingestion pipeline (v0.21.0) enables per-source ingestion strategies.

### Deployment Options

Docker Compose orchestration with configurable profiles based on `DOC_ENGINE` (Elasticsearch vs. Infinity) and `DEVICE` (CPU vs. GPU). Includes sandboxed code execution via gVisor. Available as Azure Marketplace VM for instant deployment. Multi-stage Docker builds separate build-time tools from runtime.

Default ports: Web UI (80), Python API (9380), Go API (9384), Admin (9381), Elasticsearch (1200), MySQL (5455), MinIO (9000-9001), Redis (6379).

### SDK and Authentication

Python SDK for programmatic access. Authentication supports email/password, OAuth2 (GitHub), and OIDC. Multi-tenant RBAC for enterprise deployments.

## Benchmarks & Performance

RAGFlow doesn't publish standardized retrieval benchmarks in the repository, but the benchmark infrastructure exists in `test/benchmark/` with dataset upload/parsing benchmarks, retrieval latency measurements, chat quality evaluation, and multi-metric reporting.

Build/parsing performance characteristics:
- PDF parsing: Depends on page count and complexity. Layout recognition + OCR per page.
- RAPTOR: O(N log N) where N = number of chunks (recursive clustering). Disabled by default due to token cost.
- GraphRAG: LLM calls per chunk for entity extraction (single-pass, improved from Microsoft's multi-pass). Graph merge and community detection.
- TreeRAG: Offline hierarchical tree construction, online fine-to-coarse retrieval
- Query latency: Multiple parallel retrieval calls + re-ranking + LLM generation

The README claims to find "needle in a data haystack of literally unlimited tokens" -- this is enabled by the multi-layered retrieval (dense + sparse + graph + RAPTOR/TreeRAG) which can surface relevant chunks from very large document collections.

## Implications for Meta-KB

RAGFlow represents the "production infrastructure" end of the knowledge base spectrum. Its key lessons for meta-kb:

1. **Document understanding matters** -- The DeepDoc investment shows that parsing quality is the foundation. For meta-kb, this means the ingestion pipeline's ability to accurately extract content from diverse sources directly determines compilation quality.

2. **Template-based chunking is effective** -- Different source types benefit from different chunking strategies. Meta-kb already does this implicitly (different scrapers for Twitter, GitHub, arXiv, articles), but the principle could extend to compilation.

3. **Multi-layered retrieval** -- Combining BM25 (keyword), dense (embedding), graph (entity relationships), and hierarchical (RAPTOR/TreeRAG) retrieval maximizes recall. Meta-kb's wiki compilation could benefit from consulting source material through multiple retrieval strategies.

4. **TreeRAG's two-phase approach** -- Decoupling search (fine-grained) from retrieve (coarse, contextual) solves the chunk-size dilemma. This is directly applicable to meta-kb: search at the paragraph level, but retrieve entire sections for compilation context.

5. **GraphRAG for entity networks** -- Knowledge graph construction from text could enrich meta-kb's wiki with entity relationship maps: which tools relate to which concepts, which authors cite which papers, which approaches solve which problems. The per-document limitation is relevant -- meta-kb would need cross-source graph merging.

6. **Context Engine paradigm** -- RAGFlow's evolution from RAG engine to context engine (integrating domain knowledge + memory + tool retrieval) previews where knowledge bases are heading: not just storing information but dynamically assembling context for diverse agent tasks.

However, RAGFlow's infrastructure requirements make it unsuitable as a direct foundation for meta-kb's local-first, file-based approach. The algorithmic techniques (RAPTOR, TreeRAG, GraphRAG, template-based chunking, hybrid retrieval) are more transferable than the infrastructure patterns.

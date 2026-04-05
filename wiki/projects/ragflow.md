---
entity_id: ragflow
type: project
bucket: knowledge-bases
sources:
  - repos/infiniflow-ragflow.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
  - deep/repos/infiniflow-ragflow.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:30:57.652Z'
---
# RAGFlow

## What It Does

RAGFlow is an open-source RAG engine built around the premise that retrieval quality depends on parsing quality. Where most RAG systems treat document ingestion as a preprocessing step, RAGFlow makes it the central concern. The engine handles the full pipeline from raw documents through chunking, retrieval, reranking, and answer generation, with an agentic workflow layer on top.

Its differentiating bet: fix the garbage-in problem at the source rather than compensating for it downstream with cleverer retrieval.

[Source](../../raw/repos/infiniflow-ragflow.md)

## Architectural Core

### DeepDoc: The Document Understanding Layer

RAGFlow's `deepdoc/` module is the core technical differentiator. Standard RAG pipelines extract text via naive PDF parsers and chunk by token count, destroying layout, tables, and reading order in the process. DeepDoc uses a computer vision pipeline:

- **Layout recognition**: Identifies regions (text blocks, tables, figures, headers) as bounding boxes using a trained detection model
- **OCR**: Processes scanned pages and embedded images
- **Table structure recognition**: Recovers row/column relationships rather than extracting tables as flat text
- **Multi-modal understanding**: From March 2025, multi-modal models interpret images within PDFs and DOCX files

The output is structured content that preserves document semantics before chunking begins.

### Template-Based Chunking

Rather than one-size-fits-all token chunking, RAGFlow offers format-specific templates: papers follow different chunking logic than legal filings, which differ from spreadsheets. Each template encodes domain knowledge about where meaningful boundaries exist in that content type. This lets users select the chunking strategy appropriate to their corpus rather than tuning chunk sizes.

### Multi-Recall Retrieval

The retrieval stage combines:
- Dense vector search
- BM25 sparse search  
- Knowledge graph traversal (GraphRAG integration)
- RAPTOR-style hierarchical summarization

Results feed into a fused reranking step before passing to the LLM. The system decouples search from retrieve: fine-grained search locates relevant areas, then larger coherent context is retrieved.

### Infrastructure Stack

The `docker-compose.yml` orchestrates: MySQL, MinIO (object storage), Redis, and Elasticsearch (default) or Infinity (alternative). This is a substantial dependency footprint for a self-hosted deployment.

### Agentic Workflow Layer

Added in August 2025, the agentic layer supports visual workflow composition, MCP integration, Python/JavaScript code execution (sandboxed via gVisor), and persistent agent memory. Data sources include Confluence, S3, Notion, Discord, and Google Drive.

## Key Numbers

**77,126 GitHub stars, 8,673 forks** as of the source data. [Source](../../raw/repos/infiniflow-ragflow.md) These are self-reported from the repository. The star count indicates substantial community interest; independent retrieval quality benchmarks comparing DeepDoc parsing to alternatives are not present in the available source material.

Minimum hardware: 4 CPU cores, 16GB RAM, 50GB disk, Docker 24.0+. GPU acceleration optional for DeepDoc tasks.

## Strengths

**Parsing complex documents**: DeepDoc's layout-aware approach handles scanned PDFs, multi-column layouts, and tables where text-extraction-based parsers produce garbled or reordered content. This matters most for enterprise document corpuses with financial filings, research papers, or legacy scanned archives.

**Observability during ingestion**: Chunk visualization lets users inspect and intervene before documents go into the index. Most RAG systems are black boxes at ingestion time.

**Breadth of retrieval strategies**: Few open-source systems combine BM25, dense, graph, and hierarchical retrieval with fused reranking in one deployable package.

**Source tracing**: Answers include traceable citations back to specific chunks, reducing hallucinations that are undetectable in context-window-only approaches.

**Heterogeneous formats**: Word, PowerPoint, Excel, images, HTML, structured data, scanned documents all handled within one system.

## Critical Limitations

**Concrete failure mode**: DeepDoc's layout recognition model is trained on a particular distribution of document types. Unusual layouts (dense multi-column academic preprints, non-standard table formats, rotated text, handwriting) will produce incorrect bounding box detection, which then contaminates every downstream step. Unlike parsing errors from naive text extraction (which are often obviously malformed), DeepDoc errors can look plausible while silently misattributing content between sections or dropping rows from tables. There is no validation step that catches structural detection failures before they enter the index.

**Unspoken infrastructure assumption**: The default stack requires Elasticsearch, which itself requires `vm.max_map_count >= 262144` and carries significant memory overhead. Organizations running RAGFlow alongside other Elasticsearch workloads must manage resource contention. The Infinity alternative is available but not officially supported on ARM64, ruling it out for Apple Silicon and many cloud configurations. Teams expecting a lightweight deployment will encounter a heavy infrastructure requirement that the headline documentation understates.

## When Not to Use It

**Avoid RAGFlow when**:
- Your documents are already clean, well-structured plain text or markdown. DeepDoc's overhead adds cost without benefit; simpler chunking with good retrieval works fine.
- You need ARM64 Docker images. The project currently builds only for x86, and the ARM64 workaround requires building from source.
- You need real-time document updates. Ingestion pipelines are batch-oriented; there is no incremental index updating as documents change.
- Your team cannot operate a multi-service Docker stack (MySQL, MinIO, Redis, Elasticsearch) in production. The operational burden is non-trivial.
- You need embedding models bundled in a small image. As of v0.22.0, only the slim image ships (no bundled embeddings), so external embedding services are required.

## Unresolved Questions

The documentation does not address:

- **Parsing quality metrics**: No published benchmarks on DeepDoc accuracy versus alternatives (MinerU, Docling, commercial parsers) on standardized corpora. The claim of superior document understanding is unverified by independent evaluation.
- **Cost at scale**: How does retrieval latency and cost scale with corpus size? The multi-recall approach runs multiple retrieval strategies per query; the overhead at 10M+ chunks is undocumented.
- **Conflict resolution in multi-recall**: When BM25 and dense search return contradictory relevance signals, how does the fusion step weight them? The reranking mechanism is not described in available documentation.
- **Governance**: InfiniFlow is the commercial entity behind RAGFlow. The relationship between the open-source project and any commercial cloud offering is not spelled out, including which features may eventually become cloud-only.
- **GraphRAG quality**: GraphRAG integration was added as a feature, but entity extraction quality depends heavily on LLM choice and domain. No guidance on when graph retrieval helps versus hurts.

## Alternatives

**[LlamaIndex](../projects/llamaindex.md) or LangChain** when you want a framework rather than an opinionated system, and your team will write retrieval logic rather than configure it. Better when your document corpus is already clean.

**PageIndex** when your documents are structured (financial filings, reports with tables of contents) and you want reasoning-based navigation rather than similarity search. PageIndex achieves 98.7% on FinanceBench by treating retrieval as a tree traversal problem. [Source](../../raw/repos/vectifyai-pageindex.md) RAGFlow and PageIndex are architecturally complementary: RAGFlow's DeepDoc could parse documents that PageIndex then indexes as navigable trees.

**Elasticsearch or OpenSearch with a custom embedding pipeline** when you already operate this infrastructure and want retrieval without the full RAGFlow stack.

**Commercial alternatives (Azure AI Search, AWS Kendra)** when operational burden is the primary constraint and document parsing quality is the primary requirement. RAGFlow's value proposition weakens when managed services handle infrastructure.

Use RAGFlow when: your corpus contains scanned documents, complex PDFs, or mixed-format enterprise content; your team can operate the Docker stack; and you want a complete, observable pipeline rather than composing components yourself.

## Related Concepts

Retrieval-Augmented Generation

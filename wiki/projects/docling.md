---
entity_id: docling
type: project
bucket: knowledge-substrate
abstract: >-
  Docling is IBM's document parsing library that converts PDFs, DOCX, PPTX, and
  other formats into structured Markdown/JSON for RAG ingestion, differentiating
  via layout-aware ML models and native LlamaIndex/LangChain integration.
sources:
  - repos/infiniflow-ragflow.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/infiniflow-ragflow.md
related: []
last_compiled: '2026-04-08T03:05:03.186Z'
---
# Docling

## What It Does

Docling converts complex documents — PDFs with multi-column layouts, tables, figures, and mixed content — into structured Markdown or JSON suitable for [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines. IBM Research open-sourced it in late 2024 as a response to the persistent problem of document ingestion quality in RAG: garbage in, garbage out.

The key differentiator is that Docling runs actual ML models for layout analysis and table structure recognition rather than relying on simple text extraction heuristics. It understands *what* a document region is (title, body text, table, figure, header, footer) before deciding how to serialize it.

**GitHub**: ~30,000 stars (self-reported at time of writing). Apache-2.0 licensed, maintained by IBM Research.

---

## Core Mechanism

### Document Understanding Pipeline

Docling's pipeline runs in `docling/pipeline/standard_pdf_pipeline.py`. For PDFs, the sequence is:

1. **PDF rendering** — Pages rendered to images using `pypdfium2`
2. **Layout analysis** — `DocLayNet` model (a YOLOv8-based detector trained on IBM's DocLayNet dataset with ~80k annotated pages across 11 document categories) classifies each page region into 11 types: Text, Title, Section-header, List-item, Caption, Footnote, Formula, Page-header, Page-footer, Table, Picture
3. **Table structure recognition** — A separate `TableFormer` model (`docling_ibm_models`) reconstructs table cell boundaries and spanning cells from the detected table regions
4. **Text extraction** — `pypdfium2` extracts native text; OCR via `easyocr` or `tesseract` handles scanned pages
5. **Reading order** — A heuristic post-processor sorts detected regions into logical reading order across columns
6. **Serialization** — `DoclingDocument` dataclass exports to Markdown, JSON, HTML, or the internal `DoclingDocument` format

The `DoclingDocument` schema (`docling_core/types/doc/document.py`) is the central data structure. It stores a hierarchical document tree with typed nodes, bounding boxes, confidence scores, and cross-references between figures and their captions.

### Model Artifacts

The two core models ship as HuggingFace model weights (`ds4sd/docling-models`), downloaded on first use. This means the first run requires network access and downloads ~200MB of model files. Subsequent runs are fully offline.

- **Layout model**: `DocLayNet` weights, adapted YOLOv8, runs on CPU by default (CUDA optional)
- **TableFormer**: Encoder-decoder architecture for table cell recovery

Both run via ONNX Runtime, making CPU inference practical without CUDA.

### Format Coverage

Docling handles: PDF, DOCX, PPTX, XLSX, HTML, Markdown, AsciiDoc, and images. Non-PDF formats use format-specific parsers in `docling/backend/` that bypass the vision pipeline and read structure directly from document markup.

### RAG Integration Points

RAGFlow uses Docling as an optional parsing backend (`rag/app/naive.py`, `deepdoc/parser/docling_parser.py`). [LlamaIndex](../projects/llamaindex.md) ships a `DoclingReader` and `DoclingNodeParser` in its integration package. [LangChain](../projects/langchain.md) has a `DoclingLoader`. These integrations make Docling a drop-in replacement for simpler loaders with no other code changes.

---

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| GitHub stars | ~30,000 | GitHub (self-reported) |
| DocLayNet training pages | ~80,000 | IBM Research paper |
| Layout classes | 11 | Model documentation |
| First-run model download | ~200MB | Observed |
| Supported input formats | 8+ | README |

Benchmark accuracy for table structure recognition on PubTables-1M: TableFormer reports ~96% TEDS (Tree-Edit-Distance-based Similarity). This is from the original TableFormer paper (Zhang et al., 2022), which is IBM Research's own work — treat as self-reported.

---

## Strengths

**Accurate table extraction.** TableFormer recovers spanning cells, merged headers, and multi-level column headers that defeat regex-based approaches. For documents where tables carry key information (financial reports, scientific papers, spec sheets), this is the primary reason to use Docling.

**Structured output format.** The `DoclingDocument` JSON preserves spatial relationships, confidence scores, and document hierarchy. Downstream chunkers can split at section boundaries rather than arbitrary token counts, producing better RAG chunks.

**Offline operation after first run.** Once model weights download, Docling runs without network access. Useful for enterprise environments with data residency requirements.

**Native integrations.** Official `docling-haystack`, `docling-llamaindex`, `langchain-docling` packages reduce integration friction to a few lines.

**Active IBM Research backing.** Regular releases, responsive issue tracker, published research on the underlying models.

---

## Critical Limitations

**Concrete failure mode — scanned PDFs with complex layouts.** When a scanned PDF has both a multi-column text layout *and* embedded tables, Docling's reading order heuristics sometimes interleave table cells with surrounding prose. The layout model correctly identifies the table region, but post-processing assigns reading order by x/y position rather than semantic structure. The result is a Markdown output where table content and paragraph text alternate in unpredictable ways. Downstream embedding then mixes contexts that should be separate chunks. This is most common in older academic papers and government documents with non-standard layouts.

**Unspoken infrastructure assumption — CPU memory.** The layout analysis model loads entirely into RAM. Processing a 100-page PDF with complex layouts requires 2-4GB of RAM just for the model inference, on top of the image buffers. Systems that assume document processing is lightweight (many RAG pipeline deployments run ingestion on the same instance as the API server) will hit memory pressure without explicit resource planning.

---

## When NOT to Use It

**Simple text-only PDFs.** If documents are single-column, no tables, no figures — just text — `pypdfium2` or `pdfminer` extract text faster with less overhead. Docling's ML models add latency (5-30 seconds per page on CPU depending on content complexity) with no quality improvement for trivial documents.

**High-volume batch ingestion on tight latency budgets.** CPU inference on the layout model runs roughly 2-10 pages per second depending on hardware. At 100k+ documents, the per-page ML overhead compounds. RAGFlow's own DeepDoc pipeline has similar characteristics and the same constraint. If throughput matters more than layout quality, simpler parsers with GPU-free paths are faster.

**Environments where HuggingFace model downloads are blocked.** The first-run model download requirement breaks air-gapped deployments unless you pre-stage the model weights and configure the HuggingFace cache path explicitly.

**Purely programmatic document formats.** DOCX, PPTX, and XLSX files have explicit structure in their XML. For these, Docling's backend parsers work, but so does `python-docx` directly — with less dependency weight and no ML overhead.

---

## Unresolved Questions

**Reading order accuracy.** The documentation describes a reading order heuristic but does not publish accuracy numbers on multi-column documents. How often does column interleaving occur in the wild? No public benchmark exists for this specific failure mode.

**Long-document chunking strategy.** Docling produces structured output, but the chunking strategy for long documents is left to the integration layer. The `HybridChunker` in `docling-core` uses token limits, but how it interacts with section hierarchy (should a 10,000-token section be split within a subsection or at the subsection boundary?) is not formally specified.

**Governance and maintenance commitment.** IBM Research built this for internal use cases. If IBM's research priorities shift, the maintenance trajectory is unclear. The project has no foundation governance (unlike Apache-incubated projects), and the core model weights are IBM's proprietary training artifacts hosted on HuggingFace.

**Cost at scale.** No published numbers on inference cost per page at production volumes. Teams running millions of pages/month through Docling have not published cost comparisons against commercial alternatives (AWS Textract, Azure Document Intelligence).

---

## Alternatives

**[RAGFlow](../projects/graphrag.md) DeepDoc** — RAGFlow's built-in `deepdoc/` subsystem does the same job (OCR + layout recognition + table structure recognition) with comparable accuracy. Use DeepDoc when you're already running RAGFlow as your RAG engine; use Docling when you need a standalone library that integrates into your own pipeline.

**AWS Textract / Azure Document Intelligence** — Commercial APIs with higher accuracy on complex documents (especially handwriting, forms, receipts) and SLA-backed throughput. Use these when accuracy on edge cases matters more than cost and data residency.

**pdfminer / pypdfium2 + custom chunking** — Zero ML overhead, runs on any hardware, handles text-only PDFs adequately. Use when documents are simple and throughput matters.

**Unstructured.io** — Broader format coverage, hosted API option, commercial support. Use when you need enterprise support contracts or a managed service.

**LlamaIndex's built-in loaders** — Simpler integration, less accurate on complex layouts. Use when you're already in the LlamaIndex ecosystem and documents are not layout-heavy.

**Select Docling when**: documents contain non-trivial tables or multi-column layouts, you need structured JSON output with spatial metadata, you want offline operation without API dependencies, and you have CPU memory headroom for model inference.

---

## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [LlamaIndex](../projects/llamaindex.md)
- [LangChain](../projects/langchain.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Semantic Search](../concepts/semantic-search.md)
- [Vector Database](../concepts/vector-database.md)

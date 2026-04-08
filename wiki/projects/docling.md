---
entity_id: docling
type: project
bucket: knowledge-substrate
abstract: >-
  IBM's open-source document parsing library that converts PDFs, DOCX, HTML, and
  images into structured Markdown/JSON for RAG pipelines, with native chunking
  and metadata preservation built in.
sources:
  - deep/repos/infiniflow-ragflow.md
  - deep/repos/topoteretes-cognee.md
  - repos/infiniflow-ragflow.md
related:
  - docling-project
last_compiled: '2026-04-08T23:22:24.252Z'
---
# Docling

## What It Does

Docling converts documents into machine-readable formats suitable for [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines and knowledge bases. Given a PDF, Word document, HTML page, PowerPoint file, or image, Docling produces structured Markdown or JSON output that preserves document hierarchy, table structure, and figure references — rather than dumping raw text that loses all layout context.

The core differentiator: Docling runs layout analysis and table structure recognition locally using ONNX models, so it handles complex documents (academic papers, financial reports, scanned contracts) without sending content to external APIs. It was built as the document ingestion foundation for IBM's enterprise AI products before being open-sourced in 2024.

## Core Mechanism

Docling's processing pipeline lives in the `docling/pipeline/` directory and follows a consistent structure for each format:

**1. Format detection and backend routing** (`docling/backend/`): Each supported format has its own backend class. `DoclingParseDocumentBackend` handles PDFs using the `docling-parse` C++ library for native PDF parsing. `PyPdfiumDocumentBackend` provides an alternative PDF backend via pdfium. `MsWordDocumentBackend` handles DOCX via python-docx. The `DocumentConverter` class in `docling/document_converter.py` routes incoming files to the correct backend based on extension and MIME type.

**2. Vision pipeline for PDFs** (`docling/models/`): For PDFs, Docling runs two ONNX-based computer vision models:
- `LayoutModel` (`docling/models/layout_model.py`): Detects and classifies page regions into categories — text blocks, titles, tables, figures, lists, page headers/footers, equations. Uses a DocLayNet-trained model distributed via HuggingFace (`ds4sd/docling-models`).
- `TableStructureModel` (`docling/models/table_structure_recognizer.py`): Given a table bounding box from the layout model, reconstructs row/column structure and cell content. Critical for preserving tabular data rather than serializing it as disconnected text fragments.

**3. OCR integration**: When text extraction from the PDF is insufficient (scanned documents, image-heavy PDFs), Docling supports multiple OCR backends: EasyOCR (`docling/models/easyocr_model.py`), Tesseract (`docling/models/tesseract_ocr_model.py`), and RapidOCR. OCR is off by default for text-native PDFs and enabled via `PipelineOptions(do_ocr=True)`.

**4. Document representation** (`docling_core/types/doc/`): Parsed content becomes a `DoclingDocument` — a typed Pydantic model representing the document as a hierarchy of `DocItem` objects (paragraphs, sections, tables, figures, lists). This intermediate representation is format-agnostic and serializable to JSON. From this structure, Docling exports to Markdown (preserving heading levels, table formatting) or JSON.

**5. Chunking** (`docling/chunking/`): Docling includes `HybridChunker` — a chunker that respects document structure boundaries. Rather than splitting on fixed token counts, it treats section boundaries, list items, and table rows as natural split points, then merges or splits further based on a configurable token limit. This produces chunks that don't cut mid-sentence at arbitrary positions.

The pipeline for a typical PDF call:
```python
from docling.document_converter import DocumentConverter
converter = DocumentConverter()
result = converter.convert("report.pdf")
markdown = result.document.export_to_markdown()
```

The `PipelineOptions` class controls which models run, enabling selective disabling of table recognition or OCR for speed/accuracy tradeoffs.

## Key Numbers

- **40,000+ GitHub stars** (self-reported as of early 2025, independently visible on GitHub)
- Processes a typical 10-page research PDF in 15-30 seconds on CPU, depending on whether table recognition and OCR run
- Layout model supports 11 document element classes from the DocLayNet dataset
- Native support for: PDF, DOCX, XLSX, PPTX, HTML, Markdown, AsciiDoc, images (PNG, JPEG, TIFF, BMP)
- Used as an optional parsing backend in RAGFlow (added October 2025) and [LlamaIndex](../projects/llamaindex.md)

Benchmark numbers for accuracy on academic document parsing benchmarks exist in IBM research papers but are not independently reproduced in third-party evaluations at scale.

## Strengths

**Accurate table handling**: The two-stage pipeline (detect bounding box, then recognize structure) produces coherent table representations. Other parsers frequently serialize tables as garbled text; Docling reconstructs row/column relationships and exports them as Markdown tables or structured JSON.

**Structure-aware chunking**: The `HybridChunker` knows that a heading followed by three paragraphs is a logical unit. It won't split a table across two chunks or separate a bullet list's items from its header. This is directly useful for RAG — chunks that preserve context retrieve better than chunks cut at 512-token boundaries regardless of content.

**Local execution**: No external API calls for parsing. The ONNX models run on CPU without GPU requirement. For enterprises with data governance constraints or offline environments, this matters.

**Integration surface**: Docling ships native integrations with [LlamaIndex](../projects/llamaindex.md), [LangChain](../projects/langchain.md), and Haystack. RAGFlow added it as an optional PDF parsing backend (`docling_parser.py`). The output `DoclingDocument` format is documented and stable enough for downstream tooling.

**Format breadth**: Handling XLSX (Excel) and PPTX alongside PDF covers the document types that appear in enterprise knowledge bases but that other parsing tools frequently ignore or handle poorly.

## Critical Limitations

**Concrete failure mode — multi-column academic PDFs with mixed scripts**: Docling's layout model was trained on DocLayNet, which skews toward English-language business and academic documents. Multi-column layouts with CJK characters, right-to-left text (Arabic, Hebrew), or complex mathematical notation frequently produce reading order errors. Text from column two appears interleaved with column one in the output because the layout model's reading order heuristics assume left-to-right, top-to-bottom flow. The output is syntactically valid Markdown but semantically scrambled.

**Unspoken infrastructure assumption**: Docling downloads model weights from HuggingFace on first run (~500MB for the layout and table structure models). In air-gapped environments or Docker containers without internet access, the first conversion call fails with a download error rather than a graceful degradation. The models can be pre-downloaded and pointed to via environment variables, but this is not prominently documented in the quickstart.

## When NOT to Use It

**Simple text-only documents at scale**: If your corpus is clean, text-native PDFs without tables or complex layout — legal contracts drafted in Word, plain reports — running Docling's full vision pipeline is slower than pypdf or pdfminer with negligible accuracy benefit. The layout recognition overhead is the cost of capability you don't need.

**Sub-100ms latency requirements**: Docling is a batch processor. The model loading overhead and per-page inference make it unsuitable for synchronous user-facing requests. If you need to parse a document as part of a real-time response, cache the parsed output or pre-process offline.

**Very large document volumes without GPU**: The ONNX models run on CPU, but processing thousands of PDFs daily at scale will saturate CPU resources. Docling doesn't currently support GPU-accelerated batch inference for the layout model. At high throughput, alternatives like AWS Textract or Azure Document Intelligence (with API cost tradeoffs) may be more practical.

**When you need OCR accuracy on degraded scans**: Docling's OCR integration works for clean scans but delegates quality to the underlying OCR backend (EasyOCR, Tesseract). For heavily degraded, handwritten, or specialty-font documents, dedicated OCR pipelines with fine-tuned models will outperform Docling's plug-in approach.

## Unresolved Questions

**Governance and maintenance continuity**: Docling is maintained by IBM Research. The commit cadence has been active, but there's no public roadmap or community governance structure. IBM's priorities determine what gets fixed and what doesn't — unlike community-governed projects, there's no mechanism for external contributors to influence the roadmap.

**Accuracy numbers at scale**: IBM published benchmark results on DocLayNet test sets, but there's no independent large-scale evaluation of how Docling performs across diverse enterprise document corpora compared to commercial alternatives (AWS Textract, Azure Document Intelligence, Google Document AI). The self-reported numbers look strong on academic benchmarks; real-world enterprise document diversity often reveals different patterns.

**Cost at scale without GPU**: No public data exists on throughput benchmarks for large document processing jobs on typical server hardware. How many concurrent workers are needed to process 10,000 PDFs per hour? What's the RAM ceiling for parallel document processing? The documentation doesn't address production capacity planning.

**Table recognition failure handling**: When the table structure model fails to reconstruct a table correctly, the current behavior is to fall back to raw text extraction from the bounding box. There's no confidence score or signal to downstream systems that a table was parsed poorly. A [RAG](../concepts/retrieval-augmented-generation.md) pipeline has no way to know whether a chunk containing "table data" actually has coherent structure or garbled output.

## Alternatives

**[LlamaIndex](../projects/llamaindex.md) SimpleDirectoryReader / LlamaParse**: Use when you need managed cloud parsing with higher accuracy on complex documents and are willing to pay per page. LlamaParse handles multi-column layouts and complex tables better on degraded inputs. Choose Docling when you need local execution and cost control.

**PyMuPDF (fitz)**: Use when your documents are clean text-native PDFs and you need maximum throughput with minimal dependencies. No vision models, no table recognition, but very fast and accurate text extraction from standard PDFs.

**AWS Textract / Azure Document Intelligence / Google Document AI**: Use when you need production-scale OCR on degraded scans, handwriting recognition, or form field extraction. Cloud APIs with per-page pricing, managed infrastructure, and SLAs. Choose Docling when data sovereignty or offline operation is required.

**Unstructured.io**: Use when you need a single library handling diverse formats (email, HTML, images, PDFs) with preprocessing utilities designed specifically for RAG. Unstructured has a larger format surface and a hosted API option. Docling has better table structure recognition from PDFs specifically.

**marker-pdf**: Use when you specifically need high-quality Markdown output from academic PDFs with minimal configuration. marker-pdf uses different underlying models and may outperform Docling on specific academic document types.

## Relationship to Broader Ecosystem

Docling occupies the document ingestion layer of [RAG](../concepts/retrieval-augmented-generation.md) pipelines — the step that happens before [Semantic Search](../concepts/semantic-search.md) or [Vector Database](../concepts/vector-database.md) storage. Its output feeds chunkers, which feed embedding models, which feed retrieval. The quality of what Docling produces directly caps what downstream retrieval can accomplish: if tables arrive as garbled text, no retrieval system can surface their contents coherently.

RAGFlow's `deepdoc/` module is architecturally similar to Docling — both use layout recognition and table structure models — but RAGFlow's implementation is tightly integrated into its pipeline while Docling is a standalone library. RAGFlow added Docling as an optional alternative backend (`docling_parser.py`) in October 2025, suggesting Docling's output quality is competitive with RAGFlow's native parser for certain document types.

The `HybridChunker` makes Docling relevant to [Context Engineering](../concepts/context-engineering.md) discussions: how context is chunked before retrieval determines what context is available at generation time. Structure-aware chunking is a form of context quality control applied at ingestion.

## Source

[RAGFlow deep analysis](../raw/deep/repos/infiniflow-ragflow.md) — references Docling as an integrated parsing backend added October 2025 (`docling_parser.py`).


## Related

- [Docling](../projects/docling-project.md) — part_of (0.9)

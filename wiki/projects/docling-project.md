---
entity_id: docling-project
type: project
bucket: knowledge-substrate
abstract: >-
  Docling converts complex PDFs, Office files, and HTML into structured
  Markdown/JSON for RAG pipelines, with layout-aware parsing that preserves
  tables and reading order across scanned and native documents.
sources:
  - deep/repos/infiniflow-ragflow.md
  - deep/repos/topoteretes-cognee.md
  - repos/infiniflow-ragflow.md
related:
  - docling
last_compiled: '2026-04-08T23:28:47.289Z'
---
# Docling

## What It Does

Docling is an open-source document parsing library from IBM Research that converts PDFs, DOCX, PPTX, XLSX, HTML, images, and other formats into structured Markdown or JSON for downstream use in RAG pipelines. Its differentiator is layout-aware parsing: rather than extracting raw text in file order, Docling runs AI models to understand page structure, reconstruct reading order across multi-column layouts, and parse table cells into structured data.

It ships as a Python library, a CLI, and an MCP server. RAGFlow added Docling as an optional parsing backend in October 2025 (`deepdoc/parser/docling_parser.py`), positioning it as an alternative to their native DeepDoc pipeline for teams that want a standalone parser they can swap in.

## Core Mechanism

Docling's pipeline runs in `docling/pipeline/` and applies three main model stages to each document page:

**Layout Analysis** — A fine-tuned object detection model classifies page regions into semantic types: text blocks, titles, figures, tables, lists, headers, footers, equations. This runs per-page on rasterized PDF content, producing bounding boxes and region labels before any text extraction occurs.

**Table Structure Recognition (TSR)** — A dedicated model (based on the TableFormer architecture from IBM Research) processes table regions to identify row/column structure, spanning cells, and header rows. It reconstructs the logical grid, not just the visual one. This handles tables that span page breaks or have irregular cell merges.

**Reading Order Recovery** — After regions are classified, a separate pass determines reading order across multi-column layouts, sidebars, and footnotes. The output is an ordered sequence of document elements, not whatever order the PDF renderer encoded them.

Text extraction for native (non-scanned) PDFs uses the embedded PDF text layer. For scanned documents, Docling integrates OCR via EasyOCR or Tesseract (configurable). The final output is a `DoclingDocument` object — a structured representation that serializes to Markdown (preserving table formatting as Markdown tables), JSON (with bounding box metadata), or Docling's own `.docling.json` format that retains page coordinates for provenance tracking.

The `docling/chunking/` module provides a `HybridChunker` that segments the output using document structure (headings, sections) rather than fixed token windows. It respects semantic boundaries identified during parsing rather than cutting arbitrarily at token limits.

## Key Numbers

- **GitHub stars**: ~15,000 (as of early 2026) — growth driven by RAG pipeline adoption
- IBM Research released it as open source under MIT license
- Supports native GPU acceleration for the layout and TSR models
- TableFormer architecture: published in peer-reviewed research (ICDAR 2022), independently validated — not purely self-reported

Benchmark claims about table extraction accuracy come from IBM's own papers. Independent community comparisons against alternatives like PyMuPDF, pdfplumber, and Unstructured generally confirm Docling outperforms on complex tables and multi-column layouts, though no standardized benchmark exists across the full feature set.

## Strengths

**Table parsing quality** — TableFormer is genuinely strong. Merged cells, nested headers, tables spanning page breaks: Docling handles cases that regex-based or heuristic table parsers fail on. For documents where tables carry critical information (financial reports, regulatory filings, research papers), this matters.

**Structured output for RAG** — The `DoclingDocument` format retains enough metadata (page numbers, bounding boxes, element types) to build traceable citations. Downstream RAG systems can tell users "this answer comes from table 3 on page 7" rather than just a text snippet.

**Hybrid chunking** — The `HybridChunker` produces chunks that respect document structure. A section doesn't get split in the middle of a paragraph because a token counter hit 512. For technical documentation with short sections and dense information, this produces more coherent retrieval units than fixed-size chunking.

**Integration surface** — Docling works as a library (`DocumentConverter`), a CLI (`docling path/to/file`), a REST API (via the docling-serve companion project), and an MCP server. RAGFlow integrates it via `docling_parser.py`. LlamaIndex and LangChain both have Docling reader integrations.

## Critical Limitations

**Concrete failure mode — scanned documents with complex layouts**: When a scanned PDF has both multi-column text and embedded tables, Docling's reading order recovery and table recognition run sequentially. If the layout model misclassifies a table region as a figure (which happens with low-resolution scans or unusual table styles), the TSR stage never runs on it. The failure is silent — the table content either disappears from the output or appears as unstructured text in wrong position. Users parsing financial or scientific documents from scanned archives need to validate table extraction quality on representative samples before trusting the pipeline at scale.

**Unspoken infrastructure assumption**: Docling's layout and TSR models require loading PyTorch model weights at startup. The default models pull from HuggingFace on first use (~500MB total). In air-gapped environments, CI/CD pipelines, or Docker images with no internet access, initialization fails unless models are pre-downloaded and paths are configured explicitly. The library does not make this dependency prominent in quick-start documentation.

## When NOT to Use It

**Simple native PDFs with no tables or complex layout** — If your documents are single-column text PDFs generated from Word or LaTeX, pdfplumber or PyMuPDF extracts text faster with less overhead. Docling's model inference adds latency (seconds per page on CPU) that provides no benefit for straightforward documents.

**High-volume, latency-sensitive pipelines without GPU** — On CPU, the layout model runs at roughly 1–3 seconds per page depending on hardware. For pipelines processing thousands of documents with tight SLAs, this compounds. RAGFlow disables Docling by default for this reason and uses it as an opt-in alternative.

**When you need guaranteed deterministic output** — The AI models can produce slightly different results across library versions or when run on different hardware (GPU vs CPU, different CUDA versions). If your pipeline requires bit-for-bit reproducible parsing for auditing or diff tracking, model-based parsers introduce variability that rule-based extractors avoid.

**Environments where Python dependency footprint matters** — Docling pulls in PyTorch, torchvision, and a stack of ML dependencies. For lightweight containerized microservices, the image size cost is real.

## Unresolved Questions

**Cost at scale** — No published data on CPU/GPU hour cost per 1,000 pages at production throughput. Community reports vary widely based on document complexity and hardware. The docling-serve project adds a REST server for parallelism, but horizontal scaling behavior is undocumented.

**Model versioning and stability** — The layout and TSR model weights are versioned separately from the library. It's unclear what the policy is for breaking changes in model behavior across versions, or how to pin to a specific model checkpoint for reproducibility in long-running pipelines.

**Scanned document accuracy on non-English text** — EasyOCR supports multiple languages, but Docling's layout model was trained primarily on English-language documents. Performance on Arabic right-to-left text, CJK documents with vertical text, or mixed-language documents is not systematically documented.

**Provenance and licensing of training data** — The layout and TSR models were trained on datasets described in IBM Research papers. The specific training data sources, their licenses, and whether the trained models carry any usage restrictions beyond MIT are not clearly documented in the repository.

## Alternatives

**[PyMuPDF (fitz)](https://pymupdf.readthedocs.io/)** — Use when you need fast, lightweight extraction from native PDFs with no table parsing requirement. Zero ML dependencies, deterministic output, handles the 80% case.

**Unstructured (unstructured-io)** — Use when you need broad format coverage (HTML, email, EPUB, more) and are willing to accept less table accuracy. Has a hosted API option for teams that don't want to run models themselves.

**RAGFlow's DeepDoc** — Use when you're already in the RAGFlow ecosystem and want layout-aware parsing tightly integrated with chunking strategies tuned per document type (books, papers, resumes, legal documents). DeepDoc's table rotation handling for scanned documents is more robust than Docling's in RAGFlow's own assessment.

**LlamaParse (LlamaCloud)** — Use when you want managed parsing with SLA guarantees and are comfortable with a cloud API rather than running locally. Better for teams without MLOps capacity.

**Marker** — Use when you specifically need high-quality Markdown output from PDFs and GPU is available. Marker is generally faster than Docling on native PDFs at comparable quality.

## Relationship to Broader Infrastructure

Docling fits the "knowledge substrate" layer: it converts raw documents into structured representations that vector databases, knowledge graphs, and RAG pipelines can consume. It doesn't do retrieval, chunking strategy selection, or graph construction — those happen downstream in tools like RAGFlow, [LlamaIndex](../projects/llamaindex.md), or [LangChain](../projects/langchain.md).

For [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines specifically, Docling addresses the parsing quality problem that RAGFlow's team frames as "quality in, quality out." Better-parsed tables and preserved reading order produce better chunks, which produce more accurate retrieval. The `HybridChunker` connects parsing structure to [Context Engineering](../concepts/context-engineering.md) concerns — the boundary between "how you parse" and "how you chunk" is where most production RAG quality issues originate.


## Related

- [Docling](../projects/docling.md) — part_of (0.9)

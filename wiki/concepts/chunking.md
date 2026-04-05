---
entity_id: chunking
type: concept
bucket: knowledge-bases
sources:
  - repos/infiniflow-ragflow.md
  - deep/repos/michaelliv-napkin.md
  - deep/repos/infiniflow-ragflow.md
  - deep/repos/topoteretes-cognee.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:42:16.313Z'
---
# Chunking

**The process of splitting documents into smaller segments for indexing and retrieval in RAG systems.** How you chunk your documents determines what your retrieval can find. A perfect embedding model cannot rescue a retrieval pipeline built on bad chunks.

## Why It Matters

Vector similarity search operates over fixed-size embeddings. An embedding of an entire 50-page PDF carries no useful retrieval signal for a specific question about page 23. Chunking solves this by creating retrievable units small enough to be semantically coherent and large enough to contain useful context.

The tension is fundamental: small chunks match queries precisely but lack context; large chunks preserve context but match queries poorly. Every chunking strategy is a bet on where to resolve this tension for a specific workload.

A February 2026 benchmark across 50 academic papers illustrates this concretely: recursive 512-token splitting achieved 69% accuracy, 15 points above semantic chunking on the same corpus, because semantic chunking's average fragment size (43 tokens) destroyed context. Strategy choice is not a minor tuning knob.

## The Core Strategies

### Fixed-Size (Naive) Chunking

Split every N tokens, optionally with overlap between adjacent chunks. Simple to implement, easy to reason about. Chunk boundaries fall mid-sentence, mid-paragraph, or mid-table. Overlap (typically 10-20%) helps retrieval find content that straddles boundaries, but a January 2026 analysis found overlap provided no measurable benefit when using SPLADE sparse retrieval — only increased storage costs. Overlap matters most for dense retrieval on long-context queries.

RAGFlow's `naive.py` implements this as a default fallback, applying it to DeepDoc-parsed output and respecting configurable token limits. Even "naive" chunking becomes sophisticated when the underlying document understanding is strong.

### Structural / Template-Based Chunking

Respect document structure rather than token counts. Split on section headers, paragraph breaks, legal articles, chapter boundaries, slide transitions. This requires document type awareness.

RAGFlow implements 15+ specialized chunking templates in `rag/app/`: `book.py` splits on chapters and sections; `paper.py` on abstract, sections, and references; `laws.py` on legal article structure; `presentation.py` on slide boundaries. A book chunked naively at 512 tokens produces arbitrary fragments; chunked by chapter, each chunk is a coherent unit.

The tradeoff: you must correctly classify document type before selecting a template. Misclassification (running "naive" on a legal document, or "paper" on a manual) degrades chunk quality in ways that are hard to debug downstream.

### Semantic Chunking

Use embedding similarity to find natural topic boundaries in text, then split where similarity drops. In theory, this produces the most coherent chunks. In practice, when sentences are short or topic transitions are gradual, semantic chunking fragments aggressively — hence the 43-token average seen in the 2026 benchmark. Computationally expensive during ingestion and sensitive to the quality of the embedding model used during chunking itself.

### Hierarchical / Tree-Based Chunking

Build a tree of granularities rather than picking one. The canonical implementation is RAPTOR (Recursive Abstractive Processing for Tree Organized Retrieval): embed all chunks, reduce dimensionality with UMAP, cluster with Gaussian Mixture Models, summarize each cluster with an LLM, then recursively cluster the summaries. The tree has fine-grained leaf chunks at the bottom and progressively more abstract summaries toward the root. RAGFlow flattens this tree for retrieval — both original chunks and generated summaries are indexed, so retrieval can operate at any granularity.

RAGFlow's `rag/raptor.py` implements this with LLM response caching, embedding caching, async execution with semaphores, and retry logic (3 attempts with backoff). RAPTOR is disabled by default because it consumes significant token quotas during ingestion.

RAGFlow's newer TreeRAG extends this by decoupling retrieval into two phases: search over fine-grained chunks for precise matching, then navigate the tree upward to retrieve larger coherent context fragments. This directly addresses the tension between semantic precision and context completeness, though the two-phase architecture adds latency at query time.

### Agentic / Late Chunking

Rather than chunking during ingestion, let the retrieval agent decide what to retrieve. Napkin's architecture takes this to an extreme: BM25 on complete markdown files, with progressive disclosure (overview → search → read) letting the agent decide how deeply to read each file. The benchmark results are striking — 91% on LongMemEval-S vs 86% for the best prior embedding-based system, and vs 64% for GPT-4o with full context stuffing. For structured knowledge bases with well-organized markdown, BM25 over complete files with agent-driven navigation can outperform fixed-chunk embedding retrieval entirely.

## How Chunk Size Interacts With Retrieval

Chunk size affects three separate things: retrieval precision, context quality, and index cost.

Smaller chunks (128-256 tokens) match specific queries precisely but may omit the surrounding context needed to answer the question. This is why some systems store chunks at retrieval granularity but pass larger surrounding windows to the LLM at generation time — retrieve small, read large.

Larger chunks (1024-2048 tokens) carry more context but their embeddings are noisier, making similarity search less precise. A 2000-token chunk embedding averages over many topics.

Token overlap between chunks helps recall when relevant content straddles a boundary. It does not help when the relevant content is contained entirely within one chunk. For sparse retrieval (BM25), overlap is typically wasted.

## Implementation: What Actually Happens

A typical chunking pipeline in code:

1. **Parse** the raw document into structured content (text blocks, tables, figures with positions)
2. **Clean** the text (remove headers/footers, fix encoding, normalize whitespace)
3. **Split** using the chosen strategy, tracking character/token offsets back to source
4. **Enrich** each chunk with metadata: page number, section title, document ID, timestamp, source URL
5. **Embed** each chunk and store the vector alongside the text
6. **Index** both the vector (dense retrieval) and the raw text (sparse retrieval)

The metadata attached to each chunk is often as important as the text. Retrieval that surfaces the right chunk from the wrong document version, or cites page 1 for content from page 47, creates trust problems regardless of semantic accuracy.

RAGFlow's `rag/nlp/__init__.py` shows the complexity hiding inside step 3: a custom tokenizer (`rag_tokenizer`) with CJK character handling, number normalization across Chinese/Arabic/Roman numerals, multi-codec detection (60+ character encodings), and sentence boundary detection across multiple languages. What looks like "split at 512 tokens" is actually a substantial NLP pipeline.

## Document Understanding as a Prerequisite

Chunking quality depends on parsing quality. A naive text extraction of a scanned PDF with rotated tables produces garbled text. Chunking that garbled text at any size produces useless chunks.

RAGFlow's DeepDoc subsystem (`deepdoc/`) addresses this upstream: layout recognition classifies 10 region types (text, title, figure, table, header, footer, etc.), table structure recognition identifies columns, rows, spanning cells and converts them to natural language sentences, and OCR with auto-rotation (testing 0/90/180/270 degree orientations and selecting highest confidence) handles scanned content. Only after this processing does chunking run.

For simple, clean digital documents, this investment is unnecessary. For enterprise document collections with scanned PDFs, complex tables, and multi-column layouts, upstream document understanding is the deciding factor in retrieval quality.

## Failure Modes

**Boundary split on critical content.** A chunk that ends mid-sentence or splits a table across two chunks loses the semantic unit that would have answered the query. Fixed-size chunking with no structural awareness does this systematically.

**Too-small chunks destroying context.** Semantic chunking that fragments aggressively (the 43-token average case) produces chunks that match queries but cannot answer them. The retrieved chunk says "the regulation requires" with no object. The answer is in the next chunk.

**Vocabulary mismatch with BM25.** Chunks containing "authentication" will not match queries using "login" under pure BM25 retrieval. Dense retrieval handles synonyms better, which is why hybrid retrieval systems combine both. But if all retrieval is sparse, vocabulary gaps become systematic failures.

**Embedding homogenization at scale.** Large chunks that span multiple topics produce embeddings that land near the centroid of all those topics, making them poor matches for any specific query. Dense retrieval degrades with chunk size in ways that are not intuitive.

**Undetected chunking strategy mismatch.** Using the wrong template (naive on legal documents, paper on a technical manual) produces structurally incoherent chunks. The pipeline runs without errors; retrieval quality degrades silently.

## Who Implements It

[RAGFlow](../projects/ragflow.md) takes the most elaborate approach: 15+ document-type-specific templates in `rag/app/`, RAPTOR hierarchical summarization in `rag/raptor.py`, and deep document pre-processing via DeepDoc before any chunking runs. The philosophy is that ingestion complexity pays for itself in retrieval quality.

[Napkin](../projects/napkin.md) skips chunking entirely for structured markdown vaults, using BM25 over complete files with a three-signal ranking (BM25 + backlinks + recency) and progressive disclosure to manage context window budgets. The LongMemEval benchmark results suggest this works better than chunked embedding retrieval for well-organized knowledge bases — at the cost of not handling large unstructured documents.

LlamaIndex and LangChain provide chunking utilities as components rather than commitments: `SentenceSplitter`, `SemanticSplitter`, `TokenTextSplitter` expose the strategy choice to the developer. This is appropriate for custom pipelines and wrong for teams that need working defaults without deep RAG expertise.

## When to Use Which Strategy

**Fixed-size (naive):** Homogeneous document collections, clean digital text, simple content like FAQ pages or product descriptions. Fast to implement and often good enough.

**Structural/template-based:** Documents with meaningful structure — books, academic papers, legal documents, technical manuals, slides. Match the template to the document type.

**Hierarchical (RAPTOR/TreeRAG):** Long documents requiring both precise matching and broad context. Knowledge bases where users ask both specific lookup questions and synthesis questions across sections. Justified when ingestion cost is acceptable.

**No chunking (BM25 over full files):** Structured markdown knowledge bases, agent memory systems, well-organized technical wikis. Requires discipline in how content is authored — unstructured content defeats BM25.

**Semantic chunking:** Rarely the best choice in practice. Use when document structure is absent and content has clear topic boundaries. Test against fixed-size before committing.

## Unresolved Questions in Practice

No published work establishes generalizable chunk size guidelines across document types and retrieval methods. Most benchmarks measure one corpus, one strategy, one retrieval approach. The February 2026 benchmark showing recursive splitting outperforming semantic chunking used academic papers — results may invert on conversational data or technical documentation.

The interaction between chunking strategy and embedding model is poorly characterized. Embedding models trained on specific text distributions may perform better with certain chunk sizes. Most deployments choose chunk size and embedding model independently, with no empirical validation of the combination.

Whether chunk overlap helps or hurts depends on the retrieval method — dense vs. sparse — in a way that most documentation ignores. Teams that copy defaults from tutorials optimized for dense retrieval into sparse retrieval pipelines carry storage overhead with no benefit.

## Related Concepts

Retrieval-Augmented Generation

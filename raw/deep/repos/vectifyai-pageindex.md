---
url: 'https://github.com/vectifyai/pageindex'
type: repo
author: vectifyai
date: '2026-04-04'
tags: [knowledge-bases, context-engineering]
key_insight: >-
  Replaces vector similarity search with a hierarchical tree index built from document structure, enabling LLM agents to navigate long documents through reasoning-based tree traversal rather than embedding-based retrieval -- achieving 98.7% accuracy on FinanceBench by making retrieval a reasoning problem rather than a similarity problem.
stars: 23900
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - pageindex/page_index.py
    - pageindex/page_index_md.py
    - pageindex/retrieve.py
    - pageindex/client.py
    - pageindex/utils.py
    - pageindex/config.yaml
    - pageindex/__init__.py
    - run_pageindex.py
    - examples/agentic_vectorless_rag_demo.py
    - examples/workspace/_meta.json
    - examples/documents/results/2023-annual-report_structure.json
    - cookbook/pageindex_RAG_simple.ipynb
  analyzed_at: '2026-04-04'
  original_source: repos/vectifyai-pageindex.md
---

## Architecture Overview

PageIndex is a "vectorless RAG" system that builds hierarchical tree indexes from documents and uses LLM reasoning (instead of vector similarity search) to retrieve relevant content. The system is inspired by AlphaGo's tree search approach -- navigating a document's structure through intelligent traversal rather than brute-force similarity matching. Built by VectifyAI, it powers the Mafin 2.5 financial analysis system and is available both as an open-source library and a cloud service at pageindex.ai.

The core thesis is that document retrieval is fundamentally a reasoning problem, not a similarity problem. When a human expert searches a 500-page financial report for a specific data point, they scan the table of contents, reason about which sections are relevant, and navigate to specific pages. They do not compute cosine similarity between the question and every paragraph. PageIndex replicates this human navigation pattern by giving the LLM the same tools (tree structure + targeted page access) that humans use.

The architecture has two phases:

**Phase 1: Index Construction** (offline, per-document)
1. Extract text from PDF pages (via PyPDF2/PyMuPDF) or parse markdown headings
2. Detect and extract table of contents (TOC) if present, using LLM classification
3. If no TOC exists, generate a hierarchical structure by analyzing page content with an LLM
4. Verify section title appearances on physical pages with LLM-based fuzzy matching
5. Build a tree structure with nodes containing: title, node_id, start_index, end_index, summary, metadata, and sub_nodes
6. Generate per-node summaries via LLM
7. Generate a document-level description

**Phase 2: Reasoning-Based Retrieval** (online, per-query)
The retrieval process mimics human document navigation through an iterative loop:
1. Agent receives query and calls `get_document()` for metadata
2. Agent calls `get_document_structure()` to get the tree index (summaries only, no text)
3. Agent reads the tree (like scanning a table of contents), reasons about which sections are relevant
4. Agent calls `get_page_content(pages="5-7")` to fetch specific pages
5. Agent assesses whether sufficient information has been gathered
6. If not, agent navigates to additional sections or follows cross-references
7. Agent synthesizes answer from retrieved content

The system supports two retrieval modes:
- **LLM Tree Search**: Pure reasoning-based retrieval using only the tree index
- **Hybrid Tree Search**: Combines LLM reasoning with vector DB for fallback similarity search

The codebase is organized as a Python package:

```
pageindex/
  page_index.py       # PDF index construction (TOC detection, structure generation)
  page_index_md.py    # Markdown index construction (heading-based tree building)
  retrieve.py         # Document/structure/page retrieval functions
  client.py           # PageIndexClient: high-level API with workspace persistence
  utils.py            # LLM wrappers (litellm), PDF helpers, tree utilities
  config.yaml         # Default model configuration
  __init__.py          # Package exports
```

The `PageIndexClient` class provides the primary interface:

```python
client = PageIndexClient(workspace="./workspace")
doc_id = client.index("report.pdf")           # Build tree index
structure = client.get_document_structure(doc_id)  # Get tree (no text)
content = client.get_page_content(doc_id, "5-7")   # Get specific pages
```

## Core Mechanism

### The Fundamental Problem with Vector RAG

PageIndex's design is motivated by specific failure modes of vector-based retrieval that become acute in professional document analysis:

**Structural loss**: A 300-page financial report becomes 600 orphaned chunks with no sense of how they relate. Headers, subsections, and cross-references are destroyed during chunking.

**Context erosion**: Relationships between headers and subsections vanish during vectorization. A table's meaning depends on the section it appears in, but chunking divorces content from context.

**Semantic confusion**: A footnote and a key finding might use identical terminology but mean completely different things. Cosine similarity cannot distinguish them because semantic closeness and factual relevance are not the same thing. This is especially problematic in financial and legal documents where identical phrases carry different implications depending on structural context.

**Reference imprecision**: Vector search cannot follow in-document citations like "see Appendix G" or "as stated in Section 3.2." The retriever treats these as opaque text, while a reasoning agent can navigate the tree to follow the reference.

On FinanceBench, these failure modes cause vector-based RAG to achieve approximately 30-50% accuracy (GPT-4o vanilla: ~31%, Perplexity: ~45%), while PageIndex's reasoning-based approach achieves 98.7%.

### Tree Index Construction from PDFs

The `page_index()` function in `page_index.py` implements a multi-step pipeline that uses an LLM at every stage:

**Stage 1: TOC Detection** (`find_toc_pages`). Starting from the first page, each of the first N pages (default 20) is independently classified by the LLM as containing TOC content or not. The algorithm uses a "sticky" approach: once a TOC page is found, it continues scanning until a non-TOC page is detected, then stops. This handles multi-page TOCs spanning 2-10 pages. Explicit negative examples in the prompt ("abstract, summary, notation list, figure list, table list are NOT table of contents") prevent common false positives.

**Stage 2: TOC Extraction** (`toc_extractor`). Raw TOC text is preprocessed to normalize formatting: dots separating titles from page numbers (`...`) are replaced with colons. The system detects whether page numbers are present, which determines the next processing path.

**Stage 3: TOC Transformation** (`toc_transformer`). Raw TOC text is converted to structured JSON with `structure` (hierarchical index like "1.2.3"), `title`, and `page` fields. Uses a multi-turn completion strategy: if initial LLM output is truncated (finish_reason="length"), the system continues generation in subsequent turns, concatenating results. A completeness check LLM call validates the output against the original TOC. Up to 5 retry attempts handle generation failures.

**Stage 4: Physical Page Resolution** (`toc_index_extractor`). When the TOC contains logical page numbers that differ from physical positions (common in academic papers with Roman numeral prefaces), the system resolves this mapping. It feeds actual document pages (tagged with `<physical_index_X>` markers) alongside the TOC to the LLM. The `calculate_page_offset()` function uses majority voting across matched title-page pairs to determine the global offset.

**Stage 5: Title Verification** (`check_title_appearance`, `check_title_appearance_in_start_concurrent`). Each section title is verified against its claimed physical page using LLM-based fuzzy matching. A second check determines whether the section starts at the beginning of its page or partway through. This distinction matters for page range attribution: if Section B starts in the middle of page 5, Section A's content includes page 5, but if Section B starts at the top of page 5, Section A ends at page 4.

**Stage 6: No-TOC Fallback** (`page_list_to_group_text`, `add_page_number_to_toc`). For documents without a TOC, pages are grouped into manageable chunks (default max 20K tokens per group) with 1-page overlap between groups. The LLM generates hierarchical section titles with page references for each group, using `<physical_index_X>` tags for precise page attribution.

**Post-Processing**: The flat list of sections is converted to a tree using `list_to_tree()`, which tracks parent-child relationships via structure codes. Page ranges are computed based on title verification results.

### Tree Index Construction from Markdown

The `page_index_md.py` module handles markdown documents through an entirely deterministic path (no LLM calls for structure extraction, only for optional summaries):

1. **Header extraction**: Regex `^(#{1,6})\s+(.+)$` parses headers while properly tracking code block state to avoid matching `#` inside fenced code blocks.

2. **Content association**: Each header node gets the text from its line number to the next header's line number, preserving the full content of each section.

3. **Tree thinning** (optional): A bottom-up algorithm merges undersized nodes. For each node, if its total token count (self + all descendants) is below `min_node_token`, all descendants are collapsed into the parent. Token counting uses LiteLLM's `token_counter()` for model-accurate counts.

4. **Tree construction**: A stack-based algorithm converts flat heading list to nested tree using heading levels. The stack tracks (node, level) pairs; when a new heading appears at level <= top of stack, the stack is popped until a valid parent is found.

### Retrieval Functions

The `retrieve.py` module provides three tool functions designed for agentic use:

- `get_document()` -- Returns metadata (doc_id, name, description, page_count/line_count, status)
- `get_document_structure()` -- Returns the tree with `text` fields removed (saving tokens)
- `get_page_content()` -- Returns text for specified pages, supporting range syntax ("5-7", "3,8", "12")

The critical design: `get_document_structure()` strips the `text` field from all nodes, returning only titles, node_ids, summaries, and page ranges. This forces the agent to reason about which pages to fetch rather than dumping the entire document into context. The agent must read the tree structure, identify relevant sections by their summaries, and then request specific page content. This turns retrieval into a multi-step reasoning task rather than a single-shot similarity search.

### The JSON Tree Index Format

Each node in the tree contains:
- `node_id`: Unique identifier for the node
- `name`: Human-readable section label
- `description`: Optional detailed explanation
- `metadata`: Key-value pairs for contextual information
- `sub_nodes`: Array of child nodes enabling recursive nesting

This creates an "in-context index" that resides within the LLM's active reasoning context, rather than in an external vector database. The entire tree (without text) typically fits in 1-3K tokens for most documents.

### Workspace Persistence

The `PageIndexClient` supports a workspace directory that caches indexed documents as JSON files with a `_meta.json` index. This avoids re-indexing documents across sessions. The client uses lazy loading -- full document data (structure, page text) is only loaded from disk when needed.

### LLM Abstraction

All LLM calls go through `litellm`, supporting any provider (OpenAI, Anthropic, local models). Both sync (`llm_completion`) and async (`llm_acompletion`) wrappers include retry logic (10 retries with 1-second backoff) and JSON extraction utilities. The `retrieve_model` parameter can be different from the `model` used for indexing, allowing cost optimization (cheap model for indexing, expensive model for retrieval reasoning).

## Design Tradeoffs

**LLM-intensive indexing vs. deterministic parsing.** The index construction phase makes dozens of LLM calls per document (TOC detection per page, title verification per section, summary generation per node). A 50-page PDF might require 100+ LLM calls to index. This is expensive and slow compared to deterministic text extraction, but produces semantically meaningful structure that a plain PDF parser cannot. At GPT-4o pricing, indexing costs roughly $0.10-0.30 per document -- a one-time cost amortized across all subsequent queries.

**Reasoning-only vs. hybrid retrieval.** PageIndex now supports both pure tree search and hybrid tree+vector search. The pure approach commits fully to reasoning, with no vector search fallback. If the agent reasons incorrectly about the tree structure, it may fetch irrelevant pages and miss the answer. The hybrid approach (tree navigation + vector search as fallback) provides robustness at the cost of maintaining a vector index alongside the tree.

**Page-level vs. paragraph-level granularity.** For PDFs, retrieval granularity is at the page level (physical page boundaries). For markdown, it is at the heading level (line numbers). This means the agent sometimes fetches entire pages when only a paragraph is relevant, wasting context tokens. Finer-grained chunking could be more precise but would complicate the tree structure and increase index size.

**Structure removal in retrieval.** The `get_document_structure()` function strips text fields, forcing the agent to make targeted page requests. This creates a two-step retrieval process (browse tree, then fetch pages) that costs two tool calls instead of one, but avoids loading potentially hundreds of pages of irrelevant content. Typical token usage: ~1K for metadata + ~3K for tree structure + ~2K for targeted pages = ~6K total vs. 20K+ for naive chunk dumping.

**No incremental indexing.** Each `index()` call processes the entire document from scratch. There is no mechanism for updating the index when a document changes. Acceptable for static documents (financial reports, papers) but limits applicability to living documents.

**Single-document scope.** Each tree index covers one document. Cross-document retrieval requires the agent to iterate over multiple document indexes. There is no multi-document super-index, though the MCP integration enables serving multiple documents through a unified interface.

**No chunking required.** Unlike vector-based RAG which must chunk documents into fixed-size segments (losing context at chunk boundaries), PageIndex preserves the document's natural structure. This eliminates the chunk-size hyperparameter tuning that plagues traditional RAG systems.

## Failure Modes & Limitations

**TOC detection false positives.** The LLM-based TOC detector may misclassify lists, indexes, or figure tables as tables of contents. The prompt includes negative examples, but edge cases can confuse the classifier.

**Page number drift.** PDFs with non-standard pagination (Roman numerals for preface, Arabic for main content, inserted blank pages) can cause misalignment between extracted page numbers and physical page indices. The `add_preface_if_needed()` function and majority-voting offset calculation attempt to handle this, but complex pagination schemes may still fail.

**Summary quality as bottleneck.** The tree structure's utility depends entirely on node summary quality. If the LLM generates vague or inaccurate summaries, the agent will make poor navigation decisions. There is no quality validation for generated summaries.

**Large document scalability.** For very large documents (1000+ pages), indexing involves O(pages) LLM calls for title verification alone. A 500-page PDF with 50 sections requires ~100 LLM calls. At ~1 second per call, indexing takes ~2 minutes. This scales linearly with document size.

**Context window limits for tree structure.** For documents with very deep or wide hierarchies, the tree structure itself (even without text) can exceed practical context window limits. A 500-section document's tree structure could be 10K+ tokens just for titles and summaries.

**Vision-native document handling.** PageIndex processes PDFs through text extraction (PyPDF2/PyMuPDF), which means complex visual layouts -- tables with spanning cells, multi-column text, embedded charts -- may not be captured accurately. Unlike RAGFlow's DeepDoc (which uses OCR, layout recognition, and table structure recognition), PageIndex relies on the PDF parser's text extraction quality. For scanned PDFs or image-heavy documents, the extracted text may be incomplete or garbled, degrading the tree index quality.

**Agent reasoning cost.** Each retrieval query requires the agent to reason over the tree structure, which consumes inference tokens. For simple keyword lookups, this reasoning overhead may exceed the cost of a direct BM25 search. The approach is most cost-effective for complex queries that require multi-step logic or cross-reference following, where the reasoning investment pays off in precision.

**Markdown tree thinning heuristic.** The tree thinning algorithm uses a fixed token threshold to decide when to merge nodes. This works poorly for documents with highly uneven section sizes.

**Reasoning failure modes.** The agent may reason incorrectly about which sections to navigate, especially for ambiguous queries or documents where relevant information is scattered across non-obvious sections. Unlike vector search which surfaces all partially-matching chunks, tree search can completely miss relevant content if the agent's reasoning leads down the wrong branch.

## Integration Patterns

**Agentic RAG via tool functions.** The primary integration pattern exposes `get_document()`, `get_document_structure()`, and `get_page_content()` as agent tools. The `agentic_vectorless_rag_demo.py` example shows this with OpenAI's Agents SDK:

```python
@function_tool
def get_document_structure() -> str:
    return client.get_document_structure(doc_id)

@function_tool
def get_page_content(pages: str) -> str:
    return client.get_page_content(doc_id, pages)

agent = Agent(
    name="PageIndex",
    tools=[get_document, get_document_structure, get_page_content],
    instructions="Call get_document_structure() to identify relevant page ranges..."
)
```

The agent system prompt explicitly instructs the agent to reason step-by-step: check document status, browse the tree structure, then fetch specific pages with tight ranges.

**MCP Integration.** PageIndex provides an official MCP server (`pageindex-mcp`) that works with Claude Agent SDK, Vercel AI SDK, LangChain, OpenAI Agents SDK, and any MCP-compatible client. The MCP server exposes the same tree index directly to LLMs, allowing platforms like Claude, Cursor, and other MCP-compatible agents to reason over document structure. Uses API Key authentication for production deployment. The developer MCP shares the same file space with the PageIndex API for seamless integration.

**Cloud + Self-Hosted Deployment.** The system is designed for dual deployment: self-hosted (open-source repo) or cloud API (pageindex.ai). The cloud version adds a ChatGPT-style chat platform (chat.pageindex.ai), MCP integration, and REST API endpoints. This hybrid model lets users prototype locally and scale to production via API.

**Workspace-based multi-session persistence.** The `PageIndexClient` workspace pattern (JSON files + `_meta.json` index) enables persistent document libraries that survive across agent sessions. Important for production deployments where re-indexing on every session would be prohibitively expensive.

**LiteLLM model abstraction.** By using LiteLLM as the LLM abstraction layer, PageIndex works with any LLM provider. The `retrieve_model` parameter can be different from the `model` used for indexing, allowing cost optimization.

## Benchmarks & Performance

**FinanceBench: 98.7% accuracy.** The Mafin 2.5 system (powered by PageIndex) achieved state-of-the-art results on FinanceBench for financial document QA. Comparison:
- PageIndex reasoning-based: 98.7%
- Traditional vector RAG: ~60% (estimated)
- Perplexity: ~45%
- GPT-4o vanilla: ~31%

The improvement comes from reasoning-based retrieval that can follow multi-step logic chains across document sections, navigate cross-references (e.g., following "see Appendix G" to locate deferred asset values), and maintain structural context that embedding similarity fundamentally cannot preserve.

**Token efficiency.** By stripping text from the structure index and requiring targeted page requests, PageIndex minimizes tokens consumed per retrieval. A typical interaction: ~1K tokens for document metadata + ~3K tokens for tree structure + ~2K tokens for targeted page content = ~6K tokens total. Compare with naive RAG that might dump 20K+ tokens of retrieved chunks.

**Indexing cost.** For a 30-page PDF, indexing requires approximately 50-80 LLM API calls. At GPT-4o pricing, this costs roughly $0.10-0.30 per document -- a one-time cost amortized across all subsequent queries.

**Explainability advantage.** Every answer comes with a full reasoning trace: which nodes were explored, why certain sections were selected, and exactly which pages and sections the answer came from. This is a significant advantage over vector search, which provides only similarity scores as explanation.

### Configuration System

The `config.yaml` defaults reveal the system's operational parameters:
- Default model: `gpt-4o-2024-11-20` for indexing
- Default retrieve model: `gpt-5.4` (separate, typically more capable model for agent reasoning)
- TOC check pages: 20 (scan first 20 pages for TOC)
- Max pages per node: 10 (prevents overly coarse tree granularity)
- Max tokens per node: 20000 (ensures nodes fit in context windows)

The `ConfigLoader` class supports YAML defaults with dict/SimpleNamespace overrides, allowing CLI, API, and programmatic configuration. The separation of indexing and retrieval models is a cost optimization: use a cheaper model for the many LLM calls during indexing, and a more capable model for the fewer but more critical reasoning calls during retrieval.

## Comparative Analysis

**vs. RAGFlow**: RAGFlow's approach is complementary rather than competitive. RAGFlow excels at document parsing (DeepDoc) and multi-recall hybrid retrieval (BM25 + vector + GraphRAG + RAPTOR). PageIndex excels at structured document navigation for precise Q&A. RAGFlow treats documents as collections of chunks; PageIndex treats them as navigable structures. A production system could use RAGFlow's DeepDoc for parsing and PageIndex's tree search for retrieval. RAGFlow's TreeRAG feature (decoupling search and retrieve phases) borrows a similar insight: use fine-grained search to locate relevant areas, then retrieve larger coherent context.

**vs. napkin**: Both reject embedding-based retrieval, but for different reasons and different use cases. Napkin uses BM25 on structured markdown for agent memory (ongoing, evolving knowledge). PageIndex uses tree reasoning on static documents (financial reports, legal filings). Napkin is local-first with zero infrastructure; PageIndex requires LLM API access for both indexing and retrieval. Napkin excels at long-term conversational memory (91% on LongMemEval-S); PageIndex excels at precise document Q&A (98.7% on FinanceBench). The philosophical overlap: both argue that the full-capability LLM should make retrieval decisions, not a smaller embedding model.

**vs. Traditional RAG (LlamaIndex, LangChain)**: PageIndex eliminates the chunk-size hyperparameter entirely. No chunking strategy to tune, no overlap to configure, no embedding model to select. The tradeoff is higher per-document indexing cost (dozens of LLM calls vs. one embedding pass) and dependence on agent reasoning quality. Traditional RAG systems treat every query independently; PageIndex enables conversational retrieval where the agent considers conversation history for refinement across multiple queries about the same document.

**vs. Microsoft GraphRAG**: GraphRAG builds entity-relationship graphs for cross-document reasoning. PageIndex builds structural trees for within-document navigation. GraphRAG is better for "summarize themes across these 100 reports"; PageIndex is better for "find the specific revenue figure in this 300-page filing." The approaches are orthogonal and could be combined: GraphRAG for cross-document discovery, PageIndex for precise within-document retrieval.

**The broader paradigm shift**: PageIndex represents a move from "approximate similarity" to "reasoning-based relevance." Vector RAG emerged because embedding similarity was the best available proxy for relevance. With sufficiently capable LLMs, direct reasoning over document structure outperforms the proxy. This suggests that as LLM capabilities improve, more retrieval tasks will shift from statistical similarity to structured reasoning.

## Implications for Meta-KB

PageIndex's key lessons for meta-kb:

1. **Retrieval as reasoning** -- The 98.7% vs. 31% gap on FinanceBench demonstrates that for structured documents, reasoning-based navigation vastly outperforms similarity search. Meta-kb's wiki compilation could benefit from tree-structured access to source material.

2. **Structure preservation matters** -- Destroying document structure during chunking is the root cause of most RAG failures. Meta-kb's raw source files already preserve structure (YAML frontmatter, markdown headings), which is an asset to protect during compilation.

3. **Two-tool retrieval** -- The browse-then-read pattern (tree structure without text, then targeted page fetch) is a token-efficient model for any knowledge base. Meta-kb could expose wiki content the same way: overview index first, detailed content on demand.

4. **No-chunking advantage** -- By working with natural document sections instead of artificial chunks, PageIndex avoids the context erosion that plagues traditional RAG. This validates meta-kb's approach of preserving complete source documents rather than chunking them.

5. **Hybrid search as safety net** -- PageIndex's addition of hybrid tree+vector search acknowledges that pure reasoning can fail. Any knowledge base retrieval system benefits from multiple retrieval strategies as fallbacks.

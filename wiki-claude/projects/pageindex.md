# PageIndex

> Reasoning-based RAG system that replaces vector similarity search with hierarchical tree indexing and LLM reasoning, achieving 98.7% accuracy on FinanceBench -- proving that structured document navigation outperforms embedding-based retrieval for professional documents.

## What It Does

PageIndex transforms documents into a hierarchical tree structure (similar to a table of contents but optimized for LLMs) and uses LLM reasoning to navigate that tree for retrieval. Instead of chunking documents into vectors and doing similarity search, it preserves natural document sections and lets the model reason about which sections are relevant. This simulates how human experts navigate complex documents: scan the structure, identify relevant sections, drill down. The system handles financial reports, regulatory filings, academic papers, legal documents, and any content that exceeds LLM context limits.

## Architecture

Python library that processes PDFs (and Markdown) in two steps. First, it generates a tree structure index where each node has a title, summary, page range, and child nodes. Second, it performs reasoning-based retrieval via tree search -- the LLM traverses the tree using reasoning rather than vector distance. No vector database, no embedding pipeline, no chunking strategy. Uses LiteLLM for multi-provider LLM support (default: GPT-4o). Available as self-hosted open-source, cloud API, MCP server, and a chat platform. Includes an agentic RAG example using OpenAI Agents SDK.

## Key Numbers

- 23,899 GitHub stars, 1,982 forks
- 98.7% accuracy on FinanceBench (state-of-the-art, via Mafin 2.5 system)
- Zero vector database dependencies
- MIT license

## Strengths

- Eliminates the fundamental "similarity is not relevance" problem in vector RAG -- retrieval is based on reasoning, not cosine distance
- Fully explainable retrieval with page and section references, unlike opaque vector search
- No chunking means no information loss at chunk boundaries -- documents retain their natural structure
- Works especially well for structured professional documents (finance, legal, regulatory) where hierarchy matters

## Limitations

- Requires LLM calls for both indexing and retrieval, making it slower and more expensive per query than vector search
- Tree generation quality depends heavily on document structure -- poorly formatted PDFs produce poor trees
- Not designed for unstructured, conversational, or highly heterogeneous corpora where documents lack natural hierarchy
- Single-document focus -- no built-in cross-document retrieval or knowledge graph capabilities

## Alternatives

- [hipporag.md](hipporag.md) -- use when you need cross-document, multi-hop retrieval via knowledge graphs
- [llmlingua.md](llmlingua.md) -- use when your bottleneck is context length/cost rather than retrieval accuracy
- [supermemory.md](supermemory.md) -- use when you need combined memory + RAG with user profiling

## Sources

- [Source](../../raw/repos/vectifyai-pageindex.md) -- "PageIndex: Document Index for Vectorless, Reasoning-based RAG"

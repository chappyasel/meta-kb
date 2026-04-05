# PageIndex

> A vectorless, reasoning-based RAG system that replaces vector similarity search with hierarchical tree indexing and LLM reasoning -- achieving retrieval through relevance rather than approximation.

## What It Does

PageIndex transforms lengthy PDF and markdown documents into a semantic tree structure (like a table of contents optimized for LLMs) and then uses tree search for retrieval. Instead of chunking documents and embedding them into a vector space, it builds a hierarchical index where each node has a title, summary, page range, and child nodes. At query time, an LLM reasons over this tree to navigate to the most relevant sections -- mimicking how a human expert would navigate a complex document.

## Architecture

The pipeline has two steps:

1. **Indexing**: Generate a hierarchical tree structure from a PDF or markdown file. Each node contains a title, node ID, start/end page indices, summary, and child nodes. Uses LiteLLM for multi-LLM support (defaults to GPT-4o).
2. **Retrieval**: Perform tree search using LLM reasoning to traverse the hierarchy and find relevant sections. Inspired by AlphaGo's tree search approach.

Self-hostable via Python package or available as a cloud service (chat platform, MCP server, API). Supports vision-based RAG that works directly on page images without OCR. Integrates with OpenAI Agents SDK for agentic vectorless RAG workflows.

## Key Numbers

- **23,899 GitHub stars**, 1,982 forks
- **98.7% accuracy** on FinanceBench (state-of-the-art via Mafin 2.5)
- No vector database required
- No chunking required
- MIT license, Python

## Strengths

- Eliminates the lossy chunking and opaque embedding space of traditional RAG -- retrieval is traceable and interpretable with page and section references
- 98.7% on FinanceBench demonstrates that reasoning-based retrieval dramatically outperforms similarity-based approaches on professional documents

## Limitations

- Every retrieval query requires LLM inference for tree traversal, making it slower and more expensive per-query than pre-computed vector lookups
- Best suited for structured, long-form documents (financial reports, legal manuals, textbooks) -- less useful for short-form or conversational content

## Alternatives

- [hipporag.md](hipporag.md) -- use when you need multi-hop associative retrieval across many documents rather than within-document navigation
- [llmlingua.md](llmlingua.md) -- use when you want to compress retrieved context rather than replace the retrieval method itself

## Sources

- [vectifyai-pageindex.md](../../raw/repos/vectifyai-pageindex.md) -- "Similarity does not equal relevance -- what we truly need in retrieval is relevance, and that requires reasoning"

---
entity_id: chunking
type: concept
bucket: knowledge-bases
sources:
  - repos/vectifyai-pageindex.md
related:
  - Retrieval-Augmented Generation
  - Vector Database
last_compiled: '2026-04-04T21:23:34.959Z'
---
# Chunking

## What It Is

Chunking is the process of splitting documents into smaller text segments before embedding them into vector space for storage and retrieval in Retrieval-Augmented Generation systems. Since LLMs and embedding models have token limits, and since retrieving an entire document is usually wasteful or impossible, raw documents must be decomposed into units that can be independently embedded, indexed, and fetched.

The output chunks are stored in a Vector Database alongside their embeddings, and at query time the most relevant chunks are retrieved and passed to the LLM as context.

## Why It Matters

Chunk design is one of the highest-leverage decisions in a RAG pipeline. The same corpus, chunked differently, can produce dramatically different retrieval quality:

- **Too large:** Chunks contain multiple topics; embedding averages over them, diluting signal. Retrieved chunks waste context window space with irrelevant content.
- **Too small:** Chunks lose surrounding context needed to interpret them correctly. A sentence like "This increased revenue by 40%" is meaningless without the surrounding paragraph.
- **Wrong boundaries:** Splitting mid-sentence, mid-table, or mid-code block produces malformed chunks that embed poorly and confuse the LLM.

## How It Works

### Basic Strategies

| Strategy | Description | When to Use |
|----------|-------------|-------------|
| **Fixed-size** | Split every N tokens/characters | Quick baseline; poor semantic coherence |
| **Sentence/paragraph** | Split on natural language boundaries | General prose |
| **Recursive** | Try paragraph → sentence → word boundaries in order | Default for most frameworks (LangChain default) |
| **Semantic** | Group sentences by embedding similarity | High quality; compute-intensive |
| **Document-aware** | Use document structure (headings, sections) | Structured docs (Markdown, HTML, PDF) |

### Key Parameters

- **Chunk size:** Typically 256–1024 tokens. Smaller chunks = more precise retrieval but less context. Larger chunks = more context but noisier embeddings.
- **Chunk overlap:** Repeating N tokens between adjacent chunks (commonly 10–20% of chunk size) prevents information loss at boundaries.
- **Chunk metadata:** Attaching source, page number, section heading, and document ID to each chunk is essential for citation, filtering, and reranking.

### Concrete Example

A 10-page technical manual chunked at 512 tokens with 50-token overlap might produce ~60 chunks. A query about "installation requirements" retrieves the 3–5 most similar chunks by cosine distance. If the relevant content spans a boundary, overlap increases the chance at least one chunk contains the complete answer.

## The Core Problem Chunking Tries to Solve

Embedding models map text to a fixed-size vector. Long documents embed as a single dense vector that represents everything and therefore retrieves for nothing specific. Chunking trades document coherence for retrieval precision—an inherently lossy operation.

## Limitations and Failure Modes

- **Arbitrary boundaries break context.** A chunk ending mid-argument makes the retrieved text incomplete or misleading.
- **Multi-hop information is split across chunks.** A question requiring synthesis across sections may retrieve none of the right chunks, or retrieve them individually without enough context to connect them.
- **Tables, code, and lists degrade badly** under text-based chunking that ignores structure.
- **Optimal chunk size is domain-specific** and requires empirical tuning per corpus and query type.
- **Embedding quality varies by chunk size.** Most embedding models were trained on paragraph-length inputs; very short or very long chunks fall out of their training distribution.

## Who Implements It

Every major RAG framework exposes chunking utilities:
- **LangChain:** `RecursiveCharacterTextSplitter` (most common default)
- **LlamaIndex:** `SentenceSplitter`, `SemanticSplitterNodeParser`
- **Haystack:** `DocumentSplitter`
- **Unstructured.io:** Structure-aware splitting for PDFs, HTML, etc.

## Alternatives and Complements

Traditional chunking is increasingly recognized as a fundamental limitation of similarity-based RAG. Alternatives include:

- **PageIndex:** Replaces chunking entirely with a reasoning-based tree index. Uses LLM reasoning rather than vector similarity to navigate documents hierarchically, avoiding "lossy chunking and opaque embedding space." Trades embedding approximation for inference cost.
- **HyDE (Hypothetical Document Embeddings):** Generates a hypothetical answer to embed at query time, rather than improving chunk embeddings.
- **Late chunking / ColBERT:** Token-level retrieval rather than chunk-level, preserving more context.
- **Reranking:** Applied after retrieval to compensate for chunking-induced noise using a cross-encoder.
- **Parent-document retrieval:** Retrieve small chunks for precision, then expand to parent chunks for context before passing to the LLM.

## Practical Advice

1. Start with recursive splitting at 512 tokens, 10% overlap. Measure retrieval recall before tuning.
2. Preserve document structure metadata on every chunk.
3. For structured documents (PDFs, HTML), use structure-aware tools before falling back to text splitting.
4. Evaluate chunking by retrieval metrics (recall@k), not just generation quality—generation can mask retrieval failures.
5. Consider that changing chunk size requires re-embedding the entire corpus.

## Sources

[Source: PageIndex](../../raw/repos/vectifyai-pageindex.md)


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.7)
- Vector Database — implements (0.6)

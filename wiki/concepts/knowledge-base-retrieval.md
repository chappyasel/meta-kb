---
entity_id: knowledge-base-retrieval
type: concept
bucket: knowledge-bases
sources:
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/gepa-ai-gepa.md
  - repos/microsoft-llmlingua.md
related:
  - Retrieval-Augmented Generation
  - Obsidian
  - Personal Knowledge Management
  - Self-Healing Knowledge Bases
last_compiled: '2026-04-04T21:23:08.533Z'
---
# Knowledge Base Retrieval

## What It Is

Knowledge base retrieval is the process of locating and surfacing relevant information from a stored corpus—structured (databases, ontologies) or unstructured (markdown files, documents, embeddings)—to provide an LLM with accurate, contextually appropriate content at inference time. It sits at the core of any system where the model's parametric knowledge is insufficient: specialized domains, recent events, private data, or long-form research notes.

Retrieval is not a single technique but a spectrum, ranging from simple keyword lookup to dense vector search to agent-driven file navigation.

## Why It Matters

LLMs have a fixed context window and static training data. Retrieval extends both limits:

- **Recency**: Retrieved documents can be updated without retraining
- **Precision**: Narrow retrieval reduces hallucination by grounding responses in specific sources
- **Scale**: A model cannot hold an entire knowledge base in context; retrieval selects the relevant slice
- **Cost**: Fetching 2–5 relevant chunks is cheaper than stuffing entire corpora into the prompt

The alternative—putting everything in context—is expensive and degrades with length. Retrieval is the practical scaling path.

## How It Works

### Classic RAG Pipeline
1. **Ingest**: Source documents chunked and embedded into a vector store
2. **Query**: User query embedded; cosine similarity finds nearest chunks
3. **Retrieve**: Top-k chunks passed to the LLM as context
4. **Generate**: LLM responds conditioned on retrieved content

This is the dominant pattern in production systems. See Retrieval-Augmented Generation for full detail.

### Markdown/File-Based Retrieval
An emerging alternative skips vector databases entirely. The LLM maintains an indexed wiki of `.md` files with backlinks, summaries, and category articles. Queries are routed by the LLM to relevant files directly. Karpathy's documented workflow follows this pattern: raw sources land in `raw/`, an LLM compiles a structured wiki, and Q&A queries the index rather than a vector store. [Source](../../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)

The key claim here is that clean file organization + self-healing linting loops can replace expensive RAG infrastructure for personal-scale knowledge bases. [Source](../../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)

### Hybrid Approaches
- **BM25 + dense retrieval**: Keyword matching combined with semantic search improves recall
- **Reranking**: A second model scores retrieved chunks for relevance before passing to the generator
- **Prompt compression**: Tools like LLMLingua can compress retrieved content by up to 20x before injection, preserving semantics while cutting token costs—directly useful when multiple documents are retrieved [Source](../../raw/repos/microsoft-llmlingua.md)

## Concrete Example

A user asks: *"What did the paper on sparse autoencoders say about superposition?"*

- **Vector RAG**: Query embedded → nearest chunks from paper PDFs retrieved → passed to LLM
- **Markdown wiki**: LLM routes query to `concepts/superposition.md`, which links to the raw paper summary in `raw/papers/`
- **Compressed RAG**: Retrieved chunks run through LLMLingua before injection, reducing a 4,000-token retrieval to ~400 tokens

All three produce grounded answers; they differ in infrastructure cost and maintenance overhead.

## Who Implements It

| System | Retrieval Approach |
|--------|-------------------|
| Retrieval-Augmented Generation | Vector similarity search |
| [Obsidian](../projects/obsidian.md) | Graph links + full-text search |
| [Personal Knowledge Management](../concepts/personal-knowledge-management.md) | Mixed; user-defined |
| [Self-Healing Knowledge Bases](../concepts/self-healing-knowledge-bases.md) | LLM-maintained markdown indexes |
| LlamaIndex, LangChain | Pluggable; vector + keyword |

## Practical Implications

**Chunk size matters**: Too small loses context; too large dilutes relevance. 256–512 tokens is a common default, but domain-specific tuning is needed.

**Retrieval is a bottleneck**: Garbage in, garbage out. If the knowledge base is poorly organized or outdated, even perfect retrieval fails. The [Self-Healing Knowledge Bases](../concepts/self-healing-knowledge-bases.md) pattern tries to address this with LLM-driven linting.

**Cost tradeoffs are real**: Dense vector search at scale requires maintained infrastructure (Pinecone, Weaviate, Chroma). Markdown-based retrieval is cheaper but less semantically robust for large corpora.

**Compression unlocks scale**: When retrieved context is verbose, prompt compression (e.g., LLMLingua) can make retrieval-heavy workflows economically viable without sacrificing accuracy. [Source](../../raw/repos/microsoft-llmlingua.md)

## Limitations

- **Retrieval failures are silent**: When the retriever misses the relevant document, the model often hallucinates confidently rather than flagging the gap
- **Query-document mismatch**: User query phrasing may not match how information is stored; paraphrase expansion or query rewriting helps but adds complexity
- **Stale indexes**: Knowledge bases drift out of sync with source material unless actively maintained
- **Evaluation is hard**: Measuring retrieval quality requires labeled relevance judgments that most teams don't have

## Alternatives to Classical Retrieval

- **Long-context models**: Just put everything in context. Viable for smaller corpora; expensive at scale
- **Fine-tuning**: Bake knowledge into weights. No retrieval latency, but inflexible and costly to update
- **Tool use / search**: Let the LLM call a live search API rather than querying a static store


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.8)
- [Obsidian](../projects/obsidian.md) — implements (0.6)
- [Personal Knowledge Management](../concepts/personal-knowledge-management.md) — implements (0.7)
- [Self-Healing Knowledge Bases](../concepts/self-healing-knowledge-bases.md) — implements (0.6)

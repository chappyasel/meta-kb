---
entity_id: semantic-search
type: approach
bucket: knowledge-bases
sources:
  - repos/aiming-lab-simplemem.md
  - repos/thedotmack-claude-mem.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:29:23.342Z'
---
# Semantic Search

Semantic search finds content by meaning rather than by matching tokens. You submit a query, the system converts it to a vector embedding, then retrieves documents whose embeddings are closest in that vector space. Two passages that share no words but cover the same concept will rank near each other. Two passages that share many words but discuss opposite positions will rank far apart.

This is the retrieval layer underneath most modern Retrieval-Augmented Generation systems. Without it, RAG degrades to keyword lookup.

---

## How Embeddings Work

An embedding model (e.g., `sentence-transformers/all-MiniLM-L6-v2`, OpenAI's `text-embedding-3-small`, or Cohere's `embed-v3`) maps a string to a fixed-length vector — typically 384 to 3072 dimensions. The model is trained so that semantically related strings land close together under cosine similarity or dot product.

At index time: chunk your corpus, call the embedding model on each chunk, store the resulting vectors.

At query time: embed the query, run approximate nearest-neighbor (ANN) search over stored vectors, return top-k results.

The ANN step is where vector databases earn their place. Libraries like FAISS (Facebook AI Similarity Search) and engines like Qdrant, Chroma, and Pinecone implement algorithms such as HNSW (Hierarchical Navigable Small Worlds) or IVF (Inverted File Index) to search billions of vectors in milliseconds without scanning every entry. FAISS's `IndexHNSWFlat` is a common starting point: it builds a layered graph where each node connects to its nearest neighbors, and search follows the graph greedily from coarse to fine.

Chunking strategy matters as much as the embedding model. A 512-token chunk captures more context but dilutes signal when only one sentence is relevant. A 64-token chunk is precise but may lack the surrounding context a model needs to answer. Many production systems use overlapping chunks (e.g., 256 tokens with 64-token overlap) or parent-document retrieval (store small chunks for retrieval, return the containing larger passage to the generator).

---

## Hybrid Search

Pure semantic search misses exact matches. If a user asks for "RFC 7231" or a function named `parse_token_stream`, cosine similarity over embeddings will underperform BM25 keyword search. Production systems combine both:

- **Sparse retrieval** (BM25, TF-IDF) matches exact and rare terms.
- **Dense retrieval** (semantic embeddings) matches meaning and paraphrase.

Results from both are merged with Reciprocal Rank Fusion (RRF) or a learned reranker. Qdrant's hybrid search and Claude-Mem's search architecture (SQLite FTS5 for keyword search plus Chroma for vector search) both implement this pattern. [Claude-Mem](../projects/claude-mem.md) documents a 3-layer workflow: `search` for a compact index, `timeline` for chronological context, `get_observations` for full content — reporting ~10x token savings versus fetching everything upfront.

---

## The Embedding Model Choice

The embedding model is the most consequential decision in a semantic search system. Key dimensions:

**Dimensionality vs. quality tradeoff.** Higher-dimensional models encode more information but cost more to store and query. `text-embedding-3-small` (1536 dims) works for most knowledge-base tasks. `text-embedding-3-large` (3072 dims) helps on technical or multilingual corpora.

**Domain fit.** General-purpose models underperform on specialized domains (medical, legal, code). Sentence Transformers hosts 5000+ models; `all-mpnet-base-v2` is a reliable general baseline, while `multi-qa-mpnet-base-dot-v1` is tuned for question-document retrieval.

**Multilingual support.** `paraphrase-multilingual-mpnet-base-v2` handles 50+ languages in a shared embedding space, enabling cross-lingual retrieval. CLIP operates on this principle across text and images — both modalities land in the same space.

**Context window.** Many embedding models max out at 512 tokens. Content longer than that gets truncated silently unless you chunk first.

---

## What Semantic Search Is Good At

**Paraphrase and synonym matching.** "car" and "automobile" retrieve each other. "fix the bug" and "resolve the defect" are neighbors.

**Fuzzy user queries.** Users rarely know the exact terminology in your knowledge base. Semantic search tolerates imprecise phrasing in ways BM25 cannot.

**Cross-lingual retrieval.** With multilingual models, a query in French retrieves relevant documents in English.

**Multimodal retrieval.** CLIP-style models embed text and images in a shared space. SimpleMem's architecture extends this to audio and video within a unified compression framework, treating them as semantically comparable entities. [Source](../../raw/repos/aiming-lab-simplemem.md)

**Long-term agent memory.** Systems like SimpleMem use semantic search to retrieve compressed memories across sessions without scanning everything. The alternative — naive memory appending — exhausts context windows quickly.

---

## Concrete Failure Modes

**The vocabulary collapse problem.** Embedding models trained on general web text learn that "Python" (the programming language) and "python" (the snake) have overlapping neighborhoods. In a codebase knowledge base, this introduces irrelevant noise. Domain fine-tuning or hybrid search with keyword filtering mitigates it, but the failure is silent — retrieval degrades without errors.

**Chunk boundary fragmentation.** A critical fact that spans two chunks ("The API rate limit is... 1000 requests per minute") gets split and neither chunk retrieves as well as the complete sentence would. Fixed-size chunking is the common culprit.

**Semantic similarity ≠ answer relevance.** Two passages can be topically close without either containing the answer. A query about "token limits in GPT-4" retrieves passages that discuss tokens extensively, even if none of them state the actual limit. Reranking with a cross-encoder (which scores query-document pairs jointly rather than independently) addresses this but adds latency.

**Negation blindness.** "Documents that do NOT support X" semantically resembles "Documents that support X." Embeddings compress meaning into geometry; negation is not reliably encoded in proximity.

---

## Infrastructure Assumptions Nobody States

Semantic search assumes you can afford to embed your corpus on a recurring basis. Every time a document changes, you re-embed it. At small scale (thousands of documents), this is trivial. At large scale (millions), you need an embedding pipeline, incremental updates, and a vector store that supports upserts without full re-indexing. Pinecone handles this; self-hosted FAISS does not (FAISS indexes are largely static, requiring periodic rebuilds or the `IndexIDMap` workaround).

There is also a latency budget assumption. An ANN query over a local Chroma index takes single-digit milliseconds. A query against a hosted Pinecone index with reranking takes 100-300ms. Add two retrieval rounds plus LLM generation and you have a system that feels slow to users who expect instant search.

---

## When Not to Use Semantic Search

**When precision on rare tokens matters.** Product codes, error identifiers, version strings, and proper nouns are poorly served by semantic similarity. Use keyword search, or at minimum hybrid search with BM25 weighted heavily.

**When your corpus is tiny.** Under a few hundred documents, BM25 on a SQLite FTS index is faster to build, cheaper to run, easier to debug, and competitive in quality. Semantic search earns its complexity at scale.

**When you cannot validate retrieval quality.** Semantic search fails silently. If you have no eval set that measures retrieval recall, you will ship a system that degrades under query distribution shift and you will not know until users complain.

**When your embedding model does not cover your domain.** A general-purpose model on a highly specialized corpus (clinical notes, patent claims, legal contracts) may retrieve plausible-sounding but incorrect passages. The model's training distribution matters.

---

## Reranking

First-stage retrieval (ANN search) optimizes for speed, not precision. Reranking adds a second pass:

Retrieve top-50 by embedding similarity. Score each of those 50 with a cross-encoder that reads the full query and document together. Return the top-5 by cross-encoder score.

Cross-encoders (e.g., `cross-encoder/ms-marco-MiniLM-L-6-v2`) have higher latency than bi-encoders but better precision because they model query-document interaction directly rather than comparing pre-computed vectors. The two-stage pattern lets you scale retrieval while maintaining quality.

---

## Key Libraries and Tools

| Tool | Role | Notes |
|------|------|-------|
| FAISS | ANN search, billion-scale | GPU acceleration, CPU-only for small indexes; largely static indexes |
| Chroma | Embedded vector DB | Easiest local setup; used by Claude-Mem for hybrid search |
| Qdrant | High-performance vector search | Rust-powered, hybrid filtering, production-ready |
| Pinecone | Managed vector DB | Autoscaling, <100ms p99 latency; vendor lock-in |
| Sentence Transformers | Embedding models | 5000+ models, multilingual support |
| CLIP | Cross-modal embeddings | Text and image in same space |

Latency and accuracy numbers above are self-reported by vendors. Independent benchmarks from ANN-benchmarks.com show HNSW (used by Qdrant and Chroma) achieving recall@10 above 0.95 on standard datasets, with query times under 1ms at million-vector scale on a single machine.

---

## Unresolved Questions

**How stale is stale?** Most documentation treats the corpus as static. Real knowledge bases change: documents get updated, deleted, deprecated. None of the major tools specify SLAs for how quickly updates propagate to retrieval results, or what happens to queries that hit deleted documents during index rebuild.

**Embedding model versioning.** Switching embedding models requires re-embedding your entire corpus because vectors from different models are not comparable. Few systems have a documented migration path for this.

**What chunk size is right for your data?** The answer is always "it depends," but the field has no standard benchmark methodology for measuring retrieval quality at different chunk sizes on domain-specific corpora.

---

## Related Concepts and Projects

- Retrieval-Augmented Generation: semantic search provides the retrieval layer
- [SimpleMem](../projects/simplemem.md): uses semantic search for lifelong agent memory with multimodal support
- [claude-mem](../projects/claude-mem.md): hybrid SQLite FTS5 + Chroma semantic search for session continuity

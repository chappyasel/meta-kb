---
entity_id: hybrid-retrieval
type: approach
bucket: knowledge-bases
abstract: >-
  Hybrid Retrieval combines keyword search (BM25) and vector similarity to cover
  both exact lexical matches and semantic relevance, outperforming either method
  alone on mixed-vocabulary or evolving knowledge bases.
sources:
  - repos/getzep-graphiti.md
  - repos/supermemoryai-supermemory.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - rag
  - semantic-memory
  - graphiti
  - zep
  - episodic-memory
  - mcp
  - bm25
  - knowledge-graph
  - vector-database
last_compiled: '2026-04-07T00:55:15.638Z'
---
# Hybrid Retrieval

## What It Is

Hybrid retrieval runs two complementary search pipelines against the same corpus and merges their results. [BM25](../concepts/bm25.md) scores documents by term frequency and inverse document frequency, rewarding exact token matches. [Vector databases](../concepts/vector-database.md) score by cosine or dot-product similarity between dense embeddings, capturing paraphrases and related concepts that share no surface vocabulary.

Neither alone is sufficient. BM25 misses "What hotels are near the airport?" when a document says "accommodations adjacent to the terminal." Vector search misses exact product codes, named entities, and rare technical terms that embeddings smooth over or conflate with neighbors. Hybrid retrieval addresses both gaps simultaneously.

The approach is central to production [RAG](../concepts/rag.md) systems and is implemented by major memory frameworks including [Graphiti](../projects/graphiti.md), [Zep](../projects/zep.md), and [Supermemory](../projects/supermemory.md), as well as general search infrastructure like [Elasticsearch](../projects/elasticsearch.md) and [Qdrant](../projects/qdrant.md).

## How It Works

### The Three Core Components

**BM25 (lexical)**: Tokenizes the query and document, computes TF-IDF-style scores, and handles sparse high-dimensional matching. Fast, interpretable, requires no GPU, degrades gracefully on out-of-vocabulary terms.

**Vector similarity (semantic)**: Encodes query and candidate passages into dense vectors via an [embedding model](../concepts/embedding-model.md), then retrieves approximate nearest neighbors (ANN) from a vector index. Captures intent and paraphrase but treats each token as a point in continuous space, losing precision on exact strings.

**Fusion and reranking**: Merges the two ranked lists into a single result set. The standard algorithm is Reciprocal Rank Fusion (RRF): for each document, sum `1 / (k + rank)` across all lists where `k` is a smoothing constant (typically 60). RRF is parameter-light and robust to score scale differences between BM25 and cosine similarity, which are not directly comparable. Weighted linear combination is an alternative but requires calibrating weights against a held-out set.

### Implementation Patterns

**Parallel execution**: Both searches run concurrently against the same index or separate indices, then merge. This is the dominant pattern in production systems.

**Sequential with expansion**: Run BM25 first as a cheap candidate filter, then re-score the shortlist with vector similarity. Lower infrastructure cost but loses some recall from BM25 misses.

**Re-ranking on top**: After fusion, pass the merged list to a cross-encoder that scores each candidate independently against the full query. Cross-encoders are more accurate than bi-encoders but cannot scale to full-corpus retrieval, so they operate only on the already-filtered list. Graphiti's `COMBINED_HYBRID_SEARCH_CROSS_ENCODER` config uses this three-stage pipeline.

**Graph traversal as a third signal**: Graphiti adds breadth-first graph traversal (BFS) from recently-mentioned entities as a third retrieval channel alongside BM25 and cosine similarity. The Zep paper explains the rationale: BFS captures contextual similarity, surfacing nodes that appear in similar conversational contexts even when they share no vocabulary or semantic proximity with the query.

### What Gets Searched

Most implementations apply hybrid retrieval across multiple field types simultaneously:

- Raw document text (episodic content, chunks)
- Entity names and summaries
- Relationship descriptions (fact triples)
- Community or cluster summaries

Graphiti runs cosine, BM25, and BFS against fact fields, entity names, community names, and episode content in parallel, then applies a reranker over the merged list.

### Fusion Algorithms Compared

| Algorithm | How it works | When to use |
|---|---|---|
| RRF | `sum(1/(k+rank))` per document across lists | Default; no calibration needed |
| Weighted sum | `alpha * BM25_score + (1-alpha) * cosine_score` | When you can tune alpha against labeled data |
| Maximal Marginal Relevance (MMR) | Maximize relevance while minimizing similarity to already-selected results | When result diversity matters more than precision |
| Cross-encoder reranking | Full query-passage scoring via neural model | Highest accuracy, high latency, only for small candidate sets |

## Why It Matters for Agent Knowledge Bases

Agent memory systems store heterogeneous content: user preferences stated as conversational prose, technical facts with exact identifiers, evolving entity states, and structured data. No single retrieval method covers this range.

The Zep paper (arXiv:2501.13956) demonstrates the concrete value: on LongMemEval with 115k-token conversations, hybrid retrieval plus graph traversal achieves 18.5% accuracy improvement over full-context baselines while reducing context from 115k to ~1.6k tokens, a 90% latency reduction. The paper specifically credits the three-signal design: "BM25 targets word similarities, cosine targets semantic similarities, and BFS targets contextual similarities."

Supermemory claims #1 on LongMemEval at 81.6% accuracy, attributing its performance partly to combining RAG-style document retrieval with memory-specific fact extraction in a unified query. These numbers are self-reported by the respective vendors.

[Elasticsearch](../projects/elasticsearch.md)'s multi-layer memory architecture article notes a direct benefit beyond accuracy: filtering the search space with structured metadata (user ID, memory type, timestamp) before running semantic retrieval reduces the vector scoring workload, lowers token usage, and focuses model attention. Selective hybrid retrieval improves both accuracy and cost.

## Strengths

**Complementary coverage**: Rare terms, product codes, and proper nouns that embeddings conflate are handled by BM25; paraphrases and concept drift are handled by vectors.

**No tuning required for basic use**: RRF works well out-of-the-box without held-out labeled data.

**Incremental adoption**: Systems with existing BM25 infrastructure can add vector search without replacing it.

**Better on temporal and factual queries**: When documents contain specific dates, names, or codes that a query references verbatim, BM25 ensures they rank highly regardless of embedding space behavior.

## Critical Limitations

**Failure mode — embedding model vocabulary mismatch**: If the embedding model was not trained on domain-specific vocabulary (medical, legal, financial), vector similarity scores degrade for domain-specific queries. In this scenario, hybrid retrieval falls back to BM25 for most of the work, and the fusion overhead adds latency with minimal accuracy benefit. This is a common production surprise: teams adopt hybrid retrieval expecting the vector component to handle technical terminology, and it doesn't.

**Infrastructure assumption**: The standard hybrid pipeline assumes the same corpus is searchable via both a BM25 index and a vector ANN index, maintained in sync. This requires either a single system that supports both (Elasticsearch, Qdrant, Weaviate) or two separate indices with synchronized writes. Most documentation glosses over the synchronization problem; in practice, index lag causes inconsistent results where BM25 and vector search return results from different corpus states.

## When Not to Use It

**Latency-critical paths under ~50ms**: The parallel execution of two retrieval calls plus a merge step adds overhead. For real-time response paths where a degraded single-signal retrieval is acceptable, the added complexity is not worth it.

**Uniform, structured corpora**: If your knowledge base consists entirely of short, highly structured records (product catalog with SKUs, calendar entries), BM25 alone typically matches query terms precisely and vector search adds noise. Hybrid retrieval's value is proportional to vocabulary diversity.

**When you lack a quality embedding model for your domain**: If embeddings are generic (e.g., `text-embedding-ada-002` on specialized medical notes), the vector channel contributes little to accuracy while doubling the retrieval cost. Better to improve the embedding model first.

**When corpus size is very small (<1k documents)**: At small scale, exhaustive BM25 is fast enough to skip vector indexing entirely, and the ANN approximation in vector search introduces unnecessary noise.

## Relationship to Adjacent Concepts

Hybrid retrieval is a core mechanism in [Retrieval-Augmented Generation](../concepts/rag.md), particularly [Agentic RAG](../concepts/agentic-rag.md) where multiple retrieval steps feed into agent reasoning. [Semantic Memory](../concepts/semantic-memory.md) systems rely on it to surface facts across sessions. [Knowledge Graphs](../concepts/knowledge-graph.md) extend the pattern by adding graph traversal as a third signal (as in Graphiti). [Context Compression](../concepts/context-compression.md) often operates downstream of hybrid retrieval, condensing the merged result set before injecting it into the context window.

[Personalized PageRank](../concepts/personalized-pagerank.md) represents a structurally similar idea applied to graphs: seeding from a query node and propagating relevance scores through edges, used in [HippoRAG](../projects/hipporag.md) as an alternative to BFS.

## Unresolved Questions

**Optimal fusion weights are corpus-specific**: The `k` constant in RRF and the relative weighting between BM25 and vector signals are typically set by intuition or grid search. There is no consensus method for deriving them from first principles for a new domain.

**How to handle temporal drift**: When documents in the knowledge base update frequently (as in agent memory with temporal edge invalidation), the BM25 index and vector index may desynchronize. None of the major implementations document their synchronization strategy or the accuracy impact of index lag.

**Cross-encoder cost at scale**: Cross-encoder reranking significantly improves result quality but requires a forward pass per candidate pair. The practical candidate set size ceiling (typically 50–200 documents) where cross-encoders remain viable at production latency is not well-documented across different hardware configurations.

**Evaluation methodology inconsistency**: Vendors report hybrid retrieval benchmarks on different datasets (LongMemEval, DMR, BEIR) with different baselines, making direct comparison across systems unreliable. Supermemory's #1 LongMemEval claim (81.6%) and Zep's (63.8% with gpt-4o-mini) are both self-reported and use different model configurations, so the gap does not isolate the retrieval mechanism.

## Alternatives

| Approach | Use when |
|---|---|
| BM25 only | Corpus is structured, queries are exact, latency is critical |
| Vector-only | Vocabulary is diverse, exact matches are rare, domain embedding model is available |
| [Knowledge Graph](../concepts/knowledge-graph.md) traversal | Relationships between entities matter more than document similarity; queries require multi-hop reasoning |
| [RAPTOR](../projects/raptor.md) hierarchical retrieval | Document corpus has hierarchical structure; coarse-to-fine retrieval improves accuracy more than hybrid fusion |
| Re-ranking only | BM25 recall is high but precision is low; no vector index available |

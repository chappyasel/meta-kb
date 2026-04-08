---
entity_id: retrieval-augmented-generation
type: concept
bucket: knowledge-substrate
abstract: >-
  RAG combines retrieval from external knowledge stores with LLM generation,
  injecting retrieved documents into context before generating. Differentiator:
  grounds outputs in up-to-date, citable information outside model weights, at
  the cost of retrieval quality becoming the primary bottleneck.
sources:
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - repos/getzep-graphiti.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - repos/aiming-lab-simplemem.md
  - repos/supermemoryai-supermemory.md
  - repos/osu-nlp-group-hipporag.md
  - repos/microsoft-llmlingua.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/mirix-ai-mirix.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/topoteretes-cognee.md
  - repos/volcengine-openviking.md
  - repos/caviraoss-openmemory.md
  - repos/evoagentx-evoagentx.md
  - repos/memvid-memvid.md
  - repos/kepano-obsidian-skills.md
  - repos/mem0ai-mem0.md
  - repos/laurian-context-compression-experiments-2508.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - repos/infiniflow-ragflow.md
  - repos/michaelliv-napkin.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/evoagentx-evoagentx.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - knowledge-graph
  - context-management
  - model-context-protocol
  - agent-memory
  - openai
  - semantic-search
  - openclaw
  - episodic-memory
  - claude
  - graphrag
  - obsidian
  - claude-code
  - context-engineering
  - semantic-memory
  - long-term-memory
  - letta
  - multi-agent-systems
  - vector-database
  - longmemeval
  - markdown-wiki
  - andrej-karpathy
  - react
  - langchain
  - opencode
  - locomo
  - graphiti
  - gemini
  - grpo
  - procedural-memory
  - gpt-4
  - crewai
  - dspy
  - memgpt
  - hipporag
  - hybrid-search
  - temporal-reasoning
  - reinforcement-learning
  - synthetic-data-generation
  - zettelkasten
  - marp
  - ollama
  - zep
  - mem0
  - claude-md
  - hotpotqa
  - ace
  - bm25
  - evoagentx
  - langgraph
  - lost-in-the-middle
  - core-memory
  - community-detection
  - autogen
  - context-compression
  - raptor
  - cognitive-architecture
  - openmemory
  - textgrad
  - lightrag
  - memorybank
  - chain-of-thought
  - personalized-pagerank
  - deepseek
  - gaia
  - termination-bench
  - multihop-rag
last_compiled: '2026-04-08T02:37:43.129Z'
---
# Retrieval-Augmented Generation (RAG)

## What It Is

Retrieval-Augmented Generation describes a class of techniques where relevant documents are fetched from an external knowledge store and placed into an LLM's context before generation. The model generates a response conditioned on both its parametric knowledge (encoded in weights) and the retrieved non-parametric context.

The original RAG paper (Lewis et al., 2020, Meta AI) combined a dense retriever (DPR) with a sequence-to-sequence generator (BART), treating the combination as a single probabilistic model. That framing has since expanded into a broad architectural category covering everything from a single `vector_db.search()` call to multi-hop agentic retrieval systems.

RAG occupies the "knowledge substrate" role in agent architectures: it provides factual grounding for [Semantic Memory](../concepts/semantic-memory.md), the mechanism behind [Long-Term Memory](../concepts/long-term-memory.md) in most deployed systems, and the primary tool for keeping agents current beyond their training cutoff.

---

## Why It Matters

Three problems drive RAG adoption:

**Stale parametric knowledge.** Model weights encode the world as it existed at training cutoff. RAG provides access to current documents without retraining.

**Hallucination grounding.** Models generating from weights alone have no mechanism to distinguish confident confabulation from retrieved fact. Retrieved documents provide attributable evidence.

**Context specificity.** Enterprise deployments require domain-specific knowledge (internal documentation, product specs, customer data) that will never appear in pretraining corpora. RAG makes such knowledge accessible without fine-tuning.

The [Context Engineering](../concepts/context-engineering.md) survey formalizes the RAG value proposition through information theory: the goal is to maximize I(Y*; c_know | c_query) — the mutual information between the answer and the retrieved knowledge given the query. More concretely, the survey's most important empirical finding is a fundamental asymmetry: LLMs comprehend complex contexts far better than they generate comparably sophisticated outputs from sparse ones. This means investing in retrieval quality yields higher returns than prompt engineering the generation side.

---

## How It Works

### The Basic Pipeline

```
query
  → embed query → vector representation
  → search(vector_store, k=10) → ranked document chunks
  → assemble_context(query, chunks) → populated prompt
  → LLM.generate(prompt) → response
```

Every real system adds layers on top of this skeleton, but the skeleton defines what makes something RAG: retrieval happens at inference time, retrieved content enters the context window, and generation is conditioned on that content.

### Retrieval Mechanisms

**Dense retrieval** converts queries and documents into vectors; retrieval is a nearest-neighbor search in embedding space. Works well when semantic similarity predicts relevance — a document about "myocardial infarction" should retrieve when querying "heart attack" even without lexical overlap.

**Sparse retrieval** ([BM25](../concepts/bm25.md)) uses term frequency statistics. Fast, interpretable, and still competitive or superior for keyword-heavy domains (legal, technical, medical) where exact terminology matters.

**[Hybrid Search](../concepts/hybrid-search.md)** combines both, typically with reciprocal rank fusion. Most production systems use hybrid: sparse handles lexical precision, dense handles semantic generalization. The relative weighting is a tuning parameter.

### Chunking

Documents must be split before indexing. Chunking strategy has outsized impact on retrieval quality:

- **Fixed-size** (256, 512 tokens): Simple, predictable. The RAG vs GraphRAG paper used 256-token chunks throughout; the GraphRAG paper found that 600-token chunks extract 2x more entities during graph construction at 4x more LLM calls.
- **Sentence/paragraph-aware**: Avoids cutting semantic units mid-thought.
- **Hierarchical** ([RAPTOR](../projects/raptor.md)): Builds a tree of summaries at multiple granularities, enabling retrieval at the right abstraction level.
- **Semantic**: Groups sentences by embedding similarity rather than position.

No universally optimal chunk size exists. Smaller chunks increase retrieval precision (less noise per chunk) but lose surrounding context needed for comprehension. Larger chunks preserve context but dilute relevance scores.

### Indexing and Storage

Retrieved documents live in [Vector Databases](../concepts/vector-database.md). The practical options differ on hosting model (managed vs. self-hosted), scale, and filtering capabilities:

- **[Pinecone](../projects/pinatone.md)**: Managed, production-grade, metadata filtering.
- **[ChromaDB](../projects/chromadb.md)**: Local-first, good for development.
- **Qdrant, Weaviate, Milvus**: Self-hosted, various trade-offs.
- **pgvector**: PostgreSQL extension, reduces infrastructure count.
- **FAISS**: In-memory, for research and embedded use.

The choice of embedding model matters as much as the database. OpenAI's text-embedding-3-small/large, Cohere's embed-v3, and open-source models (BGE, E5) occupy different cost/quality trade-offs.

### Context Assembly

Retrieved chunks must be assembled into a prompt. Two concerns:

**Ordering matters.** The [Lost in the Middle](../concepts/lost-in-the-middle.md) finding (Liu et al., 2023) showed LLMs systematically underweight information placed in the middle of long contexts. Highest-relevance chunks should appear at the beginning and end. Frameworks often silently assemble chunks in retrieval rank order, unknowingly placing the third-ranked chunk in the optimal position and the first-ranked in the middle.

**Deduplication and reranking.** Raw retrieval returns k candidates, not k useful chunks. Cross-encoder rerankers (Cohere Rerank, BGE-Reranker) score query-chunk pairs jointly and are significantly more accurate than embedding similarity for relevance assessment. This two-stage approach (fast embedding retrieval + slow cross-encoder reranking) is now standard in high-quality production pipelines.

---

## Variants and Extensions

### Agentic RAG

The original RAG formulation retrieves once and generates once. Agentic RAG iterates: the LLM reads retrieved content, identifies gaps, formulates follow-up queries, retrieves again, and continues until it has enough information to answer. [ReAct](../concepts/react.md) provides the standard pattern (Reason + Act, where Act includes `search` tool calls).

Self-RAG (Asai et al., 2023) goes further: the model generates reflection tokens that indicate whether retrieval is needed, whether retrieved passages are relevant, and whether its generation is supported by retrieved content. This moves retrieval decisions inside the model rather than hardcoding them in the pipeline.

### Multi-hop RAG

Many questions require information from multiple documents that are not individually sufficient. "What did the CEO who founded the company in [city] do before joining?" requires retrieving the company, then the CEO, then their prior role — three hops.

[Multi-hop RAG](../concepts/retrieval-augmented-generation.md) systems handle this through iterative retrieval where each step's output informs the next query. [HotpotQA](../projects/hotpotqa.md) is the standard benchmark for evaluating multi-hop retrieval quality.

### Graph-Enhanced RAG

Standard RAG retrieves chunks independently. If the answer requires synthesizing across entities that appear in different documents, embedding similarity alone cannot bridge those connections.

[GraphRAG](../projects/graphrag.md) (Microsoft) constructs a knowledge graph from the document corpus via LLM-driven entity and relationship extraction, then performs community detection to create hierarchical summaries. Retrieval uses entity neighborhoods (local search) or community summaries (global search).

[HippoRAG](../projects/hipporag.md) takes a different approach: it models documents as a knowledge graph with Personalized PageRank for retrieval, inspired by the hippocampal indexing theory of human memory.

LightRAG adds dual-level retrieval (local entity + global graph structure).

The key empirical finding from the RAG vs. GraphRAG evaluation: GraphRAG wins on multi-hop (+0.72 to +1.62 F1) and dramatically on temporal reasoning (+23.33 F1 on MultiHop-RAG), while standard RAG wins on single-hop factual queries (+1.77 to +2.74 F1). Combining both — concatenating their retrieval results — yields +6.4% on multi-hop tasks (self-reported, single paper).

### RAG in Memory Systems

[Agent Memory](../concepts/agent-memory.md) architectures use RAG as the access mechanism for [Episodic Memory](../concepts/episodic-memory.md) and [Semantic Memory](../concepts/semantic-memory.md). [MemGPT](../projects/memgpt.md) / [Letta](../projects/letta.md) uses `archival_memory_search` (a vector similarity search) to page relevant memories into the context window — RAG applied to the agent's own accumulated knowledge rather than an external document corpus. [Mem0](../projects/mem0.md) and [Zep](../projects/zep.md) similarly use RAG as the retrieval mechanism while adding entity extraction and graph structures on top.

[EvoAgentX](../projects/evoagentx.md) implements a full RAG pipeline in `evoagentx/rag/` with chunkers, embeddings, multiple index types, retrievers, and postprocessors as part of its `LongTermMemory` implementation for agents.

### [Context Compression](../concepts/context-compression.md)

Retrieved chunks consume context budget. Compression techniques reduce this cost:

- **Selective extraction**: Keep only sentences directly relevant to the query (LLMLingua, Selective Context).
- **Summarization**: Distill retrieved chunks into denser representations.
- **Token pruning**: Remove function words and low-salience tokens.
- **Hierarchical compression**: Summarize groups of chunks, then retrieve from summaries.

OpenMemory implements a purely algorithmic compression engine with three levels (semantic, syntactic, aggressive) achieving 4-8x compression with moderate information loss, cached by content hash.

---

## Key Numbers

Performance figures require careful interpretation because nearly all RAG benchmarks are self-reported by researchers proposing new variants:

| Task | Standard RAG | GraphRAG (Local) | Source |
|------|-------------|-----------------|--------|
| NQ single-hop F1 (Llama 70B) | 68.18 | 65.44 | RAG vs GraphRAG paper |
| HotPotQA multi-hop F1 (Llama 70B) | 63.88 | 64.60 | RAG vs GraphRAG paper |
| MultiHop temporal F1 | 25.73 | 49.06 | RAG vs GraphRAG paper |
| Hybrid (RAG + GraphRAG) multi-hop gain | +6.4% | | Same paper |

The RAG vs. GraphRAG comparison is notable for using a unified evaluation protocol, making it more credible than most comparisons in the literature. Still self-reported; independent replication has not been published.

The ~34% entity extraction miss rate in KG construction (both HotPotQA and NQ datasets) is the most important number for practitioners considering graph-enhanced RAG: if the answer-relevant entity was not extracted during indexing, graph retrieval cannot find it regardless of query quality.

---

## Ecosystem

RAG is implemented across nearly every agent framework:

- **[LangChain](../projects/langchain.md)**: `RetrievalQA`, `RAGChain`, extensive document loader and splitter ecosystem. Most feature-complete, most complex.
- **[LlamaIndex](../projects/llamaindex.md)**: Built specifically around indexing and retrieval. Cleaner RAG-focused API. Better for complex retrieval pipelines.
- **[LangGraph](../projects/langgraph.md)**: Graph-based workflows for agentic RAG with explicit control over retrieval loops.
- **[DSPy](../projects/dspy.md)**: Treats retrieval as an optimizable module. Can automatically optimize retrieval parameters and prompts for a given task metric.
- **[EvoAgentX](../projects/evoagentx.md)**: RAG as `LongTermMemory` for agents, plus a `RealMMRAG` benchmark for multimodal RAG evaluation.

---

## Strengths

**Handles factual grounding well.** For questions with definite answers in source documents, RAG with good retrieval consistently outperforms generation from parametric knowledge alone. The improvement is particularly pronounced for domain-specific or recent information.

**Attributable outputs.** Retrieved chunks provide source citations. This is not a nice-to-have for enterprise deployments — it is often a compliance requirement.

**Knowledge updates without retraining.** Adding documents to the vector index changes what the system knows immediately, without any model update. This is orders of magnitude cheaper than fine-tuning for knowledge update use cases.

**Works with any LLM.** RAG is retrieval-mechanism-agnostic and LLM-agnostic. The same retrieval pipeline works with [GPT-4](../projects/gpt-4.md), [Claude](../projects/claude.md), [Gemini](../projects/gemini.md), or local models via [Ollama](../projects/ollama.md).

---

## Critical Limitations

**Concrete failure mode: retrieval quality is the hard ceiling.** If the relevant document is not retrieved — due to embedding mismatch, chunking artifacts, metadata filtering errors, or the ~34% entity miss rate in knowledge graph construction — no amount of prompt engineering or model capability recovers the answer. The model cannot retrieve what the retriever did not return. This is fundamentally different from parametric knowledge, where the model at least has a chance of interpolating an answer. In production systems, retrieval recall on the relevant document set is the metric that matters most, but it is rarely measured directly.

**Unspoken infrastructure assumption: embedding models are stable.** Every production RAG system assumes the embedding model that indexed the documents is the same model used at query time. Upgrading your embedding model (e.g., from text-embedding-ada-002 to text-embedding-3-large) requires re-embedding the entire corpus. In systems with millions of documents, this is a significant planned migration, not a routine update. Many teams discover this constraint only after their first embedding model upgrade.

---

## When NOT to Use RAG

**When query latency is the primary constraint and the knowledge fits in context.** RAG adds at minimum one round-trip to the vector store (5-50ms) plus reranking time (50-200ms for cross-encoder). For sub-100ms response requirements with small, stable knowledge bases, loading documents directly into a long context window (no retrieval) eliminates the latency overhead and the retrieval error rate.

**When the task requires synthesis across the entire corpus.** RAG retrieves k chunks; if understanding requires integrating information distributed across hundreds of documents, GraphRAG's community summarization or direct full-corpus summarization is more appropriate. Using RAG for corpus-level questions produces answers grounded in the top-k chunks, which may be systematically unrepresentative.

**When knowledge is relational and multi-hop paths are the norm.** If most queries require connecting information across entities (organizational relationships, causal chains, temporal sequences), [Knowledge Graph](../concepts/knowledge-graph.md) approaches provide structural support that embedding similarity over flat chunks cannot replicate.

**When the knowledge base changes continuously.** Real-time document streams require incremental indexing. While technically possible, maintaining a high-quality vector index over rapidly changing documents introduces consistency problems (stale embeddings, duplicate chunks, version conflicts) that compound over time. Event-driven architectures with careful index management are required; RAG is not plug-and-play for streaming knowledge.

**When precision matters more than recall and the parametric model is already well-calibrated.** For tasks where the model reliably knows the answer from training (standard coding questions, common factual queries within training distribution), adding RAG introduces a failure mode (bad retrieval → worse answer) without corresponding benefit. RAG helps most when the model lacks the knowledge; it can hurt when it doesn't.

---

## Unresolved Questions

**How to measure retrieval quality in production.** F1 and exact match on benchmark datasets do not transfer to production. Most teams cannot label whether retrieval was correct for arbitrary queries at scale. Without retrieval quality metrics, debugging is guesswork.

**Optimal chunk size for a given domain.** Every practitioner has rules of thumb (256 tokens for FAQ, 512 for narrative text, etc.), but no principled method exists for selecting chunk size given a document corpus and query distribution. Ablation studies exist in individual papers but do not generalize.

**When to use reranking vs. larger k.** Retrieving k=50 and truncating beats k=10 on recall; cross-encoder reranking beats larger k on precision. The cost-quality tradeoff depends on reranker latency, embedding model quality, and query characteristics. No general guidance exists.

**Continual indexing at scale.** The [Continual RAG](../concepts/continual-rag.md) problem — maintaining accurate retrieval over continuously updated document sets without full re-indexing — lacks a settled solution. Incremental HNSW updates, deleted vector handling, and consistency between sparse and dense indices under concurrent writes are all active engineering problems.

**GraphRAG indexing cost vs. retrieval benefit.** The GraphRAG paper reports community detection and entity extraction requires many LLM calls (cost depends on corpus size). The retrieval benefit is +23.33 F1 on temporal queries. For a corpus of 100K documents, the indexing cost at current API prices could run to hundreds of dollars, with unclear amortization over query volume. No published cost-benefit analysis covers realistic production scales.

---

## Alternatives and Selection Guidance

| When to choose | Alternative |
|---|---|
| Queries require connecting entities across documents | [GraphRAG](../projects/graphrag.md) or [HippoRAG](../projects/hipporag.md) |
| Full-corpus synthesis needed | [RAPTOR](../projects/raptor.md) (hierarchical summarization) |
| Agent needs memory across sessions | [Letta](../projects/letta.md) (editable context blocks) or [Mem0](../projects/mem0.md) (fact extraction) |
| Knowledge is structured and relational | [Knowledge Graph](../concepts/knowledge-graph.md) with [Graphiti](../projects/graphiti.md) or [Neo4j](../projects/neo4j.md) |
| Knowledge fits in context window | Direct context loading, no retrieval |
| Need prompt/retrieval co-optimization | [DSPy](../projects/dspy.md) (treats retrieval as optimizable module) |
| Personal notes / knowledge management | [Obsidian](../projects/obsidian.md), [Zettelkasten](../concepts/zettelkasten.md) (human-curated, not automated) |

Use RAG when: your knowledge exceeds context limits, documents change over time, attribution to sources is required, and most queries are answerable from a single retrieved passage or a small set of passages. Use hybrid RAG + graph when multi-hop reasoning or temporal queries are common. Use neither when the parametric model already knows the answer or when the knowledge is small enough to load directly.

---

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — the broader discipline of which RAG is one component
- [Semantic Search](../concepts/semantic-search.md) — the retrieval mechanism RAG depends on
- [Hybrid Search](../concepts/hybrid-search.md) — combining dense and sparse retrieval
- [Vector Database](../concepts/vector-database.md) — infrastructure for RAG indexing
- [Context Compression](../concepts/context-compression.md) — reducing retrieved content to fit context budgets
- [Lost in the Middle](../concepts/lost-in-the-middle.md) — why chunk ordering in assembled context matters
- [Agent Memory](../concepts/agent-memory.md) — how RAG fits into broader agent memory architectures
- [Long-Term Memory](../concepts/long-term-memory.md) — RAG as the access layer for persistent knowledge
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — RAG in distributed agent coordination

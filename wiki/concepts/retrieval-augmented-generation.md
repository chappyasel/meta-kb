---
entity_id: retrieval-augmented-generation
type: concept
bucket: knowledge-substrate
abstract: >-
  RAG grounds LLM outputs in external knowledge by retrieving relevant documents
  at inference time; its agentic variants let agents decide dynamically when and
  what to retrieve, enabling multi-hop reasoning across knowledge sources.
sources:
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/evoagentx-evoagentx.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/osu-nlp-group-hipporag.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - repos/aiming-lab-simplemem.md
  - repos/caviraoss-openmemory.md
  - repos/evoagentx-evoagentx.md
  - repos/getzep-graphiti.md
  - repos/infiniflow-ragflow.md
  - repos/kepano-obsidian-skills.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/laurian-context-compression-experiments-2508.md
  - repos/mem0ai-mem0.md
  - repos/memvid-memvid.md
  - repos/michaelliv-napkin.md
  - repos/microsoft-llmlingua.md
  - repos/mirix-ai-mirix.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/osu-nlp-group-hipporag.md
  - repos/supermemoryai-supermemory.md
  - repos/topoteretes-cognee.md
  - repos/volcengine-openviking.md
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
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
  - agentic-rag
  - claude-code
  - context-engineering
  - semantic-memory
  - long-term-memory
  - letta
  - multi-agent-systems
  - vector-database
  - longmemeval
  - hipporag
  - markdown-wiki
  - andrej-karpathy
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
  - notion
  - token-efficiency
last_compiled: '2026-04-08T22:54:33.481Z'
---
# Retrieval-Augmented Generation (RAG)

## What It Is

Retrieval-Augmented Generation combines two components: a retrieval system that fetches relevant documents from an external corpus, and a generative model that conditions its output on those documents. The motivating problem is straightforward — LLMs have a training cutoff, finite parametric knowledge, and no access to private or specialized information. RAG addresses all three by moving knowledge out of model weights and into queryable stores that can be updated without retraining.

The mechanism at its simplest: given a query, retrieve the top-k relevant documents, prepend them to the context, generate a response. Every word in that sentence hides design decisions with significant downstream consequences.

Lewis et al. (2020) introduced the formal framing. The approach treats both the retriever and generator as components in a single probabilistic pipeline: P(output | query) = ∫ P(output | query, doc) P(doc | query) d(doc), marginalized over retrieved documents. In practice, implementations take the top-k retrieved documents rather than marginalizing over the full corpus.

## Why It Matters

RAG's core value proposition is **knowledge currency and domain specificity at lower cost than fine-tuning**. Fine-tuning embeds knowledge in weights — expensive, slow to update, and opaque about what the model knows. RAG externalizes knowledge — updatable in real time, inspectable, and attributable to specific sources.

This shapes how the concept relates to [Context Engineering](../concepts/context-engineering.md): RAG is one of the primary mechanisms for populating the `c_know` component of the context assembly function. The survey formalized by Mei et al. identifies RAG as instantiating the information-theoretic goal of maximizing I(Y*; c_know | c_query) — retrieved context should be maximally informative for the task, not just superficially similar to the query.

## Core Architecture: How It Works

### The Retrieval Pipeline

**Indexing** happens offline. Documents are chunked (typically 256-512 tokens), embedded using a model like OpenAI's text-embedding-ada-002 or a local alternative via [Ollama](../projects/ollama.md), and stored in a [Vector Database](../concepts/vector-database.md) like [FAISS](../projects/faiss.md), [Qdrant](../projects/qdrant.md), or [ChromaDB](../projects/chromadb.md). Chunk size matters: 256-token chunks miss cross-sentence context; 1024-token chunks dilute the embedding signal with noise. The empirically common sweet spot sits around 512 tokens with 10-20% overlap.

**Retrieval** operates at query time. The query is embedded using the same model (critical — embedding spaces are model-specific), and approximate nearest neighbor search retrieves top-k chunks by cosine similarity. [Semantic Search](../concepts/semantic-search.md) captures conceptual similarity; [BM25](../concepts/bm25.md) captures lexical overlap. Neither dominates universally.

**Hybrid search** combines both via Reciprocal Rank Fusion or weighted combination. BM25 handles exact keyword matches that embedding models miss; semantic search handles paraphrases and synonyms that BM25 misses. Most production systems use hybrid retrieval.

**Reranking** applies a cross-encoder model that scores (query, document) pairs jointly rather than embedding them separately. Cross-encoders are more accurate than bi-encoders (separate query/document embeddings) but cannot be precomputed, so they run only on the top-N retrieved candidates. Common: retrieve top-50, rerank to top-10.

### Context Assembly

Retrieved chunks are formatted and inserted into the prompt. Ordering matters. The [Lost in the Middle](../concepts/lost-in-the-middle.md) phenomenon: LLMs perform best when relevant content appears at the beginning or end of the context, not buried in the middle. For a 10-document context, the most relevant document should be first or last — not 5th.

### Generation

The LLM generates conditioned on both the query and the retrieved context. The quality of generation depends on retrieval quality more than model size. A smaller model with excellent retrieval often beats a larger model with mediocre retrieval.

## Major Architectural Variants

### Naive RAG

The original pattern: retrieve once, generate once. Suitable when queries have single-hop answers findable in a single document. Breaks down on:
- Multi-hop questions requiring information synthesis across documents
- Temporal questions where document order matters
- Questions where the answer requires combining entity relationships

### Graph-Enhanced RAG

Systems like [GraphRAG](../projects/graphrag.md), [HippoRAG](../projects/hipporag.md), LightRAG, and [RAPTOR](../projects/raptor.md) address RAG's fundamental limitation: flat chunk retrieval cannot synthesize information across disconnected documents.

The RAG vs. GraphRAG benchmark (Han et al.) provides the clearest empirical picture:

| Query Type | RAG (F1) | GraphRAG Local (F1) | Winner |
|---|---|---|---|
| Inference | 94.85 | 92.03 | RAG |
| Comparison | 56.31 | 60.16 | GraphRAG |
| Temporal | 25.73 | 49.06 | GraphRAG |
| Overall (MultiHop-RAG) | 65.77 | 71.17 | GraphRAG |

The temporal reasoning gap (+23 points) is striking. Graph structure captures temporal relationships between entities that flat text retrieval cannot represent. For single-hop factual lookup, RAG wins by 1-2 F1 points.

**Critical graph-RAG limitation**: LLM-based entity extraction misses approximately 34% of answer-relevant entities (measured on HotPotQA and Natural Questions). This creates a hard ceiling on graph-only retrieval — if the entity wasn't extracted during indexing, it cannot be retrieved. The triplets+text variant partially compensates by preserving links to source passages.

**Hybrid integration beats selection**: Concatenating RAG and GraphRAG retrieval results yields +6.4% improvement over RAG alone on multi-hop tasks. Routing queries to one system based on type yields only +1.1%. The retrieval systems capture complementary evidence that neither captures alone.

[RAPTOR](../projects/raptor.md) takes a different graph approach: recursive summarization and hierarchical clustering creates a tree of abstractions at multiple granularities. Queries requiring high-level synthesis hit upper tree nodes; queries requiring specific detail hit leaf nodes.

### Agentic RAG

[Agentic RAG](../concepts/agentic-rag.md) gives the model control over retrieval strategy rather than treating retrieval as a fixed preprocessing step. Self-RAG teaches models to predict whether retrieval is needed for a given query, what to retrieve, and whether the retrieved content is relevant and sufficient. This reduces unnecessary retrieval on questions the model can answer from parametric knowledge.

Iterative retrieval patterns (used in [HippoRAG](../projects/hipporag.md) via Personalized PageRank) let the model retrieve, reason, identify gaps, and retrieve again. This directly addresses multi-hop reasoning: the model can follow chains of evidence across multiple retrieval steps. [EvoAgentX](../projects/evoagentx.md)'s RAG pipeline (`evoagentx/rag/`) implements chunkers, embeddings, multiple index types, retrievers, and postprocessors as composable components — the retrieval pipeline itself becomes optimizable.

Multi-agent RAG systems assign retrieval to specialized agents. In [LangGraph](../projects/langgraph.md) or [AutoGen](../projects/autogen.md) pipelines, a retriever agent fetches documents, a verifier agent checks relevance, a synthesizer agent generates the answer. Coordination overhead partially offsets quality gains for simple queries.

### Multi-Hop RAG

Multi-hop RAG handles queries requiring multiple sequential retrieval steps — "Who is the CEO of the company that acquired the startup founded by the author of X?" Standard implementations use [Chain-of-Thought](../concepts/chain-of-thought.md) decomposition to break multi-hop queries into single-hop sub-queries, retrieve for each, and combine results.

[HotpotQA](../projects/hotpotqa.md) is the standard multi-hop benchmark. [EvoAgentX](../projects/evoagentx.md) reports +7.44% F1 improvement on HotpotQA after workflow optimization over an unoptimized baseline (self-reported; no third-party validation).

### RAG in Agent Memory Systems

[Letta](../projects/letta.md), [Mem0](../projects/mem0.md), and [Zep](../projects/zep.md) use RAG as a component of [Agent Memory](../concepts/agent-memory.md) rather than as a standalone retrieval system. [Letta](../projects/letta.md)'s `archival_memory_search` tool exposes RAG to the agent itself — the agent decides when to retrieve from its own long-term storage. [OpenMemory](../projects/openmemory.md) positions itself explicitly against this model ("Not RAG. Not a vector DB"), arguing that sector-specific decay, composite scoring, and automatic reflection are necessary beyond raw retrieval.

The distinction matters: RAG as a knowledge retrieval mechanism (for answering questions) differs from RAG as a memory retrieval mechanism (for maintaining agent state across sessions). The latter requires temporal reasoning, relevance-over-time modeling, and integration with episodic vs. semantic memory distinctions.

## Implementation Details and Key Design Decisions

### Chunking Strategy

Chunk boundaries affect retrieval quality significantly. Sentence-aware chunking outperforms naive fixed-length chunking by preserving semantic units. Hierarchical chunking (small chunks for retrieval, larger parent chunks for context) addresses the precision-context tradeoff: small chunks match precisely, but retrieved answers need surrounding context to make sense. LlamaIndex calls this "parent document retrieval."

[RAPTOR](../projects/raptor.md) generates summaries at multiple levels of abstraction, then embeds and retrieves those summaries. The tree structure enables retrieval at different granularities without requiring the retriever to know which granularity the query needs.

### Embedding Model Selection

Embedding models are not interchangeable. BGE-M3, E5-large, and GTE-large consistently outperform older models on BEIR (Benchmarking Information Retrieval) benchmarks. OpenAI's text-embedding-3-large performs well but at API cost. For [Semantic Memory](../concepts/semantic-memory.md) applications with privacy requirements, local models via [Ollama](../projects/ollama.md) avoid data leaving the system.

Switching embedding models mid-deployment requires re-embedding the entire corpus — embeddings from different models are not comparable.

### Evaluation

Standard RAG evaluation metrics:
- **Retrieval**: Precision@k, Recall@k, MRR (Mean Reciprocal Rank)
- **Generation**: ROUGE-1/2/L, BERTScore, Exact Match for QA
- **End-to-end**: RAGAs (Retrieval Augmented Generation Assessment) measures faithfulness, answer relevancy, context precision, context recall

[GAIA](../projects/gaia.md) and [LongMemEval](../projects/longmemeval.md) test RAG in agentic contexts. LongMemEval specifically tests long-term memory recall across sessions, probing whether RAG-based memory can support conversational continuity.

LLM-as-judge evaluations exhibit systematic position bias — reversing the order of compared system outputs can invert preference judgments. ROUGE/BERTScore metrics better capture factual accuracy; LLM judges favor output diversity. Any comparative evaluation of RAG architectures should use multiple metrics and control for evaluation methodology bias.

## Who Implements It

Virtually every LLM application stack includes some RAG component:

- **Frameworks**: [LangChain](../projects/langchain.md), LlamaIndex, [LangGraph](../projects/langgraph.md) provide RAG pipelines as composable primitives
- **Agent platforms**: [Letta](../projects/letta.md) (`archival_memory_search`), [EvoAgentX](../projects/evoagentx.md) (`evoagentx/rag/`), [AutoGen](../projects/autogen.md)
- **Model providers**: [OpenAI](../projects/openai.md) file search, [Claude](../projects/claude.md) via MCP connectors, DeepSeek built-in retrieval
- **Memory systems**: [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), [OpenMemory](../projects/openmemory.md), [Letta](../projects/letta.md)
- **Knowledge graph variants**: [GraphRAG](../projects/graphrag.md) (Microsoft), HippoRAG, LightRAG
- **Specialized systems**: [Claude Code](../projects/claude-code.md) uses retrieval over codebases; [Notion](../projects/notion.md) AI uses retrieval over workspace content

The [Context Engineering](../concepts/context-engineering.md) survey identifies RAG as the primary implementation mechanism for `c_know` (knowledge context) in the six-component context assembly model.

## Strengths

**Knowledge currency**: A corpus updated daily reflects new information within hours; a fine-tuned model requires days or weeks. RAG is the only viable approach for applications requiring real-time or near-real-time knowledge updates.

**Attribution**: Retrieved chunks carry provenance. The system can show which document each claim came from — crucial for legal, medical, and enterprise applications where source verification matters.

**Cost efficiency at scale**: For domains with large, frequently updated corpora, RAG scales better than repeated fine-tuning. A single vector index serves millions of queries.

**Inspectability**: Retrieved documents are visible. When the system fails, debugging starts with "which documents were retrieved?" rather than "what did the model encode during training?"

**Composability**: RAG is modular. Each component — chunking, embedding, retrieval, reranking, generation — can be swapped independently. [EvoAgentX](../projects/evoagentx.md)'s RAG pipeline explicitly supports multiple index types and postprocessors as interchangeable modules.

## Critical Limitations

### Failure Mode: Entity Extraction Ceiling in Graph-Enhanced RAG

The ~34% entity miss rate in knowledge graph construction is not a parameter to tune — it reflects fundamental limits of LLM-based extraction at scale. For specialized domains (medical, legal, scientific), where terminology is precise and domain-specific, miss rates are likely higher. A system where 34% of answer-relevant entities don't exist in the graph will fail systematically on exactly the complex queries that motivated building the knowledge graph.

Detection is possible (audit retrieval recall against a known test set during indexing) but requires a labeled evaluation corpus that most projects don't invest in building.

### Unspoken Infrastructure Assumption: Stable Embedding Space

RAG systems implicitly assume the embedding model doesn't change. In practice, embedding models improve over time, and upgrading to a better model requires re-embedding the entire corpus. A 10-million-document corpus takes hours to re-embed, requires budget for API calls or GPU time, and cannot be done incrementally — the old and new embeddings are not comparable. Most deployments don't plan for this, and many run degraded retrieval indefinitely after upgrading their LLM without upgrading their embeddings.

### The Comprehension-Generation Asymmetry

The context engineering survey identifies a fundamental asymmetry: LLMs are much better at understanding complex contexts than generating equally sophisticated outputs. RAG exploits this by providing rich retrieved context — but it cannot compensate when the required output is a novel synthesis that no single retrieved document captures. Long-form reasoning tasks requiring genuine integration across many documents fall into this gap.

### Multi-Hop Reasoning Remains Hard

Even with graph-enhanced retrieval, questions requiring more than 2-3 hops consistently fail. Iterative retrieval helps but compounds latency and cost. No current RAG variant reliably handles 5+ hop reasoning chains.

### Context Window as a Hard Constraint

[Lost in the Middle](../concepts/lost-in-the-middle.md) demonstrates that retrieval quality at k=10 degrades relative to k=5 for many queries — more documents isn't always better. Context windows are finite, and inserting 20 retrieved chunks may dilute the 2 relevant ones to the point where the model ignores them. [Context Compression](../concepts/context-compression.md) helps (4-8x compression ratios achievable with moderate information loss) but adds another system component with its own failure modes.

## When NOT to Use RAG

**Reasoning-heavy tasks with no single-document answer**: If the question requires synthesizing insight that no document explicitly states, RAG retrieves text that is adjacent to the answer but never contains it. The model then either hallucinates the answer or correctly says "I don't know." Fine-tuning or [Chain-of-Thought](../concepts/chain-of-thought.md) prompting are better investments.

**Real-time conversation with high latency requirements**: A retrieval round-trip adds 50-500ms per query depending on index size and infrastructure. For conversational applications where sub-100ms latency matters, RAG's latency budget may not fit. [Core Memory](../concepts/core-memory.md) in Letta's architecture (in-prompt text blocks) is faster — no retrieval call needed.

**Highly structured data**: Tables, databases, and structured records are poorly served by embedding-based retrieval. A SQL query outperforms semantic search on structured data by orders of magnitude. Text-to-SQL is the right architecture, not RAG.

**Small, stable corpora**: If the knowledge base is fewer than 1000 documents and changes quarterly, stuffing the entire corpus into the context window beats RAG on both simplicity and retrieval quality. RAG adds infrastructure complexity that isn't justified when full-context fits in the window.

**Knowledge that requires deep personalization**: RAG retrieves from a shared corpus. For applications requiring deep per-user memory (therapy, personal coaching, long-term relationship modeling), [Episodic Memory](../concepts/episodic-memory.md) and [Long-Term Memory](../concepts/long-term-memory.md) systems with user-scoped storage are more appropriate than shared-corpus RAG.

## Unresolved Questions

**Optimal chunk size for a given domain is unknown at design time**. Projects typically run ablations post-deployment when problems appear. There is no principled formula that takes domain characteristics and outputs chunk size.

**Retrieval recall measurement in production**. Most teams don't know their retrieval recall (what fraction of relevant documents for a query actually appear in the top-k). Building labeled evaluation sets for retrieval — not just end-to-end generation — requires significant investment that most projects skip.

**Cost of hybrid RAG at scale**. Running both BM25 and dense retrieval, followed by reranking, triples the retrieval compute cost. Providers like Pinecone and Qdrant are building managed hybrid search, but pricing at >1B document scale is not well-documented.

**How to handle contradictory retrieved documents**. If two retrieved chunks make conflicting claims (e.g., from documents at different timestamps), most systems have no explicit conflict resolution — the LLM handles it implicitly, often unpredictably. No standard pattern exists for surfacing or resolving retrieval-level contradictions.

**Graph construction amortization**. [GraphRAG](../projects/graphrag.md) requires many LLM calls for entity extraction during indexing. For dynamic corpora, incremental graph updates are not fully solved. Microsoft's GraphRAG uses 600-token chunks (extracting 2x more entities than 300-token chunks) at 4x more LLM calls — a direct cost-quality tradeoff with no obvious optimal point.

## Alternatives and Selection Guidance

| Alternative | Use when |
|---|---|
| [Knowledge Graph](../concepts/knowledge-graph.md) (pure) | Queries are primarily relational; entities and relationships are well-defined; retrieval recall > 66% achievable through high-quality extraction |
| [Context Engineering](../concepts/context-engineering.md) with full-context stuffing | Corpus fits in context window (<200 documents); latency is critical; simplicity preferred |
| [Core Memory](../concepts/core-memory.md) (Letta-style editable blocks) | Per-user personalization required; agent needs to modify its own memory; inspectable memory state matters |
| [Semantic Memory](../concepts/semantic-memory.md) with structured storage | Knowledge is factual and stable; structured queries needed; temporal versioning of facts required |
| Fine-tuning | Knowledge is stable, high-volume, and parametric (style, reasoning patterns, domain-specific behavior rather than facts) |
| SQL/structured retrieval | Data is tabular or highly structured; queries involve aggregation, filtering, or joins |
| [GraphRAG](../projects/graphrag.md) | Multi-hop reasoning dominates query distribution; temporal reasoning required; +23 F1 on temporal queries justifies graph construction cost |
| Plain BM25 | Exact term matching required; domain has specialized vocabulary that embedding models mispronounce (legal citations, chemical names, code identifiers) |

## Related Concepts

- [Agentic RAG](../concepts/agentic-rag.md) — RAG where the agent controls retrieval strategy
- Multi-hop RAG — Sequential multi-step retrieval for complex queries
- [Context Engineering](../concepts/context-engineering.md) — RAG as one component of context assembly
- [Agent Memory](../concepts/agent-memory.md) — RAG as memory retrieval mechanism
- [Semantic Search](../concepts/semantic-search.md) — The retrieval primitive underlying RAG
- [Vector Database](../concepts/vector-database.md) — Infrastructure for embedding storage and ANN search
- [Context Compression](../concepts/context-compression.md) — Reducing retrieved context to fit context windows
- [Lost in the Middle](../concepts/lost-in-the-middle.md) — Positional effects in retrieved context
- [Community Detection](../concepts/community-detection.md) — Used in GraphRAG's hierarchical summarization
- Personalized PageRank — Graph traversal in HippoRAG

---
entity_id: rag
type: concept
bucket: knowledge-bases
abstract: >-
  RAG augments LLM generation by retrieving relevant documents from an external
  store at inference time, grounding responses in specific knowledge without
  retraining the model.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/getzep-graphiti.md
  - repos/aiming-lab-simplemem.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/supermemoryai-supermemory.md
  - repos/osu-nlp-group-hipporag.md
  - repos/microsoft-llmlingua.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/thedotmack-claude-mem.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/caviraoss-openmemory.md
  - repos/volcengine-openviking.md
  - repos/topoteretes-cognee.md
  - repos/evoagentx-evoagentx.md
  - repos/mem0ai-mem0.md
  - repos/kepano-obsidian-skills.md
  - repos/infiniflow-ragflow.md
  - repos/agent-on-the-fly-memento.md
  - repos/michaelliv-napkin.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - repos/laurian-context-compression-experiments-2508.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/volcengine-openviking.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Claude Code
  - Claude
  - Andrej Karpathy
  - GraphRAG
  - Knowledge Graph
  - Vector Database
  - Agent Memory
  - Model Context Protocol
  - Context Management
  - Context Engineering
  - Hybrid Retrieval
  - Episodic Memory
  - Semantic Memory
  - Context Compression
  - LongMemEval
  - A-MEM
  - Graphiti
  - LoCoMo
  - Letta
  - CrewAI
  - LangChain
  - ReAct
  - GPT-4
  - OpenAI
  - Obsidian
  - OpenClaw
  - Mem0
  - LangGraph
  - Cursor
  - OpenAI Codex
  - LlamaIndex
  - BM25
  - LightRAG
  - A-MEM
  - Cognee
  - RAGFlow
last_compiled: '2026-04-05T20:21:47.962Z'
---
# Retrieval-Augmented Generation (RAG)

## What It Is

Retrieval-Augmented Generation couples a retrieval system with an LLM at inference time. When a query arrives, the system searches an external knowledge store, pulls relevant passages, and injects them into the LLM's context window alongside the original query. The LLM then generates a response grounded in the retrieved material rather than relying solely on knowledge baked into its weights during training.

The core intuition: LLMs have fixed training cutoffs and forget specific facts under pressure from the statistical patterns of broad pretraining. RAG offloads precise factual recall to a retrieval index that can be updated, audited, and controlled without touching the model.

Introduced formally in the 2020 paper "Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks" (Lewis et al., Facebook AI Research), RAG has since become the foundational approach for grounding LLMs in specific corpora, organizational knowledge, and private data.

## How It Works

A standard RAG pipeline has three components:

**Indexing** (offline): Documents are split into chunks (typically 256–2400 tokens), embedded into dense vectors using a model like `text-embedding-ada-002`, and stored in a vector database (Pinecone, pgvector, Weaviate, Chroma, etc.). Some pipelines also build sparse BM25 indexes over the same chunks for keyword search.

**Retrieval** (online): The user's query is embedded and compared against stored chunk vectors via approximate nearest neighbor search. Top-k chunks (typically 5–20) are selected by cosine similarity or a hybrid scoring function combining dense and sparse signals.

**Generation** (online): Retrieved chunks are formatted into a prompt alongside the original query and passed to the LLM. The model generates a response that can cite or summarize the retrieved content.

The simplest possible pipeline in pseudocode:

```python
chunks = embed_and_index(documents)
relevant = vector_search(embed(query), chunks, top_k=10)
response = llm(system_prompt + format(relevant) + query)
```

This basic pattern covers the majority of production RAG deployments.

### Retrieval Variants

**Dense retrieval** uses learned semantic embeddings. Strong at paraphrase matching and cross-lingual queries. Weaker at exact term lookup and rare named entities.

**Sparse retrieval** (BM25) uses term frequency statistics. Strong at exact keyword matching, technical identifiers, and proper nouns. Weaker at semantic similarity.

**Hybrid retrieval** runs both, then merges ranked lists via reciprocal rank fusion or learned re-ranking. The [BM25](../projects/bm25.md) signal is an inexpensive complement to dense retrieval — relevant for any corpus with domain jargon, code, or proper names where semantic similarity fails.

**Hierarchical / structured retrieval**: Systems like [OpenViking](../projects/openclaw-openviking.md) organize chunks in a filesystem-like tree and retrieve at the directory level before drilling into individual files. This preserves structural context that flat vector search discards and claims 43% retrieval accuracy improvement over flat vector search on the LoCoMo benchmark (self-reported by ByteDance's Volcengine team).

### Chunking Strategy

Chunk size is a first-order decision. From the GraphRAG paper: 600-token chunks extract approximately 2x more entity references than 2400-token chunks, but require 4x more LLM calls during indexing. Smaller chunks improve retrieval precision but hurt coherence — a retrieved 200-token chunk may lack the surrounding context needed to answer the question fully. Overlapping chunks (each chunk shares 20–50 tokens with its neighbors) partially address boundary effects.

### Reranking

After first-stage vector retrieval, a cross-encoder reranker scores each (query, chunk) pair jointly, typically improving precision at a latency cost of one additional model forward pass per candidate. Cross-encoders cannot run at index time (they require the query), so they only make sense as a second-stage filter over a small candidate pool.

## Why RAG vs. Fine-Tuning vs. Full Context

Three approaches exist for incorporating specific knowledge into an LLM:

| Approach | Updates | Latency | Cost | Auditability |
|---|---|---|---|---|
| Fine-tuning | Model weights | Offline | High (training run) | None — baked in |
| Long context | None | Per-inference | High (token cost) | Prompt is inspectable |
| RAG | Index only | Per-inference | Low-moderate | Retrieval is inspectable |

RAG wins when knowledge changes frequently (daily/weekly), when you need to cite sources, when you have multiple knowledge domains with different update schedules, or when you cannot fine-tune the model (API-only access). Fine-tuning wins when the task requires style or format adaptation rather than factual grounding, and when the training set is large enough to teach generalizable patterns. Long context wins when the knowledge base is small enough to fit and the query always requires reading most of it.

Andrej Karpathy has argued that as context windows grow and per-token cost falls, RAG's value decreases — at sufficiently large and cheap context windows, you can put the entire knowledge base in every prompt. This argument has merit for small corpora but breaks down for enterprise knowledge bases with millions of documents.

## RAG vs. GraphRAG

The paper "From Local to Global: A GraphRAG Approach to Query-Focused Summarization" (Edge et al., Microsoft) and the systematic evaluation "RAG vs. GraphRAG" (Han et al.) establish a clear empirical pattern [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) [Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md):

- RAG wins on single-hop factual queries (64.78 vs. 63.01 F1 on NQ)
- [GraphRAG](../projects/graphrag.md) wins on multi-hop reasoning (64.60 vs. 63.88 F1 on HotPotQA) and temporal queries (49.06 vs. 25.73 F1) — a 23-point gap
- Combining both (concatenating retrieval results) yields +6.4% improvement on multi-hop tasks over RAG alone

The temporal reasoning gap is the clearest signal: graph structure captures time-ordered entity relationships that flat chunk retrieval systematically misses. For corpora where queries frequently ask "what changed" or "what came before," GraphRAG's advantage is substantial. For simple factual lookup, the overhead of graph construction (multiple LLM calls per chunk for entity extraction, Leiden community detection, community summarization) is not worth the modest quality improvement.

[GraphRAG](../projects/graphrag.md) carries its own ceiling: ~34% of answer-relevant entities are missing from the constructed knowledge graph due to imperfect LLM extraction. This hard ceiling means KG-only approaches fail on roughly a third of queries requiring specific entities.

## RAG vs. Learned Memory Systems

Systems like [Letta](../projects/letta.md), [Mem0](../projects/mem0.md), and [OpenMemory](../projects/openmemory.md) layer memory management on top of RAG primitives and frame themselves as alternatives to "just RAG." The distinction is meaningful:

RAG is stateless — it retrieves from a static index and generates. It does not learn from the conversation or update its store based on what the user said.

Memory systems add write operations: they extract facts from interaction history, update stored representations, and manage which information persists across sessions. Letta's core_memory_replace and archival_memory_insert give agents explicit tools to modify their own retrieval index mid-conversation [Source](../raw/deep/repos/letta-ai-letta.md). OpenMemory's HSG applies sector-specific decay rates so episodic memories fade faster than semantic facts [Source](../raw/deep/repos/caviraoss-openmemory.md).

For a single-session Q&A system over a fixed document corpus, RAG is sufficient and simpler. For a long-running agent that should remember user preferences, learn from past errors, or accumulate domain expertise over many sessions, memory systems address what RAG cannot.

[Agent Memory](../concepts/agent-memory.md) is the broader concept of which RAG-based retrieval is one sub-component alongside [Episodic Memory](../concepts/episodic-memory.md) and [Semantic Memory](../concepts/semantic-memory.md).

## Strengths

**Updatable knowledge**: Swap the index without retraining. This is the primary reason RAG dominates production deployments over fine-tuning.

**Auditable grounding**: Retrieved chunks are inspectable. You can log exactly what the model saw, enabling debugging and compliance workflows that are impossible with fine-tuned weights.

**Hallucination reduction on factual queries**: Grounding in retrieved text reduces (though does not eliminate) confabulation. Performance degrades gracefully — a retrieval failure means the model lacks context, not that it invents plausible-sounding falsehoods.

**Multi-tenant knowledge isolation**: Different users or teams can share an LLM while retrieving from separate indexes. Access control on the retrieval layer provides data separation without separate model deployments.

**Scales to large corpora**: Vector indexes scale to hundreds of millions of documents. The LLM only sees the top-k retrieved chunks regardless of corpus size.

## Limitations

### Concrete Failure Mode: Multi-Hop Retrieval Degradation

RAG retrieves based on query-to-chunk similarity at a single step. For a question like "Which projects did Alice lead after she joined the team that worked on the product Bob's company acquired in 2022?", the answer requires traversing a chain of entities. A single vector lookup returns chunks similar to the query surface string, not chunks along the reasoning chain. Each hop reduces retrieval accuracy multiplicatively. Hybrid approaches (pre-filtering by entity, iterative retrieval, or switching to GraphRAG) are needed. Most RAG deployments simply fail silently on these queries — the model produces a confident answer assembled from the wrong chunks.

### Infrastructure Assumption

RAG assumes the corpus fits in a form that an embedding model can represent and an ANN index can search at inference latency. For code repositories with AST structure, legal documents with cross-reference networks, or temporal datasets where recency matters more than semantic similarity, vanilla embedding-based retrieval is a poor fit. OpenViking addresses code repositories via AST-based L1 overviews rather than raw text embedding; [LightRAG](../projects/lightrag.md) and [GraphRAG](../projects/graphrag.md) address relational structure. Selecting an embedding model and chunking strategy as if all text is equivalent is the most common RAG deployment error.

## When NOT to Use RAG

**When the query distribution is primarily multi-hop or temporal reasoning**: GraphRAG's +23-point advantage on temporal queries is too large to ignore. If your users regularly ask about relationships between entities, event sequences, or comparative analyses across the corpus, invest in [GraphRAG](../projects/graphrag.md) or [Hybrid Retrieval](../concepts/hybrid-retrieval.md).

**When the knowledge base is small and stable**: If the entire knowledge base fits in a context window (under ~100K tokens for modern models) and rarely changes, just put it all in the prompt. The retrieval pipeline adds latency, complexity, and failure modes for no benefit.

**When the task is style or format adaptation**: RAG cannot teach a model to write in a specific voice, follow domain-specific formatting conventions, or apply judgment about which parts of retrieved content matter. Fine-tuning addresses these; RAG does not.

**When you need cross-session learning**: A RAG system over a static index does not learn from user feedback, correct its retrieval behavior, or accumulate knowledge from prior conversations. For agents that should improve with use, [Letta](../projects/letta.md), [Mem0](../projects/mem0.md), or [A-MEM](../projects/a-mem.md) address what RAG cannot.

**When retrieval latency is a hard constraint**: Two model inference calls (embedding + generation) plus an ANN search add 100–500ms over a bare LLM call. For real-time voice applications or sub-200ms response requirements, RAG's overhead may be prohibitive.

## Unresolved Questions

**Optimal chunk size and strategy**: No consensus exists. The GraphRAG paper shows 600-token chunks extract 2x more entities than 2400-token ones. OpenViking uses AST-based extraction for code rather than fixed-size splitting. LlamaIndex and LangChain provide a menu of strategies without clear guidance on selection criteria. Most teams set chunk size once and never revisit it.

**Embedding model selection**: Different embedding models have wildly different performance profiles across domains, languages, and query types. The field lacks standard evaluation harnesses that practitioners can run on their own data before committing to a model. Benchmark results on MTEB are useful baselines but do not substitute for domain-specific evaluation.

**Staleness at scale**: How stale can an index become before retrieval quality degrades meaningfully? For a knowledge base receiving hundreds of document updates per day, how do you balance re-indexing cost against retrieval quality? Incremental indexing strategies exist but their quality tradeoffs are not well-characterized.

**Evaluation methodology**: The Han et al. paper found that LLM-as-judge evaluations exhibit significant position bias — reversing which system's answer appears first can completely invert the preference judgment. Practitioners evaluating their own RAG pipelines using GPT-4 as a judge may be measuring evaluation artifact rather than retrieval quality.

**Cost at scale**: Indexing large corpora with smaller chunks and gleanings (per GraphRAG) requires many LLM calls. For a 10M-token corpus at 600-token chunks, that is ~16,000 chunks times multiple extraction calls. At current API pricing, this can exceed the cost of training a small fine-tuned model. Published benchmarks rarely report indexing cost alongside retrieval quality.

## Related Concepts and Systems

- [Hybrid Retrieval](../concepts/hybrid-retrieval.md): Combining dense and sparse signals for first-stage candidate selection
- [Context Management](../concepts/context-management.md): How retrieved content competes with other context window contents
- [Context Engineering](../concepts/context-engineering.md): Designing what goes into the context beyond naive chunk injection
- [Context Compression](../concepts/context-compression.md): Reducing retrieved content to fit token budgets
- [GraphRAG](../projects/graphrag.md): Graph-based extension for multi-hop and sensemaking queries
- [LightRAG](../projects/lightrag.md): Lighter-weight graph RAG alternative
- [LlamaIndex](../projects/llamaindex.md): Orchestration framework with extensive RAG primitives
- [LangChain](../projects/langchain.md): Pipeline framework commonly used to assemble RAG systems
- [Agent Memory](../concepts/agent-memory.md): Broader concept of which retrieval-based recall is one component
- [LongMemEval](../projects/longmemeval.md): Benchmark for evaluating long-term memory including RAG-based approaches
- [Graphiti](../projects/graphiti.md): Temporally-aware knowledge graph that extends RAG with explicit time reasoning
- [Cognee](../projects/cognee.md): Graph-augmented RAG with entity extraction
- [RAGFlow](../projects/ragflow.md): End-to-end RAG pipeline with document parsing focus

## Alternatives

**Use GraphRAG** when queries require multi-hop reasoning, comparison across entities, or temporal ordering. The +23-point gap on temporal queries and systematic advantage on multi-hop tasks justify the indexing cost for corpora queried repeatedly.

**Use fine-tuning** when the task requires style adaptation, format consistency, or learning generalizable patterns from examples rather than retrieving specific facts.

**Use long context** when the knowledge base is small (under ~100K tokens), stable, and the query always requires reading most of it. Context costs are falling; for small corpora this is often the simplest correct answer.

**Use Letta or Mem0** when the system needs to learn from conversations, update beliefs based on new information, or accumulate expertise across sessions. These add a write layer that RAG lacks.

**Use a hybrid (RAG + GraphRAG)** when you cannot predict query types in advance. Concatenating both retrieval results adds +6.4% on multi-hop tasks with predictable 2x retrieval cost — a straightforward tradeoff when query distribution is mixed.

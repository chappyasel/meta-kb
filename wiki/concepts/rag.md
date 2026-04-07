---
entity_id: rag
type: concept
bucket: knowledge-bases
abstract: >-
  RAG augments LLM generation by retrieving relevant documents from an external
  store before answering; its key differentiator over pure prompting is
  separating knowledge storage from model weights, enabling up-to-date,
  verifiable responses without retraining.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/getzep-graphiti.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - repos/aiming-lab-simplemem.md
  - repos/supermemoryai-supermemory.md
  - repos/osu-nlp-group-hipporag.md
  - repos/memorilabs-memori.md
  - repos/microsoft-llmlingua.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/gustycube-membrane.md
  - repos/mirix-ai-mirix.md
  - repos/topoteretes-cognee.md
  - repos/caviraoss-openmemory.md
  - repos/thedotmack-claude-mem.md
  - repos/memvid-memvid.md
  - repos/kepano-obsidian-skills.md
  - repos/evoagentx-evoagentx.md
  - repos/michaelliv-napkin.md
  - repos/mem0ai-mem0.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - repos/agent-on-the-fly-memento.md
  - repos/infiniflow-ragflow.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/caviraoss-openmemory.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/michaelliv-napkin.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - mcp
  - agent-memory
  - obsidian
  - vector-database
  - claude-code
  - mem0
  - openclaw
  - claude
  - episodic-memory
  - semantic-memory
  - graphrag
  - knowledge-graph
  - gpt-4
  - letta
  - langgraph
  - locomo
  - longmemeval
  - context-window
  - embedding-model
  - context-management
  - andrej-karpathy
  - opencode
  - codex
  - langchain
  - vllm
  - continual-learning
  - core-memory
  - self-improving-agent
  - hipporag
  - raptor
  - context-compression
  - supermemory
  - autogen
  - chain-of-thought
  - task-decomposition
  - meta-agent
  - gemini
  - catastrophic-forgetting
  - synthetic-data-generation
  - memory-evolution
  - lightrag
  - gaia
  - tau-bench
  - github-copilot
  - knowledge-base
  - emotional-memory
  - crewai
  - hybrid-search
  - entity-extraction
  - memorybank
last_compiled: '2026-04-07T11:35:43.327Z'
---
# Retrieval-Augmented Generation (RAG)

## What It Is

Retrieval-Augmented Generation is an inference-time technique that gives a language model access to an external knowledge base. Before generating a response, a retrieval system fetches relevant documents or passages, which are injected into the prompt as context. The model then generates an answer conditioned on both the query and the retrieved material.

The original RAG paper (Lewis et al., 2020) combined a dense passage retriever with a sequence-to-sequence generator, but "RAG" now broadly describes any system that separates knowledge retrieval from generation, regardless of retrieval mechanism. The core claim: you can give a fixed model access to a changing, large, or private knowledge base without retraining it.

RAG is not a single algorithm. It is an architectural pattern with dozens of implementation variants, each making different tradeoffs across retrieval mechanism, chunking strategy, indexing structure, and context assembly.

---

## Why It Matters

Three practical problems drive RAG adoption:

**Knowledge cutoffs.** LLMs have fixed training data. A model trained in 2024 knows nothing about events in 2025. RAG routes those questions to a live or updated document store.

**Proprietary knowledge.** Organizations cannot fine-tune frontier models on sensitive internal data for cost and security reasons. RAG lets a model answer questions about internal documents without those documents ever leaving the organization's infrastructure.

**Hallucination reduction.** When a model must answer from retrieved context rather than parametric memory, answers are more grounded and checkable. Users can inspect the source documents. Confidence is more calibrated.

**Scale.** A model's weights cannot hold the equivalent of a large encyclopedia with per-paragraph retrieval. RAG externalizes that storage and retrieves exactly what each query needs.

---

## How It Works

### The Basic Pipeline

1. **Indexing (offline).** Documents are split into chunks (typically 256–1024 tokens), encoded by an [Embedding Model](../concepts/embedding-model.md) into dense vectors, and stored in a [Vector Database](../concepts/vector-database.md) like [Pinecone](../projects/pinecone.md), [Qdrant](../projects/qdrant.md), or [ChromaDB](../projects/chromadb.md). Some systems also build a sparse BM25 index in parallel.

2. **Retrieval (online).** At query time, the query is encoded into the same vector space. The system finds the K nearest chunks by cosine similarity (dense retrieval), keyword overlap ([BM25](../concepts/bm25.md)), or both combined via [Hybrid Search](../concepts/hybrid-search.md) with [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md).

3. **Context assembly.** Retrieved chunks are inserted into the prompt, typically as a numbered list before the user's question. The prompt instructs the model to answer from the provided context.

4. **Generation.** The LLM ([Claude](../projects/claude.md), [GPT-4](../projects/gpt-4.md), [Gemini](../projects/gemini.md), etc.) reads the query plus context and produces an answer.

### Chunking Strategies

How documents are split matters as much as retrieval quality. Splitting mid-sentence destroys context; chunks too large dilute relevance. Common approaches:

- **Fixed-size with overlap**: 512-token chunks, 50-token overlap. Simple but blind to document structure.
- **Semantic chunking**: Split at paragraph or section boundaries. Requires parsing.
- **Sentence-level**: Finest granularity; maximizes precision but increases vector store size.
- **Hierarchical (RAPTOR)**: [RAPTOR](../projects/raptor.md) recursively summarizes chunks into progressively more abstract representations, enabling retrieval at multiple levels of abstraction for different query types.

The RAG vs. GraphRAG evaluation found that 256-token chunks were used uniformly across their experiments. Smaller chunks give BM25 better term concentration (as demonstrated by Napkin's LongMemEval benchmark: per-round notes of ~2,500 characters outperformed session-level notes of ~15,000 characters).

### Dense vs. Sparse vs. Hybrid

**Dense retrieval** uses embedding similarity. It handles paraphrase well ("authentication" matches "login") but fails when exact terminology matters.

**Sparse retrieval (BM25)** requires lexical overlap. It handles exact terms, acronyms, and domain jargon well but fails on synonym matching.

**[Hybrid Search](../concepts/hybrid-search.md)** combines both signals via [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md). A result scoring well in both indices receives a high fused score. Independent benchmarks consistently show hybrid outperforms either approach alone.

The Napkin project takes an extreme position: on structured markdown knowledge bases, BM25 alone (via MiniSearch) with a backlink-count signal and recency factor achieves 91% on LongMemEval-S, outperforming embedding-based RAG and matching GPT-4o with full context at 64%. The composite score formula: `BM25_score + backlink_count × 0.5 + recency_normalized × 1.0`. This result is specific to structured, well-linked markdown vaults; it does not generalize to unstructured document corpora.

### Knowledge Graphs as Retrieval Structures

Standard RAG retrieves isolated chunks. [GraphRAG](../concepts/graphrag.md) adds a graph layer: entities are extracted from documents, relationships are mapped, and retrieval traverses the graph to assemble multi-hop context.

A systematic benchmark comparison (Han et al.) measured RAG vs. GraphRAG under a unified evaluation protocol:

| Query Type | RAG (Llama 70B F1) | GraphRAG Local (Llama 70B F1) |
|---|---|---|
| Single-hop factual (NQ) | 68.18 | 65.44 |
| Multi-hop (HotPotQA) | 63.88 | 64.60 |
| Temporal reasoning | 25.73 | 49.06 |
| Comparison | 56.31 | 60.16 |

GraphRAG's advantage on temporal reasoning (+23 points) is the largest measured difference. RAG wins on single-hop factual retrieval. Concatenating both retrieval results yields +6.4% on multi-hop tasks. These benchmarks used a controlled setup with identical generation models; they are research-reported, not independently verified by a third party.

A critical constraint: the GraphRAG knowledge graph construction pipeline misses approximately 34% of answer-relevant entities. This is a hard ceiling. If an entity was not extracted during indexing, graph traversal cannot recover it.

[HippoRAG](../projects/hipporag.md) and [LightRAG](../concepts/graphrag.md) extend the graph approach with different indexing and traversal strategies.

---

## Implementation Variants

### Naive RAG
Retrieve top-K chunks, inject, generate. No reranking, no query rewriting, no multi-step retrieval. Works for simple factual queries. Degrades on multi-hop reasoning.

### Advanced RAG
Adds reranking (cross-encoder or LLM-based), query rewriting or HyDE (generating a hypothetical answer to use as a retrieval query), and [Context Compression](../concepts/context-compression.md) to reduce noise.

### [Agentic RAG](../concepts/agentic-rag.md)
Gives a [Chain-of-Thought](../concepts/chain-of-thought.md)-capable agent control over the retrieval loop. The agent decides when to retrieve, what to query, whether to retrieve again based on initial results, and when it has enough context to answer. [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), and [LlamaIndex](../projects/llamaindex.md) all support this pattern. It handles multi-hop reasoning naturally but costs more per query (multiple LLM calls).

### RAG as Agent Memory
RAG is one component of [Agent Memory](../concepts/agent-memory.md) architecture. [Episodic Memory](../concepts/episodic-memory.md) and [Semantic Memory](../concepts/semantic-memory.md) are both typically implemented via retrieval over stored documents or conversation history. Systems like [Mem0](../projects/mem0.md), [Letta](../projects/letta.md), [MemoryBank](../projects/memorybank.md), and [Supermemory](../projects/supermemory.md) build on RAG but add memory management layers: decay, salience scoring, consolidation, and entity extraction.

Letta's architecture illustrates the contrast: rather than retrieving into context at query time, Letta's agents maintain editable memory blocks directly in the system prompt and call `archival_memory_search` explicitly when they need to page in long-term storage. The archival memory is essentially a RAG system; the in-context blocks are not.

---

## Strengths

**Knowledge freshness.** Update the document store; no model retraining required. A news retrieval system can ingest articles in real time.

**Source attribution.** Retrieved chunks can be surfaced alongside answers. Users can verify claims and click through to source documents.

**Domain specialization without fine-tuning.** A general-purpose model can answer domain-specific questions by retrieving from a curated corpus. No gradient updates.

**Complementarity with graph retrieval.** Simple RAG and GraphRAG have non-overlapping failure modes. A hybrid system that concatenates both retrieval results outperforms either alone on multi-hop tasks.

**Works at document scales that exceed context windows.** A 10-million-word knowledge base cannot fit in any current context window. RAG retrieves the relevant 1,000 words.

---

## Critical Limitations

**The entity extraction ceiling.** For GraphRAG variants, approximately 34% of answer-relevant entities are missing from constructed knowledge graphs. If an entity was not extracted during indexing, retrieval cannot find it. This is not a tuning problem; it is an architecture constraint.

**Vocabulary mismatch.** Pure BM25 fails when query and documents use different terminology ("authn" vs. "authentication," "myocardial infarction" vs. "heart attack"). Dense retrieval handles this but fails on exact terminology. Neither fully solves the problem; hybrid search reduces it.

**Chunking is a hidden hyperparameter.** Chunk size and overlap significantly affect performance and have no universally correct value. The optimal chunking strategy is domain-dependent. Most RAG tutorials present one strategy and move on; production systems often iterate through several before finding one that works.

**Retrieval quality gates generation quality.** No amount of generation sophistication recovers from retrieving the wrong documents. The retrieval step is the bottleneck, but most RAG evaluation focuses on generation metrics (BLEU, ROUGE, BERTScore). These metrics can make a system appear functional while retrieval is silently failing.

**No confidence calibration.** RAG systems typically do not know when they cannot answer. They retrieve something, even when nothing relevant exists, and generate an answer from irrelevant context. Napkin's LongMemEval benchmark showed 50% accuracy on abstention tasks (when the correct answer is "I don't know"), compared to 90-97% on information extraction tasks.

**Infrastructure assumption: static documents.** Standard RAG assumes documents are indexed offline. Real-world knowledge bases change continuously. Keeping indexes fresh requires re-embedding changed documents, invalidating caches, and managing incremental updates. Most RAG tutorials assume a static corpus.

---

## When NOT to Use RAG

**Simple factual questions the model already knows.** Adding retrieval overhead to questions about well-documented, stable facts wastes latency and tokens.

**Low-latency requirements where retrieval adds unacceptable delay.** A real-time voice assistant cannot absorb the 100-500ms of a vector database round-trip. [Context Compression](../concepts/context-compression.md) or keeping relevant context in the [Context Window](../concepts/context-window.md) directly may be better.

**Highly structured relational queries.** "List all customers who purchased product X in Q3 and have not renewed" is a SQL query, not a retrieval task. Feeding unstructured documents to a RAG system to answer structured questions is the wrong tool.

**When the knowledge base is small enough to fit in context.** If all relevant documents fit in a 200K-token context window, just put them there. [Napkin's benchmarks](../raw/deep/repos/michaelliv-napkin.md) show that full-context approaches outperform RAG on LongMemEval for short conversation histories (92.4% vs. 91% for RAG-based systems) because there is no retrieval error to introduce.

**When you need precise temporal reasoning across a large knowledge base.** Standard RAG performs poorly on temporal queries (25.73 F1 in the Han et al. benchmark). GraphRAG is substantially better (49.06 F1), but still imperfect. If temporal reasoning is the primary workload, a database with explicit temporal indexing may be more appropriate than either.

**When domain-specific entity extraction is critical and your extraction pipeline is untested.** The 34% entity miss rate was measured on general text. Technical documentation, legal filings, and scientific literature with specialized terminology may have higher miss rates. Validate extraction quality before committing to a graph-based approach.

---

## Failure Modes in Production

**Retrieval hallucination.** The model cites document chunks that do not actually support the stated claim. Happens when retrieved chunks are tangentially related and the model confabulates relevance.

**Context window saturation.** Retrieving too many chunks fills the context window with marginally relevant text, diluting the signal. The model loses track of the actual question.

**Embedding model mismatch.** Switching embedding models mid-deployment creates incompatible vector spaces. Existing embeddings from one model are not comparable to embeddings from another. Re-indexing the entire corpus is required.

**Chunk boundary artifacts.** A critical sentence falls at the boundary between two chunks. Neither chunk contains enough context to be retrieved; the information is effectively invisible.

**Query-document distribution shift.** Users ask questions in a different vocabulary than document authors. A technical document written in passive academic voice is hard to retrieve with natural conversational queries.

---

## Unresolved Questions

**Optimal chunking remains unsolved.** The research community has not converged on a principled method for choosing chunk size, overlap, and boundary detection. Current practice is empirical.

**Evaluation methodology is contested.** LLM-as-judge evaluations of RAG quality exhibit significant position bias: presenting retrieved results in a different order can invert preference judgments. The Han et al. paper found ROUGE/BERTScore and LLM-judge scores systematically disagree. Which metric captures real quality is unresolved.

**Cost of hybrid systems at scale.** Maintaining both dense vector indexes and BM25 indexes, running rerankers, and potentially building knowledge graphs for a large document corpus involves substantial engineering and compute cost. Published benchmarks evaluate quality; few report total system cost at production scale.

**When does more retrieval hurt?** Agentic RAG systems with iterative retrieval can degrade when the agent retrieves in expanding circles, accumulating noise. There is no established theory for when to stop retrieving.

---

## Ecosystem and Related Systems

**Frameworks:** [LangChain](../projects/langchain.md) and [LlamaIndex](../projects/llamaindex.md) are the dominant RAG orchestration libraries. [DSPy](../projects/dspy.md) enables prompt optimization for RAG pipelines; [GEPA](../concepts/gepa.md) extends this with evolutionary optimization using execution traces.

**Vector stores:** [Pinecone](../projects/pinecone.md), [Qdrant](../projects/qdrant.md), [ChromaDB](../projects/chromadb.md), [FAISS](../projects/faiss.md), [PostgreSQL](../projects/postgresql.md) with pgvector.

**Sparse retrieval:** [Elasticsearch](../projects/elasticsearch.md) for production BM25; MiniSearch (JavaScript) for in-process lightweight retrieval.

**Extensions:** [GraphRAG](../concepts/graphrag.md) adds entity-relationship graphs; [HippoRAG](../projects/hipporag.md) adds hippocampal-inspired associative indexing; [RAPTOR](../projects/raptor.md) adds hierarchical summarization for multi-scale retrieval; [LightRAG](../concepts/graphrag.md) simplifies graph construction.

**Agent memory systems:** [Mem0](../projects/mem0.md), [Letta](../projects/letta.md), [Zep](../projects/zep.md), [MemoryBank](../projects/memorybank.md), [Supermemory](../projects/supermemory.md) all use RAG as a component within broader [Agent Memory](../concepts/agent-memory.md) architectures.

**Alternatives:**
- Use [Context Window](../concepts/context-window.md) directly when the knowledge base is small enough.
- Use [Knowledge Graph](../concepts/knowledge-graph.md) alone when the workload is primarily relational or temporal reasoning.
- Use [Continual Learning](../concepts/continual-learning.md) or fine-tuning when the knowledge base is stable and query distribution is known.
- Use [Model Context Protocol](../concepts/mcp.md) when knowledge retrieval is better framed as a live tool call than an indexed document search.

---

## Selection Guidance

| Condition | Recommended Approach |
|---|---|
| Queries are primarily single-hop factual | Standard RAG with hybrid search |
| Queries require multi-hop reasoning | GraphRAG (local) or agentic RAG |
| Queries are primarily temporal | GraphRAG or database with explicit temporal indexing |
| Knowledge base is structured markdown, well-linked | BM25 + backlinks (Napkin-style) may suffice |
| Knowledge base is large, unstructured, multilingual | Dense retrieval with a strong embedding model |
| Low latency is a hard constraint | In-context knowledge or context compression |
| Knowledge changes frequently | Avoid graph-based approaches; use vector indexes with incremental updates |
| Both single-hop and multi-hop queries | Hybrid: concatenate RAG + GraphRAG results |


## Related

- [Model Context Protocol](../concepts/mcp.md) — alternative_to (0.4)
- [Agent Memory](../concepts/agent-memory.md) — part_of (0.7)
- [Obsidian](../projects/obsidian.md) — alternative_to (0.5)
- [Vector Database](../concepts/vector-database.md) — part_of (0.8)
- [Claude Code](../projects/claude-code.md) — alternative_to (0.4)
- [Mem0](../projects/mem0.md) — alternative_to (0.5)
- [OpenClaw](../projects/openclaw.md) — part_of (0.4)
- [Claude](../projects/claude.md) — part_of (0.5)
- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.6)
- [Semantic Memory](../concepts/semantic-memory.md) — part_of (0.6)
- [GraphRAG](../concepts/graphrag.md) — extends (0.8)
- [Knowledge Graph](../concepts/knowledge-graph.md) — part_of (0.7)
- [GPT-4](../projects/gpt-4.md) — part_of (0.4)
- [Letta](../projects/letta.md) — part_of (0.4)
- [LangGraph](../projects/langgraph.md) — part_of (0.4)
- [LoCoMo](../projects/locomo.md) — part_of (0.4)
- [LongMemEval](../projects/longmemeval.md) — part_of (0.4)
- [Context Window](../concepts/context-window.md) — alternative_to (0.6)
- [Embedding Model](../concepts/embedding-model.md) — part_of (0.8)
- [Context Management](../concepts/context-management.md) — part_of (0.6)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — alternative_to (0.4)
- [OpenCode](../projects/opencode.md) — part_of (0.3)
- [OpenAI Codex](../projects/codex.md) — part_of (0.3)
- [LangChain](../projects/langchain.md) — part_of (0.5)
- [vLLM](../projects/vllm.md) — part_of (0.3)
- [Continual Learning](../concepts/continual-learning.md) — part_of (0.5)
- [Core Memory](../concepts/core-memory.md) — part_of (0.4)
- [Self-Improving Agent](../concepts/self-improving-agent.md) — part_of (0.5)
- [HippoRAG](../projects/hipporag.md) — extends (0.8)
- [RAPTOR](../projects/raptor.md) — extends (0.7)
- [Context Compression](../concepts/context-compression.md) — part_of (0.6)
- [Supermemory](../projects/supermemory.md) — part_of (0.4)
- AutoGen — part_of (0.3)
- [Chain-of-Thought](../concepts/chain-of-thought.md) — part_of (0.4)
- [Task Decomposition](../concepts/task-decomposition.md) — part_of (0.4)
- [Meta-Agent](../concepts/meta-agent.md) — part_of (0.4)
- [Gemini](../projects/gemini.md) — part_of (0.3)
- [Catastrophic Forgetting](../concepts/catastrophic-forgetting.md) — alternative_to (0.5)
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — part_of (0.3)
- [Memory Evolution](../concepts/memory-evolution.md) — part_of (0.4)
- LightRAG — extends (0.7)
- [GAIA](../projects/gaia.md) — part_of (0.3)
- [TAU-bench](../projects/tau-bench.md) — part_of (0.3)
- [GitHub Copilot](../projects/github-copilot.md) — part_of (0.3)
- [LLM Knowledge Base](../concepts/knowledge-base.md) — part_of (0.7)
- Emotional Memory — part_of (0.3)
- [CrewAI](../projects/crewai.md) — part_of (0.4)
- [Hybrid Search](../concepts/hybrid-search.md) — extends (0.7)
- [Entity Extraction](../concepts/entity-extraction.md) — part_of (0.6)
- [MemoryBank](../projects/memorybank.md) — part_of (0.5)

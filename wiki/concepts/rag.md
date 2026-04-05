---
entity_id: rag
type: concept
bucket: knowledge-bases
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - repos/getzep-graphiti.md
  - repos/aiming-lab-simplemem.md
  - repos/osu-nlp-group-hipporag.md
  - repos/vectifyai-pageindex.md
  - repos/supermemoryai-supermemory.md
  - repos/microsoft-llmlingua.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/thedotmack-claude-mem.md
  - repos/caviraoss-openmemory.md
  - repos/topoteretes-cognee.md
  - repos/volcengine-openviking.md
  - repos/kepano-obsidian-skills.md
  - repos/mem0ai-mem0.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - repos/michaelliv-napkin.md
  - repos/infiniflow-ragflow.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - repos/laurian-context-compression-experiments-2508.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/microsoft-llmlingua.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/caviraoss-openmemory.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/topoteretes-cognee.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Claude Code
  - OpenAI
  - GraphRAG
  - Agentic RAG
  - Hybrid Retrieval
  - RAPTOR
  - HippoRAG
  - LightRAG
  - RAGFlow
  - Semantic Search
  - Vector Database
  - BM25
  - Chunking
  - Entity Extraction
  - Context Engineering
  - LlamaIndex
  - LangChain
  - Multi-Hop Reasoning
  - HotpotQA
  - Model Context Protocol
  - Cursor
  - OpenCode
  - Zep
  - Mem0
  - Cognee
  - Meta-KB
last_compiled: '2026-04-05T05:21:07.762Z'
---
# Retrieval-Augmented Generation (RAG)

## What It Is

RAG is an architecture pattern for grounding LLM outputs in external knowledge. Before generating a response, the system retrieves relevant documents from a knowledge store and passes them into the model's context alongside the query. The model then answers using both its parametric knowledge (weights) and the retrieved content.

The core motivation: LLMs have static knowledge cutoffs, hallucinate facts they don't know, and can't reason over private corpora. RAG addresses all three without retraining. The tradeoff is that quality depends heavily on retrieval quality, and poor retrieval produces confident but wrong answers.

## How It Works

A basic RAG pipeline runs in three stages:

**Indexing.** Source documents get chunked into smaller passages, embedded into dense vectors, and stored in a vector database (Pinecone, Weaviate, Chroma, pgvector). Some pipelines also build sparse indexes using BM25 for keyword matching.

**Retrieval.** At query time, the query gets embedded and the system runs approximate nearest-neighbor search over stored vectors. Hybrid retrieval combines dense similarity scores with BM25 scores, typically via Reciprocal Rank Fusion. This catches cases where dense retrieval misses exact keyword matches and vice versa.

**Generation.** Retrieved passages get prepended to the prompt as context. The LLM generates a response conditioned on both the query and retrieved content. Simple pipelines stuff everything into one prompt; more complex systems rerank retrieved chunks, filter by relevance threshold, or run multiple retrieval passes.

### Chunking

How you split documents matters more than most practitioners expect. Fixed-size chunking (e.g., 512 tokens with 50-token overlap) is common but loses semantic boundaries. Sentence-level or paragraph-level splitting preserves meaning better. [RAPTOR](../projects/raptor.md) takes a different approach: it clusters chunks hierarchically, summarizing each cluster, so retrieval can happen at multiple granularities simultaneously.

### Retrieval Variants

Standard RAG retrieves once per query. Several extensions address cases where single retrieval fails:

**[Multi-Hop Reasoning](../concepts/multi-hop-reasoning.md):** For questions requiring information from multiple documents, iterative retrieval runs several retrieval passes, using intermediate answers to refine subsequent queries. [HotpotQA](../projects/hotpotqa.md) benchmarks this capability.

**[Agentic RAG](../concepts/agentic-rag.md):** The retrieval step becomes a tool call inside an agent loop. The agent decides when to retrieve, what to query, and whether the results are sufficient before generating.

**[HippoRAG](../projects/hipporag.md) and [LightRAG](../projects/lightrag.md):** Graph-based retrieval that models relationships between entities rather than just passage similarity. Better for queries that require understanding how concepts connect.

**[GraphRAG](../projects/graphrag.md):** Microsoft's approach builds a community-detection graph over entities and relationships extracted from documents, then uses community summaries as retrieval units. Stronger than dense retrieval for global questions about large corpora but expensive to build.

## Benchmarks and Performance

Mem0's published paper reports +26% accuracy over OpenAI Memory on the LOCOMO benchmark, 91% faster responses, and 90% fewer tokens versus full-context approaches. These are self-reported from the Mem0 team's own evaluation.

Zep's temporal knowledge graph architecture reports 94.8% accuracy on the Deep Memory Retrieval (DMR) benchmark versus MemGPT's 93.4%, and up to 18.5% accuracy improvement with 90% latency reduction on LongMemEval. These figures come from the Zep authors' own paper, not independent replication.

The general finding across implementations is consistent: selective retrieval beats dumping everything into context, both for latency and accuracy. The specific numbers should be treated as directional rather than definitive.

## Where RAG Works Well

**Private or frequently updated knowledge.** Anything that changes faster than model retraining cycles (product docs, internal policies, recent research) fits naturally. The knowledge base updates without touching model weights.

**Reducing hallucination on factual queries.** When the relevant passage is retrievable and clearly answers the question, RAG gives the model something to anchor on. Hallucination rates drop when relevant context is present.

**Auditability.** Retrieved passages can be surfaced as citations. Users and developers can trace which documents drove a particular answer, which matters for compliance and debugging.

**Cost control at scale.** [Mem0](../projects/mem0.md)'s architecture demonstrates that storing structured memories and retrieving selectively uses far fewer tokens than passing full conversation history every turn.

## Critical Limitations

**Retrieval is the failure mode.** If the right passage doesn't get retrieved, the model either hallucinates or says it doesn't know. The retrieval step has no fallback by default. Dense embedding models frequently fail on out-of-domain queries, technical jargon, or questions where the relevant passage uses different vocabulary than the query. This is the most common production failure and it's often invisible: the system returns confidently wrong answers rather than errors.

**Infrastructure assumption.** RAG pipelines assume low-latency access to a vector store with acceptable p99 performance. At small-to-medium scales this holds. At scale, embedding inference, ANN search, and reranking add up. A pipeline that works at 100 QPS may degrade significantly at 10,000 QPS without careful capacity planning for the retrieval layer, not just the LLM.

## When Not to Use RAG

**When the context fits in a long-context window.** Karpathy's LLM-maintained markdown wiki approach demonstrates that at 100-400K word scales, an LLM agent reading index summaries and fetching full documents on demand often matches RAG quality while being simpler to operate. If your corpus fits comfortably in a context window, or if you can build an LLM-maintained index, the RAG retrieval layer adds complexity without proportional benefit.

**When queries require deep relational reasoning across many hops.** Standard RAG retrieves passages; it doesn't model relationships. For questions like "which drugs interact with X, and which of those are contraindicated for patients with condition Y," graph-based approaches like [GraphRAG](../projects/graphrag.md) or [Zep](../projects/zep.md)'s temporal knowledge graph are better fits.

**When latency is tightly constrained.** Each retrieval round adds at minimum one embedding inference call plus ANN search. Multi-hop or agentic RAG can add several seconds per query. If you need sub-500ms responses, RAG requires careful optimization or may be the wrong choice.

**When the knowledge base changes continuously.** Standard RAG with a static vector index goes stale. You need incremental indexing infrastructure. Systems like Zep that maintain temporal graphs handle this natively, but they're more complex to operate.

## Relation to Similar Approaches

[Hybrid Retrieval](../concepts/hybrid-retrieval.md) combines dense and sparse (BM25) retrieval. Most production RAG systems use this rather than pure dense retrieval.

[Semantic Search](../concepts/semantic-search.md) is the dense retrieval component. RAG adds generation on top of it.

[Vector Database](../concepts/vector-database.md) provides the storage and ANN search layer. Choosing between databases (pgvector, Pinecone, Weaviate, Chroma) affects operational complexity and query latency more than retrieval quality.

[Context Engineering](../concepts/context-engineering.md) is the broader craft of deciding what goes into a prompt. RAG is one mechanism; others include conversation compression, structured memory injection (Mem0's approach), and tool-based retrieval in agent loops.

Model Context Protocol provides a standard interface for LLMs to call retrieval tools, positioning retrieval as a capability rather than a hardcoded pipeline step.

## Unresolved Questions

**Evaluation remains contested.** There's no agreed benchmark for production RAG quality. RAGAS, TruLens, and others exist, but benchmarks evaluate different things and self-reported numbers dominate. Most teams rely on end-to-end task metrics rather than retrieval-specific evaluation.

**Chunking strategy selection.** The field lacks systematic guidance on chunk size and splitting strategy relative to corpus and query type. Practitioners largely tune by trial and error. Fixed-size chunking with overlap is the default, not because it's optimal but because it's simple.

**Cost at scale.** Embedding inference and ANN search at production query volumes are non-trivial compute costs. Most published work focuses on accuracy; operating cost relative to alternatives (fine-tuning, extended context models) is underexplored.

**Conflict resolution between retrieved passages.** When retrieved documents contradict each other, models often pick one arbitrarily without signaling the conflict. No standard approach exists for detecting and surfacing this to users.

## Tools and Implementations

[LlamaIndex](../projects/llamaindex.md) and [LangChain](../projects/langchain.md) provide high-level abstractions for building RAG pipelines. [RAGFlow](../projects/ragflow.md) offers a more opinionated, production-oriented implementation. [Cognee](../projects/cognee.md) combines knowledge graph construction with RAG. [Mem0](../projects/mem0.md) and [Zep](../projects/zep.md) build memory layers for agents where retrieval is integrated with persistent state management rather than one-shot document lookup.

[Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and [OpenCode](../projects/opencode.md) implement RAG over codebases, retrieving relevant files and symbols before generating code changes.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.5)
- [OpenAI](../projects/openai.md) — implements (0.5)
- [GraphRAG](../projects/graphrag.md) — part_of (0.7)
- [Agentic RAG](../concepts/agentic-rag.md) — extends (0.8)
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md) — extends (0.7)
- [RAPTOR](../projects/raptor.md) — implements (0.7)
- [HippoRAG](../projects/hipporag.md) — implements (0.7)
- [LightRAG](../projects/lightrag.md) — implements (0.7)
- [RAGFlow](../projects/ragflow.md) — implements (0.7)
- [Semantic Search](../concepts/semantic-search.md) — part_of (0.6)
- [Vector Database](../concepts/vector-database.md) — part_of (0.6)
- [BM25](../concepts/bm25.md) — part_of (0.5)
- [Chunking](../concepts/chunking.md) — part_of (0.6)
- [Entity Extraction](../concepts/entity-extraction.md) — part_of (0.5)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.5)
- [LlamaIndex](../projects/llamaindex.md) — implements (0.6)
- [LangChain](../projects/langchain.md) — implements (0.5)
- [Multi-Hop Reasoning](../concepts/multi-hop-reasoning.md) — part_of (0.5)
- [HotpotQA](../projects/hotpotqa.md) — part_of (0.4)
- [Model Context Protocol](../concepts/mcp.md) — alternative_to (0.3)
- [Cursor](../projects/cursor.md) — implements (0.4)
- [OpenCode](../projects/opencode.md) — implements (0.4)
- [Zep](../projects/zep.md) — implements (0.5)
- [Mem0](../projects/mem0.md) — implements (0.5)
- [Cognee](../projects/cognee.md) — implements (0.5)
- [Meta-KB](../projects/meta-kb.md) — implements (0.5)

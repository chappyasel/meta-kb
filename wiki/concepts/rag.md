---
entity_id: rag
type: concept
bucket: knowledge-bases
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/getzep-graphiti.md
  - repos/orchestra-research-ai-research-skills.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/aiming-lab-simplemem.md
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - repos/supermemoryai-supermemory.md
  - repos/memorilabs-memori.md
  - repos/microsoft-llmlingua.md
  - repos/osu-nlp-group-hipporag.md
  - repos/mirix-ai-mirix.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/thedotmack-claude-mem.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/topoteretes-cognee.md
  - repos/kepano-obsidian-skills.md
  - repos/michaelliv-napkin.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
related:
  - Claude Code
  - Knowledge Graphs
  - GraphRAG
  - Hybrid Retrieval
  - Vector Database
  - Semantic Memory
  - Episodic Memory
  - Long-Term Memory
  - Context Engineering
  - Agentic RAG
  - Knowledge Base Retrieval
  - Self-Healing Knowledge Bases
  - Memory Consolidation
  - Context Compression
  - Obsidian
  - Personal Knowledge Management
  - User Profiling
  - Temporal Reasoning
  - Continual Learning
  - Core Memory
  - Multi-Agent Systems
  - Supermemory
  - LlamaIndex
  - HippoRAG
  - RAPTOR
  - LightRAG
  - Agentic RAG
  - Multi-Hop Retrieval
  - Chunking
  - Hallucination Compounding
  - Crawl4AI
last_compiled: '2026-04-04T21:15:09.548Z'
---
# Retrieval-Augmented Generation (RAG)

## What It Is

Retrieval-Augmented Generation is a technique that supplements an LLM's parametric knowledge (what's baked into weights) with non-parametric knowledge retrieved at inference time from an external corpus. Before generating a response, the system retrieves relevant documents or passages, injects them into the context window, and conditions generation on that retrieved content.

The core motivation: LLMs hallucinate, have knowledge cutoffs, and can't be cheaply updated with new or private information. RAG addresses all three without retraining.

## Why It Matters

RAG has become the dominant pattern for grounding LLMs in external knowledge because it:

- **Decouples knowledge from weights** — update the knowledge base without touching the model
- **Enables attribution** — responses can cite source documents
- **Scales to private data** — proprietary corpora don't require fine-tuning
- **Reduces hallucination** — when retrieval works correctly, the model generates from evidence rather than confabulation

It's the foundational layer for most enterprise AI deployments and a prerequisite for serious [Long-Term Memory](../concepts/long-term-memory.md) and [Semantic Memory](../concepts/semantic-memory.md) implementations.

## How It Works

The canonical pipeline:

1. **Indexing** — Source documents are chunked (see [Chunking](../concepts/chunking.md)), embedded into vectors, and stored in a Vector Database
2. **Retrieval** — At query time, the query is embedded and used to find semantically similar chunks via approximate nearest-neighbor search
3. **Augmentation** — Retrieved chunks are prepended to the prompt as context
4. **Generation** — The LLM generates a response conditioned on both the query and the retrieved context

The critical bottleneck is retrieval quality. If retrieval fails, generation fails regardless of model capability.

## Retrieval Approaches

**Sparse retrieval (BM25/TF-IDF):** Keyword-based, fast, interpretable. Works well when terminology is precise.

**Dense retrieval (embedding similarity):** Semantic matching. Captures synonyms and paraphrase but requires embedding infrastructure and can miss exact matches.

**[Hybrid Retrieval](../concepts/hybrid-retrieval.md):** Combines sparse and dense signals, typically via Reciprocal Rank Fusion. Currently the practical baseline for production systems.

**[Multi-Hop Retrieval](../concepts/multi-hop-retrieval.md):** Chains multiple retrieval steps to answer questions requiring synthesis across documents. Significantly harder to implement reliably.

## Key Extensions

| Extension | What it adds |
|-----------|--------------|
| [GraphRAG](graphrag.md) | Knowledge graph structure over retrieved content for better multi-hop reasoning |
| [HippoRAG](../projects/hipporag.md) | Hippocampal-inspired indexing for better associative retrieval |
| [RAPTOR](../projects/raptor.md) | Hierarchical summarization tree for multi-granularity retrieval |
| [LightRAG](../projects/lightrag.md) | Lightweight graph-based retrieval |
| [Agentic RAG](../concepts/agentic-rag.md) | LLM decides what to retrieve and when, across multiple steps |

## Who Implements It

- **[LlamaIndex](../projects/llamaindex.md)** — Primary framework for RAG pipelines; extensive tooling for indexing, retrieval, and orchestration
- **Crawl4AI** — Web crawling for RAG corpus construction
- **[Supermemory](../projects/supermemory.md)** — Personal memory layer built on RAG
- **[Zep](../projects/zep.md)** — Temporal knowledge graph extending static RAG for agent memory [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- **[Personal Knowledge Management](../concepts/personal-knowledge-management.md)** systems like [Obsidian](../projects/obsidian.md) can serve as RAG source corpora

## Concrete Example

A user asks: *"What did our Q3 earnings call say about APAC expansion?"*

1. Query embedded → similarity search over earnings call transcripts
2. Top 5 relevant passages retrieved
3. Passages + query injected into prompt
4. LLM synthesizes answer citing retrieved passages

Without RAG, the model either hallucinates an answer or correctly admits ignorance. With RAG, it can reason from the actual document — provided retrieval surfaces the right content.

## Practical Limitations

**Retrieval can fail silently.** If the relevant document isn't retrieved, the model may still generate a confident but wrong answer. This is harder to detect than a model simply not knowing something.

**Chunking is load-bearing and underappreciated.** Poor chunking strategies (wrong size, wrong overlap, ignoring document structure) degrade retrieval quality substantially before any model touches the data.

**Context window pressure.** Retrieved chunks consume tokens. Retrieving too little misses relevant content; retrieving too much dilutes signal or exceeds context limits. [Context Compression](../concepts/context-compression.md) is one mitigation.

**Latency.** Each retrieval step adds latency. Multi-hop and agentic variants multiply this cost.

**[Hallucination Compounding](../concepts/hallucination-compounding.md).** Poorly retrieved or partially relevant context can mislead the model into confident errors that are harder to detect than clean hallucinations.

**Static retrieval misses temporal relationships.** Standard vector RAG treats all documents as equally current. Zep's temporal knowledge graph architecture addresses this for enterprise contexts. [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

## An Honest Alternative View

At small-to-medium scale, LLM-maintained markdown wikis (Karpathy's approach) can match or beat retrieval-based systems: the LLM incrementally compiles source documents into structured wiki articles with backlinks, and queries trigger updates that improve the knowledge base over time. The bottleneck shifts from retrieval architecture to wiki curation quality. [Source](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Source](../../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)

[Knowledge Graphs](../concepts/knowledge-graphs.md) are an alternative structural approach for domains where explicit relationships matter more than semantic similarity. [Context Engineering](../concepts/context-engineering.md) is the broader discipline of which RAG is one component.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.4)
- [Knowledge Graphs](../concepts/knowledge-graphs.md) — alternative_to (0.6)
- [GraphRAG](../concepts/graphrag.md) — extends (0.7)
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md) — part_of (0.7)
- Vector Database — implements (0.8)
- [Semantic Memory](../concepts/semantic-memory.md) — implements (0.6)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.5)
- [Long-Term Memory](../concepts/long-term-memory.md) — implements (0.6)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.6)
- [Agentic RAG](../concepts/agentic-rag.md) — extends (0.8)
- [Knowledge Base Retrieval](../concepts/knowledge-base-retrieval.md) — implements (0.8)
- [Self-Healing Knowledge Bases](../concepts/self-healing-knowledge-bases.md) — part_of (0.5)
- [Memory Consolidation](../concepts/memory-consolidation.md) — part_of (0.4)
- [Context Compression](../concepts/context-compression.md) — alternative_to (0.4)
- [Obsidian](../projects/obsidian.md) — part_of (0.4)
- [Personal Knowledge Management](../concepts/personal-knowledge-management.md) — implements (0.5)
- [User Profiling](../concepts/user-profiling.md) — part_of (0.4)
- [Temporal Reasoning](../concepts/temporal-reasoning.md) — part_of (0.4)
- Continual Learning — part_of (0.4)
- [Core Memory](../concepts/core-memory.md) — implements (0.4)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — part_of (0.4)
- [Supermemory](../projects/supermemory.md) — part_of (0.4)
- [LlamaIndex](../projects/llamaindex.md) — implements (0.8)
- [HippoRAG](../projects/hipporag.md) — extends (0.8)
- [RAPTOR](../projects/raptor.md) — extends (0.8)
- [LightRAG](../projects/lightrag.md) — extends (0.8)
- [Agentic RAG](../concepts/agentic-rag.md) — extends (0.8)
- [Multi-Hop Retrieval](../concepts/multi-hop-retrieval.md) — extends (0.7)
- [Chunking](../concepts/chunking.md) — implements (0.7)
- [Hallucination Compounding](../concepts/hallucination-compounding.md) — alternative_to (0.4)
- Crawl4AI — implements (0.5)

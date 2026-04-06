---
entity_id: rag
type: concept
bucket: knowledge-bases
abstract: >-
  RAG retrieves relevant documents from an external store and includes them in
  the LLM's context window, grounding responses in specific content without
  retraining the model. The key differentiator is decoupling knowledge from
  model weights.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - repos/getzep-graphiti.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - repos/aiming-lab-simplemem.md
  - repos/microsoft-llmlingua.md
  - repos/supermemoryai-supermemory.md
  - repos/osu-nlp-group-hipporag.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/memorilabs-memori.md
  - repos/mirix-ai-mirix.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/thedotmack-claude-mem.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/caviraoss-openmemory.md
  - repos/infiniflow-ragflow.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/kepano-obsidian-skills.md
  - repos/agent-on-the-fly-memento.md
  - repos/michaelliv-napkin.md
  - repos/mem0ai-mem0.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - mcp
  - episodic-memory
  - context-engineering
  - graphrag
  - obsidian
  - mem0
  - openai
  - semantic-memory
  - claude-code
  - agent-memory
  - knowledge-graph
  - letta
  - continual-learning
  - hybrid-retrieval
  - longmemeval
  - andrej-karpathy
  - claude
  - cursor
  - openclaw
  - react
  - langchain
  - gemini
  - bm25
  - graphiti
  - zep
  - langgraph
  - procedural-memory
  - agentic-rag
  - crewai
  - vector-database
  - core-memory
  - supermemory
  - grpo
  - openai-codex
  - windsurf
  - progressive-disclosure
  - vllm
  - claude-md
  - locomo
  - chromadb
  - ace
last_compiled: '2026-04-06T01:57:21.537Z'
---
# Retrieval-Augmented Generation (RAG)

## What It Is

RAG connects LLMs to external knowledge at inference time. Rather than expecting a model to memorize everything in its weights during training, RAG retrieves relevant passages from a separate store and injects them into the prompt. The model then generates a response conditioned on both the query and the retrieved content.

The technique originated from a 2020 Facebook AI paper by Lewis et al. that combined a dense retrieval model (DPR) with a sequence-to-sequence generator (BART), but the label now covers a much broader class of systems: any architecture where retrieval augments generation.

## Why It Matters

LLMs have three fundamental limitations that RAG directly addresses:

1. **Knowledge cutoffs**: Model weights encode training data up to a fixed date. RAG systems can retrieve from continuously updated stores.
2. **Hallucination**: Models generate plausible-sounding but fabricated facts when they lack information. Grounding responses in retrieved passages reduces this, though does not eliminate it.
3. **Context constraints**: Models cannot practically memorize entire document corpora. RAG selectively surfaces the relevant subset at query time.

For production knowledge base systems, RAG is typically the starting point before more complex architectures like [GraphRAG](../projects/graphrag.md) or [Agentic RAG](../concepts/agentic-rag.md).

## How It Works

A RAG pipeline has two phases: **indexing** (done offline) and **retrieval + generation** (done at query time).

### Indexing

1. **Chunking**: Documents split into fixed-size passages, typically 256-1024 tokens. Smaller chunks (256-512 tokens) yield more precise retrieval; larger chunks provide more context per retrieved passage. The chunk size decision propagates through everything downstream.

2. **Embedding**: Each chunk is encoded by a dense retrieval model (e.g., `text-embedding-ada-002`, E5, BGE) into a vector representation. The vector captures semantic meaning rather than keyword presence.

3. **Storage**: Vectors stored in a [vector database](../concepts/vector-database.md) ([ChromaDB](../projects/chromadb.md), [Pinecone](../projects/pinecone.md), Qdrant, pgvector). The original text is stored alongside the vector for retrieval.

### Retrieval

At query time, the user's query is embedded with the same model used during indexing. The vector database performs approximate nearest-neighbor (ANN) search to find the k most similar chunk vectors (typically k=5-20). These chunks are the retrieved passages.

**[BM25](../concepts/bm25.md)** (a sparse, keyword-based algorithm) often complements dense retrieval. Sparse retrieval excels at exact matches — proper nouns, codes, technical terms — while dense retrieval handles semantic paraphrase. Combining both is [Hybrid Retrieval](../concepts/hybrid-retrieval.md), which consistently outperforms either alone.

### Generation

Retrieved chunks are assembled into a prompt with the original query:

```
Context:
[chunk 1]
[chunk 2]
...

Question: [user query]

Answer:
```

The LLM generates a response conditioned on this assembled prompt. Systems like [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), and [LlamaIndex](../projects/llamaindex.md) provide framework abstractions for this pipeline. Production LLMs including [Claude](../projects/claude.md), [Gemini](../projects/gemini.md), and [OpenAI](../projects/openai.md) models all implement RAG patterns in their products.

## Variants and Extensions

### GraphRAG

[GraphRAG](../projects/graphrag.md) replaces the flat vector index with a knowledge graph + hierarchical community summaries. The Microsoft paper on GraphRAG found it wins on multi-hop reasoning (+1 F1) and temporal queries (+23.3 F1 points) versus standard RAG, while RAG wins on single-hop factual queries (+1.77 F1). The key finding for practitioners: concatenating both retrieval approaches yields +6.4% on multi-hop tasks — the approaches are complementary, not competitive. The RAG vs GraphRAG systematic evaluation also found that graph construction misses roughly 34% of answer-relevant entities, creating a hard ceiling for pure graph approaches.

### Agentic RAG

[Agentic RAG](../concepts/agentic-rag.md) gives agents retrieval as a tool call rather than running retrieval before every generation. The agent decides when to retrieve, what to query, and can issue multiple retrieval calls across a reasoning chain. This pairs naturally with [ReAct](../concepts/react.md) — the agent interleaves retrieval tool calls with reasoning steps. Coding assistants like [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and [Windsurf](../projects/windsurf.md) use this pattern to pull relevant code context on demand.

### Hybrid Retrieval

[Hybrid Retrieval](../concepts/hybrid-retrieval.md) combines dense (embedding-based) and sparse (BM25-based) retrieval, fusing scores via reciprocal rank fusion or weighted combination. Near-universally better than either alone. The main cost is running two retrieval systems.

### HippoRAG and RAPTOR

[HippoRAG](../projects/hipporag.md) takes inspiration from the hippocampal-cortical memory model, building associative memory structures that support multi-hop retrieval better than flat vector search. [RAPTOR](../projects/raptor.md) recursively clusters chunks and generates summaries at each level, enabling retrieval at multiple granularities — useful when queries require both high-level context and specific details.

## Relationship to Other Memory Approaches

RAG is one answer to the question: how does an agent access knowledge beyond its context window? The alternatives each make different tradeoffs:

| Approach | Mechanism | Tradeoff |
|---|---|---|
| RAG | Retrieve and inject at query time | Fresh, scalable; no persistence between calls |
| [Core Memory](../concepts/core-memory.md) / Letta blocks | Editable text in the system prompt | Agent-controlled; bounded by character limits |
| [Semantic Memory](../concepts/semantic-memory.md) + [Episodic Memory](../concepts/episodic-memory.md) | Structured memory tiers with decay | Cognitively grounded; complex to tune |
| [Knowledge Graph](../concepts/knowledge-graph.md) | Graph traversal over entities | Relational queries; expensive to build |
| [Continual Learning](../concepts/continual-learning.md) | Update model weights | True internalization; catastrophic forgetting risk |
| [Model Context Protocol](../concepts/mcp.md) | Standardized tool calls to data sources | Flexible; adds latency per call |

[Letta](../projects/letta.md)'s documentation draws the distinction explicitly: "retrieval (or RAG) is a tool for agent memory, it is not 'memory' in of itself." RAG surfaces information on demand; it does not enable learning or adaptation. Agents using Letta's `core_memory_replace` tool actually modify their own context window based on past interactions — RAG does not do this.

[Agent Memory](../concepts/agent-memory.md) architectures often layer RAG as one tier (archival or long-term retrieval) on top of faster-access in-context memory. Letta calls this archival memory and exposes it via an `archival_memory_search` tool. [Zep](../projects/zep.md) and [Graphiti](../projects/graphiti.md) add temporal reasoning on top of graph-structured memory.

## Strengths

**Domain specificity without retraining**: Point a RAG system at a proprietary document corpus and the LLM immediately has access to that knowledge. No fine-tuning, no extended pre-training.

**Citable outputs**: Retrieved passages provide source attribution. The model can quote or reference specific documents, which matters for enterprise trust.

**Knowledge updatability**: Update the index when documents change. No model retraining cycle.

**Cost-effectiveness at scale**: One LLM serves many knowledge bases via different indices. Fine-tuning a separate model per domain is impractical.

**Works with any LLM**: RAG is model-agnostic. [vLLM](../projects/vllm.md), [LangChain](../projects/langchain.md), [CrewAI](../projects/crewai.md), and [ACE Framework](../concepts/ace.md) all implement it against different underlying models.

## Limitations

### The Retrieval Quality Ceiling

Everything downstream depends on whether the right chunks were retrieved. If the answer-relevant passage is not in the top-k results, no amount of generation quality fixes it. The systematic RAG vs GraphRAG evaluation found that graph extraction pipelines miss ~34% of answer-relevant entities — and flat vector retrieval has analogous failure modes on queries requiring cross-passage reasoning. A single retrieved chunk rarely contains enough context for multi-hop questions.

**Concrete failure mode**: A user asks "How did the policy change between the 2021 and 2023 versions affect the approval threshold?" Two relevant chunks exist — one from each document version — but the query embeds closest to the 2023 version only. The retrieved context is incomplete. The model either hallucinates a comparison or admits it cannot answer. Hybrid retrieval and multi-query expansion partially mitigate this but do not solve it.

### Unspoken Infrastructure Assumption

RAG assumes your documents are chunkable into semantically coherent, fixed-size passages. This works for text. It breaks for tabular data (row-level chunking loses column context), code (function boundaries do not align with token budgets), PDFs with complex layouts (charts, multi-column text, footnotes), and highly interdependent documents where meaning requires reading across sections.

### No Persistent Learning

RAG does not update based on user feedback. Every session starts fresh from the same index. Contrast with [Continual Learning](../concepts/continual-learning.md) or agent memory systems that adapt over time. For use cases requiring personalization — remembering this specific user's preferences, past decisions, or accumulated context — RAG alone is insufficient.

### Chunk Size is a Load-Bearing Decision

Smaller chunks improve retrieval precision but reduce per-chunk context. Larger chunks provide more context but reduce retrieval specificity. This parameter interacts with the embedding model, the re-ranking strategy, the LLM's context window, and the query distribution. Teams routinely underestimate how much this single decision affects end-to-end system quality.

## When Not to Use RAG

**When your queries require synthesizing an entire corpus.** Asking "What are the dominant themes across all our customer support tickets?" requires reading everything. RAG retrieves fragments; it cannot summarize a corpus. GraphRAG's community-based approach, or simple map-reduce over source text, handles this better.

**When knowledge must be updated in real time.** Indexing pipelines have latency. If a document changes and the answer must reflect that change within seconds, RAG's offline indexing model is wrong for the problem.

**When relational queries dominate.** "Who reported to Alice, and which of those people were involved in Project X?" requires graph traversal, not nearest-neighbor search. [Graphiti](../projects/graphiti.md) or [Knowledge Graph](../concepts/knowledge-graph.md) approaches handle this better.

**When the latency budget is very tight.** Retrieval adds at minimum one embedding call plus a vector search. For sub-100ms inference requirements, pre-loading relevant context or caching is preferable.

**When the corpus fits in the context window.** For small document sets that fit within modern 128K-200K token context windows, just include everything. Retrieval adds complexity and failure modes that are unnecessary when you can provide full context.

## Benchmarks and Evaluation

**HotPotQA**: Standard multi-hop QA benchmark requiring reasoning across multiple documents. RAG scores ~60-64 F1 (Llama 70B) on HotPotQA; GraphRAG (local search) scores ~64-65 F1. These numbers are from the Han et al. systematic evaluation — independently validated head-to-head comparison rather than self-reported.

**NQ (Natural Questions)**: Single-hop factual retrieval. RAG scores 64.78-68.18 F1 (Llama 8B/70B); GraphRAG (local) scores 63.01-65.44 F1. RAG wins on single-hop. These numbers are also from the Han et al. evaluation.

**[LongMemEval](../projects/longmemeval.md)**: Benchmark specifically for long-term memory in conversational agents, testing whether systems can accurately recall and reason over information from many prior sessions.

Note on self-reported vs. verified: most RAG system benchmarks are self-reported by the systems' authors against their chosen datasets. The Han et al. RAG vs GraphRAG comparison is one of the more rigorous independent evaluations because it uses a unified evaluation protocol controlling for chunking, embedding models, and generation settings.

## Implementation Landscape

**Framework abstractions**: [LangChain](../projects/langchain.md) and [LlamaIndex](../projects/llamaindex.md) provide end-to-end RAG pipeline abstractions. [LangGraph](../projects/langgraph.md) enables RAG within stateful agent workflows.

**Vector stores**: [ChromaDB](../projects/chromadb.md) (local, easy setup), [Pinecone](../projects/pinecone.md) (managed, production-scale), [Qdrant](../projects/qdrant.md) (open-source, production), pgvector (PostgreSQL extension, good for teams already on Postgres).

**Optimization**: [DSPy](../projects/dspy.md) provides prompt optimization for RAG pipelines. GEPA (Genetic-Pareto optimizer, ICLR 2026 Oral) can optimize RAG pipeline parameters via execution trace analysis, achieving meaningful accuracy improvements through targeted reflection on failure cases.

**Selection guidance**:
- Use RAG when you need domain-specific knowledge, citability, and can live with retrieval as a single-pass operation
- Use [GraphRAG](../projects/graphrag.md) when queries span entities across documents, require temporal reasoning, or need corpus-wide synthesis
- Use [Hybrid Retrieval](../concepts/hybrid-retrieval.md) (RAG + BM25) when your corpus contains technical terms, codes, or names
- Use [Agentic RAG](../concepts/agentic-rag.md) when the number of relevant documents per query varies widely or when multi-hop retrieval is needed
- Use [Letta](../projects/letta.md) when memory must persist and evolve across sessions rather than being retrieved fresh each time

## Unresolved Questions

**Chunk overlap and contamination**: Most implementations use overlapping chunks to avoid splitting information at boundaries. How much overlap is optimal, and how does it interact with deduplication during retrieval? Little rigorous work exists on this.

**Embedding model drift**: When the embedding model is updated or replaced, all existing vectors become incompatible with new vectors. Re-indexing large corpora is expensive. Production RAG systems need a migration strategy for embedding model updates — documentation almost never addresses this.

**Evaluation validity**: The Han et al. paper found LLM-as-judge evaluations exhibit significant position bias (reversing the order of RAG vs GraphRAG outputs can completely invert preference judgments). Most published RAG evaluations use LLM-as-judge. This calls into question any evaluation that does not control for presentation order and use multiple metrics.

**Cost at scale**: Indexing pipelines make assumptions about document update frequency. For corpora updated continuously (news feeds, live product catalogs), the cost and latency of maintaining a fresh index is rarely addressed in documentation or benchmarks.

## Related Concepts

- [Hybrid Retrieval](../concepts/hybrid-retrieval.md): Combining dense and sparse retrieval
- [Semantic Memory](../concepts/semantic-memory.md): RAG as one implementation of semantic memory in agents
- [Agent Memory](../concepts/agent-memory.md): Broader taxonomy of memory types in AI systems
- [Context Engineering](../concepts/context-engineering.md): The discipline of constructing what goes into the LLM's context window
- [Agentic RAG](../concepts/agentic-rag.md): RAG as an agent tool call rather than a pipeline step
- [Vector Database](../concepts/vector-database.md): The storage layer enabling approximate nearest-neighbor search
- [BM25](../concepts/bm25.md): Sparse retrieval algorithm that complements dense embeddings

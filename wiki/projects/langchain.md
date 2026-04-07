---
entity_id: langchain
type: project
bucket: agent-systems
abstract: >-
  LangChain is a Python/JavaScript framework for building LLM applications via
  composable abstractions (chains, agents, retrievers, memory); its key
  differentiator is a massive integration library connecting 100+ LLMs, vector
  stores, and tools through a unified interface.
sources:
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/microsoft-llmlingua.md
  - repos/caviraoss-openmemory.md
  - repos/langchain-ai-langgraph-reflection.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/laurian-context-compression-experiments-2508.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/memorilabs-memori.md
related:
  - rag
  - openai
  - langgraph
  - episodic-memory
  - mcp
  - crewai
  - agent-memory
  - llamaindex
  - context-compression
  - llm-as-judge
  - pinecone
  - gemini
  - github-copilot
last_compiled: '2026-04-07T11:39:22.388Z'
---
# LangChain

## What It Does

LangChain gives developers a structured way to build applications on top of LLMs. The core idea: provide standard interfaces for common operations (calling an LLM, retrieving documents, running tools, managing memory) and let developers compose those operations into pipelines called chains or agents.

The framework ships in two primary packages: `langchain-core` defines base abstractions and the [LCEL (LangChain Expression Language)](https://python.langchain.com/docs/concepts/lcel/) pipeline syntax, while `langchain-community` and provider-specific packages (e.g., `langchain-openai`, `langchain-anthropic`) implement the actual integrations. A companion library, [LangGraph](../projects/langgraph.md), handles stateful multi-agent workflows with explicit graph-based control flow.

The differentiator is breadth of integration. LangChain connects to [OpenAI](../projects/openai.md), [Gemini](../projects/gemini.md), [Anthropic](../projects/anthropic.md), [Ollama](../projects/ollama.md), [Pinecone](../projects/pinecone.md), [ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [FAISS](../projects/faiss.md), [Elasticsearch](../projects/elasticsearch.md), and dozens more through a single API surface. This breadth is both its biggest strength and its biggest liability.

## Core Architecture

### LCEL and the Runnable Protocol

The fundamental unit is `Runnable`. Every component — LLMs, prompts, retrievers, output parsers — implements `.invoke()`, `.stream()`, and `.batch()`. LCEL composes these via the `|` pipe operator:

```python
chain = prompt | llm | output_parser
result = chain.invoke({"question": "..."})
```

Under the hood, `RunnableSequence` handles the pipe operator, threading output from one component to the next. This gives uniform tracing, streaming, and async support across any chain composition.

### Retrieval and RAG

LangChain's retrieval stack follows a fetch-then-compress pattern relevant to [Retrieval-Augmented Generation](../concepts/rag.md):

1. A `VectorStoreRetriever` queries an embedding index
2. Optional `ContextualCompressionRetriever` wraps it, applying a `DocumentCompressor`
3. The `LLMChainExtractor` (the default compressor) sends each retrieved document plus the query to an LLM, keeping only relevant passages

This is the exact prompt pattern referenced in production agentic RAG work — researchers and practitioners who optimize [Context Compression](../concepts/context-compression.md) often start with `LLMChainExtractor`'s prompt as a baseline, then tune it for cheaper models like gpt-4o-mini using [DSPy](../projects/dspy.md) or gradient-based methods. The compressor pattern is defined in `langchain/retrievers/document_compressors/chain_extract.py`, with the prompt in `chain_extract_prompt.py`.

[Hybrid Search](../concepts/hybrid-search.md) combining dense and sparse (BM25) retrieval runs through `EnsembleRetriever`, which merges results using [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md) by default.

### Agent Memory

LangChain implements several memory types relevant to [Agent Memory](../concepts/agent-memory.md):

- `ConversationBufferMemory`: stores raw message history
- `ConversationSummaryMemory`: uses an LLM to compress history into a running summary
- `VectorStoreRetrieverMemory`: retrieves semantically relevant past exchanges

These map roughly to [Episodic Memory](../concepts/episodic-memory.md) patterns. They do not implement [Core Memory](../concepts/core-memory.md) or [Procedural Memory](../concepts/procedural-memory.md) in any rigorous sense. For production memory management across sessions, most teams now reach for dedicated memory layers ([Mem0](../projects/mem0.md), [Letta](../projects/letta.md), [Zep](../projects/zep.md)) and call them from LangChain rather than using built-in memory classes.

### Tool Use and Agents

The `AgentExecutor` implements a [ReAct](../concepts/react.md)-style loop: the LLM outputs a thought and action, LangChain executes the tool, appends the observation to the prompt, and repeats until the LLM emits a final answer. This is the classic Thought/Action/Observation cycle.

For more complex control flow — branching, cycles, human-in-the-loop — [LangGraph](../projects/langgraph.md) is the recommended path. LangGraph was built by the same team specifically because `AgentExecutor`'s linear loop is too rigid for multi-agent systems.

### LLM-as-Judge Integration

LangChain includes evaluation utilities under `langchain.evaluation` that implement [LLM-as-Judge](../concepts/llm-as-judge.md) patterns: `CriteriaEvalChain` and `LabeledCriteriaEvalChain` prompt an LLM to score outputs against criteria. These are self-reported quality metrics without independent validation.

## Key Numbers

- **GitHub stars**: ~100k (Python), ~13k (JavaScript) — among the most-starred LLM framework repositories; these are self-reported star counts and reflect popularity rather than production adoption or quality
- **Integrations**: 100+ LLM providers, 50+ vector stores, dozens of document loaders — self-reported; actual tested and maintained integrations are a smaller subset
- **LLMLingua integration**: Microsoft's LLMLingua prompt compressor (5,985 stars, EMNLP 2023 and ACL 2024) ships as a LangChain retriever, enabling up to 20x prompt compression directly in retrieval pipelines

## Strengths

**Breadth of integration.** If an LLM provider, vector database, or external tool exists, there is almost certainly a LangChain integration. This matters most during prototyping when you want to swap models or stores without rewriting retrieval logic.

**Ecosystem and documentation.** The number of tutorials, cookbook examples, and Stack Overflow answers for LangChain problems far exceeds any alternative. Teams onboarding junior engineers to LLM work benefit from this.

**Composability for standard patterns.** RAG pipelines with retrieval, compression, and generation; simple ReAct agents; document Q&A — these are well-trodden paths in LangChain with many examples. Building them from scratch takes more time than adopting the framework.

**LangGraph escape hatch.** When `AgentExecutor` proves too rigid, [LangGraph](../projects/langgraph.md) provides proper graph-based state management without abandoning the LangChain ecosystem entirely.

## Critical Limitations

**Abstraction overhead turns into debugging debt.** The most common failure mode: a developer builds a RAG pipeline, it produces wrong answers, and tracing the problem requires understanding `RunnableSequence` internals, the `ContextualCompressionRetriever` state machine, and how `LLMChainExtractor` reformats documents before sending them to the LLM. The layers that make prototyping fast make debugging slow. Production teams frequently describe hitting a wall where the abstractions obscure what's actually happening in the prompt.

**Unspoken infrastructure assumption.** LangChain's integration breadth assumes you have stable, low-latency access to external APIs. In enterprise environments with network policies, private VPCs, or air-gapped deployments, the community integrations often break in non-obvious ways. The framework was designed for cloud-native development; adapting it to constrained network environments requires forking or replacing individual components.

## When NOT to Use It

**Latency-sensitive production systems.** Each LCEL pipe adds function call overhead. For high-throughput, low-latency inference (e.g., autocomplete, real-time search ranking), the overhead compounds. Direct API calls with purpose-built prompts outperform equivalent LangChain chains.

**When you need precise context control.** [Context Engineering](../concepts/context-engineering.md) requires knowing exactly what goes into the prompt. LangChain's memory classes and retrieval wrappers insert content with limited transparency. Teams doing careful [Context Management](../concepts/context-management.md) often find they spend more effort fighting LangChain's defaults than building from scratch.

**Complex stateful multi-agent systems.** `AgentExecutor` handles linear ReAct loops. Anything requiring parallel agent execution, conditional branching based on agent output, or shared state across agents needs [LangGraph](../projects/langgraph.md) — at which point you are mostly writing LangGraph code that happens to import LangChain components.

**When your team knows Python well but not LangChain.** The framework has significant surface area. A competent engineer who does not know LangChain can build a functional RAG pipeline with direct API calls and a vector store client in less time than learning LangChain's abstractions produce equivalent behavior.

## Unresolved Questions

**Maintenance surface of community integrations.** LangChain's 100+ integrations are maintained by varying combinations of the LangChain team, third-party vendors, and community contributors. There is no public SLA or deprecation policy for specific integrations. It is unclear which integrations are tested on each release.

**Cost at scale.** The `ContextualCompressionRetriever` with `LLMChainExtractor` fires one LLM call per retrieved document. For a query retrieving 10 documents, that's 11 LLM calls (10 compression + 1 generation). At production scale with millions of queries per day, this cost is rarely surfaced in documentation. Teams discover it in billing.

**Conflict between LCEL and legacy chains.** LangChain contains two overlapping paradigms: pre-LCEL chains (e.g., `RetrievalQA`, `ConversationalRetrievalChain`) and LCEL-based compositions. Documentation recommends LCEL but legacy chains persist. It is not clear when legacy chains will be removed or if they will be maintained indefinitely.

**Memory architecture going forward.** The built-in memory classes (`ConversationBufferMemory`, etc.) are deprecated in favor of LangGraph's state management. The transition path for applications using in-memory conversation state is not well-documented.

## Alternatives

- **[LlamaIndex](../projects/llamaindex.md)**: Use when your primary task is document ingestion, indexing, and retrieval over large corpora. LlamaIndex's data connectors and index types (tree index, keyword index, vector index) are more sophisticated than LangChain's document loaders and retrievers. Better default choice for knowledge-base search applications.

- **[DSPy](../projects/dspy.md)**: Use when you want to optimize prompts programmatically rather than write them by hand. DSPy treats prompt engineering as a compilation problem. Better for teams who want principled optimization rather than manual iteration.

- **[LangGraph](../projects/langgraph.md)**: Use when building multi-agent systems that require explicit state, branching, and cycles. LangGraph is the production-grade replacement for `AgentExecutor`.

- **Direct API calls + thin wrappers**: Use when you know exactly what your pipeline needs and can afford to write it explicitly. [LiteLLM](../projects/litellm.md) provides provider-agnostic LLM calls without the abstraction overhead. Preferable for latency-sensitive or tightly-specified production systems.

- **[CrewAI](../projects/crewai.md)**: Use when building role-based multi-agent workflows with a higher-level abstraction than LangGraph. More opinionated, faster to get running for common patterns like "researcher + writer + reviewer" pipelines.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.5)
- [OpenAI](../projects/openai.md) — part_of (0.5)
- [LangGraph](../projects/langgraph.md) — created_by (0.8)
- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.3)
- [Model Context Protocol](../concepts/mcp.md) — part_of (0.4)
- [CrewAI](../projects/crewai.md) — competes_with (0.5)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.6)
- [LlamaIndex](../projects/llamaindex.md) — competes_with (0.6)
- [Context Compression](../concepts/context-compression.md) — implements (0.6)
- [LLM-as-Judge](../concepts/llm-as-judge.md) — part_of (0.4)
- [Pinecone](../projects/pinecone.md) — part_of (0.5)
- [Gemini](../projects/gemini.md) — part_of (0.4)
- [GitHub Copilot](../projects/github-copilot.md) — part_of (0.3)

---
entity_id: langchain
type: project
bucket: agent-systems
abstract: >-
  LangChain is a framework for composing LLM-powered applications via chains,
  agents, and tool abstractions, distinguished by its ecosystem breadth
  (integrations with 100+ providers) at the cost of abstraction overhead and
  debugging complexity.
sources:
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/microsoft-llmlingua.md
  - repos/caviraoss-openmemory.md
  - repos/wangziqi06-724-office.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/langchain-ai-langgraph-reflection.md
  - repos/laurian-context-compression-experiments-2508.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/kayba-ai-agentic-context-engine.md
related:
  - Claude Code
  - OpenAI
  - Retrieval-Augmented Generation
  - Cursor
  - Model Context Protocol
  - CrewAI
  - LlamaIndex
  - LangGraph
  - AutoGen
  - Harrison Chase
last_compiled: '2026-04-05T20:23:05.096Z'
---
# LangChain

## What It Is

LangChain is a Python and JavaScript framework for building applications on top of large language models. Harrison Chase released the Python library in October 2022; it became one of the fastest-growing open-source projects in 2023, reaching 90,000+ GitHub stars. The core idea: provide composable abstractions for the patterns that recur in LLM applications — calling models, chaining steps together, managing prompts, retrieving context, and running agents with tools.

The framework ships in several packages. `langchain-core` holds base abstractions and the LCEL (LangChain Expression Language) interface. `langchain` has chains, agents, and retrieval logic. `langchain-community` bundles third-party integrations. Provider-specific packages like `langchain-openai` and `langchain-anthropic` handle individual model APIs. LangGraph, a separate but related project, handles stateful multi-actor workflows and is now the recommended path for agent orchestration.

## Core Mechanism

### LangChain Expression Language (LCEL)

LCEL is the central composition primitive, introduced in 2023 to replace the older class-based chain system. It uses the pipe operator to chain components:

```python
chain = prompt | model | output_parser
result = chain.invoke({"question": "What is RAG?"})
```

Each component implements the `Runnable` interface (`langchain_core/runnables/base.py`), which standardizes `.invoke()`, `.stream()`, `.batch()`, and `.ainvoke()` across all objects — models, prompts, retrievers, output parsers, tools. The `RunnableLambda` wrapper turns any Python function into a composable unit.

LCEL chains support automatic streaming, parallel execution via `RunnableParallel`, fallback logic via `.with_fallbacks()`, retry logic via `.with_retry()`, and tracing hooks. The composition happens lazily — the pipe operator builds a graph, and execution happens on `.invoke()`.

### Retrieval-Augmented Generation

LangChain's [RAG](../concepts/retrieval-augmented-generation.md) pipeline assembles: a document loader, a text splitter, an embedding model, a vector store, a retriever, and a generation chain. The `langchain/chains/retrieval_qa/` module provides the standard question-answering pattern. Third-party context compression integrations, including [LLMLingua](../raw/repos/microsoft-llmlingua.md), plug in as `ContextualCompressionRetriever` wrappers that sit between the retriever and the generation step.

The `BaseRetriever` interface in `langchain_core/retrievers.py` standardizes `.get_relevant_documents()`, making vector stores (Chroma, FAISS, Pinecone, Weaviate), keyword stores (BM25), and hybrid retrievers interchangeable.

### Agents and Tools

The legacy `AgentExecutor` runs a loop: call the LLM, parse its output for tool calls, execute tools, feed results back. This is implemented in `langchain/agents/agent.py`. The executor handles parsing errors, maximum iterations, and output formatting, but this loop is opaque — debugging mid-chain state requires explicit callbacks or tracing.

[LangGraph](../projects/langgraph.md) supersedes `AgentExecutor` for most production use. It represents agent logic as a directed graph with explicit state, conditional edges, and human-in-the-loop support. The shift from implicit loop to explicit graph resolves the primary failure mode of `AgentExecutor`: you cannot inspect or intervene in the middle of execution.

### Callbacks and Observability

The callback system (`langchain_core/callbacks/`) fires events at each stage of a chain run. LangSmith, the hosted tracing product, attaches via these callbacks to capture full execution traces. Every `Runnable` accepts a `config` argument with callbacks attached. This is the primary observability path — logging, latency tracking, and debugging all flow through callbacks.

## Key Numbers

- 90,000+ GitHub stars (Python repo) — self-reported star counts; independently observed to be one of the top 50 most-starred Python repositories as of mid-2024.
- 100+ model provider integrations across `langchain-community` and first-party packages.
- The JavaScript port (`langchainjs`) mirrors most Python functionality with a separate release cycle.

Benchmark claims from the LangChain team are primarily case study narratives rather than controlled evaluations. No independent head-to-head benchmarks comparing LangChain against raw API calls or alternative frameworks exist at scale.

## Strengths

**Integration surface.** No other framework matches the number of pre-built connectors. Vector stores, embedding providers, document loaders for PDFs, HTML, Notion, databases — adding a new data source usually means finding an existing `langchain-community` loader rather than writing one.

**LCEL composability.** The pipe-based interface makes it straightforward to build, modify, and reuse chains. Swapping a component (say, switching from `ChatOpenAI` to `ChatAnthropic`) requires changing one object in the chain.

**Ecosystem tooling.** LangSmith provides execution tracing out of the box. The callback architecture means adding tracing, cost tracking, or custom logging is additive rather than requiring code changes to core logic.

**Document and community coverage.** For most patterns, a LangChain example exists. Stack Overflow threads, GitHub issues, and blog posts provide answers faster than with lower-level approaches.

## Critical Limitations

**Concrete failure mode: abstraction leakage under model differences.** LangChain presents a uniform interface across providers, but provider APIs diverge on tool calling formats, system message placement, streaming behavior, and error types. When Anthropic changed its API for system prompt handling, chains built on the generic `ChatAnthropic` wrapper produced silent behavior changes. The `langchain_core/messages/` types (`SystemMessage`, `HumanMessage`, `AIMessage`) smooth over some differences but not all — tool use schemas, for instance, require provider-specific handling that leaks through the abstraction. Debugging requires understanding both the LangChain layer and the underlying provider API simultaneously.

**Unspoken infrastructure assumption: synchronous iteration speed.** LangChain's LCEL streaming and async support work well for individual requests, but the framework was designed around call-and-response patterns. High-throughput scenarios — thousands of concurrent document processing tasks, continuous ingestion pipelines — require careful management of thread pools, async contexts, and memory, none of which LCEL abstracts. Production deployments at scale typically end up wrapping LangChain calls in separate worker processes rather than using the framework's native concurrency primitives.

## When Not to Use It

**High-performance inference pipelines.** If you're running batch embeddings or parallel document classification at scale, the overhead from LangChain's callback system, message serialization, and Runnable wrapping adds latency and memory cost with no benefit. Call the provider SDK directly.

**Simple single-model applications.** A chat application that calls one model and formats the output does not need chains, retrievers, or agents. The framework adds complexity without payoff.

**Teams that need full stack visibility.** LangChain's abstractions make it harder to see exactly what's being sent to the model. Teams debugging prompt formatting issues, token counts, or unexpected completions often need to unwrap the abstraction entirely. If your team spends more time debugging LangChain behavior than model behavior, the framework is working against you.

**Tight dependency control requirements.** `langchain-community` has an enormous transitive dependency graph. Environments with strict security auditing or size constraints (edge deployment, containerized functions) pay a real cost.

## Unresolved Questions

**Governance and deprecation pace.** LangChain has deprecated and replaced major APIs multiple times (the original chain classes, early agent types, callback interfaces). There is no published long-term support policy or deprecation timeline. Teams building on LangChain abstractions face ongoing migration costs that are difficult to budget for.

**LangSmith coupling at scale.** The primary observability path assumes LangSmith. Running LangSmith in a self-hosted or air-gapped environment is possible but documented sparsely. At high call volumes, LangSmith pricing becomes a material cost center, and migrating away from it requires rebuilding the callback instrumentation layer.

**LangGraph boundary with LangChain.** The project now recommends LangGraph for agents, but the boundary between the two is not crisply documented. Whether to use `AgentExecutor`, LangGraph, or LangGraph with LangChain tools is a decision teams have to make without clear guidance on trade-offs.

## Alternatives

| Alternative | When to prefer it |
|---|---|
| [LlamaIndex](../projects/llamaindex.md) | RAG-focused applications; stronger document indexing abstractions and query engines; better default chunking strategies |
| [LangGraph](../projects/langgraph.md) | Multi-step agents with explicit state; when you need human-in-the-loop or controllable execution flow — LangGraph is now LangChain Inc.'s own recommendation for this case |
| [CrewAI](../projects/crewai.md) | Multi-agent workflows with role-based coordination; simpler mental model for teams of agents with defined responsibilities |
| [AutoGen](../projects/autogen.md) | Multi-agent conversation patterns; Microsoft-backed with stronger support for code execution and agent-to-agent communication |
| Direct SDK calls (OpenAI, Anthropic) | Single-provider applications, performance-sensitive code, or teams that want no abstraction between their code and the model API |
| [Model Context Protocol](../concepts/model-context-protocol.md) | Tool and context exposure to model clients without building a full agent framework; better fit when the goal is standardized tool access rather than orchestration |

## Related

- [Harrison Chase](../people/harrison-chase.md) — creator
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — primary pattern the framework implements
- [LangGraph](../projects/langgraph.md) — LangChain Inc.'s graph-based agent framework, now the recommended agent path

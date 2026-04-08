---
entity_id: langchain
type: project
bucket: agent-architecture
abstract: >-
  LangChain is an open-source Python/JS framework for composing LLM applications
  via chains, agents, tools, and memory abstractions — dominant by adoption but
  frequently criticized for opaque abstractions that obscure debugging.
sources:
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/microsoft-llmlingua.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - repos/caviraoss-openmemory.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/langchain-ai-langgraph-reflection.md
  - repos/laurian-context-compression-experiments-2508.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
  - vector-database
  - claude-code
  - retrieval-augmented-generation
  - anthropic
  - model-context-protocol
  - agent-memory
  - chromadb
  - cursor
  - episodic-memory
  - claude
  - context-engineering
  - codex
  - ollama
  - gemini
  - crewai
  - langgraph
last_compiled: '2026-04-08T02:40:14.042Z'
---
# LangChain

## What It Does

LangChain provides composable building blocks for LLM-powered applications: chains (sequential LLM call pipelines), agents (LLMs that select tools), memory (conversation history management), and retrievers (document fetching for RAG). It ships as Python (`langchain`) and JavaScript (`langchainjs`) packages, with a growing ecosystem of integrations across 100+ LLM providers, vector stores, and tools.

The framework's market position derives from being first: it shipped in October 2022, weeks after ChatGPT's public API became widely accessible, and absorbed the community's initial patterns for wrapping LLMs. Its GitHub star count (~100k) reflects historical adoption rather than current competitive dominance.

The core innovation — if it can be called that — was assembling a common interface layer so developers didn't have to rewrite provider-specific client code for every new model. Whether that abstraction layer has positive or negative value depends heavily on your use case.

## Architecture

LangChain's codebase reorganized in 2023-2024 into distinct packages:

- **`langchain-core`**: Base abstractions (`Runnable`, `BaseMessage`, `BaseOutputParser`). The LCEL (LangChain Expression Language) pipeline syntax (`chain = prompt | llm | parser`) lives here.
- **`langchain`**: High-level chains and agents built on top of core.
- **`langchain-community`**: Third-party integrations — vector stores, tools, document loaders. Quality varies significantly across contributors.
- **Provider packages** (`langchain-openai`, `langchain-anthropic`, etc.): Maintained by or in partnership with the providers.
- **[LangGraph](../projects/langgraph.md)**: A separate package for stateful, graph-based agent workflows. This is where LangChain Inc. is concentrating active development.
- **LangSmith**: Paid observability and tracing platform.

The central abstraction is `Runnable` — every component (LLM, prompt template, output parser, retriever) implements the same interface: `invoke()`, `stream()`, `batch()`. LCEL composes these via the `|` operator, building directed acyclic graphs of Runnables. Execution happens via `RunnableSequence`, which calls each step in order and passes output as input to the next.

## Core Mechanism

**LCEL pipelines** are the modern pattern:

```python
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate

chain = ChatPromptTemplate.from_template("Answer: {question}") | ChatOpenAI() | StrOutputParser()
chain.invoke({"question": "What is RAG?"})
```

The `|` operator creates `RunnableSequence` objects. Each component's `invoke()` takes the previous output as input. This enables streaming (`chain.stream()`), async (`chain.ainvoke()`), and batch execution with minimal code changes.

**Memory** is handled via `ConversationBufferMemory`, `ConversationSummaryMemory`, and related classes — but these are legacy patterns. Current recommended practice uses [LangGraph](../projects/langgraph.md)'s stateful graph approach for anything beyond single-turn conversation.

**RAG pipelines** use a retriever-prompt-LLM chain. The retriever interface wraps any [vector database](../concepts/vector-database.md) or search backend. LLMLingua's prompt compression integrates here as a post-retrieval, pre-LLM step, reducing retrieved document tokens by up to 20x — directly relevant for RAG pipelines where retrieved context dominates token budgets.

**Agents** use `create_react_agent()` or `create_tool_calling_agent()` to wrap an LLM with a list of tools. The agent loop runs: LLM generates a tool call → tool executes → result appended to messages → repeat until LLM produces a final response. The [ReAct](../concepts/react.md) pattern underlies the original agent executor. For production agents, LangGraph is preferred because it provides explicit state management and cycle detection.

## Key Numbers

- **~100k GitHub stars** (self-reported by GitHub counters; reflects historical adoption)
- **PyPI downloads**: consistently among the top Python packages, though many installations are transitive dependencies
- **Integration count**: 100+ LLM providers, 50+ vector stores, documented in `langchain-community`
- **LangSmith**: paid platform; pricing not publicly listed at time of writing

Benchmark performance is not a meaningful metric for LangChain — it's a framework, not a model. The relevant question is whether its abstractions add latency or debugging overhead relative to direct SDK calls.

## Strengths

**Ecosystem breadth**: If you need to swap vector stores, change LLM providers, or add a document loader for an obscure format, LangChain probably has an integration. The community package contains adapters for [ChromaDB](../projects/chromadb.md), [Ollama](../projects/ollama.md), and most major providers.

**RAG primitives**: The retriever abstraction makes it straightforward to build [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines. The `EnsembleRetriever` handles [hybrid search](../concepts/hybrid-search.md) across multiple backends.

**Documentation and examples**: Years of tutorials, Stack Overflow answers, and blog posts exist. For common patterns, finding working example code is fast.

**LLMLingua integration**: Prompt compression (via `LLMLinguaReranker` in `langchain-community`) runs after retrieval to reduce token counts before LLM calls — practical for cost management in high-throughput RAG systems.

**LangGraph**: The graph-based orchestration layer handles complex multi-step agents with proper cycle support, conditional edges, and persistent state. This is where meaningful architectural work is happening.

## Critical Limitations

**Concrete failure mode — abstraction debugging**: When a chain produces unexpected output, tracing the problem requires understanding LCEL's lazy evaluation, the specific Runnable implementations, and how intermediate values are passed. A prompt template that silently drops a variable, an output parser that swallows an error, or a retriever that returns empty results can all produce the same symptom: wrong final output. Without LangSmith (paid), introspection requires adding manual logging at each step. Direct SDK calls fail loudly with clear error messages; LangChain chains fail silently or with generic messages.

**Unspoken infrastructure assumption**: LangChain assumes a development environment where LLM API latency is the bottleneck. It doesn't account for distributed tracing, circuit breaking, or request queuing in production systems. A chain that works in a notebook will not automatically handle API rate limits, partial failures, or concurrent users. The framework has no built-in retry logic beyond what the underlying LLM client SDKs provide.

## When NOT to Use It

**Don't use LangChain when:**

- You need production-grade observability without paying for LangSmith. Direct SDK calls with your own logging are more transparent.
- Your agent logic is complex (multi-agent coordination, conditional branching, human-in-the-loop). Use [LangGraph](../projects/langgraph.md) directly, or [CrewAI](../projects/crewai.md), or [AutoGen](../projects/autogen.md).
- You're building a simple single-LLM call application. The overhead of importing and configuring LangChain chains exceeds the benefit. Use the OpenAI or Anthropic SDK directly.
- Your team is new to LLMs. LangChain's abstractions add a learning curve that delays understanding what's actually happening in the model calls.
- You need fine-grained [context engineering](../concepts/context-engineering.md). LCEL pipelines make it harder, not easier, to precisely control what goes into each prompt.

## Unresolved Questions

**Governance at scale**: The `langchain-community` package has hundreds of contributors with no clear quality bar. An integration that worked six months ago may silently break after an upstream dependency update. There's no SLA on community integrations.

**LCEL vs. direct Python**: The framework has never convincingly answered why `chain = prompt | llm | parser` is better than three lines of Python. For simple cases, it isn't. The value proposition sharpens only with complex routing, parallel execution, or streaming — patterns that LCEL handles more cleanly than raw Python but that LangGraph handles better still.

**Cost at scale**: Chains that make multiple LLM calls (agent loops, RAG with reranking) compound API costs in ways that aren't visible from the abstraction layer. The framework doesn't expose cost estimation or budget enforcement.

**Long-term trajectory**: LangChain Inc. has shifted focus to LangGraph and LangSmith. The core `langchain` package receives maintenance updates, but architectural innovation is happening in LangGraph. Whether `langchain` will remain the right entry point in two years is unclear.

## Alternatives

- **[LangGraph](../projects/langgraph.md)**: Use when building stateful agents, multi-step workflows, or any system with cycles or conditional logic. LangGraph is LangChain's own answer to LangChain's agent limitations.
- **[CrewAI](../projects/crewai.md)**: Use for multi-agent systems with role-based agents and structured task delegation. Higher-level abstraction than LangGraph, lower than LangChain's legacy agents.
- **[LlamaIndex](../projects/llamaindex.md)**: Use when the primary use case is document indexing and retrieval. LlamaIndex's data connectors and index abstractions are more purpose-built for RAG than LangChain's general-purpose chains.
- **Direct SDK** (OpenAI, Anthropic): Use for single-provider, single-model applications where transparency and debugging matter more than integration breadth.
- **[DSPy](../projects/dspy.md)**: Use when you want to optimize prompts systematically rather than write them by hand. Different paradigm — programmatic prompt optimization rather than chain composition.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): LangChain's primary production use case
- [Agent Memory](../concepts/agent-memory.md): LangChain provides memory primitives; LangGraph handles complex memory patterns
- [Context Engineering](../concepts/context-engineering.md): What LCEL pipelines are doing, often opaquely
- [Model Context Protocol](../concepts/model-context-protocol.md): LangChain tools can be exposed as MCP servers; MCP tools can be consumed as LangChain tools
- [Vector Database](../concepts/vector-database.md): LangChain's retriever abstraction wraps vector databases for RAG
- [Multi-Agent Systems](../concepts/multi-agent-systems.md): LangGraph, not core LangChain, handles multi-agent coordination properly

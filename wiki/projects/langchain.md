---
entity_id: langchain
type: project
bucket: agent-architecture
abstract: >-
  LangChain is a Python/JS framework for building LLM applications via
  composable abstractions (chains, agents, tools, memory, retrievers); its key
  differentiator is breadth of integrations rather than architectural
  sophistication.
sources:
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/memorilabs-memori.md
  - repos/caviraoss-openmemory.md
  - repos/langchain-ai-langgraph-reflection.md
  - repos/laurian-context-compression-experiments-2508.md
  - repos/microsoft-llmlingua.md
  - repos/yusufkaraaslan-skill-seekers.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
related:
  - openai
  - vector-database
  - claude-code
  - cursor
  - anthropic
  - claude
  - context-engineering
  - model-context-protocol
  - agent-memory
  - chromadb
  - episodic-memory
last_compiled: '2026-04-08T22:57:09.860Z'
---
# LangChain

## What It Does

LangChain provides a standardized interface for assembling LLM-powered applications. You compose primitives — prompts, models, output parsers, retrievers, tools — into chains and agents. The framework handles plumbing: routing messages between components, managing conversation history, integrating external APIs, and running tool-use loops.

The library splits across several packages: `langchain-core` (base abstractions and LCEL), `langchain` (chains, agents, off-the-shelf components), `langchain-community` (third-party integrations), and separate partner packages like `langchain-openai` and `langchain-anthropic`. [LangGraph](../projects/langgraph.md) is a related but distinct project for stateful, graph-based agent orchestration.

**LangChain Expression Language (LCEL)** is the architectural center. You compose chains using the `|` operator:

```python
chain = prompt | llm | output_parser
result = chain.invoke({"question": "..."})
```

Every component implements `Runnable` with `.invoke()`, `.batch()`, `.stream()`, and `.ainvoke()`. The interface is consistent whether you're calling a local model, a remote API, or a retrieval step.

## Core Mechanisms

**LCEL and the Runnable protocol** (`langchain_core/runnables/`): The `RunnableSequence` class chains `Runnable` objects and handles streaming, batching, and async propagation automatically. `RunnableParallel` runs branches concurrently. `RunnablePassthrough` and `RunnableLambda` handle routing and custom logic. The design means a chain compiles into a DAG where each node knows how to stream its output to the next.

**Chains** (`langchain/chains/`): Higher-level assemblies like `RetrievalQA`, `ConversationalRetrievalChain`, and `LLMChain` existed before LCEL and wrap common patterns. They're largely considered legacy; the documentation now steers users toward LCEL equivalents.

**Agents** (`langchain/agents/`): The agent loop — observe, think, act — uses the [ReAct](../concepts/react.md) pattern by default. `AgentExecutor` wraps a `BaseSingleActionAgent` or `BaseMultiActionAgent` with a tool registry and iteration limit. Function-calling agents use OpenAI/Anthropic tool schemas directly; the `create_tool_calling_agent` helper handles format translation per provider.

**Memory** (`langchain/memory/`): `ConversationBufferMemory`, `ConversationSummaryMemory`, `ConversationBufferWindowMemory`, and vector-backed `VectorStoreRetrieverMemory` all implement `BaseChatMemory`. Memory objects read from and write to the chain's input/output variables. This is the oldest and most inconsistent part of the codebase — the new recommended pattern uses LangGraph's `MemorySaver` instead.

**Retrievers and RAG** (`langchain/retrievers/`): Any object returning a list of `Document` objects implements `BaseRetriever`. [LlamaIndex](../projects/llamaindex.md), [ChromaDB](../projects/chromadb.md), and other vector stores expose LangChain-compatible retriever interfaces. Ensemble retrievers combine [BM25](../concepts/bm25.md) and dense retrieval for [hybrid search](../concepts/hybrid-search.md). `ContextualCompressionRetriever` wraps another retriever with a document compressor — LLMLingua integrates here to compress retrieved passages before they reach the LLM context window.

**Integrations**: LangChain's real advantage is integration count. It ships connectors for roughly 70 LLM providers, 50+ vector stores, 20+ document loaders, and dozens of tools (web search, code execution, databases). Partner packages (`langchain-openai`, `langchain-anthropic`, `langchain-google-vertexai`) are maintained separately and tend to track provider APIs more reliably than the community package.

**LangSmith** is the observability layer — traces, evaluations, datasets. Separate product, separate pricing, but tightly coupled to LangChain's instrumentation. Callbacks throughout the codebase automatically emit traces when `LANGCHAIN_TRACING_V2=true`.

## Key Numbers

- GitHub stars: ~100k (as of mid-2025, self-reported in project metadata)
- PyPI downloads: consistently among the top Python ML packages
- Integration count: 600+ across all categories (self-reported in docs)

These numbers reflect adoption breadth, not benchmark performance. LangChain doesn't publish independent task benchmarks for its agent or retrieval components. LangSmith evaluation tooling exists for users to run their own evals.

## Strengths

**Prototyping speed**: For common patterns — RAG, conversational agents, document Q&A — LangChain gets you to a working prototype faster than building from primitives. The integration library means you rarely write a vector store or LLM client from scratch.

**Integration coverage**: If a tool, model, or data source exists, LangChain probably has a connector. This matters during early experimentation when the stack is undefined.

**Ecosystem gravity**: LangSmith, LangGraph, LangServe, and third-party tools (like Mem0's LangChain integration, LLMLingua's retriever compression, Skill Seekers' LangChain document export) all target LangChain as a primary integration point. Choosing LangChain means a larger surface of compatible tooling.

**LCEL streaming**: The Runnable protocol handles streaming end-to-end with minimal configuration. This is genuinely useful for production chat applications.

## Critical Limitations

**Concrete failure mode — abstraction leakage under provider differences**: LangChain's unified interface promises that swapping `ChatOpenAI` for `ChatAnthropic` just works. In practice, tool-calling schemas, streaming formats, message role handling, and system prompt placement differ enough between providers that chains written for one model often break on another. The `langchain-anthropic` and `langchain-openai` packages handle many differences, but edge cases surface in production when you change providers — system messages in wrong positions, tool schemas rejected, streaming deltas with different structures.

**Unspoken infrastructure assumption**: LangChain assumes stateless, single-request execution as the default. Multi-step stateful agents, long-running workflows, and persistent memory across sessions require either LangGraph (additional complexity) or significant custom wiring. Applications that start with `AgentExecutor` and need durability, retry logic, or human-in-the-loop approval end up rebuilding orchestration that LangGraph would have provided from the start.

## When NOT to Use It

**Don't use LangChain when:**

- You need production-grade stateful agents with persistence, checkpointing, and branching workflows — start with [LangGraph](../projects/langgraph.md) directly, or use [AutoGen](../projects/autogen.md) / [CrewAI](../projects/crewai.md) for multi-agent coordination.
- Your team needs to deeply understand every prompt and inference call — LangChain's abstractions obscure what's sent to the model, making debugging slow. [DSPy](../projects/dspy.md) or direct API calls give clearer visibility.
- You're building a simple single-prompt application. The overhead of installing a 50MB framework for one `openai.chat.completions.create()` call is unjustifiable.
- Token efficiency matters at scale. LangChain's memory classes inject full conversation history by default. Without active context management, costs compound quickly. You'd need to layer in explicit [context compression](../concepts/context-compression.md) or replace the memory layer.
- You want optimized prompts. LangChain fixes prompts at write time. [DSPy](../projects/dspy.md) treats prompt optimization as a first-class concern.

## Unresolved Questions

**Context management at scale**: LangChain provides the mechanism (`ConversationSummaryMemory`, compression retrievers) but no default policy. Teams deploying to production without explicit token budgets discover this expensively. The docs don't surface token cost projections or scaling behavior.

**LangGraph migration path**: The official recommendation has shifted toward LangGraph for agents, but the migration path from existing `AgentExecutor`-based code is underspecified. Teams with production LangChain agents face refactoring risk with unclear benefit timelines.

**Community package reliability**: `langchain-community` contains hundreds of integrations maintained at inconsistent quality levels. Breaking changes in upstream SDKs often break community connectors for weeks before patches land. There's no stated SLA or quality tier for community integrations.

**Governance and long-term API stability**: LangChain Inc. controls the roadmap. The deprecation cycle for older chain patterns (pre-LCEL) created migration work for early adopters. There's no published stability guarantee distinguishing stable APIs from experimental ones.

## Alternatives

| Alternative | When to choose it |
|---|---|
| [LangGraph](../projects/langgraph.md) | Stateful agents, multi-step workflows, human-in-the-loop, any case requiring persistence or branching |
| [DSPy](../projects/dspy.md) | When prompt quality matters more than integration breadth; systematic optimization over manual prompt writing |
| [LlamaIndex](../projects/llamaindex.md) | When RAG and knowledge retrieval is the primary use case; deeper retrieval primitives than LangChain's retriever layer |
| [AutoGen](../projects/autogen.md) / [CrewAI](../projects/crewai.md) | Multi-agent systems where agents collaborate on tasks |
| Direct API clients | Simple applications, maximum transparency, avoiding framework overhead |
| [OpenAI Agents SDK](../projects/openai-agents-sdk.md) | OpenAI-only stacks wanting structured agent primitives without framework complexity |

LangChain remains a reasonable default for teams starting RAG or chatbot projects who need broad integration coverage and are willing to manage abstraction tradeoffs. For anything requiring production reliability, auditability, or complex orchestration, migrate to or start with [LangGraph](../projects/langgraph.md).

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- [ReAct](../concepts/react.md)
- [Vector Database](../concepts/vector-database.md)
- [Context Compression](../concepts/context-compression.md)
- [Model Context Protocol](../concepts/model-context-protocol.md)

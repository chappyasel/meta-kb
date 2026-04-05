---
entity_id: langchain
type: project
bucket: agent-systems
sources:
  - repos/memorilabs-memori.md
  - repos/supermemoryai-supermemory.md
  - repos/microsoft-llmlingua.md
  - repos/wangziqi06-724-office.md
  - repos/caviraoss-openmemory.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/laurian-context-compression-experiments-2508.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/vectifyai-pageindex.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/repos/infiniflow-ragflow.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - OpenAI
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:21:58.376Z'
---
# LangChain

**Type:** Framework | **Bucket:** Agent Systems | **License:** MIT

---

## What It Does

LangChain provides Python and JavaScript abstractions for composing LLM-powered applications. The core bet: most LLM apps share common plumbing (prompt templates, memory stores, tool dispatch, retrieval pipelines), so abstracting that plumbing lets developers wire together chains of operations without writing boilerplate.

The framework covers four areas:
- **Chains** — sequences of LLM calls and transformations
- **Agents** — LLMs that select and invoke tools dynamically
- **Memory** — short and long-term state across conversation turns
- **Retrievers** — connectors for vector stores, document loaders, and RAG pipelines

LangChain Expression Language (LCEL) is the current composability layer, replacing the older chain classes with a pipe-based syntax (`retriever | prompt | llm | parser`) that supports streaming and async natively.

---

## Core Mechanism

**LCEL and Runnable protocol** (`langchain_core/runnables/`): Every component implements the `Runnable` interface, which exposes `invoke`, `batch`, `stream`, and `astream`. Composing runnables with `|` builds a `RunnableSequence`. This gives uniform tracing, retries, and fallback logic across components.

**Agent executor** (`langchain/agents/agent.py`): The `AgentExecutor` runs a loop — call the LLM, parse its output for tool calls, invoke the tool, append the result to the scratchpad, repeat until a final answer is emitted or step limit hit. Tool selection is delegated to the LLM via function calling or ReAct-style text parsing depending on agent type.

**Document loaders and splitters** (`langchain_community/document_loaders/`, `langchain_text_splitters/`): Loaders standardize heterogeneous sources (PDFs, web pages, SQL tables) into `Document` objects. Splitters like `RecursiveCharacterTextSplitter` chunk them before embedding. The chunking strategy is where most RAG quality problems originate and LangChain provides no automatic guidance on which strategy fits which content type.

**Memory abstractions** (`langchain/memory/`): `ConversationBufferMemory` keeps raw history; `ConversationSummaryMemory` summarizes past turns via a secondary LLM call; `VectorStoreRetrieverMemory` retrieves semantically similar past exchanges. These are separate from the newer LangGraph state management, which creates a versioning headache when migrating.

**Integrations live in `langchain_community`**: Over 700 integrations for model providers, vector stores, tools, and document sources. The breadth is LangChain's primary distribution advantage; most new providers publish a `langchain_community` integration before building their own SDK.

---

## Key Numbers

- **GitHub stars:** ~100k (self-reported, reflects adoption rather than quality)
- **PyPI installs:** Among the highest for any LLM package; exact figures vary by week
- **Integration count:** 700+ listed in `langchain_community`
- **LangSmith traces:** Harrison Chase has cited "billions of traces" processed — self-reported, not independently verified

Benchmark comparisons against competing frameworks are mostly self-reported by LangChain or third parties with selection bias. No rigorous independent benchmarks compare agent success rates across frameworks at the time of writing.

---

## Strengths

**Ecosystem breadth.** No other framework matches the number of pre-built integrations. If you need to connect to an obscure vector store, document source, or model provider, there is almost certainly a community integration.

**RAG tooling.** The retriever abstraction, combined with text splitters and vector store connectors, makes standing up a basic RAG pipeline fast. Tools like LLMLingua ([microsoft/LLMLingua](../../raw/repos/microsoft-llmlingua.md)) integrate directly via the `langchain_community` retrievers, enabling prompt compression within an existing chain.

**Observability via LangSmith.** The tracing integration is genuinely useful for debugging multi-step chains. Span-level visibility into token counts, latency, and intermediate outputs is hard to replicate without it.

**Community momentum.** Stack Overflow answers, tutorials, and GitHub issues exist for almost every failure mode. The debugging surface is wide even if the documentation quality is uneven.

---

## Critical Limitations

**Concrete failure mode — abstraction leakage in agent loops.** The `AgentExecutor` hides the scratchpad contents from the developer by default. When a tool returns malformed output or an LLM produces a parsing error mid-loop, the executor's error handling (controlled by `handle_parsing_errors`) either swallows the error silently or surfaces a generic message. Diagnosing why an agent looped 10 times and hit `max_iterations` requires enabling verbose logging and manually reconstructing the trace — the abstraction actively obscures what went wrong. Projects like ACE ([kayba-ai/agentic-context-engine](../../raw/repos/kayba-ai-agentic-context-engine.md)) expose this gap by treating LangChain as a substrate that needs external learning loops rather than relying on its built-in recovery.

**Unspoken infrastructure assumption.** LangChain assumes you operate synchronously or manage your own async event loop. In high-throughput production environments processing many concurrent requests, the `langchain_community` integrations vary wildly in their async support. Some loaders and vector store connectors are sync-only, forcing thread pool workarounds. The documentation does not flag which integrations are async-safe.

---

## When NOT to Use It

**Skip LangChain when:**

- You need predictable latency. The abstraction layers add overhead, and LCEL's streaming partially compensates but does not eliminate it. For latency-sensitive inference pipelines, call the model provider SDK directly.
- You're building a simple single-call application. If your app is `user_input → prompt → LLM → output`, the framework adds complexity with no benefit.
- You need tight control over agent state. LangGraph (LangChain's graph-based agent framework) is a separate library. The `AgentExecutor` is poorly suited to complex branching workflows; using it for that case produces unmaintainable code.
- Your team is small and dependency footprint matters. `langchain` pulls in a large dependency tree. `langchain_community` pulls in far more. Cold start times and container sizes increase accordingly.

---

## Unresolved Questions

**Governance and stability.** LangChain has broken APIs across minor versions repeatedly. The migration from "legacy chains" (`LLMChain`, `RetrievalQA`) to LCEL is still incomplete in the documentation, and both patterns appear in tutorials simultaneously. There is no public roadmap with compatibility guarantees.

**Cost at scale.** `ConversationSummaryMemory` and similar components issue secondary LLM calls silently. In a production app with many concurrent users, these calls multiply token costs in ways that are non-obvious from reading application code. No built-in cost accounting surfaces this.

**LangChain vs. LangGraph split.** The relationship between the two libraries is underspecified. The official guidance is to "use LangGraph for agents," but `AgentExecutor` remains in the codebase and receives maintenance. It is unclear whether `AgentExecutor` will be deprecated, on what timeline, and what the migration path looks like for existing production agents.

**Conflict resolution in community integrations.** With 700+ integrations maintained by a mix of LangChain employees and external contributors, there is no clear SLA for bug fixes in `langchain_community`. Integration quality varies by an order of magnitude.

---

## Alternatives

| When | Use instead |
|---|---|
| You want a minimal, explicit RAG pipeline | [LlamaIndex](../projects/llamaindex.md) — more opinionated about document indexing, less abstraction debt |
| You need durable multi-agent workflows with state | LangGraph (separate library, same org) or [CrewAI](../projects/crewai.md) |
| You want agents that improve from experience | [ACE Framework](../../raw/repos/kayba-ai-agentic-context-engine.md) wraps LangChain chains with a persistent Skillbook learning loop |
| You need persistent memory across sessions | [Memori](../../raw/repos/memorilabs-memori.md) has a LangChain integration and handles memory extraction separately from the chain logic |
| You want zero-abstraction control | Call the model provider SDK (OpenAI, Anthropic) directly with structured outputs |
| You need production-grade prompt compression for RAG | [LLMLingua](../../raw/repos/microsoft-llmlingua.md) integrates via `langchain_community` retrievers |

LangChain remains the default starting point for prototype RAG and agent work, primarily because the documentation surface area and community support are unmatched. The switching cost to something simpler is low early; it compounds as application complexity grows.


## Related

- [OpenAI](../projects/openai.md) — part_of (0.3)
- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.5)

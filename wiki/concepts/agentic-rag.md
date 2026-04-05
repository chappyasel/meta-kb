---
entity_id: agentic-rag
type: concept
bucket: knowledge-bases
sources:
  - repos/vectifyai-pageindex.md
  - repos/volcengine-openviking.md
  - repos/laurian-context-compression-experiments-2508.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
related:
  - Retrieval-Augmented Generation
  - Retrieval-Augmented Generation
  - Multi-Agent Systems
last_compiled: '2026-04-04T21:16:58.328Z'
---
# Agentic RAG

## What It Is

Agentic RAG is an evolution of Retrieval-Augmented Generation where an LLM agent—rather than a static pipeline—autonomously decides *when* to retrieve, *what* to query, *how many times* to iterate, and *how* to synthesize results. Instead of a fixed retrieve-then-generate pattern, the agent treats retrieval as a tool it can invoke conditionally, repeatedly, and in combination with other tools.

The core shift: retrieval becomes an **action** the agent takes, not a preprocessing step baked into the pipeline.

## Why It Matters

Standard RAG has a fundamental rigidity problem. A single retrieval step with a fixed query fails on:

- **Multi-hop questions** that require chaining evidence across documents
- **Ambiguous queries** that benefit from clarification before retrieval
- **Complex research tasks** where the right query only becomes clear after reading initial results
- **Dynamic corpora** where relevance depends on previously retrieved context

Agentic RAG addresses these by letting the agent reason about retrieval strategy rather than executing a predetermined plan. A production example: an "Open Deep Research"-style system over an internal knowledge base where each retrieved document undergoes LLM-based context compression to extract query-relevant content—a loop that static pipelines can't replicate. [Source](../../raw/repos/laurian-context-compression-experiments-2508.md)

## How It Works

### Core Loop

```
User Query
    ↓
Agent reasons: "Do I need to retrieve? What query?"
    ↓
Tool call → Retrieval system
    ↓
Agent reads results → "Is this sufficient? Do I need more?"
    ↓
[Loop or synthesize]
    ↓
Final response
```

### Key Capabilities Beyond Basic RAG

**Iterative retrieval**: The agent re-queries based on what it found, enabling multi-hop reasoning. First query establishes context; subsequent queries become more precise.

**Query rewriting**: Instead of using the raw user query, the agent generates better search queries based on what it knows it needs.

**Selective retrieval**: The agent decides whether retrieval is needed at all—for factual questions in its training data, it may skip retrieval entirely.

**Context compression**: Retrieved documents are often too long or noisy. Agentic RAG systems frequently include a compression step where an LLM extracts only query-relevant content. This is computationally expensive—cheaper models fail often enough that prompt optimization (via frameworks like DSPy or TextGrad) may be required to maintain quality without upgrading model tiers. [Source](../../raw/repos/laurian-context-compression-experiments-2508.md)

**Parallel retrieval**: Agent can fan out multiple queries simultaneously and synthesize results.

### Retrieval Approaches in Agentic Contexts

Two philosophically different approaches exist:

1. **Vector-based**: Embed query and documents, retrieve by similarity. Fast, scalable, but approximate—embedding spaces are opaque and chunking is lossy.

2. **Reasoning-based**: Use LLM reasoning over structured document indexes (e.g., tree hierarchies) to identify relevant content. Slower and more expensive, but achieves semantic relevance rather than vector similarity. PageIndex (23,899 stars) represents this direction, explicitly positioning itself as "vectorless RAG." [Source](../../raw/repos/vectifyai-pageindex.md)

Agentic systems can combine both, or switch strategies depending on query type.

### Memory and Context Management

A persistent challenge in agentic RAG is **context fragmentation**: agents accumulate retrieved chunks across multiple retrieval steps, and naive concatenation wastes tokens or exceeds context limits. Solutions include:

- Hierarchical context loading (e.g., L0/L1/L2 levels loaded on demand)
- Automatic session compression to summarize past retrievals
- Unified memory stores that treat retrieved documents, agent memories, and skills under one paradigm

OpenViking (20,813 stars) addresses this explicitly with a filesystem-based context database designed for agents, with session compression to avoid the token waste that plagues naive agentic RAG implementations. [Source](../../raw/repos/volcengine-openviking.md)

## Who Implements It

- **LangChain / LangGraph**: ReAct-style agents with retrieval tools; LangGraph enables explicit control flow for retrieval loops
- **LlamaIndex**: Agentic query engines, sub-question decomposition
- **OpenViking**: Context database layer for managing retrieval state across agent sessions
- **PageIndex**: Reasoning-based retrieval backend for agentic queries
- **Custom systems**: Most production agentic RAG is bespoke, built on framework primitives

## Practical Implications

**Latency compounds**: Each retrieval loop adds latency. A system that does 3-5 retrieval iterations is 3-5x slower at the retrieval layer alone, before accounting for compression and reasoning steps.

**Cost scales with reasoning**: LLM calls for query rewriting, compression, and synthesis add up. Context compression alone can be a significant cost center if done per-document.

**Prompt engineering becomes critical**: Each agent decision point (when to retrieve, how to compress, when to stop) depends on prompt quality. Failures compound across loops—a bad initial query can send the whole chain in the wrong direction.

**Observability is harder**: Static pipelines are easy to trace. Agentic loops require explicit logging of each tool call, query, and retrieved chunk to debug failures.

**Diminishing returns on iterations**: There's typically a point of diminishing returns on additional retrieval rounds. Most tasks are solved in 1-3 iterations; unbounded loops introduce both cost and hallucination risk.

## Strengths

- Handles genuinely complex, multi-step research tasks
- Graceful degradation on ambiguous queries (can clarify before committing)
- Retrieval quality improves with iteration
- Can integrate non-retrieval tools (calculators, APIs) in the same loop

## Limitations

- Significantly higher latency and cost than static RAG
- Harder to test, debug, and guarantee behavior
- Agent can get stuck in retrieval loops or query the wrong way repeatedly
- Context window pressure increases with each iteration
- Overkill for simple factual lookup tasks

## Alternatives

| Approach | When to Use |
|---|---|
| Static RAG | Known query patterns, latency-sensitive, simple lookups |
| Hypothetical Document Embeddings (HyDE) | Better queries without full agent loop |
| Query decomposition | Multi-hop without full agent autonomy |
| Fine-tuned retrieval | When the domain is narrow and stable |

## Related

- Retrieval-Augmented Generation
- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- PageIndex
- OpenViking

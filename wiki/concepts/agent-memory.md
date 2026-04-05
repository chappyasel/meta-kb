---
entity_id: agent-memory
type: concept
bucket: agent-memory
sources:
  - repos/getzep-graphiti.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/memorilabs-memori.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/bytedtsinghua-sia-memagent.md
  - repos/zorazrw-agent-workflow-memory.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/mem0ai-mem0.md
related:
  - Model Context Protocol
  - Long-Term Memory
  - Knowledge Graphs
  - State Management
  - Obsidian
  - Context Engineering
  - Mem0
  - MemAgent
  - MemoryBank
  - Supermemory
  - Graphiti
  - Zep
  - Memento
  - SimpleMem
  - GAM
  - Agent Workflow Memory
  - LoCoMo
  - LongMemEval
  - MemEvolve
  - Yu Wang
  - World Model
  - Conversation Continuity
  - User Profiling
  - Temporal Reasoning
  - Multimodal Memory
  - Core Memory
  - Procedural Memory
  - State Management
  - Execution Traces
last_compiled: '2026-04-04T21:16:02.416Z'
---
# Agent Memory

## What It Is

Agent memory refers to the mechanisms by which AI agents store, retrieve, and update information beyond their immediate context window. Where a standard LLM inference is stateless—each call is independent—an agent with memory can accumulate knowledge, adapt to users over time, and maintain coherent behavior across sessions.

The need arises from a fundamental limitation: context windows, even large ones, are finite, expensive, and impermanent. Memory systems address this by externalizing information into queryable stores that agents can selectively access when relevant.

## Why It Matters

Without memory, every agent interaction starts from scratch. With it, agents can:

- Remember user preferences, constraints, and history without re-explanation
- Learn from past successes and failures (procedural improvement)
- Maintain long-running task state across interruptions
- Build cumulative knowledge bases that improve over time

The practical impact is measurable. [Mem0](../projects/mem0.md)'s benchmarks show a **26% accuracy improvement** and **90% token reduction** versus naive full-context approaches—demonstrating that selective memory retrieval outperforms simply stuffing everything into context.

## Memory Taxonomy

There is no universal standard, but most frameworks converge on four functional types:

### Episodic Memory
Records of specific past events: conversations, tool calls, outcomes. Answers "what happened?" Typically stored as timestamped logs or vector embeddings, retrieved by semantic similarity or recency. Example: recalling that a user prefers JSON output because they said so in session 3.

### Semantic Memory
General facts and knowledge about the world or the user—independent of specific episodes. Answers "what is true?" Can be structured (knowledge graphs, entity stores) or unstructured (vector databases). Example: knowing a user is a senior engineer at a fintech company.

### Procedural Memory
Learned strategies, skills, or heuristics for how to accomplish tasks. Answers "how should I act?" This is the least commonly implemented but arguably most valuable for agent improvement. The Agentic Context Engine's "Skillbook" is an explicit example: corrections and successes are stored as retrievable strategies, turning one-off fixes into reusable patterns. [Source](../../raw/repos/kayba-ai-agentic-context-engine.md)

### Core Memory (Working Memory)
The always-present, in-context information that shapes every response: system prompt facts, current task state, user identity. Unlike retrieval-based memory, this is never absent—but space is limited, so what occupies it is a design decision.

## How It Works

A typical memory pipeline involves:

1. **Ingestion**: During or after an interaction, extract memorable facts (often via LLM-based extraction)
2. **Storage**: Persist to a backing store—vector DB, graph DB, relational DB, or hybrid
3. **Retrieval**: At inference time, query the store for relevant context given the current input
4. **Injection**: Insert retrieved memories into the prompt (typically system message or tool results)
5. **Update/Consolidation**: Reconcile new information with existing memories, handle contradictions, decay stale facts

The devil is in steps 3–5. Naive retrieval (top-k semantic search) struggles with temporal reasoning, contradictions, and entity disambiguation. More sophisticated approaches use knowledge graphs with explicit temporal validity windows—[Graphiti](../projects/graphiti.md)'s core contribution is tracking *when* facts were true and *why* they changed, rather than returning static snapshots. [Source](../../raw/repos/getzep-graphiti.md)

## Memory Storage Architectures

| Architecture | Strengths | Weaknesses |
|---|---|---|
| Vector store | Fast similarity search, flexible schema | No explicit relationships, poor temporal reasoning |
| Knowledge graph | Explicit entity relations, temporal tracking | Complex to maintain, LLM extraction errors propagate |
| Relational DB | Structured queries, strong consistency | Rigid schema, poor semantic search |
| Hybrid | Best of above | Engineering complexity |

## Who Implements It

The implementation landscape is fragmented:

- **[Mem0](../projects/mem0.md)** (51k stars): Multi-level memory (user/session/agent) abstracted from LLM choice; production-oriented
- **[Graphiti](../projects/graphiti.md)** (24k stars): Temporal knowledge graphs with episode provenance; strong on fact evolution
- **[Zep](../projects/zep.md)**: Commercial memory layer with graph and vector hybrid backing
- **[MemoryBank](../projects/memorybank.md)**, **[MemAgent](../projects/memagent.md)**, **[GAM](../projects/gam.md)**: Research-oriented implementations
- **[Supermemory](../projects/supermemory.md)**: User-facing personal memory layer
- **[Agent Workflow Memory](../projects/agent-workflow-memory.md)**: Procedural memory specifically for workflow patterns

Evaluation is addressed by **[LongMemEval](../projects/longmemeval.md)** and **[LoCoMo](../projects/locomo.md)**, which benchmark memory fidelity over long conversations.

## Practical Implications

**For builders:**
- Start with episodic memory (conversation logs + retrieval) before investing in semantic extraction—it's simpler and often sufficient
- LLM-based extraction introduces errors; build conflict resolution from the start
- Memory retrieval latency adds to response time; cache aggressively
- Privacy and data governance are harder when memories persist across sessions

**For evaluators:**
- Test temporal consistency (does the agent correctly update stale beliefs?)
- Test contradiction handling (what happens when new facts conflict with old ones?)
- Measure retrieval precision, not just recall—irrelevant memories injected into context degrade performance

## Limitations and Open Problems

- **Extraction quality**: LLM-extracted facts contain errors that compound over time
- **Forgetting**: Current systems rarely implement principled forgetting; storage grows indefinitely
- **Evaluation**: No consensus benchmark; [LongMemEval](../projects/longmemeval.md) and [LoCoMo](../projects/locomo.md) cover different slices
- **Multimodal memory**: Storing and retrieving non-text memories (images, audio) remains immature
- **Ground truth**: It's difficult to verify what an agent "should" remember versus safely discard
- **Privacy**: Persistent user memory creates GDPR/data retention obligations that most OSS projects ignore

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — The broader practice of what goes into context; memory is one component
- [Long-Term Memory](../concepts/long-term-memory.md) — The specific challenge of persistence beyond context windows
- [Knowledge Graphs](../concepts/knowledge-graphs.md) — One structural approach to semantic memory
- State Management — Overlapping concern for task/workflow state
- [Temporal Reasoning](../concepts/temporal-reasoning.md) — Required for correctly handling time-indexed facts
- [User Profiling](../concepts/user-profiling.md) — A primary application of persistent semantic memory

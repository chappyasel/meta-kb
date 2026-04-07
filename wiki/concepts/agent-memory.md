---
entity_id: agent-memory
type: concept
bucket: agent-memory
abstract: >-
  Agent memory encompasses the mechanisms AI agents use to store and retrieve
  information across interactions — distinguished from static RAG by supporting
  multiple memory types (episodic, semantic, procedural, core) and cross-session
  persistence.
sources:
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/osu-nlp-group-hipporag.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/thedotmack-claude-mem.md
  - repos/mem0ai-mem0.md
  - repos/letta-ai-lettabot.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - context-engineering
  - letta
  - claude-code
  - episodic-memory
  - semantic-memory
  - crewai
  - chain-of-thought
  - task-decomposition
  - knowledge-base
  - andrej-karpathy
  - knowledge-graph
  - mem0
  - reflexion
  - graphrag
  - react
  - langchain
last_compiled: '2026-04-07T11:46:48.802Z'
---
# Agent Memory

## What It Is

Agent memory refers to the set of mechanisms by which an AI agent stores, retrieves, and applies information across interactions. A single-turn LLM call has no memory — each request starts from scratch. Agent memory changes this by maintaining state that outlasts any individual context window.

The term covers a spectrum: from a simple system prompt that prepends user preferences, to a full memory layer like [Letta](../projects/letta.md) or [Mem0](../projects/mem0.md) that manages extraction, storage, retrieval, and injection of information across sessions, users, and agents.

Memory is architecturally distinct from [Retrieval-Augmented Generation](../concepts/rag.md). RAG retrieves from a static external corpus. Memory retrieves from a dynamic, agent-maintained store that grows through interaction. The two often compose — retrieved memories are injected into context alongside retrieved documents — but they solve different problems.

## Why It Matters

Context windows are finite. Even with 200K-token models, production agents face three hard limits:

1. **Cross-session continuity.** Context resets between conversations. An agent cannot remember a user's name, preferences, or prior decisions without explicit storage.
2. **Long-horizon task tracking.** Multi-step tasks spanning hours or days cannot fit their full history into one context. Memory externalizes what can't fit.
3. **Cost and latency.** Stuffing entire conversation histories into each request is expensive and slow. Selective retrieval of relevant memories cuts both. [Mem0](../projects/mem0.md)'s benchmarks report 90% token reduction and 91% latency improvement versus full-context baseline on the LOCOMO benchmark — though these are self-reported figures, not independently validated.

## Memory Taxonomy

Agent memory systems typically decompose along four axes drawn from cognitive science:

### Episodic Memory
Records of specific events, interactions, and experiences with temporal context. An agent with [episodic memory](../concepts/episodic-memory.md) can answer "what did we decide last Tuesday?" by retrieving a specific past conversation segment. Systems like [Zep](../projects/zep.md) and [Mem0](../projects/mem0.md) emphasize episodic storage — Zep's temporal knowledge graph explicitly tracks when facts were true, enabling queries like "what did the user prefer before they changed their mind?"

### Semantic Memory
Factual knowledge distilled from experience — not "we discussed this on Tuesday" but "the user prefers dark mode." [Semantic memory](../concepts/semantic-memory.md) stores generalizations extracted from episodes. Mem0's memory extraction step uses an LLM to pull semantic facts from conversations before storing them; Zep's Graphiti engine performs entity extraction and deduplication as part of ingestion.

### Procedural Memory
How to do things: learned workflows, tool-use patterns, skill sequences. [Procedural memory](../concepts/procedural-memory.md) powers agents that improve at tasks over time. [Voyager](../projects/voyager.md) implements this explicitly — its skill library stores verified code functions, allowing the agent to reuse successful strategies rather than rederiving them. [Agent Workflow Memory](../projects/agent-workflow-memory.md) extracts and reuses procedural patterns from successful task completions.

### Core Memory
A small, always-present store of critical facts kept in the active context at all times. [Letta](../projects/letta.md) (formerly MemGPT) popularized this abstraction — its core memory holds a "persona" block and "human" block that never leave the context window, ensuring the agent always knows who it is and who it's talking to. [Core memory](../concepts/core-memory.md) solves the "amnesia at session start" problem without retrieval latency.

## How It Works: Core Mechanisms

### Memory Extraction

Most systems extract memories through an LLM call at the end of each conversation turn or session. The model reads the conversation and identifies facts worth storing. Mem0's extraction prompt instructs the model to output structured memory objects — a list of atomic facts — which are then deduplicated against existing memories before storage.

The quality of extraction determines memory quality. Systems that extract too aggressively store noise; systems that extract too conservatively miss important context. No system has solved this tradeoff definitively.

### Storage Backends

Memory systems use three storage types, often in combination:

- **Vector stores** ([ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [Pinecone](../projects/pinecone.md), [FAISS](../projects/faiss.md)): support semantic similarity search over embeddings. Fast and scalable but lose temporal and relational structure.
- **Knowledge graphs** ([Neo4j](../projects/neo4j.md), [Graphiti](../projects/graphiti.md)): store entities and relationships with traversal. Zep's Graphiti engine adds temporal edges — each fact has a `valid_at` / `invalid_at` timestamp — enabling queries over how relationships changed over time.
- **Relational/key-value stores** ([PostgreSQL](../projects/postgresql.md), [SQLite](../projects/sqlite.md)): store structured facts and metadata. Often used as the primary store with vector indexes alongside.

[Zep](../projects/zep.md)'s architecture uses all three: Graphiti manages the temporal knowledge graph, a vector store handles semantic search over memory embeddings, and structured storage holds session metadata. The paper reports 94.8% accuracy on the Deep Memory Retrieval (DMR) benchmark versus MemGPT's 93.4%, and 18.5% accuracy improvement on LongMemEval with 90% latency reduction — figures from the Zep team's own paper, so treat as directional rather than definitive.

### Retrieval

When an agent needs memory, it queries the store using the current conversation turn as a query. Retrieval strategies include:

- **Semantic search**: embed the query, return nearest neighbors. Fast but misses temporally relevant memories that aren't semantically similar.
- **[Hybrid search](../concepts/hybrid-search.md)**: combine semantic search with BM25 keyword matching via [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md). More robust for proper nouns and exact phrases.
- **Graph traversal**: follow entity relationships from query entities. Required for multi-hop reasoning ("who did Alice work with, and what did they say about the project?").

### Injection

Retrieved memories must enter the context. Three injection patterns:

1. **Prepend to system prompt**: reliable but consumes context budget for every turn regardless of relevance.
2. **Dynamic injection before user message**: retrieved memories inserted just before the current query. Reduces noise but adds latency.
3. **Tool-based retrieval**: the agent calls a `search_memory` tool mid-generation when it determines retrieval is needed. Most flexible but requires the model to know when it needs memory.

Letta uses a tiered model: core memory is always present in the system prompt, and archival memory requires explicit tool calls (`archival_memory_search`, `archival_memory_insert`). This gives the agent agency over its own memory operations.

## Implementation Patterns

### The Karpathy Approach: Markdown Wikis

[Andrej Karpathy](../concepts/andrej-karpathy.md) documented a lightweight memory pattern: an LLM compiles raw source documents into a structured Markdown wiki, maintains an index file, and performs Q&A by reading relevant articles rather than using vector search. For knowledge bases under ~400K words, the LLM's ability to auto-maintain summaries and indexes makes retrieval unnecessary. The agent also runs "linting" passes to find inconsistencies and impute missing data. This approach trades retrieval sophistication for inspectability — every memory is a human-readable file in [Obsidian](../projects/obsidian.md). [Source](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)

### CLAUDE.md / Context Files

[Claude Code](../projects/claude-code.md) implements a form of procedural memory through [CLAUDE.md](../concepts/claude-md.md) files — markdown documents that persist project-specific instructions, conventions, and learned preferences across sessions. The agent reads these at startup. This pattern is manual (humans or agents write the files) but reliable and inspectable.

### Reflexion-Style Episode Storage

[Reflexion](../concepts/reflexion.md) stores verbal self-evaluations after task failures — the agent writes a short critique of what went wrong, which is prepended to the next attempt. This is episodic memory used specifically for error recovery, not general persistence.

### Voyager Skill Library

[Voyager](../projects/voyager.md) stores verified executable code in a skill library (procedural memory). After each successful task, the agent writes a JavaScript function implementing the solution and adds it to the library. Future tasks retrieve relevant skills via embedding search over skill descriptions, then execute them. This is perhaps the clearest example of procedural memory improving agent capability over time.

## Context Engineering Integration

Memory is one component of the broader [context engineering](../concepts/context-engineering.md) problem. The context assembly function can be written as:

**C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)**

where `c_mem` competes with other components for the finite context budget `L_max`. Memory systems make allocation decisions: what to retrieve, how much to retrieve, how to compress retrieved memories before injection. A memory system that retrieves too much crowds out tool definitions or retrieved documents.

The [survey by Mei et al.](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) frames memory as one of six context components and notes that LLMs are far better at understanding complex contexts than generating equally sophisticated outputs. This asymmetry means memory architects should invest in retrieval quality — storing well-structured, clean memories — rather than assuming the model will compensate for noisy or incomplete memory with better reasoning.

## Strengths

**Cross-session continuity.** Memory genuinely solves the session-reset problem. An agent with a well-implemented memory layer can pick up a conversation where it left off, remember user preferences, and avoid asking the same clarifying questions repeatedly.

**Cost reduction at scale.** Selective memory retrieval consistently outperforms full-context approaches on cost and latency. The 90% token reduction Mem0 reports is plausible in principle, though the exact figure depends heavily on conversation length and memory quality.

**Composability.** Memory systems compose with RAG, tool use, and multi-agent architectures. [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), and [CrewAI](../projects/crewai.md) all support memory layer integrations.

## Critical Limitations

**Extraction quality determines everything.** Memory systems are only as good as what they extract. LLM-based extraction introduces errors — misattributed facts, hallucinated preferences, missed context. Once a bad memory is stored, it can corrupt future responses in ways that are hard to trace. No current system provides reliable extraction quality metrics.

**The infrastructure assumption no one states.** Production memory systems require always-on storage backends, embedding model availability, and extraction LLM calls at every session end. For applications with millions of users, the operational cost of running memory extraction (an LLM call per session) can exceed the cost of the primary LLM calls. Most open-source memory systems document the happy path and omit the operational costs at scale.

**Benchmark inadequacy.** The primary memory benchmarks (DMR, LongMemEval, LOCOMO) test single or few-session recall. They do not test the cross-session synthesis, temporal reasoning, or multi-user isolation that production systems require. Numbers from these benchmarks measure narrow capabilities, not production readiness.

## Failure Modes

**Memory poisoning.** If an adversarial or confused user causes incorrect facts to be extracted and stored, those facts persist and influence future sessions. Memory systems generally lack mechanisms to detect or correct stored errors without explicit human review.

**Temporal staleness.** A memory that was true six months ago may no longer be true. Most vector-store-based systems have no expiry or staleness detection. Only graph-based systems like Zep explicitly model temporal validity.

**Retrieval failure on novel queries.** Semantic search retrieves memories similar to the current query. If the relevant memory was stored with different vocabulary, retrieval fails silently — the agent proceeds without the relevant context, producing wrong answers it states confidently.

**[Catastrophic forgetting](../concepts/catastrophic-forgetting.md) via deduplication.** Aggressive memory consolidation can overwrite accurate older memories with incorrect newer ones. Mem0's deduplication step merges conflicting memories using an LLM, which can resolve contradictions incorrectly.

## When Not to Use It

**Single-session applications.** If users never return, memory storage costs exceed any benefit. RAG over a static knowledge base is sufficient.

**Low-latency requirements.** Memory retrieval adds 100-500ms per turn in typical configurations. For real-time voice agents or interactive tools where response latency is measured in hundreds of milliseconds, memory retrieval may be unacceptable.

**Regulated data environments.** Persistent memory stores create data retention obligations. Healthcare, finance, and legal applications face compliance requirements that may prohibit storing user statements across sessions without explicit consent and deletion mechanisms. Most memory frameworks lack built-in compliance tooling.

**Small agent deployments with simple context.** If the agent's context fits in a single prompt and interactions are short, the complexity of a memory system exceeds its value. Start with [CLAUDE.md](../concepts/claude-md.md)-style context files or explicit conversation history before adding a memory layer.

## Unresolved Questions

**Who controls memory deletion?** Most systems support `delete_memory` calls but do not specify who can invoke them, under what conditions, or what audit trail exists. For multi-user systems, memory isolation between users is also underspecified.

**Cost at scale.** Running an LLM extraction call per session, maintaining embedding indexes, and serving retrieval queries at millions of sessions per day has material infrastructure cost. Published benchmarks measure accuracy, not cost per memory operation at scale.

**Memory conflicts across agents.** In multi-agent systems, two agents may store contradictory memories about the same entity. No standard conflict resolution protocol exists. [CrewAI](../projects/crewai.md) and [LangGraph](../projects/langgraph.md) both support shared memory but leave conflict resolution to the application layer.

**Evaluation validity.** The LOCOMO benchmark Mem0 uses for its +26% accuracy claim was created by a separate research group, but the benchmark itself tests a narrow conversational memory scenario. Whether these numbers generalize to enterprise agent use cases remains unclear.

## Alternatives and Selection Guidance

| Situation | Use instead |
|---|---|
| Static knowledge retrieval from a document corpus | [RAG](../concepts/rag.md) without persistent memory |
| Improving multi-hop reasoning over documents | [GraphRAG](../concepts/graphrag.md) or [HippoRAG](../projects/hipporag.md) |
| Agent self-improvement through verified skills | [Voyager](../projects/voyager.md)-style skill library |
| Project-specific conventions for coding agents | [CLAUDE.md](../concepts/claude-md.md) context files |
| Full memory management with OS-style paging | [Letta](../projects/letta.md) |
| Production memory with temporal reasoning | [Zep](../projects/zep.md) / [Graphiti](../projects/graphiti.md) |
| Lightweight managed memory layer | [Mem0](../projects/mem0.md) |
| Personal knowledge base without RAG infrastructure | Karpathy-style Markdown wiki via [Obsidian](../projects/obsidian.md) |

## Related Concepts

- [Episodic Memory](../concepts/episodic-memory.md) — event-based recall with temporal context
- [Semantic Memory](../concepts/semantic-memory.md) — distilled factual knowledge
- [Procedural Memory](../concepts/procedural-memory.md) — stored skill and workflow patterns
- [Core Memory](../concepts/core-memory.md) — always-present context block
- [Context Engineering](../concepts/context-engineering.md) — the broader discipline of context assembly
- [Retrieval-Augmented Generation](../concepts/rag.md) — static corpus retrieval, complementary to memory
- [Context Window](../concepts/context-window.md) — the hard constraint memory systems work around
- [Memory Evolution](../concepts/memory-evolution.md) — how memory systems improve over time
- [Continual Learning](../concepts/continual-learning.md) — weight-level learning vs. external memory

---
entity_id: agent-memory
type: concept
bucket: agent-memory
abstract: >-
  Agent memory covers how AI agents store and retrieve information across
  interactions, spanning in-context buffers, external vector/graph stores,
  procedural skill storage, and automatic extraction pipelines.
sources:
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/transformeroptimus-superagi.md
  - repos/supermemoryai-supermemory.md
  - repos/agenticnotetaking-arscontexta.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/aiming-lab-agent0.md
  - repos/mem0ai-mem0.md
  - repos/infiniflow-ragflow.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - retrieval-augmented-generation
  - context-engineering
  - openai
  - model-context-protocol
  - context-management
  - multi-agent-systems
  - claude-code
  - knowledge-graph
  - langchain
  - ace
  - vector-database
  - crewai
  - langgraph
  - chain-of-thought
  - andrej-karpathy
  - openclaw
  - cursor
  - anthropic
  - claude
  - react
  - ace
  - vector-database
  - crewai
  - langgraph
last_compiled: '2026-04-08T02:41:45.955Z'
---
# Agent Memory

## What It Is

Agent memory is the set of mechanisms that let an AI agent use information from outside its current context window. Without memory, every agent invocation starts from scratch: the agent has no knowledge of prior interactions, learned preferences, or accumulated skills. With memory, agents can personalize responses across sessions, learn from mistakes, and build on prior work.

The term encompasses four functionally distinct memory types drawn loosely from cognitive science:

- **[Episodic Memory](../concepts/episodic-memory.md):** Records of specific past events ("last Tuesday the user said X")
- **[Semantic Memory](../concepts/semantic-memory.md):** Extracted facts and knowledge ("the user prefers dark mode")
- **[Procedural Memory](../concepts/procedural-memory.md):** Skills, strategies, and patterns for how to do things
- **[Core Memory](../concepts/core-memory.md):** Always-present identity and context, injected directly into every prompt

In practice, systems blend these categories. [Mem0](../projects/mem0.md) primarily extracts semantic facts. [ACE](../projects/ace.md) builds a procedural skill library. [Letta](../projects/letta.md) (formerly MemGPT) gives agents explicit tools to manage all four types. Most production systems use semantic + episodic memory backed by a vector store, with procedural memory as an advanced add-on.

## Why Memory Matters

The context window is the LLM's only working surface. Everything the model knows for a given inference must fit inside it. [Context Engineering](../concepts/context-engineering.md) formalizes this as an optimization problem: assemble the best possible payload C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query) subject to the hard constraint |C| ≤ L_max.

Memory systems answer a specific subproblem: what should c_mem contain, and how do you populate it efficiently across many interactions?

The naive approach — keep appending the full conversation history — hits the context limit quickly and degrades quality before it does. [Lost in the Middle](../concepts/lost-in-the-middle.md) research shows LLMs recall information from the beginning and end of long contexts best, meaning long conversation histories waste tokens while burying the most relevant material in the middle.

Selective memory retrieval outperforms full-context on both accuracy and cost. The [Mem0](../projects/mem0.md) paper reports +26% accuracy over OpenAI Memory on the LOCOMO benchmark, 91% faster responses, and 90% fewer tokens compared to full-context approaches — though these figures are self-reported and should be treated as directional rather than definitive. The underlying mechanism is straightforward: instead of including 50,000 tokens of chat history, inject 200 tokens of relevant extracted facts.

## Memory Architecture Layers

### Storage Backends

**Vector stores** are the standard backend for semantic and episodic memory. Text is embedded into a high-dimensional space; retrieval finds the nearest vectors to a query embedding. [ChromaDB](../projects/chromadb.md), Pinecone, Qdrant, and pgvector are common choices. Vector stores handle "what memories are semantically related to this query?" well but struggle with temporal queries ("what happened last Tuesday?") and relational queries ("how is Alice connected to Bob?"). See [Vector Database](../concepts/vector-database.md).

**Knowledge graphs** add explicit entity and relationship structure. [Graphiti](../projects/graphiti.md) and [Zep](../projects/zep.md) build temporal knowledge graphs where edges carry timestamps and validity periods, enabling queries like "what did the user prefer before they changed jobs?" [GraphRAG](../projects/graphrag.md) and [HippoRAG](../projects/hipporag.md) extend RAG with graph traversal for multi-hop reasoning. See [Knowledge Graph](../concepts/knowledge-graph.md).

**Relational/document stores** handle structured data that doesn't fit well in vector space: user account information, session state, audit trails. Most memory systems use SQLite or a similar store for history tracking alongside their primary vector backend.

**In-context storage** — literally just including information in the system prompt — works for small, always-relevant facts. [CLAUDE.md](../concepts/claude-md.md) files used by [Claude Code](../projects/claude-code.md) and [Cursor](../projects/cursor.md) are a practical instance: project-specific facts that belong in every session get written to a file that's injected at the start of each conversation.

### Retrieval Mechanisms

**Semantic (dense) retrieval** embeds the current query and finds nearest neighbors in the memory store. Fast and general-purpose. Fails on exact keyword matches and structured queries. See [Semantic Search](../concepts/semantic-search.md).

**Keyword (sparse) retrieval** uses BM25 or similar term-frequency methods. Reliable for exact matches. Degrades on paraphrased or conceptually similar but lexically different queries. See [BM25](../concepts/bm25.md).

**Hybrid search** combines both signals, typically by reranking the union of retrieval results. Outperforms either approach alone in most benchmarks. See [Hybrid Search](../concepts/hybrid-search.md).

**Graph traversal** follows entity relationships to answer multi-hop queries. Necessary when the answer requires connecting multiple facts that don't appear together in any single document or memory record.

**Temporal filtering** restricts retrieval by time windows. Critical for memory systems where the most recent information should override older conflicting facts. Most vector stores support this as a metadata filter, but it requires that memories are stamped and indexed by time at write time.

### Write Pipelines

How memories get created is as important as how they're retrieved.

**Automatic extraction** (used by [Mem0](../projects/mem0.md)): An LLM pass over each conversation extracts atomic facts ("user prefers Python over JavaScript"). A second LLM pass reconciles new facts against existing memories, deciding whether to ADD, UPDATE, DELETE, or ignore. Simple to integrate — wrap any conversation in `memory.add()` — but fully dependent on prompt quality. The extraction and reconciliation prompts are the entire "intelligence" of the system.

**Agent-driven management** (used by [Letta](../projects/letta.md) / [MemGPT](../projects/memgpt.md)): The agent itself has explicit tools for memory operations (`core_memory_append`, `archival_memory_search`, etc.) and decides what to remember, what to discard, and when to retrieve. More flexible and potentially higher quality, but requires the agent to reason about memory explicitly, which adds latency and can introduce reasoning errors.

**Reflective extraction** (used by [ACE](../projects/ace.md)): After task execution, a separate Reflector agent analyzes the execution trace to extract procedural strategies. These go into a Skillbook that the agent retrieves at the start of future tasks. The Recursive Reflector in ACE writes Python code in a sandboxed environment to programmatically search traces for patterns — a qualitatively different approach from simple summarization. The key finding from [Meta-Harness](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md): full execution trace access (10M tokens) produces dramatically better strategy extraction than compressed summaries (50.0 vs 34.6 accuracy). Compression destroys the causal signal needed to understand why a strategy failed.

**Continual learning** updates memory incrementally as new information arrives, rather than batch-processing conversations. See [Continual Learning](../concepts/continual-learning.md) and [Continual RAG](../concepts/continual-rag.md).

## How Memory Types Map to Implementations

| Memory Type | Typical Storage | Representative System | Retrieved How |
|---|---|---|---|
| Episodic | Vector store with timestamps | [Zep](../projects/zep.md), [Mem0](../projects/mem0.md) | Semantic similarity + temporal filter |
| Semantic | Vector store (flat facts) | [Mem0](../projects/mem0.md), [OpenMemory](../projects/openmemory.md) | Nearest-neighbor embedding search |
| Semantic (relational) | Knowledge graph | [Graphiti](../projects/graphiti.md), [Zep](../projects/zep.md) | Graph traversal + entity lookup |
| Procedural | [Skill Book](../concepts/skill-book.md) / vector store | [ACE](../projects/ace.md), [Voyager](../projects/voyager.md) | Similarity search on task description |
| Core | System prompt / file | [CLAUDE.md](../concepts/claude-md.md), [Letta](../projects/letta.md) core memory | Direct injection (always present) |

## Memory Scoping

Most systems scope memories by identity dimension:

- **User-level:** Persists across all sessions for a given user. Preferences, biographical facts, relationship context.
- **Session-level:** Persists within one bounded interaction. Multi-step workflow state, current task context.
- **Agent-level:** Persists across all tasks for a given agent. Learned strategies, tool preferences, domain knowledge.
- **Organizational-level:** Shared across multiple users or agents. Company policies, shared domain knowledge.

These are typically implemented as metadata filters on a flat vector collection, not as separate storage systems. The conceptual hierarchy helps architects decide what to store where; the implementation is usually just `user_id`, `session_id`, and `agent_id` fields on memory records.

## Key Design Tradeoffs

**Automatic vs. agent-driven memory management.** Automatic extraction (Mem0 style) is invisible to the application and trivial to integrate. The agent doesn't decide what to remember; the extraction pipeline does. Agent-driven management (Letta style) gives agents more control but requires reasoning about memory during every interaction. For most personalization use cases, automatic extraction is sufficient and far simpler. For complex multi-session reasoning where the agent needs to deliberately build a knowledge base, agent-driven management is more appropriate.

**Vector stores vs. knowledge graphs.** Vector stores handle "what's related to this query?" well. Knowledge graphs handle "how are these entities connected?" and "what was true before X date?" well. For simple preference tracking and conversation history, a vector store suffices. For enterprise knowledge management or temporal reasoning across long time horizons, graphs provide qualitatively better results. The cost: graphs require infrastructure (Neo4j or equivalent) and substantially more LLM calls per write operation.

**Recall vs. precision.** Returning more memories reduces the risk of missing relevant context but increases noise and token cost. Most systems use a fixed retrieval limit (top-k by similarity). Better approaches combine similarity thresholds, reranking, and query-adaptive limits — retrieving fewer memories when the query is specific, more when it's ambiguous.

**Memory growth.** Memory stores grow monotonically without explicit compaction, summarization, or pruning. Old, contradicted memories accumulate. [Memory Evolution](../concepts/memory-evolution.md) and [MemEvolve](../projects/memevolve.md) address this through structured consolidation. Most simpler systems just accumulate indefinitely, relying on recency and relevance weighting to naturally de-prioritize stale memories in retrieval.

**Compression vs. fidelity.** The Meta-Harness ablation is decisive: compressed summaries of execution traces add nearly nothing over raw scores (34.9 vs 34.6 accuracy), while full trace access reaches 50.0. For any system that learns from experience, providing the learning mechanism access to uncompressed execution data is worth the token cost. This applies directly to [Reflexion](../concepts/reflexion.md)-style systems and any reflective memory extraction pipeline. [Context Compression](../concepts/context-compression.md) is appropriate for reducing retrieval cost, not for compressing the signal that drives learning.

## Failure Modes

**Hallucinated memory IDs.** When LLMs generate structured updates (ADD/UPDATE/DELETE), they can hallucinate record identifiers. Mem0 addresses this by mapping UUIDs to sequential integers before the LLM call. Systems that don't do this lose writes silently.

**Silent extraction failures.** JSON parsing failures in extraction pipelines typically produce empty results with no error surfaced to the caller. A conversation is processed, nothing is remembered, and there's no signal that memory creation failed. Production systems need explicit monitoring on extraction success rates.

**Stale memory contamination.** When a user's preferences or facts change, old memories aren't automatically invalidated. A system that learned "user prefers React" before the user switched to Vue will continue retrieving the stale preference unless there's explicit contradiction detection. Knowledge graphs with soft-deletion and validity timestamps handle this better than flat vector stores.

**Retrieval-context mismatch.** The extraction context (what was happening when a memory was created) differs from the retrieval context (the current query). A fact extracted from a technical discussion may not retrieve correctly when the user asks a casual question about the same topic, or vice versa.

**Write concurrency.** Multiple simultaneous `memory.add()` calls for the same user can race: both read existing memories, both decide to ADD the same fact, and duplicates accumulate. Most open-source systems lack write locking at the application level.

**Privacy leakage in organizational memory.** Organizational-level memories are shared across all users of a workspace. Without careful scoping, sensitive information from one user's conversations can surface in another user's context. This is an architectural risk that governance controls alone cannot fully address.

## Evaluation

Memory system quality is harder to measure than standard NLP benchmark accuracy. Key benchmarks:

- **[LongMemEval](../projects/longmemeval.md):** Tests multi-session memory across long time horizons with questions requiring integration across sessions
- **[LoCoMo](../projects/locomo.md):** Long-context conversation benchmark used by Mem0 for their +26% accuracy comparison
- **[Tau-bench](../projects/tau-bench.md):** Multi-step agentic task benchmark used by ACE to demonstrate 2x consistency improvement from learned strategies
- **LongMemEval DMR task:** Zep/Graphiti reports 94.8% vs MemGPT's 93.4% on single-session fact retrieval — a narrow gap suggesting that for simple recall, most approaches perform comparably

Most published benchmarks test single-session recall rather than the cross-session synthesis and temporal reasoning that production systems actually need. Treat benchmark comparisons skeptically, particularly when self-reported.

## Implementing Agent Memory

For a new system, a reasonable progression:

1. Start with a [CLAUDE.md](../concepts/claude-md.md)-style file for always-relevant project or user context. Zero infrastructure, immediate benefit.
2. Add session-level memory as a short context window summary passed to each new session. Cheap, adequate for many use cases.
3. Add user-level semantic memory with a vector store (Qdrant local, Chroma, or pgvector if you already run Postgres). Use a two-pass extraction pipeline like Mem0's.
4. Add hybrid search (dense + BM25) once retrieval quality matters enough to instrument and measure.
5. Add a knowledge graph if you need temporal reasoning, relationship queries, or deduplication across many sources.
6. Add procedural memory (ACE-style skill extraction) if your agents do repeated structured tasks and you want them to improve from experience.

## Relation to Adjacent Concepts

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is a specific implementation of the knowledge retrieval component of agent memory. RAG focuses on retrieving from static external knowledge bases; agent memory focuses on retrieving from dynamically accumulated interaction history. The retrieval mechanisms overlap significantly (both use vector search); the write pipeline is what differs.

[Context Management](../concepts/context-management.md) governs how memory is assembled into the context window: what to include, in what order, and at what level of compression. Memory systems provide the store; context management governs the assembly.

[Multi-Agent Systems](../concepts/multi-agent-systems.md) introduce additional complexity: how do multiple agents share memory, avoid redundant retrieval, and coordinate on memory updates? See [Organizational Memory](../concepts/organizational-memory.md) for the shared-memory dimension.

[Self-Improving Agents](../concepts/self-improving-agents.md) use procedural memory as a core mechanism: agents write strategies back to their own skill store, then retrieve them in future sessions. ACE and [Voyager](../projects/voyager.md) exemplify this pattern.

[Short-Term Memory](../concepts/short-term-memory.md) and [Long-Term Memory](../concepts/long-term-memory.md) are the temporal dimension of the same taxonomy.


## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — implements (0.7)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.7)
- [OpenAI](../projects/openai.md) — part_of (0.5)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.7)
- [Context Management](../concepts/context-management.md) — part_of (0.8)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — part_of (0.7)
- [Claude Code](../projects/claude-code.md) — implements (0.6)
- [Knowledge Graph](../concepts/knowledge-graph.md) — implements (0.7)
- [LangChain](../projects/langchain.md) — implements (0.7)
- [ACE](../projects/ace.md) — implements (0.6)
- [Vector Database](../concepts/vector-database.md) — implements (0.7)
- [CrewAI](../projects/crewai.md) — part_of (0.6)
- [LangGraph](../projects/langgraph.md) — implements (0.6)
- [Chain-of-Thought](../concepts/chain-of-thought.md) — part_of (0.5)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.5)
- [OpenClaw](../projects/openclaw.md) — implements (0.6)
- [Cursor](../projects/cursor.md) — implements (0.5)
- [Anthropic](../projects/anthropic.md) — part_of (0.6)
- [Claude](../projects/claude.md) — implements (0.6)
- [ReAct](../concepts/react.md) — implements (0.6)
- [ACE](../projects/ace.md) — implements (0.6)
- [Vector Database](../concepts/vector-database.md) — implements (0.7)
- [CrewAI](../projects/crewai.md) — part_of (0.6)
- [LangGraph](../projects/langgraph.md) — implements (0.6)

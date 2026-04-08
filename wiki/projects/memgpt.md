---
entity_id: memgpt
type: project
bucket: agent-memory
abstract: >-
  MemGPT (superseded by Letta) treats LLM context windows as virtual memory,
  paging facts between in-prompt editable blocks and external archival storage
  via explicit agent tool calls.
sources:
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - letta
  - retrieval-augmented-generation
  - graphiti
  - graphiti
last_compiled: '2026-04-08T02:54:00.663Z'
---
# MemGPT

## What It Is

MemGPT is a research prototype and agent framework from UC Berkeley (arXiv:2310.08560) that frames LLMs as operating systems managing scarce memory. The central insight: context windows are RAM, external storage is disk, and the LLM itself can be taught to page information in and out. The project has since been superseded by [Letta](../projects/letta.md), which productionized the same architecture into a full agent platform.

The OS analogy drove every architectural decision. Just as an OS creates the illusion of unlimited memory through paging, MemGPT creates the illusion of unlimited context through explicit memory management tool calls. The agent doesn't just have memory — it manages its own memory, deciding what to store, retrieve, and forget.

## Core Mechanism

MemGPT organizes memory into three tiers:

**Core memory** lives directly inside the system prompt as labeled editable blocks ("human," "persona," "notes"). The agent can read these at every step because they're literally part of the context. It modifies them by calling tools like `core_memory_replace(label, old_content, new_content)` or `core_memory_append(label, content)`. Character limits (not token limits) cap each block. The compiled output looks like XML-structured sections injected before the conversation history.

**Recall memory** is the full conversation history, persisted to disk. The agent searches it with `conversation_search(query, roles, date_range)` when it needs to re-examine something said earlier but no longer in context.

**Archival memory** is a vector database for processed long-term knowledge. The agent writes to it with `archival_memory_insert(content)` and retrieves with `archival_memory_search(query, top_k)`. Promotion from archival back into core memory is entirely manual — the agent must decide to search, retrieve, and then rewrite a core block with the retrieved fact.

The agent loop runs until the agent calls `send_message`. Each intermediate step is a full LLM call, so a single user message typically triggers 2-5 LLM calls: read context, decide what to update, call `core_memory_replace`, decide the response, call `send_message`. Memory modifications are zero-cost in API terms — they're string operations on Python objects — but the reasoning about what to modify costs full LLM tokens.

When the context window approaches 90% capacity, a summarization agent compresses older messages. The summarized content gets written to a `conversation_summary` block in core memory, discarding the original messages. Information lost during this compression is gone permanently.

## What's Architecturally Unique

Other memory systems — [Mem0](../projects/mem0.md), [Graphiti](../projects/graphiti.md), [Zep](../projects/zep.md) — run memory extraction as an external pipeline the agent doesn't control. MemGPT makes the agent the memory manager. The agent sees its own blocks, decides what's worth keeping, and rewrites them. This means:

- Memory is always legible. Any developer can inspect the exact text the agent uses as its learned state.
- Memory is immediately effective. A block change takes effect on the next LLM call, no reindexing required.
- Memory quality tracks model quality. A weak model creates fragmented, redundant blocks. A strong model consolidates and reorganizes them.

The Letta evolution added a sleeptime agent pattern: a second agent that runs asynchronously between user interactions, consolidating and reorganizing the primary agent's blocks without blocking real-time responses. This decouples memory quality from response latency, which was the main practical complaint about the original MemGPT approach.

## Key Numbers

**DMR benchmark (Deep Memory Retrieval):** MemGPT scored 93.4% accuracy on multi-session fact retrieval across 500 conversations. The Zep paper ([Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)) independently validated this figure and used it as the baseline to beat (Zep achieved 94.8%). Self-reported by the MemGPT team but confirmed by an independent third party's replication.

**Context window:** Default 128K tokens, with summarization triggering at 90% utilization.

**Maximum agent steps per request:** 50 (hardcoded default in Letta's `base_agent.py`).

**GitHub stars:** The original MemGPT repository accumulated substantial stars before the Letta rename; the combined project is one of the more widely starred agent memory repositories. Stars reflect attention to the research paper rather than production deployment volume, which is harder to assess.

## Strengths

**Transparent, inspectable memory.** Because all learned state is text in editable blocks, there's nothing opaque. Developers can read, edit, or reset an agent's memory via direct API calls to the block store. This debuggability is genuinely difficult to achieve with knowledge graph or vector-only approaches.

**Self-organizing memory under strong models.** GPT-4-class models can reorganize their own blocks over time, merging redundant entries and deleting stale facts via `rethink_memory`. Over many sessions, this produces a more coherent representation than append-only extraction pipelines.

**No separate ingestion pipeline.** The agent handles its own memory through tool calls. There's no separate ETL job extracting facts from conversations. This simplifies deployment for single-agent use cases.

**Continual learning in token space.** The framework enables genuine adaptation across sessions without weight updates. The agent's behavior changes because its context changes, not because its weights change. Reversible, auditable, and immediate.

## Critical Limitations

**Concrete failure mode — block fragmentation:** Repeated `core_memory_append` calls across many sessions produce increasingly bloated, poorly organized blocks. An agent that has talked to a user for 100 sessions might have a "human" block with 50 redundant entries. The agent must explicitly call `rethink_memory` to reorganize, but this requires recognizing the fragmentation problem and generating the entire block from scratch. Weak models don't do this reliably, and there's no automatic cleanup mechanism. The git-backed memory system in Letta partially addresses this with line-level edits, but the fundamental problem — memory quality depending on the agent's own housekeeping discipline — remains.

**Unspoken infrastructure assumption:** MemGPT assumes single-agent, single-thread operation. Each agent maintains one perpetual message thread, one set of blocks, and one archival store. Multi-tenant deployments where thousands of agents run concurrently require a production-grade Postgres backend, connection pooling, and per-agent isolation. The original research code assumed local SQLite. The Letta platform handles this, but anyone building on the raw MemGPT paper needs to solve it from scratch.

## When NOT to Use It

**Don't use MemGPT/Letta when:**

- You need structured queries over the agent's memory ("list all users who mentioned preference X"). Text blocks can't answer this without the agent parsing its own content every time. [Graphiti](../projects/graphiti.md) or [Zep](../projects/zep.md) handle relational queries natively via their knowledge graph schema.
- You need memory across many simultaneous agents sharing a knowledge base. Letta's shared block system works for small multi-agent groups, but it's not designed as a multi-tenant knowledge store with fine-grained access control.
- Your application is latency-sensitive and context management costs matter. A user message that triggers 5 LLM calls for memory bookkeeping is 5x more expensive than a RAG approach that retrieves once and generates once.
- You're building a RAG pipeline over a static document corpus. MemGPT adds no value here and substantial complexity. Use [LlamaIndex](../projects/llamaindex.md) or [LangChain](../projects/langchain.md) instead.
- The agent's memory footprint is large and highly relational. Temporal knowledge graphs like Zep demonstrate 18.5% accuracy improvements over simpler approaches on complex cross-session reasoning ([Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)), specifically because they can represent entity relationships and temporal invalidation that text blocks cannot.

## Unresolved Questions

**Cost at scale:** The original paper reports no per-message ingestion costs. A multi-step agent loop with 3-5 LLM calls per user message gets expensive fast. At what message volume does the self-managing memory approach become economically unviable compared to a cheaper extraction pipeline?

**Summarization information loss:** When context overflow triggers summarization, which facts get dropped? The system uses an LLM to compress, so important details can disappear. There's no mechanism to evaluate what was lost or to flag low-confidence summaries. The documentation doesn't address this tradeoff.

**Governance and memory ownership:** If an agent has learned facts about a user across 100 sessions, who owns those facts? The block contents are user data but stored in the operator's database. There's no built-in mechanism for a user to request deletion of specific memories, which matters for GDPR compliance.

**Conflict resolution between sleeptime agent and primary agent:** Both the primary and sleeptime agents can write to the same blocks. If they simultaneously attempt a `core_memory_replace` on the same block with conflicting content, which wins? The Letta codebase uses database transactions, but the semantic conflict resolution — which agent's judgment about the correct memory content should prevail — is not addressed.

## Alternatives

**Use [Mem0](../projects/mem0.md) when** you want automatic memory extraction without delegating memory management to the agent itself. Mem0 runs extraction in a separate pipeline, which is more reliable for weaker models but less transparent.

**Use [Zep](../projects/zep.md) or [Graphiti](../projects/graphiti.md) when** your application involves complex entity relationships, temporal reasoning (facts that change over time), or needs to synthesize conversational and structured business data. Zep's three-tier knowledge graph with bi-temporal indexing outperforms MemGPT on LongMemEval's cross-session reasoning tasks by 18.5%.

**Use [Letta](../projects/letta.md)** as the production version of MemGPT — same architecture, full platform with REST API, multi-agent orchestration, and proper database backends. The original MemGPT repository is effectively archived in favor of Letta.

**Use [LangChain](../projects/langchain.md) or [LlamaIndex](../projects/llamaindex.md) when** memory is a secondary concern and your primary need is RAG over static documents.

## Relationship to Broader Concepts

MemGPT implements a specific version of [Agent Memory](../concepts/agent-memory.md) where [Core Memory](../concepts/core-memory.md) takes priority over retrieved context. It operationalizes [Context Management](../concepts/context-management.md) by making the agent itself the context manager. The sleeptime pattern relates to [Continual Learning](../concepts/continual-learning.md) without weight updates. The full system is a concrete instance of [Cognitive Architecture](../concepts/cognitive-architecture.md) built around memory tiers analogous to human [Episodic Memory](../concepts/episodic-memory.md) and [Semantic Memory](../concepts/semantic-memory.md).

The original research paper contributed to [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) not as a RAG variant but as a critique of pure RAG: retrieval without writable memory doesn't let agents learn. That argument has influenced subsequent memory system designs, including Zep and Letta's own evolution.


## Related

- [Letta](../projects/letta.md) — supersedes (0.8)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.6)
- [Graphiti](../projects/graphiti.md) — part_of (0.6)
- [Graphiti](../projects/graphiti.md) — part_of (0.6)

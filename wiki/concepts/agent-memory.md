---
entity_id: agent-memory
type: concept
bucket: agent-memory
abstract: >-
  Agent Memory is the capability for AI agents to persist, retrieve, and update
  information across interactions — distinguished from RAG by supporting
  multiple memory types (episodic, semantic, procedural, core) with different
  retention, decay, and update semantics.
sources:
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/getzep-graphiti.md
  - repos/helloruru-claude-memory-engine.md
  - repos/transformeroptimus-superagi.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/aiming-lab-agent0.md
  - repos/caviraoss-openmemory.md
  - repos/mem0ai-mem0.md
  - repos/letta-ai-lettabot.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/michaelliv-napkin.md
related:
  - episodic-memory
  - rag
  - self-improving-agents
  - crewai
  - knowledge-base
  - claude-code
last_compiled: '2026-04-06T02:01:43.897Z'
---
# Agent Memory

**Type:** Concept | **Bucket:** agent-memory

Agent memory is the collection of mechanisms that let AI agents retain and retrieve information across context boundaries — between turns, sessions, and tasks. Without memory, every agent interaction starts from zero, forcing users to re-establish context and preventing agents from accumulating task-specific knowledge over time.

## Why It Matters

LLMs have fixed context windows. Even the largest ones (millions of tokens) cannot hold everything relevant to an ongoing project, a user's history, or a multi-week task. Memory systems solve this by moving information out of the context window, storing it durably, and retrieving only what's relevant for each moment. The memory layer is what separates a stateless chatbot from an agent that actually improves with use.

The problem is harder than it appears. A naive approach — store everything, retrieve by similarity — fails in production because:

- Retrieval quality degrades as the memory store grows
- Contradictory facts accumulate without resolution
- Temporal context gets lost (what was true last week vs. now)
- Token budgets require selective injection, not full dumps

Production systems need structured memory architectures, not just vector databases bolted onto LLMs.

## Memory Types

Agent memory systems typically implement some combination of four types, each with different update semantics and retrieval patterns.

### Episodic Memory

Stores records of specific past interactions: what happened, when, and in what context. Think conversation history, task execution logs, and decision records. [Episodic Memory](../concepts/episodic-memory.md) is time-indexed and event-specific — you retrieve it by asking "what happened when X" rather than "what do I know about X."

Episodic stores face a tradeoff between granularity and retrievability. Coarse episodes (full sessions) are easy to store but hard to search precisely. Fine-grained episodes (per-turn notes) give BM25 better term concentration but multiply storage costs. Research from the Napkin project suggests per-round notes (~2.5K characters each, organized by day) outperform session-level aggregation on LongMemEval benchmarks by giving retrieval algorithms focused term frequency.

### Semantic Memory

Stores general knowledge, facts, and beliefs — not "what happened" but "what is true." [Semantic Memory](../concepts/semantic-memory.md) accumulates across episodes: repeated observations consolidate into stable beliefs, and newer observations update or contradict older ones.

The update problem is the hard part. When an agent learns "Alice prefers dark mode" and later learns "Alice switched to light mode," the semantic store must invalidate the old fact rather than accumulate both. Systems like [Graphiti](../projects/graphiti.md) address this with explicit validity windows: each fact has a `valid_from` and `valid_until` timestamp. When a contradicting fact arrives, the old one is invalidated but not deleted. This enables historical queries ("what did we believe about Alice's preferences in March?") alongside current-state queries.

### Procedural Memory

Stores learned workflows, successful patterns, and reusable skills — not facts but methods. [Procedural Memory](../concepts/procedural-memory.md) lets agents avoid re-solving problems they've already solved. A coding agent that learned how to handle a particular error pattern can apply that pattern in future sessions without re-deriving it.

Procedural memory is tightly related to [Agent Skills](../concepts/agent-skills.md) and [skill.md](../concepts/skill-md.md) files — the mechanism [Claude Code](../projects/claude-code.md) uses to persist agent-specific instructions and learned behaviors. When Claude Code writes to `CLAUDE.md` or `skill.md`, it's externalizing procedural memory as files that future sessions can load.

### Core Memory

A small, always-loaded set of facts about the user, task, or agent itself — too important to risk missing in retrieval. [Core Memory](../concepts/core-memory.md) operates like a pinned context that's injected at session start before any retrieval happens. [Letta](../projects/letta.md) (formerly MemGPT) formalized this concept: agents have a fixed "core memory" block (name, key preferences, current goal) distinct from the larger archival memory accessed on demand.

The tradeoff is capacity vs. reliability. Everything in core memory is always available but consumes context tokens. Everything outside core memory might be missed if retrieval fails.

## How Retrieval Works

Retrieval is where memory systems diverge most sharply in design.

### Embedding-Based (Vector Search)

The dominant approach: encode memories as dense vectors, store in a [Vector Database](../concepts/vector-database.md) like [Pinecone](../projects/pinecone.md), [Qdrant](../projects/qdrant.md), or [ChromaDB](../projects/chromadb.md), retrieve by cosine similarity to the query. [Retrieval-Augmented Generation](../concepts/rag.md) describes the general pattern.

Strengths: handles synonym matching and semantic similarity across vocabulary gaps. Weaknesses: requires an embedding model (cost and latency), vectors become stale when facts change, and retrieval quality depends heavily on chunking strategy.

[Mem0](../projects/mem0.md) uses this approach with an LLM-driven extraction layer: before storing a conversation, an LLM extracts discrete facts ("user prefers Python over JavaScript") and stores those as indexed memories rather than raw text. This extraction step is critical — it gives the vector search structured, deduplicated facts instead of noisy conversational chunks. Mem0 reports 26% accuracy improvement over OpenAI Memory on LOCOMO and 90% token reduction versus full-context approaches (self-reported, not independently validated).

### BM25 (Keyword Search)

BM25 ranks documents by term frequency weighted by inverse document frequency — the same algorithm powering most search engines. [BM25](../concepts/bm25.md) requires no embedding model, no vector database, and no preprocessing beyond tokenization. The Napkin project demonstrated that BM25 with three retrieval signals (BM25 score + backlink count + recency) achieves 91% on LongMemEval-S, outperforming embedding-based systems at 86% and GPT-4o full context at 64% (self-reported).

The limitation is vocabulary dependency: BM25 fails when queries and documents use different words for the same concept. "Authentication" won't match "login" unless both appear together. For structured knowledge bases where terminology is consistent — code projects, personal notes — this matters less than for open-domain retrieval.

### Hybrid Retrieval

[Hybrid Retrieval](../concepts/hybrid-retrieval.md) combines BM25 and vector search, typically with Reciprocal Rank Fusion (RRF) to merge ranked lists. This handles both exact keyword matches and semantic similarity. [Graphiti](../projects/graphiti.md) extends this further with graph traversal — after finding initial matches, it expands retrieval through entity relationships in a knowledge graph. The combined approach (semantic + BM25 + graph) trades complexity for coverage.

### Graph-Based Retrieval

[Knowledge Graph](../concepts/knowledge-graph.md) approaches model memory as entities and relationships with typed edges. When retrieving, the agent can traverse relationships: "what do I know about Alice?" expands to include facts about Alice's team, Alice's projects, and anything Alice said about a particular topic. [Graphiti](../projects/graphiti.md) adds temporal edges — each relationship has a validity window, enabling queries like "what was Alice's role before the reorg?"

[HippoRAG](../projects/hipporag.md) applies this to document retrieval: it builds a graph of named entities and their co-occurrence relationships from a document corpus, then retrieves via graph traversal rather than pure embedding similarity. This enables multi-hop reasoning where the answer requires connecting facts across multiple documents.

## Progressive Disclosure

A key architectural pattern for memory-augmented agents: don't inject everything at once. Instead, structure memory access in tiers:

1. **Always-loaded (L0):** Core memory, project goals, critical conventions — a few hundred tokens injected at session start
2. **Overview (L1):** A compressed map of available memory — which topics exist, keyword summaries — 1-2K tokens
3. **Search (L2):** Targeted retrieval of relevant chunks — 2-5K tokens
4. **Full read (L3):** Complete documents when needed

[Progressive Disclosure](../concepts/progressive-disclosure.md) respects context window budgets while giving agents a path to deeper information. The Napkin project implements this explicitly as L0-L3 tiers. [Claude Code](../projects/claude-code.md)'s `CLAUDE.md` / `claude.md` files implement L0: a pinned context note that orients every session.

## Memory Consolidation

Raw episodic memory grows without bound. [Memory Consolidation](../concepts/memory-consolidation.md) compresses or synthesizes accumulated episodes into higher-level representations. Human sleep consolidates episodic memory into semantic memory; agent systems need analogous processes.

Approaches include:
- **LLM-driven extraction:** After each session, run an LLM pass to extract durable facts from conversation history (Mem0's approach, Napkin's distillation)
- **Automatic summarization:** Periodically summarize old episodes into compressed representations
- **Fact invalidation:** When new facts contradict old ones, mark old facts invalid rather than keeping both (Graphiti's approach)

Consolidation quality depends entirely on the extraction LLM's judgment. Poor extraction produces noisy, redundant, or wrong facts that degrade retrieval quality over time.

## Temporal Memory

Most memory systems lose track of when facts were true. This matters when facts change: a user's job title, a project's status, a preference. Static memory stores accumulate contradictions. Temporal memory systems address this by:

1. Tagging each fact with an ingestion timestamp (basic)
2. Maintaining validity windows: `valid_from` / `valid_until` (Graphiti)
3. Tracking the episode that produced each fact for provenance (Graphiti's episode layer)

Without temporal indexing, an agent asked "what is Alice's current role?" might retrieve both "Alice is a software engineer" (2023) and "Alice is an engineering manager" (2024) with no way to resolve the conflict.

## Implementations

**[Mem0](../projects/mem0.md):** Extraction-first approach. An LLM extracts discrete facts before storage, reducing retrieval noise. Supports user/session/agent memory scopes. Works across LLM providers. Self-hosted or managed. Python/TypeScript SDKs.

**[Graphiti](../projects/graphiti.md):** Temporal knowledge graph with explicit validity windows and episode provenance. Hybrid retrieval (semantic + BM25 + graph). Requires Neo4j, FalkorDB, or Kuzu. Highest fidelity for evolving facts, highest infrastructure cost.

**[Zep](../projects/zep.md):** Managed service built on Graphiti. Handles per-user context graphs at scale with sub-200ms retrieval SLAs. Enterprise features (governance, dashboards). Pay-per-use vs. self-managed Graphiti.

**[Letta](../projects/letta.md):** Formalizes core/archival memory distinction. Agents have fixed core memory (always in context) and unlimited archival memory (retrieved on demand). Open-source with REST API.

**[LangChain](../projects/langchain.md) / [LangGraph](../projects/langgraph.md):** Memory as a graph node in agent workflows. Supports multiple backends (in-memory, vector stores, databases). Memory is explicit state passed between nodes rather than a separate subsystem.

**[CrewAI](../projects/crewai.md):** Multi-agent memory with entity memory, short-term (recent interactions), long-term (SQLite persistence), and user memory. Agents in a crew can share memory stores.

**[Claude Code](../projects/claude-code.md):** Implements procedural memory via `CLAUDE.md` files — project-specific instructions that load at session start. Combined with MCP servers, agents can read/write persistent context across sessions.

## Self-Improving Memory

The [Darwin Gödel Machine](../projects/darwin-godel-machine.md) demonstrated that agents can improve their own memory management as part of self-improvement: better context window management and long-context handling emerged as autonomous improvements during open-ended evolution, contributing to a jump from 20% to 50% on SWE-bench (self-reported). This suggests memory architecture isn't fixed — agents can discover better ways to organize and retrieve their own knowledge through empirical validation.

[Self-Improving Agents](../concepts/self-improving-agents.md) more broadly depend on memory: without durable records of what worked and what failed, self-improvement loops cannot accumulate learning across episodes.

## Failure Modes

**Retrieval miss:** The relevant memory exists but retrieval doesn't surface it. Common causes: vocabulary mismatch (BM25), poor chunking strategy (embeddings), or topic drift between storage and query time. Result: the agent re-derives or re-asks for information it should know.

**Retrieval hallucination:** The system retrieves something plausible but irrelevant, and the agent treats it as ground truth. Vector similarity doesn't guarantee semantic relevance — high cosine similarity can connect unrelated documents that share vocabulary.

**Stale facts:** Memory stores accumulate contradictions when older facts aren't invalidated. An agent retrieving both "project uses Postgres" and "project migrated to MongoDB" has no reliable basis for answering questions about the database.

**Memory poisoning:** Low-quality or adversarial inputs write bad facts into long-term memory. Without quality gates on the write path, distillation processes can create permanently wrong beliefs.

**Context flooding:** Injecting too much memory defeats the purpose. When retrieved context exceeds useful density, the LLM's attention degrades and key information gets lost. [Context Collapse](../concepts/context-collapse.md) describes this failure mode.

**Abstention failure:** Memory systems that always return results cannot signal "I don't know." BM25 always returns the highest-scoring match regardless of actual relevance. Without calibrated confidence thresholds, agents give answers based on weakly-matched memory rather than acknowledging uncertainty. Napkin's LongMemEval results show 50% accuracy on abstention tasks — the weakest category.

## When Not to Use Agent Memory

Agent memory adds latency, complexity, and potential for retrieval errors. Skip it when:

- The task is single-turn with no session continuity requirement
- All needed context fits comfortably in the context window (< 20K tokens)
- Retrieval errors are worse than missing context (high-stakes factual domains)
- The knowledge is static and better served by RAG over a document corpus

For tasks where accuracy matters more than personalization, full-context approaches (stuffing the entire history into context) outperform selective retrieval — the risk of retrieval miss outweighs the token savings. Memory systems earn their keep when sessions are long, knowledge accumulates over weeks, or personalization across users is the core value proposition.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md) — the retrieval pattern underlying most memory architectures
- [Episodic Memory](../concepts/episodic-memory.md) — time-indexed event records
- [Core Memory](../concepts/core-memory.md) — always-loaded, high-priority facts
- [Knowledge Graph](../concepts/knowledge-graph.md) — graph-based fact storage
- [Memory Consolidation](../concepts/memory-consolidation.md) — compression of accumulated episodes
- [Context Engineering](../concepts/context-engineering.md) — broader discipline of managing what enters the context window
- [Self-Improving Agents](../concepts/self-improving-agents.md) — agents that improve their own memory architecture

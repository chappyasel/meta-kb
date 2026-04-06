---
entity_id: letta
type: project
bucket: agent-memory
abstract: >-
  Letta (formerly MemGPT) is an open-source stateful agent platform where agents
  manage their own memory by reading and writing editable text blocks injected
  directly into the LLM system prompt, enabling persistent learning across
  sessions without external memory middleware.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - repos/mirix-ai-mirix.md
  - repos/letta-ai-letta-code.md
  - repos/letta-ai-letta.md
  - repos/letta-ai-lettabot.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - rag
  - episodic-memory
  - semantic-memory
  - graphiti
  - self-improving-agents
last_compiled: '2026-04-06T02:05:32.586Z'
---
# Letta

**Type:** Project | **Category:** Agent Memory  
**Repo:** [letta-ai/letta](https://github.com/letta-ai/letta) | 21,873 stars, 2,312 forks | Apache-2.0  
**Language:** Python | **Last Updated:** April 2026

## What It Does

Letta is a full agent platform built around one core bet: memory should live inside the agent's context window as editable text that the agent explicitly controls, not in an external system the agent queries passively. Every agent maintains labeled memory blocks compiled directly into its system prompt. The agent can read them, rewrite them, and reorganize them via tool calls during normal operation. When the context fills, a summarization agent compresses old messages and writes the summary back into a dedicated block.

The original MemGPT paper (arXiv:2310.08560) framed this as an OS analogy: the LLM is the CPU, the context window is RAM, and external storage is disk. Tool calls serve as system calls. The agent "pages" information between tiers exactly as an OS manages virtual memory. Letta extends this into a full platform with REST API, multi-agent orchestration, MCP support, and deployment infrastructure.

This is not a memory library you bolt onto another framework. Letta is the framework.

## Core Architecture

The codebase (~200+ Python source files) organizes into five major subsystems:

**Agent Layer** (`letta/agents/`): `LettaAgent` is the main implementation. `VoiceAgent`, `EphemeralAgent`, `EphemeralSummaryAgent`, and versioned iterations (v2, v3) all extend `BaseAgent`. Each agent maintains one perpetual message thread that grows across sessions, with summarization as the only compaction mechanism.

**Memory System** (`letta/schemas/memory.py`, `letta/schemas/block.py`): The `Memory` class holds a list of `Block` objects. Each block has a `label` (e.g., "human", "persona"), `value` (the text content), `limit` (character cap, default `CORE_MEMORY_BLOCK_CHAR_LIMIT`), and a `read_only` flag. The `Memory.compile()` method renders all blocks into XML injected into the system prompt, including character counts and limits so the agent knows its own memory constraints.

**Tool System** (`letta/functions/`): Built-in tools the agent calls to modify its own context:
- `core_memory_replace(label, old_content, new_content)` — exact string replacement; fails with ValueError if old_content not found
- `core_memory_append(label, content)` — appends with newline separator
- `rethink_memory(new_memory, target_block_label)` — full block rewrite; creates the block if absent
- `memory(command, path, ...)` — multi-command tool for git-backed memory (create, str_replace, insert at line number, delete, rename)
- `archival_memory_insert(content, tags)` — writes to long-term vector-searchable storage
- `archival_memory_search(query, tags, top_k)` — semantic search over archival storage
- `conversation_search(query, roles, limit, start_date, end_date)` — hybrid search over recall memory

**Summarization System** (`letta/services/summarizer/`): Two modes. `STATIC_MESSAGE_BUFFER` evicts oldest messages and spawns a background `EphemeralSummaryAgent` to write a summary to a `conversation_summary` block. `PARTIAL_EVICT_MESSAGE_BUFFER` synchronously evicts 30% of messages and inserts a recursive summary at index 1. Summarization triggers at 90% context window usage (`SUMMARIZATION_TRIGGER_MULTIPLIER = 0.9`).

**Multi-Agent Groups** (`letta/groups/`): `SleeptimeMultiAgent`, `DynamicMultiAgent`, `RoundRobinMultiAgent`, `SupervisorMultiAgent`. Communication uses `send_message_to_agent_async`, `send_message_to_agent_and_wait_for_reply`, and `send_message_to_agents_matching_all_tags`.

## Three-Tier Memory Model

**Core Memory (in-context blocks)**: What the agent holds in its active system prompt. Editable via tool calls. Persisted to PostgreSQL between sessions and reloaded at the start of each `step()` call via `_rebuild_memory_async`. This is the agent's working knowledge — user preferences, persona, project context, anything the agent decides matters.

**Recall Memory (conversation history)**: Every message in the agent's perpetual thread, stored to disk. The agent searches this via `conversation_search`. Not automatically loaded into context — the agent retrieves what it needs.

**Archival Memory (long-term vector store)**: Passage-based storage with embedding search. The agent writes to it with `archival_memory_insert` and retrieves with `archival_memory_search`. No automatic promotion; the agent must explicitly pull information back into context.

The documentation draws a sharp distinction from [Retrieval-Augmented Generation](../concepts/rag.md): RAG connects systems to data but does not enable learning. Letta agents can write to their own core memory, so they accumulate knowledge rather than just querying it. The Letta team calls this "continual learning in token space" — no gradient updates, no weight changes, just an LLM editing strings in its own prompt.

## Sleeptime Agents

The `SleeptimeMultiAgent` pattern is Letta's most architecturally distinctive feature. A primary agent handles real-time user interactions but lacks tools for editing core memory. After every N messages (configurable via `sleeptime_agent_frequency`), a background task spawns a sleep-time agent that receives a transcript of recent messages and has exclusive write access to both its own and the primary agent's memory blocks.

The sleep-time agent reorganizes raw conversation data into structured, consolidated memories. It can use a stronger, slower model than the primary agent because latency doesn't matter during background processing. Results propagate to the primary agent through the shared block system — the primary agent's system prompt will reflect the consolidated memory on its next `step()` call.

This addresses the core tension in synchronous memory management: every memory operation during a live conversation is an LLM call that adds latency. The sleeptime pattern moves that cost out of the critical path.

## Data Flow

```
user message → LettaAgent.step()
  → _rebuild_memory_async()      # reload blocks from DB, recompile system prompt
  → prepare_in_context_messages() # assemble history + system prompt
  → LLM call with tool schemas
  → if tool call: execute tool → update block/archival → loop (max 50 iterations)
  → if send_message: return to user
  → if context >90%: trigger summarization
```

Each user message typically triggers 2-5 LLM calls as the agent reasons, updates memory, and formulates a response. The default `DEFAULT_MAX_STEPS = 50` caps runaway loops.

## Key Numbers

**Stars**: 21,873 (GitHub, self-reported)  
**Benchmark**: On the Zep paper's DMR benchmark (500 multi-session conversations), MemGPT achieved 93.4% accuracy vs. Zep/Graphiti's 94.8%. This is independently reported in the Zep paper ([Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)), not self-reported by Letta. No MemGPT/Letta benchmark scripts exist in the repository; the team focuses on observability (OpenTelemetry) rather than benchmark infrastructure.  
**LLM Providers**: 17+ via adapters (OpenAI, Anthropic, Ollama, Google AI, Azure, Groq, Together, vLLM, AWS Bedrock, DeepSeek, xAI, LM Studio, others).  
**Context window**: Default 128K tokens with 90% summarization trigger.  
**Archival chunk size**: Default 300 characters, 1024-dimensional embeddings.

## Strengths

**Memory is inspectable and externally editable.** Every block is a database row with a `block_id`. Developers can read, write, and share blocks via REST API without going through the agent. The Agent Development Environment (ADE) visualizes block contents in real time. For debugging and oversight, this transparency is a material advantage over systems where memory lives in opaque vector stores.

**Agents genuinely accumulate knowledge across sessions.** The perpetual thread model and writable core memory mean the same agent, given the same `agent_id`, will remember user preferences from three months ago and will have refined its understanding of the user over time. This is the correct architecture for personal assistants, long-running research agents, and any use case where history matters.

**Shared memory blocks enable multi-agent coordination without message passing.** Multiple agents can reference and modify the same block. A researcher agent and a reviewer agent sharing a `shared_knowledge` block will each see the other's updates in their next system prompt compilation. This is cleaner than pub/sub messaging for shared state.

**Model agnosticism without lock-in.** The provider adapter layer handles streaming, tool calling, and structured output differences across 17+ LLM providers. Swapping models requires changing one parameter.

**Background memory consolidation separates quality from latency.** The sleeptime pattern lets you use a strong model (Claude Opus, GPT-4) for memory consolidation and a fast model for real-time responses, without the user waiting for consolidation to complete.

## Critical Limitations

**Memory quality is entirely LLM-dependent.** The agent decides what to remember, what to overwrite, and how to reorganize blocks. Weaker models create fragmented, redundant, or stale memory blocks. There is no automatic fact extraction, no deduplication algorithm, no conflict detection — just an LLM editing strings. If the model fails to call `core_memory_replace` when it should, old information persists silently.

**`core_memory_replace` requires exact string matching.** If the agent misremembers the exact text in its own block (plausible for blocks that have been edited multiple times), the replacement fails with a ValueError. The agent must then use `rethink_memory` to rewrite the entire block, which requires regenerating all existing content — a significant context and latency cost.

**No global context budget across blocks.** Each block has its own character limit, but there is no enforcement of a total across all blocks. An agent with 10 blocks each at their individual limits can overflow the context window. The 90% trigger provides a safety margin but the race condition between a large tool response and summarization completion is real.

**Unspoken infrastructure assumption: PostgreSQL.** The ORM layer (`letta/orm/`) targets PostgreSQL. SQLite is supported for development but production deployments need Postgres with embedding support. The README doesn't foreground this. Teams expecting a lightweight SQLite-backed library will encounter operational complexity.

## When NOT to Use Letta

**You need structured knowledge queries.** Letta stores everything as unstructured text strings. "What is Alice's relationship to Bob?" requires parsing block text on every query. For relational reasoning across many entities, [Graphiti](../projects/graphiti.md) or [Zep](../projects/zep.md)'s knowledge graph approach handles this natively.

**You need memory as a standalone library.** Letta is a full platform with a FastAPI server, PostgreSQL backend, and multi-agent orchestration. If you have an existing agent framework ([LangGraph](../projects/langgraph.md), [CrewAI](../projects/crewai.md)) and want to add persistent memory, [Mem0](../projects/mem0.md) or [Zep](../projects/zep.md) integrate more cleanly without requiring you to adopt Letta's agent runtime.

**You need sub-100ms response latency.** A typical Letta agent step involves 2-5 LLM calls for memory management plus the response generation call. Even with fast models, total latency per turn is measured in seconds. The sleeptime pattern helps but doesn't eliminate the base overhead.

**You need multi-hop temporal reasoning over large knowledge bases.** On the LongMemEval benchmark, Zep achieves 71.2% accuracy vs. Letta/MemGPT's 93.4% (on DMR, a simpler task). For complex enterprise scenarios requiring temporal fact tracking and entity relationship queries, graph-based architectures outperform text-block-based approaches. ([Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md))

**Your agent needs to reason about its own prior outputs.** Zep's benchmark revealed that systems built on conversational extraction (similar to Letta's approach) score -17.7% on questions about what the assistant said, as opposed to what the user said. If your agent's own prior recommendations and outputs are important context, the extraction pipeline may miss them.

## Unresolved Questions

**Cost at scale.** The documentation provides no per-agent storage estimates, per-message LLM call counts, or pricing guidance for high-volume deployments. A production deployment with 10,000 agents sending 100 messages/day each generates unknown but substantial LLM costs from memory management calls alone.

**Sleeptime agent failure handling.** Background tasks run in daemon threads with their own event loops (`asyncio.new_event_loop()`). The documentation does not describe what happens when a sleep-time agent crashes, produces low-quality output, or writes inconsistent memories. There is no retry mechanism or quality gate described in the codebase or docs.

**Block conflict resolution in shared memory.** When two agents write to the same shared block concurrently, database-level locking presumably prevents corruption, but the documentation does not describe what happens to an agent whose local copy of a block becomes stale mid-step due to another agent's write.

**Community governance and commercial positioning.** Letta offers a hosted service at `app.letta.com` alongside the Apache-2.0 open-source repo. The boundary between open-source and hosted-only features is not documented. The model leaderboard at `leaderboard.letta.com` is externally hosted and could change rankings at any time.

**Context constitution formalization.** The blog describes "context constitution" as a formalized policy for how context is composed, and "context repositories" with git-backed block versioning. Neither feature is fully documented in the public API reference, making it unclear what's production-ready versus experimental.

## Alternatives

**Use [Mem0](../projects/mem0.md)** when you need memory as a drop-in library for an existing agent stack. Mem0 handles automatic fact extraction and deduplication without requiring you to adopt a new agent runtime.

**Use [Graphiti](../projects/graphiti.md) / [Zep](../projects/zep.md)** when your application requires temporal fact tracking, entity relationship queries, or structured knowledge that evolves over time. The knowledge graph approach handles "what did we believe about X at time Y?" natively; Letta cannot.

**Use [LangGraph](../projects/langgraph.md)** when you need fine-grained control over agent execution flow and state transitions. LangGraph's graph-based execution model handles complex conditional logic and branching that Letta's linear step loop does not support.

**Use Letta** when persistent agent identity across sessions is the primary requirement, when you want agents that visibly and inspectably refine their own knowledge over time, or when you need background memory consolidation via the sleeptime pattern. It's the strongest open-source option for personal assistant-style agents where long-term user modeling matters.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader category Letta operates in
- [Core Memory](../concepts/core-memory.md) — the block-based in-context memory layer Letta implements
- [Episodic Memory](../concepts/episodic-memory.md) — maps to Letta's recall memory tier
- [Semantic Memory](../concepts/semantic-memory.md) — maps to Letta's archival memory tier
- [Memory Consolidation](../concepts/memory-consolidation.md) — what the sleeptime agent performs
- [Self-Improving Agents](../concepts/self-improving-agents.md) — the broader pattern Letta's memory-rewriting approach implements
- [Context Engineering](../concepts/context-engineering.md) — the discipline of optimizing what goes into an LLM's context window
- [Retrieval-Augmented Generation](../concepts/rag.md) — the approach Letta explicitly contrasts itself against

---

*Primary sources: [Deep repo analysis](../raw/deep/repos/letta-ai-letta.md), [Zep paper](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md), [Context engineering survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)*

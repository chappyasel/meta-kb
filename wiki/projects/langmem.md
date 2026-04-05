---
entity_id: langmem
type: project
bucket: agent-memory
sources:
  - repos/memorilabs-memori.md
  - deep/repos/memorilabs-memori.md
related: []
last_compiled: '2026-04-05T05:36:12.856Z'
---
# LangMem

## What It Is

LangMem is a Python library from LangChain for giving agents persistent memory across sessions. It handles the full memory lifecycle: extracting facts and preferences from conversations, storing them in configurable backends, and retrieving relevant context when needed. It sits between your agent and whatever storage you use, so you can add long-term memory to LangGraph agents without building the extraction and retrieval plumbing yourself.

The library targets LangGraph-based agents specifically, though it can operate standalone. It provides both in-context memory (stuffing relevant history into prompts) and external storage patterns.

## Core Architecture

LangMem organizes memory into three functional layers:

**Extraction:** The `create_memory_manager` function uses an LLM to extract structured facts from conversation turns. You define schemas (Pydantic models) for what to extract, and LangMem runs extraction as a background step. The extraction prompt instructs the model to identify user preferences, facts, and instructions worth retaining.

**Storage:** LangMem uses LangChain's `BaseStore` interface as its storage abstraction. The default is an in-memory store; production use requires connecting a persistent backend. Memories are namespaced by user/thread identifiers, so `(user_id, "memories")` as a namespace key scopes storage to a particular user.

**Retrieval:** Two retrieval modes ship out of the box. Semantic search uses embeddings to find relevant memories given the current query. Direct lookup returns all memories for a namespace. The `create_manage_memory_tool` and `create_search_memory_tool` expose these as tool-callable functions that agents can invoke explicitly.

The library also provides a `BackgroundMemoryManager` that runs extraction asynchronously after a conversation ends, avoiding latency on the critical path.

## Key Design Choices

LangMem takes a schema-driven extraction approach: you tell it what to remember by defining Pydantic models, and the extraction LLM fills them in. This is more reliable than open-ended extraction but requires upfront schema design. A `MemorySchema` with fields like `preference`, `fact`, and `context` gives the extractor structure to work against.

Memory updates use a merge strategy rather than append-only storage. When a new fact conflicts with an existing one, LangMem calls the LLM to reconcile them. This prevents the accumulation of contradictory facts but adds LLM calls on every update, which costs tokens and adds latency.

The `thread_id` / `user_id` scoping model mirrors LangGraph's checkpointer conventions. If you're already using LangGraph with a `MemorySaver`, the namespace conventions carry over, making integration mechanical rather than architectural.

## Numbers

LangMem appears in the Memori LoCoMo benchmark comparison, where Memori reports outperforming LangMem on accuracy and token efficiency. Memori's own LoCoMo results show 81.95% accuracy at 1,294 tokens/query. LangMem's specific LoCoMo scores are not independently published. The benchmark numbers come from Memori's self-reported results ([Source](../../raw/repos/memorilabs-memori.md)), so treat the relative comparison with skepticism.

LangMem's GitHub stars are not provided in the source material; as a LangChain ecosystem project it benefits from LangChain's distribution but carries no independently verified benchmark claims of its own.

## Strengths

**LangGraph integration is first-class.** If your agent already uses LangGraph with a checkpointer, adding LangMem requires minimal structural changes. The namespace conventions, async patterns, and tool interfaces align with LangGraph primitives.

**Schema-driven extraction reduces hallucination risk.** Telling the extractor what to look for (preferences, facts, instructions) produces more consistent output than asking a model to extract "whatever seems important."

**Tool-based memory access fits agent patterns.** Exposing search and manage as tools the agent calls explicitly, rather than injecting context automatically, gives agents control over when memory retrieval is worth the latency.

## Limitations

**Storage backend is your problem.** The `BaseStore` abstraction means production deployment requires you to wire up a real backend. The library ships no persistence of its own. A Redis, PostgreSQL, or vector store integration takes work, and the docs are sparse on production configuration specifics.

**Concrete failure mode: conflicting memory on schema mismatch.** If your Pydantic extraction schema changes after you've already stored memories, old memories and new memories use different shapes. LangMem has no migration path. You end up with a mixed store where retrieval either breaks or returns malformed objects depending on how the merge LLM handles the inconsistency.

**Unspoken infrastructure assumption:** LangMem assumes you have a reliable embeddings service available at query time. Semantic retrieval calls your embedding model on every memory search. In high-throughput production, this means your embedding endpoint becomes a latency and cost dependency that doesn't appear anywhere in the library's README.

## When Not to Use It

Skip LangMem if you're not using LangGraph. The library is designed around LangGraph's graph execution model and tool calling patterns. Forcing it into a non-LangGraph agent means working against the abstractions rather than with them.

Skip it if you need temporal reasoning about memories. LangMem stores facts with timestamps but has no mechanism for "this fact superseded that one" or "this preference changed in March." Contradictory facts from different periods require manual reconciliation.

Skip it for high-frequency, low-context agents (code completions, short-form tasks). Every agent invocation that triggers memory search adds embedding calls and LLM merge operations. For agents that run hundreds of times per hour per user, this cost compounds quickly with no mechanism to disable retrieval for lightweight calls.

Skip it if your team doesn't own LangChain expertise. Debugging extraction failures, storage namespace issues, or retrieval quality problems requires understanding LangChain's BaseStore, runnable interfaces, and LangGraph's execution model. The abstraction layers make failure modes harder to trace.

## Unresolved Questions

**Cost at scale:** No public data on how many LLM calls extraction and merging consume per conversation turn in practice. The merge-on-conflict pattern is theoretically unbounded if conversations frequently revisit the same topics.

**Extraction quality without ground truth:** LangMem relies on the extraction LLM to decide what's worth remembering. No documentation covers how to evaluate extraction quality, tune prompts, or handle systematic extraction failures.

**Multi-user isolation guarantees:** Namespace scoping prevents cross-user contamination at the application level, but the docs don't specify whether the `BaseStore` interface provides any isolation enforcement at the storage level. A misconfigured namespace produces silent cross-user leakage.

**Long-term memory decay:** There's no forgetting mechanism. As user memory stores grow over months, retrieval quality degrades and storage costs grow. LangMem has no documented strategy for pruning, expiring, or consolidating old memories.

## Alternatives

**Use [Mem0](../projects/mem0.md)** when you need LLM-agnostic memory with a managed cloud option and don't want to own storage infrastructure. Mem0 ships with its own hosted backend.

**Use Memori** when token efficiency is the primary constraint. Memori's middleware interception model adds memory transparently without changing agent code, and its LoCoMo results show better accuracy at lower token cost than LangMem (self-reported by Memori).

**Use Zep** when you need conversation history as the primary memory primitive with graph-based entity tracking and don't want schema-driven extraction.

**Build directly on LangGraph checkpointers** when your memory needs are session-scoped rather than cross-session. Checkpointers handle within-session state cleanly without the overhead of extraction pipelines.

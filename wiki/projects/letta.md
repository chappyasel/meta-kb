---
entity_id: letta
type: project
bucket: agent-memory
abstract: >-
  Letta (formerly MemGPT) is a stateful agent platform where memory lives as
  editable text blocks directly in the LLM system prompt, letting agents
  self-modify their context via tool calls rather than relying on external
  retrieval systems.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - repos/mirix-ai-mirix.md
  - repos/letta-ai-letta-code.md
  - repos/letta-ai-letta.md
  - repos/letta-ai-lettabot.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - agent-memory
  - episodic-memory
  - semantic-memory
  - graphiti
  - reflexion
  - zep
  - langgraph
  - graphrag
  - context-engineering
  - langgraph
last_compiled: '2026-04-07T11:42:05.733Z'
---
# Letta

**Type:** Project — Agent Memory / Agent Platform
**Also known as:** MemGPT (prior name)
**Language:** Python
**License:** Apache-2.0
**Stars:** ~21,900 (self-reported via GitHub)
**Repository:** github.com/letta-ai/letta

## What It Does

Letta is a full agent platform built around one architectural bet: memory should be part of the prompt the agent explicitly reads and edits, not an external system that injects context behind the scenes. Every agent gets a set of named text blocks compiled directly into its system prompt. The agent can call `core_memory_replace`, `rethink_memory`, and `archival_memory_insert` as first-class tools, modifying its own context mid-conversation.

This traces back to the MemGPT paper (arXiv:2310.08560), which framed LLMs as operating systems where the context window is RAM and external storage is disk. Memory management becomes a scheduling problem: the agent pages information between in-context blocks and external archival storage, creating the appearance of unlimited memory within a fixed window.

Letta is not a memory library. It ships a FastAPI REST server, multi-agent orchestration, tool execution, MCP support, Python and TypeScript SDKs, and a CLI tool (`letta`, installed via npm). The memory architecture is the core, but everything else is built around it.

## Core Mechanism

### Memory Blocks

The `Memory` class (`letta/schemas/memory.py`) holds a list of `Block` objects. Each block has a label (e.g., `"human"`, `"persona"`), a string value, and a character limit. The `Memory.compile()` method renders all blocks into XML-structured text injected into the system prompt at every LLM call, including metadata showing the agent its own memory usage:

```xml
<human>
  <metadata>chars_current=142, chars_limit=5000</metadata>
  <value>The user's name is Alice. She prefers dark mode.</value>
</human>
```

Blocks are individually persisted in PostgreSQL with unique IDs, so they survive process restarts and can be read or written by developers via the REST API without touching the agent directly.

### Self-Modifying Tools

The agent receives tools to edit its own blocks, defined in `letta/functions/function_sets/base.py`:

- **`core_memory_replace(label, old_content, new_content)`** — exact string replacement; raises `ValueError` if `old_content` is not found, forcing the agent to be precise
- **`core_memory_append(label, content)`** — appends with newline; simple but creates fragmentation over time
- **`rethink_memory(new_memory, target_block_label)`** — rewrites the entire block; the escape valve when fragmentation accumulates
- **`archival_memory_insert(content, tags)`** — moves information to vector-searchable long-term storage
- **`archival_memory_search(query, tags, top_k)`** — retrieves from archival storage back into the active step
- **`conversation_search(query, roles, limit, start_date, end_date)`** — hybrid search over conversation history

The `_rebuild_memory_async` method in `BaseAgent` refreshes block values from the database before each LLM call, ensuring the compiled system prompt reflects any out-of-band edits. A typical agent step runs: load history → compile memory blocks → LLM call with tools → if tool call, execute and loop → if `send_message`, return response → summarize if context nearing limit.

### Three Memory Tiers

**Core memory** — the editable blocks in the active system prompt. The agent's working memory, bounded by character limits per block.

**Recall memory** — the full conversation thread, persisted to PostgreSQL. Searchable via `conversation_search`, but not automatically in-context.

**Archival memory** — explicit long-term storage written via `archival_memory_insert`. The agent must call `archival_memory_search` to retrieve it; nothing promotes automatically.

### Context Window Management

Summarization triggers at 90% of the configured context window (`SUMMARIZATION_TRIGGER_MULTIPLIER = 0.9`). Two modes:

- **STATIC_MESSAGE_BUFFER** — evicts oldest messages; a background `EphemeralSummaryAgent` writes a summary to a `conversation_summary` block
- **PARTIAL_EVICT_MESSAGE_BUFFER** — evicts 30% of messages synchronously, inserting a recursive summary at position 1 in the message list

Max steps per request defaults to `DEFAULT_MAX_STEPS = 50`. Each step is one LLM call plus optional tool execution.

### Sleeptime Agents

The `SleeptimeMultiAgent` pattern (`letta/groups/sleeptime_multi_agent.py`) splits responsibility between a primary agent handling real-time conversation and a background agent that consolidates memory asynchronously. After every N messages (configured via `sleeptime_agent_frequency`), a daemon thread spawns the sleep agent with a recent transcript. The sleep agent has exclusive write access to memory blocks; the primary agent focuses on conversation. This keeps the primary interaction path fast and lets a stronger model (or more expensive compute) handle memory organization during idle time.

### Multi-Agent Orchestration

Built-in group types: `RoundRobinMultiAgent`, `DynamicMultiAgent`, `SupervisorMultiAgent`, `SleeptimeMultiAgent`. Communication via `send_message_to_agent_async` (fire-and-forget), `send_message_to_agent_and_wait_for_reply` (blocking), and `send_message_to_agents_matching_all_tags` (broadcast). Multiple agents can reference the same `Block` object by ID, enabling shared state without message passing.

## Key Numbers

- **GitHub stars:** ~21,900 (self-reported)
- **MemGPT DMR benchmark accuracy:** 93.4% — independently reported in the Zep paper (arXiv:2501.13956), making this the closest thing to a third-party validation
- **LongMemEval:** The Zep paper benchmarks Zep against MemGPT-style approaches; Letta itself does not publish LongMemEval scores
- **LLM calls per request:** typically 2–5+, because each tool call triggers another LLM call until `send_message` is invoked
- **Supported providers:** 17+, including OpenAI, Anthropic, Ollama, Google AI, Azure, Groq, vLLM, DeepSeek, OpenRouter

No benchmark scripts exist in the repository. Performance claims in documentation are self-reported.

## Strengths

**Transparent, inspectable memory.** The agent's entire learned state is readable text that developers and users can inspect and edit via the REST API. No opaque embeddings or graph structures — if you want to know what an agent knows, read its blocks.

**Genuine cross-session persistence.** Every agent maintains a single perpetual message thread. Memory changes made in one session are available in the next without any explicit save step. Most frameworks require you to wire this yourself.

**Self-modification is first-class.** The agent decides what to remember and how to organize it. This scales better than static extraction pipelines for domains where the relevant facts are hard to specify in advance.

**Complete platform.** REST API, SDKs, multi-agent orchestration, MCP support, and a CLI tool ship together. For teams building production agent systems, this reduces integration surface compared to assembling a stack from separate libraries.

**Model-agnostic.** Provider adapters handle tool-calling differences across 17+ LLM providers. You can run the same agent against Ollama locally and GPT-4o in production.

## Critical Limitations

**Concrete failure mode — block fragmentation.** Repeated `core_memory_append` calls accumulate stale information in blocks with no automatic cleanup. A block tracking user preferences might contain five versions of the same fact after a long conversation. The agent must proactively call `rethink_memory` to reorganize, and weaker models often don't. There is no garbage collection, no deduplication, no detection of redundant entries. Block quality degrades monotonically unless the agent or developer intervenes.

**Unspoken infrastructure assumption — PostgreSQL as bedrock.** Letta requires a running PostgreSQL instance. The ORM (`letta/orm/`) is built around SQLAlchemy with Postgres-specific features. Teams expecting SQLite or an embedded store for local or edge deployments will need to reconfigure or fork. The Docker deployment path assumes a managed database.

**No structured knowledge representation.** All memory is unstructured text in string blocks. For queries requiring relational reasoning ("What did Alice say about Bob last Tuesday?"), the agent must parse its own blocks on every turn. Compare to [Graphiti](../projects/graphiti.md)'s entity-relationship graph or [Zep](../projects/zep.md)'s temporal knowledge graph, which support structured queries natively.

**Character limits per block, no global budget.** Each block has its own character limit, but there is no global constraint across all blocks. An agent with many large blocks can still overflow the context window. The 90% summarization trigger is a safety margin, not a guarantee.

**Memory quality is model-quality-dependent.** Since the agent manages its own memory through tool calls, a weak model will produce poor block organization. The documentation acknowledges this and recommends stronger models for sleep-time agents, but this adds cost.

**Archival memory requires explicit retrieval.** Nothing automatically promotes relevant archival memories into context. If the agent doesn't call `archival_memory_search`, relevant information stays on disk. This requires the agent to have good retrieval instincts, which depends on prompt engineering and model capability.

## When NOT to Use It

**You need structured queries across a large knowledge base.** Letta's text blocks cannot answer "find all entities related to Alice with a confidence above 0.8." Use [Graphiti](../projects/graphiti.md) or [Zep](../projects/zep.md) for relational or temporal fact retrieval.

**You want memory without running a full agent platform.** If you need persistence for an existing agent stack without adopting Letta's server, SDKs, and agent runtime, [Mem0](../projects/mem0.md) is a lighter-weight memory layer.

**Your use case is simple RAG over static documents.** Letta's complexity buys you little if agents don't need to learn or adapt across sessions. A standard [RAG](../concepts/rag.md) pipeline with [LlamaIndex](../projects/llamaindex.md) or [LangChain](../projects/langchain.md) is simpler and cheaper.

**Low-latency requirements with weak models.** Each memory operation requires a full LLM call. A 2–5 call chain per user message adds 2–10 seconds at typical API latencies. If your deployment uses smaller/faster models to hit latency targets, those models may also produce poor memory management, compounding the problem.

**Edge or embedded deployments.** The PostgreSQL requirement and FastAPI server assume a server-side deployment. Standalone or local deployments require meaningful infrastructure work.

## Unresolved Questions

**Cost at scale.** The documentation does not report per-agent storage costs, per-message LLM call counts, or archival memory indexing overhead. For a system running thousands of concurrent agents with frequent memory consolidation, these costs are unknown without empirical measurement.

**Conflict resolution in shared blocks.** When multiple agents write to the same memory block concurrently, the last write wins. There is no documented merge strategy, versioning within blocks, or conflict detection. The git-backed memory mode (`letta/functions/function_sets/base.py`'s `memory()` multi-command tool) suggests versioning is in progress, but the production behavior under concurrent writes is not specified.

**Sleeptime agent shutdown.** Background sleeptime tasks run in daemon threads with their own event loops (`asyncio.new_event_loop()`). If the main process exits during consolidation, work in progress is lost silently. There is no graceful shutdown coordination documented.

**Summarization information loss.** The `EphemeralSummaryAgent` compresses conversation history with an LLM. The system cannot guarantee what information survives summarization. There are no checksums, importance weights, or post-summarization verification steps. Critical facts may be dropped without detection.

**Governance for hosted deployments.** The hosted Letta endpoint terms of service govern what happens to agent memory blocks stored there, but the documentation does not address data retention, deletion guarantees, or auditability requirements for regulated industries.

## Alternatives

| Alternative | Choose when |
|---|---|
| [Mem0](../projects/mem0.md) | You want automatic fact extraction into a memory layer without adopting a full agent runtime |
| [Zep](../projects/zep.md) | You need temporal reasoning over evolving facts, bi-temporal indexing, or structured entity queries |
| [Graphiti](../projects/graphiti.md) | You need a knowledge graph with relationship traversal and incremental community detection |
| [LangGraph](../projects/langgraph.md) | You want a general-purpose agent orchestration framework with state management but without opinionated memory semantics |
| [LangChain](../projects/langchain.md) | You need RAG over static documents without cross-session persistence requirements |

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader taxonomy Letta implements
- [Core Memory](../concepts/core-memory.md) — the specific in-prompt block mechanism
- [Context Engineering](../concepts/context-engineering.md) — the discipline of assembling optimal LLM context windows
- [Episodic Memory](../concepts/episodic-memory.md) — the cognitive science basis for recall memory
- [Semantic Memory](../concepts/semantic-memory.md) — the cognitive science basis for archival memory
- [Retrieval-Augmented Generation](../concepts/rag.md) — what Letta explicitly distinguishes itself from
- [Reflexion](../concepts/reflexion.md) — self-improvement via memory, a related pattern
- [Continual Learning](../concepts/continual-learning.md) — the framing Letta uses for cross-session memory updates
- [Context Window](../concepts/context-window.md) — the hard constraint all of Letta's architecture manages around

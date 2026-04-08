---
entity_id: agent-memory
type: concept
bucket: agent-memory
abstract: >-
  Agent memory gives AI agents persistent access to past information across
  interactions — spanning four types (episodic, semantic, procedural, core) —
  with the key challenge being what to store, when to retrieve it, and how to
  fit it into a finite context window.
sources:
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/mem0ai-mem0.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/agno-agi-dash.md
  - repos/aiming-lab-agent0.md
  - repos/infiniflow-ragflow.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/mem0ai-mem0.md
  - repos/supermemoryai-supermemory.md
  - repos/transformeroptimus-superagi.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
related:
  - retrieval-augmented-generation
  - context-engineering
  - openai
  - model-context-protocol
  - context-management
  - multi-agent-systems
  - claude-code
  - cursor
  - anthropic
  - claude
  - knowledge-graph
  - langchain
  - ace
  - vector-database
  - crewai
  - langgraph
  - chain-of-thought
  - openclaw
  - andrej-karpathy
last_compiled: '2026-04-08T22:58:52.898Z'
---
# Agent Memory

## What It Is

Every LLM operates on a fixed context window: a sequence of tokens that vanishes when the conversation ends. Agent memory is the set of mechanisms that work around this constraint, letting agents carry knowledge forward across sessions, tasks, and even agent boundaries.

The field converges on four types, drawn from cognitive psychology:

- **Episodic memory**: records of specific past events ("last Tuesday the user said X")
- **Semantic memory**: general facts and knowledge ("the user prefers Python, dislikes meetings")
- **Procedural memory**: how to do things — skills, workflows, strategies that worked before
- **Core memory**: a small, always-present identity layer that never leaves the context window

These types are not competing architectures. A production agent memory system typically combines all four, using different storage backends and retrieval strategies for each.

The formal framing from [Context Engineering](../concepts/context-engineering.md) research treats memory as one component of a larger optimization problem: given context C = A(c_instr, c_know, c_tools, **c_mem**, c_state, c_query), how do you fill c_mem to maximize task reward subject to the context window limit |C| ≤ L_max?

## Why It Matters

Without memory, agents re-ask questions the user already answered, repeat mistakes they made yesterday, and lose all context when a session ends. With memory, agents can personalize over weeks, compound learned strategies across runs, and coordinate state in multi-agent pipelines.

The performance gap is measurable. [Mem0](../projects/mem0.md) reports +26% accuracy over OpenAI Memory on the LOCOMO benchmark, 91% faster responses, and 90% fewer tokens compared to full-context approaches (self-reported, from arXiv:2504.19413 — not independently validated at time of writing). The token reduction is structurally sound: retrieving five targeted fact strings is cheaper than loading a 50-turn conversation history. The accuracy claim requires independent verification.

[Andrej Karpathy](../concepts/andrej-karpathy.md) has articulated this as a first-principles constraint: LLMs are stateless compute, and memory is the engineering layer that gives them continuity. Every serious agent framework now treats memory as a first-class architectural concern rather than an afterthought.

## How It Works

### Storage Backends

The four memory types map to different storage backends:

**In-context (working memory)**: The LLM's active context window. Fast, zero-latency, but ephemeral and expensive. This is where [Short-Term Memory](../concepts/short-term-memory.md) lives — conversation history, tool outputs, current reasoning state. Wiped at session end unless explicitly promoted.

**External vector stores**: Embeddings in databases like [ChromaDB](../projects/chromadb.md), [Pinecone](../projects/pinatone.md), [Qdrant](../projects/qdrant.md), or [FAISS](../projects/faiss.md). Supports semantic search — retrieve by meaning, not exact match. The standard backend for [Long-Term Memory](../concepts/long-term-memory.md) and episodic/semantic facts. [Vector Database](../concepts/vector-database.md) architecture underpins most production memory systems.

**Knowledge graphs**: [Neo4j](../projects/neo4j.md) or similar graph databases storing entity-relationship triples. Better than vector search for multi-hop queries ("who works with Alice who is connected to the project Bob mentioned?"). [Knowledge Graph](../concepts/knowledge-graph.md) approaches power [GraphRAG](../projects/graphrag.md), [Graphiti](../projects/graphiti.md), and the optional graph layer in Mem0.

**Relational/key-value stores**: [SQLite](../projects/sqlite.md), [PostgreSQL](../projects/postgresql.md), [Redis](../projects/redis.md) for structured data — user profiles, session metadata, audit logs. Fast for exact lookups; poor for semantic retrieval.

**Files and documents**: Markdown files like [CLAUDE.md](../concepts/claude-md.md), configuration files, code repositories. Persistent across restarts, human-readable, version-controllable. Used by [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and similar coding agents.

### The Extraction-Reconciliation Pipeline

The dominant pattern for populating semantic/episodic memory from conversations is a two-pass LLM pipeline, exemplified by Mem0's implementation (`mem0/memory/main.py`):

**Pass 1 — Extraction**: An LLM receives the conversation with a prompt like `USER_MEMORY_EXTRACTION_PROMPT` and returns atomic facts as JSON: `{"facts": ["Prefers Python", "Works at Google", "Has a dog named Max"]}`. The extraction prompt is the most critical component — it determines what gets remembered.

**Pass 2 — Reconciliation**: Each extracted fact is embedded and searched against existing memories (top-5 nearest neighbors). All retrieved memories plus new facts go to a second LLM call that decides: ADD (new fact), UPDATE (modify existing), DELETE (fact contradicts existing), or NONE. Mem0 maps real UUIDs to sequential integers before this call to prevent UUID hallucination — a practical detail that matters.

This pattern costs at minimum two LLM calls per `add()` operation, plus one embedding call per extracted fact. With graph memory enabled, add three more LLM calls for entity extraction, relation establishment, and deletion checking.

### Retrieval Patterns

**Semantic search**: Embed the query, find nearest neighbors by cosine similarity. Standard and fast, but misses relational structure. Most vector databases support this natively.

**Hybrid search**: Combine semantic similarity with keyword matching ([BM25](../concepts/bm25.md)). Generally outperforms pure semantic search on diverse query types. [Hybrid Search](../concepts/hybrid-search.md) is increasingly the default in production systems.

**Graph traversal**: Start from retrieved entities, traverse relationships. Better for multi-hop questions. [HippoRAG](../projects/hipporag.md) and [Graphiti](../projects/graphiti.md) specialize here.

**Agentic RAG**: The agent decides dynamically when to retrieve and what to query. Slower and more expensive than static retrieval, but handles cases where the agent doesn't know what it doesn't know.

### The Retrieval-Augmented Generation Connection

Agent memory is inseparable from [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md). RAG is the mechanism by which stored memories re-enter the context window at inference time. The distinction: RAG typically retrieves from static corpora (documents, knowledge bases); agent memory retrieves from dynamic, continuously-updated personal stores. [Agentic RAG](../concepts/agentic-rag.md) blurs this further — agents that adaptively query multiple memory stores during reasoning.

### Memory in Multi-Agent Systems

[Multi-Agent Systems](../concepts/multi-agent-systems.md) introduce coordination problems. Each agent has its own context window. Shared memory requires explicit coordination: which agent writes to shared state, how conflicts resolve, how an orchestrator shares relevant context with subagents without blowing up their context budgets.

[LangGraph](../projects/langgraph.md), [CrewAI](../projects/crewai.md), and [AutoGen](../projects/autogen.md) each handle this differently. LangGraph exposes a shared state graph that all nodes read and write. CrewAI passes structured task outputs between agents. AutoGen uses a shared message history. None fully solves the [Context Management](../concepts/context-management.md) problem in deep hierarchies.

### Procedural Memory and Self-Improvement

[Procedural Memory](../concepts/procedural-memory.md) is the mechanism that turns past successes into reusable skills. The [ACE](../projects/ace.md) framework implements this through a **Skillbook**: a persistent collection of strategies that a Reflector extracts from execution traces, and that agents retrieve at inference time. The ACE architecture uses three roles — Agent, Reflector, SkillManager — with a Recursive Reflector that writes and executes Python to programmatically search traces for patterns rather than summarizing them in a single pass.

This connects to the broader [Self-Improving Agents](../concepts/self-improving-agents.md) pattern and [Reflexion](../concepts/reflexion.md), where agents reason about their own failures to produce better future behavior. The key finding from Meta-Harness research: full execution trace access produces 50.0 accuracy vs 34.6 with summaries. Compressed feedback destroys the causal signal needed to understand *why* something failed.

[Voyager](../projects/voyager.md) demonstrates this for open-world tasks: a skill library populated with verified programs that compound into increasingly complex behaviors. [Agent Workflow Memory](../projects/agent-workflow-memory.md) does the same for workflow-level patterns.

## Implementation Landscape

| System | Primary Focus | Storage | Key Differentiator |
|--------|--------------|---------|-------------------|
| [Mem0](../projects/mem0.md) | Semantic/episodic, personalization | Vector + optional graph | Two-pass LLM pipeline, 23 vector backends |
| [Letta](../projects/letta.md) / [MemGPT](../projects/memgpt.md) | Agent-managed context | Tiered (in-context + archival) | Agent explicitly calls memory tools |
| [Zep](../projects/zep.md) | Temporal knowledge graph | Neo4j | Bi-temporal edges, entity resolution |
| [Graphiti](../projects/graphiti.md) | Graph-first memory | Neo4j | 4-5 LLM calls/episode, contradiction resolution |
| [LangChain](../projects/langchain.md) | General-purpose | Pluggable | Integration hub, not opinionated on storage |
| ACE | Procedural/skill memory | Skillbook (YAML/JSON) | Recursive Reflector, no vector DB required |

### How Claude and GPT Use Memory

[Claude](../projects/claude.md) and [Anthropic](../projects/anthropic.md)'s systems use [Core Memory](../concepts/core-memory.md) patterns — a small persistent block in the system prompt — plus file-based memory in agentic contexts like [Claude Code](../projects/claude-code.md), where `CLAUDE.md` serves as a project-level semantic memory. [OpenAI](../projects/openai.md) offers built-in memory in ChatGPT, externally controllable via the API. [Model Context Protocol](../concepts/model-context-protocol.md) enables any MCP-compatible client to connect to memory servers, including Mem0's MCP integration.

## Failure Modes

**Silent data loss from LLM JSON fragility**: The reconciliation step requires valid JSON output. If the model produces malformed output, `new_memories_with_actions = {}` and the entire add operation silently produces nothing. Mem0 has multiple fallback layers (strip markdown fences, regex extraction) but no retry. Check your logs.

**Lost in the middle**: Retrieval succeeds but the model ignores the retrieved memory because it appears in the middle of a long context. [Lost in the Middle](../concepts/lost-in-the-middle.md) research shows LLMs attend most to context at the beginning and end of the window. Memory injection position matters.

**Context window competition**: As you add more memory types (semantic, episodic, procedural, plus tool definitions and system prompt), they compete for the same finite context budget. Systems that don't actively manage this budget end up with diluted, low-relevance context.

**Unbounded growth**: Without compaction, pruning, or summarization, vector stores grow monotonically. Retrieval quality degrades as the collection grows and near-duplicates accumulate. Mem0 has no automatic compaction.

**Concurrency races**: Multiple concurrent `add()` calls for the same user can race — both read existing memories, both decide to ADD, producing duplicates. Vector store operations are not transactional. Mem0 has no locking beyond SQLite thread locks for history writes.

**Temporal confusion**: Semantic memory stores facts without timestamps by default. "Alice works at Google" stored two years ago, plus "Alice works at Anthropic" stored today, creates a contradiction the retrieval system may not resolve correctly without explicit [Temporal Reasoning](../concepts/temporal-reasoning.md) support. Graphiti's bi-temporal model specifically addresses this; most other systems don't.

**Compression destroys causal signal**: Summarizing execution traces before feeding them to an optimizer or reflector loses the specific failures needed to understand root causes. The Meta-Harness ablation is definitive: full trace access achieves 50.0% accuracy, compressed summaries achieve 34.9%. Provide full traces to any reflection or improvement mechanism.

## Practical Implications

**Retrieval quality beats context stuffing**. The context engineering research confirms the asymmetry: LLMs comprehend complex contexts better than they generate equally complex outputs. Invest in high-quality retrieval (hybrid search, reranking) rather than naively loading all available memory.

**The extraction prompt is your most important hyperparameter**. In LLM-pipeline memory systems, what gets stored is entirely determined by the extraction prompt. Test it carefully against real conversations. Swap models for the extraction call if your primary model is expensive.

**Match storage to memory type**. Episodic facts (semantic similarity retrieval) → vector store. Relational facts (multi-hop queries) → knowledge graph. Procedural patterns (structured retrieval by task type) → skills database or YAML. Session state (fast key-value access) → Redis or in-memory dict. Don't use a vector database for everything.

**Design for memory replacement**. Memory system architectures are evolving quickly. The best practice today (flat vector storage with metadata filtering) may be supplanted by graph-first or tiered approaches. Build clean interfaces between your agent logic and memory storage so you can swap backends.

**Multi-agent memory needs explicit governance**. Shared memory across agents creates write conflicts and context pollution. Define clear ownership: which agent writes to which memory scope, what the promotion rules are from session to user to organizational memory, and who cleans up stale entries.

## When NOT to Use Agent Memory

**Single-turn tasks**: If your agent handles fully self-contained requests with no cross-session state (e.g., a one-shot code generation API), the overhead of extraction, reconciliation, and retrieval adds latency and cost with no benefit.

**When accuracy is safety-critical**: LLM-based extraction introduces non-determinism and silent failures. If incorrect memory injection could cause harmful decisions (medical advice, financial decisions), either skip automated extraction or add a human review layer.

**Small, bounded knowledge**: If the total relevant knowledge fits comfortably in a single context window, just load it all. RAG and memory retrieval add complexity and risk dropping relevant context. Selective retrieval wins when the knowledge base is larger than the context window.

**When you need auditability**: Automatic extraction pipelines make it hard to explain why a specific memory exists or why a decision was made. For compliance-sensitive contexts, prefer explicit, user-controlled memory writes over automatic extraction.

## Unresolved Questions

**Evaluation remains immature**. [LongMemEval](../projects/longmemeval.md) and LOCOMO test fact retrieval. They do not adequately test multi-session synthesis, temporal reasoning, or procedural skill transfer — the capabilities that most differentiate sophisticated memory systems. Benchmark results are hard to compare across systems.

**Graph vs. vector for production**: The field has not settled on when knowledge graph memory (Graphiti, Zep) outperforms flat vector memory (Mem0) enough to justify 4-5x the LLM calls per ingestion. The answer likely depends on query type and knowledge structure, but clean comparative studies are scarce.

**Cost at scale**: A system making 2-5 LLM calls per `add()` operation works fine for a personal assistant with 10 conversations per day. At 10,000 users and 100 messages per session, the economics change. Batch processing, async ingestion, and cheaper extraction models are practical mitigations, but few systems expose clear cost modeling.

**Conflict resolution across agents**: When two agents write contradictory facts to a shared memory store, no standard resolution protocol exists. Most systems either last-write-wins or accumulate contradictions silently.

## Related Concepts

- [Episodic Memory](../concepts/episodic-memory.md) — specific event records
- [Semantic Memory](../concepts/semantic-memory.md) — general facts and knowledge
- [Procedural Memory](../concepts/procedural-memory.md) — skills and workflows
- [Core Memory](../concepts/core-memory.md) — always-present identity context
- [Long-Term Memory](../concepts/long-term-memory.md) — persistent cross-session storage
- [Short-Term Memory](../concepts/short-term-memory.md) — in-context working memory
- [Context Engineering](../concepts/context-engineering.md) — the broader discipline
- [Context Management](../concepts/context-management.md) — budget and compression strategies
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — retrieval mechanism
- [Vector Database](../concepts/vector-database.md) — primary storage backend
- [Knowledge Graph](../concepts/knowledge-graph.md) — relational storage backend
- [Self-Improving Agents](../concepts/self-improving-agents.md) — memory-driven improvement loops
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — shared memory coordination

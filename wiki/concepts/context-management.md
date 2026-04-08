---
entity_id: context-management
type: concept
bucket: context-engineering
abstract: >-
  Context management governs what information occupies an agent's context window
  at each step, trading off completeness against token cost, retrieval latency,
  and model attention quality.
sources:
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - repos/aiming-lab-simplemem.md
  - repos/helloruru-claude-memory-engine.md
  - repos/transformeroptimus-superagi.md
  - repos/martian-engineering-lossless-claw.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/thedotmack-claude-mem.md
  - repos/laurian-context-compression-experiments-2508.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/martian-engineering-lossless-claw.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
related:
  - retrieval-augmented-generation
  - claude-code
  - agent-memory
  - long-term-memory
  - vector-database
  - openclaw
  - anthropic
  - context-engineering
  - claude-md
  - ace
  - context-compression
  - short-term-memory
  - episodic-memory
  - claude
  - model-context-protocol
  - knowledge-graph
  - react
  - ace
  - context-compression
  - short-term-memory
last_compiled: '2026-04-08T02:47:34.141Z'
---
# Context Management

Context management is the set of decisions, mechanisms, and systems that determine what information an LLM agent can see at any given moment. Every agent operates within a fixed context window. Context management is the discipline of filling that window with the right content.

The problem is harder than it appears. Raw insertion (dump everything into context) fails at scale: token costs grow linearly, model attention degrades on long sequences, and irrelevant content crowds out relevant content. Pure retrieval (search for what you need) fails on unknown unknowns: you cannot query for information you don't know you need. Good context management navigates between these failure modes.

## Why It Matters

The context window is the agent's working memory. Everything the agent knows for a given response must pass through it. This creates a hard constraint with cascading effects:

- **Cost**: Every token in context costs money at inference time.
- **Quality**: Models attend unevenly across long contexts. The [Lost in the Middle](../concepts/lost-in-the-middle.md) phenomenon documents that models reliably underweight information positioned in the middle of long sequences, favoring content near the beginning and end.
- **Latency**: Larger contexts increase time-to-first-token.
- **Scope**: Agents with poor context management forget decisions, repeat work, and contradict themselves across sessions.

[Context Engineering](../concepts/context-engineering.md) treats context management as a first-class engineering discipline rather than a configuration afterthought.

## The Fundamental Tradeoffs

Three tensions structure every context management decision:

**Completeness vs. cost.** Including more information reduces the chance of missing something relevant. It also increases token spend quadratically for attention and linearly for billing. Most systems need an explicit policy on what to exclude.

**Recall vs. unknown unknowns.** Search-based retrieval ([Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)) works well when agents know what to retrieve. It fails for implicit connections — decisions made three weeks ago that bear on today's task but share no keywords with today's query. The hipocampus MemAware benchmark quantifies this: BM25 search scores 2.8% on implicit context retrieval, barely above the 0.8% baseline of no memory at all.

**Freshness vs. depth.** Recent context is often most relevant, but important context may be old. Systems that protect only recent messages risk losing critical earlier decisions. Systems that weight older content equally pay token costs for potentially stale information.

## Core Mechanisms

### Static Inclusion

The simplest strategy: put fixed content in the system prompt and context every time. [CLAUDE.md](../concepts/claude-md.md) files exemplify this — project instructions, conventions, and persistent facts get loaded at session start regardless of the current task. [Progressive Disclosure](../concepts/progressive-disclosure.md) extends this by organizing static content hierarchically, loading more detail only when the task requires it.

Static inclusion works well for stable, high-value information (project conventions, user preferences, tool schemas). It fails when the information set is too large to fit, or when most of the included content is irrelevant to any given query.

### Retrieval-Based Augmentation

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) dynamically pulls relevant content at query time. The agent formulates a search query (implicitly or explicitly), a retrieval system finds matching passages, and those passages get injected into context. [Vector Database](../concepts/vector-database.md) systems handle semantic similarity; [BM25](../concepts/bm25.md) handles keyword matching; [Hybrid Search](../concepts/hybrid-search.md) combines both.

RAG's core limitation is query dependency. The retrieval system can only surface what the agent asks for. Hipocampus's benchmark demonstrates this structurally: on hard cross-domain questions (zero keyword overlap between query and relevant memory), hybrid search scores 0.7% — below the performance of no memory system at all, because search overhead costs tokens without returning relevant results.

### Hierarchical Summarization

Instead of choosing between full content and search, hierarchical systems maintain the full information at multiple levels of abstraction simultaneously. Lossless-claw ([OpenClaw](../projects/openclaw.md) plugin) constructs a DAG where leaf nodes summarize raw messages, higher nodes summarize leaf nodes, and agents can traverse from abstract to concrete when they need detail. The assembler fills the context window with summary nodes at the appropriate abstraction level plus a protected "fresh tail" of recent raw messages.

This approach addresses both the completeness problem (everything is accessible via tree traversal) and the cost problem (high-level summaries consume far fewer tokens than raw content). The [Context Compression](../concepts/context-compression.md) that creates summaries is inherently lossy, but the access path back to original content is preserved.

The OOLONG benchmark compares lossless-claw's approach against sliding-window compaction: at 256K context length, the DAG approach outperforms sliding-window by +10 points; at 512K context length, the gap widens to +12.6 points. These numbers are self-reported by Martian Engineering.

### Topic Indexing

A lightweight alternative to full hierarchical summarization: maintain a compact index of what information exists, without storing the information itself in context. Hipocampus's ROOT.md is a 3K-token topic index that lists every subject the agent has ever encountered with metadata (type, age, pointer to detail). Every session loads ROOT.md, giving the agent O(1) awareness of its full knowledge surface without paying to load the knowledge itself.

The benchmark impact is substantial. Adding ROOT.md to vector search improves implicit context retrieval from 17.3% to 21.0% overall and from 26% to 34% on easy questions. The mechanism: the agent sees that "rate limiting" exists as a topic before deciding whether to search for it, enabling connections that query-first approaches cannot make.

### Sliding Window with Eviction

The most common production approach: maintain a fixed-size buffer of recent messages, evict the oldest when the buffer overflows. Simple to implement, predictable in token consumption, and adequate when recent history is sufficient for the task.

Sliding windows fail catastrophically for long-running tasks. A context decision made early in a session disappears when it slides out of the window. The agent has no knowledge of its own forgetting — it cannot flag uncertainty about whether relevant earlier context exists.

### Self-Modifying Memory Blocks

[Letta](../projects/letta.md) (formerly MemGPT) takes a different approach: memory is literally part of the prompt, and agents can edit it via tool calls (`core_memory_replace`, `rethink_memory`, `archival_memory_insert`). The agent decides what to remember, how to organize it, and when to retrieve additional context from archival storage.

This makes context management a first-class agent capability rather than an external system. The agent can notice that its "human" block contains outdated preferences and update them mid-conversation. The tradeoff: every memory modification requires an LLM call (the agent must reason about what to change), memory quality depends on the agent's own reasoning capability, and memory is bounded by character limits rather than information-theoretic relevance.

The MemGPT paper demonstrates this achieves 93.4% accuracy on fact retrieval benchmarks, competitive with knowledge graph approaches. The Zep/Graphiti approach scores 94.8% on the same benchmark — marginally better, but the self-modifying approach has different failure modes (it can rewrite correct memories incorrectly) versus knowledge graph approaches (they can fail to extract relationships).

## Eviction and Compaction Strategies

When context overflows, systems must decide what to evict. The main options:

**Oldest-first**: Evict the messages furthest from now. Simple, predictable, wrong for long tasks where early decisions matter.

**Importance-weighted**: Tag messages by importance at ingestion time, evict low-importance content first. Requires accurate importance estimation at write time, before the agent knows what future tasks will need it for.

**Summarize-then-evict**: Before evicting content, summarize it. The summary enters context in place of the original. Information is lost (summaries are lossy), but the semantic gist survives. Lossless-claw's escalation strategy runs: normal summarization → aggressive summarization (tighter prompt, lower temperature) → deterministic truncation fallback. The fallback guarantees compaction always makes progress even if the LLM fails.

**Fresh-tail protection**: Reserve a portion of the context window for the most recent messages unconditionally, fill the rest with summary/retrieved content. Lossless-claw defaults to protecting the last 64 raw messages. Hipocampus protects the current session's active work (SCRATCHPAD.md, WORKING.md) at the hot tier.

[ACE](../projects/ace.md) (Agentic Context Engineering) identifies a failure mode it calls "context collapse": when LLMs iteratively summarize their own context, each rewrite applies brevity bias, and information degrades across rounds. After 5-10 iterations, the context converges to generic instructions stripped of domain-specific knowledge. ACE's solution: incremental delta updates (append bullets with metadata counters) merged by deterministic logic, never by LLM rewriting. Experimental results show this achieves 82-92% cost reduction versus alternatives while improving task performance by +10.6% on agent benchmarks. These figures are self-reported by the ACE paper authors.

## Context Assembly

Context assembly is the process of constructing the exact message array that gets sent to the model at each turn. Assembly must:

1. Stay within the token budget
2. Maintain structural validity (e.g., every `tool_result` must follow a `tool_use` in Anthropic's API)
3. Normalize content format across message types
4. Order content to maximize model attention on high-value information (given Lost in the Middle effects, critical content belongs at the beginning or end, not the middle)

Lossless-claw's assembler (`src/assembler.ts`) handles this explicitly: fetch context items ordered by position, split into evictable prefix and protected fresh tail, fill remaining budget from oldest-to-newest in the evictable set, normalize assistant content to array blocks, sanitize tool-use/result pairing. The fresh tail is always included even if over budget.

[Model Context Protocol](../concepts/model-context-protocol.md) standardizes how tools and context sources provide content, separating the production of context from its assembly.

## Dynamic Prompt Injection

Context management is not limited to conversation history. The system prompt itself can be dynamically adjusted based on the current context state. Lossless-claw injects a confidence calibration into the system prompt based on compression depth: when the agent is operating from lightly compressed context, it gets gentle guidance; when operating from deeply compressed context (depth ≥ 2 or multiple condensed summaries), it receives an explicit uncertainty checklist. The prompt tells the agent to expand summaries or express uncertainty before making specific factual claims.

This pattern — the system knowing its own compression state and adjusting its prompting accordingly — is novel. It treats the agent's epistemic position as a runtime variable that should influence its behavior.

## Multi-Agent Context Coordination

In [Multi-Agent Systems](../concepts/multi-agent-systems.md), context management extends to coordination between agents. Several patterns emerge:

**Shared memory blocks** (Letta): Multiple agents read and write the same memory blocks. Useful for collaborative knowledge building but requires coordination to prevent conflicts.

**Sleeptime agents**: A dedicated background agent consolidates and reorganizes context during idle periods, without blocking the primary agent's conversation. The primary agent maintains fast response times; the sleeptime agent handles expensive memory consolidation.

**Scoped sub-agents** (lossless-claw): When an agent needs to recover detail from a compressed summary, it spawns a sub-agent with a scoped delegation grant (TTL, token cap, conversation scope). The sub-agent traverses the summary DAG, retrieves the needed information, and returns a focused answer (≤2000 tokens by default). The scope constraint prevents recursive sub-agent spawning.

**Context partitioning**: Each agent in a multi-agent system maintains its own context, with explicit handoff at agent boundaries. [ReAct](../concepts/react.md)-based agents pass observations through structured formats rather than sharing raw context.

## Production Failure Modes

**Unknown unknown blindness**: Search-only systems cannot surface context the agent doesn't know to search for. The MemAware benchmark quantifies this at 2.8% recall for BM25 search on implicit context — barely above the 0.8% baseline. Systems serving long-running tasks need a topic index or structural overview in context to make unknown unknowns discoverable.

**Retrieval formatting bugs**: Content can survive storage perfectly and be inaccessible due to formatting normalization applied between storage and retrieval. Three consecutive normalization layers that each strip one content type create a system with "perfect memory storage and zero memory retrieval." End-to-end retrieval testing is necessary — testing storage and retrieval separately is not sufficient.

**Context collapse**: Repeated LLM summarization of LLM summaries converges to generic content. ACE's paper demonstrates this occurs within 5-10 iterations. Any system that asks an LLM to rewrite its own context incrementally is at risk.

**Token estimation mismatch**: Systems that estimate tokens from character count (`chars/4`) as a rough heuristic can significantly miscalculate actual token counts, especially for code (low characters-per-token) or CJK text (many characters, fewer tokens). Context windows can overflow or underutilize their budget.

**Compaction stall**: If the summarization model's credentials expire or requests time out, compaction stalls and context grows unbounded. Systems need a deterministic fallback (truncation) that guarantees progress regardless of LLM availability.

**Fresh tail vs. summary budget tension**: A large fresh tail (many protected recent messages) leaves little context budget for summaries of older content. A small fresh tail compresses recent content aggressively but preserves more historical summary. The right balance is task-dependent: long-running sessions with important early decisions need more summary budget; short interactive sessions need more fresh context.

## Implementation Approaches

| Approach | Best For | Fails When |
|---|---|---|
| Static system prompt | Stable, always-relevant facts | Information set too large or too variable |
| Sliding window | Short interactive sessions | Early decisions matter to later tasks |
| RAG | Known retrieval targets | Implicit connections, cross-domain queries |
| Hierarchical summarization | Long-running sessions, indefinite history | High compaction cost, latency requirements |
| Topic index (ROOT.md) | Bridging search and unknown unknowns | Topics not captured at write time |
| Self-modifying blocks | Agent-controlled memory, continual learning | Weak base models, high call counts |

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): The broader discipline of which context management is a core component
- [Context Compression](../concepts/context-compression.md): Techniques for reducing token count while preserving information
- [Short-Term Memory](../concepts/short-term-memory.md): In-context working memory
- [Long-Term Memory](../concepts/long-term-memory.md): Persistent storage across sessions
- [Episodic Memory](../concepts/episodic-memory.md): Session-level memory of past interactions
- [Agent Memory](../concepts/agent-memory.md): The broader memory taxonomy
- [Lost in the Middle](../concepts/lost-in-the-middle.md): The attention distribution problem context management must account for
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): The retrieval-based approach to context augmentation
- [Vector Database](../concepts/vector-database.md): Infrastructure for semantic retrieval
- [Knowledge Graph](../concepts/knowledge-graph.md): Structured alternative to vector retrieval

## Implementations

- [Claude Code](../projects/claude-code.md): Uses CLAUDE.md for static context, tool results for dynamic context
- [OpenClaw](../projects/openclaw.md): ContextEngine plugin system enabling pluggable context management strategies
- [Letta](../projects/letta.md): Self-modifying memory blocks as first-class agent capability
- [ACE](../projects/ace.md): Incremental delta updates to prevent context collapse
- [MemGPT](../projects/memgpt.md): Original virtual context management paper and system
- [Mem0](../projects/mem0.md): Automatic fact extraction and retrieval
- [Graphiti](../projects/graphiti.md): Knowledge graph-based context management with temporal reasoning

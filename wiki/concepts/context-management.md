---
entity_id: context-management
type: concept
bucket: context-engineering
abstract: >-
  Context management encompasses strategies for controlling what LLM agents see
  in their active context window — compression, prioritization, retrieval, and
  pollution prevention — as the primary bottleneck determining agent capability
  at scale.
sources:
  - articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/martian-engineering-lossless-claw.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - repos/aiming-lab-simplemem.md
  - repos/helloruru-claude-memory-engine.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/laurian-context-compression-experiments-2508.md
  - repos/martian-engineering-lossless-claw.md
  - repos/thedotmack-claude-mem.md
  - repos/transformeroptimus-superagi.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
related:
  - retrieval-augmented-generation
  - claude-code
  - agent-memory
  - long-term-memory
  - vector-database
  - context-compression
  - openclaw
  - anthropic
  - claude
  - context-engineering
  - claude-md
  - ace
  - short-term-memory
  - token-efficiency
  - episodic-memory
last_compiled: '2026-04-08T23:04:38.529Z'
---
# Context Management

## What It Is

Context management refers to the collection of strategies and systems for controlling the contents of an LLM's active context window across a session. Because LLMs can only attend to what is currently in their context, every decision about what to include, exclude, compress, or retrieve is a decision about what the agent can reason about.

The context window is finite. Modern models range from 8K tokens (smaller local models) to 1M tokens (Gemini). But even 1M tokens is bounded, and cost scales with context length, and attention quality degrades as context grows. [Lost in the Middle](../concepts/lost-in-the-middle.md) research shows that LLMs systematically underweight information in the middle of long contexts, favoring content near the beginning and end — meaning a larger context window does not mean better utilization of everything in it.

Context management is distinct from [Agent Memory](../concepts/agent-memory.md) in that memory refers to what an agent knows, while context management refers to what an agent sees during a specific inference call. Memory systems feed context management systems; context management systems determine which memories surface and when.

## Why It Matters

An agent running a multi-hour coding session accumulates conversation turns, tool outputs, file contents, error messages, and intermediate results. Without active management, the context window fills with stale information until the session either crashes (hitting the token limit) or degrades (older relevant decisions get pushed out by newer irrelevant noise).

The failure modes are asymmetric: too little context and the agent loses track of prior decisions; too much context and the agent either exceeds limits or attends poorly to what matters. Neither failure is obvious to the user — the agent may continue producing responses that look plausible while missing constraints established earlier in the session.

[Andrej Karpathy](../concepts/andrej-karpathy.md) observed that LLM-maintained markdown wikis can match RAG at small-to-medium scales (his example: ~100 articles, ~400K words) while creating a feedback loop where queries automatically enhance the knowledge base. The key insight: at small scale, structured context beats unstructured retrieval because the agent can understand its own knowledge topology without a query interface.

The [ACE](../projects/ace.md) paper quantifies what happens without careful management: LLMs asked to iteratively rewrite their own context converge to generic instructions after 5-10 rounds, losing all task-specific knowledge. They call this context collapse — brevity bias causing progressive information loss through summarization.

## Core Problems

**Context overflow.** Sessions eventually exceed the context window. The naive solution — sliding window truncation — discards the oldest content, which is often the most important: original goals, early decisions, established constraints.

**Context pollution.** Irrelevant content displacing relevant content. A 50K token tool output injected into context for one query crowds out everything else. Tool results, error logs, and intermediate file contents all compete for the same finite space.

**Context fragmentation.** Relevant information spread across many separate locations that never get assembled together. An agent might have the answer to a user's question distributed across three earlier tool outputs and one conversation turn, but never synthesize them because they are not co-located in context.

**Unknown unknowns.** The agent doesn't know what it doesn't know. Search-based retrieval requires a query, which requires suspecting that relevant context exists. The hipocampus benchmark demonstrates this starkly: BM25 search scores 2.8% on implicit context questions, barely better than no memory at 0.8%. The agent making an API endpoint refactoring doesn't search for "rate limiting" because the user asked about "payment flow" — the connection doesn't surface from either query.

**Compression quality.** When context must be compressed, what gets lost? LLM summarization applies brevity bias, collapsing "always check the decimals attribute before the scale attribute because European filings use different decimal conventions" into "parse financial filings carefully." The specific action becomes a vague reminder.

## Implementation Approaches

### Sliding Window Truncation

The simplest approach: drop the oldest messages when the context fills. Used as the default in most frameworks. Easy to implement, zero additional cost. Catastrophically loses early session context — the first messages often contain the most important information (goals, constraints, user preferences).

### Hierarchical Summarization (DAG-Based)

[OpenClaw](../projects/openclaw.md) with the lossless-claw plugin replaces sliding window with a directed acyclic graph of summaries at increasing abstraction levels. Leaf summaries (depth 0) compress raw messages. Condensed summaries (depth 1+) compress summaries. The source files (`src/engine.ts`, `src/compaction.ts`, `src/assembler.ts`) implement a three-level escalation: normal summarization, aggressive summarization with tighter prompts, and deterministic truncation as a fallback that always makes progress even if the LLM fails.

The critical design choice: immutable source storage in SQLite, with derived summary views in the active context. Nothing is discarded — the DAG creates access paths back to original content via `lcm_expand_query`, which spawns a sub-agent to recover specific detail on demand. On the OOLONG benchmark, this approach outperforms Claude Code's default context management by +4.5 points average, widening to +12.6 points at 512K context lengths (self-reported, Voltropy).

### Incremental Delta Updates

[ACE](../projects/ace.md) prevents context collapse by replacing full context rewrites with small bullet-point deltas. The curator component merges deltas using deterministic logic — not LLM rewriting — which prevents the brevity bias from progressively eroding information. Each bullet carries a unique identifier plus helpful/harmful counters tracking which knowledge was associated with successful vs. failed executions.

The three-component architecture separates concerns cleanly: the generator produces execution traces, the reflector extracts lessons, and the curator merges them deterministically. This achieves 82-92% cost reduction compared to full-rewrite approaches (self-reported, ACE paper), with +10.6% improvement on agent benchmarks.

### Prompt-Resident Editable Blocks

[Letta](../projects/letta.md) (formerly MemGPT) makes memory literally part of the system prompt as editable text blocks. The `Memory` class (`letta/schemas/memory.py`) holds `Block` objects — labeled sections with character limits that the agent can modify via tools like `core_memory_replace`, `core_memory_append`, and `rethink_memory`. The compiled blocks are injected into the system prompt as XML, including character count and limit metadata so the agent understands its own space constraints.

This approach gives the agent full transparency into its memory state and explicit control over modifications. The tradeoff: memory is bounded by character limits (not information relevance), and every modification requires an LLM call because the agent must reason about what to change. A session with frequent memory updates pays multiple LLM calls per user turn.

The sleeptime pattern addresses this by offloading memory consolidation to a background agent that runs asynchronously during idle periods — one agent handles real-time conversation, a separate sleep-time agent reorganizes and consolidates memory between interactions.

### Hierarchical Topic Indexing

Hipocampus maintains a lightweight topic index (`ROOT.md`, approximately 3K tokens) that compresses the entire conversation history into a scannable overview — automatically loaded into every session. Each topic entry includes type (`project`, `feedback`, `user`, `reference`) and age, so the agent knows both what it knows and how fresh that knowledge is.

The benchmark result: 21x better performance on cross-domain implicit context questions compared to no memory, and 5x better than search alone. The key insight is that this solves the unknown unknowns problem — the agent sees all past topics at zero search cost, enabling connections that require no query formulation to discover.

A 3-tier structure backs the index: hot files (ROOT.md plus active work state, always loaded), warm files (daily logs and curated knowledge, read on demand), and cold storage (full history accessible via search or compaction tree traversal). Compaction follows a raw → daily → weekly → monthly → root hierarchy, with verbatim copy below size thresholds and LLM summarization above them.

### [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)

The dominant production approach: store content in a [Vector Database](../concepts/vector-database.md), retrieve semantically relevant chunks at query time, inject them into context. Works well when the user knows (roughly) what they need and formulates queries that surface it. Fails on implicit context — the unknown unknowns problem above. Also requires infrastructure ([ChromaDB](../projects/chromadb.md), [Pinecone](../projects/pinatone.md), [Qdrant](../projects/qdrant.md), [FAISS](../projects/faiss.md)) and adds retrieval latency to every inference call.

RAG is not context management per se — it is a retrieval mechanism that feeds context management. The distinction matters: RAG determines what can be retrieved; context management determines what actually goes into the context window given everything that could go there.

### [Context Compression](../concepts/context-compression.md)

Explicit compression strategies that reduce token count before insertion. Approaches include extractive compression (select the most relevant sentences), abstractive compression (LLM-generated summaries), selective attention (route only relevant sections to each agent in multi-agent systems), and structural compression (replace verbose formats with compact equivalents — JSON to CSV, HTML to Markdown).

[Token Efficiency](../concepts/token-efficiency.md) engineering applies before compression: prefer compact formats, avoid redundant prefixes, use structured data where prose would be verbose.

## Key Design Tradeoffs

**Lossless access vs. token cost.** Maintaining lossless access (every original message stored and recoverable) costs storage and adds retrieval latency. Lossy compression (summarization, truncation) reduces storage and is zero-latency but loses information permanently. The lossless-claw approach attempts the best of both: lossless storage, lossy active context, with recovery paths via sub-agent expansion.

**Deterministic vs. model-driven management.** Letting the LLM manage its own context (Letta's self-editing blocks, MemGPT's virtual context) gives the agent flexibility and self-awareness but introduces unreliability — weak models fail to maintain block hygiene, and all models exhibit brevity bias when summarizing. Deterministic management (ACE's non-LLM merge logic, lossless-claw's guaranteed-progress fallback) sacrifices flexibility for reliability and prevents the feedback loop where bad summarization degrades future summarization.

**Search vs. pre-loaded index.** Search is precise and handles large corpora but requires knowing what to search for. Pre-loaded indexes (ROOT.md, CLAUDE.md) surface everything at once but are bounded by token budget. The benchmark numbers favor hybrid approaches: hipocampus achieves 21.0% on implicit context questions by combining a 10K token index with vector search, versus 3.4% for search alone.

**Fresh tail protection.** Most approaches protect some number of recent messages from compression — lossless-claw defaults to 64 messages, hipocampus uses a proactive flush every ~20 messages. This ensures immediate context remains coherent. The tradeoff: larger protected tails leave less budget for historical summaries.

**Escalation and fallback.** Production context management systems need a fallback when the LLM fails to compress adequately. Lossless-claw's three-level escalation (normal → aggressive → deterministic truncation) guarantees progress even under model failure. Without a deterministic fallback, the system can stall — the compression step fails, context keeps growing, and the session crashes.

## Failure Modes

**Compression quality collapse.** Iterative LLM summarization degrades toward generic platitudes. After 5-10 rewrite rounds, specific knowledge becomes vague guidance (ACE paper). Mitigation: never rewrite full context through LLM; use append-only deltas with deterministic merge.

**Storage without retrieval.** A common production bug class: content is stored correctly but becomes inaccessible due to formatting normalization, embedding failures, or metadata corruption. The lossless-claw documentation describes a specific case where three formatting layers progressively stripped content — "the AI had perfect memory storage and zero memory retrieval." End-to-end retrieval testing is non-negotiable.

**Fresh tail contamination.** Large tool outputs — a 50K token file read, a verbose API response — inserted into the protected fresh tail crowd out multiple turns of relevant conversation. Systems that do not bound individual message sizes before insertion are vulnerable.

**Expansion latency under heavy compression.** At high compression depth (depth 3+ in DAG-based systems), recovering specific details requires sub-agent spawning and additional LLM calls. Lossless-claw estimates 5-15 seconds per expansion. For interactive agents, this is visible latency. For batch agents, it compounds across many retrievals.

**Character limit vs. information density mismatch.** Letta's block character limits are poor proxies for information content. A 5000-character block might contain 3 key facts or 30. The system cannot distinguish; the agent must manage density manually.

**Unknown unknowns structural failure.** Search-based systems cannot retrieve context they were never asked to retrieve. No query quality improvement addresses this — the problem is structural. Only pre-loaded indexes or active topic tracking solve it, and both are bounded by token budget.

## Operational Conditions and Selection Guidance

**Use sliding window truncation** when session length is short and predictable, cost is the primary constraint, and the most recent context is always the most relevant. Wrong choice for any session that builds state over time.

**Use RAG** when the knowledge base is large (hundreds of documents), queries are well-defined, and the user knows what they need. Wrong choice when the agent needs to proactively surface relevant context without explicit queries.

**Use DAG summarization (lossless-claw pattern)** when sessions are long and unbounded, historical decisions must remain recoverable, and you can tolerate 5-15 second expansion latency for detail recovery. Wrong choice when latency is critical or when you need to avoid the operational complexity of SQLite persistence and sub-agent spawning.

**Use incremental delta updates (ACE pattern)** when the agent needs to improve its own context over many task iterations, you have execution feedback as a learning signal, and you need 80%+ cost reduction compared to full-rewrite approaches. Wrong choice for simple, single-shot tasks.

**Use hierarchical topic indexing (hipocampus pattern)** when you need to surface implicit context without explicit queries, sessions span days or weeks, and you want zero-infrastructure operation (just files). Wrong choice when the corpus exceeds what a 3-10K token index can meaningfully summarize.

**Use prompt-resident editable blocks (Letta pattern)** when you want the agent to have full transparency into its own memory state, memory updates need to be immediately visible, and you are building multi-agent systems where shared memory blocks are a coordination mechanism. Wrong choice when per-turn LLM cost from memory management tool calls is a constraint.

## Unresolved Questions

How do hierarchical summarization systems perform across domains with very different information density — dense technical specifications versus conversational text? The OOLONG benchmark covers coding agents; applicability to research or customer service agents is unvalidated.

At what context depth does expansion latency become acceptable? The lossless-claw 5-15 second estimate assumes fast models; slower or local models could make depth-3+ expansion unusable for interactive sessions.

Can incremental delta updates scale to thousands of bullets without structural organization? ACE's flat bullet list accumulates indefinitely. The deduplication step reduces it, but the system has no mechanism for hierarchical organization as the list grows. The point at which a flat list becomes incoherent is unexplored.

For hipocampus, the hard-tier benchmark plateaus at 8% regardless of ROOT.md size, suggesting cross-domain reasoning is bottlenecked by the answer model rather than index coverage. What model capability threshold unlocks this tier?

How should compression quality degrade gracefully when summarization models are rate-limited or unavailable? Lossless-claw's deterministic fallback answers this for a single system, but multi-system deployments that route to different compression models have undefined behavior when one provider fails.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — The broader discipline of which context management is one component
- [Context Compression](../concepts/context-compression.md) — Specific techniques for reducing token count
- [Agent Memory](../concepts/agent-memory.md) — Memory systems that feed context management
- [Short-Term Memory](../concepts/short-term-memory.md) — In-context working memory
- [Long-Term Memory](../concepts/long-term-memory.md) — Persistent storage accessed via retrieval
- [Episodic Memory](../concepts/episodic-memory.md) — Session-scoped conversational history
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — Retrieval mechanism that populates context
- [Lost in the Middle](../concepts/lost-in-the-middle.md) — Attention degradation in long contexts
- [Token Efficiency](../concepts/token-efficiency.md) — Reducing token count before management decisions
- [CLAUDE.md](../concepts/claude-md.md) — Project-level persistent context configuration
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — Staged context revelation patterns

## Key Projects

- [OpenClaw](../projects/openclaw.md) — Agent framework with ContextEngine plugin interface
- [Letta](../projects/letta.md) — Full agent platform with editable memory blocks
- [Claude Code](../projects/claude-code.md) — Implements sliding window with CLAUDE.md-based persistent context
- [ACE](../projects/ace.md) — Incremental delta update framework for context adaptation
- [MemGPT](../projects/memgpt.md) — Original virtual context management system
- [Mem0](../projects/mem0.md) — Automatic fact extraction for persistent memory
- [Graphiti](../projects/graphiti.md) — Knowledge graph approach to memory with temporal reasoning

---
entity_id: context-window
type: concept
bucket: context-engineering
abstract: >-
  The context window is the finite token buffer an LLM processes in a single
  inference call — the constraint that drives every architectural decision in
  agent memory, RAG, and multi-step reasoning systems.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - repos/microsoft-llmlingua.md
  - repos/wangyu-ustc-mem-alpha.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
related:
  - rag
  - semantic-memory
  - claude-code
  - cursor
  - episodic-memory
last_compiled: '2026-04-07T11:51:46.394Z'
---
# Context Window

## What It Is

A context window is the maximum number of tokens an LLM can process in a single forward pass. Everything the model "knows" during inference — system prompt, conversation history, retrieved documents, tool outputs, intermediate reasoning — must fit within this buffer. Tokens outside the window are invisible to the model.

The constraint is architectural, not incidental. Transformer attention scales quadratically with sequence length (O(n²) in naive implementations), which caps practical window sizes even as hardware improves. Modern models have pushed limits dramatically: GPT-4 Turbo supports 128K tokens, Claude 3.5 Sonnet 200K, Gemini 1.5 Pro 1M+. But larger windows shift the problem rather than solve it — filling a 200K window with the wrong content produces worse results than a well-curated 20K window.

## Why It Matters

Every architectural pattern in agent intelligence systems exists because of context window limits. [Retrieval-Augmented Generation](../concepts/rag.md) pulls relevant content at query time because you cannot fit an entire knowledge base into context. [Semantic Memory](../concepts/semantic-memory.md) stores compressed representations externally because raw conversation history is too expensive. [Episodic Memory](../concepts/episodic-memory.md) selectively recalls past events rather than replaying entire sessions. [Context Compression](../concepts/context-compression.md) summarizes or prunes content to reclaim space. [Progressive Disclosure](../concepts/progressive-disclosure.md) structures information hierarchically so lower-priority detail stays out of context until needed.

Andrej Karpathy's LLM knowledge base workflow illustrates this directly: at ~400K words, a wiki is too large for any current context window, so he builds index files and summary layers the LLM can read selectively, essentially implementing manual [Retrieval-Augmented Generation](../concepts/rag.md) at the filesystem level. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

## How It Works

### Token Budget and Allocation

A context window is measured in tokens, not characters. English text runs roughly 3-4 characters per token; code is denser. A 200K token window holds approximately 150,000 words or 500 pages of text — substantial, but finite.

In practice, a 200K token window is not 200K tokens of usable space. Everything the agent needs costs tokens:

- System prompt: 5-15K tokens for a detailed agent persona with instructions
- Tool definitions: 2-5K tokens per MCP tool registered
- Conversation history: accumulates indefinitely without truncation
- Retrieved content: however much RAG injects per query
- Reasoning traces: [Chain-of-Thought](../concepts/chain-of-thought.md) can produce thousands of tokens before an answer

The Everything Claude Code project budgets a 200K window explicitly: ~10K for system prompts, ~5-8K for resident rules, ~2-5K per MCP tool definition, reserving the remaining capacity for actual work. Their recommendation: register no more than 10 MCPs per project to preserve ~70K tokens of working space. [Source](../raw/deep/repos/affaan-m-everything-claude-code.md)

### The "Lost in the Middle" Problem

Larger context windows do not solve attention problems. Research consistently shows LLMs attend most strongly to content at the beginning and end of the context window, with reduced attention to content in the middle. A 100K-token context with critical information buried at position 50K may produce worse answers than a 10K context with that same information near the top.

The planning-with-files skill addresses this directly by re-injecting the first 30 lines of `task_plan.md` via a `PreToolUse` hook before every tool call. The explicit goal: keep current objectives in the model's recent attention span, counteracting drift that occurs after ~50 tool calls. This "attention manipulation via recitation" is one of the core principles extracted from Manus AI's architecture. [Source](../raw/deep/repos/othmanadi-planning-with-files.md)

### Context Window vs. Long-Term Memory

The context window is RAM; external storage is disk. This framing, popularized by Manus AI and encoded in the planning-with-files skill, captures the fundamental distinction:

- **Context window**: fast, immediately accessible, finite, volatile — cleared at session end or after `/clear`
- **External memory**: persistent, unlimited, requires explicit retrieval to access

[Agent Memory](../concepts/agent-memory.md) systems exist entirely to bridge this gap. [Letta](../projects/letta.md) implements a tiered memory architecture where [Core Memory](../concepts/core-memory.md) (always in context) coexists with archival memory (retrieved on demand). [Mem0](../projects/mem0.md) extracts and compresses memories from conversation history to avoid context overflow. Mem-α trains agents via reinforcement learning to decide what to write to episodic, semantic, and core memory, rather than using fixed encoding rules — optimizing memory construction itself for downstream task performance. [Source](../raw/repos/wangyu-ustc-mem-alpha.md)

## Key Tensions

### Window Size vs. Attention Quality

GraphRAG's evaluation found that 8K tokens is the optimal context window size for map-reduce synthesis tasks. Larger windows (16K, 32K) did not improve answer quality and sometimes degraded it. Passing more than ~8K tokens to a single generation call for synthesis purposes appears to exceed the model's effective integration capacity. [Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)

This creates a counterintuitive constraint: even with a 200K-token window, you should often aim to keep individual synthesis prompts short. The window's value is less about fitting everything into one call and more about giving the agent freedom to read multiple sources without hitting hard limits.

### Compression vs. Fidelity

Anything that does not fit in context must be summarized, chunked, or discarded. Each technique loses information:

- **Truncation**: drops content entirely; predictable but brutal
- **Summarization**: preserves meaning at the cost of specifics; useful for conversation history
- **Chunking with retrieval**: preserves specifics but may miss cross-chunk relationships
- **Hierarchical summarization**: preserves structure (GraphRAG's community summaries achieve 9-43x token reduction at root level) but compounds LLM hallucination risk across two generation steps

The Manus principle "compression must be restorable" offers a practical heuristic: keep URLs even if you drop page content; keep file paths even if you drop document contents. Preserve the pointer, compress the payload.

### Cost at Scale

Context window usage directly drives inference cost. Longer contexts cost more per call, and long contexts that hit the KV cache are dramatically cheaper than uncached equivalents — Manus reports a 10x difference ($0.30/MTok cached vs. $3/MTok uncached for their workload). This makes prompt prefix stability a performance optimization: changing the first few tokens of a system prompt invalidates the cache for everything downstream. [Source](../raw/deep/repos/othmanadi-planning-with-files.md)

The planning-with-files PreToolUse hook illustrates the cost tension concretely. Re-reading 30 lines of task_plan.md before every tool call keeps goals fresh in attention, but across 100 tool calls that adds ~3,000 lines of repeated content to the total token count for the session. Whether this overhead is worth paying depends on task complexity and session length.

## Architectural Patterns

### Filesystem as Working Memory

The pattern most directly motivated by context limits: write everything important to disk and read it back selectively. The planning-with-files skill (3 persistent markdown files: `task_plan.md`, `findings.md`, `progress.md`) implements this explicitly. Karpathy's wiki workflow does the same at larger scale: compile source documents into an indexed markdown structure, then query it as needed rather than loading everything at once. The LLM reads selectively; the filesystem holds state indefinitely.

### Hierarchical Indexing

When a corpus exceeds context limits, you need an index that fits in context and points to content that does not. GraphRAG's community summaries implement this: root-level summaries (C0) fit comfortably in context and cover the entire corpus; leaf-level summaries (C3) provide detail on demand. Karpathy's wikis do the same: the LLM auto-maintains index files and brief summaries of all documents, reading only the relevant subset per query.

### Hook-Based Context Injection

Hooks that fire at tool-call boundaries can inject context precisely when it is needed rather than loading it statically. The PreToolUse pattern fires before each tool execution; the PostToolUse pattern fires after writes to prompt logging. This approach keeps high-priority content (current task goals, recent progress) in the most recently attended positions without permanently consuming the system prompt budget.

### Multi-Agent Context Isolation

Multiple agents with separate context windows can process more total information than a single agent. [LangGraph](../projects/langgraph.md), [CrewAI](../projects/crewai.md), and similar frameworks exploit this: a planner agent holds the task structure; executor agents hold domain-specific content; a synthesizer agent sees only the outputs. Each agent's window stays focused. The tradeoff is coordination overhead and information loss at agent boundaries.

## Failure Modes

**Goal drift**: Over long multi-step tasks, the original goal scrolls out of the attended region as tool outputs accumulate. The agent continues taking actions but optimizes for the most recently attended content rather than the original objective. Fix: re-inject goals at regular intervals via hooks or explicit re-reading steps.

**Silent truncation**: Most LLM APIs truncate context at the window limit without error. An agent that fills its context with retrieved documents may silently drop its system prompt or early conversation history. The model produces plausible-looking output with no indication that critical context was lost. Fix: budget context allocation explicitly and monitor token counts.

**Cache invalidation**: Systems that dynamically modify system prompts (e.g., injecting current date/time, session IDs, or per-request configuration) invalidate the KV cache on every call, turning a $0.30/MTok operation into a $3/MTok one. Fix: keep prompt prefixes stable; append variable content at the end.

**Retrieval-attention mismatch**: RAG injects retrieved content into the context window, but injection position affects how well the model attends to it. Content injected mid-conversation competes with surrounding dialogue. Fix: use structured injection patterns (e.g., always inject retrieved content immediately after the system prompt, before conversation history).

**Compounding hallucination in summaries**: Multi-level summarization (summaries of summaries) compounds hallucination. Each summarization step introduces errors; those errors become inputs to the next level. GraphRAG's community hierarchy acknowledges this risk but does not measure it. Fix: preserve source citations through summarization layers to enable fact-checking.

## When Context Window Size Matters Most

Context window capacity becomes the binding constraint when:

- Sessions involve many sequential tool calls that accumulate outputs (coding agents, research agents)
- Tasks require reasoning over multiple long documents simultaneously
- Agent memory must span more than a single conversation session
- Tool definitions are numerous (each MCP tool consumes 2-5K tokens)

Context window management is less critical when:

- Tasks are short and self-contained (single-turn Q&A)
- Retrieval can reliably identify the specific relevant chunks (narrow factual queries)
- The corpus is small enough to fit comfortably with room to spare

## Relationship to Neighboring Concepts

[Context Engineering](../concepts/context-engineering.md) is the practice of managing what goes into the context window and in what order. The context window is the constraint; context engineering is the response to that constraint.

[Context Compression](../concepts/context-compression.md) reduces the token cost of existing content to free space for new content.

[Retrieval-Augmented Generation](../concepts/rag.md) is the dominant architectural pattern for working around context limits: retrieve only what is relevant rather than loading everything.

[Progressive Disclosure](../concepts/progressive-disclosure.md) structures information so that high-level summaries load first and detail loads only on demand, matching content granularity to available context budget.

[Context Management](../concepts/context-management.md) covers the operational mechanics: truncation policies, compaction strategies, and token counting.

[CLAUDE.md](../concepts/claude-md.md) and [Skill Files](../concepts/skill-md.md) occupy permanent context window space as resident instructions. Their size directly reduces available working space, making conciseness in these files an engineering priority, not merely a style preference.

[Cursor](../projects/cursor.md) and [Claude Code](../projects/claude-code.md) both implement context window management as a core product feature: Cursor's codebase indexing and Claude Code's 200K window allocation reflect how commercial coding agents treat context as a managed resource.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — alternative_to (0.6)
- [Semantic Memory](../concepts/semantic-memory.md) — part_of (0.4)
- [Claude Code](../projects/claude-code.md) — part_of (0.5)
- [Cursor](../projects/cursor.md) — part_of (0.5)
- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.5)

---
entity_id: token-efficiency
type: concept
bucket: context-engineering
abstract: >-
  Token efficiency: strategies for maximizing LLM task performance per token
  spent, covering attention budget management, context pruning, compression, and
  retrieval — the core constraint shaping all agent architecture decisions.
sources:
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - repos/tirth8205-code-review-graph.md
related:
  - retrieval-augmented-generation
  - cursor
  - model-context-protocol
  - context-management
  - claude-code
  - episodic-memory
last_compiled: '2026-04-08T23:29:20.698Z'
---
# Token Efficiency

## What It Is

Token efficiency describes how much useful work an LLM completes per token consumed. In isolation, this sounds like a cost metric. In practice, it governs what agent architectures are even possible.

Every LLM call draws from two finite resources simultaneously: the context window (which bounds what the model can see) and the attention budget (which bounds how well it sees it). These resources interact badly. Filling a context window doesn't just cost money — it degrades performance. Chroma's research on "context rot" found that recall accuracy drops as tokens accumulate, even when those tokens are technically within the model's stated limit. The degradation isn't uniform: Stanford research showed 30%+ performance loss for information buried in the middle of long contexts, with the beginning and end receiving disproportionate attention. Anthropic's own engineering team frames this directly: "every new token introduced depletes this budget by some amount." [Source](../raw/articles/effective-context-engineering-for-ai-agents.md)

Token efficiency is therefore not optional optimization — it's a correctness concern. An agent that loads irrelevant context doesn't just cost more; it reasons worse.

## Why It Matters for Agents

Single-turn LLM calls have manageable context. Agents don't. An agent running in a loop accumulates tool outputs, memory reads, prior reasoning, and intermediate results across many turns. Without active management, this state grows without bound. The consequences are concrete:

- **Hard limits**: The model stops working past its maximum context length.
- **Soft limits**: Effective recall degrades well before the hard limit, often starting around 50-60% of the stated maximum. [Source](../raw/articles/effective-context-engineering-for-ai-agents.md)
- **Monetary cost**: More tokens means more inference cost, directly.
- **Latency**: Longer prompts take longer to process.

The Manus agent — a $2B company's product — spent approximately one-third of its total compute budget rewriting a todo.md checklist on each action cycle. [Source](../raw/articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md) This is the failure mode at scale: architectures that weren't designed for token efficiency encounter it as a compounding cost.

## Core Strategies

### 1. Attention Budget Management

Treat context as a scarce resource with diminishing returns. The transformer architecture requires O(n²) pairwise attention computation across n tokens — this creates both a cost curve and a quality curve that both worsen quadratically.

Practical implication: prioritize which tokens occupy which positions. High-priority information (current task, critical constraints, recent results) belongs at the beginning or end of context. Supporting material goes in the middle only when necessary, knowing it receives less reliable attention.

System prompt design follows the same logic. Anthropic's guidance suggests calibrating at the "right altitude" — specific enough to guide behavior without encoding brittle if-else logic, general enough to avoid ballooning with edge cases. The test: can you state which tool to use in a given situation unambiguously? If not, the agent can't either, and the ambiguity wastes tokens on navigation. [Source](../raw/articles/effective-context-engineering-for-ai-agents.md)

### 2. Just-in-Time Retrieval

Rather than loading all potentially relevant context upfront, agents maintain lightweight references (file paths, stored queries, identifiers) and retrieve data dynamically when needed.

[Claude Code](../projects/claude-code.md) implements this pattern: CLAUDE.md files load at startup, but file contents load through grep, glob, and Bash commands only when relevant. The agent never loads a full codebase into context — it navigates to what it needs. This mirrors how humans use external memory systems: we don't memorize entire corpuses, we maintain indexes and retrieve on demand. [Source](../raw/articles/effective-context-engineering-for-ai-agents.md)

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) formalizes this for knowledge lookup — embedding-based search retrieves only the passages relevant to a query, rather than passing an entire knowledge base through the model.

The tradeoff: runtime retrieval is slower than pre-loaded context. Hybrid strategies load some data upfront (frequently accessed, stable reference material) and retrieve the rest dynamically. The boundary depends on how dynamic and large the information space is.

### 3. Context Compression and Compaction

When context grows unavoidably long, compress before it degrades performance further.

**Compaction** summarizes accumulated context and restarts the conversation with the summary. [Claude Code](../projects/claude-code.md) implements this by passing message history to the model, which preserves architectural decisions, unresolved bugs, and implementation details while discarding redundant tool outputs. The agent continues with the compressed context plus recently accessed files. [Source](../raw/articles/effective-context-engineering-for-ai-agents.md)

The practical challenge: over-aggressive compaction loses subtle context whose importance only becomes apparent later. Calibrate by maximizing recall first, then iterate to eliminate genuinely superfluous content. Tool call results deep in history are often the safest first target — once a tool has been called and its output processed, the raw result rarely needs to appear in future turns.

**Tool result clearing** is a lighter-weight variant: strip raw tool outputs from message history after they've been processed, keeping only the conclusions drawn from them. Anthropic released this as a platform feature for the Claude API.

[Context Compression](../concepts/context-compression.md) covers algorithmic compression approaches beyond summarization.

### 4. Incremental Delta Updates

ACE (Agentic Context Engineering) identified two failure modes in context evolution: brevity bias (iterative summarization drops domain-specific detail in favor of generic instructions) and context collapse (repeated LLM rewriting of context causes progressive information loss). [Source](../raw/deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

The fix: append-only deltas with deterministic merging. Instead of an LLM rewriting the full context each round, new knowledge arrives as small structured bullets that merge into existing context algorithmically — no LLM-driven synthesis, no opportunity for collapse. Semantic embedding-based deduplication removes redundant bullets as the context grows. [Source](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

Results: ACE achieved 82-92% reduction in adaptation latency and token cost compared to full-context rewriting approaches, with +10.6% task performance on agent benchmarks. These figures are from the ACE paper authors (self-reported) and haven't been independently replicated at time of writing. [Source](../raw/deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

### 5. Progressive Disclosure

[Progressive Disclosure](../concepts/progressive-disclosure.md) structures information delivery so agents receive only what's needed for the current decision, with additional detail available on demand.

Folder hierarchies, file naming conventions, and timestamps function as progressive disclosure mechanisms — metadata signals that tell an agent what to explore further without loading the underlying content. An agent seeing `test_utils.py` in a `tests/` folder infers its purpose without reading it. [Source](../raw/articles/effective-context-engineering-for-ai-agents.md)

### 6. Structured Memory vs. Flat Files

A common efficiency failure: storing agent memory as flat markdown files (MEMORY.md, todo.md, CLAUDE.md) and loading the entire file into context each turn.

Problems at scale, documented empirically:
- ETH Zurich research found context files tend to reduce task success while increasing inference cost by 20%+.
- Information buried in the middle of the file receives degraded attention.
- All memories load regardless of relevance — database migration notes appear when the agent is asked about CSS.
- Silent truncation: [Claude Code](../projects/claude-code.md)'s auto-memory caps MEMORY.md at 200 lines, dropping anything past that without warning.
- Concurrent writes from multiple agents cause silent data corruption. [Source](../raw/articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md)

Structured memory systems ([Mem0](../projects/mem0.md), [Letta](../projects/letta.md), [Zep](../projects/zep.md)) provide typed entries, semantic retrieval, conflict detection, and decay mechanisms. These enable retrieving only relevant memories for a given query rather than loading everything. The cost is operational complexity and loss of the "human editable" property.

The mem-agent paper describes training a 4B model with GSPO to manage memory through Python tools and structured markdown files — scoring 75% on their custom benchmark (md-memory-bench), second only to Qwen3-235B. The approach treats memory management as a learnable skill rather than a hard-coded retrieval pattern, with the agent deciding what to read, write, and update. [Source](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

### 7. Sub-Agent Architectures

In multi-agent systems, sub-agents handle focused tasks with clean context windows, returning condensed summaries (typically 1,000-2,000 tokens) rather than their full working context. The orchestrating agent sees only summaries, maintaining a compact high-level view while sub-agents can work with large local contexts.

Anthropic's internal multi-agent research system saw substantial improvement over single-agent approaches using this pattern. [Source](../raw/articles/effective-context-engineering-for-ai-agents.md) [Multi-Agent Systems](../concepts/multi-agent-systems.md) covers coordination patterns in more depth.

## Attention Budget: The Governing Constraint

The attention budget is the conceptual frame for all these strategies. Because transformers compute attention across all token pairs, quality degrades as context grows — not discretely at a limit, but continuously. Models trained primarily on shorter sequences have fewer specialized parameters for long-range dependencies; position encoding interpolation extends context length but introduces degradation in position understanding.

The practical implication: the optimal context is the smallest set of high-signal tokens that produces the desired outcome, not the largest set that fits within the window. Adding tokens that are 50% relevant doesn't help on average — it dilutes attention for the fully relevant tokens.

This reframes token efficiency from a cost concern to a quality concern. Longer context isn't neutral; it's often harmful.

## Metrics

Practitioners track token efficiency through several lenses:

- **Tokens per task**: Total tokens consumed to complete a defined task. Directly measures cost.
- **Performance per token**: Task success rate divided by tokens consumed. Captures the quality-efficiency tradeoff.
- **Compression ratio**: Ratio of compressed context size to original, used to evaluate summarization quality.
- **Retrieval precision**: For RAG systems, the fraction of retrieved tokens that are actually relevant to the query. Low precision means wasted tokens.
- **Context utilization**: How much of the context window is genuinely referenced in the model's reasoning, versus loaded but ignored.

## Implementation Patterns by System

**Cursor**: Uses .cursor/rules/*.mdc files with scoped application — rules activate only for matching file globs rather than loading globally. [Source](../raw/articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md) [Cursor](../projects/cursor.md)

**Claude Code**: Hybrid just-in-time approach with CLAUDE.md for persistent context, grep/glob for dynamic retrieval, 200-line memory cap (with silent truncation), and compaction for long sessions. [Claude Code](../projects/claude-code.md) [CLAUDE.md](../concepts/claude-md.md)

**MCP servers**: [Model Context Protocol](../concepts/model-context-protocol.md) standardizes how agents request external context, enabling servers to return precisely scoped information rather than full datasets.

**MemGPT/Letta**: Virtual memory paging model — core memory stays in context, archival memory lives outside and loads on demand through function calls. [Letta](../projects/letta.md)

## Failure Modes

**Context rot**: Gradual degradation of reasoning quality as irrelevant tokens accumulate. Symptoms resemble model capability issues but are architectural — the same model on a trimmed context performs better.

**Silent truncation**: Flat-file memory systems hit limits and drop content without alerting the agent. The agent proceeds with incomplete information it believes is complete.

**Attention dilution**: Relevant content exists in context but competes with irrelevant content for attention. The model sees it but weighs it less.

**Compaction amnesia**: Over-aggressive summarization loses context that becomes critical later. Recovering requires re-doing work or accepting degraded performance.

**Retrieval poisoning**: In memory systems using semantic search, adversarially crafted inputs can inject false "memories" that retrieve reliably and corrupt downstream reasoning. [Source](../raw/articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md) Flat files with no provenance tracking have no defense against this.

## When Token Efficiency Dominates Architecture Decisions

Token efficiency becomes the primary design constraint when:

- Tasks run over many turns or extended time horizons (code migrations, research, multi-session assistants)
- Agents operate in large information spaces (large codebases, long document corpora, dense knowledge graphs)
- Cost is a production constraint (high-volume deployments where per-call cost matters)
- Multiple agents share infrastructure (token waste from one agent affects others)

For short, single-turn tasks with bounded information, token efficiency matters less. A well-designed prompt that's slightly longer than optimal rarely causes problems in a single-turn setting. The costs compound in agentic loops.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): The broader discipline of which token efficiency is a core constraint
- [Context Management](../concepts/context-management.md): Operational strategies for managing context across agent turns
- [Context Compression](../concepts/context-compression.md): Compression-specific techniques
- [Progressive Disclosure](../concepts/progressive-disclosure.md): Structuring information delivery to minimize unnecessary loading
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): Just-in-time retrieval as a token efficiency strategy
- [Episodic Memory](../concepts/episodic-memory.md): How episodic storage design affects retrieval token cost
- [Lost in the Middle](../concepts/lost-in-the-middle.md): The attention distribution problem in long contexts
- [Multi-Agent Systems](../concepts/multi-agent-systems.md): Sub-agent patterns for context isolation

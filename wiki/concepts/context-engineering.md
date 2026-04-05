---
entity_id: context-engineering
type: concept
bucket: context-engineering
sources:
  - repos/orchestra-research-ai-research-skills.md
  - repos/memodb-io-acontext.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/vectifyai-pageindex.md
  - repos/topoteretes-cognee.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/nemori-ai-nemori.md
  - articles/effective-context-engineering-for-ai-agents.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
related:
  - Claude Code
  - Claude
  - Retrieval-Augmented Generation
  - Agent Skills
  - Agent Memory
  - Knowledge Graphs
  - Self-Improving Agent
  - Prompt Engineering
  - Progressive Disclosure
  - Prompt Engineering
last_compiled: '2026-04-04T21:15:26.230Z'
---
# Context Engineering

## What It Is

Context engineering is the practice of deliberately designing, structuring, and managing the information placed into an LLM's context window to optimize model behavior. It treats the context window as a programmable resource—not just a place to paste instructions—and encompasses decisions about *what* information to include, *how* to format it, *when* to retrieve or discard it, and *how* to update it over time.

The term emerged as a recognition that prompt engineering, while useful, addresses only a narrow slice of what determines LLM performance in real systems. A production agent's behavior depends at least as much on the quality of retrieved documents, the structure of tool outputs, the recency of memory, and the coherence of multi-turn history as on any single prompt.

## Why It Matters

Most LLM failures in deployed systems aren't failures of model capability—they're failures of information supply. The model doesn't know something it needed to know, was told something misleading, received too much irrelevant content, or lacked the context to disambiguate a request. Context engineering is the discipline that addresses this class of problem directly.

As context windows grow (100K–1M+ tokens), the problem doesn't disappear—it shifts. Larger windows introduce attention dilution, increased costs, and the "lost in the middle" phenomenon where models underweight information in the middle of long contexts. More capacity demands more discipline about what gets placed where.

## How It Works

Context engineering operates across several layers:

**Static context design** — System prompts, persona definitions, behavioral constraints, and formatting instructions. The equivalent of traditional prompt engineering, but now understood as just one input among many.

**Dynamic retrieval** — Pulling relevant documents, facts, or examples into context at query time via Retrieval-Augmented Generation. Decisions include what to retrieve, how many chunks, how to rank them, and how to present them.

**Memory management** — Deciding what persists across sessions and how. Systems like [Agent Memory](../concepts/agent-memory.md) may store episodic traces, distilled skills, or structured facts in vector stores, graph databases, or flat files. Projects like cognee (14.9K stars) combine vector search with knowledge graphs to maintain dynamically evolving contextual knowledge.

**Skill distillation** — Converting execution traces into reusable procedural knowledge. Acontext (3.2K stars) represents agent memory as structured "skill files" rather than opaque vectors, making learned patterns human-readable and editable. The Agentic Context Engine (ACE, 2.1K stars) implements a "Skillbook"—queryable stored strategies retrieved during inference, turning one-time corrections into compounding improvements.

**Context windowing and compression** — Summarizing conversation history, pruning irrelevant tool outputs, and progressively disclosing information rather than front-loading everything. See [Progressive Disclosure](../concepts/progressive-disclosure.md).

**Structural formatting** — How information is laid out within the context. Headers, XML tags, JSON schemas, and separation of system vs. user content all affect how reliably models attend to different pieces.

## Concrete Examples

- A coding assistant using [Claude Code](../projects/claude-code.md) reads `CLAUDE.md` project files, retrieves relevant source files via search, and maintains a rolling summary of recent edits—all context engineering decisions.
- A customer support agent retrieves the last 3 support tickets for a user (not all 50), formats them with recency weighting, and appends a policy document relevant to the detected issue category.
- An agent that previously failed a task stores a post-mortem strategy note in its skillbook; on the next similar task, that note is retrieved and injected before execution begins.

## Who Implements It

Context engineering is implicitly practiced by anyone building production LLM systems, but explicit frameworks have emerged:

- **cognee** — Knowledge graphs + vector search for dynamic agent memory
- **Acontext** — Skill-file-based memory layer across frameworks
- **ACE** — Feedback-loop-driven skillbook for self-improving agents
- **[Claude](../projects/claude-code.md)** and most frontier models expose structured system prompts, tool result formatting, and explicit context-window management APIs

## Relationship to Adjacent Concepts

| Concept | Relationship |
|---|---|
| Prompt Engineering | Subset of context engineering; addresses static instructions only |
| RAG | Core mechanism for dynamic context population |
| [Agent Memory](../concepts/agent-memory.md) | Implements persistence across the context boundary |
| [Knowledge Graphs](../concepts/knowledge-graphs.md) | Structured retrieval substrate enabling relational context |
| [Self-Improving Agents](../concepts/self-improving-agent.md) | Agents that update their own context resources over time |

## Strengths

- Addresses the actual bottleneck in most production LLM systems
- Framework-agnostic: applies to any model, any architecture
- Measurable: context quality improvements translate directly to task performance
- Composable: memory, retrieval, and formatting improvements stack

## Limitations

- No universal standard: what constitutes "good" context is task-specific
- Retrieval quality caps context quality—garbage in, garbage out
- Longer contexts increase latency and cost, sometimes substantially
- Context engineering can paper over model limitations but doesn't improve underlying reasoning
- The field is still establishing vocabulary and best practices; "context engineering" itself is a young term with contested boundaries

## Honest Assessment

Context engineering is a genuine and important practice, but the term risks becoming a marketing reframe for things practitioners already did. The underlying insight—that what you put in the context window matters enormously—is correct and underappreciated. The risk is that "context engineering" becomes a buzzword that obscures rather than clarifies the specific techniques involved: good retrieval design, memory architecture, context compression, and structural formatting are each distinct problems worth treating separately.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.6)
- [Claude](../projects/claude-code.md) — implements (0.6)
- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.6)
- [Agent Skills](../concepts/agent-skills.md) — part_of (0.5)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.5)
- [Knowledge Graphs](../concepts/knowledge-graphs.md) — implements (0.4)
- [Self-Improving Agent](../concepts/self-improving-agent.md) — part_of (0.4)
- Prompt Engineering — supersedes (0.7)
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — implements (0.7)
- Prompt Engineering — part_of (0.7)

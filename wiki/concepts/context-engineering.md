---
entity_id: context-engineering
type: concept
bucket: context-engineering
abstract: >-
  Context engineering is the discipline of deliberately designing what
  information goes into an LLM's context window, when, and in what form —
  differentiated from prompt engineering by treating context as a dynamic,
  multi-component optimization problem rather than a static text artifact.
sources:
  - repos/memodb-io-acontext.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/transformeroptimus-superagi.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/thedotmack-claude-mem.md
  - repos/nemori-ai-nemori.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - claude-code
  - mcp
  - anthropic
  - agent-skills
last_compiled: '2026-04-06T01:59:23.141Z'
---
# Context Engineering

## What It Is

Context engineering is the practice of controlling what an LLM sees at inference time. The context window is finite — every token spent on one thing is unavailable for another. Context engineering is the set of decisions and mechanisms that govern those tradeoffs.

[Andrej Karpathy popularized the term](../concepts/andrej-karpathy.md) to distinguish the broader discipline from [prompt engineering](../concepts/prompt-engineering.md), which focuses narrowly on instruction phrasing. Context engineering encompasses everything that shapes the model's informational environment: what instructions appear, what external knowledge gets retrieved, what tools are declared, what memory survives across sessions, and how all of it gets compressed to fit.

The formal framing, drawn from a recent survey of 1,400+ papers, is:

**C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)**

where the assembly function A optimizes expected task reward subject to |C| ≤ L_max.

Six component types fill the window:
- **c_instr** — system instructions and behavioral rules
- **c_know** — external knowledge (retrieved documents, graphs, search results)
- **c_tools** — function signatures and tool definitions
- **c_mem** — persistent information from prior sessions
- **c_state** — dynamic state (user context, world state, agent coordination data)
- **c_query** — the immediate user request

Every system prompt, RAG pipeline, and memory layer is making allocation decisions across these six components. Context engineering makes those decisions explicit and systematic rather than ad hoc.

[Source](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)

---

## Why It Matters

LLMs have a fundamental asymmetry: they understand complex contexts far better than they can generate equally sophisticated long-form outputs. This changes the calculus for system design. Investing in richer, better-structured retrieval and context assembly yields higher returns than trying to elicit better outputs from sparse inputs through clever prompting.

A second pressure: attention degrades over long sessions. Models trained on typical context lengths begin losing track of goals stated early in the window as more tokens accumulate. This is sometimes called the "lost in the middle" effect. Context engineering addresses this directly rather than hoping the model stays on track.

A third pressure: cost. Anthropic charges roughly 10x more for uncached tokens than cached ones ($3/MTok vs $0.30/MTok for Claude as of mid-2025). Stable prompt prefixes that hit the KV cache are a direct cost reduction. Context engineering that prioritizes cache stability is not just a capability concern — it's an economics concern.

---

## Core Mechanisms

### Context Assembly

At its simplest, context assembly is deciding what to include. In practice, this means:

**Retrieval selection** — choosing which documents, memory fragments, or tool results enter the window. [Retrieval-Augmented Generation](../concepts/rag.md) formalizes this as maximizing mutual information I(Y*; c_know | c_query): the retrieved content should be maximally informative for the specific task, not just topically related.

**Format and ordering** — where content appears matters. Models attend more strongly to content near the beginning and end of the context window. Critical instructions placed at the start and end outperform the same instructions buried in the middle.

**Progressive disclosure** — rather than loading all potentially relevant information upfront, agents can fetch additional context on demand as tasks unfold. [Claude Code](../projects/claude-code.md) implements this through its CLAUDE.md and .claude/commands/ system: stable project context loads automatically while detailed specifications load only when relevant commands execute.

[Source](../raw/deep/repos/othmanadi-planning-with-files.md)

### Context Compression

When relevant information exceeds available window space, compression techniques reduce token count while preserving information:

- **Summarization** — replacing raw conversation history with distilled summaries
- **Selective truncation** — dropping low-value content while preserving high-value fragments
- **Structural compression** — converting verbose formats (XML, verbose JSON) to compact representations

[Prompt Compression](../concepts/prompt-compression.md) is a subfield specifically focused on this problem. A key constraint: compression must be restorable. Keep URLs when dropping web content. Keep file paths when dropping document bodies. The reference to the content matters as much as the content itself.

### Persistent External Memory

The most durable context engineering pattern treats the filesystem (or a database) as an extension of the context window. The context window is RAM — volatile, limited, fast. The filesystem is disk — persistent, unbounded, slower to access.

The [planning-with-files](../raw/deep/repos/othmanadi-planning-with-files.md) pattern, popularized by Manus AI, codifies this into three persistent files:
- `task_plan.md` — phase definitions, progress checkboxes, decision log, error tracking
- `findings.md` — research results and external content (kept separate from plan to prevent prompt injection amplification)
- `progress.md` — chronological session log

What makes this context engineering rather than just file management is the lifecycle hooks. The PreToolUse hook fires before every tool call and reads the first 30 lines of task_plan.md:

```yaml
PreToolUse:
  - matcher: "Write|Edit|Bash|Read|Glob|Grep"
    hooks:
      - type: command
        command: "cat task_plan.md 2>/dev/null | head -30 || true"
```

This keeps goals in the most recent part of the context window, where attention is highest. The hook converts an inert file into an active attention management mechanism — injecting goals into the agent's working context at exactly the moment it's about to act.

Evaluation results for this approach: 96.7% pass rate on 30 assertions (29/30) versus 6.7% (2/30) without the skill. The improvement comes not from adding information, but from enforcing working-memory discipline through process structure. (Self-reported by the skill creator using Anthropic's skill-creator framework.)

### Multi-Component Coordination

In multi-agent systems, context engineering extends to managing what each agent sees and when. Each agent in a pipeline has its own context window. Information that needs to cross agent boundaries must be explicitly serialized and deserialized. [Agent Orchestration](../concepts/agent-orchestration.md) frameworks like [LangGraph](../projects/langgraph.md) and [CrewAI](../projects/crewai.md) provide mechanisms for this, but the allocation decisions remain the system designer's responsibility.

The [Model Context Protocol](../concepts/mcp.md) standardizes how external tools and data sources expose themselves to LLM context — a protocol-level answer to the "how do tools get into c_tools?" question.

---

## Implementation Approaches

### The Six-Component Audit

The most practical entry point: audit an existing system against the six components. For each — c_instr, c_know, c_tools, c_mem, c_state, c_query — ask:

1. What information does this component currently provide?
2. How does it get assembled into the window?
3. Is it competing for budget with higher-value components?
4. Could it be compressed, cached, or loaded progressively?

Most systems over-invest in c_instr (long system prompts) and under-invest in c_know quality and c_mem persistence.

### Skill Files as Memory

[Acontext](../raw/repos/memodb-io-acontext.md) (3,264 stars) treats agent memory as structured Markdown skill files rather than opaque vector stores. After each session, a distillation pass extracts what worked and what failed, writing the result to human-readable files following the [Agent Skills](../concepts/agent-skills.md) format. On subsequent sessions, the agent calls `get_skill` and `get_skill_file` tools to load relevant skills on demand — progressive disclosure, not semantic retrieval.

The key property: skill files are human-readable and editable. A system administrator can inspect and correct the agent's accumulated knowledge without database access. This trades retrieval sophistication for transparency and portability.

### Derived Knowledge Systems

Ars Contexta (2,928 stars) takes a different approach: generating personalized knowledge system architectures from conversation about how a user thinks and works, backed by 249 research claims about cognition and knowledge management. The output includes folder structures, processing pipelines, note templates, and automation hooks calibrated to the specific domain. The premise is that generic templates produce generic knowledge systems — context engineering works better when the context structures match the user's actual cognitive patterns.

[Source](../raw/repos/agenticnotetaking-arscontexta.md)

---

## Failure Modes

### Goal Drift

Over sessions with many tool calls, agents lose track of their original objectives. The early-context instructions become effectively invisible as the window fills with tool results and intermediate outputs. The planning-with-files pattern addresses this through mechanical re-injection. Systems without this mechanism exhibit increasingly incoherent behavior in long tasks.

### Prompt Injection via Context

External content retrieved into the context window can contain adversarial instructions. This risk compounds when retrieved content sits in components that get auto-injected frequently (like task_plan.md in the PreToolUse hook). Security-conscious context engineering keeps trusted and untrusted content in separate files with different injection policies — never auto-inject external content.

### Context Budget Exhaustion

Pre-loading too much context for anticipated needs consumes budget that actual task content requires. The opposite failure — loading too little — forces retrieval during execution, adding latency. Neither is obviously wrong without measuring actual task distributions. Systems that can't measure where their context budget goes can't optimize it.

### Compression Information Loss

Context compression that discards critical details rather than compressing them produces silently wrong outputs. The model won't report that a key constraint was lost in summarization — it will generate confident output based on incomplete information. Compression strategies need explicit preservation rules for high-value content types (constraints, error messages, exact values).

### Cache Invalidation Overhead

KV-cache benefits depend on prompt prefixes staying stable across requests. Dynamic context assembly that varies early prompt content on every call forfeits caching entirely. Systems should front-load stable content (instructions, tool definitions) and append variable content (retrieved documents, current query) to preserve cache hit rates.

---

## Relationship to Adjacent Concepts

[Retrieval-Augmented Generation](../concepts/rag.md) is the c_know component of context engineering — one piece of the full problem. [Agentic RAG](../concepts/agentic-rag.md) extends this to multi-step retrieval where the agent decides what to fetch based on intermediate results.

[Agent Memory](../concepts/agent-memory.md) covers c_mem — how information persists across sessions. The distinction between [Episodic Memory](../concepts/episodic-memory.md), [Semantic Memory](../concepts/semantic-memory.md), and [Procedural Memory](../concepts/procedural-memory.md) maps onto different storage and retrieval strategies for c_mem content.

[Chain-of-Thought](../concepts/chain-of-thought.md) and [ReAct](../concepts/react.md) are context assembly patterns — they specify how reasoning traces and action-observation pairs should be structured within the window.

[Task Decomposition](../concepts/task-decomposition.md) interacts with context engineering through scope management: decomposing tasks into subtasks allows each subtask to work with a focused, relevant context rather than carrying the full complexity of the parent task.

[Progressive Disclosure](../concepts/progressive-disclosure.md) is a specific context management strategy: loading information on demand as it becomes relevant, rather than preloading all potentially useful content.

---

## Open Questions

**Optimal compression ratios by content type.** Current compression research shows 4-8x compression with moderate information loss, but "moderate" isn't quantified for specific content types (code, legal text, conversational history). Practitioners have no principled way to set compression thresholds without empirical testing on their specific domain.

**Multi-agent context coordination.** When multiple agents share a task, context about task state needs to propagate across agent boundaries. No settled protocol exists for this. The [Model Context Protocol](../concepts/mcp.md) addresses tool exposure but not inter-agent state sharing.

**Memory system immaturity.** The survey identifies rapid evolution in memory architectures with no settled best practice. [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), [Letta](../projects/letta.md), and [Graphiti](../projects/graphiti.md) each take different architectural approaches. Systems built on any one today should expect to swap backends.

**Benchmark adequacy.** Existing benchmarks test single-session recall and retrieval accuracy. They don't adequately test cross-session synthesis, temporal reasoning over evolving facts, or multi-source conflict resolution — the capabilities that production systems actually require.

**When to compress vs. offload.** Compression keeps information in-window but degrades fidelity. Offloading to external storage preserves fidelity but requires retrieval latency. The right tradeoff depends on access frequency, information importance, and latency budget — none of which current tooling measures automatically.

---
entity_id: short-term-memory
type: concept
bucket: agent-memory
abstract: >-
  Short-term memory is the token-bounded working space of an LLM agent session —
  the active context window itself — distinct from long-term memory by its
  ephemerality and zero-retrieval-latency access.
sources:
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
related:
  - context-management
last_compiled: '2026-04-08T23:19:10.552Z'
---
# Short-Term Memory

## What It Is

Short-term memory in an LLM agent is the context window treated as a computational workspace. Every token the model attends to during a session — the system prompt, conversation history, tool call results, intermediate reasoning traces — lives in short-term memory. When the session ends, it's gone.

This definition maps loosely to human cognitive science. Lilian Weng's 2023 agent survey [draws the analogy explicitly](../articles/lil-log-llm-powered-autonomous-agents.md): "Short-term memory as in-context learning. It is short and finite, as it is restricted by the finite context window length of Transformer." Miller's 1956 capacity limit of roughly seven items has a rough equivalent here — not in item count, but in the token ceiling that bounds how much can coexist in the active window. The psychological parallel is instructive without being exact: human working memory is dynamic and reconstructive; the context window is a fixed-length buffer with deterministic attention.

Short-term memory is also the least persistent and most computationally central of the memory types in the standard taxonomy. [Episodic Memory](../concepts/episodic-memory.md) and [Semantic Memory](../concepts/semantic-memory.md) require retrieval latency and external storage. Short-term memory has neither: everything in the window is already there, already attended to.

## The Core Mechanism

A Transformer's attention mechanism attends to every token in the context window at every layer. From the model's perspective, there's no distinction between "instructions," "history," and "retrieved facts" — they're all positions in the same sequence. Short-term memory is not a separate module; it is the input sequence.

This means short-term memory management is context engineering. Whatever you put in the window, the model treats as salient. The primary operations are:

**Injection**: Inserting information at prompt construction time — system instructions, retrieved documents, tool results, prior conversation turns. This is the default operation. Every RAG system, every chat history replay, is an injection into short-term memory.

**Compression**: Summarizing or pruning earlier turns before they reach the token limit. Without compression, long conversations overflow the window; older content drops off and becomes inaccessible. The Elasticsearch agent memory article [describes this directly](../articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md): "Summarize and remove data: Clean up information the model has already used to avoid confusion (context poisoning) and keep the model focused."

**Selective retrieval**: Rather than injecting all available history, injecting only what's relevant to the current query. This is where the boundary between short-term and [Long-Term Memory](../concepts/long-term-memory.md) gets operationally interesting — retrieval from a vector store populates short-term memory, so the retrieval decision determines what the model "knows" in this session.

**Isolation**: Keeping separate context windows for separate concerns. In multi-agent systems, each subagent has its own short-term memory; the orchestrator's context doesn't bleed into a subagent's unless explicitly passed.

## Why It Matters for Agent Architecture

The [Context Engineering](../concepts/context-engineering.md) survey taxonomy treats short-term memory as the substrate everything else competes to fill. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is, mechanically, a process that writes external knowledge into short-term memory at query time. Tool call results return into short-term memory. [Chain-of-Thought](../concepts/chain-of-thought.md) reasoning is short-term memory being used as a scratchpad.

[ReAct](../concepts/react.md) makes this explicit: the Thought/Action/Observation loop accumulates in the context window over multiple steps. Each cycle writes new observations back into short-term memory, giving the model a running log of what it's tried and what happened. [Reflexion](../concepts/reflexion.md) extends this further — self-criticism gets written into the window as additional context for the next generation, up to three reflection entries before the window budget forces pruning.

[MemGPT](../projects/memgpt.md) and [Letta](../projects/letta.md) build an explicit paging model around short-term memory's limits, treating the context window like main memory in an OS and external storage like disk. Their core insight is that short-term memory capacity is a scheduling problem: what gets evicted, when, and how to retrieve it later without losing coherence.

## Failure Modes

**Context poisoning** is the primary pathology. When conversation history accumulates stale, contradictory, or irrelevant content, that material competes with current relevant content for the model's attention. The Elasticsearch article uses this term precisely: old tool results or superseded reasoning steps can actively degrade response quality, not just waste tokens.

**Lost in the middle** is the attention distribution problem: models attend more reliably to tokens near the beginning and end of a long context, with reduced reliability in the middle. [Lost in the Middle](../concepts/lost-in-the-middle.md) documents this empirically. For agents with long tool-use traces, critical information injected mid-context may be underweighted compared to the same information placed at the prompt boundary.

**Window overflow without compression** causes hard failures — the API call errors out, or the provider silently truncates input. AutoGPT's system prompt [addresses this explicitly](../articles/lil-log-llm-powered-autonomous-agents.md): "~4000 word limit for short term memory. Your short term memory is short, so immediately save important information to files." This was written when 4k was a common limit; the problem persists at 128k and 1M token windows, just at different scales.

**Context fragmentation in multi-agent systems** occurs when information needed by one agent lives in another agent's context. Without explicit message passing, subagents have isolated short-term memories and cannot access each other's working state. This is a feature for isolation but a bug for coordination.

## The Injection Architecture Problem

How you structure what goes into the context window matters more than most practitioners acknowledge. The [CLAUDE.md](../concepts/claude-md.md) convention in Claude Code illustrates one pattern: version-controlled files provide persistent, structured injection points. The `.claude/` folder is [described as infrastructure](../tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md): `rules/`, `commands/`, `skills/`, `agents/` subdirectories each contribute different content to the active context depending on the current task. This treats short-term memory setup as a deterministic, reproducible process rather than ad-hoc prompting.

The alternative — injecting everything by default — produces bloated contexts where the model attends to instructions irrelevant to the current subtask, burns tokens on overhead, and risks the lost-in-the-middle effect at scale.

Selective injection requires deciding at construction time what the current task needs. This decision is itself a form of retrieval — procedural memory (knowing which rules apply) determines what gets written into short-term memory before generation begins.

## Relationship to Other Memory Types

Short-term memory is the read/write head; other memory types are the storage. The [Agent Memory](../concepts/agent-memory.md) taxonomy positions it as follows:

- **Short-term memory**: Active context window. Zero retrieval latency. Bounded by token limit. Session-scoped.
- **[Long-Term Memory](../concepts/long-term-memory.md)**: External storage (vector DB, graph, SQL). Retrieval required. Unbounded. Persists across sessions.
- **[Episodic Memory](../concepts/episodic-memory.md)**: Specific past experiences. Retrieved selectively into short-term memory when relevant.
- **[Semantic Memory](../concepts/semantic-memory.md)**: General world knowledge. Retrieved via semantic search, injected as context.
- **[Procedural Memory](../concepts/procedural-memory.md)**: Behavioral patterns, tool usage rules. Lives in system prompts or code — always injected, rarely retrieved.
- **[Core Memory](../concepts/core-memory.md)**: In MemGPT/Letta's architecture, a persistent sub-region of the context window reserved for high-priority information that survives across turns.

The boundary between short and long-term memory is operationally where retrieval happens. [Context Compression](../concepts/context-compression.md) moves content from short-term memory to summarized long-term storage. [RAG](../concepts/retrieval-augmented-generation.md) moves content from long-term storage into short-term memory.

## Selective Retrieval as a Design Pattern

The Elasticsearch memory implementation [describes this cleanly](../articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md): selective memory injection reduces context pollution, lowers latency, and improves model focus. By filtering memories before injection — by user identity, time window, memory type — you control what the model attends to rather than letting the full history compete for attention.

This is the key design decision in short-term memory management: not how much context you can fit, but how precisely you can select what belongs there for the current task. Hybrid search (semantic + keyword + metadata filters) applied before injection gives finer control than semantic similarity alone.

[Context Management](../concepts/context-management.md) formalizes this into an operational discipline. Context graphs [extend it further](../tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md) — rather than injecting outcome data, injecting decision traces, giving the model access to the reasoning process that produced prior outcomes.

## Token Efficiency and Practical Limits

Short-term memory is expensive. Tokens in the context window cost money at inference time (for API providers) and compute at runtime. Longer contexts also increase generation latency on self-hosted models — [vLLM](../projects/vllm.md) and [Ollama](../projects/ollama.md) both show nonlinear latency increases past certain context lengths due to KV cache pressure.

The practical implication: don't treat the context window as free storage. Every injected document, every conversation turn, every tool result has a cost in tokens and attention. [Token Efficiency](../concepts/token-efficiency.md) in short-term memory management means injecting selectively, compressing aggressively when appropriate, and evicting content that's no longer task-relevant.

[Progressive Disclosure](../concepts/progressive-disclosure.md) applies here: inject minimal context first, expand on demand. Rather than front-loading everything the agent might need, structured retrieval pulls additional context as tasks unfold.

## When Short-Term Memory Is the Wrong Frame

Short-term memory as a concept breaks down at the edges:

**When sessions are meant to be stateless**: Some agent pipelines are designed to complete in a single inference call with a fully pre-constructed context. There's no "session" in the traditional sense, just an API call. Treating this as "short-term memory" adds conceptual overhead without practical benefit.

**When context windows are large enough to hold everything**: At 1M tokens, the distinction between "injecting everything" and "selective retrieval into short-term memory" collapses for many practical use cases. The retrieval layer becomes optional overhead rather than necessary architecture.

**When the real problem is long-term persistence**: If the design requirement is remembering user preferences across sessions, short-term memory management is the wrong level of abstraction. The problem is [Long-Term Memory](../concepts/long-term-memory.md) storage and retrieval, and short-term memory is just where it surfaces.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — the broader discipline of which short-term memory management is a core component
- [Context Management](../concepts/context-management.md) — operational patterns for managing what's in the window
- [Context Compression](../concepts/context-compression.md) — reducing context size while preserving information
- [Long-Term Memory](../concepts/long-term-memory.md) — the complement; persistent storage that populates short-term memory on retrieval
- [Agent Memory](../concepts/agent-memory.md) — the full taxonomy
- [Lost in the Middle](../concepts/lost-in-the-middle.md) — the attention distribution failure mode
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the primary mechanism for moving long-term memory into short-term memory
- [CLAUDE.md](../concepts/claude-md.md) — a concrete pattern for structured context injection
- [Core Memory](../concepts/core-memory.md) — MemGPT/Letta's reserved short-term memory region

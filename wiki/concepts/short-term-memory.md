---
entity_id: short-term-memory
type: concept
bucket: agent-memory
abstract: >-
  Short-term memory is an agent's active context window — all tokens currently
  loaded for inference — bounded by model capacity and lost completely when the
  session ends.
sources:
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
related:
  - context-management
  - context-engineering
  - context-management
last_compiled: '2026-04-08T03:01:41.737Z'
---
# Short-Term Memory

## What It Is

Short-term memory in an LLM agent is the context window: everything the model can attend to during a single inference pass. System prompt, conversation history, retrieved documents, tool outputs, intermediate reasoning traces — all of it competes for the same finite token budget. When a session ends, nothing persists unless explicitly written elsewhere.

The human cognition analogy maps loosely. Cognitive science defines short-term (working) memory as holding roughly 7 items for 20–30 seconds. The LLM equivalent holds far more tokens but shares the same structural constraint: capacity is fixed, and the contents expire. Lilian Weng's framing captures this directly: "Short-term memory as in-context learning. It is short and finite, as it is restricted by the finite context window length of Transformer." [Source](../raw/articles/lil-log-llm-powered-autonomous-agents.md)

Unlike [Long-Term Memory](../concepts/long-term-memory.md), which survives across sessions via external storage, short-term memory is entirely ephemeral. Unlike [Episodic Memory](../concepts/episodic-memory.md) or [Semantic Memory](../concepts/semantic-memory.md), it requires no retrieval step — the information is already present and attended to directly. That directness is the primary advantage.

## Why It Matters

Every other memory mechanism in agent architecture feeds into short-term memory at some point. Retrieved documents from a vector store, distilled episodes from a memory system, procedural instructions from a [CLAUDE.md](../concepts/claude-md.md) file — all of these become short-term memory the moment they enter the context window. The context window is where all cognition actually happens.

This makes short-term memory both the most powerful and most constrained resource in an agent system. Powerful because the model can attend to everything in it with full fidelity, without the information loss that retrieval and compression introduce. Constrained because the budget is hard-capped and every byte consumed by one thing is unavailable for another.

The [Context Engineering](../concepts/context-engineering.md) field exists largely to manage this constraint systematically. [Source](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)

## How It Works

### The Token Budget

Current frontier models offer context windows ranging from roughly 128K tokens (GPT-4-class) to 1M+ tokens (Gemini 1.5 Pro). Despite this growth, the constraint remains active in practice. Large windows slow inference, increase cost, and introduce the [Lost in the Middle](../concepts/lost-in-the-middle.md) problem, where models attend poorly to information buried in the middle of long contexts.

The context window contains several competing regions:

- **System prompt**: Instructions, persona, tool definitions, and background knowledge baked in at session start
- **Conversation history**: Prior turns in the current session
- **Retrieved context**: Documents or memories injected via [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- **Tool outputs**: Results from API calls, code execution, search
- **Intermediate reasoning**: [Chain-of-Thought](../concepts/chain-of-thought.md) traces, scratchpad content

Each of these has different costs and different returns. System prompt content costs tokens on every request. Retrieved content is paid per-query but may be irrelevant. Reasoning traces consume space during generation but may improve output quality significantly.

### State Management

LLMs are stateless. Each API call receives the full context fresh — the model has no memory of prior calls unless the caller reconstructs it. This means "short-term memory" is technically maintained by the agent framework or application, not the model itself.

A minimal implementation just appends each turn to a growing list. The Elasticsearch labs article describes this directly: "Every time you send a message, you need to include the entire chat history to 'remind' the model what happened before." [Source](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md) That list gets serialized and sent with every request until it overflows or you intervene.

More sophisticated implementations manipulate this history actively:

- **Summarization**: Compress older turns into a summary, dropping raw text
- **Selective pruning**: Remove turns judged irrelevant to the current task
- **Memory injection**: Insert retrieved long-term memories as if they were conversation history

The decision about what to keep, summarize, or discard is procedural — encoded in application logic or prompted from the model itself.

### Attention and Retrieval Within Context

Given a loaded context window, the model's attention mechanism determines which parts influence the output most. This is not uniform. Position matters: content near the beginning and end of the context receives stronger attention than content in the middle. This creates a practical design constraint — important instructions and relevant retrieved content should appear at context boundaries when possible.

Full attention across the entire window is also computationally expensive. At very long context lengths, some architectures employ sparse or sliding-window attention, which changes which parts of short-term memory are effectively visible to the model at generation time.

## Relationship to Other Memory Types

Short-term memory sits at the center of a broader [Agent Memory](../concepts/agent-memory.md) architecture:

- **[Long-Term Memory](../concepts/long-term-memory.md)** stores information across sessions. Retrieval pulls relevant content from long-term memory into short-term memory when needed. Without this promotion step, long-term memory is inaccessible.
- **[Episodic Memory](../concepts/episodic-memory.md)** captures specific past experiences. When retrieved and injected into context, episodic memories become short-term memory for the duration of that session.
- **[Semantic Memory](../concepts/semantic-memory.md)** holds generalized world knowledge. RAG systems retrieve semantic content into context; the model also has semantic knowledge baked into weights, which doesn't consume context tokens.
- **[Procedural Memory](../concepts/procedural-memory.md)** defines how the agent behaves. In practice this lives in the system prompt — which is short-term memory — or in application code that constructs the context.

The CoALA (Cognitive Architectures for Language Agents) framework formalizes these distinctions, but in implementation they all converge on the same question: what tokens are in the context window right now, and why? [Source](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md)

## Context Pollution and Degradation

A specific failure mode: context pollution. As sessions extend, the context accumulates irrelevant, outdated, or contradictory information. A memory from early in a conversation may conflict with new information. Resolved sub-tasks still occupy tokens. The model's effective reasoning quality degrades as signal-to-noise ratio drops.

Three interventions address this:

1. **Summarization and pruning**: Remove raw history, replace with compressed summaries. This reduces tokens but loses detail.
2. **Selective retrieval**: Instead of injecting all past context, retrieve only what's relevant to the current query. The Elasticsearch example demonstrates this with episodic memory filtered by identity, role, and recency. [Source](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md)
3. **Context reset with injection**: Start a fresh context, but inject relevant memories and state from a structured store. [MemGPT](../projects/memgpt.md) and [Letta](../projects/letta.md) implement this pattern explicitly, treating the context window as a managed resource with explicit paging.

AutoGPT's original system prompt acknowledged this constraint directly: "~4000 word limit for short term memory. Your short term memory is short, so immediately save important information to files." [Source](../raw/articles/lil-log-llm-powered-autonomous-agents.md) That instruction — telling the model to externalize information — is how early agent systems tried to bridge short-term and long-term memory.

## Implementation Patterns

### Explicit Context Architecture

Structured projects like those using Claude Code organize their context deliberately. The `.claude/` folder pattern treats context construction as infrastructure: `CLAUDE.md` provides persistent instructions, `rules/` subdirectories handle domain-specific behavior, and `commands/` encode repeatable workflows. [Source](../raw/tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md) Each of these files becomes short-term memory when loaded into context, so their design directly affects what the agent can attend to during a session.

### Frameworks

[LangChain](../projects/langchain.md) provides `ConversationBufferMemory`, `ConversationSummaryMemory`, and `ConversationBufferWindowMemory` — three progressively more aggressive approaches to managing the history accumulation problem. Buffer keeps everything, summary compresses old content, window keeps only the last N turns.

[LangGraph](../projects/langgraph.md) models agent state as a graph, where each node can read and write to a shared state object. Short-term memory is represented as that state — structured rather than a flat message list, with explicit control over what persists across steps.

[MemGPT](../projects/memgpt.md) takes the most explicit approach: the LLM itself manages its context window through tool calls, deciding what to store, retrieve, and evict. The context window becomes a managed working set rather than a passively accumulating buffer.

### Multi-Agent Context

In [Multi-Agent Systems](../concepts/multi-agent-systems.md), each agent maintains its own context window. Messages between agents — tool calls, results, delegated subtasks — must be serialized and passed explicitly. No agent can attend directly to another agent's working memory. This creates coordination overhead and means information shared between agents passes through the bottleneck of language, losing any internal representations that weren't verbalized.

[Context Graphs](../concepts/context-graphs.md) address a related problem at the organizational level: capturing decision context that would otherwise exist only in individual agents' ephemeral short-term memory, never reaching a persistent store where others can learn from it. [Source](../raw/tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md)

## Practical Constraints

**Cost**: Tokens in context cost money per request. A 100K-token context on a frontier model costs substantially more per call than a 10K-token context. For high-frequency agents, context bloat translates directly to operational cost.

**Latency**: Time-to-first-token scales with context length. Long contexts produce noticeably slower responses even with cached prefills.

**Attention quality**: The [Lost in the Middle](../concepts/lost-in-the-middle.md) phenomenon is well-documented: models perform worse on tasks requiring recall of information from the middle of long contexts. Position in the context window affects effective accessibility.

**Model-specific limits**: Different models have different absolute limits, and performance can degrade before the hard limit is reached. A model rated for 128K tokens may produce noticeably worse outputs on tasks requiring deep attention to a 100K context.

## When Short-Term Memory Alone Is Insufficient

Single-session tasks with bounded information requirements — code review, document editing, question answering over a small corpus — fit comfortably in short-term memory alone. The moment a task requires information from prior sessions, accumulates state faster than the context window can absorb, or needs to share memory across concurrent agents, short-term memory needs external support.

Signs you've hit the limit:
- The agent starts forgetting information from earlier in the same conversation
- Context costs dominate operational budget
- The agent needs to "remember" user preferences or past decisions across sessions
- Multiple agents need access to the same working state

At that point, the architecture needs [Long-Term Memory](../concepts/long-term-memory.md) with retrieval, [Context Compression](../concepts/context-compression.md), or a memory management layer that treats the context window as a paged working set rather than an ever-growing buffer.

## Related Concepts

- [Context Management](../concepts/context-management.md): The practices and mechanisms for controlling what occupies short-term memory
- [Context Engineering](../concepts/context-engineering.md): The broader discipline of optimizing information payloads for LLMs
- [Long-Term Memory](../concepts/long-term-memory.md): Persistent storage that survives session boundaries
- [Context Compression](../concepts/context-compression.md): Techniques for reducing context size while preserving relevant information
- [Lost in the Middle](../concepts/lost-in-the-middle.md): The attention degradation problem for mid-context information
- [Agent Memory](../concepts/agent-memory.md): The full taxonomy of memory types in agent architectures
- [Core Memory](../concepts/core-memory.md): MemGPT's always-in-context persistent memory block

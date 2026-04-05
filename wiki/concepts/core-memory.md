---
entity_id: core-memory
type: concept
bucket: agent-memory
sources:
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
related:
  - Retrieval-Augmented Generation
  - Episodic Memory
  - Semantic Memory
  - Agent Memory
last_compiled: '2026-04-04T21:19:23.425Z'
---
# Core Memory

## What It Is

Core memory is a persistent, always-in-context memory store that holds fundamental facts an agent needs to function effectively—things like the user's name, preferences, goals, and the agent's own persona and instructions. Unlike retrieved memories that are fetched on demand, core memory is *always present* in the agent's context window, making it immediately available without retrieval steps.

The concept was popularized by MemGPT's tiered memory architecture, which drew an explicit analogy to operating system memory hierarchies: core memory is like RAM—small, fast, always accessible—while other memory types are more like disk storage.

## Why It Matters

Most agent failures stem from the agent not knowing basic facts about who it's talking to or what it's supposed to be doing. Core memory solves this by ensuring that a stable set of identity and user facts is never "forgotten" due to context window limitations. Without it, every session starts from scratch.

The tradeoff is real: because core memory occupies context window space unconditionally, it must be kept small and carefully curated. Storing too much defeats the purpose—you've just moved the context window problem to a different layer.

## How It Works

Core memory is typically structured as a few named blocks or sections, for example:

- **Persona block**: Who the agent is, its communication style, its purpose
- **Human block**: Key facts about the user—name, occupation, stated preferences, ongoing goals

These blocks are loaded into the system prompt or a privileged section of context on every turn. In architectures like MemGPT/Letta, the agent can *edit* core memory during a conversation using special tool calls (e.g., `core_memory_append`, `core_memory_replace`), allowing it to update facts as it learns them.

**Concrete example:**
```
[CORE MEMORY - HUMAN]
Name: Sarah
Occupation: Software engineer at a fintech startup
Current goal: Preparing for a staff engineering interview
Preferred communication: Direct, technical, skip the pleasantries
```

This block would appear in every prompt, so the agent never needs to re-ask Sarah what she does for work.

## Who Implements It

- **MemGPT / Letta**: The originating architecture; core memory is a first-class primitive with explicit read/write tool calls
- **MIRIX**: Implements a six-type memory architecture where core memory is one of six specialized stores (alongside episodic, semantic, procedural, resource, and knowledge vault), routed by a multi-agent system rather than searched via flat vector index [Source](../../raw/repos/mirix-ai-mirix.md)
- **Mem-α**: Treats core memory as a learnable target—agents trained via RL decide *what* deserves to be in core memory versus episodic or semantic stores based on task feedback, rather than using fixed encoding rules [Source](../../raw/repos/wangyu-ustc-mem-alpha.md)

## Relationship to Other Memory Types

Core memory is part of a broader [Agent Memory](../concepts/agent-memory.md) architecture:

- **[Episodic Memory](../concepts/episodic-memory.md)**: Past interaction logs, retrieved by recency or relevance—not always present
- **[Semantic Memory](../concepts/semantic-memory.md)**: Factual knowledge about the world, typically retrieved via RAG
- **Core memory**: The intersection of what's *always needed* and *specific to this user/agent pair*

## Practical Implications

**What belongs in core memory:**
- User's name, role, primary goals
- Agent persona and behavioral constraints
- Active project context (short-term)
- Explicit user preferences that affect every interaction

**What doesn't belong:**
- Detailed conversation history (use episodic memory)
- General world knowledge (use semantic memory / RAG)
- Infrequently-needed facts (retrieve on demand)

## Limitations

- **Size constraint**: Core memory is bounded by context window budget. In practice, well-curated core memory is typically a few hundred to low thousands of tokens.
- **Staleness**: If facts change (user changes jobs, goals shift), core memory must be actively updated. Systems without edit mechanisms will carry stale facts indefinitely.
- **What to include is hard**: Deciding what rises to the level of "core" requires judgment—either from the user, a heuristic, or a learned policy like Mem-α's RL approach.
- **No retrieval = no filtering**: Everything in core memory is always present whether relevant to the current query or not, which can dilute attention on large-context models.

## Alternatives and Complements

- **Dynamic context injection**: Some systems skip dedicated core memory and instead retrieve user facts via RAG on each turn—simpler but introduces latency and miss risk
- **System prompt engineering**: Manually authored system prompts serve a similar function but don't update dynamically
- **User profiles in databases**: Structured user records retrieved at session start—functionally equivalent but less integrated with the agent's memory model


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.4)
- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.6)
- [Semantic Memory](../concepts/semantic-memory.md) — part_of (0.6)
- [Agent Memory](../concepts/agent-memory.md) — part_of (0.8)

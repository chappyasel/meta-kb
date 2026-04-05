---
entity_id: semantic-memory
type: concept
bucket: agent-memory
sources:
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
related:
  - Retrieval-Augmented Generation
  - Episodic Memory
  - Long-Term Memory
  - Core Memory
  - Procedural Memory
last_compiled: '2026-04-04T21:16:54.838Z'
---
# Semantic Memory

## What It Is

Semantic memory is a type of long-term agent memory that stores **general factual knowledge, concepts, and world understanding**—decoupled from any specific interaction or episode. The term is borrowed from cognitive psychology, where semantic memory covers things like "Paris is the capital of France" rather than "I remember visiting Paris in 2019" (which would be [episodic memory](../concepts/episodic-memory.md)).

In agent systems, semantic memory acts as a persistent knowledge base the agent can query when it needs factual grounding, domain expertise, or general reasoning support.

## Why It Matters

LLMs have implicit "parametric" semantic memory baked into their weights, but this knowledge is static, potentially outdated, and hard to audit or update. Externalizing semantic memory into a queryable store addresses several practical problems:

- **Staleness**: Facts change; weights don't update at runtime
- **Hallucination**: Agents confabulate when uncertain; an explicit store can return nothing rather than a guess
- **Auditability**: You can inspect, correct, and version what the agent "knows"
- **Scope control**: Different agents or users can have different knowledge bases without retraining

## How It Works

Semantic memory is most commonly implemented via **Retrieval-Augmented Generation (RAG)**:

1. Facts are chunked, embedded, and stored in a vector database (or hybrid store like Elasticsearch)
2. At inference time, the agent embeds its query and retrieves relevant chunks
3. Retrieved content is injected into the prompt as context

The Elasticsearch Labs article highlights a key architectural concern: naive RAG treats all memory as a flat index, which causes **context pollution**—irrelevant facts crowd out relevant ones. Their solution is to route queries to memory-type-specific stores and filter by identity/role, so semantic queries don't surface episodic noise and vice versa. [Source](../../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md)

## Who Implements It

Several systems make semantic memory a first-class component:

**MIRIX** explicitly separates six memory types, with Semantic Memory as its own dedicated store (alongside Episodic, Procedural, Core, Resource, and Knowledge Vault). Queries are routed to the appropriate specialist rather than searching a flat vector index. This improves retrieval precision because domain-specific knowledge doesn't compete with activity logs or procedural instructions. [Source](../../raw/repos/mirix-ai-mirix.md)

**Mem-α** takes a different angle: rather than hard-coding what goes into semantic memory, it trains an RL agent to decide *when* to encode information as semantic vs. episodic vs. core memory based on task feedback. This suggests that the boundary between memory types may itself be learnable rather than fixed. [Source](../../raw/repos/wangyu-ustc-mem-alpha.md)

**Elasticsearch-backed agents** implement semantic memory as a structured retrieval layer with isolation by user/agent context, enabling multi-tenant deployments where different principals have different knowledge bases. [Source](../../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md)

## Relationship to Other Memory Types

| Memory Type | Stores | Example |
|---|---|---|
| **Semantic** | General facts, concepts | "Python uses indentation for blocks" |
| [Episodic](../concepts/episodic-memory.md) | Specific past interactions | "User asked about Python last Tuesday" |
| [Procedural](../concepts/procedural-memory.md) | How to do things, workflows | "To debug: first check logs, then..." |
| [Core Memory](../concepts/core-memory.md) | Identity, persistent persona facts | "User's name is Alex; prefers brevity" |

Semantic and episodic memory are the most commonly confused pair. The distinction is: semantic memory is **context-free** (the fact is true regardless of when/where it was learned), while episodic is **context-bound** (it records a specific event).

## Practical Implications

- **Chunking strategy matters**: Semantic facts are typically more atomic than episodic narratives; over-chunking loses relational context, under-chunking degrades retrieval precision
- **Updates are non-trivial**: Correcting a stale fact requires finding and replacing the specific chunk(s), not just appending—vector stores don't naturally handle versioning
- **Routing is harder than it looks**: Systems like MIRIX that route by memory type need a reliable classifier deciding whether a query is semantic vs. episodic; errors in routing degrade both stores
- **Parametric vs. retrieved knowledge conflicts**: When the LLM's baked-in knowledge contradicts what's in the semantic store, the model may ignore retrieved content—prompt engineering or fine-tuning is needed to prioritize retrieved facts

## Limitations

- Standard RAG-based semantic memory struggles with multi-hop reasoning (fact A + fact B → conclusion C requires either chunking both facts together or multi-step retrieval)
- No standard for what "belongs" in semantic memory vs. other stores; boundary decisions are system-specific and often ad hoc
- Semantic memory scales poorly with very large corpora unless chunking, indexing, and retrieval are carefully tuned
- The Mem-α finding that memory-type boundaries are learnable implies our current static categorizations may not be optimal [Source](../../raw/repos/wangyu-ustc-mem-alpha.md)

## Related

- [Long-Term Memory](../concepts/long-term-memory.md)
- Retrieval-Augmented Generation
- [Episodic Memory](../concepts/episodic-memory.md)
- [Core Memory](../concepts/core-memory.md)
- [Procedural Memory](../concepts/procedural-memory.md)

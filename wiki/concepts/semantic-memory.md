---
entity_id: semantic-memory
type: concept
bucket: agent-memory
sources:
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/caviraoss-openmemory.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/infiniflow-ragflow.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related: []
last_compiled: '2026-04-05T05:23:27.803Z'
---
# Semantic Memory

## What It Is

Semantic memory stores general knowledge: facts, concepts, relationships, and domain information that hold true independent of when or how they were learned. An agent that knows "the speed of light is approximately 299,792 km/s" or "Python functions are defined with the `def` keyword" holds that knowledge as semantic memory. It has no timestamp, no personal context, no originating conversation.

The term comes from cognitive psychology, where it contrasts with episodic memory (memories of specific personal events). In agent systems, the distinction carries practical weight: episodic memory decays, requires contextual filtering, and belongs to a user or session. Semantic memory is shared, stable, and context-independent.

## Why It Matters for Agents

LLMs have semantic knowledge baked into their weights through pretraining, but that knowledge is frozen at training time and opaque to inspection or update. External semantic memory gives agents a mutable, queryable knowledge store they can read from and write to at runtime.

This matters in three scenarios:

**Domain specialization.** A medical agent needs current drug interaction data. A legal agent needs jurisdiction-specific statute text. Neither lives reliably in a general-purpose LLM's weights, and both change over time.

**Cross-session persistence.** An agent that learns "this customer's company uses Kubernetes 1.28 on-premise" should retain that fact across sessions without re-learning it from episodic history every time.

**Shared knowledge across agent instances.** In multi-agent systems, semantic memory acts as a common knowledge base. Individual agents accumulate episodic experience, but semantic facts are available to all agents without propagating through conversation history.

## How It Works

### Storage

Semantic memory entries are typically stored as vector embeddings alongside structured metadata. The Elasticsearch implementation described in [this article](../../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md) uses `semantic_text` multi-field mapping, which enables both BM25 full-text search and vector similarity against the same content. This hybrid retrieval matters because semantic queries ("what's the policy on remote work?") benefit from concept-level matching rather than keyword overlap.

Unlike episodic memories, semantic entries carry minimal temporal metadata. A company handbook entry doesn't need a timestamp the way a conversation summary does.

### Retrieval

Retrieval strategy for semantic memory differs from episodic memory in a key way: it favors recall over precision. When an agent queries episodic memory, tight filters (user identity, time window, session context) prevent cross-contamination. Semantic queries want broad surface area. A question about SSL certificate configuration should surface relevant documentation even if phrased differently from how the content was stored.

In the Elasticsearch architecture, semantic memory serves a `GetKnowledge` function distinct from `GetMemories`. The agent routes queries to the appropriate store based on whether it needs world-knowledge grounding or specific experiential recall. The Mirix system [makes this routing explicit](../../raw/repos/mirix-ai-mirix.md) by dedicating a `semantic_memory_agent` to this store, separate from `episodic_memory_agent` and `knowledge_vault_memory_agent`.

### Construction

The harder problem is deciding what goes into semantic memory. Three approaches exist:

**Pre-loaded corpora.** Documentation, product manuals, policy documents, and reference material loaded at setup time. Static and reliable but doesn't grow with use.

**Human-specified extraction.** Users or developers explicitly mark facts as semantic-level knowledge ("remember that our deployment window is Thursdays between 2-4 AM").

**RL-learned construction.** Mem-α, described in [this repo analysis](../../raw/repos/wangyu-ustc-mem-alpha.md), trains an agent to decide dynamically which information to route to semantic versus episodic versus core memory. The agent learns these decisions through reinforcement on task performance rather than following fixed rules. Trained on 30k-token contexts, it generalizes to 400k+ tokens. Whether this approach improves over simpler heuristics in production systems is not yet established by independent benchmarks.

## The Separation Problem

The boundary between semantic and episodic memory is blurry in practice. "This user prefers Python over JavaScript" sits somewhere between the two: it's a generalized fact (semantic character) derived from observed interactions (episodic origin). Systems handle this differently.

Mirix introduces a "Knowledge Vault" as a sixth memory type, separate from both semantic and episodic stores, suggesting the taxonomy doesn't cleanly cover all cases. Mem-α lets the RL-trained agent decide which bucket to use, implicitly acknowledging that humans and system designers don't agree on the right answer.

This ambiguity creates retrieval problems. If user-specific learned facts get stored as semantic memory, they may surface in wrong contexts. If they get stored as episodic memory, they require tight identity filters to retrieve, which adds latency and filter logic complexity.

## Implementation Patterns

### Flat Vector Index

The simplest pattern: all semantic knowledge goes into one vector store, retrieved by cosine similarity. Works for small corpora. Degrades as knowledge grows because low-relevance entries consume context window space.

### Typed Routing

Query different stores based on query classification. The Elasticsearch example routes through a `GetKnowledge` tool for semantic retrieval and `GetMemories` for episodic, with the LLM deciding which to call. This keeps stores separate but puts classification burden on the LLM.

### Specialized Agents

Mirix assigns a dedicated `semantic_memory_agent` that handles all reads and writes to the semantic store. Other agents request knowledge through this agent rather than querying the store directly. Adds latency and coordination overhead; gains consistency in how knowledge is stored and indexed.

## Failure Modes

**Staleness.** Semantic memory that was accurate when loaded becomes wrong. An agent citing a deprecated API, an outdated pricing tier, or a policy that changed six months ago provides confident but incorrect answers. Unlike episodic memory, semantic entries have no natural expiration signal.

**Retrieval mismatch.** Embeddings capture semantic similarity, not logical entailment. A query about "service downtime SLA" may not surface a document titled "availability commitments" even though they cover the same ground. Hybrid search (BM25 + vector) reduces this but doesn't eliminate it.

**Contamination from over-broad writes.** If an agent stores user-specific beliefs into shared semantic memory, those beliefs become available to other agents or other users. This is the symmetric problem to episodic memory isolation: episodic stores need tight user filters to prevent cross-contamination; semantic stores need careful write policies to prevent personal facts from becoming global facts.

**Context flooding.** Broad-recall retrieval means more results. More results mean larger prompts. The Elasticsearch article notes that selective retrieval directly reduces token usage and improves model focus. Unrestricted semantic retrieval undermines this advantage.

## Practical Implications

When building an agent system, semantic memory is the right store for:
- Reference documentation that multiple sessions need
- Domain rules and constraints that don't belong to any user
- Ontologies and taxonomies the agent reasons over
- Facts with long half-lives

Episodic memory is the right store for:
- User preferences learned through interaction
- Conversation summaries
- Task-specific context that expires when the task ends

The decision to store something in semantic memory should be more deliberate than episodic storage. Episodic memories are naturally scoped; semantic memories are globally visible and require active maintenance to stay accurate.

For systems where knowledge freshness matters, build an explicit update pipeline. Treating semantic memory as write-once creates technical debt that compounds as the knowledge base ages.

## Related Concepts

Semantic memory connects to several adjacent problems in agent design. Retrieval-Augmented Generation is the most common instantiation: a vector database holding semantic knowledge, queried at inference time. The memory framing adds lifecycle management (what to store, when to update, when to expire) that pure RAG implementations often skip.

The CoALA framework (Cognitive Architectures for Language Agents) formalizes the procedural/episodic/semantic taxonomy. The Elasticsearch article references this as theoretical grounding for the three-store architecture.

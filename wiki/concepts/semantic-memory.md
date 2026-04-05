---
entity_id: semantic-memory
type: concept
bucket: agent-memory
abstract: >-
  Semantic memory in AI agents stores stable factual knowledge (concepts, rules,
  world facts) across sessions, distinct from event records (episodic) or skill
  knowledge (procedural). Primary implementation mechanism: vector databases
  with embedding-based retrieval.
sources:
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/caviraoss-openmemory.md
  - repos/letta-ai-lettabot.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/caviraoss-openmemory.md
related:
  - Retrieval-Augmented Generation
  - Episodic Memory
  - Procedural Memory
  - Vector Database
  - Mem0
  - Core Memory
  - Cognitive Architecture
last_compiled: '2026-04-05T20:24:55.917Z'
---
# Semantic Memory

## What It Is

Semantic memory is the memory subsystem responsible for storing general, context-independent factual knowledge. In cognitive psychology, the term originates with Endel Tulving (1972), who distinguished it from episodic memory: semantic memory holds facts like "Paris is the capital of France," while episodic memory holds events like "I visited Paris in 2019." The distinction matters because these two memory types have different stability profiles, retrieval characteristics, and decay rates.

In AI agent systems, this distinction maps directly to architecture decisions: what gets stored where, how it gets retrieved, and how long it persists. Semantic memory in agents typically contains:

- Domain facts and world knowledge ("the Eiffel Tower is 330 meters tall")
- User-provided or extracted factual assertions ("the user works at Acme Corp")
- Stable relational facts between entities ("Alice manages Bob")
- Concept definitions and category memberships

The distinguishing feature is **stability**: semantic facts are expected to remain true across sessions, unlike episodic records (which are time-bounded) or procedural knowledge (which describes how to do things rather than what is true).

## Why It Matters for Agents

Without semantic memory, agents face two failure modes. First, they lose factual context between sessions — the user re-explains the same background repeatedly, and the agent has no persistent model of the user's situation. Second, they stuff ever-growing context into the prompt, hitting context window limits and degrading reasoning quality with irrelevant details.

Semantic memory solves both by maintaining a searchable store of stable facts that gets selectively retrieved into context. A 115K-token conversation compressed to ~1.6K tokens via memory retrieval is not a marginal improvement — it changes the cost structure and latency of the entire application. The Graphiti paper (arXiv:2501.13956) measured 89-91% latency reduction from this compression while improving accuracy on complex multi-session QA tasks.

The retrieval precision matters. Episodic records clutter semantic search results because they share vocabulary with facts. A memory system that distinguishes "the user prefers Python" (semantic) from "the user said they prefer Python on March 3rd during a debugging session" (episodic) can serve tighter, more relevant context.

## How It Works: Implementation Patterns

### Flat Vector Store (Most Common)

The simplest implementation: extract facts from conversation, embed them, store in a vector database, retrieve by cosine similarity at query time. Most production systems (mem0, OpenMemory's semantic tier) use this baseline.

**Extraction**: An LLM parses conversation turns into atomic fact strings. Mem0's extraction prompt produces structured facts like `["user works at Google", "user is 32 years old"]`. These are de-duplicated against existing facts using an integer-candidate-mapping pattern — the LLM receives existing memories as numbered candidates and returns `"update 3"` or `"new"` rather than manipulating raw text.

**Storage**: Each fact string gets embedded (typically 1024-1536 dimensions) and stored alongside metadata (user_id, timestamp, source). Vector databases like Qdrant, Weaviate, or pgvector handle the similarity index.

**Retrieval**: Query embedding → cosine similarity search → top-K facts injected into system prompt. Most implementations add BM25 keyword search as a second signal, then merge results by reciprocal rank fusion (RRF).

The limitation: flat facts lose relational structure. "Alice manages Bob" and "Bob manages Carol" are two unrelated vectors. Traversing the management chain requires inference from context, not direct graph lookup.

### Knowledge Graph (Richer Structure)

Graphiti ([Source](../raw/deep/repos/getzep-graphiti.md)) stores semantic knowledge as typed triples: `EntityNode → EntityEdge → EntityNode`. Each edge carries a relation type (WORKS_AT, MANAGES, LIVES_IN), a natural language description, and bi-temporal bounds (`valid_at`, `invalid_at`).

The graph structure enables queries that flat stores cannot serve efficiently: "What entities are connected to Alice within 2 hops?" uses breadth-first graph traversal rather than repeated embedding lookups. The community detection layer (label propagation) groups strongly connected entities and generates LLM-written summaries of each cluster, creating a third tier of semantic abstraction above individual facts.

Semantic memory in Graphiti lives in the `EntityNode` and `EntityEdge` structures (`graphiti_core/nodes.py`, `graphiti_core/edges.py`). The entity extraction prompt in `prompts/extract_nodes.py` explicitly forbids extracting abstract concepts, bare pronouns, or generic nouns — forcing extracted entities to be specific enough to form a meaningful knowledge graph. Episodic records (raw messages) are kept separate in `EpisodicNode` structures, preserving the semantic/episodic boundary at the data model level.

### Tiered Memory with Type Routing

Some systems formalize the boundary between memory types in their data model. Mem-alpha ([Source](../raw/deep/repos/wangyu-ustc-mem-alpha.md)) implements a three-tier store with explicit types:

```python
class Memory:
    core: str = ""                    # Max 512 tokens, always in prompt
    semantic: List[Dict[str, str]]    # Factual knowledge, BM25 + embedding search
    episodic: List[Dict[str, str]]    # Time-bounded events, same search
```

The semantic store holds general facts extracted from source text. The episodic store holds specific events with timestamps and context. Core memory holds a 512-token summary of essential invariants, always injected into the system prompt without retrieval.

Notably, Mem-alpha does not use hardcoded heuristics to classify content into these tiers. Instead, a 4B-parameter model trained via GRPO (Group Relative Policy Optimization) learns to make classification decisions by observing what memory configurations enable downstream QA accuracy. The memory agent receives text chunks and emits tool calls: `new_memory_insert("semantic", content)` or `new_memory_insert("episodic", content)`. The RL reward signal — QA accuracy plus a compression penalty — teaches the agent that stable facts belong in semantic memory while time-bounded events belong in episodic. Trained on 30K-token contexts, this generalizes to 400K+ tokens.

OpenMemory ([Source](../raw/deep/repos/caviraoss-openmemory.md)) uses regex pattern matching for classification in its Hierarchical Sector Graph (HSG). Semantic memories match patterns like factual assertions, definitions, and relationships. Each sector carries a distinct decay lambda (semantic: 0.005, the slowest of all tiers, reflecting factual persistence), a retrieval weight multiplier, and cross-sector relationship strengths encoded in an adjacency matrix.

### RAG as Semantic Memory Substrate

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is the most widely deployed form of semantic memory at scale. A document corpus gets chunked, embedded, and indexed; queries retrieve relevant chunks at inference time. The core loop is identical to agent semantic memory: embed → retrieve → inject into context.

The difference is organizational scope. RAG typically operates on a fixed external corpus (documentation, knowledge bases). Agent semantic memory operates on dynamically accumulated facts extracted from interactions. In practice, many systems combine both: static RAG indexes for world knowledge, dynamic semantic memory stores for user-specific facts.

## Decay, Persistence, and Freshness

A key property that distinguishes semantic memory from a plain key-value store is **differential decay**. Episodic memories should fade faster than semantic facts — specific event details become irrelevant while factual knowledge persists. OpenMemory implements this with per-sector exponential decay rates: semantic memories decay at lambda=0.005, episodic at lambda=0.015, emotional at lambda=0.02. The dual-phase formula models the Ebbinghaus forgetting curve: rapid initial decay followed by a consolidated residual with much slower attenuation.

Graphiti handles obsolescence differently: contradicted facts are not deleted but expire. An edge gets `expired_at` set to the current timestamp when a new fact contradicts it. This preserves the full temporal history of what was believed when, enabling point-in-time queries ("Where did Alice work in 2022?"). The distinction matters for applications requiring audit trails or temporal reasoning.

Both approaches acknowledge that semantic memory is not immutable. Facts change — people change jobs, companies change names, procedures get updated. A memory system that cannot represent change accumulates stale information silently.

## Retrieval Mechanisms

Semantic memory retrieval in practice uses three complementary signals:

**Vector similarity** (semantic): Embedding-based cosine similarity captures paraphrase equivalence. "Alice's employer" matches "where Alice works" even without shared tokens. Standard choice for semantic memory retrieval.

**BM25 / fulltext** (lexical): Keyword matching captures exact entity names, technical terms, and proper nouns that embedding models may not represent distinctively. A query for "Qwen3-4B" retrieves documents containing that exact string even if the embedding is coarse.

**Graph traversal** (structural): In knowledge graph implementations, breadth-first traversal from seed entities surfaces contextually related facts that share no textual similarity with the query. "What does Alice's manager think about the project?" can reach Bob's opinions by traversing the MANAGES edge from Alice.

Most production systems combine these via reciprocal rank fusion, which merges ranked lists without requiring score normalization across methods.

## Interaction with Other Memory Types

Semantic memory does not operate in isolation. The cognitive architecture framing ([Cognitive Architecture](../concepts/cognitive-architecture.md)) positions it alongside:

- **[Episodic Memory](../concepts/episodic-memory.md)**: Event records that ground semantic facts in specific interactions. "Alice works at Acme" (semantic) may have been established during an episodic event (a specific conversation). Graphiti maintains provenance links from semantic edges back to the source episodes.
- **[Procedural Memory](../concepts/procedural-memory.md)**: Skill and process knowledge. Semantic memory answers "what is true"; procedural answers "how to do it."
- **[Core Memory](../concepts/core-memory.md)**: A small always-present summary. Core memory often distills the most critical semantic facts (user's role, project context, key preferences) so they never require retrieval.

The Graphiti community detection layer provides a fourth tier: cluster summaries aggregate related entities into higher-level semantic abstractions, mirroring the psychological distinction between specific factual knowledge and broader conceptual understanding.

## Implementation Systems

| System | Storage Backend | Semantic Memory Representation | Classification Method |
|--------|----------------|-------------------------------|----------------------|
| Graphiti | Neo4j/FalkorDB/Kuzu/Neptune | Typed entity-relationship triples with bi-temporal edges | LLM extraction with explicit entity-type ontology |
| Mem0 | Qdrant/Chroma/Pinecone | Flat atomic fact strings | LLM extraction with dedup |
| Mem-alpha | In-memory + numpy embeddings | Keyed string entries with dual search | RL-trained 4B model (GRPO) |
| OpenMemory | SQLite + pgvector/Valkey | HSG entries with sector classification | Regex pattern matching |
| Mirix ([Source](../raw/repos/mirix-ai-mirix.md)) | PostgreSQL + vector | Dedicated semantic memory agent with structured storage | Dedicated LLM agent per memory type |

## Failure Modes

**Stale fact accumulation**: Without expiration or contradiction detection, semantic stores accumulate outdated facts. A user who changed jobs 18 months ago still appears as working at their previous employer. Systems that only append never detect this.

**Over-extraction producing noise**: Aggressive fact extraction converts episodic details into semantic facts. "The user was tired on Tuesday" becomes a permanent semantic assertion. OpenMemory's reflection system partially addresses this by periodically clustering and consolidating memories, pruning low-salience entries.

**Retrieval precision at scale**: As semantic stores grow, query precision degrades. A store with 10K facts will return more irrelevant results than one with 1K facts, even with good embedding models. Graphiti's community detection provides a coarser retrieval tier for broad queries, but flat vector stores have no equivalent.

**Sector misclassification**: Systems using heuristic routing (regex, keyword matching) misclassify facts whose surface form does not match the expected pattern. A procedural fact phrased as a historical observation ("historically we've handled this by...") may land in episodic storage with faster decay. The Mem-alpha approach of learning classification from QA feedback directly addresses this, but requires RL training infrastructure.

**Embedding provider lock-in**: Switching embedding providers mid-deployment breaks all existing vectors. Cosine similarity between embeddings from different models is meaningless. Any semantic memory system accumulating facts over months faces this migration cost.

## When Not to Use Structured Semantic Memory

For single-session tasks under ~32K tokens, full context is cheaper and more accurate than any retrieval system. Graphiti's own benchmarks show a 17.7% regression on single-session assistant tasks where the full conversation fit comfortably in context.

For static corpora that never change, standard RAG with periodic re-indexing is simpler to operate than a dynamic semantic memory system. Semantic memory's value compounds over time through incremental fact accumulation; it adds infrastructure cost without proportional benefit for one-shot retrieval.

For teams without the operational capacity to run a graph database (Neo4j, FalkorDB) or manage embedding model consistency, flat vector memory with periodic re-extraction is more maintainable even if less expressive.

## Unresolved Questions

**Optimal granularity for fact extraction**: Should "Alice is a senior engineer at Acme Corp who joined in 2021 and focuses on backend infrastructure" be stored as one fact or four? Finer granularity improves retrieval precision but increases storage and extraction LLM cost. No consensus exists, and most systems tune this empirically per domain.

**Conflict resolution at scale**: When two sources assert contradictory facts, which wins? Graphiti's rule is "newer information supersedes older," implemented via LLM judgment in the `resolve_extracted_edges` pipeline stage. But LLM-based contradiction detection can fail silently, leaving contradictory facts coexisting without resolution.

**Cross-user semantic knowledge**: Facts about the world (not just a specific user) could be shared across users. But most current systems maintain per-user semantic stores, re-extracting the same world knowledge for every user. Shared knowledge graphs would reduce cost but introduce access control complexity.

**Evaluation methodology**: No standard benchmark specifically measures semantic memory retrieval quality over long time horizons with contradictions and updates. LongMemEval tests multi-session recall but does not specifically stress semantic-vs-episodic boundary cases or temporal contradiction handling.

## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Procedural Memory](../concepts/procedural-memory.md)
- [Core Memory](../concepts/core-memory.md)
- [Vector Database](../concepts/vector-database.md)
- [Cognitive Architecture](../concepts/cognitive-architecture.md)

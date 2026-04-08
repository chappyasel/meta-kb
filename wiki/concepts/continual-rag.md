---
entity_id: continual-rag
type: concept
bucket: knowledge-substrate
abstract: >-
  Continual RAG extends retrieval-augmented generation to handle ongoing
  knowledge updates without full reindexing, differentiating itself from static
  RAG by treating the knowledge base as a living store that accumulates,
  revises, and prioritizes information over time.
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - repos/agent-on-the-fly-memento.md
  - repos/osu-nlp-group-hipporag.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
related:
  - continual-learning
last_compiled: '2026-04-08T23:23:53.383Z'
---
# Continual RAG

## What It Is

Continual RAG describes [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) systems that absorb new documents, facts, and corrections on an ongoing basis while preserving retrieval quality for previously indexed material. The challenge is non-trivial: a naive append-only approach degrades retrieval precision as the index grows, while periodic full reindexing introduces latency windows where new content is invisible. Continual RAG sits between those extremes, borrowing techniques from [Continual Learning](../concepts/continual-learning.md) to manage the retrieval substrate as a dynamic artifact.

The concept matters because most deployed RAG systems are built for a snapshot of the world. A legal research tool indexed in January becomes stale by March. A customer support agent trained on last quarter's product docs confidently retrieves obsolete policies. The gap between "when data was indexed" and "when the user asks" is where Continual RAG operates.

## Why Standard RAG Falls Short

Static RAG assumes a fixed corpus. The retriever (dense embedding model, sparse BM25 index, or graph structure) is calibrated once and then queried. When new documents arrive, three problems compound:

**Index drift.** Dense retrievers embed documents relative to a learned representation space. New documents added incrementally without re-encoding the full corpus can land in different representational neighborhoods than their semantic peers, reducing recall for cross-document queries.

**No temporal prioritization.** Standard retrieval ranks by relevance, not recency. A current policy document and a three-year-old version score similarly if their text is similar, causing the retriever to return whichever chunk happens to rank higher by cosine distance.

**Catastrophic interference in graph structures.** Graph-based retrievers like [GraphRAG](../projects/graphrag.md) and [HippoRAG](../projects/hipporag.md) build entity-relation graphs offline. Incrementally inserting nodes risks disconnected subgraphs or edge proliferation that distorts community structure used during retrieval.

## Core Mechanisms

### Incremental Indexing Without Full Rebuild

The simplest continual RAG pattern separates the index into a stable base layer and a volatile recent layer. New documents go into the recent layer, which is fully reindexed on each write (acceptable because it stays small). Periodically, the recent layer merges into the base. This mirrors LSM-tree architecture from databases, and some vector databases implement it natively. [Qdrant](../projects/qdrant.md) and [FAISS](../projects/faiss.md) expose APIs that allow partial index updates with configurable merge policies.

### Knowledge Graph Continual Updates

[HippoRAG](../projects/hipporag.md) (NeurIPS '24, ICML '25) addresses this with a graph structure built from extracted entities and relations, combined with Personalized PageRank for retrieval. Its `hipporag.index(docs=docs)` call processes new documents into the existing graph incrementally rather than rebuilding from scratch. The claim is that this makes it cost and latency efficient online while enabling what the authors call "non-parametric continual learning" — the model weights never change, but the knowledge available to the model grows. Self-reported benchmarks on NaturalQuestions, MuSiQue, 2WikiMultiHopQA, and HotpotQA show HippoRAG 2 outperforming GraphRAG, RAPTOR, and standard dense retrieval on multi-hop queries. These results are from the authors' own paper and have not been independently replicated at scale.

The graph approach has a genuine advantage for continual updates: inserting a new document that mentions an existing entity connects to that entity's existing node rather than creating a duplicate vector embedding. This is how [Graphiti](../projects/graphiti.md) and [Zep](../projects/zep.md) approach persistent memory for agents — they maintain temporal knowledge graphs where facts can be superseded rather than just appended.

### Temporal Metadata and Decay

A lower-infrastructure approach attaches timestamps to all indexed chunks and modifies retrieval scoring to penalize older content when temporal queries are present, or to prefer recent content when recency signals appear in the query. This sidesteps reindexing entirely but requires [Temporal Reasoning](../concepts/temporal-reasoning.md) in the query understanding layer to decide when staleness matters. A question about "current pricing" needs recency weighting; a question about "how photosynthesis works" does not.

### Memory-Augmented MDPs (Memento approach)

[Memento](../projects/memento.md) inverts the standard framing: instead of updating the retrieval index, it stores full agent trajectories (successful and failed) in a Case Bank. The retriever then pulls relevant past experiences to guide current decisions, formatted as final-step tuples `(s_T, a_T, r_T)`. This treats continual RAG not as "keep the knowledge base current" but as "keep the behavioral library current." New experiences accumulate without weight updates, and the policy improves through case-based reasoning. This is particularly relevant for agentic settings where the "documents" being retrieved are prior problem-solving episodes, not text corpora.

### Conflict Resolution and Fact Supersession

When a new document contradicts an existing indexed fact, naive append creates both versions in the index. Continual RAG systems need one of three strategies:

1. **Provenance tracking**: store source and timestamp, resolve conflicts at query time by preferring newer or higher-authority sources
2. **Explicit retraction**: allow document deletion by ID (supported in most vector databases) so outdated chunks are removed when superseded content arrives
3. **Soft expiry**: score documents with a decay function so older contradicting content gradually loses retrieval weight without explicit deletion

None of these is automatic in standard vector database deployments. The application layer must implement the logic that decides when new information supersedes old information, which requires understanding what "supersedes" means for a given domain.

## Implementation Layers

Harrison Chase's framing from [Continual learning for AI agents](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) clarifies where continual RAG sits: knowledge updates happen at three layers in an agentic system.

- **Model layer**: weight updates via SFT or RL. Slow, expensive, risks catastrophic forgetting.
- **Harness layer**: changes to code, tools, system prompts. Medium speed, affects all agent instances.
- **Context layer**: instructions, skills, memory retrieved at runtime. Fast, per-user or per-session.

Continual RAG primarily operates at the context layer. The retrieval store is the mechanism that makes context dynamic. When an agent retrieves a document written yesterday, it's accessing continually updated context without any weight changes. This is the fastest feedback loop of the three and carries the least risk of destabilizing existing behavior — which is why practitioners often start here before attempting harness or model-layer updates.

## Who Implements It

**[HippoRAG](../projects/hipporag.md)**: graph-based, neurobiologically inspired, designed explicitly for non-parametric continual learning. Best for multi-hop retrieval over growing corpora.

**[Graphiti](../projects/graphiti.md) / [Zep](../projects/zep.md)**: temporal knowledge graphs for agent memory. Optimized for conversation-length continual updates where facts evolve across sessions.

**[Mem0](../projects/mem0.md) / [Letta](../projects/letta.md) / [MemGPT](../projects/memgpt.md)**: memory management frameworks that handle write-back, conflict resolution, and retrieval for long-running agents. Continual RAG is a component of their broader memory architecture.

**[LlamaIndex](../projects/llamaindex.md) / [LangChain](../projects/langchain.md)**: provide lower-level primitives (index update APIs, metadata filtering, retrieval pipelines) that developers assemble into continual RAG systems.

**[Memento](../projects/memento.md)**: trajectory-based continual RAG for agent decision-making. Differs from document-focused implementations by treating past agent episodes as the "documents" being indexed and retrieved.

## Practical Failure Modes

**Index bloat degrades precision.** Without pruning or decay, append-only indexes accumulate redundant and contradictory chunks. At sufficient scale, retrieval precision falls because the probability of returning an outdated chunk alongside a current one grows. Systems need explicit pruning strategies or the continual update mechanism defeats itself.

**Embedding model staleness.** Continual RAG typically assumes a fixed embedding model. If the domain drifts (new terminology, new entity types), the embedding model's representation of new documents diverges from its representation of old documents, reducing cross-document retrieval. Updating the embedding model requires re-encoding the entire corpus — full reindexing — which the system was designed to avoid. This is the primary unspoken infrastructure assumption: the embedding space is stable over the system's lifetime.

**Conflict resolution requires domain knowledge.** No generic algorithm correctly identifies when new text supersedes existing text across all domains. A medical knowledge base has different supersession rules than a legal database or a product catalog. Systems that don't implement explicit supersession logic accumulate contradictions silently, and the retriever returns both the current and outdated fact with similar scores.

**Write amplification in graph-based systems.** Graph-based continual RAG (HippoRAG, Graphiti) runs LLM calls during indexing to extract entities and relations. Each new document triggers inference, which makes write costs proportional to LLM API cost rather than just storage cost. At high document ingestion rates, this becomes expensive.

## When Not to Use Continual RAG

**Stable corpora**: if your knowledge base changes quarterly or less, full reindexing is simpler and produces better retrieval quality. The complexity of incremental update logic only pays off when the corpus changes frequently enough that reindexing windows are operationally unacceptable.

**Regulated environments requiring audit trails**: systems where every fact's provenance must be verifiable at retrieval time face real engineering overhead. Continual RAG indexes need provenance metadata attached to every chunk, conflict resolution decisions logged, and retraction events tracked. This is solvable but adds substantial infrastructure.

**Small context window models**: continual RAG assumes the retrieved content can fit in context alongside the query and generation. Models with constrained context budgets need aggressive [Context Compression](../concepts/context-compression.md) before the retrieval layer adds value.

## Unresolved Questions

The documentation and papers around continual RAG leave several questions open:

**How do you know when to retract?** No published system provides a general mechanism for detecting that a new document supersedes an existing one without human annotation or domain-specific rules. The provenance-tracking approach pushes this problem to query time, but that requires the LLM to reason about document timestamps and authority — a capability that varies significantly across models.

**Cost at scale for graph-based approaches.** HippoRAG's claim that it uses "significantly fewer resources for offline indexing compared to GraphRAG, RAPTOR, and LightRAG" is relative to those systems' known high costs. Absolute cost at millions of documents with LLM-based entity extraction is not characterized in public benchmarks.

**Retrieval quality over time.** Benchmark evaluations (HippoRAG 2's ICML '25 results, Memento's GAIA results) measure a fixed snapshot. Whether retrieval quality degrades gracefully or catastrophically as the index grows over months of real-world updates is not documented in any published evaluation.

**Governance of automated memory updates.** Systems like OpenClaw's SOUL.md and Hex's Context Studio update agent context automatically from production traces. The criteria for what gets written, who can audit it, and how incorrect automated updates get corrected are operational questions that each team answers differently and rarely documents publicly.

## Relationship to Adjacent Concepts

Continual RAG connects directly to [Semantic Memory](../concepts/semantic-memory.md) (the persistent factual store) and [Long-Term Memory](../concepts/long-term-memory.md) (the infrastructure maintaining it across sessions). [Agent Memory](../concepts/agent-memory.md) frameworks treat the retrieval layer as one of several memory types, alongside [Episodic Memory](../concepts/episodic-memory.md) (past interactions) and [Procedural Memory](../concepts/procedural-memory.md) (learned skills).

[Hybrid Search](../concepts/hybrid-search.md) — combining dense vector retrieval with sparse [BM25](../concepts/bm25.md) — becomes more valuable in continual RAG settings because BM25 indexes update incrementally with lower overhead than dense indexes, providing a stable baseline retrieval while the dense index catches up after bulk ingestion.

[Agentic RAG](../concepts/agentic-rag.md) extends continual RAG by making the retrieval process itself agent-driven: instead of a single retrieval call, the agent iteratively queries, refines, and re-retrieves based on what it finds. When combined with continual updates, this creates systems where both the retrieval strategy and the knowledge base evolve — the configuration space Harrison Chase identifies at the harness and context layers simultaneously.


## Related

- [Continual Learning](../concepts/continual-learning.md) — implements (0.8)

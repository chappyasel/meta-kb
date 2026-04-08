---
url: 'https://arxiv.org/abs/2501.13956'
type: paper
author: 'Preston Rasmussen, Pavlo Paliychuk, Travis Beauvais, Jack Ryan, Daniel Chalef'
date: '2025-01-20'
tags:
  - agent-memory
  - knowledge-graphs
  - temporal-reasoning
  - enterprise-agents
  - graphiti
  - context-synthesis
  - long-term-memory
key_insight: >-
  Zep's three-tier knowledge graph (episodes, semantic entities, communities)
  with bi-temporal indexing enables agents to track how facts change over time
  while maintaining non-lossy source tracing -- achieving 18.5% accuracy gains
  and 90% latency reduction on complex temporal reasoning tasks compared to
  full-conversation baselines, making it the strongest demonstrated architecture
  for production agent memory that must handle contradictory and evolving
  information.
deep_research:
  method: paper-full-text
  text_length: 12500
  analyzed_at: '2026-04-04'
  original_source: papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 8
  signal_quality: 9
  composite: 8.9
  reason: >-
    Graphiti/Zep's three-tier bi-temporal knowledge graph is a core production
    agent memory architecture with detailed design choices, benchmarks, and
    transferable patterns for temporal reasoning, entity resolution, and
    episodic-semantic memory integration.
---

## Architecture Overview

Zep implements a memory layer for AI agents built around Graphiti, a temporally-aware knowledge graph engine. The architecture organizes knowledge into a hierarchical three-tier graph G = (N, E, phi):

**Tier 1 -- Episode Subgraph (G_e):** Stores raw input data (messages, text, JSON) as non-lossy episodes. These connect to extracted semantic entities through episodic edges, enabling bidirectional tracing between source artifacts and derived knowledge. This is critical: you can always trace back from any fact to the exact conversation turn that produced it.

**Tier 2 -- Semantic Entity Subgraph (G_s):** Contains extracted and resolved entity nodes with semantic edges representing relationships between them. The system implements hyper-edges to model complex multi-entity facts where the same relationship can appear between different entity pairs. Entities carry 1024-dimensional embeddings for similarity search.

**Tier 3 -- Community Subgraph (G_t):** Clusters of strongly connected entities with LLM-generated summaries providing high-level views of the semantic structure. Communities are named with key terms and embedded for cosine similarity search.

The design mirrors cognitive science's distinction between episodic memory (specific events with context) and semantic memory (generalized conceptual associations). Data flows upward: raw episodes are processed into entities and relationships, which are then clustered into communities. Retrieval flows downward: queries hit communities and entities, which link back to source episodes for citation.

The storage layer uses Neo4j with predefined Cypher queries (not LLM-generated) to prevent schema hallucinations and ensure consistency. This is a deliberate engineering choice -- LLM-generated graph queries are unreliable in production.

## Core Mechanism

### Bi-Temporal Indexing

The paper's most novel contribution is bi-temporal modeling with two parallel timelines:

- **Timeline T (event time):** When facts were actually true in reality. Tracks t_valid and t_invalid for each edge.
- **Timeline T' (transaction time):** When facts entered/exited the system. Tracks t'_created and t'_expired.

This four-timestamp model for edges enables answering questions like "What did we believe about X at time Y?" (transaction time) vs "What was actually true about X at time Y?" (event time). It also handles relative date extraction -- when someone says "next Thursday," the system uses the episode's reference timestamp to resolve the absolute date.

### Entity Extraction and Resolution Pipeline

For each new message, the system processes it with n=4 preceding messages for context:

1. **Extract** entities and relationships from the message window using an LLM.
2. **Reflect** on extractions using a technique inspired by Reflexion to minimize hallucinations -- the LLM reviews its own extractions before committing them.
3. **Search** for existing entities using hybrid retrieval: cosine similarity on 1024-dim embeddings + BM25 full-text search on entity names.
4. **Resolve** by having an LLM compare new entities against candidates, merging duplicates and updating names/summaries when matches are found.

### Fact Extraction and Temporal Edge Invalidation

Relationships (facts) between entities are extracted with predicates. The deduplication search is constrained to edges between identical entity pairs, significantly reducing computational complexity. When new information contradicts existing facts:

1. The system uses an LLM to compare new edges against semantically related existing edges
2. Upon detecting temporally overlapping contradictions, it invalidates affected edges by setting their t_invalid value
3. The system consistently prioritizes newer information

This is the mechanism that makes Zep handle evolving knowledge -- rather than deleting old facts, it marks them as invalidated with timestamps, preserving the full history of what was believed and when.

### Community Detection

Zep uses label propagation instead of the Leiden algorithm (used by GraphRAG) because label propagation supports straightforward dynamic extension. When adding new entity nodes, the system assigns them to the community held by the plurality of their neighbors, then incrementally updates community summaries. This avoids the cost of recomputing the full community structure on every update, though the paper acknowledges periodic full refreshes are needed to prevent drift.

### Hybrid Retrieval Pipeline

The retrieval function f(a) = chi(rho(phi(a))) transforms text queries into context through three stages:

**Search (phi):** Three complementary methods run in parallel:
- Cosine semantic similarity across fact fields, entity names, and community names
- BM25 full-text search via Neo4j's Lucene integration for word-level matches
- Breadth-first graph traversal within n-hop neighborhoods, seeded from recent episodes to incorporate recently mentioned entities

The authors make an insightful observation: BM25 captures word similarities, cosine captures semantic similarities, and BFS captures contextual similarities (nodes closer in the graph appear in more similar conversational contexts).

**Reranking (rho):** Multiple supported strategies including RRF, MMR, episode-mention frequency, graph distance from centroid, and cross-encoder LLMs (highest quality but most expensive).

**Construction (chi):** Formats retrieved nodes/edges as text context with valid/invalid timestamps, entity summaries, and community summaries.

## Design Tradeoffs

**Neo4j with predefined Cypher vs. LLM-generated queries:** Zep chose predefined queries for schema consistency. This sacrifices query flexibility for reliability -- a strong production choice given that LLM-generated graph queries are notoriously brittle.

**Label propagation vs. Leiden algorithm:** Label propagation enables incremental community updates (lower latency, lower LLM cost) but can diverge from the optimal partition over time. The Leiden algorithm (used by GraphRAG) produces better community structure but requires full recomputation. Zep optimizes for the dynamic case where data arrives continuously.

**Non-lossy episode storage:** Keeping raw episodes alongside the extracted graph doubles storage but enables source citation and handles cases where the extraction pipeline misses information. This is a bet that storage is cheap relative to the cost of information loss.

**gpt-4o-mini for graph construction:** Using a cheaper model for extraction/resolution reduces per-message cost but presumably reduces extraction quality. The paper does not ablate this choice.

**Prioritizing new information in contradictions:** A hard design assumption that newer facts override older ones. This works for most enterprise cases (updated addresses, changed preferences) but fails for domains where older information might be more authoritative.

## Experimental Results

### Deep Memory Retrieval (DMR) Benchmark

500 multi-session conversations (5 sessions, up to 12 messages each, ~60 messages total per conversation):

| System | Accuracy |
|--------|----------|
| MemGPT (state-of-art) | 93.4% |
| Zep (gpt-4-turbo) | 94.8% |
| Zep (gpt-4o-mini) | 98.2% |
| Full-conversation baseline | 98.0% |

The 94.8% vs 93.4% comparison is the apples-to-apples comparison. The 98.2% with gpt-4o-mini uses a different (better) base model, making it not directly comparable. Notably, the full-conversation baseline (stuffing the entire conversation into context) achieves 98.0%, suggesting DMR's conversations are short enough that context-stuffing nearly suffices.

The authors themselves criticize DMR for small scale, single-turn fact-retrieval questions, and poor real-world enterprise representation.

### LongMemEval (LME) Benchmark

More rigorous evaluation using 115,000-token conversations with six question types:

| Model | Zep Accuracy | Baseline | Improvement |
|-------|-------------|----------|-------------|
| gpt-4o-mini | 63.8% | 55.4% | +15.2% |
| gpt-4o | 71.2% | 60.2% | +18.5% |

**Latency:** ~3.2s (Zep + gpt-4o-mini) vs ~31.3s (baseline + gpt-4o-mini) -- a 90% reduction because Zep retrieves relevant context rather than processing the full 115K-token conversation.

**Per-question-type performance (gpt-4o-mini):**
- Single-session-preference: +77.7% improvement (strongest)
- Temporal-reasoning: +48.2% improvement
- Multi-session: modest gains
- Single-session-assistant: -17.7% (notable failure -- Zep struggles to retrieve information about what the assistant said, as opposed to what the user said)

The -17.7% on assistant-generated content is a meaningful weakness that suggests the entity extraction pipeline is biased toward user-stated facts over assistant-generated content.

### Implementation Details

- Embedding/Reranking: BGE-m3 (BAAI)
- Graph Construction: gpt-4o-mini-2024-07-18
- Response Generation: gpt-4o-mini and gpt-4o-2024-11-20
- Database: Neo4j

## Failure Modes & Limitations

**Assistant-content retrieval gap:** The -17.7% on single-session-assistant questions reveals a systematic weakness in extracting and indexing information generated by the assistant (recommendations, calculations, creative outputs). This matters in practice because agents' own outputs often contain critical context.

**No cross-domain benchmarking:** The paper acknowledges no existing benchmark tests Zep's ability to synthesize conversation history with structured business data -- its headline use case. All benchmarks test conversational memory only.

**Extraction cost and latency:** Every ingested message requires multiple LLM calls (extraction, reflection, resolution, community update). The paper does not report per-message ingestion costs or latency, which are critical for production sizing. The choice of gpt-4o-mini for extraction helps but the cumulative cost for high-volume enterprise use is unclear.

**Community drift:** The incremental label propagation approach will diverge from optimal community structure over time without periodic full recomputation. The paper does not specify how often this refresh should occur or its cost.

**Contradiction resolution is simplistic:** Always prioritizing newer information fails in domains where older information may be more authoritative (medical records, legal documents). There is no confidence scoring or source-authority weighting.

**Scale limits unknown:** All benchmarks use conversations of hundreds of messages. Enterprise knowledge graphs at thousands or millions of entities may exhibit different performance characteristics, particularly for graph traversal and community detection.

## Practical Implications

**For builders of agent memory systems:** Zep/Graphiti represents the most complete open-source architecture for temporal agent memory. The three-tier design (episodes -> entities -> communities) with bi-temporal indexing is a strong pattern to adopt. The 90% latency reduction over full-conversation approaches makes it viable for real-time applications.

**Key implementation takeaways:**
1. Always maintain non-lossy episode storage alongside extracted knowledge -- you will need source tracing in production.
2. Use predefined graph queries, not LLM-generated ones. Schema consistency matters more than query flexibility.
3. Hybrid retrieval (semantic + lexical + graph traversal) consistently outperforms any single method.
4. Temporal edge invalidation (rather than deletion) is essential for domains with evolving information.
5. The extraction pipeline's context window (n=4 preceding messages) is a tunable parameter that trades extraction quality against cost.

**Gap between paper and production:** The paper demonstrates the architecture works for conversational memory but does not validate the structured business data integration use case. Production deployments will need to solve: ingestion cost at scale, community refresh scheduling, authority-weighted contradiction resolution, and indexing of agent-generated (not just user-generated) content. The -17.7% weakness on assistant content is particularly concerning for agentic use cases where the agent's own prior outputs are important context.

---
entity_id: community-detection
type: approach
bucket: knowledge-substrate
abstract: >-
  Community detection finds clusters of tightly connected nodes in graphs; in
  LLM systems, it enables hierarchical summarization of knowledge graphs so
  agents can reason at multiple levels of granularity without processing every
  node.
sources:
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/tirth8205-code-review-graph.md
  - repos/safishamsi-graphify.md
related:
  - knowledge-graph
  - retrieval-augmented-generation
  - openai
  - graphrag
  - claude-code
  - episodic-memory
last_compiled: '2026-04-08T23:11:45.916Z'
---
# Community Detection

## What It Is

Community detection is a class of graph algorithms that partition a network into subsets of nodes ("communities") where internal connections are denser than connections to the rest of the graph. In social networks, communities correspond to friend groups. In knowledge graphs built from text, they correspond to clusters of semantically related entities: the set of nodes for a company, its executives, its products, and its regulatory filings will tend to form a community because they co-occur and reference each other heavily.

For LLM systems, community detection solves a specific problem: a knowledge graph with thousands of entities is too large to inject into a context window, but a flat list of all entities loses the relational structure that makes the graph useful. Communities provide a middle layer. Rather than reasoning over individual nodes or the raw corpus, an agent can work with community summaries that capture themes, key entities, and cross-entity relationships in a compact representation.

The practical output is a tree of summaries at multiple granularities. Ask "what are the main topics in this dataset?" and the answer comes from the root communities. Ask about something specific and you drill down through finer communities until you reach the entity level. This is what makes community detection worth the indexing cost: it enables hierarchical exploration of large corpora without per-query full reprocessing.

## Why It Matters for Agent Systems

Agents operating over large knowledge bases face a retrieval problem that embedding similarity does not fully solve. Semantic search finds chunks near the query vector, but fails on global questions like "what patterns exist across this entire corpus?" or "what entities are most central to this topic?" These questions require synthesis across many nodes, not retrieval of the nearest neighbor.

Community detection addresses this by precomputing the structure at index time. The hierarchical summaries become retrievable units themselves, indexed by embedding like any other document. When a query arrives, the system can retrieve relevant community summaries (coarse-grained synthesis) and entity nodes (fine-grained facts) in a single hybrid search pass.

The [GraphRAG](../projects/graphrag.md) paper quantifies the impact: community-based retrieval wins on comprehensiveness against naive RAG 72-83% of the time on sensemaking queries, while achieving 9-43x token efficiency at the root community level compared to processing source text directly. [Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)

## How It Works

### Core Algorithms

**Leiden algorithm:** The current standard for offline community detection. Leiden refines the earlier Louvain method by guaranteeing that communities are internally connected (Louvain can produce disconnected communities). It optimizes modularity, a measure of how much denser within-community edges are compared to a random graph baseline. The algorithm operates in multiple resolution levels, producing a hierarchy: root-level communities covering broad themes, sub-communities for specific topics, leaf communities for tight entity clusters.

Leiden requires access to the full graph structure and must recompute from scratch when the graph changes significantly. [GraphRAG](../projects/graphrag.md) uses Leiden for its offline indexing pipeline. Once computed, each community at each hierarchy level receives an LLM-generated summary, creating the retrievable structure.

**Label propagation:** A simpler, faster alternative suited to dynamic graphs. Each node starts as its own community. Iteratively, each node adopts the community label held by the majority of its neighbors, with ties broken by largest community. The algorithm converges when no assignments change. Critically for streaming systems, it supports incremental extension: when a new entity arrives, assign it to the community held by the plurality of its neighbors, then update the affected community summary without rerunning the full algorithm.

[Graphiti](../projects/graphiti.md) (and by extension [Zep](../projects/zep.md)) uses label propagation specifically because agents ingest data continuously. The tradeoff is explicit: label propagation produces lower-quality communities than Leiden but supports dynamic updates. Periodic full recomputation is required to prevent drift, though the paper does not specify a schedule. [Source](../raw/deep/repos/getzep-graphiti.md)

**File-based grouping:** A degenerate fallback used when igraph (which provides Leiden) is not installed. Nodes are grouped by the file they came from. This works acceptably for codebases where file organization roughly tracks semantic organization, but fails for knowledge graphs assembled from heterogeneous sources.

### The Summarization Step

Detecting communities is only the first step. The second is generating a natural language summary for each community that an LLM can consume as context. This is where the LLM calls occur.

For leaf communities, the summarization prompt receives the entity names and relationship descriptions of the community's members, prioritizing high-degree entities. For higher-level communities, the prompt receives the summaries of sub-communities rather than raw entity data, implementing a map-reduce pattern. The resulting summaries name the community, describe its key themes and entities, and capture notable relationships.

In GraphRAG's architecture, these summaries are embedded and stored alongside node and edge embeddings. At query time, community summaries become searchable units retrieved by cosine similarity, just like any other stored fact. [Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)

### The Map-Reduce Query Pattern

GraphRAG's global search uses community summaries as the units of a map-reduce computation:

1. Collect all community summaries at the chosen hierarchy level
2. Shuffle and pack into fixed-size chunks (8K tokens optimal per the paper's empirical finding)
3. Send each chunk to the LLM with the query; receive a partial answer and a 0-100 helpfulness score
4. Sort partial answers by score, pack the top answers into a final context, generate the synthesized response

The map calls are independent and can run in parallel. The hierarchy level controls the granularity-cost tradeoff: root-level summaries cost far fewer tokens per query but capture only broad themes.

## Implementation Details

### GraphRAG's Implementation

Microsoft's [GraphRAG](../projects/graphrag.md) implements community detection as part of a larger offline indexing pipeline. After entity and relationship extraction (the expensive step requiring multiple LLM calls per chunk), the pipeline runs Leiden on the entity-relationship graph. The paper reports graphs of 8,564 nodes and 20,691 edges for a podcast dataset; 15,754 nodes and 19,520 edges for a news dataset. [Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)

The chunk size used during entity extraction materially affects community quality. 600-token chunks extract roughly 2x more entity references than 2400-token chunks, producing denser, more accurate communities, but at 4x more LLM calls. There is no clear guidance on the optimal tradeoff in the paper.

GraphRAG exposes four community levels (C0 through C3). C0 is the root (fewest communities, most general). C3 is the leaf (most communities, most specific). A query answered at C0 uses 9-43x fewer tokens than processing source text directly; at C3, savings drop to 26-33%.

### Graphiti's Implementation

Graphiti's `community_operations.py` implements label propagation. The algorithm queries edge counts per entity (one Cypher query per node), builds the graph, runs propagation, then calls an LLM to generate a summary for each changed community. Community nodes are stored in [Neo4j](../projects/neo4j.md) with their summaries embedded as 1024-dimensional vectors.

The dynamic extension path: when `add_episode()` adds new entity nodes, those nodes are assigned to the community held by the plurality of their neighbors, and only the affected community summaries are regenerated. This keeps per-episode latency low while maintaining the community structure.

Community names contain "key terms and relevant subjects" embedded for cosine similarity search, making communities searchable through the same hybrid retrieval pipeline as individual entities and facts. [Source](../raw/deep/repos/getzep-graphiti.md)

### code-review-graph's Implementation

The code-review-graph project ([Claude Code](../projects/claude-code.md) integration) uses Leiden via igraph for structural communities of a codebase, or falls back to file-based grouping. Communities here represent clusters of functions and classes that are heavily interdependent. Risk scoring for code review uses community membership as a signal: changes that cross community boundaries (a function in one community calling into another) get higher risk scores because they indicate cross-module coupling. [Source](../raw/deep/repos/tirth8205-code-review-graph.md)

## Strengths

**Enables global queries over large corpora.** Without community summaries, asking "what are the main themes?" requires either processing the entire corpus (too expensive) or retrieving a fragment (incomplete). Community detection precomputes the right level of abstraction.

**Token efficiency scales with hierarchy depth.** Root communities give 9-43x token savings, making corpus-wide synthesis feasible in contexts where full-corpus processing would cost thousands of dollars.

**Integrates with hybrid search.** Community summaries are embedded documents like any other. They participate naturally in [Semantic Search](../concepts/semantic-search.md) and [Hybrid Search](../concepts/hybrid-search.md) pipelines without special-casing.

**Improves temporal and comparison reasoning.** The RAG vs. GraphRAG evaluation finds GraphRAG wins on temporal queries by 23.3 percentage points (49.06% vs 25.73%). The graph structure captures temporal relationships between entities that embedding similarity over text chunks misses. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

## Critical Limitations

**The entity extraction bottleneck.** Community detection can only cluster entities that were successfully extracted. The RAG vs. GraphRAG paper finds that only 65-66% of answer-relevant entities exist in constructed knowledge graphs across two datasets. This ~34% miss rate creates a hard ceiling on recall for KG-based approaches, regardless of how well communities are detected. Improving extraction quality (smaller chunks, multiple passes, domain-specific prompts) raises the ceiling but increases indexing cost. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

**Infrastructure assumption: graph-free baselines are competitive.** The GraphRAG paper's own data shows that simple map-reduce over source text chunks (no graph, no community detection) performs nearly as well as community-based GraphRAG at lower hierarchy levels. The graph's primary value is hierarchical exploration at the root level. Systems expecting large quality gains from the community structure over simpler baselines may be disappointed. Before investing in graph indexing and Leiden computation, a text summarization baseline should be benchmarked. [Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)

**Community drift in dynamic graphs.** Label propagation's incremental extension works for adding new nodes but gradually diverges from the optimal partition as the graph grows. There is no documented threshold for when drift becomes problematic or how costly a full recomputation is at scale.

## When NOT to Use Community Detection

**Single-hop factual queries.** If your agent workload is mostly "what is X's address?" or "when did event Y occur?", semantic search over extracted facts outperforms community-based retrieval. GraphRAG's global search is designed for sensemaking, not fact retrieval. The RAG vs. GraphRAG paper confirms naive RAG outperforms GraphRAG by 1.77-2.74 F1 points on single-hop NQ questions. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

**Frequently updated corpora.** Leiden requires full recomputation when the graph changes significantly. If documents are added or updated daily, the indexing cost compounds. Label propagation mitigates this but introduces drift. For highly dynamic knowledge bases, consider simpler retrieval strategies unless the sensemaking use case is strong.

**Small corpora.** The cost of entity extraction, community detection, and summary generation is fixed overhead. For corpora under ~100K tokens, loading the full text into context is cheaper and produces comparable or better results.

**When hallucination risk is critical.** Community summaries compound LLM error: entities are extracted by an LLM, communities are summarized by an LLM, and final answers are generated by an LLM. Each step can introduce errors. The GraphRAG paper explicitly does not apply hallucination detection. For domains where accuracy is safety-critical, simpler retrieval pipelines with source citation are more reliable.

## Unresolved Questions

**Refresh scheduling for label propagation.** Both the Zep paper and Graphiti documentation acknowledge that incremental community updates drift from optimal partitioning, requiring periodic full refreshes. Neither specifies when to trigger a refresh, how to measure drift, or what the cost is at realistic scale (100K+ entities).

**Hallucination compounding across levels.** GraphRAG's hierarchical summaries involve two LLM passes (extraction, summarization) before the final generation. There is no analysis of how hallucination rates compound across levels or whether root-level summaries (which summarize sub-community summaries, themselves summaries of extracted entities) are systematically less accurate than leaf-level summaries.

**Optimal cluster granularity.** The number of communities and their sizes depend on the Leiden resolution parameter, which is not discussed in any of the implementation analyses. Different resolution settings produce very different community structures. There is no documented guidance on tuning this for knowledge graph applications.

**Cost at production scale.** Indexing a 1M-token corpus with 600-token chunks and multiple LLM calls per chunk, followed by community summarization across hundreds of communities, can cost hundreds of dollars in LLM API fees. None of the papers provide per-corpus cost estimates that would let practitioners budget the approach.

## Relationship to Adjacent Concepts

Community detection is one component within larger systems. It operates on [Knowledge Graphs](../concepts/knowledge-graph.md), which provide the node and edge structure that community algorithms partition. The resulting summaries feed into [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines as retrievable units.

Within [Agent Memory](../concepts/agent-memory.md) architectures, community summaries function as a form of [Semantic Memory](../concepts/semantic-memory.md): generalized, theme-level knowledge extracted from episodic experience. The Zep/Graphiti architecture explicitly mirrors this cognitive distinction, with raw episodes as episodic memory and community summaries as semantic memory. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

[RAPTOR](../projects/raptor.md) implements a similar hierarchical summarization concept but without the graph structure: it clusters text chunks, summarizes each cluster, then clusters summaries, producing a tree that also enables multi-granularity retrieval.

## Alternatives and Selection Guidance

**Use GraphRAG (Leiden-based) when** the corpus is relatively static, queries require global sensemaking, and the indexing cost can be amortized over many queries. Best for research corpora, document archives, and knowledge bases that update weekly or less.

**Use Graphiti (label propagation) when** data arrives continuously (conversational agents, streaming event logs) and per-episode latency matters. Accept slightly lower community quality in exchange for incremental updates without full recomputation.

**Use RAPTOR when** you want hierarchical retrieval without a full knowledge graph pipeline. RAPTOR clusters text chunks rather than extracted entities, avoiding the ~34% entity extraction miss rate but losing the relational structure that enables multi-hop reasoning.

**Use hybrid RAG (RAG + GraphRAG concatenated) when** your query distribution is mixed between single-hop factual and multi-hop relational. The RAG vs. GraphRAG paper shows concatenating both retrieval results yields +6.4% on multi-hop tasks. This is the most consistent approach but doubles retrieval cost. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

**Skip community detection entirely when** your corpus is under 100K tokens, your queries are predominantly single-hop, or your accuracy requirements cannot tolerate multi-level LLM-generated abstractions.


## Related

- [Knowledge Graph](../concepts/knowledge-graph.md) — implements (0.8)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — implements (0.5)
- [OpenAI](../projects/openai.md) — implements (0.3)
- [GraphRAG](../projects/graphrag.md) — implements (0.8)
- [Claude Code](../projects/claude-code.md) — implements (0.3)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.3)

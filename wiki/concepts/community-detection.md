---
entity_id: community-detection
type: approach
bucket: knowledge-substrate
abstract: >-
  Community detection finds clusters of related entities in knowledge graphs;
  its key differentiator is enabling hierarchical summarization that lets agents
  answer global "what are the main themes?" queries impossible with flat
  retrieval.
sources:
  - repos/safishamsi-graphify.md
  - deep/repos/getzep-graphiti.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - knowledge-graph
  - graphrag
  - retrieval-augmented-generation
  - openai
  - episodic-memory
  - model-context-protocol
  - semantic-memory
  - graphrag
last_compiled: '2026-04-08T02:54:23.946Z'
---
# Community Detection

## What It Is

Community detection is a class of graph algorithms that partition nodes into clusters based on connection density. In knowledge graph contexts for LLM agents, it serves a specific purpose: converting a flat graph of entities and relationships into a hierarchy of topics, enabling both coarse and fine-grained retrieval.

The core insight driving adoption in agent memory systems: a flat list of entity nodes and edges cannot answer "what are the main themes in this corpus?" or "what broad area does this entity belong to?" Retrieval requires some notion of scope. Community detection provides that scope by grouping densely interconnected entities into communities, then generating summarizations of each community that capture the broad topic without requiring retrieval of every underlying node.

This connects directly to [Semantic Memory](../concepts/semantic-memory.md) (communities cluster related concepts), [Episodic Memory](../concepts/episodic-memory.md) (episodes feed entities that form communities), and [Knowledge Graph](../concepts/knowledge-graph.md) (communities are a derived layer on top of the base graph structure).

## Why It Matters

Without community structure, [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) on knowledge graphs faces two problems:

**Global query failure.** Semantic similarity search retrieves locally similar nodes. A query like "what are the main themes in this dataset?" has no single nearby node to retrieve. You need a representation of the entire graph's thematic structure, which community summaries provide.

**Token budget pressure.** Delivering raw entity nodes and edges to an LLM at scale is expensive. A 1M-token corpus might yield thousands of entity nodes. Community summaries compress this: [GraphRAG](../projects/graphrag.md) achieves 9-43x token reduction at the root community level compared to processing source text directly.

## How It Works

### The Leiden Algorithm

[GraphRAG](../projects/graphrag.md) uses the Leiden algorithm, the current standard for high-quality community detection in this domain. Leiden improves on the earlier Louvain algorithm by fixing a connectivity bug that could produce disconnected communities.

Leiden operates by optimizing modularity — a measure of how much more densely connected nodes are within communities than would be expected by chance. The algorithm:

1. Assigns each node to its own community
2. Moves nodes between communities greedily to maximize modularity gain
3. Aggregates communities into super-nodes and repeats
4. Applies a refinement phase that prevents disconnected communities

The result is a hierarchy. GraphRAG generates four levels (C0 through C3), where C0 is the root level with fewest, most general communities and C3 is the leaf level with most, most specific communities. This hierarchy enables iterative exploration: start broad with C0 summaries, drill into C2/C3 for specifics.

GraphRAG's community generation pipeline from [Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md):

1. Extract entities and relationships from text chunks using an LLM
2. Run Leiden on the resulting entity-relationship graph
3. For each community at every level: generate an LLM summary using member entities and their relationships as input
4. Embed community summary names (key terms) for retrieval

### Label Propagation (Graphiti's Approach)

[Graphiti](../projects/graphiti.md) uses label propagation instead of Leiden, for a specific architectural reason: incremental updates. Label propagation:

1. Assigns each node its own label
2. Iteratively assigns each node the label held by the plurality of its neighbors (weighted by edge count)
3. Breaks ties by largest community
4. Converges when no assignments change

The critical advantage: when a new entity arrives, it can be assigned to the community held by the plurality of its neighbors, then community summaries are updated incrementally. Leiden requires recomputing the entire partition from scratch.

The acknowledged cost, per [Source](../raw/deep/repos/getzep-graphiti.md): "incrementally updated communities gradually diverge from full label propagation results, requiring periodic refreshes." For streaming data (agent conversations arriving continuously), this tradeoff is worth it. For static corpora, Leiden's better partition quality wins.

### Community Summarization

After clustering, each community gets an LLM-generated summary. In GraphRAG, leaf communities are summarized by prioritizing high-degree edges; higher-level communities use sub-community summaries as input — a map-reduce pattern. In Graphiti, community summaries are generated iteratively using member entity summaries.

Community node names in Graphiti contain "key terms and relevant subjects" that are embedded for similarity search. This makes communities searchable via the same hybrid search pipeline (cosine similarity + BM25) as individual entity nodes — they become first-class retrieval targets, not just organizational structure.

### Query-Time Use

At query time, community structure serves two distinct retrieval patterns:

**Global search (GraphRAG's primary use):** Shuffle all community summaries at a chosen level into chunks, send each to the LLM for a partial answer with a helpfulness score, rank by score, and synthesize a final answer. This map-reduce pattern enables corpus-wide synthesis without retrieving every source document.

**Risk/scope signals (Graphiti, code-review-graph):** Community membership signals cross-cutting impact. In [Graphiti](../projects/graphiti.md), edges crossing community boundaries get higher risk scores. In code-review-graph, changes that span community boundaries trigger elevated review priority — the intuition being that cross-community changes are more likely to have unexpected dependencies.

## Implementations

### GraphRAG (Microsoft)

[GraphRAG](../projects/graphrag.md) is the reference implementation of community detection for RAG. Key architectural facts from [Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md):

- Podcast dataset: 8,564 nodes, 20,691 edges
- News dataset: 15,754 nodes, 19,520 edges
- Four hierarchy levels (C0-C3)
- Token efficiency at C0: 9-43x fewer tokens than source text summarization
- Win rate over naive RAG on comprehensiveness: 72-83%
- Win rate over graph-free text summarization: 53-64% (more modest)

The 53-64% win rate over graph-free text summarization is significant: it means simple map-reduce over raw text chunks, without any graph construction, performs nearly as well as GraphRAG at lower community levels. The graph's primary advantage is hierarchical exploration efficiency, not raw answer quality improvement.

### Graphiti

[Graphiti](../projects/graphiti.md) implements community detection in `graphiti_core/utils/maintenance/community_operations.py`. The `get_community_clusters` function queries edge counts for every entity node (one Cypher query per node), then runs label propagation. Community nodes are first-class in the data model: `CommunityNode` objects with LLM-generated summary names, stored alongside entity and episode nodes.

After clustering, each `CommunityNode` gets embedded for retrieval. `CommunityEdge` (HAS_MEMBER) links communities to member entities. The search layer includes community nodes as a retrieval target alongside semantic entities.

Performance limitation: `get_community_clusters` is O(N²) in the naive case for large graphs, creating a bottleneck for graphs with thousands of entities. Periodic full refreshes are needed to prevent incremental drift.

### Code-Review-Graph

Uses the Leiden algorithm via igraph (optional dependency), falling back to file-based grouping when igraph is unavailable. Communities drive architecture overview generation and risk scoring: changes crossing community boundaries increase composite risk scores in the blast radius computation. This demonstrates community detection applied to structural code analysis rather than semantic text, showing the pattern's generality.

## Benchmarks

From [Source](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md) (GraphRAG paper, self-reported):

| Level | Token savings vs. source text | Win rate over naive RAG |
|-------|-------------------------------|------------------------|
| C0 (root) | 9-43x | 72-83% comprehensiveness |
| C3 (leaf) | 26-33% | 72-80% comprehensiveness |

From [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) (Zep/Graphiti paper, self-reported): Graphiti's temporal reasoning on LongMemEval improved +48.2% (gpt-4o-mini) compared to full-conversation baseline — partly attributable to community structure enabling efficient cross-entity synthesis.

All benchmarks above are self-reported by the respective project teams, not independently validated.

## Strengths

**Global query coverage.** Community summaries are the only viable mechanism for answering corpus-wide thematic questions without full context stuffing. No amount of semantic similarity search solves this; it requires precomputed hierarchical structure.

**Token efficiency at scale.** 9-43x token reduction at root level is substantial. For agents with tight context budgets, this makes large knowledge graphs tractable.

**Hierarchical navigation.** The community hierarchy enables [Progressive Disclosure](../concepts/progressive-disclosure.md): broad-to-narrow exploration where an agent can identify the relevant community first, then retrieve specific entities within it.

**Dual use as retrieval targets.** When community summary names are embedded and indexed, communities become searchable objects, not just organizational metadata. This means a query for "authentication and authorization" can retrieve the relevant community node directly, bypassing individual entity retrieval.

## Limitations

### Concrete Failure Mode: Static Communities in Dynamic Graphs

Leiden produces high-quality communities but requires full recomputation when the graph changes. For agent memory systems receiving continuous updates (new conversations, new documents), this creates a dilemma: either accept stale communities (incremental label propagation) or pay the cost of periodic full Leiden recomputation.

Graphiti's label propagation solution acknowledges divergence as inevitable. For a production system receiving thousands of episodes daily, the communities visible at query time may not reflect the true clustering of recently added entities. This means newly added information may be assigned to incorrect communities, leading to retrieval misses for recent content — precisely the content most relevant to current agent context.

### Unspoken Infrastructure Assumption: Graph Database at Scale

Community detection requires holding the full graph in memory to run. Graphiti's implementation queries edge counts per node with individual Cypher queries, then runs propagation in Python. Code-review-graph loads the full graph into NetworkX in memory, with an explicit 50K-file soft limit.

The assumption is that the graph fits in memory and a graph database (Neo4j, FalkorDB, Kuzu) is available. Neither is true for lightweight deployments. The infrastructure requirement is substantial: Neo4j alone requires JVM overhead, index management, and persistent storage. This makes community detection primarily an enterprise/production capability, not something easily added to an existing RAG pipeline.

### Community Quality Degradation at Scale

The Leiden algorithm optimizes modularity, which is known to have a resolution limit: it tends to merge small communities together and cannot detect communities below a certain size threshold. In graphs with millions of nodes, this can produce communities that are too coarse to be useful for retrieval. The GraphRAG paper only tests corpora up to ~1M tokens, leaving behavior at 10-100M tokens uncharacterized.

## When NOT to Use It

**Single-hop factual queries dominate your workload.** If most queries are "What is X?" or "When did Y happen?", community structure adds indexing cost with no retrieval benefit. From [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md): naive RAG outperforms GraphRAG on single-hop NQ queries (64.78 vs 63.01 F1). Use standard [Semantic Search](../concepts/semantic-search.md) instead.

**Your corpus updates continuously.** If new documents arrive at high frequency, Leiden's full-recomputation requirement makes it operationally impractical. You'll be forced to use label propagation and accept community drift, at which point you may be getting most of the overhead with diminishing quality benefit.

**You need simple, auditable infrastructure.** Community detection adds a graph database requirement, periodic recomputation jobs, and community summary management. For small knowledge bases or teams without dedicated infrastructure, the complexity cost exceeds the retrieval benefit. Graph-free map-reduce (the "text summarization" baseline in the GraphRAG paper) achieves 53-64% of GraphRAG's win rate with far simpler infrastructure.

**Your queries require very specific answers.** Community summaries are abstractions — they lose granular details in exchange for thematic breadth. The GraphRAG paper notes GraphRAG loses on directness (being specific and to-the-point) compared to naive RAG. For queries requiring precise citations, exact facts, or specific numbers, community-level retrieval will disappoint.

## Unresolved Questions

**Optimal refresh frequency for incremental systems.** Neither Graphiti's documentation nor the Zep paper specifies how often full community recomputation should occur for a live system, or how to detect when community drift has degraded retrieval quality sufficiently to warrant a refresh.

**Community detection quality on domain-specific graphs.** GraphRAG benchmarks use podcast transcripts and news articles — relatively well-structured natural language. Behavior on specialized domains (legal documents, code, medical records) with different entity distributions is untested.

**Cost attribution.** Community summarization requires one LLM call per community per level. For a graph with hundreds of communities at four levels, this is substantial. Neither the GraphRAG paper nor Graphiti documentation provides clear cost estimates for community summarization at scale, making it hard to budget production deployments.

**Cross-community edge handling.** Both implementations score cross-community edges as higher-risk or higher-relevance, but the threshold for what counts as "crossing" is opaque. In graphs where many entities touch multiple topics, most edges cross communities, diluting the signal.

## Alternatives with Selection Guidance

**Use flat semantic search ([Semantic Search](../concepts/semantic-search.md)) when** your queries are mostly single-hop factual lookups and your corpus is under ~100K tokens. No graph construction overhead, simpler infrastructure, competitive performance on factual QA.

**Use graph-free map-reduce (text summarization baseline) when** you need global query coverage but can't afford graph indexing. Simply chunk source text, run parallel LLM calls for partial answers, and synthesize. The GraphRAG paper shows this approach achieves 53-64% of GraphRAG's comprehensiveness win rate with zero graph infrastructure.

**Use [RAPTOR](../projects/raptor.md) when** you want hierarchical summarization without explicit graph construction. RAPTOR clusters documents using embedding similarity and builds a summary tree through iterative clustering — similar thematic benefits, different implementation, no graph database required.

**Use [HippoRAG](../projects/hipporag.md) when** you need graph-based retrieval but your queries are primarily about entity relationships rather than thematic summarization. HippoRAG uses Personalized PageRank for retrieval rather than community summaries, optimizing for multi-hop entity-relationship queries rather than global sensemaking.

**Use GraphRAG with Leiden when** your corpus is relatively static (infrequent updates), queries are thematic or comparative, and you can absorb graph indexing cost upfront. The hierarchical community structure pays off most when users need to explore a corpus iteratively.

**Use Graphiti with label propagation when** you have a streaming data source (agent conversations) where incremental updates matter more than optimal community quality. Accept the drift and schedule periodic full refreshes during off-peak hours.

## Related Concepts

- [Knowledge Graph](../concepts/knowledge-graph.md) — The base structure community detection operates on
- [GraphRAG](../projects/graphrag.md) — Primary implementation using Leiden algorithm
- [Graphiti](../projects/graphiti.md) — Implementation using label propagation for incremental updates
- [Semantic Memory](../concepts/semantic-memory.md) — Communities implement a form of semantic organization
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — Community detection extends RAG to global queries
- [Context Compression](../concepts/context-compression.md) — Community summaries are a form of hierarchical compression
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — Community hierarchy enables broad-to-narrow navigation
- [Hybrid Search](../concepts/hybrid-search.md) — Community nodes participate as retrieval targets in hybrid search pipelines

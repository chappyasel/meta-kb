---
entity_id: leiden-algorithm
type: approach
bucket: knowledge-bases
sources:
  - repos/tirth8205-code-review-graph.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related: []
last_compiled: '2026-04-05T05:32:04.617Z'
---
# Leiden Algorithm

## What It Is

The Leiden algorithm is a community detection method for networks, developed by Traag, Waltman, and van Eck (2019) as a direct improvement on the Louvain algorithm. It finds groups of nodes — "communities" — that are more densely connected to each other than to the rest of the network. In LLM knowledge systems, this means identifying clusters of conceptually related entities in a knowledge graph.

The algorithm sits at the intersection of graph theory and information retrieval. When a knowledge graph contains thousands of entity nodes connected by semantic relationships, Leiden provides a principled way to partition those nodes into meaningful modules without requiring you to specify the number of clusters in advance.

## Why It Matters for Knowledge Systems

Graph-based retrieval systems like GraphRAG face a core scaling problem: as entity counts grow, flat search over all nodes becomes expensive and imprecise. Community structure solves this in two ways.

First, communities serve as retrieval scopes. Rather than searching all 50,000 entity nodes, a query can first identify the relevant community, then search within it. This is how GraphRAG implements global query answering: it generates community summaries at multiple levels of granularity, then uses those summaries as context for questions that span many entities.

Second, communities enable summarization. Each cluster can receive an LLM-generated summary describing the entities it contains and their relationships. These summaries become searchable artifacts in their own right, creating a hierarchical index of the knowledge graph. In code-review-graph's `wiki.py`, communities become the organizational unit for auto-generated documentation.

## How It Works

### The Core Optimization Problem

Leiden maximizes a quality function called modularity (though it also supports alternative functions like Constant Potts Model). Modularity measures whether a partition of nodes into communities has more internal edges than you would expect by chance. A network with modularity score Q = 0 has community structure no better than random; higher values indicate meaningful clustering.

For a partition into communities C, the modularity is:

```
Q = (1/2m) * sum_ij [ A_ij - k_i * k_j / (2m) ] * delta(c_i, c_j)
```

Where A_ij is the adjacency matrix, k_i is node degree, m is total edge count, and delta checks whether nodes i and j belong to the same community. Maximizing this is NP-hard, so Leiden uses a greedy local search.

### Three-Phase Iteration

Leiden improves on Louvain through a three-phase approach per iteration:

**Phase 1: Local node moving.** Each node is tentatively moved to the community of a neighboring node if doing so improves the quality function. This proceeds greedily until no single move improves quality. This phase is roughly equivalent to Louvain.

**Phase 2: Community refinement.** This is Leiden's key innovation over Louvain. Rather than accepting the Phase 1 result, Leiden introduces a refinement step that considers partitioning each community into subcommunities. It checks whether nodes within a community can be split into smaller, locally-optimal groups before aggregation. This prevents the "poorly connected communities" problem that Louvain exhibits — where Louvain can assign a node to a community even when that node is not well-connected to the community as a whole.

**Phase 3: Network aggregation.** Nodes in the same community are merged into a single aggregate node, their edges collapsed into weighted edges between aggregate nodes, and the next iteration begins on this smaller network. Iteration continues until no quality improvement is possible.

The refinement phase gives Leiden a theoretical guarantee that Louvain lacks: it guarantees that all nodes in the result are optimally assigned given their community's internal structure. Louvain can produce communities that are not internally well-connected; Leiden cannot.

### Resolution Parameter

The resolution parameter γ controls community granularity. Higher γ produces more, smaller communities; lower γ produces fewer, larger communities. In practice, this is a tunable hyperparameter. GraphRAG generates communities at multiple resolution levels, creating a hierarchy from coarse (global topics) to fine (specific entity clusters). This multi-scale approach is what enables GraphRAG's "community reports at level 0" through "level N" architecture.

### Complexity

The algorithm runs in near-linear time relative to edge count for sparse networks — O(n log n) in practice. For a knowledge graph with 10,000 entities and 50,000 edges, a typical run takes under a second. This makes full recomputation feasible on moderately-sized graphs.

## Who Implements It and How

### GraphRAG (Microsoft)

GraphRAG uses Leiden as the backbone of its community hierarchy construction. The implementation calls the `graspologic` Python library, which provides a fast Leiden implementation. Community detection runs after entity and relationship extraction, on the full entity-relationship graph. The result is a multi-level community hierarchy stored in the output parquet files (`create_final_communities.parquet`), with LLM-generated summaries per community stored in `create_final_community_reports.parquet`.

The multi-level approach is what separates GraphRAG's global query mode from local search: global queries retrieve community reports from the highest level of abstraction, while local queries search specific entity communities. Without Leiden, this hierarchical navigation would not exist.

### Graphiti (Zep)

Graphiti considered Leiden but chose label propagation instead. The Graphiti architecture document explains the reasoning explicitly: "label propagation was selected over the Leiden algorithm (used by GraphRAG) for its straightforward dynamic extension enabling incremental updates without full recomputation." Graphiti processes episodes in real-time, so it needs a community algorithm that can add a new entity to an existing community without rerunning from scratch.

The tradeoff is quality for speed. Leiden produces better-structured communities, but requires O(n log n) full recomputation when the graph changes. Label propagation supports incremental updates — a new entity adopts the community of its plurality neighbor — but communities gradually drift from what a full recomputation would produce.

### code-review-graph

The `communities.py` module supports Leiden via igraph as an optional dependency (`pip install code-review-graph[communities]`). When igraph is not installed, it falls back to file-based grouping (clustering by directory structure). Leiden communities are used for three purposes: architecture overview generation with coupling warnings (high inter-community edge density indicates architectural debt), risk scoring (changes that cross community boundaries get higher risk scores), and wiki generation via `wiki.py` (each community becomes a wiki page with optional LLM-generated summaries via Ollama).

## Leiden vs. Louvain vs. Label Propagation

These three algorithms represent different positions on a quality/speed/incrementality tradeoff.

**Louvain** (2008) was the standard for years. Fast, decent quality, scales to millions of nodes. Its known flaw: it can get trapped in configurations where communities are internally disconnected. A node might be assigned to a community it barely touches because Louvain's greedy moves don't backtrack.

**Leiden** (2019) fixes the Louvain flaw through refinement. Same conceptual approach, better guarantees. The cost is modest: roughly 1.5-2x slower than Louvain in practice, still far faster than spectral methods or InfoMap. For static graphs, Leiden is generally preferred.

**Label propagation** (2007) is the simplest of the three. O(n) per iteration, naturally incremental, trivially parallelizable. Quality is lower — the result is non-deterministic and can vary significantly across runs. Graphiti's choice of label propagation reflects a real-time requirement that Leiden cannot satisfy.

For knowledge graph systems that batch-process a document corpus (GraphRAG, knowledge base construction), Leiden is the sensible choice. For systems that process streaming data (agent memory, live conversation graphs), label propagation or similar incremental methods are more practical.

## Practical Implications

### Community Quality Affects Retrieval Quality

If Leiden produces communities that mix unrelated entities, community summary generation will produce incoherent summaries, and the community-level retrieval step will return the wrong context. This is a real risk when the underlying knowledge graph has poor edge quality. Leiden clusters what's connected; if entity relationships were extracted with high noise, communities will reflect that noise.

### Resolution Tuning Is Non-Obvious

Choosing γ requires domain knowledge. For a knowledge graph about a software codebase, you might want communities at the module level (γ ≈ 1.0) or the function cluster level (γ ≈ 3.0). GraphRAG's multi-level approach sidesteps this by generating communities at several resolutions and letting the retrieval step select the appropriate level. This adds storage and LLM summarization cost but avoids the tuning problem.

### Recomputation on Updates

Any production system using Leiden faces a batch vs. real-time tradeoff. Leiden requires the full graph to produce optimal communities. If you add 1,000 new entities to a 100,000-node graph, you cannot cheaply update only the affected communities — you have to rerun the full algorithm. For systems with frequent updates, this forces a choice: run Leiden periodically (accepting staleness), use an incremental alternative (accepting quality degradation), or maintain a separate "pending" layer that gets merged in batch runs.

Graphiti acknowledges this directly: "incrementally updated communities gradually diverge from full label propagation results, requiring periodic refreshes." This is even more pronounced for Leiden, which is why Graphiti chose not to use it.

### Community Size Distribution

Leiden tends to produce power-law community size distributions — a few large communities and many small ones. For knowledge graph retrieval, extremely large communities defeat the purpose (too broad for focused retrieval) and singletons waste summarization effort. Monitoring community size distribution after each run and adjusting γ is worth doing in production deployments.

## Failure Modes

**Overfitting to edge noise.** If entity extraction produces many spurious edges (LLM hallucinations, co-occurrence misinterpreted as relationships), Leiden will find structure in the noise. Communities will appear well-formed but won't reflect genuine conceptual groupings. The algorithm has no way to distinguish a meaningful edge from a hallucinated one.

**Resolution instability.** Near-optimal partitions at similar resolution values can differ significantly. Small changes to γ can produce qualitatively different community assignments. This makes communities unreliable as a stable organization scheme if you need to reference them by identity across runs.

**Disconnected graphs.** Leiden operates on the connected components of the graph. If your knowledge graph has many isolated or weakly connected subgraphs (common early in graph construction when not all entities have been related to each other), communities will be fragmented and small, limiting their summarization utility.

## When NOT to Use Leiden

Leiden is unnecessary for small graphs (under a few hundred nodes) — at that scale, searching all nodes directly is faster and more precise than community-level retrieval. It's also the wrong tool when you need deterministic, reproducible results across runs, since small differences in graph state can produce different partitions. If your knowledge graph updates frequently and you cannot afford periodic full recomputation, use label propagation or skip community detection entirely.

## Sources

[Graphiti Architecture](../../raw/repos/getzep-graphiti.md) — community detection design tradeoffs and label propagation vs. Leiden comparison  
[code-review-graph](../../raw/repos/tirth8205-code-review-graph.md) — Leiden implementation via igraph, community use cases in code analysis

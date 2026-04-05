---
entity_id: graphrag
type: project
bucket: knowledge-bases
sources:
  - repos/getzep-graphiti.md
  - repos/osu-nlp-group-hipporag.md
  - repos/tirth8205-code-review-graph.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - repos/infiniflow-ragflow.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/michaelliv-napkin.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:22:39.284Z'
---
# GraphRAG

## What It Does

GraphRAG answers questions about large document collections by building a knowledge graph first, then querying it. Standard RAG retrieves locally relevant chunks; it fails badly on "global" questions like "What are the main themes in this dataset?" because no single chunk contains the answer. GraphRAG addresses this by precomputing a hierarchical summary structure over the entire corpus.

The approach, developed by Microsoft Research and published at arXiv:2404.16130, works in two phases: an expensive offline indexing phase that extracts entities and relationships and groups them into communities, and a query phase that maps over community summaries to generate partial answers before a final aggregation step.

## Core Mechanism

**Indexing (offline):**

An LLM reads source documents and extracts entities (people, places, concepts) and relationships between them as typed triplets. These form a graph. The system then runs a community detection algorithm (Leiden, a hierarchical variant of Louvain) over the graph to cluster related entities into groups at multiple resolution levels. For each community at each level, the LLM writes a summary covering that group's key entities and relationships. These summaries are stored and indexed.

**Query (online):**

For a given question, GraphRAG sends the question to every community summary at the chosen resolution level, asks the LLM to produce a partial answer from each, scores those partial answers for relevance, and then feeds the highest-scoring partial answers into a final LLM call that synthesizes a response.

This map-reduce structure over precomputed summaries is the core architectural idea. No embedding similarity search drives the retrieval step for global queries; instead, every community summary participates, making global coverage the default rather than an approximation.

**Local search mode** does use embeddings: it retrieves entities semantically similar to the query, then traverses the graph to collect neighboring entities, relationships, and community context. This mode suits questions about specific entities rather than corpus-wide themes.

**Implementation:** The reference implementation lives at [microsoft/graphrag](https://github.com/microsoft/graphrag). Key pipeline stages are in `graphrag/index/graph/extractors/` for entity/relationship extraction and `graphrag/index/operations/summarize_communities/` for community summarization. The query logic separating local and global search lives in `graphrag/query/`.

## Key Numbers

The paper evaluates on two datasets in the "1 million token range" using LLM-as-judge methodology. GraphRAG outperforms naive RAG on comprehensiveness and diversity for global sensemaking questions. These benchmarks are self-reported by Microsoft Research authors; independent replication is limited. Latency for global queries scales with corpus size because the map phase hits every community summary, and the paper does not report concrete latency figures. Community summaries cost significant LLM tokens to generate during indexing.

The Graphiti comparison table (from [getzep/graphiti](../projects/graphiti.md)) puts GraphRAG query latency at "seconds to tens of seconds" versus sub-second for graph traversal approaches, which matches expectations from the architecture.

## Strengths

**Global sensemaking queries.** GraphRAG is the right tool when a user needs answers that require synthesizing information spread across an entire corpus, not just a few passages. Theme identification, cross-document comparison, and corpus-level summarization all benefit from the community summary structure.

**Diversity of answers.** Because multiple community summaries contribute partial answers, the final response covers more of the relevant conceptual space than a single-pass retrieval.

**Hierarchical resolution control.** The Leiden community detection produces summaries at multiple granularities. You can tune which level to query depending on how broad or narrow you want the answer.

**Private corpora.** The pipeline runs entirely on documents you provide. No public index or external knowledge base required.

## Critical Limitations

**Concrete failure mode:** The global query mode sends every community summary to the LLM, regardless of relevance. For a corpus with thousands of communities, this means paying LLM inference costs for many calls that contribute nothing to the final answer. The map-reduce design has no early stopping or relevance filtering before the summarization step, so costs scale with community count rather than question specificity. A question about a narrow topic over a large general corpus still evaluates all community summaries.

**Unspoken infrastructure assumption:** GraphRAG assumes you can run a large batch LLM workload at indexing time and absorb the cost. For a 1 million token corpus, the entity extraction and community summarization pipeline may require tens of thousands of LLM calls. Teams without access to high-throughput API tiers (or the budget for them) will find indexing prohibitively slow or expensive. The documentation presents this as a one-time cost, but any corpus update requires re-running affected portions of the pipeline.

## When NOT to Use It

Do not use GraphRAG when:

- **Queries are predominantly local.** If users mostly ask about specific named entities, products, or events, standard RAG with dense retrieval is cheaper and faster. GraphRAG's community summary overhead buys nothing for these queries.
- **The corpus changes frequently.** Incremental indexing is not fully supported in the reference implementation. Corpus updates require re-extraction and potentially re-summarization, making GraphRAG unsuitable for live document streams or frequently updated knowledge bases. For that pattern, see [Graphiti](../projects/graphiti.md), which supports continuous ingestion.
- **Latency is a hard constraint.** The map phase over community summaries takes seconds to tens of seconds. Real-time applications cannot tolerate this.
- **Budget is tight.** The indexing pipeline consumes substantially more LLM tokens than naive chunking approaches. For small teams or high-volume corpora, the cost may be prohibitive.

## Unresolved Questions

The paper and repository documentation leave several operational questions open:

- **Community summary staleness:** No specification of which communities need re-summarization after partial corpus updates, or whether the graph can be updated incrementally.
- **Optimal resolution level selection:** The paper shows that different Leiden levels suit different question types, but provides no automated method for selecting the right level at query time. This is left to the practitioner.
- **Cost at scale:** No published cost benchmarks for real production corpora beyond the research datasets. Teams cannot estimate indexing cost without running the pipeline.
- **Conflict resolution across documents:** When source documents contradict each other, community summarization relies on the LLM to reconcile conflicts. How consistently this works across different model sizes is not documented.
- **Governance:** The project is Microsoft-owned. Future licensing changes, API deprecations, or repository archival are possible; there is no independent foundation or community governance structure.

## Alternatives

| Alternative | Use when |
|---|---|
| Standard dense RAG (LlamaIndex, LangChain) | Queries are local; corpus changes frequently; budget is constrained |
| [Graphiti](../projects/graphiti.md) | You need temporal fact tracking, continuous ingestion, or sub-second query latency |
| HippoRAG | Multi-hop retrieval over static corpora using personalized PageRank; research-oriented |
| RAPTOR | Hierarchical summarization without the graph structure; lower indexing cost than GraphRAG |
| Direct LLM with full context | Corpus fits in context window; simplicity matters more than scale |

GraphRAG is a reasonable choice for analyst-facing tools over large static document collections where users ask open-ended, corpus-wide questions and can tolerate slow queries and high indexing cost. Anywhere those conditions don't hold, a simpler approach will serve better.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.7)

---
entity_id: hipporag
type: project
bucket: knowledge-substrate
abstract: >-
  HippoRAG is a graph-based RAG framework that uses OpenIE-extracted knowledge
  graphs and Personalized PageRank to enable multi-hop retrieval across
  documents — outperforming dense retrieval on associative reasoning tasks at
  lower indexing cost than GraphRAG.
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - retrieval-augmented-generation
  - knowledge-graph
last_compiled: '2026-04-08T02:55:22.121Z'
---
# HippoRAG

## What It Does

HippoRAG is a retrieval-augmented generation framework from OSU-NLP-Group that models its retrieval pipeline after hippocampal memory indexing theory. Standard dense retrieval finds documents semantically similar to a query. HippoRAG instead builds a knowledge graph from extracted entity triples, then uses Personalized PageRank (PPR) to traverse that graph from query-relevant entities — reaching documents connected through multiple associative hops rather than just surface similarity.

Version 2 (ICML '25) extends the original NeurIPS '24 work, adding sense-making capabilities (integrating large, complex contexts) alongside the multi-hop associativity of v1.

The project has 3,332 GitHub stars and is MIT-licensed. Benchmark results are self-reported in the papers; the MuSiQue, HotpotQA, and 2WikiMultiHopQA evaluations are run against established datasets but have not been independently replicated by third parties in published work.

## Architecture

The system centers on a single `HippoRAG` class (`src/hipporag/HippoRAG.py`, ~950 lines) that owns all components: the knowledge graph, three embedding stores, the LLM client, and the OpenIE extractor. There is no pipeline abstraction or step interface — every operation is a method on this class.

Three parallel embedding stores (backed by Parquet files with in-memory numpy arrays) track different granularities of knowledge:

- **chunk_embedding_store**: raw document passages
- **entity_embedding_store**: extracted entity names
- **fact_embedding_store**: subject-predicate-object triples as strings

Content is addressed by MD5 hash with namespace prefixes (`chunk-`, `entity-`, `fact-`), giving natural deduplication and enabling incremental indexing for new documents.

The knowledge graph uses igraph and persists to a Pickle file.

## Core Mechanism

### Indexing

**OpenIE extraction** runs in two LLM passes per chunk. First, NER extracts entities as a JSON list. Second, triple extraction takes the passage plus those entities and generates subject-predicate-object triples constrained to the known entity set. Both passes use `ThreadPoolExecutor` for parallelism. Results cache to `openie_results_ner_{model_name}.json`, so re-indexing only processes new chunks.

**Graph construction** creates three edge types:

1. **Fact edges**: subject entity → object entity, weighted by co-occurrence frequency
2. **Passage edges**: chunk nodes → entity nodes they contain
3. **Synonymy edges**: the key innovation. After the initial graph is built, the system runs KNN over all entity embeddings and connects pairs above `synonymy_edge_sim_threshold` with edges weighted by cosine similarity. This is what lets "Barack Obama" and "Obama" become linked — and what enables cross-document reasoning when the same real-world entity appears under different surface forms.

Synonymy edge computation caps at 100 nearest neighbors per entity (`synonymy_edge_topk`) to prevent explosion.

### Retrieval

**Step 1 — Fact retrieval**: Query embeddings are compared against the fact embedding store by cosine similarity.

**Step 2 — Recognition memory filter**: A DSPy-optimized few-shot prompt filters the candidate facts. The `DSPyFilter` class (`rerank.py`) sends the query plus candidate facts to the LLM, which returns a filtered list. The parser looks for `[[ ## fact_after_filter ## ]]` markers in the response. If no facts survive filtering, the system falls back to pure dense passage retrieval.

**Step 3 — Personalized PageRank**: The filtered facts' entity nodes become PPR seed nodes. PPR propagates relevance scores through the graph, naturally following entity relationships and synonymy edges. Passage nodes accumulate scores from PPR, combined with direct dense retrieval scores weighted by `passage_node_weight`. This hybrid produces the final document ranking.

The system tracks `self.ppr_time`, `self.rerank_time`, and `self.all_retrieval_time` across queries for profiling without external tooling.

## Key Numbers

- **3,332 stars**, 333 forks (as of early 2026)
- Evaluated on MuSiQue, [HotpotQA](../projects/hotpotqa.md), 2WikiMultiHopQA — self-reported improvements over standard dense retrieval on multi-hop tasks
- Recall@k tracked at k = 1, 2, 5, 10, 20, 30, 50, 100, 150, 200
- OpenIE supports GPT-4o-mini and Llama-3.3-70B-Instruct (pre-computed results included)
- NeurIPS '24 (v1), ICML '25 (v2) — peer-reviewed but not independently reproduced

The papers claim HippoRAG 2 surpasses [GraphRAG](../projects/graphrag.md), RAPTOR, and LightRAG across factual memory, sense-making, and associativity dimensions on their benchmark suite. These figures are self-reported.

## Strengths

**Multi-hop associative reasoning.** Queries that require connecting information across multiple documents — "What county is Erik Hort's birthplace part of?" — benefit from PPR traversal. Dense retrieval returns documents similar to the query; HippoRAG follows entity links from "birthplace = Montebello" to "Montebello ∈ Rockland County" through the graph.

**Lower indexing cost than graph alternatives.** GraphRAG and LightRAG build communities or hierarchical summaries at indexing time, requiring substantial LLM calls per document. HippoRAG's indexing LLM cost is bounded by two passes per chunk (NER + triple extraction), with the rest being embedding and graph operations.

**Incremental indexing.** The OpenIE cache and content-addressed embedding stores support adding new documents without re-processing existing ones. The `load_existing_openie()` method handles this natively.

**Fallback to dense retrieval.** When the recognition memory filter returns nothing, the system degrades to standard dense passage retrieval rather than returning empty results.

## Critical Limitations

**Entity normalization is fragile.** The NER step depends entirely on the LLM's entity extraction, and different surface forms of the same entity may not get connected via synonymy edges if their embeddings fall below threshold. Short abbreviations ("US" vs. "United States of America") are particularly risky — embedding similarity between them varies by model. Missed entity connections in the graph directly degrade multi-hop retrieval.

**The graph must fit in memory.** igraph loads entirely into RAM for PPR computation. There is no on-disk graph traversal. For corpora producing millions of entities, memory becomes a hard constraint before latency does.

**Unspoken infrastructure assumption:** The indexing pipeline assumes LLM API availability during ingestion — you need either an OpenAI-compatible endpoint or a local vLLM/Transformers setup running during the indexing phase, not just at query time. Teams ingesting documents on restricted networks or air-gapped systems cannot run HippoRAG's indexing as-is.

## When Not to Use It

**Single-document or shallow retrieval tasks.** If your queries can be answered from a single document retrieved by semantic similarity, the graph construction and PPR overhead provide no benefit over standard [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md).

**Real-time ingestion with latency SLAs.** Synonymy edge computation is all-pairs KNN over all entities — and the current implementation recomputes this for the full entity set on each indexing run despite code comments suggesting incremental computation was intended. Large corpora with continuous document updates will hit this.

**When entity extraction quality cannot be validated.** The entire retrieval pipeline depends on OpenIE quality. Domains with dense technical terminology, ambiguous entity boundaries, or non-English text will produce noisy graphs that make PPR traversal unreliable.

**High-throughput production retrieval.** The recognition memory filter requires an LLM call per query. At scale, this is both a latency bottleneck and a cost multiplier on top of embedding costs.

## Unresolved Questions

The documentation does not address:

- **Cost at scale.** No published figures on LLM API cost per document for the full indexing pipeline across different corpus sizes. The claim of lower cost than GraphRAG is relative, not absolute.
- **Synonymy threshold calibration.** `synonymy_edge_sim_threshold` critically affects graph quality, but the docs provide no guidance on setting it for new domains or embedding models. Default values are tuned for their benchmark datasets.
- **Pickle graph portability.** The igraph Pickle format is not portable across Python major versions and not queryable by external tools. For teams that need to inspect or query the graph outside Python, this is opaque storage.
- **Conflict resolution on contradictory facts.** If two documents assert contradictory triples about the same entity, HippoRAG adds both to the graph. PPR will score both paths. There is no deduplication or credibility weighting.

## Alternatives

| Use when | Consider instead |
|---|---|
| Graph-scale indexing with community detection and LLM-generated summaries | [GraphRAG](../projects/graphrag.md) |
| Hierarchical document summarization for recursive retrieval | [RAPTOR](../projects/raptor.md) |
| Temporal knowledge graph with fast incremental updates | [Graphiti](../projects/graphiti.md) |
| Simple semantic retrieval without multi-hop needs | [LlamaIndex](../projects/llamaindex.md) or [LangChain](../projects/langchain.md) with dense retrieval |
| Agent memory with episodic + semantic separation | [Zep](../projects/zep.md) or [Mem0](../projects/mem0.md) |

GraphRAG is the closest architectural competitor: it also uses graphs for retrieval but builds community summaries at indexing time (higher cost, better narrative synthesis). HippoRAG trades that summary-level comprehension for lower indexing cost and direct PPR traversal. Use GraphRAG when your queries ask for synthesized overviews across large document sets; use HippoRAG when your queries require following specific entity chains across documents.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the base paradigm HippoRAG extends
- [Knowledge Graph](../concepts/knowledge-graph.md) — the core data structure for entity and relation storage
- [Semantic Memory](../concepts/semantic-memory.md) — the cognitive analog for fact-based knowledge representation
- [Hybrid Search](../concepts/hybrid-search.md) — HippoRAG's PPR + dense retrieval combination
- [Community Detection](../concepts/community-detection.md) — used by competing approaches like GraphRAG

---
entity_id: hipporag-project
type: project
bucket: knowledge-bases
abstract: >-
  HippoRAG is a RAG framework that builds a knowledge graph from extracted
  triples, then uses Personalized PageRank to retrieve documents through
  multi-hop entity relationships, outperforming dense retrieval on questions
  requiring cross-document reasoning.
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T23:20:43.283Z'
---
# HippoRAG

**Type:** Project — Knowledge Base / RAG Framework
**Source:** OSU NLP Group | [GitHub](https://github.com/OSU-NLP-Group/HippoRAG) | NeurIPS '24, ICML '25
**License:** MIT | **Stars:** ~3,300 (self-reported)

## What It Does

HippoRAG translates hippocampal memory indexing theory into a retrieval pipeline. The brain's hippocampus encodes memories as association graphs between concepts rather than as similarity-ranked documents. HippoRAG does the same: it extracts entity-relation-entity triples from documents, builds a weighted graph, then uses Personalized PageRank (PPR) to propagate relevance from query-matching entities through the graph to discover connected documents the query didn't mention directly.

The practical payoff is multi-hop retrieval. For a query like "What county is Erik Hort's birthplace in?" — standard dense retrieval finds documents matching "Erik Hort" or "county." HippoRAG finds the Montebello document, follows the Montebello→Rockland County edge, and returns both, without the query ever mentioning Montebello.

## Architecture

The pipeline runs in two phases: offline indexing and online retrieval. Both are orchestrated by a single `HippoRAG` class (`src/hipporag/HippoRAG.py`, ~950 lines).

**Indexing (offline)**

1. **OpenIE extraction** — `information_extraction/openie_openai.py` runs two LLM passes per chunk: first a NER pass (prompt template in `prompts/templates/ner.py`) to extract entity names, then a triple extraction pass conditioned on those entities. Results are cached to `openie_results_ner_{model_name}.json`, so re-indexing only processes new chunks.

2. **Embedding** — Three parallel embedding stores (chunks, entities, facts) backed by Parquet files with in-memory numpy arrays. Content is addressed by MD5 hash with namespace prefixes (`chunk-`, `entity-`, `fact-`), giving natural deduplication.

3. **Graph construction** — An igraph `Graph` is built with three edge types:
   - *Fact edges*: subject entity → object entity, weighted by co-occurrence frequency
   - *Passage edges*: chunk node → entity nodes it contains
   - *Synonymy edges*: KNN over entity embeddings; pairs above `synonymy_edge_sim_threshold` get connected. This is the system's answer to entity normalization — "US" and "United States" get linked if their embeddings are close enough. Cap at 100 nearest neighbors per entity.

The graph persists as a Pickle file (`graph.pickle`).

**Retrieval (online)**

1. Query embedding compared against the fact store to get candidate facts.
2. A DSPy-optimized recognition memory filter (`rerank.py`, `DSPyFilter`) makes an LLM call to discard irrelevant facts. The prompt is pre-trained with few-shot examples loaded from `filter_default_prompt.py`.
3. Surviving facts yield entity nodes as PPR seeds. PPR propagates scores through the knowledge graph. Passage node scores combine PPR output with direct dense retrieval similarity, weighted by `passage_node_weight`.
4. If no facts survive filtering, the system falls back to pure dense passage retrieval.

Supported LLM backends: OpenAI, Azure, AWS Bedrock, local vLLM, local Transformers. Supported embedding models: OpenAI, Cohere, NV-Embed, GritLM, Contriever.

## Key Numbers

From self-reported benchmarks across MuSiQue, HotpotQA, and 2WikiMultiHopQA (multi-hop QA datasets), HippoRAG 2 claims improvements in associativity over standard RAG and graph alternatives including GraphRAG, RAPTOR, and LightRAG, while using fewer resources for offline indexing. The evaluation scripts in `retrieve/` allow reproduction with pre-computed OpenIE outputs using GPT-4o-mini or Llama-3.3-70B. **These numbers are self-reported; no independent third-party audit was found.**

The built-in profiler tracks `all_retrieval_time`, `rerank_time`, and `ppr_time` per query, making it straightforward to identify where latency goes on your own data.

## Strengths

**Multi-hop retrieval** is the genuine differentiator. Dense retrieval retrieves documents similar to the query. HippoRAG retrieves documents connected to query-relevant entities through chains of relationships. For knowledge bases with heavily interconnected concepts — research literature, legal documents, wikis — this is a substantial capability gap.

**Incremental indexing** works well. The OpenIE cache and content-addressed embedding stores mean you can add documents without reprocessing the entire corpus. The `delete()` method implements referential integrity: entities and triples are removed only if no remaining document references them.

**Configurable trade-offs** across synonymy threshold, PPR/dense weighting, and recognition memory filtering give meaningful tuning handles without requiring code changes.

## Critical Limitations

**Concrete failure mode — entity normalization fragility:** The NER pass extracts entity names as strings. "Barack Obama," "Obama," "President Obama," and "the former president" may all appear as separate nodes. Synonymy edges close some gaps, but short or ambiguous entity names like "US" may not embed close enough to "United States of America" to get connected, depending on the embedding model. When this happens, the graph splits what should be one concept into multiple disconnected nodes, and PPR produces wrong scores. There is no deduplication step beyond the embedding-similarity gate.

**Unspoken infrastructure assumption:** The igraph is loaded entirely into RAM. For a corpus producing millions of entities and facts, memory becomes a hard constraint. The Parquet embedding stores can grow large but load lazily; the graph cannot. At moderate corpus scale (tens of thousands of documents), RAM consumption becomes the binding constraint before latency does.

**Synonymy edge recomputation:** The code comment suggests incremental synonymy edge computation was intended, but the current implementation re-runs all-pairs KNN over all entities on every index call. For large entity sets, this is expensive.

**Recognition memory bottleneck:** The DSPy filter requires one LLM call per query at inference time, adding latency and cost. The `max_completion_tokens = 512` cap may truncate results when many facts are relevant, silently dropping correct answers.

## When NOT to Use It

- **Real-time retrieval under latency constraints.** PPR on a large graph is not fast. If your application needs sub-100ms retrieval, HippoRAG is the wrong tool unless you've profiled your specific graph size.
- **Simple factual lookup over a small corpus.** When users ask direct questions answerable from a single passage, the OpenIE extraction cost, LLM filter call, and graph traversal add complexity with no benefit over BM25 or a dense vector store.
- **Production deployments requiring operational simplicity.** The Pickle-serialized graph is not queryable externally, not portable across Python versions, and not designed for concurrent writes. Teams needing a graph database with transactional guarantees need to re-implement the storage layer.
- **Corpora where entity boundaries are ambiguous.** Medical text, legal text, or any domain with heavy use of pronouns and co-reference will stress the NER→triple pipeline in ways that accumulate into corrupted graph structure.

## Unresolved Questions

- **Synonymy threshold guidance:** The documentation does not provide empirical guidance for setting `synonymy_edge_sim_threshold` across different embedding models. Too permissive and you introduce false synonymy that corrupts graph topology; too strict and multi-hop reasoning breaks down. This requires empirical tuning on each new corpus.
- **Cost at scale:** The OpenIE extraction requires at minimum two LLM calls per document chunk. For large corpora, this is substantial. The pre-computed results in `retrieve/` sidestep this for benchmark evaluation but do not address production indexing cost.
- **Graph update conflict resolution:** When two documents produce contradictory triples about the same entity pair, both edges get added. PPR then scores based on graph structure, not factual accuracy. There is no mechanism to detect or resolve contradictions.
- **DSPy filter generalization:** The few-shot prompt in `filter_default_prompt.py` was optimized on specific training distributions. Its performance on domain-specific corpora (medical, legal, code) outside the benchmark datasets is not documented.

## Alternatives

| Tool | Use when |
|---|---|
| **Standard dense retrieval** (FAISS + sentence-transformers) | Single-hop queries, latency requirements, operational simplicity |
| **GraphRAG** (Microsoft) | You need community-level summarization across a corpus, not just multi-hop entity retrieval |
| **RAPTOR** | Hierarchical summarization matters more than entity-level graph traversal |
| **LightRAG** | You want graph-enhanced RAG with lower indexing cost than GraphRAG but less semantic depth than HippoRAG |
| **BM25** | Keyword-heavy retrieval, no infrastructure budget for LLM-based indexing |

Use HippoRAG when your queries genuinely require chaining through multiple entity relationships across documents, your corpus has a knowledge-intensive structure (wikipedia-style, research papers, interconnected factual records), and you can absorb the offline indexing cost and online LLM filter latency.

## Sources

- [Deep repository analysis](../raw/deep/repos/osu-nlp-group-hipporag.md)
- [Repository overview](../raw/repos/osu-nlp-group-hipporag.md)
- [Context engineering survey (background)](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

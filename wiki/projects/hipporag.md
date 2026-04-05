---
entity_id: hipporag
type: project
bucket: knowledge-bases
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:34:17.290Z'
---
# HippoRAG

**Type:** RAG Framework | **Language:** Python | **License:** MIT | **Stars:** 3,332 (as of early 2025)

Published at NeurIPS '24 (v1) and ICML '25 (v2). OSU NLP Group.

[Source](../../raw/repos/osu-nlp-group-hipporag.md) | [Deep Analysis](../../raw/repos/osu-nlp-group-hipporag.md)

Related: Retrieval-Augmented Generation

---

## What It Does

HippoRAG replaces standard dense passage retrieval with a knowledge-graph-based pipeline modeled on hippocampal memory indexing theory. The core claim: human associative memory works through a graph of entity relationships, not through nearest-neighbor search over document embeddings. By building a knowledge graph from OpenIE-extracted triples and running Personalized PageRank (PPR) over it, HippoRAG can answer multi-hop questions that require connecting facts across several documents — something flat vector search reliably fails at.

HippoRAG 2 extends this to a "continual learning" framing: the graph can absorb new documents incrementally without retraining any model weights, making it a form of non-parametric long-term memory.

---

## Architecture

The pipeline has two phases: offline indexing and online retrieval.

### Indexing

Documents go through `OpenIE` (`information_extraction/openie_openai.py`) in two sequential LLM calls per chunk:

1. **NER pass**: A prompt from `prompts/templates/ner.py` extracts named entities as JSON. Entities are deduplicated by insertion order via `dict.fromkeys()`. A regex pattern `\{[^{}]*"named_entities"\s*:\s*\[[^\]]*\][^{}]*\}` parses the output, and `fix_broken_generated_json()` handles truncated responses when `finish_reason == 'length'`.

2. **Triple extraction pass**: A second prompt (`prompts/templates/triple_extraction.py`) generates subject-predicate-object triples constrained to entities from step 1. This two-pass design reduces hallucinated relations — if the entity wasn't named in step 1, it won't appear in a triple. Results cache to `openie_results_ner_{model_name}.json`, so re-indexing skips already-processed chunks.

Three parallel embedding stores (each backed by Parquet + numpy arrays in `EmbeddingStore`) hold:
- **chunk_embedding_store**: raw document passages
- **entity_embedding_store**: extracted entity names
- **fact_embedding_store**: triples serialized as strings

Content is addressed by MD5 hash with namespace prefixes (`chunk-`, `entity-`, `fact-`), giving natural deduplication.

An `igraph.Graph` is then built with three edge types:
- **Fact edges**: subject entity → object entity, weighted by co-occurrence frequency
- **Passage edges**: chunk node → entity nodes it contains
- **Synonymy edges**: the distinctive component. KNN over entity embeddings connects semantically equivalent entities ("US" ↔ "United States") above a configurable threshold (`synonymy_edge_sim_threshold`), capped at 100 neighbors per entity. These edges enable cross-document reasoning even when surface forms differ.

The graph persists as a Pickle file (`graph.pickle`).

### Retrieval

Given a query:

1. **Fact retrieval**: Query embedding vs. the fact embedding store yields candidate triples.
2. **Recognition memory filter**: `DSPyFilter` (`rerank.py`) sends candidates to an LLM with a DSPy-optimized few-shot prompt (loaded from `filter_default_prompt.py`). The parser looks for `[[ ## fact_after_filter ## ]]` markers in the response. If no facts survive, the system falls back to pure dense passage retrieval.
3. **Personalized PageRank**: Surviving facts' entity nodes become PPR seed nodes. PPR propagates relevance through the graph, naturally traversing synonymy and fact edges to surface documents connected through multiple hops.
4. **Hybrid scoring**: PPR scores over passage nodes combine with direct dense retrieval scores, weighted by `passage_node_weight`.

The `HippoRAG` class (`src/hipporag/HippoRAG.py`, ~950 lines) orchestrates all of this. No pipeline abstraction separates components — everything shares instance state.

---

## Key Numbers

| Benchmark | Claim |
|---|---|
| Multi-hop QA (MuSiQue, 2Wiki, HotpotQA) | HippoRAG 2 outperforms GraphRAG, RAPTOR, LightRAG |
| Factual retrieval (NaturalQuestions, PopQA) | Competitive with dense retrieval baselines |
| Sense-making (NarrativeQA) | Surpasses dense retrieval and graph competitors |

**Credibility note**: All benchmarks are self-reported by the authors in the papers. No independent third-party replication is cited in the repository. The evaluation scripts and pre-computed OpenIE results are included (`retrieve/` directory), so reproduction is feasible, but independently validated numbers are not available.

---

## Strengths

**Multi-hop reasoning**: PPR over a knowledge graph structurally handles transitive relationships. A query about "Erik Hort's birthplace county" can traverse `Erik Hort → Montebello → Rockland County` even if no single document spans the full chain.

**Incremental indexing**: `load_existing_openie()` skips re-processing cached chunks. The `delete()` method propagates removals through triple and entity layers, only removing entities with no remaining document references.

**Offline efficiency vs. GraphRAG**: OpenIE extraction is cached and batched via `ThreadPoolExecutor`. The authors position this as substantially cheaper at indexing time than GraphRAG or RAPTOR, which build more elaborate graph structures.

**Backend flexibility**: Supports OpenAI, Azure, AWS Bedrock, vLLM, and local Transformers for the LLM. Embedding backends include NV-Embed, GritLM, Contriever, and OpenAI embeddings.

---

## Critical Limitations

**Concrete failure mode — entity normalization fragility**: The NER pass produces entity names as strings. "Barack Obama", "Obama", and "President Obama" may become three separate graph nodes. Synonymy edges are supposed to stitch these together, but short strings like "US" may not embed close enough to "United States of America" to trigger the threshold. Errors compound: a missed entity in pass 1 means a missed triple in pass 2, and a missed triple means a broken graph edge. The system has no error-detection for this cascade.

**Unspoken infrastructure assumption**: The igraph must fit in memory. For large corpora, the entity and triple counts grow proportionally to document count. Parquet-backed embedding stores can be loaded lazily, but PPR requires the full graph in RAM. The repository contains no guidance on corpus size limits, and there's no graph database backend option — only the Pickle file.

---

## When Not to Use It

- **Latency-sensitive applications**: Every retrieval requires an LLM call for the recognition memory filter (DSPy reranking), plus PPR computation on the graph. Built-in time tracking (`self.ppr_time`, `self.rerank_time`) signals that the authors know this is slow, but there's no async path.
- **Simple single-document retrieval**: If your queries match one document without needing cross-document reasoning, the graph construction overhead buys nothing. Standard dense retrieval is faster and cheaper.
- **Corpora with structured data**: The OpenIE pipeline is designed for unstructured text. Tabular or highly structured data produces poor NER results and thin triple graphs.
- **Production with memory constraints**: If your deployment environment caps RAM, the in-memory igraph will be the first thing to fail at scale.

---

## Unresolved Questions

**Synonymy threshold tuning**: The documentation gives no guidance on setting `synonymy_edge_sim_threshold` for a new domain. Too low: false synonymy connections corrupt graph traversal. Too high: related entities stay disconnected and multi-hop reasoning breaks. The repository's default was tuned on the provided benchmark corpora.

**Incremental synonymy edges**: The code contains a comment stating that synonymy edge computation runs over all entities every time, despite an apparent intent to make it incremental. At scale, this means re-indexing one document triggers a full all-pairs KNN recomputation over the entity embedding store.

**DSPy prompt provenance**: The default recognition memory filter prompt is a trained DSPy artifact (`filter_default_prompt.py`). The documentation does not explain which dataset the DSPy optimization ran on, whether it generalizes to other domains, or how to re-optimize it for a new use case.

**Governance and maintenance**: The project is academic software from a university lab. The v2 paper appeared at ICML '25, but there's no stated maintenance commitment or commercial backing.

---

## Alternatives

| System | Choose when |
|---|---|
| **Standard dense RAG** (LlamaIndex, LangChain) | Single-hop retrieval, latency matters, simple deployment |
| **GraphRAG** (Microsoft) | You need community-level summarization over large corpora and can afford higher indexing cost |
| **LightRAG** | You want graph-enhanced retrieval with lower implementation complexity |
| **RAPTOR** | Your documents have clear hierarchical structure and you want tree-based summarization |
| **HippoRAG** | Multi-hop QA over a corpus where answers require connecting facts across documents, offline indexing cost is acceptable, latency is flexible |


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.7)

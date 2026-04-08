---
entity_id: hipporag
type: project
bucket: knowledge-substrate
abstract: >-
  HippoRAG is a RAG framework modeling hippocampal memory indexing theory:
  OpenIE-extracted knowledge graphs + Personalized PageRank enable multi-hop
  associative retrieval that dense vector search structurally cannot perform.
sources:
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/osu-nlp-group-hipporag.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/osu-nlp-group-hipporag.md
related:
  - retrieval-augmented-generation
  - knowledge-graph
  - openclaw
  - claude-code
last_compiled: '2026-04-08T23:12:50.875Z'
---
# HippoRAG

## What It Does

HippoRAG is a retrieval-augmented generation framework built around a neuroscience analogy: the human hippocampus encodes memories not as isolated records but as a web of associations, enabling recall through pattern completion rather than direct content matching. Standard RAG retrieves documents similar to a query. HippoRAG retrieves documents *connected* to a query through chains of entity relationships — a meaningful distinction when answering questions like "What county is Erik Hort's birthplace part of?" requires linking three separate documents.

The v2 paper (ICML '25, following NeurIPS '24 for v1) frames this as non-parametric continual learning: as new documents arrive, the knowledge graph grows and the retrieval system improves without any model fine-tuning. [Source](../raw/deep/repos/osu-nlp-group-hipporag.md)

**3,332 GitHub stars**, 333 forks. Published benchmark results are self-reported from the OSU NLP Group — not independently replicated by third parties, though the NeurIPS acceptance provides some credibility signal.

## Core Mechanism

### Indexing: Knowledge Graph Construction

The `HippoRAG` class (`src/hipporag/HippoRAG.py`, ~950 lines) runs documents through a two-pass OpenIE extraction:

1. **NER pass** — A prompt in `prompts/templates/ner.py` extracts named entities as JSON. The response is parsed with a regex targeting the `named_entities` key. Entities are deduplicated preserving insertion order via `dict.fromkeys()`.

2. **Triple extraction pass** — The passage plus extracted entities feed `prompts/templates/triple_extraction.py` to generate subject-predicate-object triples. The entity list from pass one constrains this step, reducing hallucinated relations. The `fix_broken_generated_json()` utility handles truncated outputs when `finish_reason == 'length'`.

Both passes run in parallel via `ThreadPoolExecutor`. Results cache to `openie_results_ner_{model_name}.json`, so re-indexing only processes new chunks.

Three content-addressable embedding stores back the system (Parquet files + in-memory numpy arrays, keyed by MD5 hash):
- **chunk_embedding_store** — raw document passages
- **entity_embedding_store** — extracted entity names
- **fact_embedding_store** — triple strings

An igraph `Graph` is constructed with three edge types:
- **Fact edges** — subject → object, weighted by co-occurrence frequency
- **Passage edges** — chunk nodes → entity nodes they contain
- **Synonymy edges** — the novel contribution: KNN over entity embeddings connects semantically similar entities ("Barack Obama" ↔ "Obama") above a configurable similarity threshold, with a cap of 100 nearest neighbors per entity

Synonymy edges are the computational analog of pattern completion — they let the graph traverse across entity surface-form variants without requiring exact string matches.

### Retrieval: Personalized PageRank

Given a query:

1. **Fact retrieval** — Query embedding compared against fact embeddings for top-k candidate facts.

2. **Recognition memory filter** — A DSPy-optimized reranking prompt (`rerank.py`) filters irrelevant facts. The default prompt loads from `filter_default_prompt.py` and uses few-shot examples trained by DSPy. The parser looks for `[[ ## fact_after_filter ## ]]` markers in the response. This step requires one LLM call per query.

3. **Personalized PageRank** — Surviving facts identify seed entity nodes. PPR propagates relevance scores through the graph from these seeds, naturally following fact edges and synonymy edges to discover transitively connected documents. Passage node scores combine PPR scores with direct dense similarity, weighted by `passage_node_weight`.

4. **DPR fallback** — If the recognition memory filter removes all facts, the system falls back to direct cosine similarity over chunk embeddings.

This pipeline is what separates HippoRAG from [GraphRAG](../projects/graphrag.md): HippoRAG uses PPR for traversal rather than community summarization, which makes it cheaper at indexing time but puts more weight on the graph topology being correct.

## Key Numbers

Evaluated on three multi-hop QA benchmarks (MuSiQue, [HotpotQA](../projects/hotpotqa.md), 2WikiMultiHopQA) and single-hop retrieval (NaturalQuestions, PopQA) plus sense-making (NarrativeQA). Figure 1 in the paper shows HippoRAG 2 outperforming GraphRAG, RAPTOR, and LightRAG across all five categories. These numbers are self-reported; the evaluation framework and datasets are open-sourced in the repository's `retrieve/` directory, with pre-computed OpenIE results for reproducibility.

The repository supports evaluation at retrieval recall@k (k=1,2,5,10,20,30,50,100,150,200) and QA exact match + F1. Time profiling is built in: `self.all_retrieval_time`, `self.rerank_time`, and `self.ppr_time` accumulate across queries.

## Strengths

**Multi-hop reasoning.** When a question requires connecting information across multiple documents with no shared surface-form keywords, PPR over the knowledge graph finds paths that vector similarity cannot. This is the system's core advantage and the reason the architecture exists.

**Continual indexing.** The `delete()` method propagates removals through triple and entity layers, only removing entities not referenced by remaining documents. The `load_existing_openie()` method enables incremental indexing. New documents can be added without full reindexing.

**Backend flexibility.** Supports OpenAI, Azure, Bedrock, local vLLM, and local Transformers for LLM calls. Embedding backends include NV-Embed-v2, GritLM, Contriever, and OpenAI. Configuration is centralized in `BaseConfig` with HfArgumentParser.

**Indexing cost efficiency.** Compared to GraphRAG's community detection approach and RAPTOR's recursive summarization, HippoRAG's OpenIE extraction + PPR requires fewer LLM calls at indexing time. Community summarization in GraphRAG can require hundreds of LLM calls for large corpora; HippoRAG scales with document count rather than graph size.

## Critical Limitations

**Concrete failure mode — entity normalization brittleness.** The OpenIE pipeline depends entirely on the LLM's NER capability. Short abbreviations ("US", "UK") may not embed similarly enough to their full forms to generate synonymy edges above threshold, depending on the embedding model. If "United States" and "US" remain as separate unconnected graph nodes, queries about one will miss documents about the other. There is no explicit canonicalization step — the system relies on embedding proximity to bridge surface variants.

**Unspoken infrastructure assumption.** The igraph must fit entirely in memory. For large corpora with millions of entities, this becomes a bottleneck before the Parquet-backed embedding stores do. The graph is stored as a Python Pickle file — not portable across Python versions, not queryable externally, and not suitable for production multi-process access. PPR computation on a large graph also adds latency that may be incompatible with real-time applications.

## When NOT to Use It

**Latency-sensitive applications.** The DSPy recognition memory filter requires one LLM call per query. PPR computation adds additional time. For sub-second retrieval requirements, standard dense retrieval or [BM25](../concepts/bm25.md) with a reranker will substantially outperform HippoRAG.

**Simple factual lookup.** If your queries are self-contained ("What is the capital of France?") and documents don't require cross-document reasoning, the graph construction overhead buys nothing. Standard [Semantic Search](../concepts/semantic-search.md) is faster, cheaper, and comparably accurate.

**High-throughput indexing pipelines.** OpenIE extraction is LLM-dependent and rate-limited. Indexing millions of documents requires significant LLM budget and parallelism infrastructure that the system doesn't manage — it uses `ThreadPoolExecutor` but provides no queue management, retry logic, or cost tracking beyond the cached JSON files.

**Corpora with poor entity extractability.** Domains with highly domain-specific terminology (clinical notes, legal contracts with undefined abbreviations, code) will produce low-quality entity extraction, making the knowledge graph sparse or noisy. Standard RAG degrades more gracefully in these domains.

## Unresolved Questions

**Synonymy threshold tuning.** The similarity threshold for synonymy edges is configurable but no guidance exists for how to set it for a new domain. Too high: cross-document reasoning fails because related entities aren't connected. Too low: false connections corrupt the graph. The repository provides defaults tuned on academic QA benchmarks; production deployments require their own calibration.

**All-pairs synonymy edge scaling.** The code comment suggests synonymy edges were intended to be computed incrementally (only between new and existing entities), but the current implementation runs all-pairs KNN across all entities at indexing time. For corpora with hundreds of thousands of entities, this is computationally prohibitive. No documentation explains the intended production path.

**DSPy optimization replicability.** The default recognition memory filter prompt loads from `filter_default_prompt.py` — a pre-trained DSPy artifact. No documentation explains how to re-optimize this prompt for a new domain or what training data was used. Custom deployments inherit a filter tuned for academic QA benchmarks.

**Cost at scale.** The paper emphasizes indexing cost efficiency vs. GraphRAG, but no public numbers exist for realistic enterprise corpora (100K+ documents). The OpenIE caching mechanism suggests the authors consider LLM cost a practical concern, but there's no cost model for estimating a deployment budget.

## Alternatives

**Use [GraphRAG](../projects/graphrag.md)** when your queries require high-level thematic summarization across a large corpus ("What are the main themes in this document collection?") rather than specific multi-hop fact chains. GraphRAG's community detection produces summaries at multiple granularities; HippoRAG's PPR finds specific entity connection paths.

**Use [RAPTOR](../projects/raptor.md)** when your documents have clear hierarchical structure and queries benefit from reasoning at different levels of abstraction. RAPTOR's recursive summarization tree is better suited to long documents with nested concepts.

**Use standard dense retrieval ([LlamaIndex](../projects/llamaindex.md), [LangChain](../projects/langchain.md))** when your queries are self-contained, your corpus doesn't require cross-document reasoning, and latency or cost is a primary constraint.

**Use [Graphiti](../projects/graphiti.md)** when you need a knowledge graph that supports temporal reasoning and evolving facts — Graphiti tracks when facts were valid, which HippoRAG does not.

**Use [Agentic RAG](../concepts/agentic-rag.md)** when the multi-hop reasoning pattern is unpredictable and task-specific — an agent deciding dynamically what to retrieve can outperform a fixed graph traversal strategy when the query structure varies widely.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the base paradigm HippoRAG extends
- [Knowledge Graph](../concepts/knowledge-graph.md) — the central data structure
- [Semantic Memory](../concepts/semantic-memory.md) — the memory type HippoRAG most directly implements
- [Community Detection](../concepts/community-detection.md) — the alternative graph strategy used by GraphRAG
- [Hybrid Search](../concepts/hybrid-search.md) — the retrieval approach HippoRAG combines with graph traversal

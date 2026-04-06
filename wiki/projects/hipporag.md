---
entity_id: hipporag
type: project
bucket: knowledge-bases
abstract: >-
  HippoRAG: RAG framework using OpenIE knowledge graphs + Personalized PageRank
  to enable multi-hop associative retrieval, outperforming dense retrieval on
  multi-hop QA benchmarks.
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - knowledge-graph
last_compiled: '2026-04-06T02:11:09.914Z'
---
# HippoRAG

## What It Does

HippoRAG is a [Retrieval-Augmented Generation](../concepts/rag.md) framework from Ohio State's NLP group (NeurIPS 2024, ICML 2025) that replaces standard dense passage retrieval with a knowledge graph traversal system modeled on hippocampal memory indexing theory. The central claim: human associative memory works by indexing facts into a web of entity relationships, then using pattern completion to traverse that web during recall. HippoRAG implements this as OpenIE extraction into an igraph knowledge graph, followed by Personalized PageRank (PPR) to surface documents connected through multi-hop entity chains rather than direct query similarity.

Version 2 ("From RAG to Memory") extends the framework toward continual learning, positioning it as a non-parametric alternative to fine-tuning for knowledge integration.

The system targets multi-hop QA tasks where the answer requires connecting information across documents that don't individually match the query well.

## Architecture

```
Documents
  → OpenIE (NER pass → triple extraction pass)
  → Knowledge Graph (igraph, Pickle-persisted)
  → Synonymy edges (KNN on entity embeddings)
  → [Query time]
  → Fact embedding retrieval
  → DSPy recognition memory filter
  → Personalized PageRank from surviving entity nodes
  → Hybrid score (PPR + dense passage similarity)
  → Retrieved chunks
```

Three parallel embedding stores back the system, each as a Parquet file with in-memory numpy arrays for similarity computation:
- **chunk_embedding_store**: raw document passages
- **entity_embedding_store**: extracted entity names
- **fact_embedding_store**: extracted triples as strings

Content is addressed by MD5 hash with namespace prefixes (`chunk-`, `entity-`, `fact-`), giving natural deduplication and enabling incremental indexing.

The entire system lives in `src/hipporag/HippoRAG.py` (~950 lines), a single monolithic class with no pipeline abstraction. All components share state through instance attributes.

## Core Mechanism

### Indexing

The `OpenIE` class (`information_extraction/openie_openai.py`) runs two sequential LLM passes per chunk:

1. **NER pass**: Extracts named entities via `prompts/templates/ner.py`. Response parsed with regex: `\{[^{}]*"named_entities"\s*:\s*\[[^\]]*\][^{}]*\}`. Results deduplicated by insertion order (`dict.fromkeys()`).

2. **Triple extraction pass**: Takes passage plus extracted entities, generates subject-predicate-object triples via `prompts/templates/triple_extraction.py`. Triples go through `filter_invalid_triples()`. The conditioning on pre-extracted entities constrains output to known entities, reducing hallucinated relations — but errors compound. Entities missed in pass 1 produce missed triples in pass 2.

Results cache to `openie_results_ner_{model_name}.json`. `load_existing_openie()` handles incremental re-indexing.

Graph construction adds three edge types:

- **Fact edges** (`add_fact_edges()`): subject → object via extracted triples, weighted by co-occurrence frequency
- **Passage edges** (`add_passage_edges()`): chunk nodes → entity nodes they contain
- **Synonymy edges** (`add_synonymy_edges()`): KNN over all entity embeddings, pairs above `synonymy_edge_sim_threshold` get edges weighted by similarity score, capped at `synonymy_edge_topk=100` neighbors

Synonymy edges are the architecturally distinctive component. "Barack Obama" and "Obama" appearing as separate entities get connected here, enabling cross-document reasoning that would otherwise fail. The threshold and top-k values control graph density — too aggressive introduces false connections, too conservative breaks multi-hop traversal.

The graph persists as a Pickle file (`graph.pickle`). Fast, but not portable across Python versions and not externally queryable.

### Retrieval

`retrieve()` runs four steps:

1. **Fact retrieval**: Query embedding vs. fact embedding store, cosine similarity.

2. **Recognition memory filter**: `DSPyFilter` (`rerank.py`) calls the LLM with a [DSPy](../projects/dspy.md)-optimized few-shot prompt (loaded from `filter_default_prompt.py`) to filter irrelevant facts. Responses parsed via section markers `[[ ## fact_after_filter ## ]]`. This adds one LLM call per query at `max_completion_tokens=512`, which can truncate results for queries with many relevant facts.

3. **PPR traversal**: `graph_search_with_fact_entities()` seeds PPR from entity nodes in surviving facts, propagates through the graph. Passage nodes accumulate scores reflecting both direct and transitive relevance.

4. **Hybrid scoring**: PPR scores combined with direct chunk embedding similarity, weighted by `passage_node_weight`. Falls back to pure dense retrieval when no facts survive step 2.

## Key Numbers

From the repository and papers (self-reported by OSU-NLP-Group, not independently verified):

- **3,332 GitHub stars**, 333 forks (as of early 2026)
- Benchmarks on MuSiQue, [HotpotQA](../projects/hotpotqa.md), and 2WikiMultiHopQA show consistent improvements over vanilla dense retrieval on multi-hop tasks
- Comparison against [GraphRAG](../projects/graphrag.md), RAPTOR, and LightRAG claims lower offline indexing cost while matching or exceeding multi-hop performance
- The survey context ([Context Engineering survey](../concepts/context-engineering.md)) cites graph-enhanced RAG showing "10-20% over vanilla RAG" on multi-hop reasoning, consistent with HippoRAG's reported gains

These benchmarks come from the authors' own papers. No independent replication studies are cited in the repository.

## Strengths

**Multi-hop retrieval**: Standard dense retrieval finds documents that look like the query. HippoRAG finds documents connected to the query through entity chains. For a query like "What county is Erik Hort's birthplace in?" requiring chains like `Erik Hort → Montebello → Rockland County`, PPR traversal finds the relevant document even though it never mentions Erik Hort.

**Incremental indexing**: OpenIE results and embedding stores both support incremental updates via the MD5 content-addressing scheme. New documents get processed; existing ones are skipped.

**Referential deletion**: `delete()` propagates document removal through triples and entities, only removing nodes with no remaining document references. Orphaned graph nodes don't accumulate.

**Model-agnostic**: Supports OpenAI, Azure, Bedrock, local [vLLM](../projects/vllm.md), and local Transformers backends for both LLM and embedding layers. Demo scripts cover all four backends.

**Interpretable retrieval path**: The knowledge graph is explicit and inspectable. You can trace why a document was retrieved by following entity edges from query-relevant facts.

## Limitations

**Entity normalization fragility** (concrete failure mode): "US", "U.S.", and "United States of America" may embed dissimilarly enough to fall below synonymy threshold, appearing as disconnected entities in the graph. A multi-hop query requiring connections through "the United States" will fail if your corpus uses "US" and the graph has no synonymy edge linking them. The NER pass has no normalization step — whatever the LLM extracts becomes the entity string.

**Synonymy edge computation doesn't scale** (unspoken infrastructure assumption): `add_synonymy_edges()` runs all-pairs KNN over all entity embeddings. The code comments suggest incremental computation was intended but not implemented — every re-index recomputes over the full entity set. For corpora producing tens of thousands of distinct entities, this becomes a significant indexing bottleneck. The `entity_embedding_store` and Parquet files scale reasonably, but the igraph must live entirely in memory for PPR computation.

**Two LLM calls per chunk at index time**: Every document chunk requires two LLM calls (NER + triple extraction). For large corpora, this is the primary cost driver. The JSON caching mitigates re-indexing cost, but initial indexing of a 100K-document corpus requires 200K+ LLM API calls.

**One LLM call per query**: The DSPy recognition memory filter adds latency and cost at query time. With `max_completion_tokens=512`, fact-heavy queries risk truncation.

**Pickle graph**: Production deployment carries the standard Pickle risks — Python version dependency, no external queryability, deserialization security concerns.

## When NOT to Use It

**Skip HippoRAG when**:

- Queries are primarily single-document lookups. PPR adds cost and latency over simple dense retrieval with no benefit when the answer lives in one document.
- Your corpus updates frequently in real time. The synonymy edge recomputation on re-index makes this expensive. Streaming document ingestion pipelines will hit the all-pairs KNN bottleneck hard.
- Latency is critical. Two LLM calls at index time and one at query time, plus PPR computation on large graphs, will miss sub-200ms SLAs without significant infrastructure investment.
- Your entity vocabulary is highly domain-specific with non-standard abbreviations. The NER pass depends on LLM entity recognition; specialized domains (medical codes, legal citations, financial tickers) will produce poor entity extraction without custom prompts.
- You need a managed cloud service. HippoRAG is a research codebase — no hosted API, no SLA, no production support.

## Unresolved Questions

**Governance and maintenance**: The repository is an academic project from OSU-NLP-Group. No clear policy exists on long-term maintenance, versioning stability, or support. The jump from v1 to v2 involved significant architectural changes (the `legacy` branch holds v1). Future breaking changes are likely.

**Synonymy threshold selection**: The documentation describes `synonymy_edge_sim_threshold` and `synonymy_edge_topk` as configurable but provides no principled guidance on setting them for a new domain. The examples use default values tuned on the benchmark datasets. Performance on different corpora may require re-tuning with no systematic method provided.

**DSPy filter portability**: The recognition memory filter uses a DSPy-optimized prompt trained on specific datasets. How well this transfers to new domains is not documented. The `filter_default_prompt.py` contains few-shot examples presumably optimized for the benchmark distributions — a corpus with different entity types or relationship structures may need re-optimization.

**Scale ceiling**: No benchmarks report performance on corpora above the QA dataset scales (tens of thousands of passages). The behavior of PPR on graphs with millions of entity nodes is not characterized.

**Cost at scale**: The paper claims HippoRAG is "cost and latency efficient" compared to [GraphRAG](../projects/graphrag.md), but no absolute cost figures are provided for indexing at scale. "Fewer resources than GraphRAG" is not the same as "cheap."

## Alternatives

| Use case | Alternative | Rationale |
|----------|-------------|-----------|
| Single-hop factual retrieval | Standard dense retrieval (FAISS + embedding model) | No graph overhead, lower latency, easier ops |
| Multi-hop with large corpora | [GraphRAG](../projects/graphrag.md) | Microsoft's production-grade implementation with community summarization; higher cost but better operational support |
| Hierarchical document summarization | [RAPTOR](../projects/raptor.md) | Tree-based summarization better suited to sense-making over long documents than to entity-level multi-hop |
| Agent memory across sessions | [Graphiti](../projects/graphiti.md), [Zep](../projects/zep.md) | Built for incremental, real-time knowledge graph updates rather than batch indexing |
| Knowledge graph + RAG in production | [LlamaIndex](../projects/llamaindex.md) KnowledgeGraphIndex | Better-maintained abstractions, more backend options, larger community |

**Use HippoRAG when**: You need multi-hop associative retrieval over a relatively static corpus, you can afford 2 LLM calls per chunk at index time, and you want an interpretable graph that shows why each document was retrieved. Academic benchmarks and research prototypes are its strongest use case.

## Related Concepts

- [Knowledge Graph](../concepts/knowledge-graph.md): The core data structure HippoRAG builds and traverses
- [Retrieval-Augmented Generation](../concepts/rag.md): The broader paradigm HippoRAG extends
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md): HippoRAG combines PPR graph scores with dense retrieval scores
- [Agentic RAG](../concepts/agentic-rag.md): The iterative retrieval direction HippoRAG 2 moves toward
- [Memory Consolidation](../concepts/memory-consolidation.md): The biological process HippoRAG's indexing phase models
- [Agent Memory](../concepts/agent-memory.md): Broader context for why persistent knowledge integration matters

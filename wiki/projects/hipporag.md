---
entity_id: hipporag
type: project
bucket: knowledge-bases
abstract: >-
  HippoRAG is a RAG framework that builds a knowledge graph from
  OpenIE-extracted triples, then uses Personalized PageRank to traverse entity
  relationships for multi-hop retrieval — outperforming dense retrieval on
  questions requiring cross-document reasoning.
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - GraphRAG
  - Personalized PageRank
  - Multi-Hop Reasoning
last_compiled: '2026-04-05T20:34:32.078Z'
---
# HippoRAG

## What It Does

HippoRAG is a retrieval-augmented generation framework from OSU-NLP-Group (NeurIPS '24, ICML '25) that trades the standard "embed-and-retrieve" approach for a knowledge graph pipeline with graph traversal. The key bet: multi-hop questions fail with dense retrieval because the relevant documents aren't individually similar to the query — they're connected through shared entities. Graph traversal finds those connections.

The biological framing comes from hippocampal memory indexing theory. Pattern separation encodes documents into a graph of entity relationships; pattern completion retrieves through that graph starting from query-relevant nodes. Whether the neuroscience analogy holds up is less important than whether the mechanism works — the benchmarks on MuSiQue, HotpotQA, and 2WikiMultiHopQA suggest it does for multi-hop tasks.

Version 2 (HippoRAG 2) extends the original to cover "sense-making" tasks involving large narrative contexts, not just entity-chaining multi-hop QA.

**GitHub:** 3,332 stars, MIT license, Python 3.10+

## Core Architecture

The system lives in a single monolithic `HippoRAG` class (`src/hipporag/HippoRAG.py`, ~950 lines). Three subsystems interact:

**Three embedding stores** backed by Parquet files with in-memory numpy arrays:
- `chunk_embedding_store`: raw document passages
- `entity_embedding_store`: extracted entity names
- `fact_embedding_store`: subject-predicate-object triples as strings

Content is addressed by MD5 hashes with namespace prefixes (`chunk-`, `entity-`, `fact-`), which gives deduplication and incremental indexing for free.

**An igraph knowledge graph** persisted as a Pickle file, with three edge types: fact edges (subject → object from triples), passage edges (chunk → entities it contains), and synonymy edges (semantically similar entities connected by KNN over embeddings).

**A DSPy-optimized recognition memory filter** (`rerank.py`) that calls an LLM to filter irrelevant facts before graph traversal, using a few-shot prompt loaded from `filter_default_prompt.py`.

## How Indexing Works

The `index()` method runs a two-pass OpenIE pipeline per document chunk:

1. **NER pass** via `information_extraction/openie_openai.py`: sends the passage through a prompt template, parses the JSON response with regex (`\{[^{}]*"named_entities"\s*:\s*\[[^\]]*\][^{}]*\}`), deduplicates entities via `dict.fromkeys()`.

2. **Triple extraction pass**: takes the passage plus extracted entities and produces subject-predicate-object triples, validated by `filter_invalid_triples()`. Conditioning on NER output reduces hallucinated relations.

Both passes run in parallel via `ThreadPoolExecutor`. Results cache to `openie_results_ner_{model_name}.json` so re-indexing skips already-processed chunks. The `load_existing_openie()` method handles incremental additions.

After extraction, synonymy edges are computed: KNN over all entity embeddings finds pairs above `synonymy_edge_sim_threshold`. This is the most expensive indexing step — it requires all-pairs embedding comparison, capped at `synonymy_edge_topk=100` neighbors per entity. These edges are what allow "Obama" and "Barack Obama" to behave as the same node in retrieval.

## How Retrieval Works

Four stages per query:

1. **Fact retrieval**: query embedding vs. all facts in `fact_embedding_store` by cosine similarity.

2. **Recognition memory filter**: the `DSPyFilter` class calls an LLM with a trained few-shot prompt to remove irrelevant facts. Response is parsed by looking for `[[ ## fact_after_filter ## ]]` markers. If nothing survives this step, the system falls back to pure dense passage retrieval.

3. **Personalized PageRank**: surviving facts identify seed entity nodes. PPR propagates relevance scores through the graph, following fact edges and synonymy edges across multiple hops. Passage nodes accumulate scores.

4. **Hybrid scoring**: PPR scores for passage nodes combine with direct dense retrieval scores, weighted by `passage_node_weight`. This lets the system blend associative graph reasoning with semantic similarity.

The system tracks `self.ppr_time`, `self.rerank_time`, and `self.all_retrieval_time` per query for bottleneck profiling.

## Benchmarks

Self-reported on MuSiQue, HotpotQA, and 2WikiMultiHopQA (multi-hop QA), NaturalQuestions and PopQA (factual memory), NarrativeQA (long-context sense-making). The repository includes pre-computed OpenIE results under `retrieve/` for reproducibility.

The claimed improvement pattern: HippoRAG 2 outperforms standard dense RAG, GraphRAG, RAPTOR, and LightRAG across all benchmark categories while using fewer resources than other graph-based approaches for offline indexing. These results are **self-reported** by the authors and haven't been independently replicated at scale outside the paper. The multi-hop improvement is most credible — the mechanism directly addresses why dense retrieval struggles there.

## Strengths

**Multi-hop retrieval** is where HippoRAG has a genuine architectural advantage. Queries requiring two or three entity hops ("What county contains the birthplace of the person who founded X?") benefit from graph traversal in a way that cosine similarity cannot replicate.

**Incremental indexing** works properly: OpenIE results and embeddings cache, and the `delete()` method propagates removals through entity and triple layers with referential integrity checks, preventing orphaned graph nodes.

**Backend flexibility**: OpenAI, Azure, Bedrock, local vLLM, and local Transformers models all work for both the LLM (OpenIE, filter) and embedding (NVEmbed, GritLM, Contriever, Cohere, OpenAI) components.

**Offline indexing cost** is lower than GraphRAG or RAPTOR, which build community summaries or tree structures requiring many more LLM calls.

## Limitations

**Memory scaling**: the igraph loads entirely into RAM. Corpora producing millions of entities hit a hard memory ceiling. The Parquet embedding stores handle lazy loading, but PPR requires the full graph.

**Synonymy edge computation is not truly incremental**: the code comments suggest incremental synonymy updates were intended, but the current implementation recomputes all-pairs KNN over all entities when new documents arrive.

**Entity normalization fragility**: "US", "U.S.A.", and "United States of America" may not embed similarly enough to generate synonymy edges, depending on the embedding model. Short abbreviations are especially prone to this. Errors in the NER pass propagate to triple extraction — missed entities mean missed triples.

**Recognition memory filter latency**: the DSPy filter adds an LLM call per query. With large fact sets, the filter prompt can exceed context limits, and the `max_completion_tokens=512` cap may truncate responses for queries with many relevant facts.

**Pickle persistence**: the graph saves as a Python Pickle file — fast but not portable across Python versions and not queryable externally.

## Concrete Failure Mode

A query about "The US economy" generates entities including "US", "United States", "America", and "the American economy" as separate graph nodes. If the embedding model doesn't place these close enough in vector space (common with short tokens), no synonymy edges form between them. PPR seeds off whichever entity the query matches, missing documents connected through the other entity forms. The result looks like retrieval failure on a simple factual query — harder to diagnose than a dense retrieval miss because the failure is in graph structure, not similarity scores.

## Infrastructure Assumption

The system assumes LLM API access (or local GPU) at **both index time and query time**. Indexing requires LLM calls for NER and triple extraction; retrieval requires an LLM call for the recognition memory filter. This makes HippoRAG unsuitable for air-gapped environments or latency-sensitive applications unless you run local models and pre-warm the filter. Standard dense RAG requires no LLM at retrieval time.

## When Not to Use HippoRAG

- **Single-hop factual retrieval**: for queries where one document contains the answer, HippoRAG adds indexing cost and latency with no benefit over BM25 or dense retrieval.
- **Real-time indexing requirements**: the two-pass OpenIE pipeline adds significant latency per document. If documents arrive and need to be searchable within seconds, this doesn't work.
- **Very large corpora**: graph RAM requirements and all-pairs synonymy KNN don't scale past a few million entities without architectural changes.
- **Cost-sensitive applications at scale**: every indexed document costs LLM tokens (NER + triple extraction), and every query costs LLM tokens (filter). At millions of documents, this compounds.
- **Teams without GPU or API budget**: local models work but require hardware; OpenAI usage adds up quickly for large corpora.

## Unresolved Questions

The documentation doesn't address:

- **Synonymy threshold tuning guidance**: the `synonymy_edge_sim_threshold` parameter critically controls graph connectivity, but there's no guidance on setting it for new domains or embedding models.
- **Production deployment**: no discussion of serving HippoRAG as an API, managing multiple indexes, or handling concurrent queries safely.
- **Evaluation on non-English corpora**: all benchmarks are English. The two-pass OpenIE approach's quality on other languages is unclear.
- **PPR fallback conditions**: when PPR is too slow for a given graph size, the `passage_node_weight` parameter lets you degrade toward pure DPR, but there's no documented threshold for when this tradeoff is appropriate.
- **Long-term maintenance**: OSU-NLP-Group is an academic lab. Governance, release cadence, and break-in-production response time follow academic norms, not production software norms.

## Alternatives

| Alternative | When to choose it |
|---|---|
| [GraphRAG](../projects/graphrag.md) | Community-level summarization matters more than entity-level traversal; cost less constrained |
| Standard dense RAG (e.g., LlamaIndex, LangChain) | Single-hop retrieval, latency-sensitive, no LLM budget at query time |
| RAPTOR | Hierarchical document summarization needed; multi-hop via abstraction rather than entity chaining |
| LightRAG | Simpler graph construction with less indexing overhead; trade retrieval quality for speed |
| BM25 + reranker | Baseline that outperforms neural retrieval on many factual QA benchmarks; build before adding graph complexity |

For [Multi-Hop Reasoning](../concepts/multi-hop-reasoning.md) tasks specifically, HippoRAG's Personalized PageRank mechanism is one of the few architectures that addresses the problem structurally rather than through prompt engineering. The [Personalized PageRank](../concepts/personalized-pagerank.md) traversal finds transitively related documents in a way that no amount of query expansion with dense retrieval replicates.

## Sources

- [Deep implementation analysis](../raw/deep/repos/osu-nlp-group-hipporag.md)
- [Repository overview](../raw/repos/osu-nlp-group-hipporag.md)
- [Context engineering survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)


## Related

- [GraphRAG](../concepts/graphrag.md) — alternative_to (0.6)
- [Personalized PageRank](../concepts/personalized-pagerank.md) — implements (0.8)
- [Multi-Hop Reasoning](../concepts/multi-hop-reasoning.md) — implements (0.7)

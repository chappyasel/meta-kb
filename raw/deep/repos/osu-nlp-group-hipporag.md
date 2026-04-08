---
url: 'https://github.com/osu-nlp-group/hipporag'
type: repo
author: osu-nlp-group
date: '2026-04-04'
tags:
  - knowledge-bases
  - agent-memory
  - context-engineering
key_insight: >-
  HippoRAG implements a biologically-inspired retrieval system that mirrors the
  hippocampal memory indexing theory, using OpenIE-extracted knowledge graphs
  with entity synonymy edges, Personalized PageRank for multi-hop traversal, and
  a DSPy-optimized recognition memory filter -- achieving significantly better
  multi-hop QA performance than standard dense passage retrieval.
stars: 3300
deep_research:
  method: source-code-analysis
  files_analyzed:
    - src/hipporag/HippoRAG.py
    - src/hipporag/embedding_store.py
    - src/hipporag/information_extraction/openie_openai.py
    - src/hipporag/rerank.py
    - src/hipporag/prompts/templates/ner.py
    - src/hipporag/prompts/templates/triple_extraction.py
    - src/hipporag/utils/embed_utils.py
    - src/hipporag/utils/config_utils.py
    - src/hipporag/evaluation/retrieval_eval.py
  analyzed_at: '2026-04-04'
  original_source: repos/osu-nlp-group-hipporag.md
relevance_scores:
  topic_relevance: 8
  practitioner_value: 8
  novelty: 8
  signal_quality: 9
  composite: 8.2
  reason: >-
    HippoRAG is a directly relevant RAG alternative using knowledge graphs,
    Personalized PageRank multi-hop traversal, and DSPy-optimized retrieval—core
    to knowledge substrate and context engineering topics with detailed
    architecture documentation and production-ready implementation.
---

## Architecture Overview

HippoRAG is a retrieval-augmented generation framework that models its retrieval pipeline after the hippocampal memory indexing theory from neuroscience. The core thesis is that the human hippocampus performs pattern separation (encoding) and pattern completion (retrieval) through a knowledge graph of associations, rather than through direct content matching. HippoRAG translates this biological mechanism into a computational pipeline:

```
Documents
  -> OpenIE (NER + Triple Extraction)
  -> Knowledge Graph Construction (igraph)
  -> Entity/Fact/Chunk Embedding Stores (Parquet + numpy)
  -> Synonymy Edge Expansion (KNN on entity embeddings)
  -> Retrieval:
       Query -> Fact Matching -> Recognition Memory Filter (DSPy)
       -> Personalized PageRank -> Document Ranking
```

The system is implemented as a single monolithic `HippoRAG` class (`src/hipporag/HippoRAG.py`, ~950 lines) that orchestrates all components. This is not a microservice architecture -- it's a tightly coupled system where the graph, embedding stores, LLM, and OpenIE module are all initialized together and share state through instance attributes.

Three embedding stores coexist:

1. **chunk_embedding_store**: Stores raw document passages with their embeddings
2. **entity_embedding_store**: Stores extracted entity names with their embeddings
3. **fact_embedding_store**: Stores extracted triples (as strings) with their embeddings

Each store is backed by a Parquet file (`EmbeddingStore` in `embedding_store.py`) with in-memory numpy arrays for fast similarity computation. Content is addressed by MD5 hash IDs with namespace prefixes (`chunk-`, `entity-`, `fact-`), providing content-addressable deduplication.

## Core Mechanism: The Hippocampal Indexing Pipeline

### Phase 1: Indexing (Pattern Separation)

The `index()` method processes documents through a multi-stage pipeline:

**Step 1 -- OpenIE Extraction**: Each document chunk is processed through Named Entity Recognition (NER) and triple extraction. The `OpenIE` class (`information_extraction/openie_openai.py`) uses a two-pass approach:

1. **NER pass**: Sends the passage through a prompt template (`prompts/templates/ner.py`) that extracts named entities as a JSON list. The response is parsed via regex: `\{[^{}]*"named_entities"\s*:\s*\[[^\]]*\][^{}]*\}`. Entities are deduplicated by preserving insertion order (`dict.fromkeys()`).

2. **Triple extraction pass**: Takes the passage plus extracted entities and generates subject-predicate-object triples via `prompts/templates/triple_extraction.py`. Triples are validated by `filter_invalid_triples()` which removes structurally malformed entries.

The `batch_openie()` method runs these two passes for all chunks using `ThreadPoolExecutor` for parallelism. Results are cached to a JSON file (`openie_results_ner_{model_name}.json`) to avoid redundant LLM calls on re-indexing. The `load_existing_openie()` method implements incremental indexing by loading previously processed chunks and only processing new ones.

**Step 2 -- Embedding**: All three types of content (chunks, entities, facts) are embedded independently. The `EmbeddingStore.insert_strings()` method computes MD5 hashes, identifies missing entries, batch-encodes them, and upserts into the Parquet-backed store. The embedding model supports multiple backends: OpenAI, Cohere, NVEmbed, GritLM, Contriever, and local Transformers/vLLM models.

**Step 3 -- Graph Construction**: An igraph `Graph` is built with three types of edges:

- **Fact edges** (`add_fact_edges()`): Connect subject entities to object entities based on extracted triples. Edge weights are based on co-occurrence frequency (`node_to_node_stats`). Each entity node is also mapped to its source chunk IDs (`ent_node_to_chunk_ids`).

- **Passage edges** (`add_passage_edges()`): Connect chunk nodes to entity nodes they contain. These create direct links between documents and their constituent knowledge.

- **Synonymy edges** (`add_synonymy_edges()`): The most novel component. After building the initial graph, the system performs KNN retrieval on all entity embeddings to find semantically similar entities. Pairs above `synonymy_edge_sim_threshold` get connected with edges weighted by their similarity score. This is the computational analog of the hippocampus's pattern completion -- if "Barack Obama" and "Obama" appear as separate entities, the synonymy edge connects them, enabling cross-document reasoning.

The KNN retrieval is batched via `retrieve_knn()` from `utils/embed_utils.py`, with configurable `synonymy_edge_topk`, `synonymy_edge_query_batch_size`, and `synonymy_edge_key_batch_size` parameters to manage memory for large entity sets.

The graph is persisted as a Pickle file (`graph.pickle`) and reloaded on subsequent runs.

### Phase 2: Retrieval (Pattern Completion)

The `retrieve()` method implements a multi-stage retrieval pipeline:

**Step 1 -- Fact Retrieval**: Query embeddings are computed and compared against the fact embedding store. The `get_fact_scores()` method returns similarity scores for all facts in the store.

**Step 2 -- Recognition Memory Filter (DSPy Reranking)**: This is the "recognition memory" component. The `DSPyFilter` class (`rerank.py`) uses a DSPy-optimized prompt chain to filter facts. It constructs a few-shot prompt from a saved DSPy optimization run, formats the query and candidate facts, and asks the LLM to filter irrelevant facts. The `parse_filter()` method extracts the filtered facts from the response using a section-based parser that looks for `[[ ## fact_after_filter ## ]]` markers.

The default DSPy prompt is loaded from `filter_default_prompt.py` if no custom reranking file is specified. This is a trained prompt -- the few-shot examples are optimized by DSPy to maximize filtering accuracy.

**Step 3 -- Graph-Based Retrieval**: The `graph_search_with_fact_entities()` method takes the filtered facts, extracts their entity nodes, and runs Personalized PageRank (PPR) on the knowledge graph. PPR starts from the query-relevant entity nodes and propagates relevance scores through the graph structure, naturally following entity relationships and synonymy edges to discover documents that are connected through multiple hops.

The passage nodes in the graph receive scores from PPR, and these scores are combined with dense passage retrieval scores (direct embedding similarity) weighted by `passage_node_weight`. This hybrid scoring combines the associative reasoning of graph traversal with the semantic matching of dense retrieval.

**Fallback to DPR**: If no facts survive the recognition memory filter (empty `top_k_facts`), the system falls back to pure dense passage retrieval -- a direct cosine similarity search over chunk embeddings.

## Design Tradeoffs

### Monolithic Class vs. Composable Pipeline

The `HippoRAG` class is approximately 950 lines with all operations as methods. This makes the system easy to understand end-to-end but hard to extend or modify individual components. There's no step/pipeline abstraction -- if you want to replace the OpenIE module, you modify the class directly or subclass it.

### Content-Addressable Storage

The `EmbeddingStore` uses MD5 hashes of content as primary keys. This provides natural deduplication (same content always gets the same ID) and enables incremental indexing. The downside is that content changes require full re-indexing of the affected item -- there's no concept of "updating" a document, only inserting new versions and deleting old ones.

### Pickle Graph Persistence

The igraph is saved as a Python Pickle file. This is fast for read/write but not portable across Python versions, not queryable externally, and vulnerable to Pickle deserialization attacks. For a production system, a proper graph database (Neo4j, etc.) would be more appropriate, but Pickle keeps the system self-contained with no external dependencies.

### OpenIE Quality Gate

The two-pass OpenIE approach (NER first, then triple extraction conditioned on entities) is critical to quality. By extracting entities first, the triple extraction step can be constrained to only produce triples using known entities, reducing hallucinated relations. However, errors compound: missed entities in the NER pass mean missed triples in the extraction pass. The `fix_broken_generated_json()` utility handles a common failure mode where the LLM truncates its JSON output (`finish_reason == 'length'`).

### Synonymy Edge Trade-offs

Synonymy edges are the most expensive indexing operation -- they require an all-pairs KNN computation over entity embeddings. The configurable threshold (`synonymy_edge_sim_threshold`) and top-k limit (`synonymy_edge_topk`) control the density of these edges. Too aggressive: false synonymy connections corrupt the graph. Too conservative: multi-hop reasoning fails because related entities aren't connected. The system caps at 100 nearest neighbors per entity to prevent explosion.

## Failure Modes & Limitations

### Entity Normalization Fragility

Entity extraction depends entirely on the LLM's NER capability. Different LLMs produce different entity boundaries. "United States", "US", "U.S.A.", and "the United States of America" may all appear as separate entities. The synonymy edge mechanism mitigates this, but only if the embedding similarity is above threshold. Short entity names like "US" may not embed similarly to "United States of America" depending on the embedding model.

### Graph Scale Limits

The igraph is kept entirely in memory. For corpora producing millions of entities and facts, memory becomes a bottleneck. The Parquet-backed embedding stores scale better (they can be loaded lazily), but the graph must be fully loaded for PPR computation.

### PPR Computation Cost

Personalized PageRank on a large graph is computationally expensive. The system tracks `self.ppr_time` for profiling. For real-time applications, PPR may be too slow. The `passage_node_weight` parameter controls the balance between PPR scores and direct dense retrieval, allowing degradation to pure DPR when PPR is too expensive.

### Recognition Memory Bottleneck

The DSPy-based recognition memory filter requires an LLM call per query, adding latency and cost. When fact sets are large, the filter prompt can exceed context limits. The `max_completion_tokens = 512` limit on the filter response may truncate results for queries with many relevant facts.

### No Incremental Graph Updates

While OpenIE results and embeddings support incremental updates, the synonymy edge computation runs over all entities every time. The comment in the code ("Here we build synonymy edges only between newly inserted phrase nodes and all phrase nodes") suggests this was intended to be incremental, but the current implementation recomputes all-pairs KNN.

## Integration Patterns

HippoRAG provides three main entry points:

1. **`index(docs)`**: Full indexing pipeline for a list of document strings
2. **`retrieve(queries)`**: Retrieval with optional gold document evaluation
3. **`rag_qa(queries)`**: End-to-end retrieve-then-generate QA

The system supports multiple LLM backends (OpenAI, Azure, Bedrock, local vLLM, local Transformers) and multiple embedding backends. Configuration is centralized in `BaseConfig` (`utils/config_utils.py`) with HfArgumentParser for command-line parsing.

The `delete()` method implements document removal by propagating deletions through the triple and entity layers, only removing entities and triples that are not referenced by any remaining documents. This referential integrity check prevents orphaned graph nodes from accumulating.

Demo scripts (`demo_openai.py`, `demo_local.py`, `demo_azure.py`, `demo_bedrock.py`) show the basic usage pattern: initialize, index, retrieve.

## Benchmarks & Performance

The repository includes evaluation datasets for three multi-hop QA benchmarks: MuSiQue, HotpotQA, and 2WikiMultiHopQA. The evaluation framework computes recall@k for retrieval (at k=1,2,5,10,20,30,50,100,150,200) and exact match + F1 for QA answers.

The `retrieve/` directory contains reproduction scripts with pre-computed OpenIE results for these datasets. The `openie_results_ner_gpt-4o-mini.json` and `openie_results_ner_meta-llama_Llama-3.3-70B-Instruct.json` files demonstrate that both proprietary and open-source models can power the OpenIE extraction.

Time profiling is built into the retrieval path: `self.all_retrieval_time`, `self.rerank_time`, and `self.ppr_time` are accumulated across queries and logged. This enables identifying bottlenecks without external profiling tools.

The system's key advantage over standard RAG is multi-hop reasoning: queries that require connecting information across multiple documents benefit from the graph traversal that HippoRAG's PPR provides. Standard dense retrieval finds documents similar to the query, but HippoRAG can follow entity relationships through the knowledge graph to find documents that are relevant through transitive associations -- the computational analog of how the hippocampus supports associative memory.

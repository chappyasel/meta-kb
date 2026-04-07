---
entity_id: hipporag
type: project
bucket: knowledge-bases
abstract: >-
  HippoRAG is a graph-based RAG framework that uses OpenIE-extracted knowledge
  graphs and Personalized PageRank to enable multi-hop retrieval across
  documents, outperforming dense retrieval on associative reasoning tasks.
sources:
  - repos/osu-nlp-group-hipporag.md
  - deep/repos/osu-nlp-group-hipporag.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - graphrag
last_compiled: '2026-04-07T11:50:22.100Z'
---
# HippoRAG

## What It Does

HippoRAG is a [Retrieval-Augmented Generation](../concepts/rag.md) framework from OSU NLP Group that replaces or augments dense passage retrieval with a [Knowledge Graph](../concepts/knowledge-graph.md) traversal mechanism. The core claim: standard RAG retrieves documents that are semantically similar to a query, but fails when an answer requires connecting information across multiple documents through intermediate entities. HippoRAG addresses this by building an entity-relation graph during indexing and using Personalized PageRank (PPR) during retrieval to follow associative paths through that graph.

The biological inspiration is the hippocampal indexing theory: the hippocampus doesn't store memories directly but indexes associations between cortical representations, enabling pattern completion from partial cues. HippoRAG models this by treating entity nodes as cortical representations and graph edges as hippocampal associations.

The project received NeurIPS 2024 acceptance (original HippoRAG) and ICML 2025 acceptance (HippoRAG 2). GitHub: ~3,300 stars, MIT licensed.

## Architecture

The full pipeline runs in two phases:

**Indexing:** Documents pass through a two-pass OpenIE extraction (NER first, then triple extraction conditioned on those entities), implemented in `src/hipporag/information_extraction/openie_openai.py`. Extracted entities and triples get embedded separately from the raw document chunks, producing three parallel embedding stores (chunk, entity, fact) backed by Parquet files with numpy arrays for similarity computation (`EmbeddingStore` in `embedding_store.py`). IDs are MD5 hashes of content, giving natural deduplication and incremental indexing support.

The knowledge graph is built with igraph. Three edge types:
- **Fact edges**: subject-entity to object-entity, weighted by co-occurrence frequency
- **Passage edges**: chunk nodes to their constituent entity nodes
- **Synonymy edges**: KNN over entity embeddings, connecting semantically similar entities (e.g., "US" to "United States") above a configurable similarity threshold

The synonymy edges are the mechanism's key contribution. They allow PPR to traverse between terminologically inconsistent references to the same real-world entity without requiring exact string matching. The graph persists as a Pickle file.

**Retrieval:** Queries hit the fact embedding store first. A DSPy-optimized recognition memory filter (`rerank.py`, `DSPyFilter` class) runs an LLM call to remove irrelevant facts, using few-shot examples loaded from `filter_default_prompt.py`. Surviving facts contribute their entity nodes as PPR seed nodes. PPR propagates relevance scores through the graph, naturally following multi-hop paths. Final document scores blend PPR results with direct dense retrieval scores weighted by `passage_node_weight`. If the DSPy filter eliminates all facts, the system falls back to pure dense retrieval.

All logic lives in a single ~950-line `HippoRAG` class (`src/hipporag/HippoRAG.py`). This is a monolith, not a composable pipeline.

## Key Numbers

Benchmarks run on MuSiQue, [HotpotQA](../projects/hotpotqa.md), and 2WikiMultiHopQA. The papers report consistent improvements over dense retrieval baselines on multi-hop tasks, with the HippoRAG 2 paper claiming improvements across factual memory (NaturalQuestions, PopQA), sense-making (NarrativeQA), and associativity (MuSiQue, 2Wiki, HotpotQA, LV-Eval). All benchmarks are **self-reported** by the OSU NLP Group authors. No independent third-party replication is documented in the repository.

Pre-computed OpenIE results for benchmark datasets ship with the repo (`openie_results_ner_gpt-4o-mini.json`, `openie_results_ner_meta-llama_Llama-3.3-70B-Instruct.json`), which means reproduction of paper numbers is possible but requires trusting the pre-computed extraction quality.

The repo reports HippoRAG 2 uses "significantly fewer resources for offline indexing compared to [GraphRAG](../concepts/graphrag.md), RAPTOR, and LightRAG" -- self-reported, no independent validation.

## Strengths

**Multi-hop retrieval on named entity-dense corpora.** When your documents are rich in named entities and the questions require connecting two or more entities through intermediate facts, the graph traversal mechanism consistently outperforms cosine similarity search. The Cinderella example in the README is illustrative: "What county is Erik Hort's birthplace a part of?" requires connecting Erik Hort → Montebello → Rockland County across three separate documents.

**Incremental indexing.** The `load_existing_openie()` method and content-addressable embedding stores allow new documents to be added without reprocessing existing ones. The `delete()` method implements referential integrity checks, removing entities and triples only when no remaining document references them.

**[Hybrid Search](../concepts/hybrid-search.md) by default.** PPR scores combine with dense retrieval scores rather than replacing them. On single-hop queries where graph traversal adds noise, the dense retrieval signal stabilizes results.

**Broad LLM and embedding backend support.** OpenAI, Azure, Bedrock, local [vLLM](../projects/vllm.md), and local Transformers models all work for both the LLM (OpenIE + DSPy filter) and embedding (NV-Embed, GritLM, Contriever, Cohere) roles.

## Critical Limitations

**Concrete failure mode: entity normalization brittleness.** The entire graph structure depends on the LLM's NER pass correctly identifying and consistently naming entities. If "Barack Obama" appears as three different surface forms across documents, the synonymy edge mechanism may or may not connect them depending on whether their embeddings fall above the similarity threshold. Short abbreviations ("WHO", "EU") embed poorly relative to their expansions, and false synonymy edges corrupt the graph just as readily as missing ones. The threshold is a global hyperparameter with no per-entity calibration.

**Unspoken infrastructure assumption: in-memory graph.** The igraph object must fit entirely in RAM. For corpora that produce millions of entity nodes, this becomes a hard limit. The embedding stores scale better via lazy Parquet loading, but the graph does not. The Pickle serialization format is also non-portable across Python versions and carries deserialization security risks in multi-tenant environments.

## When NOT to Use It

**Don't use HippoRAG when your queries are primarily single-hop.** If most questions have answers contained in a single document, the added indexing cost (LLM calls for OpenIE on every document), PPR computation latency, and DSPy filter LLM calls per query add cost and latency with no retrieval quality benefit. Standard [Vector Database](../concepts/vector-database.md) retrieval with [BM25](../concepts/bm25.md) hybrid reranking will match or exceed it at lower cost.

**Don't use it for real-time indexing of streaming documents.** The synonymy edge computation runs all-pairs KNN over all entities on each indexing run. A comment in the code acknowledges incremental synonymy was intended but not implemented. Adding one document triggers recomputation across the full entity space.

**Don't use it when [Entity Extraction](../concepts/entity-extraction.md) quality is unreliable.** Technical domains with unusual terminology, code-heavy documents, or non-English text will produce poor NER output, which compounds into poor triples, which produces a noisy graph. The two-pass OpenIE design amplifies extraction errors rather than containing them.

**Don't use it if you need sub-second retrieval at scale.** PPR on a large graph is expensive. The code tracks `self.ppr_time` explicitly, suggesting the authors know this is a bottleneck. The DSPy filter adds an LLM call per query on top.

## Unresolved Questions

**DSPy filter training provenance.** The shipped `filter_default_prompt.py` contains optimized few-shot examples, but the documentation doesn't specify what dataset they were optimized on or whether they generalize to out-of-domain corpora. A filter optimized on Wikipedia-based QA may perform poorly on legal documents or scientific literature.

**Synonymy threshold selection.** No guidance exists on how to set `synonymy_edge_sim_threshold` for a new domain. The repository uses a single global value across all entity pairs, with no empirical analysis of how threshold choice affects downstream QA performance on non-benchmark corpora.

**Production cost modeling.** The indexing pipeline requires LLM calls for NER and triple extraction on every document. For a corpus of 100,000 documents, the paper provides no token consumption estimates or cost projections. At GPT-4o-mini pricing, this could range from tens to hundreds of dollars depending on average document length.

**Graph update consistency.** When you delete a document via `delete()`, orphaned entity nodes get removed. But synonymy edges that were computed based on the now-deleted entities' embeddings are not recomputed. The graph retains stale synonymy structure until a full re-index.

## Alternatives

**Use [GraphRAG](../concepts/graphrag.md) when** you need community-level summarization and hierarchical graph structures, and you can afford the substantially higher indexing cost. GraphRAG builds richer semantic communities but indexes more slowly.

**Use [RAPTOR](../projects/raptor.md) when** your documents are long-form narrative and the primary challenge is summarizing across document sections rather than connecting named entities. RAPTOR's recursive tree summarization handles document-level synthesis better than entity graph traversal.

**Use [Graphiti](../projects/graphiti.md) when** you need a graph memory layer for agents with real-time incremental updates and temporal reasoning. Graphiti was purpose-built for streaming knowledge graphs and handles update semantics that HippoRAG defers.

**Use dense retrieval with [Hybrid Search](../concepts/hybrid-search.md) when** your queries are primarily factoid single-hop lookups. [LlamaIndex](../projects/llamaindex.md) or [LangChain](../projects/langchain.md) with a [Vector Database](../concepts/vector-database.md) backend and BM25 hybrid reranking is simpler, faster, and cheaper for this case.

**Use [Agentic RAG](../concepts/agentic-rag.md) when** multi-hop reasoning paths are unpredictable and domain-specific. An agent that iteratively retrieves and reasons can handle novel reasoning chains that a static graph structure doesn't capture, at the cost of more LLM calls.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md) — base paradigm HippoRAG extends
- [Knowledge Graph](../concepts/knowledge-graph.md) — core data structure
- [GraphRAG](../concepts/graphrag.md) — competing graph-based RAG approach
- [Hybrid Search](../concepts/hybrid-search.md) — HippoRAG's PPR+dense scoring implements this pattern
- [Entity Extraction](../concepts/entity-extraction.md) — the quality gate the whole system depends on
- [Agent Memory](../concepts/agent-memory.md) — HippoRAG 2 positions itself as moving toward persistent memory
- [Episodic Memory](../concepts/episodic-memory.md) — biological analog the architecture models
- [DSPy](../projects/dspy.md) — used for the recognition memory filter optimization

[Source](../raw/deep/repos/osu-nlp-group-hipporag.md) | [Source](../raw/repos/osu-nlp-group-hipporag.md)

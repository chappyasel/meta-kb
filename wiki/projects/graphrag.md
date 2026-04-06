---
entity_id: graphrag
type: project
bucket: knowledge-bases
abstract: >-
  GraphRAG (Microsoft Research) builds a knowledge graph over a corpus during
  indexing, then uses Leiden community detection and map-reduce over
  hierarchical community summaries to answer global sensemaking queries — a task
  traditional RAG cannot perform.
sources:
  - repos/osu-nlp-group-hipporag.md
  - repos/tirth8205-code-review-graph.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - rag
  - knowledge-graph
  - raptor
last_compiled: '2026-04-06T01:59:19.212Z'
---
# GraphRAG

## What It Does

GraphRAG is a retrieval-augmented generation approach from Microsoft Research that replaces flat document retrieval with a knowledge graph built over the entire corpus. The core problem it solves: traditional [RAG](../concepts/rag.md) retrieves locally similar chunks, so it cannot answer questions like "What are the main themes across this dataset?" because no single chunk contains that answer. GraphRAG builds a graph of entities and relationships, detects communities within that graph, generates hierarchical summaries, and uses map-reduce at query time to synthesize answers from those summaries.

The Microsoft open-source implementation lives at `https://aka.ms/graphrag`. It has been independently studied in [a systematic benchmark](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) that provides the most rigorous external validation of its performance claims.

## How It Works

### Indexing Pipeline

**Chunking and extraction:** Documents are split into 600–2400 token chunks. An LLM extracts typed entities (people, organizations, locations, events) and relationships from each chunk. A "gleaning" mechanism re-prompts the LLM to recover entities missed on the first pass. Smaller chunks (600 tokens) extract roughly 2x more entity references than larger chunks (2400 tokens), but at roughly 4x the LLM call cost — a concrete cost-quality tradeoff with no universal right answer.

**Entity resolution:** Duplicate entities (e.g., "2024" vs. "Year 2024") are merged using embedding similarity. RAGFlow's enhanced GraphRAG implementation explicitly names this as a limitation in Microsoft's original — the original treats synonyms as distinct nodes.

**Graph construction:** Entities become nodes; extracted relationships become edges. The resulting graph for a ~1M-token corpus typically produces 8,000–16,000 nodes and 19,000–21,000 edges.

**Community detection:** The Leiden algorithm partitions the graph into a hierarchy of communities — root-level communities capturing broad themes, with sub-communities capturing progressively finer topics. This hierarchy is what enables the "local to global" capability. Zep's implementation uses label propagation instead, which supports incremental updates but produces weaker community structure; Leiden requires full recomputation when documents change.

**Community summarization:** An LLM generates a summary for each community at every level of the hierarchy. Leaf communities are summarized by prioritizing high-degree edges. Higher-level communities use sub-community summaries as input. These summaries are the core retrieval artifacts.

### Query Pipeline (Map-Reduce)

At query time, GraphRAG does not traverse the graph. The pipeline:

1. Collect all community summaries at the chosen hierarchy level
2. Pack them into fixed-size chunks (8K tokens is optimal per the original paper — larger windows do not improve quality)
3. Send each chunk to the LLM with the query; receive a partial answer and a 0–100 helpfulness score
4. Sort partial answers by score; assemble the highest-scoring ones into a final prompt
5. Generate a synthesized answer

Map calls are independent, enabling parallelization. The hierarchy level controls the granularity-cost tradeoff: root-level (C0) summaries use 9–43x fewer tokens than processing source text directly, with only moderate quality degradation. Low-level communities (C3) use 26–33% fewer tokens than source text approaches while capturing more detail.

GraphRAG also supports **local search** — entity-neighborhood retrieval for specific queries, distinct from the global map-reduce approach. Local search consistently outperforms global search on factual question answering (63–65% F1 vs. 45–55% F1).

## Key Numbers

The systematic evaluation by Han et al. (independently conducted, not self-reported by Microsoft) provides the most credible performance data:

| Query Type | RAG F1 | GraphRAG Local F1 | Winner |
|---|---|---|---|
| Single-hop (NQ) | 64.78 | 63.01 | RAG (+1.77) |
| Multi-hop (HotPotQA) | 63.88 | 64.60 | GraphRAG (+0.72) |
| Temporal (MultiHop-RAG) | 25.73 | 49.06 | GraphRAG (+23.33) |
| Comparison | 56.31 | 60.16 | GraphRAG (+3.85) |

On global sensemaking queries vs. naive RAG: GraphRAG achieves 72–83% comprehensiveness win rate (self-reported by Microsoft, using LLM-as-judge — see caveats below).

**Entity extraction miss rate:** ~34% of answer-relevant entities do not appear in the constructed knowledge graph (measured on HotPotQA and NQ). This is independently verified and represents a hard architectural ceiling for graph-only retrieval.

**Hybrid integration gain:** Concatenating RAG + GraphRAG retrieval results yields +6.4% improvement on multi-hop tasks over RAG alone, at 2x retrieval cost. Independently measured.

**Evaluation caveat:** The comprehensiveness win rates use LLM-as-judge, which exhibits documented position bias — reversing presentation order can invert preference judgments. Metrics like ROUGE/BERTScore and LLM judges systematically disagree. F1 and exact-match results from Han et al. are more reliable than win-rate figures from the original paper.

## Strengths

**Temporal and multi-hop reasoning:** The +23.33 F1 point advantage on temporal queries is the most consistent and largest finding across evaluations. Graph structure captures chronological and causal relationships that embedding similarity over flat text misses. Comparison queries show consistent +3–4 point advantages.

**Corpus-wide sensemaking:** Global map-reduce enables questions that require synthesizing the entire corpus — "What are the main themes?", "What patterns exist?" — which flat RAG cannot answer at any retrieval budget.

**Token efficiency at scale:** Root-level community summaries provide 9–43x compression over source text while maintaining useful quality, enabling iterative exploration of large corpora without proportional LLM cost.

**Hierarchical exploration:** The community hierarchy enables drill-down — start with C0 for themes, examine C1/C2 for mid-level topics, reach C3 for specifics. This is a genuinely unique affordance.

## Critical Limitations

**Concrete failure mode — the 34% extraction ceiling:** ~34% of answer-relevant entities are absent from the knowledge graph because the LLM extraction pipeline misses them. For specialized domains (medical terminology, legal citations, technical acronyms), this miss rate is likely worse. If the entity is not in the graph, graph retrieval cannot find it. This is not a tuning problem; it is an architectural constraint. The `triplets+text` variant partially compensates by linking triples back to source text, but the ceiling remains.

**Unspoken infrastructure assumption — static corpora:** The Leiden algorithm requires full graph recomputation when documents change. The indexing pipeline (LLM extraction calls per chunk + community summarization at all levels) is expensive. For a 1M-token corpus with 600-token chunks, that is ~1,667 chunks times multiple LLM calls for extraction, plus community summarization at every level. GraphRAG implicitly assumes the corpus is stable enough to amortize this indexing cost over many queries. Dynamic document collections with frequent updates will repeatedly pay this cost.

## When NOT to Use It

**Single-hop factual queries:** RAG outperforms GraphRAG on single-hop lookups (64.78 vs. 63.01 F1). If your query distribution is primarily "what is X?" or "when did Y happen?", traditional RAG with good embeddings is simpler and more accurate.

**Small corpora or single-query use:** Indexing a corpus into a knowledge graph costs many LLM calls. If the corpus will be queried only a few times, the indexing investment is not recovered. Graph-free text summarization (map-reduce over source chunks without a graph) performs nearly as well as GraphRAG at lower community levels and has zero indexing overhead.

**Rapidly changing document collections:** If your documents update daily or weekly, you pay the full Leiden recomputation cost repeatedly. Zep's label propagation variant trades community quality for incremental updates — consider it if update frequency is high. [Graphiti](../projects/graphiti.md) is explicitly designed for dynamic graph construction over streaming data.

**Tight latency requirements:** Map-reduce over community summaries involves many parallel LLM calls. Even parallelized, this adds latency compared to single-pass RAG retrieval. Local search (entity-neighborhood retrieval) is faster but gives up the global synthesis advantage.

**Narrow factual domains where extraction quality is low:** Specialized vocabularies (biomedical, legal, financial) see worse entity extraction recall than general text. Measure your extraction pipeline's actual entity recall on sample documents before committing to the architecture.

## Unresolved Questions

**Hallucination compounding:** The paper does not apply SelfCheckGPT or equivalent hallucination detection. Community summaries are LLM-generated abstractions of LLM-extracted entities — two LLM calls in sequence, each capable of introducing errors. The compounding risk is unquantified.

**Optimal chunk size:** The paper demonstrates the 600-token vs. 2400-token extraction quality tradeoff but does not recommend an optimum. The right chunk size depends on extraction model quality, domain vocabulary density, and cost constraints — none of which are addressed.

**Cross-document graph linking:** RAGFlow's production implementation notes that knowledge graph generation operates per-document only and cannot yet link graphs across multiple documents within a knowledge base due to memory and computational constraints. The Microsoft implementation does link across documents during community detection, but the gap between the paper's claims and production implementations is not clearly documented.

**Global search is weak for QA, but when is it appropriate?** Community-Global consistently underperforms Community-Local by 10–20 F1 points on QA tasks. The paper positions Global search for "sensemaking" rather than factual retrieval, but the boundary between these task types is not operationally defined.

**Cost at scale:** No published analysis of total indexing cost (LLM calls for extraction + summarization) as a function of corpus size, or of query-time cost relative to the number of communities processed.

## Alternatives and Selection Guidance

**Use standard [RAG](../concepts/rag.md)** when queries are primarily single-hop factual lookups, the corpus is small, or latency is critical. Simpler, faster, and more accurate on specific-fact retrieval.

**Use [RAPTOR](../projects/raptor.md)** when you want hierarchical summarization without the graph structure overhead. RAPTOR clusters chunks with GMMs and generates recursive summaries, achieving multi-granularity retrieval without entity extraction. RAGFlow integrates both RAPTOR and GraphRAG as complementary layers.

**Use [HippoRAG](../projects/hipporag.md)** for knowledge graph-style retrieval with different graph construction assumptions. HippoRAG models retrieval after hippocampal memory indexing.

**Use [Graphiti](../projects/graphiti.md)** when your data is dynamic — streaming events, conversation histories, frequently updated documents. Graphiti is designed for incremental graph construction and supports temporal queries natively.

**Use hybrid retrieval (RAG + GraphRAG)** when your query distribution is mixed and you can afford 2x retrieval cost. Concatenating both retrieval results yields +6.4% on multi-hop tasks with no architectural changes — the simplest upgrade path.

**Use graph-free text summarization** (map-reduce over source chunks without a graph) as a baseline before investing in graph indexing. The original GraphRAG paper shows this baseline performs competitively with lower community levels of GraphRAG, at zero indexing cost.

For the broader context of where GraphRAG fits in knowledge retrieval architectures, see [Knowledge Graph](../concepts/knowledge-graph.md), [Hybrid Retrieval](../concepts/hybrid-retrieval.md), and [Agentic RAG](../concepts/agentic-rag.md).

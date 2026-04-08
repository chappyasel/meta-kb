---
url: 'https://arxiv.org/abs/2502.11371'
type: paper
author: >-
  Haoyu Han, Li Ma, Yu Wang, Harry Shomer, Yongjia Lei, Zhisheng Qi, Kai Guo,
  Zhigang Hua, Bo Long, Hui Liu, Charu C. Aggarwal, Jiliang Tang
date: '2025-02-17'
tags:
  - knowledge-bases
  - rag
  - graph-retrieval
  - context-engineering
  - evaluation-benchmarking
  - reasoning
  - retrieval-architectures
key_insight: >-
  RAG and GraphRAG are complementary, not competing: RAG wins on single-hop
  factual queries (64.78 vs 63.01 F1) while GraphRAG wins on multi-hop reasoning
  (64.60 vs 63.88 F1) and temporal queries (49.06 vs 25.73). The most actionable
  finding is that simple integration (concatenating both retrieval results)
  yields +6.4% improvement on multi-hop tasks, and the graph extraction pipeline
  misses ~34% of answer-relevant entities, creating a hard ceiling for KG-only
  approaches.
deep_research:
  method: paper-full-text
  text_length: 10500
  analyzed_at: '2026-04-04'
  original_source: papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
relevance_scores:
  topic_relevance: 8
  practitioner_value: 9
  novelty: 7
  signal_quality: 9
  composite: 8.3
  reason: >-
    Systematic RAG vs GraphRAG benchmark with actionable routing/integration
    findings directly relevant to knowledge substrate and context engineering
    decisions for agent builders.
---

## Architecture Overview

This paper presents the first systematic benchmark comparison of RAG vs GraphRAG under a unified evaluation protocol. Rather than proposing a new system, it answers the practical question: when should you use RAG vs GraphRAG, and can you combine them?

**RAG Implementation:**
- Semantic similarity retrieval using OpenAI text-embedding-ada-002
- 256-token chunks
- Top-10 retrieval
- Llama 3.1-8B and 70B for generation

**GraphRAG Approaches Tested:**
1. **KG-based GraphRAG:** LLM-driven triplet extraction (entity-relation-entity) with two variants:
   - Triplets-only: retrieval over extracted KG triples
   - Triplets+text: retrieval over triples augmented with source text associations
2. **Community-based GraphRAG (Microsoft's approach):** Hierarchical community detection with:
   - Local search: entity-neighborhood retrieval for specific queries
   - Global search: community summary map-reduce for corpus-wide queries

The unified protocol standardizes data preprocessing, retrieval configurations, and generation settings so that differences in results are attributable to retrieval paradigm differences, not implementation details.

## Core Mechanism

### The Complementarity Finding

The central result is that RAG and GraphRAG have non-overlapping strengths. Analysis of confusion matrices on MultiHop-RAG reveals:
- 13.6% of questions are answered correctly only by GraphRAG
- 11.6% of questions are answered correctly only by RAG

These are not random variations -- they reflect systematic strengths tied to query structure:

**RAG excels when:** The answer is localized in a specific text passage. Embedding similarity finds the right chunk, the answer is extracted, done. Single-hop factual queries, named entity lookups, date/number retrieval.

**GraphRAG (Local) excels when:** The answer requires connecting information across entities. The graph structure captures entity relationships that embedding similarity over text chunks misses. Multi-hop reasoning, comparison queries, temporal reasoning.

### The Entity Extraction Bottleneck

A critical finding: only 65.8% of answer-relevant entities exist in the constructed knowledge graphs (HotPotQA) and 65.5% (NQ). This ~34% entity miss rate creates a hard ceiling for KG-based approaches -- if the entity is not in the graph, graph retrieval cannot find it.

This explains why KG-based GraphRAG (triplets-only) consistently underperforms: the extraction pipeline is lossy. The triplets+text variant partially compensates by maintaining links to source text, but the fundamental extraction quality bottleneck remains.

### Hybrid Strategies

**Selection (routing):** Classify queries as "fact-based" or "reasoning-based" and route to RAG or GraphRAG respectively. Results on MultiHop-RAG: +1.1% over RAG baseline (65.77% -> 66.87%). Low overhead since only one system runs per query.

**Integration (concatenation):** Retrieve from both RAG and GraphRAG, concatenate results, generate from combined context. Results on MultiHop-RAG: +6.4% over RAG baseline (65.77% -> 72.17%). Higher quality but doubled retrieval cost.

## Design Tradeoffs

**Granular chunks vs. graph structure:** RAG's 256-token chunks preserve fine-grained detail. GraphRAG's community summaries capture cross-entity relationships but lose granular detail. This creates the comprehensiveness-vs-diversity tradeoff: RAG is better for complete answers about specific topics; GraphRAG is better for broad answers that synthesize across topics.

**LLM extraction quality vs. retrieval ceiling:** KG construction via LLM extraction misses ~34% of answer entities. Improving extraction quality (better prompts, multiple passes, smaller chunks) can raise this ceiling but increases indexing cost. This is the same tradeoff identified in the GraphRAG paper (600-token chunks extract 2x more entities but at 4x more LLM calls).

**Community-Local vs. Community-Global:** Local search retrieves entity neighborhoods for specific queries; Global search runs map-reduce over all community summaries for corpus-wide queries. Global search consistently underperforms Local on question answering (45-55% F1 vs 63-65%), confirming that Global is specifically for sensemaking/summarization, not factual QA.

**Evaluation methodology bias:** The paper discovers that LLM-as-judge evaluations exhibit significant position bias -- reversing the presentation order of RAG vs GraphRAG outputs can completely invert preference judgments. ROUGE/BERTScore metrics better capture RAG's strengths; LLM judges systematically favor GraphRAG's diversity. This means evaluation methodology choice can predetermine which system "wins."

## Experimental Results

### Question Answering: Single-Hop (NQ Dataset)

| Method | Llama 8B F1 | Llama 70B F1 |
|--------|------------|-------------|
| RAG | 64.78 | 68.18 |
| Community-GraphRAG (Local) | 63.01 | 65.44 |
| Community-GraphRAG (Global) | 54.48 | 55.05 |

RAG wins on single-hop by 1.77-2.74 F1 points.

### Question Answering: Multi-Hop (HotPotQA)

| Method | Llama 8B F1 | Llama 70B F1 |
|--------|------------|-------------|
| RAG | 60.04 | 63.88 |
| Community-GraphRAG (Local) | 61.66 | 64.60 |
| Community-GraphRAG (Global) | 45.16 | 46.99 |

GraphRAG (Local) wins on multi-hop by 0.72-1.62 F1 points.

### Query-Type Breakdown (MultiHop-RAG, Llama 70B)

| Query Type | RAG | GraphRAG (Local) | Winner |
|-----------|-----|-------------------|--------|
| Inference | 94.85 | 92.03 | RAG (+2.82) |
| Comparison | 56.31 | 60.16 | GraphRAG (+3.85) |
| Temporal | 25.73 | 49.06 | GraphRAG (+23.33) |
| Null | 91.36 | 88.70 | RAG (+2.66) |
| Overall | 65.77 | 71.17 | GraphRAG (+5.40) |

The temporal reasoning gap (+23.33 points for GraphRAG) is the largest single finding. Graph structure captures temporal relationships that flat text retrieval misses entirely.

### Summarization (Llama 8B)

| Method | SQuALITY ROUGE-2 | SQuALITY BERTScore | ODSum ROUGE-2 | ODSum BERTScore |
|--------|-----------------|-------------------|---------------|-----------------|
| RAG | 10.08 | 77.62 | 9.81 | 84.57 |
| GraphRAG (Local) | 10.10 | 84.66 | 8.49 | 83.90 |
| KG-GraphRAG (Triplets+Text) | 10.52 | 84.92 | -- | -- |

GraphRAG achieves higher BERTScore (semantic similarity) while RAG achieves competitive ROUGE (surface overlap). KG-based GraphRAG with text associations performs best on single-document summarization.

### Hybrid Strategy Results

| Dataset | RAG Baseline | Selection (+) | Integration (+) |
|---------|-------------|---------------|-----------------|
| MultiHop-RAG | 65.77 | 66.87 (+1.1) | 72.17 (+6.4) |
| NQ | -- | +0.8 | +2.1 |
| HotPotQA | -- | +1.9 | +4.2 |

Integration (concatenation) consistently outperforms selection (routing), with the largest gains on multi-hop tasks.

## Failure Modes & Limitations

**Entity extraction ceiling (~34% miss rate):** The most impactful finding for practitioners. If your answer requires an entity that was not extracted during graph construction, GraphRAG cannot find it. This is a hard architectural limitation, not a parameter tuning issue.

**Global search is weak for QA:** Community-GraphRAG (Global) significantly underperforms both RAG and Local search on all QA tasks (45-55% vs 60-68% F1). It is designed for corpus-wide summarization, not factual retrieval. Using it for QA is an architecture mismatch.

**Evaluation metrics disagree:** ROUGE/BERTScore and LLM-as-judge give contradictory results due to position bias and systematic preferences. Any evaluation of RAG vs GraphRAG must use multiple metrics and control for evaluation methodology bias.

**Limited task coverage:** Only QA and summarization are tested. Other important tasks (conversational agents, code generation with documentation, multi-turn interactions) are not evaluated.

**Single chunking strategy:** 256-token chunks are used throughout. The paper does not ablate chunk size, which is known to significantly affect RAG performance.

**Cost analysis is incomplete:** The paper does not report indexing costs for GraphRAG construction, which can be substantial (many LLM calls for entity extraction and community summarization).

## Practical Implications

**For builders of knowledge base retrieval systems:**

1. **Do not assume GraphRAG is universally better than RAG.** On single-hop factual queries, RAG is better. On multi-hop reasoning, GraphRAG is better. Match your retrieval architecture to your query distribution.

2. **If you can afford it, use both.** Integration (concatenating RAG + GraphRAG retrieval results) yields +4-6% improvement on multi-hop tasks with predictable cost (2x retrieval). This is the simplest and most consistent strategy.

3. **If you must choose one, profile your queries.** If >50% of queries are multi-hop, comparison, or temporal reasoning, choose GraphRAG (Local). If >50% are single-hop factual lookups, choose RAG.

4. **The ~34% entity extraction miss rate is your biggest risk.** If your domain has specialized entities (technical terms, acronyms, domain jargon), test your extraction pipeline's recall before committing to GraphRAG. You may need custom entity extraction or at minimum the triplets+text variant that falls back to source text.

5. **Use Community-Local, not Community-Global, for QA.** Global search is specifically for corpus-wide summarization. For question answering, Local search is consistently 10-20 F1 points better.

6. **Temporal reasoning is GraphRAG's killer advantage (+23.33 points).** If your knowledge base needs to answer temporal queries (what changed, when did X happen, chronological ordering), GraphRAG provides a massive advantage that RAG cannot match.

7. **Be skeptical of LLM-as-judge evaluations.** The position bias finding means that single-run LLM judge evaluations of RAG vs GraphRAG are unreliable. Use multiple metrics, control for position, and prefer ground-truth-based evaluation (F1, exact match) where possible.

**Gap between paper and production:** The paper provides clear guidance on when to use which approach but does not address: dynamic knowledge bases (how to update graphs incrementally), real-time latency requirements (graph construction adds latency), domain-specific entity extraction (the ~34% miss rate is likely worse for specialized domains), or cost-benefit analysis of indexing investment vs query-time improvement.

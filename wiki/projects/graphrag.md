---
entity_id: graphrag
type: project
bucket: knowledge-bases
abstract: >-
  GraphRAG (Microsoft, 2024) indexes corpora into hierarchical knowledge graphs
  via Leiden community detection, enabling global sensemaking queries that flat
  vector search cannot answer; it wins on multi-hop and temporal reasoning but
  loses on single-hop factual retrieval and costs significantly more to index
  than naive RAG.
sources:
  - repos/osu-nlp-group-hipporag.md
  - repos/tirth8205-code-review-graph.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - raptor
  - mcp
  - react
  - reflexion
  - letta
  - hipporag
  - lightrag
  - personalized-pagerank
  - mcp
last_compiled: '2026-04-07T00:44:10.735Z'
---
# GraphRAG

## What It Does

GraphRAG, introduced in a 2024 Microsoft Research paper and released as an open-source library at `aka.ms/graphrag`, addresses a hard limitation of standard [Retrieval-Augmented Generation](../concepts/rag.md): flat vector search cannot answer global questions about a corpus. Asking "What are the main themes in this dataset?" requires synthesizing many documents simultaneously, not retrieving the most similar chunks to a query. GraphRAG builds a hierarchical index at ingestion time so that global synthesis becomes practical at query time.

The architecture extends the [Knowledge Graph](../concepts/knowledge-graph.md) idea from discrete lookup to probabilistic, community-structured retrieval, applying Leiden community detection to build a hierarchy of entity clusters, then summarizing each cluster with an LLM. Queries run as map-reduce over those summaries rather than as similarity searches over raw chunks.

## Core Mechanism: How It Works

### Indexing Pipeline

GraphRAG processes a corpus in five sequential steps, all offline before any query is served:

**1. Chunking.** Documents split into 600–2,400 token chunks with configurable overlap. Chunk size matters: 600-token chunks extract approximately 2× more entity references than 2,400-token chunks, but require 4× more LLM calls. This chunk-size/extraction-quality tradeoff is a key parameter decision.

**2. Entity and Relationship Extraction.** An LLM extracts typed entities (people, organizations, locations, events) and labeled relationships from each chunk. A "gleaning" mechanism re-prompts the extraction LLM on each chunk to catch missed entities—single-pass extraction has notably low recall. This is the most expensive pipeline step.

**3. Element Summarization.** Individual summaries generated for each extracted entity and relationship.

**4. Leiden Community Detection.** The entity-relationship graph is partitioned hierarchically using the Leiden algorithm. The result is a four-level tree:
- C0 (root): fewest communities, broadest scope
- C1: high-level sub-communities
- C2: intermediate
- C3 (leaf): most specific, closest to source text

Podcast transcript experiments produce graphs with 8,564 nodes and 20,691 edges; news article corpora yield 15,754 nodes and 19,520 edges.

**5. Community Summarization.** Each community at every level receives an LLM-generated summary. Leaf communities prioritize high-degree edges; higher-level communities use sub-community summaries as inputs. This compounds across levels: root summaries are abstractions of abstractions.

After indexing, two retrieval modes are available. **Global search** runs the map-reduce pattern described above across community summaries. **Local search** retrieves entity neighborhoods for specific factual questions—closer in behavior to standard RAG.

### Query-Time Map-Reduce

Global search does not traverse the graph at query time. Instead:

1. Community summaries at the chosen level are shuffled and packed into fixed-size chunks (~8K tokens each, per the paper's ablation)
2. Each chunk is sent to an LLM with the user query; the LLM returns a partial answer and a 0–100 helpfulness score
3. Partial answers are ranked by score, assembled until the context limit is reached
4. A final LLM call synthesizes the assembled partial answers

All map calls are independent and parallelizable. You can control cost by limiting how many community summaries get processed.

### Token Efficiency by Level

| Level | Token Savings vs. Source Text Summarization |
|-------|---------------------------------------------|
| C0 (root) | 9–43× fewer tokens |
| C3 (leaf) | 26–33% fewer tokens |

Root-level queries are dramatically cheaper but lose specificity. This enables iterative exploration: start at C0 for broad themes, drill into C2/C3 for detail.

## Key Numbers

**Benchmark results** (self-reported, no independent validation at time of writing):

Against naive RAG (semantic similarity baseline) on global sensemaking questions:
- Comprehensiveness win rate: 72–83% (podcast dataset), 72–80% (news dataset)
- Diversity win rate: 62–82%
- Directness: GraphRAG loses; naive RAG is more specific

Against graph-free text summarization (map-reduce without a graph):
- Comprehensiveness win rate: 53–64%
- The graph provides incremental, not transformative, quality improvement at lower community levels

Against full-conversation RAG baselines on conversational memory tasks (via Zep/Graphiti, which uses a related approach): +18.5% accuracy, 90% latency reduction on [LongMemEval](../projects/longmemeval.md).

The LLM-as-judge evaluation methodology warrants skepticism: the evaluation paper on RAG vs. GraphRAG found that reversing the presentation order of outputs can invert preference judgments entirely. F1 scores should be preferred where ground truth exists.

**Repository:** Microsoft's open-source release at `aka.ms/graphrag`. Stars and fork counts change rapidly; check the repo for current figures.

## Strengths

**Global sensemaking.** GraphRAG genuinely solves a problem that vector search cannot. For corpora where users ask "What patterns exist?" or "What are the main arguments?" rather than "What does paragraph X say?", the community hierarchy provides structure that flat retrieval lacks.

**Temporal and multi-hop reasoning.** A separate evaluation study found GraphRAG (Local search) beats RAG by +23.3 F1 points on temporal reasoning queries and +1–4 points on multi-hop questions. The graph captures temporal relationships and entity connections that embedding similarity over text chunks misses.

**Token-efficient exploration.** Root-level community summaries (9–43× token reduction) make iterative corpus exploration practical at lower cost than processing source text repeatedly.

**Complementarity with RAG.** Combining both—retrieving from RAG and GraphRAG, concatenating results—yields +4–6% improvement on multi-hop tasks over either alone. GraphRAG and standard RAG are not in competition; they handle different query structures.

## Critical Limitations

**The ~34% entity extraction miss rate creates a hard ceiling.** Systematic evaluation across HotPotQA and NQ found that only 65–66% of answer-relevant entities make it into the constructed knowledge graph. If an entity is not extracted, graph retrieval cannot find it—no parameter tuning fixes this. For specialized domains with technical jargon, acronyms, or domain-specific naming conventions, the miss rate is likely higher.

**Unspoken infrastructure assumption:** GraphRAG implicitly assumes a static or slowly changing corpus. The Leiden algorithm produces excellent community structure but requires full recomputation when the graph changes. The library does not ship incremental update support. For knowledge bases with streaming updates—new documents daily, conversational history accreting in real time—GraphRAG's indexing architecture is a poor fit. [Zep/Graphiti](../projects/zep.md) solves this by substituting label propagation, which supports incremental updates at the cost of community quality over time.

## When NOT to Use GraphRAG

**Single-hop factual retrieval.** For "What is the capital of France?" or "When did event X occur?", standard RAG beats GraphRAG Local by 1.8–2.7 F1 points and is cheaper to run. The community hierarchy adds no value when the answer lives in one text passage.

**Low-query-volume corpora.** Graph indexing requires many LLM calls for extraction (multiple passes per chunk), element summarization, and community summarization. For a corpus queried only a handful of times, graph-free text summarization—map-reduce directly over source chunks—performs nearly as well and costs far less to set up. The paper's own text summarization baseline achieves 53–64% win rates against GraphRAG, competitive enough to question the indexing investment for low-volume use.

**Real-time or low-latency requirements.** Indexing a 1M-token corpus with 600-token chunks, gleanings, and GPT-4-class models can cost hundreds of dollars and take hours. Query-time global search parallelizes map calls but still requires many LLM calls. For applications needing sub-second retrieval, GraphRAG's architecture is mismatched.

**Highly dynamic or conversational data.** If the "corpus" is an ongoing conversation or a knowledge base updated continuously, Zep's temporally-aware graph (bi-temporal edge invalidation, incremental community updates) is a better architecture. GraphRAG has no mechanism for handling contradictory information or tracking how facts change over time.

**Domains where extraction quality is critical.** Medical records, legal documents, and technical specifications often use terminology that general-purpose LLM extraction handles poorly. The 34% miss rate on general corpora will be worse here.

## Unresolved Questions

**Hallucination compounding.** The pipeline generates entities via LLM extraction, then summarizes them via a second LLM call, then summarizes summaries at higher community levels. Each step can introduce hallucinations that compound upward. The Microsoft paper explicitly acknowledges it did not apply SelfCheckGPT or any hallucination detection to its evaluation. Production deployments have no clear answer for measuring or bounding this risk.

**Cost at scale.** Neither the original paper nor the open-source release provides detailed cost models for corpora beyond ~1M tokens. At 10M or 100M tokens, the extraction cost (multiple LLM calls per 600-token chunk) may be prohibitive with GPT-4-class models. The paper does not address using smaller extraction models and their effect on the 34% entity miss rate.

**Optimal community level selection.** The paper tests C0 through C3 but provides no guidance on selecting the right level for a given query or corpus. Automated level selection at query time is unaddressed.

**Cross-document graph merging.** RAGFlow's production implementation of GraphRAG notes this explicitly: the graph operates per-document and cannot yet link graphs across multiple documents in a knowledge base due to memory and computational constraints. The Microsoft paper does not address this limitation.

**LLM-as-judge validity.** A systematic evaluation study found that position bias in LLM judges can completely invert preference judgments between RAG and GraphRAG outputs. The paper's 72–83% comprehensiveness win rates use this evaluation method without controls for position bias.

## How It Fits with Related Projects

[RAPTOR](../projects/raptor.md) takes a similar hierarchical summarization approach but builds a tree via Gaussian Mixture Model clustering of embeddings rather than community detection on an entity graph. RAPTOR is integrated into [RAGFlow](../raw/deep/repos/infiniflow-ragflow.md) alongside GraphRAG as complementary retrieval strategies. [HippoRAG](../projects/hipporag.md) uses [Personalized PageRank](../concepts/personalized-pagerank.md) over a knowledge graph rather than map-reduce over community summaries, optimizing for associative retrieval rather than global synthesis. LightRAG simplifies the GraphRAG pipeline to reduce indexing cost, trading community structure quality for practicality.

For agent memory specifically, [Zep/Graphiti](../projects/zep.md) implements a temporally-aware graph with bi-temporal indexing that handles evolving facts—something GraphRAG's static-corpus design does not address. Graphiti uses label propagation for incremental community updates and invalidates edges rather than deleting them when facts change, making it better suited to [Agent Memory](../concepts/agent-memory.md) applications than GraphRAG's batch-indexing approach.

## Alternatives: Selection Guidance

- **Use standard RAG** when queries are primarily single-hop factual lookups, the corpus is small, or indexing cost is a constraint.
- **Use GraphRAG (Global)** when users need corpus-wide synthesis—themes, patterns, summaries across many documents—and the corpus is stable.
- **Use GraphRAG (Local)** when queries require multi-hop reasoning or temporal reasoning across a static knowledge base.
- **Use RAG + GraphRAG together** (concatenating retrieval results) for maximum quality on multi-hop tasks when retrieval cost is not a constraint.
- **Use [Zep/Graphiti](../projects/zep.md)** when the knowledge base evolves over time and temporal consistency matters.
- **Use [RAPTOR](../projects/raptor.md)** when hierarchical summarization is the goal but you want a simpler infrastructure footprint than full entity graph construction.
- **Use graph-free text summarization** (map-reduce over source chunks) as the baseline before committing to graph indexing—the GraphRAG paper shows it is competitive at lower community levels.

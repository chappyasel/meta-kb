---
entity_id: hotpotqa
type: project
bucket: knowledge-bases
abstract: >-
  HotpotQA is a 113K-question multi-hop QA dataset requiring reasoning across
  two Wikipedia documents, used widely to benchmark RAG, GraphRAG, and memory
  systems on tasks needing explicit reasoning chains.
sources:
  - repos/bytedtsinghua-sia-memagent.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - episodic-memory
last_compiled: '2026-04-07T11:46:56.779Z'
---
# HotpotQA

## What It Is

HotpotQA is a question answering dataset of 113,000 questions drawn from English Wikipedia, published in 2018 by Yang et al. at CMU and Stanford. Every question requires gathering information from exactly two documents and synthesizing them to reach an answer. A single document is never sufficient.

The dataset has two question types: **bridge questions** (entity A connects to entity B via a shared attribute, e.g., "What nationality is the director of the film Hanna?") and **comparison questions** (two entities are compared on a shared attribute, e.g., "Were Scott Derrickson and Ed Wood of the same nationality?"). Both types require a model to traverse a reasoning chain rather than lookup a fact.

Each example includes "supporting facts" — sentence-level annotations identifying which sentences from the two documents actually contain the answer. This makes HotpotQA useful for evaluating not just answer accuracy but also reasoning transparency: does the model retrieve the right evidence?

HotpotQA appears regularly in training data and evaluation suites for [Retrieval-Augmented Generation](../concepts/rag.md), [GraphRAG](../concepts/graphrag.md), multi-hop [Agentic RAG](../concepts/agentic-rag.md), and memory architectures. MemAgent's public model weights are released specifically on a HotpotQA dataset variant ([Source](../raw/repos/bytedtsinghua-sia-memagent.md)), and Mem-alpha trains on HotpotQA as one of seven datasets for its RL-based memory construction system ([Source](../raw/deep/repos/wangyu-ustc-mem-alpha.md)).

## Why It Matters for Knowledge Base and Agent Systems

Single-hop QA benchmarks (TriviaQA, NaturalQuestions) can be solved by a good retriever returning the right chunk. HotpotQA cannot. The model must retrieve two documents, identify the bridge entity between them, and compose an answer. This makes it the standard stress test for:

- **Retrieval systems**: Can your retriever return both relevant documents, not just the most similar one?
- **Knowledge graphs**: Does your graph capture the cross-entity relationships needed for multi-hop traversal?
- **Memory architectures**: Does your memory system store intermediate reasoning steps, not just final answers?
- **Agent planning**: Can your agent decompose the question into sub-queries and combine partial results?

The benchmark from [Han et al.](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) demonstrates this concretely: on HotpotQA, Community-GraphRAG (Local) outperforms RAG (64.60 vs 63.88 F1), while RAG leads on single-hop NaturalQuestions (64.78 vs 63.01). The 0.72-point gap on HotpotQA understates GraphRAG's structural advantage because entity extraction misses ~34% of answer-relevant entities, capping what graph traversal can achieve.

## Dataset Structure

Three splits:

| Split | Size | Distractor Documents | Notes |
|---|---|---|---|
| Training | 90,447 | Yes (8 per question) | Full-pipeline training |
| Dev (distractor) | 7,405 | Yes (8 per question) | Standard eval setting |
| Dev (full wiki) | 7,405 | No (full Wikipedia) | Open-domain, harder retrieval |
| Test | 7,405 | Hidden | Evaluation via leaderboard |

The **distractor setting** provides 10 paragraphs total (2 gold + 8 distractor) and tests whether models can identify which documents are relevant among noise. The **full wiki setting** requires retrieval from all of English Wikipedia — the harder, more realistic scenario for production systems.

Each example contains:
- `question`: The multi-hop question
- `answer`: A short answer span
- `supporting_facts`: List of (title, sentence_index) pairs identifying evidence sentences
- `context`: The provided paragraphs (distractor setting only)
- `type`: "bridge" or "comparison"
- `level`: "easy", "medium", or "hard"

## Evaluation Metrics

Two metrics are used jointly:

**Answer F1 / Exact Match (EM)**: Token-level F1 between predicted and gold answer strings, after lowercasing and removing articles/punctuation. Exact Match requires character-for-character match after normalization.

**Supporting Fact F1 / EM**: Token-level F1 over the set of predicted supporting sentences vs. gold supporting facts. This penalizes models that get the right answer for the wrong reasons.

**Joint F1 / EM**: The product of answer and supporting fact F1/EM. This is the primary leaderboard metric because it requires both correct answers and correct reasoning chains.

## Performance Benchmarks

Representative scores from the leaderboard and published systems (distractor dev set, self-reported by authors unless noted):

| System | Answer F1 | Supporting Fact F1 | Joint F1 |
|---|---|---|---|
| Human performance | 91.4 | 90.5 | 84.4 |
| GPT-4 + RAG (typical) | ~68–72 | ~65–70 | ~55–62 |
| GraphRAG Local (Han et al.) | 64.60 | — | — |
| Standard RAG (Han et al.) | 63.88 | — | — |
| Reflexion CoT (Shinn et al.) | ~75 (ground-truth context) | — | — |

Human performance figures are from the original paper and are independent of model claims. The RAG/GraphRAG numbers are from an independently evaluated comparative study ([Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)). The Reflexion number used gold-provided context, making it non-comparable to retrieval-based results ([Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)).

Scores above ~72 Joint F1 on the distractor dev set represent strong performance as of 2024. Models regularly exceed 70 Answer F1 but struggle on Joint F1 because supporting fact prediction requires precise sentence attribution.

## Core Mechanism: What Makes Multi-Hop Hard

The difficulty is not vocabulary or document length. The two documents in a bridge question share no surface overlap on the bridging entity's name — the answer to "What is the hometown of the director of Parasite?" lives in a Bong Joon-ho article, not the Parasite article, and the model must follow the chain: Parasite → Bong Joon-ho → Daegu.

Three concrete failure modes for retrieval systems:

1. **Single-document retrieval bias**: Embedding similarity retrieves the document most similar to the question (Parasite article) but not the bridge document (Bong Joon-ho article). Standard dense retrieval trained on single-hop QA has no signal to retrieve both.

2. **Entity extraction gaps**: For graph-based systems, if the LLM extraction pipeline misses the director relationship during indexing, no amount of graph traversal helps. Han et al. measure this miss rate at ~34% on HotpotQA.

3. **Context assembly failures**: Even when both documents are retrieved, models often extract from only one, ignoring the bridging step. Supporting fact F1 scores below answer F1 indicate this pattern.

## Strengths

**Clean evaluation signal**: Short answer spans and sentence-level supporting facts make evaluation unambiguous compared to generative tasks. F1/EM scoring is reproducible.

**Explicit reasoning structure**: The supporting facts annotation lets builders diagnose whether failures are retrieval failures (wrong documents) or reasoning failures (right documents, wrong chain). Most benchmarks cannot distinguish these.

**Scale**: 113K questions is large enough for both training and fine-tuning experiments, not just evaluation.

**Two difficulty modes**: Distractor setting enables controlled pipeline testing; full-wiki setting tests production-realistic retrieval. Most papers report both, allowing comparison across retrieval paradigms.

## Critical Limitations

**Wikipedia-bounded knowledge**: All questions are answerable from 2018 English Wikipedia. This creates a distribution mismatch for any system operating on domain-specific or post-2018 knowledge. A RAG system tuned to perform well on HotpotQA may still fail on enterprise knowledge bases with different entity density and relationship types.

**Infrastructure assumption**: The distractor setting provides pre-selected documents, making retrieval artificially easy. Systems that report distractor-only performance without full-wiki results are measuring a weaker capability. Full-wiki evaluation requires a retrieval index over all of English Wikipedia (~5M documents), which requires non-trivial infrastructure to replicate.

**Two-hop ceiling**: HotpotQA tests exactly two-hop reasoning. Production systems often encounter 3-5 hop chains (e.g., "Who was the mentor of the composer who wrote the theme for the movie that won Best Picture in 1999?"). Systems optimized for HotpotQA's two-hop structure may not generalize.

**Answer length bias**: Answers are short noun phrases (average ~2 tokens). This systematically favors extraction-style models over generation-style models and does not reflect tasks requiring longer synthesized answers.

## When Not to Use It

HotpotQA is the wrong benchmark when:

- You are evaluating conversational or multi-turn memory (use [LongMemEval](../projects/longmemeval.md) or [LoCoMo](../projects/locomo.md))
- You need to test reasoning chains longer than two hops
- Your production documents are not Wikipedia-style encyclopedic text
- You are evaluating code, math, or structured data retrieval
- You need to measure system latency or cost at scale (the benchmark provides no such signal)

## Relationship to Other Benchmarks

HotpotQA occupies a specific niche: multi-hop factual QA over short documents with explicit evidence annotation. Related benchmarks serve different purposes:

- **[SWE-bench](../projects/swe-bench.md)**: Code tasks requiring repository-level context traversal, more complex chains
- **[GAIA](../projects/gaia.md)**: General assistant tasks requiring tool use and web retrieval
- **[LongMemEval](../projects/longmemeval.md)**: Memory persistence across long conversations, not multi-hop factual synthesis
- **[WebArena](../projects/webarena.md)**: Interactive web tasks, not static document retrieval

For RAG system development, HotpotQA is most useful early in the pipeline to validate that retrieval can handle bridging queries before moving to harder benchmarks.

## Unresolved Questions

The dataset was constructed through Amazon Mechanical Turk with crowdworker quality control, but the exact inter-annotator agreement for supporting facts is not published. It is unclear how often crowdworkers disagreed about which sentences count as necessary evidence, and how that disagreement affects the metric ceiling.

The leaderboard has not been updated since approximately 2022. Whether current frontier models (GPT-4o, Gemini 1.5, Claude 3.5) saturate the benchmark is not formally documented, though informal reports suggest Answer F1 above 80 is achievable with gold context. No third party has validated whether leaderboard submissions use the distractor or full-wiki setting consistently.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md): HotpotQA is a standard RAG evaluation target
- [GraphRAG](../concepts/graphrag.md): Graph-based retrieval gains ~0.7 F1 over RAG on HotpotQA
- [Agentic RAG](../concepts/agentic-rag.md): Multi-hop decomposition strategies are validated against HotpotQA
- [Hybrid Search](../concepts/hybrid-search.md): BM25 + embedding combination improves multi-hop recall
- [Episodic Memory](../concepts/episodic-memory.md): HotpotQA trains episodic memory encoding in Mem-alpha's RL pipeline
- [Chain-of-Thought](../concepts/chain-of-thought.md): Reflexion CoT experiments use HotpotQA as the reasoning benchmark

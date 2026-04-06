---
entity_id: hotpotqa
type: project
bucket: knowledge-bases
abstract: >-
  HotpotQA is a multi-hop QA benchmark (113K Wikipedia-based questions requiring
  2-document reasoning) used to evaluate retrieval and reasoning systems; its
  key differentiator is requiring explicit supporting-fact supervision alongside
  answers.
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/bytedtsinghua-sia-memagent.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - locomo-bench
last_compiled: '2026-04-06T02:03:26.461Z'
---
# HotpotQA

## What It Is

HotpotQA is a question answering dataset of ~113,000 crowd-sourced questions built from Wikipedia. Every question requires reasoning across exactly two documents to answer correctly. The dataset ships with three artifacts per question: the answer string, the supporting facts (sentence-level), and a distractor setting that includes ten candidate paragraphs (two supporting, eight distractors). This multi-hop, multi-document structure makes it a standard stress test for retrieval and reasoning pipelines.

Released in 2018 by Yang et al. (CMU, Stanford, Université de Montréal), it remains one of the most widely cited benchmarks in the retrieval-augmented generation and knowledge base retrieval space.

## Why It Gets Used

Most QA benchmarks test single-hop retrieval: find the one paragraph containing the answer. HotpotQA forces two distinct reasoning patterns:

**Bridge questions**: The answer to the first hop unlocks the second. "What nationality is the director of [Film X]?" requires finding the director, then finding their nationality in a separate article.

**Comparison questions**: Two entities must be compared on a shared attribute. "Which of [Person A] and [Person B] was born first?" requires retrieving two birth dates from two articles.

This structure exposes weaknesses in systems that retrieve well but cannot chain inferences, and in systems that reason well but cannot identify which documents are relevant.

The supporting-fact labels add a second evaluation axis beyond answer accuracy: does the system retrieve the right evidence, not just produce the right string?

## Splits and Evaluation Metrics

| Split | Size | Setting |
|---|---|---|
| Train | 90,447 | Full wiki |
| Dev (distractor) | 7,405 | 10-paragraph context |
| Dev (fullwiki) | 7,405 | Full Wikipedia |
| Test | Hidden (leaderboard) |

Two evaluation modes:
- **Distractor setting**: The 10 paragraphs are provided; the system must identify supporting facts and extract answers from noisy context.
- **Full-wiki setting**: No paragraphs provided; the system must retrieve from all of Wikipedia. Harder, more realistic.

Standard metrics: **Exact Match (EM)** and **F1** on both the answer string and the supporting facts. A joint metric multiplies answer F1 by supporting-fact F1, penalizing systems that get the right answer without retrieving the right evidence.

## How Systems Use It

HotpotQA sits at the intersection of retrieval evaluation and reasoning evaluation. Different research communities stress different aspects:

**RAG systems** ([Retrieval-Augmented Generation](../concepts/rag.md)) use HotpotQA to test whether retrievers can surface both supporting documents, not just the nearest neighbor. The dataset rewards multi-step retrieval strategies over single embedding lookups.

**Knowledge graph systems** ([Knowledge Graph](../concepts/knowledge-graph.md), [GraphRAG](../projects/graphrag.md)) use it to test graph traversal. Bridge questions map naturally to two-hop graph paths. The paper comparing RAG and GraphRAG finds GraphRAG's Local search scores 64.60 F1 vs RAG's 63.88 F1 on HotpotQA, a modest but consistent advantage on multi-hop tasks.

**Memory systems** use it as a training signal. MemAgent ([LoCoMo](../projects/locomo.md)) trains on a HotpotQA-derived dataset hosted on HuggingFace (`BytedTsinghua-SIA/hotpotqa`). Mem-alpha trains on HotpotQA as part of its 7-dataset mix, specifically because bridge questions require the agent to identify cross-document relationships worth storing.

**Hybrid retrieval** research ([Hybrid Retrieval](../concepts/hybrid-retrieval.md)) uses it to quantify the gap between retrieval paradigms. The RAG vs. GraphRAG analysis shows +4.2% improvement from integrating both retrieval results over RAG alone on HotpotQA, suggesting the two approaches surface complementary evidence.

**Self-reflection systems** ([Reflexion](../concepts/reflexion.md)) benchmark verbal reinforcement on HotpotQA: CoT baseline 61%, episodic memory alone 63%, Reflexion 75%. The 12-point gap between simple retry and structured self-reflection is one of the cleaner demonstrations in the literature.

## Key Numbers

**Leaderboard (as of 2024, full-wiki setting, approximate):**
- Top systems: ~70-75% joint F1 (self-reported on leaderboard)
- Single-hop baselines (no retrieval chain): ~40-50% F1
- Human performance: ~93.4% answer F1, ~90.5% supporting-fact F1

These figures come from the official leaderboard and paper. They are self-reported; independent audits of top systems are rare. The human baseline is credible (annotated by the same crowd workers who created the questions).

## Structural Limitations

**Two-hop ceiling**: Every question requires exactly two documents. Real knowledge tasks regularly require three or more hops. Systems that score well on HotpotQA have not demonstrated generalization to deeper chains.

**Wikipedia domain only**: The knowledge is drawn entirely from English Wikipedia snapshots from around 2017-2018. Domain-specific corpora (legal, medical, code) are not represented. A system that retrieves well on Wikipedia may not transfer.

**Bridge question distribution skew**: Bridge questions outnumber comparison questions roughly 4:1. Systems can perform adequately by optimizing for bridge patterns without learning comparison reasoning.

**Distractor setting is easier than real retrieval**: The distractor setting provides 10 pre-selected paragraphs including both supporting documents. Real deployment requires retrieving from millions of documents. Full-wiki scores are substantially lower and more representative of production conditions.

**Answer string evaluation misses paraphrase**: EM and F1 measure string overlap. A correct but differently phrased answer scores zero on EM and partial on F1. This underestimates performance of generative systems that paraphrase rather than extract.

**Entity extraction miss rate**: The RAG vs. GraphRAG analysis finds that graph construction pipelines miss ~34% of answer-relevant entities on HotpotQA. This suggests that graph-based systems have a hard upper bound on HotpotQA that is substantially below the theoretical ceiling, regardless of reasoning quality.

## When Not to Use It

**Do not use HotpotQA to evaluate systems requiring more than two-hop reasoning.** The fixed two-hop structure means a system can learn to always perform exactly two retrieval steps and score well without developing general multi-hop capability.

**Do not use the distractor setting to benchmark retrieval quality.** The 10-paragraph context pre-selects the supporting documents. Use the full-wiki setting if retrieval is what you care about.

**Do not treat HotpotQA scores as representative of domain-specific corpora.** Wikipedia's structure (infoboxes, consistent entity linking, uniform writing style) makes retrieval substantially easier than unstructured enterprise documents.

**Do not use it as the sole evaluation for systems that need to handle temporal reasoning.** The RAG vs. GraphRAG analysis shows that temporal queries are where GraphRAG's structural advantage is largest (+23.3 F1), but HotpotQA contains few explicitly temporal questions.

## Unresolved Questions

**Does HotpotQA measure retrieval or reasoning?** The two-hop structure requires both, but optimizing for one can compensate for weakness in the other. A system with perfect retrieval and weak reasoning can outscore a system with good reasoning and imperfect retrieval. The joint metric partially addresses this but does not fully decompose the two.

**Leaderboard overfitting**: The test set answers are hidden, but training and development sets have been used to fine-tune systems for years. The degree to which top-performing systems have overfit to Wikipedia circa 2017 is unclear.

**What counts as a supporting fact?** The sentence-level supporting-fact labels were annotated by crowd workers who may disagree on which sentences are necessary vs. sufficient. Supporting-fact F1 evaluation inherits this annotation noise.

## Alternatives

**[GAIA](../projects/gaia.md)**: Tests multi-step tool-use and reasoning with verified answers. More realistic than HotpotQA for agent evaluation; harder to run at scale.

**[AppWorld / Task Benchmarks](../projects/locomo-bench.md)**: Tests multi-turn agent task completion. Use when evaluating agent memory and action execution rather than pure QA.

**[LongMemEval](../projects/longmemeval.md)**: Tests memory retrieval over extended conversation histories. Use when the question is whether a system remembers what it was told, not whether it can reason across documents.

**[SWE-Bench](../projects/swe-bench.md)**: Use when the domain is code and the task requires reading across multiple files.

**MuSiQue** (not in entity list): Four-hop reasoning benchmark. Use when two hops is insufficient to stress your system.

**Select HotpotQA when** you need a well-understood, widely benchmarked two-hop reasoning dataset with supporting-fact supervision, your retrieval corpus is Wikipedia-like, and you want to compare against a large body of prior work with consistent baselines.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md)
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md)
- [Knowledge Graph](../concepts/knowledge-graph.md)
- [Chain-of-Thought](../concepts/chain-of-thought.md)
- [Agentic RAG](../concepts/agentic-rag.md)
- [Reflexion](../concepts/reflexion.md)

## Related Projects

- [GraphRAG](../projects/graphrag.md)
- [HippoRAG](../projects/hipporag.md)
- [RAPTOR](../projects/raptor.md)
- [LongMemEval](../projects/longmemeval.md)
- [LoCoMo](../projects/locomo.md)
- [AppWorld / Task Benchmarks](../projects/locomo-bench.md)

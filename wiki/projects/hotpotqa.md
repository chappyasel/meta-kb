---
entity_id: hotpotqa
type: project
bucket: knowledge-substrate
abstract: >-
  HotpotQA is a multi-hop QA benchmark requiring 2-step reasoning across
  Wikipedia article pairs, distinguishing itself by requiring models to identify
  and use supporting facts across multiple documents rather than single-passage
  lookup.
sources:
  - repos/bytedtsinghua-sia-memagent.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/evoagentx-evoagentx.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - retrieval-augmented-generation
  - episodic-memory
last_compiled: '2026-04-08T02:47:22.556Z'
---
# HotpotQA

## What It Is

HotpotQA is a reading comprehension benchmark published in 2018 by Yang et al. (CMU, Stanford, and collaborators). Each question requires integrating information from exactly two Wikipedia articles to produce an answer. The benchmark has two tasks: answer extraction (short span or yes/no) and supporting fact identification (which sentences justify the answer). This dual task structure forces models to demonstrate interpretable reasoning chains, not just output the right string.

The dataset contains roughly 113,000 question-answer pairs. The training set is open-domain: no gold paragraphs are provided, so the retriever must find the right documents. The development and test sets have two variants: *distractor* (10 paragraphs provided, 8 distractors + 2 gold) and *fullwiki* (retrieve from the entire Wikipedia dump). Fullwiki is harder and is the standard benchmark for RAG and retrieval system evaluation.

HotpotQA lives at [hotpotqa.github.io](https://hotpotqa.github.io) with public leaderboards. The dataset is hosted on HuggingFace and used directly in several agent training pipelines, including MemAgent's training data (`BytedTsinghua-SIA/hotpotqa`).

## Why It Matters for Agent Infrastructure

Single-hop QA benchmarks (NQ, SQuAD) test whether a retriever can find the right passage. HotpotQA tests whether a system can execute a retrieval plan: retrieve document A, extract an intermediate entity, use that entity to retrieve document B, then synthesize the answer. This two-step dependency structure is the minimal form of agentic retrieval and makes HotpotQA the standard stress test for:

- **RAG pipelines**: Does iterative retrieval outperform single-shot retrieval?
- **Knowledge graph systems**: Do structured entity relationships help multi-hop reasoning?
- **Memory architectures**: Can a memory system preserve intermediate findings across retrieval steps?
- **Agent optimization**: Does a self-improving agent learn to chain tool calls correctly?

Without HotpotQA (or a comparable multi-hop benchmark), these systems have no way to distinguish genuine reasoning capability from pattern-matched retrieval.

## Question Types

HotpotQA questions fall into two structural categories:

**Bridge questions** (majority): Answer is an attribute of entity B, where entity B is identified through entity A. Example: "The director of [Film X] also directed which [other film]?" — find the director from film X's article, then find another film from the director's article.

**Comparison questions**: Compare an attribute across two entities. Example: "Which was older at death, [Person A] or [Person B]?" — retrieve birth/death years for both, compute the comparison.

Bridge questions test sequential retrieval chains. Comparison questions test parallel retrieval followed by reasoning. Most published multi-hop retrieval work performs better on comparison than bridge because comparison allows independent retrieval of both entities.

## Core Metrics

**Answer F1** (token-level overlap between prediction and gold answer, after normalization): The primary metric. F1 rather than exact match accounts for paraphrasing and minor wording differences. Reported scores cluster between 60-75% F1 for strong systems on the fullwiki setting.

**Supporting Fact F1**: Precision/recall over the set of supporting sentences. A system gets full credit only if it identifies the correct sentences from both gold documents. Most production RAG systems do not optimize this metric.

**Joint F1**: Harmonic mean of answer F1 and supporting fact F1. The most demanding metric, used on the official leaderboard. A system can score 75% answer F1 but drop to 60% joint F1 if its supporting fact identification is weak.

## How Systems Score

Representative scores on the distractor dev set (self-reported on the leaderboard unless noted):

| System | Answer F1 | Sup. Fact F1 | Joint F1 |
|--------|-----------|-------------|----------|
| Human | 91.4 | 90.5 | 82.7 |
| Strong baselines (2019–2020) | ~67–73 | ~78–85 | ~56–65 |
| GraphRAG Local (RAG vs. GraphRAG paper) | 64.60 | — | — |
| RAG baseline (RAG vs. GraphRAG paper) | 63.88 | — | — |
| EvoAgentX + optimization | reported +7.44% over unoptimized baseline | — | — |

The human ceiling is high (91.4% answer F1), but no published retrieval-augmented system reaches it. The gap between human and top systems is concentrated in bridge questions where intermediate entity resolution fails.

The RAG vs. GraphRAG paper (Han et al.) reports fullwiki-style evaluation with Llama 70B: GraphRAG Local achieves 64.60 F1 vs. RAG's 63.88 F1 — a marginal advantage for graph-structured retrieval on multi-hop tasks. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) These are independently computed scores, not from the official leaderboard.

EvoAgentX reports +7.44% F1 improvement from its optimization loop over an unoptimized EvoAgentX baseline. This is a self-comparison, not a comparison to external systems. [Source](../raw/deep/repos/evoagentx-evoagentx.md)

## How It Works Mechanically

The fullwiki task begins with a question and no document context. A retrieval system must:

1. Identify the first-hop entity (usually present in the question).
2. Retrieve the Wikipedia article for that entity.
3. Extract the bridge entity (the intermediate fact linking to the second hop).
4. Retrieve the second Wikipedia article.
5. Extract the answer span from the second article.

Failure at any step propagates. If step 3 fails (the bridge entity is not extracted), step 4 retrieves the wrong document, and the answer will be wrong regardless of generation quality. This error propagation structure means HotpotQA score is sensitive to retrieval precision much more than single-hop benchmarks.

The distractor variant is easier: the gold documents are provided in the 10-paragraph context, so the system only needs to identify which two are relevant and synthesize across them. Distractor scores consistently run 5–10 F1 points higher than fullwiki scores for the same system.

## Relationship to Knowledge Systems

**RAG**: HotpotQA exposes the weakness of single-shot dense retrieval. A system that embeds the question and retrieves the top-k passages often fails bridge questions because the bridge entity is not mentioned in the question — it is only discovered after reading the first document. Iterative retrieval (retrieve, read, reformulate query, retrieve again) is required. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) See [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md).

**GraphRAG**: Entity relationship graphs encode bridge connections explicitly. If the KG contains the edge (Film X) -[directed_by]-> (Director Y), the multi-hop path is a single graph traversal. The benchmark thus tests KG completeness: the ~34% entity miss rate in extracted KGs creates a hard ceiling. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) See [GraphRAG](../projects/graphrag.md).

**Episodic Memory**: HotpotQA requires remembering intermediate findings within a reasoning episode. A system that retrieves the bridge entity but does not store it before querying for the second document fails. This directly tests the within-episode retention that [Episodic Memory](../concepts/episodic-memory.md) architectures handle.

**Self-Reflection (Reflexion)**: Reflexion's evaluation on HotpotQA shows that self-reflection adds +12 percentage points over episodic memory alone (61% base -> 63% with memory -> 75% with reflection), measured with ground-truth context provided. This demonstrates that multi-hop reasoning failures are diagnosable through verbal self-analysis. [Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md) See [Reflexion](../concepts/reflexion.md).

**Memory training**: MemAgent uses a HotpotQA-derived dataset (`BytedTsinghua-SIA/hotpotqa`) as the primary RL training signal, using answer F1 as the reward for memory construction decisions. The benchmark's verifiable ground-truth answers make it well-suited for RLVR training. [Source](../raw/repos/bytedtsinghua-sia-memagent.md)

## Strengths

**Verifiable answers with F1 scoring**: Short answer spans and yes/no questions enable automated evaluation without LLM judges. F1 scoring accounts for minor wording variation without introducing position bias or preference artifacts that afflict LLM-as-judge evaluation.

**Dual-task structure**: Supporting fact labels let researchers diagnose whether a system is getting right answers through the right reasoning path or through shortcut-matching. A system can score 70% answer F1 while using entirely wrong reasoning, which the joint metric exposes.

**Standardized retrieval corpus**: The Wikipedia dump used for HotpotQA is fixed, enabling reproducible retrieval benchmarking. New papers can report fullwiki scores knowing they compare against the same retrieval target.

**Bridge + comparison coverage**: The two question types stress different retrieval strategies, preventing systems from overfitting to one pattern.

## Limitations

**Fixed 2018 Wikipedia snapshot**: The retrieval corpus is static. Questions about entities that have changed significantly since 2018 (company acquisitions, deaths, political changes) may have stale gold answers. This matters less for benchmarking retrieval architecture than for measuring real-world utility.

**Two-hop only**: HotpotQA tests exactly two retrieval steps. Real-world knowledge tasks often require 3–5 hops. Systems that score well on HotpotQA may still fail on deeper chains. MuSiQue (4-hop) and 2WikiMultiHopQA address this but are less commonly used as training signals.

**Bridge entity resolution depends on article structure**: The bridge entity must be findable by reading one Wikipedia article. Questions where the bridge relationship is buried in a long article are harder than those where it appears in the opening paragraph. This introduces document-structure bias that does not generalize to unstructured corpora.

**Leaderboard saturation on distractor setting**: Top distractor dev set scores approach 85–87% joint F1, compressing the signal for distinguishing strong systems. Fullwiki remains more informative but is also more expensive to run (full Wikipedia retrieval required).

**No temporal reasoning questions**: HotpotQA has bridge and comparison questions but no questions requiring temporal ordering or sequencing. The RAG vs. GraphRAG benchmark finds that temporal reasoning is where GraphRAG's advantage is largest (+23 F1 points over RAG). HotpotQA does not capture this gap. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

## When NOT to Use It

**Evaluating long-context compression**: HotpotQA documents are short Wikipedia articles. Systems designed for 100K+ token contexts (legal documents, codebases, scientific papers) will saturate HotpotQA without demonstrating their key capability. Use RULER or NIAH variants instead.

**Evaluating conversational or temporal memory**: HotpotQA is stateless — each question is independent. It does not test whether a system remembers information across turns or across sessions. Use [LongMemEval](../projects/longmemeval.md) or [LoCoMo](../projects/locomo.md) for those capabilities.

**Evaluating knowledge graph quality in isolation**: Because the fullwiki setting mixes retrieval quality with reasoning quality, a low HotpotQA score does not isolate whether the KG extraction or the reasoning is failing. The ~34% entity extraction miss rate means even a perfect reasoner cannot reach human-level HotpotQA scores with a typical KG extraction pipeline.

**Measuring production RAG performance on domain-specific corpora**: Wikipedia-style articles are structurally different from technical documentation, customer support logs, or legal filings. HotpotQA scores correlate with Wikipedia-retrieval skill, not general-purpose RAG performance.

## Alternatives

| Benchmark | Use When |
|-----------|----------|
| SQuAD / NQ | Testing single-hop retrieval and extraction; simpler baseline before multi-hop |
| MuSiQue | Need 3–4 hop chains; harder than HotpotQA, smaller community usage |
| 2WikiMultiHopQA | Need multi-hop with explicit reasoning type labels; cleaner question construction |
| FEVER | Testing fact verification rather than answer extraction |
| [GAIA](../projects/gaia.md) | Testing real-world multi-step agent tasks with tool use beyond retrieval |
| [LongMemEval](../projects/longmemeval.md) | Testing memory across conversation sessions |
| [SWE-bench](../projects/swe-bench.md) | Testing multi-step agent reasoning on code repositories |

## Unresolved Questions

**Score inflation from training contamination**: HotpotQA was published in 2018. Models trained on large web crawls may have seen HotpotQA questions or answers in pretraining data. Published scores do not systematically control for contamination, making it difficult to know how much of the improvement since 2019 reflects genuine capability gains versus memorization.

**Distractor vs. fullwiki gap interpretation**: Papers frequently report distractor scores (easier) without fullwiki scores (harder). The community has not converged on which setting is the appropriate benchmark for RAG evaluation. A system that scores 75% distractor and 62% fullwiki has a very different retrieval problem than one that scores 75% on both.

**Supporting fact labels as ground truth**: The supporting fact labels were collected via crowdworkers identifying which sentences they used to write the question. These labels reflect question-writing process, not necessarily the minimal sufficient evidence. A system using different but equally valid evidence would be penalized.


## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.6)
- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.4)

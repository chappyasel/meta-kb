---
entity_id: hotpotqa
type: project
bucket: knowledge-bases
abstract: >-
  HotpotQA is a multi-hop QA benchmark requiring reasoning across 2+ Wikipedia
  documents, used to measure whether retrieval and reasoning systems can bridge
  disjoint evidence.
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/bytedtsinghua-sia-memagent.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - Multi-Hop Reasoning
last_compiled: '2026-04-05T20:30:44.347Z'
---
# HotpotQA

## What It Is

HotpotQA is a question answering dataset released in 2018 (Yang et al., CMU/Stanford/Salesforce) containing roughly 113,000 crowd-sourced questions that require a system to read and reason across multiple Wikipedia passages to produce an answer. A question like "What nationality is the director of the film that won the 1932 Academy Award for Best Picture?" cannot be answered from a single document; the system must find the film, then find the director, then find the director's nationality.

Two question types appear in the dataset: bridge questions (where one entity connects two documents) and comparison questions (where two entities are evaluated against each other). The dataset ships with supporting fact annotations marking which sentences are required for the correct answer, enabling evaluation of both answer accuracy and reasoning chain quality.

HotpotQA has become the standard benchmark for evaluating [multi-hop reasoning](../concepts/multi-hop-reasoning.md) in retrieval-augmented systems. If a system claims to handle complex knowledge base queries, HotpotQA is usually the number it reports.

## Why It Matters for RAG and Knowledge Base Systems

Single-hop benchmarks like Natural Questions measure whether a retriever can find the right document. HotpotQA measures something harder: whether the system can retrieve two or more documents that are jointly necessary but individually insufficient, and then reason across them.

This creates two distinct failure modes that single-hop benchmarks cannot expose:

1. **Retrieval failure**: the system never finds both required documents, so even perfect reasoning yields a wrong answer.
2. **Reasoning failure**: the system retrieves both documents but cannot synthesize them into a multi-step inference.

Separating these failures requires HotpotQA's supporting fact annotations, which allow researchers to measure retrieval precision independently from answer accuracy.

## Performance Numbers in Context

Scores on HotpotQA appear across multiple sources in this knowledge base. A few concrete reference points:

- **RAG (semantic retrieval, 256-token chunks, top-10, Llama 70B)**: 63.88 F1 [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)
- **GraphRAG Community-Local (Llama 70B)**: 64.60 F1 [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)
- **Reflexion (CoT, ground-truth context provided)**: 75% accuracy [Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)
- **MemAgent training data**: Included as part of the RL training corpus for multi-hop tasks [Source](../raw/repos/bytedtsinghua-sia-memagent.md)
- **Mem-alpha training data**: HotpotQA is one of seven datasets used to construct the 30K-token training examples [Source](../raw/deep/repos/wangyu-ustc-mem-alpha.md)

These are self-reported numbers from individual papers, each using different generation models, chunking strategies, and evaluation protocols. Comparing them directly is unreliable. The Han et al. RAG vs. GraphRAG evaluation is the most methodologically controlled comparison because it standardizes retrieval configuration, generation model, and evaluation across systems.

The Reflexion 75% figure uses ground-truth supporting sentences as context, bypassing retrieval entirely. This measures reasoning quality in isolation, not full pipeline performance.

## What HotpotQA Exposes in RAG Systems

The Han et al. evaluation finds that GraphRAG (Local search) outperforms flat RAG on HotpotQA by 0.72 F1 points, while RAG beats GraphRAG on single-hop NQ by 1.77-2.74 F1 points. The gap is small, but the direction is consistent across model sizes: graph structure helps when answers require connecting entities.

More telling is the entity extraction finding from the same paper: only 65.8% of answer-relevant entities appear in KG-based GraphRAG's knowledge graphs on HotpotQA. That ~34% miss rate creates a hard ceiling. A system cannot answer a multi-hop question if either of the two required entities was dropped during graph construction. HotpotQA is sensitive to this bottleneck in a way that single-hop benchmarks are not, because missing one entity kills the entire reasoning chain.

The GAM research system lists HotpotQA alongside LoCoMo, RULER, and NarrativeQA as its benchmark suite, using a dual-agent (Memorizer + Researcher) implementation. [Source](../raw/repos/vectorspacelab-general-agentic-memory.md)

## Dataset Structure

- **Full wiki split**: ~90,000 training questions, ~7,400 development questions, ~7,400 test questions
- **Distractor setting**: Each question comes with 10 paragraphs (2 gold, 8 distractors), simulating realistic retrieval noise
- **Full wiki setting**: The system must retrieve from all of Wikipedia, making retrieval harder
- **Answer format**: Extractive span or yes/no
- **Supporting facts**: Sentence-level labels marking which sentences contain the required reasoning steps

Most system evaluations use the distractor setting because it provides a controlled retrieval environment. The full wiki setting more accurately represents production conditions but is more expensive to evaluate.

## Evaluation Metrics

HotpotQA uses token-level F1 and exact match (EM) for answer quality, plus F1 and EM for supporting fact prediction. The combined joint metric (answer correct AND supporting facts correct) is the strictest measure, requiring both answer accuracy and correct attribution of the reasoning chain.

Text normalization before scoring strips articles, punctuation, and extra whitespace, following the SQuAD convention. The MemAgent training verifier applies stricter matching (exact case, answer in `\boxed{}`), while the testing verifier applies the standard lenient normalization. [Source](../raw/repos/bytedtsinghua-sia-memagent.md)

## Limitations as a Benchmark

**Bridge question dominance.** The dataset is weighted toward bridge-style questions. Comparison questions are a smaller portion, which means aggregate scores mostly reflect bridge reasoning performance.

**Wikipedia-only scope.** All questions are grounded in Wikipedia snapshots from 2017-2018. Systems trained on newer Wikipedia data have a distributional advantage. Domain-specific knowledge bases (legal, medical, code) are not represented.

**Two-hop maximum.** Most HotpotQA questions require exactly two hops. Systems that handle two-hop reasoning may not generalize to three or more hops. Benchmarks like MuSiQue and 2WikiMultiHopQA extend the hop depth.

**Distractor setting reduces retrieval difficulty.** Providing 10 candidate paragraphs per question is easier than open-domain retrieval over millions of documents. High scores in the distractor setting do not guarantee equivalent performance in production retrieval environments.

**Annotation artifacts.** Crowd workers writing questions while looking at gold paragraphs sometimes produce lexical overlap between the question and the gold passage. Systems can exploit this overlap without genuine multi-hop reasoning.

## When to Use HotpotQA

Use it when:
- Evaluating whether a retrieval system can handle queries that require connecting two entities
- Comparing RAG against graph-based retrieval under controlled conditions
- Measuring whether a reasoning component improves over a retrieval-only baseline

Do not rely on it exclusively when:
- Your target domain differs from general Wikipedia knowledge
- You need evaluation beyond two-hop reasoning
- You care about retrieval at scale (use the full wiki setting, not distractor)
- Your queries include temporal, numerical, or comparison-heavy patterns (consider MultiHop-RAG's query-type breakdown instead)

## Alternatives and Complements

- **Natural Questions / TriviaQA**: Single-hop baselines; use alongside HotpotQA to separate retrieval from multi-hop reasoning
- **MuSiQue**: Three and four-hop questions; harder than HotpotQA
- **2WikiMultiHopQA**: Multi-hop questions grounded in two Wikipedia articles; closer controlled setup
- **MultiHop-RAG**: Broader query-type taxonomy (inference, comparison, temporal, null); useful for diagnosing where specific systems break [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)
- **RULER / NarrativeQA**: Longer-context evaluation; used alongside HotpotQA in systems targeting extended context windows

## Related Concepts

- [Multi-Hop Reasoning](../concepts/multi-hop-reasoning.md)

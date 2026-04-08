---
entity_id: hotpotqa
type: project
bucket: knowledge-substrate
abstract: >-
  HotpotQA is a multi-hop question answering benchmark requiring reasoning
  across 2+ Wikipedia passages; its key differentiator is requiring explicit
  supporting-fact annotation alongside answers, enabling faithfulness
  evaluation.
sources:
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/repos/evoagentx-evoagentx.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - repos/bytedtsinghua-sia-memagent.md
related:
  - retrieval-augmented-generation
  - episodic-memory
last_compiled: '2026-04-08T23:03:59.037Z'
---
# HotpotQA

## What It Is

HotpotQA is a question answering dataset released in 2018 by researchers at Carnegie Mellon University, Stanford, and Université de Montréal. Each question requires synthesizing information from two Wikipedia articles, and the dataset includes gold supporting-fact labels at the sentence level. Those labels let evaluators measure not just whether a system got the right answer, but whether it found the right evidence.

The benchmark exists in two configurations: a **distractor setting** (ten Wikipedia paragraphs supplied per question, two of which contain the answer) and a **fullwiki setting** (open-domain retrieval over all of Wikipedia). The fullwiki setting is the harder and more commonly reported evaluation target for modern RAG and agent systems.

It is a standard evaluation target in [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) research and appears frequently in [Episodic Memory](../concepts/episodic-memory.md) benchmarks because questions require tracking facts across documents.

## Core Mechanism

**Data construction.** Crowd workers on Amazon Mechanical Turk wrote questions by viewing two Wikipedia introductions simultaneously and were explicitly instructed to ask questions whose answers required both. This crowdsourcing protocol produces questions with genuine cross-document dependencies, unlike single-hop QA datasets where retrieval of one passage is sufficient.

**Question types.** Roughly 54% are bridge questions (one entity connects to the other), 46% are comparison questions (compare attributes of two entities). Comparison questions are harder for retrieval systems because neither entity's passage contains a direct answer.

**Evaluation metrics.** Answer evaluation uses Exact Match (EM) and token-level F1. Supporting-fact evaluation uses sentence-level EM and F1, measuring whether the system identifies the correct evidence sentences. Joint EM and joint F1 combine both, penalizing systems that hallucinate evidence or get the answer right for the wrong reason.

**Scale.** 112,779 training questions, 7,405 dev questions. The test set is held out through a leaderboard on the official site.

## Key Numbers

**Baseline performance (at release, 2018):**
- Human performance: 91.4 joint F1
- Strong baseline (BERT-era): ~59 joint F1

**Modern systems (2023–2025, self-reported on leaderboard):**
- Top leaderboard entries reach 82–86 joint F1 on fullwiki
- GPT-4 class models with RAG pipeline: typically 65–75 F1 depending on retrieval setup

**In EvoAgentX research:** GRPO-optimized multi-agent workflows show +7.44% F1 improvement over unoptimized baselines on HotpotQA, though this is a self-comparison, not a cross-system benchmark. [Source](../raw/deep/repos/evoagentx-evoagentx.md)

**In RAG vs. GraphRAG comparison:** Community-based GraphRAG Local search scores 64.60 F1 vs RAG's 63.88 F1 on HotpotQA using Llama 70B. Hybrid integration (concatenating both retrieval results) adds +4.2% over RAG baseline. [Source](../raw/deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

**In RL memory research:** MemAgent uses HotpotQA as a training benchmark for its reinforcement learning loop (HuggingFace dataset `BytedTsinghua-SIA/hotpotqa`). [Source](../raw/repos/bytedtsinghua-sia-memagent.md)

All leaderboard numbers are self-reported by submitting teams with no independent replication. Human performance numbers come from the original paper.

## What It's Good For

**Multi-hop retrieval evaluation.** If you are building a retrieval system and want to know whether it can chase entity chains across documents, HotpotQA's bridge questions are the right stress test. A system that scores well on single-hop benchmarks (Natural Questions, TriviaQA) but fails on HotpotQA has a retrieval gap, not a generation gap.

**Supporting-fact faithfulness.** The sentence-level labels let you separately measure whether your system retrieves the right context vs. whether it generates the right answer. This decomposition is uncommon in QA benchmarks and valuable for debugging RAG pipelines.

**Comparing retrieval architectures.** The RAG vs. GraphRAG paper uses HotpotQA specifically to show that GraphRAG outperforms RAG on multi-hop tasks (+0.72 F1 with Llama 70B). The benchmark's multi-hop requirement makes these differences visible in ways that single-hop benchmarks would mask.

**Training signal for memory agents.** Because questions require cross-document synthesis, HotpotQA works as a reward signal for systems learning when and what to store in external memory. MemAgent and Mem-alpha both use it this way.

## Critical Limitations

**Concrete failure mode: retrieval ceiling on fullwiki.** In the fullwiki setting, you must retrieve the correct two passages from millions of candidates before you can answer correctly. Modern dense retrievers still miss one of the two required passages on roughly 30–40% of questions. A system can have a perfect reader (generation model) and still score only 60–70 F1 because retrieval fails. Improving reader quality yields diminishing returns past a certain point. This means HotpotQA scores reflect retrieval system quality at least as much as reasoning quality.

**Unspoken infrastructure assumption: Wikipedia snapshot.** The fullwiki setting requires indexing a specific Wikipedia dump (October 2017 for the original release). Many papers use different dump dates or different preprocessing pipelines, making cross-paper comparisons unreliable even when both report "fullwiki" results. Reproducing published numbers requires matching the exact Wikipedia snapshot and chunking strategy, which papers rarely specify completely.

## When NOT to Use It

**Do not use HotpotQA to evaluate temporal reasoning.** Its questions come from a static Wikipedia snapshot. The RAG vs. GraphRAG paper shows GraphRAG has a 23-point advantage on temporal queries, but HotpotQA's questions are not temporal. If your system needs to handle "what changed between X and Y" or chronological ordering, you need a different benchmark.

**Do not use it as a proxy for domain-specific multi-hop reasoning.** HotpotQA is Wikipedia-only, covers general knowledge, and has a crowd-sourced question distribution that skews toward notable entities with rich Wikipedia articles. A system that scores 80 F1 on HotpotQA may still fail on multi-hop questions over internal enterprise documents, scientific papers, or legal text, where entity coverage and passage length distributions differ substantially.

**Do not use it for conversational or multi-turn evaluation.** Each question is independent. Systems that need to track context across turns, handle follow-up questions, or maintain user state are better evaluated on datasets like [LongMemEval](../projects/longmemeval.md) or [LoCoMo](../projects/locomo.md).

**Do not trust leaderboard rankings without checking submission dates.** The benchmark is seven years old. Many top-ranked systems use GPT-4 or frontier models as readers, which were not available when the benchmark was designed. Rankings conflate model capability improvements with retrieval architecture improvements.

## Unresolved Questions

**Is the supporting-fact annotation sufficient for faithfulness evaluation?** Sentence-level labels identify which sentences a crowd worker considered relevant. They do not verify that those sentences are causally necessary for the answer, or that no other sentences would also justify the answer. A system could score high on supporting-fact F1 while still hallucinating the chain of inference between the two passages.

**Does multi-hop performance on HotpotQA transfer to production retrieval settings?** HotpotQA's distractor paragraphs are Wikipedia introductions, a relatively clean and consistent text format. Real-world knowledge bases include PDFs, HTML pages, tables, and heterogeneous document types. There is no systematic study of how well HotpotQA performance predicts retrieval quality in non-Wikipedia corpora.

**How much does crowd-worker instruction shape the question distribution?** Workers were told to write questions requiring both passages. This may have produced questions with artificially obvious cross-document links. Naturally occurring multi-hop questions (from search logs, customer support tickets) may have subtler dependencies that HotpotQA underrepresents.

## Alternatives

**Use [GAIA](../projects/gaia.md) when** you need multi-step reasoning evaluation with real-world tasks beyond Wikipedia. GAIA questions require web browsing, file reading, and tool use alongside multi-hop inference.

**Use [LongMemEval](../projects/longmemeval.md) when** you are evaluating memory systems that must synthesize information across long conversational histories rather than across retrieved documents.

**Use [SWE-bench](../projects/swe-bench.md) when** your system needs to demonstrate multi-hop reasoning over code repositories rather than natural language documents.

**Use Natural Questions or TriviaQA when** you want to isolate single-hop retrieval quality as a controlled baseline before testing multi-hop systems.

**Use MuSiQue** (Trivedi et al., 2022) when you want stricter multi-hop control. MuSiQue was constructed to minimize shortcut paths, making it harder for systems to answer without genuinely following the reasoning chain. HotpotQA has known shortcut vulnerability where systems can answer some questions using only one of the two required passages.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): HotpotQA is a standard RAG evaluation target
- [Episodic Memory](../concepts/episodic-memory.md): Multi-hop questions require tracking facts across sources, analogous to episodic retrieval
- [Hybrid Search](../concepts/hybrid-search.md): BM25 + dense retrieval combinations show measurable gains on HotpotQA's fullwiki setting
- [Chain-of-Thought](../concepts/chain-of-thought.md): Multi-hop questions are a natural target for CoT prompting; the reasoning chain maps directly onto the required document traversal
- [GraphRAG](../projects/graphrag.md): Knowledge graph retrieval shows specific advantages on HotpotQA's comparison questions

---
entity_id: longmemeval
type: project
bucket: agent-memory
abstract: >-
  LongMemEval is a benchmark for evaluating long-term memory in conversational
  AI, testing 500 questions across multi-session histories with complex temporal
  reasoning — the primary public standard for comparing memory systems like Zep,
  Mem0, and Supermemory.
sources:
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - repos/michaelliv-napkin.md
  - repos/supermemoryai-supermemory.md
related:
  - retrieval-augmented-generation
last_compiled: '2026-04-08T23:08:43.742Z'
---
# LongMemEval

## What It Is

LongMemEval is an evaluation benchmark for long-term memory in conversational AI systems, accepted at ICLR 2025. It tests whether AI systems can accurately retrieve and reason over information scattered across extended multi-session conversation histories.

The benchmark addresses a gap in prior evaluation: most memory benchmarks test simple single-hop fact recall within a single conversation. LongMemEval instead presents questions that require reasoning over facts distributed across many sessions, tracking how information changes over time, and synthesizing evidence from non-contiguous conversation segments.

The core dataset contains 500 questions built on top of synthetic multi-session conversation histories. The histories vary in length across three tiers:

- **Oracle**: 1-6 sessions, providing an upper bound on what's achievable with perfect retrieval
- **S (Short)**: ~40 sessions per history
- **M (Medium)**: ~500 sessions per history

This structure lets researchers measure both retrieval quality in isolation (Oracle) and end-to-end system performance under realistic conditions (S, M).

## Core Mechanism

Each evaluation instance pairs a multi-session conversation history with a question requiring some form of memory reasoning. Question categories include:

- **Single-hop recall**: Retrieve a specific fact stated in a past session
- **Cross-session synthesis**: Combine information from multiple non-adjacent sessions
- **Temporal reasoning**: Answer questions about when things happened or how facts changed over time
- **Knowledge update tracking**: Correctly use the most recent version of a fact when the user updated it across sessions

The benchmark is accessed via the [LongMemEval GitHub repository](https://github.com/xiaowu0162/LongMemEval). Evaluation uses exact match or LLM-as-judge scoring depending on question type.

The "Oracle" condition deserves attention: it provides only the sessions containing the answer, effectively measuring what a perfect retriever would achieve. Gaps between Oracle and S/M scores quantify how much retrieval failure costs a given system.

## Key Numbers

Published benchmark scores from systems evaluated against LongMemEval (all self-reported by system authors):

| System | Dataset | Accuracy |
|---|---|---|
| GPT-4o (full context) | Oracle | 92.4% |
| GPT-4o (full context) | S | 64% |
| napkin (BM25 on markdown) | Oracle | 92.0% |
| napkin (BM25 on markdown) | S | 91.0% |
| napkin (BM25 on markdown) | M | 83.0% |
| Zep | S | ~18.5% improvement over baseline |
| Supermemory | Overall | 81.6% (#1 claimed) |

**Credibility note**: All figures above are self-reported. The ICLR acceptance establishes the benchmark methodology as peer-reviewed, but individual system scores come from each system's own evaluation runs. GPT-4o's sharp drop from 92.4% (Oracle) to 64% (S) is the benchmark's most cited finding and has face validity: it demonstrates the "lost in the middle" problem at scale. The napkin BM25 scores are notable because they suggest a simple lexical retrieval system outperforms semantic approaches on this benchmark, which warrants independent replication. Supermemory's "#1" claim is self-reported marketing copy without a linked comparison table.

## What LongMemEval Is Good At

**Exposing retrieval degradation at scale.** The Oracle-to-S gap is the benchmark's strongest signal. A system that performs well on Oracle but degrades on S is failing at retrieval, not reasoning. This lets teams diagnose where their pipeline breaks.

**Temporal reasoning coverage.** Most memory benchmarks ignore the problem of facts changing over time. LongMemEval's "knowledge update" category directly tests whether a system correctly uses the most recent value of a mutable fact rather than an earlier version.

**Cross-session synthesis.** Questions requiring synthesis across non-adjacent sessions stress-test systems that treat each session independently, exposing architectures that lack any mechanism for cross-session state.

**Tiered difficulty.** The Oracle/S/M structure makes it possible to compare systems at different operating points without a single number obscuring where each system fails.

## Critical Limitations

**Synthetic conversation quality.** The histories are synthetically generated, which means they lack the noise, ambiguity, and topic drift characteristic of real long-term user conversations. A system optimized for LongMemEval may not generalize to messier real-world data where contradictions are implicit rather than explicit and facts are stated obliquely.

**Infrastructure assumption.** LongMemEval assumes the evaluation system has structured access to conversation histories as discrete sessions. Systems that ingest raw conversation streams without session boundaries need preprocessing before evaluation, and that preprocessing is not standardized across reported results. Different teams may segment sessions differently, making published scores non-comparable.

**Coverage gaps.** The benchmark does not test multi-user memory (keeping one user's facts from contaminating another's), memory forgetting under privacy constraints, or memory across modalities. It also does not evaluate latency or cost, which matter at the M scale.

## When NOT to Use LongMemEval

**Short-session applications.** If your system operates within single conversations rather than across many sessions, LongMemEval scores are largely irrelevant. Single-session benchmarks or domain-specific evaluations will tell you more.

**Non-conversational memory.** LongMemEval is built around dialogue histories. Document-level RAG, code repository search, or knowledge base Q&A have different retrieval characteristics that this benchmark does not capture.

**Production latency comparison.** Zep reports a 90% latency reduction alongside accuracy gains, but LongMemEval provides no standardized latency measurement. Do not use this benchmark to choose between systems on speed grounds.

**Privacy-sensitive deployments.** The benchmark has no evaluation of memory isolation, data retention controls, or compliance behavior. These matter more than accuracy in regulated industries.

## Unresolved Questions

**Benchmark construction details are partially opaque.** The question generation methodology, human validation process, and inter-annotator agreement are not fully documented in public materials. For LLM-as-judge scoring, the exact judge model and prompt are not standardized across system evaluations.

**No leaderboard governance.** There is no official maintained leaderboard. Scores circulate through system-specific papers and READMEs without a neutral third party validating experimental conditions. Two systems claiming "#1" (Supermemory and napkin) use different subsets of the benchmark under different conditions.

**Scaling beyond M.** The benchmark goes to ~500 sessions. Production systems for long-term personal assistants may accumulate thousands of sessions over years. Whether performance rankings hold at 5,000+ sessions is untested.

**The Oracle upper bound is lower than expected.** GPT-4o at 92.4% Oracle means even with perfect retrieval, about 8% of questions fail. The nature of those failures — model reasoning errors vs. question ambiguity vs. annotation issues — is not broken out.

## Relationship to Related Work

[LoCoMo](../projects/locomo.md) is the closest alternative benchmark, covering single-hop, multi-hop, temporal, and adversarial recall within extended conversations. Supermemory claims #1 on both. LongMemEval and LoCoMo overlap in intent but differ in construction: LoCoMo uses the LOCOMO dataset derived from real conversational logs rather than synthetic histories.

[HotpotQA](../projects/hotpotqa.md) tests multi-hop reasoning over documents rather than conversational memory. Performance on HotpotQA does not predict LongMemEval performance because the retrieval surface is structurally different.

The benchmark is a primary evaluation target for [Agent Memory](../concepts/agent-memory.md) systems and is directly relevant to [Long-Term Memory](../concepts/long-term-memory.md) architecture decisions. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) systems are typically the baseline being challenged.

Systems actively benchmarked against LongMemEval: [Zep](../projects/zep.md), [Supermemory](../projects/supermemory.md), [Mem0](../projects/mem0.md), [MemGPT](../projects/memgpt.md).

## Alternatives

**Use LoCoMo** when you want evaluation grounded in real conversational data rather than synthetic histories, or when adversarial and multi-hop categories are important for your application.

**Use MEMENTO** when your system needs evaluation on memory management tasks beyond retrieval — for example, deciding what to store, when to forget, and how to handle contradictions. MEMENTO covers these behaviors; LongMemEval does not.

**Use MADail-Bench** when evaluating multi-agent dialogue systems where memory is shared across agents rather than maintained per-user.

**Build domain-specific evaluation** when your application has structured conversation patterns (customer support, medical intake, legal research) that synthetic benchmarks do not represent. LongMemEval scores will correlate poorly with production performance in narrow-domain high-stakes settings.


## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.6)

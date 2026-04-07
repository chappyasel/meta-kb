---
entity_id: longmemeval
type: project
bucket: agent-memory
abstract: >-
  LongMemEval is an ICLR 2025 benchmark of 500 questions testing LLM chat
  assistants on long-term memory across multi-session conversation histories,
  covering recall, temporal reasoning, and knowledge updates.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/nemori-ai-nemori.md
  - repos/michaelliv-napkin.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - mcp
last_compiled: '2026-04-07T11:44:06.593Z'
---
# LongMemEval

**Type:** Benchmark / Evaluation Dataset
**Bucket:** Agent Memory
**Paper:** [arxiv.org/abs/2410.10813](https://arxiv.org/abs/2410.10813) (ICLR 2025)
**Related:** [Retrieval-Augmented Generation](../concepts/rag.md) · [Agent Memory](../concepts/agent-memory.md) · [Episodic Memory](../concepts/episodic-memory.md) · [Model Context Protocol](../concepts/mcp.md) · [Context Window](../concepts/context-window.md)

---

## What It Is

LongMemEval is a benchmark for evaluating long-term memory in LLM-based chat assistants. It contains 500 questions spanning multiple conversation sessions, each requiring the model to recall, reason over, or integrate information from extended interaction histories. The benchmark targets capabilities that existing short-context evaluations miss: cross-session synthesis, temporal reasoning, and handling knowledge updates and contradictions.

The benchmark ships in three dataset variants (Oracle, S, M) that vary the number of sessions a model must track, from 1-6 sessions up to approximately 500. This scaling tests whether memory systems degrade gracefully as history grows.

---

## Core Mechanism

### Dataset Structure

LongMemEval questions fall into five task categories:

1. **Single-session recall** — retrieve a specific fact from one prior conversation
2. **Cross-session information synthesis** — combine information spread across multiple sessions
3. **Temporal reasoning** — reason about when events happened or how information changed over time
4. **Knowledge update handling** — identify when earlier stated facts were later corrected
5. **Adversarial robustness** — resist distractor information inserted to confuse retrieval

Each question maps to a specific evidence location in the conversation history. The benchmark provides ground-truth answers for automated scoring.

### Dataset Variants

| Dataset | Sessions per user | Approx. history length |
|---------|------------------|----------------------|
| Oracle | 1-6 | Short |
| S | ~40 | Medium |
| M | ~500 | Long |

The Oracle set is closest to what current systems handle well. The M set is where most memory frameworks fail or cannot run at all (GPT-4o full context is not feasible at 500 sessions).

---

## Benchmark Results (from third-party evaluations)

| System | Dataset | Accuracy | Notes |
|--------|---------|----------|-------|
| napkin (BM25 on markdown) | Oracle | 92.0% | Self-reported |
| GPT-4o full context | Oracle | 92.4% | Self-reported baseline |
| napkin | S | 91.0% | Self-reported |
| Best prior system (S) | S | 86% | Self-reported |
| GPT-4o full context | S | 64% | Self-reported |
| napkin | M | 83.0% | Self-reported |
| Supermemory | LongMemEval (variant unspecified) | 81.6% | Self-reported, #1 claim |
| Zep | LongMemEval | up to +18.5% accuracy vs baseline, 90% latency reduction | Self-reported |

**Credibility note:** All results above are self-reported by the respective project teams. No independent third-party reproduction of these numbers is documented in available sources. The napkin and Zep results appear in their own documentation. Supermemory claims #1 on LongMemEval but does not specify which dataset variant or provide a reproducible evaluation script in the sources reviewed. Treat these numbers as directional, not definitive.

The benchmark itself (the questions, conversation histories, and evaluation harness) appears independently validated through the ICLR 2025 peer review process.

---

## Why It Matters

Before LongMemEval, the primary memory benchmark was MemGPT's Deep Memory Retrieval (DMR). DMR tests single-session recall and tops out around 94-95% accuracy for current systems, making it too easy to differentiate memory architectures. LongMemEval's multi-session and temporal reasoning tasks expose meaningful differences: a system that scores 86% on the S dataset is genuinely better at production-relevant tasks than one scoring 72%.

The benchmark operationalizes the distinction between [RAG](../concepts/rag.md) (document retrieval) and memory (tracking how user-specific information evolves). Cross-session synthesis and knowledge update questions cannot be answered by retrieving a single chunk — they require either long context or structured memory that tracks contradictions and temporal order.

---

## Strengths

**Ecological validity.** The task types map to real failure modes in deployed chat assistants: users correct themselves, mention plans that later change, and reference earlier conversations. Systems that score well here are solving problems that matter in production.

**Scalable difficulty.** The Oracle/S/M progression lets evaluators test whether a memory architecture degrades gracefully. This distinguishes systems that work at toy scale from those that hold up at realistic session counts.

**Competitive differentiation.** Multiple memory projects (Zep, Supermemory, napkin, Nemori) use LongMemEval as their primary external validation. This creates a shared leaderboard, however imperfect, that makes comparison across systems possible.

---

## Critical Limitations

**Self-reported results dominate.** Nearly every published score on LongMemEval comes from the system being evaluated. There is no neutral third-party runner or held-out test split with restricted access. A project can tune against the benchmark and report the tuned number as a general capability claim.

**Variant ambiguity in published scores.** Several projects report a single LongMemEval number without specifying Oracle, S, or M. Since Oracle accuracy is ~20 points higher than M accuracy for the same system, this makes cross-project comparison unreliable unless you verify the variant.

**Conversation domain is narrow.** The benchmark covers personal assistant-style conversations. Memory systems for enterprise, code, or multi-agent contexts face different retrieval patterns (structured data, long documents, tool call histories) that LongMemEval does not test.

**No latency or cost measurement.** A system that achieves 83% accuracy by running 10 LLM calls per question is not equivalent to one that achieves the same with one call. The benchmark scores accuracy only.

---

## When NOT to Use It as Your Primary Evaluation

**Domain mismatch.** If your system handles code repositories, enterprise documents, or structured business data rather than personal chat histories, LongMemEval scores tell you little about your actual use case.

**Single-session applications.** If your agent does not maintain cross-session state, the benchmark tests capabilities you do not need. Use DMR or shorter-context evaluations instead.

**Latency-sensitive production systems.** A memory system optimized for LongMemEval accuracy may run multiple retrieval passes and LLM calls per query. If your system has strict latency requirements, benchmark on your own infrastructure with realistic load.

---

## Unresolved Questions

**Leaderboard governance.** No organization maintains an official LongMemEval leaderboard with submission controls. Claims of "#1 on LongMemEval" are self-asserted and cannot be verified without rerunning all competitors under identical conditions.

**Benchmark saturation timeline.** Oracle-set accuracy is already above 90% for simple BM25 systems. If the S and M variants follow the same pattern as model capabilities improve, the benchmark may lose discriminative power within 1-2 years.

**Temporal reasoning granularity.** The benchmark tests whether models handle knowledge updates, but does not specify how finely temporal reasoning is tested (day-level vs. week-level vs. relative ordering). This matters for systems that use temporal knowledge graphs like [Graphiti](../projects/graphiti.md).

**Cost of the M dataset.** At ~500 sessions per user, running evaluations on the M variant with API-based LLMs is expensive. Projects may be reporting S results while claiming general superiority.

---

## Alternatives and Related Benchmarks

| Benchmark | Focus | Use when |
|-----------|-------|----------|
| DMR (MemGPT) | Single-session recall | Comparing basic memory retrieval; simple baseline |
| [LoCoMo](../projects/locomo.md) | Multi-hop, temporal, adversarial over extended conversations | Richer task variety; also used by Supermemory and Nemori |
| ConvoMem (Salesforce) | Personalization and preference learning | Evaluating user modeling specifically |
| LongMemEval | Cross-session synthesis, temporal reasoning, knowledge updates | Comparing memory architectures at realistic session scale |

Use LoCoMo alongside LongMemEval if you want adversarial robustness tested. Use ConvoMem if personalization (stable preferences, user profiles) is your primary concern. Use all three if you are publishing a memory system and want credible coverage across memory task types.

---

## Practical Implications for Memory System Builders

LongMemEval's hardest questions require either a context window large enough to hold hundreds of sessions (impractical at scale) or a memory system that explicitly tracks temporal relationships and knowledge updates. This is why temporal knowledge graph approaches ([Zep](../projects/zep.md), [Graphiti](../projects/graphiti.md)) show large gains on the benchmark relative to simple vector retrieval. Systems that chunk and embed conversations without tracking which facts supersede others will fail on knowledge update questions regardless of retrieval quality.

The napkin result (92% on Oracle with plain BM25) demonstrates that retrieval quality matters more than retrieval complexity for shorter histories. At 500 sessions, BM25 drops to 83% while full context becomes infeasible, which is where memory architecture design starts to matter.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.4)
- [Model Context Protocol](../concepts/mcp.md) — part_of (0.3)

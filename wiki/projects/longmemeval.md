---
entity_id: longmemeval
type: project
bucket: agent-memory
abstract: >-
  LongMemEval is an ICLR 2025 benchmark testing conversational AI on long-term
  memory across multi-session interactions, covering temporal reasoning and
  cross-session synthesis at scales up to ~500 sessions that expose failures
  invisible in single-session evaluations.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/michaelliv-napkin.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
last_compiled: '2026-04-06T02:11:09.059Z'
---
# LongMemEval

## What It Is

LongMemEval is a benchmark for evaluating how well conversational AI systems maintain and use information across extended multi-session interactions. Published at ICLR 2025, it tests capabilities that standard single-session benchmarks miss entirely: temporal reasoning, cross-session synthesis, and knowledge update handling over conversation histories ranging from roughly 1 to 500 sessions.

The benchmark addresses a real gap. Most memory system evaluations use short, synthetic dialogues where a retrieval system can succeed with simple keyword matching. LongMemEval instead constructs evaluation scenarios that require a system to track how facts change over time, integrate information from sessions weeks or months apart, and handle contradictions between earlier and later statements.

## Dataset Structure

LongMemEval uses three dataset splits of increasing difficulty:

- **Oracle**: 1 to 6 sessions per evaluation, serving as a ceiling test
- **S (Small)**: ~40 sessions, testing moderate-scale retrieval
- **M (Medium)**: ~500 sessions, exposing failures in systems that work at small scale

The 500 questions span five task types: single-session fact recall, cross-session synthesis, temporal reasoning, knowledge update handling, and adversarial cases designed to probe false positives. This taxonomy matters because different memory architectures fail in different ways across these categories.

## Why It Matters for Memory System Builders

The benchmark exposes a specific class of failure that production memory systems encounter but short benchmarks hide: at 40+ sessions, systems that succeed on single-session recall often collapse because their retrieval surface becomes too large for simple similarity search to navigate reliably.

The S and M splits are where the interesting tradeoffs appear. On the S split (~40 sessions), [Zep](../projects/zep.md)'s temporal knowledge graph achieves roughly 18.5% accuracy improvement over baseline implementations while cutting response latency by 90%, per the Zep paper (self-reported). On the M split (~500 sessions), [Supermemory](../projects/supermemory.md) claims 81.6% accuracy and a #1 ranking (self-reported, via their MemoryBench framework). [napkin](../projects/napkin.md), using BM25 search on markdown files with no embeddings, achieves 83% on M and 91% on S (self-reported, tested with the pi agent).

These numbers matter less as absolute performance figures than as evidence that the benchmark surfaces meaningful architectural differences. A BM25 system outperforming embedding-based approaches on M is a real result with real implications for [Vector Database](../concepts/vector-database.md) adoption decisions.

## Core Mechanism

LongMemEval generates evaluation instances by constructing conversation histories with planted facts, then asking questions that require the system to retrieve and reason over those facts. The key design choice is that questions are not answerable from a single session in the harder splits. A question like "what was the user's job when they mentioned their commute?" requires locating the commute mention, identifying temporal context, and cross-referencing employment facts from a separate session.

The benchmark outputs accuracy scores per question type, allowing fine-grained diagnosis. A system might score well on single-session recall but fail on temporal reasoning, pointing directly to where its memory architecture needs work.

## Benchmarks in Practice

Three representative results from published sources (all self-reported unless noted):

| System | Dataset | Accuracy |
|---|---|---|
| Supermemory | M (~500 sessions) | 81.6% |
| napkin + BM25 | M (~500 sessions) | 83.0% |
| napkin + BM25 | S (~40 sessions) | 91.0% |
| Zep temporal KG | — | Up to 18.5% improvement vs. baseline |
| GPT-4o full context | S | 64% |
| GPT-4o full context | Oracle | 92.4% |

The GPT-4o full context numbers (from the napkin README) are notable: at 40 sessions, cramming all context into the window drops accuracy from 92% to 64%, demonstrating why [Context Engineering](../concepts/context-engineering.md) and retrieval matter at scale.

No independently validated third-party benchmark has confirmed these rankings. Supermemory built and operates MemoryBench, the framework used to produce their #1 claim. Treat all figures as directionally useful rather than definitive.

## Strengths

**Scale discrimination**: Most memory benchmarks fail to distinguish architectures because they test at scales where almost any reasonable retrieval approach works. LongMemEval's M split with 500 sessions creates meaningful separation.

**Task taxonomy**: Breaking evaluation into five question types (single-session recall, cross-session synthesis, temporal reasoning, knowledge updates, adversarial) gives builders actionable diagnostic information rather than a single accuracy number.

**Adoption**: Multiple production memory systems now use it as a primary benchmark, making it useful for cross-system comparison even with the caveats about self-reporting.

**Difficulty calibration**: The Oracle/S/M split structure lets teams benchmark incrementally without needing to run the expensive 500-session evaluation first.

## Limitations

**Synthetic construction**: The benchmark plants facts in constructed conversations. Real conversations have organic fact distribution, irrelevant noise, implicit references, and non-linear topic development that planted-fact benchmarks cannot fully replicate. A system tuned to LongMemEval may not generalize.

**Self-reported results dominate**: The most visible benchmark numbers come from the vendors of the systems being evaluated. Supermemory built MemoryBench. Zep published their own paper. napkin's numbers come from their own bench/ directory. There is no neutral third party running standardized comparisons.

**English-only**: The benchmark tests English conversations. Memory systems for multilingual applications get no signal here.

**Single-user assumption**: All sessions belong to one user context. Enterprise memory systems handling organizational knowledge across multiple users face cross-user isolation and permission problems LongMemEval does not test.

## When NOT to Use It

LongMemEval measures conversational memory for a single user across time. Skip it if your use case is:

- **Document retrieval**: You need [Retrieval-Augmented Generation](../concepts/rag.md) benchmarks like NarrativeQA or BEIR
- **Multi-user organizational memory**: Test against [Organizational Memory](../concepts/organizational-memory.md) scenarios instead
- **Single-session chatbots**: Standard dialogue benchmarks are sufficient and cheaper to run
- **Structured knowledge bases**: If your system retrieves from a static corpus without user-specific temporal reasoning, LongMemEval's task distribution does not match your problem

## Unresolved Questions

The benchmark documentation does not address:

- How conversation histories were constructed and whether the construction process introduces retrieval artifacts that skilled systems could exploit
- What the inter-annotator agreement is for question quality
- Whether the 500-question evaluation set is large enough to produce statistically stable rankings (small differences in the 1-2% range may not be meaningful)
- How to handle evaluation cost at the M scale, where 500 sessions require substantial context processing

## Related Concepts and Alternatives

- [Agent Memory](../concepts/agent-memory.md): The capability class LongMemEval evaluates
- [Episodic Memory](../concepts/episodic-memory.md): The specific memory type most relevant to cross-session recall tasks
- [Memory Consolidation](../concepts/memory-consolidation.md): The process that determines what gets stored and how
- [LoCoMo](../projects/locomo.md): A complementary benchmark focusing on extended single-conversation memory with explicit temporal and adversarial splits
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md): The retrieval strategy that tends to perform best across LongMemEval question types

**Use LongMemEval when** you need to compare memory architectures for a personal assistant or single-user application that must maintain coherent context across sessions spanning days or weeks.

**Use LoCoMo when** your sessions are long but fewer, and you need evaluation of extended single-conversation recall.

**Use domain-specific held-out evaluations when** your application has structured knowledge or access control requirements that neither benchmark addresses.

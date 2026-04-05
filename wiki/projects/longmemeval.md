---
entity_id: longmemeval
type: project
bucket: agent-memory
abstract: >-
  LongMemEval is an ICLR 2025 benchmark testing LLM agent long-term memory
  across 500 questions spanning multi-session conversations, with task
  categories covering temporal reasoning, cross-session synthesis, and knowledge
  updates.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/michaelliv-napkin.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Retrieval-Augmented Generation
  - Agent Memory
last_compiled: '2026-04-05T20:34:35.853Z'
---
# LongMemEval

## What It Is

LongMemEval is a benchmark for evaluating how well LLM-based agents maintain and reason over long-term memory across extended, multi-session conversations. Published at ICLR 2025, it tests capabilities that standard QA benchmarks miss: remembering facts from earlier sessions, updating beliefs when information changes, synthesizing information across conversations, and reasoning about when events occurred relative to each other.

The benchmark comprises 500 questions built from synthetic conversation histories that span between 1 and roughly 500 sessions depending on dataset split. Questions are not answerable from a single conversation turn; they require the agent to locate, combine, or temporally order information scattered across the conversation history.

## Dataset Structure

LongMemEval ships in three configurations, each stressing different aspects of memory systems:

- **Oracle split**: 1-6 sessions per question. Tests whether a system can retrieve the right fact when the conversation history is short enough that brute-force context stuffing is feasible. Establishes an approximate ceiling.
- **S split**: ~40 sessions. Context is too long for full inclusion in most LLMs' windows. Tests selective retrieval.
- **M split**: ~500 sessions. Context is prohibitively large. Tests compression, summarization, and long-horizon retrieval.

Question categories include single-fact recall, cross-session synthesis (combining facts from multiple conversations), temporal reasoning (ordering events or answering "before/after" questions), and knowledge update handling (the user said one thing earlier and a different thing later).

## Why It Matters

Before LongMemEval, the dominant benchmark for agent memory was the Deep Memory Retrieval (DMR) benchmark established by the MemGPT team. DMR tests retrieval accuracy but not temporal reasoning or cross-session synthesis. LongMemEval fills that gap: it was designed to reflect enterprise and consumer use cases where agents must track a user's evolving state across many interactions, not just retrieve a stored fact.

Concretely, the benchmark distinguishes between systems that merely store and retrieve, and systems that actually track how information changes over time. An agent that stores "user lives in NYC" alongside "user just moved to SF" and retrieves both in response to a location question will fail temporal reasoning tasks.

## Scores and Credibility

Results as reported in project documentation:

| System | Oracle | S (~40 sessions) | M (~500 sessions) |
|--------|--------|-------------------|-------------------|
| GPT-4o full context | 92.4% | 64% | n/a |
| Best prior system | 92.4% | 86% | 72% |
| napkin (BM25 + pi) | 92.0% | 91.0% | 83.0% |
| Supermemory | — | — | 81.6% (#1 claimed) |

Zep (Graphiti-based temporal knowledge graph) reports accuracy improvements of up to 18.5% over baseline implementations on LongMemEval, with 90% latency reduction. This figure is against an unspecified "baseline," not against other named systems.

**Credibility caveat**: All scores above are self-reported by the respective projects. Supermemory claims #1 on LongMemEval and has published MemoryBench as an open framework for reproducible comparison, but independent third-party validation of these rankings does not appear in the source material. The napkin benchmark results come from `bench/README.md` in the napkin repository, run against the benchmark without preprocessing, embeddings, or graphs. These are independently reproducible but not independently validated.

## What the Benchmark Rewards

LongMemEval scores favor systems that:

1. Retrieve selectively rather than flooding context. GPT-4o with full context scores 64% on the S split because the context overwhelms attention; it scores 92.4% on Oracle where the relevant facts are a small fraction of the window.
2. Handle temporal ordering. Systems must know which of two conflicting facts is more recent.
3. Synthesize across sessions. Multi-hop questions require combining facts stated in different conversations.

Systems that do well are either using structured knowledge representations (knowledge graphs, entity stores) or aggressive BM25-based retrieval that selects relevant sessions before generation.

## What the Benchmark Does Not Test

LongMemEval tests memory fidelity over conversation history, not:

- **Latency or cost**: A system can achieve high accuracy by running expensive re-ranking over all sessions. The benchmark does not penalize this.
- **Memory freshness in live systems**: All conversation histories are synthetic and static. Real-world agents deal with streaming updates, concurrent writes, and deletions.
- **Hallucination rate when memory is absent**: The benchmark does not test whether systems confabulate when the relevant fact was never stored.
- **Multi-user or multi-tenant isolation**: All questions involve a single user's history.
- **Domain-specific memory tasks**: The conversations are general-purpose. Performance on specialized domains (medical history, financial context, code review history) may differ.

## How Systems Score Well

Three architectural approaches surface in the benchmark results:

**BM25 keyword search on structured notes** (napkin): Zero preprocessing, markdown files, progressive retrieval. Scores competitively with much more complex systems, suggesting that accurate keyword matching on the right session is the dominant factor for many question types.

**Temporal knowledge graphs** (Zep/Graphiti): Maintains entity-level temporal relationships. When a user updates their location, the graph records the change with timestamps rather than overwriting. Excels at temporal reasoning questions.

**Unified memory ontology with extraction** (Supermemory): Automatically extracts facts, resolves contradictions, and expires stale information. Claims top scores across all three major benchmarks (LongMemEval, LoCoMo, ConvoMem), though these are self-reported.

## Limitations of the Benchmark Itself

The 500-question scale means variance across runs is meaningful, particularly for the harder M split where a few questions can shift aggregate scores noticeably. The synthetic construction of conversations means the benchmark may not capture the lexical diversity, ambiguity, or domain specificity of real user interactions.

The benchmark also does not specify evaluation protocol in a way that prevents gaming. Systems that do minimal RAG on the question text before retrieval have an advantage on keyword-heavy questions. The "temporal reasoning" category rewards systems that know the recency of stored facts, but the benchmark does not test whether systems correctly handle ambiguous temporal references in natural language.

## Relationship to Related Work

- **DMR (Deep Memory Retrieval)**: Shorter-horizon benchmark; MemGPT used it as primary evaluation. Zep reports 94.8% vs MemGPT's 93.4% on DMR. LongMemEval tests harder cases DMR misses.
- **LoCoMo**: Snap Research benchmark testing fact recall across extended single conversations; covers single-hop, multi-hop, temporal, and adversarial questions.
- **ConvoMem**: Salesforce benchmark focused on personalization and preference learning.
- **MADail-Bench, MEMENTO**: Additional memory system benchmarks cited in the context engineering survey literature, though less commonly reported against.

## When to Use LongMemEval as an Evaluation Framework

LongMemEval is the right benchmark when you are building a system that must recall and reason over long conversation histories across sessions. It is less relevant for single-session RAG over static document corpora, tool use evaluation, or code generation.

For practitioners building memory systems, the S and M splits are more diagnostic than Oracle. Oracle scores above ~85% tell you little; what matters is how much performance degrades as session count grows.

## Unresolved Questions

The benchmark does not specify how to handle systems that use the benchmark questions themselves to tune retrieval (e.g., embedding the question style into BM25 queries). Competitive scores without preprocessing specification are difficult to compare.

It is also unclear how the 500 questions were sampled or validated for question quality, or whether the temporal reasoning questions have unambiguous ground truth answers in all cases. The paper is from ICLR 2025 but detailed methodology is not available in the source material reviewed here.

## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Agent Memory](../concepts/agent-memory.md)

**Sources**: [Zep paper](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) | [napkin repo](../raw/repos/michaelliv-napkin.md) | [Supermemory repo](../raw/repos/supermemoryai-supermemory.md) | [Context Engineering Survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

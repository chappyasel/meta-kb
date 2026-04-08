---
entity_id: longmemeval
type: project
bucket: agent-memory
abstract: >-
  LongMemEval: ICLR 2025 benchmark testing LLM long-term memory across 500
  questions spanning multi-session chat histories; distinguishes temporal
  reasoning and cross-session synthesis from simple retrieval recall.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/michaelliv-napkin.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - retrieval-augmented-generation
  - model-context-protocol
  - knowledge-graph
last_compiled: '2026-04-08T02:51:35.344Z'
---
# LongMemEval

## What It Is

LongMemEval is a benchmark for evaluating long-term memory in conversational AI. Published at ICLR 2025, it tests whether systems can recall, synthesize, and reason over information spread across extended interaction histories rather than single-session context windows.

The benchmark contains 500 questions drawn from multi-session chat histories. The core differentiator is question type diversity: questions require not just verbatim recall but temporal reasoning ("what did the user say before they changed their address?"), cross-session synthesis ("given preferences mentioned in three separate conversations, what would they want?"), and knowledge update tracking ("the user mentioned X in session 2 and contradicted it in session 5 -- what's current?").

## Architecture and Design

LongMemEval ships as three dataset variants by conversation volume:

- **Oracle**: 1-6 sessions per user history
- **S**: ~40 sessions
- **M**: ~500 sessions

The S and M variants stress-test memory architectures that work fine on short contexts. GPT-4o with full context achieves 92.4% on Oracle but drops to 64% on S and becomes infeasible on M -- the benchmark's central finding.

The question design targets five failure modes in memory systems:

1. **Single-session recall** -- basic fact retrieval within one conversation
2. **Cross-session synthesis** -- facts distributed across separate sessions
3. **Temporal reasoning** -- facts that change over time with earlier states needing disambiguation
4. **Knowledge update** -- newer information superseding older
5. **Adversarial** -- misleading or contradictory information planted to confuse retrieval

Questions are grounded in realistic personal assistant scenarios: user preferences, biographical facts, task history, and scheduled events. Ground truth answers are human-verified.

## Performance Landscape

These numbers come from published papers and project READMEs, not independent third-party audits:

| System | Dataset | Accuracy | Source |
|---|---|---|---|
| GPT-4o full context | Oracle | 92.4% | [napkin README](../raw/repos/michaelliv-napkin.md) (self-reported) |
| GPT-4o full context | S | 64% | Same |
| napkin (BM25 on markdown) | S | 91.0% | Same (self-reported) |
| napkin | M | 83.0% | Same (self-reported) |
| Supermemory | LongMemEval | 81.6% (#1) | [Supermemory README](../raw/repos/supermemoryai-supermemory.md) (self-reported) |
| Zep | LongMemEval | Baseline +18.5% accuracy, -90% latency | [Zep paper](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) (self-reported) |
| MemGPT | DMR benchmark | 93.4% | Zep paper (self-reported) |

All scores are self-reported by the systems being evaluated. No independent replication is documented in available sources. The Zep paper uses LongMemEval alongside Deep Memory Retrieval (DMR) and positions the two as complementary: DMR tests single-hop fact recall, LongMemEval tests the multi-hop and temporal cases DMR misses.

The napkin numbers are striking because they use no embeddings, no vector database, and no graphs -- just BM25 search on markdown files with progressive disclosure. If accurate, this challenges the assumption that production memory systems require semantic retrieval infrastructure.

## Why It Matters

The benchmark exposes a specific gap in how memory systems are typically evaluated. Most prior evaluations (including DMR, which MemGPT popularized) test single-session retrieval: can you find the right fact from a single document or conversation? LongMemEval shifts the question to whether systems can track facts that evolve, combine information from sources months apart, and reason about temporal ordering.

This distinction matters for production deployments. A customer service agent that correctly recalls facts within one conversation but fails to track that a user changed their address across sessions creates support problems. A personal assistant that can't reconcile contradictory preferences across sessions delivers worse-than-no-memory behavior.

The context engineering literature confirms this gap. The [context engineering survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) identifies LongMemEval alongside MEMENTO and MADail-Bench as the primary memory evaluation frameworks but notes that "memory system evaluation is immature -- most benchmarks test single-session recall rather than the cross-session synthesis and temporal reasoning that production systems require."

## Relationship to Other Memory Benchmarks

**Deep Memory Retrieval (DMR)**: MemGPT's benchmark, focused on single-hop retrieval across one extended conversation. Easier than LongMemEval. Zep scores 94.8% on DMR vs 93.4% for MemGPT. The Zep paper argues DMR is insufficient for enterprise evaluation precisely because it doesn't test temporal or cross-session reasoning.

**LoCoMo**: Tests fact recall across extended single conversations with sub-categories for single-hop, multi-hop, temporal, and adversarial questions. More granular than LongMemEval on question taxonomy but uses single-session histories rather than multi-session.

**ConvoMem (Salesforce)**: Focuses on personalization and preference learning rather than fact recall. Supermemory claims #1 on all three.

**MEMENTO**: Referenced in the context engineering survey as a memory benchmark. Less publicly documented than LongMemEval or LoCoMo.

## Limitations

**Coverage gaps**: The benchmark tests personal assistant scenarios. Enterprise memory patterns -- entity relationship tracking, document knowledge bases, organizational context inheritance -- are outside scope. Zep explicitly notes it goes beyond LongMemEval to address enterprise use cases.

**Answer evaluation**: Questions with factual ground truth (addresses, dates, names) are straightforward to score. Synthesis questions requiring judgment about preferences or intent are harder to score automatically. The benchmark likely uses LLM-as-judge for these cases, which introduces evaluator variance.

**Session distribution**: The S and M datasets have ~40 and ~500 sessions respectively, but the distribution of information density per session, recency of relevant facts, and noise level affects benchmark difficulty in ways systems can exploit differently.

**Static histories**: The benchmark uses fixed conversation histories. Production memory systems deal with ongoing ingestion, real-time contradiction detection, and memory that grows unboundedly. LongMemEval tests retrieval from a frozen corpus, which is easier than managing evolving memory.

**Self-reported leaderboard dynamics**: Multiple systems now claim #1 on LongMemEval with different reported scores (Supermemory: 81.6%, napkin: 83-91% depending on dataset). Without a shared evaluation harness and standardized reporting, these numbers are not directly comparable.

## When to Use LongMemEval

Use LongMemEval when evaluating systems that need to maintain user context across multiple conversations over days or weeks. It's the right benchmark for personal assistants, long-running customer relationships, and any system where session persistence matters.

Don't use it as the sole evaluation for:
- Document knowledge base retrieval (use GAIA, NarrativeQA, or domain-specific RAG benchmarks instead)
- Single-session long-context reasoning (use RULER or NIAH variants)
- Enterprise multi-entity memory (LongMemEval's personal assistant framing doesn't cover organizational knowledge graphs)
- Production readiness testing -- the static corpus and personal scenarios don't reflect the full complexity of deployed memory systems

## Unresolved Questions

The benchmark's evaluation protocol for open-ended synthesis questions isn't fully documented in available sources. Whether systems use the official evaluation harness or implement their own scoring affects comparability.

No source documents how LongMemEval handles questions where multiple correct answers exist (e.g., "what are the user's preferences?" when preferences evolved over sessions).

The M dataset (~500 sessions) results are sparse. Only napkin reports M-scale numbers. Whether other systems simply can't process M-scale histories or chose not to benchmark at that scale is unclear.

## Related Work

- [Agent Memory](../concepts/agent-memory.md) -- the broader memory taxonomy LongMemEval evaluates
- [Long-Term Memory](../concepts/long-term-memory.md) -- concepts LongMemEval operationalizes as test questions
- [Temporal Reasoning](../concepts/temporal-reasoning.md) -- the hardest question category in the benchmark
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) -- the primary retrieval mechanism most systems use to answer LongMemEval queries
- [LoCoMo](../projects/locomo.md) -- complementary benchmark with more granular question taxonomy
- [Zep](../projects/zep.md) -- temporal knowledge graph system that uses LongMemEval as a key evaluation
- [Mem0](../projects/mem0.md) -- memory layer system evaluated against LongMemEval
- [MemGPT](../projects/memgpt.md) -- established baseline, uses DMR as primary benchmark
- [LLM-as-Judge](../concepts/llm-as-judge.md) -- likely evaluation mechanism for synthesis questions

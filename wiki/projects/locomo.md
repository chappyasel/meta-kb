---
entity_id: locomo
type: project
bucket: agent-memory
abstract: >-
  LoCoMo is a benchmark dataset from Snap Research for evaluating AI memory over
  long multi-session conversations, covering single-hop, multi-hop, temporal,
  and adversarial question types across dialogues spanning up to 35 sessions.
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/supermemoryai-supermemory.md
  - repos/memorilabs-memori.md
  - repos/nemori-ai-nemori.md
  - deep/repos/memorilabs-memori.md
related:
  - rag
last_compiled: '2026-04-06T02:05:47.748Z'
---
# LoCoMo

**Type:** Benchmark / Dataset
**Source:** Snap Research
**Repository:** [snap-research/locomo](https://github.com/snap-research/locomo)
**Paper:** "Beyond 'Needle In A Haystack': A Unified Framework for Evaluating Long-Context Memory" (NAACL 2024)

## What It Is

LoCoMo (Long-Context Multi-Session Memory) is a benchmark and dataset designed to evaluate how well AI systems recall and reason over conversations spanning many sessions. Where most dialogue benchmarks evaluate recall within a single conversation, LoCoMo tests memory across up to 35 sessions per dialogue pair, with sessions separated by realistic time gaps. Each conversation contains on average around 300 turns.

The benchmark covers four question categories that probe distinct memory failure modes:

- **Single-hop questions:** Direct recall of a stated fact ("What city does Alex live in?")
- **Multi-hop questions:** Chaining two or more facts across sessions ("What language does the person Alex met at his new job speak?")
- **Temporal questions:** Reasoning about change over time ("What did Maria say she wanted to do before she got the promotion?")
- **Adversarial questions:** Distinguishing correct facts from plausible distractors planted in the conversation

This taxonomy matters because most memory systems collapse on multi-hop and temporal categories even when they handle single-hop retrieval adequately. A system that scores 80% overall may score 50% on temporal questions, which is the failure mode that actually matters for long-running user relationships.

## Dataset Structure

The LoCoMo dataset contains 50 dyadic conversation pairs (synthetic but naturalistic) generated to simulate real friendship conversations over months. Each dialogue pair includes:

- Raw conversation turns with timestamps
- Extracted question-answer pairs across all four categories
- Multiple-choice and open-ended answer formats

The conversations were generated using GPT-4 and then manually verified. The synthetic nature is a documented limitation: real conversations have messier temporal structure, more topic drift, and less consistent personal detail disclosure than LoCoMo's dialogues.

## Why It Became a Standard

Before LoCoMo, most memory benchmarks tested either (a) single-session recall or (b) retrieval from static document corpora. Neither captures the core challenge of agent memory: accumulating facts about a user over weeks of interaction, updating beliefs when facts change, and reasoning across multiple remembered episodes.

LoCoMo filled that gap. Within a year of its release it became the primary public benchmark for comparing commercial memory systems. Supermemory, Memori, Mem0, Zep, and Nemori all report LoCoMo scores in their documentation. The four-category breakdown gives systems a diagnostic profile rather than a single number, which is why practitioners cite it over simpler alternatives.

## Benchmark Results (as Reported by Systems)

All numbers below are self-reported by the respective projects, not independently validated:

| System | Overall Accuracy | Avg Tokens/Query | Notes |
|---|---|---|---|
| Supermemory | #1 (exact figure not published in source) | — | Claims top rank across all four categories |
| Memori | 81.95% | 1,294 (4.97% of full context) | [Source](../raw/deep/repos/memorilabs-memori.md) |
| Mem0 | Below Memori | — | Outperformed by Memori per Memori docs |
| Zep | Below Memori | ~3.9x more tokens than Memori | Per Memori benchmark docs |
| Full-context baseline | ~82% (approximate) | ~26,000+ | Practical upper bound; impractical cost |

The token-efficiency framing matters here. Memori's 1,294 tokens at 81.95% accuracy versus full-context's ~26,000 tokens at comparable accuracy represents the core tradeoff LoCoMo illuminates: retrieval-based memory can approach full-context quality at a fraction of the cost, but multi-hop and temporal categories are where that gap widens.

## How Systems Get Evaluated

A LoCoMo evaluation run follows this pattern:

1. Feed conversation sessions sequentially into the memory system, simulating a user relationship building over time
2. After ingestion, query the system with each benchmark question
3. Score answers against ground truth (exact match for factoid questions, LLM-judged for open-ended)

The `evaluation/locomo/` directory in the Nemori repository contains runnable evaluation scripts. Supermemory's MemoryBench framework also wraps LoCoMo for standardized runs:

```bash
bun run src/index.ts run -p supermemory -b longmemeval -j gpt-4o -r my-run
```

The evaluation is judge-model dependent. Different LLM judges score the same answers differently, which means LoCoMo scores across systems are not directly comparable unless they use the same judge model at the same temperature. Most published numbers do not specify this.

## What LoCoMo Does Not Test

LoCoMo's design choices create real blind spots:

**No real user data.** Synthetic conversations underrepresent the messiness of actual human dialogue: repeated topics, contradictions, ambiguous references, mid-sentence topic changes. Systems that optimize for LoCoMo may not generalize.

**No write-latency or cost measurement.** LoCoMo scores accuracy but not ingestion cost. A system that stores every sentence verbatim in a vector database will score the same as a system that extracts semantic triples at 1/10th the storage cost.

**No forgetting.** LoCoMo conversations don't test whether systems correctly expire stale information. A user who says "I'm training for a marathon" in session 3 and "I finished the marathon last month" in session 20 should produce different recall behavior. The benchmark has temporal questions but doesn't directly test contradiction resolution.

**Fixed conversation length.** 35 sessions is long for a benchmark but short for production systems. An agent deployed with the same user for two years accumulates thousands of sessions. LoCoMo does not tell you how systems degrade at that scale.

**Single-domain dyads.** All conversations are friendship-style social dialogues. Performance on LoCoMo does not predict performance on customer support, coding assistance, or medical conversations where terminology and fact types differ.

## Relationship to Other Benchmarks

[LongMemEval](../projects/longmemeval.md) is the closest alternative, testing long-term memory across sessions with a focus on knowledge updates. Supermemory claims #1 on both. ConvoMem (Salesforce) focuses on personalization and preference learning from conversations. GAM's research codebase evaluates on LoCoMo, HotpotQA, RULER, and NarrativeQA together, using multi-benchmark evaluation to avoid single-benchmark overfitting.

[HotpotQA](../projects/hotpotqa.md) predates LoCoMo and tests multi-hop reasoning over documents rather than conversational memory. Systems that perform well on HotpotQA may struggle on LoCoMo's temporal category because document retrieval benchmarks don't require tracking fact evolution over time.

## Who Uses It

Projects reporting LoCoMo results include:

- [Supermemory](../projects/supermemory.md) — claims #1 across all categories (self-reported)
- [Mem0](../projects/mem0.md) — cited as comparison baseline
- [Zep](../projects/zep.md) — cited as comparison baseline
- [Letta](../projects/letta.md) — cited in memory system comparisons
- Nemori — includes `evaluation/locomo/` scripts in repo
- GAM (General Agentic Memory) — includes LoCoMo in research evaluation suite

## Critical Limitations of LoCoMo as a Standard

LoCoMo is the best available public benchmark in this space, but it has a competitive validity problem: the benchmark is now well-known enough that systems can overfit to it. Systems that tune extraction heuristics, recall thresholds, or judge prompts against LoCoMo's specific question distribution will score higher without necessarily improving general-purpose memory quality.

The 50-conversation dataset size compounds this. With 50 conversations, variance in scores is high enough that small differences (e.g., 78% vs 82%) may not be meaningful. Independent replication with the same judge model and different random seeds would clarify this, but no published system has done this publicly.

## Alternatives

- **LongMemEval:** Broader coverage of knowledge update scenarios; use when testing fact-supersession behavior specifically
- **ConvoMem:** Better for personalization-focused systems; use when the application is preference learning
- **Custom evaluation:** For production deployments, build domain-specific test sets. LoCoMo's synthetic social conversations won't predict performance in your specific domain

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Retrieval-Augmented Generation](../concepts/rag.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Memory Consolidation](../concepts/memory-consolidation.md)
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md)

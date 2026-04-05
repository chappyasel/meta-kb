---
entity_id: locomo
type: project
bucket: agent-memory
abstract: >-
  LoCoMo is a benchmark dataset for evaluating long-term conversational memory
  in AI agents, testing fact recall across single-hop, multi-hop, temporal, and
  adversarial question types over extended multi-session dialogues.
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/supermemoryai-supermemory.md
  - repos/nemori-ai-nemori.md
  - repos/mem0ai-mem0.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/volcengine-openviking.md
related:
  - OpenAI
  - Retrieval-Augmented Generation
  - Agent Memory
last_compiled: '2026-04-05T20:28:11.213Z'
---
# LoCoMo

## What It Is

LoCoMo (Long-Context Conversational Memory) is a benchmark dataset published by Snap Research for evaluating whether conversational AI agents can remember and reason about information across long, multi-session dialogues. It fills a gap that standard NLP benchmarks ignore: most LLM evaluations test single-turn or short-context performance, while production agents need to recall facts from conversations that span weeks or months of interactions.

The benchmark tests four distinct memory retrieval and reasoning capabilities: single-hop fact recall (did you remember X?), multi-hop reasoning (combine X and Y to answer Z), temporal reasoning (what was true before versus after a change?), and adversarial questions (can the model resist being misled about something it should know?).

## Why It Matters

LoCoMo has become the de facto standard for comparing agent memory systems. Mem0, Zep, Memori, OpenViking, Nemori, and Supermemory all report LoCoMo scores as their primary competitive metric. This convergence makes the benchmark useful for practitioners: a higher LoCoMo score from one system is at least directionally comparable to another's, giving buyers an apples-to-apples proxy for "will this memory layer actually work in production?"

The benchmark's structure reflects the real failure modes of deployed conversational agents. Single-hop recall catches systems that lose facts entirely. Temporal questions catch systems that can retrieve facts but cannot reason about when they were true. Adversarial questions catch systems that confidently retrieve stale or contradicted information. Multi-hop questions catch systems that store facts in isolation without linking them.

## Dataset Structure

The dataset contains conversations constructed to include long-range dependencies, requiring a system to track information across many turns and across session boundaries. The LoCoMo10 variant cited in benchmark comparisons contains 1,540 long-range dialogue cases, providing enough statistical coverage to distinguish systems that differ by a few percentage points.

Each dialogue is paired with question sets across the four question types. Evaluation typically uses an LLM judge to score answers against ground truth, though some implementations use exact match or F1 scoring for factual questions.

## How Benchmarks Are Run

Published implementations from Nemori ([Source](../raw/repos/nemori-ai-nemori.md)) and OpenViking ([Source](../raw/deep/repos/volcengine-openviking.md)) include `evaluation/locomo/` directories with pipeline scripts, suggesting the benchmark is reproducible given access to the dataset. Typical pipeline structure:

1. Ingest LoCoMo conversation sessions into the memory system under test
2. For each question, retrieve relevant context using the memory system
3. Send retrieved context plus the question to an LLM for answer generation
4. Score against ground truth using an LLM judge or string matching

The token count at step 3 is a critical secondary metric: systems compete not just on accuracy but on how many tokens they consume per query. This reflects the production reality that per-call token costs scale with deployment volume.

## Published Results

Results vary substantially across systems and evaluation configurations. Treat all figures below as self-reported unless otherwise noted.

| System | LoCoMo Accuracy | Tokens/Query | Notes |
|--------|----------------|--------------|-------|
| Supermemory | #1 (exact % not published) | — | Self-reported; claims #1 across LoCoMo, LongMemEval, ConvoMem |
| OpenViking | +49% over baseline, 35.65% → 52.08% task completion | 4.3M → 2.1M total (91% reduction) | Self-reported on LoCoMo10, 1,540 cases |
| Memori | 81.95% | 1,294 avg (4.97% of full-context) | Self-reported |
| Mem0 | +26% over OpenAI Memory | 90% fewer tokens vs full-context | Self-reported; paper at arXiv:2504.19413 |

None of these figures have been independently validated by a neutral third party. The Mem0 result has an accompanying arXiv paper, which adds some credibility over bare README claims. OpenViking's task completion framing (35.65% → 52.08%) measures something different from accuracy percentages, making direct comparisons unreliable.

The absence of a shared evaluation harness run by an independent party is the benchmark's biggest limitation. Supermemory publishes MemoryBench as an open framework for head-to-head comparison, but results produced by a system's own authors still carry self-reporting bias.

## Limitations of the Benchmark

**Coverage gaps.** LoCoMo tests recall and reasoning over text-only dialogues. It does not cover multi-modal memory (images, documents, code), concurrent multi-user scenarios, or adversarial memory injection attacks.

**Static evaluation.** The benchmark measures retrieval at a fixed point in time against a known conversation corpus. Production agents face continuously growing, potentially contradictory memory stores where retrieval quality degrades over time. LoCoMo does not test this degradation.

**Evaluation protocol variance.** Published results use different LLMs as judges, different prompting strategies, and different memory configurations. Two systems both claiming "LoCoMo #1" may have evaluated against different subsets or with different judge models.

**Scope creep.** Because LoCoMo has become the standard benchmark, systems now optimize specifically for it. A system that scores well on LoCoMo may not generalize to the actual distribution of production conversational memory tasks.

## Related Projects and Implementations

- [Mem0](../projects/mem0.md) — highest community adoption; cites LoCoMo as primary validation
- [Supermemory](../projects/supermemory.md) — claims #1 on LoCoMo, LongMemEval, and ConvoMem; publishes MemoryBench for comparison
- [Memori](../projects/memori.md) — reports 81.95% at 4.97% token footprint via SDK-level interception
- [OpenViking](../projects/openviking.md) — benchmarks against LoCoMo10 specifically; tiered L0/L1/L2 storage system

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the underlying retrieval mechanism most memory systems use to answer LoCoMo questions
- [Agent Memory](../concepts/agent-memory.md) — the broader capability LoCoMo measures

## Unresolved Questions

**Who owns the benchmark going forward?** Snap Research published the original dataset, but there is no visible governance structure for versioning, expanding, or updating LoCoMo. As conversational AI capabilities improve, the current difficulty ceiling may become too easy.

**What counts as a fair comparison?** Published results mix full-context baselines, RAG baselines, and various memory-augmented configurations. There is no agreed protocol for what the "baseline" is or what auxiliary information systems are allowed to use during evaluation.

**Does LoCoMo predict production performance?** The benchmark's controlled, retrospective dialogue structure may not reflect the noise, ambiguity, and long-tail edge cases of real user conversations. Systems that optimize for LoCoMo scoring may underperform on messier real-world data.

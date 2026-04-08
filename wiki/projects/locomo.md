---
entity_id: locomo
type: project
bucket: agent-memory
abstract: >-
  LoCoMo is a benchmark dataset for evaluating long-context conversational
  memory, providing 7,512 QA pairs across multi-session dialogues (~9K tokens,
  35 sessions) spanning single-hop, multi-hop, temporal, open-domain, and
  adversarial tasks.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/nemori-ai-nemori.md
  - repos/memvid-memvid.md
  - repos/mem0ai-mem0.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/volcengine-openviking.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
related:
  - retrieval-augmented-generation
  - openclaw
  - openai
  - knowledge-graph
last_compiled: '2026-04-08T02:43:01.176Z'
---
# LoCoMo: Long-Context Conversational Memory Benchmark

## What It Is

LoCoMo (Long-Context Conversational Memory) is a benchmark for evaluating how well LLM-based agents recall and reason over extended conversation histories. It provides 7,512 question-answer pairs derived from realistic multi-session dialogues, where each conversation spans up to 35 sessions and approximately 9,000 tokens of interaction history. The benchmark tests five distinct reasoning capabilities: single-hop recall, multi-hop reasoning, temporal reasoning, open-domain knowledge integration, and adversarial question resistance.

LoCoMo has become the de facto standard for evaluating agent memory systems. Most major memory frameworks (Mem0, A-MEM, Memori, OpenViking, Nemori) now report LoCoMo results as their primary performance claim, which makes cross-system comparison tractable but also means the benchmark increasingly drives architectural choices in the field.

## Task Categories

LoCoMo's five task types probe qualitatively different memory demands:

**Single-hop recall** tests whether an agent can retrieve a specific fact stated once in a prior session. A question like "What restaurant did the user mention in session 3?" requires locating one piece of information without inference.

**Multi-hop reasoning** requires chaining across multiple stored memories. Answering "What did the user decide to do about the project they discussed after their promotion?" needs the agent to retrieve the promotion, then find project discussions temporally associated with it, then find the subsequent decision. This task type shows the largest performance spread across memory systems: scores range from near-zero (naive retrieval) to 45+ F1 (structured linking approaches like A-MEM).

**Temporal reasoning** tests ordering and time-based inference: "What changed between the user's first and second mentions of their health routine?" Systems that store timestamps but lack temporal-specific retrieval mechanisms score only marginally above baseline here.

**Open-domain questions** require integrating world knowledge with conversation-specific facts, testing whether the memory system contaminates retrieval with irrelevant information.

**Adversarial questions** are designed to mislead: questions that suggest a false premise or invite the agent to confabulate. Systems with enriched memory representations (A-MEM, Memori) often score *lower* on this task than simpler approaches, because their semantic enrichment amplifies misleading signals.

## Why It Matters

Before LoCoMo, agent memory evaluation was fragmented. Individual systems reported accuracy on proprietary datasets, making comparison impossible. LoCoMo created a shared evaluation surface with known difficulty gradations across task types.

The benchmark's design exposes a common failure pattern in memory systems: high single-hop accuracy masks poor multi-hop and temporal performance. A system that achieves 70% on single-hop recall but 15% on multi-hop reasoning is inadequate for real agentic workflows, which routinely require synthesizing information across multiple prior interactions. LoCoMo forces this distinction into view.

For [Agent Memory](../concepts/agent-memory.md) research, LoCoMo revealed that the gap between task types is architectural, not just about model capability. The A-MEM results (collected in [Source](../raw/deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md)) show that smaller models (Qwen2.5-3b) gain 787% on multi-hop when given structured memory organization, while only gaining ~150% with larger models. This suggests memory architecture compensates for model capacity on reasoning-heavy tasks.

## Benchmark Results Across Systems

The following numbers come from self-reported evaluations by each system's authors. Independent third-party replication of these results does not yet exist in the literature.

| System | Eval Subset | Single-Hop F1 | Multi-Hop F1 | Temporal F1 | Token Reduction |
|--------|-------------|---------------|--------------|-------------|-----------------|
| LoCoMo baseline (full context) | Full | 25.02 | 18.41 | 12.04 | — |
| A-MEM (GPT-4o-mini) | Full | 27.02 | 45.85 | 12.14 | 85% |
| Memori | Not specified | — | — | — | 95% of full-context |
| Mem0 | Full | +26% over OpenAI Memory | — | — | 90% |
| OpenViking | LoCoMo10 (1,540 cases) | — | — | — | 83–91% |
| Nemori | Full | Competitive with simpler methods | — | — | Not reported |

These numbers are not directly comparable: different systems tested on different subsets, used different base models, and defined "accuracy" differently (F1 vs. exact match vs. LLM-as-judge scoring). Mem0's "+26% over OpenAI Memory" is a relative claim with no absolute anchor. The Memori 81.95% accuracy figure refers to overall LoCoMo accuracy with a specific evaluation setup. Treat all of these as directional rather than definitive.

## Core Architecture of the Benchmark

LoCoMo conversations are synthetic multi-session dialogues generated to cover diverse topic domains, with ground-truth answers manually verified. Each QA pair includes:

- The question type (single-hop, multi-hop, temporal, open-domain, adversarial)
- The ground-truth answer
- The session number(s) containing the relevant evidence
- An evaluation metric (typically F1 for open-ended answers, exact match for factual ones)

The benchmark ships with evaluation scripts that score system outputs against ground truth. Memory systems typically integrate by: (1) ingesting the full conversation history into their memory store, (2) receiving queries one at a time, and (3) returning answers based on retrieved memories. The full-context baseline feeds all 9K tokens directly into the LLM context without a memory layer.

## Strengths

**Cross-system comparability.** LoCoMo has enough adoption that results from different papers share a common reference point. When A-MEM reports 45.85 multi-hop F1 against a baseline of 18.41, the baseline is verifiable by any researcher.

**Task diversity catches specialization.** Systems that optimize purely for semantic similarity (standard [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)) tend to score well on single-hop and open-domain tasks but poorly on multi-hop and temporal. LoCoMo prevents systems from gaming a single task type.

**Realistic conversation length.** Nine thousand tokens spanning 35 sessions mirrors the length of genuine long-running agent interactions, unlike shorter benchmarks that fit entirely within standard context windows.

**Adversarial task surfaces fragility.** The adversarial category reveals a systematic weakness in enriched memory systems: semantic elaboration can amplify misleading signals. This is not a critique of any particular system but a genuine architectural tradeoff that LoCoMo makes measurable.

## Critical Limitations

**The adversarial regression problem.** Systems that enrich memory representations (A-MEM, Memori) score 20–28% *lower* on adversarial questions than the full-context baseline. This is not a benchmark flaw — it reflects a real safety concern. Memory systems that elaborate and link semantic content can make agents more susceptible to questions designed to mislead. No current memory framework has solved this.

**Temporal reasoning remains unsolved.** Across all evaluated systems, temporal reasoning improvements are marginal: A-MEM achieves +1% on temporal F1. LoCoMo's temporal questions are genuinely hard, but the benchmark does not distinguish between a system that has no temporal mechanism and one with a sophisticated bi-temporal index — both score near baseline. The benchmark lacks sufficient temporal diversity to discriminate between designs.

**Infrastructure assumption: English, text-only conversations.** LoCoMo covers English-language, text-based dialogues. Systems deployed for multilingual users, voice transcripts, or multi-modal interactions face a distribution shift the benchmark does not capture.

**Self-reported results with inconsistent evaluation setups.** No two systems in the literature report LoCoMo results with identical configurations: different base models, different k values for retrieval, different conversation subsets (full dataset vs. LoCoMo10 subset), different scoring methods. The comparison table above reflects this inconsistency.

## When NOT to Use LoCoMo as an Evaluation Target

LoCoMo measures recall and reasoning over conversational history. It does not measure:

- **Tool use or action accuracy** — use [Tau-bench](../projects/tau-bench.md) or [AppWorld](../projects/appworld.md) for agentic task completion
- **Code generation or software engineering** — use [SWE-bench](../projects/swe-bench.md)
- **Factual knowledge outside the conversation** — use [HotpotQA](../projects/hotpotqa.md) for multi-hop knowledge reasoning
- **Multi-agent coordination** — no current LoCoMo variant tests memory sharing across agents
- **Production latency and cost** — LoCoMo reports token counts as a proxy for cost, but actual latency depends on retrieval architecture, embedding model, and infrastructure

If your agent's primary failure mode is forgetting world knowledge (not conversation history), LoCoMo is the wrong benchmark. If your agent operates in short sessions with no cross-session context requirement, single-session evaluation is more appropriate.

## Related Projects Using LoCoMo

- [Mem0](../projects/mem0.md) — claims 26% accuracy gain over OpenAI Memory on LoCoMo, 90% token reduction; self-reported
- [LongMemEval](../projects/longmemeval.md) — an alternative long-context memory benchmark with different task design
- [Graphiti](../projects/graphiti.md) — temporal knowledge graph memory system, not yet benchmarked on LoCoMo
- [Zep](../projects/zep.md) — bi-temporal memory system with strong temporal reasoning; Memori reports outperforming Zep on LoCoMo
- [MemGPT](../projects/memgpt.md) — pioneered the agent-controlled memory paradigm; predates LoCoMo

## Unresolved Questions

**Evaluation standardization.** The field needs a canonical LoCoMo evaluation harness with fixed model versions, retrieval parameters, and scoring code. Without it, published numbers are not reproducible. No organization has taken ownership of this.

**Adversarial task design.** The adversarial category is the most practically important for production agents, but the benchmark provides no breakdown of *what kind* of adversarial questions cause failures. Understanding whether failures come from misleading premises, temporal contradictions, or semantic traps would guide architectural improvements.

**Scaling behavior.** All published evaluations use the full LoCoMo dataset (~9K tokens per conversation, 35 sessions). Production agent deployments may involve hundreds of sessions and millions of tokens of accumulated history. Whether rankings hold at scale is unknown.

**Multi-modal extension.** LoCoMo covers text only. As agents increasingly interact through images, voice, and structured data, a multi-modal variant would better reflect production conditions.

## Related Concepts

- [Long-Term Memory](../concepts/long-term-memory.md) — the capability LoCoMo measures
- [Agent Memory](../concepts/agent-memory.md) — broader architectural context
- [Episodic Memory](../concepts/episodic-memory.md) — the cognitive model underlying multi-session recall
- [Temporal Reasoning](../concepts/temporal-reasoning.md) — the task category where all current systems underperform
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — the baseline approach LoCoMo contrasts against
- [Context Management](../concepts/context-management.md) — token efficiency, the secondary metric LoCoMo makes visible
- [LLM-as-Judge](../concepts/llm-as-judge.md) — some LoCoMo evaluations use LLM scoring rather than exact match

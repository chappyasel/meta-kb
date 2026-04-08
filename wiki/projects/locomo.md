---
entity_id: locomo
type: project
bucket: agent-memory
abstract: >-
  LoCoMo is a benchmark dataset of long-term multi-session dialogues with 7,512
  QA pairs across 5 task types, used to evaluate conversational memory systems
  against retrieval, temporal reasoning, and adversarial robustness.
sources:
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/volcengine-openviking.md
  - repos/mem0ai-mem0.md
  - repos/memvid-memvid.md
  - repos/nemori-ai-nemori.md
  - repos/supermemoryai-supermemory.md
related:
  - openai
  - openclaw
last_compiled: '2026-04-08T22:59:47.855Z'
---
# LoCoMo

## What It Is

LoCoMo (Long-Context Conversations with Memory Operations) is a benchmark and evaluation framework for testing long-term conversational memory in AI systems. It provides standardized test data and evaluation protocols for measuring how well agents recall, reason about, and synthesize information across extended multi-session dialogues.

The benchmark has become the de facto standard for comparing memory systems in the agent infrastructure space. Mem0, A-MEM, Memori, OpenViking, and Nemori all report results against it, making LoCoMo scores a shared vocabulary for the field.

## Dataset Structure

LoCoMo contains **7,512 question-answer pairs** drawn from conversations averaging **9,000 tokens** and spanning **up to 35 sessions**. These conversations simulate the kind of extended human-AI relationship where context from early sessions remains relevant much later.

The benchmark divides evaluation into five task categories:

| Task | What It Tests |
|------|--------------|
| **Single-Hop** | Direct recall of a fact from conversation history |
| **Multi-Hop** | Reasoning across two or more memory nodes to answer a question |
| **Temporal** | Understanding when events occurred relative to each other |
| **Open Domain** | Questions requiring external knowledge combined with conversation history |
| **Adversarial** | Resistance to leading questions designed to elicit incorrect answers |

Each category stresses a different capability. Single-hop tests basic retrieval. Multi-hop tests whether the system can chain related memories. Temporal tests time-awareness. Adversarial tests whether memory enrichment makes a system more susceptible to manipulation.

## Why It Matters

Before LoCoMo, the agent memory space lacked shared evaluation ground. Papers reported results on proprietary datasets or simple fact-recall tasks that failed to stress real production scenarios. LoCoMo's multi-session structure reflects actual usage: a user whose preferences, projects, and relationships evolve across dozens of conversations.

The five task breakdown is particularly valuable. A memory system can score well on single-hop (basic vector retrieval works fine) while failing badly on multi-hop (requires semantic linking) or temporal reasoning (requires time-aware indexing). LoCoMo forces systems to declare their weaknesses rather than obscure them with an aggregate score.

The benchmark's adversarial category is underappreciated. Systems that enrich memories with semantic context (like A-MEM) show regressions on adversarial tasks — the richer the memory, the more misleading signals a crafted question can exploit. This failure mode is invisible without a dedicated adversarial split.

## How Evaluation Works

Scoring uses two metrics: **F1** (token overlap between generated and reference answers) and **BLEU-1** (unigram precision). These are standard NLG metrics, not exact-match accuracy, which matters because conversational answers are rarely identical to reference answers even when correct.

The "LoCoMo Baseline" cited in papers is the performance of a model given the full conversation context directly in the prompt — no compression, no retrieval, just brute-force context stuffing. This establishes a token-expensive upper bound. Memory systems aim to match or exceed this baseline while using a fraction of the tokens.

Full-context prompting for a LoCoMo conversation runs approximately **16,910 tokens** per query (with GPT-4o-mini). Memory systems that replace this with compressed retrieval report reductions of 85-93%, down to 1,200-2,500 tokens per query.

## Benchmark Results Across Systems

The following table summarizes multi-hop F1 scores, which most differentiate memory approaches (self-reported by each project):

| System | Model | Multi-Hop F1 | Token Reduction vs. Full-Context |
|--------|-------|-------------|----------------------------------|
| LoCoMo Baseline (full context) | GPT-4o-mini | 18.41 | — |
| A-MEM | GPT-4o-mini | 45.85 | 85% |
| A-MEM | GPT-4o | 39.41 | 93% |
| Memori | (unreported) | 81.95% overall | 95% |
| OpenViking | (LoCoMo10 subset) | +43% vs baseline | 91% |
| Mem0 | (unreported) | +26% vs OpenAI Memory | 90% |

Caveats on these numbers: all figures are self-reported by the respective teams. Memori's 81.95% is an "overall accuracy" metric that may not be directly comparable to per-task F1. OpenViking reports against a LoCoMo10 subset (1,540 cases), not the full benchmark. Independent third-party validation of any of these results does not appear to exist.

Multi-hop is where memory architectures diverge most sharply. A-MEM's 2.5x improvement over full-context on multi-hop (45.85 vs 18.41 F1 with GPT-4o-mini) reflects the value of semantic linking. The full-context approach cannot follow connections between memory nodes because it has no notion of nodes — just raw text. Linking and evolution mechanisms specifically address this, which explains why multi-hop shows the largest deltas.

## Failure Modes LoCoMo Reveals

**Temporal reasoning is consistently weak.** Across A-MEM, Mem0, and other systems, temporal task improvements are marginal (+1-8% F1) compared to multi-hop gains. This tells you that timestamps stored in memory aren't enough — systems need temporal-specific indexing and reasoning to handle questions about sequence and change over time. LoCoMo's temporal split makes this weakness visible.

**Adversarial regressions are real.** A-MEM shows a 28% F1 regression on adversarial tasks vs full-context. This is counterintuitive: more memory context makes the system worse when questions are crafted to mislead. Richer semantic representations amplify misleading signals. LoCoMo is one of the few benchmarks that tests for this.

**Full-context GPT-4o sometimes beats memory systems on open-domain.** A-MEM with GPT-4o underperforms full-context on open-domain tasks (-21% F1). Stronger models can synthesize effectively from long contexts in ways that compressed memory representations can't replicate. LoCoMo reveals the conditions under which memory compression hurts rather than helps.

## Relationship to Other Benchmarks

[LongMemEval](../projects/longmemeval.md) covers similar territory but focuses on single-session long-context rather than multi-session episodic memory. LoCoMo's multi-session structure is its distinguishing characteristic — 35 sessions is qualitatively different from a single very long conversation because information can't be retrieved through attention alone.

[HotpotQA](../projects/hotpotqa.md) tests multi-hop reasoning over documents but lacks the temporal and adversarial dimensions that LoCoMo includes. LoCoMo's multi-hop questions arise from conversational memory rather than Wikipedia passages, which shifts the retrieval challenge.

## Architectural Implications

LoCoMo benchmark results have shaped how memory systems are built:

**Multi-hop performance drives architecture toward graph-like structures.** Systems scoring well on multi-hop (A-MEM, Graphiti, Zep) all implement some form of semantic linking between memory nodes. Flat vector stores perform adequately on single-hop but degrade on multi-hop because they have no mechanism to follow relationships.

**Temporal weakness drives bi-temporal indexing.** Systems like [Zep](../projects/zep.md) implement separate valid-time and transaction-time indexes specifically because temporal reasoning tasks in benchmarks like LoCoMo expose the inadequacy of single-timestamp metadata.

**Adversarial results argue for memory quality gates.** The adversarial regression in memory-rich systems suggests that indiscriminate memory injection is dangerous. Systems that filter or curate memories before injection (rather than injecting everything above a relevance threshold) would likely show different adversarial profiles.

## Unresolved Questions

The benchmark doesn't address several practically important questions:

**Does LoCoMo performance predict production behavior?** The conversations in LoCoMo are controlled and may not reflect the noise, topic drift, and user inconsistency of real deployments. A system tuned to LoCoMo might overfit to its stylistic properties.

**How does benchmark performance scale?** LoCoMo sessions average 9,000 tokens across 35 sessions. Production agents may accumulate hundreds of sessions. Benchmark results say nothing about retrieval quality or system behavior at 10x or 100x the session count.

**Independent validation is absent.** Every number cited above comes from the team that built the system being evaluated. The field needs a neutral evaluation party running all systems against LoCoMo under identical conditions to make results comparable.

**Metrics capture surface agreement, not reasoning quality.** F1 and BLEU-1 measure token overlap. A system that produces a correct answer with different phrasing scores lower than a wrong answer with more matching words. This limits what the benchmark actually measures about reasoning.

## When to Use LoCoMo (and When Not To)

Use LoCoMo to compare memory systems on conversational recall across multiple dimensions simultaneously. It's the best available benchmark for identifying which memory architecture handles which task type.

Don't use LoCoMo results to predict performance on single-session long-context tasks — that's LongMemEval's domain. Don't treat LoCoMo scores as production performance guarantees; they're relative comparisons under controlled conditions. And don't compare numbers across papers without checking whether teams used the full benchmark vs the LoCoMo10 subset, the same model, and the same metric definition.

## Related

- [Agent Memory](../concepts/agent-memory.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Long-Term Memory](../concepts/long-term-memory.md)
- [Temporal Reasoning](../concepts/temporal-reasoning.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [LongMemEval](../projects/longmemeval.md)
- [Mem0](../projects/mem0.md)
- [Zep](../projects/zep.md)
- [Graphiti](../projects/graphiti.md)
- [LLM-as-Judge](../concepts/llm-as-judge.md)

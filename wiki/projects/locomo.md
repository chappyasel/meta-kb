---
entity_id: locomo
type: project
bucket: agent-memory
abstract: >-
  LoCoMo is a published long-horizon conversational memory benchmark evaluating
  AI agents on recall and reasoning across ~26K-token dialogue histories; its
  key differentiator is multi-category scoring (multi-hop QA, temporal
  reasoning, open-domain QA, summarization) across naturalistic extended
  conversations.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/memorilabs-memori.md
  - repos/nemori-ai-nemori.md
  - repos/memvid-memvid.md
  - repos/mem0ai-mem0.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/volcengine-openviking.md
  - deep/repos/memvid-memvid.md
related:
  - rag
  - openai
  - openclaw
  - mcp
  - mem0
last_compiled: '2026-04-07T11:42:09.530Z'
---
# LoCoMo

**Type:** Benchmark / Dataset
**Bucket:** Agent Memory

## What It Is

LoCoMo (Long-Horizon Conversational Memory) is a research benchmark for measuring how well AI memory systems retain and reason over extended dialogue histories. Published alongside evaluation protocols for multi-hop question answering, temporal reasoning, open-domain QA, and summarization, it has become the de facto standard citation in the agent memory space for comparing memory architectures.

The benchmark consists of 10 conversations, each approximately 26,000 tokens long, derived from naturalistic multi-session dialogues. Evaluation requires systems to answer questions whose answers depend on information scattered across the full conversation history — not just recent context.

LoCoMo is not a software project with a repository. It is a research artifact: a dataset, an evaluation harness, and a set of published baseline scores. Its significance to practitioners comes primarily from being the benchmark that memory system vendors cite when claiming performance improvements.

## Why It Matters

Before LoCoMo, agent memory benchmarks used short synthetic conversations or retrieval tasks that did not reflect the difficulty of real conversational memory. LoCoMo introduced several harder sub-tasks:

- **Multi-hop QA**: questions requiring chaining facts from different conversation turns (e.g., "What city does the person who recommended Alice's book live in?")
- **Temporal reasoning**: questions about when events occurred or what changed over time
- **Open-domain QA**: factual questions grounded in conversation content
- **Summarization**: producing accurate summaries of conversation episodes

A system that scores well on standard RAG benchmarks can fail LoCoMo multi-hop because it retrieves individual relevant chunks but cannot chain across them. This makes LoCoMo a meaningful discriminator between retrieval quality and reasoning quality.

## How It Works

The evaluation protocol runs a memory system against LoCoMo's 10 conversations:

1. The full conversation history is ingested into the memory system under evaluation.
2. Questions from each category are posed to the system, which retrieves relevant context and produces answers.
3. Answers are scored against ground truth, typically using exact match, F1, or LLM-as-judge scoring depending on category.

The 10 conversations × ~26K tokens each gives approximately 260K total tokens of source material. This scale ensures that naive full-context approaches become expensive and that retrieval quality is a genuine constraint.

Published baselines include ReadAgent, MemWalker, and full-context prompting. A legitimate benchmark submission reports per-category scores across all four sub-tasks, not just an aggregate accuracy number.

## Who Uses It

LoCoMo scores appear in claims from multiple memory system projects:

- **[Mem0](../projects/mem0.md)** reports +26% accuracy over OpenAI Memory on LoCoMo, with 91% faster responses and 90% fewer tokens than full-context. Published as an arXiv preprint (arXiv:2504.19413). Self-reported, but methodology described in paper.
- **Memvid** claims "+35% SOTA on LoCoMo" on its website and README. No benchmark code exists in the repository, no per-category scores are published, and the docs benchmark page returns 404. This claim is unverified marketing with no reproducible evidence. [Source](../raw/deep/repos/memvid-memvid.md)
- **Memori** reports 81.95% overall accuracy with 1,294 average tokens per query (4.97% of full-context token footprint), outperforming Zep, LangMem, and Mem0 on accuracy. Source is the Memori repository analysis. Self-reported. [Source](../raw/deep/repos/memorilabs-memori.md)
- **[OpenViking](../projects/openclaw.md)** (OpenViking/OpenClaw ecosystem) benchmarks on LoCoMo10, reporting 49% improvement over baseline with 83% token reduction, and 43% improvement with 91% token reduction when native memory is enabled. Benchmark code exists in `benchmark/RAG/` with a configurable pipeline. Self-reported. [Source](../raw/deep/repos/volcengine-openviking.md)
- **Nemori** includes a `evaluation/locomo/` directory with benchmark scripts, suggesting reproducible evaluation. The research paper (arXiv:2508.03341) describes episodic memory segmentation aligned with Event Segmentation Theory. [Source](../raw/repos/nemori-ai-nemori.md)

## Score Landscape

Reported LoCoMo scores across memory systems (all self-reported unless noted):

| System | Overall Accuracy | Token Usage vs. Full-Context | Notes |
|--------|-----------------|------------------------------|-------|
| Memori | 81.95% | ~5% (4.97%) | Repository analysis |
| Mem0 | +26% vs OpenAI Memory | ~10% | arXiv paper |
| OpenViking (no memory) | +49% over baseline | ~17% | Benchmark pipeline in repo |
| OpenViking (with memory) | +43% over baseline | ~9% | Benchmark pipeline in repo |
| Memvid | "+35% SOTA" | Not specified | No reproducible code |

Comparing these numbers directly is unreliable. Different systems use different base models, different question sets (some may use a subset of LoCoMo), and different scoring methods. "Baseline" means different things across papers. The scores are useful for understanding each project's claimed positioning, not for rigorous cross-system ranking.

## Credibility Assessment

The benchmark itself is credible — it appears in peer-reviewed research and the evaluation protocol is published. The scores claimed by vendors are a different matter.

**Higher credibility signals:**
- Benchmark code in the repository (Nemori has `evaluation/locomo/`, OpenViking has `benchmark/RAG/`)
- arXiv paper with methodology section (Mem0 arXiv:2504.19413, Nemori arXiv:2508.03341)
- Per-category scores rather than single aggregate numbers
- Comparison against the published ReadAgent/MemWalker baselines

**Lower credibility signals:**
- No benchmark code in repository
- Only a single aggregate percentage cited
- Benchmark methodology page returning 404
- No comparison against published baselines

Memvid's claim fails every credibility check above. Mem0's claim has an accompanying paper but has not been independently reproduced. Nemori's claim has the strongest methodological foundation given the evaluation directory and published paper.

## Practical Implications

For builders evaluating memory systems, LoCoMo scores serve as a useful but noisy signal:

**What a good LoCoMo score tells you:** The system can retrieve and reason over information from long conversation histories. Multi-hop performance specifically indicates the system can chain across retrieved chunks rather than just finding isolated relevant passages.

**What it does not tell you:** Performance on your specific conversation domain, latency at production scale, behavior on short conversations, or how gracefully the system degrades when the relevant information was never stored correctly in the first place.

**Token efficiency numbers are meaningful.** The consistent pattern across Mem0 (~10% of full context), Memori (~5%), and OpenViking (~9-17%) demonstrates that selective memory retrieval dramatically outperforms naive full-context prompting on both cost and latency, without proportional accuracy loss. This is the benchmark's most practically useful finding for system designers.

## Related Work

LoCoMo belongs to a family of long-context evaluation benchmarks. [LongMemEval](../projects/longmemeval.md) evaluates similar capabilities with different dataset construction methodology. [HotpotQA](../projects/hotpotqa.md) covers multi-hop reasoning over documents rather than conversations.

The benchmark connects to several underlying concepts: [Episodic Memory](../concepts/episodic-memory.md) (what LoCoMo tests agents' ability to simulate), [Retrieval-Augmented Generation](../concepts/rag.md) (the dominant retrieval mechanism evaluated), and [Agent Memory](../concepts/agent-memory.md) (the broader capability class).

## Unresolved Questions

- No official leaderboard exists for LoCoMo scores, making it impossible to track progress across the field or verify submissions.
- The original paper's evaluation protocol has been interpreted differently by different teams (question subsets, scoring methods, base models), making cross-paper comparisons unreliable.
- It is unclear whether the 10-conversation dataset is large enough to be statistically meaningful for the variance in reported scores. A 2-3 percentage point difference between systems may not be significant at this dataset size.
- The benchmark does not evaluate memory write quality (how accurately facts are stored) separately from read quality (how accurately they are retrieved). Systems that distort facts during storage can score poorly for reasons invisible to the benchmark's question-answering framing.

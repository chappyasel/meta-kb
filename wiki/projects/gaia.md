---
entity_id: gaia
type: project
bucket: agent-architecture
abstract: >-
  GAIA is a benchmark for general AI assistants that tests real-world multi-step
  task completion requiring tool use, web browsing, and file processing —
  distinguished by tasks humans solve easily but current LLMs largely cannot.
sources:
  - repos/bingreeky-memevolve.md
  - deep/repos/evoagentx-evoagentx.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - retrieval-augmented-generation
  - model-context-protocol
last_compiled: '2026-04-08T03:04:02.605Z'
---
# GAIA: General AI Assistants Benchmark

## What It Is

GAIA is a benchmark designed to measure how well AI systems handle the kind of tasks a capable human assistant would handle — finding specific facts through web searches, processing documents, reasoning across multiple sources, and synthesizing answers from heterogeneous information. Published by researchers at Meta, Hugging Face, and the Sorbonne, it was introduced in 2023 and has become a standard reference point for evaluating general-purpose agent capabilities.

The distinguishing premise: GAIA tasks are trivial for humans (average human score ~92%) but hard for AI systems. Early GPT-4 without tools scored around 15%. This inversion — easy for people, hard for models — makes it a useful stress test for agent infrastructure rather than raw language modeling.

Tasks are organized into three difficulty levels:
- **Level 1**: Single-step retrieval or reasoning, minimal tool use
- **Level 2**: Multi-step reasoning with several tool calls required
- **Level 3**: Complex chains requiring sustained planning, web navigation, file parsing, and synthesis

## Architecture of the Benchmark

Each GAIA question has a single, unambiguous answer — a specific number, name, date, or string. This design choice makes evaluation deterministic and removes the subjectivity problems that plague open-ended benchmarks. The tradeoff is that task coverage skews toward factual lookup and procedural reasoning rather than creative or open-ended tasks.

Questions frequently require:
- Web browsing to locate specific information not in training data
- File processing (PDFs, spreadsheets, audio files, images) bundled with the question
- Multi-hop reasoning across sources found during search
- Arithmetic or data manipulation on retrieved information

The benchmark lives on Hugging Face at `gaia-benchmark/GAIA`. The validation split (available publicly) and test split (answers hidden, requiring submission) contain a few hundred questions each. MemEvolve's documentation references the February 13, 2025 version (commit `897f2dfbb5c952b5c3c1509e648381f9c7b70316`) as a stable baseline for comparison.

## How It Connects to Agent Infrastructure

GAIA functions as the evaluation target for a significant portion of the agent infrastructure ecosystem. Its prominence stems from several properties that make it useful for measuring agent quality:

**Tool use is mandatory.** A language model answering from parametric knowledge alone cannot score well. This makes GAIA a proxy for agent capability rather than memorization, and explains why frameworks like [EvoAgentX](../projects/evoagentx.md) use it as a primary benchmark — the EvoAgentX paper reports gains of up to 20% on GAIA from workflow optimization, though this measures optimized vs. unoptimized EvoAgentX rather than comparison against other frameworks (self-reported, not independently verified).

**[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines are directly exercised.** The web retrieval, document parsing, and multi-source synthesis requirements map directly onto RAG system capabilities. GAIA exposes failure modes in retrieval systems that single-document QA benchmarks miss.

**Memory architectures face real test conditions.** Projects like [MemEvolve](../projects/memevolve.md) use GAIA alongside WebWalkerQA and xBench to evaluate memory system variants. The multi-step nature of GAIA tasks requires agents to track intermediate results across tool calls — exactly what [Agent Memory](../concepts/agent-memory.md) systems are built for.

**[Model Context Protocol](../concepts/model-context-protocol.md) integrations get exercised.** Any agent that uses MCP-connected tools for web browsing or file access will encounter the full diversity of GAIA's tool requirements.

## Key Numbers

Current state of the leaderboard (as of early 2025):
- Human baseline: ~92%
- Top frontier systems with tools: 50-65% range on the validation set
- GPT-4 (original, no tools): ~15%

These figures come from the GAIA leaderboard on Hugging Face, which is publicly verifiable. Individual system claims require scrutiny — the validation set answers are public, so validation scores could be inflated by overfitting. Test set scores require submission and are harder to game, but the leaderboard mixes self-reported and verified entries.

## Strengths

**Unambiguous evaluation.** Single correct answers eliminate inter-annotator disagreement and LLM-as-judge subjectivity. You know the score is the score.

**Real-world task fidelity.** Tasks reflect genuine information work rather than contrived academic puzzles. A system that scores well on GAIA is doing something that looks like useful work.

**Multimodal breadth.** Bundled files (audio, images, spreadsheets) test document understanding alongside web retrieval, which most QA benchmarks skip.

**Meaningful human-AI gap.** The ~92% human / ~60% top-system gap leaves substantial room for measuring progress, unlike saturated benchmarks.

## Critical Limitations

**Concrete failure mode — static answer brittleness:** Because answers must be exact strings, small formatting differences (trailing spaces, capitalization, number representation) cause correct reasoning to register as wrong. An agent that retrieves "3.14" when the expected answer is "3.1" fails despite correct methodology. This penalizes systems with slightly different output formatting rather than different reasoning quality.

**Unspoken infrastructure assumption:** GAIA assumes reliable, low-latency web access. Agents running in air-gapped environments, behind aggressive rate limits, or with high search API latency will see degraded scores that reflect infrastructure quality rather than agent reasoning. The benchmark's web-heavy design makes it unsuitable for evaluating agents in constrained deployment environments.

## When Not to Use GAIA

**Don't use GAIA to evaluate:**
- Agents operating without internet access or tool use — the benchmark is blind to parametric knowledge quality
- Conversational or open-ended task quality — GAIA only measures factual task completion
- Code generation capability — [SWE-bench](../projects/swe-bench.md) or [HumanEval](../projects/humaneval.md) are better fits
- Long-horizon agent planning with no factual answer — GAIA questions terminate in a single answer, not open-ended processes
- Systems where latency and cost matter — GAIA gives no signal on efficiency

If your agent's primary job is coding assistance, use [SWE-bench](../projects/swe-bench.md). If you're evaluating customer service or multi-turn dialogue, GAIA's single-answer format is the wrong tool.

## Unresolved Questions

**Leaderboard integrity.** The validation set answers are public. There is no published audit of whether submitted systems have been fine-tuned on or otherwise adapted to GAIA validation questions. Test set submission provides some protection but is not foolproof.

**Cost and latency at scale.** Evaluating an agent on GAIA requires running potentially dozens of tool calls per question across hundreds of questions. The benchmark documentation does not specify expected API costs or evaluation time, which vary significantly across agent architectures. A full evaluation run can cost hundreds of dollars in API fees.

**Level 3 task coverage.** Level 3 questions are few in number. Statistical significance for changes in Level 3 performance requires multiple evaluation runs, which is expensive. Most papers report aggregate or Level 1/2 scores where sample sizes are larger.

**Temporal drift.** Web content changes. A question answered correctly in 2023 may now return different search results. The benchmark does not document a refresh policy or versioning strategy for questions whose answers depend on web content that may have changed.

## Alternatives

| Benchmark | Use When |
|-----------|----------|
| [SWE-bench](../projects/swe-bench.md) | Evaluating software engineering agents on real GitHub issues |
| [HumanEval](../projects/humaneval.md) | Measuring code generation quality with functional correctness |
| [HotpotQA](../projects/hotpotqa.md) | Testing multi-hop reasoning without requiring live web access |
| [LongMemEval](../projects/longmemeval.md) | Evaluating long-term memory and cross-session recall specifically |
| [Tau-bench](../projects/tau-bench.md) | Testing tool-augmented agents in structured task environments |
| [AppWorld](../projects/appworld.md) | Evaluating agents operating within controlled application ecosystems |

For general agent capability assessment where web access is available and factual task completion is the target, GAIA remains the most widely-used reference point. For anything else, a more specific benchmark will give you a cleaner signal.


## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.5)
- [Model Context Protocol](../concepts/model-context-protocol.md) — part_of (0.4)

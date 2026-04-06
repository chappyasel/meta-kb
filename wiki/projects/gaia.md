---
entity_id: gaia
type: project
bucket: agent-systems
abstract: >-
  GAIA is a benchmark testing AI assistants on real-world tasks requiring tool
  use, web search, and multi-step reasoning; its key differentiator is using
  questions trivially solvable by humans but hard for current AI systems.
sources:
  - repos/bingreeky-memevolve.md
  - repos/agent-on-the-fly-memento.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-06T02:14:20.714Z'
---
# GAIA: General AI Assistants Benchmark

## What It Is

GAIA benchmarks general-purpose AI assistants on tasks that require grounded, multi-step reasoning combined with practical tool use. Unlike benchmarks that test narrow capabilities, GAIA tasks are designed to be straightforward for a human with internet access but difficult for current AI systems. A typical task might ask an agent to find a specific fact buried in a PDF linked from a Wikipedia article, cross-reference it with a web search, and perform a calculation on the result.

The benchmark was released by researchers at Meta AI, Hugging Face, AutoGPT, and GenAI in 2023. As of mid-2025, the validation split is publicly available on Hugging Face (`gaia-benchmark/GAIA`); the test split ground truth remains withheld, with evaluation run through a leaderboard.

## Task Structure

GAIA organizes tasks into three difficulty levels:

- **Level 1**: Single-step tasks, minimal tool use. A human should complete these in under a minute.
- **Level 2**: Multi-step tasks requiring tool combinations (web search + file parsing + arithmetic).
- **Level 3**: Complex tasks where an agent must plan and execute extended sequences, often involving ambiguous intermediate steps.

Each task has a single unambiguous string answer. This design choice makes automated scoring tractable but also constrains the benchmark to tasks with deterministic correct answers, excluding open-ended reasoning or judgment calls.

Tasks span domains including science, history, geography, finance, and everyday trivia. Many tasks attach auxiliary files: spreadsheets, audio clips, images, or PDFs that an agent must process as part of the solution path. The MemEvolve repository documents this structure directly, requiring `metadata.jsonl` alongside raw task files in a specific directory layout for evaluation scripts to work correctly.

## Core Mechanism

**Evaluation:** Scoring compares agent output against a canonical answer string, with some fuzzy matching for numerical answers. No partial credit. This strict scoring makes GAIA a reliable signal for end-to-end task completion but penalizes agents that reason correctly but format answers differently.

**Task design philosophy:** Each question is written so that a knowledgeable human can verify the correct answer in a few seconds, even if finding it originally required significant work. This separates retrieval and reasoning difficulty from verification difficulty, producing cleaner signal about agent capability.

**Auxiliary file handling:** A meaningful fraction of GAIA tasks require processing attached files. Agents that lack document parsing, audio transcription, or spreadsheet reading capabilities are structurally excluded from certain tasks, not just scored lower. This makes GAIA a test of tool integration breadth, not just reasoning quality.

## Key Numbers

Current performance on the validation set (as reported on the public leaderboard, self-reported by submitters):

- Human performance: ~92% overall
- Top agent systems (mid-2025): ~65-75% on Level 1, ~40-55% on Level 2, ~20-35% on Level 3
- GPT-4 without tools (baseline from original paper): ~7% overall

The gap between human and top agent performance narrows each release cycle, which is partly genuine progress and partly leaderboard optimization. Because validation set answers are public, teams can (and do) tune on them. Test set scores, where available, tend to run 5-15% lower than validation scores for the same systems. Treat leaderboard numbers as directional, not definitive.

The Memento project (2,375 stars) reports competitive results on GAIA validation and test sets using a planner-executor architecture with case-based reasoning, and MemEvolve (201 stars) uses GAIA as one of three primary evaluation benchmarks. Both self-report their numbers.

## Strengths

**Ecological validity.** Tasks resemble actual work people delegate to AI assistants. A system that scores well on GAIA has demonstrated it can coordinate search, file parsing, and reasoning in a loop, not just answer trivia from parametric knowledge.

**Unambiguous grading.** Single string answers eliminate scorer disagreement and make regression testing practical. You can run GAIA on a code change and get a reliable signal.

**File type diversity.** Audio, video, images, spreadsheets, and PDFs appear in the benchmark. This forces evaluation of the full tool stack, not just the language model component.

**Active adoption.** Multiple agent frameworks (Memento, MemEvolve, Flash-Searcher) use GAIA as their primary benchmark, which creates a body of comparative data across architectural choices.

## Critical Limitations

**Concrete failure mode:** GAIA tasks with attached audio or video files require functional transcription pipelines. An agent that handles text tasks at 70% accuracy may score near 0% on audio tasks because the bottleneck is pipeline configuration (FFmpeg, transcription models, API access), not intelligence. This creates misleading aggregate scores that depend heavily on infrastructure setup, not just model capability.

**Unspoken infrastructure assumption:** The benchmark assumes consistent, low-latency web access. Tasks that require web search return different results depending on when they run, what region the agent operates in, and whether pages have changed since the task was written. An agent that scored 60% six months ago on time-sensitive search tasks may score differently today simply because the target pages changed, not because the agent changed.

## When Not to Use GAIA

**Domain-specific evaluation:** If your agent handles medical records, legal documents, or code repositories, GAIA's generalist tasks do not predict performance on your domain. Build domain-specific evaluation sets.

**Latency-sensitive systems:** GAIA tasks are designed for correctness, not speed. An agent that takes 10 minutes to complete a Level 3 task scores identically to one that finishes in 30 seconds. If response latency matters for your application, GAIA tells you nothing useful.

**Narrow tool configurations:** If your agent uses only a subset of tools (no file processing, no code execution), a significant fraction of GAIA tasks are structurally impossible to solve. Your score reflects missing tools more than reasoning quality.

**Leaderboard optimization:** GAIA validation answers are public. If you want unbiased evaluation of a new system, the validation set is contaminated as soon as you start tuning on it. Use the test set submission process instead, accepting the slower feedback loop.

## Unresolved Questions

**Leaderboard governance:** There is no published policy on how GAIA handles suspected validation set overfitting or data contamination. The test set provides some protection, but the submission process and review criteria are not documented in detail.

**Task freshness:** Web-dependent tasks degrade as target pages change or disappear. It is unclear how frequently the benchmark maintainers audit for stale tasks or update the corpus. A task asking about content on a specific URL may have been valid in 2023 and invalid today.

**Cost at scale:** Running a full GAIA evaluation with a capable agent requires hundreds of web searches and file processing operations. Total API and compute cost per evaluation run is not standardized. Teams using cheaper models or more aggressive rate limiting will see different score profiles than teams running unconstrained evaluations, and this is not controlled for in leaderboard submissions.

**Level 3 ceiling:** At 20-35% accuracy, Level 3 tasks remain largely unsolved. It is not clear whether this reflects fundamental model limitations, task design that requires capabilities not yet built, or simply that no team has invested sufficient engineering effort on hard multi-step tasks.

## Alternatives

**[SWE-Bench](../projects/swe-bench.md):** For software engineering specifically. SWE-Bench tests code modification and bug fixing in real repositories, providing a deeper signal for coding agent capability than GAIA's occasional code tasks. Use SWE-Bench when your agent's primary job involves writing or debugging code.

**[AppWorld](../projects/appworld.md):** For agents operating within structured app ecosystems. AppWorld tests multi-app task completion in controlled environments where the action space is defined, removing the web search uncertainty that complicates GAIA.

**[LongMemEval](../projects/longmemeval.md):** For memory system evaluation specifically. LongMemEval tests cross-session recall and temporal reasoning in ways GAIA does not. If you are building a memory layer rather than a general agent, LongMemEval provides more targeted signal.

**[HotpotQA](../projects/hotpotqa.md):** For multi-hop question answering without tool use. HotpotQA tests whether a model can synthesize information across documents in a controlled corpus. It lacks GAIA's real-world grounding but offers cleaner experimental control.

Use GAIA when you need a general-purpose signal for end-to-end agent capability across diverse tasks requiring tool coordination, and when you accept that leaderboard scores are directional rather than rigorous.

## Related Concepts

- [Agentic RAG](../concepts/agentic-rag.md): The retrieval pattern most GAIA-competitive agents implement
- [ReAct](../concepts/react.md): The reasoning-action loop underlying most GAIA agents
- [Task Decomposition](../concepts/task-decomposition.md): Required for GAIA Level 2 and 3 tasks
- [Chain-of-Thought](../concepts/chain-of-thought.md): Baseline reasoning approach tested by the benchmark

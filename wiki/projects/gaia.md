---
entity_id: gaia
type: project
bucket: agent-architecture
abstract: >-
  GAIA benchmarks general AI assistants on real-world tasks requiring web
  search, file parsing, multi-step reasoning, and tool use — with
  human-verifiable ground-truth answers across three difficulty levels.
sources:
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/evoagentx-evoagentx.md
  - repos/bingreeky-memevolve.md
related:
  - retrieval-augmented-generation
last_compiled: '2026-04-08T23:21:30.560Z'
---
# GAIA: General AI Assistants Benchmark

## What It Is

GAIA is a benchmark for evaluating whether AI systems can complete the kind of tasks a capable human assistant handles routinely: look up a fact, read a PDF, cross-reference two sources, do a calculation, and return a specific answer. Tasks have deterministic, human-verifiable answers — a number, a name, a date — which makes scoring unambiguous.

The benchmark was released in 2023 by researchers from Meta AI, Hugging Face, AutoGPT, and GenAI. It is hosted on Hugging Face at `gaia-benchmark/GAIA`. The test set labels are withheld; submissions go through a leaderboard. The validation set (with labels) is public and used for development. MemEvolve documentation references a specific commit (`897f2dfbb5c952b5c3c1509e648381f9c7b70316`, Feb 13, 2025) for reproducibility.

## Task Structure

GAIA divides tasks into three difficulty levels:

- **Level 1:** Single-hop questions answerable with one tool call or search.
- **Level 2:** Multi-step tasks requiring sequencing several tools or reasoning across multiple retrieved pieces of information.
- **Level 3:** Complex tasks with nested dependencies, file parsing (audio, spreadsheet, image), or long chains of reasoning.

Auxiliary files accompany many tasks: MP3 audio clips, Excel spreadsheets, images. An agent must identify the right file, extract the relevant information, and integrate it into a reasoning chain. The validation directory structure (as documented in MemEvolve) shows these files stored alongside `metadata.jsonl`:

```
./data/gaia/validation/
  ├── metadata.jsonl
  ├── 076c8171-9b3b-49b9-a477-244d2a532826.xlsx
  ├── 1f975693-876d-457b-a649-393859e79bf3.mp3
  └── ...
```

## Why It Matters

Most LLM benchmarks test what a model knows, not what it can do. GAIA tests tool-augmented task completion against real-world friction: finding information that changes, parsing files in varied formats, and handling ambiguous intermediate steps. Human performance on GAIA sits around 92% on Level 1 tasks and drops to roughly 45% on Level 3, which gives the benchmark meaningful range — it is hard enough that current frontier systems do not saturate it.

GAIA appears across agent framework evaluations as a standard stress test. EvoAgentX reports up to 20% improvement on GAIA from workflow optimization (self-reported, comparing optimized vs. unoptimized configurations — not against other frameworks). MemEvolve uses GAIA as one of three primary evaluation datasets alongside WebWalkerQA and xBench. The benchmark's consistent appearance in agent-architecture papers makes it a de facto standard for this class of system, comparable to [SWE-bench](../projects/swe-bench.md) in the software engineering agent domain.

## Core Mechanism

Tasks arrive as natural language questions, sometimes with an attached file. The agent must plan a sequence of actions — web search, document parsing, computation — and return a string answer that matches ground truth exactly (or within a normalized comparison). There is no partial credit.

This format creates sharp requirements for agents:

1. **Tool selection:** Knowing when to search vs. parse vs. calculate.
2. **Multi-step chaining:** Storing intermediate results and using them in subsequent steps.
3. **File handling:** Parsing audio transcripts, reading spreadsheet cells, interpreting images.
4. **Answer formatting:** Returning exactly the expected string, which penalizes verbose or hedged outputs.

The benchmark directly exercises [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) pipelines, [ReAct](../concepts/react.md)-style reasoning loops, [Chain-of-Thought](../concepts/chain-of-thought.md) decomposition, and [Agent Skills](../concepts/agent-skills.md) involving tool use. Agents that fail tend to fail in one of three ways: wrong tool selected, correct information retrieved but reasoning breaks, or correct reasoning but wrong answer format.

## Strengths

**Deterministic scoring.** Ground-truth answers are strings, numbers, or dates. There is no rubric disagreement, no [LLM-as-Judge](../concepts/llm-as-judge.md) variance, no inter-annotator ambiguity. A score on GAIA means something concrete.

**Real-world task distribution.** Tasks come from actual assistant use cases rather than adversarially constructed puzzles. This makes GAIA scores more predictive of deployed agent performance than synthetic benchmarks.

**File modality coverage.** Most agent benchmarks are text-only. GAIA's inclusion of audio, spreadsheets, and images forces evaluation of multi-modal tool pipelines.

**Tiered difficulty.** Three levels let you characterize a system's capability profile rather than getting a single aggregate number that mixes easy and hard tasks.

**Reproducibility practices.** The community has converged on specific dataset versions (commit hashes) for comparability, as MemEvolve's documentation illustrates.

## Critical Limitations

**Concrete failure mode — answer format brittleness:** Exact-match scoring means an agent that correctly identifies the answer but returns "approximately 42" instead of "42" scores zero. This penalizes systems that hedge appropriately and rewards systems that are confidently terse, regardless of whether the confidence is warranted. Agents optimized for GAIA learn to strip uncertainty from outputs, which is not necessarily the behavior you want in deployment.

**Unspoken infrastructure assumption:** Running GAIA at meaningful scale assumes access to live web search. Many Level 2 and Level 3 tasks cannot be answered from a model's parametric knowledge alone — they require real-time retrieval. Agents without search tool access score far below their actual reasoning capability. Evaluations that disable search (for cost or reproducibility) measure a different capability than the benchmark intends.

## When NOT to Use It

Do not use GAIA as your primary evaluation if:

- **Your agent does not use external tools.** GAIA discriminates between tool-augmented systems. A pure language model without retrieval will fail Level 2+ tasks regardless of reasoning quality. You will be measuring tool access, not your target capability.
- **You need latency or cost benchmarks.** GAIA measures accuracy only. A system that gets 80% correct in 30 seconds and one that gets 80% correct in 3 minutes score identically. If task completion speed or API cost matters for your use case, you need additional instrumentation.
- **Your tasks are domain-specific.** GAIA questions are general knowledge and web-retrievable. If you are evaluating agents for legal document review, medical coding, or financial analysis, GAIA scores will not predict domain performance.
- **You want to evaluate multi-agent coordination specifically.** GAIA is a single-agent benchmark. It exercises [Multi-Agent Systems](../concepts/multi-agent-systems.md) indirectly only when you happen to build a multi-agent system to answer it.

## Unresolved Questions

**Leaderboard contamination.** The validation set is public with labels. Systems trained or fine-tuned after GAIA's release may have seen validation examples during training, especially via web crawl. There is no mechanism to detect this, and the benchmark has no stated contamination policy.

**Label stability.** Some GAIA answers involve facts that change over time (prices, rankings, record holders). The benchmark does not specify an answer-validity date. A task asking for the current holder of a record may have a different correct answer in 2025 than in 2023. This is particularly relevant for Level 1 tasks that look like search queries.

**Cost at scale.** Running a full agent on 165 validation tasks (approximate size) with web search, file parsing, and multi-step reasoning can cost $10-100 per run depending on model and task mix. The benchmark does not address this, and frameworks like EvoAgentX that run GAIA during optimization loops compound this cost significantly.

**Level boundary definitions.** The paper describes the three levels conceptually but does not publish the annotation rubric used to assign tasks to levels. Practitioners cannot predict which level a new task would fall into, limiting the benchmark's use for targeted capability development.

## Benchmarks and Numbers

Published agent scores on GAIA (validation set, as of mid-2025, self-reported by respective framework papers):

- **Human performance:** ~92% Level 1, ~82% Level 2, ~45% Level 3
- **EvoAgentX (optimized):** Up to 20% improvement over unoptimized baseline — absolute scores not published in available materials (self-reported, not independently validated)
- **GPT-4 class systems without optimization:** Generally in the 30-50% range on Level 2 tasks in agent configurations, based on leaderboard trends

The leaderboard at Hugging Face is the authoritative source for current scores, but it mixes self-reported submissions without standardized infrastructure requirements (e.g., whether web search was live or cached).

## Alternatives

| Benchmark | Use instead when |
|-----------|-----------------|
| [SWE-bench](../projects/swe-bench.md) | Evaluating software engineering agents specifically; more rigorous infrastructure standardization |
| [HotpotQA](../projects/hotpotqa.md) | Testing multi-hop reading comprehension without tool use; reproducible offline evaluation |
| [HumanEval](../projects/humaneval.md) | Evaluating code generation capability in isolation |
| [AppWorld](../projects/appworld.md) | Evaluating agents on structured app-based tasks with controlled environments |
| [Tau-bench](../projects/tau-bench.md) | Evaluating tool-augmented agents in customer service or structured task settings |
| [LongMemEval](../projects/longmemeval.md) | Evaluating cross-session memory and temporal reasoning specifically |

GAIA is the right choice when you want a general-purpose, deterministically scored benchmark for tool-augmented assistants that reflects realistic task variety. It is the wrong choice when you need reproducible offline evaluation, domain specificity, or any measurement beyond accuracy.


## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.4)

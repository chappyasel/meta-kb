---
entity_id: locomo-bench
type: project
bucket: agent-systems
abstract: >-
  A curated collection of benchmarks (HumanEval, SWE-Bench, GAIA, WebArena,
  OSWorld, AppWorld) used to measure LLM agent capability across coding, web
  navigation, OS control, and multi-app task completion.
sources:
  - repos/vectorspacelab-general-agentic-memory.md
  - repos/bytedtsinghua-sia-memagent.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/volcengine-openviking.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - reflexion
  - hotpotqa
  - openai
  - react
last_compiled: '2026-04-06T02:17:20.270Z'
---
# Agent Task Benchmarks

## What It Is

Agent task benchmarks are standardized evaluation suites that measure whether LLM-powered agents can complete real-world tasks, not just generate plausible text. Each benchmark defines a task distribution, an environment, a success criterion, and (usually) a reference score from human performance or prior systems.

The major benchmarks in active use span five categories: coding, software engineering, general reasoning, web navigation, and OS/app control. They are the primary mechanism by which the field tracks whether improvements to agent architecture, memory, context engineering, or self-improvement actually transfer to measurable capability.

## The Major Benchmarks

### HumanEval

**What it tests:** Code generation. The model receives a Python function signature and docstring, generates an implementation, and the result is checked against unit tests.

**Key number:** 164 hand-crafted programming problems. GPT-4 baseline: ~80% pass@1. [Reflexion](../concepts/reflexion.md) achieved 91% pass@1 using verbal self-reflection and self-generated unit tests.

**Credibility:** Pass@1 scores are computed against the provided test suite, making them mechanically verifiable. Scores are self-reported but the evaluation is deterministic.

**Limitation:** HumanEval tests isolated function completion, not multi-file software engineering. A model can score well here while failing catastrophically on [SWE-Bench](../projects/swe-bench.md). The test suite has also leaked into training data for most large models, inflating scores relative to the benchmark's original intent.

---

### SWE-Bench

**What it tests:** Real GitHub issue resolution. The agent receives an issue description and a codebase, and must produce a patch that makes failing tests pass without breaking passing ones.

**Key numbers:** SWE-Bench Verified (a curated subset) has become the standard target. SICA (Self-Improving Coding Agent) improved from 17% to 53% on the 50-problem subset across 14 self-modification iterations.

**Credibility:** Evaluation is automatic (test pass/fail), but the 50-problem subset used in research papers is small enough that variance is significant. Full SWE-Bench results are more reliable. Scores are generally self-reported by system authors.

**Limitation:** Performance is heavily sensitive to which LLM powers the agent. Results reported on Claude Sonnet may not transfer to GPT-4o. Also, SWE-Bench Verified removed ambiguous issues from the original dataset, making scores on the two datasets incomparable.

**Related:** [SWE-Bench](../projects/swe-bench.md)

---

### GAIA

**What it tests:** General AI assistant capability on real-world tasks requiring web search, file reading, tool use, and multi-step reasoning. Tasks are stratified by difficulty (Level 1–3).

**Key numbers:** Humans score ~92% overall. GPT-4 with plugins scored ~15% at initial release. Recent frontier models with tool use are approaching 50–60% on Level 1.

**Credibility:** GAIA answers were verified by human annotators, and the test set is held out from public release (preventing training contamination). This is one of the more credible benchmarks in the space because the held-out test set is evaluated by the benchmark maintainers, not by submitters.

**Limitation:** The Level 3 tasks may require specific factual knowledge that changes over time (prices, current events), making longitudinal comparison unreliable.

**Related:** [GAIA](../projects/gaia.md)

---

### WebArena

**What it tests:** Web navigation. The agent interacts with realistic, locally-hosted websites (GitLab, shopping, Reddit-style forums) to complete tasks like "find the most popular post from last week" or "create an issue on this repository."

**Key numbers:** Human performance: ~78% success rate. Initial reported agent performance: 14% (GPT-4 + prompting). Recent systems with better tool use and planning: 30–45%.

**Credibility:** The environment is self-hosted and deterministic, making evaluation reproducible. Scores are self-reported. The gap between 78% human and ~40% agent performance accurately reflects the difficulty of multi-step web interaction.

**Limitation:** The locally-hosted environment diverges from real websites over time. Agents that learn to exploit specific UI quirks of the benchmark's version of GitLab may not generalize to production GitLab.

---

### OSWorld

**What it tests:** Computer control. The agent operates a real desktop OS (Ubuntu, Windows, macOS) via screenshots and input events to complete tasks like "open this PDF, find the table on page 3, copy the second column into a spreadsheet."

**Key numbers:** Human success rate: ~72%. Initial GPT-4V agent: ~12%. Current frontier: ~25–35%.

**Credibility:** Evaluation runs inside real VMs with scripted success checkers. This is one of the harder benchmarks to game because task completion is verified by examining actual OS state, not model output. Scores remain self-reported.

**Limitation:** Screenshot-based evaluation is slow and expensive. Running a full eval suite can take days. This creates pressure to report on subsets, reducing statistical reliability.

---

### AppWorld

**What it tests:** Multi-app task completion. The agent must coordinate across multiple simulated applications (email, calendar, files, e-commerce) to complete realistic workflows like "schedule a meeting based on this email thread and book the attached flight."

**Key numbers:** Human success rate: ~80–85%. Frontier agents: 30–45% depending on task complexity and agent design.

**Credibility:** AppWorld uses a programmatic evaluation environment with defined success states, making scoring reproducible. However, the benchmark is maintained by a research group, and independent third-party evaluation is limited.

**Limitation:** The simulated apps diverge from real-world app behavior. Success on AppWorld does not guarantee success on actual Gmail, Google Calendar, or Kayak.

**Related:** [AppWorld](../projects/appworld.md)

---

### HotpotQA

**What it tests:** Multi-hop reading comprehension. Given a question and retrieved Wikipedia paragraphs, the agent must identify supporting facts and reason across multiple documents to reach an answer.

**Key numbers:** Human performance: ~91% F1. State-of-the-art models: ~80% F1.

**Credibility:** Widely cited, independently replicated scores. One of the older benchmarks; most training datasets now include HotpotQA, so contemporary scores reflect memorization risk.

**Limitation:** HotpotQA tests reasoning within a closed set of provided documents, not open-domain retrieval. Systems that retrieve different documents than the benchmark provides may fail for reasons unrelated to reasoning capability.

**Related:** [HotpotQA](../projects/hotpotqa.md)

---

## What Benchmarks Measure (and What They Don't)

### The capability vs. infrastructure gap

All benchmarks measure task success under specific infrastructure conditions: a given LLM, a given tool set, a given number of allowed actions. A benchmark score is a property of the full system, not the agent architecture alone. Swapping the base model often changes scores more than any architectural improvement.

This creates a fundamental interpretation problem: when a paper reports that "our agent framework improves WebArena from 30% to 38%," it is reporting a delta measured with a specific LLM under specific conditions. The same framework with a different LLM, or the same LLM after a provider update, may show a different delta.

### Self-reported vs. independently validated

Most benchmark scores in the literature are self-reported. The exceptions are benchmarks with held-out test sets evaluated by independent maintainers (GAIA uses this model). For benchmarks where researchers evaluate their own systems on public test sets, scores should be read with caution, particularly when the authors also trained or fine-tuned on related data.

### The contamination problem

Training data contamination affects all benchmarks over time. HumanEval and HotpotQA are now almost certainly present in the pretraining data of most frontier models. GAIA's held-out test design partially addresses this; WebArena and OSWorld's dynamic environments are more resistant because they test interaction, not recall.

---

## Benchmark Selection Guidance

| If you want to measure... | Use... |
|---|---|
| Isolated function-level coding | HumanEval |
| Real codebase modification | SWE-Bench Verified |
| General tool use and reasoning | GAIA |
| Web navigation and form interaction | WebArena |
| Desktop computer control | OSWorld |
| Cross-app workflow coordination | AppWorld |
| Multi-hop document reasoning | HotpotQA |

---

## Limitations of Benchmarks as a Category

**Goodhart's Law applies.** Once a benchmark becomes the target, systems are optimized for that benchmark specifically. An agent that scores 53% on SWE-Bench may achieve that through strategies (patch generation patterns, test manipulation) that do not generalize to real developer workflows.

**Human performance ceilings are misleading.** Human scores on most benchmarks are measured under artificial conditions (time limits, no tool access, unfamiliar interfaces). A "human performance" of 78% on WebArena does not mean that humans can only complete 78% of web tasks in real life.

**Success criteria are reductive.** AppWorld checks whether the final application state matches a reference state. It cannot detect whether the agent took a brittle, unrepeatable path to get there. A human would notice; the benchmark does not.

**Benchmarks lag practice.** The tasks on HumanEval were current in 2021. OSWorld tasks were current in 2023. Frontier agent capability has moved faster than the benchmark tasks, making top-scoring agents look near-human on benchmarks while still failing on tasks that matter in production.

---

## Relationship to Agent Architecture

Benchmarks are what make architectural claims falsifiable. [Reflexion](../concepts/reflexion.md)'s verbal self-reflection mechanism gained credibility because it moved HumanEval pass@1 from 80% to 91% and AlfWorld from ~80% to 97%. Without HumanEval and AlfWorld as shared reference points, "verbal self-reflection improves agent performance" would be an unfalsifiable claim.

Similarly, [self-improving agents](../concepts/self-improving-agents.md) like SICA justify their architecture by pointing to SWE-Bench trajectories across iterations. [ReAct](../concepts/react.md)'s interleaved reasoning and action loop was validated against HotpotQA and FEVER. [Chain-of-Thought](../concepts/chain-of-thought.md) prompting was validated against arithmetic and commonsense reasoning benchmarks before anyone took it seriously.

The benchmarks listed here are not just evaluation tools. They are the shared language through which agent architecture claims become credible or not.

---

## Unresolved Questions

**Cross-benchmark generalization.** A system that improves on SWE-Bench through architectural changes sometimes regresses on WebArena. There is no established framework for predicting cross-benchmark transfer.

**Dynamic benchmark maintenance.** Most benchmarks are static artifacts. OSWorld and WebArena are semi-maintained, but task sets are not regularly updated. No benchmark currently tracks capability on tasks that have emerged in the last 12 months.

**Cost-controlled evaluation.** No major benchmark reports results under a fixed inference budget. A system that calls GPT-4 50 times per task and a system that calls it twice are scored identically if both succeed. This makes benchmark scores uninformative about production viability.

**Multi-agent benchmark coverage.** There is no widely adopted benchmark for multi-agent systems operating in coordination. [Agent orchestration](../concepts/agent-orchestration.md) is a major active research area with no agreed evaluation standard.

---

## Alternatives

- **FinanceBench** -- For domain-specific document Q&A (financial filings). More reliable than general benchmarks for testing [RAG](../concepts/rag.md) and [context engineering](../concepts/context-engineering.md) systems on structured professional documents.
- **LongMemEval / LoCoMo** -- For testing [agent memory](../concepts/agent-memory.md) systems specifically. See [LongMemEval](../projects/longmemeval.md) and [LoCoMo](../projects/locomo.md).
- **LiveCodeBench** -- For coding evaluation with lower contamination risk, since it draws from recent competitive programming problems posted after common training cutoffs.

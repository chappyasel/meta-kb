---
entity_id: prompt-optimization
type: approach
bucket: self-improving
abstract: >-
  Prompt optimization automates improvement of LLM prompts and agent harnesses
  through search, gradient-based methods, or LLM feedback—distinguished from
  manual prompt engineering by treating prompts as learnable parameters in a
  closed optimization loop.
sources:
  - repos/canvas-org-meta-agent.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
related:
  - agent-harness
  - termination-bench
  - claude
last_compiled: '2026-04-08T03:00:51.269Z'
---
# Prompt Optimization

## What It Is

Prompt optimization covers automated methods for improving the instructions, context, and control logic fed to LLMs. The goal: replace manual trial-and-error with a systematic search process that finds prompts producing better outputs on measurable tasks.

The field spans a wide range of approaches. At the narrow end, text-level optimizers rewrite system prompts word by word. At the broad end, systems like Meta-Harness optimize entire agent harnesses—the code that controls what information reaches a model, how retrieval works, and how outputs are processed. This distinction matters: text optimizers and harness optimizers operate on fundamentally different search spaces.

---

## Why It Matters

Prompt quality has an outsized effect on agent behavior. On TerminalBench-2, the same Claude Haiku 4.5 model scores 27.5% with a vanilla harness and 35.5% with the best hand-engineered one—a 29% relative improvement with no weight updates. [Meta-Harness](../deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md) extends this further, reaching 37.6% through automated harness search.

This suggests that much of what practitioners attribute to model capability is actually harness sensitivity. Automated optimization recaptures that gap systematically.

---

## Core Approaches

### Text-Level Optimization

These methods treat the prompt as a string to be rewritten. They include:

- **Gradient-based methods (soft prompts):** Optimize continuous prompt embeddings via backpropagation. Requires model access and produces non-human-readable outputs. Works for fine-tuning scenarios; impractical for black-box API use.
- **LLM-as-optimizer (APE, OPRO, DSPy):** A meta-LLM proposes prompt rewrites based on task performance. [DSPy](../projects/dspy.md) formalizes this: programs declare what inputs/outputs they need, and the compiler fills in prompt text and few-shot examples. The optimizer sees scores and generates candidates; it does not see raw execution traces.
- **GEPA (Genetic-Pareto Evolution):** Combines genetic algorithms with LLM reflection. Samples agent trajectories, reflects on failures in natural language, proposes revisions, and evolves the population using Pareto selection across multiple metrics. A single run on the OpenAI cookbook's healthcare summarization task improved the prompt from generic instructions to 500-word, domain-aware specifications with exact chemical naming rules. [Source](../articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

### Harness-Level Optimization

Rather than rewriting prompt text, these methods modify the code surrounding the model—retrieval logic, routing decisions, memory management, stop conditions, and tool configurations.

**Meta-Harness** [Source](../deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md) is the clearest implementation. It runs an outer loop where a coding agent (Claude Code with Opus 4.6) reads a filesystem containing all prior harness candidates, their scores, and full execution traces—then proposes new harness code. The optimizer processes roughly 10 million tokens per iteration, three orders of magnitude more than typical text optimizers.

The key ablation: accuracy with scores only was 34.6%; scores plus compressed summaries was 34.9%; full filesystem access reached 50.0%. Summaries destroy the causal signal. The optimizer needs raw failures—exact prompts constructed, retrieval results returned, specific examples where the system broke—to form causal hypotheses and avoid repeating the same mistakes.

On tau-bench v3 airline, the meta-agent library [Source](../repos/canvas-org-meta-agent.md) improved holdout accuracy from 67% to 87% using an LLM judge to score unlabeled production traces, with a small labeled holdout set to validate whether to keep each update.

### Feedback Signal Variants

| Signal type | Example | Tradeoff |
|---|---|---|
| Hard labels | Pass/fail test cases | Most reliable; requires labeled data |
| LLM-as-judge | Score model on rubric | Enables unlabeled production traces; introduces evaluator bias |
| Human feedback | Thumbs up/down + comments | High quality; expensive and slow |
| Execution traces | Raw agent outputs + failures | Richest signal; expensive to process |

---

## How Harness Optimization Works: Concrete Mechanics

The meta-agent outer loop from [canvas-org/meta-agent](../repos/canvas-org-meta-agent.md) illustrates the production-ready version:

1. **Read:** Collect traces from the running agent.
2. **Judge:** Score unlabeled traces with an LLM judge producing natural-language critiques ("the agent refunded without checking the cancellation policy").
3. **Propose:** Read failed traces, identify a recurring pattern, write one targeted harness update. The optimizer modifies system prompts, lifecycle hooks, stop conditions, tool definitions, or subagent configurations—one change at a time.
4. **Validate:** Evaluate the new harness on a small labeled holdout. Keep the update only if holdout accuracy improves.
5. **Repeat:** Iterate with the updated harness.

All candidates, scores, and traces persist to a filesystem. This gives the proposer persistent memory—it can search what was tried, what failed, and which changes actually improved performance before proposing the next change.

The proposer tends to overfit early. The canvas team found a simple fix: "State your change as a rule about agent behavior. If you can only justify it by pointing to specific traces, it's too narrow."

---

## Discovered Patterns Worth Knowing

Meta-Harness's search process discovered several reusable harness designs that are directly applicable as engineering patterns:

**Draft-verification retrieval:** Retrieve 5 similar examples for a draft prediction, then retrieve confirmers and challengers conditioned on the draft label. The two-stage structure costs less than naive few-shot (5.4K tokens) while achieving competitive accuracy.

**Subject-specific routing:** Classify inputs, route to specialized retrieval policies per category. For IMO-level math: Combinatorics uses BM25@20 with deduplication; Geometry uses 1 hard reference + 2 BM25 neighbors; Number Theory uses BM25@12 with technique-early reranking bonus.

**Environment bootstrapping:** Before the agent loop, inject a snapshot of the runtime environment—available OS tools, language versions, package managers, memory state. Eliminates 3-5 wasted turns on dependency exploration in coding tasks.

These are transferable. You can implement them without running the optimizer.

---

## Key Numbers

- Meta-Harness vs ACE on text classification: +7.7 points with 4x fewer context tokens. [Source](../deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md) — Self-reported; no independent replication.
- Meta-Harness matches competitors' final accuracy within 4 evaluations vs their full search budget.
- Full trace access vs. summaries: 50.0 vs 34.9 median accuracy (ablation). Self-reported.
- meta-agent on tau-bench v3 airline: 67% → 87% holdout accuracy. [Source](../repos/canvas-org-meta-agent.md) — Single run, small split (35 search / 15 holdout tasks). Treat as directional, not definitive.

---

## Strengths

**Automatically discovers non-obvious patterns.** The subject-specific math router and the draft-verification pattern emerged from search, not human insight. Harnesses often contain implicit structure that manual engineering misses.

**Works with unlabeled production data.** LLM-judge-based search removes the requirement for ground-truth labels, which most production agents lack. The meta-agent demonstrated this works on tau-bench; the judge-based run outperformed the labeled-search variant in that experiment.

**Persistent memory enables causal reasoning.** When the proposer can see the full history—what was tried, why it failed, what improved—it moves from trial-and-error to systematic diagnosis. The TerminalBench example showed the proposer correctly diagnosing that bundled structural and prompt changes caused regressions, then isolating them.

**Separates optimization from deployment.** Run optimization offline with a strong proposer model (Opus-class); deploy the discovered harness with a cheaper model.

---

## Limitations

**Proposer model dependency.** All strong results use Claude Opus 4.6 or equivalent as the proposer. Results with weaker models are unknown. The causal reasoning observed in the TerminalBench example requires a capable reasoning model; smaller models likely produce noisier proposals.

**Cost.** Processing ~10 million tokens per iteration is not cheap. For production systems with many tasks, the optimization budget must be explicitly planned.

**Single-run results on small benchmarks.** The tau-bench 67%→87% result is one run on 15 holdout tasks. Variance estimates are absent. Take these numbers as directional signals, not certified benchmarks.

**LLM judge quality limits optimization quality.** The judge introduces its own failure modes. If the judge scores a bad output as good, the optimizer will keep a broken harness. The meta-agent mitigates this with a labeled holdout for final validation, but the search direction still depends on judge quality.

**Overfitting.** The TerminalBench harness was optimized and evaluated on the same 89 tasks. Discovered changes may be specific to that task distribution.

---

## Concrete Failure Mode

A proposer repeatedly observes traces where the agent exits early on a task. It adds a stop condition to prevent early exit. The agent now stays active longer—but hallucinates answers rather than using tools. Holdout accuracy drops. This is the pattern the meta-agent team documented: fixing the specific symptom visible in traces created a different failure. Their mitigation was the behavioral-rule prompt ("state your change as a rule about agent behavior"), which reduced trace-specific overfitting.

The underlying issue: the proposer optimizes for the failure pattern it sees, not the latent behavior it should fix.

---

## Infrastructure Assumption

Harness optimization assumes you can run the full agent evaluation pipeline repeatedly and cheaply. This works for benchmark tasks with deterministic verifiers. Production agents with expensive, stateful, or irreversible actions (booking systems, file writes, external API calls) cannot run hundreds of evaluation trials without either mocking the environment or accepting real side effects. The meta-agent sidesteps this partially by using an LLM judge on production traces rather than running new evaluations—but this only works if the production system is already generating traces at volume.

---

## When Not to Use It

- **Single-task systems with few evaluations.** If you can only run 10-20 evaluations, the search budget is too thin for harness-level optimization. Manual prompt engineering is faster.
- **No measurable output.** Prompt optimization requires a signal to optimize against. Creative generation, open-ended conversation, and tasks with no ground truth resist automated optimization.
- **Stateful or irreversible actions.** If each evaluation run has real side effects, the iteration cost is prohibitive.
- **When the bottleneck is model capability, not prompting.** If the model fundamentally lacks the knowledge or reasoning to solve the task, better prompts will not close the gap. Distinguish between "model can do this inconsistently" (optimization helps) and "model cannot do this" (optimization does not help).

---

## Unresolved Questions

**How much does proposer quality determine outcome quality?** The ablations compare trace access levels but not proposer models. A weaker proposer with full traces may perform worse than a stronger proposer with summaries. This tradeoff is unexplored.

**How do discovered harnesses transfer across model families?** Meta-Harness evaluated on 5 held-out models; the math harness showed gains on all five. But all were OpenAI and Gemini models. Transfer to models with different tokenization, attention patterns, or instruction-following behavior is unknown.

**How do you handle harness regressions in production?** The meta-agent validates on a holdout before keeping a change. But holdout sets are small. The canvas team's `VersionedPrompt` class enables rollback—but the governance question of who decides to roll back, and when, is left to the implementer.

**Cost at scale.** The ~10M token/iteration figure applies to the Meta-Harness experiments. For production agents with longer traces and larger task sets, this scales further. At what point does the optimization cost exceed the value of the discovered harness?

---

## Alternatives and Selection Guidance

| Use when | Approach |
|---|---|
| Black-box API, want readable prompts, small search budget | [DSPy](../projects/dspy.md) |
| Want systematic multi-objective evolution with natural-language reflection | [GEPA](../concepts/gepa.md) |
| Production unlabeled traces, want continuous improvement | meta-agent (canvas-org) |
| Optimizing full agent harness code, have labeled benchmark | Meta-Harness |
| Want LLM-assisted self-improvement at the agent architecture level | [Self-Improving Agents](../concepts/self-improving-agents.md) |
| Want structured search over agent workflows | [AFlow](../projects/aflow.md) |

[DSPy](../projects/dspy.md) is the right default for teams that want structured, auditable prompt compilation without building their own optimization loop. Meta-Harness and meta-agent are better fits when the prompt alone is not the bottleneck and you need to optimize retrieval logic, tool use, and agent control flow together.

---

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md) — broader category of systems that modify their own behavior
- [Agent Harness](../concepts/agent-harness.md) — the code structure that prompt optimization operates on
- [LLM-as-Judge](../concepts/llm-as-judge.md) — the evaluation mechanism enabling unlabeled optimization
- [Execution Traces](../concepts/execution-traces.md) — the diagnostic signal that distinguishes harness optimization from text optimization
- [GEPA](../concepts/gepa.md) — genetic-pareto evolution applied to prompt optimization
- [Context Engineering](../concepts/context-engineering.md) — the manual practice that prompt optimization automates
- [DSPy](../projects/dspy.md) — the leading framework for structured prompt compilation

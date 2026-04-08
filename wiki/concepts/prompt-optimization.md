---
entity_id: prompt-optimization
type: approach
bucket: self-improving
abstract: >-
  Prompt optimization automates the improvement of LLM prompts and agent harness
  configurations through iterative search over code and text, using execution
  traces and evaluation signals as feedback — distinguished from manual prompt
  engineering by treating prompts as learnable parameters.
sources:
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - repos/canvas-org-meta-agent.md
related:
  - claude
  - agent-harness
  - termination-bench
last_compiled: '2026-04-08T23:18:13.887Z'
---
# Prompt Optimization

## What It Is

Prompt optimization is the practice of treating prompts and agent harness configurations as learnable parameters and searching for better versions through automated feedback loops. The search target ranges from a single system prompt string to the entire codebase controlling how an agent retrieves information, constructs context, manages memory, and routes between tools.

The distinction that matters: prompt optimization targets the *interface* between a fixed model and its task, not model weights. You cannot fine-tune a closed API model, but you can change what that model sees. Prompt optimization makes that change systematic rather than manual.

Three implementation strata have emerged:

1. **Text-level optimization**: modify prompt strings directly; search space is natural language
2. **Harness-level optimization**: modify the code that constructs prompts, retrieves context, and manages state; search space is Python (or equivalent)
3. **Continuous production optimization**: run optimization loops against live agent traces using LLM judges as surrogate evaluators

Each level subsumes the previous. Harness optimization can discover the same prompt edits text optimization finds, plus structural changes text optimizers cannot express.

## Why It Matters

Hand-engineered harnesses create up to 6x performance gaps on the same benchmark with the same model ([Meta-Harness paper](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)). On TerminalBench-2, a vanilla Claude Code agent running Claude Haiku 4.5 scores 27.5%; the best hand-engineered harness on the same model reaches 35.5% — a 29% relative improvement with no fine-tuning. Automated harness search then pushes that to 37.6%.

This means harness engineering is as impactful as model selection, yet it remains largely manual. Prompt optimization is the field's attempt to automate that investment.

## Core Mechanisms

### Text-Level Optimization

The simplest approach: treat the prompt as a string, generate candidate variants, evaluate them on a held-out set, and keep improvements. Implementations differ in how candidates are generated:

- **Gradient-free sampling**: ask a language model to rewrite the prompt given feedback on failures
- **Evolutionary methods**: maintain a population of prompt candidates, apply mutation and selection
- **[GEPA](../concepts/gepa.md)** (Genetic-Pareto): samples agent trajectories, reflects on them in natural language, proposes revisions, and uses Pareto-front selection across multiple objectives simultaneously — [Source](../raw/articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md)

Text optimizers share a structural limitation: they operate with compressed feedback. Most pass the previous prompt, a score, and a brief error summary to the optimizer. The optimizer cannot see *why* a specific trace failed.

### Harness-Level Optimization

[Meta-Harness](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md) generalizes the target from prompt strings to harness code — everything that controls what the model sees. The outer loop:

1. A proposer agent (Claude Code with Opus-4.6) reads a filesystem containing every prior harness candidate's source code, evaluation scores, and raw execution traces
2. The proposer generates k new harness variants based on inspection and failure hypotheses
3. New harnesses run on the evaluation set; results are stored to disk
4. The loop repeats for N iterations

The critical implementation detail is filesystem access to full execution traces — up to 10 million tokens per iteration, three orders of magnitude more than text optimizers use. The ablation is definitive:

| Access level | Median accuracy |
|---|---|
| Scores only | 34.6 |
| Scores + summaries | 34.9 |
| Full filesystem (Meta-Harness) | 50.0 |

Summaries add 0.3 points. Full traces add 15.4. Compressed feedback destroys the causal signal needed for systematic improvement.

The proposer exhibits genuine causal reasoning when it has access to full history. On TerminalBench-2, after five consecutive regressions from prompt changes, it explicitly diagnosed: "Root cause: Prompt template changes caused the agent to delete necessary state before task completion" and pivoted to purely additive modifications. This kind of strategy shift requires seeing *what failed* across multiple iterations, not just *that* scores dropped.

### Continuous Production Optimization

Both Meta-Harness and most text optimizers require labeled evaluation sets. Production agents typically run on unlabeled customer traces where ground-truth reward is sparse.

The `meta-agent` library ([Source](../raw/repos/canvas-org-meta-agent.md)) addresses this by substituting LLM judges for labels during the search phase while keeping a small labeled holdout set for validation:

1. Collect traces from the running agent
2. Score those traces with an LLM judge
3. Read failed traces, identify a recurring failure pattern, write one targeted harness update
4. Evaluate on the holdout set; keep the update only if holdout accuracy improves
5. Repeat

On tau-bench v3 airline (50 tasks), this approach improved holdout accuracy from 67% to 87% — notably higher than the 80% reached by a labeled-search variant in the same experiment. The paper attributes this to richer optimization signal: natural-language judge critiques like "the agent refunded without checking the cancellation policy" give the proposer more actionable information than binary pass/fail labels.

Results are single-run on a small benchmark split (self-reported, not independently validated). Treat the 67%→87% figure as directionally correct rather than precise.

## Patterns Discovered by Automated Search

Automated harness optimization has rediscovered and generalized several patterns worth knowing:

**Draft-verification retrieval** (text classification): retrieve 5 similar examples to generate a draft prediction, then retrieve confirmers and challengers conditioned on the draft label. Lower context cost than naive few-shot while achieving higher accuracy.

**Subject-specific routing** (math retrieval): classify the input by topic (combinatorics, geometry, number theory), then apply domain-tuned retrieval policies. Combinatorics uses BM25@20, deduplication, and reranking to top 3. Geometry uses 1 hard reference plus 2 BM25 neighbors. The router is discovered automatically; the per-topic tuning is too.

**Environment bootstrapping** (agentic coding): inject an environment snapshot before the agent loop begins — OS, available languages, package managers, memory state. Reduces 3–5 wasted exploration turns on dependency-heavy tasks. Trivially implementable and immediately transferable.

**Behavioral skill extraction** (conversational agents): move domain rules out of the system prompt and into a structured skill. When `meta-agent` optimized a tau-bench airline agent, the key accuracy jump came from extracting policy rules into a dedicated skill, then correcting factual errors in that skill in a subsequent iteration.

## Implementations

### [DSPy](../projects/dspy.md)

Compiles declarative LM programs by treating few-shot examples and instructions as learnable parameters. Uses bootstrapping to generate candidate demonstrations, then optimizes prompt structure and example selection. Strong for structured pipelines with defined input/output signatures. Less suited to free-form agentic tasks where the harness logic itself needs to change.

### Meta-Harness

Research system from Lee et al. (2026). Optimizes full harness code, not just prompt text. Requires Opus-4.6-class proposer and ~10M tokens per iteration. Best-in-class on TerminalBench-2 and text classification benchmarks. Not yet packaged as a library.

**Key numbers** (self-reported by paper authors):
- +7.7 points over ACE on text classification with 4x fewer context tokens
- +4.7 points on IMO-level math across 5 held-out models  
- #2 on TerminalBench-2 with Opus 4.6, #1 with Haiku 4.5

### meta-agent (canvas-org)

Open-source library, 20 stars, MIT license ([Source](../raw/repos/canvas-org-meta-agent.md)). Supports Claude Agent SDK currently. Implements continuous production optimization with LLM judge scoring. Stores candidates and traces on disk for persistent proposer memory. Structured as `meta_agent/outer_loop.py` (optimization loop), `meta_agent/eval_runner.py` (evaluation), with configs as Python files exporting `build_options(ctx) -> ClaudeAgentOptions`.

**Key numbers** (self-reported, single run):
- 67%→87% on tau-bench v3 airline with Haiku 4.5 / Opus 4.6 proposer
- Best harness found within 4–10 iterations

### [GEPA](../concepts/gepa.md)

Genetic-Pareto evolution for prompts. Uses reflective updates from both quantitative scores and textual feedback with explicit Pareto-front candidate selection. More structured search than single-objective text optimizers. OpenAI cookbook demonstrates integration with Evals API graders.

### OpenAI Evals Platform

UI-based prompt optimization. Upload dataset, generate outputs, annotate with thumbs-up/down and text feedback, click Optimize. Generates improved prompt automatically. Best for rapid iteration and initial benchmarking. Not programmable; cannot be integrated into a production feedback loop via API.

## Failure Modes

**Proposer overfitting to search traces.** When `meta-agent` ran early iterations, the proposer fixed the specific traces it observed rather than writing general behavioral rules — search accuracy improved while holdout degraded. The mitigation was explicit instruction: "State your change as a rule about agent behavior. If you can only justify it by pointing to specific traces, it's too narrow." This is not automatically avoided; it requires deliberate proposer prompting.

**Summary compression destroys causal signal.** Any system that compresses execution traces before passing them to the optimizer loses the information needed for causal diagnosis. The Meta-Harness ablation shows this is not a minor effect — the gap between compressed and full access is 15 accuracy points. Systems like [Reflexion](../concepts/reflexion.md) that use verbal self-reflection are operating in this compressed regime.

**Regression through coupled changes.** Meta-Harness's TerminalBench proposer spent five iterations regressing before diagnosing that it was bundling structural and prompt changes, making both changes undecipherable when they failed. Single-change-at-a-time discipline is important and not always enforced automatically.

**Held-out set size.** `meta-agent` uses 15 holdout tasks out of 50 total. Small holdout sets make the keep/discard decision noisy. A harness that improves on 15 tasks may not generalize.

**Infrastructure assumption (unspoken).** Harness-level optimization requires the agent's execution environment to be reproducible and isolated. Meta-Harness and `meta-agent` both assume that re-running a harness on the same benchmark tasks produces consistent enough results to compare scores. Production agents interacting with live APIs, databases, or stateful external services violate this assumption.

## When NOT to Use Prompt Optimization

**When you need to change model behavior, not interface behavior.** If your agent consistently fails because the underlying model lacks the capability to reason about your domain, optimizing the harness delays the real fix. Prompt optimization is ceiling-bounded by what the base model can do.

**When your evaluation set is too small to validate improvements.** With fewer than ~20 holdout tasks, score differences between harness candidates are statistically unreliable. Automated optimization will optimize toward noise.

**When iteration cost exceeds improvement value.** Meta-Harness costs ~10M tokens per iteration with an Opus-class proposer. For tasks where a 5-point accuracy improvement is worth $0.10 in production savings, a $50 optimization run does not pencil out. Use text-level optimization or manual iteration instead.

**When the task distribution is unstable.** Harness optimization finds solutions tuned to the current task distribution. If production inputs shift significantly after optimization, discovered harnesses may not transfer. Continuous production optimization (meta-agent style) partially addresses this but requires ongoing compute.

## Unresolved Questions

**How much does proposer model quality determine outcome?** All Meta-Harness experiments use Opus-4.6 as the proposer. The paper does not ablate proposer model choice. A Haiku-class proposer would cost 20x less per iteration but might lack the causal reasoning capability that produces the +15-point accuracy gain from full trace access.

**When does harness optimization converge, and how do you detect it?** Meta-Harness runs for a fixed N iterations. Neither the paper nor `meta-agent` provides a principled stopping criterion. Detecting convergence — distinguishing "no better harness exists" from "the proposer hasn't found it yet" — is an open problem.

**Governance for autonomous harness changes in production.** `meta-agent` proposes harness changes and validates on a holdout set, but the holdout set cannot cover all production scenarios. The system can make behavioral changes to a live agent without human review. The documentation does not address approval workflows, rollback triggers, or audit requirements. For regulated domains (the OpenAI cookbook explicitly targets pharmaceutical documentation), autonomous prompt changes may require human sign-off.

**Cost at scale.** A 10-iteration optimization run at 10M tokens/iteration costs roughly $150–300 at current Opus pricing. For agents handling thousands of distinct task types, per-type optimization is not economically viable. Multi-task harness generalization — finding a single harness that works well across many task distributions simultaneously — is identified as future work but not solved.

## Alternatives

**Use [DSPy](../projects/dspy.md) when** your pipeline has clearly defined input/output signatures and you want few-shot example optimization with a Python API. DSPy handles structured programs well but cannot rewrite arbitrary harness code.

**Use [GEPA](../concepts/gepa.md) when** you have multiple competing objectives (accuracy, cost, length, compliance) and want Pareto-aware selection. GEPA's reflective updates also produce better-generalized prompts than single-objective search in the OpenAI cookbook experiments.

**Use manual iteration + [LLM-as-Judge](../concepts/llm-as-judge.md) when** your evaluation set is small, your task is novel, or you want to understand *why* specific failures occur before automating the fix. Automated optimization can mask failure modes by finding workarounds rather than root-cause solutions.

**Use [Continual Learning](../concepts/continual-learning.md) approaches when** model behavior itself needs to change, not just the interface. Prompt optimization cannot teach a model new factual knowledge or new reasoning strategies — it can only route better to capabilities the model already has.

## Related Concepts

- [Agent Harness](../concepts/agent-harness.md): the artifact that prompt optimization searches over at the harness level
- [Self-Improving Agents](../concepts/self-improving-agents.md): broader category; prompt optimization is one mechanism
- [Context Engineering](../concepts/context-engineering.md): adjacent discipline focused on what information goes into context; harness optimization automates part of this
- [Execution Traces](../concepts/execution-traces.md): the primary feedback signal; full access is essential
- [LLM-as-Judge](../concepts/llm-as-judge.md): enables optimization on unlabeled production traces
- [GEPA](../concepts/gepa.md): specific evolutionary prompt optimization method
- [TerminalBench](../projects/termination-bench.md): benchmark where harness optimization results are reported
- [Claude](../projects/claude.md): primary model used as both optimizer proposer and optimization target in current implementations

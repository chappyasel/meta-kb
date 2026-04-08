---
entity_id: gepa
type: concept
bucket: self-improving
abstract: >-
  GEPA is a self-improving optimization framework that replaces scalar RL reward
  signals with full execution traces, letting a reflection LLM diagnose failure
  causes and propose targeted fixes 35x faster than gradient-based methods.
sources:
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/jmilinovich-goal-md.md
  - repos/greyhaven-ai-autocontext.md
related:
  - openai
  - anthropic
  - claude
  - reinforcement-learning
  - meta-agent
last_compiled: '2026-04-08T23:02:57.838Z'
---
# GEPA (Generative Evolutionary Prompt Architecture)

## What It Is

GEPA is a Python framework for evolving any text-representable artifact toward a measurable objective. The central mechanism: instead of collapsing execution results into a scalar reward (which discards all diagnostic information), GEPA captures full execution traces and feeds them to a reflection LLM that reads error messages, profiling data, and reasoning logs to understand *why* a candidate failed before proposing a fix. This "Actionable Side Information" (ASI) is GEPA's core contribution — the text-optimization analogue of a gradient.

Accepted as an Oral at ICLR 2026 (arxiv:2507.19457). Used in production at Shopify, Databricks, Dropbox, and OpenAI. Databricks reported 90x cost reduction: open-source models optimized with GEPA outperformed Claude Opus 4.1 on enterprise agent tasks.

The framework treats prompt optimization as a special case of the general problem "optimize any string-valued artifact against a measurable objective." CUDA kernels, SVGs, scheduling policies, agent architectures, and system prompts all go through the same engine.

## How It Works

### The Optimization Loop

The `GEPAEngine` (in `src/gepa/core/engine.py`) runs an evolutionary loop with five stages:

**1. Select** — A `CandidateSelector` samples from the Pareto frontier (the set of candidates each of which is best on at least one evaluation instance). Probability of selection is proportional to coverage, ensuring both exploitation of strong candidates and retention of specialists.

**2. Execute on Minibatch** — The `BatchSampler` draws a subset of training examples. The selected candidate runs through the adapter's `evaluate()` method with `capture_traces=True`. Every `oa.log()` call inside the evaluator appends to the execution trace.

**3. Reflect** — The `ReflectiveMutationProposer` (`src/gepa/proposer/reflective_mutation/reflective_mutation.py`) sends traces to a reflection LLM. The reflection LLM reads raw failures — specific inputs, actual outputs, error messages, latency data — and diagnoses the causal issue. It then proposes a targeted fix, not a random mutation.

**4. Mutate** — `propose_new_texts()` generates the new candidate based on the reflection. The `ReflectionComponentSelector` decides which components of a multi-part candidate to update. A custom proposer can be injected via `custom_candidate_proposer`.

**5. Accept** — The new candidate runs on the full validation set (or a policy-determined subset via `EvaluationPolicy`). If it is not dominated on the Pareto frontier, `GEPAState` adds it to the pool. The state tracks all candidates, per-example scores, parent lineage, and the current frontier.

An optional **Merge** step (`src/gepa/proposer/merge.py`) finds pairs of Pareto-optimal candidates that excel on different task subsets and share a common ancestor, then asks the LLM to combine their strengths. The `find_common_ancestor_pair()` function searches the parent lineage graph, filtering for pairs that diverged from the ancestor in complementary ways. This is not random crossover — it is targeted recombination guided by lineage structure.

### Actionable Side Information (ASI)

The evaluator logs diagnostic text via `oa.log()`:

```python
def evaluate(candidate: str) -> float:
    result = run_pipeline(candidate)
    oa.log(f"Input: {result.input}")
    oa.log(f"Output: {result.output}")
    oa.log(f"Error: {result.error}")
    oa.log(f"Latency: {result.latency_ms}ms")
    return result.score
```

The reflection LLM reads "TimeoutError when processing inputs with >500 tokens" and proposes "add a chunking strategy for long inputs." Compare this to RL, where the agent sees 0.3 and guesses what went wrong. ASI comes in four forms: open-ended text via `oa.log()`, structured key-value dictionaries, multi-objective per-dimension scores, and rendered images via `gepa.Image` for visual artifacts.

The ablation from the Meta-Harness paper [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md) independently confirms this principle: scores-only achieves 34.6% accuracy, scores plus summaries 34.9%, full trace access 50.0%. Compressed feedback destroys the causal signal. GEPA was designed around this finding.

### Pareto Frontier Management

`GEPAState` maintains a Pareto frontier across task subsets rather than tracking a single "best" candidate. A candidate A dominates B if A scores >= B on all tasks and strictly better on at least one. The frontier holds all non-dominated candidates. `ValsetEvaluation` stores per-example scores keyed by data ID, enabling precise dominance checking.

This prevents the common failure mode where a generalist improvement wipes out a specialist capability. The merge step exploits the frontier by finding complementary specialists to recombine.

### optimize_anything

The `optimize_anything` API extends beyond prompts to any text artifact:

```python
result = gepa.optimize_anything.optimize_anything(
    seed_candidate="...",
    evaluator=my_evaluator_fn,
    dataset=training_examples,
    valset=validation_examples,
    objective="Maximize accuracy on contact extraction",
)
```

Three unified modes: **single-task search** (optimize one artifact directly), **multi-task search** (solve related problems simultaneously, cross-transferring improvements), and **generalization** (optimize for transfer to unseen examples with explicit train/val split).

### gskill: Coding Agent Skills

The gskill pipeline applies GEPA to coding agents. It converts a GitHub repository into ~300 verifiable software engineering tasks via SWE-smith, then evolves agent skills through evaluation-reflection-update cycles. Skills start empty and become repository-specific rather than universal. Key results: Mini-SWE-Agent with gpt-5-mini improved from 55% to 82% on Jinja and 24% to 93% on Bleve. Skills transfer across models: Claude Haiku 4.5 using GEPA-evolved Bleve skills went from 79.3% to 98.3%, with execution time dropping from 173s to 142s. The cross-model transfer means you pay for optimization on cheap models and deploy on expensive ones.

## Key Numbers

All benchmarks below come from the GEPA paper (ICLR 2026 Oral) and confirmed production reports. Independent validation exists from Arize AI and Databricks case studies.

| Metric | Result |
|--------|--------|
| Speed vs RL (GRPO) | 35x fewer evaluations (100–500 vs 5,000–25,000+) |
| vs GRPO average | +6%, up to +20% on specific tasks |
| vs MIPROv2 | +10% accuracy, +12% on AIME-2025 |
| Databricks cost reduction | 90x (open-source + GEPA vs Claude Opus 4.1) |
| ARC-AGI via architecture discovery | 32.5% → 89.5% |
| MATH via DSPy full program optimization | 67% → 93% |
| AIME 2025 (GPT-4.1 Mini) | 46.67% → 60.00% |
| KernelBench (CUDA kernels) | 87% match/beat hand-tuned; 25% achieve 20%+ speedup |
| Pydantic contact extraction | 86.88% → 96.88% |

The 35x sample efficiency claim is supported by the formal convergence analysis in the paper. Production use at Shopify, Databricks, Dropbox, and OpenAI corroborates the efficiency gains, though exact figures vary by task.

## Integrations

**DSPy** — Available as `dspy.GEPA`. The DSPy Full Program Adapter evolves entire programs including signatures, modules, and control flow (67% → 93% on MATH). [DSPy](../projects/dspy.md) users get GEPA as a drop-in optimizer.

**Pydantic AI** — Uses `Agent.override(instructions=...)` with context variables for thread-safe instruction replacement during optimization cycles. Pydantic Evals provides parallel test execution and per-field scoring. Logfire provides OpenTelemetry tracing for debugging unexpected optimization behavior.

**DeepEval** — Integration with Confident AI's evaluation framework for end-to-end prompt optimization within existing testing pipelines.

**ACE** — ACE's incremental delta mechanism [Source](../raw/deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md) is explicitly compared against GEPA in benchmarks. ACE achieves -82.3% adaptation latency and -75.1% rollout cost relative to GEPA on classification tasks, but GEPA finds stronger candidates; the two approaches optimize orthogonal things — ACE evolves the content of context, GEPA evolves the code that constructs it.

**Autocontext** — The Autocontext harness [Source](../raw/deep/repos/greyhaven-ai-autocontext.md) directly incorporates GEPA-inspired ASI tracking in `harness/optimizer/pareto.py`, maintaining a Pareto frontier across evaluation dimensions within its multi-agent improvement loop.

**Meta-Harness** — On text classification, Meta-Harness outperforms GEPA (50.0% vs 32.6% median accuracy) by accessing full harness code rather than just text artifacts. The comparison is instructive: GEPA optimizes text artifacts; Meta-Harness optimizes the code that constructs context. [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)

## Strengths

**Sample efficiency is real and documented.** The 35x speedup over GRPO is backed by formal analysis and independently corroborated. For tasks where evaluation is expensive (agent pipelines, code execution), this matters enormously.

**ASI makes reflection causal, not correlational.** When the reflection LLM reads "IndexError on line 42 when input has >500 tokens," it can propose a structural fix. Random mutation or scalar feedback cannot do this.

**Cross-model skill transfer works.** Skills evolved on gpt-5-mini transfer to Claude Haiku 4.5 with preserved or improved gains. This changes the economics: optimize on cheap models, deploy on expensive ones.

**Breadth of application is validated.** CUDA kernels, circle packing, scheduling policies, contact extraction, coding agents, and math proofs all go through the same engine. This is not a narrow prompt optimizer.

## Critical Limitations

**Concrete failure mode: reflection hallucination cascades.** When the evaluator's `oa.log()` calls are thin — returning only "failed" without context — the reflection LLM invents plausible-sounding diagnoses. A thin ASI trace like "score: 0.3" gives the reflection LLM nothing concrete to work with, so it generates confident-sounding but incorrect failure analyses. The resulting mutations target imaginary problems. There is no verification step between reflection output and mutation application. Teams that report poor GEPA results typically have evaluators with minimal logging.

**Unspoken infrastructure assumption: you need a capable reflection LLM.** GEPA uses a separate, typically more capable model (GPT-5 class) for reflection, separate from the model being optimized. This asymmetric setup is not prominently documented. If you use the same weak model for both reflection and task execution, the quality of proposed mutations degrades significantly. Running GEPA on purely local models requires a locally-capable reflection model, which changes the resource requirements substantially.

## When NOT to Use GEPA

**When you have a natural gradient.** If your artifact is differentiable and you have labeled training data at scale, gradient-based fine-tuning will be more efficient and controllable. GEPA is for when differentiation is unavailable or impractical.

**When your evaluator is noisy or slow.** GEPA requires 100–500 evaluations for meaningful improvement. If each evaluation takes 5 minutes or produces high-variance results, the total optimization budget becomes prohibitive or the signal is too noisy to drive convergence. Build a fast proxy evaluator first.

**When you need interpretable, auditable optimization.** GEPA's evolutionary process produces a result but not a clean audit trail of *why* specific changes were made. The parent lineage graph exists but requires tooling to interpret. Regulatory contexts needing documented justification for each change are poorly served.

**When the task changes frequently.** GEPA optimizes for a fixed evaluation distribution. If your task distribution shifts, the optimized candidate may be miscalibrated. Continuous optimization (re-running GEPA periodically) is possible but adds operational overhead.

**For simple, well-understood tasks.** Adding a retrieval router with subject-specific policies is appropriate for complex domains with varied subtypes. For straightforward question-answering on a narrow domain, a well-engineered static prompt will perform comparably with less overhead. See also [ACE](../concepts/context-engineering.md) for tasks where growing playbooks fit the structure better than evolutionary search.

## Unresolved Questions

**Frontier pruning at scale.** With many evaluation dimensions, the Pareto frontier can grow large. The framework has no built-in frontier pruning. How does performance degrade as the frontier grows? There is no documented guidance on when to prune or how.

**Stagnation detection.** GEPA relies on a `stop_callback` protocol but has no built-in detection for optimization stagnation (no Pareto improvement in N iterations). Users must implement their own stopping criteria, which affects reproducibility.

**Dataset overfitting in optimize_anything.** The simpler `optimize_anything` API allows single-dataset optimization without an explicit validation split. The documentation warns about this but does not quantify the overfitting risk or provide guidance on minimum dataset sizes relative to evaluation count.

**Governance of production skills.** The gskill pipeline evolves repository-specific agent skills that persist and transfer across model versions. There is no documented process for auditing or rolling back evolved skills, or for understanding what behavioral change a skill evolution introduced.

**Reflection model versioning.** When the reflection LLM is updated (e.g., GPT-5 is replaced), previously evolved candidates may no longer be improvable in the same ways. How GEPA handles reflection model drift is not addressed.

## Alternatives

**[Reinforcement Learning](../concepts/reinforcement-learning.md)** — Use RL (GRPO, PPO) when you have abundant labeled data, can afford 5,000–25,000+ rollouts, and want mathematically well-understood convergence properties. RL is the right choice when the evaluation signal is inherently scalar and clean.

**[DSPy](../projects/dspy.md) with MIPROv2** — Use MIPROv2 when you are already in the DSPy ecosystem and want a well-supported optimizer with deterministic behavior. GEPA outperforms MIPROv2 by ~10% but requires more infrastructure. MIPROv2 is simpler to debug.

**[ACE](../concepts/context-engineering.md)** — Use ACE when you want continuous online adaptation with 82–92% cost reduction relative to GEPA and are optimizing context content (what to include) rather than text artifact structure. ACE's incremental delta mechanism prevents context collapse over time.

**Meta-Harness** — Use Meta-Harness when you need to optimize the code that constructs context (retrieval logic, routing, prompt construction) rather than the text artifacts themselves. Meta-Harness requires a capable proposer (Opus-4 class) and ~10M tokens per iteration but discovers qualitatively different improvements than GEPA.

**[Reflexion](../concepts/reflexion.md)** — Use Reflexion for single-agent self-improvement within a session without evolutionary search overhead. Reflexion is simpler and cheaper; GEPA is more systematic and produces transferable, deployable artifacts.

## Related Concepts

[Self-Improving Agents](../concepts/self-improving-agents.md) · [Prompt Optimization](../concepts/prompt-optimization.md) · [Reinforcement Learning](../concepts/reinforcement-learning.md) · [Meta-Agent](../concepts/meta-agent.md) · [Execution Traces](../concepts/execution-traces.md) · [LLM-as-Judge](../concepts/llm-as-judge.md) · [GRPO](../concepts/grpo.md) · [Synthetic Data Generation](../concepts/synthetic-data-generation.md) · [Agent Skills](../concepts/agent-skills.md) · [Darwin Gödel Machine](../projects/darwin-godel-machine.md) · [EvoAgentX](../projects/evoagentx.md) · [AFlow](../projects/aflow.md) · [DSPy](../projects/dspy.md) · [SWE-bench](../projects/swe-bench.md) · [Chain-of-Thought](../concepts/chain-of-thought.md)

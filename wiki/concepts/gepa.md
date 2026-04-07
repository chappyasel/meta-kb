---
entity_id: gepa
type: approach
bucket: self-improving
abstract: >-
  GEPA (Genetic-Pareto) is a prompt and agent optimizer that replaces RL reward
  signals with LLM-readable execution traces, converging in 100–500 evaluations
  versus 5,000–25,000+ for GRPO by letting a reflection LLM diagnose why
  candidates fail rather than just that they fail.
sources:
  - repos/greyhaven-ai-autocontext.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
related:
  - claude
  - openai
  - anthropic
  - mcp
last_compiled: '2026-04-07T11:43:46.024Z'
---
# GEPA (Generative Evolutionary Prompt/Agent Optimization)

## What It Is

GEPA is a Python framework for optimizing any system with textual parameters — prompts, agent instructions, CUDA kernels, SVG layouts, scheduling policies — against any evaluation metric. Accepted as an Oral at ICLR 2026 (arxiv:2507.19457), it addresses a specific failure of reinforcement learning approaches: when you collapse an execution trace to a scalar reward, you lose all the diagnostic information about *why* a candidate failed. GEPA feeds full execution traces to a reflection LLM, which reads error messages, profiling data, and reasoning logs to propose targeted fixes rather than blind mutations.

The framework covers two primary APIs: `gepa.optimize()` for prompt optimization with train/val splits, and `gepa.optimize_anything()` for optimizing any text artifact using an evaluator function.

Reported production adopters include Shopify, Databricks, Dropbox, OpenAI, and Pydantic. Databricks reported 90x cost reduction (open-source models plus GEPA beating Claude Opus 4.1 on enterprise agent tasks). These are self-reported.

## Core Mechanism

### The Optimization Loop

`GEPAEngine` in `src/gepa/core/engine.py` runs an evolutionary loop with six stages:

**Select** — A `CandidateSelector` samples from the Pareto frontier, not just the single best candidate. Sampling probability is proportional to coverage across task subsets, preserving specialists that excel on different input types.

**Execute on minibatch** — The `BatchSampler` draws a training subset. The adapter runs the candidate with `capture_traces=True`, collecting execution logs as Actionable Side Information (ASI).

**Reflect** — `proposer/reflective_mutation/reflective_mutation.py` sends traces to a reflection LLM (typically more capable than the task LLM). The reflection LLM reads specific failure evidence and diagnoses root causes. This is the mechanism that makes GEPA 35x faster than RL: instead of a scalar 0.7 vs 0.3, the optimizer sees "TimeoutError on inputs >500 tokens" and responds with "add chunking."

**Mutate** — `propose_new_texts()` generates a new candidate based on the reflection. `ReflectionComponentSelector` decides which parameters to modify.

**Accept** — New candidates evaluated against the full validation set join the Pareto frontier if non-dominated. `GEPAState` tracks candidates, scores, parent lineage, and the frontier.

**Merge** — `proposer/merge.py` implements targeted crossover. `find_common_ancestor_pair()` searches parent lineage graphs for pairs that (a) share a common ancestor, (b) diverged from that ancestor in different ways, and (c) each excel on different task subsets. The LLM then combines their strengths. This is not random crossover — it requires confirmed divergence before attempting recombination.

### Actionable Side Information (ASI)

ASI is the conceptual core. Evaluators log diagnostic text alongside scores:

```python
def evaluate(candidate: str) -> float:
    result = run_my_system(candidate)
    oa.log(f"Output: {result.output}")
    oa.log(f"Error: {result.error}")
    return result.score
```

The reflection LLM reads these logs. ASI takes four forms: free-text diagnostics via `oa.log()`, structured key-value dictionaries, multi-objective scores tracked across the Pareto frontier, and rendered images via `gepa.Image` for vision-capable models. ASI quality directly determines optimization quality — thin feedback ("failed") gives the reflection LLM nothing to work with.

### Pareto Frontier Management

`GEPAState` maintains non-dominated candidates across task subsets. Candidate A dominates B if A scores ≥ B on all tasks and strictly better on at least one. `FrontierType` controls whether dominance is computed at the instance level or objective level. `ValsetEvaluation` stores per-example scores keyed by data ID. The frontier prevents the common failure of converging to a single "average best" that regresses on outlier input types.

### Evaluation Caching

`EvaluationCache` in `core/state.py` caches results by `(candidate_content, data_id)` pairs, preventing redundant evaluation when the same candidate appears in overlapping minibatches during frontier updates.

### optimize_anything API

```python
def optimize_anything(
    seed_candidate: str | dict[str, str] | None,
    evaluator: Callable,
    dataset: list | None,
    valset: list | None,
    objective: str | None,
    background: str | None,
    config: GEPAConfig | None,
) -> GEPAResult
```

Three modes: **Single-Task** (optimize one problem directly — circle packing, SVG layout), **Multi-Task** (solve related problems simultaneously, cross-transferring improvements), **Generalization** (optimize artifacts that must transfer to unseen examples, requires train/val split). Seedless mode accepts only an objective and evaluator, generating candidates from scratch.

## Key Numbers

All benchmarks below are self-reported by the authors unless marked otherwise.

| Metric | Result |
|--------|--------|
| Speed vs GRPO | 35x faster (100–500 evals vs 5,000–25,000+) |
| vs GRPO accuracy | +6% average, up to +20% on specific tasks |
| vs MIPROv2 | +10% accuracy, +12% on AIME-2025 |
| Cost reduction | 90x (Databricks case, self-reported) |
| ARC-AGI | 32.5% → 89.5% via architecture discovery |
| Coding agent — Jinja (Mini-SWE-Agent) | 55% → 82% resolve rate |
| Coding agent — Bleve (Mini-SWE-Agent) | 24% → 93% resolve rate |
| Claude Haiku 4.5 with GEPA Bleve skills | 79.3% → 98.3% |
| GPT-4.1 Mini on AIME 2025 | 46.67% → 60.00% |
| DSPy MATH benchmark | 67% → 93% |
| KernelBench (CUDA kernels) | 87% match/beat baseline; 25% achieve 20%+ speedup |
| Pydantic contact extraction | 86.88% → 96.88% |

The +6% vs GRPO figure and convergence properties have formal analysis in the ICLR paper. The Databricks 90x cost reduction, ARC-AGI result, and gskill coding agent figures are company blog/self-report. The Pydantic extraction result is documented in Pydantic's published integration guide — third-party documentation, though produced by an adopter rather than independent researchers.

Arize AI published benchmarks comparing GEPA against prompt learning approaches confirming sample efficiency advantages (independently produced, though by an adopter).

## Strengths

**Sample efficiency on text optimization tasks.** For domains where you can write an evaluator function and capture execution traces, GEPA consistently reaches competitive performance in far fewer evaluations than RL approaches. The formal convergence analysis supports this.

**Cross-model skill transfer.** The gskill pipeline demonstrates that skills evolved on cheap models (GPT-5-mini) transfer to production models (Claude Haiku 4.5) with accuracy *and* latency improvements. This means optimization cost runs on cheap models, deployment runs on appropriate models.

**Breadth of `optimize_anything`.** Code, prompts, configurations, CUDA kernels, and SVG layouts have all been demonstrated. If you can serialize the artifact to a string and score it, GEPA can optimize it.

**ASI generality.** The ability to log images for vision-capable reflection models is genuinely novel — most prompt optimizers assume text-only feedback.

**Production integrations.** Native `dspy.GEPA` integration and documented Pydantic AI workflows lower adoption friction for teams already using those frameworks.

## Critical Limitations

**Concrete failure mode — ASI quality collapse:** When evaluators provide minimal diagnostic information (pass/fail or numeric scores only), the reflection LLM fabricates plausible-sounding but incorrect diagnoses. The optimizer then pursues fixes for problems that do not exist. There is no verification step between reflection and mutation. If you cannot write informative `oa.log()` calls, GEPA degrades to expensive random search.

**Unspoken infrastructure assumption:** GEPA assumes access to a *separate, more capable* reflection LLM alongside the task LLM. The standard setup uses GPT-5 or Claude for reflection while the task model may be cheaper. Teams that can only access a single model tier (cost-constrained, air-gapped, or behind a rate-limited API) cannot use the reflection architecture as designed. Self-reflection with the same model has not been benchmarked.

**Pareto frontier explosion.** For high-dimensional evaluation spaces (many distinct task subsets), the frontier can grow large enough that selection and merge operations become expensive. No frontier pruning is implemented.

**Stagnation detection is absent.** The framework relies on user-provided `stop_callback` for termination. There is no built-in "stop if no Pareto improvement in N iterations" logic.

## When NOT to Use GEPA

**Skip GEPA when your evaluator is cheap and noisy.** For metrics like Lighthouse scores or flaky test suites, GEPA's two-stage evaluation (minibatch then full validation) has no noise correction mechanism. False keeps and discards accumulate. Use [DSPy](../projects/dspy.md)'s MIPROv2 with bootstrapped few-shot examples instead, or add statistical significance testing around any optimizer.

**Skip GEPA for simple, well-defined prompts.** A single-turn classification prompt with 10 labels does not need evolutionary search. The overhead — multiple LLM calls per iteration, Pareto frontier management, reflection — outweighs the benefit. Manual prompt engineering or a simpler optimizer (DSPy's BootstrapFewShot) will be faster and cheaper.

**Skip GEPA if you cannot isolate your evaluator.** GEPA requires a deterministic evaluator function that scores a candidate in isolation. Systems with shared state, external API side effects, or environment drift between evaluations produce corrupted Pareto frontiers that guide optimization in wrong directions.

**Skip GEPA when the artifact is not text-representable.** Binary weights, database schemas with referential constraints, and compiled artifacts with non-trivial configuration spaces require different search strategies. GEPA's mutation operators assume the candidate is a string the reflection LLM can reason about.

## Unresolved Questions

**Governance of the reflection LLM's reasoning.** There is no published analysis of what happens when the reflection LLM hallucinates a diagnosis across many iterations. Does the optimizer converge on a local optimum that "explains" the hallucinated failures, or does it self-correct? The ICLR paper provides convergence proofs but not robustness analysis under reflection failure.

**Cost at scale.** Each iteration involves reflection LLM calls plus evaluation calls. The Pydantic guide recommends setting `max_metric_calls` explicitly, but there is no published cost model for different task complexities. Teams working on large-scale deployments cannot predict budget accurately before running.

**Conflict resolution during merge.** When `find_common_ancestor_pair()` identifies candidates with divergent strengths, the merge LLM must decide how to combine conflicting strategies. The paper does not specify what happens when the merged candidate regresses on both parent domains — whether it falls off the frontier cleanly or creates misleading lineage data for future merge attempts.

**Frontier management at very long horizons.** The framework is demonstrated for 100–500 evaluation runs. For continuous optimization systems running thousands of iterations (like [Continual Learning](../concepts/continual-learning.md) setups), frontier management costs and stale-candidate pruning are not addressed.

**Multi-objective scoring consistency.** When ASI includes multi-objective scores tracked across the frontier, the paper does not specify how weights across objectives are set or adjusted. A reflection LLM optimizing cost vs. accuracy may behave differently from one optimizing accuracy vs. latency, and those tradeoffs are not surfaced to the user.

## Alternatives and Selection Guidance

**[DSPy](../projects/dspy.md) (MIPROv2 or BootstrapFewShot):** Use when your task is a well-defined multi-hop reasoning chain and you already have labeled data. DSPy's compilation model is faster and cheaper for structured LLM programs. GEPA is better when execution traces carry diagnostic signal that labeled data cannot capture, or when you need to optimize artifacts beyond prompts.

**[GRPO](../concepts/grpo.md) / RL approaches:** Use when you have a massive rollout budget, need to modify model weights rather than prompts, and your reward signal is clean. GRPO is the right choice for fine-tuning; GEPA is for runtime optimization of text artifacts.

**[Reflexion](../concepts/reflexion.md):** Use when you need single-session self-correction within one task instance rather than cross-task optimization. Reflexion improves performance on the current task; GEPA improves performance on the task *class* by evolving reusable knowledge.

**[ACE (Agentic Context Engineering)](../concepts/context-engineering.md):** Use when you need ongoing adaptation of a deployed agent's context without rerunning optimization. ACE's incremental delta updates prevent context collapse during live operation. GEPA is better for upfront optimization before deployment; ACE handles post-deployment drift. They are complementary — GEPA can optimize the initial system prompt that ACE then incrementally extends.

**[Darwin Gödel Machine](../projects/darwin-godel-machine.md):** Use when you want the agent to modify its own code rather than its prompts. DGM operates at the source code level and requires a safety sandbox. GEPA operates at the text artifact level and is safer to run without sandboxing.

**Meta-Harness:** Use when you want to optimize the harness *code* (retrieval logic, routing, memory management) rather than prompt text. Meta-Harness gives a coding agent filesystem access to all prior candidates' source and traces; GEPA optimizes text parameters through evolutionary search. Meta-Harness outperforms GEPA (+7.7 points on text classification) specifically because it can rewrite retrieval algorithms, not just prompt text.

**[EvoAgentX](../projects/evoagentx.md) / [AgentEvolver](../projects/agentevolver.md):** Use when you need to evolve multi-agent *architectures* — which agents exist, how they communicate, what tools they have. GEPA optimizes parameters within a fixed architecture; these systems evolve the architecture itself.

## Related Concepts

- [Self-Improving Agent](../concepts/self-improving-agent.md) — GEPA is the prompt/artifact optimization layer of self-improvement; pairs with code-level systems like DGM for full-stack self-improvement
- [Prompt Engineering](../concepts/prompt-engineering.md) — GEPA automates systematic prompt search, replacing manual iteration
- [LLM-as-Judge](../concepts/llm-as-judge.md) — GEPA's reflection LLM functions as a diagnostic judge over execution traces
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — GEPA replaces RL's scalar reward signal with ASI; formally compared to GRPO
- [Procedural Memory](../concepts/procedural-memory.md) — gskill's evolved agent skills are a form of procedural memory, persisted and reused across tasks
- [Memory Evolution](../concepts/memory-evolution.md) — GEPA's evolutionary search over text artifacts extends naturally to evolving agent memory structures
- [Continual Learning](../concepts/continual-learning.md) — GEPA does not address catastrophic forgetting; combining with continual learning approaches is an open problem
- [Agent Skills](../concepts/agent-skills.md) — gskill produces repository-specific agent skills via GEPA optimization
- [Model Context Protocol](../concepts/mcp.md) — GEPA includes an adapter for optimizing MCP tool descriptions
- [Claude](../projects/claude.md) — Used as both task and reflection LLM in production GEPA deployments
- [Anthropic](../projects/anthropic.md) — Claude models are primary reflection LLMs in documented GEPA use cases

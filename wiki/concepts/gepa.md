---
entity_id: gepa
type: concept
bucket: self-improving
abstract: >-
  GEPA replaces RL reward scalars with LLM-readable execution traces (Actionable
  Side Information) to diagnose why candidates fail, achieving 35x fewer
  evaluations than GRPO through reflection-guided evolutionary search with
  Pareto frontier management.
sources:
  - repos/greyhaven-ai-autocontext.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
related:
  - claude
  - reinforcement-learning
  - meta-agent
  - openai
  - anthropic
  - model-context-protocol
  - reinforcement-learning
  - meta-agent
last_compiled: '2026-04-08T02:45:47.771Z'
---
# GEPA (Genetic-Pareto Agent Optimizer)

## What It Is

GEPA is a framework for optimizing any text-representable artifact — prompts, agent instructions, CUDA kernels, SVG layouts, scheduling policies — against any measurable objective. Accepted as an Oral at ICLR 2026, it solves a fundamental problem with applying reinforcement learning to text optimization: RL collapses execution traces into a single scalar reward, discarding the diagnostic signal that explains *why* a candidate failed. GEPA replaces that scalar with Actionable Side Information (ASI): arbitrary diagnostic text logged during evaluation that a reflection LLM reads to propose targeted fixes.

The result is evolutionary search guided by causal diagnosis rather than blind mutation. Where GRPO requires 5,000–25,000 rollouts to converge, GEPA converges in 100–500 evaluations — a 35x efficiency gain that makes optimization practical for expensive evaluators like full agent pipelines.

[Source: deep/repos/gepa-ai-gepa.md](../raw/deep/repos/gepa-ai-gepa.md)

## Architectural Core

The codebase (`src/gepa/`) organizes into five modules:

- **`core/`** — The `GEPAEngine` orchestrates the optimization loop. `GEPAState` tracks all candidates, parent lineage, Pareto frontier membership, and per-example scores keyed by data ID. `EvaluationCache` prevents redundant evaluation by caching (candidate_content, data_id) pairs.
- **`proposer/reflective_mutation/`** — The `ReflectiveMutationProposer` sends execution traces to a reflection LLM. `InstructionProposalSignature` structures the reflection prompt. `ReflectionComponentSelector` determines which parameters to update.
- **`proposer/merge.py`** — `MergeProposer` implements lineage-aware crossover. `find_common_ancestor_pair()` searches parent lineage graphs for candidate pairs that diverged from a common ancestor in complementary directions.
- **`strategies/`** — Pluggable `CandidateSelector`, `BatchSampler`, `EvaluationPolicy`, and `ComponentSelector` interfaces let users control how the search proceeds.
- **`adapters/`** — Integration adapters for DSPy, RAG pipelines, [Model Context Protocol](../concepts/model-context-protocol.md) tool descriptions, and coding agent benchmarks.

The two primary entry points are `gepa.optimize()` (prompt optimization with train/val splits) and `gepa.optimize_anything.optimize_anything()` (optimize any text artifact given an evaluator function).

## How the Loop Works

Each iteration follows seven steps:

**1. Select.** `CandidateSelector` samples from the Pareto frontier — the set of candidates not dominated across all evaluation instances. Selection probability is proportional to coverage: candidates that excel on underrepresented task subsets get sampled more often.

**2. Execute on minibatch.** `BatchSampler` draws a subset of training examples. The selected candidate runs through the adapter's `evaluate()` method with `capture_traces=True`, collecting ASI logs.

**3. Reflect.** `ReflectiveMutationProposer` sends the execution traces to the reflection LLM. The reflection LLM reads raw diagnostics — error messages, profiling data, reasoning logs — and diagnoses specific failure causes. A typical reflection: "TimeoutError on line 42 when processing inputs with >500 tokens. Root cause: no chunking strategy for long inputs."

**4. Mutate.** `propose_new_texts()` generates a new candidate based on the reflection. The mutation is targeted — it addresses the diagnosed failure rather than randomly perturbing parameters.

**5. Evaluate.** The mutated candidate runs on the same minibatch. If it scores higher, it advances.

**6. Accept.** `_run_full_eval_and_add` evaluates the candidate on the validation set. If it is not dominated on the Pareto frontier, it enters the candidate pool.

**7. Merge (optional).** `MergeProposer` periodically finds pairs of Pareto-optimal candidates that excel on different task subsets and share a common ancestor, then asks the LLM to combine their strengths. This is not random crossover — `find_common_ancestor_pair()` filters for triplets where the two candidates diverged from the ancestor in complementary ways.

## Actionable Side Information

ASI is the mechanism that makes GEPA's efficiency gains possible. Evaluators log diagnostic text via `oa.log()`:

```python
def evaluate(candidate: str) -> float:
    result = run_my_system(candidate)
    oa.log(f"Output: {result.output}")
    oa.log(f"Error: {result.error}")
    oa.log(f"Latency: {result.latency_ms}")
    return result.score
```

These logs feed the reflection LLM. ASI takes four forms: open-ended text via `oa.log()`, structured key-value dictionaries, multi-objective per-dimension scores, and rendered images via `gepa.Image` for vision-capable models evaluating visual artifacts.

The ablation from Meta-Harness (a related system) confirms the principle independently: full execution trace access achieves 50.0% accuracy vs 34.6% with scores-only and 34.9% with summaries. Summaries lose the causal signal. [Source: deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)

## Key Numbers

| Metric | Result | Source |
|--------|--------|--------|
| Speed vs GRPO | 35x fewer rollouts (100–500 vs 5,000–25,000+) | Self-reported (ICLR paper) |
| vs GRPO average | +6%, up to +20% on specific tasks | Self-reported |
| vs MIPROv2 | +10% accuracy, +12% on AIME-2025 | Self-reported |
| Databricks cost reduction | 90x (open-source model + GEPA vs Claude Opus 4.1) | Customer report |
| Coding agent (Bleve, Mini-SWE) | 24% → 93% resolve rate | Self-reported |
| Cross-model skill transfer (Claude Haiku 4.5 on Bleve) | 79.3% → 98.3% | Self-reported |
| Pydantic contact extraction | 86.88% → 96.88% | Integration guide |
| KernelBench CUDA kernels | 87% match or beat baseline; 25% achieve >20% speedup | Self-reported |
| MATH benchmark (via DSPy full-program optimization) | 67% → 93% | Self-reported |
| ARC-AGI via architecture discovery | 32.5% → 89.5% | Self-reported |

The ICLR Oral acceptance provides some independent validation of the core theoretical claims. The Databricks and Arize AI benchmarks are external but not rigorously peer-reviewed. The Pydantic integration guide is from a named production deployment. Most numbers are self-reported or from close collaborators.

Production deployments include Shopify, Databricks, Dropbox, OpenAI, Pydantic, MLflow, and Google ADK.

## Strengths

**Sample efficiency on expensive evaluators.** When each evaluation involves running a full agent pipeline or executing code, the difference between 200 and 10,000 evaluations is the difference between a practical optimization run and an infeasible one. GEPA's 35x efficiency gain is the headline practical advantage.

**The optimize_anything API.** Any text artifact with a measurable evaluator can be optimized without building custom scaffolding. CUDA kernels, SVG layouts, scheduling policies, agent system prompts — if it serializes to a string and has a quality metric, GEPA handles the rest.

**Cross-model skill transfer.** Skills evolved on cheaper models (gpt-5-mini) transfer to production agents (Claude Haiku 4.5) with accuracy and speed improvements. This means optimization can happen on cheap models, with results deployed on expensive ones. The gskill pipeline automates this: it converts a GitHub repository into ~300 verifiable software engineering tasks, evolves skills against them, and exports the results. [Source: deep/repos/gepa-ai-gepa.md](../raw/deep/repos/gepa-ai-gepa.md)

**Pareto frontier preserves complementary strategies.** Rather than collapsing to a single "average best," the frontier maintains specialists that excel on different task subsets. The merge step leverages this by recombining complementary specialists.

**ASI is extensible.** Because ASI is just text that a reflection LLM reads, you can log anything: database query plans, network traces, intermediate computation steps. The richer the diagnostics, the better the mutations.

## Critical Limitations

**Concrete failure mode — reflection hallucination on thin ASI.** If your evaluator returns only a scalar with no diagnostic logs, the reflection LLM invents plausible-sounding failure analyses from nothing. The Pydantic integration guide documents this explicitly: optimization quality correlates directly with ASI richness. An evaluator that logs `oa.log("failed")` gives the reflection LLM nothing to reason about. Teams that skip ASI instrumentation and rely on scalar feedback see GEPA degrade toward random search.

**Unspoken infrastructure assumption — a capable reflection LLM is required.** Every production deployment mentioned in documentation uses GPT-5 or Claude Opus class models as the reflection LLM, regardless of what model runs the actual task. The framework separates the reflection model (`reflection_lm` parameter) from the task model, but this means the optimization budget implicitly assumes access to frontier-class models for reflection. Running GEPA with a weak reflection LLM (e.g., a 7B local model) may produce poor mutations and stagnation, though the documentation does not quantify this degradation threshold.

## When NOT to Use GEPA

**When your evaluator is cheap and your iteration budget is large.** GEPA's efficiency advantage is designed for expensive evaluators. If running 10,000 evaluations costs $5 and takes 30 minutes, the computational efficiency of GEPA over [GRPO](../concepts/grpo.md) does not justify the integration complexity.

**When you need gradient-based optimization.** GEPA searches a discrete text space. If your system has differentiable continuous parameters (neural network weights, embedding matrices), gradient descent will outperform evolutionary text search. GEPA is not a replacement for fine-tuning.

**When your task has no natural scalar metric and you cannot instrument a proxy.** You need a measurable evaluator. If you cannot reduce quality to a number, GEPA has nothing to optimize. (Note: [goal-md](../concepts/gepa.md) extends this by helping construct fitness functions for domains without natural metrics, but that is a separate pattern.)

**When optimization artifacts need production auditability.** The Pareto frontier may contain many candidates, and the "best" candidate selected at deployment time depends on which task distribution you weight. For regulated industries requiring clear model documentation, the multi-candidate frontier complicates provenance tracking.

**When iteration cost requires deterministic stopping.** The `stop_callback` protocol supports custom stopping conditions, but the framework has no built-in stagnation detection (e.g., stop after N iterations with no Pareto improvement). Without this, runs may consume budget without progress.

## Unresolved Questions

**Frontier explosion in high-dimensional objective spaces.** The documentation acknowledges that teams working with many evaluation dimensions see Pareto frontier management become expensive, and the practical recommendation is to limit to 3–5 dimensions. There is no documented frontier pruning mechanism, and it is unclear at what dimension count the frontier becomes computationally intractable.

**Merge precondition frequency.** The merge step requires candidates with a common ancestor that each diverged from in complementary directions. In early optimization with few candidates, the `find_common_ancestor_pair()` function may rarely find qualifying pairs, falling back to reflection-only mutation. The documentation does not specify how often merge fires in practice, what the performance impact is when it cannot, or how to configure the system to make merge more/less aggressive.

**TerminalBench evaluation on same 89 tasks.** The TerminalBench-2 agentic coding benchmark uses the same 89 tasks for optimization and final evaluation. This creates overfitting risk that the ICLR paper does not address. The gskill pipeline uses explicit train/val/test splits; the TerminalBench results do not.

**Long-term skill drift.** The gskill pipeline evolves repository-specific skills, but repositories evolve. There is no documented mechanism for detecting when evolved skills become stale relative to codebase changes, or for continuous skill updating as a repository's API surface changes.

## How It Fits the Broader Ecosystem

GEPA sits in a cluster of self-improving systems that use LLM reflection to guide optimization. Key comparisons:

**Use GEPA when** you want a general-purpose optimizer for any text artifact with a measurable evaluator and expensive-per-evaluation constraints. [Source: deep/repos/gepa-ai-gepa.md](../raw/deep/repos/gepa-ai-gepa.md)

**Use [ACE](../concepts/context-engineering.md) when** you specifically want to evolve agent context/prompts online during deployment, with emphasis on preventing context collapse through incremental delta updates rather than full rewrites. ACE achieves 82–92% cost reductions over GEPA for online adaptation by processing only deltas. [Source: deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md](../raw/deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

**Use Meta-Harness when** you want to optimize the *code* that controls what an LLM sees (retrieval logic, prompt construction, memory management) rather than the text parameters themselves. Meta-Harness gives a coding agent filesystem access to all prior candidates' source code and execution traces, enabling architectural-level redesigns that GEPA cannot perform. [Source: deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)

**Use Autocontext when** you need a full multi-agent harness (competitor, analyst, coach, architect, curator) that evolves knowledge artifacts around an agent — playbooks, hints, tools — with rollback capability and frontier-to-local distillation. Autocontext incorporates GEPA's Pareto optimization and ASI concepts as one component within a more comprehensive self-improvement architecture. [Source: deep/repos/greyhaven-ai-autocontext.md](../raw/deep/repos/greyhaven-ai-autocontext.md)

**Use [DSPy](../projects/dspy.md)** when your system is already structured as a DSPy program — GEPA is available as `dspy.GEPA` and can optimize full programs including control flow, not just prompt strings.

GEPA's Pareto-plus-ASI design also appears as a component in [Darwin Gödel Machine](../projects/darwin-godel-machine.md), [AFlow](../projects/aflow.md), and [EvoAgentX](../projects/evoagentx.md), each of which uses evolutionary search with LLM-guided mutation for different optimization targets. The core ASI insight — that full traces beat compressed summaries by a large margin — is independently confirmed by Meta-Harness's ablation (34.6% → 50.0% accuracy) and represents the most transferable finding from the GEPA ecosystem. [Reinforcement Learning](../concepts/reinforcement-learning.md) practitioners building on scalar rewards should treat this as strong evidence to instrument richer diagnostic logging regardless of which optimization framework they use.


## Related

- [Claude](../projects/claude.md) — part_of (0.5)
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — implements (0.7)
- [Meta-Agent](../concepts/meta-agent.md) — implements (0.7)
- [OpenAI](../projects/openai.md) — part_of (0.5)
- [Anthropic](../projects/anthropic.md) — part_of (0.5)
- [Model Context Protocol](../concepts/model-context-protocol.md) — part_of (0.4)
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — implements (0.7)
- [Meta-Agent](../concepts/meta-agent.md) — implements (0.7)

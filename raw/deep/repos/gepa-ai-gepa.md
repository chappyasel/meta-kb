---
url: 'https://github.com/gepa-ai/gepa'
type: repo
author: gepa-ai
date: '2026-04-04'
tags:
  - self-improving
  - agentic-skills
  - context-engineering
key_insight: >-
  GEPA replaces RL reward signals with LLM-readable execution traces (Actionable
  Side Information), enabling 35x faster optimization than GRPO by letting a
  reflection LLM diagnose WHY candidates fail rather than just THAT they fail,
  combined with Pareto-efficient evolutionary search across task subsets.
stars: 3200
deep_research:
  method: source-code-analysis-plus-web
  files_analyzed:
    - README.md
    - AGENTS.md
    - src/gepa/core/engine.py
    - src/gepa/core/state.py
    - src/gepa/core/adapter.py
    - src/gepa/proposer/reflective_mutation/reflective_mutation.py
    - src/gepa/proposer/merge.py
    - src/gepa/proposer/base.py
    - src/gepa/strategies/candidate_selector.py
    - src/gepa/strategies/batch_sampler.py
    - docs/docs/blog/posts/2026-02-18-introducing-optimize-anything/index.md
    - >-
      docs/docs/blog/posts/2026-02-18-automatically-learning-skills-for-coding-agents/index.md
  web_sources:
    - >-
      https://gepa-ai.github.io/gepa/blog/2026/02/18/introducing-optimize-anything/
    - >-
      https://gepa-ai.github.io/gepa/blog/2026/02/18/automatically-learning-skills-for-coding-agents/
    - 'https://arxiv.org/abs/2507.19457'
    - 'https://pydantic.dev/articles/prompt-optimization-with-gepa'
    - 'https://dspy.ai/api/optimizers/GEPA/overview/'
    - >-
      https://arize.com/blog/gepa-vs-prompt-learning-benchmarking-different-prompt-optimization-approaches/
  analyzed_at: '2026-04-04'
  original_source: repos/gepa-ai-gepa.md
relevance_scores:
  topic_relevance: 8
  practitioner_value: 8
  novelty: 9
  signal_quality: 8
  composite: 8.1
  reason: >-
    GEPA's LLM-powered reflection-based optimization loop (using execution
    traces as diagnostic signals rather than scalar rewards) is a directly
    transferable self-improvement pattern for agent systems, prompt
    optimization, and trace-driven optimization — all core to the self-improving
    systems pillar.
---

## Architecture Overview

GEPA (Genetic-Pareto) is a Python framework for optimizing any system with textual parameters against any evaluation metric. Accepted as an Oral at ICLR 2026, it represents a fundamental shift in how text-based systems are optimized: traditional optimizers (RL, gradient-based methods) collapse execution traces into a single scalar reward, losing all diagnostic information about WHY a candidate failed. GEPA instead uses LLMs to read full execution traces -- error messages, profiling data, reasoning logs -- to diagnose failures and propose targeted fixes.

The framework is described by its authors as "a prompt optimizer that thoroughly incorporates natural language reflection to learn high-level rules from trial and error." Through iterative reflection, mutation, and Pareto-aware selection, GEPA evolves high-performing variants with minimal evaluations.

The codebase (`src/gepa/`) is organized into five modules:

- **`core/`** -- The optimization engine (`engine.py`), state management (`state.py`), evaluation caching, the `GEPAAdapter` interface, and the callback system.
- **`proposer/`** -- Candidate proposal logic: `reflective_mutation/` for reflection-based mutation, `merge.py` for Pareto-aware crossover between candidates, and `base.py` for the abstract `ProposeNewCandidate` protocol.
- **`strategies/`** -- Pluggable strategies for batch sampling (`batch_sampler.py`), candidate selection (`candidate_selector.py`), component selection (`component_selector.py`), evaluation policies (`eval_policy.py`), and instruction proposal signatures (`instruction_proposal.py`).
- **`adapters/`** -- Integration adapters for DSPy, RAG pipelines, MCP tool descriptions, TerminalBench, and AnyMaths.
- **`logging/`** -- Experiment tracking and structured logging.

The two main APIs are `gepa.optimize()` (prompt optimization using a trainset/valset split) and `gepa.optimize_anything.optimize_anything()` (optimize any text artifact using an evaluator function).

## Core Mechanism

### The GEPA Optimization Loop

The loop in `GEPAEngine` (in `core/engine.py`) follows an evolutionary pattern with LLM-powered reflection:

1. **Select** -- A `CandidateSelector` picks a candidate from the Pareto frontier. Rather than evolving just the best global candidate (which leads to local optima or stagnation), GEPA maintains a Pareto frontier: the set of candidates which achieve the highest score on at least one evaluation instance. In each iteration, the next candidate to mutate is sampled with probability proportional to coverage from this frontier, guaranteeing both exploration and robust retention of complementary strategies.

2. **Execute on Minibatch** -- The `BatchSampler` draws a subset of training examples. The selected candidate is executed on this minibatch through the adapter's `evaluate()` method, which captures full execution traces (`capture_traces=True`). These traces are the "Actionable Side Information" (ASI) -- the text-optimization analogue of a gradient.

3. **Reflect** -- The `ReflectiveMutationProposer` in `proposer/reflective_mutation/reflective_mutation.py` sends the execution traces to a reflection LLM (typically a more capable model like GPT-5 or Claude). The LLM reads the error messages, profiling data, and reasoning logs to diagnose WHY the candidate failed on specific examples, then proposes targeted fixes. The reflective dataset is built via `adapter.make_reflective_dataset()`, which formats traces into a structure the reflection LLM can reason about.

4. **Mutate** -- Based on the reflection, `propose_new_texts()` generates a new candidate. The `ReflectionComponentSelector` determines which components (parameters) of the candidate to update. The `InstructionProposalSignature` structures the reflection prompt. A custom proposer function can be injected via `custom_candidate_proposer`.

5. **Evaluate** -- The new candidate is evaluated on the same minibatch. If it scores higher (improved on the training examples), it passes to the acceptance stage.

6. **Accept** -- The `_run_full_eval_and_add` method evaluates the new candidate on the full validation set (or a policy-determined subset via `EvaluationPolicy`). If the candidate is not dominated on the Pareto front, it is added to the pool. The `GEPAState` tracks all candidates, their scores, parent lineage, and the Pareto frontier.

7. **Merge (Optional)** -- The `MergeProposer` in `proposer/merge.py` implements system-aware crossover. It finds pairs of Pareto-optimal candidates that excel on DIFFERENT task subsets and share a common ancestor, then asks the LLM to combine their strengths. The `find_common_ancestor_pair()` function searches the parent lineage graph, filtering by: (a) not already attempted, (b) ancestor scores lower than both candidates, (c) the triplet has "desirable predictors" (components where the two candidates diverged from the ancestor in different ways). This is not random crossover -- it is targeted recombination guided by the lineage structure.

### Actionable Side Information (ASI)

The key concept that makes GEPA 35x faster than RL. In reinforcement learning, the agent only knows a scalar reward: 0.7 vs 0.3. In GEPA, the evaluator can log arbitrary diagnostic text via `oa.log()`:

```python
def evaluate(candidate: str) -> float:
    result = run_my_system(candidate)
    oa.log(f"Output: {result.output}")      # What the system produced
    oa.log(f"Error: {result.error}")         # What went wrong
    oa.log(f"Latency: {result.latency_ms}")  # Performance data
    return result.score
```

These logs are captured in the execution traces and fed to the reflection LLM. Instead of blindly mutating parameters hoping for improvement (RL), the reflection LLM reads "TimeoutError on line 42 when processing input with >500 tokens" and proposes "add a chunking strategy for long inputs." This directed search converges in 100-500 evaluations vs 5,000-25,000+ for GRPO.

ASI is now a first-class API concept with multiple forms:
- **Open-ended text diagnostics** via `oa.log()` -- free-form failure descriptions
- **Structured data dictionaries** -- key-value pairs returned alongside scores
- **Multi-objective scores** -- per-dimension metrics tracked across the Pareto frontier
- **Rendered images** via `gepa.Image` -- for vision-capable models that need visual feedback (e.g., SVG optimization, UI layout scoring)

The Pydantic integration demonstrates ASI in practice: the adapter captures detailed failure data -- inputs, expected outputs, actual outputs, and per-field accuracy scores -- which feed back to an LLM-based proposer that suggests targeted improvements. Initial simple instructions achieved 86.88% accuracy; after optimization with ASI-guided reflection, accuracy improved to 96.88% through more specific guidelines the system discovered autonomously.

### The optimize_anything API

The `optimize_anything` API extends GEPA beyond prompts to any text-representable artifact. The declarative interface:

```python
def optimize_anything(
    seed_candidate: str | dict[str, str] | None = None,
    evaluator: Callable,
    dataset: list | None = None,
    valset: list | None = None,
    objective: str | None = None,
    background: str | None = None,
    config: GEPAConfig | None = None,
) -> GEPAResult
```

Three unified optimization modes under one API:

**Single-Task Search** -- Optimizes a single problem directly. The artifact itself is the solution; the evaluator scores it without example batching. Use case: circle packing algorithms, SVG optimization.

**Multi-Task Search** -- Solves related problems simultaneously, enabling cross-transfer of improvements. Individual tasks reside in a `dataset`; insights from one problem accelerate others. Use case: CUDA kernel generation for multiple PyTorch operations.

**Generalization** -- Optimizes artifacts that must transfer to unseen examples. Requires both training `dataset` and validation `valset`. The proposer learns to improve performance across diverse scenarios. Use case: prompt refinement, agent architecture discovery, policy learning.

You declare the what (your artifact, your evaluator, and any domain knowledge as background) and optimize_anything handles the how: prompt construction, reflection, candidate selection, and search strategy. If it can be serialized to a string and its quality measured, an LLM can reason about it and propose improvements.

### Pareto Frontier Management

GEPA's `GEPAState` maintains a Pareto frontier across task subsets. A candidate A dominates candidate B if A scores >= B on ALL tasks and strictly > on at least one. The frontier contains all non-dominated candidates. This prevents the optimizer from converging to a single "average best" -- instead it maintains specialists that each excel on different task types.

The `FrontierType` enum controls frontier behavior (instance-level vs objective-level Pareto). The `ValsetEvaluation` dataclass stores per-example scores keyed by data ID, enabling fine-grained dominance checking. Each reflection minibatch shows 2-3 examples or metrics, creating focused iteration cycles rather than diluting attention across all examples simultaneously.

### Evaluation Caching

`EvaluationCache` (in `core/state.py`) prevents redundant evaluations. When a candidate is evaluated on a set of examples, the results are cached by (candidate_content, data_id) pairs. The `cached_evaluate_full` method checks the cache first, only calling the evaluator for uncached pairs. This is critical for efficiency since the same candidate may be re-evaluated on overlapping minibatches during Pareto frontier updates.

### Coding Agent Skills via gskill

The gskill pipeline demonstrates GEPA's most practical application: automatically learning skills for coding agents. The pipeline combines two components:

**SWE-smith Task Generation** -- Converts a GitHub repository into a training environment by automatically generating ~300 diverse, verifiable software engineering tasks grounded in the actual codebase. Tasks are split into training (~200), validation (~50), and test (~60) sets, each with built-in test validation.

**Skill Evolution** -- The optimization loop iteratively refines agent skills through evaluation (agents attempt tasks using current skills), reflection (a more capable LLM analyzes results and failures), and update (skills are refined based on diagnostic feedback). Skills start possibly empty and evolve to become repository-specific rather than universal.

Results demonstrate significant gains: Mini-SWE-Agent with gpt-5-mini improved from 55% to 82% on Jinja and 24% to 93% on Bleve. Critically, skills learned on weaker models transfer to production agents: Claude Haiku 4.5 with GEPA-evolved Bleve skills went from 79.3% to 98.3% (with execution time dropping from 173s to 142s), and Jinja skills achieved 93.9% to 100% (177s to 148s). The improvements include both accuracy gains and speed reductions, lowering costs alongside performance.

## Design Tradeoffs

### Reflection LLM vs Self-Reflection
GEPA uses a SEPARATE reflection LLM (typically more capable, like GPT-5) to analyze traces from the task LLM (which may be cheaper, like GPT-4.1 Mini). This separation means the optimization budget is split between task evaluation and reflection. The tradeoff: stronger reflection leads to better mutations but costs more per iteration. The `reflection_lm` parameter controls this. The Pydantic integration guide recommends budgeting 50-200 total evaluations for meaningful improvement, with each iteration involving multiple LLM calls (one per test case plus proposer calls).

### Pareto Frontier vs Best-So-Far
Maintaining a Pareto frontier is more expensive than tracking a single best candidate (more evaluations needed to check dominance). But it prevents catastrophic forgetting where a generalist improvement wipes out a specialist capability. The merge step leverages the frontier by finding complementary specialists to combine. External benchmarks confirm this outperforms single-candidate approaches, particularly in multi-task settings where preserving complementary gains is essential.

### Minibatch vs Full-Set Evaluation
New candidates are first evaluated on a minibatch (fast, cheap), then only promoted to full validation if they show promise. The `EvaluationPolicy` controls how much of the validation set to use. `FullEvaluationPolicy` evaluates on everything; an incremental policy could evaluate on progressively larger subsets. This two-stage evaluation is critical for keeping the per-iteration cost manageable.

### Evolutionary Search vs Gradient Descent
GEPA chose evolutionary search over gradient-based optimization because text parameters are discrete and non-differentiable. The "gradient" is replaced by ASI -- the reflection LLM reads traces and computes a "text gradient" (diagnostic analysis + proposed fix). This is less sample-efficient than true gradients but works on any text artifact. The ICLR paper's formal analysis demonstrates convergence properties justifying this choice: GEPA outperforms GRPO by 6% average and up to 20% while using 35x fewer rollouts.

### Continuous vs Binary Scoring
The Pydantic integration guide reveals an important practical insight: continuous accuracy scores (0.0-1.0 range) work significantly better than binary pass/fail. Comparable scoring across cases prevents metric gaming, and the granularity gives the reflection LLM more signal to work with. Dataset design matters enormously -- the optimization quality depends entirely on test coverage spanning easy cases (regression prevention), edge cases (unusual formats), and adversarial examples (noisy inputs, ambiguity).

### Language as Learning Medium
The deepest design choice: GEPA uses natural language as its learning medium rather than numerical gradients. The reflection LLM does not just produce a new candidate -- it learns and articulates high-level rules from trial and error, combining "complementary lessons from the Pareto frontier of its own attempts." This enables the system to synthesize diverse successful approaches rather than converging on a single solution. The tradeoff is that this reflective learning is bounded by the reflection LLM's ability to reason about the domain.

## Failure Modes & Limitations

1. **Reflection LLM Hallucination** -- The reflection LLM may misdiagnose failure causes, leading to mutations that do not address the real problem. There is no verification step between reflection and mutation.

2. **ASI Quality Dependence** -- If the evaluator's `oa.log()` calls are uninformative (e.g., just "failed"), the reflection has nothing to work with. The quality of GEPA's optimization is directly proportional to the quality of the diagnostic traces. The Pydantic guide emphasizes this: observability (via Logfire integration) is essential for debugging unexpected optimization behavior.

3. **Pareto Frontier Explosion** -- For high-dimensional objective spaces, the Pareto frontier can grow very large, making selection and merge operations expensive. The framework does not currently implement frontier pruning.

4. **Cost Scaling** -- Each iteration requires at least two LLM calls (reflection + mutation) plus evaluation. For expensive evaluators (e.g., running a full agent pipeline), the per-iteration cost can be substantial even if the iteration count is low. Budget management is critical: the Pydantic guide recommends explicitly setting `max_metric_calls` to control costs.

5. **Merge Preconditions** -- The merge step requires common ancestors with "desirable predictors" (divergent components). In early optimization stages with few candidates, merge opportunities may be rare, falling back to reflection-only mutation.

6. **Stagnation Detection** -- The framework relies on the `stop_callback` protocol for stopping, but does not have built-in stagnation detection (e.g., "stop if no Pareto improvement in N iterations").

7. **Dataset Overfitting** -- Without proper train/val separation, GEPA can overfit to specific test cases. The gskill pipeline addresses this with explicit train/val/test splits, but the simpler optimize_anything API allows single-dataset optimization that risks this.

## Community Feedback and Practical Experience

### What Works in Practice
- **Sample efficiency is the headline result.** Across production deployments, teams consistently report GEPA converging in 100-500 evaluations where RL-based approaches require 5,000-25,000+. This 10-35x efficiency gain is the primary adoption driver.
- **Cross-model skill transfer is validated.** Skills evolved on cheaper models (gpt-5-mini) transfer effectively to production agents (Claude Haiku 4.5), with improvements in both accuracy AND speed. This means optimization can happen on cheap models and deploy on expensive ones.
- **The Pydantic integration demonstrates a concrete workflow.** Starting from 86.88% accuracy on contact extraction, GEPA autonomously discovered better guidelines (explicit name handling, phone format preservation, primary contact identification, null-value semantics) and reached 96.88%. These are the kinds of improvements a human prompt engineer would make, but discovered automatically.
- **CUDA kernel optimization shows breadth.** On KernelBench, 87% of GEPA-optimized CUDA kernels matched or beat hand-tuned baselines, with 25% achieving 20%+ speedups. This demonstrates the optimize_anything API works on code, not just prompts.
- **Circle packing results show competitiveness with dedicated systems.** GEPA achieved scores competitive with AlphaEvolve and OpenEvolve on the n=26 circle packing problem, suggesting the general-purpose framework can match domain-specific evolutionary systems.

### What Breaks in Practice
- **Evaluator design is the bottleneck.** The Pydantic guide emphasizes that dataset design matters enormously: optimization quality depends entirely on test coverage spanning easy, edge, and adversarial cases. Teams that invest in evaluator quality see dramatically better results.
- **Cost management requires explicit attention.** Without setting `max_metric_calls`, optimization runs can become expensive. Each iteration involves multiple LLM calls (one per test case plus proposer), creating non-trivial costs that scale with dataset size.
- **The reflection LLM can hallucinate diagnoses.** When ASI is thin (evaluators that return only pass/fail), the reflection LLM may invent plausible-sounding but incorrect failure analyses, leading to mutations that do not address real problems.
- **Frontier explosion in high-dimensional spaces.** Teams working with many evaluation dimensions report Pareto frontier management becoming expensive. Practical deployments typically limit to 3-5 evaluation dimensions.

## Integration Patterns

### DSPy Integration
GEPA is available as `dspy.GEPA`, optimizing entire DSPy programs (signatures, modules, control flow). The DSPy adapter translates program parameters into GEPA's `dict[str, str]` candidate format. The DSPy Full Program Adapter evolves entire programs including signatures, modules, and control flow, achieving 93% accuracy on MATH benchmark (vs 67% with basic DSPy ChainOfThought). The DSPy tutorial demonstrates the full workflow from program definition through optimization to deployment.

### Pydantic AI Integration
The Pydantic integration uses `Agent.override(instructions=...)` with context variables for thread-safe, temporary instruction replacement during optimization cycles. Pydantic Evals provides parallel test case execution (up to 5+ concurrent evaluations), structured scoring with per-field metrics, and OpenTelemetry tracing via Logfire. The workflow involves three steps: initial evaluation (establish baseline), optimization with specified call budget, and side-by-side comparison. Separation of training and validation datasets prevents overfitting.

### DeepEval Integration
DeepEval by Confident AI provides a GEPA integration for LLM evaluation workflows, connecting GEPA's optimization loop with DeepEval's evaluation metrics for end-to-end prompt optimization within existing testing frameworks.

### Coding Agent Skills
The gskill pipeline (described above) converts repositories into training environments and evolves agent skills. Skills are repository-aware rather than universal, making them highly transferable across different agents operating on the same codebase.

### optimize_anything API
For non-prompt optimization (code, configurations, SVGs, CUDA kernels), the `optimize_anything()` function provides a simpler interface. The user supplies a seed candidate (any text), an evaluator function (returns float), and an objective description. GEPA handles the evolutionary search internally. Seedless mode is also supported: provide only an objective description and evaluator, and GEPA generates candidates from scratch.

### Production Deployments
50+ production uses across Shopify, Databricks, Dropbox, OpenAI, Pydantic, MLflow, Comet ML, and Google ADK. Databricks reported 90x cost reduction: open-source models + GEPA beat Claude Opus 4.1 on enterprise agent tasks. Arize AI published independent benchmarks comparing GEPA against prompt learning approaches, confirming the sample efficiency advantages. The Pydantic team published a detailed integration guide based on their own production use.

## Benchmarks & Performance

| Metric | Result |
|--------|--------|
| Speed vs RL | 35x faster (100-500 evals vs 5,000-25,000+ for GRPO) |
| vs GRPO (average) | +6% across six tasks, up to +20% on specific tasks |
| vs MIPROv2 | +10% accuracy, +12% on AIME-2025 specifically |
| Cost reduction | 90x cheaper (Databricks case: open-source + GEPA vs Claude Opus 4.1) |
| ARC-AGI accuracy | 32.5% -> 89.5% via architecture discovery |
| Coding agent (Jinja) | 55% -> 82% resolve rate (Mini-SWE), 93.9% -> 100% (Claude transfer) |
| Coding agent (Bleve) | 24% -> 93% resolve rate (Mini-SWE), 79.3% -> 98.3% (Claude transfer) |
| Cloud scheduling | 40.2% cost savings, beating expert heuristics |
| AIME 2025 | GPT-4.1 Mini: 46.67% -> 60.00% (+13.3 pp) via prompt optimization |
| MATH (DSPy) | 67% -> 93% via full program optimization |
| KernelBench (CUDA) | 87% match/beat baseline; 25% achieve 20%+ speedup |
| Circle Packing (n=26) | Score 2.63598+, competitive with AlphaEvolve/OpenEvolve |
| Pydantic extraction | 86.88% -> 96.88% accuracy via prompt refinement |

The paper (arxiv:2507.19457) provides formal analysis of convergence properties and sample efficiency relative to GRPO, demonstrating the theoretical basis for the 35x speedup. Accepted as an Oral at ICLR 2026.

---
entity_id: gepa
type: approach
bucket: self-improving
abstract: >-
  GEPA optimizes any text-representable system artifact (prompts, code, agent
  architectures) through evolutionary search guided by LLM-readable execution
  traces, converging 35x faster than RL-based alternatives while requiring no
  gradient computation.
sources:
  - repos/greyhaven-ai-autocontext.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
related:
  - Self-Improving Agents
last_compiled: '2026-04-05T20:32:20.209Z'
---
# GEPA (Genetic-Pareto Optimization)

## What It Does

GEPA is a Python framework that treats any text-representable artifact as a target for evolutionary optimization. Prompts, DSPy programs, CUDA kernels, SVG files, agent skill descriptions, cloud scheduling policies — if you can serialize it to a string and write a scoring function, GEPA can improve it.

The framework was accepted as an Oral at ICLR 2026 (arxiv:2507.19457). Production deployments include Shopify, Databricks, Dropbox, OpenAI, and Pydantic.

## What's Architecturally Unique

Most optimization approaches discard execution context. An RL training loop sees a scalar reward: 0.7. GRPO sees the same. GEPA instead captures the full execution trace — error messages, profiling data, intermediate outputs — and feeds that text to a reflection LLM that diagnoses *why* a candidate failed before proposing the next mutation.

This is the "Actionable Side Information" (ASI) concept. Standard RL "gradient" = `−0.3`. GEPA's effective gradient = "TimeoutError on line 42 when processing input with >500 tokens. The candidate has no chunking strategy." The reflection LLM then proposes a targeted fix rather than a random perturbation.

The second key mechanism: Pareto-efficient candidate selection. Rather than tracking a single best candidate (which converges to one strategy), GEPA maintains a frontier of candidates that each score highest on at least one evaluation instance. Specialists that excel on different task subsets coexist. A merge step then finds pairs of frontier candidates with complementary strengths and a common ancestor, asking the LLM to combine them.

## Core Mechanism

The optimization loop in `core/engine.py` follows seven stages per iteration:

**1. Select** — `CandidateSelector` samples from the Pareto frontier with probability proportional to coverage. This prevents stagnation in any single local optimum.

**2. Execute on Minibatch** — `BatchSampler` draws a training subset. The candidate runs through the adapter's `evaluate()` method with `capture_traces=True`. Every `oa.log()` call inside the evaluator becomes part of the ASI.

**3. Reflect** — `ReflectiveMutationProposer` sends execution traces to a reflection LLM (typically a stronger model than the one being optimized). The LLM reads raw diagnostics and proposes targeted fixes.

**4. Mutate** — `ReflectionComponentSelector` determines which components to update. `InstructionProposalSignature` structures the reflection prompt. `propose_new_texts()` generates the new candidate.

**5. Evaluate** — New candidate scores against the same minibatch. Promising candidates proceed to full validation.

**6. Accept** — `_run_full_eval_and_add` checks whether the candidate is non-dominated on the Pareto frontier. If so, it joins the pool. `GEPAState` tracks all candidates, scores, and parent lineage.

**7. Merge (periodic)** — `MergeProposer.find_common_ancestor_pair()` searches the lineage graph for frontier candidates that diverged from a common ancestor in different directions. The LLM combines their strengths. This is not random crossover — it requires the triplet to have "desirable predictors" (components where the two candidates diverged differently from their ancestor).

The `optimize_anything` API extends this to non-prompt artifacts:

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

Three modes: Single-Task Search (optimize one problem directly), Multi-Task Search (solve related problems simultaneously), Generalization (optimize for transfer to unseen examples via train/val split).

## Key Numbers

| Metric | Result | Source |
|--------|--------|--------|
| Speed vs GRPO | 35x fewer rollouts | Self-reported (ICLR paper) |
| Accuracy vs GRPO | +6% average, +20% peak | Self-reported |
| vs MIPROv2 | +10% accuracy | Self-reported |
| vs MIPROv2 on AIME-2025 | +12% | Self-reported |
| DSPy MATH benchmark | 67% → 93% | Self-reported |
| Pydantic contact extraction | 86.88% → 96.88% | Self-reported |
| Databricks cost reduction | 90x cheaper (open-source + GEPA vs Claude Opus) | Self-reported |
| Coding agent Jinja | 55% → 82% (Mini-SWE), 93.9% → 100% (Claude transfer) | Self-reported |
| CUDA kernels | 87% match/beat baseline; 25% achieve 20%+ speedup | Self-reported |
| ARC-AGI via architecture discovery | 32.5% → 89.5% | Self-reported |

**Credibility note:** All benchmarks are self-reported by the GEPA authors. The ICLR Oral acceptance provides some external validation of the core claims (35x speedup, convergence properties), but the production deployment numbers (Databricks cost reduction, gskill transfer results) lack independent verification. Arize AI published independent benchmarks confirming sample efficiency advantages — that's the closest to third-party validation currently available.

## Strengths

**Sample efficiency on complex multi-step tasks.** GEPA converges in 100–500 evaluations where GRPO requires 5,000–25,000+. For expensive evaluators (running a full agent pipeline, compiling and benchmarking CUDA), this difference determines whether optimization is practical at all.

**Cross-model skill transfer.** Skills evolved on `gpt-5-mini` transfer to Claude Haiku 4.5 with accuracy gains and latency reductions. This means you can run optimization on cheap models and deploy on expensive ones.

**Breadth of target artifacts.** The same framework that optimizes prompts also optimized CUDA kernels (KernelBench), circle packing algorithms (competitive with AlphaEvolve/OpenEvolve on n=26), cloud scheduling policies (40.2% cost savings), and SVG layouts. The `optimize_anything` API makes this accessible without custom adapter code.

**Complementary specialist preservation.** The Pareto frontier retains strategies that excel on different task subsets. This prevents the common failure mode where a global accuracy improvement destroys performance on specific edge cases.

## Critical Limitations

**Reflection LLM hallucination.** The reflection LLM may misdiagnose failure causes. If the evaluator's `oa.log()` calls are thin (just "failed"), the reflection LLM invents plausible-sounding but incorrect diagnoses, and the mutations don't address the real problem. There's no verification step between reflection and mutation. The entire 35x speedup claim rests on the reflection LLM correctly diagnosing failures — when it fails, you get misdirected search that may converge slower than RL.

**Unspoken infrastructure assumption:** GEPA assumes you can write a deterministic, callable scoring function for your artifact. Production systems often have soft dependencies (user feedback loops, A/B test results, delayed metrics) that can't be captured in a `Callable → float`. The framework also assumes your reflection LLM (GPT-5 or Claude class) is available and affordable at your optimization scale — the per-iteration cost includes multiple LLM calls before you see a single candidate score.

## When NOT to Use It

**Don't use GEPA when:**

- Your evaluation is cheap (< 1 second) and you have thousands of examples. Standard gradient-based fine-tuning or prompt search will be faster and more reliable.
- Your scoring function is non-deterministic or noisy. The Pareto frontier logic requires stable scores to make dominance checks meaningful. Noisy evaluators create phantom Pareto improvements.
- You need guaranteed convergence on a specific timeline. GEPA is evolutionary — iteration count and quality are both uncertain. For deadline-bound optimization, MIPRO or DSPy's built-in optimizers offer more predictable behavior.
- Your task is simple (retrieval, classification with clear labels). The Pydantic integration guide itself notes that simpler tasks benefit more from concise instructions than growing playbooks. ACE's incremental delta approach costs 82% less latency than GEPA on agent benchmarks where task complexity is moderate.
- Your objective space has more than 5 dimensions. The Pareto frontier can grow combinatorially, making selection and merge operations expensive. The framework lacks frontier pruning.

## Unresolved Questions

**Governance of the gskill pipeline at scale.** The gskill results (55% → 82% on Jinja, 24% → 93% on Bleve) are striking, but the documentation doesn't explain how to handle cases where evolved skills transfer well to one production model but regress on another. The cross-model transfer tests used two specific models — the failure conditions for transfer are uncharacterized.

**Cost at scale with expensive evaluators.** The documentation recommends setting `max_metric_calls` explicitly, but doesn't provide guidance on budget allocation between reflection LLM calls and task evaluation calls. For multi-objective optimization with many Pareto candidates, the evaluation budget scales in ways the documentation doesn't quantify.

**Stagnation detection.** The framework delegates stopping to the `stop_callback` protocol but has no built-in stagnation detection. If the Pareto frontier stops improving, GEPA continues iterating until budget exhaustion. The framework doesn't explain when to reduce the reflection LLM tier vs. reduce the minibatch size vs. declare convergence.

**Frontier resolution when candidate count is small.** The merge step requires common ancestors with divergent components. In early optimization stages with few candidates, merge opportunities may be rare. The framework falls back to reflection-only mutation, but the documentation doesn't specify how this affects convergence rate.

## Alternatives

| Scenario | Use Instead |
|----------|-------------|
| Continuous scores, large labeled dataset, simple prompt optimization | **DSPy MIPROv2** — deterministic, cheaper per iteration |
| Agent memory that evolves across runs without reoptimizing from scratch | **ACE** — 82% lower latency, incremental delta updates prevent context collapse |
| Harness code optimization (retrieval logic, routing, memory management) with full execution trace access | **Meta-Harness** — outperforms GEPA by 17.4 points on classification (50.0 vs 32.6 median accuracy), operates on code rather than text artifacts |
| Self-improving agent with persistent knowledge accumulation and distillation to local models | **Autocontext** — incorporates GEPA's ASI/Pareto concepts within a multi-agent architecture; better when you need playbook persistence and credit assignment across runs |
| Simple few-shot optimization with small candidate set | **DSPy BootstrapFewShot** — faster, no LLM calls for optimization itself |

Use GEPA when your evaluator is expensive (>10 seconds per call), your objective is complex (multi-objective or requires domain diagnosis), and you want the optimization to transfer across models without rerunning from scratch.

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md) — GEPA implements the evolutionary branch of this approach
- Autocontext directly incorporates GEPA's Pareto and ASI mechanisms in its `harness/optimizer/pareto.py` module and `ImprovementLoop`
- ACE and Meta-Harness both benchmark against GEPA as a baseline, providing independent (though adversarial) performance comparisons

## Sources

- [GEPA Repository Deep Analysis](../raw/deep/repos/gepa-ai-gepa.md)
- [Autocontext Repository Deep Analysis](../raw/deep/repos/greyhaven-ai-autocontext.md)
- [ACE Paper Analysis](../raw/deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)
- [Meta-Harness Paper Analysis](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md)

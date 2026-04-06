---
entity_id: gepa
type: approach
bucket: self-improving
abstract: >-
  GEPA (Genetic-Pareto) replaces RL reward signals with LLM-readable execution
  traces to evolve prompts, agent programs, and code artifacts 35x faster than
  GRPO with fewer evaluations.
sources:
  - repos/greyhaven-ai-autocontext.md
  - repos/laurian-context-compression-experiments-2508.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
related:
  - claude
last_compiled: '2026-04-06T02:02:30.060Z'
---
# GEPA (Generative Evolutionary Program/Prompt Adaptation)

**Type:** Self-improving agent approach  
**Paper:** arxiv:2507.19457 (Oral, ICLR 2026)  
**Related:** [Self-Improving Agents](../concepts/self-improving-agents.md) · [DSPy](../projects/dspy.md) · [Claude](../projects/claude.md) · [GRPO](../concepts/grpo.md) · [Prompt Engineering](../concepts/prompt-engineering.md) · [Reflexion](../concepts/reflexion.md) · [Agent Workflow Memory](../projects/agent-workflow-memory.md) · [EvoAgentX](../projects/evoagentx.md) · [Darwin Gödel Machine](../projects/darwin-godel-machine.md) · [Meta-Evolution](../concepts/meta-evolution.md) · [Execution Traces](../concepts/execution-traces.md)

---

## What It Is

GEPA is a framework for optimizing any text-parameterized system — prompts, agent programs, CUDA kernels, SVG files, retrieval configurations — by treating LLM-readable execution traces as the optimization signal instead of scalar rewards. The acronym expands in the codebase as "Genetic-Pareto," reflecting the two mechanisms that define it: evolutionary search (genetic) combined with multi-objective frontier tracking (Pareto).

The key differentiation from RL-based optimization: when a candidate fails, traditional RL collapses that failure into a number (0.3 vs 0.7). GEPA captures WHY it failed — the error message, the reasoning trace, the latency data — and feeds that diagnostic text to a reflection LLM that proposes a targeted fix. The authors call this "Actionable Side Information" (ASI). The result is directed search rather than random mutation, which the paper claims produces 35x fewer evaluations than GRPO to reach equivalent performance (self-reported, with formal convergence analysis in the paper).

GEPA has two primary APIs: `gepa.optimize()` for prompt optimization with train/val splits, and `gepa.optimize_anything()` for optimizing any text artifact with an evaluator function.

---

## Core Mechanism

The optimization loop lives in `src/gepa/core/engine.py` (`GEPAEngine`). Each iteration runs through seven stages:

**1. Select** — A `CandidateSelector` samples from the Pareto frontier, drawing candidates proportional to their task coverage. Sampling from the frontier rather than just the global best prevents local optima by preserving specialists that excel on specific task subsets.

**2. Execute on Minibatch** — The `BatchSampler` draws a subset of training examples. The selected candidate runs against them, capturing full execution traces via `capture_traces=True`. Each `oa.log()` call in the evaluator appends to these traces.

**3. Reflect** — `proposer/reflective_mutation/reflective_mutation.py` sends the traces to a reflection LLM (configured via `reflection_lm`, typically a more capable model than the task LLM). The reflection LLM reads raw failures and proposes targeted changes. `adapter.make_reflective_dataset()` formats traces into a structure the reflection LLM can reason over.

**4. Mutate** — `propose_new_texts()` generates a new candidate. `ReflectionComponentSelector` determines which components to update. `InstructionProposalSignature` structures the reflection prompt.

**5. Evaluate** — The new candidate runs on the same minibatch. Only candidates that improve pass to full validation.

**6. Accept** — `_run_full_eval_and_add` checks whether the new candidate belongs on the Pareto frontier (non-dominated across per-example scores tracked in `ValsetEvaluation` keyed by data ID). `GEPAState` records candidate content, scores, and parent lineage.

**7. Merge** — `proposer/merge.py` periodically finds Pareto-frontier pairs that (a) share a common ancestor, (b) both outperform that ancestor, and (c) diverged in different components. `find_common_ancestor_pair()` searches the lineage graph for these triplets. The reflection LLM then combines their complementary strengths. This is targeted recombination, not random crossover.

### Actionable Side Information

The ASI interface is the mechanism that makes GEPA's efficiency claims credible. In the evaluator:

```python
def evaluate(candidate: str) -> float:
    result = run_pipeline(candidate)
    oa.log(f"Output: {result.output}")
    oa.log(f"Error: {result.error}")
    oa.log(f"Latency: {result.latency_ms}")
    return result.score
```

Those logs reach the reflection LLM verbatim. Instead of inferring from a scalar that "something went wrong with long inputs," the reflection LLM reads "TimeoutError on line 42 when processing input with >500 tokens" and proposes "add a chunking strategy for long inputs." Four ASI forms exist: free-form text (via `oa.log()`), structured data dictionaries, multi-objective scores, and rendered images (via `gepa.Image`) for vision-capable reflection models optimizing visual artifacts.

### Pareto Frontier Management

`GEPAState` maintains a Pareto frontier where candidate A dominates candidate B if A scores ≥ B on all tasks and strictly better on at least one. The frontier holds all non-dominated candidates. `FrontierType` controls whether dominance is checked at the instance level (per evaluation example) or objective level (per score dimension). This prevents the common failure mode where a generalist candidate displaces specialists, then the generalist stops improving because no single approach handles all task types.

### Evaluation Caching

`EvaluationCache` in `core/state.py` stores results by `(candidate_content, data_id)` pairs. When candidates are re-evaluated on overlapping minibatches during Pareto updates, cached results prevent redundant evaluator calls.

---

## Key Numbers

All figures below are self-reported in the GEPA paper (arxiv:2507.19457) unless noted.

| Metric | Result | Source |
|--------|--------|--------|
| Speed vs GRPO | 35x fewer rollouts | Self-reported, with formal convergence analysis |
| vs GRPO accuracy | +6% average, up to +20% on specific tasks | Self-reported |
| vs MIPROv2 | +10% accuracy, +12% on AIME-2025 | Self-reported |
| ARC-AGI | 32.5% → 89.5% via architecture discovery | Self-reported |
| Coding agent (Bleve) | 24% → 93% (Mini-SWE), 79.3% → 98.3% (Claude Haiku transfer) | Self-reported |
| Coding agent (Jinja) | 55% → 82% (Mini-SWE), 93.9% → 100% (Claude Haiku transfer) | Self-reported |
| CUDA kernels (KernelBench) | 87% match/beat baseline; 25% achieve 20%+ speedup | Self-reported |
| Databricks cost reduction | 90x cheaper than Claude Opus 4.1 | Case study, self-reported |
| Pydantic extraction | 86.88% → 96.88% accuracy | Pydantic team integration guide |
| MATH (DSPy adapter) | 67% → 93% via full program optimization | Self-reported |

Arize AI published independent benchmarks confirming sample efficiency advantages. Pydantic's detailed integration guide (based on their own production use) validates the extraction accuracy figures. The 35x speedup vs GRPO has formal convergence backing in the paper but has not been independently replicated in external benchmarks as of this writing.

---

## Strengths

**Sample efficiency on text optimization tasks.** The ASI mechanism genuinely changes the search dynamic. Random mutation of prompts requires many evaluations to stumble onto improvements; directed mutation based on failure diagnostics converges faster. This is the design choice with the clearest empirical backing.

**Cross-model skill transfer.** Skills evolved on `gpt-5-mini` transfer to Claude Haiku 4.5 with accuracy and latency improvements. This means optimization can run on cheap models and deploy on expensive ones — a meaningful cost structure for production.

**Breadth of the `optimize_anything` API.** The same loop that optimizes prompts can optimize CUDA kernels, SVG files, circle-packing algorithms, and retrieval configurations. The user supplies a seed artifact, an evaluator function, and an objective string. GEPA handles the rest.

**Reflection learns high-level rules, not just patches.** Because the reflection LLM articulates WHY something failed, the resulting mutations tend to encode transferable principles rather than overfitting to specific failure examples. The Pydantic case demonstrates this: GEPA discovered guidelines about null-value semantics and primary contact identification that a human prompt engineer would have written deliberately.

---

## Critical Limitations

**ASI quality is the primary bottleneck.** If the evaluator's `oa.log()` calls are thin ("failed") or absent, the reflection LLM operates on effectively no diagnostic signal and falls back to random-ish mutation. The paper's results assume rich, structured traces. Teams that implement GEPA with minimal logging will see much weaker performance. The Pydantic guide explicitly emphasizes this: observability via Logfire is treated as essential infrastructure, not optional.

**Unspoken infrastructure assumption: you need a capable reflection LLM.** The paper uses GPT-5 or Claude as the reflection model. Teams assuming they can run GEPA with the same cheap model they're optimizing will get degraded results. The two-model architecture (cheap task LLM, expensive reflection LLM) is implicit in the design but not prominently documented. Budget calculations that assume a single model tier will underestimate costs.

---

## When NOT to Use GEPA

**Your domain lacks execution feedback.** GEPA's label-free mode works when evaluators can return meaningful scalars from execution outcomes (code compilation, API success, test passage). For subjective tasks — writing quality, strategic planning, creative generation — without labeled data or a reliable judge, the optimization signal degrades and the reflection LLM has nothing to work with.

**You need low per-iteration cost at scale.** Each iteration requires at minimum: one task execution per minibatch example, one reflection LLM call, one mutation call, and a full validation run for accepted candidates. For expensive evaluators (full agent pipelines, long code execution), cost accumulates fast. ACE's incremental delta approach achieves 82-92% lower adaptation latency than GEPA in [Context Engineering](../concepts/context-engineering.md) scenarios precisely because it avoids full-context re-evaluation each round.

**You need a simple prompt improvement, not a learning system.** GEPA's Pareto frontier management, candidate lineage tracking, and merge logic add engineering overhead that is not justified for one-off prompt refinements. For those use cases, a simpler approach (manual iteration, few-shot examples, direct prompt rewriting) is faster to set up and cheaper to run.

**Your Pareto space is high-dimensional.** The framework has no frontier pruning. For optimization problems with 10+ evaluation dimensions, the Pareto frontier can grow large, making dominance checking and merge candidate selection computationally expensive. Practical deployments should limit to 3-5 evaluation dimensions.

---

## Unresolved Questions

**How does the reflection LLM's diagnosis get validated?** The proposer can misattribute failure causes, and there is no verification step between reflection and mutation. The paper does not address how often the reflection LLM hallucinates plausible-sounding but incorrect diagnoses, nor how this rate varies with reflection model capability.

**Governance of the gskill pipeline at scale.** The gskill workflow (SWE-smith generates training tasks, GEPA evolves skills) automatically generates ~300 tasks per repository and evolves skills against them. There is no documentation on how to audit what skills the system has learned, how to detect if evolved skills encode repository-specific heuristics that break on out-of-distribution inputs, or how to manage skill deprecation when the target repository changes.

**Merge frequency and its impact on convergence.** The merge step has preconditions (common ancestor with desirable predictors, divergent components). The framework falls back to reflection-only mutation when merge preconditions are not met. There is no published analysis of how often this fallback occurs in practice, or how merge frequency affects overall convergence rate.

**Cost at scale in multi-objective settings.** Validating new candidates against the full Pareto frontier grows more expensive as the frontier expands and the validation set grows. There is no published guidance on when frontier growth becomes a practical bottleneck or what pruning strategies exist.

---

## Alternatives

| When | Use |
|------|-----|
| You need context evolution without full re-evaluation cost | [ACE (Agentic Context Engineering)](../concepts/context-engineering.md) — 82% lower latency via incremental delta updates |
| You need to optimize entire harness code (retrieval logic, memory management), not just prompts | Meta-Harness — gives a coding agent access to full execution traces and prior harness implementations |
| You need structured program synthesis with gradient-based prompt optimization | [DSPy](../projects/dspy.md) — GEPA is available as `dspy.GEPA`, but DSPy's native optimizers suit simpler declarative programs |
| You need continuous self-improvement with episodic memory across sessions | [Letta](../projects/letta.md) or [Mem0](../projects/mem0.md) — GEPA optimizes artifacts, not agent memory |
| You need evolutionary agent architecture search across longer timescales | [Darwin Gödel Machine](../projects/darwin-godel-machine.md) — modifies agent code, not just prompts |
| You need multi-agent orchestration with persistent knowledge playbooks | [AutoResearch](../projects/autoresearch.md) / Autocontext — GEPA-inspired Pareto optimization embedded in a five-agent harness |

---

## Ecosystem Position

GEPA occupies the prompt/artifact optimization layer of the self-improvement stack. It does not modify agent memory ([Agent Memory](../concepts/agent-memory.md)), agent code (DGM), or agent architecture. It modifies the text artifacts — prompts, instructions, program text — that control what agents do. This makes it composable: teams run GEPA offline to discover optimized prompts, then deploy those prompts statically in production. The gskill pipeline extends this to repository-specific agent skills, which transfer across model families.

The 50+ reported production deployments (Shopify, Databricks, Dropbox, Pydantic) suggest the approach has cleared the "works in a demo" bar. The 90x cost reduction figure from Databricks is the most striking production claim, though it compares open-source model + GEPA against Claude Opus 4.1 alone — a comparison that conflates model cost reduction with optimization benefit.

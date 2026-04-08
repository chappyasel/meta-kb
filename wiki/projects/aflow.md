---
entity_id: aflow
type: project
bucket: self-improving
abstract: >-
  AFlow searches over agentic workflow structures using MCTS to find
  high-performing operator compositions automatically, replacing hand-designed
  agent pipelines with cost-tracked search. Accepted as oral at ICLR 2025.
sources:
  - repos/foundationagents-metagpt.md
  - deep/repos/evoagentx-evoagentx.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related: []
last_compiled: '2026-04-08T02:57:27.936Z'
---
# AFlow

## What It Does

AFlow automates the design of agentic workflows. Instead of manually composing operators (answer generation, self-consistency ensembling, code execution, reflection) into a pipeline, AFlow searches that space using Monte Carlo Tree Search and LLM-generated code mutations to find configurations that score well on a target benchmark.

The core bet: workflow topology is a first-class optimization variable, not scaffolding. Most agent frameworks treat the pipeline as fixed and optimize only prompts or few-shot examples. AFlow treats the structure itself as searchable.

AFlow originated inside [MetaGPT](../projects/metagpt.md) and was accepted as an oral presentation (top 1.8%) at ICLR 2025, ranking #2 in the LLM-based Agent category. It has since been adopted as one of the core optimizers in [EvoAgentX](../projects/evoagentx.md).

## Core Mechanism

AFlow represents workflows as Python `Workflow` classes. The `__init__` method instantiates operators; the `async def __call__` method composes them into a solution pipeline. This representation is deliberately code-native: a workflow can contain loops, conditionals, and arbitrary control flow, not just linear chains.

**The optimization loop:**

1. The optimizer LLM receives: accumulated modification history with scores, the top-scoring prior round's code and prompts, operator descriptions with interface signatures, error logs from failed evaluations, and a prompt instructing it to reconstruct and optimize the graph.

2. The LLM generates a response with `<modification>`, `<graph>`, and `<prompt>` sections. The graph code is written to `round_N/graph.py`, prompts to `round_N/prompt.py`.

3. Import paths are updated via `graph_utils.update_prompt_import()`. The new graph is dynamically loaded and executed against the benchmark.

4. `ConvergenceUtils.check_convergence()` monitors top-3 scores across rounds and stops when they plateau.

**Operator primitives** available to the LLM: `Custom` (arbitrary prompt → response), `AnswerGenerate` (chain-of-thought with thought + answer fields), `QAScEnsemble` (self-consistency voting), `ScEnsemble` (with problem context), `Test` (code verification against test cases), `CodeGenerate`, `Programmer`, and `Reflection` (self-review with test feedback). These compose freely, so the LLM can discover patterns like "generate 3 solutions → ensemble → reflect on errors → regenerate."

**Experience accumulation** is what makes this more than random search. Each round's modification, score, and outcome feed into the next round's context. The optimizer learns which structural patterns improve performance and which cause runtime errors.

**Cost tracking** is built-in. AFlow tracks dollar costs per evaluation round via the LLM cost tracking infrastructure in `evaluation_utils.py`, making the quality-cost tradeoff explicit rather than implicit.

## Key Numbers

- **ICLR 2025 oral** (top 1.8%, #2 in LLM-based Agent category) — peer-reviewed, though benchmark results are self-reported
- **Default budget**: 20 max rounds, 5 validation evaluations per round — roughly 500+ executor LLM calls per optimization run
- EvoAgentX reports **+7-20% improvement** on HotPotQA, MBPP, MATH, and GAIA using AFlow as one of its optimizers (self-reported; comparison is optimized vs. unoptimized EvoAgentX, not against other frameworks)
- No published head-to-head benchmarks against AutoGen, LangGraph, or DSPy workflows exist

## Strengths

**Structural expressiveness.** Because workflows are Python code, AFlow can discover non-obvious patterns: generate-then-ensemble, iterative refinement with test feedback, conditional branching based on intermediate results. Hand-designed workflows rarely explore this space systematically.

**Cost-aware search.** Tracking dollars per round during optimization makes AFlow one of the few systems where you can reason about optimization budget explicitly. The quality-cost tradeoff (formalized in the related survey as `max E[R(tau; x) - lambda * C(tau)]`) is measurable, not aspirational.

**Experience-driven mutation.** Accumulated history of what worked and what failed gives the optimizer signal that random structural search lacks. Over rounds, it converges on configurations that avoid known failure patterns.

**Strong verifier support.** For code generation tasks, test cases provide hard binary feedback. AFlow's `Test` operator integrates this directly, and the survey evidence suggests hard verifiers dramatically improve search efficiency by rejecting invalid candidates immediately.

## Critical Limitations

**Code generation reliability is the core fragility.** `_parse_optimizer_llm_output()` extracts graph code using regex matching for XML tags and code blocks. When parsing fails, it returns the original graph with `modification = "No modification due to error in LLM output"`. The `_execute_with_retry()` wrapper retries up to 3 times with exponential backoff (5*N seconds). The optimization prompt explicitly warns the LLM to produce "complete and correct" code to avoid runtime failures — a warning that is necessary precisely because failures are common.

**Unspoken infrastructure assumption: a fixed, known operator set.** AFlow can compose operators flexibly, but the operator library itself is static. If your task requires novel tool types (database queries, browser automation, multimodal inputs), you must manually add operators before running search. AFlow searches *within* the design space you define; it does not expand that space.

## When Not to Use It

**Short, stable, homogeneous tasks.** If your task decomposition is obvious and consistent across inputs, a hand-designed static pipeline optimized with [DSPy](../projects/dspy.md)'s prompt optimization will cost far less and produce a more interpretable result. AFlow's 500+ LLM calls per optimization run at $5-50 per run is hard to justify when you already know the structure works.

**When you need workflow transparency.** Generated Python code is harder to audit, version, and explain to stakeholders than a declarative workflow definition. If your deployment requires human sign-off on workflow logic or regulatory traceability, AFlow's code-generation approach creates compliance friction.

**Without good feedback signal.** AFlow works best with hard verifiers (unit tests, schema validators). On tasks where feedback is only downstream accuracy — no intermediate verification, no structural feedback — the optimization loop becomes noisy, round budgets inflate, and convergence is unreliable.

**Real-time applications.** AFlow is an offline optimization tool. The search runs before deployment, not at inference time. If your task distribution shifts significantly after deployment, there is no incremental re-optimization path; you restart from scratch.

## Unresolved Questions

**Cross-benchmark transfer.** Optimized workflows are task- and benchmark-specific. There is no published analysis of whether a workflow optimized on HotPotQA transfers to related QA tasks, or whether learned structural patterns generalize across domains.

**Optimization cost at scale.** The $5-50 per run estimate assumes small benchmarks and inexpensive executor models. For large evaluation sets or expensive frontier models, optimization cost could reach hundreds of dollars per run. No published cost analysis exists for realistic production scenarios.

**Operator authorship and governance.** The operator library defines the searchable design space, but there is no guidance on how to design operators, what granularity is appropriate, or how to manage operator versioning as underlying model capabilities change.

**Conflict resolution between experience and exploration.** The optimizer LLM uses accumulated history to guide mutations, but there is no explicit exploration-exploitation balance. Whether the system gets stuck in local optima as experience accumulates is not documented.

**Integration with dynamic runtime behavior.** AFlow finds good static templates. The related survey distinguishes static templates from runtime-realized graphs. There is no mechanism to combine AFlow's offline search with per-query dynamic adaptation.

## Alternatives

**[DSPy](../projects/dspy.md)** — Use when workflow structure is known and the problem is prompt/few-shot optimization within that structure. Much cheaper per optimization run. No structural search, but far more predictable.

**[EvoAgentX](../projects/evoagentx.md)** — Use when you want AFlow's structural search alongside TextGrad, MIPRO, or evolutionary prompt optimization in a unified framework. EvoAgentX wraps AFlow's optimizer and adds the other paradigms, at the cost of integration complexity.

**[MetaGPT](../projects/metagpt.md)** — Use when the task is software generation with role-based decomposition (product manager, architect, engineer). MetaGPT's SOP-encoded roles are the origin of AFlow; it remains the reference for role-structured multi-agent coordination.

**[LangGraph](../projects/langgraph.md)** — Use when you need a hand-designed workflow with explicit state management, human-in-the-loop checkpoints, and debuggable execution traces. No automatic search, but far better observability and control.

**Manual design + [ReAct](../concepts/react.md)** — Use for exploratory, open-ended tasks where the right decomposition is unknowable in advance and per-step tool selection matters more than pre-optimized structure.

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md) — AFlow is a workflow-level self-improvement mechanism
- [Prompt Optimization](../concepts/prompt-optimization.md) — AFlow extends prompt optimization to structural optimization
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — the workflows AFlow optimizes are multi-agent pipelines
- [Execution Traces](../concepts/execution-traces.md) — AFlow uses error logs from traces to guide subsequent mutations
- [LLM-as-Judge](../concepts/llm-as-judge.md) — the optimizer LLM plays an evaluative and generative role simultaneously
- [Chain-of-Thought](../concepts/chain-of-thought.md) — `AnswerGenerate` operator encodes CoT as a composable primitive

---
entity_id: evoagentx
type: project
bucket: self-improving
abstract: >-
  EvoAgentX is a Python framework that unifies five optimization algorithms
  (TextGrad, AFlow, MIPRO, EvoPrompt, SEW) to automatically evolve multi-agent
  workflow prompts and structures against task benchmarks, reporting 7-20% gains
  on HotPotQA, MBPP, MATH, and GAIA.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - repos/evoagentx-evoagentx.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/evoagentx-evoagentx.md
related:
  - retrieval-augmented-generation
last_compiled: '2026-04-08T02:49:46.613Z'
---
# EvoAgentX

**Type:** Project | **Domain:** Self-Improving Agents, Multi-Agent Systems
**Repository:** [EvoAgentX/EvoAgentX](https://github.com/EvoAgentX/EvoAgentX)
**Stars:** ~2,700 | **License:** MIT | **Language:** Python

---

## What It Does

EvoAgentX builds, evaluates, and optimizes LLM-based multi-agent workflows in an automated loop. Given a goal, it can auto-construct a workflow from scratch, run it against a benchmark, measure performance, and iteratively mutate prompts or graph topology to improve results. The central claim: agents should rewrite how they work, not just what they output.

The architecturally distinctive move is bundling five distinct optimization paradigms into a single framework — gradient-based text optimization, evolutionary code generation, Bayesian prompt search, population-based prompt evolution, and sequential workflow mutation — all sharing the same agent execution runtime, benchmark infrastructure, and evaluation harness. No prior open framework unified these approaches against a common API.

---

## Architecture

The codebase (`evoagentx/`) follows a five-layer stack built on Pydantic `BaseModule` for serialization throughout.

**Agents** (`evoagentx/agents/`): Each `Agent` holds an LLM reference, a `ShortTermMemory` message buffer, optional `LongTermMemory` (RAG-backed), and a list of `Action` objects wrapping `PromptTemplate` + `LLMOutputParser`. Execution path: `Agent.execute(action_name, input)` → render prompt → `llm.generate()` → package result as `Message`. The `AgentManager` maintains thread-safe agent state with `threading.Lock` and per-agent `threading.Condition` objects, suggesting parallel execution was planned but never wired into the runtime.

**Workflow** (`evoagentx/workflow/`): `WorkFlowGraph` wraps a NetworkX `MultiDiGraph`. Nodes are `WorkFlowNode` instances with typed input/output `Parameter` lists, agent assignments, and state tracking. `WorkFlowGraph.next()` returns all nodes whose predecessors are complete. The `WorkFlow` executor calls `get_next_task()` then `execute_task()` in a sequential loop — despite the graph supporting parallel-ready branches, only one task runs at a time.

**Environment blackboard** (`evoagentx/workflow/environment.py`): All inter-agent communication flows through an `Environment` object. It accumulates a `trajectory` of `TrajectoryStep` records and an `execution_data` dict that downstream tasks read as input. Agents never call each other directly.

**Optimization** (`evoagentx/optimizers/`): Five concrete optimizer implementations share an abstract interface with `optimize(dataset)`, `step()`, `evaluate(dataset)`, and `convergence_check()`.

**Evaluation** (`evoagentx/evaluators/`, `evoagentx/benchmark/`): `Evaluator` iterates over benchmark examples via `ThreadPoolExecutor`, calls the workflow, and scores via `benchmark.evaluate(prediction, label)`. Eight benchmarks are implemented: HotPotQA (F1), HumanEval/MBPP (pass@k), GSM8K/MATH (exact match), GAIA (overall), BigBenchHard, and `WorfBench` — a meta-benchmark that scores workflow quality itself.

---

## Core Mechanism: The Five Optimizers

The central loop is: construct workflow → evaluate against benchmark → mutate workflow → re-evaluate → iterate. Each optimizer targets a different level of the abstraction stack.

### SEW (Self-Evolving Workflow) — `sew_optimizer.py`
Works on `SequentialWorkFlowGraph`, a subclass enforcing linear chains with automatic edge inference. Serializes the workflow to one of five text formats (Python dict, YAML, Code DSL, BPMN XML, or a custom "Core" format), injects a random mutation prompt from 57 predefined strategies (ranging from "elaborate on the instruction" to "think well outside the box") plus one of 40 thinking styles, sends it to the optimizer LLM, and parses the result back into a new graph. Falls back to the original graph on parse failure. **Limitation:** SEW only works with sequential graphs — no branching or conditional paths.

### AFlow — `aflow_optimizer.py`
Adapted from MetaGPT's AFlow. The workflow is a Python `Workflow` class. The optimizer LLM receives accumulated round history, top-scoring previous code, operator descriptions, and error logs from `DataUtils.load_log()`, then generates a new `<graph>` and `<prompt>` in Python. Code is written to `round_N/graph.py` and dynamically loaded. `ConvergenceUtils.check_convergence()` monitors top-3 scores across rounds and stops on plateau. Available operator primitives: `Custom`, `AnswerGenerate`, `QAScEnsemble`, `ScEnsemble`, `Test`, `CodeGenerate`, `Programmer`, `Reflection`. These compose freely — the LLM can discover patterns like generate-3→ensemble→reflect→regenerate.

### TextGrad — `textgrad_optimizer.py`
Wraps the TextGrad library. Converts each agent's system prompt and action instruction into `textgrad.Variable` objects. `TextGradEngine` adapts EvoAgentX's `BaseLLM` to TextGrad's `EngineLM` interface. Loss functions are task-specific: `CODE_LOSS_PROMPT` for code generation, `GENERAL_LOSS_PROMPT` for QA, `NO_ANSWER_LOSS_PROMPT` for open tasks. The optimizer runs forward pass → compute loss → backward pass (textual gradient via LLM) → `TextualGradientDescent` update. Maintains snapshots for rollback if score degrades.

### EvoPrompt — `evoprompt_optimizer.py`
Re-implements the EvoPrompt paper. Maintains `node_populations` (prompt variant lists per node), `node_scores`, and a hash-keyed `_eval_cache`. Initializes via a `ParaphraseAgent` generating semantically equivalent variants. Evolves through GA/DE operations across generations, with `early_stopping_patience` to halt on stagnation.

### MIPRO — `mipro_optimizer.py`
Wraps DSPy's `MIPROv2` via a complex adapter layer: `MiproLMWrapper` adapts `BaseLLM` to `dspy.LM`, `MiproRegistry` maps workflow nodes to DSPy signatures, `PromptTuningModule` wraps execution as a DSPy module. Uses Optuna's Bayesian TPE search to jointly select few-shot demonstrations and instruction variants, with light/medium/heavy intensity presets.

### Workflow Auto-Construction
`WorkFlowGenerator` → `TaskPlanner` decomposes a natural language goal into `TaskPlanningOutput` with typed subtask dependencies → `build_workflow_from_plan()` constructs the graph → `AgentGenerator` creates agent definitions per node via LLM calls. Every step uses `_execute_with_retry()` with exponential backoff.

---

## Key Numbers

| Benchmark | Task | Improvement |
|-----------|------|-------------|
| HotPotQA | Multi-hop QA | +7.44% F1 |
| MBPP | Code generation | +10.00% pass@1 |
| MATH | Reasoning | +10.00% solve rate |
| GAIA | Real-world tasks | up to +20.00% |

These compare optimized vs. unoptimized EvoAgentX workflows, not against other frameworks. **Self-reported** (arXiv:2507.03616). No independent validation, no head-to-head comparisons against AutoGen, CrewAI, or LangGraph. The paper was published in July 2025.

Applied to external frameworks on GAIA: EvoAgentX optimized prompts for Open Deep Research and OWL (an external multi-agent system), producing reported score improvements — also self-reported with full optimization runs published in linked forks.

---

## Strengths

**Optimizer breadth in one runtime.** Prompt-level (TextGrad, EvoPrompt, MIPRO), topology-level (SEW), and full code-level (AFlow) optimization all share the same benchmark and evaluation infrastructure. Switching optimizers requires changing one class instantiation.

**Pre-built benchmark integration.** Eight benchmarks with domain-appropriate metrics are ready to use. HotPotQA F1, pass@k for code, and exact match for math don't need custom scaffolding.

**Tool ecosystem.** 30+ built-in tools cover Python execution (sandboxed and Docker-isolated), six search providers, browser automation (Playwright-based), databases (PostgreSQL, MongoDB, FAISS), image generation, Gmail, Telegram, MCP client integration, and financial data. Tools attach to agents via `tool_names` in config, resolved by `AgentManager`.

**Pydantic-native serialization.** Every workflow, agent, and action graph serializes to JSON via `save_module()` / `from_file()`. Pre-built workflow examples in `Wonderful_workflow_corpus/` (arxiv digest, stock analysis, travel recommendation) load and run directly.

**External framework optimization.** The MIPRO and TextGrad adapters demonstrate the framework can optimize externally-built agent systems (Open Deep Research, OWL) without requiring a full rewrite into EvoAgentX idioms.

---

## Critical Limitations

**`WorkFlowController` is a stub.** `controller.py` defines `WorkFlowController` with `agent_manager`, `workflow`, and `optimizers` fields. Its `start()` method is `pass`. This was the natural integration point for combining live workflow execution with ongoing optimization. It does not exist. The optimization loop must be manually orchestrated.

**`eval()` on LLM-generated code in `parse_workflow_python_repr()`.** The SEW optimizer parses workflow Python representations by calling `eval(code_block.replace("steps = ", "").strip())` on LLM output. In any deployment where the optimizer LLM's output is not fully controlled, this is an arbitrary code execution vector.

**Unspoken infrastructure assumption: API budget.** An AFlow optimization run with 20 rounds, 5 validation evaluations per round, and a 5-step workflow produces 500+ executor LLM calls plus 20+ optimizer LLM calls. The framework tracks `avg_cost` and `total_cost` per round in `evaluation_utils.py` but does not expose cost-capping as a constraint. There is no dollar-limit stopping criterion.

**Sequential execution despite parallel-capable graph.** `WorkFlow.async_execute()` processes one task at a time despite `WorkFlowGraph.next()` returning all ready tasks. Workflows with independent parallel branches execute sequentially.

---

## When Not to Use It

**Latency-sensitive production deployments.** Optimization runs are offline, expensive, and measured in hundreds of LLM calls. The framework has no online adaptation during inference.

**Workflows requiring parallel agent execution.** The runtime is strictly sequential. If your use case needs concurrent tool calls or simultaneous agent branches, EvoAgentX's executor will serialize them.

**When you need to understand why an optimized prompt works.** The evolution algorithms produce improved prompts without explanation. AFlow changes Python code structure; TextGrad applies textual gradients. Neither produces human-interpretable justifications for changes.

**When the task distribution shifts after optimization.** There is no incremental re-optimization. A shift in task distribution requires re-running the full optimization loop from scratch.

---

## Unresolved Questions

**No meta-optimizer.** The five optimizers are independent tools. Nothing selects which to apply, sequences them, or transfers knowledge between runs. Whether combining TextGrad's gradient refinement with AFlow's structural mutation in a single loop is beneficial — and how to do it — is unanswered.

**Governance of the `NOASSERTION` license.** The repository README states MIT license, but the repository metadata shows `NOASSERTION`. Which governs commercial use is unclear.

**Cost characteristics at scale.** No published benchmarks for token cost, latency, or cost-per-percentage-improvement exist. The infrastructure for tracking this is present (`evaluation_utils.py`) but results are not published.

**Population diversity in EvoPrompt.** The optimizer tracks `_generations_without_improvement` but has no diversity metric for the prompt population. Whether the population collapses to near-identical variants before early stopping triggers is undocumented.

**HITL and optimization don't interact.** Humans can intercept agent execution at `PRE_EXECUTION` and `POST_EXECUTION` checkpoints, but cannot provide feedback during optimization, set constraints interactively, or inject gradient signals into the optimizer. The two systems are completely separate.

---

## Alternatives

| Framework | When to prefer it |
|-----------|-------------------|
| [DSPy](../projects/dspy.md) | Prompt optimization with clean abstractions and active research community; use when you want MIPRO/COPRO without the multi-agent execution overhead |
| [AFlow](../projects/aflow.md) | Use the original AFlow implementation from MetaGPT when you only need code-level workflow evolution without the broader EvoAgentX runtime |
| [AutoGen](../projects/autogen.md) | Mature multi-agent conversation framework with parallel execution and better production story; use when you don't need automated self-optimization |
| [MetaGPT](../projects/metagpt.md) | Structured multi-agent with software engineering focus; use when role-based coordination matters more than automated optimization |
| [LangGraph](../projects/langgraph.md) | Production-grade graph-based workflow with parallel execution and observability; use when you need branching/conditional logic with actual parallelism |

---

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md) — EvoAgentX is a concrete implementation of the self-improvement loop pattern
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — The workflow graph model and blackboard coordination pattern
- [Prompt Optimization](../concepts/prompt-optimization.md) — Three of the five optimizers operate at the prompt level
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — Used in the long-term memory module and `RealMMRAG` benchmark
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — AFlow draws on RL-style exploration; EvoPrompt uses evolutionary selection analogous to population-based RL
- [Agent Workflow Memory](../projects/agent-workflow-memory.md) — Related framework for workflow reuse from execution traces
- [AgentEvolver](../projects/agentevolver.md) — Complementary self-evolution approach using trajectory-based credit assignment rather than benchmark-driven optimization

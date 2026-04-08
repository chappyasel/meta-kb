---
entity_id: evoagentx
type: project
bucket: self-improving
abstract: >-
  EvoAgentX is an open-source Python framework that unifies five optimization
  algorithms (TextGrad, AFlow, SEW, EvoPrompt, MIPRO) into a single loop for
  automatically evolving multi-agent workflow prompts and topology against task
  benchmarks.
sources:
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/evoagentx-evoagentx.md
  - repos/evoagentx-evoagentx.md
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
related:
  - retrieval-augmented-generation
last_compiled: '2026-04-08T23:06:52.122Z'
---
# EvoAgentX

**Type:** Project — Self-Improving Agent Framework
**Repository:** [EvoAgentX/EvoAgentX](https://github.com/EvoAgentX/EvoAgentX)
**Stars:** ~2,700 (as of mid-2025)
**Language:** Python
**License:** MIT
**Paper:** arXiv:2507.03616

---

## What It Does

EvoAgentX automates the process of improving multi-agent workflows. You describe a goal, the framework constructs a workflow graph, runs it against a benchmark, scores the output, and then applies one of five optimization algorithms to mutate prompts or graph topology. The next round uses the mutated workflow, and the cycle repeats until convergence or budget exhaustion.

The core differentiator is optimizer plurality: TextGrad, [AFlow](../projects/aflow.md), a custom SEW (Self-Evolving Workflow) algorithm, EvoPrompt, and a [DSPy](../projects/dspy.md) MIPRO wrapper all ship in the same package, each operating at a different level of abstraction (prompt text only, graph topology, or full Python code generation). No other open-source framework bundles all five with a shared evaluation harness.

Related: [Self-Improving Agents](../concepts/self-improving-agents.md), [Multi-Agent Systems](../concepts/multi-agent-systems.md), [Prompt Optimization](../concepts/prompt-optimization.md), [AFlow](../projects/aflow.md)

---

## Architecture

Five layers, all built on Pydantic `BaseModule` for typed configuration and JSON serialization:

**Core** (`evoagentx/core/`): `BaseModule` with `save_module()`/`load_module()` lifecycle hooks. `Message` carries workflow communication (content, type, workflow goal, task name, agent name, timestamp). `MODEL_REGISTRY` and `MODULE_REGISTRY` enable dynamic instantiation from saved configs.

**Agents** (`evoagentx/agents/`): `Agent` holds an LLM reference, a `ShortTermMemory` (message buffer local to one execution), optional `LongTermMemory` (RAG-backed persistent store), and `Action` objects (each wrapping a `PromptTemplate` with typed I/O and an `LLMOutputParser`). `AgentManager` tracks `AgentState.AVAILABLE`/`RUNNING` with `threading.Lock` for atomic transitions. `AgentGenerator` (a meta-agent) creates new agent definitions via LLM call. `TaskPlanner` decomposes goals into typed subtask dependency graphs.

**Workflow** (`evoagentx/workflow/`): `WorkFlowGraph` wraps a NetworkX `MultiDiGraph`. Nodes are `WorkFlowNode` instances with typed parameter lists and `WorkFlowNodeState` (PENDING/RUNNING/COMPLETED/FAILED). `WorkFlowGraph.next()` returns all nodes whose predecessors are complete. The `WorkFlow` runtime calls `get_next_task()`, executes via `ActionScheduler`, stores results in an `Environment` blackboard, and loops until `graph.is_complete`.

**Optimization** (`evoagentx/optimizers/`): Five implementations share a common interface: `optimize(dataset)`, `step()`, `evaluate(dataset)`, `convergence_check()`. The `Optimizer` base holds the workflow graph, evaluator, LLM, and convergence parameters.

**Evaluation** (`evoagentx/evaluators/`, `evoagentx/benchmark/`): `Evaluator` runs the workflow over benchmark examples via `ThreadPoolExecutor`, calls `benchmark.evaluate(prediction, label)` per example, and returns metrics. Eight concrete benchmarks ship with domain-specific metrics (F1 for QA, pass@k for code, exact match for math).

---

## Core Mechanism: The Five Optimizers

### SEW (Self-Evolving Workflow)

Operates on `SequentialWorkFlowGraph` (linear chains only). Converts the graph to one of five text representations (Python dict, YAML, Code DSL, BPMN XML, or "Core" colon-separated format), injects one of 57 predefined mutation prompts (ranging from conservative elaboration to "make it more fun, think WELL outside the box") and one of 40 thinking styles, then asks the LLM to produce a modified version. The parser reconstructs a new graph, falling back to the original on parse failure. In `workflow` mode it can add/remove tasks; in `prompt` mode it only rewrites instruction text.

**Critical detail:** `parse_workflow_python_repr()` calls `eval()` on LLM-generated output. In any deployment where the optimizer LLM's output is not fully controlled, this is a code injection vector.

### AFlow

Adapted from [MetaGPT](../projects/metagpt.md)'s AFlow implementation. The workflow is a Python `Workflow` class; the optimizer LLM receives accumulated experience logs, the top-scoring prior round's code, operator interface descriptions, and error logs from failed evaluations. It produces `<modification>`, `<graph>`, and `<prompt>` sections. Generated code is written to `round_N/graph.py`, dynamically imported, and evaluated. The optimizer has access to composable primitives: `Custom`, `AnswerGenerate`, `QAScEnsemble`, `ScEnsemble`, `Test`, `CodeGenerate`, `Programmer`, `Reflection`. The LLM can generate Python with loops, conditionals, and multi-step ensembles. `ConvergenceUtils.check_convergence()` monitors top-3 scores across rounds.

### TextGrad

Wraps the TextGrad library. Each agent's system prompt and action instruction become `textgrad.Variable` objects. A `TextGradEngine` adapts EvoAgentX's `BaseLLM` to TextGrad's `EngineLM` interface. Loss functions are task-type-specific (`CODE_LOSS_PROMPT`, `GENERAL_LOSS_PROMPT`, `NO_ANSWER_LOSS_PROMPT`). The loop: forward pass → compute loss → backward pass (textual gradients via LLM) → `TextualGradientDescent` update → optional rollback via `_snapshot`. A monkey-patch (`disable_short_variable_value`) forces full prompt text during gradient computation.

### EvoPrompt

Maintains `node_populations` (dict mapping node names to prompt variant lists) and `node_scores` (parallel score lists). Initializes via a `ParaphraseAgent`. Evaluates each variant by running the full workflow with that prompt swapped in, with `_eval_cache` keyed by prompt hash to skip re-evaluation. Evolves through GA/DE operations. Logs per-generation CSVs with individual prompt scores, ranks, and statuses (Best/Survivor/Eliminated).

### MIPRO

Wraps DSPy's `MIPROv2` via adapter layers: `MiproLMWrapper` adapts `BaseLLM` to `dspy.LM`, `MiproRegistry` converts workflow nodes to DSPy signatures, `PromptTuningModule` wraps workflow execution as a DSPy module. Uses Optuna's TPE sampler for Bayesian search over instruction variants and few-shot demonstration selections. Configurable run intensity: light/medium/heavy presets control trial count and validation set size.

### Workflow Auto-Construction

`WorkFlowGenerator` in `workflow_generator.py`: (1) `TaskPlanner` decomposes a goal into typed subtask definitions with dependency edges. (2) `build_workflow_from_plan()` constructs `WorkFlowNode` instances and validates the graph. (3) `AgentGenerator` assigns agents to each node via fresh LLM calls. Every step uses `_execute_with_retry()` with exponential backoff. No template caching or retrieval from prior plans.

---

## Agent Coordination Model

Agents do not communicate directly. All coordination flows through the `Environment` blackboard. `TaskScheduler.execute()` calls `graph.next()` for ready tasks. With multiple candidates, an LLM call selects the next task based on execution history and task descriptions. With one candidate, selection is direct (`_handle_edge_cases()` skips the LLM call). Despite `WorkFlowGraph.next()` returning all ready tasks and `AgentManager` having `threading.Lock`/`Condition` infrastructure, `WorkFlow.async_execute()` processes tasks strictly sequentially — parallel branches execute one at a time.

`max_execution_steps` (default 5) caps agent actions per task.

The `MultiAgentDebateActionGraph` in `frameworks/multi_agent_debate/debate.py` provides an alternative: multiple debater agents argue across `num_rounds`, then consensus via `llm_judge` or `self_consistency`. An optional `PruningPipeline` (quality + diversity + model-refereed stages) filters redundant arguments. Supports `group_graphs_enabled` mode where each debater position is an entire workflow graph.

---

## Key Numbers

| Benchmark | Task Type | Unoptimized | Optimized | Algorithm |
|-----------|-----------|-------------|-----------|-----------|
| HotPotQA  | Multi-hop QA | 63.58% F1 | 71.02% | TextGrad |
| MBPP | Code generation | 69.00% pass@1 | 79.00% | AFlow |
| MATH | Reasoning | 66.00% | 76.00% | TextGrad |
| GAIA | Real-world tasks | baseline | +~20% | (unspecified) |

**Credibility:** Self-reported (arXiv:2507.03616), not independently validated. These are comparisons of optimized vs. unoptimized EvoAgentX workflows, not against [AutoGen](../projects/autogen.md), [CrewAI](../projects/crewai.md), or [LangGraph](../projects/langgraph.md). No latency, token cost, or cost-per-optimization-round data is published, though `evaluation_utils.py` tracks `avg_cost` and `total_cost` per round internally.

Optimization budget estimate from code analysis: AFlow with a 5-step workflow, 20 rounds, 5 validation evaluations per round runs ~500+ executor LLM calls plus ~20 optimizer LLM calls. At current API pricing, $5–50 per optimization run depending on model choices.

---

## Strengths

**Optimizer selection flexibility.** The same workflow can be handed to any of five optimizers. Prompt-only refinement (TextGrad/EvoPrompt/MIPRO) is safe for production workflows where topology changes would break downstream integrations. AFlow's code-as-graph approach is appropriate when the search space is large and structural variation matters.

**Integrated evaluation harness.** Eight benchmarks ship with the framework. [HotPotQA](../projects/hotpotqa.md), MBPP, MATH, GAIA, HumanEval, GSM8K, LiveCodeBench, and WorfBench (a meta-benchmark evaluating workflow quality itself) are all runnable without external setup. This closes the evaluation loop at the workflow level.

**[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) and tool breadth.** The `evoagentx/rag/` pipeline (chunkers, embedders, multiple index types, retrievers, postprocessors) backs `LongTermMemory`. The 30+ built-in tools cover search, code execution (Python sandbox + Docker), vector databases ([FAISS](../projects/faiss.md), [ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md)), browser automation, Gmail, Telegram, ArXiv, and MCP client integration.

**Serialization and workflow reuse.** Workflows and agent configs serialize to JSON via Pydantic. `Wonderful_workflow_corpus/` contains pre-built workflow definitions (ArXiv digest, travel recommendation, investment analysis, etc.) loadable as `workflow.json` + `tools.json` pairs.

**HITL integration.** `HITLInterceptorAgent` supports `PRE_EXECUTION`/`POST_EXECUTION` intercept modes with approve/reject/modify/continue decisions. The `WorkflowEditor` allows structural modifications mid-execution.

---

## Critical Limitations

**Concrete failure mode — AFlow code generation fragility.** `_parse_optimizer_llm_output()` in `aflow_optimizer.py` extracts graph code via regex matching on XML tags. When parsing fails (malformed code, undefined variables, import errors), the optimizer silently falls back to the original graph with `modification = "No modification due to error in LLM output"`. The retry infrastructure (`_execute_with_retry()`, 3 retries, 5*N second delays) masks how often this happens. The optimizer prompt warns "Ensure they are complete and correct to avoid runtime failures" — evidence that invalid code generation is a known recurring problem.

**Unspoken infrastructure assumption — optimization cost.** The framework has no mechanism to stop optimization when a dollar threshold is exceeded. A 20-round AFlow run with a complex workflow and a mid-tier model can reach $30–50 in API costs before convergence. Nothing in the configuration surface exposes a `max_cost` parameter. Users who set `max_steps=20` without modeling the cost implications may be surprised.

**WorkFlowController is a stub.** `controller.py` defines `WorkFlowController` with `agent_manager`, `workflow`, and `optimizers` fields, but `start()` is `pass`. This was the natural integration point for live optimization during workflow execution. It does not exist.

**Sequential execution only.** Despite the graph model supporting parallel-eligible branches and `AgentManager` having threading infrastructure, the `WorkFlow` runtime processes tasks one at a time. A workflow with two independent research subtasks runs them serially.

**SEW is sequential workflows only.** `SEWOptimizer` only works with `SequentialWorkFlowGraph`. Workflows with branching or parallel structure cannot use SEW.

**No cross-run knowledge transfer.** Each optimization run starts from scratch. If a workflow has been optimized once and the task distribution shifts, the only option is re-running the full loop. There is no incremental update path and no retrieval of prior optimization results.

---

## When NOT to Use It

**When optimization cost is a hard constraint.** There is no budget cap. If your LLM API spend is bounded, you need to manually track cost via the `avg_cost` fields in evaluation logs and terminate runs yourself.

**When you need parallel workflow execution.** The runtime is strictly sequential. For workflows where tasks are genuinely independent and latency matters, you need a different orchestrator ([LangGraph](../projects/langgraph.md) or [AutoGen](../projects/autogen.md)'s async execution model).

**When the target workflow has complex branching.** SEW — the most interpretable optimizer — only handles linear chains. AFlow can theoretically generate branching code, but its reliability decreases with graph complexity. The optimizer prompt itself caps recommended node count at 10.

**When you need verified performance gains.** All benchmark numbers are self-reported comparisons against unoptimized baselines on 50-example validation sets. No independent replication or comparison against other frameworks exists in the published literature.

**When you're in an adversarial environment.** The `eval()` call in `parse_workflow_python_repr()` executes LLM-generated Python. In any setting where prompt injection is a concern, this is a direct code execution vector.

---

## Unresolved Questions

**Optimizer selection guidance.** The documentation lists five optimizers without criteria for choosing among them. The benchmark results show different optimizers winning on different tasks (TextGrad on HotPotQA, AFlow on MBPP), but there is no meta-analysis of which optimizer properties predict success on which task types.

**Cost accounting at scale.** The framework tracks `avg_cost` and `total_cost` per evaluation round internally but does not publish this data. Real-world optimization costs for the GAIA results (which involve multi-step tool-use workflows, not simple QA) are unknown.

**Governance of the SEW mutation prompt library.** The 57 mutation strategies and 40 thinking styles in `prompts/workflow/sew_optimizer.py` are hardcoded. How these were selected, whether they were evaluated empirically, and how they interact with different LLM backends is not documented.

**HITL and optimization interaction.** Human feedback during workflow execution cannot feed into the optimization loop as a gradient signal. The two systems are architecturally separate. Whether human corrections accumulate into improved optimization targets over time is an open design question.

**Incremental optimization after deployment.** No published path exists for updating an optimized workflow when the underlying benchmark or task distribution shifts without re-running the full optimization loop.

---

## Alternatives

| Framework | When to Choose It |
|-----------|------------------|
| [AFlow](../projects/aflow.md) (standalone) | You only need code-generation-based workflow optimization and want the original MetaGPT implementation without the additional framework surface area |
| [DSPy](../projects/dspy.md) | You want Bayesian/compiled prompt optimization with a more mature ecosystem, stronger community, and independently validated benchmarks; your workflow maps cleanly to DSPy modules |
| [AutoGen](../projects/autogen.md) | You need parallel multi-agent execution or a more production-hardened conversation pattern model; optimization is not the primary concern |
| [LangGraph](../projects/langgraph.md) | You need stateful, branching workflows with robust observability and a large ecosystem; you'll handle prompt improvement separately |
| [CrewAI](../projects/crewai.md) | You want simpler agent role assignment with lower operational complexity and don't need automated prompt optimization |
| [Darwin Gödel Machine](../projects/darwin-godel-machine.md) | You want self-modification that includes the agent's code and reasoning process, not just its prompts and workflow topology |
| [AgentEvolver](../projects/agentevolver.md) | You want agents that generate their own training tasks and learn from trajectory-level credit assignment rather than benchmark-driven prompt mutation |

Use EvoAgentX when you need to compare multiple optimization paradigms against the same task, have a clearly defined benchmark with labeled examples, and can absorb the API cost of 500+ LLM calls per optimization run.


## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — implements (0.4)

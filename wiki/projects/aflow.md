---
entity_id: aflow
type: project
bucket: self-improving
abstract: >-
  AFlow automates agent workflow design via Monte Carlo Tree Search over
  operator graphs, treating workflow structure as an optimization variable
  rather than a fixed design choice; accepted oral at ICLR 2025 (top 1.8%).
sources:
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - deep/repos/evoagentx-evoagentx.md
  - repos/foundationagents-metagpt.md
related: []
last_compiled: '2026-04-08T23:15:05.700Z'
---
# AFlow

## What It Is

AFlow is an automated workflow optimization framework, originally developed within [MetaGPT](../projects/metagpt.md), that searches for effective agent workflow patterns rather than requiring humans to design them by hand. The core claim: instead of hand-crafting the sequence and composition of LLM operations for a task, you let Monte Carlo Tree Search explore the space of possible workflows and evaluate candidates through execution.

The paper was accepted as an oral presentation at ICLR 2025 (top 1.8%, ranked #2 in the LLM-based Agent category per MetaGPT's repo). The benchmark numbers in this card are self-reported by the authors.

AFlow is also one of the five optimizers bundled in [EvoAgentX](../projects/evoagentx.md), which adapted it alongside four other paradigms (TextGrad, EvoPrompt, MIPRO, SEW) into a unified multi-agent evolution framework.

## Core Mechanism

### Workflow as Code

AFlow represents workflows as executable Python `Workflow` classes. The `__init__` method instantiates typed operators; the `async __call__` method composes them into a solution pipeline. This code-as-graph representation gives the optimizer LLM full flexibility: it can write loops, conditionals, chain operators arbitrarily, and define custom prompts inline.

The optimizer LLM receives:

- **Experience buffer**: Accumulated round histories with associated scores, formatted by `ExperienceUtils.format_experience()`
- **Top-scoring sample**: A previous round's graph code and prompts, selected from the top-k scoring rounds by `_get_optimization_sample()`
- **Operator catalog**: Auto-generated descriptions of available primitives from `OPERATOR_MAP`, including name, description, and interface signature
- **Error logs**: Runtime failures from previous rounds, loaded via `DataUtils.load_log()`
- **Optimization prompt**: Instructions to reconstruct and optimize the graph using control flow, critical thinking methods, and keeping complexity under 10 nodes

The optimizer LLM responds with three XML-tagged sections: `<modification>` (natural language description of the change), `<graph>` (the new Python workflow code), and `<prompt>` (any updated prompt strings). These are written to `round_N/graph.py` and `round_N/prompt.py`, import paths are patched via `graph_utils.update_prompt_import()`, and the new workflow is dynamically loaded and evaluated.

### MCTS Search Structure

The MCTS component treats each workflow configuration as a node in the search tree. The framework explores this space by:

1. Running an initial workflow configuration
2. Evaluating it against a task benchmark to get a fitness score
3. Using the LLM to propose a modified workflow based on accumulated experience
4. Evaluating the modified version
5. Tracking which configurations yield high scores

`ConvergenceUtils.check_convergence()` monitors top-3 scores across rounds and terminates when they plateau. Default budget: 20 max rounds with 5 validation evaluations per round.

### Operator Primitives

AFlow provides composable typed operators the generated code can freely combine:

- `Custom`: Arbitrary prompt → response
- `AnswerGenerate`: Chain-of-thought with explicit thought + answer fields
- `QAScEnsemble`: Self-consistency voting across multiple solutions
- `ScEnsemble`: Self-consistency with problem context
- `CodeGenerate`: Code-specific generation
- `Programmer`: Code with execution feedback
- `Test`: Verification against test cases
- `Reflection`: Self-review with feedback

This lets the MCTS discover patterns like "generate 3 candidates → ensemble → reflect on errors → regenerate" without those patterns being hand-coded.

### Output Parsing and Fallback

`_parse_optimizer_llm_output()` extracts graph code and prompts via regex matching on XML tags and code blocks. When parsing fails, it returns the original graph unchanged with `modification = "No modification due to error in LLM output"`. `_execute_with_retry()` wraps each optimization round with up to 3 retries at 5×N second delays. The retry infrastructure is not cosmetic — generated code fails to parse or execute often enough that the system depends on it.

## Strengths

**Treats workflow structure as a first-class optimization variable.** Most agent frameworks treat the workflow scaffold as fixed and only optimize prompts within it. AFlow explores whether the scaffold itself should change. This unlocks improvements that prompt-only optimization ([DSPy](../projects/dspy.md) style) cannot reach.

**Accumulates experience across rounds.** Each round's score and modification history feeds back into subsequent rounds via the experience buffer. The optimizer isn't searching blindly — it builds on what worked.

**Cost-aware search.** AFlow tracks explicit dollar costs per evaluation round (`avg_cost`, `total_cost` in `evaluation_utils.py`), enabling analysis of performance-per-dollar trade-offs rather than optimizing only for accuracy.

**Code flexibility.** The Python-as-workflow representation allows the optimizer to discover control flow patterns (loops, conditionals, branching ensemble strategies) that a declarative graph format would prohibit.

## Critical Limitations

**Code generation reliability is the central fragility.** The optimizer LLM produces Python code that must parse, import cleanly, and execute without runtime errors. It fails regularly enough to require extensive fallback infrastructure (XML regex extraction, `_execute_with_retry()`, convergence fallback to original graph). In EvoAgentX's adaptation, the `parse_workflow_python_repr()` method uses `eval()` on LLM-generated strings — a code injection surface in any multi-tenant deployment.

**Unspoken infrastructure assumption: LLM API access is cheap and reliable.** A typical AFlow optimization run with a 5-step workflow, 20 rounds, and 5 validation evaluations per round makes 500+ executor LLM calls plus 20+ optimizer LLM calls. At current API pricing, this runs $5–50 per optimization experiment depending on model selection and benchmark size. The framework has no cost-budget guardrail — no mechanism to halt when a dollar threshold is exceeded.

## When NOT to Use It

**Don't use AFlow for tasks where the optimal workflow structure is stable and known.** If you already know the right sequence of operations (retrieve → verify → synthesize, for instance), AFlow's MCTS search adds cost and runtime without benefit. Prompt-level optimization ([DSPy](../projects/dspy.md), MIPRO) will improve performance faster and cheaper.

**Don't use it for production workflows that need auditability.** AFlow generates Python workflow code that changes across optimization rounds. The "best" workflow from round 17 may be structurally different from round 12, and neither is human-designed. Auditing or debugging failures requires understanding LLM-generated code, not a human-authored workflow spec.

**Don't use it when your optimization budget is under ~$20 or when API reliability is poor.** The 20-round default budget requires hundreds of LLM calls. Noisy or flaky API access will corrupt the search trajectory and waste budget on retries.

## Unresolved Questions

**How does AFlow handle out-of-distribution inputs after optimization?** The framework optimizes a workflow against a fixed benchmark split. There's no analysis of how optimized workflows generalize to task distributions that differ from the training sample, or whether MCTS-discovered operator patterns overfit to specific benchmark characteristics.

**What determines the quality of the experience buffer?** The optimizer receives formatted round histories, but there's no published analysis of how many rounds of history are optimal, whether recency weighting matters, or whether low-scoring rounds should be excluded. The `format_experience()` function's behavior at scale (50+ rounds) is undocumented.

**Governance for generated workflow code.** When AFlow discovers a workflow that performs well, who owns that code? The generated Python is a mix of template structure from the operator library and LLM-synthesized composition logic. In enterprise settings, the IP and safety review status of machine-generated agent logic is unclear.

**Interaction between AFlow optimization and prompt optimization.** AFlow mutates both workflow structure and prompts simultaneously in the generated code. It's unclear whether separating these into two stages (first find good structure, then refine prompts within that structure via MIPRO or TextGrad) would be more efficient than joint optimization.

## Benchmarks

Self-reported, from the MetaGPT team and EvoAgentX integration:

| Benchmark | Task Type | AFlow Result |
|---|---|---|
| HumanEval | Code generation | Used as primary test benchmark |
| MBPP | Code generation | +10% pass@1 vs. unoptimized baseline |
| HotPotQA | Multi-hop QA | +7.44% F1 vs. unoptimized baseline |
| MATH | Mathematical reasoning | +10% solve accuracy vs. unoptimized baseline |

These compare optimized vs. unoptimized EvoAgentX workflows, not AFlow vs. other frameworks directly. No independently validated cross-framework benchmarks exist. The ICLR oral acceptance provides peer review credibility for the core search approach, but production performance on new tasks depends heavily on which executor LLM and operator set you configure.

## Alternatives

- **[DSPy](../projects/dspy.md)**: Use when your workflow structure is fixed and you want principled prompt/few-shot optimization within that structure. Much cheaper per optimization run, better understood convergence behavior.
- **[EvoAgentX](../projects/evoagentx.md)**: Use when you want AFlow alongside other optimization paradigms (TextGrad, MIPRO, EvoPrompt, SEW) in one framework. AFlow is bundled as one of five optimizers in EvoAgentX's `aflow_optimizer.py`.
- **[LangGraph](../projects/langgraph.md)**: Use when you need a production-grade workflow runtime with observability, not an optimization framework. LangGraph handles execution; AFlow designs what to execute.
- **[MetaGPT](../projects/metagpt.md)**: Use when you want the full MetaGPT software company architecture (role-based SOPs, document generation pipeline). AFlow originated here but is now extractable independently.
- **Manual workflow design + [DSPy](../projects/dspy.md) compilation**: Use when you have domain expertise about the right workflow structure, a modest optimization budget, and need interpretable, auditable pipelines.

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md): AFlow is a workflow-level instance of self-improvement — the system searches for better versions of itself
- [Prompt Optimization](../concepts/prompt-optimization.md): AFlow optimizes both structure and prompts simultaneously, whereas prompt optimization alone keeps structure fixed
- [Multi-Agent Systems](../concepts/multi-agent-systems.md): AFlow discovers multi-agent compositions rather than requiring them to be hand-designed
- [Execution Traces](../concepts/execution-traces.md): Each AFlow evaluation round produces traces that feed the experience buffer for subsequent search steps
- [Chain-of-Thought](../concepts/chain-of-thought.md): The `AnswerGenerate` and `Reflection` operators AFlow composes are CoT-based primitives
- [Reinforcement Learning](../concepts/reinforcement-learning.md): MCTS is the search algorithm; the evaluation score functions as the reward signal

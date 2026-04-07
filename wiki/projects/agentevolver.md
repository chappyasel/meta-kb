---
entity_id: agentevolver
type: project
bucket: self-improving
abstract: >-
  AgentEvolver trains small LLMs (7B-14B params) to self-improve via autonomous
  task generation, experience-guided exploration, and step-level credit
  assignment, achieving 45-57% on AppWorld/BFCL-v3 without manual dataset
  construction.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - repos/modelscope-agentevolver.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
related: []
last_compiled: '2026-04-07T11:50:05.215Z'
---
# AgentEvolver

**Type:** Project (Self-Improving Agent Framework)
**Source:** [ModelScope/AgentEvolver](https://github.com/modelscope/AgentEvolver) | [arXiv:2511.10395](https://arxiv.org/abs/2511.10395)
**License:** Apache-2.0
**Stars:** 1,336 | **Forks:** 152

## What It Does

AgentEvolver trains LLMs to improve their own agentic capabilities without human-curated datasets. Instead of feeding a model labeled trajectories, the system generates tasks from the environment, runs rollouts guided by accumulated experience, then assigns credit at the step level before updating the policy. The full loop runs end-to-end: environment sandboxes feed the task generator, the experience pool feeds the explorer, and the attribution processor feeds the RL trainer.

The project sits in the [Self-Improving Agent](../concepts/self-improving-agent.md) category alongside [EvoAgentX](../projects/evoagentx.md) and [Darwin Gödel Machine](../projects/darwin-godel-machine.md), but focuses specifically on sample efficiency: producing capability gains with 7B and 14B parameter models rather than requiring frontier-scale compute.

## Architecture

AgentEvolver decomposes the self-improvement loop into three named mechanisms, each corresponding to a concrete module:

**Self-Questioning (Automatic Task Generation).** The Task Manager (`docs/guidelines/task_manager.md`) explores the target environment and synthesizes new tasks programmatically. This removes dependency on hand-labeled data. The CuES extension ([arXiv:2512.01311](https://arxiv.org/abs/2512.01311)) elaborates this approach.

**Self-Navigating (Experience-Guided Exploration).** The Experience Manager (`docs/guidelines/exp_manager.md`) maintains a pool of cross-task summaries via [ReMe](https://github.com/agentscope-ai/ReMe). During rollouts, the agent retrieves relevant past experience before acting, steering exploration toward higher-quality trajectories. This is closer to [Procedural Memory](../concepts/procedural-memory.md) reuse than simple retrieval; the pool stores distilled behavioral patterns rather than raw episodes.

**Self-Attributing (Attribution-Based Credit Assignment).** The Advantage Processor (`docs/guidelines/adv_processor.md`) implements ADCA-GRPO, an extension of [GRPO](../concepts/grpo.md) that traces causal contribution through long multi-turn trajectories. Standard GRPO assigns reward to entire rollouts; ADCA-GRPO decomposes it to intermediate steps, enabling finer policy gradient signals.

The training launcher (`launcher.py`) orchestrates all three services alongside environment sandboxes and a log dashboard. Configuration is YAML-based; `examples/overall.yaml` runs the full pipeline while `examples/basic.yaml` runs GRPO alone without ReMe.

A separate Game Arena extension (`games/README.md`) applies the same training stack to multi-agent social reasoning tasks (Avalon, Diplomacy) with a web interface for observation and human participation.

SeeUPO (released March 2026, branch `seeupo`) adds sequence-level agentic RL with convergence guarantees on top of this stack, suggesting the core framework is actively used as a research substrate.

## Benchmark Performance

Results on [AppWorld](../projects/appworld.md) and BFCL-v3 (self-reported in the technical report, not independently validated):

| Model | Params | AppWorld avg@8 | BFCL-v3 avg@8 | Overall avg@8 |
|---|---|---|---|---|
| Qwen2.5-7B baseline | 7B | 1.8% | 29.8% | 15.8% |
| AgentEvolver (7B) | 7B | 32.4% | 57.9% | 45.2% |
| Qwen2.5-14B baseline | 14B | 18.0% | 41.6% | 29.8% |
| AgentEvolver (14B) | 14B | 48.7% | 66.5% | 57.6% |

The 7B model jumps from 1.8% to 32.4% on AppWorld avg@8, a substantial gain. The ablation table shows each mechanism contributes incrementally: Questioning alone accounts for most of the AppWorld lift, while Attributing contributes more on BFCL-v3. These numbers are self-reported from the ModelScope team's own evaluation runs. No independent replication is publicly documented.

## Strengths

AgentEvolver addresses a real bottleneck: building training datasets for agentic tasks is expensive. Autonomous task generation sidesteps this. The modular architecture lets practitioners plug in their own environments via standardized interfaces (`docs/guidelines/env_service.md`) without rewriting the training pipeline.

Step-level credit assignment through ADCA-GRPO is the most technically distinctive part. Long agentic trajectories routinely suffer from credit assignment problems where a mistake on step 3 only manifests as task failure on step 15. Coarse reward assignment over the full trajectory dilutes the signal. ADCA-GRPO's causal attribution approach targets this problem directly, which is why the ablation shows Attributing contributing meaningfully over Questioning alone.

The framework runs on relatively modest hardware by current standards, as the 7B experiments demonstrate.

## Limitations

**Concrete failure mode: experience pool poisoning.** The Self-Navigating mechanism retrieves past experience to guide new rollouts. If early training produces systematically wrong behavioral summaries, those summaries bias subsequent exploration toward the same failure modes. ReMe's summarization process is a black box from AgentEvolver's perspective; the documentation does not describe how stale or incorrect experience gets evicted. A poorly seeded experience pool could accelerate convergence to a local optimum rather than toward capable behavior.

**Unspoken infrastructure assumption: sandboxed environment availability.** The AppWorld benchmark requires a self-hosted environment service (`env_service/environments/appworld/setup.sh`) with its own installation dependencies. Applying AgentEvolver to a new domain requires building an equivalent sandbox that exposes the standardized interface. The documentation describes the interface (`docs/guidelines/env_service.md`) but practitioners building in domains without existing simulation infrastructure will spend significant time here before any training runs.

## When Not to Use It

Skip AgentEvolver when:

- You need deterministic, auditable agent behavior. The RL training loop produces models whose decision logic is not interpretable, and the evolved policies may behave unpredictably on distribution shifts.
- Your target environment has no simulation or sandbox equivalent. The framework's task generation and rollout mechanisms depend entirely on environment services. Real-world-only domains (physical systems, live production APIs) are incompatible without significant wrapper engineering.
- You need results on a fixed evaluation set quickly. The self-evolving loop requires training runs, not just inference. If your timeline is days rather than weeks, a prompted or fine-tuned baseline will be faster to evaluate.
- Your compute budget requires inference-only deployment. AgentEvolver's value is in the training loop. Once trained, the output is a fine-tuned model checkpoint; the framework itself is not needed at inference time, but reaching that checkpoint requires RL training infrastructure (veRL dependency).

## Unresolved Questions

The documentation does not address:

- **Experience pool governance.** How many summaries does ReMe store? What eviction policy applies? How does the pool behave after thousands of training iterations when early summaries may be obsolete?
- **Cost at scale.** The technical report covers 7B and 14B models. Training cost per benchmark point is not reported. Practitioners considering larger models have no guidance on how ADCA-GRPO's computational overhead scales with trajectory length.
- **Conflict resolution between mechanisms.** Self-Questioning generates tasks; Self-Navigating biases rollouts toward prior experience. If the experience pool is dense in one task type, does the task generator compensate by diversifying, or do the two mechanisms reinforce a narrow distribution? The ablation table shows independent contributions but does not show interaction effects.
- **Generalization beyond AppWorld and BFCL-v3.** Both benchmarks are tool-use and API-call oriented. Whether the three mechanisms transfer to domains requiring multi-modal reasoning, code generation, or long-horizon planning outside these benchmarks is undemonstrated.

## Alternatives

| System | Choose when |
|---|---|
| [EvoAgentX](../projects/evoagentx.md) | You want workflow-level evolution and prompt optimization rather than RL-based policy training |
| [Voyager](../projects/voyager.md) | You need skill accumulation in an open-ended exploration environment (Minecraft) with explicit skill libraries |
| [DSPy](../projects/dspy.md) with [Prompt Optimization](../concepts/dspy-optimization.md) | You want automated prompt and pipeline improvement without RL training overhead |
| [Reflexion](../concepts/reflexion.md) | You need in-context self-improvement without any training, using verbal reinforcement over episodic memory |
| [Darwin Gödel Machine](../projects/darwin-godel-machine.md) | You want self-modification of the agent's own code and architecture, not just policy weights |

## Related Concepts

- [Self-Improving Agent](../concepts/self-improving-agent.md)
- [Automatic Curriculum](../concepts/automatic-curriculum.md)
- [Procedural Memory](../concepts/procedural-memory.md)
- [GRPO](../concepts/grpo.md)
- [Reinforcement Learning](../concepts/reinforcement-learning.md)
- [Agent Skills](../concepts/agent-skills.md)
- [LLM-as-Judge](../concepts/llm-as-judge.md)

---
entity_id: agentevolver
type: project
bucket: self-improving
abstract: >-
  AgentEvolver is a self-evolving agent training framework from ModelScope that
  eliminates manual dataset construction by generating tasks autonomously,
  reusing cross-task experience, and assigning fine-grained credit across
  trajectory steps to improve smaller LLMs.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - repos/modelscope-agentevolver.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
related: []
last_compiled: '2026-04-06T02:12:01.050Z'
---
# AgentEvolver

## What It Does

AgentEvolver trains LLM agents to improve through reinforcement learning without manually curated datasets. The system closes a feedback loop across three stages: agents generate their own training tasks by querying environments (self-questioning), retrieve and apply summaries from past trajectories to guide new rollouts (self-navigating), then use causal credit assignment to determine which intermediate steps actually contributed to outcomes (self-attributing). The result is a policy that improves continuously as the agent explores.

The key architectural bet: rather than starting with human-annotated data and fine-tuning toward static targets, the system treats the environment itself as the curriculum generator. A 7B Qwen2.5 model trained with AgentEvolver reaches benchmark scores competitive with untrained 14B models, which matters for teams constrained by inference costs.

## Core Mechanism

The framework follows a service-oriented dataflow architecture. Three loosely coupled services handle environment management, experience storage, and training respectively.

**Self-Questioning (Task Manager):** Documented in `docs/guidelines/task_manager.md`, this component drives agents to explore environments and emit structured task specifications. No seed dataset required. The diversity of generated tasks depends entirely on environment coverage, which creates a hidden dependency on how richly the environment is instrumented.

**Self-Navigating (Experience Manager):** Configured via `docs/guidelines/exp_manager.md`, this component relies on [ReMe](https://github.com/agentscope-ai/ReMe), an external experience summarization library. ReMe condenses successful and failed trajectories into reusable summaries stored in an experience pool. At rollout time, the agent retrieves relevant summaries and incorporates them into context before acting. This is similar in spirit to [Episodic Memory](../concepts/episodic-memory.md) retrieval but applied during training rather than inference.

**Self-Attributing (Advantage Processor):** Described in `docs/guidelines/adv_processor.md`, this implements ADCA-GRPO, an extension of [GRPO](../concepts/grpo.md) that traces credit through long multi-turn trajectories. Standard GRPO assigns reward to entire rollouts; ADCA-GRPO identifies which steps causally influenced the outcome and weights gradient updates accordingly. This addresses a known failure mode in agentic RL where sparse terminal rewards provide insufficient signal for improving intermediate decisions.

Training uses [veRL](https://github.com/volcengine/verl) for distributed RL execution. The launcher (`launcher.py`) can spin up environment service, logging dashboard, and training process together via a single YAML config.

## Key Numbers

Benchmarks run on AppWorld and BFCL-v3:

| Model | Avg@8 | Best@8 |
|---|---|---|
| Qwen2.5-7B baseline | 15.8% | 24.0% |
| AgentEvolver 7B | 45.2% | 60.1% |
| Qwen2.5-14B baseline | 29.8% | 42.8% |
| AgentEvolver 14B | 57.6% | 73.1% |

The 7B model with all three components enabled reaches 45.2% avg@8, vs 15.8% for the untrained baseline. The 14B model goes from 29.8% to 57.6%. These numbers are **self-reported** by the ModelScope team in arXiv preprint 2511.10395. No independent replication is documented in the source material.

The ablation table is useful: adding self-questioning alone accounts for most of the gain (15.8% → 36.1% for 7B avg@8). Navigating and attributing each add several more points. This suggests the task generation mechanism is load-bearing, not the credit assignment.

GitHub: ~1,336 stars, 152 forks as of early 2026.

## Strengths

The self-questioning mechanism genuinely removes the most expensive part of building task-specific training data. For domains where environments are simulatable (API calls, code execution, tool use), this is a real cost reduction.

ADCA-GRPO addresses a concrete weakness in applying GRPO to long-horizon agentic tasks. Multi-turn interactions with sparse rewards give standard GRPO very little gradient signal per step; credit attribution at the step level improves sample efficiency.

The modular service architecture means environment swap-out is possible. If your environment implements the standardized interface (`docs/guidelines/env_service.md`), you can run the full pipeline without touching training code.

The Game Arena extension (Avalon, Diplomacy) shows the framework generalizes to multi-agent social reasoning, not just tool-use benchmarks.

## Critical Limitations

**Failure mode: environment coverage determines task diversity.** The self-questioning mechanism generates tasks by exploring the environment. If the environment has sparse or poorly instrumented state, the agent generates narrow, repetitive tasks and the training distribution collapses. There is no documented mechanism for detecting or correcting this. Teams with thin environment coverage will hit a ceiling the benchmarks don't reveal.

**Unspoken infrastructure assumption: CUDA cluster with conda.** Setup requires `bash install.sh` with conda and CUDA toolkit pre-installed, plus a working veRL installation for distributed training. The AppWorld environment setup alone (`cd env_service/environments/appworld && bash setup.sh`) adds another dependency layer. The framework is not cloud-provider-agnostic. Running this on CPU-only or managed notebook environments is not supported.

**External dependency risk:** Self-navigating depends on ReMe (`external/reme/install_reme.sh`), a separate library from the same organizational ecosystem. The `--with-reme` flag is optional, but without it the navigating component is unavailable. ReMe's own maintenance trajectory is unclear.

## When Not to Use It

Skip AgentEvolver if your target domain lacks a simulatable environment. The self-questioning loop requires an environment the agent can actually explore and receive rewards from. Static document corpora, knowledge bases without executable interfaces, or tasks where ground-truth evaluation requires human judgment are poor fits.

Also avoid it if you need a validated, production-grade system. The project is in active research development with a preprint (not peer-reviewed publication), and the benchmark numbers are self-reported. Teams building production agent systems should treat this as a research prototype.

If your primary goal is [Prompt Engineering](../concepts/prompt-engineering.md) improvement rather than policy training, [DSPy](../projects/dspy.md) or [EvoAgentX](../projects/evoagentx.md) operate without the RL training stack.

## Unresolved Questions

The documentation doesn't address how to detect when the generated task distribution has degenerated. No diversity metric or distribution monitoring is described.

Compute cost at scale is unspecified. The benchmarks report model size (7B, 14B) but not GPU-hours, wall-clock training time, or number of rollouts required to reach reported performance. Teams evaluating feasibility can't estimate infrastructure costs from the published material.

Conflict resolution between the experience pool and new trajectory data isn't documented. If the experience pool contains summaries from an earlier, weaker policy, how does ReMe weight old vs. new experience? This matters for long training runs where the policy shifts significantly.

The ADCA-GRPO credit attribution method is described in the technical report but the exact implementation in `docs/guidelines/adv_processor.md` isn't publicly elaborated beyond configuration parameters.

## Alternatives

**[EvoAgentX](../projects/evoagentx.md):** Focuses on workflow-level evolution (prompts, agent structures) through built-in evolution algorithms. Use EvoAgentX when you want to evolve agent architecture without an RL training loop.

**[DSPy](../projects/dspy.md):** Optimizes prompt pipelines through compiled few-shot examples and automatic optimization. Use DSPy when you have labeled examples and want prompt-level optimization without policy training.

**[Voyager](../projects/voyager.md):** Skill library accumulation through LLM-generated code in Minecraft. Use Voyager when the environment is a game or simulator and you want a skill library rather than a fine-tuned policy.

**[Reflexion](../concepts/reflexion.md):** Verbal reinforcement through self-reflection without gradient updates. Use Reflexion when you can't do policy training and want inference-time self-improvement.

**[Darwin Gödel Machine](../projects/darwin-godel-machine.md):** Self-modifies the agent's own code through evolutionary search. Use it when you need the agent to rewrite its architecture, not just its policy weights.

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md)
- [GRPO](../concepts/grpo.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Execution Traces](../concepts/execution-traces.md)
- [Meta-Evolution](../concepts/meta-evolution.md)
- [AppWorld](../projects/appworld.md)

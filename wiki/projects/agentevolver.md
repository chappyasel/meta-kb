---
entity_id: agentevolver
type: project
bucket: self-improving
abstract: >-
  AgentEvolver is an end-to-end RL training framework for self-evolving LLM
  agents combining autonomous task generation, experience retrieval, and
  step-level credit assignment via ADCA-GRPO to improve agent capabilities
  without human-labeled data.
sources:
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/modelscope-agentevolver.md
  - repos/modelscope-agentevolver.md
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
related: []
last_compiled: '2026-04-08T23:07:34.924Z'
---
# AgentEvolver

**Type:** Project — Self-Improving Agents
**Repository:** [modelscope/AgentEvolver](https://github.com/modelscope/AgentEvolver)
**License:** Apache-2.0
**Stars:** 1,336 | **Forks:** 152 (as of April 2026)

## What It Does

AgentEvolver trains LLM agents to improve themselves through three coordinated mechanisms: they generate their own training tasks by exploring environments, retrieve and apply experience from past rollouts, and receive dense process-level reward signals that credit individual steps rather than just final outcomes. The result is a closed loop where an agent bootstraps training data, runs rollouts, summarizes what it learned, and updates its policy — without human annotation at any stage.

The framework builds on [veRL](https://github.com/volcengine/verl) (Bytedance's distributed RL library) and Ray, extending `RayPPOTrainer` with a four-stage loop: task synthesis, trajectory rollout, experience summarization, and policy optimization via ADCA-GRPO. Environments run as isolated FastAPI/Ray services, enabling horizontal scaling and environment swaps without touching the training code.

The key differentiator from standard GRPO-based agent training is the credit assignment mechanism. Standard GRPO assigns the same advantage to every token based on the final outcome. AgentEvolver's ADCA-GRPO evaluates each step with an LLM judge, fuses process rewards with outcome rewards through independent z-score normalization, and broadcasts step-level advantages to tokens. This reduces training steps by approximately 40% compared to standard GRPO (self-reported; not independently validated).

## Architecture

Six module groups under `agentevolver/module/`:

- **`task_manager/`** — Autonomous task generation via environment exploration and trajectory summarization
- **`exp_manager/`** — Experience pool construction, retrieval, and context injection
- **`adv_processor/`** — LLM-based step evaluation and ADCA-GRPO advantage computation
- **`agent_flow/`** — Multi-turn interaction loop between policy and environment
- **`env_manager/`** — Parallel rollout execution and conversion to DataProto tensors
- **`context_manager/`** — Four context management templates handling token budgets

The environment service (`env_service/`) runs as a separate FastAPI server backed by Ray actors, exposing `/create`, `/step`, `/evaluate`, and `/release` endpoints. Environments register dynamically via `import_and_register_env()` in `env_service/registry.py`. Currently supported: AppWorld (multi-service API), BFCL v3 (function calling), WebShop (web shopping), and OpenWorld (MCP-based tool use).

Configuration is managed through Hydra YAML files. `examples/basic.yaml` runs plain GRPO; `examples/overall.yaml` enables all three mechanisms.

## Core Mechanisms

### Self-Questioning: Autonomous Task Generation

`TaskManager` in `task_manager/task_manager.py` runs a two-phase pipeline. In the exploration phase, `_step_explore()` dispatches to `LlmRandomSamplingExploreStrategy`, which sends a 118-line structured prompt (`prompt_explore.py`) to a high-temperature LLM. The prompt instructs the agent to maintain a mental model across six categories: known APIs, return data, observed patterns, hypotheses, failed attempts, and current focus. The agent probes the environment systematically rather than testing APIs alphabetically.

In the summarization phase, `_step_summarize()` converts exploration trajectories into structured tasks via `prompt_summarize.py`. The LLM produces `<task>` blocks containing a natural-language query, confidence score, and reference action sequence. Old objectives are injected into the prompt to prevent duplicate generation.

`FullDataset` manages the complete data lifecycle: it generates synthetic tasks, caches them to disk, mixes them with original environment tasks via `MixtureStrategy`, and converts everything into a veRL `RLHFDataset`. The mix ratio is controlled by `phybrid(g) = (1-lambda)*ptarget(g) + lambda*ptask(g)`.

Task curation runs through two filters: `NaiveTaskPostFilter` (lexical deduplication) and `LlmFilter` (feasibility verification by executing reference solutions). `StateRecorder` wraps ChromaDB with cosine similarity to reject semantically duplicate tasks.

### Self-Navigating: Experience-Guided Rollouts

`ExperienceManager` and `ExperienceWorker` in `exp_manager/exp_manager.py` handle experience pooling. After rollouts, `summarize_in_batch()` sends trajectories to the external ReMe service (via `EMClient.call_summarizer()`), which extracts behavioral insights, validates them with an LLM, and indexes them in a vector store.

During rollouts, `ExperienceWorker.manage_rollout_context()` retrieves top-k relevant experiences and prepends them to task prompts using a configurable template. The `allocate_add_exp()` method controls the mix: `"woexp"` (no experience), `"all"` (all rollouts), or `"mixed"` (proportion via `rollout_ratio`, default 0.5).

The default `train_sample_mode: "alldiscard"` strips experience context before policy optimization, preventing the policy from learning to depend on externally-provided context that won't exist at inference time. The `het_core_algos.py` training loss uses an `exp_mask` tensor to separate on-policy and off-policy contributions, with a separate `off_cliprange_high` for experience-augmented samples.

### Self-Attributing: ADCA-GRPO Credit Assignment

This is the mechanism that distinguishes AgentEvolver from other RL training frameworks.

`evaluate_step_flags_parallel()` in `semantic_attribution.py` evaluates every step in a training batch. For each sample, it calls an external LLM (default `qwen-max` via DashScope) with the full trajectory and parses `"Step N Judgment: GOOD/BAD"` patterns. One API call per sample — not per step — reduces costs by roughly the average step count (5-10x). Samples with near-zero advantage (`abs(advantage) < 1e-8`) are skipped via `skip_type="skip_small_adv"`.

`compute_prm_grpo_advantages()` in `adca_grpo.py` implements the "decouple" scheme:

1. GOOD maps to `+fix_base` (default 0.2), BAD to `-fix_base`
2. Step-level PRM rewards and trajectory-level outcome scores are z-score normalized independently via `_group_zscore_on_steps()`, preventing the sparse terminal reward from dominating
3. Composite fusion: `r_t = alpha * r_t_attr + indicator(t=T) * r_out`

`suffix_sum_on_steps()` computes undiscounted cumulative future reward per step. `broadcast_step_adv_to_tokens()` maps step-level advantages to tokens using `step_ids` tensors from `step_parser.py`.

Alpha supports cosine decay: `alpha_t = alpha_min + 0.5 * (alpha0 - alpha_min) * (1 + cos(pi * p))`. Process rewards start strong and fade as training progresses, implementing implicit curriculum learning.

`step_parser.py` handles model-agnostic boundary detection via `_extract_role_header_tokens()`, which compares tokenizations of messages with and without content to discover role headers. This is necessary because Qwen, Llama, and other model families use different chat template formats.

The pipeline tracks consistency metrics: `prm/pos_traj_bad_rate` (bad steps in successful trajectories), `prm/neg_traj_good_rate` (good steps in failed trajectories), `prm/parse_success_rate`, and `prm/flags_len_mismatch_rate`.

### Multi-Turn Agent Flow

`AgentFlow` in `agent_flow/agent_flow.py` runs up to 30 steps per trajectory. `Linear_CMT` in `cmt_linear.py` manages token budgets: `max_seq_length = max_model_len - max_response_length`, clipping environment outputs to `max_env_output_length`.

`compute_madness()` computes a repetition penalty scalar that guards against agents falling into action loops — a common failure mode in multi-turn RL training. `ParallelEnvManager.rollout()` tracks per-thread step counts and token generation rates via a `tmux` dict, retrying failed tasks up to 4 times with exponential backoff.

## Benchmarks

All numbers are self-reported from the AgentEvolver technical report ([arXiv:2511.10395](https://arxiv.org/abs/2511.10395)). Not independently validated.

**Qwen2.5-7B on AppWorld + BFCL v3 (avg@8):**

| Configuration | AppWorld | BFCL v3 | Combined Avg |
|---|---|---|---|
| Baseline | 1.8% | 29.8% | 15.8% |
| +Questioning | 23.2% | 49.0% | 36.1% |
| +Questioning & Navigating | 26.3% | 53.3% | 39.8% |
| +Questioning & Attributing | 25.7% | 56.8% | 41.3% |
| All three | **32.4%** | **57.9%** | **45.2%** |

**Qwen2.5-14B on AppWorld + BFCL v3 (avg@8):**

| Configuration | AppWorld | BFCL v3 | Combined Avg |
|---|---|---|---|
| Baseline | 18.0% | 41.6% | 29.8% |
| +Questioning | 44.3% | 60.3% | 52.3% |
| +Questioning & Navigating | 45.4% | 62.8% | 54.1% |
| +Questioning & Attributing | 47.8% | 64.9% | 56.4% |
| All three | **48.7%** | **66.5%** | **57.6%** |

Three observations from the ablation:

1. **Self-Questioning dominates.** The baseline-to-Questioning jump accounts for 80%+ of the total gain at 7B. The bottleneck was training data quality, not the optimization algorithm.
2. **Self-Attributing outperforms Self-Navigating alone.** At 14B: +Attributing reaches 56.4% combined vs +Navigating at 54.1%. Dense process rewards beat experience retrieval when used independently.
3. **All three mechanisms are additive.** The full system (57.6%) exceeds any two-mechanism combination, with no redundancy detected.

Training used 8× A100 80GB GPUs, learning rate 1e-6, batch size 32, 40 epochs per update, KL coefficient 0.001, maximum 30 steps per trajectory.

## Strengths

**End-to-end training without human annotation.** The self-questioning pipeline generates, curates, and mixes training tasks autonomously. Practitioners point it at a new environment and let it explore — no dataset construction required.

**Dense reward signals for long-horizon tasks.** Standard GRPO fails on 20-30 step trajectories because the terminal signal is too sparse. ADCA-GRPO's step-level attribution directly addresses this without requiring a separately trained process reward model.

**Environment abstraction is genuinely reusable.** The FastAPI/Ray environment service with standardized `create/step/evaluate/release` endpoints means adding a new environment requires implementing four methods and calling `Registry.register()`. The AppWorld, BFCL, and WebShop implementations in `env_service/environments/` serve as concrete templates.

**Step-level metrics enable training diagnosis.** The `prm/pos_traj_bad_rate` and `prm/neg_traj_good_rate` metrics surface whether the evaluator LLM is producing calibrated attributions or degenerating to uniform labels — a diagnostic capability absent from most RL training frameworks.

## Limitations

**DashScope API is hardcoded.** Semantic attribution calls `qwen-max` via `https://dashscope.aliyuncs.com/compatible-mode/v1`. The code raises `RuntimeError` if `DASHSCOPE_API_KEY` is absent. Adapting to other providers requires code changes, not configuration, despite the OpenAI-compatible API format making adaptation straightforward in practice.

**LLM evaluation degrades with trajectory complexity.** A single LLM call evaluates all steps of a 30-step trajectory. At that scale, GOOD/BAD labels become inconsistent. `parse_batch_evaluation_result()` falls back to uniform labels on parse failure, silently converting ADCA-GRPO back to standard GRPO. Practitioners have no runtime indicator that this degradation occurred unless they monitor `prm/parse_success_rate`.

**Step boundary detection is fragile.** `step_parser.py` extracts boundaries by comparing tokenizations of messages with and without content — a heuristic that depends on consistent chat template formatting. The `verify_step_alignment()` function only checks the first 5 samples per batch. For models with atypical tokenization, misalignment silently corrupts training signals.

**No online difficulty adaptation.** Tasks generate before training or at epoch boundaries. There is no mechanism connecting current agent performance back to task difficulty selection. The `FullDataset._refresh_after_epoch` flag exists but is not connected to performance metrics — a notable gap for a system positioned as self-improving.

**ReMe experience updates are infrequent by default.** `updated_freq=0` means the experience pool is populated at initialization and not continuously updated during training. The system learns from experiences accumulated before the current training run, not from the training run itself.

## When Not to Use It

**When you have a well-curated task dataset.** Self-Questioning's value is eliminating dataset construction cost. If you already have high-quality labeled trajectories, the exploration phase adds overhead without benefit.

**When your environment lacks a programmatic interface.** AgentEvolver assumes environments expose deterministic `step()` and `evaluate()` methods with consistent state. Web scraping targets, human-in-the-loop workflows, or environments with stochastic evaluation (human raters) don't fit this model.

**When you need portable inference.** The training process encodes environment-specific assumptions into the policy. The trained agent expects the same observation and action format as the training environment. Cross-environment generalization requires separate training runs.

**When your compute budget is tight.** Running the full stack requires: environment service processes (AppWorld alone needs significant setup), the ReMe experience server, DashScope API calls for every training batch (semantic attribution), and veRL's distributed training infrastructure. The 8× A100 training configuration is the minimum validated setup.

**When you need vendor-neutral infrastructure.** The DashScope dependency for credit assignment, the ReMe service for experience management, and the veRL dependency for distributed training create a stack with Alibaba-ecosystem assumptions. Teams on AWS or GCP without DashScope access will need to modify the attribution pipeline before training.

## Unresolved Questions

**Attribution quality at scale.** The paper reports 40% training step reduction from ADCA-GRPO vs standard GRPO, but doesn't report what fraction of training samples have `parse_success_rate < 1.0` or how this varies with trajectory length. At 30-step trajectories with complex API interactions, evaluator reliability is the main unknown.

**Experience retrieval quality.** There is no feedback signal connecting experience retrieval quality to downstream rollout outcomes. The system doesn't adapt retrieval strategy based on whether experience-augmented rollouts outperform vanilla rollouts — the 50/50 split is fixed.

**Cross-environment generalization.** All benchmarks test on the same environments used for training (AppWorld, BFCL). The framework makes no claims about transfer, and the self-questioning mechanism generates tasks specific to each environment's entity-attribute-operation profile. Whether policies trained on one environment transfer to similar ones is unexplored.

**Game Arena integration.** The `games/` directory contains a complete multi-agent arena (Avalon, Diplomacy) that reuses the training infrastructure but has separate agent architectures. The game agents don't benefit from self-questioning or self-navigating — the relationship between the game arena and the main framework is research extension, not integration.

**CuES vs main pipeline.** The `research/CuES/` extension adds curiosity-driven task synthesis with memory trees and requirement confirmation. CuES reportedly achieves "substantially higher accuracy" on AppWorld, WebShop, and BFCL v3 than training on original datasets, but this comparison is between CuES-generated data and original environment data — not against AgentEvolver's self-questioning baseline. The relationship between CuES and the main pipeline's task generation is unclear.

## Alternatives

**[EvoAgentX](../projects/evoagentx.md)** — Focuses on workflow-level optimization (prompt rewriting, structure evolution) rather than policy-level RL training. Use EvoAgentX when you want to improve agent workflow design without running RL training infrastructure.

**[Voyager](../projects/voyager.md)** — Generates executable skill libraries in Minecraft through LLM-driven exploration. Similar self-questioning spirit but targets open-ended skill accumulation rather than policy training on fixed benchmark environments. Use Voyager when the goal is skill library construction in open-ended environments.

**[Darwin Gödel Machine](../projects/darwin-godel-machine.md)** — Self-modifies its own code rather than its policy weights. Use DGM when you want self-improvement at the code/architecture level, not the parameter level.

**[DSPy](../projects/dspy.md)** — Prompt optimization through automatic compilation rather than RL training. Use DSPy when you need to optimize a pipeline without access to GPU training infrastructure, or when your task has a clear differentiable signal that doesn't require multi-turn rollouts.

**[AFlow](../projects/aflow.md)** — Automated workflow optimization via Monte Carlo Tree Search over operator compositions. Use AFlow when the bottleneck is workflow structure rather than individual step quality.

For straightforward multi-turn agent training on well-defined environments with an existing task dataset, vanilla [GRPO](../concepts/grpo.md) via veRL without AgentEvolver's three-mechanism overhead is simpler to debug and maintain. AgentEvolver earns its complexity when environment exploration is the bottleneck, trajectories are long enough that sparse rewards fail, or training data construction cost is prohibitive.

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md)
- [Reinforcement Learning](../concepts/reinforcement-learning.md)
- [GRPO](../concepts/grpo.md)
- [Execution Traces](../concepts/execution-traces.md)
- [Prompt Optimization](../concepts/prompt-optimization.md)
- [LLM-as-Judge](../concepts/llm-as-judge.md)
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md)

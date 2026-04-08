---
url: 'https://github.com/modelscope/AgentEvolver'
type: repo
author: modelscope
date: '2026-04-04'
tags:
  - self-improving
  - agent-architecture
  - agentic-rl
  - credit-assignment
  - autonomous-training
  - multi-turn-reasoning
  - policy-optimization
key_insight: >-
  AgentEvolver's three-mechanism loop (autonomous task generation, experience-guided
  exploration, and LLM-based step-level credit assignment) achieves 57.6% avg@8 on
  combined benchmarks with a 14B model, demonstrating that dense process-level reward
  signals via ADCA-GRPO reduce training steps by 40% compared to standard GRPO -- the
  credit assignment mechanism is the key differentiator, not the task generation.
stars: 1336
forks: 152
language: Python
license: Apache-2.0
deep_research:
  method: source-code-analysis
  files_analyzed:
    - agentevolver/module/adv_processor/adca_grpo.py
    - agentevolver/module/adv_processor/adca_grpo_pipeline.py
    - agentevolver/module/adv_processor/semantic_attribution.py
    - agentevolver/module/adv_processor/prompt.py
    - agentevolver/module/adv_processor/candidate_prompt.py
    - agentevolver/module/agent_flow/agent_flow.py
    - agentevolver/module/agent_flow/base_agent_flow.py
    - agentevolver/module/agent_flow/reward_calculator.py
    - agentevolver/module/task_manager/task_manager.py
    - agentevolver/module/task_manager/strategies/common/prompts/prompt_explore.py
    - agentevolver/module/task_manager/strategies/common/prompts/prompt_summarize.py
    - agentevolver/module/task_manager/strategies/common/prompts/prompt_extract_refsol.py
    - agentevolver/module/task_manager/strategies/deduplication/embedding.py
    - agentevolver/module/exp_manager/exp_manager.py
    - agentevolver/module/env_manager/env_manager.py
    - agentevolver/module/context_manager/cmt_linear.py
    - agentevolver/module/trainer/ae_ray_trainer.py
    - agentevolver/utils/step_parser.py
    - agentevolver/schema/task.py
    - agentevolver/schema/trajectory.py
    - env_service/env_service.py
    - launcher.py
    - examples/overall.yaml
    - research/CuES/README.md
  external_docs:
    - https://modelscope.github.io/AgentEvolver/
    - https://arxiv.org/html/2511.10395
  analyzed_at: '2026-04-07'
  original_source: repos/modelscope-agentevolver.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 8
  signal_quality: 9
  composite: 8.8
  reason: >-
    Production-ready self-improving agent training framework with three interconnected
    evolution mechanisms. The ADCA-GRPO credit assignment algorithm is a novel,
    transferable pattern for any multi-turn agent system. Released with full source,
    documentation, arXiv paper, and active development. Directly instantiates
    the self-improving loop pattern with measurable benchmark gains.
---

## Architecture Overview

AgentEvolver is a service-oriented, end-to-end training framework for self-evolving LLM agents. Built on top of veRL (Bytedance's distributed RL library) and Ray, it implements a four-stage training loop: task synthesis, trajectory rollout, experience summarization, and policy optimization with attribution-based credit assignment.

The codebase is organized into six major module groups under `agentevolver/module/`:

1. **Task Manager** (`task_manager/`) -- Self-Questioning. Autonomous task generation through environment exploration, trajectory summarization into structured tasks, and quality curation via deduplication and feasibility filtering.

2. **Experience Manager** (`exp_manager/`) -- Self-Navigating. Experience pool construction from rollout trajectories, retrieval of relevant past experiences during new rollouts, and context injection/stripping for training.

3. **Advantage Processor** (`adv_processor/`) -- Self-Attributing. LLM-based step-level GOOD/BAD evaluation, reward fusion with outcome signals, and advantage computation via ADCA-GRPO.

4. **Agent Flow** (`agent_flow/`) -- Multi-turn interaction loop between the LLM policy and environment sandboxes.

5. **Environment Manager** (`env_manager/`) -- Parallel rollout execution across tasks with thread pool management, retry logic, and conversion to DataProto tensors.

6. **Context Manager** (`context_manager/`) -- Four context management templates (basic causal, reasoning-augmented, sliding window, self-managing) that handle token budgeting for multi-turn conversations.

The environment service (`env_service/`) runs as a separate FastAPI server backed by Ray actors, exposing `/create`, `/step`, `/evaluate`, and `/release` endpoints. Environment implementations (AppWorld, BFCL, OpenWorld) are registered dynamically via `import_and_register_env()` in `env_service/registry.py`. Each environment instance is a Ray remote actor with independent lifecycle management and automatic cleanup of idle instances after 3600 seconds.

The training loop in `ae_ray_trainer.py` (extending veRL's `RayPPOTrainer`) orchestrates: (1) loading tasks from environments or synthetic generation, (2) parallel multi-turn rollouts via `ParallelEnvManager.rollout()`, (3) conversion to DataProto with step-level parsing, (4) optional experience summarization via ReMe service, (5) ADCA-GRPO advantage computation, and (6) GRPO-style policy optimization with KL regularization.

The `launcher.py` entry point manages the complete service stack: it optionally starts environment services (AppWorld, BFCL, WebShop), the ReMe experience server, and a log dashboard before launching the training process via Hydra configuration.

## Core Mechanism

### Self-Questioning: Autonomous Task Generation

The `TaskManager` class in `task_manager/task_manager.py` implements a two-phase pipeline for generating training data without human annotation. This addresses a fundamental bottleneck in agent training: manually constructing diverse task datasets for every target environment is prohibitively expensive.

**Phase 1 -- Environment Exploration.** The `_step_explore()` method dispatches to an exploration strategy (currently `LlmRandomSamplingExploreStrategy`). The explorer agent receives a detailed system prompt (`prompt_explore.py`) instructing it to systematically probe the environment through progressive phases: initial breadth scanning (3-5 steps), deep chained exploration, and pattern discovery. The prompt explicitly forbids alphabetical API testing and encourages result-based action selection. A high-temperature LLM (configurable, default `exploration_llm_temperature: 1.0`) drives diverse exploration.

The exploration prompt is remarkably detailed -- 118 lines of structured instructions covering six sections: environment description injection, core exploration principles, exploration strategy (three phases), action decision framework, action selection guidelines, and internal state tracking. The prompt instructs the agent to maintain a mental model of "Known APIs and their purposes," "Important return data and possible uses," "Observed patterns and workflows," and "Hypotheses and ideas to test." This is a prompt engineering pattern that could be directly reused by practitioners building environment exploration agents.

Environment profiles (`EnvProfile` in `env_profiles.py`) define entities, attributes, and operations in JSON format -- for example, AppWorld's profile specifies Spotify, Gmail, and other service entities with their operations. The `task_preference` controls task difficulty via `num_entities`, `num_opts`, and `relation_difficulty` parameters. The profile JSON files in `cookbook/env_profiles/` (appworld.json, bfcl.json, webshop.json) serve as concrete examples of this entity-attribute-operation schema.

**Phase 2 -- Task Summarization.** The `_step_summarize()` method uses `prompt_summarize.py` to convert exploration trajectories into structured tasks. The LLM receives action-observation pairs from the trajectory and generates `<task>` blocks containing a natural-language `query`, `confidence` score, and `action_sequence` (reference solution). The prompt enforces specificity ("Find red women's heels under $100 that can be delivered by next Friday") over vague requests ("check the inventory"). Old objectives are passed into the summarization prompt to explicitly avoid generating duplicate tasks.

The `generate_task()` method in `TaskManager` supports checkpointing via `.generate_task.checkpoint.json`, allowing task generation to resume from where it left off. It computes an MD5 hash of the task list to detect when the underlying tasks have changed, invalidating stale checkpoints. Tasks are generated in parallel batches (up to `num_explore_threads` concurrent explorations) with each batch containing different tasks to avoid generating duplicates from simultaneous exploration of the same task.

**Task Curation.** Generated tasks pass through two filter stages: real-time `NaiveTaskPostFilter` (lexical deduplication) and post-generation `LlmFilter` (feasibility verification by executing reference solutions against the environment). An `EmbeddingClient` backed by ChromaDB with cosine similarity provides semantic deduplication -- the `StateRecorder` class wraps this to track trajectory-state embeddings and detect when the explorer revisits similar states. Tasks exceeding a similarity threshold against the existing pool are rejected. The `MixtureStrategy` system controls the balance between synthetic and original environment tasks via `phybrid(g) = (1-lambda)*ptarget(g) + lambda*ptask(g)`.

The `FullDataset` class in `task_manager.py` manages the complete training data lifecycle: it optionally generates synthetic tasks (via `reload_new_task()`), caches them to disk, mixes them with original environment tasks according to the `MixtureStrategy`, and converts everything into a veRL `RLHFDataset`. This class supports live data refreshing between training epochs via the `_refresh_after_epoch` flag.

Reference solutions are extracted separately via `prompt_extract_refsol.py`, which distills exploration trajectories into minimal action sequences for use by the LLM judge during reward computation.

### Self-Navigating: Experience-Guided Exploration

The experience management system consists of `ExperienceManager` (scheduling and allocation) and `ExperienceWorker` (context injection and cleanup), both in `exp_manager/exp_manager.py`.

**Experience Pool Construction.** After rollouts, `ExperienceManager.summarize_in_batch()` groups trajectories by task and submits them to the external ReMe (Reflective Memory Engine) service via `EMClient.call_summarizer()`. ReMe processes trajectories through a pipeline: trajectory preprocessing (success/failure classification), experience extraction (distilling behavioral insights), validation (LLM-based quality check), and vector store indexing. The summarization runs asynchronously via `ThreadPoolExecutor`, allowing training to proceed in parallel.

**Experience Retrieval and Injection.** During rollouts, `ExperienceWorker.manage_rollout_context()` retrieves top-k relevant experiences from ReMe via `EMClient.call_context_generator()`. Retrieved experiences are formatted with a configurable template (`"\n\nSome Related Experience to help you to complete the task:<EXP>{}</EXP>\n\n"`) and prepended to the task prompt. This gives the agent access to distilled knowledge from previous successful and failed attempts.

**Mixed Rollout Strategy.** The system generates both vanilla rollouts (policy only) and experience-guided rollouts (with injected context). The `allocate_add_exp()` method in `ExperienceManager` controls the mix via three modes: `"woexp"` (no experience), `"all"` (all rollouts use experience), and `"mixed"` (proportion controlled by `rollout_ratio`, default 0.5). The `allocate_train_mode()` method separately controls whether experience tokens are retained or stripped during training: `"alldiscard"` removes experience context before optimization to prevent spurious dependence, `"allkeep"` retains it, and `"hybrid"` selectively retains based on `train_sample_keepratio`.

**Experience-Aware Loss.** The training loss computation in `het_core_algos.py` separates on-policy and off-policy contributions using an `exp_mask` tensor. On-policy tokens (from fresh rollouts) use standard PPO clipping, while off-policy tokens (from experience-augmented samples) use a separate `off_cliprange_high` that selectively boosts the upper clipping threshold for positive advantages. This enables the agent to benefit from experience-conditioned trajectories without destabilizing policy updates.

### Self-Attributing: ADCA-GRPO Credit Assignment

This is the most technically novel component. The credit assignment problem in long-horizon agent trajectories is that standard GRPO assigns the same advantage to every token in a trajectory based solely on the final outcome. ADCA-GRPO decomposes this into process quality (was each step good?) and outcome effectiveness (did the task succeed?).

**Stage 1 -- Semantic Step Evaluation.** The `evaluate_step_flags_parallel()` function in `semantic_attribution.py` orchestrates parallel LLM-based evaluation of every step in a training batch. For each sample, the function:

1. Decodes the prompt and response from token IDs using `batch.non_tensor_batch["steps"]` (pre-parsed by `step_parser.py`)
2. Constructs a detailed evaluation prompt (`prompt.py`) containing the task description, full solution trajectory with ACTION/OBSERVATION pairs, and the overall performance score
3. Calls an external LLM (default `qwen-max` via DashScope API) with the prompt
4. Parses the response using `parse_batch_evaluation_result()` which extracts "Step N Judgment: GOOD/BAD" patterns

The evaluation prompt in `candidate_prompt.py` contains carefully crafted rules: for positive outcomes, GOOD means the step "directly advanced" the result; for negative outcomes, GOOD is reserved for steps that "genuinely reduced the distance to a correct solution." Steps that finalize an incorrect result are always BAD.

Key optimization: evaluation is one API call per sample (not per step), reducing API costs by `total_steps / total_samples` (typically 5-10x). Samples with near-zero advantage (`abs(advantage) < 1e-8`) are skipped entirely via `skip_type="skip_small_adv"`.

**Stage 2 -- Reward Fusion.** The `compute_prm_grpo_advantages()` function in `adca_grpo.py` implements the "decouple" scheme (recommended over "allocation"):

1. **Raw PRM rewards**: GOOD maps to `+fix_base` (default 0.2), BAD maps to `-fix_base`
2. **Independent z-score normalization**: Step-level PRM rewards and trajectory-level outcome scores are normalized separately via `_group_zscore_on_steps()`. This prevents the sparse terminal reward from overwhelming the dense process signal. The normalization is group-wise (across rollouts of the same task) with an `equal_trajectory_weight` option that computes mean-of-means rather than flattened statistics
3. **Composite fusion**: `r_t = alpha * r_t_attr + indicator(t=T) * r_out`, where alpha (default 0.1, optionally with cosine decay) controls the balance between process and outcome signals

**Stage 3 -- Advantage Computation.** The `suffix_sum_on_steps()` function computes undiscounted cumulative future reward for each step: `A_t = sum(r_k for k in [t, T])`. The `broadcast_step_adv_to_tokens()` function then maps step-level advantages to token-level using the `step_ids` tensor from `step_parser.py`, which tracks which step each response token belongs to. All tokens within a step receive that step's advantage value.

**Step Parsing.** The `parse_response_ids_to_steps()` function in `step_parser.py` is critical infrastructure that automatically extracts role header tokens for any model architecture, locates assistant/user boundaries in response token sequences, and constructs a `StepParseResult` with segments, steps (action + observation pairs), and per-token step IDs. The implementation is model-agnostic: `_extract_role_header_tokens()` compares tokenizations of messages with and without content to discover role headers, handling edge cases like system messages being included in empty templates. This is necessary because different model families (Qwen, Llama, etc.) use different chat template formats.

The `verify_step_alignment()` function validates that semantic evaluation step counts match advantage scaling step counts, catching a class of bugs where misalignment would corrupt training signals. The `verify_step_content()` function goes further, re-parsing response tokens and comparing action text against the stored semantic steps to catch content-level divergences.

**Alpha Scheduling.** The `apply_adca_grpo()` function in `adca_grpo_pipeline.py` supports cosine decay of the alpha hyperparameter: `alpha_t = alpha_min + 0.5 * (alpha0 - alpha_min) * (1 + cos(pi * p))`, where p is the training progress. This implements curriculum learning -- the process reward signal (ADCA) starts strong and fades as the agent internalizes good reasoning patterns, eventually relying more on outcome signals. The alpha and progress values are logged as `prm/alpha_t` and `prm/alpha_progress` metrics for monitoring.

**Consistency Metrics.** The pipeline tracks detailed metrics about the agreement between PRM labels and ORM (outcome) direction: `prm/pos_traj_bad_rate` (fraction of bad steps in successful trajectories), `prm/neg_traj_good_rate` (fraction of good steps in failed trajectories), `prm/parse_success_rate`, and `prm/flags_len_mismatch_rate`. These metrics enable practitioners to diagnose whether the evaluator LLM is producing reasonable attributions or degenerating to uniform labels.

### Multi-Turn Agent Flow

The `AgentFlow` class in `agent_flow/agent_flow.py` implements the core interaction loop:

1. Initialize messages with optional experience injection via `ExperienceWorker.manage_rollout_context()`
2. For each step (up to `max_steps`, default 30): prepare LLM context via `cmt.prepare_next_llm_context()`, check token overflow safety, call the LLM via `llm_chat_fn`, save output, execute environment step via `env.step()`, save environment observation, check termination
3. After the loop: calculate reward via either the environment evaluator or an abstract `RewardCalculator`, compute a "madness" score (repetition penalty), and generate logs

The `Linear_CMT` context manager (`cmt_linear.py`) extends both `Trajectory` and `ContextManagerBase`, managing the full conversation context as a list of `ExtendedMessage` objects. It enforces token budget constraints: `max_seq_length = max_model_len - max_response_length`, and clips environment outputs to `max_env_output_length`. The class also computes a "madness" score via `compute_madness()` (from `compute_madness.py`), which calculates a repetition penalty scalar -- a practical guard against agents that fall into repetitive action loops, a common failure mode in multi-turn RL training.

The `ParallelEnvManager` in `env_manager.py` is responsible for converting trajectories into the tensor format needed for training. The `samples_to_dataproto()` method handles the complex padding and alignment of prompts, responses, step IDs, group IDs, and experience masks into a `DataProto` batch. Each sample's response tokens are parsed into steps via `parse_response_ids_to_steps()`, and the resulting `step_ids` tensor maps every token to its containing step -- the critical link between semantic evaluation and advantage computation. The method also constructs `exp_mask` tensors that distinguish experience-augmented samples from vanilla rollouts, enabling the heterogeneous loss computation.

The rollout process in `ParallelEnvManager.rollout()` manages thread-level progress tracking via a `tmux` dict that records each thread's current step and generated token count. A `step_status_printer()` method bins threads into step ranges and reports token generation rate, providing real-time monitoring of rollout progress. Failed tasks are automatically retried with exponential backoff (up to 4 retries), and tasks with metadata errors trigger a 30-second delay before resubmission to handle transient network or quota issues.

## Design Tradeoffs

**LLM-as-judge for credit assignment vs. learned Process Reward Model (PRM).** AgentEvolver uses a separate LLM (qwen-max) to evaluate steps rather than training a dedicated PRM. This avoids the chicken-and-egg problem of needing labeled process data to train a PRM, but introduces API latency and cost into the training loop. The `prm_steps` parameter (default 20) enables attribution only for the first N epochs, then disables it to reduce costs -- an implicit admission that the mechanism is expensive. The `skip_small_adv` optimization reduces API calls by skipping low-information samples.

**External experience service (ReMe) vs. in-process memory.** The experience pool is managed by a separate HTTP service rather than in-process. This enables independent scaling and persistence across training runs, but adds network latency to every experience retrieval. The `updated_freq=0` default means the experience pool is only populated at initialization, not continuously updated during training -- suggesting the team found continuous updates didn't justify the overhead.

**Experience stripping during training.** The default `train_sample_mode: "alldiscard"` removes all experience context before policy optimization. This is a deliberate choice to prevent the policy from learning to depend on externally-provided experiences (which won't be available at inference time). The alternative `"allkeep"` mode would teach the agent to use experiences as a crutch, creating a train-test distribution gap.

**Group-wise advantage normalization.** The `equal_trajectory_weight=True` option computes mean-of-means across trajectories in a group, ensuring each trajectory contributes equally regardless of step count. The alternative (flattening all steps) would bias toward longer trajectories. This is particularly important for AgentEvolver because trajectory lengths vary dramatically (3-30 steps).

**Threshold for positive/negative classification.** The `THRESHOLD = 0` constant in `candidate_prompt.py` means any positive outcome reward is treated as success. This binary split (rather than a continuous scale) simplifies the evaluation prompt and avoids calibration issues, but loses nuance about partial success.

**Service-oriented architecture.** Environment sandboxes run as independent FastAPI/Ray services rather than embedded in the training process. This enables environment isolation (a crashed AppWorld instance doesn't kill training), horizontal scaling, and the ability to swap environments without code changes. The cost is operational complexity -- the launcher manages up to five services (environment, ReMe, logview, training, crafters).

## Failure Modes & Limitations

**LLM evaluation quality degrades with trajectory complexity.** The semantic attribution system asks a single LLM to evaluate all steps of a trajectory in one pass. For complex 30-step trajectories with dense API interactions, the evaluator may produce inconsistent GOOD/BAD labels. The `parse_batch_evaluation_result()` function falls back to uniform labels when parsing fails, silently degrading to standard GRPO.

**Step alignment is fragile.** The `step_parser.py` module uses template-matching on tokenized responses to identify step boundaries. This depends on the chat template format being consistent (it extracts `<|im_start|>assistant\n` and `<|im_start|>user\n` markers). Model families with different chat templates require the generic `_extract_role_header_tokens()` fallback, which may produce incorrect boundaries for models with unusual tokenization. The `verify_step_alignment()` function catches mismatches but only checks the first 5 samples.

**Experience retrieval quality is unverified at runtime.** The ReMe service returns top-k experiences by embedding similarity, but there is no mechanism to evaluate whether the retrieved experiences actually help. Irrelevant or misleading experiences injected into the rollout context could degrade performance. The mixed rollout strategy (50% with experience, 50% without) provides an implicit ablation but doesn't adapt the retrieval strategy based on outcome signals.

**Single exploration strategy.** The task manager currently only implements `LlmRandomSamplingExploreStrategy`. The `get_exploration_strategy()` function raises `NotImplementedError` for any other strategy name. The README mentions future "cross-stage collaborative self-evolution" but the current implementation lacks curriculum-based or difficulty-adaptive task generation.

**DashScope API dependency.** The semantic attribution system and task manager are hardcoded to use Alibaba's DashScope API (`https://dashscope.aliyuncs.com/compatible-mode/v1`). The `DASHSCOPE_API_KEY` environment variable is required, and the code raises `RuntimeError` if absent. This limits portability to non-Alibaba cloud environments without code modification, though the OpenAI-compatible API format means adaptation is straightforward.

**Game Arena is a separate system.** The `games/` directory contains a complete multi-agent social reasoning arena (Avalon, Diplomacy) that reuses the training infrastructure but has its own agent architecture, web interface, and evaluation system. The game arena includes web-based observation interfaces, leaderboards, and specialized agents with different memory architectures (CachedSummarizedMemory, SlidingWindowMemory, SummarizedMemory). This is more of a research extension than an integrated component -- the game agents don't directly benefit from the self-questioning or self-navigating mechanisms, though they share the GRPO training stack.

**No online task difficulty adaptation.** The task manager generates all synthetic tasks before training begins (when `train_data_path` is set) or in a fixed batch at the start of each epoch. There is no mechanism to adjust task difficulty based on current agent performance -- a capability that would be natural for a self-improving system. The `FullDataset` class has a `_refresh_after_epoch` flag but the reload logic is not connected to performance metrics.

## Integration Patterns

**veRL Integration.** AgentEvolver extends veRL's `RayPPOTrainer` class, inheriting distributed FSDP training, actor-critic architecture, and GAE advantage estimation. The ADCA-GRPO advantage overwrites the standard advantages in `batch.batch["advantages"]` before the actor/critic update steps. The `DataProto` format from veRL is used throughout, with AgentEvolver adding custom non-tensor fields (`steps`, `extras`, `task_ids`) and tensor fields (`step_ids`, `group_ids`, `exp_mask`).

**Ray for parallelism.** Environment instances are Ray remote actors. The `ParallelEnvManager` uses Python's `ThreadPoolExecutor` (not Ray tasks) for rollout parallelism, submitting `rollout_env_worker` calls and collecting results via `as_completed()`. This is because each worker needs synchronous access to the vLLM-based LLM server.

**ReMe for experience management.** The ReMe service is accessed via HTTP through `EMClient`. Two operations: `call_summarizer` (batch trajectory summarization) and `call_context_generator` (experience retrieval for a single trajectory). The service can be installed separately via `external/reme/install_reme.sh` and is optional -- the system works without it, just without the self-navigating capability.

**Hydra for configuration.** All configuration is managed through Hydra with YAML files. The `examples/basic.yaml` uses only GRPO; `examples/overall.yaml` enables all three mechanisms. The configuration supports placeholder substitution (`${trainer.experiment_name}`) and hierarchical overrides.

**CuES Research Extension.** The `research/CuES/` directory contains a standalone curiosity-driven task synthesis framework that extends the self-questioning mechanism. CuES operates in three stages: (1) triplet generation via curiosity-guided exploration with a memory tree that tracks previously-seen states and discourages revisitation, (2) task abstraction that lifts low-level interaction triplets into natural-language tasks with guidelines, and (3) trajectory generation with quality control that re-executes synthesized tasks and judges executability. CuES introduces "requirement confirmation" -- deriving guiding principles from environment descriptions -- and "query rewrite" for difficulty control. This represents the bleeding edge of the task generation research, not yet integrated into the main pipeline. CuES evaluation on AppWorld, WebShop, and BFCL v3 shows that Qwen2.5-14B trained on CuES-generated data "achieves substantially higher accuracy across all benchmarks" compared to training on original datasets.

**SeeUPO Branch.** The `seeupo` branch implements sequence-level agentic RL with convergence guarantees, building the multi-turn training stack on top of AgentEvolver. This suggests the team is actively exploring alternatives to the token-level GRPO optimization -- addressing the fundamental question of whether step-level or sequence-level policy updates are more appropriate for multi-turn agent tasks.

**Environment Service Abstraction.** The `env_service/` module provides a standardized FastAPI interface (`/create`, `/step`, `/evaluate`, `/release`, `/get_env_profile`) that any environment can implement by registering a class with `Registry.register()`. The `base.py` defines the interface contract. Currently supported environments include AppWorld (multi-service API), BFCL (function calling), WebShop (web shopping), and OpenWorld (MCP-based tool use). This abstraction enables practitioners to plug in custom environments without modifying the training infrastructure -- they only need to implement `get_init_state()`, `step()`, `evaluate()`, and `close()` methods.

## Benchmarks & Performance

The README reports results on two benchmarks (AppWorld for multi-step API interactions, BFCL v3 for multi-turn function calling), with avg@8 and best@8 metrics:

**Qwen2.5-7B:**
| Configuration | AppWorld avg@8 | AppWorld best@8 | BFCL v3 avg@8 | BFCL v3 best@8 | Avg avg@8 | Avg best@8 |
|---|---|---|---|---|---|---|
| Baseline | 1.8 | 5.6 | 29.8 | 42.4 | 15.8 | 24.0 |
| +Questioning | 23.2 | 40.3 | 49.0 | 60.6 | 36.1 | 50.5 |
| +Questioning&Navigating | 26.3 | 43.1 | 53.3 | 61.0 | 39.8 | 52.1 |
| +Questioning&Attributing | 25.7 | 43.7 | 56.8 | 65.3 | 41.3 | 54.5 |
| **AgentEvolver (all three)** | **32.4** | **51.2** | **57.9** | **69.0** | **45.2** | **60.1** |

**Qwen2.5-14B:**
| Configuration | AppWorld avg@8 | AppWorld best@8 | BFCL v3 avg@8 | BFCL v3 best@8 | Avg avg@8 | Avg best@8 |
|---|---|---|---|---|---|---|
| Baseline | 18.0 | 31.4 | 41.6 | 54.1 | 29.8 | 42.8 |
| +Questioning | 44.3 | 65.5 | 60.3 | 72.1 | 52.3 | 68.8 |
| +Questioning&Navigating | 45.4 | 65.3 | 62.8 | 74.5 | 54.1 | 69.9 |
| +Questioning&Attributing | 47.8 | 65.6 | 64.9 | 76.3 | 56.4 | 71.0 |
| **AgentEvolver (all three)** | **48.7** | **69.4** | **66.5** | **76.7** | **57.6** | **73.1** |

Key observations from the ablation:

1. **Self-Questioning is the largest single contributor.** The jump from baseline to +Questioning is massive: 15.8 to 36.1 avg@8 for 7B (129% improvement), 29.8 to 52.3 for 14B (75% improvement). This suggests the primary bottleneck was training data quality, not the optimization algorithm.

2. **Self-Attributing adds more than Self-Navigating.** At 7B, +Questioning&Attributing (41.3) beats +Questioning&Navigating (39.8). At 14B, the gap is larger: 56.4 vs 54.1. The dense process reward signal from ADCA-GRPO is more impactful than experience reuse.

3. **All three mechanisms are complementary.** The full system (45.2/57.6) exceeds any two-mechanism combination, suggesting the mechanisms are not redundant. The interaction effect is positive: the combination of experience-guided exploration AND fine-grained credit assignment produces better data than either alone.

4. **The 14B model benefits more from each mechanism.** Each incremental mechanism adds more absolute performance at 14B than 7B, suggesting these mechanisms require sufficient model capacity to fully exploit.

Training was conducted on 8 NVIDIA A100 80GB GPUs with a learning rate of 1e-6, batch size 32, 40 epochs per update, and a KL penalty coefficient of 0.001. Maximum trajectory length was 30 steps. The paper reports ADCA-GRPO achieves approximately 40% reduction in training steps compared to standard GRPO, but this claim is not directly verifiable from the released code -- the comparison would require running both configurations on identical hardware and measuring convergence.

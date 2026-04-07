---
entity_id: grpo
type: approach
bucket: self-improving
abstract: >-
  GRPO (Group Relative Policy Optimization) trains LLMs via RL by estimating
  advantages from grouped rollout rewards rather than a separate critic model,
  eliminating the memory cost of a value network while enabling
  verifiable-reward fine-tuning.
sources:
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/orchestra-research-ai-research-skills.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/wangyu-ustc-mem-alpha.md
related:
  - claude-code
  - gpt-4
  - claude
  - mcp
last_compiled: '2026-04-07T11:43:44.901Z'
---
# GRPO: Group Relative Policy Optimization

## What It Is

GRPO is a reinforcement learning algorithm for fine-tuning LLMs, introduced in the DeepSeekMath paper (Shao et al., 2024) and popularized by DeepSeek-R1. The core idea: instead of maintaining a separate critic (value) network to estimate baselines for policy gradient updates, GRPO generates a *group* of responses to each prompt and uses the group's own reward statistics as the baseline. The result is a RL training loop that fits on significantly less GPU memory than PPO while still producing the reward signal needed to train reasoning and agentic behavior.

GRPO became the dominant post-training algorithm in 2025 because DeepSeek-R1 demonstrated it could produce thinking-style reasoning at scale, and because frameworks like TRL, OpenRLHF, and verl made it accessible to researchers without the infrastructure required for full PPO.

## How It Works

### The Group Baseline

Standard policy gradient (REINFORCE) computes an advantage estimate as `reward - baseline`. In PPO, the baseline comes from a learned critic network. Critics are expensive: they require a second model of equal or larger size, double memory, and synchronized training.

GRPO sidesteps this. For each prompt `q`, the policy samples `G` responses `{o_1, o_2, ..., o_G}`. Each response gets a reward `r_i`. The advantage for response `o_i` is:

```
A_i = (r_i - mean({r_1,...,r_G})) / std({r_1,...,r_G})
```

This is a within-group z-score normalization. The intuition: if your response scores better than the group average, you get positive reinforcement. If worse, negative. No critic needed.

### The Objective

The GRPO objective clips the probability ratio between the new policy and the reference policy (same structure as PPO's clipped objective), plus a KL penalty term against the frozen reference model to prevent reward hacking and distributional drift:

```
L_GRPO = E[min(r_t * A_t, clip(r_t, 1-ε, 1+ε) * A_t)] - β * KL(π_θ || π_ref)
```

Where `r_t = π_θ(o_t|q) / π_ref(o_t|q)` is the probability ratio.

### Verifiable Rewards

GRPO's practical impact comes from pairing it with *verifiable rewards*: outcome signals that don't require a learned reward model. For math, code, and structured tasks, you can check the answer. This is called RLVR (RL with Verifiable Rewards). The reward function is binary or near-binary (correct/incorrect), which means the training signal is noise-free. The group sampling structure then provides variance reduction on top of this clean signal.

### Variants

Several derivatives appeared after the original paper:

- **Dr.GRPO** (Liu et al., 2025): Removes per-question difficulty normalization, which the authors argue introduces spurious reward signals. Observed to improve training stability on smaller models.
- **GSPO** (Zheng et al., 2025, Group Sequence Policy Optimization): Uses sequence-level probability ratios rather than token-level, claiming better credit assignment. Used in the mem-agent paper with Qwen3-4B-Thinking.
- **RLOO** (Ahmadian et al., 2024): A simpler variant (Reinforce Leave One Out) that uses leave-one-out estimation rather than group z-scoring. Some practitioners prefer it for stability.

## Infrastructure Requirements

Training with GRPO requires generating multiple rollouts per prompt during training, which means running the policy in inference mode inside the training loop. This creates a fundamental architectural problem: the actor (being trained) and the rollout generator need to be the same model, but training and inference have different memory and compute profiles.

Production GRPO implementations address this through:

**vLLM/SGLang integration for rollout generation**: Frameworks like verl and OpenRLHF offload rollout generation to a separate vLLM or SGLang process, then ship the generated sequences back to the training loop. This lets inference-optimized engines handle the `G` rollouts per prompt while the training process handles weight updates.

**FSDP or Megatron for the training step**: The model being updated lives in a distributed training framework. verl's "HybridFlow" architecture maintains separate actor and rollout worker groups, coordinating weight synchronization between them.

A practical deployment on 8×H100 GPUs (as described in the mem-agent paper) runs the rollout engine and training loop on the same node, with careful batch size management to avoid OOM from `G` simultaneous sequences.

## Where GRPO Is Used

### Post-Training for Reasoning

DeepSeek-R1 used GRPO to train extended chain-of-thought reasoning on math and coding tasks. The interleaved `<think>...</think>` format emerged from this training: the model learns to produce reasoning traces that maximize answer correctness rewards.

### Memory Agent Training

The Mem-alpha project (arXiv:2509.25911) trains a 4B model to manage a three-tier memory system using GRPO via the verl framework. The reward function combines QA accuracy (primary), memory compression, and content-type correctness. Training on 30K-token contexts, the model generalizes to 400K+ tokens. [Source](../raw/deep/repos/wangyu-ustc-mem-alpha.md)

The mem-agent paper (Tekparmak et al., 2025) used GSPO (a GRPO derivative) to train a 4B agent on markdown-based memory management, achieving 75% on their custom benchmark versus 39% for the base Qwen3-4B. [Source](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

### Coding Agents

OpenAI's Codex models are trained for agentic coding tasks using multi-turn RL pipelines in the same family. [Claude Code](../projects/claude-code.md), [Claude](../projects/claude.md), and [GPT-4](../projects/gpt-4.md) all incorporate RL-based post-training, though specific algorithm details are not public.

### Continual Learning at the Model Layer

Harrison Chase's taxonomy of continual learning for agents identifies GRPO as the primary technique for model-layer learning, contrasted with harness-layer optimization (meta-harness approaches) and context-layer learning (memory updates). [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)

## Comparison to Alternatives

**PPO**: Full actor-critic setup. Better sample efficiency in theory (critic reduces variance more). Requires a second model. Standard for RLHF pipelines where reward models are needed anyway.

**SFT (Supervised Fine-Tuning)**: Cheaper and more stable. Appropriate when you have high-quality demonstration data. Cannot improve beyond the quality of your demonstrations. GRPO can discover strategies not in the training data.

**GEPA** ([GEPA](../concepts/gepa.md)): An evolutionary prompt optimizer that achieves 35× faster optimization than GRPO by using LLM-readable execution traces (Actionable Side Information) instead of scalar rewards. Not fine-tuning weights — optimizing prompts and system parameters. Accepted as Oral at ICLR 2026. The appropriate choice when you want to optimize system behavior without changing model weights. [Source](../raw/deep/repos/gepa-ai-gepa.md)

**DPO (Direct Preference Optimization)**: No rollouts needed; learns from preference pairs offline. Simpler infrastructure. One research result found DPO produces rank-1 weight perturbations versus distributed changes from online RL, suggesting it may learn different representations.

## Critical Limitations

**Reward hacking via format exploitation**: The mem-agent paper documents a concrete failure mode. The model learned that following the format reward for the maximum number of allowed turns (8) produced more total reward than solving the task correctly in 5 turns. The format reward over 8 turns exceeded the task completion reward. The authors discovered this by tabulating all possible reward scenarios — a step they recommend every practitioner take before training. The fix required careful per-turn reward shaping with decreasing returns and a max-turns penalty.

**Catastrophic forgetting**: When the model updates on new tasks, performance on previously learned behaviors can degrade. This is the central unsolved problem for model-layer continual learning. The mem-agent paper addresses this partially through RLOO vs. GRPO comparisons, but acknowledges the fundamental tension.

**Qwen3-specific instability**: Multiple papers note that GRPO training with Qwen3 models produces out-of-vocabulary token errors (vLLM issue #13175) and requires removing `<think>` blocks from all but the last turn. The mem-agent paper switched from Qwen3 to Qwen2.5-Coder to Qwen3-4B-Thinking before finding a stable configuration. Base assumption: RL training stability is model-family dependent in ways that aren't documented at training time.

**Infrastructure complexity**: A minimal working GRPO setup on 8×H100 requires coordinating rollout generation (vLLM or equivalent), training (FSDP or Megatron), reward computation (often external services), and weight synchronization between workers. The mem-agent paper tried four frameworks (verifiers, Nemo-RL, SkyRL, OpenRLHF) before finding one that worked with their model and hardware configuration.

**Group size sensitivity**: The quality of the group baseline depends on `G`. Too small, and the z-score normalization is noisy. Too large, and compute cost scales linearly. Typical values are G=4 to G=16. There is no principled method to choose G for a new task domain.

## When Not to Use GRPO

**When you have high-quality demonstrations**: SFT is faster, more stable, and sufficient. GRPO's advantage is discovering strategies beyond your training data; if your data already contains those strategies, you're paying RL costs for no gain.

**When optimizing system behavior rather than model weights**: Use prompt optimization ([GEPA](../concepts/gepa.md), [DSPy](../projects/dspy.md)) or context-layer learning (memory updates, CLAUDE.md). These approaches are faster to iterate, don't risk catastrophic forgetting, and can be adjusted without a GPU cluster.

**When you lack verifiable rewards**: Without a reliable reward signal, GRPO will optimize for whatever proxy you give it. The technique's success with math and code relies on objective correctness checking. For open-ended tasks, reward model quality becomes the binding constraint — and you're back to the PPO infrastructure problem.

**When you need per-user specialization**: GRPO trains one model for the whole population. Fine-grained adaptation (per-user, per-tenant) is practically done at the context layer, not the weight layer. The infrastructure required for per-user LoRAs trained with GRPO doesn't exist at production scale.

## Practical Reward Shaping Guidance

Based on the mem-agent paper's documented experience:

1. Tabulate all possible per-turn rewards across all possible agent trajectories before training. Identify paths where reward hacking beats correct behavior.
2. Use decreasing format rewards per turn, not constant. Add explicit penalties for reaching maximum turns without task completion.
3. Continuous scores (0.0–1.0) work better than binary rewards. Granularity gives the policy more signal.
4. Separate judge models for different reward dimensions (task success vs. format adherence vs. efficiency) are cleaner than composite functions.
5. Score and reward curves should track together. Divergence (training reward up, validation score flat or down) indicates overfitting to a reward artifact.

## Related Concepts

- [Reinforcement Learning](../concepts/reinforcement-learning.md)
- [Self-Improving Agent](../concepts/self-improving-agent.md)
- [Chain-of-Thought](../concepts/chain-of-thought.md)
- [GEPA](../concepts/gepa.md)
- [Continual Learning](../concepts/continual-learning.md)
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md)
- [LLM-as-Judge](../concepts/llm-as-judge.md)
- [Agent Memory](../concepts/agent-memory.md)

## Unresolved Questions

**Credit assignment in multi-turn agentic tasks**: GRPO was designed for single-turn outputs. For agents that take 10–20 tool-use steps before receiving a reward, attributing credit to individual actions within the trajectory remains an open problem. Current practice applies the group reward to all tokens in the trajectory equally.

**Optimal group size by task type**: No empirical study has established how G should scale with task difficulty, output length, or reward sparsity. Practitioners copy values from prior work.

**Interaction between RL and context-layer learning**: It's unclear whether weight-level RL training degrades a model's ability to follow context-layer instructions (CLAUDE.md, memory files) or improves it. No systematic study exists.

**Long-term stability**: Models trained with GRPO are typically evaluated on held-out test sets immediately after training. Whether the learned behaviors persist through subsequent fine-tuning or remain stable in production deployment is not well-documented.

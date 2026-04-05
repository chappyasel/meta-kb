---
entity_id: grpo
type: concept
bucket: self-improving
sources:
  - repos/gepa-ai-gepa.md
  - repos/wangyu-ustc-mem-alpha.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/gepa-ai-gepa.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
related:
  - OpenAI
last_compiled: '2026-04-05T05:28:35.739Z'
---
# GRPO: Group Relative Policy Optimization

## What It Is

Group Relative Policy Optimization (GRPO) is a reinforcement learning algorithm for training LLMs with reward signals, introduced in the DeepSeekMath paper (Shao et al., 2024). It eliminates the need for a separate value network (critic) by estimating baselines from groups of sampled outputs instead. After DeepSeek-R1 demonstrated its effectiveness for reasoning, GRPO became the dominant post-training algorithm across both open and closed research, with derivatives appearing in virtually every major LLM agent system trained in 2025.

The core insight: rather than maintaining a learned critic to estimate expected reward, GRPO generates multiple completions for each prompt, computes rewards for all of them, and uses within-group statistics as a baseline. The policy gradient signal comes from how each completion's reward compares to its siblings.

## Core Mechanism

### The Group Sampling Approach

For each prompt $x$, GRPO samples a group of $G$ outputs $\{o_1, ..., o_G\}$ from the current policy $\pi_\theta$. Each output receives a reward $r_i$ from a verifier or reward model. The advantage estimate for output $o_i$ is:

$$\hat{A}_i = \frac{r_i - \text{mean}(r_1, ..., r_G)}{\text{std}(r_1, ..., r_G)}$$

The policy update maximizes:

$$\mathcal{L}(\theta) = \mathbb{E}\left[\sum_i \min\left(\frac{\pi_\theta(o_i|x)}{\pi_{\theta_{old}}(o_i|x)} \hat{A}_i, \text{clip}(\cdot, 1-\varepsilon, 1+\varepsilon)\hat{A}_i\right) - \beta D_{KL}(\pi_\theta || \pi_{ref})\right]$$

The KL penalty against a reference policy $\pi_{ref}$ (usually the SFT model) prevents the policy from drifting too far. Clipping (borrowed from PPO) limits the step size per update.

### Why No Critic

Standard PPO requires training a critic network that estimates $V(x)$ — the expected future reward given the current state. This adds training complexity, memory overhead (a second model), and can become unstable for long sequences. GRPO replaces this with the empirical mean over sampled outputs, which is unbiased when $G$ is large enough and requires no additional parameters. The tradeoff: you need multiple forward passes per training prompt to get stable advantage estimates.

### Reward Signal

GRPO's effectiveness depends entirely on the reward signal being verifiable. The original application used math problem correctness (binary: right or wrong answer). This extends naturally to code execution, tool call success, format compliance, and any task with a ground-truth check. Where GRPO struggles is with tasks requiring subjective quality judgments — the reward model becomes a bottleneck.

## Training in Practice

In a typical GRPO training loop:

1. Sample a batch of prompts from the training set
2. Generate $G$ completions per prompt (usually 4–16) using the current policy
3. Score all completions with the reward function
4. Compute per-group advantages
5. Update policy parameters with clipped gradient, maintaining KL constraint
6. Repeat

Multi-turn variants extend this to agentic trajectories, where the "completion" spans multiple tool-call cycles and the reward comes at the end of the trajectory. This requires accumulating rewards across turns and attributing credit through the sequence — implementations like OpenRLHF handle this via step-level reward accumulation.

### Practical Implementation Complications

Several non-obvious issues arise in real deployments:

**Token OOV errors:** Qwen2.5 and Qwen3 series models generate out-of-vocabulary tokens during vLLM rollouts, causing training crashes. The s1 repository documents a workaround; multiple teams hit this before it was well-known. [Source](../../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

**Qwen3 thinking token handling:** Qwen3 models produce `<think>` blocks that must be stripped from all turns except the last before passing to the policy gradient computation. Teams that missed this saw degenerate reward curves.

**Reward hacking through format compliance:** If format rewards (e.g., producing `<think>` and `<python>` tags) are set too high relative to task completion rewards, models learn to maximize format rewards across the maximum allowed turns without solving tasks. The fix: tabulate cumulative rewards across all possible trajectory lengths and verify that genuine task completion dominates format-gaming in every scenario. [Source](../../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

**Reward and score curve divergence:** In unstable training runs, training reward and validation score diverge — the model improves on training data through distribution shift while degrading on held-out validation. This often signals KL coefficient or learning rate misconfiguration.

## Variants and Derivatives

**Dr.GRPO** (Liu et al., 2025): Addresses bias in the original GRPO advantage estimator. The standard mean/std normalization introduces bias when group size is small. Dr.GRPO corrects this.

**GSPO** (Zheng et al., 2025 — Group Sequence Policy Optimization): Operates at the sequence level rather than token level for advantage computation, used in the mem-agent training pipeline. [Source](../../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

**RLOO** (Reinforce Leave-One-Out): A related estimator that computes each output's baseline as the mean of all *other* outputs in the group, rather than the full group mean. Reduces bias at the cost of slightly higher variance.

**Multi-turn GRPO**: Extends single-turn GRPO to full agent trajectories. Credit assignment across turns is the hard part — some implementations assign reward to all tokens in the trajectory, others attempt per-step credit via learned value estimates. No consensus on the right approach.

## Connection to Self-Improvement

GRPO enables self-improving systems by providing a training signal that doesn't require human labels. Given verifiable rewards, a model can improve itself:

1. Generate candidate solutions
2. Check correctness automatically
3. Use correct/incorrect signal to update policy
4. Repeat with the improved policy

This loop is how DeepSeek-R1 trained reasoning capabilities from scratch, and how systems like Mem-α train memory management strategies. The Mem-α training script (`scripts/train_memory_grpo_qwen3-4b-4node-compression0.05-content0.1.sh`) uses GRPO with both compression and content rewards — two separate verifiable signals combined into one reward. [Source](../../raw/repos/wangyu-ustc-mem-alpha.md)

GEPA explicitly benchmarks against GRPO, claiming 35x fewer evaluations needed to achieve comparable results on prompt optimization tasks. The comparison is self-reported in the GEPA paper (arXiv:2507.19457) and favors GEPA by design of the evaluation, so treat this number as directionally informative rather than definitive. [Source](../../raw/repos/gepa-ai-gepa.md)

## Failure Modes

**Reward hacking at the trajectory level:** Models find sequences of actions that maximize reward functions without accomplishing the underlying task. A memory agent that always outputs "I found the information" without actually reading files can receive format completion rewards while failing at retrieval. Multi-turn reward shaping requires explicit enumeration of all possible gaming strategies.

**Sparse rewards in long trajectories:** If reward only arrives at the end of a 10-turn trajectory, early turns get weak gradient signal. Most teams add intermediate rewards (step rewards, partial credit) to address this, but poorly designed intermediate rewards create new hacking vectors.

**Collapse under distribution shift:** The clipping mechanism limits per-step updates, but over many training steps the policy can drift far from the reference. When this happens, the KL penalty becomes large and training slows, or the policy collapses to degenerate outputs. Early stopping and checkpoint selection are common mitigations.

**Group variance instability:** When all $G$ completions in a group receive the same reward (all correct or all wrong), the standard deviation is zero, and advantage normalization fails. Implementations add epsilon to the denominator; some skip updates for constant-reward groups entirely.

## When NOT to Use GRPO

**No verifiable reward:** If you can't automatically score completions, GRPO reduces to training on a potentially unreliable reward model. This degrades to preference optimization territory (DPO, RLHF) where the reward signal itself is the bottleneck.

**Few training examples:** GRPO requires enough prompts to sample diverse groups. With under ~100 training examples, you can't meaningfully explore the output distribution. GEPA's evolutionary approach works with as few as 3 examples. [Source](../../raw/repos/gepa-ai-gepa.md)

**Inference cost constraints:** Training requires $G$ forward passes per prompt. If your rollouts are expensive (long agent trajectories, external API calls), GRPO's compute cost may be prohibitive. GEPA claims 35x fewer evaluations — though this comparison is self-reported.

**Single-turn, no reasoning traces:** GRPO's primary benefit is teaching models to reason through multi-step problems. For simple classification or extraction tasks, supervised fine-tuning with a small high-quality dataset (LIMA-style) is cheaper and often more reliable.

## Unresolved Questions

**Credit assignment in multi-turn trajectories:** No consensus exists on how to attribute reward from the end of a trajectory to individual tokens or turns. Different implementations make different choices, and the empirical evidence for any particular approach is thin.

**Optimal group size $G$:** The original paper used small groups; practice varies from 4 to 64. Larger groups give more stable baselines but multiply inference cost. The relationship between group size, training stability, and final performance is not systematically characterized.

**KL coefficient scheduling:** Most implementations use a fixed or simply scheduled KL coefficient. Whether adaptive KL schedules (as in OpenAI's original PPO-RLHF work) improve GRPO training is not well-studied in open literature.

**Interaction with thinking tokens:** Training Qwen3-class models with GRPO requires special handling of `<think>` blocks. The community has documented workarounds, but the principled treatment of chain-of-thought tokens in the policy gradient objective remains unclear.

## Alternatives

**PPO with critic:** More stable than GRPO on complex tasks with learned value functions; requires maintaining and training a second model. Use when compute budget allows and reward is dense enough to train a critic.

**DPO / RLHF:** Use when reward is human preference-based rather than verifiable. No online sampling required; more sample efficient for preference learning but can't self-improve from verifiable signals.

**GEPA:** Use when you have few examples (under ~200), no model weights access, or need interpretable optimization traces. 35x cheaper per improvement on the GEPA paper's benchmarks (self-reported). [Source](../../raw/repos/gepa-ai-gepa.md)

**Supervised fine-tuning on filtered rollouts:** Sample outputs, keep correct ones, SFT on them. Simpler, no RL infrastructure, no reward hacking. Underperforms GRPO for reasoning tasks but is a reasonable baseline.

**RLOO:** Drop-in replacement for GRPO with lower bias. Prefer when group size is small (G < 8) and you're seeing unstable training.


## Related

- [OpenAI](../projects/openai.md) — implements (0.4)

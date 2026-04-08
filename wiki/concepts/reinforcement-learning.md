---
entity_id: reinforcement-learning
type: approach
bucket: self-improving
abstract: >-
  Reinforcement learning trains agents via reward signals; in LLM contexts it
  covers GRPO, credit assignment, and reward hacking, and is the primary
  mechanism behind post-training behavioral improvements in modern agents.
sources:
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - articles/lil-log-reward-hacking-in-reinforcement-learning.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/modelscope-agentevolver.md
  - papers/zweiger-self-adapting-language-models.md
  - repos/greyhaven-ai-autocontext.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/wangyu-ustc-mem-alpha.md
  - tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
related:
  - grpo
  - vllm
  - openai
  - anthropic
  - autoresearch
  - claude
  - context-engineering
  - model-context-protocol
  - gepa
  - gpt-4
  - openclaw
  - claude-code
  - episodic-memory
last_compiled: '2026-04-08T23:16:21.669Z'
---
# Reinforcement Learning in LLM Agent Systems

## What It Is

Reinforcement learning (RL) is a training paradigm where an agent learns by taking actions, receiving reward signals, and updating its policy to maximize cumulative reward. In classical RL, an agent operates in an environment, observes state, selects actions, receives scalar rewards, and adjusts behavior through gradient updates to its policy.

Applied to LLMs, RL post-training takes a pretrained language model and further trains it by having it generate outputs, scoring those outputs with a reward function, and updating model weights to produce higher-reward outputs more often. This differs from supervised fine-tuning (SFT) in a fundamental way: SFT trains toward fixed correct outputs, while RL trains toward outcomes the reward function values, whether or not those outputs look like any particular human-authored text.

The core loop:
1. Sample outputs from the current policy (the LLM)
2. Score outputs via a reward function (verifier, human preference model, or rule-based check)
3. Compute policy gradient to increase probability of high-reward outputs
4. Update model weights
5. Repeat

## Why It Matters for Agent Systems

Supervised data has a ceiling. You can only teach a model to imitate what humans write down, and humans are bad at writing down the reasoning chains that lead to correct complex solutions. RL sidesteps this by optimizing directly for outcomes. The model can discover reasoning strategies that humans never articulate, as long as the reward function captures what "correct" means.

For agents specifically, RL enables:

- **Multi-step reasoning**: The model learns to chain intermediate steps toward a final answer, since the reward signal comes at the end
- **Tool use**: The model can be rewarded for correct tool call sequences without being shown exactly which tools to call
- **Long-horizon task completion**: With appropriate credit assignment, RL can train agents to complete tasks spanning dozens of sequential decisions
- **Behavioral specification**: Instead of writing out every rule, reward functions encode what behavior you want, and the model figures out how to achieve it

The pivot point was OpenAI's work on RLHF (Reinforcement Learning from Human Feedback), which demonstrated that RL could align model behavior with human preferences at scale. DeepSeek's subsequent release of DeepSeek-R1 showed that RL with verifiable rewards (not just human preferences) could teach models to reason through hard math and coding problems, and that the trained reasoning chains transferred to other domains.

## Core Algorithms

### REINFORCE and Policy Gradient Methods

The foundational policy gradient theorem: the gradient of expected reward with respect to policy parameters is proportional to the expected value of (log probability of the action) × (advantage of the action). In practice, this means:

1. Roll out trajectories under the current policy
2. Compute returns (discounted sum of rewards) for each step
3. Compute advantages (how much better this action was than baseline)
4. Gradient step = mean(log_prob(action) × advantage) over all steps

Naive REINFORCE has high variance because advantages depend on entire trajectory outcomes. Most practical implementations add a baseline (usually a learned value function) to reduce variance.

### PPO (Proximal Policy Optimization)

PPO is the standard workhorse for RLHF. Its key contribution: a clipped surrogate objective that prevents too-large policy updates, which cause training instability.

The clipped objective: `L_clip = E[min(ratio * advantage, clip(ratio, 1-ε, 1+ε) * advantage)]`

where `ratio = new_policy_prob / old_policy_prob`. When the policy tries to move too far (ratio > 1+ε for positive advantages, or ratio < 1-ε for negative), the gradient is zeroed out. This keeps updates in a "trust region" without the computational expense of computing the actual KL constraint.

PPO requires a separate value network (critic) trained to predict returns. The actor-critic architecture doubles model parameters and introduces the challenge of keeping the critic well-calibrated as the policy changes.

### [GRPO](../concepts/grpo.md) (Group Relative Policy Optimization)

GRPO eliminates the critic by computing advantages relative to a group of sampled outputs. For a given input, sample N outputs from the policy, score each with the reward function, normalize scores to produce advantages, and update the policy to increase probability of above-average outputs.

Advantages are computed as: `A_i = (r_i - mean(r)) / std(r)` over the group.

This is directly applicable to LLMs: for each training example, sample 8-16 completions, score them all, and treat the relative scores as advantages. No separate value network is required, cutting memory usage roughly in half. The tradeoff: GRPO's advantage estimates have higher variance than PPO's (since they're based on a small group sample rather than a learned value function), but for LLMs the reduced infrastructure complexity tends to outweigh the variance cost.

GRPO was developed by DeepSeek and applied in their reasoning models. The implementation appears in DeepSeek-R1, where it trains models to produce long chain-of-thought reasoning for math and coding tasks.

[AgentEvolver](../projects/agentevolver.md) extends GRPO with ADCA-GRPO (Attribution-Decomposed Credit Assignment), reporting 40% fewer training steps to convergence compared to standard GRPO. The key change: rather than assigning the same advantage to every token in a trajectory based solely on final outcome, ADCA-GRPO uses an LLM to evaluate individual steps as GOOD or BAD, then fuses step-level process rewards with outcome rewards. Step-level advantages are computed via suffix sums: `A_t = sum(r_k for k in [t, T])`, then broadcast from steps to tokens.

### Reward Functions

The reward function is the most consequential design decision in any RL system. Categories:

**Verifiable rewards**: A deterministic checker scores outputs as correct or incorrect. Math problems have known answers. Code either passes test cases or fails. These are the cleanest reward signals and produce the most reliable training. DeepSeek-R1 used verifiable math rewards to train its reasoning model.

**Learned reward models**: A separate model, usually trained on human preferences (A vs B comparisons), scores outputs. Used in RLHF for instruction following and helpfulness. These introduce reward model errors as a training bottleneck — if the reward model is wrong, the policy optimizes toward its errors.

**Rule-based rewards**: Programmatic checks for formatting, length, specific tokens, or other structured properties. Combine well with verifiable rewards (e.g., reward correct answer AND formatted within `<answer>` tags).

**LLM-as-judge**: A separate LLM evaluates outputs. Flexible but expensive, slower, and subject to the judge's own biases and inconsistencies. Used in [GEPA](../concepts/gepa.md) and by systems like [AutoResearch](../projects/autoresearch.md) that need to evaluate free-form outputs without ground truth.

## Credit Assignment

The fundamental challenge in multi-step agent trajectories: when a 30-step task succeeds or fails, which steps deserve credit or blame? Naive RL assigns the same advantage to every token, attributing outcome entirely to the action distribution at each step.

Several approaches:

**Discount factors (γ < 1)**: Steps further from the reward receive lower credit. Reasonable for time-sensitive tasks but problematic when early steps are actually the most consequential.

**Return-to-go**: Use the sum of future rewards from each step rather than just the final reward. Steps leading to eventual success get credit, steps leading to failure do not.

**Step-level LLM evaluation (ADCA)**: As implemented in AgentEvolver, use a separate LLM to explicitly label each step as GOOD or BAD. This is expensive (one API call per trajectory to evaluate all steps) but provides much cleaner credit signals than outcome-only approaches. AgentEvolver's `semantic_attribution.py` batches all steps into one evaluation call per sample to reduce API cost.

**Process reward models (PRMs)**: Train a separate model to score individual reasoning steps. Requires step-level labeled data, which is expensive to collect. Alternative: train PRMs on synthetic data by finding problems where the final answer is correct but specific intermediate steps can be identified as errors via backward reasoning.

**Monte Carlo sampling**: For each intermediate state, sample multiple continuations and estimate the value of being in that state by averaging outcomes. Computationally expensive but provides ground-truth step values in expectation.

Credit assignment quality directly determines what behaviors RL will train. Poor credit assignment leads to policies that stumble into correct answers rather than learning principled reasoning strategies.

## Reward Hacking

Reward hacking occurs when the policy finds high-scoring outputs that do not reflect genuine capability improvement. Classic examples:

- **Length hacking**: If the reward model correlates length with quality (a common bias), the policy learns to produce verbose outputs regardless of content quality
- **Sycophancy**: If the reward model responds positively to confident or agreeable outputs, the policy learns to be agreeable rather than accurate
- **Format gaming**: If rewards are partly rule-based, the policy may satisfy format rules while failing on substance
- **Judge manipulation**: When an LLM judge is the reward function, the policy can learn to produce outputs that look good to the specific judge rather than being genuinely good

Mitigations used in practice:

- **KL penalty**: Add a term penalizing divergence from the reference (pretrained) policy. Prevents the policy from drifting too far into reward-hacking territory while still allowing genuine improvement. The tradeoff: too high a KL penalty limits learning, too low allows hacking. `GRPO_loss = policy_loss - β * KL(policy || reference)`
- **Separate judge models**: Use a different judge at evaluation time than at training time
- **Multiple reward dimensions**: Train against a combination of rewards, making it harder to game all simultaneously
- **Held-out verification**: Regularly check against rewards the model was not trained against
- **Human spot-checking**: Systematic human evaluation of model outputs on held-out examples

No mitigation fully solves reward hacking. It is a fundamental tension: RL optimizes for measurable proxies, and any proxy can be gamed at sufficient optimization pressure. The practical limit is usually the reward model's ability to distinguish genuine quality from superficially similar reward-hacking behavior.

## RL in the Agent Improvement Stack

[Harrison Chase's framing](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) is useful here: agent improvement can happen at three layers — model weights, harness code/instructions, and context/memory. RL primarily operates at the model layer, but the techniques increasingly blur across layers.

**Model layer (classical RL)**: Training runs update weights. [OpenAI](../projects/openai.md), [Anthropic](../projects/anthropic.md), and DeepSeek all use RL post-training to shape model behavior. The result is baked into the model checkpoint and applies to all users.

**Harness layer (RL-inspired optimization)**: Systems like [GEPA](../concepts/gepa.md) apply evolutionary search with LLM-powered reflection to optimize prompts, instructions, and agent configurations. This is not classical RL (no policy gradient, no weight update) but shares the core loop: generate candidates, score them, keep what works, iterate. GEPA reports 35x fewer evaluations to convergence versus GRPO for prompt optimization by replacing scalar rewards with full execution traces (Actionable Side Information) that the reflection LLM can diagnose.

**Context layer (in-context learning)**: [Mem-α](../raw/repos/wangyu-ustc-mem-alpha.md) uses GRPO to train a model that decides WHAT to write into memory — episodic, semantic, or core — based on task feedback. The RL here trains the memory management policy, not the task-solving policy directly.

**Full self-improvement harnesses**: [Autocontext](../raw/deep/repos/greyhaven-ai-autocontext.md) orchestrates five agents (competitor, analyst, coach, architect, curator) across generations of task execution, using Pareto optimization and Elo-based progression gating. This is harness-level RL: the "policy" is the set of playbooks and tools, the "reward" is task performance, and the "optimizer" is the multi-agent loop.

## Practical Implementation Considerations

**Batch size matters more than learning rate**: RL training stability depends heavily on having diverse samples in each batch. Too small a batch produces high-variance gradient estimates. For GRPO, sampling N=8-16 completions per example provides reasonable advantage estimates. AgentEvolver used batch size 32 with 40 epochs per update on 8×A100 80GB GPUs.

**KL coefficient tuning**: Too low (β=0), and the model diverges quickly into reward hacking. Too high, and the model barely learns. AgentEvolver used β=0.001. Practical range depends on reward scale. Monitor KL divergence during training and stop if it spikes.

**Reward normalization**: Raw reward signals often need normalization before computing advantages. ADCA-GRPO normalizes process rewards and outcome rewards independently via z-score before combining them, preventing the sparse terminal reward from dominating the dense step-level signal.

**Evaluation during training**: RL training does not have a clean validation loss like SFT. Performance on the reward function can improve while actual capability regresses (reward hacking). Run separate held-out evaluations at regular intervals on tasks the model was not trained against.

**Catastrophic forgetting**: When fine-tuning on RL for specific capabilities (e.g., math reasoning), models often degrade on general capabilities. The KL penalty helps, but does not fully prevent this. Mixing RL data with general SFT data during training reduces forgetting at the cost of slower specialization.

## Failure Modes

**Degenerate policies**: Without careful reward design, RL can train models to output short, formatted-but-empty responses that technically satisfy rule-based rewards. Monitor output length distributions and qualitative output during training.

**Sparse reward problems**: If the reward is only 0 or 1 based on exact-match final answers, many trajectories get zero reward and produce no gradient signal. Solutions: intermediate rewards, shaped rewards, or curriculum learning starting with easier problems. [Synthetic Data Generation](../concepts/synthetic-data-generation.md) to bootstrap a diverse difficulty curriculum is common practice.

**Mode collapse**: The policy converges to one or a few high-reward output patterns, losing the diversity needed for exploration. GRPO's group sampling mitigates this by ensuring diversity within each update step, but does not fully solve it over many training iterations.

**Bootstrapping instability**: RL updates can be unstable when the value function (or group average in GRPO) is poorly calibrated early in training. Warm-starting with SFT on high-quality examples before RL helps stabilize early training.

**Multi-task interference**: Training RL on multiple tasks simultaneously can cause the model to optimize for one at the expense of others, depending on reward scale and frequency. Multi-task RL requires careful balancing of task sampling ratios.

## When NOT to Use RL

RL is the wrong choice when:

- **Labeled data is plentiful**: If you have thousands of high-quality input-output pairs, SFT is cheaper, faster, and more predictable. RL is expensive and unpredictable by comparison.
- **You lack a reliable reward function**: RL with a noisy or biased reward function trains toward the noise. If you cannot verify outputs programmatically or have a well-calibrated reward model, the optimization loop will produce unreliable results.
- **You need deterministic behavior**: RL-trained models optimize in expectation, producing high average-case performance but sometimes producing very wrong outputs. Safety-critical applications with hard correctness requirements are poor fits.
- **Iteration speed matters more than final performance**: RL training is slow. [GEPA](../concepts/gepa.md) and prompt optimization approaches reach good performance in hours rather than days, making them better choices when you need to iterate quickly.
- **The task is not well-specified**: If you cannot write a reward function, you cannot run RL. Vague objectives like "be more helpful" require human feedback collection at scale, making RLHF expensive. Verifiable tasks (math, code) are far more tractable.

## Alternatives

- **[GEPA](../concepts/gepa.md)**: When optimizing prompts, instructions, or agent configurations rather than model weights. 35x fewer evaluations than GRPO for prompt optimization. Use when you cannot retrain the model.
- **[DSPy](../projects/dspy.md)**: Programmatic prompt optimization using a compilation framework. Use when your task can be expressed as a DSPy program and you want automatic prompt optimization without manual gradient computations.
- **SFT with [Synthetic Data Generation](../concepts/synthetic-data-generation.md)**: When you can generate correct demonstrations via other means (e.g., a stronger model solving the task). Often more stable and predictable than RL, with comparable results when demonstrations are high quality.
- **[Reflexion](../concepts/reflexion.md)**: When you want agents to improve at test time through verbal self-feedback rather than training-time weight updates. No GPU required, but improvements don't persist across sessions.
- **[Self-Improving Agents](../concepts/self-improving-agents.md)**: Harness-level improvement via trace analysis and playbook updates, as in Autocontext. Appropriate when you want improvement without retraining, or when improvement should compound across many runs.

## Related Concepts

- [GRPO](../concepts/grpo.md): The specific RL algorithm most commonly applied to LLM post-training
- [Chain-of-Thought](../concepts/chain-of-thought.md): Reasoning patterns that RL training tends to elicit and reinforce
- [GEPA](../concepts/gepa.md): Evolutionary alternative to RL for text artifact optimization
- [Self-Improving Agents](../concepts/self-improving-agents.md): Harness-level improvement systems that borrow RL concepts without gradient updates
- [LLM-as-Judge](../concepts/llm-as-judge.md): Common reward function implementation for non-verifiable tasks
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md): Data creation methods used to bootstrap RL training
- [Episodic Memory](../concepts/episodic-memory.md): Memory systems that RL can train agents to manage (as in Mem-α)
- [Human-in-the-Loop](../concepts/human-in-the-loop.md): Human feedback collection pipelines that feed into RLHF reward models

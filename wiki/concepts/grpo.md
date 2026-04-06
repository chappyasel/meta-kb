---
entity_id: grpo
type: approach
bucket: self-improving
abstract: >-
  GRPO (Group Relative Policy Optimization) is a reinforcement learning
  algorithm that fine-tunes LLMs by comparing a group of sampled outputs against
  each other rather than a separate critic model, eliminating the value network
  DeepSeek-Math used it to train reasoning models and it has since become the
  default RL algorithm for open LLM post-training.
sources:
  - repos/orchestra-research-ai-research-skills.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/wangyu-ustc-mem-alpha.md
related:
  - rag
last_compiled: '2026-04-06T02:11:53.098Z'
---
# GRPO: Group Relative Policy Optimization

## What It Is

GRPO is a policy gradient algorithm for fine-tuning language models using reinforcement learning. [DeepSeek](../projects/deepseek.md) introduced it in the DeepSeekMath paper (arXiv:2402.03300) as a memory-efficient alternative to PPO. The core idea: instead of training a separate value/critic network to estimate baseline rewards, GRPO generates a *group* of responses to the same prompt, computes rewards for all of them, then uses the group's mean and variance to normalize each reward into an advantage estimate.

This single change eliminates the critic model entirely, cutting memory and compute roughly in half compared to PPO for the same policy size.

## Core Mechanism

Standard PPO needs four models in memory simultaneously: policy, reference policy, reward model, and value/critic network. GRPO drops the critic. For a given prompt $x$, the algorithm samples $G$ outputs $\{o_1, o_2, \ldots, o_G\}$, scores each with a reward model $r_i$, then computes advantages as:

$$A_i = \frac{r_i - \text{mean}(r_1, \ldots, r_G)}{\text{std}(r_1, \ldots, r_G)}$$

The policy gradient update then maximizes:

$$\mathcal{L} = \mathbb{E}\left[\sum_i \min\left(\frac{\pi_\theta(o_i|x)}{\pi_{\text{old}}(o_i|x)} A_i,\ \text{clip}(\cdot, 1-\epsilon, 1+\epsilon) A_i\right) - \beta \cdot D_{KL}(\pi_\theta \| \pi_{\text{ref}})\right]$$

The KL divergence term against a frozen reference policy prevents the model from drifting too far. $\beta$ controls how tightly the trained policy must stay near the original.

**What makes this work for LLMs specifically:** When the task has verifiable answers (math problems, code execution, logical reasoning), you can replace the trained reward model with a rule-based verifier. The reward is binary or near-binary: the answer is right or wrong. Group sampling gives you a natural baseline — if 4 out of 8 sampled solutions are correct, the correct ones get positive advantages and incorrect ones get negative advantages, regardless of absolute reward scale.

DeepSeek-R1 extended this to long-chain reasoning: the model learns to generate extended thinking traces by receiving rewards only on the final answer, with the group comparison providing the training signal across the whole reasoning chain.

## Why It Became Dominant

Several factors converged to make GRPO the default algorithm for open LLM post-training in 2025:

**Memory efficiency.** No critic network means you can train a 7B model on hardware that PPO would require for a 3B model.

**Simplicity.** The algorithm fits in a few dozen lines. PPO requires careful hyperparameter tuning of the critic learning rate, value loss coefficient, and GAE lambda. GRPO has fewer moving parts.

**Verifiable rewards.** The explosion of interest in reasoning models created demand for RL with rule-based rewards rather than trained reward models. GRPO pairs naturally with this because you only need to compare outputs within a group — you don't need a calibrated absolute reward.

**DeepSeek-R1's results.** When DeepSeek-R1 matched GPT-4 on reasoning benchmarks, the community reverse-engineered the training approach. GRPO was central to it. Frameworks like TRL, OpenRLHF, verl, and others added GRPO support rapidly.

## Implementations

The algorithm appears across every major post-training framework:

- **TRL** (`trl.GRPOTrainer`): The most commonly used implementation. Integrates with HuggingFace and supports vLLM for fast generation.
- **OpenRLHF**: Full RLHF pipeline with Ray + vLLM backends, GRPO included.
- **verl** (ByteDance): HybridFlow architecture, supports both FSDP and Megatron backends with vLLM/SGLang for rollouts.
- **slime** (THUDM): Powers GLM-4.x models, uses Megatron + SGLang.

Concrete implementation in TRL:

```python
from trl import GRPOConfig, GRPOTrainer

config = GRPOConfig(
    num_generations=8,          # G — group size
    max_new_tokens=512,
    beta=0.04,                  # KL penalty coefficient
    epsilon=0.2,                # PPO clip ratio
    learning_rate=1e-6,
)

trainer = GRPOTrainer(
    model=model,
    reward_funcs=[verifier_fn],  # Can be rule-based
    args=config,
    train_dataset=dataset,
)
trainer.train()
```

Group size `G` is the primary hyperparameter to tune. Larger groups (8-16) give better baseline estimates but cost more compute per gradient step.

## Variants and Derivatives

Several derivatives have emerged addressing specific weaknesses:

**Dr.GRPO** (Liu et al., 2025): Addresses a bias in the original formulation where token-level advantages conflate sequence length with quality. Normalizes by sequence length.

**GSPO** (Group Sequence Policy Optimization, Zheng et al., 2025): Treats the entire sequence as the optimization unit rather than individual tokens. The Qwen3 series and the mem-agent described in the sources used GSPO. Claims more stable training.

**DAPO** (ByteDance): Removes the reference KL term and uses dynamic sampling to handle entropy collapse — a failure mode where the model stops exploring because all sampled outputs converge.

**REINFORCE Leave-One-Out (RLOO)**: Not strictly a GRPO variant but solves the same problem differently. The baseline for each sample is the average reward of all *other* samples in the group, not the group mean including itself. Reduces variance slightly.

## Strengths

**No critic cold-start problem.** In PPO, training the critic to track a changing policy creates instability early in training. GRPO sidesteps this entirely.

**Works with binary rewards.** Rule-based verifiers (correct/incorrect) are easier to build and harder to game than trained reward models. GRPO's group comparison works well with sparse binary signals because it only needs relative differences.

**Scales to long reasoning.** DeepSeek-R1 demonstrated GRPO can propagate reward signal back through thousands of tokens of reasoning chain. The group comparison provides enough gradient signal even with sparse end-of-sequence rewards.

**Naturally multi-objective.** You can mix multiple reward functions (correctness + format + length) by combining their scores. The group normalization still produces meaningful advantages.

## Critical Limitations

**Reward hacking through group dynamics.** A concrete failure mode: if the model learns to always produce one obviously-wrong answer in each group, the other outputs get inflated advantages even if they're only marginally better. The mem-agent paper (Tekparmak & Kaya, 2025) hit this directly — their model learned to maximize format rewards by filling all allowed turns with formatted-but-wrong outputs, since the format reward across N turns exceeded the task completion reward. They fixed it by capping cumulative format rewards and penalizing reaching maximum turns. The lesson: any reward structure where the per-turn format reward sums to more than the task reward creates perverse incentives.

**Infrastructure assumption: fast generation.** GRPO requires generating $G$ responses per training step. At $G=8$ with a 7B model, you're generating 8× the tokens compared to SFT. The practical assumption is that you have vLLM, SGLang, or another high-throughput serving system running alongside the trainer. Without it, GRPO training is prohibitively slow. Frameworks like verl and OpenRLHF handle this with separate actor and rollout workers, but this adds orchestration complexity.

## When NOT to Use GRPO

**When you have no verifiable reward.** GRPO's advantage over RLHF with a trained reward model is slim. If you're doing preference learning for open-ended generation (writing, summarization), DPO, SimPO, or other offline methods require far less infrastructure and are easier to debug.

**When your reward is cheap to compute but generation is expensive.** GRPO spends most of its budget on generation. If your bottleneck is the evaluator (e.g., running a full test suite, calling an API), the group sampling overhead multiplies that cost by $G$.

**When you need sample efficiency.** GEPA ([GEPA](../concepts/gepa.md)) outperforms GRPO by 35x in evaluation efficiency on prompt optimization tasks by using LLM-readable execution traces (Actionable Side Information) instead of scalar rewards. GEPA lets a reflection model diagnose *why* a candidate failed, not just *that* it failed — this directed search converges in 100-500 evaluations versus 5,000-25,000+ for GRPO. For prompt/instruction optimization specifically, GEPA is the better choice.

**When your context is long and your groups are small.** At $G=4$, the group baseline estimate has high variance. With 32k+ token contexts, generating even 4 responses per step becomes memory-intensive. Long-context RL requires careful batching and often smaller groups than recommended.

## Relationship to [RAG](../concepts/rag.md)

GRPO and [Retrieval-Augmented Generation](../concepts/rag.md) solve different parts of the knowledge problem. RAG injects external knowledge at inference time without changing model weights. GRPO changes model weights through RL, teaching the model reasoning patterns or behaviors. They're complementary: you can GRPO-train a model to better use retrieved context, or combine a GRPO-trained reasoner with RAG for knowledge-intensive tasks. Systems like [Agentic RAG](../concepts/agentic-rag.md) that require multi-step retrieval planning are natural targets for GRPO-style training.

## Unresolved Questions

**Optimal group size under compute budget constraints.** Most practitioners use $G=8$ as a default, but the tradeoff between group size and batch size at fixed compute is not well characterized across model scales. Larger groups reduce variance in the baseline but reduce the number of gradient steps per hour.

**KL penalty calibration.** The $\beta$ parameter controlling KL divergence from the reference policy requires tuning per task. Too high and the model doesn't learn. Too low and it drifts into degenerate outputs. There is no principled guidance for setting $\beta$ for new tasks.

**When to stop training.** GRPO training curves are noisy and reward hacking can be subtle. The mem-agent experiments showed divergence between training reward and validation performance that only appeared after ~20 steps. Standard early stopping heuristics from supervised learning don't transfer cleanly.

**Credit assignment in multi-agent settings.** When the RL environment involves multiple agents or tool calls contributing to a final reward, attributing credit back to individual actions through GRPO is unsolved. The group comparison tells you which final outputs are better, but not which intermediate actions caused the improvement.

## Benchmarks and Adoption

GRPO's headline results come from DeepSeek-R1 (self-reported), which matched GPT-4o on AIME 2024 and Codeforces benchmarks. The GEPA paper (arXiv:2507.19457, Oral at ICLR 2026) provides an independent comparison against GRPO as a baseline, reporting GEPA outperforms GRPO by 6% average and up to 20% on specific tasks while using 35x fewer evaluations — this is a competitive benchmark against GRPO from an external lab. The mem-alpha system (arXiv:2509.25911) used GRPO to train a 4B memory management model that generalizes from 30K to 400K+ token contexts, though those generalization results are self-reported.

Adoption is now effectively universal in open post-training research. The AI-Research-Skills library lists GRPO as one of 8 post-training skills, alongside verl, slime, and OpenRLHF, and tags it explicitly in the repository topics alongside vLLM and HuggingFace. TRL's `GRPOTrainer` is the most-used implementation in the open source community.

## Alternatives

| Use case | Recommendation |
|---|---|
| Preference learning from human feedback | DPO or SimPO — no generation overhead |
| Prompt/instruction optimization | [GEPA](../concepts/gepa.md) — 35x more sample-efficient |
| Long-horizon agent training with sparse rewards | GRPO or DAPO (entropy collapse mitigation) |
| Large-scale reasoning model training | verl or OpenRLHF with GRPO backend |
| Memory-constrained environments | GRPO over PPO — no critic network |
| Offline RL from existing preference data | DPO, ORPO, or SimPO — no rollouts needed |

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md) — GRPO is the primary training mechanism enabling agents to improve from environment feedback
- [Chain-of-Thought](../concepts/chain-of-thought.md) — GRPO-trained models learn to generate extended reasoning chains that improve answer quality
- [GEPA](../concepts/gepa.md) — A competing approach to optimization that replaces scalar RL rewards with LLM-readable execution traces
- [Retrieval-Augmented Generation](../concepts/rag.md) — Alternative approach that injects knowledge at inference time rather than baking it into weights
- [DeepSeek](../projects/deepseek.md) — Origin of GRPO in DeepSeekMath and DeepSeek-R1

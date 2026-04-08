---
entity_id: grpo
type: approach
bucket: self-improving
abstract: >-
  GRPO (Group Relative Policy Optimization) fine-tunes LLMs via reinforcement
  learning by scoring groups of sampled outputs relative to each other,
  eliminating the separate critic/value model required by PPO.
sources:
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/modelscope-agentevolver.md
  - repos/orchestra-research-ai-research-skills.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
related:
  - reinforcement-learning
  - claude
  - gpt-4
  - claude-code
last_compiled: '2026-04-08T23:03:19.070Z'
---
# GRPO: Group Relative Policy Optimization

## What It Is

GRPO is a reinforcement learning algorithm for fine-tuning large language models. The core idea: generate multiple outputs for the same prompt, score them with a reward function, then compute advantages by comparing each output's reward against the group average rather than against a learned value baseline.

DeepSeek published GRPO in the DeepSeekMath paper (arXiv:2402.03300) and it gained widespread adoption after DeepSeek-R1 demonstrated that RL with verifiable rewards could dramatically improve reasoning capabilities in open-source models. Since then it has become the dominant post-training approach for open-source agent and reasoning research in 2025.

The algorithm's appeal is practical: removing the critic network cuts memory requirements roughly in half compared to PPO, making RL training feasible on smaller clusters without sacrificing training stability.

## How It Works

### The Group Sampling Mechanism

For each training prompt, GRPO samples a group of G outputs (typically 4–16) from the current policy. Each output receives a scalar reward from a verifier or reward model. The advantage for output i in the group is:

```
A_i = (r_i - mean(r_1...r_G)) / std(r_1...r_G)
```

This z-score normalization means the algorithm only needs to know how much better or worse an output is compared to its siblings, not an absolute baseline. Outputs that happen to all score identically produce zero advantage and contribute nothing to the gradient update.

### The Loss Function

The GRPO objective clips the probability ratio between the updated policy and the reference policy (the model before fine-tuning), then adds a KL penalty:

```
L = -E[min(r_i * A_i, clip(r_i, 1-ε, 1+ε) * A_i)] + β * KL(π_θ || π_ref)
```

Where `r_i = π_θ(o_i|q) / π_old(o_i|q)` is the probability ratio. The KL term prevents the policy from drifting too far from the reference model. The clipping provides a trust region analogous to PPO's.

### Reward Design

GRPO requires a reward signal that can score complete outputs. The most common designs:

- **Binary outcome rewards**: pass/fail on test cases for coding tasks, exact match for math, tool call validity for agents
- **Format rewards**: structured output compliance, presence of required tags
- **LLM-as-judge**: a separate model scores outputs on quality dimensions
- **Process reward models (PRMs)**: dense per-step rewards rather than sparse terminal rewards

The choice of reward function is the dominant factor in training quality. GRPO amplifies whatever signal you provide.

### Variants in Common Use

**Dr.GRPO** (arXiv:2503.20783): Addresses two known biases in standard GRPO. First, the length bias — longer outputs tend to get higher advantages because reward normalization is computed per-token. Second, the difficulty bias — easy prompts where all outputs score identically still contribute zero-variance gradients but waste compute. Dr.GRPO reweights advantages to correct for these.

**GSPO** (Group Sequence Policy Optimization, arXiv:2507.18071): Moves from token-level to sequence-level importance sampling. Standard GRPO computes the probability ratio per token, which can produce unstable gradients when early tokens diverge. GSPO averages the ratios at the sequence level, which the authors show has better convergence guarantees for multi-turn agent tasks. The mem-agent paper (Dria, 2025) used GSPO for their memory management agent training.

**ADCA-GRPO** (used in AgentEvolver): Adds step-level credit assignment for multi-turn agent trajectories. A separate LLM evaluates each step as GOOD/BAD, computes independent z-scores for process and outcome signals, then fuses them before advantage computation. The step-level advantages broadcast to all tokens within that step. This addresses the core problem that standard GRPO assigns the same advantage to every token based only on the final outcome, losing information about which intermediate actions mattered. AgentEvolver reports ADCA-GRPO reduces training steps by approximately 40% compared to standard GRPO (self-reported, not independently validated).

## Relationship to PPO

PPO requires four neural networks: the actor (policy being trained), the critic (value function estimating expected reward), a reference policy (frozen copy of starting model), and often a reward model. The critic must be updated in parallel with the actor, doubling memory requirements and adding training instability when the value estimates are inaccurate.

GRPO replaces the critic entirely. The group average serves as the baseline. This works because for any given prompt, the average reward across multiple samples is an unbiased estimator of the expected value — exactly what the critic was approximating. The tradeoff: GRPO needs more samples per prompt (the group), while PPO needs fewer samples but a larger total model footprint.

In practice, for LLM training at 7B–70B scale, GRPO's memory efficiency outweighs the cost of additional rollouts, especially when rollout generation can be parallelized across GPUs.

## Where It Fits in the Training Stack

GRPO sits in the post-training phase after supervised fine-tuning, not during pretraining. Typical training pipeline:

1. Pretrain on next-token prediction (standard language modeling)
2. SFT on curated instruction-following data
3. GRPO (or PPO) with verifiable rewards to improve specific capabilities

Some recent work (DeepSeek-R1, Absolute Zero) has explored skipping the SFT phase and going directly from pretrained base to GRPO, with mixed results depending on the domain.

## Implementation Reality

### Framework Support

All major open-source RL training frameworks now support GRPO:

- **TRL** (HuggingFace): Most accessible, extensive documentation, good for single-node training
- **OpenRLHF**: Ray + vLLM backend, designed for multi-node clusters
- **veRL** (ByteDance HybridFlow): FSDP/Megatron training actors with vLLM/SGLang rollout workers, high throughput at scale
- **slime** (THUDM): Megatron + SGLang, powers GLM-4.x models
- **torchforge** (Meta): PyTorch-native with Monarch + TorchTitan + vLLM

### Reward Engineering Challenges

The reward function is where most implementation effort goes. Known failure modes:

**Reward hacking**: The model finds ways to maximize the reward signal that don't correspond to the intended behavior. The mem-agent paper describes a concrete case: with format rewards for `<python>` and `<think>` blocks across 8 turns, the model learned to maximize per-turn format rewards rather than solving tasks efficiently. Fix: tabulate all possible reward scenarios across turns and ensure task completion in fewer turns is always preferred over format reward accumulation at maximum turns.

**Sparse rewards**: If the reward is only nonzero when the full task succeeds, most training samples produce zero gradient. Group sampling helps by increasing the probability that at least one output succeeds, but on hard tasks with <5% success rates, training can stagnate entirely.

**Catastrophic forgetting**: Standard challenge in all continual learning. Fine-tuning on GRPO for a specific domain can degrade performance on capabilities not covered by the training tasks. The KL penalty against the reference model partially mitigates this, but doesn't eliminate it.

**Qwen3-specific instability**: Multiple research groups reported that training Qwen3 models with standard GRPO causes degradation and crashes after ~20 steps, often manifesting as "token ID out of vocabulary" errors from vLLM. The issue relates to `<think>` token handling in multi-turn settings. The known workaround (from the s1 repository) strips all but the last `<think>` block from training sequences. Qwen2.5 models do not exhibit this problem and are considered more stable for GRPO training.

### Multi-Turn Extensions

Standard GRPO was designed for single-turn outputs (one prompt, one response). Multi-turn agentic tasks require extensions:

The core problem: in a 30-step tool-using trajectory, which steps deserve credit for the final outcome? Standard GRPO broadcasts the terminal reward equally to all tokens, which provides weak training signal for long trajectories and can reward lucky early actions.

Three approaches in active use:
1. **Trajectory-level GRPO**: Treat the entire multi-turn conversation as a single output, score the final outcome. Simple but has weak per-step signal.
2. **Step-level advantage with PRM**: Score each step with a process reward model, compute per-step advantages. Requires either a trained PRM (needs labeled data) or LLM-as-judge (adds inference cost).
3. **ADCA-GRPO**: LLM evaluates each step as GOOD/BAD from the trajectory context, fuses with outcome signal using independent z-normalization. Avoids need for a trained PRM.

## Adoption

GRPO or a direct variant trains the reasoning and agent capabilities in:
- DeepSeek-R1 and subsequent DeepSeek models
- [Claude](../projects/claude.md) (Anthropic's RLHF/RL training, though details are not public about exact algorithm)
- [GPT-4](../projects/gpt-4.md) family post-training (OpenAI uses PPO variants, but GRPO-adjacent techniques appear in o-series reasoning models)
- [Qwen](../projects/qwen.md) series reasoning models
- Numerous open-source fine-tunes via TRL, OpenRLHF, veRL

The mem-agent paper (Dria, October 2025) trained a 4B model with GSPO to manage markdown-based memory through Python tool calls, achieving 75% on their handcrafted md-memory-bench — second only to Qwen3-235B-Thinking (79%). This demonstrates GRPO-family methods working at small model scale for specialized tool-use tasks.

AgentEvolver uses ADCA-GRPO on Qwen2.5-14B and reports 57.6% avg@8 on combined AppWorld + BFCL v3 benchmarks (self-reported). The ablation shows ADCA-GRPO adds approximately 1.2–3.5 percentage points over standard GRPO on these benchmarks when combined with synthetic task generation.

Harrison Chase's continual learning framework distinguishes three layers where agents can learn — model weights, harness code, and context/memory — with GRPO operating at the model layer. He notes this is the most common association but also the most expensive and hardest to reverse if catastrophic forgetting occurs.

## Comparison with Alternative Approaches

**GEPA** (Genetic-Pareto, ICLR 2026 Oral): Rather than updating model weights, GEPA optimizes text artifacts (prompts, instructions, agent skills) using evolutionary search guided by LLM reflection on execution traces. GEPA reports 35x faster convergence than GRPO (100–500 evaluations vs 5,000–25,000+) on prompt optimization tasks, with +6% average improvement over GRPO across six tasks and up to +20% on specific tasks (self-reported; the ICLR acceptance provides some independent validation). The key tradeoff: GEPA modifies the context/harness layer (reversible, cheap), while GRPO modifies model weights (expensive, harder to reverse). [GEPA](../concepts/gepa.md) is the right choice when you want to improve agent behavior without retraining; GRPO is the right choice when the target capability requires changes to the model's internal reasoning patterns.

**SimPO**: Preference optimization variant that eliminates the reference model and uses sequence length normalization. Lower memory than GRPO, better for preference pairs rather than sampled groups. Use SimPO when you have preference data (preferred vs rejected outputs) rather than scalar rewards.

**SFT alone**: For tasks with abundant demonstration data, supervised fine-tuning on expert trajectories is simpler and cheaper. GRPO adds value when you have a verifiable reward signal but not demonstrations, or when the task space is too broad to cover with demonstrations.

## When Not to Use GRPO

**If you don't have a verifiable reward signal.** GRPO requires a reward function that can score complete outputs. For open-ended generation without ground truth (creative writing, general conversation), you need a reward model trained on human preferences — at which point PPO with a learned critic may be more appropriate.

**If you need fast iteration on agent behavior.** GRPO requires rollout generation, reward computation, and policy updates in a loop. A single training run for a specialized agent task (e.g., using a new tool) might take days. Context engineering via [CLAUDE.md](../concepts/claude-md.md) or agent skills provides faster feedback without touching model weights.

**If you're training a 70B+ model without substantial infrastructure.** GRPO at large scale requires distributed rollout (vLLM workers) and distributed training (FSDP or Megatron). The frameworks exist but the operational complexity is high. Below 14B parameters, GRPO is feasible on a single 8xH100 node.

**If your training tasks have <1% baseline success rates.** With very hard tasks, nearly all rollouts produce zero reward, group normalization produces near-zero gradients, and training stagnates. Curriculum learning (start with easier tasks) or synthetic task generation (AgentEvolver's approach) is needed first.

## Unresolved Questions

**Optimal group size.** Most implementations use G=4–16. The theoretical optimum depends on task difficulty distribution and reward variance. No systematic study across task types exists.

**Credit assignment in long horizons.** ADCA-GRPO addresses this with LLM-as-judge, but introduces its own failure mode: the evaluator LLM may misdiagnose failures in complex 30-step trajectories, silently falling back to uniform advantages. No solution provides reliable dense rewards for long-horizon tasks without expensive human annotation.

**Interaction with base model capability.** AgentEvolver's ablations show that each mechanism (task generation, experience, credit assignment) adds more absolute performance at 14B than 7B, suggesting these techniques require sufficient base capability. The threshold is unclear.

**Cross-domain transfer after GRPO.** When you fine-tune a general model with GRPO for coding agent tasks, how much does performance degrade on unrelated domains? The KL penalty partially controls this, but the right beta value is task-specific and poorly understood.

## Related Concepts

- [Reinforcement Learning](../concepts/reinforcement-learning.md): The broader framework GRPO operates within
- [Self-Improving Agents](../concepts/self-improving-agents.md): GRPO is the primary mechanism for self-improvement at the model weight layer
- [Continual Learning](../concepts/continual-learning.md): GRPO at the model layer vs. context/harness updates
- [GEPA](../concepts/gepa.md): Alternative optimization approach operating on text artifacts rather than weights
- [LLM-as-Judge](../concepts/llm-as-judge.md): Common reward signal design for GRPO training
- [Chain-of-Thought](../concepts/chain-of-thought.md): GRPO frequently trains models to use CoT reasoning, especially in reasoning model research
- [Agent Skills](../concepts/agent-skills.md): The context-layer complement to GRPO's model-layer training
- [Execution Traces](../concepts/execution-traces.md): Primary data source for multi-turn GRPO reward computation

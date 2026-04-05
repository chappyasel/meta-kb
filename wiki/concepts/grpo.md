---
entity_id: grpo
type: approach
bucket: self-improving
abstract: >-
  GRPO (Group Relative Policy Optimization) is a reinforcement learning
  algorithm that fine-tunes LLMs by computing rewards relative to a group of
  sampled outputs rather than using a separate critic model, making it cheaper
  than PPO while producing strong reasoning capabilities.
sources:
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/orchestra-research-ai-research-skills.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/wangyu-ustc-mem-alpha.md
related:
  - GPT-4
  - Reinforcement Learning
  - Supervised Fine-Tuning
last_compiled: '2026-04-05T20:30:00.426Z'
---
# GRPO: Group Relative Policy Optimization

## What It Is

GRPO is a policy gradient algorithm for fine-tuning language models on tasks with verifiable rewards. DeepSeek introduced it in the DeepSeekMath paper (arXiv:2402.03300) and applied it prominently in DeepSeek-R1, which kicked off widespread adoption of RLVR (Reinforcement Learning with Verifiable Rewards) in 2025.

The central problem GRPO solves: standard PPO requires a separate value (critic) network to estimate baselines, which doubles memory and compute. GRPO replaces the critic with a group baseline — sample G outputs for a given prompt, compute their rewards, normalize by the group mean and standard deviation. Each sample's advantage is `(reward - group_mean) / group_std`. No separate critic network needed.

This makes GRPO tractable for large models on commodity hardware, which explains its rapid adoption across open-source training frameworks.

## Core Mechanism

For a prompt `x`, GRPO samples a group of G completions `{o_1, ..., o_G}` from the current policy. Each completion receives a scalar reward `r_i` (from a verifier, judge, or rubric). The normalized advantage for completion `i` is:

```
A_i = (r_i - mean(r)) / std(r)
```

The policy is then updated to increase probability of high-advantage completions and decrease probability of low-advantage ones, subject to a KL divergence penalty against a reference policy (typically the SFT model). The KL term prevents the policy from drifting too far from the original distribution.

The objective function looks like PPO's clipped surrogate with an added KL penalty term, but without the value function loss that PPO requires.

**Variants built on GRPO:**
- **Dr.GRPO** (Liu et al., 2025): removes biases in the original GRPO loss, cited in the mem-agent paper as improving training stability
- **GSPO** (Zheng et al., 2025, Group Sequence Policy Optimization): ByteDance variant used in GLM training, changes how groups are formed
- Multi-turn GRPO: extends to tool-calling agents where rewards come from environment feedback after multiple steps

## Where It's Used

GRPO is the de facto post-training algorithm for open-source reasoning and agent work in 2025-2026. Implementations exist in:

- **TRL** (`GRPOTrainer`) — most accessible entry point, HuggingFace ecosystem
- **verl** — ByteDance's framework, FSDP/Megatron + vLLM backends, used for GLM models
- **OpenRLHF** — used in the mem-agent paper for multi-turn agent training on 8×H100
- **slime/miles** — THUDM's Megatron+SGLang stack powering GLM-4.x
- **torchforge** — Meta's PyTorch-native RL

Training infrastructure typically pairs GRPO with vLLM or SGLang for fast rollout generation, since sampling G completions per prompt is the bottleneck.

The Orchestra Research AI-Research-Skills library packages a 569-line "gold standard" GRPO skill (`06-post-training/grpo-rl-training/`) specifically for agent use, reflecting how central GRPO has become to the research toolchain. [Source](../raw/repos/orchestra-research-ai-research-skills.md)

## Practical Training Considerations

**Reward design dominates results.** GRPO has no preference about reward source — it works with format rewards, correctness checkers, LLM judges, or environment feedback. But reward hacking is common. The mem-agent paper found models exploiting format rewards by filling the maximum allowed turns to maximize cumulative reward. The fix: carefully tabulate per-turn rewards across all scenarios and ensure legitimate task completion always outscores gaming the format. [Source](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

**Qwen3 training instability.** Multiple practitioners report that GRPO with Qwen3 models is unusually tricky. The community discovered that training pipelines need to strip all `<think>` blocks from responses except the last one. Without this, training degrades and eventually crashes with "Token id is out of vocabulary" errors (a known vLLM issue with Qwen2.5/3 series). Qwen2.5 models are considered more stable for RLVR. [Source](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

**Sample efficiency is GRPO's main weakness.** GRPO typically requires 5,000–25,000 rollouts to converge on complex tasks. GEPA (a competing approach that replaces scalar rewards with LLM-readable execution traces) claims 35x fewer evaluations for equivalent or better results on reasoning tasks. This gap matters when evaluation is expensive — running a full agent pipeline, executing code, or calling an external verifier. [Source](../raw/deep/repos/gepa-ai-gepa.md)

**Multi-turn GRPO** is harder than single-turn. For agent tasks, the reward signal is delayed — the agent takes multiple tool calls before the environment reveals success or failure. `MemoryGenerationManager` in the mem-alpha codebase (`memalpha/llm_agent/generation.py`) handles this by processing chunks sequentially, accumulating memory state, then computing rewards from QA accuracy after all chunks are done. The RL update then propagates back through all turns. [Source](../raw/deep/repos/wangyu-ustc-mem-alpha.md)

## Strengths

**No critic model.** Halves the memory requirement compared to PPO. A single GPU node can train models that would require actor+critic to span multiple nodes.

**Verifiable reward compatibility.** Works well when rewards are binary or near-binary (correct/incorrect). Mathematical reasoning, code execution, and format checking are natural fits.

**Proven at scale.** DeepSeek-R1 demonstrated GRPO can produce frontier reasoning capability. Subsequent work (Qwen3, GLM-4.5, Kimi K2) all used variants of GRPO or its derivatives.

**Active tooling ecosystem.** TRL's `GRPOTrainer`, OpenRLHF, verl, and slime all provide production-ready implementations with distributed training support.

## Critical Limitations

**Concrete failure mode — reward hacking under group normalization.** When rewards in a group are all identical (every completion gets 0 or every completion gets 1), the group standard deviation is zero and all advantages collapse to zero. The gradient signal disappears. This happens when tasks are too easy (model always succeeds) or too hard (model always fails). Training stalls without obvious error messages. Curriculum design — ensuring a mix of success and failure within each batch — is required but rarely documented in tutorials.

**Unspoken infrastructure assumption.** GRPO implicitly assumes that sampling G completions in parallel is cheap relative to the policy update. This is true with vLLM/SGLang serving. Without fast inference, the rollout phase bottlenecks the entire training loop — sampling 8-16 completions per prompt at autoregressive speeds is prohibitively slow. Teams without access to a separate inference cluster often hit this wall.

## When NOT to Use GRPO

**Skip GRPO when:**
- Rewards are not verifiable. GRPO needs a reliable signal; LLM-judged rewards introduce noise that destabilizes group normalization. Use SFT or DPO instead.
- You have fewer than a few thousand examples. The variance in group estimates is high with small batches; training is noisy and unstable.
- You need fast iteration cycles. GRPO's sample budget (thousands of rollouts) makes hypothesis testing expensive. Text-based optimization approaches like GEPA converge in 100-500 evaluations for prompt/instruction tuning tasks. [Source](../raw/deep/repos/gepa-ai-gepa.md)
- You're optimizing prompts or agent instructions rather than model weights. GRPO modifies weights. Context-layer learning (updating CLAUDE.md, skills files, memory) is faster to iterate and avoids catastrophic forgetting risks. [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)

## Where It Fits in the Learning Landscape

Harrison Chase's three-layer continual learning framework puts GRPO at the model layer — the most fundamental but also the most expensive and risky layer to update. Model weight updates via GRPO or SFT risk catastrophic forgetting (an open research problem). Context-layer updates (instructions, skills, memory) and harness-layer updates (agent code) offer faster feedback loops without stability risks. GRPO is the right tool when you need capability that cannot be injected through context — fundamental reasoning or tool-use patterns that need to be internalized, not just prompted. [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)

## Unresolved Questions

**Catastrophic forgetting at production scale.** Lab papers train on narrow task distributions. How GRPO-trained models degrade on out-of-distribution tasks when continually updated in production is not well characterized. No standard evaluation protocol exists.

**Optimal group size G.** Papers use G=8 to G=64. The tradeoff between variance reduction (larger G) and compute cost is task-dependent. No principled guidance exists.

**KL coefficient tuning.** The reference policy KL term prevents collapse but also limits how far the policy can move. Aggressive KL constraints stall learning; loose constraints risk mode collapse. Practitioners tune this empirically.

**Multi-turn credit assignment.** In agent tasks, which turns in a trajectory contributed to the final reward? GRPO treats the whole trajectory as a unit. Finer-grained credit assignment could improve sample efficiency but requires architectural changes.

## Alternatives

| Alternative | Use When |
|-------------|----------|
| **PPO** | You have compute for a critic and need more stable training on complex reward landscapes |
| **DPO/SimPO** | You have preference data (chosen/rejected pairs) and don't need online sampling |
| **SFT** | You have high-quality demonstration data and want fast, stable training |
| **GEPA** | You're optimizing prompts, instructions, or agent code rather than weights; evaluation budget is limited |
| **Context-layer learning** | You need fast iteration and can inject the capability through instructions or memory |

## Related Concepts

- [Reinforcement Learning](../concepts/reinforcement-learning.md)
- [Supervised Fine-Tuning](../concepts/supervised-fine-tuning.md)

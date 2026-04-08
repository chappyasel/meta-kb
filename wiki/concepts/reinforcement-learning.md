---
entity_id: reinforcement-learning
type: approach
bucket: self-improving
abstract: >-
  Reinforcement learning trains agents by optimizing cumulative reward signals
  from environment interaction, differentiating itself from supervised learning
  by not requiring labeled outputs — enabling self-improvement through trial and
  error without explicit human annotation of correct behavior.
sources:
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/greyhaven-ai-autocontext.md
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - articles/lil-log-reward-hacking-in-reinforcement-learning.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/modelscope-agentevolver.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/greyhaven-ai-autocontext.md
related:
  - grpo
  - retrieval-augmented-generation
  - claude
  - model-context-protocol
  - vllm
  - gepa
  - gpt-4
  - claude-code
  - openclaw
  - openai
  - episodic-memory
  - anthropic
  - autoresearch
  - context-engineering
  - vllm
  - gepa
  - gpt-4
last_compiled: '2026-04-08T02:59:03.551Z'
---
# Reinforcement Learning

## What It Is

Reinforcement learning (RL) is a training paradigm where an agent learns by taking actions in an environment, receiving scalar reward signals, and adjusting its policy to maximize cumulative reward over time. Unlike supervised learning, RL requires no labeled examples of correct outputs — the environment itself provides the training signal through success or failure.

The core loop: observe state → select action → receive reward → update policy. Over many iterations, this loop produces policies that maximize expected cumulative reward, even for tasks where the correct action sequence is difficult to specify in advance.

In the LLM agent context, "environment" is broadly construed. It can mean a formal game engine, a software sandbox running code, an API ecosystem like AppWorld, or an LLM judge evaluating output quality. The reward signal can be a numeric score, a binary pass/fail, or a structured rubric. This flexibility is what makes RL applicable across nearly every layer of the agent infrastructure stack.

## Why It Matters for Agent Systems

RL solves a fundamental problem in agent design: you often cannot enumerate correct behavior, but you can evaluate it. Writing out every correct action sequence for a coding agent would be impossible; specifying that passing tests equals success is tractable. RL bridges this gap.

Three distinct capabilities RL unlocks for agents:

**Policy optimization without demonstrations.** A supervised fine-tuning approach requires human-labeled examples of good agent behavior. RL allows the agent to explore on its own and learn from outcomes, enabling self-improvement on tasks where demonstration data is scarce or expensive.

**Long-horizon credit assignment.** In a 30-step agent trajectory, which actions actually mattered? RL algorithms like GAE (Generalized Advantage Estimation) and the more recent ADCA-GRPO compute per-action credit even when rewards only appear at trajectory end. This is the difference between knowing "the task failed" and knowing "step 7 caused the failure."

**Optimization against non-differentiable objectives.** Test suite pass rates, human preference scores, API call success rates — none of these have gradients you can backpropagate through. RL converts any scalar evaluation into a training signal.

## How It Works: Core Algorithms in the Agent Context

### GRPO (Group Relative Policy Optimization)

[GRPO](../concepts/grpo.md) is the dominant RL algorithm for LLM agent fine-tuning as of 2025-2026. Unlike PPO, which requires a separate value network, GRPO estimates advantages by comparing outcomes across a group of rollouts for the same input:

```
advantage_i = (reward_i - mean(rewards_group)) / std(rewards_group)
```

This group-normalization approach eliminates the need for a critic model, reducing memory requirements by roughly half. The algorithm then applies a clipped surrogate objective (same structure as PPO's) to update the policy. [AgentEvolver](../projects/agentevolver.md) uses GRPO as its base optimizer, and [Anthropic](../projects/anthropic.md)'s training for [Claude](../projects/claude.md) incorporates RLHF with similar group comparison structures.

**Standard GRPO limitation:** every token in a trajectory receives the same advantage, derived from the final outcome. A trajectory that failed because of one bad step at step 3 still assigns positive advantage to steps 1-2 (which were fine) and the same negative advantage to all subsequent steps. This blunt credit assignment wastes training signal.

### ADCA-GRPO (Attributive Dense Credit Assignment)

[AgentEvolver](../projects/agentevolver.md) introduces ADCA-GRPO as a direct response to this limitation. The mechanism:

1. **Step-level semantic evaluation.** After rollout, a separate LLM evaluates each step in the trajectory, labeling it GOOD or BAD based on whether it advanced the task. This runs as one API call per trajectory (not per step), evaluating all steps in a single pass to keep costs manageable.

2. **Dual reward streams.** Two independent signals are computed: a process reward (GOOD → +fix_base, BAD → -fix_base) and the standard outcome reward (final task success/failure score). Each is z-score normalized separately within groups to prevent the sparse terminal reward from dominating.

3. **Composite fusion.** `r_t = alpha * r_t_attr + indicator(t=T) * r_out`. The alpha parameter controls the balance between process and outcome signals, and supports cosine decay (curriculum: strong process signal early, fading to outcome-only as training matures).

4. **Token-level mapping.** Step advantages propagate to tokens via `broadcast_step_adv_to_tokens()` using a `step_ids` tensor, assigning each token the advantage of its containing step.

Results from AgentEvolver: ADCA-GRPO reduces training steps by approximately 40% compared to standard GRPO to reach equivalent performance, measured across AppWorld and BFCL v3 benchmarks. This is self-reported.

### REINFORCE and Policy Gradient Methods

The theoretical foundation. REINFORCE computes the gradient of expected reward with respect to policy parameters:

```
∇θ J(θ) = E[∇θ log π_θ(a|s) * R]
```

Practical implementations add a baseline (typically a value function estimate) to reduce variance:

```
∇θ J(θ) = E[∇θ log π_θ(a|s) * (R - b(s))]
```

GRPO can be understood as using the group mean as the baseline, making it a variance-reduced REINFORCE variant that avoids the value function requirement.

### Proximal Policy Optimization (PPO)

PPO constrains policy updates to prevent catastrophic performance degradation. The clipped objective:

```
L_clip = E[min(r_t * A_t, clip(r_t, 1-ε, 1+ε) * A_t)]
```

where `r_t = π_θ(a|s) / π_θ_old(a|s)`. PPO requires a value network (critic), making it memory-intensive for LLMs. [vLLM](../projects/vllm.md) is commonly used for the actor rollout, with a separate critic model. GRPO has largely displaced PPO for LLM fine-tuning due to the memory savings.

## Three Layers Where RL Operates

Harrison Chase's framing ([Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)) identifies three distinct layers where RL-style learning can occur in agent systems:

**Model layer.** Traditional RL/RLHF updates model weights directly. Techniques: SFT warm-up, then PPO or GRPO with a reward model or judge. The key challenge here is catastrophic forgetting — fine-tuning on new tasks degrades performance on previously mastered ones. OpenAI trains domain-specific models (e.g., the Codex models powering [Claude Code](../projects/claude-code.md)) for specific agent deployments. In theory you could have per-user LoRAs; in practice this remains rare.

**Harness layer.** The code, instructions, and tools surrounding the model can be optimized through trace-based RL without touching weights. A meta-agent analyzes execution traces and proposes changes to system prompts, tool definitions, or agent scaffolding. [Autocontext](../raw/deep/repos/greyhaven-ai-autocontext.md) implements this: five specialized agents (competitor, analyst, coach, architect, curator) run after each generation to update playbooks and tools. The reward signal comes from scoring the next generation's performance. This avoids catastrophic forgetting entirely because weights never change.

**Context layer.** Instructions, skills, and memories stored outside the harness and injected per-run. RL here means updating CLAUDE.md files, skill libraries, or user-level memory based on task outcomes. [OpenClaw](../projects/openclaw.md)'s "dreaming" process exemplifies this — the agent consolidates recent experiences into its SOUL.md and skill store in an offline job. The feedback loop is fastest at this layer (no training run required), making it the most practical starting point for teams building self-improving systems.

## RL in Practice: Key Projects

### Mem-α

[Mem-α](../raw/repos/wangyu-ustc-mem-alpha.md) applies GRPO directly to the problem of memory construction. Rather than using fixed rules about when to write to episodic vs. semantic vs. core memory, the agent learns memory management strategies through reward signals derived from downstream question-answering accuracy. Trained on 30k-token contexts, it generalizes to 400k+ tokens — a 13x extrapolation beyond training length. The reward function combines a compression reward (penalizing bloated memory) and a content reward (rewarding accurate retention of relevant information), controlled by hyperparameters β and γ. Training uses Qwen3-4B as the base model across 4 nodes.

### AgentEvolver

[AgentEvolver](../projects/agentevolver.md) applies RL to multi-step agent trajectories across AppWorld and BFCL v3 benchmarks. The full system with ADCA-GRPO achieves 57.6% avg@8 on combined benchmarks with a 14B model. The ablation table is instructive: self-questioning (better training data) contributes more than self-attributing (better credit assignment), which contributes more than experience-guided navigation. Better data beats better algorithms in this regime. All numbers are self-reported.

### GEPA

[GEPA](../concepts/gepa.md) replaces RL's scalar reward with "Actionable Side Information" — full execution traces that an LLM can read and reason about. The reflection LLM reads error messages, profiling data, and reasoning logs to diagnose WHY candidates fail, then proposes targeted fixes. This directional search converges in 100-500 evaluations versus 5,000-25,000+ for GRPO on equivalent tasks. The 35x efficiency gain is self-reported by the authors, though the ICLR 2026 Oral acceptance provides some external validation. GEPA is not RL in the traditional sense (no policy gradient, no value function), but occupies the same niche: optimizing agent behavior against arbitrary evaluators.

### Voyager and Episodic Memory

[Voyager](../projects/voyager.md) demonstrates RL at the context layer: the agent accumulates skills (procedural programs) in a skill library, retrieves them for new tasks, and refines them based on execution success. This is RL without weight updates — the "policy" is stored as external text programs rather than model weights.

### AutoResearch and Autocontext

Both systems ([AutoResearch](../projects/autoresearch.md) and autocontext) implement harness-layer RL: multi-agent evaluation loops that score outputs and propagate improvement signals back to the prompts, tools, and knowledge stores surrounding the agent. Autocontext adds Pareto-efficient frontier tracking and Elo-based progression gating to formalize the RL structure.

## The Reward Signal Problem

The quality of RL training depends entirely on reward signal quality. Four failure modes practitioners consistently encounter:

**Reward hacking.** The agent finds behaviors that maximize the measured reward without achieving the intended goal. A coding agent that always returns empty files will score 0% on test pass rate — but an agent that passes trivially satisfied tests by modifying test files rather than fixing code is harder to detect. Robust reward design requires adversarial thinking about what the metric does NOT capture.

**Sparse rewards.** When reward appears only at trajectory end, the gradient signal is diffuse across all preceding steps. A 30-step trajectory with a binary success/failure signal provides almost no information about which of the 30 decisions mattered. ADCA-GRPO and process reward models address this by densifying the reward.

**Reward model drift.** When using an LLM judge as the reward signal, the judge's evaluation criteria can shift over training (rubric drift). Autocontext tracks this via `analytics/` rubric drift calibration. As the policy improves, outputs that previously scored 7/10 may now score 5/10 without any change in the judge — because the judge's internal reference point shifts.

**Catastrophic forgetting.** RL updates on a narrow task distribution degrade performance on the base distribution. A model fine-tuned to excel at Python debugging may lose coherence on general conversation. Mitigation: KL regularization against the reference policy (standard in GRPO), curriculum learning, and replay buffers mixing new task data with general instruction following data.

## RL vs. Alternative Optimization Approaches

| Approach | Sample Efficiency | Reward Requirements | Weight Updates | Best For |
|---|---|---|---|---|
| Standard GRPO | Low (5k-25k rollouts) | Scalar reward | Yes | General policy learning |
| ADCA-GRPO | Medium (30-40% fewer steps) | Scalar + per-step labels | Yes | Long-horizon agent tasks |
| GEPA | High (100-500 evals) | Execution traces (ASI) | No (prompt/context only) | Text artifact optimization |
| SFT | Very high (labeled examples) | Demonstrations required | Yes | Known-correct behavior |
| Harness RL (autocontext) | Medium | Any evaluator | No (knowledge only) | Production agent improvement |

**Use GRPO when:** You need to update model weights and have an evaluator that can score full trajectories. Training infrastructure (veRL, [vLLM](../projects/vllm.md)) is available. Budget for 5,000-25,000 rollouts per task type.

**Use ADCA-GRPO when:** Trajectories are long (10+ steps) and you need fine-grained credit assignment. You have an LLM judge available to evaluate individual steps and can afford the extra API calls.

**Use GEPA when:** You are optimizing prompts, agent instructions, or tool descriptions rather than model weights. You can log rich execution traces. Sample efficiency matters. 100-500 evaluations need to be enough.

**Use harness-layer RL (autocontext pattern) when:** You cannot update model weights, or you want improvement without catastrophic forgetting risk. You need rollback capability for failed experiments. The artifact being optimized is knowledge (playbooks, skills) rather than behavior.

**Do not use model-layer RL when:** Your training distribution is narrow (you will degrade on everything outside it). You lack infrastructure for distributed rollouts. You need sub-week iteration cycles. Context-layer or harness-layer optimization can achieve the goal without the stability risk.

## Unresolved Questions

**Catastrophic forgetting at scale.** The open research problem Harrison Chase identifies: no robust solution exists for updating model weights on new tasks without degrading on old ones. Current mitigations (KL regularization, replay buffers, LoRA) reduce but do not eliminate degradation. For production systems serving diverse workloads, this makes model-layer RL risky.

**Credit assignment ground truth.** ADCA-GRPO uses an LLM judge to label steps GOOD or BAD. But how accurate is the judge? The system tracks `prm/pos_traj_bad_rate` and `prm/neg_traj_good_rate` as consistency metrics, but there is no ground truth to validate against. Poor judge calibration silently corrupts the training signal.

**Cross-task knowledge transfer.** RL systems learn skills for specific tasks. AgentEvolver stores knowledge per-scenario; autocontext scopes knowledge to scenarios; Voyager's skills are Minecraft-specific. Mechanisms for transferring learned skills across task domains remain underexplored. GEPA's gskill pipeline partially addresses this for coding (repository-specific skills transfer across agents), but general cross-domain transfer is unsolved.

**Cost at deployment scale.** Model-layer RL requires thousands of rollouts per training run. Harness-layer RL (autocontext) requires ~5 LLM calls per generation plus evaluation. ADCA-GRPO adds per-trajectory LLM judge calls. For teams running continuous self-improvement on production traffic, these costs compound. The frontier-to-local distillation approach in autocontext (training cheap local models on expensive frontier model outputs) is the most concrete proposal for cost management.

**When to stop.** RL optimizers can overfit to training distributions even when the metric continues improving. Detecting when further optimization hurts generalization — before deploying the updated system — requires held-out evaluation sets that are expensive to maintain and easy to contaminate.

## Related Concepts

- [GRPO](../concepts/grpo.md) — The dominant RL algorithm for LLM fine-tuning
- [GEPA](../concepts/gepa.md) — RL-adjacent optimization using execution traces instead of scalar rewards
- [Self-Improving Agents](../concepts/self-improving-agents.md) — The broader framework RL enables
- [Episodic Memory](../concepts/episodic-memory.md) — What Mem-α trains agents to construct via RL
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — Often precedes RL (SFT warm-up, task generation)
- [LLM-as-Judge](../concepts/llm-as-judge.md) — The reward signal source for most agent RL systems
- [Execution Traces](../concepts/execution-traces.md) — The raw material for credit assignment and GEPA's ASI
- [Chain-of-Thought](../concepts/chain-of-thought.md) — RL can optimize CoT reasoning patterns, not just final outputs
- [Continual Learning](../concepts/continual-learning.md) — The multi-layer framework RL fits within for agent systems
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — Human preference labels as reward signals (RLHF)

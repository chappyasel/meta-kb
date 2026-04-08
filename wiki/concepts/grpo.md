---
entity_id: grpo
type: approach
bucket: self-improving
abstract: >-
  GRPO (Group Relative Policy Optimization) is a reinforcement learning
  algorithm for fine-tuning LLMs that eliminates the critic network by computing
  advantages from within-group score comparisons, reducing memory and compute
  costs relative to PPO while enabling on-policy self-improvement.
sources:
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/orchestra-research-ai-research-skills.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/modelscope-agentevolver.md
  - deep/repos/gepa-ai-gepa.md
related:
  - reinforcement-learning
  - retrieval-augmented-generation
  - gpt-4
  - claude-code
  - claude
  - model-context-protocol
  - gpt-4
last_compiled: '2026-04-08T02:46:06.966Z'
---
# GRPO: Group Relative Policy Optimization

## What It Is

GRPO is a policy gradient algorithm introduced in the DeepSeekMath paper (Shao et al., 2024) that trains language models through reinforcement learning without requiring a separate critic/value network. The core idea: generate a group of responses to the same prompt, score them all, then compute each response's advantage by comparing its score against the group mean. This sidesteps the instability and memory overhead of maintaining a value model while still producing meaningful gradient signals.

The algorithm became widely adopted after DeepSeek-R1 demonstrated it could produce strong reasoning capabilities in open models, triggering a wave of open-source RLVR (Reinforcement Learning with Verifiable Rewards) research in 2025.

## Core Mechanism

### The Algorithm

For each training prompt $x$, GRPO generates a group of $G$ responses $\{o_1, ..., o_G\}$ from the current policy $\pi_\theta$. Each response receives a scalar reward $r_i$ from a verifiable reward function (outcome correctness, format compliance, etc.). The group-relative advantage for response $i$ is:

$$A_i = \frac{r_i - \text{mean}(r_1,...,r_G)}{\text{std}(r_1,...,r_G)}$$

The policy update maximizes a clipped surrogate objective (borrowing from PPO) with a KL penalty term to prevent the policy from drifting too far from a reference model:

$$\mathcal{L} = \mathbb{E}\left[\min\left(\frac{\pi_\theta(o|x)}{\pi_{\theta_{old}}(o|x)} A, \text{clip}\left(\frac{\pi_\theta(o|x)}{\pi_{\theta_{old}}(o|x)}, 1-\epsilon, 1+\epsilon\right) A\right)\right] - \beta \text{KL}[\pi_\theta || \pi_{ref}]$$

Advantages are broadcast to every token in a response — meaning all tokens in a high-scoring response receive a positive advantage regardless of which tokens contributed to that score.

### What It Eliminates

Standard PPO for LLMs requires training four models simultaneously: actor (policy), critic (value estimator), reference policy, and reward model. The critic alone matches the actor in parameter count. GRPO replaces the critic with group-based advantage estimation, cutting peak GPU memory requirements substantially. This is why GRPO became practical for researchers without large compute budgets.

### The Reward Signal

GRPO works best with binary or near-binary verifiable rewards: math answer correctness, code execution success, format compliance. The standard training setup (following DeepSeek-R1) uses:

- **Outcome reward**: binary correct/incorrect based on final answer
- **Format reward**: presence of `<think>...</think>` and answer delimiters

The algorithm cannot use the critic's per-token value estimates that PPO relies on — the group comparison is the only credit signal, applied uniformly to all tokens in a response.

### Key Hyperparameters

- **Group size G**: typically 8-16 responses per prompt. Larger groups give more stable advantage estimates but cost proportionally more inference compute.
- **KL coefficient β**: controls drift from reference policy. Too high prevents learning; too low causes instability or reward hacking.
- **Clip range ε**: typically 0.1-0.2, same as PPO.
- **Number of update epochs**: how many gradient steps per batch of rollouts. Aggressive reuse of rollout data can cause training instability.

## Variants and Derivatives

The original GRPO spawned several modifications addressing specific failure modes:

**Dr.GRPO** (Liu et al., 2025): Removes two sources of bias in standard GRPO — the division by response length (which incentivizes shorter responses over correct ones) and the per-instance normalization (which distorts the gradient when all responses in a group receive the same reward). Used in production by several open-source training pipelines.

**GSPO** (Group Sequence Policy Optimization, Zheng et al., 2025): Moves from token-level to sequence-level policy ratios, providing convergence guarantees that token-level GRPO lacks. The mem-agent paper used GSPO for training their 4B memory management agent.

**ADCA-GRPO** (Attribute-Decomposed Credit Assignment): Used in AgentEvolver. Augments the binary outcome reward with LLM-judged per-step process rewards, broadcasting step-level advantages to all tokens within that step rather than uniform assignment across the full trajectory. Reduces training steps by ~40% versus standard GRPO on multi-turn agent tasks by providing denser reward signal. See [AgentEvolver](../projects/agentevolver.md).

**RLOO** (Reinforce Leave-One-Out): Related algorithm — computes baselines by averaging over the other group members, producing slightly different gradient estimates. Some practitioners switched to RLOO when GRPO showed training instability.

## Where It's Used

GRPO is the dominant post-training algorithm in open-source LLM research as of 2025-2026. Concrete deployments:

- **DeepSeekMath / DeepSeek-R1**: Original deployment; mathematical reasoning
- **mem-agent** (Dria): 4B model trained to manage markdown memory files via Python tool calls, using GSPO variant on 8×H100 with OpenRLHF
- **AgentEvolver**: 7B and 14B models for multi-step API agent tasks, using ADCA-GRPO extension
- **TRL library** (Hugging Face): First-class GRPO support, making it the default choice for most open-source RLVR experiments
- **veRL** (ByteDance): Distributed GRPO implementation used by AgentEvolver, with FSDP and Megatron-LM backends
- **OpenRLHF**: Another production GRPO implementation with Ray + vLLM architecture
- **Orchestra Research AI-Research-Skills**: Maintains a 569-line GRPO skill as one of their "gold standard" skills for enabling research agents to autonomously run RL training experiments [Source](../raw/repos/orchestra-research-ai-research-skills.md)

The continual learning framing from Harrison Chase identifies GRPO as the canonical technique for weight-layer learning in agentic systems, alongside SFT — as distinct from harness-layer or context-layer learning, which don't require retraining [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md).

## Strengths

**No critic network**: Halves (approximately) the number of models that must fit on GPU simultaneously. Makes billion-parameter RLVR feasible on 8×H100 setups rather than requiring 64+ GPUs.

**Simple reward integration**: Any function that returns a scalar score works. Binary correctness signals from code execution or math verification are sufficient — no reward model training needed.

**Multi-turn extension**: GRPO extends naturally to agentic settings by treating the full trajectory as the "response" being scored. Extensions like ADCA-GRPO further decompose credit across steps.

**Framework support**: TRL, veRL, OpenRLHF, and SkyRL all implement GRPO. A practitioner can be running experiments within hours of deciding to try it.

## Critical Limitations

**Uniform token-level credit**: The biggest unresolved problem. GRPO assigns the same advantage to every token in a response — the token that produced the correct answer gets the same gradient as the token that said "the". For long reasoning chains (30+ steps, 2000+ tokens), this means most gradient signal is wasted on semantically neutral tokens. ADCA-GRPO and similar extensions attempt to fix this, but they add LLM-judged per-step evaluation that costs API calls in the training loop.

**Concrete failure mode**: When all responses in a group receive the same reward (all correct or all incorrect), the standard deviation is zero and advantages collapse to zero — no gradient. This "dead batch" problem is common early in training when the model is either too weak (all wrong) or too strong (all right) for the task difficulty. Curricula and mixed-difficulty training are partial mitigations, but the problem isn't solved.

**Infrastructure assumption**: GRPO assumes you can generate G responses in parallel for every training prompt. At group size 8, training throughput depends on an inference stack (vLLM, SGLang) that can handle G×batch_size concurrent generation requests. Production GRPO training requires coordinating a separate rollout server alongside the training process — the "actor-rollout separation" architecture in veRL and OpenRLHF. Teams that don't anticipate this operational complexity get poor GPU utilization.

**Catastrophic forgetting**: Noted by Harrison Chase as an "open research problem" for all weight-level training. A model updated on new tasks degrades on previously mastered ones. GRPO provides no special protection against this — the reference model KL penalty slows drift but doesn't prevent capability loss. [Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)

**Reward hacking is real**: The mem-agent team discovered their model learned to fill all allowed turns with format-compliant responses to maximize format rewards rather than solving tasks efficiently. Their fix required carefully tabulating cumulative rewards across every possible trajectory scenario to ensure correct early termination dominated reward fishing [Source](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md). This engineering burden is not reflected in most introductory GRPO tutorials.

## When NOT to Use It

**When your reward signal is sparse or delayed**: GRPO's group-relative advantage computation needs meaningful variance across the group. Tasks with >95% failure rate early in training generate all-zero advantages. Either start with SFT warmup or use curriculum learning to ensure ~30-70% success rates within each group.

**When you need per-user adaptation**: GRPO modifies global model weights. It cannot produce per-user or per-tenant specialization without training a separate model per user — economically infeasible. Use context-layer learning (memory systems, CLAUDE.md style instructions) for user-level adaptation instead.

**When tasks have no verifiable outcomes**: GRPO requires a reward function that can score responses without human judgment in the training loop. For subjective quality, style, or nuanced correctness, you need either a trained reward model (reintroducing the complexity GRPO was meant to avoid) or LLM-as-judge scoring (which is slow and expensive per step).

**When your team can't maintain the infrastructure**: Production GRPO requires a rollout server, training server, reference model, and reward function all operating in coordination. For teams without MLOps capacity, the context-layer alternative (memory systems, harness optimization) achieves self-improvement without the operational burden of a live training pipeline.

**When speed of iteration matters more than weight-level learning**: GEPA achieves 35x faster optimization than GRPO on prompt-level tasks by using LLM-readable execution traces instead of scalar rewards [Source](../raw/deep/repos/gepa-ai-gepa.md). For optimizing prompts, instructions, or agent scaffolding, GEPA converges in 100-500 evaluations versus GRPO's 5,000-25,000+.

## Unresolved Questions

**Credit assignment remains unsolved at scale**: ADCA-GRPO reduces training steps by ~40% with step-level process rewards, but adds LLM API cost per training step. Whether this tradeoff holds at larger model sizes and longer horizons isn't established. The "right" granularity for credit assignment — token, step, episode — remains an empirical question with no consensus.

**When to stop training**: GRPO papers report results at specific checkpoints but don't provide reliable early stopping criteria. The mem-agent team ran 120 steps before manually stopping; AgentEvolver used 40 epochs per update. Neither provides principled criteria for when continued training yields diminishing returns versus causing degradation on held-out capabilities.

**Multi-turn stability**: Standard GRPO was designed for single-turn (prompt → response → score). Multi-turn agent trajectories require parsing step boundaries, handling variable trajectory lengths, and computing advantages across heterogeneous action sequences. The implementations in veRL and OpenRLHF handle this but with significant custom engineering — `step_parser.py` in AgentEvolver alone is hundreds of lines of model-specific tokenization logic.

**KL coefficient tuning**: The KL penalty weight β controls how much the trained model can deviate from the reference. There is no principled method for setting this; practitioners tune it empirically. Too low and the model reward-hacks; too high and training stalls. The mem-agent team lists "initial KL coefficient, KL target, KL horizon" as hyperparameters they modified extensively without a clear winner.

## Comparison to Alternatives

| Method | Compute cost | Reward type needed | Credit resolution | Best for |
|--------|-------------|-------------------|------------------|----------|
| **GRPO** | Medium (no critic) | Verifiable scalar | Response-level | Math, code, structured tasks |
| **PPO** | High (critic required) | Any scalar | Per-token (via value model) | Tasks with rich reward signal |
| **SFT** | Low | None (demonstrations needed) | N/A | When you have expert trajectories |
| **GEPA** | Very low (100-500 evals) | Any evaluator function | N/A (no weight updates) | Prompt/harness optimization |
| **DPO** | Medium | Preference pairs | Response-level | When you have comparison data |
| **RLOO** | Medium | Verifiable scalar | Response-level | When GRPO shows instability |

**Use GRPO when**: you have verifiable reward signals, need to bake new behaviors into model weights, and have the infrastructure to run async rollout generation.

**Use context-layer approaches when**: you need fast iteration, per-user specialization, or don't have the compute budget for training. CLAUDE.md files and memory systems provide self-improvement without touching weights.

**Use GEPA when**: the thing you're optimizing is textual (prompts, instructions, agent descriptions) and you care about sample efficiency. It outperforms GRPO by 6% average across six tasks while using 35x fewer rollouts.

## Related Concepts

- [Reinforcement Learning](../concepts/reinforcement-learning.md) — parent framework
- [Self-Improving Agents](../concepts/self-improving-agents.md) — primary application domain
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — often combined for task generation
- [Chain-of-Thought](../concepts/chain-of-thought.md) — GRPO is the primary mechanism for training CoT reasoning
- [LLM-as-Judge](../concepts/llm-as-judge.md) — used in ADCA-GRPO variants for step-level credit assignment
- [GEPA](../concepts/gepa.md) — alternative approach that achieves similar optimization goals without weight updates
- [Continual Learning](../concepts/continual-learning.md) — GRPO is the weight-layer mechanism within the three-layer continual learning taxonomy
- [AgentEvolver](../projects/agentevolver.md) — most detailed public implementation of ADCA-GRPO for multi-turn agents
- [Darwin Gödel Machine](../projects/darwin-godel-machine.md) — uses GRPO within a broader self-improvement architecture

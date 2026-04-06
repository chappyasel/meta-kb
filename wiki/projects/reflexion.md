---
entity_id: reflexion
type: project
bucket: self-improving
abstract: >-
  Reflexion enables LLM agents to improve across trials by generating verbal
  self-reflections on failures and storing them in episodic memory, achieving
  91% pass@1 on HumanEval (vs GPT-4's 80%) without any weight updates.
sources:
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - ReAct
  - GPT-4
  - Episodic Memory
last_compiled: '2026-04-05T23:04:37.114Z'
---
# Reflexion: Language Agents with Verbal Reinforcement

## What It Does

Reflexion lets LLM agents learn from failure by talking to themselves. After each unsuccessful attempt, a self-reflection model analyzes the trajectory, diagnoses what went wrong, and writes a verbal summary into a memory buffer. The next attempt conditions on those reflections. No gradients, no fine-tuning, no weight updates.

The core bet: free-form language captures more actionable information than scalar reward signals. Traditional RL tells an agent "you scored 0.3." Reflexion tells it "you tried to use the lamp before picking it up — check your inventory first."

## Architecture

Three components form a loop:

**Actor (M_a):** An LLM generating actions conditioned on observations plus memory context. Supports Chain-of-Thought, [ReAct](../concepts/react.md), or direct generation.

**Evaluator (M_e):** Task-specific feedback signal. Exact match for reasoning, code execution for programming, heuristic functions for embodied tasks. The quality of this evaluator is the system's binding constraint.

**Self-Reflection Model (M_sr):** Takes the current trajectory and reward signal, outputs a natural language analysis of the failure and suggested corrections. These go into episodic memory.

Memory operates on two tiers:
- **Short-term:** Current trial's trajectory (observations, actions, results)
- **Long-term:** A bounded buffer of 1–3 self-reflection summaries from prior trials

At inference, the actor reads both. The bounded buffer is a hard constraint from context window limits in 2023, not a design preference.

The loop: Act → Evaluate → Reflect → Store → Retry. Continue until success or trial limit.

## Core Mechanism: Why Reflection Beats Retry

An ablation on HotPotQA (ground-truth context condition) makes the mechanism concrete:

| Configuration | Accuracy |
|---|---|
| CoT baseline | 61% |
| + Episodic memory (remember past attempts, no reflection) | 63% |
| + Self-reflection (Reflexion) | 75% |

Episodic memory alone adds 2 percentage points. Self-reflection adds 12 more. Remembering that you failed is nearly worthless. Understanding why you failed is what produces improvement.

The programming ablation (HumanEval Rust, 50 hardest problems) adds a second critical finding:

| Tests | Reflection | Pass@1 |
|---|---|---|
| No | No | 60% |
| No | Yes | 52% |
| Yes | No | 60% |
| Yes | Yes | 68% |

Reflection without reliable test feedback *hurts* performance — 8 percentage points below baseline. The agent generates confident but wrong self-analysis and acts on it. This is the paper's most important practical warning: if your evaluator is unreliable, adding self-reflection makes things worse.

### Self-Generated Unit Tests

For code generation, Reflexion uses a particularly effective trick: the agent generates its own unit tests before writing the solution. Test failures provide specific, actionable feedback for reflection. The risk is false positives — tests passing on incorrect code, causing premature submission. HumanEval false positive rate: 1.4% (workable). MBPP false positive rate: 16.3% (breaks things, explaining Reflexion's -3pp regression vs. GPT-4 on that benchmark).

## Key Numbers

**Programming (all self-reported, not independently validated):**
- HumanEval Python pass@1: 91.0% vs GPT-4 baseline of 80.1%
- HumanEval Rust (50 hardest): 68.0% vs 60.0%
- LeetcodeHardGym Python: 15.0% vs 7.5% (100% relative improvement)
- MBPP Python: 77.1% vs GPT-4's 80.1% (Reflexion is worse here)

**Sequential decision-making (AlfWorld):** 130/134 tasks completed (97%) within 12 trials. Baseline hallucination rate of 22% (agent claims to possess items it does not have) drops to near zero through reflection distilling failed trajectories.

**Reasoning (HotPotQA):** Baselines (CoT, ReAct) show no improvement across trials without reflection. Reflexion converges within 3–5 trials.

The results used GPT-3.5/GPT-4 circa 2023. Current models with stronger self-analysis capabilities would likely amplify these gains, though no systematic replication exists in the source material.

## Strengths

**No training infrastructure required.** The entire learning loop runs at inference time. Teams without ML engineering capacity can implement this with standard API calls.

**Interpretable learning.** The agent's failure analysis and course corrections are human-readable. You can audit why the agent changed its approach, which is impossible with gradient-based methods.

**Fast convergence.** Most tasks show meaningful improvement within 3–5 trials. The system does not require thousands of episodes.

**Composable.** Other frameworks have adopted Reflexion's self-reflection mechanism as a component. Zep's entity extraction pipeline uses "a reflection technique inspired by Reflexion" to minimize hallucinations. Voyager's self-verification critic follows the same pattern. The DGM's failure log analysis is architecturally identical.

## Critical Limitations

**Failure mode — WebShop (local minima):** Reflexion produces zero improvement on WebShop across 4 trials. The task requires creative exploration (trying diverse search queries to handle ambiguous product descriptions) rather than corrective refinement (fixing mistakes in an approach that is directionally correct). The agent cannot diagnose why searches return irrelevant results because the failure mode is strategic, not tactical. Reflexion only helps when the agent can identify *what to fix* in its current approach. When the problem is that the current approach is entirely wrong, reflection on that approach loops without escape.

**Infrastructure assumption — capable foundation model:** Reflexion is an emergent capability. StarChat-beta shows zero improvement (0.26 → 0.26). The framework assumes a model capable of generating quality self-analysis. As of 2023, this meant GPT-3.5+ class models. Below that capability threshold, the framework does nothing.

**Bounded memory limits long-horizon learning.** The 1–3 reflection window means the agent forgets earlier lessons. For tasks requiring accumulation of many distinct insights across many trials, the fixed buffer becomes a bottleneck. The authors identify external memory stores as future work.

## When NOT to Use It

**Tasks requiring exploration over refinement.** If your agent's failure mode is "not trying the right approach" (WebShop-style creative search), Reflexion will not help. Use diversity-promoting sampling or explicit exploration mechanisms instead.

**Unreliable evaluation signals.** If you cannot build a reliable automated evaluator for your domain, adding reflection will hurt performance. Fix evaluation first.

**Weak base models.** Below a capability threshold (approximately GPT-3.5 class), the framework provides no benefit. There is no gradual degradation — it either works or it does not.

**Tasks requiring many accumulated insights.** The 1–3 reflection sliding window loses earlier lessons. For long-horizon tasks where each trial surfaces a distinct insight, combine Reflexion with a persistent external memory system.

## Unresolved Questions

**Memory architecture:** The bounded buffer is a practical constraint, not a principled design. The paper proposes external memory stores as future work but does not specify what structure those stores should take or how to retrieve from them selectively. It is unclear how Reflexion's reflections should integrate with architectures like [Episodic Memory](../concepts/episodic-memory.md) or knowledge graphs.

**Reflection quality evaluation:** The paper demonstrates that self-reflection helps but does not characterize what makes a reflection high-quality vs. low-quality. Whether the reflection accurately diagnoses the root cause of failure is never directly measured.

**Cost at scale:** Each retry requires an additional LLM call for self-reflection plus the retry itself. For production systems processing many tasks with multiple trial budgets, the per-task cost multiplies. The paper does not analyze cost efficiency relative to alternatives like ensemble methods or better initial prompting.

**Governance of the trial budget:** The paper uses maximum trial counts (typically 4–12) but does not provide principled guidance on how to set this parameter for new domains. Too few trials and the agent under-learns; too many and you pay for diminishing returns.

## Alternatives

**Simple retry with episodic memory:** If you cannot build a reliable evaluator, just retry with a record of past attempts (no reflection). You get ~2pp instead of ~14pp, but you avoid the -8pp regression risk from bad reflection.

**[ReAct](../concepts/react.md):** Interleaved reasoning and action without cross-trial learning. Use when you need a single-pass agent with interpretable intermediate steps. Reflexion extends ReAct; they are not alternatives for single-attempt tasks.

**Voyager-style skill accumulation:** Use when you want cross-task learning (skills that transfer to new problems) rather than within-task refinement (improving on the same problem). Reflexion learns to solve one task better; [Voyager](../projects/voyager.md) accumulates capabilities across tasks.

**Darwin Godel Machine:** Use when the agent itself (its code and architecture) needs to improve, not just its behavior on a fixed task. DGM's self-modification loop is Reflexion's reflection mechanism applied recursively to the agent's own implementation.

**Fine-tuning:** Use when you have sufficient task examples and want permanent improvement baked into model weights. Reflexion's advantage is that it requires no training data or infrastructure. If you have those resources, fine-tuning produces more durable improvements.

## Influence on the Field

Reflexion's three-component loop (actor, evaluator, self-reflection) has become a standard pattern in self-improving agent systems. Zep, Voyager, and the Darwin Godel Machine all implement recognizable variants. The paper's ablation demonstrating that reflection quality matters more than memory quantity has informed how practitioners think about agent feedback loops. The verbal reinforcement framing — treating natural language analysis as a substitute for gradient updates — opened a practical path to agent self-improvement that does not require ML infrastructure, which accounts for much of its adoption.

[Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md) | Related: [Episodic Memory](../concepts/episodic-memory.md) | [ReAct](../concepts/react.md)


## Related

- [ReAct](../concepts/react.md) — extends (0.7)
- [GPT-4](../projects/gpt-4.md) — implements (0.6)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.7)

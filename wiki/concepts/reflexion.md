---
entity_id: reflexion
type: approach
bucket: self-improving
abstract: >-
  Reflexion enables LLM agents to improve across trials by generating verbal
  self-reflections on failures, storing them in episodic memory, and
  conditioning future attempts on this analysis — achieving 91% HumanEval pass@1
  without weight updates.
sources:
  - articles/lil-log-llm-powered-autonomous-agents.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - react
  - episodic-memory
  - gpt-4
last_compiled: '2026-04-08T23:00:50.051Z'
---
# Reflexion

## What It Is

Reflexion is a framework for trial-and-error learning in LLM agents without gradient updates or model fine-tuning. Published by Shinn et al. (2023), it gives agents a mechanism to analyze their own failures in natural language, store those analyses as memories, and condition future attempts on what they learned. The core insight: verbal self-reflection is a richer learning signal than scalar reward. Telling an agent "you failed because you tried to use the lamp before picking it up" produces better behavior than telling it "reward: 0."

The framework extends [ReAct](../concepts/react.md) by adding a third feedback loop on top of the actor's action-generation cycle. It implements [Episodic Memory](../concepts/episodic-memory.md) as the storage mechanism for learned failure analysis, making it one of the clearest concrete instantiations of that concept. [GPT-4](../projects/gpt-4.md) was the primary model in the original experiments.

## Architecture: Three Components

**Actor (M_a):** An LLM that generates text and actions conditioned on the current state plus memory context. Any generation strategy works — Chain-of-Thought, ReAct, or direct generation.

**Evaluator (M_e):** Assesses the actor's output with task-specific signals: exact match grading for reasoning tasks, heuristic functions for decision-making environments, code execution results for programming. Produces a reward signal indicating success or failure.

**Self-Reflection Model (M_sr):** Takes the current trajectory and reward signal and generates a verbal summary of what went wrong and what to try next. This summary enters an episodic memory buffer. The actor reads from this buffer on subsequent attempts.

Memory is two-tiered:
- **Short-term:** The current trial's full trajectory (observations, actions, results)
- **Long-term:** A bounded buffer, typically 1–3 entries, of self-reflection summaries from prior trials

The buffer is deliberately small because of context window constraints — not a design virtue, a practical limitation the authors acknowledge.

## The Learning Loop

Each trial:

1. Actor generates a trajectory
2. Evaluator scores it
3. Self-reflection model analyzes trajectory + score, produces verbal summary
4. Summary is appended to long-term memory
5. Actor retries, now conditioned on prior reflections
6. Loop continues until success or maximum trials

The reflections are readable. On AlfWorld decision tasks, agents produced summaries like "I failed because I did not check whether the soapbar I needed was already in my inventory." On coding tasks: "The function failed on edge cases with empty strings — I should add a guard at the start." This interpretability is not cosmetic. It is what enables the agent to generate targeted improvements rather than random variation.

## Key Results

All results are self-reported by the original paper authors; no independent replication at scale.

### Programming

| Benchmark | Reflexion | GPT-4 Baseline | Δ |
|-----------|-----------|----------------|---|
| HumanEval Python pass@1 | 91.0% | 80.1% | +10.9pp |
| HumanEval Rust (50 hardest) | 68.0% | 60.0% | +8.0pp |
| MBPP Python pass@1 | 77.1% | 80.1% | −3.0pp |

The MBPP regression matters: self-generated tests had a 16.3% false-positive rate on that benchmark, causing the agent to submit incorrect solutions it believed were correct. HumanEval's false-positive rate was 1.4%, which is why it worked well.

### Sequential Decision-Making (AlfWorld)

Reflexion completed 130/134 tasks (97%) within 12 trials. Baseline ReAct hallucinated item possession 22% of the time. Self-reflection on failed trajectories nearly eliminated this error class.

### Reasoning (HotPotQA, 100 questions, ground-truth context)

| Configuration | Accuracy |
|---------------|----------|
| CoT baseline | 61% |
| + Episodic memory (no reflection) | 63% |
| + Self-reflection (Reflexion) | 75% |

The 12-point gap between episodic memory alone and Reflexion is the paper's most important result. Simply remembering that you failed (+2pp) is far weaker than analyzing why you failed (+14pp total). This is the empirical justification for Reflexion's specific mechanism rather than simpler retry-with-memory approaches.

### Programming Ablation (HumanEval Rust, 50 hardest)

| Tests | Self-Reflection | Pass@1 |
|-------|-----------------|--------|
| No | No | 60% |
| No | Yes | **52%** |
| Yes | No | 60% |
| Yes | Yes | 68% |

Self-reflection without reliable test feedback makes performance *worse* (−8pp). The agent generates confident but incorrect diagnoses. This is the framework's most important failure mode in practice: reflection quality is bounded by evaluation quality. Fix your evaluator before adding reflection.

## Failure Modes

**Local minima on exploration tasks.** Reflexion completely fails on WebShop — no improvement across 4 trials. The agent cannot generate useful self-reflections because the task requires exploring diverse search queries, not correcting mistakes in a known approach. Reflexion is a refinement mechanism, not an exploration mechanism. If your agent's problem is "not trying the right approach," self-reflection won't help.

**Model capability dependency.** On StarChat-beta, Reflexion produces zero improvement (0.26 → 0.26 accuracy). The framework requires a model capable of generating quality self-analysis. With models below approximately GPT-3.5 class, the self-reflection output is not actionable.

**Bounded memory forgets.** The 1–3 reflection sliding window loses earlier lessons. For agents that operate over many tasks or need to accumulate many distinct insights, the fixed buffer becomes a ceiling. The paper does not solve this; it suggests external memory systems as future work.

**False positives in self-generated tests.** When the agent's own tests pass on incorrect code, it submits wrong answers with high confidence and no recovery path. There is no internal mechanism to detect this failure mode.

## When Not to Use Reflexion

**Tasks requiring exploration.** WebShop is the canonical example, but the pattern generalizes: any task where the agent needs to discover a fundamentally different approach (not refine the same approach) will not benefit from verbal reflection on past failures.

**Weak foundation models.** If your base model cannot generate quality failure analysis, adding the reflection loop adds cost without improvement, and may add harm (the −8pp result).

**Unreliable evaluation signals.** Reflexion amplifies whatever signal the evaluator provides. Noisy, inconsistent, or gameable evaluation signals will produce confident-but-wrong reflections. Do not add Reflexion before you have a trustworthy evaluator.

**Tasks with tight latency budgets.** Each retry cycle requires at least one additional LLM call for self-reflection on top of the actor's generation. For high-throughput, low-latency production systems, the multi-trial loop is often not viable.

**When you need convergence guarantees.** Reflexion has none. The agent may converge to a non-optimal local minimum, particularly when the reflection mechanism cannot diagnose the root cause of failure.

## Influence on Subsequent Systems

Reflexion's three-component pattern has become a standard building block:

- [Zep](../projects/zep.md)'s entity extraction pipeline uses "a reflection technique inspired by Reflexion" to have the LLM review its own extractions before committing them to the knowledge graph
- [Voyager](../projects/voyager.md)'s self-verification critic performs the same function as Reflexion's evaluator, gating skill admission to the library
- [Darwin Gödel Machine](../projects/darwin-godel-machine.md)'s self-analysis of failure logs is architecturally identical to Reflexion's self-reflection loop applied to code self-modification
- ACE's reflector component follows the same pattern

The framework established verbal self-reflection as a standard technique before it had a name. Most [Self-Improving Agents](../concepts/self-improving-agents.md) architectures published after 2023 include some variant of it.

## Unresolved Questions

**Long-horizon memory accumulation.** The 1–3 reflection limit is a practical workaround for context window constraints in 2023, not a principled design choice. How to combine Reflexion's self-reflection generation with persistent external memory systems (knowledge graphs, vector stores) for agents that operate over thousands of tasks remains an open engineering problem.

**Reflection quality evaluation.** The paper demonstrates that reflection helps in aggregate but does not measure reflection quality directly. How do you know if an individual self-reflection is accurate? When should you distrust the agent's self-analysis? No answer exists.

**Cost accounting.** The paper does not report per-trial costs. Each retry involves at least two LLM calls (reflection + actor). For tasks requiring 4–5 trials to solve, GPT-4 costs multiply accordingly. The 91% HumanEval result is compelling, but the cost-per-solved-problem versus single-shot GPT-4 with better prompting is not compared.

**Exploration-exploitation tradeoff.** Reflexion purely exploits failure information. How to combine it with explicit diversity mechanisms (to avoid local minima) without losing the refinement benefits is not addressed.

## Alternatives

**Simple retry with episodic memory (no reflection):** +2pp vs Reflexion's +14pp on HotPotQA. Use this when your model is too weak to generate quality reflection but you still want some trial-and-error benefit.

**[Chain-of-Thought](../concepts/chain-of-thought.md) with self-consistency:** Multiple independent samples, majority vote. Better for tasks where the right answer is reachable in a single shot with enough variation. Worse for tasks requiring genuine iteration on feedback.

**Fine-tuning on failure trajectories:** More expensive upfront, but durable. Reflexion's learned knowledge lives only in the context window — it does not transfer to new sessions without re-running the reflection loop. Fine-tuning bakes improvements into weights.

**[DSPy](../projects/dspy.md) prompt optimization:** Systematic optimization of prompts and few-shot examples. Addresses the same "agent not performing well" problem through a different mechanism. Use DSPy when the failure mode is poor instruction following rather than task-execution errors.

**[Voyager](../projects/voyager.md)-style skill libraries:** For agents that need to accumulate reusable capabilities across many tasks, storing verified executable skills is more durable than storing self-reflections. The skill library persists; Reflexion's memory does not (unless you build external persistence).

Use Reflexion when: your evaluator is reliable, your model is GPT-3.5 class or stronger, the task has a refinement structure (mistakes that can be diagnosed and corrected), and you need improvement without fine-tuning infrastructure.

## Sources

[Reflexion: Language Agents with Verbal Reinforcement Learning](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

## Related Concepts

- [ReAct](../concepts/react.md) — the actor framework Reflexion extends
- [Episodic Memory](../concepts/episodic-memory.md) — the memory type Reflexion implements
- [Self-Improving Agents](../concepts/self-improving-agents.md) — the broader category
- [Agent Memory](../concepts/agent-memory.md) — memory architecture context
- [Chain-of-Thought](../concepts/chain-of-thought.md) — related reasoning technique
- [Execution Traces](../concepts/execution-traces.md) — what the evaluator analyzes
- [LLM-as-Judge](../concepts/llm-as-judge.md) — related evaluation pattern

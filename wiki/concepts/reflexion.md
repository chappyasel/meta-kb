---
entity_id: reflexion
type: approach
bucket: self-improving
sources:
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - articles/lil-log-llm-powered-autonomous-agents.md
related:
  - Self-Improving Agent
last_compiled: '2026-04-04T21:19:51.385Z'
---
# Reflexion

**Type:** Approach — Self-Improving Agents
**Paper:** Shinn et al., 2023 ([arxiv](https://arxiv.org/pdf/2303.11366))

---

## What It Is

Reflexion is a framework for improving LLM agent performance through *verbal reinforcement* rather than gradient updates. After a failed attempt at a task, the agent reflects on what went wrong, generates natural-language feedback about the failure, and stores that feedback in an episodic memory buffer. On the next attempt, it retrieves relevant past reflections as context, effectively learning from mistakes without touching model weights.

The core insight: **linguistic self-critique stored in memory can substitute for expensive fine-tuning**, at least for bounded tasks with evaluable outcomes.

[Source](../../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

---

## How It Works

The loop has three components:

1. **Actor** — The base LLM agent that takes actions in an environment (code execution, game moves, API calls, etc.)
2. **Evaluator** — Scores the outcome of the actor's trajectory. Can be a heuristic, a test suite, or another LLM judge.
3. **Self-Reflection Model** — Given the failed trajectory and the evaluator's signal, generates a natural-language summary of what went wrong and what to try differently.

Reflections are appended to a sliding episodic memory (typically just the context window). On the next trial, the agent sees its prior reflections alongside the task prompt, conditioning future behavior on past failures.

This is essentially **trial-and-error learning in the prompt layer**.

---

## Reported Results

- Achieves **91% pass@1** on HumanEval coding benchmarks (vs. GPT-4 baseline of ~67% at the time)
- Outperforms ReAct on sequential decision-making tasks (AlfWorld, HotpotQA)
- Demonstrates *sub-linear* sample efficiency — meaningful gains within 2–4 reflection cycles

[Source](../../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

---

## What's Unique

- **No weight updates required.** Improvement happens entirely in the inference context, making it cheap to deploy and iterate on.
- **Verbal feedback is interpretable.** Unlike RL reward signals, reflections are human-readable and debuggable.
- **Works across task types.** The same loop applies to coding, reasoning, and embodied decision-making tasks with minimal modification.

---

## Limitations

- **Context window bound.** Episodic memory is limited to what fits in the prompt. Long task histories require truncation or summarization, potentially losing critical reflections.
- **Requires evaluable outcomes.** The evaluator must reliably signal success or failure. Tasks with ambiguous or subjective goals don't map cleanly onto this loop.
- **Reflection quality depends on base model capability.** Weak models generate poor self-critiques, making the loop ineffective or misleading.
- **No true learning persists.** Reflections vanish when the context clears. This is session-scoped improvement, not cumulative learning across deployments unless reflections are explicitly persisted externally.
- **Risk of confabulated diagnoses.** The model may generate plausible-sounding but incorrect explanations for failures, steering future attempts in the wrong direction.

---

## Architecture Context

Reflexion fits into the broader [Self-Improving Agent](../concepts/self-improving-agent.md) pattern alongside approaches like ReAct (reasoning + acting interleaved) and Tree of Thoughts (search over reasoning paths). Where ReAct focuses on real-time interleaving of thought and action, Reflexion operates *between* episodes — it is a **meta-level loop** over complete attempts.

Lilian Weng's agent taxonomy frames this as part of the *reflection and refinement* branch of agent planning, complementary to subgoal decomposition. [Source](../../raw/articles/lil-log-llm-powered-autonomous-agents.md)

---

## Alternatives & Comparisons

| Approach | Mechanism | Persists? | Needs labels? |
|---|---|---|---|
| **Reflexion** | Verbal self-critique in context | Session only | Soft (evaluator) |
| **Fine-tuning on failures** | Weight updates | Yes | Yes |
| **Constitutional AI** | Critique + revision in-loop | No | No |
| **ReAct** | Interleaved reasoning + action | No | No |
| **Tree of Thoughts** | Search over reasoning paths | No | No |

---

## Honest Assessment

Reflexion is a clever hack that gets real mileage from the fact that LLMs can critique their own outputs. The benchmark numbers are strong for a no-training approach. But calling it "reinforcement learning" is a stretch — there's no policy gradient, no generalization across tasks, and gains don't accumulate beyond the current context. It's better understood as **structured prompt engineering with memory**, which is still genuinely useful for agentic coding and reasoning tasks where you can run multiple attempts and have a clear success criterion.


## Related

- [Self-Improving Agent](../concepts/self-improving-agent.md) — implements (0.7)

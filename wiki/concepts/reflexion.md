---
entity_id: reflexion
type: approach
bucket: self-improving
sources:
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T05:25:53.522Z'
---
# Reflexion

## What It Is

Reflexion is a framework for improving LLM agent performance across trials without updating model weights. Instead of gradient-based learning, agents generate natural language critiques of their own failed trajectories, store these critiques in a memory buffer, and carry them into subsequent attempts. The core claim: linguistic feedback stored in episodic memory can substitute for weight updates in many trial-and-error settings.

Published by Noah Shinn, Federico Cassano, Edward Berman, Ashwin Gopinath, Karthik Narasimhan, and Shunyu Yao in 2023, later appearing in NeurIPS 36 (8634–8652). [Source](../../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

## How It Works

The architecture involves three LLM roles operating in sequence:

**Actor** — executes the task, producing a trajectory of actions and observations following the ReAct format (`Thought → Action → Observation`).

**Evaluator** — scores the trajectory. The signal can be binary (pass/fail), scalar, or free-form language. For coding tasks, this is a test suite. For decision-making tasks, it's a task completion signal.

**Self-Reflector** — receives the trajectory plus the evaluator's signal and generates a concise verbal summary of what went wrong and what should change. This summary is appended to an **episodic memory buffer**, capped at roughly 3 entries to avoid context overflow.

On the next trial, the Actor receives the reflection summaries prepended to its context before it acts. No fine-tuning occurs.

The evaluator also runs a **heuristic** to detect two failure modes mid-trajectory: (1) inefficient planning — the trajectory runs too long without progress, and (2) hallucination — the agent repeats the same action-observation sequence consecutively. Either triggers an early reset.

## What the Paper Reports

The headline benchmark: 91% pass@1 on HumanEval, compared to GPT-4's reported 80% at the time of publication (self-reported by the Reflexion authors, not independently validated against a fixed GPT-4 snapshot). On AlfWorld sequential decision-making tasks, Reflexion agents achieved ~130% relative improvement over baseline ReAct agents across environments. On HotpotQA reasoning, gains were more modest but consistent.

These numbers are **self-reported** in the paper. The HumanEval comparison depends on which GPT-4 checkpoint was used, and GPT-4 capabilities varied across the evaluation period. Take the absolute numbers as directional, not definitive.

## Where It Fits in the Agent Memory Taxonomy

Reflexion's memory is **declarative** rather than episodic in the strict sense — the reflections are LLM-generated summaries of trajectory data, not the raw trajectory itself. This distinction matters practically: raw trajectories would consume context proportional to trajectory length, making them unusable for long-horizon tasks. Summarized reflections compress failure signals into a few sentences. [Source](../../raw/articles/lil-log-llm-powered-autonomous-agents.md)

This places Reflexion between in-context learning (which uses no persistent state across trials) and fine-tuning (which requires gradient updates). It occupies a specific niche: **multi-trial improvement within a task instance or task class**, where you have repeated evaluation opportunities and the failure modes are expressible in language.

## Genuine Strengths

**No training infrastructure required.** Reflexion works with any LLM accessible via API. The improvement loop is prompt engineering plus memory management, nothing else.

**Feedback-type flexibility.** The evaluator can be a test harness, a human, another LLM, or an environment signal. The reflector's job is always the same — convert that signal into actionable text — so the framework generalizes across domains without architectural changes.

**Coding tasks fit well.** When the evaluator is a unit test suite, feedback is precise and unambiguous. The reflector has something concrete to diagnose. Performance gains on HumanEval are the strongest evidence for the approach.

**Sample efficiency relative to RL.** Traditional RL requires many episodes and policy gradient updates. Reflexion achieves meaningful improvement in 2–5 trials for many tasks, which matters when API calls are expensive.

## Critical Limitations

**Concrete failure mode — reflection quality degrades without verifiable feedback.** When the evaluator can only provide a binary "incorrect" signal on open-ended tasks (language reasoning, multi-hop QA), the self-reflector has no specific failure to diagnose. It generates plausible-sounding self-critique that may not target the actual error. The agent can then confidently repeat the same mistake on the next trial while carrying verbose but unhelpful reflections in context. This is documented in the paper's ablation studies: free-form evaluator feedback consistently outperforms binary signal on harder tasks.

**Unspoken infrastructure assumption — short tasks with clear termination.** Reflexion assumes the agent can complete a full trajectory, receive evaluation, reflect, and restart. This fits coding and short-horizon decision-making tasks. For long-horizon tasks where a single trajectory consumes most of the context window, there is no room left for reflection history. The approach quietly assumes task episodes are short enough that reflections plus task context fit within the model's context limit. This assumption is never stated explicitly in the paper but shapes where the method works.

**Memory capacity is fixed and small.** The paper uses a buffer of roughly 3 reflections. Older reflections are dropped as new ones arrive. There is no retrieval mechanism — all reflections are concatenated and fed verbatim. For tasks requiring many trials, early failures are forgotten.

**No cross-task learning.** Each task instance starts from scratch. Reflections from a failed coding problem don't inform a different coding problem, even if the failure mode was identical. This limits Reflexion to within-task improvement unless you build a separate retrieval layer on top.

## When Not to Use It

**Single-shot evaluation contexts.** If you get one attempt and the cost of failure is high, Reflexion adds no value. The framework only helps when multiple trials are possible and affordable.

**Tasks without reliable evaluators.** If you cannot programmatically or reliably assess whether the agent succeeded, the reflector has no signal to work from. Subjective or ambiguous success criteria produce self-critiques that are untethered from actual failure causes.

**Very long trajectories.** When a single task episode fills most of the context window, prepending reflection history causes truncation of the task itself. In these settings, external memory systems with retrieval (like MemGPT or mem-agent) are better fits. [Source](../../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

**Production systems requiring reproducibility.** Because Reflexion's improvement depends on sampling — the reflector generates a verbal critique via LLM inference — the same failure can produce different reflections across runs, leading to inconsistent behavior.

## Unresolved Questions

**How do you know when to stop?** The paper doesn't specify a principled stopping criterion. The agent either hits a fixed trial limit or passes the evaluator. There's no confidence estimation or convergence detection.

**Reflection quality vs. model capability.** Stronger models generate better reflections. The paper uses GPT-4 for the reflector in some experiments and weaker models in others, but the interaction between base model capability and reflection quality isn't systematically characterized.

**What happens when reflections conflict?** If trial 1 produces reflection A ("use a different data structure") and trial 3 produces reflection B ("use the original data structure but handle edge cases"), the agent carries both. The paper doesn't address how agents should reconcile contradictory self-advice.

**Generalization to reflector fine-tuning.** The Self-Reflector LLM in Reflexion is used zero-shot. Whether fine-tuning the reflector on task-specific failure patterns would substantially improve the loop is unexplored in the original work.

## Relationship to Adjacent Work

ReAct ([Yao et al. 2023](https://arxiv.org/abs/2210.03629)) provides the action-space format Reflexion builds on — interleaved reasoning traces and environment interactions. Reflexion adds the cross-trial memory layer on top.

Generative Agents (Park et al. 2023) use a similar reflection mechanism but for simulating believable human behavior rather than task improvement. Their reflections are higher-level inferences synthesized from 100 recent observations, generated proactively rather than triggered by failure.

Chain of Hindsight (Liu et al. 2023) is a fine-tuning approach that achieves similar goals — learning from past outputs — but requires gradient updates and labeled preference data. Reflexion trades off training cost for the limitation of fixed weights.

## Alternatives

**Use ReAct** when you have single-trial budgets or want in-trajectory reasoning without cross-trial memory overhead.

**Use fine-tuning or RLVR** when you have large volumes of verified trajectories and want improvements to persist across sessions without context overhead. The mem-agent approach (Tekparmak et al. 2025) shows what RLVR-trained memory management looks like in practice.

**Use RAG or vector-store memory** when you need cross-task knowledge transfer and the failure patterns are too diverse to fit in a small reflection buffer.

**Use MemGPT** when you need persistent, structured memory that survives across sessions and supports explicit read/write operations rather than append-only reflection buffers.

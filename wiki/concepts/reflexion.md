---
entity_id: reflexion
type: approach
bucket: self-improving
abstract: >-
  Reflexion enables LLM agents to improve through verbal self-reflection stored
  in episodic memory across retries, achieving 91% pass@1 on HumanEval vs
  GPT-4's 80% without any weight updates.
sources:
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - react
  - gpt-4
  - chain-of-thought
  - episodic-memory
  - letta
  - agent-memory
  - autogpt
  - task-decomposition
  - noahs-shinn
  - graphrag
last_compiled: '2026-04-07T11:41:09.483Z'
---
# Reflexion

**Type:** Approach — Self-Improving Agent Framework
**Created by:** Noah Shinn et al. (2023)
**Paper:** "Reflexion: Language Agents with Verbal Reinforcement Learning"

## What It Is

Reflexion replaces scalar reinforcement signals with natural language. Instead of gradient updates or fine-tuning, an agent attempts a task, receives structured feedback, writes a verbal analysis of what went wrong, stores that analysis in a bounded episodic memory buffer, and retries. The self-reflection accumulates across trials and conditions future attempts.

The core claim: agents can learn from failure through language alone, as long as the underlying model is capable enough to generate accurate self-analysis.

## Architecture

Three components form a closed loop:

**Actor (M_a):** An LLM generating actions or text, conditioned on current observations plus the contents of its memory buffer. Any generation strategy works — [Chain-of-Thought](../concepts/chain-of-thought.md), [ReAct](../concepts/react.md), or direct generation.

**Evaluator (M_e):** A task-specific scorer. For code, this is test execution. For sequential decision-making, it is an environment heuristic. For reasoning, it is exact-match grading. The evaluator produces the signal that triggers reflection.

**Self-Reflection Model (M_sr):** Takes the trajectory plus the evaluator's signal and generates a verbal post-mortem. Not "you scored 0.3" — but "you attempted to use the lamp before picking it up; check inventory before interacting with objects." Stored in an episodic buffer.

**Memory structure:**
- Short-term: The current trial's full trajectory
- Long-term: 1–3 self-reflection summaries from prior trials

At the start of each new attempt, the actor sees both its recent history and the distilled lessons from previous failures.

The loop: Act → Evaluate → Reflect → Store → Retry.

## How It Works in Practice

### Sequential Decision-Making

On AlfWorld (134 text-based household tasks), Reflexion completes 130/134 tasks within 12 trials. Baseline [ReAct](../concepts/react.md) agents hallucinate inventory state in 22% of cases — claiming to hold objects they have not picked up. Reflexion agents largely eliminate this through self-reflection that identifies the hallucination pattern and installs an explicit "verify inventory before use" heuristic.

### Code Generation

For programming tasks, the agent first generates its own unit tests, then writes code to pass them. Failed tests produce specific, actionable feedback for reflection.

On HumanEval Python (pass@1):
- GPT-4 baseline: 80.1%
- Reflexion: **91.0%**
- Prior state of the art (CodeT): 65.8%

This makes Reflexion's result independently meaningful — it exceeds the underlying model's baseline by 10.9 percentage points. The mechanism is verifiable: unit test execution is an objective evaluator, not self-reported.

On MBPP, Reflexion scores 77.1% versus GPT-4's 80.1% — a regression. The cause is a 16.3% false-positive rate in self-generated tests, where the agent submits incorrect code that passes its own tests.

### Reasoning (HotPotQA)

With ground-truth context provided:
| Configuration | Accuracy |
|---|---|
| CoT baseline | 61% |
| + Episodic memory only | 63% |
| + Self-reflection (Reflexion) | 75% |

The 12-point gap between episodic memory and self-reflection is the paper's most important quantitative result. Remembering that you failed adds 2 points. Understanding *why* you failed adds 12. Reflection quality is the binding constraint, not memory quantity.

## Critical Design Details

**The ablation that defines the framework:** On HumanEval Rust (hardest 50 problems), self-reflection without test feedback scores 52% — *worse* than the 60% baseline. Reflection without a reliable evaluation signal makes performance worse by generating confident but incorrect self-diagnosis. The evaluator quality gates everything downstream. Build your evaluator before building your reflector.

**Model capability dependency:** On StarChat-beta, Reflexion produces zero improvement (0.26 → 0.26). The framework is an emergent capability of sufficiently strong models. As of 2023, this meant GPT-3.5 class minimum. Weaker models cannot generate accurate enough self-analysis to make reflection useful.

**Memory is a sliding window, not an accumulator:** The buffer holds 1–3 reflections. Earlier lessons drop off. For tasks that require accumulating many distinct insights over time, this ceiling becomes a hard limit.

## Failure Modes

**WebShop: complete failure.** No improvement across 4 trials. The agent cannot diagnose why searches return irrelevant results, so it cannot write useful reflections. Reflexion assumes the agent can identify the proximate cause of its failure. When failure stems from ambiguity in search strategy rather than a specific actionable mistake, reflection generates noise. The framework is a refinement mechanism, not an exploration mechanism.

**False-positive tests cause confident wrong submissions.** When self-generated tests pass on incorrect code (as on MBPP), the agent submits the wrong answer with high confidence. There is no internal recovery path — the reflection loop only fires on failure, so successful-but-wrong passes the quality gate silently.

**Reflection without reliable evaluation is actively harmful.** This is not a theoretical concern — the ablation demonstrates -8 percentage points. Any deployment that uses Reflexion must have an evaluator it trusts before adding reflection.

## Unspoken Infrastructure Assumptions

**You have a reliable automated evaluator.** Reflexion is a framework in search of a feedback signal. In code, you have test execution. In formal reasoning, you have answer checking. For open-ended domains (writing, strategic planning, customer service), automated evaluation is hard to build and easy to game. The framework does not provide one.

**The task has a stable ground truth.** Reflexion's evaluation assumes the correct answer does not shift between trials. In tasks with stochastic environments, adversarial conditions, or subjective success criteria, the reflection loop generates contradictory training signal.

## When NOT to Use Reflexion

**Tasks requiring exploration, not refinement.** If your agent fails because it has not tried the right approach (requires diversity in strategies), Reflexion will not help. It requires the agent to be in the right vicinity of the correct approach and failing for diagnosable reasons.

**Low-capability base models.** If your model cannot accurately analyze its own trajectory, adding a reflection step wastes tokens and risks making things worse.

**Single-attempt cost-sensitive contexts.** Reflexion is a multi-trial framework. Its gains come from several iterations. If your deployment cannot afford multiple LLM calls per task, the architecture is structurally incompatible.

**Domains where evaluator quality is low.** MBPP's false-positive rate produces worse-than-baseline results. If you cannot trust your evaluator, do not add reflection.

## Relationships to Related Work

Reflexion extends [Chain-of-Thought](../concepts/chain-of-thought.md) by adding a feedback-conditioned refinement loop. Where CoT improves single-pass reasoning, Reflexion improves multi-attempt learning.

[ReAct](../concepts/react.md) and Reflexion are complementary. ReAct structures how an agent acts (interleaved reasoning and action). Reflexion structures how an agent learns from failed actions. The paper tests ReAct-based actors inside the Reflexion loop.

[Voyager](../projects/voyager.md)'s self-verification critic is architecturally identical to Reflexion's evaluator-plus-reflection step — the critic assesses completion and provides improvement suggestions before a skill is committed to the library. The difference is scope: Voyager's reflection gates skill acquisition; Reflexion's reflection enables task-level learning.

The [Darwin Gödel Machine](../projects/darwin-godel-machine.md) extends Reflexion's core pattern: agents analyze their own failure logs to propose modifications. The DGM applies this at the architecture level (modifying agent code) rather than the task level (modifying next-attempt strategy).

[Zep](../projects/zep.md) explicitly cites Reflexion's technique in its entity extraction pipeline, using a reflection step to minimize hallucinations in extracted facts before committing them to the knowledge graph.

Reflexion implements [Episodic Memory](../concepts/episodic-memory.md) in its simplest viable form: a bounded sliding window of verbal summaries. More sophisticated [Agent Memory](../concepts/agent-memory.md) systems (Zep, Letta, MemoryBank) address Reflexion's core limitation by replacing the in-context buffer with persistent external stores.

## Unresolved Questions

**Optimal reflection prompt design.** The paper uses a single reflection prompt template. Whether different prompt structures produce meaningfully different self-analysis quality across domains is not studied.

**Multi-agent reflection.** When agents collaborate, whose failure gets reflected and by whom? The framework assumes a single-agent loop. Multi-agent settings introduce attribution problems.

**Long-horizon knowledge accumulation.** The authors identify external memory stores as future work, but the specific interface between Reflexion-style self-reflection and persistent knowledge bases (knowledge graphs, vector stores) has no established design pattern.

**Evaluation cost vs. reflection quality tradeoff.** The paper uses exact evaluation signals (test execution, exact match). For softer evaluators like [LLM-as-Judge](../concepts/llm-as-judge.md), the reliability threshold below which reflection becomes harmful is unknown.

## Alternatives

**Use [ReAct](../concepts/react.md) when** you need structured reasoning over tool calls on a single attempt. ReAct adds no per-attempt overhead.

**Use [Voyager](../projects/voyager.md)'s skill library pattern when** the goal is accumulating reusable capabilities across many tasks rather than improving on one task across retries.

**Use [DSPy](../projects/dspy.md) when** the failure is in prompt structure rather than agent strategy — DSPy optimizes prompt programs via automated compilation rather than verbal self-analysis.

**Use Reflexion when** you have reliable automated evaluation, a capable base model, budget for 3–5 trials per task, and tasks where failure is diagnosable from trajectory inspection.

## Key Numbers (Credibility Assessment)

| Metric | Value | Assessment |
|---|---|---|
| HumanEval Python pass@1 | 91.0% | Verifiable — unit test execution is objective |
| HumanEval vs GPT-4 delta | +10.9pp | Self-reported but mechanistically plausible |
| AlfWorld completion | 130/134 tasks | Self-reported, no independent replication cited |
| HotPotQA reflection vs memory delta | +12pp | Self-reported; the mechanism is well-motivated |
| MBPP regression | -3.0pp | Honest negative result, increases credibility |

The HumanEval result is the most credible single figure because it uses objective evaluation (code execution) and surpasses the base model (GPT-4) by a meaningful margin. The AlfWorld and HotPotQA results are plausible but rely on self-reported benchmark implementations.

## Sources

[Reflexion paper (deep)](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)
[Voyager paper (deep)](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)
[Darwin Gödel Machine paper (deep)](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)
[Context Engineering survey (deep)](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)


## Related

- [ReAct](../concepts/react.md) — alternative_to (0.6)
- [GPT-4](../projects/gpt-4.md) — part_of (0.6)
- [Chain-of-Thought](../concepts/chain-of-thought.md) — extends (0.6)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.7)
- [Letta](../projects/letta.md) — part_of (0.4)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.7)
- [AutoGPT](../projects/autogpt.md) — competes_with (0.4)
- [Task Decomposition](../concepts/task-decomposition.md) — part_of (0.5)
- Noah Shinn — created_by (0.9)
- [GraphRAG](../concepts/graphrag.md) — part_of (0.3)

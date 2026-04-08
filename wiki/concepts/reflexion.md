---
entity_id: reflexion
type: approach
bucket: self-improving
abstract: >-
  Reflexion enables LLM agents to improve across trials via verbal
  self-reflection stored in episodic memory, achieving 91% on HumanEval without
  weight updates through a three-component loop: actor, evaluator,
  self-reflection.
sources:
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - react
  - episodic-memory
  - gpt-4
  - gpt-4
last_compiled: '2026-04-08T02:43:56.333Z'
---
# Reflexion

## What It Is

Reflexion is a framework for improving LLM agent performance through verbal reinforcement rather than gradient updates. Instead of adjusting model weights after failure, the agent generates natural language analysis of what went wrong and stores it in a bounded episodic memory buffer. On the next attempt, the actor conditions its behavior on both the current trajectory and those stored reflections.

The core bet: a capable LLM can diagnose its own failures well enough that structured verbal feedback outperforms simple retry. The HotPotQA ablation validates this cleanly -- episodic memory alone (remembering that you failed) adds 2%, while self-reflection on top adds 14%. The 12-point gap between "remembering failure" and "analyzing failure" is Reflexion's central empirical finding.

[Source: Reflexion paper](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

## Architecture

Three components form a loop:

**Actor (M_a):** An LLM generating actions conditioned on current state and memory. Can use any prompting strategy: [Chain-of-Thought](../concepts/chain-of-thought.md), [ReAct](../concepts/react.md), or direct generation.

**Evaluator (M_e):** Produces feedback from task-specific signals. Exact match for QA, code execution results for programming, heuristic functions for environments like AlfWorld. The evaluator's reliability is the binding constraint on the entire system.

**Self-Reflection Model (M_sr):** Takes the failed trajectory plus the evaluator's signal and generates a verbal summary: what went wrong, what to try differently. These summaries accumulate in a bounded long-term memory buffer (1-3 entries).

Memory operates at two levels:
- **Short-term:** The current trial's trajectory (observations, actions, outputs)
- **Long-term:** A sliding window of self-reflection summaries from prior trials

At inference time the actor sees both. Short-term memory provides fine-grained recent context; long-term memory provides distilled lessons from past failures.

## How the Loop Runs

1. Actor attempts the task, producing trajectory τ_t
2. Evaluator scores τ_t, generating reward r_t
3. Self-reflection model analyzes (τ_t, r_t), produces verbal summary sr_t
4. sr_t is appended to the episodic memory buffer
5. Actor retries, now conditioned on prior reflections
6. Repeat until success or trial limit

For code generation, there's a refinement: the agent generates its own unit tests before writing the solution. Test failures become the evaluation signal. This enables label-free learning, though HumanEval's 1.4% false-positive rate vs MBPP's 16.3% explains why Reflexion helps on the former and regresses on the latter.

## Benchmarks

All results are self-reported by the authors.

**Programming:**

| Benchmark | Reflexion | GPT-4 Baseline | Delta |
|-----------|-----------|----------------|-------|
| HumanEval Python pass@1 | 91.0% | 80.1% | +10.9pp |
| HumanEval Rust (50 hardest) | 68.0% | 60.0% | +8.0pp |
| MBPP Python pass@1 | 77.1% | 80.1% | -3.0pp |
| LeetcodeHardGym Python | 15.0% | 7.5% | +7.5pp |

**Sequential Decision-Making (AlfWorld):**
- Reflexion completes 130/134 tasks (97%) within 12 trials
- Baseline hallucination rate (agent falsely believes it holds items): 22%
- Reflexion eliminates most hallucination cases through reflection on failed trajectories

**Reasoning (HotPotQA ablation):**

| Configuration | Accuracy |
|---------------|----------|
| CoT baseline | 61% |
| + Episodic memory only | 63% |
| + Self-reflection (Reflexion) | 75% |

**Programming ablation (HumanEval Rust, 50 hardest):**

| Tests | Self-Reflection | Pass@1 |
|-------|-----------------|--------|
| No | No | 60% |
| No | Yes | 52% |
| Yes | No | 60% |
| Yes | Yes | 68% |

The -8pp result (self-reflection without tests) is important: unreliable evaluation plus reflection is worse than no reflection. The agent confidently misdiagnoses its failures.

## What It Does Well

**Label-free code improvement.** Self-generated unit tests let the agent run its own evaluation loop without human labeling. This is practical for any programming task where test execution is cheap.

**Hallucination reduction in sequential tasks.** AlfWorld's 22% hallucination rate (agent believes it possesses items it doesn't hold) drops dramatically because reflection distills the failure pattern explicitly: "you attempted to use the lamp before picking it up."

**Interpretability.** The agent's learning process is human-readable. You can inspect the reflection buffer and understand exactly what the agent believes it learned from each failure.

**No fine-tuning.** The entire framework runs via black-box API calls. Deploying it requires no model access beyond standard inference.

## Critical Limitations

**Model capability dependency.** Reflexion is not a universal improvement. StarChat-beta shows 0.26 before and 0.26 after -- zero gain. Verbal self-reflection requires a model capable of generating accurate self-diagnosis. As of the paper's publication this meant GPT-3.5+ class models. Weaker models generate confident but incorrect reflections, which makes performance worse, not better.

**The exploration failure.** Reflexion completely fails on WebShop -- no improvement across four trials. The reason: WebShop requires creative search query diversity to find relevant products. Reflexion is a refinement mechanism, not an exploration mechanism. When the agent's problem is "I haven't tried the right approach" rather than "I made mistakes in the right approach," self-reflection cannot help. The agent cannot diagnose why semantically different search queries return irrelevant results.

**Bounded memory loses long-horizon lessons.** The 1-3 reflection sliding window forgets earlier trials. For any task requiring accumulation of many distinct insights over many failures, the fixed buffer becomes a bottleneck. The paper acknowledges this limitation and defers external memory integration to future work.

**False positives in self-generated tests corrupt the loop.** When tests pass on incorrect code (16.3% on MBPP), the agent submits wrong answers with high confidence. There's no recovery mechanism within the framework.

## Infrastructure Assumptions

**Reliable automated evaluation exists for your domain.** Reflexion's performance degrades sharply when the evaluator produces noisy signals. For code, execution is deterministic. For web tasks, success is often ambiguous. For open-ended generation, you need either exact-match grounding or a robust [LLM-as-Judge](../concepts/llm-as-judge.md) setup. Building the evaluator is often the hardest part of deploying this pattern.

**Short-horizon tasks within a session.** The architecture assumes you can run multiple trials within a bounded context. Long-running tasks (multi-day, multi-session) break the sliding window memory model. The bounded buffer was a context window constraint in 2023; with larger windows today it's a design choice, but the framework provides no guidance on scaling reflection storage.

## When Not to Use Reflexion

**Tasks requiring exploration over refinement.** If the agent is failing because it hasn't tried diverse strategies (search, creative generation, open-ended planning), reflection on failure cannot help. Use diversity-promoting sampling or explicit exploration strategies instead.

**Domains without reliable automated evaluation.** If you cannot automatically verify whether the agent succeeded, the reflection loop produces noise. Running Reflexion with a noisy evaluator is worse than not running it.

**Weak foundation models.** Below GPT-3.5 class capability, self-reflection generates incorrect analysis that degrades performance. The framework amplifies capability -- it doesn't create it.

**High-stakes single-shot requirements.** Reflexion is a multi-trial learning mechanism. If the deployment context permits only one attempt (real-world actions, irreversible operations), the retry loop doesn't apply. Combine with [Human-in-the-Loop](../concepts/human-in-the-loop.md) verification instead.

## Unresolved Questions

**No convergence guarantees.** The paper provides no formal analysis of when the agent converges to a correct solution vs. a confident local minimum. The WebShop failure suggests local minima are common when the reflection signal is misaligned with what's actually needed.

**Optimal memory buffer size.** Why 1-3 reflections? The paper doesn't ablate this. Larger context windows now available could accommodate far more reflection history, but the optimal policy for which reflections to retain is unspecified.

**Reflection quality without ground truth.** In most experiments, the evaluator has access to ground truth (the test suite passes or fails definitively). In open-ended domains, reflection quality depends on the LLM's self-assessment accuracy, which degrades for tasks far from training distribution.

**Cost at scale.** Each retry requires at least two additional LLM calls (evaluation, reflection). For production systems running thousands of tasks, the cost multiplier matters. The paper doesn't analyze this.

## Relationship to [Episodic Memory](../concepts/episodic-memory.md)

Reflexion implements episodic memory in the most direct sense: the agent stores records of specific past attempts (the what) enriched with verbal analysis (the why). The HotPotQA ablation makes explicit what episodic memory contributes on its own (2%) versus what the reflection analysis adds on top (12%). This is the cleanest empirical decomposition of episodic memory's value in the agent self-improvement literature.

The bounded buffer is a compressed episodic store -- not raw trajectories but distilled summaries. This trades fidelity for token efficiency, which was a practical constraint in 2023 and remains a design choice worth revisiting with modern context lengths.

## Influence on the Field

Reflexion established verbal self-reflection as a standard building block. Several subsequent systems implement the same pattern:

- **Zep's entity extraction** uses a "reflection technique inspired by Reflexion" to validate extractions before committing them to the knowledge graph
- **Voyager's** self-verification critic mirrors the evaluator component, and its skill refinement loop follows the same actor-evaluate-reflect structure
- **Darwin Gödel Machine's** self-analysis of benchmark failure logs is architecturally identical to Reflexion's reflection step, applied to agent code rather than task trajectories
- **ACE** implements a reflector component following the same pattern

The three-component loop (actor, evaluator, self-reflection) has become a reference architecture for [Self-Improving Agents](../concepts/self-improving-agents.md).

## Alternatives

**[ReAct](../concepts/react.md):** Use when you need interleaved reasoning and action without multi-trial learning. ReAct is a single-pass approach; Reflexion wraps around it to enable trial-by-trial improvement.

**[DSPy](../projects/dspy.md):** Use when you can formalize the improvement objective and want automated prompt optimization across a dataset rather than per-instance trial-and-error learning.

**[Voyager](../projects/voyager.md)'s skill library pattern:** Use when the goal is accumulating reusable capabilities across many distinct tasks rather than improving on a single task through reflection.

**[Darwin Gödel Machine](../projects/darwin-godel-machine.md):** Use when the agent's code itself should be modified and the improvement target is population-level performance across benchmarks, not single-task success.

**Fine-tuning on failure cases:** Use when you have high failure volume, reliable labels, and the resources to retrain. Reflexion trades training cost for inference cost -- if inference cost accumulates enough across retries, fine-tuning becomes the better option.


## Related

- [ReAct](../concepts/react.md) — alternative_to (0.7)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.8)
- [GPT-4](../projects/gpt-4.md) — implements (0.7)
- [GPT-4](../projects/gpt-4.md) — implements (0.7)

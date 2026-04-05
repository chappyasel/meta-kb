---
entity_id: reflexion
type: approach
bucket: self-improving
abstract: >-
  Reflexion is a framework for improving LLM agent performance across trials
  using verbal self-reflection stored in episodic memory, achieving 91% pass@1
  on HumanEval vs GPT-4's 80% without any weight updates.
sources:
  - tweets/theturingpost-9-open-agents-that-can-improve-themselves-a-colle.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Episodic Memory
  - ReAct
  - GPT-4
  - Letta
  - Self-Improving Agents
last_compiled: '2026-04-05T20:26:22.368Z'
---
# Reflexion

## What It Is

Reflexion lets LLM agents learn from failure without fine-tuning. After each failed attempt, the agent generates a verbal critique of what went wrong, stores that critique in a short episodic memory buffer, and uses it to condition the next attempt. The result: meaningful performance gains within 3-5 trials on coding, reasoning, and decision-making tasks.

The core insight is that verbal feedback carries far more information than scalar reward signals. Traditional reinforcement learning tells an agent it scored 0.3. Reflexion tells the agent "you attempted to use the lamp before picking it up — check inventory before use actions." That specificity is what drives improvement.

## Architecture

Three components form the loop:

**Actor (M_a):** An LLM generating text or actions conditioned on the current trajectory plus reflective memory. The actor can use any generation strategy — Chain-of-Thought, [ReAct](../concepts/react.md), or direct generation.

**Evaluator (M_e):** Assesses actor outputs through task-specific signals. For reasoning: exact match grading. For decision-making: heuristic environment functions. For code: test execution results. The evaluator produces the reward signal that feeds into reflection.

**Self-Reflection Model (M_sr):** Takes the trajectory and reward, produces a verbal analysis of what failed and what to try differently. This reflection is stored in a bounded episodic memory buffer, typically 1-3 entries.

Memory has two tiers:
- **Short-term:** The current trial's trajectory (observations, actions, results)
- **Long-term:** A sliding window of 1-3 self-reflection summaries from prior trials

At inference time, the actor reads both tiers. The analogy the authors use: fine-grained recent details in short-term, distilled lessons from past failures in long-term.

## The Verbal Reinforcement Loop

Each trial follows this sequence:

1. Actor generates trajectory τ_t for the current task
2. Evaluator produces reward r_t = M_e(τ_t)
3. Self-reflection model analyzes {τ_t, r_t}, produces summary sr_t
4. sr_t appends to long-term episodic memory
5. Actor retries, now conditioned on prior reflections
6. Loop continues until success or trial limit

For code generation, the loop adds a self-test generation phase before the main attempt. The agent writes its own unit tests, then writes code to pass them. Test failures give specific, actionable feedback — which line broke, which case failed — that reflection can convert into directed improvement. This requires no human-labeled tests.

## What the Numbers Show

### HumanEval (pass@1)

| System | Score |
|--------|-------|
| GPT-4 baseline | 80.1% |
| Reflexion | **91.0%** |
| Prior SOTA (CodeT) | 65.8% |

Self-reported. The 91% figure is consistently cited but comes from the original paper's experiments.

### AlfWorld (sequential decision-making)

Reflexion completes 130/134 tasks (97%) within 12 trials. The baseline agent (ReAct alone) hallucinates item possession 22% of the time — believing it holds objects it does not. Reflexion nearly eliminates this through trajectory-based self-analysis.

### HotPotQA (reasoning, 100 questions, CoT with ground-truth context)

| Configuration | Accuracy |
|---------------|----------|
| CoT baseline | 61% |
| + Episodic memory only | 63% |
| + Self-reflection (Reflexion) | **75%** |

The 12-point gap between episodic memory and self-reflection is the paper's most important finding. Remembering that you failed adds 2 points. Analyzing *why* you failed adds 12 more. Reflection quality dominates memory quantity.

### MBPP regression

Reflexion scores **77.1%** vs GPT-4's **80.1%** on MBPP Python. Self-generated tests have a 16.3% false-positive rate on this benchmark — the agent submits wrong code after passing its own flawed tests. HumanEval has 1.4% false positives, explaining why Reflexion helps there but hurts here.

## Critical Ablation: Tests + Reflection Must Co-occur

On HumanEval Rust (50 hardest problems):

| Test Generation | Self-Reflection | Pass@1 |
|-----------------|-----------------|--------|
| No | No | 60% |
| No | Yes | **52%** |
| Yes | No | 60% |
| Yes | Yes | **68%** |

Self-reflection without reliable test feedback *hurts* performance by 8 points. The agent generates confident but wrong analysis of its failures. Tests alone provide no benefit. Both together deliver the full +8 point gain. If your evaluation signal is unreliable, adding reflection makes things worse.

## Failure Modes

**WebShop (local minima):** Reflexion shows zero improvement across 4 trials on WebShop. The task requires creative exploration of search query strategies rather than corrective refinement of a known approach. The agent cannot diagnose why its searches return irrelevant results, so its reflections provide no useful direction. Tasks requiring exploration rather than correction are outside Reflexion's scope.

**Model capability floor:** StarChat-beta gains nothing from Reflexion (0.26 → 0.26). The framework is an emergent property of sufficiently capable models. As of the paper, GPT-3.5+ class models are required. This is not a universal improvement technique.

**Bounded memory:** The 1-3 reflection sliding window means the agent forgets lessons from earlier trials. For tasks requiring accumulation of many distinct insights across long horizons, the fixed buffer becomes a bottleneck. The authors flag external memory systems as future work.

**No convergence guarantee:** The agent can converge to a non-optimal local minimum, particularly when reflection cannot diagnose root causes. The paper provides no formal analysis.

## Infrastructure Assumption Worth Naming

Reflexion assumes you have a reliable automated evaluator for your domain. Code execution is a natural fit. For most other domains — form completion, research tasks, customer support interactions — building that evaluator is non-trivial. The technique's apparent simplicity (just ask the model why it failed) obscures this dependency. Without reliable evaluation, reflection degrades performance.

## When Not to Use Reflexion

- Tasks requiring diverse exploration strategies rather than iterative refinement of a known approach (see WebShop)
- Domains where you cannot build a reliable automated evaluator
- Deployments where latency per task matters — each trial adds at least one extra LLM call for reflection generation
- Workflows where each attempt has significant real-world side effects (you cannot "retry" an email sent or a database row deleted)
- Systems built on models below GPT-3.5 capability class

## Unresolved Questions

The paper does not address:
- **Cost accounting at scale.** Each failed trial adds an extra reflection LLM call. For agents operating on thousands of tasks, aggregate costs are unstated.
- **Reflection quality degradation.** Does reflection quality hold as the memory buffer fills with similar failed attempts? The paper does not test whether 3 reflections performs meaningfully better than 1.
- **Interaction with long-horizon memory.** The paper treats Reflexion's episodic buffer as the full memory story. How reflection integrates with persistent cross-session memory systems (like [Zep's temporal knowledge graph](../projects/zep.md)) is left open.
- **Multi-agent reflection.** When multiple agents collaborate on a task, whose reflections go into which buffer? The paper's architecture assumes a single actor.

## Relationship to Other Self-Improvement Patterns

Reflexion established verbal self-reflection as a standard technique. The pattern appears throughout subsequent work:

- The [Darwin Godel Machine](../projects/darwin-godel-machine.md) uses self-analysis of benchmark logs as its mutation operator — architecturally identical to Reflexion's self-reflection model, applied to an agent's own code rather than its task trajectories
- Voyager's self-verification critic implements the evaluator component for the specific case of Minecraft skill acquisition
- Zep's entity extraction pipeline uses "a reflection technique inspired by Reflexion" to reduce hallucinations during knowledge graph construction
- Letta's memory management architecture treats each conversation as a trial with reflection-driven memory updates

Reflexion is best understood as defining the actor-evaluator-self-reflection loop that more complex self-improvement systems build on top of.

## Alternatives

**Use [ReAct](../concepts/react.md) alone** when you have single-shot budget constraints or when the task is simple enough that interleaved reasoning and action suffices without multi-trial learning.

**Use [Voyager](../projects/voyager.md)'s skill library pattern** when the goal is accumulating reusable capabilities across many distinct tasks rather than improving performance on one repeated task class.

**Use the [Darwin Godel Machine](../projects/darwin-godel-machine.md)** when you need recursive self-improvement at the agent architecture level rather than task-level performance improvement. DGM modifies agent code; Reflexion improves task execution within a fixed agent.

**Use [Self-Improving Agents](../concepts/self-improving-agents.md) with fine-tuning** when you have labeled data, compute budget for weight updates, and need improvements that persist beyond the context window's reflection buffer.


## Related

- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.6)
- [ReAct](../concepts/react.md) — implements (0.6)
- [GPT-4](../projects/gpt-4.md) — implements (0.6)
- [Letta](../projects/letta.md) — implements (0.5)
- [Self-Improving Agents](../concepts/self-improving-agents.md) — implements (0.7)

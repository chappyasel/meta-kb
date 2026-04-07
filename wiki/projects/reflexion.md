---
entity_id: reflexion
type: project
bucket: self-improving
abstract: >-
  Reflexion is a framework where LLM agents improve through verbal
  self-reflection stored in episodic memory, achieving 91% pass@1 on HumanEval
  (vs GPT-4's 80%) without any weight updates.
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
  - autogpt
  - chain-of-thought
  - episodic-memory
  - graphrag
  - letta
  - reflexive-memory
last_compiled: '2026-04-07T00:46:33.200Z'
---
# Reflexion

## What It Is

Reflexion is a framework from Shinn et al. (2023) that lets LLM agents learn from failure by generating verbal self-analyses and storing them in a short-term episodic memory buffer. Each retry begins with the agent reading its own post-mortems from prior attempts. The key claim: free-form language captures more diagnostic information than a scalar reward signal, so agents improve faster without any model fine-tuning.

The paper sits at the intersection of [Reinforcement Learning](../concepts/reinforcement-learning.md) and [Episodic Memory](../concepts/episodic-memory.md), replacing gradient-based policy updates with what the authors call "verbal reinforcement." The agent's weights never change. Its behavior changes because its context does.

[Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

## Architecture

Three components interact in a loop:

**Actor (M_a):** An LLM generating text or actions. Can use [Chain-of-Thought](../concepts/chain-of-thought.md), [ReAct](../concepts/react.md), or direct generation. The actor reads both the current trajectory and the episodic memory buffer before each action.

**Evaluator (M_e):** Task-specific signal. For code: execution results. For reasoning: exact match. For decision-making: heuristic functions. There is no general evaluator — you must provide one appropriate to your domain.

**Self-Reflection Model (M_sr):** Takes the current trajectory plus the evaluator's reward signal and generates a verbal summary of what went wrong and what to change. This summary gets appended to the episodic memory buffer.

**Memory tiers:**
- *Short-term:* The current trial's full trajectory
- *Long-term:* A bounded buffer of 1–3 self-reflection summaries from prior trials

At inference time, the actor conditions on both. The authors describe this as analogous to remembering recent details in full while carrying distilled lessons from earlier experiences.

## The Core Loop

1. Actor attempts the task, producing trajectory τ_t  
2. Evaluator scores τ_t, returning reward r_t  
3. Self-reflection model receives {τ_t, r_t} and produces verbal summary sr_t  
4. sr_t appended to episodic memory  
5. Actor retries with updated context  
6. Repeat until success or trial limit reached

The mechanism is architecturally trivial. Its power comes from the quality of the self-reflection: if the model can accurately diagnose why it failed, subsequent attempts improve; if it cannot, repeated reflection degrades performance.

## Key Results

### Programming (HumanEval)

| Configuration | Pass@1 |
|---|---|
| GPT-4 baseline | 80.1% |
| Reflexion (Python) | **91.0%** |
| Reflexion (Rust, 50 hardest) | 68.0% vs 60.0% baseline |

The 91% result is self-reported in the original paper, not independently validated by a third party.

### Decision-Making (AlfWorld)

Reflexion completes 130/134 tasks (97%) within 12 trials. Baseline (ReAct only) hallucinates held items roughly 22% of the time. Reflexion's self-reflection on failed trajectories nearly eliminates this. Learning is front-loaded — the largest gain appears between trials 1 and 2.

### Reasoning (HotPotQA, 100 questions, ground-truth context)

| Configuration | Accuracy |
|---|---|
| CoT baseline | 61% |
| + Episodic memory only | 63% |
| + Reflexion (full) | **75%** |

The 12-point gap between episodic memory alone and Reflexion is the paper's most important finding. Remembering you failed is worth 2 points. Analyzing *why* you failed is worth 14.

### MBPP Regression

Reflexion scores 77.1% on MBPP Python vs 80.1% for GPT-4. The cause is self-generated test false positives: 16.3% of self-generated tests pass on incorrect code, causing the agent to submit wrong answers confidently. This is a concrete failure mode, not a footnote.

## Critical Ablation

The programming ablation (HumanEval Rust, 50 hardest problems) isolates the interaction effects:

| Tests | Reflection | Pass@1 |
|---|---|---|
| No | No | 60% |
| No | Yes | **52%** (worse) |
| Yes | No | 60% |
| Yes | Yes | **68%** |

Reflection without reliable evaluation actively hurts. The self-reflection model generates confident but wrong diagnoses when it has no concrete execution feedback to anchor on. Both components are required for improvement.

## Strengths

**No weight updates required.** Reflexion runs entirely at inference time using API calls. This makes it deployable against any LLM without access to training infrastructure.

**Self-generated unit tests enable label-free learning.** For code generation tasks, the agent generates its own evaluation criterion. Combined with execution feedback, this creates a closed improvement loop with no human annotation.

**Failure analysis transfers.** The verbal reflection summaries are human-readable, so engineers can inspect what the agent learned and why. This interpretability distinguishes Reflexion from RL approaches where policy changes are opaque.

**Established pattern.** Reflexion's loop — actor, evaluator, reflection, memory — has become a standard building block. Zep's entity extraction uses a reflection technique directly inspired by this paper. The [Darwin Gödel Machine](../projects/darwin-godel-machine.md)'s self-analysis of failure logs is architecturally identical. [Voyager](../projects/voyager.md)'s self-verification critic follows the same structure.

## Limitations

**Model capability floor.** Reflexion is an emergent capability. On StarChat-beta, it produces zero improvement. Weaker models cannot generate the quality of self-analysis required for the loop to work. As of the paper's writing, GPT-3.5 or better was the practical minimum.

**Bounded memory (1–3 reflections).** The sliding window means the agent forgets early lessons once it exceeds the buffer. For tasks requiring accumulation of many distinct insights across many trials, this is a hard ceiling. The authors identify integration with external memory systems as future work.

**WebShop failure (local minima).** Reflexion shows no improvement on WebShop after four trials. The task requires creative exploration — generating diverse search queries to find products matching a description — not iterative refinement of a known approach. Reflexion cannot diagnose "I should have tried different queries" because it cannot enumerate the space of alternatives. Tasks requiring exploration rather than correction are outside the framework's scope.

**False positive vulnerability.** The 16.3% false-positive rate on MBPP self-generated tests is not an edge case — it causes measurable regression. There is no in-framework mechanism to detect when self-generated tests are incorrect.

**Concrete failure mode:** An agent tasked with generating a Python function that handles a tricky edge case generates a test suite that accidentally doesn't cover that edge case. Its implementation fails on the actual grader but passes its own tests. It submits confidently after trial 1, never triggering reflection. The problem looks solved from inside the loop.

**Unspoken infrastructure assumption:** Reflexion assumes evaluation turnaround is fast and cheap. For code generation, this holds — Python executes in milliseconds. For tasks where evaluation requires human review, API calls, or long-running processes, the iterative loop becomes expensive and slow.

## When Not to Use Reflexion

**Tasks requiring diverse exploration.** If the right approach is unknown and needs to be discovered through variety, Reflexion's refinement loop narrows rather than broadens the search space.

**Unreliable or expensive evaluation.** Without concrete feedback anchoring the reflection, the agent generates plausible-sounding but incorrect diagnoses. If your evaluator is an LLM judge rather than ground-truth execution, expect degraded performance.

**High-stakes single-shot contexts.** Reflexion assumes you can afford multiple trials. In production systems where each attempt has real-world consequences (sending emails, executing transactions, modifying databases), the retry loop needs external safeguards before Reflexion's mechanism provides value.

**Weak base models.** If your deployment model cannot generate coherent self-criticism, the framework provides nothing. Test this explicitly before building around it.

## Unresolved Questions

**Long-horizon memory.** The paper identifies external memory stores as future work but provides no architecture for this. How do you index, retrieve, and apply self-reflections accumulated across hundreds of tasks rather than three? This gap is real in production deployments.

**Reflection quality assessment.** The framework has no mechanism to evaluate whether a self-reflection is accurate. A confidently wrong diagnosis is indistinguishable from a correct one inside the loop. How would you detect and correct systematically incorrect reflection patterns?

**Computational cost at scale.** Each trial requires multiple LLM calls. For agents running thousands of tasks, the marginal cost of reflection (one additional call per trial, multiplied by average trial count) accumulates. The paper provides no cost analysis.

**Reflexion vs. longer context.** Given that current models support 128K–1M token contexts, it's unclear whether the benefit of structured self-reflection persists when you can simply keep the full prior trajectory in context. The paper predates models with these context lengths, and no direct comparison exists.

## Alternatives

**[ReAct](../concepts/react.md):** Reflexion extends ReAct by adding the evaluation and reflection steps. Use ReAct when you want interleaved reasoning and action without multi-trial loops.

**[AutoGPT](../projects/autogpt.md):** Longer-horizon autonomous execution with task decomposition. Use AutoGPT when tasks require sustained multi-step execution rather than iterative refinement of a single attempt.

**[DSPy](../projects/dspy.md):** Systematic prompt optimization through compiled examples rather than verbal reflection. Use DSPy when you want reproducible, testable prompt improvement rather than runtime self-correction.

**[Letta](../projects/letta.md):** Production memory architecture with persistent agent state. Use Letta when you need multi-session memory that persists beyond the 1–3 reflection buffer Reflexion provides.

**[Voyager](../projects/voyager.md):** Skills accumulated as executable code in a library rather than verbal reflections in a buffer. Use Voyager when the goal is building reusable, composable capabilities rather than refining a specific task.

For [Self-Improving Agent](../concepts/self-improving-agent.md) systems that need to compound capability across tasks rather than improve on a single task through retries, Reflexion's bounded episodic memory is the bottleneck. Combine it with a persistent memory layer like [Zep](../projects/zep.md) or structured skill accumulation like Voyager's library pattern to extend its reach beyond what the paper demonstrates.

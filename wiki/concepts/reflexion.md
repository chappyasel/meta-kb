---
entity_id: reflexion
type: approach
bucket: self-improving
abstract: >-
  Reflexion enables LLM agents to improve across trials by storing verbal
  self-reflections of past failures in episodic memory, achieving gains
  equivalent to fine-tuning without any weight updates.
sources:
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - react
  - locomo-bench
  - episodic-memory
last_compiled: '2026-04-06T02:02:18.612Z'
---
# Reflexion

## What It Is

Reflexion is a framework published by Shinn et al. (2023) that lets LLM agents learn from failure through natural language self-analysis rather than gradient updates. When an agent fails a task, a self-reflection model analyzes the failed trajectory and produces a verbal critique. That critique gets stored in an [Episodic Memory](../concepts/episodic-memory.md) buffer, and the agent reads it before its next attempt.

The core claim: verbal feedback stored in memory can substitute for weight updates in many settings, enabling agents to improve across trials using only inference-time compute.

## Architecture

Three components form the loop:

**Actor (M_a):** Any LLM that generates actions or text. Works with [ReAct](../concepts/react.md), [Chain-of-Thought](../concepts/chain-of-thought.md), or direct generation as the underlying reasoning strategy.

**Evaluator (M_e):** Produces a feedback signal from the actor's trajectory. Exact match for reasoning tasks, code execution results for programming, heuristic functions for sequential decision-making. The evaluator is task-specific by design -- no general-purpose LLM-as-judge.

**Self-Reflection Model (M_sr):** Takes the full trajectory plus the evaluator's reward signal and generates a verbal critique in natural language. This critique names what went wrong and suggests what to try differently.

Memory runs on two tiers. Short-term memory holds the current trial's trajectory. Long-term memory holds a bounded buffer of 1-3 self-reflection summaries from previous trials. On the next attempt, the actor reads both. The buffer is a sliding window, not a growing archive.

## How the Loop Runs

1. Actor attempts the task, generating trajectory τ_t
2. Evaluator scores it: r_t = M_e(τ_t)
3. Self-reflection model analyzes {τ_t, r_t} and writes verbal summary sr_t
4. sr_t appended to long-term buffer
5. Actor retries, now conditioned on past reflections
6. Repeat until success or trial limit

The difference from simple retry is step 3. Without reflection, each attempt is essentially independent -- the agent knows it failed but not why. With reflection, the agent carries a distillation of its failure modes into the next attempt.

## Why Verbal Feedback

Traditional RL feedback is scalar ("you scored 0.3"). Reflexion's verbal feedback is diagnostic ("you tried to use the lamp before picking it up -- check inventory before using items"). Four practical advantages:

- No model weights to update
- Free-form language encodes richer failure analysis than a number
- The agent's "learning" is human-readable and auditable
- Reflections include explicit correction hints

## Programming: Self-Generated Unit Tests

For code generation, Reflexion adds a clever mechanism before submission: the agent generates its own unit tests, runs the solution against them, and reflects on failures. This creates automated evaluation without human-labeled test suites.

The mechanism depends heavily on test quality. HumanEval has a 1.4% false-positive rate (tests pass on incorrect code) -- acceptable. MBPP has a 16.3% false-positive rate -- problematic. At 16.3%, the agent frequently submits wrong code because its self-generated tests gave it a false green light. There is no internal mechanism to detect this failure.

The ablation on HumanEval Rust (50 hardest problems) isolates the contributions:

| Configuration | Pass@1 |
|---|---|
| No tests, no reflection | 60% |
| Reflection only (no tests) | 52% |
| Tests only (no reflection) | 60% |
| Tests + reflection | 68% |

Self-reflection without reliable test feedback actively degrades performance (-8pp). The agent generates confident but incorrect analysis of why it failed. Reliable evaluation is the binding constraint -- reflection quality is secondary.

## Experimental Results (Self-Reported)

All results below come from the Reflexion paper itself, not independent replication.

**Programming:**

| Benchmark | Baseline | Reflexion |
|---|---|---|
| HumanEval Python pass@1 | 80.1% (GPT-4) | 91.0% |
| HumanEval Rust (hard 50) | 60% | 68% |
| MBPP Python | 80.1% | 77.1% (regression) |
| LeetcodeHardGym Python | 7.5% | 15.0% |

The MBPP regression (-3pp vs GPT-4 baseline) is attributed to high false-positive test rates causing premature incorrect submission.

**Sequential Decision-Making (AlfWorld):**
- ReAct baseline: ~81% task completion
- Reflexion: 97% (130/134 tasks) within 12 trials
- Baseline agents hallucinated item possession at 22% rate; Reflexion nearly eliminates this through reflected trajectory analysis

**Reasoning (HotPotQA, 100 questions):**

| Configuration | Accuracy |
|---|---|
| CoT baseline | 61% |
| CoT + episodic memory only | 63% |
| CoT + self-reflection (Reflexion) | 75% |

The 12-point gap between episodic memory and self-reflection is the paper's most important finding. Remembering that you failed adds 2pp. Analyzing why you failed adds 14pp total. Reflection quality dominates memory quantity.

## Strengths

**No fine-tuning required.** Reflexion runs entirely at inference time. Any team that can call a GPT-4-class API can implement the full loop without access to training infrastructure.

**The three-component pattern is minimal and transferable.** Actor, evaluator, reflection model -- this is the smallest viable architecture for trial-and-error learning. Zep's entity extraction pipeline uses a reflection step described as "inspired by Reflexion." The [Darwin Gödel Machine](../projects/darwin-godel-machine.md) applies the same self-analysis-of-failure-logs pattern to agent code modification. [Voyager](../projects/voyager.md)'s self-verification critic is a domain-specific instantiation of the evaluator component.

**Self-reflection provides disproportionate value on refinement tasks.** AlfWorld (+16pp over baseline) and HumanEval (+11pp over GPT-4) are tasks where the agent's approach is directionally correct but needs corrective adjustment. Reflexion handles this category well.

## Failure Mode: WebShop

Reflexion fails completely on WebShop, showing zero improvement after 4 trials. WebShop requires creative exploration -- generating diverse product search queries to find items matching ambiguous natural language descriptions. Reflexion cannot generate useful self-reflections for this because the agent cannot diagnose why its searches return irrelevant results. The task needs exploration of different approaches, not refinement of a single approach.

The pattern generalizes: Reflexion helps on tasks where the failure is "I made a mistake in the right approach." It does not help when the failure is "I need to try a fundamentally different approach."

## Unspoken Infrastructure Assumptions

**Model capability.** Reflexion is an emergent behavior of strong LLMs. StarChat-beta shows 0.00 improvement across configurations (0.26 baseline, 0.26 with Reflexion). The framework requires a model capable of generating diagnostic self-analysis. As of the paper's 2023 publication, this meant GPT-3.5+ class models. Weaker models generate confident but incorrect reflections that make performance worse.

**Reliable automated evaluation.** The evaluator is assumed to produce accurate feedback signals. For code: executable tests. For navigation: simulator state. For reasoning: ground-truth answer matching. Domains without reliable automated evaluation cannot use Reflexion as described -- the self-reflection model needs accurate failure signals to analyze.

## Critical Limitation: Bounded Memory

The long-term memory buffer holds 1-3 reflections from recent trials. This is not architectural -- it is a context window constraint the authors explicitly acknowledge as a limitation and identify as future work.

For tasks requiring accumulation of many distinct insights (long-horizon agents, knowledge-building tasks, anything operating across many sessions), the sliding window loses earlier lessons as the buffer fills. Reflexion by itself cannot accumulate compounding knowledge. Combining it with external memory systems ([Zep](../projects/zep.md), [Mem0](../projects/mem0.md), or a vector store) is the standard extension for production use.

## When NOT to Use It

**Tasks requiring exploration over refinement.** WebShop demonstrated this failure mode clearly. If your agent fails because it needs to discover the right approach rather than correct mistakes in an approach it already has, Reflexion adds no value.

**Weak base models.** Below GPT-3.5-class capability, reflection quality degrades to the point where Reflexion can actively harm performance. Test with and without reflection before deploying.

**Unreliable evaluation signals.** If your evaluator has a false-positive rate above ~5%, self-generated tests will cause the agent to submit wrong answers with high confidence and no recovery path. Evaluate your evaluator before enabling reflection.

**Single-attempt, low-latency requirements.** The loop requires multiple LLM calls per task. For applications where latency matters more than success rate on a per-attempt basis, the overhead is unjustifiable.

## Unresolved Questions

**Convergence properties.** The paper provides no formal analysis of when Reflexion converges, how many trials are needed for different task types, or what happens when the agent reaches a local minimum in its reflection-guided search.

**Reflection evaluation.** There is no benchmark for reflection quality independent of downstream task performance. A reflection could be confident, plausible, and wrong -- this is what happens in the reflection-without-tests ablation (-8pp), but there is no way to detect it without independent evaluation.

**Current model amplification.** Results use GPT-3.5/GPT-4 (2023). Models with stronger self-analysis capabilities (reasoning models, 2025-era frontier models) likely amplify Reflexion's benefits substantially, but this has not been systematically measured in the original framework.

**Scaling memory beyond 3 reflections.** The bounded buffer is a recognized limitation but no published work from the original authors studies how to integrate Reflexion's reflection mechanism with long-term persistent memory at scale.

## Relationship to Other Concepts

Reflexion extends [ReAct](../concepts/react.md) by adding memory and a self-improvement loop. ReAct handles a single trajectory; Reflexion handles learning across trajectories. The actor in Reflexion can use ReAct as its reasoning strategy.

Reflexion implements [Episodic Memory](../concepts/episodic-memory.md) through its bounded buffer of verbal reflections from past trials. The episodic memory provides the context that separates Reflexion from simple retry.

Reflexion is one mechanism within the broader [Self-Improving Agents](../concepts/self-improving-agents.md) space. Unlike the [Darwin Gödel Machine](../projects/darwin-godel-machine.md) (which modifies agent code) or [DSPy](../projects/dspy.md) (which optimizes prompts), Reflexion does not modify any persistent artifact -- it improves only through memory conditioning at inference time.

## Alternatives

**[DSPy](../projects/dspy.md):** Use when you want to optimize prompts or agent pipelines systematically across a dataset rather than improve a single agent across trials. DSPy modifies the agent's instructions; Reflexion modifies the agent's memory.

**[Voyager](../projects/voyager.md):** Use when you need persistent, reusable skill accumulation across many tasks in a single domain. Voyager stores skills as executable code that compounds; Reflexion stores verbal reflections that expire with the session.

**[Darwin Gödel Machine](../projects/darwin-godel-machine.md):** Use when you want self-improvement to persist across deployments and compound over generations. DGM modifies agent code that gets saved; Reflexion's improvements disappear when the conversation ends.

**Simple retry with temperature:** Use when the task failure is probabilistic rather than systematic (the agent could succeed if it just tried again with different sampling). Reflection adds cost without benefit if failures are random rather than diagnostic.

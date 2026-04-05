---
url: 'https://arxiv.org/abs/2303.11366'
type: paper
author: >-
  Noah Shinn, Federico Cassano, Edward Berman, Ashwin Gopinath, Karthik
  Narasimhan, Shunyu Yao
date: '2023-03-20'
tags:
  - agent-memory
  - self-improving
  - episodic-memory
  - verbal-reinforcement-learning
  - agentic-skills
  - feedback-loops
  - language-reasoning
key_insight: >-
  Reflexion demonstrates that verbal self-reflection stored in episodic memory
  enables LLM agents to learn from failures without weight updates -- achieving
  91% pass@1 on HumanEval (vs GPT-4's 80%) through a simple three-component
  loop (actor, evaluator, self-reflection). The critical finding: self-reflection
  provides 8% absolute improvement beyond simple episodic memory on reasoning
  tasks, proving that the quality of failure analysis matters more than just
  remembering that you failed.
deep_research:
  method: paper-full-text
  text_length: 11000
  analyzed_at: '2026-04-04'
  original_source: papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
---

## Architecture Overview

Reflexion is a framework enabling LLM agents to learn from trial-and-error through linguistic feedback rather than gradient updates. The architecture has three components:

**Actor Model (M_a):** An LLM that generates text and actions conditioned on state observations and memory context. Can use any generation strategy -- Chain-of-Thought, ReAct, or direct generation.

**Evaluator Model (M_e):** Assesses the actor's output through task-specific signals -- exact match grading for reasoning tasks, heuristic functions for decision-making environments, and code execution results for programming tasks. Produces reward signals that indicate success or failure.

**Self-Reflection Model (M_sr):** Takes the current trajectory and reward signal and generates verbal self-reflections -- natural language analysis of what went wrong and what to try differently. These reflections are stored in an episodic memory buffer.

The memory system has two tiers:
- **Short-term memory:** The current trial's trajectory history (observations, actions, results)
- **Long-term memory:** A bounded buffer (typically 1-3 entries) of self-reflection summaries from previous trials

At inference time, the actor conditions decisions on both short-term trajectory and long-term reflective memory. The authors draw an analogy to human cognition: remembering fine-grained recent details while recalling distilled important experiences from the past.

## Core Mechanism

### The Verbal Reinforcement Loop

The iterative process:

1. **Act:** Actor generates trajectory tau_t for the current task
2. **Evaluate:** Evaluator produces reward r_t = M_e(tau_t)
3. **Reflect:** Self-reflection model analyzes {tau_t, r_t} and produces verbal summary sr_t
4. **Store:** sr_t is appended to long-term episodic memory
5. **Retry:** Actor attempts the task again, now conditioned on previous reflections
6. **Loop:** Continue until success or maximum trials reached

The key innovation is replacing scalar RL rewards with verbal feedback. Traditional RL tells the agent "you scored 0.3." Reflexion tells the agent "you failed because you tried to use the lamp before picking it up -- next time, check your inventory before attempting to use items."

This verbal feedback has four advantages over traditional RL:
1. **Lightweight:** No model fine-tuning required
2. **Nuanced:** Free-form language captures more information than scalars
3. **Interpretable:** The agent's learning process is human-readable
4. **Actionable:** Reflections contain explicit hints for future behavior

### Self-Reflection Quality

The quality of self-reflections is what distinguishes Reflexion from simple retry mechanisms. The ablation study on HotPotQA demonstrates this clearly:

- Base CoT with ground-truth context: 61% accuracy
- Adding episodic memory (remembering past attempts without reflection): 63% (+2%)
- Adding self-reflection (Reflexion): 75% (+14% total, +12% from reflection alone)

The 12% gap between episodic memory and self-reflection shows that analyzing why you failed is dramatically more valuable than simply remembering that you failed.

### Self-Generated Unit Tests (Programming)

For code generation tasks, Reflexion uses a particularly clever mechanism: the agent generates its own unit tests before writing the solution. If tests fail, the agent reflects on the test failures. If tests pass, the solution is submitted.

This creates a two-phase feedback loop:
1. Tests provide automated evaluation without human labels
2. Test failures provide specific, actionable feedback for reflection

The false-positive rate of self-generated tests determines effectiveness: HumanEval has 1.4% false positives (excellent), while MBPP has 16.3% (problematic, causing premature submission of incorrect solutions).

## Design Tradeoffs

**Verbal vs. scalar feedback:** Verbal reflection is more informative but requires a capable LLM to generate quality reflections. The paper shows that weaker models (StarChat-beta) gain nothing from Reflexion (0.26 baseline vs 0.26 with Reflexion). This means Reflexion is only viable with sufficiently capable foundation models -- it is an emergent capability, not a universal improvement.

**Bounded memory (1-3 reflections) vs. unbounded:** The memory buffer is deliberately limited to 1-3 previous reflections due to context window constraints. This means the agent can only remember recent failures, not build a comprehensive knowledge base. Longer-horizon learning would require external memory systems (vector stores, knowledge graphs) -- which the authors identify as future work.

**Self-generated tests vs. human-provided tests:** Self-generated tests enable label-free learning but introduce false positive/negative risks. False positives (tests pass on incorrect code) cause premature incorrect submission. False negatives (tests fail on correct code) waste trials but are less harmful because the agent can identify and fix invalid tests through reflection.

**Task-specific evaluation vs. general evaluation:** The evaluator is task-specific (exact match, heuristics, code execution). This limits out-of-the-box applicability but provides reliable feedback signals. General-purpose evaluation (LLM-as-judge) would be more flexible but noisier.

**Exploration vs. exploitation:** Reflexion primarily exploits failure information to improve. It does not explicitly encourage exploration of diverse strategies. This causes failure on tasks requiring creative exploration (WebShop) where the agent gets stuck in local minima.

## Experimental Results

### Programming Benchmarks

| Benchmark | Reflexion | GPT-4 Baseline | Prior SOTA | Improvement |
|-----------|-----------|----------------|------------|-------------|
| HumanEval Python pass@1 | 91.0% | 80.1% | 65.8% (CodeT) | +10.9pp vs GPT-4 |
| HumanEval Rust (50 hardest) | 68.0% | 60.0% | -- | +8.0pp |
| MBPP Python pass@1 | 77.1% | 80.1% | -- | -3.0pp (worse) |
| MBPP Rust | 75.4% | 70.9% | -- | +4.5pp |
| LeetcodeHardGym Python | 15.0% | 7.5% | -- | +7.5pp (100% relative) |

The MBPP regression (-3.0pp vs GPT-4) is attributed to the 16.3% false-positive rate in self-generated tests, causing premature incorrect submissions.

### Sequential Decision-Making (AlfWorld)

- Reflexion: 130/134 tasks completed (97.0%) within 12 trials
- Baseline (ReAct only): ~108/134 implied
- Learning curve: immediate spike between trials 1-2, then steady improvement to near-perfect by trial 12
- Baseline hallucination rate: 22% (agent thinks it has items it does not possess)
- Reflexion eliminates almost all hallucination cases through self-reflection distilling failed trajectories

### Reasoning (HotPotQA, 100 questions)

| Configuration | Accuracy by Trial 5 |
|---------------|---------------------|
| Reflexion ReAct | ~60% |
| Reflexion CoT | ~62% |
| Reflexion CoT (ground-truth context) | 75% |
| Baseline CoT only | No improvement across trials |
| Baseline ReAct only | No improvement across trials |

The baseline agents show no improvement across trials because without reflection, each attempt is essentially independent. Reflexion enables learning curves that converge within 3-5 trials.

### Programming Ablation (HumanEval Rust, 50 hardest)

| Test Generation | Self-Reflection | Pass@1 |
|-----------------|-----------------|--------|
| No | No | 60% |
| No | Yes | 52% |
| Yes | No | 60% |
| Yes | Yes | 68% |

Critical finding: Self-reflection without tests actually hurts performance (60% -> 52%). Without test feedback, the agent makes edits based on incorrect self-assessment. Tests alone provide no benefit (60% -> 60%) because without reflection, the agent cannot learn from test failures. Both together are required for the full +8pp improvement.

### Reasoning Ablation (HotPotQA CoT, ground-truth context)

| Configuration | Accuracy |
|---------------|----------|
| CoT baseline | 61% |
| + Episodic Memory (EPM) | 63% |
| + Self-Reflection (Reflexion) | 75% |

Self-reflection provides +12pp beyond episodic memory alone, demonstrating that reflection quality dominates memory quantity.

## Failure Modes & Limitations

**WebShop failure (local minima):** Reflexion completely fails on WebShop -- no improvement after 4 trials. The agent cannot generate helpful self-reflections because the task requires creative exploration (diverse search queries) rather than corrective refinement. Root cause: WebShop requires handling ambiguity in natural language search, where the agent cannot diagnose why searches return irrelevant results.

**Model capability dependency:** Reflexion is an emergent capability of strong LLMs. StarChat-beta shows zero improvement (0.26 -> 0.26). This means the framework is not universal -- it requires a model capable of generating quality self-analysis. As of 2023, this limited it to GPT-3.5+ class models.

**Bounded memory limits long-horizon learning:** The 1-3 reflection sliding window means the agent forgets earlier lessons. For tasks requiring accumulation of many distinct insights, the fixed memory buffer becomes a bottleneck. The authors acknowledge this and suggest external memory stores as future work.

**False positive vulnerability in code generation:** When self-generated tests pass on incorrect code (16.3% rate on MBPP), the agent submits wrong answers with high confidence. There is no mechanism to detect or recover from this failure mode within the framework.

**No convergence guarantees:** The agent may converge to a non-optimal local minimum, especially on tasks where the reflection mechanism cannot diagnose the root cause of failure. The paper provides no formal analysis of convergence properties.

**Reflection without feedback is harmful:** The ablation showing -8pp (60% -> 52%) when using self-reflection without test feedback is a cautionary result. If the evaluation signal is unreliable, self-reflection can make the agent worse by generating confident but incorrect analysis.

## Practical Implications

**For builders of self-improving agent systems:**

1. **The three-component pattern (actor, evaluator, self-reflection) is immediately implementable.** This is the simplest viable architecture for self-improving agents. The evaluator can be as simple as "did the code run?" or "did the API return a success status?" Combined with self-reflection, this enables meaningful learning without fine-tuning.

2. **Invest in evaluation quality, not reflection sophistication.** The ablation clearly shows that reflection without reliable evaluation is harmful (-8pp). The quality of your feedback signal is the binding constraint. For coding agents, unit tests are excellent evaluators. For other domains, find or build reliable automated evaluation first, then add reflection.

3. **Self-reflection adds 4-12pp beyond simple retry/episodic memory.** If your agent already retries on failure, adding structured self-reflection (asking the model to analyze why it failed) provides consistent additional improvement. The cost is one additional LLM call per retry.

4. **Reflexion fails on tasks requiring exploration, not refinement.** If your agent's failure mode is "not trying the right approach" (requiring creative exploration) rather than "making mistakes in the right approach" (requiring refinement), Reflexion will not help. WebShop-type tasks need different mechanisms (diversity-promoting sampling, explicit exploration strategies).

5. **The memory buffer size (1-3 reflections) is a limitation to address.** For production agents that operate over many tasks, the sliding window of 1-3 reflections loses valuable long-term knowledge. Combine Reflexion's self-reflection mechanism with a persistent memory system (A-MEM's Zettelkasten, Zep's knowledge graph) to enable both short-term learning and long-term knowledge accumulation.

**Reflexion's influence on the field:** This paper established verbal self-reflection as a standard technique. Zep's entity extraction uses "reflection technique inspired by Reflexion." ACE's reflector component follows the same pattern. The DGM's self-analysis of failure logs is architecturally identical. Reflexion's simple loop has become a fundamental building block for self-improving agents.

**Gap between paper and production:** Reflexion's 2023 results used GPT-3.5/GPT-4. Current models (2025-2026) have much stronger self-reflection capabilities, likely amplifying the framework's benefits. The main production gaps: bounded memory (integrate with external memory systems), lack of exploration (combine with diversity mechanisms), and evaluation quality dependency (build robust automated evaluators for your domain).

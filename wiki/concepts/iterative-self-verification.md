---
entity_id: iterative-self-verification
type: approach
bucket: self-improving
abstract: >-
  Iterative self-verification is an agent improvement loop where outputs are
  evaluated against defined criteria and refined across multiple passes until
  quality thresholds are met, distinguishing itself from single-shot generation
  by making the evaluation step an explicit, repeatable part of execution.
sources:
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - repos/wangziqi06-724-office.md
  - repos/aiming-lab-agent0.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related:
  - agent-skills
last_compiled: '2026-04-06T02:16:27.951Z'
---
# Iterative Self-Verification

## What It Is

Iterative self-verification is an agent design pattern where a system generates an output, evaluates it against criteria, and revises based on that evaluation — repeating until the output meets a threshold or a maximum iteration count is reached. The "self" in the name is misleading: the evaluator can be the same model that generated the output, a separate model, deterministic code, or a combination. What defines the pattern is the tight loop between generation, evaluation, and revision.

The pattern solves a specific failure mode in single-pass LLM generation: outputs that are syntactically plausible but semantically wrong, incomplete, or subtly broken. By making evaluation explicit and programmatic rather than implicit and hopeful, the agent catches errors before they propagate downstream.

## How It Works

The loop has four elements:

1. **Generator** — produces an initial output (code, text, a plan, a tool call)
2. **Evaluator** — assesses the output against success criteria
3. **Feedback** — the evaluator's verdict, translated into actionable revision instructions
4. **Revision gate** — decides whether to re-enter the loop or accept the current output

The evaluator can take several forms. [Voyager](../projects/voyager.md) uses a dedicated GPT-4 critic that receives the task description, generated code, and execution results, then determines whether the task completed successfully and what to fix if not. The [Agent0](../projects/evoagentx.md) series uses a dual-role architecture where a Verifier generates structured feedback and fine-grained self-rewards. [Agent Skills](../concepts/agent-skills.md) evaluation frameworks use deterministic tests (unit tests, assertion checks) for objective criteria plus an LLM-as-judge for qualitative checks.

In practice, most implementations combine multiple feedback types rather than relying on a single evaluator. Voyager's mechanism ingests three simultaneously: environment feedback (what changed in game state), execution errors (JavaScript runtime exceptions), and self-verification (GPT-4 critic judgment). This redundancy matters because each type catches different failure classes — a program can pass syntactic execution but fail task completion, or succeed at the task but do so in a way that produces a broken skill for future reuse.

## The Iteration Budget Problem

Every implementation must decide: how many iterations before giving up? Voyager caps at 4. The 724-office system runs up to 20 iterations per conversation. Agent0-VL runs 3 training iterations, each of which internally contains evaluation loops.

The right number depends on the cost of a wrong answer versus the cost of additional iterations. For skill creation in Voyager, a bad skill corrupts the library permanently, so additional verification iterations are cheap relative to that downside. For conversational response generation, users notice latency before they notice subtle quality differences, so fewer iterations make sense.

A hard cap without fallback is a trap. Voyager abandons tasks that exceed 4 iterations and retries them later via the curriculum. Without such a fallback, a fixed cap produces silent failures — the system exits the loop with a subthreshold output and treats it as success.

## Quality Gating

Quality gating — only accepting outputs that pass verification — is what separates iterative self-verification from simple retry logic. Retry logic re-runs generation and hopes for a different result. Quality gating uses the evaluator's judgment to decide whether the output should proceed.

Voyager's ablation study makes the stakes concrete: removing the self-verification component causes a 73% performance drop, even though the iterative prompting loop still runs. The loop without a quality gate generates and refines code, but without a decision about whether a skill is actually complete, broken skills enter the library and corrupt future generations. [Source](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

Quality gating also means the threshold must be defined before evaluation runs. Vague criteria ("the output should be good") produce inconsistent evaluator behavior, especially with LLM judges. The philschmid evaluation framework recommends defining three distinct success dimensions: outcome (did it accomplish the goal), style (does it match expected format and tone), and efficiency (did it use appropriate tool calls and avoid unnecessary steps). [Source](../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md)

## Implementation Patterns

**Code execution as ground truth.** When the output is executable code, running it provides the highest-signal feedback. Syntax errors, runtime exceptions, and incorrect outputs are all objectively detectable. This is why Voyager, 724-office, and Agent0 all use code generation as their primary output type — executable outputs make self-verification tractable. For non-executable outputs (prose, plans, classifications), you need proxy signals.

**Separation of generator and evaluator.** Using the same model for both generation and evaluation creates a blind spot: the model will share misconceptions about the task with both components. Voyager uses a separate GPT-4 call for the critic, which is a different prompt context rather than a genuinely different model, but it still catches errors by framing evaluation differently than generation. Stronger separation means genuinely different models or deterministic test suites.

**Structured feedback over binary pass/fail.** Binary evaluators tell the agent the output is wrong but not why. Structured feedback — "task failed because inventory shows 0 iron ingots but the task requires 7" — gives the generator revision instructions rather than requiring it to diagnose the failure from scratch. The 724-office self-repair mechanism follows this: `self_check` and `diagnose` tools produce structured error reports that the agent can act on directly. [Source](../raw/repos/wangziqi06-724-office.md)

**Deterministic checks before LLM judge.** Objective criteria should be evaluated deterministically, not by LLM. Run assertion-based tests first, only escalate to LLM-as-judge for the subjective criteria that deterministic checks cannot cover. This reduces cost and increases reliability — LLM judges are expensive and inconsistent on criteria that have correct answers.

## Connection to Skill Accumulation

Iterative self-verification is the quality gate for [Agent Skills](../concepts/agent-skills.md). Voyager only adds a skill to its library after the critic confirms successful completion. Agent0-VL only uses verified outputs as training data for the next iteration. 724-office only persists a dynamically created tool after it executes successfully.

This gate matters because skill libraries compound. A skill added at iteration 10 gets retrieved and built upon in iterations 50, 100, and 200. A buggy skill that slips past the gate pollutes every future generation that retrieves it. Voyager's skill library has no deletion or update mechanism — once a skill is in, it stays in — so the quality gate at entry is the only protection.

The compounding also means verification standards should be domain-aware rather than generic. A skill that "works" in the specific context where it was created may fail in a different context. Good self-verification tests the skill against multiple scenarios, not just the one that triggered its creation.

## Failure Modes

**Evaluator hallucination.** LLM-based critics can share misconceptions with the generator. In Voyager, GPT-4 occasionally proposes non-existent game items ("copper sword"), and the critic does not always catch these because it may have the same incorrect world model. Mixing deterministic checks with LLM judges reduces this risk.

**Threshold gaming.** When the evaluator is the same model as the generator, the system can learn to satisfy the evaluator rather than the actual task. The generator produces outputs that look complete to the evaluator while remaining functionally broken in ways the evaluator does not check. This is why external, ground-truth-based evaluation (running code, checking against a test suite, verifying in the actual environment) is preferable to self-evaluation.

**Silent degradation past the iteration cap.** Without explicit handling for iteration exhaustion, a system that hits its cap with a subthreshold output may silently treat it as success. This produces intermittent quality failures that are hard to debug because they only appear when the iteration budget was insufficient, not deterministically.

**Evaluation criteria drift.** Criteria defined at system design time may not match what actually matters at runtime. If the evaluator checks "did the agent complete the task" but the relevant question becomes "did the agent complete the task without corrupting state," untracked criteria produce false positives.

**Cost accumulation.** Multiple LLM calls per iteration multiply quickly. 4 iterations × 3 LLM calls per iteration = 12 calls per task, all at GPT-4 pricing. At scale, this becomes the dominant operating cost. Voyager does not report total API costs, but notes a 15x cost ratio between GPT-4 and GPT-3.5, and GPT-3.5 substitution produces 5.7x fewer unique items — meaning cheap verification is not an easy substitute.

## When to Use It

Iterative self-verification pays off when:

- Output quality has a clear, checkable definition (code correctness, format compliance, task completion)
- The cost of a wrong output is higher than the cost of additional verification iterations
- Outputs feed into a persistent store (skill library, knowledge base, memory) where errors compound over time
- The generation step is non-deterministic enough that re-prompting with feedback produces meaningfully different outputs

Avoid it when:

- Latency is the primary constraint and users notice the additional round-trips
- The evaluation criteria are so vague that the evaluator will give inconsistent verdicts
- The domain lacks objective feedback signals, making self-evaluation the only option and evaluator hallucination a high risk
- Generation cost per iteration is high and the quality delta between iterations is small

## Relationship to Adjacent Concepts

[Reflexion](../concepts/reflexion.md) formalizes this pattern with explicit memory of past evaluation results, allowing the agent to avoid repeating previous mistakes across episodes rather than just within a single task's iteration budget. Iterative self-verification is often episode-scoped; Reflexion extends the feedback loop across episodes.

[Chain-of-Thought](../concepts/chain-of-thought.md) operates inside a single generation step, making reasoning visible before committing to an answer. Iterative self-verification operates across generation steps, making revision explicit after an answer is produced. The two are composable: chain-of-thought in the generator, iterative verification of the generator's output.

[GRPO](../concepts/grpo.md) and other reinforcement learning approaches internalize the evaluation signal into model weights rather than keeping it external to the generation loop. Iterative self-verification keeps evaluation external and interpretable; GRPO makes it implicit and scalable. Agent0 uses iterative self-verification to generate training data that then feeds GRPO-style fine-tuning, combining both.

[Self-Improving Agents](../concepts/self-improving-agents.md) use iterative self-verification as one mechanism among several. The broader self-improvement loop may involve curriculum generation, skill accumulation, and weight updates in addition to within-task verification.

## Unresolved Questions

**How should verification scale with skill complexity?** A skill that composes 10 prior skills needs to verify the composition, not just the individual components. No current implementation addresses hierarchical verification explicitly.

**What is the right evaluator architecture at production scale?** Running a full GPT-4 call as evaluator per iteration is expensive and slow. Distilling the evaluator into a smaller model is possible but the training data for "good evaluation" is hard to collect. The field lacks an agreed approach.

**How do you prevent skill library corruption when verification has false positive rates?** Voyager's append-only library means a false positive at verification creates permanent contamination. Periodic audits, skill versioning, or soft deletion mechanisms exist as patterns in software engineering but have not been adapted for LLM skill libraries.

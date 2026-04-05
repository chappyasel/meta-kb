---
entity_id: dspy-optimizer
type: concept
bucket: self-improving
sources:
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related: []
last_compiled: '2026-04-05T06:02:52.046Z'
---
# Automatic Curriculum

**Type:** Concept | **Bucket:** Self-Improving

---

## What It Is

An automatic curriculum is a training mechanism that generates and sequences learning tasks based on an agent's current capabilities, rather than following a predetermined schedule. The agent's performance shapes what it learns next. Tasks sit just beyond what the agent can currently do, keeping it in a productive learning zone without manual task design.

The core problem it solves: hand-designed curricula go stale. A curriculum written before training starts cannot know which skills will prove hard, which will transfer, or what order of acquisition will compound most effectively. An automatic curriculum discovers this empirically, at training time.

---

## Why It Matters

Skill acquisition in complex domains is non-linear. Learning to craft a stone pickaxe before mining iron ore is not just helpful, it's prerequisite. A flat training distribution wastes compute on tasks the agent has mastered or cannot yet attempt. By contrast, a curriculum that tracks capability boundaries and pushes against them continuously extracts maximum signal from each training step.

This matters beyond efficiency. In open-ended environments with no fixed task set (Minecraft, the open web, real codebases), there is no predefined curriculum to hand over. The system must generate its own progression or stagnate.

---

## How It Works

### The Capability-Task Feedback Loop

At each step, the curriculum generator receives the agent's current state: what it has accomplished, what it has failed at, and what resources or context it currently holds. From this, it proposes the next task. The proposed task should be achievable with some effort but not trivially solved with current skills.

In Voyager, this generator is GPT-4 receiving the agent's inventory, equipment, biome, nearby blocks, time of day, and a history of completed and failed tasks. The model proposes a concise objective ("Mine 3 iron ore," "Craft 1 diamond pickaxe") that extends the agent's frontier given its current state. A warm-up schedule delays introducing complex environmental context until the agent has basic competence, preventing the generator from proposing tasks that require context the agent cannot yet use.

Failed tasks are not discarded. They are retried later, when the agent may have acquired prerequisite skills. This is not backtracking; it is deferral until conditions are met.

### The Quality Gate

Curriculum systems fail when the agent believes it has learned something it hasn't. Voyager addresses this with a separate self-verification critic: a GPT-4 model that receives the task description, the generated skill code, and the execution results, then determines whether the task was completed successfully and, if not, what specific improvements are needed.

Skills only enter the library after passing verification. The ablation results are clear: removing self-verification drops performance 73%. Without a quality gate, broken or partial skills accumulate and mislead future generation. The verification step is not optional overhead; it is load-bearing.

### Compounding Through Skill Reuse

Voyager's curriculum works in tandem with a skill library: an ever-growing collection of verified executable JavaScript programs indexed by text embeddings of their natural language descriptions. When tackling a new objective, the system retrieves the top-5 most relevant skills by embedding similarity and provides them as code generation context.

The compounding effect comes from composition. A skill for smelting iron can call the existing skills for mining iron ore and crafting a furnace. Each new skill can invoke the library, creating a hierarchy of increasingly complex behaviors. The library is append-only: new skills add, old skills remain unchanged. Capability grows monotonically without catastrophic forgetting.

This is what distinguishes automatic curriculum from simple task randomization. The curriculum proposes what to learn; the skill library accumulates what was learned; verification gates what enters the library. All three are required for the benefit.

---

## Concrete Implementation: Voyager

[Voyager](https://arxiv.org/pdf/2305.16291) is the clearest working example of automatic curriculum in an LLM-agent setting. Its three components (automatic curriculum, skill library, iterative prompting with self-verification) work together as a system. Ablations confirm individual component importance:

- Removing the automatic curriculum: 93% drop in unique items discovered (random task selection is nearly useless)
- Removing self-verification: 73% performance drop
- Replacing GPT-4 with GPT-3.5 for code generation: 5.7x fewer unique items

The curriculum is the most critical component. Knowing what to learn next matters more than any particular learning mechanism.

**Benchmark results** (self-reported, not independently validated): Voyager collects 3.3x more unique items, travels 2.3x longer distances, and reaches tech tree milestones up to 15.3x faster than prior SOTA (AutoGPT, ReAct, Reflexion) over 160 prompting iterations. In zero-shot generalization to new Minecraft worlds, Voyager solves all four benchmark tasks (Diamond Pickaxe, Golden Sword, Lava Bucket, Compass) at 100% success rate across three seeds. AutoGPT augmented with Voyager's skill library but without curriculum and verification solves most tasks at 0/3 or 1/3 success, confirming that the skill library alone is insufficient.

---

## Strengths

**Open-ended environments.** When no fixed task set exists, automatic curricula generate one from the agent's experience. This is the only viable approach for domains without predefined progression.

**Compounding skill reuse.** Tasks proposed at the right difficulty build on prior skills, not beside them. The Voyager results show this compounding effect clearly in tech tree progression speed.

**No catastrophic forgetting.** Because skills are stored as executable code rather than neural weights, adding new skills does not overwrite old ones. The library grows; it does not drift.

**Eliminates manual curriculum design.** Human-designed curricula require domain expertise, become outdated as the agent improves, and cannot adapt to unexpected failure modes. Automatic curricula handle all of this at training time.

---

## Limitations

**Domain-specific verification is hard to design.** Minecraft provides clean, deterministic feedback: inventory changes, crafting success, explicit error messages. Most production environments do not. Designing a self-verification critic for web automation, document editing, or API integration requires solving what "success" means in that domain before the curriculum can function. This is not a solved problem.

**Single-domain evaluation.** All Voyager results are in Minecraft. The architecture is domain-general in principle (curriculum + skill library + iterative refinement), but the authors do not validate transfer to other environments. Claims about generality rest on architectural argument, not experiment.

**Skill library maintenance at scale.** The library is append-only with no deletion or revision mechanism. A skill that passed verification but contains edge-case bugs stays in the library permanently. As the library grows to hundreds or thousands of entries, embedding-based retrieval may surface the wrong skills more often, and there is no quality decay mechanism to handle this.

**Cost.** Voyager uses GPT-4 for curriculum generation, code generation, and verification, with multiple calls per iteration. GPT-4 costs roughly 15x GPT-3.5. Over 160+ prompting iterations with several LLM calls each, total API costs are substantial. The paper reports no dollar figures.

**4-iteration refinement ceiling.** Tasks not solved within 4 refinement iterations are deferred. Some tasks may require more iterations than this ceiling allows, causing repeated deferral without resolution.

### Concrete Failure Mode

Voyager's self-verification critic shares GPT-4's training data, including its misconceptions about Minecraft. GPT-4 occasionally proposes non-existent items ("copper sword") or invalid crafting recipes. The critic may fail to catch these because it hallucinates the same rules as the generator. The quality gate only works when the verifier has better information than the generator, which is not guaranteed when both are the same model.

### Unspoken Infrastructure Assumption

The automatic curriculum assumes feedback signals are fast, cheap, and structured. Minecraft provides immediate game-state feedback in a format GPT-4 can interpret. Real environments where feedback is slow (running a test suite, waiting for a human reviewer), expensive (API calls, compute jobs), or unstructured (log files, rendered web pages) require additional engineering before the curriculum loop can close. This assumption is never stated in the paper.

---

## When Not to Use It

**Fixed, well-specified task sets.** If you already know the task distribution and can represent it completely, a hand-designed curriculum with difficulty estimates will be cheaper and more predictable.

**Tight cost budgets.** The curriculum loop requires repeated LLM calls per training step. In production, this accumulates quickly. If your budget caps model inference, a simpler task scheduler is more tractable.

**Domains without executable verification.** If you cannot automatically verify whether the agent succeeded at a task, you cannot run the quality gate, and the skill library will accumulate broken skills. The whole system degrades.

**Short-horizon tasks.** Automatic curriculum delivers most value through compounding: skills built on skills. For agents that handle single-turn, self-contained tasks with no skill reuse, the overhead of curriculum generation and library management is not justified.

---

## Unresolved Questions

**How should skill libraries be organized at scale?** Voyager retrieves the top-5 skills by embedding similarity. With hundreds of skills, this may surface the wrong context. Hierarchical organization, skill deprecation, and quality-weighted retrieval are not addressed.

**Can the curriculum generator be cheaper than GPT-4?** The ablation shows GPT-3.5 for code generation yields 5.7x worse results. It does not test cheaper models for curriculum generation or verification. Splitting these roles across model tiers is unexplored.

**What happens when the agent's self-model is wrong?** The curriculum generator relies on the agent's reported state (inventory, completed tasks). If the agent's state tracking is inaccurate, the curriculum will propose inappropriate tasks. Error propagation through misreported state is not analyzed.

**How do you transfer this to non-game domains?** Minecraft's structured feedback is unusually clean. The paper does not address how to design the verification critic or curriculum generator for domains where state is harder to observe and success is harder to define.

---

## Alternatives

- **Hand-designed curriculum:** Use when the task distribution is known and fixed. Cheaper, more predictable, but requires domain expertise upfront and cannot adapt.
- **Self-play:** Use when the environment supports agent-vs-agent competition and difficulty scales naturally with opponent skill. Better suited to adversarial settings than open-ended exploration.
- **Hindsight Experience Replay (HER):** Use when tasks fail frequently and you want to extract learning signal from failures by relabeling goals retroactively. Complementary to automatic curriculum rather than a replacement.
- **Random task sampling:** Use as a baseline when you have a finite task set and no strong prior on difficulty ordering. It is the comparison Voyager's ablation destroys (-93%).

---

## Sources

- [Voyager paper](../../raw/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)
- [Voyager deep analysis](../../raw/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

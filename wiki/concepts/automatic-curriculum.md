---
entity_id: automatic-curriculum
type: concept
bucket: self-improving
abstract: >-
  Automatic Curriculum generates progressively harder training tasks for agents
  by analyzing current capabilities, enabling open-ended skill acquisition
  without human-designed task sequences.
sources:
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related:
  - agent-skills
last_compiled: '2026-04-07T11:58:26.567Z'
---
# Automatic Curriculum

## What It Is

An automatic curriculum is a mechanism that generates training tasks ordered by difficulty, calibrated to an agent's current capability level. The core problem it solves: an agent cannot learn from tasks that are trivially easy (no gradient signal) or impossibly hard (no path to success). Human engineers can hand-craft task sequences for narrow domains, but this breaks down when the target skill space is large, open-ended, or unknown in advance.

The concept draws from developmental psychology (Zone of Proximal Development: Vygotsky's idea that learning happens at the frontier of current ability) and curriculum learning research in machine learning (Bengio et al., 2009, which showed that ordering training examples from easy to hard accelerates convergence). What makes the modern variant distinct is automation: rather than a human deciding what "progressively harder" means, the system itself measures what the agent can and cannot do, then proposes the next task.

Automatic curriculum is a component of [Agent Skills](../concepts/agent-skills.md) systems and appears as a subproblem inside broader [Self-Improving Agent](../concepts/self-improving-agent.md) architectures.

## Why It Matters

Without a curriculum, agents face the exploration-exploitation dilemma at the task level: random task selection wastes most training on tasks that are either too easy or too hard. The ablation results from [Voyager](../projects/voyager.md) are stark: removing the automatic curriculum drops discovered unique items by 93%, worse than any other ablation including removing the skill library itself. The implication is that *what you train on matters more than how you train*.

For knowledge base and agent intelligence systems, this matters for two reasons. First, agents acquiring skills in open-ended domains (coding, web navigation, tool use) face a combinatorially large task space; no human can enumerate a sensible order. Second, the curriculum must adapt as capabilities improve. A static task ordering that worked for a novice agent becomes useless once skills are acquired.

## How It Works

### State Assessment

Every curriculum implementation starts by measuring the agent's current state. In [Voyager](../projects/voyager.md), this is concrete: inventory contents, equipped items, current biome, nearby entities, time of day, and a list of completed vs. failed tasks. GPT-4 receives this state snapshot and proposes the next objective.

The state assessment serves as the difficulty oracle. An agent with wooden tools should not attempt diamond mining; an agent that cannot craft a furnace should not attempt smelting. The curriculum uses current state to filter the feasible task space before generating the next objective.

### Objective Generation

Voyager's curriculum uses two LLM calls per objective:
1. GPT-4 receives the state and proposes the next task
2. GPT-3.5 runs self-questioning to inject domain knowledge (Minecraft progression conventions, recipe requirements, biome-specific resource availability)

The self-questioning step is the practical solution to a gap: GPT-4 knows Minecraft lore but does not always apply it consistently. Explicitly prompting for domain knowledge injection improves task quality.

Objectives are intentionally narrow and verifiable: "Mine 3 iron ore," "Craft 1 diamond pickaxe," not "Become good at mining." Verifiability matters because the downstream self-verification step needs a clear success condition.

### Warm-Up Scheduling

Voyager uses a warm-up schedule that progressively incorporates environmental complexity as the agent accumulates tasks. Early in training, objectives are proposed with minimal environmental context (avoid confusing a novice agent with information it cannot act on). As completed task count grows, more environmental signals feed into curriculum generation. This is a simple but important detail: the curriculum itself has a curriculum.

### Failure Handling

Failed tasks are not abandoned permanently. The curriculum requeues them after the agent acquires new capabilities. This prevents the system from getting stuck on a hard prerequisite while blocking all downstream tasks that depend on it. In practice, the curriculum maintains a list of failed tasks alongside completed ones, and the objective generator can propose retrying failed tasks when the state suggests the agent now has the prerequisites.

### Connection to Self-Verification

The automatic curriculum and self-verification are coupled. A task gets added to the "completed" list only after a separate critic model confirms success. This quality gate prevents the curriculum from treating a failed attempt as success, which would corrupt the difficulty calibration. The curriculum needs accurate completion data; self-verification provides it.

## Implementation Variants

### Voyager Pattern (LLM-Generated Curriculum)

The most direct implementation: give an LLM the agent's current state and ask it to propose the next task. Works when:
- The task space has natural language descriptions
- An LLM has domain knowledge to draw on (game mechanics, software development patterns, API documentation)
- Tasks have verifiable success conditions

Voyager stores this as prompt templates in the codebase. The curriculum prompt includes current inventory, failed tasks, completed tasks, and a directive to propose something at the frontier of current capability.

### Procedural Generation + Difficulty Scoring

An alternative pattern used in robotics and procedural game environments: generate tasks programmatically (randomized goal positions, obstacle configurations, parameter ranges) and score difficulty by past performance. Tasks where the agent succeeds 80%+ of the time get retired; tasks below 20% success get deferred; the 20-80% band becomes the training distribution.

This variant requires a parameterizable task generator and a performance tracker, but does not require LLM calls at curriculum-generation time. It fits environments where tasks cannot be easily described in natural language.

### Self-Play Curriculum

In multi-agent settings (AlphaGo Zero, OpenAI Five), the curriculum emerges from playing against progressively stronger opponents. The agent at step N becomes the training partner for step N+1. This is implicit automatic curriculum: difficulty scales with agent capability without any explicit difficulty measurement.

### [Darwin Gödel Machine](../projects/darwin-godel-machine.md) Extension

The DGM applies a curriculum-like structure at the agent architecture level rather than the task level. Rather than proposing the next task to solve, it proposes the next modification to the agent's own code. The archive of evolved agents serves as the curriculum: each generation samples from successful prior variants and creates slightly more capable versions. The same principle applies: explore at the frontier of current capability, validate empirically, keep what works.

## Failure Modes

### Curriculum Collapse

If the state assessment is inaccurate, the curriculum miscalibrates. In Voyager, GPT-4 occasionally proposes tasks requiring items the agent does not have ("smelt copper into copper sword" when copper swords do not exist in vanilla Minecraft). Hallucinated domain knowledge produces tasks that are impossible, not just hard. The agent attempts them, fails, and the curriculum's failure list grows with unreachable tasks.

Mitigation: the self-questioning step reduces hallucination frequency, and failed tasks are never permanently blocked. But the curriculum has no mechanism to detect structurally impossible tasks vs. tasks that are merely hard.

### Premature Difficulty Escalation

If self-verification is too permissive (accepting partial success as complete success), the curriculum treats unmastered tasks as complete and escalates difficulty prematurely. The agent then encounters downstream tasks without the prerequisites. The 73% performance drop from removing self-verification in Voyager's ablation reflects this coupling.

### Curriculum Stagnation

In domains without clear difficulty gradients, the curriculum can oscillate between tasks at similar difficulty levels without making progress. This happens when the state representation does not capture the right features for difficulty estimation. An agent solving web navigation tasks might be measured by pages visited (a poor proxy) rather than task complexity (which requires domain understanding to measure).

### Cost Accumulation

LLM-generated curricula require model calls per task proposal. At GPT-4 rates, 160 curriculum proposals at roughly 2-3 calls each accumulates quickly. Voyager does not report total dollar costs. For production systems requiring millions of training tasks, LLM-generated curricula are not economical. Procedural generation with learned difficulty scoring scales better.

## Relationship to Adjacent Concepts

**[Reinforcement Learning](../concepts/reinforcement-learning.md):** Automatic curriculum is a component of RL training pipelines, not a replacement for them. The curriculum decides *what tasks to train on*; RL decides *how to update policy weights or memory given task outcomes*. Voyager bypasses weight updates entirely (no fine-tuning), relying on in-context learning and skill library accumulation instead.

**[Continual Learning](../concepts/continual-learning.md):** Automatic curriculum prevents [Catastrophic Forgetting](../concepts/catastrophic-forgetting.md) indirectly. By ordering tasks so earlier skills are prerequisites for later ones (compositional skill building), the curriculum ensures earlier skills remain exercised. Voyager's skill library is the mechanism that makes this explicit: skills that are building blocks get called repeatedly as new skills compose them.

**[Agent Skills](../concepts/agent-skills.md):** The curriculum decides what skills to acquire; the skill library stores them. These are separable concerns but tightly coupled in practice. A curriculum without a skill library produces learning that does not compound; a skill library without a curriculum accumulates skills in arbitrary order, missing compositional dependencies.

**[Reflexion](../concepts/reflexion.md):** Reflexion's self-reflection mechanism operates at the single-task level (how to improve this specific attempt). Automatic curriculum operates at the meta-level (which task to attempt next). Both use LLMs for self-assessment but address different scopes.

**[GEPA](../concepts/gepa.md):** GEPA (Goal-conditioned Evolutionary Policy Architecture) applies automatic curriculum ideas in multi-goal environments. Goals are generated by a population-based process that maintains diversity across difficulty levels.

## Practical Implications for Builders

**Encode your success conditions before designing the curriculum.** Voyager's curriculum works because Minecraft has unambiguous success signals (item acquired, block mined). For ambiguous domains (did this code change improve quality?), you need a verifier before you can build a curriculum. The curriculum is only as reliable as your success metric.

**Start with state representation.** What information does the curriculum need to propose the right next task? For code agents, this might be: tests passing, files modified, error messages encountered. For web agents: pages visited, forms submitted, errors. Get this representation right first; the curriculum generation mechanism is secondary.

**Decouple curriculum frequency from skill acquisition frequency.** The curriculum should propose a new task when the current one is verified complete or failed after N attempts. Do not couple it to wall-clock time or fixed iteration counts, which will misalign with actual capability state.

**Track failed tasks explicitly.** Naive implementations discard failed tasks. The curriculum needs failed tasks as signal: if an agent fails the same task repeatedly, either the task is miscalibrated or the agent is missing a prerequisite. Logging failures with state snapshots lets you diagnose which.

**Plan for library scaling.** Voyager's skill library works with 63+ unique skills in Minecraft. Production systems accumulating hundreds of skills will need hierarchical organization for the retrieval step to remain efficient. The curriculum should tag skills with prerequisite relationships as they are added, not retroactively.

## Open Questions

The automatic curriculum literature has not resolved several problems relevant to production deployments:

- **Difficulty measurement without domain experts.** Voyager relies on GPT-4's Minecraft knowledge to estimate difficulty. How do you build a curriculum in a domain where LLMs lack strong priors?

- **Curriculum transfer.** If an agent trained with curriculum A in environment X is deployed in environment Y, should the curriculum restart? How much of the difficulty ordering transfers?

- **Verification cost.** Self-verification requires additional LLM calls per task. At scale, this becomes the bottleneck. What is the minimum verification signal that maintains curriculum quality?

- **Objective novelty vs. prerequisite coverage.** Should the curriculum prioritize tasks that exercise new skills or tasks that reinforce existing ones? Voyager does not address skill decay (a skill acquired early may degrade if not exercised). Whether this matters in practice for LLM-based agents doing in-context skill retrieval is unknown.


## Related

- [Agent Skills](../concepts/agent-skills.md) — part_of (0.5)

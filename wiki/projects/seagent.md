---
entity_id: seagent
type: project
bucket: self-improving
abstract: >-
  SEAgent is an autonomous skill discovery system that enables agents to develop
  capabilities for previously unseen software environments through world-state
  modeling and curriculum-driven training, achieving 34.5% success on OSWorld
  vs. 11.3% baseline.
sources:
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
related:
  - composable-skills
  - seagent-project
  - composable-skills
last_compiled: '2026-04-08T23:18:36.834Z'
---
# SEAgent

## What It Does

SEAgent is an autonomous skill discovery framework that teaches agents to operate in unfamiliar software environments without human-authored instructions. Where most skill systems rely on pre-written SKILL.md files or human expertise, SEAgent generates skills by exploring environments, modeling world states, and building up from specialist behaviors to generalist capability.

The core problem SEAgent addresses: when an agent encounters new software it has never seen, how does it learn to use it? Human-authored skills are expensive to produce and cannot scale to the long tail of applications. SEAgent automates this by having the agent discover what actions are possible, what effects they produce, and how to sequence them into reusable skills.

## Architecture

SEAgent operates through three linked components:

**World State Model:** The agent builds an explicit representation of what the environment looks like before and after actions. This lets it detect whether a skill attempt changed anything meaningful, which is otherwise surprisingly hard to determine from screen pixels alone. The world state model acts as the self-verification signal: if the intended state transition did not occur, the skill failed and needs revision.

**Curriculum Generator:** Rather than attempting arbitrary tasks immediately, SEAgent sequences learning from simpler to more complex objectives. The curriculum tracks which sub-tasks the agent can reliably accomplish and builds new objectives from that frontier. This mirrors Voyager's automatic curriculum, applied here to GUI environments rather than a 3D game world.

**Specialist-to-Generalist Training Pipeline:** The agent first develops narrow specialist skills for specific software contexts, then generalizes across them. This two-stage approach prevents overfitting to a single application while still allowing deep capability development before broadening.

The system integrates with the SKILL.md three-level progressive disclosure pattern: discovered skills get encoded as metadata (name and description), instructions (the learned procedure), and resources (environment-specific reference materials). This means SEAgent-discovered skills are portable and inspectable, unlike skills learned purely in model weights.

## Performance

On OSWorld evaluated across five novel software environments:

- SEAgent: **34.5% success rate**
- Baseline (no skill discovery): **11.5% success rate**
- Absolute improvement: **+23.2 percentage points**

Source: [Agent Skills Survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md), self-reported in the survey paper. Independent replication of these figures has not been published. The 3x relative improvement is striking, but OSWorld's five-environment subset is narrow enough that results should be verified on broader evaluation sets before treating them as definitive.

For context, the best agents on full OSWorld reach 59.9% (CoAct-1), and human performance sits at 72.4%. SEAgent's 34.5% on novel environments is competitive given it operates without pre-authored skill knowledge.

## Relationship to Compositional Skill Synthesis

SEAgent implements [Compositional Skill Synthesis](../concepts/composable-skills.md) at the discovery layer. Where compositional synthesis typically combines existing human-authored skills, SEAgent generates the primitive skills that become inputs to composition. The two patterns are complementary: SEAgent for skill acquisition, compositional synthesis for skill orchestration.

The [Agent Skills Survey](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) positions SEAgent alongside SAGE (RL-based skill learning) and CUA-Skill (structured knowledge engineering) as three distinct acquisition strategies. SEAgent is the most automated of the three, requiring no human skill authorship or RL reward signal design.

## Strengths

**Zero-shot applicability to new software.** SEAgent does not need someone to have pre-written instructions for the target application. This is the primary use case where it beats alternatives: you need an agent to operate software that no one has bothered to document.

**Produces inspectable artifacts.** Unlike SAGE, which encodes skills in model weights, SEAgent outputs skills as structured text files. These can be audited, shared, and modified. This is not a minor point: the [Agent Skills Survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) identifies the opacity of weight-encoded skills as a fundamental governance problem.

**Curriculum-driven training prevents capability collapse.** The specialist-to-generalist pipeline means the agent develops reliable primitive skills before attempting complex orchestration. This avoids the brittle early failure patterns common in single-stage training.

## Limitations

**Concrete failure mode:** SEAgent's world state model depends on reliably detecting state transitions from GUI observations. When software has animations, delayed rendering, or asynchronous updates (common in web applications), the model may assess state prematurely and conclude an action failed when it is still in progress. This produces incorrect negative feedback that corrupts skill learning. The paper does not report how frequently this occurs or what mitigation exists.

**Infrastructure assumption:** SEAgent assumes a stable, sandboxed execution environment where the agent can repeatedly attempt actions without side effects accumulating. Production software rarely offers this: clicking "send email" or "submit order" has real consequences. The curriculum approach requires failure to be cheap, which is only true in sandboxed evaluation environments.

**Generalization bounds:** The 34.5% result covers five OSWorld environments. OSWorld contains dozens of applications across multiple categories. Whether SEAgent's specialist-to-generalist pipeline transfers across very different application types (web browser vs. spreadsheet vs. image editor) is not established.

**No skill quality metrics.** Success rate measures task completion but not skill quality: reusability, composability, or robustness to variation. A skill that works once under evaluation conditions may fail in production with slightly different UI state.

## When Not to Use SEAgent

If your target software already has well-authored skills or documentation, SEAgent's discovery overhead is waste. Use human-authored [Agent Skills](../concepts/agent-skills.md) directly.

If your environment cannot support sandboxed repeated exploration without side effects, the curriculum-based discovery process will either corrupt real state or require elaborate reset mechanisms that negate the automation benefit.

If you need skills immediately and cannot afford training time, SEAgent's multi-phase discovery pipeline has upfront cost that static skill authoring avoids.

If skill security governance is a hard requirement from day one, SEAgent-discovered skills still need to pass through the vulnerability screening that [Agent Skills](../concepts/agent-skills.md) ecosystem security requires. The 26.1% vulnerability rate in community-contributed skills applies to any untrusted skill source, including machine-generated ones.

## Unresolved Questions

**How does SEAgent handle the phase transition?** The [Agent Skills Survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) documents a phase transition in skill libraries: past a critical size, skill selection accuracy collapses. SEAgent generates skills automatically, which means it could produce large libraries fast. Whether it includes routing or hierarchical organization to avoid this collapse is not addressed.

**What governs skill quality post-discovery?** The world state model provides a binary success signal, but it does not filter for skill efficiency, robustness, or generalizability. Two skills that both change world state correctly may differ dramatically in production reliability. There is no published mechanism for quality ranking among valid discovered skills.

**Cost at scale.** Discovery requires many exploration attempts per software environment. The paper does not report API costs or wall-clock time for skill discovery on the five OSWorld environments. For teams evaluating whether SEAgent is practical, this is essential information that is not available.

**Skill versioning and drift.** Software updates constantly. A skill that correctly operates version N of an application may fail on version N+1. Whether SEAgent supports incremental re-discovery when software changes, or requires full re-training, is not addressed.

## Alternatives

**SAGE ([Agent Skills](../concepts/agent-skills.md) survey):** Use when you have a defined task distribution and can design RL reward signals. SAGE achieves 72.0% on AppWorld through reinforcement learning rather than exploration-based discovery. More reliable on known task types, but cannot generalize to truly novel software.

**CUA-Skill:** Use when human experts are available to author skills as parameterized execution graphs. Achieves 57.5% on WindowsAgentArena with strong composability properties. Higher upfront human cost, but produces highest-quality skills with explicit preconditions and failure recovery.

**Voyager-style skill libraries** ([Voyager](../projects/voyager.md)): Use for open-ended exploration domains with clear state feedback. Voyager's pattern (executable code + text embedding retrieval + self-verification) applies well to Minecraft-like environments with deterministic game state. Less applicable to GUIs where state is visual and ambiguous.

**Human-authored SKILL.md files:** Use when target software is stable, well-understood, and high-stakes enough to warrant expert time. The lowest runtime cost, highest quality, but does not scale.

**[AFlow](../projects/aflow.md) / [EvoAgentX](../projects/evoagentx.md):** Use when the goal is workflow optimization rather than skill discovery for new software. These frameworks optimize existing agent pipelines rather than discovering skills for unknown applications.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md): The broader concept SEAgent implements
- [Compositional Skill Synthesis](../concepts/composable-skills.md): The composition layer that consumes SEAgent-discovered skills
- [Self-Improving Agents](../concepts/self-improving-agents.md): The parent category
- [Voyager](../projects/voyager.md): Parallel architecture for skill discovery in game environments
- [Reinforcement Learning](../concepts/reinforcement-learning.md): Contrasting acquisition approach (SAGE)
- [Procedural Memory](../concepts/procedural-memory.md): What discovered skills externalize

---
entity_id: seagent-project
type: project
bucket: self-improving
abstract: >-
  SEAgent discovers reusable agent skills for previously unseen software tasks
  using a world state model and curriculum generator, achieving 34.5% success on
  novel OSWorld environments vs. 11.3% baseline.
sources:
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
related:
  - seagent
last_compiled: '2026-04-08T23:28:25.629Z'
---
# SEAgent

## What It Does

SEAgent is an autonomous skill discovery system for LLM agents. Given a set of software environments the agent has never encountered, it generates, verifies, and stores reusable skills without human-authored procedural knowledge. The core claim: agents can bootstrap their own capability libraries for novel tasks rather than relying on pre-written instructions or human demonstration.

The primary evaluation is OSWorld, a benchmark of GUI-based computer use tasks. On 5 novel environments, SEAgent achieves 34.5% task success versus an 11.3% baseline without skill discovery, a +23.2 percentage point improvement. These numbers are self-reported in the Agent Skills survey paper and have not been independently replicated.

## Architecture

SEAgent operates through three interconnected components:

**World state model.** Before attempting tasks, SEAgent builds a model of the target software environment: what states are reachable, what actions cause which transitions, what preconditions must hold for an action to succeed. This is the distinguishing feature relative to simpler "try it and see" approaches. The world state model lets the system generate plausible candidate skills before running them, reducing wasted execution.

**Curriculum generator.** Rather than attempting arbitrary tasks, SEAgent generates a training curriculum ordered by difficulty. Easy tasks run first; skills learned from them become building blocks for harder tasks. This is structurally identical to Voyager's automatic curriculum, but applied to software GUI tasks rather than Minecraft. The curriculum is the mechanism that creates compounding returns: each learned skill reduces the effective difficulty of subsequent tasks.

**Specialist-to-generalist training pipeline.** Skills are initially learned for specific contexts (a particular application, a particular version). The pipeline then generalizes these skills by abstracting away context-specific details, producing reusable procedures. A skill for "save a document in LibreOffice Writer" becomes a skill for "save a document" that works across word processors.

Skills are stored as executable code indexed by text embeddings of their descriptions, following the same pattern as [Voyager](../projects/voyager.md)'s skill library. Retrieval at inference time pulls the top-k most relevant skills into context for new task generation.

The system appears to be described in the [Agent Skills for LLMs survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) as a representative acquisition method rather than a standalone released system, so specific file paths and implementation details are not publicly documented.

## How It Fits the Broader Skill Ecosystem

SEAgent addresses the skill acquisition problem within the larger SKILL.md / [Agent Skills](../concepts/agent-skills.md) architecture. The SKILL.md specification defines how skills are stored and loaded (three-level progressive disclosure: metadata → instructions → resources). SEAgent answers *how to create those skills* for unfamiliar environments without human authorship.

The relationship to other acquisition methods in the same space:

- **SAGE** uses RL with sequential rollouts to learn skills through reward signals, achieving 72.0% on AppWorld. Better for environments with clear reward functions.
- **CUA-Skill** uses human-authored parameterized execution graphs, achieving 57.5% on WindowsAgentArena. Better when expert knowledge is available and reliability matters more than autonomy.
- **SEAgent** targets the case where neither reward functions nor human experts are available, and the agent must discover skills for software it has not seen before.

The [Voyager](../projects/voyager.md) architecture is the closest conceptual ancestor: automatic curriculum plus skill library plus iterative self-verification. SEAgent applies this pattern to GUI-based computer use rather than an open-world game.

## Strengths

**Zero human authorship required.** SEAgent generates skills for novel environments without pre-written instructions or demonstrations. For organizations deploying agents across many distinct software tools, this removes a bottleneck: you do not need a domain expert to write SKILL.md files for every application.

**Curriculum ordering reduces wasted exploration.** By tackling easier tasks first, the system builds a usable skill library faster than random exploration. Skills compound: once "open a file" is learned, "open a file and edit it" costs less to acquire.

**Generalization from specialist to generalist.** The pipeline explicitly abstracts skills beyond the specific context they were learned in, making the resulting library more reusable.

**Strong benchmark delta.** +23.2 percentage points on novel OSWorld environments is a substantial improvement. Even if the absolute 34.5% success rate is modest, the relative gain shows the skill library is doing real work.

## Critical Limitations

**Concrete failure mode: world state model accuracy degrades in dynamic software.** SEAgent's world state model assumes software behaves predictably. Modern applications with context-dependent UI states (modal dialogs, asynchronous loading, permission prompts) break this assumption. A skill learned when a dialog is absent may fail when one is present. The world state model has no mechanism for handling non-deterministic UI behavior, which is common in real enterprise software.

**Unspoken infrastructure assumption: stable execution environment.** The system assumes it can run GUI automation reliably, with consistent screen resolution, application versions, and system state. Production deployments frequently encounter version drift, locale differences, accessibility mode variations, and OS-level permission changes that invalidate learned skills. There is no documented mechanism for detecting or recovering from skill invalidation.

**No skill update or deletion.** Like Voyager's skill library, SEAgent's library is append-only. Skills learned from an older application version remain in the library even after the application updates and the skills break. Over time this contaminates the retrieval pool with outdated procedures.

**Modest absolute performance.** 34.5% success on novel environments means two-thirds of tasks still fail. For production use cases that require reliable task completion, this is not acceptable without human oversight and fallback mechanisms.

## When NOT to Use It

**Reliability-critical workflows.** If a task failure causes data loss, financial transactions, or irreversible system changes, 34.5% success is insufficient. Use human-authored skills (CUA-Skill approach) or require [Human-in-the-Loop](../concepts/human-in-the-loop.md) verification.

**Environments with clear reward signals.** If you can instrument the environment to provide explicit success/failure signals, SAGE's RL-based approach achieves 72.0% on its benchmark versus SEAgent's 34.5%. Reward-signal availability is the primary selection criterion.

**Small, well-understood toolsets.** If your agent will operate across 5 known applications, human-authored skills will outperform autonomously discovered ones. SEAgent's value appears when the agent must handle many unfamiliar applications at scale.

**Security-sensitive deployments without governance.** The Agent Skills survey reports 26.1% of community skills contain vulnerabilities. Autonomously generated skills have no human review by definition. Without a security gate (static analysis plus semantic classification at minimum), SEAgent-generated skills should not be deployed in environments with sensitive data or system access.

## Unresolved Questions

**Skill library scaling.** The Agent Skills survey documents a phase transition where skill selection accuracy degrades past a critical library size. SEAgent has no documented strategy for managing this. As the library grows across many novel environments, flat retrieval will eventually fail.

**Generalization quality measurement.** The specialist-to-generalist pipeline claims to produce reusable skills, but there is no documented evaluation of how well generalized skills transfer to applications not seen during training. The +23.2% improvement is on OSWorld; transfer to enterprise software is unknown.

**Cost at scale.** The system requires LLM calls for world state modeling, curriculum generation, code synthesis, and self-verification across many tasks. No compute cost figures are reported. For large-scale deployment across hundreds of software environments, the economics are unclear.

**Conflict resolution between skills.** If two discovered skills solve the same task differently, which one gets retrieved? The survey does not document a conflict resolution mechanism or deduplication strategy.

**Relationship to fine-tuning.** The survey notes that learned skills from systems like SEAgent exist in model weights (for RL-based approaches) or in external libraries (for code-based approaches). For SEAgent specifically, it is not clear whether learned skills are fully externalized as inspectable SKILL.md files or partially encoded in model behavior, which matters for auditability and portability.

## Alternatives

| System | When to choose it |
|--------|------------------|
| [Voyager](../projects/voyager.md) | Open-ended exploration in game environments; same three-component architecture but validated more thoroughly in its domain |
| SAGE | Environments with explicit reward functions; 72.0% AppWorld performance vs. SEAgent's 34.5% OSWorld performance |
| CUA-Skill | When expert knowledge is available and 57.5% reliability is required; human-authored execution graphs with failure recovery |
| [DSPy](../projects/dspy.md) | Prompt and pipeline optimization rather than skill acquisition; better fit when you want to optimize existing workflows rather than discover new capabilities |
| [EvoAgentX](../projects/evoagentx.md) | Workflow-level self-improvement rather than individual skill acquisition |

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md): The broader paradigm SEAgent instantiates
- [Agent Skills](../concepts/agent-skills.md): The storage and deployment layer SEAgent populates
- [Procedural Memory](../concepts/procedural-memory.md): How learned skills function cognitively
- [Continual Learning](../concepts/continual-learning.md): The ongoing acquisition challenge SEAgent addresses
- [Reinforcement Learning](../concepts/reinforcement-learning.md): The learning paradigm SAGE uses as an alternative acquisition method

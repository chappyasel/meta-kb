---
entity_id: seagent
type: project
bucket: self-improving
abstract: >-
  SEAgent is an autonomous skill discovery framework that enables LLM agents to
  learn skills for previously unseen software environments through a world state
  model and curriculum generator, achieving 34.5% success on novel OSWorld tasks
  versus 11.3% baseline.
sources:
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related:
  - composable-skills
  - model-context-protocol
last_compiled: '2026-04-08T03:01:35.117Z'
---
# SEAgent

## What It Does

SEAgent is a self-evolving agent framework that discovers and accumulates skills autonomously for software it has never encountered before. Where most agent systems require humans to author skills or rely on pre-trained behavioral patterns, SEAgent generates skills from scratch by exploring new environments, evaluating what it learns, and refining its skill library over successive iterations.

The central problem SEAgent addresses: LLM agents reach performance ceilings on novel software tasks because their skills were authored for known environments. When an agent encounters unfamiliar GUI software, it lacks the procedural knowledge to act. SEAgent closes this gap through automated discovery rather than human curation.

The framework operates through three coordinating components: a **world state model** that tracks what the agent knows about an environment, a **curriculum generator** that proposes learning objectives at the frontier of the agent's current capability, and a **specialist-to-generalist training pipeline** that distills discovered skills into reusable, generalizable procedures.

## Core Mechanism

SEAgent's architecture mirrors [Voyager](../projects/voyager.md)'s three-component pattern (automatic curriculum + skill library + verification) but applies it to computer-use tasks rather than open-world game play.

**World State Model:** The agent maintains an explicit representation of the target software's state space — what GUI elements exist, what states are reachable, what actions produce what transitions. This model grows as the agent explores. New skill discovery is guided by gaps in the world state model: if a region of the state space is underexplored, the curriculum generator prioritizes it.

**Curriculum Generator:** Proposes exploration tasks ordered by difficulty, starting with achievable sub-goals and progressively introducing harder objectives as the agent's skill library matures. The curriculum is adaptive — failed tasks return to the queue at lower priority, and the generator infers prerequisite orderings from the world state model (you need to navigate to a menu before you can click a submenu item).

**Specialist-to-Generalist Pipeline:** Skills discovered for one specific software environment are abstracted into more general procedures. A skill for "open file in Application X" gets generalized into a skill for "open file via File menu in any GUI application." This generalization is what makes the accumulated skill library transferable rather than environment-specific.

Skill storage follows the progressive disclosure pattern from the [SKILL.md specification](../concepts/composable-skills.md): a brief metadata header for routing decisions, full procedural instructions loaded on trigger, and executable resources loaded on demand. This keeps context window costs manageable as the library grows.

Verification gates skill creation. A skill is added to the library only after the agent confirms task completion — either through environment feedback (state change matches expected outcome) or an LLM critic that evaluates whether the task description was fulfilled. Unverified skills are discarded.

## Key Numbers

On OSWorld benchmark across 5 novel software environments, SEAgent achieves **34.5% success rate** versus **11.3% for the baseline** — a 23.2 percentage point improvement.

These results are reported in [the agent skills survey by Xu and Yan](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md), which synthesizes multiple systems including SEAgent. The numbers are **self-reported** within that survey paper, not from a dedicated SEAgent paper with independent reproduction. The baseline comparison appears to be a capable LLM agent without skill discovery, though the exact baseline configuration is not specified in the survey source material.

The 3x improvement ratio is consistent with Voyager's pattern on Minecraft tasks, which achieved similar multiplicative gains over baselines on novel task generalization. This provides indirect plausibility, though direct comparison is inappropriate given different domains and evaluation protocols.

## Strengths

**Novel environment generalization.** The specialist-to-generalist pipeline produces skills that transfer across software. This is the core differentiator — most skill systems require human-authored skills per application, while SEAgent generates them autonomously.

**Compounding capability.** Each skill discovered becomes available for future discovery sessions. Skills for navigating menus enable skills for accessing settings, which enable skills for configuring applications. The library's value grows non-linearly as composable primitives accumulate. This mirrors Voyager's compounding mechanism but applied to computer-use tasks.

**No human skill authoring.** The autonomous discovery loop requires no domain expert to write SKILL.md files. For enterprises deploying agents across many internal applications, this eliminates a significant bottleneck.

**Curriculum-driven efficiency.** By sequencing objectives from easy to hard, SEAgent avoids wasting exploration budget on tasks that require capabilities the agent does not yet have. The curriculum generator acts as an adaptive difficulty scheduler.

## Critical Limitations

**Concrete failure mode — brittle world state modeling.** The world state model is generated by an LLM interpreting GUI screenshots and state transitions. In software with dynamic interfaces (panels that appear conditionally, state-dependent menus), the model makes incorrect inferences about reachability. A skill discovered under one application state may fail when that state is reached via a different path, because the world state model did not capture the dependency. The agent then retries with wrong assumptions, compounding errors. This is particularly acute for complex enterprise software where GUI state depends on data conditions the agent cannot observe.

**Unspoken infrastructure assumption — stable GUI environments.** SEAgent's curriculum generator assumes that software behaves deterministically across exploration sessions: the same action in the same state produces the same outcome. This assumption breaks in applications with session state, user-specific configurations, network-dependent behaviors, or background processes that alter GUI state. Real enterprise software environments violate this assumption routinely. SEAgent has no mechanism for detecting non-determinism or handling exploration sessions that produce inconsistent world state observations.

## When Not to Use It

**Highly dynamic or stateful applications.** Applications where GUI state depends on external data (CRMs, ERPs, dashboards pulling live data) will produce inconsistent world state models. SEAgent's curriculum and skill verification assume stable state; in dynamic environments, skills that verified correctly may fail immediately on re-execution.

**Security-sensitive environments requiring audited skills.** SEAgent generates skills automatically, which means the resulting SKILL.md files (or equivalent) contain LLM-generated procedural instructions that have not been reviewed by a human. The [agent skills survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) documents that 26.1% of community-contributed skills contain vulnerabilities; autonomously generated skills face the same risk at higher velocity. Any deployment requiring audited, human-reviewed skill procedures should not use automated discovery without a review gate.

**Small, known application sets.** If your agent operates on a fixed set of 3-5 well-understood applications, human-authored skills with the SKILL.md format will outperform autonomous discovery. The specialist-to-generalist pipeline's value emerges at scale — many applications, many environments. For small fixed sets, the exploration overhead is pure cost.

**Latency-sensitive production workflows.** The discovery phase is compute-intensive: multiple exploration episodes, iterative curriculum progression, and skill generalization all require many LLM calls. SEAgent is suited for offline skill acquisition, not for discovering skills during a live user interaction.

## Unresolved Questions

**How does the specialist-to-generalist pipeline decide abstraction level?** The survey describes the pipeline but does not specify the mechanism for determining how general to make a skill. Over-generalization produces skills that are vague and unreliable; under-generalization produces skills that only work for one application. The tradeoff resolution is undocumented.

**What is the cost at scale?** The survey reports task completion rates but not LLM API costs or wall-clock time for the discovery process. For a deployment covering 50 enterprise applications, the exploration and skill generation cost is unknown.

**How does the skill library handle conflicts or redundancy?** When the agent discovers two slightly different skills for the same task (e.g., "open file via keyboard shortcut" and "open file via File menu"), the library management strategy is unspecified. Redundant skills consume routing capacity and may cause inconsistent behavior; the phase transition finding from the agent skills survey — where routing accuracy degrades past a critical library size — makes this a practical concern.

**Who governs autonomously generated skills in production?** Skills generated without human review create a governance gap. The four-tier trust model proposed in the agent skills survey applies to community-contributed human-authored skills; its application to machine-generated skills is not addressed. A production deployment needs a clear policy: do autonomously discovered skills enter at the lowest trust tier and require verification before elevation, or do they get elevated based on task success rate alone?

**Does the self-improvement loop converge or diverge?** The survey shows a snapshot result on 5 environments. It does not document whether extended training continues to improve, plateaus, or degrades (through skill library bloat or accumulated world model errors). Long-run stability is undocumented.

## Alternatives

**[Voyager](../projects/voyager.md):** Same three-component architecture applied to open-world game play. Use Voyager as a reference implementation for the curriculum + skill library + verification pattern in lower-stakes environments where iteration speed matters over GUI task performance.

**[Agent Workflow Memory (AWM)](../projects/agent-workflow-memory.md):** Extracts reusable workflows from task execution traces without requiring an explicit exploration curriculum. Use AWM when you have existing task execution logs and want to distill skills from observed behavior rather than running autonomous discovery.

**[SAGE](../concepts/composable-skills.md):** RL-based skill learning on AppWorld that produces skills in model weights rather than inspectable files. Achieves 72.0% task completion and 26% fewer interaction steps. Use SAGE when you can fine-tune model weights and prioritize task completion rate over skill inspectability.

**Human-authored [SKILL.md](../concepts/composable-skills.md) skills:** For known, stable application sets, human-authored skills with the progressive disclosure architecture outperform automated discovery for the same domain. Use human authoring when the application set is small and fixed, security review is required, or reliability requirements are high.

**[AFlow](../projects/aflow.md):** Automated workflow optimization through search. Use AFlow when you need to optimize a workflow structure rather than discover new skills from scratch.

## Related Concepts

- [Compositional Skill Synthesis](../concepts/composable-skills.md): The broader skill abstraction layer SEAgent contributes to
- [Self-Improving Agents](../concepts/self-improving-agents.md): The category SEAgent belongs to
- [Model Context Protocol](../concepts/model-context-protocol.md): The tool connectivity layer that SEAgent skills invoke
- [Agent Skills](../concepts/agent-skills.md): The formal skill specification SEAgent generates
- [Continual Learning](../concepts/continual-learning.md): The learning paradigm SEAgent implements
- [Procedural Memory](../concepts/procedural-memory.md): The memory type that SEAgent's skill library instantiates

---
entity_id: seagent
type: project
bucket: self-improving
abstract: >-
  SEAgent is an autonomous skill discovery system that learns capabilities for
  previously unseen software through curriculum-guided exploration, achieving
  34.5% success on novel OSWorld environments versus an 11.3% baseline.
sources:
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related:
  - Self-Improving Agents
last_compiled: '2026-04-05T20:38:23.521Z'
---
# SEAgent

## What It Is

SEAgent is an autonomous skill discovery framework that enables agents to acquire capabilities for previously unseen software environments without human-authored examples or labeled training data. Where systems like SAGE use reinforcement learning to improve at known tasks, SEAgent targets the harder problem: encountering software the agent has never used and bootstrapping working skills from scratch.

The system achieves 34.5% success on five novel OSWorld environments, compared to an 11.3% baseline — a 23.2 percentage point improvement. These results are self-reported in the Xu & Yan survey paper; no independent replication is documented.

## Core Mechanism

SEAgent operates through three coupled components:

**World State Model.** The agent maintains a representation of the software's current state, tracking what is visible, what actions are available, and what state transitions each action produces. This model is built through exploration rather than specification — SEAgent discovers the state space by interacting with it.

**Curriculum Generator.** Rather than attempting complex tasks immediately, the curriculum generator sequences objectives from simple to complex, using the world state model to identify which tasks the agent can currently accomplish and which lie just beyond its current capability. This mirrors Voyager's automatic curriculum, applied to GUI software rather than Minecraft.

**Specialist-to-Generalist Training Pipeline.** SEAgent first develops specialist skills for individual sub-tasks, then synthesizes them into generalist capabilities that handle full task workflows. This staged approach avoids the brittleness of trying to learn end-to-end workflows before the underlying sub-skills are reliable.

The discovered skills follow the SKILL.md three-level progressive disclosure architecture described in the [Agent Skills survey](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md): metadata for routing, full instructions loaded on trigger, and resources loaded on demand within execution.

## Relationship to the Skill Ecosystem

SEAgent sits at the acquisition layer of the agent skills stack. Once a skill is discovered and verified, it becomes a portable SKILL.md artifact that other agents can load without repeating the discovery process. This makes SEAgent a skill manufacturer: it runs the expensive exploration process once, and the resulting skills amortize that cost across future deployments.

This contrasts with SAGE, which uses reinforcement learning and sequential rollout across task chains. SAGE improves performance on known task types (72.0% task completion on AppWorld, 26% fewer steps). SEAgent targets novelty — it handles software SAGE has never encountered. The two approaches are complementary rather than competing.

CUA-Skill takes a third path: human experts encode skills as parameterized execution graphs. It achieves 57.5% on WindowsAgentArena, the highest of the three acquisition methods on their respective benchmarks, but it requires significant human labor per skill. SEAgent's value is precisely that it eliminates that labor.

## Strengths

**Cold-start capability.** SEAgent can begin working with software it has never seen, which is the realistic production condition. Most agent skill systems assume pre-existing skill libraries; SEAgent builds those libraries.

**Curriculum-driven efficiency.** The difficulty-aware curriculum prevents the agent from wasting exploration cycles on tasks beyond current capability. The world state model provides grounding that prevents hallucinated actions.

**Exportable artifacts.** Because discovered skills are stored as inspectable SKILL.md files, not opaque model weights, they can be audited, shared across teams, and versioned. This is architecturally significant: SAGE-learned skills exist only in model weights and cannot be inspected or governed.

## Critical Limitations

**One concrete failure mode.** The world state model must correctly represent software state for the curriculum to sequence tasks appropriately. GUI software with ambiguous state — overlapping modal dialogs, asynchronous updates, context-dependent menus — can confuse the state model and produce a curriculum that sequences tasks incorrectly. The agent may attempt tasks that appear achievable based on the state model but fail because the model misread the application's actual state. There is no recovery mechanism described; the agent simply fails and the curriculum does not adapt.

**Unspoken infrastructure assumption.** SEAgent requires a sandboxed, resettable software environment for exploration. Every skill discovery run involves repeated application state transitions, including potentially destructive operations (file deletion, form submission, account changes). In production software, these are irreversible. The OSWorld benchmark provides clean resets; real enterprise software deployments do not. Any production use of SEAgent requires a snapshot-and-restore infrastructure that the paper does not discuss.

## When NOT to Use SEAgent

**Known software with existing skills.** If your target application already has a well-maintained skill library, SEAgent's exploration overhead is waste. Load existing skills and use SAGE-style RL to improve them.

**Real-time requirements.** The world state model construction and curriculum-guided exploration are compute-intensive. SEAgent is appropriate for offline skill discovery, not real-time task execution.

**Environments without state resets.** If you cannot safely roll back application state between exploration steps, SEAgent cannot run without risk of destructive side effects. This rules out most production systems without dedicated sandbox infrastructure.

**Security-sensitive environments.** Skills discovered through automated exploration may include unintended capabilities. The 26.1% vulnerability rate in community-contributed skills applies to machine-generated skills as well. Any SEAgent-discovered skill requires security review before production deployment — the [Agent Skills survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) documents that skills with executable components are 2.12x more vulnerable than instruction-only skills.

## Unresolved Questions

**Skill quality governance.** SEAgent verifies that discovered skills accomplish their target tasks, but the verification mechanism's coverage of edge cases is not documented. How does the system handle software updates that invalidate previously discovered skills? The paper does not address skill lifecycle management.

**Generalization bounds.** The 23.2 percentage point improvement on five novel OSWorld environments is the core empirical claim. Five environments is a small sample. Whether this improvement holds across a broader distribution of software types — particularly enterprise applications with complex permission models or applications designed to resist automation — is unknown.

**Exploration cost at scale.** Curriculum-guided exploration across a new application requires many interaction steps. The paper does not report the number of exploration steps or compute cost required per discovered skill, making it difficult to assess economic viability for large skill libraries.

**Conflict resolution.** When SEAgent discovers a skill that partially overlaps with an existing skill in the library, the selection mechanism must choose between them. The phase transition problem documented in the Agent Skills survey — skill selection accuracy degrades sharply past a critical library size — applies to SEAgent-populated libraries. No hierarchical organization or meta-routing mechanism is described.

## Alternatives

**Use SAGE** when you have known task types and want to improve agent performance through RL, particularly when reducing interaction steps matters (26% reduction, 59% fewer tokens on AppWorld).

**Use CUA-Skill** when you can invest human expertise per skill and need maximum reliability (57.5% on WindowsAgentArena). Human-authored execution graphs are more predictable than autonomously discovered skills.

**Use Voyager's pattern** (automatic curriculum + skill library + iterative self-verification) when you are building in an environment with rich, deterministic feedback signals. Voyager achieves 3.3x more exploration than baselines and reaches 100% success on zero-shot Minecraft tasks, and its architecture transfers to any domain where executable code can be verified.

## Related Concepts and Projects

- [Self-Improving Agents](../concepts/self-improving-agents.md) — the broader paradigm SEAgent implements
- Voyager — the foundational skill library architecture SEAgent extends to GUI domains ([Source](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md))
- SAGE — complementary RL-based skill acquisition ([Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md))
- SKILL.md specification — the portable skill format SEAgent produces ([Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md))

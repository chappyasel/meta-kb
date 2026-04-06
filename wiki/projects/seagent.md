---
entity_id: seagent
type: project
bucket: self-improving
abstract: >-
  SEAgent autonomously discovers and encodes procedural skills for previously
  unseen software environments, achieving 34.5% success on OSWorld vs. 11.3%
  baseline through world-state modeling and curriculum-driven
  specialist-to-generalist training.
sources:
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related: []
last_compiled: '2026-04-06T02:16:38.188Z'
---
# SEAgent

## What It Does

SEAgent is an autonomous skill discovery system for computer-use agents. Given software environments the agent has never encountered, it generates, tests, and encodes procedural skills without human demonstration. The core result: 34.5% task success on 5 novel OSWorld environments versus 11.3% for a baseline agent, a 23.2 percentage point improvement.

The distinguishing factor is the discovery pipeline rather than skill execution. Most skill-based agent systems assume skills are human-authored or learned through RL on known tasks. SEAgent targets the prior step: how does an agent acquire skills for software it has never seen?

## Core Mechanism

SEAgent's pipeline has three components working in sequence:

**World State Model:** Before attempting any task, SEAgent builds a model of the target software's state space. It explores the application systematically, observing UI elements, available actions, and state transitions. This produces a structured representation of what the software can do and how its state changes in response to actions. The world state model is the foundation for curriculum generation -- without it, the curriculum generator has no basis for sequencing skill difficulty.

**Curriculum Generator:** Using the world state model, SEAgent constructs a curriculum of progressively complex objectives. It starts with atomic operations (open a menu, click a specific button) and sequences toward compound tasks (configure a setting that requires navigating three dialog layers). This mirrors Voyager's automatic curriculum but applies it to GUI environments rather than open-world games. The curriculum ensures the agent builds foundational skills before attempting ones that depend on them.

**Specialist-to-Generalist Training Pipeline:** SEAgent trains specialist agents on individual applications, then distills their knowledge into a generalist agent. A specialist for LibreOffice Writer develops deep skills for that application. The distillation step transfers those skills to a generalist that can handle multiple applications. This avoids the failure mode of specialists that cannot transfer: the generalist has explicit training signal from successful specialist behavior, not just task completion labels.

Skills are encoded as executable artifacts (code or structured action sequences) rather than weights, making them inspectable and composable with other skills. Discovered skills feed into a library indexed by text embeddings, following the pattern from [Voyager](../projects/voyager.md).

## Key Numbers

| Metric | SEAgent | Baseline | Delta |
|--------|---------|----------|-------|
| OSWorld (5 novel envs) | 34.5% | 11.3% | +23.2pp |

These numbers are self-reported in the Agent Skills survey paper. No independent replication is cited. The baseline is described as a standard prompted agent without skill augmentation, but the specific model and configuration are not specified in the survey source. The 5-environment scope is narrow -- generalization to the full OSWorld benchmark (broader application coverage) is not reported.

## Architectural Position

SEAgent sits within the broader [Agent Skills](../concepts/agent-skills.md) ecosystem described in the Xu & Yan survey. Its relationship to adjacent systems:

- **SAGE** handles RL-based skill learning on known task distributions. SEAgent handles discovery on novel software, so they address different phases of the skill acquisition problem.
- **CUA-Skill** encodes human expertise as parameterized execution graphs. SEAgent automates what CUA-Skill does manually.
- **[Voyager](../projects/voyager.md)** is the closest architectural ancestor: curriculum + skill library + verification. SEAgent adapts this to GUI environments and adds the specialist-to-generalist distillation step that Voyager lacks.
- **[SKILL.md](../concepts/skill-md.md)** provides the specification format for the skills SEAgent produces. SEAgent's output artifacts are portable SKILL.md-compatible packages in principle, though the survey does not confirm this explicitly.

The world state model is SEAgent's differentiating component. Voyager's curriculum relies on game state (inventory, biome, tech tree progress). SEAgent must model an arbitrary application's state space from scratch, which is harder and less structured. A GUI application does not expose a clean inventory API -- the agent must infer state from visual observations.

## Strengths

**Novel environment coverage:** The primary use case is acquiring skills for software that no human has previously written skills for. A 3x improvement over baseline on completely unseen applications is meaningful for enterprise deployments where organizations use niche internal tools with no community skill ecosystem.

**Executable skill output:** Skills discovered by SEAgent are code, not opaque weights. This means they are auditable, composable, and transferable to other agents or skill registries. Contrast with SAGE, which produces skills embedded in model weights that cannot be inspected or shared.

**Curriculum-driven quality:** By sequencing objectives from simple to complex, SEAgent reduces the probability of a discovered skill depending on an undiscovered prerequisite. This matters for skill composability -- a skill that calls a skill that doesn't exist in the library is useless.

## Critical Limitations

**Failure mode -- world state model accuracy:** SEAgent's curriculum and skills are only as good as its world state model. For applications with dynamic or contextual state (a UI that changes based on document content, or an app where menus are context-sensitive), the world state model may be incomplete or wrong. Skills generated from an inaccurate state model will fail in edge cases the model did not capture. The survey provides no analysis of world state model accuracy or how errors propagate into skill quality.

**Infrastructure assumption:** SEAgent requires a sandboxed environment where the agent can freely explore an application and observe state transitions without consequences. In production, many applications have irreversible actions (send email, submit form, delete file). Safe exploration requires either a fully sandboxed replica of the target application or action filtering that prevents irreversible operations during the discovery phase. Most enterprise software does not ship with sandbox modes. Setting up this infrastructure is non-trivial and the survey does not discuss it.

## When NOT to Use SEAgent

**Well-supported applications:** If community skills already exist for your target software (major productivity suites, common developer tools), SEAgent's discovery overhead is unnecessary. Retrieve and adapt existing skills rather than rediscovering from scratch.

**Latency-sensitive onboarding:** The discovery pipeline -- world state modeling, curriculum generation, specialist training, distillation -- takes substantial time before any skills are usable. If you need skills available immediately, SEAgent is the wrong approach.

**Highly stateful or irreversible applications:** Financial systems, CRM platforms, or any software where exploration creates real records or transactions are poor candidates unless you can provision full sandbox replicas.

**Small model budgets:** The specialist-to-generalist pipeline implies multiple training rounds. If you are running on smaller models or tight compute budgets, the distillation step may not produce sufficient quality transfer.

## Unresolved Questions

**Governance of discovered skills:** Skills discovered by SEAgent are machine-generated and not human-reviewed. The Xu & Yan survey's security analysis found 26.1% vulnerability rates in community skills -- machine-generated skills introduce different but potentially worse risks (the agent may encode flawed state models as reusable procedures). There is no discussion of how SEAgent's output should be audited before entering a production skill registry.

**Scale of curriculum:** The survey reports results on 5 novel OSWorld environments. Whether the curriculum generator degrades on applications with much larger state spaces (enterprise ERP systems, complex IDEs) is unknown.

**Skill maintenance:** Applications update. A skill discovered for version N of an application may break on version N+1. SEAgent's discovery pipeline would need to re-run periodically, but the frequency and trigger conditions for re-discovery are not addressed.

**Distillation fidelity:** How much does the specialist-to-generalist step lose? The 34.5% result reflects the generalist's performance, but if the specialists achieve 60% and the generalist retains only 34.5%, the distillation is lossy in ways worth understanding.

## Alternatives

| System | Choose when |
|--------|-------------|
| CUA-Skill | You have human experts who can author skills and need maximum accuracy on known applications (57.5% on WindowsAgentArena) |
| SAGE | You have a known task distribution and want RL-based skill learning with fewer tokens per task (26% fewer steps) |
| Community SKILL.md skills | Your target application has an existing skill ecosystem and you want zero discovery overhead |
| SEAgent | Target applications have no existing skills and you can provision sandbox environments for safe exploration |

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md) -- The broader framework SEAgent operates within
- [Self-Improving Agents](../concepts/self-improving-agents.md) -- The category SEAgent falls under
- [Skill.md](../concepts/skill-md.md) -- The specification format for skill artifacts
- [Voyager](../projects/voyager.md) -- Architectural ancestor with curriculum + skill library + verification
- [Procedural Memory](../concepts/procedural-memory.md) -- What SEAgent's skills represent
- [Iterative Self-Verification](../concepts/iterative-self-verification.md) -- Quality gating mechanism used in skill validation
- [Reflexion](../concepts/reflexion.md) -- Related self-improvement pattern through feedback loops

## Sources

- [Agent Skills Survey (deep)](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)
- [Agent Skills Survey (summary)](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)
- [Voyager deep analysis](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

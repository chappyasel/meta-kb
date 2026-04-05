---
entity_id: seagent
type: project
bucket: self-improving
sources:
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related: []
last_compiled: '2026-04-05T05:42:49.697Z'
---
# SEAgent

**Type:** Self-improving agent framework
**Bucket:** Self-evolving / autonomous skill discovery
**Primary Source:** [Agent Skills Survey](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) | [Deep Analysis](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

---

## What It Does

SEAgent discovers reusable skills for software environments the agent has never encountered before. Rather than requiring human-authored skill definitions or retraining, it autonomously explores new environments, identifies recurring capability patterns, and encodes them as reusable skills. The headline result: 34.5% success rate on 5 novel OSWorld environments versus an 11.3% baseline, a 23.2 percentage point improvement.

---

## Architectural Components

SEAgent's autonomous discovery pipeline has three main parts:

**World State Model:** Tracks environment state across exploratory episodes. The agent builds an internal model of what software states exist, what actions are available from each state, and what outcomes those actions produce. This gives subsequent skill generation a foundation of observed environment behavior rather than relying on prior knowledge.

**Curriculum Generator:** Proposes progressively complex tasks based on the agent's current capabilities. Tasks at the frontier of demonstrated ability generate the most useful skill candidates. (This mirrors Voyager's automatic curriculum, which proved to be the single most critical component in that system — its removal caused a 93% performance drop.)

**Specialist-to-Generalist Training Pipeline:** Skills discovered through narrow specialist exploration are refined and generalized so they transfer across superficially different task instances. A skill for "close a file dialog in LibreOffice" should generalize to similar dialog interactions elsewhere, not remain brittle to pixel-level UI variation.

The output is skills formatted as SKILL.md specifications — three-level progressive disclosure artifacts with metadata, instructions, and resources. This makes SEAgent-discovered skills compatible with the broader skill ecosystem rather than proprietary to SEAgent's runtime.

---

## How the SKILL.md Format Works

SEAgent's outputs slot into the three-level progressive disclosure architecture:

- **Level 1 (metadata, ~dozen tokens):** Skill name and one-line description. Always resident in the agent's context, used for routing decisions.
- **Level 2 (instructions):** Full procedural guidance, loaded only when the skill triggers. Injected as hidden messages into the conversation context.
- **Level 3 (resources):** Executable scripts, API documentation, configuration templates. Loaded on-demand during skill execution.

This staging matters. An agent can "know about" hundreds of skills at Level 1 cost while paying full context cost only for the 1-2 skills active at any moment. SEAgent produces all three levels automatically from its exploratory episodes.

---

## Key Numbers

| Metric | SEAgent | Baseline |
|---|---|---|
| OSWorld novel environments (5) | 34.5% | 11.3% |
| Absolute improvement | +23.2pp | — |

These results are self-reported by the survey authors summarizing SEAgent's published results. Independent replication has not been documented in the sources available here. The OSWorld benchmark is a standardized GUI agent evaluation suite, so the task definitions are externally defined rather than cherry-picked — that's a point in the credibility column, though the specific environment selection ("5 novel OSWorld environments") warrants scrutiny.

For comparison: SAGE (RL-based skill learning) achieved 72.0% task completion on AppWorld with 26% fewer interaction steps and 59% fewer tokens. CUA-Skill (human-engineered) achieved 57.5% on WindowsAgentArena. SEAgent's 34.5% is lower in absolute terms but addresses a harder problem — skills for environments it has never seen.

---

## Strengths

**Handles novel environments without human authoring.** Most skill frameworks require human experts to write SKILL.md files for each application. SEAgent removes that bottleneck. For enterprises deploying agents across many internal tools, the cost of human skill authoring at scale is prohibitive.

**Produces portable artifacts.** Because SEAgent outputs standard SKILL.md files, the discovered skills can be shared, audited, and imported into other agent systems. This contrasts with SAGE, whose learned skills exist only in model weights.

**Compounding exploration.** Each discovered skill becomes available for subsequent exploration, enabling the agent to build on prior work rather than restarting each episode from scratch.

---

## Critical Limitations

**Concrete failure mode — skill opacity despite portable format.** The survey notes that machine-learned skills (produced by SEAgent and SAGE) sit in an uncomfortable middle ground: the output artifact is readable SKILL.md text, but the quality and correctness of those instructions depends on what the world state model learned. A skill that passed the discovery pipeline's internal verification may encode subtly wrong behavior that only manifests in edge cases. There is no standardized testing framework for skills, and the self-verification mechanisms used during discovery are not independently validated.

**Unspoken infrastructure assumption — clean environment feedback.** SEAgent's curriculum generator and world state model rely on observable state changes to determine whether an action succeeded. GUI automation provides this (you can see whether a dialog closed). But in environments where success signals are ambiguous, delayed, or invisible to the agent, the curriculum cannot determine what skills to build on and what to retry. The 34.5% OSWorld result was produced in an environment designed to have legible feedback. Production software environments frequently lack this.

---

## When NOT to Use SEAgent

**When you have expert-authored skills available.** CUA-Skill's 57.5% WindowsAgentArena result was achieved through human-engineered parameterized execution graphs — substantially higher than what autonomous discovery produces. If human authors know the target environment well, SEAgent's autonomous discovery will produce lower-quality skills at higher computational cost.

**When skill library size will grow large.** The agent skills survey identifies a phase transition: past a critical skill library size, routing accuracy degrades sharply. SEAgent generates many skills automatically, which accelerates hitting this threshold. Without hierarchical organization built in from the start, a SEAgent-populated registry becomes a flat list that the routing mechanism cannot navigate reliably.

**When security governance is required before deployment.** SEAgent-discovered skills with executable scripts are 2.12x more vulnerable than instruction-only skills (based on the broader community skill analysis). Skills produced by autonomous exploration of novel software may encode privilege escalation or data exfiltration patterns the discovery pipeline did not flag. The proposed four-tier governance framework for skill trust is undeployed in production — you would need to build your own gates.

**When the target environment changes frequently.** Skills discovered by exploring an application's current state may not transfer to updated UI layouts or API changes. SEAgent produces static artifacts; it has no mechanism for detecting when a skill has been invalidated by a software update.

---

## Unresolved Questions

**How does skill quality degrade with environment complexity?** The published results cover 5 novel OSWorld environments. It is not documented how SEAgent performs as the target environment grows more complex (more states, more applications, more interaction sequences required). The phase transition in skill selection is a known risk; the analogous transition in skill discovery quality is not characterized.

**What triggers skill rediscovery?** When an application updates and a discovered skill breaks, nothing in the documented architecture detects this or triggers rediscovery. The append-only nature of skill libraries (also a Voyager limitation) means stale skills persist and can mislead future task execution.

**Cost at scale.** Autonomous skill discovery requires many exploratory episodes, each involving multiple LLM calls. The survey does not report token counts or API costs for SEAgent's discovery runs. For an organization trying to cover hundreds of internal applications, the discovery cost may exceed the cost of hiring technical writers to author SKILL.md files manually.

**Conflict resolution between discovered and authored skills.** When SEAgent discovers a skill for an application that also has a human-authored skill, there is no documented mechanism for resolving conflicts or deciding which to use.

---

## Alternatives

| Alternative | When to choose it |
|---|---|
| **SKILL.md with human authors** | Target environments are well-understood and expert knowledge is available. Higher quality ceiling, no discovery cost. |
| **SAGE** | You can afford to fine-tune and want maximum task completion performance within a known environment. 72% on AppWorld, but skills live in model weights. |
| **CUA-Skill** | Windows-specific GUI automation at high accuracy. Human-engineered execution graphs with typed parameters and composability rules. |
| **Voyager-style skill library** | Agent needs lifelong compounding exploration in a single domain with clear feedback signals (e.g., games, sandboxed environments). |

SEAgent occupies a specific niche: novel environments, no available human expertise, portable artifact requirement. Outside that niche, the alternatives produce higher-quality skills with less infrastructure risk.

---

*Related concepts: Skill Libraries | Progressive Context Loading*

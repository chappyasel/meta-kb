---
entity_id: seagent
type: project
bucket: self-improving
abstract: >-
  SEAgent autonomously discovers and codifies reusable agent skills for
  previously unseen software environments, achieving 34.5% success on OSWorld
  versus 11.3% baseline by combining a world state model, curriculum generator,
  and specialist-to-generalist training pipeline.
sources:
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related:
  - mcp
last_compiled: '2026-04-07T11:58:23.077Z'
---
# SEAgent

## What It Does

SEAgent is a self-evolving agent framework that discovers skills autonomously when encountering software environments it has never seen before. Rather than relying on human-authored procedural knowledge or skills baked into model weights during training, SEAgent observes an unfamiliar environment, builds a model of how that environment responds to actions, generates a curriculum of increasingly complex tasks, and encodes what it learns as reusable skills.

The name captures the core claim: the agent improves its own capabilities through structured exploration, without a human defining what it should learn.

## Architectural Components

SEAgent operates through three coupled components:

**World State Model.** Before attempting complex tasks, SEAgent builds a predictive model of the target environment. This model tracks which actions in which states produce which outcomes. It is how SEAgent avoids random flailing — the world state model gives the agent a basis for generating tasks that are achievable with its current capabilities.

**Curriculum Generator.** Rather than sampling tasks uniformly, SEAgent generates tasks in difficulty order, starting from what the world state model indicates is achievable and progressively extending toward harder objectives. This is the same insight as [Voyager](../projects/voyager.md)'s automatic curriculum: knowing *what to try next* matters as much as knowing *how to try it*. The curriculum generator bootstraps skill acquisition by ensuring early tasks are completable, producing skills that become building blocks for later tasks.

**Specialist-to-Generalist Training Pipeline.** SEAgent first trains specialist skills on individual environment types, then synthesizes those specialists into a generalist capable of handling novel environments. This two-stage approach sidesteps the tension between depth (a specialist is better at one environment) and breadth (a generalist handles new environments): develop depth first, then generalize.

The pipeline outputs skills as inspectable, reusable artifacts consistent with the [SKILL.md](../concepts/skill-md.md) specification described in the Agent Skills survey. Each skill encodes procedural knowledge — instructions, scripts, and context — that an agent loads on demand rather than holding in its context window permanently.

## How It Fits Into the Broader Skill Ecosystem

SEAgent addresses one specific acquisition problem: *how does an agent learn skills for environments that no human has yet documented?*

This complements human-authored skills (explicit procedural knowledge) and RL-based skill learning like SAGE (which learns through task chains in known environments). SEAgent's niche is the cold-start case: novel software, unfamiliar APIs, applications with no existing skill corpus. The [Agent Skills](../concepts/agent-skills.md) survey positions SEAgent alongside SAGE and CUA-Skill as parallel acquisition methods, each suited to different conditions.

SEAgent integrates with [Model Context Protocol](../concepts/mcp.md) in the standard complementary pattern: MCP provides connectivity to tools and servers, SEAgent-generated skills provide the procedural knowledge for using those tools correctly.

Discovered skills feed into a skill library with [vector database](../concepts/vector-database.md)-style retrieval: skills are indexed by text embeddings of their descriptions, and the agent retrieves relevant skills by embedding similarity when tackling new tasks. This is the same retrieval pattern Voyager uses. The critical architectural difference is that Voyager stores skills as executable JavaScript tied to a single environment (Minecraft), while SEAgent targets general-purpose GUI and software environments.

## Key Numbers

**OSWorld benchmark, 5 novel environments:** 34.5% success rate vs. 11.3% baseline (+23.2 percentage points).

This is the primary reported result. Source: the Agent Skills survey [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md), which cites SEAgent as a primary example of autonomous skill discovery. The number is self-reported in the original SEAgent work as cited by the survey — not independently validated on a third-party leaderboard as of the survey's publication date.

For context: CoAct-1 achieves 59.9% on OSWorld overall, and human baseline is 72.4%. SEAgent's 34.5% on *novel* environments (the cold-start case) is not directly comparable to overall OSWorld results, which include environments with prior training coverage.

## Strengths

**Cold-start capability acquisition.** SEAgent's primary strength is acquiring skills where no prior skill corpus exists. Systems like CUA-Skill require domain experts to encode knowledge upfront; SEAgent does not. This matters for organizations deploying agents across diverse internal tools and applications.

**Inspectable output.** Discovered skills are externalized as auditable artifacts rather than weight changes. A human can read, audit, and modify what SEAgent learned. This separates SEAgent from approaches like SAGE, where learned skills exist only in model weights.

**Compounding reuse.** Like Voyager, SEAgent's skill library grows cumulatively. Skills from earlier exploration become building blocks for later tasks. The curriculum generator exploits this: it proposes tasks that require composing existing skills, generating more complex skills in turn.

## Critical Limitations

**Concrete failure mode — world state model brittleness on stochastic environments.** The world state model assumes that environment responses to actions are sufficiently predictable to generate a useful curriculum. Real software environments have non-deterministic behavior: network latency, concurrent state changes, modal dialogs appearing unpredictably, background processes modifying application state. When the world state model's predictions diverge from reality, the curriculum generator proposes tasks that appear achievable but are not. The agent then fails repeatedly on tasks it believes it can do, and the skill library fills with low-quality or incorrect skills. There is no described mechanism for detecting and correcting a miscalibrated world state model.

**Unspoken infrastructure assumption — access to a sandboxed execution environment.** SEAgent's exploration phase requires repeatedly attempting actions in the target environment, observing results, and sometimes failing destructively. This presupposes a sandboxed environment where failures are safe and reversible. Production deployments often cannot provide this: attempting and failing to automate a financial transaction or modify a production database has real consequences. The framework implicitly requires that all skill discovery happen in a staging or sandbox environment before skills are deployed, but this constraint is not stated and the gap between sandbox and production behavior can invalidate learned skills.

## When NOT to Use It

**High-stakes environments with no safe exploration sandbox.** If you cannot give SEAgent a safe environment to fail in, its discovery mechanism does not work. Do not deploy SEAgent for direct exploration of production systems.

**Environments with existing high-quality skill libraries.** If your target environment already has well-authored skills (e.g., established productivity software with detailed SKILL.md files, documented MCP servers), SEAgent's autonomous discovery adds cost and complexity with minimal benefit. Use curated skills directly.

**Latency-sensitive applications.** The specialist-to-generalist pipeline is a training process, not a runtime capability. Skill discovery is a batch operation that precedes deployment. If your application requires immediate capability in a new environment with no time for an exploration phase, SEAgent cannot help.

**Narrow, well-defined tasks.** SEAgent's strength is broad, open-ended skill acquisition. For a single well-specified task with no need for skill reuse, the overhead of world state modeling and curriculum generation is not justified.

## Unresolved Questions

**Skill library scaling.** The Agent Skills survey identifies a phase transition: beyond some critical skill library size, routing accuracy degrades sharply. SEAgent's continuous discovery will eventually hit this wall. There is no described mechanism for hierarchical skill organization, deduplication, or pruning as the library grows. What happens at 1,000 discovered skills? 10,000?

**Security governance for machine-generated skills.** The Agent Skills survey reports 26.1% vulnerability rate in human-authored community skills. Machine-generated skills have different failure modes: they may encode correct-but-fragile procedures, discover and encode unintended exploitation paths, or generate skills that work in the sandbox but behave incorrectly in production. The proposed four-tier governance framework in the survey applies to community skills; whether and how it applies to SEAgent-generated skills is not addressed.

**Generalization boundaries.** The 34.5% result covers 5 novel OSWorld environments. Whether the specialist-to-generalist pipeline generalizes to arbitrarily novel environments — or whether it degrades when new environments share few structural properties with the training distribution — is not tested.

**Cost at scale.** Each exploration episode requires multiple LLM calls for world state modeling, curriculum generation, skill attempt, and verification. For organizations with hundreds of internal applications, the total API cost of running SEAgent across all of them is not reported or estimated.

**Conflict resolution between discovered skills.** If SEAgent discovers two skills that accomplish the same task differently, or skills whose preconditions overlap with conflicting effects, there is no described arbitration mechanism.

## Alternatives

- **[Voyager](../projects/voyager.md):** Use when operating in a single well-defined environment (game-like or otherwise structured) where JavaScript code is a valid skill representation. Voyager's skill library pattern is more mature and its ablations are more thorough.

- **CUA-Skill (structured knowledge engineering):** Use when domain experts are available and you want maximum reliability. Human-authored parameterized execution graphs with typed preconditions achieve 57.5% on WindowsAgentArena — higher than SEAgent's 34.5% on novel environments — at the cost of expert labor.

- **SAGE:** Use when you have a defined task distribution and want RL-based skill learning in known environments. SAGE achieves 72.0% task completion on AppWorld with 59% fewer tokens, but requires a training environment, not discovery in novel settings.

- **[Agent Workflow Memory](../projects/agent-workflow-memory.md):** Use when you want to distill successful task execution traces into reusable workflows, without the full exploration machinery SEAgent requires.

- **[EvoAgentX](../projects/evoagentx.md):** Use when the goal is evolving agent *workflows and architectures* rather than accumulating environment-specific procedural skills.

## Related Concepts

- [Self-Improving Agent](../concepts/self-improving-agent.md) — the broader category SEAgent instantiates
- [Agent Skills](../concepts/agent-skills.md) — the skill abstraction SEAgent produces
- [Procedural Memory](../concepts/procedural-memory.md) — the memory type that skill libraries implement
- [Automatic Curriculum](../concepts/automatic-curriculum.md) — the learning strategy SEAgent's curriculum generator implements
- [Skill Files](../concepts/skill-md.md) — the artifact format for discovered skills
- [Continual Learning](../concepts/continual-learning.md) — the learning paradigm SEAgent participates in
- [Model Context Protocol](../concepts/mcp.md) — the connectivity layer skills operate alongside

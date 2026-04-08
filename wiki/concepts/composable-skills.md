---
entity_id: composable-skills
type: approach
bucket: agent-architecture
abstract: >-
  Compositional Skill Synthesis: assembling complex agent capabilities from
  simpler, reusable skill primitives at runtime, enabling novel task handling
  without retraining. Distinguishes from monolithic prompting by treating skills
  as composable units with defined interfaces.
sources:
  - repos/memodb-io-acontext.md
  - repos/affaan-m-everything-claude-code.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related:
  - agent-skills
  - model-context-protocol
  - seagent
  - claude-code
last_compiled: '2026-04-08T03:03:14.934Z'
---
# Compositional Skill Synthesis

## What It Is

Compositional Skill Synthesis is the practice of building complex agent capabilities by combining simpler, reusable skill primitives rather than encoding all competencies in a single monolithic prompt or model. An agent facing a novel task selects, sequences, and composes skills it already possesses to produce behavior it has never explicitly demonstrated before.

The core insight is borrowed from classical software engineering: complexity is manageable when units have clean interfaces and predictable behavior. A skill that "mines iron ore" and a skill that "crafts a furnace" can be composed to produce "smelt iron ingots" without writing that compound skill from scratch. The composition is the synthesis.

This matters because LLMs cannot be retrained on every new task a production system encounters. The alternative to composition is either a massive monolithic prompt (which degrades with length and cannot be maintained) or full fine-tuning (which is expensive and slow). Composition gives a third path: grow capability by combining existing units.

## How It Works

### The Building Blocks: What Counts as a Skill

Skills are packages of procedural knowledge that modify an agent's context and behavior before or during execution. They differ from tools, which are atomic function calls that return outputs. A tool runs code; a skill shapes how the agent reasons about what code to run.

The [Agent Skills](../concepts/agent-skills.md) framework formalizes this in the SKILL.md specification, which structures skills at three levels:

1. **Metadata (~dozen tokens):** Name and one-line description. Always loaded.
2. **Instructions (full procedural guidance):** Loaded only when the skill triggers. Contains the "how to do it" knowledge.
3. **Resources (scripts, reference materials):** Loaded on-demand during execution.

This three-tier progressive disclosure pattern means an agent can "know about" hundreds of skills at trivial token cost while paying the full context price for only the 1-2 skills active at any moment. See [Progressive Disclosure](../concepts/progressive-disclosure.md) for the general pattern.

### Retrieval and Selection

Given a task, the agent must identify which skills to load. Three mechanisms appear in practice:

**Embedding-based retrieval:** Skills are indexed by text embeddings of their descriptions. At task time, the system computes embedding similarity and loads the top-k most relevant skills as context. Voyager uses `text-embedding-ada-002` and retrieves top-5 skills per task — these become available as compositional building blocks for code generation. [Source](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

**Tool search tools:** An agent issues programmatic queries against a skill registry, reducing token overhead by up to 85% compared to loading all skill descriptions into context. This matters as skill libraries scale past a few dozen entries.

**Direct routing:** A meta-agent inspects the task and explicitly names which specialist skills to invoke. This is deterministic but requires the routing agent to have accurate knowledge of available skills.

### Composition Patterns

**Sequential composition:** Skills chain in order, each producing state that the next consumes. The Voyager pattern — where a "smelt iron" skill calls "mine iron ore" and "craft furnace" as subroutines — is the canonical example. Each verified skill becomes callable by later skills, creating compounding depth. [Source](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

**Parallel composition:** Multiple specialist skills run concurrently and their outputs merge. The AIME 2025 result (91.6% with a 30B model) comes from specialized agents each contributing distinct reasoning skills that combine for final answers. This is closer to ensemble methods than sequential pipelines. [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

**Hierarchical composition:** Higher-order skills orchestrate lower-order ones. CUA-Skill implements this as parameterized execution graphs with typed parameters and preconditions. A "complete onboarding workflow" skill invokes "fill form," "upload document," and "verify submission" as named sub-procedures.

**Distillation-to-skill:** Acontext captures successful execution traces, runs a distillation pass over the conversation, and writes the extracted pattern as a new skill file. The new skill is immediately composable with existing ones. This closes the loop from execution to reusable capability. [Source](../raw/repos/memodb-io-acontext.md)

### Verification as Quality Gate

Composition only works if constituent skills are reliable. Voyager's self-verification component uses a dedicated GPT-4 critic to confirm task completion before adding a skill to the library. Removing self-verification causes a 73% performance drop — bad skills corrupt all downstream compositions that depend on them.

Production skill systems need equivalent gates. Static analysis, semantic classification, and sandboxed execution tests serve this role. The 26.1% vulnerability rate found in community skill marketplaces makes the case plainly: unvetted skills will degrade composed capabilities. [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

## Who Implements It

**[Voyager](../projects/voyager.md)** pioneered the composable executable skill library in the Minecraft domain. Skills are stored as verified JavaScript code, indexed by text embeddings, and retrieved as compositional context for new code generation. The paper demonstrates 3.3× more unique exploration and 15.3× faster tech tree progression versus baselines. Results are from the original paper; independent replication of exact numbers is limited.

**[SEAgent](../projects/seagent.md)** discovers skills autonomously for previously unseen software through a world state model and curriculum generator. It achieves 34.5% success on 5 novel OSWorld environments versus 11.3% baseline, a +23.2 percentage point improvement. Self-reported.

**[Agent Workflow Memory](../projects/agent-workflow-memory.md)** extracts reusable workflow patterns from agent execution, storing them for retrieval and composition on similar future tasks.

**[Claude Code](../projects/claude-code.md)** uses SKILL.md-formatted skills loaded from the filesystem. The [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) ecosystem demonstrates this at scale: 156 skills covering backend patterns, testing methodologies, language idioms, and operational procedures, all composable via the progressive disclosure mechanism.

**[Acontext](../raw/repos/memodb-io-acontext.md)** treats memory itself as a skill composition problem. Instead of opaque vector retrieval, agents call `get_skill` and `get_skill_file` tools to fetch procedural knowledge as Markdown, then compose retrieved skills into their current task.

**[DSPy](../projects/dspy.md)** approaches composition at the prompt optimization level: modules with defined input/output signatures can be composed into pipelines that are jointly optimized.

**[AFlow](../projects/aflow.md)** and **[EvoAgentX](../projects/evoagentx.md)** automate the composition search by treating workflow structure as a learnable variable.

## Key Numbers

| System | Task | Result | Notes |
|--------|------|--------|-------|
| Voyager | Unique Minecraft items (160 iterations) | 63 vs ~19 baseline | 3.3× improvement; self-reported |
| Voyager | Diamond tools iterations | 102 vs never reached | Only system to achieve diamond |
| SEAgent | OSWorld novel environments | 34.5% vs 11.3% | +23.2pp; self-reported |
| CUA-Skill | WindowsAgentArena | 57.5% success | State-of-art at time; self-reported |
| Compositional synthesis | AIME 2025 (30B model) | 91.6% | Exceeds individual skills; self-reported |
| SAGE | AppWorld task completion | 72.0% (+8.9pp) | 26% fewer steps, 59% fewer tokens; self-reported |

All figures are self-reported by respective research teams. Independent validation at scale is limited.

## Strengths

**Handles novel tasks without retraining.** A system with skills for "parse JSON," "call REST API," and "write to database" can compose them into a new data pipeline it has never seen before. The components already exist; composition is the only new work.

**Skills compound.** Each new skill added to a library potentially unlocks exponentially more compositions. Voyager's results show this directly: later skills call earlier skills, creating depth that flat prompt engineering cannot achieve.

**Transparent and auditable.** Skills stored as SKILL.md files or executable code are readable by humans. You can inspect what the agent will do before it does it. Compare this to neural skill representations (SAGE, SEAgent) where learned capabilities exist only in model weights.

**Reusable across agents and models.** A SKILL.md file written for one Claude instance can be loaded by another. Acontext exports skills as ZIP archives with no re-embedding required. This portability is structurally impossible with monolithic prompts.

**Separates concerns cleanly.** Skill authors write procedural knowledge once. Composition logic handles assembly. Neither needs to know implementation details of the other.

## Critical Limitations

**Phase transition in selection accuracy.** As skill library size grows past a critical threshold, the agent's ability to select the right skill degrades sharply. This is not a marginal degradation — it is a phase transition where routing accuracy collapses. No current architecture solves this. Flat registries do not scale; hierarchical organization delays the problem but does not eliminate it. [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

**Unspoken infrastructure assumption:** Compositional synthesis assumes that skill descriptions are good proxies for functional relevance. Embedding similarity between "parse structured text" and "extract JSON fields" may be high enough to retrieve the right skill. But skills with misleading names or vague descriptions silently degrade composition quality without any error signal. The entire retrieval layer depends on skill authors writing good metadata.

**One concrete failure mode:** A skill added early with a subtle bug passes self-verification on the training distribution, gets incorporated into 40 downstream composed skills, and produces silent errors weeks later when those compositions encounter edge cases. Because the skill library is append-only in most implementations, there is no mechanism to propagate a fix backward through dependent compositions. The Voyager paper acknowledges this but offers no solution.

## When NOT to Use It

**When you have a narrow, well-defined task domain.** If your agent does one thing (SQL generation, code review, document summarization), a single well-engineered prompt will outperform a composition layer. Composition adds architectural overhead that pays off only when task variety is genuinely high.

**When you cannot afford verification overhead.** Each skill added to a library without quality gates makes the library less reliable over time. If you lack the infrastructure to verify skills before admitting them (automated tests, static analysis, sandboxed execution), you are accumulating technical debt in the composition layer itself.

**When skill selection latency matters.** Progressive disclosure requires skill metadata to be loaded, routing to be computed, and instructions to be injected before task execution begins. For real-time applications where sub-second response is required, this initialization overhead may be unacceptable.

**When your model is too small.** The AIME 2025 composition result used a 30B model. Skill selection, context integration, and multi-skill coordination place substantial demands on the base model's reasoning. Small models (7B and below) tend to misroute or ignore loaded skill instructions, making composition unreliable.

## Failure Modes

**Conflicting skill instructions.** Two loaded skills may give contradictory procedural guidance. There is no standard conflict resolution protocol. The agent falls back to its base training or picks arbitrarily. Systems that load multiple skills simultaneously need explicit priority mechanisms.

**Skill rot.** Environments change (APIs update, platforms deprecate features), but skill libraries do not automatically update. A skill written for one API version silently fails against a newer one. Unlike code in a version-controlled codebase, skill failures are often invisible until an agent produces a wrong result.

**Composition without verification.** Aggregating skills that each individually passed verification does not guarantee the composition is correct. Emergent failures from skill interactions are common and hard to test systematically.

**Embedding drift.** If skill descriptions are indexed by embeddings and the embedding model is later updated or replaced, retrieval quality degrades. Skills that previously ranked well may drop in similarity scores without any change to the skills themselves.

## Unresolved Questions

**How do you version skill dependencies?** If skill A calls skill B, and skill B is updated, does skill A automatically benefit or break? There is no standard dependency management for skill libraries.

**When should learned skills be externalized?** SAGE and SEAgent produce capable skills, but those skills exist only in model weights. Converting weight-based learning into auditable, shareable SKILL.md files would unify the two paradigms, but no system does this.

**What is the right granularity?** Skills can be as fine-grained as "check if file exists" or as coarse as "implement OAuth flow." Coarse skills are more powerful but less reusable. Fine-grained skills compose more flexibly but impose greater selection overhead. No principled answer exists.

**Governance at scale.** Community skill ecosystems (the Clawhub pattern from Acontext, skill marketplaces analyzed in the Agent Skills paper) face the same governance problems as package registries: who reviews contributions, how are malicious skills identified, what happens when a trusted skill author goes rogue? The four-tier trust model in the Agent Skills paper is a proposal, not a deployed system.

## Alternatives

Use [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) when the task requires factual retrieval over a static corpus rather than procedural synthesis. RAG retrieves knowledge; compositional synthesis retrieves and executes procedures.

Use [Chain-of-Thought](../concepts/chain-of-thought.md) prompting when the task is a single, bounded reasoning problem and the overhead of a skill system is not justified. Chain-of-thought amortizes no knowledge across tasks; compositional synthesis does.

Use [Reflexion](../concepts/reflexion.md) when the goal is to improve a single task through self-critique iteration rather than to build reusable capability. Reflexion improves one execution; composition reuses successful executions as building blocks.

Use [Multi-Agent Systems](../concepts/multi-agent-systems.md) when parallelism and specialization are the primary goals rather than capability reuse. Multi-agent coordination can complement composition but solves a different problem.

Use [Prompt Optimization](../concepts/prompt-optimization.md) via [DSPy](../projects/dspy.md) when you want the composition structure itself to be learned from data rather than hand-engineered.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md): The SKILL.md specification that formalizes individual skills as composable units
- [Model Context Protocol](../concepts/model-context-protocol.md): Provides tool connectivity that skills orchestrate; skills specify which MCP servers to use and how
- [Procedural Memory](../concepts/procedural-memory.md): The memory type that stores "how to do things" — compositional synthesis builds and reads from procedural memory
- [Self-Improving Agents](../concepts/self-improving-agents.md): Systems that generate new skills through experience, feeding the composition library
- [SkillBook](../concepts/skill-book.md): The persistent registry pattern for storing and retrieving composable skills
- [Progressive Disclosure](../concepts/progressive-disclosure.md): The three-tier loading pattern that makes large skill libraries tractable
- [Continual Learning](../concepts/continual-learning.md): The broader challenge of accumulating knowledge without forgetting, which compositional skill synthesis partially addresses through external storage
- [Execution Traces](../concepts/execution-traces.md): The raw material that distillation pipelines (like Acontext) convert into new composable skills

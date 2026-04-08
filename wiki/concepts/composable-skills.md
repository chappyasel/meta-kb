---
entity_id: composable-skills
type: approach
bucket: agent-architecture
abstract: >-
  Compositional Skill Synthesis builds complex agent capabilities by dynamically
  selecting and combining simpler skill primitives, with automatic curriculum
  generation ensuring skills are acquired in difficulty order; key
  differentiator is compounding reuse without weight updates.
sources:
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/affaan-m-everything-claude-code.md
  - repos/memodb-io-acontext.md
related:
  - agent-skills
  - model-context-protocol
  - seagent
  - seagent
  - claude-code
last_compiled: '2026-04-08T23:20:31.151Z'
---
# Compositional Skill Synthesis

## What It Is

Compositional Skill Synthesis is an approach to expanding agent capabilities by assembling complex behaviors from simpler, reusable skill primitives rather than training monolithic models. The core claim: a 30B parameter agent that composes the right skills for a math problem can outperform a 72B model that must answer from weights alone.

The approach spans three related mechanisms: (1) dynamic skill selection and composition at inference time, (2) automatic curriculum generation that sequences skill acquisition by difficulty, and (3) skill libraries that accumulate reusable behaviors as executable artifacts. These mechanisms reinforce each other — curriculum generation determines acquisition order, acquired skills enter the library, library growth enables richer composition.

This is distinct from prompt chaining or tool use. Skills modify an agent's *preparation* before task execution: they inject procedural context, activate permissions, and supply compositional building blocks. Tools produce outputs. The difference matters architecturally because skill composition changes what the agent knows going into a task, not just what actions it can take during it.

## Core Mechanism

### Skill Representation

Skills exist on a spectrum from human-authored text to machine-generated executable code. The canonical specification is SKILL.md, a three-level progressive disclosure format:

- **Level 1 (metadata):** ~dozen tokens. Skill name and one-line description. Always loaded for routing decisions.
- **Level 2 (instructions):** Full procedural guidance, loaded only when the skill triggers. Injected as hidden messages into conversation context.
- **Level 3 (resources):** Technical appendices, scripts, reference materials. Loaded on-demand within skill execution.

[Voyager](../projects/voyager.md) uses an alternative representation: skills as executable JavaScript programs indexed by text embeddings (text-embedding-ada-002). The agent retrieves the top-5 relevant skills by embedding similarity before generating code for a new task. Critically, skills can call other skills, creating hierarchical behavior without explicit orchestration.

### Composition Mechanisms

**Dynamic selection:** An orchestrator (specialized agent or retrieval system) matches the current task against skill descriptions and loads the relevant subset. In math benchmarks, specialized agents select from a library of modular reasoning skills per problem. The AIME 2025 result — 91.6% with a 30B solver — demonstrates that this selection quality, not just individual skill quality, drives performance.

**Hierarchical composition:** Skills built on prior skills create compounding capability. Voyager's `smeltIronIngots` skill calls `mineIronOre` and `craftFurnace`, which themselves call more primitive skills. Each new skill that passes self-verification joins the library and becomes available for future composition. This is the compounding mechanism: each verified skill increases the richness of possible compositions for subsequent tasks.

**Compilation:** Multi-agent systems can be "compiled" into single-agent skill libraries. A coordination pattern that requires multiple agents communicating can be encoded as a skill set that a single agent loads. This reduces token overhead and latency while preserving capability — with the critical caveat that a phase transition occurs at some library size where skill selection accuracy degrades sharply.

### Curriculum Generation

Automatic curriculum generation addresses the ordering problem: which skills to acquire when. Voyager's curriculum component (GPT-4 analyzing current inventory, biome, equipment, and exploration progress) proposes objectives at the frontier of current capability. Tasks follow a concise format. A warm-up schedule delays complex environmental information until basic capabilities are established. Failed tasks are retried later rather than abandoned.

The ablation is stark: removing the automatic curriculum causes a 93% drop in unique items discovered in Minecraft, worse than removing any other component. Knowing *what* to learn next matters more than the learning mechanism.

### Self-Verification as Quality Gate

Skills only enter the library after a dedicated critic confirms successful completion. In Voyager, a separate GPT-4 instance receives the task description, generated code, and execution results, then determines whether the task completed and what improvements to make. Up to 4 refinement iterations occur before a task is abandoned. The 73% performance drop from removing self-verification confirms that unverified skills pollute the library with bugs that mislead future composition.

### RL-Based Skill Acquisition (SAGE)

SAGE (Skill Augmented GRPO for self-Evolution) uses reinforcement learning with sequential rollout: agents train across task chains where earlier skills become available for reuse. Results on AppWorld: 72.0% task goal completion, 26% fewer interaction steps, 59% fewer tokens. The mechanism is [GRPO](../concepts/grpo.md)-based training rather than curriculum learning, producing skills embedded in model weights rather than external files.

### Autonomous Skill Discovery (SEAgent)

[SEAgent](../projects/seagent.md) discovers skills for previously unseen software through a world state model, curriculum generator, and specialist-to-generalist training pipeline. On OSWorld: 34.5% success vs 11.3% baseline — a 23.2 percentage point improvement. The key innovation is generalizing from specialist knowledge (skills for specific applications) to generalist capability that transfers across novel environments.

## Key Numbers and Benchmarks

| System | Benchmark | Result | Baseline | Notes |
|--------|-----------|--------|----------|-------|
| Compositional synthesis | AIME 2025 | 91.6% | ~70% (individual skills) | 30B model; self-reported |
| Voyager | Unique items (Minecraft) | 3.3x baseline | AutoGPT, ReAct, Reflexion | Self-reported; single domain |
| Voyager | Tech tree speed | 15.3x faster (wooden tools) | AutoGPT | Self-reported |
| Voyager | Zero-shot generalization | 100% (4/4 tasks) | 0% for all baselines | Self-reported |
| SAGE | AppWorld task completion | 72.0% | ~63% | Self-reported |
| SEAgent | OSWorld (novel envs) | 34.5% | 11.3% | Self-reported |
| CUA-Skill | WindowsAgentArena | 57.5% | — | Self-reported; state-of-art claimed |

All results are self-reported by paper authors. Independent validation is limited. The Voyager Minecraft results are in a constrained single domain; generalization to open-ended real-world environments is not demonstrated.

## Strengths

**Compounding returns without retraining.** Each verified skill enables richer future compositions. The skill library grows monotonically, and unlike weight-based learning, new skills do not overwrite old ones.

**Token efficiency at inference.** Progressive disclosure (the three-level SKILL.md architecture) allows an agent to "know about" hundreds of skills at ~dozen tokens per skill while paying full context cost only for actively executing skills. SAGE further demonstrates 59% token reduction through skill reuse.

**Interpretability and portability.** Skills stored as text files or executable code are auditable, editable, and transferable across agents and frameworks. This is a fundamental advantage over weight-embedded skills (SAGE, SEAgent), which cannot be inspected or shared.

**Strong generalization signal.** Voyager's zero-shot generalization results — 100% on novel tasks using a skill library built in training environments — suggest that compositional skill libraries transfer better than monolithic fine-tuning.

## Critical Limitations

**Phase transition in skill selection.** Beyond a critical library size, routing accuracy collapses. The composition approach assumes accurate skill selection; when the library grows past this threshold, the agent selects wrong skills and performance degrades sharply. No current architecture addresses this scaling limit. Flat skill registries will fail at scale; hierarchical organization is necessary but unvalidated.

**Concrete failure mode:** An agent with 500 skills in a flat registry, asked to solve a novel database optimization problem, retrieves the top-5 by embedding similarity. If the correct skill ("query-plan-analysis") has a description that does not match the user's phrasing ("why is my query slow"), the agent proceeds without it — composing from incorrect primitives and producing confident but wrong output. No fallback exists to detect this mismatch.

**Unspoken infrastructure assumption:** The self-verification pattern assumes reliable task completion signals. Minecraft provides clean signals (inventory changes, crafting success/failure). Production environments often do not. Web automation, data analysis, and multi-step API workflows require domain-specific verification logic that the approach does not supply and that builders must construct from scratch.

## When NOT to Use This

**Single-task systems with narrow scope.** If your agent does one thing well, the overhead of skill library management, curriculum generation, and self-verification exceeds the benefit. Direct prompting or fine-tuning is simpler and more predictable.

**Security-sensitive deployments without governance infrastructure.** The Agent Skills survey found 26.1% of community-contributed skills contain vulnerabilities, with 5.2% showing patterns suggesting malicious intent. Skills that load executable code (2.12x more vulnerable than instruction-only) in a production skill registry without four-tier trust verification represent an unacceptable attack surface. Do not open a skill ecosystem to community contribution without verification gates.

**Environments without reliable verification.** If you cannot define what "task complete" means in your domain with sufficient precision for automated checking, the quality gate breaks down, the library accumulates buggy skills, and composition degrades over time.

**Teams that need fast debugging.** Weight-embedded skills (SAGE, SEAgent) are opaque. If your operational requirement includes explaining why the agent behaved as it did, systems that encode skills in model weights rather than inspectable files are wrong.

## Unresolved Questions

**Phase transition location.** The documentation notes that skill selection accuracy degrades past a critical library size but does not specify where the transition occurs, what factors determine it (skill diversity, description quality, model capability), or how to detect it in production before performance collapses.

**Skill conflict resolution.** When two loaded skills offer contradictory instructions for the same sub-problem, no documented mechanism exists for resolving the conflict. The agent may follow the more recently injected skill, the more prominently described one, or produce inconsistent behavior across runs.

**Cross-platform portability cost.** Skills authored for Claude implicitly depend on Claude-specific behaviors. The survey identifies cross-platform portability as an open challenge but provides no mechanism. Builders moving between models (say, from Claude to GPT-4o) cannot reliably migrate a skill library without re-verification.

**Skill library maintenance over time.** The append-only growth model has no deletion or update mechanism. An early skill that passed self-verification but is subtly wrong remains in the library permanently, potentially misleading future composition. Governance of skill lifecycle (deprecation, versioning, conflict resolution) is largely undiscussed.

**Cost at scale.** SAGE and Voyager-style systems use GPT-4 for curriculum generation, code generation, and verification. At the rate of multiple LLM calls per skill creation, scaling to hundreds or thousands of skills carries substantial cost. No published analysis addresses this.

## Relationships to Adjacent Concepts

Compositional Skill Synthesis sits at the intersection of several established patterns:

- [Agent Skills](../concepts/agent-skills.md) provides the specification layer (SKILL.md, progressive disclosure) that makes skills composable
- [Model Context Protocol](../concepts/model-context-protocol.md) provides the tool connectivity layer that skills orchestrate
- [Reinforcement Learning](../concepts/reinforcement-learning.md) (via SAGE/GRPO) handles skill acquisition when the learning mechanism matters more than interpretability
- [Procedural Memory](../concepts/procedural-memory.md) describes the broader cognitive architecture that skill libraries instantiate
- [Self-Improving Agents](../concepts/self-improving-agents.md) is the parent pattern — compositional synthesis is one mechanism by which agents improve their own capabilities
- [Reflexion](../concepts/reflexion.md) contributes the self-verification pattern; Voyager's critic component is a domain-specific Reflexion instantiation
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) connects to curriculum generation: automatic curricula often require synthesizing training scenarios that do not exist in real data

## Alternatives

**Use [Reinforcement Learning](../concepts/reinforcement-learning.md) directly** when interpretability and skill portability are less important than raw task performance and you have a well-defined reward signal. SAGE-style RL produces better task completion numbers in controlled benchmarks but skills exist only in weights.

**Use [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)** when your knowledge is primarily declarative rather than procedural. RAG retrieves facts; compositional skills retrieve *how to do things*. For question answering over a knowledge base, RAG is simpler and more appropriate.

**Use [Agentic RAG](../concepts/agentic-rag.md)** when you need adaptive retrieval during task execution but not the overhead of skill lifecycle management. Agentic RAG handles dynamic knowledge access without requiring verified skill libraries.

**Use fine-tuning** when your task distribution is stable and narrow, training data is available, and you want capability embedded in weights without runtime overhead. Compositional synthesis trades inference cost (context loading) for training flexibility (no retraining on new skills).

**Use [GEPA](../concepts/gepa.md)** or [Darwin Gödel Machine](../projects/darwin-godel-machine.md) patterns when you want the agent to improve its own architecture, not just its task-level skills. Those approaches target structural self-improvement; compositional synthesis targets behavioral capability accumulation.

## Sources

- [Agent Skills for Large Language Models: Architecture, Acquisition, Security, and the Path Forward](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)
- [Voyager: An Open-Ended Embodied Agent with Large Language Models](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)
- [Acontext: Agent Skills as a Memory Layer](../raw/repos/memodb-io-acontext.md)
- [Everything Claude Code](../raw/repos/affaan-m-everything-claude-code.md)


## Related

- [Agent Skills](../concepts/agent-skills.md) — implements (0.8)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.6)
- [SEAgent](../projects/seagent.md) — implements (0.7)
- [SEAgent](../projects/seagent.md) — implements (0.7)
- [Claude Code](../projects/claude-code.md) — implements (0.5)

---
entity_id: agent-skills
type: concept
bucket: agent-architecture
abstract: >-
  Agent Skills are reusable, self-contained capability packages that LLM agents
  load on demand to extend procedural knowledge without retraining, using a
  three-tier context loading pattern (metadata → instructions → resources) to
  balance rich domain knowledge against finite context windows.
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - repos/memodb-io-acontext.md
  - repos/affaan-m-everything-claude-code.md
  - repos/anthropics-skills.md
  - repos/alirezarezvani-claude-skills.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/letta-ai-letta-code.md
  - repos/letta-ai-letta.md
  - repos/kepano-obsidian-skills.md
  - repos/memento-teams-memento-skills.md
  - repos/letta-ai-lettabot.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - articles/agent-skills-overview.md
  - articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/anthropics-skills.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - claude-code
  - cursor
  - codex
  - anthropic
  - composable-skills
  - claude
  - context-engineering
  - opencode
  - claude-md
  - multi-agent-systems
  - model-context-protocol
  - progressive-disclosure
  - gemini-cli
  - letta
  - skill-book
  - memento
  - tool-registry
  - antigravity
  - loop-detection
  - andrej-karpathy
  - openclaw
  - openai
  - react
  - progressive-disclosure
  - gemini-cli
  - letta
last_compiled: '2026-04-08T02:42:05.460Z'
---
# Agent Skills

## What They Are

Agent skills are self-contained packages of instructions, code, and resources that LLM agents load on demand to extend their capabilities. A skill bundles procedural knowledge — how to invoke a complex API, how to produce a structured document, how to plan a multi-step coding task — in a form that an agent can discover and activate without human intervention.

The distinction from tools matters. A tool is an atomic function call: call a search API, get a result. A skill reshapes what the agent knows and how it behaves before task execution begins. It modifies context and expands available operations rather than producing a direct output. The difference is between handing someone a hammer versus teaching them carpentry.

Skills are distinct from fine-tuning: they inject procedural knowledge at inference time rather than baking it into weights. They are also distinct from retrieval-augmented generation: rather than fetching documents to answer questions, they load instruction sets that change the agent's behavior for an entire task.

[Source: Xu et al. survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

## Why They Matter

The alternative to skills is one of three bad options: put everything in the system prompt (hits context limits fast), fine-tune for each domain (expensive, inflexible), or write verbose per-task instructions every time (labor intensive, inconsistent).

Skills let a single agent handle dozens of specialized domains — document production, API integration, security review, database patterns — while only loading the relevant knowledge when it is actually needed. At scale, this is the only architecture that keeps context budgets manageable while preserving depth.

There is also a portability argument. Skills authored to the [SKILL.md](../concepts/claude-md.md) spec work across [Claude Code](../projects/claude-code.md), Claude.ai, [Cursor](../projects/cursor.md), [OpenCode](../projects/opencode.md), [Gemini CLI](../projects/gemini-cli.md), and [OpenAI Codex](../projects/codex.md). Unlike fine-tuned models, skills can be shared, versioned, audited, and composed.

## How It Works: The Three-Tier Architecture

The central mechanism is progressive disclosure: information stages across three levels to minimize context window consumption.

**Level 1 — Metadata** (~dozen tokens, always loaded): The skill's `name` and one-line `description`. The agent reads this to decide whether the skill is relevant. This is the routing layer. An agent can "know about" hundreds of skills at Level 1 cost with negligible context overhead.

**Level 2 — Instructions** (full procedural guidance, loaded on trigger): The complete "how to do it" knowledge. Injected into conversation context only when the agent determines the skill is relevant. The [anthropics/skills](../raw/deep/repos/anthropics-skills.md) repo recommends keeping this under 500 lines (~5,000 tokens) to avoid context bloat.

**Level 3 — Resources** (loaded on demand within the skill): Technical appendices, executable scripts, reference documentation, configuration templates. The script code never enters the context window — it executes externally. Reference files load selectively based on which sub-domain is active. A skill like `claude-api` can bundle 20+ reference files across 8 programming languages while only loading the relevant language's docs when triggered.

The canonical SKILL.md format specifies these frontmatter fields:

```yaml
name: my-skill          # 1-64 chars, lowercase + hyphens, matches directory
description: >          # 1-1024 chars — the triggering mechanism
  When to activate and what this skill does...
license: MIT            # optional
compatibility: ...      # optional, environment requirements
allowed-tools: "Bash(git:*) Read"  # optional, pre-approved tools
```

[Source: anthropics/skills repo](../raw/deep/repos/anthropics-skills.md) | [Related: CLAUDE.md](../concepts/claude-md.md)

## Triggering: Purely Semantic

Skill activation is entirely semantic. The agent reads the `description` field and decides whether to load the skill. No file-pattern matchers, no programmatic triggers, no project-type detectors.

This is elegant but fragile. Description quality directly determines whether a skill gets used. The [anthropics/skills repo](../raw/deep/repos/anthropics-skills.md) explicitly warns about "undertriggering" and recommends making descriptions "a little bit pushy" — naming specific contexts and use cases, not just what the skill does.

The `claude-api` skill demonstrates precise triggering:
```
TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`
DO NOT TRIGGER when: code imports `openai`/other AI SDK
```

Complex triggering conditions must be re-implemented inside the skill body after activation, because the trigger layer itself only reads the description. This is a known limitation with no clean solution in the current architecture.

## Skill Acquisition Methods

Skills can originate through several mechanisms, each with different tradeoffs between transparency and automation:

**Human-authored SKILL.md files** ([anthropics/skills](../raw/deep/repos/anthropics-skills.md)): Transparent, portable, auditable. Require curation effort. The [SkillBook](../concepts/skill-book.md) in ACE demonstrates this with XML-rendered strategies stored in a persistent JSON file, each with provenance tracking back to the training epoch and trace that generated it.

**RL-based self-acquisition (SAGE)**: Agents train across task chains where earlier skills become available for reuse. Results on AppWorld: 72.0% task completion, 26% fewer interaction steps, 59% fewer generated tokens. The limitation is opacity — learned skills exist in model weights and cannot be inspected or shared.

**Autonomous discovery (SEAgent)**: Discovers skills for unseen software through a world state model and curriculum generator. On OSWorld: 34.5% success vs. 11.3% baseline. Same opacity problem as SAGE.

**Compositional synthesis**: Specialized agents select and compose modular reasoning skills dynamically. A 30B parameter solver achieved 91.6% on AIME 2025 — exceeding what individual skills provide independently. [More detail: Compositional Skill Synthesis](../concepts/composable-skills.md).

**Execution-trace extraction** ([ACE's SkillBook](../projects/ace.md)): A Reflector agent analyzes execution traces and extracts patterns; a SkillManager decides which to persist. Skills carry `InsightSource` provenance records linking them to specific epochs and task traces. This bridges human-authored and machine-learned approaches — skills are generated automatically but stored as inspectable artifacts.

[Source: ACE architecture](../raw/deep/repos/kayba-ai-agentic-context-engine.md)

## Lifecycle Hooks: Enforcing Working Memory

Skills gain significant power when combined with lifecycle hooks. The [planning-with-files skill](../raw/deep/repos/othmanadi-planning-with-files.md) demonstrates the pattern: three persistent markdown files (`task_plan.md`, `findings.md`, `progress.md`) replace volatile context-window state, with hooks that enforce the discipline:

```yaml
PreToolUse:
  - matcher: "Write|Edit|Bash|Read|Glob|Grep"
    hooks:
      - type: command
        command: "cat task_plan.md 2>/dev/null | head -30 || true"
```

This fires before every tool call, injecting the top 30 lines of the task plan into context. The effect: goals remain in the most recent part of the context window, preventing the drift that accumulates over 100+ tool calls ("lost in the middle"). Formal evaluation with 10 parallel subagents showed 96.7% pass rate with the skill vs. 6.7% without — not from adding domain knowledge, but from enforcing process discipline.

The hook types available across platforms:
- `UserPromptSubmit`: Inject context on new user input
- `PreToolUse`: Gate or augment before tool calls
- `PostToolUse`: Update state after tool calls
- `Stop`: Verify completion before agent halts

[Related: Context Engineering](../concepts/context-engineering.md) | [Related: Progressive Disclosure](../concepts/progressive-disclosure.md)

## Scale: What Governance Looks Like at 156 Skills

The [Everything Claude Code](../raw/deep/repos/affaan-m-everything-claude-code.md) (ECC) project demonstrates the engineering challenges at scale: 156 skills across 12 language ecosystems, 38 agents, 6+ agent platforms, a manifest-driven selective install system, and an instinct-learning pipeline.

At this scale, the hard problems shift from individual skill quality to governance:

**Skill overlap**: At 156 skills, conflict is inevitable. `security-review` and `security-scan` may duplicate or contradict each other. ECC's working notes explicitly flag "overlapping skills, hooks, or agents should be consolidated when overlap is material."

**Context budget management**: With 200K total tokens, ECC budgets ~10K for system prompts, 5-8K for resident rules, and 2-5K per MCP tool. The recommendation: no more than 10 active MCPs, and agents avoid the final 20% of context during large refactorings.

**Selective installation**: Installing 156 skills indiscriminately is impractical. ECC uses a manifest-driven pipeline with installation profiles (core, developer, full) and language-specific filtering:
```bash
./install.sh --profile developer --target cursor typescript python
```

**Continuous learning**: ECC v2's instinct system uses `PreToolUse`/`PostToolUse` hooks to capture every tool call into `observations.jsonl`. An Observer Agent (Claude Haiku) runs every 5 minutes, detecting recurring patterns and assigning confidence scores (0.3 tentative → 0.9 near-certain). Patterns decaying from lack of reinforcement fade; confirmed patterns strengthen. The `/evolve` command aggregates 3+ related instincts into a full `SKILL.md` — closing the loop between runtime learning and static skill definition.

[Related: Tool Registry](../concepts/tool-registry.md) | [Related: Loop Detection](../concepts/loop-detection.md)

## The Phase Transition Problem

A critical finding from the Xu et al. survey: beyond some threshold library size, skill selection accuracy degrades sharply. More skills stop helping. The phase transition point varies by architecture, but flat skill registries do not scale indefinitely.

The implication: skill ecosystems need hierarchical organization (categories, sub-categories, meta-skills for routing) rather than flat lists. ECC addresses this partially through installation profiles and language groupings, but does not yet solve the fundamental routing problem for very large libraries.

[Related: Multi-Agent Systems](../concepts/multi-agent-systems.md) | [Related: Meta-Agent](../concepts/meta-agent.md)

## Security: The 26.1% Problem

The Xu et al. survey analyzed 42,447 community skills from major marketplaces and found 26.1% contain at least one vulnerability. Skills with executable scripts are 2.12x more vulnerable than instruction-only skills. A single actor was responsible for 54.1% of confirmed malicious cases, suggesting industrialized exploitation.

Vulnerability categories:
- Data exfiltration: 13.3%
- Privilege escalation: 11.8%
- 5.2% exhibit high-severity patterns suggesting deliberate malicious intent

The threat vector is specific: once a skill's instructions load into context, the agent treats them as authoritative. Long SKILL.md files can inject adversarial instructions through the same trust mechanism that makes legitimate skills work. The `findings.md` separation in planning-with-files is a direct response to this — external content stays in a separate file that is never auto-injected into prompts.

A proposed four-tier governance framework:
- G1: Static analysis (syntax, schema validation)
- G2: Semantic classification (content safety)
- G3: Human review and verification
- G4: Sandboxed execution testing

The framework is proposed, not widely deployed. Production skill ecosystems must build their own gates — the open-source community has not yet solved this.

[Source: Xu et al. security analysis](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

## Implementation Patterns

### Building a Skill

The minimum viable skill:
```
my-skill/
  SKILL.md    # Required: name, description, instructions
```

Expanding with progressive disclosure:
```
my-skill/
  SKILL.md           # Frontmatter + core instructions (<500 lines)
  reference/
    api-docs.md      # Loaded on demand
    examples.md
  scripts/
    validate.py      # Executes without entering context
```

The [anthropics/skills skill-creator](../raw/deep/repos/anthropics-skills.md) provides a meta-skill that automates quality evaluation: it runs A/B tests comparing with-skill vs. baseline outputs, uses an LLM judge to grade results, and iterates on description wording to optimize trigger rates. Full eval loop costs roughly $3.85 and 20 minutes.

### Skill + MCP Composition

Skills and [Model Context Protocol](../concepts/model-context-protocol.md) are complementary. Skills provide "what to do" — procedural knowledge, context, instructions. MCP provides "how to connect" — tool endpoints, server access, data streams. A well-designed skill instructs the agent which MCP servers to use and how to interpret their outputs.

### Filesystem-as-Memory Pattern

For long-running tasks, the planning-with-files pattern converts context engineering from manual discipline into automated guardrail. Three persistent files survive across sessions and context resets. Lifecycle hooks enforce the read-before-act, write-after-act discipline. Formal evaluation: 96.7% vs. 6.7% pass rate. The performance gain comes not from domain knowledge but from working memory management.

[Source: planning-with-files architecture](../raw/deep/repos/othmanadi-planning-with-files.md)

## Failure Modes

**Undertriggering**: The most common failure. The agent decides the skill is not relevant based on a description that does not precisely capture the trigger conditions. Mitigation: aggressive description writing that names specific contexts, file patterns, and use cases.

**Context budget exhaustion**: Hooks that inject content before every tool call can consume thousands of tokens across a long session. Multiply 30 lines × 100 tool calls × 4 bytes = substantial overhead. There is no skill-level token budget mechanism in any current implementation.

**Phase transition at scale**: Beyond some library size threshold, routing accuracy degrades. No current architecture solves this for flat registries. Hierarchical organization helps but does not eliminate the problem.

**Learned skills are opaque**: SAGE, SEAgent, and similar RL-based methods produce effective skills but they exist in model weights. They cannot be audited, shared, or governed. The gap between transparent human-authored skills and opaque machine-learned skills is unresolved.

**No inter-skill communication**: Skills cannot read each other's state or coordinate. A `springboot-tdd` skill cannot verify that `springboot-patterns` is also active. No shared scratchpad, no skill-to-skill messaging.

**Description-only triggering limits composability**: You cannot programmatically compose skill A + skill B and know they will both activate. Skill activation is a probabilistic interpretation of natural language descriptions.

## When Not to Use Skills

**Simple, stable workflows**: If your agent does one thing well, a good system prompt beats a skill architecture. Skills add governance overhead (description optimization, progressive disclosure, hook plumbing) that is only worth paying when you have multiple distinct domains.

**Latency-critical paths**: Skill loading adds at least one context injection event per task. The PreToolUse hook pattern adds latency to every tool call. For sub-second response requirements, this is significant.

**When you need guaranteed activation**: Skills trigger probabilistically based on description matching. If a capability must always activate, build it into the system prompt or tool definitions instead.

**Untrusted skill sources without security gates**: The 26.1% vulnerability rate in community skills means you cannot trust externally sourced skills without validation infrastructure. If you lack the gates (static analysis, semantic review, sandbox testing), don't accept community skills.

## Unresolved Questions

**How do you govern a large skill ecosystem?** The anthropics/skills repo provides naming conventions and marketplace distribution, but no conflict resolution mechanism when two skills give contradictory instructions. ECC's WORKING-CONTEXT.md acknowledges "overlapping or low-signal skill content" as an active problem without a structural solution.

**What is the correct library size before hierarchical routing is required?** The phase transition finding establishes that flat registries fail at scale, but the threshold is architecture-dependent and not yet characterized across different models and task types.

**How do machine-learned skills become portable?** SAGE and SEAgent produce skills that are effective but opaque. Bridging this — enabling agents to externalize learned behaviors as auditable SKILL.md artifacts — would be significant but is not yet solved.

**What does skill versioning look like in production?** Skills are static files with no built-in versioning semantics. The `compatibility` frontmatter field is optional and advisory. When a skill breaks on a new model version, there is no rollback mechanism.

**How should skills handle multi-agent contexts?** [Letta](../projects/letta.md)'s persistent memory and [ACE](../projects/ace.md)'s SkillBook both implement per-agent skill stores. In a [multi-agent system](../concepts/multi-agent-systems.md), it is unclear whether skills should be agent-local, shared across the team, or role-specific.

## Alternatives and Selection Guidance

**Use [ReAct](../concepts/react.md)** when you need dynamic tool selection and reasoning but not reusable procedural packages. ReAct handles tool composition at inference time; skills are more about knowledge delivery than control flow.

**Use [RAG](../concepts/retrieval-augmented-generation.md)** when you need to retrieve documents to answer questions. Skills are for procedural knowledge that changes how an agent behaves; RAG is for factual knowledge that changes what an agent knows.

**Use [CLAUDE.md](../concepts/claude-md.md)** project files when you need persistent project-specific instructions that are not reusable across contexts. CLAUDE.md is always-present context; skills are on-demand context.

**Use [DSPy](../projects/dspy.md)** when you need systematic prompt optimization and pipeline compilation. DSPy treats prompts as learnable parameters; skills treat them as distributable artifacts.

**Use fine-tuning** when the skill represents a capability that every user of a model should have, the behavior is highly stable, and you can afford the retraining cost. Skills are preferable when the capability is optional, evolving, or needs to be shared without model retraining.

**Use [ACE](../projects/ace.md)** when you need a self-improving skill system driven by execution traces, with provenance tracking and confidence-scored learning. ACE's SkillBook is the most mature implementation of runtime skill evolution.

**Use [Memento](../projects/memento.md)** when structured schema validation and formal governance metadata matter more than simplicity. Memento's Pydantic-based SkillManifest with ExecutionMode tracking is more rigorous than SKILL.md's minimal spec.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.8)
- [Cursor](../projects/cursor.md) — implements (0.6)
- [OpenAI Codex](../projects/codex.md) — implements (0.6)
- [Anthropic](../projects/anthropic.md) — part_of (0.6)
- [Compositional Skill Synthesis](../concepts/composable-skills.md) — implements (0.8)
- [Claude](../projects/claude.md) — implements (0.7)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.7)
- [OpenCode](../projects/opencode.md) — implements (0.7)
- [CLAUDE.md](../concepts/claude-md.md) — part_of (0.7)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — part_of (0.7)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.7)
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — implements (0.7)
- [Gemini CLI](../projects/gemini-cli.md) — implements (0.6)
- [Letta](../projects/letta.md) — part_of (0.6)
- [SkillBook](../concepts/skill-book.md) — implements (0.8)
- [Memento](../projects/memento.md) — implements (0.7)
- [Tool Registry](../concepts/tool-registry.md) — part_of (0.7)
- [Antigravity](../projects/antigravity.md) — implements (0.5)
- [Loop Detection](../concepts/loop-detection.md) — part_of (0.6)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.5)
- [OpenClaw](../projects/openclaw.md) — implements (0.6)
- [OpenAI](../projects/openai.md) — part_of (0.5)
- [ReAct](../concepts/react.md) — implements (0.6)
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — implements (0.7)
- [Gemini CLI](../projects/gemini-cli.md) — implements (0.6)
- [Letta](../projects/letta.md) — part_of (0.6)

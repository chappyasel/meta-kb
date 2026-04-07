---
entity_id: agent-skills
type: concept
bucket: agent-memory
abstract: >-
  Agent Skills are reusable, storable capabilities that agents retrieve and
  invoke to accomplish tasks—distinguished from raw prompting by their
  composability, persistence across sessions, and description-driven triggering
  via skill registries.
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - repos/memodb-io-acontext.md
  - repos/affaan-m-everything-claude-code.md
  - repos/anthropics-skills.md
  - repos/alirezarezvani-claude-skills.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/letta-ai-letta.md
  - repos/memento-teams-memento-skills.md
  - articles/agent-skills-overview.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/anthropics-skills.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related:
  - claude-code
  - claude-md
  - cursor
  - anthropic
  - gemini
  - github-copilot
  - claude
  - mcp
  - codex
  - progressive-disclosure
  - continual-learning
  - automatic-curriculum
  - openclaw
  - openai
  - opencode
  - windsurf
  - context-engineering
  - gpt-4
  - voyager
  - skill-md
  - llm-as-judge
  - antigravity
last_compiled: '2026-04-07T11:38:17.366Z'
---
# Agent Skills

## What They Are

Agent skills are discrete, retrievable capability units that an agent can invoke to accomplish specialized tasks. A skill packages domain knowledge, procedural instructions, and optionally executable code into a named, addressable artifact. The agent selects which skills to load based on matching task context against skill descriptions, rather than holding all possible knowledge in context simultaneously.

The concept bridges two older ideas: [Procedural Memory](../concepts/procedural-memory.md) (knowing how to do something) and [Retrieval-Augmented Generation](../concepts/rag.md) (fetching relevant knowledge on demand). Skills differ from both: they are not just retrieved text but callable behaviors, and not just static memory but actively managed capability libraries that can grow, evolve, and compose.

Skills matter because context windows are finite and general-purpose training is shallow. A model trained on millions of documents knows a little about everything; a skill loaded on demand can encode deep, precise knowledge about one domain without occupying context budget during unrelated tasks.

## Why Skills Emerged

The problem agent skills solve is compounding task complexity. As agents tackle longer, more specialized tasks, three pressures converge:

**Context budget**: You cannot load all domain knowledge into every request. An agent helping with Obsidian markdown, Excel formulas, and PDF generation simultaneously would exhaust any context window before the user's first message.

**Knowledge depth**: General training produces average behavior. A skill for the [Anthropic](../projects/anthropic.md) Claude API can encode SDK idioms, authentication patterns, and rate-limit handling across eight programming languages in ways the base model cannot reliably produce from training alone.

**Behavioral consistency**: Skills enforce procedure, not just knowledge. A planning skill that loads before every tool call and forces goal re-reading produces more reliable long-horizon behavior than prompting the model to "remember your goals."

## How Skills Work: Core Mechanisms

### Description-Driven Triggering

The standard triggering mechanism across all major implementations is purely semantic: a `description` field in the skill's metadata states what the skill does and when to activate it. The agent runtime reads these descriptions at startup and matches them against user intent before deciding which skills to load.

This creates a critical design tension. A vague description undertriggers (the skill never loads). An overly broad description overtriggers (the skill consumes context budget on irrelevant tasks). Anthropic's `skill-creator` meta-skill explicitly warns about undertriggering and recommends descriptions that include specific contexts and trigger conditions rather than just capability summaries. The [Claude Code](../projects/claude-code.md) implementation demonstrates this with the `claude-api` skill, which specifies exact trigger conditions (`code imports anthropic`/`@anthropic-ai/sdk`) alongside explicit non-trigger conditions (`code imports openai`).

### Progressive Disclosure

The most architecturally significant pattern across skill implementations is three-tiered loading. The [Anthropic skills repository](https://github.com/anthropics/skills) formalizes this explicitly:

**Tier 1 (always loaded, ~100 tokens)**: Skill name and description. All skills in the registry contribute these to the agent's startup context. This is the triggering surface.

**Tier 2 (loaded on activation, <5,000 tokens recommended)**: The full `SKILL.md` body containing instructions, procedures, and key examples. This loads when the description matches the current task.

**Tier 3 (loaded on demand, unlimited)**: Scripts, reference files, templates, and assets in subdirectories. The skill's instructions tell the agent when to read these; they never enter context unless explicitly needed.

This architecture means a skill library of 20+ skills can operate with a startup overhead of perhaps 2,000 tokens while each skill's deep knowledge (potentially hundreds of pages of API documentation) loads only when relevant.

### Executable Code vs. Declarative Documentation

Implementations diverge on what a "skill" actually contains.

[Voyager](../projects/voyager.md) represents the executable extreme: skills are JavaScript code stored in a library, indexed by text embeddings of their descriptions. When the agent needs to "smelt iron ingots," it retrieves the top-5 most relevant skills by embedding similarity and provides them as compositional building blocks for code generation. The resulting code, once verified, becomes a new skill. This produces strictly reproducible behaviors but limits portability across environments.

Anthropic's SKILL.md format represents the declarative extreme: skills are structured markdown documents with no required code. The `obsidian-skills` repository (authored by Obsidian's CEO) demonstrates this taken to its limit — five skills covering proprietary file formats (`.md`, `.base`, `.canvas`) with zero executable code. The agent reads the documentation and produces correct output through language understanding alone.

Most production implementations occupy the middle: declarative instructions in `SKILL.md` with optional bundled scripts for deterministic operations. The PDF skill in Anthropic's repository bundles eight Python scripts (form extraction, fill, validate, convert) that execute without loading into context. Deterministic operations become scripts; procedural knowledge becomes prose.

### Skill Libraries and Retrieval

Voyager's skill library demonstrates the compounding mechanism that makes skills more valuable over time: skills can compose other skills. A "craft iron pickaxe" skill calls "mine iron ore" and "craft furnace" as sub-skills. New capabilities build on prior ones without retraining. The library grows monotonically because skills are additive, not weight-based — new entries cannot overwrite old ones.

The retrieval mechanism in Voyager uses `text-embedding-ada-002` to index skill descriptions and fetches the top-5 most similar skills as context for each new task. Ablation results confirm this matters: removing the skill library causes plateau in later exploration stages even when curriculum and verification remain intact.

[Memento-Skills](https://github.com/memento-teams/memento-skills) extends this with a read-write reflection loop: after each task execution, the system either increments a skill's utility score (success) or rewrites the skill's underlying code (failure). Skills evolve from live interactions without updating model parameters. The architecture uses Pydantic schemas (`SkillManifest`, `ExecutionMode`) to enforce governance metadata that the SKILL.md format leaves optional.

## Implementations in the Wild

### Coding Agents

[Cursor](../projects/cursor.md), [GitHub Copilot](../projects/github-copilot.md), [Windsurf](../projects/windsurf.md), [OpenCode](../projects/opencode.md), and [OpenAI Codex](../projects/codex.md) all support the SKILL.md format as of early 2026. The convergence on a single specification across competing products is unusually rapid and signals that the format is becoming a de facto standard rather than one vendor's proprietary convention.

[Claude Code](../projects/claude-code.md) provides the most complete implementation: marketplace distribution via `.claude-plugin/marketplace.json`, lifecycle hooks (`PreToolUse`, `PostToolUse`, `Stop`, `UserPromptSubmit`), the `skill-creator` meta-skill for building and benchmarking new skills, and slash commands for skill management.

### Planning Skills

The `planning-with-files` skill (implementing the [Manus AI](https://manus.im) filesystem-as-working-memory pattern) demonstrates how skills can encode process rather than domain knowledge. Its `PreToolUse` hook injects the first 30 lines of `task_plan.md` before every tool call — keeping goals in the model's most recent context where attention is highest. Benchmark results using Anthropic's skill-creator evaluation framework show 96.7% assertion pass rate with the skill vs 6.7% without, across 30 objectively verifiable assertions. The improvement comes not from more information but from enforced process structure.

### The Skill-Creator Meta-Skill

The most architecturally significant skill in Anthropic's repository is `skill-creator` — a skill for building other skills. It implements a full evaluation loop: intent capture, SKILL.md authoring, test case generation, subagent evaluation (with-skill vs. baseline), LLM-as-judge scoring, variance analysis, and description optimization via train/test split. The description optimizer runs each query 3x for statistical reliability, splits 60/40 train/test to prevent overfitting, and iterates up to 5 times.

This closes a gap that most skill systems leave open: how do you know your skill actually improves agent behavior? The meta-skill answers by making measurement part of skill creation.

### Voyager's Lifelong Learning

[Voyager](../projects/voyager.md) produced the strongest empirical evidence for skill library value. Running 160 prompting iterations in Minecraft, it discovered 3.3x more unique items than [ReAct](../concepts/react.md), [Reflexion](../concepts/reflexion.md), and AutoGPT baselines, and progressed through the tech tree 15.3x faster (wooden tools: 6 iterations vs 92 for AutoGPT). Zero-shot generalization to new worlds: 100% success on all tasks vs 0% for non-Voyager baselines. Ablation confirms self-verification as the second most critical component (-73% without it), behind only the automatic curriculum (-93%). These benchmarks are self-reported in the paper; independent replication on the full Voyager benchmark suite has not been published as of this writing.

## The SKILL.md Specification

The `agentskills.io` specification defines the portable format:

```yaml
---
name: skill-name          # Required: 1-64 chars, lowercase + hyphens
description: |            # Required: 1-1024 chars, what + when
  Used when working with...
license: MIT              # Optional
compatibility: |          # Optional: environment requirements
  Requires Python 3.9+
metadata:                 # Optional: arbitrary key-value
  author: example
allowed-tools: |          # Optional, experimental
  Bash(git:*) Read
---
```

The directory convention:
```
skill-name/
  SKILL.md          # Required
  scripts/          # Optional: executable helpers
  references/       # Optional: deep docs
  assets/           # Optional: templates
```

Files in `references/` should be "one level deep from SKILL.md" — the spec explicitly discourages nested reference chains. This constraint prevents complex hierarchical skill architectures but keeps loading predictable.

## Failure Modes

**Undertriggering** is the most common failure. Claude and other agents default to handling requests directly rather than consulting skills. The mitigation is aggressive description writing, but this risks the opposite problem: a skill that loads on every coding task when it should load only on tasks involving a specific SDK.

**Context budget exhaustion from skill accumulation**. Loading multiple skills simultaneously can consume 15,000-20,000 tokens before the conversation content. For 200K+ context window models this is manageable. For smaller windows or cost-sensitive deployments, it is not. No current implementation provides skill-level token budgeting or priority-based unloading.

**Static skills in dynamic environments**. Skills are files. When an API changes, skill instructions become wrong but nothing flags this. A skill for the Anthropic API written in January 2026 may encode deprecated patterns by December 2026. There is no automated staleness detection.

**No inter-skill communication**. Skills cannot read from each other's outputs, share a scratchpad, or trigger each other. A planning skill and a domain-specific skill operate in parallel but independently. Complex tasks requiring both must rely on the agent to coordinate their outputs without explicit support from the skill system.

**Library phase transition**. Voyager's paper notes performance can degrade when the skill library grows too large — retrieval noise increases, prompt overhead grows, and conflicting skills can interfere. The SKILL.md specification provides no guidance for managing library scale beyond keeping individual skills concise.

**Prompt injection via planning files**. The `planning-with-files` skill's `PreToolUse` hook injects `task_plan.md` content before every tool call. If external content (web fetches, API responses) lands in `task_plan.md`, it gets amplified across the entire session. The skill addresses this by separating untrusted content into `findings.md`, but the boundary requires discipline to maintain.

## Relationship to Other Memory Types

Skills occupy a specific position in the [Agent Memory](../concepts/agent-memory.md) taxonomy. [Procedural Memory](../concepts/procedural-memory.md) is their closest analog — both encode "how to do things." But skills extend procedural memory with explicit retrieval, composability, and external storage.

Skills differ from [Episodic Memory](../concepts/episodic-memory.md) (records of what happened) and [Semantic Memory](../concepts/semantic-memory.md) (facts about the world) in that skills are action-oriented: they encode capability rather than knowledge or experience.

[Context Engineering](../concepts/context-engineering.md) is the practice that skills mechanize. Where context engineering describes how to manage what information occupies an agent's context window, skills implement this through structured loading and progressive disclosure.

[Continual Learning](../concepts/continual-learning.md) is what skills enable at the system level: capability accumulation over time without retraining. [Catastrophic Forgetting](../concepts/catastrophic-forgetting.md) — the failure mode where new learning overwrites old in neural networks — does not apply to skill libraries because they are additive file stores, not weight matrices.

## When Not to Use Skills

**Simple, single-domain agents** gain little from skills. If an agent does one thing (code review, translation, summarization), loading a skill library adds latency and token cost for marginal benefit. Skills pay off when task variety is high and domain depth is needed.

**Latency-critical applications** may find the cold-start cost unacceptable. Skill loading requires file reads and potentially subagent calls for complex skills. The `planning-with-files` hook architecture adds 0.5-1 second per tool call.

**Highly dynamic knowledge domains** make static skill files a liability. If the domain changes faster than skill files are updated, agents confidently invoke stale instructions.

**Agents with very small context windows** face fundamental tradeoffs: each skill loaded crowds out actual task content. The progressive disclosure architecture helps but does not eliminate this tension.

## Unresolved Questions

**Governance at scale**: Who curates the skill marketplace? The agentskills.io marketplace currently operates on a trust-based system. There is no formal review process, no security scanning, no way to verify that a third-party skill does what its description claims.

**Conflict resolution**: When two loaded skills give contradictory instructions, the agent has no principled mechanism for adjudication. The SKILL.md spec does not address skill priority or conflict detection.

**Cost at scale**: The full Memento-Skills reflection loop (retrieve, execute, verify, rewrite) runs multiple LLM calls per task. The description optimization loop in `skill-creator` runs up to 300 LLM calls. Neither implementation publishes production cost figures.

**Skill quality drift over time**: Memento-Skills evolves skills based on execution feedback. Whether this produces better skills over time or overfits to recent tasks is not empirically established in the published work.

**Cross-platform behavior consistency**: A skill tested on Claude Code may behave differently on Codex CLI because the underlying model, tool execution environment, and hook system differ. The SKILL.md format is portable; behavior is not guaranteed to be.

## Alternatives and Selection Guidance

Use **[CLAUDE.md](../concepts/claude-md.md) or project-level system prompts** when you need persistent behavioral instructions for a single project rather than reusable capabilities across projects. CLAUDE.md is always loaded; skills are loaded on demand. For project-specific conventions and preferences, CLAUDE.md is simpler.

Use **[MCP tools](../concepts/mcp.md)** when you need typed, schema-enforced function calls to external services. Skills are better at encoding domain knowledge and procedural wisdom; MCP handles structured API access. The JSON Canvas skill points to an MCP server as an alternative interface for the same domain.

Use **[RAG](../concepts/rag.md)** when the knowledge domain is large, frequently updated, and better suited to retrieval than procedural encoding. Skills work well for stable, procedural knowledge; RAG works better for large corpora of facts that change over time.

Use **fine-tuning or [Continual Learning](../concepts/continual-learning.md)** when you need behavior changes that persist at the model level rather than the context level. Skills are frozen model parameters plus dynamic context; fine-tuning modifies the parameters directly.

Use **[Voyager](../projects/voyager.md)'s executable skill library pattern** when your agent operates in a programmable environment and skills need to be compositionally invokable as code. The SKILL.md format is better suited to knowledge transfer to LLMs; Voyager's format is better suited to precise behavioral replication.

## Related Concepts

- [Procedural Memory](../concepts/procedural-memory.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Progressive Disclosure](../concepts/progressive-disclosure.md)
- [Skill Files](../concepts/skill-md.md)
- [CLAUDE.md](../concepts/claude-md.md)
- [Continual Learning](../concepts/continual-learning.md)
- [Automatic Curriculum](../concepts/automatic-curriculum.md)
- [LLM-as-Judge](../concepts/llm-as-judge.md)
- [Agent Memory](../concepts/agent-memory.md)

## Related Projects

- [Voyager](../projects/voyager.md) (primary research implementation)
- [Claude Code](../projects/claude-code.md) (most complete production implementation)
- [OpenClaw](../projects/openclaw.md)
- [Antigravity](../projects/antigravity.md)
- [Anthropic](../projects/anthropic.md) (specification author)

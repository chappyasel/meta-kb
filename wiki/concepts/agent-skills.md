---
entity_id: agent-skills
type: concept
bucket: agent-systems
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - repos/memodb-io-acontext.md
  - repos/alirezarezvani-claude-skills.md
  - repos/anthropics-skills.md
  - repos/othmanadi-planning-with-files.md
  - repos/letta-ai-letta.md
  - repos/memento-teams-memento-skills.md
  - articles/agent-skills-overview.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
related:
  - Claude Code
  - Claude
  - Context Engineering
  - Skill Composition
  - CLAUDE.md
  - AI Research Skills
last_compiled: '2026-04-04T21:15:50.880Z'
---
# Agent Skills

## What It Is

Agent Skills are reusable, composable capabilities that AI agents can invoke to perform specific tasks. Rather than hardcoding task logic into prompts or model weights, skills externalize behavior into discrete, loadable modules—typically structured files combining instructions, scripts, and metadata. An agent's effective capability set becomes the union of its base model plus whatever skills it has access to at runtime.

The core idea: skills are to agents what functions are to programs. They encapsulate a unit of work, expose a clear interface, and can be combined to solve problems neither skill could handle alone.

## Why It Matters

The traditional approach to specializing an LLM—fine-tuning or prompt-stuffing—is expensive, brittle, and hard to update. Skills shift specialization from model parameters to an external registry that can be versioned, swapped, and extended without touching the model. This has practical consequences:

- **Faster iteration**: Fix a broken workflow by editing a skill file, not retraining
- **Modularity**: Different teams own different skills; composition happens at runtime
- **Transparency**: Skill files are human-readable and auditable
- **Portability**: Skills can transfer across agent frameworks if the spec is shared

## How It Works

Anthropic's canonical implementation ([anthropics/skills](../../raw/repos/anthropics-skills.md), 110k stars) uses folders containing YAML-frontmattered markdown files alongside scripts and resources. Claude loads skills dynamically at runtime. A skill folder might contain:

```
my-skill/
  skill.md          # YAML frontmatter + instructions
  scripts/          # Helper scripts the agent can invoke
  resources/        # Templates, schemas, reference data
```

The YAML frontmatter provides metadata (name, description, triggers), while the markdown body contains the actual instructions Claude uses when the skill is active. Skills are discoverable via a registry and selected by the agent (or user) based on task context.

**Acontext** ([memodb-io/acontext](../../raw/repos/memodb-io-acontext.md), 3.2k stars) extends this pattern into a memory layer: execution traces are distilled into skill files post-hoc, so agents accumulate skills from real interactions. This reframes memory from a retrieval problem (find the relevant embedding) to a composition problem (load the relevant skill).

**Memento-Skills** ([memento-teams/memento-skills](../../raw/repos/memento-teams-memento-skills.md), 916 stars) goes further with a self-evolution loop: agents can rewrite their own skills at deployment time based on reflections on past performance. No retraining; the registry is mutable.

## Architecture Patterns

| Pattern | Description | When to Use |
|---|---|---|
| Static Registry | Skills authored by humans, loaded on demand | Stable, well-understood workflows |
| Distilled Skills | Skills generated from execution traces | Accumulating institutional knowledge |
| Self-Evolving Skills | Agent rewrites skills based on performance | Exploratory or long-running deployments |

## Practical Implications

Skills are most useful when:
- The same task recurs across many sessions (brand guidelines, data pipelines, code patterns)
- Domain expertise is better encoded as instructions than as model weight
- Multiple agents need to share capability definitions
- You want non-engineers to contribute to agent behavior

The [CLAUDE.md](../concepts/claude-md.md) convention is an adjacent pattern—a project-level instruction file that functions like a single implicit skill loaded from the working directory.

## Limitations

- **Skill selection is a hard problem**: With a large registry, choosing the right skills (or knowing when to combine them) requires either good retrieval or careful taxonomy
- **Composition failures**: Skills designed independently may conflict or produce unexpected behavior when combined
- **No standard**: There is no universal skill format. Anthropic's spec, Acontext's format, and Memento's format are all different
- **Skill drift**: In self-evolving systems, skills can degrade or develop unexpected behaviors over time without oversight mechanisms
- **Context cost**: Loading many skills consumes context window space, creating a tradeoff between breadth and cost

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — Skills are a primary mechanism for structured context injection
- [Skill Composition](../concepts/skill-composition.md) — How multiple skills are combined to solve complex tasks
- [CLAUDE.md](../concepts/claude-md.md) — Project-level skill-like instructions for Claude Code

## Key Projects

- **anthropics/skills** — The canonical reference implementation (110k stars, Python, Apache-2.0)
- **Acontext** — Skills-as-memory with execution trace distillation (3.2k stars, TypeScript)
- **Memento-Skills** — Self-evolving skills via reflection loop (916 stars, Python)

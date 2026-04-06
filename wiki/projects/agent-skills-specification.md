---
entity_id: agent-skills-specification
type: project
bucket: agent-systems
abstract: >-
  agentskills.io is the canonical specification for a portable,
  YAML-frontmattered skill format for LLM agents, with Anthropic's reference
  implementation defining how skills load progressively into context to balance
  rich domain knowledge against finite token budgets.
sources:
  - repos/anthropics-skills.md
  - deep/repos/anthropics-skills.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - Agent Skills
last_compiled: '2026-04-05T23:16:41.681Z'
---
# AgentSkills.io

## What It Is

AgentSkills.io hosts the canonical specification for Agent Skills: a lightweight format for packaging domain-specific instructions, scripts, and resources so LLM agents can load them on demand. Anthropic built and maintains the spec, and their [anthropics/skills](https://github.com/anthropics/skills) repository (110k stars, 12k forks as of early 2026) serves simultaneously as the spec host, a curated skill marketplace, and the production source for Claude's document capabilities (PDF, DOCX, XLSX, PPTX generation).

The spec's core thesis: instead of embedding task-specific logic into system prompts, bundle it into version-controlled folders that agents trigger automatically based on natural language descriptions.

## Core Mechanism

### The SKILL.md Format

Every skill is a folder with a `SKILL.md` file containing YAML frontmatter plus markdown instructions:

```markdown
---
name: my-skill            # required, 1-64 chars, lowercase + hyphens
description: What this skill does and when to invoke it  # required, 1-1024 chars
license: apache-2.0       # optional
compatibility: Requires Claude Code with Python  # optional, 1-500 chars
allowed-tools: Bash(git:*) Read  # optional, experimental
---

# Instructions
...
```

The spec requires only `name` and `description`. The `allowed-tools` field (experimental) lets skills declare pre-approved tool access, but support varies across agent implementations.

### Three-Tier Progressive Disclosure

The real architectural insight is how skills load. Knowledge enters the context in three layers:

1. **Metadata** (~100 tokens, always resident): The `name` and `description` fields live in the agent's `available_skills` list permanently. This is the sole triggering mechanism.

2. **SKILL.md body** (loaded on trigger, target under 5,000 tokens / ~500 lines): The working instructions the agent follows during execution.

3. **Bundled resources** (loaded on demand, unlimited): Scripts, reference docs, templates. Scripts execute without entering the context window at all.

This solves the context budget problem for skills with deep domain coverage. The `claude-api` skill, for example, bundles reference files across 8 programming languages but only loads the relevant language's docs when triggered. The `pdf` skill bundles 8 Python helper scripts that run deterministically without consuming context tokens.

### Description-Driven Triggering

Triggering is purely semantic: the agent reads the `description` and decides whether to activate the skill. There are no file-pattern matchers or programmatic hooks. This elegance has a cost: description quality directly determines whether a skill gets used at all. The spec recommends making descriptions "a little bit pushy" -- specify contexts and use cases, not just capabilities. The `claude-api` skill demonstrates explicit trigger conditions:

```
TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`
DO NOT TRIGGER when: code imports `openai`/other AI SDK
```

### The Skill-Creator Meta-Skill

The `skills/skill-creator/` directory contains a meta-skill for building and iterating on other skills. It implements an eval-driven development loop: draft SKILL.md, generate test prompts, run with-skill vs. baseline comparisons via subagents, grade with assertions and LLM-as-judge, visualize in an HTML review interface, iterate. A description optimizer runs 3x per query for reliability, uses a 60/40 train/test split to avoid overfitting, and iterates up to 5 times. The full loop runs roughly 300 LLM calls for 20 queries across 5 iterations. Benchmarks from this tooling are self-reported.

## Ecosystem Implementations

The spec has at least two known production implementations:

**Anthropic's reference implementation** ([anthropics/skills](../projects/anthropics-skills.md)): Claude Code, Claude.ai (paid plans), and the Claude API all use the same SKILL.md format. Installation via Claude Code:

```bash
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
```

**Memento-Skills** ([memento-teams/memento-skills](../projects/memento-skills.md)): An independent agent framework that extends the spec with mutable skills. Where Anthropic's skills are static files, Memento's implementation evolves skills at runtime through a Read-Execute-Reflect-Write loop that rewrites skill code and updates utility scores based on task outcomes. It adds Pydantic schemas (`ExecutionMode`, `SkillManifest`, `required_keys`, `parameters`), hybrid BM25 + vector retrieval, and cloud marketplace download. The SkillBuilder validates against agentskills.io naming rules before writing to disk. Benchmarked on HLE and GAIA (arXiv:2603.18743); results are self-reported.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| anthropics/skills stars | 110,064 | GitHub (self-reported) |
| anthropics/skills forks | 12,399 | GitHub (self-reported) |
| Frontmatter name max | 64 chars | Spec |
| Frontmatter description max | 1,024 chars | Spec |
| Recommended SKILL.md length | <500 lines / ~5,000 tokens | Spec + skill-creator |
| Metadata tier | ~100 tokens | Spec |

Star counts are self-reported; no independent benchmark validates skill quality or adoption.

## Strengths

**Minimal adoption barrier.** Two required fields in a markdown file. Teams can ship a skill without any tooling or framework dependency.

**Surface-agnostic portability.** The same SKILL.md works in Claude Code, Claude.ai, and the API. Memento-Skills demonstrates that the format ports to independent frameworks.

**Progressive disclosure scales well.** A skill can bundle arbitrarily large reference material without bloating context for unrelated tasks. The document production skills (xlsx, docx, pptx, pdf) rely on this: complex, production-grade tools that load only when triggered.

**Skills as composable units.** Because skills are folders in a repository, they version-control cleanly, can be reviewed in PRs, and distribute via existing GitHub infrastructure.

## Critical Limitations

**Triggering is fragile.** Semantic triggering has no fallback. A skill that goes unused because its description doesn't match the user's phrasing provides zero value. The spec offers no monitoring mechanism to detect undertriggering in production. You only discover the problem when users stop getting skill-enhanced responses.

**No inter-skill communication.** Skills cannot read each other's outputs, share a scratchpad, or chain. The flat namespace and static trigger model means complex multi-domain workflows must either be handled by a single large skill or by the agent outside the skills system entirely.

**No schema validation by default.** The `skills-ref validate` tool checks naming conventions and frontmatter syntax, but there is no type checking of parameters, no required test coverage, and no standardized quality bar for marketplace skills.

**Static files do not learn.** The Anthropic implementation treats skills as immutable. Improvements require a developer to manually run the skill-creator eval loop, review results, and commit changes. Runtime failures leave no trace in the skill itself.

## When Not to Use It

**Multi-agent orchestration with tight inter-skill dependencies.** If your workflow requires passing structured state between domain capabilities, the flat namespace and absence of inter-skill messaging make this awkward to build. Frameworks with explicit DAG-based orchestration handle this better.

**Environments where you cannot trust LLM-driven triggering.** Safety-critical pipelines where a skill must fire deterministically on specific conditions cannot rely on semantic description matching. You need programmatic hooks.

**Teams that need runtime observability.** The spec provides no native mechanism for tracking trigger rates, skill execution latency, or failure attribution in production. If you need that data, you're building instrumentation from scratch.

**Non-Claude agent runtimes.** The spec is framework-agnostic in principle, but the only production implementations are Claude-specific or Claude-adjacent (Memento-Skills also supports Claude via litellm). OpenAI or open-source model deployments have no reference implementation.

## Unresolved Questions

**Governance of the marketplace.** There is no documented review process for skills added to the anthropics/skills marketplace. It is unclear whether community-submitted skills undergo security review before distribution.

**Cost at scale.** Installing and triggering many skills simultaneously has no documented token budget management. The spec warns about context exhaustion but provides no programmatic controls.

**Spec versioning.** The agentskills.io spec does not publish a version number in the repository. Implementations like Memento-Skills extend the format (adding `execution_mode`, `required_keys`, `parameters`); there is no stated compatibility policy for these extensions.

**`allowed-tools` stability.** The experimental `allowed-tools` frontmatter field has unspecified support across implementations. Whether it will be promoted to stable, deprecated, or extended is undocumented.

## Alternatives

| Option | Choose when |
|--------|-------------|
| [System prompt instructions](../concepts/system-prompts.md) | Single-task deployment with a fixed prompt; no need for modular reuse |
| [MCP (Model Context Protocol)](../concepts/model-context-protocol.md) | You need bidirectional tool communication or structured data exchange between client and server |
| [LangChain tools / LlamaIndex tools](../projects/langchain.md) | You're building on a non-Claude stack and need framework-integrated tool registration |
| Memento-Skills | You need skills that evolve from task execution without developer intervention |

## Related

- [Agent Skills (concept)](../concepts/agent-skills.md)
- [Memento-Skills](../projects/memento-skills.md)
- [anthropics/skills repository](../projects/anthropics-skills.md)

## Sources

- [Anthropic Skills Repository (deep analysis)](../raw/deep/repos/anthropics-skills.md)
- [Memento-Skills Repository (deep analysis)](../raw/deep/repos/memento-teams-memento-skills.md)
- [Anthropic Skills Repository (overview)](../raw/repos/anthropics-skills.md)

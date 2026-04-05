---
entity_id: skill-md
type: concept
bucket: agent-memory
abstract: >-
  SKILL.md is a markdown-plus-YAML-frontmatter convention for packaging
  procedural knowledge as portable files that LLM agents load on demand, solving
  the context-window/capability tradeoff via three-tier progressive disclosure.
sources:
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - repos/alirezarezvani-claude-skills.md
  - repos/memento-teams-memento-skills.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - articles/agent-skills-overview.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/anthropics-skills.md
  - deep/repos/garrytan-gstack.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - Claude Code
  - Anthropic
  - Claude
  - Cursor
  - Model Context Protocol
  - OpenAI Codex
  - Agent Skills
  - Procedural Memory
last_compiled: '2026-04-05T20:26:25.392Z'
---
# SKILL.md

## What It Is

SKILL.md is a file format convention for encoding procedural knowledge that LLM agents can discover, load, and execute. Each skill lives in a named directory containing at minimum a `SKILL.md` file with YAML frontmatter and markdown body. The frontmatter carries a `name` and `description`; the body carries instructions. Supporting files (scripts, reference documents, assets) bundle alongside the SKILL.md in the same directory.

The format is defined at agentskills.io and implemented across Claude Code, Claude.ai, the Claude API, Cursor, OpenAI Codex CLI, and several smaller agent runtimes. The canonical reference implementation lives in the [anthropics/skills](https://github.com/anthropics/skills) repository.

A minimal skill looks like this:

```markdown
---
name: my-skill
description: What this skill does and when to use it (1–1024 chars)
---

## Instructions

Step-by-step guidance the agent follows when this skill is active.
```

The frontmatter spec constrains `name` to 1–64 characters, lowercase and hyphens only, matching the parent directory name. An optional `allowed-tools` field (space-delimited, e.g., `Bash(git:*) Read`) pre-approves tool access. Optional `compatibility` and `metadata` fields carry environment requirements and arbitrary key-value data.

## Why It Exists

LLM agents face a hard tradeoff: rich procedural knowledge improves output quality, but loading everything into context on every request burns tokens and degrades coherence. The alternative — a single massive system prompt — cannot scale to dozens of distinct capabilities.

SKILL.md resolves this through progressive disclosure: keep metadata tiny and always-loaded, load full instructions only when relevant, load supporting resources on demand. The agent pays context cost proportional to what it actually needs.

This is distinct from tool calls. Tools are function calls that return results. Skills reshape the agent's preparation before execution — they modify context and grant permissions rather than producing direct outputs. A skill is closer to an onboarding document than an API endpoint.

## How It Works

### Three-Tier Progressive Disclosure

Tier 1 (~100 tokens, always in context): The `name` and `description` fields sit in the agent's `available_skills` list at all times. The agent reads these to decide whether a skill is relevant to the current task.

Tier 2 (loaded on trigger, <5000 tokens / ~500 lines recommended): The full SKILL.md body. Injected into conversation context when the description matches the user's request. This is the working knowledge for task execution.

Tier 3 (loaded on demand, no size limit): Scripts, reference files, templates, and assets bundled in the skill directory. Scripts can execute without entering the context window at all. Reference files load selectively per instructions in the SKILL.md body.

The practical effect: a skill like `claude-api` can carry 20+ reference files across 8 programming languages while only loading the Python docs when the user is writing Python. The agent "knows about" hundreds of skills at Tier 1 cost while paying full context cost for 1–2 active skills.

### Description-Driven Triggering

Triggering is purely semantic. The agent reads each skill's `description` and decides whether to load the full instructions. No programmatic triggers, no file-pattern matchers, no project-type detectors. This is elegant but has a known failure mode: undertriggering, where the agent handles a task directly without consulting a skill that would improve the output.

The anthropics/skills `skill-creator` documentation explicitly warns that Claude tends to skip skills when they would help. The mitigation is writing descriptions that are "a little bit pushy" — specifying contexts, use cases, and trigger conditions explicitly rather than describing the skill abstractly.

The `claude-api` skill demonstrates precise trigger specification:
```
TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`/`claude_agent_sdk`
DO NOT TRIGGER when: code imports `openai`/other AI SDK
```

### Bundled Scripts

Skills can package deterministic helper scripts that execute without loading into context. The `pdf` skill in anthropics/skills bundles 8 Python scripts for form extraction, filling, validation, and conversion. The SKILL.md body tells the agent when to invoke each script; the script code never enters the context window. This pattern separates deterministic operations (scripts) from instructional guidance (SKILL.md body) and avoids wasting context on code the agent does not need to read.

### Plugin Distribution

The anthropics/skills repository uses a `.claude-plugin/marketplace.json` manifest to organize skills into installable bundles. Installation via Claude Code:

```bash
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
```

The agentskills.io spec provides a `skills-ref validate ./my-skill` CLI for checking frontmatter validity and naming conventions.

## Implementations

Three distinct implementation philosophies have emerged:

**Static registry (anthropics/skills, gstack):** SKILL.md files are authored by humans, committed to version control, and shipped as-is. The `skill-creator` meta-skill in anthropics/skills provides a development-time improvement loop (write → test → grade → iterate) but skills do not change at runtime. This approach maximizes auditability and portability. [Source](../raw/deep/repos/anthropics-skills.md)

**Process pipeline (gstack):** 23+ specialist skills sequenced into a Think-Plan-Build-Review-Test-Ship-Reflect sprint pipeline. Each skill's output feeds the next skill's context through shared filesystem artifacts. The `SKILL.md.tmpl` template system generates committed SKILL.md files from source code metadata (command tables, flag references), preventing documentation drift. CI validates freshness via `--dry-run` + `git diff --exit-code`. [Source](../raw/deep/repos/garrytan-gstack.md)

**Self-evolving registry (Memento-Skills):** Skills are mutable entities with version histories and utility scores. A Read-Execute-Reflect-Write loop lets the agent rewrite skill instructions, adjust prompts, and create new skills from failure patterns at deployment time. The model parameters stay frozen; all adaptation happens in external skill memory. [Source](../raw/deep/repos/memento-teams-memento-skills.md)

## Key Numbers

- **26.1% vulnerability rate** in community-contributed skills across major marketplaces, per a survey of 42,447 skills ([Xu et al. 2025](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)). Skills with executable scripts are 2.12× more vulnerable than instruction-only skills (p<0.001). 5.2% show high-severity patterns suggesting malicious intent. Self-reported by researchers; not independently replicated.
- **85% token overhead reduction** from programmatic tool search over large registries, per the same survey. Self-reported.
- **gstack productivity claims:** 10,000+ lines of code per week, 100 pull requests per week over 50 days. Self-reported by Garry Tan; no independent verification.
- **63,000+ GitHub stars** for gstack; 916 stars for Memento-Skills; anthropics/skills star count varies by snapshot.

## Strengths

**Context efficiency at scale.** The three-tier architecture lets an agent carry hundreds of skills at Tier 1 cost (~dozen tokens each) while paying full context cost only for active skills. This scales where monolithic system prompts do not.

**Cross-runtime portability.** The same SKILL.md file works in Claude Code, Claude.ai, the Claude API, and (with the gstack multi-host system) Cursor, OpenAI Codex CLI, and others. Skills authored to the agentskills.io spec require no host-specific adaptation for basic instruction delivery.

**Composability with external resources.** The progressive disclosure pattern integrates cleanly with MCP: a skill can instruct the agent which MCP servers to use, how to interpret their outputs, and what fallback strategies to apply. Skills provide "what to do"; MCP provides "how to connect."

**Deterministic operations via scripts.** Bundled scripts keep complex logic out of the context window entirely, which improves consistency and reduces token usage for skills with heavy procedural content.

## Critical Limitations

**Undertriggering is the default failure mode.** Because triggering is purely semantic, a skill that would improve output quality may never load if the description does not precisely match how users phrase requests. The anthropics/skills eval tooling requires 300 LLM calls (20 queries × 3 runs × 5 iterations) to systematically optimize a single skill's trigger rate. For most deployments, this cost is prohibitive, which means most skills ship with undertested trigger descriptions.

**The unspoken infrastructure assumption:** Skill-based agent systems assume a runtime that manages skill discovery, description indexing, context injection, and tool-grant activation. A bare LLM API call has none of this. The format is trivially readable by a human, but actually executing the progressive disclosure architecture requires the host agent platform to implement the skill loading protocol. Teams building on raw API access cannot adopt SKILL.md skills without building or adopting a skill runtime layer.

## When Not to Use It

Skip SKILL.md when your agent handles a small, fixed set of capabilities that fit comfortably in a system prompt. The progressive disclosure architecture adds complexity (skill discovery, description indexing, Tier 2/3 loading logic) that buys nothing if you have five capabilities and abundant context budget.

Avoid community-contributed skills in production without security review. The 26.1% vulnerability rate is not theoretical: the survey identified 157 confirmed malicious skills and traced 54.1% of them to a single actor. Skills with executable scripts deserve the same scrutiny as third-party code dependencies.

Do not treat star counts as adoption signals here. gstack's 63,000 stars arrived in 48 hours driven by Garry Tan's social media reach; the gap between starring and daily-driving is likely large for a tool built around one person's workflow.

## Unresolved Questions

**Governance at marketplace scale.** The agentskills.io spec defines the format but not the trust model. Who verifies skills before distribution? What happens when a verified skill later develops vulnerabilities? The anthropics/skills marketplace has no published security review process.

**Phase transition in skill selection.** Research ([Xu et al.](../raw/deep/papers/xu-agent-skills-for-large-knowledge-models-architectu.md)) documents a phase transition where routing accuracy degrades sharply past a critical library size. The threshold is not published. Flat skill registries at scale will hit this wall; hierarchical organization is the likely fix, but no standard approach exists.

**Conflict resolution between skills.** Two skills can give contradictory instructions for the same context. Nothing in the current spec defines priority, merge behavior, or conflict detection. This is a gap that grows with ecosystem size.

**Runtime evolution governance.** Memento-Skills can rewrite its own skills at deployment time. There is no published standard for when runtime-evolved skills should be audited, versioned, or rolled back.

## Alternatives

**System prompts** (no format convention): Use when capabilities are few, stable, and fit within context budget. Zero infrastructure overhead.

**[Model Context Protocol](../concepts/model-context-protocol.md)** (tool connectivity): Use when the problem is connecting to external data sources and services, not encoding procedural knowledge. Skills and MCP are complementary; MCP does not replace the SKILL.md pattern.

**[Memento-Skills](../projects/memento-skills.md)** (self-evolving skill library): Use when the agent needs to adapt from live interactions without retraining, and you can accept a larger framework dependency and Chinese-first documentation.

**[gstack](../projects/gstack.md)** (sprint pipeline): Use when the task is software development following a structured review process and you want 10–15 parallel Claude Code sessions with specialist personas. Not suitable for non-product engineering workflows.

**Hardcoded tool libraries** (LangChain, CrewAI tool registries): Use when you need programmatic tool definitions with typed parameters, schema validation, and testability guarantees. SKILL.md trades these for portability and human readability.

## Related Concepts

- [Procedural Memory](../concepts/procedural-memory.md)
- [Agent Skills](../concepts/agent-skills.md)
- [Model Context Protocol](../concepts/model-context-protocol.md)
- [Context Engineering](../concepts/context-engineering.md)

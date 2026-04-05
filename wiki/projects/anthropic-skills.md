# Anthropic Skills

> Anthropic's official Agent Skills repository -- the canonical implementation of the SKILL.md standard for equipping Claude with composable, domain-specific capabilities via YAML-frontmattered markdown files.

## What It Does

Skills are folders of instructions, scripts, and resources that Claude loads dynamically to improve performance on specialized tasks. Each skill contains a `SKILL.md` file with YAML frontmatter (name + description) and markdown instructions that Claude follows when the skill is active. Skills range from creative applications (art, music, design) to technical tasks (testing web apps, MCP server generation) to enterprise workflows (communications, branding). The repo also includes production document creation skills (DOCX, PDF, PPTX, XLSX) that power Claude's built-in document capabilities.

## Architecture

A skill is minimally a folder with a `SKILL.md` file:

```
my-skill/
  SKILL.md       # YAML frontmatter (name, description) + markdown instructions
  [scripts/]     # Optional helper scripts
  [resources/]   # Optional reference files
```

The frontmatter requires only `name` (unique identifier) and `description` (what it does and when to use it). Claude discovers skills via plugin marketplace, manual installation to `~/.claude/skills/`, or API upload. The Agent Skills specification at agentskills.io defines the standard that other agents (Codex, Cursor, Gemini CLI) also follow.

Skills can be installed via Claude Code plugin marketplace (`/plugin marketplace add anthropics/skills`), the `npx skills` CLI, or direct file copy. The API supports skill upload for programmatic integration.

## Key Numbers

- **110,064 GitHub stars**, 12,399 forks
- Skills work across Claude Code, Claude.ai (paid plans), and Claude API
- Document skills (DOCX, PDF, PPTX, XLSX) are source-available, used in production
- Partner skills from Notion and others
- Apache 2.0 license (example skills), source-available (document skills)

## Strengths

- As the official Anthropic implementation, this defines the standard that the ecosystem builds on -- agentskills.io specification is adopted by Codex, Cursor, Gemini CLI, and 40+ agents
- Skills are pure markdown with optional scripts, making them trivially versionable, shareable, and composable without any runtime dependencies

## Limitations

- Skills are instruction-only -- they cannot modify Claude's tool access, model parameters, or system prompt directly; they rely entirely on the agent following markdown instructions
- No built-in skill versioning, dependency resolution, or conflict detection when multiple skills are loaded simultaneously

## Alternatives

- [gstack.md](gstack.md) -- use when you want a pre-built collection of role-based skills (CEO, designer, QA) as an opinionated development workflow
- [obsidian-skills.md](obsidian-skills.md) -- use when you need skills specifically designed for Obsidian knowledge base operations
- [everything-claude-code.md](everything-claude-code.md) -- use when you want a comprehensive agent harness with skills, memory hooks, and continuous learning

## Sources

- [anthropics-skills.md](../../raw/repos/anthropics-skills.md) -- "Skills are folders of instructions, scripts, and resources that Claude loads dynamically to improve performance on specialized tasks"

---
url: 'https://github.com/kepano/obsidian-skills'
type: repo
author: kepano
date: '2026-04-04'
tags:
  - agentic-skills
  - knowledge-bases
  - obsidian
  - skill-composition
  - agent-tooling
  - markdown-wikis
  - context-engineering
key_insight: >-
  Modular agent skills for Obsidian enable agentic automation of knowledge base
  operations—from markdown creation to canvas visualization to CLI
  interactions—allowing agents to actively maintain and evolve personal
  knowledge systems rather than just query them, directly addressing the gap
  between static RAG and dynamic, agent-driven knowledge graphs.
stars: 19325
forks: 1192
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 7
  signal_quality: 7
  composite: 8.4
  reason: >-
    Directly implements SKILL.md-based modular agent skills for Obsidian
    knowledge bases, covering agentic skill composition, Obsidian workflows, and
    dynamic KB operations—core to topics 1, 3, and 4—with a production-ready,
    installable library and clear documentation.
license: MIT
---
## obsidian-skills

> Agent skills for Obsidian. Teach your agent to use Markdown, Bases, JSON Canvas, and use the CLI.

### Stats

| Metric | Value |
|--------|-------|
| Stars | 19,325 |
| Forks | 1,192 |
| License | MIT |
| Last Updated | 2026-04-04 |

**Topics:** claude, clawdbot, cli, codex, defuddle, obsidian, openclaw, opencode, skills

### README

Agent Skills for use with Obsidian.

These skills follow the [Agent Skills specification](https://agentskills.io/specification) so they can be used by any skills-compatible agent, including Claude Code and Codex CLI.

## Installation

### Marketplace

```
/plugin marketplace add kepano/obsidian-skills
/plugin install obsidian@obsidian-skills
```

### npx skills

```
npx skills add git@github.com:kepano/obsidian-skills.git
```

### Manually

#### Claude Code

Add the contents of this repo to a `/.claude` folder in the root of your Obsidian vault (or whichever folder you're using with Claude Code). See more in the [official Claude Skills documentation](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview).

#### Codex CLI

Copy the `skills/` directory into your Codex skills path (typically `~/.codex/skills`). See the [Agent Skills specification](https://agentskills.io/specification) for the standard skill format.

#### OpenCode

Clone the entire repo into the OpenCode skills directory (`~/.opencode/skills/`):

```sh
git clone https://github.com/kepano/obsidian-skills.git ~/.opencode/skills/obsidian-skills
```

Do not copy only the inner `skills/` folder — clone the full repo so the directory structure is `~/.opencode/skills/obsidian-skills/skills/<skill-name>/SKILL.md`.

OpenCode auto-discovers all `SKILL.md` files under `~/.opencode/skills/`. No changes to `opencode.json` or any config file are needed. Skills become available after restarting OpenCode.

## Skills

| Skill | Description |
|-------|-------------|
| [obsidian-markdown](skills/obsidian-markdown) | Create and edit [Obsidian Flavored Markdown](https://help.obsidian.md/obsidian-flavored-markdown) (`.md`) with wikilinks, embeds, callouts, properties, and other Obsidian-specific syntax |
| [obsidian-bases](skills/obsidian-bases) | Create and edit [Obsidian Bases](https://help.obsidian.md/bases/syntax) (`.base`) with views, filters, formulas, and summaries |
| [json-canvas](skills/json-canvas) | Create and edit [JSON Canvas](https://jsoncanvas.org/) files (`.canvas`) with nodes, edges, groups, and connections |
| [obsidian-cli](skills/obsidian-cli) | Interact with Obsidian vaults via the [Obsidian CLI](https://help.obsidian.md/cli) including plugin and theme development |
| [defuddle](skills/defuddle) | Extract clean markdown from web pages using [Defuddle](https://github.com/kepano/defuddle-cli), removing clutter to save tokens |

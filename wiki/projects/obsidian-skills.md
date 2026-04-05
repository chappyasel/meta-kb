# Obsidian Skills

> Modular agent skills for Obsidian that teach AI agents to create and edit Obsidian Flavored Markdown, Bases databases, JSON Canvas files, and interact via CLI -- enabling agents to actively maintain and evolve personal knowledge systems.

## What It Does

Obsidian Skills provides five SKILL.md-based capabilities that equip AI agents with knowledge of Obsidian-specific formats and workflows:

- **obsidian-markdown**: Create and edit files with wikilinks, embeds, callouts, properties, and Obsidian-specific syntax
- **obsidian-bases**: Create and edit Bases databases with views, filters, formulas, and summaries
- **json-canvas**: Create and edit JSON Canvas files with nodes, edges, groups, and connections for visual note-taking
- **obsidian-cli**: Interact with vaults via the Obsidian CLI, including plugin and theme development
- **defuddle**: Extract clean markdown from web pages using Defuddle, removing clutter to save tokens

These skills let agents go beyond querying a knowledge base to actively constructing and maintaining it -- creating notes, linking concepts, building visual canvases, and managing vault structure.

## Architecture

Each skill follows the Agent Skills specification (agentskills.io):

```
skills/
  obsidian-markdown/SKILL.md
  obsidian-bases/SKILL.md
  json-canvas/SKILL.md
  obsidian-cli/SKILL.md
  defuddle/SKILL.md
```

Pure markdown instructions with no runtime dependencies. Installable via plugin marketplace (`/plugin marketplace add kepano/obsidian-skills`), `npx skills add`, or manual copy to `~/.claude/skills/`. Compatible with Claude Code, Codex CLI, OpenCode, and any agent supporting the Agent Skills specification. Created by Steph Ango (kepano), CEO of Obsidian.

## Key Numbers

- **19,325 GitHub stars**, 1,192 forks
- 5 skills covering core Obsidian workflows
- Compatible with Claude Code, Codex CLI, OpenCode, OpenClaw
- MIT license
- Created by Obsidian's CEO

## Strengths

- Authoritative coverage of Obsidian formats from the tool's own creator -- the skills encode correct syntax for wikilinks, callouts, Bases, and Canvas that generic agents would get wrong
- The defuddle skill for web-to-markdown extraction is a practical token-saving utility that complements knowledge base building

## Limitations

- Obsidian-specific by design -- these skills have no utility outside the Obsidian ecosystem
- No skills for Obsidian's plugin API development, Dataview queries, or community plugin interactions -- coverage is limited to core formats

## Alternatives

- [anthropic-skills.md](anthropic-skills.md) -- use when you need the general skill standard and want to build your own domain-specific skills
- [planning-with-files.md](planning-with-files.md) -- use when you want persistent markdown planning without Obsidian-specific syntax

## Sources

- [kepano-obsidian-skills.md](../../raw/repos/kepano-obsidian-skills.md) -- "Agent skills for Obsidian. Teach your agent to use Markdown, Bases, JSON Canvas, and use the CLI"

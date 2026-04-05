# Obsidian Skills

> SKILL.md modules that teach AI agents to operate Obsidian vaults -- covering Obsidian Markdown, Bases, JSON Canvas, CLI, and web extraction -- enabling agents to author and maintain knowledge bases rather than just query them.

## What It Does

Obsidian Skills provides a set of modular skill definitions (SKILL.md files) that enable AI coding agents to perform knowledge base operations inside Obsidian vaults. Five skills cover the core surface area: obsidian-markdown (create/edit Obsidian Flavored Markdown with wikilinks, embeds, callouts, and properties), obsidian-bases (create/edit Bases with views, filters, formulas, and summaries), json-canvas (create/edit JSON Canvas files with nodes, edges, groups, and connections), obsidian-cli (interact with vaults via Obsidian's CLI for plugin/theme development), and defuddle (extract clean markdown from web pages, removing clutter to save tokens). Together they enable agents to build, maintain, and evolve personal knowledge bases autonomously.

## Architecture

Pure SKILL.md files following the Agent Skills specification (agentskills.io). No runtime dependencies, no compiled code -- each skill is a markdown file that describes the capability, its inputs, outputs, and behavioral constraints. Compatible with any skills-compatible agent: Claude Code (via `/.claude` folder), Codex CLI (via `~/.codex/skills`), OpenCode (via `~/.opencode/skills/`), and OpenClaw. Installation is either via the plugin marketplace (`/plugin marketplace add kepano/obsidian-skills`), npx (`npx skills add`), or manual directory copy. Created by Steph Ango (kepano), the CEO of Obsidian.

## Key Numbers

- 19,325 GitHub stars, 1,192 forks
- 5 skills: obsidian-markdown, obsidian-bases, json-canvas, obsidian-cli, defuddle
- Works across 4+ agent platforms: Claude Code, Codex CLI, OpenCode, OpenClaw
- MIT license

## Strengths

- Addresses the agent-KB gap: most memory systems let agents query knowledge, but Obsidian Skills lets agents create, edit, and maintain it
- Zero-dependency SKILL.md format means no build steps, no runtime overhead, and trivial installation across multiple agent platforms
- Covers the full Obsidian surface area (markdown, databases, visual canvases, CLI) so agents can use all of Obsidian's features
- Created by Obsidian's CEO, ensuring the skills accurately reflect Obsidian's conventions and stay current

## Limitations

- Obsidian-specific -- skills are not transferable to other knowledge base platforms (Notion, Logseq, etc.)
- Skills describe what agents should do but do not enforce correctness -- an agent can still create malformed markdown or invalid canvas files
- No memory or state management -- skills are stateless instructions, not a persistent context system
- Defuddle (web extraction) is a separate tool dependency, not a pure-markdown operation

## Alternatives

- [openviking.md](openviking.md) -- use when you need a full context database with memory, resources, and skills management beyond Obsidian
- [claude-mem.md](claude-mem.md) -- use when you need persistent session memory rather than KB authoring capabilities
- [supermemory.md](supermemory.md) -- use when you need automated knowledge extraction and user profiling rather than manual KB operations

## Sources

- [Source](../../raw/repos/kepano-obsidian-skills.md) -- "Agent skills for Obsidian. Teach your agent to use Markdown, Bases, JSON Canvas, and use the CLI."

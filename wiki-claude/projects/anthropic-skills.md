# Anthropic Skills

> Anthropic's official SKILL.md standard and reference implementation for equipping Claude with modular, composable capabilities via YAML-frontmattered markdown files -- the canonical format for agentic skill registries.

## What It Does

Skills are folders containing a `SKILL.md` file with YAML frontmatter (name + description) and markdown instructions that Claude loads dynamically to perform specialized tasks. The repository provides demonstration skills across four categories: creative and design (art, music), development and technical (web app testing, MCP server generation), enterprise and communication (branding, comms), and document manipulation (PDF, DOCX, PPTX, XLSX creation/editing). Skills are self-contained, versionable, and discoverable. They work in Claude Code (as plugins), Claude.ai (built into paid plans), and the Claude API.

## Architecture

Pure markdown with YAML frontmatter. No runtime dependencies. Each skill is a folder with a `SKILL.md` that contains two frontmatter fields (`name` and `description`) and markdown body with instructions, examples, and guidelines. Claude loads relevant skills based on task context. The repository also includes the Agent Skills specification (`spec/`) and a skill template (`template/`). Skills can be installed in Claude Code via the plugin marketplace system (`/plugin marketplace add anthropics/skills`). Document manipulation skills (docx, pdf, pptx, xlsx) are source-available and power Claude's built-in document capabilities in production.

## Key Numbers

- 110,064 GitHub stars, 12,399 forks
- 4 skill categories: creative, development, enterprise, document
- Document skills power Claude's production document capabilities
- Plugin marketplace integration for Claude Code
- Partner ecosystem (Notion skills highlighted)

## Strengths

- Official standard from Anthropic ensures long-term compatibility and ecosystem adoption
- Zero-dependency format (markdown + YAML) means skills are trivially portable, versionable, and inspectable
- Production-validated: the document skills are the actual implementation behind Claude's document features
- Plugin marketplace provides discovery and installation infrastructure that third-party skill packs can leverage

## Limitations

- Skills are Claude-specific; the SKILL.md format has limited adoption outside the Anthropic ecosystem despite the agentskills.io specification
- No built-in skill composition or dependency management; complex workflows require manual orchestration across multiple skills
- Demonstration skills vary in depth; some are minimal examples rather than production-ready implementations

## Alternatives

- [gstack](gstack.md) -- use when you want a complete sprint workflow with 23+ role-based skills rather than individual modular skills
- [Everything Claude Code](everything-claude-code.md) -- use when you want a broader harness optimization system with memory hooks, security scanning, and multi-language rules alongside skills

## Sources

- [anthropics/skills](../../raw/repos/anthropics-skills.md) -- "Skills are folders of instructions, scripts, and resources that Claude loads dynamically to improve performance on specialized tasks"

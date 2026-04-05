# Claude Skills

> The largest open-source skill registry for AI coding agents, packaging 248 modular expertise units (SKILL.md + CLI tools) that work across 11 platforms from Claude Code to Gemini CLI. Key differentiator: one repo, eleven platforms, zero vendor lock-in.

## What It Does

Claude Skills provides production-ready instruction packages that give AI coding agents domain expertise they lack out of the box. Each skill bundles a SKILL.md (structured instructions, workflows, decision frameworks), Python CLI tools (332 total, all stdlib-only), and reference docs. Skills span 9 domains: engineering, product, marketing, project management, regulatory/quality, C-level advisory, business growth, finance, and a "POWERFUL" tier of 25 advanced skills (agent designer, RAG architect, database designer, security auditor, etc.). Three persona types (Startup CTO, Growth Marketer, Solo Founder) layer personality and cross-domain reasoning on top of skills.

## Architecture

Skills are plain directories with a `SKILL.md` frontmatter file, optional `scripts/`, `references/`, and `assets/`. A conversion script (`scripts/convert.sh`) transforms all 248 skills into native formats for Cursor (.mdc), Aider (CONVENTIONS.md), Windsurf, Kilo Code, OpenCode, Augment, and Antigravity. An install script handles per-tool deployment. Four orchestration patterns (Solo Sprint, Domain Deep-Dive, Multi-Agent Handoff, Skill Chain) coordinate skills and personas for multi-phase work.

## Key Numbers

- 9,216 GitHub stars, 1,137 forks
- 248 skills, 23 agents, 3 personas, 22 commands
- 332 Python CLI tools (zero pip dependencies)
- 11 supported platforms
- MIT license

## Strengths

- Cross-platform portability eliminates the skill-duplication problem that plagues multi-agent systems
- All Python tools use stdlib only, removing dependency management friction entirely
- Skill Security Auditor scans third-party skills for injection, exfiltration, and supply-chain risks before installation

## Limitations

- Skills are static instruction packages with no learning loop; they do not improve from execution feedback
- Heavy emphasis on breadth (marketing, compliance, C-suite) means individual skill depth can be shallow compared to domain-specific tools
- No automated validation that skills produce correct outputs; quality depends on the consuming LLM

## Alternatives

- [skill-seekers.md](skill-seekers.md) — use when converting existing documentation into skills rather than authoring from scratch
- [ai-research-skills.md](ai-research-skills.md) — use when the domain is AI/ML research specifically
- [acontext.md](acontext.md) — use when skills need to evolve from agent execution traces

## Sources

- [../../raw/repos/alirezarezvani-claude-skills.md](../../raw/repos/alirezarezvani-claude-skills.md) — "modular instruction packages that give AI coding agents domain expertise they don't have out of the box"

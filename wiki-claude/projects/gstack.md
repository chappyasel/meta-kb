# gstack

> Garry Tan's role-based skill composition system for Claude Code that implements a complete sprint workflow (think, plan, build, review, test, ship, reflect) across 23 specialist skills, turning a single developer into a virtual engineering team.

## What It Does

gstack provides slash commands that act as specialist roles: `/office-hours` (YC-style product framing), `/plan-ceo-review` (product strategy), `/plan-eng-review` (architecture lock-in), `/review` (staff-level code review), `/qa` (browser-based testing with real Playwright), `/cso` (OWASP + STRIDE security audit), `/ship` (test, push, PR), and more. Each skill feeds into the next -- `/office-hours` writes a design doc that `/plan-ceo-review` reads, `/plan-eng-review` writes a test plan that `/qa` picks up. The system supports 10-15 parallel sprints via Conductor, with smart review routing that skips irrelevant review types (CEO review skips infra fixes, design review skips backend changes).

## Architecture

TypeScript-based skill pack installed into `~/.claude/skills/gstack`. Each skill is a SKILL.md file following the Anthropic standard. A compiled binary (`setup`) handles installation, skill registration, and cross-platform compatibility. `/browse` runs a real Chromium browser via Playwright with ~100ms per command. `/connect-chrome` launches headed Chrome with a Side Panel extension for live observation. Supports Claude Code, Codex, Gemini CLI, Cursor, and Factory Droid through platform-specific skill discovery directories. The `/learn` skill provides cross-session memory that compounds project-specific patterns and preferences over time.

## Key Numbers

- 63,766 GitHub stars, 8,626 forks
- 23 specialist skills + 8 power tools
- Claims 60% year-over-year shipping velocity improvement
- 600,000+ lines of production code in 60 days (per author's report)
- 10-15 parallel sprints as practical maximum
- MIT license

## Strengths

- The sprint-as-process design (think, plan, build, review, test, ship) means skills compose sequentially rather than operating in isolation, catching issues that single-skill approaches miss
- Real browser testing via Playwright (`/qa`) gives the agent actual eyes on the running application, not just static analysis
- Cross-agent compatibility (Claude Code, Codex, Gemini CLI, Cursor, Factory Droid) prevents vendor lock-in
- Safety guardrails (`/careful`, `/freeze`, `/guard`) address the real risk of autonomous agents running destructive commands

## Limitations

- Velocity claims (600K lines in 60 days) are self-reported without independent verification; line count is a weak proxy for productivity
- The 23-skill surface area creates a steep learning curve for new users who need to understand which skill to use when
- Conductor (for parallel sprints) is a separate commercial product, not included in the open-source release
- Opinionated workflow assumes a specific development process; teams with different sprint structures need significant customization

## Alternatives

- [Anthropic Skills](anthropic-skills.md) -- use when you want individual modular skills rather than a complete opinionated workflow
- [Everything Claude Code](everything-claude-code.md) -- use when you want a broader harness optimization system with memory persistence, security scanning, and multi-language rule architectures

## Sources

- [garrytan/gstack](../../raw/repos/garrytan-gstack.md) -- "gstack is a process, not a collection of tools. The skills run in the order a sprint runs: Think, Plan, Build, Review, Test, Ship, Reflect"

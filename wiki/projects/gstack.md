# gstack

> Garry Tan's personal Claude Code setup -- 23 role-based specialist skills that turn a single AI agent into a virtual engineering team running CEO, designer, eng manager, QA, security, and release workflows.

## What It Does

gstack provides a structured sprint process for AI-assisted development: Think, Plan, Build, Review, Test, Ship, Reflect. Each slash command activates a specialist role. `/office-hours` runs YC-style product discovery. `/plan-ceo-review` rethinks the problem at the product level. `/plan-eng-review` locks architecture with ASCII diagrams. `/review` finds production bugs with auto-fix. `/qa` opens a real browser, clicks through flows, and fixes what it finds. `/ship` runs tests, pushes, and opens PRs. Each skill feeds its output into the next, so design docs flow through planning, implementation, review, and shipping automatically.

## Architecture

Skills are SKILL.md files installed to `~/.claude/skills/gstack/`. Each skill defines a specialist role with specific behaviors, outputs, and downstream connections:

- **Planning layer**: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/plan-devex-review`, `/autoplan`
- **Build/Review layer**: `/review`, `/investigate`, `/design-review`, `/devex-review`, `/cso` (security)
- **Testing layer**: `/qa`, `/qa-only`, `/benchmark`, `/canary`
- **Ship layer**: `/ship`, `/land-and-deploy`, `/document-release`, `/retro`
- **Power tools**: `/browse` (real Chromium browser), `/codex` (OpenAI second opinion), `/careful`/`/freeze`/`/guard` (safety guardrails), `/learn` (cross-session memory)

Works with Claude Code, Codex, Gemini CLI, Cursor, and Factory Droid via the Agent Skills standard. Includes a `/connect-chrome` feature that launches a headed Chrome window controlled by Playwright for co-presence debugging.

## Key Numbers

- **63,766 GitHub stars**, 8,626 forks
- 23 specialist skills + 8 power tools
- 600,000+ lines of production code in 60 days (author's claim)
- 10,000-20,000 lines per day, part-time
- Supports 10-15 parallel sprints via Conductor
- MIT license, TypeScript

## Strengths

- The sprint structure (think-plan-build-review-test-ship) makes parallelism manageable -- each agent knows what to do and when to stop, enabling 10-15 simultaneous workflows
- `/qa` with real browser control (Playwright) is a genuine capability multiplier -- the agent can see, click, and verify UI behavior, not just read code

## Limitations

- Heavily opinionated toward Garry Tan's workflow -- the CEO/designer/eng manager metaphor may not map to every team's process
- The 23-skill surface area requires significant learning investment to use effectively; simpler setups may be more productive for smaller projects

## Alternatives

- [anthropic-skills.md](anthropic-skills.md) -- use when you want the official skill standard as a foundation to build your own workflow
- [everything-claude-code.md](everything-claude-code.md) -- use when you want language-ecosystem optimization rather than role-based workflows
- [planning-with-files.md](planning-with-files.md) -- use when you want just the persistent planning pattern without the full sprint framework

## Sources

- [garrytan-gstack.md](../../raw/repos/garrytan-gstack.md) -- "gstack is a process, not a collection of tools. The skills run in the order a sprint runs: Think, Plan, Build, Review, Test, Ship, Reflect"

---
entity_id: letta-code
type: project
bucket: agent-systems
abstract: >-
  Letta Code is a terminal-based coding agent that persists memory and learned
  skills across sessions, differentiating from session-based tools like Claude
  Code by accumulating project context over time rather than resetting on each
  run.
sources:
  - repos/letta-ai-letta-code.md
  - repos/letta-ai-letta.md
  - repos/letta-ai-lettabot.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
related:
  - Letta
last_compiled: '2026-04-05T20:38:13.360Z'
---
# Letta Code

## What It Does

Letta Code is a CLI coding agent built on the [Letta](../projects/letta.md) memory framework. Install it via `npm install -g @letta-ai/letta-code`, run `letta` in a project directory, and you get a coding assistant backed by a persistent agent that retains memory between sessions.

The core pitch: most coding agents (Claude Code, Codex, Gemini CLI) treat each session as independent. Letta Code keeps the same agent alive across sessions. Run `/clear` to start a fresh conversation thread, but the agent's memory of your codebase, preferences, and past decisions survives. The project documentation describes this as the difference between "a new contractor each time" versus "a coworker that learns."

## Architecture

Letta Code is a TypeScript harness (~2,096 stars, 208 forks as of April 2026, self-reported) sitting on top of the Letta API. It doesn't embed its own LLM runtime; it delegates to a Letta server, either the hosted service at `app.letta.com` or a self-hosted Docker instance via `LETTA_BASE_URL`.

The underlying mechanism is Letta's `memory_blocks` abstraction: named, structured memory segments (e.g., `human`, `persona`, project context) that the agent can read and write across conversations. These blocks survive session boundaries because they're stored server-side, not in the conversation transcript.

**Skills** are the second persistence mechanism. Skills live in a `.skills` directory as reusable modules. When you run `/skill`, the agent codifies what it just learned into a skill file it can load in future sessions. `/remember` triggers explicit memory consolidation. `/init` bootstraps the agent's memory system for a new project.

**Subagents** are supported for delegating subtasks. The docs reference pre-built subagents for memory and continual learning, though implementation details aren't publicly specified.

Model routing is handled by the Letta server: `/connect` sets LLM API keys, `/model` swaps between providers. The docs recommend Claude Opus 4.5 and GPT-5.2 based on their own [leaderboard](https://leaderboard.letta.com/) — self-reported rankings, not independently validated.

## Key Commands

| Command | Effect |
|--------|--------|
| `/init` | Bootstrap agent memory for the current project |
| `/remember` | Explicitly consolidate session learnings into memory |
| `/skill` | Extract a reusable skill from the current trajectory |
| `/clear` | New conversation thread (memory persists) |
| `/connect` | Configure LLM API keys |
| `/model` | Switch LLM backend |

## Strengths

**Cross-session context accumulation.** For long-running projects, the agent builds up knowledge about architecture decisions, coding style, and recurring patterns. This is genuinely different from `AGENTS.md`-style context injection: the agent updates its own memory rather than relying on a static file you maintain.

**Model portability.** Because the LLM is swappable at runtime, you're not locked to a single provider. Memory and skills transfer across model changes.

**Skill composability.** The `.skills` directory is inspectable and editable. Skills integrate with external registries (skills.sh, Clawdhub), making it possible to share reusable agent capabilities across projects or teams.

## Limitations

**Concrete failure mode.** Memory consolidation is agent-initiated and heuristic. If the agent decides something isn't worth remembering, it won't persist. There's no deterministic guarantee that a specific decision or pattern gets captured. Users working on high-stakes projects need to run `/remember` and `/skill` explicitly rather than relying on automatic learning.

**Infrastructure assumption.** By default, Letta Code connects to the hosted Letta API at `app.letta.com`. This means your agent state, conversation history, and memory blocks live on Letta's servers. Self-hosting via Docker is supported but requires additional setup. Teams with data residency requirements need to verify what the hosted service stores and where before adopting this as a primary coding tool.

**Memory coherence at scale.** The `memory_blocks` abstraction works well for a single developer's project context. What happens when memory grows large, contradictory, or stale over months isn't documented. There's no described mechanism for memory pruning, conflict resolution between outdated and current beliefs, or auditing what the agent currently "knows."

## When Not to Use It

Skip Letta Code for short-lived or one-off tasks where session persistence adds no value. If you're running a single-session analysis, writing a throwaway script, or working in a context where accumulated memory might create stale assumptions (e.g., rapidly changing codebases), standard session-based tools are simpler with less infrastructure overhead.

Also avoid it if you need local-only operation by default: the hosted API dependency means setup friction for air-gapped or regulated environments, even if self-hosting is technically available.

## Unresolved Questions

**Memory governance.** No documentation describes how to inspect, edit, or delete specific memory blocks from the CLI. The ADE (Letta's web dashboard at `app.letta.com`) is referenced for agent inspection, but the boundary between what's accessible locally versus through the web UI isn't clearly specified.

**Cost at scale.** Each session sends memory blocks to the LLM context, which grows over time. As `memory_blocks` accumulate, token costs per request increase. There's no documented mechanism for memory summarization, tiering, or budget caps.

**Skill quality control.** The `/skill` command lets the agent write its own skill files. Whether those files get validated, sandboxed, or reviewed before affecting future behavior isn't documented.

**Conflict resolution.** When two memory blocks contain contradictory information (e.g., an architectural decision was reversed), the agent presumably uses LLM reasoning to reconcile them. The actual mechanism isn't specified.

## Alternatives

- **Claude Code / Codex CLI**: Session-based, no persistent memory. Use these when you want simpler setup, no external state, or single-session tasks. Lower infrastructure overhead.
- **[LettaBot](../projects/lettabot.md)**: Built on the same Letta Code SDK but targets multi-channel messaging (Telegram, Slack, Discord) rather than terminal coding sessions.
- **Cursor / GitHub Copilot**: IDE-integrated, stateless. Better for teams standardized on a specific editor. No agent memory, but tighter editor integration.
- **Agent Zero**: Similar self-improving agent concept with persistent memory and skill creation, but not coding-specific and has different infrastructure requirements.

Use Letta Code when you're a solo developer or small team working on a long-running project where accumulated codebase context provides compounding value over weeks or months.

## Sources

- [letta-ai/letta-code](../raw/repos/letta-ai-letta-code.md)
- [letta-ai/letta](../raw/repos/letta-ai-letta.md)
- [Turing Post: 9 Open Agents That Improve Themselves](../raw/articles/turing-post-9-open-agents-that-improve-themselves.md)
- [letta-ai/lettabot](../raw/repos/letta-ai-lettabot.md)


## Related

- [Letta](../projects/letta.md) — created_by (0.9)

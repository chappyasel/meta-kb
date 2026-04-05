---
entity_id: claude-md
type: concept
bucket: context-engineering
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - repos/jmilinovich-goal-md.md
related:
  - Claude
  - Agent Skills
last_compiled: '2026-04-04T21:16:19.518Z'
---
# CLAUDE.md

## What It Is

CLAUDE.md is a special markdown file that Claude Code reads at the start of every session to load persistent instructions, project context, and behavioral constraints. It functions as the agent's "instruction manual" — a way to encode project-specific knowledge that would otherwise need to be re-explained in every conversation.

It sits inside the `.claude/` project directory, which is treated as version-controlled infrastructure rather than ad-hoc prompting.

[Source](../../raw/tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md)

---

## Why It Matters

Without CLAUDE.md, every new session starts cold. The agent has no knowledge of your conventions, architecture decisions, recurring workflows, or constraints. Developers compensate by pasting context into every prompt — which is fragile, inconsistent, and doesn't scale.

CLAUDE.md makes context **persistent and version-controlled**. The `.claude/` folder becomes part of the repo, meaning the agent's behavioral setup is as reproducible as the codebase itself.

---

## How It Works

Claude Code loads CLAUDE.md automatically at session start. The file can contain:

- Project architecture overview
- Code style and conventions
- Recurring task descriptions
- Constraints and prohibited actions
- Pointers to tools, commands, or agents

As the file grows, it should be split into a `rules/` subfolder. Rules within `rules/` can be scoped by file path — e.g., test-specific rules that only fire when Claude reads test files.

**Three scopes stack:**
- **Admin** — org-level settings
- **Global** — `~/.claude/` for personal preferences across all projects
- **Project** — committed with the repo, shared with the team

The most specific value wins for settings; arrays combine across scopes.

[Source](../../raw/tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md)

---

## The Full `.claude/` Structure

CLAUDE.md is the entry point, not the whole system:

```
.claude/
├── CLAUDE.md          # Top-level instruction manual
├── rules/             # File-path-scoped behavioral rules
├── commands/          # Repeatable slash-command workflows
├── skills/            # Context-triggered automation with own instructions/tools
├── agents/            # Isolated subagents with own model and tools
└── settings.json      # Permissions and tool lockdowns
```

Skills and agents are the key structural extension: skills activate based on context (e.g., "when editing a migration file"), agents can run with their own model, tools, and optionally a separate worktree for isolation.

[Source](../../raw/tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md)

---

## Common Failure Mode: Overloading CLAUDE.md

A frequent mistake is using CLAUDE.md to do work that belongs elsewhere:

| What you're encoding | Better mechanism |
|---|---|
| "Run linter after edits" | Hook (deterministic, event-triggered) |
| "Follow these rules for test files" | Rule scoped by file path |
| "Handle database migrations" | Skill with its own instructions |
| "Run a research sub-task" | Agent with isolated context |

When CLAUDE.md grows unbounded, context bloat degrades performance. Explicit decomposition into rules, hooks, and skills creates verifiable execution at scale and fallback patterns when AI interpretation fails.

[Source](../../raw/tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md)

---

## Relationship to GOAL.md

A related pattern is [GOAL.md](https://github.com/jmilinovich/goal-md), which extends the "instruction file" concept to autonomous improvement loops. Where CLAUDE.md encodes *how to work*, GOAL.md encodes *what to optimize* — a fitness function with dual-score safeguards to prevent agents from gaming their own evaluation metrics. The two are complementary: CLAUDE.md sets up the working environment; GOAL.md sets the improvement target.

[Source](../../raw/repos/jmilinovich-goal-md.md)

---

## Practical Implications

- **Treat `.claude/` like infrastructure.** Commit it. Review it. Refactor it as the project evolves.
- **Start simple.** A single CLAUDE.md is fine initially. Factor it out when it exceeds ~200 lines or becomes hard to reason about.
- **Scope rules tightly.** File-path-scoped rules reduce noise and improve relevance.
- **Use `~/.claude/` for personal preferences** that shouldn't be imposed on collaborators (e.g., preferred explanation verbosity, personal memory).
- **Lock permissions in `settings.json`** before enabling agents with significant tool access.

---

## Limitations

- CLAUDE.md is only as useful as its content. Vague or outdated instructions degrade agent performance silently.
- There's no built-in mechanism to verify that instructions were followed — that requires hooks or tests.
- Context has a ceiling. A bloated CLAUDE.md competes with actual task context for attention. Decomposition is not optional at scale.
- Scoping behavior across Admin/Global/Project can produce surprising interactions if not actively managed.


## Related

- [Claude](../projects/claude-code.md) — implements (0.7)
- [Agent Skills](../concepts/agent-skills.md) — implements (0.5)

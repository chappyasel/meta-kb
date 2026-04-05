# Planning with Files

> A Claude Code skill implementing the Manus-style persistent markdown planning pattern -- the workflow that made Manus worth $2B, distilled into a 3-file system that gives AI agents recoverable external memory via the filesystem.

## What It Does

For every complex task, the skill creates three persistent markdown files: `task_plan.md` (phases and progress), `findings.md` (research and discoveries), and `progress.md` (session log and test results). These files act as external memory on disk, solving the core problem that AI agents lose context when conversations are cleared or context windows fill up. Hooks re-read the plan before major decisions, remind the agent to update status after file writes, and verify completion before stopping. When context fills up and you `/clear`, the skill automatically recovers the previous session.

## Architecture

The core principle: context window = RAM (volatile, limited); filesystem = disk (persistent, unlimited). Anything important gets written to disk.

- **3-file pattern**: `task_plan.md` (goals, phases, checkboxes), `findings.md` (research storage), `progress.md` (session log)
- **Hooks**: PreToolUse (re-read plan before decisions), PostToolUse (remind to update status), Stop (verify all phases complete)
- **Session recovery**: On `/clear`, checks `~/.claude/projects/` for previous session data, extracts conversation after last plan update, shows catchup report
- **Cross-platform**: Works with Claude Code, Cursor, Codex, Gemini CLI, and 40+ agents via the Agent Skills specification. IDE-specific branches for hooks.

Installable via `npx skills add OthmanAdi/planning-with-files` or as a Claude Code plugin.

## Key Numbers

- **17,968 GitHub stars**, 1,623 forks
- **96.7% pass rate** (29/30 assertions) in formal evaluation vs 6.7% without skill
- **3/3 blind A/B wins** over baseline
- 16+ supported platforms/IDEs
- v2.30.0 current release
- MIT license

## Strengths

- The 96.7% vs 6.7% benchmark result is striking evidence that persistent file-based planning dramatically improves agent task completion on multi-step work
- Cross-platform support (16+ IDEs) makes this the most portable implementation of the Manus planning pattern

## Limitations

- The 3-file pattern adds overhead to simple tasks -- the skill itself recommends skipping it for single-file edits or quick lookups
- Session recovery depends on Claude Code's project storage structure; portability to other agents requires adaptation of the recovery mechanism

## Alternatives

- [gstack.md](gstack.md) -- use when you want a full sprint process (plan-build-review-test-ship) rather than just the planning layer
- [autoresearch.md](autoresearch.md) -- use when you need the program.md pattern for autonomous research loops rather than general software engineering

## Sources

- [othmanadi-planning-with-files.md](../../raw/repos/othmanadi-planning-with-files.md) -- "Context Window = RAM (volatile, limited); Filesystem = Disk (persistent, unlimited) -- Anything important gets written to disk"

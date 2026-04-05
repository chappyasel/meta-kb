# Claude Memory Engine

> A hooks-and-markdown memory system for Claude Code that goes beyond recall to active learning -- storing mistake-fix pairs, running periodic reflection cycles, and upgrading repeated errors into permanent rules. Zero dependencies.

## What It Does

Claude Memory Engine uses Claude Code's hooks system to automatically save context at three save points (every 20 messages, before context compression, and at session end), detect patterns in mistakes, and build an error notebook that the agent reviews before each task. The core innovation is the "Student Loop" -- an 8-step learning cycle where the first 3 steps run automatically every session (note-taking, linking, pattern spotting) and the remaining 5 are triggered manually via `/reflect` (review, refine, re-study, slim down, wrap up). A separate Correction Cycle captures user corrections: `/analyze` records both the problem and fix, and mistakes appearing 3+ times get upgraded to hard rules.

## Architecture

- **8 hooks** (all automatic): session-start, session-end, pre-compact, memory-sync, write-guard, pre-push-check, mid-session-checkpoint
- **Memory format**: Pure markdown files with per-project directories, auto-detected via Smart Context based on working directory
- **Storage**: Local filesystem with optional GitHub backup (`/backup`, `/sync`, `/recover` for cross-device sync)
- **Commands**: 18 bilingual pairs (English + Traditional Chinese) covering daily ops, reflection, health checks, search, and session handoff
- **Token overhead**: ~200-500 extra tokens at session start; everything else is zero unless triggered

```
hooks/          # 8 automatic hooks (JS)
commands/       # 36 bilingual command files
skill/SKILL.md  # Learned skill (loaded when relevant)
```

## Key Numbers

- 110 GitHub stars, 27 forks
- JavaScript, MIT license, Node.js 18+
- Zero external dependencies
- ~200-500 tokens overhead per session
- 8 hooks, 18 bilingual command pairs
- v1.5.2 (active development)

## Strengths

- The mistake-fix pair approach and automatic rule upgrading (3+ occurrences -> hard rule) creates genuine learning rather than mere recall, directly addressing the gap between "remembering" and "learning from experience"
- Pure markdown + hooks architecture means full transparency and zero lock-in -- everything is inspectable, editable, and git-committable

## Limitations

- Tightly coupled to Claude Code's hooks system, making it non-portable to other coding agents without significant rework
- The reflection cycle (`/reflect`) requires manual triggering and user judgment about when to run it, which may lead to memory bloat between reflection sessions

## Alternatives

- [hipocampus.md](hipocampus.md) -- use when you want automatic compaction with a topic index rather than manual reflection cycles
- [mem-agent.md](mem-agent.md) -- use when you want an RL-trained memory model rather than rule-based hooks
- [memorilabs-memori.md](memorilabs-memori.md) -- use when you need LLM-provider-agnostic memory with SQL-native storage

## Sources

- [helloruru-claude-memory-engine.md](../../raw/repos/helloruru-claude-memory-engine.md) -- "Memory Engine doesn't just help Claude remember -- it teaches Claude to learn like a student: Mistakes don't repeat -- it saves both the problem and the fix"

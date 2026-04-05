# claude-mem

> Most popular Claude Code memory plugin (44,950 stars) that automatically captures session context, compresses it via Claude's own API, stores it in ChromaDB/SQLite, and reinjects relevant context into future sessions through progressive disclosure.

## What It Does

Claude-Mem is a Claude Code plugin that gives Claude persistent memory across coding sessions. It automatically captures tool usage observations during sessions, generates semantic summaries, and makes them available to future sessions. When a new session starts, relevant context from previous sessions is injected automatically -- no manual intervention required. The plugin uses a 3-layer progressive disclosure pattern: search returns a compact index (~50-100 tokens per result), timeline provides chronological context, and get_observations fetches full details only for filtered IDs. This achieves roughly 10x token savings compared to naively loading all past context.

## Architecture

TypeScript plugin using Claude Agent SDK. Five lifecycle hooks (SessionStart, UserPromptSubmit, PostToolUse, Stop, SessionEnd) capture observations during coding sessions. A Worker Service (HTTP API on port 37777, managed by Bun) provides 10 search endpoints and a web viewer UI. Storage uses SQLite for sessions, observations, and summaries, with FTS5 for full-text search. ChromaDB provides vector-based semantic search for hybrid retrieval. Four MCP tools (search, timeline, get_observations, plus a fourth) implement the progressive disclosure pattern. Context compression uses Claude's own API to generate semantic summaries before storage.

## Key Numbers

- 44,950 GitHub stars, 3,401 forks
- 4 MCP search tools with 3-layer progressive disclosure
- ~10x token savings via filtered retrieval vs. full context loading
- 5 lifecycle hooks for automatic observation capture
- Web viewer UI at localhost:37777
- AGPL-3.0 license (Ragtime sub-module: PolyForm Noncommercial)

## Strengths

- Zero-configuration persistent memory for Claude Code -- install the plugin and it works automatically via lifecycle hooks
- Progressive disclosure architecture is genuinely token-efficient, only fetching full details for filtered results
- Hybrid search (FTS5 + ChromaDB vectors) covers both keyword and semantic queries
- Largest community of any Claude-specific memory tool, ensuring active maintenance and plugin ecosystem support

## Limitations

- Tightly coupled to Claude Code's plugin system -- not usable with other LLM coding assistants (except OpenClaw/OpenCode via separate setup)
- AGPL-3.0 license is restrictive for commercial derivative works
- Memory quality depends entirely on Claude's compression -- no user control over what gets extracted or summarized
- No structured memory ontology (entity/relation extraction) -- stores compressed session observations, not formal knowledge graphs

## Alternatives

- [supermemory.md](supermemory.md) -- use when you need a full memory API with user profiles, temporal reasoning, and multi-platform support
- [openviking.md](openviking.md) -- use when you want structured filesystem-based context management with L0/L1/L2 tiering
- [memori.md](memori.md) -- use when you need SQL-native structured memory with entity/process/session attribution

## Sources

- [Source](../../raw/repos/thedotmack-claude-mem.md) -- "A Claude Code plugin that automatically captures everything Claude does during your coding sessions, compresses it with AI, and injects relevant context back into future sessions."

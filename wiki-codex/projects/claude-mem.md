# Claude-Mem

> A session-memory layer for coding agents that captures tool observations, compresses them, and rehydrates only the useful parts later. [Source](../../raw/repos/thedotmack-claude-mem.md)

## What It Does

Claude-Mem preserves project continuity across sessions by recording observations from coding work, summarizing them, and exposing a staged search workflow for future retrieval. [Source](../../raw/repos/thedotmack-claude-mem.md)

## Architecture

The project uses hooks plus a hybrid search store and a 3-layer access pattern: search for compact IDs, inspect the timeline around interesting items, then fetch full observations only for filtered results. [Source](../../raw/repos/thedotmack-claude-mem.md)

## Key Numbers

- 44,950 GitHub stars. [Source](../../raw/repos/thedotmack-claude-mem.md)
- Roughly 10x token savings is the headline retrieval claim for filtering before full fetches. [Source](../../raw/repos/thedotmack-claude-mem.md)

## Strengths

- Clear progressive-disclosure design. [Source](../../raw/repos/thedotmack-claude-mem.md)
- Strong fit for coding workflows where continuity matters more than abstract long-term memory theory. [Source](../../raw/repos/thedotmack-claude-mem.md)

## Limitations

- More focused on session continuity than on richer semantic or temporal reasoning. [Source](../../raw/repos/thedotmack-claude-mem.md)

## Alternatives

- [planning-with-files](./planning-with-files.md) for a simpler markdown working-memory pattern.
- [Graphiti](./graphiti.md) for temporal graph semantics.

## Sources

- [Claude-Mem repo](../../raw/repos/thedotmack-claude-mem.md)

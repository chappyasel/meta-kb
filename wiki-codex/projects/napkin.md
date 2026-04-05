# Napkin

> A local-first markdown retrieval system that bets on BM25 and progressive disclosure instead of embeddings. [Source](../../raw/repos/michaelliv-napkin.md)

## What It Does

Napkin indexes markdown vaults and exposes retrieval primitives designed for agents, using BM25 search plus staged detail loading over local files. [Source](../../raw/repos/michaelliv-napkin.md)

## Architecture

The system is file-first and outline-aware. It exposes read, links, backlinks, and benchmark tooling over the vault rather than turning the whole corpus into vector chunks. [Source](../../raw/repos/michaelliv-napkin.md)

## Key Numbers

- 264 GitHub stars. [Source](../../raw/repos/michaelliv-napkin.md)
- The repo positions its headline benchmark around LongMemEval. [Source](../../raw/repos/michaelliv-napkin.md)

## Strengths

- Very clean expression of the markdown-plus-index school. [Source](../../raw/repos/michaelliv-napkin.md)
- Good fit when human-readable files are the source of truth. [Source](../../raw/repos/michaelliv-napkin.md)

## Limitations

- Smaller ecosystem and adoption footprint than mainstream memory layers. [Source](../../raw/repos/michaelliv-napkin.md)

## Alternatives

- [PageIndex](./pageindex.md) for tree-based vectorless retrieval.
- [Claude-Mem](./claude-mem.md) for a stronger session-continuity workflow.

## Sources

- [Napkin repo](../../raw/repos/michaelliv-napkin.md)

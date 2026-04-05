# Memori

> A SQL-native memory system that extracts structured memory from agent actions and posts some of the sharpest cost-quality numbers in the corpus. [Source](../../raw/repos/memorilabs-memori.md)

## What It Does

Memori stores structured memory for long conversations and agent workflows, using a schema-first approach instead of replaying large prompt histories. [Source](../../raw/repos/memorilabs-memori.md)

## Architecture

The system focuses on extracting memory from actions and interactions into structured state, then retrieving compact context instead of replaying full transcripts. It also exposes cloud, MCP, and session-management surfaces. [Source](../../raw/repos/memorilabs-memori.md)

## Key Numbers

- 13,011 GitHub stars. [Source](../../raw/repos/memorilabs-memori.md)
- 81.95% overall accuracy on LoCoMo with 1,294 tokens per query, or 4.97% of full-context footprint. [Source](../../raw/repos/memorilabs-memori.md)
- Roughly 67% lower prompt size than Zep and more than 20x lower context cost than full-context prompting in the repo benchmark summary. [Source](../../raw/repos/memorilabs-memori.md)

## Strengths

- Strong benchmark story with clear token economics. [Source](../../raw/repos/memorilabs-memori.md)
- Good fit when structured state is more valuable than free-form recall. [Source](../../raw/repos/memorilabs-memori.md)

## Limitations

- More schema-driven than markdown-first memory systems, which can reduce legibility for ad hoc workflows. [Source](../../raw/repos/memorilabs-memori.md)

## Alternatives

- [Mem0](./mem0.md) for a more general multi-level memory API.
- [Claude-Mem](./claude-mem.md) for file-first session continuity.

## Sources

- [Memori repo](../../raw/repos/memorilabs-memori.md)

# Lossless Claw

> DAG-based hierarchical summarization plugin for OpenClaw that preserves every message while keeping active context within token limits. Key differentiator: nothing is ever deleted -- raw messages persist in SQLite while summaries form a navigable directed acyclic graph.

## What It Does

When a conversation exceeds the model's context window, most agents truncate older messages. Lossless Claw instead persists every message in a SQLite database organized by conversation, summarizes chunks of older messages into summaries using a configured LLM, condenses summaries into higher-level nodes as they accumulate (forming a DAG), assembles context each turn by combining summaries with recent raw messages, and provides three tools (`lcm_grep`, `lcm_describe`, `lcm_expand`) so agents can search and recall details from compacted history. The agent can drill into any summary to recover the original detail, making it feel like the agent never forgets.

## Architecture

TypeScript plugin for OpenClaw implementing the LCM (Lossless Context Management) paper from Voltropy. Core data structure is a DAG where leaf nodes contain raw message chunks and parent nodes contain progressively higher-level summaries. Configuration via plugin config or environment variables controls: `freshTailCount` (messages kept raw), `leafChunkTokens` (source tokens before summarization triggers, default 20,000), `contextThreshold` (when to compact, default 0.75 of window), and `incrementalMaxDepth` (compaction depth per turn). Supports separate model configs for summarization (`summaryModel`) and expansion (`expansionModel`), allowing cheaper models like Haiku for compaction while the main session uses a frontier model. SQLite for persistence. Session patterns can be ignored via glob patterns.

## Key Numbers

- 3,963 GitHub stars, 317 forks
- Default leaf chunk: 20,000 tokens
- Context threshold: 75% of window before compaction triggers
- Fresh tail: 64 most recent messages kept raw
- Delegation timeout: 120s default for expand queries
- MIT license

## Strengths

- True lossless guarantee: every raw message is preserved and recoverable through DAG traversal
- Hierarchical summarization naturally handles conversations of arbitrary length without quality degradation at any single level
- Agent-accessible tools (grep, describe, expand) give the model explicit control over recall depth

## Limitations

- Tightly coupled to the OpenClaw ecosystem; not usable as a standalone library or with other agent frameworks
- Summarization quality depends on the configured LLM; poor summaries cascade upward through the DAG
- Each summarization call adds latency and cost; high-frequency conversations with small `leafChunkTokens` can become expensive

## Alternatives

- [simplemem.md](simplemem.md) — use when you need multimodal memory (images, audio, video) in addition to text
- [mirix.md](mirix.md) — use when you want specialized memory types (episodic, semantic, procedural) rather than a single summarization hierarchy
- [napkin.md](napkin.md) — use when you want file-based memory with BM25 search instead of summarization-based compression

## Sources

- [../../raw/repos/martian-engineering-lossless-claw.md](../../raw/repos/martian-engineering-lossless-claw.md) — "persists every message in a SQLite database...summarizes chunks of older messages into summaries using your configured LLM...condenses summaries into higher-level nodes as they accumulate, forming a DAG"

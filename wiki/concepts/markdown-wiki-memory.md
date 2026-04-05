# Markdown Wiki Memory

> Markdown wiki memory is the pattern of storing durable agent knowledge as linked files, summaries, and indexes that both humans and agents can inspect and update. [Karpathy on LLM knowledge bases](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

## Why It Matters

This pattern keeps winning because files do double duty as storage and interface. A markdown corpus can survive context resets, be diffed in git, be linted, and be repaired by hand when the agent gets something wrong. It is a direct alternative to hidden memory layers and opaque retrieval stores. [Karpathy on LLM knowledge bases](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Napkin source](../../raw/repos/michaelliv-napkin.md)

## How It Works

The usual flow is raw ingestion, compilation into summaries and linked pages, then query-time use that adds new pages or updates old ones. Maintenance loops may check consistency, suggest missing topics, or promote useful outputs back into the wiki. [Karpathy on LLM knowledge bases](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) [Ars Contexta source](../../raw/repos/agenticnotetaking-arscontexta.md)

## Who Implements It

- [Napkin](../projects/napkin.md) — local-first markdown vault with BM25 and progressive disclosure. [Napkin source](../../raw/repos/michaelliv-napkin.md)
- [Ars Contexta](../projects/ars-contexta.md) — generated markdown knowledge systems with maps and hooks. [Ars Contexta source](../../raw/repos/agenticnotetaking-arscontexta.md)
- [Planning with Files](../projects/planning-with-files.md) — plan files as durable session memory. [Planning with Files source](../../raw/repos/othmanadi-planning-with-files.md)
- [OpenViking](../projects/openviking.md) — filesystem-style context database rather than a plain note vault. [OpenViking source](../../raw/repos/volcengine-openviking.md)

## Open Questions

- At what scale does a markdown wiki need graph or database assistance? [RAG vs. GraphRAG](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)
- Which outputs deserve promotion back into the durable wiki? [Karpathy on LLM knowledge bases](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

## Sources

- [Karpathy on LLM knowledge bases](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)
- [Napkin source](../../raw/repos/michaelliv-napkin.md)
- [Ars Contexta source](../../raw/repos/agenticnotetaking-arscontexta.md)
- [Planning with Files source](../../raw/repos/othmanadi-planning-with-files.md)
- [OpenViking source](../../raw/repos/volcengine-openviking.md)
- [RAG vs. GraphRAG](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)

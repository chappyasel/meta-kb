---
url: 'https://x.com/heygurisingh/status/2041811642787488070'
type: tweet
author: '@heygurisingh'
date: '2026-04-08'
tags:
  - knowledge-substrate
  - context-engineering
  - agent-architecture
  - code-understanding
  - knowledge-graph-extraction
  - deterministic-structure
  - multi-hop-reasoning
key_insight: >-
  LLM-powered knowledge graphs that deterministically extract structure via
  AST+semantic analysis solve a critical agent problem: agents querying large
  codebases or document collections can ground their reasoning in discovered
  relationships rather than vector similarity, reducing token overhead by 71x
  while enabling precise multi-hop reasoning that static embeddings cannot
  capture.
likes: 62
retweets: 17
relevance_scores:
  topic_relevance: 8
  practitioner_value: 7
  novelty: 7
  signal_quality: 6
  composite: 7.3
  reason: >-
    Graphify directly addresses agent knowledge substrate (Karpathy pattern, RAG
    alternatives, context graphs) with a concrete two-pass AST+LLM pipeline
    producing Obsidian vaults and queryable graphs—highly transferable
    architecture for agent grounding, though the source is a tweet describing
    rather than documenting the tool itself.
---
## Tweet by @heygurisingh

Holy shit...

Andrej Karpathy tweeted he wanted LLM-powered knowledge graphs.

48 hours later, someone shipped it on GitHub.

It's called Graphify. One command. Any folder. Full knowledge graph.

71.5x fewer tokens per query vs reading raw files.

No vector DB. No embeddings. No config.

Point it at a folder of code, papers, PDFs, screenshots, even whiteboard photos in other languages. It reads everything, builds a queryable graph, and hands you back structure you didn't know was there.

You can ask it stuff like:

→ "What calls this function?"
→ "What connects these two concepts?"
→ "What are the most important nodes in this project?"

Out the other side you get:

→ A navigable interactive graph (click nodes, search, filter)
→ An Obsidian vault with backlinked articles
→ A Wikipedia-style wiki that starts at index.md
→ Plain English Q&A over your entire codebase

Two-pass pipeline. First pass is a deterministic AST extraction across 19 languages via tree-sitter (Python, Rust, Go, TS, Swift, Zig, Elixir, the works). Second pass runs Claude subagents in parallel over docs, papers, and images to pull out concepts and design rationale. Leiden community detection clusters everything. SHA256 cache means re-runs only touch changed files.

It even installs a git hook. Every commit auto-rebuilds the graph. Every branch switch too.

The wildest part? The benchmark folder is literally Karpathy's own repos. nanoGPT, minGPT, micrograd, plus the Attention Is All You Need paper and FlashAttention 1+2. Graphify found that nanoGPT Block and minGPT Block are linked across repos, with the FlashAttention paper bridging into CausalSelfAttention in both.

That's the structure no keyword search will ever give you.

6.3k stars in days.

100% Open Source.

(Link in the replies)

### Engagement

| Metric | Value |
|--------|-------|
| Likes | 62 |
| Retweets | 17 |

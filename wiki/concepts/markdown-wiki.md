---
entity_id: markdown-wiki
type: concept
bucket: knowledge-bases
abstract: >-
  A markdown wiki is a flat-file knowledge base of interlinked .md files,
  LLM-maintained at small-to-medium scale as an alternative to RAG pipelines,
  where queries accumulate into the base rather than leaving it unchanged.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
related:
  - Andrej Karpathy
  - Obsidian
  - Obsidian
  - Zettelkasten
last_compiled: '2026-04-05T20:38:43.669Z'
---
# Markdown Wiki

## What It Is

A markdown wiki is a directory of `.md` files organized into a coherent knowledge base, where an LLM writes and maintains the content rather than a human author. Source documents live in a `raw/` directory. The LLM compiles them into structured articles, writes summaries and backlinks, and groups content into concept pages. The human rarely touches the files directly.

The pattern gained traction from [Andrej Karpathy](../people/andrej-karpathy.md)'s public description of his personal research workflow, where a wiki covering ~100 articles and ~400K words replaced a planned RAG system. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

## How It Works

The pipeline has four stages:

**Ingest.** Raw source material (papers, articles, repos, images) lands in `raw/`. Tools like the Obsidian Web Clipper convert web content to `.md`. Images download locally so the LLM can reference them during compilation.

**Compile.** An LLM reads `raw/` incrementally and produces wiki articles. It categorizes content into concepts, writes cross-links and backlinks, and maintains an index file with brief summaries of every document. The index is what makes Q&A tractable without vector search: the LLM reads the index first, then fetches the relevant full articles.

**Query and output.** The LLM agent runs against the wiki, producing `.md` files, Marp slideshows, or matplotlib images rather than raw text. Query outputs get filed back into the wiki. Each question leaves a trace that enriches subsequent queries.

**Linting.** Periodic LLM "health checks" scan for inconsistencies, missing data, and candidate connections between articles. Web search fills gaps. The LLM flags further questions worth investigating.

[Obsidian](../projects/obsidian.md) serves as the frontend for reading all three layers (raw, wiki, outputs) and rendering visualizations. A custom CLI search engine handles larger queries that need tooling beyond the LLM's direct file reads.

## Why It Diverges from RAG

Standard [RAG](../concepts/retrieval-augmented-generation.md) keeps the knowledge base static and retrieves chunks at query time. The markdown wiki inverts this: the LLM transforms ingested content into synthesized articles during compilation, so retrieval becomes a matter of reading pre-structured text rather than matching embeddings. At the scale Karpathy describes (~100 articles), the LLM can maintain its own index and locate relevant content without a vector store.

The compounding property matters here. A RAG pipeline returns an answer and leaves the index unchanged. A markdown wiki files the answer back as a new article, which becomes source material for future queries. The knowledge base grows denser with use rather than staying flat.

## Multi-Agent Extension

The pattern scales into multi-agent systems with an added validation layer. One implementation uses a 10-agent swarm where each agent dumps outputs into `raw/`, a compiler runs on a schedule to organize them into wiki articles grouped by domain, and a separate supervisor agent scores articles before they enter the permanent knowledge base. Articles that fail scoring die in `drafts/` rather than corrupting the live wiki. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

The supervisor agent works blind to how articles were produced, which matters: an agent reviewing its own swarm's output has no stake in the production process and evaluates content on accuracy alone. Per-agent briefings generated from live articles give each swarm member starting context rather than forcing agents to wake up with no knowledge of prior work.

## Strengths

At small-to-medium scale, the markdown wiki beats RAG on setup cost. No vector database, no embedding pipeline, no retrieval tuning. Git handles version control. Obsidian handles navigation. The LLM handles everything else.

The format is legible. A human can open any article and read it. The knowledge base doubles as documentation. Outputs like Marp slideshows and matplotlib images are immediately shareable without export steps.

Linting is a first-class operation rather than an afterthought. The same LLM that writes the wiki can audit it for drift, flag inconsistencies, and propose new articles based on gaps it detects across existing ones.

## Critical Limitations

**Scale ceiling.** The architecture relies on the LLM reading an index and fetching relevant files. At ~100 articles and ~400K words this works. At 1,000 articles or multi-million word corpora, the index itself becomes too large for context, and the LLM starts missing relevant documents. The threshold depends on the model's context window and the density of the index summaries, but no systematic benchmarks exist. Karpathy's estimate of "small scale" is self-reported and based on one research domain.

**Hallucination compounding.** Each compilation pass can introduce errors that subsequent passes treat as ground truth. In a single-agent setup this is manageable. In a multi-agent swarm, one hallucinated connection propagates to every downstream agent that reads the article. The review-gate architecture addresses this but adds latency and architectural complexity. Without a validation layer, the wiki degrades silently.

**Unspoken infrastructure assumption.** The pattern assumes a model with a large context window and low per-token cost, since every query that touches multiple articles loads substantial text. At GPT-4-class pricing with frequent queries against a large wiki, token costs accumulate fast. The workflow is designed around high-throughput, low-friction LLM access; it breaks down if you're rate-limited or cost-constrained.

## When Not to Use It

Skip the markdown wiki if:

- Your knowledge base will grow past a few hundred articles before you can evaluate whether the approach holds. Plan for RAG from the start.
- Multiple people need to write into the knowledge base. The pattern assumes one human curator with LLM as author. Concurrent human edits create merge conflicts and break the LLM's mental model of what it has written.
- You need sub-second retrieval with high query volume. File reads are slow compared to vector index lookups.
- Your domain has strict accuracy requirements with no tolerance for hallucination compounding, and you cannot staff a validation layer.

## Unresolved Questions

The pattern has no documented conflict resolution strategy when the LLM's compiled article contradicts a source document after a re-compilation pass. There is no described versioning scheme for wiki articles beyond whatever the underlying Git history provides.

The linting step relies on the LLM identifying its own errors, which creates an obvious blind spot. If a class of hallucinations is consistent across compilation runs, health checks using the same model may miss them entirely.

The path from markdown wiki to fine-tuned weights (mentioned by Karpathy as a natural next step via synthetic data generation) has no described methodology. It's an aspiration, not a workflow.

## Related Concepts and Tools

- [Zettelkasten](../concepts/zettelkasten.md): the precursor pattern of interlinked atomic notes; markdown wikis mechanize what Zettelkasten practitioners do by hand
- [Obsidian](../projects/obsidian.md): the recommended frontend and IDE for viewing raw data, compiled wiki, and rendered outputs
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): the architectural alternative; prefer RAG when scale exceeds a few hundred documents or when multiple contributors maintain the knowledge base
- [Andrej Karpathy](../people/andrej-karpathy.md): originator of this specific pattern as a described system

## Alternatives

**Use RAG** when your corpus exceeds a few hundred documents, when retrieval latency matters, or when you need precise provenance tracking on retrieved chunks.

**Use a traditional wiki** (Notion, Confluence) when multiple humans author content and the LLM role is editorial rather than authorial.

**Use a vector database with metadata filtering** when your documents have structured attributes (date, author, topic tags) and queries benefit from filtering before semantic search.

**Use fine-tuning** when query patterns are predictable, the knowledge base is stable, and you want zero retrieval latency at inference time. The markdown wiki is a plausible precursor: compile the wiki, generate synthetic Q&A pairs from it, fine-tune.

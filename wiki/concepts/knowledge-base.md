---
entity_id: knowledge-base
type: concept
bucket: knowledge-bases
abstract: >-
  An LLM knowledge base is a structured markdown repository that LLM agents
  actively build, query, and maintain — distinguished from traditional RAG
  systems by treating the knowledge store as a living artifact the agent writes
  to, not just reads from.
sources:
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/origintrail-dkg-v9.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - articles/agent-skills-overview.md
related:
  - claude-code
  - andrej-karpathy
  - rag
  - agent-memory
  - knowledge-graph
last_compiled: '2026-04-07T12:01:14.029Z'
---
# LLM Knowledge Base

## What It Is

An LLM knowledge base is a structured collection of documents — typically markdown files — organized so that LLM agents can read, write, update, and query them autonomously. The defining characteristic separating this from a traditional document store is agency over the content: the LLM does not just retrieve from the knowledge base, it maintains it.

[Andrej Karpathy](../concepts/andrej-karpathy.md) described the pattern in a widely circulated 2024 post: raw source material (articles, papers, repos) lands in a `raw/` directory, and an LLM agent compiles it incrementally into a `wiki/` directory of interconnected `.md` files with summaries, backlinks, and concept articles. The agent writes and updates every file. The human rarely touches the wiki directly.

This inverts the typical knowledge management workflow. Instead of a human curating a knowledge base that an AI queries, the AI curates a knowledge base that humans browse.

## Core Mechanism

The architecture has five distinct layers:

**Ingest.** Source documents enter a `raw/` directory without preprocessing. Web articles convert to markdown via tools like the Obsidian Web Clipper extension. Images download alongside text so multimodal models can reference them.

**Compilation.** An LLM agent reads new raw documents and incrementally updates the wiki. It writes summaries, creates concept articles, adds backlinks between related entries, and maintains index files. At Karpathy's reported scale (~100 articles, ~400K words), the agent can manage navigation through self-maintained indexes rather than requiring vector search infrastructure.

**Q&A routing.** When a user poses a question, the agent reads index files to identify relevant wiki sections, then reads those sections to construct an answer. The agent outputs results as markdown files, Marp slide decks, or matplotlib visualizations — all written back into the vault.

**Linting.** Periodic health-check passes find inconsistencies, impute missing data via web search, and surface candidates for new articles. This self-healing loop prevents knowledge rot as the corpus grows.

**Output filing.** Query outputs get written back into the wiki, so exploration compounds. Each answer enriches the base for subsequent questions.

The [Ars Contexta](../projects/openclaw.md) Claude Code plugin formalizes this into a six-phase pipeline it calls the **6 Rs**: Record, Reduce, Reflect, Reweave, Verify, Rethink. Each phase runs in a fresh subagent context window to avoid attention degradation across long processing chains. The project's `reference/kernel.yaml` defines 15 primitives every generated system must include, and `methodology/` contains 249 interconnected research claims backing every architectural decision.

## Directory Structure

A typical LLM knowledge base separates content into three spaces:

```
vault/
├── raw/           # Source documents, unprocessed
├── wiki/          # LLM-compiled articles, summaries, indexes
│   ├── concepts/  # Synthesized concept articles
│   ├── sources/   # Per-document summaries with backlinks
│   └── index.md   # Navigation entry point
└── outputs/       # Query results filed back in
```

The [Ars Contexta](../repos/agenticnotetaking-arscontexta.md) system names these `self/`, `notes/`, and `ops/` — agent persistent state, the knowledge graph, and operational coordination respectively. The names adapt to domain but the separation is architectural, not cosmetic.

## Relation to RAG

LLM knowledge bases and [Retrieval-Augmented Generation](../concepts/rag.md) overlap but are not the same thing.

[RAG](../concepts/rag.md) typically involves embedding documents, storing vectors in a [vector database](../concepts/vector-database.md), and retrieving chunks at query time via similarity search. The knowledge store is static between queries; a separate ingestion pipeline updates it.

An LLM knowledge base treats the agent as the curator. The agent writes index files, updates summaries when new sources arrive, and maintains navigational structure. At small-to-medium scale (under ~500K words), this can replace vector retrieval entirely: the agent reads its own indexes to find relevant sections, then reads those sections directly. Karpathy noted he expected to need "fancy RAG" but found the agent's self-maintained indexes sufficient.

At larger scales, the two approaches combine: [hybrid search](../concepts/hybrid-search.md) across the markdown corpus, [BM25](../concepts/bm25.md) for keyword matching, or purpose-built tools like `qmd` (a semantic search CLI) layer on top of the file structure rather than replacing it.

## Relation to Agent Memory

LLM knowledge bases occupy the [semantic memory](../concepts/semantic-memory.md) tier of [agent memory](../concepts/agent-memory.md) taxonomies: durable, factual, queryable across sessions. They differ from [episodic memory](../concepts/episodic-memory.md) (session logs, interaction history) and [procedural memory](../concepts/procedural-memory.md) (skills, workflows encoded as instructions).

[CLAUDE.md](../concepts/claude-md.md) files and [Skill Files](../concepts/skill-md.md) sit in the procedural layer: they tell the agent *how* to work, not *what is known*. A complete agent intelligence system typically combines all three layers.

The [Ars Contexta](../repos/agenticnotetaking-arscontexta.md) three-space model makes this separation explicit: `self/` (agent identity and methodology — procedural), `notes/` (knowledge graph — semantic), `ops/` (session state — episodic).

## Tooling and IDE

[Obsidian](../projects/obsidian.md) appears consistently as the preferred human-facing interface. It renders markdown with backlink visualization, supports plugins for alternate views (Marp for slides, graph view for link topology), and stores everything as plain files — no database, no lock-in. The LLM writes to the files; the human browses in Obsidian.

[Claude Code](../projects/claude-code.md) is the primary agent runtime in documented implementations, both in Karpathy's workflow and the Ars Contexta plugin architecture. The plugin system's `PostToolUse` hooks enforce schema validation on every file write and auto-commit to git.

Custom CLI tools built alongside the knowledge base — Karpathy mentioned building "a small and naive search engine" — serve as tools the agent can invoke during Q&A sessions. This keeps the knowledge base inspectable and the tooling minimal.

## Strengths

**Inspectability.** Every piece of knowledge is a readable markdown file. No opaque vector embeddings, no database queries needed to understand what the agent knows. Debugging a bad answer means reading the relevant wiki article.

**Compounding value.** Filed query outputs mean the knowledge base improves with use. A question answered in week one becomes context that makes week-four answers better.

**Infrastructure simplicity.** At moderate scale, plain files with git versioning replace vector databases, embedding pipelines, and retrieval infrastructure. Operational complexity is low.

**Domain adaptation.** The agent writes concept articles in the vocabulary of the domain, not generic summaries. A knowledge base on interpretability research develops the terminology of interpretability research, not NLP-in-general.

## Limitations

**Concrete failure mode — stale inconsistency at scale.** As the wiki grows past a few hundred articles, the agent's self-maintained indexes can lag new additions. If the agent writes a new concept article but doesn't update the main index and backlinks in related articles, navigation breaks. Linting passes help but require explicit scheduling. A knowledge base that grows faster than linting runs accumulates invisible gaps.

**Unspoken infrastructure assumption — local file access.** The entire pattern assumes the LLM agent has read/write access to a local or network filesystem. Cloud-based chat interfaces (ChatGPT, Claude.ai without projects) cannot implement this architecture. It requires an agent runtime with tool use and file system access: Claude Code, a local LangChain setup, or equivalent.

## When Not to Use It

Skip this architecture if:

- Your knowledge base needs to scale beyond ~1M words in the near term. At that size, index-based navigation breaks down and you need vector retrieval infrastructure anyway. Build on [RAG](../concepts/rag.md) from the start.
- Multiple humans need to edit the knowledge base. LLM-maintained files conflict badly with human editorial conventions. Use a proper wiki or documentation system.
- Your retrieval accuracy requirements are high and measurable. Self-maintained markdown indexes are less precise than embedding-based retrieval for specific factual lookups. If you need to benchmark retrieval quality, use [vector databases](../concepts/vector-database.md) with [hybrid search](../concepts/hybrid-search.md).
- You need real-time updates. Compilation passes are batch processes. A knowledge base that must reflect events within minutes needs a different pipeline.

## Unresolved Questions

The documented implementations leave several questions open:

**Conflict resolution.** When the agent rewrites an article and the new version contradicts the old one, nothing in the described architecture resolves which version is authoritative. Human review catches some conflicts; linting catches others. How often this fails in practice is not reported.

**Cost at scale.** Karpathy mentions a ~400K word wiki as "small scale." Compiling and linting this size corpus with frontier models costs meaningfully in tokens. No public cost benchmarks exist for different corpus sizes or linting frequencies.

**Cross-session coherence.** The agent that compiled article A three months ago may reason differently than the agent running today. No described mechanism detects or reconciles stylistic or factual drift across compilation sessions.

**Governance for multi-user systems.** Every described implementation is single-user. Whether the pattern extends to team knowledge bases — with multiple agents writing, potentially conflicting — is not addressed.

## Alternatives

- **[RAG](../concepts/rag.md)** when retrieval precision matters more than inspectability, or corpus size exceeds ~500K words.
- **[Knowledge Graph](../concepts/knowledge-graph.md) / [GraphRAG](../concepts/graphrag.md)** when relationship structure between entities matters as much as document content — entity resolution, multi-hop queries.
- **[Mem0](../projects/mem0.md) or [Zep](../projects/zep.md)** when you need managed memory infrastructure with APIs rather than a file-based system you maintain yourself.
- **[Letta](../projects/letta.md)** when agent memory needs to persist across sessions in a production system with multiple concurrent agents.
- **Static documentation (Notion, Confluence, GitHub wikis)** when humans are the primary authors and the knowledge base changes infrequently.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Semantic Memory](../concepts/semantic-memory.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Knowledge Graph](../concepts/knowledge-graph.md)
- [Hybrid Search](../concepts/hybrid-search.md)
- [CLAUDE.md](../concepts/claude-md.md)
- [Skill Files](../concepts/skill-md.md)
- [Progressive Disclosure](../concepts/progressive-disclosure.md)
- [Zettelkasten](../concepts/zettelkasten.md)

---
entity_id: marp
type: project
bucket: knowledge-substrate
abstract: >-
  MARP is a Markdown-to-presentation tool (Obsidian plugin + CLI) that renders
  slide decks from `.md` files using fenced directives; its role in agent
  workflows is as a structured output format for LLM-generated knowledge
  summaries.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
related:
  - andrej-karpathy
  - retrieval-augmented-generation
  - obsidian
  - synthetic-data-generation
  - zettelkasten
  - markdown-wiki
  - synthetic-data-generation
last_compiled: '2026-04-08T03:04:59.690Z'
---
# MARP

## What It Does

MARP (Markdown Presentation Ecosystem) converts Markdown files into slide presentations. It originated as a standalone desktop app, then became a VS Code extension and CLI tool (`@marp-team/marp-cli`), and is available as an [Obsidian](../projects/obsidian.md) plugin. The core mechanic: you write standard Markdown with YAML front matter and slide-separator directives (`---`), and MARP renders it to HTML, PDF, or PPTX.

In agent and knowledge management contexts, MARP's relevance is narrow but specific. [Andrej Karpathy](../concepts/andrej-karpathy.md) uses it as one of several output formats in his LLM-maintained [Markdown Wiki](../concepts/markdown-wiki.md) workflow. When an LLM answers a complex research query, it can render the answer as a MARP slide deck rather than raw text. That slide file gets filed back into the wiki, becoming a structured artifact the agent can reference in future queries.

## Architecture

MARP's rendering pipeline handles a Markdown file with front matter:

```markdown
---
marp: true
theme: default
---

# Slide One
Content here

---

# Slide Two
More content
```

The `marp: true` front matter activates the engine. Slide breaks use `---` delimiters. Directives control layout, theme, and pagination. The Obsidian plugin renders these natively inside the vault without leaving the application.

For agent systems, the format matters more than the renderer. An LLM generating MARP output writes to a `.md` file with the correct front matter and delimiter structure. Obsidian or the CLI renders it on demand. The LLM never touches a rendering engine directly — it writes text, and the presentation layer is a human-facing concern.

## Role in Karpathy's Knowledge Base Architecture

The workflow described in [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) treats MARP as one of three visual output formats alongside matplotlib images and standard Markdown articles. The agent:

1. Receives a research query
2. Reads relevant wiki articles (auto-maintained index files)
3. Generates a response in MARP format
4. Writes the `.md` file into the wiki
5. Files it back so future queries can reference the synthesis

This makes MARP output part of the [Organizational Memory](../concepts/organizational-memory.md) loop rather than a throwaway artifact. The slide deck becomes a compressed, structured summary that the LLM agent can load cheaply in future contexts — smaller than raw research notes, more scannable than prose articles.

The key property is that MARP files are plain Markdown. The LLM reads, writes, and lints them with the same tooling as every other wiki file. No binary formats, no external APIs needed for generation.

## Strengths

**Plain-text compatibility.** Agents handle `.md` files natively. MARP adds no new file type, no special parser requirement, and no encoding concern. The front matter and delimiters are low-overhead additions.

**Human-readable intermediate format.** A MARP file works as readable prose even without rendering. This matters for agent workflows where the LLM may read the file back in text form.

**Obsidian integration.** In Karpathy's setup, Obsidian serves as the visualization layer for the entire pipeline. MARP slides, wiki articles, and matplotlib images all live in the same vault and render in the same IDE, so human review requires no context switching.

**Structured output constraint.** Asking an LLM to produce MARP format rather than open-ended prose imposes loose structure (slide titles, bullet hierarchies, sequential logic). This can improve synthesis quality over unconstrained text generation, though this is anecdotal, not benchmarked.

## Critical Limitations

**No semantic structure beyond Markdown.** MARP slides are flat text. They carry no machine-readable metadata about relationships between concepts, no entity links that a downstream agent can traverse automatically. Compare this to a knowledge graph approach like [GraphRAG](../projects/graphrag.md) or [Graphiti](../projects/graphiti.md), where nodes and edges are explicit. MARP output must be re-parsed by an LLM to extract structured information — the format optimizes for human readability, not agent consumption.

**Assumed local Obsidian infrastructure.** The workflow assumes Obsidian is running with the MARP plugin installed, a local file system accessible to both the LLM agent and the viewer, and a human who will look at the rendered output. In headless agent deployments or cloud-based pipelines, MARP output is just Markdown that never gets rendered. The "visual output" value disappears entirely.

## When NOT to Use It

If your agent pipeline has no human in the review loop, MARP provides no value over plain Markdown. The presentation layer is wasted.

If your knowledge base exceeds the ~100 article / ~400K word scale where Karpathy's index-file approach holds up, the output artifacts (including MARP slides) compound the organizational problem rather than solving it. At that scale, reaching for a real [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) system or a structured memory layer like [Mem0](../projects/mem0.md) makes more sense.

If outputs need to flow into downstream automated pipelines (another agent reads the result, not a human), MARP format adds parsing overhead with no benefit.

## Unresolved Questions

The source material describes MARP use in a personal research workflow with one knowledge domain and one user. Several questions have no documented answers:

- How the LLM decides when to generate MARP output versus prose versus images — the routing logic is not described
- Whether MARP files filed back into the wiki degrade retrieval quality by mixing presentation structure with article structure
- How slide content interacts with the linting / health-check pass — whether MARP delimiters confuse consistency checks run across wiki articles

## Ecosystem Position

MARP sits at the presentation layer of the Karpathy knowledge base stack, which runs: raw sources → `raw/` directory → LLM compilation → Markdown wiki → agent Q&A → output artifacts → Obsidian visualization. MARP occupies the last two steps for slide-format outputs.

The broader pattern — LLM-maintained flat-file wikis with self-healing linting loops — is discussed in [Markdown Wiki](../concepts/markdown-wiki.md). The memory architecture implications connect to [Agent Memory](../concepts/agent-memory.md) and [Semantic Memory](../concepts/semantic-memory.md). [Synthetic Data Generation](../concepts/synthetic-data-generation.md) is the cited next step: once the wiki is large enough, fine-tune a model on the content so knowledge lives in weights rather than files.

## Alternatives

| Need | Use instead |
|------|-------------|
| Structured agent-readable knowledge store | [Knowledge Graph](../concepts/knowledge-graph.md) via [Neo4j](../projects/neo4j.md) or [Graphiti](../projects/graphiti.md) |
| Retrieval at scale | [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) with [ChromaDB](../projects/chromadb.md) or [Pinecone](../projects/pinatone.md) |
| Flat-file wiki without presentation | Standard Markdown in [Zettelkasten](../concepts/zettelkasten.md) structure |
| Human-facing slides with richer tooling | Reveal.js, Google Slides API |

MARP is the right choice when a human needs to review LLM-synthesized research as slides, the pipeline runs through Obsidian, and portability of `.md` files matters more than semantic structure.


## Related

- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.3)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.3)
- [Obsidian](../projects/obsidian.md) — part_of (0.4)
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — part_of (0.3)
- [Zettelkasten](../concepts/zettelkasten.md) — part_of (0.4)
- [Markdown Wiki](../concepts/markdown-wiki.md) — part_of (0.6)
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — part_of (0.3)

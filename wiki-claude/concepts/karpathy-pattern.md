# The Karpathy Pattern (LLM-Compiled Wiki)

> A knowledge base architecture where raw sources are ingested into a directory, an LLM incrementally "compiles" them into a structured markdown wiki, and the wiki is maintained by agents through linting health checks, query-driven enhancement, and self-healing index maintenance -- turning knowledge bases into living systems rather than static artifacts.

## Why It Matters

Most knowledge management tools treat information as inert: you store it, you search it, you hope the right thing comes back. The Karpathy Pattern inverts this relationship. The LLM does not just retrieve from the knowledge base -- it actively maintains, cross-links, and enhances it. Every query becomes an opportunity to file new insights back into the wiki. Every health check finds inconsistencies, imputes missing data, and suggests new connections. The result is a knowledge base that compounds in value over time rather than decaying.

For practitioners, this matters because it eliminates the RAG infrastructure tax. At small-to-medium scale (roughly 100 articles and 400K words), auto-maintained markdown indexes with brief summaries perform surprisingly well without embeddings, vector databases, or chunking strategies. The bottleneck shifts from retrieval architecture to intelligent wiki evolution.

## How It Works

The pattern operates in five stages:

1. **Data Ingest.** Source documents (articles, papers, repos, datasets, images) are collected into a `raw/` directory as markdown files. Web articles are clipped using tools like the Obsidian Web Clipper. The raw data is never modified -- it serves as the canonical source of truth.

2. **LLM Compilation.** An LLM incrementally processes raw sources into a structured `wiki/` directory. This includes summaries, concept articles, backlinks, categorization, and cross-references. The human rarely touches the wiki directly; it is the domain of the LLM.

3. **Obsidian as IDE.** The wiki is viewed and navigated through Obsidian, which renders markdown, images, Marp slides, and matplotlib visualizations. Obsidian plugins extend the viewing experience, but the critical point is that the LLM writes the content, and the human browses it.

4. **Query-Driven Enhancement.** When the user asks complex questions against the wiki, the LLM researches answers and generates output (markdown articles, slides, charts). These outputs are then "filed back" into the wiki, so explorations and queries always add up in the knowledge base.

5. **Linting and Health Checks.** LLM-driven health checks run over the wiki to find inconsistent data, impute missing information using web search, discover interesting connections for new article candidates, and incrementally clean up data integrity. The LLMs suggest further questions to investigate, creating a self-reinforcing improvement loop.

A concrete example: this repository (meta-kb) implements the pattern. Raw tweets, repos, papers, and articles are ingested into `raw/`, scored for relevance by LLM, and compiled into the `wiki/` directory with concept explainers, project profiles, comparisons, and indexes.

## Who Implements It

- [Karpathy Autoresearch](../projects/autoresearch.md) -- the canonical implementation; `program.md` as human-editable agent context driving iterative research, with git as episodic memory
- [napkin](../../raw/repos/michaelliv-napkin.md) -- file-based knowledge system with BM25 search and progressive disclosure (L0 context note through L3 full content), scoring 92% on LongMemEval without embeddings
- [Ars Contexta](../../raw/repos/agenticnotetaking-arscontexta.md) -- generates personalized knowledge system architectures through conversation, producing CLAUDE.md-style context files, processing pipelines, and navigation maps backed by 249 research claims
- [Obsidian Skills](../projects/obsidian-skills.md) -- modular agent skills for Obsidian that enable agentic automation of wiki operations (markdown creation, canvas visualization, CLI interaction)
- [Supermemory](../projects/supermemory.md) -- memory engine with automatic fact extraction, temporal reasoning, contradiction handling, and automatic forgetting

## Open Questions

- At what scale does the pattern break? Karpathy reports it works at ~100 articles and ~400K words. What happens at 10K articles? Does the index-maintenance cost grow linearly or superlinearly?
- Can synthetic data generation and finetuning allow the LLM to "know" the wiki in its weights rather than just in context windows, as Karpathy speculates?
- How do you handle conflicting information across sources without human adjudication? Current health-check linting can detect inconsistencies but resolving them may require domain expertise.
- What is the right boundary between human curation and LLM maintenance? The pattern positions the human as an orchestrator, but some domains may require tighter human editorial control.

## Sources

- [Karpathy LLM Knowledge Bases tweet](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) -- "raw data from a given number of sources is collected, then compiled by an LLM into a .md wiki, then operated on by various CLIs by the LLM to do Q&A and to incrementally enhance the wiki"
- [himanshustwts architecture breakdown](../../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md) -- "the real power isn't fancy RAG -- it's letting LLMs actively maintain and evolve markdown wikis as living systems"
- [DataChaz analysis](../../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md) -- "when agents maintain their own memory layer, they don't need massive, expensive context limits. They really just need clean file organization and the ability to query their own indexes"

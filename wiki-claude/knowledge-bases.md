# The State of LLM Knowledge Bases

> The markdown wiki is eating the vector database. Kicked off by Karpathy's viral pattern of using LLMs to compile raw sources into structured, queryable markdown, the field is converging on a surprisingly simple insight: the best knowledge base for an LLM is one it can read and write directly, without embedding pipelines, vector indexes, or retrieval infrastructure standing in the way.

## Approach Categories

### The Karpathy Pattern: LLM-Compiled Markdown Wikis

The canonical approach, outlined in Karpathy's 38K-like tweet, is deceptively simple: ingest raw sources (papers, tweets, docs) into a folder, have an LLM compile them into a structured markdown wiki with auto-generated summaries, backlinks, and categorization, then use Obsidian as the IDE frontend for visualization and navigation ([Karpathy tweet](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)).

The real insight isn't the compilation step—it's the feedback loop. Every query against the knowledge base can file improvements back into the wiki. The LLM maintains indexes, fixes broken links, and generates new cross-references autonomously. As [@himanshustwts](../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md) documented, the architecture has five stages: data ingest, Obsidian frontend, Q&A via self-maintained indexes (no RAG needed), diverse output rendering, and linting health checks for consistency.

What makes this work in practice is the inspectability. Every piece of knowledge is a file you can read, edit, diff, and version-control. There's no opaque embedding space to debug when retrieval fails. [@DataChaz](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md) called this "the ultimate self-improving setup"—and the key enabler is that the agent doing the maintenance can read its own output format natively.

[Ars Contexta](../raw/repos/agenticnotetaking-arscontexta.md) (2,928 stars) pushes this further by deriving cognitive architectures—folder structures, processing pipelines, templates, and hooks—directly from research principles rather than generic templates. Rather than giving every user the same wiki structure, it generates individualized knowledge systems calibrated to their domain.

### RAG and Its Discontents

Retrieval-Augmented Generation remains the default enterprise approach, but production failures are well-documented. The core architecture—chunk documents, embed them, retrieve by similarity, stuff into context—breaks in predictable ways.

[TheProdSDE's analysis](../raw/articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md) identifies the failure modes: RAG systems work in demos but fail quietly in production through degradation rather than crashes. The fixes are all in system design: layout-aware parsing that preserves document structure, hybrid retrieval combining semantic and keyword search, cross-encoder reranking, and careful context building that respects token budgets.

Agentic RAG makes things worse before it makes them better. [Mostafa Ibrahim](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md) documents three compounding failure modes unique to agentic RAG's plan-retrieve-evaluate-decide loop: **retrieval thrash** (the agent keeps searching without converging), **tool storms** (cascading tool calls that burn budgets), and **context bloat** (context fills with low-signal content until the model stops following instructions). The mitigations are explicit budgeting and stopping rules—max 3 retrieval iterations, max 10-15 tool calls, hard context token ceilings.

### Graph-Based Knowledge Retrieval

GraphRAG introduced the idea that knowledge graphs built from source documents can answer global, corpus-level questions that traditional RAG fundamentally cannot ([Edge et al.](../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)). By building entity knowledge graphs and precomputing community summaries, GraphRAG enables hierarchical aggregation of local entity relationships into global answers.

But the picture is more nuanced than "graphs beat vectors." [Han et al.'s systematic evaluation](../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) shows that no single approach universally wins: GraphRAG excels on multi-hop reasoning and complex queries, while traditional RAG performs better on direct lookup. The practical implication: match your retrieval architecture to your query complexity rather than assuming one paradigm always outperforms.

[HippoRAG](../raw/repos/osu-nlp-group-hipporag.md) (3,332 stars, NeurIPS'24) bridges the gap by mimicking human memory consolidation—knowledge graphs with personalized PageRank for multi-hop associativity. It's cost-efficient compared to full GraphRAG and enables continual learning without fine-tuning.

[Cognee](../raw/repos/topoteretes-cognee.md) (14,899 stars) takes the production angle, combining vector search with graph databases and continuous learning in a unified Python SDK. Six lines of code gets you a dynamically evolving knowledge graph that grounds queries in relationship structures.

### Reasoning-Based and Vector-Free Retrieval

A contrarian thread is emerging: you don't need vectors at all.

[PageIndex](../raw/repos/vectifyai-pageindex.md) (23,899 stars) uses hierarchical tree indexing and LLM reasoning for retrieval, eliminating vector similarity approximation entirely. It structures documents like a table of contents and achieves 98.7% accuracy on FinanceBench—by reasoning about where information lives rather than computing cosine distances.

[napkin](../raw/repos/michaelliv-napkin.md) (264 stars, but 91% accuracy on LongMemEval) demonstrates that BM25 search on markdown with progressive disclosure can match or exceed RAG systems while keeping memory local and human-readable. No embeddings, no vector databases, no preprocessing—just keyword search on well-organized files.

[code-review-graph](../raw/repos/tirth8205-code-review-graph.md) (4,176 stars) applies this to code: Tree-sitter-based code graphs with blast-radius dependency analysis reduce token consumption 6.8-49x by reading only affected files instead of entire codebases.

## The Convergence

Three threads keep emerging across all approaches:

**Markdown is the universal interface.** Whether it's Karpathy's wiki, napkin's local files, or Ars Contexta's derived architectures, the field is converging on plain markdown as the storage format. It's human-readable, LLM-readable, version-controllable, and diffs cleanly. The debate isn't about markdown vs. something else—it's about what sits on top of it.

**Self-maintenance is non-negotiable.** Every serious implementation includes some form of automated linting, health checks, or self-healing. Knowledge bases that can't maintain themselves degrade into noise. Karpathy's linting step, [Supermemory's](../raw/repos/supermemoryai-supermemory.md) contradiction handling, and HippoRAG's continual learning all address the same insight: knowledge bases are living systems, not static artifacts.

**Retrieval is moving from similarity to reasoning.** The shift from "find the most similar chunk" to "reason about where the answer lives" is visible in PageIndex, GraphRAG, and even the Karpathy pattern's self-maintained indexes. The most effective systems use structural knowledge (graphs, hierarchies, indexes) to navigate, not just semantic similarity to retrieve.

## The Divergence

**Compiled vs. curated knowledge.** Karpathy's pattern compiles knowledge from raw sources—the LLM synthesizes and organizes. Traditional knowledge management (Obsidian, Notion, Zettelkasten) curates knowledge through human editorial judgment. [A-MEM](../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md) tries to bridge this with Zettelkasten-inspired dynamic organization where memories actively trigger updates to existing knowledge. The question of when LLM compilation introduces unacceptable distortion vs. when it enables useful synthesis is unresolved.

**Centralized vs. distributed knowledge.** Some approaches (Mem0, Supermemory) centralize knowledge into a dedicated memory layer. Others ([Open Brain](../raw/repos/natebjones-projects-ob1.md), the Karpathy wiki) keep knowledge in files distributed across the filesystem. The tradeoff is queryability vs. portability—and neither side has won.

**Embedding-based vs. embedding-free.** The vector database industry assumes embeddings are required. napkin and PageIndex prove they aren't—at least for well-structured corpora. The conditions under which each approach dominates remain empirically unclear.

## What's Hot Now

Karpathy's LLM knowledge base tweet (38,638 likes, 9.9M views) triggered an explosion of implementations. [Obsidian Skills](../raw/repos/kepano-obsidian-skills.md) (19,325 stars) provides the agent-side tooling for Obsidian knowledge bases. [Supermemory](../raw/repos/supermemoryai-supermemory.md) (20,994 stars) ranks #1 on three major benchmarks (LongMemEval, LoCoMo, ConvoMem). The Karpathy autoresearch repo hit 65,009 stars.

The "wiki as agent brain" pattern ([jumperz tweet](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)) is gaining traction: multi-agent systems where a shared wiki serves as the coordination layer, with a supervisor agent validating entries blind to prevent compounding hallucinations.

[Context compression](../raw/repos/laurian-context-compression-experiments-2508.md) is becoming production-critical as knowledge bases grow. Hybrid prompt optimization (DSPy GEPA + TextGrad) achieved 100% extraction rate on previously failing cases, and [LLMLingua](../raw/repos/microsoft-llmlingua.md) (5,985 stars) demonstrates 20x compression with minimal accuracy loss.

## Where It's Going

**Knowledge bases will become agent-native.** The current pattern is humans curate, agents query. The emerging pattern is agents build, agents maintain, agents query, humans review. [Ars Contexta](../raw/repos/agenticnotetaking-arscontexta.md) and [Obsidian Skills](../raw/repos/kepano-obsidian-skills.md) point toward knowledge systems that are designed from the ground up for agent authorship.

**RAG is being unbundled.** The monolithic retrieve-and-generate pipeline is splitting into specialized components: structural retrieval (graphs, trees), semantic retrieval (vectors), keyword retrieval (BM25), and reasoning-based retrieval. Production systems will compose these based on query type rather than using one approach for everything.

**Synthetic data generation from knowledge bases** is Karpathy's explicit next frontier—using compiled wikis to generate training data for fine-tuning, closing the loop from knowledge base to model weights. This would make knowledge bases not just context providers but training data factories.

## Open Questions

- At what corpus size does the Karpathy pattern's compile-everything approach break down, and what's the fallback?
- Can LLM-compiled knowledge bases maintain factual accuracy over hundreds of compilation cycles without human review?
- How do you merge knowledge bases across teams or organizations without structural conflicts?
- What's the right granularity for knowledge base entries—atomic facts, paragraph-level summaries, or full document compilations?
- When should you embed vs. index vs. compile, and can a system choose dynamically based on query type?

## Sources

**Tweets**
- [Karpathy — LLM Knowledge Bases](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)
- [himanshustwts — Full Architecture](../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)
- [DataChaz — Self-Improving Setup](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)
- [jumperz — Wiki as Agent Brain](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

**Articles**
- [TheProdSDE — RAG Failures in Production](../raw/articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md)
- [Mostafa Ibrahim — Agentic RAG Failure Modes](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

**Papers**
- [Edge et al. — GraphRAG](../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)
- [Han et al. — RAG vs GraphRAG](../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)
- [Xu et al. — A-MEM](../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)

**Repos**
- [HippoRAG](../raw/repos/osu-nlp-group-hipporag.md) — [Cognee](../raw/repos/topoteretes-cognee.md) — [PageIndex](../raw/repos/vectifyai-pageindex.md)
- [napkin](../raw/repos/michaelliv-napkin.md) — [Supermemory](../raw/repos/supermemoryai-supermemory.md) — [Obsidian Skills](../raw/repos/kepano-obsidian-skills.md)
- [Ars Contexta](../raw/repos/agenticnotetaking-arscontexta.md) — [code-review-graph](../raw/repos/tirth8205-code-review-graph.md)
- [LLMLingua](../raw/repos/microsoft-llmlingua.md) — [Context Compression Experiments](../raw/repos/laurian-context-compression-experiments-2508.md)
- [Open Brain](../raw/repos/natebjones-projects-ob1.md)

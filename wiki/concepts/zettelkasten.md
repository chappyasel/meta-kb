---
entity_id: zettelkasten
type: approach
bucket: knowledge-substrate
abstract: >-
  Zettelkasten is a note-taking method built on atomic, densely-linked notes;
  its key differentiator for agent systems is that wikilink graphs enable graph
  traversal without vector infrastructure.
sources:
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
related:
  - obsidian
  - andrej-karpathy
  - synthetic-data-generation
  - markdown-wiki
  - marp
  - claude-code
last_compiled: '2026-04-08T23:18:03.087Z'
---
# Zettelkasten

## What It Is

Zettelkasten (German for "slip box") is a knowledge management method developed by sociologist Niklas Luhmann, who used it to write over 70 books and 400 articles. The method has two core constraints: notes must be atomic (one idea per note) and notes must link explicitly to other notes. Luhmann maintained roughly 90,000 physical index cards, each with a unique identifier, a single idea, and handwritten references to related cards.

The structural principle is that knowledge grows more useful as a network than as a hierarchy. A folder stores documents. A Zettelkasten accumulates connections. The difference matters because connections surface non-obvious relationships that retrieval from folders cannot.

In digital implementations, the physical card becomes a markdown file, the handwritten reference becomes a `[[wikilink]]`, and the slip box becomes a directory. [Obsidian](../projects/obsidian.md) is the dominant tool for this pattern, but the format requires nothing proprietary: plain markdown files with wikilinks work in any text editor.

## Why It Matters for Agent Systems

The Zettelkasten pattern has acquired new relevance because LLMs can traverse link graphs in ways humans cannot do efficiently. A human browsing a 500-note vault gets lost. An agent can follow wikilinks programmatically, treating the link graph as a traversable knowledge structure without any database infrastructure.

[Andrej Karpathy](../concepts/andrej-karpathy.md) described this pattern publicly: an LLM compiles source documents into a markdown wiki with backlinks and article-level summaries, then answers queries by traversing the wiki directly. At roughly 400K words across 100 articles, he found this sufficient without RAG. The key observation is that LLM-maintained index files and per-document summaries substitute for vector retrieval at small-to-medium scale.

The A-MEM paper formalizes what Karpathy did informally. Its memory system assigns each memory note seven components: raw content, timestamp, LLM-generated keywords, tags, a contextual description, a dense embedding, and a bidirectional link set. The link set is Zettelkasten-derived: connections emerge from content analysis rather than a predefined schema. On multi-hop reasoning tasks (LoCoMo benchmark), this architecture achieved 45.85 F1 versus 18.41 for the baseline — a 149% improvement — while using 85% fewer tokens by avoiding full-context stuffing.

## How It Works

### Atomic Notes

Each note holds one idea, claim, or concept. This constraint feels limiting but creates retrieval precision: if a note mixes three ideas, a query matching one idea pulls in noise from the other two. Atomic notes mean every retrieved note is relevant to the concept it represents.

In agent implementations, atomicity maps to chunk quality. A Zettelkasten note is already a well-formed chunk. Systems like Napkin's LongMemEval results (91% on the S-dataset) achieved this partly by storing per-conversation-round notes (~2,500 characters each) rather than full session logs (~15,000 characters). Smaller, focused documents outperform large aggregated ones for keyword retrieval because term frequency better reflects the note's actual topic.

### Wikilinks as Graph Edges

Every `[[link]]` in a note creates a directed edge in the knowledge graph. Bidirectional link tracking (noting which notes link to a given note) creates an inbound reference count equivalent to a lightweight PageRank signal.

Napkin's search ranking uses this: `composite = BM25_score + backlink_count * 0.5 + recency_normalized * 1.0`. Notes with more incoming links rank higher in search results, surfacing well-connected concepts ahead of orphaned ones. The link graph replaces vector similarity for this purpose, with zero infrastructure cost.

The Ars Contexta system makes this explicit: "wiki links implement GraphRAG without the infrastructure." Following wikilinks enables multi-hop traversal through a knowledge graph using only a filesystem and a grep-equivalent tool. A query about authentication might surface a note on OAuth, which links to a note on token expiration, which links to a note on refresh token rotation — the agent traverses the path by following links.

### Maps of Content

A Map of Content (MOC) is a note that aggregates links to related notes rather than containing a single idea. MOCs function as navigable index pages: instead of searching for entry points, an agent consults the MOC for a topic area and branches from there.

Ars Contexta's generated systems require MOC hierarchies as one of ten kernel primitives. Every note must include a "Topics footer" linking back to its parent MOCs. This creates a bidirectional structure: MOCs point down to specific notes, specific notes point up to MOCs. The result is that an agent can navigate top-down (from MOC to detail) or bottom-up (from a note to the concept cluster it belongs to).

### Processing Pipeline

Raw information enters differently from mature knowledge. Zettelkasten implementations typically distinguish:

- **Fleeting notes**: quick captures, processed later
- **Literature notes**: summaries of external sources
- **Permanent notes**: atomic ideas in the author's own words, linked to existing notes

In agent systems this becomes a staged pipeline. Karpathy's workflow: raw source documents go into `raw/`, an LLM compiles them into a wiki with summaries and backlinks, queries operate on the compiled wiki, and query outputs get filed back into the wiki. Each stage has a different quality guarantee. The Ars Contexta 6Rs pipeline formalizes this further: Record, Reduce, Reflect, Reweave, Verify, Rethink — each phase runs in a fresh context window to avoid attention degradation.

## Who Implements It

**[Obsidian](../projects/obsidian.md)** is the primary implementation for human-maintained Zettelkasten vaults. Its graph view visualizes the link network; its backlink panel shows all notes linking to the current one. Steph Ango's [agent skill package](../projects/obsidian.md) for Obsidian formalizes how AI agents should produce correctly-formatted Obsidian markdown, wikilinks, and canvas files.

**Ars Contexta** generates domain-specific Zettelkasten systems from a graph of 249 interconnected research claims. Its derivation engine maps a user's described workflow to eight configuration dimensions, then produces a complete vault structure justified by specific claims from the methodology graph. The system runs as a [Claude Code](../projects/claude-code.md) plugin.

**A-MEM** implements Zettelkasten principles for agent long-term memory. Each memory becomes a structured note with LLM-generated metadata and a bidirectional link set. New memories trigger evolution updates to existing linked memories, keeping the network coherent as new information arrives.

**[Napkin](../projects/obsidian.md)** (Michael Livshits) uses Zettelkasten structure with BM25 retrieval and a backlink-weighted ranking signal. It stores per-round conversation notes in day-directory organization and provides a four-level progressive disclosure interface (NAPKIN.md → keyword overview → BM25 search → full read) for agent consumption.

**[Andrej Karpathy](../concepts/andrej-karpathy.md)** uses an LLM-maintained markdown wiki with Obsidian as the viewing interface, [MARP](../projects/marp.md) for slide output, and a custom search CLI as an agent tool.

## Practical Implications

### Progressive Disclosure Fits Context Budgets

A full Zettelkasten vault does not fit in a context window. The standard solution: load an overview first, search for relevant notes, then read specific files. Napkin structures this as four explicit levels (L0 through L3). Ars Contexta enforces it through MOC hierarchies and description fields on every note.

The overview level is typically generated by TF-IDF across folder contents: headings weighted 3x, filenames 2x, body text 1x. This produces a keyword map that costs roughly 1,000-2,000 tokens and gives an agent enough signal to route queries to the right subgraph.

### Link Graphs Substitute for Vector Infrastructure

This is the practically significant claim. Napkin's 91% accuracy on LongMemEval-S (versus 86% for the best prior embedding-based system) demonstrates that BM25 plus backlink counts can match or exceed vector similarity retrieval for structured knowledge bases. The precondition: notes must be well-connected. A vault of unlinked notes degrades to pure BM25 with no graph signal.

The tradeoff is real. BM25 cannot match "authentication" to "login" without term overlap. Vector search handles synonyms naturally. For knowledge bases with consistent vocabulary — a research domain, a codebase, a project — this gap rarely surfaces. For knowledge bases spanning multiple domains with inconsistent terminology, embeddings provide meaningful improvement.

### Hooks Enforce What Instructions Suggest

Zettelkasten discipline erodes without enforcement. In human systems this is a motivation problem. In agent systems it is a context-pressure problem: instructions to add YAML frontmatter, create backlinks, and update MOCs get dropped when context fills.

Automated hooks address this: a write-validate hook checks YAML schema on every file write; an auto-commit hook versions changes; a session-start hook injects the workspace tree so the agent starts oriented. Ars Contexta's four hooks implement this pattern. The practical lesson: quality constraints for Zettelkasten maintenance must be in the execution path, not the system prompt.

### Memory Evolution Keeps the Graph Current

A static Zettelkasten accumulates obsolete connections. A-MEM's memory evolution mechanism updates existing notes when new information arrives that changes their context. A note about a project's timeline gets its contextual description updated when a cancellation note links to it.

This introduces a new failure mode: cascading incorrect updates. If the LLM misinterprets a connection, it silently corrupts the contextual descriptions of related notes. A-MEM does not maintain update history. For production systems this requires versioning or at minimum logging of evolution changes.

## Failure Modes

**Orphaned notes**: Notes created without links to existing notes cannot be surfaced by graph traversal or backlink ranking. A vault of 1,000 notes where 40% are orphaned has effectively two separate retrieval systems operating on the same corpus.

**Link rot**: Notes get renamed or reorganized, breaking wikilinks. In human-maintained vaults this requires manual cleanup. In agent-maintained vaults, automated rename propagation (or forbidding renames) prevents this.

**Granularity drift**: Mixed-granularity notes break the atomicity guarantee. A 5,000-word note mixed with 200-word notes means BM25 term frequency statistics are incomparable across the corpus. Enforced schema limits (maximum note length or a linter checking note scope) constrain this.

**Cold start**: A new vault has no links, so the backlink signal is zero for all notes. The system degrades to BM25-only until the vault accumulates enough connections to provide a meaningful graph signal. Auto-distillation (A-MEM's write-back mechanism) partially addresses this by creating links during knowledge ingestion.

**Temporal reasoning gaps**: Timestamps exist on notes but most Zettelkasten implementations lack temporal indexing. Queries like "what changed between last month and now" require the agent to navigate date-organized directories manually rather than using a temporal index. Day-directory organization (Napkin's pattern) provides a workaround but not a proper solution.

**Adversarial sensitivity**: A-MEM's enriched contextual descriptions — intended to improve retrieval — made it 28% worse on adversarial tasks. More semantic context amplifies misleading signals from leading questions. Systems with enriched note metadata need adversarial robustness evaluation before production deployment.

## When Not to Use It

Zettelkasten is the wrong choice when:

- **The knowledge base is monolithic**: Legal documents, financial reports, and technical specifications are single documents, not networks of atomic ideas. BM25 on document chunks or vector retrieval over fixed segments outperforms a fragmented Zettelkasten.
- **Temporal sequence matters more than concept clusters**: Conversation logs, event timelines, and sequential processes have natural order that Zettelkasten flattens. A time-series database or bi-temporal indexing (Zep's pattern) is more appropriate.
- **Scale exceeds filesystem performance**: At 10,000+ files, BM25 index rebuilds become slow and file-system traversal for graph navigation adds latency. Graph databases with native link traversal handle this better.
- **Multiple vocabularies span the corpus**: Cross-domain knowledge bases where "login" and "authentication" appear in different documents need semantic similarity, not keyword overlap. Add embeddings.
- **The agent cannot maintain discipline**: An agent that skips frontmatter, skips backlinks, and dumps everything in one note gets none of the benefits. Without hook enforcement, Zettelkasten degrades to a messy flat directory faster than any other structure.

## Unresolved Questions

**How many notes before progressive disclosure is mandatory?** Karpathy reports BM25 working adequately at ~100 articles without RAG. Napkin's benchmarks use per-round notes from ~40 sessions. Where exactly the transition point is — where direct context loading fails and structured retrieval becomes necessary — is not documented with controlled experiments.

**How does memory evolution interact with trust?** When A-MEM updates an existing note's contextual description because a new note arrived, the original note's content is implicitly reinterpreted. There is no documentation on how to handle conflicting interpretations or revert erroneous evolutions. Production systems need this.

**What is the right granularity?** Napkin uses per-round notes (~2,500 characters). Ars Contexta uses a configurable granularity dimension. A-MEM uses the raw content of each memory. No controlled experiment compares granularity choices on the same retrieval benchmark.

**Can Zettelkasten and vector retrieval compose cleanly?** The benchmark evidence suggests BM25 + backlinks matches embedding-based RAG for structured knowledge. But the failure mode (vocabulary gaps) is real. A hybrid architecture — BM25 + backlinks as the primary retrieval path, embeddings as a fallback for synonym bridging — is not documented in any of the reviewed systems.

## Alternatives

**[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)**: Use when vocabulary is inconsistent across the corpus or when the knowledge base is large enough (100K+ chunks) that BM25 recall degrades. RAG with embedding search handles synonym matching that Zettelkasten's wikilink traversal cannot.

**[Knowledge Graph](../concepts/knowledge-graph.md)**: Use when relationships have typed semantics (person→works_at→organization) rather than free-form connections. Typed graphs enable structured queries that Zettelkasten wikilinks cannot. [Graphiti](../projects/graphiti.md) and [Neo4j](../projects/neo4j.md) are production implementations.

**[Vector Database](../concepts/vector-database.md)**: Use when semantic similarity across vocabulary gaps is the primary retrieval requirement. Add to Zettelkasten when the backlink signal alone is insufficient for synonym bridging.

**[CLAUDE.md](../concepts/claude-md.md)**: Use for project-level procedural context (how to run tests, code conventions, current tasks) rather than accumulated knowledge. CLAUDE.md is instructions; Zettelkasten is knowledge. They are complementary: a project can use CLAUDE.md for agent orientation and a Zettelkasten vault for accumulated domain knowledge.

**[Markdown Wiki](../concepts/markdown-wiki.md)**: Use when hierarchical organization suffices and network effects from linking are not the primary goal. Simpler to maintain, less powerful for cross-concept retrieval.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md): Zettelkasten is one implementation pattern for long-term semantic memory
- [Semantic Memory](../concepts/semantic-memory.md): The memory type Zettelkasten most directly implements
- [Long-Term Memory](../concepts/long-term-memory.md): Persistent knowledge accumulation is Zettelkasten's primary use case
- [Context Engineering](../concepts/context-engineering.md): Progressive disclosure from Zettelkasten vaults is a context engineering technique
- [Progressive Disclosure](../concepts/progressive-disclosure.md): The retrieval pattern (overview → search → read) for agent vault consumption
- [BM25](../concepts/bm25.md): The retrieval algorithm that pairs naturally with Zettelkasten's structured markdown
- [Hybrid Search](../concepts/hybrid-search.md): Adding vector retrieval on top of BM25 to bridge vocabulary gaps
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md): Karpathy's proposed next step — finetune on wiki content to move knowledge into weights

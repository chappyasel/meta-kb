---
entity_id: obsidian
type: project
bucket: knowledge-substrate
abstract: >-
  Obsidian is a local-first, markdown-based note-taking and knowledge management
  app that stores all data as plain files, supports wikilinks and graph
  visualization, and serves as the human-readable frontend for LLM-driven
  knowledge bases.
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/kepano-obsidian-skills.md
  - repos/michaelliv-napkin.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/michaelliv-napkin.md
related:
  - retrieval-augmented-generation
  - zettelkasten
  - andrej-karpathy
  - synthetic-data-generation
  - markdown-wiki
  - marp
  - claude-code
  - synthetic-data-generation
last_compiled: '2026-04-08T02:42:51.122Z'
---
# Obsidian

## What It Is

Obsidian is a desktop application for personal knowledge management built around local markdown files. Notes live in a "vault" — a folder on your filesystem — and the app provides wikilink navigation (`[[Note Name]]`), a graph view of link relationships, and a plugin ecosystem for extending behavior. All data stays on disk as plain `.md`, `.canvas`, and `.base` files with no proprietary database.

In the LLM agent context, Obsidian matters for a different reason than its intended use. Karpathy's widely-circulated description of his research workflow (9.9M views) crystallized a pattern: use Obsidian not as a personal productivity tool but as the human-visible frontend for an LLM-maintained knowledge base. The LLM writes and maintains the vault; the human reads it in Obsidian. This inverts the typical usage model and positions Obsidian as a knowledge substrate — the storage and visualization layer for agent-generated content. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

## Core Mechanism

Obsidian's architecture is simple enough to be relevant here: markdown files on disk, a graph built from parsing `[[wikilinks]]`, frontmatter properties in YAML, and a plugin API that exposes vault operations. Four file types matter for agent workflows:

- **`.md`** — Standard markdown with Obsidian extensions: wikilinks, callouts (`> [!info]`), embeds (`![[Note]]`), and YAML frontmatter properties
- **`.canvas`** — JSON Canvas Spec 1.0 format for infinite-canvas diagrams (nodes, edges, groups). Open spec at jsoncanvas.org, MIT licensed
- **`.base`** — Obsidian's database-view format: YAML-defined table/list/card views over frontmatter properties, with a formula language supporting `filter()`, `map()`, `reduce()`, date arithmetic, and 15 built-in aggregations
- **`.obsidian/`** — Config directory with plugin settings, hotkeys, workspace state

The file-watcher architecture means any process writing valid files to the vault directory sees immediate UI updates. No API calls needed. An agent writing to `.md` files via the filesystem gets instant Obsidian rendering. This is what makes it agent-compatible without any custom integration code.

Obsidian-flavored markdown extends CommonMark with: wikilinks for bidirectional linking, block references (`[[Note^block-id]]`), embeds that transclude other notes or headings, 13 callout types (info, warning, danger, tip, etc.), LaTeX math via `$...$`, Mermaid diagrams, highlights (`==text==`), and comments (`%%hidden%%`). [Source](../raw/deep/repos/kepano-obsidian-skills.md)

## Obsidian in Agentic Workflows

### The Karpathy Pattern

The pattern Karpathy describes in detail:

1. **Ingest**: Raw source documents (articles, papers, repos) go into `raw/`
2. **Compile**: An LLM incrementally builds a wiki from `raw/`, generating `.md` articles with backlinks, summaries, and cross-references
3. **View**: Obsidian renders the wiki with graph navigation; [MARP](../projects/marp.md) slides and matplotlib images also render in Obsidian
4. **Query**: The LLM searches the wiki to answer questions, filing outputs back into the vault
5. **Lint**: Periodic LLM "health checks" find inconsistencies, suggest new connections, impute missing data
6. **Accumulate**: Every query enhances the knowledge base — explorations compound

The Web Clipper extension (browser plugin) converts web articles to markdown for ingestion. At ~100 articles and ~400K words, Karpathy found BM25 search more practical than RAG — the LLM auto-maintained index files and brief summaries sufficient for navigation at that scale. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

### Napkin: BM25 on Obsidian Vaults

napkin (264 stars, TypeScript, MIT) demonstrates that Obsidian-compatible vaults work as agent memory without embedding infrastructure. It operates directly on vault directories using a four-level progressive disclosure model:

- **L0 — NAPKIN.md** (~200 tokens): Always-loaded context note orienting the agent
- **L1 — Overview** (~1-2K tokens): TF-IDF keyword map per folder, generated by `src/core/overview.ts` with heading weight 3x, filenames 2x, body 1x
- **L2 — Search** (~2-5K tokens): MiniSearch BM25 with composite ranking: `BM25 + backlink_count * 0.5 + recency_normalized * 1.0`
- **L3 — Read**: Full file content

On LongMemEval-S (~40 sessions per question), napkin achieves 91% vs 86% for the best prior embedding-based system and 64% for GPT-4o with full context stuffing. Zero preprocessing, no vectors, no graph construction. [Source](../raw/deep/repos/michaelliv-napkin.md)

The backlink signal deserves attention: napkin crawls all `[[wikilinks]]` across the vault and counts inbound references per file. Files with more incoming links rank higher — a simplified PageRank using Obsidian's link graph. This signal only works if notes link to each other. Unlinked vaults degrade to pure BM25.

### Obsidian-Skills: Documentation as Agent Capability

Obsidian's CEO (Steph Ango) published [kepano/obsidian-skills](https://github.com/kepano/obsidian-skills) — five Agent Skills (SKILL.md files per the agentskills.io spec) that teach LLM agents correct Obsidian file syntax. No executable code. Pure structured markdown documentation loaded into agent context on demand. [Source](../raw/deep/repos/kepano-obsidian-skills.md)

Skills cover: Obsidian Markdown (wikilinks, callouts, embeds, properties), Bases (`.base` format, formula language), JSON Canvas (`.canvas` format), CLI integration, and Defuddle (web content extraction). Compatible with Claude Code, Codex CLI, Cursor, Gemini CLI, GitHub Copilot, and OpenCode via the Agent Skills spec.

The progressive disclosure: skill descriptions (~100 tokens) load at startup; full SKILL.md (~2-6K tokens) loads on activation; reference files load only when needed. Total cost for all five skills: ~20K tokens.

The Duration type gotcha in the bases skill (documented three times deliberately): `(now() - file.ctime).round(0)` fails because Duration lacks `.round()` — correct form is `(now() - file.ctime).days.round(0)`. Repetition-for-emphasis is a conscious design choice for LLM consumption.

## Key Numbers

- **~5.9M downloads** across platforms (self-reported); exact figures not publicly audited
- **napkin LongMemEval-S**: 91% accuracy (benchmark design and methodology described in detail; self-reported but methodology is public)
- **napkin LongMemEval-M**: 83% vs 72% prior best (self-reported)
- **obsidian-skills**: 19.3K GitHub stars
- **Karpathy tweet**: 9.9M views, 38.6K likes — signals community validation of the pattern, not product quality

## Strengths

**File-first design that agents can write directly.** No API, no SDK, no auth. An agent with filesystem access writes valid markdown to the vault directory and Obsidian renders it. This is the lowest-friction path to human-visible agent output.

**Obsidian Flavored Markdown as an agent target.** Wikilinks, callouts, embeds, frontmatter properties, and canvas files are well-specified formats. The obsidian-skills repo provides LLM-consumable documentation for all of them, making them viable targets for agent-generated content without requiring the agent to know Obsidian specifically.

**Link graph as retrieval signal.** Wikilinks create a queryable graph. napkin's backlink-weighted BM25 shows this graph adds retrieval value beyond pure keyword matching without requiring a dedicated graph database.

**Human readability during agent operation.** A human can open the vault in Obsidian while an agent operates on it via CLI/SDK. The knowledge base remains inspectable and editable at all times. Most agent memory systems (vector databases, graph stores) are opaque to human inspection.

**[Zettelkasten](../concepts/zettelkasten.md) compatibility.** Obsidian's wikilink structure maps naturally to Zettelkasten linking patterns, enabling established knowledge organization methods for agent-maintained content.

## Critical Limitations

**No conflict resolution for concurrent writes.** If multiple agents or a human and an agent write to the same vault simultaneously, Obsidian has no merge mechanism. The last write wins. File-level locking is the developer's responsibility. This is an unspoken assumption: the "local-first file-based" design works cleanly for a single agent but breaks immediately with concurrent access.

**BM25 vocabulary gap.** When using Obsidian vaults as agent memory without embedding augmentation, retrieval fails on vocabulary mismatches. Notes using "authn/authz" won't surface for queries using "authentication/authorization." The napkin backlink signal partially compensates but doesn't bridge semantic synonyms. This is the primary retrieval limitation at scale.

**Sync is the user's problem.** Obsidian Sync (paid, ~$10/month) or Syncthing/iCloud/Git handles multi-device. For agent workflows running on servers, the vault must be accessible via filesystem — typically requiring NFS, FUSE mounts, or repo-based sync. The "local-first" design that makes it agent-friendly also makes it awkward for distributed deployments.

## When NOT to Use It

**Multi-agent concurrent writes.** If more than one agent writes to the vault simultaneously, file conflicts are your problem. [Graphiti](../projects/graphiti.md) or [Zep](../projects/zep.md) handle concurrent writes via database transactions; Obsidian does not.

**Vaults exceeding ~10K files with frequent search.** napkin rebuilds its BM25 index on fingerprint change. First-search latency grows linearly with vault size. At scale, this degrades agent responsiveness.

**Semantic retrieval requirements.** If the knowledge base requires synonym matching, multilingual queries, or semantic similarity across vocabulary gaps, embedding-based [RAG](../concepts/retrieval-augmented-generation.md) with a [vector database](../concepts/vector-database.md) performs better. BM25 on markdown works at Karpathy's described scale (~100 articles, ~400K words); it struggles at 10x.

**Production multi-tenant deployment.** Obsidian is a single-user desktop app. Adapting it for multi-tenant server deployment requires workarounds (one vault per user in separate directories, custom sync infrastructure). [Letta](../projects/letta.md) or [Mem0](../projects/mem0.md) provide multi-tenant agent memory with less friction.

**Real-time agent memory with sub-second latency requirements.** File I/O for every read/write adds latency compared to in-memory databases. If the agent needs memory retrieval within tight latency budgets, in-memory stores are faster.

## Unresolved Questions

**Distillation quality at scale.** napkin's auto-distillation writes back conversation knowledge to the vault automatically. But there is no quality validation: irrelevant notes, wrong frontmatter schemas, and missed connections degrade the vault over time. The system provides no feedback loop for distillation quality. How this degrades over long agent operation periods is undocumented.

**Obsidian's commercial relationship with agent use.** Obsidian is free for personal use but requires a commercial license ($50/user/year) for business use. Where "an agent operating on a company knowledge base" falls in this license structure is unclear. The license predates widespread agentic use.

**Abstention calibration.** napkin's benchmark shows 50% accuracy on abstention tasks — knowing when not to answer. BM25 always returns ranked results with no calibrated confidence threshold. Production memory systems need to distinguish "I found relevant information" from "I found nothing relevant." Obsidian's file structure provides no help here.

**Vault size thresholds.** At what vault size does progressive disclosure break down? The napkin benchmarks use ~500 sessions; Karpathy describes ~100 articles. The overview's TF-IDF keyword map becomes noisier as vaults grow and folders accumulate many documents. No published data on the performance ceiling.

## Alternatives

**Use [ChromaDB](../projects/chromadb.md) or [Pinecone](../projects/pinatone.md) when** semantic similarity retrieval matters more than human readability. Vector databases handle vocabulary gaps and multilingual queries that BM25 cannot.

**Use [Graphiti](../projects/graphiti.md) when** knowledge needs temporal versioning, entity extraction, or multi-agent concurrent writes. Graphiti handles "what did we know about X on date Y" with database-backed precision.

**Use [Mem0](../projects/mem0.md) when** you need managed multi-user memory with API access rather than filesystem-based single-user storage.

**Use [LlamaIndex](../projects/llamaindex.md) when** you need a full RAG pipeline with chunking, embedding, reranking, and retrieval over heterogeneous document types. Obsidian/napkin covers markdown well; LlamaIndex handles PDFs, databases, and structured data.

**Use [MemGPT](../projects/memgpt.md) / [Letta](../projects/letta.md) when** you need agent memory with formal context management, hierarchical storage tiers, and multi-agent coordination. Letta's OS-inspired memory architecture is more sophisticated than flat file retrieval.

**Use Obsidian when** the primary requirement is a human-readable, locally-stored, file-based knowledge substrate that an LLM agent can write to directly — particularly for single-agent project memory, research knowledge bases, or workflows where human inspection and editing of agent-generated content matters.

## Related Concepts

- [Markdown Wiki](../concepts/markdown-wiki.md) — The broader pattern Obsidian instantiates
- [Zettelkasten](../concepts/zettelkasten.md) — Linking methodology Obsidian supports
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — Architectural alternative for knowledge retrieval
- [Knowledge Graph](../concepts/knowledge-graph.md) — The graph that wikilinks construct
- [Semantic Memory](../concepts/semantic-memory.md) — Memory type this substrate implements
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — Retrieval pattern napkin implements over Obsidian vaults
- [Context Engineering](../concepts/context-engineering.md) — Broader discipline this serves
- [MARP](../projects/marp.md) — Slide format Karpathy uses within Obsidian for agent outputs
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — Karpathy's described next step: finetuning on vault content to embed knowledge in weights
- [CLAUDE.md](../concepts/claude-md.md) — Analogous always-loaded context file for coding agents; napkin's NAPKIN.md fills the same role for knowledge vaults

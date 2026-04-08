---
title: The State of LLM Knowledge Substrate
type: synthesis
bucket: knowledge-substrate
abstract: >-
  LLM-maintained markdown wikis with BM25 search now match or beat
  embedding-based RAG on standard benchmarks, while knowledge graphs range from
  zero-infrastructure local tools achieving 71x token reduction to
  blockchain-anchored decentralized protocols enabling multi-agent collaboration
  with 47% wall-time reduction.
source_date_range: 2024-04-24 to 2026-04-08
newest_source: '2026-04-08'
staleness_risk: low
sources:
  - raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - raw/repos/human-agent-society-coral.md
  - raw/deep/repos/greyhaven-ai-autocontext.md
  - raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - raw/repos/getzep-graphiti.md
  - raw/repos/safishamsi-graphify.md
  - raw/repos/michaelliv-napkin.md
  - raw/deep/repos/getzep-graphiti.md
  - raw/deep/repos/snarktank-compound-product.md
  - raw/deep/repos/agenticnotetaking-arscontexta.md
  - raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - raw/repos/kepano-obsidian-skills.md
  - raw/deep/repos/bingreeky-memevolve.md
  - raw/deep/repos/othmanadi-planning-with-files.md
  - raw/deep/repos/origintrail-dkg-v9.md
  - raw/deep/repos/michaelliv-napkin.md
  - raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - raw/deep/repos/karpathy-autoresearch.md
  - raw/deep/repos/martian-engineering-lossless-claw.md
  - raw/deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - raw/repos/topoteretes-cognee.md
  - raw/repos/osu-nlp-group-hipporag.md
  - raw/repos/mirix-ai-mirix.md
  - raw/repos/agno-agi-dash.md
  - raw/repos/tirth8205-code-review-graph.md
  - raw/tweets/ashpreetbedi-dash-v2-the-multi-agent-data-system-every-company.md
  - raw/papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md
entities:
  - retrieval-augmented-generation
  - knowledge-graph
  - graphrag
  - obsidian
  - graphiti
  - semantic-search
  - hotpotqa
  - vector-database
  - bm25
  - neo4j
  - chromadb
  - community-detection
  - hipporag
  - raptor
  - llamaindex
  - hybrid-search
  - zettelkasten
  - cognee
  - incremental-indexing
  - markdown-wiki
  - pinatone
  - docling
  - marp
  - elastic-search
  - multihop-rag
  - continual-rag
last_compiled: '2026-04-08'
---
<abstract>
LLM-maintained markdown wikis with BM25 search match or beat embedding-based RAG on standard benchmarks, while knowledge graphs span from zero-infrastructure local tools achieving 71x token reduction to decentralized protocols enabling verified multi-agent collaboration with 47% wall-time reduction.
</abstract>

# The State of LLM Knowledge Substrate

Napkin (264 stars), a zero-dependency BM25 search tool over markdown files, scored 91% on LongMemEval-S, beating the previous best system (86%) and GPT-4o with full context stuffing (64%). No embeddings, no vector database, no graph construction, no preprocessing of any kind. [Source](../raw/repos/michaelliv-napkin.md) This result, published with a reproducible benchmark suite, upends the assumption that semantic similarity search is a prerequisite for effective knowledge retrieval. Six months ago, no practitioner would have predicted that term frequency on plain text files could outperform infrastructure-heavy RAG pipelines on a peer-reviewed memory benchmark. The result held because the LLM itself, not a smaller embedding model, makes the relevance judgment from BM25-surfaced snippets.

## Approach Categories

### How do you represent knowledge for retrieval: flat files or structured graphs?

**Flat markdown with keyword search** treats the filesystem as the database. [Andrej Karpathy](concepts/andrej-karpathy.md)'s LLM wiki pattern (38,638 likes, 9.9M views on his announcement) uses an LLM to "compile" raw documents into interlinked `.md` files, with the agent maintaining index files and summaries. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) Napkin formalizes this with a four-level [Progressive Disclosure](concepts/progressive-disclosure.md) model: Level 0 is a pinned context note (~200 tokens), Level 1 is a TF-IDF keyword map per folder (~1-2K tokens), Level 2 is [BM25](concepts/bm25.md) search with backlink-weighted ranking (~2-5K tokens), Level 3 is full file read. The search composite score combines `BM25_score + backlink_count * 0.5 + recency_normalized * 1.0`. [Source](../raw/repos/michaelliv-napkin.md)

**Temporal knowledge graphs** represent facts as typed triples with validity windows. [Graphiti](projects/graphiti.md) (24,473 stars), the engine behind [Zep](projects/zep.md), implements a bi-temporal data model where every edge carries four timestamps: `valid_at`, `invalid_at` (event time), `created_at`, `expired_at` (transaction time). Entity extraction uses a multi-stage LLM pipeline: extract entities, deduplicate against existing nodes via hybrid matching (cosine + BM25 + cross-encoder), extract fact triples with temporal bounds, resolve contradictions by invalidating older edges rather than deleting them. [Source](../raw/deep/repos/getzep-graphiti.md) The Zep paper demonstrated 94.8% on Deep Memory Retrieval (vs. 93.4% for [MemGPT](projects/memgpt.md)) and 18.5% accuracy improvement on LongMemEval with 90% latency reduction. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

**Wins when / Loses when:** Flat markdown wins when your knowledge base is under ~100 articles (~400K words, per Karpathy's own experience), changes frequently, and you want zero infrastructure. Graphs win when facts evolve over time, when you need multi-hop reasoning across entities, and when multiple agents share the same knowledge substrate. Flat markdown loses on vocabulary mismatch ("authentication" won't match "login" without both appearing). Graphs lose on setup cost: Graphiti requires [Neo4j](projects/neo4j.md) or FalkorDB, makes 4-5 LLM calls per ingested episode, and demands structured output from the LLM provider. [Source](../raw/deep/repos/getzep-graphiti.md)

**Specific failure mode:** Graphiti showed a -17.7% regression on single-session-assistant tasks in LongMemEval, where the system needed to recall what the assistant itself said rather than user-stated facts. The entity extraction pipeline is biased toward user content. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

### How do you compress long conversations without losing access to details?

Lossless-claw (~4,000 stars) replaces OpenClaw's sliding-window truncation with a DAG-based hierarchical summarization system. Every message persists in SQLite. Leaf summaries (depth 0) compress contiguous message chunks into ~800-1200 tokens. Condensed summaries (depth 1+) compress summaries into progressively more abstract layers, with depth-specific prompt templates (d1: technical decisions, d2: strategic themes, d3+: narrative arc). A three-level escalation guarantees compaction always makes progress: normal prompt, aggressive prompt, deterministic truncation to 512 tokens. [Source](../raw/deep/repos/martian-engineering-lossless-claw.md)

The assembler builds each turn's context from protected fresh tail messages (last 64 by default) plus budget-constrained summaries from the DAG. When summaries are present, a dynamic system prompt injection calibrates the agent's confidence: lightly compacted sessions get gentle guidance; heavily compacted sessions (depth >= 2) get an explicit "uncertainty checklist."

**Wins when:** Sessions run for hundreds of turns. **Loses when:** You need cross-conversation retrieval (each conversation has its own DAG). **Failure mode:** A production bug revealed that content survived storage perfectly but became inaccessible because three formatting normalization layers stripped it between storage and retrieval. Perfect storage plus broken retrieval equals zero memory.

### How do you turn a knowledge base into something agents can write to, not only read from?

The Karpathy wiki pattern established that agents should maintain knowledge bases, not humans. Obsidian Skills (19,325 stars) provides modular agent skills for creating and editing [Obsidian](projects/obsidian.md) markdown, JSON Canvas, and Bases files. [Source](../raw/repos/kepano-obsidian-skills.md) Graphify (7,021 stars) converts heterogeneous sources (code, papers, images) into a queryable [Knowledge Graph](concepts/knowledge-graph.md) with 71.5x token reduction per query versus raw file retrieval, using AST extraction via tree-sitter for code plus Claude vision for images and diagrams. Its `--watch` mode auto-syncs the graph as files change, and a git commit hook rebuilds the graph after every commit. [Source](../raw/repos/safishamsi-graphify.md)

Dash (1,900 stars) demonstrates a dual-tier knowledge system for data agents: curated knowledge (table schemas, validated SQL queries, business rules stored as JSON/SQL files) plus auto-learned corrections captured by an "Agno Learning Machine" when queries fail. The Analyst agent searches knowledge before writing SQL, while the Engineer agent builds reusable views (`dash.monthly_mrr`, `dash.customer_health_score`) and records them back to the knowledge base. [Source](../raw/repos/agno-agi-dash.md) [Source](../raw/tweets/ashpreetbedi-dash-v2-the-multi-agent-data-system-every-company.md) This pattern of agents building infrastructure for other agents to consume represents a shift from knowledge bases as static references to knowledge bases as compounding assets.

Ars Contexta (~2,900 stars) takes this further with a derivation engine that traverses 249 interconnected research claims to compose domain-specific cognitive architectures from first principles. Rather than shipping a template, it reasons about eight configuration dimensions (granularity, organization, linking philosophy, etc.) during a conversational setup, justifying each choice with specific research claims. [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md)

**Wins when:** You need agents to accumulate project knowledge over time. **Loses when:** You need real-time consistency across multiple writers without coordination. **Failure mode:** Compounding hallucinations. One hallucinated connection enters the wiki, and every downstream agent builds on it. A practitioner running a 10-agent swarm addressed this by adding a separate supervisor agent (Hermes) as a review gate, scoring each article before promotion to the permanent knowledge base. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

### How do you verify knowledge across organizational boundaries?

OriginTrail DKG v9 (15 stars but architecturally unique) combines RDF triple stores with Merkle-proof anchoring on EVM chains. Its workspace graph mechanism enables real-time collaborative writes among agents using compare-and-swap (CAS) concurrency control with per-entity write locks acquired in sorted order to prevent deadlocks. The M-of-N context graph governance requires a quorum of ECDSA signatures before data is finalized on-chain. [Source](../raw/deep/repos/origintrail-dkg-v9.md)

Benchmarks showed multi-agent DKG collaboration reduced coding swarm wall time by 47% (20 min vs 38 min) and improved completion reliability from 7/8 to 8/8 versus no-collaboration baselines. Single-agent DKG achieved the lowest per-feature cost ($1.41 vs $1.65 control) through SPARQL-based pattern reuse. [Source](../raw/deep/repos/origintrail-dkg-v9.md) These results come from small sample sizes (N=1-2 per arm) on testnet with beta software, but the benchmark methodology is transparent (all raw result JSON files are committed to the repository).

**Wins when:** Multiple organizations need to share verifiable knowledge with cryptographic provenance. **Loses when:** You need fast iteration; on-chain finalization adds latency and gas costs. The SPARQL text search uses `FILTER(CONTAINS)` substring matching, which degrades linearly with graph size. No semantic similarity at all.

### How do you select minimal context for code-focused tasks?

Code-review-graph (6,592 stars) builds a persistent structural map of codebases using [tree-sitter](projects/tree-sitter.md) AST parsing, stored as a graph of nodes (functions, classes, imports) and edges (calls, inheritance, test coverage) in SQLite. When a file changes, the graph traces callers, dependents, and tests to compute a "blast radius" of affected files. [Source](../raw/repos/tirth8205-code-review-graph.md)

Benchmarks across 6 real open-source repositories show an average 8.2x token reduction versus naive file reading, with a Next.js monorepo achieving 49x reduction (27,732 files funneled down to ~15). Incremental updates complete in under 2 seconds for a 2,900-file project. Impact analysis achieves 100% recall with 0.54 average F1 (deliberately conservative, flagging files that might be affected rather than missing broken dependencies). [Source](../raw/repos/tirth8205-code-review-graph.md)

**Wins when:** Your token budget limits how much code an LLM can review per task, especially in monorepos. **Loses when:** Single-file changes in small packages, where graph metadata can exceed raw file size (the express benchmark showed 0.7x reduction). **Failure mode:** Flow detection recall sits at 33%, reliably detecting entry points only in Python repos with recognized framework patterns.

## The Convergence

**All serious retrieval systems now combine BM25 with at least one other signal.** Graphiti uses cosine similarity + BM25 + breadth-first graph traversal, calling these "word similarities, semantic similarities, and contextual similarities." [Source](../raw/deep/repos/getzep-graphiti.md) Napkin combines BM25 + backlink count + recency. [Source](../raw/repos/michaelliv-napkin.md) [HippoRAG](projects/hipporag.md) (3,332 stars), which centers on personalized PageRank over knowledge graphs, runs BM25 as a retrieval component. [Source](../raw/repos/osu-nlp-group-hipporag.md) Even [MIRIX](projects/ace.md) (3,508 stars) uses PostgreSQL-native BM25 full-text search alongside vector similarity for its six-agent memory system. [Source](../raw/repos/mirix-ai-mirix.md) The last major holdout for pure vector-only retrieval was early [ChromaDB](projects/chromadb.md)-based RAG pipelines from 2023, which lacked BM25 entirely.

**All production knowledge systems now use predefined queries rather than LLM-generated ones for graph mutations.** The Zep paper states this explicitly: predefined Cypher queries "ensure consistent schema and reduce hallucinations" compared to LLM-generated ad-hoc queries. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) Graphiti's entire persistence layer uses predefined queries across all four graph backends (Neo4j, FalkorDB, Kuzu, Neptune). [Source](../raw/deep/repos/getzep-graphiti.md) DKG v9 uses SPARQL queries for its triple store operations. [Source](../raw/deep/repos/origintrail-dkg-v9.md) The approach that held out longest was early Neo4j-based chatbots that had the LLM write Cypher directly, which produced schema violations and hallucinated relationships in production.

**All systems that persist knowledge across sessions now separate raw storage from derived views.** Lossless-claw maintains an immutable SQLite message store alongside its derived summary DAG. [Source](../raw/deep/repos/martian-engineering-lossless-claw.md) The Karpathy pattern keeps `raw/` separate from the compiled wiki. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) Graphiti separates episode nodes (raw data) from entity/relationship nodes (extracted knowledge). [Source](../raw/deep/repos/getzep-graphiti.md) Dash separates human-curated knowledge (table metadata, validated queries, business rules) from auto-learned corrections, with the two systems reinforcing each other. [Source](../raw/repos/agno-agi-dash.md) The system that resisted this longest was [Mem0](projects/mem0.md), which in earlier versions stored only extracted facts without preserving source conversations, making provenance tracking difficult.

## What the Field Got Wrong

Practitioners assumed embedding-based [Semantic Search](concepts/semantic-search.md) was necessary for effective knowledge retrieval with LLMs. The entire RAG stack, as it crystallized in 2023-2024, centered on this assumption: chunk documents, embed them, store in a [Vector Database](concepts/vector-database.md), retrieve by cosine similarity. [LlamaIndex](projects/llamaindex.md), [LangChain](projects/langchain.md), [Pinecone](projects/pinatone.md), and ChromaDB all built their value propositions around this pipeline.

Napkin's LongMemEval results disproved this for structured knowledge bases. BM25 on well-organized markdown files (per-round notes in day directories, with wikilinks creating a navigable graph) scored 91% on LongMemEval-S versus 86% for the best prior embedding-based system. [Source](../raw/repos/michaelliv-napkin.md) The mechanism: progressive disclosure lets the LLM, which has full reasoning capability, make relevance judgments from keyword-surfaced snippets. You replace a small embedding model's cosine similarity decisions with the large model's semantic evaluation. The design document states: "you have a model that understands semantics, and you bolt on a smaller, dumber model to pre-filter information before the smart one ever sees it."

What replaced the embedding-first assumption: [Hybrid Search](concepts/hybrid-search.md) as baseline, with the specific mix tuned to the knowledge base's structure. For structured, well-linked markdown, BM25 alone suffices. For unstructured document collections with vocabulary diversity, embeddings remain valuable. For evolving conversational data, graph traversal adds a dimension neither method covers.

## Deprecated Approaches

**Full-context stuffing for long conversations.** In 2023-2024, expanding context windows (from 4K to 128K to 1M tokens) encouraged practitioners to dump entire conversation histories into the prompt. This seemed right because models with longer contexts should use them. The LongMemEval benchmark killed it: GPT-4o with full context scored only 64% on the S-dataset while Napkin's progressive disclosure scored 91%. [Source](../raw/repos/michaelliv-napkin.md) The Zep paper showed full-context baselines took 31.3 seconds versus 3.2 seconds with retrieval, while also scoring lower. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) The [Lost in the Middle](concepts/lost-in-the-middle.md) effect compounds at scale: models attend poorly to information in the middle of long contexts. Planning-with-files (18,000 stars) addresses this with a PreToolUse hook that re-injects the first 30 lines of `task_plan.md` before every tool call, keeping goals in the most recent (highest attention) part of the context. [Source](../raw/deep/repos/othmanadi-planning-with-files.md) Full-context stuffing has been replaced by tiered retrieval with attention manipulation.

**Static knowledge graphs built via batch processing.** [GraphRAG](projects/graphrag.md)'s original approach required complete corpus reprocessing when data changed, with seconds-to-tens-of-seconds query latency. [Source](../raw/repos/getzep-graphiti.md) This seemed right for document collections that changed rarely. Graphiti's Incremental Indexing approach, which processes episodes as they arrive with sub-second query latency, demonstrated that dynamic knowledge integration was both feasible and necessary for agent memory. Label propagation (chosen over Leiden for its incremental extension capability) enables community updates without full recomputation. [Source](../raw/deep/repos/getzep-graphiti.md) The batch approach persists for static corpus analysis but has been abandoned for agent-facing knowledge systems.

**Single-signal retrieval (vector-only or keyword-only).** Pre-2025, many production RAG deployments used a single retrieval signal, typically cosine similarity on embeddings. This seemed adequate because embedding models kept improving. The convergence toward hybrid retrieval killed single-signal approaches: Graphiti's three-signal search (cosine + BM25 + BFS graph traversal), Napkin's three-signal ranking (BM25 + backlinks + recency), and [HippoRAG](projects/hipporag.md)'s combination of embedding retrieval with personalized PageRank all demonstrate that complementary signals cover retrieval dimensions no single method addresses. [Source](../raw/deep/repos/getzep-graphiti.md) [Source](../raw/repos/michaelliv-napkin.md)

## Failure Modes

**Vocabulary mismatch in BM25-only systems.** If notes use "authn/authz" but queries use "authentication/authorization," BM25 matches fail. Napkin's backlink signal partially compensates when both terms appear in linked notes, but the gap is real. Napkin scored 50% on abstention tasks (knowing when not to answer), because BM25 always returns results ranked by score with no calibrated confidence threshold. [Source](../raw/repos/michaelliv-napkin.md) You hit this in any domain with significant jargon variation.

**Entity extraction quality degradation across LLM providers.** Graphiti's extraction prompts are "remarkably detailed," including extensive negative examples telling the LLM what NOT to extract. Switching from GPT-4o to weaker models produces substantially worse entity resolution and contradiction detection. The structured output requirement further limits provider choice, since not all LLMs support Pydantic schema validation. [Source](../raw/deep/repos/getzep-graphiti.md) This means your knowledge graph quality is coupled to your LLM budget.

**Compounding hallucinations in agent-maintained wikis.** When an LLM writes incorrect connections into a wiki, every downstream agent that reads those connections builds on the error. The blast radius scales with the number of agents consuming the knowledge base. One practitioner documented this explicitly: "raw data is dangerous when it compounds cause one hallucinated connection enters the brain and every agent downstream builds on it." [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) Mitigation requires a separate review agent that evaluates articles blind to their production process.

**Summary quality degradation at depth in hierarchical compression.** Lossless-claw's DAG creates progressively more abstract summaries. At depth 3+, summaries are highly abstract and may lose specific details. The expansion system (sub-agent spawn + LLM call) adds 5-15 seconds of latency to recover detail. If the expansion model is underpowered or the `maxExpandTokens` budget is too small (default 4,000, community recommends 12,000), recovery fails silently. [Source](../raw/deep/repos/martian-engineering-lossless-claw.md) The deterministic fallback truncation (512 tokens) from a 20K token input is lossy. The system guarantees token reduction, not information preservation.

**Workspace consistency under network partition in decentralized graphs.** DKG v9's workspace writes propagate via GossipSub. If the mesh partitions, two groups of agents can independently write to the same root entity. When the partition heals, last-write-wins merge can produce inconsistent state. The enshrinement mechanism (M-of-N context graph signatures) is the intended resolution, but only if agents explicitly use context graphs. [Source](../raw/deep/repos/origintrail-dkg-v9.md) For production deployments, workspace data carries no cryptographic verification until on-chain finalization.

## Selection Guide

- **If you need project-level knowledge for a single agent with minimal setup,** use Napkin (264 stars) because BM25 on markdown matches RAG benchmarks with zero infrastructure. Avoid if your domain has heavy jargon variation requiring semantic bridging.

- **If your agent needs to track how facts change over time across conversations,** use [Graphiti](projects/graphiti.md) (24,473 stars) because its bi-temporal edge model and automatic contradiction resolution handle evolving knowledge. Requires Neo4j/FalkorDB and makes 4-5 LLM calls per ingested episode. Avoid if you need sub-millisecond ingestion.

- **If you need agents to collaboratively build and maintain a wiki,** follow the Karpathy pattern with [Obsidian](projects/obsidian.md) as frontend and Graphify (7,021 stars) for graph extraction. Add a separate review agent for quality gating.

- **If you need a self-learning data agent with curated + auto-learned knowledge,** use Dash (1,900 stars) because its six-layer context system and dual-tier knowledge architecture demonstrate the compounding pattern where agents build infrastructure other agents consume. Requires PostgreSQL. [Source](../raw/repos/agno-agi-dash.md)

- **If you need hierarchical summarization for sessions exceeding 100K tokens,** use Lossless-claw (~4,000 stars). Set `incrementalMaxDepth=-1` (the default of 0 causes context overflow). Use a cheap model (Haiku, Qwen3-8B) for summarization to control costs.

- **If you need verifiable cross-organization knowledge sharing,** evaluate OriginTrail DKG v9. Currently beta/testnet. No other system provides cryptographic provenance for multi-agent knowledge graphs. The 47% wall-time reduction in multi-agent benchmarks is promising but needs larger-scale replication. [Source](../raw/deep/repos/origintrail-dkg-v9.md)

- **If you need token-efficient context selection for code review,** use code-review-graph (6,592 stars) because blast-radius analysis achieves 8.2x average token reduction with 100% recall on affected files. Avoid for single-file changes in small packages. [Source](../raw/repos/tirth8205-code-review-graph.md)

- **If you need a domain-specific cognitive architecture generated from first principles,** use Ars Contexta (~2,900 stars). Currently Claude Code only. The 20-minute setup amortizes over months of use.

- **If you need multi-hop reasoning across documents,** use [HippoRAG](projects/hipporag.md) (3,332 stars) with personalized PageRank, or Cognee (14,899 stars) for a more turnkey graph+vector solution.

## The Divergence

### Graph-first vs. file-first knowledge representation

Graph-first ([Graphiti](projects/graphiti.md), [HippoRAG](projects/hipporag.md), Cognee) optimizes for multi-hop reasoning, temporal tracking, and structured queries. File-first (Napkin, Karpathy wiki, Ars Contexta) optimizes for zero infrastructure, human readability, and version control with git. Graph-first wins when facts evolve and entities connect across many documents. File-first wins when the knowledge base fits in a single agent's working context and changes often. Both camps have working implementations with benchmark results. Ars Contexta explicitly argues that "wiki links implement GraphRAG without the infrastructure" by encoding relationships as wikilinks traversable by the agent. [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md)

### LLM-driven vs. algorithmic knowledge organization

A-MEM's Zettelkasten-inspired approach uses the LLM to generate metadata, create links, and evolve existing memories when new information arrives, achieving 2.5x improvement on multi-hop reasoning (45.85 vs 18.41 F1). [Source](../raw/deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md) Graphiti uses LLM-per-stage extraction but algorithmic community detection (label propagation). Napkin uses purely algorithmic organization (TF-IDF, BM25, backlink counting). The split: LLM-driven organization produces richer connections but costs multiple LLM calls per memory and introduces hallucination risk in the organization layer itself. Algorithmic organization is cheaper and deterministic but cannot discover semantic connections beyond keyword overlap.

### Knowledge in weights vs. knowledge in context

Karpathy identifies the natural desire "to think about [Synthetic Data Generation](concepts/synthetic-data-generation.md) + finetuning to have your LLM 'know' the data in its weights instead of just context windows." [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) Autocontext (695 stars) implements this via frontier-to-local distillation: export training data from successful runs, fine-tune local models via MLX or CUDA, promote distilled models when they meet quality thresholds. [Source](../raw/deep/repos/greyhaven-ai-autocontext.md) The opposing camp argues context-window retrieval is more auditable and easier to update. Both approaches have working implementations; the conditions that favor each (update frequency, latency requirements, cost constraints) remain actively contested.

### Centralized compilation vs. distributed evolution

CORAL (120 stars) runs multiple agents in isolated git worktrees with shared state (attempts, notes, skills) in `.coral/public/`, symlinked into every worktree for zero-sync-overhead knowledge sharing. The CORAL paper reports that multi-agent collaboration with persistent shared memory achieves 3-10x faster improvement rates through knowledge reuse across iterations. [Source](../raw/papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md) [Source](../raw/repos/human-agent-society-coral.md) [MemEvolve](projects/memevolve.md) goes further, using LLMs to generate entirely new memory provider implementations from trajectory analysis, achieving 7-17% gains across benchmarks. [Source](../raw/deep/repos/bingreeky-memevolve.md) The centralized-compilation camp (Karpathy wiki, meta-kb itself) uses a single compiler to maintain consistency. Centralized compilation wins on consistency; distributed evolution wins on parallelism and novelty.

## What's Hot Now

Graphify went from launch to 7,021 stars as a Claude Code skill that builds knowledge graphs from any folder, with multimodal support for code (tree-sitter AST), PDFs (citation mining), and images (Claude vision). Its `--watch` mode and git commit hook keep graphs current for multi-agent workflows where parallel agents write code simultaneously. [Source](../raw/repos/safishamsi-graphify.md)

Code-review-graph reached 6,592 stars by solving the monorepo token efficiency problem, providing blast-radius analysis via 22 MCP tools compatible with Claude Code, Cursor, Windsurf, Zed, Continue, OpenCode, and Antigravity. [Source](../raw/repos/tirth8205-code-review-graph.md)

Dash launched at 1,900 stars with its six-layer context system and self-learning loop, demonstrating that data agents need curated knowledge (table schemas, validated queries) plus auto-learned corrections rather than raw schema dumps. The dual-schema enforcement (read-only `public` plus agent-managed `dash`) provides infrastructure-level safety rather than prompt-level safety. [Source](../raw/repos/agno-agi-dash.md)

Obsidian Skills hit 19,325 stars, making it one of the fastest-growing agent skill packages. [Graphiti](projects/graphiti.md) at 24,473 stars now supports four graph backends (Neo4j, FalkorDB, Kuzu, Neptune) and ships an MCP server for Claude and Cursor integration. [Source](../raw/repos/getzep-graphiti.md)

DKG v9 published transparent multi-agent benchmarks showing 47% wall-time reduction and 27% cost reduction for DKG collaboration versus shared-markdown coordination on interdependent tasks. [Source](../raw/deep/repos/origintrail-dkg-v9.md)

## Open Questions

**When should you recompute communities from scratch?** Both Graphiti and HippoRAG acknowledge incremental community updates drift from optimal but neither specifies a drift detection mechanism or refresh schedule.

**How do you evaluate a knowledge base's quality without a downstream task?** The field has benchmarks for retrieval (LongMemEval, HotpotQA, LoCoMo) but no standard metric for "is this wiki coherent and accurate?" The review-agent pattern is ad hoc.

**Can memory evolution avoid runaway complexity?** [MemEvolve](projects/memevolve.md) generates new memory providers from trajectory analysis, but has no diversity pressure in its tournament selection and no cross-generation learning. [Source](../raw/deep/repos/bingreeky-memevolve.md) Whether evolved memory architectures converge to a monoculture or maintain useful variety remains untested at scale.

**What is the right granularity for memory notes?** Napkin's design uses per-round notes for BM25 retrieval. [Source](../raw/repos/michaelliv-napkin.md) A-MEM uses atomic Zettelkasten-style notes. Lossless-claw's leaf summaries target 800-1200 tokens. No one has systematically varied granularity to find the optimum, and it likely depends on the retrieval method.

**How does multi-agent knowledge sharing scale beyond filesystem symlinks?** CORAL's filesystem-as-message-bus pattern works for co-located agents, but DKG v9's decentralized approach introduces latency and gas costs. The middle ground between zero-infrastructure symlinks and full blockchain finalization remains unexplored. As CORAL's paper showed 3-10x improvement rates from knowledge reuse, the demand for scalable sharing will grow. [Source](../raw/papers/qu-coral-towards-autonomous-multi-agent-evolution-fo.md)

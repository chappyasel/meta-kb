---
title: The State of LLM Knowledge Substrate
type: synthesis
bucket: knowledge-substrate
abstract: >-
  LLM-maintained markdown wikis with BM25 search now match or beat
  embedding-based RAG on standard benchmarks, while temporal knowledge graphs
  solve the evolving-fact problem that flat retrieval cannot touch. The field
  splits on whether to invest in graph infrastructure or filesystem simplicity.
source_date_range: 2024-04-24 to 2026-04-08
newest_source: '2026-04-08'
staleness_risk: low
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - repos/human-agent-society-coral.md
  - deep/repos/greyhaven-ai-autocontext.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/getzep-graphiti.md
  - repos/safishamsi-graphify.md
  - repos/michaelliv-napkin.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - repos/kepano-obsidian-skills.md
  - deep/repos/bingreeky-memevolve.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/repos/origintrail-dkg-v9.md
  - deep/repos/michaelliv-napkin.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/martian-engineering-lossless-claw.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/topoteretes-cognee.md
  - repos/osu-nlp-group-hipporag.md
  - repos/mirix-ai-mirix.md
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
  - lightrag
  - zettelkasten
  - ragflow
  - cognee
  - incremental-indexing
  - personalized-pagerank
  - entity-extraction
  - markdown-wiki
  - pinatone
  - docling
  - marp
  - mineru
  - elastic-search
  - multihop-rag
  - continual-rag
last_compiled: '2026-04-08T02:19:27.241Z'
---
# The State of LLM Knowledge Substrate

Napkin (264 stars), a zero-dependency BM25 search tool over markdown files, scored 91% on LongMemEval-S, beating the previous best system (86%) and GPT-4o with full context stuffing (64%). No embeddings, no vector database, no graph construction, no preprocessing of any kind. [Source](../raw/deep/repos/michaelliv-napkin.md) This result, published with a reproducible benchmark suite, upends the assumption that semantic similarity search is a prerequisite for effective knowledge retrieval. Six months ago, no practitioner would have predicted that term frequency on plain text files could outperform infrastructure-heavy RAG pipelines on a peer-reviewed memory benchmark. The result held because the LLM itself, not a smaller embedding model, makes the relevance judgment from BM25-surfaced snippets.

## Approach Categories

### How do you represent knowledge for retrieval: flat files or structured graphs?

**Flat markdown with keyword search** treats the filesystem as the database. [Andrej Karpathy](concepts/andrej-karpathy.md)'s LLM wiki pattern (38,638 likes, 9.9M views on his announcement) uses an LLM to "compile" raw documents into interlinked `.md files, with the agent maintaining index files and summaries. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) Napkin formalizes this with a four-level [Progressive Disclosure](concepts/progressive-disclosure.md) model: Level 0 is a pinned context note (~200 tokens), Level 1 is a TF-IDF keyword map per folder (~1-2K tokens), Level 2 is [BM25](concepts/bm25.md) search with backlink-weighted ranking (~2-5K tokens), Level 3 is full file read. The search composite score combines `BM25_score + backlink_count * 0.5 + recency_normalized * 1.0`. Search scores are hidden from the agent to prevent anchoring bias. [Source](../raw/deep/repos/michaelliv-napkin.md)

**Temporal knowledge graphs** represent facts as typed triples with validity windows. [Graphiti](projects/graphiti.md) (24,473 stars), the engine behind [Zep](projects/zep.md), implements a bi-temporal data model where every edge carries four timestamps: `valid_at`, `invalid_at` (event time), `created_at`, `expired_at` (transaction time). Entity extraction uses a multi-stage LLM pipeline: extract entities, deduplicate against existing nodes via hybrid matching (cosine + BM25 + cross-encoder), extract fact triples with temporal bounds, resolve contradictions by invalidating older edges rather than deleting them. [Source](../raw/deep/repos/getzep-graphiti.md) The Zep paper demonstrated 94.8% on Deep Memory Retrieval (vs. 93.4% for [MemGPT](projects/memgpt.md)) and 18.5% accuracy improvement on LongMemEval with 90% latency reduction. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

**Wins when / Loses when:** Flat markdown wins when your knowledge base is under ~100 articles (~400K words, per Karpathy's own experience), changes frequently, and you want zero infrastructure. Graphs win when facts evolve over time, when you need multi-hop reasoning across entities, and when multiple agents share the same knowledge substrate. Flat markdown loses on vocabulary mismatch ("authentication" won't match "login" without both appearing). Graphs lose on setup cost: Graphiti requires [Neo4j](projects/neo4j.md) or FalkorDB, makes 4-5 LLM calls per ingested episode, and demands structured output from the LLM provider. [Source](../raw/deep/repos/getzep-graphiti.md)

**Specific failure mode:** Graphiti showed a -17.7% regression on single-session-assistant tasks in LongMemEval, where the system needed to recall what the assistant itself said rather than user-stated facts. The entity extraction pipeline is biased toward user content. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

### How do you compress long conversations without losing access to details?

Lossless-claw (~4,000 stars) replaces OpenClaw's sliding-window truncation with a DAG-based hierarchical summarization system. Every message persists in SQLite. Leaf summaries (depth 0) compress contiguous message chunks into ~800-1200 tokens. Condensed summaries (depth 1+) compress summaries into progressively more abstract layers, with depth-specific prompt templates (d1: technical decisions, d2: strategic themes, d3+: narrative arc). A three-level escalation guarantees compaction always makes progress: normal prompt, aggressive prompt, deterministic truncation to 512 tokens. [Source](../raw/deep/repos/martian-engineering-lossless-claw.md)

The assembler builds each turn's context from protected fresh tail messages (last 64 by default) plus budget-constrained summaries from the DAG. When summaries are present, a dynamic system prompt injection calibrates the agent's confidence: lightly compacted sessions get gentle guidance; heavily compacted sessions (depth >= 2) get an explicit "uncertainty checklist."

On the OOLONG benchmark, Volt (the standalone agent using this architecture) scored 74.8 average vs. Claude Code's 70.3, with the gap widening at longer contexts (+12.6 at 512K tokens). [Source](../raw/deep/repos/martian-engineering-lossless-claw.md)

**Wins when:** Sessions run for hundreds of turns. **Loses when:** You need cross-conversation retrieval (each conversation has its own DAG). **Failure mode:** A production bug revealed that content survived storage perfectly but became inaccessible because three formatting normalization layers stripped it between storage and retrieval. Perfect storage plus broken retrieval equals zero memory.

### How do you turn a knowledge base into something agents can write to, not only read from?

The Karpathy wiki pattern established that agents should maintain knowledge bases, not humans. Obsidian Skills (19,325 stars) provides modular agent skills for creating and editing [Obsidian](projects/obsidian.md) markdown, JSON Canvas, and Bases files. [Source](../raw/repos/kepano-obsidian-skills.md) Graphify (7,021 stars) converts heterogeneous sources (code, papers, images) into a queryable [Knowledge Graph](concepts/knowledge-graph.md) with 71.5x token reduction per query versus raw file retrieval, with a `--watch` mode that auto-syncs the graph as files change. [Source](../raw/repos/safishamsi-graphify.md)

Ars Contexta (~2,900 stars) takes this further with a derivation engine that traverses 249 interconnected research claims to compose domain-specific cognitive architectures from first principles. Rather than shipping a template, it reasons about eight configuration dimensions (granularity, organization, linking philosophy, etc.) during a conversational setup, justifying each choice with specific research claims. [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md) The 6Rs processing pipeline (Record, Reduce, Reflect, Reweave, Verify, Rethink) runs each phase in its own context window via subagent spawning, based on the claim that LLM attention degrades as context fills.

**Wins when:** You need agents to accumulate project knowledge over time. **Loses when:** You need real-time consistency across multiple writers without coordination. **Failure mode:** Compounding hallucinations. One hallucinated connection enters the wiki, and every downstream agent builds on it. A practitioner running a 10-agent swarm addressed this by adding a separate supervisor agent (Hermes) as a review gate, scoring each article before promotion to the permanent knowledge base. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

### How do you verify knowledge across organizational boundaries?

OriginTrail DKG v9 (15 stars but architecturally unique) combines RDF triple stores with Merkle-proof anchoring on EVM chains. Its workspace graph mechanism enables real-time collaborative writes among agents using compare-and-swap concurrency control before on-chain finalization. The M-of-N context graph governance requires a quorum of ECDSA signatures before data is finalized. [Source](../raw/deep/repos/origintrail-dkg-v9.md) Benchmarks showed DKG collaboration reduced coding swarm wall time by 47% and improved completion reliability from 7/8 to 8/8 versus no-collaboration baselines, though these results come from small sample sizes (N=1-2 per arm) on testnet.

**Wins when:** Multiple organizations need to share verifiable knowledge. **Loses when:** You need fast iteration; on-chain finalization adds latency and gas costs. The SPARQL text search uses `FILTER(CONTAINS)` substring matching, which degrades linearly with graph size. No semantic similarity at all.

## The Convergence

**All serious retrieval systems now combine BM25 with at least one other signal.** Graphiti uses cosine similarity + BM25 + breadth-first graph traversal, calling these "word similarities, semantic similarities, and contextual similarities." [Source](../raw/deep/repos/getzep-graphiti.md) Napkin combines BM25 + backlink count + recency. [Source](../raw/deep/repos/michaelliv-napkin.md) Even [HippoRAG](projects/hipporag.md) (3,332 stars), which centers on personalized PageRank over knowledge graphs, runs BM25 as a retrieval component. [Source](../raw/repos/osu-nlp-group-hipporag.md) The last major holdout for pure vector-only retrieval was early [ChromaDB](projects/chromadb.md)-based RAG pipelines from 2023, which lacked BM25 entirely.

**All production knowledge systems now use predefined queries rather than LLM-generated ones for graph mutations.** The Zep paper states this explicitly: predefined Cypher queries "ensure consistent schema and reduce hallucinations" compared to LLM-generated ad-hoc queries. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) Graphiti's entire persistence layer uses predefined queries across all four graph backends (Neo4j, FalkorDB, Kuzu, Neptune). [Source](../raw/deep/repos/getzep-graphiti.md) [GraphRAG](projects/graphrag.md) also uses structured extraction pipelines rather than free-form graph queries. The approach that held out longest was early Neo4j-based chatbots that had the LLM write Cypher directly, which produced schema violations and hallucinated relationships in production.

**All systems that persist knowledge across sessions now separate raw storage from derived views.** Lossless-claw maintains an immutable SQLite message store alongside its derived summary DAG. [Source](../raw/deep/repos/martian-engineering-lossless-claw.md) The Karpathy pattern keeps `raw/` separate from the compiled wiki. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) Graphiti separates episode nodes (raw data) from entity/relationship nodes (extracted knowledge). [Source](../raw/deep/repos/getzep-graphiti.md) Napkin and Graphify both treat markdown files as source of truth with any indexes as derived artifacts. The system that resisted this longest was [Mem0](projects/mem0.md), which in earlier versions stored only extracted facts without preserving source conversations, making provenance tracking difficult.

## What the Field Got Wrong

Practitioners assumed embedding-based [Semantic Search](concepts/semantic-search.md) was necessary for effective knowledge retrieval with LLMs. The entire RAG stack, as it crystallized in 2023-2024, centered on this assumption: chunk documents, embed them, store in a [Vector Database](concepts/vector-database.md), retrieve by cosine similarity. [LlamaIndex](projects/llamaindex.md), [LangChain](projects/langchain.md), [Pinecone](projects/pinatone.md), and ChromaDB all built their value propositions around this pipeline.

Napkin's LongMemEval results disproved this for structured knowledge bases. BM25 on well-organized markdown files (per-round notes in day directories, with wikilinks creating a navigable graph) scored 91% on LongMemEval-S versus 86% for the best prior embedding-based system. [Source](../raw/deep/repos/michaelliv-napkin.md) The mechanism: progressive disclosure lets the LLM, which has full reasoning capability, make relevance judgments from keyword-surfaced snippets. You replace a small embedding model's cosine similarity decisions with the large model's semantic evaluation. The design document states: "you have a model that understands semantics, and you bolt on a smaller, dumber model to pre-filter information before the smart one ever sees it."

What replaced the embedding-first assumption: [Hybrid Search](concepts/hybrid-search.md) as baseline, with the specific mix tuned to the knowledge base's structure. For structured, well-linked markdown, BM25 alone suffices. For unstructured document collections with vocabulary diversity, embeddings remain valuable. For evolving conversational data, graph traversal adds a dimension neither method covers.

## Deprecated Approaches

**Full-context stuffing for long conversations.** In 2023-2024, expanding context windows (from 4K to 128K to 1M tokens) encouraged practitioners to dump entire conversation histories into the prompt. This seemed right because models with longer contexts should use them. The LongMemEval benchmark killed it: GPT-4o with full context scored only 64% on the S-dataset while Napkin's progressive disclosure scored 91%. [Source](../raw/deep/repos/michaelliv-napkin.md) The Zep paper showed full-context baselines took 31.3 seconds versus 3.2 seconds with retrieval, while also scoring lower. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) The [Lost in the Middle](concepts/lost-in-the-middle.md) effect compounds at scale: models attend poorly to information in the middle of long contexts. Planning-with-files (18,000 stars) addresses this with a PreToolUse hook that re-injects the first 30 lines of `task_plan.md` before every tool call, keeping goals in the most recent (highest attention) part of the context. [Source](../raw/deep/repos/othmanadi-planning-with-files.md) Full-context stuffing has been replaced by tiered retrieval with attention manipulation.

**Static knowledge graphs built via batch processing.** [GraphRAG](projects/graphrag.md)'s original approach required complete corpus reprocessing when data changed, with seconds-to-tens-of-seconds query latency. [Source](../raw/repos/getzep-graphiti.md) This seemed right for document collections that changed rarely. Graphiti's Incremental Indexing approach, which processes episodes as they arrive with sub-second query latency, demonstrated that dynamic knowledge integration was both feasible and necessary for agent memory. Label propagation (chosen over Leiden for its incremental extension capability) enables community updates without full recomputation. [Source](../raw/deep/repos/getzep-graphiti.md) The batch approach persists for static corpus analysis but has been abandoned for agent-facing knowledge systems.

**Single-signal retrieval (vector-only or keyword-only).** Pre-2025, many production RAG deployments used a single retrieval signal, typically cosine similarity on embeddings. This seemed adequate because embedding models kept improving. The convergence toward hybrid retrieval killed single-signal approaches: Graphiti's three-signal search (cosine + BM25 + BFS graph traversal), Napkin's three-signal ranking (BM25 + backlinks + recency), and [HippoRAG](projects/hipporag.md)'s combination of embedding retrieval with personalized PageRank all demonstrate that complementary signals cover retrieval dimensions no single method addresses. [Source](../raw/deep/repos/getzep-graphiti.md) [Source](../raw/deep/repos/michaelliv-napkin.md)

## Failure Modes

**Vocabulary mismatch in BM25-only systems.** If notes use "authn/authz" but queries use "authentication/authorization," BM25 matches fail. Napkin's backlink signal partially compensates when both terms appear in linked notes, but the gap is real. Napkin scored 50% on abstention tasks (knowing when not to answer), because BM25 always returns results ranked by score with no calibrated confidence threshold. [Source](../raw/deep/repos/michaelliv-napkin.md) You hit this in any domain with significant jargon variation.

**Entity extraction quality degradation across LLM providers.** Graphiti's extraction prompts are "remarkably detailed," including extensive negative examples telling the LLM what NOT to extract. Switching from GPT-4o to weaker models produces substantially worse entity resolution and contradiction detection. The structured output requirement further limits provider choice, since not all LLMs support Pydantic schema validation. [Source](../raw/deep/repos/getzep-graphiti.md) This means your knowledge graph quality is coupled to your LLM budget.

**Compounding hallucinations in agent-maintained wikis.** When an LLM writes incorrect connections into a wiki, every downstream agent that reads those connections builds on the error. The blast radius scales with the number of agents consuming the knowledge base. One practitioner documented this explicitly: "raw data is dangerous when it compounds cause one hallucinated connection enters the brain and every agent downstream builds on it." [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) Mitigation requires a separate review agent that evaluates articles blind to their production process.

**Summary quality degradation at depth in hierarchical compression.** Lossless-claw's DAG creates progressively more abstract summaries. At depth 3+, summaries are highly abstract and may lose specific details. The expansion system (sub-agent spawn + LLM call) adds 5-15 seconds of latency to recover detail. If the expansion model is underpowered or the `maxExpandTokens` budget is too small (default 4,000, community recommends 12,000), recovery fails silently. [Source](../raw/deep/repos/martian-engineering-lossless-claw.md) The deterministic fallback truncation (512 tokens) from a 20K token input is lossy. The system guarantees token reduction, not information preservation.

**Community detection drift in incrementally updated graphs.** Both Graphiti and HippoRAG use incremental community updates that gradually diverge from what a full recomputation would produce. The Zep paper acknowledges this requires "periodic refreshes" but does not specify when or how to detect divergence. [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) For long-running graphs with thousands of episodes, community summary quality degrades silently.

## Selection Guide

- **If you need project-level knowledge for a single agent with minimal setup,** use Napkin (264 stars) because BM25 on markdown matches RAG benchmarks with zero infrastructure. Avoid if your domain has heavy jargon variation requiring semantic bridging.

- **If your agent needs to track how facts change over time across conversations,** use [Graphiti](projects/graphiti.md) (24,473 stars) because its bi-temporal edge model and automatic contradiction resolution handle evolving knowledge. Requires Neo4j/FalkorDB and makes 4-5 LLM calls per ingested episode. Avoid if you need sub-millisecond ingestion.

- **If you need agents to collaboratively build and maintain a wiki,** follow the Karpathy pattern with [Obsidian](projects/obsidian.md) as frontend and Graphify (7,021 stars) for graph extraction. Add a separate review agent for quality gating.

- **If you need hierarchical summarization for sessions exceeding 100K tokens,** use Lossless-claw (~4,000 stars). Set `incrementalMaxDepth=-1` (the default of 0 causes context overflow). Use a cheap model (Haiku, Qwen3-8B) for summarization to control costs.

- **If you need verifiable cross-organization knowledge sharing,** evaluate OriginTrail DKG v9. Currently beta/testnet. No other system provides cryptographic provenance for multi-agent knowledge graphs.

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

CORAL (120 stars) runs multiple agents in isolated git worktrees with shared state (attempts, notes, skills) in `.coral/public/`, symlinked into every worktree for zero-sync-overhead knowledge sharing. [Source](../raw/repos/human-agent-society-coral.md) [MemEvolve](projects/memevolve.md) goes further, using LLMs to generate entirely new memory provider implementations from trajectory analysis, achieving 7-17% gains across benchmarks. [Source](../raw/deep/repos/bingreeky-memevolve.md) The centralized-compilation camp (Karpathy wiki, meta-kb itself) uses a single compiler to maintain consistency. The distributed camp lets agents build knowledge independently and merges via shared filesystems or gossip protocols. Centralized compilation wins on consistency; distributed evolution wins on parallelism and novelty.

## What's Hot Now

Obsidian Skills hit 19,325 stars, making it one of the fastest-growing agent skill packages. Planning-with-files reached 18,000 stars by codifying the Manus "filesystem as working memory" pattern with lifecycle hooks. [Source](../raw/deep/repos/othmanadi-planning-with-files.md) [Graphiti](projects/graphiti.md) at 24,473 stars now supports four graph backends (Neo4j, FalkorDB, Kuzu, Neptune) and ships an MCP server for Claude and Cursor integration. [Source](../raw/repos/getzep-graphiti.md) Graphify went from launch to 7,021 stars as a Claude Code skill that builds knowledge graphs from any folder. [Source](../raw/repos/safishamsi-graphify.md) MIRIX (3,508 stars) introduced a six-agent memory architecture (Core, Episodic, Semantic, Procedural, Resource, Knowledge Vault) with screen-capture grounding, routing queries to specialized memory stores rather than a flat index. [Source](../raw/repos/mirix-ai-mirix.md)

Compound Product (503 stars) and its parent Ralph (12,000+ stars) demonstrate the overnight autonomous improvement loop: read production reports, pick the top priority, generate a PRD with 8-15 machine-verifiable tasks, implement via agent loop, ship a PR. The compounding effect comes from AGENTS.md long-term memory and progress.txt cross-iteration learnings. [Source](../raw/deep/repos/snarktank-compound-product.md)

## Open Questions

**When should you recompute communities from scratch?** Both Graphiti and HippoRAG acknowledge incremental community updates drift from optimal but neither specifies a drift detection mechanism or refresh schedule.

**How do you evaluate a knowledge base's quality without a downstream task?** The field has benchmarks for retrieval (LongMemEval, HotpotQA, LoCoMo) but no standard metric for "is this wiki coherent and accurate?" The review-agent pattern is ad hoc.

**Can memory evolution avoid runaway complexity?** [MemEvolve](projects/memevolve.md) generates new memory providers from trajectory analysis, but has no diversity pressure in its tournament selection and no cross-generation learning. [Source](../raw/deep/repos/bingreeky-memevolve.md) Whether evolved memory architectures converge to a monoculture or maintain useful variety remains untested at scale.

**What is the right granularity for memory notes?** Napkin's per-round notes (~2.5K chars) outperformed session-level notes (~15K chars) for BM25 retrieval. [Source](../raw/deep/repos/michaelliv-napkin.md) A-MEM uses atomic Zettelkasten-style notes. Lossless-claw's leaf summaries target 800-1200 tokens. No one has systematically varied granularity to find the optimum, and it likely depends on the retrieval method.

**How do you handle the cost of LLM-per-ingestion architectures at scale?** Graphiti makes 4-5+ LLM calls per episode. A-MEM requires multiple calls per memory for note construction, link analysis, and evolution. The Zep paper does not report per-message ingestion costs. For high-volume enterprise use, the cumulative cost is unknown.

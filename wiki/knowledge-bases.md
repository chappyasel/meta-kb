---
title: The State of LLM Knowledge Bases
type: synthesis
bucket: knowledge-bases
abstract: >-
  LLM knowledge bases shifted from "how do we retrieve documents?" to "how do we
  build living knowledge systems that agents maintain, evolve, and reason over?"
  — driven by Karpathy's wiki pattern proving that LLM-maintained markdown can
  match RAG at small scale while creating compounding value.
source_date_range: 2024-04-24 to 2026-04-04
newest_source: '2026-04-04'
staleness_risk: low
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - repos/human-agent-society-coral.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/topoteretes-cognee.md
  - repos/getzep-graphiti.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/michaelliv-napkin.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/osu-nlp-group-hipporag.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/mirix-ai-mirix.md
  - repos/volcengine-openviking.md
  - repos/nemori-ai-nemori.md
  - repos/kepano-obsidian-skills.md
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - repos/microsoft-llmlingua.md
  - papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - articles/agent-skills-overview.md
  - repos/laurian-context-compression-experiments-2508.md
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/natebjones-projects-ob1.md
  - repos/yusufkaraaslan-skill-seekers.md
entities:
  - andrej-karpathy
  - rag
  - graphrag
  - obsidian
  - bm25
  - vector-database
  - knowledge-graph
  - hotpotqa
  - neo4j
  - chromadb
  - qdrant
  - llamaindex
  - hipporag
  - raptor
  - lightrag
  - hybrid-retrieval
  - pgvector
  - pinecone
  - weaviate
  - milvus
  - faiss
  - community-detection
  - personalized-pagerank
  - zettelkasten
  - multi-hop-reasoning
  - lancedb
  - cognee
  - ragflow
  - organizational-memory
  - markdown-wiki
last_compiled: '2026-04-05T20:10:22.266Z'
---
# The State of LLM Knowledge Bases

Six months ago, practitioners asked how to chunk documents and tune vector similarity. Today the question is different: how do you build a knowledge system that gets smarter as agents use it? Andrej Karpathy's [wiki pattern](tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) — raw sources compiled into LLM-maintained markdown, with linting loops and query outputs filed back in — went viral with 38,638 likes and nearly 10 million views. The reaction wasn't "interesting experiment." It was recognition that the paradigm had shifted.

The core question changed from retrieval architecture to knowledge architecture. What structure do you give information so agents can reason over it, not just look things up in it?

## Approach Categories

### 1. The Filesystem Question: Can agents skip vector databases entirely?

[Napkin](repos/michaelliv-napkin.md) (264 stars) answers yes at certain scales. Its architecture is BM25 search over markdown files with a four-level progressive disclosure pattern: a 200-token `NAPKIN.md` context note (Level 0), a 1-2k token vault overview with TF-IDF keywords (Level 1), 2-5k ranked search results (Level 2), and full file reads on demand (Level 3). No embeddings. No vector index. Just `ripgrep` and term frequency.

The benchmark claim is striking: on [LongMemEval](repos/michaelliv-napkin.md), napkin scores 91% on the S dataset (500-session conversations) versus 86% for "best prior system" and 64% for GPT-4o full context. On the M dataset (500-session scale), 83% versus 72% prior.

**Source conflict:** These benchmarks are self-reported in napkin's README with no independent verification. The comparison baseline labeled "best prior system" isn't named, making replication difficult. Treat with caution.

[OpenViking](repos/volcengine-openviking.md) (20,813 stars) extends this with a filesystem paradigm for unified context management — memories, resources, and skills all addressed via `viking://` URIs with L0/L1/L2 tiered loading. Its LoCoMo benchmark data shows the OpenClaw plugin achieving 52% task completion versus 35% for baseline, with 83% fewer input tokens than LanceDB. Again self-reported.

**Wins when:** knowledge base is under ~100K tokens, human readability matters, you want zero infrastructure. **Loses when:** corpus grows beyond LLM context limits, latency matters, or you need semantic similarity across large document sets.

**Failure mode:** BM25 breaks on terminology drift. A document about "context windows" won't surface when an agent queries "token limits" unless both terms appear. At 400K words (Karpathy's size), you start hitting this constantly.

### 2. The Graph Question: Does structure enable reasoning that flat retrieval can't?

[Graphiti](repos/getzep-graphiti.md) (24,473 stars) stores knowledge as temporal context graphs: entities (nodes), facts (edges with validity windows), and episodes (provenance traces). A fact like "Kendra loves Adidas shoes" carries `valid_from` and `valid_until` timestamps, and when it changes, the old fact is invalidated rather than deleted. Retrieval combines semantic embeddings, BM25, and graph traversal. The underlying Zep paper ([arxiv 2501.13956](papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)) reports 94.8% on DMR versus MemGPT's 93.4%, and 18.5% accuracy improvement on LongMemEval with 90% latency reduction.

[HippoRAG](repos/osu-nlp-group-hipporag.md) (3,332 stars, NeurIPS '24) uses knowledge graphs with Personalized PageRank for multi-hop retrieval. The methodology paper (ICML '25) shows improvement across all of factual memory (NaturalQuestions, PopQA), sense-making (NarrativeQA), and associativity (MuSiQue, 2Wiki, HotpotQA). The indexing cost is significantly lower than GraphRAG or RAPTOR.

[Cognee](repos/topoteretes-cognee.md) (14,899 stars) wraps graph-vector hybrid search in six lines of API: `add()`, `cognify()`, `search()`. Internally it builds knowledge graphs from ingested text and runs combined vector/graph queries.

**Wins when:** answering multi-hop questions ("who worked at company X before it merged with Y?"), tracking how facts change over time, or synthesizing across sessions. **Loses when:** your questions are single-hop lookups, or you need sub-100ms latency (graph traversal is expensive).

**Failure mode:** Entity resolution collapse. When the same entity appears under multiple names ("OpenAI", "OAI", "the company"), graph construction splits it into multiple nodes. Queries about "OpenAI" miss facts attached to "OAI." This gets worse as corpora grow and LLM-driven extraction varies.

### 3. The Temporal Question: How do you handle knowledge that changes?

Standard RAG returns a snapshot of what was true at index time. For enterprise applications — product specs, policies, customer data — that snapshot goes stale immediately. The Zep/Graphiti architecture ([paper](papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)) addresses this with bi-temporal tracking: `valid_from`/`valid_until` on every fact edge, plus episode provenance. An agent can query "what was true as of March 15th" or "what changed last week."

[Nemori](repos/nemori-ai-nemori.md) (187 stars) takes a different approach: episodic memory with LLM-powered boundary detection. Rather than arbitrary time windows, it segments conversations at topic transitions using Event Segmentation Theory. Architecture is dual-backend: PostgreSQL for metadata and text search (tsvector/GIN indexes), Qdrant for vector storage.

**Wins when:** knowledge genuinely changes — customer preferences, policy updates, evolving technical specs. **Loses when:** your domain is static, or you can't afford the LLM calls for continuous graph updates.

**Failure mode:** Temporal queries require the LLM to reason about `valid_from`/`valid_until` chains, which current models handle inconsistently. Ask "what did we know about X in April?" and you may get facts that technically post-date the query if the model misreads the validity windows.

### 4. The Specialization Question: Should memory be typed by content, not just similarity?

[MIRIX](repos/mirix-ai-mirix.md) (3,508 stars) implements six specialized memory stores: Core (user identity, persona), Episodic (conversation history), Semantic (factual knowledge), Procedural (skills, workflows), Resource (files, documents), and Knowledge Vault (structured domain knowledge). Each store has dedicated agents routing writes and reads. Retrieval queries the right store based on question type rather than running one search across everything.

The architectural bet: a question about how to do something (procedural) should query a different index than a question about what happened (episodic). Combined with screen-capture grounding, MIRIX can ingest ambient context without explicit user input.

**Wins when:** you have genuinely heterogeneous memory types (conversation history + technical docs + user preferences + skills), routing accuracy matters. **Loses when:** your use case is primarily document Q&A — six agents routing queries adds latency and coordination overhead.

**Failure mode:** Routing errors are silent and catastrophic. If "how do I fix this bug?" gets routed to Episodic instead of Procedural, the agent returns conversation history instead of fix patterns. These misroutes compound: wrong store returns irrelevant results, agent generates plausible-sounding but wrong answers.

### 5. The Self-Improving Question: Can knowledge bases grow themselves?

The Karpathy pattern ([tweet](tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)) describes a closed loop: raw sources → LLM compiles wiki → agent queries wiki → query outputs filed back in → wiki improves. Every query enriches the base. Linting passes find inconsistencies, impute missing data, and suggest new article candidates.

[CORAL](repos/human-agent-society-coral.md) (120 stars) formalizes this for multi-agent optimization: shared state in `.coral/public/` (attempts, notes, skills) symlinked into every agent's git worktree, a manager watching for new attempts, heartbeat-triggered consolidation. The eval loop (`uv run coral eval`) stages, commits, and grades in one shot.

[Ars Contexta](repos/agenticnotetaking-arscontexta.md) (2,928 stars) generates domain-specific knowledge architectures from conversation — folder structure, processing pipelines, templates, hooks — backed by 249 research claims. The `/ralph` command spawns fresh subagents per processing phase to avoid context degradation.

**Wins when:** research is ongoing, queries are diverse, and you want knowledge to compound. **Loses when:** you need deterministic, auditable knowledge — self-modification makes it hard to know what changed and why.

**Failure mode (critical):** Hallucination propagation. One [multi-agent wiki builder](tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) describes this precisely: "one hallucinated connection enters the brain and every agent downstream builds on it." Without a validation gate between draft and live, errors compound geometrically. The solution described: a supervisor agent (Hermes) reviewing articles blind to their production process, scoring before promotion to permanent knowledge.

## The Convergence

Three things the field now agrees on that were contested 12 months ago:

**Hybrid retrieval beats pure vector search.** BM25 + dense embeddings outperforms either alone. [Graphiti](repos/getzep-graphiti.md) explicitly combines semantic embeddings, keyword (BM25), and graph traversal. [Mirix](repos/mirix-ai-mirix.md) uses PostgreSQL BM25 full-text search alongside vector similarity. The only disagreement is weighting, not the principle.

**Context tiering is necessary at scale.** Dumping everything into context doesn't work — cost, noise, and lost-in-the-middle problems make it unreliable. [OpenViking](repos/volcengine-openviking.md)'s L0/L1/L2 tiering, [Napkin](repos/michaelliv-napkin.md)'s four-level progressive disclosure, [Ars Contexta](repos/agenticnotetaking-arscontexta.md)'s phase-per-subagent approach — all solve the same problem differently.

**Markdown wikis can match RAG at small-to-medium scale.** Karpathy's claim that "I thought I had to reach for fancy RAG, but the LLM has been pretty good about auto-maintaining index files" is echoed by [napkin's LongMemEval numbers](repos/michaelliv-napkin.md). The threshold is approximately 100-200 articles / 400-500K words before vector retrieval becomes necessary.

## What the Field Got Wrong

The assumption was that retrieval quality was the bottleneck. Every research effort went into better embeddings, hybrid search, reranking, and chunk size optimization.

The actual bottleneck is knowledge freshness and integrity. A perfectly retrieved stale fact is worse than a less-precisely retrieved current one. The Zep/Graphiti paper demonstrates this: a system that maintains temporal validity windows outperforms static RAG on enterprise tasks not because retrieval is better but because the facts themselves are trustworthy.

What replaced the retrieval-quality assumption: knowledge architecture. Not "how do I find the right chunk" but "how do I represent facts so they stay valid, can be updated without full re-indexing, and carry enough provenance to debug when they're wrong." The [context engineering survey](papers/mei-a-survey-of-context-engineering-for-large-language.md) formalizes this: context engineering encompasses retrieval, processing, and management — not just retrieval optimization.

## Failure Modes

**Hallucination propagation in self-improving systems.** Multi-agent knowledge bases let agents write to the wiki. One bad entry gets cited by subsequent agents, which write new entries that reference the bad one. The blast radius is proportional to how frequently the hallucinated fact appears in retrieved context. The fix ([jumperz pattern](tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)): a supervisor agent with no production bias reviews every article before it enters permanent knowledge.

**Entity resolution failure in graph systems.** Graph construction requires resolving "OpenAI," "OAI," and "the company" to the same node. LLM-driven extraction is inconsistent. Duplicate nodes accumulate silently; queries against one miss facts attached to others. No currently popular framework solves this reliably. Triggers: large corpora, inconsistent source formatting, domain-specific abbreviations.

**Context compression quality degradation.** [Production data from a RAG system](repos/laurian-context-compression-experiments-2508.md) shows gpt-4o-mini failing contextual compression (returning `NO_OUTPUT`) on documents where gpt-4o succeeds. The failure rate under rate-limiting conditions can hit 100% of borderline cases. Prompt optimization via DSPy GEPA recovered 62% of failures; TextGrad recovered 79%; the hybrid approach recovered 100% — but requires significant offline optimization work per domain.

**Scale cliff for filesystem-based knowledge.** Napkin and Karpathy-style wikis work at 100-200 articles. At 1,000+ articles, two things break: BM25 recall drops on terminology variation, and the LLM's ability to auto-maintain index files degrades (indices become inconsistent, backlinks accumulate errors). There's no clean transition path to vector search without rebuilding the entire knowledge base.

**Routing errors in specialized memory systems.** [MIRIX](repos/mirix-ai-mirix.md)'s six-agent architecture fails silently when questions route to the wrong memory type. Unlike retrieval failures (which return low-relevance results that a competent reader might flag), routing errors return high-confidence results from the wrong domain. An agent asking "how do I configure X?" that hits Episodic memory gets conversation history about X, which may sound plausible.

## Selection Guide

- **If you need a personal research knowledge base under 500K words:** Use the Karpathy markdown wiki pattern with [Napkin](repos/michaelliv-napkin.md) or [Ars Contexta](repos/agenticnotetaking-arscontexta.md) (2,928 stars) — no vector infrastructure, fully inspectable, BM25 retrieval matches RAG at this scale.

- **If you need multi-session agent memory with temporal reasoning:** Use [Graphiti](repos/getzep-graphiti.md) (24,473 stars) — temporal validity windows, hybrid retrieval, enterprise benchmark results. Requires Neo4j or FalkorDB. Managed option via Zep.

- **If you need enterprise RAG with dynamic knowledge integration:** Avoid static vector-only RAG. Use [Graphiti](repos/getzep-graphiti.md) or [Cognee](repos/topoteretes-cognee.md) (14,899 stars) — both handle structured + unstructured data, continuous updates without full reindex.

- **If you need multi-hop reasoning over document corpora:** Use [HippoRAG](repos/osu-nlp-group-hipporag.md) (3,332 stars, NeurIPS '24, ICML '25) over GraphRAG — substantially lower indexing cost for equivalent or better multi-hop performance. Requires embedding model (NV-Embed-v2 or Contriever).

- **If you need heterogeneous agent memory (conversation + docs + skills):** Use [MIRIX](repos/mirix-ai-mirix.md) (3,508 stars) for six specialized stores, or [OpenViking](repos/volcengine-openviking.md) (20,813 stars) for filesystem paradigm with L0/L1/L2 tiering. Avoid single-index systems — routing by memory type improves precision.

- **If you're building multi-agent self-improving research systems:** Use [CORAL](repos/human-agent-society-coral.md) (120 stars) for the shared knowledge infrastructure. Add a supervisor validation gate (blind review before permanent storage) to prevent hallucination propagation.

- **If your context compression is failing under rate limits:** Run [DSPy GEPA or TextGrad optimization](repos/laurian-context-compression-experiments-2508.md) on your compression prompt with domain-specific failure examples before scaling — recovering 62-100% of failures is cheaper than model upgrades.

## The Divergence

**LLM-maintained wikis vs. vector databases for agent memory.** One camp (Karpathy, Napkin, Ars Contexta) argues LLMs maintaining markdown is sufficient for most practical scales — 100-500 articles, fully inspectable, zero infrastructure. The other camp (Graphiti, Cognee, MIRIX, Pinecone, Qdrant) argues structured retrieval with vector search is necessary for production scale, semantic precision, and latency requirements. The filesystem camp wins on simplicity and transparency; the vector camp wins on scale and precision. Neither has convinced the other.

**Temporal graph memory vs. episodic segmentation.** Graphiti tracks temporal validity explicitly on every edge — a fact has a `valid_from` and `valid_until`. Nemori segments by topic boundary using LLM-detected event transitions. Graphiti enables precise temporal queries ("what was true on March 15th?") but requires expensive per-ingestion LLM calls to extract entities and relationships. Nemori's episodic boundaries are cheaper but coarser. Production systems doing long-horizon reasoning lean toward Graphiti; conversational memory systems lean toward episodic.

**Specialized memory stores vs. unified index.** MIRIX's six-agent architecture bets that routing queries to typed memory stores (episodic, semantic, procedural, etc.) improves relevance. OpenViking bets that a unified filesystem with tiered loading (L0/L1/L2) is simpler and sufficient. The specialization approach wins on precision when routing is accurate; the unified approach wins on simplicity and avoids routing failure modes. No production benchmark has settled this.

**Autonomous knowledge evolution vs. human-gated writes.** CORAL and Ars Contexta let agents write to shared knowledge stores with minimal gates. The jumperz multi-agent wiki pattern adds a supervisor validation gate before permanent storage. The first approach compounds knowledge faster; the second prevents hallucination propagation. This is an active disagreement with working implementations on both sides, and the right answer depends on acceptable error rates.

## What's Hot Now

[OpenViking](repos/volcengine-openviking.md) hit 20,813 stars with rapid trajectory — filesystem paradigm for agent context is landing as a concept. [Skill Seekers](repos/yusufkaraaslan-skill-seekers.md) at 12,269 stars is converting documentation into agent skills at scale, with 87 packaged skills and support for 17 source types. [Graphiti](repos/getzep-graphiti.md) grew to 24,473 stars on the back of the Zep paper and MCP server integration, making temporal knowledge graphs accessible via Claude Code and Cursor. [Obsidian Skills](repos/kepano-obsidian-skills.md) at 19,325 stars formalized agent operations on markdown vaults as first-class capabilities.

The agent skills format itself ([agentskills.io](articles/agent-skills-overview.md)) is gaining adoption across Claude Code, Codex, OpenCode, and Cursor — portable, version-controlled knowledge packages that decouple procedural expertise from agent architecture. [AI Research Skills](repos/orchestra-research-ai-research-skills.md) at 6,111 stars demonstrates this with 87 production-ready research skills covering the full ML lifecycle.

## Open Questions

**At what corpus size does LLM-maintained wiki maintenance break?** The field agrees it works at 100-200 articles. Nobody has published systematic data on where it fails or how gracefully it degrades.

**How do you validate temporal knowledge graph integrity at scale?** Graphiti's temporal fact management requires every new ingestion to check for contradictions with existing facts. For high-volume enterprise data (thousands of updates per day), this is expensive. No one has published a principled approach to approximate or batch this.

**Can synthetic data generation replace retrieval?** Karpathy's tweet mentions it as a future direction: "think about synthetic data generation + finetuning to have your LLM 'know' the data in its weights instead of just context windows." Whether fine-tuned models can replace retrieval for personal knowledge domains is unresolved — and the cost-quality tradeoff is unclear.

**Does memory type routing generalize?** MIRIX's six-agent memory architecture is theoretically motivated but lacks published ablation data. Does the specialized routing actually outperform a single high-quality vector index with good reranking, or is the overhead not worth it outside specific use cases?

**How do you share knowledge across agent swarms without consensus protocols?** CORAL's symlink approach works for optimization tasks but doesn't address write conflicts when multiple agents update the same knowledge simultaneously. Organizational memory for multi-agent systems — where agents have different contexts and goals — has no consensus solution.

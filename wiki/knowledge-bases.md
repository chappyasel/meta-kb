---
title: The State of LLM Knowledge Bases
type: synthesis
bucket: knowledge-bases
abstract: >-
  The core question shifted from "how do we retrieve relevant documents?" to
  "how do we build knowledge that agents can maintain, evolve, and reason over
  at arbitrary scales?" — driven by practitioners discovering that
  LLM-maintained wikis often outperform vector pipelines at moderate scales
  while enabling self-improvement loops that RAG cannot.
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
  - rag
  - graphrag
  - obsidian
  - bm25
  - knowledge-graph
  - graphiti
  - hotpotqa
  - agentic-rag
  - hybrid-retrieval
  - vector-database
  - chromadb
  - qdrant
  - llamaindex
  - hipporag
  - raptor
  - neo4j
  - lightrag
  - leiden-algorithm
  - pgvector
  - weaviate
  - pinecone
  - lancedb
  - organizational-memory
  - zettelkasten
  - faiss
  - elasticsearch
  - knowledge-base
  - directory-recursive-retrieval
  - ragflow
  - personalized-pagerank
  - milvus
  - falkordb
last_compiled: '2026-04-06T01:47:22.415Z'
---
# The State of LLM Knowledge Bases

Six months ago, the default question was which vector database to pick. Now practitioners are asking whether they need one at all. The Karpathy wiki pattern — raw sources compiled into LLM-maintained markdown, queried by agents that also update the index — demonstrated that at small-to-medium scale (100 articles, ~400K words), BM25 search on markdown files can match RAG while producing a knowledge base that compounds in quality with every query. That shift changed the design space [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md).

## Approach Categories

### 1. What storage primitive should knowledge live in?

The oldest assumption in this space was "vector database." It's still the right answer for many production workloads, but three distinct alternatives have now accumulated serious adoption signals.

**Flat-file wikis with LLM-maintained indexes** emerged from [Andrej Karpathy](concepts/andrej-karpathy.md)'s public description of his research workflow: raw sources in `raw/`, LLM-compiled wiki in structured `.md` files, index files auto-maintained by the LLM, and BM25 search for Q&A. [napkin](projects/napkin.md) (264 stars) implements this directly: four progressive disclosure levels from `NAPKIN.md` (~200 tokens) through `napkin overview` (~1-2K tokens) to full file reads, using BM25 on markdown. Their [LongMemEval](projects/longmemeval.md) benchmarks show 91% accuracy on the S dataset (40 sessions) vs. 86% for the prior best system — with zero embeddings, no graphs, no summaries. Benchmark credibility note: self-reported by the napkin team; methodology described in `bench/README.md` but not peer-reviewed [Source](../raw/deep/repos/michaelliv-napkin.md).

**Wins when:** knowledge base fits in a few hundred files, human inspectability matters, infrastructure budget is near zero. **Loses when:** corpus grows beyond ~1M words or requires sub-second semantic search over millions of records.

**Specific failure mode:** LLM-maintained index files drift from the actual corpus content. An agent writing a new article doesn't always update the index, backlinks accumulate errors, and queries start missing relevant documents with no error signal. The "self-healing linting loop" [Karpathy describes](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) addresses this but requires deliberate scheduling.

**Temporal knowledge graphs** are the most architecturally distinct approach. [Graphiti](projects/graphiti.md) (24,473 stars) maintains entities and facts as graph nodes/edges with explicit validity windows — "Kendra loves Adidas shoes (as of March 2026)" becomes a fact with a start timestamp and an optional invalidation timestamp. When new information contradicts an existing fact, the old fact is invalidated rather than overwritten, preserving full history. The backing store requires Neo4j, FalkorDB, Kuzu, or Amazon Neptune. [Zep](projects/zep.md) wraps Graphiti in a managed memory service: their paper reports 94.8% on the Deep Memory Retrieval benchmark vs. 93.4% for MemGPT, and up to 18.5% accuracy improvement on [LongMemEval](projects/longmemeval.md) with 90% latency reduction vs. baseline. Benchmark credibility: self-reported in the Zep paper ([rasmussen-zep](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)); the DMR comparison uses MemGPT's own evaluation setup, which is a reasonable methodological choice.

**Wins when:** data changes over time and agents need "what was true when" queries; enterprise CRM/customer data contexts; multi-session agents that must track evolving facts. **Loses when:** data is static documents, graph construction costs (LLM calls per ingested episode) are prohibitive, or you need pure semantic similarity retrieval.

**Specific failure mode:** Graphiti ingestion pipelines make multiple LLM calls per episode for entity extraction and relationship inference. At high ingestion rates, the default `SEMAPHORE_LIMIT=10` hits provider rate limits silently — writes fail without surfacing errors to the calling application. The fix (lower concurrency or upgrade provider tier) is documented but easy to miss [Source](../raw/deep/repos/getzep-graphiti.md).

**Filesystem-paradigm context databases** represent a third model. [OpenViking](projects/openclaw.md) (20,813 stars) stores memories, resources, and skills under a `viking://` URI scheme with three-tier loading: L0 abstracts (~100 tokens per directory), L1 overviews (~2K tokens), L2 full content on demand. Directory recursive retrieval combines semantic search with filesystem traversal — find the high-scoring directory first, then search within it. Their LoCoMo10 benchmark comparison (1,540 cases) shows OpenViking Plugin at 52.08% task completion vs. OpenClaw+LanceDB at 44.55%, with 96% fewer input tokens vs. LanceDB. Benchmark credibility: self-reported, single evaluation dataset, no independent verification [Source](../raw/deep/repos/volcengine-openviking.md).

**Wins when:** agents need unified management of heterogeneous context types (skills, memories, documents), token cost is a primary constraint, or context lineage/observability matters. **Loses when:** you need millisecond semantic search at scale or standard RAG toolchain compatibility.

### 2. How should retrieval be structured?

Classical [RAG](concepts/rag.md) with dense vector search is the baseline, but two structural extensions have demonstrated measurable gains.

[GraphRAG](projects/graphrag.md) (Microsoft's approach) builds entity knowledge graphs from documents, then precomputes community summaries at multiple hierarchy levels using the Leiden algorithm for community detection. At query time, partial responses from relevant community summaries are aggregated into a final answer. This solves RAG's fundamental failure on global sensemaking queries ("what are the main themes in this dataset?") — the kind of query that requires reading the whole corpus, not retrieving a few chunks. [Source](../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)

[HippoRAG](projects/hipporag.md) (3,332 stars) takes a different graph approach inspired by hippocampal memory: build a knowledge graph from documents, then use Personalized PageRank seeded from query-relevant nodes to traverse it. HippoRAG 2 claims improvements on multi-hop (MuSiQue, 2Wiki, HotpotQA) and sense-making (NarrativeQA) benchmarks vs. standard RAG and GraphRAG, while claiming lower indexing cost than GraphRAG/RAPTOR. Benchmark credibility: published at ICML '25 for HippoRAG 2, peer-reviewed, though comparison methodology details matter [Source](../raw/deep/repos/osu-nlp-group-hipporag.md).

[Hybrid Retrieval](concepts/hybrid-retrieval.md) combining BM25 with dense vectors is now standard. What's changed is where it's applied: systems like Mirix use PostgreSQL-native BM25 (`pg_tsvector`/GIN indexes) alongside Qdrant vector search, avoiding a second retrieval service [Source](../raw/repos/mirix-ai-mirix.md).

**Specific failure mode for graph-based RAG:** Index rebuild cost. GraphRAG's community summary precomputation requires batch LLM calls across the entire corpus. When source documents update frequently, this becomes a blocking operation. Graphiti's incremental update design explicitly addresses this; GraphRAG's static batch model does not.

### 3. How should knowledge be typed by memory function?

The cognitive science framing — episodic, semantic, procedural, core memory — has moved from academic concept to production architecture choice.

[Letta](projects/letta.md)'s architecture and MIRIX (3,508 stars) both implement typed memory stores. MIRIX runs six specialized agents: Core Memory (in-context identity), Episodic Memory (events with timestamps), Semantic Memory (facts and concepts), Procedural Memory (workflows), Resource Memory (files and links), and Knowledge Vault (curated information). Queries route to the appropriate store rather than searching a flat vector index. The architectural bet: routing precision beats raw similarity search precision when memory types have genuinely different access patterns [Source](../raw/repos/mirix-ai-mirix.md).

Nemori (187 stars) focuses specifically on episodic boundary detection — using LLMs to segment conversation streams at topic transitions rather than arbitrary time windows, then converting segments to rich episode narratives with temporal anchors. Their LongMemEval results show competitive performance with simpler infrastructure than full graph approaches [Source](../raw/repos/nemori-ai-nemori.md).

**Wins when:** the agent's domain cleanly maps to distinct memory types; you need strong per-session isolation; debugging retrieval requires knowing which store was hit. **Loses when:** domain knowledge is highly interconnected (the right memory type for a given fact is ambiguous) or routing overhead dominates at scale.

### 4. How should agents acquire and store procedural knowledge?

[Agent Skills](concepts/agent-skills.md) as a portable format have moved from Anthropic-internal to an open standard with broad adoption. A `SKILL.md` file in a directory provides the agent with procedural knowledge for a specific domain. [obsidian-skills](projects/obsidian.md) (19,325 stars) demonstrates the pattern: modular skill files for Obsidian markdown operations, Bases, JSON Canvas, and CLI interactions that any skills-compatible agent can discover and use [Source](../raw/deep/repos/kepano-obsidian-skills.md).

[Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md) (12,269 stars) automates skill creation from documentation: scrape a docs site or GitHub repo, run LLM enhancement, package into a skills-format ZIP. It outputs to 16 targets including LangChain Documents, LlamaIndex TextNodes, Cursor `.cursorrules`, and Pinecone-ready chunks from the same scraping pass [Source](../raw/repos/yusufkaraaslan-skill-seekers.md).

[AI-Research-SKILLs](../raw/repos/orchestra-research-ai-research-skills.md) (6,111 stars) packages 87 domain-specific skills (vLLM, TRL, GRPO, Megatron-Core, etc.) as a library. The autoresearch skill orchestrates a two-loop architecture: inner optimization loop for experiments, outer synthesis loop for findings — routing to domain skills as needed [Source](../raw/repos/orchestra-research-ai-research-skills.md).

**Specific failure mode:** Skill file bloat. As skill libraries grow, agents load irrelevant skill context that crowds out task-relevant information. Progressive disclosure (load SKILL.md summary first, full references only when needed) is the documented mitigation but requires disciplined skill authorship.

## The Convergence

Three things the field now agrees on that were contested 12 months ago:

**Self-maintaining indexes beat manual curation at scale.** The [Karpathy pattern](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) made this concrete: LLMs writing and updating index files, backlinks, and article summaries outperforms humans doing the same work for corpora above a few dozen documents. The multi-agent extension — supervisor agent reviewing swarm output before it enters the permanent knowledge base, as described in the [jumperz thread](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) — is now a recognized pattern for production multi-agent systems.

**Token cost is a retrieval quality metric.** OpenViking's 96% token reduction vs. LanceDB while achieving higher task completion forced this into the conversation. L0/L1/L2 tiered loading, [Prompt Compression](concepts/prompt-compression.md) (LLMLingua achieves up to 20x compression with minimal accuracy loss per EMNLP/ACL papers), and progressive disclosure are now evaluated alongside retrieval precision, not separately [Source](../raw/deep/repos/volcengine-openviking.md) [Source](../raw/repos/microsoft-llmlingua.md).

**Temporal awareness is a first-class requirement for enterprise memory.** Static RAG returning document chunks without validity information produces incorrect answers when facts change — a company's CEO, a policy, a price. Graphiti's explicit bi-temporal model (fact validity windows + episode provenance) is now the reference architecture for agentic CRM and business data contexts [Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md).

## What the Field Got Wrong

The original assumption: more retrieval infrastructure means better retrieval quality. Teams added vector databases, then hybrid search, then re-rankers, then graph indexes — treating complexity as a proxy for correctness.

The evidence against it: napkin's BM25-on-markdown achieves 91% on LongMemEval-S vs. 86% for systems with much more infrastructure. The [context compression experiments](../raw/repos/laurian-context-compression-experiments-2508.md) show that DSPy GEPA + TextGrad prompt optimization on a simple extraction prompt gets gpt-4o-mini from 0% to 100% success rate on previously-failing compressions — without any retrieval architecture changes.

What replaced it: the bottleneck is usually context assembly quality (chunking strategy, index freshness, temporal validity) and query-document representation alignment, not the retrieval mechanism itself. The [context engineering survey](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) formalizes this: context engineering encompasses retrieval, processing, and management as a unified discipline. Retrieval mechanism selection is one input parameter, not the primary lever.

## Failure Modes

**Hallucination compounding in multi-agent systems.** One agent writes an incorrect connection into the knowledge base; subsequent agents retrieve it and build on it. At 100 articles, this is recoverable. At 10,000, corrupted nodes are nearly unfindable. The [jumperz architecture](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) addresses this with a supervisor agent scoring articles before promotion to permanent storage — the supervisor has no context about how the article was produced, eliminating confirmation bias. Without this gate, hallucination compounds with every write cycle.

**Embedding drift after model updates.** Vector databases store embeddings tied to a specific model version. When the embedding model changes (or you switch providers), all stored vectors become stale — semantically similar queries no longer retrieve the right documents. The blast radius is the entire knowledge base. Mitigation: version-stamp embeddings, run periodic reindexing jobs, or use BM25 as a fallback. Most teams discover this at the worst moment: after a model deprecation notice.

**Temporal knowledge graph construction costs at ingestion scale.** Graphiti makes multiple LLM calls per episode (entity extraction, relationship inference, fact invalidation checks). At 1,000 episodes/hour with SEMAPHORE_LIMIT=10, you'll hit provider rate limits. Failures are often silent — the write appears to succeed but entities aren't extracted. The workaround (lower concurrency, upgrade tier) is documented; the detection (checking for missing entity nodes after bulk ingestion) is not standard practice [Source](../raw/deep/repos/getzep-graphiti.md).

**Context window overflow in naive agentic RAG.** Agentic RAG systems that retrieve multiple documents and pass all of them to an LLM in one context fail when the total token count exceeds the model's window. The failure mode isn't an error — the model silently ignores later documents ("lost in the middle"). LongLLMLingua's dynamic compression, OpenViking's L0/L1/L2 tiering, and prompt compression preprocessing all address this; vanilla retrieval pipelines do not.

**Stale skill files breaking agent workflows.** A skill file documenting an API that changed in v2.0 produces confident but wrong agent actions. Unlike hallucination, this failure is systematic — every agent using the skill makes the same wrong call. Skill Seekers' documentation sync detection and re-scraping workflow addresses this, but requires periodic scheduling. Teams with monorepos need internal doc scraping pipelines; external dependency skills need version pinning.

## Selection Guide

- **If you need personal research knowledge base under ~500 documents**, use [napkin](projects/napkin.md) (264 stars) or the Karpathy pattern with [Obsidian](projects/obsidian.md) (19,325 stars). BM25 on markdown, no vector infrastructure, no ongoing cost.

- **If you need agents that track how business facts change over time**, use [Graphiti](projects/graphiti.md) (24,473 stars) or [Zep](projects/zep.md)'s managed service — temporal validity windows, bi-temporal querying, automatic fact invalidation. Requires Neo4j or FalkorDB.

- **If you need unified context management across memories, resources, and skills with token efficiency**, evaluate [OpenViking](projects/openclaw.md) (20,813 stars) — L0/L1/L2 tiered loading, `viking://` filesystem abstraction, 91-96% token reduction in their benchmarks vs. flat vector retrieval.

- **If you need multi-hop question answering over a large static corpus**, use [HippoRAG](projects/hipporag.md) (3,332 stars) for lower indexing cost or [GraphRAG](projects/graphrag.md) for global sensemaking queries — both beat vanilla RAG on HotpotQA-class benchmarks.

- **If you need portable, domain-specific procedural knowledge for agents**, use the [Agent Skills](concepts/agent-skills.md) format — [AI-Research-SKILLs](../raw/repos/orchestra-research-ai-research-skills.md) (6,111 stars) for ML domain, [obsidian-skills](projects/obsidian.md) (19,325 stars) for knowledge management.

- **If you need to convert documentation into skills/RAG chunks across multiple targets**, use [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md) (12,269 stars) — 17 source types, 16 output targets, conflict detection between docs and code.

- **If you need cross-provider AI memory without middleware**, evaluate [OB1/Open Brain](../raw/repos/natebjones-projects-ob1.md) (1,151 stars) — single Supabase+pgvector backend, MCP server, any AI plugs in.

- **Avoid** building custom chunking pipelines on top of raw vector databases for conversational memory — Letta, Zep, and Graphiti have solved this with temporal awareness and session management that generic vector stores lack.

## The Divergence

**Static batch indexing vs. incremental live graph construction.** GraphRAG batch-processes entire corpora to precompute community summaries — excellent for static document collections, prohibitive for data that changes daily. Graphiti updates incrementally per episode, making it suitable for real-time agent interactions. Neither team shows the other's workload performed well on their architecture. The choice depends entirely on data velocity.

**Vector similarity as primary retrieval vs. graph traversal as primary retrieval.** [LlamaIndex](projects/llamaindex.md) and [LangChain](projects/langchain.md) treat dense vector search as the retrieval primitive with graphs as an optional enhancement. Graphiti and HippoRAG treat graph traversal as primary with vector search for initial seeding. Under multi-hop queries, graph-primary systems win; under single-fact lookup, vector-primary systems have lower latency and simpler operational requirements.

**LLM-maintained knowledge vs. human-curated knowledge.** [Ars Contexta](../raw/repos/agenticnotetaking-arscontexta.md) (2,928 stars) generates personalized knowledge system architectures through conversation, then hands structure to the human for curation. The Karpathy pattern gives the LLM full write access. The first optimizes for knowledge quality and trust; the second for scalability and self-improvement loops. Practitioners building personal systems trend toward Karpathy-style; enterprises with compliance requirements trend toward human-in-the-loop gating.

**Typed memory stores vs. flat unified retrieval.** MIRIX and Letta route queries to specialized memory agents by type (episodic, semantic, procedural). Mem0 and most RAG systems search a unified store. The typed approach wins when query intent cleanly maps to memory types; it adds routing overhead and fails when a query spans types (e.g., "what's our standard procedure for handling the issue that happened last Tuesday?").

## What's Hot Now

[OpenViking](projects/openclaw.md) reached 20,813 stars with recent velocity from the OpenClaw/coding agent ecosystem — the filesystem paradigm for context resonates with practitioners building IDE-native agents. [Graphiti](projects/graphiti.md) crossed 24,473 stars on the back of the Zep paper and MCP server integration for Claude/Cursor. [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md) hit 12,269 stars driven by the agent skills ecosystem growth.

The [Karpathy tweet](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) (38,638 likes, ~10M views) created a measurable wave: napkin, arscontexta, and several Obsidian plugin projects cite it as direct inspiration. The CORAL multi-agent research framework (120 stars, very new) applies the self-improving pattern to autonomous research with shared `.coral/public/` knowledge stores [Source](../raw/deep/repos/human-agent-society-coral.md).

Prompt optimization for RAG (the [context-compression-experiments](../raw/repos/laurian-context-compression-experiments-2508.md) pattern using DSPy GEPA + TextGrad) is gaining attention among practitioners who hit rate limits on expensive models — recovering failed compressions via prompt optimization rather than model upgrades is a legitimate cost-reduction strategy.

## Open Questions

**When does graph overhead pay off?** Graph construction requires LLM calls per document chunk. The break-even point — where graph retrieval quality gains exceed construction cost — is unclear. HippoRAG claims lower cost than GraphRAG but both cost more than vanilla RAG. No independent benchmark has measured this across controlled corpus sizes and query types.

**How do you detect knowledge base corruption in production?** Self-maintaining systems that allow LLMs to write to the knowledge base have no standard health monitoring. LLM linting loops catch some inconsistencies; they miss systematic errors caused by a bad model update. The field has no agreed-upon corruption detection protocol.

**Can synthetic data generation from knowledge bases reduce context dependency?** Karpathy's closing note — "synthetic data generation + finetuning to have your LLM know the data in its weights instead of just context windows" — describes the natural endpoint of the wiki pattern. No team has demonstrated this loop working reliably at knowledge base scale. This is the unsolved problem that turns a retrieval system into a genuinely learning agent.

**What is the right granularity for episodic memory segmentation?** Nemori uses LLM-powered boundary detection aligned with topic transitions. Graphiti segments by API call (each `add_episode` call is one episode). Neither approach is clearly superior across domains. The right granularity for a customer support transcript differs from a research conversation.

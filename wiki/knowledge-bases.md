---
title: The State of LLM Knowledge Bases
type: synthesis
bucket: knowledge-bases
abstract: >-
  LLM-maintained markdown wikis with auto-indexing now outperform traditional
  RAG at small-to-medium scale, shifting the knowledge base bottleneck from
  retrieval architecture to wiki evolution and self-healing maintenance loops.
source_date_range: 2024-04-24 to 2026-04-06
newest_source: '2026-04-06'
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
  - repos/memvid-memvid.md
  - articles/agent-skills-overview.md
  - repos/gustycube-membrane.md
  - repos/laurian-context-compression-experiments-2508.md
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - repos/orchestra-research-ai-research-skills.md
entities:
  - rag
  - obsidian
  - graphrag
  - bm25
  - knowledge-graph
  - vector-database
  - graphiti
  - postgresql
  - agentic-rag
  - neo4j
  - hotpotqa
  - chromadb
  - qdrant
  - redis
  - hybrid-search
  - hipporag
  - raptor
  - llamaindex
  - embedding-model
  - faiss
  - pinecone
  - weaviate
  - milvus
  - lancedb
  - cognee
  - zettelkasten
  - hnsw
  - reciprocal-rank-fusion
  - lightrag
  - entity-extraction
  - ragflow
  - personalized-pagerank
  - docling
  - sqlite
  - elasticsearch
  - knowledge-base
last_compiled: '2026-04-07T11:31:12.520Z'
---
# The State of LLM Knowledge Bases

[Andrej Karpathy](concepts/andrej-karpathy.md) reported that an LLM-maintained markdown wiki of ~100 articles and ~400K words handles complex Q&A without any vector database, embedding pipeline, or [RAG](concepts/rag.md) infrastructure. The LLM auto-maintains index files and brief summaries, reads related data on demand, and answers multi-hop questions over the full corpus. This caught practitioners off guard because the entire RAG industry spent three years building embedding pipelines, vector stores, and retrieval orchestration for exactly this use case. Karpathy's approach replaced all of it with `raw/` directories, markdown files, and an LLM that maintains its own indexes. The tweet drew 38,638 likes and nearly 10 million views, signaling that a large audience recognized this pattern from their own frustrated experience with RAG complexity. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

## Approach Categories

### How should you structure and store knowledge for LLM consumption?

Two competing storage paradigms dominate. The first treats knowledge as **flat files in a filesystem**, where markdown documents with backlinks, index files, and directory structure provide the retrieval surface. [Obsidian](projects/obsidian.md) serves as the viewing layer. Karpathy's pattern, [napkin](projects/napkin.md) (264 stars), and Ars Contexta (2,928 stars) all follow this approach. napkin implements [progressive disclosure](concepts/progressive-disclosure.md) with four levels: a ~200-token project context note (Level 0), a vault map with TF-IDF keywords (Level 1), ranked [BM25](concepts/bm25.md) search results with snippets (Level 2), and full file content (Level 3). It reports 92% accuracy on the [LongMemEval](projects/longmemeval.md) Oracle benchmark with zero preprocessing, no embeddings, and no graph structures. [Source](../raw/repos/michaelliv-napkin.md)

The second paradigm uses **graph-backed knowledge stores** where entities, relationships, and facts get extracted into a queryable graph. [Graphiti](projects/graphiti.md) (24,473 stars) builds temporal context graphs with validity windows on facts, episode provenance, and hybrid retrieval combining semantic embeddings, keyword search, and graph traversal. Cognee (14,899 stars) combines [vector databases](concepts/vector-database.md) with [knowledge graphs](concepts/knowledge-graph.md) and continuous learning. [HippoRAG](projects/hipporag.md) (3,332 stars) uses knowledge graphs with [Personalized PageRank](concepts/personalized-pagerank.md) to mimic hippocampal memory indexing for multi-hop retrieval.

**Tradeoff:** File-based systems win when your corpus fits in ~1M tokens, you need human-readable inspectability, and you want zero infrastructure. Graph-based systems win when you need temporal reasoning ("what was true last month?"), multi-hop queries across hundreds of thousands of entities, or enterprise-scale multi-user deployments. **Failure mode for file-based:** once the wiki exceeds context window capacity, the LLM cannot maintain accurate indexes and retrieval degrades silently. You get wrong answers without error signals.

### How should you manage retrieval at query time?

Three retrieval strategies compete. **Direct file reading** (Karpathy pattern) relies on the LLM reading index files and navigating to relevant documents. **[Hybrid search](concepts/hybrid-search.md)** combines dense vector similarity with sparse keyword search ([BM25](concepts/bm25.md)) and uses [Reciprocal Rank Fusion](concepts/reciprocal-rank-fusion.md) to merge results. [Graphiti](projects/graphiti.md) and [OpenViking](projects/openviking.md) (20,813 stars) both implement this. **Hierarchical tiered loading** treats context like a filesystem with L0/L1/L2 abstraction layers. OpenViking generates L0 abstracts (~100 tokens), L1 overviews (~2K tokens), and L2 full content loaded on demand, then uses directory-recursive retrieval that locks on high-scoring directories before drilling into content. [Source](../raw/repos/volcengine-openviking.md)

OpenViking reports concrete benchmarks against OpenClaw's native memory on the [LoCoMo](projects/locomo.md) benchmark: 52.08% task completion rate (vs 35.65% baseline) while reducing input token cost by 83-96%. These numbers come from a test dataset of 1,540 cases. [Source](../raw/repos/volcengine-openviking.md) **Source conflict:** napkin reports 92% on LongMemEval Oracle with pure BM25 search [Source](../raw/repos/michaelliv-napkin.md), while Zep/Graphiti reports 94.8% on the Deep Memory Retrieval benchmark using temporal knowledge graphs [Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). The benchmarks measure different things (conversational memory vs. document retrieval), making direct comparison unreliable.

**Failure mode:** Hybrid search with rank fusion produces false confidence. You merge two retrieval signals, each returning plausible but wrong results, and the fusion gives you a high-ranked answer that looks authoritative but draws from the wrong document.

### How should knowledge evolve over time?

The static snapshot problem drives the most active area of innovation. Traditional RAG indexes a corpus once and re-indexes on a schedule. Three projects address this differently. [Graphiti](projects/graphiti.md) maintains temporal validity windows on every fact: when a fact changes, the old version gets invalidated but preserved for historical queries. The Zep paper shows 18.5% accuracy improvements on [LongMemEval](projects/longmemeval.md) temporal reasoning tasks compared to baselines. [Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) Membrane (72 stars) implements typed, revisable memory with explicit supersede, fork, retract, merge, and contest operations, each producing an audit trail. Records have salience decay curves that reduce their relevance over time unless reinforced by success. [Source](../raw/repos/gustycube-membrane.md) Karpathy's pattern uses LLM "health checks" that find inconsistent data, impute missing data via web searches, and suggest new article candidates, creating a self-healing maintenance loop. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

**Failure mode for temporal systems:** Stale facts that never get invalidated poison downstream queries. Membrane's lifecycle eval shows RAG scoring 0/4 on retraction, supersession, reinforcement, and decay scenarios, while structured memory scores 4/4. [Source](../raw/repos/gustycube-membrane.md) The blast radius is large: one outdated fact in a knowledge graph propagates through every multi-hop query that touches it.

### How should you specialize memory by type?

MIRIX (3,508 stars) splits agent memory into six specialized stores: Core (identity), Episodic (raw experience), Semantic (stable facts), Procedural (how-to knowledge), Resource (reference materials), and Knowledge Vault (deep domain knowledge). Each store has its own retrieval logic. [Source](../raw/repos/mirix-ai-mirix.md) Membrane takes a similar approach with five types: Episodic (immutable raw events), Working (current task state), Semantic (stable facts), Competence (learned procedures with success rates), and Plan Graph (reusable solution structures). [Source](../raw/repos/gustycube-membrane.md)

**Tradeoff:** Type-specialized memory routes queries to the right store, improving precision. It loses when the query spans types and the routing logic misclassifies, sending a temporal question to the semantic store instead of the episodic store. Single-store systems avoid this routing problem but sacrifice retrieval precision.

## The Convergence

**All production systems now use some form of LLM-maintained indexing rather than relying solely on embedding-based retrieval.** Every system in this analysis, from napkin's TF-IDF keyword extraction to OpenViking's L0/L1/L2 summaries to Graphiti's entity extraction, uses an LLM to generate structured metadata about content. Pure vector similarity search without LLM-generated indexes is absent from any system shipping production features in 2025-2026. The last holdout was standard RAG pipelines using only embedding similarity, which the Zep paper demonstrated underperformed temporal knowledge graphs by up to 18.5% on enterprise tasks. [Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

**All serious knowledge base systems now preserve provenance from derived facts back to source material.** Graphiti traces every entity and relationship to its source episodes. [Source](../raw/repos/getzep-graphiti.md) Membrane tracks audit trails for every revision. [Source](../raw/repos/gustycube-membrane.md) OpenViking maintains the full retrieval trajectory. Even Karpathy's wiki pattern keeps raw source documents alongside compiled articles. The approach that held out longest was flat vector stores like [ChromaDB](projects/chromadb.md) and [Pinecone](projects/pinecone.md), which store embeddings without source-to-derivation lineage.

**All systems now implement hybrid retrieval combining at least two retrieval signals.** Graphiti uses semantic + keyword + graph traversal. OpenViking combines directory positioning with semantic search. napkin uses BM25 with progressive disclosure levels. Memvid uses BM25 + HNSW vectors. No production system relies on a single retrieval method. Memvid (14,493 stars) held out the longest with its initial focus on pure vector search before adding BM25 via the `lex` feature flag. [Source](../raw/repos/memvid-memvid.md)

## What the Field Got Wrong

The assumption: **you need a vector database and embedding pipeline to give LLMs access to external knowledge.** The entire RAG industry, led by [LlamaIndex](projects/llamaindex.md), [LangChain](projects/langchain.md), and vector database vendors like [Pinecone](projects/pinecone.md), [Qdrant](projects/qdrant.md), and [ChromaDB](projects/chromadb.md), built their value proposition around this claim.

The evidence that disproved it: napkin's [LongMemEval](projects/longmemeval.md) benchmarks show BM25 search on markdown files achieving 91% accuracy on the S benchmark (~40 sessions) and 83% on the M benchmark (~500 sessions), outperforming the best prior system at 86% and 72% respectively. Zero embeddings. Zero graph structures. Zero vector databases. [Source](../raw/repos/michaelliv-napkin.md) Karpathy independently confirmed the pattern works at ~400K words using only LLM-maintained index files. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

The replacement: at small-to-medium scale (under ~1M tokens of source material), file-based knowledge systems with BM25 search and LLM-maintained indexes match or exceed vector-database-backed RAG. Vector databases remain the right choice for large-scale corpora, multi-modal data, and cases requiring sub-millisecond latency on millions of documents. But the default starting point for practitioners shifted from "set up a vector database" to "try markdown files with BM25 first."

**Caveat on napkin's benchmarks:** these are self-reported numbers from the project's README, run against a specific benchmark dataset. No independent reproduction exists in the sources. Treat them as indicative, not definitive.

## Deprecated Approaches

**Static batch-indexed RAG without temporal awareness.** Before 2025, practitioners chunked documents, embedded them, stored vectors, and queried by similarity. This seemed right because it worked for simple Q&A over unchanging corpora. The Zep paper killed it by showing that enterprise tasks require tracking when facts became true and when they changed. Systems without temporal tracking returned outdated information and could not answer "what changed since last quarter?" queries. Membrane's lifecycle eval quantified the damage: pure RAG scores 0/4 on scenarios testing retraction, supersession, reinforcement, and decay. [Source](../raw/repos/gustycube-membrane.md) Graphiti's temporal context graphs, with fact validity windows and episode provenance, replaced this pattern. [Source](../raw/repos/getzep-graphiti.md)

**Monolithic memory stores with uniform retrieval.** Pre-2025, most agent memory systems dumped everything into a single vector collection and ran the same similarity search regardless of query type. MIRIX's six-agent memory architecture and Membrane's five typed memory stores demonstrated that routing queries to type-specific stores (episodic vs. semantic vs. procedural) produces better retrieval than searching a flat index. [Source](../raw/repos/mirix-ai-mirix.md) [Source](../raw/repos/gustycube-membrane.md) The specific evidence: Membrane's competence records track success rates for procedures, allowing the system to prefer proven solutions over similar but untested ones, something impossible in a flat store.

**Append-only knowledge bases without revision or decay.** Early agent memory systems treated memory as a log: append new facts, never modify old ones. This seemed right because immutability simplifies implementation. Membrane's lifecycle eval shows the failure: when a wrong fact enters an append-only store, RAG keeps returning it because vector similarity doesn't distinguish retracted facts from current ones. Membrane's supersede/retract/decay operations let agents correct mistakes and let stale knowledge fade. [Source](../raw/repos/gustycube-membrane.md)

## Failure Modes

**Hallucination compounding in self-maintaining wikis.** When an LLM writes wiki articles and then uses those articles to answer questions and write more articles, one hallucinated connection propagates through the entire knowledge base. @jumperz documented this after scaling Karpathy's pattern to a 10-agent swarm: "one hallucinated connection enters the brain and every agent downstream builds on it." The fix requires a separate review agent that scores articles before they enter the permanent knowledge base, with no context about how the work was produced to avoid confirmation bias. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

**Silent index staleness at scale.** LLM-maintained indexes work when the corpus is small enough for the LLM to read and verify. Beyond a threshold (roughly when the total index exceeds one context window), the LLM cannot validate consistency across all index entries. Broken backlinks, outdated summaries, and orphaned articles accumulate. The LLM reports confident answers based on stale indexes. No system in the sources has solved automatic detection of this failure mode.

**Temporal fact invalidation cascades in knowledge graphs.** When Graphiti invalidates a fact, every derived fact and relationship that depended on it may also need invalidation. The current approach handles direct supersession but does not trace transitive dependencies. If fact A depends on fact B, and fact B gets invalidated, fact A remains in the graph with full validity. Multi-hop queries that traverse the stale path return incorrect results with high confidence.

**Context compression quality collapse on weaker models.** Production RAG systems frequently fall back to cheaper models (e.g., gpt-4o-mini) due to rate limits. One practitioner filtered 1,000+ traces where gpt-4o-mini failed context compression entirely (returning NO_OUTPUT), compared to gpt-4o succeeding on 296 of those cases. Prompt optimization via DSPy GEPA and TextGrad recovered extraction capability to 62% and 79% respectively, with a hybrid approach reaching 100%. [Source](../raw/repos/laurian-context-compression-experiments-2508.md) The failure triggers silently: the system returns empty results rather than erroring, so downstream agents proceed without the context they need.

**Memory type misrouting in specialized stores.** Systems like MIRIX and Membrane that split memory by type depend on correct classification of incoming data and correct routing of queries. A debugging observation classified as "semantic" rather than "episodic" loses its temporal context. A procedural query routed to the semantic store returns facts instead of procedures. Neither system reports classification accuracy metrics in the sources.

## Selection Guide

- **If you need a personal knowledge base under 1M tokens**, use the Karpathy pattern with [Obsidian](projects/obsidian.md) and your preferred coding agent. Zero infrastructure, human-readable, inspectable. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

- **If you need agent-ready progressive disclosure without infrastructure**, use [napkin](projects/napkin.md) (264 stars). BM25 on markdown, four disclosure levels, MIT license, TypeScript SDK. Reports strong LongMemEval numbers. Maturity: early. [Source](../raw/repos/michaelliv-napkin.md)

- **If you need temporal knowledge tracking with fact validity windows**, use [Graphiti](projects/graphiti.md) (24,473 stars). Requires [Neo4j](projects/neo4j.md) or FalkorDB. Apache-2.0. Production-tested at Zep. Best for enterprise use cases requiring "what changed when" queries. [Source](../raw/repos/getzep-graphiti.md)

- **If you need a unified context database for coding agents (OpenClaw, OpenCode)**, use [OpenViking](projects/openviking.md) (20,813 stars). Filesystem paradigm, L0/L1/L2 tiered loading, reports 83-96% token cost reduction on LoCoMo. AGPL-3.0. [Source](../raw/repos/volcengine-openviking.md)

- **If you need portable, serverless memory with no database**, use Memvid (14,493 stars). Single `.mv2` file, Rust core, BM25 + HNSW vectors, sub-5ms latency. Reports +35% SOTA on LoCoMo (self-reported). Apache-2.0. [Source](../raw/repos/memvid-memvid.md)

- **If you need knowledge graphs from unstructured data**, use Cognee (14,899 stars). Combines vector search with graph databases, supports continuous learning. Apache-2.0. [Source](../raw/repos/topoteretes-cognee.md)

- **If you need typed, revisable agent memory with decay and audit trails**, use Membrane (72 stars). Go gRPC service, TypeScript + Python clients. MIT license. Maturity: early, small community. [Source](../raw/repos/gustycube-membrane.md)

- **If you need personalized knowledge system architecture derived from your cognitive patterns**, use Ars Contexta (2,928 stars). Claude Code plugin, generates custom folder structures and processing pipelines from conversation. MIT. [Source](../raw/repos/agenticnotetaking-arscontexta.md)

- **If you need to compress retrieved context to reduce token costs**, use LLMLingua (5,985 stars). Achieves up to 20x compression. Integrates with [LangChain](projects/langchain.md) and [LlamaIndex](projects/llamaindex.md). MIT. [Source](../raw/repos/microsoft-llmlingua.md)

- **If you need multi-hop retrieval mimicking human memory**, use [HippoRAG](projects/hipporag.md) (3,332 stars). Knowledge graphs + Personalized PageRank. MIT. [Source](../raw/repos/osu-nlp-group-hipporag.md)

- **Avoid building custom vector database infrastructure** if your corpus is under 1M tokens. Start with file-based approaches and add vector search only when file-based retrieval measurably fails.

## The Divergence

### Files vs. Graphs for knowledge representation

File-based systems (Karpathy pattern, napkin, Ars Contexta) optimize for inspectability, simplicity, and zero infrastructure. Graph-based systems (Graphiti, Cognee, HippoRAG) optimize for multi-hop reasoning, temporal tracking, and relationship-aware retrieval. Files win for individual practitioners and small teams working on bounded research domains. Graphs win for enterprise deployments with evolving multi-user data and compliance requirements. Both camps have working production implementations. Neither shows signs of yielding.

### LLM-maintained indexes vs. precomputed embeddings for retrieval

Karpathy and napkin let the LLM maintain and query its own indexes at query time. Graphiti, OpenViking, and Memvid precompute embeddings and indexes ahead of time. LLM-maintained indexes win when the corpus changes frequently and the LLM can read the full index in one pass. Precomputed embeddings win when the corpus exceeds context window size or when you need sub-second latency at scale. The boundary between these approaches sits at roughly 500K-1M tokens of source material.

### Single-store vs. type-specialized memory

Systems like napkin and Memvid use a single retrieval surface. MIRIX and Membrane split memory by cognitive type. Single-store systems are simpler to build and debug. Type-specialized systems produce better retrieval precision when the routing works. The split correlates with use case: personal knowledge bases trend single-store, multi-agent enterprise systems trend type-specialized.

### Self-healing wikis vs. review-gated knowledge bases

Karpathy's pattern lets the LLM freely modify the wiki. @jumperz's multi-agent pattern interposes a separate review agent between raw output and the permanent knowledge base. Self-healing wins for speed of iteration on personal projects. Review-gating wins for multi-agent systems where compounding hallucinations threaten downstream reliability. The tension maps to the classic speed-vs-safety tradeoff. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

## What's Hot Now

[OpenViking](projects/openviking.md) reached 20,813 stars with its filesystem paradigm for agent context management. [Graphiti](projects/graphiti.md) hit 24,473 stars. Obsidian Skills (19,325 stars) from Obsidian creator Steph Ango gives agents the ability to create and edit Obsidian content via the Agent Skills specification, turning Obsidian vaults into agent-writable knowledge bases. [Source](../raw/repos/kepano-obsidian-skills.md)

Memvid grew to 14,493 stars with its single-file memory approach, now rewritten in Rust with multi-modal support (CLIP, Whisper). Cognee reached 14,899 stars.

CORAL (120 stars) from the Human-Agent-Society group introduced multi-agent self-evolution infrastructure where agents share knowledge through a `.coral/public/` directory with attempts, notes, and skills symlinked into every agent's worktree. [Source](../raw/repos/human-agent-society-coral.md)

AI Research Skills (6,111 stars) packages 87 production-ready skills for autonomous AI research, including an autoresearch orchestration layer that routes to domain-specific skills across the full research lifecycle. [Source](../raw/repos/orchestra-research-ai-research-skills.md)

The context compression research from DSPy GEPA and TextGrad optimization shows that prompt engineering can recover 62-100% of failed context compressions on cheaper models, directly reducing production RAG costs. [Source](../raw/repos/laurian-context-compression-experiments-2508.md)

## Open Questions

**When does file-based retrieval break?** napkin and Karpathy's pattern work at ~400K words. No one has published failure thresholds. Practitioners need to know: at what corpus size does BM25 on markdown files degrade below vector-database-backed RAG?

**How do you detect stale indexes in self-maintaining wikis?** LLM health checks catch some inconsistencies, but no system reliably detects when its own index has diverged from the underlying data. Automated index integrity verification remains unsolved.

**Can typed memory routing be made reliable?** MIRIX and Membrane split memory by type, but neither reports classification accuracy for incoming data or routing accuracy for queries. If routing fails 10% of the time, the precision gains from type specialization may not offset the misrouting losses.

**How should knowledge bases handle multi-agent writes?** CORAL uses symlinked shared state. @jumperz uses a review gate. Graphiti supports concurrent updates. No one has benchmarked which approach produces the most reliable knowledge base when 5+ agents write simultaneously.

**Will [synthetic data generation](concepts/synthetic-data-generation.md) and finetuning replace context-window-based knowledge bases?** Karpathy flagged this as a natural next step: having the LLM "know" the data in its weights instead of reading it at query time. No public results exist on finetuning vs. wiki-based retrieval for personal knowledge domains.

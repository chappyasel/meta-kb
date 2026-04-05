---
title: The State of LLM Knowledge Bases
type: synthesis
bucket: knowledge-bases
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
  - repos/karpathy-autoresearch.md
  - repos/alvinreal-awesome-autoresearch.md
  - articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - repos/supermemoryai-supermemory.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - repos/vectifyai-pageindex.md
  - repos/tirth8205-code-review-graph.md
  - repos/snarktank-compound-product.md
  - papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
entities:
  - rag
  - graphrag
  - bm25
  - hotpotqa
  - postgresql
  - obsidian
  - graphiti
  - knowledge-graph
  - llamaindex
  - sqlite
  - neo4j
  - vector-database
  - hybrid-retrieval
  - semantic-search
  - raptor
  - zettelkasten
  - ragflow
  - elasticsearch
  - meta-kb
  - qdrant
  - leiden-algorithm
  - notion
  - chromadb
  - weaviate
  - pinecone
  - cognee
  - multi-hop-reasoning
  - agentic-rag
  - hipporag
  - lightrag
  - entity-extraction
  - lancedb
  - faiss
  - bi-temporal-indexing
  - milvus
  - chunking
  - kuzu
  - falkordb
  - memgraph
last_compiled: '2026-04-05T05:11:20.133Z'
---
# The State of LLM Knowledge Bases

The core question has shifted from "how do we retrieve the right chunks?" to "how do we build knowledge structures that agents can maintain, evolve, and reason about over time?" Six months ago, practitioners debated vector database selection. Now they debate whether vector databases are the right abstraction at all. The strongest knowledge-base systems stay inspectable, load detail progressively, and turn queries back into durable artifacts instead of treating every answer as disposable output.

## Approach Categories

### 1. Compiled Markdown Wikis (The Karpathy Pattern)

The single most influential idea in this space: dump raw sources into a folder, let an LLM compile them into a structured markdown wiki, view it in Obsidian, and run health checks to keep it clean. Karpathy's tweet describing this pattern hit 38,600 likes and 9.95 million views ([Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)). The architecture, as diagrammed by @himanshustwts ([Source](../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)), flows through six stages: data ingest into `raw/`, LLM compilation into `.md` files with backlinks and cross-references, Obsidian as the viewing layer, Q&A against the wiki at ~100 articles without RAG, LLM health checks for linting, and a feedback loop where query outputs get filed back.

The critical insight from @DataChaz: the bottleneck is clean file organization and self-healing linting loops, not retrieval sophistication ([Source](../raw/tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md)). Agents need organized files and the ability to query their own indexes. No vector database. No embedding pipeline. No chunking strategy.

[Napkin](projects/napkin.md) (264 stars) implements BM25 search on markdown with four progressive disclosure levels (L0: ~200 tokens, L1: ~2K tokens, L2: ~5K tokens, L3: full file). On LongMemEval: 91% accuracy on medium sessions vs 86% for prior best systems, with zero preprocessing, no embeddings, no graphs ([Source](../raw/repos/michaelliv-napkin.md)). Self-reported but methodologically verifiable since LongMemEval is a public benchmark.

[Ars Contexta](projects/arscontexta.md) (2,928 stars) generates personalized vault architectures through conversation, deriving folder structure, processing pipelines, hooks, and navigation maps. Its six-phase pipeline (Record, Reduce, Reflect, Reweave, Verify, Rethink) runs each phase in a fresh context window via sub-agent spawning, keeping every phase in the "smart zone" where LLM attention has not degraded ([Source](../raw/repos/agenticnotetaking-arscontexta.md)).

[OpenViking](projects/openviking.md) (20,813 stars) adopts a filesystem paradigm with L0/L1/L2 tiered loading, `viking://` URIs, and automatic session compression. 43% task completion improvement over baseline with 91% reduction in input token cost ([Source](../raw/repos/volcengine-openviking.md)).

**Tradeoff:** Wins when knowledge fits in a few hundred files and queries are broad or exploratory. Loses when you need sub-second retrieval over millions of documents, structured joins, or temporal queries that span years. The compilation step becomes a bottleneck as the wiki grows, and context window size is the implicit scaling limit.

**Failure mode:** Hallucination compounding. One incorrect relationship enters the wiki, downstream agents build on it, and the linting loop lacks ground truth to detect it. The multi-agent variant ([Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)) addresses this with a separate supervisor agent (Hermes) that scores articles blind to production context, but this adds latency and cost per article.

---

### 2. RAG and Its Production Failure Modes

Traditional RAG remains the default production architecture: chunk documents, embed into vectors, retrieve top-k at query time, feed to the LLM. The pipeline is well-understood but degrades silently. "RAG doesn't crash. It degrades. Slightly wrong answers. Missing context. Hallucinated explanations with citations" ([Source](../raw/articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md)).

The production checklist: layout-aware parsing that preserves document structure, hybrid retrieval combining dense embeddings and sparse BM25, reranking with cross-encoders, context budgets enforcing "better context > more context", and correction handling that excludes previously wrong answers.

Agentic RAG compounds the failures. The control loop (plan, retrieve, evaluate, decide, retrieve again) creates failure modes that do not exist in simple pipelines: retrieval thrash (the agent keeps searching without converging), tool storms (cascading tool calls that burn budgets), and context bloat (the window fills with low-signal content until the model stops following instructions) ([Source](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)). One startup documented agents making 200 LLM calls in 10 minutes, burning $50-200 before anyone noticed. The fix is budgeting, gating, and hard stopping rules: cap retrieval at 3 iterations, hard-kill above 30 tool calls.

[Supermemory](projects/supermemory.md) (20,994 stars) represents the production end of the RAG spectrum, handling temporal reasoning, contradiction resolution, and automatic forgetting. Its framing: "Memory is not RAG. RAG retrieves document chunks, stateless, same results for everyone. Memory extracts and tracks facts about users over time" ([Source](../raw/repos/supermemoryai-supermemory.md)).

**Tradeoff:** RAG scales to millions of documents and handles heterogeneous data. The right choice for large-scale production with diverse query patterns. Requires significant infrastructure, degrades silently without observability, and relies on similarity rather than relevance.

---

### 3. Graph-Based Knowledge (GraphRAG)

RAG cannot answer global, corpus-level questions like "what are the main themes in the dataset?" because retrieval is local. GraphRAG addresses this by extracting entities and relationships into a knowledge graph, precomputing community summaries via the Leiden algorithm, then generating partial responses from relevant summaries and synthesizing them ([Source](../raw/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md)). For global sensemaking over datasets in the 1M token range, GraphRAG produces substantial improvements over conventional RAG for both comprehensiveness and diversity.

A systematic benchmark comparing RAG vs GraphRAG found the winner depends on task structure: flat retrieval excels for direct lookup, graph-organized contexts win for multi-hop reasoning ([Source](../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)). You must match retrieval architecture to query complexity.

[Graphiti](projects/graphiti.md) (24,473 stars) builds temporal context graphs where every fact has a validity window with `valid_from` and `valid_to` timestamps, traced back to source episodes. When new information contradicts old facts, Graphiti invalidates rather than deletes. Hybrid retrieval combines semantic embeddings, BM25, and graph traversal. The Zep paper reports 94.8% DMR accuracy vs 93.4% for MemGPT, and 18.5% accuracy improvement with 90% latency reduction on LongMemEval ([Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)). Zep team's own paper; not independently replicated.

[HippoRAG](projects/hipporag.md) (3,332 stars) uses Personalized PageRank over knowledge graphs to enable multi-hop associative retrieval, drawing on hippocampal memory indexing theory. HippoRAG 2 (ICML '25) surpasses GraphRAG, RAPTOR, and LightRAG on associativity benchmarks while using fewer indexing resources ([Source](../raw/repos/osu-nlp-group-hipporag.md)). [Cognee](projects/cognee.md) (14,899 stars) combines vector search with graph databases and continuous learning, running entity extraction and relationship building as a pipeline on ingestion ([Source](../raw/repos/topoteretes-cognee.md)).

**Tradeoff:** Wins for enterprise use cases requiring cross-session synthesis, contradiction handling, and historical queries. Loses on setup complexity: Graphiti requires a graph database, an LLM for ingestion, and careful schema design.

**Failure mode:** Ingestion bottleneck. Graphiti's `SEMAPHORE_LIMIT` defaults to 10 concurrent operations to avoid LLM provider 429 errors. High-volume document ingestion stalls. Teams hit this when backfilling existing knowledge bases. Blast radius: delayed ingestion, inconsistent graph state.

---

### 4. Vectorless Retrieval

A growing counter-movement rejects vectors entirely. The argument: similarity is not relevance, and the lossy chunking plus opaque embedding space that plague traditional RAG are not inevitable costs.

[PageIndex](projects/pageindex.md) (23,899 stars) builds a hierarchical tree index from documents (an LLM-optimized table of contents) and uses the LLM itself to reason over that index. No vector database. No chunking. No embeddings. Documents are organized into natural sections, and retrieval simulates how a human expert navigates a complex document through tree search. PageIndex achieved 98.7% accuracy on FinanceBench, outperforming vector-based RAG systems on professional document analysis ([Source](../raw/repos/vectifyai-pageindex.md)).

Napkin (264 stars) achieves 91% on LongMemEval with BM25 on markdown. The Karpathy pattern is vectorless at its core: auto-maintained index files and summaries handle navigation at the scale of hundreds of documents.

**Tradeoff:** Vectorless approaches eliminate infrastructure complexity and are more interpretable. The right choice for personal and team-scale knowledge bases. They struggle at scale where brute-force navigation becomes impractical, and retrieval cost scales with LLM inference cost rather than being amortized by a cheap vector lookup.

---

### 5. Procedural Knowledge as Portable Skills

The [Agent Skills specification](../raw/articles/agent-skills-overview.md) treats knowledge as version-controlled, composable packages that agents load on demand. [Skill Seekers](projects/skill-seekers.md) (12,269 stars) converts documentation sites, GitHub repos, PDFs, and videos into structured SKILL.md files with automatic conflict detection between documented APIs and actual code. Exports to 16 platforms: Claude, Gemini, OpenAI, LangChain, LlamaIndex, Pinecone, Cursor, Windsurf, and more ([Source](../raw/repos/yusufkaraaslan-skill-seekers.md)). [AI Research Skills](projects/ai-research-skills.md) (6,111 stars) packages 87 production-ready skills across 22 AI research domains ([Source](../raw/repos/orchestra-research-ai-research-skills.md)). [obsidian-skills](projects/obsidian-skills.md) (19,325 stars) enables agents to maintain Obsidian vaults through Markdown, Bases, JSON Canvas, and CLI skills ([Source](../raw/repos/kepano-obsidian-skills.md)).

**Tradeoff:** Wins for stable, well-scoped domain expertise with high documentation quality. Loses when the knowledge domain changes faster than skills can be regenerated, or when the task requires reasoning across skills.

**Failure mode:** Skill staleness under API churn. Skill Seekers detects structural conflicts between documented and implemented APIs, but semantic drift, where behavior changes without signature changes, goes undetected. An agent using a stale skill follows correct syntax with incorrect behavior assumptions.

---

### 6. Multi-Agent Knowledge Systems

@jumperz wired the Karpathy pattern into a 10-agent swarm: every agent auto-dumps output into `raw/`, a compiler organizes everything into structured wiki articles, and a supervisor agent (Hermes) reviews articles before they enter the permanent knowledge base ([Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)). The key innovation is separating execution from judgment. "Raw data is dangerous when it compounds because one hallucinated connection enters the brain and every agent downstream builds on it." The supervisor reviews blind, with no context about how the work was produced. Only clean outputs get promoted.

[CORAL](projects/coral.md) (120 stars) implements git worktree isolation with shared `.coral/public/` for attempts, notes, and skills, symlinked into every worktree with zero sync overhead ([Source](../raw/repos/human-agent-society-coral.md)).

[Compound Product](projects/compound-product.md) (503 stars) applies multi-agent self-improvement to product development: daily reports are analyzed, the top priority is identified, and an agent implements it through implement-test-commit cycles, persisting learnings through git history and structured task manifests ([Source](../raw/repos/snarktank-compound-product.md)).

**Tradeoff:** Multi-agent systems can scale knowledge production beyond a single agent. The separation of execution and review catches hallucinations before they compound. Coordination overhead is real, the quality gate can bottleneck throughput, and debugging distributed knowledge production across 10 agents is an order of magnitude harder than debugging one.

## The Convergence

Five things serious systems now agree on:

**Markdown is the universal knowledge format.** Whether you use compiled wikis, graph-extracted entities, or agent-produced notes, the output is markdown with YAML frontmatter and wikilinks. Markdown is human-readable, LLM-readable, version-controllable, and renderable in multiple tools. Obsidian has become the de facto frontend: the Karpathy pattern uses it, Napkin generates Obsidian-compatible vaults, Ars Contexta produces `.obsidian/` config alongside its knowledge systems.

**Progressive context disclosure is table stakes.** Every production system layers context: a brief summary for routing decisions, a structured overview for planning, full content only when necessary. OpenViking formalizes this as L0/L1/L2; Napkin as four disclosure levels; Ars Contexta as NAPKIN.md to overview to search to read. Stuffing full documents into every query degrades retrieval quality and burns tokens.

**Hybrid retrieval beats pure vector search.** BM25 + semantic embedding + optional graph traversal is the default architecture. Graphiti combines all three. MIRIX (3,508 stars) uses PostgreSQL native BM25 alongside Qdrant vectors. Napkin achieves competitive results with BM25 alone. Keyword search catches what semantic search misses: exact names, version numbers, error codes.

**Knowledge bases need active maintenance loops.** Static indexes degrade. Every production system includes health checks, linting, or update pipelines: Graphiti invalidates stale facts automatically; Karpathy's pattern runs LLM health checks; Ars Contexta runs `/reweave` to update older notes; OpenViking extracts long-term memory at session end.

**Context engineering over retrieval engineering.** The field shifted from "how do I retrieve the right chunks?" to "how do I engineer the right context for the LLM?" Progressive disclosure, blast-radius analysis (Code Review Graph's 6.8-49x token reduction via dependency-aware context), and structured briefings. The LLM does not need all the data. It needs the right data at the right resolution.

## What the Field Got Wrong

**The assumption:** Vector similarity is sufficient for retrieval quality. Build a good embedding, chunk intelligently, retrieve top-K.

**The evidence:** Napkin's LongMemEval results (91% on medium sessions with BM25 on markdown vs 86% for prior best systems) and Graphiti's LongMemEval results (18.5% improvement with graph-based temporal retrieval) came from opposite directions and converged: the retrieval mechanism matters less than the knowledge structure. Napkin wins by organizing knowledge well enough that BM25 suffices. Graphiti wins by encoding temporal relationships that vector similarity cannot represent. Both outperform naive chunked-vector approaches.

Knowledge representation is the primary engineering challenge. Retrieval mechanism is secondary. Teams now spend more time on chunking strategy, entity extraction quality, and schema design than on embedding model selection.

## Failure Modes

**Hallucination compounding in maintained wikis.** An incorrect fact enters the knowledge base. The linting loop, lacking external ground truth, cannot detect it. Downstream agents cite the incorrect fact, creating more articles that reference it. By the time a human notices, the incorrect belief is embedded in dozens of interconnected articles. The multi-agent supervisor pattern mitigates this but adds latency. Trigger: any automated ingestion pipeline without human review gates.

**Graphiti ingestion stalls under load.** `SEMAPHORE_LIMIT` defaults to 10 concurrent LLM operations. Each episode triggers entity extraction, deduplication, and fact invalidation. For corpora larger than a few thousand documents, queues back up. Teams backfilling existing knowledge bases hit rate limits within minutes ([Source](../raw/repos/getzep-graphiti.md)). Blast radius: delayed ingestion, inconsistent graph state.

**Agentic RAG runaway costs.** Retrieval thrash (agent keeps searching without converging), tool storms (cascading tool calls), and context bloat (window fills with low-signal content). One startup documented agents making 200 LLM calls in 10 minutes, burning $50-200 ([Source](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)). Fix: cap retrieval at 3 iterations, hard-kill above 30 tool calls.

**Context compression model fallback.** In production RAG pipelines with compression, cheaper models (gpt-4o-mini) fail to extract relevant content from documents that more capable models handle. Without optimization, fallback rates reach 100% for some query types. DSPy GEPA optimization improved success to 62%; TextGrad to 79%; hybrid to 100% on a specific production dataset ([Source](../raw/repos/laurian-context-compression-experiments-2508.md)). Trigger: rate limits on primary model, budget constraints forcing downgrade.

**Routing failure in typed memory systems.** When a query does not cleanly map to one memory type, the meta-agent either queries all stores (expensive, slow) or picks incorrectly. The MIRIX six-agent architecture works for predictable query patterns but degrades on novel query types. Blast radius: empty or incoherent context assembly.

**Skill staleness under API churn.** Skill Seekers detects structural conflicts between documented and implemented APIs, but semantic drift (behavior changes without signature changes) goes undetected. An agent using a stale skill file follows correct syntax with incorrect behavior assumptions. Trigger: any API that evolves without breaking changes.

**GraphRAG index staleness.** Community summaries require full recomputation when documents change. Teams with rapidly updating corpora find GraphRAG impractical. Latency for global queries runs seconds to tens of seconds, unsuitable for interactive applications.

## Selection Guide

- **Knowledge retrieval under ~500 documents with broad exploratory queries**: [Napkin](projects/napkin.md) (264 stars). BM25 on markdown with progressive disclosure, no vector infrastructure, human-readable, 91% LongMemEval accuracy. Skip complex graph systems at this scale.

- **Temporal reasoning across evolving enterprise data**: [Graphiti](projects/graphiti.md) (24,473 stars) with [Zep](projects/zep.md) for managed deployment. Explicit bi-temporal indexing, automatic fact invalidation, hybrid retrieval. Skip pure vector stores; they cannot represent "what was true when."

- **Vectorless reasoning-based retrieval at scale**: [PageIndex](projects/pageindex.md) (23,899 stars). Hierarchical tree index, no embeddings, 98.7% on FinanceBench. The right choice when document structure is well-defined and you want to avoid vector infrastructure entirely.

- **Unified context management across memories, resources, and skills**: [OpenViking](projects/openviking.md) (20,813 stars). Filesystem paradigm with `viking://` URIs, L0/L1/L2 tiered loading. Skip if you need cloud-native vector search.

- **Agents maintaining a personal knowledge base**: [Ars Contexta](projects/arscontexta.md) (2,928 stars). Derives personalized architecture from conversation with hooks enforcing structure on every write. Skip generic RAG; it does not support active knowledge evolution.

- **Corpus-level sensemaking over large static document collections**: [GraphRAG](projects/graphrag.md). Precomputed community summaries via Leiden algorithm. Skip for real-time or frequently updated corpora.

- **Context size reduction on existing RAG pipelines**: [LLMLingua](projects/llmlingua.md) (5,985 stars). Up to 20x compression, integrated with LangChain and LlamaIndex. Combine with DSPy GEPA optimization if using cheaper models.

- **Multi-hop reasoning over large document collections**: [HippoRAG](projects/hipporag.md) (3,332 stars). Personalized PageRank on knowledge graphs, ICML '25, lower indexing cost than GraphRAG while maintaining associativity.

- **Converting documentation into reusable agent skills**: [Skill Seekers](projects/skill-seekers.md) (12,269 stars). 17 source types, 16 platform exports, automatic conflict detection.

- **Multi-agent knowledge sharing for autonomous research**: [CORAL](projects/coral.md) (120 stars). Git worktree isolation with shared `.coral/public/`. Early-stage.

- **Specialized memory routing by cognitive type**: [MIRIX](projects/mirix.md) (3,508 stars). Six-agent architecture with PostgreSQL BM25 and Qdrant vectors. Skip for simple single-domain agents.

## The Divergence

**When do vectors stop being worth the complexity?** The RAG establishment holds that vector search is essential infrastructure for any serious system. The Karpathy camp holds that for the majority of real-world use cases (personal research, team knowledge, project context), a well-structured markdown wiki with auto-maintained indexes handles hundreds of documents without embedding infrastructure. Both sides are right for their scale. With context windows expanding from 100K to 1M+ tokens, the crossover keeps moving upward.

**Precomputed or emergent graph structure?** GraphRAG and Cognee precompute explicit entity-relationship structures. The Karpathy pattern lets structure emerge organically through the LLM's compilation process (backlinks, categories, index files). HippoRAG sits between, using knowledge graphs with a lighter touch. The precomputed approach is more rigorous but more brittle; the emergent approach is more flexible but harder to audit.

**Retrieval layer or thinking layer?** Skill Seekers and Acontext push toward compilation into reusable operational assets, not just searchable notes. In that world the knowledge base is a library for capabilities, not a library for answers. The quiet disagreement: should a knowledge base optimize for finding information, or for distilling know-how into execution units?

**Human legibility vs machine mediation.** Napkin, Ars Contexta, and the Karpathy pattern assume the corpus should look like a notebook a person can repair. Graphiti and Cognee assume the harder problem is preserving relationships, provenance, and temporal truth. Use the legible lane when the workflow is collaborative and iterative; use the graph lane when relational accuracy matters more than editorial simplicity.

## What's Hot Now

Karpathy's wiki pattern tweet (38,638 likes, 9.95M views) remains the dominant conversation anchor. The multi-agent extensions being built on it, supervisor review gates, compiler pipelines, per-agent briefings, represent the practical engineering layer the original tweet gestured at.

[Autoresearch](projects/autoresearch.md) (65,009 stars) implements the self-improving loop. The [Awesome Autoresearch](projects/awesome-autoresearch.md) index catalogs platform ports, domain adaptations (genealogy, trading, GPU kernels, baseball biomechanics), and general-purpose descendants. Shopify's Tobi Lutke optimized Liquid's rendering by 53% overnight using the pattern ([Source](../raw/repos/alvinreal-awesome-autoresearch.md)). The Autoresearch 101 Builder's Playbook showed the Karpathy Loop makes any measured artifact self-improving: prompts, skills, and workflows can undergo 50-100 automated refinement cycles overnight for $5-25 in API costs ([Source](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md)).

[PageIndex](projects/pageindex.md) (23,899 stars) and Napkin's LongMemEval results are giving vectorless RAG real credibility. PageIndex's 98.7% on FinanceBench is a direct challenge to the assumption that you need embeddings for effective retrieval.

[OpenViking](projects/openviking.md) reached 20,813 stars with rapid velocity. The ByteDance cloud team's filesystem paradigm for agent context is attracting significant developer attention.

[Skill Seekers](projects/skill-seekers.md) at 12,269 stars expanded from Claude-only to 12 LLM platforms and 17 source types including YouTube video extraction with OCR frame analysis, hitting v3.2.0 with 2,540+ tests.

The "memory vs RAG" distinction is crystallizing. Supermemory's explicit framing reflects a growing understanding that persistent knowledge systems need temporal reasoning, contradiction handling, and active forgetting, not similarity search.

## Open Questions

**When do you stop using RAG and fine-tune instead?** Karpathy gestures at this: "synthetic data generation + finetuning to have your LLM 'know' the data in its weights instead of just context windows." The crossover point, where knowledge base maintenance cost exceeds fine-tuning cost, is not well-characterized for any specific use case.

**How do you evaluate knowledge base quality without ground truth?** Most benchmarks (LongMemEval, DMR, HotpotQA) test retrieval on fixed datasets with known answers. Production knowledge bases are dynamic, domain-specific, and lack ground truth annotations. LLM health checks share the same hallucination surface as the knowledge base itself.

**What is the right granularity for knowledge representation?** Napkin uses full markdown files. Graphiti uses entity-relationship triples. GraphRAG uses community summaries. A-MEM uses Zettelkasten-style atomic notes that update each other. These produce structurally incompatible outputs with no clear evidence for which granularity produces better agent reasoning across task types.

**Can self-improving knowledge bases stay coherent at scale?** The CORAL autoresearch loop and Karpathy's self-healing wiki work at small scale. As knowledge base size grows and agent count increases, coordination overhead and hallucination propagation risk compound. No production system has demonstrated reliable self-improvement at scale without human review gates.

**What is the scaling ceiling of compiled wikis?** Karpathy's pattern works at ~400K words. Where does it break? 1M words? 10M? The answer depends on context window sizes, which are a moving target. If frontier models reach 10M token context within 18 months, the ceiling may not matter for most use cases.

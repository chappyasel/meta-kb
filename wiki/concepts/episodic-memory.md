---
entity_id: episodic-memory
type: concept
bucket: agent-memory
abstract: >-
  Episodic memory for agents stores specific past events and interactions with
  temporal context, enabling recall of when and what happened — unlike semantic
  memory's timeless facts or procedural memory's how-to knowledge.
sources:
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/repos/bingreeky-memevolve.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - repos/caviraoss-openmemory.md
  - repos/gustycube-membrane.md
  - repos/letta-ai-lettabot.md
  - repos/mirix-ai-mirix.md
  - repos/nemori-ai-nemori.md
  - repos/tirth8205-code-review-graph.md
  - repos/uditgoenka-autoresearch.md
  - repos/wangyu-ustc-mem-alpha.md
related:
  - semantic-memory
  - retrieval-augmented-generation
  - model-context-protocol
  - letta
  - procedural-memory
  - vector-database
  - claude-code
  - openai
  - long-term-memory
  - reflexion
  - gpt-4
  - core-memory
  - openclaw
  - knowledge-graph
  - react
  - langchain
  - graphrag
  - graphiti
  - zep
  - gemini
  - context-management
  - hotpotqa
  - neo4j
  - community-detection
  - openmemory
  - hybrid-search
  - reinforcement-learning
  - humaneval
  - cypher
  - token-efficiency
last_compiled: '2026-04-08T22:54:28.717Z'
---
# Episodic Memory

## What It Is

Episodic memory is the record of specific past events, interactions, and experiences. In biological cognition, it answers "what happened when" — the personal history of a mind. In AI agents, it serves the same function: a retrievable log of what the agent experienced, observed, or was told across past sessions.

The concept maps directly from cognitive neuroscience. Endel Tulving's 1972 distinction between episodic and semantic memory has become foundational to how agent memory systems are architectured. Episodic memory stores events with their contextual frame (when, where, with whom). Semantic memory stores extracted facts stripped of that frame. The difference matters: "user said they prefer Python" is a semantic fact. "During session 14, user corrected my Java suggestion and said they exclusively use Python" is an episodic record.

Within [Agent Memory](../concepts/agent-memory.md), episodic memory sits alongside [Semantic Memory](../concepts/semantic-memory.md), [Procedural Memory](../concepts/procedural-memory.md), [Core Memory](../concepts/core-memory.md), and [Long-Term Memory](../concepts/long-term-memory.md) as a distinct storage tier with distinct decay characteristics and retrieval patterns.

## Why It Matters

Without episodic memory, an agent can only operate within its current context window. Each session starts from zero. The agent cannot distinguish a user it has worked with for months from a stranger. It cannot recall that a particular approach failed last week. It cannot notice that a user's preferences have evolved.

The practical gap is measurable. On the LongMemEval benchmark (115,000-token multi-session conversations), agents using no persistent memory hover around 55% accuracy on questions that require cross-session recall. Systems with well-implemented episodic memory push into the 63–71% range — a meaningful delta for tasks where getting context wrong means wrong answers. ([Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md))

For coding agents specifically, session continuity determines whether the agent knows your codebase conventions, remembers which approaches you've rejected, and can build on prior work rather than rediscovering it. [Hipocampus](../projects/hipporag.md) benchmarked this directly: no memory yields 0.8% accuracy on implicit recall tasks; episodic memory plus vector search reaches 17.3% — a 21x improvement on the same benchmark. ([Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md))

## How It Works

### Storage: What Gets Recorded

Episodic memory stores the raw event alongside its temporal and contextual metadata. The minimal representation is:

- **Content**: What was said or observed
- **Timestamp**: When it occurred
- **Source**: Who or what produced it
- **Session context**: What surrounded it

More sophisticated implementations add:
- **Provenance pointers**: Which facts were derived from this episode
- **Salience scores**: How important the episode was when recorded
- **Decay state**: How much the episode has faded

[Graphiti](../projects/graphiti.md)'s `EpisodicNode` (in `graphiti_core/nodes.py`) is the canonical implementation of this structure. Each raw message becomes a node with `valid_at`, `created_at`, and `source_description` fields. Every entity and relationship extracted from the conversation carries a pointer back to the originating `EpisodicNode` — a non-lossy chain that allows tracing any derived fact to the exact message that produced it. ([Source](../raw/deep/repos/getzep-graphiti.md))

[Letta](../projects/letta.md) implements a similar pattern through its MemGPT architecture: the in-context memory block holds recent interactions, while an archival storage layer preserves the full episode log. The agent explicitly manages what to move between tiers.

### The Three-Tier Pattern

Most production implementations converge on a three-tier hierarchy:

**Tier 1 (Hot/Always-loaded)**: A compressed summary of recent and high-salience episodes. Loaded into every context window. Typically 500–3000 tokens. [Hipocampus](../projects/hipporag.md) calls this ROOT.md — a "table of contents" topic index built from progressive compaction of raw episode logs. ([Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md))

**Tier 2 (Warm/On-demand)**: Raw episode logs for recent sessions, retrieved when triggered by content matching. Graphiti stores these as `EpisodicNode` objects linked into the knowledge graph. Letta stores them in archival memory.

**Tier 3 (Cold/Search)**: Compressed or indexed historical episodes, accessed via search rather than direct load. Hipocampus implements this as a compaction tree: daily → weekly → monthly → root, where each level summarizes its predecessors. Graphiti accesses this tier through hybrid search (semantic + BM25 + graph traversal).

### Retrieval: Finding the Right Episode

Episodic retrieval is harder than semantic retrieval because episodes are numerous and many share similar surface content. A user who asks "what were we working on last month?" cannot be served by a single keyword search.

Three retrieval strategies appear across implementations:

**Vector similarity search**: Embed the query, find episodes with similar embeddings. Works for topically related content but fails when the connection is temporal or structural. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) applied to episode storage is the most common implementation.

**Hybrid search**: Combine vector similarity with BM25 lexical search and graph traversal. Graphiti's three-signal approach achieves this in `graphiti_core/search/search.py`, running all three in parallel and fusing results via reciprocal rank fusion. The insight is that each signal captures different similarity types: BM25 for word overlap, cosine for semantic similarity, and BFS for contextual proximity through the graph structure. ([Source](../raw/deep/repos/getzep-graphiti.md))

**Hierarchical index lookup**: Instead of searching, maintain an always-loaded index that gives O(1) awareness of what topics exist. Hipocampus's ROOT.md Topics Index enables the agent to recognize relevant past episodes from a keyword match before any retrieval occurs — solving "unknown unknowns" where the agent doesn't know to query for a relevant episode. ([Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md))

[Hybrid Search](../concepts/hybrid-search.md) implementations consistently outperform pure vector approaches in empirical comparisons. The [HotpotQA](../projects/hotpotqa.md) benchmark and related multi-hop question-answering tasks reveal that facts requiring inference across multiple episodes particularly benefit from the graph traversal component.

### Temporal Structure

The most sophisticated episodic memory systems treat time as a first-class dimension rather than a metadata tag.

[Zep](../projects/zep.md)'s bi-temporal model (formalized in arXiv:2501.13956) maintains two independent timelines per fact:

- **Event time (T)**: When the fact was actually true in the world
- **Transaction time (T')**: When the system learned the fact

Four timestamps per edge: `t_valid`, `t_invalid`, `t'_created`, `t'_expired`. This answers two distinct questions: "What was true about Alice's employer in 2022?" and "What did our system believe about Alice's employer in 2022?" For most personal assistant use cases these coincide. In enterprise deployments handling historical data or corrections, they diverge significantly. ([Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md))

[OpenMemory](../projects/openmemory.md) implements a similar pattern at the fact level via `src/temporal_graph/temporal_fact_store.ts`: inserting a new fact for the same subject-predicate pair automatically closes the previous fact with a `valid_to` timestamp, maintaining a continuous fact timeline without deleting history. ([Source](../raw/deep/repos/caviraoss-openmemory.md))

The practical value shows in benchmarks. Zep achieves a 48.2% improvement on temporal-reasoning questions in LongMemEval versus the full-conversation baseline — the strongest gain across all question types, specifically because the bi-temporal model can answer "what changed between these sessions" rather than just "what is currently true."

### Decay and Consolidation

Biological episodic memory fades. AI episodic memory systems increasingly model this behavior, both for storage efficiency and to prevent old, irrelevant episodes from dominating retrieval.

OpenMemory implements dual-phase exponential decay in `src/ops/dynamics.ts`:

```
retention(t) = exp(-λ₁t) + Θ·exp(-λ₂t)
```

where λ₁ = 0.015 (fast initial forgetting, the Ebbinghaus curve) and λ₂ = 0.002 (slow residual decay of consolidated knowledge), with Θ = 0.4 as the consolidation coefficient. Episodes that survive initial fast decay are treated as consolidated. The system applies different decay rates to different memory sectors: episodic memories at λ = 0.015, semantic at 0.005, reflective at 0.001. ([Source](../raw/deep/repos/caviraoss-openmemory.md))

Hipocampus handles decay through hierarchical compaction rather than numeric decay rates. Raw daily logs are permanent and never deleted. But their contents get compressed into weekly, monthly, and root summaries — a structural form of forgetting where the specific event disappears but its pattern persists. The compaction tree's keyword-dense format is explicitly optimized for BM25 retrieval, ensuring important keywords appear in compressed summaries even when narrative detail is lost. ([Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md))

### Extraction: From Episodes to Knowledge

Raw episodes become useful only when their contents are accessible. The extraction pipeline transforms episode text into structured, queryable knowledge.

Graphiti's pipeline (in `graphiti_core/utils/maintenance/`) runs per episode:

1. Extract entities and relationships from the message, using the previous 4 messages as context
2. Resolve extracted entities against existing graph nodes (hybrid matching: cosine + BM25 + LLM cross-check)
3. Extract fact triples with temporal validity bounds
4. Resolve new edges against existing edges, invalidating contradicted facts
5. Update entity summaries to incorporate new information

The extraction prompts include extensive negative examples — what not to extract (pronouns, abstract concepts, bare kinship terms) — because LLM extractors without guidance produce noisy, unresolvable entities. Each LLM call uses Pydantic structured output for reliable parsing. ([Source](../raw/deep/repos/getzep-graphiti.md))

[Reflexion](../concepts/reflexion.md) contributes a relevant technique: having the LLM review its own extractions before committing them reduces hallucination rates in the extraction pipeline. Graphiti explicitly incorporates this "reflection" step in node extraction.

## Who Implements It

Most production agent memory systems implement episodic memory in some form:

**[Letta](../projects/letta.md) / MemGPT**: The original MemGPT paper framed the entire problem as managing a tiered memory system with explicit episodic storage. Letta exposes this as distinct memory blocks with agent-controlled paging.

**[Zep](../projects/zep.md) + [Graphiti](../projects/graphiti.md)**: The most architecturally complete open-source implementation. Episodes (Tier 1 graph nodes) serve as non-lossy source records from which semantic entities (Tier 2) and community summaries (Tier 3) are derived. Production API with hosted and self-hosted options.

**[OpenMemory](../projects/openmemory.md)**: Self-hosted, file-backed implementation with cognitive-science-inspired sector classification. No LLM required for core operations. Undergoing rewrite as of the source analysis.

**[LangChain](../projects/langchain.md)**: Provides `ConversationBufferMemory`, `ConversationSummaryMemory`, and integration with vector stores for episodic retrieval. Less opinionated about architecture than Graphiti; relies on user composition.

**[OpenAI](../projects/openai.md)**: ChatGPT's memory feature stores user facts across sessions. The implementation details are not public, but user-visible behavior suggests a semantic extraction approach rather than raw episode storage — the system retains facts ("user prefers Python") rather than events ("user said X in session Y on date Z").

**[Gemini](../projects/gemini.md)**: Similar product-level memory features with similar opacity.

**[Claude](../projects/claude.md)**: No cross-session episodic memory in the base model. [Claude Code](../projects/claude-code.md) implements session-level episodic memory through [CLAUDE.md](../concepts/claude-md.md) and project-specific instructions, but this is file-based persistence rather than automatic episodic recording.

**[ReAct](../concepts/react.md)**: The ReAct prompting pattern uses an explicit scratchpad as a within-session episodic record — the agent can refer back to previous observations in its thought-action-observation loop.

## Failure Modes

**The assistant-content gap**: Graphiti's LongMemEval results show a 17.7% *decrease* in accuracy on questions about what the *assistant* said (as opposed to what the user said). Entity extraction pipelines are biased toward user-stated facts. When an agent needs to recall its own prior reasoning, recommendations, or creative outputs, standard episodic memory fails. This is particularly damaging for multi-step tasks where the agent's own intermediate outputs are critical context. ([Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md))

**Extraction quality dependency**: The usability of stored episodes depends entirely on the extraction pipeline. Poor entity resolution produces duplicate entities (Alice vs. Alice Smith vs. the user's colleague Alice). LLMs hallucinate relationships that weren't present. Weak contradiction detection allows stale facts to persist alongside their corrections. The Graphiti pipeline mitigates this through hybrid matching and LLM cross-checks, but there is no deterministic solution.

**Cold start sparsity**: A new deployment has no episodes. The index is empty. RAG returns nothing. Hierarchical compaction produces trivial summaries. The system improves only after accumulating substantial history — typically days to weeks of interaction. For applications where users expect personalization immediately, this is a structural limitation.

**Context contamination from decay bugs**: If decay logic malfunctions (failure to expire stale facts, corrupted timestamps, decay parameter drift), retrieval surfaces outdated information as current. A user who changed jobs six months ago gets recommendations based on their old employer. This failure mode is invisible to the user until a specific wrong answer exposes it.

**Scale limits at the extraction layer**: Graphiti's per-episode pipeline requires 4–5 LLM calls. At 100 messages per day per user across 10,000 users, that is 4–5 million LLM calls daily just for ingestion. Cost and latency at this scale are not addressed in available documentation. Bulk ingestion methods skip edge invalidation for throughput, sacrificing temporal consistency under load.

## When Not to Use Episodic Memory

**Single-session tasks**: If the agent starts fresh each time and the task completes within one context window, episodic memory adds overhead without benefit. The extraction pipeline, storage writes, and retrieval calls all cost time and money.

**Short-lived deployments**: Episodic memory value compounds over time. A prototype or A/B test running for two weeks accumulates too little history for the retrieval layer to outperform simple context injection.

**High-security environments**: Episodic memory stores raw interaction content. In compliance-sensitive contexts (healthcare, legal, finance), retaining conversation episodes across sessions creates data governance obligations. The non-lossy storage approach that makes Graphiti accurate also makes it a liability when data must not persist.

**Domains where recent information is not more authoritative**: Standard implementations prioritize newer facts over older ones. For archival, legal, or scientific contexts where older records may be more authoritative than recent updates, naive temporal prioritization produces wrong answers.

## Unresolved Questions

**Cost at scale**: No published source provides per-user ingestion cost for a production deployment at thousands of concurrent users. The 4–5 LLM calls per episode in Graphiti, multiplied across real-world message volumes, may render graph-based episodic memory economically unviable for consumer applications.

**Evaluation standard**: The two main benchmarks (DMR and LongMemEval) measure conversational episodic recall but not enterprise data integration, long-horizon planning, or tool-use recall. The 17.7% regression on assistant-content retrieval suggests existing benchmarks don't cover the full problem space. No benchmark specifically tests whether episodic memory improves downstream task performance versus just retrieval accuracy.

**Cross-agent episode sharing**: Most implementations treat episodic memory as per-agent. In multi-agent systems, whether and how agents share episodic records is an open architecture question. Does a subagent's experience become part of the orchestrator's episodic memory? Current implementations do not address this.

**Compaction quality degradation**: Hierarchical compaction (Hipocampus's approach) produces quality that depends on the summarization LLM. Over long time horizons, compaction errors compound. There is no published analysis of information retention quality at 6-month or 1-year horizons, or techniques for detecting when a compaction layer has degraded beyond usefulness.

## Relationships to Adjacent Concepts

[Context Management](../concepts/context-management.md) determines how retrieved episodes enter the active context window. [Token Efficiency](../concepts/token-efficiency.md) governs compression tradeoffs in episode storage and retrieval. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is the most common mechanism for episode retrieval. [Knowledge Graph](../concepts/knowledge-graph.md) implementations like Graphiti store episodes as nodes with typed relationships to extracted entities. [Vector Database](../concepts/vector-database.md) systems ([Neo4j](../projects/neo4j.md), FAISS, Qdrant, ChromaDB) provide the similarity search substrate. [Reinforcement Learning](../concepts/reinforcement-learning.md) systems can treat past episodes as training data for policy improvement — the basis of [Reflexion](../concepts/reflexion.md). [Memory Evolution](../concepts/memory-evolution.md) systems like [MemEvolve](../projects/memevolve.md) analyze episode trajectories to generate improved memory architectures. [Community Detection](../concepts/community-detection.md) (label propagation in Graphiti, Leiden in GraphRAG) clusters episode-derived entities into higher-level summaries. [Temporal Reasoning](../concepts/temporal-reasoning.md) over episodes requires the bi-temporal indexing approach that Zep/Graphiti implements.

## Selection Guidance

Use Graphiti/Zep when: production deployment, multi-session enterprise use cases, facts that change over time, need for source tracing from any fact to its origin episode.

Use Letta when: the agent needs explicit, inspectable control over what moves between memory tiers, or you are building an agent that manages its own memory as part of its task.

Use Hipocampus when: coding agent or single-user IDE context, zero-infrastructure constraint, proactive surfacing of implicitly relevant past work matters more than structured fact retrieval.

Use LangChain's memory modules when: rapid prototyping, existing LangChain investment, simple session continuity without enterprise requirements.

Use no episodic memory when: single-session scope, compliance constraints, cost sensitivity at scale, or deployment lifetime too short to accumulate useful history.


## Related

- [Semantic Memory](../concepts/semantic-memory.md) — part_of (0.8)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — implements (0.6)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.4)
- [Letta](../projects/letta.md) — implements (0.7)
- [Procedural Memory](../concepts/procedural-memory.md) — part_of (0.7)
- [Vector Database](../concepts/vector-database.md) — implements (0.7)
- [Claude Code](../projects/claude-code.md) — implements (0.5)
- [OpenAI](../projects/openai.md) — implements (0.4)
- [Long-Term Memory](../concepts/long-term-memory.md) — part_of (0.8)
- [Reflexion](../concepts/reflexion.md) — implements (0.7)
- [GPT-4](../projects/gpt-4.md) — implements (0.4)
- [Core Memory](../concepts/core-memory.md) — part_of (0.6)
- [OpenClaw](../projects/openclaw.md) — implements (0.4)
- [Knowledge Graph](../concepts/knowledge-graph.md) — implements (0.5)
- [ReAct](../concepts/react.md) — implements (0.5)
- [LangChain](../projects/langchain.md) — implements (0.4)
- [GraphRAG](../projects/graphrag.md) — implements (0.4)
- [Graphiti](../projects/graphiti.md) — implements (0.6)
- [Zep](../projects/zep.md) — implements (0.6)
- [Gemini](../projects/gemini.md) — implements (0.3)
- [Context Management](../concepts/context-management.md) — part_of (0.6)
- [HotpotQA](../projects/hotpotqa.md) — part_of (0.4)
- [Neo4j](../projects/neo4j.md) — implements (0.4)
- [Community Detection](../concepts/community-detection.md) — implements (0.3)
- [OpenMemory](../projects/openmemory.md) — implements (0.4)
- [Hybrid Search](../concepts/hybrid-search.md) — implements (0.5)
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — implements (0.4)
- [HumanEval](../projects/humaneval.md) — part_of (0.3)
- Cypher — implements (0.4)
- [Token Efficiency](../concepts/token-efficiency.md) — implements (0.4)

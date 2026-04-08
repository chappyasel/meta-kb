---
entity_id: episodic-memory
type: concept
bucket: agent-memory
abstract: >-
  Episodic memory stores specific past events and interactions, giving agents
  recall of what happened when — distinct from factual knowledge by its
  temporal, autobiographical character.
sources:
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/gustycube-membrane.md
  - repos/caviraoss-openmemory.md
  - repos/uditgoenka-autoresearch.md
  - repos/nemori-ai-nemori.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - repos/letta-ai-lettabot.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/bingreeky-memevolve.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related:
  - semantic-memory
  - retrieval-augmented-generation
  - letta
  - procedural-memory
  - vector-database
  - openai
  - model-context-protocol
  - long-term-memory
  - reflexion
  - gpt-4
  - core-memory
  - claude-code
  - openclaw
  - react
  - langchain
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
last_compiled: '2026-04-08T02:38:40.938Z'
---
# Episodic Memory

## What It Is

Episodic memory stores discrete, time-stamped events: what happened, when, and in what context. For humans, this means autobiographical memory — "last Tuesday I met Alice at the conference." For AI agents, it means records of specific interactions, task executions, decisions made, and outcomes observed.

The term comes from cognitive psychologist Endel Tulving, who in 1972 distinguished episodic memory (autobiographical events with temporal context) from semantic memory (general knowledge without personal context). The distinction matters for agents because these two memory types have different retrieval patterns, different decay rates, and different roles in reasoning.

Episodic memory sits within the broader [Agent Memory](../concepts/agent-memory.md) taxonomy alongside [Semantic Memory](../concepts/semantic-memory.md) (facts and concepts), [Procedural Memory](../concepts/procedural-memory.md) (how-to knowledge), and [Core Memory](../concepts/core-memory.md) (always-present identity context). Understanding which type of memory to use — and when — is one of the central design questions in agent systems.

## Why It Matters

Without episodic memory, every agent interaction starts from zero. The agent cannot say "you mentioned last week that the API key expires in April" or "the last three times I attempted this deployment pattern, it failed at step 4." This forces users to re-establish context constantly and prevents agents from learning from their own history.

The practical gap shows up in benchmarks. On LongMemEval (115K-token conversations), systems with structured episodic retrieval ([Graphiti](../projects/graphiti.md)/[Zep](../projects/zep.md)) outperform full-context baselines by 18.5% on [GPT-4](../projects/gpt-4.md) while reducing context from 115K to ~1.6K tokens — a 90% latency reduction. The gains are largest on temporal-reasoning and multi-session questions, exactly the cases that require recalling specific past events.

On implicit recall benchmarks (the Hipocampus MemAware evaluation), agents with no memory score 0.8%. Vector search alone scores 3.4%. A structured episodic index (compaction tree + vector search) scores 17.3% — 21x better than no memory, 5x better than search alone.

These numbers are self-reported by the respective projects, not independently validated. But the directional claim — that structured episodic memory substantially outperforms raw retrieval — is consistent across multiple evaluations.

## How It Works

### The Core Problem: What to Store, How to Retrieve

Episodic memory in agents involves three subproblems: encoding (what to record from an interaction), storage (how to organize and persist it), and retrieval (how to surface relevant episodes given a current query).

**Encoding** is non-trivial. Raw conversation logs are verbose and redundant. Abstractive encoding (LLM-generated summaries) loses detail. The main approaches:

- *Verbatim storage*: Keep raw transcripts. High fidelity, high storage cost, poor retrieval precision.
- *Extractive compression*: Keep key sentences or utterances. Moderate fidelity, better token efficiency.
- *Abstractive summarization*: LLM generates compressed representations. Lossy but compact. Risk: the LLM drops what it considers unimportant, which may not match what the agent later needs.
- *Structured extraction*: Parse episodes into typed records (entities, relationships, events with timestamps). High precision retrieval, high encoding cost, loses unstructured detail.

Most production systems combine approaches: raw episodes as ground truth, extracted structure for fast retrieval, summaries for always-loaded context.

**Storage** approaches range from flat vector stores to hierarchical compaction trees to knowledge graphs:

- *Flat vector store*: Embed each episode, store in a [Vector Database](../concepts/vector-database.md). Simple to implement, $O(n)$ retrieval cost at scale, no structural understanding of relationships between episodes.
- *Hierarchical compaction*: Organize episodes into time-bucketed summaries (daily → weekly → monthly → root index). Hipocampus uses a 5-level tree where the root (~3K tokens) fits in every system prompt. Below-threshold compaction is verbatim (zero information loss); above-threshold uses LLM summarization.
- *Knowledge graph*: Extract entities and relationships from episodes, store as typed triples with temporal validity windows. [Graphiti](../projects/graphiti.md) implements a three-tier graph (episodes → semantic entities → communities) with bi-temporal indexing: edges carry both `valid_at`/`invalid_at` (when the fact was true in the world) and `created_at`/`expired_at` (when the system learned and later contradicted it).

**Retrieval** is where architectures diverge most sharply:

- *Semantic search*: Embed query, find nearest episodes. Good for topically similar content. Poor for cross-domain connections with no keyword overlap.
- *BM25/lexical search*: Keyword matching. Good recall on exact terms, poor on paraphrase.
- *Hybrid search*: BM25 + semantic combined with [Reciprocal Rank Fusion](../concepts/hybrid-search.md). Better than either alone.
- *Graph traversal*: Breadth-first search from anchor entities through relationship edges. Surfaces contextually adjacent episodes that don't share keywords with the query.
- *Always-loaded index*: Maintain a compact topic index in every system prompt. Zero search cost for initial triage; agent decides whether to drill deeper into specific episodes.

The Hipocampus MemAware benchmark makes the retrieval gap concrete: on "hard" questions (cross-domain, zero keyword overlap with the query), vector search scores 0.7%. A structured compaction tree scores 8.0% — 11x better. The structural insight: you cannot search for what you don't know to look for. An always-loaded topic index solves the "unknown unknowns" problem that pure retrieval cannot.

### Temporal Structure

Episodic memory is fundamentally temporal. Two design choices define how systems handle time:

**Bi-temporal modeling**: Graphiti's approach distinguishes event time (when something happened in the world) from transaction time (when the system recorded it). An edge might record that Alice worked at Acme from 2020 to 2023 (`valid_at=2020, invalid_at=2023`), entered the system in 2024 (`created_at=2024`), and was later contradicted (`expired_at=2025`). This supports time-travel queries: "what did we know about Alice's employer as of January 2023?" Neither naive overwrite nor simple append-log can answer this.

**Episode sequencing**: Linking consecutive episodes with `NEXT_EPISODE` edges enables reasoning about narrative arcs — not just "what happened" but "what happened after what." This is the structure required for questions like "what changed between my first and second attempts at this task?"

### Decay and Consolidation

Biological episodic memory decays over time, with emotionally salient or frequently recalled episodes consolidating into more durable representations. Several agent memory systems implement analogous mechanisms:

[OpenMemory](../projects/openmemory.md) uses sector-specific exponential decay. Episodic memories decay at lambda=0.015; semantic memories at lambda=0.005; reflective insights at lambda=0.001. A dual-phase formula models both rapid initial forgetting and slower long-term consolidation: `retention = exp(-0.015 * t) + 0.4 * exp(-0.002 * t)`. Memories also tier into hot/warm/cold based on recency and access frequency, with cold memories getting their vector representations compressed from 1536 to 64 dimensions.

[Letta](../projects/letta.md) (formerly MemGPT) handles decay through archival: memories that don't fit in active context get written to external storage and must be explicitly retrieved. No automatic decay, but explicit tiering.

Hipocampus handles consolidation through the compaction tree: raw daily logs are permanent and immutable, but get compressed into weekly → monthly → root summaries. The compression is progressive, not decay-based — old detail is preserved at lower levels of the tree, just not loaded by default.

### Episodic Memory as Training Signal

Beyond serving as context, episodic traces of agent execution serve as training data for self-improvement. [Reflexion](../concepts/reflexion.md) uses episodic records of failed attempts — the specific sequence of actions, observations, and errors — to generate verbal self-critiques that condition future attempts. [ReAct](../concepts/react.md) interleaves reasoning traces with action-observation episodes, making the episode log itself part of the agent's reasoning chain.

[MemEvolve](../projects/memevolve.md) extends this further: it analyzes trajectories from past task executions and uses an LLM to generate entirely new memory provider implementations. The episode log here is not just context for future tasks — it drives autonomous redesign of the memory system itself.

[Reinforcement Learning](../concepts/reinforcement-learning.md) research on agents (including work underlying [Voyager](../projects/voyager.md)) uses episodic traces as replay buffers for policy improvement. The structural requirement is similar: preserve enough detail from past episodes to identify what went wrong and why.

## Implementation Patterns

### Pattern 1: Append-Log + Vector Index

The simplest implementation. Every episode (message, observation, action) gets embedded and stored in a vector database. Retrieval is top-k semantic search. This works for short deployment windows and small episode counts. Degrades at scale: retrieval quality drops as the index grows, and there's no mechanism to distinguish important from routine episodes.

[LangChain](../projects/langchain.md) conversation buffer memory implements this pattern. [ChromaDB](../projects/chromadb.md) is the typical backing store.

**When to use**: Prototyping, short-lived agents, fewer than a few thousand episodes.

### Pattern 2: Tiered Storage with Active/Archive Split

[Letta](../projects/letta.md)'s MemGPT architecture divides memory into in-context (always loaded) and archival (retrieved on demand). The agent uses explicit memory management tools (`archival_memory_search`, `archival_memory_insert`) to move content between tiers. This gives the agent direct control but requires the agent to correctly predict what it will need later — an assumption that often fails in practice.

**When to use**: Agents needing explicit memory management, long-running assistants, cases where the agent domain is well-defined enough to predict retrieval needs.

### Pattern 3: Hierarchical Compaction Tree

Hipocampus's approach: raw logs are permanent, but get progressively summarized into a topic index that fits in every system prompt. The agent sees the index at zero search cost and drills into specific logs when needed. Key numbers from the project: raw logs at the daily level, summarized at weekly/monthly, with the root index (~3K tokens) achieving 90% prompt cache hit rates on Claude.

**When to use**: Long-running developer assistants, coding agents that need cross-project context, cases where "what topics have I ever worked on" matters as much as specific episode retrieval.

### Pattern 4: Knowledge Graph with Temporal Edges

[Graphiti](../projects/graphiti.md)/[Zep](../projects/zep.md) extract entities and typed relationships from episodes and store them as a graph with bi-temporal validity windows. Episodes are preserved as ground-truth nodes; extracted facts are separate entity edges. Retrieval combines semantic similarity, BM25, and graph traversal. Cross-encoder reranking adds quality at the cost of latency.

This is the highest-fidelity approach for relational and temporal queries. It also requires 4-5 LLM calls per episode ingestion and a graph database backend ([Neo4j](../projects/neo4j.md), FalkorDB, Kuzu).

**When to use**: Enterprise applications needing temporal reasoning, multi-user systems where user facts evolve over time, agents that must track relationships between entities across many interactions.

### Pattern 5: Cognitive Sector Classification

[OpenMemory](../projects/openmemory.md) classifies episodes into five cognitive sectors (episodic, semantic, procedural, emotional, reflective) using regex pattern matching, applies sector-specific decay rates, and runs automatic reflection by clustering similar memories into higher-order insights. The composite retrieval score weights semantic similarity (0.35), token overlap (0.20), graph connectivity (0.15), recency (0.10), and tag matching (0.20).

**When to use**: Conversational agents where memory salience varies by type, long-running personal assistants, cases where some memories (factual knowledge) should persist longer than others (specific event details).

## Who Implements It

- **[Letta](../projects/letta.md)**: MemGPT/Letta pioneered tiered episodic memory for LLMs, with explicit agent-controlled archival and retrieval.
- **[Graphiti](../projects/graphiti.md)**: Knowledge graph implementation with bi-temporal indexing, community detection, and hybrid search.
- **[Zep](../projects/zep.md)**: Production-oriented episodic memory layer built on Graphiti; the source for the LongMemEval benchmarks cited above.
- **[OpenMemory](../projects/openmemory.md)**: Cognitively-inspired implementation with sector classification, dual-phase decay, and automatic reflection.
- **[Reflexion](../concepts/reflexion.md)**: Uses episodic failure records as self-critique signals.
- **[Claude Code](../projects/claude-code.md)** (via Hipocampus plugin): Hierarchical compaction tree as a zero-infrastructure episodic memory for coding agents.
- **[OpenClaw](../projects/openclaw.md)**: Integrates the same Hipocampus compaction architecture.
- **[MemEvolve](../projects/memevolve.md)**: Treats episode trajectories as training signal for evolving memory system implementations.

## Failure Modes

**The unknown unknowns problem**: Pure retrieval-based episodic memory requires knowing what to search for. If you don't know a past episode is relevant, you won't query for it. The Hipocampus benchmarks show this clearly: hard cross-domain questions (no keyword overlap) achieve 0.7% recall with vector search vs. 8.0% with a structured topic index. The fix is an always-loaded index that gives the agent visibility into what it has stored before it decides whether to search.

**Extraction lossy for assistant-generated content**: Graphiti/Zep's entity extraction pipeline is biased toward user-stated facts. On LongMemEval's "single-session-assistant" questions (what did the assistant say or recommend?), Zep shows a -17.7% regression vs. full-context baseline. Agents whose own prior outputs are important context — recommendations, calculations, code — will find graph-based episodic memory particularly weak here.

**Scale cost of structured ingestion**: Knowledge graph approaches require 4-5 LLM calls per episode. At 1000 episodes/day, this is a substantial operational cost that flat vector stores avoid. Projects like Graphiti recommend background ingestion (FastAPI background tasks, Celery) rather than synchronous per-interaction processing.

**Contradiction blindness in flat stores**: Append-log and flat vector stores accumulate contradictory episodes without resolution. If an agent records "Alice's deadline is Friday" in week 1 and "Alice pushed her deadline to next month" in week 3, both episodes exist with equal retrieval weight. Systems with temporal edge invalidation (Graphiti's `expired_at` mechanism) handle this; simpler systems don't.

**Parameter tuning without empirical grounding**: Decay rates, sector weights, scoring coefficients, and compaction thresholds in most implementations are hand-tuned rather than empirically derived from actual agent performance data. OpenMemory's lambda values, Hipocampus's tier thresholds, and Graphiti's concurrency limits all reflect educated guesses that may be poorly suited to specific deployment contexts.

## When Not to Use Episodic Memory

**Short-lived, single-session agents**: If each agent invocation is independent and users don't expect continuity, episodic memory adds cost and complexity without benefit.

**Well-structured, queryable data already exists**: If the agent's history lives in a database with proper schema and query interface, add a tool to query it rather than re-implementing episodic storage with less reliable retrieval.

**Very high ingestion volume**: At thousands of episodes per hour, even vector-only storage requires careful index management. Knowledge graph approaches (4-5 LLM calls per episode) become operationally expensive. Batch processing with periodic indexing may be more practical than real-time episodic recording.

**When semantic memory suffices**: If what matters is persistent facts about entities (user preferences, project state, domain knowledge) rather than the specific events that established those facts, [Semantic Memory](../concepts/semantic-memory.md) with entity-level storage is simpler and sufficient.

## Unresolved Questions

**Evaluation standards**: There is no widely-adopted benchmark specifically for episodic memory retrieval in agents. LongMemEval and DMR test different aspects; MemAware is proprietary to Hipocampus. Without shared benchmarks, claims about episodic memory quality across systems are difficult to compare.

**Optimal compaction granularity**: How much to compress, at which time boundaries, and what to preserve verbatim vs. summarize are all open design questions. The Hipocampus MemAware results show that expanding the root index from 3K to 10K tokens improves easy questions from 26% to 34% but hard questions plateau at 8.0% regardless — suggesting token budget isn't the binding constraint for the hardest recall problems.

**Multi-agent episodic sharing**: All current implementations treat episodic memory as per-agent or per-user. There is no standard mechanism for agents to share or merge episodic records, verify provenance of episodes from other agents, or resolve conflicts between their respective histories.

**Cost at scale**: None of the major episodic memory projects publish operational cost data at production scale (millions of episodes, concurrent users). The per-episode LLM call cost for structured extraction may be prohibitive at enterprise scale in ways that benchmarks on thousands of episodes don't reveal.

## Related Concepts and Alternatives

- [Semantic Memory](../concepts/semantic-memory.md): Factual knowledge without temporal context. Use when what matters is persistent facts, not the specific events that established them.
- [Long-Term Memory](../concepts/long-term-memory.md): The broader category encompassing both episodic and semantic memory persisted beyond the context window.
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): General pattern for retrieving stored content into context. Episodic memory is a specialization with temporal structure.
- [Hybrid Search](../concepts/hybrid-search.md): The retrieval backbone for most episodic memory systems.
- [Reflexion](../concepts/reflexion.md): Uses episodic failure records as verbal self-critique signals for iterative improvement.
- [Context Management](../concepts/context-management.md): The broader problem of deciding what to load into an agent's active context window at any given moment.
- [Memory Evolution](../concepts/memory-evolution.md): Systems like MemEvolve that use episodic traces to improve the memory system itself.
- [Temporal Reasoning](../concepts/temporal-reasoning.md): The reasoning capability that episodic memory with proper temporal structure enables.

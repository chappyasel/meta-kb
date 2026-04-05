---
entity_id: agent-memory
type: concept
bucket: agent-memory
abstract: >-
  Agent memory: the systems enabling AI agents to store and retrieve information
  across interactions, spanning in-context, external retrieval, and structured
  knowledge representations with tradeoffs between recall precision, cost, and
  temporal awareness.
sources:
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/getzep-graphiti.md
  - repos/osu-nlp-group-hipporag.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/zorazrw-agent-workflow-memory.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/thedotmack-claude-mem.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/mem0ai-mem0.md
  - repos/infiniflow-ragflow.md
  - repos/letta-ai-lettabot.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/mem0ai-mem0.md
related:
  - Claude Code
  - Retrieval-Augmented Generation
  - Episodic Memory
  - OpenClaw
  - Knowledge Graph
  - Mem0
  - Mem0
  - Cognitive Architecture
  - MemEvolve
  - A-MEM
  - Git as Memory
  - Agent Workflow Memory
  - Organizational Memory
  - Case-Based Reasoning
  - Ebbinghaus Forgetting Curve
  - LongMemEval
  - LoCoMo
  - Core Memory
last_compiled: '2026-04-05T20:27:47.801Z'
---
# Agent Memory

## What It Is

Agent memory encompasses every mechanism that lets an AI agent access information beyond its current context window. This spans immediate conversation history, retrieved documents, extracted facts stored in vector databases, and structured knowledge graphs with temporal validity windows.

The core problem: LLMs are stateless. Each call starts fresh. Building agents that accumulate knowledge, personalize to users, or reason about their own past decisions requires external machinery to simulate continuity.

Memory is not a single system. It is a collection of architectural choices, each solving a different part of the problem: what to remember, when to retrieve it, how to represent it, and when to forget or update it.

## Memory Taxonomy

The field converges on four functional categories, though implementations blur these distinctions:

**Episodic memory** stores specific past interactions. A session log, a conversation history, a record of what the agent did and when. Retrieval is typically chronological or similarity-based against the query.

**Semantic memory** stores general facts distilled from experience. "User prefers Python over JavaScript." "Company policy prohibits refunds after 30 days." These are extracted propositions, not raw transcripts.

**Procedural memory** stores how-to knowledge: strategies, skills, and heuristics learned from prior successes and failures. ACE's Skillbook is a direct implementation: a persistent collection of strategies a Reflector agent extracts from execution traces and a SkillManager curates over time.

**Core memory** (or working memory) is the always-loaded context the agent carries into every interaction: user profile, active task state, ongoing decisions. Systems like Hipocampus's ROOT.md embody this: a ~3K token topic index auto-loaded every session that gives the agent O(1) awareness of everything it has ever discussed.

In practice, these categories map onto a storage hierarchy:

- **Hot (in-context):** Always loaded. Core facts, active task state, topic index. Constrained by token budget. Retrieved at zero cost.
- **Warm (on-demand retrieval):** Retrieved when the agent recognizes relevance. Daily logs, knowledge base entries, strategy files.
- **Cold (search-triggered):** Accessed only via explicit search. Full conversation archives, vector databases, knowledge graphs.

## How Retrieval Works

Three retrieval mechanisms dominate production systems, each with different recall/precision tradeoffs:

**Embedding similarity (vector search):** Embed the query, find nearest stored vectors. Fast, generalizes across paraphrases, works for known unknowns. Fails for unknown unknowns — queries that don't mention the relevant topic. Hipocampus's MemAware benchmark puts BM25+vector search at 3.4% on implicit context questions, barely above 0.8% for no memory at all. Search cannot find connections that no query would form.

**BM25 (keyword search):** Sparse retrieval based on token overlap. Complementary to vector search — catches exact terminology that embeddings sometimes miss, especially for code, proper nouns, and domain-specific terms.

**Graph traversal:** Navigate entity-relationship structures. When you need to answer "what contracts involve this vendor and have renewal dates this quarter," traversal beats similarity search. Graphiti's temporal knowledge graph stores facts with validity windows (when they became true, when superseded), enabling point-in-time queries: "what did we know about X on March 1st?"

**Topic index (hierarchical):** Hipocampus's key contribution: maintain a compressed index of all past topics, auto-loaded as hot memory. The agent sees every topic at the start of every session and can recognize relevance without issuing a search query. This solves the unknown unknowns problem that kills pure retrieval systems on cross-domain recall tasks.

## How Writing Works

Memory ingestion is where most complexity lives.

**Extract-then-reconcile (Mem0):** A two-pass LLM pipeline. First pass extracts atomic facts from the conversation. Second pass diffs those facts against existing vector-stored memories to decide ADD/UPDATE/DELETE/NONE per fact. Integer ID mapping prevents UUID hallucination during the reconciliation LLM call. The entire intelligence of the system lives in two prompts: the extraction prompt determines what gets remembered; the reconciliation prompt determines whether new information overwrites, supplements, or ignores existing facts. Silent failure modes: JSON parse failures produce no memory updates with no error surfaced to the caller; hallucinated IDs cause per-memory KeyErrors that are logged but not propagated.

**Temporal graph ingestion (Graphiti):** ~4-5 LLM calls per episode. Entity extraction, relation establishment, graph search, deletion checking, execution. Facts get explicit validity windows. When information changes, old facts are invalidated rather than deleted, enabling temporal queries and contradiction detection. Tradeoff: significantly higher per-ingestion cost and Neo4j as a hard dependency.

**Compaction trees (Hipocampus):** Below threshold, source files are copied verbatim. Above threshold, an LLM generates keyword-dense summaries. The hierarchy runs Raw → Daily → Weekly → Monthly → Root. Memory types control compaction behavior: `user` and `feedback` entries survive indefinitely; `project` entries compress after completion; `reference` entries get staleness markers after 30 days.

**Skill extraction (ACE):** A Reflector agent analyzes execution traces, writes and runs Python code in a sandbox to find patterns, and distills actionable strategies. A SkillManager then curates the Skillbook — adding, refining, and removing strategies. The recursive reflector's code execution is the key differentiator: it can search programmatically for error patterns rather than summarizing in a single pass.

## The Unknown Unknowns Problem

The hardest problem in agent memory: knowing that relevant context exists when nobody asked about it.

If a developer asks an agent to "refactor this API endpoint for the new payment flow," and three weeks ago the agent helped decide on a token bucket rate limiting strategy, no query about "payment flow" will surface that rate limiting discussion. Search requires a query; a query requires suspecting that relevant context exists.

Hipocampus's MemAware benchmark quantifies this gap. On "hard" questions (cross-domain, zero keyword overlap between the question and the relevant past context): no memory scores 0.7%, vector search scores 0.7%, Hipocampus scores 8.0%. The topic index is what closes this gap — the agent sees the rate limiting entry in ROOT.md when it reviews the session context, before any search query is formed.

## Temporal Memory

Standard vector stores snapshot the present state of facts. Real-world knowledge changes: a user's job changes, a company policy updates, an API endpoint moves.

Graphiti's temporal context graphs address this with bi-temporal tracking: each fact has a `valid_from` and `valid_to` window. When new information contradicts an existing fact, the old fact is invalidated (not deleted) and the new fact is written with the current timestamp as its start. This enables:

- Point-in-time queries: "what was true about X on date Y?"
- Contradiction detection without losing history
- Provenance tracing: every derived fact links back to the source episode that produced it

The tradeoff is 4-5 LLM calls per ingestion and Neo4j (or FalkorDB/Kuzu/Neptune) as infrastructure. Graphiti's paper reports 94.8% on the DMR benchmark, though this is self-reported.

## Failure Modes

**Retrieval without awareness:** Pure RAG systems can only recall what you ask for. If the agent doesn't know to search, the memory doesn't exist operationally. Every system that relies solely on query-triggered retrieval has this failure mode.

**Unbounded growth:** Most vector-based systems accumulate memories monotonically. Mem0 has no compaction or pruning — the vector store grows indefinitely. At scale, retrieval quality degrades as the store fills with outdated or redundant facts.

**LLM-dependent quality:** Systems that use LLMs for extraction and reconciliation inherit LLM failure modes. JSON parse failures in Mem0's reconciliation step produce silent no-ops. Hallucinated IDs cause silent per-memory drops. The quality of what gets remembered is entirely a function of prompt engineering.

**Concurrency races:** Multiple concurrent `memory.add()` calls for the same user can race: both read existing memories, both decide to ADD the same fact, producing duplicates. Vector stores typically lack the transactional semantics needed to prevent this.

**Context bleeding:** Session-scoped memories persist until explicitly cleared. Stale context from previous tasks bleeds into subsequent ones if the application doesn't manage session lifecycle.

**Graph soft-delete accumulation:** Graphiti's soft-deleted relationships (`valid = false`) are never garbage-collected. Over time the graph accumulates invalidated edges that slow queries.

## Benchmarks

Performance claims in this space are mostly self-reported and should be treated cautiously.

**Mem0** reports +26% accuracy over OpenAI Memory on LOCOMO, 91% faster responses, 90% fewer tokens vs full-context. These come from their own arXiv paper (2504.19413). No benchmark scripts exist in the repository. The token reduction claim is plausible for any selective retrieval system; the accuracy claim requires the LOCOMO evaluation to verify.

**Hipocampus** reports 21x improvement over no memory and 5x over search alone on their MemAware benchmark (900 implicit context questions across 3 months of conversation history). This is an internal benchmark on an internal evaluation set, but the methodology (implicit context questions with cross-domain queries) is well-designed for measuring the specific problem it claims to solve.

**Graphiti** reports 94.8% on DMR benchmark vs MemGPT's 93.4%, from their arXiv paper (2501.13956). Self-reported.

**ACE** reports 2x consistency improvement (pass^4) on Tau2 airline benchmark with 15 learned strategies, no reward signals. The Tau2 benchmark is an established third-party evaluation from Sierra Research.

## Implementation Tradeoffs

| Dimension | Mem0 | Graphiti | Hipocampus | ACE |
|---|---|---|---|---|
| Ingestion cost | 2+ LLM calls | 4-5 LLM calls | LLM for compaction | LLM for reflection |
| Retrieval | Vector similarity | Hybrid + graph traversal | Topic index + search | Skillbook injection |
| Temporal reasoning | No | Yes (validity windows) | Partial (staleness markers) | No |
| Infrastructure | Vector DB | Graph DB required | Files only | Flat files |
| Agent control | Automatic | Automatic | Automatic | Skill injection |
| Unknown unknowns | No | Partial | Yes (ROOT.md) | Partial |

## When to Use What

**Use Mem0** when you need drop-in personalization for an existing LLM application and don't want to manage additional infrastructure. The two-pass pipeline handles extraction and deduplication automatically. Accept that quality depends entirely on prompt engineering and silent failures are possible.

**Use Graphiti** when your agent operates on facts that change over time and you need to reason about when something was true, not just whether it's currently true. Enterprise knowledge management, policy tracking, customer relationship evolution. Requires operating a graph database.

**Use a topic-index approach (Hipocampus)** when agents need to make connections across sessions without explicit prompting — code agents, research assistants, long-running personal assistants where unknown unknowns are the main failure mode. Works without any vector infrastructure.

**Use procedural memory (ACE)** when you're running repeated tasks where failure patterns are consistent and learnable. Browser automation, customer support flows, multi-step API workflows. Less relevant for one-off tasks or highly variable inputs.

**Do not use external memory at all** for stateless APIs, single-turn queries, or contexts where users expect data isolation (multi-tenant systems where cross-user contamination is a compliance concern).

## Unresolved Questions

Memory governance at organizational scale: who owns shared memories, who can modify them, what happens when agents write contradictory facts simultaneously — none of the major systems have solved this. Mem0's organizational memory tier depends on "owner maintenance," which doesn't scale.

Evaluation methodology: every benchmark in this space is either self-reported or measures a proxy task. There is no agreed-upon standard for measuring the "unknown unknowns" recall problem that Hipocampus targets. MemAware and LOCOMO measure different things; comparing them is not straightforward.

Cost models at scale: Mem0's two LLM calls per `memory.add()` cost real money. At 1M conversations per day, the memory layer can cost more than the actual task. None of the documentation addresses cost projections at production scale.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — The retrieval substrate most memory systems build on
- [Episodic Memory](../concepts/episodic-memory.md) — Interaction-history storage
- [Core Memory](../concepts/core-memory.md) — Always-loaded agent context
- [Knowledge Graph](../concepts/knowledge-graph.md) — Structured relational memory representation
- [Ebbinghaus Forgetting Curve](../concepts/ebbinghaus-forgetting-curve.md) — The cognitive science basis for memory decay and spaced recall

## Related Projects

- [Mem0](../projects/mem0.md) — Two-pass LLM extraction pipeline over vector store ([Source](../raw/deep/repos/mem0ai-mem0.md))
- [Graphiti](../projects/graphiti.md) — Temporal knowledge graph with validity windows ([Source](../raw/repos/getzep-graphiti.md))
- [Hipocampus](../projects/hipocampus.md) — File-based 3-tier memory with topic index ([Source](../raw/repos/kevin-hs-sohn-hipocampus.md))
- [ACE](../projects/agentic-context-engine.md) — Procedural skill learning from execution traces ([Source](../raw/repos/kayba-ai-agentic-context-engine.md))
- [LongMemEval](../projects/longmemeval.md) — Benchmark for long-context memory evaluation
- [LoCoMo](../projects/locomo.md) — Long-context conversation modeling benchmark

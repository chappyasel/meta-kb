---
entity_id: context-graph
type: concept
bucket: context-engineering
abstract: >-
  A context graph is a queryable, time-aware graph of entities, relationships,
  and decision traces that gives AI agents structured context beyond flat
  retrieval — distinguished by temporal validity windows and provenance back to
  source data.
sources:
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/getzep-graphiti.md
  - papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
related:
  - Execution Traces
  - Context Engineering
last_compiled: '2026-04-05T20:38:03.777Z'
---
# Context Graph

A context graph is a structured representation of entities, their relationships, and the decisions that connect them — indexed by time and traced back to source evidence. The term appears in two related but distinct usages in LLM systems work: as an architectural pattern for agent memory and knowledge management, and as a broader organizational concept for capturing decision traces that traditional systems of record never stored.

Both usages share the same core insight: flat retrieval (document chunks, chat history, scalar embeddings) loses the relational and temporal structure that agents need to reason reliably across multiple turns and across system boundaries.

## What It Is

A context graph contains four classes of objects:

**Entities (nodes)** — people, products, policies, accounts, or any concept the system tracks. Entities carry summaries that evolve as new information arrives; old summaries are not overwritten but versioned.

**Facts and relationships (edges)** — typed triplets of the form `(Entity → Relationship → Entity)` with explicit validity windows. "Kendra loves Adidas shoes" has a `valid_from` timestamp and optionally a `valid_until`. When a fact changes, the old edge is invalidated rather than deleted.

**Episodes (provenance)** — the raw ingested data that produced each entity or relationship. Every derived fact traces back to an episode. This gives agents a path from current belief back to source evidence.

**Decision traces** — the reasoning that connected context to action: what inputs were gathered, which policy applied, who approved, what exception was granted, why a particular structure was chosen. Traditional systems of record store the outcome ("20% discount approved"). Context graphs store the full trace ("VP exception granted citing three SEV-1 incidents and a prior precedent from Q3").

The combination of temporal validity windows and decision trace provenance separates context graphs from knowledge graphs and from vector stores. A knowledge graph typically stores current state without expiration logic. A vector store returns ranked chunks without relational structure. Context graphs add the temporal and causal layer that both lack.

## How They Work

### Temporal Fact Management

When a new episode arrives, the system must reconcile it with existing facts. If the new information contradicts an existing edge, the old edge gets an `invalidated_at` timestamp and the new fact gets a fresh `valid_from`. Neither is deleted. Querying the graph at time `T` returns only facts valid at `T`, enabling historical queries ("what did the agent believe about this customer last Tuesday?") that flat retrieval cannot answer.

This bi-temporal tracking — distinguishing when a fact became true in the world versus when it was recorded in the system — supports audit, debugging, and exception replay.

### Hybrid Retrieval

Querying a context graph typically combines three signals:

- **Semantic search** over entity and fact embeddings, finding conceptually relevant nodes
- **Keyword search** (BM25 or similar), finding exact-match matches on names, identifiers, and technical terms
- **Graph traversal**, following typed edges from a seed entity to find related facts by relationship structure

Graphiti (the open-source implementation from Zep, 24k+ GitHub stars as of April 2026) implements all three and reranks results using cross-encoder scoring. The combination enables sub-second retrieval latency while capturing relational context that semantic search alone misses. [Source](../raw/repos/getzep-graphiti.md)

### Incremental Construction

Context graphs are built incrementally, not in batch. New episodes integrate immediately without recomputing the full graph. This matters for agents that operate in real time: the graph reflects the current state of the conversation or workflow, not a stale snapshot from the last ETL job.

### Ontology: Prescribed and Learned

Developers can define entity and edge types upfront using Pydantic models (prescribed ontology), or let the system infer structure from incoming data (learned ontology). In practice, high-value entity types with known schemas (accounts, products, policies) benefit from explicit definition; emergent patterns in unstructured data benefit from learned extraction.

## How Context Graphs Relate to Agentic Computation Graphs

A related but distinct concept from the multi-agent systems literature is the **agentic computation graph (ACG)** — the graph of LLM calls, tool invocations, and data dependencies that describes how a workflow executes. [Source](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)

The survey paper by Yue et al. (2026) distinguishes three objects that practitioners conflate:

1. **Workflow templates** — reusable designs specifying which agents exist and how they depend on each other, designed offline
2. **Realized graphs** — run-specific instantiations of a template, potentially modified per-query (agents pruned, edges added)
3. **Execution traces** — what actually happened: the sequence of LLM calls, tool invocations, and data flows, which may differ from the realized graph due to failures and retries

This three-level separation maps onto the context graph concept: execution traces (level 3) are the raw episodes that context graphs ingest. Realized graphs (level 2) encode the context available at decision time. The context graph persists both across runs so agents can query precedent.

The optimization methods the survey covers — MCTS-based template search (AFlow), RL-trained meta-agents (FlowReasoner), in-execution topology editing (MetaGen) — all treat workflow structure as a first-class optimization variable. Context graphs provide the persistent memory layer that makes such optimization tractable across runs, because the agent can retrieve prior decision traces rather than starting from scratch each time.

See [Execution Traces](../concepts/execution-traces.md) and [Context Engineering](../concepts/context-engineering.md) for the broader framing.

## The Organizational Framing

Beyond agent memory, the concept has attracted attention as an organizational infrastructure pattern. [Source](../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md)

The argument runs as follows: enterprise systems of record (CRM, ERP, HRIS) store current state. They tell you what the opportunity looks like now. They do not store the decision context that produced that state — the VP exception, the precedent from last quarter, the cross-system synthesis that justified an unusual structure.

This decision context currently lives in Slack threads, Zoom calls, and people's heads. Every time a similar situation arises, the organization re-learns the same exception logic instead of querying a prior trace. Agents running cross-system workflows hit this wall: they can access the data but not the reasoning about how to apply it.

A context graph that captures decision traces — not just what happened but why it was allowed to happen — becomes what Jaya Gupta and Ashu Garg call "a queryable record of how decisions were made." [Source](../raw/tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md) Over time, exceptions become searchable precedent. Automated decisions add new traces, and the graph compounds.

The coordination cost argument [Source](../raw/tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md) frames organizational hierarchy as a lossy compression algorithm: each management layer compresses the reality of their team into a summary that fits a 30-minute meeting. A context graph replaces this with direct access to decision traces — lower latency, higher bandwidth, lossless. This is the basis for claims that context graphs are to the 2030s what databases were to the 2000s.

These claims are directionally plausible but speculative. No large-scale deployments have published rigorous evidence that context graph-backed agents outperform simpler architectures on organizational coordination tasks.

## Strengths

**Temporal precision** — agents can query what was true at a specific time, enabling historical reasoning and audit that flat retrieval cannot support.

**Relational traversal** — following typed edges across entity relationships surfaces context that embedding similarity misses. "All customers who received a similar exception last quarter" requires graph traversal, not nearest-neighbor search.

**Provenance to source** — tracing a current belief back to the episode that produced it lets agents and humans verify, audit, and override specific facts without invalidating unrelated knowledge.

**Incremental updates** — new information integrates without full recomputation, making context graphs viable for real-time agent workflows.

## Limitations

**LLM-dependent extraction quality** — the quality of the graph depends on LLM extraction of entities, relationships, and decision traces from unstructured data. Extraction failures propagate silently. Graphiti requires models that support structured output (OpenAI, Gemini); smaller models or models without structured output support produce schema violations that break ingestion. [Source](../raw/repos/getzep-graphiti.md)

**Graph database dependency** — running Graphiti requires Neo4j, FalkorDB, Kuzu, or Amazon Neptune. This is a non-trivial operational dependency. Teams without graph database experience face a learning curve. The self-hosted path requires managing graph storage, indices, and query performance separately from application infrastructure.

**Temporal reasoning requires explicit modeling** — the bi-temporal model (world time vs. record time) is powerful but puts modeling burden on the developer. Getting validity windows right for complex domains (policy changes with retroactive effect, corrections to historical records) requires careful schema design.

**Decision trace capture requires being in the execution path** — for the organizational use case, capturing decision traces requires instrumenting the workflow layer at commit time. Systems that receive data via ETL after the fact cannot reconstruct the decision context. This is a real architectural constraint, not just a technical detail.

**Scaling behavior is uncharacterized** — most published results involve small graphs (hundreds to thousands of entities). Behavior at enterprise scale (millions of entities, thousands of concurrent agent sessions) is not well documented.

## When Not to Use It

Use a simpler retrieval architecture when:

- The domain is static and facts do not change over time
- Relationships between entities are irrelevant to the task
- The team lacks capacity to operate a graph database
- Queries are purely semantic (find documents similar to this query) with no need for relational or temporal structure
- The task completes in a single turn with no need to recall prior interactions

## Unresolved Questions

**Contradiction resolution policy** — when two sources assert conflicting facts about the same entity, what determines which wins? Graphiti documents automatic invalidation but the conflict resolution logic for simultaneous contradictions from equally-trusted sources is not publicly specified.

**Cost at scale** — graph construction via LLM extraction is expensive. At high episode ingestion rates, extraction costs can dominate. There are no published cost benchmarks for production-scale deployments.

**Organizational adoption** — the decision trace use case requires organizations to treat agent reasoning as a first-class artifact, change how approvals are routed, and instrument workflows they currently handle in Slack. The technical architecture is tractable; the organizational change management is not.

**Governance and access control** — who can query which decision traces? Context graphs that contain approval histories, exception grants, and executive reasoning are sensitive. Access control patterns for graph-structured knowledge with mixed sensitivity levels are not standardized.

## Alternatives

| Use case | Alternative | When to prefer it |
|---|---|---|
| Simple conversational memory | In-context window or vector store | Short interactions, no temporal or relational requirements |
| Static document retrieval | Standard RAG | Documents don't change, no entity relationships needed |
| Structured agent state | Key-value store or relational DB | State is flat and doesn't require graph traversal |
| Workflow dependency tracking | ACG frameworks (LangGraph, AFlow) | You need to optimize workflow structure, not persist decision history |

**GraphRAG** (Microsoft) uses graph structure for document summarization rather than temporal fact management. It processes data in batch, lacks validity windows, and targets document-centric retrieval rather than agent memory. Prefer Graphiti/context graphs when data changes frequently and temporal history matters.

**Mem0** provides simpler agent memory without explicit graph structure. Lower operational overhead, suitable when relational traversal is not needed.

## Implementations

- **Graphiti** (Zep, open source, Apache-2.0) — the most complete open-source context graph implementation. Python, requires Neo4j/FalkorDB/Kuzu/Neptune, supports OpenAI/Gemini/Anthropic/Ollama. MCP server available for Claude and Cursor integration. 24k+ GitHub stars (self-reported). [Source](../raw/repos/getzep-graphiti.md)
- **Zep** — managed cloud service wrapping Graphiti, adds governance, sub-200ms retrieval SLA, multi-tenant support, and observability tooling.


## Related

- [Execution Traces](../concepts/execution-traces.md) — implements (0.7)
- [Context Engineering](../concepts/context-engineering.md) — implements (0.7)

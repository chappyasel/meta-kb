# Temporal Knowledge Graphs

> Knowledge graphs where facts have explicit validity windows, episode provenance, and historical relationships. Unlike static knowledge graphs that capture what is true, temporal KGs track when facts became true, when they stopped being true, why they changed, and which source conversations or events established them -- making them purpose-built for agents operating on evolving, real-world data.

## Why It Matters

Static RAG retrieves document chunks statelessly: the same query returns the same results regardless of when you ask or what has changed since the documents were indexed. This breaks down in any domain where information evolves. A customer support agent needs to know that a user moved from NYC to SF last month, superseding earlier location data. A project management agent needs to know that the API rate-limiting decision from three weeks ago was reversed yesterday. A healthcare agent needs to know that a patient's medication was changed and why.

Temporal knowledge graphs solve this by encoding not just entities and relationships but the time dimension of those relationships. Every fact carries metadata about when it was established, which episode or conversation introduced it, and whether it has been superseded by newer information. This enables temporal reasoning: "What did we decide about X before the requirements changed?" and "What was true about Y as of date Z?"

For agent memory specifically, temporal KGs bridge the gap between short-term conversational context and long-term knowledge persistence. Conversations are episodes that introduce or modify facts. Between conversations, the knowledge graph maintains continuity. Across conversations, the graph tracks how understanding has evolved. This is the infrastructure that makes multi-session agents genuinely useful rather than perpetually amnesic.

## How It Works

A temporal knowledge graph consists of three core elements:

**Entities and Relationships (the graph).** Standard knowledge graph structure: nodes represent entities (people, projects, concepts, decisions), edges represent relationships between them. But unlike static KGs, both nodes and edges carry temporal metadata.

**Temporal Validity.** Every fact (edge) in the graph has a validity window: a `valid_from` timestamp and optionally a `valid_to` timestamp. When a user says "I just moved to SF," the system creates a new location fact with `valid_from: now` and updates the old NYC location fact with `valid_to: now`. Both facts remain in the graph -- the historical record is preserved, but queries default to currently-valid facts.

**Episode Provenance.** Every fact links back to the episode (conversation, document, event) that established it. This enables auditability ("why do we think this is true?"), conflict resolution ("these two conversations said different things -- which came later?"), and selective forgetting ("everything from that corrupted data source should be invalidated").

Graphiti implements this through a process of dynamic synthesis. When new data arrives (a conversation turn, a business event, a document update), the system:

1. Extracts entities and relationships from the new data.
2. Searches the existing graph for related entities.
3. Resolves contradictions by comparing temporal metadata (newer facts supersede older ones for the same relationship type).
4. Creates new edges with provenance links to the source episode.
5. Maintains both the current graph state and the full historical record.

Retrieval combines both semantic search (finding conceptually relevant facts) and temporal filtering (finding facts valid at a specific time or within a time range). This enables queries like "What were the user's preferences before they updated them last week?" which are impossible with standard vector search.

Cognee extends this with continuous learning: the graph is not just updated when explicitly prompted but evolves as the agent processes new information. Knowledge structures adapt and refine themselves, with relationship weights and confidence scores adjusting based on evidence accumulation.

HippoRAG takes a different approach, using personalized PageRank over knowledge graphs to enable multi-hop associativity. Rather than explicit temporal metadata, HippoRAG uses the graph structure itself to enable the kind of spreading-activation retrieval that human memory performs -- finding connections that keyword search would miss.

## Who Implements It

- [Graphiti](../projects/graphiti.md) -- temporal context graph framework with explicit validity windows and episode provenance; prescribed and learned ontology; MCP server for integration with Claude and Cursor. 94.8% on DMR benchmark, 18.5% accuracy improvement on LongMemEval with 90% latency reduction.
- [Cognee](../projects/cognee.md) -- knowledge engine combining vector search with graph databases and continuous learning for dynamically evolving agent memory; multimodal ingestion with relationship-aware retrieval
- [HippoRAG](../projects/hipporag.md) -- knowledge graphs with personalized PageRank for multi-hop associative retrieval; mimics human hippocampal memory consolidation to build persistent, interconnected knowledge representations

## Open Questions

- How should temporal knowledge graphs handle uncertain or probabilistic facts? Current implementations treat facts as binary (valid or not), but real-world knowledge often comes with confidence levels that should decay over time.
- What is the right granularity for episodes? A single conversation turn, a full conversation, a work session, or a calendar day? The boundary affects provenance tracking and storage costs.
- How do temporal KGs scale to millions of facts with overlapping validity windows? Graph traversal with temporal filtering adds complexity beyond standard graph queries. Neo4j and other graph databases support temporal queries, but performance at agent-memory scale is not well benchmarked.
- Can temporal KGs be made self-healing? If contradictory facts accumulate (perhaps from different users or data sources), can the graph autonomously detect and resolve conflicts, or does this always require human adjudication?
- How do temporal KGs compose across multiple agents? If two agents share a knowledge graph but have different conversation histories, how are their episode provenances reconciled?

## Sources

- [Rasmussen et al. -- Zep: A Temporal Knowledge Graph Architecture](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) -- "Graphiti -- a temporally-aware knowledge graph engine that dynamically synthesizes both unstructured conversational data and structured business data while maintaining historical relationships"
- [Graphiti repo](../../raw/repos/getzep-graphiti.md) -- "unlike static knowledge graphs, Graphiti's context graphs track how facts change over time, maintain provenance to source data, and support both prescribed and learned ontology"
- [Cognee repo](../../raw/repos/topoteretes-cognee.md) -- "combines vector search with graph databases and continuous learning to maintain dynamically evolving contextual knowledge for agents"

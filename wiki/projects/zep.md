---
entity_id: zep
type: project
bucket: agent-memory
sources:
  - repos/getzep-graphiti.md
  - repos/memorilabs-memori.md
  - repos/supermemoryai-supermemory.md
  - repos/caviraoss-openmemory.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:22:39.591Z'
---
# Zep

**Type:** Project | **Category:** Agent Memory | **License:** Apache-2.0

## What It Does

Zep provides persistent, structured long-term memory for AI agents and assistants. Where most RAG systems retrieve static document chunks, Zep tracks how facts evolve across sessions, maintains the relationships between entities, and supports temporal queries ("what did the user say last month about X?"). The managed platform targets production deployments; the open-source engine underneath it, Graphiti, can be self-hosted.

## Architecture: Temporal Knowledge Graphs via Graphiti

The core mechanism is [Graphiti](../../raw/repos/getzep-graphiti.md), an open-source Python engine that builds and queries **temporal context graphs**. Three data structures do the heavy lifting:

- **Episodes**: raw ingested data, the ground truth stream. Every derived fact traces back here.
- **Entities** (nodes): people, products, policies, concepts with summaries that update over time.
- **Facts/Relationships** (edges): triplets with explicit validity windows. When a fact changes, the old edge is invalidated but preserved, not deleted.

This bi-temporal design means you can query "what was true on March 3rd" separately from "what is true now." Standard vector stores have no equivalent; they overwrite or duplicate.

**Ingestion** runs incrementally. New episodes integrate into the graph without full recomputation. The `SEMAPHORE_LIMIT` environment variable (default: 10) controls concurrency to avoid LLM provider rate limits during parallel graph construction.

**Retrieval** combines three signals: semantic embeddings, BM25 keyword matching, and graph traversal. Results get reranked via a cross-encoder. This hybrid approach avoids the precision gaps of pure vector search while keeping latency sub-second, unlike GraphRAG's sequential LLM summarization chain.

**Graph backends** supported: Neo4j, FalkorDB, Kuzu, Amazon Neptune. Full-text search on Neptune uses Amazon OpenSearch Serverless. The `graph_driver` parameter in the `Graphiti` constructor accepts any of these, configured via their respective driver classes (`Neo4jDriver`, `FalkorDriver`, `KuzuDriver`, `NeptuneDriver`).

**LLM dependency**: Graphiti uses LLMs during ingestion to extract entities and relationships. It works best with models supporting structured output (OpenAI, Gemini). Smaller or locally-run models without structured output support cause ingestion failures; the `OpenAIGenericClient` (not `OpenAIClient`) handles Ollama and other OpenAI-compatible local providers.

## Benchmarks

From the [Zep paper](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) (self-reported, not independently validated):

| Benchmark | Zep | Competitor |
|-----------|-----|-----------|
| Deep Memory Retrieval (DMR) | 94.8% | MemGPT: 93.4% |
| LongMemEval accuracy improvement | +18.5% vs baseline | — |
| LongMemEval latency reduction | 90% vs baseline | — |

The paper is authored by the Zep team (Preston Rasmussen et al., arXiv 2501.13956). DMR was originally established by the MemGPT team. LongMemEval is a third-party benchmark, making those results more credible than DMR comparisons, but the testing methodology was still Zep's own. Take the numbers as directionally interesting, not certified.

Graphiti has 24,473 GitHub stars (as of early 2026), which reflects genuine community traction.

## Strengths

**Cross-session reasoning**: The graph structure lets agents synthesize information across many conversations, not just retrieve from the most recent few. A user preference mentioned six months ago remains queryable.

**Temporal contradiction handling**: When a user updates a preference or fact, Graphiti invalidates the old edge automatically and records when the change happened. Vector stores either overwrite (losing history) or accumulate duplicates (polluting retrieval).

**Enterprise data integration**: Graphiti ingests both unstructured conversational text and structured JSON business data into the same graph. An agent can reason over CRM records and conversation history simultaneously.

**Incremental updates**: No batch recomputation when new data arrives. The graph extends in real time.

## Critical Limitations

**Concrete failure mode**: Ingestion quality degrades with small or non-structured-output-capable models. Graph extraction requires the LLM to follow schemas reliably. If you run Graphiti with a locally-hosted model that doesn't support structured output, entity and relationship extraction produces malformed schemas and silently corrupts the graph. The README acknowledges this but doesn't describe recovery paths.

**Unspoken infrastructure assumption**: You need a running graph database before Graphiti does anything. Neo4j, FalkorDB, Kuzu, or Neptune must be provisioned, maintained, and backed up separately. For Neptune, you also need an Amazon OpenSearch Serverless collection for full-text search. Teams expecting a "plug in an API key and go" experience will hit this infrastructure dependency immediately.

## When NOT to Use Zep

**Single-session or stateless applications**: If your agent doesn't need memory across conversations, Zep adds graph database infrastructure, LLM ingestion calls, and operational complexity with no benefit.

**Latency-critical paths where ingestion happens synchronously**: Graph construction makes LLM calls to extract entities. If you're trying to ingest and respond in the same request with tight latency budgets, this pipeline doesn't fit.

**Teams without graph database operations experience**: Self-hosted Graphiti requires someone to operate Neo4j or equivalent. If your team has never run a graph database in production, the failure modes (index corruption, schema migrations, backup/restore) will be unfamiliar.

**Simple single-user chatbots**: The per-user context graph architecture shines when you manage many users with distinct histories. One bot for internal use with a handful of known users doesn't need this machinery.

## Unresolved Questions

**Cost at scale**: The managed Zep platform pricing for large numbers of user graphs is not documented in public sources. Graph construction makes multiple LLM calls per ingested episode; at high volume, those API costs compound. No public data exists on what Graphiti ingestion costs per million tokens of conversation.

**Conflict resolution in multi-agent writes**: Graphiti supports concurrent ingestion via the semaphore pattern, but the documentation doesn't address what happens when two agents write conflicting facts about the same entity simultaneously. The temporal invalidation model assumes sequential updates; the behavior under concurrent writes to the same edge is unclear.

**Governance model for Graphiti vs Zep**: Graphiti is Apache-2.0 and open source. Zep (the managed service) is commercial. The boundary between what features live in Graphiti versus Zep-cloud-only is not fully documented. The comparison table in the README is high-level; specific retrieval optimizations and "sub-200ms performance at scale" are listed as Zep features only.

## Alternatives

| Alternative | Choose when... |
|-------------|----------------|
| [Mem0](https://github.com/mem0ai/mem0) | You want simpler vector-based memory without graph infrastructure overhead |
| Memori | Your agents produce structured actions (not just text) and you want SQL-native storage with lower token footprint per query; Memori reported 81.95% LoCoMo accuracy at ~5% of full-context token usage |
| LangChain LangMem | You're already deep in the LangChain stack and want memory that integrates without a separate service |
| Plain vector store + session summarization | Your use case is single-session or your team can't operate graph databases |

## Related Concepts

- Retrieval-Augmented Generation

## Sources

- [Zep paper: Temporal Knowledge Graph Architecture](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- [Graphiti repository](../../raw/repos/getzep-graphiti.md)
- [Memori repository (for benchmark comparison)](../../raw/repos/memorilabs-memori.md)

---
entity_id: context-engineering
type: approach
bucket: context-engineering
sources:
  - repos/memodb-io-acontext.md
  - repos/vectifyai-pageindex.md
  - repos/thedotmack-claude-mem.md
  - repos/topoteretes-cognee.md
  - repos/othmanadi-planning-with-files.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Claude Code
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:23:14.883Z'
---
# Context Engineering

## What It Is

Context engineering is the discipline of designing and managing the information provided to an LLM during inference. It goes beyond writing prompts to encompass how you retrieve, structure, compress, and update everything inside the context window.

The framing matters because LLMs don't learn from individual interactions at inference time. Their behavior is determined entirely by what you put in the context window at the moment they run. A model with good weights and poor context engineering underperforms a weaker model with well-constructed context. This makes context the primary lever practitioners actually control.

A 2025 survey ([Mei et al.](../../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)) covering over 1,400 papers formalizes this as a discipline with three foundational components: context retrieval and generation, context processing, and context management. These components then compose into system-level implementations: RAG, memory systems, tool-integrated reasoning, and multi-agent coordination.

## The Taxonomy

### Context Retrieval and Generation

Retrieval pulls relevant information from external sources at query time. The core challenge is that you can't embed everything in a static prompt, so you need mechanisms to select what's relevant for a specific query.

Vector search (dense retrieval) converts text into embeddings and finds semantically similar passages. This handles paraphrase and implicit connections but fails on exact-match lookups and struggles when relevance depends on relationship structure rather than surface similarity.

Graph-augmented retrieval, as implemented in tools like [Cognee](../projects/cognee.md), structures knowledge as entity-relationship graphs. This lets queries traverse connections rather than scoring isolated chunks, which helps for multi-hop questions where the answer depends on the relationship between two things that wouldn't be retrieved together by pure vector similarity.

Generation-based context construction creates context through synthesis rather than lookup. This includes hypothetical document embedding (generating a hypothetical answer and retrieving against it), query expansion, and summarization-based compression.

### Context Processing

Raw retrieved content rarely fits directly into a prompt. Processing transforms it into a form the model can use effectively.

**Compression** reduces token count while preserving information density. This includes extractive methods (selecting important spans), abstractive methods (generating summaries), and token-level methods that prune tokens by predicted importance. The tradeoff is that compression introduces lossy decisions about what to keep.

**Reranking** reorders retrieved passages by relevance to the actual query, separating the initial broad retrieval from the precision selection step. Cross-encoder rerankers are more accurate than embedding-based retrieval but more expensive to run at scale.

**Structuring** reformats content into representations the model handles better: tables, code, lists, or structured schemas versus unformatted prose.

### Context Management

Long-running agents and multi-turn conversations accumulate context that grows unbounded. Management handles what to keep, what to discard, and how to maintain continuity across sessions.

The core challenge is the context window limit. Even models with 1M-token windows face practical constraints: longer contexts increase latency, cost, and the probability of the model attending to the wrong parts. The "lost in the middle" problem, documented in multiple studies, shows model performance degrades on information positioned in the middle of long contexts compared to information at the beginning or end.

Memory systems persist information across context windows. Approaches vary by structure:

- **Vector stores**: fast semantic retrieval but opaque; hard to inspect or correct
- **Knowledge graphs**: human-readable relationships but require schema design upfront
- **Skill files**: [Acontext](../projects/acontext.md) stores agent learnings as Markdown files, making memory auditable and editable without re-embedding on transfer
- **Episodic logs**: compressed summaries of past interactions

Each has different tradeoffs for inspection, portability, and retrieval precision.

## The Asymmetry Problem

Mei et al. identify a structural gap that shapes what context engineering can accomplish: current LLMs are considerably better at understanding complex contexts than at generating equivalently complex outputs. You can feed a model a 100,000-token context and it will comprehend it reasonably well. Ask it to produce 10,000 tokens of coherent, structured output and quality degrades substantially.

This matters for system design. Context engineering can dramatically improve what a model extracts, reasons about, and synthesizes from large information sets. It cannot compensate for output-side limitations. Systems that need long-form generation, extended reasoning chains, or complex structured output hit a ceiling that better context construction doesn't raise.

The practical implication: context engineering works best when the output is short and targeted (answers, decisions, summaries) rather than long and generative (reports, code bases, extended plans).

## How It Works in Practice

**Static context**: fixed system prompts, few-shot examples baked in at deploy time. Simple, predictable, but can't adapt to query-specific needs.

**Dynamic context**: context constructed at request time based on the query. Requires retrieval infrastructure but scales to large knowledge bases.

**Agentic context**: context evolves over a multi-step task. The agent retrieves information, takes actions, receives results, and each step modifies what's in context. This requires managing not just what to retrieve but what to keep from previous steps and what to drop.

**Tool-integrated reasoning**: the model's context includes tool schemas and prior tool call results. Context engineering here involves deciding which tools to expose (exposing too many degrades performance), how to format tool outputs before they re-enter context, and how to handle tool failures without context contamination.

**Multi-agent context**: in systems with multiple agents, each agent has its own context window. Coordination requires deciding what information to pass between agents (messages, shared memory, structured handoffs) without duplicating the entire conversation history at each node.

## Failure Modes

**Retrieval-generation mismatch**: the retrieved content is relevant in isolation but confuses the model when combined. Two passages that contradict each other, or that use the same term with different meanings, can cause the model to hedge or produce inconsistent outputs. The model has no way to signal that its retrieved context is incoherent.

**Context pollution in agents**: early mistakes in a multi-step task contaminate subsequent reasoning. If the model's tool call at step 2 produces wrong output and that output sits in context, subsequent steps will reason from it. There's no native mechanism to quarantine suspect context.

**Semantic drift in memory**: memory systems that accumulate over long periods tend to store outdated information. Updating memory requires detecting what's stale, which requires running retrieval against the memory itself. Cognee's continuous learning approach addresses this by reprocessing data as it changes, but this creates its own consistency challenges during updates.

**The lost-in-the-middle problem**: information placed in the middle of a long context window receives less attention than information at the start or end. Systems that retrieve 20 passages and concatenate them expose themselves to this: only the first and last few passages may be attended to reliably.

**Compression loss**: aggressive context compression to fit within token limits can remove precisely the detail needed to answer the query. The compression decision is made before the model runs, so there's no feedback loop to discover what was erroneously dropped.

## Infrastructure Assumptions

Most context engineering approaches assume synchronous, low-latency access to retrieval systems. In practice, vector search against large corpora can take 50-200ms, reranking adds another pass, and multi-hop graph traversal compounds these costs. For latency-sensitive applications, the retrieval pipeline can dominate response time, not the model inference.

Graph-based approaches (Cognee, GraphRAG variants) additionally require maintained graph infrastructure: databases like Neo4j or Weaviate, ingestion pipelines that update graph structure as source data changes, and schema design that reflects actual query patterns. This is more infrastructure than most prompt-engineering setups anticipate.

Acontext's skill file approach ([source](../../raw/repos/memodb-io-acontext.md)) takes the opposite tradeoff: memory is Markdown files that require no vector infrastructure and are trivially portable, but retrieval is by agent reasoning and `list_skills`/`get_skill` tool calls rather than semantic search. This works when skill counts are manageable but breaks down as the skill library grows and the agent can't determine what to retrieve without browsing.

## When Not to Use It

**Single-turn, low-variability queries**: if your queries are narrow and the relevant information is small enough to fit in a system prompt, dynamic retrieval adds latency and failure modes without benefit. A customer support bot answering questions about one product's FAQ probably doesn't need RAG.

**Latency-critical applications**: retrieval adds round trips. If you need sub-100ms response times, a static context approach with a well-tuned prompt will outperform a multi-stage retrieval pipeline.

**Small, stable knowledge bases**: if your knowledge base fits in 10,000 tokens and changes quarterly, load it statically. Retrieval infrastructure is operational overhead that only pays off when you can't fit everything in context or when the knowledge changes frequently enough that rebuilding static prompts isn't feasible.

**When output quality is the bottleneck**: if your problem is that outputs aren't long enough, structured enough, or consistent enough across multiple turns, better context construction won't fix this. That's a generation-side limitation.

## Open Questions

**Compression without loss guarantees**: every compression method makes implicit decisions about what's important. There's no principled way to verify that compressed context preserves all query-relevant information before running the model.

**Cost accounting at scale**: the published benchmarks on RAG and memory systems rarely include full cost profiles. Token costs for retrieval, reranking, and the model call itself combine in ways that aren't obvious. The cost per query for a sophisticated context engineering pipeline can be 5-10x a simple prompt.

**Conflict resolution in retrieved context**: when retrieved passages contradict each other, what should the system do? Some approaches ask the model to reason through contradictions, but this requires the model to have ground truth about which source is more reliable, which it typically doesn't have.

**Memory governance**: who decides when agent-learned skills should be deleted or corrected? Acontext makes skills human-readable so they can be edited, but there's no standard for how to audit or expire accumulated agent memory over time.

## Related Concepts and Tools

- Retrieval-Augmented Generation: the most widely deployed form of context engineering
- [Cognee](../projects/cognee.md): graph-plus-vector retrieval with continuous learning
- [Acontext](../projects/acontext.md): skill-file-based memory layer emphasizing portability and human readability

## Selection Guidance

Use pure vector RAG when your knowledge base is large, queries are ad-hoc, and you want standard infrastructure. Use graph-augmented retrieval (Cognee) when queries depend on relationships between entities rather than similarity to a query. Use skill-file memory (Acontext) when you need portable, human-auditable agent memory and can tolerate retrieval by agent reasoning rather than semantic search. Use static context when the knowledge base is small and stable.

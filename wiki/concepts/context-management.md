---
entity_id: context-management
type: concept
bucket: context-engineering
abstract: >-
  Context management is the set of techniques for deciding what information
  occupies an LLM's finite context window, covering retrieval, compression,
  memory hierarchies, and assembly — the primary lever for LLM system quality
  given that models understand rich contexts better than they generate from
  sparse ones.
sources:
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - repos/kevin-hs-sohn-hipocampus.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Retrieval-Augmented Generation
  - Context Compression
  - Compaction Tree
last_compiled: '2026-04-05T20:33:39.882Z'
---
# Context Management

## What It Is

Every LLM call operates under a hard constraint: the context window. Context management is the discipline of deciding what occupies that space. The decision matters because an LLM's output quality is largely a function of what you put in, and the window is finite.

The [Mei et al. survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) formalizes this as an optimization problem:

```
C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)
```

Subject to: `|C| ≤ L_max`

The goal is maximizing task reward by assembling the best possible context from six component types: instructions, knowledge, tool definitions, memory, dynamic state, and the user query. Every production LLM system is making allocation decisions across these six categories, whether or not it frames them that way.

Context management sits inside the broader discipline of [context engineering](../concepts/context-engineering.md) and is the operational concern that makes or breaks [retrieval-augmented generation](../concepts/retrieval-augmented-generation.md).

## Why It Matters

The survey's central finding: LLMs understand complex contexts far better than they generate equally sophisticated outputs. This asymmetry means that investing in context assembly yields higher returns than trying to coax better generation from sparse input. More concretely — a well-structured 50K-token context with the right documents, typed memory entries, and relevant tool signatures will outperform a minimal prompt plus clever generation instructions.

This also sets a ceiling. You cannot generate a 200-page analysis from 2,000 tokens of context. What the model can synthesize is bounded by what you give it.

## Core Techniques

### Memory Hierarchies

The practical implementation of context management borrows the CPU cache metaphor. Information divides into tiers by access cost and frequency:

**Hot (always loaded):** A small, always-present summary layer — typically 1K–10K tokens — that gives the model situational awareness without retrieval. [Hipocampus](../projects/hipocampus.md) implements this as `ROOT.md`: a topic index with four sections (Active Context, Recent Patterns, Historical Summary, Topics Index), each entry tagged with type and age. This costs roughly 3K tokens per session but eliminates the "unknown unknowns" failure mode where search cannot find what it doesn't know to look for.

The benchmark evidence is concrete: Hipocampus + Vector scored 21.0% on the MemAware benchmark against 0.8% for no-memory and 3.4% for BM25+vector search alone. On hard cross-domain questions with zero keyword overlap, it scored 8.0% vs 0.7% for pure vector search. Search structurally cannot make those connections; a topic index can. (These numbers are self-reported by the project author.)

**Warm (loaded on demand):** Daily logs, curated knowledge files, task plans. Loaded when ROOT.md lookup identifies relevance. Incurs one file read.

**Cold (searched):** Full history, retrieved via BM25, vector search, or hierarchical tree traversal. Highest recall cost, used for specific known-unknown queries.

### Context Compression

Raw retrieved text is verbose. Compression reduces token count while preserving information density. Current techniques achieve 4–8x compression ratios with moderate information loss (per the Mei survey, though "moderate" is poorly defined across the literature).

The [Compaction Tree](../concepts/compaction-tree.md) pattern implements hierarchical compression: raw logs compact into daily summaries, daily into weekly, weekly into monthly, monthly into a root index. Below a size threshold, files are copied verbatim — no LLM, no information loss. Above threshold, an LLM generates keyword-dense summaries. This prevents the runaway cost of compacting already-compacted content and preserves detail for recent material where it matters most.

Memory typing controls what survives compression. Hipocampus's four types — `project`, `feedback`, `user`, `reference` — have different compaction behaviors. User preferences and feedback never compress away. Project memories compress when completed. Reference entries get staleness markers after 30 days. This is the difference between a memory system and a leaky bucket.

### Retrieval

When the model knows what it needs, retrieval fills the context with relevant external knowledge. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) covers this in depth. The key context management insight from the [GraphRAG paper](../raw/deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md) is that chunk size creates a quality-cost tradeoff at indexing time: 600-token chunks extract roughly 2x more entity references than 2400-token chunks but require 4x more LLM calls. The right chunk size depends on your query pattern, not a universal optimum.

For global sensemaking queries ("what are the main themes?"), map-reduce over community summaries dramatically outperforms per-chunk retrieval — 72–83% comprehensiveness win rates over naive RAG. For specific factual queries, naive RAG is simpler and often sufficient. Context management means choosing the right retrieval mode for the query type, not defaulting to one architecture for everything.

The GraphRAG paper also documents an 8K optimal context window for map-reduce synthesis — larger windows do not improve quality and cost more. Stuffing 50K tokens into a single LLM call for synthesis does not reliably yield better answers.

### Context Assembly

Given retrieved content, compression outputs, and the always-loaded hot layer, the assembly function `A(...)` decides how these combine. The six-component model provides a useful checklist: for each component type, ask what it contributes, how much context budget it consumes, and whether it overlaps with another component.

Practical assembly patterns:
- **Sequential:** System instructions → retrieved knowledge → memory → query
- **Interleaved:** Relevant memory chunks embedded near the query context where they apply
- **Hierarchical:** Summary first, detail second (model reads summary to decide whether to request detail)

The [Karpathy approach](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) demonstrates that at small-to-medium scale (~100 articles, ~400K words), a well-maintained wiki with auto-generated index files can substitute for elaborate RAG infrastructure. The LLM reads the index files to locate relevant documents, then loads them. This is context management through information architecture rather than retrieval engineering.

## Failure Modes

**Unknown unknowns:** A search-only system cannot surface context the agent doesn't know to search for. Three weeks ago you decided on a rate-limiting strategy; today you're refactoring the API endpoint. No search query connects these. A topic index loaded into every session catches this; a pure vector search system does not. This is the primary failure mode of retrieval-only context management.

**Context flooding:** Adding more retrieved documents does not monotonically improve quality. Past roughly 8K tokens of synthesis material, LLM quality plateaus or degrades. Systems that retrieve the top-20 chunks without a budget constraint are often adding noise to context, not signal.

**Compression information loss:** Hierarchical compaction discards detail at each level. If a fact exists only in a raw log from six weeks ago, and the weekly compaction summarized it away, it is gone. No retrieval will find it. Memory typing and verbatim-below-threshold policies partially address this, but the problem does not disappear.

**Temporal staleness:** Reference entries and external links become stale. A context management system without staleness markers will confidently present outdated information. The `[?]` marker after 30 days (as in Hipocampus) is a minimal mitigation; production systems need active freshness validation.

**LLM-as-judge evaluation bias:** When evaluating context management strategies, LLM judges may systematically prefer longer, more structured responses. The GraphRAG paper's 72–83% comprehensiveness win rates over naive RAG were measured by LLM judge. The directness metric showed the reverse — naive RAG won. Both numbers are meaningful, but neither is independently validated by human evaluation.

## Infrastructure Assumptions

**Latency tolerance:** Memory compaction, reranking, and hierarchical retrieval add latency. A system that compacts weekly logs before each session startup may add seconds to cold-start time. Real-time applications need warm caches and pre-computed compactions.

**LLM call cost at scale:** Entity extraction with gleanings (as in GraphRAG) requires multiple LLM calls per chunk. For a 1M-token corpus at 600 tokens per chunk, that's ~1,667 chunks times 2–3 LLM calls each. Graph indexing has substantial upfront cost that must be amortized over query volume. For a corpus queried once, plain text summarization is cheaper and nearly as good.

**Static vs. dynamic corpora:** Most memory and compression architectures assume infrequent updates. The Leiden community detection in GraphRAG requires full graph recomputation when documents change. Hipocampus's compaction tree supports incremental daily additions but recompacts upstream nodes on a cooldown schedule. Real-time document streams require different designs (label propagation instead of Leiden; streaming compaction instead of batch).

## When Not to Use Elaborate Context Management

A markdown file with 50 hand-curated facts may outperform a memory hierarchy for a narrow, well-scoped assistant. Context management infrastructure has setup cost, maintenance cost, and failure modes. Before building a tiered memory system:

- If your total knowledge base fits in 20K tokens, load it all. Hot tier is everything.
- If your queries are specific and keyword-addressable, BM25 retrieval is sufficient.
- If sessions are short and stateless, there is no memory problem to solve.
- If your corpus changes daily, graph-based approaches become expensive to maintain.

The Karpathy wiki pattern is honest about this: at small scale, an LLM reading index files is "pretty good about auto-maintaining" relevance without fancy RAG. The infrastructure complexity only pays off as scale grows.

## Unresolved Questions

**Optimal compression ratios:** The survey cites 4–8x compression with "moderate" information loss, but there is no agreed definition of what information loss is acceptable or how to measure it before deployment. Production teams discover this when queries start failing.

**Cross-agent context budget:** Multi-agent systems share context across agents, but the survey identifies this as an unsolved problem. When Agent A and Agent B both need context about a shared task, who owns the memory entry? Who compacts it? Who pays the token cost?

**Hallucination compounding:** GraphRAG's community summaries are LLM-generated abstractions of LLM-extracted entities — two LLM passes before the model sees any content. Each pass can introduce or amplify errors. The GraphRAG paper acknowledges not applying hallucination detection. No major context management framework has a clean answer for detecting compaction-introduced errors.

**Benchmark adequacy:** Existing benchmarks (LongMemEval, MemAware, MEMENTO) test recall of past information but not cross-session reasoning, temporal inference, or the agent's awareness of what it has forgotten. A system that scores well on MemAware may still fail at "given everything we've discussed about this project, what architectural risks have we not addressed?"

## Relationships

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — a specific context management pattern for injecting external knowledge
- [Context Compression](../concepts/context-compression.md) — techniques for reducing token count while preserving information
- [Compaction Tree](../concepts/compaction-tree.md) — hierarchical compression algorithm used in tiered memory systems
- [Context Engineering](../concepts/context-engineering.md) — the broader discipline; context management is its operational layer

## Alternatives and Selection Guidance

| Approach | Use when |
|---|---|
| Full context load | Total knowledge fits in window; latency matters |
| BM25 / vector search only | Queries are specific; keywords are reliable; no cross-session memory needed |
| Tiered memory (hot/warm/cold) | Sessions are long; cross-session continuity matters; queries involve implicit connections |
| GraphRAG / community summaries | Corpus is large and stable; queries ask about themes and patterns across documents |
| Karpathy wiki pattern | Small-to-medium corpus; LLM maintains the index; interactive exploration is the primary use case |


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.6)
- [Context Compression](../concepts/context-compression.md) — part_of (0.7)
- [Compaction Tree](../concepts/compaction-tree.md) — implements (0.6)

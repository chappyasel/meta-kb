---
entity_id: agentic-rag
type: approach
bucket: knowledge-bases
abstract: >-
  Agentic RAG extends standard retrieval-augmented generation by placing an LLM
  agent in a control loop that plans retrieval strategies, iterates on queries,
  and synthesizes multi-source evidence — distinguishing it from single-pass RAG
  by its capacity for multi-hop reasoning at the cost of compounding failure
  modes.
sources:
  - repos/volcengine-openviking.md
  - repos/laurian-context-compression-experiments-2508.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
related:
  - react
last_compiled: '2026-04-07T11:45:04.627Z'
---
# Agentic RAG

## What It Is

[Retrieval-Augmented Generation](../concepts/rag.md) retrieves once and generates once. If the first retrieval misses, the model has no recovery path.

Agentic RAG wraps RAG inside a control loop. An LLM agent parses the query, builds a retrieval plan, executes retrieval or tool calls, evaluates the results against the original question, then either answers or loops back for another pass. This is the plan→retrieve→evaluate→decide cycle associated with [ReAct](../concepts/react.md)-style architectures.

The core capability gain: queries requiring multi-hop reasoning or evidence scattered across sources. A question like "How did the company's hiring strategy change after the 2022 restructuring?" may require pulling from HR policy documents, board meeting summaries, and org charts — sources that a single embedding lookup won't reliably surface together.

The core cost: the loop introduces compounding failure modes that don't exist in single-pass RAG.

## How It Works

The agent runs an iterative cycle with four main phases:

**Planning.** The agent decomposes the query into sub-questions or retrieval targets. For a complex question, this might generate three to five distinct lookup strategies rather than a single vector search.

**Retrieval execution.** Each sub-question triggers one or more retrieval calls. Production implementations typically combine [hybrid search](../concepts/hybrid-search.md) — dense vector retrieval via an [embedding model](../concepts/embedding-model.md) plus sparse [BM25](../concepts/bm25.md) keyword matching, merged with [reciprocal rank fusion](../concepts/reciprocal-rank-fusion.md) — because pure semantic search fails on exact identifiers (contract numbers, employee IDs, named clauses) while pure keyword search misses semantic intent.

**Evaluation.** The agent assesses whether the retrieved evidence answers the question. This is the critical decision point: if evidence is sufficient, the agent synthesizes and answers. If not, it identifies the gap and reformulates.

**Reformulation.** The agent rewrites its query targeting the specific gap identified in evaluation, then loops. Good implementations constrain this: the reformulation must target a named gap, not just rephrase the original query.

[Task decomposition](../concepts/task-decomposition.md) drives the planning phase. [Context management](../concepts/context-management.md) governs what accumulated evidence enters the generation context. [Context compression](../concepts/context-compression.md) handles the downstream problem of tool outputs bloating the window before synthesis.

## Architectural Variants

**Single-agent loop.** One LLM manages planning, retrieval, evaluation, and synthesis. Simple to build, harder to control at scale.

**Multi-agent delegation.** A planner agent breaks queries into sub-tasks and delegates to specialist retrievers. Used when knowledge sources have very different access patterns (e.g., a code index vs. a document store vs. a live API).

**Graph-augmented.** Combines vector retrieval with a [knowledge graph](../concepts/knowledge-graph.md) for multi-hop entity traversal. [GraphRAG](../concepts/graphrag.md) and [HippoRAG](../projects/hipporag.md) implement this pattern; useful when the corpus has dense entity relationships (legal documents, scientific literature, organizational data).

**Hierarchical context loading.** Projects like OpenViking use an L0/L1/L2 tiered structure: L0 is a one-sentence abstract for quick relevance checks, L1 is a structural overview for planning, L2 is the full document loaded on demand. This prevents the agent from pulling full documents for every candidate, which is a common source of context bloat.

## Key Numbers

**OpenViking benchmark on LoCoMo10 (1,540 long-dialogue cases, self-reported):**
- OpenClaw baseline (native memory only): 35.65% task completion, 24.6M input tokens
- OpenClaw + LanceDB: 44.55% task completion, 51.6M input tokens
- OpenClaw + OpenViking (memory disabled): 52.08% task completion, 4.3M input tokens
- OpenClaw + OpenViking (memory enabled): 51.23% task completion, 2.1M input tokens

These figures are self-reported by the OpenViking team. The 83-96% token reduction claim is striking and should be independently replicated before relying on it for cost planning. The task completion improvement (35% → 52%) is more modest and plausible.

**mem-agent on md-memory-bench (56 hand-crafted samples, self-reported):**
- Qwen3-4B base: 39% overall
- mem-agent (4B, GSPO-trained): 75% overall
- Qwen3-235B-Thinking: 79% overall

The benchmark is small and hand-crafted by the authors. Independent validation hasn't occurred.

**Context compression experiments (production agentic RAG, self-reported):**
- gpt-4o-mini with original prompt: 0% success rate on hard cases
- After DSPy GEPA optimization: ~62% success
- After TextGrad: ~79% success
- After hybrid GEPA + TextGrad: 100% on the 296-case test set

These are production traces from a single system, not a published benchmark.

## Strengths

**Multi-hop queries.** When answering requires chaining facts across multiple documents — "What was the impact of policy X on team Y during period Z?" — iterative retrieval outperforms single-pass reliably.

**Gap-aware evidence gathering.** The agent can identify specifically what it's missing and query for it, rather than hoping the embedding space surfaces the right combination by proximity.

**Dynamic knowledge bases.** When the corpus changes frequently, an agent can incorporate retrieval-time context that a parametric model can't. The mem-agent pattern takes this further by training the agent to update its own knowledge store during conversation, moving toward writable memory rather than read-only retrieval.

**Graceful handling of schema heterogeneity.** Different knowledge sources (APIs, documents, databases) can be accessed through different tools, with the agent deciding which source fits which sub-question.

## Critical Limitations

**Concrete failure mode — retrieval thrash.** The agent enters a retrieval loop without converging. A user asks about California-specific remote work reimbursement. The agent retrieves the general policy, the verifier flags it incomplete, the agent reformulates and retrieves again, still not confident, reformulates and loops. After six iterations the answer is barely better than after round one, but latency has tripled and cost has multiplied. LangGraph's own agentic RAG reference implementation had this bug — an infinite retrieval loop requiring a `rewrite_count` hard cap to fix. If the reference implementation can loop forever, production systems will.

The fix is a hard cap at three retrieval iterations, plus a "new evidence threshold": if the latest retrieval's results share more than ~80% semantic overlap with prior results, stop and answer with explicit uncertainty rather than reformulating again.

**Unspoken infrastructure assumption.** Agentic RAG assumes the retrieval layer can tolerate repeated, rapid, semantically varied queries within a single user request. Most teams design their vector database and embedding API for average query volume. When the agent fires 8–12 searches per user query instead of 1, throughput contracts — and provider rate limits hit at exactly the moment the agent is mid-loop. The fallback behavior (retry, downgrade to a cheaper model, skip the iteration) needs to be designed upfront, not added after the first production incident.

## Failure Mode Taxonomy

Three failure modes account for most production problems:

**Retrieval thrash.** Repeated reformulation without convergence. Signal: near-duplicate queries in traces, oscillating search terms, flat answer quality across iterations. Mitigation: 3-iteration hard cap, new evidence threshold check, reformulation constrained to named gaps.

**Tool storms.** Excessive tool calls cascading — parallel calls returning redundant data, retry logic spiralling during provider outages. One documented case: 200 LLM calls in 10 minutes, $50–200 burned before detection. Signal: tool calls per task spiking at p95, cost-per-task rising faster than query volume. Mitigation: per-tool budgets, deduplication of results across calls, exponential backoff with fallback to cached results.

**Context bloat.** Tool outputs pasted directly into context until the model's attention disperses. Stanford/Meta's "Lost in the Middle" research found 20+ percentage-point accuracy drops when critical information sits mid-context; in some tests, adding 20 retrieved documents drove accuracy below closed-book performance. Signal: context token growth rate outpacing useful evidence addition, instruction-following degrading. Mitigation: compress tool outputs before injection (Microsoft LLMLingua claims 20× compression with minimal reasoning loss), cap top-k at 5–10 results, deduplicate chunks at 80%+ semantic overlap.

## When Not to Use It

**Latency-sensitive applications.** Each retrieval iteration adds one full LLM call plus vector search latency. A three-iteration maximum still triples the minimum latency floor compared to single-pass RAG.

**Simple document lookup.** FAQ systems, single-document extraction, and factoid queries where the first retrieval pass reliably surfaces the answer don't benefit from the control loop. They just pay its costs.

**When the corpus doesn't support the queries.** If the knowledge base genuinely lacks the answer, the agent will thrash trying to find it. Agentic RAG can't manufacture evidence. The agent needs a reliable "not in corpus" detection mechanism — failing that, it loops until a hard cap fires.

**When you need deterministic behavior.** The agent's planning and reformulation decisions are probabilistic. The same query can follow different retrieval paths across runs. If audit trails or reproducibility are requirements, the non-determinism is a problem single-pass RAG avoids.

## Unresolved Questions

**Optimal stopping criteria.** The "three iterations" rule-of-thumb appears in multiple production guides, but no published benchmark establishes what the right number is for different corpus types or query complexities. The right cap is probably domain-specific.

**Evaluation at scale.** md-memory-bench has 56 samples. [HotpotQA](../projects/hotpotqa.md) and [GAIA](../projects/gaia.md) test broader reasoning, but none specifically stress-test the failure modes (thrash, storm, bloat) under production load. There's no established benchmark for agentic RAG robustness.

**Cost modeling.** The "intent-based routing" approach — classify query complexity before choosing single-pass vs. agentic — reportedly achieves 40% cost reduction and 35% latency improvement (self-reported, one team). No published study has validated this across query distributions.

**When to compress vs. retrieve fresh.** The tradeoff between compressing accumulated context and discarding it to re-retrieve is not well-studied. Compression loses detail; fresh retrieval adds latency and may surface different chunks.

## Alternatives

**Single-pass RAG.** Use when queries are simple, latency matters, or the corpus reliably surfaces the right answer on the first lookup. Much easier to debug.

**[GraphRAG](../concepts/graphrag.md).** Use when the corpus has dense entity relationships requiring multi-hop traversal (legal documents, organizational data, scientific literature). Gives structured navigation rather than iterative retrieval.

**[RAPTOR](../projects/raptor.md).** Use when the corpus has hierarchical structure and queries require reasoning at multiple abstraction levels. Builds a recursive tree of summarized chunks rather than iterating at query time.

**[HippoRAG](../projects/hipporag.md).** Use when associative memory across documents matters — linking concepts across sources the way human memory does.

**[LangGraph](../projects/langgraph.md) with explicit state machines.** Use when you need agentic RAG but want deterministic control flow. Define the retrieval loop as a graph with explicit nodes and hard transitions rather than leaving loop control to the LLM's judgment.

**[LlamaIndex](../projects/llamaindex.md) agentic pipelines.** Use when you want a framework-supported implementation of agentic RAG with built-in tooling for query planning, retrieval, and synthesis.

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md) — the foundation this extends
- [ReAct](../concepts/react.md) — the reasoning-acting loop that most agentic RAG implementations follow
- [Hybrid Search](../concepts/hybrid-search.md) — typically required for production retrieval quality
- [Context Compression](../concepts/context-compression.md) — necessary mitigation for context bloat
- [Context Management](../concepts/context-management.md) — governs what accumulated evidence enters the generation context
- [Task Decomposition](../concepts/task-decomposition.md) — drives the planning phase
- [GraphRAG](../concepts/graphrag.md) — graph-augmented variant for entity-dense corpora
- [Agent Memory](../concepts/agent-memory.md) — how agents persist knowledge across retrieval iterations

## Sources

- [Agentic RAG Failure Modes](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)
- [Why Most RAG Systems Fail in Production](../raw/articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md)
- [mem-agent: Equipping LLM Agents with Memory Using RL](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)
- [OpenViking repository](../raw/repos/volcengine-openviking.md)
- [Context Compression Experiments](../raw/repos/laurian-context-compression-experiments-2508.md)

---
entity_id: agentic-rag
type: concept
bucket: knowledge-substrate
abstract: >-
  Agentic RAG extends standard RAG by giving an LLM control over multi-step
  retrieval: the model plans queries, evaluates intermediate results, and
  decides whether to retrieve again—enabling multi-hop reasoning at the cost of
  compounding failure modes.
sources:
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - repos/volcengine-openviking.md
related:
  - retrieval-augmented-generation
  - react
last_compiled: '2026-04-08T23:27:32.671Z'
---
# Agentic RAG

## What It Is

Standard [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) retrieves once and generates once. The model has no recovery path if retrieval fails. Agentic RAG adds a control loop: the model plans a retrieval strategy, executes it, evaluates the evidence, and decides whether that evidence is sufficient to answer or whether it needs another pass. This loop repeats until the model declares completion or hits a budget constraint.

The pattern maps directly onto [ReAct](../concepts/react.md)-style architectures: **plan → retrieve → reason → decide → repeat**. Each cycle the model can reformulate queries, switch retrieval tools, or change granularity. This is what makes Agentic RAG useful for questions that require synthesizing information from multiple sources, following chains of evidence, or adapting strategy mid-retrieval.

The tradeoff is sharp: the same loop that enables multi-hop reasoning also introduces compounding failure modes that don't exist in single-pass pipelines.

## Core Mechanism

The control loop runs through four repeating phases:

**1. Query Planning**
The model decomposes the user question into sub-queries or identifies what evidence it needs. On the first pass this is straightforward; on subsequent passes it must identify what specific gap the previous retrieval failed to fill.

**2. Retrieval Execution**
The model issues retrieval calls—against [vector databases](../concepts/vector-database.md), keyword indexes like [BM25](../concepts/bm25.md), or structured stores—using whatever tools it has available. Production implementations typically use [hybrid search](../concepts/hybrid-search.md) (dense + sparse) rather than vector search alone, because exact-term queries fail against embedding-only indexes.

**3. Evidence Evaluation**
The model assesses whether the retrieved content actually answers the question or fills the identified gap. This is where the loop can go wrong: weak evaluation criteria lead to perpetual dissatisfaction with results.

**4. Decision**
Stop and answer, or reformulate and retrieve again. Without explicit stopping rules, the default behavior under uncertainty is to retrieve more.

The context assembly problem is present throughout. Every retrieved chunk, every intermediate summary, every tool response accumulates in the context window. The model's [context management](../concepts/context-management.md) obligations grow with each iteration—which is why Agentic RAG is best understood not just as a retrieval pattern but as a [context engineering](../concepts/context-engineering.md) challenge.

## Why It Matters

Standard RAG has a structural limitation: multi-hop questions. If answering "What is our reimbursement policy for remote employees in California?" requires synthesizing a general policy document and a state-specific HR addendum, single-pass retrieval either finds both (lucky) or finds one and generates an incomplete answer (common). The model cannot detect the gap because it never had a chance to evaluate what it retrieved.

Agentic RAG solves this by giving the model agency over the retrieval process. It can retrieve the general policy, notice California isn't covered, reformulate the query, find the addendum, and synthesize both. This is not possible in a fixed pipeline.

The [context engineering survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) frames Agentic RAG as a specific composition of retrieval, processing, and management components within the broader optimization problem: **C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)**, where the system must fill a finite context window with maximally useful information. Agentic RAG changes how `c_know` gets populated—from a fixed pipeline to a dynamic, model-controlled process.

Graph-enhanced approaches like [GraphRAG](../projects/graphrag.md), [HippoRAG](../projects/hipporag.md), and [RAPTOR](../projects/raptor.md) are often combined with agentic control loops specifically because they handle multi-document synthesis better than flat vector retrieval.

## Failure Modes

Three failure modes appear consistently in production deployments. They compound each other.

### Retrieval Thrash

The agent searches repeatedly without converging. Symptoms in traces: near-duplicate queries, oscillating search terms (broaden → narrow → broaden), answer quality flat across iterations.

Root causes: weak stopping criteria (the verifier rejects without specifying what's missing), poor gap identification (reformulation rewrites the query rather than targeting a specific missing piece), or the corpus genuinely doesn't contain the answer but the model can't recognize absence of evidence.

LangGraph's own official Agentic RAG tutorial shipped with an infinite retrieval loop requiring a `rewrite_count` cap to fix. If the reference implementation loops forever, production systems certainly will without explicit caps.

**Concrete failure scenario**: A user asks about California-specific reimbursement policy. The agent retrieves the general policy, flags it as incomplete (correct), reformulates to "California remote work reimbursement" (gets a tangentially related document), flags incomplete again, reformulates to "California labor code expense reimbursement" (gets a legal document with no HR application), and continues for three more iterations. Final answer is barely better than iteration one.

### Tool Storms

Excessive tool calls cascade through timeout/retry logic. One startup documented agents making 200 LLM calls in 10 minutes at $50–200 per episode before detection. Cost spikes of 1,700% during provider outages have been observed as retry logic spirals.

Tool storms and context bloat co-occur: each tool response enters the context window, and a tool storm produces a context window saturated with low-signal content.

### Context Bloat

Retrieved chunks, tool outputs, and intermediate summaries accumulate until the model can't follow its own instructions. Stanford and Meta's "Lost in the Middle" research found performance drops of 20+ percentage points when critical information sits mid-context. In some multi-document QA tests, including more retrieved documents drove accuracy *below* closed-book performance—adding context actively degraded the answer.

## Stopping Rules and Mitigations

Agentic RAG cannot be fixed by prompt engineering. Stopping rules and budgets must be architectural.

**Iteration cap**: Three retrieval cycles is the production consensus. After three failed passes, return a best-effort answer with explicit uncertainty markers.

**New evidence threshold**: Before allowing another iteration, measure semantic similarity between newly retrieved content and prior results. If similarity exceeds 80%, the corpus has been exhausted—stop.

**Tool budgets**: Hard caps on tool calls per task (typically 10–15), per-tool rate limits, and deduplication across calls. When a tool times out twice, use cached results or skip it.

**Context compression**: Summarize tool outputs before injecting them. A 5,000-token API response compresses to ~200 tokens of structured summary without losing material signal. Cap top-k retrieval at 5–10 results. Microsoft's LLMLingua achieves up to 20× prompt compression with minimal reasoning loss.

**Tiered loading**: Projects like OpenViking implement L0/L1/L2 context layers—one-sentence abstract, ~2K-token overview, full content—loaded on demand rather than all at once. OpenViking benchmarks on LoCoMo dialogues show 52% task completion vs. 35% baseline (OpenClaw with core memory), while reducing input tokens by 91%. These are self-reported numbers from the project's own evaluation.

**Tripwire rules**: Hard kills when any budget is hit. The agent stops cleanly and returns its best answer, not more retries.

## When NOT to Use It

Agentic RAG is the wrong choice when:

- **Latency requirements are strict.** Each retrieval iteration adds a full LLM call. What looks like one query is often three to five round trips at generation latency.
- **Queries are simple.** Document lookups, FAQ retrieval, single-source answers—single-pass RAG is faster, cheaper, and easier to debug. Adding a control loop to a simple pipeline is complexity without return.
- **Observability is immature.** Without tracing tool calls per task, retrieval iterations per query, and context growth rate, you cannot detect failures before they appear in your invoice. Ship the telemetry before the agent.
- **Cost sensitivity is high.** The per-query cost of Agentic RAG is variable and can spike dramatically on hard queries. Fixed-cost pipelines are predictable; control loops are not.

The practical test: does single-pass retrieval routinely fail for your hardest queries? If yes, add a controlled second pass. If two passes handle the cases, stop there before going fully agentic.

## Unresolved Questions

**When does iteration help versus hurt?** Production consensus says three cycles maximum, but there's no principled threshold for how many iterations add value before compounding noise. The right number likely depends on corpus structure and query type, and no published benchmark cleanly separates these.

**How to evaluate gap detection?** The bottleneck in retrieval thrash is the model's ability to identify *what specifically* it's missing. Current evaluations measure final answer quality, not whether intermediate evidence evaluation was accurate. Bad gap detection is invisible in standard RAG benchmarks.

**Cost attribution in multi-agent pipelines.** When Agentic RAG runs as a sub-component inside a larger [multi-agent system](../concepts/multi-agent-systems.md), cost attribution across agents is unclear. Shared context creates coordination overhead that may negate the benefits of parallelization for simpler tasks.

**Benchmark adequacy.** [HotpotQA](../projects/hotpotqa.md) tests multi-hop reasoning but not the full control loop—it doesn't measure whether the agent correctly decided to retrieve again versus answer. Existing benchmarks evaluate output quality, not retrieval decision quality.

## Relationships to Related Concepts

Agentic RAG extends [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) by replacing the fixed retrieval step with a model-controlled loop. It implements [ReAct](../concepts/react.md)'s pattern of interleaved reasoning and action, applied specifically to retrieval. The context accumulation problem makes it a core application of [context management](../concepts/context-management.md) and [context compression](../concepts/context-compression.md). [Hybrid search](../concepts/hybrid-search.md) is nearly always the right retrieval substrate—pure vector search fails on exact-term queries that agentic reformulation often produces. For queries requiring relational reasoning, [knowledge graphs](../concepts/knowledge-graph.md) combined with agentic control outperform flat retrieval.

The evidence evaluation step in the loop is a form of [LLM-as-judge](../concepts/llm-as-judge.md) applied to the model's own retrieval. The quality of that self-evaluation determines whether the system converges or thrashes.

## Alternatives

**Single-pass RAG with hybrid retrieval**: Use when queries are well-specified, corpus is well-structured, and latency matters. Faster, predictable cost, easier debugging.

**[GraphRAG](../projects/graphrag.md)**: Use when the query requires synthesizing relationships across entities. Graph traversal handles multi-hop reasoning without a control loop, which avoids thrash risk.

**[RAPTOR](../projects/raptor.md)**: Use when the answer requires hierarchical document synthesis. Recursive summarization at index time reduces the need for iterative retrieval at query time.

**[LlamaIndex](../projects/llamaindex.md) with sub-question decomposition**: Use when multi-hop queries can be decomposed statically rather than adaptively. Cheaper and more predictable than a dynamic control loop when query structure is known in advance.

**Full agent with tool use**: Use when retrieval is one of many tools and the task genuinely requires interleaving retrieval, computation, and action. [LangGraph](../projects/langgraph.md) or [AutoGen](../projects/autogen.md) for orchestration.


## Related

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — extends (0.8)
- [ReAct](../concepts/react.md) — implements (0.6)

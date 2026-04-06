---
entity_id: agentic-rag
type: concept
bucket: knowledge-bases
abstract: >-
  Agentic RAG extends standard retrieval-augmented generation by letting an
  agent iteratively plan, retrieve, evaluate, and re-retrieve across multiple
  steps — enabling complex multi-hop queries that single-pass RAG cannot handle,
  at the cost of compounding failure modes that require explicit budgeting and
  observability to control.
sources:
  - repos/volcengine-openviking.md
  - repos/laurian-context-compression-experiments-2508.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
related:
  - rag
last_compiled: '2026-04-06T02:07:19.817Z'
---
# Agentic RAG

## What It Is

[Retrieval-Augmented Generation](../concepts/rag.md) retrieves once, then generates. The model gets whatever came back from the vector store and produces an answer. If retrieval fails, there is no recovery — the model works with bad context and often hallucinates without signaling that anything went wrong.

Agentic RAG adds a control loop. Instead of retrieve-once-then-answer, the system runs: parse query → plan retrieval → execute retrieval or tool calls → evaluate evidence → decide whether to stop or loop. That loop is what separates agentic RAG from simple RAG. The agent asks "do I have enough to answer?" after each retrieval pass. If not, it reformulates and tries again.

This architecture handles queries that require multi-hop reasoning — questions where the answer depends on connecting information scattered across multiple documents, where a follow-up retrieval depends on what the first retrieval found, or where the query itself needs to be decomposed before retrieval can work at all. A query like "what are the tax implications of the restructuring mentioned in last quarter's board minutes?" requires at least two retrieval steps and some reasoning to connect them. Single-pass RAG cannot do this reliably.

## Core Mechanism

The agent loop follows a [ReAct](../concepts/react.md)-style structure: reason about what is needed, act by calling a retrieval tool or search function, observe the results, reason again.

**Planning**: The agent decomposes the user query into sub-questions or identifies what information it needs. Some implementations do this explicitly with a planning step that produces a structured retrieval plan. Others do it implicitly through the model's reasoning trace.

**Retrieval execution**: The agent calls retrieval tools — vector search, keyword search ([BM25](../concepts/bm25.md)), structured queries, or combinations via [Hybrid Retrieval](../concepts/hybrid-retrieval.md). In more complex systems, it calls external APIs, web search, or specialized tools. The agent controls which tool it calls and with what query.

**Evidence evaluation**: After each retrieval pass, the agent assesses whether the returned content actually addresses the query. This is the step that does not exist in standard RAG. The evaluator checks: is this relevant? Is it sufficient? What gaps remain? Weak evaluators — ones that cannot precisely identify what is missing — cause retrieval thrash (see Failure Modes below).

**Decision**: The agent either stops and generates a final answer, or reformulates and retrieves again. The reformulation should target a specific identified gap, not just rephrase the original query.

**Context accumulation**: Retrieved content builds up across iterations. The agent's growing context window contains the original query, retrieval results from multiple passes, reasoning traces, and intermediate conclusions. This context is what the final generation step uses.

Production implementations typically layer multiple retrieval strategies. Semantic search via embeddings handles vague or conceptual queries. Keyword search handles exact matches — product IDs, specific clause numbers, named entities. A reranker (cross-encoder) re-scores the combined results by evaluating (query, chunk) pairs directly, improving precision without changing the underlying retrieval infrastructure. The agent controls when to invoke each strategy.

OpenViking's filesystem paradigm for agent context management uses an L0/L1/L2 tiered loading scheme — abstract summaries, overviews, and full content — where the agent retrieves at the appropriate granularity rather than always loading full documents. This reduces token consumption in agentic loops where the agent browses many potential sources before committing to deep reads. [Source](../raw/repos/volcengine-openviking.md)

## Key Numbers

The mem-agent paper reports that on the md-memory-bench benchmark, a 4B model trained with GSPO scores 75% overall, outperforming GPT-5 (63%) and Claude Opus 4.1 (55%) on the same scaffold — though this benchmark was hand-crafted by the same team that built the model, so treat it as indicative rather than independent validation. [Source](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

The context compression experiments (self-reported) show that optimizing prompts for a cheaper fallback model via genetic algorithms (DSPy GEPA) brought success rate from 0% to 62% on a held-out set of 296 failed compressions, while TextGrad reached 79%, and a hybrid of both reached 100% on extracting something vs. nothing. Cost at scale was not measured. [Source](../raw/repos/laurian-context-compression-experiments-2508.md)

OpenViking's OpenClaw integration benchmarks (self-reported by the OpenViking team against LoCoMo10, 1,540 cases) show 43% improvement in task completion rate over baseline OpenClaw and 91% reduction in input token cost when adding OpenViking as a context layer — plausible directionally, but self-reported against their own dependent project. [Source](../raw/repos/volcengine-openviking.md)

LangGraph's official agentic RAG tutorial contained an infinite retrieval loop that required adding a `rewrite_count` cap to fix. This is independently observable in the repository history. [Source](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

## Strengths

**Multi-hop queries**: Questions that require connecting information across sources, where later retrieval depends on earlier retrieval results, are structurally impossible for single-pass RAG. Agentic RAG handles them by design.

**Adaptive retrieval strategy**: The agent can switch retrieval tools based on what it finds. A semantic search that returns nothing useful can be followed by keyword search. A retrieval that returns high-level documents can be followed by a drill-down into a specific subsection.

**Evidence gap detection**: When the corpus genuinely does not contain the answer, a well-designed agentic system can detect this and respond with explicit uncertainty rather than hallucinating. Standard RAG typically hallucinates instead.

**Dynamic query refinement**: The agent reformulates queries based on what previous retrievals revealed, targeting specific gaps rather than repeating the same search.

**Composable with other tools**: The retrieval step is just one tool call. The agent can interleave retrieval with web search, API calls, code execution, or database queries — all within the same loop.

## Critical Limitations

**Compounding failure modes**: The control loop that makes agentic RAG powerful is also what makes it dangerous. Bad decisions accumulate. Each iteration where the agent retrieves without converging burns tokens and compounds any errors in evidence assessment. Standard RAG fails on individual queries. Agentic RAG can fail in cascading ways that are invisible until they appear in cost dashboards.

**The concrete failure mode — retrieval thrash**: An agent asks for California-specific reimbursement policy. The evaluator flags the answer as incomplete. The agent reformulates. Retrieves again. Still not confident. Reformulates again. After six iterations, the answer is barely better than after the first, and the system has burned through its retrieval budget. The root cause is a weak evaluator that rejects without specifying what is missing, combined with a reformulation strategy that rephrases rather than targets gaps. LangGraph's reference implementation had exactly this bug. [Source](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

**Unspoken infrastructure assumption — observability**: Agentic RAG assumes you can trace what the agent did at each step. Without per-iteration logging of tool calls, retrieval results, evidence assessments, and reformulations, debugging failures is guesswork. Most teams ship without this and discover the problem when costs spike. Startups have documented agents making 200 LLM calls in 10 minutes ($50–$200) before anyone noticed. Retry logic during provider outages has caused 1,700% cost spikes. [Source](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

## When NOT to Use It

**Simple factual queries**: If users ask FAQ-style questions where a single retrieval reliably returns the answer, agentic RAG adds latency, cost, and complexity with no benefit. Single-pass RAG is faster and easier to debug.

**Strict latency requirements**: Each retrieval iteration adds a full LLM call plus retrieval latency. Three iterations triples the minimum response time. If your SLA requires sub-second responses, the agentic loop does not fit.

**When the corpus does not support multi-hop**: If your knowledge base is a flat set of independent documents with no cross-references or relational structure, the agent cannot usefully chain retrievals. The loop adds overhead without improving answers.

**When you lack the infrastructure to observe it**: Shipping agentic RAG without per-iteration tracing, cost monitoring, and hard token/call budgets means silent failures will accumulate. The system will appear to work in testing and degrade silently in production.

**High-volume, low-complexity workloads**: At scale, the cost multiplier from multiple retrieval passes and LLM calls per query compounds. For workloads where most queries are simple and volume is high, the economics favor single-pass RAG with a targeted agentic fallback for the hard cases only.

## Failure Modes in Detail

**Retrieval thrash**: Agent loops without converging. Signals: near-duplicate queries across iterations, oscillating search terms, answer quality flat across passes. Fix: hard cap at 3 iterations; require reformulation to target a specific identified gap; stop and return best-effort answer with uncertainty marker when budget is hit.

**Tool storms**: Excessive tool calls cascade. Cascading retries after timeouts, parallel calls returning redundant data, "call everything when uncertain" behavior. Signals: tool calls per task spiking, p95 latency in the tail. Fix: per-tool budgets and rate limits; deduplicate results across calls; fallback to cached results after two timeouts.

**Context bloat**: Tool outputs accumulate in context until the model stops following instructions. The "Lost in the Middle" effect (Stanford/Meta research) shows performance drops of 20+ percentage points when critical information sits mid-context. In one documented test, adding 20 retrieved documents to context produced accuracy below closed-book performance — the retrieval actively hurt. Fix: summarize tool outputs before injecting; cap top-k at 5–10; deduplicate chunks with 80%+ semantic overlap. [Source](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

**Context drift in multi-turn sessions**: Appending full chat history causes token explosion and reinforces wrong answers. Fix: treat context as a filter, not a log — select only relevant turns, exclude flagged incorrect responses, summarize conversations past 5–7 turns.

## Instrumentation

Track these signals from the first deployment:

- Tool calls per task (average and p95): investigate above 10, hard-kill above 30
- Retrieval iterations per query: p95 above 6 indicates thrash on hard queries
- Context length growth rate per iteration: fast growth with flat quality signals bloat
- p95 latency: tail latency is where agentic failures accumulate
- Cost per successful task: penalizes wasted attempts, not just average per-run cost

Per-iteration justification logging — what new evidence was gained, why it is insufficient — makes thrash visible. Vague or repetitive justifications confirm the loop is stuck.

## Unresolved Questions

**Evaluator quality**: The evidence evaluator is the most important component in preventing thrash, and it is also the least specified in most implementations. How do you train or prompt an evaluator that can precisely identify what information is missing rather than just flagging "incomplete"? The answer determines whether the agentic loop converges or thrashes.

**Stopping rule design at scale**: Three iterations as a hard cap is a practical default, but the right number depends on query complexity, corpus structure, and acceptable latency. There is no general guidance on how to set this dynamically based on query characteristics.

**Cost attribution in multi-agent systems**: When agentic RAG is one component in a larger multi-agent pipeline, cost and failure attribution becomes difficult. Which agent's retrieval loop caused the budget overrun? Current tooling does not handle this well.

**Memory across sessions**: Most implementations treat each session as independent. The mem-agent work (using markdown files and GSPO training) shows one approach to persistent memory that evolves across interactions, but how to reliably merge, update, and retrieve across sessions at production scale remains open. [Source](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

**Verifiable improvement measurement**: Self-reported benchmarks from teams building both the system and the benchmark (as in the OpenViking and mem-agent cases) make it hard to assess real-world improvement. Independent evaluation of agentic RAG against matched production workloads is sparse.

## Alternatives and Selection Guidance

**[Retrieval-Augmented Generation](../concepts/rag.md) (standard)**: Use when queries are simple, latency matters, and the corpus has low cross-document dependency. Simpler to debug. Failure mode is loud (bad answers) rather than expensive (budget overruns).

**[Hybrid Retrieval](../concepts/hybrid-retrieval.md)**: Use when the limitation is retrieval precision, not retrieval depth. Combining semantic and keyword search often resolves the queries that single-pass RAG fails on without adding a control loop.

**[GraphRAG](../projects/graphrag.md)**: Use when the domain has rich entity relationships and multi-hop reasoning maps cleanly onto graph traversal. Structured domains (legal, biomedical, organizational hierarchies) benefit more than unstructured document collections.

**[RAPTOR](../projects/raptor.md)**: Use when the bottleneck is hierarchical summarization — queries that require understanding document structure at multiple levels of abstraction. Less general than agentic RAG but more predictable.

**[HippoRAG](../projects/hipporag.md)**: Use when the retrieval problem is associative — finding connections across a large document graph that are not obvious from query similarity alone.

**Controlled agentic fallback**: Use single-pass RAG as the default, route only high-complexity queries (detected by query classification) to an agentic path with strict budgets. Production teams using intent-based routing report 40% cost reductions and 35% latency improvements versus full agentic pipelines. [Source](../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

## Related Concepts

- [Retrieval-Augmented Generation](../concepts/rag.md) — the foundation this extends
- [ReAct](../concepts/react.md) — the reasoning-acting pattern that structures the agent loop
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md) — the retrieval strategy most production agentic RAG systems use
- [Task Decomposition](../concepts/task-decomposition.md) — how the agent breaks complex queries into retrieval sub-tasks
- [Context Engineering](../concepts/context-engineering.md) — managing what goes into the context window across iterations
- [Agent Memory](../concepts/agent-memory.md) — persistent state across agentic RAG sessions
- [Iterative Self-Verification](../concepts/iterative-self-verification.md) — the evaluation step that decides whether to loop or stop
- [Vector Database](../concepts/vector-database.md) — the retrieval backend most implementations use
- [Knowledge Graph](../concepts/knowledge-graph.md) — alternative retrieval backend for structured domains
- [Prompt Compression](../concepts/prompt-compression.md) — technique for managing context bloat in long agentic loops

## Related Projects

- [LangChain](../projects/langchain.md) — common framework for building agentic RAG pipelines
- [LangGraph](../projects/langgraph.md) — graph-based agent orchestration; its reference agentic RAG implementation required a retrieval cap to prevent infinite loops
- [LlamaIndex](../projects/llamaindex.md) — indexing and retrieval infrastructure with agentic query modes
- [GraphRAG](../projects/graphrag.md) — Microsoft's graph-based retrieval with agentic traversal
- [DSPy](../projects/dspy.md) — programmatic prompt optimization applicable to retrieval and compression steps
- [Graphiti](../projects/graphiti.md) — temporal knowledge graph for agent memory across sessions
- [Mem0](../projects/mem0.md) — memory layer for persisting agent state across agentic RAG sessions

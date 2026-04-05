---
entity_id: agentic-rag
type: approach
bucket: knowledge-bases
sources:
  - repos/vectifyai-pageindex.md
  - repos/laurian-context-compression-experiments-2508.md
  - articles/dev-community-why-most-rag-systems-fail-in-production-and-how-t.md
  - >-
    articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
  - deep/repos/vectifyai-pageindex.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:34:04.563Z'
---
# Agentic RAG

## What It Is

Agentic RAG extends Retrieval-Augmented Generation by adding a control loop around the retrieve-generate cycle. Classic RAG retrieves once and generates once — if the chunks are wrong, the model has no recovery path. Agentic RAG gives the system a planner that decides whether retrieved evidence is sufficient, then either answers or loops back for another retrieval pass.

The loop runs roughly like this: parse the query → build a retrieval plan → execute retrieval or tool calls → evaluate evidence → stop and answer, or reformulate and retrieve again. This structure, similar to ReAct-style architectures, handles queries that require multi-hop reasoning or evidence scattered across documents. It also introduces compounding failure modes that don't exist in single-pass pipelines.

## How It Works

### The Control Loop

At each iteration, the agent runs two evaluations: "What did I get?" and "Is it enough?" The gap between those two questions is where most production failures originate. When evidence quality is uncertain, the default behavior is to retrieve more. Without hard stopping rules, that default cascades.

The agent typically manages several components:

- **Planner**: Decomposes the query, decides which tools or indices to call, sequences retrieval steps
- **Retriever**: Executes the actual lookup — vector search, keyword search, tree traversal, or tool calls against external APIs
- **Evaluator/Verifier**: Assesses whether retrieved content answers the original question; triggers reformulation if not
- **Context manager**: Accumulates evidence across iterations, decides what to keep in the prompt window

### Retrieval Strategies Within Agents

Agents can mix retrieval approaches per iteration:

**Vector similarity**: Standard embedding lookup. Fast, but retrieves by similarity rather than relevance — a distinction that matters for technical documents where the right chunk uses different terminology than the query.

**Reasoning-based tree search**: [PageIndex](../projects/pageindex.md) builds a hierarchical table-of-contents structure from documents and uses LLM reasoning to traverse nodes, simulating how a human expert skims a report before reading the relevant section. No vector database required. Achieved 98.7% on FinanceBench (self-reported by VectifyAI; see their [Mafin 2.5 benchmark repo](https://github.com/VectifyAI/Mafin2.5-FinanceBench)).

**Context compression**: After retrieval, a secondary LLM pass extracts only the query-relevant paragraphs. LangChain's `LLMChainExtractor` implements this pattern. In production agentic systems, this step is a cost bottleneck — cheaper models fail more often, forcing fallback to expensive models or accepting lower-quality extractions. Prompt optimization via DSPy GEPA (genetic algorithms) or TextGrad (gradient-based) can recover significant failure cases: one production experiment recovered 62% of failed compressions with GEPA alone, 79% with TextGrad, and 100% with a hybrid approach — without upgrading the underlying model. [Source](../../raw/repos/laurian-context-compression-experiments-2508.md)

## Three Failure Modes in Production

[Source](../../raw/articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md)

### Retrieval Thrash

The agent keeps searching without converging. Query traces show near-duplicate reformulations — broadening, narrowing, broadening again — while answer quality stays flat across iterations. Root cause: the verifier rejects evidence without specifying what's missing, so the retriever rewrites rather than targets a gap. LangGraph's own agentic RAG tutorial shipped with this bug: an infinite retrieval loop that required a `rewrite_count` cap to fix.

Detection: p95 retrieval iterations climbing well above the median (e.g., median of 1-2 vs. p95 of 6+).

Fix: hard cap at 3 iterations; add a "new evidence threshold" that stops the loop when the latest retrieval overlaps heavily with prior results.

### Tool Storms

The agent fires excessive tool calls — cascading retries after timeouts, parallel calls returning redundant data, or blanket "call everything" behavior under uncertainty. Documented production examples include agents making 200 LLM calls in 10 minutes ($50–$200 before anyone noticed) and costs spiking 1,700% during a provider outage as retry logic spiraled.

Detection: tool calls per task at p95; investigate above 10, hard-kill above 30.

Fix: per-tool budgets, rate limits, and fallback to cached results on repeated timeout.

### Context Bloat

Raw tool outputs — full JSON responses, repeated intermediate summaries — accumulate in the context window until the model's attention is too diffuse to follow instructions. Stanford and Meta's "Lost in the Middle" research found 20+ percentage point accuracy drops when critical information sits mid-context; in one multi-document QA test, adding 20 retrieved documents pushed accuracy *below* closed-book performance.

Detection: context token growth rate per iteration outpacing new evidence.

Fix: summarize tool outputs before injection (5,000 tokens → 200 tokens of structured summary). Cap top-k at 5–10. Microsoft's LLMLingua achieves up to 20× prompt compression with minimal reasoning loss.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| PageIndex FinanceBench accuracy | 98.7% | Self-reported (VectifyAI) |
| PageIndex GitHub stars | ~23,900 | Observed |
| Compression recovery (DSPy GEPA) | 62% of failed cases | Self-reported production experiment |
| Compression recovery (TextGrad) | 79% of failed cases | Self-reported production experiment |
| Compression recovery (hybrid) | 100% of failed cases | Self-reported production experiment |
| Cost reduction with intent-based routing | ~40% | Self-reported (Adaline AI) |
| Latency improvement with routing | ~35% | Self-reported |

All benchmarks above are self-reported. The FinanceBench result comes from the same team that built PageIndex.

## Strengths

Agentic RAG handles queries that single-pass retrieval can't: multi-hop questions requiring evidence from several documents, queries where the correct terminology differs between question and answer, and tasks where the agent must verify a claim before committing to it. For these cases, the control loop earns its cost.

Reasoning-based retrieval (tree search rather than vector similarity) improves explainability — you can trace exactly which document sections the agent visited and why, unlike vector search where the nearest-neighbor calculation is opaque.

## Critical Limitations

**Compounding failure surface**: every iteration in the control loop is a new decision point where the agent can go wrong. A single-pass RAG failure is contained; a bad verifier decision in an agentic system triggers another retrieval, another evaluation, another potential error. The architecture amplifies individual mistakes.

**Infrastructure assumption**: agentic RAG implicitly requires observability infrastructure — traces per iteration, token counts, tool call logs — before you can diagnose what's failing. Teams that deploy it without this instrumentation have no way to distinguish retrieval thrash from a genuinely hard query, or context bloat from a model regression. The cost signals arrive before the diagnostic signals.

## When Not to Use It

For FAQ lookups, simple document extraction, or queries where single-pass retrieval already works, classic RAG is faster, cheaper, and far easier to debug. The control loop adds latency and cost per query; on straightforward questions, it adds those costs with no benefit.

Don't use agentic RAG if you lack telemetry. Without per-iteration traces (tokens added, tool calls fired, evidence delta), you can't distinguish a thrashing agent from slow retrieval. The first visible signal will be your billing dashboard.

Don't use it when query latency matters more than answer completeness. Each additional iteration adds at minimum one full LLM round-trip.

## Unresolved Questions

**Stopping rule design**: production guidance converges on "cap at 3 iterations," but what makes a good verifier? The literature doesn't have a reliable answer for when the agent should recognize that the corpus simply doesn't contain what it needs versus when it should reformulate.

**Cost at scale**: the documented cost blowup examples (200 calls, 1,700% spikes) come from specific outage conditions, not normal operation. Typical per-query cost in well-tuned agentic systems isn't clearly established across different use cases.

**Compression model selection**: the context compression experiments show prompt optimization can close much of the gap between cheap and expensive models. What's not documented is how stable those optimized prompts are across corpus drift — if the document collection changes significantly, the optimized prompt may need retuning.

## Alternatives

| Approach | Use When |
|----------|----------|
| Classic single-pass RAG | Query complexity is low; retrieval usually succeeds first try; latency or cost matter |
| [PageIndex](../projects/pageindex.md) tree search | Documents are long and structured (financial reports, legal filings); explainability matters; you want to skip the vector database |
| Controlled two-pass RAG | Single-pass fails on hard queries but full agentic overhead isn't justified; add one conditional retry pass before going full loop |
| Graph RAG | Queries require traversing relationships between entities, not just finding relevant passages |


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — extends (0.8)

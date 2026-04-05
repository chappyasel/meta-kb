---
entity_id: multi-hop-retrieval
type: concept
bucket: knowledge-bases
sources:
  - repos/osu-nlp-group-hipporag.md
related:
  - Retrieval-Augmented Generation
  - Knowledge Graphs
last_compiled: '2026-04-04T21:21:03.100Z'
---
# Multi-Hop Retrieval

## What It Is

Multi-hop retrieval is a family of retrieval strategies that chain multiple retrieval steps together to answer complex questions that cannot be resolved from a single document or passage. Instead of issuing one query and returning the top-k results, a multi-hop system uses intermediate retrieved content to generate follow-up queries, progressively narrowing in on the answer through a sequence of reasoning steps.

The name comes from graph theory: each retrieval step is a "hop" through the information space, where the result of one hop seeds the next.

## Why It Matters

Most real-world questions are not simple lookup tasks. "What disease did the scientist who discovered penicillin die from?" requires first finding who discovered penicillin, then finding that person's cause of death—two separate retrieval steps. Standard Retrieval-Augmented Generation collapses this into a single pass, often returning irrelevant documents because no single passage contains all necessary context. Multi-hop retrieval handles:

- **Bridge questions**: Answer A is found in document 1; finding A unlocks the query for document 2.
- **Comparison questions**: Attributes of entity A and entity B must be retrieved separately and synthesized.
- **Aggregation questions**: Multiple independent facts must be collected before any answer is possible.

Failing to support multi-hop reasoning is one of the most commonly cited limitations of naive RAG systems.

## How It Works

### Iterative Query Reformulation
The simplest form: after retrieving an initial set of documents, an LLM reads them and generates a refined or follow-up query. This repeats for N rounds. Each round conditions on everything retrieved so far. Simple to implement; can suffer from query drift.

### Graph-Based Traversal
Documents (or their extracted entities/claims) are represented as nodes in a graph. Retrieval begins at a seed node, then traverses edges to neighboring nodes. Personalized PageRank—where relevance scores propagate outward from seed nodes—is a common mechanism. This avoids the brittleness of LLM-generated queries and naturally handles associative chains.

### Beam Search / Tree-of-Thought Retrieval
Multiple retrieval paths are explored in parallel, scored, and pruned. More computationally expensive but reduces the risk of dead ends.

### Retrieve-then-Read with Chain-of-Thought
The LLM is prompted to reason step-by-step, emitting explicit sub-questions that each trigger a retrieval call. ReAct-style agents formalize this as an interleaved think/retrieve/observe loop.

## Who Implements It

**HippoRAG** is the most architecturally explicit implementation: it extracts a [Knowledge Graph](../concepts/knowledge-graphs.md) from ingested documents, then uses Personalized PageRank seeded by query-matching entities to perform graph traversal retrieval. The v2 system (NeurIPS 2024) frames this explicitly as mimicking human hippocampal memory consolidation—interconnected facts become retrievable through associative paths rather than keyword overlap. It achieves strong results on multi-hop benchmarks while remaining inference-time only (no fine-tuning required). [Source](../../raw/repos/osu-nlp-group-hipporag.md)

Other implementations include IRCoT (interleaved retrieval and chain-of-thought), FLARE (forward-looking active retrieval), and various agent frameworks (LangChain, LlamaIndex) that expose retrieval as a tool in an agentic loop.

## Concrete Example

**Question**: "Which country was the birthplace of the composer whose symphony was premiered in the same city as the 1889 World's Fair?"

- Hop 1: Retrieve documents about the 1889 World's Fair → city = Paris
- Hop 2: Retrieve symphonies premiered in Paris around 1889 → find a specific composer
- Hop 3: Retrieve the composer's biography → country of birth

No single passage answers this. A flat retrieval over the original question will likely surface noise.

## Benchmarks

Common evaluation datasets:
- **HotpotQA** – 2-hop Wikipedia questions; the standard benchmark
- **MuSiQue** – Multi-step with deliberately hard distractors
- **2WikiMultiHopQA** – Cross-document reasoning
- **IIRC** – Requires following links to gather missing information

HippoRAG 2 reports strong gains over standard dense retrieval on HotpotQA and MuSiQue. Exact numbers vary by retriever backbone and LLM used.

## Practical Implications

| Concern | Notes |
|---|---|
| Latency | Each hop adds an LLM call and retrieval round-trip. 3-hop questions can be 3–5× slower than single-pass. |
| Cost | More tokens consumed per query; matters at scale. |
| Error propagation | A wrong intermediate retrieval cascades. Early errors are hard to recover from. |
| Index complexity | Graph-based approaches require entity extraction at index time, which is expensive and imperfect. |
| When to use | Complex analytical questions, research assistants, enterprise knowledge bases. Overkill for simple FAQ retrieval. |

## Strengths

- Handles genuinely complex questions that flat RAG cannot
- Graph traversal is more robust to paraphrase variation than repeated LLM query generation
- Can surface non-obvious connections between documents

## Limitations

- Significantly higher latency and cost than single-pass retrieval
- Knowledge graph extraction quality gates downstream retrieval quality
- Hard to debug: failures can occur at any hop
- Most benchmarks use 2–3 hop questions; real-world chains of 5+ hops are poorly studied

## Alternatives

For many production use cases, **better chunking + reranking** recovers a surprising amount of multi-hop capability without the complexity. Hybrid approaches that attempt single-pass retrieval first and escalate to multi-hop only on failure are increasingly common.

## Related

- Retrieval-Augmented Generation
- [Knowledge Graphs](../concepts/knowledge-graphs.md)
- [HippoRAG](../projects/hipporag.md)

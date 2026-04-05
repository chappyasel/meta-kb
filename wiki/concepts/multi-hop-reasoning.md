---
entity_id: multi-hop-reasoning
type: concept
bucket: knowledge-bases
sources:
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/michaelliv-napkin.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:34:06.439Z'
---
# Multi-Hop Reasoning

## What It Is

Multi-hop reasoning is the task of answering a question by connecting information from two or more separate sources. A single source cannot answer the question alone; the answer emerges only after traversing a chain of facts.

A two-hop example: *"Where does the manager of Project X work?"* requires (1) finding who manages Project X, then (2) finding where that person works. A three-hop example: *"What industry does the employer of the colleague of Alice's spouse operate in?"* chains spouse → colleague → employer → industry across four entities.

The "hop" terminology comes from graph traversal: each step crosses an edge between nodes. In knowledge graph (KG) systems, this maps directly to graph edges. In text-based retrieval, it maps to retrieving multiple documents and composing their information. Either way, the core difficulty is the same: the query alone does not contain enough signal to retrieve all necessary context in one shot.

## Why It Matters

Most real questions worth asking are multi-hop. Single-hop retrieval ("what is the capital of France?") is a solved problem. The interesting questions — comparative analysis, temporal sequences, relationship chains, organizational hierarchies — require composing facts from multiple places.

For Retrieval-Augmented Generation systems, multi-hop reasoning is the primary stress test. Standard RAG retrieves K chunks most similar to the original query. If the answer requires a chunk that is not similar to the query but is similar to an intermediate answer, standard RAG cannot find it. The query alone does not surface chunk B; you need to find chunk A first, use its content to construct a new query, then find chunk B.

Empirically, the performance gap is substantial. In a systematic benchmark comparing RAG and GraphRAG [Source](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md), RAG scores 25.73 F1 on temporal queries (a specific multi-hop class) versus GraphRAG's 49.06 — a 23-point gap on the same dataset and model. On comparison queries (another multi-hop class), the gap is smaller but consistent: 56.31 vs 60.16. On single-hop factual queries, RAG leads: 64.78 vs 63.01 F1.

## How It Works: Three Approaches

### 1. Iterative Retrieval (Query Decomposition)

The LLM decomposes the original question into sub-questions, answers each sub-question using retrieval, and feeds intermediate answers into subsequent sub-questions.

**Process:**
1. Parse "Where does the manager of Project X work?" into sub-questions: (a) "Who manages Project X?" (b) "Where does [answer to a] work?"
2. Retrieve and answer sub-question (a): "Alice Chen manages Project X."
3. Substitute: sub-question (b) becomes "Where does Alice Chen work?"
4. Retrieve and answer (b): "Alice Chen works at Meridian Labs."
5. Compose final answer.

**Implementation:** Tools like `search_vault()`, `read_file()`, and `go_to_link()` in file-based memory systems (e.g., mem-agent's markdown scaffold [Source](../../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)) give agents the primitives to execute this loop manually. The agent uses `<think>` blocks to plan sub-queries, `<python>` blocks to execute retrieval, observes `<result>` blocks, and iterates.

**Failure mode:** Error compounding. If step 1 retrieves the wrong manager, every subsequent step is wrong. The chain has no mechanism for catching or recovering from early errors.

### 2. Graph Traversal

Knowledge graphs store information as (entity, relation, entity) triples. Multi-hop reasoning traverses edges: starting at an entity node, following relation edges to intermediate nodes, then following further edges to the answer node.

**Concrete mechanism (from the GraphRAG evaluation [Source](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md)):**

GraphRAG builds a directed multigraph using NetworkX. The mem-agent data pipeline constructs graphs in three phases: entity stubs (id and name only), relationship inference (edges with direction), and attribute enrichment (localized 1-hop context). The memory export creates a 2-hop markdown knowledge base for each focal node — entities exactly 2 hops away are reachable only through intermediate connections, by design.

The `go_to_link()` tool in mem-agent's scaffold implements the traversal primitive: given an Obsidian-style `[[entities/alice_chen.md]]` link, it returns the linked file's content. Multi-hop reasoning across the knowledge base requires chaining these link traversals.

**Why graph structure helps:** Graph edges encode relationships that text similarity misses. A query about "Alice's employer's industry" may not be semantically similar to a passage about Meridian Labs' industrial sector, but the graph path Alice → employer → Meridian Labs → industry is a direct 2-hop traversal.

**Hard ceiling:** Graph-based approaches can only answer questions about entities that were successfully extracted during graph construction. In the Han et al. evaluation, only 65.8% of answer-relevant entities exist in the constructed knowledge graphs (HotPotQA dataset) and 65.5% (Natural Questions). Roughly 34% of answers are unreachable by design because the extraction pipeline missed the entity. This is an architectural constraint, not a tuning problem.

### 3. Community Summarization (Global Search)

Microsoft GraphRAG's global search approach generates hierarchical community summaries from graph structure. Rather than retrieving individual entities, it runs a map-reduce over all community summaries to answer corpus-wide questions.

**Where it fails for multi-hop:** Global search consistently underperforms both RAG and local graph search on QA tasks — 45-55% F1 versus 60-68% F1. It is designed for sensemaking and summarization, not for chaining specific facts. Using it for multi-hop QA is an architecture mismatch.

### 4. Hybrid Retrieval

Retrieve from both text-based (BM25 or embedding) and graph-based systems, concatenate results, generate from combined context. The Han et al. benchmark [Source](../../raw/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md) shows this integration strategy yields +6.4% on multi-hop tasks over RAG baseline, with predictable cost (2x retrieval).

BM25 with link-graph signals also enables multi-hop without explicit graph construction. Napkin's search [Source](../../raw/repos/michaelliv-napkin.md) combines BM25 scores with a backlink count signal: files with more incoming `[[wikilink]]` references rank higher, approximating PageRank over the document graph. This lets well-connected hub documents surface even when the query terms weakly match. The LongMemEval-S benchmark shows this reaches 91% versus 86% for the previous best embedding-based system — though the abstention score (knowing when not to answer) is only 50%, a significant weakness.

## Failure Modes

**Query drift:** Each retrieval step introduces noise. In a three-hop chain, the third retrieval is conditioned on the second result, which was conditioned on the first. Errors accumulate multiplicatively, not additively.

**Missing entity ceiling (~34%):** For KG-based approaches, if the relevant entity was not extracted at index time, the retrieval cannot surface it regardless of traversal strategy. This is the most common unspoken assumption: graph quality is treated as given, but real extraction pipelines are lossy.

**Vocabulary gap in BM25 multi-hop:** BM25 retrieval for the intermediate step depends on terms from the first-step answer. If the first-step answer uses "authn" but the second document uses "authentication," the intermediate retrieval fails. Embedding-based retrieval handles this better for the second hop; BM25 does not.

**LLM-as-judge evaluation bias:** A practical failure for researchers and builders. The Han et al. paper found that reversing the presentation order of RAG vs GraphRAG outputs can completely invert LLM judge preference judgments. Systems that appear to handle multi-hop better may simply produce more fluent or longer answers. Ground-truth-based metrics (F1, exact match) are more reliable than preference judgments for multi-hop evaluation.

**Abstention weakness:** Multi-hop systems typically return their best guess even when the chain is incomplete. Napkin's BM25 approach scores 50% on abstention tasks because BM25 always returns ranked results — there is no calibrated confidence threshold that signals "the information needed for this chain does not exist." False confidence on multi-hop questions is often worse than admitting ignorance.

**Evaluation benchmark contamination:** Questions on popular multi-hop benchmarks (HotPotQA, MuSiQue, 2WikiMultiHopQA) increasingly appear in LLM training data. Reported numbers on these datasets overestimate real-world multi-hop performance.

## Implementation Guidance

**Match architecture to query distribution.** Profile actual user queries before choosing an approach:
- Mostly single-hop factual lookups → standard RAG
- Multi-hop, comparison, or temporal queries dominate → GraphRAG (local search specifically, not global)
- Mixed distribution → run both and concatenate, accepting 2x retrieval cost for +4-6% accuracy

**Use graph local search, not global search.** Community-based global search consistently underperforms local search on QA by 10-20 F1 points. Global search is for corpus-wide summarization, not factual chaining.

**Test your entity extraction recall before committing to a KG approach.** The ~34% entity miss rate is a population average. Specialized domains (medical terminology, legal citations, technical acronyms) likely have higher miss rates. Measure extraction recall on a sample of your actual data before investing in graph infrastructure.

**Design for error recovery in iterative retrieval.** Single-pass iterative retrieval has no recovery mechanism for early errors. Adding a verification step ("does this intermediate answer make sense given the original query?") or retrieving multiple candidates at each hop reduces compounding failure.

**Smaller, focused documents outperform large aggregated ones for both BM25 and embedding retrieval** in multi-hop scenarios. A per-round note (~2.5K chars) concentrates relevant terms better than a full session log (~15K chars). This applies to both retrieval approaches — chunking strategy matters as much as retrieval algorithm.

**Hide retrieval scores from the LLM.** Exposing numeric confidence or BM25 scores causes models to anchor on the numbers rather than evaluating content relevance. Present ranked results with content snippets; let the model judge relevance from text, not from a number it was not trained to interpret.

## When Standard RAG Is Sufficient

Single-hop factual queries — named entity lookups, specific date or number retrieval, "what does X document say about Y" — do not require multi-hop infrastructure. RAG leads GraphRAG by 1.77-2.74 F1 points on NQ (single-hop) and embedding similarity reliably surfaces the right chunk. Building graph extraction pipelines for a query distribution that is mostly single-hop adds cost and maintenance burden without accuracy benefit.

## Related

- Retrieval-Augmented Generation

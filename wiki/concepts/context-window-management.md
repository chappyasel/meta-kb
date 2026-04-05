---
entity_id: context-window-management
type: concept
bucket: context-engineering
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - repos/infiniflow-ragflow.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - repos/laurian-context-compression-experiments-2508.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/infiniflow-ragflow.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/edge-from-local-to-global-a-graph-rag-approach-to-quer.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Claude Code
last_compiled: '2026-04-05T05:33:47.071Z'
---
# Context Window Management

**Type:** Concept | **Bucket:** Context Engineering

---

## What It Is

Every LLM inference call operates over a fixed-length sequence of tokens. The context window is that sequence: everything the model can "see" when generating a response. Inputs beyond the limit get truncated. Inputs approaching the limit get expensive. Neither outcome is graceful.

Context window management is the set of decisions about what goes into that sequence, in what order, at what granularity, and what gets left out. As models scale from 4K to 1M+ token windows, the problem doesn't disappear; it shifts. Fitting content is no longer the bottleneck. Deciding *which* content deserves the space, and how to structure it so the model reasons well over it, becomes the actual engineering challenge.

[A Survey of Context Engineering](../../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) frames this as a discipline called "context engineering," decomposing it into retrieval, processing, and management layers. The survey's central finding: models are much better at understanding complex contexts than generating equivalently complex outputs. The implication for practitioners is that you can stuff a context window with rich information, but the model's response will be simpler than the input. Architecture decisions need to account for this asymmetry.

---

## Why It Matters

Token budgets constrain every layer of an LLM application:

- **Latency**: Prefill time scales with context length. A 200K-token context costs meaningfully more compute than a 10K-token context.
- **Cost**: API providers charge per token. Context bloat compounds across many calls.
- **Quality**: Longer contexts don't always produce better outputs. Models exhibit attention degradation in the middle of very long sequences (the "lost in the middle" phenomenon). Noisy context hurts reasoning.
- **Statefulness**: LLMs are stateless by default. Maintaining coherent multi-turn conversations or long-running agent loops requires explicit decisions about what to carry forward.

These constraints interact. Reducing context to cut costs can degrade quality. Carrying full conversation history preserves coherence but accumulates tokens fast. Every strategy involves a tradeoff.

---

## Core Mechanisms

### Compression and Summarization

The most common management technique: replace verbose content with compact representations. A 50-page document becomes a 500-word summary. A 20-turn conversation compresses into a structured memory object.

Compression can be lossy (drop content the model judges irrelevant) or structurally preserving (reformat the same content more densely). LLMs work well as compression engines here, but they introduce a second inference call and the risk of compression-induced hallucination, where the summary asserts something the source only implied.

The compression decision point matters. Compressing too early (before retrieval) discards detail that retrieval might need. Compressing too late (just before the main call) adds latency. Most production systems compress asynchronously after ingestion.

### Selective Loading (Retrieval-Augmented Context)

Rather than compressing everything, selective loading retrieves only the chunks relevant to the current query. Retrieval-Augmented Generation (RAG) is the canonical implementation: a vector index stores document embeddings, a retrieval step pulls the top-k semantically similar chunks, and only those chunks enter the context window.

The failure mode is retrieval precision. If the retrieval step misses the relevant document or retrieves too many tangentially related chunks, the model either lacks the information it needs or gets diluted context that hurts reasoning. Reranking (a second-pass model that rescores retrieved chunks) addresses this but adds latency and cost.

Karpathy's LLM-maintained wiki system demonstrates a simpler variant: at small-to-medium scale (~100 articles, ~400K words), LLM agents that maintain index files and brief per-document summaries can retrieve well enough without a vector database. The model reads the index, identifies relevant articles, and loads them. [Source](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md). This works because the index is itself a curated, compressed artifact maintained by the same LLM that will query it.

### Memory Hierarchies

Long-running agents can't carry full history in every call. Memory systems tier information by recency and relevance:

- **Working memory**: The current context window. Everything here is available for this call.
- **Episodic memory**: Recent interaction summaries or stored scratchpad outputs, loaded selectively.
- **Semantic memory**: Persistent knowledge stores (wikis, vector databases, documents) queried as needed.
- **Parametric memory**: Information baked into model weights via fine-tuning. Not retrieved at inference time; always present, always free.

The [Darwin Gödel Machine](../../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) demonstrates that self-improving agents autonomously discover better context and memory management strategies through empirical benchmarking. Agents evolved by DGM improved SWE-bench performance from 20% to 50% partly by developing better long-context handling mechanisms, peer-review steps, and tool use patterns. This is notable because it suggests that optimal context management is not static; it depends on the task, and agents can learn which strategies work.

### Context Structuring

How content is arranged within the window affects model performance. Research consistently shows:

- Critical information placed at the beginning or end of a long context performs better than information buried in the middle.
- Structured formats (XML tags, markdown headers, explicit role delimiters) help models parse which parts of context serve which function.
- Redundant or contradictory information degrades reasoning. A clean context with less information often outperforms a cluttered context with more.

### Sliding Window and Truncation Strategies

For sequential tasks (long conversations, document processing), fixed-length windows slide over content. Truncation strategies determine what to drop:

- **Left truncation**: Drop oldest content. Preserves recent context but loses history.
- **Right truncation**: Drop newest content. Rarely appropriate.
- **Selective truncation**: Drop content by relevance score, keeping both recent and high-relevance older content.
- **Rolling summary**: Replace dropped turns with a periodically updated summary.

---

## Implementation in Claude Code

[Claude Code](../projects/claude-code.md) implements context management at the session level. It tracks which files have been read, which tool outputs have been returned, and which conversation turns are active. As context grows, it selectively summarizes older turns rather than truncating them outright. The system prompt establishes persistent instructions that anchor every call, while the conversation history portion gets managed dynamically.

This reflects the broader pattern: system-level context (instructions, persona, available tools) is treated as fixed. User and assistant turns, tool results, and retrieved content are treated as variable, subject to compression and eviction.

---

## Practical Tradeoffs

**Retrieval vs. full context**: If your dataset fits in a large context window, loading it all outperforms RAG on quality. RAG wins on cost and latency when datasets are large. At Karpathy's ~400K word scale, full-context loads become impractical for most calls; index-based retrieval becomes necessary.

**Summary fidelity**: Summaries lose detail. For Q&A tasks, lossy summaries degrade answer accuracy on edge-case queries. The right compression ratio depends on how frequently edge cases occur in your query distribution.

**Context window size vs. attention quality**: Larger context windows are available (Gemini 1.5 Pro at 1M tokens, several models at 200K+), but performance on content in the middle of very long contexts degrades measurably. Don't assume that a 1M-token window means 1M tokens of usable, uniformly attended content.

**Synthetic data as an exit**: Karpathy notes that as a knowledge base grows, the natural trajectory is fine-tuning the LLM on the accumulated content so the knowledge lives in weights rather than context. [Source](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md). This converts a retrieval problem into a parametric memory problem, eliminating runtime context costs but requiring retraining when the knowledge base updates.

---

## Failure Modes

**Retrieval miss**: The most common RAG failure. The query's embedding doesn't align well with the relevant document's embedding. Hybrid search (BM25 + dense retrieval) reduces but doesn't eliminate this. Mitigation: query rewriting, HyDE (hypothetical document embeddings), reranking.

**Context dilution**: Too many retrieved chunks, or chunks that are topically adjacent but not directly relevant, distribute attention across unhelpful content. The model produces answers that blend multiple sources incorrectly. Mitigation: strict top-k limits, reranking with higher cutoff thresholds.

**Compression hallucination**: The summarization step invents or conflates information. Downstream reasoning is then grounded in a false premise. Hard to detect without ground-truth comparison. Mitigation: structured summarization prompts, factuality checking passes.

**Infrastructure assumption**: Most selective loading systems assume a vector index with sub-second query latency. If the underlying store is slow (large-scale vector search over millions of embeddings, cold-start latency on serverless deployments), retrieval stalls the entire pipeline. This is rarely discussed in architectural recommendations.

---

## When Not to Use Sophisticated Management

If your application is simple (short conversations, bounded document sets, single-turn queries), complex context management adds engineering overhead without meaningful benefit. A single well-structured prompt with relevant content loaded directly outperforms a retrieval system on latency, cost, and debuggability for small-scale use.

Context management complexity is warranted when: datasets exceed the practical context limit, conversations run long enough that full history becomes expensive, or multiple agents share state across many calls.

---

## Unresolved Questions

The [survey](../../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) identifies the output asymmetry as a "defining priority for future research" but provides no concrete path to closing it. Current models can process rich, complex contexts but generate simpler outputs; whether this is an architectural constraint or a training data artifact remains unclear.

For production systems: how to measure context quality empirically (beyond downstream task accuracy) is an open problem. Most teams tune context strategies by running evals, but eval coverage is incomplete by definition.

---

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md)
- Retrieval-Augmented Generation
- Memory Systems
- [Claude Code](../projects/claude-code.md)

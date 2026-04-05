---
entity_id: context-compression
type: approach
bucket: context-engineering
sources:
  - repos/aiming-lab-simplemem.md
  - repos/helloruru-claude-memory-engine.md
  - repos/microsoft-llmlingua.md
  - repos/laurian-context-compression-experiments-2508.md
related:
  - Retrieval-Augmented Generation
  - LangChain
  - Long-Term Memory
  - LLMLingua
  - MInference
  - Context Bloat
  - vLLM
last_compiled: '2026-04-04T21:18:55.203Z'
---
# Context Compression

## What It Is

Context compression is a collection of techniques for reducing the amount of text passed to LLMs while retaining the information needed to answer a query or complete a task. As LLM usage scales, raw context—retrieved documents, conversation history, tool outputs—accumulates faster than context windows can accommodate, and larger contexts mean higher cost and latency even when they do fit. Compression trades some processing overhead upfront for cheaper, faster inference downstream.

The core problem it addresses: more context isn't always better. Irrelevant tokens dilute attention, waste compute, and inflate cost. [Context Bloat](../concepts/context-bloat.md) is the failure mode; compression is one class of mitigation.

## Why It Matters

At inference time, every token costs money and adds latency. In Retrieval-Augmented Generation pipelines, retrieved chunks often contain mostly irrelevant surrounding text. In long agentic sessions, conversation history grows unboundedly. Without compression, the practical choice is either truncation (losing information) or paying for full-length contexts at scale (expensive). Compression tries to find a third path.

## How It Works

There are several distinct mechanisms, often used in combination:

### Extractive / Relevance Filtering
A secondary (cheaper) model reads each retrieved document and extracts only the passages relevant to the current query. LangChain's `LLMChainExtractor` is a common implementation pattern. Production experience suggests this is more accurate than pure semantic similarity (embedding-based chunk selection), but it adds a latency hop and can fail with smaller/cheaper models. [Source](../../raw/repos/laurian-context-compression-experiments-2508.md)

### Selective Token Removal (LLMLingua approach)
[LLMLingua](../projects/llmlingua.md) uses a small language model to score each token's importance and drops low-importance tokens, producing a compressed prompt that is grammatically mangled but semantically preserved for the downstream LLM. Claimed compression ratios up to 20x with minimal accuracy loss on benchmarks. Published at EMNLP 2023 and ACL 2024. [Source](../../raw/repos/microsoft-llmlingua.md)

### KV Cache Compression
Rather than compressing the input text, KV cache compression reduces the internal representation stored during inference. [MInference](../projects/minference.md) and LLMLingua-2 both address this layer. Useful when the same context is reused across many requests.

### Summarization
A model rewrites verbose content into a shorter form. Higher information loss than extractive methods, but works when the downstream task needs the gist rather than exact text. Common for conversation history compression between sessions.

### Semantic Lossless Compression (Memory Systems)
Systems like [SimpleMem](../projects/simplemem.md) apply compression to agent memory across sessions—storing and merging memories in a way that prevents unbounded token growth without discarding semantically distinct information. Multimodal support (text, image, audio, video) is an emerging feature. [Source](../../raw/repos/aiming-lab-simplemem.md)

## Who Implements It

| Tool | Approach | Notes |
|---|---|---|
| [LLMLingua](../projects/llmlingua.md) | Token-level selective removal | Up to 20x compression; peer-reviewed |
| [LangChain](../projects/langchain.md) | Extractive filtering | `LLMChainExtractor`, `ContextualCompressionRetriever` |
| [SimpleMem](../projects/simplemem.md) | Semantic lossless memory compression | Focus on agent lifelong memory |
| [MInference](../projects/minference.md) | KV cache / attention sparsity | Inference-level, not prompt-level |
| vLLM | KV cache management | Prefix caching, not compression per se |

## Practical Implications

**RAG pipelines** benefit most obviously—retrieved documents often contain 80%+ irrelevant text relative to any specific query. Compression before the main LLM call can dramatically reduce per-query cost.

**Agentic systems** face a different problem: history grows over time. Without compression or summarization, context windows fill up and either truncation or model upgrades become necessary.

**Compression can fail**. Production experiments with cheaper models (e.g., gpt-4o-mini) show meaningful failure rates on extractive compression. Prompt optimization approaches (DSPy GEPA, TextGrad) can recover ~30%+ of those failures without upgrading the model, but this adds engineering complexity. [Source](../../raw/repos/laurian-context-compression-experiments-2508.md)

## Strengths

- Reduces inference cost and latency, often substantially
- Can improve accuracy by removing distracting/irrelevant content (attention dilution)
- Composable with most existing RAG and agent architectures
- Some methods (LLMLingua) are model-agnostic

## Limitations

- Adds a compression step with its own latency and cost (a secondary LLM call or a scoring model)
- Lossy methods risk discarding information that turns out to be relevant
- Compression quality depends on the quality of the compressor model—cheap compressors fail non-trivially
- Evaluation is hard: you may not know what was lost until the downstream task fails
- Token removal approaches produce ungrammatical text that may confuse some LLMs
- Not a substitute for good retrieval; compressing irrelevant documents doesn't fix a broken retrieval step

## Alternatives and Complements

- **Retrieval-Augmented Generation**: Better retrieval precision reduces how much irrelevant text arrives in the first place
- **[Long-Term Memory](../concepts/long-term-memory.md)**: Storing information externally and retrieving selectively, rather than compressing what's in context
- **Extended context windows**: Hardware and architectural improvements (longer windows, linear attention) reduce the pressure to compress, but don't eliminate cost scaling

In practice, compression complements rather than replaces these approaches—better retrieval plus compression is more effective than either alone.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — alternative_to (0.4)
- [LangChain](../projects/langchain.md) — implements (0.5)
- [Long-Term Memory](../concepts/long-term-memory.md) — alternative_to (0.5)
- [LLMLingua](../projects/llmlingua.md) — implements (0.9)
- [MInference](../projects/minference.md) — implements (0.8)
- [Context Bloat](../concepts/context-bloat.md) — alternative_to (0.8)
- vLLM — implements (0.4)

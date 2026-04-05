# LLMLingua

> Microsoft's prompt compression library that achieves up to 20x compression with minimal performance loss, using small language models to remove non-essential tokens -- published at EMNLP'23 and ACL'24.

## What It Does

LLMLingua uses compact, well-trained language models (GPT-2-small, LLaMA-7B, or BERT-level encoders) to identify and remove non-essential tokens from prompts before sending them to large LLMs. This reduces inference cost, speeds up generation, and extends effective context length. The library has three variants: LLMLingua (original, EMNLP'23), LongLLMLingua (optimized for long contexts, fixes "lost in the middle" problem, ACL'24), and LLMLingua-2 (3-6x faster than v1, uses data distillation from GPT-4 for task-agnostic compression). A fourth extension, SecurityLingua, applies compression for jailbreak attack detection with 100x less token cost than other guardrails.

## Architecture

Python library (`pip install llmlingua`). The compression pipeline runs a small model to score token importance, then removes low-importance tokens while preserving semantic content and key information. LLMLingua uses budget-constrained token pruning. LongLLMLingua adds question-aware compression with context reordering to mitigate middle-loss. LLMLingua-2 uses a BERT-level encoder trained via data distillation from GPT-4 for token classification, making it task-agnostic and 3-6x faster. Supports structured compression via `<llmlingua>` tags for fine-grained control over which sections to compress and at what rate. Quantized model support (GPTQ) reduces GPU memory to under 8GB.

## Key Numbers

- 5,985 GitHub stars, 358 forks
- Up to 20x prompt compression with minimal performance loss
- LongLLMLingua improves RAG performance by 21.4% using only 1/4 of tokens
- LLMLingua-2 is 3-6x faster than LLMLingua
- SecurityLingua: 100x less token cost than state-of-the-art LLM guardrails
- Integrated into LangChain, LlamaIndex, and Microsoft Prompt Flow
- MIT license

## Strengths

- 20x compression directly translates to 20x cost reduction for API-priced LLM calls -- the ROI is immediate and measurable
- Drop-in integration with LangChain and LlamaIndex means existing RAG pipelines can compress retrieved context without architectural changes
- Structured compression tags give developers precise control over what gets compressed and what stays verbatim
- Three variants cover different trade-offs: quality (v1), long-context (Long), speed (v2)

## Limitations

- Compression is lossy -- some information is irreversibly removed, and there is no guarantee that the specific tokens needed for a given query survive
- Requires running a separate model (GPT-2/LLaMA/BERT) for compression, adding latency and GPU memory overhead
- Effectiveness varies by domain -- highly technical or code-heavy content compresses worse than natural language
- Does not address retrieval quality -- compresses what you give it, regardless of whether the right content was retrieved

## Alternatives

- [pageindex.md](pageindex.md) -- use when the problem is retrieval accuracy, not context length
- [openviking.md](openviking.md) -- use when you want hierarchical context loading (L0/L1/L2) instead of lossy compression
- [supermemory.md](supermemory.md) -- use when you need a full memory system rather than just prompt compression

## Sources

- [Source](../../raw/repos/microsoft-llmlingua.md) -- "To speed up LLMs' inference and enhance LLM's perceive of key information, compress the prompt and KV-Cache, which achieves up to 20x compression with minimal performance loss."

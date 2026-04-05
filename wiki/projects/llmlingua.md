# LLMLingua

> Microsoft's prompt compression library that uses small language models to identify and remove non-essential tokens, achieving up to 20x compression with minimal performance loss -- directly addressing the cost and latency bottleneck in RAG and long-context inference.

## What It Does

LLMLingua takes a prompt and compresses it by selectively removing tokens that a small, well-trained language model (GPT-2-small, LLaMA-7B, or BERT-level encoder) identifies as non-essential. The compressed prompt preserves the key information that large LLMs need to generate correct responses. Three variants exist: LLMLingua (original, budget-constrained compression), LongLLMLingua (mitigates "lost in the middle" for long contexts, improves RAG by 21.4% with 1/4 tokens), and LLMLingua-2 (3-6x faster via data distillation from GPT-4 into a BERT-level token classifier). A fourth variant, SecurityLingua, uses compression to reveal malicious intent in jailbreak attacks.

## Architecture

The compression pipeline:

1. **Token scoring**: A small LM (compressor model) scores each token's importance based on perplexity/entropy
2. **Selective removal**: Non-essential tokens are dropped according to a target compression ratio or token budget
3. **Structured compression**: Optional `<llmlingua>` tags let users define per-section compression rates and exclude critical segments

LLMLingua-2 replaces the perplexity-based approach with a BERT-level encoder trained via data distillation from GPT-4 for token classification, making it task-agnostic and 3-6x faster. Supports structured prompts with section-level compression control. Also supports KV-Cache compression for inference acceleration.

Integrated into LangChain, LlamaIndex, and Microsoft Prompt Flow.

## Key Numbers

- **5,985 GitHub stars**, 358 forks
- **Up to 20x compression** with minimal performance loss
- **21.4% RAG improvement** with LongLLMLingua using only 1/4 of tokens
- **3-6x speed improvement** with LLMLingua-2 over v1
- 3 peer-reviewed papers (EMNLP 2023, ACL 2024, ACL 2024 Findings)
- SecurityLingua: 100x less token cost vs. state-of-the-art LLM guardrails
- MIT license, Python

## Strengths

- Three peer-reviewed papers (EMNLP, ACL) provide rigorous evidence that compression preserves reasoning quality -- this is not just empirical hand-waving
- Direct integration with LangChain and LlamaIndex means RAG builders can add compression as a post-processing step without architectural changes

## Limitations

- Compression is lossy by design -- at aggressive ratios (15-20x), edge cases and nuanced details can be dropped, requiring careful tuning per use case
- Requires running a small LM (GPT-2 or BERT-level) for compression, adding a GPU/CPU dependency that purely API-based systems avoid

## Alternatives

- [pageindex.md](pageindex.md) -- use when you want to eliminate chunking entirely via reasoning-based retrieval rather than compressing retrieved chunks
- [hipporag.md](hipporag.md) -- use when you want to improve retrieval quality via knowledge graph structure rather than compressing what you retrieve

## Sources

- [microsoft-llmlingua.md](../../raw/repos/microsoft-llmlingua.md) -- "LLMLingua utilizes a compact, well-trained language model to identify and remove non-essential tokens in prompts, achieving up to 20x compression with minimal performance loss"

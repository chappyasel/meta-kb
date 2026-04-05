---
entity_id: llmlingua
type: project
bucket: context-engineering
sources:
  - repos/microsoft-llmlingua.md
related:
  - Context Compression
last_compiled: '2026-04-04T21:20:40.819Z'
---
# LLMLingua

## What It Does

LLMLingua is a family of prompt compression tools from Microsoft Research that use small language models (SLMs) to identify and remove redundant tokens from prompts before sending them to larger, more expensive LLMs. The goal is to reduce token count—and therefore cost and latency—while preserving task-relevant information.

The family has evolved across multiple generations:
- **LLMLingua** (EMNLP 2023): Original approach using perplexity-based token scoring
- **LLMLingua-2**: Improved compression with better semantic preservation
- **LongLLMLingua**: Optimized for long-context scenarios (RAG, document QA)

## What's Unique

The core insight is using a small, cheap model to score token importance before sending context to a large, expensive one. Rather than summarizing or extracting (which requires generation), LLMLingua does *selective deletion*—tokens with high perplexity under the SLM (i.e., surprising or non-redundant tokens) are kept; low-perplexity (predictable, redundant) tokens are dropped. This preserves the original tokens and their order without hallucinating new content.

## Key Numbers

| Metric | Value |
|--------|-------|
| GitHub Stars | ~6,000 |
| Max compression ratio | 20× |
| License | MIT |
| Published | EMNLP 2023, ACL 2024 |
| Language | Python |

Claimed: up to 20× compression with minimal performance loss on downstream tasks.

## Architecture Summary

1. A small LM (e.g., LLaMA-7B or similar) scores each token by perplexity
2. Tokens below an importance threshold are removed
3. The compressed prompt is sent to the target LLM
4. LongLLMLingua adds document-level reordering to surface relevant chunks first

Integrates with LangChain and LlamaIndex, making it drop-in compatible with common RAG pipelines.

## Strengths

- **Cost reduction**: 20× compression = roughly 20× fewer tokens billed
- **Latency**: Smaller context → faster inference on the target model
- **RAG-friendly**: LongLLMLingua specifically targets multi-document retrieved contexts
- **No target model changes**: Works as preprocessing; target LLM is unmodified
- **Open source**: MIT license, commercially usable
- **Non-generative**: Deletion-based approach avoids hallucination risk from summarization

## Limitations

- **Requires a local SLM**: You need to run a scoring model (e.g., 7B parameters), which adds infrastructure overhead and may negate savings at small scale
- **Compression quality varies**: Performance degrades on tasks requiring precise numerical data, code, or structured formats where "redundant" tokens may actually matter
- **Perplexity as proxy**: Token importance is inferred indirectly; the SLM's perplexity may not perfectly align with what the target LLM actually needs
- **Benchmark gap**: Most evaluations are on QA benchmarks—real-world performance on diverse tasks is less documented
- **Latency tradeoff**: Running the SLM scorer adds wall-clock time; the net latency gain depends on the cost ratio between scoring and target inference

## Alternatives

| Tool | Approach | Notes |
|------|----------|-------|
| [Selective Context](../projects/) | Sentence-level filtering | Coarser granularity |
| Summarization (GPT-4 etc.) | Generative | Higher quality, higher cost, hallucination risk |
| Rerankers (Cohere, BGE) | Chunk selection | Works at retrieval level, not token level |
| KV-cache compression | Architectural | Requires model access, not a preprocessing step |

## Practical Fit

Best suited for RAG pipelines with large retrieved contexts where the retrieved documents contain substantial redundancy (boilerplate, repetitive passages, off-topic sentences). Less useful when every token matters (code, structured data, short prompts) or when you lack the infrastructure to run a scoring SLM.

**Related concepts**: [Context Compression](../concepts/context-compression.md)

**Sources**: [Source](../../raw/repos/microsoft-llmlingua.md)


## Related

- [Context Compression](../concepts/context-compression.md) — implements (0.9)

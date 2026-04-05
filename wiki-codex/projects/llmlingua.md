# LLMLingua

> Microsoft’s prompt-compression family for turning oversized contexts into smaller, cheaper, more focused prompts. [Source](../../raw/repos/microsoft-llmlingua.md)

## What It Does

LLMLingua compresses prompts by removing lower-value tokens, with variants aimed at long-context inference, RAG, KV-cache efficiency, and even safety guardrails. [Source](../../raw/repos/microsoft-llmlingua.md)

## Architecture

The repo uses smaller models to identify what can be compressed away while preserving task performance. LongLLMLingua specifically targets the “lost in the middle” problem in long RAG contexts. [Source](../../raw/repos/microsoft-llmlingua.md)

## Key Numbers

- 5,985 GitHub stars. [Source](../../raw/repos/microsoft-llmlingua.md)
- Up to 20x compression with minimal performance loss is the headline claim. [Source](../../raw/repos/microsoft-llmlingua.md)
- LongLLMLingua reports up to 21.4% RAG improvement using one quarter of the tokens. [Source](../../raw/repos/microsoft-llmlingua.md)

## Strengths

- One of the strongest cost-control layers in the corpus. [Source](../../raw/repos/microsoft-llmlingua.md)
- Useful as an add-on rather than a full memory-system rewrite. [Source](../../raw/repos/microsoft-llmlingua.md)

## Limitations

- Compression fixes bloated context assembly, not the deeper question of what should be persisted or retrieved. [Source](../../raw/repos/microsoft-llmlingua.md)

## Alternatives

- [OpenViking](openviking.md) when you want progressive disclosure at the storage layer.
- [Napkin](napkin.md) when you prefer structural filtering before compression.

## Sources

- [LLMLingua repo](../../raw/repos/microsoft-llmlingua.md)

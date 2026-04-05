# Mem0

> Universal memory layer for AI agents that manages persistent memory across user, session, and agent abstraction levels, decoupling memory from LLM choice so builders can add adaptive personalization without rebuilding the memory stack for each model.

## What It Does

Mem0 extracts structured memory (attributes, events, facts, relationships) from conversations and stores it in a multi-level hierarchy: user memories persist across all interactions, session memories scope to a single conversation, and agent memories capture the agent's own learned behaviors. At retrieval time, Mem0 selectively surfaces relevant memories rather than dumping full context, which is why it beats naive RAG on both accuracy and token cost. The API is three calls: `memory.add()`, `memory.search()`, and `memory.get()`. Available as a self-hosted Python/Node package or a managed platform with analytics.

## Architecture

Python SDK wrapping a pluggable vector store backend. Memory extraction uses an LLM (defaults to GPT-4.1-nano) to parse conversations into structured memory entries. Retrieval uses semantic search over the vector store, filtered by user/session/agent scope. LLM-agnostic: swap the underlying model without changing the memory layer. Also ships a CLI (`mem0 init`, `mem0 add`, `mem0 search`) and browser extension for ChatGPT/Perplexity/Claude. Integrations with LangGraph, CrewAI, and other orchestration frameworks.

## Key Numbers

- 51,880 GitHub stars, 5,805 forks
- +26% accuracy over OpenAI Memory on the LOCOMO benchmark
- 91% faster responses than full-context approaches
- 90% fewer tokens than full-context approaches
- Y Combinator S24 batch
- Apache-2.0 license

## Strengths

- Multi-level memory abstraction (user/session/agent) handles real production scenarios where different scopes need different retention policies
- Documented benchmarks against a credible baseline (OpenAI Memory on LOCOMO) provide concrete evidence of value over built-in solutions
- LLM-agnostic design means the memory layer survives model migrations
- Minimal integration surface (3 API calls) reduces adoption friction

## Limitations

- Memory extraction quality depends entirely on the underlying LLM; cheaper models produce lower-quality memory entries
- No built-in temporal reasoning: memories are current-state, not versioned with validity windows
- Vector-only retrieval lacks the relationship traversal that graph-based approaches provide

## Alternatives

- [Letta](letta.md) -- use when you want agents to directly read/write their own memory blocks rather than having an external system manage memory
- [Memori](memori.md) -- use when you want SQL-native structured memory with explicit schemas rather than LLM-extracted entries
- [Graphiti](graphiti.md) -- use when you need temporal reasoning with validity windows and provenance tracking

## Sources

- [mem0ai/mem0](../../raw/repos/mem0ai-mem0.md) -- "+26% Accuracy over OpenAI Memory on the LOCOMO benchmark... 91% Faster Responses... 90% Lower Token Usage"

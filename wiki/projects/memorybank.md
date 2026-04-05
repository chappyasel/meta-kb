---
entity_id: memorybank
type: project
bucket: agent-memory
sources:
  - repos/zhongwanjun-memorybank-siliconfriend.md
related:
  - Agent Memory
last_compiled: '2026-04-04T21:20:25.124Z'
---
# MemoryBank

## What It Is

MemoryBank is a long-term memory mechanism for LLMs that simulates human-like memory dynamics, including selective forgetting and reinforcement. It was published alongside the paper [MemoryBank: Enhancing Large Language Models with Long-Term Memory](https://arxiv.org/pdf/2305.10250.pdf) and demonstrated through **SiliconFriend**, a companion AI application built on top of it.

The core idea: instead of treating all stored memories equally (as most RAG-style approaches do), MemoryBank applies Ebbinghaus forgetting curve dynamics—memories decay over time unless reinforced by repeated access or high-significance events.

## Key Numbers

| Metric | Value |
|---|---|
| GitHub Stars | 419 |
| Forks | 60 |
| Language | Python |
| License | MIT |

## Architecture Summary

MemoryBank operates across three functional layers:

1. **Memory Storage** — Interactions and events are encoded and stored as discrete memory units, not raw conversation history.
2. **Memory Updating** — A forgetting curve function modulates each memory's retrieval weight over time. Memories accessed frequently or flagged as significant are reinforced; others decay. This prevents unbounded context growth without naive truncation.
3. **Retrieval & Synthesis** — At query time, relevant memories are retrieved by relevance and current weight, then synthesized into a user personality model that informs the LLM's response.

The SiliconFriend demo applies this to multi-session companionship, where maintaining coherent user models across weeks or months is the primary challenge.

## What's Unique

Most [Agent Memory](../concepts/agent-memory.md) implementations treat memory as either full context (expensive, limited) or flat vector retrieval (no temporal weighting). MemoryBank's distinguishing feature is **time-aware memory decay**—the retrieval score for a memory is a function of both semantic relevance *and* how much it has faded since last reinforcement. This better models how human relationship knowledge actually works: preferences and personality traits matter more when they're recent or repeatedly confirmed.

## Strengths

- Addresses a real gap: long-horizon conversational coherence without unbounded context
- Theoretically grounded in cognitive science (Ebbinghaus forgetting curve)
- Produces evolving user personality models rather than static fact stores
- MIT licensed, Python-based, reasonably accessible codebase

## Limitations

- **Modest adoption**: 419 stars is limited for a research artifact; real-world production use cases are unclear
- **Forgetting curve parameters** (decay rates, reinforcement thresholds) likely require tuning per domain—the paper doesn't offer robust guidance here
- **Significance detection** for reinforcement is non-trivial; if the significance signal is noisy, the decay mechanism misfires
- Companion/emotional AI framing may limit perceived applicability to more general agent use cases
- No evidence of integration with mainstream agent frameworks (LangChain, LlamaIndex, etc.)

## Alternatives

| Project | Approach |
|---|---|
| Naive RAG | Flat vector retrieval, no temporal weighting |
| [Mem0](../projects/mem0.md) | Production-oriented memory layer, simpler decay model |
| Full context window | No retrieval, just token limits |
| MemGPT / Letta | Hierarchical memory with explicit paging |

## Source

[Source](../../raw/repos/zhongwanjun-memorybank-siliconfriend.md)


## Related

- [Agent Memory](../concepts/agent-memory.md) — implements (0.8)

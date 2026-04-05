# Mem0

> A widely adopted multi-level memory layer that treats persistence as an external service rather than as prompt stuffing. [Source](../../raw/repos/mem0ai-mem0.md)

## What It Does

Mem0 provides hosted and self-hosted memory for user, session, and agent scopes, plus APIs and SDKs for adding and retrieving memories around model calls. [Source](../../raw/repos/mem0ai-mem0.md)

## Architecture

The design centers on selective retrieval: search for a small set of relevant memories, inject them into generation, and write back new memories after the interaction. The system is explicitly model-agnostic and available via Python, JavaScript, and CLI surfaces. [Source](../../raw/repos/mem0ai-mem0.md)

## Key Numbers

- 51,880 GitHub stars. [Source](../../raw/repos/mem0ai-mem0.md)
- +26% accuracy over OpenAI Memory on LOCOMO, 91% faster responses, and 90% lower token usage than full context according to the repo. [Source](../../raw/repos/mem0ai-mem0.md)

## Strengths

- Clear production abstraction and large adoption footprint. [Source](../../raw/repos/mem0ai-mem0.md)
- Strong evidence that selective memory beats replaying transcripts. [Source](../../raw/repos/mem0ai-mem0.md)

## Limitations

- Public materials emphasize benchmark wins and integrations more than contradiction handling or governance policy detail. [Source](../../raw/repos/mem0ai-mem0.md)

## Alternatives

- [Graphiti](./graphiti.md) for temporal graph semantics.
- [Memori](./memori.md) for SQL-native structured memory extraction.

## Sources

- [Mem0 repo](../../raw/repos/mem0ai-mem0.md)

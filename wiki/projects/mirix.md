# Mirix

> Multi-agent personal assistant with a six-component specialized memory architecture (Core, Episodic, Semantic, Procedural, Resource, Knowledge Vault) that builds memory through screen observation and natural conversation. Key differentiator: routes queries to domain-specific memory stores rather than searching a flat vector index.

## What It Does

Mirix captures real-time visual data from screen activity and consolidates it into structured memories across six specialized components, each managed by a dedicated agent. Core Memory stores identity and persona blocks. Episodic Memory records what happened and when. Semantic Memory holds facts and concepts. Procedural Memory captures how-to knowledge. Resource Memory tracks external references. Knowledge Vault serves as long-term deep storage. The system processes multi-modal input (text, images, voice, screen captures) and provides advanced search combining PostgreSQL-native BM25 full-text search with vector similarity. All long-term data is stored locally with user-controlled privacy settings.

## Architecture

Python backend deployed via Docker Compose. PostgreSQL for storage with both BM25 full-text and vector similarity search. A meta-agent orchestrates six specialized memory agents, each responsible for one memory type. Configurable LLM and embedding backends (example uses Gemini 2.0 Flash with text-embedding-004). Python client library (`mirix-client` on PyPI) provides the API: `initialize_meta_agent()` configures the agent hierarchy, `add()` stores conversation messages, `retrieve_with_conversation()` queries across memory types. Dashboard at localhost:5173, API at localhost:8531. Built on the Letta framework's open-source foundation.

## Key Numbers

- 3,508 GitHub stars, 274 forks
- 6 memory components, each with a dedicated agent
- BM25 + vector similarity hybrid search
- Supports Gemini, OpenAI, and compatible embedding backends
- Apache-2.0 license
- arXiv paper: 2507.07957

## Strengths

- Cognitive-science-inspired memory separation (episodic vs semantic vs procedural) enables type-appropriate retrieval strategies
- Screen capture grounding connects abstract memory to concrete visual observations, reducing hallucination
- Privacy-first local storage with Docker deployment avoids cloud dependency for sensitive personal data

## Limitations

- Full Docker stack (PostgreSQL, backend, dashboard) is heavy infrastructure for a personal assistant
- Built on Letta framework; inherits its abstractions and limitations, which may not align with other agent architectures
- Screen capture feature requires desktop access and raises practical concerns about storage volume and processing cost

## Alternatives

- [simplemem.md](simplemem.md) — use when you want multimodal memory with semantic compression rather than cognitive-type separation
- [napkin.md](napkin.md) — use when you want lightweight file-based memory without specialized memory agents
- [lossless-claw.md](lossless-claw.md) — use when the problem is conversation history management rather than multi-type memory architecture

## Sources

- [../../raw/repos/mirix-ai-mirix.md](../../raw/repos/mirix-ai-mirix.md) — "six specialized memory components (Core, Episodic, Semantic, Procedural, Resource, Knowledge Vault) managed by dedicated agents"

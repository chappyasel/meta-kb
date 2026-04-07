---
entity_id: memorybank
type: project
bucket: agent-memory
abstract: >-
  MemoryBank adds Ebbinghaus-inspired forgetting curves to LLM memory,
  dynamically updating and retiring facts based on recency and importance rather
  than accumulating them indefinitely.
sources:
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - repos/bingreeky-memevolve.md
  - repos/memorilabs-memori.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/bingreeky-memevolve.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - openclaw
  - openai
  - mcp
last_compiled: '2026-04-07T11:59:21.102Z'
---
# MemoryBank

## What It Does

MemoryBank is a memory mechanism for LLMs that models human-like forgetting. Where most agent memory systems accumulate facts indefinitely and rely on retrieval to surface relevant ones, MemoryBank explicitly expires and deprioritizes memories over time using the Ebbinghaus forgetting curve: memories decay unless reinforced by repeated access. The system also extracts user personality summaries as a separate memory tier, giving it both episodic (event-based) and semantic (trait-based) storage.

The core differentiator is the forgetting mechanism itself. Retrieval-based systems like [Mem0](../projects/mem0.md) and [Zep](../projects/zep.md) let memory grow without bound, controlling relevance through vector similarity at query time. MemoryBank controls relevance through temporal decay, modifying memory strength before retrieval happens. This shifts the design philosophy: rather than "store everything, filter at recall," MemoryBank asks "what would a human still remember after N days?"

## Core Mechanism

The Ebbinghaus model computes memory retention as:

**R(t) = e^(-t/S)**

where `t` is elapsed time since last access and `S` is memory stability (a function of how many times the memory has been reinforced). Each memory entry carries a retrieval count and last-access timestamp. When the system retrieves a memory, it updates both values, increasing stability and resetting the decay clock. Memories whose computed retention falls below a threshold are either deprioritized in ranking or purged.

Memory storage uses [FAISS](../projects/faiss.md) for vector retrieval, with memories stored as text chunks with associated metadata (timestamps, retrieval counts, stability scores). At recall time, candidate memories pass through a two-stage filter: vector similarity (cosine distance from the query embedding) followed by retention score weighting. Highly similar but rarely-accessed old memories rank lower than moderately similar but frequently-reinforced ones.

The personality summary tier operates separately. Periodically, the system runs an LLM-based summarization pass over recent conversation history, extracting stable user traits (preferences, communication style, background) into a separate summary document. This summary is always injected into context regardless of the forgetting curve, functioning as [Core Memory](../concepts/core-memory.md) in [Letta](../projects/letta.md)'s terminology.

The architecture also includes a "memory update" step distinct from insertion: when a new memory contradicts an existing one (e.g., user changes job), the system can overwrite rather than append, reducing the contradictory-facts accumulation problem that plagues purely additive memory systems.

## Key Numbers

MemoryBank was evaluated on a custom long-term conversation dataset (SiliconFriend) with GPT-4 as judge. Reported results show improvements over no-memory baselines on empathy, persona consistency, and factual recall metrics. These results are **self-reported by the original paper authors** and have not been independently reproduced on standard benchmarks like [LoCoMo](../projects/locomo.md) or [LongMemEval](../projects/longmemeval.md). The paper targets ChatYuan and ChatGLM as base models, which limits direct comparisons to GPT-4-class systems evaluated in competing work.

The GitHub repository has several hundred stars but is primarily a research artifact rather than a maintained production library.

## Strengths

**Principled memory pruning.** Most memory systems have no answer to "how does memory stay tractable over months of use?" MemoryBank's forgetting curve provides a theoretically grounded answer. Facts the user never revisits gradually fade; facts they reinforce (by mentioning repeatedly or asking about) persist. This mirrors how human memory works and naturally handles the case where old information becomes stale or irrelevant.

**Contradictory memory handling.** The explicit update mechanism, where new memories can overwrite conflicting old ones, addresses a real failure mode in additive systems. A user who moves cities, changes jobs, or updates preferences will eventually create contradictions in append-only stores. MemoryBank's architecture has a path to resolving this.

**Dual-tier design.** Separating episodic event memories (subject to forgetting) from semantic personality summaries (stable, always-present) maps well onto how long-term assistant relationships actually work. Knowing someone prefers bullet points should never decay; knowing what they ordered for lunch last Tuesday should.

## Critical Limitations

**Concrete failure mode: calibration sensitivity.** The forgetting curve has two free parameters: initial stability and the decay rate. The system sets these as constants or uses simple heuristics. But different memory types warrant different stability profiles: a user's name should have near-infinite stability, while a temporary preference ("I'm in a meeting, keep responses short") should decay within hours. With uniform parameters, either important facts decay too fast or trivial facts never leave. The paper does not provide principled guidance on parameter selection, and production deployments would require significant empirical tuning per domain.

**Unspoken infrastructure assumption.** MemoryBank assumes all interactions flow through a single memory system with accurate timestamps. In practice, users interact across multiple interfaces, sessions have gaps, and timestamps may not reflect actual conversation time (batch imports, API replays). The forgetting curve computes decay from "time since last access" -- but if access logs are incomplete or the system hasn't been queried in two weeks due to user inactivity (not forgetting), the model will incorrectly decay memories the user actually remembers fine. The system has no mechanism to distinguish "user forgot this" from "user didn't mention this recently."

## When NOT to Use It

Skip MemoryBank when:

- You need production-grade reliability. The repository is a research artifact without active maintenance or versioning guarantees.
- Your use case involves high-stakes persistent facts (medical history, legal preferences, account settings). The forgetting mechanism can delete information the user explicitly provided. Systems like [Letta](../projects/letta.md) with explicit core memory tiers handle this more safely.
- You're building on top of GPT-4-class models and need benchmark-validated performance. MemoryBank's evaluations use older Chinese LLMs; the architecture may work on GPT-4 but this hasn't been validated against current baselines.
- You need multi-user or multi-session memory with attribution. The research codebase doesn't address the entity-scoping concerns that production multi-tenant systems require.
- You're comparing against [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), or [Letta](../projects/letta.md) on standard benchmarks. None of MemoryBank's results appear on shared leaderboards, making comparison impossible.

## Unresolved Questions

**Parameter governance at scale.** How should decay rate and stability parameters be set for different memory types? The paper uses fixed values but provides no analysis of sensitivity or domain-specific recommendations.

**Conflict resolution semantics.** When does a new memory overwrite an old one versus coexist with it? The system needs some similarity threshold to detect conflicts, but the paper doesn't specify this mechanism or its failure modes when the threshold is wrong.

**Cost at scale.** The periodic personality summarization step requires an LLM call over recent history. At what conversation volume does this become expensive? Is it batched, triggered by event count, or run on a schedule? The paper doesn't address operational costs for systems with thousands of users.

**Interaction with [RAG](../concepts/rag.md) pipelines.** MemoryBank is positioned as a standalone memory layer. How it composes with document retrieval, tool use, or other context sources is unexplored. The context budget competition between decayed-but-retrieved memories and fresh document retrievals has no principled resolution.

## Relationship to Broader Concepts

MemoryBank is an instance of [Episodic Memory](../concepts/episodic-memory.md) with explicit temporal dynamics. It sits within the broader [Agent Memory](../concepts/agent-memory.md) design space but occupies a specific niche: time-aware memory management for long-running personal assistants rather than task-completion agents.

The forgetting curve connects to [Continual Learning](../concepts/continual-learning.md) literature, where [Catastrophic Forgetting](../concepts/catastrophic-forgetting.md) is the central problem. MemoryBank addresses a related but distinct concern: external memory stores don't suffer catastrophic forgetting, but they do suffer from information staleness and unbounded growth. The Ebbinghaus approach handles staleness through decay; growth is handled implicitly by pruning low-retention entries.

The [Memory Evolution](../concepts/memory-evolution.md) approach taken by [MemEvolve](../projects/memevolve.md) is architecturally orthogonal: MemEvolve evolves the memory architecture itself, while MemoryBank assumes a fixed architecture and evolves memory contents through forgetting dynamics. A combined system might use MemEvolve to discover optimal decay parameters for a given domain.

## Alternatives

- **[Mem0](../projects/mem0.md)**: Production-maintained, benchmark-validated on LoCoMo, supports entity attribution and conflict detection. Use when you need a maintained library with community support and independent performance validation.
- **[Letta](../projects/letta.md)**: Explicit memory tier separation (core, archival, recall) with fine-grained control. Use when you need deterministic control over what persists versus what can be forgotten.
- **[Zep](../projects/zep.md)**: Temporal knowledge graph with session-aware retrieval. Use when you need structured relationship tracking alongside episodic memory.
- **[Graphiti](../projects/graphiti.md)**: Graph-based memory with temporal edges. Use when your use case involves reasoning over relationships between entities rather than personal preference recall.

Use MemoryBank when you're building a research prototype exploring human-inspired memory dynamics and want a theoretically motivated starting point. It is not the right choice for production deployment without significant engineering work to validate parameters, handle edge cases, and address the missing infrastructure assumptions.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.5)
- [OpenClaw](../projects/openclaw.md) — part_of (0.3)
- [OpenAI](../projects/openai.md) — part_of (0.3)
- [Model Context Protocol](../concepts/mcp.md) — part_of (0.3)

---
entity_id: a-mem
type: project
bucket: agent-memory
abstract: >-
  A-MEM is an LLM agent memory system using Zettelkasten-inspired note linking
  and autonomous memory evolution; its key differentiator is that new memories
  actively reorganize existing ones rather than accumulating passively.
sources:
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - repos/aiming-lab-simplemem.md
  - repos/supermemoryai-supermemory.md
  - repos/memorilabs-memori.md
  - repos/thedotmack-claude-mem.md
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/memorilabs-memori.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Anthropic
  - OpenAI
  - Claude
  - Retrieval-Augmented Generation
  - Cursor
  - Model Context Protocol
  - OpenClaw
  - Agent Memory
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T20:36:48.256Z'
---
# A-MEM: Agentic Memory for LLM Agents

## What It Is

A-MEM is a memory system for LLM agents where memories are structured notes that link to each other and mutate over time. The central idea comes from the Zettelkasten note-taking method: each memory is an atomic note with rich metadata, and new memories trigger reorganization of existing ones rather than simply appending to a list.

Most agent memory systems treat storage as a write-once, retrieve-later problem. A-MEM treats it as a continuously evolving knowledge network. When you add a memory about a project cancellation, A-MEM finds related existing memories and updates their contextual descriptions to reflect the new reality. The memory about that project's timeline now knows the project was cancelled.

Two implementations exist: evaluation code at [github.com/WujiangXu/A-mem](https://github.com/WujiangXu/A-mem) and the memory system itself at [github.com/WujiangXu/A-mem-sys](https://github.com/WujiangXu/A-mem-sys).

The work was published February 2025 by Wujiang Xu, Zujie Liang, Kai Mei, Hang Gao, Juntao Tan, and Yongfeng Zhang.

## Core Mechanism

### Memory Note Structure

Every memory is stored as a seven-component note:

1. **Original content** (c_i): the raw text
2. **Timestamp** (t_i): creation time
3. **Keywords** (K_i): LLM-generated key concepts
4. **Tags** (G_i): categorical labels
5. **Contextual description** (X_i): the LLM's interpretation of what this memory means
6. **Dense vector embedding** (e_i): computed over the concatenation of all textual components
7. **Link set** (L_i): bidirectional semantic relationships to other notes

Embedding all components together rather than just raw content is a load-bearing design choice. A memory about "pushing the launch to next quarter" generates keywords like "product launch," "schedule change," "Q2 delay" and a contextual description explaining the decision. The embedding captures all of this, making retrieval more semantically precise.

### Three Operations

**Note Construction:** An LLM call generates keywords, tags, and contextual description for each new memory. This enrichment happens at write time.

**Link Generation:** After constructing a note, the system retrieves the top-k most similar existing memories by cosine similarity, then the LLM analyzes pairs and establishes bidirectional links where meaningful connections exist. Links are schema-free — the LLM decides what constitutes a connection, whether causal, topical, contradictory, or otherwise.

**Memory Evolution:** New memories trigger contextual description updates on the existing memories they link to. This is the most novel mechanism. The memory network does not just grow — it reshapes. Existing notes get updated keywords, tags, and descriptions as new information recontextualizes them.

### Retrieval

Retrieval uses cosine similarity for initial candidate selection, then follows the link network to pull in connected memories. A query about a person naturally surfaces memories about their projects, which link to memories about related budgets, enabling multi-hop reasoning without explicit graph traversal logic.

## Benchmarks

Tested on LoCoMo (7,512 QA pairs across 5 task types, conversations averaging 9K tokens over up to 35 sessions). Results below are from the paper — self-reported, not independently validated.

**GPT-4o-mini, F1:**

| Task | Baseline | A-MEM | Change |
|------|----------|-------|--------|
| Single-Hop | 25.02 | 27.02 | +8% |
| Multi-Hop | 18.41 | 45.85 | +149% |
| Temporal | 12.04 | 12.14 | +1% |
| Open Domain | 40.36 | 44.65 | +11% |
| Adversarial | 69.23 | 50.03 | -28% |

**Token usage (GPT-4o-mini):** baseline uses 16,910 tokens/query; A-MEM uses 2,520 — an 85% reduction. With GPT-4o, reduction reaches 93%.

**Smaller models:** Qwen2.5-3b improves +787% on multi-hop F1 (3.11 → 27.59). Qwen2.5-1.5b improves +472%. Structured organization compensates substantially for limited model capability.

**Ablation:** Removing both Link Generation and Memory Evolution drops multi-hop F1 from 45.85 to 24.55. Removing only Memory Evolution drops it to 31.24. Both components contribute, with evolution specifically critical for multi-hop.

## Strengths

**Multi-hop reasoning.** The 2.5x improvement on multi-hop tasks (45.85 vs 18.41 F1) is the system's clear sweet spot. When answers require synthesizing information across multiple conversations or time periods, the link network provides paths that similarity search alone cannot.

**Token efficiency.** 85-93% token reduction at retrieval time matters for production deployments. The system delivers more relevant context in fewer tokens by selecting structured notes rather than raw conversation chunks.

**Smaller models benefit most.** If you cannot afford GPT-4o for every agent call, A-MEM's structured organization provides disproportionate gains on cheaper models. The 787% multi-hop improvement on Qwen2.5-3b suggests this as a viable path to capable agents with small models.

**Schema-free linking.** Unlike systems with predefined relationship types, A-MEM lets the LLM discover connection types from content. This makes it adaptable across domains without upfront ontology design.

## Critical Limitations

**Adversarial regression.** A-MEM scores 28% worse than baseline on adversarial questions (50.03 vs 69.23 F1). The enriched contextual descriptions and semantic links amplify misleading signals — when a question is designed to mislead, having more semantic context reinforces the wrong direction. This is not a minor edge case; adversarial robustness matters for any deployed system where users ask ambiguous or challenging questions.

**Temporal reasoning is largely unaddressed.** Despite storing timestamps, A-MEM shows only +1% improvement on temporal tasks. The system has no mechanism for "what changed between session 3 and session 7?" queries. [Zep](../projects/zep.md) and similar systems with bi-temporal indexing handle this substantially better. A-MEM's temporal limitation pairs with the adversarial weakness to define the boundary of where this system applies.

**No memory evolution undo.** When a new memory triggers updates to existing memories, those changes appear to be destructive. No version history, no revert. If the LLM misinterprets a relationship and updates 10 existing memories incorrectly, there is no recovery path. Production use requires building audit trails on top of A-MEM's mechanisms.

**Ingestion cost is front-loaded but unreported.** The paper documents 85-93% token reduction at retrieval time. It does not report the total cost including ingestion-time LLM calls for note construction, link analysis, and memory evolution. At scale, this could be substantial.

**Embedding staleness after evolution.** Memory evolution updates contextual descriptions and tags, which should invalidate existing embeddings. The paper does not address whether embeddings are recomputed after evolution. If they are not, retrieval operates on embeddings that no longer match the current note content.

**Scale untested.** All experiments use conversations of ~9K tokens across 35 sessions. Production agent memory can accumulate orders of magnitude more data. Top-k similarity search degrades at scale, and LLM-based link analysis does not scale linearly with memory count.

## When Not to Use A-MEM

**Temporal queries are primary.** If your use case requires reasoning about change over time — "what did the user prefer last month vs now?" or "what decisions changed between sprint 5 and sprint 8?" — A-MEM's +1% improvement on temporal tasks makes it a poor fit. Systems with explicit temporal indexing address this directly.

**Adversarial or ambiguous user input.** The -28% adversarial regression means A-MEM performs meaningfully worse than baseline on tricky questions. Customer-facing agents where users ask edge-case or adversarial questions should not rely on A-MEM without additional robustness layers.

**High-frequency, low-context agent calls.** Every new memory requires multiple LLM calls for note construction and link analysis. For agents making thousands of short-lived calls — code completions, form processing, classification — the ingestion overhead is not justified.

**Simple single-hop recall.** The +8% single-hop improvement does not justify the system's complexity. If your use case is primarily "remember what the user told me earlier in this session," a simpler vector store suffices.

## Unresolved Questions

**Ingestion cost at production scale.** The paper validates retrieval efficiency but does not quantify what it costs to ingest memories — specifically the LLM calls for note construction, link generation across growing memory sets, and cascading evolution updates. A system that ingests 1,000 memories/day and triggers evolution updates on 10 existing memories per new memory makes 10,000+ LLM calls for memory organization alone.

**Governance and quality control for evolution.** When memory evolution runs automatically, who reviews the changes? Enterprise deployments likely require approval workflows before existing memories are modified, especially if those memories inform decisions. A-MEM's architecture has no mechanism for this.

**Embedding recomputation policy.** If evolved memories do not get re-embedded, retrieval quality degrades over time. If they do, the re-embedding cost needs to be accounted for. The paper is silent on this.

**Contradiction handling.** When two memories make conflicting claims about the same fact, does evolution resolve the contradiction or do both persist? The paper describes evolution as updating contextual representations but does not address contradictions explicitly. Compare [Supermemory](../projects/supermemory.md), which treats contradiction resolution as a first-class mechanism.

## Alternatives

**Use [Supermemory](../projects/supermemory.md) when** you want a managed cloud service with explicit forgetting, contradiction handling, and benchmark-validated performance (#1 on LongMemEval and LoCoMo). Supermemory's three-tier profile structure (static/dynamic/search) provides structured organization without requiring LLM calls at ingestion time. The tradeoff is cloud dependency and no self-hosted option for the core engine.

**Use [Memori](../projects/memori.md) when** you need middleware that works transparently with existing LLM SDK code (zero application changes), want BYODB self-hosting on PostgreSQL/SQLite, and care about token efficiency (81.95% LoCoMo accuracy at 4.97% of full-context token footprint). Memori's monkey-patching approach is fragile across SDK versions but the simplest integration path.

**Use Zep/Graphiti when** temporal reasoning over memory is a primary requirement. A-MEM's +1% improvement on temporal tasks versus Zep's bi-temporal indexing is not comparable.

**Use vanilla [RAG](../concepts/retrieval-augmented-generation.md) when** your memory needs are single-session or single-document. A-MEM's complexity earns its cost specifically for long-horizon, multi-session, multi-hop reasoning scenarios.

**Use A-MEM when** your agents need multi-hop reasoning across long conversation histories, you are running smaller models that benefit from structured context, and you can accept schema-free link generation without adversarial robustness guarantees. The Zettelkasten pattern is particularly well-suited to knowledge workers' agents — research assistants, project management agents, learning systems — where accumulating context across many sessions and synthesizing across topics is the core challenge.

## Related

- [Agent Memory](../concepts/agent-memory.md)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)
- [Supermemory](../projects/supermemory.md)
- [Memori](../projects/memori.md)
- [Model Context Protocol](../concepts/model-context-protocol.md)

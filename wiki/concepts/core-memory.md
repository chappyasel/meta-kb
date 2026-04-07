---
entity_id: core-memory
type: concept
bucket: agent-memory
abstract: >-
  Core Memory is Letta/MemGPT's always-present context tier: labeled text blocks
  compiled directly into the system prompt that the agent reads and edits via
  tool calls, bounded by character limits rather than retrieval relevance.
sources:
  - repos/wangyu-ustc-mem-alpha.md
  - repos/mirix-ai-mirix.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/letta-ai-letta.md
related:
  - rag
  - episodic-memory
last_compiled: '2026-04-07T11:47:30.918Z'
---
# Core Memory

## What It Is

Core memory is the always-present tier of the [Letta](../projects/letta.md) (formerly MemGPT) agent memory system. Unlike archival or recall memory, which live outside the context window and require explicit retrieval, core memory is compiled directly into the system prompt on every LLM call. The agent can read it without any tool invocation and modify it through tool calls like `core_memory_replace` and `core_memory_append`.

The design maps onto the operating system analogy from the MemGPT paper (arXiv:2310.08560): if the context window is RAM and external storage is disk, core memory is the always-resident program state, never paged out.

Core memory is part of the broader [Agent Memory](../concepts/agent-memory.md) landscape and sits within the [Retrieval-Augmented Generation](../concepts/rag.md) ecosystem, though it deliberately avoids RAG's retrieval step for its contents. It relates closely to [Episodic Memory](../concepts/episodic-memory.md) and [Semantic Memory](../concepts/semantic-memory.md), which occupy Letta's other two tiers.

---

## Architecture

### Memory Blocks

Core memory is implemented as a collection of `Block` objects (defined in `letta/schemas/block.py`). Each block has:

- `label`: a human-readable name, e.g., `"human"`, `"persona"`, `"conversation_summary"`
- `value`: the text content the agent sees and can modify
- `limit`: a character cap (default `CORE_MEMORY_BLOCK_CHAR_LIMIT`, typically 5000 characters)
- `read_only`: whether the agent can modify the block or only read it
- `description`: metadata shown in the compiled system prompt

The `Memory` class (`letta/schemas/memory.py`) holds a list of these blocks plus optional file-backed blocks and a flag for git-backed versioning.

### Compilation into the System Prompt

Before each LLM call, `_rebuild_memory_async` in `base_agent.py` refreshes blocks from the database and calls `Memory.compile()`, which renders all blocks as structured XML injected into the system prompt:

```xml
<memory_blocks>
<human>
<description>Notes about the user</description>
<metadata>
- chars_current=142
- chars_limit=5000
</metadata>
<value>
The user's name is Alice. She prefers dark mode.
</value>
</human>
</memory_blocks>
```

The agent sees the current character count and limit, so it knows when a block is approaching capacity. This metadata also serves as a soft pressure for the agent to consolidate or prune its own memory.

### Self-Modification Tools

The agent modifies core memory through four tools defined in `functions/function_sets/base.py`:

- **`core_memory_replace(label, old_content, new_content)`**: Exact string replacement within a block. Raises `ValueError` if `old_content` is not found. This prevents accidental overwrites and forces precision.
- **`core_memory_append(label, content)`**: Appends text with a newline separator. Simple, but causes fragmentation over time.
- **`rethink_memory(new_memory, target_block_label)`**: Rewrites the entire block in one call. Creates the block if it does not exist. The "nuclear option" for reorganization.
- **`memory(command, path, ...)`**: Multi-command tool with sub-operations (create, str_replace, insert at line, delete, rename) for git-backed memory mode, which treats blocks as versioned files.

These Python functions raise `NotImplementedError` at the application level; the tool execution system intercepts them before invocation. The function signatures and docstrings serve as the tool schema sent to the LLM.

---

## How It Works in Practice

A typical agent loop for a single user message:

1. `LettaAgent.step()` receives the input message
2. `_rebuild_memory_async` refreshes all blocks from the database
3. `Memory.compile()` renders blocks into the system prompt XML
4. The LLM call includes the compiled system prompt, recent messages, and available tools
5. The agent may call `core_memory_replace` to update the `"human"` block, e.g., storing that Alice prefers dark mode
6. Each tool call triggers another LLM call (up to `DEFAULT_MAX_STEPS = 50`)
7. When the agent calls `send_message`, the loop ends and the response returns to the user

The key implication: every memory modification costs a full LLM call. A single user message might trigger three to five LLM calls as the agent reads context, updates blocks, and formulates a response. Letta's sleeptime agent pattern mitigates this by offloading consolidation to a background agent, keeping the primary interaction path lean.

---

## Relationship to Other Memory Tiers

| Tier | Location | Access | Agent control |
|---|---|---|---|
| Core memory | System prompt | Always present | Read and write via tool calls |
| Recall memory | Database | Search or full history | Read via `conversation_search` |
| Archival memory | Vector DB | Must be searched | Read/write via `archival_memory_*` |

The agent must explicitly call `archival_memory_search` to pull long-term knowledge into context. Core memory is the only tier that requires no retrieval step.

This contrasts with [Retrieval-Augmented Generation](../concepts/rag.md), where a retrieval step injects potentially irrelevant context. Core memory contains only what the agent has explicitly chosen to remember, which is why Letta documentation frames it as solving "context pollution."

---

## Core Memory in Other Systems

The three-tier model (core/episodic/semantic) appears beyond Letta. Mirix ([mirix-ai-mirix](../raw/repos/mirix-ai-mirix.md)) extends it to six specialized memory components, with core memory represented as labeled blocks for the `"human"` and `"persona"` facets, mirroring Letta's design. Mirix acknowledges Letta as the foundation of its memory system.

Mem-alpha ([wangyu-ustc-mem-alpha](../raw/deep/repos/wangyu-ustc-mem-alpha.md)) formalizes the same three-tier structure with a critical difference: core memory is a single string capped at 512 tokens, always present in the system prompt. Rather than an agent editing its blocks through tool calls, Mem-alpha trains a 4B-parameter model via [GRPO](../concepts/grpo.md) to autonomously decide what information belongs in core versus [episodic](../concepts/episodic-memory.md) versus [semantic memory](../concepts/semantic-memory.md). The agent learns memory construction as a skill, not a hand-crafted heuristic. Training on 30K-token contexts, it generalizes to 400K+ token sequences, a 13x extrapolation. The 512-token core memory cap forces high selectivity; only the most critical invariant facts survive the constraint.

---

## Strengths

**Transparency**: The agent's entire persistent state is visible as readable text. Developers can inspect, debug, and modify blocks through the API or the Agent Development Environment (ADE). There is no opaque embedding space to interrogate.

**Zero retrieval latency**: Core memory is always in the context window. No embedding lookup, no BM25 query, no latency spike on retrieval.

**Cross-agent sharing**: Blocks have stable `block_id` values and can be shared across multiple agents. A sleeptime agent can write to a primary agent's `"human"` block asynchronously. This is the mechanism behind Letta's multi-agent coordination.

**Reversibility**: Unlike weight updates in fine-tuning, text block edits are immediately reversible. Bad memories can be overwritten or deleted. Git-backed mode adds version history.

**Model agnosticism**: The tool interface works with any model that supports tool calling. The documentation lists 17+ provider integrations.

---

## Limitations

**Character limits are blunt instruments.** Each block has a character cap, not a token cap or an information-theoretic relevance threshold. A block at 5000 characters might consume vastly different token counts depending on content density. There is no global budget across all blocks, so an agent with many blocks can still overflow the context window even when each block is under its individual limit.

**Fragmentation from append-only updates.** Repeated `core_memory_append` calls accumulate stale information. The agent must proactively call `rethink_memory` to reorganize, but this requires generating the entire block content anew, and weaker models fail to maintain block hygiene.

**Exact-match replacement requirement.** `core_memory_replace` requires verbatim matching of `old_content`. If the agent misremembers the exact text, the call raises `ValueError`. This is a deliberate design choice that prevents sloppy overwrites, but it means agents must track their own block contents precisely.

**No structured knowledge representation.** All memory is unstructured text. There are no entities, relationships, or facts. For applications requiring "what is Alice's relationship to Bob?", the agent must parse its own block text on every query. Compare with [GraphRAG](../concepts/graphrag.md) or [Knowledge Graph](../concepts/knowledge-graph.md) approaches that store typed relationships.

**Block metadata overhead.** Each block in the compiled system prompt includes description, character count, and limit metadata. Five blocks with headers might consume 200+ tokens of context window just for structural information.

**Memory quality tracks model quality.** Since the agent manages its own memory through tool calls, low-capability models create redundant entries, overwrite important facts, and fail to recognize when updates are needed. Letta recommends stronger models for sleeptime agents specifically because consolidation requires higher-quality reasoning.

---

## Concrete Failure Mode

An agent using `core_memory_append` across dozens of conversations will produce a `"human"` block that looks like a changelog rather than a coherent profile. Entries like "Alice mentioned she likes dark mode" and "Alice confirmed she prefers dark mode" coexist redundantly. Without a `rethink_memory` call to consolidate, the block fills its character limit with repetitive content, crowding out genuinely new information. Weaker models rarely initiate consolidation proactively.

---

## Unspoken Infrastructure Assumption

Core memory assumes a persistent relational database (PostgreSQL via SQLAlchemy ORM) to store block state across sessions. `_rebuild_memory_async` refreshes blocks from the database on every LLM call. In serverless or stateless deployment environments where database connections are expensive, this per-request database read becomes a latency bottleneck. The system is architected for persistent server deployments, not ephemeral function invocations.

---

## When NOT to Use Core Memory

**Skip core memory if you need structured relational queries.** If your application requires querying relationships between entities ("list all users who mentioned X in the past week"), core memory's unstructured text blocks will require LLM parsing on every query. A [Knowledge Graph](../concepts/knowledge-graph.md) approach via [Graphiti](../projects/graphiti.md) or [Neo4j](../projects/neo4j.md) is the appropriate tool.

**Skip core memory if memory volume is large.** Core memory is designed for the most critical, most frequently accessed facts. If you need to persist thousands of facts per agent, the character limits and context window overhead make core memory impractical. [Vector Database](../concepts/vector-database.md) backed archival memory handles volume better.

**Skip core memory if latency is the primary constraint.** The agent-loop model means every memory write costs at least one full LLM call. Mem0's automatic extraction pipeline or a background-only memory system handles high-throughput scenarios with lower per-interaction cost.

---

## Unresolved Questions

**How should character limits be set?** The default `CORE_MEMORY_BLOCK_CHAR_LIMIT` is a configuration constant, but no published guidance explains how to calibrate it to context window size, number of blocks, or task requirements. A 32K context window with ten blocks at 5000 characters each consumes roughly 25% of context before any conversation content.

**What triggers consolidation?** The Letta architecture supports `rethink_memory` but provides no automatic trigger for when the agent should consolidate versus accumulate. The sleeptime pattern delegates this to a background agent, but the trigger frequency is configurable without documented guidance on optimal settings.

**How does memory interact with system prompt updates?** `_rebuild_memory_async` checks whether the compiled memory has changed and updates the system message if so. But this creates a race condition in multi-agent scenarios where two agents modify the same shared block concurrently. The documentation does not describe a conflict resolution mechanism.

---

## Alternatives

| System | Approach | Choose when |
|---|---|---|
| [Mem0](../projects/mem0.md) | Automatic fact extraction to vector + graph store | You want automatic memory without agent-managed writes |
| [Graphiti](../projects/graphiti.md) | Temporal knowledge graph with entity/edge types | You need structured relational queries across facts |
| [Zep](../projects/zep.md) | Dialog-aware fact extraction with knowledge graph | You need conversation-grounded entity resolution |
| Mem-alpha | RL-trained memory construction agent | You want learned, task-adaptive memory placement across tiers |
| [CLAUDE.md](../concepts/claude-md.md) | Static markdown file in project context | You need persistent instructions without dynamic self-editing |

Use core memory when the agent needs full awareness and explicit control over a small, high-value set of persistent facts, and when the deployment environment can absorb the LLM-call cost of memory writes.


## Related

- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.4)
- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.6)

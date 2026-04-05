---
entity_id: core-memory
type: concept
bucket: agent-memory
sources:
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/letta-ai-letta.md
related: []
last_compiled: '2026-04-05T05:33:02.265Z'
---
# Core Memory

## What It Is

Core memory is a small, always-present block of text in an agent's context window that holds the information an agent needs most persistently. Unlike external memory stores that require retrieval, core memory appears in every prompt automatically, making its contents immediately accessible without a search step.

The concept originated in the MemGPT paper (2023) and its successor framework Letta, which introduced the idea that agents operating under context window limits need a tiered memory architecture. Core memory sits at the top of that hierarchy: small, curated, always loaded.

## Why the Distinction Matters

Standard retrieval-augmented generation treats memory as a search problem. You store facts in a vector database and fetch them when relevant queries arrive. This works for large knowledge bases but fails for identity-level information. An agent that must search to remember its own name, the user's name, or its current task creates latency and retrieval errors for information that should always be available.

Core memory solves a different problem: what does the agent need to function at all, regardless of the current query? Peripheral facts belong in searchable stores. Foundational context belongs in core memory.

## How It Works

### Structure

Core memory is typically divided into labeled blocks, often called `human` and `persona`:

- **persona**: who the agent is, how it behaves, what its current goals or instructions are
- **human**: persistent facts about the user (name, preferences, role, ongoing context)

In MemGPT/Letta's implementation, each block has a fixed token budget (commonly 512-2048 tokens per block). The agent cannot exceed this limit; expanding core memory requires compressing or evicting existing content.

In [MIRIX](https://github.com/mirix-ai/mirix), the core memory configuration looks like:

```python
{
    "core_memory_agent": {
        "blocks": [
            {"label": "human", "value": ""},
            {"label": "persona", "value": "I am a helpful assistant."},
        ]
    }
}
```

These blocks initialize as sparse and fill over time as the agent learns about the user.

### Modification

Core memory is not static. An agent with write access to its own memory can modify core memory through tool calls. In MemGPT's architecture, the agent calls functions like `core_memory_append` or `core_memory_replace` to update its own persona or human blocks mid-conversation. This makes core memory a living document rather than a fixed system prompt.

The agent decides when to update. If a user reveals something important ("I'm switching jobs next month"), the agent can write that into the human block so it persists beyond the current conversation's context window.

### Token Budget Enforcement

Core memory's defining constraint is size. Implementations typically enforce a hard token cap. In Mem-α ([source](../../raw/repos/wangyu-ustc-mem-alpha.md)), core memory is capped at 512 tokens and described as "a single string holding the most important persistent context, always present in the system prompt." The cap forces selectivity: the agent cannot lazily dump everything into core memory. It must decide what is worth the premium of guaranteed availability.

When an agent wants to write something new to core memory that would exceed the budget, it must either compress existing content or decide the new information belongs in a searchable store instead.

## The Three-Tier Context

Core memory makes most sense as part of a broader memory hierarchy. Mem-α formalizes three tiers:

| Tier | Access | Size | Search |
|------|--------|------|--------|
| Core | Always in context | ~512 tokens | None needed |
| Semantic | Retrieved on demand | Unbounded | BM25 + embeddings |
| Episodic | Retrieved on demand | Unbounded | BM25 + embeddings |

The agent holds a small, high-value permanent cache (core) and a large, searchable external store (semantic/episodic). Most conversational facts go into episodic memory. Stable factual knowledge goes into semantic. Only the handful of most critical invariants go into core.

MIRIX adds three more tiers (Procedural, Resource, Knowledge Vault), but core memory plays the same role: a small, always-loaded block that bootstraps every interaction.

## Who Decides What Goes in Core Memory

This is the central design question, and different systems answer it differently.

**Hand-coded rules**: Early MemGPT implementations gave the agent instructions like "put important information about the user in the human block." The agent used language understanding to decide what qualified, but the rule itself was static.

**Reinforcement learning**: Mem-α trains a 4B-parameter model to make these decisions through RL (GRPO). The model processes text chunks sequentially and calls tools to insert, update, or delete core/semantic/episodic memory entries. The reward signal comes from downstream QA accuracy plus a compression penalty (β=0.05) that discourages putting everything in core. The content-type reward (γ=0.1) penalizes misclassifying information between tiers. Ablation studies show both penalties are necessary: removing β causes memory bloat, removing γ causes misclassification.

The RL approach learns task-dependent strategies. Fact-heavy documents produce more semantic memories; narrative content produces more episodic ones; only the critical invariants end up in core. This beats hand-coded heuristics on MemoryAgentBench (self-reported; not independently validated).

## Concrete Failure Modes

**Core memory crowding out reasoning**: Context windows have finite capacity. A large core memory block (say, 2048 tokens for each of persona and human) consumes a meaningful fraction of an 8K context window before the conversation begins. For models with small context windows, aggressive core memory usage leaves insufficient room for the actual exchange.

**Stale core memory**: If the agent updates core memory with information that later changes ("user prefers Python" → user switches to Go), old entries persist until explicitly evicted. There is no automatic expiry. Agents that fail to update core memory on new information will carry stale priors into every future interaction.

**Cold start sparsity**: At the beginning of a new user relationship, core memory is nearly empty. The agent must either ask users to provide information explicitly or learn incrementally. Until core memory is populated, the agent behaves generically. This is a feature (no false assumptions) but also a usability problem for first-run experience.

**Write conflicts in multi-agent systems**: MIRIX runs six specialized memory agents. If multiple agents can write to core memory concurrently, conflicts arise. MIRIX's documentation does not specify a conflict resolution protocol for core memory writes. This is an unresolved implementation question in multi-agent architectures.

## What Core Memory Does Not Do

Core memory is not a knowledge base. It holds identity and relationship context, not facts about the world. An agent should not store "the capital of France is Paris" in core memory; that belongs in semantic memory where it can be searched when relevant and ignored when not.

Core memory also cannot replace retrieval for large volumes of information. It works precisely because it is small. Treating it as a general-purpose cache defeats its purpose and bloats every prompt.

## Implementation Assumptions

**Long-running sessions**: Core memory is valuable when the agent has an ongoing relationship with a user across many conversations. For stateless one-shot interactions, core memory provides no benefit over a well-crafted system prompt.

**Writable context**: The agent must have tool access to modify its own memory. Read-only core memory (a fixed system prompt) is just a system prompt with extra naming conventions. The architectural novelty requires that agents can update their own context.

**Token cost absorption**: Every call includes core memory tokens, regardless of relevance. At scale, this is a persistent overhead. A 1000-token core memory block across a million API calls adds ~1 billion tokens of cost that retrievable memory would avoid.

## When Not to Use Core Memory

Skip core memory architecture for:

- **Stateless applications**: Customer support bots that handle one-off queries with no user history gain nothing from core memory.
- **Small context windows**: If the context window is under 4K tokens, core memory's fixed overhead crowds out conversation content.
- **Public/anonymous users**: Core memory requires user-specific state. Systems serving anonymous users with no persistent identity cannot populate the human block meaningfully.
- **Read-only agents**: If the agent cannot modify its own memory through tool calls, core memory degrades to a system prompt with a different name.

## Open Questions

**Optimal block size**: 512 tokens is Mem-α's limit; Letta uses different defaults. There is no established empirical basis for what the right core memory budget is across task types. Larger blocks reduce compression pressure but increase per-call cost.

**Multi-agent write coordination**: In systems like MIRIX with multiple memory agents, who controls core memory writes? The architecture uses a meta-agent to coordinate, but conflict resolution under concurrent writes is not documented.

**Forgetting policy**: None of the implementations reviewed include automatic expiry or decay for core memory entries. Long-running agents accumulate stale content. The burden of eviction falls on the agent, which may not know when information has expired.

**Generalization of RL-learned strategies**: Mem-α's trained model generalizes from 30K to 400K token contexts (13x), which the paper presents as evidence of a general skill. Whether the learned strategy generalizes across domains (medical, legal, creative writing) outside the training mix is not established. The dataset-specific prompt configurations in `prompts_wrt_datasource.yaml` suggest domain sensitivity.

## Related Concepts

Core memory sits within the broader architecture of [agent memory systems](../concepts/agent-memory.md), where it occupies the highest-priority, lowest-capacity tier. It contrasts with [episodic memory](../concepts/episodic-memory.md) (event-specific, retrieved) and [semantic memory](../concepts/semantic-memory.md) (factual knowledge, retrieved). The decision of what to write into core memory is increasingly treated as a learnable policy rather than a hand-coded rule, as Mem-α demonstrates.

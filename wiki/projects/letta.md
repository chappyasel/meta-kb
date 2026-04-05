---
entity_id: letta
type: project
bucket: agent-memory
sources:
  - repos/mirix-ai-mirix.md
  - repos/letta-ai-letta.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/letta-ai-letta.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T05:28:49.035Z'
---
# Letta (formerly MemGPT)

**Type:** Agent framework | **Language:** Python | **License:** Apache-2.0
**Stars:** ~21,900 | **GitHub:** [letta-ai/letta](https://github.com/letta-ai/letta)

[Source](../../raw/repos/letta-ai-letta.md)

---

## What It Does

Letta provides infrastructure for building stateful LLM agents that persist memory across conversations. Agents can learn from interactions, update their own memory, and theoretically improve over time without losing context between sessions.

The project started as MemGPT, a research system exploring how to give LLMs access to hierarchical memory tiers (analogous to OS virtual memory). It has since expanded into a full agent platform with an API, SDKs for Python and TypeScript, and a hosted cloud service.

---

## Core Mechanism

The central abstraction is `memory_blocks`: named, mutable text slots attached to each agent at creation. Standard blocks are `human` (what the agent knows about the user) and `persona` (how the agent understands itself). These blocks load directly into the system prompt on every turn, giving the agent immediate access to its accumulated knowledge.

Agent creation looks like this:

```python
agent_state = client.agents.create(
    model="openai/gpt-5.2",
    memory_blocks=[
        {"label": "human", "value": "Name: Timber..."},
        {"label": "persona", "value": "I am a self-improving superintelligence..."}
    ],
    tools=["web_search", "fetch_webpage"]
)
```

The agent can edit its own `memory_blocks` mid-conversation via tool calls, which is the core self-improvement loop. This differs from simple conversation history logging: the agent decides what to retain and how to represent it, rather than a system mechanically appending turns to a buffer.

Beyond in-context blocks, Letta manages archival storage for information that doesn't fit in the context window. Agents retrieve from archival via search tools, enabling recall across long interaction histories.

The Letta Code CLI extends this with a local agent that can run subagents and load pre-built skills, framed as a coding assistant with persistent context.

---

## Key Numbers

| Metric | Value | Notes |
|--------|-------|-------|
| GitHub Stars | ~21,900 | As of early 2026 |
| Forks | ~2,300 | |
| DMR Benchmark | 93.4% (MemGPT) | Self-reported by MemGPT team; Zep paper reports this figure |
| Contributors | 100+ | Per README |

The DMR (Deep Memory Retrieval) benchmark was established by the MemGPT team as their primary evaluation metric, which means Letta both designed and scored on their own test. Zep subsequently outperformed this score (94.8% vs 93.4%) on the same benchmark, and also beat Letta on the independent LongMemEval benchmark [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). Treat Letta's memory benchmark claims with appropriate skepticism.

---

## Strengths

**Stateful agent lifecycle management.** The `agents.create` / `agents.messages.create` API gives you a clean contract: agent identity and memory persist server-side, and your application code just sends messages. This removes the burden of managing conversation state in your own database.

**Self-directed memory editing.** The agent chooses what to write into its memory blocks, rather than having a fixed summarization pipeline run externally. This means the agent can maintain structured, semantically meaningful summaries rather than chronological logs.

**Model agnosticism.** The SDK supports arbitrary model endpoints. Letta publishes a model leaderboard (leaderboard.letta.com) with their own rankings for which models perform best in agentic memory tasks.

**Ecosystem influence.** MIRIX, a multi-agent personal assistant with a six-component memory architecture, explicitly acknowledges Letta as the foundation for its memory system [Source](../../raw/repos/mirix-ai-mirix.md). The abstractions have proven reusable.

---

## Limitations

**Failure mode: memory block staleness under rapid update.** Because agents write to memory blocks through LLM-generated tool calls, any confusion in the agent's reasoning about what to update (or forgetting to update) silently corrupts the agent's world model. There is no transactional guarantee. An agent that makes a bad decision about what to store will carry that bad state forward indefinitely until something overwrites it. The system has no built-in mechanism to detect or flag when stored memory contradicts recent observations.

**Infrastructure assumption: context window as the bottleneck.** Letta's architecture assumes the primary constraint is fitting relevant information into finite context. This was true when MemGPT was designed (circa GPT-4 with 8K context). With models now supporting 128K-1M token windows, the retrieval-over-archival pattern is less compelling for many use cases. The framework has not publicly addressed how its archival retrieval strategy adapts when the context window can hold most of a user's history directly.

---

## When Not to Use Letta

**Short-lived or stateless interactions.** If your application handles discrete, independent queries where users don't expect continuity, Letta's memory infrastructure adds complexity without benefit.

**High-throughput, low-latency production workloads.** Each agent message involves memory block retrieval, potential archival search, and LLM-mediated memory editing. This is expensive relative to a stateless inference call. If you need sub-second responses at scale, the overhead compounds quickly.

**Teams without tolerance for early-stage APIs.** The transition from MemGPT to Letta involved breaking changes. The project is still evolving rapidly; anyone building on the SDK should expect the API surface to shift.

**Use cases requiring temporal reasoning across structured data.** If your agents need to track how facts change over time (e.g., a customer's account status, a contract that was amended), Letta's text-blob memory blocks have no native temporal model. Zep's knowledge graph approach handles this better [Source](../../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md).

---

## Unresolved Questions

**Governance of the hosted service.** The API requires a Letta API key tied to `app.letta.com`. The README links to privacy and terms pages but does not explain what happens to agent memory stored in the cloud, data retention policies, or how conflicts between the open-source and hosted versions are resolved.

**Cost at scale.** Every message may trigger multiple LLM calls (memory editing tool calls on top of the primary response). The documentation does not publish cost estimates per agent-message under realistic workloads.

**Memory conflict resolution.** If an agent writes contradictory facts to the same memory block across sessions (user says their name is Alice in session 1, corrects it to Alicia in session 5), there is no documented reconciliation mechanism beyond whatever the LLM happens to do when updating the block.

**Benchmark design independence.** DMR was created by the MemGPT team. Independent validation of Letta's memory quality claims on neutral benchmarks is sparse.

---

## Alternatives

| Alternative | Use when |
|-------------|----------|
| **Zep** | You need temporal knowledge graphs, structured business data integration, or enterprise-grade retrieval with auditable history. Outperforms Letta on both DMR and LongMemEval. |
| **Plain conversation history + summarization** | Your context window is large enough to hold relevant history and you want simpler infrastructure. |
| **MIRIX** | You want a multi-agent memory system with specialized recall by memory type (episodic, semantic, procedural) and local-first storage. Built on Letta's abstractions but extends them. |
| **Custom vector store + RAG** | Your memory needs are read-heavy and updates are infrequent; you want full control over retrieval logic. |

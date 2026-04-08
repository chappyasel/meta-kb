---
entity_id: letta-api
type: project
bucket: agent-memory
abstract: >-
  Letta's REST API and SDK layer for creating and managing stateful agents with
  persistent memory blocks, tool access, and cross-session learning.
  Differentiator: memory persists across conversations without developer-managed
  storage code.
sources:
  - repos/letta-ai-letta-code.md
  - repos/letta-ai-letta.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
related:
  - letta
  - letta
last_compiled: '2026-04-08T03:03:56.440Z'
---
# Letta API

## What It Does

The Letta API is the programmatic interface to the [Letta](../projects/letta.md) platform (formerly MemGPT). It gives developers REST endpoints and official SDKs (Python and TypeScript) to create agents with persistent memory, send messages, manage tools, and read back agent state. The core differentiator from vanilla LLM APIs is that state survives between calls. An agent created on Monday still knows what happened on Monday when you message it on Friday, without the developer writing any persistence logic.

The API is the foundation under [Letta Code](../repos/letta-ai-letta-code.md), LettaBot, and any application-embedded agent built on the Letta platform.

## Architecture and Core Mechanism

### memory_blocks

The central data structure is `memory_blocks`. When creating an agent, callers supply labeled string blocks that define the agent's initial memory:

```python
memory_blocks=[
    {"label": "human", "value": "Name: Timber. Status: dog."},
    {"label": "persona", "value": "I am a self-improving agent."}
]
```

These blocks are not static prompts. Letta's runtime can update them during execution as the agent processes new information, effectively writing back to persistent storage mid-conversation. This is the MemGPT-lineage insight: give the model a mechanism to edit its own memory, not just read a fixed system prompt.

### Agent Lifecycle

Agents are long-lived resources with stable IDs. The call pattern is:

1. `client.agents.create(...)` — instantiates an agent with model, memory blocks, and tools
2. `client.agents.messages.create(agent_id, input=...)` — sends a message; the agent responds and may update its memory blocks
3. Agent ID persists; subsequent calls to `messages.create` with the same ID continue the same stateful agent

This is structurally different from OpenAI's Assistants API threads, where state is tied to thread objects rather than a first-class agent resource with mutable memory.

### Tool Access

Agents are created with named tools (`tools=["web_search", "fetch_webpage"]`). The API handles tool dispatch; callers don't need to implement tool loops. Custom tools can be registered and attached to agents, feeding into a [Tool Registry](../concepts/tool-registry.md) model.

### SDK Availability

- TypeScript: `npm install @letta-ai/letta-client`
- Python: `pip install letta-client`

Both SDKs wrap the REST API. The TypeScript SDK is used by Letta Code; the Python SDK is the primary interface for server-side integrations.

### Self-Hosting vs. Cloud

By default the SDKs point to `app.letta.com`. Setting `LETTA_BASE_URL` redirects to a self-hosted Docker instance. This split matters for data residency and cost, but the API surface is nominally identical in both modes.

## Key Numbers

- Parent repo: ~21,800 GitHub stars, 2,300 forks (self-reported by GitHub counter)
- Letta Code (the flagship API consumer): ~2,100 stars
- License: Apache-2.0 for the open-source server; the cloud API has separate terms of service
- No independently published latency or throughput benchmarks for the API layer itself

## Strengths

**Persistent agent identity without infrastructure work.** Creating a stateful agent is a single API call with a few fields. Memory survives restarts, model swaps, and long time gaps. Developers don't build session storage, serialization, or retrieval plumbing.

**Model portability.** The same agent can run against Claude, GPT, Gemini, or local models by changing the `model` parameter. Memory blocks and tool configurations are model-agnostic.

**Skill accumulation.** Letta Code demonstrates the platform's skill-learning pattern: agents can extract reusable `.skills` modules from past interactions and attach them to future sessions. This is a concrete path toward [Self-Improving Agents](../concepts/self-improving-agents.md) rather than a theoretical one.

**Cross-session [Core Memory](../concepts/core-memory.md) writes.** The agent can edit its own memory blocks mid-conversation, which enables genuinely accumulative learning rather than prompt injection that resets each turn. See [Agent Memory](../concepts/agent-memory.md) and [Long-Term Memory](../concepts/long-term-memory.md) for the broader pattern.

## Critical Limitations

**Failure mode: memory block staleness under concurrent agents.** If multiple agents share references to the same `human` block or if two sessions with the same agent ID run concurrently, write conflicts are underdocumented. The API doesn't expose conflict resolution policies or optimistic locking semantics in its public documentation. Production multi-tenant deployments that share agent state across simultaneous requests should test this explicitly.

**Infrastructure assumption: Letta cloud or a correctly configured Docker instance.** The SDK defaults to `app.letta.com`. Teams that assume the API is purely self-contained will hit authentication and routing errors when running in air-gapped environments. Self-hosting requires running the Letta Docker server, which adds operational overhead not visible in the hello-world examples.

## When NOT to Use It

Skip the Letta API when:

- You need stateless, per-request inference without any persistence overhead. A direct OpenAI or Anthropic SDK call is simpler and cheaper.
- Your architecture already manages conversation state externally (e.g., in a database + custom retrieval pipeline). Adding Letta's memory layer duplicates responsibility and creates two sources of truth.
- You need fine-grained control over what enters context each turn. Letta's memory system makes autonomous decisions about memory writes; you can't fully override its context-assembly logic from the API alone.
- You're building on a platform with strict data residency requirements and don't want to run a Docker service. The cloud API stores agent state on Letta's infrastructure.

## Unresolved Questions

**Cost at scale.** The public documentation doesn't publish per-agent storage pricing, memory write costs, or throughput limits for the cloud API. Teams planning high-volume deployments (thousands of long-lived agents) have no published basis for cost modeling.

**Memory write governance.** The agent decides when to update its own memory blocks. There's no documented API for setting update frequency, write permissions per block, or audit logging of memory changes. For compliance use cases, this is a gap.

**Conflict resolution across sessions.** When the same agent ID receives messages from two concurrent callers, the ordering and merging of memory block updates is not specified in public documentation.

**Versioning of agent state.** The API doesn't expose a rollback mechanism for memory blocks. If an agent writes incorrect information into its `human` block, recovery requires manually patching the block value.

## Alternatives

| Tool | Choose when |
|------|-------------|
| [Mem0](../projects/mem0.md) | You want memory as a standalone layer you add to any LLM call, without adopting a full agent platform |
| [Zep](../projects/zep.md) | You need session memory with temporal reasoning and fact extraction, without Letta's agent-execution model |
| [LangGraph](../projects/langgraph.md) | You want explicit control over state transitions and graph-based agent orchestration, with your own persistence backend |
| [OpenAI Agents SDK](../projects/openai-agents-sdk.md) | You're OpenAI-only and want a simpler stateful agent abstraction without multi-model portability |
| Direct LLM SDK | Your use case is single-turn or you manage all state externally |

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md)
- [Core Memory](../concepts/core-memory.md)
- [Long-Term Memory](../concepts/long-term-memory.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Self-Improving Agents](../concepts/self-improving-agents.md)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md)

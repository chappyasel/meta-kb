---
entity_id: letta-api
type: project
bucket: agent-memory
abstract: >-
  Letta API is a hosted, managed service for building stateful agents with
  persistent memory, exposing the Letta agent runtime via REST endpoints and
  Python/TypeScript SDKs.
sources:
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - repos/letta-ai-letta-code.md
  - repos/letta-ai-letta.md
related:
  - letta
last_compiled: '2026-04-08T23:21:17.946Z'
---
# Letta API

## What It Is

The Letta API is the managed cloud layer of the [Letta](../projects/letta.md) platform. It hosts the Letta agent runtime as a service, handling persistence, model routing, and memory management so developers can embed stateful agents in their own applications without running their own server.

Its core differentiator from generic LLM APIs (OpenAI, Anthropic): agents created through the Letta API retain state across separate calls. Memory blocks persist between conversations. The agent you call today knows what it learned last week. No session gluing required on the client side.

Letta was previously known as [MemGPT](../projects/memgpt.md), which established the foundational memory architecture this API exposes.

## Core Mechanism

The central abstraction is `memory_blocks`: structured key-value stores attached to an agent at creation time. Each block has a `label` (e.g., `"human"`, `"persona"`) and a `value` (freetext or structured content). When the agent processes a message, these blocks populate its system prompt. The agent can read and write them as tools, so memory updates happen inside inference, not through a separate client call.

Creating an agent via the Python SDK:

```python
from letta_client import Letta

client = Letta(api_key=os.getenv("LETTA_API_KEY"))

agent_state = client.agents.create(
    model="openai/gpt-5.2",
    memory_blocks=[
        {"label": "human", "value": "Name: Alice. Role: engineer."},
        {"label": "persona", "value": "I am a persistent engineering assistant."}
    ],
    tools=["web_search", "fetch_webpage"]
)
```

The same agent ID persists across sessions. Messages sent via `client.agents.messages.create(agent_id, ...)` append to the agent's history and may trigger memory writes. This is the MemGPT model: [Core Memory](../concepts/core-memory.md) blocks sit in the context window; archival and recall storage live outside it, retrieved on demand.

Tool access (`web_search`, `fetch_webpage`, plus custom tools) is declared at agent creation and dispatched server-side. The API handles tool execution and folds results back into the agent's context.

[Letta Code](https://github.com/letta-ai/letta-code), the CLI coding harness built on this API, demonstrates the architecture in practice: `/init` initializes memory blocks, `/remember` writes to them explicitly, and `/skill` persists learned procedures to a `.skills` directory. The CLI connects to `app.letta.com` by default but accepts a `LETTA_BASE_URL` environment variable pointing at a self-hosted Docker server.

## Key Numbers

- Letta open-source repo: 21,873 stars, 2,312 forks (self-reported via GitHub)
- Letta Code harness: 2,096 stars, 208 forks (self-reported)
- Python SDK: `pip install letta-client`; TypeScript SDK: `npm install @letta-ai/letta-client`
- No publicly available latency or throughput benchmarks from independent sources

The star counts reflect the broader Letta platform, not the API specifically. No third-party benchmarks for the managed API tier exist in the available source material.

## Strengths

**Cross-session memory that requires no client-side logic.** The server owns persistence. You call `messages.create`, the agent updates its own memory blocks mid-inference, and the next call sees those updates. Developers building multi-turn products don't manage conversation history, vector retrieval, or re-injection themselves.

**Model agnosticism.** The API routes to Claude Sonnet/Opus, GPT/Codex, Gemini, GLM, Kimi, and others. Swapping models doesn't rebuild the agent; memory blocks survive provider changes.

**Skill learning at the application layer.** Agents can distill reusable procedures from past trajectories (exposed as `/skill` in Letta Code, accessible programmatically). This is [Agent Memory](../concepts/agent-memory.md) combined with [Agent Skills](../concepts/agent-skills.md) without requiring the developer to build the distillation loop.

**Escape hatch to self-hosted.** Setting `LETTA_BASE_URL` redirects the same SDK calls to a local Docker server. Teams can migrate off the managed API without changing application code.

## Critical Limitations

**Failure mode: memory block conflicts in multi-agent scenarios.** The `memory_blocks` model works well for a single persistent agent. When multiple agents share state or a coordinator spawns subagents ([Multi-Agent Systems](../concepts/multi-agent-systems.md)), there is no documented conflict resolution for concurrent writes to the same block. The Letta Code docs reference subagent support, but the API reference does not specify what happens when two agents attempt simultaneous writes to a shared memory block.

**Unspoken infrastructure assumption: network availability.** The default configuration connects to `app.letta.com`. Applications that need offline capability, air-gapped deployment, or sub-50ms latency must self-host, which reintroduces the operational burden the managed API is supposed to eliminate. This assumption is not called out in the quickstart documentation.

## When NOT to Use It

Don't use the Letta API when:

- Your agents are stateless by design (question-answering over a fixed corpus, single-turn classification). The managed persistence layer adds cost and latency with no benefit.
- You need sub-100ms response times. Hosted APIs with server-side tool execution and memory retrieval cannot reliably hit those targets.
- You're operating under data residency requirements that prohibit sending conversation content to a third-party cloud. Self-hosting the Letta server is possible but not trivial.
- Your team already owns a mature memory stack (e.g., [Zep](../projects/zep.md) or [Mem0](../projects/mem0.md)) integrated into existing infrastructure. Migrating to Letta's memory model means rebuilding or abandoning that investment.

## Unresolved Questions

**Pricing at scale.** The documentation and source material contain no pricing for the managed API tier beyond "use `/connect` to supply your own LLM API keys." It is unclear whether Letta charges per message, per agent, per memory operation, or per token. The cost model for production workloads with thousands of persistent agents is opaque.

**Governance of memory blocks.** Who can read or modify an agent's memory blocks after creation? The API exposes `agents.create` with initial block values, but the access control model for block modification, audit logging of writes, and retention policies are not documented in available sources.

**Performance characteristics of archival storage.** MemGPT's original design distinguished in-context [Core Memory](../concepts/core-memory.md) from out-of-context archival and recall storage. The API surface exposes memory blocks, but the retrieval mechanism for archival storage (what triggers it, what algorithm drives it, latency implications) is not documented at the API layer.

**Conflict resolution for concurrent agents.** Covered under limitations above, but worth noting as an open specification gap for anyone building [Multi-Agent Collaboration](../concepts/multi-agent-collaboration.md) systems on this API.

## Alternatives

| Tool | Use when |
|---|---|
| [Zep](../projects/zep.md) | You need a memory layer that integrates with an existing LLM stack without adopting the full Letta agent model |
| [Mem0](../projects/mem0.md) | You want automatic memory extraction from conversations with less structured memory_blocks API |
| [LangGraph](../projects/langgraph.md) | You need fine-grained control over agent state machines and are comfortable managing persistence yourself |
| [OpenAI Agents SDK](../projects/openai-agents-sdk.md) | You're already committed to the OpenAI provider stack and don't need cross-provider portability |
| Self-hosted Letta server | You need the same memory model without sending data to `app.letta.com` |

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md): the general capability this API operationalizes
- [Core Memory](../concepts/core-memory.md): the specific in-context memory block architecture
- [Long-Term Memory](../concepts/long-term-memory.md): what persistence across sessions enables
- [Context Engineering](../concepts/context-engineering.md): how memory blocks shape the agent's context window
- [Letta](../projects/letta.md): the open-source platform and server this API wraps

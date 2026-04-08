---
entity_id: model-context-protocol
type: concept
bucket: context-engineering
abstract: >-
  Model Context Protocol (MCP) is Anthropic's open standard for connecting LLM
  applications to external tools and data sources via a client-server
  architecture, enabling any compliant host to use any compliant server without
  custom integration code.
sources:
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - articles/notion-notion-site-notion-notion-site.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/evoagentx-evoagentx.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/tirth8205-code-review-graph.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/affaan-m-everything-claude-code.md
  - repos/agent-on-the-fly-memento.md
  - repos/aiming-lab-simplemem.md
  - repos/caviraoss-openmemory.md
  - repos/greyhaven-ai-autocontext.md
  - repos/infiniflow-ragflow.md
  - repos/matrixorigin-memoria.md
  - repos/memorilabs-memori.md
  - repos/natebjones-projects-ob1.md
  - repos/safishamsi-graphify.md
  - repos/supermemoryai-supermemory.md
  - repos/tirth8205-code-review-graph.md
  - repos/wangziqi06-724-office.md
  - repos/yusufkaraaslan-skill-seekers.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
related:
  - claude-code
  - cursor
  - retrieval-augmented-generation
  - knowledge-graph
  - openai
  - claude
  - openclaw
  - anthropic
  - context-engineering
  - windsurf
  - codex
  - episodic-memory
  - agent-memory
  - ollama
  - gemini
  - vector-database
  - tree-sitter
  - react
  - langchain
  - agent-skills
  - semantic-search
  - multi-agent-systems
  - gpt-4
  - reinforcement-learning
  - composable-skills
  - networkx
  - notion
  - token-efficiency
  - andrej-karpathy
last_compiled: '2026-04-08T22:56:17.664Z'
---
# Model Context Protocol (MCP)

## What It Is

Model Context Protocol is an open protocol that standardizes communication between LLM applications (hosts) and external tools, data sources, and services (servers). Before MCP, every integration required custom glue code: a Claude plugin connecting to a database needed different wiring than a Cursor plugin connecting to the same database. MCP provides the shared vocabulary so one server works with any compliant host.

Anthropic published MCP in November 2024. By mid-2025, it had become the de facto standard for LLM tool connectivity, with implementations spanning [Claude](../projects/claude.md), [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), [OpenAI Codex](../projects/codex.md), [Gemini](../projects/gemini.md), [Ollama](../projects/ollama.md), and [LangChain](../projects/langchain.md). The protocol's adoption curve is unusually steep for an infrastructure standard, driven primarily by Claude Code's default MCP integration making server development immediately rewarding.

## Architecture

MCP defines three layers:

**Transport.** Servers communicate over stdio (local subprocess) or HTTP with Server-Sent Events (remote). The stdio transport runs the server as a child process of the host, which keeps local integrations simple and secure. HTTP+SSE enables hosted servers accessible to multiple clients simultaneously.

**Protocol.** JSON-RPC 2.0 over the transport layer. Every message is either a request (with `id`, `method`, and `params`) or a response (with matching `id` and either `result` or `error`). The protocol is stateful: clients and servers maintain a session with negotiated capabilities declared during the `initialize` handshake. The handshake exchanges protocol versions and capability flags, allowing servers to advertise which primitives they support.

**Primitives.** Three core primitives define what servers can expose:

- **Tools** — Functions the LLM can call. Each tool has a name, description, and JSON Schema input definition. The host presents the tool list to the model; the model decides when to call them. Tools are the primary primitive for taking actions (running queries, writing files, calling APIs).

- **Resources** — Data the host can read. A resource has a URI and MIME type. Unlike tools, resources don't require the model to trigger them — the host can subscribe to resource changes and proactively inject updated content into context. A file system server might expose `file:///project/src/main.py` as a resource that updates whenever the file changes.

- **Prompts** — Reusable prompt templates with arguments. Servers define named prompts (e.g., `review-code`) that hosts can invoke to construct structured messages. Less commonly implemented than tools, but useful for standardizing interaction patterns.

A fourth primitive, **Sampling**, inverts the flow: servers can request the host's LLM to generate text as part of server-side logic. This enables server-side agents that leverage the host's model without needing their own API keys.

## How Context Engineering Fits In

MCP sits at the boundary between [Context Engineering](../concepts/context-engineering.md) and tool connectivity. The formal context decomposition `C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)` maps onto MCP primitives directly: tools populate `c_tools`, resources populate `c_know`, and prompts contribute to `c_instr`. The protocol handles the *transport* of these components; context engineering handles *what* to include and *when*.

The token economics matter here. As analyzed in the agent skills survey, each MCP tool definition consumes 2-5K tokens from the context window. A host connecting to 20 MCP servers might spend 40-100K tokens just on tool definitions — half a 200K context window. Production deployments cap active MCP connections (Claude Code's recommended limit is 10 servers per project) and use tool discovery mechanisms to load definitions on demand rather than all at once.

[Agent Skills](../concepts/agent-skills.md) and MCP are complementary rather than competing. Skills (SKILL.md files) provide procedural knowledge — *what to do* and *how to interpret results*. MCP provides connectivity — *how to reach* the tools the skills describe. A skill for database analysis would instruct the agent on query strategy and result interpretation; MCP would provide the actual database connection.

## Relationship to Memory and Knowledge Systems

MCP servers wrap virtually every storage and knowledge system in the agent infrastructure ecosystem:

- [Vector Database](../concepts/vector-database.md) servers expose semantic search over embeddings, enabling MCP-connected RAG
- [Knowledge Graph](../concepts/knowledge-graph.md) servers built on [NetworkX](../projects/networkx.md) or [Neo4j](../projects/neo4j.md) expose graph traversal as tool calls
- [Notion](../projects/notion.md) servers treat pages as resources, letting agents read and write structured documents
- Memory systems like [Mem0](../projects/mem0.md) and [Zep](../projects/zep.md) expose recall and storage as tools

The [GEPA](../concepts/gepa.md) framework includes a dedicated MCP adapter in `adapters/`, which lets GEPA optimize the tool descriptions in MCP server definitions — essentially using evolutionary search to improve how servers describe their capabilities to models, which affects how reliably models invoke them correctly.

## Comparison to Alternatives

**OpenAI Responses API / function calling.** OpenAI's native tool use is schema-compatible with MCP (both use JSON Schema for tool definitions) but lacks the server abstraction. Each integration remains custom code; there is no standard for a reusable, deployable tool server. OpenAI has adopted MCP as a supported protocol in their agents SDK rather than competing with it directly.

**[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md).** RAG retrieves documents into context at inference time; MCP provides the connectivity layer through which RAG calls happen. An MCP server can implement a RAG pipeline, making RAG and MCP complementary at different abstraction levels. MCP-connected RAG lets multiple hosts share the same retrieval infrastructure without duplicating it.

**[LangChain](../projects/langchain.md) tools.** LangChain's tool abstraction predates MCP and solves a similar problem within the LangChain ecosystem. LangChain added MCP integration (the `langchain-mcp-adapters` package) to bridge the two, allowing LangChain tools to be exposed as MCP servers and MCP servers to be used as LangChain tools. The key difference: LangChain tools are Python objects within a specific framework; MCP servers are processes accessible to any compliant host.

## Strengths

**Interoperability without negotiation.** A PostgreSQL MCP server built once works with Claude, Cursor, Gemini, and any future compliant host. The ecosystem network effect compounds: server authors benefit from every new host implementation without additional work.

**Security boundary enforcement.** The stdio transport model runs servers as separate processes. A compromised or malicious server cannot directly access the host process's memory or credentials. The capability handshake lets hosts declare exactly which primitives they'll accept, preventing servers from overstepping.

**Incremental adoption.** Existing APIs and tools can be wrapped as MCP servers without rewriting them. The [Tree-sitter](../projects/tree-sitter.md) integration in code agents, for example, wraps the existing tree-sitter parsing library behind a standard tool interface.

**Real-time context updates.** Resource subscriptions let servers push updates to hosts when underlying data changes. This closes a gap in static RAG approaches where context becomes stale between retrievals.

## Limitations

**One concrete failure mode: tool count vs. context budget.** The protocol has no native mechanism for partial tool loading. When a host connects to an MCP server, it receives all tool definitions in the initialization response. A large MCP server exposing 50+ specialized tools can consume significant context before any user query. The workaround — separate specialized servers and connect only what's needed per task — pushes management complexity to the operator.

**One unspoken infrastructure assumption: server lifecycle management.** The protocol defines communication but not deployment. Running 10 MCP servers per project (Claude Code's recommended limit) means 10 processes to start, monitor, restart on failure, and update independently. Production deployments need service management infrastructure (systemd, Docker Compose, Kubernetes) that the protocol specification does not address. This is obvious to infrastructure engineers and invisible in the documentation.

**Authorization is underspecified.** The protocol transmits tool calls and results but provides no standard mechanism for the server to verify the host's identity or for per-user permission scoping. OAuth 2.0 integration is defined for HTTP+SSE transport in the 2025 spec revision, but stdio servers have no standard auth mechanism. A server that provides sensitive data access must implement its own authorization logic.

**Prompt injection via resources.** Resources inject text directly into context with the same trust level as the host's system prompt from the model's perspective. A malicious or compromised resource could inject adversarial instructions. This is the MCP-specific instance of the general [Agent Skills](../concepts/agent-skills.md) security concern — the 26.1% vulnerability rate in community skills has a direct analogue in community MCP servers, where server descriptions and resource content can carry prompt injection payloads.

## When NOT to Use MCP

**When latency is the primary constraint.** MCP adds round-trip overhead: the host serializes a JSON-RPC request, the subprocess deserializes it, executes the tool, serializes a response, and the host deserializes the result. For high-frequency tool calls (hundreds per second), this overhead accumulates. Direct function calls within the same process are faster.

**When you control both ends and only one LLM host will ever use the integration.** If you're building a single-purpose agent that will only ever connect to your specific data source, the abstraction overhead of MCP provides no benefit. The protocol earns its cost when multiple hosts share the same server or when you expect the server to outlast your current host implementation.

**When you need complex stateful tool orchestration.** MCP tools are stateless from the protocol's perspective — each tool call is independent. Workflows requiring sequential tool calls with shared state across calls (maintaining a transaction, holding a file lock, iterating a cursor) require the server to manage state internally with session-scoped context, which is possible but awkward in the protocol's model.

## Unresolved Questions

**Governance at scale.** Anthropic publishes the specification and maintains reference implementations, but there is no independent standards body. If Anthropic changes the protocol in ways that break existing servers, the ecosystem has no recourse mechanism. The v1.0 to current spec already introduced breaking changes in the capability negotiation format.

**Cost attribution in shared server deployments.** When a hosted MCP server serves multiple LLM hosts, the server operator bears the compute cost of serving tool calls without a standard billing mechanism. This creates a free-rider problem that has slowed the development of public hosted MCP infrastructure relative to local server adoption.

**Discovery and registry.** There is no standard protocol for discovering available MCP servers or verifying their authenticity. Server discovery currently happens through documentation, word-of-mouth, and platform-specific marketplaces (e.g., Claude's integrations directory). A compromised server that impersonates a legitimate one (say, a fake GitHub MCP server) has no technical barrier to adoption by unsuspecting users.

**Conflict resolution between servers.** When two connected MCP servers both expose a `search` tool with different behaviors, the host must resolve the ambiguity. The protocol provides no standard for namespace management or capability negotiation between servers. Hosts handle this differently, creating inconsistent behavior across implementations.

## Connections

- [Context Engineering](../concepts/context-engineering.md) — MCP is the connectivity layer; context engineering determines what to request through that layer
- [Agent Skills](../concepts/agent-skills.md) — Skills describe how to use MCP-connected tools; MCP provides the connections skills describe
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — MCP's sampling primitive enables server-side agent behavior and agent-to-agent communication patterns
- [Token Efficiency](../concepts/token-efficiency.md) — Tool definition token costs make MCP server management an active context budget concern
- [ReAct](../concepts/react.md) — The reasoning-action loop that MCP tool calls implement at the connectivity level
- [Semantic Search](../concepts/semantic-search.md) — Commonly wrapped as an MCP server to enable RAG from any compliant host


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.8)
- [Cursor](../projects/cursor.md) — implements (0.7)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — alternative_to (0.5)
- [Knowledge Graph](../concepts/knowledge-graph.md) — implements (0.6)
- [OpenAI](../projects/openai.md) — alternative_to (0.5)
- [Claude](../projects/claude.md) — implements (0.8)
- [OpenClaw](../projects/openclaw.md) — implements (0.6)
- [Anthropic](../projects/anthropic.md) — created_by (0.9)
- [Context Engineering](../concepts/context-engineering.md) — implements (0.7)
- [Windsurf](../projects/windsurf.md) — implements (0.6)
- [OpenAI Codex](../projects/codex.md) — implements (0.6)
- [Episodic Memory](../concepts/episodic-memory.md) — implements (0.4)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.7)
- [Ollama](../projects/ollama.md) — implements (0.5)
- [Gemini](../projects/gemini.md) — implements (0.5)
- [Vector Database](../concepts/vector-database.md) — implements (0.6)
- [Tree-sitter](../projects/tree-sitter.md) — implements (0.5)
- [ReAct](../concepts/react.md) — implements (0.5)
- [LangChain](../projects/langchain.md) — implements (0.6)
- [Agent Skills](../concepts/agent-skills.md) — implements (0.7)
- [Semantic Search](../concepts/semantic-search.md) — implements (0.5)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — implements (0.6)
- [GPT-4](../projects/gpt-4.md) — implements (0.4)
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — implements (0.3)
- [Compositional Skill Synthesis](../concepts/composable-skills.md) — implements (0.6)
- [NetworkX](../projects/networkx.md) — implements (0.4)
- [Notion](../projects/notion.md) — implements (0.4)
- [Token Efficiency](../concepts/token-efficiency.md) — implements (0.6)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.3)

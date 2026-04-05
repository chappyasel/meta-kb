---
entity_id: mcp
type: concept
bucket: context-engineering
sources:
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - repos/getzep-graphiti.md
  - repos/aiming-lab-simplemem.md
  - repos/memorilabs-memori.md
  - repos/natebjones-projects-ob1.md
  - repos/gepa-ai-gepa.md
  - repos/supermemoryai-supermemory.md
  - repos/anthropics-skills.md
  - repos/greyhaven-ai-autocontext.md
  - repos/thedotmack-claude-mem.md
  - repos/wangziqi06-724-office.md
  - repos/caviraoss-openmemory.md
  - repos/agent-on-the-fly-memento.md
  - repos/tirth8205-code-review-graph.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/infiniflow-ragflow.md
  - repos/yusufkaraaslan-skill-seekers.md
  - articles/effective-context-engineering-for-ai-agents.md
  - repos/affaan-m-everything-claude-code.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/repos/letta-ai-letta.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/topoteretes-cognee.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Claude Code
  - OpenAI
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T05:22:11.883Z'
---
# Model Context Protocol (MCP)

## What It Is

Model Context Protocol is an open protocol, published by Anthropic in late 2024, that standardizes the interface between LLMs and external systems. Before MCP, every AI application that needed to call a database, run code, search the web, or read files built its own custom integration layer. MCP replaces that patchwork with a single client-server protocol: the model speaks MCP on one side, and anything the model needs to reach implements an MCP server on the other.

The analogy to USB-C is overused but accurate at the mechanical level: one port, many devices. What the analogy misses is that MCP governs not just connectivity but capability negotiation, context injection, and tool invocation semantics.

## Why It Exists

The problem MCP solves is coordination cost at the integration layer. An LLM that can call tools is only useful if someone has written and maintained the glue code connecting it to each tool. Pre-MCP, building an agent that used GitHub, Slack, and a PostgreSQL database meant writing three separate integrations, each with its own authentication scheme, error handling, and data serialization format. When the agent switched from GPT-4 to Claude, you might rewrite all three. MCP moves this cost to the server authors: write one MCP server for your tool, and any MCP-compliant client can use it.

This matters specifically because [agent skills](agent-skills.md), as documented in Anthropic's public skills repository, treat MCP as a foundational layer. The `SKILL.md` specification can reference MCP servers to extend what an agent can do without retraining. The two systems are complementary: skills provide instruction packages, MCP provides the runtime capability to execute against external systems.

## Core Architecture

MCP defines three primitive types that servers expose to clients:

**Tools** are callable functions with typed input schemas. When a model invokes a tool, the MCP server executes the underlying operation (an API call, a file read, a database query) and returns structured results. Tools are the most commonly implemented primitive.

**Resources** are data sources the model can read: files, database rows, live feeds. Unlike tools, resources represent content to be consumed rather than actions to be taken.

**Prompts** are server-defined prompt templates that clients can request. This allows server authors to package domain-specific prompting patterns alongside their tools.

The transport layer is intentionally simple. MCP runs over stdio for local processes and HTTP with Server-Sent Events for remote servers. The message format is JSON-RPC 2.0. Capability negotiation happens at connection time: clients send an `initialize` request, servers respond with the list of tools, resources, and prompts they support.

Servers are stateless by default. Each tool call is independent. This keeps servers simple to implement but pushes session management responsibility to the client (typically the agent framework or the host application).

## How a Tool Call Works

1. The host application starts an MCP server process (or connects to a remote one over HTTP).
2. During initialization, the client receives a manifest of available tools with their JSON Schema definitions.
3. The model's context includes descriptions of these tools (injected by the host).
4. When the model decides to call a tool, it emits a structured tool-use block.
5. The host intercepts this, routes it to the appropriate MCP server via the protocol, and returns the result.
6. The result is injected back into the model's context as a tool result.

The model never speaks directly to the external system. The MCP server is the adapter that translates protocol calls into whatever the underlying system requires.

## Who Implements It

Anthropic ships Claude Code with native MCP support. Claude.ai's desktop application connects to local MCP servers. OpenAI added MCP support in early 2025. The [Graphiti](../projects/graphiti.md) project ships an MCP server that exposes its temporal knowledge graph to any MCP-compatible client, allowing Claude, Cursor, and other tools to query evolving entity graphs through a standard interface.

The ecosystem expanded faster than the specification. As of early 2026, hundreds of community MCP servers exist for tools ranging from browser automation to vector databases. The [agent skills survey](agent-skills.md) notes MCP's role as infrastructure for the broader skill ecosystem, treating it as the runtime execution layer that skill packages depend on.

## Strengths

**Decoupled development.** Server authors ship MCP servers independently of client updates. A Notion MCP server written today works with any future MCP-compatible client without modification.

**Capability discovery.** Clients learn what servers can do at runtime through the initialization handshake rather than through hardcoded knowledge. This allows dynamic tool sets and server versioning without client-side changes.

**Language agnosticism.** The JSON-RPC transport means servers can be written in any language. Python and TypeScript SDKs are the most mature, but the protocol itself imposes no language constraint.

**Composability with skills.** Because skills are instruction packages and MCP servers are execution environments, they compose cleanly. A skill can instruct the model to use a specific MCP tool; the MCP server handles the mechanics. Anthropic's skills repository includes a skill for generating new MCP servers, which closes a useful loop.

## Limitations

**No authorization standard.** MCP defines how tools are called but not how access is controlled. Authentication is left to server implementors, which means the ecosystem has fragmented approaches: some servers use OAuth, some use API keys passed as environment variables, some have nothing at all. For multi-tenant deployments where different users should have different tool access, you build authorization on top of MCP yourself.

**Concrete failure mode:** A model operating with broad tool access (common in agent frameworks that expose all connected servers) can invoke destructive tools in unexpected contexts. If an MCP server exposes both read and write operations, and the model's task involves a read operation but the tool descriptions are ambiguous, the model may call the write tool. MCP has no built-in confirmation step, no tool-level permission scoping per session, and no rollback mechanism. The host application must implement all of these.

**Hidden infrastructure assumption.** MCP servers for cloud services require persistent network connectivity and valid credentials at all times. Agents designed around remote MCP servers fail silently or noisily when services are unavailable, credentials expire, or rate limits are hit. The protocol has no standard mechanism for graceful degradation: a server that returns errors looks identical to a server that's permanently gone.

**Statelessness cuts both ways.** Simple servers stay simple, but tools that require multi-step workflows (authenticate, then query, then paginate) push that complexity into either the tool implementation (making servers monolithic) or the model's reasoning loop (making calls expensive and error-prone).

## Security

The [agent skills survey](agent-skills.md) found that 26.1% of community-contributed skills contain vulnerabilities, with MCP servers sharing the same exposure surface. The attack vectors are predictable: prompt injection via tool results (a malicious document returned by a file-reading tool instructs the model to call a different tool), overly permissive tool schemas that accept arbitrary code execution, and server implementations that trust model-provided inputs without validation.

Anthropic's proposed mitigation is a four-tier permission model tied to skill provenance: first-party skills from verified publishers get broader tool access; community skills run with restricted permissions until reviewed. This governance model is described in the survey paper but not yet standardized in the MCP spec itself.

## When Not to Use MCP

**When you control both sides of the integration.** If you're building a single application where the model and the tools are tightly coupled, a direct function-calling API (OpenAI's, Anthropic's, or Gemini's) with typed schemas is simpler and faster. MCP's value is in the shared ecosystem; internal integrations don't benefit from that.

**When you need transactional guarantees.** MCP servers don't support transactions across multiple tool calls. If your use case requires atomicity (either all these writes succeed or none do), you need to implement that at the application layer or choose a different architecture.

**When latency is critical.** The stdio or HTTP transport, plus JSON serialization, plus server process startup adds overhead. For high-frequency, low-latency inference pipelines, this cost accumulates. Direct SDK calls will be faster.

**When your tools require complex session state.** OAuth flows, stateful API sessions, and multi-step authentication sequences are awkward to fit into MCP's stateless model. Possible, but the implementation complexity negates the protocol's simplicity benefits.

## Unresolved Questions

**Governance of the server ecosystem.** There is no central registry with quality or security guarantees. Community MCP servers are discovered through GitHub, blog posts, and informal lists. The spec doesn't define how a client should evaluate server trustworthiness before connecting.

**Versioning and compatibility.** The spec has evolved since launch. How client and server negotiate protocol versions when they differ is underspecified in practice, which means version mismatches produce unhelpful errors rather than graceful fallbacks.

**Cost attribution.** In multi-server deployments, a single model response may trigger tool calls across several MCP servers, each making its own API calls to external services. The total cost of a "cheap" model interaction can be substantial and is invisible without per-server instrumentation that MCP doesn't standardize.

**Conflict resolution between tools.** When two connected MCP servers expose tools with similar names or overlapping functionality, the model chooses between them based on descriptions alone. There's no deduplication, priority system, or disambiguation mechanism in the protocol.

## Relationship to Alternatives

MCP is not a replacement for Retrieval-Augmented Generation. RAG injects retrieved content into context; MCP calls tools that may or may not return content. They compose: an MCP server can expose a vector search tool that implements RAG under the hood, making them architecturally complementary rather than competing.

**Use OpenAI/Anthropic function calling directly** when you're building a single-provider application with a small, stable tool set. The native APIs have lower latency and simpler debugging.

**Use MCP** when you want your tools to work across multiple AI clients, when you're building tools for others to use, or when you're composing capabilities from multiple independently-developed servers.

**Use LangChain tools or similar framework abstractions** when you need Python-native tool definitions with rich middleware (retries, logging, caching) and don't need cross-client portability.

**Use Graphiti's MCP server** specifically when your agent needs temporally-aware knowledge graph queries: the Graphiti server exposes hybrid search (semantic plus keyword plus graph traversal) through standard MCP tool calls, giving any MCP client access to evolving entity graphs without custom integration code.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.8)
- [OpenAI](../projects/openai.md) — implements (0.6)
- [Retrieval-Augmented Generation](../concepts/rag.md) — alternative_to (0.3)

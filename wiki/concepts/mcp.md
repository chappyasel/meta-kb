---
entity_id: mcp
type: concept
bucket: context-engineering
abstract: >-
  MCP is Anthropic's open protocol that standardizes how LLMs connect to
  external tools and data sources — USB-C for AI, replacing bespoke per-tool
  integrations with a single client/server interface.
sources:
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - repos/getzep-graphiti.md
  - repos/aiming-lab-simplemem.md
  - repos/affaan-m-everything-claude-code.md
  - repos/supermemoryai-supermemory.md
  - repos/memorilabs-memori.md
  - repos/natebjones-projects-ob1.md
  - repos/greyhaven-ai-autocontext.md
  - repos/caviraoss-openmemory.md
  - repos/wangziqi06-724-office.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/tirth8205-code-review-graph.md
  - repos/infiniflow-ragflow.md
  - repos/agent-on-the-fly-memento.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/agent-skills-overview.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Claude Code
  - Anthropic
  - OpenAI
  - Claude
  - Retrieval-Augmented Generation
  - Cursor
  - OpenAI
  - OpenAI Codex
  - Windsurf
  - OpenClaw
  - OpenCode
  - LangChain
  - GraphRAG
  - Context Engineering
  - Vector Database
  - GPT-4
  - Mem0
  - CrewAI
  - Knowledge Graph
  - Ollama
  - skill.md
  - A-MEM
  - Procedural Memory
  - Google Gemini
last_compiled: '2026-04-05T20:22:06.279Z'
---
# Model Context Protocol (MCP)

## What It Is

Model Context Protocol is an open standard, published by Anthropic in November 2024, that defines how AI applications connect to external tools, data sources, and services. Before MCP, every integration between an LLM application and an external system (a database, a file system, a web browser, a code executor) required custom code on both sides. MCP replaces that fragmentation with a single, negotiated protocol: one client implementation per host application, one server implementation per tool or data source.

The analogy Anthropic uses is USB-C — a universal connector that works regardless of what device sits on either end. The more precise technical analogy is Language Server Protocol (LSP), which MCP deliberately mirrors in structure. LSP standardized how code editors communicate with language-specific analysis tools; MCP does the same for LLM applications and external capabilities.

MCP ships under the MIT license. The specification, SDKs, and reference implementations live at [github.com/modelcontextprotocol](https://github.com/modelcontextprotocol). As of mid-2026, the protocol has been adopted by Claude, Claude Code, Cursor, Windsurf, OpenCode, OpenClaw, Ollama, LangChain, CrewAI, Google Gemini, GPT-4, and dozens of third-party tools.

## Architecture

### The Three-Role Model

MCP defines three roles:

**Host**: The LLM application (Claude Desktop, Cursor, a custom agent). The host manages one or more MCP clients, controls the LLM context window, and decides which tools the model may call.

**Client**: A connection within the host that maintains a 1:1 session with a single MCP server. Clients handle protocol negotiation, capability exchange, and message routing.

**Server**: An external process that exposes capabilities (tools, resources, prompts) to any compliant client. Servers can be local processes communicating over stdio or remote services communicating over HTTP with Server-Sent Events.

This three-role structure means any host can connect to any server without either side knowing specifics about the other. Claude Code and Cursor can both talk to the same filesystem MCP server. The same Slack MCP server works identically for Claude and GPT-4.

### Transport Layer

MCP supports two transport mechanisms:

**stdio**: Server runs as a subprocess. The host spawns the process and communicates over stdin/stdout using JSON-RPC 2.0 messages. This is the dominant pattern for local tools — filesystem access, code execution, browser automation.

**HTTP + SSE**: Server runs as a persistent HTTP service. The client sends requests over HTTP POST; the server streams responses back via Server-Sent Events. This enables remote servers, multi-tenant deployments, and servers that persist state across sessions.

JSON-RPC 2.0 is the message format throughout. Every MCP message is a JSON-RPC request, response, or notification. Protocol negotiation happens at connection initialization: client and server exchange capability declarations, establishing which features both sides support before any tool calls occur.

### The Three Primitive Types

MCP exposes external capabilities through three primitives:

**Tools**: Functions the model can invoke. Each tool has a name, a description, and a JSON Schema for its parameters. The server executes the tool and returns results. Tools are the primary mechanism for anything that *does* something — running code, querying a database, sending a message. Tools are model-controlled: the LLM decides when to call them.

**Resources**: Data sources the model can read. Resources have URIs and MIME types. They expose file contents, database records, API responses, or any structured data. Resources are application-controlled: the host decides when to expose them. They map onto the concept of context — things the model should know about.

**Prompts**: Pre-written prompt templates with optional arguments. Servers can expose prompt templates that clients surface to users (e.g., as slash commands). Prompts are user-controlled: the human explicitly invokes them.

This three-way division matters architecturally. Tool calls require explicit model reasoning and consume inference. Resources can be injected into context without model decision-making. Prompts structure user interaction at the application layer. Conflating these three categories — or building everything as tools — produces inefficient, unreliable agent behavior.

### Capability Negotiation

When a client connects to a server, both sides declare their capabilities:

```json
{
  "capabilities": {
    "tools": {},
    "resources": {"subscribe": true, "listChanged": true},
    "prompts": {"listChanged": true},
    "logging": {}
  }
}
```

Servers that support `subscribe` on resources can push updates when resource contents change — this is how a server can notify an agent that a file it's monitoring has been modified. `listChanged` lets servers announce that their tool or prompt lists have changed, enabling dynamic capability discovery without reconnecting.

This negotiation makes MCP forward-compatible: clients and servers gracefully ignore capabilities they don't understand, so new protocol features don't break existing implementations.

## How the Integration Actually Works

### Discovery

There is no central MCP registry. Servers are configured manually in client configuration files. Claude Desktop and Claude Code use a JSON configuration file (`.claude/mcp.json` or the application's settings directory) that lists server names, commands or URLs, and arguments:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
    },
    "github": {
      "command": "uvx",
      "args": ["mcp-server-github"],
      "env": {"GITHUB_TOKEN": "..."}
    }
  }
}
```

The client spawns these servers on startup and maintains connections throughout the session.

### Tool Call Flow

When the model decides to call a tool:

1. The host intercepts the model's tool call request (formatted per the host's native function calling API)
2. The MCP client routes the request to the appropriate server based on tool name
3. The server executes the tool and returns a result
4. The client delivers the result back to the host
5. The host injects the result into the model's context

From the model's perspective, tools look identical regardless of whether they're backed by MCP servers or native host implementations. From the server's perspective, the execution request arrives as a standard JSON-RPC call regardless of which host made it.

### Context Window Economics

MCP server integrations consume context. Each tool definition occupies approximately 2-5K tokens in the context window. The gstack project (a Claude Code skill collection that implements MCP) explicitly models this: with a 200K token context window, each MCP tool definition costs 2-5K tokens, and enabling more than 10 MCP servers simultaneously can consume 20-50K tokens — 10-25% of the available context — before any actual work begins. Production deployments limit active MCP servers to 10-15 per session.

This is not a theoretical concern. Claude Code's documentation for multi-MCP deployments recommends explicitly scoping which servers are active per project rather than enabling all available servers globally.

## Who Implements It

The protocol has broad adoption across the ecosystem documented in this knowledge base:

**[Claude Code](../projects/claude-code.md)** treats MCP as its primary extension mechanism. The code-review-graph project [implements MCP as its integration layer](../projects/code-review-graph.md), exposing 22 tools and 5 prompt templates over stdio transport via FastMCP.

**[Cursor](../projects/cursor.md)** and **[Windsurf](../projects/windsurf.md)** both implement MCP clients, allowing the same servers to work across competing IDE products.

**[LangChain](../projects/langchain.md)** and **[CrewAI](../projects/crewai.md)** integrate MCP as part of their agent tool ecosystems, letting framework-built agents consume any MCP server without custom integration code.

**[OpenMemory](../projects/openmemory.md)** exposes its memory primitives as five MCP tools (`openmemory_query`, `openmemory_store`, `openmemory_list`, `openmemory_get`, `openmemory_reinforce`), making it usable from any compliant host. The [Everything Claude Code](../projects/everything-claude-code.md) project includes MCP tool description optimization as a target for GEPA-based prompt optimization, treating the tool descriptions themselves as tunable parameters.

**[Ollama](../projects/ollama.md)** and **[Google Gemini](../projects/google-gemini.md)** both implement MCP clients, extending the protocol beyond Anthropic's own products.

**[GEPA](../projects/gepa.md)** includes an MCP adapter specifically for optimizing MCP tool descriptions — recognizing that poorly written tool descriptions are a primary cause of tool call failures.

## Strengths

**Genuine interoperability**: A server built once works with Claude, Cursor, GPT-4, and Gemini without modification. This is not a marketing claim — the ecosystem has validated it across dozens of production implementations.

**Clean separation of concerns**: The host, client, and server roles distribute responsibility sensibly. Server authors don't need to know about context management. Host authors don't need to know about tool implementation details. The protocol boundary handles translation.

**Progressive disclosure**: The three primitives (tools, resources, prompts) cover most integration patterns without requiring complex orchestration. Simple tools need only a name, description, and parameter schema. Complex servers can add resource subscriptions, prompt templates, and streaming responses as needed.

**Stdio transport for local tools**: Running servers as local subprocesses keeps sensitive operations (file system access, code execution) out of the network. The server process is sandboxed by whatever OS-level permissions the subprocess has.

## Critical Limitations

**No built-in authentication standard**: MCP defines the protocol but not the authentication model. Each server handles authentication differently — environment variables, OAuth flows, API keys in configuration. There is no standardized way for a server to request credentials from the user, verify caller identity, or manage token rotation. This creates significant friction for enterprise deployments where credential management is a compliance requirement.

**Token cost scales with server count**: This is the unspoken infrastructure assumption. An organization that deploys 30 MCP servers and enables all of them in every Claude Code session pays a per-session context tax of 60-150K tokens before a single user message. Most documentation shows MCP configuration with 3-5 servers. Production deployments with large server fleets require explicit session-level server activation, which operators rarely build correctly on first attempt.

## Concrete Failure Mode

Tool descriptions drift from tool behavior. MCP transfers a tool's natural language description verbatim into the model's context. When a server is updated and the underlying tool behavior changes but the description doesn't, the model calls the tool with incorrect assumptions about what it does. Unlike type-checked interfaces, MCP descriptions have no validation layer — a tool described as "returns the current file contents" will be called as though it does exactly that even if the implementation now returns a diff. The GEPA project found this significant enough to build a dedicated MCP tool description optimizer.

## When Not to Use It

MCP is wrong for high-frequency tool calls within a tight inference loop. If an agent needs to call the same tool 50-100 times per second, the JSON-RPC overhead and subprocess communication latency accumulate. Native function calling in the host's inference stack is faster for this pattern.

MCP is also wrong when tool call security requires tight access control. The protocol has no built-in mechanism for the server to verify which user or session is making a call. A compromised context (prompt injection in retrieved data) can cause the model to call tools it shouldn't. High-security deployments need additional authorization layers that MCP doesn't provide.

Finally, MCP adds configuration overhead that doesn't pay off for tools used by a single application. If only one host will ever use a particular tool, implementing it as a native function is simpler than building and maintaining an MCP server.

## Unresolved Questions

**Governance after Anthropic**: MCP is currently governed by Anthropic. There is no independent standards body, no formal RFC process, and no published roadmap for transferring governance. If Anthropic changes direction on MCP, there is no community fallback.

**Versioning at scale**: The protocol uses semantic versioning, but there is no published compatibility matrix between client and server versions. As servers proliferate, version compatibility becomes a real operations problem that the spec doesn't address.

**Cost of capability negotiation at fleet scale**: In a large deployment with hundreds of servers registered globally and session-level activation, the capability negotiation overhead on session start can become measurable. The spec provides no guidance on lazy loading or deferred capability discovery.

**Sampling**: The spec defines a `sampling` capability that lets servers request LLM completions from the host. This is powerful (servers can use the model themselves) but creates complex recursive call chains. Almost no production deployment uses sampling, and its security implications are underexplored.

## Alternatives

**Direct function calling (OpenAI-style)**: Every major LLM API supports structured function/tool calling natively. For applications that use a single model provider, direct function calling requires no additional infrastructure and has lower latency than MCP. Use this when you have one model, few tools, and no cross-application sharing requirement.

**LangChain tool abstraction**: [LangChain](../projects/langchain.md) wraps tools in its own abstraction layer and generates tool schemas automatically from Python type annotations. Faster to build than MCP for Python-native stacks. Use this when you're already in the LangChain ecosystem and don't need non-Python clients.

**REST APIs with OpenAPI specs**: For tools that need to be callable by both AI agents and human-facing applications, a well-documented REST API with an OpenAPI spec provides similar discoverability to MCP with broader client support. Use this when the tooling serves multiple audiences beyond AI agents.

**Semantic kernel plugins**: Microsoft's Semantic Kernel SDK has its own plugin standard that generates tool schemas from function annotations. Native fit for .NET and Azure deployments. Use this when working in the Microsoft AI ecosystem.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): MCP is the primary mechanism for programmatic context manipulation
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): RAG pipelines frequently expose their retrieval layer as MCP resources
- [Vector Database](../concepts/vector-database.md): Common backing store for MCP resource servers
- [Knowledge Graph](../concepts/knowledge-graph.md): Graph-based MCP resources enable structural context retrieval

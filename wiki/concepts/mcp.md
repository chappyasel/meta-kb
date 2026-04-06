---
entity_id: mcp
type: concept
bucket: context-engineering
abstract: >-
  Model Context Protocol (MCP) is Anthropic's open standard for connecting AI
  models to external tools and data sources, differentiating through a
  client-server architecture that lets any compliant tool work with any
  compliant model without custom integrations.
sources:
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - repos/aiming-lab-simplemem.md
  - repos/affaan-m-everything-claude-code.md
  - repos/memorilabs-memori.md
  - repos/natebjones-projects-ob1.md
  - repos/greyhaven-ai-autocontext.md
  - repos/thedotmack-claude-mem.md
  - repos/wangziqi06-724-office.md
  - repos/caviraoss-openmemory.md
  - repos/tirth8205-code-review-graph.md
  - repos/infiniflow-ragflow.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/agent-on-the-fly-memento.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/agent-skills-overview.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - claude-code
  - cursor
  - anthropic
  - claude
  - openai
  - windsurf
  - context-engineering
  - openai-codex
  - mem0
  - openclaw
  - gemini
  - progressive-disclosure
  - knowledge-graph
  - ollama
  - continual-learning
  - vector-database
  - supermemory
last_compiled: '2026-04-06T01:58:37.893Z'
---
# Model Context Protocol (MCP)

## What It Is

Model Context Protocol is an open standard released by [Anthropic](../projects/anthropic.md) in November 2024 that defines how AI models communicate with external systems. Before MCP, every tool integration required custom code: a different API wrapper for each model, a different implementation for each data source. MCP replaces this with a single protocol where any MCP-compliant client (a model or agent) can connect to any MCP-compliant server (a tool, database, or service) without integration-specific code.

The analogy to HTTP is useful: HTTP standardized how browsers talk to servers, enabling the web to scale. MCP attempts the same for AI model-to-tool communication. Whether the model is [Claude](../projects/claude.md), [Gemini](../projects/gemini.md), or a locally-run model via [Ollama](../projects/ollama.md), and whether the tool exposes files, APIs, or databases, the communication uses the same message format.

This matters for [context engineering](../concepts/context-engineering.md) because MCP formalizes how agents acquire context dynamically. Rather than pre-loading everything into a prompt, an agent can call an MCP server at inference time to retrieve exactly the context needed for the current task.

## Core Architecture

MCP uses a client-server model with three participant roles:

**Hosts** are the applications users interact with: [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), or any agent framework. The host manages the LLM connection and coordinates between the model and any connected servers.

**Clients** live inside the host and maintain one-to-one connections with MCP servers. The client handles protocol-level communication, capability negotiation, and message routing.

**Servers** are lightweight programs that expose three primitive types:
- **Tools**: Functions the model can call (web search, code execution, API calls)
- **Resources**: Data the model can read (files, database records, live data streams)
- **Prompts**: Pre-written templates for common interactions

The transport layer supports two modes: `stdio` for local processes (the server runs as a subprocess, communicating via standard input/output) and HTTP with Server-Sent Events for remote servers. The underlying message format is JSON-RPC 2.0.

When an agent needs to use a tool, it doesn't call the tool directly. It asks the MCP client to list available tools, selects one based on descriptions, sends a `tools/call` request, and receives a structured response. The model never sees raw API responses — it sees MCP-formatted results that can include text, images, or embedded resources.

## How It Works in Practice

A concrete example from the [code-review-graph](../projects/code-review-graph.md) source material: a FastMCP server registers 22 tools over stdio transport. When Claude Code connects, it calls `tools/list` to discover available tools (build_or_update_graph_tool, get_review_context_tool, get_impact_radius_tool, etc.) and their descriptions. When reviewing a file change, Claude Code calls `get_review_context_tool` with a git diff, and the server computes the blast radius, returns the minimal relevant file set, and Claude gets structured context instead of reading the entire codebase.

The [Supermemory](../projects/supermemory.md) MCP server follows the same pattern with three tools: `memory` (save/forget facts), `recall` (semantic search), and `context` (full profile injection). Installation via `npx -y install-mcp@latest https://mcp.supermemory.ai/mcp --client claude --oauth=yes` configures the connection. Claude Desktop, Cursor, and other MCP-compatible hosts all use this same server without any host-specific implementation.

The session lifecycle follows a fixed sequence: initialize (capability negotiation), list tools/resources/prompts, use them as needed, and shut down. Servers declare their capabilities during initialization — a server that only exposes resources doesn't need to handle tool call messages.

## Relationship to Context Engineering

MCP is the delivery mechanism for [progressive disclosure](../concepts/progressive-disclosure.md): instead of injecting all possible context upfront, agents call MCP servers to retrieve context relevant to the current step. This directly addresses [context collapse](../concepts/context-collapse.md) — the degradation in model performance when context windows fill with irrelevant information.

[Vector databases](../concepts/vector-database.md) expose themselves as MCP servers, enabling [RAG](../concepts/rag.md) pipelines where the retrieval step is an MCP tool call rather than framework-specific code. [Knowledge graphs](../concepts/knowledge-graph.md) like those powering [GraphRAG](../projects/graphrag.md) become accessible through MCP without requiring agents to understand graph query languages directly.

The GEPA framework's MCP adapter demonstrates a specific use: tool descriptions themselves become optimization targets. GEPA can optimize the text of MCP tool descriptions to improve how models select and use tools, treating the description as a prompt that gets evolved through its genetic optimization loop.

## Implementation Details

The server implementation surface is intentionally small. A minimal Python MCP server using the official SDK:

```python
from mcp.server import Server
from mcp.server.stdio import stdio_server

server = Server("my-tool")

@server.list_tools()
async def list_tools():
    return [Tool(name="search", description="Search the web", inputSchema={...})]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    if name == "search":
        results = await do_search(arguments["query"])
        return [TextContent(type="text", text=results)]

async def main():
    async with stdio_server() as streams:
        await server.run(*streams)
```

The FastMCP wrapper (used by projects like code-review-graph) reduces this further, using decorators to register tools directly:

```python
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("code-graph")

@mcp.tool()
async def get_impact(file: str) -> str:
    """Get blast radius for changed file"""
    return compute_blast_radius(file)
```

Tools declare their input schemas using JSON Schema, which the model uses to construct valid calls. Resources use URI-based addressing (`file:///path/to/document`, `postgres://server/db/table`) and can be static or dynamic (computed on request).

## Strengths

**Ecosystem network effects**: Major editor integrations (Claude Code, Cursor, Windsurf) adopted MCP early, creating pressure for tool providers to implement it. An MCP server built for Claude Code works in Cursor without changes. This network effect is the protocol's strongest property — the value of each server grows with the number of compatible hosts.

**Separation of concerns**: Tool authors don't need to understand how any specific model works. Model providers don't need to know which tools exist. The protocol handles negotiation. This lets tool ecosystems evolve independently from model capabilities.

**Structured output by default**: MCP responses are typed (text, image, embedded resource), not raw strings. This gives models consistent structure to work with regardless of what the underlying tool returns.

**Local-first option**: The stdio transport requires no network infrastructure. A developer can run MCP servers as local processes, keeping sensitive data entirely on-device. This matters for enterprise deployments where data can't leave the organization's network.

## Critical Limitations

**Discovery and trust are unsolved problems**: MCP has no standard mechanism for discovering available servers or verifying their trustworthiness. Users must find servers through registries (which are community-maintained, not official), manually configure them in host applications, and trust that the server does what its description claims. There's no sandboxing by default — a malicious MCP server has the same access as a legitimate one. Tool descriptions are model-readable text, which creates prompt injection risk: a compromised server can include instructions in its tool descriptions that manipulate the model's behavior.

**The protocol version problem**: MCP has iterated quickly since launch (2024-11-05, 2025-03-26, 2025-06-18 as of this writing). Servers built for older versions may not support newer features; hosts must implement version negotiation carefully. Production deployments that pin to specific protocol versions can't benefit from new capabilities without updates.

**Infrastructure assumption**: MCP assumes the host can manage subprocess lifecycles (for stdio) or make outbound HTTP connections (for remote servers). This breaks in sandboxed environments, serverless functions with short timeouts, or deployments where subprocess spawning is restricted. The stdio transport also assumes the server stays running for the session duration — crash recovery is the host's responsibility, and most current implementations handle this poorly.

## When Not to Use MCP

MCP adds latency and complexity that isn't justified for simple, static integrations. If a tool is always available, its schema never changes, and it's used by only one application, a direct API call is simpler and faster.

MCP also isn't appropriate when the tool needs to maintain session state across multiple calls in a way that depends on conversation history. The protocol doesn't carry conversation context between tool calls — each call is independent. Agents that need stateful tool sessions (like a database transaction spanning multiple queries) must implement that state management themselves, outside the protocol.

For [retrieval-augmented generation](../concepts/rag.md) at high query volume, direct vector database client libraries outperform MCP servers. The protocol overhead (JSON-RPC serialization, subprocess or HTTP communication) adds latency that matters when retrieval is on the critical path of every inference call. MCP makes more sense for low-frequency, high-value tool calls than for retrieval that happens dozens of times per conversation.

## Unresolved Questions

**Authorization and OAuth complexity**: The 2025-03-26 spec added OAuth 2.1 support for remote servers, but implementation is inconsistent. Supermemory's MCP server uses OAuth; most community servers don't. There's no standard for how hosts should present authentication UI or persist credentials across sessions.

**Cost attribution at scale**: When an agent calls ten MCP servers during a single conversation, the tool execution costs (API calls made by servers, compute consumed) are borne by whoever runs the servers. For public MCP servers, this creates an obvious abuse vector. The protocol has no mechanism for cost negotiation, rate limiting, or billing.

**Conflict resolution between servers**: If two connected MCP servers both expose a `search` tool with different capabilities, how should the model choose? Current behavior depends entirely on which server's tool description is more compelling — there's no conflict resolution protocol, priority system, or deduplication mechanism.

**Server registry governance**: The MCP ecosystem has community-maintained registries (modelcontextprotocol.io/servers, others) but no official curation, security review, or quality standards. The "npm problem" — where a popular registry becomes an attack surface — applies here.

**Sampling and model preferences**: The spec includes a `sampling` capability that lets servers request LLM completions from the host, enabling servers to use AI internally. This is underimplemented in most hosts and creates complex questions about which model is used, who pays, and whether the nested model calls are logged.

## Alternatives and Selection Guidance

**[RAG](../concepts/rag.md) with direct retrieval**: For knowledge retrieval specifically, connecting directly to a vector database without MCP is lower latency and simpler to operate. Use direct retrieval when the tool set is fixed and performance matters. Use MCP when you need tool interoperability across multiple model providers or hosts.

**[LangChain](../projects/langchain.md) / [LangGraph](../projects/langgraph.md) tool calling**: These frameworks implement tool use through their own abstractions, with more sophisticated orchestration than raw MCP (retry logic, tool selection strategies, parallel calls). Use LangChain/LangGraph when building complex multi-step agents that need orchestration primitives. Use MCP when building tools that need to work across multiple frameworks without reimplementation.

**OpenAI function calling / Assistants API**: [OpenAI](../projects/openai.md)'s function calling predates MCP and is OpenAI-specific. Tools built for the Assistants API don't work with other models. Use Assistants API when you're committed to the OpenAI ecosystem and want built-in state management. Use MCP when interoperability across model providers is a requirement.

**Native IDE integrations**: Cursor and Windsurf both have plugin systems that predate MCP. These offer tighter editor integration (file system access, diff views, project context) at the cost of IDE lock-in. Use native plugins when editor-specific features matter. Use MCP when the same tool needs to work across multiple editors.

## Ecosystem Status

As of mid-2025, MCP has significant adoption in the developer tools space: Claude Code, Cursor, Windsurf, and Zed all support it as clients. [Mem0](../projects/mem0.md), [Supermemory](../projects/supermemory.md), [Graphiti](../projects/graphiti.md), and dozens of database/API providers publish MCP servers. The community registry lists hundreds of servers across categories (databases, web search, code tools, productivity apps).

The protocol has also influenced adjacent projects: [OpenClaw](../projects/openclaw.md) implements MCP for agent tool use, and the [Everything Claude Code](../projects/claude-code.md) framework exposes its 22 tools through MCP, demonstrating how large skill libraries can be made accessible through the protocol.

Adoption outside Anthropic's ecosystem is real but uneven. Google's Gemini supports MCP; OpenAI's tooling remains OpenAI-specific. The key open question is whether MCP achieves true cross-vendor standardization or remains primarily a mechanism for the Anthropic ecosystem.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — MCP is infrastructure for dynamic context assembly
- [Retrieval-Augmented Generation](../concepts/rag.md) — RAG systems often expose retrieval as MCP tools
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — MCP enables just-in-time context retrieval
- [Knowledge Graph](../concepts/knowledge-graph.md) — Graph databases expose traversal as MCP tools
- [Vector Database](../concepts/vector-database.md) — Common backing store for MCP retrieval servers
- [Agent Memory](../concepts/agent-memory.md) — Memory systems like Supermemory and Mem0 use MCP as their agent interface
- [Agentic RAG](../concepts/agentic-rag.md) — Retrieval decisions made by agents via MCP tool calls

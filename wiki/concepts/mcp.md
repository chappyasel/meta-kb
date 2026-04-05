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
  - repos/affaan-m-everything-claude-code.md
  - repos/anthropics-skills.md
  - repos/wangziqi06-724-office.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/tirth8205-code-review-graph.md
  - repos/agent-on-the-fly-memento.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - articles/effective-context-engineering-for-ai-agents.md
related:
  - Claude Code
  - Claude
  - Cursor
  - Anthropic
  - Agent Memory
  - Long-Term Memory
  - OpenAI
last_compiled: '2026-04-04T21:15:33.372Z'
---
# Model Context Protocol (MCP)

## What It Is

The Model Context Protocol (MCP) is an open standard created by Anthropic that defines how applications provide context to LLMs and how LLMs interact with external tools, data sources, and services. Think of it as USB-C for AI integrations: a single standardized connector that replaces the previous situation where every tool integration required custom glue code.

MCP operates on a client-server architecture. A **host** (e.g., Claude Code, Cursor, an IDE plugin) runs an MCP **client** that connects to one or more MCP **servers**. Each server exposes a set of capabilities—tools, resources, and prompts—that the LLM can invoke. The protocol defines the message format, capability negotiation, and transport layer (typically JSON-RPC over stdio or HTTP/SSE).

## Why It Matters

Before MCP, connecting an LLM to external systems meant writing bespoke integrations for every combination of model and tool. A team using Claude for code assistance had to implement GitHub, Jira, and database connectors differently than a team using GPT-4. MCP collapses this M×N problem into M+N: build one MCP server for your tool, and any MCP-compatible host can use it.

This is foundational for [Agent Memory](../concepts/agent-memory.md) and [Long-Term Memory](../concepts/long-term-memory.md) architectures—memory systems like Graphiti can expose their retrieval and write interfaces as MCP servers, letting any compliant agent framework persist and query structured knowledge without bespoke integration work.

## Core Primitives

| Primitive | What It Does |
|-----------|--------------|
| **Tools** | Functions the LLM can call (read file, query DB, send email) |
| **Resources** | Data the host can read and inject as context (files, database rows) |
| **Prompts** | Reusable prompt templates the server exposes |
| **Sampling** | Server-initiated LLM calls, routed through the host (less common) |

## Who Implements It

- **[Claude](../projects/claude-code.md) / [Claude Code](../projects/claude-code.md)**: Native MCP hosts; Claude Code's tool use is built on MCP
- **Cursor**: Supports MCP servers for custom tool integrations
- **Agent skill frameworks**: The survey literature describes MCP as the integration layer underneath composable skill ecosystems—SKILL.md definitions wire into MCP for runtime capability loading [Source](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)
- **Third-party ecosystem**: Hundreds of community MCP servers exist for databases, APIs, dev tools, and more

## Relationship to Agent Skills

Anthropic's Skills paradigm (YAML/markdown skill definitions loaded dynamically) treats MCP as the underlying transport and capability-exposure mechanism. Skills teach *what* to do; MCP defines *how* capabilities are discovered, negotiated, and invoked at runtime. [Source](../../raw/repos/anthropics-skills.md)

## Strengths

- **Eliminates integration fragmentation**: One server works with any compliant host
- **Composability**: Agents can connect to multiple MCP servers simultaneously, mixing memory, code execution, and API access
- **Language agnostic**: Servers can be implemented in Python, TypeScript, Go, or anything that speaks JSON-RPC
- **Progressive capability discovery**: Clients negotiate which primitives a server supports at connection time

## Honest Limitations

- **Security surface is real**: Community MCP servers have shown significant vulnerability rates (one survey found ~26% of community skills/servers with security issues), and prompt injection through tool results is a live attack vector [Source](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)
- **Latency overhead**: Each tool call crosses a process/network boundary; chatty tool use in long agentic loops can accumulate meaningful latency
- **Ecosystem fragmentation risk**: As adoption grows, subtle incompatibilities between implementations (especially around sampling and streaming) can emerge
- **Trust model is immature**: There is no standardized mechanism for verifying server provenance or sandboxing server behavior; governance is largely left to the host implementer
- **Still relatively early**: The protocol has evolved quickly; server implementations written against earlier spec versions may require updates

## Alternatives

- **OpenAI tool calling**: OpenAI's function-calling and Responses API tool use follows a similar pattern but is not cross-vendor interoperable with MCP without adaptation layers
- **LangChain tools / custom integrations**: Pre-MCP approach; works but requires per-model integration maintenance
- **OpenAPI / REST directly**: Some frameworks skip a protocol layer and have the LLM generate API calls directly from OpenAPI specs

## Key Takeaway

MCP is becoming the de facto integration layer for production agent systems—not because it is technically novel, but because standardization at this layer compounds across the ecosystem. The remaining unsolved problems are security governance and trust, not the protocol design itself.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.7)
- [Claude](../projects/claude-code.md) — implements (0.8)
- Cursor — implements (0.7)
- Anthropic — created_by (0.9)
- [Agent Memory](../concepts/agent-memory.md) — implements (0.5)
- [Long-Term Memory](../concepts/long-term-memory.md) — implements (0.4)
- OpenAI — alternative_to (0.3)

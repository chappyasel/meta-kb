---
entity_id: model-context-protocol
type: concept
bucket: context-engineering
abstract: >-
  Model Context Protocol (MCP) is Anthropic's open standard for connecting LLMs
  to external tools, data sources, and context. Key differentiator:
  vendor-neutral client-server architecture that any agent or IDE can implement.
sources:
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - repos/getzep-graphiti.md
  - repos/aiming-lab-simplemem.md
  - repos/memorilabs-memori.md
  - repos/affaan-m-everything-claude-code.md
  - repos/supermemoryai-supermemory.md
  - repos/natebjones-projects-ob1.md
  - repos/wangziqi06-724-office.md
  - repos/caviraoss-openmemory.md
  - repos/tirth8205-code-review-graph.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/agent-on-the-fly-memento.md
  - repos/infiniflow-ragflow.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/agent-skills-overview.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Cursor
  - Retrieval-Augmented Generation
  - Claude Code
  - Claude
  - Windsurf
  - Anthropic
  - Knowledge Graph
  - OpenAI
  - Gemini
  - skill.md
  - GPT-4
  - Context Engineering
  - Aider
  - Agent Skills
  - OpenAI Codex
  - ReAct
last_compiled: '2026-04-05T23:00:30.778Z'
---
# Model Context Protocol (MCP)

## What It Is

Model Context Protocol is an open specification Anthropic published in late 2024 that standardizes how LLMs connect to external tools, data sources, and services. Before MCP, every tool integration required custom code per model provider. Cursor needed one integration for Claude, a different one for GPT-4, and another for Gemini. MCP replaces those point-to-point connections with a shared protocol: servers expose capabilities once, clients (agents, IDEs, applications) consume them universally.

The analogy in the ecosystem is to HTTP for web services or LSP for language intelligence in editors. MCP aims to be the common transport layer for agent tool use.

## Core Mechanism

### Client-Server Architecture

MCP defines two roles:

**MCP Servers** expose capabilities to clients. A server might wrap a database, a file system, a web search API, a code execution environment, or a memory store. Servers declare what they offer through three primitives:
- **Tools**: Functions the LLM can call (equivalent to function calling in OpenAI's API)
- **Resources**: Data the LLM can read (files, database rows, API responses)
- **Prompts**: Reusable prompt templates with parameterization

**MCP Clients** are the LLM-powered applications that consume server capabilities. Claude Code, Cursor, Windsurf, Aider, and other coding agents all implement the client side of the protocol.

### Transport Layer

MCP servers communicate via two transport mechanisms:
- **stdio**: The server runs as a subprocess, communicating over standard input/output. This is the primary pattern for local servers invoked by Claude Code and similar tools.
- **HTTP with Server-Sent Events (SSE)**: For remote servers accessible over the network. Enables hosted MCP services like Supermemory's memory API.

The protocol itself uses JSON-RPC 2.0 as the message format, keeping the wire format simple and debuggable.

### Tool Discovery and Invocation

At session start, the MCP client queries connected servers for their tool manifests. Each tool declaration includes a name, description, and JSON Schema for its parameters. The client injects these definitions into the LLM's context window — typically 2-5K tokens per tool — so the model can reason about which tools to invoke. The [agent skills survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) documents that programmatic tool calling (model executes tools via generated code rather than structured JSON) improves invocation accuracy from 79.5% to 88.1%, suggesting MCP's JSON-based approach still has room for improvement.

When the model decides to call a tool, the client routes the call to the appropriate server, handles the response, and injects the result back into the conversation context. The model sees tools as part of its context assembly, not as a separate API layer.

### Relationship to Skills

MCP handles *connectivity* (which server, what endpoint, how to call it). Agent skills handle *knowledge* (when to use the tool, how to interpret outputs, what to do when it fails). These are complementary layers. A SKILL.md file for a database-inspection workflow might instruct the agent to use a specific MCP server, specify how to format queries, and define fallback behavior if the server is unreachable. The [context engineering survey](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) formalizes this as the `c_tools` component in context assembly: tool definitions compete with instructions, knowledge, and memory for the finite context budget.

## Ecosystem Adoption

MCP gained rapid adoption through direct Anthropic integration. Claude (the API), Claude Code, and other Anthropic products implement MCP natively. Third-party adoption followed quickly:

- **Cursor** and **Windsurf**: Integrated MCP client support, allowing developers to connect custom servers to their IDE-based coding agents
- **Aider**: Added MCP tool support for extending the CLI coding assistant
- **Supermemory**: Ships an MCP server exposing three tools (`memory`, `recall`, `context`) for persistent memory across agent sessions, installable via `npx -y install-mcp@latest https://mcp.supermemory.ai/mcp`
- **code-review-graph**: Uses FastMCP to expose 22 tools and 5 prompt templates over stdio, enabling structural code analysis for any MCP-compatible client

The [agent skills paper](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) identifies MCP as the emerging standard for multi-agent tool connectivity alongside KQML and FIPA ACL.

## Context Budget Implications

MCP's convenience comes with a concrete cost: every connected server's tool definitions consume context window tokens. The [Everything Claude Code analysis](../raw/deep/repos/affaan-m-everything-claude-code.md) documents the economics precisely. With a 200K token context window:

- System prompts: ~10K tokens
- Resident rules: 5-8K tokens
- Per MCP tool definition: 2-5K tokens

The practical recommendation that emerges from production deployments: cap active MCP connections at 10 per session to preserve ~70K tokens for actual work. This is not a protocol limit — it is a context budget constraint. A developer who connects 20 MCP servers has committed 40-100K tokens to tool manifests before the conversation begins.

The [context engineering survey's](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md) tool search tool pattern (programmatic discovery from large registries, reducing overhead by up to 85%) points toward a solution: lazy tool discovery where only relevant tool definitions load based on the current task, rather than declaring all tools at session start. Current MCP implementations don't do this.

## Strengths

**Vendor neutrality**: A server built once works with any MCP client. This is MCP's strongest property. Organizations can build internal tool servers once and use them with Claude, Cursor, and any future MCP-compatible tooling without rewriting integrations.

**Local-first security model**: The stdio transport pattern keeps sensitive operations local. A file system server doesn't need to send file contents to a remote API; the MCP client running locally handles all data. This matters for codebases with sensitive IP or regulated data.

**Progressive capability exposure**: Servers declare capabilities through tool manifests. Clients can inspect and selectively use what they need. This composability lets complex agent workflows mix specialized servers (one for database access, one for code execution, one for memory) without coupling them.

**Standardized context injection for knowledge graph patterns**: When combined with knowledge graph backends (like code-review-graph's SQLite+NetworkX graph), MCP provides a clean interface for serving structured context to agents. The 22 tools in code-review-graph's MCP server translate graph queries into LLM-consumable responses, achieving 8.2x average token reduction on code review tasks.

## Limitations

**Context overhead scales poorly with server count**: The 2-5K tokens per tool definition is unavoidable with current implementations. Adding MCP servers is not free. A developer running 5 MCP servers has potentially consumed 10-25K context tokens before writing a single line of code.

**No tool discovery standard**: MCP defines how tools are called, not how clients discover available servers. Finding, installing, and configuring MCP servers remains manual and fragmented. The `npx -y install-mcp@latest` pattern from Supermemory is one convention; Cursor has its own configuration format; Claude Code uses its own. There is no registry or package manager for MCP servers.

**Security model is incomplete**: MCP servers can inject arbitrary content into the LLM's context through tool responses. A malicious or compromised server could use this for prompt injection — instructing the model to take actions the user didn't intend. The [agent skills survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) documents that 26.1% of community skills contain vulnerabilities; MCP servers face analogous risks since their responses become trusted context. No standardized sandboxing or response validation exists in the protocol.

**Stateless by default**: Each MCP tool call is stateless. Servers that need to maintain session state (tracking which files have been read, maintaining a transaction) must implement their own state management. The protocol provides no built-in session affinity or state passing between calls.

**Concrete failure mode**: An agent connected to a slow or unresponsive MCP server will block waiting for tool responses. MCP has no built-in timeout standard or fallback protocol. If a remote SSE server goes down mid-session, the agent loses access to those tools with no graceful degradation path. Claude Code's PostToolUse hooks can detect failures and trigger fallback behaviors, but this requires application-level handling outside the protocol.

## When NOT to Use MCP

**Simple single-model applications**: If you're building a chatbot with one external data source and one model, native function calling (OpenAI's function calling, Anthropic's tool use API) is simpler and has lower overhead. MCP's value is in multi-tool, multi-client scenarios.

**High-frequency, low-latency tool calls**: The JSON-RPC over stdio/SSE round-trip adds latency compared to in-process function calls. For tools called hundreds of times per session (like a code indexing tool scanning thousands of files), the protocol overhead accumulates. The code-review-graph benchmark shows sub-millisecond search latency within the graph engine itself; adding MCP transport overhead on top of that changes the economics.

**Environments with strict context budgets**: If your application targets small context windows or has many competing demands on the context (long documents, large memory stores, many instructions), MCP's tool manifest overhead may be prohibitive.

**Regulated data environments without server-side controls**: MCP tool responses flow directly into LLM context with no built-in content filtering or PII redaction. Organizations handling healthcare, financial, or other regulated data need to implement their own guardrails at the server level, which the protocol does not standardize.

## Unresolved Questions

**Governance and registry**: Who decides what constitutes a "safe" MCP server? No certification or verification body exists. Community MCP servers carry the same vulnerability risks as community agent skills — users have no reliable signal about server quality or security posture.

**Cost at scale**: For applications running thousands of concurrent agent sessions, each maintaining multiple MCP connections, the infrastructure cost of MCP server processes is unclear. The stdio pattern spawns a subprocess per server per session; at scale this becomes a resource management problem with no protocol-level guidance.

**Cross-session state**: MCP provides no standard for persisting state across sessions. Memory systems like Supermemory solve this at the application level by building their own persistence layer, but the protocol itself has no session identity or state handoff concept.

**Versioning and compatibility**: As MCP servers evolve and add new tools or change existing ones, clients may break. The protocol has no built-in capability negotiation beyond the initial manifest. A client built against server version 1 may fail against version 2 without error.

## Alternatives and Selection Guidance

**OpenAI function calling / Anthropic tool use API**: Native tool use without the protocol overhead. Use when you're locked to a single model provider, need lower latency, or don't need cross-client portability.

**LangChain tools / LlamaIndex tools**: Framework-specific tool abstractions that predate MCP. Larger ecosystems but no cross-framework compatibility. Use when you're already committed to a specific framework and don't need IDE integration.

**Direct API integration**: For simple cases, calling external APIs directly from application code and injecting results into prompts. Use when tool logic is simple, the call pattern is predictable, and MCP's complexity isn't justified.

**ReAct without tool protocol**: Reasoning and acting with free-form text-based tool calls. Use for research prototypes or when flexibility matters more than reliability.

Use MCP when: you need a single tool server to work with multiple agent clients (Claude, Cursor, custom agents), when local security matters (stdio keeps data local), or when you're building production tooling that should survive model and client upgrades without rewriting.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): MCP is the connectivity layer; context engineering is the discipline of assembling what goes through it
- [RAG](../concepts/retrieval-augmented-generation.md): MCP can expose RAG retrieval as tools, enabling agents to trigger retrieval on demand
- [Agent Skills](../concepts/agent-skills.md): Skills provide the procedural knowledge for using MCP tools effectively
- [Knowledge Graph](../concepts/knowledge-graph.md): Graph-backed MCP servers (like code-review-graph) deliver structured context more efficiently than raw document retrieval

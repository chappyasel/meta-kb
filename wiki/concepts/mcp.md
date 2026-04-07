---
entity_id: mcp
type: concept
bucket: context-engineering
abstract: >-
  Model Context Protocol (MCP) is Anthropic's open standard for connecting LLM
  agents to external tools and data sources — its key differentiator is a
  universal client-server architecture that lets any AI application use any tool
  implementation without custom integration code.
sources:
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - repos/getzep-graphiti.md
  - repos/aiming-lab-simplemem.md
  - repos/affaan-m-everything-claude-code.md
  - repos/supermemoryai-supermemory.md
  - repos/memorilabs-memori.md
  - repos/natebjones-projects-ob1.md
  - repos/greyhaven-ai-autocontext.md
  - repos/caviraoss-openmemory.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/tirth8205-code-review-graph.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/agent-on-the-fly-memento.md
  - repos/infiniflow-ragflow.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/agent-skills-overview.md
  - deep/repos/supermemoryai-supermemory.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - rag
  - cursor
  - claude
  - claude-code
  - openai
  - github-copilot
  - anthropic
  - windsurf
  - gpt-4
  - openclaw
  - agent-skills
  - codex
  - knowledge-graph
  - mem0
  - vector-database
  - ollama
  - claude-md
  - gemini
  - tree-sitter
  - episodic-memory
  - semantic-memory
  - obsidian
  - langchain
  - graphrag
  - react
  - context-engineering
  - zep
  - langgraph
  - locomo
  - vllm
  - gepa
  - grpo
  - longmemeval
  - procedural-memory
  - crewai
  - swe-bench
  - hybrid-search
  - supermemory
  - autogen
  - pinecone
  - memory-evolution
  - gaia
  - webarena
  - entity-extraction
  - seagent
  - memorybank
  - emotional-memory
last_compiled: '2026-04-07T11:37:04.760Z'
---
# Model Context Protocol (MCP)

## What It Is

Model Context Protocol is an open protocol, published by Anthropic in November 2024, that standardizes how LLM applications communicate with external tools, data sources, and services. Before MCP, every AI application that needed to call a tool, read a file, or query a database required custom integration code. MCP replaces that with a single, shared interface: any AI host that speaks MCP can use any MCP server without additional glue code.

The analogy the spec uses is USB-C — a universal connector so devices and accessories no longer need vendor-specific ports. In practice, this means a tool server built for [Claude](../projects/claude.md) works unchanged in [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), [GitHub Copilot](../projects/github-copilot.md), or any other MCP-compatible host.

MCP is now the de facto standard for agent tool connectivity. [OpenAI](../projects/openai.md) adopted it in March 2025. [Google Gemini](../projects/gemini.md), [Claude Code](../projects/claude-code.md), [OpenAI Codex](../projects/codex.md), and dozens of third-party tools all implement it. The protocol sits at the infrastructure layer of [Context Engineering](../concepts/context-engineering.md) — it is the plumbing that carries context into the model.

## Architecture

MCP follows a client-server model with three roles:

**Host** — The LLM application (Claude Desktop, Cursor, a custom agent). The host maintains one or more client connections and decides when to invoke tools.

**Client** — A connector inside the host, maintaining a 1:1 connection with a single MCP server. Handles protocol negotiation and message routing.

**Server** — A lightweight process that exposes capabilities. Servers are intentionally simple: they respond to requests, they do not orchestrate or reason.

Servers expose three primitives:

- **Tools** — Functions the model can invoke. Each tool has a name, description, and JSON Schema for parameters. The model decides when to call them; execution happens server-side.
- **Resources** — Data the host can read and inject into context. Files, database rows, API responses. Resources are addressable by URI.
- **Prompts** — Reusable prompt templates the server makes available. Useful for standardized workflows.

Transport is either **stdio** (server runs as a subprocess communicating over stdin/stdout — simple, local) or **HTTP with Server-Sent Events** (for remote servers, streaming responses). The underlying message format is JSON-RPC 2.0.

Connection lifecycle: the host launches or connects to the server, sends an `initialize` request with capability declarations, receives the server's capability list, then begins normal operation. Servers declare which primitives they support during handshake, so hosts know upfront what they can request.

## How It Fits in Agent Systems

MCP primarily solves the **tool connectivity** problem. It does not solve memory, retrieval, or reasoning — those require separate mechanisms.

In a typical agent pipeline:

1. [Context Engineering](../concepts/context-engineering.md) determines what goes into the context window.
2. MCP provides the transport layer for tools the model can call to fetch or manipulate information.
3. [Retrieval-Augmented Generation](../concepts/rag.md) addresses semantic document search (MCP can carry RAG results, but MCP itself is not a retrieval system).
4. Memory systems like [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), or [Supermemory](../projects/supermemory.md) often expose themselves as MCP servers, giving agents a standard interface for long-term memory operations.

[LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), and [CrewAI](../projects/crewai.md) all support MCP servers as tool sources. The [Agent Skills](../concepts/agent-skills.md) paradigm directly complements MCP: a skill file instructs the agent on *what to do*, MCP provides the transport for *how to do it*.

[CLAUDE.md](../concepts/claude-md.md) files frequently reference MCP servers — they document which servers are available and how the agent should use them, combining procedural knowledge with the tool connectivity MCP provides.

## What MCP Does Well

**Decoupling.** Tool authors and AI application authors work independently. A Postgres MCP server built by one team works in any host without modification. This decomposition is the protocol's primary engineering value.

**Composability.** A single host can connect to multiple servers simultaneously. An agent working on a software task might simultaneously use a filesystem server, a GitHub server, a web search server, and a memory server — all speaking the same protocol.

**Discoverability.** The capability negotiation handshake lets hosts adapt to whatever servers advertise. A host does not need to know in advance what tools a server provides; it discovers them at connection time.

**Ecosystem velocity.** The open standard accelerated tool development. Hundreds of community MCP servers now exist for databases, APIs, developer tools, and productivity applications. The Anthropic-maintained registry and community directories aggregate them.

**Security boundary clarity.** Servers run as separate processes with their own permissions. The separation means a tool server can hold credentials (API keys, database passwords) without exposing them to the model or the host application.

## Critical Limitations

**One concrete failure mode: prompt injection via malicious servers.** When a model calls an MCP tool and receives a response, that response becomes context the model reads. A malicious or compromised server can include instructions in its response that manipulate subsequent model behavior — instructing it to exfiltrate data, call other tools with forged parameters, or ignore host-level restrictions. This is [prompt injection](../concepts/prompt-engineering.md) through the tool result channel. The protocol has no cryptographic attestation of server identity and no content signing for tool responses. The [Agent Skills](../concepts/agent-skills.md) security analysis found a 26.1% vulnerability rate in community skill files — the analogous risk for community MCP servers is real and poorly measured.

**One unspoken infrastructure assumption: server process management.** The stdio transport, which most local MCP deployments use, requires the host to launch and manage server subprocesses. This works well for a single-user desktop application. For multi-user deployments, server-per-user instantiation, lifecycle management across sessions, and resource cleanup become the host's problem. The protocol is silent on these operational concerns. Teams deploying MCP in production multi-tenant environments build their own process orchestration on top.

## When Not to Use MCP

**High-security environments where tool results re-enter model context.** If your threat model includes adversarial data sources (web scraping, user-submitted documents, third-party APIs), MCP's architecture puts untrusted content in a privileged position. You need additional sanitization and sandboxing that MCP does not provide.

**When you need sub-millisecond tool latency.** The JSON-RPC overhead and process-boundary crossing for stdio transport adds latency compared to in-process function calls. For agents that call tools hundreds of times in a tight loop, this accumulates. High-frequency agentic loops should benchmark this cost before committing to MCP as the transport layer.

**When your tool ecosystem is entirely proprietary and single-platform.** If you will never expose your tools to external applications and your stack uses exactly one AI provider, the interoperability value of MCP does not apply. The protocol overhead adds complexity with no benefit in this scenario.

**Simple single-tool integrations.** If an agent needs exactly one external capability — say, a single database query — the full MCP client-server setup is overengineered. A direct function call or a thin HTTP wrapper is simpler and easier to debug.

## Unresolved Questions

**Server registry governance.** No central authority controls what gets listed as an MCP server, and no security scanning requirement exists for community-published servers. The ecosystem has grown rapidly; systematic vulnerability analysis comparable to what [Agent Skills](../concepts/agent-skills.md) researchers conducted on skill files has not been applied to the MCP server corpus.

**Cost attribution at scale.** When a multi-tenant application runs hundreds of MCP server connections simultaneously, the compute and memory cost of running those server processes is invisible in the MCP spec. Operators discover this cost empirically. There is no standard telemetry for MCP server resource consumption.

**State management across sessions.** The protocol supports stateful connections during a session, but session persistence across reconnects is left to implementations. Servers that need to maintain state (partially completed operations, user preferences, cached results) implement their own persistence without protocol support.

**Conflict resolution between servers.** If two MCP servers both expose a tool named `search`, or if their tool descriptions overlap such that the model cannot reliably choose between them, the protocol provides no arbitration mechanism. Host implementations handle this inconsistently.

**Authorization delegation.** MCP has no built-in OAuth or capability delegation model. Servers either have credentials hardcoded or require the host to pass them. Fine-grained authorization — allowing a server to act on behalf of a user for some operations but not others — requires custom implementation.

## Relation to RAG

MCP and [Retrieval-Augmented Generation](../concepts/rag.md) address adjacent problems. RAG retrieves semantically relevant documents and injects them as context before inference. MCP provides a transport for tools the model calls *during* inference to fetch information on demand.

They are complementary: a [Vector Database](../concepts/vector-database.md) like [Pinecone](../projects/pinecone.md) or [Qdrant](../projects/qdrant.md) might expose a search tool via MCP, turning RAG into an on-demand capability rather than a pre-inference step. [Agentic RAG](../concepts/agentic-rag.md) architectures often combine both: static document injection at context build time plus MCP-accessible search tools for dynamic retrieval.

## Alternatives and Selection Guidance

**Use direct function calling** when you control both the model and the tool implementation, have no interoperability requirements, and want the simplest possible integration. OpenAI's native function calling and Anthropic's tool use API provide this without the process boundary.

**Use [LangChain](../projects/langchain.md) tool abstractions** when you need a mature ecosystem of pre-built tool integrations and are already in the LangChain/LangGraph stack. LangChain tools predate MCP and have broader coverage; they lack MCP's interoperability across AI hosts.

**Use MCP** when you want tools to work across multiple AI hosts (Claude, Cursor, Windsurf, custom agents), when you want to build tools once and let others consume them, or when your architecture benefits from clean process isolation between the host and tool execution.

**Use [OpenClaw](../projects/openclaw.md)** for specialized legal domain tool connectivity — it extends MCP patterns for legal research contexts.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — The broader discipline MCP serves as infrastructure for
- [Agent Skills](../concepts/agent-skills.md) — Procedural knowledge packages that reference MCP servers
- [CLAUDE.md](../concepts/claude-md.md) — Convention for documenting available MCP servers to agents
- [Retrieval-Augmented Generation](../concepts/rag.md) — The adjacent retrieval pattern MCP often complements
- [Knowledge Graph](../concepts/knowledge-graph.md) — Frequently exposed via MCP servers for structured retrieval
- [Episodic Memory](../concepts/episodic-memory.md) and [Semantic Memory](../concepts/semantic-memory.md) — Memory systems commonly wrapped as MCP servers
- [ReAct](../concepts/react.md) — Agent reasoning pattern that benefits from standardized tool access via MCP

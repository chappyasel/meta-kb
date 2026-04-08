---
entity_id: model-context-protocol
type: concept
bucket: context-engineering
abstract: >-
  Model Context Protocol (MCP) is Anthropic's open standard for how LLM
  applications connect to external tools and data sources, providing a universal
  interface that replaces per-application custom integrations with a single
  client-server protocol.
sources:
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - repos/aiming-lab-simplemem.md
  - repos/affaan-m-everything-claude-code.md
  - repos/supermemoryai-supermemory.md
  - repos/memorilabs-memori.md
  - repos/natebjones-projects-ob1.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - repos/safishamsi-graphify.md
  - repos/greyhaven-ai-autocontext.md
  - repos/wangziqi06-724-office.md
  - repos/caviraoss-openmemory.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/tirth8205-code-review-graph.md
  - repos/agent-on-the-fly-memento.md
  - repos/matrixorigin-memoria.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/infiniflow-ragflow.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/supermemoryai-supermemory.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/evoagentx-evoagentx.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - claude-code
  - cursor
  - retrieval-augmented-generation
  - openai
  - claude
  - knowledge-graph
  - openclaw
  - anthropic
  - context-engineering
  - windsurf
  - codex
  - agent-memory
  - ollama
  - gemini
  - vector-database
  - tree-sitter
  - episodic-memory
  - react
  - langchain
  - agent-skills
  - semantic-search
  - gpt-4
  - reinforcement-learning
  - composable-skills
  - andrej-karpathy
  - semantic-memory
  - opencode
  - graphrag
  - vllm
  - gepa
  - claude-md
  - grpo
  - context-management
  - multi-agent-systems
  - swe-bench
  - crewai
  - longmemeval
  - chromadb
  - community-detection
  - autogen
  - supermemory
  - hybrid-search
  - temporal-reasoning
  - skill-book
  - osworld
  - memento
  - seagent
  - gaia
  - termination-bench
last_compiled: '2026-04-08T02:39:29.845Z'
---
# Model Context Protocol (MCP)

## What It Is

Model Context Protocol is an open protocol specifying how LLM applications connect to external tools, data sources, and services. Anthropic released it in November 2024. Before MCP, each AI application built its own integration layer: Claude needed one connector for a database, Cursor built a different one for the same database, and a third application built yet another. MCP replaces this with a standard where any MCP-compliant client connects to any MCP-compliant server.

The analogy the documentation uses is USB-C: one port for everything. The practical claim is that tool builders write one MCP server and every compliant agent framework can use it, while agent frameworks write one MCP client and gain access to every compliant server.

As of mid-2026, MCP has achieved broad adoption: [Claude](../projects/claude.md), [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), [OpenCode](../projects/opencode.md), [LangChain](../projects/langchain.md), [AutoGen](../projects/autogen.md), [CrewAI](../projects/crewai.md), [Ollama](../projects/ollama.md), [vLLM](../projects/vllm.md), and [Gemini](../projects/gemini.md) all implement it. [OpenAI](../projects/openai.md) announced MCP support across its products in March 2025.

## Architecture

MCP uses a client-server model with three components:

**Hosts** are LLM applications (Claude Desktop, an IDE, a custom agent). They embed MCP clients and manage connections to servers.

**Clients** maintain one-to-one connections with servers, handling the protocol handshake, capability negotiation, and message transport.

**Servers** expose capabilities to clients: tools (functions the model can invoke), resources (data the model can read), and prompts (pre-structured templates).

The transport layer supports two modes: stdio (local servers communicate via standard input/output, common for CLI tools and local processes) and HTTP with Server-Sent Events (remote servers, enabling network-accessible MCP services). The protocol itself uses JSON-RPC 2.0 as its message format.

The capability negotiation happens at connection time. A server advertises what it can do; a client requests what it needs. This means capability discovery is part of the protocol, not an out-of-band concern.

## Relationship to Context Engineering

MCP sits at the tool-connectivity layer of [Context Engineering](../concepts/context-engineering.md). The survey paper's six-component model of context (c_instr, c_know, c_tools, c_mem, c_state, c_query) maps directly: MCP primarily handles c_tools and can contribute to c_know by connecting to external data sources. [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

MCP does not decide what gets put into the context window. It handles the plumbing that makes tool results available. The assembly decisions — which tools to call, how to format results, when to retrieve vs. recall — remain the agent framework's responsibility.

## Relationship to Agent Skills

The agent skills survey describes MCP and skills as complementary layers, not competing alternatives: skills provide "what to do" (procedural knowledge, instructions, context), while MCP provides "how to connect" (tool endpoints, data access). A skill might instruct an agent to use a specific MCP server, define how to interpret its outputs, and specify fallback strategies when that server is unavailable. [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

The SKILL.md progressive disclosure architecture uses MCP connectivity as an assumed substrate. At Level 2 (full procedural instructions), a skill may specify which MCP servers to call and in what order. The skill shapes understanding; MCP handles the connection.

## Relationship to Agent Harnesses

Production agent harnesses like Everything Claude Code treat MCP server selection as a resource allocation problem. With a 200K token context window, each MCP tool definition costs 2-5K tokens. The practical recommendation is to enable no more than 10 MCP servers per project to preserve roughly 70K tokens for actual task execution. This is not a protocol limitation — it is a context budget constraint that MCP makes concrete and measurable. [Source](../raw/deep/repos/affaan-m-everything-claude-code.md)

[CLAUDE.md](../concepts/claude-md.md) files often specify which MCP servers should be active for a given project, functioning as persistent MCP configuration alongside behavioral instructions.

## What MCP Enables

**Tool standardization:** A `filesystem` MCP server written once works with any compliant client. A `postgres` MCP server works with Claude Code, Cursor, and a custom LangChain agent without modification.

**Capability discovery:** Agents can query what tools are available rather than having tools hardcoded. The `Tool Search Tool` pattern described in the agent skills survey — programmatic discovery from large tool registries, reducing token overhead by up to 85% — becomes possible with MCP's standard discovery interface. [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

**[Multi-Agent Systems](../concepts/multi-agent-systems.md) coordination:** MCP provides a standard communication layer for agent-to-agent tool calls. Sub-agents expose capabilities as MCP servers; orchestrators discover and invoke them through the client interface. The survey on context engineering identifies MCP among the communication protocols (alongside KQML and FIPA ACL) enabling multi-agent coordination. [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

**[Agent Memory](../concepts/agent-memory.md) backends:** Memory systems like [ChromaDB](../projects/chromadb.md) and [SuperMemory](../projects/supermemory.md) implement MCP servers, making memory retrieval a standard tool call rather than a custom integration. Similarly, [GraphRAG](../projects/graphrag.md) and [Knowledge Graph](../concepts/knowledge-graph.md) systems expose query interfaces through MCP.

**Optimization infrastructure:** GEPA's optimize_anything API integrates with MCP for tool descriptions, treating MCP tool definitions as optimizable text artifacts. When an agent's MCP tool descriptions are poorly written, GEPA can evolve them to maximize task performance — the protocol's text-based format makes tool definitions directly accessible to LLM-powered optimization. [Source](../raw/deep/repos/gepa-ai-gepa.md)

## Critical Limitations

**Context budget consumption is unbounded by the protocol.** MCP has no mechanism for signaling which tools are more or less expensive to expose. A naive implementation that connects to every available MCP server can exhaust the context window before any user query arrives. The protocol does not help agents prioritize or prune tool availability.

**Security governance is absent.** MCP standardizes connectivity but not trust. The agent skills security analysis found 26.1% vulnerability rates in community skill packages, many of which specify MCP server usage. A malicious MCP server that an agent connects to can receive sensitive data passed as tool arguments. MCP has no built-in authentication standard, no server verification mechanism, and no sandboxing. Each host application must implement its own security layer. [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)

**The unspoken infrastructure assumption:** MCP assumes stable, low-latency connections to servers. In practice, remote MCP servers introduce network latency into the agent's tool-call loop. A multi-step reasoning chain that calls five tools may wait on network round-trips at each step. Local stdio servers avoid this but require local process management. Production deployments need to decide which servers run locally vs. remotely based on call frequency and latency tolerance — MCP provides no guidance on this.

**One concrete failure mode:** An agent using MCP for [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) calls a vector database MCP server that times out mid-conversation. JSON-RPC 2.0 error handling returns an error object, but the agent's behavior on receiving that error depends entirely on the host implementation. MCP defines the error format; it does not define recovery behavior. Agents that lack explicit error handling for MCP failures can stall or produce hallucinated tool results.

## When NOT to Use MCP

**When you have one tool and one client.** If your system has a single external integration and a single agent framework, MCP's standardization overhead (server process management, JSON-RPC parsing, capability negotiation) adds complexity with no interoperability benefit. Write a direct function call.

**When latency is critical.** Each MCP tool invocation crosses a process boundary (stdio) or network boundary (HTTP/SSE). For high-frequency tool calls (thousands per minute), this overhead compounds. Direct function calls within the same process are substantially faster.

**When you need complex tool composition.** MCP tools are atomic: one call, one response. If your tool requires stateful multi-turn interaction, streaming intermediate results, or coordination between multiple tool calls as a unit, MCP's request-response model is the wrong abstraction.

**When security requirements are strict and resources are limited.** Building proper security on top of MCP (authentication, input validation, output sanitization, server verification) is not trivial. If your team cannot invest in this layer, MCP's openness becomes a liability.

## Unresolved Questions

**Governance:** Who decides which MCP servers are trustworthy? There is no MCP certification, no security audit process, and no revocation mechanism. The ecosystem is currently open-append.

**Versioning and compatibility:** When an MCP server updates its tool signatures, clients that cached the old signatures may break. The protocol has version negotiation at connection time but no mechanism for rolling updates or backward compatibility guarantees at the tool level.

**Cost at scale:** Each MCP server connection adds token overhead. At what point does a large MCP tool registry require hierarchical routing (meta-servers that expose subsets of tools based on query context)? The agent skills research found a phase transition where routing accuracy collapses past a critical skill library size — the same dynamic likely applies to large MCP tool registries.

**State management:** MCP servers are supposed to be stateless from the client's perspective, but real integrations often involve stateful external systems (databases with transactions, sessions with authentication tokens). How state management should be handled within MCP sessions is underspecified.

## Alternatives and Selection Guidance

**Direct function calling (OpenAI/Anthropic native tool use):** Use when you have a fixed, known set of tools and a single provider. Simpler, faster, no server management. The right choice for most single-agent systems.

**[LangChain](../projects/langchain.md) tool abstractions:** Use when you need tool composition, chains of tool calls, and want framework-managed retry/error handling. LangChain supports MCP but also has its own tool abstraction that works without it.

**[OpenAI Agents SDK](../projects/openai-agents-sdk.md):** Use when building on OpenAI's ecosystem specifically. Includes its own tool-calling conventions with MCP support added alongside them.

**Custom REST APIs:** Use when your tool service needs to serve non-agent clients simultaneously. MCP's SSE transport is HTTP-based, but it is optimized for agent use patterns. Standard REST endpoints are more broadly accessible.

**Use MCP when:** you are building tools that should work across multiple agent frameworks, you want capability discovery rather than hardcoded tool lists, you are integrating with the growing ecosystem of MCP-compatible services, or you are implementing [Semantic Search](../concepts/semantic-search.md), memory backends, or knowledge graph access as reusable services across agent deployments.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — MCP operates within the context engineering stack as the tool-connectivity layer
- [Agent Memory](../concepts/agent-memory.md) — Memory backends increasingly expose MCP interfaces
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — MCP enables standardized agent-to-agent tool calls
- [Agent Skills](../concepts/agent-skills.md) — Skills specify which MCP servers to use; MCP provides the connection
- [Context Management](../concepts/context-management.md) — MCP tool definitions consume context budget and must be managed accordingly
- [CLAUDE.md](../concepts/claude-md.md) — Project-level configuration that often specifies active MCP servers
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — RAG backends commonly expose MCP interfaces for standardized retrieval access

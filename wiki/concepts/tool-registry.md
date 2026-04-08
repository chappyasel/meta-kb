---
entity_id: tool-registry
type: concept
bucket: agent-architecture
abstract: >-
  A catalog of available tools and their specifications that agents can query to
  discover and invoke capabilities dynamically — distinguished by combining
  metadata indexing, semantic retrieval, and runtime schema validation into a
  structured intermediary between agents and their executable capabilities.
sources:
  - articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/jackchen-me-open-multi-agent.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
related:
  - agent-skills
last_compiled: '2026-04-08T03:04:17.178Z'
---
# Tool Registry

## What It Is

A tool registry is the layer between an agent and the things it can do. At its simplest, it's a searchable catalog: each entry maps a tool name to its description, input schema, output format, authentication requirements, and invocation endpoint. At runtime, an agent queries the registry to discover what tools exist, retrieves the schema for a tool it wants to use, validates its parameters, and executes the call.

The registry pattern exists because a flat list of tool definitions injected into every prompt does not scale. Once you have more than 20-30 tools, prompt space fills up, the model's attention distributes poorly across all definitions, and selection accuracy drops. The registry solves this by keeping most tool definitions off the context window until they're needed.

This is distinct from a simple tool list in three ways:

1. **Discovery is separate from invocation.** The agent asks "what tools exist?" before asking "call this tool." A static list collapses these.
2. **Schemas are fetched on demand.** Only the tools relevant to the current task get their full definitions loaded.
3. **The registry is a runtime artifact.** It can be queried, filtered, updated, and versioned — it's not just configuration.

Tool registries are part of the broader [Agent Skills](../concepts/agent-skills.md) infrastructure, which extends this pattern to full procedural packages. Where a tool registry tracks atomic function calls (inputs → outputs), a skill packages tools together with the instructions, decision logic, and context shaping needed to use them for a domain-specific task.

---

## Why It Matters

The scale problem is empirical. Anthropic's Claude Code "Tool Search Tool" reduces token overhead for tool lookup by up to 85% compared to injecting all tool schemas at once. Tool selection accuracy jumps from 79.5% to 88.1% when agents query a registry to retrieve relevant tools rather than scanning full lists. Both figures come from Anthropic engineering reports (self-reported).

The conceptual shift matters too. When tools live in a registry, they become first-class objects with lifecycle management: versioning, access control, health checks, usage metrics, and deprecation. This is the difference between a coding project with functions in a single file and one with a proper module system.

---

## How It Works

### Core Data Model

Each registry entry needs at minimum:

```json
{
  "tool_id": "web_search",
  "name": "web_search",
  "description": "Search the web for current information. Use when you need facts from after your training cutoff or need to verify recent events.",
  "version": "2.1.0",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": { "type": "string", "description": "Search query" },
      "num_results": { "type": "integer", "default": 5 }
    },
    "required": ["query"]
  },
  "output_schema": {
    "type": "array",
    "items": { "type": "object", "properties": { "url": {}, "snippet": {} } }
  },
  "tags": ["search", "web", "information"],
  "capabilities": ["retrieval"],
  "auth": { "type": "api_key", "env_var": "SEARCH_API_KEY" },
  "endpoint": "https://api.example.com/search",
  "cost_per_call": 0.001,
  "latency_p50_ms": 400
}
```

The description field carries disproportionate weight. The agent uses it for routing — whether the tool gets selected depends almost entirely on whether the description matches the task. Vague descriptions produce poor selection even with accurate schemas.

### Three-Level Progressive Disclosure

The architecture from the [Agent Skills](../concepts/agent-skills.md) survey applies directly to registry entries:

**Level 1 — Metadata (~10-15 tokens):** Name + one-line description. Always available. The agent scans these to decide which tools are candidates.

**Level 2 — Schema (full input/output spec):** Loaded when a tool triggers. Injected into context for the relevant turn only.

**Level 3 — Extended docs (examples, edge cases, rate limits):** Loaded on demand within tool execution when the agent needs clarification on behavior.

This staging lets a registry hold hundreds of tools at Level 1 cost while only paying full schema cost for the 2-4 tools actually being used.

### Discovery: How Agents Find Tools

**Exact lookup:** Agent knows the tool name, fetches schema directly. Fastest path, zero ambiguity.

**Semantic search:** Agent describes what it needs in natural language; the registry returns the top-k matches by embedding similarity. The registry embeds tool descriptions at registration time; queries run cosine similarity against that index. Quality depends heavily on description quality and embedding model choice. [Semantic Search](../concepts/semantic-search.md) and [Vector Database](../concepts/vector-database.md) infrastructure underlie this.

**Keyword/capability filter:** Agent specifies a capability tag (`"retrieval"`, `"code_execution"`, `"file_write"`) and gets all matching tools. Useful when the agent knows the domain but not the specific tool.

**Hybrid:** Filter by capability, then rank by semantic similarity within that subset. This is the pattern recommended by frameworks like [LangChain](../projects/langchain.md) and [LangGraph](../projects/langgraph.md) for medium-scale registries (50-200 tools). See [Hybrid Search](../concepts/hybrid-search.md).

Frameworks like Open Multi-Agent (described in the deep analysis source) implement this via a `ToolRegistry` class that prevents duplicate registration, validates Zod schemas, and exposes filtered access by tool name set or preset capability tier.

### Schema Validation

Before execution, inputs get validated against the registered schema. This catches type errors, missing required fields, and out-of-range values before they reach the tool. The validation layer serves two purposes:

1. **Safety:** Prevents malformed calls from hitting external APIs.
2. **Error feedback:** When validation fails, the error message goes back to the model as a structured correction prompt rather than an exception trace.

In practice (as seen in Open Multi-Agent's `ToolExecutor`): tool failures return `ToolResult(isError: true)` rather than throwing — this keeps validation failures inside the conversation loop rather than crashing the agent run. The model receives the error, self-corrects its parameters, and retries.

### The Tool Search Tool Pattern

Anthropic's implementation treats tool discovery itself as a tool. The agent calls `tool_search(query="what tools can read files?")` and receives a ranked list of matching tool summaries. This is cleaner than special-casing discovery in the prompt — the model uses the same `call a tool → get a result` mental model for registry queries that it uses for everything else.

This approach shows up in the [Model Context Protocol](../concepts/model-context-protocol.md), which defines a `tools/list` endpoint that servers expose. MCP-compatible registries implement this endpoint; agents query it to enumerate available tools before choosing which to call. MCP separates "what tools exist and what are their schemas" (registry function) from "how to connect to the server exposing them" (protocol function).

### Access Control and Tiering

Production registries scope tool access by agent role:

```python
TOOL_PRESETS = {
    "readonly":  {"file_read", "web_search", "code_read"},
    "readwrite": {"file_read", "file_write", "web_search", "code_read", "code_run"},
    "full":      ALL_TOOLS
}
```

A reviewer agent gets `readonly`. A developer agent gets `readwrite`. This prevents a misconfigured prompt from giving a summarization agent write access to the filesystem. The Open Multi-Agent framework implements this as a three-layer filter: preset → allowlist → denylist → safety rails. Runtime-added tools via `agent.addTool()` bypass this filtering, which is a known gap.

---

## Relationship to Adjacent Concepts

**Tools vs. Skills:** Tools are atomic (input → output). Skills package tools together with procedural context. The registry tracks tools; a skill registry (like the SKILL.md ecosystem) tracks skills. They compose: a skill entry in a skill registry might reference several tool IDs that the tool registry must contain for the skill to function. [Agent Skills](../concepts/agent-skills.md) covers the skill layer.

**Registry vs. MCP Server:** An MCP server exposes tools over a protocol. A registry catalogs them. An agent can discover that a tool exists via a registry, then invoke it via an MCP server. Some implementations collapse these — the MCP server IS the registry, since `tools/list` gives you discovery. But for multi-server setups, a registry that aggregates across servers is valuable. See [Model Context Protocol](../concepts/model-context-protocol.md).

**Registry vs. Context Engineering:** The registry is one mechanism within [Context Engineering](../concepts/context-engineering.md). Loading only relevant tool schemas is context curation — the same principle that governs what code snippets, memory summaries, or documentation chunks go into a prompt. The registry operationalizes "don't show the model what it doesn't need right now."

**Registry vs. Skill Book:** [SkillBook](../concepts/skill-book.md) is a specific pattern for storing and retrieving procedural skills learned from experience. A tool registry is more static — it catalogs available capabilities rather than tracking what an agent has learned to do with them.

---

## Implementation Patterns

### Flat Registry (Small-Scale)

For 5-20 tools: store all schemas in a dict or file, inject all descriptions at turn start, inject schemas on demand. No search infrastructure needed.

```python
class SimpleToolRegistry:
    def __init__(self):
        self._tools: dict[str, ToolDefinition] = {}

    def register(self, tool: ToolDefinition):
        if tool.name in self._tools:
            raise ValueError(f"Duplicate tool: {tool.name}")
        self._tools[tool.name] = tool

    def get_descriptions(self) -> str:
        return "\n".join(f"- {t.name}: {t.description}" 
                         for t in self._tools.values())

    def get_schema(self, name: str) -> ToolDefinition:
        return self._tools[name]
```

### Semantic Registry (Medium-Scale)

For 20-200 tools: embed descriptions at registration, run similarity search on queries. LlamaIndex, LangChain's tool retrieval, or a lightweight [ChromaDB](../projects/chromadb.md) instance handle this. The registry exposes `search(query, k=5)` instead of dumping all descriptions.

### Hierarchical Registry (Large-Scale)

Past ~200 tools, flat semantic search degrades. The agent can't reliably distinguish between 15 similar tools from embedding distance alone. Organize by capability category, then search within categories. A meta-tool (`list_categories`, `search_in_category`) gives the agent a two-step path: pick the category, then pick the tool. This mirrors how humans navigate large APIs through documentation trees rather than full-text search.

The phase transition finding from the [Agent Skills](../concepts/agent-skills.md) research applies here: beyond a critical library size, routing accuracy collapses. Hierarchical organization is not optional at scale.

---

## Failure Modes

**Description drift.** A tool's behavior changes but its description doesn't. The agent selects the tool based on the old description, calls it with valid parameters, and gets unexpected results. No schema validation catches this — the inputs are structurally correct, the semantics are wrong. Fix: treat description as code; review it whenever tool behavior changes.

**Context injection on all tool calls.** Some implementations inject the full schema for every tool into every turn rather than fetching on demand. At 30+ tools this fills the context window, degrades attention, and increases cost. The fix is demand-loading, but many frameworks default to eager injection for simplicity. Check your framework's default behavior.

**Duplicate registration in multi-agent setups.** When multiple agents share a registry, concurrent registration of the same tool (e.g., during initialization) produces conflicts. The Open Multi-Agent `ToolRegistry` throws on duplicate names. Distributed registries need idempotent registration with version-based conflict resolution.

**Silent fallback on discovery failure.** If semantic search returns no results, some registries return an empty list and the agent proceeds without tools, silently degrading. Better behavior: return an error or a "no match found" message that the agent can surface rather than silently proceeding.

**Trust boundary collapse.** In [Multi-Agent Systems](../concepts/multi-agent-systems.md), sub-agents sharing a tool registry can access tools their role shouldn't permit if access control is applied at the agent level rather than the registry level. A compromised sub-agent or prompt injection can escalate to tools outside its intended scope. The registry must enforce access tiers, not just trust agent-level configuration.

---

## When Not to Use a Registry

**Single-agent, fixed-tool workflows.** If your agent always uses the same 5 tools and the workflow is static, a registry adds indirection with no benefit. Hardcode the schemas.

**Latency-critical paths.** Registry queries add a round-trip (or at minimum a local lookup + embedding comparison) before tool use. For sub-100ms response requirements, this overhead matters.

**Untrusted tool submission.** The 26.1% vulnerability rate in community skill/tool ecosystems (from the [Agent Skills](../concepts/agent-skills.md) survey) means open registries require security gates before production use. If you can't run static analysis and semantic classification on submitted tools, don't open registration to external contributors. Data exfiltration patterns appear in 13.3% of community tools; privilege escalation in 11.8%.

---

## Unresolved Questions

**Cross-platform portability.** Tools registered for one LLM provider often have provider-specific schema conventions (Anthropic's tool_use blocks vs. OpenAI's function_calling format vs. Gemini's). Universal tool schemas don't exist. You typically maintain provider-specific serializers or use an abstraction layer like [LiteLLM](../projects/litellm.md).

**Version conflict resolution in live systems.** When tool v2.0 breaks compatibility with v1.x and agents are mid-task, which version do they get? Most registries lack a coherent answer. Semantic versioning norms (major = breaking) are underimplemented.

**Cost accounting.** Per-call cost metadata exists in schema specs but most registries don't enforce budgets. An agent that discovers a tool with a high `cost_per_call` has no mechanism to decline it based on budget constraints.

**Federated registries.** When registries span organizations (team A's tools, team B's tools), access control, namespace conflicts, and trust delegation become hard. No standard protocol exists for federated tool discovery beyond MCP's per-server `tools/list`.

---

## Alternatives and Selection Guidance

| Approach | Use when |
|---|---|
| Static tool list in system prompt | Fewer than 15 tools, fixed workflow |
| Flat registry with exact lookup | 15-30 tools, agents know tool names in advance |
| Semantic registry (embedding search) | 30-150 tools, agent needs to discover by description |
| Hierarchical registry with meta-tools | 150+ tools, multiple domains, degraded selection at scale |
| MCP server as registry | Tools are remote services; you want protocol-level standardization |
| Skill registry with tool references | Tools group into procedural domains; skills, not atoms, are the right unit |

For agent coding tools specifically ([Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md)): these implement their own registry patterns internally, and the MCP integration layer is the practical interface. You configure which MCP servers expose tools; the coding agent handles discovery internally.

For custom agent builds with [LangGraph](../projects/langgraph.md) or [OpenAI Agents SDK](../projects/openai-agents-sdk.md): both provide tool registration primitives. LangGraph's tool node handles schema validation; OpenAI's SDK handles function_calling format translation. Neither provides built-in semantic search — you add that layer with a vector store if needed.


## Related

- [Agent Skills](../concepts/agent-skills.md) — part_of (0.7)

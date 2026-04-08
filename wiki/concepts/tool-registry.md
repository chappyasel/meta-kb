---
entity_id: tool-registry
type: concept
bucket: agent-architecture
abstract: >-
  A Tool Registry catalogs available tools with their specifications so agents
  can discover and select tools at runtime, enabling dynamic capability
  expansion without hardcoding tool lists into agent prompts.
sources:
  - articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/jackchen-me-open-multi-agent.md
related:
  - agent-skills
last_compiled: '2026-04-08T23:20:57.890Z'
---
# Tool Registry

## What It Is

A Tool Registry is a queryable catalog of tools an agent can invoke. It stores each tool's name, description, input/output schema, and metadata (version, permissions, cost, latency). At runtime, an agent queries the registry to discover which tools exist and what they do, then selects the appropriate ones for the current task.

The core distinction from a static tool list: tools registered at runtime, loaded selectively, not dumped wholesale into the agent's context. This matters because context space is finite, and forcing an agent to reason over 200 tool descriptions simultaneously degrades selection accuracy and burns tokens.

## Why It Matters

Without a registry, tool management degrades as capability grows. A flat list injected into every prompt has three failure modes:

1. **Context bloat**: Every tool description consumes tokens, whether or not that tool is relevant to the task
2. **Selection degradation**: Agent accuracy choosing among tools drops significantly past roughly 20-30 options in context simultaneously
3. **Brittleness**: Adding tools requires prompt edits, not config changes

A registry shifts tool management from a prompt engineering problem to a data management problem. The agent asks the registry what's available; the registry returns what's relevant.

## Core Mechanism

### Storage

The registry stores tool entries. A minimal entry contains:

- **Name**: unique identifier (`web_search`, `execute_python`)
- **Description**: natural-language explanation the LLM uses for selection
- **Input schema**: typically JSON Schema or a Zod definition specifying parameter names, types, required fields
- **Output schema**: what the tool returns
- **Metadata**: version, permission tier, estimated latency, cost-per-call, tags

Backends range from a simple Python dict or JSON file to SQLite for persistence to a vector database for semantic retrieval.

### Registration

Tools register themselves (or are registered by the system at startup):

```python
registry.register(
    name="web_search",
    description="Search the web for current information. Use when the user asks about recent events or needs up-to-date data.",
    input_schema={"query": "string", "num_results": "int"},
    output_schema={"results": "list[SearchResult]"},
    execute=web_search_fn,
    tags=["information_retrieval", "network"],
    permission_tier="read_only"
)
```

The description quality is critical. The agent uses descriptions to decide which tool to call. Vague or overlapping descriptions cause incorrect selection.

### Discovery

Agents query the registry before execution. Discovery modes:

**Semantic search**: embed the task description, retrieve the N most similar tool descriptions by cosine similarity. Effective for large registries. Requires a [Vector Database](../concepts/vector-database.md) or embedding index alongside the registry.

**Keyword/BM25**: token-overlap matching against tool names and descriptions. Cheaper than embedding, works well for registries with distinct tool names. See [BM25](../concepts/bm25.md).

**Hybrid**: semantic retrieval reranked by keyword overlap. Best precision for large, heterogeneous tool sets. See [Hybrid Search](../concepts/hybrid-search.md).

**Tag filtering**: the agent or orchestrator pre-filters by capability tags (`["file_system", "read_only"]`) before semantic ranking. Reduces the candidate set before the expensive embedding step.

**Tool Search Tool**: Anthropic's implementation in Claude Code embeds a `search_tools` tool that the agent can call to query its own tool registry. This is the meta-tool pattern: the agent actively queries for capability rather than receiving it passively. Their engineering notes report up to 85% token reduction by serving only relevant tool descriptions instead of the full list.

### Selection and Loading

After discovery returns candidates, the registry produces a filtered list the agent receives in its prompt. Implementations differ on what gets injected:

- **Full schema**: every parameter with types and constraints
- **Compressed schema**: name and description only, parameters fetched on demand
- **Progressive disclosure**: name → description → parameters → examples, staged across context levels

The [Agent Skills](../concepts/agent-skills.md) architecture formalizes this as three-level loading: Level 1 metadata (~dozen tokens) always present, Level 2 full specification loaded on trigger, Level 3 resources (examples, scripts) fetched on demand. This mirrors what a Tool Registry does for tools.

### Execution

The registry often doubles as a dispatcher. When the agent selects a tool and provides parameters:

1. Registry validates parameters against the stored schema (Zod, JSON Schema, or Pydantic depending on implementation)
2. Routes the call to the registered `execute` function
3. Returns structured output or a typed error
4. Logs the call for observability

Schema validation before execution is not optional in production. Without it, a misformatted LLM output silently reaches the tool and produces confusing errors.

## The Phase Transition Problem

The xu-agent-skills survey documents a critical empirical finding: past a critical library size, agent ability to select the correct tool from a flat list degrades sharply. This is the phase transition. The threshold depends on description quality and model capability, but it consistently appears.

The implication: flat registries do not scale. A registry with 200 tools in a flat list will have worse selection accuracy than one with 20 tools, even if the 200-tool registry technically has the right tool for every task.

The architectural response is hierarchical routing: categories → subcategories → individual tools, with the agent navigating the tree rather than scanning the leaf list. A meta-layer (sometimes called a [Meta-Agent](../concepts/meta-agent.md) or tool router) handles category selection; only the relevant category's tools get injected into the agent's working context.

## Implementations

**Open Multi-Agent** (TypeScript): `ToolRegistry` in `framework.ts` uses a name-to-tool map, prevents duplicate registration (throws on collision), validates Zod schemas before execution, supports parallel batch execution via a semaphore (default max 4 concurrent tool calls). The `defineTool()` helper converts Zod schemas to JSON Schema via `zodToJsonSchema()` for LLM consumption.

**[LangChain](../projects/langchain.md)**: `ToolRegistry` or `BaseTool` list passed to agents. Tools defined as classes inheriting `BaseTool`. Selection handled by agent logic, not a dedicated registry query step. Works but doesn't solve context bloat for large tool sets.

**[LangGraph](../projects/langgraph.md)**: Tools attached to nodes or passed to `ToolNode`. Graph structure partially substitutes for dynamic discovery: the graph topology determines which tools are available at each node, reducing the selection problem to within-node scope.

**[Claude Code](../projects/claude-code.md)**: Implements the Tool Search Tool pattern. The `/context` command shows context consumption by component, enabling developers to see which tools consume how much space. Skills (`.claude/skills/`) extend this by providing on-demand loading of tool configurations alongside instructions.

**[Model Context Protocol](../concepts/model-context-protocol.md)**: Defines a standard wire format for tool registration and discovery across agent-to-server boundaries. An MCP server exposes a `list_tools` endpoint; clients query it to discover available tools. MCP handles the connectivity layer; a registry handles the selection and routing layer. They are complementary.

**[OpenAI Agents SDK](../projects/openai-agents-sdk.md)**: Tools passed as a list to `Agent()`. No built-in dynamic discovery, but the architecture supports wrapping with a registry layer that filters the list per task.

## Integration with Related Concepts

**[Agent Skills](../concepts/agent-skills.md)**: Skills and tool registries are related but distinct. A skill is a knowledge package that tells an agent *how* to use a set of tools for a domain. The registry tells an agent *what tools exist*. A skill might instruct the agent to query the registry for tools matching specific tags, then explains how to interpret their outputs.

**[Context Engineering](../concepts/context-engineering.md)**: Tool registry design is a context engineering problem. Which tool descriptions to inject, at what level of detail, in what order affects agent performance significantly. The registry is infrastructure; context engineering determines how to use it.

**[Progressive Disclosure](../concepts/progressive-disclosure.md)**: The three-level staged loading (metadata → specification → resources) directly applies to tool registries. Load description-level summaries at planning time; load full schemas only when the tool is selected.

**[Multi-Agent Systems](../concepts/multi-agent-systems.md)**: Different agents in a multi-agent system need different tool subsets. A registry with permission tiers or agent-specific views handles this. The Open Multi-Agent `resolveTools()` method applies preset → allowlist → denylist filters to give each agent its appropriate tool subset.

**[Semantic Search](../concepts/semantic-search.md)**: Large registries require semantic retrieval over descriptions. The registry description quality directly determines retrieval accuracy.

## Strengths

**Dynamic capability extension**: New tools register without prompt edits. Useful in systems where tool availability changes (new API credentials, user-specific integrations, environment-specific tools).

**Context control**: Serving only relevant tool descriptions keeps prompts compact. Systems with hundreds of tools can operate efficiently because agents never see the full list simultaneously.

**Centralized governance**: Schema validation, permission checks, rate limiting, and logging live in one place. Every tool call routes through the registry, making it the natural enforcement point.

**Composability in multi-agent systems**: Each agent queries the same registry with different filters, getting role-appropriate tool subsets from shared infrastructure.

## Limitations

**Description quality bottleneck**: Registry effectiveness is entirely dependent on description quality. Two tools with similar descriptions cause the agent to select randomly between them. There is no automated way to detect description overlap or ambiguity.

**Concrete failure mode**: In a flat registry with 50+ tools, a coding agent asked to "check if a file exists" might select `read_file`, `list_directory`, or `execute_bash` depending on which description embeds nearest to "check if file exists." All three can accomplish the task; only one is idiomatic. The agent picks based on embedding similarity against ambiguous descriptions. This produces correct-but-inefficient tool use that's invisible without execution trace analysis.

**Infrastructure assumption**: Semantic discovery requires an embedding model and vector store at query time. In offline or latency-critical environments, you need a keyword fallback or pre-computed embedding indexes. The registry cannot simply be a static dict if semantic search is the primary discovery mechanism.

**Schema drift**: Tool behavior can change without schema updates. The registry stores what the tool accepts and returns, not what it does. If the underlying function behavior changes but the schema doesn't, the agent receives incorrect guidance that produces valid calls with wrong results.

## When Not to Use It

A tool registry is overhead when the agent uses three to five well-defined tools that never change. Static tool lists injected directly into the system prompt are simpler, faster, and easier to debug for small, stable tool sets. The registry pattern pays off when: (1) tool count exceeds roughly 10-15 and selective injection is needed, or (2) tool availability changes at runtime, or (3) different agents need different tool subsets from shared infrastructure.

## Unresolved Questions

**Description authoring**: There is no standard methodology or automated tooling for writing tool descriptions that reliably produce correct selection. The field treats this as a manual craft problem.

**Phase transition threshold**: The empirical finding that selection accuracy degrades past a critical registry size lacks a precise characterization. The threshold varies by model, description quality, and task distribution. No published methodology exists for determining the threshold for a specific registry.

**Cross-agent tool sharing**: In multi-agent systems where agents run in separate processes or machines, a centralized registry requires network access. Consistency guarantees, versioning across agents, and handling of tool updates mid-execution are architectural problems that individual framework implementations resolve differently with no emerging consensus.

**Cost attribution**: When tools have per-call costs (API fees, compute), the registry is the natural place to track and enforce budgets. Few implementations include this. The question of who pays when a tool call fails after incurring cost is typically unaddressed.

## Alternatives

**Static tool list**: Inject all tool descriptions into every prompt. Simpler, works well under ~15 tools, no infrastructure required. Fails at scale due to context bloat and selection degradation.

**[Model Context Protocol](../concepts/model-context-protocol.md)**: Standardizes tool discovery over a network protocol. Use when tools live on separate servers and interoperability across agent frameworks matters. MCP handles the transport; you still need selection logic.

**Hardcoded agent specialization**: Give each agent a fixed, small tool set appropriate to its role. Eliminates discovery overhead. Use when agent roles are stable and the tool set per role is small. Breaks when agents need to dynamically expand capabilities.

**[Agent Skills](../concepts/agent-skills.md)**: Use when tools need to be bundled with usage instructions and domain context, not just schemas. Skills solve "how to use this tool correctly" alongside "what tools exist."

Select a Tool Registry when tool count exceeds 10-15, tool availability varies by context or user, or multiple agents with different permission levels share infrastructure.


## Related

- [Agent Skills](../concepts/agent-skills.md) — implements (0.7)

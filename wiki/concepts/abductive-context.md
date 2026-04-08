---
entity_id: abductive-context
type: concept
bucket: context-engineering
abstract: >-
  Context Generation is the process by which agents dynamically assemble
  task-relevant information from distributed knowledge sources before or during
  task execution, determining what gets loaded into the context window and how.
sources:
  - tweets/vtahowe-context-graphs-an-iam-problem-at-scale.md
  - repos/memodb-io-acontext.md
  - repos/greyhaven-ai-autocontext.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/thedotmack-claude-mem.md
related:
  - openai
  - openclaw
  - anthropic
  - claude-code
  - claude
  - context-engineering
last_compiled: '2026-04-08T03:06:30.078Z'
---
# Context Generation

## What It Is

Context generation is the process of dynamically assembling task-relevant information from distributed knowledge sources and injecting it into an agent's active context window. The term captures a shift in thinking: context is not passively received but actively constructed. An agent facing a task selects, retrieves, compresses, and structures information from memory stores, knowledge bases, prior execution traces, and external sources to produce the context it needs.

The concept sits at the center of [Context Engineering](../concepts/context-engineering.md): while context engineering names the full discipline of managing what enters the context window, context generation names the construction step. You cannot do context engineering without context generation; context generation without engineering discipline produces bloated, poorly ordered, or irrelevant context.

Context generation is distinct from [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md), though the two overlap heavily. RAG typically describes a narrow pipeline: embed a query, retrieve matching chunks, prepend them to a prompt. Context generation is broader: it may involve RAG, but also includes structured tool calls, progressive disclosure patterns, memory compression, execution trace summarization, and explicit orchestration of what to load versus defer.

## Why It Matters

Language models have no persistent state between calls. Everything an agent knows about the current task must fit in the context window at inference time. Context generation determines the quality of that window.

Two failure modes define the stakes. Load too little and the model lacks facts it needs, repeating work or making avoidable mistakes. Load too much and the model hits the [Lost in the Middle](../concepts/lost-in-the-middle.md) problem: relevant content buried in noise degrades response quality even when technically present. Context generation is the mechanism that navigates between these failure modes.

At scale, context quality compounds. An agent running 50 tasks per day with poor context generation makes systematically worse decisions than one with targeted, high-quality context. The difference between a capable agent and a frustrating one often traces back to this single process.

## How It Works

### The Generation Pipeline

Context generation typically proceeds through five stages, though any given system may collapse or expand these:

**1. Task decomposition.** The agent (or an orchestrating layer) identifies what the current task requires. For a coding agent fixing a bug, this includes: the relevant source files, prior failures on similar bugs, coding conventions for this codebase, and any tool outputs from earlier in the session.

**2. Source identification.** The system queries available knowledge sources. These may include vector databases (semantic similarity), structured stores (SQL queries, graph traversal), episodic memory (prior sessions), procedural memory (skills, playbooks), and the current conversation history.

**3. Retrieval and ranking.** Content matching the task requirements is retrieved and ranked by relevance. In [Hybrid Search](../concepts/hybrid-search.md) approaches, BM25 keyword matching combines with vector similarity to improve recall. Systems like [HippoRAG](../projects/hipporag.md) and [RAPTOR](../projects/raptor.md) add graph traversal or hierarchical summarization to retrieve higher-quality units than raw chunk retrieval produces.

**4. Compression and selection.** Retrieved content is filtered, summarized, or compressed to fit within token budgets. [Context Compression](../concepts/context-compression.md) techniques range from simple truncation to LLM-powered summarization that preserves semantics while reducing length. The claude-mem system demonstrates this: it compresses 100+ tool invocations per session into structured XML observations, reducing raw tool output to semantically dense summaries.

**5. Assembly and injection.** Selected content is ordered and formatted for injection. Ordering matters: models attend differently to information at different positions. Headers, delimiters, and structured formatting help models locate relevant content within long contexts.

### Retrieval Strategies

Different knowledge types require different retrieval strategies:

**Semantic search** uses vector embeddings to find content with similar meaning. It excels at finding conceptually related content when exact keywords differ. The [Vector Database](../concepts/vector-database.md) layer (ChromaDB, Pinecone, etc.) handles this. Systems like [Mem0](../projects/mem0.md) and [Zep](../projects/zep.md) use semantic search as their primary retrieval mechanism.

**Keyword search** using [BM25](../concepts/bm25.md) or FTS5 finds exact matches and handles named entities, code identifiers, and technical terms better than semantic search. The acontext system uses SQLite's FTS5 virtual tables to index observation narratives, facts, and concepts, enabling keyword search across stored agent memory.

**Graph traversal** navigates [Knowledge Graph](../concepts/knowledge-graph.md) structures to follow relationships between entities. [GraphRAG](../projects/graphrag.md) and [Graphiti](../projects/graphiti.md) use graph structures to retrieve not just matching documents but their connected context. A query about a function returns the function, its callers, its dependencies, and related design decisions.

**Progressive disclosure** represents an agent-driven retrieval model where the agent decides what to load through explicit tool calls rather than semantic matching. [Acontext](../projects/openclaw.md) implements this directly: agents call `list_skills`, then `get_skill`, then `get_skill_file` in sequence. Each call reveals more detail, and the agent reasons about what to load next. This avoids top-k retrieval errors but requires the agent to know what it needs before knowing it needs it.

**Trace-based injection** retrieves context from prior execution rather than static knowledge bases. Claude-mem injects summaries from the last 10 sessions at session start, giving the agent awareness of prior work without loading raw logs. The autocontext system builds a `ScoreTrajectoryBuilder` that assembles score history across prior generations and injects it into every agent prompt.

### Structured Context vs. Raw Retrieval

A significant design decision in context generation is whether retrieved content arrives as raw text or structured data.

Raw text is flexible but noisy. Retrieving chunks of documentation or conversation history gives the model access to information but requires it to parse structure, identify relevance, and extract key facts from prose.

Structured context is more expensive to produce but more useful at inference time. The acontext system's five-agent pipeline (competitor, analyst, coach, architect, curator) generates structured playbooks with explicit lesson entries and `applies_when` scoping fields. Acontext formats memory as Markdown files with YAML frontmatter, SOPs, and warnings. Claude-mem extracts XML observations with typed fields (`type`, `title`, `facts`, `narrative`, `concepts`). These structured formats let models locate and use relevant content without parsing overhead.

The tradeoff: structured context generation requires an LLM-in-the-loop during the write phase. Acontext's three-stage pipeline (task extraction, distillation, skill agent) requires approximately 30-55 LLM calls per session learning cycle. Claude-mem's PostToolUse hook fires for every tool invocation, calling the SDK agent to compress each observation. This cost is amortized over many future retrievals, but it makes structured context generation expensive at ingest time.

### Token Economics and Budgeting

Context windows are finite. Every system that generates context must track token usage and make tradeoffs between breadth and depth.

Claude-mem's `TokenCalculator` tracks compression ratios in real time, reporting `totalReadTokens` (what raw tool output would have consumed) versus `totalDiscoveryTokens` (compressed observation size). The MCP search tools enforce a three-layer progressive disclosure pattern explicitly designed for "10x token savings": search returns an index at ~50-100 tokens per result, timeline adds chronological context, and get_observations fetches full details only after filtering.

Acontext manages token economics through the `AUTOCONTEXT_SKILL_MAX_LESSONS` cap, curator-driven consolidation, and playbook versioning. When lesson counts exceed the cap, the curator consolidates entries rather than allowing unbounded growth.

These token accounting patterns reflect a broader principle: context generation systems must treat token budgets as first-class constraints, not afterthoughts. An agent that loads everything relevant but exceeds the model's effective attention span generates worse outputs than one that loads less, more selectively.

## Who Implements It

Context generation appears across every serious agent infrastructure:

**Coding agents** perform context generation continuously. [Claude Code](../projects/claude-code.md) uses [CLAUDE.md](../concepts/claude-md.md) files as pre-generated static context injected at session start, supplemented by dynamic tool calls during execution. The claude-mem plugin adds automatic session memory by generating compressed context from prior sessions and injecting it via CLAUDE.md. [OpenClaw](../projects/openclaw.md) uses the acontext skill system to progressively load relevant skills during task execution.

**Memory systems** implement context generation as their core function. [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), and [Letta](../projects/letta.md) each generate context from stored memories, with different tradeoffs on retrieval strategy, compression, and structure. [MemGPT](../projects/memgpt.md) treats context generation as an explicit agent action: the agent manages its own context window by deciding what to load from external storage.

**Self-improving systems** use context generation to inject accumulated knowledge into future runs. Autocontext generates context from playbooks, hints, and score trajectories for each new generation. The coach agent writes structured lessons that become future context. The architect generates tools that become available to future competitors. This is context generation as knowledge compounding.

**Multi-agent systems** face context generation at the inter-agent level: what does each agent need to know about other agents' work? [CrewAI](../projects/crewai.md) and [AutoGen](../projects/autogen.md) pass structured outputs between agents, where the output of one agent becomes the generated context for the next.

## Practical Implications

### Context Generation Is Not One-Time

In most agentic systems, context generation runs repeatedly within a session: at start (inject prior session knowledge), before each tool call (what does the agent need to know to use this tool well?), after tool results (compress and store what was learned), and at session end (summarize for future injection). The claude-mem architecture makes this explicit with six distinct lifecycle hooks, each performing context generation tasks at different points.

### Write Quality Determines Read Quality

The structure and quality of stored content constrains what context generation can produce. If an agent's memory system stores raw text blobs, context generation can only retrieve raw text. If the system stores structured observations with typed fields, scoped applicability, and explicit lessons, context generation can produce targeted, high-quality context.

Acontext's three-stage distillation pipeline (task extraction -> distillation -> skill agent) is expensive precisely because it invests in write quality. The `applies_when` field in distilled learnings scopes each lesson to specific conditions, preventing over-retrieval. The SOP/Warning/Fact taxonomy enables type-filtered retrieval. These write-time investments pay off at retrieval time.

### Progressive Disclosure Beats Top-K for Agent Use

Semantic similarity retrieval (top-k chunks) is effective for RAG pipelines where the query is a well-formed question. For agent context generation, where the agent needs different information at different points in task execution, progressive disclosure often outperforms top-k.

Top-k retrieves fixed chunks regardless of whether the agent needs all of them. Progressive disclosure lets the agent request exactly what it needs through tool calls, loading more detail when needed and avoiding loading irrelevant content. The tradeoff is that progressive disclosure requires more tool call latency and assumes the agent reasons well about what it needs.

### Credit and Attribution

When context generation drives agent performance, understanding which context elements contributed to outcomes becomes important for system improvement. Autocontext's `analytics/credit_assignment.py` implements component sensitivity profiling to identify which types of context changes (playbook updates, new tools, additional hints) drove score improvements. Without credit assignment, systems may continue generating context that fills the window but does not improve performance.

## Failure Modes

**Retrieval-context mismatch.** The query used for retrieval does not match the form in which relevant content is stored. An agent asking "how do I handle 401 errors from this API?" retrieves nothing if past learnings are stored under "authentication error handling patterns." Hybrid search and [Semantic Search](../concepts/semantic-search.md) mitigate this, but structured taxonomies (like acontext's category-level skills) address it more directly.

**Knowledge pollution.** Accumulated context degrades over time as outdated, contradictory, or low-quality content enters the context generation pipeline. Acontext's curator agent addresses this directly, acting as a quality gate for all knowledge changes. Without a gating mechanism, context generation systems accumulate noise that degrades model performance. The autocontext `TrendAwareGate` watches for score plateaus that might indicate knowledge pollution.

**Structural decay.** In progressive disclosure systems, context generation quality degrades if the agent fails to discover relevant skills. An agent that does not know skill X exists will not call `get_skill_file(X)`. This requires good skill naming, useful SKILL.md manifests, and agent reasoning quality. The acontext system addresses this through the skill index returned by `list_skills`, but discovery remains dependent on agent reasoning.

**Cost explosion.** LLM-in-the-loop context generation scales poorly. Claude-mem fires a PostToolUse hook for every tool invocation, generating an LLM call per observation. Autocontext runs five agents per generation plus tournament matches. Systems with high tool-use rates can accumulate substantial LLM costs in the generation pipeline. Token budgeting and selective generation (the `skip_learning` classification in acontext's distillation step) are necessary mitigations.

**Context window saturation.** Generating too much context defeats the purpose. A system that retrieves 50 relevant documents and injects all of them may produce worse outputs than one that retrieves 10 and ranks them by relevance. The [Lost in the Middle](../concepts/lost-in-the-middle.md) effect means models attend poorly to content in the middle of long contexts, so saturation is not neutral.

## When Progressive Disclosure Is the Wrong Choice

Progressive disclosure-based context generation (agent requests what it needs via tool calls) suits tasks where the agent can reason about what it needs before seeing it. It fails when:

- The agent does not know what it does not know. Debugging an unfamiliar codebase benefits from broad semantic search that surfaces unexpected connections, not from the agent requesting specific files it already knows about.
- Latency matters more than precision. Three progressive tool calls add 200-500ms per retrieval cycle. High-throughput applications with latency constraints need retrieval to happen in one shot.
- The knowledge space is novel. A new agent with empty memory has nothing to request progressively. Broad retrieval strategies work better at bootstrap.

For these cases, semantic search with hybrid retrieval and relevance-ranked injection produces better results than progressive disclosure.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): The broader discipline of which context generation is one component
- [Context Management](../concepts/context-management.md): Managing context window state during execution
- [Context Compression](../concepts/context-compression.md): Reducing context size while preserving information
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): The specific retrieval-then-generate pipeline
- [Progressive Disclosure](../concepts/progressive-disclosure.md): Agent-driven incremental context loading
- [Agent Memory](../concepts/agent-memory.md): The stores from which context is generated
- [Episodic Memory](../concepts/episodic-memory.md): Session-level memory used in context generation
- [Semantic Search](../concepts/semantic-search.md): One retrieval mechanism for context generation
- [Hybrid Search](../concepts/hybrid-search.md): Combined keyword and semantic retrieval

---
entity_id: context-engineering
type: concept
bucket: context-engineering
abstract: >-
  Context engineering is the discipline of systematically designing, retrieving,
  and managing information in an LLM's context window to maximize task
  performance; its key differentiator from prompt engineering is treating
  context as a structured optimization problem across the full inference
  pipeline.
sources:
  - repos/memodb-io-acontext.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/topoteretes-cognee.md
  - repos/letta-ai-lettabot.md
  - articles/effective-context-engineering-for-ai-agents.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - agent-memory
  - claude-code
  - openai
  - anthropic
  - mcp
  - agent-skills
  - graphrag
  - letta
  - claude-md
  - chain-of-thought
  - task-decomposition
last_compiled: '2026-04-07T11:39:57.047Z'
---
# Context Engineering

## What It Is

Context engineering is the systematic discipline of deciding what information goes into an LLM's context window, how that information is structured and compressed, and how it gets assembled dynamically at inference time. [Andrej Karpathy](../concepts/andrej-karpathy.md) popularized the term as a correction to "prompt engineering," which undersells the scope of the problem. A prompt is a single text string. A context is a structured payload assembled from multiple sources, each competing for a finite token budget.

The formal definition from a 2025 survey covering 1,400+ papers: **C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)**, where A is an assembly function operating on six component types, subject to the hard constraint |C| ≤ L_max (the context window limit). Every system prompt, RAG pipeline, and memory layer is making allocation decisions within this constraint, whether or not the builder frames it that way. [Source](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)

This distinguishes context engineering from [prompt engineering](../concepts/prompt-engineering.md) (which focuses on phrasing individual inputs), from [RAG](../concepts/rag.md) (which is one implementation pattern within context engineering), and from [agent memory](../concepts/agent-memory.md) (which addresses one component — c_mem — of the broader problem).

## Why It Matters: The Comprehension-Generation Asymmetry

The most actionable finding from the 2025 survey is a structural asymmetry: LLMs are far better at understanding complex contexts than generating equally sophisticated outputs. A model can reason over a 128K-token context containing dozens of documents, but it cannot generate a document of equivalent complexity and coherence.

The implication for builders is direct: investing in richer context assembly yields higher returns than trying to elicit better outputs from sparse context. Put more specifically, if your system gives the model poor inputs and relies on its generation capability to compensate, you are working against the architecture. The leverage is in retrieval quality, context formatting, and compression — not in prompt phrasing.

## The Six Context Components

### c_instr — Instructions

System prompts, behavioral rules, output format specifications, persona definitions. The most commonly discussed component and the one most builders over-optimize at the expense of the others. [CLAUDE.md](../concepts/claude-md.md) files in coding agents are a concrete implementation: persistent instruction files that give the model project-specific behavioral context across sessions.

### c_know — External Knowledge

Retrieved documents, database query results, web search output, knowledge graph traversals. This is the domain of [RAG](../concepts/rag.md) and [GraphRAG](../concepts/graphrag.md). The key question is not just what to retrieve but how much, in what format, and whether the retrieval happens once (static RAG) or iteratively ([agentic RAG](../concepts/agentic-rag.md)).

### c_tools — Tool Definitions

Function signatures, API schemas, tool descriptions passed to the model for function calling. Token budgets for tool definitions are frequently underestimated. A system with 30 available tools may spend 15-20% of its context budget on tool schemas before any user input appears.

### c_mem — Memory

Persistent information from prior interactions. This maps onto the memory taxonomy covered separately under [agent memory](../concepts/agent-memory.md): [episodic memory](../concepts/episodic-memory.md) (prior conversations), [semantic memory](../concepts/semantic-memory.md) (facts about the world and user), [procedural memory](../concepts/procedural-memory.md) (how to do things), and [core memory](../concepts/core-memory.md) (always-present biographical context). Projects like [Letta](../projects/letta.md), [Mem0](../projects/mem0.md), and [Zep](../projects/zep.md) implement different strategies for populating c_mem.

### c_state — Dynamic State

Current world state, user session context, multi-agent coordination state, task progress. In coding agents, this includes the current file tree, open files, and recent errors. In multi-agent systems, it includes messages from other agents and shared workspace state. [Model Context Protocol](../concepts/mcp.md) standardizes how state gets exposed to agents across different tool providers.

### c_query — The Immediate Request

The user's current question or instruction. Frequently the smallest component by token count but the one that drives retrieval and assembly of all other components.

## How Assembly Works

Context assembly is not concatenation. The assembly function A must solve several subproblems simultaneously:

**Retrieval**: For c_know and c_mem, the system must decide what to retrieve. Dense retrieval (embedding similarity via [vector databases](../concepts/vector-database.md)), sparse retrieval ([BM25](../concepts/bm25.md)), and [hybrid search](../concepts/hybrid-search.md) combining both are the primary mechanisms. The information-theoretic framing: maximize I(Y*; c_know | c_query) — retrieve context that is maximally informative about the correct output, conditioned on the query.

**Ranking and Filtering**: Retrieved candidates must be ranked by relevance and filtered to fit the budget. [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md) combines rankings from multiple retrieval methods. Reranking models (cross-encoders) provide more accurate relevance scores than embedding similarity alone at the cost of additional latency.

**Compression**: When retrieved content exceeds available budget, it must be compressed. Compression techniques include extractive summarization (selecting key sentences), abstractive summarization (LLM-generated summaries), and structured extraction (pulling out entities and relationships). [Context compression](../concepts/context-compression.md) operates at 4-8x compression ratios with moderate information loss — the cost of compression is never zero. Techniques like StreamingLLM and Infini-attention address compression at the architectural level.

**Ordering and Formatting**: Position within context affects model attention. The "lost in the middle" phenomenon — where models attend poorly to information in the middle of long contexts — means critical information should appear near the beginning or end. Structured formats (XML tags, JSON, markdown headers) help models parse context boundaries.

**Tiered Memory Management**: Production systems implement hot/warm/cold storage tiers. Hot context (always in window) holds the current task state and core instructions. Warm context (retrieved per session) holds recent history and relevant knowledge. Cold storage (retrieved on demand) holds the full knowledge base and long-term memory. [Letta](../projects/letta.md)'s MemGPT architecture operationalized this tiering with explicit memory management functions the model can call.

## Implementation Patterns

### Static RAG

Retrieve once at query time, append to context, generate. Simple, predictable, fast. Fails on multi-hop questions that require synthesizing across documents because retrieval happens before the model knows what intermediate steps it needs.

### Agentic RAG

The model decides when and what to retrieve through tool calls. Self-RAG trains models to generate retrieval tokens mid-generation. CDF-RAG uses confidence scores to trigger retrieval. Higher accuracy on complex tasks, harder to debug, higher latency. [Agentic RAG](../concepts/agentic-rag.md) represents a shift from context-as-input to context-as-working-memory.

### Graph-Enhanced Retrieval

[GraphRAG](../concepts/graphrag.md) extracts entities and relationships from documents, builds a knowledge graph, and retrieves graph subgraphs rather than raw document chunks. Consistent 10-20% improvements on multi-hop reasoning benchmarks (self-reported by individual papers, not independently benchmarked as a class). [HippoRAG](../projects/hipporag.md) and [RAPTOR](../projects/raptor.md) implement variants. The tradeoff: graph construction is expensive and graph quality degrades on poorly structured source documents.

### Skill-Based Memory

Rather than storing raw conversation history or vector embeddings, systems like [Acontext](../raw/repos/memodb-io-acontext.md) distill agent execution traces into human-readable skill files — markdown documents describing what worked, what failed, and user preferences. These files populate c_mem directly, bypassing embedding search entirely. Retrieval becomes tool-based progressive disclosure rather than semantic search. The advantage: skills are inspectable, editable, and portable. The limitation: distillation quality depends on the LLM doing the distillation.

### Knowledge Graph as Memory

[Cognee](../raw/repos/topoteretes-cognee.md) and similar systems treat all ingested information as nodes and edges in a graph, enabling both vector similarity search and graph traversal at query time. The graph structure captures relationships that chunk-based RAG misses. The 6-line API (`cognee.add()`, `cognee.cognify()`, `cognee.search()`) abstracts the complexity, but the underlying system requires graph database infrastructure (Neo4j or compatible).

### Personalized Context Architectures

Tools like Ars Contexta (a Claude Code plugin) generate domain-specific context architectures through conversation — deriving folder structure, context files, processing pipelines, and navigation maps from how the user describes their work. The insight: a generic CLAUDE.md is less effective than one derived from the specific cognitive patterns of the domain. This operationalizes context engineering at the system-design level rather than the per-query level.

## Relationship to Adjacent Concepts

[Chain-of-thought](../concepts/chain-of-thought.md) prompting is a context engineering technique for c_instr: explicitly structuring the reasoning scaffold the model should follow. [Task decomposition](../concepts/task-decomposition.md) is a context management technique: breaking tasks so that each sub-task fits within an effective context budget with appropriate information. [Progressive disclosure](../concepts/progressive-disclosure.md) structures how context is revealed to the model across multiple turns rather than all at once.

[Context management](../concepts/context-management.md) is the narrower subproblem of handling what happens as context fills — truncation strategies, summarization, and deciding what to evict. [Context window](../concepts/context-window.md) defines the hard constraint. [Context compression](../concepts/context-compression.md) addresses the techniques for operating within that constraint.

## Failure Modes

**Context stuffing**: Adding everything available rather than making selection decisions. More context is not always better — irrelevant content increases noise and can degrade performance. Studies show models perform worse on simple retrieval tasks when irrelevant documents are present alongside relevant ones.

**Lost-in-the-middle degradation**: Information placed in the middle of a long context receives less model attention than information at the boundaries. Critical facts buried in the 40th percentile of a 128K context may effectively be invisible to the model. The fix is either reordering or using architectures (Mamba, state-space models) with different attention patterns.

**Component budget neglect**: Tool schemas, system instructions, and memory components consume tokens before the user query appears. Systems that don't track total context budget can silently exceed limits, causing truncation of the most recently added (often most relevant) content.

**Static assembly for dynamic tasks**: Pre-assembling context at session start works for simple question-answering but fails for multi-step agentic tasks where what matters changes as the task progresses. The required information for step 5 of a task is not known at step 1.

**Memory without synthesis**: Storing raw conversation history as c_mem grows token cost linearly with conversation length. Without periodic summarization or distillation, memory becomes a liability rather than an asset past a few sessions.

**Compression information loss**: Compressing context to fit budgets removes information. The question of which information to remove is hard. Summarization preserves conclusions but discards reasoning chains. Extractive compression preserves exact text but may miss implicit context. No compression technique reliably preserves all information the model would need.

## When Context Engineering Doesn't Solve the Problem

Context engineering addresses the information input to a model. It does not address:

- Model capability limits — if the model cannot perform the underlying reasoning, better context won't fix it
- Latency constraints — rich context assembly with multiple retrieval steps adds latency; some applications cannot tolerate it
- Cost constraints — processing large contexts is expensive; systems with tight per-query cost budgets may need model fine-tuning instead
- Temporal reasoning over long histories — current retrieval techniques perform poorly on questions requiring synthesis across months of interactions (LongMemEval benchmarks show this gap)
- Multi-agent context coherence — sharing and synchronizing context across multiple agents remains an unsolved coordination problem

When model behavior needs to change permanently (not per-query), fine-tuning or [continual learning](../concepts/continual-learning.md) is the right tool. When the task requires genuinely novel synthesis the model has never seen, context engineering can help but cannot substitute for capability the model lacks.

## Unresolved Questions

**Optimal allocation**: Given a fixed context budget, how should it be divided among c_instr, c_know, c_tools, c_mem, c_state, and c_query? The formal optimization framework is mathematically clean but practically uncomputable — you cannot calculate mutual information quantities at runtime. Empirical budget allocation remains largely ad hoc.

**Evaluation**: Existing benchmarks (GAIA, LongMemEval, SWE-bench) test specific capabilities but do not evaluate context engineering quality directly. There is no standard metric for "how well did this system use its context budget."

**Graph vs. vector tradeoffs**: When does graph-enhanced retrieval justify its construction cost over vector similarity search? The answer likely depends on source document structure and query type, but no systematic study provides selection guidance.

**Cross-session memory quality**: Most memory system evaluations test single-session recall. Whether current memory architectures degrade gracefully over months of use — or silently accumulate noise — remains empirically unclear.

## Related Concepts and Projects

- [Agent Memory](../concepts/agent-memory.md) — the c_mem component in detail
- [RAG](../concepts/rag.md) — the dominant c_know assembly pattern
- [GraphRAG](../concepts/graphrag.md) — graph-enhanced c_know retrieval
- [Model Context Protocol](../concepts/mcp.md) — standardizing how c_state and c_tools are exposed
- [CLAUDE.md](../concepts/claude-md.md) — persistent c_instr implementation
- [Context Compression](../concepts/context-compression.md) — managing the L_max constraint
- [Context Window](../concepts/context-window.md) — the hard constraint context engineering operates within
- [Chain-of-Thought](../concepts/chain-of-thought.md) — c_instr technique for reasoning scaffolds
- [Task Decomposition](../concepts/task-decomposition.md) — managing context budget across sub-tasks
- [Letta](../projects/letta.md) — tiered memory architecture implementing context management
- [LangChain](../projects/langchain.md) / [LangGraph](../projects/langgraph.md) — orchestration frameworks with context assembly primitives
- [LongMemEval](../projects/longmemeval.md) — benchmark for long-context memory evaluation

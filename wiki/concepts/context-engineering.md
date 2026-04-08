---
entity_id: context-engineering
type: concept
bucket: context-engineering
abstract: >-
  Context engineering is the discipline of designing and optimizing the
  information payload delivered to LLMs within finite context windows — distinct
  from prompt engineering by treating context as a dynamic, structured assembly
  problem rather than static text.
sources:
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/affaan-m-everything-claude-code.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/aiming-lab-agent0.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/memodb-io-acontext.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/safishamsi-graphify.md
  - repos/topoteretes-cognee.md
  - repos/wangyu-ustc-mem-alpha.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
related:
  - claude-code
  - agent-memory
  - andrej-karpathy
  - anthropic
  - claude
  - model-context-protocol
  - multi-agent-systems
  - retrieval-augmented-generation
  - cursor
  - autoresearch
  - knowledge-graph
  - codex
  - agent-skills
  - react
  - langchain
  - continual-learning
  - langgraph
  - cognitive-architecture
  - reinforcement-learning
  - gemini
  - context-management
  - chain-of-thought
  - openclaw
last_compiled: '2026-04-08T22:56:12.843Z'
---
# Context Engineering

## What It Is

Context engineering is the systematic discipline of designing, constructing, and optimizing the information provided to a language model within its context window. [Andrej Karpathy](../concepts/andrej-karpathy.md) popularized the term in mid-2025 as a deliberate upgrade from "prompt engineering," which he argued understated the scope of the problem. The distinction matters: prompt engineering suggests writing better instructions; context engineering treats the entire information payload — instructions, retrieved knowledge, tool definitions, memory traces, agent state, and the user's query — as a structured engineering artifact subject to optimization.

A formal treatment from the survey literature defines context as:

**C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)**

Where A is an assembly function operating on six component types, subject to the hard constraint |C| ≤ L_max (the context window limit). [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

The goal is maximizing expected task reward across a distribution of tasks, given that finite budget. Every system prompt, retrieval pipeline, and memory layer makes token allocation decisions, whether the designer recognizes them as such or not. Context engineering makes those decisions explicit.

## Why It Matters

LLMs exhibit a fundamental asymmetry: they understand complex contexts far better than they generate equivalently sophisticated outputs. This means the return on investing in richer context assembly exceeds the return on prompting the model to "think harder." Building better input yields more than improving generation instructions on sparse input. [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

A second driver is the economics of scale. A 200K token context window sounds generous until you account for system prompts (~10K tokens), resident rules (~5-8K), MCP tool definitions (~2-5K each with no more than 10 recommended), and the [lost-in-the-middle](../concepts/lost-in-the-middle.md) phenomenon where models underweight information positioned in the middle of long contexts. Effective context engineering recovers token budget and positions information where models are most likely to use it. [Source](../raw/deep/repos/affaan-m-everything-claude-code.md)

Third, multi-turn and multi-agent systems compound the problem. An agent operating across sessions, or a system where multiple agents share state, cannot fit all relevant history in context. Which information gets included, when, and in what form determines whether the system degrades gracefully or hallucinates from stale state.

## Core Components

### The Six-Component Model

Each component in C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query) has distinct engineering considerations:

**c_instr (Instructions):** System prompts, behavioral rules, constraints, and persona definitions. The most mature component — well-understood from prompt engineering research. Files like [CLAUDE.md](../concepts/claude-md.md) represent an operationalized form of instruction context that loads at session start and persists across the conversation.

**c_know (External Knowledge):** Information retrieved from outside the model's parametric knowledge. The primary mechanism is [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md), which encompasses dense retrieval (embedding similarity), sparse retrieval ([BM25](../concepts/bm25.md)), [hybrid search](../concepts/hybrid-search.md), and graph-enhanced retrieval. Projects like [GraphRAG](../projects/graphrag.md), [HippoRAG](../projects/hipporag.md), and [RAPTOR](../projects/raptor.md) represent different bets on what retrieval architecture best serves multi-hop reasoning.

**c_tools (Tool Definitions):** Tool schemas consume significant context budget. Every function signature, parameter description, and usage example loaded into context is unavailable for task-relevant content. Systems like [Model Context Protocol](../concepts/model-context-protocol.md) standardize how tools are exposed to models, but tool selection and loading remain active engineering decisions.

**c_mem (Memory):** Persistent information from prior interactions, structured by memory type. [Agent Memory](../concepts/agent-memory.md) encompasses [episodic memory](../concepts/episodic-memory.md) (specific past events), [semantic memory](../concepts/semantic-memory.md) (general facts and knowledge), [procedural memory](../concepts/procedural-memory.md) (how to do things), and [core memory](../concepts/core-memory.md) (identity-level persistent state). Systems like [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), and [Letta](../projects/letta.md) take different architectural positions on how to structure and retrieve memory into context.

**c_state (Dynamic State):** Current world state, user context, and agent coordination state. In [multi-agent systems](../concepts/multi-agent-systems.md), this includes shared workspace state, other agents' outputs, and coordination signals. State management is where many production systems break — agents operating on stale or inconsistent state relative to each other.

**c_query (The Request):** The immediate user input. Often the smallest component by token count but the anchor around which everything else should be organized.

### Assembly as the Core Problem

The assembly function A is where context engineering actually happens. A simple implementation concatenates all components. Sophisticated implementations make dynamic decisions about what to include, in what order, at what compression level, based on the specific query.

[Chain-of-thought](../concepts/chain-of-thought.md) prompting is one form of context assembly instruction — directing the model to externalize reasoning steps in context, where they can influence subsequent generation. ReAct ([ReAct](../concepts/react.md)) interleaves reasoning and action traces, building context through the trajectory of tool use. These are assembly strategies, not just prompting tricks.

[Context compression](../concepts/context-compression.md) represents a class of techniques that manipulate c_know and c_mem before assembly: summarization, selective extraction, and token-efficient reformulation. Projects like graphify report 71.5x token reduction by converting raw file corpora into queryable knowledge graphs — a compression strategy that transforms what would require reading 52 files into a graph traversal. [Source](../raw/repos/safishamsi-graphify.md) That number comes from a specific benchmark corpus (Karpathy repos + papers + images) and should not be treated as a general figure.

### Retrieval Quality as Force Multiplier

Given the comprehension-generation asymmetry, retrieval quality is the highest-leverage intervention in most systems. This means:

- Dense retrieval (embedding similarity) works for semantic relevance but fails on exact matching and keyword lookup
- Sparse retrieval (BM25) handles keywords well but misses semantic paraphrase
- Hybrid approaches combine both, typically outperforming either alone
- Graph-enhanced retrieval ([Knowledge Graph](../concepts/knowledge-graph.md) integration) shows consistent 10-20% improvements on multi-hop reasoning tasks over vanilla RAG [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

The choice of retrieval architecture should follow task structure: single-document lookup favors dense retrieval; synthesis across many documents favors graph approaches; exact term matching requires sparse or hybrid.

## Implementation Patterns

### Static vs. Dynamic Context

Static context (load once at session start, persist unchanged) is simple and predictable. System prompts, project-level rules, and stable knowledge bases fit this pattern. The [CLAUDE.md](../concepts/claude-md.md) file that [Claude Code](../projects/claude-code.md) loads at startup is static context engineering — a carefully structured document that shapes agent behavior without consuming per-turn token budget.

Dynamic context (assembled per turn based on query) is more capable but harder to debug. [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is the canonical dynamic pattern: each query triggers retrieval, retrieved documents enter context alongside the query, then get discarded after generation. Agentic RAG extends this to multi-step retrieval where the model decides when to retrieve and what to ask for.

Modular context assembly — the trend documented in the survey — combines both: static components (instructions, tool definitions, stable knowledge) with dynamic components (retrieved documents, session memory, current state). This is what [LangChain](../projects/langchain.md) and [LangGraph](../projects/langgraph.md) implement structurally, and what systems like [Cursor](../projects/cursor.md) and [Claude Code](../projects/claude-code.md) implement for coding contexts.

### Skill-Based Context

A distinct pattern treats context as composed of "skills" — structured knowledge modules that activate based on context. [Everything Claude Code](../projects/claude-code.md) implements this at scale: 156 skill files across 12 language ecosystems, each a structured markdown document with activation triggers, that load into context selectively based on what the agent is doing. [Source](../raw/deep/repos/affaan-m-everything-claude-code.md)

The Agentic Context Engine (ACE) and Acontext push this further: agents learn from execution traces and distill learned patterns into skill files that persist across sessions. The Skillbook pattern (ACE) and skill memory layer (Acontext) represent context engineering where the context assembly function itself improves over time. ACE reports doubling pass^4 consistency on the Tau2 airline benchmark with 15 learned strategies and no reward signals — self-reported, not independently validated. [Source](../raw/repos/kayba-ai-agentic-context-engine.md)

The skill-as-memory pattern is architecturally significant because it makes memory human-readable and editable. Unlike vector database embeddings, skill files are inspectable markdown. An operator can read what the agent has learned, correct misconceptions, and delete outdated patterns. [Source](../raw/repos/memodb-io-acontext.md)

### Progressive Disclosure

[Progressive disclosure](../concepts/progressive-disclosure.md) is a context engineering strategy where agents access knowledge incrementally through tool calls rather than loading everything upfront. Acontext implements this explicitly: agents call `get_skill` and `get_skill_file` tools to fetch specific skill content on demand, with retrieval governed by reasoning rather than semantic search. This avoids polluting the context window with potentially irrelevant knowledge. [Source](../raw/repos/memodb-io-acontext.md)

This pattern contrasts with eager loading (load all relevant context before the agent starts) and is most appropriate when the relevant knowledge space is large relative to the context window and the agent can reason about what it needs.

### Context Budget Management

Treating the context window as a budget to allocate — rather than a space to fill — changes engineering decisions. The [Everything Claude Code](../projects/claude-code.md) documentation is explicit: ~10K for system prompts, ~5-8K for rules, ~2-5K per MCP tool definition, with agents avoiding the final 20% of context during large operations to prevent truncation failures. [Source](../raw/deep/repos/affaan-m-everything-claude-code.md)

Budget management decisions include:
- Selective tool loading (not all tools loaded for all tasks)
- Retrieval k limits (more retrieved documents is not always better)
- Memory compression (summarize old conversation before new turns)
- Instruction hierarchy (which rules are always resident vs. loaded on demand)

## Failure Modes

**Retrieval poisoning:** Irrelevant retrieved documents don't just waste tokens — they actively mislead the model. A retrieval system returning plausible-but-wrong documents can produce confident hallucinations that the model would not have generated from parametric knowledge alone. The context engineering response is reranking, confidence scoring, and source attribution.

**Lost in the middle:** Information positioned in the middle of long contexts receives less model attention than content at the beginning or end. This is empirically documented across multiple models — see [Lost in the Middle](../concepts/lost-in-the-middle.md). The engineering implication: don't assume equal access across all positions. Critical information should appear early or late.

**Context staleness in multi-agent systems:** When multiple agents share a workspace, each agent's context snapshot can become stale before the agent acts on it. An agent that reads shared state at turn 1 and writes based on that state at turn 10 may be operating on state that other agents have already modified. [Multi-agent systems](../concepts/multi-agent-systems.md) require explicit state synchronization — a problem context engineering does not solve automatically.

**Compression information loss:** Aggressive context compression can eliminate critical details. Summarization of past conversation may discard the specific error message that explains a current failure. The failure mode is silent: the model doesn't know what was lost and cannot flag it. Detection requires evaluation against ground-truth tasks, not intuition.

**Skill overlap and conflict:** When multiple context components provide conflicting guidance — two skill files recommending different approaches to the same problem, or retrieved content contradicting instruction context — the model may resolve the conflict unpredictably. At scale (156 skills in Everything Claude Code), overlap becomes likely without active governance. [Source](../raw/deep/repos/affaan-m-everything-claude-code.md)

**Assembly function opacity:** Dynamic context assembly is difficult to debug because the assembled context at inference time is often not logged. When an agent produces a wrong answer, diagnosing whether the failure was in retrieval, assembly, or generation requires tools that most production systems don't have. [Observability](../concepts/observability.md) for context assembly is underdeveloped.

## Relationship to Adjacent Concepts

Context engineering sits at the intersection of several overlapping disciplines:

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is a specific implementation of dynamic c_know assembly. It is one component of context engineering, not a synonym for it.

[Agent Memory](../concepts/agent-memory.md) addresses the c_mem component — how agents persist and retrieve information across sessions. Memory systems are context engineering infrastructure.

[Prompt Optimization](../concepts/prompt-optimization.md) (as in DSPy's approach) automates the optimization of c_instr, treating instruction templates as learnable parameters. This is context engineering applied specifically to the instruction component.

[Chain-of-Thought](../concepts/chain-of-thought.md) is a context manipulation technique that instructs the model to build its reasoning in the context window, making intermediate steps available for subsequent generation.

[Cognitive Architecture](../concepts/cognitive-architecture.md) describes how agents are structured at a higher level — context engineering is one implementation layer within that architecture.

[Context Management](../concepts/context-management.md) is the operational aspect: monitoring, compressing, and refreshing context within a running session.

## Who Implements It

The discipline spans:

- **Coding assistants:** [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), [GitHub Copilot](../projects/github-copilot.md) — each implements context engineering for code-centric workflows, with heavy emphasis on project-level context files and selective tool loading
- **Memory systems:** [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), [Letta](../projects/letta.md), [MemGPT](../projects/memgpt.md) — specialize in c_mem assembly and retrieval
- **RAG frameworks:** [LlamaIndex](../projects/llamaindex.md), [LangChain](../projects/langchain.md) — provide tooling for c_know assembly pipelines
- **Orchestration:** [LangGraph](../projects/langgraph.md), [AutoGen](../projects/autogen.md) — manage context across multi-agent coordination
- **Model providers:** [Anthropic](../projects/anthropic.md), [Gemini](../projects/gemini.md), [OpenAI](../projects/openai.md) — implement context at the model level (attention architectures, context window sizes, positional encoding schemes)

## Unresolved Questions

**When to retrieve vs. rely on parametric knowledge:** Current systems use retrieval as default for any relevant corpus. But for well-represented domains in training data, retrieval may add noise rather than signal. No reliable decision procedure exists for this choice.

**Optimal context ordering:** The lost-in-the-middle phenomenon suggests ordering matters, but optimal ordering is task-dependent and not well-characterized. Most systems use fixed ordering conventions without empirical justification.

**Cross-session context continuity:** For long-running agents across many sessions, how to compress and selectively carry forward context without losing critical information is unsolved. Memory systems address this partially but benchmark evidence for production quality is thin.

**Multi-agent context consistency:** Shared state across concurrent agents requires synchronization mechanisms that most frameworks don't provide. The failure mode (agents acting on stale state) is silent and hard to detect.

**Cost of context at scale:** Running production systems with large context windows across millions of queries is expensive. Compression techniques offer savings but with quality tradeoffs that are hard to quantify without domain-specific evaluation. Most reported compression ratios come from single-corpus benchmarks that may not generalize.

## When Not to Rely on Context Engineering Alone

Context engineering cannot compensate for fundamental model capability gaps. If a model lacks the reasoning capability to solve a problem class, providing more information in context doesn't help. The asymmetry finding applies to reasoning quality, not reasoning capability.

For tasks requiring precise long-term memory over months of interaction, retrieval-based context engineering degrades as the information space grows. Fine-tuning or continual learning approaches may be more appropriate than retrieval at extreme scales.

For latency-critical applications, dynamic context assembly (especially multi-step agentic RAG) introduces overhead that may be unacceptable. Simpler static context with careful design may outperform more sophisticated dynamic assembly when response time matters more than coverage.

## Alternatives and Related Approaches

- **Fine-tuning:** Bakes knowledge into model weights rather than providing it in context. Higher upfront cost, lower inference cost, inflexible to updates. Use when knowledge is stable, domain is narrow, and inference volume is high.
- **Tool use / function calling:** Defers knowledge retrieval to runtime tool calls rather than pre-loading into context. Reduces context pressure but adds latency and requires reliable tool infrastructure.
- **[Continual Learning](../concepts/continual-learning.md):** Updates model weights incrementally rather than managing external context. Addresses the staleness problem differently but risks catastrophic forgetting.
- **Smaller, specialized models:** Domain-specific fine-tuned models may outperform general models with elaborate context engineering in narrow domains, with lower context overhead.

The practical selection criterion: context engineering is the right default for general-purpose agents operating across changing knowledge domains. Specialized systems with stable, high-volume, narrow use cases should evaluate fine-tuning economics explicitly.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.8)
- [Agent Memory](../concepts/agent-memory.md) — part_of (0.8)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.6)
- [Anthropic](../projects/anthropic.md) — implements (0.8)
- [Claude](../projects/claude.md) — implements (0.8)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.7)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — part_of (0.7)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.7)
- [Cursor](../projects/cursor.md) — implements (0.7)
- [AutoResearch](../projects/autoresearch.md) — implements (0.6)
- [Knowledge Graph](../concepts/knowledge-graph.md) — implements (0.6)
- [OpenAI Codex](../projects/codex.md) — part_of (0.5)
- [Agent Skills](../concepts/agent-skills.md) — part_of (0.7)
- [ReAct](../concepts/react.md) — implements (0.5)
- [LangChain](../projects/langchain.md) — implements (0.5)
- [Continual Learning](../concepts/continual-learning.md) — implements (0.6)
- [LangGraph](../projects/langgraph.md) — implements (0.5)
- [Cognitive Architecture](../concepts/cognitive-architecture.md) — part_of (0.6)
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — implements (0.4)
- [Gemini](../projects/gemini.md) — implements (0.4)
- [Context Management](../concepts/context-management.md) — implements (0.8)
- [Chain-of-Thought](../concepts/chain-of-thought.md) — implements (0.7)
- [OpenClaw](../projects/openclaw.md) — implements (0.5)

---
entity_id: context-engineering
type: concept
bucket: context-engineering
abstract: >-
  Context engineering is the discipline of designing and optimizing what goes
  into an LLM's context window; it supersedes prompt engineering by treating
  context as a structured, dynamically assembled information payload rather than
  a static string.
sources:
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - repos/memodb-io-acontext.md
  - repos/agenticnotetaking-arscontexta.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - repos/safishamsi-graphify.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/topoteretes-cognee.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/aiming-lab-agent0.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
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
  - openai
  - gemini
  - context-management
  - chain-of-thought
  - openclaw
  - react
  - langchain
  - continual-learning
  - langgraph
  - cognitive-architecture
  - reinforcement-learning
  - short-term-memory
  - observability
  - antigravity
  - abductive-context
  - tool-integrated-reasoning
last_compiled: '2026-04-08T02:39:17.502Z'
---
# Context Engineering

## What It Is

Context engineering is the practice of deliberately designing, assembling, and managing the information payload presented to a large language model. The term was popularized by [Andrej Karpathy](../concepts/andrej-karpathy.md) in 2025, who argued that "prompt engineering" had become a misnomer — the real work was not crafting clever phrasing but deciding *what information* to put in the context window and *how to structure it*.

The core insight: LLMs cannot access information outside their context window during inference. Every decision about what to include, exclude, compress, or retrieve directly shapes what the model can do. Context engineering makes those decisions explicit and systematic.

A survey by Mei et al. formalizes this as an optimization problem [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md):

**C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)**

The goal is finding assembly functions **A** that maximize expected task reward, subject to the hard constraint **|C| ≤ L_max** (the context window limit). Every system prompt, RAG pipeline, and memory layer is, in this framing, making an allocation decision about finite context budget.

## Why It Matters

Finite context creates zero-sum tradeoffs. Adding more tool definitions crowds out retrieved knowledge. Verbose system instructions leave less room for conversation history. At 200K tokens, a project like [Claude Code](../projects/claude-code.md) must budget roughly 10K for system prompts, 5–8K for rules, and 2–5K per MCP tool — leaving the remainder for actual work. These decisions compound across every inference call.

The asymmetry finding from the Mei et al. survey is the most practically significant result in the field: LLMs are substantially better at *understanding* complex, information-rich contexts than at *generating* equivalently sophisticated outputs from sparse ones. The implication is direct — invest in richer context assembly rather than expecting better generation to compensate for poor inputs.

## Six Components of Context

The Mei et al. taxonomy decomposes context into six components, each with distinct engineering concerns:

**c_instr — Instructions**: System prompts, behavioral rules, and constraints. These are permanent residents of the context window. Files like [CLAUDE.md](../concepts/claude-md.md) are a practical manifestation — a persistent instruction layer that shapes agent behavior across sessions.

**c_know — External Knowledge**: Retrieved documents, knowledge graph nodes, search results. This is the domain of [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md). The core question is information density: retrieved text should be maximally informative for the query (maximizing mutual information I(Y*; c_know | c_query)) rather than merely topically related.

**c_tools — Tool Definitions**: Function signatures, API schemas, capability declarations. Each MCP tool costs 2–5K tokens. Tool proliferation is a silent context budget drain. [Model Context Protocol](../concepts/model-context-protocol.md) standardizes this component.

**c_mem — Memory**: Persistent information from prior interactions. [Agent Memory](../concepts/agent-memory.md) architectures address this — from simple conversation summaries to tiered hierarchies with episodic, semantic, and procedural layers. [Short-Term Memory](../concepts/short-term-memory.md) fits within a single context window; longer-horizon memory requires explicit retrieval.

**c_state — Dynamic State**: Current world state, user context, multi-agent coordination signals. In [Multi-Agent Systems](../concepts/multi-agent-systems.md), this component carries inter-agent messages and shared workspace state.

**c_query — The Request**: The immediate user input. This is the component most practitioners over-optimize (via prompt engineering) relative to the others.

## How Context Gets Assembled

### Retrieval

Static retrieval (retrieve once, generate once) is the simplest pattern. [RAG](../concepts/retrieval-augmented-generation.md) systems fetch documents based on query similarity, inject them as c_know, and generate. The failure mode is well-documented: retrieval finds topically similar documents but misses multi-hop reasoning chains — information synthesized across documents rather than contained within any single one.

Graph-enhanced retrieval addresses this. Tools like [Graphify](../raw/repos/safishamsi-graphify.md) build knowledge graphs from heterogeneous sources (code, papers, images, documents), then answer queries by traversing relationships rather than matching text. The reported token reduction — 71.5× fewer tokens per query on a 52-file corpus versus raw file retrieval — reflects the compression achievable when structure replaces verbatim content. (This benchmark is self-reported by the Graphify project; independent validation is not available.) [GraphRAG](../projects/graphrag.md), [HippoRAG](../projects/hipporag.md), and [RAPTOR](../projects/raptor.md) each take different approaches to graph-based retrieval.

Agentic retrieval lets the model decide *when* and *what* to retrieve. Self-RAG and similar approaches treat retrieval as a tool call rather than a preprocessing step. This enables multi-hop retrieval (retrieve → reason → retrieve again) but introduces latency and makes the retrieval trace harder to debug.

### Compression

Raw retrieved content is often verbose. Context compression reduces token count while preserving information relevant to the task. Techniques range from extractive summarization (keep the most relevant sentences) to abstractive compression (rewrite at higher density) to learned compression (train a smaller model to produce compact representations). The Mei et al. survey documents 4–8× compression ratios with moderate information loss in current approaches; the practical ceiling depends heavily on content type and task specificity.

Compression interacts with the lost-in-the-middle problem. Research documented in [Lost in the Middle](../concepts/lost-in-the-middle.md) shows that LLMs attend disproportionately to the beginning and end of long contexts, with degraded performance for information placed in the middle. Compression that re-orders information to place the most relevant content at context boundaries can partially compensate.

### Progressive Disclosure

Rather than front-loading all potentially relevant information, [Progressive Disclosure](../concepts/progressive-disclosure.md) gives agents tools to fetch more context on demand. [Acontext](../raw/repos/memodb-io-acontext.md) exemplifies this with its `get_skill` and `get_skill_file` tools: agents retrieve specific skill files when needed rather than receiving all skills upfront. This keeps baseline context lean while preserving access to the full knowledge base.

[Agent Workflow Memory](../projects/agent-workflow-memory.md) and similar projects store learned workflows as retrievable files. The pattern appears across the ecosystem: [Claude Code](../projects/claude-code.md) loads skills based on detected context rather than injecting all 156 skills at session start [Source](../raw/deep/repos/affaan-m-everything-claude-code.md).

### Dynamic Assembly

Context assembly functions A() range from static (always include the same system prompt) to fully dynamic (the agent decides what to retrieve, summarize, and include based on the current task). [LangChain](../projects/langchain.md) and [LangGraph](../projects/langgraph.md) provide composable primitives for building assembly pipelines. [DSPy](../projects/dspy.md) takes this further, treating prompt and assembly logic as learnable parameters that can be optimized end-to-end.

## Memory as Context Engineering

Memory systems are context engineering in operation: they solve the problem of what to carry forward across sessions when nothing persists between inference calls.

[MemGPT](../projects/memgpt.md) (now [Letta](../projects/letta.md)) pioneered the virtual context window architecture — treating the LLM as a CPU with limited registers, backed by external storage. When context fills, the agent explicitly moves information out to storage and retrieves it later. This makes memory management legible: the agent knows it has external storage, knows how to query it, and controls what enters and leaves its working context.

More recent systems like [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), and [Graphiti](../projects/graphiti.md) automate extraction — identifying which parts of a conversation are worth remembering, structuring them, and making them retrievable. The Acontext project [Source](../raw/repos/memodb-io-acontext.md) takes a different position: memory should be stored as human-readable skill files rather than opaque vector embeddings, making it inspectable, editable, and portable across frameworks.

[Agent Memory](../concepts/agent-memory.md) distinguishes four memory types that map onto different context engineering strategies:

- **[Short-Term Memory](../concepts/short-term-memory.md)**: The current context window — managed by compression and pruning
- **[Episodic Memory](../concepts/episodic-memory.md)**: Specific past events, retrievable by time or similarity
- **[Semantic Memory](../concepts/semantic-memory.md)**: General knowledge, typically stored in vector databases or knowledge graphs
- **[Procedural Memory](../concepts/procedural-memory.md)**: How to do things — skills, workflows, strategies

## Learning as Context Engineering

The Agentic Context Engine (ACE) demonstrates that context engineering can improve over time [Source](../raw/repos/kayba-ai-agentic-context-engine.md). ACE's Skillbook accumulates strategies extracted from execution traces: a Reflector analyzes what worked and failed, a SkillManager updates the Skillbook, and future agent calls receive relevant strategies injected into context. The reported result — doubling pass^4 consistency on the Tau2 airline benchmark with 15 learned strategies and no reward signals — suggests that structured context injection of learned strategies can produce meaningful performance gains without fine-tuning. (This is self-reported; peer review is pending.)

[Everything Claude Code](../raw/deep/repos/affaan-m-everything-claude-code.md) implements a similar pattern with its Instinct system: PreToolUse and PostToolUse hooks capture every tool call with 100% reliability, a background Observer Agent analyzes patterns every 5 minutes, and detected patterns become atomic instincts with confidence scores. Instincts above the auto-approve threshold (0.7) apply automatically in future sessions.

Both systems treat context engineering as a feedback loop rather than a one-time design decision. Context content improves as the agent accumulates evidence about what works.

## Implementation Patterns

### Skill Files

Skills as context is a recurring pattern. A skill file is a structured markdown document describing when to apply a technique, how it works, and examples. Skills load selectively — only the skills relevant to the current task enter the context window. This is the architecture used by [Everything Claude Code](../raw/deep/repos/affaan-m-everything-claude-code.md) (156 skills across 12 language ecosystems), [Acontext](../raw/repos/memodb-io-acontext.md), and [ACE](../raw/repos/kayba-ai-agentic-context-engine.md).

The advantage over vector search: skill selection is explicit and auditable. The agent or system knows exactly which skills are loaded. The disadvantage: skill selection requires either accurate metadata or a secondary retrieval step; it doesn't handle the case where the relevant skill is not yet written.

### Context Budgeting

Explicit budget allocation — treating token slots as a resource to be allocated across components — is the operational form of the formal optimization framework. Practical implementations:

- Reserve fixed slots for persistent instructions (c_instr)
- Cap tool definitions (c_tools) at a maximum count
- Allocate remaining budget dynamically between retrieved knowledge (c_know) and memory (c_mem) based on query type
- Trigger compression when the running context approaches a threshold (often 75–80% of window size)

[Everything Claude Code](../raw/deep/repos/affaan-m-everything-claude-code.md) explicitly avoids the final 20% of context windows during large refactorings to prevent truncation failures — a practical guard against the degraded performance that occurs when context is abruptly cut.

### Reasoning Traces as Context

[Chain-of-Thought](../concepts/chain-of-thought.md) puts the model's reasoning in the context window, making intermediate steps available for subsequent inference. [ReAct](../concepts/react.md) interleaves reasoning and action, with tool outputs becoming part of the context that shapes subsequent reasoning. These patterns treat the generation process itself as a context engineering problem: each token generated becomes context for the next.

[Reflexion](../concepts/reflexion.md) extends this to multi-attempt tasks: the agent's reflection on a failed attempt becomes context for the next attempt, injecting structured self-critique rather than simply retrying.

## Who Implements It

**Coding agents**: [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), [GitHub Copilot](../projects/github-copilot.md), and [OpenAI Codex](../projects/codex.md) all implement context engineering for code tasks — injecting relevant files, project structure, and coding conventions based on the current editing context.

**RAG frameworks**: [LlamaIndex](../projects/llamaindex.md), [LangChain](../projects/langchain.md), and [LangGraph](../projects/langgraph.md) provide primitives for retrieval-augmented context assembly.

**Memory systems**: [Mem0](../projects/mem0.md), [Zep](../projects/zep.md), [Letta](../projects/letta.md), and [Graphiti](../projects/graphiti.md) handle the memory component of context — extracting, storing, and retrieving information across sessions.

**Research agents**: [AutoResearch](../projects/autoresearch.md) and similar projects manage context across long multi-step research tasks, balancing retrieved literature against accumulated findings.

**Multi-agent systems**: [AutoGen](../projects/autogen.md), [CrewAI](../projects/crewai.md), and [MetaGPT](../projects/metagpt.md) must manage context across agent boundaries — deciding what each agent needs to know and how inter-agent messages enter individual agent contexts.

## Failure Modes

**Context pollution**: Injecting too much marginally-relevant information degrades performance. Retrieval systems that optimize for recall over precision flood the context with noise. The model cannot reliably identify which retrieved documents are relevant; it attends to all of them to varying degrees.

**Lost in the middle**: Long contexts suffer from positional bias. Information placed in the middle of a 100K+ token context is retrieved and utilized less reliably than information at the edges. This affects any system that injects large retrieved documents without attention to ordering.

**Silent context overflow**: When context exceeds the window limit, content is typically truncated silently. Without explicit budget management, late-conversation context may simply drop earlier content — including system instructions or prior tool results. The failure mode is subtle: the model continues generating but without information it appeared to have received.

**Memory staleness**: Retrieved memory may be outdated. A system that injects facts from 6 months ago without timestamps gives the model no mechanism to discount stale information. [Temporal Reasoning](../concepts/temporal-reasoning.md) in memory systems remains an open problem.

**Assembly brittleness**: Context assembly pipelines with many components fail in non-obvious ways. A retrieval failure, a compression artifact, or a changed tool definition can alter context in ways that are hard to debug from model output alone. [Observability](../concepts/observability.md) tooling for context assembly — logging exactly what entered the context window for each inference call — is underbuilt relative to the complexity of production assembly pipelines.

**Over-engineering**: The gap between what context engineering can do and what a given task requires is often large. Many production applications benefit from a well-crafted system prompt and simple retrieval. The impulse to build elaborate assembly pipelines before establishing simpler baselines wastes engineering effort and introduces unnecessary failure modes.

## Unresolved Questions

**Optimal compression ratios**: Current research documents 4–8× compression ratios with moderate information loss, but "moderate" is task-dependent and poorly characterized. When does compression cross the threshold from acceptable to task-degrading? No reliable answer exists.

**Cross-agent context coordination**: Multi-agent systems must share context across agents without each agent receiving the full shared context (cost) or receiving too little (coordination failure). The right abstraction for shared agent context is unsettled.

**Dynamic vs. static assembly**: When does the overhead of dynamic, agent-controlled retrieval justify the capability gains over static assembly? The survey acknowledges this as an open question; practitioners make the decision based on intuition.

**Evaluation**: Existing benchmarks test end-to-end task performance, not context assembly quality specifically. A context engineering intervention that improves retrieval but worsens generation can look like a net neutral on task metrics. Attribution of performance changes to specific assembly decisions is difficult.

**Cost at scale**: Dynamic context assembly with graph retrieval, compression, and memory integration adds inference latency and cost. The economic analysis of context engineering at production scale — when richer context justifies the overhead — is rarely published.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md): The memory component of context engineering
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): The external knowledge component
- [Context Compression](../concepts/context-compression.md): Techniques for reducing context size
- [Context Management](../concepts/context-management.md): Runtime management of context window state
- [Chain-of-Thought](../concepts/chain-of-thought.md): Reasoning traces as context
- [ReAct](../concepts/react.md): Interleaved reasoning and action patterns
- [Progressive Disclosure](../concepts/progressive-disclosure.md): On-demand context retrieval
- [Cognitive Architecture](../concepts/cognitive-architecture.md): System-level frameworks that use context engineering
- [Multi-Agent Systems](../concepts/multi-agent-systems.md): Context engineering across agent boundaries
- [CLAUDE.md](../concepts/claude-md.md): Persistent instruction layer pattern

---
entity_id: gpt-4o
type: project
bucket: agent-architecture
abstract: >-
  GPT-4o is OpenAI's multimodal flagship model combining text, image, and audio
  in a single architecture, widely used as an agent backbone due to low latency
  and strong instruction-following.
sources:
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/vectifyai-pageindex.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
related:
  - gpt-4
last_compiled: '2026-04-08T23:27:13.069Z'
---
# GPT-4o

## What It Is

GPT-4o ("omni") is OpenAI's multimodal model released in May 2024. Unlike GPT-4 Vision, which bolted image understanding onto a text model, GPT-4o processes text, images, and audio natively in a single model. The "omni" designation reflects this architectural unification: one model handles all three modalities end-to-end rather than routing inputs through separate pipelines.

For agent infrastructure, GPT-4o functions as the dominant general-purpose backbone. It appears as the default model in most agentic benchmarks and frameworks — [A-MEM](../raw/deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md) runs all primary evaluations on GPT-4o and GPT-4o-mini, [PageIndex](../raw/deep/repos/vectifyai-pageindex.md) defaults to `gpt-4o-2024-11-20` for indexing, and [Agent Workflow Memory](../raw/deep/repos/zorazrw-agent-workflow-memory.md) uses GPT-4 (the predecessor generation) for its WebArena evaluations. This ubiquity makes GPT-4o the de facto baseline against which agent memory and retrieval systems are measured.

## Architecture

OpenAI has disclosed limited architectural details. Key published characteristics:

- **Single unified model** across text, vision, and audio — not an ensemble
- **Reduced latency**: GPT-4o runs approximately 2x faster than GPT-4 Turbo at roughly half the price
- **128K context window** — matches GPT-4 Turbo
- **Structured output support**: native JSON mode and function calling with schema enforcement
- **Tool use**: parallel function calling, allowing agents to dispatch multiple tool calls in one inference step

The model family includes **GPT-4o-mini**, a smaller distilled variant optimized for throughput and cost, and several dated snapshot versions (e.g., `gpt-4o-2024-11-20`, `gpt-4o-2024-08-06`) that provide API stability. OpenAI does not publish parameter counts.

## Key Numbers

**Pricing** (as of mid-2025, subject to change):
- GPT-4o: ~$2.50/M input tokens, ~$10/M output tokens
- GPT-4o-mini: ~$0.15/M input tokens, ~$0.60/M output tokens

**Benchmark performance** (self-reported by OpenAI unless noted):
- MMLU: 88.7% (5-shot)
- HumanEval: 90.2%
- MATH: 76.6%
- GPT-4o-mini on LoCoMo multi-hop: 18.41 F1 baseline, improving to 45.85 with A-MEM scaffolding — a 2.5x lift from memory architecture alone, not model capability ([Source](../raw/deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md))

Most headline benchmarks are self-reported. Independent replication of MMLU and HumanEval scores is generally consistent with third-party evaluations, but the figures appear in OpenAI's own release materials. SWE-bench performance for agentic coding tasks is documented by third parties but varies significantly with scaffolding.

## Strengths

**Instruction following at scale.** GPT-4o maintains coherent behavior across long, multi-step instructions — a property that makes it reliable for [ReAct](../concepts/react.md)-style agent loops where the model must simultaneously reason, select tools, and format outputs correctly.

**Function calling reliability.** Parallel function calling with structured output enforcement reduces agent scaffolding complexity. The model reliably emits valid JSON conforming to provided schemas, which matters for systems like [LangGraph](../projects/langgraph.md) and [OpenAI Agents SDK](../projects/openai-agents-sdk.md) that parse model outputs programmatically.

**Multimodal agent tasks.** The native vision capability enables agents to process screenshots, UI elements, and charts without routing to a separate model. WebArena-style tasks that require reading rendered web pages benefit directly from this.

**Ecosystem coverage.** Every major agent framework — [LangChain](../projects/langchain.md), [LlamaIndex](../projects/llamaindex.md), [AutoGen](../projects/autogen.md), [CrewAI](../projects/crewai.md), [DSPy](../projects/dspy.md) — supports GPT-4o as a first-class model. Integration friction is minimal.

**Memory scaffolding amplification.** The A-MEM results reveal that GPT-4o's multi-hop reasoning improves more dramatically from good memory architecture than smaller models do in absolute terms — 334% improvement on multi-hop F1 with GPT-4o vs. 149% with GPT-4o-mini. The model can exploit structured memory better when it has the capacity to reason across retrieved links.

## Critical Limitations

**Concrete failure mode — context position sensitivity.** GPT-4o exhibits the [Lost in the Middle](../concepts/lost-in-the-middle.md) failure mode: when relevant information appears in the middle of a long context window, retrieval accuracy degrades substantially compared to information at the beginning or end. For agent systems that inject large memory payloads or tool outputs mid-context, this means the model may ignore relevant retrieved facts even when they fit within the 128K limit. The PageIndex architecture ([Source](../raw/deep/repos/vectifyai-pageindex.md)) partially addresses this by forcing the model to reason over a compact tree structure rather than scanning dense retrieved text — the design assumes GPT-4o reasons better over short structured input than long unstructured retrieval dumps.

**Unspoken infrastructure assumption.** GPT-4o is an API-only model. Every call traverses OpenAI's infrastructure, which means: (1) latency is network-dependent and non-deterministic, (2) data leaves your infrastructure, (3) rate limits apply across your organization's usage, and (4) model behavior can change between snapshot versions. Agent systems that require sub-100ms tool-call round trips, air-gapped deployment, or strict reproducibility across months cannot use GPT-4o without significant architectural workarounds.

## When NOT to Use It

**Cost-sensitive high-volume inference.** For agent loops that make dozens of model calls per task, GPT-4o's per-token pricing becomes significant. The A-MEM paper uses GPT-4o-mini as its primary evaluation model specifically because it enables higher-volume testing. If your agent runs 50+ LLM calls per user task, GPT-4o-mini or open-weight models via [vLLM](../projects/vllm.md) or [Ollama](../projects/ollama.md) are often better choices.

**Air-gapped or regulated environments.** Healthcare, finance, and government contexts with strict data residency requirements cannot route inference through OpenAI's API. Open-weight alternatives ([Qwen](../projects/qwen.md), Llama) run locally.

**Fine-tuning for specialized domains.** GPT-4o supports fine-tuning, but it is expensive and the base model cannot be fully customized. When a task domain is narrow and well-defined — legal clause extraction, medical entity recognition — fine-tuned smaller models often outperform GPT-4o at a fraction of the inference cost.

**Latency-critical agent loops.** Real-time interactive agents (voice, gaming, live monitoring) with <200ms response requirements are poorly served by an API model with variable network latency. OpenAI's Realtime API improves this for audio but does not eliminate the network dependency.

**When [Continual Learning](../concepts/continual-learning.md) is required.** GPT-4o's weights are frozen. It cannot update based on deployment experience. Agent systems that need to learn from interaction history at the model level — rather than the [Memory Evolution](../concepts/memory-evolution.md) level — require fine-tunable models.

## Unresolved Questions

**Behavior across snapshot versions.** OpenAI rolls out updated snapshots (e.g., `gpt-4o-2024-11-20`) with undisclosed changes. Production systems pinned to a snapshot version will eventually face deprecation with no clear documentation of behavioral differences. How much does task-specific performance vary across snapshots? The company does not publish this.

**True multi-modal architecture.** OpenAI has not disclosed whether audio, vision, and text share weights throughout the network or only at input/output projections. The architectural difference matters for reasoning: a fully unified representation would generalize across modalities differently than modality-specific encoders feeding a shared language backbone.

**Rate limit behavior at scale.** Published rate limits are tier-based, but actual behavior under burst load — particularly for long-context requests from many parallel agent workers — is not documented in detail. Multi-agent systems using [AutoGen](../projects/autogen.md) or [LangGraph](../projects/langgraph.md) with many concurrent agents hitting GPT-4o can encounter rate limiting in non-obvious ways.

**Reasoning token economics.** OpenAI introduced "reasoning" modes (o1, o3) alongside GPT-4o. The boundary between when GPT-4o is sufficient and when a reasoning model is necessary is not empirically documented. For [Chain-of-Thought](../concepts/chain-of-thought.md)-heavy agent tasks, the cost-quality tradeoff between GPT-4o with explicit CoT prompting and o3-mini is underexplored in public benchmarks.

## Alternatives

**Use [Claude](../projects/claude.md) (Anthropic) when:** you need a 200K context window, stronger adherence to nuanced instructions across very long documents, or better out-of-box safety properties. Claude 3.5/3.7 Sonnet is GPT-4o's closest capability peer and often preferred for coding agent tasks (see [SWE-bench](../projects/swe-bench.md) leaderboard standings).

**Use [Gemini](../projects/gemini.md) when:** you need the largest available context window (1M+ tokens in Gemini 1.5 Pro), native Google ecosystem integration, or multimodal tasks involving video.

**Use [Qwen](../projects/qwen.md) or Llama variants via [Ollama](../projects/ollama.md)/[vLLM](../projects/vllm.md) when:** data residency requirements prohibit API calls, cost at scale is prohibitive, or you need model fine-tuning control. A-MEM's results show Qwen2.5-3b with structured memory scaffolding achieves competitive multi-hop performance at a fraction of GPT-4o's inference cost.

**Use GPT-4o-mini when:** you're running high-volume agent loops where per-call cost matters and the task complexity doesn't require full GPT-4o capability. A-MEM's benchmark results show GPT-4o-mini with strong memory scaffolding often closes most of the gap with GPT-4o on structured retrieval tasks.

**Use o3/o3-mini when:** the task requires extended multi-step reasoning, mathematical proof, or complex planning where intermediate reasoning quality matters more than throughput.

## Role in Agent Infrastructure

GPT-4o occupies a specific position in the agent stack: it is the reasoning and generation layer, not the memory or retrieval layer. The consistent pattern across agent research is that GPT-4o's output quality is heavily determined by what reaches its context window. [Context Engineering](../concepts/context-engineering.md) — what to put in context, in what order, at what granularity — has larger effect on agent task success than model version differences within the GPT-4 family.

The A-MEM results make this concrete: the difference between 9.09 F1 and 39.41 F1 on multi-hop reasoning with GPT-4o is entirely memory architecture, not model capability. PageIndex's 98.7% on FinanceBench vs. ~31% for vanilla GPT-4o is the same pattern: the model is capable, but only when its context is structured correctly.

This means GPT-4o is best understood as a powerful but context-sensitive reasoning engine. Infrastructure decisions about [Agent Memory](../concepts/agent-memory.md), [Context Management](../concepts/context-management.md), and retrieval systems matter more than the marginal capability difference between GPT-4o snapshots.

## Related Concepts and Projects

- [GPT-4](../projects/gpt-4.md) — predecessor model GPT-4o supersedes for most tasks
- [Context Engineering](../concepts/context-engineering.md) — the primary lever for improving GPT-4o agent performance
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — common deployment pattern using GPT-4o as backbone
- [OpenAI Agents SDK](../projects/openai-agents-sdk.md) — OpenAI's own framework for building GPT-4o-backed agents
- [Lost in the Middle](../concepts/lost-in-the-middle.md) — key failure mode for long-context GPT-4o usage
- [Chain-of-Thought](../concepts/chain-of-thought.md) — prompting technique that substantially improves GPT-4o reasoning on complex tasks
- [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), [AutoGen](../projects/autogen.md) — primary frameworks for GPT-4o-based agent construction

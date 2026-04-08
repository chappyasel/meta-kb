---
entity_id: gpt-4
type: project
bucket: agent-architecture
abstract: >-
  GPT-4 is OpenAI's flagship LLM family (GPT-4, GPT-4o, GPT-4o-mini, GPT-5)
  serving as the reasoning backbone for agent systems, distinguished by
  function-calling, vision, and large context windows.
sources:
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - repos/orchestra-research-ai-research-skills.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/microsoft-llmlingua.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - deep/repos/vectifyai-pageindex.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - retrieval-augmented-generation
  - episodic-memory
  - model-context-protocol
  - react
  - reflexion
  - grpo
  - reinforcement-learning
  - claude-code
  - claude
  - reflexion
  - grpo
  - reinforcement-learning
last_compiled: '2026-04-08T02:49:27.599Z'
---
# GPT-4

## What It Is

GPT-4 is [OpenAI](../projects/openai.md)'s family of large language models that serves as the reasoning core for most production agent systems. The family spans several generations and capability tiers: GPT-4 (the original, text-only reasoning model), GPT-4o (omni-modal, handling text, vision, and audio at lower latency), GPT-4o-mini (a cost-reduced variant for high-volume applications), and GPT-5 (the current frontier model, released in 2025). Each variant occupies a different position in the cost-capability tradeoff curve that governs agent system design.

In the agent infrastructure space, GPT-4 is not a standalone system but a substrate. Frameworks like [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), [AutoGen](../projects/autogen.md), and [OpenAI Agents SDK](../projects/openai-agents-sdk.md) orchestrate GPT-4 calls. Memory systems like [Mem0](../projects/mem0.md), [Letta](../projects/letta.md), and [Zep](../projects/zep.md) extend it with persistence. Code agents like [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), and [GitHub Copilot](../projects/github-copilot.md) use it as their primary reasoning engine.

## Architecture and Capabilities

OpenAI has not published GPT-4's architecture in detail. The technical report confirms it is a large multimodal Transformer trained with [Reinforcement Learning](../concepts/reinforcement-learning.md) from human feedback (RLHF), but does not disclose parameter counts, training data specifics, or internal architecture. What is publicly confirmed:

**Context windows.** GPT-4o supports 128K tokens of context. GPT-4 Turbo also offers 128K. GPT-4o-mini targets lower cost at the same window size. Larger context matters for agent systems because it allows entire codebases, long conversation histories, or multi-document retrieval results to fit without truncation.

**Function calling and structured output.** GPT-4 models support function/tool calling with JSON schema enforcement. This is the primary mechanism by which agents invoke external tools. The `tools` parameter accepts a list of function definitions; the model returns structured JSON that orchestration frameworks parse into actual function invocations. Parallel function calling (introduced in 2023) allows the model to request multiple tool calls in a single response, reducing round-trips in multi-tool workflows.

**Vision.** GPT-4o accepts image inputs alongside text. This enables agents to reason about screenshots, diagrams, charts, and UI states -- critical for web automation agents and coding assistants that need to interpret visual output.

**Instruction following and agentic reliability.** GPT-4-class models are substantially more reliable at following complex multi-step instructions than GPT-3.5. For agent systems, this matters because individual steps in a pipeline must execute correctly; compounding errors across 10-20 steps make instruction-following quality a first-order concern.

**Reasoning.** GPT-4o supports an internal chain-of-thought reasoning mode ("thinking") that increases accuracy on complex problems at the cost of latency and token spend. This is related to [Chain-of-Thought](../concepts/chain-of-thought.md) prompting but executed internally.

## Role in Agent Patterns

GPT-4 appears as the backbone in several documented agent architectures within this knowledge base:

**[ReAct](../concepts/react.md) and [Reflexion](../concepts/reflexion.md).** Both frameworks were benchmarked using GPT-4 and GPT-3.5. Reflexion achieves 91% pass@1 on HumanEval with GPT-4, versus 80.1% for GPT-4 without the self-reflection loop -- demonstrating that the agent framework provides value beyond the model alone. Crucially, Reflexion with weaker models (StarChat-beta) shows no improvement, confirming that verbal self-reflection is an emergent capability requiring GPT-4-class reasoning. [Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

**[Voyager](../projects/voyager.md).** The Voyager embodied agent relies on GPT-4 for curriculum generation, skill synthesis, and self-verification. Replacing GPT-4 with GPT-3.5 for code generation produces 5.7x fewer unique items discovered. The gap is not marginal -- it demonstrates that GPT-4's code quality is architecturally necessary for skill compounding to work. [Source](../raw/deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)

**[GEPA](../concepts/gepa.md).** The GEPA prompt optimizer uses GPT-4o-mini or GPT-5 as the task model being optimized, and a more capable reflection model (GPT-5, Claude) for the reflection/mutation step. The `reflection_lm` parameter is explicitly separated from the `model` parameter, encoding the insight that the model doing the reasoning and the model optimizing the reasoning can differ. GEPA results show GPT-4.1 Mini improving from 46.67% to 60% on AIME 2025 through prompt optimization, underscoring that model capability and prompt quality interact. [Source](../raw/deep/repos/gepa-ai-gepa.md)

**[A-MEM](../raw/deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md).** The A-MEM agentic memory system uses GPT-4o and GPT-4o-mini as the primary models. With GPT-4o-mini, A-MEM achieves 2.5x improvement on multi-hop reasoning (45.85 vs 18.41 F1). With GPT-4o, the multi-hop improvement is even larger (+334% F1). The open-domain regression observed with GPT-4o (-21%) suggests stronger models can sometimes use raw context more effectively than compressed memory representations -- a reminder that memory compression tradeoffs depend on model capability.

**[Model Context Protocol](../concepts/model-context-protocol.md).** MCP is an open standard for connecting LLMs to external tools and data sources. GPT-4 models are primary MCP clients in many implementations, using the protocol to access databases, file systems, and APIs. [PageIndex](../raw/deep/repos/vectifyai-pageindex.md)'s MCP server explicitly lists Claude, Cursor, and OpenAI Agents SDK as target MCP clients.

## Key Numbers

| Model | Context | Input price (per 1M tokens) | Output price (per 1M tokens) | Notes |
|---|---|---|---|---|
| GPT-4o | 128K | ~$2.50 | ~$10 | Multimodal, current production standard |
| GPT-4o-mini | 128K | ~$0.15 | ~$0.60 | High-volume, cost-sensitive applications |
| GPT-4 Turbo | 128K | ~$10 | ~$30 | Older, largely superseded |
| GPT-5 | 128K+ | Varies | Varies | Frontier; 2025 release |

Pricing as of mid-2025, subject to change. GPT-4o-mini is 15-20x cheaper than GPT-4o per token, which drives different architectural choices: route complex reasoning to GPT-4o, high-frequency classification or extraction to GPT-4o-mini.

**Benchmark performance (self-reported by OpenAI):** GPT-4 scored 90th percentile on the Uniform Bar Exam, 88th percentile on LSAT, and 99th percentile on GRE Quantitative at launch. GPT-4o achieves roughly equivalent performance on most benchmarks with lower latency. These figures are self-reported in OpenAI's technical report and should be treated as marketing-adjacent claims -- independent evaluations on third-party benchmarks show competitive but not uniformly superior performance versus Anthropic's Claude 3.5/3.7 and Google's Gemini 1.5/2.0 families.

**[SWE-bench](../projects/swe-bench.md):** GPT-4o-based agents (Claude Sonnet with OpenAI scaffolding) demonstrated ~30-40% resolution rates on SWE-bench Verified as of early 2025 with various scaffolding approaches. [Claude Code](../projects/claude-code.md) and specialized agents now push higher, but GPT-4o-based systems remain competitive. These are scaffolding-dependent and not directly comparable across different agent implementations.

## Strengths

**Instruction following at scale.** GPT-4 models reliably execute multi-step instructions across long contexts without losing track of constraints. This makes them viable for complex agent pipelines with 20+ steps.

**Code generation quality.** Voyager's ablation (5.7x fewer items with GPT-3.5) and Reflexion's HumanEval results (91% vs 80.1% baseline) both independently confirm GPT-4's code quality creates a meaningful capability floor for coding agents.

**Tool use and structured output.** Function calling with JSON schema enforcement is robust across diverse tool definitions. Production agent systems depend on this for reliable tool invocation.

**Ecosystem.** Nearly every agent framework, memory system, and evaluation harness in this knowledge base supports GPT-4 as a first-class backend. LiteLLM, LangChain, AutoGen, CrewAI, and LangGraph all treat OpenAI's API as the reference implementation.

**Self-reflection capability.** GPT-4-class models can generate quality self-analysis of failures. The Reflexion results demonstrate this concretely -- the capability is absent in weaker models and present in GPT-4+ models.

## Critical Limitations

**Proprietary black box.** Architecture, training data, and internal mechanisms are not disclosed. This creates a fundamental limitation for systems that need to understand why the model behaves a certain way. [Anthropic](../projects/anthropic.md) publishes more interpretability research than OpenAI; neither publishes sufficient detail to fully predict model behavior under distribution shift.

**Concrete failure mode -- context window doesn't mean context comprehension.** GPT-4o has a 128K token context window, but performance degrades on tasks requiring retrieval from the middle of long contexts -- the [Lost in the Middle](../concepts/lost-in-the-middle.md) phenomenon. Studies have shown that information at the beginning and end of long contexts is retrieved more reliably than information buried in the middle. For agent systems that stuff large codebases or document collections into context, this means effective context capacity is meaningfully lower than the nominal 128K limit. Solutions include [Context Compression](../concepts/context-compression.md), [RAG](../concepts/retrieval-augmented-generation.md), and careful ordering of context.

**Unspoken infrastructure assumption.** GPT-4-based agent systems implicitly assume OpenAI API availability, latency (~200-2000ms per call), and stable pricing. Agent pipelines with 10-50 sequential GPT-4 calls have end-to-end latencies of 2-100 seconds and costs that scale linearly with call count. Systems designed around GPT-4 are tightly coupled to OpenAI's pricing decisions and API changes. The November 2023 GPT-4 Turbo release and subsequent GPT-4o releases changed pricing by 3-10x, breaking cost assumptions in deployed systems.

## When NOT to Use It

**On-premise or air-gapped deployments.** GPT-4 is cloud-only. For security-sensitive environments (healthcare, finance, defense) requiring local inference, [Ollama](../projects/ollama.md) with open-source models or [vLLM](../projects/vllm.md) for self-hosted inference are the alternatives. GPT-4 cannot be self-hosted.

**Cost-sensitive high-volume pipelines.** For tasks that require millions of calls per day -- document classification, embedding generation, simple extraction -- GPT-4o-mini may still be too expensive. Open-source models via vLLM can reduce inference costs by 10-100x for appropriate tasks.

**Latency-critical real-time applications.** GPT-4o's median latency (~500-1500ms for typical requests) is too high for applications requiring sub-100ms responses. Edge inference with smaller models is the right choice for real-time requirements.

**Tasks where GPT-4 shows systematic failure.** Reflexion's WebShop results (zero improvement after 4 trials, vs. 97% task completion on AlfWorld) demonstrate that GPT-4's self-reflection cannot help on tasks requiring creative exploration rather than refinement. Systematic failure modes -- long-horizon planning, precise arithmetic without tool use, reliable factual recall on obscure topics -- are not solved by model scale alone.

**When model transparency matters.** For research on agent failure modes, interpretability, or auditing, [Claude](../projects/claude.md)'s more extensive published safety research and Anthropic's interpretability work provide more insight into model internals. GPT-4's opacity limits diagnosis of systematic failure modes.

## Unresolved Questions

**Rate limits and production scalability.** OpenAI's rate limits (tokens per minute, requests per minute) constrain high-throughput agent systems. The limits vary by tier, are not publicly documented in detail, and change without notice. Multi-agent systems with dozens of parallel GPT-4 calls hit these limits unpredictably. The documentation does not explain how to reliably architect for limit-hitting scenarios.

**Consistency across versions.** OpenAI updates GPT-4o continuously without version pinning in the default API. Agent systems built against one behavior can break when the model changes. The `gpt-4o-2024-11-20` style versioned endpoints exist but are eventually deprecated. Long-term behavior stability is not guaranteed.

**Cost at scale for multi-agent.** Running [Multi-Agent Systems](../concepts/multi-agent-systems.md) with multiple GPT-4o instances -- each consuming thousands of tokens per step across hundreds of steps -- produces costs that are difficult to estimate in advance. AutoGen, CrewAI, and MetaGPT all use GPT-4 as the default model, but published examples rarely report total token costs for full task completions. The operational cost of GPT-4-based multi-agent systems in production is systematically underreported in research papers.

**GPT-5 capability and pricing stability.** GPT-5's pricing and capability positioning relative to GPT-4o will determine whether current architecture decisions remain valid. Systems that use GPT-4o for high-complexity tasks and GPT-4o-mini for simple tasks may need re-routing as the model family evolves.

## Alternatives and Selection Guidance

| Alternative | When to Choose It |
|---|---|
| [Claude](../projects/claude.md) (Anthropic) | Long-context tasks, code editing, when constitutional AI safety properties matter, when you need 200K token context reliably |
| [Gemini](../projects/gemini.md) (Google) | Native multimodal tasks, Google ecosystem integration, cost-competitive for certain use cases |
| Llama 3 / Mistral via [Ollama](../projects/ollama.md) | Air-gapped deployments, cost-sensitive high-volume, when self-hosting is required |
| [vLLM](../projects/vllm.md) + open-source models | High-throughput production inference, fine-tuning on domain data, eliminating vendor dependency |
| [Claude Code](../projects/claude-code.md) | Coding-specific agent tasks; benchmarks show Claude 3.7 Sonnet competitive with or ahead of GPT-4o on SWE-bench |

**Use GPT-4o** when you need the best available instruction-following, tool use reliability, and multimodal capability with acceptable latency and cloud dependency.

**Use GPT-4o-mini** when GPT-4o is cost-prohibitive and the task does not require frontier reasoning -- high-frequency extraction, classification, simple generation.

**Use GPT-5** for tasks where GPT-4o fails -- complex multi-step reasoning, difficult math, tasks requiring deeper self-reflection. Budget accordingly; it is materially more expensive.

**Use open-source alternatives** when you need on-premise deployment, fine-tuning on proprietary data, or predictable per-token economics without dependency on OpenAI pricing decisions.

## Related Concepts

- [Chain-of-Thought](../concepts/chain-of-thought.md) -- Prompting technique that improves GPT-4 reasoning on complex tasks
- [ReAct](../concepts/react.md) -- Reasoning + acting pattern implemented on GPT-4
- [Reflexion](../concepts/reflexion.md) -- Self-reflection framework that extends GPT-4 with verbal reinforcement
- [GRPO](../concepts/grpo.md) -- RL training method used to improve reasoning models; [GEPA](../concepts/gepa.md) benchmarks against it
- [Reinforcement Learning](../concepts/reinforcement-learning.md) -- Training methodology underlying GPT-4's RLHF alignment
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) -- Standard pattern for extending GPT-4 with external knowledge
- [Episodic Memory](../concepts/episodic-memory.md) -- Memory pattern that Reflexion uses with GPT-4 to enable trial-and-error learning
- [Model Context Protocol](../concepts/model-context-protocol.md) -- Protocol enabling GPT-4 models to connect to external tools and data
- [Context Engineering](../concepts/context-engineering.md) -- Discipline for constructing effective inputs to GPT-4 and related models
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) -- Architectures where multiple GPT-4 instances coordinate

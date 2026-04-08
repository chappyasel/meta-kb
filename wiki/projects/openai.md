---
entity_id: openai
type: project
bucket: agent-architecture
abstract: >-
  OpenAI is the research company that built GPT-4, ChatGPT, and the OpenAI
  Agents SDK — differentiating itself through simultaneous frontier model
  development and production agent infrastructure used by millions of
  developers.
sources:
  - >-
    articles/developers-openai-com-self-evolving-agents-a-cookbook-for-autonomous-a.md
  - deep/papers/han-rag-vs-graphrag-a-systematic-evaluation-and-key.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/memorilabs-memori.md
  - repos/agent-on-the-fly-memento.md
  - repos/caviraoss-openmemory.md
  - repos/evoagentx-evoagentx.md
  - repos/greyhaven-ai-autocontext.md
  - repos/infiniflow-ragflow.md
  - repos/jackchen-me-open-multi-agent.md
  - repos/letta-ai-lettabot.md
  - repos/mem0ai-mem0.md
  - repos/memodb-io-acontext.md
  - repos/topoteretes-cognee.md
  - repos/transformeroptimus-superagi.md
  - repos/yusufkaraaslan-skill-seekers.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
related:
  - anthropic
  - retrieval-augmented-generation
  - claude
  - model-context-protocol
  - ollama
  - vector-database
  - openclaw
  - langchain
  - agent-memory
  - vllm
  - gemini
  - multi-agent-systems
  - abductive-context
  - episodic-memory
  - agent-skills
  - progressive-disclosure
  - locomo
  - gepa
  - continual-learning
  - crewai
  - github-copilot
  - community-detection
  - cognitive-architecture
  - reinforcement-learning
  - synthetic-data-generation
  - entity-extraction
  - deepseek
  - meta-agent
  - sqlalchemy
  - pydantic
  - postgresql
  - redis
  - faiss
  - qdrant
  - notion
  - groq
  - neo4j
  - chromadb
  - pinatone
  - mem0
  - human-in-the-loop
  - langgraph
  - andrej-karpathy
  - claude-code
last_compiled: '2026-04-08T22:55:09.504Z'
---
# OpenAI

## What It Is

OpenAI is a San Francisco-based AI research company founded in 2015 that produces foundation models (GPT-4, GPT-4o, o1, o3), consumer products (ChatGPT, DALL·E), developer infrastructure (Assistants API, OpenAI Agents SDK), and benchmark-driving research. Within the agent infrastructure space specifically, OpenAI occupies an unusual dual position: it ships the models that most agent frameworks use, and it ships its own agent orchestration layer that competes with those frameworks.

The company started as a nonprofit, converted to a "capped-profit" structure in 2019, and in 2025 completed a restructuring toward a standard for-profit public benefit corporation while retaining a nonprofit board. This transition is ongoing and contested — relevant because it affects governance over safety priorities and model release decisions. Microsoft holds a significant equity stake and exclusive Azure cloud partnership.

## Core Products Relevant to Agent Infrastructure

### Foundation Models

[GPT-4](../projects/gpt-4.md) and [GPT-4o](../projects/gpt-4o.md) are the models most agent frameworks default to. The `gpt-4.1-nano` and `gpt-4.1-mini` variants appear as defaults across third-party memory libraries including [Mem0](../projects/mem0.md) (`gpt-4.1-nano-2025-04-14`) and [Graphiti](../projects/graphiti.md) (`gpt-4.1-mini`), making OpenAI's pricing and API stability upstream dependencies for much of the ecosystem.

The o1/o3 reasoning model series implements chain-of-thought reasoning internally before producing output, making them suitable for multi-step agent tasks but expensive for high-frequency operations like memory extraction.

### Structured Output

OpenAI's structured output API (JSON schema enforcement over model responses) is a hard dependency for several agent memory systems. Graphiti's entity extraction and edge resolution pipelines use Pydantic structured output against OpenAI-compatible endpoints. Mem0's two-pass extraction-reconciliation pipeline relies on the LLM returning parseable JSON. This creates a quiet ecosystem constraint: systems designed around OpenAI's structured output may behave differently against providers that implement it less reliably.

### OpenAI Agents SDK

The [OpenAI Agents SDK](../projects/openai-agents-sdk.md) is OpenAI's first-party agent orchestration framework, released in 2024. It provides primitives for defining agents with tools, handoffs between agents, guardrails, and tracing. It competes directly with [LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md), and [CrewAI](../projects/crewai.md).

The SDK uses a `Runner` abstraction that manages the agent loop, tool execution, and handoff logic. Agents are defined with `instructions` (system prompt), `tools` (function-calling), and optional `handoffs` (delegation to other agents). The framework is notable for its simplicity relative to LangGraph's graph-based approach — it is intentionally less expressive but easier to reason about.

In the autocontext ecosystem runner, `--provider-b agent_sdk` is a recognized mode alongside `--provider-a anthropic`, used for A/B comparison of provider behavior under shared knowledge conditions. This positions the Agents SDK as a direct peer to Anthropic's API in production self-improvement harnesses.

### Codex and GitHub Copilot

[OpenAI Codex](../projects/codex.md) was OpenAI's code-specialized model that powered [GitHub Copilot](../projects/github-copilot.md) before being superseded by GPT-4-class models. GitHub Copilot, while not OpenAI-owned, was created using OpenAI models and represents the largest deployed application of OpenAI's code capabilities. The current Codex product (re-launched 2025) is a cloud-based coding agent.

### Embeddings

The `text-embedding-ada-002` and `text-embedding-3-*` models are default embedding choices across most of the agent infrastructure ecosystem. The RAG vs GraphRAG systematic evaluation uses `text-embedding-ada-002` for its baseline RAG implementation. Graphiti defaults to OpenAI embeddings. FAISS indices in most published agent architectures are built with OpenAI embeddings.

## Architectural Position in Agent Systems

OpenAI's infrastructure touches agent systems at four layers:

**Inference layer**: GPT-4 class models handle reasoning, entity extraction, edge resolution, memory reconciliation, and judgment tasks. In Mem0's pipeline, two LLM calls per memory addition handle fact extraction and deduplication. In Graphiti, 4-5 LLM calls per episode handle entity extraction, node deduplication, edge extraction, edge resolution, and attribute synthesis. OpenAI's pricing at each tier determines the economics of these memory operations.

**Structured output layer**: Pydantic schema validation over model responses is the mechanism by which Mem0, Graphiti, and other systems ensure their LLM calls return parseable JSON. Weaker structured output support from alternative providers is a documented migration obstacle.

**Embedding layer**: Most vector databases in agent systems are populated with OpenAI embeddings. Migrating to a different provider requires re-embedding all stored content.

**Agent orchestration layer**: The Agents SDK provides the loop, tool dispatch, handoff, and tracing infrastructure that competes with LangChain/LangGraph in the orchestration tier.

## Key Numbers

**ChatGPT**: 400+ million weekly active users as of early 2025 (self-reported by OpenAI). This number drives the training data feedback loops and product development priority.

**SWE-bench**: o3 scores around 71.7% on [SWE-bench](../projects/swe-bench.md) Verified (self-reported), placing it near the top of public leaderboards for autonomous code repair. SWE-bench results are reproducible by third parties; these specific numbers have not been independently replicated by the research community at scale but the benchmark methodology is public.

**Valuation**: $157 billion as of late 2024 funding round (private company, not independently audited).

**Model costs**: As of mid-2025, `gpt-4.1-nano` runs at approximately $0.10/1M input tokens. At Mem0's 2 LLM calls per memory addition, a session with 50 memory operations costs roughly $0.01-0.05 in model inference alone — workable for consumer applications, meaningful at enterprise scale.

## Strengths

**Ecosystem default status**: Because most agent frameworks and memory libraries default to OpenAI models, the API surface is the most battle-tested in production agent deployments. Edge cases in JSON parsing, structured output, and tool-call formatting are better documented for OpenAI's models than alternatives.

**Structured output reliability**: OpenAI's JSON schema enforcement is the most reliable among major providers. Memory pipelines like Graphiti and Mem0, which depend on structured LLM output for correctness, experience fewer parse failures with OpenAI's models than with equivalent prompts on other providers.

**Model tier breadth**: The `nano` → `mini` → `4o` → `o3` progression gives developers genuine cost/quality tradeoffs within a single provider. Acontext and Graphiti both implement small_model / large_model splits, defaulting to OpenAI's nano tier for routine extraction and larger models for judgment tasks.

**Reasoning models for agent tasks**: o1/o3 perform better on tasks requiring multi-step planning and self-correction — the core challenge in agent workflows. On [SWE-bench](../projects/swe-bench.md), reasoning models substantially outperform non-reasoning models on complex multi-file code changes.

## Critical Limitations

**Vendor lock-in through structured output**: The practical dependency is not the models themselves but the structured output API. Agent memory systems built against OpenAI's Pydantic schema enforcement require changes to function correctly with providers that implement structured output differently. Systems like Graphiti document this explicitly: "Graphiti requires LLM services supporting Structured Output for correct schema validation." This is an unspoken infrastructure assumption — the portability of these systems is lower than it appears.

**Concrete failure mode — UUID hallucination in memory operations**: Mem0's codebase explicitly documents a failure mode where LLMs hallucinate IDs when processing memory reconciliation. The workaround (mapping real UUIDs to sequential integers, then mapping back) is necessary specifically because OpenAI models and other LLMs will invent plausible-looking UUIDs that don't correspond to real stored memories. When this mapping fails — when the LLM still produces a hallucinated integer ID — the error is caught per-memory and logged but not surfaced to the caller, creating silent data loss. This failure mode exists because the reconciliation prompt depends on precise identifier tracking, and LLMs are not reliable at this task without the integer remapping hack.

## When NOT to Use OpenAI

**Cost-sensitive high-volume operations**: If your agent system makes hundreds of LLM calls per session (as multi-agent self-improvement systems like autocontext do — 5+ agents per generation, each making multiple calls), OpenAI's frontier models are economically prohibitive at scale. The autocontext distillation pipeline exists precisely to replace expensive OpenAI calls with cheaper local models after patterns are learned. For production systems running thousands of sessions daily, local models via [Ollama](../projects/ollama.md) or [vLLM](../projects/vllm.md) or competitors like DeepSeek serve the high-frequency operations better.

**Air-gapped or data-residency-constrained environments**: All OpenAI API calls route through OpenAI's infrastructure. Industries with strict data residency (healthcare, finance, government) cannot use OpenAI's API without contractual and technical controls that may not be available or may significantly constrain model selection.

**Evaluation with full auditability**: OpenAI's models are proprietary. If you need to audit model behavior at the weight level, reproduce exact outputs deterministically, or fine-tune on private data without sending it to a third party, the API is the wrong choice.

## Unresolved Questions

**Governance after restructuring**: The 2025 transition to a for-profit public benefit corporation raised questions about whether the nonprofit board retains meaningful control over safety decisions. The legal challenge from Elon Musk and subsequent settlement did not fully resolve what "safety-focused" commitments are contractually enforceable. For agent infrastructure builders, this matters because model deployment decisions (what capabilities to expose, what to rate-limit) affect what agents can do.

**Cost at scale for agent workloads**: OpenAI publishes per-token pricing but not aggregate cost data for production agent deployments. The economics of running multi-agent systems at scale — where each user session may trigger 50-200 LLM calls — are not publicly documented. Practitioners building on the Agents SDK or using OpenAI-dependent memory libraries (Mem0, Graphiti) cannot estimate steady-state infrastructure costs without running their own load tests.

**Model deprecation cadence**: OpenAI has deprecated models (Codex, text-davinci-003, GPT-3.5-turbo variants) with relatively short migration windows. Agent systems with deeply embedded model-specific behavior — particularly those relying on structured output formats or specific tool-calling schemas — may require significant rework on deprecation. The risk is higher for memory libraries that hardcode model names as defaults.

**Fine-tuning on agent traces**: OpenAI offers fine-tuning for GPT-4o-mini. The autocontext distillation pipeline targets local model fine-tuning via MLX/CUDA rather than OpenAI fine-tuning, specifically because training data from successful agent runs may contain proprietary patterns. Whether OpenAI's fine-tuning data policies allow training on agent execution traces without data retention by OpenAI is not clearly documented.

## Alternatives

**[Anthropic](../projects/anthropic.md) / [Claude](../projects/claude.md)**: Claude models are the primary practical alternative to GPT-4 for agent tasks. Graphiti supports Anthropic as an LLM backend; Mem0 supports it; autocontext uses `--provider-a anthropic` as the default frontier provider. Claude's 200k context window and documented strong instruction-following make it competitive for complex agent reasoning. Use Anthropic when you need long-context agent tasks, prefer a different safety/capability tradeoff, or want to test provider portability.

**[Gemini](../projects/gemini.md) / Google**: Gemini supports structured output and is available as a backend in Graphiti and Mem0. Gemini's 1M+ token context window is larger than OpenAI's offerings. Use Gemini when your agent workflows involve very long document contexts or when Google Cloud ecosystem integration is a priority.

**[Ollama](../projects/ollama.md) / [vLLM](../projects/vllm.md)**: Local inference for cost reduction or data residency. Both are supported as OpenAI-compatible provider backends in Mem0 and other libraries. Use local inference when per-call cost is the primary constraint, when data cannot leave your network, or when you want to run the autocontext distillation pipeline's distilled local models.

**DeepSeek**: Competitive benchmark performance at substantially lower API cost. Use DeepSeek when cost is primary and you can accept higher latency and less ecosystem tooling.

**Groq**: Very low latency inference via custom LPU hardware. Supported in Graphiti and Mem0. Use Groq when agent loop latency is the primary constraint and you can accept smaller available models.

## Related Concepts and Projects

- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — OpenAI's Agents SDK implements handoffs as its core multi-agent primitive
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — OpenAI embeddings are the default embedding layer for most RAG implementations
- [Agent Memory](../concepts/agent-memory.md) — GPT-4 class models handle extraction and reconciliation in Mem0 and Graphiti
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — RLHF and RLAIF are core training techniques for all GPT models
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — OpenAI models are used to generate training data for fine-tuning and distillation
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — ChatGPT's RLHF pipeline relies on human preference labeling
- [Continual Learning](../concepts/continual-learning.md) — OpenAI releases new model versions but does not offer true continual learning; each model version is a static snapshot
- [GEPA](../concepts/gepa.md) — OpenAI models are used in GEPA-style optimization loops for prompt and artifact improvement
- [OpenAI Agents SDK](../projects/openai-agents-sdk.md) — OpenAI's first-party orchestration framework
- [Mem0](../projects/mem0.md) — Defaults to `gpt-4.1-nano` for memory extraction
- [Graphiti](../projects/graphiti.md) — Defaults to `gpt-4.1-mini` for graph construction, OpenAI embeddings for vector search
- [LangChain](../projects/langchain.md) — Competes with OpenAI Agents SDK at the orchestration layer
- [Claude Code](../projects/claude-code.md) — Competes with OpenAI Codex/coding agents at the agentic coding layer
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — Former OpenAI research director, built early GPT training infrastructure

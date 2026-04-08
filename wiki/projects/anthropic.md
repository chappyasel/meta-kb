---
entity_id: anthropic
type: project
bucket: agent-architecture
abstract: >-
  Anthropic builds Claude language models and associated infrastructure (MCP,
  agent skills, Claude Code) with an explicit AI safety mission differentiating
  it from pure capability labs.
sources:
  - repos/helloruru-claude-memory-engine.md
  - repos/affaan-m-everything-claude-code.md
  - repos/snarktank-compound-product.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
  - repos/greyhaven-ai-autocontext.md
  - repos/thedotmack-claude-mem.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/agent-skills-overview.md
  - repos/jackchen-me-open-multi-agent.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/anthropics-skills.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/mem0ai-mem0.md
related:
  - openai
  - claude-code
  - context-engineering
  - model-context-protocol
  - agent-skills
  - claude
  - vllm
  - ollama
  - vector-database
  - cursor
  - langchain
  - codex
  - progressive-disclosure
  - mem0
  - gemini
  - context-management
  - chromadb
  - abductive-context
  - openclaw
  - agent-memory
  - long-term-memory
  - gepa
  - claude-md
  - neo4j
  - github-copilot
  - context-compression
  - reinforcement-learning
  - synthetic-data-generation
  - openai-agents-sdk
  - meta-agent
last_compiled: '2026-04-08T02:38:20.675Z'
---
# Anthropic

## What It Is

Anthropic is an AI safety company that develops the Claude family of language models and the infrastructure surrounding them. Founded in 2021 by former OpenAI researchers including Dario Amodei and Daniela Amodei, it occupies an unusual position: a frontier AI lab that treats safety research as a core function rather than a compliance overhead. Its public-facing products are Claude models (accessed via API and claude.ai), [Claude Code](../projects/claude-code.md) (an agentic coding assistant), and a growing set of agent infrastructure standards including the [Model Context Protocol](../concepts/model-context-protocol.md) and the [Agent Skills](../concepts/agent-skills.md) system.

The company's technical output divides into three buckets: model research (Constitutional AI, RLHF variants, interpretability), developer tooling (Claude Code, SDKs), and infrastructure standards (MCP, agentskills.io). All three are relevant to agent builders.

## Core Products and Infrastructure

### Claude Models

The Claude 3.x and later series (Haiku, Sonnet, Opus) are the commercial model lineup. Models are differentiated by cost and capability: Haiku is fast and cheap, used for high-throughput agent tasks; Sonnet balances cost and quality; Opus targets complex reasoning. Claude Code's agent skill system routes model selection automatically based on task complexity, with documentation agents using Haiku and architecture decisions routed to Opus.

Claude models support structured output via Pydantic schema validation, a requirement for agent frameworks like [Graphiti](../projects/graphiti.md) that use them as pipeline components for entity extraction and relationship resolution.

### Model Context Protocol (MCP)

Anthropic published MCP as an open standard for connecting language models to external tools and data sources. It defines a client-server protocol where tools expose capabilities as MCP servers and agents call them through a standardized interface. MCP has been adopted by [Cursor](../projects/cursor.md), Claude Code, and other coding assistants, and Graphiti ships an MCP server for graph memory access. The standard is documented at Anthropic's developer site; the reference implementation lives in the Claude Code codebase.

### Agent Skills System

The `anthropics/skills` repository is the canonical reference implementation for the Agent Skills standard at agentskills.io. It establishes a three-tier progressive disclosure architecture: skill metadata (YAML frontmatter with `name` and `description`) always in context, the SKILL.md body loaded on trigger, and bundled resources loaded on demand.

The triggering mechanism is entirely semantic: Claude reads the `description` field and decides whether to invoke a skill. This means description quality determines whether a skill fires at all. The `skill-creator` meta-skill in the repo implements an eval-driven development loop for skill authorship: interview to capture intent, write SKILL.md, generate test prompts, run with-skill vs. baseline comparisons via subagents, grade with assertions and LLM-as-judge, run a description optimizer that splits 60/40 train/test and iterates up to 5 times. Full eval costs roughly 300 LLM calls.

Skills install via a `.claude-plugin/marketplace.json` manifest: `claude /plugin marketplace add anthropics/skills`. The repo bundles production document skills (pdf, xlsx, docx, pptx) that use bundled Python scripts for deterministic operations, keeping script code out of the context window. The `allowed-tools` frontmatter field (experimental) lets skills pre-approve specific tool calls like `Bash(git:*) Read`.

See [Agent Skills](../concepts/agent-skills.md) and [CLAUDE.md](../concepts/claude-md.md) for deeper coverage.

### Claude Code

Claude Code is Anthropic's agentic coding assistant. It serves as the primary deployment surface for the skills system and functions as a reference implementation for how agent harnesses should be structured. The broader ecosystem around it (including third-party skill collections like those cataloged in projects like [OpenClaw](../projects/openclaw.md)) is built on the agentskills.io standard Anthropic publishes. See [Claude Code](../projects/claude-code.md) for full coverage.

## Research Contributions Relevant to Agent Infrastructure

### Constitutional AI and RLHF

Anthropic's Constitutional AI (CAI) approach trains models to self-critique outputs against a set of principles rather than relying solely on human feedback. This reduces the volume of human annotation required and shifts alignment work into the training process. For agent builders, this matters because Claude models trained with CAI tend to refuse fewer benign agentic tasks than models trained with restrictive RLHF, while maintaining stronger refusals on genuinely risky operations.

### [Reinforcement Learning](../concepts/reinforcement-learning.md) and [Synthetic Data Generation](../concepts/synthetic-data-generation.md)

Anthropic invests in RL-based training and synthetic data pipelines for capability improvement. These techniques are used to improve Claude's performance on agentic tasks, including tool use, multi-step reasoning, and code generation. The autocontext project (from Greyhaven AI) implements frontier-to-local distillation using Claude as the frontier model, then trains local models via MLX or CUDA. This represents an external validation of Claude as a capable teacher model for distillation pipelines.

### [Context Engineering](../concepts/context-engineering.md)

Anthropic's work on context management is distributed across several systems. The progressive disclosure architecture in the skills system is a direct solution to the tension between rich domain knowledge and finite context windows. Their [Context Compression](../concepts/context-compression.md) research informs how Claude Code handles large codebases. The GEPA concept (implemented in autocontext as Pareto optimization across evaluation dimensions) connects to Anthropic's broader interest in multi-objective optimization for agent improvement.

### [Meta-Agent](../concepts/meta-agent.md) Patterns

The skill-creator meta-skill is a concrete implementation of meta-agent architecture: a skill whose purpose is to create and evaluate other skills. This closes the skill development loop and makes the quality of the skill library measurable rather than subjective. The eval-driven iteration pattern (write skill, test, grade, optimize description, repeat) is a transferable approach for any team building domain-specific agent capabilities.

## Key Numbers

- **API availability**: Claude models available via direct API and through AWS Bedrock, Google Cloud Vertex AI
- **Context windows**: Claude 3.5 Sonnet supports 200K tokens; Claude 3 Opus supports 200K tokens
- **anthropics/skills stars**: Not separately tracked; part of Anthropic's GitHub organization
- **MCP adoption**: Adopted by Cursor, Claude Code, Windsurf, and dozens of third-party tools (self-reported ecosystem size)
- **SWE-bench performance**: Claude 3.5 Sonnet scored highly on [SWE-bench](../projects/swe-bench.md) coding benchmarks (specific figures vary by version and are self-reported by Anthropic)

Benchmark claims from Anthropic's own model cards should be treated as self-reported. Independent evaluations on [SWE-bench](../projects/swe-bench.md) and [HumanEval](../projects/humaneval.md) show strong performance but the ranking relative to [OpenAI](../projects/openai.md) and [Gemini](../projects/gemini.md) models shifts with each release cycle.

## Strengths

**Structured output reliability**: Claude models produce well-formed Pydantic-validated JSON more consistently than most alternatives at equivalent price points. Graphiti's multi-stage LLM pipeline (entity extraction, deduplication, edge extraction, contradiction resolution) relies on this. Mem0 uses it for memory classification.

**Long-context coherence**: At 200K tokens, Claude maintains instruction-following quality better than many competitors on tasks requiring full-context awareness. This matters for agent tasks where system prompts, skill files, tool definitions, and conversation history compete for context budget.

**Agent infrastructure investment**: Anthropic publishes the MCP standard, maintains the agentskills.io spec, ships Claude Code as both a product and a reference implementation, and releases skill authoring tools. This infrastructure investment means the ecosystem around Claude is more mature than those around competing models.

**Constitutional training approach**: Claude models tend to be less brittle around agentic refusals than models with more restrictive RLHF. In practice this means fewer false-positive safety blocks on legitimate multi-step agent tasks.

## Critical Limitations

**Vendor lock-in through standards**: MCP and agentskills.io are Anthropic-published standards, not neutral IETF or W3C governance processes. The agentskills.io specification is hosted by Anthropic and references Claude Code as the primary runtime. Projects building heavily on these standards are implicitly betting on Anthropic's continued stewardship.

**Description-only skill triggering**: The Agent Skills system has no programmatic triggers. A skill fires only if Claude interprets its description as matching the user's request. This fails silently: if your description doesn't trigger reliably, you get no error, just a skill that never runs. The skill-creator's eval loop addresses this but requires ~300 LLM calls to run properly, making it expensive to validate description quality in production.

**Concrete failure mode**: Undertriggering. In multi-skill environments with 10+ installed skills, Claude may not invoke a relevant skill because another skill's description is marginally more relevant. There is no mechanism for skills to declare non-overlapping domains or priority ordering. The only mitigation is aggressive description writing, which can cause over-triggering in adjacent scenarios.

**Unspoken infrastructure assumption**: The full Agent Skills system assumes Claude Code as the runtime. Skills installed via `claude /plugin marketplace add` work in Claude Code, Claude.ai paid plans, and the API. But the specific behavior of skill triggering, tool pre-approval via `allowed-tools`, and marketplace distribution is implemented in Claude Code's runtime, not in a platform-neutral way. A team running agents on another framework gets the SKILL.md format as documentation but loses the triggering and distribution machinery.

## When Not to Use Claude / Anthropic Infrastructure

**Cost-sensitive, high-volume inference**: Claude Haiku is competitive on price, but for tasks requiring millions of completions per day, [vLLM](../projects/vllm.md) with an open-weight model or [Ollama](../projects/ollama.md) for local inference are substantially cheaper. The skills system provides no cost advantage; it optimizes for quality and context efficiency, not throughput economics.

**Teams requiring model portability**: If your architecture must support swapping between Claude, GPT-4, and Gemini at the model layer, building deeply on MCP or agentskills.io creates friction. The skill format itself is portable (Markdown files), but the triggering runtime is Claude-specific. [LangChain](../projects/langchain.md) or [LiteLLM](../projects/litellm.md) provide better abstraction layers for multi-model deployments.

**Real-time or streaming-heavy applications**: Claude's API supports streaming, but latency characteristics make it a poor fit for sub-100ms response requirements. For interactive applications where perceived speed matters more than response quality, smaller local models are more appropriate.

**On-premise or air-gapped deployments**: Claude models run only on Anthropic's infrastructure. Teams with data residency requirements that prevent sending data to Anthropic's US-based servers cannot use Claude models regardless of other considerations.

## Unresolved Questions

**MCP governance**: The Model Context Protocol is published under an open license, but Anthropic controls the spec evolution. There is no independent governance body, no RFC process, and no documented process for third parties to propose breaking changes. If Anthropic's priorities diverge from the broader MCP ecosystem's needs, there is no mechanism for the community to fork with authority.

**Skill conflict resolution at scale**: The agentskills.io specification has no documented mechanism for resolving conflicts between skills with overlapping descriptions. At 10+ installed skills, which skill fires on an ambiguous prompt? The specification is silent on this.

**Cost of skill eval at production scale**: Running the full skill-creator eval loop (300+ LLM calls per skill, per optimization cycle) costs real money. There is no documentation on what continuous trigger monitoring looks like in production, or how to maintain description quality as Claude model behavior shifts across versions.

**Safety research to product pipeline**: Anthropic publishes extensive interpretability and alignment research. The pathway from that research into Claude model behavior is not publicly documented. It is unclear which safety techniques are deployed in production models vs. remaining as research artifacts.

## Alternatives

- **[OpenAI](../projects/openai.md)**: Use when GPT-4 series model quality or the [OpenAI Agents SDK](../projects/openai-agents-sdk.md) ecosystem is preferred. Better ecosystem for fine-tuning workflows. More established benchmark history for code generation via [OpenAI Codex](../projects/codex.md).
- **[Gemini](../projects/gemini.md)**: Use when Google Cloud integration matters, or when the Gemini 1.5 Pro 2M-token context window is required for tasks exceeding 200K tokens.
- **[vLLM](../projects/vllm.md)**: Use when throughput, cost, or on-premise deployment requirements make hosted APIs impractical.
- **[Ollama](../projects/ollama.md)**: Use for local development, privacy requirements, or air-gapped environments.
- **[LangChain](../projects/langchain.md) / [LangGraph](../projects/langgraph.md)**: Use when building multi-model agent workflows where swapping the underlying LLM without changing agent logic is a requirement.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): The broader discipline; Anthropic's skills system is a concrete implementation
- [Agent Skills](../concepts/agent-skills.md): The agentskills.io standard Anthropic publishes and maintains
- [Model Context Protocol](../concepts/model-context-protocol.md): Anthropic's tool-connection standard
- [Progressive Disclosure](../concepts/progressive-disclosure.md): The three-tier architecture underlying the skills system
- [CLAUDE.md](../concepts/claude-md.md): Anthropic's per-project context file format
- [Meta-Agent](../concepts/meta-agent.md): The skill-creator implements this pattern
- [Reinforcement Learning](../concepts/reinforcement-learning.md): Core to Claude's training methodology
- [Context Compression](../concepts/context-compression.md): Relevant to how Claude handles large agent contexts
- [Agent Memory](../concepts/agent-memory.md): Claude models serve as the reasoning core in most memory architectures surveyed in this wiki

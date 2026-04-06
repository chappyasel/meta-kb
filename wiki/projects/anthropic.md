---
entity_id: anthropic
type: project
bucket: agent-systems
abstract: >-
  Anthropic builds frontier AI models (Claude) and agent infrastructure (Claude
  Code, MCP), differentiated by public safety research commitments and the
  Constitutional AI training method.
sources:
  - repos/helloruru-claude-memory-engine.md
  - repos/affaan-m-everything-claude-code.md
  - repos/snarktank-compound-product.md
  - repos/anthropics-skills.md
  - repos/greyhaven-ai-autocontext.md
  - repos/thedotmack-claude-mem.md
  - repos/letta-ai-letta-code.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/agent-skills-overview.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/anthropics-skills.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/mem0ai-mem0.md
related:
  - claude-code
  - openai
  - mcp
  - claude
  - agent-skills
  - gemini
  - cursor
  - andrej-karpathy
  - context-engineering
  - openai-codex
  - progressive-disclosure
  - vllm
  - mem0
  - ollama
last_compiled: '2026-04-06T01:56:59.746Z'
---
# Anthropic

## What It Is

Anthropic is an AI safety company founded in 2021 by Dario Amodei, Daniela Amodei, and several former OpenAI researchers. Its core business is building and deploying large language models under the Claude brand, while publishing safety research aimed at making those models more interpretable, reliable, and aligned with human values.

For the knowledge base and agent intelligence space specifically, Anthropic matters as the creator of three distinct layers of infrastructure: Claude (the underlying model), [Claude Code](../projects/claude-code.md) (an agentic coding assistant), and the [Model Context Protocol](../concepts/mcp.md) (an open standard for tool and context integration). These three things together make Anthropic the most consequential single organization in how LLM-powered agents are built in 2025.

## Architecturally Unique Aspects

### Constitutional AI

Anthropic's primary training differentiator is Constitutional AI (CAI), a method where the model critiques and revises its own outputs against a set of principles rather than relying solely on human feedback for every response. The practical effect: Claude models tend to refuse harmful requests with explanations rather than silent refusal or compliant execution. Whether this represents genuine alignment progress or sophisticated refusal tuning is contested among researchers.

### Model Context Protocol

MCP is Anthropic's largest infrastructure bet beyond the model itself. Published as an open protocol in late 2024, MCP standardizes how agents connect to tools, databases, and external services. The spec defines a client-server model where MCP servers expose capabilities (tools, resources, prompts) and MCP clients (Claude Code, Cursor, and others) consume them.

The protocol's adoption matters: third-party tools like [Graphiti](../projects/graphiti.md) ship MCP servers as first-class integration targets, and agent frameworks like [LangGraph](../projects/langgraph.md) treat MCP compliance as table stakes. Anthropic does not control what gets built as an MCP server, which gives the protocol legitimacy it would lack as a proprietary API.

### claude.md and Skill Architecture

Anthropic established [claude.md](../concepts/claude-md.md) as the de facto convention for project-level agent instructions: a markdown file read at session start that configures the agent's behavior, tools, and constraints. Their official skills repository (anthropics/skills) implements a three-tier [progressive disclosure](../concepts/progressive-disclosure.md) architecture where skill metadata stays in context permanently, SKILL.md body loads on trigger, and bundled resources load on demand. This solves a real engineering problem: how to give agents access to deep domain knowledge without consuming the entire context window.

The skill-creator meta-skill is the most architecturally interesting piece: it closes a loop most skill systems leave open by implementing eval-driven iteration with LLM-as-judge grading, variance analysis, and description optimization. See the [Agent Skills](../concepts/agent-skills.md) concept page for full implementation detail.

## Key Products

**Claude (API)**: The primary commercial product. Claude 3.5 Sonnet and Claude 3.7 Sonnet are the current frontier models as of mid-2025. Priced per token, with a tiered context window. The API supports structured output, tool use, and vision.

**Claude Code**: A terminal-native agentic coding assistant that operates directly on the filesystem rather than through an IDE plugin. It uses the CLAUDE.md convention for project context, supports subagent delegation, and integrates with MCP servers for extended capabilities. See [Claude Code](../projects/claude-code.md) for full architecture detail.

**Claude.ai**: Consumer and team product with a chat interface, projects feature (persistent context across conversations), and skill installation for paid tiers.

## Key Numbers

- **Valuation**: $61.5 billion as of early 2025 (Series E, funding from Google, Amazon, Spark Capital). Self-reported.
- **SWE-Bench Verified**: Claude 3.7 Sonnet scored 70.3% on [SWE-Bench](../projects/swe-bench.md) Verified as of February 2025 (Anthropic-reported, using an agent scaffold).
- **Context window**: 200K tokens for Claude 3 and 3.5 models.
- **MCP adoption**: Over 1,000 MCP servers listed in community registries by mid-2025 (community-counted).

The SWE-Bench figure deserves scrutiny. Anthropic runs their own evals on their own models with scaffolding they design. Independent replication with different scaffolding consistently produces lower numbers. The figure is useful for directional comparison to other providers' self-reported numbers, not as an absolute capability measure.

## Strengths

**Instruction following at production scale**: Claude models, particularly 3.5 Sonnet, consistently rank highly on following complex multi-part instructions without dropping constraints. This matters specifically for [agent orchestration](../concepts/agent-orchestration.md) where the model must maintain rules across many tool calls.

**Long-context coherence**: At 200K tokens, Claude maintains stronger coherence across the full window than most alternatives. Verified by independent users building [RAG](../concepts/rag.md) systems and [knowledge graph](../concepts/knowledge-graph.md) pipelines where the full context must inform each generation.

**Safety research publication**: Anthropic publishes interpretability and alignment research (the Transformer Circuits work, activation patching, superposition research) with enough methodological detail to replicate. This distinguishes them from [OpenAI](../projects/openai.md), which has reduced research publication cadence.

**Agent infrastructure**: MCP, Claude Code, claude.md, and the skills architecture form a coherent stack for building agents. Projects like the [everything-claude-code](../projects/claude-code.md) harness (156 skills, 38 agents, 20+ hook types) exist because that stack is well-defined enough to build against.

## Critical Limitations

**Concrete failure mode: refusal brittleness at scale**. Claude's safety training produces refusals in edge cases that other models handle without issue. The problem is not the refusals themselves but their unpredictability. A prompt that works in 99 of 100 runs refuses on the 100th with no change in input. For production agent pipelines making thousands of calls, this unpredictability forces error-handling overhead and retry logic that compounds costs. The refusal behavior is not documented in enough detail to predict or work around systematically.

**Unspoken infrastructure assumption: API reliability**. The entire Claude Code and MCP ecosystem assumes continuous, low-latency API access. During degraded service periods (which have occurred during high-demand windows in 2024-2025), agentic workflows that make 50-200 API calls per task fail in ways that are difficult to recover gracefully. There is no official offline mode or local model option for Claude, unlike [Ollama](../projects/ollama.md)-backed setups.

## When NOT to Use Anthropic

**High-volume, latency-sensitive inference**: [vLLM](../projects/vllm.md) running open-weight models on your own hardware gives you deterministic latency, no per-token cost at scale, and no dependency on external API availability. If you are running millions of inference calls per day, Anthropic's pricing structure and API rate limits become binding constraints.

**On-device or air-gapped deployments**: Claude is cloud-only. Applications requiring local execution (healthcare data that cannot leave a network, consumer devices, offline use) cannot use Claude without a connectivity dependency that may be architecturally unacceptable.

**Tasks where refusals are catastrophic**: Security research, red-teaming, content moderation training, and other legitimate uses that involve analyzing harmful content will encounter more friction with Claude than with open-weight alternatives. The Constitutional AI training creates guardrails that are not tunable via system prompt.

**Cost at sustained scale**: [DeepSeek](../projects/deepseek.md) and other open-weight models have narrowed the capability gap enough that for many production tasks, the cost differential is difficult to justify. For a startup burning $50K/month on Claude API calls, the economics of self-hosted open-weight models become compelling.

## Unresolved Questions

**Governance of MCP**: Anthropic published MCP and controls the spec, but the protocol is open. Who decides when breaking changes land? How are conflicts between major adopters resolved? There is no published governance model. If Anthropic's priorities diverge from the ecosystem's, MCP could fork or fragment.

**Cost at scale, unpublished**: Anthropic does not publish volume pricing tiers in enough detail to model costs for large deployments. Negotiated enterprise pricing is opaque. For practitioners building business cases around Claude-based products, the uncertainty in cost at scale is a planning problem.

**Interpretability research to product pipeline**: Anthropic's mechanistic interpretability research (circuits, features, superposition) is genuinely impressive. How it translates into model reliability improvements in production is not documented. The gap between "we understand how induction heads work" and "our models refuse less unpredictably" is not explained.

**Model distillation and fine-tuning**: Anthropic does not offer fine-tuning for Claude models (unlike OpenAI's fine-tuning API). For applications that would benefit from domain adaptation, this forces either prompt engineering workarounds or migration to a model that supports fine-tuning.

## Relationship to Alternatives

**vs. [OpenAI](../projects/openai.md)**: OpenAI has broader tooling (Codex, Assistants API, fine-tuning, image generation), larger market share, and longer enterprise sales history. Claude's instruction following and long-context coherence are widely considered stronger. OpenAI's models are generally faster at standard context lengths.

**vs. [Gemini](../projects/gemini.md)**: Google's distribution advantages (integrated into Workspace, native Android access, YouTube data) are structural. Gemini 1.5 Pro matches Claude's 1M context window. For applications requiring multimodal reasoning over very long documents, Gemini's native integration with Google's ecosystem is a genuine differentiator.

**vs. [Cursor](../projects/cursor.md)**: Cursor is a consumer product built on top of Claude and GPT-4. They are not competitors at the model layer; Cursor is an Anthropic customer and distribution partner. For coding assistance, Cursor's IDE integration is tighter than Claude Code's terminal interface.

**vs. [Ollama](../projects/ollama.md) / open-weight**: The capability gap has narrowed. For [context engineering](../concepts/context-engineering.md) use cases requiring deterministic behavior, local execution, or cost control, open-weight models via Ollama or vLLM are viable alternatives for many tasks that required Claude-class models in 2023.

**vs. [LangChain](../projects/langchain.md) / [LlamaIndex](../projects/llamaindex.md)**: These are orchestration frameworks, not model providers. They run on top of Claude and are not alternatives. Anthropic's MCP protocol competes indirectly with LangChain's tool abstraction layer by offering a standardized integration point that bypasses framework-level abstractions.

## Related Concepts

- [Model Context Protocol](../concepts/mcp.md): The open standard Anthropic created for agent-tool integration
- [Agent Skills](../concepts/agent-skills.md): The skill architecture Anthropic defined and maintains
- [claude.md](../concepts/claude-md.md): The project-context convention established by Claude Code
- [Context Engineering](../concepts/context-engineering.md): The broader practice of managing what goes into agent context windows
- [Progressive Disclosure](../concepts/progressive-disclosure.md): The three-tier loading pattern used in Anthropic's skill architecture
- [Claude Code](../projects/claude-code.md): Anthropic's agentic coding assistant
- [Claude](../projects/claude.md): The underlying model family

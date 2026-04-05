---
entity_id: anthropic
type: project
bucket: agent-systems
abstract: >-
  Anthropic is an AI safety company that builds and operates the Claude model
  family, notable for creating Model Context Protocol and being the primary
  driver of Claude Code's agentic architecture.
sources:
  - repos/aiming-lab-simplemem.md
  - repos/helloruru-claude-memory-engine.md
  - repos/affaan-m-everything-claude-code.md
  - repos/snarktank-compound-product.md
  - repos/anthropics-skills.md
  - repos/thedotmack-claude-mem.md
  - repos/greyhaven-ai-autocontext.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/agent-skills-overview.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/anthropics-skills.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/mem0ai-mem0.md
related:
  - Claude Code
  - OpenAI
  - Claude
  - Model Context Protocol
  - Cursor
  - OpenAI Codex
  - Google Gemini
  - Agent Skills
  - OpenClaw
  - OpenCode
  - skill.md
  - Procedural Memory
  - Progressive Disclosure
  - vLLM
  - Mem0
  - Ollama
  - A-MEM
last_compiled: '2026-04-05T20:20:34.272Z'
---
# Anthropic

## What It Is

Anthropic is a US AI safety company founded in 2021 by former OpenAI researchers including Dario Amodei and Daniela Amodei. It builds large language models under the Claude brand, publishes AI safety research, and has become a significant infrastructure provider for the agent systems space through two specific technical contributions: the Claude family of models and the Model Context Protocol (MCP).

The company's stated mission centers on AI safety research alongside commercial model development. In practice, this means publishing interpretability and alignment research (Constitutional AI, mechanistic interpretability), maintaining acceptable use policies, and designing deployment constraints into its products.

## Core Products Relevant to Agent Systems

**Claude models**: The primary commercial offering. Claude 3.5 Sonnet, Claude 3.7 Sonnet, and Claude 3 Opus are widely used as agent backbones. Claude's 200K token context window, structured output support, and tool use capabilities make it the default choice for many agentic systems. Claude Code, Anthropic's coding agent, runs on Claude models and has become a reference implementation for how to structure agent workflows at scale.

**Model Context Protocol (MCP)**: An open protocol for standardizing how AI agents connect to external tools and data sources. MCP defines a client-server architecture where agents act as MCP clients and external services expose MCP servers. The protocol has been adopted by Cursor, Claude Code, and many third-party integrations (including Graphiti's MCP server and Acontext's planned MCP endpoint). MCP matters because it shifts integration work from per-agent adapters to a single standard interface.

**Claude Code**: An agentic coding tool built on Claude models. It implements a skill/hook/rule architecture for agent workflows and serves as a reference implementation for how to structure large skill collections. The Everything Claude Code project (156 skills, 38 agents) was built for Claude Code specifically before expanding to other platforms. Claude Code uses CLAUDE.md for persistent context, hooks for lifecycle automation, and agents for specialized subtask delegation.

## Technical Characteristics Relevant to Agent Systems

**Structured output**: Claude models support Pydantic schema validation via structured output, which is required by memory systems like Graphiti. The Graphiti codebase lists Anthropic alongside OpenAI as a supported LLM client in `graphiti_core/llm_client/`, and systems like Acontext support Anthropic as an optional backend.

**Context window economics**: At 200K tokens, Claude models support long-context operation, but agent frameworks still optimize heavily to reduce token usage. Memori's benchmark showed 81.95% accuracy using only 1,294 tokens per query (roughly 5% of full context). The Everything Claude Code project documents allocating 10K tokens for system prompts, 5-8K for resident rules, and 2-5K per MCP tool definition, with a recommendation to limit MCPs to 10 per project to preserve roughly 70K tokens for actual work.

**Tool use**: Claude's function calling interface is consistent with OpenAI's format, making it interchangeable in most agent frameworks. The `anthropic` LLM client in Graphiti's codebase implements the same `GraphitiLLMClient` interface as OpenAI, Google, and Groq clients.

**Models in practice**: Compound Product's NanoClaw orchestrator uses Haiku for fast tasks, Sonnet for complex logic, and Opus for architecture decisions. Graphiti's default is `gpt-4.1-mini` with an optional `small_model` config pointing to `gpt-4.1-nano`, but the Anthropic client is a drop-in replacement. The Zep paper benchmarks use gpt-4o-mini for graph construction and gpt-4o for response generation, not Claude models.

## Market Position

Anthropic competes with OpenAI (GPT-4/GPT-4o/Codex), Google (Gemini), and open-source alternatives (Ollama, vLLM). In the agent systems space specifically:

- Claude Code competes with Cursor, OpenClaw, OpenCode, and Codex
- Claude models compete with GPT-4o as the backend for agent frameworks
- MCP competes with ad-hoc tool integrations and LangChain-style adapters

The company received significant investment from Google and Amazon, giving it infrastructure backing without the direct cloud platform competition that affects OpenAI's relationship with Azure.

## Strengths in the Agent Context

**MCP adoption**: MCP has become a de facto standard faster than most vendor protocols. Having Claude Code, Cursor, and dozens of third-party tools adopt MCP gives Anthropic leverage over how agent integrations work across the ecosystem.

**Claude Code as reference architecture**: The skill/hook/rule/agent pattern in Claude Code has influenced how practitioners think about structuring agent behavior. The Everything Claude Code project's architecture (hierarchical agent delegation, context window economics, continuous learning via hooks) was built specifically around Claude Code's primitives.

**Safety constraints as feature**: For enterprise deployments, Claude's usage policies and content filtering reduce compliance risk. This matters more in regulated industries (healthcare, finance) where model outputs carry liability.

**Long context with good instruction following**: Claude models perform well on long-context tasks that require precise instruction following, which is directly relevant to agent workflows with large system prompts, complex CLAUDE.md configurations, and multi-skill orchestration.

## Limitations

**Self-reported safety claims**: Anthropic's safety research is genuine but its claims about model alignment and safety properties are largely self-assessed. External audits and red-team results are selectively disclosed. The Constitutional AI approach produces measurable outputs on specific benchmarks, but generalization to novel deployment contexts is unverified.

**Infrastructure assumption**: Using Claude models assumes Anthropic's API remains available and affordable. Unlike open-source models (Ollama, vLLM), there is no self-hosting path for Claude. For agent systems making 30-55 LLM calls per session (as Acontext documents), API availability and pricing directly affect system viability.

**Benchmark gap**: The Zep paper (arXiv:2501.13956) benchmarks against OpenAI models, not Claude. Most published benchmarks for agent memory systems use GPT-4o or GPT-4o-mini as the backbone. Claude model performance on agentic tasks like entity extraction, contradiction detection, and multi-step planning is less documented in third-party evaluations.

## When NOT to Use Anthropic Models

**Cost-sensitive, high-volume inference**: If your agent system makes dozens of LLM calls per user session and you have millions of sessions, Claude API costs will be substantial. Ollama or vLLM running local models provide zero marginal cost at the expense of quality and latency.

**Latency-critical paths**: Claude API calls add network round-trip latency that local models avoid. For agent frameworks where the execution loop runs every few seconds (like Compound Product's loop.sh with `sleep 2` between iterations), API latency compounds.

**Offline or air-gapped deployments**: Any deployment without internet access to Anthropic's API cannot use Claude. Healthcare and government contexts with strict data residency requirements may need on-premise models instead.

**When the task fits a smaller model**: Many agent subtasks (conversation summarization, simple classification, memory extraction) work well with much cheaper models. Graphiti uses `gpt-4.1-nano` for simpler prompts. Acontext uses Claude Haiku for its background Observer Agent. Using Opus or Sonnet for everything is expensive without proportional quality gain.

## Unresolved Questions

**MCP governance**: MCP is open-source but controlled by Anthropic. How the protocol evolves, who influences its direction, and whether Anthropic can use MCP adoption to lock in Claude model usage are unclear. The protocol has no independent governance body.

**Cost at scale**: Anthropic publishes per-token pricing but not volume discounts, reliability SLAs for production use, or rate limit details for high-throughput agent workloads. Organizations running thousands of concurrent agent sessions need answers to these questions before committing.

**Model versioning for agent workflows**: Agent systems that encode specific prompting patterns against a particular Claude version face instability when models are updated. Anthropic's model versioning policy and backward compatibility commitments for API behavior are not well-documented.

**Safety research vs commercial pressure**: Anthropic raised funding at a $61.5B valuation as of early 2025. The tension between publishing safety research that reveals model limitations and maintaining commercial credibility is not publicly addressed.

## Related Pages

- [Claude Code](../projects/claude-code.md) — Anthropic's agentic coding tool, primary implementation of Claude's agent capabilities
- [Model Context Protocol](../projects/model-context-protocol.md) — The open protocol Anthropic created for agent-tool integration
- [Agent Skills](../concepts/agent-skills.md) — The skill/rule/hook pattern that Claude Code pioneered
- [Procedural Memory](../concepts/procedural-memory.md) — How Claude Code stores and retrieves reusable agent behaviors
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — Context loading pattern used in Claude Code's skill system

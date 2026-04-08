---
entity_id: anthropic
type: project
bucket: agent-architecture
abstract: >-
  Anthropic is the AI safety company that trains the Claude model family and
  authored the Model Context Protocol, differentiating itself through
  constitutional AI training methods and safety-focused research.
sources:
  - articles/agent-skills-overview.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/anthropics-skills.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/mem0ai-mem0.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/memorilabs-memori.md
  - repos/affaan-m-everything-claude-code.md
  - repos/greyhaven-ai-autocontext.md
  - repos/helloruru-claude-memory-engine.md
  - repos/jackchen-me-open-multi-agent.md
  - repos/snarktank-compound-product.md
  - repos/thedotmack-claude-mem.md
  - tweets/akshay-pachaar-the-anatomy-of-an-agent-harness.md
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
  - langchain
  - codex
  - progressive-disclosure
  - mem0
  - gemini
  - context-management
  - chromadb
  - abductive-context
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
  - sqlalchemy
  - pydantic
  - postgresql
  - redis
  - groq
  - openclaw
  - cursor
last_compiled: '2026-04-08T22:55:04.213Z'
---
# Anthropic

**Type:** Company / Research Lab  
**Domain:** Foundation model development, AI safety research, agent infrastructure

---

## What Anthropic Does

Anthropic builds large language models under the Claude brand and conducts AI safety research. Founded in 2021 by Dario Amodei, Daniela Amodei, and colleagues who previously worked at OpenAI, the company raised over $7.3B through 2024 across rounds led by Google and Amazon (Amazon committed $4B, becoming a major cloud partner).

The company operates on two parallel tracks: shipping commercial products (Claude models, Claude.ai, Claude Code, the Claude API) and publishing safety-focused research (Constitutional AI, interpretability work, mechanistic understanding of transformer internals). Whether those tracks meaningfully constrain each other is an open and legitimate question.

Anthropic's direct output in the agent infrastructure space spans three distinct categories: foundation models, tooling standards, and reference implementations.

---

## Core Technical Output

### The Claude Model Family

The [Claude](../projects/claude.md) family is Anthropic's primary commercial product. Models are tiered by capability and cost: Haiku (fast, cheap), Sonnet (mid-tier, general purpose), and Opus (highest capability, highest cost). As of 2025, Claude 3.5 Sonnet and Claude 3.7 Sonnet are the most widely deployed, with Claude 3.7 introducing extended thinking (explicit chain-of-thought reasoning steps visible to the caller).

Key API differentiators relative to competitors:
- **Extended thinking**: Optional reasoning traces that expose the model's scratchpad. Callers pay for reasoning tokens separately.
- **Context windows**: Up to 200K tokens across the model family.
- **Constitutional AI training**: Models are trained via a multi-step process where a "critic" model evaluates outputs against a set of principles, producing preference data for RLHF without requiring human labelers for every judgment.
- **Tool use / function calling**: Structured output via XML-delimited tool calls, with multi-tool use in a single turn.

Benchmark performance is self-reported by Anthropic on evals like HumanEval, GPQA, and [SWE-bench](../projects/swe-bench.md), typically showing Claude 3.5/3.7 Sonnet competitive with GPT-4o. Independent replication on SWE-bench Verified shows Claude-family models in the top tier of agent-based coding benchmarks, but the leaderboard methodology is contested and results shift with scaffolding choices.

### Model Context Protocol

[Model Context Protocol](../concepts/model-context-protocol.md) (MCP) is Anthropic's open standard for connecting LLMs to external tools, data sources, and services. Released in November 2024, MCP defines a JSON-RPC 2.0 protocol where clients (LLMs or agent frameworks) communicate with servers (tool providers) through a standardized interface.

MCP's adoption grew rapidly because it solves a real integration problem: every agent framework previously required custom adapters per tool. MCP provides a single protocol that any client or server can implement. By mid-2025, major IDEs ([Cursor](../projects/cursor.md), [Claude Code](../projects/claude-code.md)), agent frameworks ([LangChain](../projects/langchain.md), [LangGraph](../projects/langgraph.md)), and data providers had shipped MCP servers.

The protocol's architectural choices are worth noting: it is transport-agnostic (stdio, SSE, WebSocket), stateful by default (servers maintain session context), and supports three capability types: tools (callable functions), resources (readable data), and prompts (parameterized templates). Authentication is deliberately left to implementations, which simplifies the spec but creates deployment complexity for multi-tenant systems.

### Agent Skills Standard

Anthropic maintains the `anthropics/skills` repository as the canonical reference implementation for the Agent Skills specification hosted at agentskills.io. The architecture uses a three-tier progressive disclosure model:

1. YAML frontmatter (`name` + `description`) always resident in context, ~100 tokens
2. SKILL.md body loaded on semantic trigger, target <5000 tokens
3. Bundled scripts and reference files loaded on demand

The triggering mechanism is purely semantic: Claude reads the `description` field and decides whether to consult the skill. This makes description quality the primary lever for skill reliability. The `skill-creator` meta-skill closes the loop by implementing an eval-driven development cycle: propose SKILL.md, run test prompts, grade with an LLM judge, compare against baseline, iterate. [Source](../raw/deep/repos/anthropics-skills.md)

Skills distribute via a `.claude-plugin/marketplace.json` manifest, enabling bundle-level installation:
```bash
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
```

The document production skills (PDF, XLSX, DOCX, PPTX) bundle deterministic Python helpers as scripts that execute without loading into context, a pattern that separates structured computation from instruction-following.

### CLAUDE.md

[CLAUDE.md](../concepts/claude-md.md) is Anthropic's convention for project-level context injection. A file at the repository root that Claude automatically reads, it functions as persistent project memory: codebase conventions, tooling preferences, workflow patterns, gotchas. The format is plain Markdown; the convention is Anthropic-defined but not enforced by any schema.

Claude Code uses CLAUDE.md as the primary mechanism for persistent context. The broader ecosystem has built on this convention -- [Everything Claude Code](../projects/openclaw.md) and similar harness systems treat CLAUDE.md as a configuration surface for agent behavior.

---

## Claude Code

[Claude Code](../projects/claude-code.md) is Anthropic's terminal-based coding agent. It uses the Claude API with an agentic loop: read files, write code, run tests, iterate. As of 2025, Claude Code benchmarks competitively on SWE-bench and has become a primary surface for Anthropic's agent infrastructure experiments (skills, MCP, hooks). The agent harness ecosystem around Claude Code ([Everything Claude Code](../projects/openclaw.md), gstack) treats it as the reference platform.

---

## Training Methods

Anthropic's published training innovations relevant to the agent infrastructure space:

**Constitutional AI (CAI)**: Models are trained with a multi-step process where a critic LLM evaluates candidate outputs against stated principles and generates preference pairs. This reduces reliance on human labelers for RLHF and allows more explicit specification of desired behaviors. The "constitution" is a document of principles, not a reward model -- it gets translated into training signal through critique and revision.

**[Reinforcement Learning](../concepts/reinforcement-learning.md)**: Standard RLHF with human preference data, combined with CAI-generated preference data. Claude 3.7's extended thinking capability required additional RL work to make reasoning traces coherent and useful to callers.

**[Synthetic Data Generation](../concepts/synthetic-data-generation.md)**: Anthropic uses Claude to generate training data for Claude, a recursive loop that requires careful quality control to avoid capability collapse. The specifics of how this is done at scale are not publicly disclosed.

---

## Strengths

**Context engineering in practice**: Anthropic's published work on [Context Engineering](../concepts/context-engineering.md) -- the skills system, CLAUDE.md conventions, MCP protocol design -- represents genuine production thinking about how to structure information in context windows rather than theoretical speculation.

**Standard-setting**: MCP succeeded where prior tool-calling standards failed because Anthropic shipped first-party implementations alongside the spec and had enough market pull to create adoption pressure. The skills standard at agentskills.io is early but follows the same pattern.

**Safety research with production feedback**: Anthropic's interpretability work (circuit-level analysis of attention heads, superposition research) feeds into model training in ways that are unusually legible compared to competitors. Whether this produces measurably safer systems is contested.

**API reliability**: The Claude API has better uptime SLAs and more consistent behavior than alternatives at the top capability tier. Teams running production agent workflows report this matters more than raw benchmark numbers.

---

## Critical Limitations

**Triggering reliability for skills is fragile**: The semantic triggering mechanism for the Agent Skills standard has a documented undertriggering problem. The skill-creator meta-skill explicitly warns that Claude tends to not invoke skills when they would be useful, and the mitigation (making descriptions "a little bit pushy") creates the opposite risk of over-triggering. There is no programmatic fallback. [Source](../raw/deep/repos/anthropics-skills.md)

**Infrastructure assumption -- API dependency**: The entire Claude Code / skills / MCP ecosystem assumes Claude API availability. Unlike [vLLM](../projects/vllm.md) or [Ollama](../projects/ollama.md), there is no self-hosted path for the frontier models. Teams in air-gapped environments, high-data-sensitivity contexts, or regions with API latency problems cannot use this stack.

---

## When NOT to Use Anthropic's Stack

**Air-gapped or data-sensitive environments**: No self-hosted Claude option exists. All inference goes through Anthropic's API. If your data cannot leave your network, the Claude family is not an option. Use [vLLM](../projects/vllm.md) with an open-weight model.

**Cost-sensitive high-volume inference**: Claude Sonnet/Opus pricing is on the expensive end of frontier models. At high token volumes, Groq (for speed) or open-weight models on [Ollama](../projects/ollama.md) substantially reduce costs. The MCP protocol is model-agnostic, so tooling investments can transfer.

**Teams needing stable, versioned APIs**: Anthropic deprecates model versions and changes behavior in new model releases. Teams that need bit-identical outputs across time (compliance, regulated industries) face ongoing maintenance work.

**Multi-model orchestration architectures**: If you need to route tasks across multiple model providers dynamically, Anthropic's tooling assumes Claude is the orchestrator. LangGraph, [LiteLLM](../projects/litellm.md), or [DSPy](../projects/dspy.md) provide more neutral orchestration surfaces.

---

## Unresolved Questions

**Skill governance at scale**: The `anthropics/skills` repo is a curated list with no automated quality gating. At 12+ curated skills, the governance is manageable. There is no published plan for how the marketplace scales if third-party skill submissions increase by an order of magnitude.

**MCP authentication**: The protocol deliberately omits authentication, deferring to implementations. This creates a predictable fragmentation problem: every MCP server ships its own auth mechanism, and client implementations must support the union of all of them. No standard has emerged.

**Cost of the skill-creator eval loop**: The full description optimization loop (20 queries × 3 runs × 5 iterations = 300 LLM calls) makes systematic skill quality improvement expensive. There is no mechanism for ongoing trigger monitoring in production. Teams building custom skill libraries bear this cost without tooling support.

**Extended thinking tradeoffs**: Claude 3.7's reasoning traces add latency and token cost. Anthropic has not published guidance on when extended thinking helps versus hurts for specific task types, leaving practitioners to discover this empirically.

---

## Competitive Landscape

| Competitor | Selection Guidance |
|---|---|
| [OpenAI](../projects/openai.md) + [OpenAI Agents SDK](../projects/openai-agents-sdk.md) | Use when GPT-4o performance is preferred on your specific task distribution, or when you need tighter integration with Azure OpenAI for enterprise compliance. |
| [Gemini](../projects/gemini.md) | Use when you need 1M+ token context windows or tight Google Cloud integration. |
| [vLLM](../projects/vllm.md) | Use for self-hosted inference at scale with open-weight models. Orthogonal to Anthropic -- can serve as the inference backend for MCP-compatible tools. |
| [Ollama](../projects/ollama.md) | Use for local development with open-weight models. Good for prototyping agent workflows before committing to API costs. |
| Groq | Use when inference speed is the primary constraint and top-tier capability is not required. |
| [GitHub Copilot](../projects/github-copilot.md) | Use when the requirement is IDE-integrated code completion in a managed enterprise environment, not autonomous agent workflows. |
| [OpenAI Codex](../projects/codex.md) | Use for isolated coding tasks in sandboxed environments where Claude Code's terminal-native model is a poor fit. |

---

## Related Concepts and Projects

- [Context Engineering](../concepts/context-engineering.md) — Anthropic's published framework for structuring information in context windows
- [Agent Skills](../concepts/agent-skills.md) — The capability standard Anthropic is developing
- [Claude](../projects/claude.md) — The model family
- [Claude Code](../projects/claude-code.md) — The terminal coding agent
- [Model Context Protocol](../concepts/model-context-protocol.md) — The tool-calling standard
- [CLAUDE.md](../concepts/claude-md.md) — Project context convention
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — The three-tier loading pattern used in skills
- [Meta-Agent](../concepts/meta-agent.md) — Relevant to how skill-creator closes the skill improvement loop
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — Core training method
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — Used in training pipeline

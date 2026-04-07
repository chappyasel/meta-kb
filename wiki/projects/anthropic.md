---
entity_id: anthropic
type: project
bucket: agent-systems
abstract: >-
  Anthropic builds and commercializes the Claude model family, differentiating
  through AI safety research, constitutional AI training methods, and an
  expanding ecosystem of developer tools including MCP, Claude Code, and Agent
  Skills.
sources:
  - repos/helloruru-claude-memory-engine.md
  - repos/greyhaven-ai-autocontext.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/agent-skills-overview.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/getzep-graphiti.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/memorilabs-memori.md
  - deep/repos/anthropics-skills.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/repos/mem0ai-mem0.md
  - repos/canvas-org-meta-agent.md
related:
  - openai
  - cursor
  - claude
  - claude-code
  - mcp
  - agent-skills
  - claude-md
  - skill-md
  - openclaw
  - codex
  - mem0
  - vllm
  - ollama
  - pydantic
  - gemini
  - github-copilot
  - obsidian
  - react
  - context-engineering
  - bm25
  - progressive-disclosure
  - gepa
  - postgresql
  - neo4j
  - redis
  - entity-extraction
  - sqlite
last_compiled: '2026-04-07T11:36:24.232Z'
---
# Anthropic

## What It Does

Anthropic is an AI safety company that trains and deploys the [Claude](../projects/claude.md) family of large language models. Founded in 2021 by Dario Amodei, Daniela Amodei, and colleagues who left OpenAI, the company occupies an unusual position: it treats AI safety as a core research agenda while also building commercially deployed frontier models. This creates a dual mandate that shapes most of its architectural and product decisions.

The company's primary output is Claude, currently deployed as Claude 3.5 Sonnet, Claude 3.5 Haiku, and Claude 3 Opus, with the forthcoming Claude 4 family in development. Beyond the base models, Anthropic has built a growing developer ecosystem: the [Model Context Protocol](../concepts/mcp.md), [Claude Code](../projects/claude-code.md), [Agent Skills](../concepts/agent-skills.md), and the [SKILL.md](../concepts/claude-md.md) and [Skill Files](../concepts/skill-md.md) specification formats.

## Core Technical Differentiators

### Constitutional AI

Anthropic's primary published training innovation is Constitutional AI (CAI), introduced in their 2022 paper. Rather than relying purely on human feedback for RLHF, CAI trains models to critique and revise their own outputs according to a written set of principles (the "constitution"). This introduces a two-phase process: a supervised learning phase where the model generates and self-critiques responses, followed by RLHF against a preference model trained on AI-generated comparisons rather than exclusively human ones.

The practical consequence is that Claude models tend to refuse differently than GPT-4 or Gemini: refusals are typically more reasoned, hedged rather than categorical, and more willing to engage with edge cases. Whether this reflects genuine safety advantages or is primarily a UX distinction remains debated externally.

### Interpretability Research

Anthropic's Transformer Circuits team has published significant mechanistic interpretability work, including "Toy Models of Superposition" (2022) and "Towards Monosemanticity" (2023). The latter used sparse autoencoders to identify and manipulate individual features in a one-layer transformer. This research has not yet translated into direct product features, but it represents a genuine technical investment in understanding model internals rather than treating them as black boxes.

### Extended Context Handling

Claude models have supported 100k+ token context windows since Claude 2 (2023), reaching 200k tokens for Claude 3. The [Context Window](../concepts/context-window.md) size and handling quality matter substantially for the agent-memory use cases this wiki covers. Third-party evaluations have generally found Claude competitive with or superior to GPT-4 on long-context retrieval tasks, though self-reported benchmarks from Anthropic should be read with the standard caveat that internal evals are not independently validated.

## The Developer Ecosystem

Anthropic's most significant 2024-2025 contribution to agent infrastructure is the [Model Context Protocol](../concepts/mcp.md) (MCP), a standardized JSON-RPC protocol for connecting LLMs to external tools and data sources. MCP defines a client-server architecture where MCP servers expose tools, resources, and prompts to MCP clients (models or agents). The protocol achieved significant adoption within six months of release, with [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), [Obsidian](../projects/obsidian.md), and dozens of other tools implementing MCP servers.

[Claude Code](../projects/claude-code.md) is Anthropic's agentic coding product, deployed as a CLI tool that runs in terminal environments with access to the filesystem, shell, and web. It scores competitively on [SWE-bench](../projects/swe-bench.md), though whether its published numbers are independently validated varies by benchmark version.

The [Agent Skills](../concepts/agent-skills.md) system formalizes how Claude loads domain-specific knowledge. A skill is a folder with a `SKILL.md` file containing YAML frontmatter (`name`, `description`) plus markdown instructions. The description field drives triggering: Claude reads available skill descriptions and decides whether to load a skill's full content. This implements [Progressive Disclosure](../concepts/progressive-disclosure.md) at the agent-context level. Anthropic hosts a marketplace at agentskills.io and ships reference skills in their `anthropics/skills` repository.

The anthropics/skills repo serves three purposes simultaneously: the canonical spec for the Agent Skills standard, a curated marketplace of example skills, and the production source for Claude's document-handling capabilities (docx, xlsx, pptx, pdf). The most architecturally notable skill in that repo is `skill-creator`, a meta-skill that implements an eval-driven development loop for building other skills: interview for intent, write SKILL.md, run with-skill vs. baseline comparisons via LLM-as-judge, optimize the description via 60/40 train/test splits, iterate up to five cycles.

## Key Numbers

- **Funding**: $7.3 billion raised as of early 2024, with Amazon as the largest investor ($4 billion committed). Reported valuation ~$18 billion.
- **API pricing** (as of mid-2025): Claude 3.5 Sonnet at $3/$15 per million input/output tokens; Claude 3.5 Haiku at $0.80/$4. These are self-reported by Anthropic.
- **Context window**: 200k tokens for Claude 3 family. Self-reported.
- **SWE-bench**: Claude 3.5 Sonnet reported at 49% on SWE-bench Verified as of late 2024. This specific number has been subject to methodology questions in the community about test set contamination across frontier model evals generally.
- **MCP adoption**: Over 1,000 community MCP servers within the first few months of release. Community-reported, not independently audited.

## Strengths

**Long-context coherence**: Claude models consistently perform well on tasks requiring synthesis across large documents. For the retrieval and memory augmentation use cases in this wiki, this matters because a model that cannot reliably attend to injected context at position 80k of a 100k window defeats the purpose of retrieval pipelines.

**Instruction following and format adherence**: Claude is widely considered stronger than GPT-4 at following precise output format instructions (structured JSON, specific markdown schemas, constrained response types). This matters for memory systems like [Graphiti](../projects/graphiti.md), [Mem0](../projects/mem0.md), and similar projects that rely on structured LLM output for entity extraction and fact classification.

**Tool use and agentic reliability**: Claude 3.5 Sonnet's agentic performance on multi-step tasks has driven its adoption as the default model in most coding agent products. The anthropics/skills evaluation harness provides some evidence for this, though the internal eval methodology is not externally reproducible.

**Ecosystem coherence**: MCP, Claude Code, Agent Skills, and CLAUDE.md form a coherent stack for agentic workflows. A team building on this stack gets protocol interoperability (MCP), agentic coding (Claude Code), persistent procedural knowledge ([CLAUDE.md](../concepts/claude-md.md)), and domain skill distribution (Agent Skills) from one vendor.

## Critical Limitations

**Vendor lock-in through ecosystem depth**: The MCP + Claude Code + Agent Skills stack creates compounding switching costs. MCP is an open protocol, but Claude Code is Anthropic-specific, Agent Skills uses Claude-specific triggering semantics, and CLAUDE.md is a Claude-specific context injection mechanism. Switching models mid-project means rebuilding the agentic layer.

**Unspoken infrastructure assumption**: The progressive disclosure model for skills assumes the agent can reason well about which skills to load. The skill-creator documentation explicitly acknowledges "undertriggering" as a failure mode. This means the quality of skill-based context engineering degrades proportionally with model reasoning quality on ambiguous queries. A weaker model in the same skill framework will silently fail to load relevant context, with no error signaling.

**No runtime skill learning**: Skills are static files. The Agent Skills system has no mechanism for a skill to update itself based on execution outcomes. The skill-creator's eval loop closes this gap at development time but not at runtime. This contrasts with systems like [Acontext](../projects/anthropic.md) that implement learning pipelines from execution traces.

## When NOT to Use Anthropic/Claude

**Budget-constrained, high-volume inference**: At $3-15/million tokens for Claude 3.5 Sonnet, high-frequency agentic workflows (continuous background agents, streaming user interactions at scale) can become expensive. [Ollama](../projects/ollama.md) with locally-hosted models or [vLLM](../projects/vllm.md) for self-hosted serving eliminate per-token costs at the expense of infrastructure overhead and smaller context windows.

**Fully offline or air-gapped deployments**: Claude is API-only. There is no self-hosted Claude option. If your deployment cannot reach external APIs, Claude is not viable regardless of capability advantages.

**When you need reproducible evals**: Anthropic's internal benchmarks are not reproducible externally. If your selection criteria require independently validated benchmark performance, the published Claude numbers are insufficient evidence on their own.

**Multi-provider arbitrage workflows**: If your architecture routes different task types to different models (cheap small models for extraction, frontier models for synthesis), Anthropic's pricing structure and API design do not offer particular advantages over [OpenAI](../projects/openai.md), [Gemini](../projects/gemini.md), or open-weight alternatives accessed through [OpenRouter](../projects/openrouter.md) or [LiteLLM](../projects/litellm.md).

## Unresolved Questions

**Constitutional AI efficacy at scale**: CAI is published and peer-reviewed, but whether it produces meaningfully safer models at frontier scale relative to standard RLHF has not been independently established. Anthropic's safety claims are plausible but not verified by third parties with access to training processes.

**Governance of the Agent Skills marketplace**: The agentskills.io spec and anthropics/skills repo do not document a governance process for marketplace skills. Who reviews skills before they enter the curated marketplace? What criteria govern acceptance? What is the revocation process for a skill with bugs or security issues? These questions are unanswered in published documentation.

**MCP long-term compatibility**: MCP's specification governance currently sits with Anthropic. The protocol is openly licensed and has attracted wide adoption, but there is no independent standards body. Future breaking changes would be unilaterally controlled by Anthropic.

**Cost structure at agent scale**: The skill-creator documentation estimates a full description optimization eval run costs ~$3.85 for 20 queries over 5 iterations. The autocontext integration (a third-party system that uses Claude via Anthropic API) estimates $0.10-0.30 per session learning cycle for 30-55 LLM calls. At production scale with thousands of concurrent agent sessions, these costs compound in ways the current documentation does not address.

## Competitive Position

Anthropic competes directly with [OpenAI](../projects/openai.md) on frontier model capability and developer tooling, and with [Google Gemini](../projects/gemini.md) on enterprise deployment. For coding-specific applications, it competes with [GitHub Copilot](../projects/github-copilot.md) (for IDE integration) and [OpenAI Codex](../projects/codex.md).

**Use Claude when**: Long-context reasoning, precise instruction following, and agentic multi-step task completion are primary requirements. The MCP + Claude Code stack provides strong coherence for teams building on Anthropic's ecosystem.

**Use OpenAI when**: Maximum third-party tool compatibility (most libraries default to OpenAI), function calling with complex schemas, or lower-cost high-volume inference via GPT-4o-mini are priorities.

**Use Gemini when**: Native multimodal (audio/video) input, Google Cloud integration, or very long context windows (Gemini 1.5 Pro's 1M token context) are required.

**Use open-weight models via Ollama or vLLM when**: Air-gapped deployment, cost elimination at scale, or full control over fine-tuning and weight access are requirements.

## Related Concepts

- [Model Context Protocol](../concepts/mcp.md): Anthropic's open protocol for LLM-to-tool communication
- [Claude Code](../projects/claude-code.md): Anthropic's agentic coding product
- [Agent Skills](../concepts/agent-skills.md): The SKILL.md-based knowledge distribution system
- [CLAUDE.md](../concepts/claude-md.md): Project-specific context injection convention
- [Skill Files](../concepts/skill-md.md): The broader skill file pattern
- [Context Engineering](../concepts/context-engineering.md): The discipline Claude's tooling operationalizes
- [Progressive Disclosure](../concepts/progressive-disclosure.md): The architectural pattern Agent Skills implements
- [ReAct](../concepts/react.md): The reasoning pattern Claude Code uses for agentic loops
- [Context Window](../concepts/context-window.md): Claude's 200k-token capacity and its implications

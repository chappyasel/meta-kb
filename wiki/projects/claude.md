---
entity_id: claude
type: project
bucket: agent-systems
abstract: >-
  Anthropic's family of large language models, deployed as the intelligence
  backbone for coding agents, knowledge pipelines, and autonomous systems like
  Claude Code and GEPA-optimized agents.
sources:
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - repos/helloruru-claude-memory-engine.md
  - repos/aiming-lab-simplemem.md
  - repos/memodb-io-acontext.md
  - repos/natebjones-projects-ob1.md
  - repos/karpathy-autoresearch.md
  - repos/anthropics-skills.md
  - repos/greyhaven-ai-autocontext.md
  - repos/letta-ai-letta-code.md
  - repos/jmilinovich-goal-md.md
  - repos/evoagentx-evoagentx.md
  - repos/yusufkaraaslan-skill-seekers.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/anthropics-skills.md
  - deep/repos/jmilinovich-goal-md.md
related:
  - andrej-karpathy
  - anthropic
  - openai
  - cursor
  - mcp
  - claude-code
  - agent-skills
  - rag
  - autoresearch
  - windsurf
  - gemini
  - gepa
  - skill-md
  - claude-md
  - self-improving-agents
last_compiled: '2026-04-06T01:57:31.502Z'
---
# Claude

## What It Does

Claude is Anthropic's family of large language models. The current generation spans Claude 3 Opus, Sonnet, and Haiku (and newer Claude 4 variants including Haiku 4.5), covering a performance-to-cost spectrum from heavyweight reasoning to cheap, fast inference. In the agent-systems space, Claude functions less as an end product and more as a substrate: the model that reads SKILL.md files, executes [GEPA](../concepts/gepa.md) reflection loops, interprets [claude.md](../concepts/claude-md.md) project configuration, and powers tools like [Claude Code](../projects/claude-code.md) and [Cursor](../projects/cursor.md).

The architecturally relevant fact about Claude for builders is not raw benchmark scores but its integration surface: Anthropic ships Claude with the [Model Context Protocol](../concepts/mcp.md), the [Agent Skills](../concepts/agent-skills.md) system, and a structured context window designed for multi-step agentic work.

## How It Works

Claude's public architecture follows a standard transformer decoder design. Anthropic does not publish weights, layer counts, or training details. What matters for agent-systems builders is the operational model:

**Context window and structured input**: Current Claude models support 200k token context windows. Agent frameworks like [LangGraph](../projects/langgraph.md) and [LangChain](../projects/langchain.md) exploit this via context stuffing. [RAG](../concepts/rag.md) pipelines use it selectively to avoid paying for tokens that do not improve output. The [claude.md](../concepts/claude-md.md) convention places project-level instructions at the top of this window, shaping Claude's behavior for an entire session without per-request prompt overhead.

**Tool use and MCP**: Claude supports structured tool calling, which [Model Context Protocol](../concepts/mcp.md) standardizes into a composable plugin layer. The `mcp-builder` skill in Anthropic's skills repository demonstrates Claude using this surface to generate new MCP servers from documentation.

**Agent Skills**: The [anthropics/skills](https://github.com/anthropics/skills) repository (110k stars) defines a three-tier progressive disclosure pattern where Claude loads YAML-frontmattered SKILL.md files on demand. Claude reads the `description` field to decide whether to activate a skill, then loads the instruction body, then pulls bundled scripts and reference files as needed. This is the architecture that lets Claude Code users install document-creation or API-helper skills via `/plugin install`.

**GEPA as Claude optimizer**: [GEPA](../concepts/gepa.md) (ICLR 2026 Oral) uses Claude as both the task model and the reflection model. Claude Haiku 4.5 with GEPA-evolved Bleve skills improved from 79.3% to 98.3% resolve rate on [SWE-Bench](../projects/swe-bench.md)-style tasks, with execution time dropping from 173s to 142s. Skills evolved on cheaper models (gpt-5-mini) transferred to Claude Haiku 4.5 with no degradation. This cross-model transfer is practically significant: optimize on cheap inference, deploy on Claude.

**Self-improving agent substrate**: In [Self-Improving Agents](../concepts/self-improving-agents.md) architectures like the Darwin Gödel Machine and [EvoAgentX](../projects/evoagentx.md), Claude operates as the agent being improved, the evaluator scoring outputs, and sometimes the optimizer proposing mutations. The separation between these roles matters for avoiding metric gaming.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| GitHub stars (anthropics/skills) | 110,064 | Repository, self-reported |
| GEPA Bleve task improvement (Claude Haiku 4.5) | 79.3% → 98.3% | GEPA paper, self-reported |
| GEPA Jinja task improvement (Claude Haiku 4.5) | 93.9% → 100% | GEPA paper, self-reported |
| Context window | 200k tokens | Anthropic docs, self-reported |
| Cost reduction via GEPA (Databricks) | 90x vs Claude Opus 4.1 | GEPA paper, third-party claim |

Benchmark credibility is mixed. The GEPA results are from Anthropic-adjacent research (ICLR peer-reviewed) but measured by the GEPA team itself. Databricks' 90x cost reduction claim is third-party but comes from a single production deployment with no published methodology.

## Strengths

**Long-context instruction following**: Claude performs well on tasks requiring careful adherence to multi-section system prompts. This is why [claude.md](../concepts/claude-md.md) and [skill.md](../concepts/skill-md.md) architectural patterns emerged around Claude specifically, not just LLMs generally.

**Agentic tool use**: Claude's structured tool-calling surface handles multi-turn, multi-tool agent loops without the degradation seen in models trained primarily for chat. [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and [Windsurf](../projects/windsurf.md) all use Claude as a core execution engine for coding tasks.

**Cross-model knowledge transfer**: GEPA's gskill results demonstrate that skills optimized against cheaper models transfer to Claude with accuracy gains intact. This makes Claude a viable production target for systems that do optimization on cheaper infrastructure.

**Ecosystem integration**: Anthropic ships first-party integrations with [MCP](../concepts/mcp.md), the Agent Skills marketplace, and the [Agent Skills](../concepts/agent-skills.md) specification at agentskills.io. Third-party ecosystems like [LiteLLM](../projects/litellm.md), [LangChain](../projects/langchain.md), and [DSPy](../projects/dspy.md) treat Claude as a primary target.

## Critical Limitations

**Concrete failure mode — description-triggered skill undertriggering**: The Agent Skills system triggers skills based on Claude's semantic interpretation of the `description` SKILL.md field. The official skill-creator documentation warns that Claude tends not to invoke skills when they would be useful. The mitigation is writing aggressive descriptions, but this creates a precision problem: overly broad descriptions trigger on irrelevant queries. There is no programmatic fallback, no file-pattern trigger, no project-type detector. A skill that does not trigger is functionally absent regardless of how well its instructions are written.

**Unspoken infrastructure assumption**: Claude is a closed API. Every agent loop, skill activation, GEPA reflection call, and MCP tool execution goes through Anthropic's inference endpoints. Builders who deploy Claude as the backbone of a self-improving agent system are accumulating latency, cost, and reliability exposure on a single vendor. The GEPA paper's Databricks case (90x cost reduction by replacing Claude Opus 4.1 with open-source + GEPA) demonstrates that this exposure is real and measurable, not theoretical.

## When NOT to Use It

**High-volume, low-margin inference**: GEPA's Databricks case is the canonical example. If you are running thousands of agent evaluations per optimization run, Claude's per-token cost makes the economics unsustainable. Use a smaller open-source model for the optimization loop and reserve Claude for production deployment.

**Air-gapped or compliance-constrained environments**: Claude's API requires outbound network calls to Anthropic. Regulated industries (healthcare, defense, certain financial contexts) with data residency or air-gap requirements cannot use Claude without Anthropic's enterprise data agreements. [Ollama](../projects/ollama.md) or [vLLM](../projects/vllm.md) with local models are the alternatives here.

**When you need reproducible, deterministic outputs**: Claude's outputs are not deterministic even at temperature 0. For pipelines requiring byte-for-byte reproducibility across runs (some compliance workflows, certain testing frameworks), this is a hard constraint.

**When benchmark overfitting is a concern**: Claude models are trained partly on RLHF against human preferences, and there are reasonable concerns about evaluation contamination on widely-used benchmarks like [SWE-Bench](../projects/swe-bench.md). If your target task closely resembles a published benchmark, independent evaluation on held-out data matters more than published scores.

## Unresolved Questions

**Governance of the Agent Skills marketplace**: The marketplace.json manifest and the agentskills.io specification are Anthropic-controlled. There is no published process for community skill submission, quality review, or removal. Skills with 110k repository stars carry implicit endorsement but no formal certification.

**Cost at scale for agentic loops**: A single GEPA optimization run with Claude as the reflection model involves hundreds of LLM calls. Anthropic does not publish rate limits or batch pricing for agentic workloads in a way that lets builders model costs before deployment.

**Conflict resolution between SKILL.md instructions and claude.md**: When a project-level [claude.md](../concepts/claude-md.md) sets behavioral defaults and a SKILL.md overrides them, Claude's priority ordering is not formally specified. The documentation describes both systems but does not address conflicts.

**Skill quality assurance at runtime**: Skills can execute bundled scripts without those scripts appearing in context. There is no sandboxing specification, no permission model beyond the experimental `allowed-tools` frontmatter field, and no published audit trail for what scripts execute during a skill-powered session.

## Alternatives

**[OpenAI](../projects/openai.md) (GPT-4o, o3)**: Use when you need the broadest third-party ecosystem support, or when your team has existing OpenAI infrastructure. GPT-4o has comparable context length. [OpenAI Codex](../projects/openai-codex.md) specifically targets coding tasks. Selection guidance: prefer OpenAI when your toolchain is already built around the OpenAI SDK and switching cost outweighs Claude's agentic advantages.

**[Gemini](../projects/gemini.md)**: Use when you need 1M+ token context windows for document-heavy RAG pipelines or when you are already on Google Cloud infrastructure. Gemini 1.5 Pro's context length exceeds Claude's by 5x, which matters for [GraphRAG](../projects/graphrag.md)-style full-document processing.

**[DeepSeek](../projects/deepseek.md)**: Use when cost is the primary constraint and you can tolerate higher latency and less predictable availability. DeepSeek's open weights enable self-hosting, removing the vendor dependency that Claude carries.

**[Ollama](../projects/ollama.md) + local models**: Use for air-gapped environments, compliance-constrained deployments, or GEPA-style optimization loops where per-call cost matters. Loses Claude's long-context instruction following and first-party integrations.

**[DSPy](../projects/dspy.md) with model-agnostic optimization**: When your primary goal is prompt optimization rather than a specific model's capabilities, DSPy's GEPA adapter (`dspy.GEPA`) lets you optimize programs against any model. This decouples optimization from deployment and lets Claude serve as the production target without being the optimization substrate.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md) — the skill plugin system Claude implements
- [claude.md](../concepts/claude-md.md) — project-level context file for shaping Claude's behavior
- [skill.md](../concepts/skill-md.md) — the SKILL.md format specification
- [GEPA](../concepts/gepa.md) — evolutionary prompt optimizer that uses Claude as both task and reflection model
- [Model Context Protocol](../concepts/mcp.md) — tool-calling standard Claude implements
- [Context Engineering](../concepts/context-engineering.md) — broader discipline of structuring Claude's input
- [Self-Improving Agents](../concepts/self-improving-agents.md) — agent architectures that use Claude as substrate
- [Retrieval-Augmented Generation](../concepts/rag.md) — common pipeline pattern with Claude as the generation step
- [Claude Code](../projects/claude-code.md) — Anthropic's coding agent built on Claude
- [Agent Memory](../concepts/agent-memory.md) — memory architectures that inform Claude's context

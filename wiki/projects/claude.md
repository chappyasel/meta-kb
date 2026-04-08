---
entity_id: claude
type: project
bucket: agent-architecture
abstract: >-
  Anthropic's production LLM family (Haiku/Sonnet/Opus), the primary backbone
  for agentic systems, differentiated by native tool use, 200K context, and a
  growing skills/MCP ecosystem rather than raw benchmark scores.
sources:
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/anthropics-skills.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/jmilinovich-goal-md.md
  - repos/anthropics-skills.md
  - repos/canvas-org-meta-agent.md
  - repos/caviraoss-openmemory.md
  - repos/evoagentx-evoagentx.md
  - repos/greyhaven-ai-autocontext.md
  - repos/helloruru-claude-memory-engine.md
  - repos/jackchen-me-open-multi-agent.md
  - repos/jmilinovich-goal-md.md
  - repos/memodb-io-acontext.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/supermemoryai-supermemory.md
  - repos/yusufkaraaslan-skill-seekers.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/godofprompt-breaking-mipt-just-ran-the-largest-ai-agent-co.md
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
related:
  - andrej-karpathy
  - cursor
  - openai
  - autoresearch
  - model-context-protocol
  - retrieval-augmented-generation
  - context-engineering
  - windsurf
  - gemini
  - claude-code
  - anthropic
  - agent-skills
  - multi-agent-systems
  - openclaw
  - langchain
  - agent-memory
  - progressive-disclosure
  - long-term-memory
  - grpo
  - context-management
  - vector-database
  - gpt-4
  - human-in-the-loop
  - continual-learning
  - github-copilot
  - autogen
  - temporal-reasoning
  - tau-bench
  - prompt-optimization
  - observability
  - system-prompt
  - termination-bench
  - abductive-context
  - chatgpt
  - llama-cpp
  - gepa
  - meta-agent
  - reinforcement-learning
last_compiled: '2026-04-08T22:55:45.563Z'
---
# Claude

## What It Does

Claude is Anthropic's family of large language models, currently spanning three capability tiers: Haiku (fast, cheap), Sonnet (balanced), and Opus (highest capability). The models power a wide range of agentic deployments — from [Cursor](../projects/cursor.md) and [Windsurf](../projects/windsurf.md) coding assistants to multi-agent research pipelines like [AutoResearch](../projects/autoresearch.md).

The architectural differentiator is not a single technique but an ecosystem: native tool use, 200K token context windows, [Model Context Protocol](../concepts/model-context-protocol.md) support, a growing [Agent Skills](../concepts/agent-skills.md) marketplace, and a Claude Agent SDK that other projects build against. Claude is not just a model — it is increasingly a runtime for agentic behavior.

## Model Tiers and Selection

| Model | Use Case | Cost Profile |
|-------|----------|--------------|
| Haiku | High-volume subagents, latency-sensitive loops | Lowest |
| Sonnet | Default workhorse for complex agentic tasks | Mid |
| Opus | Reflection, judgment, proposer roles | Highest |

The version numbering (3.5, 4, 4.5, 4.6) tracks training generations; Anthropic releases variants within tiers (e.g., Claude Haiku 4.5) rather than replacing the full tier simultaneously.

A recurring pattern in the ecosystem: run primary agent tasks on Haiku or Sonnet, route reflection and judgment calls to Opus. The [meta-agent](../concepts/meta-agent.md) architecture that improved tau-bench airline accuracy from 67% to 87% used Haiku 4.5 as the task agent and Opus 4.6 as the proposer. [GEPA](../concepts/gepa.md) follows the same split: cheaper models run the evaluation minibatches, a more capable model reads the traces and proposes mutations. [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)

## Core Mechanism: How Claude Operates in Agentic Contexts

### Tool Use and the Agent SDK

Claude's tool use API accepts a list of tool definitions (JSON Schema), and Claude emits structured tool calls that the host application executes. The Claude Agent SDK extends this to multi-step agentic loops with lifecycle hooks — points where the harness can intercept and modify behavior between steps. This is the layer that projects like meta-agent optimize: not the model weights but the harness configuration, system prompts, and tool definitions surrounding them.

Meta-harness research (Lee et al. 2026) found that hand-engineered harnesses on Claude Haiku 4.5 moved TerminalBench-2 scores from 27.5% to 35.5% with no fine-tuning, purely through harness optimization. [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)

### Agent Skills System

The [Agent Skills](../concepts/agent-skills.md) system is Claude's mechanism for dynamic, modular capability loading. Skills are self-contained folders with a `SKILL.md` file containing YAML frontmatter (`name`, `description`) and markdown instructions. Claude decides whether to load a skill based solely on the description field — a semantic trigger, not a programmatic one.

The [Anthropic skills repository](../projects/anthropic.md) (110,064 stars, 12,399 forks) implements a three-tier progressive disclosure pattern:

1. **Metadata tier** (~100 tokens, always in context): The `name` and `description` from YAML frontmatter. Claude reads these for all installed skills on every turn.
2. **SKILL.md body** (loaded on trigger, target <5000 tokens): Full instructions loaded when Claude decides this skill is relevant.
3. **Bundled resources** (loaded on demand): Scripts, reference files, assets. Can be arbitrarily large since they are not loaded into context unless explicitly referenced.

This architecture solves the tension between rich domain knowledge and finite context windows. A skill like `claude-api` can bundle 20+ reference files across 8 programming languages — only the relevant language's docs enter context when triggered. [Source](../raw/deep/repos/anthropics-skills.md)

Install via Claude Code:
```bash
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
```

### Context Window and Memory

At 200K tokens, Claude handles long documents and extended conversation histories. But raw context length is only part of the picture — [Context Engineering](../concepts/context-engineering.md) patterns determine what fills that window. Projects routing through Claude typically implement:

- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) for external knowledge
- [Progressive Disclosure](../concepts/progressive-disclosure.md) for skill and tool loading
- [Context Compression](../concepts/context-compression.md) when windows get expensive

The [lost-in-the-middle](../concepts/lost-in-the-middle.md) problem applies to Claude as to all transformers: retrieval quality matters more than context quantity.

### Model Context Protocol

MCP provides a standardized interface for connecting Claude to external tools, data sources, and services. Where the skills system handles modular *capabilities* (how Claude reasons and acts), MCP handles *integrations* (what Claude can access). The two compose: an MCP-builder skill in the anthropics/skills repo implements a four-phase process for generating new MCP servers (research, implement, review, evaluate). [Source](../raw/deep/repos/anthropics-skills.md)

## Key Numbers

**Skills repository:** 110,064 stars, 12,399 forks (GitHub, as of source date). These numbers reflect the skills repo specifically, not Claude's broader adoption — a proxy for developer ecosystem engagement rather than model usage.

**Agentic benchmarks** (self-reported by Anthropic and third-party researchers):
- [SWE-bench](../projects/swe-bench.md): Claude Sonnet variants consistently appear in top results; specific numbers shift with each model release
- [tau-bench](../projects/tau-bench.md) airline: baseline Haiku 4.5 reaches 67%; with harness optimization, 87% [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)
- [TerminalBench](../projects/termination-bench.md): vanilla Claude Code + Haiku 4.5 scores 27.5%; best hand-engineered harness on same model reaches 35.5% [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)
- GEPA-evolved skills on Claude Haiku 4.5: Bleve repository 79.3% → 98.3% resolve rate; Jinja 93.9% → 100% [Source](../raw/deep/repos/gepa-ai-gepa.md)

Most benchmark numbers are self-reported or reported by research teams with obvious interest in positive results. Independent replication is limited. Treat all specific percentages as directional indicators rather than ground truth.

## Strengths

**Instruction following at scale.** Claude reliably executes complex, multi-part instructions — the prerequisite for agentic loops where the model must follow a harness's behavioral constraints across many turns. Anthropic's Constitutional AI training explicitly targets this.

**Native tool use quality.** Claude's tool call formatting is consistent and well-structured, reducing parse errors in agentic pipelines. This matters more than raw benchmark scores for production deployments.

**Skills ecosystem depth.** The anthropics/skills repo includes production document skills (PDF, DOCX, XLSX, PPTX) actively used in Claude.ai, plus a `skill-creator` meta-skill that implements a full eval-driven development loop with LLM-as-judge grading. This is real infrastructure, not demos.

**Skill transfer from optimization.** GEPA-evolved skills on weaker Claude models transfer to production deployments. Skills learned on gpt-5-mini transferred to Claude Haiku 4.5 with accuracy gains. The implication: Claude's behavior is sufficiently consistent that optimization on proxies generalizes. [Source](../raw/deep/repos/gepa-ai-gepa.md)

**Reflective roles in multi-agent systems.** Claude Opus consistently appears as the "reflection" or "proposer" model in multi-agent architectures — the component that reads traces, diagnoses failures, and suggests fixes. This role requires sustained reasoning about meta-level system behavior, a capability where Claude competes well.

## Critical Limitations

**Undertriggering on skills.** The skills triggering mechanism is purely semantic — Claude reads description fields and decides whether to load a skill. The anthropics/skills repo explicitly warns that Claude tends not to invoke skills when it should. The mitigation is "aggressive" description writing, but this creates a precision tradeoff: broader descriptions trigger on irrelevant queries, narrow ones miss relevant ones. There is no programmatic trigger mechanism. [Source](../raw/deep/repos/anthropics-skills.md)

**Infrastructure assumption:** Claude's agentic capabilities assume a reliable, low-latency connection to Anthropic's API. Multi-agent systems that run many concurrent Claude calls (each subagent, each reflection call, each skill evaluation) encounter rate limits and cost accumulation that are not obvious from single-model benchmarks. A pipeline that looks efficient in testing can become expensive and throttled at production volume. No published guidance from Anthropic on rate limit behavior for agentic workloads.

## When NOT to Use Claude

**When you need local/air-gapped deployment.** Claude is API-only. [llama.cpp](../projects/llama.cpp) or [Ollama](../projects/ollama.md) serve requirements where data cannot leave the network perimeter.

**When cost per token is the primary constraint.** For high-volume inference (millions of calls), open-source models served via [vLLM](../projects/vllm.md) undercut Claude significantly. Claude's quality advantage narrows at scale if the task is routine classification or extraction.

**When you need transparent weights.** Anthropic does not publish Claude's weights. Fine-tuning, interpretability research, and deployment flexibility require open models.

**When latency is under 100ms.** Claude's API round-trip, even for Haiku, adds latency that disqualifies real-time interactive applications. Local models win here.

**When benchmark reproducibility matters.** Claude's behavior changes across model versions without versioned weights. If you need bit-identical reproducibility across time (e.g., scientific replication), API-only models are a liability.

## Unresolved Questions

**Skill governance at scale.** The anthropics/skills marketplace pattern (`.claude-plugin/marketplace.json`) enables bundle distribution, but there is no published schema validation, no conflict resolution when two skills describe overlapping domains, and no mechanism for skill versioning in production. What happens when an update to the `pdf` skill breaks a downstream pipeline? [Source](../raw/deep/repos/anthropics-skills.md)

**Rate limits and multi-agent cost.** No public documentation on how Anthropic handles concurrent agentic workloads — pipelines that make 10-50 simultaneous Claude calls per user action. Production deployments in the ecosystem (Cursor, Windsurf) presumably have private rate limit agreements.

**Skill quality in the long tail.** The skill-creator meta-skill documents that a full eval loop costs ~300 LLM calls (20 queries × 3 runs × 5 iterations). For community-contributed skills outside Anthropic's curated set, there is no quality floor. The marketplace has no verification mechanism.

**Constitutional AI alignment vs. agentic autonomy.** Anthropic's safety training sometimes produces refusals that frustrate agentic tasks — the model declines to take an action a harness has explicitly sanctioned. The `allowed-tools` field in SKILL.md frontmatter is marked "experimental" and support varies across surfaces. The governance of agent permissions is unresolved. [Source](../raw/deep/repos/anthropics-skills.md)

## Alternatives

| Model | When to Use Instead |
|-------|---------------------|
| [GPT-4](../projects/gpt-4.md) / [GPT-4o](../projects/gpt-4o.md) | When you need OpenAI ecosystem compatibility, function calling with mature tooling, or DALL-E integration |
| [Gemini](../projects/gemini.md) | When context windows >200K matter (Gemini 1.5 Pro offers 1M), or when Google Cloud integration is required |
| [Qwen](../projects/qwen.md) | When open weights and fine-tuning flexibility matter more than frontier capability |
| [llama.cpp](../projects/llama.cpp) / [Ollama](../projects/ollama.md) / [vLLM](../projects/vllm.md) | When local deployment, air-gap requirements, or cost at scale drives the decision |

For coding agent use cases specifically: [Claude Code](../projects/claude-code.md) wraps Claude with terminal integration, file system access, and the skills marketplace, making it more relevant than raw API access.

## Ecosystem Position

Claude sits at the center of a growing infrastructure layer. [LangChain](../projects/langchain.md) and [AutoGen](../projects/autogen.md) treat it as one of several backend options. [Claude Code](../projects/claude-code.md) is the primary surface for developer-facing agentic work. [OpenClaw](../projects/openclaw.md) and [AutoResearch](../projects/autoresearch.md) build loops on top of the API directly.

The skills system, MCP, and the Claude Agent SDK represent Anthropic's bid to make Claude not just a model but a platform — where the value accumulates in the ecosystem of skills, harnesses, and integrations rather than in the weights alone. Whether this succeeds depends on whether the developer community adopts the SKILL.md format at sufficient scale to create network effects. At 110K stars on the skills repo, there is momentum, but the ecosystem is still in early formation.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Model Context Protocol](../concepts/model-context-protocol.md)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md)
- [GEPA](../concepts/gepa.md)
- [Meta-Agent](../concepts/meta-agent.md)
- [Human-in-the-Loop](../concepts/human-in-the-loop.md)
- [Progressive Disclosure](../concepts/progressive-disclosure.md)
- [Prompt Optimization](../concepts/prompt-optimization.md)
- [Reinforcement Learning](../concepts/reinforcement-learning.md)

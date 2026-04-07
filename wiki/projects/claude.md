---
entity_id: claude
type: project
bucket: agent-systems
abstract: >-
  Anthropic's frontier LLM family (Haiku, Sonnet, Opus) with 200K context
  windows, constitutional AI training, and extended thinking; primary
  differentiator is top-tier coding/reasoning performance and first-party
  agentic infrastructure (Claude Code, MCP, Agent Skills).
sources:
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - repos/aiming-lab-simplemem.md
  - repos/helloruru-claude-memory-engine.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - tweets/ericosiu-how-to-practically-deploy-jack-dorsey-s-world-int.md
  - repos/memodb-io-acontext.md
  - repos/anthropics-skills.md
  - repos/natebjones-projects-ob1.md
  - repos/greyhaven-ai-autocontext.md
  - repos/caviraoss-openmemory.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/jmilinovich-goal-md.md
  - repos/thedotmack-claude-mem.md
  - repos/letta-ai-letta-code.md
  - repos/evoagentx-evoagentx.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/anthropics-skills.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/canvas-org-meta-agent.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
related:
  - mcp
  - claude-md
  - andrej-karpathy
  - rag
  - openai
  - cursor
  - anthropic
  - autoresearch
  - openclaw
  - gemini
  - claude-code
  - agent-skills
  - codex
  - gepa
  - meta-agent
  - skill-md
  - tau-bench
  - windsurf
  - progressive-disclosure
  - mem0
  - vector-database
  - langgraph
  - continual-learning
  - grpo
  - ollama
  - gpt-4
  - litellm
  - swe-bench
  - context-compression
  - embedding-model
  - catastrophic-forgetting
  - decision-traces
last_compiled: '2026-04-07T11:36:34.317Z'
---
# Claude

## What It Is

Claude is Anthropic's family of large language models, spanning three tiers: Haiku (fast, cheap), Sonnet (balanced), and Opus (most capable). Current production models as of mid-2026 include Claude Haiku 4.5, Claude Sonnet 4.x, and Claude Opus 4.6. All models share a 200K token context window. Anthropic trains Claude using Constitutional AI (CAI) and Reinforcement Learning from Human Feedback (RLHF), with an explicit safety orientation built into the training process rather than bolted on post-hoc.

Claude sits at the center of a growing agentic infrastructure stack: the [Model Context Protocol](../concepts/mcp.md) for tool connectivity, [Agent Skills](../concepts/agent-skills.md) / [SKILL.md](../concepts/skill-md.md) for procedural knowledge, [CLAUDE.md](../concepts/claude-md.md) for project-level agent configuration, and [Claude Code](../projects/claude-code.md) as the primary coding agent surface. This makes Claude unusual among frontier models: [Anthropic](../projects/anthropic.md) builds and ships the full agent stack, not just the model.

## Model Tiers

**Haiku 4.5** — Fastest, cheapest. Used for high-frequency tasks, inner loops in agent pipelines, and latency-sensitive applications. Benchmarks show it achieves 79.3% on SWE-bench Verified with GEPA-evolved skills, rising to 98.3% after skill optimization — suggesting the base capability is bottlenecked more by task knowledge than raw model capacity. [Source](../raw/deep/repos/gepa-ai-gepa.md)

**Sonnet** — The workhorse tier. Recommended for most production agentic workloads.

**Opus 4.6** — Highest capability, highest cost. Used as the proposer/reflection model in multi-model pipelines (e.g., meta-agent uses Opus 4.6 as proposer with Haiku 4.5 as the task agent). Achieves 79.2% on SWE-bench Verified. [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)

## Architecturally Notable Features

### Extended Thinking
Claude Opus and Sonnet support extended thinking — a scratchpad reasoning mode where the model produces explicit chain-of-thought before responding. This is distinct from standard generation and uses separate token budgets. Critical for complex multi-step tasks where reasoning transparency matters.

### Constitutional AI Training
Anthropic's training methodology involves Claude critiquing and revising its own outputs against a set of constitutional principles. This differs from RLHF alone: rather than purely learning from human preference labels, Claude learns from a policy document. The practical effect is more consistent refusal behavior and better calibration on edge cases, though it also produces brittleness in some adjacent-to-sensitive domains.

### Agent Skills Integration
Claude is the reference implementation for the [Agent Skills](../concepts/agent-skills.md) specification at agentskills.io. Skills are SKILL.md files using three-tier progressive disclosure: ~100-token metadata always in context for routing decisions, full instructions loaded on trigger, bundled resources loaded on demand. Claude reads skill descriptions and decides whether to load a skill semantically — there is no programmatic trigger mechanism. This means description quality directly controls whether a skill fires. [Source](../raw/deep/repos/anthropics-skills.md)

### MCP-Native
Claude is built with first-party [Model Context Protocol](../concepts/mcp.md) support. MCP handles tool connectivity (what the agent can access); Skills handle procedural knowledge (how to use those tools). The two systems are complementary: a skill can instruct Claude to use a specific MCP server and how to interpret its outputs.

## Key Benchmarks

| Metric | Value | Source |
|--------|-------|--------|
| SWE-bench Verified (Opus 4.6) | 79.2% | Self-reported [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md) |
| SWE-bench Verified (Haiku 4.5 + GEPA skills, Jinja) | 93.9% → 100% | Self-reported [Source](../raw/deep/repos/gepa-ai-gepa.md) |
| SWE-bench Verified (Haiku 4.5 + GEPA skills, Bleve) | 79.3% → 98.3% | Self-reported [Source](../raw/deep/repos/gepa-ai-gepa.md) |
| TAU-bench v3 airline (Haiku 4.5, baseline) | 67% | Independent benchmark [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md) |
| TAU-bench v3 airline (Haiku 4.5 + meta-agent) | 87% | Single-run, not independently replicated [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md) |

**Credibility assessment:** SWE-bench Verified is a well-established third-party benchmark with a held-out test set — these numbers carry more weight than benchmark-specific evals. The GEPA skill transfer results are self-reported by GEPA's authors with Anthropic models as subjects, not by Anthropic. The TAU-bench meta-agent results are single-run on a 50-task split; the authors explicitly note plans to add variance estimates. Treat performance claims with appropriate skepticism outside SWE-bench.

## Strengths

**Coding and agentic tasks.** Claude consistently ranks at or near the top on software engineering benchmarks. The combination of strong base capability, tool use, and first-party agentic infrastructure (Claude Code, MCP, Skills) makes it the default choice for coding agent pipelines.

**Long-context coherence.** 200K context window with strong performance across the full range. Other models with similar windows degrade more noticeably at the far end.

**Instruction following.** Constitutional AI training produces unusually consistent adherence to complex, multi-part instructions. This matters for agentic pipelines where the agent must follow structured protocols.

**Skill optimization target.** Claude models, especially Haiku 4.5, show strong improvement from GEPA-style skill evolution. The meta-agent results show that harness-level optimization (proposer: Opus 4.6, task agent: Haiku 4.5) can push Haiku from 67% to 87% on TAU-bench — suggesting Haiku's base capability leaves significant room for harness-level gains that Opus does not need. [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)

**Multi-model pipeline participation.** Claude models appear as both task agents (Haiku 4.5, Sonnet) and reflection/proposer models (Opus 4.6) across GEPA, meta-agent, and skill-creator. The tiered pricing structure makes mixed-model pipelines economically viable.

## Critical Limitations

**Concrete failure mode — skill triggering reliability.** Skills trigger purely on semantic matching between user requests and skill descriptions. There is no programmatic trigger fallback. The skill-creator documentation explicitly warns about "undertriggering" — Claude will not invoke a skill even when it should, unless the description is written to be "a little bit pushy." This is not a fringe edge case; it is the primary adoption friction for the Skills ecosystem. An agent that sometimes skips the relevant skill without warning is difficult to debug and unpredictable in production. [Source](../raw/deep/repos/anthropics-skills.md)

**Infrastructure assumption — Anthropic API availability.** Claude is API-only from Anthropic (no weights released). Every Claude deployment depends on Anthropic's infrastructure, pricing, rate limits, and policy decisions. Unlike [Ollama](../projects/ollama.md)-served open models, Claude cannot run on-premises or air-gapped. Organizations with data residency requirements, security constraints against third-party API calls, or need for cost predictability at scale face a hard constraint here that no architectural workaround resolves.

## When NOT to Use Claude

**Air-gapped or on-premises deployments.** Claude requires API access to Anthropic's servers. If your threat model, compliance requirements, or network architecture prohibits outbound API calls to third parties, Claude does not fit. Use a self-hosted open model instead.

**High-volume, latency-critical inner loops where cost scales poorly.** Even Haiku has per-token costs. At sufficient scale, the economics favor fine-tuned open models or lighter inference. Benchmark your actual workload cost before committing.

**Applications requiring full model transparency or auditability.** Anthropic does not publish model weights, architecture details, or training data composition. If your compliance or research requirements demand auditability of the model itself, not just its outputs, Claude is the wrong choice.

**Tasks where constitutional training creates friction.** CAI training produces consistent, calibrated refusals, but adjacent-to-sensitive tasks sometimes hit unexpected walls. Security research, adversarial red-teaming, and certain creative writing domains can be harder to prompt reliably compared to models with looser safety training. This varies by Claude version and task specifics.

## Unresolved Questions

**Governance of the Skills marketplace at scale.** The security analysis of community skills found a 26.1% vulnerability rate across 42,447 skills, with 54.1% of confirmed malicious cases attributable to a single industrialized actor. [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) Anthropic's proposed four-tier trust governance model (static analysis, semantic classification, dynamic sandboxing, full verification) exists as a proposal, not a deployed system. What Anthropic's actual security gates are for the agentskills.io marketplace is not documented publicly.

**Phase transition in skill library size.** Research shows skill routing accuracy degrades sharply past a critical library size. Anthropic has not published what that threshold is for Claude specifically or how they plan to handle it as the Skills marketplace grows.

**Cost at scale for Opus-as-reflector patterns.** Using Opus 4.6 as the proposer/reflection model in meta-agent and GEPA-style pipelines produces strong results, but the per-iteration cost (Opus calls for each reflection + Haiku calls for each evaluation) accumulates quickly. Published results use small benchmark splits (50 tasks). The economics at production scale — thousands of concurrent agents, millions of tasks — are not documented.

**Training data cutoff and knowledge staleness.** Anthropic does not publish precise training data cutoffs or update schedules. For agents operating on rapidly evolving domains (current APIs, recent research), Claude's embedded knowledge may diverge from ground truth faster than documented.

## Alternatives

**Use [GPT-4](../projects/gpt-4.md) / [OpenAI](../projects/openai.md) when:** your organization already has deep OpenAI API integration, you need Azure-hosted deployment for compliance, or your workload benefits from OpenAI's function-calling conventions and ecosystem tooling.

**Use [Gemini](../projects/gemini.md) when:** you need Google Cloud integration, are already in the Google ecosystem, or need multimodal capabilities with long video/document inputs.

**Use [Ollama](../projects/ollama.md)-served open models when:** you need on-premises deployment, air-gapped operation, or predictable fixed infrastructure costs at scale without per-token billing.

**Use [OpenAI Codex](../projects/codex.md) / [GitHub Copilot](../projects/github-copilot.md) when:** your use case is narrowly IDE-integrated code completion rather than general agentic tasks.

**Use [DeepSeek](../projects/deepseek.md) when:** cost efficiency at high volume is the primary constraint and task performance on Chinese-language or math-heavy workloads is critical.

## Ecosystem Integration

Claude is the primary target model across several related projects in this knowledge base:

- [Claude Code](../projects/claude-code.md) — Anthropic's coding agent built on Claude
- [CLAUDE.md](../concepts/claude-md.md) — Project-level agent configuration files Claude reads at session start
- [Agent Skills](../concepts/agent-skills.md) — Skill system Claude implements
- [Model Context Protocol](../concepts/mcp.md) — Tool connectivity layer Claude uses natively
- [GEPA](../concepts/gepa.md) — Evolutionary prompt/skill optimizer that targets Claude models
- [Meta-Agent](../concepts/meta-agent.md) — Continual harness improvement system built on Claude Agent SDK
- [LangGraph](../projects/langgraph.md), [LiteLLM](../projects/litellm.md), [AutoResearch](../projects/autoresearch.md) — Third-party frameworks that use Claude via API
- [SWE-bench](../projects/swe-bench.md), [TAU-bench](../projects/tau-bench.md) — Primary benchmarks used to evaluate Claude

Related concepts: [Chain-of-Thought](../concepts/chain-of-thought.md), [Context Compression](../concepts/context-compression.md), [Progressive Disclosure](../concepts/progressive-disclosure.md), [Decision Traces](../concepts/decision-traces.md), [Continual Learning](../concepts/continual-learning.md), [Retrieval-Augmented Generation](../concepts/rag.md)


## Related

- [Model Context Protocol](../concepts/mcp.md) — implements (0.8)
- [CLAUDE.md](../concepts/claude-md.md) — implements (0.8)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.4)
- [Retrieval-Augmented Generation](../concepts/rag.md) — part_of (0.5)
- [OpenAI](../projects/openai.md) — competes_with (0.8)
- [Cursor](../projects/cursor.md) — part_of (0.6)
- [Anthropic](../projects/anthropic.md) — created_by (1.0)
- [AutoResearch](../projects/autoresearch.md) — part_of (0.6)
- [OpenClaw](../projects/openclaw.md) — part_of (0.4)
- [Gemini](../projects/gemini.md) — competes_with (0.8)
- [Claude Code](../projects/claude-code.md) — extends (0.9)
- [Agent Skills](../concepts/agent-skills.md) — implements (0.7)
- [OpenAI Codex](../projects/codex.md) — competes_with (0.7)
- [GEPA](../concepts/gepa.md) — part_of (0.4)
- [Meta-Agent](../concepts/meta-agent.md) — part_of (0.5)
- [Skill Files](../concepts/skill-md.md) — implements (0.7)
- [TAU-bench](../projects/tau-bench.md) — part_of (0.4)
- [Windsurf](../projects/windsurf.md) — competes_with (0.4)
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — implements (0.5)
- [Mem0](../projects/mem0.md) — part_of (0.4)
- [Vector Database](../concepts/vector-database.md) — part_of (0.4)
- [LangGraph](../projects/langgraph.md) — part_of (0.4)
- [Continual Learning](../concepts/continual-learning.md) — implements (0.5)
- [GRPO](../concepts/grpo.md) — part_of (0.3)
- [Ollama](../projects/ollama.md) — alternative_to (0.4)
- [GPT-4](../projects/gpt-4.md) — competes_with (0.8)
- [LiteLLM](../projects/litellm.md) — part_of (0.5)
- [SWE-bench](../projects/swe-bench.md) — part_of (0.5)
- [Context Compression](../concepts/context-compression.md) — implements (0.5)
- [Embedding Model](../concepts/embedding-model.md) — part_of (0.5)
- [Catastrophic Forgetting](../concepts/catastrophic-forgetting.md) — alternative_to (0.4)
- [Decision Traces](../concepts/decision-traces.md) — implements (0.4)

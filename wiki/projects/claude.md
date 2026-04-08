---
entity_id: claude
type: project
bucket: agent-architecture
abstract: >-
  Anthropic's family of LLMs (Haiku, Sonnet, Opus) used as agent backbones
  across coding tools, multi-agent frameworks, and document workflows; primary
  differentiator is native infrastructure integration via Model Context Protocol
  and Agent Skills.
sources:
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/godofprompt-breaking-mipt-just-ran-the-largest-ai-agent-co.md
  - repos/canvas-org-meta-agent.md
  - repos/memodb-io-acontext.md
  - repos/helloruru-claude-memory-engine.md
  - repos/supermemoryai-supermemory.md
  - repos/anthropics-skills.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/greyhaven-ai-autocontext.md
  - repos/caviraoss-openmemory.md
  - repos/evoagentx-evoagentx.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/jmilinovich-goal-md.md
  - repos/jackchen-me-open-multi-agent.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/gepa-ai-gepa.md
  - deep/repos/anthropics-skills.md
  - deep/repos/jmilinovich-goal-md.md
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
  - codex
  - vllm
  - ollama
  - gepa
  - claude-md
  - reinforcement-learning
  - meta-agent
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
last_compiled: '2026-04-08T02:38:44.632Z'
---
# Claude

## What It Does

Claude is Anthropic's production LLM family deployed across three capability tiers: Haiku (fast, cheap), Sonnet (balanced), and Opus (highest capability). In agent infrastructure specifically, Claude functions as both a task-executing model and an orchestration backbone. It reads from and writes to structured context, executes tools, coordinates subagents, and serves as the reasoning engine in multi-agent pipelines.

What separates Claude from [GPT-4](../projects/gpt-4.md) and [Gemini](../projects/gemini.md) in agent contexts is not benchmark numbers but infrastructure integration. Anthropic has built a tight loop between the model and its surrounding systems: [Model Context Protocol](../concepts/model-context-protocol.md) for tool and resource access, the Agent Skills system for modular capability loading, [CLAUDE.md](../concepts/claude-md.md) for repository-level behavioral directives, and the Claude Agent SDK for building harnesses. These systems compound each other in ways that make Claude the default choice when building on Anthropic's stack.

## Architecture in Agent Contexts

### Context Window Handling

Claude Sonnet 4 and Opus 4 support 200K token context windows. In practice, Claude agents use [context management](../concepts/context-management.md) strategies to work within this limit rather than filling it. The Agent Skills system uses progressive disclosure: metadata (~100 tokens) stays resident, full SKILL.md loads on trigger (<5000 tokens), and bundled scripts/reference docs load on demand. This prevents context bloat when multiple skills are installed simultaneously.

The [lost-in-the-middle](../concepts/lost-in-the-middle.md) problem applies to Claude as it does to all transformers: retrieval performance degrades for information placed in the middle of long contexts. Agent systems that rely on Claude for long-context reasoning should front-load or end-load critical information.

### Agent Skills System

Claude's canonical mechanism for modular capability loading uses SKILL.md files with YAML frontmatter. The format requires two fields: `name` (1-64 chars, lowercase with hyphens) and `description` (1-1024 chars). The description field is the triggering mechanism — Claude reads it and decides whether to invoke the skill based on semantic match to the current task.

The anthropics/skills repository (110K stars) demonstrates this at scale: document skills (pdf, xlsx, docx, pptx), creative skills, development skills, and a meta-skill (`skill-creator`) that teaches Claude to build and evaluate other skills. See [Agent Skills](../concepts/agent-skills.md) for the full specification.

The triggering mechanism has a known failure mode: Claude undertriggers by default. The official skill-creator documentation explicitly recommends making descriptions "a little bit pushy" — specifying when to trigger rather than just what the skill does. The claude-api skill demonstrates the precision required:

```
TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`
DO NOT TRIGGER when: code imports `openai`/other AI SDK
```

### Model Context Protocol

[Model Context Protocol](../concepts/model-context-protocol.md) is Claude's standard for connecting to external tools, resources, and data sources. The mcp-builder skill in the skills repo implements a four-phase development loop (research, implement, review, evaluate) for building MCP servers. This makes Claude the default model for teams building MCP-native workflows.

### CLAUDE.md

[CLAUDE.md](../concepts/claude-md.md) files placed in project roots provide persistent behavioral directives. Unlike system prompts which must be explicitly passed, CLAUDE.md files are read automatically by Claude Code when entering a repository. This enables repository-specific behavior: coding standards, tool preferences, workflow rules, and project context that persists across sessions.

### Claude Agent SDK

The SDK provides structured primitives for building agent harnesses. It supports lifecycle hooks for tool use, custom stop conditions, subagent coordination, and permission logic. The [meta-agent](../concepts/meta-agent.md) project (canvas-org) targets this SDK specifically: it reads production traces, uses an LLM judge to score failures, and iteratively updates the harness. On tau-bench v3 airline tasks, a meta-agent loop improved Haiku 4.5 from 67% to 87% holdout accuracy within 4-10 iterations.

## Key Numbers

| Metric | Value | Source |
|--------|-------|--------|
| anthropics/skills GitHub stars | 110,064 | Repository stats, self-reported |
| Haiku 4.5 baseline on TerminalBench-2 | 27.5% | Meta-Harness paper (Lee et al. 2026) |
| Haiku 4.5 with hand-engineered harness | 35.5% | Same paper, independently reported |
| Haiku 4.5 on tau-bench after meta-agent loop | 87% (from 67%) | Single-run, canvas-org self-reported |
| Claude Haiku 4.5 Bleve coding tasks (GEPA) | 98.3% (from 79.3%) | GEPA paper, ICLR 2026 Oral |
| Claude Haiku 4.5 Jinja coding tasks (GEPA) | 100% (from 93.9%) | GEPA paper, ICLR 2026 Oral |

The tau-bench result is a single run on a 15-task holdout split — treat it as directional, not definitive. The GEPA coding results are from an ICLR-accepted paper and carry more credibility, though they measure skill transfer performance rather than base model capability.

## Strengths

**Native infrastructure integration.** CLAUDE.md, Model Context Protocol, Agent Skills, and the Claude Agent SDK form a coherent system. Teams building on Anthropic's stack get these integrations without glue code. Competitors don't have equivalent first-party infrastructure.

**Harness optimization potential.** Claude models respond well to harness-level improvements. The meta-agent results (67% to 87% on tau-bench) and GEPA results (coding tasks reaching 98-100%) show that Claude's performance is substantially shaped by the harness, not just the base model. This is a feature: it means systematic improvement is possible without fine-tuning.

**Constitutional AI alignment.** Claude's training includes Constitutional AI and Reinforcement Learning from Human Feedback. In agent contexts this matters: Claude tends to ask for clarification when uncertain rather than hallucinating confident wrong answers, and respects [human-in-the-loop](../concepts/human-in-the-loop.md) patterns naturally.

**Long-context instruction following.** Within its 200K window, Claude handles complex multi-document system prompts more reliably than many competitors, which matters when assembling skill instructions, tool definitions, conversation history, and task context simultaneously.

## Critical Limitations

**Concrete failure mode — skill undertriggering.** Claude's description-driven skill triggering fails silently. If a skill's description doesn't closely match the user's phrasing, the skill won't load and Claude proceeds without it — producing plausible but suboptimal output with no error or warning. The fix requires aggressive description writing and trigger testing via the skill-creator's eval loop (which itself costs 300+ LLM calls to run properly). There is no programmatic trigger layer, no file-pattern matcher, no fallback mechanism.

**Unspoken infrastructure assumption.** The Agent Skills system, CLAUDE.md behavior, and Claude Agent SDK all assume Claude Code or Claude.ai as the runtime. Teams accessing Claude via raw API get none of these integrations automatically. They must implement context loading, skill injection, and behavioral directives manually. The skills repository readme acknowledges this partially ("These skills are provided for demonstration and educational purposes only"), but the gap between the integrated experience and the API experience is larger than the documentation suggests.

## When NOT to Use Claude

**Cost-sensitive high-volume inference.** For applications requiring millions of daily requests, [Ollama](../projects/ollama.md) with local models or [vLLM](../projects/vllm.md) for hosted open-weight models provide dramatically lower per-token cost. Haiku is Anthropic's cheapest tier, but it still carries API margins. If your task tolerates a capable open-weight model (Llama 3.1, Mistral), the economics favor alternatives.

**Offline or air-gapped environments.** Claude requires Anthropic API access. Teams operating in regulated environments without internet access cannot use Claude regardless of capability fit.

**When you need fine-tuning control.** Anthropic does not currently offer broad fine-tuning access to Claude. If your task requires domain adaptation that goes beyond prompting and harness engineering, [GPT-4](../projects/gpt-4.md) (via OpenAI's fine-tuning API) or open-weight models via [vLLM](../projects/vllm.md) give you more control.

**When benchmarks for your specific task favor alternatives.** Benchmark rankings shift rapidly across model generations. Before committing to Claude for a new agent workflow, run your actual task distribution against current [Gemini](../projects/gemini.md) and GPT-4 variants. Self-reported aggregate benchmarks are a poor proxy for task-specific performance.

## Unresolved Questions

**Governance of skill triggering at scale.** There is no documented mechanism for monitoring which skills trigger in production, detecting undertriggering, or receiving alerts when a skill stops being invoked. The skill-creator's description optimizer requires 300 LLM calls to run once and provides no ongoing monitoring. How teams maintain skill triggering fidelity across model updates is undocumented.

**Model update compatibility.** When Anthropic releases a new Claude version, skills written for the previous version may trigger differently or behave differently. There is no versioning mechanism in the SKILL.md spec (the `compatibility` field is optional and freeform), no automated regression testing across model versions, and no documented rollback procedure.

**Cost at scale for multi-agent systems.** GEPA optimization of Claude skills costs substantially per run — the Pydantic integration guide recommends budgeting 50-200 evaluations, each involving multiple LLM calls. For [multi-agent systems](../concepts/multi-agent-systems.md) with dozens of skills running continuous improvement loops, the optimization cost can exceed the inference cost. No public guidance exists on this.

**Conflict resolution between CLAUDE.md and system prompts.** When CLAUDE.md directives contradict system prompt instructions, precedence rules aren't publicly documented. Teams building on Claude Code discover this empirically.

## Alternatives

**Use [GPT-4](../projects/gpt-4.md) when** your team is already on OpenAI's stack, you need fine-tuning, or current benchmarks favor it for your specific task type.

**Use [Gemini](../projects/gemini.md) when** you need deep Google Workspace integration, very long context windows beyond 200K, or multimodal tasks where Gemini's training shows advantages.

**Use [vLLM](../projects/vllm.md) or [Ollama](../projects/ollama.md) when** cost, latency, or offline deployment requirements make API models impractical.

**Use Claude when** you're building agent infrastructure on Anthropic's stack (Claude Code, MCP, Agent Skills), when harness-level optimization is part of your workflow, or when constitutional alignment properties matter for your use case.

## Related

- [Agent Skills](../concepts/agent-skills.md) — the modular capability loading system
- [CLAUDE.md](../concepts/claude-md.md) — repository-level behavioral directives
- [Model Context Protocol](../concepts/model-context-protocol.md) — tool and resource integration standard
- [Claude Code](../projects/claude-code.md) — primary agentic coding environment
- [Context Engineering](../concepts/context-engineering.md) — techniques for managing what goes into the context window
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — coordination patterns where Claude acts as orchestrator or subagent
- [GEPA](../concepts/gepa.md) — evolutionary prompt optimization that demonstrates large gains on Claude tasks
- [Meta-Agent](../concepts/meta-agent.md) — continual harness improvement from production traces
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — patterns Claude's alignment training makes natural
- [Anthropic](../projects/anthropic.md) — the creating organization

---
entity_id: agent-skills
type: concept
bucket: agent-architecture
abstract: >-
  Agent Skills: reusable capability packages (instructions, code, resources)
  that LLM agents load on demand, using progressive context disclosure to extend
  behavior without retraining.
sources:
  - articles/agent-skills-overview.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/anthropics-skills.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/repos/othmanadi-planning-with-files.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - repos/affaan-m-everything-claude-code.md
  - repos/alirezarezvani-claude-skills.md
  - repos/anthropics-skills.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/kepano-obsidian-skills.md
  - repos/letta-ai-letta-code.md
  - repos/letta-ai-letta.md
  - repos/letta-ai-lettabot.md
  - repos/memento-teams-memento-skills.md
  - repos/memodb-io-acontext.md
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
related:
  - claude-code
  - cursor
  - codex
  - anthropic
  - composable-skills
  - claude
  - context-engineering
  - opencode
  - claude-md
  - multi-agent-systems
  - openai
  - model-context-protocol
  - progressive-disclosure
  - gemini-cli
  - letta
  - skill-book
  - memento
  - tool-registry
  - antigravity
  - loop-detection
  - openclaw
  - andrej-karpathy
last_compiled: '2026-04-08T22:59:04.488Z'
---
# Agent Skills

## What They Are

Agent skills are composable packages of procedural knowledge that LLM agents load on demand to extend their capabilities without model retraining. A skill combines a trigger description, execution instructions, and optional resources (scripts, reference files, templates) into a self-contained unit that an agent can discover, load, and apply.

The distinction from tools matters. A tool is an atomic function call that returns a result (call a search API, get results). A skill reshapes the agent's preparation and understanding *before* execution — it modifies context and permissions rather than producing direct outputs. Think of tools as verbs and skills as the domain knowledge that makes an agent competent to perform those verbs correctly.

Skills have become a first-class architectural primitive across coding agents ([Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), [OpenAI Codex](../projects/codex.md), [Gemini CLI](../projects/gemini-cli.md), [OpenCode](../projects/opencode.md)), and the pattern is spreading into general-purpose agent frameworks ([Letta](../projects/letta.md), [Memento](../projects/memento.md)).

## Why It Matters

Before skills, extending an agent's capabilities required one of three expensive options: fine-tuning (slow, costly, brittle), bloated system prompts (wastes context on rarely-needed knowledge), or requiring users to explicitly manage what context the agent has access to (brittle, doesn't scale).

Skills solve the distribution problem: they let capability authors package and publish domain expertise that agents can discover and load on demand. The ecosystem effect is real — [Anthropic](../projects/anthropic.md)'s skill marketplace, the [Everything Claude Code](../projects/claude-code.md) harness with 156 skills across 12 language ecosystems, and community repositories demonstrate that skills can be curated, versioned, and composed like software packages.

The [SkillBook](../concepts/skill-book.md) pattern, implemented by systems like ACE (Agentic Context Engine), extends this further: agents can *learn* skills from execution traces and persist them across sessions, creating a feedback loop between agent behavior and capability evolution.

## How It Works

### Three-Level Progressive Disclosure

The central architectural innovation in skill systems is staged information loading. [Anthropic's canonical implementation](https://github.com/anthropics/skills) and the [survey paper by Xu et al.](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) converge on the same pattern:

**Level 1 — Metadata (~dozen tokens, always resident):** The skill's `name` and `description` fields stay permanently in the agent's available-skills list. The agent routes based solely on this.

**Level 2 — Instructions (loaded on trigger):** The full procedural SKILL.md body, typically kept under 500 lines / 5,000 tokens. Loaded when the agent determines the skill is relevant. Injected into the conversation context.

**Level 3 — Resources (loaded on demand within execution):** Scripts, API docs, reference files, templates. May be read selectively without ever fully entering context. Bundled Python scripts can execute without being loaded at all.

This staging means an agent can "know about" hundreds of skills at a cost of ~dozens of tokens each, paying the full context cost only for 1-2 skills actively in use.

### The SKILL.md Format

The canonical format ([agentskills.io spec](https://agentskills.io), implemented in [anthropics/skills](https://github.com/anthropics/skills)):

```yaml
---
name: pdf                          # lowercase + hyphens, 1-64 chars, matches directory
description: >                     # 1-1024 chars; this is the routing signal
  Create, read, extract, and fill PDF files. Trigger when user asks
  about PDFs, forms, or document conversion.
license: MIT
allowed-tools: "Bash(python3:*) Read"  # experimental: pre-approved tools
---

## When to Use
[trigger conditions]

## How It Works
[step-by-step instructions]

## Examples
[concrete examples]
```

The `description` field is the routing mechanism. Quality here determines whether a skill gets used. The [skill-creator meta-skill](https://github.com/anthropics/skills/tree/main/skills/skill-creator) explicitly recommends making descriptions "a little bit pushy" — including specific contexts and use cases rather than just capability summaries.

### Description-Driven Triggering

Triggering is purely semantic: the agent reads skill descriptions and decides whether to consult a skill. No programmatic triggers, no file-pattern matchers, no project-type detectors (at the trigger layer). Complex conditions like "trigger when code imports `anthropic` but not when it imports `openai`" must be encoded as natural language in the description.

This is elegant but fragile. Undertriggering — the agent not invoking a skill when it should — is the most common failure mode. Overtriggering is less common but possible with imprecise descriptions.

### Hook-Based Behavior Injection

Skills can declare lifecycle hooks that fire at agent execution boundaries. The [SKILL.md spec supports](https://agentskills.io):

```yaml
hooks:
  PreToolUse:
    - matcher: "Write|Edit|Bash"
      command: "cat task_plan.md 2>/dev/null | head -30 || true"
  PostToolUse:
    - matcher: "Write|Edit"
      type: notification
      message: "Update progress.md with changes made"
  Stop:
    - command: "./scripts/check-complete.sh"
```

The [planning-with-files skill](https://github.com/othmanadi/planning-with-files) demonstrates this pattern to implement the "filesystem as working memory" approach: the `PreToolUse` hook re-injects the first 30 lines of `task_plan.md` before every tool call, keeping goals in the model's recent attention window and preventing goal drift over long sessions.

Hooks work without modifying the agent's system prompt, making them additive rather than invasive. They're particularly valuable for deterministic quality gates — the `Stop` hook can prevent task completion until all phases are verified done.

### Bundled Scripts Pattern

Deterministic operations belong in scripts, not instructions. The `pdf` skill in anthropics/skills bundles 8 Python scripts (form extraction, fill, validate, convert). The skill's SKILL.md tells the agent *when* to invoke each script; the script code never enters the context window. This is meaningful for context budget management: a 200-line Python script that would cost ~800 tokens to include in instructions can execute as a zero-context-cost subprocess.

### Skill Acquisition Beyond Authoring

Human authoring isn't the only path to skills. Several acquisition mechanisms exist:

**SAGE (Skill-Augmented GRPO for self-Evolution):** RL-based learning using sequential rollout — agents train across task chains where earlier skills become available for reuse. Reported results: 72.0% task goal completion on AppWorld, 26% fewer interaction steps, 59% fewer generated tokens vs. baseline (self-reported, [source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md)).

**SEAgent (Autonomous Discovery):** Discovers skills for previously unseen software through a world state model and curriculum generator. Reported: 34.5% success on 5 novel OSWorld environments vs. 11.3% baseline (self-reported).

**ACE's Skillbook Loop:** A three-role feedback system (Agent → Reflector → SkillManager) that extracts skills from execution traces. Skills are embedded, deduplicated by cosine similarity, and persisted across sessions. Each skill carries provenance (`InsightSource` objects tracking epoch, trace UID, sample question). See `ace/core/skillbook.py` for implementation.

**Compositional Skill Synthesis:** Specialized agents select and compose modular reasoning skills dynamically. On AIME 2025, a 30B model achieved 91.6% using this approach (self-reported). See [Compositional Skill Synthesis](../concepts/composable-skills.md).

## Implementation Examples

### Anthropic's Canonical Skills

The [anthropics/skills repository](https://github.com/anthropics/skills) establishes the reference architecture. The `skill-creator` meta-skill closes the quality loop: it implements a full eval-driven development pipeline with train/test splitting for description optimization, A/B comparison via independent LLM judges, and iterative refinement (up to 5 iterations, ~300 LLM calls for thorough optimization).

The benchmark tier structure from skill-creator:
- Tier 1 (free, <2s): Static SKILL.md validation
- Tier 2 (~$3.85, ~20min): Full E2E via `claude -p`  
- Tier 3 (~$0.15, ~30s): LLM-as-judge quality scoring

### Everything Claude Code at Scale

The [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) harness organizes 156 skills across 12 language ecosystems, 38 subagent definitions, and 20+ hook event types. At this scale, the hard problem shifts from individual skill quality to governance: conflict detection between overlapping skills, install profiles for different contexts, cross-harness parity across 6+ agent platforms.

The instinct system (v1.9.0) demonstrates the continuous learning pattern: `PreToolUse`/`PostToolUse` hooks capture 100% of tool calls to `observations.jsonl`. An Observer Agent (Claude Haiku) runs every 5 minutes, detecting patterns with confidence scores from 0.3 (tentative) to 0.9 (near-certain). The `/evolve` command aggregates 3+ related instincts into full `SKILL.md` files, agent definitions, or commands.

### The Filesystem-as-Memory Pattern

The [planning-with-files skill](https://github.com/othmanadi/planning-with-files) demonstrates skills as context engineering rather than domain knowledge. Its evaluation results: 96.7% pass rate with the skill vs. 6.7% without (30 assertions, 10 parallel subagents, 5 task types). The improvement comes not from giving the agent more information but from enforcing better working-memory discipline through lifecycle hooks.

## Security and Governance

The [Xu et al. survey](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) analyzed 42,447 skills from major marketplaces and found:

- **26.1% contain at least one vulnerability**
- 14 distinct vulnerability patterns across 4 categories
- Skills with executable scripts are **2.12x more vulnerable** than instruction-only skills (p<0.001)
- 5.2% exhibit high-severity patterns suggesting malicious intent
- 157 confirmed malicious skills with 632 total vulnerabilities
- A single industrialized actor responsible for 54.1% of confirmed malicious cases

The primary attack vector: the `PreToolUse` hook's repeated injection of trusted files makes `task_plan.md` and similar planning files high-value targets for indirect prompt injection. Once a skill's instructions enter context, they're treated as authoritative. "Trivially simple" prompt injection attacks exploit this trust model by loading long SKILL.md files that drift toward adversarial behavior.

The proposed four-tier governance framework:
- **G1:** Static analysis (SKILL.md validation, known-bad patterns)
- **G2:** Semantic classification (LLM-based intent analysis)
- **G3:** Sandboxed execution (scripts run in isolated environments)
- **G4:** Behavioral monitoring (runtime anomaly detection)

This framework is proposed, not widely deployed. Production skill ecosystems currently lack standardized security infrastructure.

## Failure Modes

**Phase transition in skill selection:** As skill library size grows past a critical threshold, routing accuracy degrades sharply. This isn't theoretical — it's a documented scaling limit that no current architecture addresses well. Hierarchical organization (categories, meta-skills for routing) is the mitigation, but flat registries hit this wall. The threshold depends on description quality and model routing capability; there's no published number, but community experience with large registries suggests problems emerge above ~100 skills without hierarchical organization.

**Context budget exhaustion:** The [planning-with-files skill](https://github.com/othmanadi/planning-with-files) injects 30 lines of plan context before every tool call. For 100+ tool call sessions, that's 3,000+ lines of repeated content. Multiple active skills multiplying this overhead can consume a significant fraction of a 200K token context window. [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) addresses this with explicit token budget management: ~10K for system prompts, ~5-8K for rules, ~2-5K per MCP tool, with a recommendation to enable no more than 10 MCPs simultaneously.

**Undertriggering:** The most common operational failure. Skills don't trigger when they should because the description didn't match the user's phrasing. No current architecture provides programmatic trigger fallbacks — it's all semantic routing.

**Learned skills are opaque:** SAGE and SEAgent produce effective skills but they live only in model weights. They can't be inspected, shared, audited, or governed. Human-authored SKILL.md files are fully inspectable and portable. The gap between these two paradigms — automatically learned but opaque vs. human-authored but labor-intensive — is the field's open problem.

**No inter-skill communication:** Skills can't read from or write to each other. No shared scratchpad, no skill-to-skill messaging, no way for one skill's output to influence another's triggering. Composition is assembly-time only, not runtime.

**No cross-platform portability:** Skills authored for Claude Code implicitly depend on Claude-specific capabilities (hook format, model behavior, tool names). A Claude Code skill may not transfer to Cursor or Gemini CLI without adaptation. Everything Claude Code handles this through platform-specific branches, but that's manual maintenance, not portability.

## Relationship to Adjacent Concepts

Skills sit at the intersection of several related patterns:

**[Context Engineering](../concepts/context-engineering.md):** Skills are context engineering operationalized. The three-level progressive disclosure pattern, hook-based attention manipulation, and filesystem-as-memory approach are all context engineering techniques packaged as reusable units.

**[Procedural Memory](../concepts/procedural-memory.md):** Skills are externalizable procedural memory. The ACE Skillbook and SAGE approaches attempt to make this memory learnable, not just authored.

**[Tool Registry](../concepts/tool-registry.md):** Skills complement tool registries. Skills provide "what to do and how to think about it"; tool registries provide "what functions are callable." A skill instructs the agent on which tools to use and how to interpret their outputs.

**[Model Context Protocol](../concepts/model-context-protocol.md):** MCP handles tool connectivity; skills handle procedural knowledge. They're designed to work together, not compete.

**[CLAUDE.md](../concepts/claude-md.md):** CLAUDE.md is project-level persistent instruction; skills are reusable capability packages. CLAUDE.md is always loaded; skills load on demand. Many practitioners start with CLAUDE.md and graduate to skills when they need portability and reuse.

**[Multi-Agent Systems](../concepts/multi-agent-systems.md):** Skills provide the capability layer that agents in multi-agent systems draw from. The ECC harness demonstrates this with 38 specialized subagents, each with restricted tool permissions and domain-specific skills.

**[Progressive Disclosure](../concepts/progressive-disclosure.md):** The three-level architecture directly implements progressive disclosure: only load what you need, when you need it.

## When NOT to Use Skills

**Simple, stable workflows:** If an agent reliably does one thing well, a lean `CLAUDE.md` or system prompt delivers most of the value at a fraction of the complexity. The [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) community consensus: for solo developers or small projects, extracting individual patterns into a lean `CLAUDE.md` is sufficient.

**When triggering reliability is critical:** Semantic description-based routing fails when the triggering condition is complex or the user's phrasing is unpredictable. If you need guaranteed skill invocation, skills are wrong — use explicit tool calls or always-loaded instructions instead.

**High-security contexts with untrusted skill sources:** The 26.1% vulnerability rate in community skills means you cannot trust unvetted skill libraries in security-sensitive deployments. Either audit every skill or avoid community registries entirely.

**When the agent's context window is already constrained:** Skills add overhead: Level 1 metadata for all registered skills, Level 2 instructions when triggered, hook injections on every tool call. In contexts where every token matters, this overhead may not be worth the organizational benefit.

## Unresolved Questions

**Phase transition threshold:** What's the critical skill library size where routing accuracy degrades? The finding is documented but the threshold isn't quantified across different models and description quality levels.

**Skill conflict resolution:** When two loaded skills give contradictory instructions, what should happen? No current architecture specifies conflict resolution semantics.

**Evaluation standardization:** There's no standardized benchmark for skill quality independent of task performance. Skill-creator provides ad hoc evaluation infrastructure, but there's no equivalent of HumanEval for skills.

**Externalization of learned skills:** Can systems like SAGE produce inspectable, auditable skill artifacts rather than just updating model weights? Bridging human-authored and machine-learned skills would unify the field, but no current system does this.

**Governance at scale:** The four-tier security model is proposed, not deployed. Who verifies skills in a marketplace? How do you handle skill versioning when a skill update breaks downstream agents? None of these governance questions have operational answers yet.

**Cost at production scale:** Full description optimization in skill-creator costs ~$3.85 and ~300 LLM calls per skill. For a 156-skill library like ECC, that's ~$600 and thousands of API calls to optimize descriptions. There's no published data on ongoing trigger monitoring costs in production.

## Alternatives

**Use [CLAUDE.md](../concepts/claude-md.md) when** you need project-specific persistent instructions that apply to every interaction. Simpler, always loaded, no triggering uncertainty.

**Use [Tool Registry](../concepts/tool-registry.md) when** you need to manage callable functions rather than procedural knowledge. Tools for doing; skills for knowing how to do.

**Use [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) when** you need to load relevant *information* on demand (documents, facts, data) rather than *procedural instructions*. RAG retrieves content; skills load behavioral programs.

**Use fine-tuning when** the capability needs to be deeply integrated into the model's reasoning rather than prepended as instructions, and you have sufficient training data and budget. Skills are prompt-time; fine-tuning is weights-time.

**Use [Compositional Skill Synthesis](../concepts/composable-skills.md) when** you need skills that combine dynamically at inference time for novel problem combinations, particularly in mathematical or structured reasoning domains.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.8)
- [Cursor](../projects/cursor.md) — implements (0.6)
- [OpenAI Codex](../projects/codex.md) — implements (0.6)
- [Anthropic](../projects/anthropic.md) — implements (0.7)
- [Compositional Skill Synthesis](../concepts/composable-skills.md) — implements (0.8)
- [Claude](../projects/claude.md) — implements (0.7)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.7)
- [OpenCode](../projects/opencode.md) — implements (0.7)
- [CLAUDE.md](../concepts/claude-md.md) — implements (0.7)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — part_of (0.7)
- [OpenAI](../projects/openai.md) — implements (0.5)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.7)
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — implements (0.7)
- [Gemini CLI](../projects/gemini-cli.md) — implements (0.5)
- [Letta](../projects/letta.md) — implements (0.6)
- [SkillBook](../concepts/skill-book.md) — implements (0.8)
- [Memento](../projects/memento.md) — implements (0.5)
- [Tool Registry](../concepts/tool-registry.md) — implements (0.7)
- [Antigravity](../projects/antigravity.md) — implements (0.4)
- [Loop Detection](../concepts/loop-detection.md) — implements (0.4)
- [OpenClaw](../projects/openclaw.md) — implements (0.5)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.4)

---
entity_id: progressive-disclosure
type: approach
bucket: context-engineering
abstract: >-
  Progressive disclosure in LLM agents surfaces context incrementally through
  structured tiers (always-loaded metadata → on-demand detail → full content),
  preventing context overload while maintaining access to deep knowledge when
  needed.
sources:
  - repos/memodb-io-acontext.md
  - repos/thedotmack-claude-mem.md
  - repos/michaelliv-napkin.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/anthropics-skills.md
  - deep/repos/michaelliv-napkin.md
related:
  - claude-code
  - anthropic
  - agent-skills
  - openai
  - claude
  - agent-skills
last_compiled: '2026-04-08T02:42:52.657Z'
---
# Progressive Disclosure

## What It Is

Progressive disclosure is a context engineering strategy borrowed from user interface design, adapted for the constraints of LLM context windows. The core idea: instead of loading all potentially relevant information upfront, an agent exposes knowledge in layers, loading each layer only when the previous one indicates it's needed.

The strategy directly addresses a structural tension in agent design. Agents need access to rich, detailed knowledge to perform well on complex tasks, but context windows have hard token limits, performance degrades as context fills, and irrelevant context actively harms reasoning quality (the [Lost in the Middle](../concepts/lost-in-the-middle.md) problem). The naive solutions — load everything or load nothing — both fail. Progressive disclosure is the systematic alternative.

## Why It Matters

Context is the primary resource in LLM agent architecture. Unlike compute or memory in traditional systems, context cannot be extended cheaply: once the window fills, information must be evicted or compressed, and both operations lose fidelity. [Context Management](../concepts/context-management.md) at scale requires principled strategies for what to include and when.

Progressive disclosure matters because the alternative patterns each have hard failure modes:

**Full context loading** collapses under scale. A system with 50 skills, each documented in 500 lines, cannot load all skill docs simultaneously. Even if the tokens fit, the model's attention degrades over long contexts, and irrelevant material actively interferes with retrieval of relevant material.

**On-demand loading without structure** produces oscillation. An agent that loads context only when it realizes it needs it tends to load too late (after committing to a path) or too eagerly (loading everything that might be relevant, collapsing into the full-context problem).

**No persistent context** forces re-derivation. An agent that starts each turn from scratch cannot accumulate orientation — it cannot know what it doesn't know.

Progressive disclosure threads between these: always-available metadata enables routing decisions, triggered intermediate layers provide working context, and deep resources load only when the task requires them.

## How It Works

### The Tier Structure

Every implementation of progressive disclosure defines tiers, though naming varies. The canonical structure has three to four levels:

**Tier 0 — Permanent metadata (~100–500 tokens, always loaded):** The minimum context the agent carries at all times. This is routing information: what capabilities exist, what domains are covered, where to look next. This tier must be small enough to be affordable in every session. Typical contents: skill names and descriptions, project orientation notes, capability inventories.

**Tier 1 — Activated summary (~1–5K tokens, loaded on relevance signal):** The working knowledge for a domain or task. Loaded when the tier-0 metadata indicates relevance. This tier handles most actual task execution. Typical contents: skill instructions, domain SOPs, architectural decisions, relevant procedures.

**Tier 2 — Full resources (~5K–unlimited, loaded on demand):** Complete reference material, detailed documentation, full file contents. Loaded when tier-1 context is insufficient for the specific subtask. Typical contents: full API documentation, complete codebases, detailed reference schemas.

**Tier 3 — Executable resources (never loaded into context):** Scripts, tools, and programs that can be invoked without being read. The key insight: deterministic operations should run as code, not as LLM instructions consuming context tokens.

### Triggering Mechanisms

How each tier triggers the next varies by implementation, and this variation reveals real design tradeoffs.

**Semantic description matching** (used by [Anthropic](../projects/anthropic.md)'s [Agent Skills](../concepts/agent-skills.md)): The model reads a natural-language description and decides whether to load a skill. The trigger is the LLM's own judgment. Elegant and flexible — no trigger rules to maintain — but fragile. Undertriggering (not loading a skill when it would help) is the dominant failure mode. The mitigation is writing descriptions that are "a little bit pushy," explicitly naming contexts and use cases rather than just stating what the skill does.

**Keyword/BM25 matching** (used by napkin's [Context Management](../concepts/context-management.md) via [BM25](../concepts/bm25.md)): Retrieval is lexical. The agent issues a search query and receives ranked results with snippets — enough to decide whether to load the full document. Deterministic and fast, but fails when vocabulary doesn't overlap between query and document. The napkin architecture compensates with backlink graph weighting: files with more incoming links rank higher, providing a connectivity signal that bridges vocabulary gaps.

**Tool-call navigation** (used by acontext): The agent explicitly requests context through tool calls (`list_skills`, `get_skill`, `get_skill_file`). No automatic triggering — the agent decides what it needs through reasoning. Debuggable and transparent, but requires the agent to know what skills exist and to correctly identify relevant ones before loading them.

**Hook-based injection** (used by Ars Contexta): Session lifecycle hooks inject tier-0 context automatically at session start. The `session-orient` hook runs a `tree` command and loads workspace structure, identity, and orientation context — the agent always starts oriented, not blank.

### The Bundled Scripts Pattern

One underappreciated dimension of progressive disclosure is the treatment of executable resources. The [Agent Skills](../concepts/agent-skills.md) architecture distinguishes sharply: deterministic operations should be scripts, not instructions. A skill for PDF processing bundles Python scripts for form extraction, validation, and conversion. The SKILL.md tells the agent *when* to invoke each script; the script code never enters the context window.

This extends the tier structure downward: below "loaded on demand" sits "invocable but never read." The tier-0 metadata might say "this skill has a validation script," tier-1 instructions say "run the validation script after every extraction," and the script itself executes in a subprocess. Zero context tokens consumed by code that could be thousands of lines.

### Fresh Context per Phase

A related pattern addresses context degradation over long agent runs. Rather than running a multi-phase pipeline in a single context window (where early-phase content persists and pollutes later phases), spawn fresh subagents per phase with precisely scoped context.

Ars Contexta implements this with the `/ralph` orchestrator. Its 6Rs pipeline (Record → Reduce → Reflect → Reweave → Verify → Rethink) spawns a fresh subagent for each phase, passing state via structured handoff files in `ops/queue/`. Each phase gets a clean context window. The cost is token overhead for system prompt repetition; the benefit is that each phase operates with full model attention rather than degraded attention in a polluted window.

The same pattern appears in acontext's Skill Learner Agent, which processes multiple distillation contexts by injecting new contexts as follow-up messages rather than loading all contexts simultaneously. Multi-turn batching with bounded iteration counts (`max_iterations` extended per context batch) balances responsiveness against context exhaustion.

## Implementation Examples

### Anthropic Agent Skills (Three-Tier SKILL.md)

The reference implementation from [Anthropic](../projects/anthropic.md)'s [Agent Skills](../concepts/agent-skills.md). The `agentskills.io` spec formalizes three tiers with explicit token budgets:

- Metadata (~100 tokens, permanent): YAML frontmatter `name` + `description`
- Instructions (~5,000 tokens, on-trigger): SKILL.md body
- Resources (unlimited, on-demand): Bundled scripts, reference docs, assets

The claude-api skill demonstrates this at scale: 20+ reference files across 8 programming languages, loaded individually based on which language appears in the task context. The SKILL.md includes explicit trigger/no-trigger specifications:

```
TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`
DO NOT TRIGGER when: code imports `openai`/other AI SDK
```

The `allowed-tools` frontmatter field (currently experimental) extends this by declaring pre-approved tools, enabling governance at the metadata tier rather than the instruction tier. [Source](../raw/deep/repos/anthropics-skills.md)

### Napkin (Four-Level Vault Navigation)

napkin formalizes four disclosure levels for a local markdown vault:

| Level | Mechanism | Tokens | Content |
|-------|-----------|--------|---------|
| L0 | NAPKIN.md (always loaded) | ~200 | Project context, conventions |
| L1 | `napkin overview` | ~1–2K | TF-IDF keyword map by directory |
| L2 | `napkin search <query>` | ~2–5K | BM25 results with snippets |
| L3 | `napkin read <file>` | ~5–20K | Full file content |

The L1 overview uses weighted TF-IDF: headings get 3x weight, filenames and frontmatter titles get 2x, body text gets 1x. This produces a topic map from file structure without any LLM calls. The agent navigates from map to search to file, paying context tokens proportional to actual relevance.

Benchmark results on LongMemEval-S (40 sessions per question, 500 questions total): 91% accuracy with this progressive disclosure approach vs. 86% for the best prior embedding-based system and 64% for GPT-4o with full context. The result is notable because BM25 is simpler and cheaper than embedding-based RAG, yet outperforms it on this benchmark. Self-reported by the napkin author; see [Source](../raw/deep/repos/michaelliv-napkin.md) for benchmark design details. [Source](../raw/repos/michaelliv-napkin.md)

One specific design choice worth noting: search scores are hidden from agent output. If the agent sees numerical confidence scores, it anchors on the numbers rather than evaluating content quality from snippets. The score drives ordering invisibly; the agent makes relevance judgments from text.

### Ars Contexta (Ten Kernel Primitives + Hook Injection)

Ars Contexta organizes progressive disclosure around ten "kernel primitives" — the minimum context every derived knowledge system must maintain. The `description` field in every note is explicitly identified as a progressive disclosure mechanism: it allows agents to understand a note's content without reading the full body. The author's phrase "reading right, not reading less" captures the intent: agents should be able to navigate to what they need, not skip things.

The session-orient hook (running on SessionStart) injects workspace tree + agent identity + maintenance signals. This is tier-0 injection via lifecycle automation — the agent doesn't need to request orientation context because the hook provides it. [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md)

### Acontext (Tool-Call Navigation with LLM-as-Judge Distillation)

Acontext explicitly rejects embedding-based retrieval in favor of tool-call navigation:

1. `list_skills` — see available skills in the learning space
2. `get_skill` — list files within a skill
3. `get_skill_file` — read specific file content

The SKILL.md acts as a manifest guiding navigation to the right data files. The three-stage learning pipeline (Task Extraction → Distillation → Skill Learner) uses a distillation phase that classifies completed tasks into SOPs, failure warnings, or factual content — structuring learnings before they reach the skill files. This keeps tier-1 content organized rather than accumulating unstructured notes. [Source](../raw/deep/repos/memodb-io-acontext.md)

## Practical Implications

### Description Quality is the Triggering Bottleneck

For semantic-trigger implementations, the description field is the highest-leverage point. A skill with a mediocre description will undertrigger — it exists but never gets used. Description optimization is not cosmetic work.

The Agent Skills eval loop quantifies this: the description optimizer runs 20 queries × 3 runs each, splits 60/40 train/test to avoid overfitting, and iterates up to 5 times. Getting reliable trigger rates at 90%+ requires systematic measurement, not intuition.

### Tier-0 Size Determines System Scalability

Whatever goes in the permanent metadata tier gets paid for in every session. A system with 100 skills that puts 300 tokens of metadata per skill in permanent context costs 30K tokens per session before any work begins. This constrains how many skills can coexist and drives the requirement for tight, specific descriptions rather than verbose ones.

### Retrieval Method Shapes Knowledge Organization

The retrieval mechanism at tier-1/2 determines how knowledge should be structured:

- BM25 retrieval benefits from many small focused documents (better term concentration) over fewer large aggregated ones. The napkin benchmark uses per-round notes (~2.5K chars each) rather than full session logs (~15K chars) for exactly this reason.
- Embedding retrieval benefits from semantic richness and handles vocabulary variation better.
- Tool-call navigation benefits from clear manifest structure (well-organized SKILL.md files) and flat skill namespaces that don't require hierarchical traversal.

### Deterministic Operations Should Be Scripts

Any procedure that can be expressed as code should be code, not context. This is not just an efficiency concern — deterministic operations expressed as instructions accumulate in context across multi-step tasks, while scripts execute and exit without persisting.

## Failure Modes

**Undertriggering**: The skill exists but never activates. The mitigation is aggressive, specific descriptions and systematic trigger evaluation. Without measurement, undertriggering is invisible.

**Context budget exhaustion**: Loading multiple skills simultaneously across a complex task can exhaust context. No standard mechanism for skill-level token budgeting or priority-based unloading exists in current implementations.

**Navigation overhead**: Tool-call navigation (acontext's model) adds latency proportional to the number of tool calls required. Loading a skill file through `list_skills` → `get_skill` → `get_skill_file` requires 3 round trips. For latency-sensitive applications, this matters.

**Vocabulary mismatch in BM25 retrieval**: BM25 requires term overlap between query and document. "Authentication" won't retrieve notes about "login" unless both terms appear. Backlink graph signals partially compensate, but semantic gaps remain.

**Stale tier-0 metadata**: If the permanent metadata tier describes capabilities that have drifted from their actual implementations, routing decisions based on that metadata will be wrong. Keeping metadata current requires discipline.

## When Not to Use It

Progressive disclosure adds navigation overhead. For short-lived agents with small, stable knowledge bases, loading everything at session start is simpler and sufficient. The strategy pays off when:

- The knowledge base is large enough that full loading would consume significant context
- Tasks vary enough that different tasks need different subsets of knowledge
- Context window costs matter (e.g., long-running agents or high-volume deployments)

For a simple tool-use agent with three documented capabilities, a flat system prompt describing all three is more reliable than a three-tier progressive disclosure architecture.

## Unresolved Questions

**Optimal tier boundaries**: Current implementations set tier sizes by convention (metadata at ~100 tokens, instructions at ~5K) rather than empirical optimization. Whether these boundaries are right for different model sizes, context lengths, and task types is not established.

**Trigger conflict resolution**: When multiple skills have overlapping descriptions and multiple could trigger for the same task, current implementations rely on LLM judgment for selection. No formal mechanism for priority ordering or conflict resolution exists.

**Tier-0 update governance**: The permanent metadata tier is expensive to change because every agent using the system sees the update immediately. Who controls what goes in the permanent tier, and how changes are reviewed, is not addressed in any current implementation's documentation.

**Cross-session learning of trigger patterns**: Current trigger optimization is a development-time activity. Whether trigger effectiveness can be monitored and improved in production, without human-in-the-loop eval cycles, remains open.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — The broader discipline within which progressive disclosure is one strategy
- [Context Management](../concepts/context-management.md) — Operational management of context across agent lifecycles
- [Context Compression](../concepts/context-compression.md) — Complementary strategy: reducing context size rather than deferring loading
- [Agent Skills](../concepts/agent-skills.md) — The primary domain where progressive disclosure is systematically implemented
- [Agent Memory](../concepts/agent-memory.md) — Memory architectures that use progressive disclosure for knowledge retrieval
- [Lost in the Middle](../concepts/lost-in-the-middle.md) — The attention degradation problem that progressive disclosure partially addresses
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — Alternative approach; progressive disclosure can be implemented with or without RAG
- [CLAUDE.md](../concepts/claude-md.md) — A common tier-0 mechanism: permanent project context injected at session start

## Projects Implementing This Pattern

- [Claude Code](../projects/claude-code.md) — Via the Agent Skills SKILL.md system
- [Claude](../projects/claude.md) — Via Agent Skills on claude.ai
- [Anthropic](../projects/anthropic.md) — Canonical three-tier specification at agentskills.io
- [OpenAI](../projects/openai.md) — Analogous patterns in tool/function calling architectures
- [Gemini CLI](../projects/gemini-cli.md) — Session context injection at startup

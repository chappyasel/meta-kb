---
entity_id: agent-skills
type: concept
bucket: agent-memory
abstract: >-
  Agent Skills are reusable, composable capability units that persist in a skill
  library and are selectively loaded into agent context — distinguished from
  static prompts by their triggered, progressive disclosure architecture.
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md
  - repos/memodb-io-acontext.md
  - repos/anthropics-skills.md
  - repos/alirezarezvani-claude-skills.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/letta-ai-letta-code.md
  - repos/kepano-obsidian-skills.md
  - repos/letta-ai-letta.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - articles/agent-skills-overview.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/anthropics-skills.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/memento-teams-memento-skills.md
  - deep/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
related:
  - claude-code
  - anthropic
  - gemini
  - claude
  - openai-codex
  - context-engineering
  - progressive-disclosure
  - self-improving-agents
  - iterative-self-verification
last_compiled: '2026-04-06T02:01:00.646Z'
---
# Agent Skills

## What They Are

An agent skill is a discrete, named capability that an agent can retrieve and invoke without carrying the full capability specification in its context window at all times. Skills may take several forms: natural language procedures (markdown instruction files), executable code bundles (Python scripts, shell commands), or structured specifications combining both. The key property distinguishing skills from ordinary system prompt content is that they are stored externally, indexed, and loaded on demand.

The practical problem skills solve: agents working on long, multi-step tasks accumulate context that crowds out the specialized knowledge they need. A coding agent cannot hold API documentation for every library it might touch. A research agent cannot preload every workflow it might need. Skills provide a way to bring in relevant expertise at the moment it's needed and drop it when it's not.

## The Canonical Format: SKILL.md

The Agent Skills specification (agentskills.io, published by Anthropic in December 2025) defines a portable skill format that Claude Code, OpenAI Codex CLI, GitHub Copilot, Gemini CLI, and OpenCode all support. The format is a markdown file with YAML frontmatter:

```yaml
---
name: my-skill          # 1-64 chars, lowercase + hyphens, matches directory name
description: >          # 1-1024 chars, describes capability AND when to trigger
  Use when working with X format files or when user requests Y operation.
license: MIT            # optional
compatibility: >        # optional, environment requirements
  Requires Python 3.11+, network access for Z
metadata:               # optional arbitrary key-value
  version: 1.0.0
  author: example
allowed-tools: "Bash(git:*) Read Write"  # optional, experimental
---

# Instructions

Full skill instructions here...
```

Skills live in named directories, following an optional structure:

```
my-skill/
  SKILL.md          # required: metadata + instructions
  scripts/          # optional: executable code (presence triggers "playbook" mode)
  references/       # optional: documentation loaded on demand
  assets/           # optional: templates, data files
```

The [skill.md](../concepts/skill-md.md) page covers the specification in more detail. The [Anthropic](../projects/anthropic.md) reference implementation lives at `anthropics/skills` and includes production skills for PDF, XLSX, DOCX, and PPTX document generation, plus the `skill-creator` meta-skill that teaches agents to build and evaluate other skills.

## How Triggering Works

The agent runtime reads `name` and `description` from every skill's frontmatter at startup. When the agent receives a task, it matches user intent against these descriptions semantically. If the description matches, the full `SKILL.md` body loads into context.

This means **description quality directly determines skill utilization**. The `skill-creator` meta-skill in Anthropic's repository explicitly warns about undertriggering and recommends writing descriptions that are "a little bit pushy" — including specific contexts and trigger conditions, not just capability summaries.

The `claude-api` skill demonstrates precise trigger specification:

```
TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`
DO NOT TRIGGER when: code imports `openai`/other AI SDKs
```

Agents cannot act on this logic at the trigger layer itself — the triggering mechanism is purely the LLM's semantic matching against the description. Complex trigger conditions must be re-enforced inside the `SKILL.md` body after activation.

## Progressive Disclosure: The Core Architecture

The three-tier progressive disclosure pattern, implemented in the [Claude Code](../projects/claude-code.md) skills system, resolves the tension between rich skill knowledge and finite context windows:

**Tier 1 — Metadata (~100 tokens, always present):** The `name` and `description` fields for all skills live permanently in the agent's available_skills list. The agent pays this cost regardless of what it's doing.

**Tier 2 — Instructions (loaded on trigger, recommended under 5,000 tokens):** The full `SKILL.md` body. This is the working knowledge for task execution. The anthropics/skills repo recommends keeping SKILL.md under 500 lines.

**Tier 3 — Bundled resources (loaded on demand, unlimited):** Scripts, reference files, assets. Scripts can execute without loading into context. Reference files load selectively based on instructions in SKILL.md.

A skill like `claude-api` can hold 20+ reference files across 8 programming languages while only loading the relevant language's documentation when triggered. The common case costs ~2.5K tokens; the maximum case costs substantially more — but you only pay for what you actually need.

[Progressive Disclosure](../concepts/progressive-disclosure.md) as a concept applies across context engineering more broadly; skill architecture is one of its cleaner practical instantiations.

## Implementation Patterns Across Systems

### Static Knowledge Skills (Anthropic's skills repo, Obsidian-skills)

The simplest pattern: skills are markdown documentation that agents ingest and apply. The [Obsidian](../projects/obsidian.md) skills repository (by Obsidian's CEO) demonstrates this for proprietary file formats. Five skills cover `.md`, `.base`, and `.canvas` formats with zero executable code. An agent gains the ability to produce correct Obsidian Flavored Markdown, JSON Canvas files, and Bases formulas through carefully structured documentation alone.

This "documentation-as-capability" pattern generalizes: any proprietary format, API, or workflow can be made agent-accessible through structured markdown without custom tooling or API integrations. The constraint is that validation is purely LLM-based — there's no schema enforcement.

### Bundled Script Skills (PDF, XLSX, DOCX skills)

More capable: skills bundle deterministic helper scripts alongside `SKILL.md`. The `pdf` skill includes 8 Python scripts for form extraction, validation, and conversion. The `xlsx` skill bundles a LibreOffice-based recalculation script plus schema validation. The key property: scripts execute without loading their code into context. Deterministic operations become scripts; reasoning steps become instructions. This keeps the context cost predictable even for complex workflows.

The bundled scripts pattern appears naturally in what Memento-Skills calls "playbook mode" — if a skill directory contains files beyond `SKILL.md`, the agent treats it as executable rather than documentary.

### Self-Evolving Skills (ACE Framework, Memento-Skills)

The most complex pattern: skill libraries that update themselves through execution experience.

The **Agentic Context Engine (ACE)** from `kayba-ai/agentic-context-engine` implements a three-role feedback loop. An Agent executes tasks using the current Skillbook. A Reflector analyzes what went right or wrong, producing structured `ExtractedLearning` objects with atomicity scores. A SkillManager translates reflections into concrete mutations (ADD, UPDATE, REMOVE) applied to the Skillbook. Skills persist to disk after each epoch, surviving across sessions.

The Skillbook data model is richer than the agentskills.io spec: each skill carries `InsightSource` provenance objects recording which epoch, trace, and sample question generated it. The `SimilarityDetector` runs embedding-based deduplication between skills to prevent near-duplicate proliferation. Every mutation carries an explanation of why it was made.

**Memento-Skills** goes further, implementing genuine self-evolution: the reflection phase can rewrite skill code, adjust prompts, and create entirely new skills from failure patterns. Skills carry version counters, utility scores, and structured execution mode metadata. The `LoopDetector` catches agents stuck in research loops (six consecutive observation tool calls without any effect tool calls). Error pattern detection normalizes error messages by replacing variable content with placeholders, enabling cross-instance duplicate detection.

Both systems share a core limitation: evolved skill quality is bounded by the base model's analytical capability. If the model cannot diagnose why a skill failed, it cannot improve it.

## The Skill-Creator Meta-Skill

The `skill-creator` skill in Anthropic's repository deserves special attention because it closes the quality loop. It teaches Claude to create, evaluate, and iterate on other skills through a full eval-driven development cycle:

1. Capture intent via structured interview
2. Write `SKILL.md` following progressive disclosure
3. Create test prompts, run with-skill vs. baseline via subagents
4. Grade with assertions (programmatic + LLM-as-judge)
5. Aggregate into benchmarks with variance analysis
6. Launch HTML viewer for human review
7. Iterate based on feedback
8. Optimize description using a 60/40 train/test split, up to 5 iterations

The description optimizer runs 3 inference calls per query to get reliable trigger rate estimates. Full optimization costs approximately 300 LLM calls (20 queries × 3 runs × 5 iterations). The system measures "undertriggering" explicitly by splitting test prompts and checking trigger rates on the held-out set.

This turns skill improvement from an art into a measurable engineering process — though at significant cost.

## Skill Storage and Retrieval

Simple systems store skills as flat directory structures and rely entirely on LLM description matching for retrieval. More sophisticated systems add hybrid retrieval.

The Memento-Skills `MultiRecall` system runs three parallel search strategies:
- **BM25 keyword search** over `SKILL.md` files on disk (exact term matching)
- **Semantic vector search** using `sqlite-vec` embeddings (conceptual similarity)
- **Remote marketplace search** via HTTP API (cloud catalogue)

Results merge with local-first priority: if the same skill exists locally and in the cloud, the local version wins. This matters for user customization — a user's modified skill should not be overridden by an upstream update.

The ACE framework uses embedding-based `retrieve_top_k()` for per-task skill selection, doing cosine similarity against the task query to select the most relevant subset rather than injecting all skills into every prompt. This is preferable at scale: a library with hundreds of skills cannot afford to include all metadata in context.

The underlying [Vector Database](../concepts/vector-database.md) and [Hybrid Retrieval](../concepts/hybrid-retrieval.md) patterns that power skill retrieval are covered separately. Skill retrieval is essentially a specialized case of [Semantic Memory](../concepts/semantic-memory.md) lookup.

## Connection to Broader Memory Architecture

Skills represent one quadrant of agent memory:

- **[Episodic Memory](../concepts/episodic-memory.md):** What happened in past sessions
- **[Semantic Memory](../concepts/semantic-memory.md):** Facts about the world
- **[Procedural Memory](../concepts/procedural-memory.md):** How to perform tasks — this is what skills encode
- **[Core Memory](../concepts/core-memory.md):** Always-present identity and context

The skill library is essentially an externalized procedural memory store. The distinction from [Procedural Memory](../concepts/procedural-memory.md) proper is that skills are explicitly curated and structured; procedural memory may also include implicit patterns learned through fine-tuning.

Skills also connect to [Self-Improving Agents](../concepts/self-improving-agents.md) and [Iterative Self-Verification](../concepts/iterative-self-verification.md) — the ACE and Memento-Skills implementations demonstrate how skill evolution is one concrete mechanism for agents to improve without weight updates.

The [Voyager](../projects/voyager.md) system in Minecraft pioneered a similar skill library concept: as the agent discovered new capabilities, it stored them as executable JavaScript functions it could retrieve and invoke later. This showed that a growing skill library enables open-ended capability accumulation.

## The planning-with-files Pattern

One concrete skill demonstrates how skills can enforce structural discipline on agent behavior. The `planning-with-files` skill implements filesystem-as-working-memory, a pattern Manus AI used extensively. Three files (`task_plan.md`, `findings.md`, `progress.md`) persist agent state across context resets.

The mechanism that makes it work: lifecycle hooks. The `PreToolUse` hook fires before every tool call and injects the first 30 lines of `task_plan.md` into context:

```yaml
PreToolUse:
  - matcher: "Write|Edit|Bash|Read|Glob|Grep"
    hooks:
      - type: command
        command: "cat task_plan.md 2>/dev/null | head -30 || true"
```

This keeps goals in the agent's most recent context (where attention is highest) throughout long tasks. Evaluation showed a 90-percentage-point improvement in pass rate compared to the same agent without the skill — from 6.7% to 96.7% on 30 objective assertions. Self-reported; not independently validated.

The performance gain does not come from adding domain knowledge. It comes from enforcing better working-memory management discipline. This supports the broader claim in [Context Engineering](../concepts/context-engineering.md): how information flows through the agent's attention window often matters more than the information itself.

## Failure Modes

**Undertriggering.** The most common failure. If the description does not closely match how users phrase their requests, the skill never loads. Description optimization requires explicit measurement; most skill authors skip it.

**Context budget exhaustion.** Multiple simultaneously active skills can collectively exceed context budgets. There is no inter-skill token budgeting or priority-based unloading in current implementations.

**Description-only triggering is fragile.** There are no programmatic triggers, file-pattern matchers, or project-type detectors in the agentskills.io spec. All triggering is semantic. Complex conditions must be re-checked inside the skill body after activation.

**No inter-skill communication.** Skills in the agentskills.io model cannot read from or write to each other. There is no shared scratchpad, no skill-to-skill messaging, no mechanism for one skill's output to influence another skill's triggering.

**Static skills do not adapt.** The agentskills.io format has no runtime evolution mechanism. Skills are files. The skill-creator provides a development-time improvement loop but not a production-time one. Self-evolving systems (ACE, Memento-Skills) address this, but introduce their own risks: unevaluated skill mutations can degrade performance rather than improve it.

**Skill explosion in self-evolving systems.** Without enforced capacity limits, skill libraries grow unboundedly. Deduplication helps, but near-similar skills proliferate. Eventually the full library cannot fit in a single context window, requiring retrieval — which introduces its own recall failures.

## When Not to Use Skills

Skills are wrong for tasks with stable, narrow scope. If an agent always does the same thing (summarize a specific document format, call a specific API), embedding that capability in the system prompt is cheaper and more reliable than skill triggering.

Skills are wrong when triggering precision matters critically. Description-based triggering is fuzzy. For safety-critical operations where the wrong skill loading could cause harm, a deterministic dispatch mechanism is preferable.

Skills are not a substitute for fine-tuning when the behavior needs to generalize across diverse surface forms. A skill encodes a specific procedure; fine-tuning encodes a distributional tendency. Very general capabilities (code formatting style, response tone) belong in training, not skill files.

## Unresolved Questions

**Governance at scale.** The agentskills.io marketplace has no formal review process, vulnerability scanning, or code signing. A malicious skill injected into the marketplace could manipulate agents. The `allowed-tools` experimental field gestures toward capability restriction, but adoption is inconsistent.

**Cost at production scale.** The full skill-creator eval loop costs ~300 LLM calls per optimization cycle. Organizations running hundreds of skills have no documented cost model.

**Conflict resolution between skills.** When two skills provide contradictory instructions for the same operation, the current spec provides no resolution mechanism. The agent must handle the conflict through in-context reasoning with no formal tiebreaker.

**Transfer between skill systems.** Skills written for agentskills.io format work across 6+ runtimes, but self-evolving skill libraries (ACE's Skillbook, Memento-Skills' skill store) use proprietary formats. There is no migration path between evolution frameworks.

## Alternatives and Selection Guidance

**Use [RAG](../concepts/rag.md) over skills** when you need to retrieve factual content (documents, passages, records) rather than procedural instructions. RAG retrieves information to include in the response; skills retrieve procedures to follow during execution.

**Use [DSPy](../projects/dspy.md)** when you want programmatic optimization of prompts rather than manual skill authoring. DSPy optimizes prompt text through compilation; skills require human-authored instructions.

**Use [LangGraph](../projects/langgraph.md) or [CrewAI](../projects/crewai.md)** when your workflow requires explicit agent coordination, parallel execution, or conditional branching between roles. Skills define individual agent capabilities; graph frameworks define multi-agent coordination patterns.

**Use [Mem0](../projects/mem0.md) or [Zep](../projects/zep.md)** for user-specific episodic memory (what a particular user prefers, past conversations). Skills encode general procedures applicable to any user, not user-specific history.

**Use [CLAUDE.md](../concepts/claude-md.md) or static system prompts** for always-relevant context — project conventions, user preferences, agent identity. The overhead of skill triggering is unnecessary when content should always be present.

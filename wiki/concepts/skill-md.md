---
entity_id: skill-md
type: concept
bucket: agent-memory
abstract: >-
  Skill Files are markdown documents with YAML frontmatter that store reusable
  agent procedures; their key differentiator is a three-tier progressive
  disclosure architecture that keeps rich domain knowledge outside the context
  window until triggered by semantic description matching.
sources:
  - repos/greyhaven-ai-autocontext.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/memento-teams-memento-skills.md
  - deep/repos/anthropics-skills.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - anthropic
  - claude
  - openai
  - agent-skills
last_compiled: '2026-04-07T11:54:54.364Z'
---
# Skill Files

## What They Are

A Skill File is a `SKILL.md` document that stores a named, reusable procedure an agent can invoke during task execution. The minimal structure is a YAML frontmatter block with `name` and `description` fields, followed by markdown instructions:

```markdown
---
name: claude-api
description: Helps write code using the Anthropic API. TRIGGER when code imports `anthropic` or `@anthropic-ai/sdk`. DO NOT TRIGGER when code imports `openai`.
---

## Instructions
When the user wants to call Claude programmatically...
```

[Anthropic](../projects/anthropic.md) originated the format through the `anthropics/skills` repository, which serves simultaneously as the canonical spec host for agentskills.io, a curated skill marketplace, and the production source for [Claude](../projects/claude.md)'s document capabilities. Memento-Skills extends the concept by making skill files mutable at runtime, where agents rewrite them based on execution outcomes. ACE (Agentic Context Engine) implements a parallel pattern called the Skillbook, storing natural-language strategies with embedding-based deduplication.

The `name` field must be 1–64 characters, lowercase with hyphens, matching the parent directory name. `description` allows up to 1,024 characters and doubles as the triggering signal. Optional fields include `license`, `compatibility` (environment requirements), `metadata` (arbitrary key-value map), and `allowed-tools` (experimental, space-delimited pre-approved tools like `Bash(git:*) Read`).

## How They Work: Three-Tier Progressive Disclosure

The central mechanism is not the file format itself but the loading strategy. Skills load knowledge in three layers, solving the fundamental tension between rich domain knowledge and finite [context windows](../concepts/context-window.md).

**Tier 1 — Metadata (~100 tokens, always in context).** The `name` and `description` fields are permanently resident in the agent's `available_skills` list. This is the triggering signal. The agent reads these fields and decides whether to consult the skill.

**Tier 2 — SKILL.md body (loaded on trigger, under 5,000 tokens / ~500 lines).** The working instruction set. Loaded only when the agent determines the description matches the current task.

**Tier 3 — Bundled resources (loaded on demand, unlimited).** Scripts, reference documents, assets, templates. Python scripts can execute without being loaded into context at all. Reference files are loaded selectively based on instructions in the SKILL.md body.

This means a skill like `claude-api` can bundle 20+ reference files across eight programming languages while only loading the relevant language's docs for a given task. The anthropics/skills `pdf` skill bundles eight Python helper scripts (form extraction, fill, validate, convert) that execute without ever entering the context window. [Source](../raw/deep/repos/anthropics-skills.md)

## Description-Driven Triggering

There are no programmatic triggers, no file-pattern matchers, no project-type detectors. The agent reads the `description` field and decides semantically whether the skill applies.

This makes description quality the primary performance variable. The `skill-creator` meta-skill documentation explicitly warns against undertriggering and recommends descriptions that are "a little bit pushy" — naming specific contexts and import patterns, not just general capability areas. The `claude-api` skill demonstrates precise trigger/no-trigger specification:

```
TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`/`claude_agent_sdk`
DO NOT TRIGGER when: code imports `openai`/other AI SDK
```

Complex triggering conditions must be re-implemented inside the SKILL.md body after triggering, since the trigger layer itself is purely semantic. [Source](../raw/deep/repos/anthropics-skills.md)

## Skill Directory Structure

Skills are self-contained directories with a flat namespace:

```
skills/
  skill-creator/       # meta-skill for building other skills
    SKILL.md
    scripts/           # Python eval/benchmark tooling
    agents/            # subagent prompts (grader, comparator, analyzer)
    references/        # schema docs
    eval-viewer/       # HTML review interface
  claude-api/
    SKILL.md
    python/
    typescript/
    java/ go/ ruby/ csharp/ php/ curl/
    shared/
  pdf/
    SKILL.md
    scripts/
    reference.md
```

The marketplace system uses a `.claude-plugin/marketplace.json` manifest to organize skills into installable bundles (`document-skills`, `example-skills`, `claude-api`). Claude Code users install via `/plugin marketplace add anthropics/skills`. [Source](../raw/deep/repos/anthropics-skills.md)

## Skill Pattern Taxonomy

Analyzing the anthropics/skills catalog reveals four distinct architectural patterns:

**Document production skills** (`pdf`, `xlsx`, `docx`, `pptx`): Heavy on bundled scripts for deterministic operations. The `xlsx` skill bundles a LibreOffice-based recalculation script and schema validation. These are the most complex, with SKILL.md files of 200–300 lines plus extensive script directories.

**Creative skills** (`algorithmic-art`, `frontend-design`, `theme-factory`): Emphasize process over rules. The `frontend-design` skill is prescriptive about avoiding specific aesthetic failure modes. The `theme-factory` skill bundles 10 pre-built theme definitions as reference assets.

**Meta-skills** (`skill-creator`, `mcp-builder`): Skills that help build other capabilities. The `skill-creator` implements a full eval-driven development loop (described below). `mcp-builder` implements a four-phase process with external documentation fetching.

**Workflow skills** (`doc-coauthoring`): Multi-stage interactive processes with explicit state transitions. The `doc-coauthoring` skill implements a three-stage pipeline with subagent-based verification. [Source](../raw/deep/repos/anthropics-skills.md)

## The Skill-Creator Meta-Skill

The most architecturally significant entry in the anthropics/skills repo is `skill-creator` — a skill that teaches agents how to build, evaluate, and iterate on other skills. It implements an eval-driven development loop:

1. Capture intent via structured interview
2. Write SKILL.md following the progressive disclosure pattern
3. Create test prompts and run them via subagents (with-skill vs baseline)
4. Grade with assertions (programmatic + [LLM-as-judge](../concepts/llm-as-judge.md))
5. Aggregate into benchmarks with variance analysis
6. Launch HTML viewer for human review of qualitative outputs
7. Iterate based on feedback, re-running tests each cycle
8. Optimize description via a 60/40 train/test split triggering eval

The description optimizer runs 3 times per query for reliable trigger rates and iterates up to 5 times. The full eval loop (20 queries × 3 runs × 5 iterations = 300 LLM calls) makes systematic optimization a significant cost center. There is no mechanism for ongoing trigger monitoring in production. [Source](../raw/deep/repos/anthropics-skills.md)

The testing framework uses three tiers: static SKILL.md validation (free, under 2 seconds), full end-to-end via `claude -p` (~$3.85, ~20 minutes), and LLM-as-judge quality scoring (~$0.15, ~30 seconds).

## Runtime Evolution: The Mutable Variant

The agentskills.io spec and anthropics/skills treat skill files as static artifacts evolved at development time. Memento-Skills extends this with a Read-Execute-Reflect-Write loop where skills mutate at deployment time.

After execution, the reflection phase can:
- Increment or decrement the skill's utility score based on outcome
- Rewrite the skill's instructions and code based on failure analysis
- Create an entirely new skill when no existing capability is adequate

The Pydantic `Skill` model adds fields absent from the minimal spec: `version` (integer counter), `execution_mode` (`KNOWLEDGE` or `PLAYBOOK`), `entry_script`, `required_keys`, and `parameters` (OpenAI/Anthropic-compatible schema). A skill becomes a "playbook" when its directory contains executable scripts alongside SKILL.md — this is auto-inferred from directory structure. [Source](../raw/deep/repos/memento-teams-memento-skills.md)

The Memento-Skills paper (arXiv:2603.18743) evaluates on HLE (Humanity's Last Exam) and GAIA, finding that performance improvement tracks with skill library growth from lived task experience. These are self-reported benchmarks from the paper authors; no independent replication is documented.

## ACE Skillbook: The Embedding Variant

ACE (Agentic Context Engine) implements a parallel concept called the Skillbook — a thread-safe dictionary of `Skill` objects where each skill carries:

- `id`: Auto-generated as `{section_prefix}-{counter:05d}` (e.g., `general-00042`)
- `content`: Natural-language strategy text
- `justification` and `evidence`: Why the skill was added
- `sources`: `InsightSource` objects tracking epoch, trace UID, sample question
- `embedding`: Float vector for deduplication
- `status`: `active` or `invalid` (soft-delete)

Skills are deduplicated by cosine similarity via a `SimilarityDetector`. When the system decides two skills should remain separate despite high similarity, it records a `KEEP` decision with reasoning and the similarity score, preventing re-evaluation of the same pair in subsequent epochs. Skills are injected into agent prompts either via full skillbook rendering or `retrieve_top_k()` — cosine similarity against the current query, returning only the most relevant skills.

The ACE pattern differs from the agentskills.io spec in that skills are natural-language strategies rather than procedural instructions, and the entire lifecycle (creation, deduplication, injection, citation tracking) is automated through the three-role pipeline. [Source](../raw/deep/repos/kayba-ai-agentic-context-engine.md)

## Relationship to Adjacent Memory Concepts

Skill files occupy a specific position in the [agent memory](../concepts/agent-memory.md) taxonomy. They are [procedural memory](../concepts/procedural-memory.md) — stored know-how for executing tasks — rather than [episodic memory](../concepts/episodic-memory.md) (records of past events) or [semantic memory](../concepts/semantic-memory.md) (factual knowledge). The [CLAUDE.md](../concepts/claude-md.md) file pattern is a related concept: project-level context that persists across sessions, but typically storing project facts and conventions rather than reusable executable procedures.

The progressive disclosure architecture is a specific application of [progressive disclosure](../concepts/progressive-disclosure.md) to [context management](../concepts/context-management.md): tier-1 metadata always loads, tier-2 instructions load on trigger, tier-3 resources load on demand. This aligns with [context compression](../concepts/context-compression.md) goals — keeping the context window focused on immediately relevant material.

[Agent Workflow Memory](../projects/agent-workflow-memory.md) and [Voyager](../projects/voyager.md) implement related patterns where agents store and retrieve reusable workflows, though neither uses the SKILL.md format specifically.

## Strengths

**Context budget efficiency.** The three-tier loading strategy means even a large skill library (dozens of skills, each with extensive reference documentation) imposes only the tier-1 metadata cost on every request. Only triggered skills load their full body, and only the specific reference files needed for the current task enter the context.

**No infrastructure dependency.** Skill files are plain markdown on disk. They require no vector database, no embedding model, no external service. The retrieval mechanism is the base LLM's semantic understanding of the description field.

**Composable with scripted operations.** Bundled scripts handle deterministic operations without consuming context. A skill can combine LLM-driven reasoning (instructions in SKILL.md) with deterministic processing (Python scripts that execute externally) cleanly.

**Cross-surface portability.** The same SKILL.md works in Claude Code, Claude.ai, and the Claude API. The format is implementation-agnostic within the agentskills.io ecosystem.

## Critical Limitations

**Undertriggering is the primary failure mode.** When a skill would improve output quality but the description does not precisely match the user's phrasing, the skill simply does not load. The mitigation — writing aggressive, specific descriptions — creates a competing risk of false triggering on unrelated tasks. The anthropics/skills documentation acknowledges this directly. There is no fallback mechanism when description matching fails.

**Unspoken infrastructure assumption: the agent must support the spec.** Skill files do nothing without an agent runtime that implements the three-tier loading protocol. The agentskills.io spec defines the format, but adoption outside Anthropic's own products is not documented. Teams building on LangChain, CrewAI, or custom frameworks must implement the loading protocol themselves.

## When Not to Use Skill Files

**When tasks are simple and routine.** The skill-creator documentation notes that simple queries ("read this PDF") may not trigger skills at all because the base model handles them directly. Skills add value on complex, multi-step, specialized tasks.

**When you need cross-skill composition.** Skills have no mechanism for invoking each other. There is no shared scratchpad, no skill-to-skill data flow, no way for the output of one skill to influence triggering of another. Complex pipelines requiring skill chaining need a different architecture.

**When you need runtime adaptation without human review.** Static skill files cannot learn from execution outcomes. The Memento-Skills mutable variant addresses this, but with the tradeoff that evolved skills are never formally validated — quality depends entirely on the base model's ability to diagnose its own failures.

**When you need programmatic triggers.** If skill invocation depends on detecting specific file types, project structures, or system states rather than semantic task description, the description-only triggering mechanism is the wrong tool.

## Unresolved Questions

**Governance of the agentskills.io spec.** The spec is hosted by Anthropic, but the governance model for community contributions, versioning, and compatibility across agent implementations is not publicly documented.

**Cost at scale with many installed skills.** The tier-1 metadata for all installed skills is always in context. With dozens of skills installed, the overhead of maintaining the `available_skills` list is non-trivial, and there is no published guidance on the practical limit before it degrades performance.

**`allowed-tools` field maturity.** The spec marks this field experimental. Support varies between agent implementations. It is the only governance mechanism for restricting what tools a skill can invoke, but it is not reliably enforced.

**Conflict resolution between skills.** When two installed skills have overlapping descriptions, there is no documented tie-breaking rule. Whether both load, one takes precedence, or the behavior is undefined is not specified.

## Alternatives

**[CLAUDE.md](../concepts/claude-md.md)**: Use when you need project-level context (conventions, architecture decisions, team norms) rather than reusable executable procedures. CLAUDE.md is always loaded; skills are conditional.

**[Retrieval-Augmented Generation](../concepts/rag.md)**: Use when you need to retrieve information from large document collections based on query similarity. RAG retrieves facts; skill files retrieve procedures.

**[Procedural Memory](../concepts/procedural-memory.md) systems (Letta, Mem0)**: Use when you need runtime memory evolution with formal persistence guarantees and multi-session continuity. These systems add infrastructure overhead that skill files avoid.

**Memento-Skills**: Use skill files (agentskills.io spec) when skills are maintained by developers and deployed to users. Use Memento-Skills when the agent should improve its own skills from live task experience without developer intervention.

**Direct system prompt**: Use when you have a single, stable task domain and do not need the overhead of a skill management system. A well-crafted system prompt outperforms a poorly-triggered skill file.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md)
- [Procedural Memory](../concepts/procedural-memory.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Progressive Disclosure](../concepts/progressive-disclosure.md)
- [CLAUDE.md](../concepts/claude-md.md)
- [Context Management](../concepts/context-management.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Self-Improving Agent](../concepts/self-improving-agent.md)

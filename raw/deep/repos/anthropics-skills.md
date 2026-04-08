---
url: 'https://github.com/anthropics/skills'
type: repo
author: anthropics
date: '2026-04-04'
tags:
  - agent-systems
  - agentic-skills
  - skill-composition
  - context-engineering
  - SKILL.md-standard
key_insight: >-
  Anthropic's official skills repo establishes a three-tier progressive
  disclosure architecture (metadata always in context, SKILL.md on trigger,
  bundled resources on demand) that solves the fundamental tension between rich
  skill knowledge and finite context windows -- the real innovation is not the
  SKILL.md format itself but the governance pattern of marketplace-based plugin
  distribution with strict naming, description-driven triggering, and a
  meta-skill (skill-creator) that closes the loop on skill quality via
  eval-driven iteration.
stars: 110064
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - spec/agent-skills-spec.md
    - template/SKILL.md
    - .claude-plugin/marketplace.json
    - skills/skill-creator/SKILL.md
    - skills/claude-api/SKILL.md
    - skills/pdf/SKILL.md
    - skills/theme-factory/SKILL.md
    - skills/doc-coauthoring/SKILL.md
    - skills/algorithmic-art/SKILL.md
  analyzed_at: '2026-04-04'
  original_source: repos/anthropics-skills.md
relevance_scores:
  topic_relevance: 10
  practitioner_value: 10
  novelty: 8
  signal_quality: 10
  composite: 9.7
  reason: >-
    This is the canonical SKILL.md reference implementation with a detailed
    three-tier progressive disclosure architecture, marketplace governance
    pattern, and meta-skill (skill-creator) — directly core to topic areas 3
    (Context Engineering) and 4 (Agent Architecture) with immediately actionable
    patterns.
---

## Architecture Overview

The anthropics/skills repository is the canonical reference implementation for Anthropic's Agent Skills system. At its core, skills are self-contained folders with a SKILL.md file containing YAML frontmatter (name + description) plus markdown instructions. The repository serves three roles simultaneously: (1) the official spec host for the Agent Skills standard at agentskills.io, (2) a marketplace of curated example skills, and (3) the production source for Claude's document capabilities (docx, xlsx, pptx, pdf).

The directory structure enforces a flat, per-skill namespace:

```
skills/
  skill-creator/    # meta-skill for building other skills
    SKILL.md
    scripts/        # Python eval/benchmark tooling
    agents/         # subagent prompts (grader, comparator, analyzer)
    references/     # schema docs
    eval-viewer/    # HTML review interface
    assets/         # eval review template
  claude-api/       # multi-language API skill
    SKILL.md
    python/         # language-specific docs
    typescript/
    java/ go/ ruby/ csharp/ php/ curl/
    shared/         # cross-language concepts
  pdf/              # document production skill
    SKILL.md
    scripts/        # deterministic Python helpers
    reference.md
    forms.md
  theme-factory/    # design skill with bundled assets
    SKILL.md
    themes/         # 10 pre-built theme definitions
```

The marketplace system uses a `.claude-plugin/marketplace.json` manifest to organize skills into installable plugin bundles (document-skills, example-skills, claude-api). This enables distribution via `claude /plugin marketplace add anthropics/skills`.

## Core Mechanism

### Three-Tier Progressive Disclosure

This is the central architectural innovation. Skills load knowledge in three layers:

1. **Metadata tier** (~100 words, always in context): The YAML frontmatter `name` and `description` fields are permanently resident in Claude's available_skills list. This is the triggering mechanism -- Claude decides whether to consult a skill based solely on this description.

2. **SKILL.md body** (loaded on trigger, <500 lines ideal): The full instruction set. This is the working knowledge for task execution. The skill-creator explicitly recommends keeping this under 500 lines to avoid context bloat.

3. **Bundled resources** (loaded on demand, unlimited): Scripts, reference docs, assets, and templates. Scripts can execute without being loaded into context. Reference files are read selectively based on instructions in SKILL.md.

This solves a fundamental tension: you want skills to have deep domain knowledge (thousands of lines of API docs, schema references, example code), but you cannot afford to put it all in context. The progressive disclosure pattern means a skill like claude-api can have 20+ reference files across 8 languages while only loading the relevant language's docs when triggered.

### Description-Driven Triggering

The triggering mechanism is purely semantic. Claude reads the `description` field and decides whether to consult the skill. This means description quality directly determines whether a skill gets used. The skill-creator SKILL.md explicitly warns about "undertriggering" and recommends making descriptions "a little bit pushy" -- including specific contexts and use cases, not just what the skill does.

The claude-api skill demonstrates this with a precise trigger/no-trigger spec:
```
TRIGGER when: code imports `anthropic`/`@anthropic-ai/sdk`/`claude_agent_sdk`
DO NOT TRIGGER when: code imports `openai`/other AI SDK
```

### The Skill-Creator Meta-Skill

The most architecturally significant skill is `skill-creator` -- a meta-skill that teaches Claude how to create, evaluate, and iterate on other skills. It implements a full eval-driven development loop:

1. **Capture intent** via interview (what, when, expected format)
2. **Write SKILL.md** following the progressive disclosure pattern
3. **Create test prompts** and run them via subagents (with-skill vs baseline)
4. **Grade with assertions** (programmatic + LLM-as-judge)
5. **Aggregate into benchmarks** with variance analysis
6. **Launch HTML viewer** for human review of qualitative outputs
7. **Iterate** based on feedback, re-running tests each cycle
8. **Optimize description** via a train/test split triggering eval

This closes a critical loop: skills are not just consumed but can be systematically improved via measurement. The description optimizer runs 3x per query to get reliable trigger rates, splits 60/40 train/test to avoid overfitting, and iterates up to 5 times.

### Bundled Scripts Pattern

Skills can bundle deterministic helper scripts that execute without being loaded into context. The PDF skill demonstrates this with 8 Python scripts (form extraction, fill, validate, convert). The skill's SKILL.md tells Claude when to invoke each script, but the script code itself never enters the context window. This is a crucial optimization: deterministic operations should be scripts, not instructions.

## Design Tradeoffs

### Minimal Spec vs Rich Governance

The SKILL.md spec is deliberately minimal -- only `name` and `description` are required in frontmatter. Everything else (compatibility, scripts, references, assets) is optional and convention-based. This maximizes adoption but means there is no schema validation, no type checking of parameters, no standardized testing framework beyond what skill-creator provides ad hoc. Compare this to Memento-Skills' structured Pydantic schemas with ExecutionMode, SkillManifest, and formal governance metadata.

### Flat Structure vs Hierarchical Skills

Skills are always flat folders at the top level. There is no concept of skill dependencies, skill inheritance, or skill composition (using one skill from within another). The claude-api skill works around this by organizing sub-domains as reference files (python/, typescript/, shared/) rather than sub-skills. This simplifies discovery but limits composability.

### Plugin Distribution vs Individual Installation

The marketplace.json manifest enables bundle-level distribution (install "document-skills" to get xlsx + docx + pptx + pdf), but individual skills cannot declare dependencies on each other. This is a deployment-time coupling mechanism only -- at runtime, each skill operates independently.

### Description-Only Triggering

There are no programmatic triggers, no file-pattern matchers, no project-type detectors. Triggering is purely through the LLM's interpretation of the description. This is elegant but fragile: complex triggering conditions (like claude-api's language detection logic) must be re-implemented inside the SKILL.md body after triggering, not at the trigger layer itself.

## Failure Modes & Limitations

**Undertriggering**: The skill-creator explicitly warns that Claude tends to not invoke skills when they would be useful. The mitigation is aggressive description writing, but this creates a tension with precision -- overly broad descriptions can trigger inappropriately.

**Context budget exhaustion**: Skills that bundle many reference files risk blowing context budgets when multiple are loaded simultaneously. There is no mechanism for skill-level token budgeting or priority-based unloading.

**No runtime skill evolution**: Skills are static files. There is no mechanism for a skill to learn from execution outcomes, update its instructions based on failure patterns, or version itself. The skill-creator provides a development-time improvement loop but not a runtime one.

**No inter-skill communication**: Skills cannot read from or write to each other. There is no shared scratchpad, no skill-to-skill messaging, no way for the output of one skill to influence the triggering or behavior of another.

**Description optimization is expensive**: The full eval loop (20 queries x 3 runs x 5 iterations = 300 LLM calls) makes systematic description optimization a significant cost center, and there is no mechanism for ongoing trigger monitoring in production.

## Integration Patterns

### For Claude Code Users

Skills install via the plugin marketplace system:
```bash
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
```

Once installed, skills trigger automatically when the description matches the user's request. No explicit invocation is needed.

### For Claude.ai Users

Skills are available to paid plans in Claude.ai. Custom skills can be uploaded via the settings interface. The skill-creator includes Claude.ai-specific adaptations (no subagents, no browser viewer, inline review instead).

### For API Users

Skills are available via the Claude API Skills endpoint. The SKILL.md format is identical across all surfaces -- the same skill works in Claude Code, Claude.ai, and the API.

### Skill Authoring Pattern

The recommended authoring flow uses the skill-creator meta-skill:
1. Draft SKILL.md with progressive disclosure structure
2. Bundle scripts for deterministic operations
3. Organize reference files by domain/variant
4. Run eval loop with realistic test prompts
5. Optimize description for reliable triggering
6. Package and distribute via marketplace or direct upload

## Benchmarks & Performance

No formal benchmarks are published for individual skills. The skill-creator includes a benchmarking framework with:

- **Pass rate**: Assertion success rate across test cases
- **Time/token comparison**: With-skill vs baseline (no skill) or old-skill
- **Variance analysis**: Mean +/- stddev across 3+ runs per query
- **Blind comparison**: Independent LLM judge evaluates two outputs without knowing which had the skill

The testing framework is organized into three tiers:
- Tier 1 (free, <2s): Static SKILL.md validation
- Tier 2 (~$3.85, ~20min): Full E2E via `claude -p`
- Tier 3 (~$0.15, ~30s): LLM-as-judge quality scoring

The key performance insight from the skill-creator documentation: simple queries ("read this PDF") may not trigger skills at all because Claude handles them directly. Skills provide value primarily on complex, multi-step, specialized tasks where the description matches and the instructions meaningfully improve output quality.

## The agentskills.io Specification (External)

The Agent Skills spec at agentskills.io defines the canonical format that Anthropic's repo implements. Key spec details not visible from the repo alone:

**Frontmatter fields**: `name` (required, 1-64 chars, lowercase + hyphens, must match parent directory name), `description` (required, 1-1024 chars), `license` (optional), `compatibility` (optional, 1-500 chars for environment requirements), `metadata` (optional, arbitrary key-value map), `allowed-tools` (optional, experimental, space-delimited pre-approved tool list like `Bash(git:*) Read`).

**Progressive disclosure budgets**: The spec recommends metadata at ~100 tokens (always loaded), instructions at <5000 tokens (loaded on activation), and resources loaded on demand. The 500-line SKILL.md recommendation maps to roughly this 5000-token budget.

**File reference depth**: The spec explicitly recommends keeping file references "one level deep from SKILL.md" and avoiding "deeply nested reference chains." This is a constraint against complex skill architectures.

**Validation tooling**: The spec provides a `skills-ref` reference library for validation: `skills-ref validate ./my-skill`. This checks frontmatter validity and naming conventions.

**The `allowed-tools` field** is marked experimental and deserves attention. It enables skills to declare pre-approved tools (e.g., `Bash(git:*) Bash(jq:*) Read`), which is a nascent governance mechanism. Support varies between agent implementations.

## Skill Pattern Taxonomy (From Analyzing 12+ Skills)

Analyzing the full skill catalog reveals distinct architectural patterns:

**Document Production Skills** (pdf, xlsx, docx, pptx): Heavy on bundled scripts for deterministic operations. The xlsx skill bundles a LibreOffice-based recalculation script, schema validation, and detailed formula construction rules. These skills are the most complex, with SKILL.md files of 200-300 lines plus extensive script directories.

**Creative Skills** (algorithmic-art, frontend-design, theme-factory): Emphasize process over rules. The algorithmic-art skill implements a two-phase creative process (philosophy creation then code generation) with mandatory template reading. The frontend-design skill is remarkably prescriptive about avoiding "AI slop" aesthetics.

**Meta Skills** (skill-creator, claude-api, mcp-builder): Skills that help build other capabilities. The mcp-builder skill implements a four-phase process (research, implement, review, evaluate) with external documentation fetching. These demonstrate how skills can compose with external resources.

**Workflow Skills** (doc-coauthoring): Multi-stage interactive processes with explicit state transitions. The doc-coauthoring skill implements a three-stage pipeline (Context Gathering, Refinement & Structure, Reader Testing) with subagent-based verification.

The pattern across all skills: description quality is the triggering bottleneck, progressive disclosure manages context budgets, and bundled scripts handle deterministic operations that would waste context if expressed as instructions.

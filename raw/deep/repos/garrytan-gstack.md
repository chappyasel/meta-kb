---
url: 'https://github.com/garrytan/gstack'
type: repo
author: garrytan
date: '2026-04-04'
tags:
  - agent-systems
  - agentic-skills
  - skill-composition
  - context-engineering
  - self-improving
key_insight: >-
  gstack's core innovation is not individual skills but the sprint-as-DAG
  pattern: skills are sequenced into a Think-Plan-Build-Review-Test-Ship-Reflect
  pipeline where each skill's output feeds the next skill's context, combined
  with a SKILL.md.tmpl template system that generates docs from source code
  metadata to prevent documentation drift -- this creates a self-consistent
  process layer where 23 specialist roles compose into a repeatable software
  factory that one person operates at 10-15 parallel instances.
stars: 63766
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - ARCHITECTURE.md
    - ETHOS.md
    - CLAUDE.md
    - docs/skills.md
    - SKILL.md.tmpl
    - agents/openai.yaml
    - docs/ADDING_A_HOST.md
    - docs/designs/SELF_LEARNING_V0.md
    - docs/designs/SESSION_INTELLIGENCE.md
    - bin/gstack-learnings-log
    - bin/gstack-learnings-search
    - test/skill-validation.test.ts
    - test/skill-e2e.test.ts
  analyzed_at: '2026-04-04'
  original_source: repos/garrytan-gstack.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 8
  signal_quality: 9
  composite: 8.9
  reason: >-
    gstack is a direct implementation of SKILL.md-based agent architecture with
    a multi-agent sprint-as-DAG pipeline, modular specialist roles, and
    template-driven context engineering — core to topics 3 and 4, with
    transferable patterns for multi-agent coordination and self-improving
    workflows.
---

## Architecture Overview

gstack is a skill-based process layer that transforms Claude Code (and 7 other AI coding agents) into a "virtual engineering team" with 23+ specialist roles and 8 power tools, all implemented as SKILL.md files with markdown instructions. Created by Garry Tan (Y Combinator President & CEO), it encodes an opinionated software development process: Think > Plan > Build > Review > Test > Ship > Reflect.

Garry Tan open-sourced gstack in March 2026, describing it as "how I build software" -- his exact personal Claude Code setup shared with no premium tier, no waitlist, under the MIT license. The project surpassed 10,000 GitHub stars in the first 48 hours, making it one of the fastest-growing developer tools on GitHub in 2026, ultimately reaching over 63,000 stars. Using this setup, Tan reports averaging 10,000 lines of code and 100 pull requests per week over a 50-day period.

The project generated significant coverage and debate. TechCrunch covered the polarized community reaction under the headline "Why Garry Tan's Claude Code setup has gotten so much love, and hate." The core philosophy that drives both enthusiasm and skepticism is what commentators call "cognitive gearing" -- forcing a large language model into distinct professional personas, each with its own goals, biases, and areas of expertise, to simulate a high-functioning software team's workflow rather than using a single generic assistant.

The architecture has three distinct layers:

```
Layer 1: Skill Templates (.tmpl)     Human-written prose + placeholders
           | gen-skill-docs.ts
Layer 2: Generated SKILL.md          Committed, AI-readable instructions
           | Claude Code skill loader
Layer 3: Runtime Execution            Claude reads SKILL.md, follows workflow
```

**The browser daemon** is the technical backbone -- a persistent Chromium instance managed by a Bun-compiled binary that provides sub-second browser commands over localhost HTTP. This enables skills like `/qa` to open real browsers, click through flows, find bugs, and generate regression tests. Performance claims are approximately 100ms per command, significantly faster than MCP-based browser tools which take "seconds per command."

**Multi-host support** is a distinguishing feature. gstack works on Claude Code, OpenAI Codex CLI, OpenCode, Cursor, Factory Droid, OpenClaw, Slate, and Kiro -- all from the same SKILL.md files, adapted per host via typed config files in `hosts/`.

The directory layout is one skill per top-level directory:
```
gstack/
  review/SKILL.md           # Staff engineer code review
  ship/SKILL.md             # Release engineer workflow
  qa/SKILL.md               # QA lead + browser testing
  cso/SKILL.md              # Security audit (OWASP + STRIDE)
  office-hours/SKILL.md     # Product strategy (YC-style)
  plan-ceo-review/SKILL.md  # Founder product thinking
  plan-eng-review/SKILL.md  # Architecture review
  design/src/               # Design binary (GPT Image API)
  browse/src/               # Browser daemon (Playwright + Bun)
  extension/                # Chrome sidebar extension
  bin/                      # CLI utilities
  test/                     # 3-tier test suite
  docs/designs/             # Internal design documents
```

## Core Mechanism

### The Cognitive Gearing Model

gstack's fundamental premise rejects the "omni-bot paradigm" -- the idea that a single generalist AI assistant can handle all software engineering tasks. As one analysis puts it, generic prompts yield "profoundly mediocre" code because the model context-switches between planning, implementing, reviewing, and deploying without the focused expertise any single role demands.

Cognitive gearing forces the LLM into distinct professional personas. Each skill locks the AI into a specific role complete with its own goals, biases, and areas of expertise. The documented roles include:

- **CEO** (`/plan-ceo-review`) -- Rethinks problems from first principles, identifying "ten-star product" opportunities hidden in requirements before implementation begins
- **Designer** (`/plan-design-review`) -- Scores design dimensions and fixes the plan before code is written
- **Engineering Manager** (`/plan-eng-review`) -- Translates vision into concrete blueprints: architecture, data flows, system diagrams, edge cases, and testing matrices
- **Staff Engineer** (`/review`) -- Hunts for subtle production failures: N+1 queries, trust boundary violations, retry logic flaws, and concurrency issues that pass CI tests
- **QA Lead** (`/qa`) -- Opens real browsers, tests flows, generates regression tests
- **Chief Security Officer** (`/cso`) -- Conducts OWASP Top 10 + STRIDE threat model audits
- **Release Engineer** (`/ship`) -- Handles deployment: branch synchronization, testing, review resolution, PR submission
- **Documentation Engineer** (`/document-release`) -- Updates all docs to match shipped code
- **Retrospective Facilitator** (`/retro`) -- Generates weekly retrospective with shipping metrics

This eliminates what practitioners call "the context-switching penalty that produces mediocre, unfocused code" -- the same mechanism that makes human engineering teams more effective than a single generalist developer.

### The Sprint DAG

gstack's fundamental insight is that AI skills are most powerful when sequenced into a process. Each skill produces artifacts that the next skill consumes:

1. `/office-hours` writes a design doc to `~/.gstack/projects/`
2. `/plan-ceo-review` reads that doc and challenges product assumptions
3. `/plan-eng-review` reads both and produces architecture + test plan
4. `/plan-design-review` scores design dimensions and fixes the plan
5. Build phase: Claude implements against the reviewed plan
6. `/review` finds bugs that pass CI but fail in production
7. `/qa` opens real browser, tests flows, generates regression tests
8. `/ship` syncs main, runs tests, audits coverage, opens PR
9. `/document-release` updates all docs to match shipped code
10. `/retro` generates weekly retrospective with shipping metrics

This is not a formal DAG executor (unlike Hivemind's LangGraph StateGraph) -- it relies on Claude reading context from previous skill invocations within the same session or from persisted files. The coupling is implicit through shared filesystem artifacts. The distinction matters: gstack is "a process, not a collection of tools" -- the skills run in the order a sprint runs, and each skill feeds into the next.

The full skill roster includes: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/design-shotgun`, `/design-html`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/connect-chrome`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/plan-devex-review`, `/devex-review`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`, and `/learn`.

### The Review Army: Parallel Specialist Subagents

A major evolution in gstack's architecture is the Review Army pattern (Release 2 of the self-learning roadmap, shipped). Every `/review` now dispatches specialist subagents in parallel rather than running one agent against a single giant checklist. Seven focused reviewers operate simultaneously:

1. **Testing specialist** -- identifies testing gaps
2. **Maintainability reviewer** -- flags code health issues
3. **Security analyst** -- vulnerability detection
4. **Performance reviewer** -- latency and resource concerns
5. **Data migration specialist** -- schema and migration safety
6. **API contract reviewer** -- breaking change detection
7. **Adversarial red team** -- attempts to break the code

Each specialist reads the diff independently with fresh context, outputs structured JSON findings, and the main agent merges, deduplicates (via fingerprint matching), and boosts confidence when multiple specialists flag the same issue. This is the multi-agent review pattern applied to code review -- using specialist diversity as a quality signal rather than relying on a single reviewer's comprehensive coverage.

### The Template System

The SKILL.md.tmpl template system prevents the most insidious failure mode of AI skill systems: documentation drift. Templates contain human-written workflows and tips with machine-filled placeholders:

| Placeholder | Source | What it generates |
|---|---|---|
| `{{COMMAND_REFERENCE}}` | `commands.ts` | Categorized command table |
| `{{SNAPSHOT_FLAGS}}` | `snapshot.ts` | Flag reference with examples |
| `{{PREAMBLE}}` | `gen-skill-docs.ts` | Session tracking, update check, learnings |
| `{{BROWSE_SETUP}}` | `gen-skill-docs.ts` | Binary discovery + setup |
| `{{QA_METHODOLOGY}}` | `gen-skill-docs.ts` | Shared QA methodology |
| `{{REVIEW_DASHBOARD}}` | `gen-skill-docs.ts` | Review readiness dashboard |

This ensures that if a browse command exists in `commands.ts`, it appears in SKILL.md docs. If it does not exist, it cannot appear. CI validates freshness via `gen:skill-docs --dry-run` + `git diff --exit-code`.

### The Preamble Pattern

Every skill starts with an injected `{{PREAMBLE}}` block that provides five cross-cutting concerns in a single bash command:

1. **Update check**: Reports if an upgrade is available
2. **Session tracking**: Counts active sessions; 3+ triggers "ELI16 mode" for multi-window users
3. **Operational self-improvement**: At session end, the agent reflects on failures and logs operational learnings to a JSONL file
4. **AskUserQuestion format**: Standardized question format with context + recommendation + options
5. **Search Before Building**: Three-layer knowledge framework (tried-and-true, new-and-popular, first-principles)

### Learnings System

The `/learn` skill manages a per-project JSONL learning store. After each session, the agent reflects on CLI errors, wrong approaches, and project quirks, logging them as operational learnings. These compound across sessions -- gstack literally gets smarter on a codebase over time. The `gstack-learnings-log` and `gstack-learnings-search` CLI utilities manage this store.

The learning schema includes: timestamp, skill origin, type (pattern/pitfall/preference/architecture/tool), unique key, insight text, confidence score (1-10), source (observed/user-stated/inferred/cross-model), branch, commit, and files. Confidence decay is built in: 1 point per 30 days for observed/inferred learnings, preventing stale patterns from persisting indefinitely. Cross-project learnings are supported with opt-in consent.

### Multi-Host Adaptation

Each supported AI agent has a typed config file in `hosts/`:
```typescript
// hosts/claude.ts
export const claude: HostConfig = {
  name: 'claude',
  skillDir: '~/.claude/skills/gstack',
  // tool name mappings, capability flags, etc.
}
```

The `setup` script auto-detects installed agents and generates host-appropriate SKILL.md files. Hook-based safety skills (careful, freeze, guard) use inline safety advisory prose on non-Claude hosts since they lack hook APIs.

### The Browser Daemon

The persistent Chromium daemon (random port, UUID auth, 30-min idle timeout) provides sub-second browser commands after first launch. This architectural choice enables real QA workflows but adds significant complexity: state files, version auto-restart, crash recovery (server exits immediately on Chromium crash, CLI auto-restarts), and localhost-only security with bearer token auth.

Performance claims position gstack's browser daemon favorably against alternatives: approximately 100ms per command versus "seconds per command" for MCP-based browser implementations. Additional capabilities include built-in cookie import for authenticated testing, per-workspace isolation architecture, and accessibility-tree element targeting for reliable UI interaction.

### Parallel Sprint Pattern with Conductor

gstack is designed for 10-15 concurrent Claude Code sessions via Conductor, a session orchestration layer. Each session runs its own browse daemon on a random port. The sprint structure makes parallelism manageable: each agent follows the same process, and the preamble's session tracking warns when 3+ sessions are active.

Conductor orchestrates up to 10 isolated Claude Code sessions running simultaneously -- one session refactoring the auth module, another writing API tests, a third fixing CSS bugs, and a fourth performing QA testing, all running in parallel without interference. This is gstack's answer to the throughput question: not a faster single agent, but a factory of parallel specialist agents each following the same structured process.

### Cross-Model Review

The `/codex` skill gets an independent code review from OpenAI's Codex CLI. When both `/review` (Claude) and `/codex` (OpenAI) have reviewed the same branch, a cross-model analysis shows overlapping and unique findings. This is a novel integration pattern: using model diversity as a quality signal.

## Design Tradeoffs

### Opinionated Process vs Composable Primitives

gstack makes strong opinions about how software should be built: CEO > designer > eng manager > developer > reviewer > QA > ship. This is its greatest strength and limitation. You get an end-to-end process that works, but you cannot easily reorganize the pipeline or add custom stages. The sprint is the unit of work, not the individual skill. Community comparison articles note this as the key difference from tools like Cursor and Windsurf: gstack is about "ensuring code is right, works, and ships safely" rather than just "writing code faster."

### Role-Based Identity vs Generic Skills

Each skill is a "specialist" with a named role (CEO, Staff Engineer, QA Lead, Chief Security Officer). The system prompt language is deliberately humanizing -- not "run security scan" but "you are the CSO conducting an OWASP Top 10 + STRIDE threat model." This increases engagement quality but makes the system culturally specific and harder to adapt to different organizational structures.

### Session-Based Composition vs Explicit DAG

Skills compose through shared session context and filesystem artifacts, not through formal dependency declarations. This is simpler to implement but means there is no way to validate the DAG, no way to detect missing intermediate steps, and no way to resume a partial sprint from a checkpoint. Compare this to Memento-Skills' formal PlanStep with step_id, input_from, and skill_name fields.

### Committed SKILL.md vs Runtime Generation

SKILL.md files are committed to git, not generated at runtime. This enables git blame, CI freshness checks, and deterministic behavior, but means skill updates require a code change + build cycle. The template system mitigates this by auto-generating from source code metadata.

### Browser Daemon Model

The persistent Chromium daemon (random port, UUID auth, 30-min idle timeout) provides sub-second browser commands after first launch. This architectural choice enables real QA workflows but adds significant complexity: state files, version auto-restart, crash recovery (server exits immediately on Chromium crash, CLI auto-restarts), and localhost-only security with bearer token auth.

### gstack vs Competing Approaches

Community comparisons position gstack against several alternatives:

| Dimension | gstack | Cursor/Windsurf | Generic Claude Code | MCP Browser Tools |
|---|---|---|---|---|
| Planning | Structured multi-role review | None | Starts coding immediately | N/A |
| Code review | Multi-pass specialist army | Surface-level | Surface-level comments | N/A |
| Browser testing | ~100ms/command, real Chromium | None | None | Seconds/command |
| Parallelism | 10 simultaneous sessions | Single session | Single session | N/A |
| Process | Full sprint lifecycle | Ad-hoc | Ad-hoc | N/A |

gstack positions itself as "a transmission providing specialized gears for an existing engine" -- it does not replace the AI coding agent but structures how it operates.

## Failure Modes & Limitations

**Process rigidity**: The Think > Plan > Build > Review > Test > Ship pipeline assumes a product development workflow. Teams doing research, data engineering, or infrastructure work need to reorganize or skip stages, but the skill design assumes the full pipeline.

**Session state fragility**: Skills compose through implicit session context. If a session crashes between `/plan-eng-review` and build, the architectural decisions are lost unless they were persisted to `~/.gstack/projects/`. There is no formal checkpoint/resume mechanism (though the Session Intelligence architecture, partially shipped, addresses this).

**Multi-host lowest common denominator**: Supporting 8 different AI agents means skills must use the intersection of capabilities. Hook-based safety (crucial for /careful and /freeze) degrades to advisory prose on non-Claude hosts.

**Learning store is append-only**: The JSONL learnings file grows monotonically. While confidence decay (1 point per 30 days) prevents stale patterns from persisting, there is no mechanism for pruning stale learnings, detecting contradictory learnings, or surfacing the most relevant learnings for the current context.

**No skill evolution**: Unlike Memento-Skills' reflection loop that rewrites skill code, gstack skills are static SKILL.md files. The `/learn` skill captures operational patterns but cannot modify the skill instructions themselves.

**Single-user design**: The security model (one server per workspace, one user) and learning system (per-project JSONL) assume a single developer. Team-scale deployment would require rethinking session isolation, learning aggregation, and concurrent access.

**Agent drift at enterprise scale**: A critical analysis by Epsilla identifies "agent drift" as gstack's fundamental scaling limitation. Without shared memory across machines, agents on different machines operate in silos, creating "isolated virtual teams" that inevitably diverge. The analysis argues enterprise-grade orchestration requires a shared semantic graph (memory layer) and Model Context Protocol infrastructure that gstack itself lacks. This positions gstack as excellent for individual developers but architecturally insufficient for multi-developer teams without additional infrastructure.

**Star count vs. active usage**: While 63,000+ GitHub stars demonstrate massive interest, the actual adoption pattern is unclear. The project's design for a single power user (Garry Tan's personal workflow) means the gap between starring and daily-driving may be larger than typical for developer tools.

## Integration Patterns

### Installation

```bash
# Global (Claude Code)
git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup

# Project-local (committed to repo)
cp -Rf ~/.claude/skills/gstack .claude/skills/gstack
rm -rf .claude/skills/gstack/.git && ./setup
```

### Parallel Sprint Pattern

gstack is designed for 10-15 concurrent Claude Code sessions (via Conductor). Each session runs its own browse daemon on a random port. The sprint structure makes parallelism manageable: each agent follows the same process, and the preamble's session tracking warns when 3+ sessions are active.

### Cross-Model Review

The `/codex` skill gets an independent code review from OpenAI's Codex CLI. When both `/review` (Claude) and `/codex` (OpenAI) have reviewed the same branch, a cross-model analysis shows overlapping and unique findings. This is a novel integration pattern: using model diversity as a quality signal.

### Chrome Extension

The `extension/` directory contains a Chrome sidebar extension that provides visual QA capabilities integrated with the browser daemon, enabling UI testing workflows that bridge the gap between automated browser commands and visual inspection.

## Benchmarks & Performance

gstack reports aggregate shipping metrics via `/retro`:
- **600,000+ lines of production code** in 60 days (35% tests)
- **10,000-20,000 lines per day**, part-time
- **140,751 lines added, 362 commits, ~115k net LOC** in one week across 3 projects
- **100 pull requests per week** sustained over 50 days

The effort compression table from ETHOS.md:

| Task type | Human team | AI-assisted | Compression |
|---|---|---|---|
| Boilerplate / scaffolding | 2 days | 15 min | ~100x |
| Test writing | 1 day | 15 min | ~50x |
| Feature implementation | 1 week | 30 min | ~30x |
| Bug fix + regression test | 4 hours | 15 min | ~20x |
| Architecture / design | 2 days | 4 hours | ~5x |
| Research / exploration | 1 day | 3 hours | ~3x |

The testing infrastructure uses a 3-tier system:
- Tier 1 (free, <5s): Parse SKILL.md commands against registry, validate templates
- Tier 2 (~$3.85, ~20min): Full E2E via `claude -p` with NDJSON streaming
- Tier 3 (~$0.15, ~30s): LLM-as-judge scoring on clarity/completeness/actionability

Browser daemon performance: approximately 100ms per command after initial launch, compared to "seconds per command" for MCP-based browser alternatives.

## Self-Learning Roadmap (Internal Design Doc)

The `docs/designs/SELF_LEARNING_V0.md` reveals a 7-release roadmap that positions gstack as a learning system, not just a skill registry. This design document, generated via gstack's own `/office-hours` + `/plan-ceo-review` + `/plan-eng-review` pipeline, is itself evidence of the system's design philosophy.

**Release 1 (Shipped): Learnings Persistence**. Per-project JSONL learnings store at `~/.gstack/projects/{slug}/learnings.jsonl`. Schema includes: timestamp, skill origin, type (pattern/pitfall/preference/architecture/tool), unique key, insight text, confidence score (1-10), source (observed/user-stated/inferred/cross-model), branch, commit, and files. Confidence decay: 1 point per 30 days for observed/inferred learnings. Cross-project learnings with opt-in consent.

**Release 2 (Shipped): Review Army**. 7 parallel specialist subagents (testing, maintainability, security, performance, data-migration, API contract, design) plus red team. JSON-structured findings with confidence scores and fingerprint dedup. This is the multi-agent review pattern applied to code review.

**Release 3 (Shipped): Session Intelligence**. Four distinct persistence layers that share JSONL storage but serve different purposes: Learnings (institutional knowledge), Timeline (event history), Checkpoints (working state snapshots), Health (code quality scores). Key insight: "Learnings = what you know. Timeline = what happened. Checkpoints = where you are. Health = how good the code is."

**Release 4 (Not Shipped): Adaptive Ceremony**. Trust policy engine with per-change-class trust levels. Three ceremony levels (FULL/STANDARD/FAST) determined by scope, trust, and change class. Certain classes (migrations, auth, infra, new endpoints) never fast-track. This addresses the "proxy signals as permission to skip scrutiny" risk.

**Release 5 (Not Shipped): /autoship**. A resumable state machine: office-hours -> autoplan -> BUILD -> health gate -> review -> qa -> ship -> checkpoint archive. Depends on all prior releases. This is the endgame: one command produces a complete, reviewed, tested feature.

**The differentiation table** from the design doc is revealing:
| Tool | Memory model | Scope | Structure |
|---|---|---|---|
| Cursor | Per-user chat memory | Per-session | Unstructured |
| CLAUDE.md | Static file | Per-project | Manual |
| Windsurf | Persistent context | Per-session | Unstructured |
| gstack | Per-project JSONL | Cross-session, cross-skill | Typed, scored, decaying |

## Session Intelligence Architecture (Internal Design Doc)

The `docs/designs/SESSION_INTELLIGENCE.md` reveals a five-layer context recovery architecture:

1. **Context Recovery** (~10 lines of preamble prose): After compaction, agent checks `~/.gstack/projects/$SLUG/` for recent plans, reviews, and checkpoints
2. **Session Timeline**: Every skill appends one-line JSONL entries (timestamp, skill, branch, outcome)
3. **Cross-Session Injection**: Preamble prints `LAST_SESSION` and `LATEST_CHECKPOINT` for current branch
4. **Checkpoint Skill**: Manual working state snapshots with branch-aware YAML frontmatter
5. **Health Skill**: Code quality dashboard (type-check, lint, tests, dead code) with 0-10 composite score

The compounding effect is explicit: "Session 1: plan saved. Session 2: agent reads plan, doesn't re-ask. Session 3: checkpoint saved. Session 4: compaction fires mid-refactor, agent recovers from checkpoint."

This is a concrete implementation of the "context engineering" pattern: structured artifacts on disk that survive the ephemeral context window, with automatic injection into future sessions.

## Community Reception & Cultural Impact

gstack's release in March 2026 was one of the most discussed events in the AI coding tools space. The project's rapid growth (10,000 stars in 48 hours, ultimately 63,000+) and polarized reception reveal deeper tensions in the developer community about AI-assisted development.

**Supporters** point to the concrete productivity metrics (10,000+ LOC/week), the principled rejection of the omni-bot paradigm, and the fact that a high-profile tech leader (YC CEO) shared his exact personal workflow transparently and freely.

**Critics** raise several concerns: the metrics may reflect Garry Tan's specific workflow and codebase rather than being universally achievable; the star count was driven by Tan's social media reach rather than organic developer discovery; the opinionated process assumes a product development workflow that does not map to all engineering work; and the single-user design limits enterprise applicability.

The broader impact is the validation of the "specialist agent team" pattern over the "generalist omni-bot" approach. Whether or not individual developers adopt gstack wholesale, the cognitive gearing concept -- forcing LLMs into focused roles with specific goals and constraints -- has influenced how the community thinks about structuring AI coding workflows.

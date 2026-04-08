---
entity_id: gstack
type: project
bucket: agent-architecture
abstract: >-
  GStack is Garry Tan's open-source Claude Code skill library: 23 specialist
  roles (CEO, QA Lead, CSO, etc.) sequenced into a
  Think-Plan-Build-Review-Test-Ship-Reflect pipeline with a persistent browser
  daemon for real Chromium testing.
sources:
  - deep/repos/garrytan-gstack.md
  - deep/repos/memento-teams-memento-skills.md
  - repos/garrytan-gstack.md
related:
  - cursor
  - claude-code
last_compiled: '2026-04-08T23:25:33.890Z'
---
# GStack

## What It Is

GStack is a skill-based process layer that wraps [Claude Code](../projects/claude-code.md) (and 7 other AI coding agents) in an opinionated software development pipeline. Created by Garry Tan, Y Combinator's President and CEO, it encodes 23 specialist roles — CEO, designer, staff engineer, QA lead, chief security officer, release engineer — as SKILL.md files that Claude reads and executes as slash commands.

The core claim: a single developer running 10-15 parallel Claude Code sessions through gstack's structured sprint can ship at the rate of a full engineering team. Tan reports 600,000+ lines of production code in 60 days, 10,000-20,000 lines per day part-time, and 100 pull requests per week sustained over 50 days. These numbers are self-reported via gstack's own `/retro` command, not independently validated.

Released March 2026 under MIT license, no premium tier, no waitlist. Reached 63,000+ GitHub stars.

## What's Architecturally Unique

Most AI coding tools are omni-bots: one generalist agent that context-switches between planning, implementing, reviewing, and deploying. GStack rejects this. Each skill locks the LLM into a focused role with its own goals and constraints. The `/cso` skill is not "run a security scan" — it is "you are the CSO conducting an OWASP Top 10 + STRIDE threat model." The `/plan-ceo-review` skill challenges product assumptions before a line of code is written.

The second architectural distinction is sequential composition. Skills are not a menu — they are a sprint DAG. `/office-hours` writes a design doc to `~/.gstack/projects/`. `/plan-ceo-review` reads that doc. `/plan-eng-review` reads both and produces an architecture plan. `/qa` picks up the test plan from `/plan-eng-review`. Each skill consumes artifacts from the previous stage and produces artifacts for the next. The coupling is implicit through shared filesystem state, not a formal DAG executor.

The third distinction is the persistent browser daemon: a Playwright-backed Chromium instance compiled with Bun, running on a random localhost port with UUID bearer token auth and a 30-minute idle timeout. This enables the `/qa` skill to open a real browser, click through flows, find bugs, generate regression tests, and auto-fix them — all within a single session. GStack claims approximately 100ms per command versus "seconds per command" for MCP-based browser tools. This claim is self-reported.

## Core Mechanism: How It Works

**Three-layer build system**

```
Layer 1: SKILL.md.tmpl     Human-written prose + placeholders
         gen-skill-docs.ts
Layer 2: SKILL.md           Committed, AI-readable instructions
         Claude Code skill loader
Layer 3: Runtime            Claude reads SKILL.md, executes workflow
```

Template placeholders pull from source code directly:

| Placeholder | Source file | What it generates |
|---|---|---|
| `{{COMMAND_REFERENCE}}` | `commands.ts` | Categorized command table |
| `{{SNAPSHOT_FLAGS}}` | `snapshot.ts` | Flag reference with examples |
| `{{PREAMBLE}}` | `gen-skill-docs.ts` | Session tracking, update check, learnings |
| `{{BROWSE_SETUP}}` | `gen-skill-docs.ts` | Binary discovery and setup |
| `{{QA_METHODOLOGY}}` | `gen-skill-docs.ts` | Shared QA methodology |

CI validates freshness via `gen:skill-docs --dry-run` plus `git diff --exit-code`. If a browse command exists in `commands.ts`, it appears in SKILL.md. If it does not exist, it cannot appear. This prevents documentation drift — the failure mode where skill instructions describe capabilities that no longer exist in the binary.

**The Preamble Pattern**

Every skill starts with an injected `{{PREAMBLE}}` block that handles five cross-cutting concerns in a single bash invocation: update check, session tracking (3+ active sessions triggers "ELI16 mode"), operational self-improvement logging, standardized question format (`AskUserQuestion` with context + recommendation + options), and the three-layer search framework (tried-and-true, new-and-popular, first-principles).

**Review Army: Parallel Specialist Subagents**

The `/review` skill dispatches 7 specialist subagents in parallel, each reading the diff with fresh context:

1. Testing specialist
2. Maintainability reviewer
3. Security analyst
4. Performance reviewer
5. Data migration specialist
6. API contract reviewer
7. Adversarial red team

Each outputs structured JSON findings with confidence scores. The orchestrating agent merges results, deduplicates via fingerprint matching, and boosts confidence when multiple specialists flag the same issue independently. This is the multi-agent review pattern applied to code review.

**The Learnings System**

The `/learn` skill manages a per-project JSONL store at `~/.gstack/projects/{slug}/learnings.jsonl`. After each session, the agent reflects on CLI errors, wrong approaches, and project-specific quirks, logging them with typed schema: timestamp, skill origin, type (pattern/pitfall/preference/architecture/tool), unique key, insight, confidence score (1-10), source (observed/user-stated/inferred/cross-model), branch, commit, and files.

Confidence decay is built in: 1 point per 30 days for observed and inferred learnings. Cross-project learnings require opt-in consent. The `gstack-learnings-log` and `gstack-learnings-search` CLI utilities manage the store.

**Session Intelligence (Internal Design: `docs/designs/SESSION_INTELLIGENCE.md`)**

Four persistence layers, all JSONL, serving different purposes:
- **Learnings** — institutional knowledge (what to know)
- **Timeline** — event history (what happened)
- **Checkpoints** — working state snapshots (where you are)
- **Health** — code quality scores (how good the code is)

After context compaction, the preamble injects `LAST_SESSION` and `LATEST_CHECKPOINT` for the current branch. The compound effect: session 1 saves a plan; session 2 reads it without re-asking; session 3 saves a checkpoint; session 4 recovers from that checkpoint after compaction fires mid-refactor.

**Multi-Host Adaptation**

Each supported agent has a typed config file in `hosts/`. The `setup` script auto-detects installed agents and generates host-appropriate SKILL.md files. Supported: Claude Code, [OpenAI Codex](../projects/codex.md) CLI, OpenCode, [Cursor](../projects/cursor.md), Factory Droid, OpenClaw, Slate, Kiro. Hook-based safety skills (`/careful`, `/freeze`, `/guard`) degrade to advisory prose on non-Claude hosts since they lack hook APIs.

**The Sprint Sequence**

```
/office-hours         YC-style forcing questions → design doc
/plan-ceo-review      Challenges product assumptions, 4 scope modes
/plan-eng-review      Architecture, data flow, edge cases, test plan
/plan-design-review   Rates design dimensions 0-10, edits plan
[Build]
/review               Review Army (7 parallel specialists)
/qa                   Real browser, click-through, auto-fix + regression tests
/cso                  OWASP Top 10 + STRIDE, 8/10+ confidence gate
/ship                 Sync main, run tests, audit coverage, open PR
/document-release     Update all docs to match what shipped
/retro                Weekly metrics: LOC, commits, test health
```

**Testing Infrastructure**

Three-tier test system:
- **Tier 1** (free, <5s): Parse SKILL.md commands against registry, validate templates
- **Tier 2** (~$3.85, ~20min): Full end-to-end via `claude -p` with NDJSON streaming
- **Tier 3** (~$0.15, ~30s): [LLM-as-Judge](../concepts/llm-as-judge.md) scoring on clarity, completeness, and actionability

## Key Numbers

| Metric | Value | Source |
|---|---|---|
| GitHub stars | 63,000+ | GitHub (self-reported via project) |
| Stars in first 48h | 10,000+ | Self-reported |
| LOC in 60 days | 600,000+ | Self-reported via `/retro` |
| LOC per day | 10,000-20,000 | Self-reported |
| Pull requests/week | 100 | Self-reported over 50 days |
| Browser command latency | ~100ms | Self-reported vs. MCP alternatives |
| Specialist roles | 23+ | Verified by SKILL.md count |
| Supported agents | 8 | Verified by `hosts/` directory |

All productivity metrics are self-reported by Garry Tan based on his personal workflow. No independent validation exists. The 63,000 stars reflect social reach (Tan's Twitter/X following is large) as much as organic developer adoption.

## Strengths

**Structured process over blank-prompt prompting.** GStack eliminates the cold-start problem. New Claude Code users get a defined workflow instead of staring at an empty prompt wondering whether to plan or code first.

**Role-based focus genuinely changes output quality.** Forcing the LLM into a single specialist role with explicit goals and anti-patterns produces more focused analysis than asking a generalist to "review this code." The CSO finds different issues than the staff engineer reviewer, and that difference compounds.

**The browser daemon solves a real problem.** MCP browser tools are slow enough to break iteration rhythm. A persistent Chromium instance at ~100ms per command enables QA workflows that would be impractical otherwise. Real browser testing in a coding session is a meaningful capability gap over [Cursor](../projects/cursor.md) and [Windsurf](../projects/windsurf.md).

**Documentation drift prevention.** The template system with CI freshness checks (`git diff --exit-code`) is a concrete solution to a real problem: skill instructions that describe functionality that no longer exists in the binary.

**Multi-agent review as quality signal.** The cross-model review pattern (`/codex` running OpenAI's Codex CLI on the same diff) uses model diversity as a quality signal. When both Claude and Codex flag the same issue, confidence is higher than either alone.

**[Context Engineering](../concepts/context-engineering.md) through structured artifacts.** Persisting plans, reviews, and checkpoints to `~/.gstack/projects/` means critical architectural decisions survive context window compaction and session restarts. This is a practical implementation of the context engineering principle: put the right information in the context at the right time.

## Critical Limitations

**Concrete failure mode — session state fragility under compaction.** Skills compose through implicit session context and filesystem artifacts. If Claude's context window compacts between `/plan-eng-review` and the build phase, and the architectural decisions were not fully persisted to `~/.gstack/projects/`, the agent loses the context and may re-ask questions the user already answered or make different architectural choices than the plan specified. The Session Intelligence architecture (Checkpoints) partially addresses this, but recovery depends on the checkpoint having been created before compaction fired. There is no automatic checkpoint-before-compaction trigger.

**Unspoken infrastructure assumption — single-developer design.** The security model (one browser daemon per workspace), learning system (per-project JSONL), and session tracking all assume one person. Team-scale deployment would require rethinking session isolation, learning aggregation across developers, concurrent JSONL access, and browser daemon multiplexing. GStack is architecturally a personal power tool, not a team platform. A critical analysis by Epsilla identifies "agent drift" as the scaling limitation: without shared memory across machines, agents on different machines operate in silos. Enterprise-grade orchestration requires a shared semantic graph — infrastructure gstack itself lacks.

## When NOT to Use GStack

**Non-product development workflows.** The sprint pipeline assumes software product development: plan, build, review, ship. Research, data engineering, infrastructure automation, and exploratory analysis do not fit the Think-Plan-Build-Review-Test-Ship-Reflect arc. You can skip stages, but the skills are designed for sequential composition, and partial sprint runs feel awkward.

**Team environments without additional infrastructure.** GStack's learnings, checkpoints, and session state are per-developer, per-machine. If two developers work on the same codebase, their gstack learnings diverge. There is no shared learning aggregation or conflict resolution.

**When you need formal DAG validation.** GStack's sprint is sequential by convention, not enforcement. Nothing prevents you from running `/ship` before `/review`, and there is no pipeline validation. If your use case requires guaranteed stage ordering with checkpointing and resume, a formal orchestration layer ([LangGraph](../projects/langgraph.md), Conductor) is more appropriate.

**When the base agent changes frequently.** SKILL.md files are committed to git. Skill updates require a build cycle (`gen-skill-docs.ts` regeneration, commit, push). Projects where the Claude Code API changes rapidly will require ongoing maintenance of the template system.

**When you want evolving skills, not static instructions.** GStack skills are static SKILL.md files. The `/learn` system captures operational patterns but cannot rewrite skill instructions. If you need skills that self-evolve based on failure analysis, Memento-Skills' Read-Execute-Reflect-Write loop is a better fit.

## Unresolved Questions

**Governance of the learnings store at scale.** The JSONL learnings file grows monotonically. Confidence decay (1 point per 30 days) prevents stale patterns from persisting indefinitely, but there is no pruning mechanism, no contradiction detection between conflicting learnings, and no relevance ranking for the current task context. What happens to the learnings store after 6 months of heavy use is not documented.

**Cost at scale.** Running 10-15 parallel Claude Code sessions through the full sprint pipeline generates substantial API costs. The README does not address cost estimation or budgeting. A single `/plan-eng-review` plus `/review` plus `/qa` cycle across 10 parallel sessions could easily consume $50-100 in API credits depending on codebase size.

**Self-learning roadmap completion.** The `docs/designs/SELF_LEARNING_V0.md` reveals a 7-release roadmap. Releases 1-3 (Learnings Persistence, Review Army, Session Intelligence) are shipped. Releases 4-7 (Adaptive Ceremony, /autoship, and others) are not. The document is an internal design doc generated by gstack itself — there is no public commitment to a delivery timeline.

**Conflict resolution in the preamble session tracking.** The preamble warns users when 3+ sessions are active and triggers "ELI16 mode" (simpler explanations). But it does not address conflicts between concurrent sessions writing to the same JSONL files, the same plan directories, or the same git branches. How concurrent writes are handled is not documented.

**Star count vs. active daily usage.** 63,000 stars is an attention signal, not a usage signal. GStack's design for a single power user's personal workflow means the gap between starring and daily-driving may be wider than typical developer tools. No DAU/MAU data exists.

## Alternatives

| Use case | Tool | Selection guidance |
|---|---|---|
| Structured AI coding process | GStack | Use when you want an opinionated, end-to-end sprint pipeline with browser testing and multi-agent review |
| Self-evolving skill library | Memento-Skills | Use when you need skills that rewrite themselves based on failure analysis |
| Multi-agent orchestration with formal DAG | [LangGraph](../projects/langgraph.md) | Use when you need explicit data flow validation and state machine guarantees |
| Inline AI coding assistance | [Cursor](../projects/cursor.md) / [Windsurf](../projects/windsurf.md) | Use when you want IDE integration without process overhead |
| Persistent agent memory across sessions | [Letta](../projects/letta.md) / [Mem0](../projects/mem0.md) | Use when cross-session memory is the primary requirement |
| Framework-agnostic agent building | [LangChain](../projects/langchain.md) / [CrewAI](../projects/crewai.md) | Use when you need ecosystem integrations and library support |

GStack is the right choice when you want Garry Tan's specific software development process encoded as Claude Code slash commands, you work alone or on a small team, and you are willing to manage the build cycle for skill updates. It is the wrong choice when you need team-scale coordination, formal pipeline validation, or skills that evolve based on empirical feedback.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — GStack's filesystem artifact persistence is a practical implementation of context engineering
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — The Review Army pattern applies multi-agent coordination to code review
- [Agent Memory](../concepts/agent-memory.md) — The learnings JSONL store and session intelligence layers implement cross-session memory
- [CLAUDE.md](../concepts/claude-md.md) — GStack skills are registered via CLAUDE.md entries
- [Procedural Memory](../concepts/procedural-memory.md) — SKILL.md files encode procedural knowledge as reusable agent capabilities
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — The `AskUserQuestion` format standardizes where human decisions enter the sprint

[Source](../raw/deep/repos/garrytan-gstack.md) | [Source](../raw/repos/garrytan-gstack.md)

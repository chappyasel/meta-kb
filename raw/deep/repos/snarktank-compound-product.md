---
url: 'https://github.com/snarktank/compound-product'
type: repo
author: snarktank
date: '2026-04-04'
tags:
  - self-improving
  - context-engineering
  - knowledge-bases
key_insight: >-
  Implements an autonomous observe-correct-improve loop for production software
  where the system reads its own performance reports (metrics, errors,
  feedback), uses LLM analysis to pick the #1 actionable priority, then
  orchestrates an AI agent through a fully automated pipeline (report analysis
  -> PRD generation -> task decomposition into 8-15 granular machine-verifiable
  tasks -> execution loop with quality gates -> PR creation), with compounding
  self-improvement through AGENTS.md long-term memory and progress.txt
  cross-iteration learnings.
stars: 503
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - AGENTS.md
    - scripts/auto-compound.sh
    - scripts/loop.sh
    - scripts/prompt.md
    - scripts/CLAUDE.md
    - scripts/analyze-report.sh
    - skills/prd/SKILL.md
    - skills/tasks/SKILL.md
    - config.example.json
    - install.sh
    - examples/sample-tasks.json
    - examples/sample-report.md
    - examples/sample-prd.md
  analyzed_at: '2026-04-04'
  original_source: repos/snarktank-compound-product.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 8
  signal_quality: 9
  composite: 8.9
  reason: >-
    This is a directly relevant, production-ready autonomous
    observe-correct-improve loop with AGENTS.md long-term memory, multi-phase
    orchestration, and explicit compounding self-improvement mechanics—all core
    to the self-improving systems and context engineering pillars of this
    knowledge base.
---

## Architecture Overview

Compound Product is a bash-orchestrated autonomous improvement system for production software. Unlike the autoresearch family (which optimizes a scalar metric through code changes), Compound Product operates at the product level: it reads performance reports, identifies the highest-impact issue, creates a plan, implements it through an AI agent, and delivers a pull request -- all without human intervention.

The system architecture consists of four phases connected by shell scripts:

```
Phase 0: Your System (external)
  -> generates reports/*.md (metrics, errors, feedback)

Phase 1: Analysis (analyze-report.sh)
  -> reads report, picks #1 priority via LLM API
  -> outputs analysis.json (priority_item, description, rationale, acceptance_criteria, branch_name)

Phase 2: Planning (auto-compound.sh + agent)
  -> creates feature branch
  -> agent generates PRD via prd skill -> tasks/prd-{feature}.md
  -> agent converts PRD to tasks via tasks skill -> prd.json (8-15 granular tasks)

Phase 3: Execution (loop.sh + agent)
  -> iterates: pick next task -> implement -> quality checks -> commit -> update prd.json
  -> continues until all tasks pass or max iterations reached
  -> creates PR via gh CLI
```

The system uses either Amp or Claude Code as the AI agent backend. Configuration lives in `compound.config.json`:

```json
{
  "tool": "amp",
  "reportsDir": "./reports",
  "outputDir": "./scripts/compound",
  "qualityChecks": ["npm run typecheck", "npm test"],
  "maxIterations": 25,
  "branchPrefix": "compound/"
}
```

The compounding effect comes from three memory mechanisms:
1. **Git history** -- Previous commits show what was done
2. **progress.txt** -- Learnings, patterns, and gotchas from each iteration
3. **AGENTS.md** -- Long-term codebase knowledge updated by the agent

## Origin and Lineage

Compound Product was created by Ryan Carson (snarktank) and builds on three intellectual lineages:

**Geoffrey Huntley's Ralph pattern**: The foundational loop mechanism -- a bash script that runs an AI coding agent repeatedly until all PRD items are complete. Ralph itself achieved significant traction (12,000+ GitHub stars, VentureBeat coverage) by demonstrating that "a bash loop running coding agents repeatedly until all PRD items are complete" could produce working software. Ralph's design philosophy embraces "eventual consistency" -- accepting imperfection and trusting that repeated execution with feedback loops will converge toward working software. Huntley describes it as "deterministically bad in an undeterministic world."

**Kieran Klaassen's Compound Engineering methodology**: The strategic framework that each improvement should make future improvements easier. This is the "compound" in Compound Product -- not compound interest on money, but compound returns on engineering knowledge.

**Carson's own implementation and extensions**: Carson added the report analysis phase (turning product telemetry into actionable priorities), the PRD generation skill (structured planning before execution), and the compounding memory mechanisms (AGENTS.md, progress.txt). He also demonstrated the pattern working across multiple parallel instances: "Three instances of Ralph using Amp, building three separate features, on three branches."

Carson's broader work includes a series of articles documenting the autonomous agent workflow:
- "How to make your agent learn and ship while you sleep" -- the nightly autonomous cycle
- "How to setup your agent to do daily testing + file bugs" -- automated E2E testing that files actionable bugs
- "Code Factory: How to setup your repo so your agent can auto write and review 100% of your code" -- risk-aware CI gates with machine-verifiable browser/test evidence

This progression reveals compound-product as one component of a larger vision: fully autonomous software development where agents generate, test, review, and ship code with human oversight limited to PR review.

## Core Mechanism

### Report Analysis (`analyze-report.sh`)

The entry point is a daily report (any markdown file with metrics, error logs, user feedback, recommendations). The analysis script sends the report to an LLM API (supports Anthropic, OpenRouter, OpenAI, AI Gateway) with strict constraints:

- Must NOT require database migrations
- Must be completable in a few hours
- Must be specific and verifiable (not vague)
- Prefer fixes over new features, high-impact/low-effort
- Focus on UI/UX improvements, copy changes, bug fixes, configuration changes
- Must NOT pick items from the "Recently Fixed" section (automatically assembled from PRDs modified in the last 7 days)

The anti-duplication mechanism is particularly clever: the script scans `tasks/prd-*.md` files modified within the last 7 days, extracts their titles, and injects them as a "do not pick" list into the analysis prompt. This prevents the system from repeatedly working on the same issue.

### PRD Generation (prd skill)

The PRD skill instructs the agent to:
1. **Self-clarify** by answering 5 critical questions internally (problem/goal, core functionality, scope/boundaries, success criteria, constraints) without asking the user
2. Generate a structured PRD with Introduction, Goals, Tasks (T-001 format with acceptance criteria), Functional Requirements, Non-Goals, Technical Considerations, Success Metrics, and Open Questions
3. Save to `/tasks/prd-{feature-name}.md`

The self-clarification step is important: it forces the agent to reason about the problem before generating solutions, reducing the risk of misunderstanding the report's recommendations. The DeepWiki analysis describes this as a "self-clarification protocol" where the agent "derives answers from analysis JSON, AGENTS.md codebase context, existing code patterns, and the constraint directives provided" -- grounding the PRD in the actual codebase rather than abstract planning.

### Task Decomposition (tasks skill)

The tasks skill converts a PRD into `prd.json` with a critical focus on **machine-verifiable granularity**:

**Target: 8-15 tasks per PRD** (not 3-5 large ones). Each task must:
- Do ONE thing
- Have boolean pass/fail acceptance criteria
- Separate investigation from implementation
- Be completable in one context window

The task schema enforces structure:

| Field | Type | Purpose |
|---|---|---|
| `id` | string | Unique identifier (T-001, T-002...) |
| `title` | string | Action verb + target |
| `description` | string | 1-2 sentence explanation |
| `acceptanceCriteria` | string[] | Machine-verifiable pass/fail conditions |
| `priority` | number | Execution order (lower = earlier) |
| `passes` | boolean | Completion status (initially false) |

The skill defines specific acceptance criteria patterns:
- Command checks: "Run `npm run typecheck` -- exits with code 0"
- File checks: "File `src/auth/config.ts` contains `redirectUrl: '/onboarding'`"
- Browser checks: "agent-browser: open /login -- SignIn component renders"
- API checks: "POST /api/signup returns 200"
- Console checks: "agent-browser: console shows no errors"

Prohibited patterns include vague criteria like "works correctly" or "review the configuration" -- anything requiring human judgment rather than mechanical verification. This granularity is the key design decision for reliable autonomous execution. Large tasks fail because the agent loses context or makes compounding errors. Small, machine-verifiable tasks create a natural checkpoint-and-verify rhythm.

### Execution Loop (`loop.sh`)

The loop is a simple bash iteration:

```bash
for i in $(seq 1 $MAX_ITERATIONS); do
  OUTPUT=$(cat prompt.md | amp --dangerously-allow-all)
  if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
    exit 0
  fi
  sleep 2
done
```

Each iteration starts a fresh agent session that:
1. Reads `compound.config.json` for configuration
2. Reads `prd.json` for the task list
3. Reads `progress.txt` (checking Codebase Patterns section first)
4. Picks the highest-priority task where `passes: false`
5. Implements that single task
6. Runs quality checks from config
7. Updates AGENTS.md with discovered patterns
8. Commits with `feat: [Task ID] - [Task Title]`
9. Updates `prd.json` to set `passes: true`
10. Appends to `progress.txt` with structured learnings

The fresh context per iteration is both a limitation and a feature: the agent cannot carry state between iterations, but `progress.txt` and `prd.json` serve as explicit, persistent memory. The "Codebase Patterns" section at the top of `progress.txt` is specifically designed for cross-iteration knowledge transfer:

```
## Codebase Patterns
- Use `sql` template for aggregations
- Always use `IF NOT EXISTS` for migrations
- Export types from actions.ts for UI components
```

### The Compounding Effect

The system's name comes from the compounding nature of its improvements:

1. **Each iteration enriches progress.txt** with learnings, gotchas, and patterns that help subsequent iterations avoid mistakes
2. **AGENTS.md files accumulate institutional knowledge** about the codebase (API patterns, gotchas, dependencies) that persists across features
3. **Small correct changes compound** -- many small, verified changes are more valuable than a few large, risky ones
4. **Reports reflect actual product state** -- if the system fixes a bug today, tomorrow's report won't flag it, and the system moves on to the next priority

The scheduling integration (macOS launchd via plist) enables nightly autonomous runs: generate report during the day, run compound-product overnight, review PR in the morning.

Carson demonstrated this working in practice with three parallel instances building separate features simultaneously. The key insight from his experience: "I spent at least 30 minutes specifying the user stories very carefully, before I kicked off" each instance. The quality of the PRD determines the quality of the autonomous work -- compound-product amplifies good specifications and amplifies bad ones equally.

## Relationship to Ralph

Compound Product extends Ralph (snarktank/ralph, 12K+ stars) with three additional layers:

**Report analysis**: Ralph requires a human-written PRD as input. Compound Product adds an automated report analysis phase that converts production telemetry into priorities and PRDs, closing the loop between product performance and development work.

**Skill-based planning**: Ralph's PRD-to-execution pipeline is manual. Compound Product adds PRD generation and task decomposition skills that convert a single priority item into a structured, machine-executable plan.

**Compounding memory**: Both systems use progress.txt and git history, but Compound Product's AGENTS.md mechanism and the anti-duplication system (scanning recent PRDs to avoid repetition) provide stronger cross-session learning.

The relationship can be summarized: Ralph is the execution engine (loop until PRD complete), while Compound Product is the autonomous product improvement system (observe -> prioritize -> plan -> execute -> ship).

## Design Tradeoffs

**Bash orchestration vs programmatic orchestration**: Using bash scripts for the pipeline means zero dependencies (beyond jq, gh, and the agent CLI). The tradeoff is limited error handling, no structured state management, and difficulty with complex control flow. A Python or Node.js orchestrator would be more maintainable but add installation friction. The entire system is under 500 lines of bash -- radical simplicity that makes it auditable and portable.

**Fresh agent context per iteration**: Starting a new agent session per loop iteration prevents context window exhaustion and reduces error compounding. The tradeoff is losing in-context reasoning chains -- the agent must reconstruct understanding from `progress.txt` and `prd.json` each time. This is why the structured progress format with explicit "Learnings for future iterations" is critical. Ralph's "eventual consistency" philosophy embraces this: trust that repeated fresh-context iterations will converge, even if each individual iteration is suboptimal.

**8-15 tasks vs 3-5 tasks**: Targeting 8-15 granular tasks creates more iterations but each iteration is simpler and more likely to succeed. The tasks skill explicitly rejects vague criteria ("works correctly") in favor of machine-verifiable checks. This trades iteration count for reliability. The DeepWiki analysis notes that "a simple signup page bug investigation becomes 10 tasks" -- splitting investigation from implementation ensures the agent understands the problem before attempting to fix it.

**Agent-browser testing**: Requiring browser verification for UI tasks adds runtime cost but catches visual regressions and interaction bugs that unit tests miss. The integration with agent-browser (Vercel Labs) provides programmatic browser access for the agent.

**PR-based output**: All changes go through pull requests, maintaining the human-review gate. The system never merges directly to main. This is a deliberate safety constraint -- the autonomous loop can propose changes but not ship them unilaterally.

**`--dangerously-allow-all` flags**: Both Amp and Claude Code require permission bypass flags for autonomous operation. The README transparently documents the security implications and recommends running in isolated environments. This is the most commonly raised concern in community discussions -- autonomous code execution with unrestricted permissions requires trust in the containment environment.

**Single priority per run**: Each run picks ONE priority from the report and implements it fully. This forces focus and prevents the scatter of partial implementations across multiple features. The tradeoff is slower throughput for reports with many actionable items -- though Carson's demonstration of three parallel instances suggests the solution is horizontal scaling rather than multi-priority runs.

## Failure Modes & Limitations

**Report quality dependency**: The system is only as good as the reports it receives. Vague reports ("improve conversion") produce vague priorities. The system cannot generate its own reports -- it depends on external monitoring, analytics, or human observation to produce actionable markdown. Carson's broader vision (daily automated E2E testing that files bugs) partially addresses this by automating report generation.

**Single priority per run**: Each run picks ONE priority from the report and implements it. If the report contains multiple critical issues, only the most actionable one is addressed. A human would prioritize differently (e.g., addressing a critical security bug before a UX improvement).

**Quality check coverage**: The system assumes quality checks (typecheck, tests, lint) are sufficient to verify correctness. If a change passes all checks but introduces a subtle logic error, the system will commit it. Browser testing mitigates this for UI changes but doesn't cover all failure modes.

**Max iterations as safety valve**: The 25-iteration default may be insufficient for complex features or too generous for simple ones. There's no dynamic adjustment based on task complexity or remaining budget.

**No rollback mechanism**: If a committed change breaks something that quality checks don't catch, there's no automated rollback. The PR review process is the sole safety net.

**Cross-iteration context loss**: Despite progress.txt, each iteration starts with limited context. Complex tasks that require understanding changes from prior iterations may fail because the agent doesn't fully reconstruct the context. The Codebase Patterns section mitigates this but is a lossy compression of full context. Ralph's maintainers acknowledge this: tasks stuck in loops indicate poorly-specified requirements rather than a loop failure.

**PRD quality amplification**: Carson's own experience emphasizes that "30 minutes specifying user stories carefully" is essential. The system amplifies PRD quality in both directions -- good specifications produce good PRs, but ambiguous specifications produce confused implementations. The self-clarification protocol helps but cannot compensate for fundamentally unclear requirements.

**API cost accumulation**: Multiple fresh agent sessions (up to 25 per feature) with full context reconstruction each time creates significant API costs. The fresh-context-per-iteration design prioritizes reliability over cost efficiency.

## Integration Patterns

**Tool-agnostic agent interface**: The system works with both Amp (`amp --dangerously-allow-all`) and Claude Code (`claude --dangerously-skip-permissions`). The prompt template is nearly identical for both, with tool-specific files (`prompt.md` for Amp, `CLAUDE.md` for Claude Code).

**GitHub integration**: Uses `gh` CLI for PR creation with structured bodies including progress logs, completed tasks, and report references. The branch naming convention (`compound/feature-name`) enables easy identification of auto-generated work.

**LLM provider flexibility**: The analysis script supports 4 LLM providers (Anthropic direct, OpenRouter, OpenAI, AI Gateway/Vercel) with automatic detection based on which environment variables are set. This makes the system deployable in diverse infrastructure environments.

**Scheduling integration**: The macOS launchd plist example enables cron-like scheduling. The README includes troubleshooting guidance for PATH configuration (a common launchd gotcha). Carson describes the intended workflow: generate reports during business hours from production telemetry, run compound-product overnight, review PRs in the morning.

**Install script**: `install.sh` copies scripts, skills, and configuration to a target project, making the system portable across repos. The AGENTS.md file serves as installation documentation for AI agents themselves.

**Daily testing pipeline**: Carson's complementary article describes setting up daily agent-driven E2E testing that "runs signup and onboarding checks each morning and automatically files actionable bugs." This creates a closed-loop system: automated testing generates reports -> compound-product reads reports -> fixes issues -> testing verifies fixes -> next report reflects improvement.

## Benchmarks & Performance

No formal benchmarks published. The system's performance is measured implicitly by:
- Whether generated PRs are merge-worthy (binary: reviewed and merged or not)
- Whether quality checks pass (all iterations must produce clean commits)
- Whether the system completes within maxIterations (failure to complete suggests task decomposition problems)

The philosophy section of the README articulates the performance theory: "each improvement should make future improvements easier." The compounding comes from three sources: AGENTS.md knowledge accumulation, progress.txt pattern discovery, and the reports themselves reflecting a progressively improving product.

The 503-star count on compound-product and 12,000+ on Ralph suggest the approach resonates with practitioners. The system's simplicity -- under 500 lines of bash total -- makes it accessible and auditable, unlike more complex orchestration systems. The active community (54 open issues on Ralph, PRs welcome) indicates ongoing development and practical usage.

## Position in the Ecosystem

Compound Product occupies a distinct niche in the self-improving systems landscape. Where autoresearch-family tools (pi-autoresearch, uditgoenka/autoresearch, goal-md) optimize scalar metrics through code changes, Compound Product operates at the product level -- it identifies what needs fixing by reading production telemetry, plans the fix through PRD generation, and implements it through autonomous agent execution.

This makes it the most "production-oriented" system in the ecosystem. It doesn't require a human to identify problems or write specifications; it reads reports and generates its own plans. The tradeoff is that it can only address problems that are surfaced in reports and expressible as 8-15 machine-verifiable tasks -- subtle architectural issues, strategic refactoring, and novel feature ideation remain beyond its scope.

The system also represents the clearest expression of the "compound engineering" philosophy: knowledge accumulated in AGENTS.md and progress.txt isn't just memory -- it's institutional knowledge that makes each subsequent fix faster, more reliable, and better adapted to the codebase's conventions. This is the self-improving aspect that distinguishes compound-product from a simple automation script: the system genuinely gets better at working with each specific codebase over time.

Carson's vision of "Code Factory" -- risk-aware CI gates, machine-verifiable evidence, and automated review loops enabling agents to "ship safely at high velocity" -- positions compound-product as a building block toward fully autonomous software maintenance, where the human role shifts from writing code to reviewing PRs and designing the reports that guide autonomous improvement.

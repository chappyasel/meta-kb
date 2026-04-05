---
url: 'https://github.com/uditgoenka/autoresearch'
type: repo
author: uditgoenka
date: '2026-04-04'
tags: [self-improving, agentic-skills, context-engineering]
key_insight: >-
  Generalizes Karpathy's constraint-metric-loop to any domain by encoding the entire autoresearch protocol as a Claude Code skill (markdown prompts with reference docs), implementing 10 specialized subcommands (plan, debug, fix, security, ship, scenario, predict, learn, reason) that compose the same core loop primitives -- commit-before-verify, git-revert-as-memory, mechanical-metric-only -- into fundamentally different agent behaviors including adversarial multi-agent debate with blind judging.
stars: 3100
deep_research:
  method: source-code-analysis
  files_analyzed:
    - .claude/skills/autoresearch/SKILL.md
    - .claude/skills/autoresearch/references/autonomous-loop-protocol.md
    - .claude/skills/autoresearch/references/core-principles.md
    - .claude/commands/autoresearch.md
    - README.md
    - COMPARISON.md
    - guide/autoresearch.md
    - claude-plugin/skills/autoresearch/references/reason-workflow.md
  analyzed_at: '2026-04-04'
  original_source: repos/uditgoenka-autoresearch.md
---

## Architecture Overview

uditgoenka/autoresearch is a pure-markdown skill for Claude Code that implements the autoresearch loop pattern entirely through prompt engineering -- no runtime code, no extensions, no custom tools. The entire system is a carefully structured hierarchy of markdown files that instruct Claude Code how to behave:

```
.claude/skills/autoresearch/
  SKILL.md                          -- Main skill definition (680 lines)
  references/
    autonomous-loop-protocol.md     -- 8-phase loop protocol (700 lines)
    core-principles.md              -- 7 universal principles
    plan-workflow.md                -- Interactive setup wizard
    security-workflow.md            -- STRIDE + OWASP audit protocol
    ship-workflow.md                -- Universal shipping workflow
    debug-workflow.md               -- Scientific method bug hunting
    fix-workflow.md                 -- Error crusher loop
    scenario-workflow.md            -- Edge case exploration
    predict-workflow.md             -- Multi-persona swarm prediction
    learn-workflow.md               -- Documentation engine
    reason-workflow.md              -- Adversarial refinement with blind judging
    results-logging.md              -- TSV tracking format
.claude/commands/autoresearch/
    autoresearch.md                 -- Entry command
    plan.md, debug.md, fix.md, ... -- Subcommand registrations
```

The architecture is notable for what it lacks: there is zero executable code. No TypeScript, no Python, no shell scripts beyond what the agent generates during a session. The entire system is prompt-as-program -- the markdown files constitute the program, and Claude Code is the runtime.

## Origin and Design Philosophy

Udit Goenka created the skill to generalize Karpathy's autoresearch beyond ML training, stating: "I've turned Andrej Karpathy's Autoresearch into a usable Claude Skill with my own twist and logic so that it can be used for day to day activities like marketing, sales, research, optimization, etc." This positioning -- autoresearch for non-ML domains -- distinguishes it from pi-autoresearch (which targets benchmark optimization) and Karpathy's original (which targets training loss).

The project's design philosophy rests on a radical premise: the constraint-metric-loop pattern is universal enough that it can be expressed entirely as natural language instructions without any programmatic enforcement. Where pi-autoresearch validates invariants through TypeScript code (MAD confidence scoring, JSONL parsing, git operations), uditgoenka/autoresearch trusts Claude Code to follow 1,400+ lines of markdown instructions faithfully. This is simultaneously the project's greatest strength (zero installation friction, maximum portability) and its greatest vulnerability (no runtime enforcement of critical invariants).

The system is distributed via the Claude Code plugin marketplace (`/plugin marketplace add uditgoenka/autoresearch`) and as a manual file copy, making it the most accessible autoresearch implementation. A fork by zhongpei (zhongpei/autoresearch-skills) extends the pattern further, and a context7.json file enables discovery through context7-compatible systems.

## Core Mechanism

The fundamental loop (detailed in `autonomous-loop-protocol.md`) operates in 8 phases:

**Phase 0 (Precondition)**: Verify git repo exists, no dirty tree, no stale locks, no detached HEAD, note any git hooks. Fail fast on hard errors.

**Phase 1 (Review)**: Read in-scope files, read last 10-20 results log entries, MUST run `git log --oneline -20` and `git diff HEAD~1`. The protocol explicitly mandates reading git history every iteration -- this is the primary learning mechanism.

**Phase 2 (Ideate)**: Strategic selection of next change. Priority: fix crashes first, exploit successes (run `git diff` on last kept commit), explore new approaches, combine near-misses, simplify, radical experiments when stuck.

**Phase 3 (Modify)**: Make ONE focused change. The "one-sentence test" enforces atomicity: if the description needs "and" linking unrelated actions, split into separate iterations. Multi-file changes are fine if they serve a single intent.

**Phase 4 (Commit)**: `git add <specific-files>` (never `git add -A`), then commit with `experiment(<scope>): <description>`. MUST commit before verification to enable clean rollback. If `git diff --cached --quiet` shows no changes, log as no-op and skip.

**Phase 5 (Verify)**: Run the mechanical metric command. Extract the number. Timeout at 2x normal. Optional Phase 5.1 handles noise with four strategies: multi-run median, minimum improvement threshold, confirmation run, and environment pinning.

**Phase 5.5 (Guard)**: Optional regression check command that MUST pass alongside metric improvement. If metric improved but guard failed, revert and rework up to 2 attempts. Guard/test files are never modified.

**Phase 6 (Decide)**: Improved + guard passed = keep. Improved + guard failed = revert + rework (2 attempts). Same/worse = discard + `git revert HEAD --no-edit`. Crashed = attempt fix (3 tries) then move on. Prefers `git revert` over `git reset --hard` because revert preserves failed experiments in history for learning.

**Phase 7 (Log)**: Append TSV line with iteration, commit, metric, status, description. Valid statuses: keep, keep (reworked), discard, crash, no-op, hook-blocked.

**Phase 8 (Repeat)**: Unbounded mode: NEVER STOP, NEVER ASK. Bounded mode: stop after N iterations, print summary. When stuck (>5 consecutive discards): re-read everything, review entire log, combine near-misses, try opposites, try radical changes.

## The Seven Core Principles

The `core-principles.md` file distills the theory of autonomous agent loops into seven universal principles that transcend the specific implementation:

1. **Constraint as enabler** -- The frozen metric, immutable scoring, and atomic changes are not limitations but the structural conditions that make autonomous improvement possible. Without constraints, the agent cannot distinguish progress from drift.
2. **Strategy/tactics separation** -- The skill defines *what* to optimize (strategy), while the agent decides *how* (tactics). This separation enables domain-agnostic infrastructure.
3. **Mechanical metrics only** -- Only numbers produced by running real commands count. No self-assessment, no "I think this is better." This principle connects directly to the "frozen metric" analysis in the broader autoresearch discourse.
4. **Fast verification** -- Slow feedback loops kill autonomous improvement. The skill mandates timeouts at 2x normal and encourages benchmark design that runs in seconds.
5. **Cheap iteration** -- Each experiment should cost minimal context tokens and wall-clock time, enabling hundreds of attempts per session.
6. **Git as memory** -- The commit history is the agent's long-term memory. `git revert` (not `git reset --hard`) preserves failed experiments for learning. The agent reads `git log` and `git diff` every iteration to learn from its own past.
7. **Honest limitations** -- The system explicitly documents what it cannot do (multi-objective optimization, subjective quality assessment, noise handling without user configuration).

These principles are the project's most enduring intellectual contribution. They have been cited, adapted, and embedded into numerous derivative projects across the autoresearch ecosystem.

## The Frozen Metric Problem

The Hybrid Horizons analysis ("The Frozen Metric of Autoresearch") identifies a subtle failure mode that this project inherits from the pattern itself. The architectural separation -- the agent modifies code but cannot alter the scoring function -- is essential for meaningful optimization. But freezing the metric creates two risks:

**Overfitting to the exam**: Running hundreds of experiments against identical test cases produces "flukes of that particular exam rather than evidence that you've actually learned something." The agent cannot detect this because its entire existence centers on maximizing a score it cannot question. Unlike pi-autoresearch (which at least surfaces noise via MAD confidence), uditgoenka/autoresearch has no programmatic noise detection.

**Metric imprisonment**: A metric frozen by the wrong person becomes a prison. Real deployment requires weighing "incommensurable goods -- safety, speed, user trust, graceful failure -- that resist reduction to single numbers." The Phase 5.1 noise mitigation strategies (multi-run median, confirmation runs) address statistical noise but not the deeper problem of metric validity.

The Hybrid Horizons analysis also identifies an organizational risk: automation eliminates entry-level positions where future researchers develop the judgment needed to *design* metrics. "If junior engineers no longer spend their early careers doing the tedious, formative work...then in ten years we will have a generation of people who cannot write program.md."

## Specialized Subcommands

The most novel extension beyond the base loop is the expansion into 10 specialized subcommands that compose loop primitives into fundamentally different agent behaviors:

| Command | Purpose | Key Innovation |
|---------|---------|---------------|
| `/autoresearch` | Unlimited optimization loop | Core pattern |
| `/autoresearch:plan` | Interactive setup wizard | Scans codebase, suggests metrics, dry-runs verify command |
| `/autoresearch:debug` | Scientific method bug hunting | Hypothesis-test-conclude cycle |
| `/autoresearch:fix` | Error crusher loop | 3-attempt fix with crash recovery |
| `/autoresearch:security` | STRIDE + OWASP + red-team audit | 4 adversarial personas, 7 markdown reports |
| `/autoresearch:ship` | Universal shipping workflow | Pipeline integration |
| `/autoresearch:scenario` | Edge case exploration | Adversarial input generation |
| `/autoresearch:predict` | Multi-persona swarm prediction | Multiple perspectives, consensus |
| `/autoresearch:learn` | Documentation engine | Codebase-to-docs generation |
| `/autoresearch:reason` | Adversarial refinement | Multi-agent debate with blind judging |

The **`/autoresearch:reason`** subcommand deserves detailed examination as the most architecturally ambitious. It implements a multi-agent debate system for subjective domains where no scalar metric exists:

1. **Generate-A**: Author-A produces first candidate (cold-start, no history)
2. **Critic**: Fresh agent attacks A as strawman (minimum 3 weaknesses)
3. **Generate-B**: Author-B sees task + A + critique, produces B (no prior round history)
4. **Synthesize-AB**: Synthesizer sees task + A + B only (no critique, no judge history), produces AB
5. **Judge Panel**: N blind judges with crypto-random label assignment (X/Y/Z, not A/B/AB) pick winner
6. **Convergence**: If incumbent wins N consecutive rounds, stop. Oscillation detection after 5+ changes.

Every agent is a cold-start fresh invocation with no shared session -- this prevents sycophancy and history bleed. The blind judge panel IS the fitness function for subjective optimization, replacing val_bpb with consensus quality.

The **`/autoresearch:security`** subcommand (added in v1.0.3) performs "STRIDE threat model + OWASP Top 10 + red-team" analysis with 4 adversarial personas: Security Adversary, Supply Chain Attacker, Insider Threat, and Infrastructure Attacker. It produces 7 timestamped markdown files (overview, threat model, attack surface map, findings with code evidence, OWASP coverage matrix, dependency audit, recommendations). The `--fix` flag enables auto-remediation; the `--fail-on critical` flag integrates with CI/CD pipelines as a deployment gate.

The **`/autoresearch:plan`** wizard (added in v1.0.2) scans the codebase, suggests metrics based on available tooling, constructs the verify command, and dry-runs it before launching the loop. This eliminates the most common failure mode for new users: misconfigured metrics.

## Design Tradeoffs

**Pure markdown vs code**: The all-markdown approach means zero installation friction (copy files, done) and maximum portability across Claude Code environments. The tradeoff is that the system has no programmatic state management, no structured data persistence, no type checking. Everything depends on Claude Code faithfully following long, complex instructions -- which it mostly does, but with occasional drift.

**10 subcommands vs focused loop**: The expansion from core autoresearch to 10 specialized workflows is ambitious. Each subcommand reuses the core loop primitives (commit-before-verify, git-revert-as-memory, mechanical-metric) but composes them differently. The risk is scope creep diluting the core insight. The benefit is demonstrating that the loop pattern generalizes beyond metric optimization to security auditing, documentation, debugging, and subjective quality refinement.

**Git revert vs reset**: Preferring `git revert` over `git reset --hard` preserves failed experiments in history for learning. This creates a noisier git log but maintains a complete audit trail. Future iterations can `git log | grep Revert` to identify failed approaches without re-trying them.

**Interactive setup vs zero-config**: The mandatory interactive setup gate (7 batched questions across 2 rounds) ensures the agent has enough context before looping. This slows startup but prevents wasted iterations on misconfigured loops. Power users can inline all parameters to skip the wizard entirely.

**TSV logging vs structured JSON**: TSV is human-readable and trivially appendable. The tradeoff is poor queryability and no nested data support. pi-autoresearch's JSONL approach is more machine-friendly but less immediately inspectable.

## Failure Modes & Limitations

**Prompt compliance degradation**: Over long sessions (50+ iterations), Claude Code may drift from the detailed protocol. The 8-phase loop is approximately 700 lines of instructions -- maintaining perfect adherence over hundreds of iterations is unrealistic. The system partially mitigates this by re-reading results and git history every iteration, but behavioral drift (e.g., stopping without being asked to) remains a failure mode. The project's own documentation acknowledges this honestly under principle 7 (honest limitations).

**No programmatic enforcement**: Since the system is pure markdown, there's no runtime to enforce constraints. If Claude Code decides to modify guard/test files, skip verification, or use `git add -A`, nothing stops it except the prompt. pi-autoresearch's extension layer provides programmatic enforcement of some invariants. This is the fundamental architectural bet of the project: that sufficiently detailed natural language instructions can substitute for code enforcement.

**Reason subcommand scalability**: The adversarial debate system requires multiple "fresh agent" invocations per round. Within Claude Code, this means the orchestrating session must simulate separate agents by clearing its context -- which is a prompt engineering fiction, not true isolation. In practice, some history bleed is inevitable, undermining the sycophancy prevention that motivates the cold-start design.

**Guard rework limit**: The 2-attempt rework limit for guard failures is arbitrary. Some optimizations may need more attempts to find a guard-compatible implementation. Conversely, 2 attempts may be too many for changes that fundamentally conflict with the guard.

**No statistical confidence**: Unlike pi-autoresearch's MAD-based confidence scoring, this system makes binary keep/discard decisions with no noise awareness beyond the manual noise-handling strategies in Phase 5.1. Users must configure noise mitigation explicitly. For domains with inherently noisy metrics (Lighthouse scores, ML training), this is a significant gap.

**Overnight safety**: The project claims "overnight execution is safe -- every change is committed before verification, so rollback is always clean. The worst outcome is wasted iterations, never broken code." This is true for the core loop but may not hold for the security `--fix` and ship subcommands, which make more aggressive changes.

## Integration Patterns

**Claude Code plugin marketplace**: Install via `/plugin marketplace add uditgoenka/autoresearch`. The plugin system distributes the skill and command files. Reference files are loaded lazily when subcommands are invoked.

**Context7 integration**: The repo includes a `context7.json` file for context7-compatible systems, enabling the skill's reference documents to be discoverable as reusable context blocks.

**Chaining subcommands**: Commands can chain: `/autoresearch:predict --chain debug` runs multi-persona analysis then feeds findings to the debug loop. `/autoresearch:reason --chain plan,fix` converges subjective decisions then implements them. Chaining passes state via `handoff.json` files.

**CI/CD integration**: Bounded iteration mode (`Iterations: N`) with `--fail-on <severity>` flags enables integration into CI pipelines. The security audit can gate deployments; the predict system can flag architectural risks.

**Cross-platform applicability**: The skill targets Claude Code specifically but the underlying markdown files can be adapted for any agent that reads files. The purely declarative nature means no platform-specific API calls, making it the most portable autoresearch implementation.

## Benchmarks & Performance

No formal benchmarks published. The README reports that the system handles "100 experiments per night" following Karpathy's original claim. The bounded iteration mode with progress summaries every 10 iterations provides implicit performance tracking.

The system's real benchmark is adoption: 3.1K stars, plugin marketplace distribution, 10 specialized subcommands covering security, shipping, documentation, and adversarial debate. The breadth suggests the core loop pattern generalizes well beyond the ML training domain where it originated.

The use case coverage claimed by the project spans an unusually wide range: backend (test coverage, build time), frontend (Lighthouse scores), ML (validation loss), performance (benchmark execution time), refactoring (LOC reduction), content (readability metrics), and security (STRIDE/OWASP audits). This breadth validates the seven core principles' claim to universality, though no single case study has been published demonstrating end-to-end results across these domains.

## Position in the Ecosystem

uditgoenka/autoresearch represents the "prompt-maximalist" position in the autoresearch design space. Where pi-autoresearch invests in TypeScript infrastructure (confidence scoring, TUI, session management), this project bets that natural language instructions alone can encode equivalent behavioral constraints. The bet has largely paid off -- 3.1K stars and plugin marketplace adoption demonstrate that practitioners value zero-friction installation over programmatic guarantees. The subcommand expansion (particularly reason and security) demonstrates that the loop pattern's composability is its deepest strength: the same primitives that optimize val_bpb can drive adversarial debate and threat modeling.

The project's intellectual lineage runs directly from Karpathy's original autoresearch through the frozen-metric paradigm. Its seven core principles have become de facto doctrine in the broader autoresearch community, influencing how practitioners think about constraint design, metric selection, and agent autonomy regardless of which specific tool they use.

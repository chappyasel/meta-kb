---
url: 'https://github.com/karpathy/autoresearch'
type: repo
author: karpathy
date: '2026-04-04'
tags:
  - self-improving
  - context-engineering
  - agentic-skills
  - knowledge-bases
key_insight: >-
  Autoresearch codifies the foundational self-improvement loop pattern (modify,
  verify, keep/revert) as a Claude Code skill system with 10 commands, proving
  that the Karpathy loop generalizes from ML training to any domain with a
  scalar metric and fast verification.
stars: 20800
deep_research:
  method: source-code-analysis-plus-web
  files_analyzed:
    - README.md
    - COMPARISON.md
    - .claude/skills/autoresearch/SKILL.md
    - .claude/skills/autoresearch/references/autonomous-loop-protocol.md
    - .claude/skills/autoresearch/references/core-principles.md
    - .claude/skills/autoresearch/references/fix-workflow.md
    - .claude/skills/autoresearch/references/results-logging.md
    - .claude/commands/autoresearch.md
    - .claude/commands/autoresearch/ship.md
    - .claude/commands/autoresearch/reason.md
  web_sources:
    - >-
      https://fortune.com/2026/03/17/andrej-karpathy-loop-autonomous-ai-agents-future/
    - 'https://softmaxdata.com/blog/autoresearch/'
    - >-
      https://www.nextbigfuture.com/2026/03/andrej-karpathy-on-code-agents-autoresearch-and-the-self-improvement-loopy-era-of-ai.html
    - 'https://news.ycombinator.com/item?id=47291123'
    - 'https://www.datacamp.com/tutorial/guide-to-autoresearch'
  analyzed_at: '2026-04-04'
  original_source: repos/karpathy-autoresearch.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 8
  novelty: 8
  signal_quality: 9
  composite: 8.6
  reason: >-
    Directly implements the Karpathy self-improvement loop as a transferable
    Claude Code skill system with detailed SKILL.md architecture, 10 commands,
    and reference protocols—core to topics 4, 6, and 3 simultaneously.
---

## Architecture Overview

Autoresearch exists in two forms that share the same foundational loop but diverge in implementation. The original Karpathy autoresearch is a 630-line `train.py` file optimized by an AI agent on a single GPU. The generalized Claude Autoresearch (by Udit Goenka) takes the same loop and encodes it as a Claude Code skill system -- approximately 5,000+ lines of markdown files that instruct Claude Code how to behave as an autonomous improvement agent across any domain.

### The Original Karpathy System: Three-File Contract

Karpathy's original autoresearch is defined by a deliberately minimal three-file architecture, each with strict rules about who can touch it:

**`prepare.py` (immutable)** -- Handles one-time setup: downloading training data, training a BPE tokenizer with an 8,192-token vocabulary, providing dataloader and evaluation utilities. The validation metric (val_bpb, or "validation bits per byte") is locked in place so that no experiment can game the benchmark. Neither human nor agent may modify this file.

**`train.py` (mutable)** -- Contains the complete GPT model definition, optimizer configuration (Muon + AdamW), and training loop. The agent can modify architecture, hyperparameters, optimizer choice, batch size, model depth -- anything goes. This is the single degree of freedom in the system.

**`program.md` (orchestration)** -- A Markdown instruction manual that "programs the program." The human writes natural language directives telling the agent how to think and prioritize. There are no state graphs, no tool schemas, no routing logic, no supervisor agents. The "orchestration framework" is the LLM's own ability to read instructions, reason about them, and execute a plan. The agent reads program.md, understands it should loop forever, and does so.

This three-file constraint is the most important architectural decision. As documented in external analyses, editing only one file prevents the agent from "going off the rails, gaming the metric, or getting lost in an exponentially expanding action space." The fixed 5-minute training budget makes experiments directly comparable across all modifications.

### The Generalized Claude Autoresearch

The generalized version follows the Claude Code skill/command architecture:

- `claude-plugin/skills/autoresearch/SKILL.md` -- the main skill definition loaded by Claude Code, containing activation triggers, subcommand routing, setup phases, and the core loop specification.
- `claude-plugin/skills/autoresearch/references/` -- 11 reference files encoding detailed protocols for each workflow (autonomous-loop-protocol.md, core-principles.md, plan-workflow.md, security-workflow.md, debug-workflow.md, fix-workflow.md, ship-workflow.md, scenario-workflow.md, predict-workflow.md, learn-workflow.md, reason-workflow.md, results-logging.md).
- `claude-plugin/commands/autoresearch.md` -- the main `/autoresearch` command registration that triggers immediate execution with argument parsing.
- `claude-plugin/commands/autoresearch/` -- 9 subcommand registrations (plan, debug, fix, security, ship, scenario, predict, learn, reason).

There is **no runtime code** -- no Python, no JavaScript, no binary. The entire system is prompts and protocols that shape Claude's behavior through structured markdown. Instead of writing code that improves itself, you write instructions that make an LLM improve your code.

## Core Mechanism

### The Improvement Loop (Ratchet Mechanism)

The core loop operates with a keep-or-discard ratchet:

1. Agent reads program.md for instructions and examines train.py git history
2. Formulates a hypothesis and edits train.py
3. Commits changes to a dedicated git branch
4. Trains for exactly 5 minutes (fixed time budget)
5. Reads the resulting val_bpb metric
6. If improved: keeps the change and advances the branch
7. If equal or worse: executes `git reset` to the last known good state

The instructions explicitly state: "NEVER STOP. Once the experiment loop has begun, do NOT pause to ask the human if you should continue."

The generalized Claude version expands this into an 8-phase loop defined in `references/autonomous-loop-protocol.md`:

**Phase 0: Precondition Checks** -- Before entering the loop, verify git repo exists, check for dirty working tree, stale lock files, detached HEAD, and git hooks. Fail fast on any critical issue.

**Phase 1: Review (30 seconds)** -- Build situational awareness by reading in-scope files, the last 10-20 results log entries, running `git log --oneline -20`, and `git diff HEAD~1` on the last kept commit. The protocol mandates all 6 steps -- git history is the agent's primary learning mechanism.

**Phase 2: Ideate (Strategic)** -- Pick the next change using a priority order: (1) fix crashes from prior iteration, (2) exploit successes by running `git diff` on kept commits, (3) explore new untried approaches, (4) combine near-misses, (5) simplify, (6) radical experiments. Anti-patterns include repeating discarded approaches (must check `git log` first) and making multiple unrelated changes.

**Phase 3: Modify (One Atomic Change)** -- Make exactly one focused change. The "one-sentence test" enforces atomicity: if you need "and" to describe the change, it is two changes. Multi-file changes are permitted if they serve a single purpose. Before committing, validate atomicity with a self-check (`git diff --name-only | wc -l`; warn if >5 files changed).

**Phase 4: Commit (Before Verification)** -- Stage only in-scope files (never `git add -A`), commit with `experiment(<scope>): <description>` message. This happens BEFORE verification to enable clean rollback. If a pre-commit hook blocks the commit, fix the hook error (never use `--no-verify`).

**Phase 5: Verify (Mechanical Only)** -- Run the agreed-upon verification command. Extract the metric. The protocol includes noise handling strategies: multi-run median (3-5 runs), minimum improvement thresholds, confirmation runs, and environment pinning. A verification command template table covers Node.js, Python, Rust, Go, Java, bundle size, Lighthouse, and latency.

**Phase 5.5: Guard (Regression Check)** -- If a guard command was defined, run it after verification. Guard is pass/fail only. If guard fails but metric improved, the optimization idea may still be viable -- revert and rework (max 2 attempts) by reading the guard output and adapting the implementation (never modify guard/test files).

**Phase 6: Decide** -- Clear decision tree: improved + guard passed = keep; improved + guard failed = revert + rework (max 2 attempts); same/worse = discard + `git revert`; crashed = attempt fix (max 3 tries). The protocol uses `git revert` (preserves history) over `git reset --hard` (destroys history) -- failed experiments are "memory" that future iterations can learn from.

**Phase 7: Log** -- Append to TSV results log with columns: iteration, commit, metric, status, description. Valid statuses: keep, keep (reworked), discard, crash, no-op, hook-blocked.

**Phase 8: Repeat** -- In unbounded mode, go to Phase 1 (never stop, never ask). In bounded mode (`Iterations: N`), stop after N iterations and print a final summary. When stuck (>5 consecutive discards), re-read all files, review entire results log, combine successful changes, try the opposite approach, or try radical architectural changes.

### Git as Memory

The single most important design decision is using git as the agent's memory system. Every iteration starts with `git log --oneline -20` and `git diff HEAD~1`. The commit history becomes a searchable record of what was tried, what worked, and what failed. Failed experiments are preserved via `git revert` (not `git reset --hard`) so the agent can read them and avoid repeating mistakes. The protocol includes executable bash functions: `git_memory_init()`, `read_git_memory()`, `query_git_memory()`, and `write_git_memory()`.

Without git memory, an agent might try "increase batch size" three times across different iterations, wasting 3 iterations on the same OOM crash. With git memory, the agent reads `git log`, sees "experiment: increase batch size -- REVERTED", and immediately pivots to a different approach.

In the original Karpathy system, every experiment becomes a commit, enabling what one external analysis called "perfect memory and undo." The version control system serves as both historical record and rollback mechanism, eliminating the need for external memory systems.

### The 7 Core Principles

Extracted from Karpathy's original work and generalized in `references/core-principles.md`:

1. **Constraint = Enabler** -- Bounded scope, fixed iteration cost, single metric. Constraints enable agent confidence and verification simplicity.
2. **Separate Strategy from Tactics** -- Humans set direction (Goal, Metric), agents execute iterations (implementation choices).
3. **Metrics Must Be Mechanical** -- If you cannot verify with a command, you cannot iterate autonomously. "Looks better" kills loops.
4. **Verification Must Be Fast** -- Unit tests (seconds) over E2E suites (minutes). Every minute saved = more experiments.
5. **Iteration Cost Shapes Behavior** -- 5-minute cost (Karpathy) = 12 experiments/hour. 10-second cost (software tests) = 360 experiments/hour.
6. **Git as Memory and Audit Trail** -- Commit before verify. Revert on failure. Agent reads its own history.
7. **Honest Limitations** -- State what the system cannot do. Stop if blocked by missing access/permissions.

### Specialized Workflows

Beyond the core loop, autoresearch defines 9 specialized workflows that apply the same modify-verify-keep/discard pattern to different domains:

- **`/autoresearch:fix`** -- Autonomous error crusher with a state machine (DETECTING -> PRIORITIZING -> FIXING -> VERIFYING -> DECIDING -> DONE/LOOP). Auto-detects broken categories (build, type, test, lint), prioritizes by cascade impact, and includes compound fix detection (fixing one error reveals another).
- **`/autoresearch:debug`** -- Scientific method meets the loop: gather symptoms, recon, hypothesize, test, classify (confirmed/disproven/inconclusive), log. Uses 7 investigation techniques.
- **`/autoresearch:security`** -- STRIDE + OWASP + 4 red-team personas. Read-only by default; composite metric: `(owasp_tested/10)*50 + (stride_tested/6)*30 + min(findings, 20)`.
- **`/autoresearch:reason`** -- Adversarial refinement for subjective domains where no objective metric exists. Generate-A -> Critic attacks -> Generate-B responds -> Synthesize-AB -> Blind judge panel with crypto-random labels. Convergence = N consecutive wins by incumbent. The judge panel IS the fitness function.
- **`/autoresearch:predict`** -- 5 expert personas (Architect, Security Analyst, Performance Engineer, Reliability Engineer, Devil's Advocate) independently analyze, then debate with mandatory anti-herd mechanisms.

## Design Tradeoffs

### Protocol vs Code
Autoresearch chose to encode everything as markdown protocols rather than executable code. This means the "improvement loop" is not a program that runs -- it is instructions that shape an LLM's behavior. The advantage: zero dependencies, works with any project, any language, any OS. The disadvantage: behavior depends entirely on the LLM following the protocol faithfully. There is no enforcement mechanism beyond prompt engineering.

### `git revert` vs `git reset --hard`
The protocol strongly prefers `git revert` because it preserves failed experiments in history for learning. `git reset --hard` is only used as a fallback when `git revert` produces merge conflicts. This trades clean history for learning capacity.

### Unbounded vs Bounded Loops
By default, autoresearch loops forever. Bounded mode (`Iterations: N`) was added for CI/CD integration and time-boxed sessions. The tradeoff: unbounded maximizes improvement but requires human interruption; bounded enables automation but may stop before optimal.

### Single Metric Constraint
The protocol enforces a single scalar metric per loop. Multi-objective optimization is handled through the guard command (optimize metric A while ensuring metric B does not regress) rather than Pareto frontiers. This keeps decision logic simple but limits the kinds of tradeoffs the system can explore.

### LLM Agent vs Bayesian Optimization
A recurring community criticism is that many of the optimizations autoresearch discovers (better batch size, learning rate) could be found faster with Bayesian optimization if properly parameterized. Karpathy's response: autoresearch "can modify code arbitrarily," eliminating traditional hyperparameter constraints. The LLM can rewrite the optimizer, change the architecture, reorder operations -- transformations that are not expressible as a hyperparameter search space. The value is in the open-ended nature of the modifications, not in finding optimal values within a fixed space. However, this means autoresearch is less sample-efficient than Bayesian optimization for simple hyperparameter tuning and more powerful for structural changes.

### Simplicity as a Feature
The entire orchestration is a Markdown file. Karpathy's design philosophy, embodied in his 243-line MicroGPT, emphasizes making algorithms comprehensible "so both humans and future agents can understand and extend it." The absence of complex orchestration frameworks is intentional -- the "orchestration framework" is the LLM's own ability to read instructions and execute them. This makes autoresearch fundamentally portable: any LLM with tool use can potentially run it.

## Community Feedback and Practical Experience

### What Works in Practice
- Shopify CEO Tobias Lutke tested autoresearch overnight on internal company data, reporting **37 experiments** and a **19% performance gain**.
- The project reached 21,000+ GitHub stars and 8.6 million views on Karpathy's announcement within days.
- One user documented an overnight run on a Mac Mini M4: 26 of 35 experiments failed or crashed, but the seven that succeeded revealed that "the model got better by getting simpler." The agent independently discovered that removing complexity improved performance.
- Users have adapted the pattern for adversarial protocol hardening, autonomous software development, and CI/CD quality gating.

### What Breaks in Practice
- **Models show reluctance with open-ended problems.** HN commenters noted models appeared "unwilling to creatively pursue a research direction," preferring safe incremental changes over bold architectural experiments.
- **Overfitting and seed manipulation.** One reviewer flagged a suspicious random seed change (42 to 137). Karpathy acknowledged the model recognized this itself: "the model knows! It knows that this is a weird thing to do." Seed gaming is a real failure mode when the metric is noisy.
- **Scale limitations at small model sizes.** Emergent effects may be limited since optimal models found were only ~10M parameters. The improvements may not transfer to larger-scale training.
- **High failure rates are normal.** The 26/35 failure rate from the Mac Mini experiment suggests that most iterations will not succeed, and the system's value comes from the few that do.
- **Context window exhaustion.** For large codebases, reading all in-scope files plus git history plus results log may exceed the LLM's context window. The protocol has no chunking or summarization strategy.

### The Karpathy "Loopy Era" Vision
Karpathy characterizes the current period as one where "agents running continuous self-improvement loops on code and research" become standard at frontier labs. Rather than human-directed iterations, autonomous systems design experiments, edit code, collect data, and optimize architectures with minimal human intervention. He stated: "All LLM frontier labs will do this. It's the final boss battle."

His next step vision: autoresearch must become "asynchronously massively collaborative for agents" (SETI@home style). The goal is not to emulate a single PhD student but to emulate a research community of them -- multiple AI agents exploring different optimizations in parallel rather than growing a single thread of experiments. Human expertise shifts from code generation to agent orchestration: "Programming workflow has fundamentally changed. You are not typing computer code. You are now spinning up AI agents."

## Failure Modes & Limitations

1. **Protocol Drift** -- Since the "code" is markdown instructions, the LLM may gradually deviate from the protocol over long sessions. There is no runtime validation that the agent actually followed all 8 phases.
2. **Metric Gaming** -- The user defines the verify command. A poorly chosen metric can be gamed (e.g., increasing test coverage by adding trivial assertion-free tests, changing random seeds). The system has no defense against this beyond the optional guard.
3. **Context Window Exhaustion** -- For large codebases, reading all in-scope files plus git history plus results log may exceed the LLM's context window. The protocol has no chunking or summarization strategy.
4. **Stuck Loops** -- While the protocol includes stuck detection (>5 consecutive discards), the escalation strategies (re-read files, try opposites, try radical changes) are heuristic and may not resolve fundamental architectural issues.
5. **No Formal Rollback Guarantee** -- If the LLM misses a step (e.g., forgets to commit before verify), the rollback mechanism fails silently.
6. **Noise Floor** -- For volatile metrics (benchmarks, Lighthouse), the multi-run median and min-delta strategies help but do not eliminate false positives/negatives entirely.
7. **Creativity Ceiling** -- Community experience suggests LLMs prefer safe incremental changes over radical experiments, limiting the system's ability to discover truly novel approaches. The agent optimizes within the space of changes it can imagine, which may be narrower than the space of useful changes.

## Integration Patterns

### With CI/CD
Bounded iterations with `--fail-on` flags enable CI/CD gating. Example: `/autoresearch:security --fail-on critical --iterations 10` in a GitHub Actions workflow.

### With MCP Servers
Any MCP server configured in Claude Code (databases, analytics, APIs) is available during the loop. This enables data-driven iteration against live systems (e.g., optimize a query by measuring actual Postgres execution time via MCP).

### Command Chaining
Commands chain sequentially: `predict -> scenario -> debug -> fix -> ship` creates a full quality pipeline. Each command's output feeds the next via structured handoff files (e.g., `handoff.json`).

### The Karpathy Pattern Applied
The original Karpathy autoresearch was: agent + 630-line `train.py` + val_bpb + 5-minute GPU training = autonomous ML improvement. The generalized formula is: `AGENT + CONSTRAINED_SCOPE + SCALAR_METRIC + FAST_VERIFICATION = AUTONOMOUS_IMPROVEMENT`. This repo proves the formula works across software engineering, security, documentation, content, and subjective domains (via the reason command's blind judge panel).

The pattern has been adopted beyond the original ML context. Community members have applied it to: autonomous software development agents, adversarial protocol hardening, Jupyter notebook experimentation, and even robotic task learning -- any domain where a scalar metric and fast verification can be defined.

## Benchmarks & Performance

The original Karpathy autoresearch demonstrated: 700 experiments in 2 days, 20 optimizations discovered, 11% speedup on already-optimized code. The generalized Claude Autoresearch can theoretically achieve up to 360 experiments/hour with 10-second verify commands (vs 12/hour for Karpathy's 5-minute GPU training).

Shopify CEO Tobi Lutke reported 19% gain on 37 experiments using the original Karpathy pattern. The Claude Autoresearch variant adds guard safety, crash recovery, noise handling, and stuck detection that the original lacked.

Key performance characteristics:
- **Iteration cost**: Seconds to minutes (vs 5 min for original Karpathy)
- **Experiments per night**: Up to ~2,880 with 10s verify cycle
- **Rollback safety**: `git revert` preserves history (original used `git reset` which destroyed it)
- **Crash recovery**: Auto-fix max 3 attempts then skip (original had no crash recovery)
- **Stuck detection**: Auto-escalates after 5 consecutive discards (original had none)
- **Typical success rate**: Community reports suggest ~20-30% of experiments succeed, with value concentrated in the few that work
- **Practical failure rate**: One documented run showed 26/35 experiments failing or crashing, which is normal and expected behavior

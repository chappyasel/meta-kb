---
url: 'https://github.com/affaan-m/everything-claude-code'
type: repo
author: affaan-m
date: '2026-04-04'
tags:
  - agent-systems
  - agentic-skills
  - context-engineering
  - self-improving
  - agent-memory
key_insight: >-
  Everything Claude Code reveals the emergent architecture of large-scale skill
  curation: 156 skills + 38 agents + 72 legacy commands organized across 12
  language ecosystems with a manifest-driven selective install system -- the key
  pattern is that at this scale, the hard problem shifts from individual skill
  quality to skill governance (conflict detection, install profiles, hook
  runtime controls, cross-harness parity) and the continuous learning loop where
  sessions automatically extract reusable patterns into the skill library.
stars: 136116
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - CLAUDE.md
    - WORKING-CONTEXT.md
    - agent.yaml
    - the-shortform-guide.md
    - the-security-guide.md
    - install.sh
    - .claude-plugin/marketplace.json
    - .opencode/README.md
    - .opencode/prompts/agents/
    - .cursor/skills/
    - .cursor/hooks.json
    - .cursor/rules/
    - contexts/dev.md
    - contexts/research.md
    - ecc2/Cargo.toml
  analyzed_at: '2026-04-04'
  original_source: repos/affaan-m-everything-claude-code.md
relevance_scores:
  topic_relevance: 9
  practitioner_value: 9
  novelty: 8
  signal_quality: 9
  composite: 8.9
  reason: >-
    Directly implements the SKILL.md/agent harness pattern at scale (156 skills,
    38 agents, cross-harness parity) with continuous session-to-skill extraction
    loops — a core reference architecture for agent capability organization,
    governance, and self-improvement patterns covered in topics 3, 4, and 6.
---

## Architecture Overview

Everything Claude Code (ECC) is the largest curated collection of agent skills, hooks, rules, and configurations for AI coding agents. Originally built for Claude Code, it now spans Claude Code, Codex, Cowork, OpenCode, Cursor, Antigravity, and Gemini. The repo functions as both a usable plugin and a reference catalog for how to organize agent capabilities at scale.

Created by Affaan Mustafa, ECC originated from an Anthropic hackathon win in September 2025 and evolved through 10+ months of intensive real-world use into what the project describes as an "agent harness performance optimization system." By March 2026, the project had reached 136,000+ GitHub stars with 20,000+ forks, 768 total commits from 113 contributors, translations in seven languages, and 1,723 passing tests. The viral growth was driven by an X (Twitter) thread that received 900,000+ views and 10,000+ bookmarks, though community discussions note that star count may not reflect actual active daily usage.

The architecture reflects its evolution from a personal config collection to a cross-platform plugin system with four distinct layers:

```
everything-claude-code/
  .claude-plugin/          # Plugin marketplace manifests
  agents/                  # 38 subagent definitions (markdown + YAML frontmatter)
  skills/                  # 156 skill definitions (markdown SKILL.md files)
  commands/                # 72 legacy slash-command shims (migrating to skills)
  hooks/                   # Trigger-based automations (pre/post tool, session lifecycle)
  rules/                   # Always-follow guidelines per language
    common/                # Cross-language rules (agents, git, security, patterns)
    typescript/            # TS-specific rules
    python/                # Python-specific rules
    golang/ swift/ php/    # 12 language ecosystems total
    kotlin/ java/ perl/
    cpp/ rust/
  .cursor/                 # Cursor IDE integration
    skills/                # Cursor-specific skills
    hooks.json             # 20+ event hooks
    rules/                 # Cursor rules (mirrors .claude rules)
  .opencode/               # OpenCode integration
    prompts/agents/        # 28 agent prompts
    commands/              # 30+ commands
    tools/                 # Custom tools (security-audit, run-tests, etc.)
    plugins/               # Hook plugins
  .gemini/                 # Gemini integration
  .trae/                   # Trae integration
  ecc2/                    # Next-gen Rust-based orchestrator
  contexts/                # Mode-based context files (dev, research, review)
  tests/                   # 1723 tests
  scripts/                 # Node.js utilities for hooks
```

The layered design follows a four-tier architecture:
1. **User-Facing Layer**: Commands and rules (immediate interaction)
2. **Intelligence Layer**: Agents and skills (domain knowledge and execution)
3. **Automation Layer**: Hooks and lifecycle scripts (quality gates)
4. **Evolution Layer**: Observation system and instinct clustering (self-improvement)

## Core Mechanism

### The Skill-Agent-Hook Triad

ECC organizes agent capabilities into three complementary layers that serve distinct roles in the agent workflow:

**Skills** (156): Workflow definitions and domain knowledge that function as "knowledge modules that Claude Code loads based on context." Each is a SKILL.md file with sections for "When to Use", "How It Works", and "Examples". Skills declare activation triggers enabling context-aware knowledge injection without explicit user invocation. Skills range from coding standards (`coding-standards.md`) to domain-specific workflows (`healthcare-phi-compliance`, `customs-trade-compliance`, `energy-procurement`) to framework patterns (`django-patterns`, `laravel-patterns`, `springboot-patterns`, `pytorch-patterns`, `nextjs-turbopack`, `bun-runtime`).

Skills load dynamically to optimize the 200K token context window. The design allocates approximately 10K tokens for system prompts, 5-8K for resident rules, and 2-5K per MCP tool definition, with a recommendation to enable no more than 10 MCPs per project to preserve approximately 70K tokens from the 200K total. Agents also avoid the final 20% of context windows during large refactorings to maintain performance and prevent truncation failures.

**Agents** (38): Specialized subagent definitions with YAML frontmatter specifying `name`, `description`, `tools`, and `model`. Agents employ a hierarchical delegation model with two categories:

- **Orchestrator agents** (broad tool access): `planner` for task decomposition, `architect` for system design
- **Specialized agents** (restricted tool permissions): `tdd-guide`, `code-reviewer`, `security-reviewer`, `build-error-resolver`, `e2e-runner`, `refactor-cleaner`, `doc-updater`, `database-reviewer`, plus language-specific reviewers (`go-reviewer`, `rust-reviewer`, `kotlin-reviewer`, `python-reviewer`)

Each agent receives restricted tool permissions preventing unauthorized operations outside its domain -- reviewers can execute Bash (for test runs) but not Edit; documentation agents use Haiku with Read-only access; implementation agents receive full write permissions only when appropriate. Agents support model routing: Haiku for fast tasks, Sonnet for complex logic, Opus for architecture decisions. The orchestrator invokes agents proactively: feature requests trigger the `planner` agent, code modifications trigger `code-reviewer`, security-sensitive code triggers `security-reviewer`.

**Hooks** (20+ event types): Trigger-based automations that fire on lifecycle events, serving as the deterministic automation backbone. Six hook types: PreToolUse, PostToolUse, UserPromptSubmit, Stop, PreCompact, Notification. Hooks implement session persistence, quality gates, design quality checks, and tmux reminders. Hooks transitioned from fragile inline scripts to robust Node.js implementations stored in `scripts/hooks/`, addressing early reliability issues.

### Manifest-Driven Selective Install

At 156 skills across 12 language ecosystems, installing everything is impractical. ECC uses a manifest-driven install pipeline:

```bash
./install.sh --profile full              # Everything
./install.sh typescript python           # Language-specific
./install.sh --target cursor typescript  # Platform + language
./install.sh --target gemini --profile full
```

The pipeline has three components:
- `install-plan.js`: Reads the manifest, determines what to install based on profile + language + target. Platform detection routes components to correct installation targets.
- `install-apply.js`: Executes the install plan, copying files to the right locations
- State store (SQLite): Tracks what is installed, enabling incremental updates

Three installation profiles serve different needs:
- **core**: Minimal baseline (rules, agents, commands, hooks)
- **developer**: Standard engineering (+ frameworks, databases)
- **full**: Complete suite (+ security, research, media modules)

The package manager cascade detects the project's preferred tool in priority order: environment variable `CLAUDE_PACKAGE_MANAGER`, project config `.claude/package-manager.json`, `package.json` packageManager field, lockfile detection (`yarn.lock`, `pnpm-lock.yaml`).

### Continuous Learning: The Instinct System

ECC's most architecturally distinctive feature is the Continuous Learning system, which evolved through two major versions that demonstrate the progression from probabilistic to deterministic pattern extraction.

**Version 1 (Skill-based)**:
- Extracts patterns via Stop Hook at session end
- Achieves 50-80% coverage (probabilistic, based on Claude's judgment about when to fire)
- Stores learned patterns in `~/.claude/skills/learned/`
- Patterns are saved as skill files manageable through review, editing, version control

**Version 2 (Instinct-based)** -- the current architecture:
- Uses deterministic `PreToolUse` and `PostToolUse` hooks capturing "every tool call observed" with 100% reliability, eliminating pattern-detection gaps
- Introduces the "Instinct" as the atomic unit of learned behavior -- a single trigger paired with one action, tagged with domain (code-style, testing, git, debugging, workflow)
- Each instinct carries a confidence score from 0.3 (tentative) to 0.9 (near-certain)

The confidence scoring system drives dynamic behavior:

| Score | Interpretation | Application |
|-------|---|---|
| 0.3 | Tentative suggestion | Not enforced |
| 0.5 | Moderate confidence | Applied contextually |
| 0.7 | Strong signal | Auto-approved (`auto_approve_threshold`) |
| 0.9 | Near-certain behavior | Core pattern |

Confidence increases when patterns repeat or users don't correct suggestions. It decreases through explicit user corrections, extended observation gaps (decay rate: 0.05), or contradicting evidence. This creates a natural selection pressure where useful patterns strengthen and irrelevant ones fade.

The observation pipeline works as follows:
1. **Hook capture**: PreToolUse/PostToolUse hooks write to `observations.jsonl` (local JSONL format) containing prompts, tool calls, and outcomes
2. **Background analysis**: An Observer Agent (Claude Haiku for cost efficiency) runs every 5 minutes, analyzing observations for: user corrections reversing suggested approaches, error-resolution sequences repeated across sessions, recurring tool-use workflows, consistent tool preferences
3. **Instinct generation**: Detected patterns become atomic instincts with confidence scores, tagged with project scope via git remote URL hashing (preventing React patterns from contaminating Python projects)
4. **Evolution pipeline**: The `/evolve` command aggregates 3+ related instincts into higher-order artifacts -- full `SKILL.md` files, new agent definitions, or specialized commands

```
Observations (JSONL) -> Pattern Detection -> Atomic Instincts
  -> Clustering (threshold: 3 related instincts) -> Evolved Artifacts
```

The privacy model ensures raw observations are stored locally and never shared; only compiled instincts can be exported. Import/export commands (`/instinct-import`, `/instinct-export`, `/instinct-status`) enable sharing learned patterns across projects while maintaining this boundary.

Version 2 runs alongside v1: existing `~/.claude/skills/learned/` skills continue functioning, while stop hooks feed data into the new system for gradual migration.

### Cross-Harness Parity

ECC maintains behavior consistency across 6+ AI agents, with platform-specific coverage:

- **Claude Code** (primary): Full coverage with 38 agents, 72 commands, 34+ rules, 8 hook event types. Native plugin system with skills, hooks, rules.
- **Cursor**: 15 hook event types via DRY adapter pattern in `.cursor/` directory with hooks.json, rules, and skills
- **OpenCode**: 11 hook events and 6 native custom tools via `.opencode/` with custom plugin system (`opencode.json`, tools, and prompts)
- **Codex**: Instruction-based support via `AGENTS.md` format with codex-specific installer (no hook execution yet)
- **Gemini**: `GEMINI.md` format adaptation
- **Trae**: Install/uninstall scripts

Each platform adapter translates the canonical skill/agent/hook format into the platform's native format. The `agent.yaml` file serves as the unified manifest listing all 156 skills with metadata. The `AGENTS.md` file at repository root provides a unified configuration point enabling cross-platform consistency without tool-specific duplication.

### Hook Runtime Controls

Hooks are gated by runtime environment variables, a v1.8.0 improvement that eliminated the need for direct hooks.json modification (which caused merge conflicts):
```bash
ECC_HOOK_PROFILE=minimal|standard|strict  # Strictness level
ECC_DISABLED_HOOKS="pre:bash:tmux-reminder,post:edit:typecheck"  # Selective disable
```

All hooks use a `run-with-flags.js` wrapper that implements profile-based gating without requiring hook file modifications. Hooks exit 0 on non-critical errors to never block tool execution.

### Security: AgentShield

The AgentShield security scanner enforces guardrails through multiple layers:

- **1,282 security tests and 102 static analysis rules** validated across the codebase
- **PreToolUse hooks** blocking dangerous git flags (`--no-verify`), secret detection patterns for API keys (`sk-`, `ghp_`, `AKIA`), and config protection preventing modification of `.eslintrc`, `biome.json`, `.ruff.toml`
- **OWASP Top 10 coverage**: scans for hardcoded credentials, SQL injection, XSS, unvalidated input
- **`--opus` flag**: enables adversarial analysis using three Claude Opus agents in a "red-team/blue-team/auditor pipeline"

The tool restriction model prevents privilege escalation: reviewers can execute Bash (for test runs) but not Edit; documentation agents use Haiku with Read-only access; implementation agents receive full write permissions only when appropriate.

### NanoClaw v2: Built-in Orchestration

The v1.8.0 release introduced NanoClaw v2, a built-in agent orchestration engine that handles:
- **Model routing**: Automatic task-appropriate model selection (Haiku/Sonnet/Opus)
- **Skill hot-loading**: Dynamic skill injection based on context
- **Session management**: Branching, searching, exporting, compacting, and metrics tracking

NanoClaw represents the shift from "config bundle" to active orchestration -- managing the runtime lifecycle of agent sessions rather than just providing static configuration.

### ECC 2.0 (Rust Orchestrator)

The `ecc2/` directory contains a next-generation Rust-based orchestrator with:
- Session management (runtime, store, manager, daemon)
- TUI dashboard (app, dashboard, widgets)
- Git worktree management
- Observability layer
- Inter-process communication (comms)

This signals a direction toward a compiled orchestration layer rather than relying entirely on the host agent's execution model. Combined with the Rust rules added in v1.9.0, this suggests ECC is investing in performance-critical infrastructure alongside its TypeScript/Node.js skill layer.

## Design Tradeoffs

### Breadth vs Depth

ECC optimizes for breadth: 156 skills across domains from `healthcare-emr-patterns` to `logistics-exception-management` to `liquid-glass-design`. Individual skills are typically 50-200 lines of markdown guidelines. Compare this to gstack's 23 skills where each is 500-2000 lines of detailed workflow instructions, or anthropics/skills where the skill-creator alone is 486 lines.

The tradeoff is clear: ECC provides coverage across dozens of domains but less depth in any single domain. This makes it valuable as a starting template but often insufficient as the complete solution for specialized tasks. As one community analysis notes, "most people just need a good CLAUDE.md, not an entire ecosystem" -- the value proposition is strongest for teams wanting a reference architecture rather than a turn-key solution.

### Curation vs Generation

Skills are curated by the maintainer and community contributors (113+ contributors), not generated automatically. The `skill-creator` command helps create new skills, but there is no automated quality gate beyond the test suite. The WORKING-CONTEXT.md reveals active quality concerns:
- "rewrite content-facing skills to use source-backed voice modeling"
- "remove generic LLM rhetoric, canned CTA patterns"
- "continue one-by-one audit of overlapping or low-signal skill content"

This highlights a fundamental challenge of large skill registries: maintaining quality at scale requires ongoing curation. The project has rejected multiple PRs for "external multi-CLI dispatch treated as a first-class runtime dependency" and "generic LLM rhetoric," demonstrating active quality enforcement.

### Legacy Commands vs Skills-First

ECC is actively migrating from `commands/` (72 legacy slash-entry shims) to `skills/` as the primary workflow surface. This migration is incomplete, with both systems coexisting. The tension is between backward compatibility (users know `/tdd`) and the richer skill format (SKILL.md with progressive disclosure).

### Plugin vs Direct Install

ECC supports both plugin installation (`/plugin install`) and direct file copy. The plugin system provides update management but limits what can be distributed -- a known pain point documented in community issues. Rules require manual `.claude/rules/` directory copy, breaking the "install once, get everything" promise (Issues #29, #52, #103 document duplicate hook detection problems with Claude Code v2.1+ auto-loading hooks.json from plugins).

### Proactive vs Reactive Agent Delegation

The orchestrator launches agents without waiting for explicit user requests: feature requests automatically trigger the `planner` agent, code modifications trigger `code-reviewer`, and security-sensitive code triggers `security-reviewer`. This proactive delegation improves workflow efficiency but can feel intrusive for developers who prefer explicit control.

### Context Window Economics

ECC implements sophisticated context window management. With approximately 200K tokens total, the system budgets approximately 10K for system prompts, 5-8K for resident rules, and 2-5K per MCP tool definition. The recommendation to limit MCPs to 10 per project preserves approximately 70K tokens for actual work. Agents avoid the final 20% of context windows during large refactorings. This represents a concrete engineering response to the fundamental constraint of finite context.

## Failure Modes & Limitations

**Skill overlap and conflict**: At 156 skills, overlap is inevitable. The WORKING-CONTEXT.md explicitly flags "overlapping skills, hooks, or agents should be consolidated when overlap is material." Skills like `security-review` and `security-scan` may conflict or duplicate guidance.

**Quality variance**: Community-contributed skills vary significantly in quality. The project has rejected multiple PRs for "external multi-CLI dispatch treated as a first-class runtime dependency" and "generic LLM rhetoric." The guardrails file warns against "vendor-marketing docs for an external backend."

**Context budget at scale**: If a project uses TypeScript + Python + Go, the combined rules alone could consume significant context. The selective install system mitigates this but does not solve it at runtime -- all installed rules are always loaded.

**No formal skill dependency graph**: Skills cannot declare dependencies on other skills. A `springboot-tdd` skill might assume `springboot-patterns` is installed, but there is no mechanism to verify or enforce this.

**Cross-harness lowest common denominator**: Supporting 6+ platforms means features must work everywhere. Complex hook chains that work in Claude Code may not be expressible in Codex's simpler `AGENTS.md` format. The platform coverage asymmetry is significant: Claude Code gets 38 agents and 8 hook event types, while Codex gets instruction-based support with no hook execution.

**Instinct system maturity**: The continuous learning system (instincts with confidence scoring) represents an ambitious architecture but is in active development. The v2 instinct system was introduced in v1.9.0, and the evolution pipeline (aggregating instincts into skills) is the newest and least battle-tested component. The 5-minute Observer Agent interval means pattern detection is not real-time.

**Over-engineering concerns**: Community feedback consistently raises the concern that the full framework (997+ tests, built-in orchestration, 156 skills) exceeds typical team needs. The Medium analysis concludes that for solo developers, "installing the full ECC framework is probably overkill" and recommends extracting individual patterns into a lean CLAUDE.md instead.

**Incomplete plugin distribution**: Rules cannot distribute automatically through the plugin system. Agents, commands, skills, and hooks load automatically, but rules require manual `.claude/rules/` directory copy. This breaks the seamless installation promise and is a recurring source of user confusion.

**Star count vs active usage**: With 136,000+ stars but minimal GitHub Discussions activity alongside daily Issue submissions, the gap between star count and actual active usage may be substantial. The viral X thread drove massive visibility but community engagement patterns suggest a much smaller active user base.

## Integration Patterns

### For Practitioners

Install via plugin for the simplest path:
```bash
/plugin marketplace add affaan-m/everything-claude-code
/plugin install everything-claude-code@everything-claude-code
./install.sh typescript  # Manual rules install required
```

Or selective installation by profile:
```bash
./install.sh --profile core            # Minimal baseline
./install.sh --profile developer       # Standard engineering
./install.sh --profile full            # Complete suite
./install.sh --target cursor python    # Platform + language specific
```

### Recommended Adoption Strategy

Community consensus suggests a graduated adoption approach rather than full installation:

1. **Start with standalone components**: The code-reviewer agent (highest-rated component), TDD workflow skill, and session summary hooks provide immediate value
2. **Add language-specific rules**: Install only the language ecosystems relevant to the project
3. **Enable security scanning**: AgentShield provides concrete safety benefits
4. **Adopt the instinct system**: Enable continuous learning only after establishing a baseline workflow

### For Skill Authors

ECC provides templates for each component type:
- Agents: Markdown with frontmatter (name, description, tools, model)
- Skills: SKILL.md with When to Use, How It Works, Examples sections
- Commands: Markdown with description frontmatter
- Hooks: JSON with matcher conditions and command/notification hooks

Validation infrastructure ensures quality:
- `scripts/ci/validate-agents.js`: Schema compliance
- `scripts/ci/validate-skills.js`: Skill format validation
- `scripts/ci/catalog.js`: Documentation sync verification
- 1,723 internal tests with 100% pass rate

### For Platform Integrators

The `agent.yaml` manifest provides machine-readable metadata:
```yaml
spec_version: "0.1.0"
name: everything-claude-code
version: 1.9.0
skills: [156 skill names]
tags: [agent-harness, developer-tools, code-review, testing, security, cross-platform]
```

### Operational Commands

ECC includes commands for self-management:
- `/harness-audit`: Score the harness configuration quality
- `/quality-gate`: Checkpoint-based quality verification
- `/model-route`: Smart model selection based on task complexity
- `/loop-start` / `/loop-status`: Autonomous loop management
- `/security-scan`: AgentShield security analysis
- `/learn`, `/instinct-import`, `/instinct-export`, `/instinct-status`, `/evolve`: Continuous learning lifecycle

## Benchmarks & Performance

**Test suite**: 1,723 tests covering agents, skills, commands, hooks, and packaging. Tests validate:
- Plugin manifest structure
- Hook behavior and gating
- Cross-platform install correctness
- Skill content quality (no empty sections, valid frontmatter)
- AgentShield: 1,282 security tests, 102 static analysis rules

**Scale metrics** (v1.9.0):
- 38 agents across 10+ language specializations (with model routing across Haiku/Sonnet/Opus)
- 156 skills across 12 language ecosystems
- 72 legacy command shims (migrating to skills)
- 20+ hook event types (6 core types, platform-specific extensions)
- 6+ supported AI agent platforms
- 3 installation profiles (core, developer, full)

**Community metrics**:
- 136K+ GitHub stars, 20K+ forks, 113+ contributors
- 768 total commits
- Translations in 7 languages
- npm weekly downloads tracked for ecc-universal and ecc-agentshield packages
- GitHub App with 150+ installs

**Version history milestones**:
- v1.2.0: Unified commands and skills + Python/Django support
- v1.6.0: Formalized four-platform compatibility
- v1.8.0: Hook runtime controls, NanoClaw v2 orchestration, "agent harness performance optimization system" positioning
- v1.9.0: Selective-install architecture, 6 new agents, 12 language ecosystems, instinct system v2

The Anthropic hackathon win (September 2025) validates the core approach: skill composition + hooks + rules as a performance optimization system for AI agent harnesses, not just a configuration pack.

## Community Reception & Positioning

ECC occupies a unique position in the AI coding tools ecosystem: the most comprehensive reference catalog for agent configuration, but one that generates debate about whether comprehensiveness itself is the right goal.

**Positive positioning**: The community consistently identifies ECC as the definitive reference architecture for structuring agents, skills, and hooks. The code-reviewer agent with "80% confidence filtering, consolidation of similar findings, and security vulnerability prioritization" is the most praised standalone component. The TDD workflow and session summary hooks are recommended even by critics of the full system. The framework treats agent inconsistency as an engineering problem: structured rules enforce test-first development, prevent configuration circumvention, and maintain audit trails without manual oversight.

**Critical assessment**: The r/ClaudeCode subreddit consensus and Medium analyses converge on a nuanced view: ECC represents significant engineering effort and a genuine reference architecture, but "most complete" and "necessary for everyone" are distinctly different propositions. For daily-driver teams with complex multi-language codebases, the time savings on automation and security scanning is concrete. For solo developers or smaller projects, extracting individual patterns into a lean CLAUDE.md delivers most of the value at a fraction of the complexity.

The broader significance of ECC is as evidence of a maturing ecosystem: the existence of a 156-skill, 38-agent, cross-platform configuration system with 1,723 tests demonstrates that AI coding agent configuration has become its own engineering discipline, with the same challenges (governance, quality, compatibility, versioning) as any large-scale software distribution system.

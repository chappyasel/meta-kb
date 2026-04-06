---
entity_id: claude-code
type: project
bucket: agent-systems
abstract: >-
  Claude Code is Anthropic's terminal-based agentic coding tool that reads
  codebases, writes/executes code, and manages files, distinguished by its
  CLAUDE.md instruction system, Model Context Protocol integration, and a rich
  ecosystem of composable skills and hooks.
sources:
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/affaan-m-everything-claude-code.md
  - repos/snarktank-compound-product.md
  - repos/natebjones-projects-ob1.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/ayanami1314-swe-pruner.md
  - repos/human-agent-society-coral.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/anthropics-skills.md
  - repos/greyhaven-ai-autocontext.md
  - repos/thedotmack-claude-mem.md
  - repos/alirezarezvani-claude-skills.md
  - repos/garrytan-gstack.md
  - repos/uditgoenka-autoresearch.md
  - repos/tirth8205-code-review-graph.md
  - repos/kepano-obsidian-skills.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/uditgoenka-autoresearch.md
  - deep/repos/othmanadi-planning-with-files.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - cursor
  - openai-codex
  - anthropic
  - mcp
  - andrej-karpathy
  - gemini
  - agent-skills
  - openclaw
  - autoresearch
  - context-engineering
  - windsurf
  - claude-md
  - rag
  - claude
  - self-improving-agents
  - skill-md
  - openai
  - obsidian
  - agent-memory
  - progressive-disclosure
  - knowledge-graph
  - vllm
  - prompt-engineering
  - ollama
  - vector-database
  - chromadb
  - karpathy-loop
  - task-decomposition
  - zettelkasten
  - github-copilot
  - hipocampus
  - compaction-tree
  - dspy-optimization
last_compiled: '2026-04-06T01:57:11.113Z'
---
# Claude Code

**Type:** Agentic Coding Tool
**Created by:** [Anthropic](../projects/anthropic.md)
**Competes with:** [Cursor](../projects/cursor.md), [Windsurf](../projects/windsurf.md), [GitHub Copilot](https://github.com/features/copilot), [OpenAI Codex](../projects/openai-codex.md), [Gemini](../projects/gemini.md)
**Implements:** [Model Context Protocol](../concepts/mcp.md), [Agent Skills](../concepts/agent-skills.md), [claude.md](../concepts/claude-md.md), [skill.md](../concepts/skill-md.md), [Context Engineering](../concepts/context-engineering.md), [Task Decomposition](../concepts/task-decomposition.md), [Agent Memory](../concepts/agent-memory.md), [Self-Improving Agents](../concepts/self-improving-agents.md), [Karpathy Loop](../concepts/karpathy-loop.md), [Compaction Tree](../concepts/compaction-tree.md)

---

## What It Does

Claude Code runs in the terminal as an autonomous coding agent. Given a task, it reads the existing codebase, plans an approach, writes code, executes it, interprets results, and iterates until the task is complete or it gets stuck. Unlike IDE-embedded tools (Cursor, Windsurf), Claude Code has no GUI — it operates entirely through the CLI, making it composable with scripts, CI pipelines, and agent orchestration systems.

The core differentiator is the surrounding ecosystem: a permission model with fine-grained tool controls, a hook system that fires on lifecycle events, and CLAUDE.md as a persistent instruction layer that shapes agent behavior across sessions. This makes Claude Code the most programmable of the major agentic coding tools. You can tell it to always run tests before committing, never touch certain files, and call specialized subagents for security review — and it will follow those rules mechanically across every session.

---

## Architecture

### CLAUDE.md: The Instruction Layer

[claude.md](../concepts/claude-md.md) files sit at the project root (and optionally in subdirectories) and load automatically into every session. They function as persistent system prompts: defining project conventions, declaring which tools are allowed, specifying coding standards, and pointing to skill files. Because CLAUDE.md is version-controlled alongside the code, the entire team shares the same agent behavior.

The agent reads CLAUDE.md first and treats its contents as standing orders. A well-crafted CLAUDE.md can turn a generic coding agent into one that understands your specific stack, follows your PR conventions, and knows not to modify generated files.

### Skills: Composable Knowledge Modules

Skills ([skill.md](../concepts/skill-md.md)) are markdown files with a defined structure: `When to Use`, `How It Works`, `Examples`. Claude Code loads them based on context signals — a task involving TypeScript triggers TypeScript-specific skills, a security-sensitive file triggers the security review skill. Skills enable [progressive disclosure](../concepts/progressive-disclosure.md): the agent loads detailed domain knowledge only when relevant, conserving the context window.

The community ecosystem for Claude Code skills is substantial. The Everything Claude Code collection ([OpenClaw](../projects/openclaw.md)) maintains 156 skills across 12 language ecosystems, 38 agent definitions, and 72 legacy commands. This scale revealed that skill governance — conflict detection, install profiles, cross-platform parity — matters as much as individual skill quality.

### Hooks: Deterministic Automation

Hooks fire on lifecycle events: `PreToolUse`, `PostToolUse`, `UserPromptSubmit`, `Stop`, `PreCompact`, `Notification`. They enable deterministic quality gates that run regardless of what the agent decides to do. A `PreToolUse` hook on Bash can block dangerous git flags. A `PostToolUse` hook on Edit can trigger typechecking. A `Stop` hook can extract reusable patterns from the session into the skill library.

Hooks exit with code 0 on non-critical errors to avoid blocking tool execution. Environment variables (`ECC_HOOK_PROFILE`, `ECC_DISABLED_HOOKS`) control which hooks fire without requiring modification of the hooks.json file itself.

### Model Context Protocol

Claude Code implements [MCP](../concepts/mcp.md) as its extension mechanism for external tools. Each MCP tool definition consumes 2-5K tokens from the context window. Practitioners cap MCP connections at 10 per project to preserve roughly 70K tokens out of the 200K total for actual work content.

### Context Window Economics

With ~200K tokens total, the practical budget breaks down as: ~10K for system prompts, ~5-8K for resident rules, ~2-5K per MCP tool, and the remainder for code and conversation. The agent avoids writing in the final 20% of the context window during large refactors to prevent truncation failures. Context compaction ([Compaction Tree](../concepts/compaction-tree.md)) summarizes conversation history when approaching limits.

### Subagent Delegation

Claude Code supports spawning subagents with restricted tool permissions. A `code-reviewer` agent can execute Bash (to run tests) but not Edit. A `doc-updater` agent gets read-only access and routes through Claude Haiku for cost efficiency. An `architect` agent gets broad access for system design. The orchestrating agent delegates to these specialists proactively — feature requests trigger the planner, code modifications trigger the reviewer — rather than waiting for explicit user direction.

---

## Core Mechanisms

**The permission model** defines allowed and denied tools per agent: `Allow: Bash, Read(/src/), Edit(/src/)` and `Deny: Bash(git --no-verify), Read(/private/)`. This prevents privilege escalation while giving agents enough freedom to work autonomously.

**Session persistence** via JSONL session files enables `--resume` to continue a previous session with full conversation history. The [Hipocampus](../projects/hipporag.md) memory system extends this further: a compressed topic index (ROOT.md, ~3K tokens) loads into every session, providing O(1) lookup across months of conversation history without search queries. Benchmark results show this approach achieves 21x better implicit recall than no memory and 5x better than search alone.

**The self-improvement loop** ([Karpathy Loop](../concepts/karpathy-loop.md)) applied to Claude Code: the agent modifies code, verifies with a defined metric, keeps the change if improved or reverts if not, and loops. Projects like [AutoResearch](../projects/autoresearch.md) encode this as a Claude Code skill system — 10 commands and ~5,000 lines of markdown protocols that make Claude Code an autonomous improvement agent for any domain with a scalar metric and fast verification.

**Continuous learning** from the Everything Claude Code ecosystem extracts reusable patterns at session end via Stop hooks, storing them as skills in `~/.claude/skills/learned/`. Version 2 of this system uses `PreToolUse`/`PostToolUse` hooks to capture every tool call (100% coverage vs. ~60% probabilistic), generating atomic "instincts" with confidence scores that decay when unused and strengthen when patterns repeat.

---

## Key Numbers

- **SWE-Bench Verified**: Claude 3.5 Sonnet scored 49% on [SWE-Bench](../projects/swe-bench.md) (the standard software engineering benchmark for autonomous bug fixing). This is self-reported by Anthropic.
- **Context window**: 200K tokens (Claude 3.5/3.7 models)
- **Community ecosystem (Everything Claude Code)**: 156 skills, 38 agents, 72 commands, 1,723 tests, 136K+ GitHub stars — star count likely overstates active usage given the gap between stars and community discussion volume.
- **Typical experiment throughput**: 12/hour with 5-minute verification cycles (GPU training), up to 360/hour with 10-second cycles (unit tests)

SWE-Bench numbers across the field are self-reported under controlled conditions. Real-world performance on your specific codebase will differ based on codebase structure, test coverage, and task complexity.

---

## Strengths

**Programmability**: CLAUDE.md, skills, hooks, and the permission model give teams direct control over agent behavior. You can encode your entire development workflow — PR conventions, test requirements, security checks, style rules — and the agent follows it consistently.

**Composability**: Claude Code operates from the terminal, making it scriptable. You can run it in CI, chain it with other tools, invoke it from orchestration systems, and spawn parallel instances working on separate git worktrees.

**Ecosystem depth**: The skill/hook ecosystem is the most developed in the agentic coding space. Community projects (Everything Claude Code, Hipocampus, AutoResearch) have pushed the architecture significantly beyond what Anthropic ships by default.

**Autonomous loop support**: The `--dangerously-skip-permissions` flag enables fully autonomous operation for overnight runs. Systems like compound-product use this to build a report-reading, priority-selecting, PR-generating autonomous improvement pipeline that runs nightly.

---

## Critical Limitations

**Concrete failure mode — context collapse on large codebases**: When a task touches many files, context fills with code diffs, tool outputs, and conversation history. The agent loses track of earlier decisions, starts making contradictory changes, and may require restarts. Skills and subagent delegation mitigate this but don't solve it. On a 200K context window, a large refactor spanning dozens of files can exhaust the budget before completion, requiring manual intervention to resume.

**Unspoken infrastructure assumption**: Claude Code assumes a fast, reliable shell environment with git initialized. The permission model, hook system, and session persistence all depend on the local filesystem. In containerized CI environments, Docker builds, or remote development setups, hooks may not fire correctly, session files may not persist, and MCP connections may time out. The documentation does not address these edge cases.

---

## When NOT to Use It

**Don't use Claude Code when**:

- You need a GUI integration (inline completions, diff views, chat panels): Cursor or Windsurf serve this better.
- Your team isn't comfortable with terminal tooling: the setup cost is real.
- Tasks require continuous human micro-feedback: Claude Code is optimized for autonomous operation over extended tasks, not rapid back-and-forth on small edits.
- Your verification loop is slow (>30 minutes per iteration): the self-improvement loop becomes impractical. Autoresearch-style iteration requires fast verification to be useful.
- You're working in a codebase with no tests and no clear quality metric: the autonomous loop needs a verifiable success condition. Without one, the agent optimizes toward the wrong thing.

---

## Unresolved Questions

**Cost at scale with parallel agents**: Running multiple Claude Code instances simultaneously (3+ agents on separate branches, overnight) consumes significant API budget. Anthropic does not publish pricing guidance for this usage pattern, and the community has sparse data on actual costs.

**Skill conflict resolution**: At 156 skills, overlap is inevitable. When two skills give contradictory advice about the same domain, there is no defined priority order. The agent resolves conflicts through its own judgment, which is not transparent.

**Hook reliability across Claude Code versions**: Community issues (ECC #29, #52, #103) document duplicate hook detection problems with Claude Code v2.1+ auto-loading hooks.json from plugins. The interaction between plugin-installed hooks and manually configured hooks creates unpredictable behavior that Anthropic has not formally addressed.

**Long-term skill quality at scale**: The continuous learning system extracts patterns automatically, but there is no automated quality gate. Skills generated from bad sessions propagate into the library. The community relies on manual audits ("one-by-one audit of overlapping or low-signal skill content") — this does not scale.

**Governance for large skill registries**: Who decides when a skill is obsolete? How are naming conflicts resolved across contributors? The Everything Claude Code project has 113+ contributors and no formal governance model.

---

## Alternatives

| Scenario | Tool |
|---|---|
| Need inline completions and GUI diff views | [Cursor](../projects/cursor.md) or [Windsurf](../projects/windsurf.md) |
| Need autonomous multi-agent parallel exploration with graded evaluation | [CORAL](../projects/openclaw.md) (multi-agent worktree system) |
| Want zero-infrastructure persistent memory across sessions | [Hipocampus](../projects/hipporag.md) (file-based compaction tree) |
| Running self-improving optimization loops against a scalar metric | [AutoResearch](../projects/autoresearch.md) (Karpathy loop as skill system) |
| Prefer open-weight models, local inference | [Ollama](../projects/ollama.md) with a compatible coding front-end |
| Already using VS Code heavily | GitHub Copilot (tighter IDE integration) |

Use Claude Code when you want to encode your full development workflow as programmable rules and run the agent autonomously on multi-step tasks. Use Cursor when you want assisted editing with a GUI. Use the self-improvement loop pattern ([AutoResearch](../projects/autoresearch.md)) when you have a scalar metric and want overnight autonomous iteration.

---

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md) — Managing what goes into the agent's context window
- [Agent Memory](../concepts/agent-memory.md) — How agents persist knowledge across sessions
- [Task Decomposition](../concepts/task-decomposition.md) — Breaking tasks into machine-verifiable subtasks
- [Karpathy Loop](../concepts/karpathy-loop.md) — The modify-verify-keep/revert pattern
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — Loading context only when relevant
- [Self-Improving Agents](../concepts/self-improving-agents.md) — Agents that improve their own behavior over time
- [Prompt Engineering](../concepts/prompt-engineering.md) — Structuring instructions for reliable agent behavior
- [Knowledge Graph](../concepts/knowledge-graph.md) — Structured knowledge representation for agent retrieval

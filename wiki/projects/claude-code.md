---
entity_id: claude-code
type: project
bucket: agent-systems
abstract: >-
  Claude Code is Anthropic's terminal-based AI coding agent that executes
  multi-file edits, runs shell commands, and orchestrates subagents —
  differentiated by native CLAUDE.md project memory, Model Context Protocol
  support, and a permission system for autonomous agentic loops.
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/heygurisingh-breaking-someone-open-sourced-a-knowledge-graph.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/affaan-m-everything-claude-code.md
  - repos/memorilabs-memori.md
  - repos/snarktank-compound-product.md
  - repos/orchestra-research-ai-research-skills.md
  - repos/human-agent-society-coral.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/anthropics-skills.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/alirezarezvani-claude-skills.md
  - repos/uditgoenka-autoresearch.md
  - repos/thedotmack-claude-mem.md
  - repos/garrytan-gstack.md
  - repos/kepano-obsidian-skills.md
  - repos/tirth8205-code-review-graph.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - articles/gustycube-an-annoyed-computer-scientist-markdown-is-not-memory.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/karpathy-autoresearch.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/martian-engineering-lossless-claw.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/uditgoenka-autoresearch.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/repos/tirth8205-code-review-graph.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
related:
  - codex
  - cursor
  - opencode
  - openclaw
  - andrej-karpathy
  - autoresearch
  - rag
  - mcp
  - agent-skills
  - windsurf
  - claude-md
  - gemini
  - github-copilot
  - anthropic
  - antigravity
  - claude
  - obsidian
  - bm25
  - mem0
  - grpo
  - agent-memory
  - self-improving-agent
  - sqlite
  - tree-sitter
  - knowledge-base
  - openai
  - episodic-memory
  - context-engineering
  - knowledge-graph
  - progressive-disclosure
  - vector-database
  - continual-learning
  - gpt-4
  - prompt-engineering
  - chromadb
  - context-window
  - meta-agent
  - decision-traces
  - zettelkasten
  - context-management
  - muon-optimizer
  - unknown-unknowns
last_compiled: '2026-04-07T11:35:25.498Z'
---
# Claude Code

**Type:** Project — Agent System
**Created by:** [Anthropic](../projects/anthropic.md)
**Extends:** [Claude](../projects/claude.md)

## What It Does

Claude Code is a command-line coding agent that gives Claude direct access to a developer's filesystem, shell, and browser. Unlike chat-based coding assistants, it operates in the terminal and can read, write, and execute code without copy-paste intermediaries. A developer runs `claude` in a project directory, and the agent can grep files, run tests, edit multiple files atomically, and loop on failures until tests pass.

The architectural differentiator is autonomy depth. Claude Code is not a code-completion tool or an IDE plugin that suggests lines — it is a full agent loop that can be left running. Anthropic designed it to handle tasks like "fix all failing tests," "refactor this module to match this interface," or "set up CI/CD from scratch," with the agent planning, executing, and self-correcting without step-by-step human guidance.

## Architecture

### Permission Model

Claude Code's permission system is the mechanism that makes autonomous operation safe enough to be practical. Before each potentially destructive action (file edits, shell commands, network requests), the agent evaluates whether the action is covered by the session's allowed rules. In interactive mode, it prompts for confirmation on first use of a new action class. In headless mode (`--dangerously-skip-permissions`), it operates fully autonomously — a flag designed for CI pipelines and containerized environments where human confirmation is unavailable.

Permissions are configured via `.claude/settings.json` in the project root or `~/.claude/settings.json` globally. The schema supports fine-grained allow/deny rules:

```json
{
  "allowedTools": ["Bash", "Edit", "Read"],
  "deniedTools": ["Bash(git *)"],
  "allowedDirectories": ["/workspace/src/**"]
}
```

CORAL, a multi-agent orchestration system built on Claude Code, demonstrates this permission model at scale: it configures per-agent `.claude/settings.json` files that allow agents to read other agents' worktrees but only write to their own, and deny `Bash(git *)` entirely — delegating all version control to CORAL's orchestration layer. This shows the permission system is expressive enough to implement complex multi-agent isolation without modifying Claude Code itself.

### CLAUDE.md: Project Memory

[CLAUDE.md](../concepts/claude-md.md) is Claude Code's mechanism for persistent project context. The agent reads this file at the start of every session, making it the primary way to encode project-specific knowledge: build commands, code style, architecture decisions, team conventions. Unlike `.cursorrules` or similar IDE config files, CLAUDE.md is a markdown file the agent reads as natural language — it can contain prose explanations, examples, and conditional instructions.

The file resolves the cold-start problem for long-running projects. Without it, every session requires the developer to re-explain project structure. With it, the agent knows on day 100 what it learned on day 1. CORAL's multi-agent system takes this further: it generates a `CORAL.md` file (analogous to CLAUDE.md) for each agent worktree, customized per agent with task description, workflow instructions, and shared state conventions.

### Multi-File Editing and Agentic Loops

Claude Code operates on a tool-use loop: read state, plan actions, execute tools, observe results, plan next actions. The tools available include `Read`, `Edit`, `Write`, `Bash`, `WebSearch`, and `WebFetch`. The agent can chain these across multiple files and multiple tool calls before returning control to the user.

The `--resume` flag is architecturally significant: it restores a previous session's conversation history, allowing long-running tasks to survive interruption. CORAL uses this for agent lifecycle management — when an agent hits its max-turns limit, the orchestrator restarts it with `--resume {session_id}` plus a context prompt summarizing recent eval results.

### Model Context Protocol

Claude Code implements [MCP](../concepts/mcp.md), Anthropic's protocol for tool interoperability. MCP servers registered in Claude Code's config appear as additional tools the agent can call during its loop. This extends the tool surface without modifying Claude Code: a Postgres MCP server enables the agent to query live databases; a GitHub MCP server enables PR management. Any MCP server configured in Claude Code is available during autonomous operation, including during CORAL optimization loops.

### Session Management

Claude Code stores sessions as `.jsonl` files on disk. Each session is a sequence of messages and tool calls. The agent can list, resume, and branch sessions. This filesystem-based storage makes sessions durable across machine restarts and portable across machines — with the caveat that session resumption validates that the `.jsonl` file exists locally. Sessions started on machine A cannot be resumed on machine B, a limitation that affects distributed multi-agent systems like CORAL.

### Headless and Programmatic Use

The `-p` flag runs Claude Code non-interactively, accepting a prompt from stdin or as an argument and outputting results to stdout. Combined with `--output-format json` or `--output-format stream-json`, this makes Claude Code scriptable. The NDJSON streaming output format enables programmatic consumption of tool calls, results, and model responses in real time.

gstack uses this for its Tier 2 testing: full end-to-end tests via `claude -p` with NDJSON streaming, validating skill behavior programmatically rather than through manual testing.

## Key Numbers

- **SWE-bench Verified**: Claude 3.7 Sonnet (powering Claude Code) scores 70.3% on [SWE-bench](../projects/swe-bench.md) Verified (Anthropic-reported). For comparison, Volt (Martian Engineering's agent using LCM) scores 74.8% on the OOLONG long-context benchmark using the same base model — Volt's DAG-based context management outperforms Claude Code's sliding-window compaction at extended context lengths (+10.0 at 256K tokens, +12.6 at 512K tokens). These are self-reported figures from each respective party; no independent replication is confirmed.
- Tobi Lutke (Shopify CEO) ran the Karpathy autoresearch loop on internal data using Claude Code as the agent runtime, reporting 37 experiments and a 19% performance gain overnight. Self-reported.
- Garry Tan reports 10,000+ lines of code and 100 pull requests per week using a Claude Code skill system (gstack), sustained over 50 days. Self-reported.
- CORAL, a multi-agent system built on Claude Code, reports running 700 experiments in 2 days on ML optimization tasks. This figure originates from the Karpathy autoresearch project that CORAL generalizes.

## Strengths

**Autonomous loop execution.** Claude Code handles tasks that require dozens of sequential actions — run tests, read failure output, locate the bug, edit the file, run tests again — without requiring human confirmation at each step. Most coding assistants hand control back after each action.

**Project memory via CLAUDE.md.** The agent reads project-specific context on every session start, making it genuinely useful on day 100 of a project, not just day 1.

**Ecosystem composability.** The permission model, MCP support, session resumption, and headless mode make Claude Code programmable infrastructure. CORAL, gstack, autoresearch, and lossless-claw are all built on Claude Code without modifying it. The `AgentRuntime` protocol in CORAL abstracts Claude Code alongside OpenAI Codex and OpenCode — the agent is treated as a swappable component, not a dependency.

**Skill and agent composition.** The CLAUDE.md format, combined with skills systems like gstack's SKILL.md conventions, enables developers to encode complex multi-step workflows as reusable instructions. [Agent Skills](../concepts/agent-skills.md) loaded at session start give the agent domain knowledge without burning context on repeated explanation.

## Critical Limitations

**Context window compression degrades at scale.** Claude Code uses sliding-window compaction: when the context window fills, older messages are summarized and dropped. Martian Engineering's lossless-claw plugin replaced this with a DAG-based summarization system precisely because sliding-window compaction loses information that the agent needs to remain coherent in long sessions. For tasks exceeding ~100K tokens of interaction, Claude Code's built-in context management will lose details that affect code correctness. The OOLONG benchmark data shows this concretely: Claude Code's performance degrades relative to DAG-based alternatives at 256K and 512K token contexts.

**Unspoken infrastructure assumption: local session state.** Claude Code's `--resume` flag requires the session `.jsonl` file to exist on the local machine. This assumption breaks distributed workflows. CORAL documents this explicitly: sessions started on one machine cannot be resumed on another, and fresh-started agents must re-bootstrap from shared knowledge files. Any team deploying Claude Code across multiple machines or in cloud environments needs to plan around this constraint.

## When Not to Use It

**Multi-developer team workflows without additional infrastructure.** Claude Code's memory (CLAUDE.md, session files) is per-machine and per-developer. On a team, each developer's agent operates from different context, producing inconsistent behavior. Epsilla's analysis of gstack, which is built on Claude Code, identifies this as "agent drift" — isolated virtual teams that diverge without a shared semantic memory layer. Teams need additional infrastructure (shared CLAUDE.md in version control, MCP servers with shared state) to use Claude Code effectively at team scale.

**Tasks requiring lossless long-context recall.** If the task requires the agent to accurately recall specific values — commit SHAs, exact config keys, precise error messages — from hours-old interactions in a long session, Claude Code's sliding-window compaction will likely produce hallucinations or omissions. Use lossless-claw or a similar DAG-based context extension, or structure the task to keep sessions short with explicit checkpoints.

**Environments where billing attribution matters.** Claude Code does not currently provide per-agent or per-project cost attribution in its standard output. CORAL addresses this by running a LiteLLM gateway with per-agent API keys, tracking cost by agent. If you need cost attribution by project, team member, or task, you need external infrastructure.

## Unresolved Questions

**Conflict resolution in multi-agent writes.** When multiple Claude Code agents write to shared files simultaneously (as in CORAL's shared `.coral/public/` directory), the filesystem provides no transactional guarantees. CORAL uses `fcntl.flock()` on checkpoint operations but acknowledges that individual file writes have no concurrency protection. It is not documented how Claude Code behaves when two concurrent agents attempt to edit the same file.

**Session file format stability.** The `.jsonl` session format is undocumented. Tools like CORAL parse session files to extract session IDs; lossless-claw reconciles JSONL files with its SQLite database on bootstrap. If Anthropic changes the format, both break silently. There is no versioning or migration path documented.

**Cost at scale.** The Karpathy autoresearch loop running 700 experiments through Claude Code would generate substantial API costs. None of the ecosystem projects document their per-experiment or per-run costs. For teams evaluating multi-agent systems built on Claude Code, cost modeling is opaque.

**Governance of CLAUDE.md in large repos.** CLAUDE.md gives any developer with repo write access the ability to modify the instructions every agent reads. In large organizations, this is an unguarded attack surface — a CLAUDE.md change could instruct agents to exfiltrate data, skip tests, or commit insecure code. There is no documented access control or auditing mechanism for CLAUDE.md changes.

## Alternatives

- **[Cursor](../projects/cursor.md)**: Use when developers prefer an IDE-integrated experience over a terminal workflow, or when the team needs in-editor context like file tree awareness and cursor position.
- **[GitHub Copilot](../projects/github-copilot.md)**: Use when the primary use case is inline code completion within existing IDE workflows, not autonomous multi-step task execution.
- **[OpenCode](../projects/opencode.md)**: Use when you need an open-source Claude Code alternative with equivalent CLI behavior and no API cost dependency on Anthropic.
- **[OpenAI Codex](../projects/codex.md)**: Use when the task benefits from OpenAI's models specifically, or when OpenAI's tool ecosystem (function calling conventions, structured outputs) is the integration target.
- **[Windsurf](../projects/windsurf.md)**: Use when developers want persistent cross-session memory managed by the IDE rather than manual CLAUDE.md maintenance.
- **[Antigravity](../projects/antigravity.md)**: Use when the workload is browser-automation-heavy and native browser control is the primary requirement.

## Related Concepts

- [CLAUDE.md](../concepts/claude-md.md) — Project memory mechanism
- [Agent Skills](../concepts/agent-skills.md) — Skill composition pattern
- [Model Context Protocol](../concepts/mcp.md) — Tool interoperability layer
- [Context Management](../concepts/context-management.md) — How Claude Code handles context window limits
- [Context Window](../concepts/context-window.md) — The hard constraint shaping Claude Code's architecture
- [Context Engineering](../concepts/context-engineering.md) — Techniques for managing what goes into the context
- [Agent Memory](../concepts/agent-memory.md) — Memory patterns relevant to session persistence
- [Episodic Memory](../concepts/episodic-memory.md) — What session `.jsonl` files approximate
- [Meta-Agent](../concepts/meta-agent.md) — Orchestration patterns (CORAL, gstack Conductor) built on Claude Code
- [Decision Traces](../concepts/decision-traces.md) — The session file as an audit trail
- [Self-Improving Agent](../concepts/self-improving-agent.md) — Autoresearch and CORAL patterns running on Claude Code
- [Continual Learning](../concepts/continual-learning.md) — gstack's learnings system built on Claude Code sessions
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — Skill loading patterns that avoid context bloat
- [Tree-sitter](../projects/tree-sitter.md) — Used by Claude Code for syntax-aware code parsing
- [SQLite](../projects/sqlite.md) — Used by lossless-claw and CORAL for persistent state alongside Claude Code sessions

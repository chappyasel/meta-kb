---
entity_id: opencode
type: project
bucket: agent-systems
abstract: >-
  OpenCode is an open-source terminal-based AI coding agent supporting multiple
  LLM providers (Claude, GPT-4, Gemini) that competes with Claude Code by
  offering model flexibility and a plugin/skills ecosystem rather than
  single-vendor lock-in.
sources:
  - repos/affaan-m-everything-claude-code.md
  - repos/human-agent-society-coral.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/alirezarezvani-claude-skills.md
  - repos/tirth8205-code-review-graph.md
  - repos/kepano-obsidian-skills.md
  - papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/human-agent-society-coral.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/kepano-obsidian-skills.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - Claude Code
  - Anthropic
  - Cursor
  - Model Context Protocol
  - OpenClaw
  - OpenAI Codex
  - Google Gemini
  - Agent Skills
last_compiled: '2026-04-05T20:22:47.669Z'
---
# OpenCode

## What It Is

OpenCode is an open-source, terminal-native AI coding agent that lets developers run autonomous coding sessions against multiple LLM backends from a single tool. Where Claude Code ties you to Anthropic's API and Cursor ties you to a GUI, OpenCode runs in the terminal and supports Claude, GPT-4o, Gemini, and other providers through a configurable backend. It implements the [Model Context Protocol](../concepts/model-context-protocol.md) for tool integrations and the [Agent Skills](../concepts/agent-skills.md) specification for reusable capability packages.

The project occupies a specific niche: developers who want Claude Code-level autonomous coding capability without vendor lock-in, or who need to switch models mid-project based on task type (fast/cheap for boilerplate, expensive/capable for architecture decisions).

## Architecture and Core Mechanism

OpenCode's configuration lives in `.opencode/` at the project root. The directory structure mirrors other agents in the ecosystem:

```
.opencode/
  opencode.json       # Agent config: permissions, tools, model routing
  prompts/agents/     # 28 agent prompt definitions
  commands/           # 30+ slash commands
  tools/              # Custom tool definitions (security-audit, run-tests, etc.)
  plugins/            # Hook plugins (lifecycle event handlers)
```

The `opencode.json` manifest controls tool permissions at runtime, mapping capability grants to specific tools rather than giving blanket access. This mirrors Claude Code's `settings.json` permission model but uses OpenCode's own schema.

### Plugin and Skills System

OpenCode implements the Agent Skills specification (`SKILL.md` format), which means skill packages built for the broader ecosystem load directly. The [Everything Claude Code](../projects/everything-claude-code.md) collection, for example, ships an `.opencode/` directory as a first-class integration target alongside its `.claude/` and `.cursor/` directories. That collection provides 11 hook event types and 6 native custom tools for OpenCode specifically, compared to 38 agents and 8 hook event types for Claude Code's primary target. The coverage asymmetry is real: OpenCode gets functional parity on core features but fewer polished extensions.

### Hook System

OpenCode supports lifecycle hooks for pre/post tool execution, session start/end, and other events. Hook plugins in `.opencode/plugins/` fire on these events and can block tool execution, log activity, or inject context. The hook runtime is comparable to Claude Code's but with fewer documented event types in the wild.

### Model Routing

Unlike single-vendor agents, OpenCode can route different task types to different models. A configuration might use Haiku for file searches, Sonnet for implementation, and a local model via Ollama for privacy-sensitive code. This flexibility is the primary architectural differentiator.

## Position in the Ecosystem

Multiple major projects treat OpenCode as a first-class integration target:

**Everything Claude Code** (the largest cross-platform agent skill collection): Ships a dedicated `.opencode/` directory with 28 agent prompts and 30+ commands. The install pipeline handles `--target opencode` as a named profile. See [Everything Claude Code](../projects/everything-claude-code.md) for full architecture detail.

**CORAL** (multi-agent optimization system): The `AgentRuntime` protocol in `coral/agent/runtime.py` explicitly supports OpenCode alongside Claude Code and Codex as interchangeable agent backends. Each runtime provides its own instruction filename and shared directory convention; OpenCode's is `.opencode/`. CORAL's permission model maps to OpenCode's `opencode.json` format for isolated worktree experiments.

**Hipocampus** (proactive memory system): Ships an OpenCode integration alongside Claude Code and OpenClaw. Follows the same session lifecycle protocol (Task Start/End hooks, hot file updates) with platform-specific plugin configuration.

**Obsidian Skills** / **Agent Skills spec**: The agentskills.io standard (adopted by Anthropic, OpenAI, Microsoft, Google) lists OpenCode as a supported runtime. Skills install to `~/.opencode/skills/` and auto-discover all `SKILL.md` files in subdirectories.

**The Agentic Researcher** framework (autonomous research sessions): Lists OpenCode alongside Claude Code, Codex CLI, and Gemini CLI as a compatible runtime for the `INSTRUCTIONS.md` methodology pattern.

This breadth of integration means OpenCode benefits from a growing ecosystem without building everything itself. The tradeoff: it's perpetually behind Claude Code in feature depth because integrators optimize for Claude Code first.

## Key Strengths

**Model flexibility without code changes.** Swapping from Claude to GPT-4o or a local Ollama model requires a config change, not a tool change. For teams with cost constraints, compliance requirements, or performance testing needs across models, this matters.

**Ecosystem compatibility.** The Agent Skills spec adoption means the entire cross-platform skill ecosystem (including ECC's 156 skills) works out of the box. A team can use the same skill library across Claude Code, OpenCode, Cursor, and Gemini CLI without maintaining separate configurations.

**Open source.** Claude Code is closed source. OpenCode is auditable, forkable, and self-hostable. For security-sensitive environments that cannot send code to Anthropic's servers, OpenCode with a local model via Ollama is a viable alternative.

**MCP implementation.** Full [Model Context Protocol](../concepts/model-context-protocol.md) support means the growing library of MCP tools (database connectors, search APIs, file systems) works without custom integration code.

## Critical Limitations

**Concrete failure mode: hook parity gap.** Claude Code gets 8+ hook event types with mature tooling (the ECC project ships Node.js hook scripts tested across 1,700+ cases). OpenCode gets 11 hook events but community tooling, tested edge cases, and documentation lag significantly. A hook that gracefully handles SIGINT in Claude Code (saving session state) may not have equivalent behavior tested or documented for OpenCode. Teams building automation on top of OpenCode's hook system are working with less battle-tested infrastructure.

**Unspoken infrastructure assumption: API key management.** OpenCode's model flexibility requires managing multiple API keys for multiple providers. There's no built-in secrets manager, rotation system, or audit trail. In production or team environments, this creates an operational burden that single-vendor tools avoid by centralizing on one API key and one billing relationship.

**Feature depth gap.** OpenCode gets functional coverage of skills/hooks/commands, but Claude Code-specific features (session compaction, advanced context management, native plugin marketplace) don't have direct equivalents. ECC's NanoClaw v2 orchestration engine, for instance, is built for Claude Code's session model and provides partial or no functionality on OpenCode.

## When NOT to Use OpenCode

**When you need the deepest Claude integration.** If you're building on top of Claude's extended thinking, fine-grained context management, or Anthropic's native plugin marketplace, Claude Code gives you a tighter integration surface. OpenCode's multi-model design means it can't optimize deeply for any single provider's capabilities.

**When your team is primarily non-technical.** OpenCode is a terminal tool. No GUI, no IDE integration (unlike Cursor), no point-and-click setup. If your team needs a coding agent with a polished onboarding experience, Cursor or Claude Code's web interface are better fits.

**When you need production-grade automation tooling.** ECC's 1,723 tests, CORAL's multi-agent orchestration, and Hipocampus's memory system all treat Claude Code as the primary target. OpenCode support exists but is maintained at lower priority. If you're building complex agent pipelines, you'll hit unsupported edge cases faster on OpenCode than on Claude Code.

**When you need official support.** OpenCode is community-maintained. There's no SLA, no enterprise support contract, no guaranteed response time for critical issues.

## Unresolved Questions

**Governance and maintenance velocity.** The documentation doesn't clarify who maintains OpenCode, what the decision-making process looks like for breaking changes, or how quickly security issues get patched. For an open-source tool handling code execution with broad file system access, this is a real operational risk.

**Cost attribution at scale.** Multi-model routing makes cost tracking harder. A session that uses Haiku for some steps and Opus for others distributes cost across providers. There's no documented native cost tracking or budget enforcement mechanism.

**Session persistence semantics.** CORAL's session resumption mechanism (using `--resume {session_id}`) works with Claude Code because Claude Code saves sessions to `.jsonl` files with known paths. OpenCode's session persistence model isn't as thoroughly documented in the wild. Whether long-running autonomous sessions (the 20+ hour research sessions described in the Agentic Researcher paper) are recoverable after crashes or interruptions on OpenCode is unclear.

**Conflict resolution for cross-platform skills.** When a skill package ships both `.claude/` and `.opencode/` configurations (as ECC does), and they diverge in behavior, there's no documented arbitration. A skill that fires a hook in Claude Code may silently not fire in OpenCode, with no error surfaced to the user.

## Alternatives and Selection Guidance

| Tool | Use when |
|---|---|
| **Claude Code** | You're primarily on Anthropic's stack, want the deepest ecosystem support, or need production-grade session management |
| **Cursor** | Your team needs a GUI, IDE integration, or a polished onboarding experience |
| **OpenAI Codex CLI** | You're already deep in OpenAI's ecosystem and want native GPT-4o integration |
| **OpenCode** | You need model flexibility, open-source auditability, or local model support via Ollama |
| **Gemini CLI** | You're working within Google's infrastructure or need Gemini-specific capabilities |

OpenCode makes the most sense for teams that genuinely need to switch between LLM providers (cost optimization, compliance, benchmarking) or that require open-source auditability. For everyone else, the shallower ecosystem tooling is a real cost that compounds over time.

## Related

- [Claude Code](../projects/claude-code.md)
- [Agent Skills](../concepts/agent-skills.md)
- [Model Context Protocol](../concepts/model-context-protocol.md)
- [Everything Claude Code](../projects/everything-claude-code.md)

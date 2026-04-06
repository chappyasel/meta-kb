---
entity_id: opencode
type: project
bucket: agent-systems
abstract: >-
  OpenCode is an open-source agentic coding tool compatible with the Agent
  Skills ecosystem, serving as a Claude Code alternative that shares the same
  SKILL.md plugin format and supports cross-harness skill deployment.
sources:
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
  - OpenAI Codex
  - Agent Skills
  - Cursor
  - Gemini
  - skill.md
  - OpenClaw
last_compiled: '2026-04-05T23:00:36.490Z'
---
# OpenCode

## What It Is

OpenCode is an open-source agentic coding tool that competes with Claude Code, Cursor, and Codex CLI. It runs autonomous coding sessions in the terminal, executes tools (file reads, edits, bash commands), and follows structured instruction files to complete programming tasks. Its primary differentiator is open-source availability and compatibility with the emerging Agent Skills standard, meaning skills, hooks, and configuration files authored for Claude Code can be adapted for OpenCode with minimal changes.

From the source material, OpenCode appears consistently as a supported target platform alongside Claude Code, Cursor, Codex, and Gemini CLI in cross-platform agent skill collections. It is not the primary platform in any of the reviewed projects, but its presence as a first-class integration target in three independent codebases suggests genuine adoption.

## Core Mechanism

OpenCode reads agent instructions from an `AGENTS.md` file at the project root (parallel to Claude Code's `CLAUDE.md` and Codex's `AGENTS.md`). Configuration lives in `.opencode/` at the project root, with the following structure observed in the wild:

```
.opencode/
  opencode.json        # Permissions and plugin configuration
  prompts/agents/      # 28+ agent prompt definitions
  commands/            # 30+ slash commands
  tools/               # Custom tools (security-audit, run-tests, etc.)
  plugins/             # Hook plugins
```

The `opencode.json` manifest maps permissions and hooks to OpenCode's native format, analogous to how `.claude/settings.json` works for Claude Code. Skills are auto-discovered from `~/.opencode/skills/` directories, with each `SKILL.md` file loaded according to the Agent Skills spec: metadata at startup, full instructions on activation, reference files on demand.

OpenCode supports 11 hook event types (compared to Claude Code's 8 core types and Cursor's 15), enabling pre/post tool use automations and session lifecycle events.

### Plugin and Skill Integration

The [Everything Claude Code](../projects/everything-claude-code.md) project maintains dedicated `.opencode/` integration with 28 agent prompts, 30+ commands, and 6 native custom tools. The [Hipocampus](../projects/hipocampus.md) memory system ships an OpenCode plugin alongside its Claude Code and OpenClaw integrations, using platform-specific skill files while sharing the same compaction tree architecture.

The [Obsidian-skills](../projects/obsidian-skills.md) repository documents OpenCode installation as: clone the full repo to `~/.opencode/skills/obsidian-skills/`, after which OpenCode auto-discovers all `SKILL.md` files. This differs from Claude Code's marketplace install but achieves the same result.

The [Agentic Researcher framework](../concepts/agentic-researcher.md) lists OpenCode alongside Claude Code, Codex CLI, and Gemini CLI as a compatible runtime for autonomous research sessions, suggesting its tool execution model is sufficiently mature for 20+ hour autonomous operation.

## Key Numbers

Specific GitHub star counts or benchmark numbers for OpenCode itself are not present in the source material. What the sources establish is its adoption as an integration target: at least three independent projects (Everything Claude Code, Hipocampus, Obsidian-skills) maintain dedicated OpenCode support. These are self-reported adoption signals, not independently validated metrics.

## Strengths

**Cross-platform skill compatibility.** OpenCode's adoption of the Agent Skills standard (SKILL.md format) means the growing library of community skills works without rewriting. Skills authored for Claude Code require only an adapter layer, not a full port.

**Open-source availability.** Unlike Claude Code (Anthropic-proprietary) or Cursor (commercial), OpenCode's open-source nature allows self-hosting, customization, and auditability. For organizations with strict data residency requirements, this matters.

**Active ecosystem integration.** Being a first-class target in large skill collections means users get mature, tested configurations rather than experimental ports.

**Custom tool support.** The `.opencode/tools/` directory enables native custom tools (run-tests, security-audit) that integrate directly with OpenCode's permission model, rather than relying solely on bash script wrappers.

## Critical Limitations

**Concrete failure mode:** OpenCode's hook coverage (11 event types) sits between Cursor (15) and Claude Code (8 core types). Skills authored against Claude Code's full hook surface may silently degrade when deployed to OpenCode -- hooks that expect `PreCompact` or `Notification` events may simply not fire. This creates a lowest-common-denominator problem for cross-harness skill authors who cannot test every platform combination.

**Unspoken infrastructure assumption:** OpenCode assumes local file system access and a terminal environment. It does not appear to have a hosted/cloud mode analogous to Claude Code's planned remote execution features. Organizations running fully containerized or remote development environments may find the local-first model constraining.

## When NOT to Use It

**If you depend on Claude's specific capabilities.** OpenCode abstracts the model layer, but if your workflows rely on Claude's specific instruction-following behavior, tool use patterns, or context window characteristics, OpenCode with a different underlying model will produce different results. The agent runtime is not interchangeable with the model.

**If you need the largest ecosystem.** Claude Code has the most skills, hooks, and community configuration in active development. OpenCode is a compatible target, not the primary development surface for most skill authors.

**If you need enterprise support.** There is no evidence of commercial support, SLA, or enterprise licensing. For teams that need vendor accountability, Claude Code or Cursor are better choices.

## Unresolved Questions

The source material does not address:

- **Governance and maintenance cadence.** Who maintains OpenCode, how actively, and what the release cycle looks like are not established.
- **Model backend flexibility.** Whether OpenCode supports multiple LLM backends (OpenAI, Anthropic, local models) or is tied to a specific provider is unclear from the available sources.
- **Cost at scale.** Since OpenCode is open-source, infrastructure costs fall on the operator. At scale (many concurrent agents, long sessions), this cost structure differs significantly from hosted alternatives.
- **Session persistence and resumption.** Claude Code's `--resume` flag enables session continuity across interruptions. Whether OpenCode has equivalent functionality is not documented in the sources. CORAL's multi-agent system notes session resumption via saved session IDs for Claude Code and Codex, but OpenCode's equivalent is not specified.
- **Conflict resolution between skills.** No source addresses how OpenCode handles skill conflicts when multiple activated skills provide contradictory guidance.

## Alternatives

| Alternative | When to Choose It |
|-------------|-------------------|
| [Claude Code](../projects/claude-code.md) | Maximum skill ecosystem, tightest Anthropic model integration, official support |
| Cursor | IDE-first workflow, strong inline completion, team features, 15 hook event types |
| Codex CLI | OpenAI model preference, simpler configuration surface, AGENTS.md format |
| Gemini CLI | Google ecosystem integration, GEMINI.md format, Gemini model access |

Choose OpenCode when open-source licensing is a hard requirement, when you want to run the agent infrastructure on your own hardware, or when you are building cross-platform skills and need a compatible open target for testing. Avoid it if your team's skills are invested in a specific IDE or if you need guaranteed commercial support.


## Related

- [Claude Code](../projects/claude-code.md) — competes_with (0.6)
- [OpenAI Codex](../projects/codex.md) — alternative_to (0.6)
- [Agent Skills](../concepts/agent-skills.md) — implements (0.6)
- [Cursor](../projects/cursor.md) — competes_with (0.6)
- [Gemini](../projects/gemini.md) — part_of (0.4)
- [skill.md](../concepts/skill-md.md) — implements (0.6)
- [OpenClaw](../projects/openclaw.md) — alternative_to (0.5)

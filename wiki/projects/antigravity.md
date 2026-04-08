---
entity_id: antigravity
type: project
bucket: agent-architecture
abstract: >-
  Antigravity is a Google AI coding IDE (similar to Cursor) with a built-in
  browser, Gemini integration, ADK testing support, and native agent skills
  discovery via `.agents/` directory conventions.
sources:
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/affaan-m-everything-claude-code.md
  - repos/alirezarezvani-claude-skills.md
related:
  - claude-code
  - codex
  - agent-skills
  - cursor
last_compiled: '2026-04-08T23:21:56.946Z'
---
# Antigravity

## What It Is

Antigravity is an AI-powered coding IDE built around Gemini, positioned as a Google-ecosystem alternative to Cursor and Windsurf. Its distinguishing feature is a built-in browser that lets the Antigravity agent test running web applications directly inside the IDE, rather than requiring external browser tooling. It supports [Agent Skills](../concepts/agent-skills.md) natively, integrates with the [Gemini CLI](../projects/gemini-cli.md), and provides tooling for developing and testing [Google ADK](https://google.github.io/adk-docs/) agents locally.

The project appears to target developers working within the Google Cloud / Firebase / ADK ecosystem who want an IDE that can scaffold, run, and validate agent workflows without leaving the development environment.

## Core Mechanism

Antigravity functions as a coding agent harness around Gemini. Key behaviors documented in the wild:

**Built-in browser + computer use model**: The IDE can spin up local servers (`adk web`) and use a computer use model to interact with them, enabling end-to-end agent testing without external tooling. This is the feature practitioners cite most when choosing it over alternatives.

**Agent skills directory**: Antigravity discovers skills from an `.agents/` directory, aligned with the emerging open standard from [agentskills.io](https://agentskills.io). Skills installed by the [Gemini CLI](../projects/gemini-cli.md) land in `.gemini/` by default; to make them visible to Antigravity, the installing agent must rename the directory to `.agents/`. The Gemini CLI discovers skills from `.gemini/`, Antigravity from `.agents/`, and neither auto-syncs.

**Gemini CLI interoperability**: Because both Antigravity and Gemini CLI use the same skill format (standard YAML frontmatter + markdown), skills installed by one tool work in the other once the directory issue is resolved. Antigravity can invoke `gemini skills list` and `gemini skills install` as shell commands through its agent.

**Cross-platform skill target**: Skill conversion scripts (e.g., in [claude-skills](https://github.com/alirezarezvani/claude-skills)) explicitly target Antigravity, installing to `~/.gemini/antigravity/skills/` via `./scripts/install.sh --tool antigravity`. This places Antigravity in the same tier as Cursor, Windsurf, and OpenCode as a supported conversion target.

## Positioning in the Ecosystem

Across the skill repositories surveyed, Antigravity appears in two distinct roles:

1. **Platform target for skill distribution**: Both the `everything-claude-code` collection and `claude-skills` list Antigravity alongside Claude Code, [OpenAI Codex](../projects/codex.md), [Cursor](../projects/cursor.md), Windsurf, and OpenCode as a supported agent platform. This suggests sufficient ecosystem adoption to warrant dedicated install scripts.

2. **Development environment for ADK agents**: Practitioners building Google ADK agents use Antigravity specifically for the browser-based test loop — scaffold with the agent, run `adk web`, have the built-in browser validate behavior, iterate. [Claude Code](../projects/claude-code.md) and Cursor lack this integrated browser testing capability.

## Key Numbers

Star counts, user numbers, and benchmark results for Antigravity itself are not available in the source material. All usage evidence is qualitative: practitioner accounts in articles describing it as a preferred environment for ADK + Firebase development, and its presence as a named target in major skill distribution systems.

## Strengths

**Integrated browser for agent testing**: The built-in browser with computer use model is the clearest differentiation. Testing an ADK web agent requires spinning up a server and validating UI behavior; doing this without leaving the IDE removes significant friction.

**Google ecosystem alignment**: ADK, Firebase skills, Gemini CLI, Cloud Run, A2A protocol — Antigravity sits naturally in this stack. Developers already using Google Cloud tools get tighter integration than they would with Cursor or Claude Code.

**Standard skill format compatibility**: Because Antigravity uses the same `.agents/` skill convention being promoted by agentskills.io, skills built for other platforms transfer with minimal adaptation.

## Critical Limitations

**Directory fragmentation with Gemini CLI**: The `.gemini/` vs `.agents/` split is a concrete friction point. The Gemini CLI installs to `.gemini/`, Antigravity reads from `.agents/`. Agents or scripts must explicitly handle this rename, and it's easy to have skills installed but invisible to one tool or the other. This is not a design flaw unique to Antigravity, but it's unresolved as of the documented period.

**Infrastructure assumption**: Antigravity assumes you are building for or deploying to Google infrastructure. The ADK testing workflow, Cloud Run deployment targets, and Firebase skill sources all presuppose a Google Cloud context. Teams on AWS or Azure get less value from the ecosystem integration.

## When NOT to Use It

Skip Antigravity if your stack is not Google-centric. The IDE's integration advantages (ADK testing, Firebase skills, Gemini CLI interop) are negligible outside that ecosystem. For general-purpose agentic coding, [Claude Code](../projects/claude-code.md) has broader skill library support, larger community tooling (see [everything-claude-code](../projects/antigravity.md)), and more mature [Agent Harness](../concepts/agent-harness.md) infrastructure.

Also avoid it if you need a large curated skill library out of the box. The [claude-skills](https://github.com/alirezarezvani/claude-skills) project supports Antigravity as a conversion target, but its 248 skills are primarily developed and tested against Claude Code; Antigravity-specific validation is not documented.

## Unresolved Questions

**Governance and roadmap**: No public information on who maintains Antigravity, its release cadence, or how breaking changes are communicated. It is referenced as a shipping product but without a clear org, repo, or versioning scheme in available sources.

**OAuth and remote agent support**: One practitioner explicitly noted waiting for a Gemini CLI pull request to enable authenticated Cloud Run remote subagents from within Antigravity. Until that merges, certain A2A patterns require local workarounds.

**Skill registry standardization**: The `.agents/` vs `.gemini/` split reflects a broader unsolved problem: no standardized registry or installation protocol exists across AI IDEs. Antigravity is participating in the agentskills.io convention, but adoption is fragmented.

**Cost structure**: API costs when running Gemini through Antigravity are not documented in available sources. Whether the IDE bundles API access or requires separate Google Cloud credentials is unclear.

## Alternatives

| Situation | Use instead |
|---|---|
| Multi-LLM, non-Google stack | [Cursor](../projects/cursor.md) or [Windsurf](../projects/windsurf.md) |
| Claude-first development with large skill library | [Claude Code](../projects/claude-code.md) |
| Gemini CLI workflows without IDE overhead | [Gemini CLI](../projects/gemini-cli.md) directly |
| OpenAI ecosystem | [OpenAI Codex](../projects/codex.md) |

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md): The modular capability format Antigravity natively supports
- [Context Engineering](../concepts/context-engineering.md): Progressive disclosure pattern used by skill loading
- [Human-in-the-Loop](../concepts/human-in-the-loop.md): The confirmation gate pattern recommended for skill installation agents built in Antigravity
- [Multi-Agent Systems](../concepts/multi-agent-systems.md): ADK agent orchestration patterns Antigravity is designed to support

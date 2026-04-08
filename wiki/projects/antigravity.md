---
entity_id: antigravity
type: project
bucket: agent-architecture
abstract: >-
  Antigravity is a Google-developed AI coding IDE built on Gemini models,
  distinguished by its built-in browser enabling agents to test web UIs during
  development without external tooling.
sources:
  - repos/alirezarezvani-claude-skills.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/affaan-m-everything-claude-code.md
related:
  - claude-code
  - cursor
  - codex
  - agent-skills
  - context-engineering
  - codex
last_compiled: '2026-04-08T03:04:44.796Z'
---
# Antigravity

## What It Is

Antigravity is an AI coding IDE from Google, built on Gemini models, designed for agentic software development workflows. Its distinguishing feature is a built-in browser that lets the agent interact with and test web applications directly during a session. This closes a loop that other coding agents leave open: rather than generating code and asking the user to verify it in a separate browser, Antigravity's agent can spin up a local server and visually inspect the result.

The tool appears in community usage primarily as a scaffolding and prototyping environment, particularly for Google Cloud and Firebase projects. It supports [Agent Skills](../concepts/agent-skills.md) via the `.agents/` directory format, which it shares with the Gemini CLI (using `.gemini/` internally, with a rename step required for cross-tool compatibility).

## Core Mechanism

Documentation on Antigravity's internal architecture is sparse. From observable behavior in community write-ups:

- The agent runs on Gemini models (referenced as `gemini-3-flash-preview` in adjacent ADK code)
- It detects skills in the `.agents/` directory through progressive disclosure: skill metadata (name, description) loads into context immediately; full skill content loads only on activation
- The built-in browser is used for testing locally running services, including `adk web` (Google Agent Development Kit's local test UI) without requiring a separate browser
- It supports file read/edit/execute cycles typical of coding agents, and can run CLI commands directly (e.g., `gemini skills install`, `adk web`)

From the Google Cloud Community write-up, the typical Antigravity workflow for agent projects is: scaffold via prompt → agent installs packages and verifies dependencies → agent uses built-in browser to test the running service → agent corrects logic errors it discovers during testing. The author notes the agent "even corrected the mistake in the agent instructions logic" during a browser-based test.

Skill installation paths matter: skills installed by Gemini CLI land in `.gemini/`, but Antigravity reads from `.agents/`. Projects that want both tools to share the same skill set need an explicit directory rename or symlink step.

## Positioning in the Ecosystem

Community sources treat Antigravity as one of several interchangeable coding agent platforms for running agent skills. The alirezarezvani/claude-skills repository converts its 156 skills to Antigravity format via `./scripts/install.sh --tool antigravity`, placing output at `~/.gemini/antigravity/skills/`. The Everything Claude Code project lists Antigravity alongside Claude Code, Cursor, Codex, OpenCode, and Gemini as supported harnesses.

The Karpathy autoresearch pattern (read a file, change one thing, test against a scoring rubric, keep or discard) is described as working with Antigravity alongside Claude Code, Cursor, Windsurf, and Codex. The shared requirement is: can read files, edit files, use git. Antigravity meets this bar.

Google Cloud Community author Esther Lloyd chose Antigravity over Gemini CLI specifically for the built-in browser, which made testing an ADK agent's local web server frictionless. This is the clearest functional differentiator documented in available sources.

## Key Numbers

Star counts and download metrics for Antigravity itself are not available in source material. It is referenced as a tool rather than documented as an open-source repository. Claims about its capabilities come from practitioner write-ups rather than benchmarks.

## Strengths

**Built-in browser for web testing.** No context switch to verify a running service. The agent can observe visual output and act on it within the same session. For web app scaffolding and ADK agent testing, this is a genuine workflow improvement over CLI-only agents.

**Google Cloud / Firebase alignment.** For projects targeting GCP deployment, Firebase, or ADK, Antigravity's proximity to the Google toolchain reduces friction. ADK agents scaffolded in Antigravity can target Cloud Run deployment and A2A (Agent-to-Agent) protocols without adapter layers.

**Gemini CLI skill compatibility.** Skills follow the same format as Gemini CLI, meaning skill libraries built for one work in the other with minor path adjustments.

## Critical Limitations

**Sparse public documentation.** Unlike Claude Code (which has detailed extension points, hooks, and a plugin marketplace) or Cursor (extensive community documentation), Antigravity's architecture, pricing, and API surface are not publicly documented in available sources. Practitioners describe what they observe rather than what the system guarantees.

**Skill path friction.** Gemini CLI installs skills to `.gemini/`; Antigravity reads from `.agents/`. This mismatch requires explicit handling in any workflow that uses both tools. It is a small friction point but signals that cross-tool skill sharing is not yet a solved problem even within Google's own ecosystem.

**Infrastructure assumption: Google account and GCP.** Antigravity's positioning around Firebase and Cloud Run implies a GCP-centric workflow. Teams not on GCP get less value from the tight integration, and the A2A remote subagent deployment path (via Cloud Run with OAuth) was not functional at time of writing pending a Gemini CLI pull request.

## When NOT to Use It

If your project is not on GCP or Firebase, the Google Cloud alignment provides no benefit and you are better served by [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), or [OpenCode](../projects/opencode.md) depending on your model and context preferences.

If you need documented extension points, plugin governance, or hook systems for [agent harness](../concepts/agent-harness.md) customization, Antigravity's documentation gaps are a real problem. Claude Code's hooks system, plugin marketplace, and community documentation give teams far more to build on.

If you are running the Karpathy autoresearch loop or another automated overnight optimization cycle, any agent that reads files, edits files, and uses git will do the job. Antigravity's browser is irrelevant for headless optimization runs.

## Unresolved Questions

**Pricing model.** Not documented in available sources. It is unclear whether Antigravity is a free tool, a paid product, or bundled with a GCP service tier.

**Governance and update cadence.** No public changelog, versioning scheme, or release notes appear in the sources. Practitioners describe behavior as of early 2026; whether that behavior is stable is unknown.

**Skill registry integration.** The Google Cloud Community article notes that Firebase and Google Cloud agent skills are available from GitHub repositories but that a standardized registry does not yet exist. The author hardcoded approved GitHub orgs as a workaround. How Antigravity will integrate with any emerging registry (e.g., agentskills.io, Vercel's skills.io) is unresolved.

**A2A remote subagent support.** Deploying an ADK agent built in Antigravity as an authenticated Cloud Run A2A subagent requires a Gemini CLI OAuth feature that was pending a pull request at time of writing. The intended workflow exists; the infrastructure to close it does not yet.

## Alternatives

**[Claude Code](../projects/claude-code.md)** — Use when you need documented extension points, a plugin ecosystem, hooks for lifecycle automation, or cross-platform skill sharing. Better documented and more actively maintained community infrastructure.

**[Cursor](../projects/cursor.md)** — Use when IDE integration with an existing editor is the priority. Cursor's `.cursor/` rules and hooks integrate with VS Code's extension ecosystem.

**[Gemini CLI](../projects/gemini-cli.md)** — Use when you want Gemini model access in a terminal without a full IDE. Shares Antigravity's skill format and model access; lacks the built-in browser.

**[OpenCode](../projects/opencode.md)** — Use for a terminal-native agentic coding workflow with explicit multi-platform skill support.

**[OpenAI Codex](../projects/codex.md)** — Use when OpenAI models are preferred and you need `AGENTS.md`-style configuration without hooks.

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md) — the skill packaging format Antigravity reads
- [Context Engineering](../concepts/context-engineering.md) — progressive disclosure of skills is a context engineering pattern
- [Context Management](../concepts/context-management.md) — skill metadata-only loading reduces context bloat
- [Human-in-the-Loop](../concepts/human-in-the-loop.md) — Antigravity's agent testing workflow includes human confirmation before installing skills
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — Antigravity is used to build and test ADK agents that participate in A2A multi-agent architectures

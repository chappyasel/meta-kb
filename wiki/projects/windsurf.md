---
entity_id: windsurf
type: project
bucket: agent-systems
abstract: >-
  Windsurf is a coding IDE built by Codeium that integrates agentic AI (the
  "Cascade" system) directly into the development environment, targeting full
  autonomous software development workflows rather than copilot-style
  autocomplete.
sources:
  - repos/supermemoryai-supermemory.md
  - repos/alirezarezvani-claude-skills.md
  - repos/caviraoss-openmemory.md
  - repos/jmilinovich-goal-md.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/tirth8205-code-review-graph.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/tirth8205-code-review-graph.md
related:
  - Claude Code
  - OpenAI
  - Claude
  - Andrej Karpathy
  - Cursor
  - Model Context Protocol
  - AutoResearch
  - OpenAI Codex
  - Google Gemini
  - GitHub Copilot
last_compiled: '2026-04-05T20:24:04.058Z'
---
# Windsurf

## What It Does

Windsurf is an AI-first IDE from Codeium that embeds an agentic layer called Cascade into the development environment. Where tools like GitHub Copilot act as autocomplete assistants, Windsurf lets an AI agent read, write, and execute code across a full project with minimal step-by-step instruction. The key bet: most developers want to describe an outcome and have the environment handle implementation details, not suggest completions line by line.

Codeium, founded in 2021, built Windsurf after years of shipping Copilot-style completions through its standalone extension. The IDE is positioned as the successor to that model, betting that the agent-native approach will displace the assistant-native one.

## Core Mechanism: Cascade

Cascade is the agentic engine inside Windsurf. It operates in two modes:

**Flow (autonomous):** The agent reads context across the entire codebase, decides what files to touch, writes or modifies them, runs terminal commands (including tests and build steps), reads output, and iterates. The developer describes an intent; Cascade executes a multi-step plan.

**Chat (collaborative):** Closer to conventional AI chat with awareness of the open file and surrounding context. Lower autonomy, higher developer control.

Cascade has persistent context within a session: it tracks what it has already done, which commands it ran, and what their output was. This matters for multi-step tasks where a naive agent would lose its place.

The underlying models are swappable. Windsurf supports Claude (Anthropic), GPT-4o (OpenAI), and Gemini (Google) as the base model for Cascade. Model choice affects reasoning quality but not the agent loop architecture itself.

Windsurf also supports [Model Context Protocol (MCP)](../concepts/model-context-protocol.md), meaning Cascade can consume external tool servers. This connects it to the broader agent tooling ecosystem: a Windsurf user can attach an MCP server for database access, browser control, or external APIs, and Cascade treats those tools as part of its action space.

## Integration With the Broader Ecosystem

Windsurf explicitly supports the autoresearch-adjacent workflow pattern. Projects like [goal-md](../projects/goal-md.md) list Windsurf alongside Claude Code and Cursor as compatible agents for autonomous optimization loops. The GOAL.md template can be dropped into a repo and Windsurf's Cascade agent will pick up the fitness function, run the improvement loop, and iterate. [Supermemory](../projects/supermemory.md)'s MCP server also lists Windsurf as a supported client, meaning persistent memory across Windsurf sessions is available through the same `npx install-mcp` flow used for Cursor and Claude Code.

[Code-review-graph](../projects/code-review-graph.md) includes Windsurf in its auto-install detection (`code-review-graph install`) and provides blast-radius analysis context via MCP, reducing the token cost of agentic code review workflows in Windsurf.

This positions Windsurf as a general-purpose agent runtime: third-party tool authors target it as a first-class client, not an afterthought.

## Key Numbers

- Codeium claimed over 800,000 developers using its products as of 2024 (self-reported, not independently verified by public audit).
- Windsurf reached a reported $40M ARR by early 2025, according to Codeium's fundraising materials (self-reported).
- In May 2025, OpenAI acquired Codeium for a reported $3 billion. Post-acquisition, Windsurf's model support and roadmap became subject to OpenAI's product strategy.

These figures come from press releases and fundraising disclosures. No independent benchmark organization has audited Windsurf's user or revenue claims.

## Strengths

**Whole-project awareness:** Cascade reads across the full codebase by default. For refactors, migrations, or adding a feature that touches multiple files, this beats a per-file autocomplete tool.

**Execution feedback loop:** The agent runs tests and reads terminal output, so it can catch its own errors within a session rather than handing back broken code for the developer to debug.

**Model flexibility:** Swapping between Claude, GPT-4o, and Gemini without leaving the IDE matters practically. Different models perform better on different task types (reasoning, code generation, documentation).

**MCP ecosystem participation:** Full MCP support means Windsurf benefits from the growing library of tool servers without requiring Codeium to build each integration.

**Broad third-party targeting:** Tool projects (Supermemory, code-review-graph, goal-md) explicitly support Windsurf as a first-class client, which means the ecosystem assumes it exists.

## Critical Limitations

**Concrete failure mode — context drift on long sessions:** Cascade tracks session context, but very long autonomous runs accumulate state that can cause the agent to make contradictory decisions later in the session. A Cascade run that refactors a module in step 3 may, by step 15, forget the refactor happened and re-introduce the old pattern in a different file. There is no native mechanism to checkpoint and validate consistency across steps. Developers running long autonomous tasks report needing to manually break work into shorter sessions.

**Unspoken infrastructure assumption — local compute for model execution doesn't apply; cloud API cost does:** Windsurf routes model calls through Codeium's backend (or the user's own API keys, depending on plan). Heavy Cascade usage on a paid plan consumes fast requests quickly. The free tier throttles to slow requests after a limit. Teams running Cascade autonomously overnight face non-trivial API cost or rate-limiting, which is not prominently disclosed in the product's marketing.

## When NOT to Use Windsurf

**Airgapped environments:** Windsurf requires network access for model inference. Code that cannot leave a machine or organization perimeter is incompatible.

**Teams standardizing on VS Code extensions:** Windsurf is a full IDE fork of VS Code. Teams with deep VS Code extension toolchains (specific debuggers, org-managed settings sync, enterprise extensions) may find migration friction exceeds benefit.

**Latency-sensitive pair programming:** Cascade's autonomous mode introduces latency from multi-step planning. For rapid back-and-forth iteration where a developer wants instant suggestions, GitHub Copilot or the standard Codeium extension remains faster in practice.

**Post-acquisition strategic uncertainty:** OpenAI acquired Codeium in May 2025. Organizations evaluating Windsurf for multi-year toolchain commitments face genuine uncertainty about pricing, model availability (will Anthropic models remain available?), and roadmap continuity under OpenAI's ownership. This is a real procurement risk, not a theoretical one.

## Unresolved Questions

**Model availability under OpenAI ownership:** Windsurf currently supports Claude and Gemini. Whether OpenAI will restrict this to OpenAI models only, and on what timeline, is not publicly disclosed. The answer has significant implications for teams that prefer Claude's code reasoning.

**Cost at scale:** The pricing model for enterprise teams running Cascade autonomously (not just interactively) is not transparent. "Fast requests" as a metering unit maps poorly to autonomous agent loop behavior, where a single Cascade run might consume dozens of requests.

**Conflict resolution in agentic edits:** When Cascade modifies a file that another developer has also changed, the conflict resolution behavior is not documented. Git handles the merge, but Cascade's awareness of concurrent changes during a long run is unclear.

**Data retention:** What happens to the codebase content sent to Codeium's (now OpenAI's) backend for model inference is governed by enterprise agreements, but the default data handling policy for free and pro users is not prominently surfaced.

## Alternatives and Selection Guidance

**[Cursor](../projects/cursor.md):** Closest direct competitor. Also a VS Code fork with an agentic mode (Composer). Use Cursor when you want a comparable feature set with an independent company behind it (no hyperscaler acquisition as of mid-2025). Cursor's Composer and Windsurf's Cascade have near-feature parity; team preference and pricing tend to drive the choice.

**[Claude Code](../projects/claude-code.md):** Anthropic's CLI-based agent. No GUI. Use Claude Code when you want maximum model capability from Claude in a scriptable, pipeline-friendly form, or when you are running automated optimization loops (autoresearch-style) where a GUI IDE adds no value.

**GitHub Copilot:** Use Copilot when the organization is already deep in GitHub Enterprise and wants assistant-mode (not agent-mode) help with the lowest adoption friction.

**[OpenAI Codex](../projects/openai-codex.md):** OpenAI's cloud-based autonomous coding agent. After the Codeium acquisition, Windsurf and Codex may converge in functionality. Use Codex when running sandboxed parallel agents without a local IDE is the priority.

**VS Code + Codeium extension:** Use the standalone extension when you need Codeium's autocomplete capabilities without the full IDE switch. Lower disruption, lower capability ceiling.

## Related Concepts and Projects

- [Model Context Protocol](../concepts/model-context-protocol.md) — Windsurf's tool integration layer
- [Cursor](../projects/cursor.md) — Primary direct competitor
- [Claude Code](../projects/claude-code.md) — CLI-based alternative for pipeline use
- [Supermemory](../projects/supermemory.md) — Persistent memory layer available via MCP
- [code-review-graph](../projects/code-review-graph.md) — Structural codebase analysis for token-efficient context
- [goal-md](../projects/goal-md.md) — Autonomous optimization loop pattern compatible with Windsurf's Cascade

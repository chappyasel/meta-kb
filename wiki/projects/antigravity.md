---
entity_id: antigravity
type: project
bucket: agent-systems
abstract: >-
  Antigravity is a Gemini-based AI coding IDE/agent with built-in browser and
  computer-use model, competing with Claude Code and Cursor; its key
  differentiator is native Gemini CLI integration and A2A remote subagent
  support.
sources:
  - repos/memorilabs-memori.md
  - repos/alirezarezvani-claude-skills.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - >-
    articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md
  - deep/repos/affaan-m-everything-claude-code.md
related:
  - claude-code
  - cursor
  - codex
  - gemini
  - openclaw
  - opencode
  - agent-skills
last_compiled: '2026-04-07T12:00:37.403Z'
---
# Antigravity

## What It Is

Antigravity is an AI coding agent and IDE that runs on Gemini, positioned as a direct competitor to [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), [OpenAI Codex](../projects/codex.md), and [OpenCode](../projects/opencode.md). Its distinguishing features are a built-in browser, a computer-use model for automated UI testing, and native integration with the Gemini CLI ecosystem. Practitioners mention it alongside Claude Code and Codex as one of the tools where multi-platform skill libraries install without conversion.

The project appears in the agent ecosystem primarily through secondary evidence: skill library authors explicitly support Antigravity as an install target, and at least one practitioner wrote a detailed build log using Antigravity as their IDE of choice for scaffolding an ADK (Agent Development Kit) agent.

## Core Mechanism

### Gemini CLI Integration

Antigravity connects to the Gemini CLI natively. Skills installed via `gemini skills install` into the `.gemini` directory are auto-detected by the Antigravity agent. This means any skill compatible with Gemini CLI is compatible with Antigravity without conversion. The practitioner-reported workflow installs skills via:

```bash
gemini skills install https://github.com/firebase/agent-skills.git \
  --path skills/firebase-auth-basics --consent --scope workspace
```

Antigravity then discovers the skill through progressive disclosure: the agent loads only the skill's metadata (name and description from the YAML frontmatter) until the skill is contextually relevant, then pulls the full instructions into context. [Source](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)

### Built-in Browser and Computer Use

The primary reported advantage over competitors is the built-in browser paired with a computer-use model. During ADK agent development, the practitioner used `adk web` with Antigravity's computer-use model to test agent behavior without leaving the IDE. The agent can spin up local development servers, verify outputs, and correct errors in the agent instructions autonomously. This makes it useful for testing web-based agent interfaces without context-switching to a separate browser. [Source](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)

### Agent Skills Support

Antigravity reads from the `.agents` directory, which aligns with the emerging open standard from [agentskills.io](https://agentskills.io). The Gemini CLI installs skills into `.gemini` by default; installing into `.agents` instead makes the skills discoverable by both Gemini CLI and Antigravity. This cross-tool discoverability matters when running multiple agents against the same workspace. [Source](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)

Multi-platform skill libraries explicitly target Antigravity. The `alirezarezvani/claude-skills` library (248 skills, 9,216 GitHub stars) includes Antigravity as one of 11 supported tools, installing via `./scripts/install.sh --tool antigravity` into `~/.gemini/antigravity/skills/`. The `everything-claude-code` library (136,000+ GitHub stars) similarly lists Antigravity as a supported harness alongside Claude Code, Codex, Cursor, and Gemini. [Source](../raw/repos/alirezarezvani-claude-skills.md) [Source](../raw/deep/repos/affaan-m-everything-claude-code.md)

### MCP and Memory Integration

Antigravity is listed as an MCP client alongside Claude Code, Cursor, Codex, and Warp. Memory systems like Memori can connect to Antigravity through the standard MCP transport, giving the agent persistent memory across sessions without SDK integration. [Source](../raw/repos/memorilabs-memori.md)

### Self-Improvement Loop Compatibility

Antigravity is cited as a compatible platform for the Karpathy Loop, where a coding agent runs automated improvement cycles on prompts or skill files overnight. Any coding agent that can read files, edit files, and use git suffices for this pattern. Antigravity qualifies. [Source](../raw/articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md)

## Key Differentiators vs Competitors

The practitioner who wrote the detailed build log explicitly chose Antigravity over "just using the Gemini CLI mostly because of the built-in browser." This is the most concrete stated differentiation:

- **vs Claude Code**: Claude Code lacks a built-in browser; testing web agents requires external tools. Antigravity can invoke `adk web` and interact with the browser natively.
- **vs Cursor**: Cursor is a VS Code fork with strong editor integration; Antigravity appears to prioritize agent autonomy over editor features.
- **vs Codex**: Codex is CLI-based; Antigravity provides an IDE wrapper with visual feedback.
- **vs Gemini CLI directly**: Antigravity adds the IDE layer (browser, visual agent testing) on top of the same Gemini CLI backend.

The Gemini / Google Cloud ecosystem alignment is significant. Antigravity integrates with ADK agents, Cloud Run A2A deployments, and Gemini Enterprise — a stack that Claude Code or Cursor cannot access natively.

## Strengths

**Ecosystem fit for Gemini/GCP stacks.** Teams building with Firebase, ADK, Google Cloud, and Gemini have a native toolchain. Testing ADK agents, installing Firebase skills, and deploying to Cloud Run all work within the same tool.

**Progressive disclosure of [agent skills](../concepts/agent-skills.md).** The `.agents` directory standard and metadata-first loading keeps context windows clean, loading full skill instructions only when relevant. This is architecturally sound for large skill libraries.

**Multi-platform skill compatibility.** Because Antigravity follows the emerging `.agents` standard, skills from major open-source libraries (everything-claude-code, claude-skills) install without format conversion.

## Critical Limitations

**Concrete failure mode — folder naming inconsistency.** The Gemini CLI installs skills into `.gemini/` by default. Antigravity discovers skills from `.agents/`. These are different directories. Without explicitly remapping the install target, skills installed via `gemini skills install` are invisible to Antigravity. The practitioner discovered this during testing and had to tweak the ADK logic to write to `.agents` instead. This is a friction point that will catch every new user. [Source](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)

**Unspoken infrastructure assumption — Gemini API dependency.** Antigravity runs on Gemini. Any rate limits, pricing changes, or capability gaps in the Gemini API directly affect Antigravity. Teams with Anthropic or OpenAI commitments, or those in regions where Gemini has limited availability, face a hard constraint that no amount of skill configuration resolves.

## When NOT to Use It

**Avoid Antigravity when:** your team's primary LLM commitments are to Anthropic or OpenAI, when your codebase requires deep IDE integration (debuggers, language servers, refactoring tools) that a VS Code-based tool like Cursor provides, or when you need the largest community-contributed skill library (the [everything-claude-code](../projects/openclaw.md) ecosystem centers on Claude Code and has 136K stars vs Antigravity's smaller footprint).

**Avoid for teams not in the GCP ecosystem.** The Gemini/Firebase/ADK integration is Antigravity's main structural advantage. Without that stack, there is no clear reason to choose it over Claude Code or Cursor.

## Unresolved Questions

Several things the available documentation does not address:

- **Pricing model.** No pricing information appears in any source. Whether Antigravity charges separately from Gemini API costs, or is bundled with Gemini Enterprise, is unclear.
- **Remote deployment.** The practitioner noted that deploying Antigravity-compatible agents to Cloud Run with A2A authentication was blocked pending a Gemini CLI pull request (`gemini-cli/pull/21496`) for OAuth support. This is an open gap as of early 2026.
- **Governance and ownership.** Antigravity does not appear as a first-party Google product in the available sources. Whether it is a Google product, an independent tool, or a community project is not established by the available evidence.
- **Star count / adoption metrics.** No GitHub stars, download counts, or usage figures appear for Antigravity directly. All popularity signals come from skill libraries that list it as a supported platform.

## Alternatives with Selection Guidance

| Tool | Use when |
|------|----------|
| [Claude Code](../projects/claude-code.md) | You want the largest skill library ecosystem, strongest agentic coding benchmarks, and Anthropic model access |
| [Cursor](../projects/cursor.md) | You need deep VS Code editor integration, language server features, and a large existing user base |
| [OpenAI Codex](../projects/codex.md) | You need GPT-4-class models with strong code generation in a CLI or API context |
| [OpenCode](../projects/opencode.md) | You want an open-source, model-agnostic terminal coding agent |
| **Antigravity** | You are building on the GCP/Firebase/ADK stack and need native Gemini CLI integration with browser-based agent testing |

## Related Concepts

- [Agent Skills](../concepts/agent-skills.md) — the skill packaging format Antigravity natively supports
- [Progressive Disclosure](../concepts/progressive-disclosure.md) — the context-loading strategy used by the `.agents` directory standard
- [Model Context Protocol](../concepts/mcp.md) — how Antigravity connects to external memory and tool systems
- [Karpathy Loop](../concepts/karpathy-loop.md) — automated self-improvement pattern that Antigravity supports as a compatible coding agent

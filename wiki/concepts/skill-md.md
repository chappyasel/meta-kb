---
entity_id: skill-md
type: concept
bucket: agent-systems
sources:
  - repos/alirezarezvani-claude-skills.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/yusufkaraaslan-skill-seekers.md
  - repos/affaan-m-everything-claude-code.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/anthropics-skills.md
  - deep/repos/martian-engineering-lossless-claw.md
  - deep/repos/garrytan-gstack.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/memento-teams-memento-skills.md
related:
  - Claude Code
last_compiled: '2026-04-05T05:24:16.809Z'
---
# SKILL.md

## What It Is

SKILL.md is a markdown-based convention for packaging agent capabilities as portable text files. An agent loads a SKILL.md file into context the same way it reads documentation: the file describes what to do, when to do it, and how to do it. No compilation, no binary dependencies, no retraining. The skill travels as a ZIP archive containing SKILL.md plus reference files, and the agent reads it on demand.

The convention emerged from Claude Code's memory system and has since been adopted or adapted by projects building on top of it. A skill file typically contains a YAML frontmatter block (name, description, trigger conditions, version), followed by sections for procedures, examples, quick reference, and navigation guidance pointing at companion reference files.

## Why It Matters

Pre-SKILL.md, extending an agent meant either fine-tuning (expensive, slow, brittle) or stuffing instructions into a system prompt (burns context, non-composable). Skills solve both problems by externalizing procedural knowledge into files the agent retrieves selectively. The agent loads only what it needs for the current task, preserving context budget for the actual work.

This is the implementation of what researchers call "progressive disclosure" or "progressive context loading": the agent starts with a compact router that tells it which skills exist and when to invoke them, then loads the relevant skill's full content when needed. A 500-line Django patterns skill sits dormant until the agent is working on a Django project.

The [Xu & Yan survey (2026)](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) formalizes this as the SKILL.md specification and identifies it as a core mechanism for "dynamic capability extension without retraining."

## How It Works

### File Structure

A minimal skill:

```markdown
---
name: tdd-workflow
description: Test-driven development with 80%+ coverage
version: "1.0"
trigger: When writing new functions or classes
---

# TDD Workflow

1. Define interfaces first
2. Write failing tests (RED)
3. Implement minimal code (GREEN)  
4. Refactor (IMPROVE)
5. Verify 80%+ coverage
```

A production skill from [everything-claude-code](../../raw/repos/affaan-m-everything-claude-code.md) ships with separate companion files: a SKILL.md for procedures plus reference files organized by topic (patterns, examples, configs, architecture). The SKILL.md itself acts as a router pointing the agent at the right reference file for the current subtask.

### Loading Mechanism

Claude Code stores skills at `~/.claude/skills/` (global) or `.claude/skills/` (project-local). The agent discovers available skills through an index, then loads specific skill content when task context matches the trigger condition. The `everything-claude-code` repository's hooks architecture includes a `session-start.js` that loads relevant context at the beginning of each session and `session-end.js` that saves state.

### Acquisition and Composition

Agents can acquire skills three ways:

1. **Manual installation**: Copy SKILL.md files into the skills directory
2. **Automated generation**: Tools like the `/skill-create` command analyze git history and extract patterns; the `continuous-learning-v2` system in everything-claude-code auto-extracts patterns from sessions into "instincts" that eventually get `/evolve`-d into skills
3. **Scraping pipelines**: Tools like [Skill Seekers](../../raw/repos/yusufkaraaslan-skill-seekers.md) convert documentation websites, GitHub repos, and PDFs into SKILL.md files automatically, with AST parsing, conflict detection between docs and actual code, and AI-enhanced content generation

### Relation to MCP

Skills and MCP serve different purposes. An MCP tool gives an agent a callable function with real-time access to external systems (databases, APIs, filesystems). A skill gives an agent procedural knowledge encoded as text. The Xu & Yan survey describes them as "complementary": skills handle know-how, MCP handles connectivity. In practice, both end up in the same ZIP archive — Skill Seekers packages both SKILL.md content and MCP configuration together.

## Who Implements It

- **Claude Code**: The reference implementation. Skills live in `~/.claude/skills/`, triggered by task context
- **everything-claude-code** (136k stars): Extends the convention with 156 skills, a hooks system for auto-loading, the `continuous-learning-v2` instinct system, and cross-platform adapters for Cursor, Codex, OpenCode
- **Skill Seekers** (12k stars): Toolchain for generating SKILL.md files from external documentation. Produces 500+ line skills with examples, patterns, and navigation from a single CLI command. The `DocToSkillConverter`, `GitHubScraper`, and `UnifiedScraper` classes handle 17 source types; the `AIEnhancer` calls Claude or Gemini to improve the generated content
- **Cursor, OpenCode, Codex**: Adapted the convention with YAML frontmatter variations and platform-specific loading paths

## Key Numbers

- **everything-claude-code**: 136k stars, 20k forks (self-reported via GitHub badges, not independently verified)
- **Skill Seekers**: 12k stars, 1.2k forks; 2,540+ passing tests (self-reported)
- **Security vulnerability rate**: 26.1% of community-contributed skills contain vulnerabilities, per empirical analysis cited in the Xu & Yan survey. This figure comes from a research paper, not a platform vendor, giving it more credibility than marketing claims — though the sample and methodology aren't detailed in the abstract
- **Skill Seekers performance claim**: "99% faster" than manual preprocessing. Self-reported and not independently benchmarked

## Strengths

**Composability without coupling.** Skills can be combined arbitrarily. A Django project can load `django-patterns`, `postgres-patterns`, `tdd-workflow`, and `security-review` simultaneously without any of them knowing about each other. This beats monolithic system prompts that grow into unmanageable blobs.

**Persistence across sessions.** The hook system in everything-claude-code (specifically `session-start.js` and `session-end.js`) loads and saves context across sessions. An agent working on a multi-day task accumulates knowledge in skills without the developer manually re-explaining the project each time.

**Human-readable and diffable.** SKILL.md files are markdown. Teams can review them in pull requests, fork them, version them in git, and update them when the underlying system changes. This is the opposite of embedding knowledge in opaque model weights.

**Cross-platform portability.** The same SKILL.md works in Claude Code, Cursor (with minor frontmatter adjustments), OpenCode, and Codex. Skill Seekers generates platform-specific packages for Claude, Gemini, OpenAI, LangChain, LlamaIndex, and others from the same source content.

## Critical Limitations

**No formal trust model, and the vulnerability rate is not theoretical.** The Xu & Yan survey's 26.1% vulnerability rate in community skills is the central operational risk. When an agent loads a community-contributed skill, it executes that skill's instructions with the same authority as any other instruction. A malicious or carelessly written skill can redirect tool use, exfiltrate context, or bypass safety checks. The survey proposes a "four-tier, gate-based permission model" mapping skill provenance to deployment capabilities — but this framework exists in a research paper, not in Claude Code's current implementation. There is no skill signature verification, no sandboxed skill execution, and no capability restriction by skill trust level in any of the implementations reviewed here.

**Unspoken infrastructure assumption**: Skills assume the agent has enough context budget to load them. A 500-line skill plus its reference files can consume 5-15% of a 200k context window. The everything-claude-code documentation explicitly warns about this: too many MCPs and skills active simultaneously can shrink effective context from 200k to ~70k tokens. The convention has no built-in mechanism for context budget management — that burden falls on the developer configuring the agent.

## When NOT to Use It

**Don't use SKILL.md for stateful procedures that require real-time data.** If a skill needs current database state, live API responses, or filesystem contents to function correctly, that's an MCP use case. A skill that tells the agent "check the current deployment status" without an MCP tool to actually fetch that status creates a gap between the procedure and its execution.

**Don't use community skills in production without review.** The 26.1% vulnerability rate makes unreviewed community skills a meaningful attack surface in any agentic system with real-world tool access (filesystem writes, API calls, code execution). This isn't hypothetical risk management — it's a documented empirical rate.

**Don't use skills as a substitute for proper context management.** Loading dozens of skills to cover all possible scenarios defeats the purpose. Skills work when loaded selectively based on actual task context, not loaded en masse as a hedge.

## Unresolved Questions

**Governance**: Who decides what counts as a valid community skill? The Xu & Yan survey proposes a governance framework, but no major implementation has shipped one. The everything-claude-code repository accepts community PRs for new skills, but review is done by maintainers looking at code quality, not security audits.

**Versioning and drift**: A skill generated from Django 4.x documentation becomes wrong when Django 5.x changes behavior. Skill Seekers has a `SyncMonitor` and `ChangeDetector` for detecting documentation changes, but the mechanism for propagating those changes to installed skills across users is not documented.

**Conflict resolution at scale**: When two skills give contradictory instructions (e.g., `security-review` says "never log user data" and `debugging-patterns` says "log full request context"), which wins? The loading order? The more recently invoked skill? Nothing in the current specification addresses this.

**Cost at scale**: Skill Seekers' AI-enhanced generation calls Claude or Gemini to produce improved SKILL.md content. For a team maintaining dozens of internal skills across multiple frameworks, the per-generation API cost accumulates. No published figures exist on this.

## Alternatives

| Alternative | Use When |
|---|---|
| **System prompt instructions** | Simple, stable procedures that don't need versioning or cross-project reuse. A SKILL.md is overkill for a one-project convention |
| **MCP tools** | The capability requires real-time access to external state. Skills describe procedures; MCP tools execute actions |
| **Fine-tuning** | Procedures are stable, universal, and need to work without any context loading overhead. Expensive upfront, zero runtime cost |
| **RAG over documentation** | The knowledge base is large and query-specific retrieval is better than full-document loading. LlamaIndex or LangChain integrations work better than SKILL.md for pure retrieval tasks |
| **Agent frameworks (LangGraph, etc.)** | You need explicit control flow, branching, and state machines rather than instruction-following procedures |

## Related

- [Claude Code](../projects/claude-code.md)
- Model Context Protocol
- [Agent Memory Systems](../concepts/agent-memory.md)

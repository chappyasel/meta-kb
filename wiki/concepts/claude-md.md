---
entity_id: claude-md
type: concept
bucket: context-engineering
abstract: >-
  CLAUDE.md is a markdown file loaded into Claude-based agents at session start
  to provide persistent instructions, project context, and configuration —
  distinguished from other memory mechanisms by its static, human-authored
  nature and zero-retrieval cost.
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/jmilinovich-goal-md.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/anthropics-skills.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
related:
  - claude-code
  - cursor
  - agent-skills
  - skill-book
  - claude
  - context-management
  - andrej-karpathy
  - openclaw
  - retrieval-augmented-generation
  - anthropic
  - autoresearch
  - model-context-protocol
last_compiled: '2026-04-08T02:46:03.615Z'
---
# CLAUDE.md

## What It Is

CLAUDE.md is a markdown file that Claude-based coding agents load at the start of every session. It sits at the root of a project (or in `~/.claude/CLAUDE.md` for global configuration) and injects its contents directly into the agent's context window before any user input arrives. The result: the agent knows your project's conventions, preferred tools, forbidden patterns, and architectural decisions without being told each time.

The name is Claude-specific, but the pattern is universal. [Cursor](../projects/cursor.md) calls it `.cursorrules`. [Gemini CLI](../projects/gemini-cli.md) uses `GEMINI.md`. [Windsurf](../projects/windsurf.md) uses `.windsurfrules`. Each is the same idea: a static file that shapes agent behavior across sessions through persistent context injection.

What distinguishes CLAUDE.md from other memory mechanisms is its simplicity. No database, no retrieval pipeline, no embeddings. The file loads completely, every time, at zero retrieval cost. This makes it predictable in a way that [RAG](../concepts/retrieval-augmented-generation.md)-based memory is not — the agent either has the context or it does not, and you can inspect exactly what it has by reading the file.

## How It Works

When [Claude Code](../projects/claude-code.md) starts a session, it reads CLAUDE.md from the current directory (and any parent directories up to the repo root, plus the global `~/.claude/CLAUDE.md`). The contents become part of the system prompt or early conversation context. Claude treats instructions in CLAUDE.md as authoritative guidance with higher weight than ad-hoc user messages.

The file is plain markdown. Common contents include:

- **Project overview**: What this codebase does, its main entry points, key dependencies
- **Code style rules**: Naming conventions, preferred patterns, linting requirements
- **Workflow instructions**: How to run tests, what CI checks exist, branch naming conventions
- **Tool permissions**: Which shell commands are safe to run without asking, which require confirmation
- **Architectural constraints**: What not to touch, deprecated modules to avoid, API surfaces under active change
- **Subagent delegation**: Instructions for spawning sub-agents, which tasks to parallelize

The loading mechanism in [Claude Code](../projects/claude-code.md) supports `@import` directives, which pull in additional files. Projects like Hipocampus use this to load `memory/ROOT.md` (a compressed topic index), `SCRATCHPAD.md`, and `WORKING.md` alongside the main CLAUDE.md — building a tiered [context management](../concepts/context-management.md) system on top of the basic file-loading primitive.

## Context Engineering Role

CLAUDE.md sits at the base of any [context engineering](../concepts/context-engineering.md) stack. It handles what you know at project-start time and can specify statically. Dynamic knowledge — what happened in previous sessions, what files changed yesterday, what the user prefers — requires additional mechanisms layered on top.

[Andrej Karpathy](../concepts/andrej-karpathy.md) popularized framing LLM context construction as an engineering problem analogous to code optimization. In this framing, CLAUDE.md is the static segment of working memory: high-value, always-loaded, never retrieved. The complementary pieces are dynamic: [episodic memory](../concepts/episodic-memory.md) from past sessions, [semantic memory](../concepts/semantic-memory.md) from vector search, and runtime state from tool calls.

Hipocampus makes this layering explicit. Its `memory/ROOT.md` — a ~3K token compressed topic index of everything the agent has ever discussed — loads via `@import` in CLAUDE.md. The always-loaded index costs roughly 300 tokens after prompt caching and provides O(1) awareness of past context. On implicit recall benchmarks (MemAware), this architecture scores 17-21% versus 3-4% for vector search alone — the difference between knowing you know something and having to search for it.

[gstack](../projects/anthropic.md) uses CLAUDE.md and skill files to encode an entire software development process: Think → Plan → Build → Review → Test → Ship → Reflect. Each SKILL.md (a CLAUDE.md variant for individual skills) locks the agent into a specialist role — Staff Engineer, CSO, QA Lead — with distinct goals and review criteria. The file's contents become the agent's professional identity for that session.

## The Agent Skills Connection

[Anthropic](../projects/anthropic.md)'s Agent Skills system extends the CLAUDE.md pattern into a [progressive disclosure](../concepts/progressive-disclosure.md) architecture. A SKILL.md file has the same markdown structure as CLAUDE.md but introduces YAML frontmatter:

```yaml
---
name: my-skill
description: What this skill does and when to use it
---
```

The description field — typically 100–200 characters — is the only part that loads into every session. The full skill body loads only when Claude determines the description matches the user's request. This solves a real problem: you want the agent to know about dozens of specialized capabilities, but loading every skill's full instructions into every session would exhaust the context window.

The three-tier architecture this creates:

1. **Metadata tier** (~100 tokens, always loaded): Name and description for routing
2. **Instructions tier** (full SKILL.md body, loaded on trigger): The working procedural knowledge
3. **Resources tier** (scripts, reference docs, loaded on demand): Deep domain content that never enters context directly

This is [context management](../concepts/context-management.md) applied at the skill level. The same principle that makes CLAUDE.md valuable — putting the right information in context before the agent needs it — extends to a marketplace of hundreds of skills without linear context cost growth.

The `allowed-tools` frontmatter field (experimental) lets skills pre-approve specific tool invocations like `Bash(git:*) Read`, giving skills a lightweight capability governance mechanism.

## Relationship to Other Memory Types

CLAUDE.md occupies a specific niche in the [agent memory](../concepts/agent-memory.md) taxonomy:

**[Procedural memory](../concepts/procedural-memory.md)**: CLAUDE.md primarily encodes procedures — how to run this project, which commands to use, what patterns to follow. It is the most common vehicle for procedural knowledge in Claude-based agents.

**[Semantic memory](../concepts/semantic-memory.md)**: Less suited. Factual knowledge about a domain is better served by retrieval systems like [RAG](../concepts/retrieval-augmented-generation.md) because it can be updated and queried selectively. Static facts in CLAUDE.md become stale.

**[Episodic memory](../concepts/episodic-memory.md)**: Not suited. Past session events require [long-term memory](../concepts/long-term-memory.md) systems like [Mem0](../projects/mem0.md), [Letta](../projects/letta.md), or Hipocampus. CLAUDE.md cannot record what happened — only what should always be true.

**[Core memory](../concepts/core-memory.md)**: CLAUDE.md is essentially the agent's core memory in [MemGPT](../projects/memgpt.md) terminology — the always-in-context facts that define identity and persistent constraints.

The practical design question is: what belongs in CLAUDE.md versus what belongs in a retrieval system? Rules of thumb from observed practice:

- Put it in CLAUDE.md if it is always relevant regardless of what the user asks
- Put it in CLAUDE.md if it is stable (changes less than weekly)
- Put it in a retrieval system if it is conditional on the current task
- Put it in a retrieval system if the corpus is larger than ~10K tokens

## Failure Modes

**Context budget exhaustion**: A badly maintained CLAUDE.md accumulates instructions over time. Projects that add rules without auditing regularly end up with files exceeding 50K tokens — consuming context that could be used for actual work. The agent loads it completely regardless of relevance. Unlike RAG, there is no filtering.

**Stale instructions**: CLAUDE.md has no freshness mechanism. Instructions written six months ago may conflict with current codebase conventions, deprecated dependencies, or changed team standards. The agent follows them anyway. This is the [lost in the middle](../concepts/lost-in-the-middle.md) problem in reverse — instructions are never lost, even when they should be.

**Security injection**: In agentic workflows where CLAUDE.md is generated or updated programmatically, malicious content can be injected. Anthropic's Agent Skills security analysis found 26.1% of community skill files contain vulnerabilities, with prompt injection the most common vector. CLAUDE.md loaded from an untrusted source is an attack surface.

**Invisible configuration**: Teams that add workflow instructions to CLAUDE.md create implicit dependencies that new contributors do not know exist. The agent behaves differently in the presence of CLAUDE.md, and diagnosing unexpected behavior requires knowing to look there.

**No conflict resolution**: CLAUDE.md, parent-directory CLAUDE.md files, and global `~/.claude/CLAUDE.md` all load and merge. When they conflict, there is no formal precedence rule — the model's behavior is empirically determined, not specified.

## Infrastructure Assumptions

Two assumptions underlie CLAUDE.md's utility that documentation rarely states:

**Prompt caching**: The value proposition assumes the model caches the static file content across sessions. Without caching, loading a 10K-token CLAUDE.md into every API call costs real money at scale. Claude's prompt caching makes stable CLAUDE.md content effectively free after the first call. If you are using a different model or a provider that does not implement caching, the economics change significantly.

**Single-user scope**: CLAUDE.md assumes one developer, one project, one agent. In multi-agent systems where several Claude instances work the same repository in parallel, CLAUDE.md becomes a shared configuration file with no concurrency mechanism. If two agents are instructed to update CLAUDE.md based on what they learn, they will overwrite each other's changes. Projects like [AutoGen](../projects/autogen.md) and [CrewAI](../projects/crewai.md) need coordination layers that CLAUDE.md does not provide.

## When Not to Use It

CLAUDE.md is the wrong primary mechanism when:

- **The context is user-specific, not project-specific**: A project file cannot encode individual user preferences, history, or expertise. Use a memory system like [Mem0](../projects/mem0.md) or Hipocampus for this.
- **The domain knowledge is large and conditional**: API reference documentation, schema files, or large style guides belong in a retrieval system. Loading 50K tokens of reference material unconditionally wastes context on tasks that do not need it.
- **The team size is greater than one**: Shared CLAUDE.md creates merge conflicts and conflicting opinions about what "always true" means. Team-scale agent configuration requires more structured governance.
- **The agent will update its own configuration**: Self-modifying CLAUDE.md is a security and stability risk. Use a purpose-built memory system with append semantics and conflict detection.
- **You need the agent to forget**: CLAUDE.md has no expiry. Instructions you load today load forever until manually removed. If you need time-bounded guidance, encode it in the session rather than the file.

## Relationship to Broader Patterns

[SkillBook](../concepts/skill-book.md) formalizes what practitioners do informally with CLAUDE.md: maintaining a curated library of reusable agent instructions. The [Markdown Wiki](../concepts/markdown-wiki.md) pattern extends it to knowledge bases. [Context Graphs](../concepts/context-graphs.md) attempt to make the relationships between context fragments explicit rather than relying on flat file concatenation.

[OpenClaw](../projects/openclaw.md) and [AutoResearch](../projects/autoresearch.md) both use CLAUDE.md (or equivalent files) as the primary mechanism for configuring autonomous agent behavior. The self-improvement loop in AutoResearch — where agents modify their own instructions based on task outcomes — represents the most ambitious use of the pattern, but also the highest-risk one.

[Model Context Protocol](../concepts/model-context-protocol.md) provides a complementary mechanism: rather than encoding tool knowledge in CLAUDE.md, MCP servers expose tools directly to the agent. A well-designed system uses CLAUDE.md for procedural and project-specific knowledge, and MCP for tool connectivity — the same separation the Agent Skills survey recommends between "what to do" (skills) and "how to connect" (MCP).

## Unresolved Questions

The documentation does not address several practical problems:

**Optimal size**: What token count maximizes the context-vs-cost tradeoff? Empirically, projects range from 500 tokens to 100K+ tokens of CLAUDE.md content. There is no published analysis of where returns diminish.

**Content prioritization under truncation**: If CLAUDE.md exceeds available context, what gets truncated? The loading order and truncation behavior under context pressure are not specified.

**Multi-agent coordination**: How should multiple agents share a CLAUDE.md? Should they have separate files? How do you merge agent-generated updates without conflicts?

**Versioning semantics**: CLAUDE.md is committed to git, so you have history, but there is no semantic versioning of the agent's behavior. A CLAUDE.md change can silently change how the agent behaves on every subsequent task without any test coverage.

**Cross-project learning**: Hipocampus and gstack both accumulate per-project knowledge in CLAUDE.md-adjacent files. How this knowledge should transfer across projects — which patterns are universal, which are project-specific — has no standard answer.

## Alternatives

| Alternative | Use when |
|---|---|
| [RAG](../concepts/retrieval-augmented-generation.md) / [Semantic Search](../concepts/semantic-search.md) | Context is large, conditional, or task-specific — retrieve only what the current task needs |
| [Mem0](../projects/mem0.md) / [Letta](../projects/letta.md) | You need episodic memory across sessions, user-specific preferences, or multi-user scale |
| [Model Context Protocol](../concepts/model-context-protocol.md) | Context is better framed as tool access rather than instructions |
| [Agent Skills](../concepts/agent-skills.md) (SKILL.md with progressive disclosure) | You have many specialized capabilities and cannot afford to load all of them in every session |
| System prompt injection via API | You control the deployment and do not need file-based configuration — cleaner for production systems |
| [MemGPT](../projects/memgpt.md) / Hipocampus | You need the agent to maintain and update its own knowledge across sessions with structured memory management |

CLAUDE.md works best as the foundation of a layered context system, not as the entire system. It handles what you know statically. Everything else — session history, dynamic retrieval, user-specific preferences — requires additional infrastructure built on top of it.


## Related

- [Claude Code](../projects/claude-code.md) — implements (0.8)
- [Cursor](../projects/cursor.md) — implements (0.6)
- [Agent Skills](../concepts/agent-skills.md) — part_of (0.7)
- [SkillBook](../concepts/skill-book.md) — part_of (0.7)
- [Claude](../projects/claude.md) — implements (0.9)
- [Context Management](../concepts/context-management.md) — implements (0.8)
- [Andrej Karpathy](../concepts/andrej-karpathy.md) — part_of (0.4)
- [OpenClaw](../projects/openclaw.md) — implements (0.6)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.4)
- [Anthropic](../projects/anthropic.md) — created_by (0.8)
- [AutoResearch](../projects/autoresearch.md) — implements (0.5)
- [Model Context Protocol](../concepts/model-context-protocol.md) — implements (0.7)

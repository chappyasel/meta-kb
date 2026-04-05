---
entity_id: agents-md
type: concept
bucket: agent-systems
sources:
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/jmilinovich-goal-md.md
  - repos/affaan-m-everything-claude-code.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - repos/alvinreal-awesome-autoresearch.md
  - deep/repos/bingreeky-memevolve.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/thedotmack-claude-mem.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/kayba-ai-agentic-context-engine.md
  - deep/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md
related:
  - Claude Code
last_compiled: '2026-04-05T05:30:23.506Z'
---
# AGENTS.md

## What It Is

AGENTS.md is a markdown file convention for defining agent behavior at the repository or project level. Drop one into a directory and a compatible coding agent reads it on startup to understand what it is, what tools it can use, and how it should operate. The file typically contains a persona description, capability list, operating constraints, and task-specific instructions.

The name comes from the same family as CLAUDE.md and GOAL.md: repo-level context files that substitute for system prompts, giving agents persistent identity and scope without requiring the user to re-explain the environment every session.

## How It Works

An agent framework scans for AGENTS.md (and sibling files like CLAUDE.md) at session start, loads the contents into context, and treats the instructions as authoritative. In Claude Code, [three scope layers stack](../../raw/tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md): Admin, Global, and Project. Arrays from each scope combine; scalar settings resolve to the most specific value. Files in subdirectories load automatically, so a subdirectory can override or extend the root agent definition.

A typical AGENTS.md block looks like:

```markdown
# Agent: code-reviewer

You review Python pull requests. You have access to `gh`, `rg`, and `python`.
Do not modify files directly. Output structured comments only.

## Constraints
- Never approve a PR with no tests
- Flag any SQL string concatenation as a blocker
```

The file encodes what would otherwise be an ad-hoc system prompt, but versioned alongside the code, readable by humans, and composable with other repo-level files.

## Relationship to Other Mechanisms

AGENTS.md handles declarative identity and behavioral rules. It does not replace the other mechanisms that coding agent frameworks expose. [Pawel Huryn's breakdown](../../raw/tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md) makes the functional separation clear:

- **Rules** fire by file path pattern. Testing rules load when the agent touches test files.
- **Hooks** run deterministic code on events, no AI interpretation involved.
- **Skills** are subdirectory-scoped instruction sets with their own tools and constraints.
- **Agents** get their own model, their own tool access, and optional worktree isolation.

AGENTS.md belongs at the top of this stack: it sets overall persona and global constraints. Skills and rules handle the narrower, context-triggered behavior. Shoving everything into one AGENTS.md file causes the context bloat problem that the other mechanisms exist to prevent.

## What It's Good For

**Stable agent identity across sessions.** An agent that reads AGENTS.md starts every session knowing its role, its tools, and its limits. No prompt engineering required from the user.

**Team-legible configuration.** The file lives in the repo, gets reviewed in PRs, and can be diffed. Agent behavior changes become visible commits rather than invisible system prompt edits.

**Composability with GOAL.md.** An AGENTS.md file can specify a loop-capable agent persona that then loads a [GOAL.md](../projects/goal-md.md) to get its fitness function and action catalog. The two files separate concerns: AGENTS.md says what the agent is, GOAL.md says what it should optimize.

**Scope containment.** By placing different AGENTS.md files in subdirectories, teams can give a security-auditor agent access to one directory without exposing it to the full codebase.

## Limitations

**No validation.** An AGENTS.md file is plain text. Nothing stops a malformed or contradictory file from loading. If the instructions conflict with the model's system prompt or with a parent-scope CLAUDE.md, resolution depends entirely on the framework's precedence rules, which vary by implementation and may not be documented clearly.

**Context budget pressure.** A verbose AGENTS.md consumes tokens every session, permanently. Detailed capability tables, long constraint lists, and multi-section personas add up. At scale, across many subagent calls, this overhead compounds. The [hipocampus analysis](../../raw/repos/kevin-hs-sohn-hipocampus.md) highlights the same problem for memory files: after a month of growth, hundreds of decisions can't fit in a system prompt anymore.

**Unspoken infrastructure assumption.** AGENTS.md works as advertised only in frameworks that actually load it. Claude Code does. Other agents may not, or may load it but give it lower priority than a runtime system prompt. The file convention has no spec body, no versioning scheme, and no compliance test. An agent built on a different framework may ignore it entirely with no error.

**Concrete failure mode.** An AGENTS.md that defines an agent with write access to production config files, combined with a GOAL.md in "Continuous" mode and a loose constraint list, can autonomously modify infrastructure. The [GOAL.md documentation](../../raw/repos/jmilinovich-goal-md.md) calls this out explicitly: "without constraints the agent will absolutely find creative ways to make the number go up that you did not intend." AGENTS.md is only as safe as the constraints it contains, and those constraints are natural language.

## When Not to Use It

Skip AGENTS.md for one-shot tasks where the user will be present to direct the agent step by step. The file earns its cost in sessions where the agent operates autonomously or semi-autonomously over extended periods.

Avoid relying on AGENTS.md alone for security-critical constraints. A declarative instruction to "never modify credentials" is not an access control. Use filesystem permissions, tool-level restrictions, and hook-level guards for anything that must not happen.

Do not use a single monolithic AGENTS.md to encode all agent behavior in a complex project. Split testing rules into path-scoped rules, event-driven behavior into hooks, and subtask specialization into skills. The AGENTS.md file should describe the agent's identity and top-level constraints, not replicate a full system prompt.

## Unresolved Questions

No canonical specification exists for the AGENTS.md format. Key questions the documentation doesn't answer:

- What is the precedence order when AGENTS.md, CLAUDE.md, and a runtime system prompt all define conflicting behavior?
- How should constraint violations be reported to the operator vs. silently overridden by the model?
- Does the file support conditional loading (e.g., load different sections in CI vs. interactive mode)?
- Who governs additions to the convention? There is no working group, no RFC process, and no versioning scheme.

## Alternatives

| File / Convention | Use When |
|---|---|
| **CLAUDE.md** | You want general repo context and coding conventions for any session, not a specialized agent persona. |
| **GOAL.md** | The agent needs a fitness function and an optimization loop rather than behavioral constraints. Use alongside AGENTS.md, not instead of it. |
| **Path-scoped Rules** | You want instructions to fire conditionally based on which files the agent is reading, not globally every session. |
| **System prompt in code** | You control the framework and need validated, versioned, non-editable constraints. Plain text files are inappropriate for hard safety boundaries. |

## Related Concepts

- [GOAL.md](../projects/goal-md.md): fitness function convention that pairs with AGENTS.md for autonomous optimization loops
- [Hipocampus](../projects/hipocampus.md): agent memory harness that operates through agent skills loaded into the same scope stack as AGENTS.md

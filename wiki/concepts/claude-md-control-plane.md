# CLAUDE.md Control Plane

> The CLAUDE.md control plane is the set of durable project-level rules, conventions, and operating assumptions that an agent sees up front before it starts working. [Martin Fowler on coding-agent context engineering](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

## Why It Matters

Agents get more reliable when repeated guidance stops living in ad hoc prompts and starts living in durable project state. The problem is not whether to have a control plane; it is how much to stuff into it before it becomes another source of context rot. [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md) [Martin Fowler on coding-agent context engineering](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

## How It Works

The control plane usually starts as a project rules file, then decomposes into rules, hooks, skills, slash commands, and subagents as the system grows. The best versions are small, direct, and complemented by on-demand layers rather than trying to encode the whole workflow in one file. [Martin Fowler on coding-agent context engineering](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md) [gstack source](../../raw/repos/garrytan-gstack.md)

## Who Implements It

- [Planning with Files](../projects/planning-with-files.md) — durable project files as continuity and control surfaces. [Planning with Files source](../../raw/repos/othmanadi-planning-with-files.md)
- [gstack](../projects/gstack.md) — decomposes workflow into many role-specific skills and commands. [gstack source](../../raw/repos/garrytan-gstack.md)
- [Everything Claude Code](../projects/everything-claude-code.md) — broad harness conventions, hooks, and rules. [Everything Claude Code source](../../raw/repos/affaan-m-everything-claude-code.md)

## Open Questions

- What belongs in the always-on control plane versus a skill or hook? [Martin Fowler on coding-agent context engineering](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)
- How can teams keep the control plane small as the workflow grows more sophisticated? [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)

## Sources

- [Anthropic on context engineering](../../raw/articles/effective-context-engineering-for-ai-agents.md)
- [Martin Fowler on coding-agent context engineering](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)
- [Planning with Files source](../../raw/repos/othmanadi-planning-with-files.md)
- [gstack source](../../raw/repos/garrytan-gstack.md)
- [Everything Claude Code source](../../raw/repos/affaan-m-everything-claude-code.md)

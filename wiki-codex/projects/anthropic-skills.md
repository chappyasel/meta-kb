# Anthropic Skills

> The canonical open implementation of the `SKILL.md` pattern for Claude and the clearest reference point for skills as progressively loaded capability packages. [Source](../../raw/repos/anthropics-skills.md)

## What It Does

Anthropic Skills publishes the public repo and examples behind the Agent Skills pattern: folders of instructions, scripts, and resources that agents can load dynamically for specialized work instead of keeping every procedure in the main prompt. [Source](../../raw/repos/anthropics-skills.md)

## Architecture

The core abstraction is deliberately simple: a folder with a `SKILL.md`, optional assets, and a clear description that helps the agent decide when to load it. The repo also includes example skills and the specification surface around the standard. [Source](../../raw/repos/anthropics-skills.md)

## Key Numbers

- 110,064 GitHub stars. [Source](../../raw/repos/anthropics-skills.md)
- Official examples across creative, technical, enterprise, and document workflows. [Source](../../raw/repos/anthropics-skills.md)

## Strengths

- Sets the de facto open standard for modern agent skills. [Source](../../raw/repos/anthropics-skills.md)
- Keeps the packaging format inspectable and portable. [Source](../../raw/repos/anthropics-skills.md)

## Limitations

- The repo is a standard and example set, not a full governance system for third-party skill trust or testing. [Source](../../raw/repos/anthropics-skills.md)

## Alternatives

- [claude-skills](claude-skills.md) for wider cross-tool packaging.
- [gstack](gstack.md) when you want an opinionated prebuilt workflow suite.

## Sources

- [Anthropic Skills repo](../../raw/repos/anthropics-skills.md)
- [Agent Skills overview](../../raw/articles/agent-skills-overview.md)

# Skill Registry

> A skill registry is the discovery and distribution layer for skill packages. It determines how capabilities are found, versioned, trusted, and loaded at runtime. [Anthropic Skills source](../../raw/repos/anthropics-skills.md) [Agent Skills survey](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

## Why It Matters

Once skills become the unit of reusable capability, the hard problem stops being "can I write one?" and becomes "how do agents find the right one safely?" A registry is the answer, but it immediately introduces package-ecosystem problems: conflicts, trust, provenance, lifecycle, and stale versions. [Agent Skills survey](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

## How It Works

Registries expose metadata, package bundles, and installation or loading paths. Good registries also imply policies: how skills are validated, how permissions are gated, and how incompatible packages are surfaced. [Anthropic Skills source](../../raw/repos/anthropics-skills.md) [Skill Seekers source](../../raw/repos/yusufkaraaslan-skill-seekers.md)

## Who Implements It

- [Anthropic Skills](../projects/anthropic-skills.md) — the clearest current registry and spec anchor. [Anthropic Skills source](../../raw/repos/anthropics-skills.md)
- [Skill Seekers](../projects/skill-seekers.md) — ecosystem tooling around packaging and distribution. [Skill Seekers source](../../raw/repos/yusufkaraaslan-skill-seekers.md)
- [gstack](../projects/gstack.md) — a more curated, project-local registry style built around slash commands and roles. [gstack source](../../raw/repos/garrytan-gstack.md)

## Open Questions

- Should open skill ecosystems behave more like package managers or like app stores? [Agent Skills survey](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)
- What minimum review standard should gate production installation? [Agent Skills survey](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

## Sources

- [Anthropic Skills source](../../raw/repos/anthropics-skills.md)
- [Skill Seekers source](../../raw/repos/yusufkaraaslan-skill-seekers.md)
- [gstack source](../../raw/repos/garrytan-gstack.md)
- [Agent Skills survey](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

# Agent Skills

> Agent skills are reusable capability packages that bundle instructions, resources, and sometimes code or tools so an agent can load specialized behavior on demand instead of carrying every procedure in its base prompt.

## Why It Matters

Skills matter because they solve two different problems at once. First, they reduce prompt sprawl by moving specialized procedures into modular units. Second, they create a distribution format for expertise. Once a capability lives as a skill, it can be versioned, shared, reviewed, and selectively loaded. [Anthropic Skills](../../raw/repos/anthropics-skills.md) [Xu & Yan](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

That is why the corpus treats skills as more than prompt engineering. They are becoming a software packaging layer for agent behavior. A large harness like `everything-claude-code` or `gstack` is partly a context system, but it is also a skill operating environment. [everything-claude-code](../../raw/repos/affaan-m-everything-claude-code.md) [gstack](../../raw/repos/garrytan-gstack.md)

## How It Works

The core pattern is straightforward:

1. Define a skill with a canonical instruction file and optional resources.
2. Store it in a discoverable location or registry.
3. Let the agent decide when to load it, or let software trigger it under scoped conditions.
4. Reuse the same skill across tasks instead of restating the procedure in free-form prompts.

The Anthropic `SKILL.md` pattern is the clearest formalization in the repo, but similar ideas show up in Obsidian Skills, community skill registries, and AI research skill packs. The shared belief is that capability composition should happen through explicit modules, not giant instruction monoliths. [Anthropic Skills](../../raw/repos/anthropics-skills.md) [Obsidian Skills](../../raw/repos/kepano-obsidian-skills.md) [AI-Research-SKILLs](../../raw/repos/orchestra-research-ai-research-skills.md)

Skills also introduce governance issues. Once anyone can publish reusable agent behaviors, the system needs provenance, review, permission boundaries, and often defense against prompt injection embedded in the skill itself. Several sources are explicit that the field has not solved this cleanly yet. [Xu & Yan](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) [Phil Schmid](../../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md) [Steve Ruiz](../../raw/tweets/steveruizok-some-of-you-aren-t-soldier-proofing-your-agent-ski.md)

## Who Implements It

- [Anthropic Skills](../projects/anthropic-skills.md) define the reference `SKILL.md` package format and show dynamic loading in practice. [Anthropic Skills](../../raw/repos/anthropics-skills.md)
- [claude-skills](../projects/claude-skills.md) is a community skill registry built around the same basic distribution idea. [claude-skills](../../raw/repos/alirezarezvani-claude-skills.md)
- [Obsidian Skills](../projects/obsidian-skills.md) bring the pattern into personal knowledge workflows. [Obsidian Skills](../../raw/repos/kepano-obsidian-skills.md)
- [AI-Research-SKILLs](../projects/ai-research-skills.md) package specialized research procedures into reusable modules. [AI-Research-SKILLs](../../raw/repos/orchestra-research-ai-research-skills.md)
- [Skill Seekers](../projects/skill-seekers.md) help export knowledge into skill-compatible formats across ecosystems. [Skill Seekers](../../raw/repos/yusufkaraaslan-skill-seekers.md)
- [gstack](../projects/gstack.md) shows how large agent harnesses become effectively skill operating systems. [gstack](../../raw/repos/garrytan-gstack.md)

## Open Questions

- How should skills be audited before being loaded into high-trust environments? [Xu & Yan](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) [Phil Schmid](../../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md)
- What should be a skill versus a rule, hook, tool, or subagent? [Martin Fowler](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)
- Can open skill ecosystems stay composable without collapsing into compatibility drift? [Anthropic Skills](../../raw/repos/anthropics-skills.md) [calmops guide](../../raw/articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md)

## Sources

- [Anthropic Skills repo](../../raw/repos/anthropics-skills.md)
- [Agent Skills for Large Language Models paper](../../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)
- [everything-claude-code repo](../../raw/repos/affaan-m-everything-claude-code.md)
- [gstack repo](../../raw/repos/garrytan-gstack.md)
- [claude-skills repo](../../raw/repos/alirezarezvani-claude-skills.md)
- [Obsidian Skills repo](../../raw/repos/kepano-obsidian-skills.md)
- [AI-Research-SKILLs repo](../../raw/repos/orchestra-research-ai-research-skills.md)
- [Skill Seekers repo](../../raw/repos/yusufkaraaslan-skill-seekers.md)
- [Context engineering for coding agents](../../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)
- [CalmOps skills guide](../../raw/articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md)
- [Phil Schmid tweet](../../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md)
- [Steve Ruiz tweet](../../raw/tweets/steveruizok-some-of-you-aren-t-soldier-proofing-your-agent-ski.md)

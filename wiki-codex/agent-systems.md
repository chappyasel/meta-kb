# The State of Agent Systems

> The most important unit of agent engineering in 2026 is no longer the prompt or the tool. It is the packaged capability surface: skills, subagents, workflow graphs, and registries that let agents discover, load, compose, and govern specialized behavior on demand. [Agent Skills overview](../raw/articles/agent-skills-overview.md) [Xu & Yan](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) [Calmops guide](../raw/articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md)

This matters because raw model capability is no longer the main bottleneck in daily agent work. The bottleneck is packaging expertise so it can be invoked reliably, routed correctly, tested, and maintained over time. The field has therefore moved toward an abstraction stack: tools at the bottom, skills above tools, subagents above skills, and registries or workflow engines coordinating the whole thing. [Calmops guide](../raw/articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md) [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

## Approach Categories

### Open Skill Standards And Registries

The standard-setting work is coming from [Anthropic Skills](projects/anthropic-skills.md) and the broader Agent Skills effort: capabilities packaged as folders with a `SKILL.md`, optional scripts, and optional resources that can be progressively loaded by compatible agents. The attraction is obvious. It externalizes procedural knowledge from model weights and makes capability distribution versionable, inspectable, and portable. [Agent Skills overview](../raw/articles/agent-skills-overview.md) [Anthropic Skills](../raw/repos/anthropics-skills.md)

The registry layer is where this gets operationalized. [claude-skills](projects/claude-skills.md) aims for broad multi-tool portability. [Obsidian Skills](projects/obsidian-skills.md) applies the pattern inside a personal knowledge environment. [AI-Research-SKILLs](projects/ai-research-skills.md) turns an entire research workflow into a massive skill library. [Skill Seekers](projects/skill-seekers.md) attacks the packaging problem from the other side by converting arbitrary docs and codebases into installable skill outputs for multiple agent targets. [claude-skills](../raw/repos/alirezarezvani-claude-skills.md) [Obsidian Skills](../raw/repos/kepano-obsidian-skills.md) [AI-Research-SKILLs](../raw/repos/orchestra-research-ai-research-skills.md) [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)

The upside is obvious reuse. The downside is governance. Xu and Yan’s survey is the first source in this corpus that treats skill security as a central systems problem rather than an afterthought, pointing to a 26.1% vulnerability rate in community skills. That is the first big warning sign that “skill marketplace” and “safe production deployment” are not the same thing. [Xu & Yan](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

### Harnesses And Role-Based Operating Systems

The second camp treats agent systems as operating environments rather than isolated skills. [everything-claude-code](projects/everything-claude-code.md) is the largest example: memory hooks, instincts, skill packs, context policies, and multi-platform support wrapped into one harness. [gstack](projects/gstack.md) takes a more role-based approach, shipping CEO, design, QA, security, deploy, and research skills as a precomposed management stack. [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) [gstack](../raw/repos/garrytan-gstack.md)

What these systems really sell is not just “more prompts.” They sell opinionated decomposition. Instead of asking one agent to improvise everything from scratch, they provide named workflows, specialized roles, install surfaces, and selective loading rules. That reduces the cognitive and contextual burden on the base model. It also makes the system teachable inside teams. [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) [gstack](../raw/repos/garrytan-gstack.md)

The risk is sprawl. Large harnesses can easily become the new monolith. The better ones acknowledge this and add aggressive context controls, progressive loading, compatibility layers, and explicit token-optimization guidance. [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md)

### Workflow Graphs And Orchestrated Research Systems

The third camp thinks less in terms of skills and more in terms of executable graphs. The survey on workflow optimization for LLM agents gives useful vocabulary here: reusable templates, run-specific realized graphs, and execution traces are distinct objects. That matters because “the system” is no longer one fixed scaffold. It is a graph that may be selected or rewritten during execution. [Yue et al.](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)

[AI-Research-SKILLs](projects/ai-research-skills.md) is a concrete example from the research domain. It does not just expose 87 skills; it adds an autoresearch orchestration layer that routes to domain skills across the full research lifecycle. [CORAL](projects/coral.md) is a smaller but more explicitly self-evolving example, where shared notes, attempts, and skills act as persistent multi-agent public state. These systems are closer to workflow engines than prompt packs. [AI-Research-SKILLs](../raw/repos/orchestra-research-ai-research-skills.md) [CORAL](../raw/repos/human-agent-society-coral.md)

### Agent-Accessible Infrastructure

A subtler but important strand in this bucket is the push to make existing products agent-accessible through CLIs, MCPs, and markdown exports. Karpathy’s CLI tweet captures the mood: the fastest way to make a product usable by agents is often to expose a CLI or MCP surface and then package expert workflows as skills around it. [Karpathy CLI tweet](../raw/tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md)

[Skill Seekers](projects/skill-seekers.md) and [AI-Research-SKILLs](projects/ai-research-skills.md) both operationalize this in different ways. One preprocesses docs into portable assets; the other ships deep framework expertise. The shared thesis is that distribution format is now part of capability design. [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md) [AI-Research-SKILLs](../raw/repos/orchestra-research-ai-research-skills.md)

## The Capability Stack Is Getting Clearer

One of the most useful syntheses from this bucket is that agent systems are developing a recognizable stack. At the bottom are tools and APIs. Above that are rules and guidance layers that shape behavior. Above that are skills, which package reusable procedures. Above that are subagents or roles, which package decision authority and task ownership. Above that are workflow graphs and registries, which decide what gets instantiated for a given run. Martin Fowler’s memo is valuable because it names these layers cleanly instead of treating everything as “prompt engineering.” [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

This stack matters because it prevents overloading any one abstraction. A team that tries to solve orchestration with only skills will get tangled dependency chains. A team that tries to solve everything with subagents will create excess overhead and weak reuse. A team that keeps everything in one prompt will lose inspectability. The field is moving toward layered capability systems because each layer solves a different coordination problem. [Calmops guide](../raw/articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md) [Yue et al.](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)

## Failure Modes Of Capability Packaging

The first failure mode is registry entropy. Once a system has dozens of skills, no one is fully sure which ones overlap, which are stale, or which depend on hidden assumptions. Open ecosystems make this worse because abundance hides duplication. This is where curated systems retain an advantage: fewer capabilities, but clearer opinions. [claude-skills](../raw/repos/alirezarezvani-claude-skills.md) [gstack](../raw/repos/garrytan-gstack.md)

The second failure mode is security drift. The skills survey, Phil Schmid’s warning, and Steve Ruiz’s operational advice all point to the same structural issue: skills are executable trust bundles. They may contain instructions, scripts, assumptions about file access, or hidden exfiltration opportunities. Once skills become installable artifacts, supply-chain thinking becomes mandatory. [Xu & Yan](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) [Phil Schmid](../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md) [Steve Ruiz](../raw/tweets/steveruizok-some-of-you-aren-t-soldier-proofing-your-agent-ski.md)

The third failure mode is role inflation. Large harnesses can keep adding specialist roles until the system feels sophisticated but becomes hard to reason about. The practical question is not whether a role sounds useful. It is whether the role creates a distinct improvement in decision quality, observability, or context economy. The best harnesses earn their extra roles by making routing and review clearer. The weaker ones simply create ceremony. [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) [gstack](../raw/repos/garrytan-gstack.md)

## Why Teams Are Buying Systems, Not Agents

This bucket also explains a broader market shift. Teams are increasingly less interested in generic “AI agents” and more interested in operational systems that already encode good decomposition, review habits, and capability packaging. That is why large skill ecosystems and harnesses are getting more traction than standalone demo agents. A packaged system teaches a team how to work with agents, not just how to call one. [Agent Skills overview](../raw/articles/agent-skills-overview.md) [Google Cloud](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)

The deeper reason is that reusable capability surfaces compound. Once a team has a reliable skill, a proven review role, or a good workflow graph, every future task starts from a better prior. Agent systems are becoming organizational memory in executable form. That is the strongest link between this bucket and the memory/context buckets around it. [AI-Research-SKILLs](../raw/repos/orchestra-research-ai-research-skills.md) [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)

## The Convergence

The strongest convergence is progressive loading. Skills are attractive because they let agents load only the procedures relevant to the task. This is true in Anthropic’s standard, in Calmops’ architecture guide, and in the newer skill survey. The field is converging on the idea that capability composition should not require keeping every workflow in every prompt all the time. [Agent Skills overview](../raw/articles/agent-skills-overview.md) [Calmops guide](../raw/articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md) [Xu & Yan](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

The second convergence is that skills need evals. Phil Schmid’s tweet on deterministic checks, Steve Ruiz’s “soldier-proofing” guidance, and the recent skill-security survey all point the same way: skill authoring without evaluation and governance is not a mature engineering process. [Phil Schmid](../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md) [Steve Ruiz](../raw/tweets/steveruizok-some-of-you-aren-t-soldier-proofing-your-agent-ski.md) [Xu & Yan](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

## The Divergence

The main split is between curated skill bundles and open-ended marketplaces. Curated systems like [gstack](projects/gstack.md) or [everything-claude-code](projects/everything-claude-code.md) optimize for coherent opinionated workflows. Broader registries like [claude-skills](projects/claude-skills.md) and [Skill Seekers](projects/skill-seekers.md) optimize for portability and breadth. These are different products with different failure modes: the first risks lock-in and bloat, the second risks inconsistency and security issues. [gstack](../raw/repos/garrytan-gstack.md) [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) [claude-skills](../raw/repos/alirezarezvani-claude-skills.md) [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)

There is also a meaningful split between skill-first and graph-first orchestration. Skill systems focus on reusable units of expertise. Workflow-optimization research focuses on when and how those units should be assembled into execution graphs. Both are important, but they solve different layers of the stack. [Calmops guide](../raw/articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md) [Yue et al.](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)

## What's Hot Now

This is one of the highest-momentum buckets in the corpus. [everything-claude-code](projects/everything-claude-code.md) has 136,116 stars, [Anthropic Skills](projects/anthropic-skills.md) 110,064, [gstack](projects/gstack.md) 63,766, [Obsidian Skills](projects/obsidian-skills.md) 19,325, [planning-with-files](projects/planning-with-files.md) 17,968, [Skill Seekers](projects/skill-seekers.md) 12,269, [claude-skills](projects/claude-skills.md) 9,216, and [AI-Research-SKILLs](projects/ai-research-skills.md) 6,111. The scale of those numbers makes one thing clear: agent builders want reusable workflow surfaces more than they want another demo agent. [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) [Anthropic Skills](../raw/repos/anthropics-skills.md) [gstack](../raw/repos/garrytan-gstack.md) [Obsidian Skills](../raw/repos/kepano-obsidian-skills.md) [planning-with-files](../raw/repos/othmanadi-planning-with-files.md) [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md) [claude-skills](../raw/repos/alirezarezvani-claude-skills.md) [AI-Research-SKILLs](../raw/repos/orchestra-research-ai-research-skills.md)

The most interesting “hot” subtheme is research orchestration. [AI-Research-SKILLs](projects/ai-research-skills.md) now spans 87 skills across 22 categories and explicitly positions autoresearch as the routing layer over the full lifecycle. That is a sign that agent systems are moving from ad hoc tool use toward specialized production libraries with real internal taxonomies. [AI-Research-SKILLs](../raw/repos/orchestra-research-ai-research-skills.md)

## The Packaging Economy

What makes this bucket feel different from earlier agent tooling waves is that the unit of value has shifted. Teams are not just collecting tools. They are collecting packaged competence. A strong skill, role, or workflow is valuable because it can be reused across tasks, audited, handed to teammates, and improved independently of the base model. That makes capability packaging a form of capital accumulation for agent teams. [Agent Skills overview](../raw/articles/agent-skills-overview.md) [Anthropic Skills](../raw/repos/anthropics-skills.md)

This also explains why registries and harnesses attract so much attention. They are not merely convenience layers. They are where an organization’s agent know-how becomes legible and durable. The moment that happens, the “agent system” stops being a demo and starts becoming infrastructure. [Google Cloud](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md) [gstack](../raw/repos/garrytan-gstack.md)

## Where It's Going

The likely next step is stricter governance and lifecycle management for skills: provenance, testing gates, scoped permissions, and compatibility metadata. The field already has enough momentum to create a supply chain problem. The next year will likely reward ecosystems that solve trust and portability, not just abundance. [Xu & Yan](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

At the orchestration level, expect more movement from static templates to adaptive runtime graphs. Skills will remain the capability unit, but the interesting systems will dynamically decide which skills, agents, and verification loops to instantiate for a given run. [Yue et al.](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md) [AI-Research-SKILLs](../raw/repos/orchestra-research-ai-research-skills.md)

The practical implication is that agent systems will increasingly look like operating systems for competence. They will manage install surfaces, permission scopes, workflow routing, evaluation hooks, and compatibility layers the same way ordinary software platforms manage processes and packages. The repos in this corpus are early versions of that future, not isolated prompt libraries. [Anthropic Skills](../raw/repos/anthropics-skills.md) [gstack](../raw/repos/garrytan-gstack.md) [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md)

That also means the hard problems in this bucket start to resemble classic platform problems: package quality, compatibility drift, lifecycle management, and trust boundaries between components. The novelty is the agent interface, but the operational shape is increasingly familiar software infrastructure. [Xu & Yan](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) [Google Cloud](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)

## Open Questions

- How should skill registries handle trust, permissions, and provenance at scale? [Xu & Yan](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)
- When should a capability be a skill versus a subagent versus a workflow graph? [Martin Fowler](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md) [Yue et al.](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)
- Can large harnesses stay modular instead of collapsing into new monoliths? [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md) [gstack](../raw/repos/garrytan-gstack.md)

## Sources

### Articles

- [Agent Skills overview](../raw/articles/agent-skills-overview.md)
- [AI agent skills complete guide](../raw/articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md)
- [Context engineering for coding agents](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)
- [Why I stopped installing agent skills and built a registry](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)

### Papers

- [Agent Skills for Large Language Models](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)
- [Workflow Optimization for LLM Agents](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)

### Repos and Tweets

- [Anthropic Skills](../raw/repos/anthropics-skills.md)
- [everything-claude-code](../raw/repos/affaan-m-everything-claude-code.md)
- [gstack](../raw/repos/garrytan-gstack.md)
- [claude-skills](../raw/repos/alirezarezvani-claude-skills.md)
- [Obsidian Skills](../raw/repos/kepano-obsidian-skills.md)
- [AI-Research-SKILLs](../raw/repos/orchestra-research-ai-research-skills.md)
- [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)
- [CORAL](../raw/repos/human-agent-society-coral.md)
- [Karpathy CLI tweet](../raw/tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md)
- [Phil Schmid tweet](../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md)
- [Steve Ruiz tweet](../raw/tweets/steveruizok-some-of-you-aren-t-soldier-proofing-your-agent-ski.md)

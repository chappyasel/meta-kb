# The State of Agent Systems

> The skill is becoming the atom of agent capability. Instead of monolithic agent implementations that embed task logic in prompts, the field is converging on modular, composable skill packages—SKILL.md files with instructions, scripts, and constraints that agents discover and load on demand. The SKILL.md standard, Anthropic's official skills repository at 110K stars, and a Cambrian explosion of community skill registries signal that agent architecture is being unbundled into portable, reusable components.

## Approach Categories

### The SKILL.md Standard and Official Skills

[Anthropic's Skills repository](../raw/repos/anthropics-skills.md) (110,064 stars) established the canonical format: SKILL.md files with YAML frontmatter (name, description, triggers) containing instructions, constraints, and associated scripts. Skills are designed to be dynamically discoverable—agents load metadata first, then pull full context only when activated (progressive disclosure).

The [Agent Skills overview](../raw/articles/agent-skills-overview.md) positions skills as portable, version-controlled knowledge packages that solve a critical gap: agents lack the procedural domain expertise needed for reliable real-world task execution. Skills bridge the gap between generic foundation models and specific context by encapsulating company-, team-, and user-specific knowledge.

The [Agent Skills survey paper](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) (Xu & Yan, 2026) provides the academic foundation, organizing the landscape along four axes: architectural foundations, skill acquisition, deployment at scale, and security. The paper's most alarming finding: **26.1% of community-contributed skills contain vulnerabilities**, motivating a proposed Skill Trust and Lifecycle Governance Framework with tiered permissions mapped to skill provenance.

### Community Skill Registries

The open-source skills ecosystem has exploded:

[Everything Claude Code](../raw/repos/affaan-m-everything-claude-code.md) (136,116 stars) is the most-starred agent harness, shipping 38 agents, 156 skills, security scanning via AgentShield, and reduced token overhead through intelligent memory management. It demonstrates the full skill composition pattern: multi-language rule architectures, automated pattern extraction into reusable skills, and continuous learning loops.

[Claude Skills](../raw/repos/alirezarezvani-claude-skills.md) (9,216 stars) provides 248 production-ready skills across 9 domains deployable across 11 platforms, with role-based skill composition (personas like Startup CTO and Growth Marketer). The cross-platform compatibility demonstrates that skills aren't Claude-specific—they're agent-agnostic when properly formatted.

[Orchestra Research AI Skills](../raw/repos/orchestra-research-ai-research-skills.md) (6,111 stars) packages 87 research skills across 22 categories, enabling autonomous research workflows from ideation through experimentation to publication. This specialization-at-scale pattern shows skills solving domain-specific orchestration, not just task execution.

[Obsidian Skills](../raw/repos/kepano-obsidian-skills.md) (19,325 stars) provides the agent-side tooling for Obsidian knowledge base operations—markdown creation, canvas visualization, CLI interaction, and web extraction. These skills shift agents from querying knowledge bases to actively authoring and maintaining them.

[Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md) (12,269 stars) solves the operationalization bottleneck by converting 17 documentation formats into conflict-detected, multi-target skill assets deployable across Claude, LangChain, LlamaIndex, and IDE tooling simultaneously.

### Skills as More Than Instructions

The [CalmOps guide](../raw/articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md) draws the crucial distinction between skills and tools: tools are individual capabilities (call an API, read a file), while skills encapsulate complete domain knowledge—decision logic, multiple tools, prompt templates, and configurations bundled as self-governing packages. A financial analysis skill doesn't just call a calculator; it knows when to use which financial model, how to interpret results, and what edge cases to watch for.

[@philschmid](../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md) warns that AI-generated skills often lack the rigor of hand-crafted implementations, proposing a systematic evaluation framework: define success criteria, create 10-12 deterministic test prompts, add LLM-as-judge for qualitative checks, and iterate using evaluation failures. Untested skills become technical debt quickly.

[@steveruizok's](../raw/tweets/steveruizok-some-of-you-aren-t-soldier-proofing-your-agent-ski.md) "soldier-proofing" pattern catches the quality problem at creation time: the best model writes a skill, a subagent executes it, iteration continues until perfect, then the process repeats with progressively smaller models. This multi-model validation makes skills portable across model tiers rather than overfitted to flagship models.

### Dynamic Skill Discovery and Progressive Loading

Static skill installation doesn't scale. The field is moving toward just-in-time skill discovery.

[Esther Lloyd's skills discovery agent](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md) demonstrates progressive disclosure at the registry level: instead of downloading all skills "just in case," a Skills Collator Agent fetches and installs skills on-demand from verified sources. The system loads only skill metadata initially and pulls full context when activated, with human-in-the-loop approval and security gating from trusted repositories only.

The [From Static Templates to Dynamic Runtime Graphs](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md) survey provides the theoretical framework, distinguishing static workflow templates (fixed before deployment), run-specific realized graphs (determined during execution), and execution traces (records of what happened). The implication: skill composition should be dynamic, not predetermined, adapting to the specific task at hand.

### Role-Based Skill Composition and Orchestration

[gstack](../raw/repos/garrytan-gstack.md) (63,766 stars) demonstrates role-based skill composition at scale: 23 specialist skills (CEO, designer, eng manager, QA, security, release engineer) implement a think-plan-build-review-test-ship-reflect sprint process. The system supports 10-15 parallel sprints via Conductor for multi-agent orchestration, with skills feeding into each other in a structured workflow. Claims of 60% year-over-year shipping velocity improvement.

[Memento-Skills](../raw/repos/memento-teams-memento-skills.md) (916 stars) adds self-evolution to skill composition: agents can read and write their own skill library at deployment time without LLM parameter updates. Failed tasks trigger skill optimization or creation of new ones through read-write reflective learning. This shifts the adaptation bottleneck from model parameters to external skill registries.

[Voyager](../raw/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md) established the foundational pattern: an ever-growing skill library of executable code with iterative self-verification, enabling rapid capability accumulation without fine-tuning. Each new skill builds on prior discoveries, creating a compounding mechanism for lifelong learning. Voyager achieved 3.3x more unique items, 2.3x longer travel distances, and 15.3x faster tech tree progression than prior methods.

### CLI-Native and Agent-Accessible Architecture

[Karpathy's CLIs tweet](../raw/tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md) (11,752 likes, 2.1M views) reframed CLI tools as the natural interface for agent systems: agents compose, chain, and extend terminal commands far more flexibly than web interfaces. Legacy CLIs become strategically valuable because agents natively understand and can combine them. The call-to-action: "It's 2026. Build. For. Agents."

The [Agentic Researcher](../raw/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md) demonstrates this in practice: methodological prompt rules turn CLI coding agents into autonomous research assistants that run 20+ hour sessions, dispatching experiments across multi-GPU clusters without human intervention. Knowledge bases for researchers must encode not just domain facts but executable workflows, verification procedures, and autonomy guardrails.

[CORAL](../raw/repos/human-agent-society-coral.md) implements CLI-native multi-agent infrastructure where each agent runs in its own git worktree with shared state symlinked for zero-sync overhead, real-time leaderboard tracking, and integration across Claude Code, OpenCode, and Codex.

## The Convergence

**Skills are becoming the standard unit of agent capability.** The SKILL.md format, Anthropic's official repository, and the cross-platform deployment patterns all point toward skills as portable, version-controlled modules that any agent can discover and use. The debate has shifted from "should agents have skills?" to "how do we govern the skill ecosystem?"

**Progressive disclosure is the dominant loading pattern.** Load metadata first, full context only when needed. This appears in Anthropic's skill loading, the skills discovery agent, and the distinction between static templates and dynamic runtime graphs. The alternative—loading everything at session start—wastes context and degrades performance.

**Security is the unsolved prerequisite.** The 26.1% vulnerability rate in community skills ([Xu & Yan](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)) means that skill ecosystems need governance frameworks before they can scale. The Google Cloud article's "verified sources only" and the survey paper's tiered permissions both address this, but no standard has emerged.

## The Divergence

**Skills as instructions vs. skills as code.** Anthropic's SKILL.md files are mostly natural language instructions with optional scripts. Voyager's skill library is executable JavaScript. CalmOps describes skills with embedded decision logic and tool orchestration. The boundary between "telling an agent what to do" and "giving an agent executable capabilities" remains blurry.

**Centralized vs. distributed skill discovery.** Some envision a central registry (npm for skills). Others prefer local, project-level skill files committed to repos. The centralized approach enables ecosystem effects but creates governance challenges; the distributed approach preserves autonomy but prevents discoverability.

**Human-authored vs. agent-generated skills.** Most production skills are human-written. Memento-Skills and Voyager demonstrate agent-generated skills through reflection and experience. The quality gap between the two is real (per philschmid) but closing.

## What's Hot Now

[Anthropic Skills](../raw/repos/anthropics-skills.md) at 110K stars and [Everything Claude Code](../raw/repos/affaan-m-everything-claude-code.md) at 136K stars dominate the landscape. [gstack](../raw/repos/garrytan-gstack.md) at 63K stars demonstrates production-scale role-based composition. [Obsidian Skills](../raw/repos/kepano-obsidian-skills.md) at 19K stars shows the knowledge-base-specific angle.

The Agent Skills survey paper's vulnerability finding (26.1%) has surfaced a nascent conversation about skill governance, trust models, and supply-chain security for agent capabilities—echoing the same debates the npm and PyPI ecosystems went through.

Karpathy's "Build. For. Agents." message has shifted how developers think about product architecture: CLI-first, MCP-accessible, with skills and docs exported as markdown for agent consumption.

## Where It's Going

**Skill marketplaces will emerge.** The npm-for-skills analogy is inevitable. As the SKILL.md format standardizes, registries with versioning, dependency management, and trust scoring will appear. The first movers will likely be Anthropic (official registry), the community (open registries like Everything Claude Code), and enterprises (private skill registries).

**Skills will compose into workflows.** Individual skills solve individual tasks. The next layer is automatic workflow composition—agents selecting and sequencing skills based on the goal, using the dynamic graph patterns from the [Yue et al. survey](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md). This is where orchestration frameworks like gstack's Conductor point.

**Agent-generated skills will become the norm.** As self-improving loops mature (see [self-improving.md](self-improving.md)), agents will generate, test, and refine their own skills through experience. The human role shifts from writing skills to defining evaluation criteria and approving skill promotions.

## Open Questions

- What's the right granularity for a skill? A single API call? A complete workflow? The field hasn't converged.
- How do you version skills when the underlying model changes? A skill optimized for Sonnet may not work on Opus.
- How do you handle skill conflicts when multiple skills apply to the same context?
- What's the right permission model for skills that modify files, access networks, or execute code?
- Can skills be automatically tested for correctness, security, and performance before deployment?

## Sources

**Articles**
- [Agent Skills Overview](../raw/articles/agent-skills-overview.md)
- [CalmOps — Complete Guide to Agent Skills](../raw/articles/calmops-ai-agent-skills-complete-guide-2026-building-reus.md)
- [Esther Lloyd — Skills Discovery Agent](../raw/articles/google-cloud-community-why-i-stopped-installing-agent-skills-and-built-a.md)

**Papers**
- [Xu & Yan — Agent Skills for LLMs](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)
- [Wang et al. — Voyager](../raw/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)
- [Yue et al. — Static to Dynamic Runtime Graphs](../raw/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md)
- [Zimmer et al. — The Agentic Researcher](../raw/papers/zimmer-the-agentic-researcher-a-practical-guide-to-ai-as.md)

**Tweets**
- [Karpathy — CLIs for Agents](../raw/tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md)
- [philschmid — Skill Evaluation](../raw/tweets/philschmid-agent-skills-are-powerful-but-they-are-often-ai-ge.md)
- [steveruizok — Soldier-Proofing Skills](../raw/tweets/steveruizok-some-of-you-aren-t-soldier-proofing-your-agent-ski.md)

**Repos**
- [Anthropic Skills](../raw/repos/anthropics-skills.md) — [Everything Claude Code](../raw/repos/affaan-m-everything-claude-code.md)
- [gstack](../raw/repos/garrytan-gstack.md) — [Claude Skills](../raw/repos/alirezarezvani-claude-skills.md)
- [Obsidian Skills](../raw/repos/kepano-obsidian-skills.md) — [Skill Seekers](../raw/repos/yusufkaraaslan-skill-seekers.md)
- [Orchestra Research Skills](../raw/repos/orchestra-research-ai-research-skills.md)
- [Memento-Skills](../raw/repos/memento-teams-memento-skills.md) — [CORAL](../raw/repos/human-agent-society-coral.md)

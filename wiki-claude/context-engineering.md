# The State of Context Engineering

> Context engineering is prompt engineering's grown-up successor. The field has moved from "write a better prompt" to "systematically curate the finite attention budget across multi-turn agent loops." The core insight is now formalized: every token in the context window competes for attention, context degrades predictably as it grows (context rot), and the discipline of managing this is as important as the model itself.

## Approach Categories

### Context Engineering as a Discipline

Two landmark pieces have formalized context engineering as its own field.

[Anthropic's guide](../raw/articles/effective-context-engineering-for-ai-agents.md) reframes LLM optimization from discrete prompt crafting to continuous curation of a finite "attention budget." The key insight: context engineering is about finding the smallest set of high-signal tokens that maximize likelihood of desired outcomes. The article identifies context rot—performance degradation as context length increases—and presents three mitigation techniques: compaction (summarizing conversation history), structured note-taking (agentic memory), and sub-agent architectures (specialized agents with clean context windows).

[Mei et al.'s survey](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) of 1,400+ papers formalizes the taxonomy into retrieval, generation, processing, and management. The critical finding: there's a fundamental asymmetry between LLM comprehension and generation capabilities. Models can understand remarkably complex contexts but struggle to generate equally sophisticated outputs. This means knowledge bases must be architected to work around limited output sophistication, not just input capacity.

[Birgitta Böckeler's Martin Fowler article](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md) brings practitioner clarity, distinguishing between instructions (telling agents to do something) and guidance (general conventions to follow), and categorizing who decides what context gets loaded: the LLM (Skills), the human (slash commands), or the software (hooks). The crucial warning: larger context windows don't equate to better agent performance.

### CLAUDE.md and Instruction Layering

The CLAUDE.md pattern has become the de facto standard for coding agent context, but the community is learning that stuffing everything into one file is an anti-pattern.

[@PawelHuryn](../raw/tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md) identifies four distinct mechanisms that CLAUDE.md often conflates: **rules** (file-path-triggered context), **hooks** (deterministic code execution on events), **skills** (isolated instruction/tool/constraint packages), and **agents** (independent models with their own tools). Modular decomposition forces explicit instruction engineering and enables verifiable execution at scale.

[@akshay_pachaar's](../raw/tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md) viral setup guide (12,222 likes, 2M views) codifies the pattern: `.claude/` as infrastructure, not ad-hoc prompting. CLAUDE.md as instruction manual, `rules/` for repeatable conventions, `commands/` for workflows, `skills/` for context-triggered automation, `agents/` for isolated subagents. Two scopes: project-level (committed to repo) and global (~/.claude/ for personal preferences).

[@omarsar0](../raw/tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md) documents claims of 63% token savings through upfront format expectations in CLAUDE.md files—demonstrating that proper context engineering is as impactful as model selection when operating under context constraints.

### Context Compression and Token Optimization

As agents run longer and knowledge bases grow larger, compression becomes a first-class concern.

[LLMLingua](../raw/repos/microsoft-llmlingua.md) (5,985 stars) is the most cited compression framework, achieving up to 20x prompt compression with minimal performance loss through selective token removal. LLMLingua identifies non-essential tokens using small models; LongLLMLingua mitigates lost-in-the-middle issues; LLMLingua-2 uses data distillation for 3-6x faster performance. Integrated into LangChain and LlamaIndex with peer-reviewed papers at EMNLP'23 and ACL'24.

[SWE-Pruner](../raw/repos/ayanami1314-swe-pruner.md) tackles code-specific compression through self-adaptive, task-aware pruning that preserves syntactic structures essential for code understanding while achieving 23-54% token reduction. The innovation: agents articulate explicit goals (e.g., "focus on error handling") that guide compression, with a lightweight 0.6B neural skimmer trained to select relevant code lines dynamically.

[Context compression experiments](../raw/repos/laurian-context-compression-experiments-2508.md) demonstrate that prompt optimization via genetic algorithms (DSPy GEPA) and gradient-based methods (TextGrad) can recover 30%+ of failed compressions without model upgrading. The hybrid approach achieved 100% extraction rate on 296 previously-failing cases.

[Lossless Context Management](../raw/repos/martian-engineering-lossless-claw.md) (3,963 stars) takes the opposite approach: instead of lossy compression, it uses DAG-based hierarchical summarization where older messages are progressively summarized without information loss. Agents can search and recover details from compacted history—true lossless recall at any conversation depth.

### Evolving Contexts and Playbooks

A newer thread treats context not as static configuration but as a living artifact that evolves through execution.

[ACE (Agentic Context Engineering)](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md) demonstrates that treating contexts as modular playbooks with structured, incremental updates prevents context collapse—where iterative rewriting erodes details. ACE achieves +10.6% on agent benchmarks and +8.6% on finance while reducing adaptation latency, without labeled supervision. The key mechanism: natural execution feedback drives context evolution.

[Planning-with-Files](../raw/repos/othmanadi-planning-with-files.md) (17,968 stars) replicates the Manus pattern using persistent markdown files as external memory: task_plan.md, findings.md, and progress.md provide session continuity when token limits force context resets. A 96.7% pass rate and A/B blind test wins validate the approach.

[Acontext](../raw/repos/memodb-io-acontext.md) (3,264 stars) bridges context engineering and memory by treating agent learning as skill files rather than opaque vector stores. When tasks complete, an LLM distills what worked into SKILL.md files—human-readable, editable, and portable. This makes context evolution transparent and version-controllable.

### Context Graphs and Organizational Knowledge

The most ambitious vision reimagines context as a graph structure encoding organizational judgment, not just individual knowledge.

[@akoratana](../raw/tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md) frames context graphs as the next fundamental platform: "Context graphs will be to the 2030s what databases were to the 1970s." The argument: organizational scalability is an exponential coordination problem currently solved through lossy hierarchical compression (managers summarize for executives). Context graphs replace this with direct access to decision traces and reasoning, enabling agents to operate with organizational judgment rather than local memory alone.

This shifts the paradigm from "give agents memory" to "give agents organizational judgment"—requiring knowledge bases restructured from document-centric to decision-centric architecture. The decision trace (why was this choice made, what alternatives were considered, what constraints applied) becomes more valuable than the decision itself.

## The Convergence

**Context is a budget, not a container.** The container metaphor ("fill the context window with relevant stuff") is being replaced by a budget metaphor ("every token competes for attention, spend wisely"). Anthropic's "attention budget" framing, LLMLingua's selective compression, and SWE-Pruner's task-aware pruning all reflect this shift. The implication: the right question isn't "what can I fit?" but "what's the minimum context that maximizes performance?"

**Modular decomposition over monolithic files.** The movement from a single CLAUDE.md to rules/hooks/skills/agents mirrors the broader software engineering pattern of separating concerns. Monolithic context files hit the same problems as monolithic codebases: they're hard to test, hard to version, and hard to reason about at scale.

**Context should evolve, not just accumulate.** ACE's playbook evolution, Acontext's skill distillation, and planning-with-files' persistent state all demonstrate that effective context is maintained through active curation—not passive accumulation. Static context rots; living context improves.

## The Divergence

**Compression vs. selection.** LLMLingua compresses everything to fit more in. SWE-Pruner selects what matters and discards the rest. The tradeoff: compression preserves more information but at lower fidelity; selection preserves full fidelity for what it keeps but risks missing relevant context. No system dynamically chooses between the two based on the query.

**Agent-driven vs. system-driven context loading.** Skills let the LLM decide what context to load. Hooks let deterministic code decide. Rules trigger on file paths. The [Martin Fowler article](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md) identifies this as a fundamental design decision with no clear winner—agent-driven loading is more adaptive but less predictable.

**Individual vs. organizational context.** Most implementations focus on individual agent context. The context graph vision ([akoratana](../raw/tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md)) is about organizational context—decision traces, reasoning chains, and institutional knowledge. The gap between these two scales is where the biggest opportunities live.

## What's Hot Now

The Martin Fowler article and Anthropic's context engineering guide have elevated context engineering from a craft practice to a recognized discipline. [akshay_pachaar's CLAUDE.md guide](../raw/tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md) hit 2M views, suggesting massive practitioner demand for structured context management.

[OpenViking](../raw/repos/volcengine-openviking.md) (20,813 stars) provides a production context database with L0/L1/L2 tiered loading, automatic session compression, and self-iteration loops. [Planning-with-Files](../raw/repos/othmanadi-planning-with-files.md) at 17,968 stars is the most-starred Manus-pattern implementation.

The [Context Engineering Survey](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) (covering 1,400+ papers) signals that the academic community now recognizes this as a distinct research area, not a subset of prompt engineering.

## Where It's Going

**Context engineering will become infrastructure, not application code.** The pattern of CLAUDE.md + rules + hooks + skills is moving toward being a standard layer in the agent stack, analogous to how ORMs standardized database access. Frameworks will handle context lifecycle management (loading, pruning, updating, compacting) rather than developers implementing it ad hoc.

**Compression will become model-aware and task-aware.** Current compression is mostly content-agnostic. Future systems will understand which tokens matter for which tasks and compress accordingly—SWE-Pruner's task-aware approach for code will generalize to prose, data, and multi-modal content.

**Context graphs will emerge as the enterprise play.** Individual context management is a solved-enough problem. The unsolved problem is organizational context: how do you give an agent access to the reasoning and decisions that shaped an organization's current state? This requires a fundamentally different infrastructure than individual memory systems.

## Open Questions

- What's the optimal context window utilization? Evidence suggests that using less context often produces better results, but no one has quantified the optimal ratio.
- How do you detect and prevent context rot in production? Current systems lack online metrics for context quality degradation.
- Can context engineering be automated? If an LLM can manage its own memory, can it also learn to optimize its own context loading strategy?
- What's the right interface for organizational context? Decision traces, reasoning chains, and institutional knowledge don't fit neatly into any existing storage paradigm.
- How do you handle conflicting context from multiple sources (team rules vs. project rules vs. user preferences)?

## Sources

**Articles**
- [Anthropic — Effective Context Engineering](../raw/articles/effective-context-engineering-for-ai-agents.md)
- [Birgitta Böckeler — Context Engineering for Coding Agents](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)

**Papers**
- [Mei et al. — Survey of Context Engineering](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)
- [Zhang et al. — Agentic Context Engineering (ACE)](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)

**Tweets**
- [akshay_pachaar — CLAUDE.md Setup](../raw/tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md)
- [PawelHuryn — Instruction Layering](../raw/tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md)
- [omarsar0 — Universal CLAUDE.md](../raw/tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md)
- [akoratana — Context Graphs](../raw/tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md)

**Repos**
- [LLMLingua](../raw/repos/microsoft-llmlingua.md) — [SWE-Pruner](../raw/repos/ayanami1314-swe-pruner.md)
- [Lossless Claw](../raw/repos/martian-engineering-lossless-claw.md) — [Context Compression Experiments](../raw/repos/laurian-context-compression-experiments-2508.md)
- [Planning-with-Files](../raw/repos/othmanadi-planning-with-files.md) — [Acontext](../raw/repos/memodb-io-acontext.md)
- [OpenViking](../raw/repos/volcengine-openviking.md)

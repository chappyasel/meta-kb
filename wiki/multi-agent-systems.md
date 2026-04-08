---
title: The State of Multi-Agent Systems
type: synthesis
bucket: multi-agent-systems
abstract: >-
  Multi-agent systems that survive production share three properties:
  filesystem-based coordination, harness-level optimization over model-level
  improvement, and subscription-driven message routing. Projects that ignored
  these converged on them or lost adoption.
source_date_range: 2025-01-20 to 2026-04-08
newest_source: '2026-04-08'
staleness_risk: low
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/anthropics-skills.md
  - repos/mem0ai-mem0.md
  - repos/human-agent-society-coral.md
  - deep/repos/greyhaven-ai-autocontext.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/human-agent-society-coral.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - repos/getzep-graphiti.md
  - repos/safishamsi-graphify.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/anthropics-skills.md
  - repos/michaelliv-napkin.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/garrytan-gstack.md
  - deep/repos/foundationagents-metagpt.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
entities:
  - multi-agent-systems
  - crewai
  - metagpt
  - hyperagents
  - autogen
  - meta-agent
  - metagpt-agent
  - agent-mediated-workflows
last_compiled: '2026-04-08T02:22:25.401Z'
---
# The State of Multi-Agent Systems

67% to 87%. That is the holdout accuracy jump that [Meta-Agent](concepts/meta-agent.md) achieved on [Tau-bench](projects/tau-bench.md) v3 airline tasks by optimizing only the harness layer around Haiku 4.5, with zero fine-tuning and zero changes to the model itself [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md). The gap between a vanilla agent and a well-configured one, using the same model on the same benchmark, consistently exceeds the gap between model generations. Practitioners who spend their budget on model upgrades before optimizing their harness are leaving most of their performance on the table.

## Approach Categories

### How do multiple agents coordinate without a central orchestrator?

The subscription-based approach, pioneered by [MetaGPT](projects/metagpt.md) (66,769 stars), encodes coordination as message topology. Each agent role calls `_watch()` to subscribe to upstream action types, and the Environment acts as a pub-sub bus where messages carry `cause_by` metadata. Adding a new role requires only defining which outputs it watches. Zero changes to existing roles or coordination logic [Source](../raw/deep/repos/foundationagents-metagpt.md).

[AutoGen](projects/autogen.md) (42,000+ stars) takes a conversational approach: agents exchange natural language messages in flexible patterns (sequential, group chat, nested). Microsoft designed it for rapid prototyping of multi-agent conversations rather than structured production pipelines.

[CORAL](projects/openclaw.md) (120 stars) uses the filesystem as its coordination bus. Each agent runs in an isolated git worktree, and shared state (attempts, notes, skills) lives in `.coral/public/` symlinked into every worktree. Agents see each other's discoveries with zero sync overhead. No database, no message queue, no API [Source](../raw/deep/repos/human-agent-society-coral.md).

**Tradeoff**: Subscription-based routing (MetaGPT) wins when you need deterministic, repeatable pipelines. Conversational routing (AutoGen) wins for exploratory or research workflows where the interaction pattern cannot be predicted. Filesystem coordination (CORAL) wins for optimization loops where agents must share knowledge across long-running experiments.

**Failure mode**: MetaGPT's `Environment.publish_message()` silently drops messages when no role's `member_addrs` matches the routing. In complex pipelines with dynamic role addition, tasks can vanish without any error signal [Source](../raw/deep/repos/foundationagents-metagpt.md).

### How does a meta-agent improve other agents without human intervention?

[Meta-Agent](concepts/meta-agent.md) reads production traces, scores them with an [LLM-as-Judge](concepts/llm-as-judge.md), and proposes targeted harness updates (prompts, hooks, tools, subagents). Updates survive only if they improve holdout accuracy. The critical insight: LLM-judge-based search on unlabeled traces reached 87% holdout, while labeled search reached only 80% in the same setup [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

[Autocontext](projects/antigravity.md) (695 stars) deploys five specialized agents per generation: a Competitor proposes strategies, an Analyst diagnoses failures, a Coach updates playbooks, an Architect proposes tooling changes, and a Curator gates what knowledge persists. Each agent has a narrow responsibility, producing cleaner feedback signals than a single agent attempting everything. The system tracks credit assignment across components using `analytics/credit_assignment.py`, determining which changes (playbook, tools, hints, strategy) actually drove score improvements [Source](../raw/deep/repos/greyhaven-ai-autocontext.md).

[SICA](projects/darwin-godel-machine.md) (299 stars) takes a more radical approach: the coding agent modifies its own source code. Tools, reasoning structures, and sub-agents are rewritten inside Docker sandboxes, evaluated against benchmarks, and kept or discarded based on confidence-interval-aware selection. SWE-Bench Verified accuracy went from 17% to 53% across 14 iterations through scaffold-only changes [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md).

**Tradeoff**: Meta-Agent and Autocontext modify knowledge and configuration around the agent (lower risk, easier rollback). SICA modifies the agent's own code (higher leverage, higher variance, path-dependent). Both approaches plateau on reasoning-bound tasks where the underlying model is the bottleneck.

**Failure mode**: Autocontext's five-agent chain creates trust dependencies. If the Analyst misdiagnoses a failure, the Coach encodes a bad lesson in the playbook, which persists through the Curator if it seems plausible. A single misdiagnosis propagates through the entire knowledge layer [Source](../raw/deep/repos/greyhaven-ai-autocontext.md).

### How do agents share and accumulate knowledge across sessions?

The skill file pattern treats agent memory as structured markdown rather than opaque vectors. [Anthropic's Skills](projects/anthropic.md) repo (110,064 stars) establishes a three-tier [Progressive Disclosure](concepts/progressive-disclosure.md) architecture: metadata (~100 tokens, always in context), SKILL.md body (loaded on trigger), and bundled resources (loaded on demand) [Source](../raw/deep/repos/anthropics-skills.md).

[Acontext](projects/ace.md) (3,300 stars) implements a three-stage learning pipeline where raw agent execution traces are classified by an LLM-as-judge into SOPs, failure warnings, or factual content, then organized into structured skill files. Progressive disclosure via tool calls means the agent reasons about what context it needs rather than relying on embedding similarity [Source](../raw/deep/repos/memodb-io-acontext.md).

[Hipocampus](projects/ace.md) (145 stars) maintains a ~3K-token compressed topic index (ROOT.md) that acts as an always-loaded table of contents for everything the agent has discussed. On the MemAware benchmark, this approach scored 21x better than no memory and 5.1x better than search alone on implicit context recall [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md).

**Tradeoff**: Skill files (Anthropic, Acontext) are human-readable, editable, and portable, but require agent reasoning quality for retrieval. Vector-based memory ([Mem0](projects/mem0.md), 51,880 stars) automates retrieval but produces opaque representations that you cannot inspect or debug.

**Failure mode**: Skill libraries hit a phase transition. Beyond a critical size, the agent's ability to select the right skill degrades sharply. A survey of the field documented this finding across multiple implementations, noting that no current architecture addresses the scaling limit [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md).

### How do you optimize the code around the model rather than the model itself?

[Meta-Harness](concepts/agent-harness.md) automates harness optimization by giving a coding agent filesystem access to all prior candidates' source code, execution traces, and scores. The critical ablation: full execution trace access yielded 50.0 median accuracy versus 34.6 with scores only and 34.9 with scores plus summaries. Compressed summaries destroy the causal signal needed for systematic improvement [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

[Everything Claude Code](projects/claude-code.md) (136,116 stars) takes the curation approach: 156 skills, 38 agents, 72 legacy commands across 12 language ecosystems with a manifest-driven selective install system. At this scale, the hard problem shifts from individual skill quality to skill governance: conflict detection, install profiles, hook runtime controls, cross-harness parity [Source](../raw/deep/repos/affaan-m-everything-claude-code.md).

**Tradeoff**: Automated harness search (Meta-Harness, Meta-Agent) finds solutions humans would miss but costs ~10 million tokens per iteration. Manual curation (Everything Claude Code, [gstack](projects/ace.md)) gives predictable quality but cannot adapt to production failure patterns.

**Failure mode**: Meta-Harness requires a capable proposer (Opus-class model) and substantial compute. The discovered harness modifications on TerminalBench-2 were evaluated on the same 89 tasks used for optimization, with no held-out set, creating specialization risk [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

## The Convergence

**All production multi-agent systems now use the filesystem as their primary coordination mechanism.** CORAL symlinks a shared `.coral/public/` directory into each agent's worktree [Source](../raw/deep/repos/human-agent-society-coral.md). Autocontext persists playbooks, tools, and hints as files organized by scenario [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). pi-autoresearch writes experiment state to `autoresearch.jsonl` and `autoresearch.md` so a fresh agent can resume exactly where the previous session left off [Source](../raw/deep/repos/davebcn87-pi-autoresearch.md). MetaGPT, despite its pub-sub message routing, uses `ProjectRepo` as the primary shared state mechanism where roles coordinate by reading/writing to known file paths [Source](../raw/deep/repos/foundationagents-metagpt.md). The holdout against this pattern was AutoGen, which originally relied on in-memory conversation objects. Even AutoGen now supports persistent conversation state.

**All serious harness optimization systems now require full execution trace access, not summaries.** Meta-Harness's ablation proved this definitively: scores-only yields 34.6, scores+summaries yields 34.9, full filesystem access yields 50.0 [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). Meta-Agent stores per-task traces alongside scores so the proposer can read failure patterns [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md). SICA generates contextual summaries via LLM analysis of full execution traces and stores results in JSONL files for its archive explorer [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md). The system that held out longest was [DSPy](projects/dspy.md), which optimizes prompts based on metric scores rather than trace inspection. DSPy remains effective for prompt-level optimization but does not compete on harness-level changes.

**All multi-agent skill systems now enforce progressive disclosure with metadata-first triggering.** Anthropic's spec defines three tiers: ~100-token metadata always loaded, instructions on trigger, resources on demand [Source](../raw/deep/repos/anthropics-skills.md). gstack generates SKILL.md files from source code metadata via templates, with CI freshness checks ensuring documentation never drifts from implementation [Source](../raw/deep/repos/garrytan-gstack.md). Ars Contexta derives its entire knowledge structure from a graph of 249 research claims, but the output follows the same pattern: session-orient loads minimal context, with deeper files retrieved on demand [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md). napkin achieves 92% accuracy on LongMemEval Oracle using only BM25 search on progressively disclosed markdown files, with no embeddings at all [Source](../raw/repos/michaelliv-napkin.md).

## What the Field Got Wrong

The assumption: **more agents produce better results**. MetaGPT's original software company pipeline (ProductManager → Architect → ProjectManager → Engineer → QaEngineer) reflects this belief, and early papers on multi-agent debate, review committees, and agent ensembles reinforced it.

The evidence against it: SICA's self-improvement loop uses a single unified agent that modifies its own code and achieved a 3x improvement on SWE-Bench Verified (17% to 53%) through scaffold-only changes. No additional agents were needed [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md). Meta-Harness achieves state-of-the-art results with a single proposer agent reading execution traces [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). The agent skills survey found that multi-agent systems can be "compiled" into single-agent skill libraries with reduced token usage and lower latency while maintaining accuracy [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md).

What replaced it: the insight that agent count matters less than information architecture. A single agent with full trace access, structured skill files, and progressive disclosure outperforms a five-agent pipeline where each agent operates on compressed or partial context. Autocontext's five-agent design works not because five agents are better than one, but because each agent operates with focused context on a narrow responsibility. The number is a consequence of the information architecture, not the cause of performance.

## Deprecated Approaches

**Centralized orchestrator with explicit step sequencing.** Early multi-agent frameworks required a controller that explicitly called each agent in order, passing outputs between them. This seemed right because it gave developers visibility and control. MetaGPT's subscription-based routing killed it: defining `_watch()` subscriptions creates the same pipeline with zero coordination code, and adding new roles requires no changes to existing agents. [CrewAI](projects/crewai.md) still offers explicit task sequencing but its adoption growth slowed as subscription-based patterns became standard.

**Prompt-only optimization for agent improvement.** Pre-2025, practitioners assumed prompt engineering was sufficient to fix agent failures. Meta-Harness demonstrated that harness-level changes (retrieval logic, routing decisions, memory management, stop conditions) produce performance gaps up to 6x on the same benchmark with the same model [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). Meta-Agent's most impactful improvement was moving business rules into a skill file rather than the system prompt, raising holdout accuracy from 73% to 80% in a single step [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md). Prompt optimization remains useful within a well-designed harness but is no longer treated as the primary optimization surface.

**Vector-only memory retrieval for agent context.** The assumption that embedding similarity search would solve agent memory failed on implicit recall tasks. Hipocampus's compaction tree with a 3K-token topic index scored 17.3% on MemAware versus 3.4% for BM25+vector search [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md). [Graphiti](projects/graphiti.md) (24,473 stars) demonstrated that structured temporal knowledge graphs with bi-temporal indexing achieve 18.5% accuracy gains over full-context baselines on temporal reasoning tasks [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). napkin matched prior state-of-the-art on LongMemEval using only BM25 on markdown files [Source](../raw/repos/michaelliv-napkin.md). Vector search remains one signal among several, but the field has abandoned it as a standalone solution.

## Failure Modes

**Playbook drift in long-running optimization loops.** Autocontext's coach and curator accumulate lessons across generations. Over time, contradictory lessons coexist without explicit conflict resolution. The `AUTOCONTEXT_SKILL_MAX_LESSONS` cap may discard useful older lessons via FIFO rather than quality-based pruning [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). CORAL's notes system has no pruning mechanism at all, allowing outdated information to persist indefinitely [Source](../raw/deep/repos/human-agent-society-coral.md).

**Path dependence in self-modifying agents.** SICA's authors document this explicitly: "poor quality initial feature suggestions (e.g. fixating on caching open files) often lower the quality of subsequent feature suggestions." Different runs from the same starting point produce different trajectories, and there is no mechanism for global restart [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md).

**Silent message dropping in pub-sub coordination.** MetaGPT's `Environment.publish_message()` logs a warning but silently drops messages when no role matches the routing. In dynamic pipelines where roles are added or removed at runtime, tasks vanish. The TeamLeader in MGX mode partially addresses this by intercepting all messages, but becomes a single point of failure [Source](../raw/deep/repos/foundationagents-metagpt.md).

**Context exhaustion in multi-agent pipelines.** pi-autoresearch tracks token consumption per iteration and proactively detects context exhaustion, triggering auto-resume in a fresh session. But the 5-minute cooldown and 20-turn cap on auto-resume mean rapid context exhaustion can stall the loop until a human intervenes [Source](../raw/deep/repos/davebcn87-pi-autoresearch.md). Every Claude Code agent allocates ~200K tokens total, with system prompts consuming ~10K, rules consuming 5-8K, and each MCP tool definition consuming 2-5K. gstack recommends enabling no more than 10 MCPs per project to preserve ~70K tokens for actual work [Source](../raw/deep/repos/affaan-m-everything-claude-code.md).

**Skill trigger misfires at scale.** Anthropic's skill-creator warns that Claude tends to not invoke skills when they would be useful ("undertriggering"). The mitigation is writing "pushy" descriptions, but overly broad descriptions trigger inappropriately. The skills survey documented a phase transition: beyond a critical library size, selection accuracy degrades sharply [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md). There is no mechanism for skill-level token budgeting or priority-based unloading when multiple skills activate simultaneously [Source](../raw/deep/repos/anthropics-skills.md).

## Selection Guide

- **If you need a structured software development pipeline**, use [MetaGPT](projects/metagpt.md) (66,769 stars). Its subscription-based coordination and ProjectRepo shared state handle the PM → Architect → Engineer → QA flow with minimal orchestration code.

- **If you need to optimize an existing agent's performance from production traces**, use Meta-Agent. It works on unlabeled traces with LLM judges as surrogate evaluators, reaching 87% holdout accuracy on tau-bench from a 67% baseline [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md). Currently supports Claude Agent SDK.

- **If you need parallel agents competing on an optimization problem**, use CORAL (120 stars). Its git worktree isolation with symlinked shared state handles multi-agent evolutionary search with no infrastructure beyond git [Source](../raw/repos/human-agent-society-coral.md).

- **If you need agent memory that tracks how facts change over time**, use [Graphiti](projects/graphiti.md) (24,473 stars) or [Zep](projects/zep.md). Bi-temporal indexing, entity resolution, and temporal edge invalidation handle evolving knowledge correctly. Requires Neo4j (or FalkorDB/Kuzu/Neptune).

- **If you need agent memory with zero infrastructure**, use [Hipocampus](projects/ace.md) (145 stars) for proactive recall via compaction tree, or [napkin](projects/obsidian.md) (264 stars) for BM25 search on markdown. Both are file-based, no database required.

- **If you need a persistent memory layer that works across any LLM**, use [Mem0](projects/mem0.md) (51,880 stars). It abstracts memory across user/session/agent levels and reports 26% accuracy gains over OpenAI Memory with 90% token reduction [Source](../raw/repos/mem0ai-mem0.md). These numbers are self-reported.

- **If you need rapid prototyping of conversational multi-agent patterns**, use [AutoGen](projects/autogen.md). Flexible communication patterns and low setup cost make it suitable for research and exploration. Avoid for production pipelines requiring deterministic behavior.

- **If you need to structure a single AI agent as a virtual engineering team**, use gstack (63,766 stars). Its sprint-as-DAG pipeline (Think → Plan → Build → Review → Test → Ship) with 23 specialist roles and parallel session support handles solo developer throughput multiplication. Avoid if your workflow does not match product development [Source](../raw/deep/repos/garrytan-gstack.md).

- **Avoid [CrewAI](projects/crewai.md) for new projects requiring complex coordination.** Its explicit task sequencing model scales poorly compared to MetaGPT's subscription-based routing or CORAL's filesystem coordination.

## The Divergence

### Harness optimization by search vs. by curation

One camp automates harness discovery. Meta-Harness runs an unconstrained search over harness code, processing ~10 million tokens per iteration [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). Meta-Agent scores unlabeled traces with LLM judges and proposes targeted updates [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md). Autocontext runs a five-agent generation loop with Elo-based scoring [Source](../raw/deep/repos/greyhaven-ai-autocontext.md).

The other camp curates harness configurations manually. [Everything Claude Code](projects/claude-code.md) maintains 156 skills with a manifest-driven install system, CI freshness checks, and a 1,723-test suite [Source](../raw/deep/repos/affaan-m-everything-claude-code.md). gstack encodes Garry Tan's exact development process as 23 specialist skills [Source](../raw/deep/repos/garrytan-gstack.md). Anthropic publishes curated skills with a skill-creator meta-skill that teaches Claude to build more skills [Source](../raw/deep/repos/anthropics-skills.md).

Automated search wins when you have a measurable metric and can afford the token budget. Manual curation wins when you need predictable, auditable behavior across a team. Both camps are shipping and growing.

### Skill files vs. vector memory vs. temporal graphs

Three competing memory architectures serve different retrieval needs. Skill files (Anthropic Skills, Acontext, Ars Contexta) store knowledge as human-readable markdown with progressive disclosure. You can read them, edit them, version them. Retrieval depends on agent reasoning quality.

Vector memory ([Mem0](projects/mem0.md), standard RAG) automates retrieval through embedding similarity. You get recall without reasoning but lose inspectability. The 26% accuracy gain and 90% token reduction that Mem0 reports over full-context approaches validate the pattern for production chat applications [Source](../raw/repos/mem0ai-mem0.md).

Temporal knowledge graphs ([Graphiti](projects/graphiti.md)/[Zep](projects/zep.md)) track how facts change over time with bi-temporal indexing and entity resolution. The 18.5% accuracy gain on LongMemEval temporal reasoning validates this for domains where information evolves [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). The infrastructure cost (Neo4j + LLM extraction pipeline with 4-5 calls per episode) limits adoption to teams with dedicated backend resources.

### Unified agent vs. specialist committee

SICA demonstrates that a single agent modifying its own scaffold can achieve dramatic improvements (3x on SWE-Bench) [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md). gstack's Review Army dispatches seven specialist subagents in parallel, with fingerprint-based deduplication and confidence boosting when multiple specialists flag the same issue [Source](../raw/deep/repos/garrytan-gstack.md). MetaGPT's MGX mode introduces a TeamLeader that dynamically routes to specialists [Source](../raw/deep/repos/foundationagents-metagpt.md).

The unified agent wins on simplicity, cost, and iteration speed. The specialist committee wins on coverage and error detection. Both patterns coexist within the same frameworks: MetaGPT maintains both fixed-SOP (deterministic pipeline) and RoleZero (dynamic tool use) modes for exactly this reason.

### Static skills vs. self-evolving skills

Everything Claude Code's Instinct system v2 uses deterministic `PreToolUse`/`PostToolUse` hooks to capture every tool call, builds atomic "instincts" with confidence scores (0.3 to 0.9), and aggregates 3+ related instincts into full SKILL.md files via the `/evolve` command [Source](../raw/deep/repos/affaan-m-everything-claude-code.md). Autocontext's coach agent updates playbooks with lessons from each generation, gated by a curator agent [Source](../raw/deep/repos/greyhaven-ai-autocontext.md).

Most skill systems remain static: Anthropic's skills, gstack's skills, and CORAL's skills are files that do not change at runtime. The skill-creator meta-skill closes the loop at development time but not at production time [Source](../raw/deep/repos/anthropics-skills.md). The split is between teams that want predictable, auditable behavior (static) and teams that want agents to improve autonomously (evolving).

## What's Hot Now

Meta-Agent launched on April 7, 2026, demonstrating LLM-judge-based harness optimization on unlabeled production traces. It currently supports Claude Agent SDK with plans for Codex SDK and OpenCode SDK [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

CORAL published its paper ("Towards Autonomous Multi-Agent Evolution for Open-Ended Discovery") on April 3, 2026, formalizing the git-worktree-based multi-agent coordination pattern with support for Claude Code, Codex, and OpenCode [Source](../raw/repos/human-agent-society-coral.md).

Anthropic's skills repo passed 110,000 stars, driven by the Agent Skills specification at agentskills.io and the launch of skill marketplace distribution via Claude Code plugins. The skill-creator meta-skill with its eval-driven iteration loop has become the reference pattern for skill authoring [Source](../raw/deep/repos/anthropics-skills.md).

gstack crossed 63,000 stars after Garry Tan open-sourced his complete development workflow. The Review Army pattern (seven parallel specialist subagents for code review) and the self-learning roadmap (Instinct-based continuous learning from tool observations) represent the most ambitious production skill system from a single practitioner [Source](../raw/deep/repos/garrytan-gstack.md).

Graphiti reached 24,473 stars with the addition of Kuzu and Neptune as graph backends, broadening deployment options beyond Neo4j. The MCP server implementation enables Claude, Cursor, and other MCP clients to interact with temporal context graphs directly [Source](../raw/repos/getzep-graphiti.md).

The agent skills survey (Xu & Yan, February 2026) documented a 26.1% vulnerability rate across 42,447 community-contributed skills, including 157 confirmed malicious skills with a single industrialized actor responsible for 54.1% of malicious cases. This finding is accelerating adoption of four-tier governance frameworks for skill ecosystems [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md).

## Open Questions

**How do you detect and resolve contradictions in accumulated agent knowledge?** Autocontext's curator gates new lessons but cannot detect contradictions with lessons accepted months ago. Graphiti's temporal edge invalidation handles factual contradictions (newer supersedes older) but not strategic contradictions (two valid approaches for different contexts). No system provides principled multi-timescale conflict resolution.

**Where is the phase transition in skill library size?** The agent skills survey identified a sharp degradation in selection accuracy beyond a critical library size, but did not characterize the threshold or how it varies across models. Practitioners building skill registries do not know whether to target 50, 200, or 1,000 skills before routing architecture becomes mandatory.

**Can harness optimization transfer across models?** Meta-Harness discovers harnesses that transfer across 5 held-out models for math retrieval [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md), but Meta-Agent's harness improvements are validated only on the same model used during search. Whether a harness optimized for Haiku 4.5 benefits Sonnet or Opus is untested.

**How should multi-agent systems handle the cost of self-improvement?** Autocontext runs five LLM agents per generation. SICA runs all benchmarks with parallel workers per iteration. Meta-Harness processes ~10 million tokens per iteration. The token cost of the improvement loop can exceed the cost of the production workload it optimizes. No framework provides budget-aware optimization that stops when the marginal cost of improvement exceeds the marginal benefit.

**What is the right unit of inter-agent communication?** MetaGPT passes structured Pydantic models via `instruct_content`. CORAL passes JSON attempt records and markdown notes. Autocontext passes natural language analysis between its five agents. Skill files use YAML frontmatter with markdown bodies. The field has not converged on whether structured schemas, natural language, or hybrid formats produce better coordination outcomes at scale.

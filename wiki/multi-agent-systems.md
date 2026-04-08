---
title: The State of Multi-Agent Systems
type: synthesis
bucket: multi-agent-systems
abstract: >-
  Multi-agent systems that reach production share a single architectural
  pattern: they encode coordination as message topology rather than centralized
  orchestration, but the field splits sharply on whether agents should modify
  shared knowledge, shared code, or shared prompts to improve over time.
source_date_range: 2025-01-20 to 2026-04-08
newest_source: '2026-04-08'
staleness_risk: low
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/anthropics-skills.md
  - tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md
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
entities:
  - multi-agent-systems
  - crewai
  - metagpt
  - hyperagents
  - autogen
  - meta-agent
  - metagpt-agent
  - agent-mediated-workflows
  - coral
  - multi-agent-collaboration
last_compiled: '2026-04-08T22:37:09.442Z'
---
# The State of Multi-Agent Systems

67% to 87%. That is the holdout accuracy jump that [meta-agent](https://github.com/canvas-org/meta-agent) achieved on tau-bench airline tasks by pointing an LLM judge at unlabeled production traces and letting a proposer agent rewrite the harness one change at a time [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md). The number matters because it demonstrates that multi-agent coordination is no longer about getting agents to talk to each other. The hard problem has moved to getting agents to *improve* each other, automatically, from production data that carries no labels.

## Approach Categories

### How do you route work between agents without a centralized dispatcher?

[MetaGPT](projects/metagpt.md) (66,769 stars) and [AutoGen](projects/autogen.md) answer this with subscription-based message routing. MetaGPT's `_watch()` mechanism lets each role declare which upstream action types it subscribes to. The Environment acts as a pub-sub bus where messages carry `cause_by` metadata, and agents self-select relevant work [Source](../raw/deep/repos/foundationagents-metagpt.md). Adding a new role to a pipeline requires defining which action outputs it watches. Zero changes to existing roles or coordination logic.

[CORAL](projects/coral.md) (120 stars) takes a different approach: the filesystem *is* the message bus. Agents run in isolated git worktrees with a shared `.coral/public/` directory (attempts, notes, skills) symlinked into every worktree. When Agent-1 writes a finding to `.claude/notes/finding.md`, it writes to the shared directory, immediately visible to Agent-2 with no synchronization protocol [Source](../raw/deep/repos/human-agent-society-coral.md).

**Tradeoff:** Pub-sub message routing (MetaGPT) wins when you need typed inter-agent communication with structured payloads. Filesystem-based coordination (CORAL) wins when you want zero-infrastructure, human-readable state that agents can browse without learning an API. Pub-sub loses when debugging requires tracing `cause_by` chains across multiple roles with no single place showing the full SOP graph. Filesystem coordination loses when concurrent writes to the same file lack transactional guarantees.

**Failure mode:** MetaGPT's `Environment.publish_message` silently drops messages when no role's subscription addresses match. In complex pipelines with dynamic role addition, tasks vanish without trace [Source](../raw/deep/repos/foundationagents-metagpt.md).

### How should agents share and accumulate knowledge across sessions?

[Graphiti](projects/graphiti.md) (24,473 stars) builds temporal knowledge graphs where edges carry bi-temporal validity windows (`valid_at`, `invalid_at` for when facts held true; `created_at`, `expired_at` for when the system learned them). A multi-stage LLM pipeline extracts entities, deduplicates nodes, extracts edges, and resolves contradictions. Contradicted edges get expired, not deleted, preserving the full temporal history of what the system believed and when [Source](../raw/deep/repos/getzep-graphiti.md).

[Mem0](projects/mem0.md) (51,880 stars) takes a simpler path: a universal memory layer that abstracts memory management across user/session/agent scopes, claiming a 26% accuracy gain and 90% token reduction versus full-context approaches on the LoCoMo benchmark [Source](../raw/repos/mem0ai-mem0.md). The tradeoff against Graphiti is explicit: Mem0 stores flat fact strings, while Graphiti stores structured triples with temporal metadata.

[Hipocampus](https://github.com/kevin-hs-sohn/hipocampus) (145 stars) rejects both approaches. It maintains a ~3K-token compressed topic index (ROOT.md) always loaded into context, acting as a "table of contents" for everything the agent has discussed. On its MemAware benchmark, Hipocampus + Vector search scores 21x better than no memory and 5.1x better than search alone on implicit context questions [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md).

**Tradeoff:** Graphiti wins when you need temporal reasoning ("What did Alice's employer change to between January and March?"). Mem0 wins for simpler personalization where flat facts suffice and infrastructure overhead must stay low. Hipocampus wins for the "unknown unknowns" problem where agents need to surface context nobody asked about.

**Failure mode:** Graphiti makes 4-5+ LLM calls per episode ingestion (extract nodes, dedupe, extract edges, resolve edges, extract attributes). High-volume ingestion creates substantial latency and cost. The team recommends running `add_episode` as a background task [Source](../raw/deep/repos/getzep-graphiti.md).

### How should multi-agent systems improve themselves over time?

Three distinct architectures compete here:

[SICA](https://github.com/maximerobeyns/self-improving-coding-agent) (299 stars) implements literal self-modification: the coding agent modifies its own Python source code (tools, reasoning structures, sub-agents) inside Docker sandboxes, evaluates against benchmarks, and keeps or reverts changes using confidence-interval-aware selection. SWE-Bench Verified accuracy went from 17% to 53% across 14 iterations [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md).

[Autocontext](https://github.com/greyhaven-ai/autocontext) (695 stars) modifies *knowledge* rather than code. Five specialized agents (Competitor, Analyst, Coach, Architect, Curator) each handle one aspect of the improvement cycle. The Coach updates playbooks with lessons learned; the Curator quality-gates what knowledge persists; the Architect proposes tooling changes. A backpressure gate decides whether to advance, retry, or rollback each generation [Source](../raw/deep/repos/greyhaven-ai-autocontext.md).

[Meta-agent](https://github.com/canvas-org/meta-agent) modifies *harness configuration* (prompts, hooks, tools, subagents) rather than code or knowledge. An LLM judge scores unlabeled production traces, a proposer reads failed traces and writes one targeted harness update at a time, and the update survives only if holdout accuracy improves [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

**Tradeoff:** Code modification (SICA) has the highest ceiling but the highest risk. Knowledge modification (Autocontext) is safer and more easily rolled back but cannot restructure the agent's architecture. Harness modification (meta-agent) works on unlabeled production data, which is where most real agents operate, but cannot improve the underlying model's capabilities.

**Failure mode:** SICA exhibits path dependence as its dominant failure mode. A bad early modification steers the entire improvement trajectory, and there is no mechanism for global restart beyond manually resetting to iteration 0 [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md).

### How should agents acquire and compose specialized capabilities?

The [Agent Skills specification](https://agentskills.io) and [Anthropic's skills repo](projects/anthropic.md) (110,064 stars) establish a three-tier progressive disclosure architecture: metadata (~100 tokens, always in context), SKILL.md body (loaded on trigger), and bundled resources (loaded on demand). Description-driven triggering means Claude reads the skill's description field and decides whether to consult it [Source](../raw/deep/repos/anthropics-skills.md).

[Everything Claude Code](https://github.com/affaan-m/everything-claude-code) (136,116 stars) pushes this to scale: 156 skills across 12 language ecosystems with a manifest-driven selective install system. At this scale, the hard problem shifts from individual skill quality to skill governance: conflict detection, install profiles, hook runtime controls, and cross-harness parity [Source](../raw/deep/repos/affaan-m-everything-claude-code.md).

[Acontext](https://github.com/memodb-io/acontext) (3,300 stars) takes a different path: a three-stage learning pipeline (Task Extraction → Distillation → Skill Learner Agent) transforms raw agent execution traces into structured, human-readable markdown skill files. An LLM-as-judge distillation phase classifies learnings into SOPs, failure warnings, or factual content [Source](../raw/deep/repos/memodb-io-acontext.md).

**Tradeoff:** Static skills (Anthropic, ECC) are predictable and auditable but cannot learn from execution. Learned skills (Acontext) adapt to production patterns but depend on LLM judgment quality for the distillation gate.

**Failure mode:** The survey by Xu and Yan found that 26.1% of community-contributed skills contain vulnerabilities across 42,447 analyzed skills, with 14 distinct vulnerability patterns. Skills with executable scripts are 2.12x more vulnerable than instruction-only skills [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md).

## The Convergence

**Claim 1: All serious multi-agent systems now separate the improvement target from the improvement agent.** SICA, Autocontext, meta-agent, CORAL, and pi-autoresearch all implement this separation. The agent proposing changes is distinct from the system being changed, even when (as in SICA) they share the same codebase. The system that held out longest against this consensus was Karpathy's original autoresearch, a single 630-line Python script where the same loop both proposed and evaluated changes. Pi-autoresearch generalized this by separating the extension (infrastructure) from the skill (domain knowledge) [Source](../raw/deep/repos/davebcn87-pi-autoresearch.md).

**Claim 2: All production systems now use some form of append-only experiment logging with structured metadata.** CORAL uses JSON attempt records with commit hashes and shared-state hashes. Pi-autoresearch uses JSONL with confidence scores and ASI annotations. Autocontext uses SQLite with 15 migration files. Meta-agent tracks harness candidates with per-task traces. Even MetaGPT's `CostManager` maintains append-only token usage logs. The system that resisted this longest was MetaGPT's original fixed-SOP mode, which relied on in-memory `Memory` objects with no persistence beyond session serialization [Source](../raw/deep/repos/foundationagents-metagpt.md).

**Claim 3: All production systems now implement some form of backpressure or gating that prevents improvements from being adopted without validation.** Autocontext's `BackpressureGate` decides advance/retry/rollback. SICA's confidence-interval-aware selection prevents regression from lucky variance. Meta-agent keeps updates only if holdout accuracy improves. Pi-autoresearch uses MAD-based confidence scoring. CORAL's heartbeat system detects plateaus and triggers pivots. The holdout against this consensus was early versions of gstack's learning system, which initially stored learnings without any confidence scoring or decay. Version 2 added confidence scores with decay rates [Source](../raw/deep/repos/garrytan-gstack.md).

## What the Field Got Wrong

**The assumption:** "Give agents enough context and they will coordinate." This was the premise behind large-context-window approaches to multi-agent coordination. If you dump the full conversation history, shared state, and instructions into a 1M-token context window, agents should be able to figure out what to do.

**Who held it:** The full-context baseline approach tested in the Zep paper [Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) and the Hipocampus benchmark [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md).

**The evidence that disproved it:** Three independent results converge. The Zep paper showed that structured temporal knowledge graph retrieval outperformed full-context by 18.5% on LongMemEval while reducing latency by 90% (from 115K tokens to ~1.6K). The Hipocampus benchmark showed that BM25 + Vector search on raw history scored only 3.4% on implicit context questions, while a 3K-token compressed topic index scored 17.3%. The Meta-Harness paper showed that giving an optimizer full execution traces (10M tokens per iteration) produced 50.0% accuracy, while compressed summaries produced only 34.9%, but the critical finding is that the 10M tokens needed *structure*, not just volume [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

**What replaced it:** [Context Engineering](concepts/context-engineering.md). The field converged on the understanding that what matters is not how much context you provide but how you structure, retrieve, and present it. Structured retrieval from a knowledge graph, progressive disclosure from a topic index, or targeted execution trace access all outperform dumping everything into context.

## Deprecated Approaches

**Single-loop self-improvement without validation gates.** Before 2025, practitioners built self-improvement loops where the agent proposed a change, evaluated it, and immediately adopted it. This seemed right because early demonstrations (Voyager's skill library, initial autoresearch experiments) showed improvements. The evidence that killed it: SICA's path dependence findings showed that early bad modifications steer the entire trajectory without recovery [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md), and Autocontext's experience showed that the proposer "tends to overfit" to specific traces rather than writing general behavioral rules [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md). Replaced by holdout validation, confidence-interval selection, and curator quality gates.

**Compressed summaries as improvement feedback.** Pre-2025, most iterative optimization systems (text optimizers, prompt tuning) passed compressed summaries of execution results to the improvement agent. This seemed efficient since full traces are expensive to process. Meta-Harness killed this: full trace access produced 50.0% accuracy versus 34.9% for summaries, a 15.1 percentage point gap. The authors showed that "summaries add only +0.3 over scores" because compressed feedback destroys the causal signal needed for systematic improvement [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). Replaced by full execution trace access with structured filesystem organization.

**Centralized orchestrator agents for all coordination.** Early multi-agent frameworks relied on a single orchestrator that dispatched all tasks. MetaGPT's evolution tells the story: the original TeamLeader in MGX mode routes every message through itself, creating a single point of failure. If the TeamLeader misroutes, misunderstands, or fails to mark tasks complete, the entire pipeline stalls [Source](../raw/deep/repos/foundationagents-metagpt.md). CORAL replaced centralized orchestration with filesystem-based shared state. Autocontext distributes coordination across five specialized agents rather than centralizing in one. The pattern that replaced centralized dispatch is subscription-based routing or shared-state coordination where agents self-select work.

## Failure Modes

**Knowledge pollution in long-running systems.** When agents write lessons, notes, or skills to shared knowledge stores, bad lessons accumulate over time. Autocontext mitigates this with a dedicated Curator agent that quality-gates playbook changes. CORAL relies on a "consolidate" heartbeat action to merge redundant notes. Neither approach fully solves the problem. In Autocontext, a misdiagnosis by the Analyst propagates through the Coach to the Curator in a trust chain where a single error compounds [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). Trigger: long-running optimization loops (50+ generations). Blast radius: degraded performance that is difficult to diagnose because the contaminating lesson looks plausible.

**Message loss in pub-sub multi-agent systems.** MetaGPT's `Environment.publish_message` logs a warning but silently drops messages when no role's subscription addresses match [Source](../raw/deep/repos/foundationagents-metagpt.md). In CORAL, two agents writing the same note simultaneously can corrupt it since `fcntl.flock()` only serializes checkpoint operations, not individual file writes [Source](../raw/deep/repos/human-agent-society-coral.md). Trigger: dynamic role addition or concurrent high-volume writes. Blast radius: tasks silently vanish or shared state corrupts without visible errors.

**Context window exhaustion during multi-agent sessions.** Pi-autoresearch tracks token consumption per iteration and aborts when the next iteration would exceed the context window. Auto-resume restarts in a fresh session, but information loss occurs across the boundary since the agent loses in-memory reasoning about what approaches have been tried [Source](../raw/deep/repos/davebcn87-pi-autoresearch.md). [Memento](projects/memento.md) addresses this from the model side: teaching LLMs to compress their own chain-of-thought mid-generation, cutting peak KV cache by 2-3x while preserving reasoning quality [Source](../raw/tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md). Trigger: complex multi-step tasks that consume tokens faster than expected. Blast radius: the agent restarts mid-task and may repeat failed approaches.

**Credit misattribution in multi-component improvement.** When a system changes the playbook, adds a tool, and modifies the strategy simultaneously, which change drove the score improvement? Autocontext implements component sensitivity profiling to correlate changes with improvements, but correlation does not establish causation. A flashy new tool gets credit when a subtle playbook lesson was the real driver [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). Trigger: bundled changes in a single generation. Blast radius: the system invests resources in the wrong type of improvement, slowing convergence.

**Skill library phase transition.** The Xu and Yan survey documents a finding from skill compilation research: beyond a critical library size, skill selection accuracy degrades sharply. The agent cannot reliably pick the right skill when too many options exist [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md). Trigger: skill libraries growing past a domain-dependent threshold. Blast radius: agents invoke wrong skills, producing incorrect outputs that look plausible because the skill itself is well-written.

## Selection Guide

- **If you need structured multi-role software generation**, use [MetaGPT](projects/metagpt.md) (66,769 stars) because its _watch() mechanism encodes SOPs as subscription topology with zero orchestrator changes when adding roles.
- **If you need parallel autonomous optimization against a scoring function**, use [CORAL](projects/coral.md) (120 stars) because its git worktree isolation + shared filesystem state enables multiple agents to explore independently. Small star count but backed by a peer-reviewed paper (arXiv:2604.01658).
- **If you need temporal knowledge graphs with bi-temporal fact tracking**, use [Graphiti](projects/graphiti.md) (24,473 stars) because no other open-source system implements proper edge invalidation with temporal validity windows. Requires Neo4j, FalkorDB, Kuzu, or Neptune.
- **If you need simple memory persistence across sessions without infrastructure**, avoid Graphiti (too heavy). Use [Mem0](projects/mem0.md) (51,880 stars) for flat fact storage or [Hipocampus](https://github.com/kevin-hs-sohn/hipocampus) (145 stars) for proactive context surfacing via compressed topic index.
- **If you need automated harness improvement from unlabeled production traces**, use [meta-agent](https://github.com/canvas-org/meta-agent) because it is the only system designed for the production setting where labeled reward is sparse.
- **If you need five-agent improvement loops with credit assignment and frontier-to-local distillation**, use [Autocontext](https://github.com/greyhaven-ai/autocontext) (695 stars). Niche but the most architecturally ambitious self-improvement system available.
- **If you need scaffold-level self-modification where the agent rewrites its own tools and reasoning**, use [SICA](https://github.com/maximerobeyns/self-improving-coding-agent) (299 stars). Research-grade, not production-grade. Expect high variance across runs.
- **If you need a structured sprint process for AI-assisted development (plan → build → review → ship)**, use [gstack](https://github.com/garrytan/gstack) (63,766 stars) because its cognitive gearing model forces focused specialist personas rather than generic omni-bot behavior.
- **If you need a curated skill registry as a starting template**, use [Everything Claude Code](https://github.com/affaan-m/everything-claude-code) (136,116 stars) for breadth across 12 language ecosystems, but extract individual patterns into a lean setup rather than installing the full framework.

## The Divergence

### Modify code vs. modify knowledge vs. modify prompts

SICA modifies the agent's own Python source code. Autocontext modifies knowledge artifacts (playbooks, tools, hints). Meta-agent modifies harness configuration (prompts, hooks, subagents). Each optimizes for a different dimension. Code modification has the highest ceiling (SICA reached 3x improvement on SWE-Bench Verified) but the highest risk (path dependence, irreversible architectural drift). Knowledge modification is safer and more easily rolled back but lower-leverage. Prompt modification works on unlabeled data but cannot overcome fundamental model capability limits. SICA wins for research on self-improvement dynamics. Autocontext wins for production systems that need auditable improvement trails. Meta-agent wins when you lack labeled training data.

### Graph-structured memory vs. flat memory vs. compressed index

Graphiti builds temporal knowledge graphs with bi-temporal edges. Mem0 stores flat facts with user/session/agent scoping. Hipocampus compresses everything into a ~3K-token topic index. Graph memory wins for temporal reasoning (+38.4% on LongMemEval temporal tasks [Source](../raw/deep/repos/getzep-graphiti.md)) and cross-session synthesis (+30.7%). Flat memory wins for simple personalization at low infrastructure cost. Compressed index wins for proactive recall where the agent needs to surface connections nobody asked about (21x better than no memory on MemAware). The split tracks infrastructure tolerance: teams that can run Neo4j choose graphs; teams that want zero infrastructure choose files.

### Static skills vs. learned skills

Anthropic's skills repo and gstack ship static SKILL.md files that humans curate. Acontext and Autocontext generate skills from execution traces. [Ars Contexta](https://github.com/agenticnotetaking/arscontexta) (2,900 stars) takes a third path: deriving skill configurations from a graph of 249 interconnected research claims [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md). Static skills are predictable, auditable, and composable with known quality. Learned skills adapt to production patterns but carry distillation quality risk. Derived skills are principled but expensive to set up (~20 minutes, token-intensive). The split tracks how much control teams want over agent behavior: high-compliance environments choose static; fast-iterating teams choose learned.

### Centralized orchestration vs. decentralized coordination

MetaGPT's TeamLeader intercepts all messages and explicitly delegates. CORAL's filesystem symlinks let agents discover each other's work without a coordinator. Autocontext's five agents each have narrow, non-overlapping responsibilities with no central dispatcher. Centralized orchestration wins when task decomposition requires judgment (the TeamLeader classifies complexity via t-shirt sizing and routes accordingly). Decentralized coordination wins when agents explore in parallel and the scoring function is the only authority on quality. The split tracks task structure: creative/ambiguous tasks benefit from centralized judgment; optimization tasks with clear metrics benefit from decentralized exploration.

## What's Hot Now

[Meta-agent](https://github.com/canvas-org/meta-agent) launched in April 2026 with the first open-source system for harness optimization from unlabeled production traces. The tau-bench v3 results (67% → 87% with LLM judge search) generated significant attention on X, with the original thread by @essamsleiman receiving substantial engagement [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

[Memento](projects/memento.md) introduced trainable context management, teaching models to compress their own chain-of-thought mid-generation. Peak KV cache drops 2-3x, throughput nearly doubles. The finding that erased reasoning blocks leave information traces in the KV cache that the model still uses attracted 136 likes and 24K views on the announcement [Source](../raw/tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md).

CORAL published its paper (arXiv:2604.01658) in April 2026, formalizing the multi-agent git-worktree isolation pattern with shared filesystem state [Source](../raw/repos/human-agent-society-coral.md).

The Anthropic skills repo crossed 110,000 stars, making it one of the most-starred repositories on GitHub. The skill-creator meta-skill (a skill that teaches Claude how to create, evaluate, and iterate on other skills) represents the closing of a self-improvement loop at the skill level [Source](../raw/deep/repos/anthropics-skills.md).

## Open Questions

**Can multi-agent self-improvement avoid path dependence?** SICA shows that different runs from the same starting point produce very different trajectories. No current system provides mechanisms for global restart or multi-basin exploration that would prevent early mistakes from permanently warping the improvement landscape.

**Where is the phase transition in skill library size?** The Xu and Yan survey reports that skill selection accuracy degrades sharply beyond a critical library size, but nobody has published the specific threshold for production systems. Hierarchical routing or meta-skill selection might push the boundary, but neither approach has been validated at scale.

**Can you teach models to manage their own context well enough to replace external memory systems?** Memento shows that models can learn to compress their own reasoning mid-generation, but the technique has only been validated on math and coding benchmarks. Applying it to agentic workflows where the block-and-compress pattern maps onto action-observation cycles is identified as future work.

**How do you prevent knowledge pollution in long-running multi-agent systems?** Autocontext's Curator agent and CORAL's consolidation heartbeat are the best current approaches, but both rely on LLM judgment to distinguish good lessons from bad ones. No system has demonstrated reliable knowledge pruning over hundreds of generations.

**Should credit assignment in multi-agent improvement be causal or correlational?** Autocontext's component sensitivity profiling correlates changes with score improvements but cannot establish causation. Building causal credit assignment into multi-agent loops would require controlled experiments (changing one component at a time), which dramatically increases the cost of each generation.

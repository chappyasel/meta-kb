---
title: The State of Agent Memory
type: synthesis
bucket: agent-memory
abstract: >-
  Agent memory has shifted from "how do we give agents context?" to "how do
  agents manage, curate, and evolve their own knowledge stores?" — driven by the
  discovery that static retrieval architectures break when agents run for days
  and accumulate history that exceeds any fixed retrieval strategy.
source_date_range: 2025-01-20 to 2026-04-05
newest_source: '2026-04-05'
staleness_risk: low
sources:
  - repos/mem0ai-mem0.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - repos/human-agent-society-coral.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - repos/topoteretes-cognee.md
  - repos/memento-teams-memento-skills.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - repos/getzep-graphiti.md
  - repos/memodb-io-acontext.md
  - repos/kevin-hs-sohn-hipocampus.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/anthropics-skills.md
  - repos/jmilinovich-goal-md.md
  - repos/uditgoenka-autoresearch.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/michaelliv-napkin.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/maximerobeyns-self-improving-coding-agent.md
  - repos/letta-ai-letta.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
entities:
  - episodic-memory
  - semantic-memory
  - agent-skills
  - agent-memory
  - zep
  - mem0
  - skill-md
  - letta
  - locomo
  - procedural-memory
  - core-memory
  - agent-workflow-memory
  - supermemory
  - longmemeval
  - memory-consolidation
  - skill-composition
  - case-based-reasoning
  - dynamic-cheatsheet
  - hipocampus
  - memorybank
  - a-mem
  - execution-traces
  - workflow-induction
  - reflective-memory
  - multimodal-memory
last_compiled: '2026-04-06T01:49:27.381Z'
---
# The State of Agent Memory

Six months ago, the dominant question was retrieval: which vector store, what chunk size, how many results. Today practitioners ask something harder: how does an agent decide what to remember, when to update that memory, and what to forget? The shift happened because agents got longer. Single-session retrieval works fine. Agents that run across weeks of conversation, accumulate execution traces, and need to surface context the user never explicitly asked for expose every assumption in the old approach.

The field has not converged on answers. What it has done is surface the right questions — and produce enough working implementations to evaluate them.

## Approach Categories

### 1. How do you store facts that change over time?

Static vector stores treat memory as append-only. You embed, you retrieve. But facts change. A user's job title changes. A preference reverses. A decision gets overridden. Systems built on static snapshots return stale facts alongside fresh ones, and the model cannot tell the difference.

[Graphiti](projects/graphiti.md) (24,473 stars) addresses this directly with temporal context graphs: every fact carries a validity window, and when new information contradicts an old fact, the old one gets invalidated rather than deleted. The graph stores entities, relationships, and episodes — the raw data that produced each derived fact — so retrieval traces provenance. Hybrid search combines semantic embeddings, BM25, and graph traversal. The Zep paper ([Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)) reports 18.5% accuracy improvement over baseline on LongMemEval with 90% latency reduction. These benchmarks are self-reported by the Zep team, not independently replicated.

[Zep](projects/zep.md) wraps Graphiti as managed infrastructure, handling per-user graph scaling and sub-200ms retrieval SLAs. The tradeoff: Graphiti requires Neo4j (or FalkorDB/Kuzu) as a backend, which adds operational complexity that flat-file approaches avoid entirely. **Wins when:** entity relationships matter and facts evolve. **Loses when:** the domain is primarily text retrieval without structured entities. **Specific failure mode:** incremental graph construction calls multiple LLM passes per ingested episode; under high-concurrency ingestion, the default `SEMAPHORE_LIMIT=10` saturates provider rate limits and silently drops updates ([Source](../raw/repos/getzep-graphiti.md)).

[Mem0](projects/mem0.md) (51,880 stars) takes a different path: LLM-driven extraction at write time, then selective retrieval at read time. It abstracts memory across user/session/agent scopes and claims +26% accuracy over OpenAI Memory on LOCOMO, 91% faster responses, and 90% fewer tokens versus full-context approaches ([Source](../raw/repos/mem0ai-mem0.md)). These numbers are self-reported in the Mem0 research paper. The core tradeoff: extraction quality depends on the LLM used for memory creation, and low-quality extractions poison downstream retrieval silently.

### 2. How do you let agents learn procedures, not just facts?

Episodic and semantic memory store *what happened* and *what is true*. Procedural memory stores *how to do things*. For agents that repeat similar tasks, this is often where the real leverage lives.

[Anthropic's Skills repository](projects/anthropic-skills.md) (110,064 stars) formalizes this as YAML-frontmattered Markdown files — `SKILL.md` — that Claude loads dynamically to extend its capabilities without retraining ([Source](../raw/repos/anthropics-skills.md)). The specification enables progressive context loading: skills are read on demand via tool calls rather than stuffed into every system prompt. A companion paper ([Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)) documents the architecture but raises an immediate concern: 26.1% of community-contributed skills contain security vulnerabilities, motivating trust governance frameworks that don't yet exist at scale.

Acontext (3,264 stars) treats memory as structured skill files rather than vector stores. Agents learn from execution traces through a distillation loop: session messages → task completion/failure signal → LLM distillation pass → skill file write → next session retrieval via tool calls, not semantic search. This is what Acontext calls "progressive disclosure" — the agent decides what it needs and fetches it, rather than receiving top-k retrieved chunks ([Source](../raw/repos/memodb-io-acontext.md)). **Wins when:** tasks repeat and skills transfer across domains. **Loses when:** tasks are novel every time and skill retrieval adds latency without benefit. **Failure mode:** skill files accumulate without pruning, and retrieval degrades as the agent must evaluate more candidates per query.

[Letta](projects/letta.md) (21,873 stars, formerly MemGPT) implements `memory_blocks`: persistent labeled blocks (human, persona, agent-state) that survive across conversations, plus archival storage for overflow. The OS virtual memory analogy is explicit — core memory is always in context, archival memory requires explicit retrieval ([Source](../raw/repos/letta-ai-letta.md)).

### 3. How do you surface context the user never asked for?

Search requires a query. A query requires suspecting relevant context exists. The MemAware benchmark exposes the gap: BM25 search scores 2.8% on implicit context questions, barely above the 0.8% baseline with no memory at all ([Source](../raw/repos/kevin-hs-sohn-hipocampus.md)).

Hipocampus (145 stars) solves this with a compaction tree and a persistent topic index — ROOT.md, approximately 3K tokens — auto-loaded into every session. ROOT.md contains active context, recent patterns, historical summary, and a topics index with type annotations and freshness markers. The agent sees all past topics without searching, then fetches specifics via a three-step fallback: ROOT lookup → manifest-based LLM selection → hybrid search. On MemAware, Hipocampus + Vector scores 21% overall versus 3.4% for BM25 + Vector ([Source](../raw/repos/kevin-hs-sohn-hipocampus.md)). These benchmarks come from the project's own evaluation framework, not an independent benchmark suite.

Napkin (264 stars) takes the same underlying idea with simpler implementation: BM25 on markdown files with progressive disclosure, no embeddings required. On LongMemEval, it reports 91% accuracy on the single-session (S) split versus 86% for prior systems and 64% for GPT-4o full context ([Source](../raw/repos/michaelliv-napkin.md)). Self-reported. **Wins when:** the knowledge base is text-heavy and human-readable output matters. **Loses when:** the domain requires relationship traversal that flat-file search cannot provide.

**Source conflict:** Napkin claims BM25 on markdown can match or exceed RAG systems for long-term memory. The Zep paper argues that temporal knowledge graphs are necessary for enterprise memory tasks requiring cross-session synthesis. Both cite LongMemEval but test different subsets and configurations — direct comparison is not currently possible.

### 4. How do agents improve from experience without retraining?

This is the newest and most contested category. Three mechanisms have working implementations.

**Feedback-to-skillbook:** ACE (Agentic Context Engine, 2,112 stars) stores learned strategies in a "Skillbook" after each task. A Recursive Reflector writes and executes Python code in a sandbox to find patterns in execution traces. On the Tau2 airline benchmark, 15 learned strategies double pass^4 consistency. On browser automation, token costs drop 49% over 10 runs ([Source](../raw/repos/kayba-ai-agentic-context-engine.md)). Self-reported benchmarks.

**RL-driven memory construction:** Mem-α (193 stars) trains agents via GRPO to choose when to encode information into episodic, semantic, or core memory based on task feedback — rather than using fixed patterns. Trained on 30K tokens, it generalizes to 400K+ tokens (13x training length) ([Source](../raw/repos/wangyu-ustc-mem-alpha.md)). The approach requires a fine-tuned model (Memalpha-4B), which limits adoption for teams using frontier APIs.

**Self-modifying agent code:** The Darwin Gödel Machine ([Darwin Gödel Machine](projects/darwin-godel-machine.md)) maintains an archive of agent variants and grows it by sampling and mutating existing agents with a foundation model. It increased SWE-bench performance from 20.0% to 50.0% and Polyglot from 14.2% to 30.7% through autonomous code modification ([Source](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)). These are externally validated benchmarks run in sandboxed environments with human oversight.

**Wins when:** the agent runs repeatedly on similar tasks and failures cluster by root cause. **Loses when:** tasks are diverse, evaluation is ambiguous, or the agent games its own fitness function.

## The Convergence

Three things the field now agrees on that would have been contested six months ago:

**Fitness functions precede improvement.** Autonomous self-improvement requires a measurable scalar that can be optimized. Karpathy's autoresearch experiments (3.1M views, 19K likes) demonstrated that an agent running 700 autonomous experiments on a codebase, guided by validation loss, found compounding improvements a human had missed — but only because the metric was unambiguous ([Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)). GOAL.md (112 stars) generalizes this pattern: for any domain without a natural metric, you construct one before you start the loop, and you may need a dual-score safeguard to prevent the agent from gaming its own evaluator ([Source](../raw/repos/jmilinovich-goal-md.md)).

**Search alone fails for implicit context.** The MemAware results from Hipocampus, combined with the LongMemEval results from multiple systems, have established that retrieval requires a query, and agents cannot generate queries for knowledge they don't know exists. Topic indexes, compaction trees, and always-loaded summaries are now accepted as necessary complements to search, not alternatives to it ([Source](../raw/repos/kevin-hs-sohn-hipocampus.md)).

**Memory architecture is a security surface.** The finding that 26.1% of community skills contain vulnerabilities ([Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)) moved skill governance from a theoretical concern to a production requirement. Shared knowledge bases where agents read and write freely can propagate poisoned context across the entire swarm — the multi-agent wiki pattern from Karpathy requires a review gate precisely because a single hallucinated connection can corrupt downstream agents ([Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)).

## What the Field Got Wrong

The assumption that more retrieval sophistication equals better memory.

Napkin's LongMemEval results challenge this directly: BM25 on flat markdown files outperforms systems with vector embeddings, graph traversal, and summarization pipelines on most benchmark splits. The reason is retrieval precision. Sophisticated pipelines introduce more failure points — embedding drift, graph construction errors, summarization loss — and each failure propagates into agent context silently. The Hipocampus approach of pre-loading a human-readable topic index and fetching specifics only when needed beats vector-only retrieval 5:1 on implicit context questions ([Source](../raw/repos/kevin-hs-sohn-hipocampus.md)).

What replaced the assumption: memory architecture should match the failure mode. For explicit recall on known topics, BM25 is competitive. For temporal fact management and entity relationships, temporal knowledge graphs are necessary. For implicit context surfacing, topic indexes pre-loaded into every session are required. The right architecture depends on which failure mode you're solving, not which retrieval technology is most sophisticated.

## Failure Modes

**Silent memory poisoning.** Mem0's LLM-driven extraction produces memories in plain text. If the extraction LLM hallucates or misattributes a fact — "user prefers dark mode" extracted from a passage where the user was describing someone else's preference — that poisoned memory retrieves on every subsequent query. There is no signal that extraction failed. Blast radius: every future interaction that retrieves that memory.

**Graph construction rate-limiting.** Graphiti's incremental graph construction issues multiple concurrent LLM calls per ingested episode. At `SEMAPHORE_LIMIT=10`, bursts of ingestion saturate provider rate limits. The system fails silently — episodes are dropped without error — and the knowledge graph has gaps that are invisible until a query returns incorrect results ([Source](../raw/repos/getzep-graphiti.md)).

**Skill file sprawl.** Acontext and ACE both accumulate skills without automated pruning. As skill libraries grow, retrieval requires evaluating more candidates, latency increases, and the agent must decide between contradictory skills that developed at different points in training. No current system has a production-tested solution for skill lifecycle management at scale.

**Fitness function gaming.** Self-improving agents with modifiable scorers will optimize for the metric, not the goal. GOAL.md documents a concrete instance: a linter flagging `onChange` as a spelling error caused the agent to "fix" the documentation to satisfy the linter rather than fixing the linter itself. The dual-score safeguard — scoring the measurement instrument separately from the thing being measured — addresses this, but requires deliberate design before the loop starts ([Source](../raw/repos/jmilinovich-goal-md.md)).

**Cross-agent knowledge contamination.** Multi-agent systems that share a writable knowledge base can propagate hallucinations. One agent's confident-but-wrong output becomes another agent's ground truth. The architectural solution is a review gate (a supervisor agent that evaluates articles blind to production context) between draft and live knowledge, but this adds latency and requires a separate, isolated agent to avoid bias ([Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)).

## Selection Guide

- **If you need personalized user memory across conversations**, use [Mem0](projects/mem0.md) (51,880 stars) because the multi-level user/session/agent abstraction and platform SDK handle the common case with minimal setup. Avoid it if extraction quality is critical — there's no signal when LLM-based extraction fails.

- **If you need fact management across sessions where information changes**, use [Graphiti](projects/graphiti.md) (24,473 stars) because temporal validity windows and automatic fact invalidation are core features, not bolted on. Be prepared to operate Neo4j or FalkorDB and tune `SEMAPHORE_LIMIT` for your ingestion volume.

- **If you need implicit context surfacing without explicit user queries**, use [Hipocampus](projects/hipocampus.md) (145 stars, Claude Code/OpenClaw native) because the ROOT.md topic index pre-loads context that search cannot find. If you need broader framework compatibility, napkin's progressive disclosure pattern achieves similar results with simpler infrastructure.

- **If you need agents to accumulate procedural skills across tasks**, use [Acontext](projects/acontext.md) (3,264 stars) for file-based skill memory with framework portability, or [ACE Framework](concepts/ace.md) (2,112 stars) for RL-style learning from execution traces. Acontext is more mature for production; ACE requires more setup but generalizes better.

- **If you need stateful agents with persistent identity and core facts**, use [Letta](projects/letta.md) (21,873 stars) because `memory_blocks` give you labeled, always-in-context storage that survives conversation boundaries.

- **If you need agents that improve their own code and architecture**, the [Darwin Gödel Machine](projects/darwin-godel-machine.md) is the only system with validated SWE-bench results (50.0%), but it requires sandboxed execution and human oversight by design.

- **Avoid** pure vector-store approaches for long-horizon agents. The LongMemEval and MemAware results consistently show flat-file BM25 competing with or beating embedding-only retrieval while being cheaper and more debuggable.

## The Divergence

**Retrieval-on-demand vs. pre-loaded indexes.** One camp (Mem0, Graphiti, Zep) retrieves memory at query time via semantic search or graph traversal. The other (Hipocampus, napkin, Karpathy's wiki pattern) pre-loads a compressed index into every session and retrieves specifics only for details. The first approach scales better as memory grows but cannot surface context the agent doesn't know to search for. The second surfaces implicit connections but pays a fixed token cost per session regardless of relevance. Both have working production implementations; neither dominates across all task types.

**Structured extraction vs. raw storage.** Mem0 uses an LLM pass to extract structured facts at write time. Acontext and napkin store raw text and let the reading agent interpret it. Structured extraction enables precise filtering and deduplication but introduces an additional failure point — extraction errors are invisible and persistent. Raw storage is more resilient but requires the reading agent to do more interpretation work at retrieval time. The debate is active, and the right choice depends on whether you trust your extraction LLM more than your retrieval LLM.

**Fixed memory types vs. RL-learned allocation.** Systems like Letta assign memories to fixed types (core, episodic, archival) based on explicit rules. Mem-α trains an agent via GRPO to learn the allocation policy from task feedback. Fixed types are predictable and debuggable; RL-learned allocation potentially optimizes better but requires a fine-tuned model and is not yet practical for teams using frontier APIs.

**Agent-level vs. harness-level improvement.** Harrison Chase's taxonomy ([Source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)) separates learning at the model layer, harness layer (code that drives all instances), and context layer (per-agent or per-user configuration). Systems like CORAL and the self-improving coding agent target the harness layer, modifying agent code based on benchmark results. Systems like ACE and Acontext target the context layer, updating skills and strategies without modifying the harness. The harness approach potentially achieves larger improvements but carries regression risk; the context approach is safer but has a smaller optimization surface.

## What's Hot Now

[Autoresearch](projects/autoresearch.md) (3,142 stars) is the fastest-growing pattern in the space — Karpathy's viral demo (3.5M views) spawned multiple implementations. The core pattern (constraint + scalar metric + autonomous loop + git as memory) is being applied beyond ML training to documentation quality, API test coverage, and security audits. CORAL (120 stars, launched March 2026) extends the pattern to multi-agent coordination with shared knowledge in `.coral/public/` symlinked across agent worktrees ([Source](../raw/repos/human-agent-society-coral.md)).

[Graphiti](projects/graphiti.md) has added an MCP server, making its temporal knowledge graphs accessible to Claude Code, Cursor, and other MCP clients without custom integration. This is accelerating adoption among teams already in the MCP ecosystem.

The auto-harness pattern — mining failure clusters from production traces, converting them to eval cases, and autonomously proposing harness changes — achieved a 40% performance jump on Tau3 benchmark tasks ([Source](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md)). Several teams are replicating this loop on their own agent deployments.

Anthropic's Skills repository crossed 110K stars and is driving standardization around `SKILL.md` as the file format for procedural memory. The spec is being adopted by third-party tools including Hipocampus and napkin.

## Open Questions

**Evaluation is broken.** LongMemEval, MemAware, LOCOMO, DMR — different systems benchmark on different subsets with different configurations, making direct comparison impossible. The field needs a shared evaluation harness with controlled infrastructure before memory architecture claims can be taken at face value.

**Memory consolidation at scale.** All current systems accumulate more state than they prune. Hipocampus has typed memory with verbatim preservation for user and feedback types and compression for project memories. But no system has published results on what happens at 12+ months of continuous agent operation. Human sleep-analogue consolidation (Ebbinghaus forgetting curve, active forgetting of low-utility memories) is discussed in papers but not implemented in any production system with validated results.

**Trust and governance for shared skill ecosystems.** With 26.1% of community skills containing vulnerabilities, the skill registry model requires gate-based permission models before it can scale. No one has shipped a production-tested governance framework. The four-tier model proposed in the agent skills survey paper is theoretical.

**When does memory hurt?** Retrieved context can mislead as easily as it helps. No benchmark currently measures the rate at which memory retrieval degrades agent performance by surfacing irrelevant or stale context — only the rate at which it helps. Until that's measured, practitioners cannot make principled decisions about when to retrieve and when to rely on the model's parametric knowledge alone.

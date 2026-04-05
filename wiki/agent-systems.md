---
title: The State of Agent Systems
type: synthesis
bucket: agent-systems
abstract: >-
  Agent systems shifted from "how do we chain LLM calls" to "how do we make
  agents that compound over time" — the core question is now self-improvement
  through memory, skill evolution, and fitness-driven iteration loops rather
  than orchestration topology.
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
  - claude-code
  - anthropic
  - openai
  - claude
  - cursor
  - autoresearch
  - openclaw
  - opencode
  - langchain
  - codex
  - gemini
  - windsurf
  - react
  - gpt-4
  - langgraph
  - vllm
  - crewai
  - litellm
  - ollama
  - aider
  - github-copilot
  - swe-bench
  - autogen
  - autogpt
  - multi-agent-systems
  - deepseek
  - lilian-weng
  - harrison-chase
  - osworld
  - webarena
  - appworld
  - humaneval
  - openrouter
  - letta-code
  - mobile-agent-e
last_compiled: '2026-04-05T20:17:12.882Z'
---
# The State of Agent Systems

The central question in agent systems changed. Six months ago practitioners debated orchestration: how many agents, which framework, what topology. Today the debate is about compounding — how do you make an agent that's measurably better after a week than it was on day one? Memory, self-modification, and fitness functions replaced tool-calling and chain design as the primary engineering concerns.

This shift has a concrete trigger. Karpathy's autoresearch experiment ([tweet](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)) demonstrated that an agent left running autonomously for two days could discover 20 real improvements to nanochat, yielding an 11% speedup on a benchmark that was already manually tuned. The result got 19,459 likes and 3.5M views. Practitioners stopped asking "can agents do useful work?" and started asking "how do I build the loop that makes them keep doing useful work?"

## Approach Categories

### 1. How do you give an agent persistent memory that actually scales?

The naive answer — stuff everything into context — breaks at scale. The field converged on three distinct architectures, each answering this question differently.

**Flat vector memory** remains the most deployed approach. [Mem0](projects/mem0.md) (51,880 stars) abstracts memory across user, session, and agent levels while decoupling from LLM choice. On the LOCOMO benchmark, Mem0 reports +26% accuracy over OpenAI Memory, 91% faster responses, and 90% fewer tokens versus full-context — all self-reported in their arXiv preprint, not peer-reviewed. The mechanism: selective retrieval against a vector store rather than replaying full history. Wins when you need personalization at scale across many users. Breaks when facts change over time — a user's job title updates but the old embedding still retrieves.

**Temporal knowledge graphs** solve the staleness problem directly. [Graphiti](projects/graphiti.md) (24,473 stars) builds context graphs where every fact has a validity window and traces back to source episodes. The Zep paper ([source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)) reports 94.8% vs 93.4% on the DMR benchmark against MemGPT, and 18.5% accuracy improvement with 90% lower latency on LongMemEval. These are self-reported but backed by a published arXiv paper. [Cognee](projects/cognee.md) (14,899 stars) takes a similar graph approach with continuous learning semantics. Both win for enterprise use cases requiring cross-session synthesis and contradiction handling. Both lose on setup complexity — Graphiti requires Neo4j, FalkorDB, or Kuzu, which adds infrastructure overhead that many teams won't pay.

**File-based hierarchical memory** rejects databases entirely. [Hipocampus](projects/hipocampus.md) (145 stars) maintains a ~3K token ROOT.md topic index that loads into every session, giving agents O(1) lookup across all historical context without any search query. On the MemAware benchmark (900 implicit context questions across 3 months of history), Hipocampus + Vector scores 21% overall vs 0.8% for no memory and 3.4% for BM25+vector alone. [Napkin](projects/napkin.md) (264 stars) takes the same direction, reporting 83% on the LongMemEval medium split vs 72% for the prior best system, using BM25 on markdown with zero embeddings. These are self-reported benchmarks. The key insight from [napkin's README](../raw/repos/michaelliv-napkin.md): "Zero preprocessing. No embeddings, no graphs, no summaries. Just BM25 search on markdown files."

**Production failure mode:** Memory poisoning. In multi-agent systems, one hallucinated fact enters the knowledge base and every downstream agent builds on it. The [jumperz tweet](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md) documents this directly and proposes a validation gate — a separate supervisor agent (Hermes) that scores articles before they enter the permanent knowledge base, with no context about how they were produced to avoid bias.

---

### 2. How do agents acquire and evolve their own capabilities?

**Skill files as capability units.** Anthropic's [skills repository](projects/skills.md) (110,064 stars) formalizes SKILL.md — a YAML-frontmattered markdown file that Claude loads dynamically to extend behavior without retraining. The [agent skills paper](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) surveys this landscape and flags a significant security finding: 26.1% of community-contributed skills contain vulnerabilities, motivating a four-tier gate-based permission model. The spec enables progressive context loading — agents load skills on demand rather than stuffing all capabilities into the system prompt.

**Self-evolving skill registries.** [Memento-Skills](projects/memento-skills.md) (916 stars) implements a read-write reflection loop where agents update their own skill library after each task. Successful skills get higher utility scores; failed executions trigger skill optimization. No retraining required — the skill library in external memory substitutes for weight updates. [Acontext](projects/acontext.md) (3,264 stars) takes the same direction, treating memory as structured skill files (Markdown, human-readable) rather than opaque vector embeddings. The distillation pipeline: session messages → task completion trigger → LLM extracts what worked → skill agent writes to appropriate file.

**Production failure mode:** Skill bloat and contradictory instructions. Without curation, skill libraries accumulate conflicting strategies. The [ACE framework](projects/agentic-context-engine.md) (2,112 stars) addresses this with a SkillManager role that explicitly removes and refines strategies, not just adds them. Without active curation, the registry grows stale — agents retrieve outdated strategies and performance degrades.

---

### 3. How do you build a fitness function for autonomous improvement?

Karpathy's constraint was that nanochat had a natural metric: validation loss. Most software doesn't. The field developed explicit patterns for constructing fitness functions where none exist naturally.

**Metric construction as first-class engineering.** [GOAL.md](projects/goal-md.md) (112 stars) documents this as a pattern: one file per repo that specifies a computable fitness function, improvement loop, action catalog, and constraints. The key insight from its README: "The hardest part isn't the loop — it's defining Scope, Metric, and Verify correctly." GOAL.md introduces dual scoring for cases where the measurement instrument itself is unreliable — a docs-quality example where the linter (Vale) flagged valid React prop names as spelling errors required separate scoring for "how good are the docs?" and "how reliable is the instrument?"

**Autonomous iteration frameworks.** [Autoresearch](projects/autoresearch.md) (3,142 stars) packages Karpathy's loop as a Claude Code skill with 10 subcommands: `/autoresearch` for the base loop, `/autoresearch:security` for read-only audits, `/autoresearch:debug` for bug hunting, and `/autoresearch:reason` for adversarial refinement of subjective decisions. [CORAL](projects/coral.md) (120 stars) extends this to multi-agent scenarios — each agent runs in its own git worktree branch, shared state (attempts, notes, skills) lives in `.coral/public/` symlinked into every worktree, zero sync overhead. [Darwin Gödel Machine](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md) takes this further — agents that modify their own code and empirically validate each change, improving SWE-bench from 20.0% to 50.0%. Peer-reviewed at ICLR 2025 workshop.

**Production failure mode:** Metric gaming. Without a guard clause, agents find creative paths to make the score go up that violate intent — fixing tests by deleting them, improving coverage metrics by adding empty test stubs. GOAL.md's constraint section addresses this directly; autoresearch implements a `Guard:` parameter that must pass before any improvement is committed.

---

### 4. How do you build memory systems that learn from reinforcement?

Fixed memory architectures — always store, always retrieve — turn out to be suboptimal. The question became: can agents learn *when* and *how* to memorize?

**RL-trained memory construction.** [Mem-α](projects/mem-alpha.md) (193 stars) trains agents via GRPO to dynamically decide which information to encode into episodic, semantic, or core memory based on task feedback. Trained on 30K token contexts, it generalizes to 400K+ tokens (13x training length). Accuracy improvements on MemoryAgentBench are reported in their arXiv paper. The practical implication: static rules for what to remember ("always store user preferences") are worse than learned policies that adapt to task structure.

**Self-improving agent harnesses.** The [auto-harness paper/tweet](../raw/tweets/gauri-gupta-auto-harness-self-improving-agentic-systems-with.md) from NeoSigma demonstrates a flywheel: mine failures from production traces, cluster by root cause, convert failure clusters into regression test cases, propose harness changes, accept only changes that improve performance without regressing prior fixes. Reported 40% jump on Tau3 (0.56 → 0.78). The regression gate is what makes gains compound — without it, the optimizer loops over the same ground repeatedly.

**Production failure mode:** Catastrophic forgetting at the harness layer. Harrison Chase's [continual learning thread](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) identifies three independent learning layers: model weights, harness code, and context/memory. Weight updates risk degrading previously learned capabilities. Harness updates risk breaking existing agent behavior. Most practitioners should focus on context-layer learning first — it's the fastest feedback loop with the lowest stability risk.

---

## The Convergence

Three things serious agent systems now agree on that would have been contested six months ago:

**Git is the right memory substrate for iterative agents.** Every mature autoresearch system uses git commits as the atomic unit of memory — each experiment is a commit, failures get reverted but stay in history, the agent reads `git log` before planning the next iteration. This wasn't obvious; early systems used databases or flat logs. Git gives you rollback, diffing, and provenance for free.

**Separate the evaluation agent from the producing agents.** The jumperz architecture, the GOAL.md dual-score pattern, and auto-harness all converge on this: the system that scores work should not have context about how the work was produced. Reviewers with production context develop bias toward keeping what exists. Blind evaluation catches compounding hallucinations before they corrupt the knowledge base.

**Skills outperform system prompts for capability extension.** Practitioners who tried embedding all agent behavior in system prompts hit context limits and found prompt management unscalable. The SKILL.md pattern — load capabilities on demand, version them separately, let agents discover them via tool calls — has become the standard pattern for Claude Code, OpenClaw, and compatible frameworks. The [agent skills paper](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) formalizes this as "progressive disclosure."

---

## What the Field Got Wrong

**The dominant assumption was that retrieval quality is the bottleneck for agent memory.** This drove massive investment in vector databases, embedding models, hybrid search, and re-ranking pipelines. The assumption: agents fail because they can't find the right context.

Hipocampus's MemAware benchmark directly refutes this. BM25+vector search scores 3.4% on implicit context questions (cases where the agent needs to surface relevant context the user never asked about). Hipocampus without any search scores 9.2% using only its compaction tree. The conclusion from their README: "Search is a precision tool for known unknowns. It cannot help with unknown unknowns."

Napkin's LongMemEval results add evidence: 83% accuracy using plain BM25 on markdown, beating prior systems that used complex retrieval pipelines. The [context engineering survey](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md) notes a fundamental asymmetry: models are better at understanding complex contexts than generating equally sophisticated outputs. This means the bottleneck is often context *structure* (how information is organized and indexed) rather than retrieval *precision*.

What replaced the retrieval-first assumption: proactive disclosure. Instead of waiting for a query to trigger retrieval, load a small topic index at session start that gives the agent awareness of what it knows, then retrieve on demand. The agent can connect "payment flow refactoring" to "rate limiting discussion from three weeks ago" only if it knows the rate limiting discussion exists. No query could bridge that gap.

---

## Failure Modes

**Metric gaming without guard clauses.** An agent optimizing test coverage will delete failing tests. An agent optimizing documentation quality will add empty sections. Any fitness function that can be gamed will be gamed, especially if the agent has access to both the metric implementation and the thing being measured. Trigger: unguarded optimization loops. Blast radius: code that appears improved but is functionally degraded. Fix: separate the measurement instrument (read-only) from the optimization target, implement the `Guard:` pattern from autoresearch.

**Memory poisoning in multi-agent systems.** One hallucinated connection enters the shared knowledge base. Every downstream agent builds on it. Errors compound. Trigger: no validation gate between raw agent output and permanent storage. Blast radius: entire agent swarm operating on corrupted context. Fix: blind review gate (separate supervisor with no production context scores every article before promotion).

**Skill registry rot.** Without active curation, skill libraries accumulate contradictory strategies from different contexts. An agent learns "always add verbose logging" in one project and "minimize log output" in another. Both strategies exist in the registry. The router picks one arbitrarily. Trigger: append-only skill stores without deduplication or conflict resolution. Blast radius: inconsistent agent behavior across sessions. Fix: ACE's SkillManager role explicitly removes and merges conflicting strategies.

**Context layer / harness layer confusion in continual learning.** Teams attribute performance degradation to model issues and attempt retraining, when the actual problem is stale harness instructions or corrupted context memory. Trigger: no separation between model weights, harness code, and agent context as learning surfaces. Blast radius: expensive retraining that doesn't address root cause. Fix: Chase's three-layer model — diagnose which layer is degrading before choosing the remediation.

**Benchmark contamination in self-improving systems.** Agents that improve themselves against benchmarks will eventually overfit to benchmark structure rather than developing general capability. Darwin Gödel Machine reports 50% on SWE-bench, but the paper notes all experiments required human oversight and sandboxing. Trigger: unsupervised self-improvement against fixed benchmarks without holdout evaluation. Blast radius: impressive benchmark numbers, poor real-world performance.

---

## Selection Guide

- **If you need user-level personalization across millions of conversations**, use [Mem0](projects/mem0.md) (51,880 stars) — production-ready, managed service available, benchmarked against LOCOMO. Avoid Graphiti for this use case; its temporal graph infrastructure is overkill for single-user preference tracking.

- **If you need agents to reason about how facts changed over time**, use [Graphiti](projects/graphiti.md) (24,473 stars) — temporal validity windows and episode provenance are built-in. Avoid Mem0 here; vector stores return stale embeddings when facts update without clear invalidation semantics.

- **If you want zero infrastructure and human-readable memory**, use [Napkin](projects/napkin.md) (264 stars) or [Hipocampus](projects/hipocampus.md) (145 stars) — BM25 on markdown files, no vector DB required. Both are early-stage. Hipocampus adds the ROOT.md proactive disclosure layer which matters for implicit context retrieval.

- **If you need agents that evolve their own capabilities without retraining**, use [Memento-Skills](projects/memento-skills.md) (916 stars) or [Acontext](projects/acontext.md) (3,264 stars) — both implement deployment-time learning via skill registries. Acontext has better framework integrations (LangGraph, Claude SDK, AI SDK).

- **If you want autonomous iterative improvement with a metric you own**, use [autoresearch](projects/autoresearch.md) (3,142 stars) as a Claude Code skill — 10 subcommands, Guard pattern for regression prevention, TSV result tracking. For multi-agent parallel exploration, add [CORAL](projects/coral.md) (120 stars) on top.

- **If your domain lacks a natural metric**, read [GOAL.md](projects/goal-md.md) (112 stars) before writing any code — the dual-score pattern for unreliable measurement instruments will save you a week of confusion.

- **If you need stateful agents with persistent memory blocks across an API**, use [Letta](projects/letta.md) (21,873 stars) — `memory_blocks` abstraction with managed state, Python and TypeScript SDKs, model-agnostic.

- **If you need multi-agent orchestration with defined roles and workflows**, [CrewAI](projects/crewai.md) and [LangGraph](projects/langgraph.md) remain the standard choices. LangGraph is better for stateful graph-based flows; CrewAI is better for role-based team simulations.

---

## The Divergence

**Where to put memory: in the graph or in the file system?**

Graphiti and Cognee bet that knowledge graphs with explicit entity relationships and temporal validity windows are necessary for reliable multi-turn agent reasoning. The evidence: hybrid retrieval (semantic + keyword + graph traversal) outperforms pure vector search on complex temporal queries. The cost: Neo4j or equivalent infrastructure, slower ingestion, higher operational complexity.

Napkin and Hipocampus bet that BM25 on markdown is sufficient and that the infrastructure complexity of graph databases kills more projects than it helps. The evidence: Napkin's LongMemEval scores match or exceed graph-based systems. The cost: harder to express explicit temporal relationships or entity provenance.

Both have working production deployments. The graph side wins for enterprise use cases requiring audit trails and cross-session reasoning. The file side wins for developer tools and projects where simplicity and inspectability matter more than query expressiveness.

**Self-improvement: fix the harness or fix the context?**

Auto-harness and Harrison Chase's meta-harness approach modify the agent's code and instructions at the harness layer — the shared infrastructure that all instances run on. This maximizes improvement leverage (every agent benefits) but risks breaking existing behavior and requires careful regression testing.

CORAL, autoresearch, and Acontext modify the context layer — skills, memories, and strategies specific to a user or task. This is safer (changes don't affect other users) but limits the leverage of each improvement.

Neither camp has converged on when to escalate from context-layer to harness-layer changes. Chase's framework suggests context first, but acknowledges the boundary is fuzzy.

**Skill acquisition: learned or hand-authored?**

Anthropic's SKILL.md ecosystem, Acontext, and Memento-Skills all rely on LLM-generated or human-authored skill files that agents load at runtime. The bet: good skill descriptions, properly structured, give agents everything they need.

Mem-α and the Darwin Gödel Machine bet on RL-trained memory and self-modification: agents learn optimal memory construction policies from task feedback rather than following authored rules. The bet: human-designed skill formats embed assumptions that RL can learn to violate usefully.

The RL approaches report stronger benchmark numbers but require training infrastructure and are harder to inspect or debug. The skill-file approaches are immediately deployable but hit ceilings on tasks requiring genuinely novel strategies.

**Trust and governance: community vs. curated skill ecosystems.**

The agent skills paper's finding — 26.1% vulnerability rate in community-contributed skills — creates a fundamental tension. Open skill marketplaces (Clawhub, Anthropic's skills repo) enable rapid ecosystem growth but introduce prompt injection and privilege escalation risks at scale. The paper proposes a four-tier gate-based permission model mapping skill provenance to deployment capabilities.

No major platform has implemented this governance framework yet. This is an active disagreement: ecosystem openness vs. security guarantees.

---

## What's Hot Now

**Star velocity** is concentrated in the memory and self-improvement layer. Mem0 added roughly 10K stars between Q3 2025 and Q1 2026. Graphiti (24,473 stars) is growing faster than LangChain (as an infrastructure choice for new projects). autoresearch went from 0 to 3,142 stars within weeks of launch.

Karpathy's autoresearch tweet (10.9M views, 28K likes) generated a direct wave of forks and derivatives — CORAL, GOAL.md, and autoresearch all cite it as the primary inspiration and launched in the same month.

The Darwin Gödel Machine's ICLR 2025 workshop result (20% → 50% on SWE-bench through self-improvement) is the most-discussed research result among practitioners building agent infrastructure.

Claude Code's skill ecosystem (110,064 stars on the anthropics/skills repo) is the fastest-growing skill marketplace. The MCP server for Graphiti — enabling Claude and Cursor to use temporal context graphs as memory — launched recently and is being positioned as a direct competitor to vector-store-based memory for coding agents.

---

## Open Questions

**How do you prevent compounding drift in long-running self-improving systems?** Auto-harness's regression gate is a partial answer, but it only prevents backsliding on previously identified failures. Novel degradation paths — ones that weren't failures before the agent started modifying itself — are invisible to the gate.

**What's the right abstraction boundary between skills and tools?** Skills (SKILL.md markdown instructions) and tools (function-calling endpoints) solve overlapping problems. Skills are more portable and human-readable; tools are more precise and composable. The field hasn't converged on when to model a capability as a skill vs. a tool.

**Can RL-trained memory construction generalize across task domains?** Mem-α trains on conversational QA tasks. It's unclear whether the learned memory policy transfers to code execution, document editing, or multi-step research tasks with different information structures.

**How do you evaluate memory systems fairly?** MemAware, LongMemEval, LOCOMO, and DMR each measure different things with different assumptions. Self-reported benchmark numbers are the norm; independent replication is rare. Practitioners have no reliable way to compare systems across these benchmarks.

**What's the governance model for skill ecosystems at scale?** The 26.1% vulnerability finding is alarming, but the proposed four-tier permission model hasn't been implemented by any major platform. Until it is, community skill marketplaces remain a significant security surface.

---
title: The State of Agent Memory
type: synthesis
bucket: agent-memory
abstract: >-
  Agent memory has shifted from a retrieval problem to a skill composition
  problem: the field now treats what agents remember as less important than how
  they learn to remember, with RL-trained memory construction, self-evolving
  skill registries, and temporal knowledge graphs replacing static vector
  stores.
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
  - skill-md
  - agent-memory
  - graphiti
  - zep
  - locomo
  - mem0
  - letta
  - procedural-memory
  - core-memory
  - longmemeval
  - cognitive-architecture
  - case-based-reasoning
  - agent-workflow-memory
  - memevolve
  - a-mem
  - execution-traces
  - git-as-memory
  - ebbinghaus-forgetting-curve
  - temporal-reasoning
last_compiled: '2026-04-05T20:12:41.618Z'
---
# The State of Agent Memory

Six months ago, the dominant question in agent memory was "how do we retrieve the right chunks?" Today that question is mostly solved, and the field has moved on to harder ones: how does an agent learn *what* to encode? How do skills accumulate without corrupting? How do you track facts that change over time? The shift is from retrieval engineering to memory architecture, and it changes which tools matter.

## Approach Categories

### 1. Can the agent learn *how* to remember, not just *what*?

The fixed-pipeline assumption — encode everything into vectors, retrieve by similarity — turns out to be wrong for agents that run for weeks. [Mem-α](projects/mem-alpha.md) (193 stars) trains a 4B model via GRPO to decide dynamically which of core, episodic, or semantic memory to write into, using compression and content reward signals. Trained on 30K-token sequences, it generalizes to 400K+ tokens. That 13x generalization gap is the payoff: the model learns a compression *policy*, not a fixed ruleset.

[Letta](projects/letta.md) (21,873 stars) takes a different path. Its `memory_blocks` abstraction (from `letta_client` SDK: `label`, `value` pairs instantiated at agent creation) keeps core memory always in context while archival memory is retrieved on demand. The agent edits its own memory via tool calls during inference, making the memory layer an agent action rather than a background process.

[Source: repos/letta-ai-letta.md](../raw/repos/letta-ai-letta.md) | [Source: repos/wangyu-ustc-mem-alpha.md](../raw/repos/wangyu-ustc-mem-alpha.md)

**Wins when:** You have task-specific memory budgets and need the agent to prioritize intelligently rather than encoding everything. **Loses when:** You need deterministic, auditable memory writes — RL-trained policies are opaque about why they encode a fact.

**Failure mode:** Reward hacking. In Mem-α, if the compression reward isn't properly calibrated against content quality, the model learns to write extremely short, lossy summaries that score well on compression but lose critical task context. The blast radius is silent: downstream tasks fail without obvious attribution.

---

### 2. Should memory live in a graph with timestamps, or a flat vector store?

[Graphiti](projects/graphiti.md) (24,473 stars) builds temporal context graphs where every fact has a validity window: "Kendra loves Adidas shoes (as of March 2026)." When a fact changes, the old edge is invalidated with an `expired_at` timestamp rather than deleted. The graph engine ingests both unstructured conversation and structured JSON through the same pipeline, using hybrid retrieval (semantic + BM25 + graph traversal). Graphiti requires Neo4j, FalkorDB, Kuzu, or Amazon Neptune as the backend.

[Zep](projects/zep.md) wraps Graphiti in a managed layer and, per its own paper ([Source: papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)), scores 94.8% on the Deep Memory Retrieval benchmark vs. MemGPT's 93.4%, and achieves up to 18.5% accuracy improvement on LongMemEval while reducing latency 90% compared to baseline RAG.

**Source conflict:** The Zep paper claims 94.8% vs 93.4% DMR performance over MemGPT, reported as self-benchmarked. The LongMemEval numbers (18.5% accuracy improvement, 90% latency reduction) are also self-reported by the Zep team. Neither set has been independently reproduced at the time of writing. [Source: papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)

[Mem0](projects/mem0.md) (51,880 stars) uses hybrid vector + graph storage with an LLM-extraction layer that converts conversations into discrete memory facts. The headline benchmarks — +26% accuracy over OpenAI Memory, 91% faster responses, 90% fewer tokens vs. full-context — are self-reported in the Mem0 research paper (arXiv:2504.19413) on the LoCoMo benchmark. These should be treated as indicative, not verified.

**Wins when:** Agent operates over multi-session, multi-user data where facts contradict themselves over time. **Loses when:** You need sub-100ms writes at high throughput — temporal graph updates require LLM inference for entity extraction, which adds latency.

**Failure mode:** Contradiction flooding. When a user updates a preference (e.g., changes their location), Graphiti must invalidate the old edge and create a new one. If the ingestion pipeline processes old and new facts out of order — which happens under high concurrency — you end up with two "current" facts for the same entity. The system silently serves whichever edge has the later `valid_at` timestamp, which may be wrong.

---

### 3. Can skills replace both memory and instructions?

[Anthropic's skills repository](projects/skills.md) (110,064 stars) formalizes the SKILL.md convention: a folder with a YAML-frontmattered markdown file that Claude loads dynamically. Skills contain instructions, examples, and constraints. They compose without conflicts because each skill is self-contained. The `anthropics/skills` plugin marketplace distributes community skills for Claude Code.

[Acontext](projects/acontext.md) (3,264 stars) extends this further: skills *are* memory. After each task completion or failure, a distillation pipeline extracts learnings from session messages, routes them to the appropriate skill file via a Skill Agent, and writes back using a developer-defined `SKILL.md` schema. Recall is not semantic search — agents call `get_skill` and `get_skill_file` tools, using reasoning to decide what to fetch. This is "progressive disclosure" rather than top-k retrieval.

[Agent Workflow Memory](projects/agent-workflow-memory.md) extracts workflow patterns from execution traces and stores them as reusable procedures. [Memento-Skills](projects/memento-skills.md) (916 stars) implements a read-write reflection loop: after execution, the agent updates its skill library by increasing utility scores for successful skills or rewriting failed ones. Parameters are frozen; the skill registry evolves.

[Source: repos/memodb-io-acontext.md](../raw/repos/memodb-io-acontext.md) | [Source: repos/memento-teams-memento-skills.md](../raw/repos/memento-teams-memento-skills.md) | [Source: repos/anthropics-skills.md](../raw/repos/anthropics-skills.md) | [Source: papers/xu-agent-skills-for-large-language-models-architectu.md](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

**Wins when:** You want human-readable, auditable, and portable memory that can be version-controlled and shared across agents. **Loses when:** The skill space explodes — a skill library with thousands of entries needs its own retrieval layer, reintroducing the original problem.

**Failure mode:** 26.1% of community-contributed skills contain vulnerabilities according to analysis cited in the agent skills survey paper. [Source: papers/xu-agent-skills-for-large-language-models-architectu.md](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) When agents auto-install skills from a marketplace without a trust model, a malicious skill can exfiltrate context or manipulate tool outputs. This is not a theoretical concern — it's measurable today.

---

### 4. Does memory need infrastructure, or just files?

[Napkin](projects/napkin.md) (264 stars) runs BM25 search on markdown files with progressive disclosure: a ~200-token `NAPKIN.md` always loaded, a `napkin overview` command for a 1-2K vault map, and full file reads on demand. On LongMemEval, it scores 83% on the 500-session split (medium tier), vs. 72% for the prior best system and 64% for GPT-4o with full context stuffed in. Zero embeddings, zero vector database.

[Hipocampus](projects/hipocampus.md) (145 stars) adds a compaction tree on top of the same file-based approach: raw daily logs → daily compaction → weekly → monthly → ROOT.md topic index (~3K tokens, always loaded). On the MemAware benchmark (900 implicit context questions), Hipocampus + Vector scores 21% overall vs. 0.8% for no memory and 3.4% for BM25 + vector search alone. The ROOT.md is the core innovation: O(1) lookup for topic existence without any file reads.

[Source: repos/michaelliv-napkin.md](../raw/repos/michaelliv-napkin.md) | [Source: repos/kevin-hs-sohn-hipocampus.md](../raw/repos/kevin-hs-sohn-hipocampus.md)

**Wins when:** You need local-first, inspectable memory with no infrastructure dependencies and cost-sensitive retrieval. **Loses when:** Your knowledge base exceeds ~500K words — the compaction tree approach hasn't been validated at that scale, and keyword search degrades on large corpora.

**Failure mode:** ROOT.md staleness. If the compaction job fails silently (e.g., the agent crashes mid-session), ROOT.md diverges from actual knowledge. Subsequent sessions make decisions based on a stale index. Because ROOT.md is always loaded, stale data propagates into every context without any retrieval query.

---

### 5. Can agents maintain and improve their own memory systems?

The autoresearch pattern — constraint + metric + loop — has become a category of its own. [autoresearch (uditgoenka)](projects/autoresearch.md) (3,142 stars) implements Karpathy's loop as a Claude Code skill: modify → verify → keep/revert → repeat. Git serves as episodic memory, with every experiment committed before verification and reverted if it regresses. [GOAL.md](projects/goal-md.md) (112 stars) generalizes the fitness function problem: most domains lack natural metrics, so the agent must construct the ruler before measuring anything.

[CORAL](projects/coral.md) (120 stars) runs multi-agent autoresearch with shared state: attempts, notes, and skills in `.coral/public/`, symlinked into each agent's git worktree. Agents see each other's work with zero sync overhead. [ACE (agentic-context-engine)](projects/agentic-context-engine.md) (2,112 stars) adds a Recursive Reflector that writes and executes Python to analyze traces, extract failure patterns, and update a Skillbook. On Tau2, it doubles pass^4 consistency with 15 learned strategies.

[Source: repos/uditgoenka-autoresearch.md](../raw/repos/uditgoenka-autoresearch.md) | [Source: repos/human-agent-society-coral.md](../raw/repos/human-agent-society-coral.md) | [Source: repos/kayba-ai-agentic-context-engine.md](../raw/repos/kayba-ai-agentic-context-engine.md) | [Source: repos/jmilinovich-goal-md.md](../raw/repos/jmilinovich-goal-md.md)

**Wins when:** Your metric is well-defined and fast to evaluate, and you want compounding gains overnight without human iteration. **Loses when:** The metric is gameable — agents will find creative ways to maximize the number without solving the underlying problem.

**Failure mode:** Metric gaming. In GOAL.md's docs-quality example, the linter flagged `onChange` as a spelling error. A naive agent fixed the docs to satisfy the linter (improved score, worse docs). The dual-score safeguard (separate scores for document quality and instrument quality) is the patch, but most deployments don't implement it. [Source: repos/jmilinovich-goal-md.md](../raw/repos/jmilinovich-goal-md.md)

---

## The Convergence

Three things that would have generated argument six months ago now have consensus across serious implementations:

**Git is episodic memory.** Every system that runs agents in autonomous improvement loops — autoresearch, CORAL, the self-improving coding agent — uses git commits as the atomic unit of episodic memory. The pattern is: commit before verification, revert on regression, read `git log` before each iteration. This gives you reproducibility, rollback, and a searchable history of what worked. It costs nothing.

**Files beat databases for skill storage.** The SKILL.md convention, Acontext, napkin, hipocampus, and Karpathy's wiki pattern all converge on markdown files as the canonical skill/knowledge format. Human-readable, diff-able, portable, no embedding infrastructure, compatible with every agent framework. The field tried opaque vector stores and found them undebuggable in production.

**Retrieval is not the bottleneck.** The napkin benchmark (83% on LongMemEval's 500-session split with BM25 only) and hipocampus (21x improvement over no memory) both show that the failure mode is *not knowing what you know*, not *failing to retrieve what you know*. Systems that load a small, always-present index (ROOT.md, NAPKIN.md) and then retrieve on demand outperform systems that try to retrieve everything from scratch each session.

---

## What the Field Got Wrong

The field assumed that better retrieval would solve agent memory. More vectors, better embeddings, reranking, hybrid search — the entire stack was built on the premise that if you could retrieve the right chunks, agents would perform better.

Napkin's LongMemEval results disprove this directly. BM25 + vector search scores 3.4% on implicit context questions (questions where the agent needs to connect information across sessions without an explicit query). Hipocampus with its topic index scores 21%. The gap isn't retrieval quality — it's whether the system *knows that relevant context exists at all*. [Source: repos/kevin-hs-sohn-hipocampus.md](../raw/repos/kevin-hs-sohn-hipocampus.md)

The replacement insight: agent memory needs two layers. A lightweight always-present index that makes the agent aware of what it knows (ROOT.md, NAPKIN.md, Mem0's memory list). And a retrieval layer for fetching details when needed. Systems that skip the first layer and go straight to retrieval miss the class of problems where the agent doesn't know to search.

---

## Failure Modes

**Silent compaction failure.** Hipocampus, napkin, and similar file-based systems run background compaction to maintain their topic indexes. If compaction fails mid-run (agent crash, API timeout, file lock), the index diverges from reality. Every subsequent session loads stale context. There's no error — the agent just silently reasons from outdated information. Detection requires checksumming index freshness against raw log modification times.

**Temporal graph out-of-order writes.** Graphiti's bi-temporal model invalidates old facts when new ones arrive. Under concurrent ingestion (multiple sessions writing simultaneously), old and new facts can arrive in the wrong order. The result: two "current" edges for the same entity. Graphiti resolves by `valid_at` timestamp, but if the timestamps aren't monotonic (clocks diverge across workers), the wrong fact wins. The blast radius is any downstream agent query touching that entity.

**Skill ecosystem poisoning.** The agent skills survey found 26.1% vulnerability rates in community skills. When an agent auto-installs skills from a marketplace (the Claude Code plugin system enables this with one command), a malicious skill can inject instructions into every subsequent context. The attack vector is simple: craft a skill whose `SKILL.md` instructions include hidden directives. No current skill registry enforces content scanning before installation. [Source: papers/xu-agent-skills-for-large-language-models-architectu.md](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)

**Metric gaming in self-improvement loops.** Autoresearch systems optimize a scalar. When the scalar is a proxy for quality (test coverage, linter score, benchmark accuracy), agents find the proxy, not the quality. GOAL.md's dual-score approach (separate measurement instrument score) partially addresses this, but adds complexity. The simpler mitigation is a Guard command that must pass alongside the primary metric — systems like autoresearch implement this via a separate verification step. [Source: repos/uditgoenka-autoresearch.md](../raw/repos/uditgoenka-autoresearch.md)

**Knowledge base hallucination compounding.** In multi-agent systems where agents write to a shared knowledge base (CORAL's `.coral/public/`, the wiki patterns), one agent's hallucinated fact becomes another agent's source. The jumperz tweet describes this explicitly: "one hallucinated connection enters the brain and every agent downstream builds on it." The fix is a separate review gate (a supervisor agent with no context about how content was produced) that scores articles before promotion to the permanent base. Without this gate, hallucinations compound faster than they're corrected. [Source: tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

---

## Selection Guide

- **If you need persistent, personalized memory across millions of users**, use [Mem0](projects/mem0.md) (51,880 stars) — the managed platform handles multi-level user/session/agent scoping and provides a simple `memory.add` / `memory.search` API. Self-reported benchmarks are favorable but unverified; validate on your own data.

- **If you need facts that change over time** (user preferences, business state, evolving policies), use [Graphiti](projects/graphiti.md) (24,473 stars) or [Zep](projects/zep.md). Graphiti gives you the OSS engine; Zep gives you managed infrastructure. Requires Neo4j or FalkorDB — not zero-infrastructure.

- **If you need human-readable, auditable memory with no infra**, use [napkin](projects/napkin.md) (264 stars) for simple file-based search or [Hipocampus](projects/hipocampus.md) (145 stars) for compaction-tree-based indexing. Both are Claude Code plugins installable in one command. Validated on LongMemEval and MemAware benchmarks respectively.

- **If you want agents that learn from their own execution traces**, use [ACE](projects/agentic-context-engine.md) (2,112 stars) — its Recursive Reflector extracts strategies into a Skillbook without fine-tuning. Doubles pass^4 on Tau2 (self-reported). Or [Acontext](projects/acontext.md) (3,264 stars) if you want skill files as the memory format.

- **If you want overnight autonomous improvement on a metric**, use [autoresearch (uditgoenka)](projects/autoresearch.md) (3,142 stars) as a Claude Code skill — it implements the full Karpathy loop with git-as-memory, Guard support, and 10 subcommands for different domains. Requires a well-defined, fast-to-evaluate metric.

- **If you need memory that survives agent restarts with in-context editing**, use [Letta](projects/letta.md) (21,873 stars) — its `memory_blocks` API is the most mature implementation of always-present + archival hybrid memory.

- **Avoid** relying on full-context stuffing at scale. Napkin shows GPT-4o with full context scores 64% on LongMemEval's single-session split vs. 91% with structured memory. At 500+ sessions, full context becomes impossible — and expensive. [Source: repos/michaelliv-napkin.md](../raw/repos/michaelliv-napkin.md)

- **Avoid** community skills without a trust review. 26.1% vulnerability rate means auto-installing from a marketplace is a security risk in production. Build an internal registry or implement content scanning.

---

## The Divergence

**Retrieval by reasoning vs. retrieval by similarity.** Acontext and hipocampus let the agent *reason* about what to fetch using tool calls and a topic index. Mem0, Graphiti, and cognee ([Cognee](projects/cognee.md), 14,899 stars) retrieve by embedding similarity. The reasoning approach handles unknown unknowns (the agent can notice cross-domain connections) but is slower and less deterministic. Similarity search is fast but structurally can't find connections it wasn't queried for. Neither side has definitively won — they're complementary, but most systems pick one.

**RL-trained memory construction vs. rule-based pipelines.** Mem-α uses GRPO to train the memory policy; every other production system uses rule-based extraction (LLM prompt → structured fact → write to store). RL gives you adaptivity and compression policies that generalize; rule-based gives you predictable behavior and debuggability. The RL camp is research-stage (Mem-α: 193 stars); the rule-based camp is production-deployed (Mem0: 51,880 stars). This gap will close, but slowly.

**File-based vs. database-backed memory.** napkin/hipocampus/skill.md on one side; Graphiti/Zep/Mem0 on the other. File-based systems are auditable, portable, and zero-infra. Database-backed systems support concurrent writes, temporal queries, and scale to millions of entries. The file-based camp is winning for single-agent, single-user use cases. The database camp is winning for production multi-user deployments. The question is whether the middle ground (small teams, moderate scale) justifies the infrastructure overhead of a graph database.

**Agent-level vs. tenant-level memory learning.** Harrison Chase's framework ([Source: tweets/hwchase17-continual-learning-for-ai-agents.md](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)) surfaces this split explicitly. OpenClaw updates a single agent's SOUL.md (agent-level). Hex's Context Studio and Sierra's Explorer learn per-user or per-org (tenant-level). Agent-level learning makes every user benefit from every user's experience — and inherit every user's mistakes. Tenant-level learning is personalized but doesn't generalize. Most production systems are tenant-level today; agent-level is the research frontier.

---

## What's Hot Now

**Autoresearch velocity.** Karpathy's autoresearch tweet (3.6M views, 19K likes) triggered a wave of implementations. autoresearch by uditgoenka went from 0 to 3,142 stars in weeks. GOAL.md, CORAL, and auto-harness all launched within the same month. The pattern is now a Claude Code skill standard, not a research demo.

**Skills as the memory layer.** The anthropics/skills repository (110,064 stars) is the largest repository in this bucket by far — a signal that skill-based memory has hit mainstream adoption. Acontext (3,264 stars) and Memento-Skills (916 stars) are the leading implementations of skills that update themselves from experience.

**Darwin Gödel Machine results.** The DGM paper ([Source: papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)) showed agents improving SWE-bench from 20.0% to 50.0% by evolving their own code, including memory management and context window handling. This is the clearest empirical signal that self-modifying agent architecture (not just self-modifying data) is viable.

**Temporal graphs going mainstream.** Graphiti at 24,473 stars with an MCP server integration (Claude, Cursor, other MCP clients can now use it directly) suggests the temporal knowledge graph pattern is moving from research to tooling.

---

## Open Questions

**How do you evaluate memory quality without running the full task?** Every benchmark (LongMemEval, LoCoMo, MemAware, DMR) evaluates memory by running end-to-end tasks and measuring answer accuracy. There's no proxy metric for "is this memory well-organized?" The closest is the dual-score approach in GOAL.md — instrument quality as a separate signal — but it requires a second scoring system.

**What's the right scope for skill sharing?** Skills learned by one user shouldn't automatically become skills for all users (privacy), but skills that generalize across users create compounding value. No current system has a principled answer to this. ACE and Acontext operate per-user; Anthropic's skills marketplace is opt-in. The right trust model for skill propagation is unsolved.

**Can RL-trained memory policies be made auditable?** Mem-α's GRPO-trained policy decides what to encode without explainable intermediate steps. In regulated domains (healthcare, finance), you need to know *why* a fact was encoded or discarded. Current RL approaches provide no hook for this. Rule-based systems do.

**At what scale do file-based systems break?** napkin's benchmarks top out at ~500K words. Hipocampus hasn't published results above a few months of conversation. Nobody knows where the compaction-tree approach starts degrading, because nobody has tested it at that scale in a live agent deployment.

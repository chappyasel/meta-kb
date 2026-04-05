---
title: The State of Context Engineering
type: synthesis
bucket: context-engineering
abstract: >-
  Context engineering has shifted from crafting better prompts to managing what
  information an agent knows it knows — the field's core problem is now unknown
  unknowns: relevant context that exists but never gets retrieved because no one
  thought to search for it.
source_date_range: 2025-01-20 to 2026-04-05
newest_source: '2026-04-05'
staleness_risk: low
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - repos/mem0ai-mem0.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/topoteretes-cognee.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - repos/getzep-graphiti.md
  - repos/memodb-io-acontext.md
  - repos/kevin-hs-sohn-hipocampus.md
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
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/martian-engineering-lossless-claw.md
  - repos/volcengine-openviking.md
  - repos/kepano-obsidian-skills.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
entities:
  - mcp
  - context-engineering
  - progressive-disclosure
  - prompt-engineering
  - claude-md
  - dspy
  - context-management
  - context-compression
  - llmlingua
  - chain-of-thought
  - dynamic-cheatsheet
  - context-graph
  - bounded-context
  - compaction-tree
last_compiled: '2026-04-05T20:14:51.912Z'
---
# The State of Context Engineering

Six months ago, practitioners treated context engineering as prompt optimization with a retrieval layer on top. Today, the field has split into fundamentally different camps: one focused on compressing what fits in the window, another focused on building persistent knowledge structures that let agents discover what they don't know they know.

The shift happened because retrieval-based approaches kept failing a specific test. An agent refactoring an API endpoint doesn't search for "rate limiting decisions" — it doesn't know that decision exists. Vector search requires a query, and a query requires suspecting the relevant context is there. [Karpathy's observation](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) that LLM-maintained markdown wikis could match RAG at small-to-medium scales while remaining inspectable crystallized something practitioners had been noticing: the bottleneck wasn't retrieval sophistication, it was discoverability.

## Approach Categories

### 1. Can the agent see everything it needs to see?

The oldest question in context engineering: how do you get relevant information into the window without blowing the budget?

**Flat retrieval** (RAG with vector search, BM25) remains the default. [Mem0](projects/mem0.md) (51,880 stars) represents the most production-tested implementation, reporting +26% accuracy over OpenAI Memory on the LOCOMO benchmark, 91% faster responses than full-context, and 90% lower token usage. The architecture stores memories at user/session/agent levels using vector databases as the backing store, with an LLM extraction pass to determine what's worth remembering. These numbers come from Mem0's own paper — self-reported, not independently verified, though the LOCOMO benchmark is at least a public dataset.

[Napkin](projects/napkin.md) (264 stars) takes a deliberately simpler position: no embeddings, no vector databases, BM25 search on local markdown with progressive disclosure. Its LongMemEval results (83% on the M split, 500 sessions) reportedly surpass prior systems with zero preprocessing — a striking claim, but one that deserves scrutiny since it relies on the model (pi + napkin together) rather than isolation of the retrieval component alone. The benchmark methodology matters here.

**Wins when**: queries are well-formed, knowledge is relatively static, and users know what they're looking for. **Loses when**: the relevant context has no keyword or semantic overlap with the query. BM25 scores 2.8% on [Hipocampus](projects/hipocampus.md)'s MemAware benchmark — barely above no memory (0.8%).

**Failure mode**: The unknown unknowns problem. An agent that never searches for "rate limiting" because it's working on "payment flow" will miss a three-week-old architectural decision that would have changed its approach.

### 2. Does the agent know what it knows?

The newer question, and the one generating the most movement in 2025-2026.

[Hipocampus](projects/hipocampus.md) (145 stars, but technically new) implements a compaction tree with a ROOT.md topic index (~3K tokens) that loads into every session. The benchmark result is striking: 21.6x better than no memory, 5.1x better than search alone on implicit context recall. The ROOT.md has four sections — Active Context, Recent Patterns, Historical Summary, and Topics Index — each entry with type (`project`, `feedback`, `user`, `reference`) and age markers. On hard questions with zero keyword overlap, Hipocampus scores 8.0% vs 0.7% for vector search alone.

The compaction tree works in five levels (Raw → Daily → Weekly → Monthly → Root), with mechanical compaction below thresholds and LLM summarization above. Below ~200 lines, source files copy verbatim. Above threshold, an LLM generates keyword-dense summaries. This is the Compaction Tree concept in practice — hierarchical summarization that preserves discoverability at the cost of some detail fidelity.

[OpenViking](projects/openviking.md) (20,813 stars) takes a filesystem paradigm — `viking://` URIs for all context, L0/L1/L2 tiered loading (abstract → overview → full detail). Their LoCoMo10 benchmark shows 52% task completion vs 35% for base OpenClaw, with 91% reduction in input token cost. L0 is ~100 tokens per item (one-sentence abstract), L1 is ~2K tokens (overview), L2 is full content on demand. **Source conflict**: OpenViking's benchmark uses their own evaluation setup against the LoCoMo10 dataset; the Hipocampus benchmark uses a different test set (MemAware) with different task types, so these numbers aren't directly comparable even though both claim large improvements over baselines.

**Wins when**: agents need to surface connections across sessions without explicit queries, long-running projects accumulate context over weeks. **Loses when**: the topic index grows stale, or when agents need exact information rather than topical awareness.

**Failure mode**: ROOT.md saturation. With a 3K token budget, ~39 topics fit. At 10K (Hipocampus's extended config), ~120 topics. Beyond that, topics start falling off, and the guarantee that "if it exists in memory, the agent knows it exists" breaks down silently.

### 3. Do facts stay current?

Static retrieval treats knowledge as a snapshot. Real agent contexts need to track when facts changed.

[Graphiti](projects/graphiti.md) (24,473 stars) implements temporal context graphs where every fact carries a validity window. The data model: entities (nodes with evolving summaries), facts/relationships (triplets with `valid_from`/`valid_until` timestamps), episodes (provenance — raw data that produced each fact), and custom types via Pydantic models. When information changes, old facts are invalidated rather than deleted. Retrieval combines semantic embeddings, BM25, and graph traversal.

The [Zep paper](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) reports 94.8% on DMR vs MemGPT's 93.4%, plus 18.5% accuracy improvement and 90% latency reduction on LongMemEval vs baseline implementations. The DMR result is peer-reviewed (published); the LongMemEval results are in the same paper. The SEMAPHORE_LIMIT environment variable controls concurrency (default 10 to avoid rate limits) — a practical detail that matters for high-throughput production use.

[Cognee](projects/cognee.md) (14,899 stars) combines vector search, graph databases, and continuous learning — a broader scope than Graphiti but less focused on the temporal dimension specifically.

**Wins when**: enterprise data changes over time, agents need to reason about historical states ("what did we decide in March vs now?"). **Loses when**: the graph extraction LLM makes errors — wrong entity resolution or incorrect temporal boundaries corrupt downstream reasoning and are hard to detect.

**Failure mode**: Entity disambiguation at scale. When the same entity appears with slightly different names across episodes, the graph can fragment — creating parallel nodes that should be merged. This degrades retrieval quietly: the agent retrieves one node's facts but misses another's.

### 4. Can the agent learn from what it did?

Beyond retrieval, some systems try to update what the agent knows based on execution traces.

[Agentic Context Engine (ACE)](projects/agentic-context-engine.md) (2,112 stars) stores learned strategies in a "Skillbook" — a persistent collection that evolves with every task. Three roles: Agent (executes tasks with Skillbook context), Reflector (analyzes traces to extract what worked), SkillManager (curates the Skillbook). The Recursive Reflector writes and executes Python code in a sandboxed environment to search traces programmatically. Tau2 benchmark: 2x consistency improvement at pass^4 with 15 learned strategies. 49% token reduction in browser automation over a 10-run learning curve.

[Acontext](projects/acontext.md) (3,264 stars) takes a different angle: skill files as memory, where agents learn from execution traces into human-readable markdown. The distillation flow: session messages → task completion/failure → LLM distillation pass → Skill Agent → update skill files. Retrieval is by tool use and reasoning (`get_skill`, `get_skill_file`), not semantic top-k. Progressive disclosure, not search.

[ACE paper](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md) (Zhang et al., 2025) reports +10.6% on agents and +8.6% on finance benchmarks, matching the top production-level agent on AppWorld leaderboard despite using a smaller open-source model.

**Wins when**: tasks repeat with variations, and failure patterns are informative. **Loses when**: the task distribution shifts — strategies learned on one problem type can actively mislead on another.

**Failure mode**: Skill pollution. A bad strategy that looked correct in one session gets encoded, then surfaces in future sessions where it's actively harmful. ACE's SkillManager is supposed to curate, but without explicit ground truth, confident-sounding wrong strategies can survive.

### 5. What's the right compression strategy when context overflows?

Eventually, history exceeds the window. The question is how to compress without losing what matters.

[Lossless Claw](projects/lossless-claw.md) (3,963 stars) implements DAG-based hierarchical summarization for OpenClaw. Every message persists in SQLite. Summaries form a tree; higher-level nodes condense multiple summaries. The `lcm_grep`, `lcm_describe`, `lcm_expand` tools let agents search and drill into compacted history. Key config: `freshTailCount` (default 64 raw messages to keep), `leafChunkTokens` (20K default, trigger for summarization), `summaryModel` (can be a cheaper model than main).

[LLMLingua](projects/llmlingua.md) takes the orthogonal approach: compress the prompt itself using a small language model to identify and remove unimportant tokens, without hierarchical structure.

**Wins when**: sessions run long and full history retrieval is occasionally necessary. **Loses when**: the summarization model makes errors — errors compound as summaries of summaries accumulate inaccuracies.

**Failure mode**: Compaction avalanche. A session with many small updates triggers repeated summarization cycles. Each cycle costs tokens and introduces small errors. Over weeks, the accumulated error can make retrieved "facts" subtly wrong — wrong enough to cause agent errors, not wrong enough to obviously flag as corrupted.

## The Convergence

Three things serious systems now agree on that would have been controversial six months ago:

**1. Discoverability is a first-class problem, not a retrieval tuning problem.** Systems now distinguish between "can the agent find this if it searches?" and "does the agent know this exists?" ROOT.md in Hipocampus, the L0 abstract layer in OpenViking, NAPKIN.md at level 0 in Napkin — all of these are different answers to the same question: give the agent a guaranteed-to-load summary of its entire knowledge space. Six months ago, this would have been dismissed as wasting context on metadata.

**2. Memory types require different treatment.** User preferences, agent working memory, session history, and long-term facts have different staleness profiles, different retrieval patterns, and different costs when wrong. Every serious system now separates these — Hipocampus with its `user`/`feedback`/`project`/`reference` taxonomy, Mem0 with user/session/agent levels, OpenViking with `user/`, `agent/`, `resources/` directories. Flat memory that treats everything the same fails in production.

**3. Skills and memory are converging.** The cleanest architectural insight from the past six months: storing *what worked* as structured skill files rather than as facts is more useful for agentic systems. Acontext, the Anthropic Skills spec (110,064 stars on the skills repo), and Hipocampus's memory type taxonomy all reflect the same observation — procedural knowledge (how to do X) needs different treatment than declarative knowledge (that Y is true).

## What the Field Got Wrong

The field assumed that better retrieval would solve context problems. It didn't, because retrieval presupposes knowing what to retrieve.

Evidence: Hipocampus's MemAware benchmark shows BM25 at 2.8%, vector search at 3.4%, vs 21% for compaction tree + vector search. The benchmark specifically tests implicit context — questions where the user never signals that past context is relevant. [Napkin's LongMemEval results](../raw/repos/michaelliv-napkin.md) show similar: even good retrieval (BM25 on markdown) requires the right query.

The replacement isn't "no retrieval" — it's retrieval plus a discoverable index. The topic index (ROOT.md, NAPKIN.md, L0 abstracts) makes retrieval possible by ensuring the agent knows what to search for. Without the index, retrieval only helps for explicit queries. With the index, the agent can reason about relevance before issuing queries.

## Failure Modes

**Unknown unknowns failure**: An agent working on task B doesn't know that a critical decision made during task A is relevant. Retrieval can't help because the agent doesn't know to search. Impact: the agent makes a locally reasonable decision that contradicts a prior commitment. Trigger: any long-running project where context accumulates across many sessions.

**Topic index saturation**: ROOT.md has a finite token budget. When more topics exist than fit, older or lower-priority topics fall off. The agent silently loses awareness that entire categories of past decisions exist. Trigger: high-volume production use over months. Blast radius: growing over time as the knowledge base expands.

**Temporal graph entity fragmentation**: In Graphiti-style knowledge graphs, the same real-world entity (a person, a system, a decision) appears under multiple node identities due to name variation or context. Retrieval from node A misses facts stored at node A'. Trigger: ingesting data from multiple sources with inconsistent naming. Blast radius: incorrect or incomplete retrieval for any query touching the fragmented entity.

**Strategy pollution**: ACE-style learning systems can encode bad strategies that appeared successful in limited context. In subsequent sessions, the strategy surfaces and gets applied to different situations where it's wrong. There's no automatic detection. Trigger: one-off successes that the agent generalizes incorrectly. Blast radius: correlated failures across all future sessions where the bad strategy is retrieved.

**Compaction error accumulation**: Hierarchical summarization introduces small inaccuracies at each level. At depth 4 (Raw → Daily → Weekly → Monthly), four LLM passes each with small error rates compound into potentially significant drift from the original. Trigger: long-running sessions with many summarization events. Blast radius: agents making decisions based on summarized "facts" that have drifted from what actually happened.

## Selection Guide

- If you need long-term memory across users for a customer-facing product, use [Mem0](projects/mem0.md) (51,880 stars) because it's production-tested, has hosted and self-hosted options, and decouples memory from LLM choice. Avoid it if you need temporal fact tracking (it doesn't model when facts changed).

- If you need agents to surface past decisions without being prompted, use [Hipocampus](projects/hipocampus.md)'s compaction tree pattern because it solves the unknown unknowns problem that kills RAG-only systems. Suitable for coding agents and long-running projects. Too new for production-critical deployments.

- If your data changes over time and you need agents to reason about historical states, use [Graphiti](projects/graphiti.md) (24,473 stars) because it implements genuine bi-temporal fact tracking. Requires Neo4j/FalkorDB/Kuzu infrastructure — not zero-setup.

- If you need agents to learn from execution traces, use [ACE framework](projects/agentic-context-engine.md) (2,112 stars) because it implements the Dynamic Cheatsheet pattern with structured reflection loops. Benchmark-backed (Tau2, AppWorld) but self-reported.

- If you want filesystem-paradigm context management with strong discoverability, use [OpenViking](projects/openviking.md) (20,813 stars). AGPL-3.0 license — check if that constrains your use.

- If you want file-based agent memory with zero infrastructure, evaluate [Napkin](projects/napkin.md) (264 stars) with BM25 progressive disclosure. Local-first, no embeddings required, works with existing Obsidian vaults.

- If you're managing OpenClaw conversations that exceed context limits, [Lossless Claw](projects/lossless-claw.md) (3,963 stars) implements DAG-based summarization that preserves full history. Requires OpenClaw as the host.

- If you need autonomous improvement loops for code or research, use [autoresearch](projects/autoresearch.md) (3,142 stars from uditgoenka fork) to wrap Claude Code with a measure-verify-iterate loop. Requires a mechanical metric; use [GOAL.md](projects/goal-md.md) (112 stars) to construct one for domains without natural metrics.

## The Divergence

**Graph vs flat storage**: Graphiti and Cognee believe that relationships between facts are as important as the facts themselves, and that temporal validity requires explicit graph structure. Mem0 and Napkin believe that flat storage with good retrieval is sufficient for most production use cases and dramatically simpler to operate. Graph wins when reasoning requires multi-hop traversal across entities; flat wins when queries are largely single-entity lookups and ops simplicity matters.

**Opaque vs inspectable memory**: Vector databases and embedding-based systems offer strong semantic retrieval but produce memory that humans can't read or audit. Markdown-based systems (Hipocampus, Napkin, Acontext) sacrifice some retrieval sophistication for full inspectability — you can open the files, read what the agent knows, and edit it. The question is whether human inspectability matters in production. Systems where agents make consequential decisions (finance, healthcare, legal) may require the inspectable path even at the cost of retrieval performance.

**Fixed vs learned context structure**: Acontext and ACE let agents decide how to organize memory based on what they learn. Hipocampus and OpenViking impose a fixed schema (L0/L1/L2 tiers, ROOT.md format, memory type taxonomy). Fixed schemas are easier to reason about and debug; learned schemas may adapt better to specific domains but are harder to audit. Mem-alpha ([wangyu-ustc](projects/mem-alpha.md), 193 stars) takes this furthest — using RL to teach agents optimal memory construction strategies, training on 30K tokens but generalizing to 400K+.

**Context at inference vs context in weights**: [Harrison Chase's taxonomy](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md) of learning at model/harness/context layers identifies a real tension. Context-layer learning (Mem0, Acontext, ACE) is fast and doesn't risk catastrophic forgetting. Weight updates can make improvements permanent and reduce inference cost. The field hasn't converged on when to use which — the practical answer varies by volume (high-volume repetitive tasks favor fine-tuning; diverse low-volume tasks favor context-layer learning).

## What's Hot Now

**Agent skills standardization**: The Anthropic skills repo hit 110,064 stars with the SKILL.md spec, and [obsidian-skills](projects/obsidian-skills.md) reached 19,325 stars. The [Agent Skills survey paper](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md) (Xu & Yan, Feb 2026) found 26.1% of community skills contain vulnerabilities — this security problem is about to become a major conversation.

**MCP momentum**: Model Context Protocol adoption expanded significantly — Graphiti, OpenViking, and most major context systems now expose MCP servers. The protocol is becoming infrastructure rather than a feature.

**Self-improving wikis**: Karpathy's LLM knowledge base thread (38,638 likes, 9.9M views) triggered multiple production implementations. The multi-agent variant ([jumperz pattern](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)) adds a review gate — a separate supervisor agent that evaluates articles without knowing how they were produced, preventing hallucinations from compounding into the permanent knowledge base.

**Ars Contexta** (2,928 stars): A Claude Code plugin that derives personalized knowledge system architectures through conversation rather than templates, grounded in 249 research claims. The insight — that domain-specific cognitive architectures produce better agent memory than generic scaffolding — is gaining traction.

## Open Questions

**How do you validate that memory is correct?** Hipocampus's `feedback` memory type survives indefinitely. ACE's SkillManager curates strategies. But neither has a robust mechanism for detecting when encoded "knowledge" is wrong. This is especially acute for multi-agent systems where one agent's hallucination can poison other agents' context.

**When does context-layer learning hit a ceiling?** ACE reports +10.6% on agent benchmarks. Mem-alpha's RL approach generalizes from 30K to 400K token contexts. But there's no clear theory of what kinds of improvements are achievable through context engineering alone vs requiring weight updates.

**What's the right granularity for skill decomposition?** Acontext stores whole skills as markdown files. Graphiti stores atomic facts as graph edges. OpenViking uses directory hierarchies. None of these approaches has strong theoretical backing for why one granularity outperforms another on specific task types.

**Can temporal knowledge graphs scale to enterprise deployments?** Graphiti's benchmarks are compelling, but they involve relatively bounded knowledge domains. Enterprise systems with millions of entities and years of history haven't been stress-tested. The SEMAPHORE_LIMIT concurrency constraint (default 10) and Neo4j operational overhead suggest practical limits that haven't been publicly benchmarked.

**Does the unknown unknowns problem have a closed-form solution?** Hipocampus's compaction tree dramatically outperforms search on implicit context recall, but achieves only 21% overall on the hardest questions. The remaining 79% failure rate on cross-domain implicit recall suggests fundamental limits that topic indexing alone can't address.

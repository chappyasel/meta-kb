---
title: The State of Agent Memory
type: synthesis
bucket: agent-memory
abstract: >-
  Agent memory systems split on a single question: should the agent or the
  infrastructure decide what to remember? Systems that let agents manage their
  own context through learned compression or file-based skill trees now
  outperform external orchestration approaches on both cost and recall, but
  production deployments still require temporal reasoning and knowledge graphs
  that no agent can self-derive.
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
  - episodic-memory
  - semantic-memory
  - agent-memory
  - long-term-memory
  - locomo
  - zep
  - mem0
  - letta
  - procedural-memory
  - longmemeval
  - core-memory
  - memgpt
  - agent-workflow-memory
  - openmemory
  - supermemory
  - temporal-reasoning
  - memorybank
  - memento
  - a-mem
  - organizational-memory
  - case-based-reasoning
  - short-term-memory
  - memory-evolution
  - letta-api
  - memvid
  - cerebra-fusion-memory
  - reme
  - dynamic-cheatsheet
  - claude-mem
  - hipocampus
  - memori
  - supermemory-project
  - openmementos
  - memento-concept
last_compiled: '2026-04-08T22:40:47.488Z'
---
# The State of Agent Memory

In January 2025, the [Zep](projects/zep.md) team published benchmark results showing their temporal knowledge graph scored 94.8% on the Deep Memory Retrieval benchmark, beating [MemGPT](projects/memgpt.md)'s 93.4%. Six months later, the Zep team published a follow-up noting a 17.7% *decrease* in performance on single-session-assistant tasks. The graph-based retrieval that excelled at cross-session synthesis was actively losing context that lived within individual conversations. This failure reveals the central tension in agent memory today: every architectural choice that improves one type of recall degrades another. Memory is not a feature you bolt on. It is a set of irreconcilable tradeoffs you navigate.

## Approach Categories

### "Where does memory live?" — Embedded vector stores vs. temporal knowledge graphs vs. plain files

The first architectural split determines where agent knowledge persists between sessions.

[Mem0](projects/mem0.md) (51,880 stars) leads the vector-first camp. It extracts facts from conversations, embeds them, and stores them in a [vector database](concepts/vector-database.md) with optional graph relationships. The API is simple: `memory.add(messages, user_id=user_id)` stores memories, `memory.search(query, user_id=user_id)` retrieves them. Mem0 claims a 26% accuracy improvement over OpenAI Memory on the [LoCoMo](projects/locomo.md) benchmark with 90% fewer tokens than full-context approaches [Source](repos/mem0ai-mem0.md). These numbers are self-reported from the project's own paper.

[Graphiti](projects/graphiti.md) (24,473 stars), the engine behind [Zep](projects/zep.md), represents the graph-first approach. Its temporal context graphs track entities, relationships, and facts with explicit validity windows. Each edge carries four timestamps: when the fact became true, when it stopped being true, when the system learned about it, and when the system invalidated it. The bi-temporal model enables queries like "what did the system believe about Alice's employer in January?" [Source](deep/repos/getzep-graphiti.md). Graphiti uses a multi-stage LLM pipeline per episode (entity extraction, node deduplication, edge extraction, edge resolution, attribute extraction), making it the most expensive per-ingestion operation of any system analyzed, but the 38.4% improvement on temporal reasoning tasks validates that cost [Source](deep/repos/getzep-graphiti.md).

Hipocampus (145 stars) and [napkin](projects/obsidian.md) (264 stars) reject both vectors and graphs in favor of plain markdown files. Hipocampus maintains a ~3K token compressed topic index (ROOT.md) that sits at the apex of a 5-level compaction tree. On the MemAware benchmark, Hipocampus with vector search scored 21.0% on implicit recall versus 3.4% for BM25 + vector search alone, a 6.2x improvement. On hard cross-domain questions with zero keyword overlap, it scored 8.0% versus 0.7% for vector search, an 11.4x improvement [Source](deep/repos/kevin-hs-sohn-hipocampus.md). napkin reports 91.0% on the [LongMemEval](projects/longmemeval.md) S benchmark (approximately 40 sessions) versus 86% for the best prior system, using zero preprocessing, no embeddings, and no graphs [Source](repos/michaelliv-napkin.md). These napkin numbers are self-reported benchmarks from the project README.

**Wins when / loses when:** Vectors win when you need sub-second semantic retrieval at scale across thousands of users. Graphs win when your domain requires temporal reasoning or cross-session entity tracking (customer service, healthcare, legal). Files win when you need zero infrastructure, human-readable memory, and portability across agent frameworks. Vectors lose on temporal queries (they have no notion of "when"). Graphs lose on single-session tasks and cost per ingestion. Files lose when the corpus exceeds what BM25 can handle or when you need real-time multi-user access.

**Specific failure mode:** Mem0's vector-first approach returns stale facts without temporal context. If a user changed jobs six months ago, the old employer fact and new employer fact coexist in the vector store with no mechanism to prefer the newer one unless the retrieval prompt explicitly filters by date. Graphiti solves this through edge invalidation, but that solution depends entirely on LLM judgment in the `resolve_edge` prompt. A missed contradiction means stale edges persist as valid [Source](deep/repos/getzep-graphiti.md).

### "Who decides what to remember?" — Infrastructure-managed vs. agent-managed memory

The second split determines whether the agent or an external system controls what enters and exits memory.

[Letta](projects/letta.md) (formerly [MemGPT](projects/memgpt.md)) pioneered the agent-managed approach. The agent edits its own memory blocks through tool calls, deciding what to store, update, and forget. [Core memory](concepts/core-memory.md) blocks stay always in context; archival memory holds overflow. The agent exercises explicit control over memory lifecycle.

[Mem0](projects/mem0.md) takes the infrastructure-managed approach. You pass conversation messages to `memory.add()`, and Mem0's internal pipeline decides what to extract and store. The developer controls granularity through configuration (user/session/agent scopes), but the extraction logic is opaque.

[Acontext](projects/agent-zero.md) (3,300 stars) introduces a hybrid: a three-stage pipeline where a Task Agent extracts tasks from conversations, a Distillation phase classifies them (skip, success analysis, failure analysis, factual content), and a Skill Learner Agent writes structured markdown skill files. The Distillation phase acts as an [LLM-as-Judge](concepts/llm-as-judge.md) quality gate that filters trivial tasks and structures valuable learnings before they reach storage. Every learned pattern ends up as a human-readable, editable markdown file rather than an opaque vector [Source](deep/repos/memodb-io-acontext.md).

The [Memento](projects/memento.md) research project from Microsoft pushes agent-managed memory to its extreme: training models to compress their own chain-of-thought mid-generation. Peak KV cache drops 2-3x, throughput nearly doubles, and erased reasoning blocks leave traces in the KV cache that the model still uses. The training pipeline uses ~30K examples from an OpenMementos dataset of 228K annotated traces, with a three-stage curriculum (standard attention, then block masking) [Source](tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md).

**Wins when / loses when:** Infrastructure-managed wins when you want simple integration and consistent behavior across many agents. Agent-managed wins when the agent needs fine-grained control over what it remembers (personal assistants, long-running research). Acontext's hybrid wins when you need auditable, editable learning. Memento's learned compression wins for high-throughput inference where KV cache is the bottleneck. Infrastructure-managed loses when the extraction heuristics miss domain-specific patterns. Agent-managed loses when the agent makes poor memory management decisions under pressure.

**Specific failure mode:** Agent-managed systems can develop "memory hoarding," filling core memory with irrelevant details while neglecting to store critical decisions. Letta's MemGPT paper documented this: agents frequently fail to proactively move information from core to archival memory, leading to context overflow. Acontext's skill files can accumulate without pruning, and there is no mechanism for detecting or removing outdated learnings [Source](deep/repos/memodb-io-acontext.md).

### "How does memory improve over time?" — Static storage vs. self-improving loops

The third split separates systems that store and retrieve from systems that learn and evolve.

Static systems like [Mem0](projects/mem0.md) and basic [RAG](concepts/retrieval-augmented-generation.md) pipelines store what they are given and retrieve what is asked for. The quality of memory is bounded by the quality of the initial extraction.

[CORAL](projects/coral.md) (120 stars) implements a multi-agent self-evolution loop where agents share discoveries through a filesystem-based collaboration layer. Attempts, notes, and skills live in `.coral/public/` and are symlinked into every agent's git worktree. A heartbeat system with plateau detection interrupts stalled agents with reflection prompts. This creates evolutionary pressure: agents that discover better approaches see their knowledge propagated through the shared state [Source](deep/repos/human-agent-society-coral.md).

[Autocontext](projects/antigravity.md) (695 stars) runs a five-agent architecture per generation: Competitor (proposes strategies), Analyst (diagnoses failures), Coach (updates playbooks), Architect (proposes tooling changes), and Curator (quality-gates knowledge). The Coach maintains versioned playbooks with rollback capability, and the Curator prevents knowledge pollution by rejecting low-quality lessons. A `TrendAwareGate` controls progression: if scores plateau, it relaxes acceptance thresholds; if they improve, it tightens them [Source](deep/repos/greyhaven-ai-autocontext.md).

[Meta-agent](concepts/meta-agent.md) automates harness optimization from production traces. An LLM judge scores unlabeled traces, a proposer reads failures and writes targeted harness updates, and the update persists only if it improves holdout accuracy. On tau-bench v3 airline, meta-agent improved holdout accuracy from 67% to 87% [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md). This is a single-run result on a small benchmark split, as the authors note.

**Wins when / loses when:** Static storage wins when the domain is stable and the main challenge is retrieval quality. Self-improving loops win when the agent faces evolving tasks, adversarial conditions, or domains where the optimal strategy changes over time. Self-improving loops lose when the feedback signal is noisy (the system optimizes for noise rather than signal) or when LLM judge reliability is poor.

**Specific failure mode:** Autocontext's five-agent chain creates a propagation risk. The analyst might misdiagnose a failure, leading the coach to encode a bad lesson in the playbook. If the curator accepts it (the lesson looks plausible), the bad lesson persists and degrades future performance. Credit assignment across five agents is hard: when a generation improves the playbook AND adds a new tool AND changes the strategy, which change drove the score improvement? [Source](deep/repos/greyhaven-ai-autocontext.md).

### "How do agents learn reusable capabilities?" — Skills as memory

A fourth approach treats memory not as facts to recall but as procedures to execute. This is [procedural memory](concepts/procedural-memory.md).

[Anthropic's skills repository](projects/anthropic.md) (110,064 stars) establishes the canonical format: SKILL.md files with YAML frontmatter containing name and description, loaded through three-tier [progressive disclosure](concepts/progressive-disclosure.md). Metadata (~100 tokens) stays always in context, instructions load on trigger, and bundled resources load on demand. The skill-creator meta-skill implements a full eval-driven development loop: capture intent, write SKILL.md, create test prompts, grade with assertions, iterate [Source](deep/repos/anthropics-skills.md).

[Everything Claude Code](projects/claude-code.md) (136,116 stars) demonstrates what happens at scale: 156 skills across 12 language ecosystems with a manifest-driven selective install system. At this scale, the hard problem shifts from individual skill quality to skill governance: conflict detection, install profiles, hook runtime controls, and continuous learning where sessions automatically extract reusable patterns into the skill library. The "instinct system" captures tool call observations in JSONL format, runs a background analyzer every 5 minutes, and generates atomic behavioral patterns with confidence scores that decay over time [Source](deep/repos/affaan-m-everything-claude-code.md).

[Ars Contexta](projects/obsidian.md) (2,900 stars) takes this further by deriving knowledge system structures from a graph of 249 interconnected research claims rather than shipping fixed templates. The derivation engine maps conversation signals to eight configuration dimensions (granularity, organization, linking philosophy, etc.) and justifies each choice by tracing to specific claims in the methodology graph [Source](deep/repos/agenticnotetaking-arscontexta.md).

**Wins when / loses when:** Skills win when agents face repeating task patterns across sessions. Skills lose when the domain is genuinely novel each time (one-off research tasks) or when the skill library grows past the phase transition point where routing accuracy degrades. The agent skills survey documents this transition: "beyond a critical library size, skill selection accuracy degrades sharply" [Source](deep/papers/xu-agent-skills-for-large-language-models-architectu.md).

**Specific failure mode:** Community skill security. Analysis of 42,447 skills from major marketplaces found 26.1% contain at least one vulnerability, with 5.2% exhibiting high-severity patterns suggesting malicious intent. Skills with executable scripts are 2.12x more vulnerable than instruction-only skills (p<0.001) [Source](deep/papers/xu-agent-skills-for-large-language-models-architectu.md).

## The Convergence

**Claim 1: All serious memory systems now implement progressive disclosure.** Anthropic's skill spec formalizes it as three tiers (metadata always loaded, instructions on trigger, resources on demand) [Source](deep/repos/anthropics-skills.md). Hipocampus implements it as a 3-tier cache hierarchy (ROOT.md always loaded, daily logs on demand, compaction tree for cold storage) [Source](deep/repos/kevin-hs-sohn-hipocampus.md). napkin implements it as four progressive levels (NAPKIN.md ~200 tokens, overview ~1-2K, search results ~2-5K, full file ~5-20K) [Source](repos/michaelliv-napkin.md). Even Mem0's multi-level scoping (user/session/agent) is a form of progressive disclosure. The project that held out longest was Graphiti, which loads full entity subgraphs on search. The addition of community detection with summary nodes was a concession to progressive disclosure: communities provide a coarser-grained entry point before diving into individual entities.

**Claim 2: All production memory systems now separate storage from retrieval strategy.** Mem0 decouples its vector store from its search API. Graphiti supports four graph backends (Neo4j, FalkorDB, Kuzu, Neptune) behind a `GraphDriver` abstraction [Source](deep/repos/getzep-graphiti.md). Hipocampus separates its compaction tree (storage) from its three-step recall protocol (retrieval) [Source](deep/repos/kevin-hs-sohn-hipocampus.md). Acontext separates its skill file storage from its progressive disclosure retrieval via tool calls [Source](deep/repos/memodb-io-acontext.md). The system that resisted this longest was MemGPT's original design, where the agent's memory management tools were tightly coupled to the specific storage mechanism. Letta's evolution into a managed platform with pluggable backends represents the convergence.

**Claim 3: All memory systems that handle temporal data now version facts rather than overwriting them.** Graphiti's bi-temporal edge model (valid_at, invalid_at, created_at, expired_at) preserves full history [Source](deep/repos/getzep-graphiti.md). Hipocampus marks compaction nodes as tentative or fixed, with raw daily logs preserved permanently [Source](deep/repos/kevin-hs-sohn-hipocampus.md). Autocontext versions playbooks with rollback capability [Source](deep/repos/greyhaven-ai-autocontext.md). The holdout was Mem0, which overwrites facts in place. The Mem0 team's own paper acknowledges this as a limitation for temporal reasoning tasks.

## What the Field Got Wrong

Practitioners assumed that bigger context windows would make memory systems obsolete. The reasoning: if you can fit 1 million tokens in context, why build a retrieval layer? [Anthropic](projects/anthropic.md) and [Google](projects/gemini.md) both shipped million-token windows, and many teams responded by dumping full conversation histories into context.

The evidence against this assumption is overwhelming. Mem0 reports 90% fewer tokens with 26% better accuracy than full-context approaches [Source](repos/mem0ai-mem0.md). Zep demonstrated 90% latency reduction by compressing 115K tokens to 1.6K while improving accuracy by 18.5% on the LongMemEval benchmark [Source](deep/repos/getzep-graphiti.md). The [Meta-Harness](concepts/agent-harness.md) paper showed that full execution trace access (approximately 10 million tokens per iteration) dramatically outperforms compressed summaries (50.0 vs 34.6 accuracy), but the traces are accessed selectively, not dumped into a single context window [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

The [Lost in the Middle](concepts/lost-in-the-middle.md) problem persists even at million-token scale. Attention degrades with context length. Important details from weeks ago drown in noise from recent activity. And cost scales linearly with context size, making full-context approaches economically prohibitive for production workloads with persistent memory needs. What replaced the "bigger context" assumption: selective retrieval with progressive disclosure, where the system pays for only the tokens it needs at each moment.

## Deprecated Approaches

**Recursive summarization of conversation history.** Teams would run conversations through an LLM summarizer, then summarize the summaries. This seemed right because it mirrors how humans compress information. Zep's benchmark killed it: recursive summarization scored 35.3% on DMR versus 94.8% for temporal knowledge graphs [Source](deep/repos/getzep-graphiti.md). The problem is catastrophic information loss. Each summarization pass destroys details that downstream queries might need. Graphiti's approach of extracting structured triples with temporal bounds preserves queryable detail while reducing token count.

**Single-vector-space memory retrieval.** Early agent memory systems embedded all memories into a single vector space and retrieved by cosine similarity. This seemed right because embedding models capture semantic meaning. Hipocampus's benchmark showed this approach scores 3.4% on implicit context recall, barely better than no memory at all (0.8%) [Source](deep/repos/kevin-hs-sohn-hipocampus.md). The problem: semantic similarity cannot surface connections that the user did not explicitly ask about. You cannot search for what you do not know you know. Graphiti replaced this with [hybrid search](concepts/hybrid-search.md) combining cosine similarity, BM25, and graph traversal. Hipocampus replaced it with an always-loaded topic index that makes implicit context discoverable.

**Prompt-level memory optimization as the primary improvement lever.** Before 2025, most practitioners focused on optimizing the system prompt and few-shot examples when agents underperformed. The Meta-Harness paper demonstrated that optimizing the entire harness code (retrieval logic, routing decisions, memory management, prompt construction code) produces dramatically better results than prompt optimization alone: +7.7 points over ACE on classification with 4x fewer tokens [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). The critical ablation: systems with access to full execution traces (approximately 10M tokens of diagnostic data per iteration) outperform systems with only scores or summaries by 15.4 accuracy points. This shifted the field from "optimize the prompt" to "optimize the entire harness."

## Failure Modes

**Memory pollution through confident-but-wrong extraction.** Mem0, Graphiti, and Acontext all use LLMs to extract facts from conversations. When the LLM misinterprets a hypothetical as a statement of fact, or extracts an entity that does not exist, the false memory enters the store and persists indefinitely. Graphiti's multi-stage pipeline (extract, deduplicate, resolve contradictions) reduces but does not eliminate this. There is no deterministic contradiction checking in any analyzed system. False memories compound: downstream retrievals surface the false fact, which influences future conversations, which may generate more false memories [Source](deep/repos/getzep-graphiti.md).

**Compaction-induced information loss.** Hipocampus, Autocontext, and recursive summarization all compress older information into shorter representations. When the compression LLM drops a detail that turns out to be relevant weeks later, that detail is gone from the compressed node. Hipocampus mitigates this by keeping raw daily logs permanently (never deleted), so the original data is recoverable through tree traversal. Autocontext mitigates through playbook versioning with rollback. But the compressed representation, which the agent checks first, lacks the detail. Recovery requires the agent to suspect the detail exists and drill down, which requires exactly the kind of "unknown unknowns" awareness that the compression was meant to support.

**Temporal reasoning failures when the graph disagrees with the conversation.** Graphiti's edge invalidation depends on the LLM identifying contradictions between new and existing facts. If the new message says "Alice now works at Google" and an existing edge says "Alice works at Meta," the LLM must recognize the contradiction and invalidate the old edge. When contradictions are implicit or indirect ("Alice started her new role in Mountain View"), the LLM may fail to connect this to the existing employer edge. Stale edges persist as valid, and the system returns contradictory facts [Source](deep/repos/getzep-graphiti.md).

**Skill library phase transition.** The agent skills survey documents a critical threshold: beyond a certain number of skills, the agent's ability to select the right skill collapses. This is a scaling limit that hits every system with a growing capability library. Anthropic's skills spec mitigates through description-driven triggering, but the triggering accuracy degrades with library size. Everything Claude Code mitigates through manifest-driven selective install (only install what you need). Neither approach solves the fundamental routing problem for large libraries [Source](deep/papers/xu-agent-skills-for-large-language-models-architectu.md).

**Cross-session context loss during context exhaustion.** When an agent's context window fills, most systems either truncate or restart. Pi-autoresearch detects approaching exhaustion (checking whether `currentTokens + estimated * 1.2` would exceed the window) and auto-restarts with a pointer to `autoresearch.md` [Source](deep/repos/davebcn87-pi-autoresearch.md). Memento trains models to compress mid-generation, dropping peak KV cache 2-3x [Source](tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md). But most agent memory systems have no mechanism for graceful degradation. The agent loses its reasoning chain, restarts from whatever memory files exist, and may repeat failed approaches because the "what was tried" information existed only in the lost context.

## Selection Guide

- **If you need multi-user personalization with minimal infrastructure**, use [Mem0](projects/mem0.md) (51,880 stars, Apache-2.0, Y Combinator S24). The `memory.add()`/`memory.search()` API integrates in under 20 lines. Avoid Graphiti for this use case: the per-episode LLM pipeline cost is too high for casual personalization.

- **If you need temporal reasoning over evolving facts** (customer service, compliance, healthcare), use [Graphiti](projects/graphiti.md) (24,473 stars, Apache-2.0) with [Zep](projects/zep.md) for managed hosting. The bi-temporal edge model is the only production-ready solution for "what was true when" queries. Avoid Mem0: it overwrites facts in place.

- **If you need zero-infrastructure memory for a single coding agent**, use Hipocampus (145 stars, MIT) for proactive recall or [napkin](projects/obsidian.md) (264 stars, MIT) for structured knowledge management. Both run on plain files with no database. Avoid both if you need multi-user or multi-agent shared memory.

- **If you need agents that learn from production traces**, evaluate [meta-agent](concepts/meta-agent.md) for harness optimization from unlabeled traces, or [CORAL](projects/coral.md) (120 stars, MIT) for multi-agent evolutionary optimization. Avoid these if you do not have a clear grading function for your task.

- **If you need auditable, editable agent learning**, use [Acontext](projects/agent-zero.md) (3,300 stars). Its three-stage pipeline produces human-readable markdown skill files. Avoid it if you cannot accept the infrastructure weight (PostgreSQL, Redis, RabbitMQ, S3).

- **If you need a structured development process encoded as agent skills**, use [gstack](projects/gstack.md) (63,766 stars, MIT) for the opinionated Think-Plan-Build-Review-Test-Ship pipeline, or draw selectively from [Everything Claude Code](projects/claude-code.md) (136,116 stars) for individual skills. Avoid gstack if your workflow does not match product development.

- **If you need to reduce KV cache costs for long reasoning chains**, watch the [Memento](projects/memento.md) research. The approach (training models to compress their own chain-of-thought) is not production-ready but shows 2-3x KV cache reduction with small accuracy gaps that close with RL [Source](tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md).

## The Divergence

### Structured triples vs. flat facts

Graphiti represents knowledge as entity-relationship triples (Entity -> Relationship -> Entity), each with temporal bounds and provenance tracking [Source](deep/repos/getzep-graphiti.md). Mem0 stores flat natural-language facts like "User prefers dark mode" [Source](repos/mem0ai-mem0.md). Triples enable graph traversal queries ("what entities connect to Alice through at most 2 hops?") that flat facts cannot express. Flat facts are cheaper to extract, easier to maintain, and sufficient for personal preferences and simple factual recall. The split maps to a domain question: does your application need relational reasoning, or is key-value retrieval enough? Customer support and healthcare favor triples. Chatbot personalization favors flat facts.

### Agent-driven retrieval vs. infrastructure-driven retrieval

Acontext gives agents tool calls (`list_skills`, `get_skill`, `get_skill_file`) and lets the agent decide what context to load through reasoning [Source](deep/repos/memodb-io-acontext.md). Mem0 and Graphiti run retrieval pipelines when the developer calls `search()` or `add()`, with the infrastructure deciding what is relevant. Agent-driven retrieval is deterministic and debuggable but depends on the agent's reasoning quality. Infrastructure-driven retrieval handles scale better but is opaque. The split is active: Acontext explicitly rejects embedding-based retrieval, while Graphiti's hybrid search (cosine + BM25 + BFS) represents the most sophisticated infrastructure-driven approach.

### Learned memory management vs. engineered memory management

The Memento project trains models to segment their own reasoning, compress each segment into a dense summary, and continue from the compressed version. The model learns memory management as a skill through standard training on approximately 30K annotated examples [Source](tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md). Every other system in this analysis engineers memory management through external code: compaction algorithms, extraction pipelines, retrieval protocols. The learned approach scales with model capability and requires no runtime infrastructure. The engineered approach is transparent, debuggable, and works with any model. Both camps have working implementations, and neither has demonstrated clear superiority across all tasks.

### Self-modifying agents vs. knowledge-modifying agents

[SICA](projects/swe-bench.md) (299 stars) modifies the agent's own source code: tools, reasoning structures, sub-agents. It achieved a 3x improvement on SWE-Bench Verified (17% to 53%) across 14 iterations of self-modification [Source](deep/repos/maximerobeyns-self-improving-coding-agent.md). Autocontext modifies the knowledge and tooling *around* the agent (playbooks, tools, hints) while keeping the agent's code stable [Source](deep/repos/greyhaven-ai-autocontext.md). SICA's approach is higher-risk, higher-reward, and subject to path dependence (bad early modifications steer the entire trajectory). Autocontext's approach is safer and more easily rolled back. The split reflects a deeper question: should agents evolve by changing what they know (knowledge), or by changing what they are (code)?

## What's Hot Now

**Anthropic's skills repository** hit 110,064 stars, making it one of the fastest-growing AI repositories of 2026. The skill-creator meta-skill, which teaches agents to build and evaluate other skills through an automated loop, signals Anthropic's bet that procedural memory (skills) matters as much as factual memory [Source](deep/repos/anthropics-skills.md).

**Memento's learned context compression** attracted attention with 136 likes and 24K views on the announcement thread. The release of OpenMementos (228K annotated reasoning traces) and a vLLM patch with native block masking makes the approach reproducible. The finding that "erased blocks don't fully disappear" from the KV cache, forming an implicit information channel, challenges the field's understanding of what "forgetting" means in transformer architectures [Source](tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md).

**Graphify** (7,021 stars) converts heterogeneous knowledge sources (code, papers, images, docs) into queryable knowledge graphs, claiming 71.5x fewer tokens per query versus raw file retrieval. The auto-sync mode (`--watch`) rebuilds the graph as files change, keeping shared context current for multi-agent workflows [Source](repos/safishamsi-graphify.md).

**Meta-agent** launched with results showing LLM-judge-based search from unlabeled production traces can outperform labeled-search variants (87% vs 80% on tau-bench holdout), suggesting that natural-language error descriptions provide richer optimization signals than binary supervision. The proposer's filesystem memory (storing prior harness candidates, traces, and scores) enables it to avoid repeating failed changes [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md).

**gstack** crossed 63,000 stars in the three months since its release, making it the most-starred agent skill collection. Its self-learning roadmap (7 releases, from learnings persistence through adaptive ceremony to full autoship) positions it as a memory-augmented development process rather than a static configuration [Source](deep/repos/garrytan-gstack.md).

## Open Questions

**How do you prune agent memory without losing important context?** Every memory system analyzed either grows monotonically (Mem0, Graphiti, Acontext) or uses time-based compression that risks losing relevant details (Hipocampus, Autocontext). No system implements principled forgetting based on demonstrated irrelevance rather than age.

**Can temporal knowledge graphs scale to enterprise workloads?** Graphiti's 4-5 LLM calls per episode and label propagation community detection create cost and latency challenges at high ingestion rates. The bulk ingestion path skips edge invalidation for speed, breaking temporal consistency [Source](deep/repos/getzep-graphiti.md). No published benchmarks demonstrate Graphiti's performance at tens of thousands of episodes per day.

**What is the right abstraction boundary between agent memory and agent skills?** Anthropic's skill spec treats skills and memory as separate systems (skills are static SKILL.md files, memory is whatever the agent maintains). Acontext blurs the line by turning learned experiences into skill files. gstack's instinct system further blurs it by deriving behavioral patterns from observation. Whether skills, memory, and learned behavior should share a unified representation or remain distinct systems is genuinely unsettled.

**Source conflict:** napkin reports 91.0% on LongMemEval-S and claims this beats "best prior system" at 86% [Source](repos/michaelliv-napkin.md). The Zep/Graphiti paper reports its own LongMemEval results showing different baselines and improvements [Source](deep/repos/getzep-graphiti.md). The benchmarks use different configurations, models, and potentially different LongMemEval versions, making direct comparison unreliable. Practitioners should run both systems on their own data before drawing conclusions.

**How should multi-agent systems share memory?** CORAL uses filesystem symlinks so agents see each other's work in real time [Source](deep/repos/human-agent-society-coral.md). MetaGPT uses a pub-sub message bus where messages carry structured payloads [Source](deep/repos/foundationagents-metagpt.md). Neither approach handles conflicting memories from different agents. When Agent A learns "retry with exponential backoff" and Agent B learns "fail fast and escalate," no current system has a principled resolution mechanism.

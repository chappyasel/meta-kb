---
title: The State of Agent Memory
type: synthesis
bucket: agent-memory
abstract: >-
  Agent memory systems split along a fault line: those that treat memory as
  retrieval (find relevant past context) versus those that treat memory as
  learning (change future behavior based on past outcomes). The most capable
  production systems now do both, but the integration patterns differ enough to
  cause real failures when practitioners pick the wrong architecture.
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
last_compiled: '2026-04-08T02:25:46.285Z'
---
# The State of Agent Memory

In March 2026, a team running [Zep](projects/zep.md) on the [LongMemEval](projects/longmemeval.md) benchmark discovered that their temporal knowledge graph scored 17.7% *worse* than the baseline on questions about what the assistant itself had said in prior sessions. The system excelled at tracking user preferences, temporal changes, and cross-session facts, but it could not reliably recall its own prior reasoning. This failure exposed a gap that no amount of entity extraction or graph traversal could fix: the extraction pipeline, optimized for user-stated facts, systematically dropped assistant-generated content. The agent remembered what you told it but forgot what it told you.

This single failure mode reveals the central tension in agent memory today. Memory systems must decide what to extract, what to discard, and when to surface stored knowledge, and each architectural choice creates blind spots that compound across sessions. Building agents with memory means choosing which blind spots you can live with.

## Approach Categories

### "How do I give my agent persistent facts across sessions?"

The most common entry point for practitioners. Systems in this category store extracted facts from conversations and retrieve them on demand.

[Mem0](projects/mem0.md) (51,880 stars) leads adoption with a straightforward API: call `memory.add()` with conversation messages, call `memory.search()` with a query. It stores facts as flat strings in a [vector database](concepts/vector-database.md) with optional graph storage, scoped by user, session, or agent. The project reports +26% accuracy over OpenAI's memory on the [LoCoMo](projects/locomo.md) benchmark with 90% fewer tokens than full-context approaches [Source](../raw/repos/mem0ai-mem0.md). These numbers come from Mem0's own research paper (arXiv:2504.19413), making them self-reported.

[Graphiti](projects/graphiti.md) (24,473 stars), the engine behind [Zep](projects/zep.md), takes a different approach. It builds a temporal knowledge graph where facts carry explicit validity windows (`valid_at`, `invalid_at`) and every derived fact traces back to the episode that produced it. The extraction pipeline runs 4-5 LLM calls per episode: entity extraction, node deduplication, edge extraction, edge resolution, and attribute hydration [Source](../raw/deep/repos/getzep-graphiti.md). When new information contradicts existing facts, old edges get expired rather than deleted. This bi-temporal model (tracking both when facts were true and when the system learned about them) enables queries like "what did we believe about Alice's employer in January?" that flat memory stores cannot answer.

[Letta](projects/letta.md) (formerly [MemGPT](projects/memgpt.md)) takes the OS metaphor literally: a fixed-size [core memory](concepts/core-memory.md) block stays always in context (like RAM), while archival memory persists in a vector store (like disk). The agent manages its own memory through tool calls, deciding what to page in and out. This gives the agent explicit control over its memory lifecycle but creates a dependency on the agent's own judgment about what to remember.

**Wins when:** You need cross-session personalization, user preference tracking, or fact accumulation over time. **Loses when:** You need the agent to recall its own prior reasoning chains, or when the domain requires tracking how facts evolved (Graphiti handles the latter; Mem0 and Letta do not).

**Specific failure mode:** Memory pollution. When extraction quality degrades (ambiguous conversations, sarcasm, hypothetical discussions), bad facts accumulate and contaminate future retrievals. Mem0's deduplication prompt uses integer candidate-ID mapping to prevent the LLM from hallucinating memory IDs, but extraction errors upstream propagate regardless. Graphiti's curator-less ingestion means every extracted triple persists unless explicitly contradicted by later information.

### "How does my agent learn from its own execution history?"

These systems go beyond storing facts to capturing procedural knowledge: what worked, what failed, and what strategies to apply next time.

[Agent Workflow Memory](projects/agent-workflow-memory.md) stores complete successful workflows as reusable templates. When a similar task appears, the agent retrieves and adapts a prior workflow rather than reasoning from scratch. This is case-based reasoning applied to agent execution.

Autocontext (695 stars) implements the most architecturally ambitious self-improvement loop. Five specialized agents operate per generation: a Competitor proposes strategies, an Analyst diagnoses failures, a Coach updates playbooks with lessons, an Architect proposes tooling changes, and a Curator gates what knowledge persists [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). The Coach distills execution traces into playbook entries delimited by `<!-- PLAYBOOK_START/END -->` markers, creating structured [procedural memory](concepts/procedural-memory.md) that survives across runs. A `BackpressureGate` or `TrendAwareGate` decides whether to advance (accept improvements), retry, or rollback to a previous playbook version.

[CORAL](projects/openclaw.md) (120 stars) takes a multi-agent evolutionary approach. Each agent runs in an isolated git worktree with shared state (attempts, notes, skills) symlinked through `.coral/public/` [Source](../raw/deep/repos/human-agent-society-coral.md). Agents call `coral eval -m "description"` to commit code, run a grader, and publish results visible to all other agents. A heartbeat system with plateau detection interrupts stalled agents with reflection prompts. The filesystem is the message bus: when Agent-1 writes to `.claude/notes/finding.md`, it writes to the shared directory, immediately visible to Agent-2.

**Wins when:** You have a measurable objective function and want the agent to improve over repeated runs. **Loses when:** The task changes frequently (accumulated procedural knowledge becomes stale) or when you lack a grading signal.

**Specific failure mode:** Knowledge decay. Autocontext's playbooks accumulate entries over time with no automatic pruning. The `AUTOCONTEXT_SKILL_MAX_LESSONS` cap provides a ceiling, but older lessons may conflict with newer ones. CORAL's notes directory grows without garbage collection. Both systems assume that more accumulated knowledge helps, but contradictory or stale lessons degrade performance silently.

### "How do I make past knowledge discoverable without requiring a search query?"

This is the "unknown unknowns" problem. Standard retrieval requires a query, but the agent cannot search for context it does not know exists.

Hipocampus (145 stars) addresses this with a compaction tree that maintains a ~3K-token topic index (ROOT.md) always loaded into context [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md). The index compresses months of conversation history into four sections: Active Context, Recent Patterns, Historical Summary, and a Topics Index with type tags (`project`, `feedback`, `user`, `reference`) and age markers. Raw daily logs flow through a 5-level compaction chain (Raw → Daily → Weekly → Monthly → Root) with threshold-based summarization: below 200 lines, content copies verbatim; above, an LLM generates keyword-dense summaries.

On the MemAware benchmark (900 implicit context questions), Hipocampus + Vector achieved 17.3% accuracy versus 3.4% for BM25 + Vector search alone, a 5.1x improvement. On hard questions with zero keyword overlap, Hipocampus scored 8.0% versus 0.7% for vector search, an 11.4x improvement [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md). These benchmarks use Hipocampus's own MemAware evaluation suite.

Ars Contexta (2,900 stars) takes a different approach through derivation: it builds a complete knowledge system from 249 interconnected research claims, producing a three-space architecture (self/notes/ops) tailored to the user's domain [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md). Every processing phase (Record → Reduce → Reflect → Reweave → Verify → Rethink) runs in its own context window via subagent spawning, avoiding context pollution. The system's ten kernel primitives include wiki links (implementing graph traversal without infrastructure) and MOC hierarchies for navigation.

**Wins when:** Your agent operates across many sessions and domains where relevant context may surface unexpectedly. **Loses when:** You need precise, structured retrieval for known queries (standard [RAG](concepts/retrieval-augmented-generation.md) is faster and cheaper).

**Specific failure mode:** ROOT.md size pressure. Hipocampus's ~3K token budget for the always-loaded index forces aggressive compression. Agents working across many projects simultaneously push against this ceiling. Increasing to 10K tokens improved easy questions from 26% to 34%, but hard-tier performance plateaued at 8.0% regardless of index size, indicating the answer model, not the index, becomes the bottleneck for cross-domain reasoning.

### "How do I encode reusable skills and procedures?"

[Procedural memory](concepts/procedural-memory.md) encodes *how to do things* rather than *what is true*.

The [Agent Skills](concepts/agent-skills.md) specification from [Anthropic](projects/anthropic.md) (110,064 stars on the skills repo) establishes the dominant pattern: SKILL.md files with YAML frontmatter (`name`, `description`) and markdown instructions, loaded via three-tier [progressive disclosure](concepts/progressive-disclosure.md) [Source](../raw/deep/repos/anthropics-skills.md). Level 1 (metadata, ~100 tokens) stays always in context. Level 2 (instructions, <500 lines) loads on trigger. Level 3 (resources, scripts, templates) loads on demand. Triggering is purely description-driven: the agent reads the `description` field and decides whether to consult the skill.

Acontext (3,300 stars) transforms raw execution traces into structured skill files through a three-stage pipeline: Task Extraction (identifies tasks from message streams), Distillation (classifies learnings as SOPs, failure warnings, or factual content via [LLM-as-judge](concepts/llm-as-judge.md)), and Skill Writing (organizes distilled knowledge into SKILL.md files with data entries) [Source](../raw/deep/repos/memodb-io-acontext.md). The distillation phase is the quality gate: trivial tasks get `skip_learning`, multi-step procedures produce structured analyses with `task_goal`, `approach`, `key_decisions`, `generalizable_pattern`, and `applies_when` fields.

**Source conflict:** The agent skills survey paper [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md) reports a 26.1% vulnerability rate in community-contributed skills across 42,447 analyzed, with 14 distinct vulnerability patterns. The Anthropic skills repository [Source](../raw/deep/repos/anthropics-skills.md) does not address this in its spec, providing no security gates in the standard. Practitioners building open skill ecosystems need to add their own verification layers.

**Wins when:** You have repeatable procedures that benefit from codification, especially across teams or agent instances. **Loses when:** The domain changes faster than skills can be updated (skills are static files with no runtime evolution mechanism).

**Specific failure mode:** Phase transition in skill selection. The agent skills survey documents that beyond a critical library size, routing accuracy degrades sharply. The agent cannot reliably select the right skill from a large flat registry. Hierarchical organization or meta-skill routing becomes necessary, but no current system implements this automatically.

## The Convergence

**All production memory systems now separate extraction from storage from retrieval.** Early systems like the original MemGPT combined these into a single LLM call. Today, Mem0 runs separate extraction and deduplication passes. Graphiti uses a 4-5 stage LLM pipeline. Acontext splits into three distinct agents. Even file-based systems like Hipocampus separate mechanical compaction (the `compact.mjs` script) from LLM-driven summarization. The project that held out longest was MemGPT, which unified memory management into the agent's own context window operations. Its successor [Letta](projects/letta.md) now separates the memory management layer from the inference layer.

**All production memory systems now implement some form of temporal awareness.** Graphiti's bi-temporal edges are the most sophisticated implementation, with four timestamps per fact. But Mem0's memory deduplication tracks creation timestamps. Hipocampus's compaction tree carries `status: tentative|fixed` lifecycle markers with date-based fixation rules. Acontext's skill entries carry `date: YYYY-MM-DD` markers. Even [CLAUDE.md](concepts/claude-md.md) files in practice accumulate date-stamped entries. The system that resisted temporal awareness longest was flat vector-store RAG, where embeddings carried no temporal metadata. The industry moved away from this after practitioners discovered that outdated facts retrieved by semantic similarity caused persistent agent confusion.

**All production memory systems now use progressive disclosure to manage context budgets.** Anthropic's three-tier skill loading (metadata always, instructions on trigger, resources on demand) is the canonical pattern, but the same principle appears everywhere. Hipocampus loads ROOT.md (~3K tokens) always, warm files on demand, cold files via search. Acontext uses `list_skills` → `get_skill` → `get_skill_file` progressive tool calls. Graphiti returns search results with relevance scores, loading full episode content only when needed. The holdout was full-context approaches that dump entire histories into the prompt. Context window expansion (200K+ tokens) briefly made this viable, but the [lost-in-the-middle](concepts/lost-in-the-middle.md) problem and cost scaling killed it for production use.

## What the Field Got Wrong

The assumption: **vector similarity search is sufficient for agent memory retrieval.**

Multiple projects built memory systems around the premise that embedding the agent's past interactions and retrieving by cosine similarity would solve the memory problem. This was the default approach from 2023 through mid-2024, endorsed by the RAG literature and adopted by early memory frameworks.

The evidence that disproved it came from multiple directions simultaneously. Hipocampus's MemAware benchmark showed that BM25 + Vector search scored only 3.4% on implicit context questions, barely above the 0.8% baseline for no memory at all [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md). The Zep paper demonstrated that hybrid retrieval (semantic + BM25 + graph traversal) outperformed any single method on LongMemEval, with the graph traversal component contributing unique retrievals that neither embedding nor keyword search found [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). Meta-Harness showed that giving an optimizer access to full execution traces produced +15.4 accuracy over compressed summaries, demonstrating that vector-compressed representations destroy causal signals needed for systematic improvement [Source](../raw/deep/repos/lee-meta-harness-end-to-end-optimization-of-model-har.md).

Vector search fails for agent memory because it requires a good query, and agents often need context they do not know to search for. The replacement is multi-signal retrieval: keyword search for known terms, semantic search for conceptual matches, graph traversal for structural connections, and always-loaded indices for proactive awareness. No serious memory system released in 2026 relies on vector similarity alone.

## Deprecated Approaches

**Full-context memory (stuffing entire history into the prompt).** This seemed right because context windows expanded to 200K+ tokens, making it technically feasible to include the full interaction history. [LongMemEval](projects/longmemeval.md) killed this approach: Zep achieved 18.5% better accuracy than full-context baselines while using only ~1.6K tokens (less than 2% of the 115K baseline) and reducing latency by 90% [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). Full context also costs linearly in every API call. Selective retrieval now dominates for any production system beyond toy scale.

**Monolithic memory files (single MEMORY.md growing indefinitely).** Early [Claude Code](projects/claude-code.md) and [Cursor](projects/cursor.md) workflows encouraged appending everything to a single memory file. This worked for the first week. After a month, hundreds of decisions and insights could not fit in a system prompt, and the agent had no mechanism to know what it had forgotten. Hipocampus's compaction tree and Ars Contexta's three-space architecture both emerged as direct responses to this limitation. The replacement is structured, tiered memory with explicit lifecycle management.

**Single-method retrieval (vector-only or keyword-only).** As documented above, every system that benchmarked single-method retrieval against hybrid approaches found significant deficits. The napkin project (264 stars) demonstrated that even BM25-only search on markdown files could match sophisticated RAG systems on LongMemEval (91.0% on the S dataset versus 86% for the best prior system) [Source](../raw/repos/michaelliv-napkin.md), but this required the structural support of progressive disclosure rather than raw search. Pure vector similarity without supporting structure is now considered insufficient for agent memory.

## Failure Modes

**Memory pollution from extraction errors.** When the LLM extracts facts incorrectly (misinterpreting sarcasm, recording hypotheticals as facts, conflating entities), those bad facts persist and contaminate future retrievals. Graphiti's multi-stage pipeline (extract → resolve → validate) reduces but does not eliminate this. Mem0's deduplication catches exact duplicates but not semantically incorrect facts. Acontext's distillation phase filters trivial tasks via `skip_learning` but cannot detect factually wrong learnings. The blast radius is proportional to how long the bad fact persists before correction: a wrong user preference stored in Mem0's core memory affects every subsequent interaction.

**Temporal confusion from missing invalidation.** Systems without explicit temporal invalidation (most except Graphiti) face a specific failure: old facts coexist with new contradictory facts. If a user said "I work at Acme" six months ago and "I started at Beta Corp" last week, a system without temporal edges may retrieve both facts and present contradictory context. Graphiti handles this through edge expiration, but Mem0's flat memory store, Letta's archival memory, and file-based systems like Hipocampus all lack automatic contradiction detection. Practitioners must implement manual cleanup or accept occasional contradictory context.

**Context budget exhaustion from over-eager memory loading.** When multiple skills, memory layers, and context files compete for the same context window, the agent runs out of room for actual task reasoning. Everything Claude Code documents this concretely: with ~200K tokens total, 10K for system prompts, 5-8K for rules, and 2-5K per MCP tool definition, enabling more than 10 MCPs leaves roughly 70K tokens for work [Source](../raw/deep/repos/affaan-m-everything-claude-code.md). Hipocampus's 3K-token ROOT.md is specifically designed to fit within this budget. The trigger: installing multiple memory frameworks, skill registries, and tool integrations simultaneously without budgeting their combined context footprint.

**Playbook drift in self-improving systems.** Autocontext's coach writes lessons into playbooks. Over many generations, the playbook accumulates entries that may contradict each other, especially if the optimization landscape shifts. The `TrendAwareGate` can enter oscillation: relax threshold → accept marginal improvement → tighten threshold → reject → plateau detected → relax again [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). CORAL's shared notes grow without pruning. The blast radius is that the self-improvement loop stops improving or actively degrades performance, requiring manual intervention to audit and clean the accumulated knowledge.

**Skill triggering failures from description-only routing.** Anthropic's skills system uses purely semantic triggering: the agent reads skill descriptions and decides whether to load them. The skill-creator documentation warns about "undertriggering" and recommends making descriptions "a little bit pushy" [Source](../raw/deep/repos/anthropics-skills.md). There are no programmatic triggers, no file-pattern matchers, no project-type detectors. Complex triggering conditions (like the claude-api skill's language detection logic) must be reimplemented inside the SKILL.md body after triggering. Practitioners discover this when a relevant skill exists but the agent never loads it.

## Selection Guide

- **If you need cross-session user personalization with minimal infrastructure**, use [Mem0](projects/mem0.md) (51,880 stars, Apache-2.0). It provides the simplest API for storing and retrieving user/session/agent memories. Avoid if you need temporal reasoning about how facts changed over time.

- **If you need temporal fact tracking with contradiction handling**, use [Graphiti](projects/graphiti.md) (24,473 stars, Apache-2.0) with [Neo4j](projects/neo4j.md). Its bi-temporal edges and entity resolution pipeline handle evolving facts. Requires graph database infrastructure. Avoid if your data is static or you cannot afford 4-5 LLM calls per ingested message.

- **If you need the agent to manage its own memory autonomously**, evaluate [Letta](projects/letta.md) (MemGPT successor). The agent decides what to page in and out of its context window through tool calls. Avoid if you need deterministic memory behavior, as the agent's memory decisions are LLM-dependent.

- **If you need proactive context surfacing without explicit search**, use Hipocampus (145 stars, MIT). Its always-loaded ROOT.md index enables the agent to notice relevant past context without being asked. Zero infrastructure beyond files. Avoid for applications requiring structured, queryable memory.

- **If you need agents that improve their procedures over repeated runs**, evaluate Autocontext (695 stars) for its five-agent improvement loop with playbook versioning and rollback. Avoid if you lack a measurable evaluation function. For a simpler alternative, pi-autoresearch (3,393 stars) provides a try/measure/keep/revert loop with append-only JSONL persistence [Source](../raw/deep/repos/davebcn87-pi-autoresearch.md).

- **If you need structured skill acquisition from execution traces**, use Acontext (3,300 stars). Its three-stage pipeline (Task → Distill → Skill) produces human-readable skill files. Requires PostgreSQL, Redis, and RabbitMQ for self-hosting. For a zero-infrastructure alternative, gstack (63,766 stars) provides 23+ skills as static SKILL.md files with a template-driven documentation system [Source](../raw/deep/repos/garrytan-gstack.md).

- **If you need a knowledge graph from heterogeneous sources (code, papers, images)**, use Graphify (7,021 stars, MIT). It builds queryable graphs with 71.5x token reduction per query versus raw file retrieval [Source](../raw/repos/safishamsi-graphify.md). Avoid for real-time conversational memory; it is designed for corpus analysis.

## The Divergence

### Structured extraction vs. raw file storage

One camp (Graphiti, Mem0, Acontext) extracts structured representations from raw data: entity-relationship triples, typed facts, classified skill entries. The other camp (Hipocampus, napkin, Ars Contexta) stores raw or lightly processed text as markdown files and relies on search plus progressive disclosure for retrieval.

Structured extraction wins when you need precise queries, temporal reasoning, or cross-entity traversal. Raw file storage wins when you need human auditability, zero-infrastructure deployment, and tolerance for ambiguous or creative content that does not fit extraction schemas. Napkin demonstrated 91.0% accuracy on LongMemEval's S dataset with BM25 on markdown files and no embeddings [Source](../raw/repos/michaelliv-napkin.md), challenging the assumption that structure is always necessary.

### Agent-managed memory vs. system-managed memory

Letta lets the agent manage its own memory through explicit tool calls (core_memory_replace, archival_memory_insert, archival_memory_search). The agent decides what is worth remembering. In contrast, Mem0, Graphiti, and Acontext manage memory outside the agent's control: extraction happens automatically on every interaction, and the system decides what to store.

Agent-managed memory wins when the agent has good judgment about relevance and the domain is narrow enough for the agent to curate effectively. System-managed memory wins when extraction must be consistent across agents, when the domain is broad, or when you cannot trust the agent's memory management to be reliable. The risk of agent-managed memory is that the agent forgets to remember, or remembers the wrong things.

### Graph-based retrieval vs. index-based retrieval

Graphiti uses graph traversal (BFS from seed entities) as a retrieval method alongside vector and keyword search. Hipocampus uses a hierarchical index (ROOT.md → monthly → weekly → daily → raw) traversed top-down. Both provide multi-hop reasoning that flat retrieval cannot, but through different mechanisms.

Graph-based retrieval wins when relationships between entities carry meaning (social networks, knowledge dependencies, causal chains). Index-based retrieval wins when the primary access pattern is temporal (what happened last week?) or topical (what do I know about deployment?). Graph databases add infrastructure complexity; file-based indices add zero. For most single-agent use cases, file-based hierarchical indices suffice. For multi-agent systems or enterprise applications with complex entity relationships, graph storage justifies its overhead.

### Harness optimization vs. memory accumulation

The meta-agent / meta-harness school [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md) treats memory as a harness engineering problem: accumulate execution traces, diagnose failures, and modify the agent's prompts, tools, and hooks. The result is better future behavior, not a larger knowledge store. Meta-agent improved tau-bench accuracy from 67% to 87% by modifying the harness (system prompt, stop conditions, business rules encoded as skills), not by adding facts to memory [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

The opposing camp (Mem0, Graphiti, Hipocampus) treats memory as knowledge accumulation: store more facts, retrieve them better, and the agent performs better because it has richer context. These approaches are complementary in theory but compete for the same context budget in practice. SICA (299 stars) pushes the harness approach to its extreme: the agent modifies its own Python source code (tools, reasoning structures, sub-agents) based on benchmark results, achieving a 3x improvement on SWE-Bench Verified (17% to 53%) through scaffold changes alone [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md).

## What's Hot Now

[Anthropic's skills repository](projects/anthropic.md) crossed 110,000 stars, establishing the SKILL.md format as the dominant standard for procedural memory packaging. The skill-creator meta-skill (a skill that teaches agents to build other skills) demonstrates the self-referential potential of the pattern [Source](../raw/deep/repos/anthropics-skills.md).

Everything Claude Code reached 136,000+ stars with 156 skills across 12 language ecosystems. Its v2 instinct system captures every tool call via deterministic hooks and evolves atomic behavioral patterns with confidence scoring (0.3 tentative to 0.9 near-certain), representing the first production implementation of continuous behavioral learning from execution traces [Source](../raw/deep/repos/affaan-m-everything-claude-code.md).

The meta-agent project demonstrated that [LLM-as-judge](concepts/llm-as-judge.md) scoring on unlabeled production traces can drive harness optimization without labeled data, reaching 87% on tau-bench airline from a 67% baseline. The judge-based search outperformed labeled-search (87% vs 80%), possibly because natural-language error descriptions provide richer optimization signal than binary labels [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md).

Graphify reached 7,021 stars by turning any folder of code, docs, papers, or images into a queryable knowledge graph with [Community Detection](concepts/community-detection.md) via Leiden clustering, claiming 71.5x token reduction per query.

gstack reached 63,766 stars with its sprint-as-DAG pattern, demonstrating that procedural memory (23 specialist skills sequenced into Think → Plan → Build → Review → Test → Ship → Reflect) can substitute for accumulated factual memory in production coding workflows [Source](../raw/deep/repos/garrytan-gstack.md).

## Open Questions

**When should memory live in the agent versus outside it?** Letta's agent-managed memory and system-managed approaches (Mem0, Graphiti) represent genuinely different philosophies about agency. No benchmark compares them head-to-head on the same tasks. Practitioners choose based on intuition rather than evidence.

**How do you prune accumulated memory without losing valuable context?** Every accumulation-based system (Autocontext's playbooks, CORAL's notes, Hipocampus's compaction tree, Acontext's skill files) grows monotonically. Confidence decay (gstack's 1 point per 30 days), lesson caps (Autocontext's max lessons), and compaction thresholds (Hipocampus's line limits) are ad hoc solutions. No system implements principled knowledge pruning based on measured utility.

**Can learned skills be made portable and auditable?** The agent skills survey identifies a bifurcation: human-authored skills (transparent, portable SKILL.md files) versus machine-learned skills (SAGE, SEAgent, stored in model weights, opaque and non-transferable). Acontext's distillation pipeline bridges this gap for procedural knowledge, but no system externalizes learned behavioral patterns (like Autocontext's playbook entries or ECC's instincts) into the portable SKILL.md format with the same rigor that human-authored skills provide.

**How do you handle memory across multiple agents?** [CORAL](projects/openclaw.md) demonstrates filesystem-based knowledge sharing via symlinked directories. [MetaGPT](projects/metagpt.md) (66,769 stars) uses a pub-sub environment where agents share structured messages typed by the action that produced them [Source](../raw/deep/repos/foundationagents-metagpt.md). But neither addresses the fundamental question: when Agent A learns something, how does Agent B discover it exists? The "unknown unknowns" problem applies to multi-agent memory as much as it does to single-agent memory. Hipocampus's always-loaded index approach has no multi-agent equivalent.

**What is the right granularity for memory extraction?** Graphiti extracts entity-relationship triples. Mem0 extracts flat fact strings. Acontext classifies learnings into SOPs, warnings, and facts. Hipocampus stores raw daily logs. The optimal granularity depends on the use case, but no system adapts its extraction granularity dynamically based on the content being processed or the downstream retrieval patterns.

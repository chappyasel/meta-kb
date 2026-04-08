---
title: The State of Context Engineering
type: synthesis
bucket: context-engineering
abstract: >-
  Context engineering has split into two opposing camps: systems that compress
  context through learned model behaviors versus systems that structure context
  through external scaffolding, and the field cannot yet prove which approach
  scales better.
source_date_range: 2025-01-20 to 2026-04-08
newest_source: '2026-04-08'
staleness_risk: low
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/anthropics-skills.md
  - tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - repos/mem0ai-mem0.md
  - deep/repos/greyhaven-ai-autocontext.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - deep/repos/human-agent-society-coral.md
  - deep/papers/xu-agent-skills-for-large-language-models-architectu.md
  - papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/repos/maximerobeyns-self-improving-coding-agent.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - repos/getzep-graphiti.md
  - repos/safishamsi-graphify.md
  - repos/kevin-hs-sohn-hipocampus.md
  - repos/anthropics-skills.md
  - repos/michaelliv-napkin.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/memodb-io-acontext.md
  - deep/repos/affaan-m-everything-claude-code.md
  - deep/repos/snarktank-compound-product.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/garrytan-gstack.md
entities:
  - openclaw
  - context-engineering
  - model-context-protocol
  - progressive-disclosure
  - claude-md
  - context-management
  - lost-in-the-middle
  - context-graphs
  - context-compression
  - chain-of-thought
  - system-prompt
  - abductive-context
  - bounded-context
  - lossless-context-management
  - context-database
  - llmlingua
  - token-efficiency
  - kv-cache
  - block-masking
last_compiled: '2026-04-08T22:44:16.201Z'
---
# The State of Context Engineering

[Memento](projects/memento.md) trains models to segment their own chain-of-thought into blocks, compress each block into a dense summary, and mask the original reasoning from attention, cutting KV cache by 2-3x while preserving 96.4% problem overlap with the baseline. Anthropic's skills repo (110,064 stars) takes the opposite position: context should never enter the model's weights but instead live in structured markdown files loaded through a three-tier [progressive disclosure](concepts/progressive-disclosure.md) pattern where metadata costs ~100 tokens, instructions load on trigger, and resources load on demand. One approach teaches the model to manage its own context. The other builds an external architecture that feeds context to a model that never learns anything about managing it. Both ship production results.

## Approach Categories

### How do you decide what enters the context window?

The routing question. Every context engineering system must answer: given a user request and a body of accumulated knowledge, which subset enters the prompt?

**Description-driven triggering** powers Anthropic's skills (110,064 stars) and Everything Claude Code (136,116 stars). The model reads short skill descriptions (~dozen tokens each) and decides whether to load full instructions. The `skill-creator` meta-skill in Anthropic's repo implements a description optimizer that runs 3x per query on a 60/40 train/test split, iterating up to 5 times to maximize trigger reliability [Source](deep/repos/anthropics-skills.md). ECC scales this to 156 skills across 12 language ecosystems with a manifest-driven selective installer (`install-plan.js` -> `install-apply.js` -> SQLite state store) [Source](deep/repos/affaan-m-everything-claude-code.md).

**Progressive disclosure through file hierarchy** structures knowledge into layers the agent navigates via tool calls. Hipocampus (145 stars) maintains a ~3K-token compressed topic index (ROOT.md) always loaded into every API call, with a 5-level compaction tree (Raw -> Daily -> Weekly -> Monthly -> Root) beneath it. Napkin (264 stars) implements four disclosure levels: NAPKIN.md (~200 tokens), `napkin overview` (~1-2K), `napkin search` (~2-5K), and `napkin read` (~5-20K) [Source](repos/michaelliv-napkin.md).

**Temporal knowledge graphs** let [Graphiti](projects/graphiti.md) (24,473 stars) route context through hybrid search combining cosine similarity, [BM25](concepts/bm25.md), and breadth-first graph traversal, with cross-encoder reranking [Source](deep/repos/getzep-graphiti.md). Each edge carries a bi-temporal validity window (`valid_at`, `invalid_at`, `created_at`, `expired_at`), so the system can answer "what did we know about X as of January?" without returning stale facts.

**Wins when** you have heterogeneous knowledge that changes over time. **Loses when** the context needed is always the same (a fixed coding standard). **Failure mode:** Undertriggering. Anthropic's skill-creator documentation warns that Claude tends to not invoke skills when they would be useful. The mitigation is aggressive description writing, but this creates false triggers on unrelated queries.

### How do you compress context that exceeds the window?

The capacity question. Models have finite windows. Long-running agents generate unbounded context.

[Memento](projects/memento.md) trains models to compress their own chain-of-thought mid-generation. A three-stage curriculum (standard causal attention -> format learning -> block masking) teaches Qwen3-8B to segment reasoning into blocks, write a dense memento for each block, then mask the original block from attention. Peak KV cache drops 2-3x. The critical finding: erased blocks leave information traces in KV cache representations that the model still uses. Restart mode (recomputing KV from scratch) drops AIME'24 accuracy from 66.1% to 50.8%, proving the implicit KV channel carries significant information [Source](tweets/dimitrispapail-memento-teaching-llms-to-manage-their-own-context.md).

Hipocampus compresses through hierarchical summarization rather than learned behavior. Below a size threshold (~200 lines for daily nodes), source files copy verbatim with zero information loss. Above threshold, an LLM generates keyword-dense summaries. The compaction chain (Raw -> Daily -> Weekly -> Monthly -> Root) maintains permanent raw logs that are never deleted, so lossy compression at higher levels is always recoverable through tree traversal [Source](deep/repos/kevin-hs-sohn-hipocampus.md).

[Context Compression](concepts/context-compression.md) frameworks like LLMLingua use smaller models to compress prompts while preserving semantic meaning, operating at the token level rather than the reasoning-block level.

**Wins when** context grows monotonically (long coding sessions, multi-turn conversations). **Loses when** context is already sparse. **Failure mode:** Compression losing causal signals. Meta-Harness demonstrated that compressing execution traces into summaries destroyed the diagnostic signal needed for systematic improvement: full filesystem access scored 50.0 median accuracy versus 34.9 for scores + summaries, a 15-point gap that summaries cannot close [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

### How do you make context survive across sessions?

The persistence question. Single-session agents forget everything. Production agents must maintain state across days and weeks.

Acontext (3,300 stars) transforms raw agent execution traces into structured SKILL.md files through a three-stage pipeline: Task Extraction (autonomous agent classifying user requests), Distillation (LLM-as-judge classifying completed tasks into SOPs, failure warnings, or factual content), and Skill Learner (agent writing structured markdown skill files). The distillation phase produces an `applies_when` field that scopes each learning to specific conditions, preventing over-generalization [Source](deep/repos/memodb-io-acontext.md).

[CORAL](projects/coral.md) (120 stars) persists context through filesystem-based collaboration primitives. Multiple agents work in isolated git worktrees with a shared `.coral/public/` directory symlinked into each worktree. Agents share three knowledge types: attempt records (JSON with commit hash, score, feedback), notes (free-form markdown), and skills (SKILL.md directories). The filesystem is the message bus; no synchronization protocol exists because the symlinks make writes immediately visible across agents [Source](deep/repos/human-agent-society-coral.md).

Ars Contexta (2,900 stars) persists context through a three-space architecture: `self/` (agent identity, slow growth), `notes/` (knowledge graph, 10-50 files/week growth), and `ops/` (transient coordination state). Session continuity happens through an Orient-Work-Persist rhythm: each session end writes a handoff document, each session start reads the latest handoff + workspace state [Source](deep/repos/agenticnotetaking-arscontexta.md).

**Wins when** agents operate on the same codebase or domain over weeks. **Loses when** tasks are isolated one-shots. **Failure mode:** Knowledge pollution. Autocontext (695 stars) addresses this with a Curator agent that quality-gates all knowledge changes using `<!-- CURATOR_DECISION: accept|reject|merge -->` markers, but a single misdiagnosis from the Analyst agent can propagate bad lessons through the entire Coach -> Curator chain [Source](deep/repos/greyhaven-ai-autocontext.md).

### How do you improve context construction over time?

The self-improvement question. Static context assembly degrades as requirements evolve.

Meta-Harness automates harness optimization by giving a coding agent filesystem access to all prior candidates' source code, execution traces, and scores. The proposer agent (Claude Code with Opus-4.6) reads a median of 82 files per iteration, referencing over 20 prior candidates. On text classification, Meta-Harness achieved +7.7 points over ACE with 4x fewer context tokens [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

[Meta-agent](concepts/meta-agent.md) from Canvas operates in the same space but targets unlabeled production traces. An LLM judge scores traces, a proposer reads failed traces and writes one targeted harness update (prompt changes, hooks, tools, subagents), and the update persists only if holdout accuracy improves. On tau-bench v3 airline, meta-agent improved holdout accuracy from 67% to 87% [Source](articles/x-twitter-meta-agent-continual-learning-for-agents.md).

SICA (299 stars) goes further: the agent modifies its own Python source code (tools, reasoning structures, sub-agents), evaluates the modification against benchmarks, and selects the best-performing ancestor through a confidence-interval-aware selection mechanism. SWE-Bench Verified accuracy went from 17% to 53% across 14 iterations [Source](deep/repos/maximerobeyns-self-improving-coding-agent.md).

**Wins when** the system runs long enough to amortize optimization cost. **Loses when** tasks change faster than the improvement loop can adapt. **Failure mode:** Path dependence. SICA's authors acknowledge that "poor quality initial feature suggestions often lower the quality of subsequent feature suggestions." A bad early modification steers the entire trajectory, with no mechanism for global restart.

### How do you structure context as a knowledge artifact?

The representation question. Context can be flat text, structured markdown, graph triples, or learned weights.

[Andrej Karpathy's](concepts/andrej-karpathy.md) LLM-maintained [markdown wiki](concepts/markdown-wiki.md) pattern compiles raw sources into a .md wiki with auto-maintained index files, backlinks, and concept categorization. At ~100 articles and ~400K words, the LLM navigates without [RAG](concepts/retrieval-augmented-generation.md) by reading summaries and drilling into relevant documents [Source](tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md). Graphify (7,021 stars) extends this by transforming heterogeneous sources (code, papers, images) into a queryable knowledge graph using NetworkX + Leiden community detection + tree-sitter AST parsing, reporting 71.5x fewer tokens per query versus raw file retrieval [Source](repos/safishamsi-graphify.md).

[Graphiti](projects/graphiti.md) (24,473 stars) represents knowledge as structured triples (Entity -> Relationship -> Entity) with full bi-temporal tracking, enabling graph traversal queries that flat memory systems cannot express [Source](deep/repos/getzep-graphiti.md). [Mem0](projects/mem0.md) (51,880 stars) takes a flatter approach with multi-level memory (user/session/agent), reporting 90% token reduction versus full-context approaches [Source](repos/mem0ai-mem0.md).

**Wins when** the knowledge domain has relational structure. **Loses when** context is predominantly sequential (chat logs, execution traces). **Failure mode:** Phase transition in skill selection. The agent skills survey documents that beyond a critical library size, the agent's ability to select the right skill degrades sharply [Source](deep/papers/xu-agent-skills-for-large-language-models-architectu.md).

## The Convergence

**All production context engineering systems now separate hot context from cold context with explicit budgets.** Hipocampus allocates ~3K tokens for always-loaded ROOT.md. Anthropic's skills spec budgets ~100 tokens for metadata (always loaded), <5000 tokens for instructions (loaded on trigger), and unlimited resources (loaded on demand). ECC budgets 10K for system prompts, 5-8K for resident rules, 2-5K per MCP tool, and recommends no more than 10 MCPs per project. [gstack](projects/gstack.md) (63,766 stars) implements the same pattern through its preamble injection. The holdout against this consensus was the "dump everything in context" approach enabled by million-token windows. Graphiti's benchmarks killed it: Zep reduced context from 115K to ~1.6K tokens while improving accuracy by 18.5% on LongMemEval, proving that structured retrieval beats full-context even when the window is large enough to hold everything [Source](deep/repos/getzep-graphiti.md).

**All production systems now persist context as human-readable files, not opaque embeddings.** Anthropic skills, Hipocampus, Acontext, CORAL, Ars Contexta, gstack, napkin, and the Karpathy wiki pattern all use markdown with YAML frontmatter as the canonical storage format. Skill files, compaction nodes, learned patterns, and session handoffs are all inspectable, editable, and version-controllable. The holdout was pure vector-store approaches ([Mem0](projects/mem0.md)'s early architecture, [ChromaDB](projects/chromadb.md)-centric RAG systems). Even Mem0 now surfaces memory as readable fact strings, and napkin's LongMemEval results (91.0% on S-scale with zero embeddings, BM25 only) demonstrate that embeddings are optional for strong retrieval [Source](repos/michaelliv-napkin.md).

**All serious harness improvement systems now require full execution trace access, not compressed summaries.** Meta-Harness proved this with a 15.4-point accuracy gap between full filesystem access and summaries. Meta-agent stores each harness candidate, its scores, and its traces on disk, giving the proposer persistent memory across iterations. Autocontext's five-agent architecture (Competitor, Analyst, Coach, Architect, Curator) operates on full generation traces, not summaries. SICA's improvement loop reads JSONL results files and per-problem contextual summaries. The holdout was text-optimizer approaches (GEPA, DSPy) that compress feedback into scores or brief critiques. Meta-Harness matched their final performance within 4 evaluations (10x fewer full evaluations), demonstrating that richer diagnostic context accelerates convergence [Source](deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

## What the Field Got Wrong

Practitioners assumed that [semantic search](concepts/semantic-search.md) solves the agent memory retrieval problem. The implicit belief: embed your knowledge, query with embeddings, return the top-k similar results, and the agent has the context it needs. [Mem0](projects/mem0.md) built its architecture around this assumption. RAG frameworks from [LlamaIndex](projects/llamaindex.md) to [LangChain](projects/langchain.md) reinforced it.

Hipocampus's MemAware benchmark disproved it. On 900 implicit context questions where the agent must proactively surface relevant past context that the user never explicitly asks about, BM25 + vector search scored 3.4%. Hipocampus's compaction tree alone (no search at all) scored 9.2%. Hipocampus + vector scored 17.3%. The search-only approach was 5.1x worse than the system that combined search with a compressed topic index [Source](deep/repos/kevin-hs-sohn-hipocampus.md).

The mechanism is clear: search requires a query, and a query requires suspecting that relevant context exists. You cannot search for connections you do not know you have. The ROOT.md topic index makes implicit context discoverable at zero search cost. On Hard questions with zero keyword overlap between query and relevant memory, Hipocampus scored 8.0% versus 0.7% for vector search, an 11.4x gap that no retrieval improvement can close because the retrieval system never fires.

Semantic search remains valuable as one retrieval mode within a larger system (Graphiti's hybrid search, Hipocampus's third recall step). But treating it as the primary or sole retrieval mechanism for agent memory was wrong. A compressed always-loaded index that tells the agent what it knows replaced it as the primary context routing mechanism.

## Deprecated Approaches

**Single-pass context construction.** Pre-2025, builders assembled context in one shot: concatenate system prompt + retrieved documents + user query, send to model. This seemed right because single-pass minimized latency and API calls. Meta-Harness killed it by demonstrating that iterative harness optimization (reading prior candidates' full execution traces, proposing modifications, validating on holdout) produces 7.7-point accuracy improvements over static context assembly. The compound-product pattern (analyze report -> generate PRD -> decompose into 8-15 tasks -> execute loop with quality gates) extends this further, with each iteration's `progress.txt` and `AGENTS.md` enriching future iterations [Source](deep/repos/snarktank-compound-product.md). Single-pass context gave way to multi-pass context construction with iterative refinement.

**Instruction-only skills without evaluation loops.** Pre-2025, skills were static instruction files: write a SKILL.md, install it, trust that it works. Anthropic's `skill-creator` meta-skill replaced this with a full eval-driven development cycle: create test prompts, run them via subagents (with-skill vs baseline), grade with assertions (programmatic + [LLM-as-judge](concepts/llm-as-judge.md)), aggregate into benchmarks, and iterate. The testing framework has three tiers: Tier 1 (free, <2s) for static validation, Tier 2 (~$3.85, ~20min) for full E2E, and Tier 3 (~$0.15, ~30s) for LLM-as-judge quality scoring. Skills without eval loops cannot detect undertriggering, cannot measure quality degradation, and cannot systematically improve their own descriptions [Source](deep/repos/anthropics-skills.md). Static skills gave way to eval-driven skill development.

**Monolithic context files.** Early [CLAUDE.md](concepts/claude-md.md) files grew into multi-thousand-line instruction documents. This seemed right because "more instructions = better behavior." ECC's architecture demonstrates why this fails at scale: 156 skills would create an impossibly large monolithic file. Instead, the manifest-driven selective install system (`--profile core|developer|full`, `--target cursor|claude|codex`, language-specific filters) loads only what is relevant. The budget mathematics are explicit: ~200K token window minus 10K system prompt minus 5-8K resident rules minus 2-5K per MCP tool leaves ~70K for actual work. A monolithic context file consumes this budget before the agent starts working [Source](deep/repos/affaan-m-everything-claude-code.md). Monolithic files gave way to modular, selectively-loaded skill registries.

## Failure Modes

**Context pollution through stale knowledge.** Hipocampus accumulates compaction nodes without pruning. Autocontext's playbook can drift over many generations with contradictory lessons. Acontext skill entries carry dates but have no staleness detection or automatic archival. The trigger: any system that persists context across sessions and lacks an explicit expiration or contradiction-detection mechanism. The blast radius: degraded future performance as stale instructions conflict with current requirements. Hipocampus partially mitigates this with reference-type staleness markers (`[?]` after 30 days), but the general problem remains unsolved across all systems.

**Phase transition in skill library routing.** The agent skills survey documents a critical threshold: beyond some library size, the agent's ability to select the correct skill collapses. ECC with 156 skills runs into this. Anthropic's description-driven triggering pushes descriptions to be "a little bit pushy," but this increases false triggers as the library grows. The trigger: adding skills past the phase transition point. The blast radius: wrong skills load, injecting irrelevant or conflicting instructions into context, degrading task performance across the board. No current system implements hierarchical routing or meta-skill selection that would address this [Source](deep/papers/xu-agent-skills-for-large-language-models-architectu.md).

**Credit misattribution in self-improving systems.** When a system changes multiple components simultaneously (playbook + tool + strategy), component sensitivity profiling can correlate changes with score improvements but cannot establish causation. Autocontext's five-agent architecture is particularly vulnerable: a playbook change and a tool change in the same generation make attribution ambiguous [Source](deep/repos/greyhaven-ai-autocontext.md). The trigger: optimizing multiple harness components per iteration. The blast radius: the system invests resources in changes that happened to correlate with improvement but did not cause it, while neglecting the actual drivers.

**[Lost in the Middle](concepts/lost-in-the-middle.md) degradation under long skill chains.** When multiple skills load sequentially during a session (gstack's Think > Plan > Build > Review > Test > Ship pipeline), information from early skills may fall into the attention dead zone of the context window. The trigger: sprint-length sessions where 5+ skills load in sequence without compaction. The blast radius: architectural decisions from planning phases get ignored during implementation phases. Ars Contexta mitigates this by spawning fresh subagents per pipeline phase, but this multiplies token cost by the number of phases [Source](deep/repos/agenticnotetaking-arscontexta.md).

**Security vulnerabilities in community-contributed skills.** The agent skills survey analyzed 42,447 skills from major marketplaces and found 26.1% contain at least one vulnerability. Skills with executable scripts are 2.12x more vulnerable than instruction-only skills. A single industrialized actor produced 54.1% of confirmed malicious cases (157 skills, 632 total vulnerabilities). The trigger: installing community skills without verification. The blast radius: data exfiltration (13.3%), privilege escalation (11.8%), or prompt injection through long SKILL.md files that exploit the trust model once loaded [Source](deep/papers/xu-agent-skills-for-large-language-models-architectu.md).

## Selection Guide

- **If you need always-on agent memory across sessions with zero infrastructure**, use Hipocampus (145 stars) because its file-based compaction tree requires no database, no embeddings, and delivers 21x better implicit recall than no memory. Install with `npx hipocampus init`.

- **If you need temporal knowledge graphs with bi-temporal fact tracking for enterprise applications**, use [Graphiti](projects/graphiti.md) (24,473 stars) because it tracks when facts become true, when they stop being true, and when the system learned about them. Requires Neo4j/FalkorDB/Kuzu. Avoid if you only need flat user preference storage.

- **If you need a skill registry for Claude Code with evaluated, production-quality skills**, use Anthropic's skills repo (110,064 stars) because the `skill-creator` meta-skill provides eval-driven skill development with three-tier testing. Avoid Everything Claude Code (136,116 stars) unless you need broad cross-platform coverage (6+ agent platforms) or 156+ domain skills; for most teams, extracting specific ECC patterns into a lean [CLAUDE.md](concepts/claude-md.md) delivers more value than the full installation.

- **If you need agents to learn from their own execution traces as structured skills**, use Acontext (3,300 stars) because its three-stage pipeline (Task -> Distill -> Skill) produces debuggable markdown files instead of opaque embeddings. Avoid if your infrastructure budget is minimal; Acontext requires PostgreSQL, Redis, RabbitMQ, and S3.

- **If you need to automate harness optimization without labeled training data**, use meta-agent because it uses LLM judges as surrogate evaluators on unlabeled production traces, reaching 87% holdout accuracy from a 67% baseline on tau-bench.

- **If you need a knowledge graph from heterogeneous sources (code, papers, images) without a graph database**, use Graphify (7,021 stars) because it uses NetworkX + Leiden locally with 71.5x token reduction per query. Avoid if you need temporal tracking or incremental updates at scale.

- **If you need structured software development process with parallel agent sessions**, use [gstack](projects/gstack.md) (63,766 stars) because the sprint DAG (Think > Plan > Build > Review > Test > Ship) and browser daemon enable 10-15 concurrent sessions. Avoid if your work does not follow a product development workflow.

- **If you need search-only retrieval without any infrastructure beyond files**, use napkin (264 stars) because BM25 on markdown matched 92% of oracle-context accuracy on LongMemEval with zero preprocessing or embeddings.

## The Divergence

**Learned context management vs. external scaffolding.** [Memento](projects/memento.md) trains models to compress their own reasoning mid-generation through SFT on ~30K annotated traces, making context management a model capability. Every other system in this analysis (Hipocampus, Anthropic skills, Acontext, CORAL, Ars Contexta) treats context management as external orchestration with the model as a passive consumer. Learned management wins when you control the model training pipeline and need inference-time efficiency (2-3x KV cache reduction, nearly doubled throughput). External scaffolding wins when you need inspectable, editable, debuggable context and cannot retrain models. The field has working implementations on both sides and no evidence that one will subsume the other.

**Graph-structured knowledge vs. flat file hierarchies.** [Graphiti](projects/graphiti.md) represents knowledge as typed entity-relationship triples with temporal validity, requiring a graph database. Hipocampus, napkin, and the Karpathy wiki pattern represent knowledge as hierarchical markdown files with no graph infrastructure. Graphs win on relational queries ("what entities are connected to Alice through at most 2 hops?") and temporal reasoning (+38.4% improvement on LongMemEval temporal questions). Flat files win on infrastructure cost (zero), inspectability, and portability. **Source conflict:** [Graphiti](repos/getzep-graphiti.md) reports 94.8% on Deep Memory Retrieval versus [napkin](repos/michaelliv-napkin.md)'s 92.0% on LongMemEval Oracle, but these benchmarks measure different things (DMR tests single-fact retrieval; LongMemEval tests complex temporal reasoning). Direct comparison is not valid.

**Proactive context injection vs. agent-driven retrieval.** Hipocampus always loads ROOT.md into every API call, betting that the ~3K token cost is worth always-on awareness. Acontext requires agents to make explicit tool calls (`list_skills` -> `get_skill` -> `get_skill_file`) to discover and load context, betting that agent reasoning about what it needs produces better precision. Proactive injection wins on implicit recall (21x better than no memory on MemAware). Agent-driven retrieval wins on token efficiency (only loads what is needed) and scales better with large knowledge bases where loading everything would blow the context budget.

**Skill-level self-improvement vs. scaffold-level self-modification.** Meta-agent and Autocontext improve the harness around a fixed agent (prompts, hooks, tools, subagents). SICA modifies the agent's own source code (Python tools, reasoning structures, sub-agent implementations). Harness improvement is lower-risk and easily reversible (a bad lesson can be rolled back). Code modification is higher-leverage (SICA achieved 3x improvement on SWE-Bench) but introduces path dependence and cannot overcome fundamental model capability limits. The ceiling question remains open: SICA's authors report that "reasoning-dominant tasks showed minimal improvement" from scaffold changes, suggesting both approaches may plateau at different points.

## What's Hot Now

Anthropic's skills repo reached 110,064 stars, making it the de facto standard for agent skill packaging. The [SKILL.md specification at agentskills.io](concepts/agent-skills.md) formalizes the three-tier progressive disclosure pattern with validation tooling (`skills-ref validate ./my-skill`).

Graphify jumped to 7,021 stars by solving the Karpathy wiki pattern as a single Claude Code command (`/graphify .`), converting any folder of code, docs, and images into a queryable knowledge graph with [Obsidian](projects/obsidian.md) output.

Meta-agent from Canvas launched in April 2026 targeting the harness optimization space, demonstrating that LLM judges can replace labeled data for continuous agent improvement from production traces. The tau-bench results (67% -> 87% holdout accuracy) with Haiku 4.5 as the agent and Opus 4.6 as the proposer suggest this pattern works even with cheaper inference models.

Memento's release of OpenMementos (228K annotated reasoning traces), the data generation pipeline, and a [vLLM](projects/vllm.md) patch with native block masking represents the first open infrastructure for training models to manage their own context. The finding that ~30K training examples suffice to teach context management as a skill lowers the barrier for other groups to replicate.

## Open Questions

Can description-driven triggering scale past the phase transition? No system has demonstrated reliable skill routing at 500+ skills without hierarchical organization. The agent skills survey identifies this as a scaling limit but offers no validated solution.

Will learned context compression (Memento) and external context scaffolding (skills, compaction trees) converge? Memento's authors identify agents as the natural next application. If an agent trained with Memento-style compression also uses Hipocampus-style topic indices, the interaction effects are unknown.

How should context engineering systems handle contradictions across time? Graphiti expires contradicted edges. Hipocampus has no contradiction detection. Acontext relies on the Skill Learner to process sequential corrections. No system implements true semantic contradiction resolution where the system identifies and resolves conflicting facts across different knowledge sources.

How do you evaluate context engineering quality independent of task performance? Current benchmarks (MemAware, LongMemEval, tau-bench) measure downstream task accuracy. No benchmark measures context construction quality directly: did the system load the right information, at the right time, in the right format, at the minimum token cost?

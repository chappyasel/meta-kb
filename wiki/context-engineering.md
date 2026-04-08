---
title: The State of Context Engineering
type: synthesis
bucket: context-engineering
abstract: >-
  Context engineering's central tension: do you build systems that compress
  knowledge into always-loaded indexes, or systems that retrieve knowledge on
  demand? The evidence shows the best performers do both, but the mechanisms for
  deciding what stays resident vs. what gets fetched remain unsolved.
source_date_range: 2025-01-20 to 2026-04-08
newest_source: '2026-04-08'
staleness_risk: low
sources:
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/anthropics-skills.md
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
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
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
last_compiled: '2026-04-08T02:28:43.552Z'
---
# The State of Context Engineering

[Anthropic](projects/anthropic.md) built a skills system where agents load knowledge through three-tier [progressive disclosure](concepts/progressive-disclosure.md): metadata always in context, instructions on trigger, resources on demand. [Andrej Karpathy](concepts/andrej-karpathy.md) built an LLM-maintained markdown wiki where the model auto-maintains index files and reads relevant data "fairly easily" without any retrieval infrastructure at all. These two approaches make opposite bets on the same problem. Anthropic assumes agents need structured, gated access to capability knowledge. Karpathy assumes that LLMs can navigate flat file structures themselves if you give them good enough indexes. Both work. Neither scales to the other's use case.

## Approach Categories

### How much context should live in every single prompt?

The always-resident camp bets that a small, compressed index of everything the agent knows pays for itself on every call. Hipocampus (145 stars) implements this most aggressively: a ~3K token ROOT.md file, always loaded, containing a compressed topic index of the agent's entire conversation history. The compaction tree (Raw → Daily → Weekly → Monthly → Root) produces this index through cascading summarization, where below-threshold content gets copied verbatim and above-threshold content gets LLM-compressed into keyword-dense summaries [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md). On the MemAware benchmark, this approach scores 21x better than no memory and 5.1x better than search alone. The hardest questions (cross-domain, zero keyword overlap) show the starkest gap: 8.0% for Hipocampus vs 0.7% for vector search, an 11.4x difference [Source](../raw/repos/kevin-hs-sohn-hipocampus.md).

[Anthropic's skills system](projects/anthropic.md) (110,064 stars) takes a middle path. Level 1 metadata (name + description, ~100 tokens per skill) sits permanently in context. The model decides whether to load Level 2 instructions based on this metadata. Level 3 resources (scripts, reference files) load on demand within skill execution. The spec recommends keeping instructions under 5,000 tokens [Source](../raw/deep/repos/anthropics-skills.md). This lets an agent "know about" hundreds of skills at low cost while paying full token price only for the 1-2 skills actively needed.

The pure retrieval camp says nothing should be resident except a search tool. Napkin (264 stars) demonstrates this works on the LongMemEval benchmark: BM25 search on markdown files, zero preprocessing, no embeddings, no graphs, achieves 91% accuracy on small-scale sets and 83% on medium-scale [Source](../raw/repos/michaelliv-napkin.md).

**Wins when:** Always-resident indexes win on implicit recall (the agent needs to surface context the user did not ask about). Search-only wins on explicit queries with clear keywords. The hybrid (resident index + search fallback) wins on both, at the cost of maintaining the compaction pipeline.

**Failure mode:** ROOT.md pressure. As an agent works across many domains, the fixed token budget for the resident index forces increasingly aggressive compression. Hipocampus's benchmark shows the Hard tier plateaus at 8.0% regardless of index size, indicating the bottleneck shifts from the index to the model's cross-domain reasoning ability [Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md).

### Should context be structured knowledge or flat files?

[Graphiti](projects/graphiti.md) (24,473 stars) builds temporal [knowledge graphs](concepts/knowledge-graph.md) where facts carry bi-temporal validity windows: when the fact became true in the real world (`valid_at`) and when the system learned about it (`t'_created`). Each fact is a structured triple (Entity → Relationship → Entity) stored in Neo4j with predefined Cypher queries, not LLM-generated ones [Source](../raw/deep/repos/getzep-graphiti.md). The [Zep paper](projects/zep.md) reports 18.5% accuracy improvement over full-context baselines on LongMemEval and 90% latency reduction by retrieving ~1.6K tokens instead of processing 115K [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md).

The flat-file camp argues that LLMs can traverse markdown structures without graph infrastructure. Karpathy's approach uses LLM-maintained index files and brief summaries: "I thought I had to reach for fancy RAG, but the LLM has been pretty good about auto-maintaining index files" at ~100 articles and ~400K words [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md). Graphify (7,021 stars) bridges the gap by building knowledge graphs from heterogeneous sources but storing the results as navigable files (graph.html, Obsidian vault, wiki markdown), claiming 71.5x fewer tokens per query vs. raw file retrieval [Source](../raw/repos/safishamsi-graphify.md). These token reduction claims are self-reported from worked examples, not peer-reviewed benchmarks.

Ars Contexta (2,900 stars) takes the strongest philosophical position: "wiki links implement GraphRAG without the infrastructure." The system uses 249 interconnected markdown files with wikilinks as its knowledge graph, achieving graph traversal through file-following rather than database queries [Source](../raw/deep/repos/agenticnotetaking-arscontexta.md).

**Wins when:** Structured graphs win on temporal reasoning (+48.2% on temporal questions in LongMemEval), contradiction tracking, and multi-session synthesis. Flat files win on setup cost (zero infrastructure), portability, and human readability.

**Failure mode:** Graph systems require 4-5+ LLM calls per ingested episode (extract entities, deduplicate nodes, extract edges, resolve contradictions, update summaries). At high ingestion volume, this creates substantial cost and latency. Graphiti's README recommends running `add_episode` as a background task rather than in the request path [Source](../raw/deep/repos/getzep-graphiti.md). Flat file systems fail when the volume exceeds what file-scanning can handle, or when temporal reasoning about contradictory facts becomes necessary.

### How should agents learn what works?

Harness optimization treats context engineering as an automated search problem. Meta-Harness gives a coding agent (Claude Code with Opus-4.6) filesystem access to all prior candidates' source code, execution traces, and scores, then has it propose new harness variants iteratively. The critical ablation: full trace access yields 50.0 median accuracy vs. 34.6 for scores-only and 34.9 for scores-plus-summaries [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md). Compressed summaries destroy the causal signal needed for systematic improvement.

Autocontext (695 stars) implements a five-agent architecture per generation: Competitor (proposes strategies), Analyst (diagnoses failures), Coach (updates playbooks), Architect (proposes tooling), Curator (quality-gates knowledge). The Coach produces markdown playbooks delimited by `<!-- PLAYBOOK_START/END -->` markers, creating versioned, rollback-capable context that evolves across generations [Source](../raw/deep/repos/greyhaven-ai-autocontext.md).

meta-agent targets the production setting where labeled data is scarce. On tau-bench v3 airline tasks, an LLM judge scoring unlabeled production traces drove holdout accuracy from 67% to 87%, while labeled search reached only 80% [Source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md). These are single-run results on a small benchmark split; the authors plan variance estimates in future work.

**Wins when:** You have repeatable tasks with measurable outcomes and can afford the iteration budget (~10M tokens per Meta-Harness iteration). Autocontext's five-agent architecture costs ~5x the LLM calls per generation but produces cleaner feedback signals.

**Failure mode:** Credit misattribution. When a generation changes the playbook AND adds a new tool simultaneously, Autocontext's credit assignment module correlates changes with score improvements but cannot establish causation [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). Meta-Harness mitigates this through the proposer's access to full execution traces, enabling causal reasoning about which specific changes drove improvements.

### How should learned context persist across sessions?

Acontext (3,300 stars) transforms raw agent execution traces into structured SKILL.md files through a three-stage pipeline: Task Agent extracts tasks from message streams, Distillation classifies learnings (SOP, failure warning, or factual content), and Skill Learner writes organized markdown skill files. The distillation phase serves as a quality gate, filtering trivial tasks via `skip_learning` classification before they reach the skill writer [Source](../raw/deep/repos/memodb-io-acontext.md).

Everything Claude Code (136,116 stars) implements an instinct system where PreToolUse and PostToolUse hooks capture every tool call with 100% reliability. An Observer Agent (Claude Haiku, running every 5 minutes) analyzes observations for patterns, generating atomic "instincts" with confidence scores from 0.3 to 0.9. Confidence increases when patterns repeat; it decays at 0.05 per observation gap [Source](../raw/deep/repos/affaan-m-everything-claude-code.md).

**Wins when:** Acontext wins for teams wanting inspectable, portable skill files (copy markdown between agents). ECC's instinct system wins for single-developer workflows where patterns should accumulate automatically.

**Failure mode:** Neither system prunes outdated context. Acontext skill entries carry dates but have no staleness detection. ECC instincts decay but never get deleted. Over months, stale or contradictory context accumulates.

## The Convergence

**All production systems now separate what the agent knows about from what the agent knows.** Every system analyzed maintains a lightweight metadata layer (Anthropic's Level 1 descriptions, Hipocampus's ROOT.md Topics Index, Autocontext's score trajectory, ECC's instinct store) distinct from the full knowledge content. The last holdout against this pattern was pure search-only approaches like Napkin, but even Napkin's `overview` command generates a vault map with TF-IDF keywords that functions as a Level 0 metadata layer [Source](../raw/repos/michaelliv-napkin.md).

**All production systems now use markdown as the interchange format for agent context.** Skills, playbooks, knowledge files, topic indexes, and compaction nodes are all markdown with YAML frontmatter. [CLAUDE.md](concepts/claude-md.md) files, SKILL.md files, ROOT.md indexes, and progress.txt files all follow this pattern. The project that resisted longest was [Mem0](projects/mem0.md) (51,880 stars), which stores memories as flat text strings in vector stores. But Mem0's integration patterns still format retrieved memories as markdown strings injected into system prompts [Source](../raw/repos/mem0ai-mem0.md).

**All production systems now gate context loading behind model-driven decisions rather than rule-based triggers.** Anthropic's skill triggering relies on the LLM interpreting the description field. Hipocampus's selective recall has the LLM scan ROOT.md and decide what to drill into. Acontext has agents choose which skills to read via tool calls. The last approach to resist this was Everything Claude Code's v1 hook system, which used deterministic pattern matching on tool calls. ECC's v2 instinct system still captures deterministically but applies context based on confidence scores that the model interprets [Source](../raw/deep/repos/affaan-m-everything-claude-code.md).

## What the Field Got Wrong

Practitioners assumed that retrieval quality was the binding constraint on agent context. The belief: build better embeddings, tune better reranking, and agents will have the right information at the right time. Mem0 embodied this assumption, reporting 26% accuracy gains over OpenAI Memory on the LOCOMO benchmark through selective memory retrieval [Source](../raw/repos/mem0ai-mem0.md).

Hipocampus's MemAware benchmark disproved this for the implicit recall case. BM25 + Vector search scored 3.4% on implicit context questions. The compaction tree alone (no search) scored 9.2%. Adding search to the tree helped (17.3%), but the tree without search still beat search without the tree by 2.7x [Source](../raw/repos/kevin-hs-sohn-hipocampus.md). Meta-Harness's ablation drives the point further: giving an optimizer access to compressed execution summaries added only +0.3 accuracy over raw scores, while full trace access added +15.4 [Source](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md).

The replacement insight: the binding constraint is context awareness, not context retrieval. Agents fail because they do not know what they do not know. A search system requires a query, and a query requires suspecting that relevant context exists. The systems that perform best maintain always-available indexes of what context exists, then use search to fetch specific details.

## Deprecated Approaches

**Static system prompts as the primary context engineering tool.** Before the skills era, practitioners packed agent instructions into a single system prompt, tuning it through manual iteration. This seemed right because early context windows were small (4K-8K tokens) and a well-crafted prompt consumed a manageable fraction. The agent skills paper documented the shift: agents need "dynamic capability extension without retraining," which static prompts cannot provide [Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md). Anthropic's progressive disclosure architecture, where hundreds of skills coexist at ~100 tokens each in the metadata layer, replaced the monolithic prompt pattern.

**Full-context stuffing as a memory strategy.** With context windows growing to 200K+ tokens, practitioners dumped entire conversation histories or document corpora into context. This seemed right because it eliminated the retrieval problem entirely. Zep's benchmarks killed it: full-context approaches on 115K-token conversations took 31.3 seconds vs. 3.2 seconds for graph-based retrieval, with the graph-based approach actually achieving higher accuracy (63.8% vs. 55.4% on gpt-4o-mini) [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). The [Lost in the Middle](concepts/lost-in-the-middle.md) phenomenon, where models struggle to recall information placed in the middle of long contexts, provided the theoretical explanation. Selective retrieval replaced wholesale stuffing.

**Embedding-only retrieval without structural context.** Early agent memory systems stored memories as vector embeddings and retrieved via cosine similarity. This seemed right because embeddings capture semantic meaning and scale to large corpora. The agent skills paper documented the "phase transition" finding: beyond a critical skill library size, routing accuracy based on embedding similarity collapses sharply [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md). Graphiti's hybrid search (cosine + BM25 + graph traversal) and Hipocampus's structured compaction tree both outperform embedding-only approaches because they provide structural signals that embeddings miss.

## Failure Modes

**Undertriggering in description-driven skill systems.** Anthropic's skill-creator documentation warns that Claude tends to not invoke skills when they would be useful. The triggering mechanism is purely semantic: the model reads the description field and decides whether to consult the skill. Complex triggering conditions (like detecting which programming language SDK a project uses) must be re-implemented inside the SKILL.md body after triggering, not at the trigger layer itself [Source](../raw/deep/repos/anthropics-skills.md). Practitioners who write conservative skill descriptions will find their skills silently ignored. The skill-creator recommends making descriptions "a little bit pushy" but provides no metric for measuring trigger rates in production beyond an expensive eval loop (20 queries × 3 runs × 5 iterations = 300 LLM calls).

**Context budget exhaustion from skill stacking.** When multiple skills trigger simultaneously, their combined token cost can exhaust the working context. Everything Claude Code allocates ~10K tokens for system prompts, 5-8K for resident rules, and 2-5K per MCP tool definition, recommending no more than 10 MCPs per project to preserve ~70K tokens of the 200K total [Source](../raw/deep/repos/affaan-m-everything-claude-code.md). No existing system implements skill-level token budgeting or priority-based unloading. The blast radius: the agent silently degrades as the effective working memory shrinks.

**Playbook drift in self-improving systems.** Autocontext's Coach agent writes lessons into markdown playbooks. Over many generations, contradictory lessons accumulate. The Curator agent provides a quality gate, but if it is too conservative, good lessons get rejected; if too liberal, bad lessons persist. The `AUTOCONTEXT_SKILL_MAX_LESSONS` cap provides a secondary defense but may discard useful older lessons via FIFO rather than quality-based pruning [Source](../raw/deep/repos/greyhaven-ai-autocontext.md). The same pattern appears in gstack's JSONL learning store, where confidence decay (1 point per 30 days) prevents stale patterns from persisting but cannot detect contradictions [Source](../raw/deep/repos/garrytan-gstack.md).

**Security vulnerabilities in community skills.** The agent skills survey analyzed 42,447 skills from major marketplaces and found 26.1% contain at least one vulnerability. Skills with executable scripts are 2.12x more vulnerable than instruction-only skills. 5.2% exhibit high-severity patterns suggesting malicious intent, with a single industrialized actor responsible for 54.1% of confirmed malicious cases [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md). The blast radius: once a skill's instructions load into context, they receive the same trust level as the system prompt.

**Temporal reasoning regression on assistant-generated content.** Zep's LongMemEval results show a 17.7% performance decrease on single-session-assistant tasks: questions about what the AI assistant itself said or recommended [Source](../raw/deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md). The entity extraction pipeline is biased toward user-stated facts over assistant-generated content. For agent systems where the agent's own prior outputs are critical context (self-improving agents, multi-step planning), this is a structural blind spot.

## Selection Guide

- **If you need proactive context surfacing (the agent should remember things the user did not ask about),** use Hipocampus (145 stars). Its always-loaded ROOT.md index is 21x better than no memory on implicit recall. Zero infrastructure, file-based. Maturity: early but benchmarked.

- **If you need temporal reasoning over evolving facts,** use [Graphiti](projects/graphiti.md) (24,473 stars) / [Zep](projects/zep.md). Bi-temporal edge model tracks what was true when. Requires Neo4j or FalkorDB. Maturity: production-grade with peer-reviewed benchmarks.

- **If you need to equip agents with domain-specific capabilities,** use [Anthropic's skills system](projects/anthropic.md) (110,064 stars). Three-tier progressive disclosure, standardized SKILL.md format, plugin marketplace. Maturity: production, backed by Anthropic.

- **If you need to automatically improve agent harnesses from production traces,** use meta-agent for unlabeled trace optimization or Meta-Harness for benchmark-driven harness search. meta-agent is newer and lighter; Meta-Harness requires Opus-4.6-class proposer and ~10M tokens per iteration.

- **If you need a complete sprint workflow for AI coding agents,** use gstack (63,766 stars). Opinionated Think-Plan-Build-Review-Test-Ship pipeline with 23 specialist roles. Single-user design. Maturity: production-tested by its creator at reported 10K+ LOC/week.

- **If you need searchable knowledge from heterogeneous sources without infrastructure,** avoid vector databases and use Graphify (7,021 stars) for graph-based extraction or Napkin (264 stars) for BM25 on markdown. Both produce files you can read and edit.

- **If you need learning from agent execution traces stored as inspectable files,** avoid opaque vector stores and use Acontext (3,300 stars). Three-stage pipeline produces editable SKILL.md files. Requires PostgreSQL + RabbitMQ for self-hosting.

## The Divergence

### Resident context vs. search-only retrieval

Hipocampus, Anthropic's skills metadata layer, and gstack's session intelligence all invest tokens in always-loaded context. Napkin and pure RAG approaches invest zero tokens until a query triggers retrieval. Resident context optimizes for implicit recall and cross-domain connection-making. Search-only optimizes for token efficiency and scales to larger corpora. Resident context wins when the agent must proactively surface connections (product decisions, user preferences). Search-only wins when queries are explicit and the corpus is large enough that resident indexes become too compressed to be useful.

### Structured graphs vs. flat files for knowledge persistence

Graphiti and Zep build typed entity-relationship graphs with temporal validity windows. Karpathy's wiki, Ars Contexta, and Hipocampus use plain markdown with wikilinks and indexes. Graphs win on temporal reasoning, contradiction detection, and multi-hop queries. Flat files win on portability, human readability, and zero infrastructure. The choice tracks with team size and deployment context: solo developers and small teams gravitate toward flat files; enterprise deployments with multi-session, multi-user requirements gravitate toward graphs.

### Human-authored skills vs. machine-learned skills

Anthropic's SKILL.md files, gstack's 23 roles, and Everything Claude Code's 156 skills are human-authored and curated. SICA (299 stars) modifies its own source code. Autocontext's Coach and Architect agents write playbooks and tools. The agent skills paper identified the gap: human-authored skills are inspectable and portable; machine-learned skills are automatic but opaque [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md). Bridging this gap, where agents learn skills AND externalize them as auditable artifacts, remains an open architectural split with working implementations on both sides. Acontext's three-stage pipeline attempts the bridge: machine-triggered learning produces human-readable SKILL.md output.

### Harness optimization vs. model improvement

Meta-Harness demonstrated that harness changes alone produce up to 6x performance gaps on the same benchmark with the same model. SICA demonstrated that scaffold-level self-modification (tools, reasoning structures, sub-agents) improved SWE-Bench accuracy from 17% to 53% across 14 iterations [Source](../raw/deep/repos/maximerobeyns-self-improving-coding-agent.md). But SICA also showed reasoning-dominant tasks (AIME, GPQA) barely improved because scaffold modifications cannot overcome fundamental model capability limits. Teams building agent systems must decide how much effort to invest in context engineering vs. model selection or fine-tuning, and the answer depends on whether their bottleneck is information access or reasoning capability.

## What's Hot Now

**Anthropic's skills repository** hit 110,064 stars, making it the dominant reference for agent capability packaging. The SKILL.md format has become a de facto standard across Claude Code, OpenCode, and OpenClaw.

**Everything Claude Code** reached 136,116 stars with the v1.9.0 release introducing the instinct system v2 (deterministic hook capture + confidence-scored pattern learning), 156 skills across 12 language ecosystems, and selective-install architecture. The star velocity is the highest in the agent configuration space, though community discussions note the gap between starring and daily-driving.

**gstack** surpassed 63,766 stars since its March 2026 launch, driven by Garry Tan's social media reach and the concrete productivity claims (10K+ LOC/week). The Review Army pattern (7 parallel specialist subagents) shipped as a production feature.

**meta-agent** launched in April 2026 with the tau-bench result (67% → 87% holdout accuracy using LLM judge on unlabeled traces). The approach of optimizing agent harnesses from production data without labeled examples addresses a real gap: most production agents lack the labeled evaluation sets that benchmark-driven optimization requires.

**Graphify** grew to 7,021 stars since its release, filling the niche of "knowledge graph without infrastructure" by producing static graph outputs (HTML, Obsidian vault, wiki markdown) from heterogeneous source material.

## Open Questions

**How do you prune context that has become stale or contradictory?** Every learning system analyzed accumulates context monotonically. Hipocampus compacts but never deletes. Autocontext has a lesson cap but uses FIFO, not quality-based pruning. ECC instincts decay but persist. No system has demonstrated reliable automated pruning that removes outdated context without losing valuable historical knowledge.

**What is the right resident context budget?** Hipocampus's benchmark showed that increasing ROOT.md from 3K to 10K tokens improved easy questions from 26% to 34% but left hard questions unchanged at 8.0%. The optimal budget likely depends on the task distribution, but no framework exists for calculating it.

**How do you handle the phase transition in skill routing?** The agent skills paper identified a critical library size beyond which skill selection accuracy degrades sharply [Source](../raw/deep/papers/xu-agent-skills-for-large-language-models-architectu.md). With Anthropic's ecosystem growing and ECC at 156 skills, production systems are approaching this threshold. Hierarchical routing, meta-skills, or skill embedding spaces might help, but no solution has been validated at scale.

**Can machine-learned context be made auditable?** SICA's self-modifications and Autocontext's Coach-written playbooks produce context that shaped agent behavior but originated from LLM reasoning, not human intent. The agent skills paper calls this "the field's most important open problem." Acontext's three-stage pipeline is the strongest attempt at the bridge, but its distillation quality depends entirely on the LLM's judgment.

**What is the right granularity for context persistence?** Compound Product persists context at the task level (8-15 machine-verifiable tasks per feature) [Source](../raw/deep/repos/snarktank-compound-product.md). Hipocampus persists at the session level (daily logs compacted up). Graphiti persists at the fact triple level. CORAL persists at the eval attempt level [Source](../raw/deep/repos/human-agent-society-coral.md). No evidence establishes which granularity produces the best downstream agent performance across different task types.

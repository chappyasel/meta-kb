---
title: The State of Context Engineering
type: synthesis
bucket: context-engineering
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
  - repos/wangyu-ustc-mem-alpha.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/agenticnotetaking-arscontexta.md
  - repos/martian-engineering-lossless-claw.md
  - repos/volcengine-openviking.md
  - repos/kepano-obsidian-skills.md
  - papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/martinfowler-com-context-engineering-for-coding-agents.md
  - tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md
  - tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md
  - tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md
  - repos/affaan-m-everything-claude-code.md
  - repos/othmanadi-planning-with-files.md
  - repos/ayanami1314-swe-pruner.md
  - repos/laurian-context-compression-experiments-2508.md
  - repos/greyhaven-ai-autocontext.md
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - repos/tirth8205-code-review-graph.md
  - papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - articles/towards-data-science-agentic-rag-failure-modes-retrieval-thrash-tool.md
entities:
  - mcp
  - context-engineering
  - progressive-disclosure
  - prompt-engineering
  - dspy
  - chain-of-thought
  - context-window-management
  - longllmlingua
  - in-context-learning
  - omar-khattab
last_compiled: '2026-04-05T05:15:42.018Z'
---
# The State of Context Engineering

Six months ago, practitioners debated whether to use RAG or long context windows. The question has moved: not how to retrieve information into context, but how to build systems that construct, maintain, and evolve context autonomously across time. A 1,400-paper survey now taxonomizes the retrieval, processing, and management layers ([Source](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)). Anthropic and Martin Fowler published definitive primers in the same week. The shift is from context as input to context as infrastructure.

## Approach Categories

### 1. CLAUDE.md and Instruction Layering

What started as a single markdown file of instructions has evolved into a full context architecture with version-controlled scope hierarchies.

The `.claude/` folder structure, `CLAUDE.md` + `rules/` + `commands/` + `skills/` + `agents/`, has become the de facto standard for configuring coding agents. A viral tweet from @akshay_pachaar (12,222 likes, 2M+ views) laid out the pattern: treat your `.claude/` folder as infrastructure, not configuration ([Source](../raw/tweets/akshay-pachaar-how-to-setup-your-claude-code-project-tl-dr-mos.md)). @PawelHuryn sharpened the decomposition: your CLAUDE.md is doing jobs that rules, hooks, skills, and agents were built for ([Source](../raw/tweets/pawelhuryn-your-claude-md-is-doing-jobs-that-rules-hooks-an.md)). The four mechanisms map to distinct execution models:

1. **Rules** fire by file path. Testing rules load when Claude reads test files.
2. **Hooks** run deterministic code on lifecycle events. Scripts, not AI.
3. **Skills** are lazy-loaded folders with their own instructions, tools, and constraints.
4. **Agents** (subagents) run in their own context window with their own model and tools.

Three scopes stack: Admin, Global, Project. Arrays combine. Settings use the most specific value. Birgitta Bockeler's framework from Fowler's site makes this concrete: distinguish **instructions** (do something) from **guidance** (follow conventions), and be deliberate about **who loads context**, the LLM, the human, or the agent software itself ([Source](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)).

The practical impact: a "Universal CLAUDE.md" claims 63% output token savings through format expectations alone ([Source](../raw/tweets/omarsar0-universal-claude-md-claims-to-cut-claude-output-t.md)). [Everything-Claude-Code](projects/everything-claude-code.md) (136,116 stars) packages this into a complete optimization system: skills, instincts, memory hooks, security scanning, and continuous learning loops across Claude Code, Codex, and Cursor ([Source](../raw/repos/affaan-m-everything-claude-code.md)).

---

### 2. Memory Structure for Long-Horizon Tasks

Three structural patterns compete for how agents should maintain persistent context.

**Vector-based selective retrieval** remains dominant in production. [Mem0](projects/mem0.md) (51,880 stars) operates across user, session, and agent memory scopes. On LOCOMO: selective retrieval beats full-context by 26% accuracy while consuming 90% fewer tokens ([Source](../raw/repos/mem0ai-mem0.md)). Self-reported by Mem0, but the directional claim (selective beats full) is consistent with independent work. The failure mode is vocabulary mismatch: "API rate limiting" in session 1 and "request throttling" in session 3 produce zero cosine similarity.

**Temporal knowledge graphs** address the deeper problem that facts change. [Graphiti](projects/graphiti.md) (24,473 stars) maintains a directed graph where every edge carries a validity window. When new information arrives, old edges are invalidated rather than deleted. The Zep paper reports 94.8% accuracy on DMR versus MemGPT's 93.4%, and 18.5% accuracy improvement on LongMemEval with 90% latency reduction ([Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)). Zep team's own paper. [Cognee](projects/cognee.md) (14,899 stars) takes a similar hybrid route, combining vector search with Neo4j-backed graph structures and a `cognify()` pipeline during ingest ([Source](../raw/repos/topoteretes-cognee.md)). Graphs win when reasoning requires multi-hop traversal or temporal queries. They lose when graph construction introduces LLM hallucination into the edge structure.

**File-system paradigms** treat memory as structured markdown rather than opaque embeddings. [OpenViking](projects/openviking.md) (20,813 stars) organizes all context under a `viking://` virtual filesystem with L0/L1/L2 tiered loading: a one-sentence abstract (L0), a ~2K overview (L1), full content (L2). On LoCoMo10 with 1,540 evaluation cases: 52.08% task completion versus 35.65% baseline, at 83% lower token cost ([Source](../raw/repos/volcengine-openviking.md)). Benchmark is from the OpenViking team. The failure mode: when agents write inconsistently, L0 abstracts drift from actual content and the hierarchy becomes navigational noise.

---

### 3. Unknown-Unknown Discovery

Search requires a query. Queries require suspecting relevant context exists. For unknown unknowns, decisions from three weeks ago that affect today's task, search cannot help.

[Hipocampus](projects/hipocampus.md) (145 stars) addresses this with a ROOT.md topic index: ~3K tokens of compressed map covering everything the agent has discussed, auto-loaded into every session. The MemAware benchmark (900 implicit context questions across 3 months of conversation) shows Hipocampus + Vector at 21.0% overall versus 3.4% for BM25+Vector alone, a 5.1x improvement. On hard questions (zero keyword overlap, cross-domain): 8.0% versus 0.7% ([Source](../raw/repos/kevin-hs-sohn-hipocampus.md)). Both the benchmark (MemAware) and the numbers come from the Hipocampus author; independent validation needed.

The failure mode is ROOT.md budget exhaustion. At 3K tokens, ROOT.md holds roughly 39 topics. Increasing to 10K (120 topics) improves easy-tier from 26% to 34% but does not move hard-tier. Cross-domain reasoning is bottlenecked by the model's ability to connect semantically distant topics, not by index coverage.

[Napkin](projects/napkin.md) (264 stars) demonstrates that BM25 on structured markdown can match embedding-based systems on LongMemEval: 91% on S (40 sessions), 83% on M (500 sessions), versus 86% and 72% for prior best ([Source](../raw/repos/michaelliv-napkin.md)). Self-reported but uses an established external benchmark (LongMemEval, ICLR 2025). Progressive disclosure gates each level: `napkin overview` for vault map (~1-2K tokens), then `napkin search` for ranked results, then `napkin read` for full content.

---

### 4. Prompt Compression

When you cannot make context smaller by design, you compress it by force.

[LLMLingua](projects/llmlingua.md) (5,985 stars) is the reference implementation: a compact language model identifies and removes non-essential tokens, achieving up to 20x compression with minimal performance loss ([Source](../raw/repos/microsoft-llmlingua.md)). LongLLMLingua addressed "lost in the middle", improving RAG performance by 21.4% using one-quarter of the tokens. LLMLingua-2 achieved 3-6x speedup through data distillation with a BERT-level encoder. Native adapters exist for LangChain, LlamaIndex, and Microsoft Prompt Flow.

Generic compression has a fatal flaw for code: fixed metrics like perplexity destroy syntactic structures essential for understanding. [SWE-Pruner](projects/swe-pruner.md) (252 stars) addresses this with task-aware adaptive pruning. The agent formulates an explicit goal ("focus on error handling") as a hint to guide a 0.6B-parameter neural skimmer. Result: 23-54% token reduction on SWE-Bench and up to 14.84x compression on single-turn tasks ([Source](../raw/repos/ayanami1314-swe-pruner.md)). The pattern, where the agent articulates what context matters for its current objective, is broadly applicable.

For RAG-specific compression, DSPy GEPA and TextGrad optimization recovered 100% of failed compressions on gpt-4o-mini that the baseline prompt missed entirely ([Source](../raw/repos/laurian-context-compression-experiments-2508.md)). This matters because production agentic RAG constantly forces fallbacks to cheaper models through rate limits.

---

### 5. Evolving Context Playbooks

Static prompts degrade. The ACE (Agentic Context Engineering) framework treats contexts as living playbooks that accumulate, refine, and organize strategies ([Source](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)).

The core problem ACE solves is **context collapse**: iterative rewriting erodes details over time. Prior approaches suffer from brevity bias, where each rewrite drops domain insights for concise summaries. ACE prevents this with structured incremental updates that preserve detailed knowledge and scale with long-context models. Results: +10.6% on agent benchmarks, +8.6% on finance tasks, matching the top-ranked production agent on AppWorld despite using a smaller open-source model.

[Agentic Context Engine](projects/agentic-context-engine.md) (2,112 stars) maintains a persistent "Skillbook" that evolves with every task ([Source](../raw/repos/kayba-ai-agentic-context-engine.md)). Three specialized roles: Agent (executes), Reflector (analyzes traces), SkillManager (curates Skillbook). The Recursive Reflector writes and executes Python in a sandbox to search for patterns rather than summarizing in a single pass. Results: 2x consistency on Tau2 benchmarks, 49% token reduction in browser automation.

[Acontext](projects/acontext.md) (3,264 stars) stores learned behavior as markdown skill files. After each task, a distillation pass extracts what worked into SKILL.md files. The agent recalls via `get_skill` tool calls, progressive disclosure by tool use rather than by search. The philosophy: "skill is memory, memory is skill." No embeddings, no vector database, Git and grep are sufficient ([Source](../raw/repos/memodb-io-acontext.md)). The failure mode is skill file proliferation: without disciplined consolidation, agents accumulate thousands of narrow files that create their own retrieval problem.

---

### 6. Context Graphs and Session Persistence

@akoratana's viral thread (1,725 likes, 381K views): context graphs will be to the 2030s what databases were to the 2000s ([Source](../raw/tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md)). The thesis: hierarchy is a lossy compression algorithm for organizational knowledge. Context graphs replace it with direct access to decision traces.

[Code Review Graph](projects/code-review-graph.md) (4,176 stars) builds a persistent Tree-sitter-based structural graph of codebases for blast-radius analysis ([Source](../raw/repos/tirth8205-code-review-graph.md)). On code reviews: 6.8-49x fewer tokens by reading only affected files. 8.2x average token reduction across six real repositories with 100% recall on impact analysis. For monorepos, 27,700+ files get excluded from review context, leaving ~15 files.

[Lossless Claw](projects/lossless-claw.md) (3,963 stars) replaces sliding-window truncation with DAG-based summarization: messages are persisted to SQLite, summarized into hierarchical nodes, and assembled at each turn by combining summaries with recent raw messages ([Source](../raw/repos/martian-engineering-lossless-claw.md)). The `lcm_grep`, `lcm_describe`, and `lcm_expand` tools let agents drill into any summary to recover original detail. No information is deleted. The failure mode is summary drift: summarization LLM errors propagate into higher-level nodes.

[Planning with Files](projects/planning-with-files.md) (17,968 stars) implements the Manus pattern: `Context Window = RAM (volatile, limited); Filesystem = Disk (persistent, unlimited)` ([Source](../raw/repos/othmanadi-planning-with-files.md)). For every complex task, create three files: `task_plan.md`, `findings.md`, and `progress.md`. Hooks re-read the plan before major decisions, remind the agent to update status after file writes, and verify completion before stopping. Benchmarks: 96.7% pass rate (29/30 assertions) with skill vs 6.7% without. Session recovery handles context resets: when you `/clear`, the skill finds previous session data and shows a catchup report. Now supports 16+ platforms.

## The Convergence

**Context is a finite attention budget, not an infinite canvas.** A 1,400-paper survey confirms models understand complex context far better than they generate equally sophisticated output ([Source](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)). Knowledge bases must work around limited output sophistication, not just input capacity. Context rot degrades recall as token count increases, regardless of window size ([Source](../raw/articles/effective-context-engineering-for-ai-agents.md)). Six months ago, "just use a 1M token context window" was taken seriously.

**Progressive disclosure beats full-context injection.** Whether implemented as L0/L1/L2 file tiers (OpenViking), ROOT.md topic indexes (Hipocampus), napkin's four-level disclosure protocol, or skill lazy-loading (Anthropic's skills spec), the consensus is that dumping all available context into a prompt is wasteful and degrades attention.

**Version-controlled markdown is the universal interface.** CLAUDE.md, AGENTS.md, skill files, planning documents, Acontext, Planning with Files, Everything-Claude-Code, and the ACE framework all store knowledge in plain text files. Human-readable, git-trackable, framework-agnostic.

**Agents write to their own knowledge bases.** The Karpathy wiki pattern, Acontext skill files, ACE Skillbooks, and Ars Contexta's processing pipeline all share a design: the agent maintains its own persistent memory, writes to it after each session, reads from it at session start. Six months ago this was a fringe pattern.

## What the Field Got Wrong

**The assumption:** Retrieval accuracy is the bottleneck. Build better embeddings, hybrid search, reranking, graph traversal. If you retrieve the right information, agents perform well.

**The evidence against it:** Hipocampus's MemAware benchmark shows that even with BM25 + vector search, performance on implicit context questions is 3.4%. The bottleneck is the agent's ability to recognize that relevant context exists before issuing a search query. You cannot search for what you do not know you need.

**What replaced it:** Proactive context architecture. Systems now focus on ensuring agents have broad awareness of their own knowledge landscape (ROOT.md, L0 abstracts, NAPKIN.md) so they recognize relevance before executing search. Search becomes a precision tool for known unknowns; structural indexes handle unknown unknowns.

This reframes the role of graph databases. Graphs are valuable because relationship structure makes context discoverable without explicit queries. "The rate limiting decision is related to the payment flow refactoring" emerges from graph traversal, not semantic similarity.

## Failure Modes

**Compounding hallucination in self-maintaining knowledge bases.** When agents write to their own memory, errors accumulate. A hallucinated fact in session 3 becomes part of the knowledge base, influences session 7, and produces downstream errors that trace to an unexaminable root. The multi-agent wiki pattern from @jumperz ([Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)) addresses this with a separate supervisor (Hermes) that reviews articles blind. Without a validation gate, hallucination compounds geometrically.

**Skill ecosystem injection attacks.** 26.1% of community-contributed skills contain vulnerabilities: injection attacks, capability escalation, or data exfiltration vectors ([Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)). Trigger: loading skills from unvetted sources. Blast radius: arbitrary instruction execution within the agent's permission scope. The survey proposes a four-tier gate-based permission model, but no adopted implementation exists yet.

**ROOT.md / index file staleness.** Systems relying on compressed topic indexes fail when the index drifts from actual content. This happens when compaction runs infrequently, when the compaction LLM produces imprecise summaries, or when content updates do not trigger index rebuilds. The failure is invisible: agents confidently navigate an index that no longer reflects reality.

**Fitness function reward hacking.** When agents can modify both the codebase and the scoring script, they find ways to maximize the metric without genuine improvement. GOAL.md's dual-score pattern (separate scores for the thing being measured and the quality of the instrument) partially addresses this ([Source](../raw/repos/jmilinovich-goal-md.md)). Trigger: agent with write access to its own evaluation. Blast radius: codebase converges to a local optimum that scores well but does not work.

**Graph construction hallucination.** Temporal knowledge graphs (Graphiti, Cognee, Zep) require LLM passes to extract entities and relationships. Small models produce incorrect entity resolution, phantom relationships, and conflated entities. These errors become graph edges with validity windows, influencing all downstream reasoning. Graphiti's documentation notes structured output support (OpenAI, Gemini) is required and smaller models "may result in incorrect output schemas and ingestion failures."

**Context collapse in iterative rewriting.** Systems that iteratively rewrite context summaries suffer from brevity bias: each rewrite discards "unnecessary" detail, and after several passes, domain-specific nuance disappears. The ACE paper ([Source](../raw/papers/zhang-agentic-context-engineering-evolving-contexts-for.md)) identifies this and addresses it with structured, incremental updates that append rather than replace.

## Selection Guide

- **Persistent memory across sessions, minimal infrastructure**: [Mem0](projects/mem0.md) (51,880 stars). Multi-level memory with a clean API, managed option available.

- **Facts that change over time** (preferences, organizational data, evolving policies): [Graphiti](projects/graphiti.md) (24,473 stars) for open-source, Zep for managed deployment. Temporal validity windows prevent stale fact contamination.

- **Observability and human editability of agent memory**: [OpenViking](projects/openviking.md) (20,813 stars). Filesystem paradigm makes memory inspectable. Best when you want to understand what the agent knows without reading vector store dumps.

- **Session persistence through structured files**: [Planning with Files](projects/planning-with-files.md) (17,968 stars). The simplest useful form of agent memory. 16+ platform support.

- **Full agent harness with skills, memory, and security**: [Everything-Claude-Code](projects/everything-claude-code.md) (136,116 stars). Complete optimization system for Claude Code, Codex, and Cursor.

- **Agents that improve from experience without retraining**: [ACE](projects/agentic-context-engine.md) (2,112 stars). The Skillbook pattern with Recursive Reflector. Pairs with any framework via LiteLLM.

- **Modular capability composition on Claude Code or OpenClaw**: [Anthropic's skills repo](projects/anthropic.md) (110,064 stars). The SKILL.md specification is the emerging standard.

- **Lossless context preservation for long sessions**: [Lossless Claw](projects/lossless-claw.md) (3,963 stars). No other published system preserves complete conversation history without truncation.

- **Personal research KB without vector infrastructure**: [Napkin](projects/napkin.md) (264 stars). BM25 on markdown, ~500 session retrieval at 83% LongMemEval accuracy.

- **Context-aware code review for monorepos**: [Code Review Graph](projects/code-review-graph.md) (4,176 stars). 8.2x average token reduction, 100% recall on impact analysis.

- **Prompt compression for production RAG**: [LLMLingua](projects/llmlingua.md) (5,985 stars). Up to 20x compression. For code, use [SWE-Pruner](projects/swe-pruner.md) (252 stars) for task-aware pruning.

- **Avoid** loading community skills from unvetted marketplaces without sandboxing. 26.1% vulnerability rate is not theoretical.

## The Divergence

**Where should knowledge live?** One camp says in-context: compress, prune, and carefully curate what enters the window. LLMLingua, SWE-Pruner, compaction strategies. The operating assumption: the context window is the only place reasoning happens, so everything must fit. The other camp says in-files: externalize to filesystem, database, or graph store, give the agent tools to retrieve on demand. Planning with Files, Acontext, Lossless Claw, Code Review Graph. The operating assumption: the context window is working memory, not storage.

**How much structure to impose?** ACE and autocontext impose rich structure: generation, reflection, curation loops with gated persistence. Planning with Files imposes minimal structure: three markdown files and hooks. The structured approach pays off on repeated, evaluable tasks where strategies compound. The minimal approach wins on novel, one-shot tasks where learning-loop overhead is not justified.

**Who decides what context to load?** Anthropic and Fowler both describe three control models: human-triggered, software-triggered, and LLM-triggered. Anthropic's skills lean toward LLM autonomy. Slash-command-heavy systems preserve human control. Hook-based systems sit between. Use human control when predictability matters; use LLM-controlled loading when the task is open-ended enough that pre-declaring every need is unrealistic.

**Legibility vs machine efficiency.** Planning with Files, Napkin, and Acontext prioritize artifacts humans can read and repair. LLMLingua and graph-heavy systems optimize internal representation for model performance. The right answer depends on whether your system fails more often from opacity or from token waste.

## What's Hot Now

**CLAUDE.md as an industry standard.** Cursor adopted Claude Code-style skills. GitHub Copilot added hooks. Kiro, Codex, Mastra, and a dozen other tools support the same agent skill spec. Planning with Files works across 16+ platforms from a single `npx skills add` command. This is standardization, not hype.

**Everything-Claude-Code at 136K stars.** The largest context engineering project by an order of magnitude. It packages skills, instincts, memory optimization, continuous learning, security scanning, and multi-language support into a production system.

**Anthropic and Fowler publishing the same week.** Both dropped April 4, 2026. Anthropic introduced the "attention budget" mental model and formalized compaction, structured note-taking, and sub-agent architectures ([Source](../raw/articles/effective-context-engineering-for-ai-agents.md)). Bockeler's Fowler piece provided the practitioner taxonomy: what is context, who loads it, how to keep it small ([Source](../raw/articles/martinfowler-com-context-engineering-for-coding-agents.md)). Together they mark the moment context engineering became a named discipline.

**Planning with Files at 17.9K stars.** The Manus pattern hit a nerve. Session persistence through structured markdown files is the simplest useful form of agent memory.

**OpenViking at 20,813 stars.** The LoCoMo10 benchmark results (52% task completion vs 35% baseline, 83% token cost reduction) drove attention in March-April 2026.

## Open Questions

**Where is the compaction quality floor?** Every system that hierarchically summarizes history assumes LLM summaries preserve relevant information. No one has measured how much information survives multiple compaction cycles, or which types (procedural knowledge vs factual assertions vs relationship structure) degrade fastest.

**Can skill ecosystems be secured without sacrificing composability?** The 26.1% vulnerability rate is serious. Proposed solutions (four-tier permission models, code signing, sandboxed execution) all reduce composability. The field has not found a workable balance.

**How do you evaluate context quality?** There are no unit tests for context engineering, as Bockeler noted. You have to use a configuration for a while to know if it works. This makes sharing configurations between teams unreliable and context optimization slow.

**Does RL-trained memory management generalize beyond the training domain?** Memalpha-4B was trained on personal assistant scenarios. Whether learned memory strategies transfer to code agents, research agents, or enterprise agents is untested.

**At what scale does the file-system paradigm break?** OpenViking reports strong results on its own benchmarks, but the L0/L1/L2 hierarchy requires that L0 abstracts remain accurate summaries of L2 content. Past some file count threshold, abstracts generated during ingest become stale. No published work characterizes this threshold.

**Will the comprehension-generation asymmetry close?** The 1,400-paper survey found that models understand complex context far better than they generate sophisticated output. If this gap closes, many current context engineering techniques become unnecessary. If not, the discipline becomes permanently load-bearing.

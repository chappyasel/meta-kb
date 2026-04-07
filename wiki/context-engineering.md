---
title: The State of Context Engineering
type: synthesis
bucket: context-engineering
abstract: >-
  Context engineering has split into two opposing camps: file-based systems that
  treat markdown as the universal memory substrate versus graph-and-vector
  architectures that model relationships and time. Both work. Neither subsumes
  the other. The choice depends on whether your agent needs to discover
  connections it wasn't asked about.
source_date_range: 2025-01-20 to 2026-04-07
newest_source: '2026-04-07'
staleness_risk: low
sources:
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
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
entities:
  - mcp
  - context-engineering
  - progressive-disclosure
  - prompt-engineering
  - dspy
  - claude-md
  - context-compression
  - context-window
  - chain-of-thought
  - context-management
  - dspy-optimization
  - unknown-unknowns
last_compiled: '2026-04-07T11:31:09.948Z'
---
# The State of Context Engineering

[Andrej Karpathy](concepts/andrej-karpathy.md) built a personal knowledge system from markdown files, auto-maintained indexes, and LLM "health checks," then declared he didn't need "fancy RAG" for ~400K words of research notes ([source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)). [Zep](projects/zep.md) published a paper showing their temporal knowledge graph beat MemGPT on the Deep Memory Retrieval benchmark at 94.8% accuracy while cutting latency by 90% on enterprise-critical tasks like cross-session information synthesis ([source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)). These two projects made opposite bets on the same problem: Karpathy treats context as files the LLM can directly read and maintain; Zep treats context as a temporal graph that must be queried through structured retrieval. Both report strong results. The tension between them defines this space.

## Approach Categories

### Should context live in files or in a database?

The file-based camp argues that markdown is human-readable, git-trackable, and LLM-native. [napkin](projects/napkin.md) (264 stars) takes this position to its extreme: BM25 search on markdown, no embeddings, no vector database. On the LongMemEval benchmark, napkin reports 91.0% accuracy on the S split (~40 sessions) versus 86% for the best prior system and 64% for GPT-4o full context ([source](../raw/repos/michaelliv-napkin.md)). These numbers come from the project's own benchmarks, not peer-reviewed work, so treat them with appropriate skepticism. [OpenViking](projects/openviking.md) (20,813 stars) sits between the camps: it uses a virtual filesystem paradigm (`viking://` URIs) but backs it with vector embeddings and tiered L0/L1/L2 context loading. On the LoCoMo benchmark with OpenClaw, OpenViking reports 52.08% task completion versus 35.65% for baseline, while using 83% fewer input tokens ([source](../raw/repos/volcengine-openviking.md)).

The database camp builds on [Graphiti](projects/graphiti.md) (24,473 stars), which models facts as temporal edges with validity windows, episode provenance, and hybrid retrieval combining semantic embeddings, BM25, and graph traversal. [Mem0](projects/mem0.md) (51,880 stars) occupies the middle ground with multi-level memory (user/session/agent) backed by vector stores, claiming 26% accuracy gains over OpenAI Memory on the LOCOMO benchmark with 90% fewer tokens ([source](../raw/repos/mem0ai-mem0.md)).

**Tradeoff:** File-based systems win when your corpus fits within LLM reading range (~500K tokens), stays local, and needs human inspection. Database systems win when facts change over time, span multiple users, or require cross-session reasoning. **Failure mode:** File-based systems silently degrade when they grow past the point where index files can represent content accurately. You won't get an error; you'll get incomplete answers because the LLM couldn't find the right file to read.

### How should agents load context: eagerly or on demand?

[Progressive disclosure](concepts/progressive-disclosure.md) has become the dominant pattern, but implementations differ sharply. [Hipocampus](projects/hipocampus.md) (145 stars) auto-loads a ~3K token ROOT.md topic index into every session, providing O(1) awareness of all past topics. On its MemAware benchmark, Hipocampus with vector search scores 21.0% overall versus 3.4% for BM25 + vector search alone, a 5.1x improvement ([source](../raw/repos/kevin-hs-sohn-hipocampus.md)). These are self-reported benchmarks on a custom evaluation set, so independent verification is needed.

Acontext (3,264 stars) uses tool-based progressive disclosure: agents call `get_skill` and `get_skill_file` to retrieve specific skill memories on demand, rather than receiving search results from embedding queries ([source](../raw/repos/memodb-io-acontext.md)). [CLAUDE.md](concepts/claude-md.md) files represent the simplest form: static project context always loaded at session start ([source](../raw/repos/anthropics-skills.md)).

**Tradeoff:** Eager loading (ROOT.md, CLAUDE.md) guarantees the agent knows what it knows, solving the "unknown unknowns" problem Hipocampus highlights. On-demand loading saves tokens but requires the agent to suspect relevant context exists before searching. **Failure mode:** Eager loading breaks when the index grows larger than what fits in the "always loaded" budget. Hipocampus benchmarks show that expanding ROOT.md from 3K to 10K tokens improves easy-question accuracy from 26% to 34%, but hard cross-domain questions stay at 8%, suggesting the answer model, not the index, becomes the bottleneck.

### Should memory improve through human curation, automated distillation, or reinforcement learning?

Three schools compete here. The curation school, represented by Karpathy's wiki pattern and Ars Contexta (2,928 stars), has LLMs write and maintain knowledge but keeps humans in the review loop. Ars Contexta generates entire knowledge system architectures from conversation, deriving folder structures, templates, and processing pipelines from 249 research claims ([source](../raw/repos/agenticnotetaking-arscontexta.md)).

The distillation school, represented by [ACE Framework](projects/ace.md) (2,112 stars) and Acontext, extracts reusable strategies from execution traces. ACE maintains a "Skillbook" of learned strategies and reports doubling pass^4 consistency on the Tau2 airline benchmark with 15 learned strategies and no reward signals ([source](../raw/repos/kayba-ai-agentic-context-engine.md)).

The RL school, represented by [Mem-α](projects/memevolve.md) (193 stars), trains agents via [GRPO](concepts/grpo.md) to decide when and how to encode information into episodic, semantic, or core memory. Mem-α trains on 30K-token sequences and reports generalization to 400K+ tokens ([source](../raw/repos/wangyu-ustc-mem-alpha.md)).

**Tradeoff:** Curation produces the most inspectable results but doesn't scale. Distillation scales but produces strategies of variable quality. RL produces the most adaptive behavior but is opaque and expensive to train. **Failure mode:** Distillation systems overfit to specific traces. The meta-agent project found that its proposer "often fixed the specific traces the proposer saw rather than writing general behavioral rules," requiring explicit anti-overfitting instructions ([source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)).

### At what layer should learning happen: model, harness, or context?

Harrison Chase from [LangChain](projects/langchain.md) frames this as three independent optimization surfaces: model weights (SFT/RL), harness code (prompt, tools, hooks), and context (memory, skills) ([source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)). The meta-agent project demonstrated harness-level optimization on [TAU-bench](projects/tau-bench.md), improving holdout accuracy from 67% to 87% by iteratively modifying system prompts, stop conditions, and business-rule skills ([source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)). [AutoResearch](projects/autoresearch.md) (3,142 stars) generalizes Karpathy's constraint-metric-loop pattern to any domain, using git as episodic memory for harness evolution ([source](../raw/repos/uditgoenka-autoresearch.md)).

**Tradeoff:** Context-layer learning has the fastest feedback loop and lowest risk. Harness-layer learning requires evaluation infrastructure but produces compound improvements. Model-layer learning risks [catastrophic forgetting](concepts/catastrophic-forgetting.md). **Failure mode:** Harness optimization can game evaluation metrics. The meta-agent team found that search-split accuracy improved while holdout accuracy decreased, requiring careful train/holdout separation.

## The Convergence

**All production-grade context systems now implement tiered loading.** OpenViking uses L0/L1/L2. Hipocampus uses hot/warm/cold. napkin uses four progressive levels (NAPKIN.md → overview → search → full file). Even simple CLAUDE.md files implement a two-tier pattern: always-loaded instructions plus on-demand skill files. The last holdout against tiered loading was the "dump everything into long context" approach, which Karpathy himself acknowledged only works at "~small scale."

**All serious memory systems now separate what the agent knows it knows from what it must search for.** Hipocampus's ROOT.md, OpenViking's L0 abstracts, Mem0's multi-level memory, and Graphiti's entity summaries all maintain a top-level awareness layer distinct from full content retrieval. [Letta](projects/letta.md) held out longest, implementing a single-tier archival memory search, but even Letta eventually added core memory as an always-available layer.

**All self-improving systems now persist execution traces as the substrate for learning.** meta-agent stores harness candidates, scores, and traces on disk. AutoResearch logs iterations in TSV format with before/after scores. ACE's pipeline produces traces that feed its Reflector and SkillManager. GOAL.md appends to `iterations.jsonl`. No production system attempts to improve without trace persistence.

## What the Field Got Wrong

Practitioners assumed [RAG](concepts/rag.md) with vector search would solve agent memory. Mem0's early architecture, most [LangChain](projects/langchain.md)-based agents, and the broader "just embed and retrieve" movement all bet that semantic similarity search over chunks would provide sufficient context for multi-session agents. The evidence now contradicts this.

Hipocampus measured this directly: BM25 + vector search scored 3.4% on implicit context questions where the agent needed to surface relevant past context the user never asked about ([source](../raw/repos/kevin-hs-sohn-hipocampus.md)). That's barely better than no memory (0.8%). The reason: search requires a query, and a query requires suspecting that relevant context exists. For "unknown unknowns," the retrieval paradigm structurally cannot help.

The replacement is proactive context: always-loaded indexes (Hipocampus ROOT.md, OpenViking L0), topic-aware session initialization (Ars Contexta's session orient hooks), and file-system browsing that lets agents discover what they didn't know to ask about. The field moved from "search for what you need" to "know what you have, then search for details."

## Deprecated Approaches

**Flat vector stores as the sole memory layer.** Pre-2025, practitioners treated [ChromaDB](projects/chromadb.md) or [Pinecone](projects/pinecone.md) as complete memory solutions: embed text, retrieve top-k, inject into prompt. This seemed right because early demos showed dramatic improvements over no memory. The evidence that killed it: Hipocampus's benchmarks showing search-based approaches scoring only 2.8-3.4% on implicit context, plus Zep's paper demonstrating 18.5% accuracy improvements from temporal knowledge graphs over static retrieval on [LongMemEval](projects/longmemeval.md) ([source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)). Practitioners now layer vector search under graph structures (Graphiti), tiered loading (OpenViking), or proactive indexes (Hipocampus).

**Stuffing full conversation history into long context.** When models shipped 128K-1M token windows, practitioners assumed they could skip memory engineering and feed entire histories. This seemed right because it eliminated retrieval errors. The evidence that killed it: napkin's benchmarks show GPT-4o full context scoring 64% on ~40 sessions versus napkin's 91% with progressive disclosure ([source](../raw/repos/michaelliv-napkin.md)). Attention degradation at scale, prohibitive per-call costs, and inability to handle histories spanning months or years made this approach unviable. [Context compression](concepts/context-compression.md) and tiered loading replaced it.

**Manual memory curation.** Early MEMORY.md patterns required developers or agents to maintain a single flat file of accumulated knowledge. This seemed right because it kept memory simple and inspectable. The evidence that killed it: Hipocampus documents that "after a month, hundreds of decisions and insights can't fit in a system prompt" ([source](../raw/repos/kevin-hs-sohn-hipocampus.md)). Hierarchical compaction trees (Hipocampus), automated session extraction (OpenViking), and skill distillation (Acontext, ACE) replaced manual curation with self-maintaining structures.

## Failure Modes

**Index staleness in self-maintaining wikis.** Karpathy's pattern relies on the LLM correctly maintaining index files and summaries as the wiki evolves. In a multi-agent swarm, one practitioner documented compounding hallucinations where "one hallucinated connection enters the brain and every agent downstream builds on it" ([source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)). The blast radius is the entire downstream knowledge base. Mitigation requires a separate review agent (the "Hermes" pattern) or Karpathy's LLM linting health checks, but neither guarantees consistency at scale.

**Semantic drift in learned strategies.** ACE and meta-agent extract behavioral rules from traces. Over many iterations, these rules accumulate and can contradict each other. The meta-agent team observed that their proposer would "fix" docs accuracy by removing correct API references to satisfy a broken linter ([source](../raw/repos/jmilinovich-goal-md.md)). GOAL.md addresses this with dual-score patterns, but most distillation systems lack this safeguard. The blast radius is silent accuracy degradation as the strategy set grows.

**Token budget overflows in eager loading.** ROOT.md, CLAUDE.md, and L0 abstracts all compete for tokens in the agent's initial context. As projects grow, the "always loaded" budget can consume a significant fraction of the context window before the agent begins working. Hipocampus caps ROOT.md at 3K tokens, but practitioners adding multiple context sources (project instructions, user preferences, skill files) can easily exceed useful limits. The blast radius is degraded reasoning quality as the agent's "thinking space" shrinks.

**Temporal invalidation failures.** Graphiti explicitly models fact validity windows, but most memory systems treat stored facts as permanently true. An agent told "the API endpoint is /v2/users" six months ago will confidently use that stale information if the memory system doesn't track temporal validity. [Zep](projects/zep.md) addresses this with bi-temporal tracking, but simpler systems like Mem0 or file-based approaches have no invalidation mechanism.

**Skill vulnerability injection.** The Agent Skills paper reports that 26.1% of community-contributed skills contain vulnerabilities ([source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)). Skills loaded into agent context can contain prompt injections, information exfiltration, or privilege escalation patterns. The blast radius extends to any tool or data the agent has access to. The [Agent Skills](concepts/agent-skills.md) specification proposes a four-tier governance framework, but no production system fully implements it yet.

## Selection Guide

- **If you need personal knowledge management for a single researcher/developer,** use napkin (264 stars) or Karpathy's wiki pattern with [Obsidian](projects/obsidian.md) (19,325 stars for obsidian-skills). Zero infrastructure, local files, git-trackable. Works below ~500K tokens of content.
- **If you need multi-user agent memory with temporal reasoning,** use [Graphiti](projects/graphiti.md) (24,473 stars) backed by Neo4j or FalkorDB. Requires graph database infrastructure but handles fact evolution, cross-session synthesis, and enterprise scale.
- **If you need a drop-in memory API for chatbots or assistants,** use [Mem0](projects/mem0.md) (51,880 stars). Highest adoption, multi-level memory abstraction, works with any LLM. Mature platform with managed cloud option.
- **If you need agents that learn from execution without retraining,** use [ACE Framework](projects/ace.md) (2,112 stars) for strategy distillation from traces, or meta-agent for harness-level optimization. ACE supports 100+ LLM providers via LiteLLM.
- **If you need proactive context for coding agents,** use [Hipocampus](projects/hipocampus.md) (145 stars) for its ROOT.md pattern, or [OpenViking](projects/openviking.md) (20,813 stars) for full filesystem-paradigm context management. Both work as plugins for coding agent platforms.
- **If you need lossless conversation history for long-running agents,** use Lossless Claw (3,963 stars). DAG-based summarization preserves every message while keeping active context within token limits.
- **If you need to avoid vendor lock-in on memory format,** use Acontext (3,264 stars). Skill memories are markdown files, downloadable as ZIP, usable with any framework.
- **Avoid building custom RAG pipelines from scratch for agent memory.** The pre-built systems above have solved the hard integration problems. If you must customize, start with [DSPy](projects/dspy.md) for prompt optimization or [LangGraph](projects/langgraph.md) for workflow orchestration.

## The Divergence

### File-native memory versus graph-native memory

File-native systems (napkin, Hipocampus, Karpathy wiki, Acontext) store all knowledge as markdown files with text-based search. They optimize for inspectability, simplicity, and local operation. Graph-native systems (Graphiti, [cognee](projects/graphiti.md), Zep) store knowledge as nodes and edges in graph databases. They optimize for relationship discovery, temporal tracking, and cross-entity reasoning.

File-native wins when you need human oversight, git integration, and predictable token costs. Graph-native wins when facts evolve, relationships matter, or you need to answer questions like "what changed about this customer's preferences over the last six months." The field shows no signs of converging: OpenViking (20K+ stars) bets on files; Graphiti (24K+ stars) bets on graphs. Both are growing fast.

### Proactive context injection versus agent-driven retrieval

Hipocampus, CLAUDE.md, and OpenViking's L0 layer inject context before the agent asks. Acontext, Mem0, and traditional RAG wait for the agent to pull context. Proactive injection prevents the "unknown unknowns" problem but burns tokens on potentially irrelevant context. Agent-driven retrieval saves tokens but misses connections the agent didn't think to search for.

Working implementations exist on both sides. Hipocampus's benchmarks favor proactive injection (21x improvement over no memory). But Mem0's 90% token reduction versus full context shows the cost pressure pushing toward selective retrieval.

### Harness optimization versus context optimization

meta-agent and AutoResearch modify agent code, prompts, and tool configurations. Mem0, ACE, and Acontext modify the context the agent receives without changing the agent itself. Harness optimization produces larger improvements per iteration (meta-agent: 67% to 87% on TAU-bench) but requires evaluation infrastructure and risks regressions. Context optimization is safer and more composable but produces smaller per-step gains.

Harrison Chase argues these are complementary layers, and his framing is gaining traction ([source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)). But in practice, teams pick one or the other because each requires different infrastructure.

### LLM-maintained wikis versus embedding-backed stores

Karpathy's pattern has the LLM read and write markdown directly, maintaining its own indexes. The traditional approach uses embedding models to vectorize content and retrieval pipelines to find relevant chunks. Karpathy reports this works "fairly easily at this ~small scale." napkin's LongMemEval results suggest file-based approaches can match or beat vector-backed systems even at moderate scale.

**Source conflict:** napkin ([source](../raw/repos/michaelliv-napkin.md)) reports 91.0% accuracy on LongMemEval S-split with "zero preprocessing, no embeddings, no graphs." Zep ([source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)) reports accuracy improvements up to 18.5% from their temporal graph approach on the same benchmark. These results may not be directly comparable due to different evaluation protocols, model choices, and split definitions. Practitioners should run their own benchmarks on representative data before committing to either approach.

## What's Hot Now

[OpenViking](projects/openviking.md) reached 20,813 stars with strong momentum from the OpenClaw community. [Anthropic](projects/anthropic.md)'s skills repository hit 110,064 stars, making it the largest project in this space by raw star count, driven by the Agent Skills specification and Claude's document capabilities ([source](../raw/repos/anthropics-skills.md)). [Obsidian skills](projects/obsidian.md) accumulated 19,325 stars, indicating massive demand for agentic knowledge-base operations.

The meta-agent paper on continual harness learning from production traces is generating significant discussion, with its 67% → 87% TAU-bench result on Haiku 4.5 showing that even small models benefit from automated harness optimization ([source](../raw/articles/x-twitter-meta-agent-continual-learning-for-agents.md)). Ars Contexta reached 2,928 stars by combining cognitive science research with agent architecture generation, filling a gap between raw skill files and principled knowledge system design.

Karpathy's LLM knowledge base tweet received 38,638 likes and 9.9M views ([source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)), suggesting mainstream developer awareness of file-based context engineering patterns. His AutoResearch tweet hit 28,330 likes ([source](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)), validating the constraint-metric-loop pattern as a recognized approach.

The survey paper "A Survey of [Context Engineering](concepts/context-engineering.md) for Large Language Models" synthesizes over 1,400 research papers and identifies a "fundamental asymmetry" between model comprehension and generation capabilities ([source](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)), formally establishing context engineering as an academic discipline.

## Open Questions

**How should agents handle conflicting memories?** When a file-based memory says one thing and a recent conversation says another, no standard resolution mechanism exists. Graphiti's temporal invalidation is the closest solution, but it requires graph infrastructure.

**Can learned strategies transfer across agents?** Acontext's downloadable skill ZIPs suggest portability, but no benchmark measures cross-agent strategy transfer. If strategies learned by one agent reliably help different agents, the value of memory infrastructure increases dramatically.

**Where is the crossover point between file-based and graph-based approaches?** napkin works well at ~500 sessions. Graphiti works well at enterprise scale. Nobody has measured where file-based approaches start failing and graph approaches become necessary. Practitioners lack guidance on when to migrate.

**How do you evaluate context engineering quality?** LongMemEval, MemAware, LoCoMo, and TAU-bench each test different aspects. No unified benchmark covers the full spectrum from personal knowledge management to enterprise multi-agent memory. Self-reported benchmarks dominate the space, making cross-project comparison unreliable.

**Should context engineering happen before, during, or after inference?** Pre-inference context assembly (RAG, eager loading) competes with in-inference tool use (agent-driven retrieval) competes with post-inference trace distillation (ACE, meta-agent). The optimal mix likely depends on task type, but practitioners lack a framework for deciding.

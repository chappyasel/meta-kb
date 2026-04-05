---
title: The State of Agent Memory
type: synthesis
bucket: agent-memory
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
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/anthropics-skills.md
  - repos/jmilinovich-goal-md.md
  - repos/uditgoenka-autoresearch.md
  - repos/kayba-ai-agentic-context-engine.md
  - repos/michaelliv-napkin.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - papers/xu-agent-skills-for-large-language-models-architectu.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/maximerobeyns-self-improving-coding-agent.md
  - repos/letta-ai-letta.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/osu-nlp-group-hipporag.md
  - repos/agenticnotetaking-arscontexta.md
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - articles/lil-log-llm-powered-autonomous-agents.md
  - repos/zorazrw-agent-workflow-memory.md
  - repos/agent-on-the-fly-memento.md
  - repos/bingreeky-memevolve.md
  - repos/bytedtsinghua-sia-memagent.md
  - repos/zhongwanjun-memorybank-siliconfriend.md
  - repos/mirix-ai-mirix.md
entities:
  - episodic-memory
  - zep
  - mem0
  - semantic-memory
  - longmemeval
  - supermemory
  - procedural-memory
  - letta
  - temporal-reasoning
  - a-mem
  - core-memory
  - generative-agents
  - langmem
  - agent-workflow-memory
  - case-based-reasoning
  - long-term-memory
  - memori
last_compiled: '2026-04-05T05:13:17.885Z'
---
# The State of Agent Memory

The question has shifted from "how do agents remember things" to "how do agents learn from experience." Six months ago, memory meant retrieving past conversation turns. Today it means agents that build, curate, and evolve their own knowledge: writing back to structured stores, invalidating stale facts, distilling workflows from execution traces, and improving their own code. The field has fragmented into at least six architectural approaches, each optimizing for different tradeoffs between integration speed, temporal fidelity, and adaptive intelligence.

## Approach Categories

### 1. Universal Memory Layers

The foundational choice: should memory live in vector embeddings, structured graphs, or plain files?

[Mem0](projects/mem0.md) (51,880 stars) uses a hybrid store combining a vector database for semantic search, SQLite for episodic history, and a graph layer for entity relationships. On the LOCOMO benchmark: selective memory retrieval beats naive full-context by 26% on accuracy while cutting token usage 90% ([Source](../raw/repos/mem0ai-mem0.md)). That last number matters most. The real cost of agent memory is not storage; it is the token tax on every context injection. Mem0 demonstrates that intelligent memory is a compression problem. The LLM itself decides what to memorize on each turn, so memory quality depends on extraction quality.

[Letta](projects/letta.md) (21,873 stars), formerly MemGPT, pioneered `memory_blocks`: labeled key-value stores (`human`, `persona`, etc.) always present in the system prompt. Agents read and write these blocks mid-conversation through tool calls. O(1) access to core facts, no retrieval step, at the cost of context tokens on every call. The Zep paper benchmarked against MemGPT, achieving 94.8% vs 93.4% on Deep Memory Retrieval ([Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)). That 1.4% gap is architecturally significant: it shows graph-structured memory can outperform virtual context management.

[Napkin](projects/napkin.md) (264 stars) makes the contrarian bet: no embeddings at all. BM25 search on markdown files with progressive disclosure achieves 83% on the LongMemEval M benchmark (versus 72% for the best prior system), with zero preprocessing ([Source](../raw/repos/michaelliv-napkin.md)). Self-reported by the project but methodologically verifiable since LongMemEval is a public benchmark.

The concrete tradeoff: vector stores win on semantic similarity at scale, knowledge graphs win on temporal reasoning and multi-hop queries, plain files win on infrastructure simplicity and human inspectability. Universal layers optimize for integration speed at the cost of memory topology control. You get memory in 10 lines of code, but you do not get to decide how memories relate to each other, how they decay, or how contradictions resolve.

---

### 2. Temporal Knowledge Graphs

[Graphiti](projects/graphiti.md) (24,473 stars) introduces temporal context graphs where every fact carries a validity window. Entities, relationships, and episodes are distinct objects. When a fact changes, the old edge gets invalidated rather than overwritten, preserving full history. Hybrid retrieval combines semantic embeddings, BM25 keyword search, and graph traversal. Query latency sits below one second for most operations, unlike GraphRAG which requires LLM summarization and can take tens of seconds ([Source](../raw/repos/getzep-graphiti.md)). Enterprise agents that cannot answer "what was our pricing policy last quarter?" are broken for compliance and audit workflows.

[Zep](projects/zep.md) builds on Graphiti for production deployments. Their paper reports 94.8% on Deep Memory Retrieval versus 93.4% for MemGPT, with 18.5% accuracy improvement on LongMemEval tasks requiring cross-session temporal reasoning, alongside 90% latency reduction versus baseline ([Source](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)). The latency reduction comes from hybrid retrieval replacing sequential LLM summarization. These numbers come from the Zep team's own paper, not independently peer-reviewed, though the benchmarks are public.

[Cognee](projects/cognee.md) (14,899 stars) approaches the same problem from a different angle: combining vector search with graph databases and continuous learning to maintain dynamically evolving contextual knowledge ([Source](../raw/repos/topoteretes-cognee.md)). Where Graphiti emphasizes temporal provenance, Cognee emphasizes the knowledge engine pattern with ingestion pipelines that structure unstructured data into graph relationships.

**Key tradeoff:** Temporal graphs require a graph database (Neo4j, FalkorDB, Kuzu, or Neptune for Graphiti) and meaningful LLM compute for entity extraction. The per-episode ingestion cost is non-trivial. You pay upfront for structure that pays off in retrieval quality and temporal reasoning. Graphs break when the entity extraction LLM makes errors: a single hallucinated relationship can propagate through the graph and surface in unrelated queries.

---

### 3. Skills and Procedural Memory

Skills have emerged as the canonical unit of procedural memory. Not "what happened" but "how to do things."

[Anthropic's Skills repo](projects/anthropic.md) (110,064 stars) formalizes SKILL.md: YAML-frontmattered markdown files that Claude loads dynamically. The spec enables progressive context loading, so agents discover and load relevant skills on demand rather than loading everything at startup. A survey of the community ecosystem found 26.1% of contributed skills contain vulnerabilities, making trust and governance a live problem ([Source](../raw/papers/xu-agent-skills-for-large-language-models-architectu.md)).

[Acontext](projects/acontext.md) (3,264 stars) treats skills as the memory format itself. After each task, a distillation pipeline extracts what worked, routes insights to the right skill file, and updates it. The agent recalls by calling `get_skill` and `get_skill_file`. No semantic search, just tool calls and reasoning. Skills are markdown files, portable across frameworks with no re-embedding ([Source](../raw/repos/memodb-io-acontext.md)).

[ACE (Agentic Context Engine)](projects/agentic-context-engine.md) (2,112 stars) uses a "Skillbook" updated after each run by a Reflector role that writes and executes Python to analyze execution traces. On the Tau2 airline benchmark, 15 learned strategies doubled pass^4 (probability all four independent attempts succeed) with no reward signals. Token costs for browser automation dropped 49% over a 10-run learning curve ([Source](../raw/repos/kayba-ai-agentic-context-engine.md)). Self-reported results on public benchmarks.

[Voyager](projects/voyager.md) pioneered this pattern in Minecraft: an ever-growing skill library of executable code for storing and retrieving complex behaviors. Skills are temporally extended, interpretable, and compositional; each new skill builds on prior discoveries. Result: 3.3x more unique items, 15.3x faster milestone completion than prior SOTA ([Source](../raw/papers/wang-voyager-an-open-ended-embodied-agent-with-large-l.md)). The skill library is memory, and it compounds.

[Memento-Skills](projects/memento-skills.md) (916 stars) implements a read-write reflection loop: after execution, if the agent fails, it optimizes the skill folder; if it succeeds, it increments the skill's utility score. Deployment-time learning. Model weights stay frozen, capabilities accumulate in an external registry ([Source](../raw/repos/memento-teams-memento-skills.md)).

**Key tradeoff:** Wins when task domains are repetitive and patterns recur. Loses when tasks are one-offs or variable. Skill libraries grow stale and bloated. As task distributions shift, old skills become harmful: the agent retrieves a skill optimized for last quarter's API and follows instructions that now cause errors. No major system has solved automatic skill deprecation.

---

### 4. Zettelkasten-Inspired and Interconnected Systems

[A-MEM](projects/a-mem.md) applies the Zettelkasten method to agent memory. When a new memory is added, the system generates structured attributes (contextual descriptions, keywords, tags), analyzes historical memories for connections, and establishes links where meaningful similarities exist ([Source](../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)). New information reshapes the semantic landscape of old knowledge. This is write amplification by design.

[HippoRAG](projects/hipporag.md) (3,332 stars) takes inspiration from hippocampal indexing theory. HippoRAG 2 uses knowledge graphs with personalized PageRank to enable multi-hop associativity and sense-making, mimicking how human memory consolidation works ([Source](../raw/repos/osu-nlp-group-hipporag.md)). The system builds persistent, interconnected knowledge representations that improve over time without fine-tuning.

[Hipocampus](projects/hipocampus.md) (145 stars) solves a specific and underappreciated problem: the "unknown unknowns" of agent memory. It implements a three-tier hierarchy: a ~3K token ROOT.md injected every session as a topic index, a warm layer of daily logs and knowledge files read on demand, and a cold layer accessed through BM25 plus a compaction tree. ROOT.md carries entries like `legal [reference, 14d]: Civil Act S750 -> knowledge/legal-750.md`, giving the agent O(1) lookup to know what it knows without a search query. On the MemAware benchmark (cross-domain implicit context recall), this scores 21% overall versus 0.8% for no memory and 3.4% for vector search alone ([Source](../raw/repos/kevin-hs-sohn-hipocampus.md)). Self-reported benchmark, but the evaluation suite is described as reproducible.

Karpathy's KB-as-memory pattern aligns with this category: a markdown wiki where LLMs compile raw sources into interconnected articles with backlinks, index files, and health-check linting loops ([Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)). The wiki is the memory, and queries enhance it, creating a feedback loop where the act of remembering strengthens the memory system.

**Key tradeoff:** Interconnected systems are expensive to maintain. Every new memory can update many existing memories. Powerful for knowledge-dense domains but creates write amplification that scales poorly with memory volume.

---

### 5. RL-Optimized Memory

Instead of hand-engineering memory policies, let the agent learn what to remember and forget.

[Mem-Alpha](projects/mem-alpha.md) (193 stars) trains a 4B parameter model via GRPO reinforcement learning to make allocation decisions (episodic, semantic, or core memory) based on task feedback. The model trained on 30K token sequences generalizes to 400K+ token contexts at test time, 13x the training length. This beats fixed-policy memory management on MemoryAgentBench ([Source](../raw/repos/wangyu-ustc-mem-alpha.md)). Results from the research team's own evaluation.

[SIA-MemAgent](projects/sia-memagent.md) (975 stars) from ByteDance/Tsinghua achieves near-lossless extrapolation to 3.5M tokens, 3.5x the typical context window, by treating long-context processing as a multi-turn workflow rather than a static architecture change ([Source](../raw/repos/bytedtsinghua-sia-memagent.md)). RL with verifiable rewards trains memory-augmented reasoning without retraining base model weights.

[MemEvolve](projects/memevolve.md) (201 stars) is the most radical: agents evolve the memory architecture itself through meta-evolution, dynamically adapting storage and retrieval interfaces rather than operating within a fixed schema ([Source](../raw/repos/bingreeky-memevolve.md)). Memory systems all the way down.

[MemoryBank](projects/memorybank.md) (419 stars) bridges RL and cognitive science with Ebbinghaus-inspired forgetting curves: selective reinforcement and decay of memories based on significance and recency ([Source](../raw/repos/zhongwanjun-memorybank-siliconfriend.md)). One of the few systems that treats forgetting as a feature.

The Darwin Godel Machine pushes further: agents that modify their own code, validate changes against benchmarks, and maintain an archive of diverse candidate agents. SWE-bench performance moved from 20% to 50% through self-modification ([Source](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)). Peer-reviewed research (ICLR workshop), not a production system.

**Key tradeoff:** RL-optimized memory requires training infrastructure and reward design. You trade engineering complexity at the memory layer for training complexity at the optimization layer. Systems adapt to their workload, but the upfront cost is substantial. Reward hacking is the primary risk: GOAL.md's dual-score system (separate scores for "did the metric improve" and "can we trust the measurement instrument") exists because agents find creative ways to make numbers go up that violate the intent ([Source](../raw/repos/jmilinovich-goal-md.md)).

---

### 6. Multi-Agent Shared Memory

[CORAL](projects/coral.md) (120 stars) puts shared state in `.coral/public/`: `attempts/`, `notes/`, and `skills/` directories symlinked into every agent's git worktree. Agents see each other's work in real time with zero synchronization overhead. The manager watches for new attempts and can interrupt agents with heartbeat prompts ([Source](../raw/repos/human-agent-society-coral.md)).

The validation gate problem is separate: a multi-agent system where agents review each other's output needs a supervisor with no context about how the work was produced. A blind review gate, where a model scores articles before they enter a permanent knowledge base without knowing which agent produced them, prevents the swarm from converging on shared hallucinations ([Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)).

## The Convergence

Three patterns are converging across all categories:

**Memory writes require a dedicated extraction step, not storage.** Raw conversation turns are not memory. Every production system runs an LLM extraction pass before writing to the store: Mem0, Zep, ACE, Acontext. The extraction model decides what matters. The quality of this decision determines memory quality more than retrieval architecture.

**Temporal validity is now a first-class property.** Graphiti's validity windows, Hipocampus's `[reference, 14d]` age markers, Acontext's staleness detection, MemoryBank's Ebbinghaus-inspired decay curves, A-MEM's memory evolution. Memory systems that cannot answer "what was true when?" are insufficient for production agents. Treating memory as a static append-only store was the dominant assumption a year ago.

**Selective retrieval beats full-context injection.** Mem0's 90% token reduction, Zep's 90% latency reduction, the Elasticsearch article's emphasis on context pollution all confirm: pumping everything into the context window degrades reasoning quality. The 1M-token context window is not a substitute for intelligent retrieval. Skills are the right unit for procedural memory, not few-shot examples. SKILL.md files, Skillbooks, and skill registries have replaced few-shot prompting because they are composable, versionable, and discoverable by the agent itself.

## What the Field Got Wrong

The assumption: more retrieval sophistication solves memory quality.

The evidence against it: Napkin achieves 83% on LongMemEval M with BM25 on markdown, beating systems with vector search and graph retrieval. Hipocampus scores 21% on cross-domain implicit recall versus 3.4% for vector search, and the mechanism is the ROOT.md topic index that makes relevant context discoverable without querying. Karpathy's personal wiki pattern (raw/ to LLM-compiled wiki to self-healing linter loop) routes most queries through index files, not vector similarity (Source).

Retrieval sophistication matters at scale. But the dominant failure mode is not retrieval precision; it is not knowing that relevant context exists. Search presupposes you suspect something is there to find. Topic indexes, compaction trees, and MOC hierarchies solve the "unknown unknown" problem that vector search cannot address.

The two-layer model has replaced the retrieval-first approach. A lightweight always-loaded index tells the agent what it knows. A retrieval layer fetches details on demand. Index design is now the primary design decision, not retrieval algorithm.

## Failure Modes

**Stale memory poisoning.** A fact written during session 1 resurfaces in session 200 after the underlying reality changed. Graphiti invalidates superseded facts through temporal edges; Mem0 and Letta do not. Blast radius: confident wrong answers on any query that touches the stale fact.

**Extraction hallucination compounding.** The LLM that extracts memories from conversations can hallucinate connections. In a flat vector store, one hallucinated fact affects queries that retrieve it. In a knowledge graph, that hallucination gets edges connected to it, and downstream queries traverse the corrupted subgraph. The multi-agent wiki pattern addresses this with a blind review gate; most single-agent memory systems do not ([Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)).

**Skill library bloat and drift.** Procedural memory systems accumulate skills that were correct when written but become wrong as APIs, codebases, or task distributions change. ACE's SkillManager prunes and refines strategies; Acontext relies on distillation after each run; most systems have no deprecation mechanism at all. An agent retrieving a skill optimized for a deprecated API will follow it confidently.

**Rate limit cascades in graph ingestion.** Graphiti's ingestion pipeline runs high-concurrency LLM calls to extract entities and relationships. The `SEMAPHORE_LIMIT` environment variable defaults to 10 concurrent operations to avoid 429 errors. Unconstrained ingestion at document scale hits provider limits and causes partial graph construction. The graph looks complete but has missing edges from failed extraction calls ([Source](../raw/repos/getzep-graphiti.md)).

**Reward hacking in self-improving loops.** Agents optimizing a metric will find ways to improve the measurement without improving the underlying quality. GOAL.md's dual-score architecture (metric score separate from instrument score) and Autoresearch's read-only eval file both exist to prevent this. Systems without this constraint, where the agent can modify both the code and the evaluation script, will discover the shortest path to a better score that violates intent ([Source](../raw/repos/jmilinovich-goal-md.md)).

**Write amplification in interconnected systems.** Zettelkasten-style memory where new facts update old memories creates O(n) writes per insertion in the worst case. A-MEM and HippoRAG trade retrieval quality for write cost. At high memory volume, this becomes a latency bottleneck on the ingestion path.

## Selection Guide

- **Persistent user preferences, minimal infrastructure**: [Mem0](projects/mem0.md) (51,880 stars). Managed platform or self-hosted Apache 2.0. Multi-level user/session/agent scoping covers most chatbot and assistant use cases.

- **Temporal reasoning over changing knowledge**: [Graphiti](projects/graphiti.md) (24,473 stars). The only production-ready validity window mechanism for "what was true when." Requires Neo4j, FalkorDB, or Kuzu. Skip if your knowledge is append-only.

- **Stateful agents without a vector database**: [Letta](projects/letta.md) (21,873 stars). `memory_blocks` give always-available core memory without a retrieval step. You pay context tokens on every call.

- **Enterprise temporal graphs with SLAs**: [Zep](projects/zep.md) (managed Graphiti). Sub-200ms retrieval at scale, production support. More expensive than self-hosting.

- **Discovering past context the agent did not know to search for**: [Hipocampus](projects/hipocampus.md) (145 stars). The ROOT.md topic index solves unknown-unknown recall. Early-stage, not production-hardened.

- **Plain-file memory, no embedding infrastructure**: [Napkin](projects/napkin.md) (264 stars). BM25 on markdown matches or beats vector RAG on public benchmarks. Works at small-to-medium scale (hundreds of files); untested at tens of thousands.

- **Agents that learn procedural skills from execution traces**: [ACE](projects/agentic-context-engine.md) (2,112 stars) for Python/LangChain stacks. [Acontext](projects/acontext.md) (3,264 stars) for framework-agnostic skill files. ACE has benchmark results; Acontext has broader framework support.

- **Self-improving loop over a codebase with a measurable metric**: [autoresearch](projects/autoresearch.md) (3,142 stars) as a Claude Code skill, or adapt the GOAL.md pattern. Add a dual-score system if the agent controls both the optimization target and the evaluation script.

- **Multi-agent research or optimization workflows**: [CORAL](projects/coral.md) (120 stars) for shared knowledge between agents. Very early-stage.

- **RL-learned memory management**: [Mem-Alpha](projects/mem-alpha.md) (193 stars) for learned allocation policies. Requires training infrastructure. [MemoryBank](projects/memorybank.md) (419 stars) for cognitively-inspired decay without RL training.

- Avoid building your own memory layer from scratch if your use case fits Mem0 or Letta. Both have solved multi-backend storage, extraction, and session management.

## The Divergence

**RL-learned forgetting vs explicit curation.** Mem-Alpha and SIA-MemAgent want the agent to learn what to forget through reward signals. MemoryBank uses cognitively-inspired decay curves. Graphiti invalidates facts when contradictions are detected. These are different bets about whether memory management should be learned or engineered. The RL camp is probably right long-term, but the engineered camp ships today.

**Graph-based vs flat vector storage.** Graphiti and Cognee require graph databases and pay the complexity tax for relationship-aware retrieval. Mem0 uses vector stores and optimizes for operational simplicity. The graph camp claims relational structure is essential for multi-hop reasoning. The vector camp claims embeddings capture relationships and scale better. The answer depends on whether your agent needs to reason about relationships between entities or recall relevant facts.

**Recall-first vs behavior-first systems.** Mem0, Letta, and Graphiti are about retrieving the right persistent state. Memento, Voyager, and Reflexion treat memory as something that should alter policy and improve later decisions. Use recall-first when personalization or factual continuity is the goal; use behavior-first when the agent must compound experience.

**Memory as infrastructure vs memory as learned behavior.** MemEvolve represents the extreme position: even the memory architecture should be learned. The mainstream position (Mem0, Letta, Graphiti) treats memory as infrastructure you configure. The resolution may be RL-learned policies operating within engineered infrastructure: learned what to remember, engineered where to store it.

## What's Hot Now

The autoresearch pattern is the clearest momentum signal. Karpathy's February 2026 post generated 3.5M views and 19K likes ([Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)). The follow-up repo post reached 10.9M views and 28K likes ([Source](../raw/tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md)). Within weeks: autoresearch Claude skill hit 3,142 stars, CORAL shipped as multi-agent autoresearch infrastructure (120 stars in days), and GOAL.md (112 stars) generalized the pattern to domains without natural metrics.

MCP-native memory is the emerging distribution pattern. Both Graphiti and SimpleMem (3,156 stars) ship MCP servers, and Hipocampus works as a drop-in memory harness for Claude Code and OpenClaw. Memory as an MCP tool, rather than a library import, decouples memory management from the agent framework and makes memory portable across MCP clients.

The Claude Code plugin ecosystem is growing fast. Anthropic's skills repo (110,064 stars) is the anchor. Ars Contexta (2,928 stars) generates personalized knowledge system architectures from conversation. Hipocampus (145 stars) installs as a Claude Code plugin with one command. The plugin marketplace as a distribution channel for memory tools is a structural shift from the last 60 days.

RL-trained memory agents signal a shift from memory-as-retrieval to memory-as-skill. The mem-agent work from Dria/Hugging Face trains a 4B model for memory management using GSPO, scoring 75% on md-memory-bench, second only to Qwen3-235B ([Source](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)). The agent does not just store and fetch; it learns when to update, when to retrieve, and when to ask for clarification.

## Open Questions

**How do you deprecate a skill?** Every system writes skills but none has a principled answer for when to delete or deactivate them. As task distributions shift, stale skills become liabilities. The most important unsolved operational problem in production skill systems.

**What is the right granularity for memory extraction?** Mem0 extracts at the message level; Acontext extracts at the task level; GOAL.md accumulates iteration-level results in a TSV. No consensus on whether finer-grained extraction produces better recall or more noise.

**Can self-improving agents work safely outside of sandboxes?** The Darwin Godel Machine and self-improving coding agent both require careful sandboxing. Karpathy notes the "final boss battle" is doing this at frontier lab scale with proper isolation. The autoresearch community is running against this limit: agents can optimize anything measurable, but production code changes require human checkpoints that slow the loop.

**Does memory architecture matter as much as memory hygiene?** Napkin's benchmark results suggest clean, well-organized plain files can match sophisticated retrieval systems. If that holds at scale, the field may be over-investing in retrieval infrastructure and under-investing in extraction quality and file organization.

**How do you evaluate agent memory?** LOCOMO, LongMemEval, and DMR measure different things. There is no ImageNet of agent memory. The field is optimizing for benchmarks that may not correlate with production utility.

**Can RL-learned memory policies generalize across domains?** Mem-Alpha and SIA-MemAgent show promising results on specific benchmarks, but no one has shown a memory policy trained on coding tasks transfers to customer support or research synthesis.

**Who owns the memory when agents collaborate?** CORAL agents share a public knowledge store, but there is no conflict resolution mechanism when two agents write contradictory facts. Graphiti handles single-source temporal conflicts; multi-source conflicts across agents remain unsolved.

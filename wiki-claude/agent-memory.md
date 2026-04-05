# The State of Agent Memory

> Agent memory has graduated from "append chat history to prompt" to a genuine engineering discipline. The field is converging on hybrid architectures that combine episodic logs, semantic knowledge, and structured graphs—but the real frontier is memory systems that evolve their own organization, where new information doesn't just get stored but actively reshapes the structure of what's already there.

## Approach Categories

### Multi-Level Memory Layers

The dominant production pattern is a dedicated memory service that abstracts storage across user, session, and agent levels.

[Mem0](../raw/repos/mem0ai-mem0.md) (51,880 stars) is the market leader, providing a universal memory layer with advanced augmentation—attributes, events, facts, relationships, and skills extracted from conversations. Benchmarks show +26% accuracy over OpenAI Memory, 91% faster responses, and 90% fewer tokens on the LOCOMO benchmark. The key insight: multi-level abstraction (user/session/agent) decoupled from LLM choice lets you implement persistent adaptive memory without rebuilding for each model.

[Letta](../raw/repos/letta-ai-letta.md) (21,873 stars, formerly MemGPT) takes a different architectural approach with labeled memory_blocks that the agent can read and write directly. Rather than an external memory service, Letta makes memory a first-class part of the agent's action space—the agent decides what to remember, update, or forget through tool calls. This self-managed memory outperforms stateless systems on long-horizon tasks requiring adaptation.

[Memori](../raw/repos/memorilabs-memori.md) (13,011 stars) goes SQL-native, extracting structured facts from agent execution (not just conversational text) and storing them at entity/process/session levels. On LoCoMo, Memori achieves 81.95% accuracy using only 4.97% of full-context tokens—a 20x cost reduction vs. full-context approaches while outperforming both Zep and Mem0 on that benchmark.

The convergence across all three: memory extraction should be structured and typed, not just "save this text." The divergence: whether memory management lives inside the agent (Letta) or outside it (Mem0, Memori).

### Temporal Knowledge Graphs

Static memory snapshots fail when agents need to reason about change over time. Temporal knowledge graphs solve this.

[Graphiti](../raw/repos/getzep-graphiti.md) (24,473 stars) is the production leader, building real-time knowledge graphs with explicit validity windows and episode provenance. Every fact knows when it became true, when it stopped being true, and which conversation established it. The accompanying [Zep paper](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md) shows up to 18.5% accuracy improvements and 90% response latency reduction over MemGPT on the Deep Memory Retrieval benchmark.

What makes temporal graphs essential: standard RAG returns static snapshots, but agent memory must track what was true *when* and *why facts changed*. An agent helping with project management needs to know not just "the deadline is March 15" but "the deadline was moved from March 1 to March 15 on February 20 because of the vendor delay." Graphiti supports hybrid retrieval (semantic + keyword + graph traversal) and multiple graph backends (Neo4j, FalkorDB, Kuzu, Amazon Neptune).

[Cognee](../raw/repos/topoteretes-cognee.md) (14,899 stars) combines vector search with graph databases and continuous learning, offering a unified Python SDK where the knowledge graph adapts as data changes. Where Graphiti focuses on temporal validity, Cognee focuses on dynamic relationship evolution.

### Episodic-Semantic Hybrid Architectures

The field is converging on the insight that agents need both episodic memory (what happened) and semantic memory (what it means), drawn from cognitive science.

[Fabricio Q's analysis](../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md) lays out the architectural case: episodic memory provides chronological event logs (cheap writes, deterministic retrieval, perfect for auditability), while semantic memory provides conceptual associative knowledge (expensive writes, powerful similarity-based retrieval). The hybrid pattern writes to both, merges results with reranking, and enforces token budgets.

[Elasticsearch Labs](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md) adds a third type—procedural memory (how agents operate)—and demonstrates context-based memory isolation where different memory sets are filtered based on identity and role. The Severance-inspired architecture shows how agents can have completely separate memory contexts depending on who's asking.

Several implementations push this further:

- [MIRIX](../raw/repos/mirix-ai-mirix.md) (3,508 stars) implements six specialized memory components (Core, Episodic, Semantic, Procedural, Resource, Knowledge Vault) managed by dedicated agents, with screen-capture grounding for real-world context.
- [Nemori](../raw/repos/nemori-ai-nemori.md) aligns memory segmentation with human episodic boundaries using Event Segmentation Theory, achieving competitive performance by segmenting conversations into topic-consistent episodes rather than arbitrary time windows.
- [MemoryBank](../raw/repos/zhongwanjun-memorybank-siliconfriend.md) implements Ebbinghaus forgetting curves—selective reinforcement and decay based on significance and recency—to prevent unbounded context growth while maintaining coherent personality.

### Self-Organizing and Evolving Memory

The most ambitious approaches don't just store memories—they evolve the memory architecture itself.

[A-MEM](../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md) introduces Zettelkasten-inspired dynamic organization where new memories actively trigger updates to existing knowledge. When new information arrives, the system generates structured notes (descriptions, keywords, tags) and analyzes historical memories to identify meaningful connections. Crucially, new memories can update existing memory representations, enabling continuous refinement.

[MemEvolve](../raw/repos/bingreeky-memevolve.md) takes this to a meta level: dual-evolution that jointly evolves both memory content and the memory architecture's interfaces. Rather than being constrained by fixed schemas, agents dynamically adapt their storage and retrieval mechanisms. This is genuinely novel—most systems assume the memory schema is static and only the content changes.

[Mem-alpha](../raw/repos/wangyu-ustc-mem-alpha.md) uses reinforcement learning to learn optimal memory construction strategies. Agents dynamically decide when to encode information into episodic, semantic, or core memory based on task feedback, rather than following fixed rules. The implication: memory architecture should be learned, not designed.

### Hierarchical Context Management

For long-running agents, the fundamental problem is maintaining useful context within finite token budgets.

[Hipocampus](../raw/repos/kevin-hs-sohn-hipocampus.md) introduces a compaction tree with a 3-tier hierarchy: hot memory (ROOT.md topic index, scratchpad, working context), warm memory (daily logs, knowledge base), and cold memory (search + compaction tree). The key innovation is ROOT.md—a 3K-token topic index auto-loaded into every session that makes implicit context discoverable without search queries. Benchmarks show 21x better recall on cross-domain questions vs. vector search alone.

[Lossless Context Management](../raw/repos/martian-engineering-lossless-claw.md) (3,963 stars) replaces sliding-window compaction with DAG-based hierarchical summarization. Every message is persisted in SQLite and organized into a directed acyclic graph where older messages are progressively summarized without information loss. Agents can search, describe, and expand compacted history—true lossless recall over arbitrary conversation lengths.

[MemAgent](../raw/repos/bytedtsinghua-sia-memagent.md) demonstrates near-lossless extrapolation to 3.5M tokens by treating long-context processing as a multi-turn workflow rather than a model architecture problem. Using RL with verifiable rewards, the system optimizes multi-turn agent workflows for extreme context lengths with <5.5% performance degradation.

[General Agentic Memory](../raw/repos/vectorspacelab-general-agentic-memory.md) and [OpenViking](../raw/repos/volcengine-openviking.md) (20,813 stars) both address hierarchical context through tiered loading—L0/L1/L2 levels that progressively disclose detail based on relevance, solving context fragmentation and token waste at scale.

### Lightweight and Markdown-Based Memory

Not every system needs a knowledge graph or vector database. A growing number of implementations prove that markdown files with good organization can be remarkably effective.

[claude-mem](../raw/repos/thedotmack-claude-mem.md) (44,950 stars) automatically captures session context, compresses it using Claude's API, and reinjects relevant context into future sessions via ChromaDB/SQLite. The progressive disclosure approach with layered retrieval (search, timeline, observations) solves lost project continuity without manual engineering.

[Claude Memory Engine](../raw/repos/helloruru-claude-memory-engine.md) implements an 8-step learning loop with correction pair recording—agents learn from mistakes by storing explicit mistake-fix pairs and running periodic reflection cycles. Zero dependencies, markdown-only storage.

[napkin](../raw/repos/michaelliv-napkin.md) proves that BM25 search on well-organized markdown achieves 91% accuracy on LongMemEval without embeddings, preprocessing, or graphs—outperforming systems with far more infrastructure.

[724-office](../raw/repos/wangziqi06-724-office.md) demonstrates a three-layer memory approach (session + LLM-compressed facts + vector retrieval) in 3,500 lines of pure Python, with runtime tool creation enabling agents to evolve their own capabilities dynamically.

## The Convergence

**Hybrid episodic + semantic is becoming table stakes.** Nearly every serious implementation combines event logs with conceptual knowledge. The only debate is the ratio and the integration pattern. [Reflexion](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md) proved that linguistic feedback stored in episodic memory enables self-improvement without weight updates—91% on HumanEval vs. GPT-4's 80%. This insight now permeates the entire field.

**Memory extraction is replacing memory storage.** The shift from "store the conversation" to "extract structured facts from the conversation" is visible in Mem0, Memori, and Supermemory. Raw transcripts are cheap to store but expensive to retrieve from. Structured facts are expensive to extract but cheap to query.

**Temporal awareness is the new baseline.** Static memory snapshots are being replaced by temporally-aware systems that track validity windows, episode provenance, and fact evolution. Graphiti and Supermemory demonstrate that knowing *when* something was true is as important as knowing *what* is true.

## The Divergence

**Agent-managed vs. externally-managed memory.** Letta gives agents direct read/write access to their own memory blocks. Mem0 manages memory externally. The tradeoff: agent-managed memory is more flexible but harder to audit and more prone to drift; external management is more controllable but less adaptive.

**RL-learned vs. hand-designed memory schemas.** Mem-alpha and MemEvolve suggest memory architecture should be learned through reinforcement. Most production systems use hand-designed schemas. The learned approach has stronger theoretical grounding but less production validation.

**Heavy infrastructure vs. markdown simplicity.** Graphiti requires Neo4j. Mem0 requires vector stores. napkin and claude-mem prove that markdown + BM25 can compete on benchmarks. The right infrastructure level depends on scale, query complexity, and operational overhead tolerance.

## What's Hot Now

[Mem0](../raw/repos/mem0ai-mem0.md) at 51,880 stars is the most adopted memory framework. [claude-mem](../raw/repos/thedotmack-claude-mem.md) at 44,950 stars is the most popular Claude-specific memory solution. [Graphiti](../raw/repos/getzep-graphiti.md) at 24,473 stars leads the temporal graph category. [Supermemory](../raw/repos/supermemoryai-supermemory.md) (20,994 stars) ranks #1 on three major benchmarks.

The [mem-agent paper](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md) from Hugging Face demonstrates RL-trained memory management using markdown files and Python tools—a 4B model scoring 75% on their md-memory-bench, second only to Qwen3-235B. This points toward memory management becoming a trainable skill rather than a hand-coded scaffold.

[Agent Workflow Memory](../raw/repos/zorazrw-agent-workflow-memory.md) achieves SOTA on WebArena (35.6%) by abstracting task-specific details into generalizable workflow patterns—proving that the right memory abstraction level matters as much as the memory technology.

## Where It's Going

**Memory will become a learned capability.** MemAgent's RL-optimized memory, Mem-alpha's learned memory strategies, and mem-agent's GSPO-trained memory management all point toward the same future: memory architecture as a skill that agents learn through experience rather than a system that engineers design.

**Cross-agent memory sharing will become standard.** [Open Brain](../raw/repos/natebjones-projects-ob1.md) and [SimpleMem's](../raw/repos/aiming-lab-simplemem.md) MCP integration demonstrate the need for memory that spans multiple agents and tools. The MCP protocol is becoming the standard memory interop layer.

**Memory consolidation will mirror human cognition more closely.** Nemori's event segmentation, MemoryBank's forgetting curves, and HippoRAG's memory consolidation all draw from cognitive science. As memory systems mature, they'll increasingly implement sleep-like consolidation phases where episodic memories are distilled into semantic knowledge.

## Open Questions

- How do you evaluate memory quality beyond benchmark accuracy? Staleness, contradiction rates, and retrieval precision lack standardized metrics.
- What's the right memory capacity bound? Unbounded memory grows stale; aggressive pruning loses context. No system has solved the optimal forgetting policy.
- Can memory systems handle adversarial inputs—users deliberately injecting false memories to manipulate agent behavior?
- How do you merge memories across agents working on the same project without conflicts or duplication?
- At what scale do graph-based approaches become cost-prohibitive, and can hybrid architectures maintain their advantage at enterprise scale?

## Sources

**Papers**
- [Zep/Graphiti — Temporal Knowledge Graph](../raw/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md)
- [A-MEM — Agentic Memory](../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)
- [Reflexion — Verbal Reinforcement](../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md)

**Articles**
- [Fabricio Q — Episodic vs Semantic Memory](../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md)
- [Elasticsearch Labs — Memory Management](../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md)
- [Hugging Face — mem-agent](../raw/articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md)

**Repos**
- [Mem0](../raw/repos/mem0ai-mem0.md) — [Letta](../raw/repos/letta-ai-letta.md) — [Graphiti](../raw/repos/getzep-graphiti.md)
- [Memori](../raw/repos/memorilabs-memori.md) — [Cognee](../raw/repos/topoteretes-cognee.md) — [Supermemory](../raw/repos/supermemoryai-supermemory.md)
- [MIRIX](../raw/repos/mirix-ai-mirix.md) — [Nemori](../raw/repos/nemori-ai-nemori.md) — [MemoryBank](../raw/repos/zhongwanjun-memorybank-siliconfriend.md)
- [Hipocampus](../raw/repos/kevin-hs-sohn-hipocampus.md) — [Lossless Claw](../raw/repos/martian-engineering-lossless-claw.md) — [MemAgent](../raw/repos/bytedtsinghua-sia-memagent.md)
- [MemEvolve](../raw/repos/bingreeky-memevolve.md) — [Mem-alpha](../raw/repos/wangyu-ustc-mem-alpha.md)
- [claude-mem](../raw/repos/thedotmack-claude-mem.md) — [Claude Memory Engine](../raw/repos/helloruru-claude-memory-engine.md)
- [napkin](../raw/repos/michaelliv-napkin.md) — [724-office](../raw/repos/wangziqi06-724-office.md)
- [SimpleMem](../raw/repos/aiming-lab-simplemem.md) — [Open Brain](../raw/repos/natebjones-projects-ob1.md)
- [OpenViking](../raw/repos/volcengine-openviking.md) — [General Agentic Memory](../raw/repos/vectorspacelab-general-agentic-memory.md)
- [Agent Workflow Memory](../raw/repos/zorazrw-agent-workflow-memory.md)

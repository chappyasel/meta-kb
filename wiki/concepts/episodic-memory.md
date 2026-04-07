---
entity_id: episodic-memory
type: concept
bucket: agent-memory
abstract: >-
  Episodic memory stores specific past experiences so agents can recall prior
  events rather than treating every interaction as stateless. Distinguished from
  semantic memory by its event-bound, temporally-anchored structure.
sources:
  - repos/wangyu-ustc-mem-alpha.md
  - repos/gustycube-membrane.md
  - repos/mirix-ai-mirix.md
  - repos/caviraoss-openmemory.md
  - repos/uditgoenka-autoresearch.md
  - repos/nemori-ai-nemori.md
  - repos/letta-ai-lettabot.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/kevin-hs-sohn-hipocampus.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/caviraoss-openmemory.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - semantic-memory
  - rag
  - vector-database
  - procedural-memory
  - bm25
  - mem0
  - letta
  - langgraph
  - agent-memory
  - core-memory
  - claude-code
  - openclaw
  - openai
  - mcp
  - langchain
  - reflexion
  - postgresql
  - gpt-4
  - hotpotqa
  - claude-md
  - hybrid-search
  - context-window
  - embedding-model
  - gemini
  - catastrophic-forgetting
  - memory-evolution
  - noahs-shinn
  - emotional-memory
last_compiled: '2026-04-07T11:37:10.368Z'
---
# Episodic Memory

## What It Is

Episodic memory stores specific past experiences as discrete, timestamped events. An agent with episodic memory can recall "last Tuesday the user told me their API key expired" rather than only knowing "the user has an API key." The term comes from Endel Tulving's 1972 distinction between memory for facts (semantic) and memory for experiences (episodic): knowing *that* Paris is the capital of France versus remembering *when* you first learned that.

In AI systems, episodic memory typically stores conversation turns, task attempts, tool call sequences, or any bounded interaction unit that benefits from later recall. The defining characteristics:

- **Event-bound:** Each entry corresponds to a specific occurrence, not a generalized rule
- **Temporally anchored:** Entries carry timestamps or sequence positions
- **Retrievable:** Stored in a form the agent can query during later tasks

This distinguishes episodic from [Semantic Memory](../concepts/semantic-memory.md) (general facts about the world), [Procedural Memory](../concepts/procedural-memory.md) (how to perform tasks), and [Core Memory](../concepts/core-memory.md) (always-in-context identity/persona information). These four types together constitute an [Agent Memory](../concepts/agent-memory.md) architecture.

## Why It Matters

Without episodic memory, agents face two structural problems. First, every new conversation starts from zero: users must re-explain their preferences, past decisions, and project context. Second, agents cannot learn from their own failures across sessions. [Reflexion](../concepts/reflexion.md) demonstrated the second problem directly: agents that could only retry on failure without recalling *why* they failed showed zero improvement across trials, while agents with episodic self-reflection summaries achieved 75% accuracy on HotPotQA versus 63% with plain retry. The 12-percentage-point gap between episodic memory and self-reflection confirms that recall quality matters more than retention alone. ([Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md))

For multi-session agents, episodic memory is the primary mechanism preventing [Catastrophic Forgetting](../concepts/catastrophic-forgetting.md): the tendency of neural networks and stateless agents to overwrite prior context with new information. Unlike fine-tuning approaches, episodic memory stores experiences externally and retrieves them on demand, leaving model weights unchanged.

## How It Works

### Storage

Episodes are written to persistent storage as they occur. Common storage backends:

- **[Vector Database](../concepts/vector-database.md):** Each episode is embedded and stored with its timestamp and metadata. Retrieval is by semantic similarity. Tools: [ChromaDB](../projects/chromadb.md), [Qdrant](../projects/qdrant.md), [FAISS](../projects/faiss.md), [Pinecone](../projects/pinecone.md).
- **[PostgreSQL](../projects/postgresql.md) / [SQLite](../projects/sqlite.md):** Relational tables storing episode text, timestamps, and foreign keys linking episodes to entities. Enables structured queries alongside semantic search.
- **Knowledge Graphs:** Episodes stored as nodes with temporal edges. [Graphiti](../projects/graphiti.md) models episodes as `EpisodicNode` objects in a three-tier graph (episode subgraph → semantic entity subgraph → community subgraph), with every extracted fact traceable back to its source episode for provenance. ([Source](../raw/deep/repos/getzep-graphiti.md))
- **Flat files:** [Letta](../projects/letta.md)'s MemGPT architecture and file-based systems like Hipocampus use markdown files as episodic logs, with compaction into hierarchical summaries. ([Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md))

### What Gets Stored

Systems differ significantly in episodic granularity:

- **Raw messages:** Full conversation turns verbatim. Maximum fidelity, high storage cost, no compression.
- **Extracted facts:** [Mem0](../projects/mem0.md) passes conversations through an LLM extraction prompt, producing short declarative statements ("User prefers Python over JavaScript"). Lower storage cost, lossy.
- **Structured triples:** Graphiti extracts entity-relationship-entity triples with temporal validity windows (`valid_at`, `invalid_at`). Each triple carries source episode provenance.
- **Compressed summaries:** Hipocampus's compaction tree collapses raw daily logs through daily → weekly → monthly → root levels, compressing months of episodes into a ~3K-token index. ([Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md))
- **RL-constructed memories:** [Mem-alpha](../raw/deep/repos/wangyu-ustc-mem-alpha.md) trains a 4B model with GRPO to decide autonomously what to write into episodic memory, treating memory construction as a learnable skill rather than a fixed heuristic.

### Retrieval

Episode retrieval is where implementations diverge most sharply. The retrieval problem for episodic memory has two components: knowing *what to search for* (the query), and knowing *whether retrieved episodes are relevant* (ranking).

**Query strategies:**

- Semantic similarity via [Embedding Model](../concepts/embedding-model.md) against stored episode vectors
- Lexical matching via [BM25](../concepts/bm25.md) on episode text
- [Hybrid Search](../concepts/hybrid-search.md) combining both, fused with [Reciprocal Rank Fusion](../concepts/reciprocal-rank-fusion.md)
- Graph traversal from known entities (breadth-first search across episode links)
- Structured queries against temporal fields (retrieve all episodes within a date range)

Graphiti runs all three search modes in parallel and supports five reranking strategies, including cross-encoder neural reranking for highest precision. ([Source](../raw/deep/repos/getzep-graphiti.md))

**The implicit recall problem:** Standard search assumes the agent knows what to look for. Hipocampus's MemAware benchmark revealed that vector search alone solves only 3.4% of implicit recall tasks (where the agent should surface relevant past context without a direct query). Hipocampus's compaction tree scored 17.3% with vector search enabled, and 21% with a larger token budget — a 6x improvement over search alone. The always-loaded ROOT.md index enables the agent to recognize relevant connections without needing a query. ([Source](../raw/deep/repos/kevin-hs-sohn-hipocampus.md))

### Integration with [Context Window](../concepts/context-window.md)

Retrieved episodes must enter the agent's context window to be useful. Three patterns:

1. **Direct injection:** Top-k retrieved episodes are appended to the system prompt or user message. Simple but consumes tokens proportional to episode count.
2. **Summarized injection:** Episodes are compressed before injection. Graphiti reduces 115K-token conversation contexts to ~1.6K tokens (under 2% of original), achieving 91% latency reduction with higher accuracy on LongMemEval. ([Source](../raw/deep/repos/getzep-graphiti.md))
3. **Tool-mediated access:** The agent calls a `search_memory()` tool when it decides retrieval is needed, rather than having episodes pushed into context automatically. [LangGraph](../projects/langgraph.md) and [Letta](../projects/letta.md) support this pattern. [CLAUDE.md](../concepts/claude-md.md) files use a variant where Claude Code reads from memory files on demand.

## Temporal Structure

Episodic memory's defining property is temporal grounding. Implementations handle this in three ways of increasing sophistication:

**Timestamp-only:** Each episode carries a creation timestamp. Retrieval can sort or filter by time. This enables "what happened recently" but not "what was believed to be true in January."

**Recency decay:** More recent episodes score higher in retrieval ranking. OpenMemory implements biologically-inspired dual-phase exponential decay with sector-specific rates: episodic memories decay at lambda=0.015 per day while semantic memories decay at lambda=0.005. ([Source](../raw/deep/repos/caviraoss-openmemory.md))

**Bi-temporal validity windows:** Each episode or extracted fact carries both *when it was stored* (transaction time) and *when it was true* (event time). Graphiti's `EntityEdge` carries four temporal fields: `expired_at` (when invalidated in the system), `valid_at` (when the fact became true in reality), `invalid_at` (when it stopped being true), and `reference_time`. This enables time-travel queries: "what did the agent believe about the user's employer as of March 2024?" Graphiti's bi-temporal model produced a 38.4% improvement on temporal-reasoning questions in LongMemEval. ([Source](../raw/deep/repos/getzep-graphiti.md))

## Relationship to Other Memory Types

Episodic and semantic memory form a gradient rather than a sharp boundary. An agent repeatedly observing "the user prefers brevity in responses" across 50 sessions may promote that episodic pattern into a semantic fact (or into core memory). [Mem0](../projects/mem0.md) performs this promotion automatically. Graphiti's community detection clusters related episodes into higher-level semantic summaries via label propagation.

[Procedural Memory](../concepts/procedural-memory.md) captures *how to do tasks* — workflow patterns the agent has learned. Some systems derive procedural memories from episodic sequences (e.g., "every time I try X before Y it fails; try Y first"). [Reflexion](../concepts/reflexion.md) generates exactly this type of derived procedure through self-reflection stored in episodic memory.

[Core Memory](../concepts/core-memory.md) in Letta/MemGPT is always-loaded persona and relationship information — the most frequently-accessed episodic summaries promoted to guaranteed context inclusion.

## Implementations

**[Reflexion](../concepts/reflexion.md):** Episodes stored as verbal self-reflection summaries from failed task attempts. A bounded buffer (1–3 entries) of analyzed failures enables agents to improve across trials. Noah Shinn et al. (2023) showed 91% pass@1 on HumanEval versus GPT-4's 80%. ([Source](../raw/deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md))

**[Graphiti](../projects/graphiti.md) / [Zep](../projects/zep.md):** Episodes stored as `EpisodicNode` objects with full provenance chains to extracted semantic entities. Bi-temporal model tracks when facts were true versus when the system learned them. LongMemEval benchmarks show +15–18% accuracy over full-context baselines with 89–91% latency reduction. ([Source](../raw/deep/repos/getzep-graphiti.md))

**[Mem0](../projects/mem0.md):** LLM-extraction pipeline converts episodes into short declarative facts, stored in a vector database with optional knowledge graph layer. Episodes are the raw material; extracted facts are the primary retrieval unit.

**[Letta](../projects/letta.md):** MemGPT architecture where the agent manages its own episodic memory through explicit `archival_memory_insert()` and `archival_memory_search()` function calls, maintaining a strict main context / archival memory distinction.

**[LangGraph](../projects/langgraph.md) / [LangChain](../projects/langchain.md):** Episodic memory as a tool in the agent's action space, retrieved via [RAG](../concepts/rag.md) pipelines. LangGraph's `MemorySaver` checkpointer preserves conversation state as a form of episodic memory.

**[Claude Code](../projects/claude-code.md) / [CLAUDE.md](../concepts/claude-md.md):** Project-level episodic memory stored in markdown files. The agent reads these files at session start, gaining access to prior decisions, context, and preferences accumulated across sessions.

**[OpenClaw](../projects/openclaw.md):** Hipocampus plugin system providing hierarchical episodic memory with 5-level compaction tree and always-loaded topic index.

**[Mem-alpha](../raw/deep/repos/wangyu-ustc-mem-alpha.md):** RL-trained 4B model (Qwen3-4B with GRPO) that learns autonomous episodic memory construction, trained on 30K-token contexts but generalizing to 400K+ tokens. Treats episode classification as a learnable skill.

**[Voyager](../projects/voyager.md):** Minecraft agent storing episodes as skill attempts with success/failure annotations, building procedural memory from episodic experience.

## Critical Limitations

**Retrieval without awareness of unknown unknowns.** Standard episodic retrieval assumes the agent can formulate a useful query. For implicit context — where relevant past episodes exist but the agent does not know to look for them — retrieval-only architectures fail systematically. The MemAware benchmark shows vector search alone achieves 3.4% on hard implicit recall tasks. Always-loaded indexes (Hipocampus's ROOT.md, core memory in Letta) partially address this but at fixed token cost.

**Contradiction accumulation.** Systems that append episodes without contradiction detection accumulate conflicting beliefs. If a user changes their preference or an API changes its interface, old episodic memories remain unless actively invalidated. Graphiti's edge invalidation pipeline is the most sophisticated response to this problem; most other systems leave stale episodes in place indefinitely.

**Compression is lossy by design.** Any system that summarizes episodes (Reflexion's self-reflections, Hipocampus's compaction, Mem0's extraction) loses information present in the original. Graphiti's architecture preserves raw episodes permanently and derives semantic entities from them, enabling both compressed retrieval and full-fidelity recall — but at higher storage cost.

**Unresolved infrastructure question:** None of the major frameworks have published cost-at-scale figures for real production episodic memory stores. A personal assistant agent operating daily for a year could accumulate tens of thousands of episodes. The retrieval, embedding, and LLM-extraction costs at that scale remain empirically uncharacterized in public literature.

## When NOT to Use Episodic Memory

Episodic memory adds latency and operational complexity. Skip it when:

- **The task is fully self-contained.** Single-turn question answering, code completion for small functions, or any task where prior context genuinely does not affect the correct output.
- **The [Context Window](../concepts/context-window.md) already holds all needed history.** For short-session agents where the full conversation fits in context, episodic retrieval adds a retrieval step without providing information the agent does not already have.
- **Retrieval quality is unverifiable.** If you cannot evaluate whether retrieved episodes are accurate and relevant (no evals, no ground truth), episodic memory may silently inject stale or irrelevant context that degrades rather than improves performance. Start with [Retrieval-Augmented Generation](../concepts/rag.md) evals before adding episodic complexity.
- **The task requires exploration over refinement.** [Reflexion](../concepts/reflexion.md)'s failure on WebShop demonstrates that episodic self-reflection does not help when the failure mode is creative exploration rather than error correction.

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md) — the broader framework within which episodic memory sits
- [Semantic Memory](../concepts/semantic-memory.md) — general facts derived from accumulated episodes
- [Core Memory](../concepts/core-memory.md) — always-in-context identity information, often promoted from episodic
- [Procedural Memory](../concepts/procedural-memory.md) — task execution patterns derived from episodic experience
- [Retrieval-Augmented Generation](../concepts/rag.md) — the retrieval mechanism enabling episodic memory access
- [Hybrid Search](../concepts/hybrid-search.md) — combining BM25 and semantic retrieval for episode lookup
- [Reflexion](../concepts/reflexion.md) — verbal self-reflection stored as episodic memory for agent improvement
- [Memory Evolution](../concepts/memory-evolution.md) — how episodic memories transform into higher-level knowledge over time
- [Catastrophic Forgetting](../concepts/catastrophic-forgetting.md) — the problem episodic memory primarily addresses

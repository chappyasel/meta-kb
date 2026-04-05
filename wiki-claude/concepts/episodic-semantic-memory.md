# Episodic vs Semantic Memory for Agents

> Two complementary paradigms for agent memory: episodic memory records chronological event logs (what happened and when), while semantic memory stores conceptual associative knowledge (what is generally true). Effective agent architectures combine both, writing to each simultaneously and merging results at query time under explicit token budgets.

## Why It Matters

Many agents fail not because of the model but because of poorly designed memory. Simply expanding the context window is not sustainable -- it hits walls of latency, cost, and attention degradation. The choice between episodic and semantic memory is an architectural decision that directly impacts auditability, generalization capability, retrieval cost, and production reliability.

Episodic memory gives you reproducible execution traces for debugging and compliance. Semantic memory gives you conceptual recall and synthesis for complex reasoning. Most production systems need both: a customer support agent must remember what was said in this conversation (episodic) while also knowing company policy (semantic). Choosing only one paradigm forces a tradeoff between auditability and intelligence that breaks most real-world deployments.

## How It Works

**Episodic Memory (The Ship's Log).** An append-only, time-stamped record of events. Every interaction, tool call, and observation is logged with a task ID and timestamp. Writes are cheap and fast. Retrieval is deterministic -- you fetch by time window, task ID, or session. This makes it ideal for auditability, debugging, and replay. Governance operations like redaction and TTL policies are straightforward because events have clear boundaries.

**Semantic Memory (The Knowledge Library).** Conceptual, associative knowledge stored as embeddings in a vector database. Information is converted to numerical representations for similarity-based retrieval. Writes are expensive (embedding computation) but retrieval is powerful -- you find information by conceptual similarity, not just keywords. This enables generalization, creative synthesis, and robust RAG.

**The Hybrid Recipe.** The most durable agents use both simultaneously:

1. **Write to both.** Every piece of information is logged episodically. Key insights are also embedded and stored semantically.
2. **Retrieve from both.** For immediate context, pull from the recent episodic log. For broader knowledge, query the semantic library.
3. **Merge and rank.** Combine results from both retrievals, re-rank for relevance, and trim to fit the context window's token budget.
4. **Resolve conflicts.** Prefer fresh episodic facts for recency; when they conflict with semantic policy, surface both with a resolution note.

Some architectures add a third type: **procedural memory** -- knowledge about how to do things. This lives in application code and prompts rather than in a database. Procedural memory determines when to store a memory, when to retrieve one, how to summarize conversations, and how to use tools. It controls how the other memory types are used, not what is stored.

A-MEM takes this further with a Zettelkasten-inspired approach where memories are not just stored but actively interconnected. When a new memory is added, the system generates structured attributes (descriptions, keywords, tags) and analyzes historical memories for relevant connections. New memories can trigger updates to existing memories, allowing the knowledge network to continuously refine itself.

## Who Implements It

- [Mem0](../projects/mem0.md) -- multi-level memory (user/session/agent) with 26% accuracy gain and 90% token reduction versus full-context; production-ready API abstracting episodic and semantic layers
- [Letta](../projects/letta.md) -- persistent `memory_blocks` abstraction enabling multi-faceted agent state that survives across conversations, with continual self-improvement
- [MIRIX](../../raw/repos/mirix-ai-mirix.md) -- six-agent memory architecture (Core, Episodic, Semantic, Procedural, Resource, Knowledge Vault) with screen-capture grounding and domain-specific memory routing
- [Nemori](../../raw/repos/nemori-ai-nemori.md) -- LLM-powered episodic boundary detection aligned with Event Segmentation Theory; predict-calibrate learning loops that distill semantic knowledge from episodic gaps
- [Reflexion](../../raw/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md) -- verbal reinforcement learning stored in episodic memory buffers, enabling self-improvement without weight updates

## Open Questions

- How should the merge-and-rank step handle the tension between episodic recency and semantic authority? Current approaches use heuristic priority rules, but an optimal strategy remains undefined.
- At what frequency should episodic memories be consolidated into semantic knowledge? Too aggressive and you lose detail; too conservative and the semantic store becomes stale.
- How do you prevent semantic memory from accumulating contradictions as the world changes? Supermemory handles this with automatic forgetting and contradiction resolution, but the general problem is unsolved.
- Can procedural memory itself be learned and improved, or must it remain hand-coded? Reflexion and A-MEM suggest it can evolve, but robustly and safely is another matter.

## Sources

- [Fabricio Q -- Memory in Agents](../../raw/articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md) -- "choose episodic for audits and steps; semantic for recall and synthesis; hybrid for durable systems"
- [Elasticsearch Labs -- AI Agent Memory](../../raw/articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md) -- "modern agents require multi-layered memory architectures (episodic, semantic, procedural) rather than simple chat history injection"
- [A-MEM paper (Xu et al.)](../../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md) -- "memories actively trigger updates to existing knowledge and form evolving interconnected networks"

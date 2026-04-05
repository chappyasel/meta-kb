---
entity_id: long-term-memory
type: concept
bucket: agent-memory
sources:
  - repos/aiming-lab-simplemem.md
  - repos/helloruru-claude-memory-engine.md
  - repos/memorilabs-memori.md
  - repos/osu-nlp-group-hipporag.md
  - repos/mem0ai-mem0.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
related:
  - Model Context Protocol
  - Retrieval-Augmented Generation
  - Episodic Memory
  - Semantic Memory
  - Agent Memory
  - Context Compression
  - State Management
  - Memory Consolidation
last_compiled: '2026-04-04T21:16:36.398Z'
---
# Long-Term Memory

**Type:** Concept | **Bucket:** Agent Memory

Memory systems in AI agents that persist information across sessions and over extended time horizons, enabling continuity, personalization, and learning without retraining.

---

## What It Is

Long-term memory in AI agents refers to infrastructure and techniques that allow an agent to remember information beyond the lifespan of a single conversation or context window. Unlike in-context "working memory" (which disappears when the session ends), long-term memory persists to external storage and is retrieved selectively when relevant.

The analogy to human cognition is intentional: humans don't reload entire life histories into working memory for each task — they retrieve relevant fragments. AI long-term memory systems attempt to replicate this selective, associative recall.

---

## Why It Matters

Without long-term memory, every new session starts from zero. The agent has no knowledge of:
- Past user preferences or corrections
- Prior task outcomes or failures
- Domain knowledge accumulated across interactions
- Relationships between concepts built over time

This forces users to repeat context constantly, limits personalization, and makes agents unsuitable for ongoing relationships or multi-session workflows (e.g., a coding assistant that doesn't remember your project conventions).

Long-term memory is the foundation of agents that improve over time — not through fine-tuning, but through accumulated experience.

---

## How It Works

Long-term memory systems generally involve four operations:

1. **Storage** — Writing information to an external store (vector DB, SQL, knowledge graph) after an interaction. The hard problem is deciding *what* to store: verbatim text, extracted facts, embeddings, or structured records.

2. **Consolidation** — Merging, deduplicating, or abstracting new information against existing memory. Without consolidation, stores grow noisy over time. [HippoRAG](../projects/hipporag.md) addresses this via knowledge graph integration with personalized PageRank, mimicking how human memory builds associative links.

3. **Retrieval** — Fetching relevant memories at query time. Most systems use semantic similarity search (vector embeddings), but this struggles with multi-hop relational queries. Hybrid approaches combine vector search with graph traversal or SQL filtering.

4. **Injection** — Inserting retrieved memories into the active context window before inference. This reintroduces the context window bottleneck: retrieved memory still competes for tokens with the current conversation.

### Memory Taxonomy

Long-term memory implementations typically distinguish between:

- **[Episodic Memory](../concepts/episodic-memory.md)** — Records of specific past events ("User complained about response latency on March 3rd")
- **[Semantic Memory](../concepts/semantic-memory.md)** — General facts and knowledge ("User prefers Python over JavaScript; works at a fintech company")
- **Procedural memory** — Learned patterns about *how* to do things, often encoded in system prompts or fine-tuning rather than retrieval

---

## Who Implements It

### [Mem0](../projects/mem0.md) (51.8k ⭐)
Abstracts memory across user/session/agent levels, decoupled from LLM choice. Claims 26% accuracy improvement and 90% token reduction versus full-context approaches. Operates by extracting and storing semantic facts rather than raw conversation logs. The token reduction is the more credible claim — the accuracy number depends heavily on benchmark selection.

### Memori (13k ⭐)
SQL-native memory infrastructure that extracts structured state from *agent actions*, not just text. This is architecturally notable: most systems treat conversation history as the memory source; Memori treats execution traces as first-class data. Useful for agents that interact with external systems (APIs, tools, filesystems) where *what the agent did* matters as much as what was said.

### [HippoRAG](../projects/hipporag.md) (3.3k ⭐, NeurIPS '24)
Research-grade system using knowledge graphs + personalized PageRank to enable multi-hop associative retrieval. Closer to true memory consolidation than simple RAG. Better at "sense-making" across documents; higher setup cost and complexity.

### Model Context Protocol (MCP)
Provides a standardized interface layer through which memory tools can be exposed to LLM agents. MCP doesn't implement memory itself but enables memory servers to plug into any compatible agent runtime.

---

## Practical Implications

**Token economics:** Retrieved memories consume context window space. A naive approach that retrieves too much is no better than keeping full history. Production systems need aggressive filtering — Mem0's 90% token reduction claim reflects this constraint.

**Write decisions are hard:** What to store is underspecified. Storing everything creates noise; storing too little loses value. Most current systems use an LLM call to decide what's "worth remembering," which adds latency and cost at write time.

**Retrieval quality degrades:** As memory stores grow, recall precision tends to drop. Semantic similarity search does not scale linearly in quality with data volume. Chunking strategy, embedding model choice, and metadata filtering all matter significantly.

**Privacy and correctness:** Long-term memory that contains user-specific facts can become stale or incorrect. A user's job changes; a preference reverses. Systems need mechanisms for correction and expiration.

---

## Relationship to Adjacent Concepts

| Concept | Relationship |
|---|---|
| Retrieval-Augmented Generation | Primary retrieval mechanism for long-term memory |
| [Context Compression](../concepts/context-compression.md) | Alternative approach — compress history rather than externalize it |
| [Memory Consolidation](../concepts/memory-consolidation.md) | The process of integrating new memories into existing structures |
| State Management | Broader category; long-term memory is persistent agent state |
| [Agent Memory](../concepts/agent-memory.md) | Parent concept encompassing all memory types |

---

## Limitations of Current Approaches

- **No ground truth for quality:** It's difficult to measure whether a memory system is "working" without expensive human evaluation
- **Consolidation is mostly unsolved:** Most production systems append rather than truly integrate memories
- **Retrieval ≠ understanding:** Retrieving a relevant memory doesn't mean the model uses it correctly
- **Vendor lock-in risk:** Memory format and extraction logic are tightly coupled to specific systems, making migration hard
- **Latency:** Write-time extraction and read-time retrieval both add round-trip costs that compound in high-frequency agent loops

---

*Sources: [Mem0](../../raw/repos/mem0ai-mem0.md) · [HippoRAG](../../raw/repos/osu-nlp-group-hipporag.md) · [Memori](../../raw/repos/memorilabs-memori.md)*


## Related

- [Model Context Protocol](../concepts/mcp.md) — implements (0.4)
- [Retrieval-Augmented Generation](../concepts/rag.md) — implements (0.6)
- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.8)
- [Semantic Memory](../concepts/semantic-memory.md) — part_of (0.8)
- [Agent Memory](../concepts/agent-memory.md) — part_of (0.7)
- [Context Compression](../concepts/context-compression.md) — alternative_to (0.5)
- State Management — implements (0.6)
- [Memory Consolidation](../concepts/memory-consolidation.md) — implements (0.7)

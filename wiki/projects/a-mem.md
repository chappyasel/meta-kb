---
entity_id: a-mem
type: project
bucket: agent-memory
sources:
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/repos/agenticnotetaking-arscontexta.md
  - deep/papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - deep/papers/zhang-agentic-context-engineering-evolving-contexts-for.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related: []
last_compiled: '2026-04-05T05:31:03.499Z'
---
# A-MEM: Agentic Memory for LLM Agents

**Type:** Research system / memory architecture
**Authors:** Wujiang Xu, Zujie Liang, Kai Mei, Hang Gao, Juntao Tan, Yongfeng Zhang
**Published:** 2025-02-17 | **Updated:** 2025-10-08
**Code:** [Evaluation](https://github.com/WujiangXu/A-mem) · [Memory system](https://github.com/WujiangXu/A-mem-sys)

---

## What It Does

A-MEM gives LLM agents a memory system that reorganizes itself as new information arrives. Most memory systems store and retrieve; A-MEM adds a third operation: when a new memory enters the system, it updates existing related memories rather than just sitting next to them.

The inspiration is Zettelkasten, the note-taking method where every new note links to existing ones and the act of linking is itself knowledge work. A-MEM applies this to agent memory: the LLM generates structured metadata for each memory, creates semantic links to related memories, and triggers updates to connected memories when new information changes their meaning.

---

## Architecture

Each memory in the network holds seven components: raw content, timestamp, LLM-generated keywords, LLM-generated tags, a contextual description (the LLM's interpretation of what this memory means), a dense vector embedding computed over all textual components concatenated together, and a bidirectional link set to related memories.

Three operations run in sequence when a new memory arrives:

**Note Construction:** The LLM generates keywords, tags, and a contextual description. A raw snippet like "Let's push the launch to next quarter" becomes a structured note with keywords like "product launch," "schedule change," "Q2 delay" and a description explaining the decision's implications.

**Link Generation:** The system retrieves the top-k most similar existing memories by cosine similarity on the dense embeddings, then asks the LLM to determine which pairs have meaningful connections. Links are bidirectional and schema-free — the LLM decides what constitutes a meaningful relationship without predefined types.

**Memory Evolution:** Newly connected memories can trigger updates to the contextual descriptions and attributes of the memories they link to. A memory about a project cancellation can cause an earlier memory about that project's timeline to be updated to note the cancellation. The paper shows this step is necessary: removing only memory evolution while keeping link generation drops multi-hop F1 from 45.85 to 31.24 with GPT-4o-mini.

Retrieval follows the link network: cosine similarity selects initial candidates, then the graph structure pulls in connected memories, enabling multi-hop reasoning without explicit chain-of-thought prompting.

[Source](../../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)

---

## Key Numbers

All results are self-reported by the authors on the LoCoMo benchmark (7,512 QA pairs, conversations averaging 9K tokens across up to 35 sessions).

**Multi-hop reasoning (F1), GPT-4o-mini:**
- LoCoMo baseline: 18.41
- A-MEM: 45.85 (+149%)

**Multi-hop reasoning (F1), GPT-4o:**
- LoCoMo baseline: 9.09
- A-MEM: 39.41 (+334%)

**Token usage at retrieval time:**
- LoCoMo baseline: 16,910 tokens
- A-MEM (GPT-4o-mini): 2,520 tokens (85% reduction)
- A-MEM (GPT-4o): 1,216 tokens (93% reduction)

**Smaller models (multi-hop F1):**
- Qwen2.5-3b: 3.11 → 27.59 (+787%)
- Qwen2.5-1.5b: 4.25 → 24.32 (+472%)
- Llama 3.2-1b: 7.38 → 17.80 (+141%)

The token numbers reflect retrieval cost only. The paper does not report ingestion-time token costs, which include LLM calls for note construction, link analysis, and memory evolution on every new memory. *These benchmarks are self-reported and not independently validated.*

---

## Strengths

**Multi-hop reasoning.** The link network enables the system to follow semantic chains across memories without requiring the base LLM to hold long contexts. A query about a person retrieves their memories, which link to their projects, which link to related decisions. The 2.5x improvement on multi-hop tasks is the most credible result because it aligns directly with the architectural mechanism.

**Smaller models benefit disproportionately.** The 787% multi-hop improvement for Qwen2.5-3b suggests that structured memory organization partially compensates for weaker model capability. If you are running on-device or cost-constrained inference, this matters.

**Schema-free linking.** Because the LLM determines what connections are meaningful rather than a predefined schema, the system adapts to arbitrary domains without configuration. A memory system for a coding agent and one for a customer service agent can both use the same mechanism.

---

## Critical Limitations

**Adversarial regression.** A-MEM scores 28% lower than the LoCoMo baseline on adversarial tasks (50.03 vs 69.23 F1). The enriched contextual descriptions and link structure that help with multi-hop reasoning appear to amplify misleading signals when questions are designed to confuse. If your agent operates in adversarial or untrusted input environments, this is a concrete failure mode, not a theoretical concern.

**Memory evolution is destructive with no version history.** When new information triggers updates to existing memories, those changes overwrite the previous state. If the LLM misinterprets a relationship and updates a memory incorrectly, there is no revert path. Cascading incorrect updates are possible: a wrong evolution in one memory can affect every memory linked to it, which may trigger further evolutions. The paper does not address this.

**Hidden infrastructure assumption:** The 85-93% token reduction at retrieval hides the ingestion cost. Every new memory requires multiple LLM calls (note construction, top-k cosine search, link analysis for each candidate pair, potential evolution calls on connected memories). For high-frequency memory ingestion, the total token budget may exceed the baseline rather than reduce it. The paper's efficiency claims should be read as retrieval-only.

---

## When Not to Use It

**Temporal reasoning is the primary concern.** A-MEM achieves +1% F1 on temporal tasks with GPT-4o-mini. If your agent needs to answer questions like "What changed between last week and this week?" or "What did we decide before the meeting on Tuesday?", A-MEM's timestamp storage without temporal-specific retrieval will fail you. Zep's bi-temporal indexing handles this substantially better.

**High-volume, low-latency ingestion.** Every memory requires LLM calls on write, not just on read. Systems ingesting hundreds of memories per minute cannot afford LLM-mediated organization at write time.

**Production systems requiring auditability.** Memory evolution changes existing records without tracking what changed or why. Regulated environments (healthcare, legal, finance) need history and reversibility.

**Adversarial input environments.** The -28% adversarial regression is large enough that any system where users might craft misleading queries should not rely on A-MEM's enriched representations without additional filtering.

---

## Unresolved Questions

**Embedding staleness after evolution.** When memory evolution updates a note's keywords, tags, or contextual description, the dense embedding should be recomputed because it covers all textual components. The paper does not clearly state whether recomputation happens after evolution updates. If it does not, retrieval operates on stale embeddings that no longer reflect the memory's current semantic content.

**Scale behavior.** All experiments use ~9K token conversations. Production agent memory accumulates orders of magnitude more. The top-k cosine search, LLM-based link analysis, and evolution propagation are each O(n) or worse. At what memory count does the system become impractical?

**Cost accounting.** The paper reports retrieval token savings but not total ingestion cost. Without this number, comparing A-MEM's total token budget against a simple RAG baseline is impossible.

**Governance of evolution.** Who decides when an evolution update is wrong? There is no human-in-the-loop mechanism, no confidence threshold, no rollback. For long-running agents where memory coherence matters, this is an open design problem, not a minor detail.

---

## Alternatives

| System | Choose when |
|---|---|
| **Zep / Graphiti** | Temporal reasoning matters; typed relationships (HIRED_BY, REPORTED_TO) add value; you need bi-temporal indexing for auditable memory history |
| **MemGPT** | You want a full agent OS with paging between in-context and external memory; the paging mechanism fits your task structure |
| **Naive RAG + vector store** | Ingestion volume is high; latency is critical; multi-hop reasoning is not required; you want predictable costs |
| **A-MEM** | Multi-hop reasoning across long agent histories is the primary task; smaller models are in use; schema-free adaptation to new domains matters |

---

## Relationship to Zettelkasten

The Zettelkasten influence is more than aesthetic. The core claim is that knowledge work happens at the moment of connection, not retrieval. A-MEM's memory evolution mechanism is the direct translation: integrating a new memory is also the moment you update what you already know. The ablation results validate this — removing memory evolution (keeping link generation) costs 14.61 F1 points on multi-hop tasks, which is the empirical case that connection-at-ingestion matters.

Ars Contexta uses the same Zettelkasten inspiration for a different problem: generating human knowledge management systems from first principles via a 249-claim research graph. The two systems share the linking philosophy but differ in that Ars Contexta is designed for human-agent cognitive offloading while A-MEM targets agent-to-agent memory persistence.

[Source](../../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md) · [Source](../../raw/papers/xu-a-mem-agentic-memory-for-llm-agents.md)

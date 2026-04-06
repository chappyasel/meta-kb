---
entity_id: episodic-memory
type: concept
bucket: agent-memory
abstract: >-
  Episodic memory in AI agents stores specific past events and interactions with
  temporal context, enabling multi-session recall and learning from prior
  experiences rather than treating each conversation as isolated.
sources:
  - repos/getzep-graphiti.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/uditgoenka-autoresearch.md
  - repos/caviraoss-openmemory.md
  - repos/nemori-ai-nemori.md
  - repos/mem0ai-mem0.md
  - repos/letta-ai-lettabot.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - articles/turing-post-9-open-agents-that-improve-themselves.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/caviraoss-openmemory.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
related:
  - semantic-memory
  - rag
  - agent-memory
  - mem0
  - letta
  - procedural-memory
  - hybrid-retrieval
  - openai
  - reflexion
  - bm25
  - graphiti
  - zep
  - langgraph
  - core-memory
last_compiled: '2026-04-06T01:58:30.718Z'
---
# Episodic Memory

## What It Is

Episodic memory is the agent memory type that records specific events, interactions, and experiences as discrete, time-stamped entries. The term comes from cognitive psychology, where episodic memory refers to the autobiographical record of particular experiences ("what happened, when, where") in contrast to semantic memory ("what things are") or procedural memory ("how to do things").

In AI systems, episodic memory gives an agent access to its own history: what a user said in a previous session, what a task produced two weeks ago, why a prior approach failed. Without it, every conversation starts from scratch.

[Agent Memory](../concepts/agent-memory.md) systems typically implement episodic storage as one tier within a broader hierarchy alongside [Semantic Memory](../concepts/semantic-memory.md), [Procedural Memory](../concepts/procedural-memory.md), and [Core Memory](../concepts/core-memory.md). Each tier has different update frequency, decay characteristics, and retrieval cost.

## Why It Matters

Most production LLM applications expose a stateless API. Each request gets the model's general knowledge, nothing from prior interactions. Episodic memory breaks that constraint. It lets agents:

- Maintain continuity across sessions ("Last month you said you preferred metric units")
- Learn from prior failures ("I tried that API endpoint before and got a 403")
- Track how facts have changed over time ("She worked at Acme through 2023, now at Veritas")
- Build context about a specific user or project without human re-explanation

The alternative, stuffing full conversation history into context, has hard limits. At 100K+ tokens, it becomes expensive, slow, and often less accurate than targeted retrieval. The Zep paper (arXiv:2501.13956) shows that retrieval-based episodic memory reduces context from 115K to ~1.6K tokens while improving accuracy by 15-18% and cutting latency by ~90% on complex temporal reasoning tasks.

## How It Works

### Storage: What Gets Recorded

Every incoming message, task result, or interaction gets stored as an **episode**: a raw, timestamped record of what happened. The episode is the ground truth. Everything derived from it (extracted entities, summaries, embeddings) traces back to these source records.

[Graphiti](../projects/graphiti.md) formalizes this as `EpisodeNode` objects, each carrying:
- `name`: identifier for the episode
- `content`: the raw text (message, JSON, document)
- `created_at`: when the episode entered the system
- `valid_at`: when the represented event actually occurred (which may differ from ingestion time)
- `source`: type classification (message, json, text)
- `group_id`: namespace for multi-tenant isolation

The `valid_at` / `created_at` distinction is the first clue that serious episodic memory is a bi-temporal problem. Storing a historical document today doesn't mean the events it describes happened today.

### Extraction: From Events to Knowledge

Raw episodes are rarely retrieved directly. The useful content gets extracted into entities, facts, and summaries that can be searched more efficiently. This extraction is where most systems diverge.

**LLM-based extraction** (Graphiti, [Mem0](../projects/mem0.md)): An LLM reads the episode and produces structured output, entity names, relationship triples, or fact strings. Graphiti's `add_episode()` in `graphiti_core/graphiti.py` runs a multi-stage pipeline: extract entities, deduplicate against existing graph nodes, extract fact triples with temporal bounds, resolve contradictions against existing edges, then update entity summaries. This costs 4-5 LLM calls per episode.

**RL-trained extraction** (Mem-alpha, arXiv:2509.25911): A 4B-parameter model trained via GRPO decides what to store and where, processing text chunks sequentially. The model learns which information belongs in episodic vs. semantic vs. core memory through reward signals from downstream QA accuracy. This generalizes from 30K-token training contexts to 400K+ token inference contexts, a 13x extrapolation.

**Heuristic extraction** ([OpenMemory](../projects/supermemory.md)'s HSG approach): Regex pattern matching routes content to cognitive sectors. Episodic content is detected by temporal markers ("yesterday," "remember when," "went," "saw") and stored with a decay lambda of 0.015, faster than semantic (0.005) but slower than emotional (0.02). No LLM required for classification, but the patterns are English-centric and easily fooled.

### Retrieval: Finding Relevant Episodes

Retrieval methods range from simple similarity search to graph traversal:

**Vector search**: Episodes or extracted facts are embedded; queries retrieve by cosine similarity. This is the baseline approach, implemented by virtually every system. It misses exact keyword matches and temporal constraints.

**[Hybrid Retrieval](../concepts/hybrid-retrieval.md)**: Combines vector similarity with [BM25](../concepts/bm25.md) full-text search. Graphiti's search layer runs cosine similarity, BM25, and breadth-first graph traversal in parallel, then reranks with RRF or cross-encoder models. The BFS component traverses the knowledge graph from recently mentioned entities, capturing contextual relevance that pure similarity search misses.

**Temporal filtering**: Episodic memory often needs time-aware retrieval. "What was her address last year?" requires filtering on `valid_at` ranges, not just semantic similarity. Graphiti's bi-temporal model supports this; most simpler systems do not.

**[RAG](../concepts/rag.md) vs. episodic memory**: These solve adjacent problems. RAG retrieves from a static document corpus. Episodic memory retrieves from a dynamic, evolving record of agent-specific experiences. The two can coexist, with RAG handling domain knowledge and episodic memory handling interaction history.

### Temporal Dynamics: Decay and Invalidation

Episodic memories don't stay equally relevant forever. Two mechanisms manage this:

**Decay**: Older, less-accessed memories receive lower retrieval scores. OpenMemory implements a dual-phase exponential decay: a fast component (lambda=0.015) models initial forgetting, a slow consolidated component (0.4 × e^(-0.002t)) models long-term retention. Cold memories also get their embeddings compressed from 1536 to as few as 64 dimensions via mean pooling, saving storage while degrading retrieval precision.

**Invalidation**: When new facts contradict old ones, the old facts should become unretrievable for current-state queries but remain accessible for historical queries. Graphiti's bi-temporal model handles this by setting `expired_at` on contradicted `EntityEdge` records rather than deleting them. This preserves history at the cost of monotonically growing storage. Systems without invalidation either delete old facts (losing history) or return stale facts alongside current ones (confusing the agent).

### Consolidation: Episodic to Semantic

A key function of episodic memory is feeding into semantic memory through consolidation. [Memory Consolidation](../concepts/memory-consolidation.md) is the process by which specific event memories get abstracted into general knowledge.

In Graphiti, community detection via label propagation groups related entities, then LLM-generated summaries describe the community. These summaries live in the semantic/community tier, derived from episodic content but no longer tied to specific events.

OpenMemory's reflection system clusters similar memories by Jaccard similarity (threshold 0.8), generates extractive pattern summaries, and stores them as "reflective" memories with the slowest decay rate (lambda=0.001). These persist longest because they represent distilled knowledge rather than raw events.

[Reflexion](../concepts/reflexion.md) demonstrates the value of quality over quantity in consolidation: on HotPotQA reasoning tasks, simple episodic memory (remembering past attempts) improved accuracy 2 points. Adding self-reflection summaries (analyzing why past attempts failed) improved accuracy 14 points total. The analysis of failure matters more than the record of failure.

## Who Implements It

**[Graphiti](../projects/graphiti.md)**: Most architecturally complete. Episodes as first-class nodes, bi-temporal edge model, hybrid retrieval, LLM-based extraction pipeline. Requires Neo4j or equivalent graph database. 4-5 LLM calls per episode ingestion.

**[Zep](../projects/zep.md)**: Commercial product built on Graphiti. Same three-tier architecture (episodes, entities, communities). Adds managed infrastructure, multi-tenant support, and enterprise features. The arXiv paper (2501.13956) provides the most rigorous benchmarking of any memory system.

**[Mem0](../projects/mem0.md)**: Simpler flat-memory approach. Extracts facts from conversations into a vector store, with optional graph layer. Lower infrastructure requirements than Graphiti; less temporal sophistication.

**[Letta](../projects/letta.md)**: Implements MemGPT-style memory with explicit `archival_storage` (episodic) and `recall_storage`. Agents write to memory through explicit function calls rather than automatic extraction. More controllable, less automatic.

**[Reflexion](../concepts/reflexion.md)**: Stores self-reflection summaries in an episodic memory buffer (typically 1-3 entries). Focused on single-task retry loops rather than cross-session continuity. The bounded buffer is a deliberate design choice constrained by context window limits.

**[OpenAI](../projects/openai.md)**: Memory features in ChatGPT store user preferences and prior context across sessions. Implementation details are not public, but the user-facing behavior is episodic: the model recalls specific past interactions.

**[LangGraph](../projects/langgraph.md)**: Provides persistence infrastructure through its `Store` abstraction. Episodic content stored in threads; semantic content stored in a cross-thread namespace. Applications define what counts as episodic.

## Practical Failure Modes

**Episode extraction quality**: LLM-based extraction misses things. Graphiti's extraction prompt is explicit about what not to extract (abstract nouns, pronouns, bare kinship terms), which reduces noise but also misses relevant content in specialized domains like medical notes or legal text. The quality depends heavily on the base model; switching to cheaper models degrades extraction substantially.

**Assistant-side content gap**: Zep's LongMemEval results show a -17.7% accuracy drop on tasks where the agent needs to recall what it itself said (recommendations, calculations, creative outputs) versus what the user said. The extraction pipeline is biased toward user-stated facts. This matters for agentic use cases where the agent's prior outputs are important context.

**Invalidation without temporal modeling**: Most simple memory systems delete or overwrite facts when contradictions arise. If a user's address changes, the old address is gone. This prevents time-travel queries ("what address did we have on file last January?") and loses audit trail. Systems that lack bi-temporal modeling make this tradeoff silently.

**Unbounded storage growth**: Bi-temporal systems that expire rather than delete contradicted facts grow monotonically. There is no garbage collection for old invalidated edges in Graphiti. At sufficient scale, this becomes a storage and query-performance problem.

**Decay parameter sensitivity**: Systems like OpenMemory with hand-tuned decay parameters (lambda rates, salience thresholds, consolidation coefficients) have no empirical basis for their specific values. The parameters reference cognitive science concepts but are educated guesses for LLM memory use cases. Changing them materially alters retrieval behavior in ways that are hard to predict.

**Regex-based sector classification**: Routing memories to episodic vs. semantic sectors via pattern matching is fast and cheap, but easily wrong. "How to manage stress from yesterday's meeting" could match episodic (temporal marker), semantic (general knowledge), procedural (how-to), and emotional (affect) patterns simultaneously. Misclassification changes decay rate and retrieval weight.

## When Not to Use It

Skip dedicated episodic memory when:

- **Sessions are short and independent**: A customer service bot handling discrete, unrelated queries gains nothing from remembering session 247 when answering session 248. The overhead of extraction and storage outweighs any benefit.

- **Context windows are sufficient**: For single-session tasks under ~30K tokens with a capable model, stuffing the conversation into context is simpler and often more accurate than retrieval-based approaches. Episodic memory adds value when context windows are genuinely insufficient.

- **Retrieval latency is unacceptable**: Graphiti's `add_episode` runs 4-5 LLM calls synchronously. The paper recommends running ingestion as a background task (FastAPI background tasks, Celery). If your architecture cannot tolerate background processing, simpler approaches are more practical.

- **Your data doesn't evolve**: If you're building over a static document corpus with no evolving user-specific context, [RAG](../concepts/rag.md) is the right tool. Episodic memory adds complexity that static retrieval doesn't need.

## Unresolved Questions

**Cost at scale**: None of the major systems publish per-episode ingestion costs at production volume. At 1M episodes/day with 4-5 LLM calls each, the extraction cost could exceed the value. Graphiti's `add_episode_bulk` skips edge invalidation for speed but sacrifices temporal consistency.

**Consolidation triggers**: When should episodic memories get consolidated into semantic memory? OpenMemory consolidates after 20+ memories accumulate on a 10-minute interval. Graphiti does community detection optionally. Neither provides guidance on optimal consolidation frequency or how to detect when consolidation has diverged from the true memory state.

**Cross-encoder cost vs. quality tradeoff**: Graphiti supports neural reranking with cross-encoder models as the highest-quality retrieval option. No published data shows at what query volume the quality gain justifies the added latency and API cost versus simpler RRF reranking.

**Multi-agent episodic memory**: When multiple agents share a memory store (team of agents working on a project), who resolves conflicting episodes? Graphiti's `group_id` provides namespace isolation but not conflict resolution across namespaces. No system has a clear answer for collaborative episodic memory.

## Alternatives and Selection Guidance

| Scenario | Use |
|---|---|
| Static document corpus, no evolving context | [RAG](../concepts/rag.md) |
| Single-session tasks under 30K tokens | Full context in prompt |
| Simple user preference tracking across sessions | [Mem0](../projects/mem0.md) (lower infra cost) |
| Complex temporal reasoning, evolving facts | [Graphiti](../projects/graphiti.md) / [Zep](../projects/zep.md) |
| Agent self-improvement from prior task failures | [Reflexion](../concepts/reflexion.md) pattern |
| Privacy-sensitive, fully local deployment | OpenMemory with Ollama embeddings |
| RL-learned memory management | Mem-alpha (research, not production-ready) |

## Related Concepts

- [Agent Memory](../concepts/agent-memory.md): The broader memory taxonomy
- [Semantic Memory](../concepts/semantic-memory.md): General knowledge vs. specific events
- [Core Memory](../concepts/core-memory.md): Always-in-context high-priority facts
- [Memory Consolidation](../concepts/memory-consolidation.md): How episodic becomes semantic
- [Hybrid Retrieval](../concepts/hybrid-retrieval.md): Combined search methods for retrieval
- [Reflexion](../concepts/reflexion.md): Self-reflection as episodic memory for improvement
- [Retrieval-Augmented Generation](../concepts/rag.md): Adjacent approach for static corpora

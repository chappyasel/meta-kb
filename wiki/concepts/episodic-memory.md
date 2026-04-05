---
entity_id: episodic-memory
type: concept
bucket: agent-memory
sources:
  - repos/mirix-ai-mirix.md
  - repos/wangyu-ustc-mem-alpha.md
  - repos/caviraoss-openmemory.md
  - repos/uditgoenka-autoresearch.md
  - repos/nemori-ai-nemori.md
  - repos/mem0ai-mem0.md
  - papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - articles/fabricio-q-memory-in-agents-episodic-vs-semantic-and-the-h.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - articles/hugging-face-mem-agent-equipping-llm-agents-with-memory-using.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - deep/repos/getzep-graphiti.md
  - deep/repos/wangyu-ustc-mem-alpha.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/infiniflow-ragflow.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/shinn-reflexion-language-agents-with-verbal-reinforceme.md
  - deep/papers/rasmussen-zep-a-temporal-knowledge-graph-architecture-for-a.md
related: []
last_compiled: '2026-04-05T05:22:03.724Z'
---
# Episodic Memory

## What It Is

Episodic memory is the storage and retrieval of specific past experiences, ordered by when they occurred. The term comes from cognitive science, where Endel Tulving (1972) distinguished it from semantic memory (general facts) and procedural memory (skills). In AI agent systems, it means giving an agent access to records of past interactions, conversations, or task executions so it can reason about what happened before.

The core property is temporal specificity: episodic memory doesn't just store *what* is known, it stores *what happened, to whom, and when*. A semantic memory system might know "the user prefers dark mode." An episodic memory system knows "on March 3rd, the user complained about the bright theme during session 14."

This distinction matters for agents because many tasks require reasoning about sequence, causality, and change over time. Knowing a preference is different from knowing how that preference was expressed, contradicted, or updated across sessions.

## Why It Matters

LLMs have no persistent state between conversations. Every new session starts from zero. For tasks that extend across sessions (customer support, personal assistants, autonomous research loops), this makes agents functionally amnesiac. They repeat questions, lose context, and can't build on prior work.

Episodic memory is one of three approaches to this problem:

1. **Full context**: dump prior conversation history into the prompt. Works for short histories, but token costs scale linearly and quality degrades as context grows.
2. **Semantic/parametric memory**: summarize and compress past experiences into facts or embeddings. Efficient but lossy — the temporal ordering and specific circumstances are gone.
3. **Episodic memory**: store discrete interaction records indexed by time, session, and entity, then retrieve relevant episodes selectively.

Mem0's benchmark on LOCOMO shows selective episodic retrieval achieves 26% higher accuracy than OpenAI Memory while using 90% fewer tokens than full-context approaches (self-reported). The efficiency gain comes from retrieving three relevant past episodes rather than replaying the entire history.

## How It Works

### Storage Structure

Episodic memories are typically stored as timestamped records with metadata: session ID, user ID, agent ID, the content of the exchange, and extracted facts or summaries. The record needs enough structure to support retrieval by multiple dimensions simultaneously.

Mem0 organizes memory across three levels: user state (persistent across sessions), session state (scoped to a single conversation), and agent state (the agent's own accumulated knowledge). Each level supports independent `add()` and `search()` operations.

A minimal episodic record looks like:

```python
{
  "user_id": "alice",
  "session_id": "session_42",
  "timestamp": "2025-03-03T14:23:00Z",
  "content": "User said they prefer dark mode and vim keybindings",
  "memory": "Prefers dark mode and vim keybindings"
}
```

The raw content preserves context; the extracted `memory` field enables faster retrieval.

### Retrieval

Retrieval is where episodic memory systems diverge in approach. Three main patterns exist:

**Similarity search**: embed the current query, find the k-nearest stored episodes by vector distance. Fast, but loses temporal ordering. Two episodes from different months might score identically.

**Recency-weighted similarity**: combine vector similarity with a recency decay factor. Recent episodes score higher at equal semantic distance. Appropriate for preferences that drift over time.

**RL-optimized retrieval**: Mem-α trains a 4B-parameter model to decide *what* to store and *how* to organize it using reinforcement learning rather than fixed rules. The agent learns through task feedback which encoding strategy produces memories that are actually useful for future retrieval. Trained on 30k-token sequences, it generalizes to 400k+ tokens (13x the training length) according to the paper. This represents a shift from hand-engineered memory schemas to learned ones.

### Memory Types Within Episodic Systems

Mem-α distinguishes three sub-types that coexist in a full memory architecture:

- **Core memory**: persistent high-priority facts (identity, stable preferences)
- **Episodic memory**: specific past events, ordered and timestamped
- **Semantic memory**: generalized facts extracted from episodes

A well-designed system routes new information to the appropriate store. A user saying "I moved to Berlin last month" should update core memory (location), create an episodic record (when and how it was stated), and may eventually contribute to semantic memory (the agent knows where to look for timezone-relevant preferences).

### Implementation Pattern

The basic loop for an agent using episodic memory:

```python
# On each turn
relevant_episodes = memory.search(query=user_message, user_id=user_id, limit=3)
context = format_episodes(relevant_episodes)
response = llm.complete(system=f"Past context:\n{context}", user=user_message)
memory.add([user_message, response], user_id=user_id, session_id=session_id)
```

The agent retrieves before generating, then writes after. Write operations typically use an LLM pass to extract structured facts from raw conversation turns.

### Git as Episodic Memory

Autoresearch, a Claude Code agent tool, implements a different form of episodic memory: the git log. Every experiment is committed with an `experiment:` prefix before verification. Failed experiments get reverted but their commit records remain in history. The agent reads `git log` and `git diff` before each iteration, giving it access to a complete record of what was tried, what worked, and what failed. This is episodic memory using developer tooling rather than a dedicated memory store: timestamped, ordered, preserving both the change and its outcome.

## Who Implements It

Several projects provide episodic memory infrastructure for agents:

**Mem0** ([mem0ai/mem0](https://github.com/mem0ai/mem0), 51k stars): the most widely adopted memory layer. Abstracts user/session/agent memory behind a unified API, decouples from LLM choice, supports hosted and self-hosted deployment. Built on vector stores for similarity retrieval.

**Mem-α** ([wangyu-ustc/Mem-alpha](https://github.com/wangyu-ustc/Mem-alpha)): research implementation of RL-trained memory construction. Smaller project (193 stars) but represents the leading published approach to learned memory management. The Memalpha-4B model is available on HuggingFace.

**Autoresearch** ([uditgoenka/autoresearch](https://github.com/uditgoenka/autoresearch), 3.1k stars): git-backed episodic memory for autonomous iteration loops in Claude Code.

## Practical Implications

**For conversation agents**: episodic memory enables preference tracking across sessions without re-asking. The agent can say "last time you mentioned X" because it has an actual record of when that was said, not just that it was said.

**For long-horizon task agents**: episodic memory lets an agent avoid re-attempting failed approaches. The Autoresearch pattern logs failed experiments explicitly so the agent reads them before choosing the next strategy.

**For multi-session workflows**: episodic memory is the difference between a stateless tool and an agent that builds a model of its user over time.

## Failure Modes

**Retrieval mismatch**: the query at time of retrieval differs in phrasing from the query at time of storage, so relevant episodes score low in similarity search. A user who said "I hate cluttered UIs" may not match a query about "interface preferences."

**Stale episodes**: episodic memory has no automatic expiry. A preference recorded six months ago may now be wrong. Systems without recency weighting or explicit invalidation serve outdated information with full confidence.

**Memory poisoning**: if the episode store is shared across users (a misconfiguration in multi-tenant systems), one user's episodes contaminate another's context. The access control problem is not solved by the memory abstraction layer itself.

**Write latency at scale**: writing after every turn adds latency. At high volume, the LLM-based extraction step (converting raw conversation to structured memory) becomes a bottleneck. Mem0's 91% speed improvement claim is versus full-context retrieval, not versus no-memory — the write step itself adds overhead not captured in that number (self-reported, not independently validated).

**RL training instability**: Mem-α's approach requires a reward signal derived from downstream task performance. Sparse or noisy task feedback makes training unstable. The generalization from 30k to 400k+ tokens is the paper's claim and has not been independently replicated at production scale.

## Unresolved Questions

Several practical questions remain open across the field:

**What is the right granularity for an episode?** A single turn? A conversation? A task? Systems make different choices with limited comparative evidence.

**When should memories be forgotten?** None of the major frameworks have principled expiration policies. This matters for both accuracy (stale data) and compliance (GDPR deletion requests propagating through vector stores).

**How do episodic and semantic memory interact in practice?** The boundary between "this specific thing happened" and "generally, this user prefers X" is fuzzy. When do enough episodes justify promoting a fact to semantic memory? Mem-α trains this implicitly through RL rewards, but the learned policy isn't interpretable.

**What happens when episodes conflict?** Two episodes might contain contradictory information. Systems that retrieve the top-k by similarity have no conflict resolution strategy built in.

## Related Concepts

Episodic memory is one component in a broader agent memory taxonomy. A complete system typically combines it with:

- **Working memory**: the active context window
- **Semantic memory**: extracted, generalized knowledge
- **Procedural memory**: stored action sequences or skills

The retrieval mechanism — how the system decides which episodes to surface — is often built on RAG infrastructure, though episodic retrieval adds temporal and relational structure that generic RAG pipelines don't natively support.

## Sources

- [Mem0](../../raw/repos/mem0ai-mem0.md)
- [Mem-α](../../raw/repos/wangyu-ustc-mem-alpha.md)
- [Autoresearch](../../raw/repos/uditgoenka-autoresearch.md)

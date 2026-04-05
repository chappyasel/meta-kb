---
entity_id: multi-agent-systems
type: concept
bucket: agent-systems
sources:
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - papers/xu-a-mem-agentic-memory-for-llm-agents.md
  - papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - Andrej Karpathy
  - Retrieval-Augmented Generation
  - Agentic RAG
  - Research Orchestration
  - State Management
  - GAIA
  - WebArena
  - Hallucination Compounding
last_compiled: '2026-04-04T21:21:46.882Z'
---
# Multi-Agent Systems

**Bucket:** agent-systems | **Type:** Concept

---

## What It Is

Multi-agent systems (MAS) are architectures where multiple AI agents—each with distinct roles, tools, or knowledge—collaborate (or compete) to accomplish tasks too complex or large for a single agent. Rather than one monolithic agent doing everything, work is decomposed, distributed, and synthesized across agents that communicate through structured outputs, shared memory, or message-passing protocols.

The idea borrows from distributed computing and organizational design: specialization enables parallelism, and coordination enables coherence.

---

## Why It Matters

Single-agent architectures hit practical limits quickly: context windows overflow, sequential reasoning bottlenecks on complex tasks, and errors compound without review. Multi-agent designs address these by introducing:

- **Parallelism:** Multiple agents working simultaneously on subtasks
- **Specialization:** Agents tuned or prompted for specific domains (retrieval, synthesis, critique)
- **Redundancy and review:** Separate agents can validate each other's outputs before they propagate

The cost is coordination overhead and new failure modes—particularly hallucination compounding, where one agent's error becomes the assumed ground truth for downstream agents. See [Hallucination Compounding](../concepts/hallucination-compounding.md).

---

## How It Works

### Common Patterns

**Supervisor-Worker (Hierarchical)**
A controller agent decomposes tasks, delegates to specialist sub-agents, and aggregates results. The supervisor may also act as a quality gate—reviewing outputs before they enter shared state. This is the most common production pattern.

Example from practice: a 10-agent swarm where each agent dumps outputs to a `raw/` folder, a compiler organizes these into structured wiki articles every few hours, and a supervisor agent ("Hermes") scores every article before it enters the permanent knowledge base. Bad drafts die in staging; clean outputs get promoted to live. [Source](../../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

**Pipeline / Relay**
Agents pass outputs sequentially, each transforming or enriching the result. Simple but brittle—errors propagate forward with no review layer.

**Swarm / Peer-to-Peer**
Agents operate in parallel with loose coordination, often sharing a common knowledge store. Useful for breadth tasks (broad research, hyperparameter search) where outputs are later synthesized.

**Competitive / Adversarial**
Agents are deliberately set against each other—one generates, another critiques. Used in debate frameworks and red-teaming.

### Shared Memory and State

Agents typically coordinate through:
- **Shared file systems or databases** (a `raw/` or `wiki/` directory acts as a persistent blackboard)
- **In-context state passing** (one agent's output becomes another's input)
- **Structured briefings** (per-agent context summaries generated at startup so agents don't "wake up blank")

State management is a first-class concern. Without it, agents re-derive context from scratch, wasting compute and introducing inconsistency. See State Management.

---

## Concrete Examples

**Autonomous hyperparameter research:** Karpathy left an autoresearch agent running for ~2 days on a depth-12 model. It found ~20 changes that improved validation loss, all of which transferred additively to larger (depth-24) models—producing an 11% speedup on a training benchmark. A single agent, given enough time and a well-defined evaluation metric, can replicate iterative human optimization loops. [Source](../../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)

**LLM Knowledge Base construction:** The [Agentic RAG](../concepts/agentic-rag.md) pattern uses agents to ingest raw documents, compile structured wiki articles, maintain backlinks and indexes, and update incrementally. The key insight: LLMs actively *maintain* the knowledge base rather than just querying it, turning every cycle into a self-improving system. [Source](../../raw/tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md)

---

## Strengths

- Scales beyond single-context limits through decomposition
- Enables specialization—retrieval agents, reasoning agents, critique agents can each be optimized separately
- Parallelism reduces wall-clock time for breadth tasks
- Review layers (supervisor gates) can catch errors before they compound
- Naturally maps to human organizational patterns, making architectures legible

---

## Limitations and Failure Modes

- **Hallucination compounding:** One agent's fabricated connection becomes assumed fact for every downstream agent. Without a review gate, this corrupts shared state permanently. [Source](../../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)
- **Coordination overhead:** Orchestration logic is complex. Debugging failures across agent boundaries is harder than single-agent debugging.
- **Latency:** Supervisor-worker patterns add round-trip overhead. Poorly designed pipelines can be slower than a single capable agent.
- **Context fragmentation:** Agents working from partial briefings may make locally coherent but globally inconsistent decisions.
- **Evaluation difficulty:** GAIA and WebArena benchmarks exist but real-world multi-agent performance is hard to measure systematically.

---

## Key Design Decisions

| Decision | Options | Tradeoff |
|---|---|---|
| Coordination model | Hierarchical vs. peer-to-peer | Control vs. flexibility |
| Shared state | File system vs. in-context vs. DB | Persistence vs. latency |
| Review layer | Supervisor gate vs. none | Quality vs. throughput |
| Agent specialization | Generalist vs. specialist agents | Simplicity vs. performance |
| Failure handling | Retry vs. escalate vs. skip | Reliability vs. speed |

---

## Related Concepts and Projects

- Retrieval-Augmented Generation — frequently the information-retrieval layer inside individual agents
- [Agentic RAG](../concepts/agentic-rag.md) — MAS applied specifically to dynamic knowledge retrieval and synthesis
- [Research Orchestration](../concepts/research-orchestration.md) — common use case driving MAS adoption
- State Management — critical unsolved problem in production MAS
- GAIA and WebArena — benchmarks for evaluating agent capabilities
- Andrej Karpathy — prominent practitioner documenting real MAS deployments

---

## Alternatives

For tasks within context limits, a single well-prompted agent with tool access is simpler and easier to debug. Multi-agent adds real value primarily when tasks exceed context windows, benefit from parallelism, or require adversarial review. Don't reach for MAS as a default architecture—coordination costs are real.

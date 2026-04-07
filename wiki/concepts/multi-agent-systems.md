---
entity_id: multi-agent-systems
type: concept
bucket: agent-systems
abstract: >-
  Multi-agent systems coordinate multiple AI agents to tackle tasks via
  specialization, parallelism, or verification — key differentiator is emergent
  capability beyond single-agent context limits, at the cost of coordination
  overhead and compounding failure modes.
sources:
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/letta-ai-letta.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related:
  - andrej-karpathy
  - rag
  - context-engineering
  - letta
last_compiled: '2026-04-07T00:59:26.042Z'
---
# Multi-Agent Systems

## What It Is

A multi-agent system (MAS) is an architecture where two or more AI agents operate in coordination to accomplish tasks. Each agent runs its own inference loop, maintains its own context, and produces outputs that other agents consume. Agents may specialize by role, run in parallel on decomposed subtasks, verify each other's outputs, or iterate through feedback cycles.

The core motivation is practical: a single agent has a bounded context window, a single thread of execution, and no internal verification mechanism. Distributing work across agents sidesteps all three constraints simultaneously.

## Why It Matters

Three problems drive adoption of multi-agent architectures:

**Context limits.** A task requiring synthesis across 500 documents cannot fit in a single context window. Multiple agents can each process a subset and pass summaries upstream.

**Parallelism.** Sequential single-agent work on decomposable problems is slow. Agents running concurrently on independent subtasks cut wall-clock time roughly proportional to available agents.

**Verification.** A single agent evaluating its own output has structural bias toward accepting it. A separate agent reviewing the same output, with no knowledge of how it was produced, applies cleaner judgment. This is the critical insight behind supervisor architectures: the reviewer's ignorance of the production process is a feature, not a deficiency. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

## Core Architectural Patterns

### Orchestrator-Worker

A coordinator agent decomposes a task, dispatches subtasks to worker agents, and aggregates results. Workers are typically specialized: one handles retrieval, another handles code execution, another handles summarization. The orchestrator manages sequencing and handles failures.

**Implementation in [LangGraph](../projects/langgraph.md):** Graph nodes represent agents; edges represent data flow. The orchestrator node routes to worker nodes via conditional edges, collecting results at a join node before producing final output.

**Implementation in [CrewAI](../projects/crewai.md):** Agents are defined with explicit `role`, `goal`, and `backstory` fields. Tasks are assigned to agents, and a `Crew` object manages execution order. CrewAI exposes a `Process.sequential` and `Process.hierarchical` mode, the latter spawning a manager agent that delegates dynamically.

### Pipeline (Assembly Line)

Agents form a chain where each agent's output becomes the next agent's input. Common for document processing: extract agent → fact-check agent → format agent → review agent. Failure at any stage propagates forward, making error detection at each handoff critical.

### Supervisor-Swarm

A swarm of executor agents operates in parallel, producing raw outputs into a shared staging area. A separate supervisor agent reviews outputs before they enter a permanent store. The supervisor's isolation from the production process prevents bias: it evaluates artifacts on their merits rather than the effort that produced them.

This pattern addresses a compounding failure specific to multi-agent knowledge bases: one hallucinated connection gets incorporated, and every downstream agent builds on it. A validation gate before persistence breaks that chain. [Source](../raw/tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md)

Concrete implementation: executor agents write to a `raw/` folder; a compiler organizes outputs into structured articles; a supervisor scores each article; articles above threshold are promoted to a permanent knowledge base; per-agent briefings are generated from the live knowledge base so each agent starts the next cycle with current context.

### Peer-to-Peer Debate

Multiple agents independently address the same problem, then argue for their conclusions. A final agent (or voting mechanism) selects or synthesizes the winner. Used primarily in settings where answer correctness is hard to verify externally, such as open-ended reasoning or contested factual claims.

### Self-Improving Research Swarm

Agents autonomously run experiments, observe outcomes, and plan subsequent experiments based on the sequence of prior results. [Andrej Karpathy](../concepts/andrej-karpathy.md)'s autoresearch work demonstrated this pattern concretely: a swarm ran approximately 700 hyperparameter experiments over two days on [nanoGPT](../projects/nanogpt.md), autonomously identifying 20 improvements that stacked to an 11% training speedup. The agents noticed things a human had missed: an unscaled QKnorm, unregularized value embeddings, misconfigured AdamW betas. The key capability was reading the sequence of experimental results and using that to plan the next experiment — not generating novel hypotheses, but systematic search guided by empirical feedback. [Source](../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)

## How Communication Works

Agents exchange information through several mechanisms:

**Shared memory / knowledge base.** Agents read from and write to a common store. Simple but creates contention and requires conflict resolution when agents write contradictory information.

**Message passing.** Agents send structured messages to each other via a bus or queue. More explicit and auditable than shared memory, but adds latency. KQML and FIPA ACL are formal message protocols; [Model Context Protocol](../concepts/mcp.md) is a more recent standard for tool-integrated agents. [Source](../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md)

**Context injection.** An orchestrator assembles a context package — instructions, relevant memory, tool definitions, current state — and injects it into a worker agent's context window at invocation. This is the pattern Letta's `memory_blocks` abstraction formalizes. [Source](../raw/repos/letta-ai-letta.md)

**Briefings.** Generated summaries tailored per agent role, so each agent starts with exactly the context it needs rather than receiving a full shared state dump. This is context engineering applied to inter-agent communication: rather than every agent holding all state, each agent holds only the state relevant to its function.

## Relationship to Context Engineering

Multi-agent systems are a system-level implementation of [Context Engineering](../concepts/context-engineering.md). The survey framework formalizes the context any agent receives as:

**C = A(c_instr, c_know, c_tools, c_mem, c_state, c_query)**

In a multi-agent system, `c_state` expands significantly: it must represent not just the current task state but the outputs and status of peer agents, shared world state, and coordination metadata. `c_mem` becomes a cross-agent concern rather than a per-agent one. The challenge of filling a finite context window with the right information intensifies because agents now compete for budget. [Source](../raw/deep/papers/mei-a-survey-of-context-engineering-for-large-language.md)

The comprehension-generation asymmetry identified in context engineering research bears directly on multi-agent design: models are better at understanding complex contexts than producing equally sophisticated outputs. This argues for investing coordination effort on the input side — richer briefings, better retrieval, cleaner context assembly — rather than expecting agents to compensate for poor context through better generation.

## Memory and State Management

Individual agents in a multi-agent system need both local and shared memory:

**Local agent memory** tracks an individual agent's working context, task history, and learned preferences. [Letta](../projects/letta.md)'s `memory_blocks` implement this as labeled, persistent state that survives across conversations — a `human` block and `persona` block in the simplest case, but extensible to arbitrary structured state.

**Shared knowledge base** stores outputs other agents should access. Design decisions include: who can write, who validates writes, how conflicts are resolved, how stale information is identified and evicted.

**Long-Term Memory across agent generations** is largely unsolved. Most current systems reset agent context between task runs, meaning learned patterns from one run do not inform the next unless explicitly persisted. [Agent Memory](../concepts/agent-memory.md) architectures — episodic, semantic, procedural — provide taxonomies for thinking about what to persist and how, but production implementations are still maturing.

## Failure Modes

### Cascading Hallucination

One agent produces a plausible but incorrect output. Downstream agents treat it as ground truth and build on it. The error compounds through the pipeline until it is embedded in the knowledge base and poisons every future agent that reads it. Mitigation: validation gates between production and persistence, with the validator isolated from the production process.

### Coordination Overhead Negates Parallelism

For simple tasks, the overhead of decomposition, dispatch, result aggregation, and inter-agent communication exceeds the cost of sequential single-agent execution. Multi-agent architectures add value when subtasks are genuinely parallelizable and take long enough to justify coordination cost. Applying them to tasks that a single agent could handle in seconds is architectural over-engineering.

### Context Budget Fragmentation

Each agent has a finite context window. In an orchestrator-worker system, the orchestrator must summarize worker outputs to fit them back into its own context. Summarization loses detail. At sufficient scale, the orchestrator's context fills with compressed summaries, and the precision of the original worker outputs is irretrievable.

### Conflicting Agent Outputs

Two agents independently reach contradictory conclusions. Without a principled conflict resolution mechanism, the system either blocks (waiting for consensus) or arbitrarily picks one output. Most frameworks lack formal conflict resolution; they rely on the orchestrator's judgment, which is itself subject to error.

### Prompt Injection Across Agent Boundaries

Malicious or corrupted content processed by one agent can inject instructions that alter another agent's behavior when the content is passed as context. This is harder to defend against in multi-agent systems than single-agent systems because each agent handoff is a new injection surface.

## When Not to Use Multi-Agent Systems

**Single-threaded tasks with no natural decomposition.** Writing a short document, answering a factual question, generating a code snippet — these do not benefit from parallelism and will complete faster with a single agent.

**Low-latency requirements.** Agent coordination adds round trips. If your task must complete in under a second, a swarm is the wrong tool.

**When you cannot afford to validate outputs.** Without a review layer, multi-agent systems amplify errors rather than catching them. If validation infrastructure is absent or too expensive, a single carefully prompted agent with human review is more reliable.

**When the team cannot debug distributed systems.** Multi-agent failures are harder to trace than single-agent failures. The bug may live in agent A's output, the orchestrator's parsing of that output, agent B's interpretation of the parsed result, or the conflict resolution logic. Teams without tooling for agent-level logging and replay will spend more time debugging than they save in parallelism.

## Practical Implications for Knowledge Base Builders

**Separate execution from validation structurally.** The supervisor agent should not share context with the agents it reviews. Architectural isolation produces cleaner judgment.

**Write to staging, not directly to permanent storage.** All agent outputs land in a draft state. A scoring pass promotes or rejects before persistence. This single discipline prevents the majority of cascading hallucination failures.

**Generate per-agent briefings from the shared knowledge base.** Rather than dumping full shared state into each agent's context, compile role-specific summaries. Each agent starts with what it needs; context budget is not wasted on irrelevant state.

**Think of the task decomposition as the hardest problem.** Getting parallelism right requires identifying truly independent subtasks. Misidentifying dependencies between subtasks produces race conditions or stale reads that are difficult to debug.

**Evaluate on coordination overhead, not just task accuracy.** A multi-agent system that achieves 90% accuracy with 10x the cost and 5x the latency of a single-agent 85% solution is often the worse choice in production.

## Unresolved Questions

The literature does not yet resolve: how to set agent count given a task's structure and the available compute budget; how to detect when coordination overhead has exceeded parallelism benefit at runtime; how to handle graceful degradation when one agent in a critical path fails; and how to maintain consistent agent behavior across model version updates when different agents in the same swarm run different model versions.

Governance of shared knowledge bases — who has write authority, how version conflicts are resolved, how to audit which agent wrote which fact — is treated as an implementation detail in most frameworks but becomes a correctness and reliability problem at scale.

## Related Concepts and Projects

- [Context Engineering](../concepts/context-engineering.md) — the underlying discipline governing what agents receive in context
- [Agent Memory](../concepts/agent-memory.md) — how individual agents persist state across interactions
- Long-Term Memory — mechanisms for cross-session memory relevant to persistent agent state
- [Letta](../projects/letta.md) — implements stateful agent architecture with `memory_blocks` enabling persistent multi-agent state
- [LangGraph](../projects/langgraph.md) — graph-based orchestration framework for multi-agent workflows
- [CrewAI](../projects/crewai.md) — role-based multi-agent framework with sequential and hierarchical execution modes
- [ReAct](../concepts/react.md) — the reasoning-action loop underlying individual agent behavior within multi-agent systems
- [Agentic RAG](../concepts/agentic-rag.md) — RAG systems where the agent decides when and what to retrieve, a building block for multi-agent retrieval pipelines
- [Self-Improving Agent](../concepts/self-improving-agent.md) — agents that modify their own behavior based on feedback, the target capability of research swarm architectures
- [Model Context Protocol](../concepts/mcp.md) — emerging standard for structured agent-to-tool and agent-to-agent communication
- [Karpathy Loop](../concepts/karpathy-loop.md) — the iterative experiment-observe-improve cycle that autoresearch swarms automate

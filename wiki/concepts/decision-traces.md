---
entity_id: decision-traces
type: concept
bucket: agent-memory
abstract: >-
  Decision Traces are records of agent reasoning steps, actions, and outcomes
  during task execution, serving as the raw substrate for debugging, harness
  optimization, and memory formation. Key differentiator: full trace access
  outperforms compressed summaries by 15+ accuracy points in self-improvement
  loops.
sources:
  - tweets/akoratana-context-graphs-will-be-to-the-2030s-what-databases.md
  - tweets/jayagup10-ai-s-trillion-dollar-opportunity-context-graphs.md
  - tweets/hwchase17-continual-learning-for-ai-agents.md
  - papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - articles/langchain-com-the-agent-improvement-loop-starts-with-a-trace.md
  - deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
  - deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md
  - repos/canvas-org-meta-agent.md
related:
  - meta-agent
  - claude-code
  - claude
  - knowledge-graph
last_compiled: '2026-04-07T11:56:20.200Z'
---
# Decision Traces

## What They Are

A decision trace is the complete record of what an agent did during a task: every LLM call, tool invocation, retrieved document, reasoning step, branching decision, and outcome. The term covers a spectrum from narrow (just the sequence of tool calls) to comprehensive (full prompt text, intermediate chain-of-thought, retrieved context, execution errors, retry attempts, and final outputs).

Traces sit at the intersection of three agent memory categories. They feed [Episodic Memory](../concepts/episodic-memory.md) (what happened during past runs), [Procedural Memory](../concepts/procedural-memory.md) (what action sequences work), and inform updates to [Semantic Memory](../concepts/semantic-memory.md) (what facts and patterns are durable). They are also the raw input for [Knowledge Graph](../concepts/knowledge-graph.md) construction when agents extract structured facts from past experience.

The [Yue et al. survey on workflow optimization](../raw/deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md) identifies execution traces as one of three distinct objects practitioners routinely conflate: workflow templates (designed offline), realized graphs (constructed per-query), and execution traces (what actually ran). This conflation causes real problems. A workflow can look correct at the template level, appear reasonable in its realized graph, and still fail consistently in ways only visible in the trace.

## Why They Matter

Agents fail in ways that are invisible without traces. A [ReAct](../concepts/react.md)-style agent might retrieve the right document, generate a plausible-looking answer, and still be wrong because it hallucinated a detail not present in the retrieved text. The intermediate retrieval result is in the trace. The reasoning step that ignored it is in the trace. The template and realized graph show nothing.

More concretely: the [Meta-Harness paper](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md) ran a direct ablation comparing three feedback conditions for an outer-loop optimizer that automatically improves agent harnesses. With scores only: 34.6 median accuracy. With scores plus compressed summaries: 34.9. With full execution trace access: 50.0. Summaries recovered 0.3 points of the 15.4-point gap. The causal signal needed to understand why something failed does not survive compression.

This result has broad implications. Any system that iteratively improves itself — whether through harness optimization, context updates, or fine-tuning — depends on feedback quality. Full traces are dramatically better feedback than any summary.

## How They Work

### What a Trace Contains

A complete decision trace records:

**Input context:** The task instruction, any retrieved documents, tool definitions, and system prompt as they were actually presented to the model. Not the template versions — the exact strings, including any dynamic insertion that happened at runtime.

**Reasoning steps:** For [Chain-of-Thought](../concepts/chain-of-thought.md) models, the intermediate reasoning text before the action decision. For [ReAct](../concepts/react.md) agents, the interleaved thought-action-observation sequences.

**Actions taken:** Tool calls with their exact arguments, not just the tool name. A file read that opened the wrong path is only diagnosable with the argument.

**Observations:** Tool outputs, error messages, empty results. An empty retrieval result is a critical signal that usually gets lost in summaries.

**Branching points:** Where the agent chose between alternatives, including alternatives it considered but rejected (when visible in chain-of-thought).

**Costs:** Token counts, latency, number of turns, and any API errors or retries.

**Outcomes:** The final answer, whether verification passed, and any evaluation scores.

### Storage and Retrieval

Traces are typically stored in one of three ways, each with different tradeoffs:

**Filesystem storage:** Raw directories containing individual run artifacts. This is what [Meta-Harness](../raw/deep/papers/lee-meta-harness-end-to-end-optimization-of-model-har.md) uses — the proposer agent reads a filesystem containing all prior candidates' code, scores, and traces. The advantage is that a capable LLM can navigate and query these files directly using file-reading tools, without requiring a predefined schema. The Meta-Harness proposer reads a median of 82 files per iteration.

**Structured databases:** [SQLite](../projects/sqlite.md) or [PostgreSQL](../projects/postgresql.md) with a schema designed for trace queries. Useful when you need to filter by outcome, task type, or date range programmatically. [LangChain](../projects/langchain.md) and [LangGraph](../projects/langgraph.md) use this approach in their tracing infrastructure.

**Vector stores:** Embedding trace summaries or chunks into a [Vector Database](../concepts/vector-database.md) for semantic retrieval. Useful for finding past traces similar to a current task, but loses the detail needed for causal analysis. Best combined with structured storage rather than replacing it.

### Trace-Derived Feedback

The [Yue et al. survey](../raw/deep/papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md) identifies trace-derived feedback as the most information-rich of four feedback signal types (the others: scalar metrics, verifier outputs, preference rankings). Trace-derived feedback involves an LLM analyzing execution traces to identify specific failure modes and suggest structural changes.

The Meta-Harness proposer demonstrates what this looks like in practice. After observing five consecutive regressions on TerminalBench-2, the proposer reasoned from trace analysis: "All prior iterations regressed because they modified the completion flow, prompt template, or observation processing. This takes a different approach — purely additive." This kind of causal attribution requires the full trace. A summary would show that five attempts failed. The trace shows why each failed and what they shared.

## Who Implements Them

**[Claude Code](../projects/claude-code.md)** generates traces of every agentic session, storing tool calls, bash outputs, and reasoning in session logs. These are the foundation for [CLAUDE.md](../concepts/claude-md.md) updates — when users ask Claude Code to remember something, it reads recent session history to extract the relevant fact.

**[Claude](../projects/claude.md)** records intermediate reasoning in extended thinking mode, producing traces of the chain-of-thought that preceded the final response. These are accessible to users and useful for debugging model behavior on specific inputs.

**[Meta-Agent](../concepts/meta-agent.md)** systems consume traces as their primary input. The canvas-org meta-agent ([source](../raw/repos/canvas-org-meta-agent.md)) stores all evaluation runs in `experience/<benchmark>/candidates/` and gives the proposer (Claude Code with Opus-class model) filesystem access to read them. The system improved TAU-bench scores from 67% to 87% on airline and retail tasks with no human-labeled data.

**[LangGraph](../projects/langgraph.md)** and LangSmith provide trace collection infrastructure for multi-step agents. Harrison Chase's analysis ([source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)) explicitly identifies traces as "the core" of all three continual learning layers (model, harness, context): "All of these flows are powered by traces — the full execution path of what an agent did."

**[Reflexion](../concepts/reflexion.md)** uses verbal self-reflection over traces to update agent behavior, though it compresses traces into natural language summaries before feeding them to the reflection module. The Meta-Harness ablation suggests this compression likely costs performance.

**[Voyager](../projects/voyager.md)** and similar skill-learning agents store successful execution traces alongside the skills they produced, enabling the agent to verify that a skill actually accomplishes what its docstring claims.

## The Three-Layer Learning Hierarchy

Traces fuel improvement at three distinct levels ([source](../raw/tweets/hwchase17-continual-learning-for-ai-agents.md)):

**Model layer:** Collect traces, filter to high-quality examples, fine-tune via SFT or [GRPO](../concepts/grpo.md). This is the slowest loop (training runs take hours to days) and carries [Catastrophic Forgetting](../concepts/catastrophic-forgetting.md) risk. Traces must be curated carefully before use as training data.

**Harness layer:** Read traces, identify failure patterns, modify the agent code and system prompt. Meta-Harness automates this. The canvas-org implementation runs outer loop iterations that each read full trace history and produce new `configs/*.py` candidates. This loop runs in minutes to hours depending on evaluation cost.

**Context layer (memory):** Extract facts, preferences, and behavioral guidelines from traces and store them in agent-accessible memory. This is the fastest loop — updates can happen within a single session. [Mem0](../projects/mem0.md), [Letta](../projects/letta.md), and [Zep](../projects/zep.md) all implement variants of this pattern. OpenClaw's "dreaming" (offline trace analysis to update SOUL.md) is a specific instance.

These loops are independent. A system can update context continuously while running harness optimization weekly and model fine-tuning monthly.

## Failure Modes

**Credit assignment in multi-step traces:** When a 20-step agent succeeds, it is genuinely difficult to determine which steps were causally important. Traces record what happened; they do not label which decisions were good. Optimizers that learn from traces must either assume the final outcome labels all intermediate steps (noisy) or use more sophisticated attribution methods (expensive).

**Trace volume and cost at scale:** A single complex agentic run can produce megabytes of trace data. Meta-Harness processes ~10 million tokens per optimization iteration. At standard API rates, this costs hundreds of dollars per iteration for a capable proposer model. For production systems with thousands of daily runs, storing and processing full traces requires explicit infrastructure planning. Most tracing implementations do not address this.

**Trace fidelity assumptions:** Traces record what the agent submitted to tools and what tools returned. They do not record the tool's internal state, external system changes that weren't returned, or race conditions in multi-agent settings. An agent debugging its own trace may have an incomplete picture of why a tool call failed.

**Selective trace storage:** Many implementations store only the final answer and evaluation score, discarding intermediate steps to save storage. This is the correct choice for high-volume low-stakes tasks, but it makes harness optimization and failure analysis impossible. Teams often discover this gap only when they need to debug a systematic failure.

**Privacy and confidentiality:** Traces contain the exact text shown to models, including any sensitive user data embedded in tool call arguments or retrieved documents. Trace storage systems need the same access controls as the underlying data sources — a requirement that many trace implementations skip.

## Relationship to Other Concepts

Decision traces are distinct from but closely related to several other agent memory types:

[Episodic Memory](../concepts/episodic-memory.md) is typically a compressed or selective record of past experiences. Traces are the raw input from which episodic memories are formed. The distinction matters: episodic memory is designed for agent consumption (compact, structured, retrievable), while full traces are designed for debugging and optimization (complete, often verbose, requiring post-processing to use).

[Agent Skills](../concepts/agent-skills.md) and [Skill Files](../concepts/skill-md.md) are often extracted from successful traces. Voyager explicitly does this: when an agent succeeds at a task, it stores the trace alongside the resulting skill code. Future skill proposals reference both.

[Context Engineering](../concepts/context-engineering.md) and [Context Compression](../concepts/context-compression.md) treat traces as inputs to be summarized for inclusion in agent context. The compression tradeoff is now empirically characterized: summaries recover almost none of the optimization value of full traces.

[Self-Improving Agent](../concepts/self-improving-agent.md) architectures treat traces as the primary mechanism for closing the improvement loop. The [Darwin Gödel Machine](../projects/darwin-godel-machine.md) stores execution traces in a shared pool that agent variants can read to propose self-modifications.

[LLM-as-Judge](../concepts/llm-as-judge.md) evaluation often operates on traces rather than just final outputs, allowing evaluators to assess whether the agent's reasoning process was sound even when the final answer is correct.

## Open Questions

**How much trace retention is optimal?** Meta-Harness reads all prior candidates' traces (median 82 files per iteration). It is unknown whether performance plateaus after some number of traces, or whether there are diminishing returns that would justify a recency-weighted retention policy.

**Does trace quality transfer across models?** Meta-Harness discovers harness configurations on Haiku 4.5 that transfer to held-out models. Whether execution traces from one model class are useful for improving a different model class (different capability level, different architecture) is unexplored.

**What is the right trace granularity for different use cases?** Full traces are optimal for harness optimization. Compressed summaries may be sufficient for episodic memory retrieval. Per-step annotations may be needed for credit assignment. No framework currently adapts trace storage granularity to downstream use case.

**Governance and access control at scale:** Who can read an organization's agent traces? Traces may contain proprietary workflows, user data, and model outputs that are sensitive. Standard tracing implementations provide no access control beyond storage-level permissions.

## When to Use Full Traces vs. Summaries

Store full traces when: you plan to run any optimization loop over agent behavior (harness improvement, fine-tuning, context extraction); you need to debug systematic failures; or you are in a research or evaluation context where understanding agent behavior is the goal.

Store compressed summaries when: storage costs are the binding constraint; the primary use case is episodic retrieval (finding past runs similar to a current task); or privacy requirements prevent storing raw prompt text.

The Meta-Harness result makes the cost of getting this wrong concrete: choosing summaries over full traces costs roughly 15 accuracy points in self-improvement systems.

## Alternatives and Complements

**[Reflexion](../concepts/reflexion.md):** Verbal self-reflection over task outcomes. Cheaper than full trace analysis but loses the causal detail needed for systematic improvement. Use when you want in-context adaptation without infrastructure for trace storage.

**[CLAUDE.md](../concepts/claude-md.md):** A persistent instruction file updated based on past interactions. This is the context-layer complement to traces — traces are the raw data; CLAUDE.md files are one distilled output.

**[Memory Evolution](../concepts/memory-evolution.md):** Frameworks like [MemEvolve](../projects/memevolve.md) treat the distillation of traces into persistent memory as a first-class problem, addressing what to keep and how to update existing memories when new traces arrive.


## Related

- [Meta-Agent](../concepts/meta-agent.md) — part_of (0.7)
- [Claude Code](../projects/claude-code.md) — implements (0.4)
- [Claude](../projects/claude.md) — implements (0.4)
- [Knowledge Graph](../concepts/knowledge-graph.md) — part_of (0.5)

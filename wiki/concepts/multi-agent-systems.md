---
entity_id: multi-agent-systems
type: concept
bucket: agent-systems
sources:
  - repos/alirezarezvani-claude-skills.md
  - papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/michaelliv-napkin.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
related: []
last_compiled: '2026-04-05T05:42:38.983Z'
---
# Multi-Agent Systems

## What It Is

A multi-agent system (MAS) coordinates multiple AI agents to accomplish tasks that a single agent handles poorly: tasks too long for one context window, tasks requiring specialized skills, tasks that benefit from independent verification, or tasks whose steps can run in parallel.

The core insight is that LLMs have fixed context windows and inconsistent performance across domains. Splitting work across specialized agents, or having agents check each other's output, often produces better results than asking one agent to do everything.

Multi-agent architectures have existed in traditional AI for decades, but LLM-based MAS became practically relevant around 2023, when agents became capable enough that coordination overhead was worth paying.

## Core Patterns

### Orchestrator-Worker

One agent (orchestrator) plans and delegates; worker agents execute. The orchestrator breaks a task into subtasks, assigns each to a worker, collects results, and synthesizes. The orchestrator doesn't necessarily do the hardest reasoning itself — it routes.

Example: a software engineering task where the orchestrator assigns the backend agent to write an API, the frontend agent to write the UI, and the test agent to write coverage. The orchestrator then reviews integration.

This pattern appears in claude-skills's orchestration protocol, which defines four coordination modes: Solo Sprint (persona switching across phases), Domain Deep-Dive (one persona plus stacked skills), Multi-Agent Handoff (personas reviewing each other's output), and Skill Chain (sequential skills with no persona). The handoff pattern is the closest to true multi-agent orchestration: one agent produces output, another critiques it before the result is accepted.

### Specialized Agents

Rather than configuring one agent with all available tools and context, specialized agents receive narrow context and purpose-specific tools. A RAG agent gets retrieval tools and document context; a code agent gets file system tools and execution environment; a critic agent gets the outputs of both.

Specialization helps for two reasons. Narrower context means the agent is less likely to confuse available tools or relevant information. Purpose-built prompts and tool sets outperform general ones on their target task.

Claude-skills packages this idea as "skills" — structured `SKILL.md` files plus domain-specific Python CLI tools, scoped to one domain (security auditing, RAG architecture, regulatory compliance). Skills are modular enough to compose across different orchestration platforms (Claude Code, Cursor, Codex) without rewriting.

### Critic/Verifier Patterns

One agent generates; another evaluates. This exploits an asymmetry: LLMs are often better at judging quality than producing it on the first try. A critic agent reviewing code for security vulnerabilities, or a QA agent running generated tests against generated code, catches errors the generator couldn't see in its own output.

The failure mode: critics trained on similar data to generators share similar blind spots. If both agents would answer a question the same way, having one critique the other adds latency but not correctness.

### Parallel Execution

Independent subtasks run simultaneously rather than sequentially. If a research task requires gathering information from five separate sources, five agents working in parallel finish faster than one agent working sequentially. The orchestrator waits for all results, then synthesizes.

Parallelism requires the orchestrator to correctly identify task independence. Incorrectly parallelizing dependent tasks (where agent B's work depends on agent A's output) produces bad results. This dependency analysis is itself a planning task the orchestrator must perform correctly.

## How It Works: Context Engineering View

The context engineering survey frames MAS as one of three high-level implementations of context engineering, alongside RAG and memory systems. In MAS, each agent maintains its own context window, but agents share information by passing structured outputs (tool results, summaries, intermediate artifacts) into each other's contexts.

This creates an information routing problem: what does each agent need to see, and in what form? An orchestrator passing a full 50-page document to a worker agent wastes tokens and may cause the worker to lose focus. Passing a compressed summary loses detail. The right level of compression is task-dependent and hard to get right automatically.

Progressive disclosure — the principle that agents should request only the information they need, at the level of detail they need — applies directly here. Napkin's L0-L3 model (overview → search → read) implements this for memory retrieval, but the same principle governs inter-agent information passing. An orchestrator should tell a worker agent what it needs to know, not dump its full context.

## Context and Memory Across Agents

Agents in a system do not share memory by default. Each agent starts with whatever context it's given. This means coordination requires explicit design decisions:

- **What shared state exists?** Often an external store (database, file system, message queue) that all agents can read and write.
- **How does an agent learn what other agents have done?** Either the orchestrator passes summaries, agents read from shared state, or a message-passing protocol routes outputs.
- **What happens when agents produce conflicting outputs?** The orchestrator must resolve conflicts, which requires knowing they exist.

Napkin's architecture illustrates one approach: a shared markdown vault that agents read (via BM25 search at session start) and write (via distillation at session end). Multiple agents could work against the same vault, with the backlink graph and keyword index giving each agent navigable access to what the others have deposited. The auto-distillation pattern — read context at session start, write new knowledge at session end — generalizes to multi-agent settings.

## Tool Use and Specialization

Agents acquire capabilities through tools: function calls, API access, file system operations, browser control, code execution. The tool set available to an agent defines what it can do, and restricting tools is one way to enforce specialization.

A worker agent with only file system read/write tools cannot accidentally make API calls. A research agent with only web search and summarization tools cannot modify the codebase. Tool restriction is a form of capability boundary that reduces the blast radius of agent errors.

Tool schemas matter. An orchestrator needs to know what tools workers expose in order to delegate correctly. Claude-skills's POWERFUL-tier agent-designer skill addresses this directly: it handles "multi-agent orchestration, tool schemas, performance evaluation" — the tool schema problem is listed as a first-class concern.

## Failure Modes

### Cascading Errors

Errors in upstream agents propagate downstream. If agent A produces a flawed plan, agent B executes the flawed plan, and agent C validates work built on the flawed plan, the final output is wrong and each step was "correct" given its inputs. The orchestrator sees plausible outputs at each stage without detecting the upstream error.

This is the most serious failure mode. Mitigation: checkpoint validation at stage boundaries, not just at the end. Have the orchestrator (or a dedicated critic) review intermediate outputs before passing them forward.

### Coordination Overhead Exceeding Benefit

Decomposing a task into subtasks, passing context between agents, synthesizing outputs — all of this takes tokens and time. For tasks that one capable agent handles well, multi-agent coordination produces slower, more expensive results.

The decision to use multiple agents should be driven by a clear reason: context window limits, need for specialization, independent verification, or parallelism. Using MAS because it seems more sophisticated is a reliable way to build something worse than a single well-prompted agent.

### Inter-Agent Hallucination

Agents can hallucinate information about other agents' outputs if summaries are imprecise. An orchestrator telling a worker "the research agent found that X" when the research agent said something more nuanced ("X appears to be true in most cases, but...") can cause the worker to proceed on false premises. Precise structured handoffs — JSON rather than natural language summaries — reduce but don't eliminate this.

### Shared Blind Spots

Critic-generator patterns assume the critic and generator have different failure modes. When both are the same underlying model with similar training, they share failure modes. The critic is most useful when it has genuinely different capabilities: different training, different tools, or different information access.

### State Synchronization

When multiple agents write to shared state concurrently, conflicts arise. Two agents both updating the same document, or both marking a task as "in progress" when only one should proceed, requires coordination primitives (locks, versioning, conflict resolution). Most LLM agent frameworks do not provide these out of the box.

## Infrastructure Assumptions

MAS architectures carry hidden infrastructure requirements that documentation understates:

**Reliable tool execution.** Agents calling tools expect deterministic responses. In practice, API rate limits, network timeouts, and service outages cause tool calls to fail mid-task. Recovery requires either retry logic, checkpointing, or orchestrator awareness of partial completion.

**Prompt stability across agents.** If agents are different model versions, or the same model served from different infrastructure with different system prompts, behavior diverges in ways that are hard to detect. The orchestrator assumes consistent agent behavior; inconsistency causes unpredictable coordination failures.

**Cost at scale.** A task requiring five agents, each making ten LLM calls, costs 50x a single-call solution. At development scale, this is fine. At production scale with many users, costs compound fast. This arithmetic rarely appears in architecture documentation.

**Latency stacking.** Sequential agent calls stack latency. Ten sequential steps at 2 seconds each is 20 seconds of wall time. Users who tolerate 2-second single-agent responses may not tolerate 20-second multi-agent responses for the same task.

## Unresolved Questions

**Optimal decomposition.** No general method exists for deciding how to split a task across agents. Current practice is heuristic: split by domain, by context window limits, or by parallelizability. Research on automatic task decomposition is active but not settled.

**Evaluation.** Evaluating single-agent output is hard; evaluating multi-agent system output is harder. Which agent caused a bad result? Was the orchestrator's decomposition wrong, the worker's execution wrong, or the synthesis wrong? Attribution is unclear, which makes debugging and improvement difficult.

**Governance and trust boundaries.** When an orchestrator agent delegates to a worker agent, how much should the worker trust the orchestrator's instructions? If the orchestrator is compromised (via prompt injection, for example), a fully trusting worker will execute malicious instructions. Trust hierarchies in MAS are architecturally underspecified.

**Long-running coordination.** Most MAS research and tooling assumes tasks complete in a single session. Tasks that run over hours or days, with agents that may restart or be replaced, require persistent state and coordination protocols that don't exist in most current frameworks.

## When Not to Use It

Avoid multi-agent architectures when:

- A single context window is sufficient. If the task fits in one agent's context, coordination adds cost without benefit.
- Correctness requirements are high and verification is hard. Cascading errors in MAS are difficult to catch, and debugging across agent boundaries is painful.
- Latency matters. Sequential multi-agent pipelines are slow. Parallel pipelines require infrastructure to coordinate.
- The task doesn't decompose cleanly. Tasks with tight interdependencies between steps don't parallelize well and produce incoherent results when distributed across agents without careful dependency management.
- Budget is constrained. Multi-agent systems multiply LLM API costs. A five-agent system with ten calls per agent costs 50x a single-call solution.

## Alternatives

**Single agent with more tools.** Before adding agents, add tools. A single agent with web search, code execution, and file system access handles many tasks that naive multi-agent decomposition handles less reliably.

**Longer context single agent.** As context windows expand (1M+ tokens), some tasks previously requiring multiple agents fit in one. Re-evaluate whether decomposition is still necessary.

**RAG over MAS.** If the goal is accessing more information than fits in context, RAG retrieves relevant information into a single agent's context. Simpler than coordination, and napkin's benchmark results (91% on LongMemEval-S with BM25 + progressive disclosure) show that well-implemented retrieval handles many "multi-agent" memory tasks with one agent.

**Structured workflows over dynamic agents.** For predictable task sequences, a deterministic workflow (step A always precedes step B) is more reliable than an orchestrator dynamically planning each run. Agents work best for variable, adaptive coordination; fixed pipelines work better for stable, predictable processes.

## Related Concepts

- [Context Engineering](../concepts/context-engineering.md): The systematic design of information provided to LLMs — MAS is one architectural pattern within this discipline
- [RAG](../concepts/rag.md): An alternative to multi-agent coordination for information access
- [Agent Memory](../concepts/agent-memory.md): How persistent state is maintained across agent interactions

## Sources

- [Context Engineering Survey](../../raw/papers/mei-a-survey-of-context-engineering-for-large-language.md): Taxonomy placing MAS as an implementation pattern alongside RAG and memory systems
- [Napkin Architecture](../../raw/repos/michaelliv-napkin.md): Concrete implementation of shared memory for multi-agent coordination, with benchmark results
- [Claude Skills](../../raw/repos/alirezarezvani-claude-skills.md): Skill-based specialization and orchestration patterns across 11 agent platforms

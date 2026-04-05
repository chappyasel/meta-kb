---
entity_id: crewai
type: project
bucket: agent-systems
sources:
  - repos/wangziqi06-724-office.md
  - repos/caviraoss-openmemory.md
  - repos/mem0ai-mem0.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/mem0ai-mem0.md
  - deep/papers/mei-a-survey-of-context-engineering-for-large-language.md
  - deep/repos/memento-teams-memento-skills.md
related: []
last_compiled: '2026-04-05T05:27:20.803Z'
---
# CrewAI

## What It Does

CrewAI is a Python framework for orchestrating groups of AI agents that collaborate on tasks through defined roles, goals, and handoff sequences. Each agent gets a role description, a goal, and optionally a backstory; a "crew" ties those agents together with a set of tasks and an execution strategy. The central pitch: decompose complex work into agent-specific responsibilities rather than stuffing everything into one long prompt.

The framework ships two execution modes. Sequential mode runs tasks in order, passing output from one agent as context to the next. Hierarchical mode introduces a manager agent that assigns tasks dynamically based on agent capabilities, mimicking a team lead routing work.

## Architecture

CrewAI's core abstractions are four classes that compose into a runtime:

- **`Agent`** — holds `role`, `goal`, `backstory`, `tools`, and `llm` config. At runtime, these fields get injected into a system prompt template.
- **`Task`** — defines `description`, `expected_output`, and optionally `agent` (assigning it to a specific agent) or leaving assignment to a manager.
- **`Crew`** — the orchestrator. Takes a list of agents and tasks, plus `process` (sequential or hierarchical), and runs the execution loop.
- **`Tool`** — wraps any callable with a name and description so the agent's LLM can decide to invoke it via function calling.

The execution loop in sequential mode is straightforward: Crew iterates tasks, builds a prompt from the assigned agent's identity fields plus the task description plus any prior task outputs, calls the LLM, parses tool calls if present, executes them, and stores the result. That result becomes available as context for subsequent tasks.

Hierarchical mode adds a manager LLM that receives all task descriptions and agent profiles, then emits delegation decisions. The manager is itself an LLM call, which means it can fail or make suboptimal routing choices without the framework detecting this.

Memory is optional and pluggable. CrewAI supports short-term memory (conversation context within a task), long-term memory (persistent storage across runs, backed by vector search), and entity memory (extraction of named entities). The memory system integrates with external providers including Mem0 ([Mem0 integration](https://docs.mem0.ai/integrations/crewai)), which adds cross-session retrieval.

## Key Numbers

GitHub stars are not available in the source material. The framework appears in multiple agent framework comparisons and skills libraries ([AI Research Skills Library](../../raw/repos/orchestra-research-ai-research-skills.md)) as one of four major agent frameworks alongside LangChain, LlamaIndex, and AutoGPT, suggesting meaningful adoption. No independent benchmark comparisons of task completion rates versus alternatives are available in the sources. Performance claims on the website are self-reported.

## Strengths

**Role-based prompting reduces prompt engineering overhead.** Giving each agent a `role` and `backstory` produces more consistent behavior than ad-hoc per-task system prompts, because the agent's identity stays stable across the tasks it handles.

**Sequential handoffs are transparent.** Each task's output is a concrete string that gets logged and passed forward. Debugging a broken workflow means reading those strings in order, which is more tractable than inspecting hidden state in a monolithic chain.

**Tool integration is shallow but sufficient.** Wrapping a function as a Tool requires minimal boilerplate, and the LLM receives the tool description in its context window to decide when to call it. This works well when the tool set is small and descriptions are clear.

**Low barrier to entry.** A working two-agent crew with sequential tasks runs in under 30 lines. The framework doesn't require understanding graph structures, message passing protocols, or custom serialization.

## Critical Limitations

**Concrete failure mode: prompt bloat in hierarchical mode.** The manager agent receives all agent profiles and all task descriptions in a single context window. For crews with more than 5–6 agents or tasks with long descriptions, this context grows quickly. The manager's routing decisions degrade as the context fills, and the framework provides no mechanism to detect or recover from a malformed delegation — it proceeds with whatever the manager outputs, including hallucinated agent names or skipped tasks.

**Unspoken infrastructure assumption: single-process execution.** CrewAI runs agents synchronously within one Python process by default. Parallelism requires explicit `async` configuration or external orchestration. Production deployments that need concurrent crew executions must manage process isolation, state separation, and LLM rate limits themselves. The framework doesn't address how to run 50 simultaneous crews against shared API quotas.

## When Not to Use It

**Don't use CrewAI for latency-sensitive applications.** Each task is a blocking LLM call. A five-task sequential crew with no tool calls takes at minimum five round-trips to the LLM provider. If your workflow needs sub-second responses, this architecture is the wrong choice regardless of how you tune it.

**Don't use it when you need reliable control flow.** CrewAI delegates decisions about tool use and task interpretation to the agent's LLM. If your workflow requires deterministic branching — "if the analysis returns X, route to handler A; otherwise route to handler B" — you will spend more time fighting the framework's probabilistic behavior than you would implementing the logic directly.

**Don't use it for workflows where agent coordination needs to be audited.** The framework logs task outputs but doesn't produce a structured record of which agent made which decision and why. Compliance-heavy contexts need more than string logs.

## Unresolved Questions

**Conflict resolution between agents is undefined.** When two agents in a crew reach contradictory conclusions, no documented protocol exists for how the crew resolves this. The task that receives both outputs must somehow reconcile them, which falls entirely on the next LLM call.

**Cost at scale is undocumented.** A crew of five agents running a ten-task workflow makes at minimum ten LLM calls, but tool use and retry logic multiply this. The framework doesn't expose token budgets, cost estimates, or circuit breakers.

**Manager agent reliability.** In hierarchical mode, the manager is an LLM prompt with no fallback. If the manager delegates to a nonexistent agent or misinterprets a task requirement, the crew fails in ways that may not be obvious from the error output.

**Long-term memory persistence and ownership.** CrewAI's memory layer supports vector storage but the documentation doesn't specify what happens to stored memories when agent configurations change, who owns that data in a multi-tenant deployment, or how to purge stale memories.

## Alternatives

- **LangChain Agents** — Use when you need a larger ecosystem of integrations (500+) and are comfortable with more configuration complexity. Better for single-agent workflows with heavy tool use.
- **LangGraph** — Use when your workflow needs explicit state machines, conditional branching, or cycles. Gives up ease-of-setup for reliable control flow.
- **AutoGen (Microsoft)** — Use when you need conversational back-and-forth between agents rather than structured task handoffs. Better for debate-style or negotiation-style multi-agent patterns.
- **Direct LLM calls with a task queue** — Use when your "crew" is really just a pipeline of transformations. Three sequential LLM calls with explicit prompts are more debuggable than a three-agent crew running the same logic through an abstraction layer.

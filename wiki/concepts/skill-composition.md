---
entity_id: skill-composition
type: concept
bucket: agent-systems
abstract: >-
  Skill Composition chains individual agent capabilities into complex multi-step
  workflows, distinguishing itself through composability primitives (context
  passing, conflict resolution, tool-chaining) rather than monolithic prompt
  design.
sources:
  - repos/affaan-m-everything-claude-code.md
  - repos/yusufkaraaslan-skill-seekers.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
related:
  - mcp
last_compiled: '2026-04-07T00:55:57.780Z'
---
# Skill Composition

## What It Is

Skill composition is the practice of combining discrete, reusable agent capabilities into larger workflows. A single agent skill handles one thing well: querying a database, formatting output, calling an API. Skill composition connects those atoms into molecules — a research workflow that retrieves, summarizes, cross-references, and stores results across coordinated agent calls.

The concept sits at the boundary between [Procedural Memory](../concepts/procedural-memory.md) (how skills get stored and recalled) and [Multi-Agent Systems](../concepts/multi-agent-systems.md) (how agents hand off work to one another). It answers a practical question: once you have a library of skills, how do you wire them together without losing context, creating conflicts, or compounding errors?

## Why It Matters

Individual LLM capabilities cap out quickly on complex tasks. A single prompt cannot reliably plan, execute, verify, and store results across a multi-hour workflow. Composition lets builders decompose tasks into steps where each step can be tested, debugged, and swapped independently.

The practical payoff is accumulation. An agent that composes skills persistently — extracting patterns from sessions, building instinct libraries, evolving those instincts into new skills — improves over time without retraining the underlying model. The [everything-claude-code](../repos/affaan-m-everything-claude-code.md) project demonstrates this: its `/evolve` command clusters related instincts from session history into new reusable skills, and `/instinct-status` tracks confidence levels across the resulting library. This is skill composition as a continuous process rather than a one-time design decision.

## Core Mechanisms

### Sequential Chaining

The simplest form: skill A's output becomes skill B's input. A `/plan` command generates a structured implementation blueprint, which `/tdd` consumes to enforce write-tests-first discipline, which `/code-review` then evaluates. Each skill in the chain expects a specific input format and produces a specific output format. Context flows forward; earlier results remain accessible.

In practice, everything-claude-code implements this through its `commands/` directory, where skills like `plan.md`, `tdd.md`, and `code-review.md` are designed to operate on shared session context rather than isolated prompts. The hooks architecture in `hooks/hooks.json` runs `session-start.js` and `session-end.js` to persist context across sessions, so compositions survive process restarts.

### Parallel Orchestration

Some workflows benefit from running skills concurrently. The `multi-execute` command in everything-claude-code spawns independent agent processes (backed by `ccg-workflow` runtime and git worktrees) to run backend and frontend analysis simultaneously, then merges results. This requires explicit merge logic — parallel skills can produce conflicting outputs, and the system needs a resolution strategy before passing results downstream.

[LangGraph](../projects/langgraph.md) formalizes this as a directed acyclic graph where nodes are skills and edges carry typed data. The graph structure makes parallelism explicit and traceable, which helps with debugging composed workflows.

### Tool Chaining via MCP

[Model Context Protocol](../concepts/mcp.md) provides a standard interface for skills to call external tools, making composition tool-agnostic. A skill that generates code can call a test-runner tool, receive failure output, call a code-fix tool, and loop until tests pass — all within one composed workflow. The protocol handles serialization and transport; the skill handles logic.

Skill Seekers demonstrates this at the data-preparation layer: its 34-tool MCP server exposes `scrape_docs`, `detect_conflicts`, `enhance_skill`, and `package_skill` as discrete callable tools. Any MCP-compatible agent can compose these into a full documentation-to-deployment pipeline without knowing their internals.

### Self-Improving Composition

The [Darwin Gödel Machine](../projects/darwin-godel-machine.md) takes composition a step further: it treats the composition graph itself as mutable. Starting from an archive of coding agents, it samples an existing agent, uses a foundation model to generate a variation, validates the variation on benchmarks (SWE-bench, Polyglot), and adds successful variants back to the archive. The composition tree grows through empirical validation rather than manual design.

This matters because it shows skill composition as a search problem. Given a library of skills and a performance signal, you can automate the discovery of which compositions work. The DGM's 20% → 50% improvement on SWE-bench came from autonomously discovering better code-editing tools, context management strategies, and peer-review mechanisms — not from a human designing those compositions upfront.

## Data Structures and Formats

Skills in file-based systems (SKILL.md format) carry YAML frontmatter defining their interface: what inputs they expect, what tools they can invoke, what outputs they produce. This acts as a lightweight type signature for composition. A skill that expects `file_path` as input and produces `review_comments` as output can be safely composed with any skill that generates `file_path`.

In everything-claude-code's `skills/continuous-learning-v2/` system, instincts carry confidence scores and decay parameters. The `/evolve` command clusters instincts by semantic similarity and promotes high-confidence clusters to full skills. This is composition at the knowledge level: raw session patterns aggregate into structured capabilities.

Skill Seekers uses a different data model: its `SkillAdaptor` abstract class in the `Adaptors` module defines a platform-specific packaging contract, while the `CLIDispatcher` handles routing. The same scraped content passes through different adaptor implementations to produce LangChain `Documents`, LlamaIndex `TextNodes`, or Claude-ready ZIP files — one composition pipeline, multiple output targets.

## Conflict Detection

Composed skills can disagree. Documentation-derived skills may assert different behavior than code-analysis-derived skills. Skill Seekers' unified scraping mode runs explicit conflict detection when combining documentation and GitHub sources, flagging:

- APIs documented but absent from code (missing in code, high severity)
- Code functions with no documentation (missing in docs, medium severity)
- Parameter signature mismatches between docs and implementation

This surfaces composition failures before they propagate. Without this, a downstream skill might receive contradictory information and produce unreliable output.

## Failure Modes

**Context window fragmentation.** Long compositions accumulate context until they hit window limits. Each additional skill in a chain adds to the running context. Without active management (compaction, strategic truncation, context graphs), composed workflows degrade as they grow. The everything-claude-code `strategic-compact` skill addresses this by suggesting compaction at logical task boundaries, but this requires the operator to configure compaction thresholds correctly. The default 95% threshold is too late for complex compositions.

**Skill interface drift.** As individual skills evolve, their input/output contracts can change silently. A skill updated to produce structured JSON where it previously produced markdown will break any downstream skill that expected markdown. File-based skill systems (SKILL.md) lack enforcement of these contracts. Teams relying on composed workflows need versioning and compatibility testing that most current implementations don't provide.

**Error amplification.** In sequential chains, a skill that produces plausible-but-wrong output passes its error forward. Subsequent skills treat that output as ground truth. By step four or five of a pipeline, the original error is embedded deeply enough that the final output looks coherent but is wrong. Verification loops (running checks after each step) partially mitigate this, but add latency and cost.

## Implementation Patterns

**Skill libraries with semantic retrieval.** Store skills with embeddings; retrieve relevant skills at runtime based on task description. [SkillWeaver](../projects/skillweaver.md) and [Voyager](../projects/voyager.md) demonstrate this pattern for game-playing agents: skills accumulate in a vector-indexed library, and the agent queries the library before attempting new tasks. The same pattern applies to coding agents.

**Verification loops.** After each skill in a composition chain, run a lightweight evaluation: did tests pass? Did the output schema match expectations? The eval-harness and verification-loop skills in everything-claude-code implement this as explicit checkpoints. Pass the checkpoint to continue; fail the checkpoint to retry or escalate.

**Declarative DAG orchestration.** Specify the composition graph in configuration rather than code. [LangGraph](../projects/langgraph.md) and [CrewAI](../projects/crewai.md) provide this: nodes are skills, edges carry state, and the framework handles scheduling, retries, and state persistence. This separates workflow logic from skill logic, making each independently testable.

## Infrastructure Assumptions

Skill composition assumes persistent shared state between skill invocations. In practice this means:

- A session state store that survives between calls (SQLite state store in everything-claude-code's `scripts/` directory, or equivalent)
- Tool execution environments that behave consistently (sandboxed subprocess or containerized execution)
- Token budget headroom sufficient for the full composition chain

The unspoken assumption is that skill invocations are cheap enough to chain. At Opus 4 pricing with 200k context windows, a six-skill composition pipeline with verification loops can cost several dollars per run. Most implementations don't expose per-composition cost accounting, which makes budget planning difficult at scale.

## When Not to Use It

Skill composition adds overhead. For single-step tasks with clear inputs and outputs, direct prompting outperforms a composed pipeline on latency and cost. If the task fits in one context window and doesn't require external tool calls, composition introduces coordination complexity without benefit.

Avoid composition when skill interfaces are unstable. If the skills in your library change frequently and lack versioned contracts, composed workflows become brittle maintenance burdens. Stabilize individual skills before composing them.

Don't use file-based skill composition for latency-sensitive applications. Reading, parsing, and routing across SKILL.md files adds overhead that matters in interactive contexts. In-process skill registries with precompiled routing are faster for production systems with strict response time requirements.

## Unresolved Questions

**How do you test composed workflows systematically?** Individual skills can be unit-tested, but composed workflows involve emergent behaviors that don't appear in isolated tests. There's no standard evaluation harness for composition chains analogous to unit testing for functions.

**Who owns conflict resolution in multi-team skill libraries?** When two teams contribute skills that produce incompatible outputs for the same input, what's the resolution process? Current implementations leave this to the operator.

**What's the cost ceiling at scale?** A composed workflow that costs $0.50 per run becomes $50,000 at 100,000 runs per day. None of the current implementations provide composition-level cost modeling before execution.

**How do composed skills handle partial failures in production?** If skill three of six fails mid-execution, recovery strategies vary widely. Most systems retry from the beginning, discarding completed work. Checkpoint-and-resume exists in some implementations but isn't standardized.

## Related Concepts and Projects

- [Agent Skills](../concepts/agent-skills.md) — the atomic units that composition combines
- [Procedural Memory](../concepts/procedural-memory.md) — how skills persist across sessions
- [Model Context Protocol](../concepts/mcp.md) — the tool-calling standard that enables cross-system composition
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — composition across agent boundaries
- [Context Engineering](../concepts/context-engineering.md) — managing context as composition chains grow
- [ReAct](../concepts/react.md) — the reasoning-action loop that underlies many composed workflows
- [Self-Improving Agent](../concepts/self-improving-agent.md) — systems that compose and improve their own skill libraries
- [Darwin Gödel Machine](../projects/darwin-godel-machine.md) — empirical validation of composed agent variants
- [SkillWeaver](../projects/skillweaver.md) — skill synthesis and retrieval for agent libraries
- [Voyager](../projects/voyager.md) — skill accumulation in open-ended environments
- [LangChain](../projects/langchain.md) — sequential chain implementation
- [LangGraph](../projects/langgraph.md) — graph-based composition with state management
- [Agent Workflow Memory](../projects/agent-workflow-memory.md) — workflow-level memory for composed tasks

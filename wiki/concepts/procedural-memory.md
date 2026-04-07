---
entity_id: procedural-memory
type: concept
bucket: agent-memory
abstract: >-
  Procedural memory in AI agents stores executable how-to knowledge (skill
  programs, workflow templates, task procedures) separate from episodic or
  semantic memory, enabling reuse of learned action sequences across tasks
  without re-derivation.
sources:
  - repos/mirix-ai-mirix.md
  - repos/caviraoss-openmemory.md
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - deep/repos/caviraoss-openmemory.md
related:
  - episodic-memory
  - semantic-memory
  - vector-database
  - mcp
  - mem0
last_compiled: '2026-04-07T11:45:17.121Z'
---
# Procedural Memory

## What It Is

Procedural memory is the component of an [Agent Memory](../concepts/agent-memory.md) system that stores *how to do things* rather than *what happened* ([Episodic Memory](../concepts/episodic-memory.md)) or *what is true* ([Semantic Memory](../concepts/semantic-memory.md)). The distinction maps from cognitive science: humans tie their shoes without consciously recalling learning to tie them. An agent with procedural memory can execute a checkout flow on an e-commerce site without re-deriving each step from first principles.

In agent systems, procedural memory takes several concrete forms:

- **Workflow templates**: Abstract multi-step procedures with placeholders (e.g., "to purchase an item: {navigate to product} → {select variant} → {add to cart} → {checkout}")
- **Skill programs**: Executable code or structured action sequences callable by name
- **Prompt-embedded procedures**: How-to instructions injected into system prompts at inference time
- **Fine-tuned behaviors**: Procedures baked into model weights through training

The boundary between procedural memory and the other memory types matters for implementation. [Semantic Memory](../concepts/semantic-memory.md) answers "what is X?" while procedural memory answers "how do I do X?" The same agent may store "OAuth requires a client ID and secret" as semantic knowledge while separately storing "to authenticate with GitHub API: generate state token → redirect to /authorize → exchange code for token" as procedural knowledge.

## Why It Matters

Without procedural memory, agents re-derive common action sequences from scratch on each task. This is slow, inconsistent, and wastes context window space. A coding agent that re-figures out how to run a test suite from documentation every time it encounters a test file performs worse than one that has internalized "run `pytest -xvs` from the project root."

The more concrete gain is transfer across tasks. [Agent Workflow Memory](../projects/agent-workflow-memory.md) demonstrated this directly: agents with induced workflow templates achieved 35.5% success on WebArena versus 23.5% for baselines, and they outperformed *human-engineered* workflows (33.0% from SteP) by 2.5 points — while using fewer steps per task (5.9 vs 7.9). This efficiency gain is procedural memory's signature: not just doing tasks correctly, but doing them with fewer actions.

Procedural memory also enables a form of self-improvement that neither episodic nor semantic memory supports. An agent can observe its own successful action sequences, abstract them into reusable procedures, and apply those procedures to future tasks. This is the core loop in systems like [Agent Workflow Memory](../projects/agent-workflow-memory.md), [Voyager](../projects/voyager.md), and the skill accumulation component of [GEPA](../concepts/gepa.md).

## How It Works: Implementation Patterns

### Pattern 1: Workflow Induction (AWM)

[Agent Workflow Memory](../projects/agent-workflow-memory.md) implements procedural memory as plain-text workflow files, one per website or domain. The induction pipeline works in three phases:

**Induction**: Given a set of successful task trajectories, an LLM is prompted to abstract common patterns. Concrete values become placeholders: `click on the red Nike shoes in size 10` becomes `navigate to {product}`. The prompt uses a fixed one-shot example to guide the abstraction format. In `offline_induction.py`, this runs on ground-truth annotated examples; in `online_induction.py`, on the agent's own past trajectories.

**Storage**: Abstracted workflows save as text files (`workflow/shopping.txt`, `workflow/gitlab.txt`). No database, no embeddings, no retrieval index — the entire file for a given website loads into context.

**Utilization**: At inference time, `memory.py` reads the relevant workflow file and prepends it to the prompt as a system-role message. The agent sees both abstract workflows (what steps to take) and concrete exemplars (how those steps look in practice).

The snowball property matters here: AWM's workflows build on each other. A "log in" workflow becomes a component of a "purchase item" workflow, which becomes a component of "return a purchase." Simple procedures compose into complex ones without requiring the LLM to re-derive the composition.

### Pattern 2: Skill Libraries (Voyager)

[Voyager](../projects/voyager.md) implements procedural memory as a library of executable JavaScript programs for Minecraft. Each skill is a function with a descriptive name and docstring. The skill library indexes by embedding, enabling semantic retrieval: an agent planning to build a shelter queries for skills related to "gathering wood" and "placing blocks" rather than loading all skills.

The key difference from AWM is *executability*. AWM workflows are textual guides that the LLM interprets during action prediction. Voyager skills are programs the agent runs directly, bypassing LLM interpretation for known procedures.

### Pattern 3: Prompt-Embedded Rules (CLAUDE.md)

The simplest form of procedural memory is explicit instructions in a system prompt or project-level file. [CLAUDE.md](../concepts/claude-md.md) files encode procedures like "always run `npm test` before committing" or "use the `gh` CLI for GitHub operations rather than the API." These are procedural in the cognitive science sense — they specify how to accomplish tasks — but require no retrieval mechanism. The agent reads them at context load time.

This pattern's limitation is scale: a file stuffed with hundreds of procedures creates context bloat and the agent struggles to apply the right procedure in context. The more sophisticated patterns above address this through retrieval.

### Pattern 4: Sector-Specific Memory with Decay (OpenMemory, Mirix)

Projects like [OpenMemory](../projects/supermemory.md) and Mirix classify memories into explicit sectors — episodic, semantic, procedural, emotional, reflective — and apply different storage and retrieval parameters to each.

In OpenMemory's `src/memory/hsg.ts`, procedural memories get `decay_lambda: 0.008` (slower decay than episodic events at 0.015, faster than semantic facts at 0.005) and `weight: 1.1` (slightly elevated retrieval priority). The sector classification itself uses regex matching: patterns like `/\b(how to|step[s]? to|process for)\b/i` route content to the procedural sector.

Mirix runs a dedicated `procedural_memory_agent` as one of six specialized agents. Each memory agent manages its own PostgreSQL store and applies different consolidation logic. The separation enables domain-specific retrieval: querying procedural memory for "how do I reset my password" routes to the procedural agent rather than scanning across all memory types.

### Pattern 5: Cognitive Architecture Integration (Letta/MemGPT)

[Letta](../projects/letta.md) exposes procedural memory as part of its tiered memory model. Core memory (always in context) can hold key procedures; archival memory (retrieved on demand) stores the full procedure library. The agent uses tool calls to explicitly manage what procedures load into context, giving it meta-cognitive control over its own procedural knowledge.

[Elasticsearch's CoALA-based implementation](../projects/elasticsearch.md) treats procedural memory as living primarily in application code and prompts rather than in a database. The agent's decision about *when* to retrieve episodic memories and *how* to use tools is itself procedural knowledge — baked into the prompt rather than retrieved dynamically. This framing separates the *mechanism* of memory management (procedural) from the *content* of memories (episodic, semantic).

## The Self-Improvement Loop

Procedural memory enables a specific class of agent self-improvement that other memory types don't support. The loop runs:

1. Agent attempts a task, generates a trajectory
2. Trajectory evaluation (automated or human) marks it successful or failed
3. Successful trajectories get abstracted into reusable procedures
4. Future tasks load the expanded procedure library
5. New tasks build on existing procedures, enabling compound workflow construction

AWM's online mode implements this loop per-task in WebArena: execute → auto-evaluate → abstract → update workflow file. After approximately 40 tasks, the workflow library stabilizes and performance gains plateau — a learning curve analogous to human skill acquisition.

This loop creates risk when the trajectory evaluation is imperfect. If an agent's self-assessed "successful" trajectories include flawed procedures, subsequent tasks that rely on those procedures propagate the error. AWM addresses this by filtering to trajectories that pass automated evaluation before abstraction, but imperfect evaluators still leak bad procedures into the library.

Related concepts: [Self-Improving Agent](../concepts/self-improving-agent.md), [Reflexion](../concepts/reflexion.md), [Memory Evolution](../concepts/memory-evolution.md).

## Representation Formats

How procedures get stored varies significantly across implementations and affects what agents can do with them:

**Natural language text**: AWM's workflow files. Human-readable, directly injectable into prompts, but only as loose guidance. The LLM must interpret and apply the procedure; it cannot execute it mechanically.

**Structured templates with placeholders**: AWM's abstracted workflows with `{product-name}`, `{search-query}` slots. More reusable than raw text because the slot structure makes parameter binding explicit.

**Executable code**: Voyager's JavaScript skills. Highest reuse fidelity — the agent runs code rather than interpreting text — but requires a code execution environment and fails on tasks where the environment differs from what the skill assumes.

**Fine-tuned behaviors**: Procedures trained into model weights. Zero retrieval overhead, zero context consumption, but not updatable without retraining. Appropriate for stable universal procedures (e.g., how to parse JSON) rather than domain-specific workflows that change.

**Skill files** in [Skill Files](../concepts/skill-md.md): markdown files co-located with code that describe project-specific procedures for coding agents. Hybrid of natural language and structured format, indexed by filename for fast lookup.

## Failure Modes

**Procedure rigidity**: Fixed action sequences break when environments deviate from what the procedure assumes. AWM's paper explicitly flags this: a "book flight" workflow that hardcodes specific button labels fails when the airline site redesigns its UI. Procedures trained on one environment need revalidation when the environment changes.

**Deviation blindness**: Agents following a workflow can fail to recognize when the procedure doesn't apply. AWM reports slightly lower action F1 scores (57.3% vs 60.6% for MindAct on some metrics) in cases where rigid workflow adherence overrode task-specific judgment.

**Garbage-in propagation**: Self-induced procedures inherit the errors of the trajectories they came from. An agent that consistently makes a specific mistake and self-evaluates incorrectly will abstract that mistake into a procedure and apply it systematically.

**Context bloat**: Loading all known procedures into context at inference time scales poorly. AWM handles this by scoping workflows to a single website (coarse-grained), but a system with hundreds of domains needs semantic retrieval over its procedure library — adding latency and retrieval errors.

**Catastrophic forgetting**: In fine-tuned systems, updating model weights with new procedures can degrade performance on old procedures. See [Catastrophic Forgetting](../concepts/catastrophic-forgetting.md). In prompt-based systems, this manifests as procedure conflicts when two workflows give contradictory guidance for the same situation.

**Cross-modality misclassification**: Regex-based sector routing (as in OpenMemory) misclassifies procedures stated in unusual terms. "Manage stress" might route to emotional rather than procedural despite being a how-to procedure for psychological regulation.

## Relationship to Other Memory Types

Procedural memory interacts with the other memory types rather than operating in isolation:

- **Episodic → Procedural**: Successful episode trajectories are the raw material for procedure induction. AWM's online mode explicitly converts episode records into workflow templates.
- **Semantic → Procedural**: General world knowledge (e.g., "OAuth 2.0 requires a redirect URI") informs procedural knowledge (e.g., "to authenticate: register redirect URI → ..."). Semantic facts provide the preconditions procedures assume.
- **Procedural → Episodic**: Once a procedure exists, individual task executions become much shorter episodic memories because the procedure handles most steps. The episode records "used workflow X to accomplish Y" rather than recording every micro-action.

OpenMemory's cross-sector relationship matrix makes this explicit: procedural and semantic have a 0.8 relationship weight, procedural and episodic have 0.6. Queries to the procedural sector boost retrieval from semantic memory nearly as much.

## When to Use Each Approach

**Prompt-embedded procedures (CLAUDE.md, system prompts)**: Tasks with a small, stable set of procedures that apply universally. Coding agents with consistent conventions. Fast setup, zero infrastructure.

**Workflow induction (AWM-style)**: Multi-step web tasks or tool-use tasks where the agent will encounter many similar tasks over time. Requires trajectory collection infrastructure and an LLM-accessible induction pipeline. Not worth the complexity for one-off tasks.

**Skill libraries (Voyager-style)**: Tasks in programmable environments where procedures can be expressed as executable code. Game agents, browser automation with code execution, data processing pipelines.

**Sector-classified memory (Mirix, OpenMemory)**: Agents with long deployment lifetimes handling diverse task types where mixing procedural and episodic memories in a flat store creates retrieval noise. Adds complexity; only worth it when memory volumes make flat retrieval inaccurate.

**Fine-tuning**: Universal procedures that won't change and where context efficiency matters. Not practical for rapidly evolving or domain-specific procedures.

## Implementations and Related Systems

- [Agent Workflow Memory](../projects/agent-workflow-memory.md): Primary research implementation, WebArena SOTA through workflow induction
- [Voyager](../projects/voyager.md): Skill library accumulation in open-ended environments
- [Letta](../projects/letta.md): Tiered memory architecture with explicit procedural storage management
- [Mem0](../projects/mem0.md): Memory platform with typed memory storage including procedural category
- [GEPA](../concepts/gepa.md): Evolutionary prompt optimization that accumulates procedural heuristics
- [Agent Skills](../concepts/agent-skills.md): Related concept covering executable skill representations
- [Skill Files](../concepts/skill-md.md): Markdown-based procedure storage for coding agents
- [CLAUDE.md](../concepts/claude-md.md): Project-level procedural memory via prompt files
- [Context Engineering](../concepts/context-engineering.md): Broader context management that includes procedural memory injection

## Unresolved Questions

**Optimal abstraction granularity**: AWM uses website-level procedure scoping (one file per site). Mirix uses task-type scoping (one agent per memory type). Voyager uses function-level scoping. Which granularity minimizes both retrieval noise and procedure redundancy across different task distributions is an open empirical question.

**Procedure validity tracking**: None of the surveyed implementations track whether a stored procedure remains valid as environments change. A workflow induced for a site in 2024 may silently fail in 2025 after a redesign. No standard mechanism for procedure invalidation or freshness checking exists.

**Conflict resolution**: When two procedures give contradictory guidance for the same situation, current systems lack principled resolution strategies. AWM's finding that combining offline and online workflows *degraded* performance (AWM_off+on underperformed each individually) reflects this: conflicting procedures hurt more than no procedure.

**Compositional depth limits**: AWM describes a snowball effect where simple procedures compose into complex ones. The practical depth limit of this composition (how many levels of nesting remain reliable) has not been characterized. At some depth, small errors in base procedures compound.


## Related

- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.7)
- [Semantic Memory](../concepts/semantic-memory.md) — part_of (0.7)
- [Vector Database](../concepts/vector-database.md) — part_of (0.5)
- [Model Context Protocol](../concepts/mcp.md) — part_of (0.4)
- [Mem0](../projects/mem0.md) — part_of (0.4)

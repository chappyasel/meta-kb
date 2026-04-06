---
entity_id: procedural-memory
type: concept
bucket: agent-memory
abstract: >-
  Procedural memory in AI agents stores how-to knowledge as reusable sequences,
  workflows, and skills, enabling agents to execute tasks from learned patterns
  rather than reasoning from scratch each time.
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
  - rag
last_compiled: '2026-04-06T02:06:48.538Z'
---
# Procedural Memory

## What It Is

Procedural memory is a category of [agent memory](../concepts/agent-memory.md) that stores *how to do things*: action sequences, workflows, operational rules, and skills that an agent can execute without reconstructing from first principles. The name comes from cognitive science, where procedural memory covers the knowledge behind riding a bike or typing without looking at the keyboard. In AI agents, the analogy holds: an agent with strong procedural memory can log into a web service, search a database, or file a report by recalling a stored routine rather than planning each step anew.

It sits alongside [episodic memory](../concepts/episodic-memory.md) (what happened in specific past interactions) and [semantic memory](../concepts/semantic-memory.md) (factual world knowledge) as a component of a full agent memory system. Where episodic memory answers "what did I experience?" and semantic memory answers "what is true?", procedural memory answers "how do I do this?"

## Why It Matters

LLMs reason from context. Every time an agent solves a problem, that solution disappears unless something captures and stores it. This is expensive: complex multi-step tasks require the model to expend reasoning on sub-problems it has already solved. Procedural memory short-circuits this. An agent that has bookmarked "how to purchase an item on a shopping site" can apply that four-step routine to any shopping task, rather than re-deriving the action sequence from interface observations alone.

The efficiency gain is measurable. [Agent Workflow Memory](../projects/agent-workflow-memory.md) (AWM), a research system from CMU that implements procedural memory as induced "workflows" for web agents, achieved a 35.5% success rate on WebArena versus 23.5% for a baseline agent, using fewer steps per task (5.9 vs. 7.9). AWM surpassed hand-engineered workflows from domain experts by 7.6 percentage points — a result suggesting that automated procedural learning can extract patterns humans miss. (Self-reported; see [Source](../raw/deep/repos/zorazrw-agent-workflow-memory.md).)

## How It Works

### Representation

Procedural memories are stored as abstract, parameterized sequences. A concrete action trace like "click the red Nike shoes in size 10, add to cart, proceed to checkout as guest" becomes a workflow: "to purchase an item: navigate to product page, select variant, click add-to-cart, complete checkout." Specific values are replaced with placeholders (`{product-name}`, `{size}`) so the routine transfers across instances.

The stored format varies by implementation:

- **Plain text files**: AWM stores one text file per website domain (`workflow/shopping.txt`), injecting the entire file as in-context exemplars during inference. Simple, requires no retrieval index, but coarse.
- **Structured documents**: Systems like [Mirix](../projects/mirix.md) maintain a dedicated procedural memory agent that stores how-to knowledge alongside separate agents for episodic, semantic, emotional, resource, and vault memory.
- **Prompt rules**: Many production systems encode procedural memory directly in system prompts (e.g., [skill.md](../concepts/skill-md.md), [claude.md](../concepts/claude-md.md)). The "memory" is static: an operator writes the workflow, and the agent executes it.
- **Sector-classified stores**: [OpenMemory](../raw/deep/repos/caviraoss-openmemory.md) classifies memories into five sectors (episodic, semantic, procedural, emotional, reflective) using regex pattern matching. Procedural memories (`decay_lambda=0.008`, `weight=1.1`) decay at an intermediate rate — faster than semantic facts, slower than emotional experiences.

### Induction (Learning Workflows)

Procedural memory can be populated in three ways:

**Offline from labeled examples.** AWM's `offline_induction.py` reads annotated ground-truth trajectories, groups them by website domain, formats them into a prompt, and sends them to GPT-4o to extract common sub-routines. Output: a text file of abstract workflows. This produces high-quality memory but requires labeled data.

**Online from agent experience.** AWM's `online_induction.py` reads the agent's own execution logs, extracts action sequences, and runs the same LLM-based abstraction. The result gets written back to the workflow file, and subsequent tasks run against the updated memory. This creates a self-improvement loop: each task execution potentially improves the agent's procedural memory for future tasks.

**Compositional accumulation.** Workflows build on each other. A stored "log in" routine becomes a sub-step of a stored "purchase item" routine. AWM documents this as a "snowball effect": simple workflows become building blocks for compound workflows, and the agent's procedural repertoire grows in sophistication as it accumulates experience.

### Retrieval and Injection

Unlike episodic or semantic memory, which require semantic similarity search against potentially millions of records, procedural memory retrieval is often domain-gated. AWM retrieves workflows by website match (exact string match on domain, subdomain, or website tag), not vector similarity. The entire relevant workflow file is injected into the agent's system prompt.

More sophisticated systems use vector search with metadata filtering. Elasticsearch's implementation (from the Elasticsearch Labs article) applies structured filters — memory type, user identity, timestamp — before running semantic retrieval, narrowing the vector search space and reducing both latency and context token consumption.

AWM's inference prompt structure:
```
system_prompt + workflow_memory + concrete_exemplars + current_query
```

The workflow memory acts as a high-level procedural guide; concrete exemplars provide specific action patterns. Token budgets are managed by dropping exemplars before dropping workflow memory, prioritizing the abstract procedural knowledge over specific instances.

### Decay

Human procedural memory is durable. Skills like typing or driving persist for decades. AI implementations reflect this with slow decay rates. OpenMemory sets `decay_lambda=0.008` for procedural memory, lower than episodic (0.015) or emotional (0.02) sectors. Semantic memory decays slowest (0.005) on the reasoning that factual knowledge persists even longer than skills, but procedural memory is explicitly treated as more durable than experience-based episodic traces.

This matters for long-running systems: an agent that uses a login workflow successfully 20 times should retain that workflow even through periods of low activity.

## What Procedural Memory Is Not

**It is not [RAG](../concepts/rag.md)**. RAG retrieves relevant passages to inform a response; procedural memory retrieves action sequences to execute. The distinction is between informing cognition and directing behavior. In practice, a retrieval step may be similar — vector search, metadata filtering — but the output is a workflow to follow, not context to reason over.

**It is not static prompt engineering alone**. A system prompt that says "always check the user's account balance before processing a payment" is a form of procedural encoding, but it's human-written and never updates. Genuine procedural memory systems learn from agent experience and update their stored routines based on what worked.

**It is not [episodic memory](../concepts/episodic-memory.md)**. Episodic memory records what happened ("on Tuesday I processed a refund for order #4821"). Procedural memory records how to do things ("to process a refund: navigate to orders, select the order, click refund, confirm amount"). The episode is a specific event; the procedure is the generalizable routine.

## Implementations

| System | Storage | Induction | Retrieval |
|--------|---------|-----------|-----------|
| [Agent Workflow Memory](../projects/agent-workflow-memory.md) | Plain text files per domain | LLM-based from trajectories | Domain string match, in-context injection |
| [Mirix](../projects/mirix.md) | Dedicated procedural memory agent | Not specified | Agent-routed retrieval |
| [OpenMemory](../raw/deep/repos/caviraoss-openmemory.md) | SQLite with sector classification (regex) | Implicit via memory add | Composite scoring (similarity + recency + tag match) |
| [Letta](../projects/letta.md) | Archival memory | Human or agent-provided | Vector search |
| [skill.md](../concepts/skill-md.md) / [claude.md](../concepts/claude-md.md) | System prompt files | Human-authored | Loaded at context start |

AWM is the most architecturally explicit procedural memory system in the literature, with the clearest separation between induction, retrieval, and utilization phases.

## Strengths

**Task efficiency.** Agents with stored workflows complete tasks in fewer steps. AWM reduced average steps from 7.9 to 5.9 on WebArena by giving agents pre-computed action sequences to follow.

**Cross-task transfer.** A workflow induced from one task transfers to structurally similar tasks. AWM maintained 33.2% success on non-overlapping task templates versus 23.2% for baselines — evidence of genuine generalization rather than template memorization.

**Compositionality.** Simple workflows combine into complex ones. This mirrors how human expertise accumulates: novice-level sub-skills become components of expert-level routines.

**Low retrieval cost.** Domain-gated or sector-filtered retrieval is faster than full vector search. When an agent knows it's on a shopping site, it retrieves shopping workflows directly rather than scanning all stored procedures.

**Few-shot bootstrapping.** AWM shows significant performance gains within approximately 40 tasks. Procedural memory doesn't require extensive training data to become useful.

## Limitations and Failure Modes

**Action rigidity.** The primary failure mode of procedural memory is following a workflow when the environment has changed. AWM explicitly identifies this: a flight booking workflow that assumes a specific dropdown structure breaks when the interface shows a popup with different options. Fixed sequential procedures can't adapt to unexpected UI states mid-execution.

**Divergence blindness.** Related: agents struggle to recognize when to abandon a workflow. An agent that memorized "how to submit a form" may persist through five failed submissions rather than abandoning the procedure and replanning. AWM reports slightly lower action F1 scores compared to the MindAct baseline (57.3% vs 60.6%), suggesting workflow adherence sometimes overrides correct task-specific judgment.

**Garbage workflows.** Online induction can capture bad procedures. If an agent fails a task but the failure trajectory gets inducted as a workflow, subsequent agents run the same broken procedure. AWM partially mitigates this by filtering to successful trajectories before induction, but the filter depends on a reliable evaluation signal.

**Regime mismatch when combining offline and online induction.** AWM found that mixing offline (from labeled data) and online (from agent trajectories) workflows performed worse than either approach alone. The two sources produce workflows with different abstraction levels and assumptions, and the combination creates conflicts.

**Regex-based sector classification breaks on edge cases.** OpenMemory classifies procedural memories by matching patterns like `/\b(how to|step by step|procedure)\b/i`. A procedural memory about emotional regulation ("how to manage stress during a deadline") matches both procedural and emotional patterns, and the routing determines which decay rate and retrieval weight applies. Misclassification directly affects retention and recall.

**Context pressure.** Injecting full workflow files plus concrete exemplars plus the current observation can saturate context windows. AWM's implementation checks token counts and drops exemplars before dropping workflows, but a large workflow library on a complex page may leave insufficient budget for the actual task.

## When NOT to Use Procedural Memory

**For novel, one-off tasks.** If an agent will never repeat a task type, storing procedures adds overhead without benefit. Procedural memory pays off through reuse.

**When environments change frequently.** Workflows optimized for one UI version break when the site redesigns. If the operational environment updates faster than the agent can re-induce workflows, static stored procedures become liabilities.

**For very simple agents.** A system prompt with a few bullet-pointed instructions often covers procedural needs for narrow-scope assistants. Full procedural memory infrastructure (induction pipelines, storage, retrieval) adds engineering overhead that single-domain agents with stable tasks don't need.

**When you need auditability.** Automatically induced workflows are opaque. If compliance requires knowing exactly why an agent took a sequence of actions, human-authored procedural rules (in system prompts or policy files) are more tractable.

## Relationship to Related Concepts

[Self-improving agents](../concepts/self-improving-agents.md) typically use procedural memory as the vehicle for improvement: each successful task execution updates the stored procedure library, making future executions more efficient. AWM is an explicit implementation of this loop.

[Continual learning](../concepts/continual-learning.md) intersects with procedural memory when stored workflows must be updated as environments change — the challenge of updating old procedures without overwriting valid ones.

[Reflexion](../concepts/reflexion.md) is a related but distinct mechanism: it uses verbal self-reflection on past failures to update behavior. Procedural memory does something similar but stores successful routines rather than failure analyses.

[Agent Workflow Memory](../projects/agent-workflow-memory.md) is the primary research implementation in this space, with published benchmark results and open-source code.

[Voyager](../projects/voyager.md) applies procedural memory in a Minecraft setting, storing JavaScript code as skills. The "skill library" is functionally a procedural memory store: the agent indexes what it knows how to do and retrieves relevant skills when facing new challenges.

## Unresolved Questions

**How to handle workflow staleness.** No current system has a principled mechanism for detecting when a stored workflow is no longer valid due to environment changes. AWM overwrites the workflow file on each induction, potentially discarding valid procedures if the new trajectory set doesn't happen to cover them.

**Optimal granularity.** Should workflows be stored at the level of "click a button" or "complete a checkout"? AWM finds the snowball effect useful, but there's no principled guidance on how abstract workflows should be. Too abstract: the workflow doesn't constrain behavior. Too specific: it doesn't transfer.

**Quality filtering without ground truth.** Online induction requires knowing which trajectories were successful. For open-ended tasks without clear success criteria, filtering becomes difficult. AWM uses an LLM judge for WebArena auto-evaluation, but the judge's accuracy directly limits workflow quality.

**Conflict resolution.** When two workflows prescribe different actions for similar situations, the agent needs a resolution strategy. AWM and most current systems have no explicit conflict resolution mechanism.

---
entity_id: procedural-memory
type: concept
bucket: agent-memory
abstract: >-
  Procedural memory in agents encodes reusable how-to knowledge — workflows,
  skill sequences, and operating procedures — enabling agents to recall and
  execute learned routines without re-deriving them from scratch each time.
sources:
  - >-
    articles/elasticsearch-labs-ai-agent-memory-agentic-ai-memory-management-with.md
  - deep/repos/caviraoss-openmemory.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - repos/caviraoss-openmemory.md
  - repos/mirix-ai-mirix.md
related:
  - episodic-memory
  - semantic-memory
last_compiled: '2026-04-08T23:04:56.343Z'
---
# Procedural Memory

## What It Is

Procedural memory is the subsystem of [Agent Memory](../concepts/agent-memory.md) that stores *how-to* knowledge: step-by-step workflows, skill sequences, behavioral routines, and operating instructions. The defining characteristic is that this knowledge is *executable* — it describes processes an agent can follow, not just facts it can recall.

The term comes from cognitive psychology, where procedural memory refers to implicit skill knowledge (how to ride a bike, type a keyboard) as distinct from explicit factual knowledge (what a bicycle is) or episodic memory (the time you fell off one). In agent systems, the distinction maps onto different storage, retrieval, and update strategies: procedural knowledge tends to be more stable than episodic records, more actionable than semantic facts, and more abstract than raw execution traces.

Procedural memory sits as a component within the broader [Agent Memory](../concepts/agent-memory.md) taxonomy alongside [Episodic Memory](../concepts/episodic-memory.md) and [Semantic Memory](../concepts/semantic-memory.md).

## Why It Matters

Without procedural memory, agents rediscover the same solution paths repeatedly. A web navigation agent without workflow memory must reason from scratch about how to complete a checkout flow every time it encounters one. With procedural memory, a previously abstracted "add to cart" workflow is retrieved, injected into context, and executed — skipping the re-derivation step.

Three properties make this practically important:

**Transfer across tasks.** A workflow for logging into a shopping site generalizes to any similar site, even if the agent has never visited it. The abstraction process that created the workflow removed site-specific details, leaving a reusable template.

**Efficiency gains.** [Agent Workflow Memory](../projects/agent-workflow-memory.md) demonstrated this concretely on WebArena: agents using induced workflow memory completed tasks in 5.9 steps on average, versus 7.9 steps for baseline agents without it — a 25% reduction in steps per task, not just a success rate improvement. (Self-reported; from the AWM paper's ablation results.)

**Compounding improvement.** Procedural memory supports a snowball effect: simple workflows become subroutines for compound workflows. A "log in" workflow gets incorporated into "purchase item" workflows, which get incorporated into "reorder monthly supplies" workflows. The memory system grows in capability as it accumulates experience.

## How It Works

### Storage Format

Procedural memories are typically stored as structured text templates or workflow descriptions. Unlike episodic memories (which preserve specific event details) or semantic memories (which store facts), procedural memories abstract away instance-specific values and retain the action structure.

A concrete example from [Agent Workflow Memory](../projects/agent-workflow-memory.md): instead of storing "click on the red Nike shoes in size 10," a procedural memory stores "to add an item to cart: navigate to the product page, select the variant using `{product-variant}`, click the add-to-cart button." The `{product-variant}` placeholder marks where instance-specific context gets filled in at execution time.

Storage backends vary by system:
- **Plain text files** — AWM stores one text file per website domain (`workflow/shopping.txt`, `workflow/travel.txt`). Maximally simple, no retrieval index.
- **Relational + vector stores** — Systems like [OpenMemory](../projects/openmemory.md) and Mirix store procedural memories in databases alongside other memory types, with sector-specific retrieval parameters.
- **Prompt-injected exemplars** — Some systems store procedural knowledge as few-shot examples that get prepended to agent prompts at inference time.

### Decay and Persistence Characteristics

Procedural memories decay more slowly than episodic ones in cognitively-inspired architectures. In [OpenMemory](../projects/openmemory.md), the procedural sector's decay lambda (0.008) sits between semantic (0.005, slowest) and episodic (0.015, faster). The rationale: how-to knowledge outlasts specific events but can become outdated when interfaces or processes change.

Mirix's six-agent architecture assigns a dedicated `procedural_memory_agent` to manage this memory type separately from episodic and semantic agents. This separation allows different retrieval policies per type — procedural queries might prioritize recency of last successful use over general popularity.

### Retrieval

Retrieval strategies depend on how procedural memories are stored:

**Whole-context injection** — AWM injects the entire workflow file for the relevant website into the agent's system prompt. No per-workflow retrieval; the agent reads all workflows for the current domain. Works when workflow sets are compact (AWM found ~7 workflows per website sufficient).

**Semantic retrieval** — Systems like Mirix and the Elasticsearch-based architecture described by Llermaly and Rengifo use vector search filtered by memory type. A query for "how to submit a form" retrieves procedural memories specifically, not episodic records of past form submissions.

**Composite scoring** — OpenMemory applies a five-factor scoring formula (similarity 0.35, token overlap 0.20, graph waypoints 0.15, recency 0.10, tag match 0.20) with a sector-specific weight of 1.1 for procedural memories, meaning procedural matches score slightly above semantic baseline in retrieval ranking.

### Induction: How Procedural Memories Are Created

This is where the interesting engineering happens. Procedural memories must come from somewhere — they aren't manually authored in capable systems.

**Offline induction from annotated examples** — AWM's `offline_induction.py` takes ground-truth labeled task examples, groups them by website, formats them into prompts, and sends batches to GPT-4o (temperature 0.0 for determinism) asking it to extract common sub-routines. The LLM output is filtered through `filter_workflows()` to remove malformed entries.

**Online induction from agent trajectories** — AWM's `online_induction.py` operates on the agent's own past execution logs. For each completed task, it parses `(observation, action)` pairs, deduplicates via abstract action sequences (e.g., `click(12)_fill(5)_click(3)`), then asks GPT-4o to abstract common patterns into workflow templates. The WebArena pipeline runs this after each task completion, creating a per-task feedback loop.

**Automatic reflection** — OpenMemory's reflection system (`src/memory/reflect.ts`) periodically clusters memories by Jaccard similarity (threshold 0.8), identifies procedural patterns, and creates higher-level procedural summaries. This runs on a 10-minute interval with a minimum of 20 memories required before activation.

**Human authoring** — The simplest approach: write workflow templates manually. This is what [CLAUDE.md](../concepts/claude-md.md) does for coding agents — a human-authored file that tells Claude how to operate within a specific codebase. The tradeoff is that manual authoring requires domain expertise and doesn't improve automatically.

### The Abstraction Step

The critical operation in procedural memory creation is abstraction: converting concrete trajectories into reusable templates. This requires replacing instance-specific values with placeholders while preserving the action structure.

AWM uses LLMs for this because rule-based approaches miss nuance. AWM's ablations showed LLM-based induction outperformed rule-based methods by 2.8 points on step success rate (45.1% vs 43.4%) due to finer-grained abstraction. Rule-based systems tend to either over-abstract (losing critical details) or under-abstract (creating templates too specific to generalize).

The failure mode is over-specific abstraction: a "workflow" that amounts to "do exactly what I did last time" with minor parameter substitution. Such workflows score well on tasks identical to their training distribution but fail on any variation.

## Classification

In systems with multiple memory types, procedural memories must be classified correctly at storage time. The classification approach varies:

**Regex-based routing** — OpenMemory's Hierarchical Sector Graph uses regex patterns to classify memories into sectors. Procedural patterns include keywords like "how to," "steps to," "process for," "configure," "install," "setup." Fast and deterministic, but English-centric and prone to misclassification — a procedural memory about emotional regulation ("how to manage stress") may match both procedural and emotional patterns.

**Dedicated agent routing** — Mirix assigns classification to a `procedural_memory_agent` that receives all new memories and decides whether they belong to its sector. The agent has domain-specific prompting about what counts as procedural knowledge.

**LLM classification** — Stronger semantic understanding than regex, but adds latency and cost to every memory storage operation.

**Manual tagging** — Systems like AWM sidestep classification entirely by organizing memory by a structural dimension (website domain) rather than cognitive type.

## Relationship to Other Memory Types

Procedural memory interacts with — but differs from — neighboring memory types:

[**Episodic Memory**](../concepts/episodic-memory.md) records specific events: "on March 15, I ran command X and got result Y." Procedural memory abstracts across those episodes: "to accomplish Y, run X." The episodic record preserves context; the procedural abstraction loses context in exchange for reusability. AWM's offline+online combination demonstrated that mixing episodic (ground-truth examples) and procedural (induced workflows) sources can conflict — the two induction modes produced workflows that interfered rather than complemented.

[**Semantic Memory**](../concepts/semantic-memory.md) stores factual knowledge: what something is. Procedural memory stores operational knowledge: how to do something. In OpenMemory's cross-sector relationship matrix, semantic and procedural memories have a 0.8 relationship weight — the highest cross-sector coupling. This makes sense: understanding *what* an API endpoint does (semantic) strongly predicts knowing *how* to call it (procedural).

**[Agent Skills](../concepts/agent-skills.md)** operationalize procedural memory as tool-callable functions. Where procedural memory stores workflow descriptions in text, agent skills encode them as executable code or parameterized tool calls. [Voyager](../projects/voyager.md) stores skills as JavaScript functions in a library; [SkillBook](../concepts/skill-book.md) tracks verified procedures with success statistics. The distinction is storage format and invocation mechanism, not conceptual type.

**[Core Memory](../concepts/core-memory.md)** in MemGPT/Letta stores persistent facts about the agent and user, always in context. Procedural memory lives in external storage and is retrieved on demand — a necessary architecture for systems with large workflow libraries that exceed context window capacity.

## Who Implements It

Several systems take distinct approaches:

**[Agent Workflow Memory](../projects/agent-workflow-memory.md)** — The most studied implementation. LLM-based induction from task trajectories, plain text file storage, whole-context injection. Achieved 35.5% success on WebArena (vs 23.5% baseline) and 51.1% relative improvement. The snowball effect — simple workflows composing into complex ones — is documented in the paper. (Self-reported benchmark results.)

**Mirix** — Dedicated `procedural_memory_agent` as one of six specialized agents. PostgreSQL + BM25 search with vector similarity. Screen-capture grounding feeds raw observations into classification. The architectural bet is that domain-specialized agents outperform general-purpose retrieval.

**[OpenMemory](../projects/openmemory.md)** — Regex-based sector classification, dual-phase exponential decay (lambda=0.008 for procedural), composite scoring with 1.1 weight for procedural sector. Automatic reflection creates higher-level procedural summaries from clusters of related memories. The roadmap includes a learned sector classifier to replace the current regex approach.

**Elasticsearch-based architecture** (Llermaly & Rengifo, 2026) — Treats procedural memory as application code and prompts rather than stored documents. "Procedural memory determines how memory is used, not what's stored." Semantic and episodic memories live in Elasticsearch; procedural knowledge lives in the agent's system prompt and tool definitions. Document-level security enforces memory isolation by user role.

**[CLAUDE.md](../concepts/claude-md.md)** — Human-authored procedural memory for coding agents. A project-specific file that tells Claude how to build, test, and navigate the codebase. Static, manually maintained, but effective for stable workflows.

## Failure Modes

**Action rigidity.** AWM documents this explicitly: workflow actions lack flexibility for dynamic environments. A booking workflow that specifies "click the first airport option" fails when the airport picker shows a different set of options than the workflow author encountered. The fixed sequential structure breaks when environments present unexpected states.

**Workflow poisoning.** Online induction learns from the agent's own trajectories. If the agent performs poorly initially, induced workflows encode poor strategies. Subsequent tasks using these workflows perpetuate errors. AWM's WebArena pipeline partially addresses this by filtering to successful trajectories before induction, but "successful" depends on the auto-evaluator's judgment, which can itself be wrong.

**Interference between induction sources.** AWM found that combining offline (ground-truth) and online (agent-trajectory) workflows in the same memory underperformed both individual sources. The workflows were induced with different abstraction assumptions and conflicted at retrieval time. Memory systems that blend procedural knowledge from heterogeneous sources without normalization will encounter this.

**Sector misclassification.** In regex-based systems, a memory about "how to manage emotional responses" may classify as emotional rather than procedural, applying the wrong decay rate and retrieval weight. The procedural sector's slower decay (relative to emotional) means misclassified memories will fade faster than they should.

**Overfitting to distribution.** AWM measured success on non-overlapping task templates: 33.2% vs 23.2% for baselines. This is genuine generalization evidence. But the gap closes as task variety increases — workflows induced from a narrow task distribution don't transfer to significantly different procedures. Systems that confuse task-specific memorization with genuine procedural abstraction will fail on novel tasks.

**Stale workflows.** When underlying interfaces or processes change, stored workflows become incorrect. A workflow for "submit a pull request on GitHub" becomes wrong when GitHub updates its UI. Without a mechanism to detect and invalidate stale procedures, the agent will follow outdated steps confidently.

## When Not to Use It

Procedural memory adds overhead — induction cost, retrieval latency, storage management — that may not be justified in several cases:

**Single-session, non-repeating tasks.** If an agent handles one-off requests without repeated task types, workflow induction produces no benefit. The induction cost exceeds any transfer gain.

**Highly dynamic environments.** If the target environment changes faster than the induction cycle, workflows go stale before they're used. Procedural memory assumes enough environmental stability for learned procedures to remain valid.

**Small context windows.** Whole-context injection (AWM's approach) requires the workflow library to fit in the agent's context alongside the current task. With large workflow libraries or constrained context budgets, retrieval-based injection is necessary but adds retrieval complexity.

**When [Agent Skills](../concepts/agent-skills.md) are more appropriate.** If the procedural knowledge can be encoded as executable code or parameterized tool calls, skill libraries provide stronger guarantees than text templates. Text workflows require the agent to re-interpret the procedure each time; code skills execute deterministically.

## Unresolved Questions

**Optimal abstraction granularity.** AWM averaged 7.4 workflows per website. Is this the right granularity? Too few workflows under-capture domain knowledge; too many create retrieval noise and context pressure. No established method determines the right granularity for a given task distribution.

**Workflow conflict resolution.** When two workflows contradict each other (different strategies for the same task), current systems have no principled conflict resolution mechanism. AWM simply overwrites on each induction round. Systems with append-and-consolidate storage accumulate conflicts silently.

**Transfer to new domains.** Most procedural memory research evaluates on the same or similar task distributions used for induction. How well do induced workflows transfer to genuinely novel domains (new websites, new applications, new task types) is underexplored.

**Interaction with fine-tuning.** Procedural memory in current systems lives entirely in prompt context — it's retrieved and injected, never baked into model weights. [Continual Learning](../concepts/continual-learning.md) approaches could in principle encode procedural knowledge into weights, but the tradeoffs between in-context and in-weights procedural memory aren't well characterized.

**Verification.** How does an agent know a workflow is correct before executing it? AWM uses auto-evaluation after execution, which catches errors retroactively but not preemptively. Prospective workflow verification remains an open problem.

## Alternatives

**[Agent Skills](../concepts/agent-skills.md)** — Executable code rather than text templates. Use when the procedure can be fully specified algorithmically and determinism matters more than flexibility.

**[ReAct](../concepts/react.md) without explicit memory** — Agents that reason about each step using chain-of-thought without stored workflows. Use for one-off tasks or highly dynamic environments where stored procedures would go stale faster than they'd be useful.

**[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md)** — If the procedural knowledge already exists in documentation, RAG over that documentation may suffice without a separate induction pipeline. Use when human-authored documentation is available and reliable.

**[CLAUDE.md](../concepts/claude-md.md)-style static files** — Human-authored workflow documents for stable, well-understood procedures. Use when the domain is stable, human expertise is available, and automatic induction is overkill.

**[Self-Improving Agents](../concepts/self-improving-agents.md) with fine-tuning** — When the task distribution is large and stable enough, fine-tuning on successful trajectories encodes procedural knowledge into weights. Use when inference-time context injection creates unacceptable latency or cost.


## Related

- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.7)
- [Semantic Memory](../concepts/semantic-memory.md) — part_of (0.7)

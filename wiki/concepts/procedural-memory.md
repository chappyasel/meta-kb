---
entity_id: procedural-memory
type: concept
bucket: agent-memory
abstract: >-
  Procedural memory encodes how-to knowledge — workflows, skills, action
  sequences — as a distinct memory type in agents, separate from factual recall
  and event logs.
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
  - retrieval-augmented-generation
last_compiled: '2026-04-08T02:47:57.795Z'
---
# Procedural Memory

## What It Is

Procedural memory is the memory of *how to do things*. In human cognition, it encodes motor skills, habits, and learned routines — the kind of knowledge that feels automatic once acquired. You don't remember *learning* to ride a bike; you just know how to do it.

In LLM agents, procedural memory stores the equivalent: action sequences, task workflows, API call patterns, multi-step procedures. When an agent learns "to add an item to a shopping cart, navigate to the product page, select a variant, then click add-to-cart," that is procedural memory. When an agent stores a debugging checklist or a code review workflow, that is procedural memory. The defining characteristic is that procedural knowledge tells an agent *how to perform* rather than *what is true* or *what happened*.

This distinguishes it sharply from its two sibling memory types:

- [Semantic Memory](../concepts/semantic-memory.md) stores facts and concepts: "Python uses duck typing," "The CEO of CompanyX is Alice." It answers *what is true*.
- [Episodic Memory](../concepts/episodic-memory.md) stores specific experiences: "At 2pm on Tuesday the deployment failed," "The user asked about refunds three conversations ago." It answers *what happened and when*.

Procedural memory answers neither. It answers *how to proceed*.

This distinction matters because the three types have different retention requirements, different retrieval triggers, and different update semantics. A fact can be corrected by asserting a new one. An event is immutable — it happened. A procedure needs to be refined, extended, or replaced as the agent gains experience. Treating all three as a flat vector store loses this structure.

## Why It Matters

LLM agents fail at long-horizon tasks not because they lack knowledge but because they cannot transfer learned procedures. They solve the same sub-problems repeatedly — logging in, filling forms, navigating UI patterns — as if each encounter is novel. Procedural memory is the mechanism that breaks this pattern.

The [Agent Workflow Memory](../projects/agent-workflow-memory.md) (AWM) paper demonstrated this directly on WebArena. A baseline agent achieved 23.5% task success. After the agent induced and reused procedural workflows, success rose to 35.5% — a 51% relative improvement — while reducing steps per task from 7.9 to 5.9. The agent also surpassed human-engineered workflows (SteP, 33.0%) by 2.5 points, suggesting automated procedure induction can discover patterns domain experts miss. These results are from the AWM paper's self-reported benchmarks; independent replication has not been published as of mid-2025, though MemEvolve uses AWM as a baseline in its own evaluations.

The implication is architectural: procedural memory is not an optimization. It changes what tasks are solvable. Without it, agents plateau at whatever their base model can accomplish in a single context. With it, agents accumulate operational expertise across tasks.

## How It Works

### Storage Representations

Procedural memory takes several forms in practice:

**Text files and templates.** AWM stores workflows as per-website plain text files (e.g., `workflow/shopping.txt`). Each file contains abstract procedure descriptions with placeholders replacing concrete values: `{product-name}`, `{search-query}`. Simple and fast to retrieve, but coarse — the entire file loads into context regardless of relevance.

**Structured sector stores.** Systems like [OpenMemory](../projects/openmemory.md) and Mirix maintain a dedicated procedural sector within a multi-type memory store. OpenMemory's Hierarchical Sector Graph (`src/memory/hsg.ts`) classifies incoming memories into five sectors — episodic, semantic, procedural, emotional, reflective — using regex pattern matching. Procedural memories get their own decay rate (lambda=0.008, intermediate between semantic's 0.005 and emotional's 0.02) and retrieval weight (1.1, slightly above semantic's 1.0). The decay rates model the intuition that how-to knowledge fades more slowly than event memory but needs occasional refreshing.

**Skill libraries.** Projects like [Voyager](../projects/voyager.md) implement a code-level skill library where discovered procedures are stored as executable functions, indexed for semantic retrieval. [SkillBook](../concepts/skill-book.md) extends this into a curated library of agent capabilities. The difference from text workflows is executability: stored procedures can run directly, not just guide the agent's own generation.

**Prompt injection.** At inference time, procedural memory is typically delivered as additional context in the system prompt or as in-context exemplars. AWM injects the workflow file as a user-role message before the task query. OpenMemory's MCP tool `openmemory_query` returns procedural memories alongside other types, and the calling agent decides how to use them.

### Induction: Creating Procedures from Experience

Procedures must come from somewhere. Three induction pathways exist:

**Offline induction from labeled examples.** AWM's `offline_induction.py` processes ground-truth annotated training trajectories. For each website domain, it formats examples and asks GPT-4o (temperature=0.0) to extract abstract workflow descriptions. The output is filtered via `filter_workflows()` and saved to disk. High-quality source material produces high-quality procedures, but this requires labeled data.

**Online induction from agent trajectories.** AWM's `online_induction.py` processes the agent's own execution logs. The pipeline runs some tasks, induces new workflows from the results, then continues with updated procedures. For WebArena, this is a per-task loop: run → evaluate → induce → next task. Crucially, the WebArena pipeline (`induce_rule.py`) filters to *successful* trajectories before induction, avoiding reinforcement of bad habits.

**Automatic classification of incoming memories.** OpenMemory's HSG classifier intercepts every `mem.add()` call and routes the content to the appropriate sector based on pattern matching. A memory containing phrases like "how to," "step 1," or "process" gets classified as procedural. This is passive induction — the agent doesn't need a separate induction step; procedures accumulate automatically as the system observes the agent's interactions.

The tension between these approaches is real. Offline induction produces clean, generalizable procedures but requires labeled data. Online induction requires no labels but can encode errors if success filtering is incomplete. Automatic classification requires no structured process but sacrifices accuracy for speed.

### Retrieval: Selecting the Right Procedure

**Text-file retrieval** (AWM): The entire workflow file for a relevant website loads into context. No semantic search — just file I/O keyed on website name. Fast, but context-inefficient when only a fraction of the stored procedures apply to the current task.

**Composite-score retrieval** (OpenMemory): Procedural memories are retrieved with a weighted formula: 0.35 vector similarity + 0.20 token overlap + 0.15 waypoint graph connectivity + 0.10 recency + 0.20 tag match. The sector-specific weight (1.1 for procedural) multiplies into the final score. Cross-sector relationships also apply — procedural memories have 0.8 affinity with semantic memories and 0.6 with episodic, meaning a procedural query can surface relevant factual context and historical examples alongside the procedure itself.

**Skill-based retrieval** (Voyager, SkillBook): Retrieved by semantic similarity to the current task description, returning the most relevant executable skill.

### Decay and Update

Procedural memories require different lifecycle management than facts or events. A fact can be replaced by assertion ("Alice is no longer CEO"). An event is immutable. A procedure needs refinement: yesterday's checkout workflow may not work today if the UI changed.

OpenMemory handles this through sector-specific exponential decay (lambda=0.008 for procedural) and a reinforcement mechanism. Each time a procedure is successfully used, `mem.reinforce()` boosts its salience and coactivation count, slowing its decay. Procedures that prove useful persist; ones that stop being retrieved decay toward zero.

AWM handles procedure update by overwriting the workflow file during each online induction cycle. Simpler but lossy: earlier workflows may disappear if a new induction batch doesn't reproduce them.

The [Reflexion](../concepts/reflexion.md) framework adds a meta-layer: after task failure, the agent generates verbal reflections on what went wrong, which can be stored as updated procedural knowledge. This is procedure correction via self-critique rather than trajectory analysis.

### The Snowball Effect

AWM's paper describes a compositional property worth naming: simple procedures become building blocks for compound procedures. "Log in to account" becomes a sub-routine inside "purchase item," which becomes a sub-routine inside "complete a subscription upgrade." The agent's procedural memory grows not just wider but deeper, encoding multi-level hierarchies of operational knowledge.

The Hierarchical Memory Tree paper (2603.07024) formalizes this with three explicit levels: Intent (standardized task goals), Stage (reusable semantic sub-goals with pre/post conditions), and Action (transferable element patterns). This is AWM's flat workflow list extended into a proper tree — procedures at multiple granularities, each retrievable at the appropriate abstraction level.

## Who Implements It

**Agent Workflow Memory** ([Agent Workflow Memory](../projects/agent-workflow-memory.md)): The most benchmarked implementation. LLM-based induction, text-file storage, per-website granularity. SOTA 35.5% on WebArena at time of publication. Self-reported results; AWM is used as a baseline in MemEvolve's evaluations, providing partial external validation.

**Voyager** ([Voyager](../projects/voyager.md)): Implements a code-level skill library for Minecraft agents. Procedures are Python functions, not text descriptions. Enables actual execution of stored skills, not just guidance. The closest to truly executable procedural memory in the agent literature.

**OpenMemory** ([OpenMemory](../projects/openmemory.md)): Integrates procedural memory into a five-sector cognitive memory engine alongside episodic, semantic, emotional, and reflective types. Classification is automatic (regex-based HSG) rather than explicit. Designed for agent frameworks (LangChain, CrewAI, AutoGen) and IDE tools. Sector-specific decay and composite scoring. No published benchmarks; self-described architecture.

**Mirix** (Mirix): Six-agent memory architecture including a dedicated procedural memory agent. Screen-capture grounding — procedures can be induced from observed on-screen activity. Privacy-first, local storage. 3,508 GitHub stars; no independent benchmark results published.

**OpenMemory (Mem0 fork)** ([OpenMemory](../projects/openmemory.md)): Different project, same name. Mem0's open-source offering, integrated with Claude, Copilot, and other LLM tools. Procedural memory as one category alongside episodic and semantic; simpler than the caviraoss implementation.

**Letta** ([Letta](../projects/letta.md)): The MemGPT successor stores procedural knowledge as part of its core/archival memory system. Procedures live in the agent's system prompt (core memory) or are retrieved from archival storage on demand.

**[CLAUDE.md](../concepts/claude-md.md)**: A pragmatic implementation — a project-specific file injected into Claude's context containing workflows, conventions, and task patterns for a codebase. No framework, no database. Procedural memory as a markdown file the developer maintains manually. Widely used in [Claude Code](../projects/claude-code.md) workflows.

## Practical Implications

**Avoid redundant procedure induction.** Every token spent re-deriving a known procedure is waste. If an agent runs the same sub-task repeatedly (authentication, form filling, API calls), those patterns belong in procedural memory, not in the base prompt.

**Distinguish procedure quality from procedure existence.** A stored procedure for a broken workflow is worse than no procedure — it will guide the agent toward failure. AWM's design choice to filter to successful trajectories before induction is not optional; it's essential. Online learning without success filtering corrupts procedural memory.

**Mind procedure scope.** AWM organized procedures by website (one file per domain). This works for web agents with clear domain boundaries. General-purpose agents need finer-grained retrieval — procedures indexed by task type, not just by service domain — otherwise the injected context grows without bound.

**Procedures age.** A login workflow valid today may fail tomorrow if the site redesigns its UI. Unlike semantic facts (which can be corrected by assertion) or episodic memories (which are historical and immutable), procedures need validity windows and refresh triggers. Systems that treat procedural memory as permanent accumulate stale guidance.

**Token budget management is real.** AWM's `memory.py` explicitly checks total token count when building prompts and drops exemplars to stay under `MAX_TOKENS[model]`. Procedural memory competes with the current task observation for context space. A library of 500 workflows injected wholesale defeats the purpose.

**The CLAUDE.md pattern is underrated.** For software development agents, a project-specific markdown file containing coding conventions, deployment procedures, and common debugging workflows is procedural memory that the developer can inspect and edit. It has no decay mechanism, no automatic induction, and no retrieval system — but it is version-controlled, transparent, and requires no infrastructure. Before building a full procedural memory system, consider whether a well-maintained CLAUDE.md file suffices.

## Failure Modes

**Procedure-environment mismatch.** AWM's paper explicitly identifies this: "workflow actions lack flexibility for dynamic environments." When booking flights, a predetermined sequence breaks when the site presents unexpected popup variations. Procedures encode the *expected* path; real environments diverge. Agents without a mechanism to detect mismatch will execute stale procedures to completion, compounding errors rather than recovering.

**Divergence failure.** The agent executes a stored procedure even when task-specific signals indicate it should deviate. AWM reports slightly lower action F1 (57.3% vs 60.6% for MindAct) attributable to this rigidity — the agent follows procedure when it should exercise judgment.

**Sector misclassification.** OpenMemory's regex-based classifier will misclassify borderline memories. "How to manage stress" matches both procedural ("how to") and emotional ("stress") patterns. The wrong sector assignment means the wrong decay rate, the wrong retrieval weight, and incorrect cross-sector relationship scoring. English-centric patterns also fail on multilingual content.

**Reinforcement of bad procedures.** In online learning without success filtering, failed task trajectories can induce procedures that encode failure patterns. The system learns *a* way to do things, not necessarily *a good* way. This is subtle — the induced procedure may be syntactically valid and the LLM may not flag it as problematic.

**Context pollution from injecting full procedure libraries.** Loading the entire procedural memory for a domain into context wastes tokens and can confuse the model. AWM's per-website text files avoid this for web tasks with clear domain boundaries but scale poorly to general agents with broad operational scope.

**Procedure staleness without validation.** Stored procedures have no built-in validity check. A UI change, API deprecation, or policy update can make a procedure incorrect without triggering any update. Systems that rely on decay (OpenMemory) assume that less-used procedures fade naturally, but a stale procedure that was frequently used will have high salience and slow decay — precisely the wrong behavior.

## When Not to Use It

Procedural memory adds overhead. Avoid it when:

**Tasks are non-repeating.** If the agent's tasks are all unique (creative writing, one-off analysis), there are no repeatable procedures to learn. The induction cost exceeds any retrieval benefit.

**The procedure space is small enough to fit in the base prompt.** For agents with a narrow operational scope (e.g., a single API with five endpoints), encoding procedures directly in the system prompt is simpler and more reliable than a memory system. CLAUDE.md is the right tool.

**Procedure quality cannot be validated.** Online procedure induction without a success signal (auto-evaluation or ground-truth reward) risks encoding bad procedures. If you cannot filter induction to successful trajectories, the memory system may harm performance.

**The environment changes frequently.** Procedures tuned to a specific UI, API version, or data schema become liabilities when the target changes. High-churn environments need fresh context, not stored procedures.

**Latency is the primary constraint.** Procedural memory retrieval adds a step before task execution. For real-time applications where every millisecond matters, the retrieval overhead may be unacceptable.

## Unresolved Questions

**Optimal abstraction granularity.** AWM stores procedures at the workflow level (5–10 steps). Voyager stores executable functions. CLAUDE.md stores prose descriptions. Hierarchical Memory Tree stores three levels simultaneously. Which granularity retrieves best, induces from fewest examples, and transfers across the widest task distribution? No controlled comparison exists.

**Procedure conflict resolution.** When two induced procedures for the same task type disagree, which wins? AWM overwrites the file; the newest induction wins by default. OpenMemory's reflection system clusters and consolidates, but the consolidation is extractive (concatenation), not abstractive (synthesis). How should conflicting procedures be reconciled?

**Cross-task procedure transfer.** AWM found that combining offline and online workflows underperformed either alone, suggesting procedures from different induction modes conflict. The mechanisms of productive vs. destructive transfer are not understood.

**Evaluation standards.** WebArena and Mind2Web are the primary benchmarks for procedural memory in web agents. Neither covers general-purpose agents, code agents, or multi-modal settings. Comparing systems across benchmarks is currently impossible because they test different task distributions with different metrics.

**Decay parameter calibration.** OpenMemory's procedural decay rate (lambda=0.008) is hand-tuned rather than derived from empirical study of agent behavior. How quickly procedural knowledge should decay — and whether that rate should vary by procedure type, task frequency, or environment volatility — remains an open research question.

## Relationships to Related Concepts

Procedural memory is one of the three canonical components of [Agent Memory](../concepts/agent-memory.md), alongside [Semantic Memory](../concepts/semantic-memory.md) and [Episodic Memory](../concepts/episodic-memory.md). All three are sub-types that together constitute [Long-Term Memory](../concepts/long-term-memory.md) for agents.

[Agent Skills](../concepts/agent-skills.md) and [SkillBook](../concepts/skill-book.md) implement procedural memory at the code level — skills are executable procedures, the functional equivalent of what AWM stores as text workflows.

[Compositional Skill Synthesis](../concepts/composable-skills.md) addresses the snowball property: how simple procedures combine into complex compound procedures.

[Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) is the retrieval layer that surfaces procedural memories at inference time, though RAG alone — without the sector-specific structure and decay mechanisms — is insufficient for true procedural memory management.

[Self-Improving Agents](../concepts/self-improving-agents.md) depend on procedural memory as the substrate for accumulating operational expertise. [Reflexion](../concepts/reflexion.md) uses failure analysis to update procedural knowledge. [GEPA](../concepts/gepa.md) and [EvoAgentX](../projects/evoagentx.md) automate procedure discovery through systematic search.

[Context Engineering](../concepts/context-engineering.md) governs how procedural memories are selected and formatted for injection — the difference between a helpful procedure prompt and context pollution.


## Related

- [Episodic Memory](../concepts/episodic-memory.md) — part_of (0.8)
- [Semantic Memory](../concepts/semantic-memory.md) — part_of (0.8)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.5)

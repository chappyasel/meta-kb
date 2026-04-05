---
entity_id: case-based-reasoning
type: concept
bucket: agent-memory
sources:
  - repos/agent-on-the-fly-memento.md
  - deep/repos/memento-teams-memento-skills.md
related: []
last_compiled: '2026-04-05T05:41:25.165Z'
---
# Case-Based Reasoning in Agent Memory

## What It Is

Case-based reasoning (CBR) is a problem-solving method where a system retrieves past experiences to handle new situations. Rather than deriving solutions from scratch using general rules, a CBR system asks: "Have I seen something like this before? What did I do, and did it work?"

The classical CBR cycle runs four stages: **Retrieve** a similar past case, **Reuse** its solution, **Revise** that solution to fit the current situation, and **Retain** the result for future use. In traditional AI this was formalized around structured case libraries with feature-vector similarity. In LLM agent systems, the same cycle applies but the "cases" are trajectories, tool-call sequences, or skill definitions, and retrieval uses embedding similarity or hybrid BM25/vector search rather than symbolic distance functions.

CBR sits at the intersection of memory and learning. An agent using CBR does not update its model weights but does improve over time, because its external memory grows and the quality of retrieved cases increases with experience.

## Why It Matters for Agent Systems

LLMs cannot persist learning across inference calls by default. Every new task starts from the same frozen parameters. CBR sidesteps this by externalizing experience into a retrievable store. This matters for three reasons:

**Continual improvement without retraining.** Storing successful and failed trajectories lets an agent accumulate domain-specific knowledge over time. Fine-tuning is expensive, requires curated datasets, and risks catastrophic forgetting. CBR-based memory is append-only and immediately usable.

**Out-of-distribution generalization.** When a new task resembles a past case only partially, retrieved examples provide scaffolding that prompting alone cannot. The agent adapts a known solution rather than reasoning from nothing.

**Interpretability and control.** Retrieved cases are explicit artifacts that humans can inspect and edit. A broken skill or trajectory can be corrected in the case store without touching model weights.

## How It Works: Implementation Details

### Retrieval Mechanisms

The retrieval stage determines everything downstream. Two approaches dominate current implementations:

**Hybrid BM25 + vector search.** Memento-Skills uses a `multi_recall` strategy that runs three parallel recall paths: `LocalFileRecall` (BM25 keyword search over skill files on disk), `LocalDbRecall` (semantic vector search using sqlite-vec embeddings), and `RemoteRecall` (cloud catalogue search via HTTP). Results merge with local-first priority. This hybrid approach outperforms either strategy alone because BM25 captures exact keyword matches (tool names, domain terms) while vector search captures semantic similarity. [Source](../../raw/repos/memento-teams-memento-skills.md)

**Value-based retrieval.** Memento stores trajectory tuples of the form `(s_T, a_T, r_T)` where the reward signal guides which cases surface. This is closer to the classical CBR formulation: retrieve by outcome quality, not just similarity. [Source](../../raw/repos/agent-on-the-fly-memento.md)

### The Skill as a Case

In Memento-Skills, the atomic case unit is a **Skill** object: a Pydantic model carrying the skill's name, description, content (a SKILL.md instruction file), version counter, utility score, dependency list, execution mode (`KNOWLEDGE` or `PLAYBOOK`), and allowed tools. The utility score is adjusted on each execution outcome. This makes cases first-class entities with provenance, not just text blobs.

The `ExecutionMode` distinction is important. A `KNOWLEDGE` skill provides context that the agent reads and acts on. A `PLAYBOOK` skill contains executable scripts. The mode is auto-inferred from directory structure: if files beyond SKILL.md are present, the skill is a playbook. [Source](../../raw/repos/memento-teams-memento-skills.md)

### The Revise Stage: Self-Evolution

Classical CBR assumes human experts handle revision. In LLM-agent implementations, the agent revises cases autonomously during a **Reflect** phase. Memento-Skills implements this as a supervisor that can return five decisions after each execution step:

```
CONTINUE | IN_PROGRESS | REPLAN | FINALIZE | ASK_USER
```

When execution fails repeatedly, the reflection phase can rewrite the skill's prompts and code, adjust its utility score, or create an entirely new skill derived from the failure pattern. The model parameters remain frozen throughout. All adaptation is in external memory M. [Source](../../raw/repos/memento-teams-memento-skills.md)

### Retain and the Write Path

Retention in CBR requires deciding what to store, when to update existing cases, and how to prevent the case library from growing into a retrieval-quality problem. Memento-Skills handles this with versioned skills: each rewrite increments the version counter. The `SkillGateway` governs all reads and writes as the single external interface, with pre-execution gates that check required API keys, policy rules, and input parameter validity before a skill runs. [Source](../../raw/repos/memento-teams-memento-skills.md)

### Memory-Augmented MDP Framing

Memento formalizes CBR as a **memory-augmented MDP**. Instead of the standard state-action-reward tuple, the MDP includes the current case bank as part of the state. A neural case-selection policy learns to choose which retrieved cases are most relevant for a given planning step. This is a departure from naive RAG, where retrieved content is just appended to a prompt. Here, retrieval is part of the decision-making loop, not a preprocessing step. [Source](../../raw/repos/agent-on-the-fly-memento.md)

## Failure Modes

### Reflection Quality Bounded by Base Model

The revise stage uses the same LLM to diagnose failures and rewrite skills. If the model cannot articulate why a skill failed, the rewritten version will not be better. This creates a hard ceiling on self-evolution that tracks the analytical capability of the base model, not the CBR mechanism itself. A skill that fails because of a subtle API contract violation may produce a plausible-sounding but still broken revision. [Source](../../raw/repos/memento-teams-memento-skills.md)

### Utility Score as a Weak Signal

Incrementing or decrementing a scalar utility score on success or failure does not capture causality. A skill that fails because of a transient network error gets its score penalized the same as one that fails because its logic is wrong. Over time, transiently-failing skills can be deprioritized unfairly. There is no mechanism to attribute failure cause before adjusting the score.

### No Verification of Evolved Skills

When the reflection phase rewrites a skill, no automated test suite validates the new version. The system's confidence in the improvement is the LLM's own assessment. The benchmarks reported for Memento (GAIA, HLE) show performance improving across self-evolution rounds, but these are self-reported and measured at the task level, not at the individual skill level. Whether specific evolved skills are genuinely better or just differently wrong is not formally assessed. [Source](../../raw/repos/memento-teams-memento-skills.md)

### ReAct Budget Masks Hard Problems

Memento-Skills enforces hard budget overrides: after 5 ReAct iterations per step, `IN_PROGRESS` becomes `CONTINUE`; after 2 replans, `REPLAN` becomes `CONTINUE`. These prevent infinite loops but also prevent the system from spending extra effort on genuinely difficult tasks. The budgets are fixed, not adaptive to task complexity. A legitimately hard task hits the same ceiling as a stuck agent. [Source](../../raw/repos/memento-teams-memento-skills.md)

### Case Library Pollution

As the case library grows, retrieval quality degrades if bad cases accumulate. CBR systems need a pruning or quality-gating mechanism. Utility scores provide a weak proxy, but a low-utility skill that occasionally succeeds on niche tasks should not be deleted. The tension between library growth and retrieval precision is unresolved in current implementations.

## Practical Implications

**When CBR helps:** Tasks with recurring structure (web research, document processing, API integration) benefit most. The case library fills in quickly with reusable patterns and retrieved cases provide genuine lift over prompting alone.

**When CBR is the wrong choice:** One-off tasks with no structural similarity to past work get nothing from retrieval and pay the latency cost of search. Domains where mistakes are high-stakes also present a problem: the revise stage can propagate errors if the reflection quality is low.

**Infrastructure assumption that goes unspoken:** CBR at scale assumes a fast, low-latency vector store. As the case library grows into thousands of entries, retrieval latency and embedding costs become non-trivial. Neither Memento nor Memento-Skills discusses what happens to performance at 10,000+ cases. SQLite-vec works for prototypes; production deployments would need a proper vector database with indexing, and the retrieval architecture would need to change.

**Trust surface:** Cloud skill marketplaces, as in Memento-Skills, let agents download skills authored by others (or generated remotely). These execute locally. Policy gates and sandbox isolation mitigate but do not eliminate the risk that a retrieved skill contains adversarial instructions. [Source](../../raw/repos/memento-teams-memento-skills.md)

## Comparison with Alternatives

**Parametric learning (fine-tuning):** CBR externalizes learning; fine-tuning internalizes it. Fine-tuning is higher capacity and can encode subtle patterns, but requires data curation, compute, and tolerates catastrophic forgetting risks. CBR is lower cost and immediately correctable. Use fine-tuning when you have large amounts of labeled task data and can afford the training cycle. Use CBR when you need continual adaptation at deployment time with no retraining budget.

**Static RAG:** Standard retrieval-augmented generation retrieves documents to augment a prompt. CBR retrieves past *solutions*, not just information. The distinction matters: a retrieved document tells the agent facts; a retrieved case tells the agent what actions to take and what to avoid. CBR is a superset of RAG for procedural tasks.

**Prompt engineering / few-shot examples:** Manually curated few-shot examples are a one-time CBR snapshot frozen at prompt-writing time. CBR automates the accumulation and selection of those examples. The tradeoff is control: hand-curated examples are predictable; CBR-evolved cases may drift in unexpected directions.

## Open Questions

The documentation for current CBR-based agent systems leaves several questions unanswered. How do case libraries handle semantic drift, where a skill's description drifts away from its actual behavior after several rewrites? What is the right retention policy: store every case, store only successful ones, or store a diversity-optimized subset? How should conflicts between cases be resolved when two high-utility skills give contradictory guidance on the same task type? And at what case library size does hybrid retrieval start to degrade, requiring a different indexing strategy?

These are not hypothetical problems. Any deployment that runs long enough will encounter them.

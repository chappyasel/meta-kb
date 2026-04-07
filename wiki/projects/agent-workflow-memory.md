---
entity_id: agent-workflow-memory
type: project
bucket: agent-memory
abstract: >-
  AWM (Agent Workflow Memory) extracts reusable procedural sub-routines from
  agent task trajectories and injects them as in-context memory, achieving 35.5%
  success on WebArena without model fine-tuning.
sources:
  - repos/zorazrw-agent-workflow-memory.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - deep/repos/bingreeky-memevolve.md
related: []
last_compiled: '2026-04-07T11:51:12.729Z'
---
# Agent Workflow Memory (AWM)

## What It Does

Agent Workflow Memory is a research system from Carnegie Mellon University (Zhiruo Wang, Jiayuan Mao, Daniel Fried, Graham Neubig) that solves a specific problem: web navigation agents repeat the same multi-step procedures from scratch on every task, treating each login, search, and checkout as novel. AWM addresses this by extracting abstract "workflows" from task trajectories, storing them as text, and injecting them as context at inference time.

The core claim is that procedural knowledge, abstracted away from task-specific details, transfers across similar tasks. A workflow for "add item to cart" that abstracts product names into `{product-name}` placeholders can inform any future shopping task, regardless of which product is involved. The agent executes faster and more reliably because it has a procedure to follow rather than reasoning from scratch.

The system is architecturally minimal: no vector database, no embedding model, no fine-tuning. Workflows live in plain text files. Memory retrieval happens by matching the current task's website to the appropriate file. What's unusual is the induction step itself, where an LLM abstracts concrete trajectories into reusable templates.

## Core Mechanism

The codebase splits across two independent benchmark environments (`webarena/` and `mind2web/`), each implementing the same three-phase pipeline.

**Phase 1: Induction**

`offline_induction.py` reads ground-truth annotated training examples and sends them to GPT-4o with an instruction template from `mind2web/prompt/`. The prompt includes a one-shot example of a good workflow, then formats the task examples and appends `# Summary Workflows` to trigger extraction. Temperature is set to 0.0 for deterministic output. `filter_workflows()` strips the response down to valid workflow descriptions.

`online_induction.py` does the same thing using the agent's own execution logs instead of ground-truth data. For WebArena, `induce_rule.py` runs before the LLM: it groups trajectories by `intent_template_id`, deduplicates by abstract action sequence (e.g., `click(12)_fill(5)_click(3)`), and filters to successful trajectories only. The LLM then abstracts the surviving examples.

Output is a plain text file per website: `workflow/shopping.txt`, `workflow/reddit.txt`, etc.

**Phase 2: Retrieval**

`mind2web/memory.py` loads the workflow text file for the current task's website and wraps it as a single user-content message. It then loads `exemplars.json` (concrete examples with domain/subdomain/website tags), filters by match specificity, samples up to `retrieve_top_k` examples, and checks total token count against `MAX_TOKENS[model]`, dropping exemplars if necessary. The final prompt is: `system_prompt + workflow_memory + concrete_exemplars + current_query`.

No embedding similarity, no ranking. Retrieval is coarse: everything in the website's workflow file enters context.

**Phase 3: Utilization and the Feedback Loop**

For Mind2Web, `pipeline.py` processes tasks in batches. Every `induce_steps` tasks, it re-runs induction on all results accumulated so far and updates the workflow files before the next batch. For WebArena, the loop is tighter: `pipeline.py` runs one task, auto-evaluates the trajectory, updates workflows, then runs the next task. The self-improvement cycle operates per-task.

This produces a documented "snowball effect": simple workflows become building blocks for compound ones. "Log in to account" gets incorporated into "purchase item," which gets incorporated into "process refund." The composition happens naturally through the LLM induction process since later inductions see trajectories that themselves used prior workflows.

## Key Numbers

**WebArena (GPT-4, self-reported by paper authors):**

| Method | Success Rate | Steps/Task |
|---|---|---|
| BrowserGym baseline | 23.5% | 7.9 |
| SteP (hand-engineered) | 33.0% | -- |
| AWM | 35.5% | 5.9 |

**Mind2Web Cross-Task (GPT-4, self-reported):**

| Method | Step Success | Task Success |
|---|---|---|
| MindAct | 36.2% | 2.0% |
| AWM | 45.1% | 4.8% |

The WebArena result was state-of-the-art at publication (September 2024). These figures are self-reported in the paper (arXiv:2409.07429); no independent reproduction is documented in the source material. The repository has 415 stars and 48 forks, suggesting moderate community adoption for a research artifact.

Notable ablation findings: LLM-based induction beats rule-based by 2.8 points (45.1% vs 43.4%). Text and code workflow formats perform comparably. Including filtered HTML in workflows hurts by 2.9 points. Performance stabilizes after roughly 40 queries. Average workflow count is 7.3-7.4 per website. AWM used workflows on 94% of WebArena test tasks.

The cross-template evaluation is the most credible generalization test: 33.2% success on non-overlapping task templates vs 23.2% for baselines. This rules out the concern that improvements came purely from memorizing specific task patterns.

## Strengths

**No labeled data required in online mode.** The agent bootstraps from its own trajectories. For new deployment environments without training data, the system starts improving from first contact.

**Automatic outperforms manual.** AWM's induced workflows beat SteP's human-engineered ones by 7.6%. The LLM finds patterns domain experts miss, presumably because it can examine many trajectories simultaneously.

**Efficiency gain.** 5.9 steps per task vs 7.9 for the baseline indicates that workflow guidance reduces exploration and backtracking. This has direct cost implications at scale.

**Compositionality.** The snowball effect means the system grows richer over time without storing every trajectory. The abstraction process compresses experience into reusable building blocks.

**LLM-agnostic.** Pure prompt injection means any API-accessible model works. No fine-tuning infrastructure required.

## Critical Limitations

**Action rigidity in dynamic environments.** The paper identifies this as AWM's core failure mode: workflows are fixed sequential templates. When a booking flow presents an unexpected popup or variant airport options mid-sequence, the agent has no mechanism to deviate from the workflow and re-engage fresh reasoning. The 94% utilization rate means the agent almost always follows a workflow, even when it shouldn't.

**Coarse retrieval and context budget pressure.** All workflows for a website enter context regardless of task relevance. On a shopping site with 40+ workflows, an agent checking order status loads checkout, refund, and product review workflows it doesn't need. This wastes context budget and may confuse the model. The code explicitly drops concrete exemplars when the token count exceeds `MAX_TOKENS[model]`, meaning relevant examples get cut to make room for irrelevant workflows.

**The unspoken infrastructure assumption.** Online induction requires GPT-4o API access for the induction step itself. Workflow induction is an additional LLM call (beyond the agent's own task execution calls) that the cost analysis in the paper does not break out separately. At scale, with frequent re-induction every `induce_steps` tasks, the induction API costs may approach or exceed the task execution costs.

## When NOT to Use It

**Single-task or low-volume deployments.** AWM's gains require accumulating enough trajectories to induce meaningful workflows (~40 queries per website). For one-off automations or infrequent task types, the system produces no benefit.

**Highly variable UI environments.** Websites that frequently redesign their UIs, or applications with dynamic flows that change based on state, will invalidate induced workflows quickly. The system has no mechanism for detecting workflow staleness.

**When action correctness is safety-critical.** The 94% workflow utilization rate means the agent almost always follows a stored procedure. In financial, medical, or legal automation contexts, following an outdated or incorrect workflow without deviation could cause serious errors. There is no confidence threshold or staleness detection.

**When combining offline and online induction.** The paper reports that AWMoff+on underperformed either approach individually, suggesting workflow conflicts when two induction sources produce incompatible procedures for the same task type. Use one mode, not both.

## Unresolved Questions

**Workflow decay and staleness.** The system overwrites workflow files on each induction round. There is no mechanism to detect when a workflow has become incorrect due to UI changes, flag it for re-induction, or maintain version history. How quickly do induced workflows become stale in production?

**Conflict resolution between workflows.** When two workflows cover similar task types but prescribe different action sequences, the agent sees both in context. How the LLM resolves this conflict is unspecified and presumably inconsistent.

**Induction cost accounting.** The paper's efficiency claims focus on steps per task, not total API cost including induction calls. For high-frequency re-induction, what is the actual cost overhead?

**Governance for multi-user settings.** Workflow files are per-website, shared across all agents using the same file path. In multi-user or multi-tenant deployments, one agent's bad trajectories could corrupt workflows used by other agents. No isolation or attribution mechanism exists.

**Prompt sensitivity.** Induction quality depends on a fixed one-shot example in the prompt template. The paper shows LLM-based induction outperforms rule-based, but does not test prompt variations. Different one-shot examples presumably produce qualitatively different workflow styles.

## Alternatives

**[Voyager](../projects/voyager.md)**: Stores skills as executable code rather than natural language procedures. Use Voyager when your environment exposes a programmatic API (like Minecraft) and you want verifiable, reusable code skills rather than natural language workflows.

**[Reflexion](../concepts/reflexion.md)**: Stores verbal self-reflection in episodic memory to avoid repeating mistakes. Use Reflexion when the goal is failure avoidance rather than procedure reuse, particularly for tasks without clear sub-routine structure.

**[CLAUDE.md](../concepts/claude-md.md)** / [Skill Files](../concepts/skill-md.md): Manually authored procedural memory files. Use when you want deterministic, human-curated procedures and can afford the authoring cost. Avoids the induction quality variance of AWM.

**[LangGraph](../projects/langgraph.md)**: Structured workflow graphs with explicit state machines. Use when you want guaranteed procedural compliance and can specify the workflow structure in advance, rather than inducing it from examples.

**[MemEvolve](../projects/memevolve.md)**: Evolves entire memory architectures via LLM code generation. AWM is one of MemEvolve's 12 baseline providers; MemEvolve evolved systems outperform AWM on the tested benchmarks. Use MemEvolve when you want automated architecture search rather than a fixed induction mechanism, and have the compute budget for multi-round evolution.

## Related Concepts

- [Procedural Memory](../concepts/procedural-memory.md): The memory type AWM implements
- [Agent Memory](../concepts/agent-memory.md): Broader taxonomy
- [Self-Improving Agent](../concepts/self-improving-agent.md): The class of system AWM belongs to
- [WebArena](../projects/webarena.md): Primary benchmark
- [Context Engineering](../concepts/context-engineering.md): Workflow injection is a form of context engineering
- [Episodic Memory](../concepts/episodic-memory.md): What AWM compresses trajectories away from

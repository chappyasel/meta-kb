---
entity_id: agent-workflow-memory
type: project
bucket: agent-memory
abstract: >-
  Agent Workflow Memory induces reusable procedural sub-routines from agent
  execution traces and injects them as in-context exemplars, achieving 35.6%
  success on WebArena without fine-tuning.
sources:
  - deep/repos/bingreeky-memevolve.md
  - deep/repos/zorazrw-agent-workflow-memory.md
  - repos/zorazrw-agent-workflow-memory.md
related: []
last_compiled: '2026-04-08T23:13:53.694Z'
---
# Agent Workflow Memory

**Type:** Research project / agent memory system
**Source:** Carnegie Mellon University (Zhiruo Wang, Jiayuan Mao, Daniel Fried, Graham Neubig)
**Paper:** arXiv:2409.07429 (September 2024)
**Repo:** zorazrw/agent-workflow-memory | 415 stars, 48 forks | Apache-2.0

## What It Does

Agent Workflow Memory (AWM) teaches web-navigation agents to remember *how* to do things, not just *what* happened. The core idea: when an agent repeatedly solves similar tasks (log in, search for a product, fill a checkout form), it wastes context window space replaying redundant trajectories. AWM instead extracts abstract "workflows" — parameterized sub-routines with concrete values replaced by placeholders — and injects them as high-level procedural guidance at inference time.

This is [Procedural Memory](../concepts/procedural-memory.md) implemented through pure prompt engineering: no fine-tuning, no embedding databases, no vector retrieval. Workflows live in plain text files (`workflow/{website}.txt`), one per website. The whole system works with any API-accessible LLM.

## Architecture

The codebase splits across two benchmark environments:

```
agent-workflow-memory/
  mind2web/
    pipeline.py           -- Offline/online orchestration loop
    memory.py             -- Workflow loading + exemplar construction
    offline_induction.py  -- Workflow generation from annotated training data
    online_induction.py   -- Workflow generation from agent trajectories
    workflow/retrieve.py  -- Website-scoped retrieval
  webarena/
    pipeline.py           -- Per-task online induction loop
    induce_rule.py        -- Trajectory deduplication before LLM abstraction
    induce_prompt.py      -- LLM-based workflow synthesis
    run.py                -- BrowserGym-based agent execution
    autoeval/             -- LLM judge for trajectory success
```

The three-phase loop that runs at inference:

1. **Induce** — Extract abstract workflows from ground-truth examples (offline) or the agent's own past trajectories (online)
2. **Retrieve** — Load the website-scoped workflow file; filter concrete exemplars by domain/subdomain/website specificity; trim to token budget
3. **Utilize** — Inject as `system_prompt + workflow_memory + concrete_exemplars + current_query`

The formal model: **L(q, M+W, o) → a**, where L is the LLM, M is base action documentation, W is the induced workflow set, q is the task instruction, o is the current browser observation.

## Core Mechanism: Workflow Induction

**Offline induction** (`offline_induction.py`) processes ground-truth annotated examples, formats them with candidate element scores from `data/scores_all_data.pkl`, and sends them to GPT-4o at temperature 0.0. The response passes through `filter_workflows()` and gets written to `workflow/{website}.txt`.

**Online induction** runs after each batch of tasks. In WebArena, the loop is per-task:

```python
for tid in task_ids:
    Popen(["python", "run.py", ...])                         # inference
    Popen(["python", "-m", "autoeval.evaluate_trajectory"]) # auto-eval
    Popen(["python", "induce_prompt.py", ...])               # update workflows
```

`induce_rule.py` performs trajectory deduplication before the LLM sees anything: group by `intent_template_id`, sample one representative per template, further deduplicate by abstract action sequence (`click(12)_fill(5)_click(3)`). This compression step matters — without it, the LLM spends tokens reconciling fifty near-identical checkout trajectories.

The abstraction replaces concrete values with placeholders: `{product-name}`, `{search-query}`, `{destination-city}`. Abstractions are coarse by design — the LLM decides what to generalize.

The **snowball effect**: simple workflows (log in) become building blocks for compound ones (purchase item = log in + search + add to cart + checkout). The paper documents this compositional growth.

## Key Numbers

| Benchmark | Method | Success Rate | Notes |
|---|---|---|---|
| WebArena | Baseline (BrowserGym) | 23.5% | — |
| WebArena | SteP (human-engineered) | 33.0% | Hand-crafted workflows |
| WebArena | **AWM** | **35.6%** | Self-reported |
| Mind2Web Cross-Task | MindAct | 2.0% | — |
| Mind2Web Cross-Task | **AWM** | **4.8%** | Self-reported |
| Mind2Web Step Success | MindAct | 36.2% | — |
| Mind2Web Step Success | **AWM** | **45.1%** | Self-reported |

All results are self-reported in the paper. No independent third-party replication confirmed at time of writing. The WebArena 35.6% figure appears in the README leaderboard screenshot, not a separate evaluation infrastructure.

Additional ablation findings from the paper:

- LM-based induction beats rule-based by 2.8 points (45.1% vs 43.4% step success)
- Including filtered HTML in workflows *hurt* by 2.9 points (context noise)
- ~40 queries to build useful workflows; performance stabilizes thereafter
- 94% of WebArena test tasks used at least one workflow (utilization rate 0.94)
- Cross-template evaluation: 33.2% vs 23.2% for baselines — genuine generalization, not template memorization

## Strengths

**Works without labeled data.** Online mode bootstraps from the agent's own experience. No training corpus required for a new website — just run some tasks and induce.

**Outperforms hand-crafted workflows.** AWM beat SteP (human-engineered procedures) by 7.6 points on WebArena. Automated induction found patterns human designers missed.

**Efficient.** 5.9 steps per task vs 7.9 for the baseline — the procedural guidance cuts redundant exploration.

**Composable.** The snowball effect means capability compounds: early simple workflows support later complex ones without additional engineering.

**No infrastructure dependencies.** Plain text files, standard API calls. Drops into any Python environment.

## Critical Limitations

**Concrete failure mode — action rigidity in dynamic environments.** The paper explicitly names this: "workflow actions lack flexibility for dynamic environments." A workflow for booking flights encodes a fixed action sequence. When a popup shows unexpected airport options, the agent tries to follow the workflow rather than handle the deviation. Fixed sequential structures fail when the UI presents unexpected states.

**Unspoken infrastructure assumption — GPT-4o availability.** Both induction modes call GPT-4o at temperature 0.0 for workflow generation. The code does not abstract the model choice — it's hardcoded. Running AWM without GPT-4o API access requires non-trivial code changes.

## When NOT to Use It

**Novel websites with no prior task history.** AWM needs some executions before induction produces anything useful. Cold-start on an unfamiliar site yields no workflows and no benefit — the agent operates without the memory mechanism until it accumulates experience.

**Highly dynamic UIs.** If the website's DOM changes significantly between visits (A/B tests, personalization, session-specific content), workflows learned on one session may misguide the agent on the next. The fixed-sequence assumption breaks.

**Tasks requiring fine-grained retrieval across many websites.** Workflows are scoped per website in flat text files. If a task spans multiple sites, the retrieval granularity doesn't match. The website hierarchy also means entirely new domains have no workflow inheritance from structurally similar sites.

**When you need workflow versioning or quality comparison.** AWM overwrites workflow files on each induction pass. No history, no A/B comparison, no mechanism to identify whether the update improved or degraded quality. If the most recent batch of trajectories was poor, the workflows degrade silently.

## Unresolved Questions

**Combining offline and online workflows hurts.** The paper reports that AWM_off+on *underperformed* both individual modes. The paper attributes this to "conflicts" between workflows from different induction sources but does not explain the mechanism or propose a resolution strategy.

**No workflow quality signal.** The auto-evaluator scores task outcomes, not workflow quality. A workflow derived from a successful trajectory may encode an inefficient path. There is no mechanism to compare two workflow formulations for the same sub-task.

**Divergence judgment.** When should the agent ignore a workflow and adapt? The paper reports slightly lower action F1 (57.3% vs 60.6%) in some conditions, suggesting workflow adherence can override correct task-specific judgment. No guidance on when deviation is appropriate.

**Scaling to many websites.** The current design creates one file per website. At hundreds of websites, file management and retrieval become unwieldy. The paper does not address this.

## Relationship to Adjacent Work

[MemEvolve](../projects/memevolve.md) reimplements AWM as the `agent_workflow_memory` provider within its EvolveLab framework, then uses meta-evolution to generate architectures that outperform it. MemEvolve's paper reports improvements of 3.54–17.06% over AWM across benchmarks (self-reported). AWM functions as a strong baseline that automated architecture search surpasses — which validates the workflow memory concept while revealing room for improvement.

The Hierarchical Memory Tree (HMT) paper (arXiv:2603.07024, 2026) extends AWM with a three-level hierarchy: Intent (standardized task goals), Stage (reusable semantic subgoals with pre/post conditions), Action (transferable element patterns). HMT demonstrates that AWM's flat per-website text files leave organizational structure on the table.

## Alternatives

| System | When to prefer it |
|---|---|
| [Voyager](../projects/voyager.md) | Minecraft / closed-world environments where skill libraries can be tested in isolation |
| [Reflexion](../concepts/reflexion.md) | Short-horizon tasks where verbal self-reflection per episode is sufficient |
| [MemEvolve](../projects/memevolve.md) | You want the memory architecture itself to evolve, not just its contents |
| [Letta](../projects/letta.md) | You need multi-session persistent memory with explicit memory management APIs |
| [LangGraph](../projects/langgraph.md) | You need workflow graphs as executable code, not in-context text templates |

Use AWM when: you have a web navigation agent, want procedural memory without infrastructure overhead, and can tolerate cold-start latency on new websites.

## Sources

- [Deep implementation analysis](../raw/deep/repos/zorazrw-agent-workflow-memory.md)
- [Repo summary](../raw/repos/zorazrw-agent-workflow-memory.md)
- [MemEvolve analysis](../raw/deep/repos/bingreeky-memevolve.md) (positions AWM as baseline)

## Related Concepts

- [Procedural Memory](../concepts/procedural-memory.md)
- [Agent Memory](../concepts/agent-memory.md)
- [Episodic Memory](../concepts/episodic-memory.md)
- [Self-Improving Agents](../concepts/self-improving-agents.md)
- [Context Engineering](../concepts/context-engineering.md)
- [Execution Traces](../concepts/execution-traces.md)

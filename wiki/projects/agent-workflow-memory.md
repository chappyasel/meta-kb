---
entity_id: agent-workflow-memory
type: project
bucket: agent-memory
sources:
  - repos/zorazrw-agent-workflow-memory.md
  - deep/repos/bingreeky-memevolve.md
  - deep/repos/zorazrw-agent-workflow-memory.md
related: []
last_compiled: '2026-04-05T05:37:42.606Z'
---
# Agent Workflow Memory (AWM)

**Repository:** zorazrw/agent-workflow-memory | **License:** Apache-2.0 | **Stars:** 415 | **Language:** Python

Research implementation from Carnegie Mellon University (Wang, Mao, Fried, Neubig), accompanying arXiv:2409.07429. Accepted at a top venue in 2024.

---

## What It Does

AWM gives web navigation agents a form of procedural memory. Rather than replaying past episodes or retrieving raw trajectories, the agent extracts abstract "workflows" from experience and injects them as in-context exemplars during future inference. A workflow is a common sub-routine with task-specific values replaced by placeholders: not "click the red Nike shoes in size 10" but "navigate to product page, select variant, click add-to-cart button."

The core loop: induce workflows from examples or past traces, retrieve relevant ones for a new task, inject into the prompt alongside the observation.

---

## Architecture

The codebase splits into two independent benchmark environments:

```
agent-workflow-memory/
  mind2web/
    pipeline.py           -- offline/online orchestration
    memory.py             -- retrieval and exemplar construction
    offline_induction.py  -- workflow generation from training data
    online_induction.py   -- workflow generation from agent trajectories
    run_mind2web.py       -- inference with workflow-augmented prompts
    workflow/retrieve.py  -- similarity-based workflow retrieval
    data/memory/          -- exemplars.json
  webarena/
    pipeline.py           -- per-task induction loop
    induce_rule.py        -- trajectory deduplication before LLM induction
    induce_prompt.py      -- LLM-based workflow abstraction
    run.py                -- BrowserGym agent execution
    workflow/             -- per-website workflow text files
    autoeval/             -- LLM-based trajectory evaluation
```

The agent's inference call takes the form **L(q, M+W, o) → a**, where M is base memory (action documentation), W is the induced workflow set, and o is the current browser observation. Workflows augment the prompt; no fine-tuning occurs.

### Three Phases

**1. Induction**

*Offline* (`offline_induction.py`): Loads ground-truth annotated examples, formats them with candidate element scores from `data/scores_all_data.pkl`, sends to GPT-4o at temperature 0.0, then runs output through `filter_workflows()`. Saves one text file per website.

*Online* (`online_induction.py`): Loads the agent's own past trajectory logs, formats them alongside task descriptions, sends the same induction prompt to GPT-4o, and overwrites the previous workflow file. Mind2Web's pipeline batches this every `induce_steps` tasks. WebArena's `pipeline.py` runs it after every single task:

```python
for tid in task_ids:
    Popen(["python", "run.py", "--workflow_path", f"workflow/{website}.txt"])
    Popen(["python", "-m", "autoeval.evaluate_trajectory", ...])
    Popen(["python", "induce_prompt.py", "--result_dir", "results", ...])
```

`induce_rule.py` handles trajectory deduplication before LLM abstraction: group by `intent_template_id`, deduplicate by abstract action sequences (e.g., `click(12)_fill(5)_click(3)`), then feed to the LLM. This prevents redundant sub-routines from inflating the workflow file.

**2. Retrieval**

`memory.py` filters concrete exemplars from `exemplars.json` by website, subdomain, or domain (decreasing specificity), samples up to `retrieve_top_k`, then iteratively adds them to the prompt while checking against `MAX_TOKENS[model]`. The entire workflow file for the relevant website is included as a system-level context block. There is no per-workflow semantic search; the full file goes in.

**3. Utilization**

The final prompt is: `system_prompt + workflow_memory + concrete_exemplars + current_query`. Workflow memory acts as procedural guidance; concrete exemplars provide action-level patterns. The two-tier design separates abstract procedure from specific UI mechanics.

### Compositional Growth

The paper describes a "snowball effect": as the agent gains experience, simple workflows (log in, search) become building blocks for compound workflows (purchase item = log in + search + add to cart + checkout). This compositional property distinguishes AWM from flat exemplar retrieval.

---

## Benchmark Results

Self-reported by the paper's authors.

**WebArena (GPT-4):**

| Method | Success Rate | Steps/Task |
|---|---|---|
| BrowserGym baseline | 23.5% | 7.9 |
| SteP (hand-engineered) | 33.0% | — |
| **AWM** | **35.5%** | **5.9** |

AWM outperforms human-engineered workflows by 7.6% while using fewer steps.

**Mind2Web Cross-Task (GPT-4):**

| Method | Element Accuracy | Step Success | Task Success |
|---|---|---|---|
| MindAct | 41.6% | 36.2% | 2.0% |
| **AWM** | **50.6%** | **45.1%** | **4.8%** |

**Key ablations:**
- LM-based induction beats rule-based by 2.8 points (45.1% vs 43.4% step success)
- ~40 task executions yield meaningful gains; success rate stabilizes after acquiring core workflows
- Average 7.3–7.4 workflows per website kept memory compact
- Including filtered HTML in workflows *hurt* by 2.9 points (context pollution)
- Combining offline + online workflows underperformed either approach alone (conflicting induction modes)
- 94% of WebArena test tasks used at least one workflow

Cross-template evaluation (non-overlapping task templates): 33.2% success vs 23.2% for baselines, suggesting genuine generalization rather than template memorization.

Results are self-reported. The WebArena leaderboard position was valid at time of publication (Sept 2024); current standings may differ.

---

## Strengths

**Procedural memory without fine-tuning.** AWM achieves cross-task transfer through prompt engineering alone. No gradient updates, no labeled data required in online mode.

**Works against the context window.** Workflows are compact (7–8 per website), so injection stays tractable. The two-tier structure (abstract workflow + concrete exemplar) provides coverage without requiring the full trajectory history.

**Self-improving from its own experience.** The online loop bootstraps from agent traces, improving over ~40 tasks. Deployment scenarios without training data can still get meaningful gains.

**Outperforms hand-crafted procedures.** The comparison with SteP's human-engineered workflows is credible evidence that automated induction discovers patterns domain experts miss.

---

## Limitations

**Concrete failure mode — action rigidity.** Workflows are fixed sequential structures. When an e-commerce site shows a popup with unexpected airport or variant options, the predetermined action sequence cannot adapt. The paper acknowledges this directly: agents "struggle to identify when to deviate from workflow guidelines," and the slightly lower action F1 scores (57.3% vs 60.6% for MindAct) confirm that workflow adherence sometimes overrides correct task-specific judgment.

**Unspoken infrastructure assumption.** The entire pipeline assumes API access to GPT-4o for induction. Induction calls are not cheap: every online update sends full trajectory batches to the model. At 40 tasks to stabilize plus ongoing per-batch updates, production deployments face continuous LLM API costs that the benchmarks don't surface. The codebase has no mechanism for cheaper induction alternatives.

**Online mode overwrites history.** Each induction round overwrites the workflow file entirely. Earlier insights that don't appear in the new batch are silently lost. There is no versioning, merging, or quality comparison across induction rounds.

**Coarse retrieval.** The full workflow file for a website goes into every prompt for that website, regardless of relevance. For websites with many workflows, context pressure builds. There is no per-workflow semantic retrieval.

**Garbage-in-garbage-out risk.** Mind2Web's online mode derives workflows from all agent trajectories, not just successful ones. WebArena's `induce_rule.py` filters to successful trajectories before induction, but Mind2Web has no equivalent filter. Poor early performance can encode bad strategies that persist.

---

## When NOT to Use It

**Dynamic, state-dependent UIs.** If the web application regularly presents branching UI states (conditional popups, multi-step confirmations, personalised page variants), workflow rigidity will cause agents to follow stale procedures into incorrect states.

**Single-task or low-volume deployments.** AWM needs ~40 task executions to yield meaningful gains. For deployments handling fewer tasks per website, the induction overhead produces little return.

**When you need auditable memory.** Workflows are LLM-generated text with no formal guarantees. If your deployment requires explainable or formally verifiable agent behavior, the induction-and-injection mechanism is opaque by design.

**Novel websites with no prior data.** The domain/subdomain/website hierarchy assumes website-organized workflows. First-contact with a new site produces no workflows, and the retrieval system has nothing to offer.

---

## Unresolved Questions

**Offline + online combination failure.** The ablation shows that combining offline and online workflows hurt performance. The paper doesn't explain why. Presumably the two induction modes produce conflicting procedural templates, but there's no analysis of which tasks regressed or what structural conflicts arise.

**Workflow quality degradation over time.** The paper shows convergence after ~40 tasks but doesn't report what happens over longer horizons. Does online induction eventually produce bloated, conflicting workflow files? Is there a ceiling or does it plateau?

**Cost at scale.** GPT-4o induction calls on batched trajectories aren't quantified in dollar terms. Production teams would need to instrument this before committing to the online pipeline.

**Governance of the workflow file.** There's no access control, auditing, or rollback mechanism on the per-website text files. In a multi-agent or shared deployment, concurrent induction rounds would produce race conditions.

---

## Alternatives

**[MemEvolve](../projects/memevolve.md) — use when you want automated architecture search over memory systems.** MemEvolve treats AWM as one of 12 baseline providers and uses LLM code generation to evolve entirely new memory architectures. It outperforms AWM on tested benchmarks at the cost of substantially higher engineering complexity and LLM costs. Choose AWM when you want a deployable system with known behavior; choose MemEvolve when you're willing to trade operational complexity for potentially higher ceilings.

**Hierarchical Memory Tree (HMT, arXiv:2603.07024) — use when task diversity requires structured memory organization.** HMT extends AWM with a three-level hierarchy (Intent / Stage / Action) that adds pre/post conditions and standardized goal representations. More expressive memory structure at the cost of more complex induction. Direct extension of AWM's design rather than a competing approach.

**SteP — use when you have domain experts and need auditable procedures.** Human-engineered workflows are interpretable, versioned, and controllable. AWM outperforms SteP, but SteP's procedures can be reviewed, corrected, and governed in ways LLM-induced workflows cannot.

**Flat exemplar retrieval — use when procedural abstraction adds more complexity than benefit.** For short-horizon tasks where task-specific examples transfer well, retrieving concrete examples without induction is simpler and avoids workflow rigidity failures. AWM's two-tier design already includes concrete exemplars; removing the workflow tier gives you this baseline.

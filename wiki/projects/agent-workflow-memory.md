---
entity_id: agent-workflow-memory
type: project
bucket: agent-memory
abstract: >-
  Agent Workflow Memory induces reusable procedural sub-routines from task
  execution traces and injects them into agent context, achieving 35.6% on
  WebArena by transferring learned workflows across tasks without fine-tuning.
sources:
  - repos/zorazrw-agent-workflow-memory.md
  - deep/repos/bingreeky-memevolve.md
  - deep/repos/zorazrw-agent-workflow-memory.md
related: []
last_compiled: '2026-04-08T02:56:28.931Z'
---
# Agent Workflow Memory (AWM)

## What It Does

AWM treats procedural knowledge as a distinct memory type worth storing and reusing. Rather than replaying raw past trajectories or retrieving similar episodes, it abstracts common sub-routines from task execution traces into "workflows" -- step-by-step templates with example-specific values replaced by placeholders like `{product-name}` or `{search-query}`. At inference time, relevant workflows are injected into the agent's context alongside concrete exemplars, giving the agent both high-level procedural guidance and specific action patterns.

The key architectural choice: workflows live as plain text files (`workflow/{website}.txt`), one per website. No embedding databases, no vector indices, no fine-tuning. The agent's base LLM reads workflows as additional context in its prompt.

AWM runs in two modes. **Offline** mode induces workflows from ground-truth annotated training examples -- clean signal, but requires labeled data. **Online** mode induces from the agent's own execution trajectories as it runs, requiring no external data but bootstrapping from potentially imperfect behavior. The paper reports that combining both modes (AWMoff+on) actually underperformed either individually, suggesting the two induction sources create conflicting workflow formulations.

**Repository:** [zorazrw/agent-workflow-memory](https://github.com/zorazrw/agent-workflow-memory) | 415 stars, 48 forks (Apache-2.0)

## Core Mechanism

The pipeline has three phases: induce, retrieve, utilize.

**Induction** (`offline_induction.py`, `online_induction.py`, `webarena/induce_prompt.py`): An LLM (GPT-4o, temperature 0.0) receives formatted task examples with a "# Summary Workflows" suffix and generates abstract workflow descriptions. The WebArena path runs deduplication first (`induce_rule.py`): trajectories are grouped by `intent_template_id`, deduplicated by abstract action signature (e.g., `click(12)_fill(5)_click(3)`), then passed to the LLM for abstraction. This deduplication step is important -- without it, the LLM receives redundant trajectories and produces redundant workflows.

For online learning, the WebArena pipeline (`webarena/pipeline.py`) updates workflows after every task:

```python
for tid in task_ids:
    Popen(["python", "run.py", "--workflow_path", f"workflow/{website}.txt"])
    Popen(["python", "-m", "autoeval.evaluate_trajectory", ...])
    Popen(["python", "induce_prompt.py", "--result_dir", "results", ...])
```

Each induction overwrites the previous workflow file. There's no versioning, no diff tracking, and no mechanism to compare quality across induction rounds.

**Retrieval** (`mind2web/memory.py`): For Mind2Web, the system selects concrete exemplars from `exemplars.json` by matching domain/subdomain/website hierarchy, sampling up to `retrieve_top_k`, and trimming to fit within `MAX_TOKENS[model]`. The entire workflow file for the relevant website is always included -- no per-workflow similarity filtering.

**Utilization**: The final prompt is `system_prompt + workflow_memory + concrete_exemplars + current_query`. The workflow acts as a procedural guide; the exemplars provide specific action patterns. Both are pure in-context injection.

**The snowball effect** is the compositionality property: simple workflows ("log in to account") become building blocks for compound workflows ("purchase item" = log in + search + add to cart + checkout). This emerges naturally from online induction, as later trajectories that use learned workflows produce more complex patterns for the next induction round.

## Benchmarks

**WebArena (GPT-4):** 35.5% success rate vs. 23.5% BrowserGym baseline and 33.0% for SteP (human-engineered workflows). AWM also used fewer steps per task (5.9 vs. 7.9). Cross-template evaluation showed 33.2% success on non-overlapping task templates vs. 23.2% baseline, confirming generalization rather than template memorization. *Self-reported in the paper; no independent replication cited.*

**Mind2Web (GPT-4, Cross-Task):** 50.6% element accuracy, 45.1% step success, 4.8% task success vs. MindAct's 41.6% / 36.2% / 2.0%. *Self-reported.*

**Operational parameters:** ~40 queries to reach stable performance; average 7.3-7.4 workflows per website; 94% utilization rate on WebArena (94% of tasks used at least one workflow).

The paper reports a 2.8 point improvement for LM-based induction over rule-based induction (45.1% vs. 43.4% step success), and a 2.9 point degradation when filtered HTML is included in workflows -- the irrelevant elements pollute the context.

## Strengths

**No fine-tuning required.** AWM works with any API-accessible LLM. The entire memory mechanism runs through prompt engineering, making it deployable without training infrastructure.

**Efficient bootstrapping.** Meaningful performance gains within ~40 task executions. For deployment scenarios with limited data, this practical efficiency matters.

**Beats human-engineered workflows.** Outperforming SteP's hand-crafted workflow library by 7.6% suggests LLM-based induction discovers procedural patterns domain experts miss -- a nontrivial result given that hand-crafting is expensive and supposedly benefits from human insight.

**Distinct memory type.** AWM cleanly separates procedural memory (how to do things) from episodic memory (what happened) and semantic memory (what is true). The workflow abstraction is a meaningful compression that episodic replay doesn't provide.

## Critical Limitations

**Action rigidity in dynamic environments.** This is the paper's own stated limitation: when a workflow specifies a fixed action sequence, the agent struggles to adapt when the environment presents unexpected UI states. Booking a flight with a predetermined click sequence breaks when a popup offers different airport options. The workflow becomes a liability when the environment deviates from the pattern it was induced from.

**Unspoken infrastructure assumption: website-stable UI.** AWM's per-website workflow organization assumes that websites don't change their UI significantly between workflow induction and task execution. In practice, A/B tests, feature rollouts, and UI redesigns can invalidate learned workflows without any signal to the agent. The system has no mechanism to detect stale workflows or trigger re-induction. For enterprise deployment against rapidly changing web interfaces, this is a real operational risk.

## When Not to Use It

**Novel or one-off tasks.** AWM's value compounds across similar tasks -- the snowball effect requires repetition. If your agent handles highly diverse tasks with minimal overlap, workflow induction produces a thin library that rarely matches. The retrieval returns nothing useful, and the workflow memory adds prompt tokens with no benefit.

**Adversarial or security-sensitive contexts.** Workflows induced from trajectories encode the paths the agent took, including any UI manipulation or social engineering attempts in the environment. If malicious actors can influence the tasks the agent sees, they can inject workflows encoding harmful action sequences.

**Strict context budget environments.** Injecting an entire website's workflow file plus concrete exemplars plus the current web page observation can hit context limits quickly. The code trims exemplars to fit but the workflow file itself always gets included. With complex pages and long workflow files, the observation that actually describes the current task state may be truncated.

**When offline+online combination is needed.** The paper's finding that AWMoff+on underperforms both individual modes is unexplained and unresolved. If you need both labeled training data and online experience to be incorporated, AWM's architecture doesn't handle this gracefully.

## Unresolved Questions

**Why does combining offline and online modes hurt?** The paper reports AWMoff+on underperforms AWMoff and AWMon independently, but doesn't explain the mechanism. The most plausible hypothesis is that the two induction sources produce workflows with conflicting granularity or framing, and the agent can't reconcile them in context. But this is speculation -- the paper doesn't investigate.

**Stale workflow detection.** There's no mechanism to identify when an induced workflow has become outdated. The system overwrites workflows on re-induction, but only when re-induction is triggered. Between induction rounds, stale workflows persist and may actively mislead the agent.

**Cost at scale.** Each task execution triggers an LLM call for induction. The paper doesn't report total API costs for the benchmark evaluations. For high-volume deployments, the per-task induction cost could dominate.

**Workflow quality evaluation.** There's no metric for workflow quality independent of downstream task performance. A bad workflow that happens to not be retrieved looks the same as a good workflow in the aggregate numbers.

## Alternatives

**[Episodic Memory](../concepts/episodic-memory.md):** Stores raw trajectory snapshots rather than abstractions. Use when task variety is too high for pattern abstraction, or when exact replay is more reliable than generalized procedures.

**[Voyager](../projects/voyager.md):** Stores skills as executable code rather than textual workflows. Use when tasks require computational precision (exact parameters, arithmetic) rather than UI navigation patterns where natural language abstraction is sufficient.

**[MemEvolve](../projects/memevolve.md):** Generates entirely new memory provider architectures from trajectory analysis rather than tuning workflow content. MemEvolve's EvolveLab framework reimplements AWM as one of 12 baseline providers and reports that evolved architectures outperform it on benchmarks. Use MemEvolve when you have compute budget for automated architecture search and need to push past AWM's ceiling.

**[Reflexion](../concepts/reflexion.md):** Stores verbal reflections on failures rather than successful procedures. Use when task success is rare and the signal worth learning from is in the failures.

**[CLAUDE.md](../concepts/claude-md.md):** Human-authored procedural instructions injected at context start. Use when domain experts can articulate the relevant procedures and you want to skip the induction step entirely. SteP (which AWM outperforms) is essentially this pattern.

**[AFlow](../projects/aflow.md):** Automated workflow search via code-represented agentic workflows with MCTS optimization. Use when you need systematically optimized workflow graphs rather than LLM-induced text templates.

## Position in the Ecosystem

AWM formalizes [Procedural Memory](../concepts/procedural-memory.md) as a distinct mechanism in the [Agent Memory](../concepts/agent-memory.md) stack. It sits between pure episodic replay (too specific) and semantic knowledge bases (too abstract), occupying the procedural middle ground. The workflow abstraction -- concrete trace to reusable template -- is the same operation humans perform when they move from "I did X this time" to "when you need to do Y, here's how."

The paper's influence on subsequent work confirms the concept's value: HMT (2026) adds three-level hierarchy over flat workflow memory, and MemEvolve uses AWM as a baseline to surpass through automated architecture search. The core insight -- that procedural memory transfer is both possible and valuable for LLM agents -- has become foundational enough that newer systems compete against AWM as a reference point.

[Source: deep/repos/zorazrw-agent-workflow-memory.md](../raw/deep/repos/zorazrw-agent-workflow-memory.md) | [Source: repos/zorazrw-agent-workflow-memory.md](../raw/repos/zorazrw-agent-workflow-memory.md)

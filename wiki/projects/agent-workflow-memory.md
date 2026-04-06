---
entity_id: agent-workflow-memory
type: project
bucket: agent-memory
abstract: >-
  AWM induces abstract, reusable workflow templates from agent execution
  trajectories and injects them as in-context memory, achieving 35.6% on
  WebArena without fine-tuning.
sources:
  - repos/zorazrw-agent-workflow-memory.md
  - deep/repos/bingreeky-memevolve.md
  - deep/repos/zorazrw-agent-workflow-memory.md
related: []
last_compiled: '2026-04-06T02:10:11.496Z'
---
# Agent Workflow Memory (AWM)

## What It Does

Agent Workflow Memory is a research framework from Carnegie Mellon University (Zora Zhiruo Wang, Jiayuan Mao, Daniel Fried, Graham Neubig) that addresses a specific failure mode in web navigation agents: they repeatedly re-derive the same multi-step procedures from scratch across similar tasks. AWM solves this by extracting abstract sub-routines ("workflows") from past executions and injecting them into the agent's context at inference time. The key insight is that procedural knowledge transfers better when abstracted: "navigate to product page, select variant, click add-to-cart" generalizes across tasks where "click the red Nike shoes in size 10" does not.

The paper (arXiv:2409.07429, September 2024) achieved state-of-the-art results on WebArena at publication. It has since become a benchmark system in the agent memory literature: MemEvolve includes AWM as one of twelve baseline providers to evolve beyond, and the Hierarchical Memory Tree paper extends AWM's core abstraction into a three-level hierarchy.

## Architecture

The repository splits into two independent benchmark environments:

```
agent-workflow-memory/
  mind2web/
    pipeline.py          -- Offline/online workflow orchestration
    memory.py            -- Workflow retrieval and exemplar construction
    offline_induction.py -- Workflow generation from training data
    online_induction.py  -- Workflow generation from agent trajectories
    workflow/retrieve.py -- Workflow retrieval
  webarena/
    pipeline.py          -- Per-task induction loop
    induce_rule.py       -- Trajectory deduplication + workflow extraction
    induce_prompt.py     -- LLM-based workflow abstraction
    run.py               -- BrowserGym-based agent execution
    workflow/            -- Per-website workflow text files
    autoeval/            -- Automated trajectory evaluation
```

The core loop runs three phases:

1. **Induce** -- Extract abstract workflows from annotated examples (offline) or past agent trajectories (online)
2. **Retrieve** -- Select relevant workflows based on task domain/website/subdomain match
3. **Utilize** -- Inject workflows as additional context into the agent's prompt

Storage is plain text files, one per website (`workflow/shopping.txt`, `workflow/reddit.txt`, etc.). No vector database, no embeddings.

## How Induction Works

**Offline induction** (`offline_induction.py`) loads ground-truth annotated training examples, formats them with candidate element scores, and sends them to GPT-4o (temperature 0.0) with a fixed instruction template and one-shot example. The response goes through `filter_workflows()` to extract valid descriptions, then gets saved as a website-scoped text file.

**Online induction** operates on the agent's own execution traces. The WebArena pipeline (`webarena/pipeline.py`) runs this per-task:

```python
for tid in task_ids:
    Popen(["python", "run.py", "--workflow_path", f"workflow/{website}.txt"])
    Popen(["python", "-m", "autoeval.evaluate_trajectory", ...])
    Popen(["python", "induce_prompt.py", "--result_dir", "results", ...])
```

Before passing trajectories to the LLM, `induce_rule.py` deduplicates them: tasks with the same `intent_template_id` get grouped, one gets sampled, and trajectories get converted to abstract action sequences (`click(12)_fill(5)_click(3)`) to remove redundant concrete instances. This matters because without deduplication, the LLM would spend its context window on near-identical action patterns.

Workflows replace concrete values with placeholders: `{product-name}`, `{search-query}`, `{destination-city}`. The abstraction process is entirely LLM-driven; no structured pattern mining.

**The snowball effect**: simple workflows become building blocks for compound ones. "Log in to account" gets embedded in "purchase item," which the LLM can reference when inducing "process a return." This compositional property is emergent rather than engineered.

At inference time, `memory.py` constructs the final prompt by loading the website's workflow text as a single user-content message, then filtering concrete exemplars from `exemplars.json` by website/subdomain/domain match, sampling up to `retrieve_top_k`, and checking total token count against `MAX_TOKENS[model]` before adding each.

## Benchmarks

**WebArena (GPT-4)**:

| Method | Success Rate |
|---|---|
| BrowserGym baseline | 23.5% |
| SteP (human-engineered workflows) | 33.0% |
| AWM | 35.5-35.6% |

AWM also required fewer steps per task (5.9 vs 7.9 for baseline), suggesting more efficient execution rather than just more attempts. Outperforming hand-crafted SteP workflows by 7.6% is the more surprising result: automated induction discovered procedural patterns that domain experts missed.

**Mind2Web (GPT-4, Cross-Task)**:

| Method | Step Success | Task Success |
|---|---|---|
| MindAct | 36.2% | 2.0% |
| AWM | 45.1% | 4.8% |

Online AWM improved step success by 14.0-16.9 absolute points vs baselines as train-test distribution gaps widened, suggesting workflows genuinely transfer rather than memorize template-specific patterns.

**Key ablations**: LM-based induction beat rule-based by 2.8 points. Including filtered HTML in workflows hurt performance by 2.9 points. ~40 queries yielded significant gains with performance stabilizing after that. Average 7.3-7.4 workflows per website. 94% of WebArena test tasks used at least one workflow.

These results are self-reported from the paper. Independent replication on WebArena is complicated by environment non-determinism and frequent UI changes on the live websites used as benchmarks.

[415 GitHub stars, 48 forks as of April 2026]

## Strengths

**No fine-tuning required.** AWM improves agent performance purely through context injection. Any API-accessible LLM can use it.

**Efficient bootstrapping.** Significant gains appear within ~40 task executions. Viable for deployment scenarios without large labeled datasets.

**Cross-task generalization demonstrated.** The cross-template WebArena evaluation (33.2% on non-overlapping templates vs 23.2% for baseline) shows the abstraction mechanism works beyond memorization.

**Minimal infrastructure.** Plain text files, GPT-4o API calls, BrowserGym. No vector database or embedding model required.

## Critical Limitations

**Action rigidity under environment variation.** Workflows encode fixed sequential structures. When a booking flow presents an unexpected popup or a UI renders differently, the agent struggles to recognize that the workflow no longer applies and cannot adapt mid-sequence. The paper flags this explicitly: predetermined sequences cannot handle dynamic environments with variant UI states. This is a fundamental tension: the abstraction that makes workflows general also makes them brittle when environments deviate from the pattern.

**Unspoken infrastructure assumption.** The system assumes tasks can be scoped to a specific website. Workflow storage, retrieval, and induction all key off `website` identifiers. Cross-website tasks, novel websites, or tasks where the relevant website isn't known in advance receive no workflow support. This assumption is fine for WebArena's five fixed sites but limits generalization to open-ended deployments.

**Overwriting without versioning.** Online induction overwrites the workflow file on each update. Earlier insights disappear if the new batch of trajectories doesn't reproduce them. There's no comparison across induction rounds, no rollback, and no mechanism to identify which workflows degrade performance.

## When Not to Use It

Skip AWM if your tasks span many domains or novel websites with no prior trajectory data. The retrieval mechanism is website-scoped; without a matching website, there's no workflow to retrieve.

Avoid AWM for tasks requiring real-time adaptation to unexpected UI states. If your environment frequently presents variations (A/B tests, personalized interfaces, dynamic content), the fixed sequential structure of workflows will cause the agent to push through incorrect action sequences rather than recognize the deviation.

AWM is also a poor fit if you need interpretable failure attribution. When a workflow-guided agent fails, it's unclear whether the failure came from the workflow itself, the retrieval step selecting the wrong workflow, or the agent misapplying an otherwise correct workflow.

## Unresolved Questions

**Workflow conflict resolution.** The offline+online combined setting underperformed both individual approaches in the paper. The documentation doesn't explain what happens when offline and online workflows give contradictory guidance for the same task type, or how the agent resolves conflicts between two retrieved workflows that cover overlapping steps.

**Induction quality at scale.** The fixed one-shot template in the induction prompt shapes what the LLM considers a valid workflow. Different one-shot examples would produce different formulations. There's no analysis of how prompt choice affects workflow quality or whether the one-shot example creates systematic blind spots.

**Cost at scale.** Each online induction round sends all accumulated trajectories to GPT-4o. As trajectory history grows, so does the input token count and cost. The paper doesn't report API costs or analyze how induction quality degrades when trajectory history exceeds practical context limits.

**Governance of workflow content.** Workflows are LLM-generated text files. There's no validation that a generated workflow is factually correct, safe, or free of hallucinated steps. A workflow encoding an incorrect procedure would silently degrade all subsequent tasks that retrieve it.

## Alternatives

Use [Reflexion](../concepts/reflexion.md) when you want agents to improve through verbal reflection on failures rather than abstracting reusable procedures. Reflexion optimizes within a single task trajectory; AWM accumulates knowledge across tasks.

Use [Procedural Memory](../concepts/procedural-memory.md) implementations in systems like [Letta](../projects/letta.md) when you need persistent memory with structured retrieval and versioning across sessions rather than text-file-based workflow storage.

Use [MemEvolve](../projects/memevolve.md) when you want to go beyond hand-designed workflow memory architecture entirely. MemEvolve treats AWM's induction approach as a baseline and generates new memory architectures through code synthesis, reporting improvements of 3.5-17% over AWM-style systems on tested benchmarks.

Use [DSPy](../projects/dspy.md) when your goal is systematic prompt optimization rather than procedural memory. DSPy compiles prompt pipelines through optimization rather than runtime induction.

Use [Agentic RAG](../concepts/agentic-rag.md) when your tasks require retrieval of factual knowledge rather than procedural sub-routines. AWM stores *how to do things*; RAG stores *what is true*.

## Related Concepts

- [Episodic Memory](../concepts/episodic-memory.md) -- AWM converts episodic traces into procedural abstractions
- [Procedural Memory](../concepts/procedural-memory.md) -- Workflows are the canonical procedural memory mechanism for LLM agents
- [Agent Memory](../concepts/agent-memory.md) -- AWM occupies the procedural layer of the broader agent memory taxonomy
- [Self-Improving Agents](../concepts/self-improving-agents.md) -- Online AWM is a self-improvement mechanism operating at the memory level
- [Execution Traces](../concepts/execution-traces.md) -- The raw material for workflow induction
- [Context Engineering](../concepts/context-engineering.md) -- Workflow injection is a context engineering technique

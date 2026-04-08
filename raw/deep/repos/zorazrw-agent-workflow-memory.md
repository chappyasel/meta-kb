---
url: 'https://github.com/zorazrw/agent-workflow-memory'
type: repo
author: zorazrw
date: '2026-04-04'
tags:
  - self-improving
  - agent-memory
  - agentic-skills
key_insight: >-
  Proposes workflow induction as a self-improving memory mechanism for web
  agents -- common subroutines are abstracted from ground-truth examples
  (offline) or past agent experiences (online) into reusable workflow templates,
  then injected as in-context exemplars during inference, achieving SOTA 35.6%
  success rate on WebArena by enabling agents to transfer procedural knowledge
  across tasks without fine-tuning through a three-phase pipeline of induction,
  retrieval, and utilization.
stars: 0
deep_research:
  method: source-code-analysis
  files_analyzed:
    - README.md
    - mind2web/pipeline.py
    - mind2web/memory.py
    - mind2web/offline_induction.py
    - mind2web/online_induction.py
    - mind2web/workflow/retrieve.py
    - webarena/pipeline.py
    - webarena/induce_rule.py
    - webarena/induce_prompt.py
    - webarena/agents/basic/agent.py
    - webarena/agents/legacy/dynamic_prompting.py
    - mind2web/prompt/instruction_action.txt
    - mind2web/prompt/one_shot_action.txt
  analyzed_at: '2026-04-04'
  original_source: repos/zorazrw-agent-workflow-memory.md
relevance_scores:
  topic_relevance: 8
  practitioner_value: 7
  novelty: 8
  signal_quality: 8
  composite: 7.7
  reason: >-
    AWM's three-phase induction/retrieval/utilization loop is a directly
    transferable self-improving procedural memory pattern for LLM agents, with
    concrete SOTA results and an organized codebase, though the implementation
    is research-grade and web-navigation-specific.
---

## Architecture Overview

Agent Workflow Memory (AWM) is a research implementation accompanying the paper "Agent Workflow Memory" (arXiv:2409.07429) by Zora Zhiruo Wang, Jiayuan Mao, Daniel Fried, and Graham Neubig at Carnegie Mellon University. Published in September 2024 and accepted at a top venue, the paper proposes a memory architecture where agents induce, store, and reuse abstract "workflows" -- common sub-routines for solving web navigation tasks -- as a form of procedural memory.

The codebase is organized into two independent evaluation environments:

```
agent-workflow-memory/
  mind2web/               -- Mind2Web benchmark evaluation
    pipeline.py           -- Orchestrates offline/online workflows
    memory.py             -- Workflow retrieval and exemplar construction
    offline_induction.py  -- LLM-based workflow generation from training data
    online_induction.py   -- LLM-based workflow generation from agent trajectories
    run_mind2web.py       -- Inference with workflow-augmented prompts
    workflow/retrieve.py  -- Workflow retrieval for Mind2Web
    prompt/               -- Instruction and one-shot templates
    data/memory/          -- Exemplar workflows (exemplars.json)
  webarena/               -- WebArena benchmark evaluation
    pipeline.py           -- Online workflow induction pipeline
    induce_rule.py        -- Rule-based trajectory deduplication + workflow extraction
    induce_prompt.py      -- LLM-based workflow abstraction from trajectories
    run.py                -- BrowserGym-based agent execution
    agents/               -- Agent implementations (basic, legacy)
    workflow/              -- Per-website workflow text files
    autoeval/              -- Automated trajectory evaluation
```

The architecture follows a three-phase pattern that constitutes the self-improvement loop:

1. **Induce** -- Extract abstract workflows from either annotated examples (offline) or agent execution trajectories (online)
2. **Retrieve** -- Select relevant workflows based on task similarity and inject into agent context
3. **Utilize** -- Agent uses workflow-augmented prompts to make better action predictions

## Research Context and Impact

AWM addresses a key challenge in the LLM agent literature: while language model-based agents show potential for real-world tasks, they struggle with long-horizon tasks requiring complex action trajectories. The insight is that humans manage such complexity by leveraging learned routines -- procedural knowledge that transfers across similar tasks. AWM formalizes this observation as a computational mechanism.

The paper's formal framework describes the agent as: **L(q, M+W, o) -> a**, where L is the language model backbone, q is the natural language instruction, M is base memory (action documentation), W is the induced workflow set, o is the environment observation, and a is the predicted action. Workflows augment the agent's base memory with reusable procedural templates.

The paper achieved state-of-the-art results at time of publication and has been influential in subsequent work. The Hierarchical Memory Tree (HMT) paper (arxiv:2603.07024, March 2026) directly builds on AWM by introducing three-level hierarchy (Intent/Stage/Action) over flat workflow memory, demonstrating that AWM's core insight -- abstract procedural memory improves agent performance -- can be extended with more sophisticated memory organization. MemEvolve (bingreeky) includes AWM as one of its 12 baseline memory providers, positioning it as a benchmark system against which evolved architectures are compared.

## Core Mechanism

### Workflow Induction

The central innovation is the induction of abstract workflows from concrete task execution traces. A "workflow" is defined as a common sub-routine with example-specific contexts abstracted out -- for instance, "to add an item to cart: navigate to product page, select variant, click add-to-cart button" rather than "click on the red Nike shoes in size 10."

Each workflow comprises two components:
- **Textual description**: A summary of the workflow's function, extracted heuristically or via LM summarization
- **Trajectory steps**: Sequential actions containing environment state descriptions, reasoning explaining action selection, and executable operations

The abstraction process replaces concrete values with placeholders like `{product-name}`, `{search-query}`, `{destination-city}` to improve generalizability across similar tasks.

**Offline induction** (`offline_induction.py`) operates on ground-truth annotated examples from training data:

1. Load examples organized in a domain/subdomain/website hierarchy
2. Format examples with candidate element scores (from `data/scores_all_data.pkl`)
3. Construct a prompt using an instruction template + one-shot example + formatted task examples with a "# Summary Workflows" suffix
4. Send to GPT-4o with temperature 0.0 for deterministic generation
5. Filter the response through `filter_workflows()` to extract valid workflow descriptions
6. Save as a text file per website (e.g., `workflow/shopping.txt`)

**Online induction** (`online_induction.py`) operates on the agent's own execution trajectories:

1. Load the agent's past trajectory logs from results directories
2. Parse each trajectory into (environment observation, action) pairs
3. Format trajectories alongside their task descriptions
4. Send to GPT-4o with the same instruction/one-shot prompt structure
5. Filter and save workflows, overwriting the previous workflow file

The online pipeline (`mind2web/pipeline.py`) implements an interleaved induction-utilization loop: process `induce_steps` tasks, then re-induce workflows from all results so far, then process the next batch with updated workflows. This creates a feedback loop where the agent's own experience continuously refines its procedural memory.

For **WebArena** (`webarena/pipeline.py`), the self-improvement loop is even tighter: for each task, the pipeline runs inference, evaluates the trajectory, then updates workflows -- a per-task feedback cycle:

```python
for tid in task_ids:
    # 1. Run inference with current workflows
    Popen(["python", "run.py", "--workflow_path", f"workflow/{website}.txt"])
    # 2. Evaluate trajectory
    Popen(["python", "-m", "autoeval.evaluate_trajectory", "--result_dir", f"results/webarena.{tid}"])
    # 3. Update workflows from all results
    Popen(["python", "induce_prompt.py", "--result_dir", "results", "--output_path", f"workflow/{website}.txt"])
```

### The Snowball Effect

A key property noted in both the paper and subsequent analyses is AWM's "snowball effect": the system "continues to build more complex workflows on top of new experiences and previously acquired workflows, creating a snowball effect to induce and apply increasingly complex workflows while expanding the agent memory." Simple workflows (e.g., "log in to account") become building blocks for compound workflows (e.g., "purchase item" = log in + search + add to cart + checkout). This compositional property distinguishes AWM from flat exemplar retrieval systems.

### Workflow Deduplication (WebArena)

The `induce_rule.py` module performs sophisticated trajectory deduplication before LLM-based workflow induction:

1. **Collect successful trajectories** by filtering results that pass auto-evaluation (`autoeval`) or ground-truth reward
2. **Template-based deduplication**: Group trajectories by `intent_template_id` (tasks with the same underlying template but different parameters), randomly sample one per template
3. **Abstract trajectory deduplication**: Convert trajectories to abstract action sequences (e.g., `click(12)_fill(5)_click(3)`) and deduplicate by these abstract patterns
4. **Manual inspection gate** (optional): Present each workflow for human approval (bypassed in `--auto` mode)

This deduplication is critical because raw trajectories are verbose and redundant. Many tasks share the same underlying procedure -- the deduplication extracts the common pattern before asking the LLM to abstract it further.

### Workflow Utilization

At inference time (`mind2web/memory.py`), workflows are utilized as in-context exemplars:

1. **Load workflow memory**: Read the induced workflow text file and wrap it as a single user-content message
2. **Load concrete examples**: Read `exemplars.json` containing concrete examples with specifiers (domain/subdomain/website tags)
3. **Filter by relevance**: Select concrete examples matching the current task's website, subdomain, or domain (in decreasing specificity)
4. **Sample exemplars**: Randomly sample up to `retrieve_top_k` concrete examples
5. **Token budget management**: Iteratively add exemplars to the prompt while checking total token count against the model's maximum (`MAX_TOKENS[model]`)
6. **Construct message**: `system_prompt + workflow_memory + concrete_exemplars + current_query`

The workflow memory acts as a high-level procedural guide, while concrete exemplars provide specific action patterns. This two-tier memory (abstract workflows + concrete examples) enables transfer across tasks of varying similarity.

## Published Benchmark Results

The paper reports comprehensive results across both benchmarks:

**WebArena (GPT-4)**:

| Method | Success Rate | Steps per Task |
|---|---|---|
| BrowserGym baseline | 23.5% | 7.9 |
| SteP (human-engineered workflows) | 33.0% | -- |
| **AWM** | **35.5%** | **5.9** |

AWM achieved 51.1% relative improvement over BrowserGym baseline and surpassed human-engineered workflows (SteP) by 7.6%, while using fewer steps per task (5.9 vs 7.9), indicating more efficient execution.

**Mind2Web (GPT-4, Cross-Task)**:

| Method | Element Accuracy | Step Success | Task Success |
|---|---|---|---|
| MindAct | 41.6% | 36.2% | 2.0% |
| **AWM** | **50.6%** | **45.1%** | **4.8%** |

On cross-domain generalization, online AWM improved step success rate by 14.0-16.9 absolute points, surpassing baselines by 8.9-14.0 absolute points as train-test task distribution gaps widened.

**Key ablation findings**:
- LM-based induction produced 2.8 point improvements over rule-based methods (45.1% vs 43.4% step success) due to finer-grained abstraction
- Text and code-based workflow formats performed similarly (0.3 point variation)
- Including filtered HTML in workflows degraded performance by 2.9 points (context pollution from irrelevant elements)
- Approximately 40 queries yielded significant performance gains, with success rate stabilizing after acquiring essential workflows
- Average 7.3-7.4 workflows per website maintained compact memory
- 0.94 utilization rate on WebArena (94% of test tasks used workflows)

**Cross-template evaluation (WebArena)**: AWM maintained 33.2% success on non-overlapping task templates versus 23.2% for baselines, demonstrating genuine cross-task generalization rather than template-specific memorization.

## Design Tradeoffs

**Text files as workflow storage**: Workflows are stored as plain text files (`workflow/{website}.txt`), one per website. This is maximally simple -- no database, no embeddings, no retrieval index. The tradeoff is coarse-grained retrieval: the entire workflow file for a website is injected into context, whether or not all workflows are relevant to the current task. For Mind2Web, where workflows are website-specific, this is acceptable. For more diverse task distributions, per-workflow retrieval with semantic similarity would improve precision.

**Overwriting workflows on each induction**: Online induction overwrites the workflow file with each update. This means earlier insights may be lost if the new batch of trajectories doesn't reproduce them. An append-and-consolidate strategy would be more robust but adds complexity. The HMT paper's hierarchical approach partially addresses this by organizing memory at multiple granularities.

**LLM as sole induction engine**: Workflow induction depends entirely on the LLM's ability to abstract common patterns from examples. No structured analysis (e.g., sequence mining, graph-based pattern extraction) is used. This is flexible but unreliable -- the LLM may miss patterns or generate overly specific "workflows" that don't generalize.

**Per-website workflow granularity**: Workflows are organized by website. This captures website-specific UI patterns (e.g., how shopping sites organize checkout flows) but may miss cross-website patterns (e.g., all form-filling follows similar patterns regardless of the site).

**Offline vs online tradeoff**: Offline induction from ground-truth examples produces higher-quality workflows (since the examples are correct by definition) but requires labeled data. Online induction requires no labels but is bootstrapped from the agent's own (potentially incorrect) trajectories, creating a risk of reinforcing bad habits. The paper confirms this: combining offline and online workflows (AWMoff+on) underperformed both individual approaches, suggesting workflows from different induction modes create conflicts.

**Prompt-based memory injection**: Workflows are injected purely through prompt engineering -- as additional context in the system message or as user-role exemplars. No model fine-tuning, no embedding databases, no tool calling. This means the system works with any API-accessible LLM but is constrained by context window limits and prompt engineering fragility.

## Failure Modes & Limitations

**Garbage-in-garbage-out in online mode**: If the agent performs poorly on initial tasks, the induced workflows will reflect poor strategies. Subsequent tasks using these workflows may perpetuate errors. The system has no mechanism to identify and discard workflows derived from unsuccessful trajectories (though WebArena's `induce_rule.py` filters to successful trajectories only for the rule-based path).

**Action rigidity**: The paper identifies this as a key limitation: workflow actions lack flexibility for dynamic environments. When booking flights, predetermined action sequences cannot adapt to popup variations showing different airport options. The fixed sequential structure of workflows breaks down when environments present unexpected UI states.

**Divergence challenges**: Agents struggle to identify when to deviate from workflow guidelines. The paper reports slightly lower action F1 scores (57.3% vs 60.6% for MindAct), suggesting that workflow adherence can sometimes override correct task-specific judgment.

**Context window pressure**: Injecting workflow memory + concrete exemplars + the current observation can easily exceed context limits. The code explicitly checks token counts and drops exemplars to fit, but with long workflows and complex web pages, the remaining budget for the actual task observation may be insufficient.

**No workflow versioning or comparison**: There's no mechanism to compare workflow quality across induction rounds or to A/B test different workflow sets. The system assumes later inductions are better, which may not hold.

**Website-specific scoping**: The domain/subdomain/website hierarchy assumes tasks are naturally organized by website. For cross-website tasks or novel websites with no prior data, the system has no workflow to offer.

**Static one-shot template**: The induction prompt uses a fixed one-shot example. This one-shot provides the LLM with a single demonstration of what a good workflow looks like, which may bias the output style. Different one-shot examples would produce different workflow formulations.

## Integration Patterns

**Mind2Web integration**: The pipeline processes tasks through a standard predict-and-evaluate cycle with workflow-augmented prompts. The agent predicts actions step by step, comparing predictions against ground-truth elements. Metrics include element accuracy, action F1, step success rate, and episode success rate.

**WebArena integration**: The system runs within the BrowserGym framework, using `DemoAgent` (a basic agent with OpenAI API calls) that renders the accessibility tree, queries GPT for the next action, and executes it in a real browser. Workflows are injected into the system prompt alongside the accessibility tree and action space description.

**Auto-evaluation integration**: WebArena includes an auto-evaluation system (`autoeval/`) that uses LLM judges to evaluate trajectory success without human annotation. This enables fully automated self-improvement: execute task -> auto-evaluate -> induce workflow -> repeat.

**Prompt-based memory injection**: Workflows are injected purely through prompt engineering -- as additional context in the system message or as user-role exemplars. No model fine-tuning, no embedding databases, no tool calling. This means the system works with any API-accessible LLM.

**MemEvolve integration**: AWM is reimplemented as `agent_workflow_memory` provider in MemEvolve's EvolveLab framework, serving as both a baseline for comparison and a starting point for evolved architectures. This integration validates AWM's influence while also demonstrating that automated architecture search can discover improvements beyond its hand-designed approach.

**HMT extension**: The Hierarchical Memory Tree paper (2603.07024) extends AWM by introducing three-level hierarchy: Intent level (mapping instructions to standardized task goals), Stage level (reusable semantic subgoals with pre/post conditions), and Action level (action patterns with transferable element descriptions). This demonstrates that AWM's core insight is extensible and benefits from richer memory organization.

## Broader Significance

AWM's contribution extends beyond its specific benchmark results. It demonstrates that procedural memory -- knowledge of *how to do things* -- is a distinct and valuable form of agent memory, complementary to episodic memory (what happened) and semantic memory (what is true). The workflow induction process is a form of procedural knowledge distillation: converting concrete experiences into abstract, reusable procedures.

The comparison with human-engineered workflows (SteP) is particularly revealing: AWM's automatically induced workflows outperformed hand-crafted ones by 7.6%, suggesting that LLM-based induction can discover procedural patterns that domain experts miss. This parallels findings in the autoresearch ecosystem, where automated search routinely discovers optimization strategies beyond human intuition.

The online learning curve -- significant gains within ~40 queries -- demonstrates efficient few-shot procedural learning. This efficiency is practically important: it means AWM can bootstrap useful workflows from minimal experience, making it viable for deployment scenarios where extensive training data is unavailable.

The paper's influence on subsequent work (HMT, MemEvolve, and others) confirms that workflow memory has become a foundational concept in the agent memory literature, occupying a position analogous to "skills" in the reinforcement learning literature but operating at the prompt/memory level rather than the policy level.

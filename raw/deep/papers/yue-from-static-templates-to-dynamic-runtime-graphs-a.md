---
url: 'https://arxiv.org/abs/2603.22386'
type: paper
author: >-
  Ling Yue, Kushal Raj Bhandari, Ching-Yun Ko, Dhaval Patel, Shuxin Lin, Nianjun
  Zhou, Jianxi Gao, Pin-Yu Chen, Shaowu Pan
date: '2026-03-23'
tags:
  - agentic-skills
  - context-engineering
  - workflow-optimization
  - dynamic-graph-generation
  - agent-composition
  - execution-traces
  - verification-signals
key_insight: >-
  The critical distinction is between three objects that practitioners often
  conflate: reusable workflow templates (designed offline), run-specific realized
  graphs (constructed per-query), and execution traces (what actually happened).
  The survey shows that treating workflow structure as a first-class optimization
  variable -- not just scaffolding -- unlocks systematic improvement through
  MCTS-based template search, query-conditioned DAG generation, and in-execution
  topology editing, with the choice of feedback signal (metrics, verifiers,
  preferences, or trace analysis) determining how aggressively you can mutate
  structure.
deep_research:
  method: paper-full-text
  text_length: 9500
  analyzed_at: '2026-04-04'
  original_source: papers/yue-from-static-templates-to-dynamic-runtime-graphs-a.md
---

## Architecture Overview

This survey introduces "agentic computation graphs" (ACGs) as a unifying framework for understanding how LLM-based systems organize executable workflows. The central contribution is a clear taxonomy organized around when workflow structure is determined:

**Static Methods** fix a reusable workflow scaffold before deployment:
- Offline template search (e.g., AFlow uses MCTS over typed operator graphs)
- Node-level optimization within fixed scaffolds (e.g., DSPy compiles pipelines)
- Joint structure-and-configuration optimization (e.g., Multi-Agent Design alternates topology and prompt tuning)

**Dynamic Methods** construct or modify workflows at inference time:
- Selection/pruning from super-graphs (e.g., Adaptive Graph Pruning removes redundant agents)
- Pre-execution generation (e.g., Assemble Your Crew generates query-conditioned DAGs)
- In-execution editing (e.g., AgentConductor regenerates topologies based on validity feedback)

The survey further distinguishes three objects that practitioners commonly conflate:

1. **Workflow templates:** Reusable designs that specify which components exist, how they depend on each other, and how information flows. These are designed offline and deployed across many inputs.

2. **Realized graphs:** Run-specific instances of a template, potentially with modifications for the particular input (agents pruned, edges added, parameters adjusted).

3. **Execution traces:** What actually happened during a run -- the actual sequence of LLM calls, tool invocations, and data flows, which may differ from the realized graph due to runtime decisions, failures, and retries.

This three-level separation is the paper's most useful conceptual contribution. It clarifies that "optimizing an agent workflow" could mean optimizing the template (design-time), the realization (pre-execution), or the execution (runtime), and each level has different optimization methods and feedback signals.

## Core Mechanism

### The Quality-Cost Trade-off

The survey formalizes workflow optimization as:

max E[R(tau; x) - lambda * C(tau)]

where R is task quality, C is execution cost (tokens, LLM calls, latency), and lambda controls the trade-off. This simple formulation clarifies that every workflow decision has both quality and cost implications, and practitioners must explicitly decide their tolerance for cost.

### Static Optimization Methods

**AFlow (MCTS over typed operator graphs):** Uses Monte Carlo Tree Search to explore the space of workflow topologies. Each node in the search tree represents a workflow configuration, and the system evaluates configurations through actual execution. Tracks explicit dollar costs alongside task metrics. This is the most principled static optimization approach -- it treats the workflow structure as a discrete optimization problem and applies a well-understood search algorithm.

**DSPy (node-level optimization within fixed scaffolds):** Keeps the workflow topology fixed and optimizes individual node parameters (prompts, few-shot examples). This is computationally cheaper than topology search but misses structural improvements.

**VFlow (cooperative evolution with hardware verifiers):** Combines evolutionary search with external validation (hardware verifiers for Verilog generation). Demonstrates that domain-specific verifiers can dramatically improve search efficiency by quickly rejecting invalid candidates.

**MermaidFlow (constrained search space):** Uses Mermaid diagram syntax as a structured intermediate representation for workflow specifications, with safety checks built into the representation.

### Dynamic Generation Methods

**FlowReasoner (RL-trained meta-agent):** A meta-agent trained with reinforcement learning to select operators from a library and compose them into workflows for specific inputs. This represents the deepest dynamic approach -- the workflow structure itself is the output of a learned policy.

**ScoreFlow (DPO-style optimization):** Uses score-aware preference pairs from trajectory execution to train the workflow generator, applying Direct Preference Optimization techniques from RLHF to workflow selection.

**AutoFlow (lightweight DSL with interpreter feedback):** Defines workflows in a lightweight domain-specific language and uses interpreter feedback during generation to catch structural errors early.

### In-Execution Editing Methods

**MetaGen (training-free evolution):** Updates agent roles and edges based on detected contradictions or failures during execution. No training required -- the meta-agent reasons about structural changes in real-time.

**ProAgent (incremental JSON workflow repair):** Tests workflow components during construction (testing-on-construction pattern) and repairs the JSON workflow specification when tests fail.

**DebFlow (multi-agent debate and reflection):** Uses debate between multiple agents and reflection on debate outcomes to refine workflow structure during execution.

### Feedback Signals

The survey identifies four primary feedback sources, each enabling different optimization granularity:

1. **Metric-driven (scalar rewards):** Success rates, pass@k, F1 scores. Black-box optimization -- guides search but provides no information about why a workflow succeeded or failed.

2. **Verifier-driven (hard constraints):** Syntax checks, unit tests, schema validation. Binary signals that definitively reject invalid workflows. Strong verifiers support aggressive mutation because invalid candidates are caught quickly.

3. **Preference-based (comparative rankings):** Pairwise comparisons between trajectory executions. More informative than scalar metrics for differentiating among successful workflows.

4. **Trace-derived textual (semantic failure analysis):** LLM-generated analysis of execution traces identifying specific failure modes and suggesting structural changes. Most informative but noisiest signal.

Key insight from the survey: signal type determines safe action granularity. Strong verifiers support aggressive structural mutation (you can try radical changes because bad ones are caught immediately). Weak/noisy feedback requires conservative changes.

## Design Tradeoffs

**Static vs. dynamic structure determination:** Static optimization produces well-tested, interpretable workflows but cannot adapt to novel inputs. Dynamic generation enables per-input customization but is harder to validate and debug. The survey suggests that most production systems should start with static templates and add dynamic elements selectively.

**When static suffices:** Simple, stable tasks with fixed tool sets and predictable decompositions. The interpretability and verification advantages of offline optimization dominate.

**When selection beats generation:** If the space of useful workflows is known but the optimal choice depends on the input, selection/pruning from a super-graph captures most benefits while maintaining validity guarantees inherited from the pre-built super-graph.

**When editing is unavoidable:** Long-horizon tasks with significant uncertainty, tool drift, or unexpected failures require in-execution adaptation. This demands stronger validation and explicit budget guards to prevent runaway costs.

**Expressivity-verifiability tension:** More flexible workflow representations enable richer workflows but complicate validation. A workflow expressed as arbitrary code (maximally expressive) is much harder to verify than one expressed in a constrained DSL (limited but verifiable).

## Experimental Results

As a survey paper, this work synthesizes results from 77 in-scope papers (39 core, 7 adjacent, 31 background) and 27 evaluation assets rather than presenting novel experiments. Key synthesized findings:

**AFlow on benchmarks:** MCTS-based template search consistently finds workflows that outperform hand-designed alternatives, with explicit cost-tracking showing that the best performance-per-dollar configurations often differ from the best absolute performance configurations.

**DSPy compilation:** Node-level optimization within fixed scaffolds typically improves performance by 5-15% over unoptimized baselines, with diminishing returns as the scaffold itself becomes the bottleneck.

**Dynamic generation vs. static templates:** On tasks with high input variability (diverse query types, mixed difficulty), dynamic generation methods outperform static templates. On homogeneous tasks, static templates are competitive and cheaper.

**In-execution editing:** Methods like MetaGen show consistent improvement on long-horizon tasks (10+ steps) where initial workflow plans become stale, but add overhead that is not justified for short tasks.

**Evaluation protocol gap:** The survey finds that most papers report only downstream task metrics without workflow-level analysis (graph size, depth, communication volume, cost-per-success). This makes cross-method comparison difficult and obscures the quality-cost trade-off.

## Failure Modes & Limitations

**Structural credit assignment:** When a workflow succeeds or fails, it is difficult to attribute the outcome to specific structural choices vs. local parameter settings (prompts, examples). This makes learning from workflow execution inherently noisy.

**Continual adaptation is largely unsolved:** Few methods handle tool registry drift (tools being added/removed/changed) or schema evolution. Most assume a fixed set of available tools and agent capabilities.

**Theory gap:** There is no formal analysis of workflow optimization convergence, sample complexity, or regret bounds. The field is entirely empirical.

**Benchmark quality:** Most benchmarks evaluate downstream task success but not workflow quality (did the workflow use resources efficiently? Was the structure appropriate for the task?). The survey proposes structure-aware evaluation but no standard benchmarks exist yet.

**Scaling behavior unknown:** Most methods are evaluated on tasks with 3-10 agents/steps. Behavior at larger scales (50+ agents, 100+ steps) is unexplored.

## Practical Implications

**For builders of multi-agent systems:**

1. **Separate template design from runtime realization.** Explicitly distinguish between your reusable workflow templates (designed offline, tested, validated) and the run-specific realizations (potentially modified per-input). This separation enables independent optimization of each layer.

2. **Start static, add dynamism selectively.** Design a good static template first (potentially using AFlow's MCTS approach or manual design with DSPy optimization). Then identify specific points where dynamic adaptation is justified by input variability, and add selection/editing only at those points.

3. **Match feedback signal to mutation aggressiveness.** If you have strong verifiers (unit tests, schema validators), you can safely explore aggressive structural changes. If your feedback is only downstream task metrics, make conservative structural changes and focus optimization on node-level parameters.

4. **Track cost alongside quality.** The lambda parameter in the quality-cost tradeoff is not optional. Every workflow optimization should report cost-per-success alongside accuracy. Use AFlow's approach of tracking explicit dollar costs during search.

5. **Report workflow-level metrics.** When evaluating multi-agent systems, measure graph size, depth, communication volume, edit counts, and cost-per-success in addition to task accuracy. These metrics reveal whether your system is efficient, not just effective.

6. **The vocabulary matters.** Adopting the survey's terminology (templates vs. realized graphs vs. traces, static vs. dynamic, metric/verifier/preference/trace feedback) enables clearer thinking about what you are optimizing and how. Many confusions in multi-agent system design stem from conflating these distinct concepts.

**Gap between survey and practice:** The survey provides excellent conceptual organization but limited prescriptive guidance. Practitioners will need to map their specific constraints (task variability, available feedback signals, cost budgets) to the taxonomy and select appropriate methods. The evaluation protocol recommendations are sound but no standard tools exist to implement them.

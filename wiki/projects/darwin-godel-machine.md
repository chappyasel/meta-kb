---
entity_id: darwin-godel-machine
type: project
bucket: self-improving
abstract: >-
  DGM: population-based self-improving coding agent that modifies its own Python
  codebase, validated empirically on benchmarks; raised SWE-bench from 20% to
  50% without human-designed improvements.
sources:
  - tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
related: []
last_compiled: '2026-04-07T11:52:24.266Z'
---
# Darwin Gödel Machine

## What It Is

The Darwin Gödel Machine (DGM) is a [self-improving agent](../concepts/self-improving-agent.md) that rewrites its own Python codebase to get better at coding tasks. It takes the original Gödel machine's idea of provably self-improving AI and replaces the impractical formal proof requirement with empirical benchmark validation. The result is a system that autonomously discovers better tools, workflows, and memory patterns through evolutionary search, with no human engineering of the improvements.

Authors: Jenny Zhang, Shengran Hu, Cong Lu, Robert Lange, [Jeff Clune](../concepts/jeff-clune.md). Published May 2025.

[Source](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

---

## Architecture

Three components drive the loop:

**Agent Archive.** A growing population of coding agent variants, each stored as a complete Python codebase. Every agent ever created is retained, including poor performers. The archive starts from a single seed agent and grows as a tree, with each node being a variant and each edge a parent-child modification.

**Selection and Reproduction.** Parent agents are sampled from the archive proportionally to fitness (benchmark score) and reproductive history. The selected parent feeds its own benchmark evaluation logs back through the foundation model, identifies bottlenecks, then proposes and implements code changes against its own codebase.

**Validation and Filtering.** New variants must pass three gates before entering the archive: (1) compile successfully, (2) retain basic codebase-editing capability on a 10-task verification set, and (3) complete full benchmark evaluation. This functional continuity constraint ensures the self-modification capability itself survives across generations.

The underlying foundation model (Claude 3.5 Sonnet in the primary experiments) is frozen throughout. The DGM modifies agent code, not model weights.

---

## Core Mechanism

The self-modification loop runs as follows:

1. Sample a parent agent from the archive (fitness-proportional weighting)
2. Feed the parent its own benchmark failure logs via structured prompt
3. Parent proposes specific code changes targeting observed failure modes
4. Parent implements those changes against its own Python codebase
5. Run the modified variant through compilation check, functional verification, and full benchmark
6. Add to archive if it passes; discard otherwise

Discovered improvements cluster into four categories:

- **Tool granularity:** Switching from whole-file reads/writes to line-range viewing and string-replacement editing
- **Best-of-N sampling:** Generating multiple solution candidates and selecting the best
- **Cross-attempt memory:** Carrying information from failed attempts into subsequent retries
- **Self-review:** Having the agent critique its own outputs before submission

The archive-all design is the mechanism that enables escaping local optima. A variant that adds a useful editing tool but breaks its review process will score poorly overall, but a descendant can inherit the tool while restoring review. The ablation (best-only archive) confirms this: greedy retention causes performance to plateau quickly because bad mutations block future improvements.

---

## Numbers

| Benchmark | Seed Agent | Best Discovered | Factor |
|---|---|---|---|
| SWE-bench Verified | 20.0% | 50.0% | 2.5x |
| Polyglot (multi-language) | 14.2% | 30.7% | 2.2x |

Polyglot result surpassed Aider (~15%), a community-standard hand-crafted agent.

The improvements transfer: swapping Claude 3.5 Sonnet for Claude 3.7 Sonnet or o3-mini preserves the gains, suggesting the DGM discovers general agent architecture improvements rather than model-specific hacks. Transfer also holds across programming languages.

**Credibility:** Self-reported, but evaluated on SWE-bench Verified, an established external benchmark with known difficulty distribution. Not independently reproduced as of writing.

**Cost:** One full run on SWE-bench took approximately two weeks and "significant API costs." No exact dollar figure provided.

---

## Strengths

**Compound self-improvement.** The meta-agent itself improves, not just the task-solving agent. Early generations produce better parents, which produce better children. This compounding is what generates 2.5x over 80 iterations.

**Open-ended exploration.** The archive prevents premature convergence. Stepping-stone variants that are neutral or harmful in isolation become essential later, matching patterns observed in biological evolution and open-endedness research.

**Transferable discoveries.** Improvements to tool granularity, workflow structure, and memory management are not SWE-bench-specific hacks. They generalize across models and languages, suggesting real architectural insights rather than benchmark overfitting.

**No formal proof required.** The practical failure mode of the original Gödel machine was that proving most code changes are net beneficial is intractable. DGM sidesteps this entirely with empirical validation.

---

## Limitations

**Foundation model ceiling.** The DGM cannot modify or retrain its underlying FM. All self-improvement is bounded by what Claude 3.5 Sonnet can do. The most impactful improvements -- better reasoning, better code understanding -- require FM-level changes outside the DGM's scope.

**No safety guarantees.** Empirical validation catches regressions in measurable benchmark performance, but provides no guarantees about correctness, safety, or behavior in distribution-shifted settings. A self-modified agent could introduce subtle vulnerabilities or failure modes that benchmarks do not surface. Operational controls (sandboxing, human oversight, runtime limits) are the only safeguards.

**Benchmark overfitting risk.** The DGM optimizes benchmark scores. Real-world software engineering involves larger codebases, ambiguous requirements, and team coordination -- characteristics not captured by SWE-bench. Transfer results provide partial reassurance, but the concern stands.

**Single seed sensitivity.** The system initializes from one seed agent. The quality and structure of that seed likely influences which evolutionary paths are accessible. No ablation tests different seeds.

**Cost.** Two weeks of FM API calls per run is expensive. This makes DGM unsuitable as a continuously running production system with current infrastructure.

---

## When NOT to Use It

**Real-time or latency-sensitive systems.** The evolution loop runs over days to weeks. There is no mechanism for rapid adaptation.

**Safety-critical applications.** Without formal guarantees and with self-modification happening at the code level, DGM is inappropriate where behavioral guarantees matter (medical, financial, infrastructure).

**Budget-constrained teams.** The API cost is substantial and undisclosed. For discovering improvements that a skilled engineer could identify in a day, the economics likely don't work.

**Domains without reliable automated evaluation.** The mechanism depends entirely on benchmark signals. If you cannot define an objective, reproducible evaluation for your domain, the loop has no fitness signal to optimize.

**When you need interpretability.** After 80 generations of self-modification, tracing why the agent behaves a specific way requires auditing a tree of code diffs. Attribution becomes difficult.

---

## Unresolved Questions

**Exact cost figures.** The paper acknowledges "significant API costs" but provides no numbers. For practitioners evaluating whether to run DGM, this is the first question.

**Seed sensitivity.** Does initializing with a different seed agent produce the same improvements, or does the evolutionary path depend heavily on starting conditions?

**Governance of archive growth.** The archive grows indefinitely. At scale, storage and selection overhead grow with the archive size. The paper does not address archiving policy, pruning, or cost at scale.

**Convergence criteria.** When should a DGM run stop? The paper reports results at 80 iterations, but provides no theory or heuristic for when additional iterations stop being cost-effective.

**FM co-evolution.** The authors identify foundation model co-evolution as future work. It is the natural extension of DGM but introduces qualitatively different safety and governance challenges. No roadmap is provided.

**HyperAgents extension.** Follow-on work introduces DGM-Hyperagents (DGM-H), which makes the self-improvement procedure itself editable and shows improvements across coding, paper review, robotics reward design, and Olympiad math grading. Relationship between DGM and DGM-H in production settings is unclear. [Source](../raw/tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md)

---

## Alternatives

| System | Use when |
|---|---|
| [EvoAgentX](../projects/evoagentx.md) | You want evolutionary agent optimization with lower infrastructure complexity |
| [AgentEvolver](../projects/agentevolver.md) | You need agent workflow evolution with more constrained search |
| [Voyager](../projects/voyager.md) | You want open-ended skill acquisition in a game/simulation environment rather than code self-modification |
| [Reflexion](../concepts/reflexion.md) | You want within-episode self-improvement without population-based evolution or code modification |
| [DSPy](../projects/dspy.md) | You want automated prompt/pipeline optimization with lower cost and better interpretability |
| Hand-engineered agents | Your team can identify performance bottlenecks directly; the DGM's 2-week cycle and API cost exceed your iteration budget |

---

## Related Concepts

- [Self-Improving Agent](../concepts/self-improving-agent.md)
- [Automatic Curriculum](../concepts/automatic-curriculum.md)
- [Agent Skills](../concepts/agent-skills.md)
- [Continual Learning](../concepts/continual-learning.md)
- [Memory Evolution](../concepts/memory-evolution.md)
- [GEPA](../concepts/gepa.md)
- [Jeff Clune](../concepts/jeff-clune.md)
- [HyperAgents](../projects/hyperagents.md)
- [SWE-bench](../projects/swe-bench.md)

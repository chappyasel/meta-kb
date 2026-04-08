---
entity_id: darwin-godel-machine
type: project
bucket: self-improving
abstract: >-
  Darwin Gödel Machine: a self-improving coding agent that evolves its own
  Python codebase via population-based empirical validation, achieving 20%→50%
  on SWE-bench without human-designed improvements.
sources:
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md
related: []
last_compiled: '2026-04-08T23:15:28.030Z'
---
# Darwin Gödel Machine

## What It Does

The Darwin Gödel Machine (DGM) is a self-improving coding agent system that modifies its own source code to get better at software engineering tasks. Unlike hand-crafted agent systems where humans engineer each capability improvement, the DGM discovers improvements autonomously: it reads its own benchmark failure logs, proposes code changes, implements them, validates the results empirically, and archives successful variants for future evolution.

The name merges two ideas: Schmidhuber's 2003 Gödel Machine (a theoretical self-modifying AI requiring formal proofs of improvement) and Darwinian evolution (population-based search with selection pressure). The DGM's key architectural departure is replacing intractable formal proofs with benchmark measurement, which makes the concept practical for the first time.

The system was developed by Jenny Zhang, Shengran Hu, Cong Lu, Robert Lange, and [Jeff Clune](../concepts/jeff-clune.md), published May 2025 and updated March 2026.

[Source](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

## Architecture

Three components define the DGM:

**Agent Archive.** A growing population of coding agent variants, each stored as a complete Python codebase. The archive is initialized from a single deliberately simple seed agent. Every agent ever created is retained — not just high performers. This is the mechanism that enables open-ended exploration rather than greedy hill-climbing.

**Selection and Reproduction.** Parents are sampled from the archive proportionally to fitness (benchmark score) and reproductive history. Each selected parent receives its own benchmark evaluation logs via structured prompt, analyzes its failure modes, proposes concrete code modifications, and implements them against its own codebase. The agent's underlying foundation model (Claude 3.5 Sonnet in published experiments) does the reasoning; the agent's tools do the editing.

**Validation and Filtering.** New variants must pass three gates before archive admission: successful compilation, retention of basic codebase-editing capability, and passing a 10-task functional verification. These functional continuity constraints prevent the self-modification capability itself from being accidentally discarded. Variants that pass are added to the archive; variants that fail are discarded.

The result is a growing tree structure where each node is an agent variant and edges represent parent-child modification relationships. Multiple branches explore different evolutionary paths in parallel.

[Source](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

## Core Mechanism

The self-modification loop runs as follows: sample a parent from the archive by fitness-weighted probability, feed it its own failure logs, have it propose targeted improvements, implement those improvements in code, validate the variant, and archive it if it passes.

The DGM has no hand-coded mutation operators. The parent agent generates its own modification proposals by reasoning about what went wrong in past evaluations. This is directed evolution rather than random mutation — the agent uses its reasoning capability as a search operator over the space of possible architectures.

Over 80 iterations on SWE-bench, the system autonomously discovered several classes of improvements:

- **Granular file editing:** replacing whole-file write operations with line-range viewing and string-replacement edits, converging on the same pattern human developers invented with diff tooling
- **Best-of-N sampling:** generating multiple solution candidates and selecting among them, a self-discovered sampling strategy
- **Retry memory:** carrying information from failed attempts into subsequent solution generation, a form of self-discovered [Reflexion](../concepts/reflexion.md)
- **Self-review:** the agent critiquing its own outputs before submission

Why the archive matters: a variant that adds a novel editing tool but simultaneously breaks its review process scores poorly overall. In a best-only system, it gets discarded. In the DGM archive, it survives. A later descendant can inherit the editing tool while restoring the review capability. This stepping-stone mechanism is how the system escapes local optima that would trap greedy search.

[Source](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

## Benchmarks

All numbers below are self-reported from the DGM paper; no independent third-party replication is available as of the paper's publication.

| Benchmark | Seed Agent | Best DGM Agent |
|-----------|-----------|---------------|
| SWE-bench Verified | 20.0% | 50.0% |
| Polyglot (multi-language) | 14.2% | 30.7% |

The 50% SWE-bench Verified result matched publicly available state-of-the-art hand-crafted solutions at time of publication. The 2.5x improvement ratio is the headline result, but context matters: the seed agent was deliberately simple, so the comparison understates what a well-engineered starting point would achieve.

**Ablation results (self-reported):**

- *Without self-improvement* (fixed meta-agent, no iterative enhancement): gains taper off quickly, confirming compound returns from improving the improvement process itself
- *Without open-ended exploration* (best-only archive): significantly worse than full DGM; confirms the archive provides essential diversity

**Transfer results:** Improvements discovered using Claude 3.5 Sonnet transferred when swapping in Claude 3.7 Sonnet or o3-mini, and generalized from Python to Rust, C++, and Go on the Polyglot benchmark. This suggests the DGM discovers general agent architecture patterns rather than model-specific or language-specific hacks.

**Computational cost:** One full run required approximately two weeks of wall-clock time and "significant API costs" (exact dollar figures not disclosed). This is the primary practical barrier.

[Source](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

## Strengths

**Self-discovery of general improvements.** The DGM found improvements that human engineers would have recognized as good ideas: granular editing, self-review, retry memory. It found them without being told to look. This validates that the search mechanism works, not just that the seed agent was lucky.

**Escape from local optima via population diversity.** The archive-all approach is architecturally distinct from ensemble methods or multi-agent collaboration. It is specifically designed to preserve stepping-stone innovations, and the ablation confirms this is not theoretical — best-only selection produces substantially worse outcomes.

**Cross-model and cross-language transfer.** Discovered improvements are general enough to survive model substitution. This makes the DGM's output useful even if you use a different FM than the one used during evolution.

**Concrete implementation pattern.** The DGM provides a replicable recipe for recursive self-improvement: maintain a diverse archive, select by fitness, have agents analyze their own failures, implement and validate changes, keep everything. This is buildable today.

## Limitations

**Foundation model ceiling.** The DGM modifies agent code but cannot modify or retrain the underlying FM. All improvements are in the scaffolding around a frozen model. The most impactful potential improvements — better reasoning, better code comprehension — are out of scope. FM co-evolution is identified as future work but is a qualitatively harder problem.

**No safety guarantees.** Empirical validation confirms benchmark performance but provides no formal assurance about what else changed. A self-modified agent could introduce subtle vulnerabilities or failure modes invisible to SWE-bench. The paper's safety controls (sandboxing, human oversight, runtime limits) are operational precautions, not architectural guarantees. The authors acknowledge this and flag safety-aware evaluation as future work.

**Concrete failure mode — benchmark overfitting.** The DGM optimizes for SWE-bench. Improvements that score well there may not generalize to production software engineering tasks with larger codebases, more ambiguous requirements, or team coordination needs. The transfer results provide partial reassurance, but the evaluation surface is narrow.

**Unspoken infrastructure assumption — coding domain privilege.** The self-modification loop works because the evaluation domain (coding benchmarks) matches the modification domain (writing code). The agent can run a test to find out if it got better. Generalizing to other agent domains — planning, vision, writing, reasoning — requires finding comparably clean empirical validation signals. Most real domains lack this property.

**Single seed dependency.** The published experiments use one seed agent. The quality and architecture of that seed likely shapes which evolutionary paths are accessible, but the paper does not explore sensitivity to different seeds.

**Cost.** Two weeks and undisclosed but substantial API spend to achieve improvements a skilled human team could probably engineer in comparable time. The value proposition rests on the assumption that DGM-style search will scale better than human engineering as problems become harder — plausible, but not yet demonstrated.

[Source](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

## When NOT to Use It

**Production systems requiring reliability guarantees.** The DGM has no mechanism to prevent a self-modification from introducing security vulnerabilities, subtle behavioral changes, or failure modes not captured by benchmarks. Do not run unaudited self-modified agents against production systems or sensitive data.

**Budget-constrained projects.** Two weeks of API costs for one evolution run is expensive. If you need a capable coding agent and have a defined task, hand-engineering from a strong base (or using an existing SOTA agent) will be faster and cheaper.

**Domains without clean empirical evaluation.** If you cannot define a benchmark that reliably measures whether the agent improved, the DGM's core mechanism breaks. The system requires an oracle it can query repeatedly at low cost.

**Single-task deployment.** The DGM's value is in discovering general improvements across many tasks. For a single, well-defined task, direct prompt engineering or fine-tuning is almost certainly more efficient.

## Unresolved Questions

**Exact API costs.** The paper mentions "significant API costs" but gives no figures. At scale, the selection of FM, the length of evaluation runs, and the number of archive iterations are the primary cost drivers. Without numbers, comparing DGM cost to human engineering cost is guesswork.

**Conflict resolution in the archive.** The paper does not specify how the system handles conflicting evolutionary paths — e.g., two branches that each improve different capabilities but are architecturally incompatible. Crossover between branches is not described.

**Safety at scale.** Current safety precautions (sandboxing, human oversight) are adequate for a research prototype running 80 iterations. A production system running continuously would require formal auditing of self-modifications, not just operational controls. How this scales is unaddressed.

**Seed sensitivity.** Published results use one seed. Whether the 50% SWE-bench result is robust to different seeds, or whether the particular seed agent happened to be in a favorable region of the search space, is unknown.

**Governance of the archive.** Who decides when to prune the archive, which branches to continue funding with compute, and how to handle an agent that scores well on benchmarks but behaves problematically in other ways? None of this is specified.

## Successor Work: Hyperagents

A follow-on system, DGM-Hyperagents (DGM-H), extends the DGM by making the self-improvement procedure itself editable and subject to evolution. In the original DGM, the meta-level improvement process is fixed — only task-solving code evolves. Hyperagents allow the mechanism that generates new agents to be modified too, enabling what the authors call "metacognitive self-modification."

DGM-H tested across coding, paper review, robotics reward design, and Olympiad-level math grading, outperforming the original DGM in all domains. Meta-level improvements (persistent memory, performance tracking in the improvement loop) transferred across domains and accumulated across runs. This work was conducted during Jenny Zhang's internship at Meta AI.

[Source](../raw/tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md)

## Alternatives

| System | Use When |
|--------|----------|
| [EvoAgentX](../projects/evoagentx.md) | You want evolutionary optimization of agent workflows rather than full codebase self-modification |
| [AgentEvolver](../projects/agentevolver.md) | You want agent capability evolution with more constrained modification scope |
| [AFlow](../projects/aflow.md) | You want automated workflow search without population-based self-modification |
| [DSPy](../projects/dspy.md) | You want systematic prompt and pipeline optimization rather than code-level evolution |
| [Voyager](../projects/voyager.md) | You want skill accumulation in an open-ended environment without self-code-modification |
| Hand-crafted SOTA agent | You need a capable coding agent now, within a budget, with auditable behavior |

## Related Concepts

- [Self-Improving Agents](../concepts/self-improving-agents.md) — the broader class of systems the DGM belongs to
- [Reinforcement Learning](../concepts/reinforcement-learning.md) — alternative approach to agent self-improvement via reward signal
- [Agent Skills](../concepts/agent-skills.md) — the DGM discovers and accumulates skills through evolution rather than explicit skill libraries
- [Continual Learning](../concepts/continual-learning.md) — the DGM achieves a form of continual improvement, though via code modification rather than weight updates
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — the archive functions as a population of agents, though coordination between them is via selection rather than communication
- [Execution Traces](../concepts/execution-traces.md) — the DGM uses benchmark evaluation logs (a form of execution trace) as the primary input to its self-analysis

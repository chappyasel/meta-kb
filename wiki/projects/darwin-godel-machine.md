---
entity_id: darwin-godel-machine
type: project
bucket: self-improving
abstract: >-
  Darwin Gödel Machine: a self-improving coding agent that evolves its own
  Python codebase via empirical benchmark validation, growing from 20% to 50%
  SWE-bench accuracy through population-based open-ended search.
sources:
  - tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
related: []
last_compiled: '2026-04-08T02:58:08.469Z'
---
# Darwin Gödel Machine

## What It Is

The Darwin Gödel Machine (DGM) is a self-improving agent system that modifies its own source code to get better at software engineering tasks. The core claim: rather than human engineers iterating on agent design, the agent iterates on itself, discovering better tools, workflows, and memory patterns through something like evolutionary search.

The name carries theoretical weight. Schmidhuber's 2003 Gödel Machine proposed a self-rewriting AI that only applied changes it could formally prove were beneficial. That theoretical elegance was also its practical death sentence: proving most code modifications are net beneficial is computationally intractable. DGM replaces formal proofs with empirical benchmark validation. If the new agent scores higher, the change is "proved." This is the paper's central design decision, and it is what makes the system buildable with current technology.

Authors: Jenny Zhang, Shengran Hu, Cong Lu, Robert Lange, [Jeff Clune](../concepts/jeff-clune.md). Published May 2025, updated March 2026.

[Source](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

## Architecture

Three components make the system work:

**Agent Archive.** A growing population of coding agent variants, each stored as a complete Python codebase. The archive starts with a single seed agent and expands as new variants pass validation. Critically, every agent ever created is retained, not just high-performers. This is not a storage convenience; it is the mechanism that prevents the search from collapsing to a local optimum.

**Selection and Reproduction.** Parent agents are sampled from the archive proportional to their fitness scores and reproductive history. Each parent feeds its own benchmark evaluation logs into its foundation model, identifies failure patterns, and proposes concrete code modifications to its own codebase. The foundation model (Claude 3.5 Sonnet in the experiments) does the actual reasoning about what to change; the evolutionary loop determines which agents propose changes and which changes survive.

**Validation and Filtering.** New variants must pass three gates before joining the archive: successful compilation, retained codebase-editing capability (a 10-task functional check), and full benchmark evaluation. This functional continuity constraint ensures the self-modification ability itself is never mutated away.

The archive grows as a tree: nodes are agent variants, edges are parent-child modification relationships. Multiple branches explore in parallel, allowing the search to pursue different evolutionary paths simultaneously.

## How Self-Modification Works

The core loop, concretely:

1. Sample a parent agent from the archive, weighted by fitness.
2. Feed the parent its own evaluation logs through a structured prompt: here are your failures, what would you change?
3. The parent (via its FM) proposes specific code modifications.
4. The modified agent runs compilation check → 10-task verification → full benchmark.
5. If it passes all three gates, add it to the archive.

Over 80 iterations on SWE-bench, the system independently discovered four categories of improvements:

- **Granular file operations:** replacing whole-file reads/writes with line-range viewing and string-replacement editing. Human developers made this same transition decades ago; the DGM converged to it independently.
- **Best-of-N sampling:** generating multiple solution candidates and selecting the strongest, a self-discovered form of inference-time compute scaling.
- **Failure memory:** carrying information from previous failed attempts into subsequent solution attempts, a self-discovered [Reflexion](../concepts/reflexion.md)-style pattern.
- **Self-review:** critiquing its own outputs before submission.

None of these were seeded in the initial agent. [Source](../raw/deep/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

## Why the Archive Matters

The archive-all policy is the design decision that separates the DGM from greedy search. A variant that adds a valuable new editing tool but simultaneously breaks its review mechanism will score poorly overall. In a best-only regime, that variant is discarded, and the editing tool innovation is lost. In the DGM archive, that variant persists and can be selected as a parent whose descendant restores the review mechanism while retaining the tool.

This is evolutionary "stepping stones": features that are neutral or harmful in their original context but become critical enablers for later innovations. The ablation confirms this: the best-only baseline tapers off quickly because poorly performing mutations make subsequent improvements harder to accumulate.

## Numbers

**SWE-bench Verified:**
- Seed agent: 20.0%
- Best discovered agent: 50.0%
- Improvement: 2.5x over ~80 iterations

**Polyglot (multi-language coding):**
- Seed agent: 14.2%
- Best discovered agent: 30.7%
- Comparison: surpassed Aider (~15%)

These are self-reported by the authors. No independent replication is documented in the available sources. The benchmark methodology (SWE-bench is a well-established external benchmark, not custom) provides some validation, but the specific run results have not been independently reproduced at time of writing.

**Ablation results (both self-reported):**
- Without self-improvement (fixed meta-agent, no iterative enhancement): gains taper off quickly.
- Without open-ended exploration (best-only archive): significantly worse than full DGM.

**Computational cost:** approximately two weeks of FM API calls for a single SWE-bench run. No exact dollar figures are published.

**Transfer:** improvements generalize when swapping Claude 3.5 Sonnet for Claude 3.7 Sonnet or o3-mini, and transfer from Python-heavy training to Rust, C++, and Go in the Polyglot benchmark. This suggests the discovered improvements are architectural (better tools and workflows) rather than Python-specific hacks.

## Strengths

The DGM provides the first empirically validated, end-to-end implementation of recursive self-improvement at the agent-architecture level. It demonstrates that a system can discover general agent improvements (not model improvements) that transfer across foundation models and programming languages. The archive-based open-ended search is a concrete, reusable pattern for any system searching over configurations, prompts, or agent architectures.

The self-analysis-of-failure-logs mutation operator is particularly valuable: rather than random code perturbations, the agent reads its own performance data and proposes targeted modifications. This is directed evolution, and practitioners can adopt it without the full DGM infrastructure.

## Limitations

**Foundation model ceiling.** The DGM modifies agent code but cannot retrain or modify the underlying FM. All self-improvement is bounded by what the frozen FM can reason about and implement. The most impactful improvements at some point require better underlying models, which is outside the DGM's scope.

**No safety guarantees.** Empirical validation confirms benchmark performance, not safety. A self-modified agent could introduce vulnerabilities, subtle failure modes, or adversarial behaviors that benchmarks do not detect. The paper's safety precautions (sandboxing, human oversight, runtime limits) are operational controls, not architectural ones. The authors acknowledge this and flag safety-aware evaluation as future work.

**Benchmark overfitting.** The system optimizes for SWE-bench performance. Real software engineering involves larger codebases, ambiguous requirements, and team coordination patterns that benchmarks do not capture. Transfer results provide partial evidence against pure overfitting, but the concern is not resolved.

**Single seed dependency.** The search space accessible to the DGM depends on the seed agent's architecture. The paper does not test sensitivity to different seeds. Different starting points likely produce different (and potentially better or worse) evolutionary trajectories.

**Cost.** Two weeks of API calls per run is a significant barrier. For most teams, human engineers can iterate on agent architecture faster and cheaper over that time horizon. The DGM's advantage is hypothesized to grow as problems become more complex, but this scaling claim is unproven.

## When Not to Use It

Do not deploy the DGM as a continuously running production system. The cost, the absence of safety guarantees, and the difficulty of auditing self-modified code make continuous operation inappropriate for production environments.

Do not use it when your evaluation signal does not closely match your modification domain. The DGM works because coding agents can be evaluated on coding benchmarks with the same tools the agent uses to modify itself. If your target capability (vision, writing, reasoning in unstructured domains) lacks equivalent empirical validation signals, the loop breaks.

Do not use it when you need explainable or auditable agent behavior. Self-modified codebases accumulate changes across many generations; tracing why a specific behavior exists becomes difficult.

## Unresolved Questions

**Cost accounting.** The authors acknowledge significant API costs but publish no figures. Understanding whether the DGM is cost-competitive with human engineering requires this data, and it is not available.

**Governance of self-modification.** At what point does a self-modified agent differ enough from its seed that it requires fresh safety evaluation? The functional continuity constraint (retain codebase-editing ability) is a minimal filter. There is no described process for human review of accumulated architectural changes.

**FM co-evolution.** The authors identify this as the obvious next step: allowing the DGM to also modify or select among foundation models, not just agent code. This is where recursive self-improvement becomes genuinely powerful and genuinely concerning. The paper does not address how this would be validated or constrained.

**Hyperagents extension.** Subsequent work (DGM-Hyperagents, from Jenny Zhang's internship at Meta) extends the architecture to make the self-improvement procedure itself editable, not just the task-solving behavior. Early results show this outperforms the base DGM across coding, paper review, robotics reward design, and Olympiad-level math grading. This direction is promising but remains in early research stages. [Source](../raw/tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md)

## Alternatives and Selection Guidance

- Use [AFlow](../projects/aflow.md) when you want automated workflow optimization without code-level self-modification. Lower cost, narrower scope.
- Use [EvoAgentX](../projects/evoagentx.md) when you need multi-agent system optimization rather than single-agent architecture search.
- Use [DSPy](../projects/dspy.md) when your self-improvement goal is prompt and few-shot optimization rather than code architecture change. Much cheaper per iteration.
- Use [Voyager](../projects/voyager.md) when your domain is open-ended skill acquisition in a simulation environment rather than software engineering.
- Use the DGM pattern (not necessarily the full system) when: you have a reliable empirical evaluation signal, your agents are implemented in modifiable code, and you want to automate architecture search over weeks rather than engineering it by hand.

## Related Concepts

[Self-Improving Agents](../concepts/self-improving-agents.md) | [Agent Skills](../concepts/agent-skills.md) | [Reinforcement Learning](../concepts/reinforcement-learning.md) | [Continual Learning](../concepts/continual-learning.md) | [Execution Traces](../concepts/execution-traces.md) | [Meta-Agent](../concepts/meta-agent.md) | [Reflexion](../concepts/reflexion.md)

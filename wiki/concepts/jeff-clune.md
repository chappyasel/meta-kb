---
entity_id: jeff-clune
type: person
bucket: self-improving
abstract: >-
  AI researcher at UBC/Vector Institute whose work on open-ended learning,
  quality-diversity algorithms, and self-improving systems spans neuroevolution,
  the AI-generating algorithm hypothesis, and practical agent self-modification.
sources:
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
  - repos/shengranhu-adas.md
  - tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md
related: []
last_compiled: '2026-04-08T23:16:27.172Z'
---
## Jeff Clune

**Role:** Professor, University of British Columbia; Canada CIFAR AI Chair, Vector Institute; formerly Research Team Lead at OpenAI and Senior Research Scientist at Uber AI Labs.

## Core Contributions

Clune's research centers on systems that generate their own complexity rather than requiring human-specified architectures. Three threads run through the body of work.

**Open-ended learning.** Clune has argued since at least 2019 that the path to general AI runs through open-ended processes, formalized in the "AI-generating algorithms" (AI-GA) hypothesis: rather than hand-designing each AI capability, researchers should build systems that generate capable AI the way evolution generated intelligent organisms. This reframes AI development as an optimization problem over meta-processes.

**Quality-diversity algorithms.** Working on MAP-Elites and related methods, Clune helped establish quality-diversity (QD) as a practical alternative to pure fitness maximization. QD algorithms maintain an archive of diverse, high-performing solutions rather than collapsing to a single optimum. This directly addresses deceptive local optima that stall standard evolutionary or gradient methods. His lab produced the [GEPA](../concepts/gepa.md) framework and contributed to [Voyager](../projects/voyager.md)'s skill library design, where diversity of stored skills matters more than raw performance on any single task.

**Self-improving agents.** The most recent thread extends open-endedness to agent code itself. The [Darwin Gödel Machine](../projects/darwin-godel-machine.md) (DGM), co-authored with Jenny Zhang, Shengran Hu, Cong Lu, and Robert Lange, builds an archive of coding agents where each agent can modify its own codebase, with empirical benchmarks (SWE-bench, Polyglot) used in place of Gödel's original requirement for formal proof. DGM raised SWE-bench performance from 20.0% to 50.0% through self-generated improvements to code editing tools, context window management, and peer-review mechanisms. These numbers are self-reported in the arxiv preprint; independent replication has not yet appeared.

The [Automated Design of Agentic Systems](../repos/shengranhu-adas.md) (ADAS) paper, led by Shengran Hu with Clune as senior author, introduced Meta Agent Search: a meta-agent that iteratively writes new agent designs in Python, accumulates a library of discovered building blocks, and selects the most promising prior design to extend next. Published at ICLR 2025 and awarded Outstanding Paper at the NeurIPS 2024 Open-World Agent Workshop.

The follow-on [HyperAgents](../projects/hyperagents.md) work, done during a Meta internship, extends DGM by making the self-improvement procedure itself editable. This addresses a failure mode in DGM: when task-solving and meta-improvement live in different domains, improvements to task performance don't automatically improve the improvement process. HyperAgents demonstrated cross-domain transfer of meta-level improvements (persistent memory, performance tracking) across coding, paper review, robotics reward design, and math grading.

## Why This Work Matters for Agent Infrastructure

Clune's framing treats agent architecture as a search space rather than an engineering deliverable. For builders of [multi-agent systems](../concepts/multi-agent-systems.md) and [self-improving agents](../concepts/self-improving-agents.md), this reframes several practical questions:

- Memory and skill composition shouldn't be hand-tuned once; they're parameters in an ongoing optimization.
- Evaluation harnesses (benchmarks) serve double duty as fitness functions for architecture search.
- Diversity in an agent archive prevents the system from converging prematurely to locally good but globally suboptimal designs.

His work on [continual learning](../concepts/continual-learning.md) is directly relevant to knowledge systems that must accumulate capabilities without catastrophic forgetting.

## Notable Papers

- "AI-Generating Algorithms, an Alternate Paradigm for Producing General Artificial Intelligence" (2019)
- "Automated Design of Agentic Systems" (ICLR 2025)
- "Darwin Gödel Machine: Open-Ended Evolution of Self-Improving Agents" (2025)
- "Evolution Strategies as a Scalable Alternative to Reinforcement Learning" (with OpenAI, 2017)
- "Welcoming the Era of Deep Neuroevolution" (Uber AI, 2017)
- MAP-Elites contributions to quality-diversity literature

## Affiliations and Context

Clune spent time at OpenAI before moving to UBC, which gives his lab an unusual combination of large-model access and academic freedom to pursue open-ended research that doesn't fit a product roadmap. His students (Zhang, Hu, Lu) have been primary contributors on the DGM and ADAS lines, with Clune functioning as the intellectual anchor on open-endedness framing.

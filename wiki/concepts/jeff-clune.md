---
entity_id: jeff-clune
type: person
bucket: self-improving
abstract: >-
  Jeff Clune is a CS professor at UBC and research scientist known for
  open-ended learning, neuroevolution, and self-improving AI systems.
sources:
  - tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md
  - repos/shengranhu-adas.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
related:
  - Self-Improving Agents
last_compiled: '2026-04-05T20:37:07.597Z'
---
## Jeff Clune

**Role:** Professor, University of British Columbia; Research Scientist (Meta AI, formerly OpenAI)
**Areas:** Open-ended learning, neuroevolution, self-improving AI, quality-diversity algorithms

Clune has spent two decades on a consistent question: can AI systems improve themselves without human intervention? His early work on neuroevolution (HyperNEAT, NEAT variants) showed that evolutionary methods could discover neural architectures that gradient descent missed. That thread runs directly into his current work on agents that rewrite their own code.

His most cited recent contribution is framing **open-endedness** as a core research goal: systems that keep discovering novel, useful capabilities rather than converging to a local optimum. This distinguishes his agenda from standard AutoML or NAS work, which optimizes toward a fixed target.

**Key contributions:**

- **ADAS (Automated Design of Agentic Systems)**, published ICLR 2025 with Shengran Hu and Cong Lu: a meta-agent that iteratively programs new agent architectures in code, treating the agent design space as searchable. [Source](../raw/repos/shengranhu-adas.md)

- **Darwin Gödel Machine (DGM)**, 2025, with Jenny Zhang et al.: a self-improving system that modifies its own codebase and validates changes empirically via coding benchmarks. SWE-bench performance grew from 20% to 50% through autonomous self-modification. [Source](../raw/papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md)

- **Hyperagents / DGM-H**: an extension where both the task-solving behavior and the self-improvement procedure are editable, enabling meta-level improvements that transfer across domains (coding, robotics reward design, math grading). [Source](../raw/tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md)

His approach to the Gödel machine problem is pragmatic: drop the provability requirement, substitute empirical validation, add evolutionary exploration. The DGM line of work represents the clearest current instantiation of [Self-Improving Agents](../concepts/self-improving-agents.md) in a deployable research system.


## Related

- [Self-Improving Agents](../concepts/self-improving-agents.md) — implements (0.7)

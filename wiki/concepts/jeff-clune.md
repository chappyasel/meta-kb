---
entity_id: jeff-clune
type: person
bucket: self-improving
abstract: >-
  AI researcher at UBC/Vector Institute known for open-ended learning,
  neuroevolution, and AI-GA paradigm; argues AI progress itself should be
  automated through meta-learning and evolutionary search.
sources:
  - tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md
  - repos/shengranhu-adas.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
related: []
last_compiled: '2026-04-08T02:58:55.996Z'
---
# Jeff Clune

## Who He Is

Jeff Clune is a professor at the University of British Columbia and Canada CIFAR AI Chair at the Vector Institute. Before academia, he held research positions at OpenAI and Uber AI Labs. His work sits at the intersection of evolutionary computation, deep learning, and what he calls "open-ended" AI: systems that generate their own stepping stones toward unbounded capability growth.

## Key Contributions

**AI-Generating Algorithms (AI-GA).** Clune's 2019 paper articulated a program for automating AI research itself. The core claim: rather than hand-designing learning algorithms, we should build meta-systems that discover algorithms through search. Three pillars underpin this: meta-learning to acquire learning algorithms, environment generation to create open-ended training curricula, and architectural search. This framing predates and anticipates much of the current work on self-improving agents.

**Automated Design of Agentic Systems (ADAS).** Co-authored with Shengran Hu and Cong Lu (ICLR 2025, Outstanding Paper at NeurIPS 2024 Open-World Agent Workshop), ADAS operationalizes AI-GA for agent architectures. The core algorithm, Meta Agent Search, runs a "meta" agent that iteratively programs new agents in Python code, maintains an archive of discovered designs, and evaluates them against benchmarks. Each generation samples from the archive, proposes modifications, and commits improvements back. The implementation lives in `search.py` across domain-specific folders (`_arc`, `_drop`, `_mgsm`, `_mmlu`); `evaluate_forward_fn()` defines the fitness criterion for each domain. The repo has 1,551 GitHub stars. Benchmark results are self-reported. See [ADAS repository](../repos/shengranhu-adas.md).

**Darwin Gödel Machine (DGM).** Co-authored with Jenny Zhang, Shengran Hu, Cong Lu, and Robert Lange (2025). DGM takes the ADAS logic further: agents don't just design other agents, they modify their own codebases and validate changes empirically against coding benchmarks. The system maintains an archive of agents organized as a growing tree, samples from it, and uses a foundation model to generate "interesting" variants. Self-reported results show SWE-bench performance rising from 20.0% to 50.0% and Polyglot from 14.2% to 30.7% through automated self-modification. DGM explicitly sidesteps the original Gödel Machine's requirement for provable correctness, substituting empirical validation. See [Darwin Gödel Machine](../projects/darwin-godel-machine.md).

**HyperAgents / DGM-H.** An extension (in collaboration with Meta AI researchers) where both task-solving behavior and the self-improvement procedure itself are editable. The key advance over DGM: meta-level improvements (persistent memory, performance tracking mechanisms) transfer across domains and accumulate across runs. This addresses DGM's core assumption that coding ability and self-modification ability are aligned domains. See [HyperAgents](../projects/hyperagents.md).

**Earlier work.** Clune's pre-LLM research established much of the conceptual groundwork: novelty search (seeking behavioral novelty rather than objective fitness), quality diversity algorithms (MAP-Elites), neuroevolution of neural network weights and topologies, and environment generation for open-ended learning. His collaboration with Kenneth Stanley on quality diversity methods remains influential in evolutionary computation.

## Research Thread

The through-line across Clune's career is a single bet: objective-driven optimization gets stuck, but systems that maintain diversity and search for novelty can escape local optima and compound capability indefinitely. This shows up in MAP-Elites (maintain a grid of diverse solutions), in AI-GA (don't optimize for one task, generate a curriculum that keeps expanding), and in DGM (don't freeze the agent architecture, let it evolve). The LLM era gave him a practical substrate for the code-generation component that earlier evolutionary approaches had to approximate with mutation operators.

## Connections to Broader Agent Infrastructure

His work directly informs [Self-Improving Agents](../concepts/self-improving-agents.md), [Meta-Agent](../concepts/meta-agent.md) design patterns, and [Agent Skills](../concepts/agent-skills.md) composition. The archive-based search in ADAS and DGM is a concrete implementation of [Memory Evolution](../concepts/memory-evolution.md) at the architectural level. [Continual Learning](../concepts/continual-learning.md) work relates, though Clune's focus is capability expansion rather than catastrophic forgetting prevention.

## Caveats

Most benchmark numbers from DGM and ADAS are self-reported by the research group. The 50% SWE-bench figure for DGM was not independently validated at time of publication. Clune's framing is optimistic about open-endedness timelines; critics note that archive-based methods scale poorly when the search space is not well-structured by a competent foundation model doing the mutation step.

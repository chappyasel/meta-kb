---
entity_id: jeff-clune
type: person
bucket: self-improving
abstract: >-
  Jeff Clune is a UBC/OpenAI researcher whose work on open-ended learning,
  quality-diversity algorithms, and AI-generating algorithms directly informs
  how self-improving agent systems discover and accumulate capabilities
  autonomously.
sources:
  - tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md
  - repos/shengranhu-adas.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
related: []
last_compiled: '2026-04-06T02:08:49.459Z'
---
# Jeff Clune

## Who He Is

Jeff Clune is a professor at the University of British Columbia and a researcher previously at [OpenAI](../projects/openai.md), where he led the AI Foundations team. His work sits at the intersection of evolutionary computation, deep learning, and open-ended learning. He has spent roughly two decades asking a single organizing question: how do you build systems that keep getting better indefinitely, without a human redesigning them?

## Key Research Contributions

**Open-Ended Learning.** Clune has been a central figure in formalizing open-ended learning as a research agenda: the idea that intelligence emerges from systems that continuously generate and solve increasingly complex challenges. His 2019 paper "AI-Generating Algorithms" (often called "AI-GAs") argued that rather than hand-designing each component of an AI system, researchers should build meta-learning systems that generate learning algorithms, architectures, and training environments automatically. This framing has become a touchstone for the [self-improving agents](../concepts/self-improving-agents.md) research thread.

**Quality-Diversity Algorithms.** Clune developed and popularized quality-diversity (QD) methods, particularly MAP-Elites and its variants, which maintain archives of diverse, high-quality solutions rather than converging on a single optimum. This archive-based thinking reappears directly in the [Darwin Gödel Machine](../projects/darwin-godel-machine.md), where a growing tree of diverse agents replaces single-best-agent selection.

**Darwin Gödel Machine.** Clune is a co-author on the DGM paper (Zhang, Hu, Lu, Lange, Clune, 2025). DGM agents iteratively rewrite their own code, empirically validate changes against coding benchmarks, and maintain a MAP-Elites-style archive of agent variants. Performance on SWE-bench rose from 20.0% to 50.0% through autonomous self-modification (self-reported; not independently replicated as of mid-2025).

**ADAS and Meta Agent Search.** Clune co-authored "Automated Design of Agentic Systems" (Hu, Lu, Clune, ICLR 2025), which introduced Meta Agent Search: a meta-agent that programs new agents in code, accumulates discoveries across iterations, and searches the space of possible agent architectures without human intervention. The ADAS repository (1,551 GitHub stars as of early 2026) provides runnable implementations across ARC, DROP, MGSM, and MMLU domains. This work is a direct precursor to [GEPA](../concepts/gepa.md) and related agent evolution frameworks.

**Voyager.** Clune advised or collaborated on [Voyager](../projects/voyager.md), the GPT-4-powered Minecraft agent that builds a skill library through open-ended exploration. Voyager operationalized the AI-GAs vision at a smaller scale: the agent writes and stores reusable code skills, accumulating [procedural memory](../concepts/procedural-memory.md) across a game environment.

**HyperAgents.** More recently, Clune collaborated on HyperAgents (Zhang et al., 2025), which extends DGM by making the self-improvement procedure itself editable. Where DGM only evolves task-solving code, HyperAgents evolve the meta-level process that generates future improvements. This addresses the core fragility of first-generation self-improving systems: the improvement loop was fixed by the original designers.

## Why He Matters for Agent Intelligence Systems

Clune's research directly shapes how practitioners think about [agent skills](../concepts/agent-skills.md) accumulation, [procedural memory](../concepts/procedural-memory.md) in agents, and [meta-evolution](../concepts/meta-evolution.md). The specific mechanisms he develops — archive-based diversity maintenance, empirical validation replacing proof-based guarantees, open-ended exploration over fixed search spaces — have moved from academic papers into production-adjacent systems like DGM and ADAS. Builders designing agents that need to adapt their own context handling, memory management, or skill composition over time will find his papers more operationally useful than most theoretical work in the space.

## Notable Affiliations and Collaborators

- University of British Columbia (current faculty)
- [OpenAI](../projects/openai.md) (former; led AI Foundations team)
- Frequent collaborators: Shengran Hu, Cong Lu, Jenny Zhang, Robert Lange

## Selected Work

- "AI-Generating Algorithms, an Alternate Paradigm for Producing General Artificial Intelligence" (2019)
- "Automated Design of Agentic Systems" (ICLR 2025) — [ADAS repo](../repos/shengranhu-adas.md)
- "Darwin Gödel Machine" (2025) — [DGM paper](../projects/darwin-godel-machine.md)
- HyperAgents (2025) — metacognitive self-modification across coding, robotics, and math domains
- Voyager (2023) — [Voyager](../projects/voyager.md)

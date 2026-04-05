---
entity_id: jeff-clune
type: person
bucket: self-improving
sources:
  - tweets/jennyzhangzt-introducing-hyperagents-an-ai-system-that-not-onl.md
  - repos/shengranhu-adas.md
  - papers/zhang-darwin-godel-machine-open-ended-evolution-of-self.md
related: []
last_compiled: '2026-04-05T05:43:04.858Z'
---
# Jeff Clune

AI researcher at the University of British Columbia and a Canada CIFAR AI Chair, previously at OpenAI, Uber AI Labs, and the University of Wyoming. His research spans open-ended learning, quality-diversity (QD) algorithms, neuroevolution, and self-improving AI systems.

## Key Contributions

**Quality-diversity algorithms.** Clune's early work on MAP-Elites and related QD methods established the idea that search should optimize for a diverse archive of high-performing solutions rather than a single optimum. This framework later informed his approach to open-ended AI: maintain a growing population of varied artifacts rather than hill-climbing toward one target.

**AI-Generating Algorithms (AI-GAs).** A 2020 paper Clune authored argued that the path to general AI runs through algorithms that themselves generate AI systems, rather than through hand-designed architectures. This framing directly motivated the self-improvement research that followed.

**Automated Design of Agentic Systems (ADAS).** Clune co-authored the ADAS paper (ICLR 2025, Outstanding Paper at NeurIPS 2024 Open-World Agent Workshop), introducing Meta Agent Search: a meta-agent that iteratively programs new agent designs in code, building on previous discoveries. The [ADAS repo](https://github.com/ShengranHu/ADAS) has ~1,500 GitHub stars. Results are self-reported on standard benchmarks (ARC, DROP, MGSM, MMLU).

**Darwin Gödel Machine (DGM).** Co-authored with Jenny Zhang, Shengran Hu, Cong Lu, and Robert Lange (2025), DGM replaces the provability requirement of the original Gödel Machine with empirical validation. The system maintains an archive of coding agents, samples from it, uses a foundation model to generate a modified version, then benchmarks the result. Self-reported performance on SWE-bench improved from 20.0% to 50.0%; Polyglot from 14.2% to 30.7%. These numbers are self-reported and run in sandboxed environments with human oversight.

**Hyperagents / DGM-H.** An extension of DGM where both the task-solving behavior and the self-improvement procedure itself are editable. Clune served as a collaborator on this Meta AI internship project. The system demonstrated meta-level improvements (persistent memory, performance tracking) that transferred across coding, paper review, robotics reward design, and math grading domains.

## Notable Positions

University of British Columbia (current faculty), OpenAI (Research Director, 2019-2021), Uber AI Labs, University of Wyoming.

## Related Concepts

Self-improving systems, open-ended learning, quality-diversity search, meta-learning, agentic system design.

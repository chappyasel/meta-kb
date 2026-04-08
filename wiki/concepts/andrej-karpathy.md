---
entity_id: andrej-karpathy
type: person
bucket: agent-architecture
abstract: >-
  Andrej Karpathy: AI researcher who co-founded OpenAI, led Tesla Autopilot, and
  invented the "autoresearch" self-improvement loop pattern — autonomous agent
  loops that run modify/verify/keep/revert cycles without human intervention.
sources:
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/uditgoenka-autoresearch.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/garrytan-gstack.md
  - repos/jmilinovich-goal-md.md
  - repos/karpathy-autoresearch.md
  - repos/safishamsi-graphify.md
  - repos/uditgoenka-autoresearch.md
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
related:
  - autoresearch
  - claude-code
  - claude
  - cursor
  - context-engineering
  - codex
  - multi-agent-systems
  - markdown-wiki
  - retrieval-augmented-generation
  - windsurf
  - obsidian
  - synthetic-data-generation
  - zettelkasten
  - pi
  - marp
  - udit-goenka
  - tobi-lutke
  - openai
  - model-context-protocol
  - agent-memory
  - agent-skills
  - claude-md
  - chatgpt
last_compiled: '2026-04-08T22:53:08.078Z'
---
# Andrej Karpathy

## Who He Is

Andrej Karpathy is an AI researcher and educator whose career has shaped both the technical foundations of deep learning and the emerging discipline of autonomous AI agents. He received his PhD from Stanford under Fei-Fei Li, co-founded [OpenAI](../projects/openai.md) in 2015, served as Director of AI at Tesla from 2017 to 2022 (leading the Autopilot vision team), returned to OpenAI briefly, then departed to focus on education and independent research. He is now most associated with the ongoing "agentic era" of software development, where he has become one of its most influential theorists.

## Key Contributions to the Agent Space

**The autoresearch loop.** Karpathy's most direct contribution to [self-improving agents](../concepts/self-improving-agents.md) is the autoresearch pattern, introduced in March 2026 via the `karpathy/autoresearch` repository. The system is a 630-line `train.py` file that an AI agent runs experiments on autonomously — editing code, committing, training for exactly five minutes, reading the validation metric, and keeping or reverting the change. No human intervention. The loop ran overnight and discovered 20 optimizations producing an 11% speedup on already-optimized code across 700 experiments.

The architectural insight is the three-file contract: `prepare.py` (immutable, locks the evaluation function), `train.py` (the single mutable degree of freedom), and `program.md` (natural language instructions that "program the program"). Fixing two files and freeing one prevents the agent from gaming the metric, going off-rails, or expanding its action space uncontrollably. The frozen evaluation function — `val_bpb` (validation bits per byte) — is what makes autonomous iteration meaningful rather than circular.

This pattern has since spawned a documented ecosystem: [pi-autoresearch](../projects/autoresearch.md) (Shopify CEO Tobi Lütke's TypeScript port, used to achieve a 53% speedup on Shopify's Liquid engine), [uditgoenka/autoresearch](../concepts/udit-goenka.md)'s Claude Code skill system, goal-md's generalization to constructed fitness functions, and meta-agent's extension to production traces with LLM judges. Lütke's public use of the pattern on a 20-year-old production codebase became a reference case for the loop's applicability beyond ML.

**Framing the "loopy era."** Karpathy has articulated a broader vision: frontier AI labs will run continuous self-improvement loops as standard practice, with agents designing experiments, editing code, collecting data, and optimizing architectures with minimal human oversight. His stated next step — SETI@home-style massively parallel agent collaboration — frames the research agenda for [multi-agent systems](../concepts/multi-agent-systems.md) in self-improvement contexts.

**Software 1.0/2.0/3.0 taxonomy.** His earlier framing of "Software 2.0" (neural networks as a new programming paradigm) and more recent "Software 3.0" (LLMs as programmable via natural language) has influenced how practitioners think about [context engineering](../concepts/context-engineering.md) and [agent skills](../concepts/agent-skills.md). The taxonomy appears in discussions of [CLAUDE.md](../concepts/claude-md.md) and similar agent directive files.

**Educational impact.** His lecture series (CS231n at Stanford, the "Neural Networks: Zero to Hero" YouTube series) produced a generation of practitioners who built the infrastructure this wiki covers. The nanoGPT and micrograd repositories remain reference implementations for understanding transformer architectures. The emphasis on comprehensible, minimal code ("so both humans and future agents can understand and extend it") directly influenced the design philosophy of autoresearch derivatives.

## Notable Work

- `karpathy/autoresearch` — the foundational autonomous improvement loop
- `karpathy/nanoGPT` — minimal GPT implementation widely used as a teaching reference
- `karpathy/micrograd` — 100-line autograd engine for understanding backpropagation
- CS231n — Stanford's computer vision course, early canonical deep learning curriculum
- Tesla Autopilot vision system (2017–2022)

## Related Concepts and Projects

His autoresearch pattern connects directly to [synthetic data generation](../concepts/synthetic-data-generation.md) (agents generating training signal), [reinforcement learning](../concepts/reinforcement-learning.md) (the keep/revert ratchet as a reward signal), [agent memory](../concepts/agent-memory.md) (git history as the loop's external memory), and [self-improving agents](../concepts/self-improving-agents.md) broadly. Projects like [Voyager](../projects/voyager.md), [Darwin Gödel Machine](../projects/darwin-godel-machine.md), and [EvoAgentX](../projects/evoagentx.md) operate in the same design space.

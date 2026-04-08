---
entity_id: andrej-karpathy
type: person
bucket: agent-architecture
abstract: >-
  Andrej Karpathy: AI researcher who coined "Software 2.0," built
  nanoGPT/micrograd for ML education, and formulated the autonomous experiment
  loop (karpathy loop) that drives modern agent self-improvement infrastructure.
sources:
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - repos/safishamsi-graphify.md
  - repos/karpathy-autoresearch.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/garrytan-gstack.md
  - repos/uditgoenka-autoresearch.md
  - repos/jmilinovich-goal-md.md
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - deep/repos/uditgoenka-autoresearch.md
  - deep/repos/jmilinovich-goal-md.md
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
  - openclaw
  - model-context-protocol
  - agent-memory
  - agent-skills
  - claude-md
last_compiled: '2026-04-08T02:36:26.156Z'
---
# Andrej Karpathy

**Type:** Person
**Domain:** Agent architecture, LLM education, self-improving systems

## Who He Is

Andrej Karpathy is an AI researcher and educator whose work spans foundational neural network research, large-scale systems at OpenAI and Tesla, and hands-on educational resources that became standard references for practitioners building LLM-based systems. He holds a PhD from Stanford under Fei-Fei Li, where his thesis covered recurrent neural networks applied to image description. He co-founded OpenAI, then led Tesla's Autopilot AI team for several years, returned to OpenAI, and as of 2024 operates independently.

## Key Contributions to the Agent Infrastructure Space

**The karpathy loop (autoresearch pattern).** His most direct contribution to agent infrastructure is the autonomous experiment loop pattern, documented in his `karpathy/autoresearch` project. The loop is conceptually simple: an LLM agent modifies code, commits the change, runs a benchmark, and either keeps or reverts based on the metric outcome, then repeats indefinitely. The original implementation ran overnight on single-GPU nanochat training, producing 700+ experiments over two days and discovering 20 optimizations including an 11% speedup on already-optimized code.

The pattern's power is its constraint structure: one mutable file (`train.py`), one immutable scoring function (`prepare.py`), one fixed time budget per experiment. These constraints let the agent operate autonomously without gaming the metric or losing its way in an unbounded action space. He characterized the current period as the "loopy era" where frontier labs run continuous self-improvement loops as standard practice. Several derivative implementations have since generalized this pattern beyond ML training — to software benchmarks ([AutoResearch](../projects/autoresearch.md)), any measurable metric ([pi-autoresearch](../projects/autoresearch.md)), and subjective domains ([uditgoenka/autoresearch](../projects/autoresearch.md)).

**Software 2.0.** His 2017 blog post articulated that neural networks are a new programming paradigm where you specify behavior through datasets and loss functions rather than explicit code. This framing became foundational vocabulary for thinking about what LLMs do and why [context engineering](../concepts/context-engineering.md) and [synthetic data generation](../concepts/synthetic-data-generation.md) matter as first-class engineering disciplines.

**nanoGPT and micrograd.** These minimal, readable implementations of GPT training and backpropagation became the de facto educational starting points for practitioners entering the field. nanoGPT is the codebase his autoresearch loop was originally applied to. The "make the algorithm comprehensible to both humans and future agents" philosophy embedded in these projects directly shaped how derivative autoresearch projects were written — simple enough that an LLM can read, understand, and modify them without hallucinating about hidden complexity.

**LLM OS framing.** He proposed thinking of LLMs as operating system kernels around which peripheral capabilities (memory, tools, multi-agent coordination) attach. This framing influenced how researchers think about [agent memory](../concepts/agent-memory.md), [multi-agent systems](../concepts/multi-agent-systems.md), and [cognitive architecture](../concepts/cognitive-architecture.md). The LLM handles reasoning; external systems handle storage and action.

**"Vibe coding" and AI-native development workflows.** His public commentary on using LLMs for coding helped normalize the shift toward [agent-mediated workflows](../concepts/agent-mediated-workflows.md) and tools like [Claude Code](../projects/claude-code.md), [Cursor](../projects/cursor.md), and [Windsurf](../projects/windsurf.md). He has used and publicly commented on these tools, contributing to their adoption among researchers.

## Notable Work

- `karpathy/autoresearch` — the foundational autonomous experiment loop that spawned an ecosystem including [AutoResearch](../projects/autoresearch.md) and numerous adaptations
- `karpathy/nanoGPT` — minimal GPT training implementation, the original autoresearch target
- `karpathy/micrograd` — 100-line autograd engine for education
- YouTube lecture series "Neural Networks: Zero to Hero" — widely cited as the best entry point for practitioners
- Founding team, OpenAI (2015); Director of AI, Tesla Autopilot (2017–2022); Senior Research Scientist, OpenAI (2022–2023)

## Relationship to Referenced Projects

The karpathy loop is the conceptual ancestor of [AutoResearch](../projects/autoresearch.md), which implements the pattern as a Claude Code skill system with 10 subcommands. Shopify CEO Tobi Lütke applied the pattern to Shopify's Liquid template engine using the pi-autoresearch extension, achieving a 53% parse-render speedup across ~120 automated experiments. The meta-agent project (canvas-org) extends the same loop to harness optimization on unlabeled production traces, improving tau-bench airline accuracy from 67% to 87%. All of these systems cite his work as the direct source of the constraint-metric-loop pattern.


## Related

- [AutoResearch](../projects/autoresearch.md) — created_by (0.6)
- [Claude Code](../projects/claude-code.md) — part_of (0.5)
- [Claude](../projects/claude.md) — part_of (0.4)
- [Cursor](../projects/cursor.md) — part_of (0.4)
- [Context Engineering](../concepts/context-engineering.md) — part_of (0.6)
- [OpenAI Codex](../projects/codex.md) — part_of (0.5)
- [Multi-Agent Systems](../concepts/multi-agent-systems.md) — part_of (0.4)
- [Markdown Wiki](../concepts/markdown-wiki.md) — part_of (0.6)
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md) — part_of (0.5)
- [Windsurf](../projects/windsurf.md) — part_of (0.3)
- [Obsidian](../projects/obsidian.md) — part_of (0.5)
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — part_of (0.5)
- [Zettelkasten](../concepts/zettelkasten.md) — part_of (0.5)
- [Pi](../projects/pi.md) — part_of (0.5)
- [MARP](../projects/marp.md) — part_of (0.3)
- [OpenClaw](../projects/openclaw.md) — part_of (0.3)
- [Model Context Protocol](../concepts/model-context-protocol.md) — part_of (0.4)
- [Agent Memory](../concepts/agent-memory.md) — part_of (0.5)
- [Agent Skills](../concepts/agent-skills.md) — part_of (0.5)
- [CLAUDE.md](../concepts/claude-md.md) — part_of (0.4)

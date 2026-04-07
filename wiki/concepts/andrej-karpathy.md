---
entity_id: andrej-karpathy
type: person
bucket: agent-systems
abstract: >-
  Andrej Karpathy: AI researcher/educator who built nanoGPT and coined the
  autoresearch loop; bridges foundational ML theory with hands-on implementation
  in ~800-line readable codebases.
sources:
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - repos/karpathy-autoresearch.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/jmilinovich-goal-md.md
  - repos/uditgoenka-autoresearch.md
  - repos/garrytan-gstack.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/uditgoenka-autoresearch.md
  - articles/x-twitter-meta-agent-continual-learning-for-agents.md
related:
  - autoresearch
  - claude-code
  - cursor
  - claude
  - codex
  - self-improving-agent
  - rag
  - windsurf
  - obsidian
  - prompt-engineering
  - karpathy-loop
  - claude-md
  - tobi-lutke
  - knowledge-base
  - openclaw
  - agent-memory
  - nanogpt
  - task-decomposition
  - gemini
  - synthetic-data-generation
  - muon-optimizer
last_compiled: '2026-04-07T11:34:42.203Z'
---
# Andrej Karpathy

## Who He Is

Andrej Karpathy is an AI researcher and educator who has spent the past decade making deep learning legible. He completed his PhD at Stanford under Fei-Fei Li, joined OpenAI as a founding member, left to lead Tesla's Autopilot team (2017–2022), returned to OpenAI as a senior researcher, then departed in 2023 to work independently. He now focuses on education, open-source tools, and autonomous agent research.

His public profile sits at the intersection of two modes: researcher who ships working code and teacher who explains why it works. Both roles feed each other. The lectures become codebases; the codebases become research.

## Key Contributions to LLM and Agent Systems

**nanoGPT** ([nanoGPT](../projects/nanogpt.md)) — A ~300-line PyTorch reimplementation of GPT-2 that trains real models. The design philosophy prioritizes readability over abstraction: no inheritance hierarchies, no framework dependencies, every line traceable. It became the reference implementation that thousands of practitioners use to understand transformer internals before touching production-scale code.

**The Karpathy Loop** ([Karpathy Loop](../concepts/karpathy-loop.md)) — Coined from his autoresearch project ([AutoResearch](../projects/autoresearch.md)): an agent runs indefinitely in a modify → verify → keep/revert cycle, using git history as memory and a frozen scalar metric as the sole fitness function. The loop ran 700 experiments over two days, found 20 optimizations, and produced an 11% speedup on already-optimized code. Tobi Lütke ([Tobi Lütke](../concepts/tobi-lutke.md)) applied it to Shopify's Liquid template engine and reported a 19% performance gain across 37 experiments. The pattern has since been generalized by projects like [pi-autoresearch](../projects/autoresearch.md) and [uditgoenka/autoresearch](../projects/autoresearch.md), and spawned a broader ecosystem of autoresearch tools.

**LLM Knowledge Bases** ([LLM Knowledge Base](../concepts/knowledge-base.md)) — Described in a tweet that reached ~10M views: collect raw documents into a `raw/` directory, have an LLM compile them into a markdown wiki, query the wiki with an LLM agent, and file query outputs back into the wiki. The cycle is self-reinforcing: each query makes the knowledge base denser. He uses [Obsidian](../projects/obsidian.md) as the viewing layer and noted that at ~100 articles and ~400K words, LLM-maintained index files make explicit [RAG](../concepts/rag.md) infrastructure unnecessary at that scale. The endpoint he identified: [synthetic data generation](../concepts/synthetic-data-generation.md) and fine-tuning to move knowledge from context windows into model weights.

**Pedagogical clarity as a technical output** — His lecture series (CS231n at Stanford, "Zero to Hero" on YouTube) treat clarity as a design constraint, not a tradeoff. The same sensibility shows up in his code: nanoGPT and [MicroGrad](../projects/nanogpt.md) are deliberately small so both humans and future agents can read and extend them.

**"Vibe coding" and [prompt engineering](../concepts/prompt-engineering.md)** — He coined "vibe coding" to describe LLM-assisted development where the programmer maintains intent while the model handles syntax. He has written extensively on [prompt engineering](../concepts/prompt-engineering.md) as a discipline, including the observation that the bottleneck in agent systems is increasingly context design rather than model capability.

## Intellectual Positions Relevant to This Space

On [self-improving agents](../concepts/self-improving-agent.md): he frames the current period as a "loopy era" where agents running continuous improvement loops on code and research will become standard at frontier labs. His stated vision for autoresearch is not a single agent improving in sequence but a SETI@home-style parallel system with many agents exploring different branches simultaneously.

On [agent memory](../concepts/agent-memory.md) and [knowledge bases](../concepts/knowledge-base.md): he prefers file-based, LLM-maintained structures over specialized infrastructure at small-to-medium scale. Git serves as the memory system in his autoresearch work; markdown serves as the knowledge representation in his wiki work.

On [task decomposition](../concepts/task-decomposition.md): the three-file contract in autoresearch (`prepare.py` immutable, `train.py` mutable, `program.md` orchestration) is a concrete operationalization of his view that humans set direction and agents execute — strategy separated from tactics by file permissions.

On [synthetic data generation](../concepts/synthetic-data-generation.md): he identified it as the natural extension of the LLM knowledge base pattern — once a wiki is dense enough, generate fine-tuning data from it to move domain knowledge into weights.

## Notable Positions and Affiliations

- Co-founder, OpenAI (2015)
- Director of AI, Tesla (2017–2022)
- Senior Researcher, OpenAI (2023–2024)
- Independent researcher and educator (2024–present)

## Relevance to Agent Systems

Karpathy's practical influence on the agent systems space is disproportionate to his formal publications in it. The autoresearch loop is now a design pattern with 13+ independent implementations. His LLM knowledge base description seeded a category of tools. His pedagogical work shapes how new practitioners understand the transformer architecture underlying every modern agent. The [Muon optimizer](../concepts/muon-optimizer.md) work and his commentary on [GRPO](../concepts/grpo.md) and [reinforcement learning](../concepts/reinforcement-learning.md) for LLMs connect his historical research to current training practice.


## Related

- [AutoResearch](../projects/autoresearch.md) — created_by (0.6)
- [Claude Code](../projects/claude-code.md) — part_of (0.4)
- [Cursor](../projects/cursor.md) — part_of (0.4)
- [Claude](../projects/claude.md) — part_of (0.4)
- [OpenAI Codex](../projects/codex.md) — part_of (0.4)
- [Self-Improving Agent](../concepts/self-improving-agent.md) — part_of (0.7)
- [Retrieval-Augmented Generation](../concepts/rag.md) — alternative_to (0.4)
- [Windsurf](../projects/windsurf.md) — part_of (0.3)
- [Obsidian](../projects/obsidian.md) — part_of (0.4)
- [Prompt Engineering](../concepts/prompt-engineering.md) — part_of (0.5)
- [Karpathy Loop](../concepts/karpathy-loop.md) — created_by (1.0)
- [CLAUDE.md](../concepts/claude-md.md) — part_of (0.4)
- [Tobi Lütke](../concepts/tobi-lutke.md) — part_of (0.4)
- [LLM Knowledge Base](../concepts/knowledge-base.md) — created_by (0.6)
- [OpenClaw](../projects/openclaw.md) — part_of (0.3)
- [Agent Memory](../concepts/agent-memory.md) — part_of (0.5)
- [nanoGPT](../projects/nanogpt.md) — created_by (0.8)
- [Task Decomposition](../concepts/task-decomposition.md) — part_of (0.4)
- [Gemini](../projects/gemini.md) — part_of (0.3)
- [Synthetic Data Generation](../concepts/synthetic-data-generation.md) — part_of (0.4)
- [Muon Optimizer](../concepts/muon-optimizer.md) — part_of (0.4)

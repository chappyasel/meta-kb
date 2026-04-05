---
entity_id: andrej-karpathy
type: person
bucket: knowledge-bases
abstract: >-
  Andrej Karpathy: AI researcher (ex-OpenAI founding team, ex-Tesla AI
  director), educator (micrograd, nanoGPT), and originator of the
  LLM-as-wiki-curator pattern and autoresearch autonomous optimization loop.
sources:
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/karpathy-autoresearch.md
  - repos/garrytan-gstack.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/jmilinovich-goal-md.md
  - repos/uditgoenka-autoresearch.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/uditgoenka-autoresearch.md
  - deep/repos/davebcn87-pi-autoresearch.md
related:
  - Claude Code
  - AutoResearch
  - Cursor
  - OpenAI Codex
  - Obsidian
  - Windsurf
  - Prompt Engineering
  - Markdown Wiki
  - Retrieval-Augmented Generation
last_compiled: '2026-04-05T20:20:15.633Z'
---
# Andrej Karpathy

## Who He Is

Karpathy is a former OpenAI founding team member, former Tesla VP of AI and Autopilot, and one of the most influential AI educators working today. He holds a PhD from Stanford under Fei-Fei Li. He left Tesla in 2022, briefly returned to OpenAI, then departed again in early 2024 to focus on AI education and independent research.

## Key Contributions to This Space

### The LLM Knowledge Base Pattern

In March 2026, Karpathy published a [tweet](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md) describing a personal workflow that has since become a reference architecture for LLM-augmented research. The pattern:

- **Raw ingest layer**: source documents (papers, articles, repos, images) collected into a `raw/` directory, often via Obsidian Web Clipper
- **LLM-compiled wiki**: an agent incrementally converts raw material into structured markdown articles with backlinks, concept pages, and summaries
- **Ambient Q&A**: at ~100 articles / ~400K words, an LLM agent can answer complex questions by reading index files and summaries without a formal RAG system
- **Self-healing linting loop**: periodic LLM health checks find inconsistencies, impute missing data via web search, and surface candidate articles
- **Output-to-wiki feedback**: query outputs (markdown, Marp slides, matplotlib images) get filed back into the wiki, so every query strengthens the knowledge base

The tweet received 38,638 likes and 9.9 million views. Karpathy's closing observation — "I think there is room here for an incredible new product instead of a hacky collection of scripts" — has been treated as a design brief by several projects since. The key insight is that at small-to-medium scale, an intelligently maintained index file plus a capable LLM reader competes with RAG without the infrastructure overhead.

### Autoresearch: Autonomous Optimization Loop

Karpathy released [autoresearch](../projects/autoresearch.md) in early 2026, a 630-line `train.py` plus a natural-language `program.md` that together constitute an autonomous ML optimization system. An LLM agent reads the instructions, edits `train.py`, commits, trains for exactly 5 minutes, reads `val_bpb` (validation bits per byte, locked in `prepare.py` which the agent cannot touch), and keeps or reverts based on the result. The loop runs without stopping.

Key design choices:
- **Three-file contract**: `prepare.py` (immutable, owns the metric), `train.py` (mutable, agent's only degree of freedom), `program.md` (natural language instructions)
- **Git as memory**: every experiment is a commit; the agent reads `git log` at the start of each iteration to avoid repeating failed approaches
- **`git revert` over `git reset --hard`**: preserves failed experiments in history for learning
- **Fixed iteration cost**: 5-minute training budget makes all experiments directly comparable

Documented results: 700 experiments in 2 days, 20 optimizations, 11% speedup on already-optimized code (self-reported). Shopify CEO Tobias Lutke ran the pattern overnight on Shopify's Liquid engine and reported a 19% gain across 37 experiments (self-reported, not independently validated).

The pattern generalized rapidly. Pi-autoresearch ([davebcn87](../projects/pi-autoresearch.md)) applied it to Shopify's Ruby template engine for a 53% parse/render speedup and 61% fewer allocations across ~120 experiments (independently visible in the PR; benchmark conditions not audited externally). Udit Goenka's [Claude Code autoresearch skill](../projects/uditgoenka-autoresearch.md) encoded the loop as pure markdown for any measurable domain. Karpathy's formula — `AGENT + CONSTRAINED_SCOPE + SCALAR_METRIC + FAST_VERIFICATION = AUTONOMOUS_IMPROVEMENT` — is now the organizing principle across at least 13 derivative implementations.

Karpathy characterized the current period as the "loopy era" where frontier labs run continuous self-improvement loops as standard practice, predicting that the next evolution requires "asynchronously massively collaborative" multi-agent systems (SETI@home style) rather than a single sequential improvement thread.

### Pedagogical Work

Karpathy built [micrograd](https://github.com/karpathy/micrograd) (a 150-line autograd engine), [nanoGPT](https://github.com/karpathy/nanoGPT) (a minimal GPT-2 training script), and an extensive YouTube lecture series. His emphasis on making algorithms "comprehensible so both humans and future agents can understand and extend them" is a consistent design principle, visible in autoresearch's deliberate avoidance of orchestration frameworks in favor of a readable Markdown file.

## Notable Positions

He coined "Software 2.0" (neural networks as a programming paradigm) and "vibe coding" (describing the emerging practice of directing AI agents through natural language rather than writing code directly). Both terms entered common use in the ML engineering community.

## Related Concepts and Projects

- [Markdown Wiki](../concepts/markdown-wiki.md): the wiki-based knowledge base pattern he described
- [AutoResearch](../projects/autoresearch.md): the autonomous optimization loop he originated
- [Retrieval-Augmented Generation](../concepts/retrieval-augmented-generation.md): the approach his wiki pattern partially replaces at small scale
- [Prompt Engineering](../concepts/prompt-engineering.md): foundational to the `program.md` orchestration model

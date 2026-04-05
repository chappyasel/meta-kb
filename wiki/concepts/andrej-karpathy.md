---
entity_id: andrej-karpathy
type: person
bucket: agent-systems
sources:
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - repos/karpathy-autoresearch.md
  - repos/davebcn87-pi-autoresearch.md
  - repos/garrytan-gstack.md
  - repos/uditgoenka-autoresearch.md
  - repos/jmilinovich-goal-md.md
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - repos/alvinreal-awesome-autoresearch.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - repos/orchestra-research-ai-research-skills.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/uditgoenka-autoresearch.md
related:
  - OpenAI
last_compiled: '2026-04-05T05:20:35.123Z'
---
# Andrej Karpathy

AI researcher and educator. OpenAI founding member, former Tesla AI director, and creator of several tools that have become reference implementations in the field.

## Key Contributions

**nanoGPT** — a minimal, readable GPT-2 implementation that became the standard teaching codebase for transformer training. Karpathy built the leaderboard around it, tracking "Time to GPT-2" as a benchmark metric.

**Autoresearch / agent-driven hyperparameter search** — Karpathy ran a two-day autonomous agent loop over nanochat (his GPT-2 training project), letting an agent execute ~700 experiments on a depth-12 model, then cascading validated changes to depth-24. The agent found real, non-obvious improvements: missing QKNorm scalers causing diffuse attention, absent Value Embedding regularization, misconfigured AdamW betas, undertrained banded attention. Stacking all changes dropped "Time to GPT-2" from 2.02 to 1.80 hours, an 11% gain. His observation: any metric that evaluates efficiently enough to run on a smaller proxy model can be autoresearched by an agent swarm. [Source](../../raw/tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md)

**LLM knowledge base workflow** — a personal research method he published that got significant traction (38K likes, ~10M views). Raw documents go into a `raw/` directory; an LLM compiles them incrementally into a markdown wiki with summaries, backlinks, and concept articles. Obsidian serves as the frontend. Query outputs get filed back into the wiki, so every question compounds the knowledge base. At ~100 articles and 400K words, he found context-window-based Q&A competitive with RAG, avoiding vector database overhead at that scale. He also runs LLM "health checks" to find inconsistencies and suggest new article candidates. [Source](../../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

## Why He's Influential in This Space

Karpathy occupies an unusual position: he publishes working code and personal workflows rather than papers, which means practitioners can replicate his methods directly. His autoresearch experiment is one of the first public, concrete demonstrations of an agent completing a full ML optimization loop without human guidance on each step. His knowledge base workflow shows a plausible alternative to RAG at small-to-medium scale that requires no vector infrastructure.

His framing of agent self-improvement as "just engineering" has shaped how the field thinks about autonomous research loops and what the ceiling might look like when scaled to frontier labs.

## Affiliations

OpenAI (founding team), Tesla (Director of AI, Autopilot), Stanford (PhD, advised by Fei-Fei Li). Currently independent.

## Related Concepts

Agent Self-Improvement · [LLM Knowledge Bases](../knowledge-bases.md) · RAG

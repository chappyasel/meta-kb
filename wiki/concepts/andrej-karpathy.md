---
entity_id: andrej-karpathy
type: person
bucket: agent-systems
abstract: >-
  Andrej Karpathy: former OpenAI/Tesla researcher and educator who coined
  "Software 2.0," created the autoresearch self-improvement loop pattern, and
  produced influential educational content on LLMs and neural networks.
sources:
  - tweets/hesamation-bro-created-a-skill-inspired-by-karpathy-s-autores.md
  - tweets/aakashgupta-for-25-and-a-single-gpu-you-can-now-run-100-expe.md
  - tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md
  - tweets/karpathy-three-days-ago-i-left-autoresearch-tuning-nanochat.md
  - tweets/karpathy-clis-are-super-exciting-precisely-because-they-are.md
  - tweets/karpathy-i-packaged-up-the-autoresearch-project-into-a-ne.md
  - tweets/branarakic-the-next-big-shift-in-ai-agents-shared-context-gr.md
  - tweets/jumperz-took-karpathy-s-wiki-pattern-and-wired-it-into-my.md
  - tweets/datachaz-karpathy-s-new-set-up-is-the-ultimate-self-impr.md
  - tweets/himanshustwts-and-here-is-the-full-architecture-of-the-llm-knowl.md
  - repos/karpathy-autoresearch.md
  - repos/garrytan-gstack.md
  - repos/uditgoenka-autoresearch.md
  - repos/jmilinovich-goal-md.md
  - articles/effective-context-engineering-for-ai-agents.md
  - articles/cameron-westland-autoresearch-is-reward-function-design.md
  - >-
    articles/the-product-channel-by-sid-saladi-andrej-karpathy-s-autoresearch-101-builder-s-p.md
  - articles/ai-by-aakash-the-ultimate-autoresearch-guide.md
  - articles/mindstudio-how-to-use-claude-code-with-autoresearch-to-build.md
  - deep/repos/karpathy-autoresearch.md
  - deep/repos/davebcn87-pi-autoresearch.md
  - deep/repos/jmilinovich-goal-md.md
  - deep/repos/uditgoenka-autoresearch.md
related:
  - autoresearch
  - claude-code
  - claude
  - cursor
  - openai-codex
  - self-improving-agents
  - prompt-engineering
  - karpathy-loop
  - rag
  - anthropic
  - windsurf
  - obsidian
last_compiled: '2026-04-06T01:56:26.725Z'
---
# Andrej Karpathy

## Who He Is

Andrej Karpathy is a Slovak-Canadian AI researcher and educator. He co-founded [OpenAI](../projects/openai.md) in 2015, served as Director of AI at Tesla from 2017 to 2022 (leading Autopilot), returned to OpenAI, then left in 2024 to pursue independent research and education. His public writing and code reach millions of practitioners who use it as primary learning material.

## Key Contributions to This Space

**Software 2.0 thesis (2017)**: Karpathy argued that neural networks are not tools but a new programming paradigm, where developers write training data and loss functions rather than explicit logic. This framing has become foundational vocabulary in the field.

**nanoGPT and micrograd**: Minimal, readable implementations of GPT and autograd engines. His "Let's build GPT from scratch" YouTube series functions as a primary reference for researchers and practitioners entering the LLM space. He designs these explicitly so that "both humans and future agents can understand and extend" them, treating code clarity as a design constraint rather than an afterthought.

**The autoresearch pattern**: Karpathy's most direct contribution to agent systems is the autonomous self-improvement loop he published in early 2026. The architecture is a three-file contract: an immutable `prepare.py` locking the evaluation metric (`val_bpb`), a mutable `train.py` the agent edits freely, and a `program.md` that instructs the agent in natural language. The agent commits, trains for five minutes, reads the metric, and either keeps or reverts with `git reset`. Over two days, this produced 700 experiments and an 11% speedup on already-optimized code. Shopify's Tobias Lutke reported 19% gains across 37 overnight experiments using the same pattern. The key constraint is that the agent touches exactly one file, preventing it from gaming the benchmark or getting lost in an expanding action space. [AutoResearch](../projects/autoresearch.md) and the [Karpathy Loop](../concepts/karpathy-loop.md) generalize this to software engineering, security, and subjective domains. See also [Self-Improving Agents](../concepts/self-improving-agents.md).

**LLM knowledge base methodology**: In a tweet with nearly 10 million views, Karpathy described a workflow for building personal research wikis: ingest raw sources into a `raw/` directory, have an LLM compile a markdown wiki with backlinks and concept articles, query it conversationally, and file query outputs back into the wiki so each exploration improves future ones. He uses [Obsidian](../projects/obsidian.md) as the viewing layer and runs LLM "health checks" to find inconsistencies and suggest new article candidates. He noted that at ~100 articles and ~400K words, sophisticated [RAG](../concepts/rag.md) architecture was unnecessary, since the LLM handled index maintenance well at that scale. He flagged synthetic data generation and fine-tuning as the natural next step to move knowledge from context windows into model weights. [Source](../raw/tweets/karpathy-llm-knowledge-bases-something-i-m-finding-very-us.md)

**"Loopy era" framing**: Karpathy characterizes the current period in AI development as one where continuous self-improvement loops on code and research become standard at frontier labs. He stated that all LLM frontier labs will adopt autoresearch-style loops and described the end goal as asynchronously collaborative agents running in parallel, closer to a research community than a single PhD student. His framing of the programmer's role as "spinning up AI agents" rather than "typing computer code" has been widely cited in discussions of [Agent Orchestration](../concepts/agent-orchestration.md) and [Prompt Engineering](../concepts/prompt-engineering.md).

## Notable Work

- **karpathy/autoresearch**: 21,000+ GitHub stars at launch. The 630-line `train.py` at its center is intentionally readable, following his philosophy that comprehensibility enables both human understanding and agent modification. [Source](../raw/deep/repos/karpathy-autoresearch.md)
- **karpathy/nanoGPT**: Primary educational reference for GPT implementation
- **CS231n**: Stanford course on convolutional neural networks, widely used as a reference curriculum
- Tesla Autopilot: Led the vision-only approach that removed radar from the stack

## Related Concepts

[Karpathy Loop](../concepts/karpathy-loop.md) · [Self-Improving Agents](../concepts/self-improving-agents.md) · [AutoResearch](../projects/autoresearch.md) · [Prompt Engineering](../concepts/prompt-engineering.md) · [Agent Memory](../concepts/agent-memory.md) · [Knowledge Base](../concepts/knowledge-base.md) · [Context Engineering](../concepts/context-engineering.md)

# Taxonomy

Taxonomy buckets are defined in [`config/domain.ts`](../config/domain.ts) — the single source of truth for all domain-specific configuration. Both the script pipeline and agent skill graph read from this file.

Each bucket has:
- **id** — URL-safe slug used as filenames and tags
- **name** — Display name
- **title** — Synthesis article title
- **color** — Graph cluster color
- **description** — Short description for ROOT.md and indexes
- **examples** — Longer examples used in LLM prompts for taxonomy tagging and scoring

## Current buckets

The current meta-kb instance defines 6 buckets:

1. **knowledge-substrate** — Karpathy pattern, markdown wikis, RAG, graph retrieval, vector stores, registries
2. **agent-memory** — Mem0, Letta, Graphiti, episodic/semantic/working memory, temporal awareness
3. **context-engineering** — CLAUDE.md standards, context graphs, token budgeting, progressive disclosure
4. **agent-architecture** — Skills, harnesses, SKILL.md, tool use patterns, modular capabilities
5. **multi-agent-systems** — CORAL, coordination, shared state, delegation, conflict resolution, trust
6. **self-improving** — Autoresearch, observe/correct/improve loops, fitness functions, Darwinian selection

## Neutrality rule

All projects receive equal depth AND equal criticism, including the author's own projects. The wiki is a community resource, not a product showcase.

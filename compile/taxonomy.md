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

The current meta-kb instance defines 5 buckets:

1. **knowledge-bases** — Karpathy pattern, markdown wikis, compiled vs curated, RAG alternatives
2. **agent-memory** — Mem0, Letta, Graphiti, episodic/semantic/working memory
3. **context-engineering** — CLAUDE.md standards, context graphs, compression
4. **agent-systems** — Skill composition, registries, modular capabilities
5. **self-improving** — Autoresearch, observe/correct/improve loops, health checks

## Neutrality rule

All projects receive equal depth AND equal criticism, including the author's own projects. The wiki is a community resource, not a product showcase.

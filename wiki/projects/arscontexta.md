# Ars Contexta

> Claude Code plugin that generates individualized knowledge systems from conversation, deriving folder structure, context files, processing pipelines, hooks, and navigation maps from 249 research claims. Key differentiator: derivation from principles, not templating -- every architectural choice traces to specific cognitive science research.

## What It Does

Ars Contexta runs a 6-phase setup conversation (~20 minutes): detection of Claude Code environment, 2-4 turns where you describe your domain, derivation that maps signals to eight configuration dimensions with confidence scoring, a proposal showing what will be generated and why, generation of all files, and validation of 15 kernel primitives. The output is a complete knowledge system: a markdown vault connected by wiki links forming a traversable knowledge graph, a processing pipeline implementing the "6 Rs" (Record, Reduce, Reflect, Reweave, Verify, Rethink), automation hooks (session orient, write validate, auto commit, session capture), Maps of Content at hub/domain/topic levels, note templates with schema blocks, and 7 pages of domain-native documentation. A three-space architecture separates content: `self/` (agent persistent mind), `notes/` (knowledge graph), `ops/` (operational coordination).

## Architecture

Claude Code plugin implemented in Shell. Plugin-level commands (10 skills) handle setup, help, health checks, and evolution. Generated commands (16 skills) handle processing pipeline operations. The `methodology/` directory contains 249 interconnected research claims synthesizing Zettelkasten, Cornell Note-Taking, Evergreen Notes, PARA, GTD, Memory Palaces, cognitive science, network theory, and agent architecture patterns. Each kernel primitive includes `cognitive_grounding` linking to specific research. Fresh context per phase via subagent spawning ensures each processing step operates in the LLM's "smart zone" rather than degraded long-context. Optional semantic search via qmd (MCP-compatible). Hooks enforce structure automatically on every write.

## Key Numbers

- 2,928 GitHub stars, 187 forks
- 249 research claims backing configuration decisions
- 15 kernel primitives validated during setup
- 6-phase setup process (~20 minutes, one-time)
- 3 presets: Research, Personal, Experimental
- 16 generated processing commands
- MIT license

## Strengths

- Research-grounded derivation produces knowledge systems calibrated to the user's actual cognitive patterns, not generic templates
- Fresh context per processing phase (via subagent spawning) avoids the attention degradation that plagues long pipeline runs
- Hook automation (write validation, auto-commit, session capture) maintains structural integrity without manual discipline

## Limitations

- Token-intensive setup: the one-time ~20 minute conversation reads research claims and generates substantial output, which is expensive
- Tightly coupled to Claude Code's plugin system; not portable to other agent frameworks
- The 249 research claims are curated opinions, not experimentally validated in the context of LLM agents specifically

## Alternatives

- [napkin.md](napkin.md) — use when you want a lightweight local vault with templates and BM25 search without the research-backed derivation overhead
- [acontext.md](acontext.md) — use when you want memory that learns from agent execution traces rather than a pre-derived knowledge architecture
- [skill-seekers.md](skill-seekers.md) — use when the goal is converting existing documentation into knowledge assets rather than generating a thinking system

## Sources

- [../../raw/repos/agenticnotetaking-arscontexta.md](../../raw/repos/agenticnotetaking-arscontexta.md) — "derivation, not templating. Every choice traces to specific research claims. The engine reasons from principles about what your domain needs and why"

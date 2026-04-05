# ROOT.md Format Example

This shows the exact compressed notation for the agent-optimized topic index.
Each entry occupies ONE LINE. No prose paragraphs. The entire file must stay
under 2K tokens.

```markdown
---
type: root
version: 1
compiled_at: "2026-04-05T00:00:00.000Z"
token_estimate: 650
entities_total: 122
sources_total: 171
---
# meta-kb ROOT

## Topics
knowledge-bases [synthesis, 58 sources]: compiled wikis, RAG, graph retrieval, vectorless approaches -> knowledge-bases.md
agent-memory [synthesis, 154 sources]: persistent memory, temporal KGs, episodic/semantic split -> agent-memory.md
context-engineering [synthesis, 43 sources]: CLAUDE.md standards, context graphs, token optimization -> context-engineering.md
agent-systems [synthesis, 37 sources]: skill composition, registries, modular capabilities -> agent-systems.md
self-improving [synthesis, 29 sources]: autoresearch, observe/correct/improve loops, health checks -> self-improving.md

## Top Projects
mem0 [agent-memory, 51880★, 8 refs]: hybrid memory layer with vector+graph+SQL -> projects/mem0.md
graphiti [knowledge-bases, 24473★, 6 refs]: temporal knowledge graphs with validity windows -> projects/graphiti.md
letta [agent-memory, 15200★, 7 refs]: stateful agents with tiered memory and self-editing -> projects/letta.md
cognee [knowledge-bases, 2800★, 5 refs]: cognitive architecture for knowledge extraction -> projects/cognee.md
langmem [agent-memory, 1200★, 4 refs]: long-term memory SDK for LangGraph agents -> projects/langmem.md
claude-code [context-engineering, N/A, 6 refs]: reference implementation of CLAUDE.md pattern -> projects/claude-code.md
a-mem [agent-memory, 800★, 3 refs]: agentic memory with Zettelkasten structure -> projects/a-mem.md
gstack [agent-systems, 450★, 4 refs]: skill registry and composition framework -> projects/gstack.md
zep [agent-memory, 2400★, 5 refs]: temporal knowledge graphs for agent memory -> projects/zep.md
notebooklm [knowledge-bases, N/A, 4 refs]: Google's compiled knowledge product -> projects/notebooklm.md

## Key Concepts
rag [knowledge-bases]: retrieve external knowledge before generation -> concepts/rag.md
progressive-disclosure [context-engineering]: load minimum context at lowest resolution -> concepts/progressive-disclosure.md
episodic-memory [agent-memory]: store and retrieve specific past experiences -> concepts/episodic-memory.md
context-graphs [context-engineering]: model relationships between context fragments -> concepts/context-graphs.md
skill-composition [agent-systems]: combine modular capabilities into complex behaviors -> concepts/skill-composition.md
compiled-knowledge [knowledge-bases]: LLM-generated wikis from raw sources -> concepts/compiled-knowledge.md
memory-decay [agent-memory]: time-weighted forgetting for relevance maintenance -> concepts/memory-decay.md
observe-correct-improve [self-improving]: autonomous feedback loops for system refinement -> concepts/observe-correct-improve.md

## Meta
Field map: field-map.md | Graph: graph.html | Landscape: comparisons/landscape.md
Last compiled: 2026-04-05 | Sources: 171 | Entities: 122 | Edges: 316
```

## Key Formatting Rules

- One line per entry, no wrapping
- Stars use Unicode: `51880★`
- Arrows for paths: `-> projects/mem0.md`
- Brackets for metadata: `[bucket, stars, refs]` or `[bucket]`
- Source counts are actual counts from the source manifest
- Token estimate is self-reported, measured before writing frontmatter
- Meta section uses pipes as separators on a single line
